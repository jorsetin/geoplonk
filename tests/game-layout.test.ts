// @vitest-environment jsdom
import {expect,test,vi} from 'vitest';
import {createGameLayout} from '../src/content/game-layout';
import {gameView,newGame} from '../src/game/model';
test('the blur ends after three seconds even before the next worker status arrives',()=>{
 vi.useFakeTimers();vi.setSystemTime(1000);
 const host=document.createElement('div'),root=host.attachShadow({mode:'open'});
 const layout=createGameLayout(root,'about:blank',()=>{});
 const pool=Array.from({length:5},(_,i)=>({id:String(i),name:String(i),lat:i,lng:i}));
 const game=gameView({...newGame(pool,60,'reveal'),phase:'countdown',sceneReady:true,revealAt:4000})!;
 layout.update(game);expect(root.querySelector('.game-ui')!.hasAttribute('data-reveal')).toBe(true);
 vi.advanceTimersByTime(3000);expect(root.querySelector('.game-ui')!.hasAttribute('data-reveal')).toBe(false);expect(root.querySelector('.clock')!.textContent).toBe('01:00');
 layout.update(game);expect(root.querySelector('.game-ui')!.hasAttribute('data-reveal')).toBe(false);
 layout.destroy();vi.useRealTimers();
});

 test('movement presets expose only their permitted controls and leave NMPZ compass read-only',async()=>{
 const {defaults}=await import('../src/shared/settings');const host=document.createElement('div'),root=host.attachShadow({mode:'open'}),action=vi.fn(async()=>{});
 const layout=createGameLayout(root,'about:blank',()=>{},action);const pool=Array.from({length:5},(_,i)=>({id:String(i),name:String(i),lat:i,lng:i}));layout.update(gameView({...newGame(pool,0,'controls'),phase:'exploring'}));
 layout.controls(defaults,{heading:90,canUndo:true});expect(root.querySelectorAll('.panorama-controls button')).toHaveLength(5);
 (root.querySelector('[aria-label="Undo move"]') as HTMLButtonElement).click();expect(action).toHaveBeenCalledWith('undo');await Promise.resolve();
 layout.controls({...defaults,disableMoving:true});expect(root.querySelectorAll('.panorama-controls button')).toHaveLength(3);expect((root.querySelector('[aria-label="Face north"]') as HTMLButtonElement).disabled).toBe(false);
 layout.controls({...defaults,disableMoving:true,disablePanning:true,disableZooming:true});expect(root.querySelectorAll('.panorama-controls button')).toHaveLength(1);expect((root.querySelector('[aria-label="Face north"]') as HTMLButtonElement).disabled).toBe(true);layout.destroy();
 });

test('controls retain their DOM and tooltips between updates, display bearing and clear undo on round change',()=>{
 const host=document.createElement('div'),root=host.attachShadow({mode:'open'}),layout=createGameLayout(root,'about:blank',()=>{});
 const pool=Array.from({length:5},(_,i)=>({id:String(i),name:String(i),lat:i,lng:i}));const game=gameView({...newGame(pool,0,'stable'),phase:'exploring'})!;
 layout.update(game);layout.controls({enabled:true,hideSearch:true,hideCategories:true,hideStreetViewUi:true,hideStreetViewPanels:true,hideRoadLabels:true,hidePlaceMarkers:true,disableMoving:false,disablePanning:false,disableZooming:false},{heading:127,canUndo:true});
 const undo=root.querySelector<HTMLButtonElement>('[aria-label="Undo move"]')!;expect(undo.disabled).toBe(false);expect(undo.querySelector('[role=tooltip]')?.textContent).toBe('Undo move');expect(root.querySelector('.bearing')?.textContent).toBe('SE · 127°');
 layout.update(game);expect(root.querySelector('[aria-label="Undo move"]')).toBe(undo);layout.update({...game,round:1});expect(undo.disabled).toBe(true);expect(root.textContent).not.toContain('checkpoint');layout.destroy();
});

