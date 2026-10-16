import {MOVE_RECORDED_EVENT} from './move-history';
import {nativeCameraAction,nativeHeading,cameraSnapshot} from './panorama-camera';
import {readSettings} from '../shared/settings';
import { createGameLayout } from './game-layout';
import { findStreetView, streetViewUnavailable } from './dom';
export function mountExplorer() {
  const host = document.createElement('div');
  host.id = 'open-map-companion-explorer';
  host.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>:host{font:13px system-ui;color:#183d35}aside{background:#f5f7f0;border:1px solid #d9e2d6;border-radius:12px;padding:10px 14px;box-shadow:0 3px 16px #0003;display:flex;gap:10px;align-items:center}button{font:inherit;background:#183d35;color:white;border:0;border-radius:7px;padding:9px;cursor:pointer}button:disabled{opacity:.5}button:focus-visible{outline:3px solid #b18a36}p{margin:0;max-width:240px}</style><aside class="explorer-bar" aria-label="Random Explorer"><p role="status">Opening Street View…</p><button data-action="NEXT">Next place</button><button data-action="RETRY">Retry</button><button data-action="CLOSE">Close</button></aside>`;
  const status = root.querySelector('p')!;
  const started = Date.now();
  let busy = false;
  let layout: ReturnType<typeof createGameLayout> | null = null;
  let lastReady = '';
  const documentId=crypto.randomUUID();
  const nativeNavigation=(window as unknown as {navigation?:EventTarget}).navigation;
  const navigationContext=()=>({documentId});
  const onEntryChange=()=>void update();
  let activeRound:{id:string;round:number}|null=null;
  let currentNavigation={heading:0,canUndo:false,loading:false};
  let currentSettings:Awaited<ReturnType<typeof readSettings>>|null=null;
  const compassObserver=new MutationObserver(()=>{if(layout&&currentSettings){const heading=nativeHeading(document);if(heading!==null)layout.controls(currentSettings,{...currentNavigation,heading,compassReady:true});}});
  let watchedNeedle:Element|null=null;
  function cleanup(){window.removeEventListener(MOVE_RECORDED_EVENT,onEntryChange);nativeNavigation?.removeEventListener('currententrychange',onEntryChange);compassObserver.disconnect();layout?.destroy();layout=null;clearInterval(timer);host.remove();}
  const update = async () => {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'EXPLORER_STATUS',url:location.href,sceneReady:!!findStreetView(document)&&!document.querySelector('[aria-label="Loading"]'),...navigationContext() });
      if (!result?.active) { if (Date.now() - started > 5000) { cleanup(); } return; }
      if (!document.documentElement)return;
      if (!host.isConnected) (document.body ?? document.documentElement).append(host);
      const isGame = result.mode === 'game';
      for (const button of root.querySelectorAll<HTMLButtonElement>('[data-action="NEXT"], [data-action="RETRY"]')) button.hidden = isGame;
      host.toggleAttribute('data-game', isGame);
      if (isGame) { activeRound=result.game?{id:result.game.id,round:result.game.round}:null; if(!layout)layout=createGameLayout(root,chrome.runtime.getURL('game.html?embedded=1'),()=>{void chrome.runtime.sendMessage({type:'EXPLORER_CLOSE'});},async action=>{
          const round=activeRound;if(!round)throw Error('No active round.');
          const settings=await readSettings();
          const navigate=async(url=location.href)=>{
            const response=await chrome.runtime.sendMessage({type:'EXPLORER_NAV',action,url,gameId:round.id,round:round.round,...navigationContext()});
            if(!response?.ok)throw Error(response?.error??'Navigation unavailable.');
          };
          if(action==='zoomIn'||action==='zoomOut'||action==='north'){
            if((action==='north'&&settings.disablePanning)||(action!=='north'&&settings.disableZooming))throw Error('This control is disabled.');
            await nativeCameraAction(document,action);
          }else await navigate(cameraSnapshot(document));
        });layout.update(result.game);const needle=document.querySelector('[jsaction="compass.needle"]');if(needle!==watchedNeedle){compassObserver.disconnect();watchedNeedle=needle;if(needle)compassObserver.observe(needle,{attributes:true,attributeFilter:['style','aria-valuenow']});}currentSettings=await readSettings();currentNavigation={...result.navigation,heading:result.navigation?.heading??0,canUndo:result.navigation?.canUndo??false,loading:result.navigation?.loading||!findStreetView(document)};layout.controls(currentSettings,{...currentNavigation,heading:nativeHeading(document)??currentNavigation.heading,compassReady:nativeHeading(document)!==null});document.getElementById('open-map-companion-initial-reveal')?.remove(); }
      else {layout?.destroy();layout=null;}
      const unavailable = streetViewUnavailable(document);
      if (isGame && result.game?.phase === 'loading') {
        const ready = !!findStreetView(document) && !unavailable && !document.querySelector('[aria-label="Loading"]');
        const key = `${result.game.id}:${result.game.round}:${ready}`;
        if (key !== lastReady) {
          const response = await chrome.runtime.sendMessage({ type: 'GAME_READY', gameId: result.game.id, round: result.game.round, ready });
          if (response?.ok) lastReady = key;
        }
      }
      if (isGame) { if (!busy) status.textContent = result.game ? `Guess Mode · Round ${result.game.round + 1} / ${result.game.roundCount}` : 'Guess Mode'; return; }
      if (!busy) status.textContent = unavailable ? 'No imagery available. Retry or choose Next place.' : findStreetView(document) ? 'Random Explorer' : Date.now() - started > 20000 ? 'Street View unavailable? Retry, skip, or finish Google’s consent screen.' : 'Opening Street View…';
    } catch { cleanup(); }
  };
  root.querySelectorAll('button').forEach(button => button.addEventListener('click', async () => {
    busy = true;
    root.querySelectorAll('button').forEach(item => { item.disabled = true; });
    try {
      const result = await chrome.runtime.sendMessage({ type: `EXPLORER_${button.dataset.action}` });
      if (!result?.ok) status.textContent = result?.error ?? 'Could not navigate. Try again.';
    } catch { status.textContent = 'Connection lost. Reload the extension.'; }
    finally { busy = false; root.querySelectorAll('button').forEach(item => { item.disabled = false; }); }
  }));
  const timer = setInterval(() => void update(), 500);
  nativeNavigation?.addEventListener('currententrychange',onEntryChange);
  window.addEventListener(MOVE_RECORDED_EVENT,onEntryChange);
  void update();
  window.addEventListener('pagehide', cleanup, { once: true });
}
