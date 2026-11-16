'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function uiIcon(name,filled=false){return `<svg class="ui-icon${filled?' is-filled':''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#icon-${name}"></use></svg>`}
const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
const defaults=JSON.parse($('#catalogSeed').textContent);
const KEY='camicat-prototype-v1';let storageAvailable=true;
function read(k,f){try{const v=JSON.parse(localStorage.getItem(KEY+k));return v===null?f:v}catch{return f}}
function write(k,v){try{localStorage.setItem(KEY+k,JSON.stringify(v));return true}catch{storageAvailable=false;toast('No pudimos guardar en el navegador. Exporta tu catálogo para conservarlo.');return false}}
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImage=v=>typeof v==='string'&&(/^assets\/joya-\d+\.webp$/.test(v)||/^https:\/\/wbqpcunyzvdvhaiduyem\.supabase\.co\/storage\/v1\/object\/public\/camicat-products\/[a-z0-9/-]+\.webp$/.test(v)||/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v));
function validProduct(p){return p&&typeof p.id==='string'&&p.id.length<100&&/^[a-z][a-z0-9-]+$/.test(p.id)&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=90&&Number.isInteger(p.price)&&p.price>=0&&p.price<=99999999&&['Aros','Collares','Pulseras','Otros'].includes(p.category)&&safeImage(p.image)&&typeof p.description==='string'&&p.description.length<=600&&typeof p.available==='boolean'&&(p.featured===undefined||typeof p.featured==='boolean')}
let saved=read('-products',null);let products=Array.isArray(saved)&&saved.length&&saved.every(validProduct)?saved:structuredClone(defaults);
let favorites=read('-favorites',[]);if(!Array.isArray(favorites))favorites=[];
const rawCart=read('-cart',{});let cart=Object.create(null);
if(rawCart&&typeof rawCart==='object'&&!Array.isArray(rawCart))for(const [id,q] of Object.entries(rawCart).slice(0,300)){
 if(/^[a-z][a-z0-9-]{1,98}$/.test(id)&&Number.isInteger(q)&&q>0&&q<=99)cart[id]=q;
}
let filter='Todos',search='',sort='featured',toastTimer,maxPrice=Infinity,availableOnly=false;let formImage='';
function toast(t){const host=$('dialog[open]')||document.body;host.append($('#toast'));$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3300)}
function openDialog(id){const d=$(id);d.showModal();document.body.classList.add('modal-open')}
$$('dialog').forEach(d=>{d.addEventListener('close',()=>{if(!$$('dialog[open]').length)document.body.classList.remove('modal-open')});d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()})});
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
function persistCart(){write('-cart',cart);$('#draftStatus').textContent='';renderCart()}
function quantityLimit(p){return !p?.available||p.stock===0?0:Number.isInteger(p.stock)?Math.min(99,Math.max(0,p.stock)):99;}
function canAdd(id){
 const p=products.find(p=>p.id===id),limit=quantityLimit(p);
 if(!limit){toast('Esta pieza ya no está disponible.');return false;}
 if((cart[id]||0)>=limit){toast(limit===1?'Ya tienes la única unidad disponible.':`Ya tienes el máximo de ${limit} unidades de esta pieza.`);return false;}
 return true;
}
function add(id){if(!canAdd(id))return false;const p=products.find(p=>p.id===id);cart[id]=(cart[id]||0)+1;persistCart();toast(`${p.name} se agregó a tu carrito`);return true;}
const normalizeCatalogText=value=>String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const CATALOG_BATCH=16;
let catalogLimit=CATALOG_BATCH,lastCatalogQuery='';
function favorite(id){
 const restoreFocus=document.activeElement?.dataset.fav===id;
 favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];write('-favorites',favorites);renderProducts();
 if(restoreFocus)($$('[data-fav]').find(b=>b.dataset.fav===id)||$('[data-fav]')||$('#clearFilters')).focus({preventScroll:true});
}
function resetCatalogFilters(){
 filter='Todos';search='';maxPrice=Infinity;availableOnly=false;$('#search').value='';$('#availableOnly').checked=false;renderProducts();
}
function renderProducts(){
 const query=JSON.stringify([filter,search,sort,maxPrice,availableOnly]);
 if(query!==lastCatalogQuery){catalogLimit=CATALOG_BATCH;lastCatalogQuery=query;}
 const words=normalizeCatalogText(search).trim().split(/\s+/).filter(Boolean);
 const favoriteIds=new Set(favorites);
 const counts=new Map([['Todos',products.length],['Favoritos',0]]);
 for(const p of products){counts.set(p.category,(counts.get(p.category)||0)+1);if(favoriteIds.has(p.id))counts.set('Favoritos',counts.get('Favoritos')+1);}
 for(const category of ['Pulseras','Otros']){
  if(!counts.has(category)||$('.chips [data-filter="'+category+'"]'))continue;
  const button=document.createElement('button');button.type='button';button.dataset.filter=category;button.textContent=category;$('.chips').insertBefore(button,$('.chips [data-filter="Favoritos"]'));
 }
 $$('.chips [data-filter]').forEach(button=>{
  const category=button.dataset.filter,n=counts.get(category)||0;
  button.hidden=!n&&!['Todos','Favoritos',filter].includes(category);
  button.classList.toggle('active',category===filter);button.setAttribute('aria-pressed',String(category===filter));
  let count=button.querySelector('.category-count');
  if(!count){count=document.createElement('small');count.className='category-count';count.setAttribute('aria-hidden','true');button.append(count);}
  count.textContent=n;button.setAttribute('aria-label',`${category==='Todos'?'Todas las piezas':category==='Favoritos'?'Mis favoritos':category}, ${n} ${n===1?'pieza':'piezas'}`);
 });
 const ceiling=Math.max(20000,Math.ceil(Math.max(0,...products.map(p=>p.price),Number.isFinite(maxPrice)?maxPrice:0)/1000)*1000);
 $('#maxPrice').max=ceiling;$('#maxPrice').value=Number.isFinite(maxPrice)?maxPrice:ceiling;$('#budgetLabel').textContent=Number.isFinite(maxPrice)?`Hasta ${money(maxPrice)}`:'Sin límite';
 $('#budgetReset').disabled=!Number.isFinite(maxPrice);
 let shown=products.filter(p=>p.price<=maxPrice&&(!availableOnly||quantityLimit(p)>0)&&(filter==='Todos'||filter==='Favoritos'&&favoriteIds.has(p.id)||p.category===filter)&&words.every(word=>normalizeCatalogText(`${p.name} ${p.description} ${p.category} ${p.tag||''}`).includes(word)));
 if(sort==='asc')shown.sort((a,b)=>a.price-b.price);
 if(sort==='desc')shown.sort((a,b)=>b.price-a.price);
 if(sort==='name')shown.sort((a,b)=>a.name.localeCompare(b.name,'es'));
 if(sort==='featured')shown.sort((a,b)=>Number(quantityLimit(b)>0)-Number(quantityLimit(a)>0)||Number(b.featured??featureDefaults.has(b.id))-Number(a.featured??featureDefaults.has(a.id)));
 $('#products').innerHTML=shown.slice(0,catalogLimit).map(p=>{
  const name=escapeHtml(p.name),id=escapeHtml(p.id),saved=favoriteIds.has(p.id),available=quantityLimit(p)>0;
  const reference=defaults.find(item=>item.id===p.id&&item.image===p.image);
  const photoAlt=[p.imageAlt,reference?.imageAlt].find(value=>typeof value==='string'&&value.trim()&&value.length<=160)||p.name+' de Camicat';
  return `<article class="product-card"><div class="product-image"><button type="button" class="product-view" data-view="${id}" aria-label="Ver detalles de ${name}"><img src="${p.image}" alt="${escapeHtml(photoAlt)}" loading="lazy" width="360" height="640"><span class="catalog-view-label" aria-hidden="true">Ver pieza ${uiIcon('arrow-up-right')}</span></button>${available?'':'<span class="catalog-sold">Agotado</span>'}<button type="button" class="favorite ${saved?'saved':''}" data-fav="${id}" aria-label="${saved?'Quitar de':'Agregar a'} favoritos: ${name}" aria-pressed="${saved}">${uiIcon('heart',saved)}</button></div><div class="product-meta"><span class="catalog-category">${escapeHtml(p.category)}</span><h3><button type="button" data-view="${id}">${name}</button></h3><b>${money(p.price)}</b></div><button type="button" class="quick-add" data-add="${id}" aria-label="${available?`Agregar ${name} al carrito`:`${name} agotado`}" ${available?'':'disabled'}>${available?uiIcon('plus')+' Agregar':'Agotado'}</button></article>`;
 }).join('');
 $('#resultCount').textContent=`${shown.length} ${shown.length===1?'pieza':'piezas'}`;
 $('#empty').hidden=shown.length!==0;
 $('#catalogEmptyText').textContent=filter==='Favoritos'&&!counts.get('Favoritos')?'Guarda una pieza con el corazón para encontrarla aquí.':'Prueba con otro presupuesto o una nueva búsqueda.';
 $('#clearCatalogFilters').hidden=filter==='Todos'&&!words.length&&!availableOnly&&!Number.isFinite(maxPrice);
 const more=$('#catalogMore');more.hidden=shown.length<=catalogLimit;if(!more.hidden)more.textContent=`Ver más piezas (${Math.min(CATALOG_BATCH,shown.length-catalogLimit)})`;
 window.dispatchEvent(new Event('camicat:catalog-render'));
}
// Featured choices share the same product records as the storefront and editor.
const featureDefaults=new Set(['flor-dorada','collar-color','borlas-jardin']);
function renderHighlights(){
 const featured=products.filter(p=>(p.featured??featureDefaults.has(p.id))&&p.visible!==false&&p.available&&p.stock!==0).slice(0,3);
 $('#featureProducts').innerHTML=featured.map(p=>`<article class="feature-piece"><button class="feature-piece-button" data-feature-view="${escapeHtml(p.id)}" aria-label="Ver detalles de ${escapeHtml(p.name)}"><span class="feature-photo"><img src="${p.image}" alt="" loading="lazy" width="360" height="420"></span><span class="feature-piece-copy"><small>${escapeHtml(p.category)}</small><strong>${escapeHtml(p.name)}</strong><span class="feature-price">${money(p.price)} <span>referencial</span></span></span><span class="feature-arrow" aria-hidden="true">${uiIcon('arrow-up-right')}</span></button></article>`).join('');
 $('#featureEmpty').hidden=featured.length!==0;
}
$('#featureProducts').addEventListener('click',event=>{const button=event.target.closest('[data-feature-view]');if(button)showProduct(button.dataset.featureView);});
$('#products').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.view)showProduct(b.dataset.view);if(b.dataset.add&&add(b.dataset.add))b.dispatchEvent(new CustomEvent('camicat:added',{bubbles:true}));if(b.dataset.fav)favorite(b.dataset.fav)});
$('.chips').addEventListener('click',e=>{const button=e.target.closest('[data-filter]');if(button){filter=button.dataset.filter;renderProducts()}});
$('#search').addEventListener('input',e=>{search=e.target.value.toLocaleLowerCase('es');renderProducts()});$('#sort').addEventListener('change',e=>{sort=e.target.value;renderProducts()});$('#clearFilters').onclick=$('#clearCatalogFilters').onclick=resetCatalogFilters;$('#availableOnly').onchange=()=>{availableOnly=$('#availableOnly').checked;renderProducts();};$('#catalogMore').onclick=()=>{const next=catalogLimit;catalogLimit+=CATALOG_BATCH;renderProducts();$$('.product-card')[next]?.querySelector('[data-view]')?.focus();};$('#favoritesToggle').onclick=()=>{filter='Favoritos';renderProducts();$('#coleccion').scrollIntoView({behavior:'smooth'})};
// Optional facts and photos stay separate from the seed price and stock preview.
function productFacts(p){
 const seed=defaults.find(item=>item.id===p.id&&item.image===p.image);
 const fact=key=>[p[key],seed?.[key]].find(value=>typeof value==='string'&&value.trim()&&value.length<=180)?.trim()||'Por confirmar';
 const wornImage=[p.wornImage,seed?.wornImage].find(url=>url!==p.image&&safeImage(url));
 return {material:fact('material'),dimensions:fact('dimensions'),wornImage};
}
function showProduct(id){
 const p=products.find(item=>item.id===id);
 if(!p)return;
 const available=quantityLimit(p)>0, facts=productFacts(p), name=escapeHtml(p.name);
 const stock=!available?'Agotado':Number.isInteger(p.stock)?'Disponible según catálogo':'Stock por confirmar';
 $('#productDetail').innerHTML=`<div class="product-detail-layout">
 <div class="detail-media">
 <button type="button" class="detail-photo" data-full-photo="${escapeHtml(p.id)}" aria-label="Ver fotografía completa de ${name}">
 <img src="${escapeHtml(p.image)}" alt="${name} de Camicat"><span>Ampliar foto ${uiIcon('plus')}</span></button>
 ${facts.wornImage?`<button type="button" class="detail-worn" data-full-photo="${escapeHtml(p.id)}" data-photo-kind="worn"><img src="${escapeHtml(facts.wornImage)}" alt="" loading="lazy"><span>Ver cómo queda ${uiIcon('arrow-up-right')}</span></button>`:''}
 </div>
 <div class="detail-copy">
 <span class="detail-category">${escapeHtml(p.category)} · Camicat</span>
 <h2 id="detailProductTitle">${name}</h2>
 <p class="detail-price">${money(p.price)} <small>Precio referencial</small></p>
 <p class="detail-description">${escapeHtml(p.description)}</p>
 <dl class="detail-facts">
 <div><dt>Material</dt><dd>${escapeHtml(facts.material)}</dd></div>
 <div><dt>Medidas</dt><dd>${escapeHtml(facts.dimensions)}</dd></div>
 <div><dt>Disponibilidad</dt><dd>${stock}</dd></div>
 </dl>
 <div class="detail-delivery"><p><strong>Retiro en Requínoa</strong> · Lugar y horario por coordinar.</p><p><strong>Envíos a todo Chile</strong> · El despacho se cotiza aparte antes de pagar.</p></div>
 <button type="button" class="button full" id="detailAdd" ${available?'':'disabled'}>${available?'Agregar a mi selección':'Agotado'}</button>
 </div></div>`;
 $('#detailAdd').onclick=()=>{if(!add(id))return;$('#productDialog').close();openDialog('#cartDialog');};
 openDialog('#productDialog');
 window.dispatchEvent(new CustomEvent('camicat:product-open',{detail:{id}}));
}
function cartEntries(){return products.filter(p=>cart[p.id]).map(p=>({...p,qty:cart[p.id]}))}
function cartHasConflicts(items=cartEntries()){return items.some(p=>p.qty>quantityLimit(p));}
function total(){return cartEntries().reduce((s,p)=>s+p.qty*p.price,0)}
let lastCartRemoval=null;
function renderCart(){
 const items=cartEntries(),count=items.reduce((sum,p)=>sum+p.qty,0);
 $('#cartCount').textContent=count;$('#mobileCartCount').textContent=count;$('#cartSelectionCount').textContent=count;
 $('#cartOpen').setAttribute('aria-label',`Abrir carrito: ${count} productos`);
 $('#cartBottom').hidden=items.length===0;$('#cartOptions').hidden=items.length===0;$('#cartBenefit').hidden=items.length===0;
 $('#cartItems').innerHTML=items.length?items.map(p=>`<article class="cart-line" data-cart-item="${escapeHtml(p.id)}"><img src="${p.image}" alt="${escapeHtml(p.name)}" width="80" height="108"><div class="cart-line-copy"><h3>${escapeHtml(p.name)}</h3><p>${money(p.price)} c/u · referencial${quantityLimit(p)?'':' · No disponible'}</p><div class="qty"><button data-qty="${escapeHtml(p.id)}" data-step="-1" aria-label="Reducir cantidad de ${escapeHtml(p.name)}" ${p.qty===1||!quantityLimit(p)?'disabled':''}>−</button><input type="number" inputmode="numeric" min="1" max="${Math.max(1,quantityLimit(p))}" step="1" value="${p.qty}" ${quantityLimit(p)?'':'disabled'} data-cart-quantity="${escapeHtml(p.id)}" aria-label="Cantidad de ${escapeHtml(p.name)}"><button data-qty="${escapeHtml(p.id)}" data-step="1" aria-label="Aumentar cantidad de ${escapeHtml(p.name)}" ${p.qty>=quantityLimit(p)?'disabled':''}>+</button></div><button class="cart-save" data-cart-favorite="${escapeHtml(p.id)}" aria-label="${favorites.includes(p.id)?'Quitar de favoritos':'Guardar favorito'}: ${escapeHtml(p.name)}" aria-pressed="${favorites.includes(p.id)}">${uiIcon('heart',favorites.includes(p.id))}${favorites.includes(p.id)?'En tus favoritos':'Guardar favorito'}</button></div><div class="cart-line-actions"><b class="cart-line-total" aria-label="Total de ${escapeHtml(p.name)}">${money(p.qty*p.price)}</b><button class="remove" data-remove="${escapeHtml(p.id)}" aria-label="Eliminar ${escapeHtml(p.name)}">${uiIcon('close')}</button></div></article>`).join(''):`<div class="cart-empty"><span>${uiIcon('bag')}</span><span class="eyebrow">TU PRÓXIMO FAVORITO TE ESPERA</span><h3>Un espacio para<br><em>lo que te encanta.</em></h3><p>Explora las piezas de Camicat y arma una selección muy tuya.</p><button class="button" id="emptyExplore">Descubrir la colección ${uiIcon('arrow-up-right')}</button></div>`;
 $('#subtotal').textContent=money(total());
 if($('#emptyExplore'))$('#emptyExplore').onclick=()=>{$('#cartDialog').close();$('#coleccion').scrollIntoView({behavior:typeof prefersReducedMotion==='function'&&prefersReducedMotion()?'auto':'smooth'})};
 const blocked=cartHasConflicts(items);$('#cartStockNotice').hidden=!blocked;$('#checkout').disabled=!items.length||blocked;
 if(typeof renderCheckoutTotals==='function')renderCheckoutTotals();
}
function restoreCartControl(id,selector){const row=$$('[data-cart-item]').find(el=>el.dataset.cartItem===id);const control=row?.querySelector(selector);if(control&&!control.disabled)control.focus({preventScroll:true});else row?.querySelector('[data-cart-quantity]')?.focus({preventScroll:true});}
function announceCart(){const count=cartEntries().reduce((sum,p)=>sum+p.qty,0);$('#cartLiveStatus').textContent=`${count} ${count===1?'pieza':'piezas'} en tu selección. Total de productos: ${$('#cartTotal').textContent}.`;}
$('#cartOpen').onclick=()=>{renderCart();openDialog('#cartDialog')};
$('#cartItems').onclick=event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.qty){const id=button.dataset.qty,limit=quantityLimit(products.find(p=>p.id===id));if(!limit)return;cart[id]=Math.max(1,Math.min(limit,cart[id]+Number(button.dataset.step)));persistCart();restoreCartControl(id,`[data-step="${button.dataset.step}"]`);announceCart();}
 if(button.dataset.remove){const id=button.dataset.remove,p=products.find(p=>p.id===id);lastCartRemoval={id,quantity:cart[id]};delete cart[id];persistCart();$('#cartUndoMessage').textContent=`${p.name} se quitó de tu selección.`;$('#cartUndo').hidden=false;$('#cartUndoButton').focus();announceCart();}
 if(button.dataset.cartFavorite){const id=button.dataset.cartFavorite;favorite(id);renderCart();restoreCartControl(id,'[data-cart-favorite]');}
};
// Update valid typed quantities immediately without replacing the focused input.
$('#cartItems').addEventListener('input',event=>{
 const input=event.target.closest('[data-cart-quantity]');if(!input)return;const value=Number(input.value),id=input.dataset.cartQuantity;
 const product=products.find(p=>p.id===id),limit=quantityLimit(product);
 if(input.value.trim()===''||!Number.isInteger(value)||value<1||value>limit)return;
 cart[id]=value;write('-cart',cart);$('#draftStatus').textContent='';
 const row=input.closest('[data-cart-item]');
 row.querySelector('.cart-line-total').textContent=money(value*product.price);
 row.querySelector('[data-step="-1"]').disabled=value===1;row.querySelector('[data-step="1"]').disabled=value>=limit;
 const count=cartEntries().reduce((sum,p)=>sum+p.qty,0);
 $('#cartCount').textContent=count;$('#mobileCartCount').textContent=count;$('#cartSelectionCount').textContent=count;$('#cartOpen').setAttribute('aria-label',`Abrir carrito: ${count} productos`);
 $('#subtotal').textContent=money(total());renderCheckoutTotals();announceCart();
});
$('#cartItems').addEventListener('change',event=>{
 const input=event.target.closest('[data-cart-quantity]');if(!input)return;const id=input.dataset.cartQuantity;const value=Number(input.value);
 if(input.value.trim()===''||!Number.isInteger(value)){input.value=cart[id];return;}
 const limit=quantityLimit(products.find(p=>p.id===id));if(!limit){input.value=cart[id];return;}
 cart[id]=Math.min(limit,Math.max(1,value));persistCart();restoreCartControl(id,'[data-cart-quantity]');announceCart();
});
$('#cartUndoButton').onclick=()=>{if(!lastCartRemoval)return;const {id,quantity}=lastCartRemoval;const limit=quantityLimit(products.find(p=>p.id===id));if(limit){cart[id]=Math.min(limit,(cart[id]||0)+quantity);persistCart();restoreCartControl(id,'[data-cart-quantity]');}lastCartRemoval=null;$('#cartUndo').hidden=true;announceCart();};
$('#year').textContent=new Date().getFullYear();
function renderAdmin(){$('#adminList').innerHTML=products.map(p=>`<div class="admin-item"><img src="${p.image}" alt=""><div><strong>${escapeHtml(p.name)}</strong><small>${money(p.price)} · ${escapeHtml(p.category)}</small></div><div><button data-edit="${escapeHtml(p.id)}">Editar</button><button data-delete="${escapeHtml(p.id)}">Eliminar</button></div></div>`).join('')}
$('#adminOpen').hidden=new URLSearchParams(window.location.search).get('editar')!=='1';
$('#adminOpen').onclick=()=>{renderAdmin();openDialog('#adminDialog')};
function resetForm(){$('#productForm').reset();$('#editId').value='';formImage='';$('#imagePreview').hidden=true;$('#formTitle').textContent='Agregar un producto'}
$('#resetForm').onclick=resetForm;
async function optimizeImage(file){if(file.size>10*1024*1024)throw Error('La foto debe pesar menos de 10 MB.');if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Usa una foto JPG, PNG o WebP.');const bitmap=await createImageBitmap(file);const scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/webp',.83)}
$('#pImage').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{formImage=await optimizeImage(f);$('#imagePreview').src=formImage;$('#imagePreview').hidden=false;toast('Fotografía lista y optimizada')}catch(err){toast(err.message);e.target.value=''}};
$('#productForm').onsubmit=e=>{e.preventDefault();const id=$('#editId').value||`pieza-${Date.now()}`;const p={id,name:$('#pName').value.trim(),price:Number($('#pPrice').value),category:$('#pCategory').value,image:formImage,description:$('#pDescription').value.trim(),available:$('#pAvailable').checked,tag:'Hecho a mano'};if(!formImage){toast('Agrega una fotografía del producto');return}if(!validProduct(p)){toast('Revisa el nombre, precio y descripción');return}const index=products.findIndex(x=>x.id===id);const next=products.slice();if(index>=0)next[index]=p;else next.push(p);if(!write('-products',next))return;products=next;resetForm();renderAdmin();renderProducts();renderCart();toast('Producto guardado en este navegador')};
$('#adminList').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.edit){const p=products.find(p=>p.id===b.dataset.edit);$('#editId').value=p.id;$('#pName').value=p.name;$('#pPrice').value=p.price;$('#pCategory').value=p.category;$('#pDescription').value=p.description;$('#pAvailable').checked=p.available;formImage=p.image;$('#imagePreview').src=p.image;$('#imagePreview').hidden=false;$('#formTitle').textContent='Editar producto';$('#pName').focus()}if(b.dataset.delete){if(products.length===1){toast('Conserva al menos un producto en el catálogo.');return}const next=products.filter(p=>p.id!==b.dataset.delete);if(!write('-products',next))return;products=next;delete cart[b.dataset.delete];persistCart();renderAdmin();renderProducts();resetForm();toast('Producto eliminado de este catálogo de prueba')}};
$('#exportCatalog').onclick=()=>{const blob=new Blob([JSON.stringify({brand:'Camicat',prototype:true,version:1,products},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='camicat-catalogo-prototipo.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Copia del catálogo exportada')};
$('#importCatalog').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>5*1024*1024)throw Error('El archivo supera 5 MB.');const data=JSON.parse(await f.text());if(data.brand!=='Camicat'||!Array.isArray(data.products)||data.products.length<1||data.products.length>100||!data.products.every(validProduct)||new Set(data.products.map(p=>p.id)).size!==data.products.length)throw Error('El archivo no contiene un catálogo válido de Camicat.');if(!write('-products',data.products))return;products=data.products;cart={};persistCart();renderAdmin();renderProducts();resetForm();toast('Catálogo importado en este navegador')}catch(err){toast(err.message)}finally{e.target.value=''}};
renderProducts();renderCart();renderHighlights();
// Vitrina 2: regalos, presupuesto, combinaciones y publicaciones originales.
$('#maxPrice').oninput=e=>{maxPrice=Number(e.target.value);$('#budgetLabel').textContent=`Hasta ${money(maxPrice)}`;renderProducts()};
$('#budgetReset').onclick=()=>{maxPrice=Infinity;renderProducts();};
function setView(list,persist=true){if(persist)write('-catalog-list',list);$('#products').classList.toggle('list-mode',list);$('#gridView').classList.toggle('active',!list);$('#listView').classList.toggle('active',list);$('#gridView').setAttribute('aria-pressed',!list);$('#listView').setAttribute('aria-pressed',list)}
$('#gridView').onclick=()=>setView(false);$('#listView').onclick=()=>setView(true);setView(read('-catalog-list',false)===true,false);
$$('[data-feature]').forEach(b=>b.onclick=()=>{if(products.some(p=>p.id===b.dataset.feature))showProduct(b.dataset.feature);else toast('Esta pieza fue retirada del catálogo de prueba')});
$('#giftOpen2').onclick=()=>openDialog('#giftDialog');
$('#giftFind').onclick=()=>{filter=$('#giftCategory').value;maxPrice=Number($('#giftBudget').value);search='';$('#search').value='';$('#maxPrice').value=maxPrice;$('#budgetLabel').textContent=`Hasta ${money(maxPrice)}`;renderProducts();$('#giftDialog').close();$('#coleccion').scrollIntoView({behavior:'smooth'});toast('Estas piezas coinciden con tu búsqueda de regalo')};
$('#mobileFavorites').onclick=()=>$('#favoritesToggle').click();$('#mobileCart').onclick=()=>$('#cartOpen').click();$('#mobileGift').onclick=()=>openDialog('#giftDialog');$('#faqOpen').onclick=()=>openDialog('#faqDialog');
const stories=[
{title:'Flores de primavera',image:'assets/joya-12.webp',text:'Color, alegría y estilo en cada detalle. Una publicación original de Camicat para su colección de primavera.',url:'https://www.instagram.com/camicat_accesorios/reel/Ddu1ZsiuTNc/'},
{title:'Una idea sobre la mesa',image:'assets/joya-17.webp',text:'Herramientas, pequeñas flores y colores en la mesa de trabajo. Así se ve una parte del universo artesanal de Camicat.',url:'https://www.instagram.com/camicat_accesorios/reel/DcbgWIBRNof/'},
{title:'Nuestra técnica: alambrismo',image:'assets/joya-22.webp',text:'Camicat presenta su técnica de alambrismo en esta publicación: hilos que se transforman en flores de tonos dorados y plateados.',url:'https://www.instagram.com/camicat_accesorios/reel/DcJam3Xtd_k/'},
{title:'La resina también tiene su lugar',image:'assets/joya-15.webp',text:'Una de las publicaciones de Camicat dedicada a sus diseños en resina. Puedes ver la pieza en movimiento en el reel original.',url:'https://www.instagram.com/camicat_accesorios/reel/Dc6VUZcupEc/'}];
let currentStory=0;
function renderStory(){const s=stories[currentStory];$('#storyContent').innerHTML=`<div class="social-layout"><img src="${s.image}" alt="${escapeHtml(s.title)} · publicación original de Camicat"><div class="social-copy"><span class="eyebrow">@CAMICAT_ACCESORIOS · ${currentStory+1} / ${stories.length}</span><h2>${escapeHtml(s.title)}</h2><p>${escapeHtml(s.text)}</p><a class="button" href="${s.url}" target="_blank" rel="noopener">Ver reel original ${uiIcon('arrow-up-right')}</a><p class="muted" style="margin-top:15px">El video se reproduce en Instagram.</p><div class="social-controls"><button id="storyPrev" aria-label="Publicación anterior">${uiIcon('arrow-left')} Anterior</button><button id="storyNext" aria-label="Publicación siguiente">Siguiente ${uiIcon('arrow-right')}</button></div></div></div>`;$('#storyPrev').onclick=()=>{currentStory=(currentStory+stories.length-1)%stories.length;renderStory()};$('#storyNext').onclick=()=>{currentStory=(currentStory+1)%stories.length;renderStory()}}
$$('[data-story]').forEach(b=>b.onclick=()=>{currentStory=Number(b.dataset.story);renderStory();openDialog('#storyDialog')});
function mixOptions(){const available=products.filter(p=>p.available);const html=available.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} · ${money(p.price)}</option>`).join('');$('#mixA').innerHTML=html;$('#mixB').innerHTML=html;if(available.length>1)$('#mixB').value=(available.find(p=>p.category==='Collares'&&p.id!==available[0].id)||available[1]).id;renderMix()}
function renderMix(){const a=products.find(p=>p.id===$('#mixA').value),b=products.find(p=>p.id===$('#mixB').value);const pair=[a,b].filter(Boolean);$('#mixPreview').innerHTML=pair.map(p=>`<figure><img src="${p.image}" alt="${escapeHtml(p.name)}"><figcaption>${escapeHtml(p.name)}<br>${money(p.price)} · referencial</figcaption></figure>`).join('');$('#mixTotal').textContent=money(pair.reduce((s,p)=>s+p.price,0));$('#mixAdd').disabled=pair.length<2||a.id===b.id;if(a&&b&&a.id===b.id)$('#mixTotal').textContent='Elige dos piezas diferentes'}
$('#mixOpen').onclick=()=>{mixOptions();openDialog('#mixDialog')};$('#mixA').onchange=$('#mixB').onchange=renderMix;
$('#mixAdd').onclick=()=>{const a=$('#mixA').value,b=$('#mixB').value;if(a===b||!canAdd(a)||!canAdd(b))return;add(a);add(b);$('#mixDialog').close();openDialog('#cartDialog')};
