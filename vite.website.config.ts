import {defineConfig} from 'vite';
export default defineConfig({publicDir:false,build:{emptyOutDir:false,lib:{entry:'src/website/content.ts',name:'GeoplonkWebsiteBridge',formats:['iife'],fileName:()=>'website-bridge.js'}}});
