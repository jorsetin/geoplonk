// @vitest-environment jsdom
import { expect,test,vi } from 'vitest';
import { PLACE_FLAG,ROAD_FLAG } from '../src/content/render-classifiers';
import { STATUS_ATTRIBUTE,STATUS_REQUEST } from '../src/shared/status';
test('render wrappers preserve unknown draws, invalidate relinked programs and fail open on context errors',async()=>{
 document.body.innerHTML='<div role="application" aria-label="Street View"><canvas></canvas></div>';
 const canvas=document.querySelector('canvas')!;
 const navSources=['uniform vec4 color;void main(){a=color;gl_Position=matrixClipFromModel*vec4(vert,1);}','void main(){gl_FragColor=a;}'];
 type Program={uniforms:string[];attributes:string[];sources:string[]};
 class FakeGL {
  canvas=canvas;CURRENT_PROGRAM=1;ACTIVE_UNIFORMS=2;ACTIVE_ATTRIBUTES=3;LINK_STATUS=4;calls=0;lost=false;broken=false;
  program:Program={uniforms:['matrixClipFromModel','color'],attributes:['vert'],sources:navSources};
  isContextLost(){return this.lost;}
  getParameter(){return this.program;}
  getProgramParameter(p:Program,key:number){return key===this.LINK_STATUS?true:key===this.ACTIVE_UNIFORMS?p.uniforms.length:p.attributes.length;}
  getActiveUniform(p:Program,i:number){return {name:p.uniforms[i]};}
  getActiveAttrib(p:Program,i:number){return {name:p.attributes[i]};}
  getAttachedShaders(p:Program){if(this.broken)throw new Error('unsupported context');return p.sources;}
  getShaderSource(s:string){return s;}
  linkProgram(_p:Program){}
  drawElements(){this.calls++;}
  drawArrays(){this.calls++;}
 }
 class Fake2D {
  canvas=document.createElement('canvas');font='bold 80px Arial';fillStyle='rgba(255, 255, 255, 0.7)';strokeStyle='rgba(0, 0, 0, 0.15)';calls=0;
  fillText(_text:string){this.calls++;}strokeText(_text:string){this.calls++;}
 }
 vi.stubGlobal('WebGLRenderingContext',FakeGL);vi.stubGlobal('WebGL2RenderingContext',undefined);vi.stubGlobal('CanvasRenderingContext2D',Fake2D);
 let dispose=()=>{};
 try {
  const runtime=await import('../src/content/render'); dispose=runtime.disposeRenderingGuards;
  const gl=new FakeGL();document.documentElement.setAttribute('data-open-map-companion-disablemoving','');gl.drawElements();expect(gl.calls).toBe(0);
  gl.program.sources=['void main(){gl_Position=matrixClipFromModel*vec4(vert,1);}','uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}'];gl.linkProgram(gl.program);gl.drawElements();expect(gl.calls).toBe(1);
  gl.lost=true;gl.drawArrays();expect(gl.calls).toBe(2);gl.lost=false;
  gl.broken=true;gl.linkProgram(gl.program);gl.drawArrays();expect(gl.calls).toBe(3);
  const ctx=new Fake2D();ctx.canvas.width=512;ctx.canvas.height=128;document.documentElement.setAttribute(ROAD_FLAG,'');ctx.fillText('Test road');expect(ctx.calls).toBe(0);
  document.documentElement.removeAttribute(ROAD_FLAG);ctx.strokeText('Test road');expect(ctx.calls).toBe(1);
  document.documentElement.setAttribute(PLACE_FLAG,'');window.dispatchEvent(new Event(STATUS_REQUEST));
  const health=JSON.parse(document.documentElement.getAttribute(STATUS_ATTRIBUTE)!);expect(health.renderError).toBe(true);expect(health.roadsRecognised).toBe(true);expect(health.navigationRecognised).toBe(true);
  expect(document.documentElement.getAttribute(STATUS_ATTRIBUTE)).not.toContain('Test road');
 }finally{dispose();vi.unstubAllGlobals();document.documentElement.removeAttribute('data-open-map-companion-disablemoving');document.documentElement.removeAttribute(ROAD_FLAG);document.documentElement.removeAttribute(PLACE_FLAG);}
});
