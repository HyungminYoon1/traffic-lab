import {createWorld,parameters,step,brakeCar,setZone,metrics,DT,LENGTH} from "./model.js";
import {number,rng} from "./ui.js";

// All schedules, scoring and interventions live here, without DOM or wall time.
export const MISSIONS=Object.freeze([
  {id:"wave",name:"01 · 파동을 흡수하라",duration:180,budget:4,
    description:"붐비는 도로에 두 번의 급제동. 처음부터 빨리 달릴까요, 파동이 번질 때 여유를 줄까요? 마지막 60초의 흐름과 속도 편차를 함께 지키세요.",
    p:{count:48,speed:120,timeGap:.7},events:[{at:20,type:"brake"},{at:55,type:"brake"}],
    checkpoint:{at:90,flow:1500,spread:25},targets:{flow:2000,spread:10,gain:1.25}},
  {id:"bottleneck",name:"02 · 병목 뒤의 회복",duration:240,budget:6,
    description:"420–580 m 구간에 35 km/h 제한이 생깁니다. 100초에 제한이 풀린 뒤 대열을 회복하세요. 짧은 차간 시간은 흐름을 높이지만 파동도 키울 수 있습니다.",
    p:{count:44,speed:110,timeGap:1.5},events:[{at:20,type:"zone",speed:35},{at:65,type:"brake"},{at:100,type:"clear"}],
    checkpoint:{at:160,flow:1800,spread:12},targets:{flow:2000,spread:6,gain:1.25}},
  {id:"echo",name:"03 · 세 번의 충격",duration:240,budget:5,
    description:"60대의 고밀도 순환도로. 서로 다른 차량의 세 번 제동에 대응하면서 한정된 개입 시간을 배분하세요. 최종 흐름, 대열 안정성과 무개입 대비 개선을 모두 요구합니다.",
    p:{count:60,speed:120,timeGap:1.8},events:[{at:25,type:"brake"},{at:80,type:"brake"},{at:140,type:"brake"}],
    checkpoint:{at:120,flow:1600,spread:8},targets:{flow:2000,spread:10,gain:1.50}}
].map(m=>Object.freeze({...m,p:Object.freeze(m.p),checkpoint:Object.freeze(m.checkpoint),targets:Object.freeze(m.targets),events:Object.freeze(m.events.map(e=>Object.freeze(e)))})));

export function createChallenge(id="wave",seed=4) {
  const mission=MISSIONS.find(m=>m.id===id);
  if(!mission) throw new RangeError("Unknown mission");
  number(seed,1,9999,"seed");if(!Number.isInteger(seed)) throw new RangeError("Integer seed required");
  const random=rng(seed),events=mission.events.map(e=>({...e,index:Math.floor(random()*mission.p.count)}));
  return {mission,seed,events,tick:0,eventIndex:0,world:createWorld(mission.p,seed),baseline:createWorld(mission.p,seed),
    initial:metrics(createWorld(mission.p,seed)),spent:0,active:null,log:[],samples:[],checkpoint:null,done:false,result:null};
}

export function intervene(run,input) {
  if(run.done) throw new RangeError("Run finished; retry to intervene");
  if(run.active) throw new RangeError("Wait for the active intervention to expire");
  if(!input||Object.keys(input).some(k=>!["speed","timeGap","duration"].includes(k))) throw new RangeError("Unknown intervention");
  const {speed,timeGap,duration}=input;
  // Explicit numeric validation: missing values must not silently use defaults.
  if(typeof speed!=="number"||typeof timeGap!=="number") throw new RangeError("Numeric policy required");
  const p=parameters({...run.mission.p,speed,timeGap});
  if(![30,60].includes(duration)) throw new RangeError("Use 30 or 60 seconds");
  const cost=duration/30;
  if(run.spent+cost>run.mission.budget) throw new RangeError("Intervention budget exhausted");
  run.world.p=p;run.spent+=cost;
  run.active={speed,timeGap,duration,cost,start:run.tick*DT,untilTick:run.tick+duration/DT};
  run.log.push({...run.active});
  return run.active;
}

