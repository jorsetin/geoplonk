import {hideUnavailableNotice,unavailableNoticeCss} from './unavailable-notice';
import { findStreetView } from './dom';
import type { Settings } from '../shared/settings';
// Deliberately narrow, isolated website dependencies. Unknown layouts stay visible.
const categories = new Set(['Restaurants', 'Hotels', 'Things to do', 'Museums', 'Transit', 'Pharmacies', 'ATMs']);
const marker = 'data-open-map-companion-hidden';
const footerMarker='data-open-map-companion-footer-hidden';
const styleId = 'open-map-companion-style';
function visibleText(element: Element): string {
  if (element.getAttribute('aria-hidden') === 'true') return '';
  return [...element.childNodes].map(node => node.nodeType === 3 ? node.textContent ?? '' : node.nodeType === 1 ? visibleText(node as Element) : '').join('').trim();
}
export function applyCleanView(doc: Document, settings: Settings): number {
  if (!doc.getElementById(styleId)) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = `${unavailableNoticeCss} [${footerMarker}] { display: none !important; }
      [${marker}] { visibility: hidden !important; pointer-events: none !important; }
      [data-open-map-companion-streetview] .JHngof h1, [data-open-map-companion-streetview] .JHngof button { display: none !important; }
      [data-open-map-companion-streetview] .C5SiJf { width: fit-content !important; max-width: 300px !important; }
      [data-open-map-companion-streetview] .JHngof { padding: 8px !important; }`;
    (doc.head ?? doc.documentElement).append(style);
  }
  hideUnavailableNotice(doc,settings);
  const targets = new Set<Element>();
  const footerTargets = new Set<Element>();
  const immersive = settings.enabled && settings.hideStreetViewUi && !!findStreetView(doc);
  doc.documentElement.toggleAttribute('data-open-map-companion-streetview', immersive);
  if (settings.enabled) {
    const streetView = findStreetView(doc);
    if (streetView && settings.hideStreetViewUi) {
      // Observed Street View overlay containers. Never target scene canvases or credits.
      const selectors = [
        '[role="radiogroup"]:has(button[jsaction*="floorpicker.onFloorSelected"])',
        // The floor picker paints its background on the enclosing arrow-button panel.
        'div:has(> button[jsaction*="floorpicker.moveUp"]):has([role="radiogroup"] button[jsaction*="floorpicker.onFloorSelected"])',
        '[role="search"]', '.JHngof h1', '.JHngof button', '.TrU0dc', '.etWJQ',
        '.GyRqef', '.B5aTzc', '.WzvKIe', '.xUNLkc', '.F63Kk',
        '[jsaction*="compass.main"]', '[jsaction*="zoom.onPointerOut"]',
        'button[jsaction*="imageheader.share"]', 'button[jsaction*="imageheader.close"]',
        'button[jsaction*="titlecard.exit"]', 'button[jsaction*="titlecard.settings"]', 'button[jsaction*="titlecard.spotlight"]'
      ];
      for (const selector of selectors) for (const element of doc.querySelectorAll(selector)) {
        if (!element.querySelector('[role="contentinfo"], [data-attribution-url], img[src*="branding/mapslogo"], canvas') && !element.contains(streetView)) targets.add(element);
      }
    }
    if (streetView && settings.hideStreetViewUi) {
      const title = doc.querySelector('button[jsaction*="titlecard.exit"]')?.closest('[role="navigation"]');
      for (const heading of title?.querySelectorAll('h1') ?? []) targets.add(heading);
      const mini = doc.querySelector('[jsaction*="minimap.main"][aria-label]')?.parentElement;
      if (mini?.querySelector('button[jsaction*="minimap.split"]') && !mini.querySelector('[role="contentinfo"], img[src*="branding/mapslogo"], canvas')) targets.add(mini);
    }
    if (streetView && settings.hideStreetViewPanels) {
      const titlePanel = doc.querySelector('button[jsaction*="titlecard.exit"]')?.closest('[role="navigation"]');
      if (titlePanel && !titlePanel.querySelector('canvas, img[src*="branding/mapslogo"]')) targets.add(titlePanel);
      for (const element of doc.querySelectorAll('.C5SiJf')) {
        if (!element.contains(streetView) && !element.querySelector('canvas, img[src*="branding/mapslogo"]')) targets.add(element);
      }
    }
    if(streetView && settings.hideStreetViewUi){
      for(const info of doc.querySelectorAll('[role="contentinfo"]')){
        for(const child of info.children) if(/^Image capture:/.test(child.textContent?.trim()??'')) footerTargets.add(child);
        for(const country of info.querySelectorAll('[jsaction*="fineprint.country"]')) footerTargets.add(country);
        for(const report of info.querySelectorAll('a[href]')) {
          try {const url=new URL(report.getAttribute('href')!,doc.URL);if(url.hostname==='www.google.com' && url.pathname.startsWith('/local/imagery/report/'))footerTargets.add(report);}catch{ /* Unknown links stay visible. */ }
        }
      }
    }
    if (streetView && settings.hidePlaceMarkers) {
      for (const card of doc.querySelectorAll('[jsaction*="streetviewcard.pointerIn"]')) targets.add(card);
    }
    if (settings.hideSearch) {
      // Never hide the parent panel: it can contain attribution or navigation.
      const search = doc.querySelector('input#searchboxinput, form input[name="q"][role="combobox"]');
      if (search) {
        targets.add(search);
        // Current Maps uses a generated input ID and a separate visible label.
        for (const label of doc.querySelectorAll('label[for]')) {
          if (search.id && label.getAttribute('for') === search.id) targets.add(label);
        }
        const form = search.closest('form');
        const controls = form?.parentElement;
        if (controls) for (const button of controls.querySelectorAll('button[aria-label]')) {
          if (['Search', 'Directions'].includes(button.getAttribute('aria-label') ?? '') || /omnibox\.(search|showDirections)/.test(button.getAttribute('jsaction') ?? '')) targets.add(button);
        }
      }
      for (const id of ['searchbox-searchbutton', 'searchbox-directions']) {
        const button = doc.querySelector(`button#${id}`);
        if (button) targets.add(button);
      }
    }
    if (settings.hideCategories) {
      for (const button of doc.querySelectorAll('button')) {
        if (categories.has(button.getAttribute('aria-label') ?? visibleText(button)) && !button.querySelector('a, canvas, [role="img"]')) targets.add(button);
      }
    }
  }
  for(const element of doc.querySelectorAll(`[${footerMarker}]`)) if(!footerTargets.has(element))element.removeAttribute(footerMarker);
  for(const element of footerTargets)element.setAttribute(footerMarker,'');
  // Restore the native copyright/terms/shortcuts strip, including any selected ancestor.
  for (const element of targets) if (element.matches('[role="contentinfo"]') || element.querySelector('[role="contentinfo"]')) targets.delete(element);
  for (const element of doc.querySelectorAll(`[${marker}]`)) {
    if (!targets.has(element)) element.removeAttribute(marker);
  }
  for (const element of targets) if (!element.hasAttribute(marker)) element.setAttribute(marker, '');
  return targets.size + footerTargets.size;
}
