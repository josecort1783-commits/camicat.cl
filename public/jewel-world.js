'use strict';
const jewelLights={forest:'verde salvia',light:'blanco y verde suave'};
const jewelHero=$('.atelier-hero');
function chooseJewelLight(light,announce=true){
 if(!Object.hasOwn(jewelLights,light))light=light==='pearl'?'light':'forest';
 document.documentElement.dataset.jewelScene=light;
 $$('button[data-jewel-light]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.jewelLight===light)));
 write('-jewel-light',light);
 if(announce)$('#jewelLightStatus').textContent=`Ambiente ${jewelLights[light]} seleccionado.`;
}
const jewelLightButtons=$$('button[data-jewel-light]');
jewelLightButtons.forEach((button,index)=>{
 button.addEventListener('click',()=>chooseJewelLight(button.dataset.jewelLight));
 button.addEventListener('keydown',event=>{
  let next;if(event.key==='ArrowRight')next=(index+1)%jewelLightButtons.length;else if(event.key==='ArrowLeft')next=(index+jewelLightButtons.length-1)%jewelLightButtons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=jewelLightButtons.length-1;else return;
  event.preventDefault();jewelLightButtons[next].focus({preventScroll:true});chooseJewelLight(jewelLightButtons[next].dataset.jewelLight);
 });
});
function syncHeroMotion(){
 const reduced=ambientMotionQuery?.matches===true,enabled=!document.documentElement.classList.contains('ambient-static');
 $('#heroMotionToggle').setAttribute('aria-pressed',String(enabled));$('#heroMotionToggle').disabled=reduced;
 $('#heroMotionToggle').textContent=reduced?'Sin movimiento':enabled?'Pausar fondo':'Animar fondo';
}
$('#heroMotionToggle').onclick=()=>{$('#ambientToggle').click();syncHeroMotion();};
$('#ambientToggle').addEventListener('click',syncHeroMotion);
if(ambientMotionQuery?.addEventListener)ambientMotionQuery.addEventListener('change',syncHeroMotion);
chooseJewelLight(read('-jewel-light','forest'),false);syncHeroMotion();
