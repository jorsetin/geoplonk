import { expect, test } from 'vitest';
import { parseHealth } from '../src/shared/status';
test('untrusted health data is limited to literal boolean capability signals',()=>{
 expect(parseHealth({guardsReady:'true',roadsRecognised:1,rendererReady:true,location:'private'})).toEqual({guardsReady:false,rendererReady:true,roadsRecognised:false,placesRecognised:false,navigationRecognised:false,renderError:false});
 expect(parseHealth(null).guardsReady).toBe(false);
});
