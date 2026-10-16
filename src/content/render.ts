import {installMoveHistory} from './move-history';
const disposeMoveHistory=installMoveHistory(window,document);
import { installInteractionGuards } from './interaction';
import { findStreetView } from './dom';
import { STATUS_ATTRIBUTE, STATUS_REQUEST, type Health } from '../shared/status';
import { defaults } from '../shared/settings';
const disposeGuards = installInteractionGuards(document, () => ({ ...defaults, enabled: true, disableMoving: document.documentElement?.hasAttribute('data-open-map-companion-disablemoving') ?? false, disablePanning: document.documentElement?.hasAttribute('data-open-map-companion-disablepanning') ?? false, disableZooming: document.documentElement?.hasAttribute('data-open-map-companion-disablezooming') ?? false }));
import { isRoadTextTexture, isPlaceIconProgram, isNavigationProgram, ROAD_FLAG, PLACE_FLAG } from './render-classifiers';
const health: Health = { guardsReady: true, rendererReady: true, roadsRecognised: false, placesRecognised: false, navigationRecognised: false, renderError: false };
function report() { document.documentElement?.setAttribute(STATUS_ATTRIBUTE, JSON.stringify(health)); }
window.addEventListener(STATUS_REQUEST, report);
report();
// Runs in MAIN at document_start because detached text textures are created before
// document_idle. Uses standard drawing APIs only; never reads pixels or Maps state.
for (const method of ['fillText', 'strokeText'] as const) {
  const original = CanvasRenderingContext2D.prototype[method];
  Object.defineProperty(CanvasRenderingContext2D.prototype, method, {
    configurable: true, writable: true,
    value: function(this: CanvasRenderingContext2D, ...args: unknown[]) {
      if (findStreetView(document) && isRoadTextTexture({
        connected: this.canvas.isConnected, width: this.canvas.width, height: this.canvas.height,
        font: this.font, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle
      })) { health.roadsRecognised = true; if (document.documentElement?.hasAttribute(ROAD_FLAG)) return; }
      return Reflect.apply(original, this, args);
    }
  });
}
const currentPrograms = new WeakMap<WebGLRenderingContext, WebGLProgram | null>();
const classifications = new WeakMap<WebGLProgram, { place: boolean; navigation: boolean }>();
function shouldSkip(gl: WebGLRenderingContext): boolean {
  if (!(gl.canvas instanceof HTMLCanvasElement) || !findStreetView(document)?.contains(gl.canvas) || gl.isContextLost()) return false;
  const program = currentPrograms.has(gl) ? currentPrograms.get(gl)! : gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
  if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
  if (!classifications.has(program)) {
    const uniforms = Array.from({ length: gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number }, (_, i) => gl.getActiveUniform(program, i)?.name ?? '');
    const attributes = Array.from({ length: gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES) as number }, (_, i) => gl.getActiveAttrib(program, i)?.name ?? '');
    const shaders = gl.getAttachedShaders(program)?.map(shader => gl.getShaderSource(shader) ?? '') ?? [];
    classifications.set(program, { place: isPlaceIconProgram(uniforms, attributes, shaders), navigation: isNavigationProgram(uniforms, attributes, shaders) });
  }
  const kind = classifications.get(program)!;
  health.placesRecognised ||= kind.place; health.navigationRecognised ||= kind.navigation;
  return (document.documentElement.hasAttribute(PLACE_FLAG) && kind.place) || (document.documentElement.hasAttribute('data-open-map-companion-disablemoving') && kind.navigation);
}
for (const proto of [WebGLRenderingContext.prototype, ...(typeof WebGL2RenderingContext !== 'undefined' ? [WebGL2RenderingContext.prototype] : [])]) {
  const use = proto.useProgram;
  if (typeof use === 'function') Object.defineProperty(proto,'useProgram',{configurable:true,writable:true,value:function(this:WebGLRenderingContext,program:WebGLProgram|null){const result=Reflect.apply(use,this,[program]);currentPrograms.set(this,program);return result;}});
  const link = proto.linkProgram;
  Object.defineProperty(proto, 'linkProgram', { configurable: true, writable: true, value: function(this: WebGLRenderingContext, program: WebGLProgram) { classifications.delete(program); return Reflect.apply(link,this,[program]); } });
  for (const method of ['drawArrays', 'drawElements'] as const) {
    const original = proto[method];
    Object.defineProperty(proto, method, { configurable: true, writable: true, value: function(this: WebGLRenderingContext, ...args: number[]) {
      try { if (shouldSkip(this)) return; }
      catch { health.renderError = true; /* Unknown or lost rendering contexts fail open. */ }
      return Reflect.apply(original, this, args);
    } });
  }
}

export function disposeRenderingGuards() { disposeMoveHistory(); disposeGuards(); window.removeEventListener(STATUS_REQUEST,report); }
