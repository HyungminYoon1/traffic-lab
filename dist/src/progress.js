export const PROGRESS_KEY="web-lab-progress-v1";
export const REPO_IDS=Object.freeze(["data-mirage","echo-vault","light-route","logic-foundry","neon-tactics","orbit-courier","packet-journey","parcel-panic","pixel-kitchen","pocket-city","route-race","sense-lab","swarm-garden","think-forge","traffic-lab"]);
function read(storage) {
  const text=storage.getItem(PROGRESS_KEY);
  if(text===null)return {version:1,apps:{}};
  if(text.length>8192)throw new RangeError("Progress too large");
  const value=JSON.parse(text);
  if(!value||value.version!==1||!value.apps||typeof value.apps!=="object"||Array.isArray(value.apps)||Object.keys(value).some(k=>!["version","apps"].includes(k))||Object.keys(value.apps).length>15)throw new RangeError("Invalid progress");
  for(const [id,r] of Object.entries(value.apps)){
    if(!REPO_IDS.includes(id)||!r||Object.keys(r).length!==3||!Number.isInteger(r.completed)||!Number.isInteger(r.total)||r.completed<0||r.completed>r.total||r.total>1000||typeof r.updatedAt!=="string"||r.updatedAt.length!==24||!Number.isFinite(Date.parse(r.updatedAt))||new Date(r.updatedAt).toISOString()!==r.updatedAt)throw new RangeError("Invalid progress record");
  }
  return value;
}
export function reportProgress(storage,completed,total) {
  try{
    if(!Number.isInteger(completed)||!Number.isInteger(total)||completed<0||completed>total||total>1000) return false;
    const value=read(storage);
    value.apps["traffic-lab"]={completed,total,updatedAt:new Date().toISOString()};
    storage.setItem(PROGRESS_KEY,JSON.stringify(value));return true;
  }catch{return false;}
}
export function clearProgress(storage) {
  try{if(storage.getItem(PROGRESS_KEY)===null)return true;const value=read(storage);delete value.apps["traffic-lab"];storage.setItem(PROGRESS_KEY,JSON.stringify(value));return true;}catch{return false;}
}
