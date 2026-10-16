export const STATUS_ATTRIBUTE = 'data-open-map-companion-health';
export const STATUS_REQUEST = 'open-map-companion-status-request';
export type Health = { guardsReady: boolean; rendererReady: boolean; roadsRecognised: boolean; placesRecognised: boolean; navigationRecognised: boolean; renderError: boolean };
export function parseHealth(value: unknown): Health {
  const obj = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { guardsReady: obj.guardsReady === true, rendererReady: obj.rendererReady === true, roadsRecognised: obj.roadsRecognised === true, placesRecognised: obj.placesRecognised === true, navigationRecognised: obj.navigationRecognised === true, renderError: obj.renderError === true };
}
