import {handleWebsite} from './website';
import {websiteSender} from '../website/protocol';
import {cameraFromUrl,observeCamera,type Trail} from '../explorer/navigation';
import {readSettings} from '../shared/settings';
import { distanceKm, gameView } from '../game/model';
import { gameState, handleGame } from './game';
import { destinations, pickDestination, panoramaUrl, startingPointFromUrl } from '../explorer/destinations';
const KEY = 'explorer.session.v1';
type Session = { windowId: number; tabId: number; destinationId: string; mode?: 'explorer' | 'game' };
let queue: Promise<unknown> = Promise.resolve();
async function owned(): Promise<Session | null> {
  const stored = (await chrome.storage.session.get(KEY))[KEY] as Session | undefined;
  if (!stored || !Number.isInteger(stored.windowId) || !Number.isInteger(stored.tabId)) return null;
  try {
    const window = await chrome.windows.get(stored.windowId);
    const tab = await chrome.tabs.get(stored.tabId);
    if (window.type === 'popup' && tab.windowId === window.id) return stored;
  } catch { /* Closed window or tab; forget only our session. */ }
  await chrome.storage.session.remove([KEY,'game.navigation.v1']);
  return null;
}
async function handle(type: string, sender: chrome.runtime.MessageSender, message:Record<string,unknown>={}) {
  const session = await owned();
  const actionPage = !sender.tab && sender.url === chrome.runtime.getURL('popup.html');
  const explorerPage = !!session && sender.tab?.id === session.tabId && sender.tab?.windowId === session.windowId;
  if (!actionPage && !explorerPage && !(type==='EXPLORER_START'&&websiteSender(sender))) return { ok: false, error: 'Explorer is not connected.' };
  if(type==='EXPLORER_NAV') {
    if(!session||session.mode!=='game')throw Error('No active game window.');
    const game=(await gameState()).game;if(game?.phase!=='exploring')throw Error('Wait for the round to start.');
    if(message.gameId!==game.id||message.round!==game.round)throw Error('This round has changed.');
    const settings=await readSettings();
    const action=message.action;
    if(['north','zoomIn','zoomOut'].includes(String(action)))throw Error('Camera controls operate inside the panorama.');
    if(settings.disableMoving)throw Error('Movement is disabled.');
    let trail=(await chrome.storage.session.get('game.navigation.v1'))['game.navigation.v1'] as Trail|undefined;
    if(!trail||trail.round!==`${game.id}:${game.round}`)throw Error('Navigation is still loading.');
    if(typeof message.documentId==='string'&&trail.retiredDocuments?.includes(message.documentId))throw Error('This view has changed.');
    if(trail.pending)throw Error('Wait for the previous navigation to finish.');
    const latest=cameraFromUrl(typeof message.url==='string'?message.url:sender.url??'');if(latest){if(typeof message.documentId==='string')latest.documentId=message.documentId;trail=observeCamera(trail,latest);}
    
    const rollback=structuredClone(trail);
    let target:string|undefined;
    if(action==='undo'&&trail.history.length>1){
      trail.undoFrom=trail.history.pop()!;
      const previous=trail.history.at(-1)!;target=previous.url;trail.pending=previous.key;
      trail.sourceDocument=trail.undoFrom.documentId;
    }
    if(action==='start'){target=panoramaUrl(game.targets[game.round]);trail.sourceDocument=trail.history.at(-1)?.documentId;trail.history=[];trail.pending=cameraFromUrl(target)?.key;}
    if(!target)throw Error('That navigation action is not available yet.');
    await chrome.storage.session.set({'game.navigation.v1':trail});
    try{await chrome.tabs.update(session.tabId,{url:target});}catch(error){await chrome.storage.session.set({'game.navigation.v1':rollback});throw error;}
    return {ok:true};
  }
  if (type === 'EXPLORER_STATUS') {
    const game=session?.mode==='game'?(await gameState()).game:null;
    let navigation={heading:0,canUndo:false,loading:false};
    if(game?.phase==='exploring'&&explorerPage){
      const camera=cameraFromUrl(typeof message.url==='string'?message.url:sender.url??'');
      if(camera&&typeof message.documentId==='string'){if(typeof message.documentId==='string')camera.documentId=message.documentId;const key=`${game.id}:${game.round}`,saved=(await chrome.storage.session.get('game.navigation.v1'))['game.navigation.v1'] as Trail|undefined;
        const before=saved?.round===key?saved:{round:key,history:[]};
        const trail=message.sceneReady===false?before:observeCamera(before,camera);
        if(JSON.stringify(saved)!==JSON.stringify(trail))await chrome.storage.session.set({'game.navigation.v1':trail});
        navigation={heading:camera.heading,canUndo:!trail.pending&&trail.history.length>1,loading:!!trail.pending};
      }
    }
    return {ok:true,active:!!session,mode:session?.mode??'explorer',game:gameView(game),navigation};
  }
  if(session?.mode==='game' && type !== 'EXPLORER_CLOSE'){const current=(await gameState()).game;if(current&&current.phase!=='complete')throw Error('Finish or abandon the game before exploring.');}
  if (type === 'EXPLORER_CLOSE') {
    if (session) await chrome.windows.remove(session.windowId);
    await chrome.storage.session.remove([KEY,'game.navigation.v1']);
    return { ok: true };
  }
  if (type !== 'EXPLORER_START' && type !== 'EXPLORER_NEXT' && type !== 'EXPLORER_RETRY') return { ok: false };
  const destination = type === 'EXPLORER_RETRY' && session
    ? destinations.find(item => item.id === session.destinationId) ?? pickDestination()
    : pickDestination(session?.destinationId);
  const url = panoramaUrl({...destination,heading:Math.floor(Math.random()*360)});
  if (session) {
    await chrome.tabs.update(session.tabId, { url });
    await chrome.windows.update(session.windowId, { focused: true });
    await chrome.storage.session.set({ [KEY]: { ...session, destinationId: destination.id, mode: 'explorer' } });
  } else {
    const window = await chrome.windows.create({ type: 'popup', url, width: 1200, height: 800, focused: true });
    const tabId = window.tabs?.[0]?.id;
    if (window.id === undefined || tabId === undefined) throw new Error('Could not create the explorer window.');
    await chrome.storage.session.set({ [KEY]: { windowId: window.id, tabId, destinationId: destination.id, mode: 'explorer' } });
  }
  return { ok: true, active: true };
}
async function launchGame(destinationId: string) {
  const game=(await gameState()).game;
  const destination=game?.targets[game.round]?.id===destinationId?game.targets[game.round]:destinations.find(item=>item.id===destinationId);
  await chrome.storage.session.remove('game.navigation.v1');
  if(!destination)throw Error('Destination unavailable.');
  const session=await owned();
  if(session){
    await chrome.storage.session.set({[KEY]:{...session,destinationId,mode:'game'}});
    await chrome.tabs.update(session.tabId,{url:panoramaUrl(destination)});
    await chrome.windows.update(session.windowId,{focused:true});
  }else{
    const window=await chrome.windows.create({type:'popup',url:panoramaUrl(destination),width:1200,height:800,focused:true});
    if(window.id===undefined||window.tabs?.[0]?.id===undefined)throw Error('Could not open game window.');
    await chrome.storage.session.set({[KEY]:{windowId:window.id,tabId:window.tabs[0].id,destinationId,mode:'game'}});
  }
}
async function openGamePage(){
  const url=chrome.runtime.getURL('game.html');
  const existing=(await chrome.tabs.query({url})).find(tab=>tab.id!==undefined);
  if(existing?.id!==undefined){await chrome.tabs.update(existing.id,{active:true});if(existing.windowId!==undefined)await chrome.windows.update(existing.windowId,{focused:true});}
  else await chrome.tabs.create({url});
  return {ok:true};
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if(typeof message?.type!=='string'||! /^(WEBSITE_BRIDGE|EXPLORER_(START|NEXT|RETRY|CLOSE|STATUS|NAV)|GAME_(STATUS|START|RESUME|ABANDON|READY|BEGIN|GUESS|SUBMIT|SKIP|NEXT|CLEAR_STATS))$/.test(message.type))return;
  queue=queue.then(async()=>{
    if(message.type==='WEBSITE_BRIDGE')return handleWebsite(message,sender,{
      start:request=>handleGame({type:'GAME_START',rounds:request.rounds,duration:request.duration},launchGame,async()=>{}),
      resume:async()=>{
        const result=await handleGame({type:'GAME_RESUME'},launchGame,async()=>{});
        const current=(await gameState()).game;
        return current&&(current.phase==='result'||current.phase==='complete')?openGamePage():result;
      },
      explore:()=>handle('EXPLORER_START',sender),
      openGame:openGamePage
    });
    if(message.type.startsWith('EXPLORER_'))return handle(message.type,sender,message);
    const session=await owned();
    const extensionPage=sender.url?.split('?')[0]===chrome.runtime.getURL('game.html');
    const ownedPage=session?.mode==='game'&&sender.tab?.id===session.tabId&&sender.tab?.windowId===session.windowId;
    if(message.type==='GAME_READY'?!ownedPage:!extensionPage)throw Error('Game is not connected.');
    if(message.type==='GAME_READY' && message.ready===true && sender.url) {
      const current=(await gameState()).game;
      const position=startingPointFromUrl(sender.url);
      if(!current || !position || distanceKm(position,current.targets[current.round])>0.2) message={...message,ready:false};
    }
    const result=await handleGame(message,launchGame,async()=>{if(session)await chrome.windows.update(session.windowId,{focused:true});});
    if(['GAME_SUBMIT','GAME_SKIP'].includes(message.type)||(message.type==='GAME_STATUS'&&'game' in result&&(result.game?.phase==='result'||result.game?.phase==='complete')))await chrome.storage.session.remove('game.navigation.v1');
    if(message.type==='GAME_ABANDON' && session?.mode==='game') {
      try { await chrome.windows.remove(session.windowId); } catch { /* Already closed. */ }
      await chrome.storage.session.remove([KEY,'game.navigation.v1']);
    }
    return result;
  }).then(respond,error=>respond({ok:false,error:error instanceof Error?error.message:'Could not open Street View. Try again.'}));
  return true;
});
chrome.windows.onRemoved.addListener(windowId => {
  queue = queue.then(async () => {
    const stored = (await chrome.storage.session.get(KEY))[KEY];
    if (stored?.windowId === windowId) await chrome.storage.session.remove([KEY,'game.navigation.v1']);
  }).catch(() => {});
});
