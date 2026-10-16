// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from 'vitest';
import { applyCleanView } from '../src/content/adapter';
import { defaults, parseSettings } from '../src/shared/settings';
beforeEach(() => { document.head.innerHTML = ''; document.body.innerHTML = '<div><input id="searchboxinput"><button id="searchbox-searchbutton">Search</button><button aria-label="Restaurants">Restaurants</button><button aria-label="Zoom in">+</button><canvas></canvas><a href="/legal">Google © Attribution</a></div>'; });
test('opt-in hides only selected controls and preserves attribution and navigation', () => {
  expect(applyCleanView(document, defaults)).toBe(0);
  expect(applyCleanView(document, { ...defaults, enabled: true, hideSearch: true, hideCategories: true })).toBe(3);
  expect(document.querySelectorAll('a[data-open-map-companion-hidden], canvas[data-open-map-companion-hidden], div[data-open-map-companion-hidden], button[aria-label="Zoom in"][data-open-map-companion-hidden]').length).toBe(0);
});
test('disable and selective changes restore controls without changing native inline styles', () => {
  const input = document.querySelector('input')!; input.style.color = 'red';
  applyCleanView(document, { ...defaults, enabled: true, hideSearch: true, hideCategories: true });
  expect(applyCleanView(document, { ...defaults, enabled: true, hideSearch: false, hideCategories: true })).toBe(1);
  applyCleanView(document, defaults);
  expect(document.querySelectorAll('[data-open-map-companion-hidden]').length).toBe(0);
  expect(input.style.color).toBe('red');
});
test('new SPA controls are handled and unknown labels fail open', () => {
  document.body.innerHTML += '<button aria-label="Restaurants nearby">Unknown</button>';
  applyCleanView(document, { ...defaults, ...defaults, enabled: true, hideSearch: false, hideCategories: true });
  expect(document.querySelector('button[aria-label="Restaurants nearby"]')!.hasAttribute('data-open-map-companion-hidden')).toBe(false);
  document.querySelector('button[aria-label="Restaurants"]')!.outerHTML = '<button aria-label="Restaurants">New</button>';
  expect(applyCleanView(document, { ...defaults, ...defaults, enabled: true, hideSearch: false, hideCategories: true })).toBe(1);
  expect(document.querySelectorAll('#open-map-companion-style').length).toBe(1);
});
test('invalid or future storage values cannot enable features', () => {
  expect(parseSettings({ enabled: 'true', hideSearch: 1, unknown: true })).toEqual(defaults);
  expect(parseSettings(null)).toEqual(defaults);
});

test('the default Clean View preset has visible effects when enabled', () => {
  expect(applyCleanView(document, { ...defaults, enabled: true })).toBe(3);
});

test('current Maps generated input IDs and category text without aria-label', () => {
  document.body.innerHTML = '<div><form><label for="ucc-1">Search Google Maps</label><input id="ucc-1" name="q" role="combobox"></form><button aria-label="Search">Search</button><button aria-label="Directions">Directions</button></div><button><span aria-hidden="true">icon</span><span>Restaurants</span></button><button aria-label="Zoom in">+</button><a>Google attribution</a>';
  expect(applyCleanView(document, { ...defaults, enabled: true })).toBe(5);
  expect(document.querySelector('label')!.hasAttribute('data-open-map-companion-hidden')).toBe(true);
  expect(document.querySelector('a')!.hasAttribute('data-open-map-companion-hidden')).toBe(false);
  applyCleanView(document, { ...defaults, enabled: false });
  expect(document.querySelectorAll('[data-open-map-companion-hidden]').length).toBe(0);
});

 test('Street View hides overlays while preserving panorama and contributor credits, then restores on exit', () => {
  document.body.innerHTML = '<div role="application" aria-label="Street View"><canvas></canvas></div><div class="JHngof"><h1>Location</h1><button>Back</button><a data-attribution-url="credit">Photographer</a><span>Aug 2018</span></div><div class="F63Kk"><div aria-label="Interactive map"></div></div><div class="GyRqef">Compass</div><div class="B5aTzc">Zoom</div><div role="contentinfo">Copyright</div><img src="branding/mapslogo/logo.png">';
  applyCleanView(document, { ...defaults, enabled: true });
  expect(document.querySelector('h1')!.hasAttribute('data-open-map-companion-hidden')).toBe(true);
  expect(document.querySelector('.F63Kk')!.hasAttribute('data-open-map-companion-hidden')).toBe(true);
  expect(document.querySelector('[data-attribution-url]')!.closest('[data-open-map-companion-hidden]')).toBe(null);
  expect(document.querySelector('canvas')!.closest('[data-open-map-companion-hidden]')).toBe(null);
  expect(document.querySelector('[role="contentinfo"]')!.closest('[data-open-map-companion-hidden]')).toBe(null);
  document.querySelector('[role="application"]')!.remove();
  applyCleanView(document, { ...defaults, enabled: true });
  expect(document.querySelectorAll('[data-open-map-companion-hidden]').length).toBe(0);
});

