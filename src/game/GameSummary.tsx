import {useState} from 'react';
import {GuessMap} from './GuessMap';
import type {RoundResult} from './model';

export function roundTime(seconds:number|undefined){
 if(seconds===undefined)return '—';
 return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
export function GameSummary({results,busy,onPlayAgain}:{results:RoundResult[];busy:boolean;onPlayAgain:()=>void}){
 const [selected,setSelected]=useState(0);
 const result=results[selected];
 const total=results.reduce((sum,round)=>sum+round.score,0);
 return <section className="game-summary" aria-labelledby="summary-title">
  <div className="summary-heading"><div><p className="summary-eyebrow">SINGLEPLAYER RESULTS</p><h1 id="summary-title">Game complete</h1><p>{results.length} {results.length===1?'round':'rounds'} played</p></div><div className="summary-total"><strong>{total.toLocaleString()}</strong><span> / {(results.length*5000).toLocaleString()} points</span></div></div>
  <div className="summary-content"><div className="summary-rounds"><h2>Your rounds</h2><p>Select a round to review your guess on the map.</p><div className="summary-table-wrap"><table><caption className="visually-hidden">Results for every round</caption><thead><tr><th scope="col">Round / location</th><th scope="col">Distance</th><th scope="col">Time</th><th scope="col">Score</th></tr></thead><tbody>{results.map((round,index)=><tr key={index} className={index===selected?'selected':''}><th scope="row"><button aria-pressed={index===selected} onClick={()=>setSelected(index)}><span className="summary-round-number">{index+1}</span><span>{round.destination.name}<small>{round.skipped?'Skipped':round.timedOut?'Time expired':round.guess?'Guess submitted':'No guess'}</small></span></button></th><td>{round.distanceKm===null?'—':`${round.distanceKm.toLocaleString(undefined,{maximumFractionDigits:1})} km`}</td><td>{roundTime(round.elapsedSeconds)}</td><td>{round.score.toLocaleString()}<small> / 5,000</small></td></tr>)}</tbody></table></div></div>
  {result&&<section className="summary-map" aria-label={`Round ${selected+1} map review`}><h2>Round {selected+1} · {result.destination.name}</h2><GuessMap key={selected} guess={result.guess} result={result} disabled onPick={()=>{}}/><p className="summary-legend">{result.guess&&<span>● Your guess</span>}<span>⚑ Starting location</span>{!result.guess&&<span>No guess was placed</span>}</p></section>}</div>
  <div className="summary-actions"><p>Your results are saved on this device.</p><button disabled={busy} onClick={onPlayAgain}>Play again →</button></div>
 </section>;
}
