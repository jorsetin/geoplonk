import {expect,test} from 'vitest';
import {cameraFromUrl,observeCamera,type Trail} from '../src/explorer/navigation';
test('public camera snapshots discard unrelated native data and preserve orientation',()=>{
 const camera=cameraFromUrl('https://www.google.com/maps/@48.83,2.34,75y,125h,95t/data=!1e1!3m4!1sabc!2e0?unrelated=secret')!;
 expect(camera.heading).toBe(125);const url=new URL(camera.url);expect(url.searchParams.get('pano')).toBe('abc');expect(url.searchParams.get('pitch')).toBe('-5');expect(camera.url).not.toContain('secret');expect(camera.key).toBe('abc');expect(cameraFromUrl('https://example.com/maps/@1,2')).toBeNull();
});
test('panning does not become a move and undo ignores the old location until arrival',()=>{
 const a=cameraFromUrl('https://www.google.com/maps/@1,2,75y,0h,90t/data=!1sA')!,b=cameraFromUrl('https://www.google.com/maps/@2,3,75y,0h,90t/data=!1sB')!;
 let trail:Trail={round:'game:0',history:[]};trail=observeCamera(trail,a);trail=observeCamera(trail,{...a,heading:90});expect(trail.history).toHaveLength(1);
 trail=observeCamera(trail,b);expect(trail.history).toHaveLength(2);trail.history.pop();trail.pending=a.key;expect(observeCamera(trail,b)).toEqual(trail);expect(observeCamera(trail,a).pending).toBeUndefined();
});


test('a native replacement remains a move even when the browser history slot is unchanged',()=>{
 const a={...cameraFromUrl('https://www.google.com/maps/@1,2,75y,0h,90t/data=!1sA')!,documentId:'doc'};
 const b={...cameraFromUrl('https://www.google.com/maps/@2,3,75y,0h,90t/data=!1sB')!,documentId:'doc'};
 const trail=observeCamera({round:'game:0',history:[a]},b);expect(trail.history.map(item=>item.key)).toEqual(['A','B']);
});
test('repeated recorded-position undo survives document changes and rejects departing-page updates',()=>{
 const positions='ABCD'.split('').map(key=>({...cameraFromUrl(`https://www.google.com/maps/@1,2,75y,0h,90t/data=!1s${key}`)!,documentId:'original'}));
 let trail:Trail={round:'game:0',history:positions};
 for(let index=3;index>0;index--){
  const outgoing=trail.history.pop()!;trail.undoFrom=outgoing;trail.pending=positions[index-1].key;trail.sourceDocument=outgoing.documentId;
  const arriving={...positions[index-1],documentId:`undo-${index}`};
  expect(observeCamera(trail,outgoing)).toEqual(trail);
  expect(observeCamera(trail,{...arriving,documentId:outgoing.documentId})).toEqual(trail);
  trail=observeCamera(trail,arriving);trail=observeCamera(trail,outgoing);
  expect(trail.history.map(item=>item.key)).toEqual('ABCD'.slice(0,index).split(''));expect(trail.pending).toBeUndefined();
 }
 trail=observeCamera(trail,{...positions[1],documentId:'undo-1'});expect(trail.history.map(item=>item.key)).toEqual(['A','B']);
});
