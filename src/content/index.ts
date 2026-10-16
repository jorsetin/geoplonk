import {hideUnavailableNotice} from './unavailable-notice';
import { mountExplorer } from './explorer';
import { defaults, parseSettings, readSettings, SETTINGS_KEY } from '../shared/settings';
import { findStreetView } from './dom';
import { STATUS_ATTRIBUTE, STATUS_REQUEST, parseHealth } from '../shared/status';
import { applyCleanView } from './adapter';
let settings = { ...defaults };
let pending = false;
function refresh() {
  if(!document.documentElement)return;
  hideUnavailableNotice(document,settings);
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; applyCleanView(document, settings); });
}
// Child replacements and accessible label changes cover SPA rerenders without polling.
const observer = new MutationObserver(refresh);
observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label', 'id', 'role'] });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && SETTINGS_KEY in changes) {
    settings = parseSettings(changes[SETTINGS_KEY].newValue);
    refresh();
  }
});
readSettings().then(value => { settings = value; refresh(); }).catch(() => { settings = { ...defaults }; refresh(); });

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type !== 'CLEAN_VIEW_STATUS') return;
  // Read persisted settings so status cannot race a pending storage event.
  readSettings().then(value => {
    settings = value;
    const count = applyCleanView(document, settings);
    window.dispatchEvent(new Event(STATUS_REQUEST));
    let health = parseHealth(null);
    try { health = parseHealth(JSON.parse(document.documentElement.getAttribute(STATUS_ATTRIBUTE) ?? '{}')); } catch { /* Treat invalid page data as unknown. */ }
    respond({ enabled: settings.enabled, count, streetView: !!findStreetView(document), health });
  }).catch(() => respond({ enabled: false, count: 0 }));
  return true;
});

mountExplorer();
