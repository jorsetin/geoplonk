// @vitest-environment jsdom
import {expect,test} from 'vitest';
import {hideUnavailableNotice} from '../src/content/unavailable-notice';
import {defaults} from '../src/shared/settings';
test('hides the entire stale notice including its close button without hiding the scene or other alerts',()=>{
 document.body.innerHTML='<main><canvas></canvas><div class="toast"><span>No Street View imagery available here.</span><button aria-label="Close">×</button></div><div role="alert">Connection lost</div><footer role="contentinfo">© Google</footer></main>';
 hideUnavailableNotice(document,{...defaults,enabled:true});expect(document.querySelector('.toast')?.hasAttribute('data-geoplonk-unavailable-notice')).toBe(true);expect(document.querySelector('main')?.hasAttribute('data-geoplonk-unavailable-notice')).toBe(false);expect(document.querySelector('[role=alert]')?.hasAttribute('data-geoplonk-unavailable-notice')).toBe(false);
 hideUnavailableNotice(document,defaults);expect(document.querySelector('[data-geoplonk-unavailable-notice]')).toBeNull();
});
test('owned game suppresses this notice even when the general customiser is disabled',()=>{
 document.body.innerHTML='<div id="open-map-companion-explorer" data-game></div><div role="status"><div><span>No Street View imagery available here.</span></div><button aria-label="Close"></button></div>';
 hideUnavailableNotice(document,defaults);expect(document.querySelector('[role=status]')?.hasAttribute('data-geoplonk-unavailable-notice')).toBe(true);
});
