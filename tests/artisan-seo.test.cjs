const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),publicRoot=path.join(root,'public');
const pages=['index.html','joyas-de-alambre-requinoa.html','aros-de-alambre.html','joyas-personalizadas.html'];
function documentFor(name){return new JSDOM(fs.readFileSync(path.join(publicRoot,name),'utf8'),{url:'https://www.camicat.cl/'+(name==='index.html'?'':name)}).window.document;}
test('las páginas públicas tienen títulos y descripciones propios, canonical y contenido sin JavaScript',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const page of pages){
  const d=documentFor(page),url='https://www.camicat.cl/'+(page==='index.html'?'':page);
  assert.equal(d.documentElement.lang,'es-CL');assert.equal(d.querySelectorAll('h1').length,1);
  const title=d.title,description=d.querySelector('meta[name="description"]').content;
  assert.ok(title.length>=30&&title.length<=75);assert.ok(description.length>=110&&description.length<=170);
  assert.equal(d.querySelector('link[rel="canonical"]').href,url);assert.equal(d.querySelector('meta[property="og:url"]').content,url);
  assert.ok(!d.querySelector('meta[name="robots"]').content.includes('noindex'));
  assert.ok(!titles.has(title));assert.ok(!descriptions.has(description));titles.add(title);descriptions.add(description);
  const ids=[...d.querySelectorAll('[id]')].map(x=>x.id);assert.equal(new Set(ids).size,ids.length);
  for(const script of d.querySelectorAll('script[type="application/ld+json"]')){
   const data=JSON.parse(script.textContent);assert.equal(data['@context'],'https://schema.org');
   assert.ok(data['@graph'].some(x=>x['@type']==='WebPage'&&x.url===url));
   assert.ok(!JSON.stringify(data).includes('aggregateRating'));assert.ok(!JSON.stringify(data).includes('Offer'));
  }
  if(page!=='index.html')assert.ok(d.querySelector('main').textContent.trim().split(/\s+/).length>250);
 }
});
test('las guías y sus fotografías están conectadas; no hay enlaces ni anclas locales rotas',()=>{
 for(const page of pages){
  const d=documentFor(page);
  for(const node of d.querySelectorAll('a[href],img[src],link[rel="stylesheet"]')){
   const href=node.getAttribute('href')||node.getAttribute('src');if(!href||href.startsWith('#')||/^(mailto:|tel:|javascript:)/.test(href))continue;
   const url=new URL(href,'https://www.camicat.cl/'+page);if(url.origin!=='https://www.camicat.cl')continue;
   if(url.pathname==='/admin')continue;
   const target=url.pathname==='/'?'index.html':url.pathname.slice(1);assert.ok(fs.existsSync(path.join(publicRoot,target)),`${page}: ${href}`);
   if(url.hash&&target.endsWith('.html'))assert.ok(documentFor(target).getElementById(decodeURIComponent(url.hash.slice(1))),`${page}: ${href}`);
  }
  for(const guide of pages.slice(1))if(page!==guide)assert.ok(d.querySelector(`a[href="/${guide}"]`),`${page} should link to ${guide}`);
  for(const image of d.querySelectorAll('main img'))assert.ok(image.hasAttribute('alt')&&image.hasAttribute('width')&&image.hasAttribute('height'));
 }
});
test('el sitemap contiene las cuatro URLs canónicas; panel e historial siguen fuera de indexación',()=>{
 const sitemap=fs.readFileSync(path.join(publicRoot,'sitemap.xml'),'utf8');
 const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.equal(urls.length,4);assert.equal(new Set(urls).size,4);
 for(const page of pages)assert.ok(urls.includes('https://www.camicat.cl/'+(page==='index.html'?'':page)));
 for(const page of ['admin/index.html','pedidos.html'])assert.ok(documentFor(page).querySelector('meta[name="robots"]').content.includes('noindex'));
 assert.match(fs.readFileSync(path.join(publicRoot,'robots.txt'),'utf8'),/Sitemap: https:\/\/www\.camicat\.cl\/sitemap\.xml/);
});
test('el CSS consolidado conserva el orden y el contenido de cada fuente, incluidos los diálogos',()=>{
 const before=fs.readFileSync(path.join(publicRoot,'storefront-bundle.css'),'utf8');
 execFileSync(process.execPath,[path.join(root,'scripts/build-storefront-styles.mjs')]);
 assert.equal(fs.readFileSync(path.join(publicRoot,'storefront-bundle.css'),'utf8'),before);
 const sources=JSON.parse(fs.readFileSync(path.join(root,'scripts/storefront-styles.json'),'utf8'));let cursor=-1;
 for(const source of sources){
  const name=source.split('?')[0].replace(/^\//,'');let content=fs.readFileSync(path.join(publicRoot,name),'utf8');
  content=content.replace(/@import\s+url\(['"]?dialogs\.css['"]?\);/g,()=>fs.readFileSync(path.join(publicRoot,'dialogs.css'),'utf8'));
  const at=before.indexOf(`/* Source: ${name} */\n${content}\n`);assert.ok(at>cursor,`${name}: content or order changed`);cursor=at;
 }
 assert.ok(!/@import\b/.test(before));
 const d=documentFor('index.html');assert.equal(d.querySelectorAll('link[rel="stylesheet"]').length,1);
 const html=fs.readFileSync(path.join(publicRoot,'index.html'),'utf8');assert.ok(html.indexOf('<noscript><style>')>html.indexOf('/storefront-bundle.css'));
 for(const match of before.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)){
  const url=match[1];if(/^(#|data:|https?:)/.test(url))continue;
  assert.ok(fs.existsSync(path.resolve(publicRoot,url.replace(/^\//,''))),url);
 }
});
