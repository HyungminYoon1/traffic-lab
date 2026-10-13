import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,basename} from "node:path";
const require=createRequire(resolve(process.env.PLAYWRIGHT_PACKAGE||"../output/playwright/implement-20261012/package.json"));
const {chromium}=require("playwright");
const app=basename(process.cwd()),base=process.env.EDGE_BASE_URL||"http://127.0.0.1:59540";
assert.equal(new URL(base).hostname,"127.0.0.1","isolated loopback only");
const out=resolve("output/playwright/edge-20261013");await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true,args:["--mute-audio"]});
const checks=[],errors=[];
const check=(value,label)=>{assert(value,label);checks.push(label);};
async function click(page,selector,width){const el=page.locator(selector);if(width<500)await el.tap();else await el.click();}
async function settled(page){await page.waitForFunction(()=>!document.querySelector("#run").disabled&&document.querySelector("#result-label").textContent.startsWith("최종"));}
async function finishTrace(page){for(let i=0;i<150&&!await page.locator("#step").isDisabled();i++)await page.locator("#step").click();assert(await page.locator("#step").isDisabled());}
async function choose(page,label){await page.locator("#operation-choices button").filter({has:page.getByText(label,{exact:true})}).click();await finishTrace(page);}
async function mainFlow(page,width){

  await page.locator("#seed").fill("");await click(page,"#prepare",width);
  check((await page.locator("#status").innerText()).includes("seed"),width+": empty seed rejected");
  await page.locator("#seed").fill("4");await click(page,"#prepare",width);
  await page.locator("#policySpeed").selectOption("60");await page.locator("#policyGap").selectOption("2.2");
  await page.locator("#applyPolicy").focus();await page.keyboard.press("Enter");await page.keyboard.press("Enter");
  check(await page.locator("#applyPolicy").isDisabled(),width+": repeated active intervention blocked");
  for(let i=0;i<12;i++)await click(page,"#advance",width);
  await page.locator("#policyGap").selectOption(".7");await click(page,"#applyPolicy",width);
  for(let i=0;i<6;i++)await click(page,"#advance",width);
  check((await page.locator("#outcome").innerText())==="목표 달성",width+": actual independent success");
  const measured=await page.locator(".comparison").innerText();
  check((await page.locator("#savedCount").innerText())==="1 / 10개",width+": one durable policy");
  await page.locator("#importPolicy").setInputFiles({name:"invalid.json",mimeType:"application/json",buffer:Buffer.from("{")});
  await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("가져오기 실패"));
  check((await page.locator("#savedCount").innerText())==="1 / 10개",width+": malformed import does not alter policies");
  await page.locator("#importPolicy").setInputFiles({name:"oversize.json",mimeType:"application/json",buffer:Buffer.alloc(4097,32)});
  await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("가져오기 실패"));
  await click(page,"#replayPolicy",width);check(await page.locator("#applyPolicy").isDisabled(),width+": replay locks manual input");
  for(let i=0;i<18;i++)await click(page,"#advance",width);
  check(await page.locator(".comparison").innerText()===measured,width+": deterministic visible replay");
  await click(page,"#reset",width);check((await page.locator("#time").innerText())==="0.0",width+": terminal reset");

}
async function fixtures(browser) {

  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:"reduce"});
  const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));page.setDefaultTimeout(15000);

  try{
    await page.addInitScript(()=>{
      const read=File.prototype.text;
      File.prototype.text=function(){return new Promise((resolve,reject)=>{window.qaReadRelease=()=>read.call(this).then(resolve,reject);});};
    });
    await page.goto(base+"/"+app+"/");
    const policy={version:1,campaign:"idm-v1",mission:"wave",seed:4,actions:[{tick:0,speed:60,timeGap:2.2,duration:60}]};
    await page.locator("#importPolicy").setInputFiles({name:"fixture.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(policy))});
    await page.waitForFunction(()=>typeof window.qaReadRelease==="function");
    await page.locator("#clearPolicies").tap();await page.evaluate(()=>window.qaReadRelease());await page.waitForTimeout(150);
    check((await page.locator("#savedCount").innerText())==="0 / 10개","TEST_DOUBLE clear cancels pending import; deleted policies cannot reappear");
    await page.evaluate(()=>{Storage.prototype.setItem=function(){};});
    await page.locator("#applyPolicy").tap();await page.locator("#saveCurrent").tap();
    check((await page.locator("#status").innerText()).includes("확인할 수 없습니다"),"TEST_DOUBLE private readback failure shown");
    check((await page.locator("#savedCount").innerText())==="0 / 10개","TEST_DOUBLE unconfirmed save does not populate list");
    await page.screenshot({path:out+"/storage-readback.png",fullPage:true});
  }finally{await context.close();}
}

try{
  for(const width of process.env.EDGE_FIXTURES_ONLY?[]:[1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,isMobile:width<500,reducedMotion:"reduce"});
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on("pageerror",e=>errors.push(e.message));
    try{
      await page.goto(base+"/"+app+"/");
      await mainFlow(page,width);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+": no horizontal overflow");
      await page.screenshot({path:out+"/viewport-"+width+".png",fullPage:true});
    }catch(e){await page.screenshot({path:out+"/FAIL-"+width+".png",fullPage:true});throw e;}finally{await context.close();}
  }
  await fixtures(browser);
  check(errors.length===0,"no uncaught browser exceptions");
}finally{
  await writeFile(out+"/browser.json",JSON.stringify({app,checks,errors,fixtureNote:"Only named injected timing/storage fixtures are TEST_DOUBLE. Main UI uses actual browser input.",remoteCI:"NOT_RUN",live:"NOT_RUN"},null,2));
  await browser.close();
}
console.log(JSON.stringify({app,checks:checks.length,errors}));
