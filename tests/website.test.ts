import {expect,test,vi} from 'vitest';
import {WEBSITE_ORIGIN,websiteRequest,websiteSender,WEBSITE_REQUEST} from '../src/website/protocol';
import {handleWebsite} from '../src/background/website';
import {installWebsiteBridge} from '../src/website/content';
const sender={url:WEBSITE_ORIGIN+'/play.html',origin:WEBSITE_ORIGIN,frameId:0,tab:{id:1,windowId:2}} as chrome.runtime.MessageSender;
test('website requests allow only bounded game options and a short action list',()=>{
 expect(websiteRequest({action:'START_SINGLEPLAYER',rounds:5,duration:120,mode:'move',url:'https://evil.example'})).toEqual({action:'START_SINGLEPLAYER',rounds:5,duration:120,mode:'move'});
 for(const options of [{rounds:0},{rounds:11},{rounds:1.5},{rounds:'5'},{duration:-1},{duration:3601},{mode:'other'}])expect(websiteRequest({action:'START_SINGLEPLAYER',rounds:5,duration:120,mode:'move',...options})).toBeNull();
 expect(websiteRequest({action:'GAME_GUESS'})).toBeNull();expect(websiteRequest({action:{toString:null}})).toBeNull();
});
test('website access requires the exact HTTPS origin, top-level frame and a real sender tab',()=>{
 expect(websiteSender(sender)).toBe(true);
 for(const extra of [{url:WEBSITE_ORIGIN+'.evil.example/play.html'},{url:'http://geoplonk-explore.maplefrost11.chatgpt.site/play.html'},{origin:'https://evil.example'},{frameId:1},{tab:undefined},{url:'invalid'}])expect(websiteSender({...sender,...extra})).toBe(false);
});
function fixture(game:any=null){
 const local:Record<string,any>={'game.state.v1':{version:1,game,stats:{private:'not shared'}},'cleanView.v1':{enabled:true,hideSearch:false,disableMoving:false}};
 vi.stubGlobal('chrome',{storage:{local:{get:async(key:string)=>({[key]:structuredClone(local[key])}),set:async(value:any)=>Object.assign(local,structuredClone(value))}},runtime:{getManifest:()=>({version:'0.3.11'})}});
 const actions={start:vi.fn(async()=>({ok:true})),resume:vi.fn(async()=>({ok:true})),explore:vi.fn(async()=>({ok:true})),openGame:vi.fn(async()=>({ok:true}))};
 return {local,actions};
}
test('status reveals only installation/game availability, and saved games cannot be overwritten',async()=>{
 const f=fixture({phase:'exploring',targets:[{lat:1,lng:2}],guess:{lat:3,lng:4}});
 const status=await handleWebsite({action:'STATUS'},sender,f.actions);expect(status).toEqual({ok:true,version:'0.3.11',hasSavedGame:true,locationCount:24});expect(JSON.stringify(status)).not.toMatch(/targets|guess|stats|lat/);
 const before=structuredClone(f.local);await expect(handleWebsite({action:'START_SINGLEPLAYER',rounds:5,duration:0,mode:'nmpz'},sender,f.actions)).rejects.toThrow('saved game');expect(f.actions.start).not.toHaveBeenCalled();expect(f.local).toEqual(before);
 await handleWebsite({action:'RESUME_SINGLEPLAYER'},sender,f.actions);expect(f.actions.resume).toHaveBeenCalledOnce();vi.unstubAllGlobals();
});
test('website starts use the selected restrictions and preserve other preferences; failure rolls preferences back',async()=>{
 const f=fixture();
 await handleWebsite({action:'START_SINGLEPLAYER',rounds:7,duration:60,mode:'no-move'},sender,f.actions);
 expect(f.actions.start).toHaveBeenCalledWith({action:'START_SINGLEPLAYER',rounds:7,duration:60,mode:'no-move'});expect(f.local['cleanView.v1']).toMatchObject({enabled:true,hideSearch:false,disableMoving:true,disablePanning:false,disableZooming:false});
 f.actions.start.mockRejectedValueOnce(Error('Could not open window'));const before=structuredClone(f.local['cleanView.v1']);
 await expect(handleWebsite({action:'START_SINGLEPLAYER',rounds:5,duration:0,mode:'nmpz'},sender,f.actions)).rejects.toThrow('Could not open window');expect(f.local['cleanView.v1']).toEqual(before);
 await expect(handleWebsite({action:'STATUS'},{...sender,url:'https://evil.example'},f.actions)).rejects.toThrow('not connected');vi.unstubAllGlobals();
});
test('result resumes open the game manager, and unknown website actions never reach launchers',async()=>{
 const f=fixture({phase:'result'});await handleWebsite({action:'RESUME_SINGLEPLAYER'},sender,f.actions);expect(f.actions.openGame).toHaveBeenCalledOnce();expect(f.actions.resume).not.toHaveBeenCalled();
 await expect(handleWebsite({action:'GAME_CLEAR_STATS'},sender,f.actions)).rejects.toThrow('Unknown');vi.unstubAllGlobals();
});
test('the isolated bridge ignores other origins/frames and blocks overlapping launches',async()=>{
 let listener:any;const win:any={location:{origin:WEBSITE_ORIGIN},postMessage:vi.fn(),addEventListener:(_:string,fn:any)=>{listener=fn;},removeEventListener:vi.fn()};win.top=win;
 let resolve!:()=>void;const send=vi.fn(()=>new Promise<void>(r=>{resolve=r;}));const dispose=installWebsiteBridge(win,send,'installed-id');
 const event=(extra:any={})=>({source:win,origin:WEBSITE_ORIGIN,data:{channel:WEBSITE_REQUEST,requestId:'1',action:'OPEN_GAME',extensionId:'installed-id'},...extra});
 await listener(event({data:{channel:WEBSITE_REQUEST,requestId:'3',action:'OPEN_GAME',extensionId:'different-id'}}));await listener(event({source:{}}));await listener(event({origin:'https://evil.example'}));expect(send).not.toHaveBeenCalled();
 const first=listener(event());await listener(event({data:{channel:WEBSITE_REQUEST,requestId:'2',action:'OPEN_GAME',extensionId:'installed-id'}}));expect(send).toHaveBeenCalledOnce();expect(win.postMessage.mock.calls.at(-1)[0].result.error).toMatch(/already in progress/);
 resolve();await first;dispose();expect(win.removeEventListener).toHaveBeenCalledWith('message',listener);
});
