import {expect,test,vi} from 'vitest';
import {installMoveHistory} from '../src/content/move-history';
function fixture(){
 let href='https://www.google.com/maps/@1,2/data=!1sA';
 const originalReplace=vi.fn((_state:unknown,_title:string,url?:string|URL|null)=>{if(url!=null)href=String(url);});
 const originalPush=vi.fn((_state:unknown,_title:string,url?:string|URL|null)=>{if(url!=null)href=String(url);});
 const win={location:{get href(){return href;}},dispatchEvent:vi.fn(),history:{replaceState:originalReplace,pushState:originalPush}};
 const dispose=installMoveHistory(win as unknown as Window,{} as Document);
 return {win,dispose,originalReplace,originalPush};
}
test('URL observation forwards native replace and push unchanged without manufacturing history entries',()=>{
 const f=fixture(),state={native:'opaque'};f.win.history.replaceState(state,'','https://www.google.com/maps/@2,3/data=!1sB');
 expect(f.originalReplace).toHaveBeenCalledWith(state,'','https://www.google.com/maps/@2,3/data=!1sB');expect(f.originalPush).not.toHaveBeenCalled();expect(f.win.dispatchEvent).toHaveBeenCalledTimes(1);
 f.win.history.pushState(state,'','https://www.google.com/maps/@3,4/data=!1sC');expect(f.originalPush).toHaveBeenCalledTimes(1);expect(f.win.dispatchEvent).toHaveBeenCalledTimes(2);f.dispose();
});
test('same-URL native state writes remain untouched and state is never inspected',()=>{
 const f=fixture(),state=new Proxy({},{get(){throw Error('Private state must not be inspected');}});
 expect(()=>f.win.history.replaceState(state,'',f.win.location.href)).not.toThrow();expect(f.win.dispatchEvent).not.toHaveBeenCalled();f.dispose();expect(f.win.history.replaceState).toBe(f.originalReplace);expect(f.win.history.pushState).toBe(f.originalPush);
});
