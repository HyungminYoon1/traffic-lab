import {createWorld,parameters,step,metrics,brakeCar,LENGTH} from "./model.js";
import {expose,tool,number,canvasPointer,clamp} from "./ui.js";
const $=s=>document.querySelector(s),road=$("#road"),ctx=road.getContext("2d"),chart=$("#chart"),graph=chart.getContext("2d");
let world=createWorld(),selected=0,running=!matchMedia("(prefers-reduced-motion: reduce)").matches,pace=4,last=0,accumulator=0;
function configure(input) {
  const p=parameters({...world.p,...input});
  if(p.count!==world.p.count) {world=createWorld(p);selected=0;} else world.p=p;
  sync(); render(); return summary();
}
function summary(){const m=metrics(world);return {running,time:Number(world.time.toFixed(2)),...world.p,selected,braking:world.brake?.index??null,averageSpeed:m.speed,slow:m.slow,flow:m.flow};}
function sync(){
  $("#count").value=world.p.count;$("#speed").value=world.p.speed;$("#timeGap").value=world.p.timeGap;
  $("#countOut").textContent=world.p.count+"대";$("#speedOut").textContent=world.p.speed+" km/h";$("#gapOut").textContent=world.p.timeGap.toFixed(1)+"초";
  $("#selectedCar").textContent=String(selected+1).padStart(2,"0");$("#play").textContent=running?"일시 정지":"재생";
}
function brake(index=selected) {
  brakeCar(world,index);selected=index;sync();render();
  $("#status").textContent=String(index+1).padStart(2,"0")+"번 차량을 3초간 제동합니다. 느린 차량이 뒤쪽으로 이어지는지 살펴보세요.";
  return summary();
}
function render(){
  const m=metrics(world);$("#meanSpeed").textContent=m.speed.toFixed(1);$("#slowCars").textContent=m.slow;$("#flow").textContent=Math.round(m.flow).toLocaleString("ko-KR");$("#time").textContent=world.time.toFixed(1);
  ctx.clearRect(0,0,920,620);ctx.save();ctx.translate(460,310);ctx.scale(1,.76);
  ctx.beginPath();ctx.arc(0,0,248,0,Math.PI*2);ctx.strokeStyle="#282e31";ctx.lineWidth=46;ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,248,0,Math.PI*2);ctx.strokeStyle="#bec5bf";ctx.lineWidth=2;ctx.setLineDash([12,13]);ctx.stroke();ctx.setLineDash([]);
  for(let i=0;i<world.cars.length;i++){
    const c=world.cars[i],angle=c.x/LENGTH*Math.PI*2-Math.PI/2,active=world.brake?.index===i;
    ctx.save();ctx.rotate(angle);ctx.translate(248,0);ctx.rotate(Math.PI/2);
    ctx.fillStyle=active?"#cf3543":c.v<2?"#dc7049":`hsl(${clamp(c.v/(world.p.speed/3.6),0,1)*180+20} 55% 62%)`;
    if(i===selected){ctx.strokeStyle="#f2cb43";ctx.lineWidth=3;ctx.strokeRect(-7,-14,14,28);}
    ctx.fillRect(-5,-11,10,22);ctx.fillStyle="#202a2f";ctx.fillRect(-3,-6,6,4);ctx.restore();
  }
  ctx.restore();ctx.textAlign="center";ctx.fillStyle="#28352d";ctx.font="800 56px system-ui";ctx.fillText(m.speed.toFixed(1),460,295);ctx.font="18px system-ui";ctx.fillStyle="#717b73";ctx.fillText("km/h · 평균 속도",460,330);ctx.font="13px system-ui";ctx.fillText("차량은 시계 방향으로 이동",460,365);
  graph.clearRect(0,0,920,160);graph.font="11px system-ui";graph.textAlign="right";
  for(let v=0;v<=120;v+=40){const y=137-v;graph.strokeStyle="#e5e8df";graph.beginPath();graph.moveTo(40,y);graph.lineTo(910,y);graph.stroke();graph.fillStyle="#7a847a";graph.fillText(v,31,y+4);}
  if(world.history.length){graph.strokeStyle="#b78e16";graph.lineWidth=2.5;graph.beginPath();const first=world.history[0].time;
    world.history.forEach((p,i)=>{const x=40+(p.time-first)/120*870,y=137-p.speed;i?graph.lineTo(x,y):graph.moveTo(x,y);});graph.stroke();}
}
for(const key of ["count","speed","timeGap"]) $("#"+key).addEventListener("input",e=>configure({[key]:Number(e.target.value)}));
$("#free").addEventListener("click",()=>{world=createWorld({count:18,speed:100,timeGap:1.4});selected=0;sync();render();});
$("#dense").addEventListener("click",()=>{world=createWorld({count:52,speed:100,timeGap:1.2});selected=0;sync();render();});
$("#pace").addEventListener("change",e=>pace=Number(e.target.value));
$("#play").addEventListener("click",()=>{running=!running;accumulator=0;sync();});
$("#reset").addEventListener("click",()=>{world=createWorld(world.p);selected=0;sync();render();$("#status").textContent="현재 도로 조건으로 다시 시작했습니다.";});
$("#brake").addEventListener("click",()=>brake());
road.addEventListener("click",event=>{const p=canvasPointer(road,event),angle=(Math.atan2((p.y-310)/.76,p.x-460)+Math.PI/2+Math.PI*2)%(Math.PI*2),position=angle/(Math.PI*2)*LENGTH;
  let distance=Infinity,index=0;world.cars.forEach((c,i)=>{const d=Math.min(Math.abs(c.x-position),LENGTH-Math.abs(c.x-position));if(d<distance){distance=d;index=i;}});brake(index);});
road.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();brake();}else if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();selected=(selected+(e.key==="ArrowRight"?1:world.cars.length-1))%world.cars.length;sync();render();}});
document.addEventListener("visibilitychange",()=>{if(document.hidden){running=false;accumulator=0;sync();}});
function frame(now){if(running){accumulator+=Math.min(.1,(now-last)/1000)*pace;let n=0;while(accumulator>=.05&&n++<20){step(world);accumulator-=.05;}render();}last=now;requestAnimationFrame(frame);}
sync();render();requestAnimationFrame(frame);
expose([
  tool("read_traffic_state","Read current controls and computed traffic metrics; no external data.",{},()=>summary(),true),
  tool("configure_traffic","Set bounded traffic conditions using the same controls as the page.",{count:{type:"integer",minimum:12,maximum:60},speed:{type:"number",minimum:60,maximum:120},timeGap:{type:"number",minimum:.7,maximum:2.5}},input=>configure(input)),
  tool("brake_traffic_car","Apply the page's three-second brake to a zero-based car index.",{index:{type:"integer",minimum:0,maximum:59}},input=>{number(input.index,0,world.cars.length-1,"index");return brake(input.index);})
]);
