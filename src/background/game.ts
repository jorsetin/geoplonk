import { destinations } from '../explorer/destinations';
import { beginRound, emptyStatistics, gameView, newGame, nextRound, recordCompletion, skipRound, submitRound, validPoint, type Game, type Statistics } from '../game/model';
export const GAME_KEY='game.state.v1';
type State={version:1;game:Game|null;stats:Statistics};
export async function gameState(): Promise<State> {
 const stored=(await chrome.storage.local.get(GAME_KEY))[GAME_KEY] as State | undefined;
 if(stored?.version===1)return stored;
 return {version:1,game:null,stats:emptyStatistics()};
}
const write=(state:State)=>chrome.storage.local.set({[GAME_KEY]:state});
export async function handleGame(message: any, launch: (id:string)=>Promise<void>, focus:()=>Promise<void>) {
 const state=await gameState(),now=Date.now();
 if(state.game?.phase==='countdown'&&now>=(state.game.revealAt??Infinity)){state.game=beginRound(state.game,now);await write(state);}
 if(state.game?.phase==='exploring'&&state.game.deadline!==null&&now>=state.game.deadline){
  state.game=submitRound(state.game,now,true);
  if(state.game.phase==='complete')state.stats=recordCompletion(state.stats,state.game,now);
  await write(state);
 }
 const game=state.game;
 if(message.type==='GAME_STATUS')return {ok:true,game:gameView(game),stats:state.stats,locationCount:destinations.length};
 if(message.type==='GAME_CLEAR_STATS'){state.stats=emptyStatistics();await write(state);return {ok:true};}
 if(message.type==='GAME_START'){
  if(game&&game.phase!=='complete')throw Error('Finish or abandon your current game first.');
  const next=newGame(destinations,message.duration,crypto.randomUUID(),Math.random,message.rounds??5);
  const before=structuredClone(state);state.game=next;await write(state);try{await launch(next.targets[0].id);}catch(error){await write(before);throw error;}return {ok:true};
 }
 if(message.type==='GAME_RESUME'){if(!game)throw Error('No saved game.');if(game.phase==='loading'||game.phase==='countdown'||game.phase==='exploring')await launch(game.targets[game.round].id);else await focus();return {ok:true};}
 if(message.type==='GAME_ABANDON'){state.game=null;await write(state);return {ok:true};}
 if(!game||message.gameId!==game.id||message.round!==game.round)throw Error('This round has changed. Refresh the game.');
 if(message.type==='GAME_READY'){if(game.phase==='loading'){game.sceneReady=message.ready===true;if(game.sceneReady)state.game={...game,phase:'countdown',revealAt:now+3000,deadline:null};await write(state);}return {ok:true};}
 if(message.type==='GAME_BEGIN'){if(game.phase!=='exploring')throw Error('Wait for the countdown to finish.');}
 else if(message.type==='GAME_GUESS'){
  if(game.phase!=='exploring'||!validPoint(message.point))throw Error('Choose a valid point during an active round.');
  state.game={...game,guess:{lat:message.point.lat,lng:message.point.lng}};
 }else if(message.type==='GAME_SKIP'){
  state.game=skipRound(game);
  if(state.game.phase==='complete')state.stats=recordCompletion(state.stats,state.game,now);
 }else if(message.type==='GAME_SUBMIT'){
  state.game=submitRound(game,now);
  if(state.game.phase==='complete')state.stats=recordCompletion(state.stats,state.game,now);
 }else if(message.type==='GAME_NEXT'){
  state.game=nextRound(game);await write(state);await launch(state.game.targets[state.game.round].id);return {ok:true};
 }else throw Error('Unknown game action.');
 await write(state);return {ok:true};
}
