import { createAgenda } from './agenda.js';
import rawSeed from './seed.json';
import {validCatalog,validProduct,normalizeSeed,changeCount,sameProduct,productState,isFeatured,showsInFeatures,featureLimit,money,uniqueId,escapeHtml as esc} from './model.js';
import {client,checkAccess,loadCatalog,publishCatalog} from './cloud.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const agenda=createAgenda(client);
const staffOnly=document.body.hasAttribute('data-staff-panel');
const staffAuthType=staffOnly?new URLSearchParams(location.hash.slice(1)).get('type'):null;
let staffSetup=['invite','recovery'].includes(staffAuthType);
if(staffOnly){
 $('#staffLogin').disabled=false;
 const setStaffView=(recovery,focus=true)=>{
  $('#loginForm').hidden=recovery;
  $('#staffLoginHint').hidden=recovery;
  $('#staffRecoveryForm').hidden=!recovery;
  $('#connectionTitle').textContent=recovery?'Crea o recupera tu contraseña':'Iniciar sesión';
  if(focus)(recovery?$('#staffRecoveryEmail'):$('#loginEmail')).focus();
 };
 $('#staffLogin').onclick=()=>{setStaffView(false,false);open('#connectionDialog');$('#loginEmail').focus();};
 $('#staffReset').onclick=()=>{
  $('#staffRecoveryEmail').value=$('#loginEmail').value.trim();
  setStaffView(true);
 };
 $('#staffBackLogin').onclick=()=>{
  $('#loginEmail').value=$('#staffRecoveryEmail').value.trim();
  setStaffView(false);
 };
 $('#staffRecoveryForm').onsubmit=async e=>{
  e.preventDefault();
  const field=$('#staffRecoveryEmail'),button=$('#staffRequestLink'),status=$('#staffResetStatus');
  if(button.disabled||!field.reportValidity())return;
  button.disabled=true;
  status.textContent='Solicitando enlace…';
  status.dataset.kind='pending';
  try{
   const {error}=await client.auth.resetPasswordForEmail(field.value.trim(),{redirectTo:'https://www.camicat.cl/admin'});
   if(error)throw error;
   status.textContent='Si tu cuenta está habilitada, recibirás un enlace. Si no lo ves, revisa Spam y Promociones.';
   status.dataset.kind='success';
  }catch(error){
   status.dataset.kind='error';
   status.textContent=error?.status===429||['over_email_send_rate_limit','over_request_rate_limit'].includes(error?.code)
    ?'Se alcanzó el límite temporal de correos. Espera hasta una hora antes de pedir otro enlace.'
    :'No se pudo enviar el enlace. Revisa tu conexión. Si vuelve a fallar, contacta al encargado de Camicat.';
  }finally{button.disabled=false;}
 };
 if(typeof client.auth.onAuthStateChange==='function')client.auth.onAuthStateChange(event=>{
  if(event==='PASSWORD_RECOVERY')staffSetup=true;
 });
 $('#staffPasswordForm').onsubmit=async e=>{
  e.preventDefault();
  const button=e.currentTarget.querySelector('button');
  const input=$('#staffPassword'),repeat=$('#staffPasswordConfirm'),status=$('#staffPasswordStatus');
  if(!e.currentTarget.reportValidity())return;
  if(input.value!==repeat.value){status.textContent='Las contraseñas no coinciden.';repeat.focus();return;}
  button.disabled=true;
  try{
   const {error}=await client.auth.updateUser({password:input.value});
   if(error)throw error;
   input.value='';repeat.value='';
   status.textContent='Contraseña actualizada. Ya puedes entrar con ella.';
   if(staffSetup){staffSetup=false;$('#connectionTitle').textContent='Tu cuenta';}
  }catch{status.textContent='No pudimos cambiar tu contraseña. Comprueba que tu sesión siga abierta.';}
  finally{button.disabled=false;}
 };
}
const BASE=normalizeSeed(rawSeed),KEY='camicat-admin-v1';
function read(key,fallback){try{const data=JSON.parse(localStorage.getItem(KEY+key));return data??fallback;}catch{return fallback;}}
function write(key,data){try{localStorage.setItem(KEY+key,JSON.stringify(data));return true;}catch{toast('No pudimos guardar en este dispositivo. Descarga una copia desde Conexión.');return false;}}
let saved=read('-saved',BASE);if(!validCatalog(saved))saved=structuredClone(BASE);
let draft=read('-draft',saved);if(!validCatalog(draft))draft=structuredClone(saved);
let photoRequest=0;
let mode='demo',revision=null,user=null,search='',filter='all',editingId=null,formImage='',photoBusy=false,busy=false,undoState=null,deleteId=null,toastTimer;
function toast(text){const host=$('dialog[open]')||document.body;host.append($('#toast'));$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
function open(id){$(id).showModal();}
$$('[data-close]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
$$('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}));
function dirty(){return changeCount(saved,draft);}
function persistDraft(items){return mode==='cloud'?write('-cloud-'+user.id,{revision,products:items}):write('-draft',items);}
function stage(next,message){if(!validCatalog(next)){toast('Revisa los datos de los productos.');return false;}if(!persistDraft(next))return false;undoState=structuredClone(draft);draft=next;$('#undoText').textContent=message;$('#undoBar').hidden=false;render();return true;}
function changed(id){return !sameProduct(saved.find(p=>p.id===id),draft.find(p=>p.id===id));}
function render(){
 const count=dirty();$('.save-bar').classList.toggle('is-pending',count>0);$('#statTotal').textContent=draft.length;$('#statLow').textContent=draft.filter(p=>p.stock!==null&&p.stock>0&&p.stock<=3).length;$('#statZero').textContent=draft.filter(p=>p.stock===0).length;$('#productCount').textContent=draft.length;
 const shown=draft.filter(p=>(filter==='all'||filter==='low'&&p.stock!==null&&p.stock>0&&p.stock<=3||filter==='zero'&&p.stock===0||filter==='hidden'&&!p.visible||filter==='featured'&&isFeatured(p))&&p.name.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(search.normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
 $('#products').innerHTML=shown.map(p=>`<article class="product-row ${changed(p.id)?'changed':''}" data-id="${esc(p.id)}"><div class="product-main"><img src="${p.image}" alt="${esc(p.name)}" width="55" height="72" loading="lazy"><div><h3>${esc(p.name)}</h3><p>${esc(p.category==='Otros'&&p.productType==='Anillos'?'Anillos':p.category)}</p>${isFeatured(p)?'<span class="featured-label">Destacado</span>':''}${changed(p.id)?'<span class="changed-label">Cambio pendiente</span>':''}</div></div><b class="product-price">${money(p.price)}</b><div class="row-stock">${p.stock===null?`<button class="unknown-stock" data-edit="${esc(p.id)}" aria-label="Definir stock de ${esc(p.name)}">Sin definir</button>`:`<div class="stock-control ${p.stock===0?'zero':p.stock<=3?'low':''}"><button data-stock="${esc(p.id)}" data-step="-1" ${p.stock===0?'disabled':''} aria-label="Restar una unidad de ${esc(p.name)}">−</button><b>${p.stock}</b><button data-stock="${esc(p.id)}" data-step="1" ${p.stock>=99999?'disabled':''} aria-label="Sumar una unidad de ${esc(p.name)}">+</button></div>`}</div><div class="row-status"><span class="status-pill ${!p.visible?'off':p.stock===0||!p.available?'sold':''}">${productState(p)}</span></div><div class="row-actions"><button class="edit-button" data-edit="${esc(p.id)}" aria-label="Editar ${esc(p.name)}">Editar</button><details class="row-more"><summary aria-label="Más opciones de ${esc(p.name)}">⋯</summary><div class="row-menu"><button data-visibility="${esc(p.id)}">${p.visible?'Ocultar de la tienda':'Mostrar en la tienda'}</button><button class="delete-action" data-delete="${esc(p.id)}">Eliminar producto</button></div></details></div></article>`).join('');
 const featured=draft.filter(isFeatured);
 $('#featuredSummary').innerHTML=featured.length?featured.map(p=>`<button type="button" class="featured-chip" data-highlight-edit="${esc(p.id)}" aria-label="Editar destacado: ${esc(p.name)}" ${busy?'disabled':''}><img src="${p.image}" alt="" width="38" height="46" loading="lazy"><span><b>${esc(p.name)}</b><small>${showsInFeatures(p)?'Disponible para mostrar':'No aparece: '+productState(p).toLowerCase()}</small></span></button>`).join(''):'<p>No tienes piezas destacadas.</p>';
 $('#featuredCount').textContent=`${featured.length} de ${featureLimit} seleccionadas · ${featured.filter(showsInFeatures).length} disponibles`;
 $('#empty').hidden=shown.length!==0;$('#publish').disabled=!count||busy;$('#publish').textContent=busy?'Actualizando…':'Revisar cambios';$('#saveTitle').textContent=count?`${count} ${count===1?'producto con cambios':'productos con cambios'}`:'Todo está al día';$('#saveText').textContent=count?mode==='cloud'?'Revisa los cambios antes de aplicarlos en la tienda.':'Revisa los cambios antes de guardarlos en la prueba.':'Tus cambios aparecerán aquí antes de actualizar.';$('#saveIndicator').classList.toggle('pending',count>0);
 $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));$('#trialNote').hidden=mode==='cloud';$('#modePill').textContent=mode==='cloud'?'Tienda conectada':'Modo de prueba';$('#modePill').classList.toggle('live',mode==='cloud');$('#connectionLabel').textContent=mode==='cloud'?'Tienda conectada':'Conexión de la tienda';$('#addProduct').disabled=busy;$('#undo').disabled=busy;$('#connectionOpen').disabled=busy;$('#trialConnect').disabled=busy;if(busy)$$('#products button').forEach(b=>b.disabled=true);
}
function syncStock(){const unknown=$('#stockUnknown').checked;$('#productStock').disabled=unknown;$('#productStock').required=!unknown;}
function editProduct(id){photoRequest++;photoBusy=false;const p=draft.find(p=>p.id===id);editingId=p?.id??null;formImage=p?.image??'';$('#productForm').reset();$('#editorTitle').textContent=p?'Editar producto':'Agregar producto';$('#productName').value=p?.name??'';$('#productPrice').value=p?.price??'';$('#productCategory').value=p?.productType==='Anillos'&&p.category==='Otros'?'Anillos':p?.category??'';resetNameSuggestion();$('#productStock').value=p?.stock??0;$('#stockUnknown').checked=p?.stock===null;$('#productDescription').value=p?.description??'';$('#productVisible').checked=p?.visible??true;$('#productAvailable').checked=p?.available??true;$('#productFeatured').checked=isFeatured(p);$('#photoPreview').hidden=!formImage;$('#photoHint').hidden=!!formImage;if(formImage)$('#photoPreview').src=formImage;$('#formError').hidden=true;$('#saveProduct').disabled=false;syncStock();open('#editor');}
const namePrefixes={Aros:'Aros',Collares:'Collar',Pulseras:'Pulsera',Anillos:'Anillo',Otros:'Accesorio'};
const nameIdeas=['Alba','Luna','Sol','Rosa','Clara','Luz','Mía','Lila','Brisa','Violeta','Oliva','Nube'];
const nameKey=value=>value.trim().toLocaleLowerCase('es-CL').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
let nameIndex=0,suggestion='';
function resetNameSuggestion(){
 nameIndex=0;suggestion='';$('#nameSuggestion').hidden=true;$('#suggestedName').textContent='';
 $('#nameHelp').textContent=$('#productCategory').value?'Puedes pedir una idea y editarla antes de guardar.':'Primero elige una categoría. Puedes escribir tu propio nombre o pedir una idea.';
}
function suggestProductName(){
 const prefix=namePrefixes[$('#productCategory').value];
 if(!prefix){$('#productCategory').focus();$('#productCategory').reportValidity();return;}
 const used=new Set([...draft.map(p=>nameKey(p.name)),nameKey($('#productName').value)]);
 do {
  const label=nameIdeas[nameIndex]??String(nameIndex-nameIdeas.length+1).padStart(2,'0');
  suggestion=prefix+' '+label;
  nameIndex++;
 }while(used.has(nameKey(suggestion)));
 $('#nameSuggestion').hidden=false;$('#suggestedName').textContent=suggestion;
}
$('#productCategory').addEventListener('change',resetNameSuggestion);
$('#suggestName').onclick=$('#nextName').onclick=suggestProductName;
$('#useName').onclick=()=>{
 if(!suggestion)return;
 $('#productName').value=suggestion;
 $('#productName').focus();
 $('#nameSuggestion').hidden=true;
};
$('#addProduct').onclick=()=>editProduct();$('#featuredSummary').onclick=e=>{const button=e.target.closest('[data-highlight-edit]');if(button&&!busy)editProduct(button.dataset.highlightEdit);};$('#stockUnknown').onchange=syncStock;$('#changePhoto').onclick=()=>$('#photoInput').click();
$('#photoInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;const request=++photoRequest;photoBusy=true;$('#saveProduct').disabled=true;$('#formError').hidden=true;try{if(file.size>10*1024*1024)throw Error('La fotografía debe pesar menos de 10 MB.');if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Elige una imagen JPG, PNG o WebP.');const bitmap=await createImageBitmap(file);const scale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();if(request!==photoRequest)return;formImage=canvas.toDataURL('image/webp',.8);if(!formImage.startsWith('data:image/webp;'))throw Error('No pudimos preparar esa imagen. Prueba otra.');$('#photoPreview').src=formImage;$('#photoPreview').hidden=false;$('#photoHint').hidden=true;}catch(error){if(request===photoRequest){$('#formError').textContent=error.message;$('#formError').hidden=false;}}finally{if(request===photoRequest){photoBusy=false;$('#saveProduct').disabled=false;}}};
$('#productForm').onsubmit=e=>{e.preventDefault();if(photoBusy)return;$('#formError').hidden=true;const original=draft.find(p=>p.id===editingId);const featured=$('#productFeatured').checked;if(featured&&!isFeatured(original)&&draft.filter(isFeatured).length>=featureLimit){$('#formError').textContent='Ya hay 3 piezas destacadas. Desmarca una antes de elegir otra.';$('#formError').hidden=false;$('#productFeatured').focus();return;}const selectedCategory=$('#productCategory').value;if(!selectedCategory){$('#productCategory').reportValidity();$('#productCategory').focus();return;}const product={...original,id:editingId||'pieza-'+uniqueId(),name:$('#productName').value.trim(),price:Number($('#productPrice').value),category:selectedCategory==='Anillos'?'Otros':selectedCategory,stock:$('#stockUnknown').checked?null:Number($('#productStock').value),description:$('#productDescription').value.trim(),image:formImage,visible:$('#productVisible').checked,available:$('#productAvailable').checked,tag:original?.tag??'Hecho a mano',...(featured!==isFeatured(original)||original?.featured!==undefined?{featured}:{})};if(selectedCategory==='Anillos')product.productType='Anillos';else delete product.productType;if(!formImage){$('#formError').textContent='Agrega una fotografía antes de guardar.';$('#formError').hidden=false;return;}if(!validProduct(product)){toast('Revisa el nombre, precio y unidades.');return;}if(sameProduct(original,product)){$('#editor').close();toast('No había cambios por guardar.');return;}const next=structuredClone(draft),index=next.findIndex(p=>p.id===product.id);if(index>=0)next[index]=product;else next.push(product);if(stage(next,original?'Producto editado.':'Producto agregado.')){$('#editor').close();toast('Producto guardado en tu borrador. Revisa los cambios para actualizar.');}};
$('#products').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.edit)editProduct(b.dataset.edit);if(b.dataset.delete){deleteId=b.dataset.delete;$('#deleteName').textContent=draft.find(p=>p.id===deleteId).name;open('#deleteDialog');}if(b.dataset.visibility){const id=b.dataset.visibility;stage(draft.map(p=>p.id===id?{...p,visible:!p.visible}:p),'Visibilidad cambiada.');}if(b.dataset.stock){const id=b.dataset.stock;stage(draft.map(p=>p.id===id?{...p,stock:Math.max(0,Math.min(99999,p.stock+Number(b.dataset.step)))}:p),'Unidades ajustadas.');const row=$$('[data-id]').find(el=>el.dataset.id===id);row?.querySelector(`[data-step="${b.dataset.step}"]:not(:disabled)`)?.focus({preventScroll:true});}});
$('#confirmDelete').onclick=()=>{if(stage(draft.filter(p=>p.id!==deleteId),'Producto eliminado de la lista.'))$('#deleteDialog').close();};
$('#undo').onclick=()=>{if(!undoState)return;if(persistDraft(undoState)){draft=undoState;undoState=null;$('#undoBar').hidden=true;render();toast('Último cambio deshecho.');}};
$('#search').oninput=e=>{search=e.target.value.toLocaleLowerCase('es');render();};$$('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render();});$('#clearSearch').onclick=()=>{filter='all';search='';$('#search').value='';render();};
const reviewFields=[
 ['name','Nombre',v=>v],['price','Precio',money],['category','Categoría',v=>v],
 ['stock','Stock',v=>v===null?'Sin definir':v+' unidades'],
 ['visible','En la tienda',v=>v?'Visible':'Oculto'],
 ['available','Disponible para pedidos',v=>v?'Sí':'No'],
];
function describeChanges(before,after){
 if(!before)return ['Producto nuevo · '+money(after.price), 'Stock: '+reviewFields[3][2](after.stock)];
 if(!after)return ['Se eliminará del catálogo.'];
 const lines=reviewFields.filter(([key])=>before[key]!==after[key]).map(([key,label,format])=>label+': '+format(before[key])+' → '+format(after[key]));
 if(before.productType!==after.productType&&before.category===after.category)lines.push(after.productType==='Anillos'?'Tipo: Anillos':'Tipo: Otros accesorios');
 if(isFeatured(before)!==isFeatured(after))lines.push(isFeatured(after)?'Se agrega a destacados.':'Se quita de destacados.');
 if(before.description!==after.description)lines.push('Descripción actualizada.');
 if(before.image!==after.image)lines.push('Fotografía actualizada.');
 return lines.length?lines:['Se actualizaron los datos del producto.'];
}
$('#publish').onclick=()=>{
 if(busy||!dirty())return;
 const before=new Map(saved.map(p=>[p.id,p])),after=new Map(draft.map(p=>[p.id,p]));
 const rows=[];
 for(const id of new Set([...before.keys(),...after.keys()])){
  const a=before.get(id),b=after.get(id);
  if(!sameProduct(a,b))rows.push(`<li><b>${esc((b??a).name)}</b><ul>${describeChanges(a,b).map(line=>`<li>${esc(line)}</li>`).join('')}</ul></li>`);
 }
 $('#reviewList').innerHTML=rows.join('');
 $('#reviewMode').textContent=mode==='cloud'?'Al actualizar, estos cambios se aplicarán en la tienda pública.':'Estás en modo de prueba. Los cambios solo se guardarán en este dispositivo.';
 $('#confirmPublish').textContent=mode==='cloud'?'Actualizar tienda':'Actualizar prueba';
 open('#reviewChanges');
};
$('#confirmPublish').onclick=async()=>{if(busy||!dirty()||!$('#reviewChanges').open)return;$('#reviewChanges').close();busy=true;render();try{if(mode==='cloud'){const result=await publishCatalog(structuredClone(draft),revision);saved=result.products;draft=structuredClone(saved);revision=result.revision;$('#lastUpdated').textContent='Actualizado '+new Date(result.updated_at).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});write('-cloud-'+user.id,null);}else{if(!write('-saved',draft))return;saved=structuredClone(draft);$('#lastUpdated').textContent='Prueba actualizada hoy';}if(mode==='demo')write('-draft',draft);undoState=null;$('#undoBar').hidden=true;toast(mode==='cloud'?'Listo. Tu tienda quedó actualizada.':'Prueba actualizada. La tienda pública no cambió.');}catch(error){toast(error.message);}finally{busy=false;render();}};
$('#helpOpen').onclick=$('#helpOpenBottom').onclick=()=>open('#helpDialog');$('#mobileConnection').onclick=$('#connectionOpen').onclick=$('#trialConnect').onclick=()=>open('#connectionDialog');
async function enterCloud(access,loaded=null){if(!access)throw Error('Entra de nuevo para cargar tu tienda.');const current=loaded??await loadCatalog();user=access;mode='cloud';if(staffOnly)document.body.dataset.staffPanel='open';agenda.connect(true);const checkpoint=read('-cloud-'+user.id,null);revision=checkpoint&&validCatalog(checkpoint.products)?checkpoint.revision:current.revision;saved=current.products;draft=checkpoint&&validCatalog(checkpoint.products)?checkpoint.products:structuredClone(saved);if(checkpoint&&checkpoint.revision!==current.revision)toast('Hay cambios de otro dispositivo. Conservamos tu copia: revisa Conexión antes de actualizar.');undoState=null;$('#undoBar').hidden=true;$('#lastUpdated').textContent='Actualizado '+new Date(current.updated_at).toLocaleDateString('es-CL');$('#loginForm').hidden=true;$('#staffRecoveryForm').hidden=true;$('#staffLoginHint').hidden=true;$('#connectedPanel').hidden=false;$('#connectedEmail').textContent=user.panelLabel||('Acceso de '+user.email);if(staffOnly)$('#staffPasswordForm').hidden=false;render();}
$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginButton').disabled=true;$('#loginError').hidden=true;try{const {error}=await client.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error)throw Error('No pudimos entrar. Revisa tu correo y contraseña, o solicita habilitar tu acceso.');const access=await checkAccess();if(!access)throw Error('No pudimos verificar tu acceso.');if(!staffOnly&&dirty()&&!confirm('Para entrar se cargará el catálogo en línea. ¿Dejar los cambios de prueba guardados en este dispositivo?')){await client.auth.signOut();return;}await enterCloud(access);$('#loginPassword').value='';$('#connectionDialog').close();toast('Ya estás en tu tienda en línea.');}catch(error){$('#loginError').textContent=error.message;$('#loginError').hidden=false;}finally{$('#loginButton').disabled=false;}};
$('#reloadCloud').onclick=async()=>{if(dirty()&&!confirm('Hay cambios sin actualizar. ¿Descartarlos y traer el catálogo en línea?'))return;try{const access=await checkAccess();if(!access)throw Error('Tu sesión terminó. Entra de nuevo.');const current=await loadCatalog();if(!write('-cloud-'+access.id,null))return;await enterCloud(access,current);toast('Catálogo actualizado desde la tienda.');}catch(error){toast(error.message);}};
$('#logout').onclick=async()=>{if(dirty()&&!confirm('Hay cambios sin actualizar. ¿Cerrar tu acceso y volver a la prueba?'))return;await client.auth.signOut();user=null;mode='demo';if(staffOnly){document.body.dataset.staffPanel='locked';$('#connectionDialog').close();}agenda.connect(false);revision=null;saved=read('-saved',BASE);if(!validCatalog(saved))saved=structuredClone(BASE);draft=read('-draft',saved);if(!validCatalog(draft))draft=structuredClone(saved);$('#loginForm').hidden=false;$('#connectedPanel').hidden=true;$('#loginPassword').value='';$('#lastUpdated').textContent='Catálogo de prueba';render();toast('Acceso en línea cerrado.');};
$('#exportBackup').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exported_at:new Date().toISOString(),products:draft},null,2)],{type:'application/json'});const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='camicat-catalogo-respaldo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#resetDemo').onclick=()=>{if(mode!=='demo'){toast('Esta opción es solo para la prueba.');return;}if(!confirm('¿Restaurar la prueba con las ocho piezas iniciales? La tienda pública no cambiará.'))return;saved=structuredClone(BASE);draft=structuredClone(BASE);write('-saved',saved);write('-draft',draft);undoState=null;$('#undoBar').hidden=true;render();toast('Prueba restaurada.');};
render();
// A stored session is checked by the server and membership policy, not trusted as authorization.
checkAccess().then(async access=>{if(access&&(staffOnly||!dirty())){await enterCloud(access);if(staffSetup){$('#connectionTitle').textContent='Define tu contraseña';open('#connectionDialog');$('#staffPassword').focus();}}}).catch(()=>{});

if(staffOnly&&typeof client.auth.onAuthStateChange==='function')client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){document.body.dataset.staffPanel='locked';}});
