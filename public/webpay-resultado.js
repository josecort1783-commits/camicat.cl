'use strict';
(async()=>{
 let token;
 try{
  token=sessionStorage.getItem('camicat-webpay-return-link');
  sessionStorage.removeItem('camicat-webpay-return-link');
 }catch{}
 const A=window.CamicatOrders;
 if(!A?.cap.test(token??''))return;
 document.getElementById('payment-order-link').href=A.link(token);
 const payment=await A.payment('view',{token}).catch(()=>null);
 if(!payment)return;
 const isTest=payment.mode==='integration';
 const messages={
  paid:[isTest?'Pago de prueba confirmado':'Pago confirmado','Webpay confirmó el pago. El estado quedó registrado en tu pedido.'],
  failed:['Pago rechazado','Revisa el seguimiento para volver a intentar.'],
  cancelled:['Pago cancelado','Puedes consultar tu pedido para retomar el pago.'],
 };
 const [title,body]=messages[payment.state]??['Pago en verificación','Consulta el seguimiento para ver si Webpay ya confirmó el resultado.'];
 document.getElementById('payment-title').textContent=title;
 document.getElementById('payment-message').textContent=body;
 document.getElementById('payment-test').hidden=!isTest;
})();
