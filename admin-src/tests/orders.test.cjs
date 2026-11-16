const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {JSDOM}=require('jsdom');
const read=(file)=>readFileSync('../public/'+file,'utf8');
const token='a'.repeat(64);
const order={public_number:'CAM-TEST',kind:'catalogo',status:'enviado',items:[{quantity:1,name:'Aro de prueba'}],total:15000,estimate:13000,created_at:'2026-11-16T00:00:00Z',tracking:'TR-01',next_step:'Transportista de prueba'};
const later=()=>new Promise(r=>setTimeout(r,12));
test('seguimiento privado renderiza la línea de tiempo sin guardar datos por defecto',async()=>{
 const dom=new JSDOM(read('pedidos.html'),{url:'https://www.camicat.cl/pedidos.html#'+token,runScripts:'outside-only'});
 const w=dom.window;
 try{
  let request;
  w.fetch=async(_,p)=>{request=JSON.parse(p.body);return {ok:true,json:async()=>({order,events:[{status:'recibido',created_at:order.created_at},{status:'enviado',created_at:order.created_at}]})};};
  w.eval(read('orders-common.js'));w.eval(read('orders-track.js'));await later();
  assert.deepEqual(request,{action:'track',token});
  const text=w.document.querySelector('#trackResult').textContent;
  assert.match(text,/CAM-TEST/);assert.match(text,/TR-01/);assert.match(text,/Despachado/);
  assert.equal(w.localStorage.length,0);
 }finally{w.close();}
});
test('registrar cotización muestra el número aun cuando no se pudo enviar correo',async()=>{
 const dom=new JSDOM(read('index.html'),{url:'https://www.camicat.cl/',runScripts:'outside-only'});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id);
 try{
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  let seen;
  w.fetch=async(_,p)=>{seen=JSON.parse(p.body);return {ok:true,json:async()=>({order,emailStatus:'unconfigured'})};};
  w.eval(read('orders-common.js'));w.eval(read('orders-store.js'));
  $('customQuoteText').textContent='Anillo con alambre dorado';
  $('requestCustomOrder').click();
  $('requestReceiptName').value='Cliente de prueba';$('requestReceiptEmail').value='cotizacion@example.invalid';
  $('receiptConsent').checked=true;$('keepReceipt').checked=true;
  await $('requestReceiptForm').onsubmit({preventDefault(){}});
  assert.equal(seen.action,'create');assert.equal(seen.kind,'personalizada');
  assert.equal($('receiptNumber').textContent,'CAM-TEST');assert.match($('receiptEmailResult').textContent,/No pudimos confirmar/);
  assert.equal(w.CamicatOrders.list().length,1);
  assert.ok(![...Object.values(w.localStorage)].join('').includes('example.invalid'));
 }finally{w.close();}
});
