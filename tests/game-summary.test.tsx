// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,test,vi} from 'vitest';
import {GameSummary} from '../src/game/GameSummary';
import type {RoundResult} from '../src/game/model';
vi.mock('../src/game/GuessMap',()=>({GuessMap:({result,guess,disabled}:any)=><div data-testid="review-map" data-location={result.destination.name} data-guess={JSON.stringify(guess)} data-locked={disabled}/> }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const results:RoundResult[]=[
 {destination:{id:'a',name:'Lisbon',lat:38.7,lng:-9.1},guess:{lat:40,lng:-8},distanceKm:173.46,score:4585,timedOut:false,elapsedSeconds:75},
 {destination:{id:'b',name:'Tokyo',lat:35.6,lng:139.7},guess:null,distanceKm:null,score:0,timedOut:true,elapsedSeconds:120},
 {destination:{id:'c',name:'Lima',lat:-12,lng:-77},guess:null,distanceKm:null,score:0,timedOut:false,skipped:true}
];
test('completion lists every round, keeps missing data distinct, and reviews the selected result without playing again',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),play=vi.fn();
 await act(async()=>root.render(<GameSummary results={results} busy={false} onPlayAgain={play}/>));
 expect(host.textContent).toContain('Game complete');expect(host.textContent).toContain('15,000 points');expect(host.textContent).toContain('4,585');
 const rows=host.querySelectorAll('tbody tr');expect(rows).toHaveLength(3);expect(rows[0].textContent).toContain('173.5 km');expect(rows[0].textContent).toContain('1:15');expect(rows[1].textContent).toContain('Time expired');expect(rows[2].textContent).toContain('Skipped');expect(rows[2].querySelectorAll('td')[1].textContent).toBe('—');
 await act(async()=>rows[1].querySelector('button')!.click());
 expect(host.querySelector('[data-testid=review-map]')!.getAttribute('data-location')).toBe('Tokyo');expect(host.querySelector('[data-testid=review-map]')!.getAttribute('data-guess')).toBe('null');expect(host.querySelector('[data-testid=review-map]')!.getAttribute('data-locked')).toBe('true');expect(rows[1].querySelector('button')!.getAttribute('aria-pressed')).toBe('true');expect(play).not.toHaveBeenCalled();
 await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Play again'))!.click());expect(play).toHaveBeenCalledOnce();
 await act(async()=>root.unmount());host.remove();
});
test('a single-round game has the right maximum and prevents duplicate restarts while busy',async()=>{
 const host=document.createElement('div'),root=createRoot(host),play=vi.fn();
 await act(async()=>root.render(<GameSummary results={[results[0]]} busy onPlayAgain={play}/>));
 expect(host.textContent).toContain('1 round played');expect(host.textContent).toContain('5,000 points');
 const button=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Play again'))!;expect(button.disabled).toBe(true);button.click();expect(play).not.toHaveBeenCalled();
 await act(async()=>root.unmount());
});
