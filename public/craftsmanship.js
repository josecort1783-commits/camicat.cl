'use strict';
const craftDetails={
 wire:{number:'01',title:'Antes de la flor, está el alambre.',text:'En esta fotografía del taller puedes ver los hilos dorados que forman parte de sus creaciones. El alambrismo es una de las técnicas que Camicat comparte en sus publicaciones.'},
 tools:{number:'02',title:'Herramientas al servicio del detalle.',text:'Alicates y herramientas sobre la mesa de trabajo. Una mirada a los elementos que acompañan el trabajo manual de Juany y Gabriel.'},
 color:{number:'03',title:'El color también se elige a mano.',text:'Turquesas, rojos, verdes y tonos cálidos conviven en la mesa. Las flores y combinaciones de color son parte de la identidad que Camicat expresa en sus diseños.'}
};
let craftSelection='wire';
function showCraftDetail(key){const detail=craftDetails[key];if(!detail)return;craftSelection=key;$('#craftTitle').textContent=detail.title;$('#craftText').textContent=detail.text;$('#craftCounter').textContent=detail.number+' / 03';$$('[data-craft]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.craft===key)));}
$$('[data-craft]').forEach(button=>button.onclick=()=>showCraftDetail(button.dataset.craft));
$('#craftNext').onclick=()=>{const keys=Object.keys(craftDetails);showCraftDetail(keys[(keys.indexOf(craftSelection)+1)%keys.length]);};
let activePhotoKind='original';
function setPhotoMode(mode){
 const detail=mode==='detail';
 $('#fullPhotoStage').classList.toggle('is-detail',detail);
 $$('[data-photo-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.photoMode===(detail?'detail':'full'))));
 $('#fullPhotoCaption').textContent=(activePhotoKind==='worn'?'Joya puesta':'Fotografía original de Camicat')+(detail?' · acercamiento de la misma foto':' · vista completa');
}
function viewCompletePhoto(id,kind='original'){
 const product=products.find(item=>item.id===id);
 if(!product)return;
 const worn=kind==='worn'&&productFacts(product).wornImage;
 activePhotoKind=worn?'worn':'original';
 $('#fullPhotoImage').src=worn||product.image;
 $('#fullPhotoImage').alt=product.name+(worn?' · joya puesta':' · fotografía original de Camicat');
 $('#fullPhotoTitle').textContent=product.name;
 setPhotoMode('full');
 openDialog('#photoDialog');
}
$$('[data-photo-mode]').forEach(button=>button.onclick=()=>setPhotoMode(button.dataset.photoMode));
$('#productDetail').addEventListener('click',event=>{
 const button=event.target.closest('[data-full-photo]');
 if(button)viewCompletePhoto(button.dataset.fullPhoto,button.dataset.photoKind);
});
