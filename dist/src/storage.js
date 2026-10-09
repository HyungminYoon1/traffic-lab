import {validatePolicy,replayPolicy,exactObject} from "./policy.js";
import {reportProgress,clearProgress} from "./progress.js";
export const STORE_KEY="traffic-lab-policies-v1",MAX_SAVED=10,MAX_STORE_BYTES=49152;
export function readPolicies(storage) {
  const text=storage.getItem(STORE_KEY);
  if(text===null)return [];
  if(new TextEncoder().encode(text).length>MAX_STORE_BYTES)throw new RangeError("저장 데이터 크기 초과");
  const value=JSON.parse(text);exactObject(value,["version","entries"]);
  if(value.version!==1||!Array.isArray(value.entries)||value.entries.length>MAX_SAVED)throw new RangeError("저장 형식 오류");
  const entries=value.entries.map(e=>{
    exactObject(e,["policy","independent"]);
    if(typeof e.independent!=="boolean")throw new RangeError("완료 기록 오류");
    return {policy:validatePolicy(e.policy),independent:e.independent};
  });
  if(new Set(entries.map(e=>JSON.stringify(e.policy))).size!==entries.length)throw new RangeError("중복 저장 기록");
  return entries;
}
export function independentCount(entries) {
  const missions=new Set();
  for(const e of entries)if(e.independent&&replayPolicy(e.policy).result.success)missions.add(e.policy.mission);
  return missions.size;
}
function write(storage,entries) {
  const completed=independentCount(entries);
  storage.setItem(STORE_KEY,JSON.stringify({version:1,entries}));
  return {entries,completed,summaryWritten:completed?reportProgress(storage,completed,3):clearProgress(storage)};
}
export function savePolicy(storage,value,independent=false) {
  if(typeof independent!=="boolean")throw new RangeError("완료 기록 오류");
  const policy=validatePolicy(value);
  if(!policy.actions.length)throw new RangeError("저장할 개입이 없습니다");
  if(independent&& !replayPolicy(policy).result.success)throw new RangeError("완료 목표 미달");
  const entries=readPolicies(storage),key=JSON.stringify(policy),entry=entries.find(e=>JSON.stringify(e.policy)===key);
  if(entry)entry.independent=entry.independent||independent;
  else {if(entries.length>=MAX_SAVED)throw new RangeError("최대 10개입니다. 저장 정책을 삭제하세요");entries.push({policy,independent});}
  return write(storage,entries);
}
export function deletePolicy(storage,index) {
  const entries=readPolicies(storage);
  if(!Number.isInteger(index)||index<0||index>=entries.length)throw new RangeError("저장 정책을 선택하세요");
  entries.splice(index,1);return write(storage,entries);
}
export function clearPolicies(storage) {
  storage.removeItem(STORE_KEY);return clearProgress(storage);
}
