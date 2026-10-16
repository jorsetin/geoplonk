// Development-only preview. It never accesses the installed extension or Google Maps.
export async function installPreviewRuntime() {
 const storageKey='open-map-companion.preview.v1';
 const read=()=>JSON.parse(localStorage.getItem(storageKey)??'{}');
 const runtime={
  storage:{local:{get:async(key:string)=>({[key]:read()[key]}),set:async(value:Record<string,unknown>)=>localStorage.setItem(storageKey,JSON.stringify({...read(),...value}))}},
  runtime:{getURL:(path:string)=>`${location.origin}/${path}`,sendMessage:async(message:unknown)=>{
   const {handleGame,GAME_KEY}=await import('../background/game');
   return navigator.locks.request('geoplonk-preview-state',()=>handleGame(message,async()=>{const state=read()[GAME_KEY];await handleGame({type:'GAME_READY',gameId:state.game.id,round:state.game.round,ready:true},async()=>{},async()=>{});},async()=>{}).catch(error=>({ok:false,error:error.message})));
  }}};
 Object.defineProperty(window,'chrome',{value:runtime,configurable:true});
}
