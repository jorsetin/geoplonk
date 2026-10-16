// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from 'vitest';
import { defaults } from '../src/shared/settings';
import { installInteractionGuards } from '../src/content/interaction';
beforeEach(() => { document.body.innerHTML = '<div role="application" aria-label="Street View"><canvas></canvas></div><input><div class="B5aTzc"><button>Zoom</button></div>'; });
function scene() { return document.querySelector('canvas')!; }
function key(name: string, shiftKey = false) { return new KeyboardEvent('keydown',{key:name,shiftKey,bubbles:true,cancelable:true}); }
test('movement lock blocks clicks and forward keys while preserving drag and rotation', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,enabled:true,disableMoving:true}));
 const click=new MouseEvent('click',{bubbles:true,cancelable:true});scene().dispatchEvent(click);expect(click.defaultPrevented).toBe(true);
 for (const [name,shift,blocked] of [['ArrowUp',false,true],['ArrowLeft',false,false],['ArrowUp',true,false]] as const) {const e=key(name,shift);scene().dispatchEvent(e);expect(e.defaultPrevented).toBe(blocked);}
 const drag=new MouseEvent('mousemove',{buttons:1,bubbles:true,cancelable:true});scene().dispatchEvent(drag);expect(drag.defaultPrevented).toBe(false);dispose();
});
test('panning lock blocks dragging but preserves movement and zoom', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,enabled:true,disablePanning:true}));
 const drag=new MouseEvent('mousemove',{buttons:1,bubbles:true,cancelable:true});scene().dispatchEvent(drag);expect(drag.defaultPrevented).toBe(true);
 const click=new MouseEvent('click',{bubbles:true,cancelable:true});scene().dispatchEvent(click);expect(click.defaultPrevented).toBe(false);
 for (const [name,blocked] of [['ArrowUp',false],['ArrowLeft',true],['+',false]] as const) {const e=key(name);scene().dispatchEvent(e);expect(e.defaultPrevented).toBe(blocked);}dispose();
});
test('zoom lock blocks wheel, double click, zoom keys and native zoom controls only', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,enabled:true,disableZooming:true}));
 for(const e of [new WheelEvent('wheel',{bubbles:true,cancelable:true}),new MouseEvent('dblclick',{bubbles:true,cancelable:true}),key('+')]){scene().dispatchEvent(e);expect(e.defaultPrevented).toBe(true);}
 const click=new MouseEvent('click',{bubbles:true,cancelable:true});document.querySelector('button')!.dispatchEvent(click);expect(click.defaultPrevented).toBe(true);
 const typing=key('+');document.querySelector('input')!.dispatchEvent(typing);expect(typing.defaultPrevented).toBe(false);dispose();
});
test('settings changes restore native input without reload and map view is unaffected', () => {
 let settings={...defaults,enabled:true,disableMoving:true};const dispose=installInteractionGuards(document,()=>settings);
 settings={...settings,enabled:false,disableMoving:false};let e=key('ArrowUp');scene().dispatchEvent(e);expect(e.defaultPrevented).toBe(false);
 settings={...settings,enabled:true,disableMoving:true};document.querySelector('[role="application"]')!.setAttribute('aria-label','Map');e=key('ArrowUp');scene().dispatchEvent(e);expect(e.defaultPrevented).toBe(false);dispose();
});

