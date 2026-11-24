'use strict';
(()=>{
 const root=document.documentElement;
 const hero=document.querySelector('.atelier-hero');
 const button=document.getElementById('cinemaMotion');
 const meter=document.getElementById('cinemaReading');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let userPaused=false,visible=false,frame=0;
 const active=new Set();
 function sync(){
  const disabled=reduced.matches||root.classList.contains('ambient-static');
  const paused=disabled||userPaused||document.hidden||!visible||!!hero?.hidden;
  hero?.classList.toggle('cinema-active',visible);
  hero?.classList.toggle('cinema-paused',paused);
  if(button){
   button.disabled=disabled;
   button.setAttribute('aria-pressed',String(userPaused));
   button.textContent=disabled?'Movimiento reducido':userPaused?'Activar movimiento':'Pausar movimiento';
  }
  if(paused)for(const animation of active)animation.cancel();
 }
 button?.addEventListener('click',()=>{userPaused=!userPaused;sync();});
 reduced.addEventListener('change',sync);
 document.addEventListener('visibilitychange',sync);
 new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
 if(hero)new MutationObserver(sync).observe(hero,{attributes:true,attributeFilter:['hidden']});
 function progress(){
  frame=0;if(!meter)return;
  const length=root.scrollHeight-root.clientHeight;
  meter.style.transform='scaleX('+Math.min(1,Math.max(0,length>0?window.scrollY/length:0))+')';
 }
 const requestProgress=()=>{if(!frame)frame=requestAnimationFrame(progress);};
 window.addEventListener('scroll',requestProgress,{passive:true});
 window.addEventListener('resize',requestProgress,{passive:true});
 if(typeof ResizeObserver==='function')new ResizeObserver(requestProgress).observe(document.body);
 progress();
 if(typeof IntersectionObserver!=='function'){visible=true;sync();return;}
 if(hero)new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:0}).observe(hero);
 if(typeof Element.prototype.animate!=='function'){sync();return;}
 const seen=new WeakSet();
 const arrivals=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   const el=entry.target;
   if(!entry.isIntersecting||el.closest('[hidden]'))return;
   arrivals.unobserve(el);
   if(reduced.matches||root.classList.contains('ambient-static')||userPaused||el.contains(document.activeElement))return;
   const from=el.classList.contains('folio')?{opacity:.8,transform:'translateY(18px) scale(.985)'}:{opacity:.7,transform:'translateY(18px)'};
   const animation=el.animate([from,{opacity:1,transform:'translateY(0) scale(1)'}],{duration:600,delay:Number(el.dataset.cinemaDelay||0),easing:'cubic-bezier(.2,.7,.3,1)'});
   active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
  });
 },{threshold:.06});
 const register=scope=>{
  scope.querySelectorAll('.atelier-intro h1,.atelier-lead,.atelier-hero-actions,.atelier-gallery,.shop-title h2,#products .product-card,.custom-intro h2,.custom-figure,.studio-copy h2,.studio-display,.heart-story-heading h2,.catalog-welcome,.agenda-cards').forEach((el,index)=>{
   if(seen.has(el))return;seen.add(el);el.dataset.cinemaDelay=String(Math.min(index%3,2)*65);arrivals.observe(el);
  });
 };
 register(document);
 const products=document.getElementById('products');
 if(products)new MutationObserver(()=>register(products)).observe(products,{childList:true});
 sync();
})();
