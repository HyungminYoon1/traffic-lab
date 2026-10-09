import {clamp,number,rng} from "./ui.js";
export const LENGTH=1000, CAR_LENGTH=5, DT=.05;
export function parameters(input={}) {
  if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(k=>!["count","speed","timeGap"].includes(k))) throw new RangeError("Unknown traffic parameters");
  const p={count:40,speed:100,timeGap:1.4,...input};
  if(Object.values(p).some(value=>typeof value!=="number")) throw new RangeError("Numeric traffic parameters required");
  number(p.count,12,60,"count"); if(!Number.isInteger(p.count)) throw new RangeError("Integer count required");
  number(p.speed,60,120,"speed"); number(p.timeGap,.7,2.5,"time gap");
  return p;
}
export function createWorld(input={},seed=4) {
  const p=parameters(input),random=rng(seed),gap=LENGTH/p.count-CAR_LENGTH;
  const v=Math.min(p.speed/3.6,(gap-2)/p.timeGap)*.9;
  return {p,time:0,brake:null,zone:null,distance:0,passes:0,history:[],nextSample:0,cars:Array.from({length:p.count},(_,i)=>({x:i*LENGTH/p.count,v:v*(.99+random()*.02)}))};
}
// A speed restriction along the existing lane; no extra lane, signal or inflow.
export function setZone(world,zone=null) {
  if(zone===null){world.zone=null;return;}
  const {start,end,speed}=zone;
  if([start,end,speed].some(value=>typeof value!=="number")) throw new RangeError("Numeric zone required");
  number(start,0,LENGTH-1,"zone start");number(end,1,LENGTH,"zone end");number(speed,20,120,"zone speed");
  if(end<=start) throw new RangeError("Zone must have positive length");
  world.zone={start,end,speed};
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
export function step(world,dt=DT) {
  if(dt!==DT) throw new RangeError("Fixed 0.05-second time step required");
  const {p,cars}=world,a=1.2,b=2,v0=p.speed/3.6;
  const next=cars.map((car,i)=>{
    const lead=cars[(i+1)%cars.length],gap=Math.max(.2,gapAhead(world,i));
    const desired=2+Math.max(0,car.v*p.timeGap+car.v*(car.v-lead.v)/(2*Math.sqrt(a*b)));
    const zone=world.zone,desiredSpeed=zone&&car.x>=zone.start&&car.x<zone.end?Math.min(v0,zone.speed/3.6):v0;
    let acceleration=clamp(a*(1-(car.v/desiredSpeed)**4-(desired/gap)**2),-8,a);
    if(world.brake?.index===i&&world.time<world.brake.until) acceleration=Math.min(acceleration,-6);
    let velocity=Math.max(0,car.v+acceleration*dt);
    let travel=velocity===0&&acceleration<0 ? -(car.v**2)/(2*acceleration) : car.v*dt+.5*acceleration*dt**2;
    travel=clamp(travel,0,Math.max(0,gap-.2));
    if(travel<car.v*dt+.5*acceleration*dt**2) velocity=Math.min(velocity,travel/dt);
    world.distance+=travel;
    if(car.x+travel>=LENGTH) world.passes++;
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