test('window capture intercepts mouse-up navigation before page handlers', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,enabled:true,disableMoving:true}));
 let navigated=false;const handler=()=>{navigated=true;};window.addEventListener('mouseup',handler,true);
 scene().dispatchEvent(new MouseEvent('mousedown',{clientX:10,clientY:10,buttons:1,bubbles:true,cancelable:true}));
 scene().dispatchEvent(new MouseEvent('mouseup',{clientX:10,clientY:10,bubbles:true,cancelable:true}));
 expect(navigated).toBe(false);window.removeEventListener('mouseup',handler,true);dispose();
});
test('movement-only lock replays drag start and allows release to avoid stuck panning', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,enabled:true,disableMoving:true}));
 let downs=0;let ups=0;const down=()=>{downs++;};const up=()=>{ups++;};scene().addEventListener('mousedown',down);scene().addEventListener('mouseup',up);
 scene().dispatchEvent(new MouseEvent('mousedown',{clientX:10,clientY:10,buttons:1,bubbles:true,cancelable:true}));expect(downs).toBe(0);
 scene().dispatchEvent(new MouseEvent('mousemove',{clientX:30,clientY:10,buttons:1,bubbles:true,cancelable:true}));expect(downs).toBe(1);
 scene().dispatchEvent(new MouseEvent('mouseup',{clientX:30,clientY:10,bubbles:true,cancelable:true}));expect(ups).toBe(1);
 scene().removeEventListener('mousedown',down);scene().removeEventListener('mouseup',up);dispose();
});
test('panning-only lock permits stationary click gestures while blocking drag gestures', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,enabled:true,disablePanning:true}));
 const down=new MouseEvent('mousedown',{clientX:10,clientY:10,buttons:1,bubbles:true,cancelable:true});scene().dispatchEvent(down);
 const up=new MouseEvent('mouseup',{clientX:10,clientY:10,bubbles:true,cancelable:true});scene().dispatchEvent(up);expect(up.defaultPrevented).toBe(false);
 scene().dispatchEvent(new MouseEvent('mousedown',{clientX:10,clientY:10,buttons:1,bubbles:true,cancelable:true}));
 const drag=new MouseEvent('mousemove',{clientX:30,clientY:10,buttons:1,bubbles:true,cancelable:true});scene().dispatchEvent(drag);expect(drag.defaultPrevented).toBe(true);
 const end=new MouseEvent('mouseup',{clientX:30,clientY:10,bubbles:true,cancelable:true});scene().dispatchEvent(end);expect(end.defaultPrevented).toBe(true);const click=new MouseEvent('click',{bubbles:true,cancelable:true});scene().dispatchEvent(click);expect(click.defaultPrevented).toBe(true);dispose();
});

test('locks remain active when Clean View is off', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,enabled:false,disableMoving:true}));
 const e=key('ArrowUp');scene().dispatchEvent(e);expect(e.defaultPrevented).toBe(true);dispose();
});
test('drag release outside the panorama clears the pending gesture', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,disableMoving:true}));
 scene().dispatchEvent(new MouseEvent('mousedown',{clientX:10,clientY:10,buttons:1,bubbles:true,cancelable:true}));
 scene().dispatchEvent(new MouseEvent('mousemove',{clientX:30,clientY:10,buttons:1,bubbles:true,cancelable:true}));
 const up=new MouseEvent('mouseup',{clientX:35,clientY:10,bubbles:true,cancelable:true});document.querySelector('input')!.dispatchEvent(up);expect(up.defaultPrevented).toBe(false);
 let downs=0;const handle=()=>{downs++;};scene().addEventListener('mousedown',handle);
 scene().dispatchEvent(new MouseEvent('mousedown',{clientX:10,clientY:10,buttons:1,bubbles:true,cancelable:true}));scene().dispatchEvent(new MouseEvent('mouseup',{clientX:10,clientY:10,bubbles:true,cancelable:true}));expect(downs).toBe(0);scene().removeEventListener('mousedown',handle);dispose();
});
test('focus loss and mid-gesture preference changes release native dragging', () => {
 let settings={...defaults,disableMoving:true};const dispose=installInteractionGuards(document,()=>settings);let ups=0;const up=()=>{ups++;};scene().addEventListener('mouseup',up);
 const start=()=>{scene().dispatchEvent(new MouseEvent('mousedown',{clientX:10,clientY:10,buttons:1,bubbles:true,cancelable:true}));scene().dispatchEvent(new MouseEvent('mousemove',{clientX:30,clientY:10,buttons:1,bubbles:true,cancelable:true}));};
 start();window.dispatchEvent(new Event('blur'));expect(ups).toBe(1);
 start();settings={...settings,disablePanning:true};scene().dispatchEvent(key('ArrowLeft'));expect(ups).toBe(2);scene().removeEventListener('mouseup',up);dispose();
});
test('cancelled touch gestures do not leak navigation taps', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,disableMoving:true}));
 const touch={identifier:1,clientX:10,clientY:10,target:scene()} as unknown as Touch;
 const start=new TouchEvent('touchstart',{touches:[touch],targetTouches:[touch],changedTouches:[touch],bubbles:true,cancelable:true});scene().dispatchEvent(start);
 const cancel=new TouchEvent('touchcancel',{changedTouches:[touch],bubbles:true,cancelable:true});scene().dispatchEvent(cancel);expect(cancel.defaultPrevented).toBe(true);
 const end=new TouchEvent('touchend',{changedTouches:[touch],bubbles:true,cancelable:true});scene().dispatchEvent(end);expect(end.defaultPrevented).toBe(true);dispose();
});
test('pinch zoom is blocked without disabling single-finger panning', () => {
 const dispose=installInteractionGuards(document,()=>({...defaults,disableZooming:true}));
 const touch={identifier:1,clientX:10,clientY:10,target:scene()} as unknown as Touch;
 const pinch=new TouchEvent('touchstart',{touches:[touch,{...touch,identifier:2} as Touch],changedTouches:[touch],bubbles:true,cancelable:true});scene().dispatchEvent(pinch);expect(pinch.defaultPrevented).toBe(true);
 scene().dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[touch],bubbles:true,cancelable:true}));
 const swipe=new TouchEvent('touchmove',{touches:[touch],changedTouches:[touch],bubbles:true,cancelable:true});scene().dispatchEvent(swipe);expect(swipe.defaultPrevented).toBe(false);dispose();
});

