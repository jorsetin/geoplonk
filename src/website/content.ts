import {WEBSITE_ORIGIN,WEBSITE_REQUEST,WEBSITE_RESPONSE,websiteRequest} from './protocol';
// This script is declared only on the official website. Installation IDs can
// differ for unpacked builds, so the site never guesses or hardcodes one.
export function installWebsiteBridge(win:Window,send:(message:unknown)=>Promise<unknown>,extensionId:string){
 if(win.location.origin!==WEBSITE_ORIGIN||win.top!==win)return()=>{};
 let launching=false;
 const listener=async(event:MessageEvent)=>{
  if(event.source!==win||event.origin!==WEBSITE_ORIGIN||event.data?.channel!==WEBSITE_REQUEST||typeof event.data?.requestId!=='string'||event.data.requestId.length>100)return;
  const request=websiteRequest(event.data),requestId=event.data.requestId;
  if(request&&request.action!=='STATUS'&&event.data.extensionId!==extensionId)return;
  const reply=(result:unknown)=>win.postMessage({channel:WEBSITE_RESPONSE,requestId,result,extensionId},WEBSITE_ORIGIN);
  if(!request){reply({ok:false,error:'Unknown website request.'});return;}
  if(launching&&request.action!=='STATUS'){reply({ok:false,error:'A launch is already in progress.'});return;}
  if(request.action!=='STATUS')launching=true;
  try{reply(await send({type:'WEBSITE_BRIDGE',...request}));}
  catch{reply({ok:false,error:'Reload the extension and this page to reconnect.'});}
  finally{if(request.action!=='STATUS')launching=false;}
 };
 win.addEventListener('message',listener);
 return()=>win.removeEventListener('message',listener);
}
if(typeof chrome!=='undefined'&&chrome.runtime?.id)installWebsiteBridge(window,message=>chrome.runtime.sendMessage(message),chrome.runtime.id);
