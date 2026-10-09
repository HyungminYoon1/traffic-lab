import test from "node:test";
import assert from "node:assert/strict";
import {readPolicies,savePolicy,deletePolicy,clearPolicies,independentCount,STORE_KEY} from "../dist/src/storage.js";
import {reportProgress,clearProgress,PROGRESS_KEY,REPO_IDS} from "../dist/src/progress.js";
const action={tick:0,speed:60,timeGap:2.2,duration:60};
const p=(seed=4)=>({version:1,campaign:"idm-v1",mission:"wave",seed,actions:[action,{tick:2400,speed:60,timeGap:.7,duration:60}]});
const device=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};};
const peer={completed:2,total:4,updatedAt:"2026-10-09T01:00:00.000Z"};
test("view, imported policy and completed replay never grant independent achievements",()=>{
  const s=device();assert.deepEqual(readPolicies(s),[]);assert.equal(s.data.size,0);
  savePolicy(s,p());assert.equal(independentCount(readPolicies(s)),0);assert.equal(s.getItem(PROGRESS_KEY),null);
  assert.deepEqual(readPolicies(s),[{policy:p(),independent:false}]);
});
test("actual independent successes replay for count, deduplicate mission, and keep minimal summary",()=>{
  const s=device();s.setItem(PROGRESS_KEY,JSON.stringify({version:1,apps:{"parcel-panic":peer}}));
  assert.equal(savePolicy(s,p(),true).completed,1);assert.equal(savePolicy(s,p(27),true).completed,1);
  assert.equal(savePolicy(s,p()).entries.length,2);assert.equal(readPolicies(s)[0].independent,true);
  const summary=JSON.parse(s.getItem(PROGRESS_KEY));assert.deepEqual(summary.apps["parcel-panic"],peer);
  const own=summary.apps["traffic-lab"];assert.deepEqual(Object.keys(own),["completed","total","updatedAt"]);assert.equal(own.completed,1);assert.equal(own.total,3);
  assert.equal(new Date(own.updatedAt).toISOString(),own.updatedAt);
  assert.equal(/seed|actions|name|policy|file/.test(s.getItem(PROGRESS_KEY)),false);
});
test("all three independently solved missions produce exactly 3 of 3 from durable inputs",()=>{
  const s=device();savePolicy(s,p(),true);
  savePolicy(s,{...p(),mission:"bottleneck",actions:[{tick:2000,speed:60,timeGap:.7,duration:60},{tick:3600,speed:60,timeGap:.7,duration:60}]},true);
  const result=savePolicy(s,{...p(),mission:"echo",actions:[{tick:1800,speed:60,timeGap:1,duration:30},{tick:3600,speed:60,timeGap:.7,duration:60}]},true);
  assert.equal(result.completed,3);assert.equal(independentCount(readPolicies(s)),3);
  assert.equal(JSON.parse(s.getItem(PROGRESS_KEY)).apps["traffic-lab"].completed,3);
  deletePolicy(s,1);assert.equal(independentCount(readPolicies(s)),2);
});
test("malformed shared aggregate preserves private success and reports summary failure separately",()=>{
  const s=device();s.setItem(PROGRESS_KEY,"invalid");
  const result=savePolicy(s,p(),true);assert.equal(result.completed,1);assert.equal(result.summaryWritten,false);
  assert.equal(independentCount(readPolicies(s)),1);assert.equal(s.getItem(PROGRESS_KEY),"invalid");
  assert.equal(clearPolicies(s),false);assert.equal(s.getItem(STORE_KEY),null);assert.equal(s.getItem(PROGRESS_KEY),"invalid");
});
test("untrusted terminal flags cannot grant a badge; genuine failed inputs reject atomically",()=>{
  const s=device(),failed={...p(),actions:[action]};
  assert.throws(()=>savePolicy(s,failed,true));assert.equal(s.data.size,0);
  assert.throws(()=>savePolicy(s,{...p(),result:{success:true}},true));assert.equal(s.data.size,0);
  assert.throws(()=>savePolicy(s,p(),"true"));
  s.setItem(STORE_KEY,JSON.stringify({version:1,entries:[{policy:failed,independent:true}]}));
  assert.equal(independentCount(readPolicies(s)),0);
});
test("ten policies capped without eviction, deleting one frees space and removing last achievement clears own summary",()=>{
  const s=device();for(let seed=1;seed<=10;seed++)savePolicy(s,p(seed));
  const before=s.getItem(STORE_KEY);assert.throws(()=>savePolicy(s,p(11)));assert.equal(s.getItem(STORE_KEY),before);
  assert.equal(savePolicy(s,p(1)).entries.length,10);
  deletePolicy(s,0);assert.equal(savePolicy(s,p(11)).entries.length,10);
  assert.throws(()=>deletePolicy(s,-1));assert.throws(()=>deletePolicy(s,10));
  clearPolicies(s);s.setItem(PROGRESS_KEY,JSON.stringify({version:1,apps:{"parcel-panic":peer}}));
  savePolicy(s,p(),true);deletePolicy(s,0);
  assert.deepEqual(JSON.parse(s.getItem(PROGRESS_KEY)),{version:1,apps:{"parcel-panic":peer}});
});
test("clear deletes only traffic payload and summary, preserving other apps and unrelated local data",()=>{
  const s=device();s.setItem("other-private-key","keep");s.setItem(PROGRESS_KEY,JSON.stringify({version:1,apps:{"parcel-panic":peer}}));
  savePolicy(s,p(),true);assert.equal(clearPolicies(s),true);
  assert.equal(s.getItem(STORE_KEY),null);assert.equal(s.getItem("other-private-key"),"keep");
  assert.deepEqual(JSON.parse(s.getItem(PROGRESS_KEY)),{version:1,apps:{"parcel-panic":peer}});
});
test("malformed and oversized private stores reject without rewriting",()=>{
  const s=device(),entry={policy:p(),independent:false};
  for(const text of ["invalid"," ".repeat(49153),JSON.stringify({version:2,entries:[]}),JSON.stringify({version:1,entries:Array(11).fill(entry)}),
    JSON.stringify({version:1,entries:[entry,entry]}),JSON.stringify({version:1,entries:[{...entry,independent:"true"}]}),
    JSON.stringify({version:1,entries:[{...entry,result:{success:true}}]})]){
    s.setItem(STORE_KEY,text);assert.throws(()=>readPolicies(s));assert.throws(()=>savePolicy(s,p()));assert.equal(s.getItem(STORE_KEY),text);
  }
  clearPolicies(s);assert.deepEqual(readPolicies(s),[]);
});
test("summary accepts only 15 known IDs and bounded integers, fails safely on invalid existing data",()=>{
  assert.equal(REPO_IDS.length,15);assert.equal(new Set(REPO_IDS).size,15);
  const s=device();assert.equal(reportProgress(s,3,3),true);
  for(const [completed,total] of [[-1,3],[4,3],[.5,3],[0,1001],[NaN,3]])assert.equal(reportProgress(s,completed,total),false);
  for(const value of ["invalid"," ".repeat(8193),JSON.stringify({version:2,apps:{}}),JSON.stringify({version:1,apps:{unknown:peer}}),
    JSON.stringify({version:1,apps:{"parcel-panic":{...peer,name:"x"}}}),JSON.stringify({version:1,apps:{"parcel-panic":{...peer,completed:5}}}),
    JSON.stringify({version:1,apps:{"parcel-panic":{...peer,updatedAt:"yesterday"}}}),JSON.stringify({version:1,apps:[]})]){
    s.setItem(PROGRESS_KEY,value);assert.equal(reportProgress(s,1,3),false);assert.equal(clearProgress(s),false);assert.equal(s.getItem(PROGRESS_KEY),value);
  }
});
test("blocked storage or quota failures do not fabricate durable completion",()=>{
  const blocked={getItem(){throw Error("blocked");},setItem(){throw Error("quota");},removeItem(){throw Error("blocked");}};
  assert.equal(reportProgress(blocked,1,3),false);assert.equal(clearProgress(blocked),false);assert.throws(()=>savePolicy(blocked,p(),true));
  const s=device();s.setItem=()=>{throw Error("quota");};assert.throws(()=>savePolicy(s,p(),true));assert.deepEqual(readPolicies(s),[]);
});
