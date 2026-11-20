'use strict';
(()=>{
 const A=window.CamicatOrders,{node}=A,$=x=>document.getElementById(x);
 let revision=0;
 function historyList(){
  const items=A.list();$('trackHistory').replaceChildren(...items.map(o=>{const li=node('li'),a=node('a',o.number);a.href=A.link(o.token);li.append(a,node('small',' · '+A.date(o.date)));return li;}));
  if(!items.length)$('trackHistory').append(node('li','Aún no hay solicitudes guardadas.'));
  $('clearHistory').hidden=!items.length;
 }
 $('clearHistory').onclick=()=>{A.forget();historyList();};
 function show({order:o,events}){
  const title=node('h3',o.public_number),status=node('p',A.states[o.status]||o.status);
  const detail=node('p',o.next_step||'El taller revisará tu solicitud. El precio, la entrega y la disponibilidad se confirman antes de cualquier pago.');
  const rows=[title,status,detail];
  if(o.total!==null)rows.push(node('p','Total informado por Camicat: '+A.money(o.total)));
  else if(o.estimate!==null)rows.push(node('p','Subtotal referencial: '+A.money(o.estimate)));
  if(o.tracking)rows.push(node('p','Número de seguimiento: '+o.tracking));
  if(o.items.length){const list=node('ul');list.append(...o.items.map(i=>node('li',i.quantity+' × '+i.name)));rows.push(list);}
  const timeline=node('ol');timeline.className='order-timeline';
  for(const e of events){const li=node('li'),when=node('time',A.date(e.created_at));when.dateTime=e.created_at;li.append(node('strong',A.states[e.status]||e.status),node('br'),when);if(e.detail)li.append(node('div',e.detail));timeline.append(li);}
  rows.push(timeline);$('trackResult').replaceChildren(...rows);$('trackResult').hidden=false;
 }
 async function showPayment(token,key){
  if(!A.payment)return;
  const config=await A.payment().catch(()=>null);
  if(!config?.enabled||key!==revision)return;
  const payment=await A.payment('view',{token}).catch(()=>null);
  if(key!==revision||!payment?.quote||payment.state==='unavailable')return;
  const section=node('section'),message=node('p',A.paymentStates[payment.state]||'Pago en verificación');
  section.className='order-payment-panel';
  section.append(node('h3',payment.mode==='integration'?'Webpay · Pago de prueba':'Pago con Webpay'),message,
   node('p','Productos: '+A.money(payment.quote.amount-payment.quote.shipping)),
   node('p','Total confirmado: '+A.money(payment.quote.amount)),
   node('p',(payment.quote.delivery==='retiro'?'Retiro':'Despacho')+' · '+payment.quote.detail),
   node('p','Costo de entrega incluido: '+A.money(payment.quote.shipping)));
  message.setAttribute('role','status');
  if(payment.state==='review')section.append(node('p','Estamos verificando el resultado. Vuelve a consultar el pedido.'));
  if(payment.canStart){
   const button=node('button',payment.state==='pending'?'Continuar con Webpay':payment.mode==='integration'?'Probar pago':'Pagar con Webpay');
   button.type='button';
   button.onclick=async()=>{
    button.disabled=true;
    message.textContent='Conectando con Webpay…';
    try {
     const data=await A.payment('start',{token,amount:payment.quote.amount,approvedAt:payment.quote.approvedAt});
     if(key!==revision)return;
     const destination=new URL(data.url);
     const expected=payment.mode==='integration'?'https://webpay3gint.transbank.cl':'https://webpay3g.transbank.cl';
     if(destination.origin!==expected||destination.pathname!=='/webpayserver/initTransaction'||!data.token)throw Error('Webpay no devolvió un destino válido.');
     try{sessionStorage.setItem('camicat-webpay-return-link',token);}catch{}
     const form=node('form'),field=node('input');
     form.action=destination.origin+destination.pathname;
     form.method='POST';
     field.type='hidden';field.name='token_ws';field.value=data.token;
     form.append(field);section.append(form);form.submit();
    }catch(error){message.textContent=error.message;button.disabled=false;}
   };
   section.append(button);
  }
  const timeline=$('trackResult').querySelector('.order-timeline');
  timeline?.before(section);
 }
 async function fetchTrack(t){
  const key=++revision;
  $('trackResult').hidden=true;
  if(!A.cap.test(t)){$('trackStatus').textContent=t?'Ese enlace no corresponde al seguimiento de Camicat.':'';return;}
  $('trackStatus').textContent='Consultando al taller…';
  try{const data=await A.request('track',{token:t});if(key!==revision)return;show(data);$('trackStatus').textContent='';void showPayment(t,key);}catch(e){if(key===revision)$('trackStatus').textContent=e.message;}
 }
 $('trackForm').onsubmit=e=>{
  e.preventDefault();let t='';
  try{const u=new URL($('trackLink').value.trim());if(u.origin===location.origin&&u.pathname==='/pedidos.html')t=u.hash.slice(1);}catch{}
  if(!A.cap.test(t)){$('trackStatus').textContent='Pega el enlace privado completo de Camicat.';return;}
  $('trackLink').value='';if(location.hash.slice(1)===t)fetchTrack(t);else location.hash=t;
 };
 window.addEventListener('hashchange',()=>fetchTrack(location.hash.slice(1)));
 historyList();fetchTrack(location.hash.slice(1));
})();
