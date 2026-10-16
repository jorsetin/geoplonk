import { keepNeutralTitle } from './neutral-title';
// The worker checks both tab and window ownership. Ordinary Maps tabs keep their titles.
chrome.runtime.sendMessage({ type: 'EXPLORER_STATUS' }).then(result => {
  if (!result?.active) return;
  // Keep the neutral title through navigation and back/forward cache suspension.
  keepNeutralTitle(document);
  if(result.mode==='game'&&(result.game?.phase==='loading'||result.game?.phase==='countdown'||result.navigation?.loading)){
    const style=document.createElement('style');style.id='open-map-companion-initial-reveal';style.textContent='html::after{content:"";position:fixed;inset:0;background:#102e2966;backdrop-filter:blur(22px);z-index:2147483647}';
    const attach=()=>{const parent=document.head??document.documentElement;if(parent){parent.append(style);return true;}return false;};
    if(!attach()){const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});observer.observe(document,{childList:true});}
  }
}).catch(() => { /* Extension disconnected; leave the native title alone. */ });
