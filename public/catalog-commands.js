'use strict';
(()=>{
 const dialog=document.getElementById('catalogCommands');
 const opener=document.getElementById('catalogCommandsOpen');
 const query=document.getElementById('catalogCommandQuery');
 const list=document.getElementById('catalogCommandList');
 const close=document.getElementById('catalogCommandsClose');
 const search=document.getElementById('search');
 const tags=document.getElementById('catalogActiveFilters');
 if(!dialog||!opener||!query||!list||!search)return;
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
 const actions=[...list.querySelectorAll('button,a')];
 let origin=null;
 function filter(){
  const words=normalize(query.value).trim().split(/\s+/).filter(Boolean);
  actions.forEach(el=>el.hidden=!words.every(word=>normalize(el.dataset.terms+' '+el.textContent).includes(word)));
  document.getElementById('catalogCommandsEmpty').hidden=actions.some(el=>!el.hidden);
 }
 function open(){
  if(document.querySelector('dialog[open]'))return;
  origin=document.activeElement;query.value='';filter();dialog.showModal();query.focus();
 }
 function go(hash,focus){
  dialog.close();
  const link=[...document.querySelectorAll('a[href]')].find(a=>a.getAttribute('href')===hash);
  if(link)link.click();else location.hash=hash;
  if(focus)requestAnimationFrame(()=>requestAnimationFrame(()=>focus.focus({preventScroll:true})));
 }
 if(typeof dialog.showModal!=='function'){opener.hidden=true;return;}
 opener.addEventListener('click',open);
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{if(origin?.isConnected)origin.focus({preventScroll:true});});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 query.addEventListener('input',filter);
 dialog.addEventListener('keydown',e=>{
  const visible=actions.filter(a=>!a.hidden);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   if(!visible.length)return;e.preventDefault();
   const i=visible.indexOf(document.activeElement),delta=e.key==='ArrowDown'?1:-1;
   visible[i<0?(delta>0?0:visible.length-1):(i+delta+visible.length)%visible.length].focus();
  }else if(e.key==='Enter'&&e.target===query){e.preventDefault();visible[0]?.click();}
 });
 list.addEventListener('click',e=>{
  const action=e.target.closest('[data-command]');if(!action)return;
  switch(action.dataset.command){
   case 'search':go('#coleccion',search);break;
   case 'favorites':dialog.close();document.getElementById('favoritesToggle').click();break;
   case 'custom':go('#personaliza',document.getElementById('customTitle'));break;
   case 'studio':go('#estudio-3d');break;
   case 'cart':dialog.close();document.getElementById('cartOpen').click();break;
  }
 });
 document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.isComposing||e.altKey)return;
  const target=e.target;
  const editable=target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
  if(editable||document.querySelector('dialog[open]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}
  else if(!e.ctrlKey&&!e.metaKey&&(e.key==='/'||e.code==='Slash')){e.preventDefault();go('#coleccion',search);}
 });
 let lastTagSignature=null;
 function updateTags(){
  if(!tags)return;
  const active=document.querySelector('.chips [data-filter][aria-pressed="true"]');
  const items=[];
  if(active&&active.dataset.filter!=='Todos')items.push({text:active.dataset.filter,clear:()=>document.querySelector('.chips [data-filter="Todos"]').click()});
  if(search.value.trim())items.push({text:'Búsqueda: '+search.value.trim(),clear:()=>{search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}});
  const available=document.getElementById('availableOnly');
  if(available?.checked)items.push({text:'Solo disponibles',clear:()=>available.click()});
  const budget=document.getElementById('budgetReset');
  if(budget&&!budget.disabled)items.push({text:document.getElementById('budgetLabel').textContent,clear:()=>budget.click()});
  const signature=JSON.stringify(items.map(item=>item.text));
  if(signature===lastTagSignature)return;
  lastTagSignature=signature;
  tags.replaceChildren();tags.hidden=!items.length;
  for(const item of items){
   const b=document.createElement('button');b.type='button';b.textContent=item.text+' ×';b.setAttribute('aria-label','Quitar filtro: '+item.text);
   b.addEventListener('click',()=>{item.clear();document.getElementById('clearCatalogFilters').hidden?search.focus({preventScroll:true}):document.getElementById('clearCatalogFilters').focus({preventScroll:true});});tags.append(b);
  }
 }
 window.addEventListener('camicat:catalog-render',updateTags);updateTags();
 const count=document.getElementById('cartCount'),bag=document.getElementById('cartOpen');
 if(count&&bag){let previous=count.textContent;
  new MutationObserver(()=>{
   const current=count.textContent;if(current===previous)return;previous=current;
   if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('ambient-static')||typeof bag.animate!=='function')return;
   bag.getAnimations().forEach(a=>a.cancel());bag.animate([{transform:'scale(1)'},{transform:'scale(1.07)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'});
  }).observe(count,{childList:true,characterData:true,subtree:true});
 }
})();
