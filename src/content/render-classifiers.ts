export const ROAD_FLAG = 'data-open-map-companion-road-labels';
export const PLACE_FLAG = 'data-open-map-companion-place-markers';
export function isRoadTextTexture(properties: { connected: boolean; width: number; height: number; font: string; fillStyle: unknown; strokeStyle: unknown }): boolean {
  // Observed text texture signature; unknown rendering styles fail open.
  return !properties.connected && properties.height === 128 && properties.width >= 128 && properties.width <= 4096
    && Number.isInteger(Math.log2(properties.width)) && properties.font === 'bold 80px Arial'
    && properties.fillStyle === 'rgba(255, 255, 255, 0.7)' && properties.strokeStyle === 'rgba(0, 0, 0, 0.15)';
}
const iconUniforms = ['matrixClipFromModel', 'modelToPixelScale', 'pivot', 'opacity', 'texCoordOffset', 'texCoordScale', 'iconSampler'];
export function isPlaceIconProgram(uniforms: string[], attributes: string[], shaders: string[]): boolean {
  return uniforms.length === iconUniforms.length && iconUniforms.every(name => uniforms.includes(name))
    && attributes.length === 1 && attributes[0] === 'vert'
    && shaders.length === 2 && shaders.some(s => /gl_Position/.test(s) && /matrixClipFromModel/.test(s) && /pivot/.test(s))
    && shaders.some(s => /gl_FragColor/.test(s) && /texture2D\s*\(\s*iconSampler/.test(s));
}

export function isNavigationProgram(uniforms: string[], attributes: string[], shaders: string[]): boolean {
  return uniforms.length === 2 && ['matrixClipFromModel','color'].every(name => uniforms.includes(name))
    && attributes.length === 1 && attributes[0] === 'vert'
    && shaders.length === 2 && shaders.some(s => /gl_Position/.test(s) && /matrixClipFromModel/.test(s) && /vert/.test(s))
    && shaders.some(s => /uniform\s+vec4\s+color/.test(s))
    && shaders.some(s => /gl_FragColor/.test(s)) && shaders.every(s => !/sampler|texture/i.test(s));
}
