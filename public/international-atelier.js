'use strict';
/* Real photograph detail, without synthesising another view of the product. */
(()=>{
 const photo=document.getElementById('atelierFeaturedImage');
 const portrait=document.getElementById('atelierFeatured');
 const toggle=document.getElementById('atelierMagnify');
 const hint=document.getElementById('atelierZoomHint');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const fine=matchMedia('(hover: hover) and (pointer: fine)');
 const motionOff=()=>reduced.matches||document.documentElement.classList.contains('ambient-static');
 if(photo&&portrait&&toggle&&hint){
  const reset=()=>{
   portrait.classList.remove('is-magnified');toggle.setAttribute('aria-pressed','false');
   toggle.textContent='Ampliar fotografía';hint.textContent='Fotografía de una pieza Camicat';
   portrait.style.removeProperty('--photo-x');portrait.style.removeProperty('--photo-y');
  };
  toggle.addEventListener('click',()=>{
   if(toggle.getAttribute('aria-pressed')==='true'){reset();return;}
   portrait.classList.add('is-magnified');toggle.setAttribute('aria-pressed','true');
   toggle.textContent='Ver foto completa';
   hint.textContent=fine.matches?'Mueve el cursor para recorrer el detalle':'Detalle ampliado de la foto original';
  });
  portrait.addEventListener('pointermove',event=>{
   if(!fine.matches||!portrait.classList.contains('is-magnified'))return;
   const r=portrait.getBoundingClientRect();
   portrait.style.setProperty('--photo-x',Math.max(0,Math.min(100,(event.clientX-r.left)/r.width*100))+'%');
   portrait.style.setProperty('--photo-y',Math.max(0,Math.min(100,(event.clientY-r.top)/r.height*100))+'%');
  });
  portrait.addEventListener('pointerleave',()=>{
   portrait.style.removeProperty('--photo-x');portrait.style.removeProperty('--photo-y');
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')reset();});
  new MutationObserver(reset).observe(photo,{attributes:true,attributeFilter:['src']});
 }
 // Animate only visible arrivals. A missing observer or failed JS leaves all content readable.
 if(typeof IntersectionObserver!=='function'||typeof Element.prototype.animate!=='function')return;
 const targets=new Set();
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   observer.unobserve(entry.target);
   if(motionOff())continue;
   const el=entry.target;
   if(el.closest('[hidden]'))continue;
   const animation=el.animate([{opacity:.65,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],
    {duration:520,delay:Number(el.dataset.intlDelay||0),easing:'cubic-bezier(.2,.7,.3,1)'});
   const stop=()=>animation.cancel();
   reduced.addEventListener('change',stop,{once:true});
   animation.finished.catch(()=>{}).finally(()=>reduced.removeEventListener('change',stop));
  }
 },{threshold:.07});
 const observe=(scope)=>{
  scope.querySelectorAll('.atelier-intro h1,.atelier-lead,.atelier-gallery,.shop-title h2,#products .product-card,.custom-intro h2,.studio-copy h2,.heart-story-heading h2').forEach((el,index)=>{
   if(targets.has(el))return;
   targets.add(el);el.dataset.intlDelay=String(Math.min(index%3,2)*65);observer.observe(el);
  });
 };
 observe(document);
 const catalog=document.getElementById('products');
 if(catalog)new MutationObserver(()=>observe(catalog)).observe(catalog,{childList:true});
 reduced.addEventListener('change',()=>{if(reduced.matches)document.getAnimations().forEach(a=>{if(a.effect?.target?.dataset?.intlDelay!==undefined)a.cancel();});});
})();
