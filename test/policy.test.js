import test from "node:test";
import assert from "node:assert/strict";
import {validatePolicy,parsePolicy,policyFromRun,createReplay,advanceReplay,replayPolicy,MAX_POLICY_BYTES} from "../dist/src/policy.js";
import {createChallenge,intervene,advanceChallenge,windowMetrics} from "../dist/src/challenge.js";
import {DT,LENGTH} from "../dist/src/model.js";

export const plans={
  wave:[{tick:0,speed:60,timeGap:2.2,duration:60},{tick:2400,speed:60,timeGap:.7,duration:60}],
  bottleneck:[{tick:2000,speed:60,timeGap:.7,duration:60},{tick:3600,speed:60,timeGap:.7,duration:60}],
  echo:[{tick:1800,speed:60,timeGap:1,duration:30},{tick:3600,speed:60,timeGap:.7,duration:60}]
};
export const policy=(mission="wave",seed=4,actions=plans[mission])=>({version:1,campaign:"idm-v1",mission,seed,actions:structuredClone(actions)});
function manual(p){
  const r=createChallenge(p.mission,p.seed);
  while(!r.done){for(const {tick,...input} of p.actions)if(tick===r.tick)intervene(r,input);advanceChallenge(r);}
  return r;
}
for(const mission of Object.keys(plans))test(`${mission}: exported actual inputs replay exactly; observed score regression`,()=>{
  const p=policy(mission),r=manual(p),file=JSON.stringify(policyFromRun(r)),replayed=replayPolicy(parsePolicy(file));
  assert.deepEqual(replayed,r);assert.equal(r.result.success,true);assert.equal(r.checkpoint.pass,true);
  assert.ok(new TextEncoder().encode(file).length<MAX_POLICY_BYTES);
  const expected={
    wave:[2284.365388686189,1603.0037662090583,6.991365124301226,1.4250530390758107,42,10,0,1210.999999999996,1737.9143261516303,2078.4978035203703],
    bottleneck:[2199.5819671597983,1568.5974856539592,2.331625308878698,1.4022602912963216,38,26,0,0,1440.0894468092106,1784.398445427096],
    echo:[2275.3358250650995,1150.8533479561409,7.140917158986213,1.9770858112425744,38,19,0,0,2462.0602846359175,3024.572137644408]
  }[mission],m=windowMetrics(r);
  ["flow","baseFlow","spread","gain","passes","basePasses","stopped","baseStopped","loss","baseLoss"].forEach((key,i)=>assert.ok(Math.abs(m[key]-expected[i])<1e-8,`${key}: ${m[key]}`));
  assert.equal(m.detectorFlow,m.passes*60);assert.equal(m.baseDetectorFlow,m.basePasses*60);
});
test("negative schedules do not acquire success during replay",()=>{
  for(const id of Object.keys(plans))assert.equal(replayPolicy(policy(id,4,[])).result.success,false);
  const r=replayPolicy(policy("bottleneck",4,[plans.bottleneck[1]]));
  assert.equal(r.checkpoint.pass,false);assert.equal(r.result.success,false);
});
test("incremental replay respects exact ticks, baseline and bounded lifecycle",()=>{
  const p=policy("echo"),a=createReplay(p),b=manual(p);p.actions[0].speed=120;
  while(!a.run.done)advanceReplay(a);
  assert.deepEqual(a.run,b);assert.equal(a.index,2);
  const copy=structuredClone(a);advanceReplay(a);assert.deepEqual(a,copy);
});
test("malformed, terminal-state, over-budget, overlapping and late policies reject",()=>{
  const p=policy(),bad=[null,[],{}, {...p,version:2},{...p,campaign:"next"},{...p,mission:undefined},{...p,seed:undefined},
    {...p,mission:"unknown"},{...p,seed:"4"},{...p,seed:0},{...p,seed:10000},{...p,seed:4.5},
    {...p,result:{success:true}},{...p,world:{}},{...p,actions:null},{...p,actions:Array(7).fill(plans.wave[0])},
    policy("wave",4,[{...plans.wave[0],tick:.5}]),policy("wave",4,[{...plans.wave[0],tick:-1}]),
    policy("wave",4,[{...plans.wave[0],speed:NaN}]),policy("wave",4,[{...plans.wave[0],timeGap:Infinity}]),
    policy("wave",4,[{...plans.wave[0],speed:"60"}]),policy("wave",4,[{...plans.wave[0],speed:59}]),
    policy("wave",4,[{...plans.wave[0],timeGap:.6}]),policy("wave",4,[{...plans.wave[0],duration:45}]),
    policy("wave",4,[{...plans.wave[0],untilTick:1200}]),
    policy("wave",4,[plans.wave[0],{...plans.wave[1],tick:1199}]),
    policy("wave",4,[{...plans.wave[0],tick:3600}]),
    policy("wave",4,[plans.wave[0],{...plans.wave[0],tick:1200},{...plans.wave[0],tick:2400}])];
  for(const value of bad)assert.throws(()=>validatePolicy(value));
  assert.throws(()=>parsePolicy("not json"));assert.throws(()=>parsePolicy(" ".repeat(4097)));
  assert.throws(()=>parsePolicy("가".repeat(1400)));assert.throws(()=>parsePolicy(4));
  assert.deepEqual(validatePolicy(p),p);
});
test("exact-expiry and late-start controls preserve original campaign and replay without refund",()=>{
  const p=policy("wave",4,[{tick:0,speed:60,timeGap:1,duration:30},{tick:600,speed:80,timeGap:1,duration:30}]);
  assert.deepEqual(validatePolicy(p),p);
  const late=policy("wave",4,[{tick:3001,speed:60,timeGap:1,duration:30}]);
  const r=manual(late);assert.deepEqual(replayPolicy(late),r);assert.equal(r.spent,1);assert.equal(r.tick,3600);assert.equal(r.done,true);
});
test("interval detector, stopped-time and loss independently match car observations",()=>{
  const r=createChallenge("wave",4);intervene(r,{speed:60,timeGap:2.2,duration:60});
  const totals={passes:0,basePasses:0,stopped:0,baseStopped:0,loss:0,baseLoss:0};
  for(let tick=0;tick<2000;tick++){
    const before=[r.world,r.baseline].map(w=>w.cars.map(c=>c.x));advanceChallenge(r);
    if(tick<800)continue;
    [r.world,r.baseline].forEach((w,j)=>{
      const key=k=>j?"base"+k[0].toUpperCase()+k.slice(1):k;
      w.cars.forEach((c,i)=>{
        assert.ok((c.x-before[j][i]+LENGTH)%LENGTH>=0);
        if(c.x<before[j][i])totals[key("passes")]++;
        if(c.v<.1)totals[key("stopped")]+=DT;
        totals[key("loss")]+=Math.max(0,1-c.v/(120/3.6))*DT;
      });
    });
  }
  const measured=windowMetrics(r);assert.equal(measured.seconds,60);
  for(const [key,value] of Object.entries(totals))assert.ok(Math.abs(measured[key]-value)<1e-7,key);
  assert.equal(windowMetrics(createChallenge()).detectorFlow,0);
  // Local detector crossings can differ in sign from whole-ring flow; no causal label.
  const success=manual(policy()),cp=success.checkpoint;
  assert.ok(cp.flow>cp.baseFlow);assert.ok(cp.passes<cp.basePasses);
});
