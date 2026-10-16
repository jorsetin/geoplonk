import {expect,test,vi} from 'vitest';
test('worker integrates owned game windows, iframe messages, recovery and five-round completion',async()=>{
 const clock=vi.spyOn(Date,'now').mockReturnValue(10000);
 const local:Record<string,any>={},session:Record<string,any>={};let listener:any;let open=false;let id=100;
 const area=(data:Record<string,any>)=>({get:async(key:string)=>({[key]:structuredClone(data[key])}),set:async(values:Record<string,any>)=>{for(const key in values)data[key]=structuredClone(values[key]);},remove:async(key:string|string[])=>{for(const item of Array.isArray(key)?key:[key])delete data[item];}});
 const tabUpdate=vi.fn(async(_tabId:number,_update:{url?:string})=>({}));
 const create=vi.fn(async(options:{url:string})=>{open=true;id++;return {id,tabs:[{id:id+1000}]};});
 vi.stubGlobal('chrome',{storage:{local:area(local),session:area(session)},windows:{create,get:async()=>{if(!open)throw Error();return {id,type:'popup'};},update:async()=>({}),remove:async()=>{open=false;},onRemoved:{addListener:()=>{}}},tabs:{get:async()=>({id:id+1000,windowId:id}),update:tabUpdate},runtime:{getURL:(path:string)=>`chrome-extension://worker/${path}`,onMessage:{addListener:(fn:any)=>{listener=fn;}}}});
 await import('../src/background/index');
 const page={url:'chrome-extension://worker/game.html?embedded=1'};
 const send=(type:string,extra:any={},sender:any=page)=>new Promise<any>(resolve=>listener({type,...(type==='EXPLORER_NAV'?{gameId:local['game.state.v1']?.game?.id,round:local['game.state.v1']?.game?.round}:{}),...extra},sender,resolve));
 expect((await send('GAME_START',{duration:0})).ok).toBe(true);
 expect(create).toHaveBeenCalledTimes(1);
 const initialHeading=new URL(create.mock.calls[0][0].url).searchParams.get('heading');expect(Number(initialHeading)).toBeGreaterThanOrEqual(0);expect(Number(initialHeading)).toBeLessThan(360);
 let view=(await send('GAME_STATUS')).game;expect(view.targets).toBeUndefined();
 expect((await send('GAME_READY',{gameId:view.id,round:0,ready:true},{tab:{id:999,windowId:99}})).ok).toBe(false);
 open=false;expect((await send('GAME_RESUME')).ok).toBe(true);expect(create).toHaveBeenCalledTimes(2);expect(new URL(create.mock.calls[1][0].url).searchParams.get('heading')).toBe(initialHeading);
 for(let round=0;round<5;round++){
  view=(await send('GAME_STATUS')).game;
  expect((await send('GAME_READY',{gameId:view.id,round,ready:true},{tab:{id:id+1000,windowId:id},url:`https://www.google.com/maps/@${local['game.state.v1'].game.targets[round].lat},${local['game.state.v1'].game.targets[round].lng},45a,90y,90t/data=!1e1`})).ok).toBe(true);
  clock.mockReturnValue(Date.now()+3000);await send('GAME_STATUS');
  expect((await send('GAME_BEGIN',{gameId:view.id,round})).ok).toBe(true);
  if(round===0){
   const a={tab:{id:id+1000,windowId:id},url:'https://www.google.com/maps/@48.83,2.34,75y,90h,90t/data=!1sA'};
   const b={...a,url:'https://www.google.com/maps/@48.84,2.34,75y,90h,90t/data=!1sB'};
   const context=(documentId='same-page')=>({documentId,sceneReady:true});
   await send('EXPLORER_STATUS',context(),a);
   const navigated=await send('EXPLORER_STATUS',context(),b);expect(navigated.navigation.canUndo).toBe(true);
   expect((await send('EXPLORER_NAV',{action:'checkpoint'},b)).ok).toBe(false);
   // Failure keeps both positions and the timer so the same Undo can be retried.
   const deadline=local['game.state.v1'].game.deadline;
   tabUpdate.mockRejectedValueOnce(Error('Navigation failed'));
   expect((await send('EXPLORER_NAV',{action:'undo',...context()},b)).ok).toBe(false);
   expect(session['game.navigation.v1'].history).toHaveLength(2);expect(session['game.navigation.v1'].pending).toBeUndefined();
   const positions=[a,b,{...a,url:a.url.replace('!1sA','!1sC')},{...a,url:a.url.replace('!1sA','!1sD')}];
   await send('EXPLORER_STATUS',context(),positions[2]);await send('EXPLORER_STATUS',context(),positions[3]);
   let currentDocument='same-page';
   for(let index=3;index>0;index--){
    const previous='ABCD'[index-1],outgoingDocument=currentDocument;
    const response=await send('EXPLORER_NAV',{action:'undo',...context(currentDocument)},positions[index]);expect(response.ok).toBe(true);expect(response.historyKey).toBeUndefined();
    const requested=new URL(tabUpdate.mock.calls.at(-1)![1].url!);expect(requested.searchParams.get('pano')).toBe(previous);expect(requested.searchParams.get('heading')).toBe('90');
    expect(session['game.navigation.v1'].pending).toBe(previous);
    expect((await send('EXPLORER_NAV',{action:'undo',...context(currentDocument)},positions[index])).ok).toBe(false);
    await send('EXPLORER_STATUS',context(currentDocument),positions[index]);expect(session['game.navigation.v1'].pending).toBe(previous);
    // A departing-page URL change, or a new page still loading, cannot confirm arrival.
    await send('EXPLORER_STATUS',context(currentDocument),positions[index-1]);expect(session['game.navigation.v1'].pending).toBe(previous);
    currentDocument=`undo-${index}`;
    await send('EXPLORER_STATUS',{...context(currentDocument),sceneReady:false},positions[index-1]);expect(session['game.navigation.v1'].pending).toBe(previous);
    await send('EXPLORER_STATUS',context(currentDocument),positions[index-1]);
    const delayed=await send('EXPLORER_STATUS',context(outgoingDocument),positions[index]);
    expect(session['game.navigation.v1'].history.map((item:any)=>item.key)).toEqual('ABCD'.slice(0,index).split(''));expect(delayed.navigation.canUndo).toBe(index>1);expect(session['game.navigation.v1'].pending).toBeUndefined();
    expect(local['game.state.v1'].game.deadline).toBe(deadline);expect(local['game.state.v1'].game.round).toBe(0);expect(local['game.state.v1'].game.results).toHaveLength(0);
   }
   expect((await send('EXPLORER_NAV',{action:'start'})).ok).toBe(false);
   local['cleanView.v1']={disableMoving:true};expect((await send('EXPLORER_NAV',{action:'start'},b)).ok).toBe(false);expect((await send('EXPLORER_NAV',{action:'north'},b)).ok).toBe(false);expect((await send('EXPLORER_NAV',{action:'zoomIn'},b)).ok).toBe(false);local['cleanView.v1']={};
  }
  expect((await send('GAME_GUESS',{gameId:view.id,round,point:{lat:0,lng:0}})).ok).toBe(true);
  expect((await send('GAME_SUBMIT',{gameId:view.id,round})).ok).toBe(true);expect(session['game.navigation.v1']).toBeUndefined();
  expect((await send('GAME_SUBMIT',{gameId:view.id,round})).ok).toBe(false);
  if(round<4){expect((await send('GAME_NEXT',{gameId:view.id,round})).ok).toBe(true);expect(session['game.navigation.v1']).toBeUndefined();const owned={tab:{id:id+1000,windowId:id},url:'https://www.google.com/maps/@48.84,2.34,75y,90h,90t/data=!1sB'};expect((await send('EXPLORER_STATUS',{},owned)).navigation.canUndo).toBe(false);expect((await send('EXPLORER_NAV',{action:'undo',round},owned)).ok).toBe(false);}
 }
 const complete=await send('GAME_STATUS');expect(complete.game.phase).toBe('complete');expect(complete.game.results).toHaveLength(5);expect(complete.stats.games).toBe(1);
 expect((await send('GAME_STATUS')).stats.games).toBe(1);
 clock.mockRestore();vi.unstubAllGlobals();
});