test('touch tap is blocked while a swipe is replayed and released under movement lock',()=>{
 const dispose=installInteractionGuards(document,()=>({...defaults,disableMoving:true}));
 const t=(x:number)=>({identifier:1,clientX:x,clientY:10,target:scene()} as unknown as Touch);
 const touch=(type:string,x:number)=>new TouchEvent(type,{touches:type==='touchend'?[]:[t(x)],targetTouches:type==='touchend'?[]:[t(x)],changedTouches:[t(x)],bubbles:true,cancelable:true});
 let starts=0,ends=0;const start=()=>{starts++;};const end=()=>{ends++;};scene().addEventListener('touchstart',start);scene().addEventListener('touchend',end);
 scene().dispatchEvent(touch('touchstart',10));scene().dispatchEvent(touch('touchend',10));expect(starts).toBe(0);expect(ends).toBe(0);
 scene().dispatchEvent(touch('touchstart',10));scene().dispatchEvent(touch('touchmove',30));scene().dispatchEvent(touch('touchend',30));expect(starts).toBe(1);expect(ends).toBe(1);
 scene().removeEventListener('touchstart',start);scene().removeEventListener('touchend',end);dispose();
});
test('scene replacement clears a pending click without applying its release to the new scene',async()=>{
 const dispose=installInteractionGuards(document,()=>({...defaults,disableMoving:true}));
 scene().dispatchEvent(new MouseEvent('mousedown',{clientX:10,clientY:10,buttons:1,bubbles:true,cancelable:true}));document.querySelector('[role="application"]')!.outerHTML='<div role="application" aria-label="Street View"><canvas></canvas></div>';await Promise.resolve();
 const event=new MouseEvent('mouseup',{clientX:10,clientY:10,bubbles:true,cancelable:true});scene().dispatchEvent(event);expect(event.defaultPrevented).toBe(true);dispose();
});

test('typing outside the panorama remains available even during a pending gesture',()=>{
 const dispose=installInteractionGuards(document,()=>({...defaults,disableMoving:true,disableZooming:true}));
 scene().dispatchEvent(new MouseEvent('mousedown',{clientX:10,clientY:10,buttons:1,bubbles:true,cancelable:true}));
 const input=key('+');document.querySelector('input')!.dispatchEvent(input);expect(input.defaultPrevented).toBe(false);dispose();
});

test('pointer IDs, capture loss and outside releases are tracked independently',()=>{
 class TestPointer extends MouseEvent { pointerId:number;pointerType='mouse';isPrimary=true;constructor(type:string,init:PointerEventInit){super(type,init);this.pointerId=init.pointerId??0;} }
 vi.stubGlobal('PointerEvent',TestPointer);
 const dispose=installInteractionGuards(document,()=>({...defaults,disableMoving:true}));let downs:number[]=[];const observe=(e:Event)=>{downs.push((e as PointerEvent).pointerId);};scene().addEventListener('pointerdown',observe);
 const pointer=(type:string,id:number,x:number)=>new TestPointer(type,{pointerId:id,clientX:x,clientY:10,buttons:type==='pointerup'?0:1,bubbles:true,cancelable:true});
 try {
  scene().dispatchEvent(pointer('pointerdown',7,10));scene().dispatchEvent(pointer('pointerdown',8,20));scene().dispatchEvent(pointer('pointermove',7,35));expect(downs).toEqual([7]);
  const released=pointer('pointerup',7,35);document.querySelector('input')!.dispatchEvent(released);expect(released.defaultPrevented).toBe(false);
  const lost=pointer('lostpointercapture',8,20);scene().dispatchEvent(lost);expect(lost.defaultPrevented).toBe(true);
  const stale=pointer('pointerup',8,20);scene().dispatchEvent(stale);expect(stale.defaultPrevented).toBe(true);
 } finally {scene().removeEventListener('pointerdown',observe);dispose();vi.unstubAllGlobals();}
});
