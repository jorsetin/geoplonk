import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import './smooth-wheel.js';
import type { Point, RoundResult } from './model';
import 'leaflet/dist/leaflet.css';
// Retry only a failed image, using another Google tile host and standard scale.
export class RetryingTileLayer extends L.TileLayer {
 createTile(coords:L.Coords,done:L.DoneCallback):HTMLElement {
  const tile=document.createElement('img');tile.alt='';tile.setAttribute('role','presentation');
  let attempt=0;
  const source=()=>{const url=new URL(this.getTileUrl(coords));if(attempt){url.hostname=`mt${(coords.x+coords.y+attempt)%4}.google.com`;url.searchParams.set('scale','1');}return url.href;};
  tile.onload=()=>done(undefined,tile);
  tile.onerror=()=>{if(++attempt<3)tile.src=source();else done(new Error('Tile unavailable'),tile);};
  tile.src=source();return tile;
 }
}
export function GuessMap({guess,result,onPick,disabled}: {guess:Point|null;result?:RoundResult;onPick:(point:Point)=>void;disabled:boolean}) {
 const container=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),pick=useRef(onPick),locked=useRef(disabled),markers=useRef<L.LayerGroup|null>(null),resultRef=useRef(result);
 const [error,setError]=useState('');
 pick.current=onPick;locked.current=disabled;resultRef.current=result;
 useEffect(()=>{
  const instance=L.map(container.current!,{minZoom:1,maxZoom:20,scrollWheelZoom:false,smoothWheelZoom:true,smoothSensitivity:1.5,zoomSnap:0,maxBounds:[[-85,-180],[85,180]],maxBoundsViscosity:1,zoomAnimation:false,fadeAnimation:false}).setView([20,0],1);
  instance.attributionControl.setPrefix(false);
  // Same keyless roadmap tile source used by WorldGuessr; not a documented Google API.
  const tiles=new RetryingTileLayer(`https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&scale=${window.devicePixelRatio>1?2:1}`,{subdomains:['0','1','2','3'],bounds:[[-85.05112878,-180],[85.05112878,180]],maxZoom:20,noWrap:true,keepBuffer:0,updateWhenIdle:true,updateWhenZooming:false,attribution:'&copy; <a href="https://maps.google.com/" target="_blank" rel="noreferrer">Google</a> · <a href="https://www.google.com/help/terms_maps/" target="_blank" rel="noreferrer">Terms</a>'}).addTo(instance);
  let loaded=0,failed=0;
  tiles.on('loading',()=>{loaded=0;failed=0;setError('');});
  tiles.on('tileload',()=>{loaded++;setError('');});
  tiles.on('tileerror',()=>{failed++;});
  tiles.on('load',()=>{if(failed>0&&loaded===0&&![...(tiles.getContainer()?.querySelectorAll('img')??[])].some(image=>image.complete&&image.naturalWidth>0))setError('Map tiles are unavailable. Retry the map or check your connection.');}); 
  instance.createPane('land'); instance.getPane('land')!.style.zIndex='300';
  map.current=instance;markers.current=L.layerGroup().addTo(instance);
  instance.on('click',(event:L.LeafletMouseEvent)=>{if(!locked.current)pick.current({lat:event.latlng.lat,lng:Math.max(-180,Math.min(180,event.latlng.lng))});});
  const enter=(event:KeyboardEvent)=>{if(event.key==='Enter'&&!locked.current){event.preventDefault();const centre=instance.getCenter();pick.current({lat:centre.lat,lng:Math.max(-180,Math.min(180,centre.lng))});}};
  container.current!.addEventListener('keydown',enter);
  const resize=new ResizeObserver(()=>{instance.invalidateSize();const shown=resultRef.current;if(shown?.guess)instance.fitBounds([[shown.guess.lat,shown.guess.lng],[shown.destination.lat,shown.destination.lng]],{padding:[60,100],maxZoom:5});});resize.observe(container.current!);
  return ()=>{container.current?.removeEventListener('keydown',enter);resize.disconnect();instance.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  const layer=markers.current,instance=map.current;if(!layer||!instance)return;
  layer.clearLayers();
  if(guess)L.marker([guess.lat,guess.lng],{icon:L.divIcon({className:'guess-pin',html:'●',iconSize:[26,26],iconAnchor:[13,13]})}).bindTooltip('Your guess').addTo(layer);
  if(result){const target=result.destination;L.marker([target.lat,target.lng],{icon:L.divIcon({className:'answer-pin',html:'⚑',iconSize:[30,30],iconAnchor:[15,15]})}).bindTooltip('Starting location').addTo(layer);
   if(guess){const shifted={...target};while(shifted.lng-guess.lng>180)shifted.lng-=360;while(shifted.lng-guess.lng< -180)shifted.lng+=360;L.polyline([[guess.lat,guess.lng],[shifted.lat,shifted.lng]],{color:'#b18a36',dashArray:'5 5'}).addTo(layer);instance.fitBounds([[guess.lat,guess.lng],[target.lat,target.lng]],{padding:[24,24],maxZoom:5});}else instance.setView([target.lat,target.lng],4);
  }
 },[guess?.lat,guess?.lng,result?.destination.lat,result?.destination.lng]);
 return <><div ref={container} className="guess-map" role="application" aria-label={result?'Round review map. Arrow keys pan, plus and minus zoom.':'Guessing map. Arrow keys pan, plus and minus zoom, Enter places your guess at the centre.'}/><div className="map-help"><span>Google roadmap</span><button disabled={disabled} onClick={()=>{const centre=map.current?.getCenter();if(centre)onPick({lat:centre.lat,lng:Math.max(-180,Math.min(180,centre.lng))});}}>Guess at map centre</button></div>{error&&<p role="alert">{error} <button onClick={()=>{setError('');map.current?.eachLayer(layer=>{if(layer instanceof L.TileLayer)layer.redraw();});}}>Retry map</button></p>}</>;
}
