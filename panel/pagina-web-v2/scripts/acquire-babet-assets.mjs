import fs from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const origin = 'https://html.themehour.net/babet/demo/';
const html = await fs.readFile(path.join(root,'docs/research/babet/source.html'),'utf8');
const paths = [...new Set([...html.matchAll(/(?:src|data-bg-src|data-mask-src|href)=["'](assets\/[^"'#?]+\.(?:png|jpg|jpeg|svg|webp|ico))["']/g)].map(m=>m[1]))];
paths.push('assets/img/theme-img/subtitle-line.png');
const mapping=[];
async function download(relative){
 const url=new URL(relative,origin).href;const local=path.join('public/sites/babet',relative);
 await fs.mkdir(path.dirname(local),{recursive:true});
 try{await fs.access(local)}catch{const r=await fetch(url);if(!r.ok)throw new Error(`${r.status} ${url}`);await fs.writeFile(local,Buffer.from(await r.arrayBuffer()))}
 mapping.push({source:url,local:'/'+local.replaceAll('\\','/').replace(/^public\//,''),bytes:(await fs.stat(local)).size});
}
for(let i=0;i<paths.length;i+=6)await Promise.all(paths.slice(i,i+6).map(download));
const fontCssUrl='https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=Onest:wght@100..900&display=swap';
let fontCss=await (await fetch(fontCssUrl,{headers:{'User-Agent':'Mozilla/5.0'}})).text();
const fontUrls=[...new Set([...fontCss.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))];
await fs.mkdir('public/sites/babet/fonts',{recursive:true});
for(const [index,url] of fontUrls.entries()){
 const filename=`font-${index}.ttf`;const r=await fetch(url);if(!r.ok)throw new Error('Font '+r.status);
 const local='public/sites/babet/fonts/'+filename;await fs.writeFile(local,Buffer.from(await r.arrayBuffer()));fontCss=fontCss.replaceAll(url,'/sites/babet/fonts/'+filename);mapping.push({source:url,local:'/sites/babet/fonts/'+filename,bytes:(await fs.stat(local)).size});
}
fontCss=fontCss.replaceAll("'Fredoka'","'Babet Fredoka'").replaceAll("'Onest'","'Babet Onest'");
await fs.writeFile('public/sites/babet/fonts/fonts.css',fontCss);
await fs.writeFile('src/components/sites/babet/fonts.css',fontCss);
for(const name of ['fredoka','onest']){
 const r=await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${name}/OFL.txt`);if(r.ok)await fs.writeFile(`public/sites/babet/fonts/${name}-OFL.txt`,await r.text());
}
await fs.writeFile('docs/research/babet/asset-map.json',JSON.stringify(mapping.sort((a,b)=>a.local.localeCompare(b.local)),null,2));
console.log(JSON.stringify({assets:paths.length,fonts:fontUrls.length,totalBytes:mapping.reduce((sum,a)=>sum+a.bytes,0)}));
