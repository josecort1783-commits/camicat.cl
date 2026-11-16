'use strict';
const atelierShowcases={
 'flor-dorada':{study:'wire',technique:'Flores de alambre',note:'Hilos dorados que dibujan una flor.'},
 'borlas-jardin':{study:'color',technique:'Flores y borlas',note:'Colores suaves, flores y un detalle en verde.'},
 'resina-roja':{study:'resin',technique:'Diseños en resina',note:'Rojo, negro y dorado en una pieza de Camicat.'}
};
const atelierTabs=$$('[data-showcase]');
function selectAtelierPiece(id,animate=true){const product=products.find(p=>p.id===id);if(!product){toast('Esta pieza no está en el catálogo actual.');return}
 const info=Object.hasOwn(atelierShowcases,id)?atelierShowcases[id]:{study:'none',technique:product.category,note:'Una pieza del catálogo Camicat.'};
 const shown=atelierTabs.filter(tab=>!tab.hidden),index=shown.findIndex(tab=>tab.dataset.showcase===id);
 $('.atelier-gallery').dataset.study=info.study;
 $('#atelierFeaturedImage').src=product.image;$('#atelierFeaturedImage').alt=product.name+' · fotografía original de Camicat';$('#atelierFeatured').dataset.feature=id;$('#atelierFeatured').setAttribute('aria-label','Ver detalles de '+product.name);$('#atelierPieceName').textContent=product.name;$('#atelierPieceTechnique').textContent=info.technique;$('#atelierPiecePanel').textContent=info.note;$('#atelierPieceNumber').textContent=index<0?'':String(index+1).padStart(2,'0')+' / '+String(shown.length).padStart(2,'0');
 atelierTabs.forEach(tab=>{const selected=tab.dataset.showcase===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;if(selected){$('#atelierPiecePanel').setAttribute('role','tabpanel');$('#atelierPiecePanel').setAttribute('aria-labelledby',tab.id);}});
 if(index<0){$('#atelierPiecePanel').removeAttribute('aria-labelledby');$('#atelierPiecePanel').removeAttribute('role');}
 // A decoded photograph enters gently; keyboard selection stays immediate.
 const photo=$('#atelierFeaturedImage'),imageUrl=photo.src;
 if(animate&&typeof photo.decode==='function')photo.decode().then(()=>{if(photo.src!==imageUrl||typeof photo.animate!=='function'||prefersReducedMotion()||document.documentElement.classList.contains('ambient-static')||document.documentElement.classList.contains('craft-keyboard'))return;photo.getAnimations().forEach(animation=>animation.cancel());photo.animate([{opacity:.55,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.23,1,.32,1)'});}).catch(()=>{});
}
atelierTabs.forEach(tab=>{
 tab.onclick=()=>selectAtelierPiece(tab.dataset.showcase);
 tab.onkeydown=event=>{
  const shown=atelierTabs.filter(item=>!item.hidden),index=shown.indexOf(tab);
  if(index<0)return;
  let next;if(event.key==='ArrowRight')next=(index+1)%shown.length;else if(event.key==='ArrowLeft')next=(index+shown.length-1)%shown.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=shown.length-1;else return;
  event.preventDefault();shown[next].focus();selectAtelierPiece(shown[next].dataset.showcase);
 };
});
function syncAtelierCatalog(){
 const byId=new Map(products.map(p=>[p.id,p]));
 $('.atelier-gallery').hidden=!products.length;
 atelierTabs.forEach(tab=>tab.hidden=!byId.has(tab.dataset.showcase));
 const shown=atelierTabs.filter(tab=>!tab.hidden);
 $('.atelier-tabs').hidden=!shown.length;
 if(!products.length)return;
 const current=$('#atelierFeatured').dataset.feature;
 const id=shown.find(tab=>tab.dataset.showcase===current)?.dataset.showcase??shown[0]?.dataset.showcase??(byId.has(current)?current:(products.find(p=>p.available)??products[0]).id);
 selectAtelierPiece(id,false);
}
// The page remains visible when observation is unavailable or motion is disabled.
if(typeof IntersectionObserver==='function'&&!prefersReducedMotion()){
 const enterObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');enterObserver.unobserve(entry.target);}});},{threshold:.08});
 $$('.atelier-enter,.atelier-wire').forEach(el=>{el.classList.add('reveal-enabled');enterObserver.observe(el);});
}
$$('.atelier-fold').forEach(fold=>fold.addEventListener('toggle',()=>{if(fold.open)fold.classList.add('has-opened');}));
