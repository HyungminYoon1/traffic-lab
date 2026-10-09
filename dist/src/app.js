import {createWorld,parameters,step,metrics,brakeCar,LENGTH} from "./model.js";
import {MISSIONS,createChallenge,intervene,advanceChallenge,windowMetrics,evaluateTargets} from "./challenge.js";
import {expose,tool,number,canvasPointer,clamp} from "./ui.js";
const $=s=>document.querySelector(s),road=$("#road"),ctx=road.getContext("2d"),chart=$("#chart"),graph=chart.getContext("2d");
let run=createChallenge(),world=run.world,selected=0,running=false,pace=4,last=0,accumulator=0;
function announce(message){$("#status").textContent=message;}
function prepare(id=$("#mission").value,seed=Number($("#seed").value)) {
  const next=createChallenge(id,seed);run=next;world=run.world;selected=0;running=false;accumulator=0;
  $("#mission").value=id;$("#seed").value=seed;sync();render();
  announce("같은 시드의 무개입 도로와 비교합니다. 계획을 정한 뒤 재생 또는 10초 진행을 누르세요.");
  return summary();
}
function enterFree(input={}) {
  const next=createWorld(input);run=null;world=next;selected=0;running=false;accumulator=0;sync();render();
  announce("자유 실험입니다. 차량 수와 도로 조건을 바꾸고 직접 급제동할 수 있습니다.");return summary();
}
function configure(input) {
  if(run) throw new RangeError("도로 조건 변경은 자유 실험에서 가능합니다. 도전에서는 예산 개입을 사용하세요.");
  const p=parameters({...world.p,...input});
  if(p.count!==world.p.count) {world=createWorld(p);selected=0;} else world.p=p;
  sync(); render(); return summary();
}
function summary(){const m=metrics(world);return {mode:run?"challenge":"free",running,time:Number(world.time.toFixed(2)),...world.p,selected,braking:world.brake?.index??null,averageSpeed:m.speed,slow:m.slow,flow:m.flow,passes:world.passes,
  challenge:run?{id:run.mission.id,seed:run.seed,remaining:run.mission.budget-run.spent,active:run.active,done:run.done,checkpoint:run.checkpoint,measured:windowMetrics(run),result:run.result}:null};}
