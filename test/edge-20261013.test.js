import test from "node:test";
import assert from "node:assert/strict";
// Injected storage fixture, never a real user's browser data.
function device() {
  const data=new Map();
  return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
}
const stamp="2026-10-13T00:00:00.000Z";
const peer={completed:1,total:3,updatedAt:stamp};
import {savePolicy,clearPolicies,readPolicies,STORE_KEY} from "../dist/src/storage.js";
import {reportProgress,clearProgress,PROGRESS_KEY} from "../dist/src/progress.js";
import {parsePolicy,validatePolicy,createReplay,advanceReplay,MAX_POLICY_BYTES} from "../dist/src/policy.js";
import {createWorld,step,gapAhead,LENGTH} from "../dist/src/model.js";
const policy=()=>({version:1,campaign:"idm-v1",mission:"wave",seed:4,actions:[{tick:0,speed:60,timeGap:2.2,duration:60}]});
test("EDGE silent private policy save cannot report success",()=>{
  const s=device();s.setItem=()=>{};assert.throws(()=>savePolicy(s,policy()));assert.equal(s.getItem(PROGRESS_KEY),null);
});
test("EDGE private policy deletion is confirmed before summary clear",()=>{
  const s=device();savePolicy(s,policy());s.setItem(PROGRESS_KEY,JSON.stringify({version:1,apps:{"traffic-lab":peer}}));
  const before=s.getItem(PROGRESS_KEY);s.removeItem=()=>{};
  assert.throws(()=>clearPolicies(s));assert.equal(s.getItem(PROGRESS_KEY),before);
});
test("EDGE silent aggregate write and clear report failure",()=>{
  const s=device();reportProgress(s,1,3);s.setItem=()=>{};
  assert.equal(reportProgress(s,2,3),false);assert.equal(clearProgress(s),false);
});
test("EDGE sparse policy actions cannot silently disappear during replay",()=>{
  const p=policy();p.actions=Array(1);assert.throws(()=>validatePolicy(p));
});
test("EDGE policy byte edge, malformed payload and maximum seed roundtrip",()=>{
  const p={...policy(),seed:9999},raw=JSON.stringify(p),at=raw+" ".repeat(MAX_POLICY_BYTES-Buffer.byteLength(raw));
  assert.deepEqual(parsePolicy(at),p);assert.throws(()=>parsePolicy(at+" "));
  for(const text of ["","{","null","[]",JSON.stringify({...p,score:100})])assert.throws(()=>parsePolicy(text));
  for(const seed of [0,10000,NaN,1.5,"4",null])assert.throws(()=>validatePolicy({...p,seed}));
});
test("EDGE failed replay stays terminal under repeated steps and new replay starts paused model time",()=>{
  const p=policy(),r=createReplay(p);
  while(!r.run.done)advanceReplay(r);assert.equal(r.run.result.success,false);
  const before=structuredClone(r);for(let i=0;i<5;i++)advanceReplay(r);assert.deepEqual(r,before);
  assert.equal(createReplay(p).run.tick,0);assert.equal(r.index,1);
});
test("EDGE count and parameter corners preserve car population and collision bounds",()=>{
  for(const count of [12,60])for(const speed of [60,120]){
    const a=createWorld({count,speed,timeGap:.7},1),b=createWorld({count,speed,timeGap:.7},1);
    for(let i=0;i<50;i++){step(a);step(b);}assert.deepEqual(a,b);assert.equal(a.cars.length,count);
    for(let i=0;i<count;i++){assert(a.cars[i].x>=0&&a.cars[i].x<LENGTH);assert(a.cars[i].v>=0);assert(gapAhead(a,i)>=.2-1e-8);}
  }
});
test("EDGE quota retry clones stored policy and clear preserves peer",()=>{
  const s=device(),set=s.setItem;s.setItem=()=>{throw Error("fixture quota");};assert.throws(()=>savePolicy(s,policy()));
  s.setItem=set;s.setItem(PROGRESS_KEY,JSON.stringify({version:1,apps:{"sense-lab":peer}}));
  const p=policy();savePolicy(s,p);p.actions[0].speed=100;assert.equal(readPolicies(s)[0].policy.actions[0].speed,60);
  assert.equal(clearPolicies(s),true);assert.equal(clearPolicies(s),true);assert.deepEqual(JSON.parse(s.getItem(PROGRESS_KEY)).apps,{"sense-lab":peer});
});
