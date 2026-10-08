import {clamp,number,rng} from "./ui.js";
export const LENGTH=1000, CAR_LENGTH=5;
export function parameters(input={}) {
  const p={count:40,speed:100,timeGap:1.4,...input};
  number(p.count,12,60,"count"); if(!Number.isInteger(p.count)) throw new RangeError("Integer count required");
  number(p.speed,60,120,"speed"); number(p.timeGap,.7,2.5,"time gap");
  return p;
}
export function createWorld(input={},seed=4) {
  const p=parameters(input),random=rng(seed),gap=LENGTH/p.count-CAR_LENGTH;
  const v=Math.min(p.speed/3.6,(gap-2)/p.timeGap)*.9;
  return {p,time:0,brake:null,history:[],nextSample:0,cars:Array.from({length:p.count},(_,i)=>({x:i*LENGTH/p.count,v:v*(.99+random()*.02)}))};
}
export function gapAhead(world,i) {
  const cars=world.cars;
  return (cars[(i+1)%cars.length].x-cars[i].x+LENGTH)%LENGTH-CAR_LENGTH;
}
export function brakeCar(world,index) {
  number(index,0,world.cars.length-1,"car index"); if(!Number.isInteger(index)) throw new RangeError("Integer index required");
  world.brake={index,until:world.time+3};
}
export function metrics(world) {
  const average=world.cars.reduce((sum,c)=>sum+c.v,0)/world.cars.length;
  return {speed:average*3.6,slow:world.cars.filter(c=>c.v<2).length,flow:world.cars.length*average/LENGTH*3600};
}
export function step(world,dt=.05) {
  number(dt,.001,.1,"time step");
  const {p,cars}=world,a=1.2,b=2,v0=p.speed/3.6;
  const next=cars.map((car,i)=>{
    const lead=cars[(i+1)%cars.length],gap=Math.max(.2,gapAhead(world,i));
    const desired=2+Math.max(0,car.v*p.timeGap+car.v*(car.v-lead.v)/(2*Math.sqrt(a*b)));
    let acceleration=clamp(a*(1-(car.v/v0)**4-(desired/gap)**2),-8,a);
    if(world.brake?.index===i&&world.time<world.brake.until) acceleration=Math.min(acceleration,-6);
    let velocity=Math.max(0,car.v+acceleration*dt);
    let travel=velocity===0&&acceleration<0 ? -(car.v**2)/(2*acceleration) : car.v*dt+.5*acceleration*dt**2;
    travel=clamp(travel,0,Math.max(0,gap-.2));
    if(travel<car.v*dt+.5*acceleration*dt**2) velocity=Math.min(velocity,travel/dt);
    return {x:(car.x+travel)%LENGTH,v:velocity};
  });
  world.cars=next; world.time+=dt;
  if(world.brake&&world.time>=world.brake.until) world.brake=null;
  if(world.time>=world.nextSample) {
    world.history.push({time:world.time,...metrics(world)});
    if(world.history.length>240) world.history.shift();
    world.nextSample=world.time+.5;
  }
  return world;
}
