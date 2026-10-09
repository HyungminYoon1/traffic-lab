import test from "node:test";
import assert from "node:assert/strict";
import {MISSIONS,createChallenge,advanceChallenge,intervene,windowMetrics,evaluateTargets} from "../dist/src/challenge.js";
import {DT,LENGTH,CAR_LENGTH,gapAhead,metrics} from "../dist/src/model.js";

// Reference strategies are explicit external schedules, not auto-solvers.
const strategies={
  wave:[{at:0,speed:60,timeGap:2.2,duration:60},{at:120,speed:60,timeGap:.7,duration:60}],
  bottleneck:[{at:100,speed:60,timeGap:.7,duration:60},{at:180,speed:60,timeGap:.7,duration:60}],
  echo:[{at:90,speed:60,timeGap:1,duration:30},{at:180,speed:60,timeGap:.7,duration:60}]
};
function simulate(id,seed,plan=[],inspect=()=>{}) {
  const run=createChallenge(id,seed);
  while(!run.done){
    for(const {at,...policy} of plan)if(run.tick===at/DT)intervene(run,policy);
    advanceChallenge(run);inspect(run);
  }
  return run;
}
function physicalInvariants(world) {
  let freeSpace=0;
  for(let i=0;i<world.cars.length;i++){
    const c=world.cars[i],gap=gapAhead(world,i);
    assert.ok(Number.isFinite(c.x)&&c.x>=0&&c.x<LENGTH);
    assert.ok(Number.isFinite(c.v)&&c.v>=0&&c.v<40);
    assert.ok(gap>=.2-1e-7,"no overlap, including across the ring boundary");
    freeSpace+=gap;
  }
  assert.ok(Math.abs(freeSpace-(LENGTH-CAR_LENGTH*world.cars.length))<1e-7,"one closed ring and preserved order");
  assert.ok(Number.isFinite(world.distance)&&world.distance>=0);
  assert.ok(Number.isSafeInteger(world.passes)&&world.passes>=0);
  assert.ok(world.history.length<=240);
}

for(const mission of MISSIONS){
  test(`${mission.id}: same-seed no intervention equals paired baseline and fails targets`,()=>{
    const run=simulate(mission.id,4);
    assert.deepEqual(run.world,run.baseline);
    assert.equal(windowMetrics(run).gain,1);
    assert.equal(run.result.success,false);
    assert.equal(run.samples.length,1200);
    assert.equal(run.tick,mission.duration/DT);
    const copy=structuredClone(run);advanceChallenge(run);assert.deepEqual(run,copy);
    assert.throws(()=>intervene(run,{speed:60,timeGap:1,duration:30}));
  });
  test(`${mission.id}: achievable budgeted strategy across representative seeds preserves physics`,()=>{
    for(const seed of [1,4,27,99]){
      const run=simulate(mission.id,seed,strategies[mission.id],r=>{physicalInvariants(r.world);physicalInvariants(r.baseline);});
      assert.equal(run.result.success,true,`${mission.id}, seed ${seed}`);
      assert.ok(run.spent<=mission.budget);
      assert.ok(run.checkpoint.pass);
      assert.equal(windowMetrics(run).seconds,60);
      assert.equal(run.active,null);
    }
  });
}

test("events, policy replay, samples and result are exactly reproducible",()=>{
  const a=simulate("wave",27,strategies.wave),b=simulate("wave",27,strategies.wave);
  assert.deepEqual(a,b);
  assert.notDeepEqual(createChallenge("wave",1).world,createChallenge("wave",27).world);
  assert.notDeepEqual(createChallenge("wave",1).events,createChallenge("wave",27).events);
});

test("intervention cannot alter the independent baseline or spawn/remove vehicles",()=>{
  const treated=createChallenge("bottleneck",4),control=createChallenge("bottleneck",4);
  intervene(treated,{speed:60,timeGap:2.2,duration:60});
  for(let i=0;i<2500;i++){advanceChallenge(treated);advanceChallenge(control);}
  assert.deepEqual(treated.baseline,control.world);
  assert.equal(treated.world.cars.length,44);
  assert.notDeepEqual(treated.world.cars,control.world.cars);
});

test("30-second policy expires exactly at tick 600 and budget is not refunded",()=>{
  const r=createChallenge("wave");intervene(r,{speed:60,timeGap:2.2,duration:30});
  for(let i=0;i<599;i++)advanceChallenge(r);
  assert.equal(r.world.p.speed,60);assert.ok(r.active);
  advanceChallenge(r);assert.equal(r.active,null);assert.deepEqual(r.world.p,r.mission.p);assert.equal(r.spent,1);
  intervene(r,{speed:80,timeGap:1,duration:30});assert.equal(r.spent,2);
});

