'use strict';
function renderSeasonalEdit(){
 const host=document.getElementById('seasonalEdit');
 if(!host)return;
 const primary=document.getElementById('atelierFeatured').dataset.feature;
 const pieces=products.filter(piece=>piece.id!==primary&&quantityLimit(piece)>0&&safeImage(piece.image))
  .sort((a,b)=>Number(b.featured??featureDefaults.has(b.id))-Number(a.featured??featureDefaults.has(a.id))).slice(0,2);
 host.replaceChildren();
 for(const piece of pieces){
  const button=document.createElement('button');
  button.type='button';
  button.className='seasonal-edit-piece';
  button.setAttribute('aria-label','Ver detalles de '+piece.name);
  const image=document.createElement('img');
  image.src=piece.image;image.alt='';image.width=80;image.height=100;image.loading='lazy';
  const text=document.createElement('span');
  const name=document.createElement('strong');
  name.textContent=piece.name;
  const price=document.createElement('span');
  price.textContent=money(piece.price);
  text.append(name,price);
  button.append(image,text);
  button.onclick=()=>showProduct(piece.id);
  host.append(button);
 }
 host.hidden=!pieces.length;
}
renderSeasonalEdit();
