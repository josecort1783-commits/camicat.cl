'use strict';
(()=>{
 const A=window.CamicatOrders,$=x=>document.getElementById(x);
 const dialog=$('orderRequestDialog'),form=$('requestReceiptForm'),done=$('requestReceiptDone'),status=$('requestReceiptStatus');
 let draft=null;
 function open(order){
  draft={...order,requestId:crypto.randomUUID(),token:A.token()};
  form.reset();form.hidden=false;done.hidden=true;status.textContent='';
  $('requestReceiptTitle').textContent=order.kind==='catalogo'?'Registra tu solicitud':'Envía tu idea al taller';
  $('requestReceiptName').value=order.name??'';
  dialog.showModal();$('requestReceiptEmail').focus();
 }
 $('requestCatalogOrder').onclick=()=>{
  if(!cartEntries().length||cartHasConflicts())return;
  const p=checkoutPayload();
  open({kind:'catalogo',name:p.customer.name,delivery:p.delivery.mode,commune:p.delivery.address?.commune,region:p.delivery.address?.region,note:[p.gift?'Para regalo.':'',p.note].filter(Boolean).join(' '),items:p.items});
 };
 $('requestCustomOrder').onclick=()=>{
  const note=$('customQuoteText').textContent.trim();
  if(note)open({kind:'personalizada',delivery:'por_definir',note,items:[]});
 };
 $('closeRequestReceipt').onclick=()=>dialog.close();
 dialog.addEventListener('cancel',e=>{if($('sendRequestReceipt').disabled)e.preventDefault();});
 async function copy(link){
  try{await navigator.clipboard.writeText(link);status.textContent='Enlace copiado.';}catch{status.textContent='Abre el seguimiento y copia el enlace desde la barra de direcciones.';}
 }
 form.onsubmit=async e=>{
  e.preventDefault();
  if(!draft||!form.reportValidity()||$('sendRequestReceipt').disabled)return;
  $('sendRequestReceipt').disabled=true;$('closeRequestReceipt').disabled=true;status.textContent='Registrando tu solicitud…';
  const t=draft.token, keep=$('keepReceipt').checked;
  try{
   const {order,emailStatus}=await A.request('create',{...draft,name:$('requestReceiptName').value,email:$('requestReceiptEmail').value,consent:$('receiptConsent').checked});
   const link=A.link(t),saved=keep&&A.remember(t,order);
   form.hidden=true;done.hidden=false;
   $('requestReceiptTitle').textContent='Solicitud recibida';
   $('receiptNumber').textContent=order.public_number;
   $('receiptLink').href=link;$('copyReceiptLink').onclick=()=>copy(location.origin+link);
   $('receiptEmailResult').textContent=emailStatus==='sent'?'Enviamos la confirmación por correo. Revisa tu bandeja o spam.':'Tu solicitud quedó registrada. No pudimos confirmar el envío del correo; copia tu enlace privado.';
   $('receiptDeviceResult').textContent=saved?'También puedes encontrarlo en “Mis pedidos” desde este dispositivo.':'';
   status.textContent='';$('receiptLink').focus();
  }catch(err){status.textContent=err.message;}
  finally{$('sendRequestReceipt').disabled=false;$('closeRequestReceipt').disabled=false;}
 };
})();
