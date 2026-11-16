'use strict';
(()=>{
 const root=document.documentElement;
 document.addEventListener('keydown',event=>{if(['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(event.key))root.classList.add('craft-keyboard');},true);
 document.addEventListener('pointerdown',()=>root.classList.remove('craft-keyboard'),{capture:true,passive:true});
 // Brief, local feedback on the actual product button; no particle effects or delayed navigation.
 const timers=new WeakMap();
 document.querySelector('#products').addEventListener('camicat:added',event=>{
  const button=event.target.closest('[data-add]');if(!button||button.disabled)return;
  const row=button.closest('.product-card');if(!row)return;row.dataset.justAdded='true';clearTimeout(timers.get(row));timers.set(row,setTimeout(()=>delete row.dataset.justAdded,650));
 });
})();
