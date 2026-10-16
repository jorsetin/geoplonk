import {reportMapFrame} from './frame-status';
// Catch module-load failures before React starts; an empty root hides failures.
import('./main').then(module=>module.mountGame()).catch(()=>{
 reportMapFrame('error');
 const root=document.getElementById('root');if(!root)return;
 root.replaceChildren();
 const title=document.createElement('h2');title.textContent='The guessing map could not load';
 const message=document.createElement('p');message.textContent='Reload the updated extension in Chrome, then retry the map.';
 const retry=document.createElement('button');retry.textContent='Retry map';retry.addEventListener('click',()=>location.reload());
 root.append(title,message,retry);
});
