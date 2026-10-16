// @vitest-environment jsdom
import {expect,test,vi} from 'vitest';
import playHtml from '../website/geoplonk/dist/play.html?raw';
import playScript from '../website/geoplonk/dist/play.js?raw';
test('Play page detects the bridge, starts only after a click and changes to resume after launch',async()=>{
 document.documentElement.innerHTML=playHtml;
 let saved=false;const requests:any[]=[];
 vi.spyOn(window,'postMessage').mockImplementation((message:any)=>{
  requests.push(message);
  if(message.action==='START_SINGLEPLAYER')saved=true;
  queueMicrotask(()=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{channel:'geoplonk:website-response:v1',requestId:message.requestId,extensionId:'test-installation',result:message.action==='STATUS'?{ok:true,version:'0.3.11',hasSavedGame:saved,locationCount:24}:{ok:true}}})));
 });
 new Function(playScript)();
 await vi.waitFor(()=>expect(document.querySelector('#connection')?.getAttribute('data-state')).toBe('connected'));
 expect(requests.map(item=>item.action)).toEqual(['STATUS']);expect((document.querySelector('#setup-fields') as HTMLFieldSetElement).disabled).toBe(false);
 (document.querySelector('#rounds') as HTMLInputElement).value='7';(document.querySelector('#duration') as HTMLInputElement).value='60';(document.querySelector('[name=mode][value=no-move]') as HTMLInputElement).checked=true;
 document.querySelector('#game-setup')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(document.querySelector('#saved-game')?.hasAttribute('hidden')).toBe(false));
 expect(requests.find(item=>item.action==='START_SINGLEPLAYER')).toMatchObject({rounds:7,duration:60,mode:'no-move',extensionId:'test-installation'});
 expect((document.querySelector('#game-setup') as HTMLFormElement).hidden).toBe(true);expect((document.querySelector('#open-explorer') as HTMLButtonElement).disabled).toBe(true);
 window.dispatchEvent(new Event('pagehide'));vi.restoreAllMocks();
});
