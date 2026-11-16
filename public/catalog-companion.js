'use strict';
(() => {
 const MAX=3, RECENT_MAX=4, recentKey='-recent-pieces';
 const tray=$('#compareTray'), grid=$('#products'), dialog=$('#compareDialog');
 const productDialog=$('#productDialog'), recentSection=$('#recentPieces');
 const idPattern=/^[a-z][a-z0-9-]{0,98}$/;
 const compare=[];
 const validIds=value=>Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&idPattern.test(id)))].slice(0,RECENT_MAX):[];
 let recent=validIds(read(recentKey,[]));
 let compareOrigin=null, recentOrigin=null, deepOpened=false;
 const incoming=new URL(window.location.href).searchParams.get('pieza');
 let deepPending=incoming&&idPattern.test(incoming)?incoming:null;
 const find=id=>products.find(p=>p.id===id&&p.visible!==false);
 const picked=()=>compare.map(find).filter(Boolean);
 const photo=(p,w=80,h=80)=>`<img src="${escapeHtml(p.image)}" alt="" loading="lazy" width="${w}" height="${h}">`;
 function updateCompare(){
  const current=picked(), ids=new Set(current.map(p=>p.id));
  for(const button of grid.querySelectorAll('[data-compare]')){
   button.setAttribute('aria-pressed',String(ids.has(button.dataset.compare)));
  }
  tray.hidden=!current.length;
  $('#compareSelection').innerHTML=current.map(p=>`<li><button type="button" data-compare-remove="${escapeHtml(p.id)}" aria-label="Quitar ${escapeHtml(p.name)} de la comparación">${escapeHtml(p.name)} <span aria-hidden="true">×</span></button></li>`).join('');
  $('#compareHint').textContent=current.length===1?'Elige otra pieza para verlas juntas.':`${current.length} de ${MAX} piezas seleccionadas`;
  $('#compareOpen').disabled=current.length<2;
 }
 function toggleCompare(id,button){
  const p=find(id);
  if(!p)return;
  const index=compare.indexOf(id);
  if(index>=0){
   compare.splice(index,1);
   $('#compareStatus').textContent=`${p.name} se quitó de la comparación.`;
  }else{
   if(compare.length===MAX){
    $('#compareStatus').textContent='';
    toast('Puedes comparar hasta 3 piezas. Quita una para agregar otra.');
    return;
   }
   compare.push(id);
   compareOrigin=button;
   $('#compareStatus').textContent=compare.length>=2?`${p.name} se agregó. Ya puedes ver la comparación arriba del catálogo.`:`${p.name} se agregó. Elige otra pieza para comparar.`;
  }
  updateCompare();
 }
 function makeCompareButtons(){
  for(const card of grid.querySelectorAll('.product-card')){
   const add=card.querySelector('[data-add]');
   if(!add||card.querySelector('[data-compare]'))continue;
   const p=find(add.dataset.add);
   if(!p)continue;
   const b=document.createElement('button');
   b.type='button';b.className='compare-toggle';b.dataset.compare=p.id;
   b.setAttribute('aria-label',`Comparar: ${p.name}`);
   b.innerHTML='<span aria-hidden="true"></span>Comparar';
   add.after(b);
  }
 }
 function showComparison(){
  const current=picked();
  if(current.length<2||dialog.open)return;
  $('#compareDetails').style.setProperty('--compare-cols',current.length);
  $('#compareDetails').innerHTML=current.map(p=>{
   const facts=productFacts(p);
   const availability=!quantityLimit(p)?'Agotada':Number.isInteger(p.stock)?'Disponible según catálogo':'Stock por confirmar';
   const rows=[['Categoría',p.category],['Material',facts.material],['Medidas',facts.dimensions],['Disponibilidad',availability]];
   return `<article class="compare-piece">${photo(p,184,144)}<div class="compare-piece-content"><h3>${escapeHtml(p.name)}</h3><p class="compare-price">${money(p.price)} <small>Precio referencial</small></p><dl>${rows.map(([key,value])=>`<div><dt>${key}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><button type="button" class="companion-primary" data-compare-view="${escapeHtml(p.id)}" aria-label="Ver pieza: ${escapeHtml(p.name)}">Ver pieza</button></div></article>`;
  }).join('');
  openDialog('#compareDialog');
  $('#compareTitle').focus();
 }
 function showRecent(){
  const current=recent.map(find).filter(Boolean);
  recentSection.hidden=!current.length;
  $('#recentList').innerHTML=current.map(p=>`<button type="button" class="recent-piece" data-recent-view="${escapeHtml(p.id)}" aria-label="Volver a ver ${escapeHtml(p.name)}">${photo(p,64,64)}<span><small>${escapeHtml(p.category)}</small><strong>${escapeHtml(p.name)}</strong></span>${uiIcon('arrow-up-right')}</button>`).join('');
 }
 function saveRecent(){
  try{localStorage.setItem(KEY+recentKey,JSON.stringify(recent));}catch{/* Browsing still works without local storage. */}
 }
 function addShare(id){
  const target=$('#productDetail .detail-price');
  if(!target)return;
  target.insertAdjacentHTML('afterend',`<div class="detail-share"><button type="button" class="companion-text" id="sharePiece">${uiIcon('arrow-up-right')} Copiar enlace</button><p id="shareStatus" role="status"></p><div id="shareFallback" hidden><label for="shareUrl">Enlace de esta pieza</label><input id="shareUrl" type="text" readonly></div></div>`);
  const shareUrl=new URL(window.location.pathname,window.location.origin);
  shareUrl.searchParams.set('pieza',id);shareUrl.hash='coleccion';
  const button=$('#sharePiece');
  button.addEventListener('click',async()=>{
   try{
    await navigator.clipboard.writeText(shareUrl.href);
    if(button.isConnected)$('#shareStatus').textContent='Enlace copiado.';
   }catch{
    if(!button.isConnected)return;
    $('#shareFallback').hidden=false;
    $('#shareStatus').textContent='Selecciona el enlace para copiarlo.';
    const input=$('#shareUrl');input.value=shareUrl.href;input.focus();input.select();
   }
  });
 }
 function tryDeepLink(){
  if(!deepPending||!find(deepPending)||document.querySelector('dialog[open]'))return;
  const id=deepPending;deepPending=null;deepOpened=true;
  showProduct(id);
 }
 grid.addEventListener('click',event=>{
  const button=event.target.closest('[data-compare]');
  if(button)toggleCompare(button.dataset.compare,button);
 });
 $('#compareOpen').addEventListener('click',showComparison);
 $('#compareSelection').addEventListener('click',event=>{
  const button=event.target.closest('[data-compare-remove]');
  if(!button)return;
  const id=button.dataset.compareRemove;
  toggleCompare(id,button);
  (tray.querySelector('[data-compare-remove]')||grid.querySelector(`[data-compare="${id}"]`)||$('#search')).focus({preventScroll:true});
 });
 $('#compareClear').addEventListener('click',()=>{
  compare.length=0;updateCompare();
  (compareOrigin?.isConnected?compareOrigin:grid.querySelector('[data-compare]')||$('#search')).focus({preventScroll:true});
  $('#compareStatus').textContent='Se limpió tu selección para comparar.';
 });
 let switching=false;
 dialog.addEventListener('click',event=>{
  const button=event.target.closest('[data-compare-view]');
  if(!button)return;
  const p=find(button.dataset.compareView);
  if(!p)return;
  switching=true;dialog.close();$('#compareOpen').focus({preventScroll:true});showProduct(p.id);
 });
 dialog.addEventListener('close',()=>{
  if(!switching&&!productDialog.open&& !tray.hidden)$('#compareOpen').focus({preventScroll:true});
  switching=false;
 });
 $('#recentList').addEventListener('click',event=>{
  const button=event.target.closest('[data-recent-view]');
  if(!button)return;
  recentOrigin=button.dataset.recentView;showProduct(recentOrigin);
 });
 $('#recentClear').addEventListener('click',()=>{
  recent=[];saveRecent();showRecent();$('#search').focus({preventScroll:true});
  $('#compareStatus').textContent='Se borró el historial de piezas vistas.';
 });
 window.addEventListener('camicat:product-open',event=>{
  const {id}=event.detail;
  if(!find(id))return;
  if(!deepOpened)deepPending=null;
  if(recent[0]!==id){
   recent=[id,...recent.filter(other=>other!==id)].slice(0,RECENT_MAX);
   saveRecent();showRecent();
  }
  addShare(id);
 });
 productDialog.addEventListener('close',()=>{
  if(recentOrigin&&!document.querySelector('dialog[open]'))$('#recentList').querySelector(`[data-recent-view="${recentOrigin}"]`)?.focus({preventScroll:true});
  recentOrigin=null;
  if(!deepOpened)return;
  deepOpened=false;
  const url=new URL(window.location.href);
  url.searchParams.delete('pieza');
  history.replaceState(history.state,'',url);
 });
 function syncCatalog(){
  for(let i=compare.length-1;i>=0;i--)if(!find(compare[i]))compare.splice(i,1);
  makeCompareButtons();updateCompare();showRecent();tryDeepLink();
 }
 window.addEventListener('camicat:catalog-render',syncCatalog);
 syncCatalog();
})();
