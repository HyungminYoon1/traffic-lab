import {createChallenge,intervene,advanceChallenge} from "./challenge.js";
import {DT} from "./model.js";

export const CAMPAIGN="idm-v1",MAX_ACTIONS=6,MAX_POLICY_BYTES=4096;
export function exactObject(value,keys) {
  if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k))) throw new RangeError("잘못된 정책 형식");
}
export function validatePolicy(value) {
  exactObject(value,["version","campaign","mission","seed","actions"]);
  if(value.version!==1||value.campaign!==CAMPAIGN) throw new RangeError("지원하지 않는 정책 버전");
  if(typeof value.mission!=="string"||typeof value.seed!=="number")throw new RangeError("도전·시드 오류");
  const run=createChallenge(value.mission,value.seed);
  if(!Array.isArray(value.actions)||value.actions.length>MAX_ACTIONS) throw new RangeError("개입은 최대 6개입니다");
  let end=0,spent=0;
  const actions=value.actions.map(a=>{
    exactObject(a,["tick","speed","timeGap","duration"]);
    if(!Number.isInteger(a.tick)||a.tick<end||a.tick<0||a.tick>=run.mission.duration/DT) throw new RangeError("개입 시각·중첩·종료 범위 오류");
    const probe=createChallenge(value.mission,value.seed);
    intervene(probe,{speed:a.speed,timeGap:a.timeGap,duration:a.duration});
    end=a.tick+a.duration/DT;spent+=a.duration/30;
    if(spent>run.mission.budget) throw new RangeError("개입 예산 초과");
    return {tick:a.tick,speed:a.speed,timeGap:a.timeGap,duration:a.duration};
  });
  return {version:1,campaign:CAMPAIGN,mission:run.mission.id,seed:run.seed,actions};
}
export function parsePolicy(text) {
  if(typeof text!=="string"||new TextEncoder().encode(text).length>MAX_POLICY_BYTES) throw new RangeError("정책 파일은 4 KB 이하입니다");
  return validatePolicy(JSON.parse(text));
}
export function policyFromRun(run) {
  if(!run) throw new RangeError("도전을 먼저 준비하세요");
  return validatePolicy({version:1,campaign:CAMPAIGN,mission:run.mission.id,seed:run.seed,
    actions:run.log.map(p=>({tick:Math.round(p.start/DT),speed:p.speed,timeGap:p.timeGap,duration:p.duration}))});
}
export function createReplay(value) {
  const policy=validatePolicy(value);
  return {policy,run:createChallenge(policy.mission,policy.seed),index:0};
}
export function advanceReplay(replay) {
  if(replay.run.done) return replay.run;
  const action=replay.policy.actions[replay.index];
  if(action&&action.tick===replay.run.tick){const {tick,...input}=action;intervene(replay.run,input);replay.index++;}
  return advanceChallenge(replay.run);
}
export function replayPolicy(value) {
  const replay=createReplay(value);
  while(!replay.run.done) advanceReplay(replay);
  return replay.run;
}