function sync(){
  $("#count").value=world.p.count;$("#speed").value=world.p.speed;$("#timeGap").value=world.p.timeGap;
  $("#countOut").textContent=world.p.count+"대";$("#speedOut").textContent=world.p.speed+" km/h";$("#gapOut").textContent=world.p.timeGap.toFixed(1)+"초";
  $("#selectedCar").textContent=String(selected+1).padStart(2,"0");$("#play").textContent=running?"일시 정지":"재생";
  for(const key of ["count","speed","timeGap","brake","free","dense"]) $("#"+key).disabled=!!run;
  $("#challengePanel").hidden=!run;$("#freeSettings").hidden=!!run;
  $(".policy-controls").hidden=!run;
  $("#briefing").hidden=!run;
  $("#challengeMode").setAttribute("aria-pressed",String(!!run));$("#freeMode").setAttribute("aria-pressed",String(!run));
  $("#play").disabled=!!run?.done;$("#advance").disabled=!!run?.done;
  $("#road").setAttribute("aria-label",run?"원형 도로. 클릭으로 차량 선택. 방향키로 선택을 바꿀 수 있습니다. 제동 사건은 도전 일정에 따라 발생합니다.":"원형 도로. 클릭 또는 Enter로 차량 급제동. 방향키로 차량 선택.");
  $("#roadHelp").textContent=run?"차량 클릭·방향키로 선택 / 사건은 일정에 따라 자동 발생":"차량 클릭·Enter로 급제동 / 방향키로 선택";
}
function brake(index=selected) {
  if(run) throw new RangeError("도전의 급제동은 정해진 사건 일정에 따릅니다.");
  brakeCar(world,index);selected=index;sync();render();
  $("#status").textContent=String(index+1).padStart(2,"0")+"번 차량을 3초간 제동합니다. 느린 차량이 뒤쪽으로 이어지는지 살펴보세요.";
  return summary();
}
function render(){
  const m=metrics(world);$("#meanSpeed").textContent=m.speed.toFixed(1);$("#slowCars").textContent=m.slow;$("#flow").textContent=Math.round(m.flow).toLocaleString("ko-KR");$("#time").textContent=world.time.toFixed(1);
  renderChallenge();
  ctx.clearRect(0,0,920,620);ctx.save();ctx.translate(460,310);ctx.scale(1,.76);
  ctx.beginPath();ctx.arc(0,0,248,0,Math.PI*2);ctx.strokeStyle="#282e31";ctx.lineWidth=46;ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,248,0,Math.PI*2);ctx.strokeStyle="#bec5bf";ctx.lineWidth=2;ctx.setLineDash([12,13]);ctx.stroke();ctx.setLineDash([]);
  if(world.zone){ctx.beginPath();ctx.arc(0,0,248,world.zone.start/LENGTH*Math.PI*2-Math.PI/2,world.zone.end/LENGTH*Math.PI*2-Math.PI/2);ctx.strokeStyle="#ef9761";ctx.lineWidth=49;ctx.stroke();}
  ctx.beginPath();ctx.moveTo(0,-274);ctx.lineTo(0,-225);ctx.strokeStyle="#f2cb43";ctx.lineWidth=4;ctx.stroke();
  for(let i=0;i<world.cars.length;i++){
    const c=world.cars[i],angle=c.x/LENGTH*Math.PI*2-Math.PI/2,active=world.brake?.index===i;
    ctx.save();ctx.rotate(angle);ctx.translate(248,0);ctx.rotate(Math.PI/2);
    ctx.fillStyle=active?"#cf3543":c.v<2?"#dc7049":`hsl(${clamp(c.v/(world.p.speed/3.6),0,1)*180+20} 55% 62%)`;
    if(i===selected){ctx.strokeStyle="#f2cb43";ctx.lineWidth=3;ctx.strokeRect(-7,-14,14,28);}
    ctx.fillRect(-5,-11,10,22);ctx.fillStyle="#202a2f";ctx.fillRect(-3,-6,6,4);ctx.restore();
  }
  ctx.restore();ctx.textAlign="center";ctx.fillStyle="#28352d";ctx.font="800 56px system-ui";ctx.fillText(m.speed.toFixed(1),460,295);ctx.font="18px system-ui";ctx.fillStyle="#717b73";ctx.fillText("km/h · 평균 속도",460,330);ctx.font="13px system-ui";ctx.fillText(world.zone?`420–580 m · ${world.zone.speed} km/h 병목`:"차량은 시계 방향으로 이동",460,365);
  graph.clearRect(0,0,920,160);graph.font="11px system-ui";graph.textAlign="right";
  for(let v=0;v<=120;v+=40){const y=137-v;graph.strokeStyle="#e5e8df";graph.beginPath();graph.moveTo(40,y);graph.lineTo(910,y);graph.stroke();graph.fillStyle="#7a847a";graph.fillText(v,31,y+4);}
  if(world.history.length){const first=world.history[0].time;
    for(const [history,color] of [[run?.baseline.history,"#9ba4a0"],[world.history,"#b78e16"]]){if(!history)continue;graph.strokeStyle=color;graph.lineWidth=2.5;graph.beginPath();history.forEach((p,i)=>{const x=40+(p.time-first)/120*870,y=137-p.speed;i?graph.lineTo(x,y):graph.moveTo(x,y);});graph.stroke();}}
}
function renderChallenge(){
  if(!run) return;
  const {mission}=run,m=windowMetrics(run),grade=run.result??evaluateTargets(mission.targets,m),time=run.tick*.05;
  $("#briefTitle").textContent=mission.name;$("#briefText").textContent=mission.description;
  $("#briefTargets").textContent=`${mission.duration}초 · 예산 ${mission.budget}점 · ${mission.checkpoint.at}초 중간 검사 / 최종 흐름 ≥ ${mission.targets.flow}대/시간, 속도 편차 ≤ ${mission.targets.spread} km/h, 무개입 대비 ≥ ${Math.round(mission.targets.gain*100)}%`;
  $("#missionTitle").textContent=mission.name;$("#missionDescription").textContent=mission.description;
  $("#progress").value=time;$("#progress").max=mission.duration;
  $("#progressText").textContent=`${time.toFixed(1)} / ${mission.duration}초`;
  $("#initialConditions").textContent=`시드 ${run.seed} · ${mission.p.count}대 · 희망 ${mission.p.speed} km/h · 차간 ${mission.p.timeGap}초 / 출발 평균 ${run.initial.speed.toFixed(1)} km/h, 흐름 ${run.initial.flow.toFixed(0)}대/시간`;
  $("#budget").textContent=`${mission.budget-run.spent} / ${mission.budget}점 남음`;
  $("#activePolicy").textContent=run.active?`${run.active.speed} km/h · ${run.active.timeGap}초 / ${Math.max(0,run.active.untilTick*.05-time).toFixed(1)}초 뒤 원래 조건 복귀`:"개입 없음 · 원래 도로 조건";
  const cost=Number($("#duration").value)/30;$("#applyPolicy").disabled=run.done||!!run.active||run.spent+cost>mission.budget;
  $("#applyPolicy").textContent=`${$("#duration").value}초 개입 · ${cost}점 사용`;
  $("#windowLabel").textContent=`${run.done?"최종":"최근"} ${m.seconds.toFixed(1)}초의 실제 모델 이동량`;
  for(const [key,places] of [["speed",1],["flow",0],["spread",1],["slow",1]]){
    $("#trial"+key).textContent=m[key].toFixed(places);$("#base"+key).textContent=m["base"+key[0].toUpperCase()+key.slice(1)].toFixed(places);
  }
  $("#detector").textContent=`시작점 누적 통과: 내 도로 ${world.passes}대 / 무개입 ${run.baseline.passes}대`;
  $("#outcome").textContent=run.done?(grade.success?"도전 성공 · 중간 회복과 최종 목표 달성":"도전 종료 · 미달 목표를 확인하고 같은 시드로 다시 설계하세요"):"평가 진행 중 · 중간 검사와 최종 60초 목표를 모두 달성하세요";
  $("#outcome").dataset.success=String(run.done&&grade.success);
  const cp=mission.checkpoint,measured=run.checkpoint;
  $("#checkpointGoal").textContent=`${cp.at}초 중간 검사 · 직전 20초 흐름 ≥ ${cp.flow}, 속도 편차 ≤ ${cp.spread} km/h: ${measured?`${measured.pass?"통과":"미달"} (${measured.flow.toFixed(0)} / ${measured.spread.toFixed(1)})`:"대기"}`;
  for(const goal of grade.goals){const el=$("#goal"+goal.key);el.textContent=`${goal.label} ${goal.key==="spread"?"≤":"≥"} ${goal.target} ${goal.unit} · 현재 ${Number.isFinite(goal.value)?goal.value.toFixed(1):"—"} (${goal.pass?"충족":m.seconds<60?"집계 중":"미달"})`;el.dataset.pass=String(goal.pass);}
  $("#events").textContent=run.events.map((e,i)=>`${i<run.eventIndex?"✓":"○"} ${e.at}초 ${e.type==="brake"?`${e.index+1}번 차량 제동`:e.type==="zone"?"35 km/h 병목 시작":"병목 해제"}`).join(" → ");
  $("#policyLog").textContent=run.log.length?run.log.map(p=>`${p.start.toFixed(0)}초: ${p.speed} km/h·${p.timeGap}초 (${p.duration}초/${p.cost}점)`).join(" → "):"사용한 개입 없음";
}
function advanceOne(){
  if(run){const wasDone=run.done;advanceChallenge(run);world=run.world;if(run.done&&!wasDone){running=false;accumulator=0;sync();announce(run.result.success?"도전 성공! 비교표와 개입 기록에서 전략을 검토하세요.":"도전 종료. 중간 회복과 최종 목표의 미달 항목을 확인하세요.");}}
  else step(world);
}
function applyPolicy(input={speed:Number($("#policySpeed").value),timeGap:Number($("#policyGap").value),duration:Number($("#duration").value)}){
  if(!run)throw new RangeError("도전을 먼저 준비하세요.");intervene(run,input);sync();render();announce("개입을 적용했습니다. 정해진 시간이 끝나면 원래 도로 조건으로 돌아갑니다.");return summary();
}
function guard(action){try{return action();}catch(error){announce(error.message);}}
for(const key of ["count","speed","timeGap"]) $("#"+key).addEventListener("input",e=>configure({[key]:Number(e.target.value)}));
$("#free").addEventListener("click",()=>enterFree({count:18,speed:100,timeGap:1.4}));
$("#dense").addEventListener("click",()=>enterFree({count:52,speed:100,timeGap:1.2}));
for(const mission of MISSIONS){const option=document.createElement("option");option.value=mission.id;option.textContent=mission.name;$("#mission").append(option);}
$("#prepare").addEventListener("click",()=>guard(()=>prepare()));
$("#challengeMode").addEventListener("click",()=>guard(()=>prepare()));$("#freeMode").addEventListener("click",()=>enterFree());
$("#applyPolicy").addEventListener("click",()=>guard(()=>applyPolicy()));$("#duration").addEventListener("change",()=>renderChallenge());
$("#advance").addEventListener("click",()=>{running=false;accumulator=0;for(let i=0;i<200;i++)advanceOne();sync();render();});
$("#pace").addEventListener("change",e=>pace=Number(e.target.value));
$("#play").addEventListener("click",()=>{running=!running;accumulator=0;sync();});
$("#reset").addEventListener("click",()=>run?prepare(run.mission.id,run.seed):enterFree(world.p));
$("#brake").addEventListener("click",()=>brake());
road.addEventListener("click",event=>{const p=canvasPointer(road,event),angle=(Math.atan2((p.y-310)/.76,p.x-460)+Math.PI/2+Math.PI*2)%(Math.PI*2),position=angle/(Math.PI*2)*LENGTH;
  let distance=Infinity,index=0;world.cars.forEach((c,i)=>{const d=Math.min(Math.abs(c.x-position),LENGTH-Math.abs(c.x-position));if(d<distance){distance=d;index=i;}});if(run){selected=index;sync();render();}else brake(index);});
