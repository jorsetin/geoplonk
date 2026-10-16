import {cameraFromUrl} from '../explorer/navigation';
import {findStreetView} from './dom';
export function nativeHeading(doc:Document):number|null {
 const needle=doc.querySelector<HTMLElement>('[jsaction="compass.needle"]');if(!needle)return null;
 // The visible native compass rotates opposite to the camera heading.
 const rotation=needle.style.transform.match(/rotate\(\s*(-?[\d.]+)deg\s*\)/);
 const angle=rotation?-Number(rotation[1]):needle.hasAttribute('aria-valuenow')?360-Number(needle.getAttribute('aria-valuenow')):NaN;
 return Number.isFinite(angle)?((angle%360)+360)%360:null;
}
export function cameraSnapshot(doc:Document):string {
 const camera=cameraFromUrl(doc.URL);if(!camera)return doc.URL;
 const url=new URL(camera.url),heading=nativeHeading(doc);if(heading!==null)url.searchParams.set('heading',String(heading));return url.href;
}
export async function nativeCameraAction(doc:Document,action:'north'|'zoomIn'|'zoomOut'):Promise<void> {
 if(action==='north'){await faceNorth(doc);return;}
 const target=panoramaSurface(doc);
 if(!target)throw Error('Street View is still loading.');
 const rect=target.getBoundingClientRect();
 target.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,composed:true,deltaMode:0,deltaY:action==='zoomIn'?-20:20,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2}));
 // URL updates lag the renderer: lack of a URL change is not a failed wheel event.
 // Never navigate or replay the wheel against a new page.
}
export function bearingLabel(heading:number):string {
 const normal=((heading%360)+360)%360;
 return `${['N','NE','E','SE','S','SW','W','NW'][Math.round(normal/45)%8]} · ${Math.round(normal)%360}°`;
}

function clickAtCentre(element:HTMLElement){
 const rect=element.getBoundingClientRect(),init={bubbles:true,cancelable:true,composed:true,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,button:0};
 element.dispatchEvent(new MouseEvent('mousedown',{...init,buttons:1}));
 element.dispatchEvent(new MouseEvent('mouseup',{...init,buttons:0}));
 element.dispatchEvent(new MouseEvent('click',{...init,buttons:0,detail:1}));
}
const signed=(value:number)=>((value+540)%360)-180;
function waitForHeading(doc:Document,predicate:(heading:number)=>boolean,timeout:number):Promise<boolean>{
 return new Promise(resolve=>{
  const needle=doc.querySelector('[jsaction="compass.needle"]');
  const finish=(answer:boolean)=>{observer.disconnect();clearTimeout(timer);resolve(answer);};
  const check=()=>{const heading=nativeHeading(doc);if(heading!==null&&predicate(heading))finish(true);};
  const observer=new MutationObserver(check),timer=setTimeout(()=>finish(false),timeout);
  observer.observe(doc,{subtree:true,childList:true,attributes:true,attributeFilter:['style','aria-valuenow']});check();
 });
}
async function faceNorth(doc:Document):Promise<void>{
 await waitForHeading(doc,()=>true,1800);
 const needle=doc.querySelector<HTMLElement>('[jsaction="compass.needle"]');
 if(!needle||nativeHeading(doc)===null)throw Error('Compass unavailable for this panorama.');
 if(Math.abs(signed(nativeHeading(doc)!))<1)return;
 clickAtCentre(needle);
 // Native reset animates; an early timeout used to cause an unnecessary page reload.
 if(await waitForHeading(doc,h=>Math.abs(signed(h))<1,1200))return;
 const target=panoramaSurface(doc);
 if(!target)throw Error('North reset unavailable for this panorama.');
 const rect=target.getBoundingClientRect();if(rect.width<10||rect.height<10)throw Error('North reset unavailable for this panorama.');
 // Standard mouse drags with live compass feedback; no renderer/private Maps APIs.
 let slope=-90/rect.width;
 for(let attempt=0;attempt<8;attempt++){
  const before=nativeHeading(doc);if(before===null)break;
  if(Math.abs(signed(before))<1)return;
  const dx=Math.max(-rect.width*.35,Math.min(rect.width*.35,-signed(before)/slope));
  const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  const send=(type:string,offset:number,buttons:number)=>target.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,composed:true,clientX:x+offset,clientY:y,button:0,buttons}));
  send('mousedown',0,1);send('mousemove',dx/2,1);send('mousemove',dx,1);send('mouseup',dx,0);
  if(!await waitForHeading(doc,h=>Math.abs(signed(h-before))>.05,180))break;
  const after=nativeHeading(doc);if(after!==null){const measured=signed(after-before)/dx;if(Math.abs(measured)>.001)slope=measured;}
 }
 if(Math.abs(signed(nativeHeading(doc)??180))>=1)throw Error('North reset unavailable for this panorama.');
}

function panoramaSurface(doc:Document):Element|null {
 const scene=findStreetView(doc);if(!scene)return null;
 // Maps also attaches small/offscreen renderer canvases; those are not the viewport.
 const canvases=[...scene.querySelectorAll('canvas')].map(element=>({element,rect:element.getBoundingClientRect()})).filter(item=>item.rect.width>10&&item.rect.height>10).sort((a,b)=>b.rect.width*b.rect.height-a.rect.width*a.rect.height);
 return canvases[0]?.element??scene;
}
