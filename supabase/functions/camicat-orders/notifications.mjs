const labels={recibido:'Solicitud recibida',cotizado:'Cotización preparada',confirmado:'Pedido confirmado',preparando:'En preparación',listo:'Listo para retirar',enviado:'Despachado',entregado:'Entregado',cancelado:'Cancelado'};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP'}).format(n);
export function buildMessage(n,{from,origin,ownerRecipients=[]}) {
 const o=n.snapshot,owner=n.kind.startsWith('owner_'),paid=n.kind.endsWith('_paid');
 const title=paid?'Pago confirmado':n.kind==='owner_request'?'Nueva solicitud':n.kind==='customer_receipt'?'Recibimos tu solicitud':labels[o.status]||'Tu pedido se actualizó';
 const delivery=o.delivery==='retiro'?'Retiro en Requínoa · coordinar punto y horario':o.delivery==='envio'?'Envío a '+[o.commune,o.region].filter(Boolean).join(', '):'Entrega por coordinar';
 const action=paid?(owner?'Prepara las piezas y coordina la entrega con el cliente. Actualiza el pedido a “En preparación” en tu panel.':'Tu pago está confirmado. Camicat preparará tus piezas y coordinará la entrega.'):
  owner?'Revisa disponibilidad y precio. Acuerda el costo, el lugar y el plazo de entrega con el cliente antes de cobrar.':n.kind==='customer_receipt'?'Camicat confirmará disponibilidad, precio final y entrega. Esta solicitud todavía no es un pago.':o.next_step||'Revisa el seguimiento para conocer el siguiente paso.';
 const link=owner?origin+'/admin/#pedidos':origin+'/pedidos.html'+(n.tracking_token?'#'+n.tracking_token:'');
 const lines=[title+' · '+o.public_number,'Cliente: '+o.customer_name,...(owner?['Contacto: '+o.customer_email]:[]),...o.items.map(x=>x.quantity+' × '+x.name),delivery,
  ...(o.total!=null?['Total acordado: '+money(o.total)]:o.estimate!=null?['Subtotal referencial: '+money(o.estimate)]:[]),
  ...(o.note?['Detalle del pedido: '+o.note]:[]),...(o.tracking?['Seguimiento del transporte: '+o.tracking]:[]),action];
 const cta=owner?'Abrir pedidos del panel':'Consultar mi pedido';
 const text=lines.join('\n\n')+'\n\n'+cta+': '+link+(owner?'':'\nConserva el correo original con tu enlace privado de seguimiento.');
 return {from,to:owner?ownerRecipients:[o.customer_email],subject:title+' '+o.public_number+' · Camicat',text,
  html:'<div style="background:#f4d4ce;padding:24px 12px;color:#3d1926;font:16px/1.6 Arial,sans-serif"><div style="max-width:560px;margin:auto;background:#f9e9e3;border:1px solid #d9a7a6;border-radius:18px;padding:26px"><p style="font-size:12px;letter-spacing:2px;color:#722d3b">CAMICAT · HECHO A MANO</p><h1 style="font:32px/1.2 Georgia,serif">'+escape(title)+'</h1>'+lines.slice(1).map(t=>'<p>'+escape(t)+'</p>').join('')+'<p><a href="'+escape(link)+'" style="display:inline-block;background:#722d3b;color:#fff3ed;padding:12px 20px;border-radius:10px;text-decoration:none">'+cta+'</a></p>'+(owner?'':'<p style="font-size:13px">Conserva el correo original con tu enlace privado de seguimiento.</p>')+'</div></div>'};
}

export function createMailer({db,rpc,key,from,origin,ownerRecipients=[],getOwnerRecipients,fetchMail=fetch}) {
 const configured=Boolean(key&&from);
 async function dispatch(id) {
  if(!configured)return 'unconfigured';
  const recipients=getOwnerRecipients?await getOwnerRecipients():ownerRecipients;
  if(!recipients.length)return 'unconfigured';
  const notes=await db('rpc/camicat_claim_notifications','',{method:'POST',body:{p:{id}}});
  await Promise.all(notes.map(async n=>{
   const filter='?id=eq.'+n.id+'&lease_id=eq.'+n.lease_id+'&state=eq.sending';
   let state='failed';
   try {
    // Freeze the provider payload before sending, so every retry has the same key and body.
    if(!n.message&&!n.tracking_token&&n.kind.startsWith('customer_')) {
     const [receipt]=await db('camicat_order_notifications','?select=tracking_token&order_id=eq.'+id+'&kind=eq.customer_receipt&limit=1');
     n.tracking_token=receipt?.tracking_token||null;
    }
    const message=n.message||buildMessage(n,{from,origin,ownerRecipients:recipients});
    if(!n.message)await db('camicat_order_notifications',filter,{method:'PATCH',body:{message}});
    const r=await fetchMail('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'camicat-mail-'+n.id},signal:AbortSignal.timeout(4500),body:JSON.stringify(message)});
    state=r.ok?'sent':'failed';
   }catch { /* The saved request and outbox survive provider outages. */ }
   const result=await db('camicat_order_notifications',filter,{method:'PATCH',prefer:'return=representation',body:{state,lease_id:null,lease_until:null,retry_after:new Date(Date.now()+60000).toISOString(),...(state==='sent'?{sent_at:new Date().toISOString()}:{})}});
   if(result.length&&n.kind==='customer_receipt')await db('camicat_orders','?id=eq.'+id,{method:'PATCH',body:{mail_status:state}});
  }));
  const receipt=await db('camicat_order_notifications','?select=state&order_id=eq.'+id+'&kind=eq.customer_receipt&limit=1');
  return receipt[0]?.state||'pending';
 }
 async function receive(o,token) {if(o.mail_status==='sent'){await dispatch(o.id);return 'sent';}await rpc('camicat_queue_receipt',{id:o.id,token});return dispatch(o.id);}
 async function summary(ids) {
  if(!ids.length)return [];
  return db('camicat_order_notifications','?select=order_id,kind,state,attempts&order_id=in.('+ids.join(',')+')&order=created_at.desc&limit=1000');
 }
 return {configured,dispatch,receive,summary};
}
