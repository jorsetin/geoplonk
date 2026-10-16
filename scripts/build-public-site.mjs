// Assemble the public website from an explicit list, excluding local hosting state.
import {readFile,writeFile,copyFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const source=path.resolve('website/geoplonk/dist');
const output=path.resolve('website/public-dist');
const release=JSON.parse(await readFile(path.join(source,'release.json'),'utf8'));
const manifest=JSON.parse(await readFile('dist/manifest.json','utf8'));
if(release.version!==manifest.version)throw Error('Build and package the current extension before publishing.');
await rm(output,{recursive:true,force:true});
await mkdir(path.join(output,'downloads'),{recursive:true});
for(const file of ['index.html','play.html','play.js','play.css','style.css','site.js','landscape.svg','mark.svg','release.json']){
 let bytes=await readFile(path.join(source,file));
 if(file==='index.html')bytes=Buffer.from(bytes.toString().replace(/geoplonk-(chrome|source)-v\d+\.\d+\.\d+\.zip/g,(_,kind)=>`geoplonk-${kind}-v${release.version}.zip`).replace(/<span>v\d+\.\d+\.\d+<\/span>/g,`<span>v${release.version}</span>`));
 if(file==='play.html'||file==='play.js')bytes=Buffer.from(bytes.toString().replace(/v\d+\.\d+\.\d+ or later/g,`v${release.version} or later`));
 await writeFile(path.join(output,file),bytes);
}
for(const kind of ['extension','source']){
 const archive=release[kind];
 if(path.basename(archive.file)!==archive.file||!archive.file.endsWith('.zip'))throw Error('Invalid release filename.');
 const bytes=await readFile(path.join(source,'downloads',archive.file));
 if(bytes.length!==archive.bytes||createHash('sha256').update(bytes).digest('hex')!==archive.sha256)throw Error(`Download integrity check failed: ${kind}`);
 await copyFile(path.join(source,'downloads',archive.file),path.join(output,'downloads',archive.file));
}
await writeFile(path.join(output,'_headers'),`/release.json\n  Cache-Control: no-cache\n/downloads/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
console.log(`Public website v${release.version}: ${output}`);
