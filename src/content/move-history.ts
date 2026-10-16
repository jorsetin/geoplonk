// Observe standard browser URL writes; never rewrite Maps' native history/state.
export const MOVE_RECORDED_EVENT='geoplonk:move-recorded';
export function installMoveHistory(win:Window,_doc:Document):()=>void {
 const history=win.history,replace=history.replaceState,push=history.pushState;
 const wrap=(method:History['replaceState']):History['replaceState']=>function(this:History,...args){
  const before=win.location.href;
  const result=Reflect.apply(method,this,args);
  if(this===history&&win.location.href!==before){
   try{win.dispatchEvent(new Event(MOVE_RECORDED_EVENT));}catch{/* Observing must not break native navigation. */}
  }
  return result;
 };
 const wrappedReplace=wrap(replace),wrappedPush=wrap(push);
 const dispose=()=>{
  if(history.replaceState===wrappedReplace)history.replaceState=replace;
  if(history.pushState===wrappedPush)history.pushState=push;
 };
 try{history.replaceState=wrappedReplace;history.pushState=wrappedPush;}catch{dispose();}
 return dispose;
}
