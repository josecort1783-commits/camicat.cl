export function createOrders(client){
 const A=window.CamicatOrders;
 if(!A)return {connect(){}};
 const $=x=>document.getElementById(x),{node}=A;
 let access=null,filter='pending',rows=[],generation=0;
 const stages={recibido:['cotizado','confirmado','cancelado'],cotizado:['confirmado','cancelado'],confirmado:['preparando','cancelado'],preparando:['listo','enviado','cancelado'],listo:['entregado','enviado','cancelado'],enviado:['entregado']};
 async function run(action,p){
  const {data}=await client.auth.getSession();
  if(!data.session?.access_token)throw Error('Tu sesión terminó. Vuelve a entrar al panel.');
  return A.request(action,p,data.session.access_token);
 }
 function label(text,element){const l=node('label',text);l.append(element);return l;}
 function render(){
  const shown=rows.filter(o=>filter==='all'||(filter==='pending'&&['recibido','cotizado'].includes(o.status))||(filter==='work'&&['confirmado','preparando','listo','enviado'].includes(o.status)));
  $('staffOrdersList').replaceChildren(...shown.map(card));
  if(!shown.length)$('staffOrdersList').append(node('p','No hay solicitudes en esta vista.'));
 }
 function card(o){
  const item=node('details'),dl=node('dl');item.className='order-item';
  item.append(node('summary',o.public_number+' · '+(A.states[o.status]||o.status)),dl);
  const pairs=[['Tipo',o.kind==='catalogo'?'Catálogo':'Joya personalizada'],['Cliente',o.customer_name],['Correo',o.customer_email],['Recibido',A.date(o.created_at)],['Entrega',o.delivery==='retiro'?'Retiro en Requínoa':o.delivery==='envio'?[o.commune,o.region].filter(Boolean).join(', '):'Por definir'],['Selección',o.items.map(x=>x.quantity+' × '+x.name).join(' · ')],['Solicitud',o.note],['Subtotal referencial',o.estimate===null?'':A.money(o.estimate)],['Total acordado',o.total===null?'':A.money(o.total)],['Correo',o.mail_status==='sent'?'Enviado':o.mail_status==='failed'?'Falló el envío':'No confirmado'],['Último aviso',o.next_step],['Seguimiento',o.tracking]];
  for(const [k,v] of pairs)if(v)dl.append(node('dt',k),node('dd',v));
  if(!stages[o.status])return item;
  const f=node('form'),s=node('select'),amount=node('input'),detail=node('textarea'),tracking=node('input'),save=node('button','Guardar estado'),status=node('p');
  save.type='submit';status.setAttribute('role','status');s.required=true;
  for(const k of ['',...stages[o.status]]){const opt=node('option',A.states[k]||'Elige el nuevo estado');opt.value=k;s.append(opt);}
  amount.type='number';amount.min='0';amount.max='99999999';amount.step='1';amount.value=o.total??'';
  detail.maxLength=260;tracking.maxLength=120;
  const af=label('Total en CLP, incluido el despacho',amount),tf=label('Número de seguimiento del transportista',tracking);
  const sync=()=>{af.hidden=!['cotizado','confirmado'].includes(s.value);amount.required=!af.hidden;tf.hidden=s.value!=='enviado';tracking.required=!tf.hidden;detail.required=!af.hidden||['listo','enviado'].includes(s.value);detail.placeholder=s.value==='listo'?'Punto y horario de retiro':s.value==='enviado'?'Transportista y plazo estimado':'Condiciones o plazo acordado';};
  s.onchange=sync;sync();
  f.append(label('Siguiente estado',s),af,label('Mensaje visible para el cliente',detail),tf,save,status);item.append(f);
  f.onsubmit=async e=>{e.preventDefault();save.disabled=true;status.textContent='Guardando…';
   try{const d=await run('staff-update',{id:o.id,status:s.value,total:!af.hidden&&amount.value!==''?Number(amount.value):null,detail:detail.value,tracking:tracking.value});
    if(!access)return;rows=rows.map(x=>x.id===o.id?d.order:x);render();$('staffOrdersStatus').textContent='Estado actualizado: '+A.states[d.order.status]+'.';
   }catch(e){status.textContent=e.message;}finally{save.disabled=false;}
  };
  return item;
 }
 async function load(){if(!access)return;const v=++generation;$('staffOrdersStatus').textContent='Cargando solicitudes…';
  try{const d=await run('staff-list');if(v!==generation)return;rows=d.orders;render();$('staffOrdersStatus').textContent=rows.length?rows.length+' solicitudes recientes.':'Todavía no hay solicitudes.';$('staffAuditNav').hidden=!d.actor.audit;$('staffAudit').hidden=!d.actor.audit;}
  catch(e){if(v===generation)$('staffOrdersStatus').textContent=e.message;}
 }
 async function audit(){if(!access)return;const v=generation;$('staffAuditStatus').textContent='Cargando movimientos…';
  try{const d=await run('audit');if(v!==generation)return;
   $('staffAuditList').replaceChildren(...d.events.map(o=>{const li=node('li'),catalog=o.action==='catalogo_publicado';li.append(node('strong',(catalog?'Publicó el catálogo':'Cambió el estado del pedido')+' · '+o.subject),node('div',o.actor_label+' · '+A.date(o.occurred_at)),node('div',catalog?'Revisión '+o.detail.anterior+' → '+o.detail.nueva:[A.states[o.detail.anterior],A.states[o.detail.nuevo]].filter(Boolean).join(' → ')));return li;}));
   $('staffAuditStatus').textContent=d.events.length?'Últimos movimientos guardados.':'No hay movimientos registrados aún.';
  }catch(e){if(v===generation)$('staffAuditStatus').textContent=e.message;}
 }
 $('refreshStaffOrders').onclick=load;$('refreshStaffAudit').onclick=audit;
 for(const b of document.querySelectorAll('[data-order-filter]'))b.onclick=()=>{filter=b.dataset.orderFilter;for(const x of document.querySelectorAll('[data-order-filter]'))x.setAttribute('aria-pressed',String(x===b));render();};
 return {connect(user){access=user;if(user){void load();return;}++generation;rows=[];$('staffOrdersList').replaceChildren();$('staffAuditList').replaceChildren();$('staffAudit').hidden=true;$('staffAuditNav').hidden=true;}};
}
