import {installPreviewRuntime} from './preview';
import {readSettings} from '../shared/settings';
import {createGameLayout} from '../content/game-layout';
if(import.meta.env.DEV){
 await installPreviewRuntime();
 const host=document.createElement('div');host.setAttribute('data-game','');host.style.zIndex='10';document.body.append(host);
 const root=host.attachShadow({mode:'open'});
 const layout=createGameLayout(root,`${location.origin}/game.html?embedded=1`,()=>{void chrome.runtime.sendMessage({type:'GAME_ABANDON'});});
 const update=async()=>{const result=await chrome.runtime.sendMessage({type:'GAME_STATUS'});layout.update(result.game);layout.controls(await readSettings(),{heading:35,canUndo:true});};
 setInterval(()=>void update(),500);void update();
 document.querySelector('.preview-action')!.addEventListener('click',async()=>{await chrome.runtime.sendMessage({type:'GAME_ABANDON'});await chrome.runtime.sendMessage({type:'GAME_START',duration:120});void update();});
}
