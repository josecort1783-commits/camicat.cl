'use strict';
(()=>{
 const sections=[...document.querySelectorAll('[data-camicat-page]')],switcher=document.querySelector('#siteMenu'),wayfinding=document.querySelector('#pageWayfinding'),label=document.querySelector('#pageCurrentLabel');
 const more=new Set(['mas','destacados','diario','tu-estilo','combinar','guia','regalos','contacto']);
 const allowed=new Set(['','coleccion','personaliza','estudio-3d','encuentranos','nuestra-historia',...more]);const title=document.title;
 function route(hash,{scroll=true,focus=true}={}){
  let id;try{id=decodeURIComponent((hash||'').replace(/^#/,''));}catch{id='';}if(!allowed.has(id))id='';
  const page=more.has(id)?'mas':'inicio';sections.forEach(section=>section.hidden=section.dataset.camicatPage!==page);document.documentElement.dataset.camicatView=page;
  wayfinding.hidden=page==='inicio';label.textContent='Más de Camicat';label.setAttribute('role','heading');label.setAttribute('aria-level','1');label.tabIndex=-1;
  document.title=page==='inicio'?title:`Más de Camicat · Accesorios artesanales`;
  switcher.href=page==='inicio'?'#mas':'#coleccion';switcher.innerHTML=page==='inicio'?'Más de Camicat '+uiIcon('arrow-up-right'):'Volver a la tienda '+uiIcon('arrow-up-right');
  if(scroll)requestAnimationFrame(()=>{const target=document.getElementById(id==='regalos'?'destacados':id);if(target)target.scrollIntoView({behavior:'instant',block:'start'});else window.scrollTo({top:0,behavior:'instant'});if(focus&&id==='personaliza')document.querySelector('#customTitle').focus({preventScroll:true});else if(page==='mas'&&focus&&id==='mas')label.focus({preventScroll:true});if(typeof scheduleScrollUpdate==='function')scheduleScrollUpdate();});
 }
 function go(hash){if(location.hash!==hash)history.pushState(null,'',hash||location.pathname+location.search);route(hash);}
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const anchor=event.target.closest('a[href^="#"]');if(anchor){const hash=anchor.getAttribute('href');let id;try{id=decodeURIComponent(hash.slice(1));}catch{return;}if(allowed.has(id)){event.preventDefault();if(anchor.hasAttribute('data-full-catalog'))document.querySelector('#clearFilters').click();go(hash);return;}}
  if(event.target.closest('#favoritesToggle,#mobileFavorites,#giftFind,#emptyExplore,#welcomeApply'))go('#coleccion');
 },true);
 window.addEventListener('hashchange',()=>route(location.hash));window.addEventListener('popstate',()=>route(location.hash));route(location.hash,{scroll:!!location.hash,focus:false});
})();
