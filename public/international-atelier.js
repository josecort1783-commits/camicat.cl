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
})();
