import {describe,expect,it,vi} from 'vitest';
import {beginRound,distanceKm,emptyStatistics,gameView,newGame,nextRound,recordCompletion,scoreDistance,skipRound,submitRound,validPoint} from '../src/game/model';
const pool=Array.from({length:5},(_,i)=>({id:`p${i}`,name:`Place ${i}`,lat:i,lng:i}));
describe('five-round game',()=>{
 it('measures distance across the antimeridian, poles and antipodes',()=>{
  expect(distanceKm({lat:0,lng:0},{lat:0,lng:0})).toBe(0);
  expect(distanceKm({lat:0,lng:0},{lat:0,lng:1})).toBeCloseTo(111.195,2);
  expect(distanceKm({lat:0,lng:179},{lat:0,lng:-179})).toBeCloseTo(222.390,2);
  expect(distanceKm({lat:90,lng:0},{lat:90,lng:180})).toBeCloseTo(0,5);
  expect(distanceKm({lat:0,lng:0},{lat:0,lng:180})).toBeCloseTo(20015.114,2);
  expect(validPoint({lat:NaN,lng:0})).toBe(false);expect(validPoint({lat:91,lng:0})).toBe(false);
 });
 it('bounds the scoring and validates inputs',()=>{
  expect(scoreDistance(0)).toBe(5000);expect(scoreDistance(2000)).toBe(1839);
  expect(scoreDistance(20015)).toBeGreaterThanOrEqual(0);expect(()=>scoreDistance(-1)).toThrow();
 });
 it('selects five unique places and withholds future targets from the UI',()=>{
  const game=newGame(pool,120,'game');expect(new Set(game.targets.map(p=>p.id)).size).toBe(5);
  expect(gameView(game)).not.toHaveProperty('targets');expect(()=>newGame(pool.slice(0,4),120,'game')).toThrow();
 });
 it('finishes five rounds, rejects double submission, and records statistics once',()=>{
  let game=newGame(pool,0,'game');
  for(let i=0;i<5;i++){
   game=beginRound({...game,sceneReady:true},1000);game={...game,guess:game.targets[i]};game=submitRound(game,1001);
   expect(()=>submitRound(game,1002)).toThrow();if(i<4)game=nextRound(game);
  }
  expect(game.phase).toBe('complete');expect(game.results).toHaveLength(5);
  const stats=recordCompletion(emptyStatistics(),game,2000);expect(stats.best).toBe(25000);expect(stats.games).toBe(1);expect(recordCompletion(stats,game,3000)).toEqual(stats);
 });
 it('starts time only on begin and uses a durable deadline for timeout',()=>{
  const game=newGame(pool,60,'timed');expect(game.deadline).toBeNull();expect(()=>beginRound(game,0)).toThrow();
  const started=beginRound({...game,sceneReady:true},1000);expect(started.deadline).toBe(61000);
  expect(()=>submitRound(started,60000)).toThrow();
  const timeout=submitRound(started,61000);expect(timeout.results[0].score).toBe(0);expect(timeout.results[0].timedOut).toBe(true);
  const withGuess=submitRound({...started,guess:started.targets[0]},61000);expect(withGuess.results[0].score).toBe(5000);
 });
 it('skips unavailable imagery without starting a timer or allowing a second result',()=>{
  const skipped=skipRound(newGame(pool,60,'skip'));
  expect(skipped.phase).toBe('result');expect(skipped.results[0].score).toBe(0);expect(skipped.results[0].skipped).toBe(true);expect(()=>skipRound(skipped)).toThrow();
 });
 it('reconciles expired rounds after a worker restart and validates stale messages',async()=>{
  let state:any={version:1,game:beginRound({...newGame(pool,60,'resume'),sceneReady:true},0),stats:emptyStatistics()};
  vi.stubGlobal('chrome',{storage:{local:{get:async()=>({'game.state.v1':structuredClone(state)}),set:async(value:any)=>{state=structuredClone(value['game.state.v1']);}}}});
  const {handleGame}=await import('../src/background/game');const launch=vi.fn(),focus=vi.fn();
  const view=await handleGame({type:'GAME_STATUS'},launch,focus);expect(view.game?.phase).toBe('result');expect(state.game.results).toHaveLength(1);
  await handleGame({type:'GAME_STATUS'},launch,focus);expect(state.game.results).toHaveLength(1);
  await expect(handleGame({type:'GAME_NEXT',gameId:'wrong',round:0},launch,focus)).rejects.toThrow();
  await handleGame({type:'GAME_NEXT',gameId:'resume',round:0},launch,focus);expect(launch).toHaveBeenCalledTimes(1);expect(state.game.round).toBe(1);expect(state.game.phase).toBe('loading');
  vi.unstubAllGlobals();
 });
});

it('starts a timed round automatically on readiness and does not reset on repeated signals',async()=>{
 let state:any={version:1,game:newGame(pool,60,'automatic'),stats:emptyStatistics()};
 vi.stubGlobal('chrome',{storage:{local:{get:async()=>({'game.state.v1':structuredClone(state)}),set:async(value:any)=>{state=structuredClone(value['game.state.v1']);}}}});
 const clock=vi.spyOn(Date,'now').mockReturnValue(1000);
 const {handleGame}=await import('../src/background/game');
 await handleGame({type:'GAME_READY',gameId:'automatic',round:0,ready:false},vi.fn(),vi.fn());expect(state.game.phase).toBe('loading');
 await handleGame({type:'GAME_READY',gameId:'automatic',round:0,ready:true},vi.fn(),vi.fn());expect(state.game.phase).toBe('countdown');expect(state.game.revealAt).toBe(4000);expect(state.game.deadline).toBeNull();
 clock.mockReturnValue(3999);await handleGame({type:'GAME_STATUS'},vi.fn(),vi.fn());expect(state.game.phase).toBe('countdown');
 clock.mockReturnValue(4000);await handleGame({type:'GAME_STATUS'},vi.fn(),vi.fn());expect(state.game.phase).toBe('exploring');expect(state.game.deadline).toBe(64000);
 clock.mockReturnValue(5000);
 await handleGame({type:'GAME_READY',gameId:'automatic',round:0,ready:true},vi.fn(),vi.fn());expect(state.game.deadline).toBe(64000);
 clock.mockRestore();vi.unstubAllGlobals();
});

it('supports shorter and larger pools, custom timers, and ends at the chosen final round',()=>{
 let game=newGame(pool,95,'custom',Math.random,2);expect(gameView(game)?.roundCount).toBe(2);
 game=skipRound(game);expect(game.phase).toBe('result');game=skipRound(nextRound(game));expect(game.phase).toBe('complete');expect(game.results).toHaveLength(2);
 const larger=Array.from({length:12},(_,i)=>({id:String(i),name:String(i),lat:i,lng:i}));expect(newGame(larger,0,'large',Math.random,10).targets).toHaveLength(10);
 expect(()=>newGame(pool,95,'bad',Math.random,6)).toThrow();expect(()=>newGame(pool,-1,'bad')).toThrow();
});

it('randomises and persists starting headings instead of always facing north',()=>{
 const game=newGame(pool,0,'bearings',()=>.375);expect(game.targets.every(target=>target.heading===135)).toBe(true);expect(gameView(game)).not.toHaveProperty('targets');
});
