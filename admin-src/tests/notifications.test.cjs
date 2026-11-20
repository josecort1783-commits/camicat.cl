const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const source=()=>import('../../supabase/functions/camicat-orders/notifications.mjs');
const order={id:'11111111-1111-4111-8111-111111111111',public_number:'CAM-TEST',customer_name:'Prueba <script>',customer_email:'cliente@example.invalid',kind:'catalogo',status:'recibido',items:[{quantity:2,name:'Flor dorada'}],delivery:'envio',commune:'Rancagua',region:'O’Higgins',estimate:29980,total:null,note:'Para regalo'};
test('API exige correo confirmado, membresía y política privada; auditoría conserva su permiso',async()=>{
 const {runInNewContext}=require('node:vm');let handler,member=true,allowed=true,confirmed=true;
 const code=readFileSync('../supabase/functions/camicat-orders/index.js','utf8').replace(/^import[^\n]+\n/,'');
 runInNewContext(code,{Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://test.example.invalid':'test'},serve:f=>{handler=f;}},createMailer:()=>({configured:false,summary:async()=>[]}),Response,TextDecoder,TextEncoder,AbortSignal,
  fetch:async path=>new Response(JSON.stringify(path.includes('/auth/v1/user')?{id:order.id,email:'staff@example.invalid',email_confirmed_at:confirmed?'2026-01-01':null}:path.includes('camicat_admin_members')?(member?[{panel_label:'Equipo de prueba'}]:[]):path.includes('camicat_order_staff_policy')?(allowed?[{can_read_audit:true}]:[]):[]),{status:200})});
 const request=action=>new Request('https://test.example.invalid',{method:'POST',headers:{Origin:'https://www.camicat.cl',Authorization:'Bearer '+'a'.repeat(50)},body:JSON.stringify({action})});
 assert.equal((await handler(request('staff-list'))).status,200);
 assert.equal((await (await handler(request('staff-list'))).json()).actor.audit,true);
 allowed=false;assert.equal((await handler(request('staff-list'))).status,401);
 allowed=true;member=false;assert.equal((await handler(request('staff-list'))).status,401);
 member=true;confirmed=false;assert.equal((await handler(request('staff-list'))).status,401);
});
test('panel avisa nuevos pedidos sin borrar lo que se está editando y se limpia al salir',async()=>{
 const {JSDOM}=require('jsdom');const dom=new JSDOM(readFileSync('src/index.html','utf8'),{url:'https://www.camicat.cl/admin/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let tick,calls=0;
 try{
  w.setInterval=f=>{tick=f;return 1;};w.clearInterval=()=>{};
  w.eval(readFileSync('../public/orders-common.js','utf8'));
  w.CamicatOrders.request=async action=>{calls++;return action==='staff-alerts'?{needsResponse:2,mailConfigured:false}:{orders:[{...order,created_at:'2026-11-20T12:00:00Z',mail_status:'pending'}],actor:{audit:false},needsResponse:1,mailConfigured:false,notifications:[{order_id:order.id,kind:'owner_request',state:'pending'}]};};
  w.eval(readFileSync('src/orders.js','utf8').replace('export function createOrders','window.createOrders=function'));
  const ui=w.createOrders({auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}});ui.connect({id:'staff'});await new Promise(r=>setTimeout(r,10));
  const d=w.document;assert.equal(d.getElementById('staffOrderNotice').hidden,false);assert.match(d.getElementById('staffMailStatus').textContent,/pendientes de configuración/);
  const input=d.querySelector('#staffOrdersList textarea');input.value='No perder este borrador';await tick();
  assert.equal(d.querySelector('#staffOrdersList textarea'),input);assert.equal(input.value,'No perder este borrador');assert.match(d.getElementById('staffOrderNotice').textContent,/2 solicitudes/);
  ui.connect(null);assert.equal(d.getElementById('staffOrderNotice').hidden,true);assert.equal(d.getElementById('staffOrdersList').children.length,0);
  const before=calls;await tick();assert.equal(calls,before);
 }finally{w.close();}
});
test('avisos diferencian solicitud, entrega y pago; protegen el HTML y los destinatarios',async()=>{
 const {buildMessage}=await source(),ownerEmails=['owner@example.invalid'],config={origin:'https://www.camicat.cl',from:'Camicat <pedidos@example.invalid>',ownerRecipients:ownerEmails};
 const owner=buildMessage({kind:'owner_request',snapshot:order},config);
 assert.deepEqual(owner.to,ownerEmails);assert.match(owner.text,/antes de cobrar/);assert.match(owner.text,/2 × Flor dorada/);assert.match(owner.html,/&lt;script&gt;/);assert.ok(!owner.html.includes('<script>'));assert.match(owner.text,/admin\/#pedidos/);
 const receipt=buildMessage({kind:'customer_receipt',snapshot:order,tracking_token:'a'.repeat(64)},config);
 assert.deepEqual(receipt.to,[order.customer_email]);assert.match(receipt.text,/todavía no es un pago/);assert.match(receipt.text,/pedidos.html#a{64}/);
 const paid=buildMessage({kind:'owner_paid',snapshot:{...order,total:32980}},config);
 assert.match(paid.subject,/Pago confirmado/);assert.match(paid.text,/Prepara las piezas/);assert.match(paid.text,/32.980/);
});
test('proveedor caído conserva cola; reintento mantiene exactamente mensaje y clave; enviados no se repiten',async()=>{
 const {createMailer}=await source();let note={id:'mail-1',order_id:order.id,kind:'customer_receipt',snapshot:order,tracking_token:'a'.repeat(64),state:'pending'},sent=[];
 let providerOK=false;
 const db=async(table,query='',p={})=>{
  if(table==='rpc/camicat_claim_notifications'){if(note.state==='sent')return [];note.state='sending';note.lease_id='lease';return [{...note}];}
  if(table==='camicat_orders')return [];
  if(p.method==='PATCH'){Object.assign(note,p.body);return [{...note}];}
  return [{...note}];
 };
 const mailer=createMailer({db,rpc:async()=>{},key:'test-key',ownerRecipients:['owner@example.invalid'],from:'test@example.invalid',origin:'https://www.camicat.cl',fetchMail:async(_,p)=>{sent.push(p);return {ok:providerOK};}});
 assert.equal(await mailer.dispatch(order.id),'failed');assert.equal(note.state,'failed');
 providerOK=true;assert.equal(await mailer.dispatch(order.id),'sent');assert.equal(note.state,'sent');
 assert.equal(sent[0].body,sent[1].body);assert.equal(sent[0].headers['Idempotency-Key'],sent[1].headers['Idempotency-Key']);
 await mailer.dispatch(order.id);assert.equal(sent.length,2);
 const off=createMailer({db:async()=>{throw Error('must not claim');},rpc:async()=>{},origin:'https://www.camicat.cl'});
 assert.equal(await off.dispatch(order.id),'unconfigured');
});
test('outbox transaccional: permisos, eventos, leases, token y pagos reales',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema extensions;
   create function extensions.digest(text,text) returns bytea language sql immutable as 'select decode(md5($1),''hex'')';
   create table public.camicat_orders(id uuid primary key,token_hash text,public_number text,customer_name text,customer_email text,items jsonb,status text,total int,next_step text,mail_status text);
   create table public.camicat_order_events(id uuid primary key default gen_random_uuid(),order_id uuid,status text,detail text default '');`);
  await db.exec(readFileSync('../supabase/migrations/20261120232737_camicat_order_notifications.sql','utf8'));
  const id=order.id,token='a'.repeat(64),hash=createHash('md5').update(token).digest('hex');
  await db.query('insert into camicat_orders values ($1,$2,$3,$4,$5,$6,$7,null,$8,$9)',[id,hash,'CAM-TEST','Prueba','test@example.invalid','[]','recibido','','pending']);
  await db.query("insert into camicat_order_events(order_id,status) values ($1,'recibido')",[id]);
  assert.equal((await db.query('select kind from camicat_order_notifications')).rows[0].kind,'owner_request');
  await assert.rejects(db.query('select camicat_queue_receipt($1)',[{id,token:'wrong'}]),/camicat_order_missing/);
  await db.query('select camicat_queue_receipt($1)',[{id,token}]);await db.query('select camicat_queue_receipt($1)',[{id,token}]);
  assert.equal((await db.query('select count(*)::int as n from camicat_order_notifications')).rows[0].n,2);
  const first=(await db.query('select * from camicat_claim_notifications($1)',[{id}])).rows;assert.equal(first.length,2);
  assert.equal((await db.query('select * from camicat_claim_notifications($1)',[{id}])).rows.length,0);
  await db.exec("update camicat_order_notifications set state='failed',first_attempt_at=now()-interval '25 hours'");
  await db.query('select * from camicat_claim_notifications($1)',[{id}]);assert.equal((await db.query("select count(*)::int n from camicat_order_notifications where state='review'")).rows[0].n,2);
  await db.query("insert into camicat_order_events(order_id,status,detail) values ($1,'listo','Retirar mañana a las 17 h')",[id]);
  assert.equal((await db.query("select snapshot->>'next_step' as detail from camicat_order_notifications where kind='customer_update'")).rows[0].detail,'Retirar mañana a las 17 h');
  await db.query("insert into camicat_order_events(order_id,status) values ($1,'pago_confirmado')",[id]);
  assert.equal((await db.query("select count(*)::int n from camicat_order_notifications where kind like '%_paid'")).rows[0].n,0);
  await db.exec('create table camicat_payment_attempts(order_id uuid,state text,mode text)');
  await db.query("insert into camicat_payment_attempts values ($1,'paid','integration')",[id]);
  await db.query("insert into camicat_order_events(order_id,status) values ($1,'pago_confirmado')",[id]);
  assert.equal((await db.query("select count(*)::int n from camicat_order_notifications where kind like '%_paid'")).rows[0].n,0);
  await db.exec("update camicat_payment_attempts set mode='production'");
  await db.query("insert into camicat_order_events(order_id,status) values ($1,'pago_confirmado')",[id]);
  assert.equal((await db.query("select count(*)::int n from camicat_order_notifications where kind like '%_paid'")).rows[0].n,2);
  for(const role of ['anon','authenticated']) {await db.exec('set role '+role);await assert.rejects(db.query('select * from camicat_order_notifications'),/permission denied/);await assert.rejects(db.query('select * from camicat_claim_notifications($1)',[{id}]),/permission denied/);await db.exec('reset role');}
 }finally{await db.close();}
});
