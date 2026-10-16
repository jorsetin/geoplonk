export const SETTINGS_KEY = 'cleanView.v1';
export const defaults = { enabled: false, hideSearch: true, hideCategories: true, hideStreetViewUi: true, hideStreetViewPanels: true, hideRoadLabels: true, hidePlaceMarkers: true, disableMoving: false, disablePanning: false, disableZooming: false };
export type Settings = typeof defaults;
export function parseSettings(value: unknown): Settings {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof input[key] === 'boolean' ? input[key] : fallback])) as Settings;
}
export async function readSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return parseSettings(stored[SETTINGS_KEY]);
}
