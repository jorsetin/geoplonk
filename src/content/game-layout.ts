import {MAP_FRAME_STATUS} from '../game/frame-status';
import {bearingLabel} from './panorama-camera';
import {defaults,type Settings} from '../shared/settings';
import type { gameView } from '../game/model';
type View=NonNullable<ReturnType<typeof gameView>>;
export const gameLayoutCss = `
:host([data-game]){position:fixed!important;inset:0!important;transform:none!important;pointer-events:none;font-family:system-ui,sans-serif}
:host([data-game]) .explorer-bar{display:none}
.game-ui{display:none}:host([data-game]) .game-ui{display:block}
.brand{position:absolute;top:20px;left:22px;color:white;font-weight:850;font-size:19px;text-shadow:0 2px 8px #0009;letter-spacing:.02em}
.clock{position:absolute;top:22px;left:50%;transform:translateX(-50%);border:3px solid #c9ab68;border-radius:40px;background:#10372fee;color:white;font-size:26px;font-weight:800;padding:10px 24px;min-width:70px;text-align:center;font-variant-numeric:tabular-nums}
.scoreboard{position:absolute;top:16px;right:18px;background:#10372ff0;color:white;border-radius:14px;padding:12px 14px;box-shadow:0 4px 20px #0003;width:330px}
.scoreboard h2{font-size:14px;text-align:center;margin:0 0 10px;color:#eee1bb}.scores{display:grid;overflow-x:auto;grid-template-columns:repeat(5,1fr) 1.2fr;gap:5px}.round-cell{background:#09271f90;border:1px solid #c9af7622;border-radius:8px;text-align:center;padding:8px 2px;font-size:12px}.round-cell.current{border-color:#e3c477;background:#56785d70}.round-cell b{display:block;color:#e8d29e;margin-bottom:7px}.round-cell span{font-variant-numeric:tabular-nums}.round-cell.total{position:sticky;right:0;background:#10372f}.scoreboard[data-many]{width:min(540px,calc(100vw - 36px))}.game-ui[data-many] .clock{top:124px}.round-cell.total b{font-size:10px;letter-spacing:.06em}
.close-game{position:absolute;left:20px;bottom:46px;pointer-events:auto;background:#10372fdd;color:white;border:1px solid #ffffff55;border-radius:50%;width:40px;height:40px;font-size:20px;cursor:pointer;box-sizing:border-box;padding:0;line-height:1;display:grid;place-items:center}.close-game:focus-visible{outline:3px solid #d4b976}
.map-dock{position:absolute;right:18px;bottom:42px;width:min(290px,calc(100vw - 36px));height:205px;pointer-events:auto;border:2px solid #b8a06c99;border-radius:12px;overflow:hidden;background:#10372f;box-shadow:0 5px 24px #0005;transition:width .18s,height .18s}
.map-dock:hover,.map-dock:focus-within,.map-dock[data-result],.map-dock[data-pinned]{width:min(560px,calc(100vw - 36px));height:min(470px,calc(100vh - 180px))}
.map-startup{position:absolute;inset:0;z-index:3;display:grid;place-content:center;gap:12px;padding:20px;text-align:center;color:#f8f3e5;background:#10372f;font-size:14px}.map-startup[hidden]{display:none}.map-startup button{padding:9px 16px;border:1px solid #c9ab68;border-radius:8px;background:#c9ab68;color:#10372f;cursor:pointer}.map-dock iframe{width:100%;height:100%;border:0;display:block}.expand-map{position:absolute;right:8px;top:8px;z-index:2;pointer-events:auto;color:white;background:#10372fe0;border:1px solid #c9af76;border-radius:6px;padding:4px 7px;font-size:12px;cursor:pointer}
.brand,.clock,.scoreboard{z-index:3}.close-game{z-index:6}.map-dock[data-result]{position:fixed;inset:0 0 30px;width:auto;height:auto;border:0;border-radius:0;transition:none;z-index:1}.map-dock[data-result] .expand-map{display:none}.game-ui[data-result] .clock{display:none}.game-ui[data-complete] .scoreboard,.game-ui[data-complete] .brand{display:none}.reveal-veil{display:none;position:fixed;inset:0;background:#102e2966;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);z-index:5;pointer-events:auto;place-items:center;text-align:center;color:#f8f3e5}.game-ui[data-reveal] .reveal-veil{display:grid}.reveal-veil span{font-size:12px;letter-spacing:.25em}.reveal-veil strong{display:block;font-size:90px;font-weight:500;margin-top:16px}.game-ui[data-reveal] .map-dock{visibility:hidden}
.panorama-controls{position:absolute;left:20px;bottom:100px;display:grid;grid-template-columns:44px 44px;gap:10px;justify-items:center;pointer-events:auto;z-index:4}.panorama-controls button{box-sizing:border-box;position:relative;appearance:none;padding:0;margin:0;line-height:1;width:44px;height:44px;border-radius:50%;border:1px solid #ffffff45;background:#10372fd9;color:#f8f3e5;font:26px/1 system-ui;cursor:pointer;display:grid;place-items:center}.panorama-controls button:disabled{opacity:.45;cursor:default}.panorama-controls button[hidden]{display:none}.panorama-controls .compass-control{grid-column:1 / -1;display:grid;justify-items:center;gap:6px;width:98px;margin-bottom:8px}.bearing{font:600 11px/1.2 system-ui;letter-spacing:.04em;color:#fff;text-shadow:0 1px 3px #000}.panorama-controls .compass-button{width:50px;height:50px;background:#f5f1df77;margin-bottom:0}.panorama-controls .compass-button:disabled{opacity:.85}.panorama-controls svg{width:29px;height:29px;fill:none;stroke:currentColor;stroke-width:1.6;transition:transform .15s}.compass-button svg{stroke:none;transition:none}.control-tip{display:none;position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);white-space:nowrap;background:#10372ff5;border:1px solid #c9ab6870;border-radius:7px;padding:7px 10px;font:500 12px/1.3 system-ui;color:#fff;pointer-events:none;z-index:8}.panorama-controls button:hover .control-tip,.panorama-controls button:focus-visible .control-tip,.close-game:hover .control-tip,.close-game:focus-visible .control-tip{display:block}.panorama-controls button:focus-visible{outline:3px solid #e3c477;outline-offset:3px}.control-feedback{position:absolute;left:20px;bottom:430px;color:white;background:#10372fee;border-radius:8px;padding:8px;max-width:260px;z-index:4}.control-feedback:empty{display:none}.game-ui[data-result] .panorama-controls,.game-ui[data-reveal] .panorama-controls{display:none}
@media(max-width:850px){.scoreboard{width:260px}.clock{top:116px;font-size:22px;padding:7px 17px}.brand{font-size:15px;max-width:160px}}@media(prefers-reduced-motion:reduce){.map-dock{transition:none}}
`;
export function createGameLayout(root: ShadowRoot, url: string, close:()=>void, action:(action:string)=>Promise<void>=async()=>{}) {
 const style=document.createElement('style');style.textContent=gameLayoutCss;root.append(style);
 const ui=document.createElement('div');ui.className='game-ui';
 ui.innerHTML='<div class="reveal-veil"><div><span>GET READY</span><strong class="reveal-number">3</strong></div></div><div class="brand">GEOPLONK</div><div class="clock" role="timer" aria-label="Round time">Loading…</div><section class="scoreboard" aria-label="Round scores"><h2>Singleplayer</h2><div class="scores"></div></section><div class="panorama-controls" role="group" aria-label="Street View controls"></div><p class="control-feedback" role="status"></p><button class="close-game" aria-label="Close game window" title="Close game window">×<span class="control-tip" role="tooltip">Close game window</span></button><div class="map-dock" aria-label="Guessing map panel"><button class="expand-map" aria-label="Keep guessing map expanded" aria-pressed="false">⤢</button></div>';
 const dock=ui.querySelector<HTMLDivElement>('.map-dock')!;
 const frame=document.createElement('iframe');frame.title='Guessing map and round controls';
 const startup=document.createElement('div');startup.className='map-startup';
 const startupMessage=document.createElement('span');startupMessage.setAttribute('role','status');
 const retry=document.createElement('button');retry.type='button';retry.textContent='Retry map';startup.append(startupMessage,retry);dock.append(frame,startup);
 const frameUrl=new URL(url,location.href);
 // URL.origin is null for extension URLs in some DOM implementations.
 const frameOrigin=frameUrl.protocol==='chrome-extension:'?`${frameUrl.protocol}//${frameUrl.host}`:frameUrl.origin;
 let frameToken='',startupTimer:ReturnType<typeof setTimeout>;
 function failed(){startup.hidden=false;startupMessage.textContent='The guessing map could not start. Reload the updated extension, then retry.';retry.hidden=false;}
 function loadMap(){
  clearTimeout(startupTimer);frameToken=crypto.randomUUID();frameUrl.searchParams.set('mapToken',frameToken);
  startup.hidden=false;startupMessage.textContent='Loading guessing map…';retry.hidden=true;
  startupTimer=setTimeout(failed,12000);frame.src=frameUrl.href;
 }
 function frameStatus(event:MessageEvent){
  if(event.source!==frame.contentWindow||event.origin!==frameOrigin||event.data?.type!==MAP_FRAME_STATUS||event.data?.token!==frameToken)return;
  if(event.data.status==='ready'){clearTimeout(startupTimer);startup.hidden=true;}
  else if(event.data.status==='error'){clearTimeout(startupTimer);failed();}
 }
 window.addEventListener('message',frameStatus);retry.addEventListener('click',loadMap);loadMap();
 ui.querySelector('.close-game')!.addEventListener('click',close);
 const expand=ui.querySelector<HTMLButtonElement>('.expand-map')!;
 expand.addEventListener('click',()=>{const pinned=dock.toggleAttribute('data-pinned');expand.setAttribute('aria-pressed',String(pinned));expand.setAttribute('aria-label',pinned?'Allow guessing map to collapse':'Keep guessing map expanded');});
 root.append(ui);
 let current:View|null=null;
 function paintClock(){
  const clock=ui.querySelector('.clock')!;
  if(!current){clock.textContent='Ready';return;}
  const pending=current.phase==='countdown'&&Date.now()<(current.revealAt??Infinity);
  ui.toggleAttribute('data-reveal',current.phase==='loading'||pending||!!navigation.loading);
  if(navigation.loading&&current.phase==='exploring'){clock.textContent='Loading…';ui.querySelector('.reveal-veil span')!.textContent='RETURNING TO POSITION';ui.querySelector('.reveal-number')!.textContent='…';return;}
  ui.querySelector('.reveal-veil span')!.textContent='GET READY';
  if(current.phase==='loading'||pending){clock.textContent='Loading…';ui.querySelector('.reveal-number')!.textContent=pending?String(Math.max(1,Math.ceil(((current.revealAt??Date.now())-Date.now())/1000))):'…';return;}
  if(current.phase!=='exploring'&&current.phase!=='countdown'){clock.textContent=current.phase==='complete'?'Finished':'Result';return;}
  const deadline=current.phase==='countdown'?(current.duration?(current.revealAt??Date.now())+current.duration*1000:null):current.deadline;
  if(!deadline){clock.textContent='∞';clock.setAttribute('aria-label','Untimed round');return;}
  const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));clock.textContent=`${Math.floor(left/60).toString().padStart(2,'0')}:${(left%60).toString().padStart(2,'0')}`;clock.setAttribute('aria-label','Round time remaining');
 }

 const toolbar=ui.querySelector<HTMLElement>('.panorama-controls')!;
 const feedback=ui.querySelector<HTMLElement>('.control-feedback')!;
 let controls:Settings={...defaults};
 let navigation:{heading:number;canUndo:boolean;loading?:boolean;compassReady?:boolean}={heading:0,canUndo:false};
 let toolbarMode='';
 let compassAngle:number|null=null;
 let controlBusy=false;
 const icons={
  zoomIn:'<path d="M5 12h14M12 5v14"/>',zoomOut:'<path d="M5 12h14"/>',
  undo:'<path d="m9 4-5 5 5 5M4 9h9a7 7 0 0 1 0 14"/>',
  start:'<path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7"/>'
 };
 function paintControls(){
  const mode=`${controls.disableMoving}/${controls.disablePanning}/${controls.disableZooming}`;
  if(mode!==toolbarMode){
   toolbarMode=mode;toolbar.replaceChildren();
   const button=(name:string,icon:string,command:string,parent:HTMLElement=toolbar)=>{
    const item=document.createElement('button');item.type='button';item.dataset.command=command;item.setAttribute('aria-label',name);
    item.innerHTML=icon;const tip=document.createElement('span');tip.className='control-tip';tip.setAttribute('role','tooltip');tip.textContent=name;item.append(tip);
    item.addEventListener('click',async()=>{if(controlBusy)return;controlBusy=true;paintControls();feedback.textContent='';try{await action(command);}catch(e){feedback.textContent=e instanceof Error?e.message:'Control unavailable.';}finally{controlBusy=false;paintControls();}});parent.append(item);return item;
   };
   const wrapper=document.createElement('div');wrapper.className='compass-control';toolbar.append(wrapper);
   const compass=button('Face north','<svg viewBox="0 0 40 40" aria-hidden="true"><path fill="#d35b50" d="M20 3 28 22 20 18Z"/><path fill="#f8f3e5" d="M20 37 12 18 20 22Z"/></svg>','north',wrapper);compass.className='compass-button';
   const bearing=document.createElement('span');bearing.className='bearing';wrapper.append(bearing);
   const control=(name:string,command:keyof typeof icons)=>button(name,`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[command]}</svg>`,command);
   if(!controls.disableZooming){control('Zoom in','zoomIn');control('Zoom out','zoomOut');}
   if(!controls.disableMoving){control('Undo move','undo');control('Return to start','start');}
  }
  for(const item of toolbar.querySelectorAll<HTMLButtonElement>('button'))item.disabled=controlBusy||current?.phase!=='exploring'||(item.dataset.command==='north'&&(controls.disablePanning||navigation.compassReady===false))||(item.dataset.command==='undo'&&!navigation.canUndo);
  const heading=((navigation.heading%360)+360)%360;
  // Keep angles continuous across north: 359 -> 0 is one degree, not a full spin.
  compassAngle=compassAngle===null?heading:compassAngle+((heading-compassAngle+540)%360+360)%360-180;
  const needle=toolbar.querySelector<SVGElement>('.compass-button svg')!;
  const transform=`rotate(${-compassAngle}deg)`;if(needle.style.transform!==transform)needle.style.transform=transform;
  toolbar.querySelector('.bearing')!.textContent=bearingLabel(navigation.heading);
  const undo=toolbar.querySelector('[data-command=undo] .control-tip');if(undo)undo.textContent=navigation.canUndo?'Undo move':'Undo unavailable for this move';
  toolbar.querySelector('.compass-button .control-tip')!.textContent=controls.disablePanning?`Compass · ${bearingLabel(navigation.heading)} (locked)`:`Face north · ${bearingLabel(navigation.heading)}`;
 }
 const timer=setInterval(paintClock,250);
 return {controls(settings:Settings,position= navigation){controls=settings;navigation=position;paintControls();paintClock();},update(game:View|null){if(game?.id!==current?.id||game?.round!==current?.round){navigation={...navigation,canUndo:false};feedback.textContent='';}current=game;ui.toggleAttribute('data-complete',game?.phase==='complete');ui.toggleAttribute('data-many',(game?.roundCount??5)>5);ui.querySelector('.scoreboard')!.toggleAttribute('data-many',(game?.roundCount??5)>5);paintControls();ui.toggleAttribute('data-reveal',game?.phase==='loading'||game?.phase==='countdown');ui.toggleAttribute('data-result',game?.phase==='result'||game?.phase==='complete');paintClock();dock.toggleAttribute('data-result',game?.phase==='result'||game?.phase==='complete');const scores=ui.querySelector('.scores')!;scores.replaceChildren();scores.setAttribute('style',`grid-template-columns:repeat(${(game?.roundCount??5)+1},minmax(36px,1fr))`);for(let i=0;i<(game?.roundCount??5)+1;i++){const cell=document.createElement('div');cell.className=`round-cell${i===game?.round?' current':''}${i===(game?.roundCount??5)?' total':''}`;const heading=document.createElement('b');heading.textContent=i===(game?.roundCount??5)?'TOTAL':String(i+1);const value=document.createElement('span');value.textContent=i===(game?.roundCount??5)?String(game?.results.reduce((sum,r)=>sum+r.score,0)??0):game?.results[i]?String(game.results[i].score):'—';cell.append(heading,value);scores.append(cell);}},destroy(){clearTimeout(startupTimer);window.removeEventListener('message',frameStatus);clearInterval(timer);ui.remove();style.remove();}};
}
