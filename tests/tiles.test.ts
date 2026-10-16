// @vitest-environment jsdom
import {expect,test,vi} from 'vitest';
import L from 'leaflet';
import {RetryingTileLayer} from '../src/game/GuessMap';
test('failed tiles retry alternate hosts at standard resolution, then report final failure',()=>{
 const layer=new RetryingTileLayer('https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&scale=2');
 const done=vi.fn(),coords=Object.assign(L.point(1,1),{z:2});
 // getTileUrl normally receives its zoom from a mounted map.
 vi.spyOn(layer,'getTileUrl').mockReturnValue('https://mt0.google.com/vt/lyrs=m&x=1&y=1&z=2&scale=2');
 const img=layer.createTile(coords,done) as HTMLImageElement;
 img.dispatchEvent(new Event('error'));expect(img.src).toContain('mt3.google.com');expect(img.src).toContain('scale=1');expect(done).not.toHaveBeenCalled();
 img.dispatchEvent(new Event('error'));expect(img.src).toContain('mt0.google.com');img.dispatchEvent(new Event('load'));expect(done).toHaveBeenCalledWith(undefined,img);
 const failure=vi.fn(),broken=layer.createTile(coords,failure);for(let i=0;i<3;i++)broken.dispatchEvent(new Event('error'));expect(failure).toHaveBeenCalledTimes(1);expect(failure.mock.calls[0][0]).toBeInstanceOf(Error);
});

test('smooth wheel zoom works at the exact map centre and cancels animation on removal',()=>{
 vi.useFakeTimers();let frame:(time:number)=>void=()=>{};const cancel=vi.fn();vi.stubGlobal('requestAnimationFrame',(callback:(time:number)=>void)=>{frame=callback;return 1;});vi.stubGlobal('cancelAnimationFrame',cancel);
 const container=document.createElement('div');document.body.append(container);
 const map=L.map(container,{minZoom:1,maxZoom:20,scrollWheelZoom:false,smoothWheelZoom:true,zoomSnap:0}).setView([20,0],1);
 container.dispatchEvent(new WheelEvent('wheel',{deltaY:-120,clientX:0,clientY:0,bubbles:true}));frame(16);expect(map.getZoom()).toBeGreaterThan(1);map.remove();expect(cancel).toHaveBeenCalled();vi.advanceTimersByTime(300);container.remove();vi.unstubAllGlobals();vi.useRealTimers();
});