test('optional panels can be hidden without hiding imagery or logo', () => {
 document.body.innerHTML = '<div role="application" aria-label="Street View"><canvas id="imagery"></canvas><canvas class="JRr1M"></canvas></div><div class="C5SiJf"><a data-attribution-url="credit">Credit</a></div><div class="H4v9Kb" role="contentinfo">Credits</div><img src="branding/mapslogo/logo.png">';
 applyCleanView(document, {...defaults, enabled:true});
 expect(document.querySelector('#imagery')!.hasAttribute('data-open-map-companion-hidden')).toBe(false);
 expect(document.querySelector('canvas.JRr1M')!.hasAttribute('data-open-map-companion-hidden')).toBe(false);
 expect(document.querySelector('.C5SiJf')!.hasAttribute('data-open-map-companion-hidden')).toBe(true);
 expect(document.querySelector('.H4v9Kb')!.hasAttribute('data-open-map-companion-hidden')).toBe(false);
 applyCleanView(document, {...defaults, enabled:true, hideStreetViewPanels:false});
 expect(document.querySelectorAll('[data-open-map-companion-hidden]').length).toBe(0);
});

test('hiding information panels preserves the native footer background and links', () => {
 document.body.innerHTML = '<div role="application" aria-label="Street View"><canvas></canvas></div><div class="OFa6ce" style="background: grey"><div class="fkqWWd"><div class="ucMar"><div class="H4v9Kb" role="contentinfo">Credits</div></div></div></div>';
 applyCleanView(document, {...defaults, enabled:true});
 expect(document.querySelector('.OFa6ce')!.hasAttribute('data-open-map-companion-hidden')).toBe(false);
 applyCleanView(document, {...defaults, enabled:true, hideStreetViewPanels:false});
 expect(document.querySelector('.OFa6ce')!.hasAttribute('data-open-map-companion-hidden')).toBe(false);
});

test('semantic control fallbacks tolerate generated-class and translated-label changes',()=>{
 const url=vi.spyOn(document,'URL','get').mockReturnValue('https://www.google.com/maps/@48,2,45a,75y,20h,80t/data=!3m7!1e1!');
 document.body.innerHTML='<div role="application" aria-label="Vue de rue" jsaction="pointerdown:scene.viewport"><canvas></canvas></div><nav role="navigation"><button jsaction="titlecard.exit" aria-label="Retour">Retour</button><h1>Lieu</h1><a data-attribution-url="credit">Credit</a></nav><div jsaction="mouseover:compass.main"><button aria-label="Tourner">Tourner</button></div><div role="search"><form><input role="combobox" name="q"></form><button aria-label="Rechercher" jsaction="omnibox.search">Rechercher</button></div>';
 applyCleanView(document,{...defaults,enabled:true,hideStreetViewPanels:false});
 expect(document.querySelector('[jsaction*="compass.main"]')!.hasAttribute('data-open-map-companion-hidden')).toBe(true);
 expect(document.querySelector('h1')!.hasAttribute('data-open-map-companion-hidden')).toBe(true);
 expect(document.querySelector('nav a')!.closest('[data-open-map-companion-hidden]')).toBe(null);
 url.mockRestore();
});

test('inactive title-card markup does not turn ordinary map view into Street View',()=>{
 document.body.innerHTML='<div role="application" aria-label="Map" jsaction="scene.viewport"><canvas></canvas></div><nav role="navigation"><button jsaction="titlecard.exit">Back</button></nav><div jsaction="compass.main">Compass</div>';
 applyCleanView(document,{...defaults,enabled:true,hideSearch:false,hideCategories:false});expect(document.querySelectorAll('[data-open-map-companion-hidden]').length).toBe(0);
});

