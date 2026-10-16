import type {Settings} from '../shared/settings';
const marker='data-geoplonk-unavailable-notice';
export const unavailableNoticeCss=`[${marker}]{display:none!important}`;
// Ignore only this stale native notice; never hide a scene, attribution or other alerts.
export function hideUnavailableNotice(doc:Document,settings:Settings):void {
 const game=!!doc.querySelector('#open-map-companion-explorer[data-game]');
 const targets=new Set<Element>();
 if(game||(settings.enabled&&settings.hideStreetViewUi)){
  for(const leaf of doc.querySelectorAll('div,span')){
   if(leaf.children.length||leaf.textContent?.trim()!=='No Street View imagery available here.')continue;
   let target:Element=leaf;
   for(let parent=leaf.parentElement,depth=0;parent&&depth<6;parent=parent.parentElement,depth++){
    if(parent===doc.body||parent===doc.documentElement||parent.querySelector('canvas,[role="application"],[role="contentinfo"],[data-attribution-url],img[src*="branding/mapslogo"]'))break;
    const rest=(parent.textContent??'').replace('No Street View imagery available here.','').trim();
    if(rest&&!/^(?:Close|Dismiss|[×x✕])$/i.test(rest))break;
    target=parent;
   }
   targets.add(target);
  }
 }
 for(const old of doc.querySelectorAll(`[${marker}]`))if(!targets.has(old))old.removeAttribute(marker);
 for(const target of targets)if(!target.hasAttribute(marker))target.setAttribute(marker,'');
}
