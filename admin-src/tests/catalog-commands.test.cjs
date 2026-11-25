const {test}=require('node:test');const assert=require('node:assert/strict');const {readFileSync}=require('node:fs');const {resolve}=require('node:path');const {JSDOM}=require('jsdom');
const site=resolve(__dirname,'../../public');
function fixture(url="https://www.camicat.cl/"){
 const dom=new JSDOM(readFileSync(resolve(site,'index.html'),'utf8'),{url,runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.structuredClone=structuredClone;w.matchMedia=()=>({matches:true});w.requestAnimationFrame=fn=>{fn();return 1};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.eval(readFileSync(resolve(site,'app.js'),'utf8'));
 w.eval(readFileSync(resolve(site,'catalog-commands.js'),'utf8'));
 return {w,d,dom};
}
test('quitar búsqueda restaura el catálogo y conserva el botón durante renders idénticos',()=>{
 const {w,d,dom}=fixture();try{
  const search=d.getElementById('search');search.value='dorada';search.dispatchEvent(new w.Event('input',{bubbles:true}));
  const tag=d.querySelector('#catalogActiveFilters button');assert.ok(tag);w.dispatchEvent(new w.Event('camicat:catalog-render'));assert.equal(d.querySelector('#catalogActiveFilters button'),tag);
  tag.click();assert.equal(search.value,'');assert.equal(d.getElementById('catalogActiveFilters').hidden,true);assert.equal(d.getElementById('resultCount').textContent,'8 piezas');
 }finally{dom.window.close()}
});
test('Ctrl K abre los comandos, filtra acciones y Enter navega a personalizar',()=>{
 const {w,d,dom}=fixture();try{
  d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}));assert.equal(d.getElementById('catalogCommands').open,true);
  const input=d.getElementById('catalogCommandQuery');input.value='personalizar';input.dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelectorAll('#catalogCommandList button:not([hidden])').length,1);
  input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(d.getElementById('catalogCommands').open,false);
 }finally{dom.window.close()}
});
test('el atajo de barra enfoca el buscador sin interceptar la escritura en formularios',()=>{
 const {w,d,dom}=fixture();try{
  d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'/',code:'Slash',bubbles:true,cancelable:true}));assert.equal(d.activeElement.id,'search');
  const event=new w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true});d.getElementById('search').dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(d.getElementById('catalogCommands').open,false);
 }finally{dom.window.close()}
});

test('los enlaces de las guías abren la categoría correcta y permiten volver a todas',()=>{
 const {d,dom}=fixture('https://www.camicat.cl/?categoria=Aros#coleccion');try{
  assert.equal(d.querySelector('.chips [data-filter="Aros"]').getAttribute('aria-pressed'),'true');
  const cards=[...d.querySelectorAll('#products .catalog-category')];assert.ok(cards.length>0);assert.ok(cards.every(x=>x.textContent==='Aros'));
  d.getElementById('clearCatalogFilters').click();assert.equal(d.getElementById('resultCount').textContent,'8 piezas');assert.equal(d.querySelector('.chips [data-filter="Todos"]').getAttribute('aria-pressed'),'true');
 }finally{dom.window.close()}
});
test('una categoría no autorizada no vacía el catálogo ni inserta contenido',()=>{
 const {d,dom}=fixture('https://www.camicat.cl/?categoria=%3Cimg%20src=x%3E');try{
  assert.equal(d.querySelector('.chips [data-filter="Todos"]').getAttribute('aria-pressed'),'true');assert.equal(d.getElementById('resultCount').textContent,'8 piezas');
 }finally{dom.window.close()}
});
