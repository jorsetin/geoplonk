import type { Settings } from '../shared/settings';
import { findStreetView, sceneForTarget, nativeControlKind } from './dom';
export type Locks = Pick<Settings, 'disableMoving' | 'disablePanning' | 'disableZooming'>;
const types = ['click','dblclick','pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','mousedown','mousemove','mouseup','touchstart','touchmove','touchend','touchcancel','wheel','mousewheel','DOMMouseScroll','keydown','keyup'];
type Gesture = { source: Event; target: Element; scene: Element; x: number; y: number; lastX: number; lastY: number; started: boolean; moved: boolean };
export function installInteractionGuards(doc: Document, getSettings: () => Locks): () => void {
  const win = doc.defaultView!;
  const gestures = new Map<string, Gesture>();
  let replaying = false;
  let suppressClick = false;
  let pinch = false;
  let previous = '';
  const signature = (s: Locks) => `${s.disableMoving}/${s.disablePanning}/${s.disableZooming}`;
  function replay(gesture: Gesture, type = gesture.source.type) {
    const source = gesture.source as PointerEvent;
    const init = { view:source.view, detail:source.detail, pressure:source.pressure, width:source.width, height:source.height, tiltX:source.tiltX, tiltY:source.tiltY, twist:source.twist, tangentialPressure:source.tangentialPressure, bubbles:true, cancelable:true, composed:true, clientX:gesture.lastX, clientY:gesture.lastY, screenX:source.screenX, screenY:source.screenY, button:source.button, buttons:type.endsWith('up') || type.endsWith('cancel') ? 0 : source.buttons, shiftKey:source.shiftKey, ctrlKey:source.ctrlKey, altKey:source.altKey, metaKey:source.metaKey, pointerId:source.pointerId, pointerType:source.pointerType, isPrimary:source.isPrimary };
    let clone: Event;
    if (type.startsWith('touch')) {
      const touch = gesture.source as TouchEvent;
      clone = new TouchEvent(type,{bubbles:true,cancelable:true,composed:true,touches:type==='touchcancel'?[]:Array.from(touch.touches),targetTouches:type==='touchcancel'?[]:Array.from(touch.targetTouches),changedTouches:Array.from(touch.changedTouches)});
    } else clone = type.startsWith('pointer') && typeof PointerEvent !== 'undefined' ? new PointerEvent(type,init) : new MouseEvent(type,init);
    replaying = true;
    try { gesture.target.dispatchEvent(clone); } finally { replaying = false; }
  }
  function reset() {
    for (const gesture of gestures.values()) if (gesture.started) {
      try { replay(gesture, gesture.source.type.startsWith('pointer') ? 'pointercancel' : gesture.source.type.startsWith('touch') ? 'touchcancel' : 'mouseup'); } catch { /* Removed scenes cannot receive cleanup. */ }
    }
    gestures.clear(); suppressClick = false; pinch = false;
  }
  function reconcile() {
    const next = signature(getSettings());
    if (next !== previous || [...gestures.values()].some(g => !doc.contains(g.scene))) reset();
    previous = next;
  }
  function stop(event: Event, prevent = true) { if (prevent) event.preventDefault(); event.stopImmediatePropagation(); }
  const guard = (event: Event) => {
    if (replaying) return;
    reconcile();
    const s = getSettings();
    const target = event.composedPath().find(node => node instanceof Element) as Element | undefined;
    if (!target) return;
    const scene = sceneForTarget(doc, target);
    const pointer = event as PointerEvent;
    const isTouch = event.type.startsWith('touch');
    const family = event.type.startsWith('pointer') || event.type === 'lostpointercapture' ? `pointer:${pointer.pointerId ?? 0}` : isTouch ? 'touch' : 'mouse';
    const gesture = gestures.get(family);
    if (event.type.endsWith('cancel') || event.type === 'lostpointercapture') {
      if (gesture) { if (!gesture.started) stop(event); gestures.delete(family); }
      pinch = false; suppressClick = false; return;
    }
    const continuing = !!gesture && ['pointermove','pointerup','mousemove','mouseup','touchmove','touchend'].includes(event.type);
    if (!scene && !continuing) {
      if (!findStreetView(doc)) return;
      const kind = nativeControlKind(target);
      if ((kind === 'zoom' && s.disableZooming) || (kind === 'pan' && s.disablePanning) || (kind === 'move' && s.disableMoving)) stop(event);
      return;
    }
    if (event.type === 'keydown' || event.type === 'keyup') {
      const key = event as KeyboardEvent;
      if ((s.disableMoving && !key.shiftKey && ['ArrowUp','ArrowDown','w','W','s','S'].includes(key.key))
        || (s.disablePanning && (['ArrowLeft','ArrowRight','a','A','d','D'].includes(key.key) || (key.shiftKey && ['ArrowUp','ArrowDown'].includes(key.key))))
        || (s.disableZooming && ['+','-','=','_','Add','Subtract','PageUp','PageDown'].includes(key.key))) stop(event);
      return;
    }
    if (['wheel','mousewheel','DOMMouseScroll'].includes(event.type)) { if (s.disableZooming) stop(event); return; }
    if (event.type === 'click') { if (s.disableMoving || suppressClick) stop(event); suppressClick = false; return; }
    if (event.type === 'dblclick') { if (s.disableMoving || s.disableZooming || suppressClick) stop(event); return; }
    const touch = event as TouchEvent;
    if (isTouch && touch.touches.length > 1) {
      pinch = true;
      if (s.disableZooming) { reset(); pinch = true; stop(event); }
      return;
    }
    if (isTouch && pinch) {
      if (s.disableZooming) stop(event);
      if (touch.touches.length === 0) { reset(); }
      return;
    }
    if (!s.disableMoving && !s.disablePanning && !gesture) return;
    const down = event.type.endsWith('down') || event.type === 'touchstart';
    const move = event.type.endsWith('move');
    const up = event.type.endsWith('up') || event.type === 'touchend';
    const point = isTouch ? (touch.changedTouches[0] ?? touch.touches[0]) : pointer;
    if (!point) return;
    if (down && scene) {
      suppressClick = false;
      if (gesture?.started) replay(gesture, family.startsWith('pointer') ? 'pointercancel' : isTouch ? 'touchcancel' : 'mouseup');
      gestures.set(family,{source:event,target,scene,x:point.clientX,y:point.clientY,lastX:point.clientX,lastY:point.clientY,started:false,moved:false});
      // Preserve compatibility mouse events while preventing native gesture start.
      stop(event,false); return;
    }
    if (!gesture) { if ((up && s.disableMoving) || (move && s.disablePanning && (isTouch || pointer.buttons !== 0))) stop(event); return; }
    gesture.lastX = point.clientX; gesture.lastY = point.clientY;
    gesture.moved ||= Math.hypot(point.clientX-gesture.x,point.clientY-gesture.y) >= 4;
    const start = () => {
      if (gesture.started) return;
      const x=gesture.lastX,y=gesture.lastY; gesture.lastX=gesture.x;gesture.lastY=gesture.y;
      try { replay(gesture); gesture.started=true; } finally { gesture.lastX=x;gesture.lastY=y; }
    };
    if (move && (isTouch || pointer.buttons !== 0)) {
      if (!s.disablePanning && gesture.moved) start();
      if (!gesture.started || s.disablePanning) stop(event);
    }
    if (up) {
      if (!gesture.moved && !s.disableMoving && scene) start();
      if (!gesture.started) stop(event);
      suppressClick ||= gesture.moved;
      gestures.delete(family);
    }
  };
  for (const type of types) win.addEventListener(type,guard,{capture:true,passive:false});
  const blur = () => reset();
  const visibility = () => { if (doc.hidden) reset(); };
  win.addEventListener('blur',blur); win.addEventListener('pagehide',blur); doc.addEventListener('visibilitychange',visibility);
  const observer = new MutationObserver(reconcile);
  observer.observe(doc,{childList:true,subtree:true,attributes:true,attributeFilter:['data-open-map-companion-disablemoving','data-open-map-companion-disablepanning','data-open-map-companion-disablezooming']});
  return () => { reset(); observer.disconnect(); for (const type of types) win.removeEventListener(type,guard,true); win.removeEventListener('blur',blur);win.removeEventListener('pagehide',blur);doc.removeEventListener('visibilitychange',visibility); };
}
