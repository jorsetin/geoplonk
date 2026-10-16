// Project-authored seed coordinates for public places; no imagery; optional panorama IDs come from manually opened public URLs.
// Coverage is checked in the live browser, not through an imagery API.
export const destinations = [
  { id: 'paris', name: 'Paris, France', lat: 48.8302981, lng: 2.3432248, pano: 'UIzbG8ZTc5IkolbqlHRWzA' },
  { id: 'paris-mouchez', name: 'Paris, France', lat: 48.8253098, lng: 2.341575, pano: 'A72HJpOJf0DjBsaQlniBKg' },
  { id: 'new-york', name: 'New York, United States', lat: 40.7536626, lng: -73.9816415, pano: '6zJfD9C649dBENW-e761Kw' },
  { id: 'tokyo', name: 'Tokyo, Japan', lat: 35.6594987, lng: 139.700513, pano: 'XlVh96-Z9lAI5tKrU2O4Yg' },
  { id: 'sydney', name: 'Sydney, Australia', lat: -33.8675568, lng: 151.2070964, pano: 'TX1Vu8Utzl-4nE7wL0u5gg' },
  {"id": "bavaria", "name": "Bavaria, Germany", "lat": 49.7572626, "lng": 9.970816, "pano": "rTXQQQRC94YQ-RQ96oEeSA"},
  {"id": "new-zealand", "name": "Waikato, New Zealand", "lat": -37.8935615, "lng": 175.4636137, "pano": "vLas2j0r7dYUlS1OU3zSlw"},
  {"id": "norway", "name": "Vestland, Norway", "lat": 60.3674003, "lng": 6.1435529, "pano": "b7ZMti_xV0BBzKSDOtbiRg"},
  {"id": "japan-road", "name": "Saitama, Japan", "lat": 35.8800897, "lng": 139.6026485, "pano": "zQkbCdnkDrTwGPRRD8b67g"},
  {"id": "chicago", "name": "Chicago, United States", "lat": 41.9410853, "lng": -87.6481291, "pano": "N-9gbAGTKN3ro-wiwIUIDQ"},
  {"id": "mexico-city", "name": "Mexico City, Mexico", "lat": 19.4032235, "lng": -99.1686841, "pano": "NSyayrDacQTUhmUPUmloDg"},
  {"id": "buenos-aires", "name": "Buenos Aires, Argentina", "lat": -34.6012111, "lng": -58.4152353, "pano": "oC8QTAMTZSqeKpk70Zjazg"},
  {"id": "sao-paulo", "name": "São Paulo, Brazil", "lat": -23.5631767, "lng": -46.6941688, "pano": "vETQ5fu-hDcCTjbGKCvjCQ"},
  {"id": "singapore", "name": "Singapore", "lat": 1.330935, "lng": 103.8470542, "pano": "oUiTF83bpITk3_Ck_zrqwA"},
  {"id": "bangkok", "name": "Bangkok, Thailand", "lat": 13.7701415, "lng": 100.5294856, "pano": "byDdgia9--sAALTf17Yegg"},
  {"id": "taipei", "name": "Taipei, Taiwan", "lat": 25.0516676, "lng": 121.5495552, "pano": "NIoaV37e5gpjijS-T-eCHg"},
  {"id": "melbourne", "name": "Melbourne, Australia", "lat": -37.8007472, "lng": 144.9794689, "pano": "AqcKDYOD1cKA5uxOjefiGA"},
  {"id": "hobart", "name": "Tasmania, Australia", "lat": -42.8793001, "lng": 147.3228137, "pano": "bAbYKbx_KwQf8aJM9KwPFg"},
  {"id": "accra", "name": "Accra, Ghana", "lat": 5.5684406, "lng": -0.2070621, "pano": "nUKNK-OBIXCeTuG-V_YWEA"},
  {"id": "dakar", "name": "Dakar, Senegal", "lat": 14.6963834, "lng": -17.4518273, "pano": "HCYhcqso8PDxziYjc_P5aA"},
  {"id": "reykjavik", "name": "Reykjavík, Iceland", "lat": 64.1329278, "lng": -21.9173056, "pano": "iYaBCHRLmQr_E07EZPx0AA"},
  {"id": "gothenburg", "name": "Gothenburg, Sweden", "lat": 57.7133134, "lng": 12.0139141, "pano": "s9ClRjuT3cyzS0vQeiIqYw"},
  {"id": "warsaw", "name": "Warsaw, Poland", "lat": 52.233206, "lng": 21.02674, "pano": "EVO0GudB3XlvGTl21PdfMQ"},
  {"id": "vilnius", "name": "Vilnius, Lithuania", "lat": 54.701125, "lng": 25.2672739, "pano": "SQP_8qpSyJ3gYUl79xh7Cw"},
] as const;
export type Destination = { id: string; name: string; lat: number; lng: number; pano?: string; heading?:number };
export function panoramaUrl(destination: Destination): string {
  if (!Number.isFinite(destination.lat) || Math.abs(destination.lat) > 90 || !Number.isFinite(destination.lng) || Math.abs(destination.lng) > 180) throw new Error('Invalid destination');
  const url = new URL('https://www.google.com/maps/@');
  url.search = new URLSearchParams({ api: '1', map_action: 'pano', viewpoint: `${destination.lat},${destination.lng}` }).toString();
  if (destination.pano) url.searchParams.set('pano', destination.pano);
  url.searchParams.set('heading', String(destination.heading??0)); url.searchParams.set('pitch', '0');
  return url.href;
}
export function pickDestination(previous?: string, random = Math.random): Destination {
  const choices = destinations.filter(item => item.id !== previous);
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random value');
  return choices[Math.floor(value * choices.length)];
}

// Read the visible URL only to reject a stale previous-round readiness message.
export function startingPointFromUrl(value: string): { lat: number; lng: number } | null {
  try {
    const url=new URL(value);
    if(url.origin!=='https://www.google.com'&&! (url.origin==='https://maps.google.com'))return null;
    const match=url.pathname.match(/\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    const parts=match?match.slice(1):url.searchParams.get('viewpoint')?.split(',');
    if(!parts||parts.length!==2||!parts.every(part=>/^-?\d+(?:\.\d+)?$/.test(part)))return null;
    const [lat,lng]=parts.map(Number);
    return Number.isFinite(lat)&&Math.abs(lat)<=90&&Number.isFinite(lng)&&Math.abs(lng)<=180?{lat,lng}:null;
  } catch { return null; }
}
