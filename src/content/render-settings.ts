import './explorer-title';
import { readSettings, parseSettings, SETTINGS_KEY, defaults, type Settings } from '../shared/settings';
import { ROAD_FLAG, PLACE_FLAG } from './render-classifiers';
function publish(settings: Settings) {
  if (!document.documentElement) {
    const observer = new MutationObserver(() => {
      if (document.documentElement) { observer.disconnect(); publish(settings); }
    });
    observer.observe(document, { childList: true });
    return;
  }
  for (const key of ['disableMoving', 'disablePanning', 'disableZooming'] as const) document.documentElement.toggleAttribute(`data-open-map-companion-${key.toLowerCase()}`, settings[key]);
  document.documentElement.toggleAttribute(ROAD_FLAG, settings.enabled && settings.hideRoadLabels);
  document.documentElement.toggleAttribute(PLACE_FLAG, settings.enabled && settings.hidePlaceMarkers);
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && SETTINGS_KEY in changes) { revision++; publish(parseSettings(changes[SETTINGS_KEY].newValue)); }
});
let revision = 0;
const initialRevision = revision;
readSettings().then(settings => { if (revision === initialRevision) publish(settings); }).catch(() => { if (revision === initialRevision) publish(defaults); });
