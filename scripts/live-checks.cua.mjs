/** Repeatable live Chrome checks through the documented cua_repl API.
 * Import this module in cua_repl; pass the existing Maps tab and Chrome app.
 * No Maps internals, API requests, imagery reads or browser debugging ports.
 * Always call restore() in a finally block. Each stage is independently callable.
 */
const labels = {
 enabled:'Clean View', disableMoving:'Disable movement', disablePanning:'Disable panning', disableZooming:'Disable zooming',
 hideStreetViewUi:'Hide Street View interface', hideStreetViewPanels:'Hide Street View information panels',
 hideRoadLabels:'Hide road names', hidePlaceMarkers:'Hide place bubbles', hideSearch:'Hide search controls', hideCategories:'Hide category shortcuts'
};
const index = line => Number(line.match(/^\s*(\d+)/)?.[1]);
function row(state, predicate) { const found=state.split('\n').find(predicate); if(!found) throw new Error('Expected browser control is unavailable'); return found; }
export function parseView(url) {
 const match=url.match(/@([-\d.]+),([-\d.]+),[^,]+,([\d.]+)y,([-\d.]+)h,([-\d.]+)t/);
 if(!match) throw new Error('Street View URL does not expose the expected view state');
 return { latitude:+match[1],longitude:+match[2],fov:+match[3],heading:+match[4],pitch:+match[5],pano:url.match(/!1s([^!/?]+)/)?.[1]??null };
}
export function samePosition(a,b) { return a.pano===b.pano && Math.abs(a.latitude-b.latitude)<1e-7 && Math.abs(a.longitude-b.longitude)<1e-7; }
export function sameOrientation(a,b) {const delta=Math.abs(a.heading-b.heading)%360;return Math.min(delta,360-delta)<0.05 && Math.abs(a.pitch-b.pitch)<0.05;}
export async function createLiveChecks(tab, app) {
 const originalUrl=await tab.url();
 const state = () => app.getAXState({disableDiffing:true,emit:false});
 async function menu(destination) {
  let current=await state();
  if (!current.includes('makeKeyAndOrderFront:')) {
   await app.click(index(row(current,l=>/^\s*\d+ Window$/.test(l))));current=await state();
  }
  if (destination==='extensions') {
   await app.click(index(row(current,l=>/Extensions, ID: commandDispatch:/.test(l))));await state();return;
  }
  const windows=current.split('\n').filter(l=>/makeKeyAndOrderFront:/.test(l));
  if(windows.length!==1) throw new Error('Live checks require a single Chrome window');
  await app.click(index(windows[0]));current=await state();
  const title=await tab.title();
  const entry=row(current,l=>/\btab \(/.test(l)&&l.includes(title??'Google Maps'));
  if(!entry.includes('(selected,')) {await app.click(index(entry));await state();}
 }
 async function popup() {
  let current=await state();if(current.includes('HTML content Open Map Companion')) return current;
  await menu('maps'); current=await state();
  await app.click(index(row(current,l=>/pop-up button Open Map Companion/.test(l))));return state();
 }
 async function preferences() {
  const current=await popup();const result={};
  for(const [key,label] of Object.entries(labels)) {const entry=row(current,l=>l.includes('Tick box')&&l.includes(label));result[key]=/Value: 1\b/.test(entry);}
  return result;
 }
 async function set(patch) {
  for(const [key,value] of Object.entries(patch)) {
   const current=await popup();const entry=row(current,l=>l.includes('Tick box')&&l.includes(labels[key]));
   if(/Value: 1\b/.test(entry)!==value) {await app.click(index(entry));await state();}
  }
  await menu('maps');await tab.getAXState({emit:false});
 }
 const original=await preferences();
 const results=[];
 async function view() {
  await tab.getAXState({emit:false});
  // Maps debounces URL updates after gestures. Require three settled DOM-URL samples.
  let previous=null,stable=0,last;
  for(let i=0;i<8;i++) {
   await tab.playwright.waitForTimeout(300);
   last=parseView(await tab.playwright.evaluate(()=>document.URL));
   if(previous&&samePosition(previous,last)&&sameOrientation(previous,last)&&Math.abs(previous.fov-last.fov)<.05) stable++;else stable=0;
   previous=last;
   if(i>=3&&stable>=2) return last;
  }
  throw new Error('Street View did not settle within the bounded check');
 }
 const scene=()=>tab.playwright.getByRole('application',{name:'Street View',exact:true});
 async function drag() {
  const box=await scene().evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
  await tab.drag([box.width*.4,box.height*.55],[box.width*.65,box.height*.55]);await tab.getAXState({emit:false});
 }
 async function click() {
  const box=await scene().evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
  await tab.click([box.width*.5,box.height*.65]);await tab.getAXState({emit:false});
 }
 async function key(name) {await scene().press(name);await tab.getAXState({emit:false});await tab.playwright.waitForTimeout(350);}
 async function check(name,fn) {
  try {const pass=await fn();results.push({name,pass:!!pass});return {name,pass:!!pass};}
  catch(error) {const result={name,pass:false,error:String(error.message)};results.push(result);return result;}
 }
 return {
  results, originalPreferences: original, configure: set,
  async run(stage) {
   if(stage==='baseline') {
    await set({disableMoving:false,disablePanning:false,disableZooming:false});
    const before=await view();await drag();const panned=await view();await key('Equal');const zoomed=await view();await key('ArrowUp');const moved=await view();
    await check('unlocked pan baseline',()=>!sameOrientation(before,panned));
    await check('unlocked zoom baseline',()=>Math.abs(panned.fov-zoomed.fov)>.1);
    return check('unlocked movement baseline',()=>!samePosition(zoomed,moved));
   }
   if(stage==='movement') {
    await set({enabled:false,disableMoving:true,disablePanning:false,disableZooming:false});await tab.reload();await scene().count();
    const before=await view();await click();await key('ArrowUp');const afterClick=await view();await drag();const afterDrag=await view();
    return check('movement lock independent of Clean View',()=>samePosition(before,afterClick)&&samePosition(before,afterDrag)&&!sameOrientation(afterClick,afterDrag));
   }
   if(stage==='panning') {
    await set({disableMoving:false,disablePanning:true,disableZooming:false});
    const before=await view();await drag();const after=await view();await key('ArrowUp');const moved=await view();
    return check('panning lock with movement available',()=>sameOrientation(before,after)&&samePosition(before,after)&&!samePosition(after,moved));
   }
   if(stage==='zoom') {
    await set({disableMoving:false,disablePanning:false,disableZooming:true});
    const before=await view();await key('Equal');const after=await view();
    return check('zoom lock',()=>Math.abs(before.fov-after.fov)<.05);
   }
   if(stage==='combined') {
    await set({disableMoving:true,disablePanning:true,disableZooming:true});
    const before=await view();await drag();await click();await key('ArrowUp');await key('Equal');const after=await view();
    return check('combined locks',()=>samePosition(before,after)&&sameOrientation(before,after)&&Math.abs(before.fov-after.fov)<.05);
   }
   if(stage==='reload') {
    const before=await view();await tab.reload();await scene().count();await click();await drag();await key('ArrowUp');const after=await view();
    return check('locks survive reload',()=>samePosition(before,after)&&sameOrientation(before,after));
   }
   if(stage==='restore') {
    await set({disableMoving:false,disablePanning:false,disableZooming:false});
    const before=await view();await drag();const panned=await view();await key('ArrowUp');const moved=await view();
    return check('locks restore native input',()=>!sameOrientation(before,panned)&&!samePosition(panned,moved));
   }
   throw new Error('Unknown live-check stage');
  },
  async health() {await popup();return tab.playwright.evaluate(()=>{try{return JSON.parse(document.documentElement.getAttribute('data-open-map-companion-health')??'{}');}catch{return {};}});},
  async restore(preferences = original) {
   await set({enabled:true});
   const {enabled,...others}=preferences;await set(others);await set({enabled});await tab.goto(originalUrl);await tab.getAXState({emit:false});
  }
 };
}
