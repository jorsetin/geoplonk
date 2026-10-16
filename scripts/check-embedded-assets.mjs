import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const allowed=manifest.web_accessible_resources.filter(rule=>['https://www.google.com/*','https://maps.google.com/*'].every(origin=>rule.matches.includes(origin))).flatMap(rule=>rule.resources);
const accessible=file=>allowed.some(pattern=>new RegExp('^'+pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replaceAll('*','.*')+'$').test(file));
const html=await readFile(path.join(root,'game.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match=>match[1].replace(/^\.\//,'').replace(/^\//,''));
for(const ref of refs){await access(path.join(root,ref));if(!accessible(ref))throw Error(`Embedded page dependency is not web-accessible: ${ref}`);}
for(const file of await readdir(path.join(root,'assets'))){if(/\.(?:js|css)$/.test(file)&&!accessible('assets/'+file))throw Error(`Bundled dependency is not web-accessible: assets/${file}`);}
if(!accessible('game.html'))throw Error('The embedded map page is not web-accessible.');
console.log('Embedded HTML, scripts and styles are packaged and accessible on the supported Maps origins.');