test("bad commands, stacked commands and budget overdraft reject atomically",()=>{
  for(const input of [null,{}, {speed:NaN,timeGap:1,duration:30},{speed:60,timeGap:Infinity,duration:30},
    {speed:"60",timeGap:1,duration:30},{speed:60,timeGap:1,duration:31},{speed:130,timeGap:1,duration:30},
    {speed:60,timeGap:1,duration:30,count:12}]){
    const r=createChallenge(),copy=structuredClone(r);assert.throws(()=>intervene(r,input));assert.deepEqual(r,copy);
  }
  const r=createChallenge();
  for(let i=0;i<2;i++){
    intervene(r,{speed:60,timeGap:1,duration:60});const copy=structuredClone(r);
    assert.throws(()=>intervene(r,{speed:80,timeGap:1,duration:30}));assert.deepEqual(r,copy);
    for(let j=0;j<1200;j++)advanceChallenge(r);
  }
  const copy=structuredClone(r);assert.throws(()=>intervene(r,{speed:60,timeGap:1,duration:30}));assert.deepEqual(r,copy);
  for(const seed of [0,10000,1.5,NaN])assert.throws(()=>createChallenge("wave",seed));
  assert.throws(()=>createChallenge("unknown"));
});

test("target rules require full window and every target, with inclusive exact boundaries",()=>{
  const t={flow:2000,spread:10,gain:1.25},m={seconds:60,flow:2000,spread:10,gain:1.25};
  assert.equal(evaluateTargets(t,m).success,true);
  for(const change of [{seconds:59.95},{flow:1999.99},{spread:10.01},{gain:1.24999},{flow:NaN},{spread:Infinity}]){
    assert.equal(evaluateTargets(t,{...m,...change}).success,false);
  }
});

test("final-window success alone cannot erase a failed middle checkpoint",()=>{
  const r=simulate("bottleneck",4,[{at:180,speed:60,timeGap:.7,duration:60}]);
  assert.ok(evaluateTargets(r.mission.targets,windowMetrics(r)).success);
  assert.equal(r.checkpoint.pass,false);assert.equal(r.result.success,false);
});

test("scheduled bottleneck exists only from 20s until 100s; both twins receive it",()=>{
  const r=createChallenge("bottleneck");
  for(let i=0;i<400;i++)advanceChallenge(r);assert.equal(r.world.zone,null);
  advanceChallenge(r);assert.deepEqual(r.world.zone,{start:420,end:580,speed:35});assert.deepEqual(r.world.zone,r.baseline.zone);
  while(r.tick<2000)advanceChallenge(r);assert.ok(r.world.zone);
  advanceChallenge(r);assert.equal(r.world.zone,null);assert.equal(r.baseline.zone,null);
});

test("distance and crossing detector independently match unwrapped car trajectories",()=>{
  const r=createChallenge("echo",4);let actualDistance=0,actualPasses=0;
  for(let t=0;t<2000;t++){
    const before=r.world.cars.map(c=>c.x);advanceChallenge(r);
    for(let i=0;i<before.length;i++){
      const after=r.world.cars[i].x,wrap=after<before[i];actualPasses+=Number(wrap);
      actualDistance+=after-before[i]+(wrap?LENGTH:0);
    }
  }
  assert.ok(Math.abs(r.world.distance-actualDistance)<1e-6);assert.equal(r.world.passes,actualPasses);
});

test("window flow integrates actual displacement, preserves units and ignores old samples",()=>{
  const r=createChallenge("wave");let distance=0,velocityTotal=0;
  for(let t=0;t<2000;t++){
    const before=r.world.cars.map(c=>c.x);advanceChallenge(r);
    if(t>=800){
      distance+=r.world.cars.reduce((sum,c,i)=>sum+(c.x-before[i]+LENGTH)%LENGTH,0);
      velocityTotal+=metrics(r.world).speed;
    }
  }
  const m=windowMetrics(r);
  assert.equal(m.seconds,60);assert.ok(Math.abs(m.flow-distance/1000*60)<1e-6);
  assert.ok(Math.abs(m.speed-velocityTotal/1200)<1e-9);
  assert.equal(windowMetrics(r,20).seconds,20);
  assert.throws(()=>windowMetrics(r,120));
});
