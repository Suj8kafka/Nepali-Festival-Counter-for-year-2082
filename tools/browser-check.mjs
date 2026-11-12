import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const base = process.env.UTSAV_TEST_URL || "http://127.0.0.1:4173";
const chrome = process.env.CHROME_PATH || [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].find(existsSync);
if (!chrome) throw new Error("An installed Chrome or Edge is required. Set CHROME_PATH.");
const tempRoot = path.resolve(os.tmpdir());
const profile = path.resolve(tempRoot, "utsav-browser-" + process.pid + "-" + Date.now());
if (path.dirname(profile) !== tempRoot) throw new Error("Invalid browser profile directory.");
await mkdir(profile, { recursive: true });
await mkdir(".artifacts/downloads", { recursive: true });
const child = spawn(chrome, ["--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + profile, "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-extensions", "--disable-sync", "about:blank"], { stdio: "ignore", windowsHide: true });
let ws, nextId = 0;
const pending = new Map();
const exceptions = [];
const downloads = [];
let checks = 0;
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 12_000);
  pending.set(id, { resolve, reject, timer });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const response = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error("Condition failed: " + expression);
};
const settleScene = () => evaluate("new Promise((resolve,reject)=>{let last=null,stable=0,frames=0;function sample(){const value=new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.mountains')).transform).m42;stable=last!==null && Math.abs(value-last)<.001?stable+1:0;last=value;if(stable>=6)return resolve();if(++frames>150)return reject(Error('Scene motion did not settle'));requestAnimationFrame(sample)}requestAnimationFrame(sample)})");
const click = (selector) => evaluate("document.querySelector(" + JSON.stringify(selector) + ").click()");
const search = (text) => evaluate("document.getElementById('festival-search').value=" + JSON.stringify(text) + ";document.getElementById('festival-search').dispatchEvent(new Event('input',{bubbles:true}))");
const check = (condition, label) => { assert.ok(condition, label); console.log("PASS " + label); checks++; };
const screenshot = async (name, fullPage = false) => {
  await evaluate("document.fonts.ready");
  const layout = await command("Page.getLayoutMetrics");
  const params = { format: "png", captureBeyondViewport: fullPage };
  if (fullPage) params.clip = { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 };
  const result = await command("Page.captureScreenshot", params);
  await writeFile(".artifacts/" + name, Buffer.from(result.data, "base64"));
};
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number((await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); if (port) break; } catch {}
    await delay(100);
  }
  if (!port) throw new Error("Browser did not expose its debug port.");
  const targets = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  const target = targets.find(item => item.type === "page");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  ws.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails);
    if (message.method === "Page.downloadWillBegin") downloads.push(message.params);
  });
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Network.enable");
  // Isolate UI verification from analytics and community visitor writes.
  await command("Network.setBlockedURLs", { urls: ["*googletagmanager.com/*", "*google-analytics.com/*", "*gstatic.com/firebasejs/*", "*api.ipify.org/*", "*firestore.googleapis.com/*"] });
  await command("Page.setDownloadBehavior", { behavior: "allow", downloadPath: path.resolve(".artifacts/downloads") });
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await command("Emulation.setTimezoneOverride", { timezoneId: "America/New_York" });
  const fixed = Date.parse("2026-11-12T06:15:00Z");
  await command("Page.addScriptToEvaluateOnNewDocument", { source: "(() => {const Original=Date, initial=Original.now(), fixed=" + fixed + ";window.Date=class extends Original{constructor(...args){super(...(args.length?args:[fixed+Original.now()-initial]));}static now(){return fixed+Original.now()-initial;}};})();" });
  await command("Page.addScriptToEvaluateOnNewDocument", { source: "(() => { const collection = { get: async () => ({size:1234}), doc: () => ({set:async () => {}}) }; const db={collection:()=>collection}; const app={firestore:()=>db}; window.firebase={apps:[app],app:()=>app,initializeApp:()=>app,firestore:()=>db}; })();" });
  const fixture=JSON.parse(await readFile("tools/fixtures/festivals-2083.json","utf8"));
  const fixtureScript = await command("Page.addScriptToEvaluateOnNewDocument", {source: "(()=>{const fixture="+JSON.stringify(fixture)+";Object.defineProperty(window,'FESTIVAL_DATA',{get:()=>fixture,set:()=>{},configurable:true});Object.defineProperty(window,'FESTIVAL_META',{get:()=>({}),set:()=>{},configurable:true});const original=window.fetch.bind(window);window.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname.endsWith('/nepali_holidays.csv'))return original(new URL('tools/fixtures/calendar-2083.csv',location.href),options);if(url.pathname.endsWith('/festival-meta.json'))return Promise.resolve(new Response(JSON.stringify({recordCount:fixture.length,calendarYear:2083}),{headers:{'Content-Type':'application/json'}}));return original(input,options);};})();"});
  await command("Page.navigate", { url: base });
  await waitFor("document.querySelectorAll('.festival-card').length===6 && document.getElementById('featured-name').textContent==='Chhath Parva'");
  check(await evaluate("document.getElementById('total-festivals').textContent==='44'"), "all 44 festival dates load");
  check(await evaluate("document.querySelector('.card-countdown.today').textContent.includes('Celebrating today')"), "today remains active after Nepal midnight");
  check(await evaluate("document.getElementById('nepal-clock').textContent==='12:00'"), "Nepal clock works in a different browser timezone");
  check(await evaluate("document.documentElement.scrollWidth<=innerWidth"), "desktop has no horizontal overflow");
  await waitFor("Array.from(document.querySelectorAll('[data-total-visits]')).every(element=>element.textContent==='1,234')");
  check(await evaluate("document.getElementById('totalVisits').closest('main') && document.getElementById('totalVisits').getBoundingClientRect().height>0"), "historical total is visible in the main statistics");
  check(await evaluate("document.querySelectorAll('[data-total-visits]').length===2"), "main and footer totals stay in sync");
  const archiveUrl = await evaluate("document.getElementById('archive-link').href");
  const archiveResponse = await fetch(archiveUrl);
  const archivePage = await archiveResponse.text();
  check(archiveResponse.ok && archivePage.includes("Archived original site") && archivePage.includes('href="../index.html"'), "footer archive link opens the original site with a return link");
  for (const asset of ["script.js","nepali_holidays.csv","Group%2041.png","favi.png"]) {
    assert.ok((await fetch(new URL(asset, archiveUrl))).ok, "Archive asset serves: " + asset);
  }
  check(true, "all archived local assets serve successfully");
  await waitFor("Array.from(document.querySelectorAll('.landscape-layer')).every(image=>image.complete && image.naturalWidth>0)");
  check(true, "all original landscape layers load");
  const support = await evaluate("(()=>{const image=document.querySelector('.valley'),canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,1600,1000);const pixels=context.getImageData(0,0,1600,1000).data,alpha=(x,y)=>pixels[(y*1600+x)*4+3];let columns=0,unsupported=0;for(let x=6;x<1594;x+=6){let bottom=-1;for(let y=650;y<820;y++){let solid=true;for(let dy=0;dy<8&&solid;dy++)for(let dx=-2;dx<=3;dx++)if(alpha(x+dx,y+dy)<180){solid=false;break;}if(solid){bottom=y+8;break;}}if(bottom<0)continue;columns++;for(let y=bottom;y<1000;y++)if(alpha(x,y)<160){unsupported++;break;}}return {columns,unsupported}})()");
  check(support.columns>200 && support.unsupported===0, "every sampled city facade has opaque terrain beneath it, with no sky gaps");
  check(await evaluate("document.getElementById('home').nextElementSibling.firstElementChild===document.getElementById('featured') && !document.querySelector('#home #featured-name')"), "upcoming festival sits immediately after the parallax scene");
  check(await evaluate("(()=>{const linear=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;const luminance=c=>{const rgb=c.match(/[0-9.]+/g).slice(0,3).map(Number).map(linear);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};const pairs=[['#featured-name','.featured'],['.featured-native','.featured'],['.countdown span','.featured'],['.countdown-note','.featured'],['.card-title','body'],['.card-nepali-date','body'],['.section-description','body']];return pairs.every(([text,bg])=>{const a=luminance(getComputedStyle(document.querySelector(text)).color),b=luminance(getComputedStyle(document.querySelector(bg)).backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5})})()"), "festival headings, countdown labels, and secondary text meet 4.5:1 contrast");
  check(await evaluate("Number(document.getElementById('upcoming-count').textContent)+Number(document.getElementById('past-count').textContent)===44"), "upcoming and past counts cover the full year");
  await waitFor("document.getElementById('home').classList.contains('motion-active')");
  check(await evaluate("getComputedStyle(document.querySelector('.landscape')).position==='fixed' && getComputedStyle(document.querySelector('.mountains')).willChange.includes('transform')"), "visible artwork uses fixed, compositor-promoted layers");
  const groundedOffsets = await evaluate("[...document.querySelectorAll('.settlement .landscape-layer')].filter(image=>getComputedStyle(image).display!=='none').map(image=>image.getBoundingClientRect().top-document.getElementById('home').getBoundingClientRect().top)");
  const motionSample = await evaluate("new Promise(resolve=>{window.scrollTo({top:260,behavior:'instant'});const samples=[];function sample(){samples.push(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.mountains')).transform).m42+scrollY);if(samples.length<12)requestAnimationFrame(sample);else resolve(samples)}requestAnimationFrame(()=>requestAnimationFrame(sample))})");
  check(motionSample.some(value=>value>0 && value<160) && motionSample.at(-1)>120 && motionSample.at(-1)>motionSample[1], "distant parallax produces clearly visible separation and eases across frames");
  await settleScene();
  check(await evaluate("(()=>{const y=s=>new DOMMatrixReadOnly(getComputedStyle(document.querySelector(s)).transform).m42;return y('.mountains')>y('.distant-hills') && y('.distant-hills')>y('.near-hills') && y('.mountains')<0})()"), "distant mountains and hills retain their smooth depth movement");
  await settleScene();
  const scrolledOffsets = await evaluate("[...document.querySelectorAll('.settlement .landscape-layer')].filter(image=>getComputedStyle(image).display!=='none').map(image=>image.getBoundingClientRect().top-document.getElementById('home').getBoundingClientRect().top)");
  check(scrolledOffsets.length===groundedOffsets.length && scrolledOffsets.every((value,index)=>Math.abs(value-groundedOffsets[index])<.01), "buildings, temples, and foreground stay on one precise ground plane");
  check(await evaluate("(()=>{const hero=document.getElementById('home').getBoundingClientRect(),ground=document.querySelector('.settlement').getBoundingClientRect();return Math.abs(hero.bottom-ground.bottom)<.01 && getComputedStyle(document.querySelector('.settlement')).position==='absolute' && [...document.querySelectorAll('.settlement .landscape-layer')].every(image=>!image.hasAttribute('data-depth') && getComputedStyle(image).transform==='none')})()"), "the city base remains attached to the hero while scrolling");
  check(await evaluate("getComputedStyle(document.querySelector('.landscape')).position==='fixed' && Math.abs(document.querySelector('.landscape').getBoundingClientRect().top)<.01 && getComputedStyle(document.getElementById('home')).clipPath!=='none'"), "the fixed background keeps its viewport origin inside an explicit hero clip");
  check(await evaluate("(()=>{const scene=document.getElementById('home'),art=document.querySelector('.landscape'),content=document.querySelector('.festival-content'),footer=document.querySelector('.site-footer');const previous=[art.style.pointerEvents,content.style.visibility,footer.style.visibility];let clipped;try{art.style.pointerEvents='auto';content.style.visibility='hidden';footer.style.visibility='hidden';const boundary=scene.getBoundingClientRect().bottom;const probeY=Math.min(innerHeight-1,Math.ceil(boundary)+5);clipped=!document.elementsFromPoint(innerWidth/2,probeY).some(element=>element.closest('#home'));}finally{art.style.pointerEvents=previous[0];content.style.visibility=previous[1];footer.style.visibility=previous[2];}return clipped})()"), "artwork cannot escape below the hero even when the next section is hidden");
  await screenshot("parallax-scroll.png");
  const horizonSamples = [];
  for (const progress of [.2,.45,.7,.92]) {
    await evaluate("window.scrollTo({top:document.getElementById('home').offsetHeight*"+progress+",behavior:'instant'})");
    await settleScene();
    horizonSamples.push(await evaluate("(()=>{const hero=document.getElementById('home').getBoundingClientRect(),near=document.querySelector('.near-hills').getBoundingClientRect(),city=document.querySelector('.settlement').getBoundingClientRect();return {gap:near.top-hero.top,height:hero.height,city:city.top-hero.top}})()"));
    await screenshot("horizon-"+Math.round(progress*100)+".png");
  }
  check(horizonSamples.every(sample=>sample.gap>=-.01 && sample.gap<sample.height*.035 && Math.abs(sample.city)<.01), "the city cannot overtake its supporting hills at any tested scroll depth");
  await evaluate("window.scrollTo({top:260,behavior:'instant'})");
  await settleScene();
  const reverseSample = await evaluate("new Promise(resolve=>{window.scrollTo({top:120,behavior:'instant'});const samples=[];function sample(){samples.push(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.mountains')).transform).m42+scrollY);if(samples.length<12)requestAnimationFrame(sample);else resolve(samples)}requestAnimationFrame(()=>requestAnimationFrame(sample))})");
  await writeFile(".artifacts/motion-samples.json", JSON.stringify({motionSample,reverseSample},null,2));
  check(reverseSample.every((value,index)=>value>=70 && (index===0 || value<=reverseSample[index-1]+.001)) && reverseSample.at(-1)<reverseSample[1], "reversing scroll keeps the stronger depth motion smooth");
  await settleScene();
  await click("#motion-toggle");
  await evaluate("window.scrollTo({top:350,behavior:'instant'})");
  check(await evaluate("document.getElementById('motion-toggle').getAttribute('aria-pressed')==='true' && [...document.querySelectorAll('[data-depth]')].every(layer=>!layer.style.transform)"), "pause motion stops and resets every layer");
  await click("#motion-toggle");
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await waitFor("document.getElementById('motion-toggle').getAttribute('aria-pressed')==='true'");
  check(await evaluate("[...document.querySelectorAll('[data-depth]')].every(layer=>!layer.style.transform)"), "system reduced motion disables parallax");
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await waitFor("document.getElementById('motion-toggle').getAttribute('aria-pressed')==='false'");
  await evaluate("window.scrollTo({top:0,behavior:'instant'})");
  await waitFor("new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.mountains')).transform).m42===0");
  await screenshot("desktop.png", true);
  await screenshot("landscape.png");
  await evaluate("document.getElementById('featured').scrollIntoView({block:'start',behavior:'instant'})");
  await settleScene();
  await screenshot("countdown.png");
  await evaluate("window.scrollTo({top:document.getElementById('home').offsetHeight+80,behavior:'instant'})");
  await waitFor("!document.getElementById('home').classList.contains('scene-visible')");
  check(await evaluate("getComputedStyle(document.querySelector('.landscape')).visibility==='hidden' && getComputedStyle(document.querySelector('.mountains')).willChange==='auto'"), "offscreen artwork releases compositor hints and stops rendering");
  await evaluate("window.scrollTo({top:0,behavior:'instant'})");
  await waitFor("document.getElementById('home').classList.contains('scene-visible') && new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.mountains')).transform).m42===0");
  const seconds = await evaluate("document.getElementById('count-seconds').textContent");
  await delay(1100);
  check(await evaluate("document.getElementById('count-seconds').textContent!==" + JSON.stringify(seconds)), "countdown updates without rebuilding cards");
  await click('[data-status="all"]');
  await click("#load-more");
  check(await evaluate("document.querySelectorAll('.festival-card').length===12"), "more celebrations reveals the next six cards");
  await search("World Pneumonia");
  check(await evaluate("document.querySelectorAll('.festival-card').length===1 && document.querySelector('.card-title').textContent==='Tihar Holiday'"), "search finds a secondary observance");
  await search("<script>no-match</script>");
  check(await evaluate("!document.getElementById('empty-state').hidden"), "empty search state appears safely");
  await click("#reset-filters");
  await click('[data-month="Kartik"]');
  check(await evaluate("document.querySelectorAll('.festival-card').length===2"), "Nepali month filter selects Kartik dates");
  await click('[data-status="past"]');
  check(await evaluate("document.querySelector('.card-title').textContent==='Bhai Tika'"), "past festivals sort from most recent");
  await click("#nav-past");
  check(await evaluate("document.querySelector('[data-status=past]').getAttribute('aria-pressed')==='true' && document.querySelector('.card-title').textContent==='Bhai Tika'"), "header past link opens recent completed festivals");
  await click("#nav-festivals");
  check(await evaluate("document.querySelector('[data-status=upcoming]').getAttribute('aria-pressed')==='true'"), "header upcoming link resets festival filters");
  await click("#nav-calendar");
  check(await evaluate("!document.getElementById('calendar-panel').hidden && document.querySelectorAll('.calendar-event').length>0"), "navigation opens an interactive calendar");
  await click("#next-month");
  check(await evaluate("document.getElementById('calendar-month').textContent==='December 2026'"), "calendar month navigation works");
  await click('[data-status="all"]');
  await search("Chhath");
  check(await evaluate("document.getElementById('calendar-month').textContent==='November 2026' && document.querySelectorAll('.calendar-event').length===1"), "calendar follows the selected search result");
  await click(".calendar-event");
  check(await evaluate("document.getElementById('festival-dialog').open && document.getElementById('dialog-title').textContent==='Chhath Parva'"), "festival details open from a calendar date");
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await waitFor("!document.getElementById('festival-dialog').open");
  check(await evaluate("!document.getElementById('festival-dialog').open"), "details support keyboard dismissal");
  await click("#featured-save");
  await click("#export-calendar");
  await delay(500);
  const { readdir } = await import("node:fs/promises");
  const exports = await readdir(".artifacts/downloads");
  check(exports.filter(file=>file.endsWith(".ics")).length>=2, "single-date and full calendar downloads work");
  const full = await readFile(path.join(".artifacts/downloads", exports.find(file=>file.startsWith("utsav-nepali-festivals"))), "utf8");
  check((full.match(/BEGIN:VEVENT/g)||[]).length===44, "downloaded calendar contains 44 events");
  await click("#grid-view-button");
  await click("#reset-filters");
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("window.scrollTo({top:0,behavior:'instant'})");
  check(await evaluate("document.documentElement.scrollWidth<=innerWidth"), "390px mobile layout has no overflow");
  check(await evaluate("(()=>{const range=document.createRange();range.selectNodeContents(document.getElementById('landscape-title'));const r=range.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth})()"), "the landscape title is fully visible on mobile");
  check(await evaluate("document.getElementById('totalVisits').getBoundingClientRect().height>0 && getComputedStyle(document.querySelector('.overview-total-visits')).display!=='none'"), "main total visits remains visible on mobile");
  await evaluate("document.getElementById('toast').hidden=true");
  check(await evaluate("getComputedStyle(document.querySelector('.mobile-city')).display!=='none' && getComputedStyle(document.querySelector('.city')).display==='none'"), "mobile uses a composed temple and stupa landscape");
  await screenshot("mobile.png", true);
  await evaluate("window.scrollTo({top:180,behavior:'instant'})");
  await settleScene();
  check(await evaluate("(()=>{const hero=document.getElementById('home').getBoundingClientRect(),ground=document.querySelector('.settlement').getBoundingClientRect();return Math.abs(ground.top-hero.top)<.01 && Math.abs(ground.bottom-hero.bottom)<.01 && getComputedStyle(document.querySelector('.mobile-city')).transform==='none' && getComputedStyle(document.querySelector('.mobile-foreground')).transform==='none'})()"), "mobile temples and foreground remain grounded during scrolling");
  await screenshot("mobile-parallax-scroll.png");
  await evaluate("window.scrollTo({top:0,behavior:'instant'})");
  await waitFor("new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.mountains')).transform).m42===0");
  await evaluate("window.originalNow=Date.now;Date.now=()=>Date.parse('2026-11-25T06:15:00Z');renderFeatured();updateCountdown()");
  check(await evaluate("document.getElementById('featured-name').textContent==='International Day of Persons with Disabilities' && document.querySelector('.countdown-side').getBoundingClientRect().bottom<=document.getElementById('featured').getBoundingClientRect().bottom && document.documentElement.scrollWidth<=innerWidth"), "long upcoming festival titles fit above the mobile countdown");
  await evaluate("Date.now=window.originalNow;renderFeatured();updateCountdown()");
  await command("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  check(await evaluate("document.documentElement.scrollWidth<=innerWidth && document.getElementById('featured').getBoundingClientRect().top>=document.getElementById('home').getBoundingClientRect().bottom && getComputedStyle(document.querySelector('.featured-copy')).position==='static'"), "short laptop viewport keeps the festival below the landscape");
  await screenshot("laptop.png");
  await command("Emulation.setDeviceMetricsOverride", { width: 320, height: 760, deviceScaleFactor: 1, mobile: true });
  check(await evaluate("document.documentElement.scrollWidth<=innerWidth"), "320px mobile layout has no overflow");
  check(await evaluate("(()=>{const range=document.createRange();range.selectNodeContents(document.getElementById('landscape-title'));const r=range.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth})()"), "the landscape title fits the smallest supported screen");
  await command("Network.setBlockedURLs", { urls: ["*nepali_holidays.csv*", "*calendar-2083.csv*", "*googletagmanager.com/*", "*gstatic.com/firebasejs/*", "*api.ipify.org/*"] });
  await command("Page.reload", { ignoreCache: true });
  await waitFor("document.querySelectorAll('.festival-card').length===6 && !document.getElementById('data-note').hidden");
  check(await evaluate("document.getElementById('total-festivals').textContent==='44'"), "offline snapshot works when the CSV is unavailable");
  await command("Page.removeScriptToEvaluateOnNewDocument", {identifier:fixtureScript.identifier});
  await command("Network.setBlockedURLs", {urls:["*googletagmanager.com/*","*google-analytics.com/*","*gstatic.com/firebasejs/*","*api.ipify.org/*","*firestore.googleapis.com/*"]});
  await command("Page.reload", {ignoreCache:true});
  const liveMetadata=JSON.parse(await readFile("festival-meta.json","utf8"));
  await waitFor("document.getElementById('total-festivals')?.textContent==='"+liveMetadata.recordCount+"' && document.getElementById('calendar-source')?.hidden===false && !calendarLoading");
  check(await evaluate("document.getElementById('calendar-source').textContent.includes('"+liveMetadata.source+"') && document.getElementById('calendar-source').textContent.includes('Calendar checked')"), "the production calendar displays its checked source and current record count");
  check(await evaluate("(()=>{const previous=festivalMeta;try{festivalMeta={...previous,source:'Nepali Patro',retainedRecordCount:45};updateOverview();const note=document.getElementById('calendar-source');return note.textContent.includes('Nepali Patro') && note.textContent.includes('Includes saved festival entries') && note.querySelector('a').href==='https://nepalipatro.com.np/en/government-holiday';}finally{festivalMeta=previous;updateOverview();}})()"), "the fallback source and retained festival entries are labelled accurately");
  await click("#about-calendar");
  check(await evaluate("document.getElementById('dialog-content').textContent.includes('"+liveMetadata.calendarYear+" BS')"), "the calendar explanation derives its year from the published data");
  await click("#close-dialog");
  check(await evaluate("(async()=>{const original=window.fetch,count=document.getElementById('total-festivals').textContent;try{window.fetch=(input,options)=>String(input).includes('nepali_holidays.csv')?Promise.resolve(new Response('Date,Event\\nnot-a-date,incomplete')):original(input,options);await loadFestivalsFromCsv();return document.getElementById('total-festivals').textContent===count && !document.getElementById('data-note').hidden;}finally{window.fetch=original;}})()"), "a malformed live refresh preserves the previously loaded calendar");
  check(exceptions.length===0, "no uncaught JavaScript errors");
  console.log(checks + " browser checks passed. Screenshots: .artifacts/desktop.png and .artifacts/mobile.png");
} finally {
  if (ws?.readyState === WebSocket.OPEN) {
    try { await command("Browser.close"); } catch {}
    ws.close();
  }
  child.kill();
  for (const request of pending.values()) clearTimeout(request.timer);
  await delay(500);
  // Only the unique, verified profile under the OS temporary directory is removed.
  if (path.dirname(profile) === tempRoot && path.basename(profile).startsWith("utsav-browser-")) {
    await rm(profile, { recursive: true, force: true, maxRetries: 6, retryDelay: 150 }).catch(() => {});
  }
}
