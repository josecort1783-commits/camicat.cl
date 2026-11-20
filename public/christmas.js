'use strict';
(()=>{
 const snow=document.getElementById('christmasSnow');
 if(!snow)return;
 const flakes=document.createDocumentFragment();
 for(let index=0;index<24;index++){
  const flake=document.createElement('i');
  flake.style.setProperty('--snow-left',((index*37)%100)+'%');
  flake.style.setProperty('--snow-size',(2+index%4)+'px');
  flake.style.setProperty('--snow-duration',(13+index%11)+'s');
  flake.style.setProperty('--snow-delay',(-index*1.7)+'s');
  flake.style.setProperty('--snow-drift',((index%2?1:-1)*(20+index%6*9))+'px');
  flakes.append(flake);
 }
 snow.append(flakes);
 const visibility=()=>document.documentElement.classList.toggle('snow-paused',document.hidden);
 document.addEventListener('visibilitychange',visibility);
 visibility();
})();