test('the compass crosses north without replaying a full rotation',async()=>{
 const {defaults}=await import('../src/shared/settings');const host=document.createElement('div'),root=host.attachShadow({mode:'open'}),layout=createGameLayout(root,'about:blank',()=>{});
 layout.controls(defaults,{heading:359,canUndo:false});const needle=root.querySelector<SVGElement>('.compass-button svg')!;expect(needle.style.transform).toBe('rotate(-359deg)');
 layout.controls(defaults,{heading:0,canUndo:false});expect(needle.style.transform).toBe('rotate(-360deg)');
 layout.controls(defaults,{heading:1,canUndo:false});expect(needle.style.transform).toBe('rotate(-361deg)');
 layout.controls(defaults,{heading:359,canUndo:false});expect(needle.style.transform).toBe('rotate(-359deg)');layout.destroy();
});

test('undo loading blurs the scene without starting another round countdown',async()=>{
 const {defaults}=await import('../src/shared/settings');
 const host=document.createElement('div'),root=host.attachShadow({mode:'open'}),layout=createGameLayout(root,'about:blank',()=>{});
 const pool=Array.from({length:5},(_,i)=>({id:String(i),name:String(i),lat:i,lng:i}));const game=gameView({...newGame(pool,0,'undo-loading'),phase:'exploring'})!;
 layout.update(game);layout.controls(defaults,{heading:90,canUndo:false,loading:true});
 expect(root.querySelector('.game-ui')!.hasAttribute('data-reveal')).toBe(true);expect(root.querySelector('.reveal-veil span')!.textContent).toBe('RETURNING TO POSITION');
 layout.controls(defaults,{heading:90,canUndo:true,loading:false});expect(root.querySelector('.game-ui')!.hasAttribute('data-reveal')).toBe(false);expect(root.querySelector('.clock')!.textContent).toBe('∞');layout.destroy();
});

test('a stalled map offers retry and accepts startup health only from its current frame',()=>{
 vi.useFakeTimers();
 const host=document.createElement('div');document.body.append(host);
 const root=host.attachShadow({mode:'open'}),layout=createGameLayout(root,'https://example.test/game.html?embedded=1',()=>{});
 const frame=root.querySelector('iframe')!,overlay=root.querySelector<HTMLElement>('.map-startup')!,retry=overlay.querySelector('button')!;
 const originalToken=new URL(frame.src).searchParams.get('mapToken');
 const status=(token:string|null,source:MessageEventSource|null=frame.contentWindow,origin='https://example.test',state='ready')=>window.dispatchEvent(new MessageEvent('message',{source,origin,data:{type:'geoplonk:map-frame-status:v1',token,status:state}}));
 expect(overlay.hidden).toBe(false);expect(retry.hidden).toBe(true);
 status(originalToken,window);status(originalToken,frame.contentWindow,'https://other.test');status('wrong');expect(overlay.hidden).toBe(false);
 vi.advanceTimersByTime(12000);expect(retry.hidden).toBe(false);
 retry.click();const newToken=new URL(frame.src).searchParams.get('mapToken');expect(newToken).not.toBe(originalToken);expect(retry.hidden).toBe(true);
 status(originalToken);expect(overlay.hidden).toBe(false);
 status(newToken);expect(overlay.hidden).toBe(true);
 status(newToken,frame.contentWindow,'https://example.test','error');expect(overlay.hidden).toBe(false);expect(retry.hidden).toBe(false);
 layout.destroy();host.remove();expect(vi.getTimerCount()).toBe(0);vi.useRealTimers();
});

test('the completion summary replaces the floating game scoreboard and brand',()=>{
 const host=document.createElement('div'),root=host.attachShadow({mode:'open'}),layout=createGameLayout(root,'about:blank',()=>{});
 const pool=Array.from({length:5},(_,i)=>({id:String(i),name:String(i),lat:i,lng:i}));
 layout.update(gameView({...newGame(pool,0,'complete'),phase:'complete',round:4}));
 expect(root.querySelector('.game-ui')!.hasAttribute('data-complete')).toBe(true);
 expect(root.querySelector('.map-dock')!.hasAttribute('data-result')).toBe(true);
 layout.update(gameView(newGame(pool,0,'next')));
 expect(root.querySelector('.game-ui')!.hasAttribute('data-complete')).toBe(false);layout.destroy();
});
