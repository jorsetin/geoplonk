// @vitest-environment jsdom
import {expect,test,vi} from 'vitest';
import {nativeHeading,bearingLabel,nativeCameraAction} from '../src/content/panorama-camera';
test('reads live compass rotation with the correct sign and heading labels',()=>{
 document.body.innerHTML='<div jsaction="compass.needle" style="transform:rotate(-127deg)" aria-valuenow="233"></div>';
 expect(nativeHeading(document)).toBe(127);expect(bearingLabel(nativeHeading(document)!)).toBe('SE · 127°');
 const needle=document.querySelector<HTMLElement>('[jsaction]')!;needle.style.transform='';expect(nativeHeading(document)).toBe(127);needle.setAttribute('aria-valuenow','0');expect(nativeHeading(document)).toBe(0);expect(bearingLabel(359.8)).toBe('N · 0°');
});
test('uses a small native wheel event instead of a full native zoom-button step',async()=>{
 vi.useFakeTimers();document.body.innerHTML='<div role="application" aria-label="Street View"><canvas></canvas></div>';
 let delta=0;document.querySelector('[role=application]')!.addEventListener('wheel',event=>{delta=(event as WheelEvent).deltaY;});
 const pending=nativeCameraAction(document,'zoomIn');expect(delta).toBe(-20);await vi.advanceTimersByTimeAsync(600);await pending;vi.useRealTimers();
});

test('reports an unavailable native reset and succeeds when the native compass responds',async()=>{
 vi.useFakeTimers();document.body.innerHTML='<div jsaction="compass.needle" style="transform:rotate(-127deg)"></div>';
 const needle=document.querySelector<HTMLElement>('[jsaction]')!;
 const pending=nativeCameraAction(document,'north');const rejected=expect(pending).rejects.toThrow('North reset unavailable');await vi.advanceTimersByTimeAsync(1200);await rejected;
 needle.addEventListener('click',()=>{needle.style.transform='rotate(0deg)';});await nativeCameraAction(document,'north');vi.useRealTimers();
});

test('a slow native north animation can finish without the previous premature reload',async()=>{
 vi.useFakeTimers();document.body.innerHTML='<div jsaction="compass.needle" style="transform:rotate(-127deg)"></div>';
 const needle=document.querySelector<HTMLElement>('[jsaction]')!;
 needle.addEventListener('click',()=>setTimeout(()=>{needle.style.transform='rotate(0deg)';},650));
 const pending=nativeCameraAction(document,'north');await vi.advanceTimersByTimeAsync(650);await pending;expect(nativeHeading(document)).toBe(0);vi.useRealTimers();
});

test('the in-place drag fallback turns north while movement is locked without calling reload',async()=>{
 const {installInteractionGuards}=await import('../src/content/interaction');vi.useFakeTimers();
 document.body.innerHTML='<div jsaction="compass.needle" style="transform:rotate(-127deg)"></div><div role="application" aria-label="Street View"><canvas></canvas></div>';
 const canvas=document.querySelector('canvas')!,needle=document.querySelector<HTMLElement>('[jsaction]')!;
 vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:1000,height:500,right:1000,bottom:500,x:0,y:0,toJSON:()=>({})});
 let start=0,heading=127;canvas.addEventListener('mousedown',event=>{start=(event as MouseEvent).clientX;heading=nativeHeading(document)!;});canvas.addEventListener('mousemove',event=>{needle.style.transform=`rotate(${-(heading-((event as MouseEvent).clientX-start)*.1)}deg)`;});
 const dispose=installInteractionGuards(document,()=>({disableMoving:true,disablePanning:false,disableZooming:false}));
 const pending=nativeCameraAction(document,'north');await vi.advanceTimersByTimeAsync(1200);await pending;expect(nativeHeading(document)).toBeCloseTo(0,1);dispose();vi.restoreAllMocks();vi.useRealTimers();
});

test('waits for a late first compass control before resetting north',async()=>{
 vi.useFakeTimers();document.body.innerHTML='';
 const pending=nativeCameraAction(document,'north');
 setTimeout(()=>{const needle=document.createElement('div');needle.setAttribute('jsaction','compass.needle');needle.style.transform='rotate(-90deg)';needle.addEventListener('click',()=>{needle.style.transform='rotate(0deg)';});document.body.append(needle);},400);
 await vi.advanceTimersByTimeAsync(400);await pending;expect(nativeHeading(document)).toBe(0);vi.useRealTimers();
});

test('zoom targets the viewport rather than a hidden renderer canvas',async()=>{
 document.body.innerHTML='<div role="application" aria-label="Street View"><canvas id="small"></canvas><canvas id="viewport"></canvas></div>';
 const small=document.querySelector<HTMLCanvasElement>('#small')!,viewport=document.querySelector<HTMLCanvasElement>('#viewport')!;
 vi.spyOn(viewport,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:1000,height:500,right:1000,bottom:500,x:0,y:0,toJSON:()=>({})});
 const wrong=vi.fn(),right=vi.fn();small.addEventListener('wheel',wrong);viewport.addEventListener('wheel',right);await nativeCameraAction(document,'zoomIn');expect(wrong).not.toHaveBeenCalled();expect(right).toHaveBeenCalledTimes(1);vi.restoreAllMocks();
});
