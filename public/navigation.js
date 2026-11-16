'use strict';
const prefersReducedMotion=()=>typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const filterPanel=$('#filterPanel');
function updateFilterStatus(){const parts=[];if(availableOnly)parts.push('Solo disponibles');if(Number.isFinite(maxPrice))parts.push(`Hasta ${money(maxPrice)}`);$('#filterStatus').textContent=parts.length?parts.join(' · '):'Disponibilidad y precio';filterPanel.classList.toggle('has-filters',parts.length>0);}
window.addEventListener('camicat:catalog-render',updateFilterStatus);
$$('.guide-accordion details').forEach(item=>item.addEventListener('toggle',()=>{if(!item.open)return;$$('.guide-accordion details').forEach(other=>{if(other!==item)other.open=false;});}));
function updateScrollTools(){const scrollable=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);const position=Math.max(0,window.scrollY||document.documentElement.scrollTop||0);const progress=scrollable>0?Math.min(100,Math.max(0,position/scrollable*100)):0;$('#backToTop').hidden=position<360||scrollable<360;$('#scrollProgressRing').style.strokeDashoffset=String(100-progress);if(!document.documentElement.classList.contains('ambient-static'))document.documentElement.style.setProperty('--ambient-scroll',String(progress/100));}
let scrollUpdatePending=false;
const scheduleScrollUpdate=()=>{if(scrollUpdatePending)return;scrollUpdatePending=true;const frame=window.requestAnimationFrame||((fn)=>setTimeout(fn,16));frame(()=>{scrollUpdatePending=false;updateScrollTools();});};
window.addEventListener('scroll',scheduleScrollUpdate,{passive:true});window.addEventListener('resize',()=>{scheduleScrollUpdate();});window.addEventListener('load',scheduleScrollUpdate);
if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(scheduleScrollUpdate);observer.observe(document.body);}
$('#backToTop').onclick=()=>{window.scrollTo({top:0,behavior:prefersReducedMotion()?'auto':'smooth'});$('.brand').focus({preventScroll:true});};
updateFilterStatus();updateScrollTools();
