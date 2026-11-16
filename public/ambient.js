'use strict';
const ambientMotionQuery=typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
let ambientEnabled=read('-ambient-enabled',true)!==false;
function syncAmbientPreference(){const reduced=ambientMotionQuery?.matches===true;const enabled=ambientEnabled&&!reduced;document.documentElement.classList.toggle('ambient-static',!enabled);$('#ambientToggle').setAttribute('aria-pressed',String(enabled));$('#ambientToggle').disabled=reduced;$('#ambientState').textContent=reduced?'sin movimiento':enabled?'activado':'desactivado';if(enabled)updateScrollTools();}
$('#ambientToggle').onclick=()=>{ambientEnabled=!ambientEnabled;write('-ambient-enabled',ambientEnabled);syncAmbientPreference();};
if(ambientMotionQuery?.addEventListener)ambientMotionQuery.addEventListener('change',syncAmbientPreference);
syncAmbientPreference();
