'use strict';
window.CamicatOrders=(()=>{
 const endpoint='https://wbqpcunyzvdvhaiduyem.supabase.co/functions/v1/camicat-orders';
 const apiKey='sb_publishable_cYM7lEnUtR51n2-Gqhv5kQ_TKbRnu_h';
 const states={recibido:'Solicitud recibida',cotizado:'Cotización preparada',confirmado:'Pedido confirmado',preparando:'En preparación',listo:'Listo para retirar',enviado:'Despachado',entregado:'Entregado',cancelado:'Cancelado',pago_habilitado:'Pago habilitado',pago_confirmado:'Pago confirmado'};
 const cap=/^[a-f0-9]{64}$/;
 const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP'}).format(n);
 const date=s=>new Date(s).toLocaleString('es-CL',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Santiago'});
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const link=token=>'/pedidos.html#'+token;
 const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 const key='camicat-orders-device-v1';
 function list(){try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a.filter(x=>x&&cap.test(x.token)).slice(0,12):[];}catch{return [];}}
 function remember(t,o){try{localStorage.setItem(key,JSON.stringify([{token:t,number:o.public_number,date:o.created_at},...list().filter(x=>x.token!==t)].slice(0,12)));return true;}catch{return false;}}
 function forget(){try{localStorage.removeItem(key);}catch{}}
 async function request(action,data={},access){
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:apiKey,...(access?{Authorization:'Bearer '+access}:{})},body:JSON.stringify({...data,action}),signal:AbortSignal.timeout(23000)});
  const json=await r.json().catch(()=>null);
  if(!r.ok||!json)throw Error(json?.error||'No pudimos conectar. Intenta de nuevo.');
  return json;
 }
 const paymentStates={
  unavailable:'Pago aún por habilitar',ready:'Pendiente de pago',creating:'Iniciando el pago',
  pending:'Pago iniciado',review:'Pago en verificación',paid:'Pago confirmado',failed:'Pago rechazado',cancelled:'Pago cancelado',
 };
 async function payment(action,data={},access){
  const r=await fetch('/api/webpay',{
   method:action?'POST':'GET',
   headers:action?{'Content-Type':'application/json',...(access?{Authorization:'Bearer '+access}:{})}:{},
   body:action?JSON.stringify({...data,action}):undefined,signal:AbortSignal.timeout(28000),
  });
  const info=await r.json().catch(()=>null);
  if(!r.ok||!info)throw Error(info?.error||'No pudimos consultar Webpay.');
  return info;
 }
 return {payment,paymentStates,states,cap,money,date,node,link,token,list,remember,forget,request};
})();
