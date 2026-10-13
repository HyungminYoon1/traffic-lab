async (page) => {
  const checks=[],errors=[],assert=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);},output="../output/qa-20261013/traffic-lab";
  page.on("pageerror",e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});
  const prepare=async()=>{await page.locator("#seed").fill("4");await page.locator("#prepare").click();};
  await page.locator("#seed").fill("0");await page.locator("#prepare").click();
  assert((await page.locator("#status").innerText()).includes("seed"),"Invalid seed rejected");
  assert((await page.locator("#time").innerText())==="0.0","Invalid preparation preserves current road");
  await prepare();for(let i=0;i<18;i++)await page.locator("#advance").click();
  assert((await page.locator("#outcome").innerText()).includes("미달"),"No intervention fails the actual targets");
  await prepare();await page.locator("#policySpeed").selectOption("60");await page.locator("#policyGap").selectOption("2.2");await page.locator("#applyPolicy").click();
  assert(await page.locator("#applyPolicy").isDisabled(),"Active policy cannot overlap");
  for(let i=0;i<12;i++)await page.locator("#advance").click();
  await page.locator("#policyGap").selectOption(".7");await page.locator("#applyPolicy").click();for(let i=0;i<6;i++)await page.locator("#advance").click();
  assert((await page.locator("#outcome").innerText())==="목표 달성","Actual scheduled interventions pass all goals");
  assert((await page.locator("#trialflow").innerText())==="2284","Final distance-based flow regression");
  assert((await page.locator("#trialpasses").innerText())==="42","Detector count is separate");
  assert((await page.locator("#status").innerText()).includes("직접 완료 1 / 3"),"Independent successful policy saved");
  const readings=await page.locator(".comparison").innerText();
  await page.locator("#comparison-experiment summary").click();
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:output+"/desktop.png",fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.evaluate(()=>window.scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow at ${width}`);await page.screenshot({path:output+`/mobile-${width}.png`,fullPage:true});}
  await page.locator("#replayPolicy").click();for(let i=0;i<18;i++)await page.locator("#advance").click();
  assert(await page.locator(".comparison").innerText()===readings,"Visible policy replay exactly reproduces the measured table");
  assert(await page.locator("#applyPolicy").isDisabled(),"Replay locks extra interventions");
  await page.locator("#reset").click();assert((await page.locator("#progressText").innerText()).startsWith("0.0 /"),"Reset restores paused initial time");
  assert((await page.locator("#savedCount").innerText())==="1 / 10개","Reset retains saved policies");
  assert(errors.length===0,"No uncaught page errors");return {checks,errors,readings,screenshots:output};
}
