import { expect, test } from 'vitest';
import { isRoadTextTexture, isPlaceIconProgram, isNavigationProgram } from '../src/content/render-classifiers';
const placeShaders = ['void main(){gl_Position=matrixClipFromModel*vec4(pivot,1);}', 'uniform sampler2D iconSampler; void main(){gl_FragColor=texture2D(iconSampler,a);}'];
const navShaders = ['void main(){gl_Position=matrixClipFromModel*vec4(vert,1);}', 'uniform vec4 color; void main(){gl_FragColor=color;}'];
const road = { connected: false, width: 512, height: 128, font: 'bold 80px Arial', fillStyle: 'rgba(255, 255, 255, 0.7)', strokeStyle: 'rgba(0, 0, 0, 0.15)' };
test('road texture classifier fails open on ordinary text and other canvases', () => {
 expect(isRoadTextTexture(road)).toBe(true);
 for (const change of [{connected:true},{height:256},{width:511},{font:'12px Arial'},{fillStyle:'white'},{strokeStyle:'black'}]) expect(isRoadTextTexture({...road,...change})).toBe(false);
});
test('place icon shader classifier leaves panorama and navigation programs alone', () => {
 const names = ['matrixClipFromModel','modelToPixelScale','pivot','opacity','texCoordOffset','texCoordScale','iconSampler'];
 expect(isPlaceIconProgram(names,['vert'],placeShaders)).toBe(true);
 expect(isPlaceIconProgram(['b','e','f','g'],['c','d'],placeShaders)).toBe(false);
 expect(isPlaceIconProgram(['c','e','f'],['a','b'],placeShaders)).toBe(false);
 expect(isPlaceIconProgram([...names,'extra'],['vert'],placeShaders)).toBe(false);
});

test('navigation shader filter excludes imagery and place-icon shaders', () => {
 expect(isNavigationProgram(['matrixClipFromModel','color'],['vert'],navShaders)).toBe(true);
 expect(isNavigationProgram(['b','e','f','g'],['c','d'],navShaders)).toBe(false);
 expect(isNavigationProgram(['matrixClipFromModel','color','iconSampler'],['vert'],navShaders)).toBe(false);
});

test('shader names alone cannot suppress unrelated drawing', () => {
 expect(isNavigationProgram(['matrixClipFromModel','color'],['vert'],placeShaders)).toBe(false);
 expect(isPlaceIconProgram(['matrixClipFromModel','modelToPixelScale','pivot','opacity','texCoordOffset','texCoordScale','iconSampler'],['vert'],navShaders)).toBe(false);
});

test('navigation colour can be passed through a vertex varying without sampling imagery',()=>{
 expect(isNavigationProgram(['matrixClipFromModel','color'],['vert'],['uniform vec4 color; void main(){a=color;gl_Position=matrixClipFromModel*vec4(vert,1);}','void main(){gl_FragColor=a;}'])).toBe(true);
});
