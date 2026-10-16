// Google-specific markup lives here; no private JavaScript objects are accessed.
export const SCENE_SELECTOR = '[role="application"][aria-label="Street View"], [role="application"][jsaction*="scene.viewport"]';
export function findStreetView(doc: Document): Element | null {
  const branded = doc.querySelector('[role="application"][aria-label="Street View"]');
  if (branded) return branded;
  const normalised = [...doc.querySelectorAll('[role="application"][aria-label]')].find(e => (e.getAttribute('aria-label') ?? '').replace(/\s+/g,' ').trim() === 'Street View');
  if (normalised) return normalised;
  // Localised labels: require a second independent Street View title-card signal.
  if (!/@[^/]*,[\d.]+y,[-\d.]+h,[-\d.]+t/.test(doc.URL) || !/!1e1(?:!|$)/.test(doc.URL) || !doc.querySelector('button[jsaction*="titlecard.exit"]')) return null;
  return doc.querySelector('[role="application"][jsaction*="scene.viewport"]:has(canvas)');
}
export function sceneForTarget(doc: Document, target: Element): Element | null {
  const scene = findStreetView(doc);
  return scene?.contains(target) ? scene : null;
}
export function nativeControlKind(target: Element): 'zoom' | 'pan' | 'move' | null {
  const control = target.closest('[jsaction]');
  const action = control?.getAttribute('jsaction') ?? '';
  if (/zoom\.onZoom|zoom\.onShow|zoom\.onHide|minimap\.zoom/.test(action) || target.closest('.B5aTzc')) return 'zoom';
  if (/compass\./.test(action) || target.closest('.GyRqef')) return 'pan';
  if (/minimap\.|titlecard\.exit|imageheader\.close/.test(action) || target.closest('.F63Kk')) return 'move';
  return null;
}

export function streetViewUnavailable(doc: Document): boolean {
  // Ignore stale offscreen live-region announcements after successful loading.
  return [...doc.querySelectorAll('div, span')].some(element => {
    if (element.children.length || element.textContent !== 'No Street View imagery available here.') return false;
    const bounds=element.getBoundingClientRect();
    const style=doc.defaultView?.getComputedStyle(element);
    return bounds.width>1 && bounds.height>1 && bounds.bottom>0 && bounds.right>0 && bounds.top<(doc.defaultView?.innerHeight??0) && style?.visibility!=='hidden' && style?.display!=='none';
  });
}
