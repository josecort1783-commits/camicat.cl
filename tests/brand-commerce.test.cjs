const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),{JSDOM}=require('jsdom');
function setup(facts=null){
 const dom=new JSDOM(readFileSync('public/index.html','utf8'),{url:'https://www.camicat.cl/',runScripts:'outside-only'}),w=dom.window,d=w.document,$=id=>d.getElementById(id);
 if(facts){const seed=JSON.parse($('catalogSeed').textContent);Object.assign(seed[0],facts);$('catalogSeed').textContent=JSON.stringify(seed)}
 w.structuredClone=structuredClone;w.matchMedia=()=>({matches:true,addEventListener(){}});w.requestAnimationFrame=fn=>{fn();return 1};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 for(const file of ['app.js','checkout-quote.js','custom-jewel.js'])new (require('node:vm').Script)(readFileSync('public/'+file,'utf8'),{filename:file}).runInContext(dom.getInternalVMContext());
 return {dom,w,d,$};
}
test('la ficha explica lo pendiente y prepara una consulta específica sin inventar materiales',()=>{
 const t=setup(),{$,d}=t;try{
  d.querySelector('[data-view="flor-verde"]').click();assert.equal($('productDialog').open,true);
  const text=$('productDetail').textContent;assert.match(text,/Consulta al taller/);assert.match(text,/Disponibilidad por confirmar/);assert.doesNotMatch(text,/Plata 925|hipoalergénic/);
  const url=new URL($('detailContact').href);assert.equal(url.hostname,'wa.me');assert.match(url.searchParams.get('text'),/flor-verde/);assert.match(url.searchParams.get('text'),/materiales, medidas, cuidados/);
 }finally{t.dom.window.close()}
});
test('los datos confirmados se muestran escapados y agregar conserva el precio referencial',()=>{
 const t=setup({material:'Alambre <b>prueba</b>',dimensions:'3 cm',care:'Cuidado de prueba',variants:'Tono de prueba',delivery:'Condición de prueba',stock:2}),{$,d}=t;try{
  d.querySelector('[data-view="flor-verde"]').click();assert.match($('productDetail').textContent,/Alambre <b>prueba<\/b>/);assert.equal(d.querySelector('.detail-facts dd b'),null);assert.match($('productDetail').textContent,/3 cm/);assert.match($('productDetail').textContent,/Condición de prueba/);
  $('detailAdd').click();assert.equal($('cartDialog').open,true);assert.equal($('cartCount').textContent,'1');assert.match($('cartTotal').textContent,/14.990/);
  $('checkout').click();$('customer').value='Cliente de prueba';
  $('orderForm').dispatchEvent(new t.w.Event('submit',{cancelable:true}));assert.equal($('checkoutReview').hidden,false);
  const link=new URL($('contactOrder').href),message=link.searchParams.get('text');assert.equal(link.hostname,'wa.me');assert.match(message,/Flor Esmeralda/);assert.match(message,/Aún no he pagado/);assert.match(message,/Retiro: punto y horario por coordinar/);
 }finally{t.dom.window.close()}
});
test('la compra pide dirección solo para envío y no avanza con datos incompletos',()=>{
 const t=setup(),{$,d,w}=t;try{
  d.querySelector('[data-add="flor-dorada"]').click();$('checkout').click();$('orderForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal($('checkoutReview').hidden,true);
  const shipping=d.querySelector('input[name="deliveryMode"][value="envio"]');shipping.checked=true;shipping.dispatchEvent(new w.Event('change'));assert.equal($('addressFields').hidden,false);assert.equal($('customerCommune').required,true);
  const pickup=d.querySelector('input[name="deliveryMode"][value="retiro"]');pickup.checked=true;pickup.dispatchEvent(new w.Event('change'));assert.equal($('addressFields').hidden,true);assert.equal($('customerCommune').required,false);
 }finally{t.dom.window.close()}
});
test('personalizar permite orientación, conserva la idea al volver y prepara WhatsApp sin enviarlo',()=>{
 const t=setup(),{$,d,w}=t;try{
  const piece=d.querySelector('input[name="customPiece"][value="guide"]');piece.checked=true;piece.dispatchEvent(new w.Event('change',{bubbles:true}));$('customIdea').value='Una flor pequeña verde';
  $('customJewelForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal($('customQuoteReview').hidden,false);assert.match($('customQuoteSummary').textContent,/necesito orientación/);
  const link=new URL($('customWhatsApp').href);assert.equal(link.hostname,'wa.me');assert.match(link.searchParams.get('text'),/Una flor pequeña verde/);assert.match(link.searchParams.get('text'),/materiales disponibles, el precio y el plazo/);
  $('customEditQuote').click();assert.equal($('customJewelForm').hidden,false);assert.equal($('customIdea').value,'Una flor pequeña verde');assert.equal($('customWhatsApp').hasAttribute('href'),false);
 }finally{t.dom.window.close()}
});
