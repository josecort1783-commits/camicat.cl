'use strict';
(()=>{
 const media=matchMedia('(hover:hover) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const portrait=document.querySelector('.atelier-gallery .atelier-portrait');
 if(!portrait)return;
 let frame=0,point=null;
 const reset=()=>{point=null;cancelAnimationFrame(frame);frame=0;portrait.style.removeProperty('transform');};
 const draw=()=>{frame=0;if(!point||!media.matches||reduced.matches)return;
  const rect=portrait.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(point.x-rect.left)/rect.width*2-1)),y=Math.max(-1,Math.min(1,(point.y-rect.top)/rect.height*2-1));
  portrait.style.transform=`perspective(1000px) rotateX(${-y*2.5}deg) rotateY(${x*3.5}deg)`;
 };
 portrait.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||!media.matches||reduced.matches)return;point={x:e.clientX,y:e.clientY};if(!frame)frame=requestAnimationFrame(draw);});
 portrait.addEventListener('pointerleave',reset);portrait.addEventListener('blur',reset,true);
 reduced.addEventListener('change',reset);media.addEventListener('change',reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
})();
