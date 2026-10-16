import { startingPointFromUrl, panoramaUrl } from './destinations';
export type Camera = { url:string; key:string; heading:number; fov:number; documentId?:string };
// Only documented Maps URLs are saved; discard the native URL's other embedded data.
export function cameraFromUrl(value:string):Camera|null {
 const point=startingPointFromUrl(value);if(!point)return null;
 const url=new URL(value),camera=url.pathname.match(/,@?([\d.]+)y,([-\d.]+)h,([-\d.]+)t/);
 const heading=Number(camera?.[2]??url.searchParams.get('heading')??0);
 const pitch=camera?90-Number(camera[3]):Number(url.searchParams.get('pitch')??0);
 const fov=Number(camera?.[1]??url.searchParams.get('fov')??90);
 const pano=url.searchParams.get('pano')??url.pathname.match(/!1s([^!]+)/)?.[1];
 const clean=new URL(panoramaUrl({id:'position',name:'',...point,...(pano?{pano}: {})}));
 clean.searchParams.set('heading',String(Number.isFinite(heading)?heading:0));clean.searchParams.set('pitch',String(Math.max(-90,Math.min(90,Number.isFinite(pitch)?pitch:0))));
 const boundedFov=Math.max(10,Math.min(100,Number.isFinite(fov)?fov:90));
 clean.searchParams.set('fov',String(boundedFov));
 return {url:clean.href,key:pano??`${point.lat.toFixed(6)},${point.lng.toFixed(6)}`,heading:((heading%360)+360)%360,fov:boundedFov};
}
// The trail belongs to the round, independently of Maps' native browser history.
export type Trail={round:string;history:Camera[];undoFrom?:Camera;pending?:string;sourceDocument?:string;retiredDocuments?:string[]};
export function observeCamera(trail:Trail,camera:Camera):Trail {
 if(camera.documentId&&trail.retiredDocuments?.includes(camera.documentId))return trail;
 // A URL update in the departing document is not confirmation that Maps loaded
 // the requested scene. Wait for the target in the replacement document.
 if(trail.pending&&(camera.key!==trail.pending||(trail.sourceDocument&&camera.documentId===trail.sourceDocument)))return trail;
 const retiredDocuments=[...(trail.retiredDocuments??[])];
 const previousDocument=trail.sourceDocument??trail.history.at(-1)?.documentId;
 if(previousDocument&&camera.documentId&&previousDocument!==camera.documentId&&!retiredDocuments.includes(previousDocument))retiredDocuments.push(previousDocument);
 const history=[...trail.history];
 if(history.at(-1)?.key===camera.key)history[history.length-1]=camera;
 else history.push(camera);
 return {round:trail.round,history:history.slice(-100),...(retiredDocuments.length?{retiredDocuments:retiredDocuments.slice(-100)}:{})};
}
