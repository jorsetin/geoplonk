import { expect,test } from 'vitest';
// @ts-expect-error The CUA runner is plain JavaScript to import in the browser REPL.
import {parseView,samePosition,sameOrientation} from '../scripts/live-checks.cua.mjs';
test('live checks tolerate harmless URL normalisation but detect real view changes',()=>{
 const a=parseView('https://www.google.com/maps/@48.8252941,2.341719,45a,75y,52.87h,78.73t/data=!3m5!1sTEST_PANO!2e0');
 const b={...a,heading:52.8719359};expect(samePosition(a,b)).toBe(true);expect(sameOrientation(a,b)).toBe(true);
 expect(samePosition(a,{...b,pano:'NEXT'})).toBe(false);expect(sameOrientation(a,{...b,heading:80})).toBe(false);
 expect(sameOrientation({...a,heading:359.99},{...a,heading:0.01})).toBe(true);
});
