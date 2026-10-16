import {websiteRequest,websiteSender,type WebsiteRequest} from '../website/protocol';
import {destinations} from '../explorer/destinations';
import {gameState} from './game';
import {readSettings,SETTINGS_KEY} from '../shared/settings';
type Actions={start:(request:WebsiteRequest)=>Promise<unknown>;resume:()=>Promise<unknown>;explore:()=>Promise<unknown>;openGame:()=>Promise<unknown>};
export async function handleWebsite(message:unknown,sender:chrome.runtime.MessageSender,actions:Actions){
 if(!websiteSender(sender))throw Error('Website is not connected.');
 const request=websiteRequest(message);if(!request)throw Error('Unknown website request.');
 const state=await gameState();
 if(request.action==='STATUS')return {ok:true,version:chrome.runtime.getManifest().version,hasSavedGame:!!state.game&&state.game.phase!=='complete',locationCount:destinations.length};
 if(request.action==='OPEN_GAME')return actions.openGame();
 if(request.action==='OPEN_EXPLORER')return actions.explore();
 if(request.action==='RESUME_SINGLEPLAYER'){
  if(!state.game||state.game.phase==='complete')throw Error('There is no saved game to resume.');
  return state.game.phase==='result'?actions.openGame():actions.resume();
 }
 if(state.game&&state.game.phase!=='complete')throw Error('A saved game is in progress. Resume it or manage it before starting another.');
 const before=await readSettings();
 const settings={...before,disableMoving:request.mode!=='move',disablePanning:request.mode==='nmpz',disableZooming:request.mode==='nmpz'};
 await chrome.storage.local.set({[SETTINGS_KEY]:settings});
 try{return await actions.start(request);}catch(error){await chrome.storage.local.set({[SETTINGS_KEY]:before});throw error;}
}