function spread(world) {
  const average=metrics(world).speed;
  return Math.sqrt(world.cars.reduce((sum,c)=>sum+(c.v*3.6-average)**2,0)/world.cars.length);
}
function applyEvent(world,event) {
  if(event.type==="brake") brakeCar(world,event.index);
  else if(event.type==="zone") setZone(world,{start:420,end:580,speed:event.speed});
  else setZone(world,null);
}

export function advanceChallenge(run) {
  if(run.done) return run;
  const time=run.tick*DT;
  if(run.active&&run.tick>=run.active.untilTick){run.world.p={...run.mission.p};run.active=null;}
  while(run.eventIndex<run.events.length&&time+1e-9>=run.events[run.eventIndex].at){
    const event=run.events[run.eventIndex++];applyEvent(run.world,event);applyEvent(run.baseline,event);
  }
  const before=run.world.distance,baseBefore=run.baseline.distance;
  step(run.world);step(run.baseline);run.tick++;
  // Integral of actual movement, not an instantaneous speed snapshot.
  run.samples.push({distance:run.world.distance-before,baseDistance:run.baseline.distance-baseBefore,
    speed:metrics(run.world).speed,baseSpeed:metrics(run.baseline).speed,spread:spread(run.world),baseSpread:spread(run.baseline),
    slow:metrics(run.world).slow,baseSlow:metrics(run.baseline).slow});
  if(run.samples.length>60/DT) run.samples.shift();
  if(run.active&&run.tick>=run.active.untilTick){run.world.p={...run.mission.p};run.active=null;}
  if(run.tick===run.mission.checkpoint.at/DT){
    const measured=windowMetrics(run,20),target=run.mission.checkpoint;
    run.checkpoint={...measured,pass:measured.flow>=target.flow&&measured.spread<=target.spread};
  }
  if(run.tick>=run.mission.duration/DT){
    run.done=true;run.active=null;run.result=evaluateTargets(run.mission.targets,windowMetrics(run));
    run.result.success=run.result.success&&run.checkpoint?.pass===true;
  }
  return run;
}

export function windowMetrics(run,windowSeconds=60) {
  number(windowSeconds,1,60,"measurement window");
  const samples=run.samples.slice(-Math.round(windowSeconds/DT)),n=samples.length;
  if(!n) return {seconds:0,flow:0,baseFlow:0,speed:0,baseSpeed:0,spread:0,baseSpread:0,slow:0,baseSlow:0,gain:0};
  const sum=key=>samples.reduce((total,s)=>total+s[key],0),seconds=n*DT;
  const flow=sum("distance")/LENGTH*3600/seconds,baseFlow=sum("baseDistance")/LENGTH*3600/seconds;
  return {seconds,flow,baseFlow,speed:sum("speed")/n,baseSpeed:sum("baseSpeed")/n,
    spread:sum("spread")/n,baseSpread:sum("baseSpread")/n,slow:sum("slow")/n,baseSlow:sum("baseSlow")/n,gain:baseFlow>0?flow/baseFlow:0};
}

export function evaluateTargets(targets,measured) {
  const finite=[measured.seconds,measured.flow,measured.spread,measured.gain].every(Number.isFinite);
  const complete=finite&&measured.seconds>=60-1e-9;
  const goals=[
    {key:"flow",label:"최종 60초 평균 흐름",value:measured.flow,target:targets.flow,unit:"대/시간",pass:complete&&measured.flow>=targets.flow},
    {key:"spread",label:"차량 속도 표준편차",value:measured.spread,target:targets.spread,unit:"km/h",pass:complete&&measured.spread<=targets.spread},
    {key:"gain",label:"무개입 대비 흐름",value:measured.gain*100,target:targets.gain*100,unit:"%",pass:complete&&measured.gain>=targets.gain}
  ];
  return {complete,success:complete&&goals.every(g=>g.pass),goals};
}
