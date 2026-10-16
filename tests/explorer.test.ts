import { describe, expect, it, vi } from 'vitest';
import { destinations, panoramaUrl, pickDestination } from '../src/explorer/destinations';
describe('curated explorer', () => {
  it('builds only public Maps URLs with valid coordinates', () => {
    for (const destination of destinations) {
      const url = new URL(panoramaUrl(destination));
      expect(url.origin).toBe('https://www.google.com');
      expect(url.searchParams.get('map_action')).toBe('pano');
      expect(url.searchParams.get('viewpoint')).toBe(`${destination.lat},${destination.lng}`);
      expect(url.searchParams.has('key')).toBe(false);
    }
    expect(() => panoramaUrl({ id: '', name: '', lat: NaN, lng: 0 })).toThrow();
    expect(() => panoramaUrl({ id: '', name: '', lat: 0, lng: 181 })).toThrow();
  });
  it('never immediately repeats and reaches both selection boundaries', () => {
    expect(pickDestination(destinations[0].id, () => 0).id).toBe(destinations[1].id);
    expect(pickDestination(undefined, () => .999999).id).toBe(destinations.at(-1)?.id);
    expect(() => pickDestination(undefined, () => 1)).toThrow();
  });
  it('owns only its popup, serializes launches, recovers after closure, rejects other tabs', async () => {
    let data: Record<string, any> = {};
    let listener: any;
    let removed: any;
    let open = false;
    const create = vi.fn(async () => { open = true; return { id: 8, tabs: [{ id: 9 }] }; });
    const update = vi.fn(async () => ({}));
    vi.stubGlobal('chrome', {
      storage: { session: { get: async () => data, set: async (value: any) => { data = { ...data, ...value }; }, remove: async (key: string) => { delete data[key]; } } },
      windows: { create, get: async () => { if (!open) throw Error(); return { id: 8, type: 'popup' }; }, update: async () => ({}), remove: async () => { open = false; }, onRemoved: { addListener: (fn: any) => { removed = fn; } } },
      tabs: { get: async () => ({ id: 9, windowId: 8 }), update },
      runtime: { getURL: (path: string) => `chrome-extension://test/${path}`, onMessage: { addListener: (fn: any) => { listener = fn; } } },
    });
    await import('../src/background/index');
    const page = { url: 'chrome-extension://test/popup.html' };
    const send = (type: string, sender = page) => new Promise<any>(resolve => listener({ type }, sender, resolve));
    const results = await Promise.all([send('EXPLORER_START'), send('EXPLORER_START')]);
    expect(results.every(item => item.ok)).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect((await send('EXPLORER_CLOSE', { tab: { id: 10, windowId: 8 } } as any)).ok).toBe(false);
    await send('EXPLORER_CLOSE');
    removed(8);
    await send('EXPLORER_START');
    expect(create).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});

it('checks readiness against the current public URL rather than a stale round', async () => {
 const {startingPointFromUrl}=await import('../src/explorer/destinations');
 expect(startingPointFromUrl('https://www.google.com/maps/@48.8,2.3,45a,90y,90t/data=!1e1')).toEqual({lat:48.8,lng:2.3});
 expect(startingPointFromUrl('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-33.8%2C151.2')).toEqual({lat:-33.8,lng:151.2});
 expect(startingPointFromUrl('https://example.com/maps/@48.8,2.3')).toBeNull();
 expect(startingPointFromUrl('https://www.google.com/maps/@?viewpoint=91,2')).toBeNull();
});

it('ships a varied pinned location pool without duplicate panoramas',()=>{
 expect(destinations.length).toBeGreaterThanOrEqual(20);expect(new Set(destinations.map(place=>place.id)).size).toBe(destinations.length);
 expect(destinations.every(place=>'pano' in place&&!!place.pano)).toBe(true);expect(new Set(destinations.map(place=>place.pano)).size).toBe(destinations.length);
 expect(destinations.some(place=>place.lat<0)).toBe(true);expect(destinations.some(place=>place.lng< -50)).toBe(true);expect(destinations.some(place=>place.lng>100)).toBe(true);
});
