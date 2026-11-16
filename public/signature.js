'use strict';
// A local, deterministic guide using the actual catalogue. No visitor profile is stored.
const styleEdits={
 gold:{name:'Luz dorada',daily:['negro-dorado','flor-dorada'],special:['flor-dorada','negro-dorado'],gift:['flor-dorada','flor-verde']},
 garden:{name:'Flores y color',daily:['flor-verde','jardin-color'],special:['borlas-jardin','collar-color'],gift:['borlas-jardin','flor-verde']},
 contrast:{name:'Con carácter',daily:['negro-dorado','flor-turquesa'],special:['resina-roja','flor-turquesa'],gift:['flor-turquesa','resina-roja']}
};
let styleMood=null,styleStage=1;
function stylePanel(stage){
 styleStage=stage;
 $('#styleMoodPanel').hidden=stage!==1;$('#styleOccasionPanel').hidden=stage!==2;$('#styleResultPanel').hidden=stage!==3;
 $('#styleBack').hidden=stage===1;
 $('#styleStepOne').toggleAttribute('aria-current',stage===1);if(stage===1)$('#styleStepOne').setAttribute('aria-current','step');
 $('#styleStepTwo').toggleAttribute('aria-current',stage===2);if(stage===2)$('#styleStepTwo').setAttribute('aria-current','step');
 $('#styleDialogTitle').innerHTML=stage===3?'Un detalle <em>muy tuyo.</em>':'Encuentra tu <em>estilo.</em>';
 $('#styleProgress').textContent=stage===3?'Tu selección está lista':`Paso ${stage} de 2`;
 $('#styleDialogTitle').focus({preventScroll:true});$('#styleDialog').scrollTop=0;
}
function chooseStyleMood(mood){if(!styleEdits[mood])return;styleMood=mood;$('#styleChosenMood').textContent=`Tu punto de partida: ${styleEdits[mood].name}.`;stylePanel(2);}
function openStyleFinder(mood){styleMood=null;$('#styleResults').replaceChildren();openDialog('#styleDialog');if(styleEdits[mood])chooseStyleMood(mood);else stylePanel(1);}
$('#surprise').onclick=()=>openStyleFinder();
$$('[data-style-start]').forEach(button=>button.addEventListener('click',()=>openStyleFinder(button.dataset.styleStart)));
$$('[data-style-mood]').forEach(button=>button.addEventListener('click',()=>chooseStyleMood(button.dataset.styleMood)));
$$('[data-style-occasion]').forEach(button=>button.addEventListener('click',()=>{
 const edit=styleEdits[styleMood],occasion=button.dataset.styleOccasion;if(!edit||!edit[occasion])return;
 const picks=edit[occasion].map(id=>products.find(p=>p.id===id&&p.available)).filter(Boolean);
 $('#styleResultIntro').textContent={daily:'Detalles para acompañarte en lo cotidiano.',special:'Formas y colores para darle intención a tu look.',gift:'Dos ideas para un regalo con personalidad.'}[occasion];
 $('#styleResults').innerHTML=picks.length?picks.map(p=>`<article class="style-pick"><button class="style-pick-photo" data-style-view="${escapeHtml(p.id)}" aria-label="Ver detalles de ${escapeHtml(p.name)}"><img src="${p.image}" alt="${escapeHtml(p.name)} de Camicat" width="360" height="640"></button><h3>${escapeHtml(p.name)}</h3><p>${money(p.price)} <small>referencial</small></p><button class="button secondary" data-style-view="${escapeHtml(p.id)}">Ver pieza ${uiIcon('arrow-up-right')}</button></article>`).join(''):'<p class="style-hint">Las piezas de esta selección no están disponibles en el catálogo actual. Prueba otro estilo o explora la tienda.</p>';
 stylePanel(3);
}));
$('#styleBack').onclick=()=>stylePanel(styleStage===3?2:1);
$('#styleResults').addEventListener('click',event=>{const button=event.target.closest('[data-style-view]');if(!button)return;$('#styleDialog').close();showProduct(button.dataset.styleView);});
