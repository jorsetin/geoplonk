export const MAP_FRAME_STATUS='geoplonk:map-frame-status:v1';
export function reportMapFrame(status:'ready'|'error'){
 if(window.parent===window)return;
 const token=new URLSearchParams(location.search).get('mapToken');
 if(!token)return;
 try{
  const parentOrigin=new URL(document.referrer).origin;
  if(parentOrigin!==location.origin&&!['https://www.google.com','https://maps.google.com'].includes(parentOrigin))return;
  // Only startup health crosses this boundary, never game state or locations.
  window.parent.postMessage({type:MAP_FRAME_STATUS,token,status},parentOrigin);
 }catch{/* A standalone extension page has no parent to notify. */}
}
