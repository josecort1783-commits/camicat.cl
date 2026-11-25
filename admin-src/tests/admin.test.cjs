const {test}=require('node:test');const assert=require('node:assert/strict');const {readFileSync}=require('node:fs');const {JSDOM}=require('jsdom');const {build}=require('esbuild');
let bundle;
async function setup(storage={},cloud=null,staffOnly=false,url='https://admin.example'){
 if(!bundle){bundle=(await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'iife',plugins:[{name:'cloud-mock',setup(b){b.onResolve({filter:/^\.\/cloud\.js$/},()=>({path:'cloud',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`export const client={auth:{signOut:async options=>{globalThis.__signOutOptions=options;return globalThis.__testCloud?.signOut?.()},signInWithPassword:async()=>({error:new Error('no login')})}};export function createRecoveryClient(){return {auth:{setSession:async(tokens)=>{globalThis.__recoveryTokens=tokens;return globalThis.__testCloud?.recovery??{error:new Error('expired')}},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{nextLevel:'aal1',currentLevel:'aal1'}})},updateUser:async({password})=>{globalThis.__passwordUpdated=!!password;return {error:null}},signOut:async()=>{globalThis.__recoverySignedOut=true}}}};export async function checkAccess(){return globalThis.__testCloud?.access??null}export async function loadCatalog(){if(globalThis.__testCloud)return globalThis.__testCloud.current;throw Error('offline')}export async function publishCatalog(items,revision){if(globalThis.__testCloud)return globalThis.__testCloud.publish(items,revision);throw Error('offline')}`}));}}]})).outputFiles[0].text;}
 const dom=new JSDOM((staffOnly?readFileSync('src/index.html','utf8'):readFileSync('src/index.html','utf8').replace(' data-staff-panel="locked"','')),{url,runScripts:'outside-only'}),w=dom.window;w.structuredClone=structuredClone;w.crypto.randomUUID=undefined;w.confirm=()=>true;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.createImageBitmap=async()=>({width:10,height:10,close(){}});w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/webp;base64,UklGRg==';for(const [k,v]of Object.entries(storage))w.localStorage.setItem(k,v);if(cloud)w.__testCloud=cloud;w.fetch=async(path,options)=>{w.__resetRequest={path,email:JSON.parse(options.body).email};const error=w.__resetError;return {ok:!error,status:error?.status??200,json:async()=>({code:error?.code})};};w.eval(bundle);if(cloud)await new Promise(setImmediate);return {dom,w,$:s=>w.document.querySelector(s)};
}
test('edit stock, filter, undo, update demo and restore in another load',async()=>{const b=await setup(),{$,w}=b;assert.equal(w.document.querySelectorAll('.product-row').length,8);assert.equal($('#publish').disabled,true);$('[data-edit="flor-dorada"].edit-button').click();$('#stockUnknown').checked=false;$('#stockUnknown').dispatchEvent(new w.Event('change'));$('#productStock').value='3';$('#productPrice').value='16990';$('#productForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal($('#statLow').textContent,'1');assert.equal($('#publish').disabled,false);assert.match($('[data-id="flor-dorada"] .product-price').textContent,/16.990/);$('[data-filter="low"]').click();assert.equal(w.document.querySelectorAll('.product-row').length,1);$('[data-stock="flor-dorada"][data-step="-1"]').click();assert.equal($('[data-id="flor-dorada"] .stock-control b').textContent,'2');$('#undo').click();assert.equal($('[data-id="flor-dorada"] .stock-control b').textContent,'3');$('#publish').click();assert.match($('#reviewList').textContent,/Stock: Sin definir → 3 unidades/);assert.match($('#reviewList').textContent,/Precio:.*16.990/);$('#confirmPublish').click();assert.equal($('#publish').disabled,true);const storage=Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));const restored=await setup(storage);assert.equal(restored.$('[data-id="flor-dorada"] .stock-control b').textContent,'3');restored.dom.window.close();b.dom.window.close();});
test('add photo product, delete safely, undo and hide; escape names',async()=>{const b=await setup(),{$,w}=b;$('#addProduct').click();$('#productCategory').value='Aros';$('#productName').value='<b>Prueba</b>';$('#productPrice').value='8000';$('#productStock').value='0';const file=new w.File(['test'],'photo.webp',{type:'image/webp'});Object.defineProperty($('#photoInput'),'files',{configurable:true,value:[file]});$('#photoInput').dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,0));$('#productForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal($('#statTotal').textContent,'9');assert.equal($('#statZero').textContent,'1');const row=[...w.document.querySelectorAll('.product-row')].find(el=>el.querySelector('h3').textContent==='<b>Prueba</b>');assert.ok(row);assert.equal(row.querySelector('h3 b'),null);row.querySelector('[data-delete]').click();$('#confirmDelete').click();assert.equal($('#statTotal').textContent,'8');$('#undo').click();assert.equal($('#statTotal').textContent,'9');$('[data-visibility="flor-dorada"]').click();$('[data-filter="hidden"]').click();assert.equal(w.document.querySelectorAll('.product-row').length,1);assert.match($('#products').textContent,/Oculto/);b.dom.window.close();});
test('failed local write keeps draft and rejects missing photograph',async()=>{const b=await setup(),{$,w}=b;$('#addProduct').click();$('#productCategory').value='Aros';$('#productName').value='Sin fotografía';$('#productPrice').value='1000';$('#productForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal($('#formError').hidden,false);$('#editor').close();Object.getPrototypeOf(w.localStorage).setItem=function(){throw Error('full')};$('[data-visibility="flor-dorada"]').click();assert.equal($('#publish').disabled,true);assert.equal($('[data-id="flor-dorada"] .status-pill').textContent,'Visible');assert.match($('#toast').textContent,/No pudimos guardar/);b.dom.window.close();});
test('model validates unique IDs, stock bounds and trusted image hosts',async()=>{const m=await import('../src/model.js');const seeds=m.normalizeSeed(JSON.parse(readFileSync('src/seed.json','utf8')));assert.equal(m.validCatalog(seeds),true);assert.equal(m.validCatalog([...seeds,seeds[0]]),false);assert.equal(m.validProduct({...seeds[0],stock:-1}),false);assert.equal(m.validProduct({...seeds[0],stock:1.2}),false);assert.equal(m.validProduct({...seeds[0],price:1.5}),false);assert.equal(m.safeImage('https://evil.example/photo.webp'),false);assert.equal(m.productState({...seeds[0],stock:0}),'Agotado');});
test('featured selection respects three slots, can be edited, saved and restored',async()=>{
 const b=await setup(),{$,w}=b,save=()=>$('#productForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.equal(w.document.querySelectorAll('.featured-chip').length,3);
 $('[data-edit="flor-verde"].edit-button').click();$('#productFeatured').checked=true;save();
 assert.match($('#formError').textContent,/Ya hay 3/);assert.equal($('#editor').open,true);$('#editor').close();
 $('[data-highlight-edit="flor-dorada"]').click();$('#productFeatured').checked=false;save();
 $('[data-edit="flor-verde"].edit-button').click();$('#productFeatured').checked=true;save();
 assert.ok($('[data-highlight-edit="flor-verde"]'));assert.equal($('[data-highlight-edit="flor-dorada"]'),null);
 $('[data-filter="featured"]').click();assert.equal(w.document.querySelectorAll('.product-row').length,3);
 $('[data-visibility="flor-verde"]').click();assert.match($('#featuredCount').textContent,/2 disponibles/);
 $('#undo').click();$('#publish').click();$('#confirmPublish').click();assert.equal($('#publish').disabled,true);
 const saved=JSON.parse(w.localStorage.getItem('camicat-admin-v1-saved'));
 assert.equal(saved.find(p=>p.id==='flor-verde').featured,true);assert.equal(saved.find(p=>p.id==='flor-dorada').featured,false);
 const reload=await setup({'camicat-admin-v1-saved':JSON.stringify(saved)});
 assert.ok(reload.$('[data-highlight-edit="flor-verde"]'));reload.dom.window.close();b.dom.window.close();
});
test('authorized cloud publish sends the selected flag only on update',async()=>{
 const m=await import('../src/model.js'),products=m.normalizeSeed(JSON.parse(readFileSync('src/seed.json','utf8')));
 const sent=[];
 const cloud={access:{id:'test-member',email:'qa@example.test'},current:{products,revision:11,updated_at:'2026-11-05T12:00:00Z'},publish(items,revision){sent.push({items,revision});return {products:items,revision:12,updated_at:'2026-11-05T12:01:00Z'};}};
 const b=await setup({},cloud),{$,w}=b;
 assert.equal($('#modePill').textContent,'Tienda conectada');
 $('[data-highlight-edit="flor-dorada"]').click();$('#productFeatured').checked=false;
 $('#productForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.equal(sent.length,0);assert.equal($('.save-bar').classList.contains('is-pending'),true);
 $('#publish').click();
 assert.equal($('#reviewChanges').open,true);
 assert.match($('#reviewList').textContent,/Flor Dorada.*Se quita de destacados/);
 assert.equal($('#confirmPublish').textContent,'Actualizar tienda');
 assert.equal(sent.length,0);
 $('#reviewChanges .secondary').click();
 assert.equal(sent.length,0);
 $('#publish').click();$('#confirmPublish').click();await new Promise(setImmediate);
 assert.equal(sent.length,1);assert.equal(sent[0].revision,11);
 assert.equal(sent[0].items.find(p=>p.id==='flor-dorada').featured,false);
 assert.equal($('.save-bar').classList.contains('is-pending'),false);
 b.dom.window.close();
});
test('agenda demo adds, edits and hides a dated entry and a fixed point',async()=>{
 const b=await setup(),{$,w}=b,submit=()=>$('#agendaForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.equal(w.document.querySelectorAll('.agenda-preview-card').length,4);
 $('#agendaName').value='Feria de prueba';$('#agendaLocation').value='<b>Plaza</b>';$('#agendaDate').value='2099-11-09';$('#agendaHours').value='10:00 a 18:00';submit();
 assert.match($('#agendaStatus').textContent,/tu prueba/);assert.match($('#agendaPreview').textContent,/9 de noviembre/);
 assert.match($('#agendaEntries').textContent,/<b>Plaza<\/b>/);assert.equal($('#agendaEntries b b'),null);
 $('[data-agenda-edit]').click();assert.equal($('#agendaDate').value,'2099-11-09');$('#agendaDate').value='';submit();
 assert.match($('#agendaPreview').textContent,/Punto fijo/);
 $('[data-agenda-toggle]').click();assert.match($('#agendaEntries').textContent,/Oculto/);assert.doesNotMatch($('#agendaPreview').textContent,/Feria de prueba/);
 const saved=JSON.parse(w.localStorage.getItem('camicat-agenda-demo-v1'));assert.equal(saved[0].starts_on,null);assert.equal(saved[0].published,false);b.dom.window.close();
});
test('no-op edit and text edits do not reactivate an unavailable product',async()=>{
 const m=await import('../src/model.js');
 const products=m.normalizeSeed(JSON.parse(readFileSync('src/seed.json','utf8')));
 products[0].available=false;
 products[0]=Object.fromEntries(Object.entries(products[0]).reverse());
 assert.equal(m.sameProduct(products[0],Object.fromEntries(Object.entries(products[0]).reverse())),true);
 const storage={'camicat-admin-v1-saved':JSON.stringify(products)};
 const b=await setup(storage),{$,w}=b,edit=()=>$('[data-edit="flor-verde"].edit-button').click(),save=()=>$('#productForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 edit();assert.equal($('#productAvailable').checked,false);save();assert.equal($('#publish').disabled,true);
 edit();$('#productDescription').value='Un detalle artesanal';save();
 assert.match($('[data-id="flor-verde"] .status-pill').textContent,/Agotado/);
 assert.equal(JSON.parse(w.localStorage.getItem('camicat-admin-v1-draft'))[0].available,false);b.dom.window.close();
});

test('category first, suggested names are optional and anillos save in compatible category',async()=>{
 const b=await setup(),{$,w}=b;
 const category=$('#productCategory'),name=$('#productName'),suggest=$('#suggestName');
 $('#addProduct').click();
 assert.equal(category.value,'');
 suggest.click();
 assert.equal(w.document.activeElement,category);
 assert.equal($('#nameSuggestion').hidden,true);
 const choose=value=>{category.value=value;category.dispatchEvent(new w.Event('change'));};
 choose('Aros');
 name.value='Aros Alba';
 suggest.click();
 assert.equal($('#suggestedName').textContent,'Aros Luna');
 assert.equal(name.value,'Aros Alba');
 $('#nextName').click();
 assert.equal($('#suggestedName').textContent,'Aros Sol');
 choose('Anillos');
 assert.equal($('#nameSuggestion').hidden,true);
 suggest.click();
 assert.equal($('#suggestedName').textContent,'Anillo Alba');
 $('#useName').click();
 assert.equal(name.value,'Anillo Alba');
 assert.equal(w.document.activeElement,name);
 $('#productPrice').value='9000';
 const file=new w.File(['test'],'anillo.webp',{type:'image/webp'});
 Object.defineProperty($('#photoInput'),'files',{configurable:true,value:[file]});
 $('#photoInput').dispatchEvent(new w.Event('change'));
 await new Promise(setImmediate);
 $('#productForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 const draft=JSON.parse(w.localStorage.getItem('camicat-admin-v1-draft'));
 const item=draft.find(p=>p.name==='Anillo Alba');
 assert.equal(item.category,'Otros');
 assert.equal(item.productType,'Anillos');
 $('.product-row:last-child .edit-button').click();
 assert.equal(category.value,'Anillos');
 b.dom.window.close();
});

test('unified admin stays locked until device session and membership are verified',async()=>{
 const anon=await setup({},null,true),{$,w}=anon;
 assert.equal(w.document.body.dataset.staffPanel,'locked');
 assert.equal($('#headerLogout').hidden,true);
 $('#staffLogin').click();
 assert.equal($('#connectionDialog').open,true);
 assert.equal($('#loginForm').hidden,false);
 assert.equal($('#staffPasswordForm').hidden,true);
 anon.dom.window.close();
 const model=await import('../src/model.js');
 const products=model.normalizeSeed(JSON.parse(readFileSync('src/seed.json','utf8')));
 const member=await setup({}, {access:{id:'test-member',panelLabel:'Prueba · Administrador'},current:{products,revision:1,updated_at:'2026-11-05T12:00:00Z'}},true);
 assert.equal(member.w.document.body.dataset.staffPanel,'open');
 assert.equal(member.$('#connectedEmail').textContent,'Prueba · Administrador');
 assert.equal(member.$('#headerLogout').hidden,false);
 assert.equal(member.$('#headerLogout').textContent,'Cerrar sesión');
 await member.$('#headerLogout').onclick();
 assert.equal(member.w.__signOutOptions.scope,'local');
 assert.equal(member.w.document.body.dataset.staffPanel,'locked');
 assert.equal(member.$('#headerLogout').hidden,true);
 assert.equal(member.w.document.activeElement.id,'staffLogin');
 member.dom.window.close();
});

test('sign-out protects a draft and keeps the panel open on a service error',async()=>{
 const model=await import('../src/model.js');
 const products=model.normalizeSeed(JSON.parse(readFileSync('src/seed.json','utf8')));
 const changed=structuredClone(products);
 changed[0].price+=100;
 let attempts=0;
 const b=await setup({'camicat-admin-v1-cloud-test-member':JSON.stringify({revision:1,products:changed})},{
  access:{id:'test-member'},current:{products,revision:1,updated_at:'2026-11-05T12:00:00Z'},
  async signOut(){attempts++;return {error:attempts===1?new Error('offline'):null};}
 },true);
 const {$,w}=b;
 w.confirm=()=>false;
 await $('#headerLogout').onclick();
 assert.equal(attempts,0);
 w.confirm=()=>true;
 await $('#headerLogout').onclick();
 assert.equal(w.document.body.dataset.staffPanel,'open');
 assert.match($('#toast').textContent,/No pudimos cerrar sesión/);
 await $('#headerLogout').onclick();
 assert.equal(w.document.body.dataset.staffPanel,'locked');
 assert.equal(JSON.parse(w.localStorage.getItem('camicat-admin-v1-cloud-test-member')).products[0].price,changed[0].price);
 b.dom.window.close();
});

test('staff password reset requires a valid email and returns to the panel',async()=>{
 const b=await setup({},null,true),{$,w}=b;
 $('#staffLogin').click();
 $('#staffReset').click();
 const request=()=>$('#staffRecoveryForm').onsubmit({preventDefault(){}});
 await request();
 assert.equal(w.__resetRequest,undefined);
 $('#staffRecoveryEmail').value='staff@example.test';
 await request();
 assert.equal(w.__resetRequest.email,'staff@example.test');
 assert.equal(w.__resetRequest.path,'/api/staff-recovery');
 assert.match($('#staffResetStatus').textContent,/recibirás un enlace/);
 w.__resetError={status:429,code:'over_email_send_rate_limit'};
 await request();
 assert.match($('#staffResetStatus').textContent,/límite temporal/);
 assert.equal($('#staffResetStatus').dataset.kind,'error');
 $('#staffBackLogin').click();
 assert.equal($('#loginEmail').value,'staff@example.test');
 assert.equal($('#loginForm').hidden,false);
 assert.equal(w.document.body.dataset.staffPanel,'locked');
 b.dom.window.close();
});

test('recovery timeout releases the form and differentiates mail service failures',async()=>{
 const {recoveryMessage}=await import('../src/recovery.js');
 assert.match(recoveryMessage({status:504}),/confirmar el envío a tiempo/);
 const b=await setup({},null,true),{$,w}=b;
 $('#staffLogin').click();$('#staffReset').click();$('#staffRecoveryEmail').value='staff@example.test';
 w.__resetError={status:504};
 await $('#staffRecoveryForm').onsubmit({preventDefault(){}});
 assert.equal($('#staffRequestLink').disabled,false);assert.match($('#staffResetStatus').textContent,/confirmar el envío a tiempo/);
 b.dom.window.close();
});

test('valid recovery link shows the separate password form without opening the catalog',async()=>{
 const access={id:'test-member',email:'staff@example.test'};
 const b=await setup({}, {access,recovery:{data:{session:{user:access}}}},true,'https://admin.example/admin#type=recovery&access_token=test-access&refresh_token=test-refresh');
 const {$,w}=b;
 assert.equal(w.location.pathname,'/admin/restablecer');
 assert.equal(w.location.hash,'');
 assert.equal(w.document.body.dataset.staffPanel,'reset');
 assert.equal($('#staffNewPasswordForm').hidden,false);
 assert.equal($('#staffResetAccount').textContent,'staff@example.test');
 const form=$('#staffNewPasswordForm');
 $('#newStaffPassword').value='example-password-123';
 $('#repeatStaffPassword').value='another-password-456';
 await form.onsubmit({preventDefault(){}});
 assert.equal(w.__passwordUpdated,undefined);
 $('#repeatStaffPassword').value=$('#newStaffPassword').value;
 await form.onsubmit({preventDefault(){}});
 assert.equal(w.__passwordUpdated,true);
 assert.equal(w.__recoverySignedOut,true);
 assert.equal(form.hidden,true);
 assert.equal($('#staffResetFinish').hidden,false);
 assert.equal($('#staffResetFinish').getAttribute('href'),'/admin?restablecida=1');
 b.dom.window.close();
});

test('expired recovery URL never enables setting a password',async()=>{
 const b=await setup({},null,true,'https://admin.example/admin#error_code=otp_expired');
 await new Promise(setImmediate);
 assert.equal(b.$('#staffNewPasswordForm').hidden,true);
 assert.match(b.$('#staffNewPasswordStatus').textContent,/venció/);
 assert.equal(b.$('#staffResetFinish').getAttribute('href'),'/admin');
 assert.equal(b.w.location.hash,'');
 b.dom.window.close();
});

test('recovery API rejects unlisted emails before contacting Supabase',async()=>{
 const {requestStaffRecovery}=await import('../../api/staff-recovery.mjs');
 const request=(email,origin='https://www.camicat.cl')=>new Request('https://www.camicat.cl/api/staff-recovery',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email})});
 let providerCalls=0;
 const fetcher=async()=>{providerCalls++;return new Response('{}');};
 const denied=await requestStaffRecovery(request('visitor@example.test'),fetcher);
 assert.equal(denied.status,403);
 assert.deepEqual(await denied.json(),{code:'staff_only'});
 assert.equal(providerCalls,0);
 assert.equal((await requestStaffRecovery(request('josecort1783@gmail.com','https://example.test'),fetcher)).status,403);
 assert.equal(providerCalls,0);
 const allowed=await requestStaffRecovery(request('  JOSECORT1783@gmail.com '),async(url,options)=>{
  assert.equal(url.pathname,'/auth/v1/recover');
  assert.equal(url.searchParams.get('redirect_to'),'https://www.camicat.cl/admin');
  assert.deepEqual(JSON.parse(options.body),{email:'josecort1783@gmail.com'});
  return new Response('{}');
 });
 assert.equal(allowed.status,200);
 const limited=await requestStaffRecovery(request('juanabulnes3@gmail.com'),async()=>new Response('{}',{status:429}));
 assert.equal(limited.status,429);
 const b=await setup({},null,true),{$,w}=b;
 $('#staffLogin').click();$('#staffReset').click();$('#staffRecoveryEmail').value='visitor@example.test';
 w.__resetError={status:403,code:'staff_only'};
 await $('#staffRecoveryForm').onsubmit({preventDefault(){}});
 assert.match($('#staffResetStatus').textContent,/correo no está autorizado/);
 b.dom.window.close();
});

test('los datos de la pieza se guardan, se revisan y se pueden dejar pendientes sin inventarlos',async()=>{
 const b=await setup(),{$,w}=b;try{
  $('[data-edit="flor-dorada"].edit-button').click();
  $('#productMaterial').value='Material confirmado para la prueba';$('#productDimensions').value='Largo: 3 cm';$('#productCare').value='Indicaciones verificadas de prueba';$('#productVariants').value='Tono de prueba';$('#productDelivery').value='Retiro por coordinar';
  $('#productForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  $('#publish').click();assert.match($('#reviewList').textContent,/Materiales: Material confirmado/);assert.match($('#reviewList').textContent,/Cuidados: Indicaciones/);$('#confirmPublish').click();
  $('[data-edit="flor-dorada"].edit-button').click();assert.equal($('#productMaterial').value,'Material confirmado para la prueba');assert.equal($('#productDimensions').value,'Largo: 3 cm');assert.equal($('#productCare').value,'Indicaciones verificadas de prueba');
  $('#productMaterial').value='';$('#productForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  const draft=JSON.parse(w.localStorage.getItem('camicat-admin-v1-draft'));assert.equal(draft.find(p=>p.id==='flor-dorada').material,undefined);
  const m=await import('../src/model.js');assert.equal(m.validProduct({...draft[0],care:'x'.repeat(301)}),false);assert.equal(m.validProduct({...draft[0],material:4}),false);
 }finally{b.dom.window.close()}
});
