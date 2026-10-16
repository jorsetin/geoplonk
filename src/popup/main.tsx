import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { defaults, readSettings, SETTINGS_KEY, type Settings } from '../shared/settings';
import { parseHealth } from '../shared/status';
import './style.css';
function App() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadNeeded, setReloadNeeded] = useState(false);
  const [error, setError] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [status, setStatus] = useState('Checking Maps connection…');
  async function checkConnection(preferences = settings) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error();
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'CLEAN_VIEW_STATUS' });
      const health = parseHealth(result.health);
      const locks = ['disableMoving','disablePanning','disableZooming'].filter(key => preferences[key as keyof Settings]).length;
      setStatus(result.streetView ? `Street View connected · ${locks} locks selected` : 'Maps connected · Street View locks are waiting for a panorama');
      const messages: string[] = [];
      if (locks && !health.guardsReady) messages.push('Locks unavailable. Reload Maps to reconnect.');
      if (preferences.enabled && (preferences.hideStreetViewUi || preferences.hideSearch || preferences.hideCategories) && result.count === 0) messages.push('No interface controls recognised on this layout.');
      if (result.streetView) {
        if (preferences.enabled && preferences.hideRoadLabels) messages.push(health.roadsRecognised ? 'Road-name filter recognised.' : 'Road-name filter not recognised yet. Reload Maps; this layout may be unsupported.');
        if (preferences.enabled && preferences.hidePlaceMarkers) messages.push(health.placesRecognised ? 'Place-bubble filter recognised.' : 'Place-bubble filter not recognised yet; no supported markers may be visible.');
        if (preferences.disableMoving) messages.push(health.navigationRecognised ? 'Movement-indicator filter recognised.' : 'Movement indicators not recognised yet. The input lock remains independent.');
      }
      if (health.renderError) messages.push('An annotation filter encountered an unsupported renderer. Unknown drawing stays visible.');
      setFeatures(messages);
    } catch { setStatus('No Maps connection. Open Google Maps and reload the page, then reopen this popup.'); }
  }
  useEffect(() => { readSettings().then(value => { setSettings(value); setReady(true); void checkConnection(value); }).catch(() => setError('Settings could not be loaded. Reopen the extension to retry.')); }, []);
  async function save(next: Settings) {
    setBusy(true); setError('');
    try { await chrome.storage.local.set({ [SETTINGS_KEY]: next }); setReloadNeeded(value => value || (settings.enabled && settings.hideRoadLabels) !== (next.enabled && next.hideRoadLabels)); setSettings(next); await checkConnection(next); }
    catch { setError('Could not save. Your previous settings are still active.'); }
    finally { setBusy(false); }
  }
  async function reloadMaps() {
    setBusy(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url || !/^https:\/\/(www\.google\.com\/maps(?:\/|$)|maps\.google\.com\/)/.test(tab.url)) throw new Error();
      await chrome.tabs.reload(tab.id); setReloadNeeded(false); setStatus('Maps is reloading. Reopen the popup when it finishes.');
    } catch { setError('Open a supported Maps tab and reload it to apply road-name changes.'); }
    finally { setBusy(false); }
  }
  async function openExplorer() {
    setBusy(true); setError('');
    try {
      const result = await chrome.runtime.sendMessage({ type: 'EXPLORER_START' });
      if (!result?.ok) throw new Error(result?.error);
      window.close();
    } catch { setError('Could not open Random Explorer. Reload the extension and try again.'); }
    finally { setBusy(false); }
  }
  const labels: [keyof Settings, string, string][] = [
    ['enabled', 'Clean View', 'Hide selected interface elements. Locks work independently.'],
    ['disableMoving', 'Disable movement', 'Independent of Clean View. Looking around stays available.'],
    ['disablePanning', 'Disable panning', 'Prevent dragging and keyboard rotation.'],
    ['disableZooming', 'Disable zooming', 'Prevent wheel, pinch, double-click and keyboard zoom.'],
    ['hideStreetViewUi', 'Hide Street View interface', 'Hide location title, floor picker, minimap, compass and toolbar. Information panels have a separate toggle.'],
    ['hideStreetViewPanels', 'Hide Street View information panels', 'Hide the location information card. Google’s copyright and terms stay visible.'],
    ['hideRoadLabels', 'Hide road names · experimental', 'Reload Maps after changing this to rebuild cached road labels.'],
    ['hidePlaceMarkers', 'Hide place bubbles · experimental', 'Hide recognised Street View icons and their hover cards.'],
    ['hideSearch', 'Hide search controls', 'Keep the view clear while exploring.'],
    ['hideCategories', 'Hide category shortcuts', 'Hide recognised English category buttons.']
  ];
  return <main><button className="explore" disabled={!ready || busy} onClick={() => void openExplorer()}>Explore a random place</button><button className="explore" disabled={!ready || busy} onClick={() => { void chrome.tabs.create({url:chrome.runtime.getURL('game.html')}); window.close(); }}>Play Guess Mode</button><div className="recovery"><button disabled={!ready || busy} onClick={() => void save({ ...defaults })}>Restore everything</button><button disabled={!ready || busy} onClick={() => void reloadMaps()}>Reload Maps</button></div><section>{labels.map(([key, label, hint]) => <label key={key}><span><strong>{label}</strong><small>{hint}</small></span><input type="checkbox" checked={settings[key]} disabled={!ready || busy || (key !== 'enabled' && !key.startsWith('disable') && !settings.enabled)} onChange={e => void save({ ...settings, [key]: e.target.checked, ...(key === 'enabled' && e.target.checked && !settings.hideSearch && !settings.hideCategories ? { hideSearch: true, hideCategories: true } : {}) })}/></label>)}</section>{reloadNeeded && <p role="status">Reload Maps to rebuild road labels after this change.</p>}{error && <p role="alert" className="error">{error}</p>}<p role="status">{status}</p>{features.map(message => <p className="feature-status" key={message}>{message}</p>)}<footer>Settings stay on this device. Google logo stays visible. Information panels can be hidden. Locks are local interface controls, not anti-cheat protection.<br/><br/>Supports google.com Maps. Reload existing Maps tabs after installation.</footer></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