road.addEventListener("keydown",e=>{if(e.key==="Enter"&&!run){e.preventDefault();brake();}else if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();selected=(selected+(e.key==="ArrowRight"?1:world.cars.length-1))%world.cars.length;sync();render();}});
document.addEventListener("visibilitychange",()=>{if(document.hidden){running=false;accumulator=0;sync();}});
function frame(now){if(running){accumulator+=Math.min(.1,(now-last)/1000)*pace;let n=0;while(running&&accumulator>=.05&&n++<20){advanceOne();accumulator=Math.max(0,accumulator-.05);}render();}last=now;requestAnimationFrame(frame);}
sync();render();requestAnimationFrame(frame);
expose([
  tool("read_traffic_state","Read current controls and computed traffic metrics; no external data.",{},()=>summary(),true),
  tool("configure_traffic","Set bounded traffic conditions using the same controls as the page.",{count:{type:"integer",minimum:12,maximum:60},speed:{type:"number",minimum:60,maximum:120},timeGap:{type:"number",minimum:.7,maximum:2.5}},input=>configure(input)),
  tool("brake_traffic_car","Apply the page's three-second brake in free experiment only.",{index:{type:"integer",minimum:0,maximum:59}},input=>{number(input.index,0,world.cars.length-1,"index");return brake(input.index);}),
  tool("prepare_traffic_challenge","Prepare a paused seeded mission; replaces the current transient run.",{id:{type:"string",enum:MISSIONS.map(m=>m.id)},seed:{type:"integer",minimum:1,maximum:9999}},input=>prepare(input.id??"wave",input.seed??4)),
  tool("intervene_traffic","Apply the same budgeted, temporary policy as the challenge controls.",{speed:{type:"number",minimum:60,maximum:120},timeGap:{type:"number",minimum:.7,maximum:2.5},duration:{type:"integer",enum:[30,60]}},input=>applyPolicy(input))
]);
