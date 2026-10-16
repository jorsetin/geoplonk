import type { Destination } from '../explorer/destinations';
export type Point = { lat: number; lng: number };
export type RoundResult = { destination: Destination; guess: Point | null; distanceKm: number | null; score: number; timedOut: boolean; skipped?: boolean; elapsedSeconds?: number };
export type Game = { version: 1; id: string; phase: 'loading' | 'countdown' | 'exploring' | 'result' | 'complete'; round: number; targets: Destination[]; duration: number; deadline: number | null; guess: Point | null; results: RoundResult[]; sceneReady: boolean; revealAt?: number | null; startedAt?: number | null };
export type Statistics = { games: number; totalScore: number; best: number; recent: { id: string; score: number; finishedAt: number }[] };
export const emptyStatistics = (): Statistics => ({ games: 0, totalScore: 0, best: 0, recent: [] });
export function validPoint(value: unknown): value is Point {
 const point=value as Point | null; return !!point && Number.isFinite(point.lat) && Math.abs(point.lat)<=90 && Number.isFinite(point.lng) && Math.abs(point.lng)<=180;
}
export function distanceKm(a: Point, b: Point): number {
 if(!validPoint(a)||!validPoint(b)) throw Error('Invalid coordinate');
 const rad=Math.PI/180, dLat=(b.lat-a.lat)*rad, dLng=(b.lng-a.lng)*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
 return 6371.0088*2*Math.atan2(Math.sqrt(Math.min(1,Math.max(0,h))),Math.sqrt(Math.max(0,1-h)));
}
export const scoreDistance = (km: number) => {
 if(!Number.isFinite(km)||km<0) throw Error('Invalid distance');
 return Math.max(0,Math.min(5000,Math.round(5000*Math.exp(-km/2000))));
};
export function newGame(pool: readonly Destination[], duration: number, id: string, random=Math.random, rounds=5): Game {
 if(!pool.every(validPoint))throw Error('Invalid destination coordinate.');
 if(!Number.isInteger(duration)||duration<0||duration>3600)throw Error('Choose a timer between 0 and 3,600 seconds.');
 if(!Number.isInteger(rounds)||rounds<1||rounds>pool.length||new Set(pool.map(item=>item.id)).size<rounds)throw Error('Choose a round count within the available unique places.');
 const targets=[...pool];
 for(let i=targets.length-1;i>0;i--){const r=random();if(r<0||r>=1||!Number.isFinite(r))throw Error('Invalid random value');const j=Math.floor(r*(i+1));[targets[i],targets[j]]=[targets[j],targets[i]];}
 return {version:1,id,phase:'loading',round:0,targets:targets.slice(0,rounds).map(target=>{const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw Error('Invalid random value');return {...target,heading:Math.floor(r*360)};}),duration,deadline:null,guess:null,results:[],sceneReady:false,revealAt:null,startedAt:null};
}
export function beginRound(game: Game, now: number): Game {
 if((game.phase!=='loading'&&game.phase!=='countdown')||!game.sceneReady|| (game.phase==='countdown'&&now<(game.revealAt??Infinity)))throw Error('The panorama is still loading.');
 const start=game.revealAt??now;
 return {...game,phase:'exploring',startedAt:start,revealAt:null,deadline:game.duration?start+game.duration*1000:null};
}
export function submitRound(game: Game, now: number, timeout=false): Game {
 if(game.phase!=='exploring')throw Error('This round has already ended.');
 const timedOut=timeout || (game.deadline!==null&&now>=game.deadline);
 if(!timedOut&&!validPoint(game.guess))throw Error('Choose a point on the map first.');
 const distance=game.guess?distanceKm(game.guess,game.targets[game.round]):null;
 const result:RoundResult={destination:game.targets[game.round],guess:game.guess,distanceKm:distance,score:distance===null?0:scoreDistance(distance),timedOut,elapsedSeconds:Math.max(0,Math.round((Math.min(now,game.deadline??now)-(game.startedAt??now))/1000))};
 return {...game,phase:game.round===game.targets.length-1?'complete':'result',deadline:null,results:[...game.results,result]};
}
export function nextRound(game: Game): Game {
 if(game.phase!=='result')throw Error('Finish the current round first.');
 return {...game,round:game.round+1,phase:'loading',guess:null,deadline:null,sceneReady:false,revealAt:null,startedAt:null};
}
export function totalScore(game: Game): number {return game.results.reduce((sum,result)=>sum+result.score,0);}
export function recordCompletion(stats: Statistics, game: Game, now: number): Statistics {
 if(game.phase!=='complete')throw Error('Game is unfinished.');
 if(stats.recent.some(item=>item.id===game.id))return stats;
 const score=totalScore(game);
 return {games:stats.games+1,totalScore:stats.totalScore+score,best:Math.max(stats.best,score),recent:[{id:game.id,score,finishedAt:now},...stats.recent].slice(0,100)};
}
export function gameView(game: Game | null) {
 if(!game)return null;
 const {targets,sceneReady,...view}=game;
 return {...view,sceneReady,roundCount:targets.length};
}

export function skipRound(game: Game): Game {
 if(game.phase!=='loading'&&game.phase!=='countdown'&&game.phase!=='exploring')throw Error('This round has already ended.');
 const result:RoundResult={destination:game.targets[game.round],guess:null,distanceKm:null,score:0,timedOut:false,skipped:true};
 return {...game,phase:game.round===game.targets.length-1?'complete':'result',guess:null,deadline:null,results:[...game.results,result]};
}
