(() => {
  const REQUEST='geoplonk:website-request:v1',RESPONSE='geoplonk:website-response:v1';
  const pending=new Map();
  let connected=false,busy=false,hasSavedGame=false,checking=false,extensionId='';
  const connection=document.querySelector('#connection'),title=document.querySelector('#connection-title'),description=document.querySelector('#connection-description'),feedback=document.querySelector('#launch-feedback');
  const setup=document.querySelector('#game-setup'),fields=document.querySelector('#setup-fields'),saved=document.querySelector('#saved-game');
  function paint(){
    fields.disabled=!connected||busy||hasSavedGame;
    setup.hidden=hasSavedGame;
    saved.hidden=!hasSavedGame;
    for(const button of document.querySelectorAll('[data-needs-extension]'))button.disabled=!connected||busy;
    document.querySelector('#check-extension').disabled=checking||busy;
    document.querySelector('#open-explorer').disabled=!connected||busy||hasSavedGame;
    document.querySelector('#open-explorer').title=hasSavedGame?'Finish or discard the saved game before exploring.':'';
  }
  function request(action,options={}){
    const requestId=crypto.randomUUID();
    return new Promise((resolve,reject)=>{
      const timers=[];
      timers.push(setTimeout(()=>{pending.delete(requestId);timers.forEach(clearTimeout);reject(Error('The extension did not respond. Install or update geoplonk, then reload this page in Chrome.'));},action==='STATUS'?2000:15000));
      pending.set(requestId,{resolve,reject,timers});
      const post=()=>window.postMessage({channel:REQUEST,requestId,action,extensionId,...options},location.origin);
      // The isolated extension script may load after the page's first request.
      // Retry discovery only; game launches are always sent exactly once.
      if(action==='STATUS')for(const delay of [250,750,1250])timers.push(setTimeout(post,delay));
      post();
    });
  }
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.channel!==RESPONSE)return;
    const entry=pending.get(event.data.requestId);if(!entry)return;
    pending.delete(event.data.requestId);entry.timers.forEach(clearTimeout);
    const result=event.data.result;
    if(!result?.ok){entry.reject(Error(typeof result?.error==='string'?result.error:'Could not connect to the extension.'));return;}
    entry.resolve({...result,extensionId:event.data.extensionId});
  });
  async function check(){
    if(checking||busy)return;
    checking=true;connection.dataset.state='checking';title.textContent='Checking extension connection…';paint();
    try{
      const result=await request('STATUS');connected=true;extensionId=result.extensionId;hasSavedGame=result.hasSavedGame===true;
      connection.dataset.state='connected';title.textContent=`geoplonk ${result.version} is connected`;
      description.textContent='You can launch games from this page. Progress is saved in the extension on this device.';
      document.querySelector('#install-link').hidden=true;
      if(Number.isInteger(result.locationCount))document.querySelector('#location-count').textContent=String(result.locationCount)+' curated';
    }catch{
      connected=false;hasSavedGame=false;connection.dataset.state='missing';title.textContent='Extension not connected';
      description.textContent='Open this page in Chrome with geoplonk v0.3.11 or later installed. Install or update it, then reload this page.';
      document.querySelector('#install-link').hidden=false;
    }finally{checking=false;paint();}
  }
  async function launch(action,options={}){
    if(!connected||busy)return;
    busy=true;feedback.removeAttribute('data-error');feedback.textContent='Opening geoplonk…';paint();
    try{
      await request(action,options);
      feedback.textContent=action==='OPEN_GAME'?'The game manager has opened in Chrome.':'The game window is open in Chrome. You can return here when you finish.';
    }catch(error){feedback.dataset.error='';feedback.textContent=error.message;}
    finally{busy=false;paint();await check();}
  }
  document.querySelector('#check-extension').addEventListener('click',check);
  setup.addEventListener('submit',event=>{
    event.preventDefault();if(!setup.reportValidity())return;
    void launch('START_SINGLEPLAYER',{rounds:Number(document.querySelector('#rounds').value),duration:Number(document.querySelector('#duration').value),mode:document.querySelector('[name=mode]:checked').value});
  });
  document.querySelector('#resume-game').addEventListener('click',()=>void launch('RESUME_SINGLEPLAYER'));
  document.querySelector('#manage-game').addEventListener('click',()=>void launch('OPEN_GAME'));
  document.querySelector('#open-explorer').addEventListener('click',()=>void launch('OPEN_EXPLORER'));
  window.addEventListener('focus',()=>void check());
  window.addEventListener('pagehide',()=>{for(const entry of pending.values()){entry.timers.forEach(clearTimeout);entry.reject(Error('Page closed.'));}pending.clear();});
  void check();
})();