test('Street View branding with a non-breaking space is recognised without class-name dependencies',()=>{
 document.body.innerHTML='<div role="application" aria-label="Street View"><canvas></canvas></div><div jsaction="compass.main">Compass</div>';
 applyCleanView(document,{...defaults,enabled:true});expect(document.querySelector('[jsaction="compass.main"]')!.hasAttribute('data-open-map-companion-hidden')).toBe(true);
});

test('Street View floor picker hides its background and restores without hiding other radio groups', () => {
 document.body.innerHTML='<div role="application" aria-label="Street View"><canvas></canvas></div><div role="radiogroup" aria-label="階を選択"><button role="radio" jsaction="floorpicker.onFloorSelected">B2</button></div><div role="radiogroup" aria-label="Map layers"><button role="radio" jsaction="layerswitcher.intent.map">Default</button></div>';
 const floor=document.querySelector('[aria-label="階を選択"]')!;
 applyCleanView(document,{...defaults,enabled:true});
 expect(floor.hasAttribute('data-open-map-companion-hidden')).toBe(true);
 expect(document.querySelector('[aria-label="Map layers"]')!.hasAttribute('data-open-map-companion-hidden')).toBe(false);
 applyCleanView(document,{...defaults,enabled:true,hideStreetViewUi:false});
 expect(floor.hasAttribute('data-open-map-companion-hidden')).toBe(false);
 document.querySelector('[role="application"]')!.remove();
 applyCleanView(document,{...defaults,enabled:true});
 expect(floor.hasAttribute('data-open-map-companion-hidden')).toBe(false);
});

test('floor-picker background and arrow buttons hide together and restore', () => {
 document.body.innerHTML='<div role="application" aria-label="Street View"><canvas></canvas></div><div id="floor-panel" style="background:white"><button jsaction="floorpicker.moveUp">Up</button><div><div role="radiogroup"><button role="radio" jsaction="floorpicker.onFloorSelected">B2</button></div></div><button jsaction="floorpicker.moveDown">Down</button></div><div id="unrelated"><button jsaction="floorpicker.moveUp">Unknown layout</button></div>';
 const panel=document.querySelector('#floor-panel')!;
 applyCleanView(document,{...defaults,enabled:true});
 expect(panel.hasAttribute('data-open-map-companion-hidden')).toBe(true);
 expect(document.querySelector('#unrelated')!.hasAttribute('data-open-map-companion-hidden')).toBe(false);
 applyCleanView(document,{...defaults,enabled:true,hideStreetViewUi:false});
 expect(panel.hasAttribute('data-open-map-companion-hidden')).toBe(false);
 expect(panel.getAttribute('style')).toBe('background:white');
});

test('copyright strip stays visible even inside a recognised information-card container', () => {
 document.body.innerHTML='<div role="application" aria-label="Street View"><canvas></canvas></div><div class="C5SiJf"><div role="contentinfo"><button>Keyboard shortcuts</button><a>Terms</a><span>© Google</span></div></div>';
 applyCleanView(document,{...defaults,enabled:true});
 expect(document.querySelector('[role="contentinfo"]')!.closest('[data-open-map-companion-hidden]')).toBeNull();
});

test('removes only image capture, country and imagery-report fields from the Street View footer',()=>{
 const url=vi.spyOn(document,'URL','get').mockReturnValue('https://www.google.com/maps/@48,2,45a,90y,90t/data=!1e1');
 document.body.innerHTML='<div role="application" aria-label="Street View"><canvas></canvas></div><div role="contentinfo"><span id="capture">Image capture: May 2024</span><span id="copyright">© 2026 Google</span><button id="country" jsaction="fineprint.country">France</button><button id="terms" jsaction="fineprint.terms">Terms</button><button id="privacy" jsaction="fineprint.privacy">Privacy</button><button id="keyboard">Keyboard shortcuts</button><a id="report" href="//www.google.com/local/imagery/report/?image_key=example">Report a problem</a></div>';
 applyCleanView(document,{...defaults,enabled:true});
 for(const id of ['capture','country','report'])expect(document.getElementById(id)!.hasAttribute('data-open-map-companion-footer-hidden')).toBe(true);
 for(const id of ['copyright','terms','privacy','keyboard'])expect(document.getElementById(id)!.hasAttribute('data-open-map-companion-footer-hidden')).toBe(false);
 applyCleanView(document,defaults);expect(document.querySelectorAll('[data-open-map-companion-footer-hidden]')).toHaveLength(0);url.mockRestore();
});
