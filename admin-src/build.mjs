import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
const out='../public/admin';
await mkdir(out,{recursive:true});
for(const name of ['index.html','style.css'])await cp('src/'+name,out+'/'+name);
await build({entryPoints:['src/app.js'],bundle:true,minify:true,format:'iife',outfile:out+'/app.js',target:['es2022'],legalComments:'none'});
