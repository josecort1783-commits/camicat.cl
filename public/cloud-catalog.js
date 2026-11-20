'use strict';
// Refresh only when returning to an open tab. Preserve the last good response on errors.
(()=>{
 let inFlight=null,lastAttempt=0,loadedRevision=null;
 function refresh(){
  if(inFlight)return inFlight;
  if(Date.now()-lastAttempt<30000)return Promise.resolve();
  lastAttempt=Date.now();
  inFlight=(async()=>{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
   try{
    const response=await fetch('https://wbqpcunyzvdvhaiduyem.supabase.co/rest/v1/camicat_public_catalog?id=eq.main&select=revision,products',{headers:{apikey:'sb_publishable_cYM7lEnUtR51n2-Gqhv5kQ_TKbRnu_h'},cache:'no-store',signal:controller.signal});
    if(!response.ok)return;
    const data=await response.json(),row=data?.[0],items=row?.products;
    if(!Array.isArray(items)||items.length>300||!items.every(p=>validProduct(p)&&(p.stock===null||Number.isInteger(p.stock)&&p.stock>=0&&p.stock<=99999)&&p.visible===true)||new Set(items.map(p=>p.id)).size!==items.length)return;
    if(row.revision!==undefined&&loadedRevision===row.revision)return;
    const previous=JSON.stringify(cart);
    products=items.map(p=>({...p,available:p.available&&(p.stock===null||p.stock>0)}));
    const byId=new Map(products.map(p=>[p.id,p]));
    for(const id of Object.keys(cart)){const p=byId.get(id);if(!p)delete cart[id];else if(quantityLimit(p)>0)cart[id]=Math.min(cart[id],quantityLimit(p));}
    if(previous!==JSON.stringify(cart))write('-cart',cart);
    renderProducts();renderCart();renderHighlights();syncAtelierCatalog();
    if(typeof renderSeasonalEdit==='function')renderSeasonalEdit();
    if(previous!==JSON.stringify(cart))$('#cartLiveStatus').textContent='Actualizamos tu selección según la disponibilidad del catálogo.';
    loadedRevision=row.revision;
    document.documentElement.dataset.catalogSource='supabase';
   }catch{/* Keep the existing catalogue when offline. */}
   finally{clearTimeout(timeout);}
  })().finally(()=>{inFlight=null;});
  return inFlight;
 }
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh();});
 window.addEventListener('pageshow',event=>{if(event.persisted)void refresh();});
 return refresh();
})();
