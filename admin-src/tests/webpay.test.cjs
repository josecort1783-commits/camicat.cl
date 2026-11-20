const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const { JSDOM } = require('jsdom');

const migration = name => readFileSync(new URL('../supabase/migrations/' + name, 'file://' + __dirname + '/../'), 'utf8');
const catalog = require('../src/seed.json').map(item => ({ ...item, stock: 10 }));
const origin = 'https://camicat-qa.example';
const env = {
 CAMICAT_WEBPAY_ENABLED: 'true', CAMICAT_WEBPAY_MODE: 'integration', CAMICAT_WEBPAY_ORIGIN: origin,
 CAMICAT_WEBPAY_SUPABASE_URL: 'https://isolated.supabase.co', CAMICAT_WEBPAY_SUPABASE_SERVICE_ROLE_KEY: 'fixture',
};

test('Webpay requires an explicitly enabled and isolated environment', async () => {
 const { getConfig } = await import('../../server/webpay.mjs');
 assert.equal(getConfig({}), null);
 assert.throws(() => getConfig({ ...env, CAMICAT_WEBPAY_SUPABASE_URL: 'https://wbqpcunyzvdvhaiduyem.supabase.co' }));
 assert.throws(() => getConfig({ ...env, CAMICAT_WEBPAY_MODE: 'production' }));
});

test('a confirmed quote uses its saved price and delivery and records exactly one authorized payment', async t => {
 const { getConfig, service } = await import('../../server/webpay.mjs');
 const db = new PGlite();
 t.after(() => db.close());
 const actor = randomUUID(), outsider = randomUUID();
 await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema extensions; create schema auth; create schema camicat_private;
  create function extensions.gen_random_bytes(integer) returns bytea language sql as $$
    select decode(left(replace(gen_random_uuid()::text,'-',''),$1*2),'hex')
  $$;
  create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  create table public.camicat_admin_members(user_id uuid primary key, panel_label text);
  create table public.camicat_catalog(id text primary key, revision int, products jsonb);
  create view public.camicat_public_catalog as select * from public.camicat_catalog;
 `);
 await db.exec(migration('20261116045401_customer_requests_and_audit.sql'));
 await db.exec(migration('20261120171200_camicat_webpay.sql'));
 const first = async (sql, args = []) => (await db.query(sql, args)).rows[0];
 await db.query("insert into camicat_catalog values('main',1,$1::jsonb)", [JSON.stringify(catalog)]);
 await db.query("insert into camicat_admin_members values($1,'Equipo de prueba')",[actor]);
 const call = async (rpc, p) => (await first('select to_jsonb('+rpc+'($1::jsonb)) as result',[JSON.stringify(p)])).result;
 const item = catalog.find(p => p.available && p.price > 0);
 const secret = 'a'.repeat(64);
 const hash = createHash('sha256').update(secret).digest('hex');
 const order = await call('camicat_receive_request', {
  request_id:randomUUID(), token_hash:hash, rate_key:'test', kind:'catalogo', name:'Cliente de prueba',
  email:'cliente@example.invalid', delivery:'envio', commune:'Rancagua', region:'O’Higgins', items:[{ id:item.id, quantity:2 }], note:'',
 });
 assert.equal(order.estimate,item.price*2);
 assert.equal(item.stock,10);
 const total = order.estimate+3500;
 const move = (status, detail = 'Despacho acordado', amount = total) => call('camicat_move_request',{id:order.id,actor,status,detail,total:amount});
 let providerCreates = 0, providerCommits = 0, data, paymentResponse;
 const providerToken = () => String(providerCreates).repeat(64);
 const json = x => Response.json(x);
 const fetcher = async (raw, opt) => {
  const target = new URL(raw);
  if(target.hostname==='webpay3gint.transbank.cl'){
   if(opt.method==='POST'){
    providerCreates++;
    data=JSON.parse(opt.body);
    paymentResponse={ ...data,status:'INITIALIZED' };
    return json({ url:'https://webpay3gint.transbank.cl/webpayserver/initTransaction', token:providerToken() });
   }
   if(opt.method==='PUT')providerCommits++;
   return json(paymentResponse);
  }
  const [,namespace,version,path,name] = target.pathname.split('/');
  if(namespace==='auth')return json({id:opt.headers.Authorization.endsWith('b')?outsider:actor,email_confirmed_at:'confirmed'});
  assert.equal(version,'v1');
  if(path==='rpc'){
   try { return json(await call(name,JSON.parse(opt.body).p)); }
   catch(e) { return Response.json({message:e.message},{status:400}); }
  }
  if(opt.method==='PATCH'){
   const patch=JSON.parse(opt.body);
   return json((await db.query("update camicat_payment_attempts set state=$1,token=coalesce($2,token) where id=$3 and state='creating' returning *",
    [patch.state,patch.token??null,target.searchParams.get('id').slice(3)])).rows);
  }
  const filters = [...target.searchParams].filter(([, value]) => value.startsWith('eq.'));
  const clauses = filters.map(([key], index) => key+'=$'+(index+1));
  return json((await db.query('select * from '+path+' where '+clauses.join(' and ')+
   (target.searchParams.has('order')?' order by created_at desc limit 1':''),
   filters.map(([, value]) => value.slice(3)))).rows);
 };
 const api = service(getConfig(env),fetcher);
 const send = async (action, fields = {}, authorization = '') => {
  const res = await api.handle(new Request(origin+'/api/webpay',{method:'POST',headers:{origin,authorization},
   body:JSON.stringify({action,...fields})}));
  return {status:res.status,...await res.json()};
 };
 const staff = 'Bearer '+'a'.repeat(50);
 const approval = {orderId:order.id, amount:total, delivery:'envio', shipping:3500, detail:'Despacho de prueba a Rancagua',stockConfirmed:true};
 assert.equal((await send('staff-enable',approval)).status,401);
 assert.equal((await send('staff-enable',approval,'Bearer '+'b'.repeat(50))).status,403);
 assert.equal((await send('staff-enable',approval,staff)).status,409);
 await move('cotizado');
 await move('confirmado');
 assert.equal((await send('staff-enable',{...approval,shipping:total+1},staff)).status,400);
 assert.equal((await send('staff-enable',approval,staff)).state,'ready');
 assert.equal((await send('view',{token:'f'.repeat(64)})).status,404);
 await assert.rejects(move('preparando'),/camicat_payment_required/);
 const quote=(await send('view',{token:secret})).quote;
 assert.equal(quote.amount-quote.shipping,order.estimate);
 const payment = {token:secret,amount:quote.amount,approvedAt:quote.approvedAt};
 assert.equal((await send('start',{...payment,amount:1})).status,409);
 assert.equal((await send('start',{...payment,approvedAt:'2020-01-01'})).status,409);
 const [initial,second]=await Promise.all([send('start',payment),send('start',payment)]);
 assert.ok([initial,second].some(result=>result.token===providerToken()));
 assert.equal(providerCreates,1);
 assert.equal(data.amount,total);
 assert.equal((await send('start',payment)).token,providerToken());
 const callback = token => api.callback(new Request(origin+'/api/webpay-return?token_ws='+token));
 paymentResponse={...data,status:'FAILED',response_code:-1};
 assert.equal((await callback(providerToken())).status,303);
 assert.equal((await send('view',{token:secret})).state,'failed');
 assert.equal((await send('start',payment)).status,200);
 assert.equal(providerCreates,2);
 paymentResponse={...data,amount:1,status:'AUTHORIZED',response_code:0,authorization_code:'123456'};
 assert.equal((await callback(providerToken())).headers.get('location'),'/webpay-resultado.html');
 assert.equal((await send('view',{token:secret})).state,'review');
 assert.equal((await send('staff-status',{orderId:order.id},staff)).state,'review');
 await assert.rejects(move('cancelado'),/camicat_payment_locked/);
 paymentResponse={...paymentResponse,amount:total};
 await Promise.all([callback(providerToken()),callback(providerToken())]);
 assert.equal((await send('view',{token:secret})).state,'paid');
 assert.equal((await send('staff-status',{orderId:order.id},staff)).state,'paid');
 assert.equal((await send('start',payment)).status,409);
 assert.equal(providerCreates,2);
 assert.ok(providerCommits>=3);
 assert.equal((await first("select count(*)::int as count from camicat_order_events where status='pago_confirmado'")).count,1);
 assert.equal((await move('preparando')).status,'preparando');
 assert.equal((await first("select has_table_privilege('anon','camicat_payment_attempts','select') as access")).access,false);
});

test('the result page ignores a success status supplied in the URL', async () => {
 const page = new JSDOM('<h1 id="payment-title">Resultado de Webpay</h1><p id="payment-message"></p><p id="payment-test" hidden></p><a id="payment-order-link"></a>', {
  url:origin+'/webpay-resultado.html?estado=paid',runScripts:'outside-only',
 });
 try{
  const { window }=page;
  const script=readFileSync(new URL('../public/webpay-resultado.js','file://'+__dirname+'/../'),'utf8');
  window.CamicatOrders={cap:/^[a-f0-9]{64}$/,link:t=>'/pedidos.html#'+t};
  await window.eval(script);
  assert.equal(window.document.getElementById('payment-title').textContent,'Resultado de Webpay');
  window.sessionStorage.setItem('camicat-webpay-return-link','e'.repeat(64));
  window.CamicatOrders.payment=async()=>({mode:'integration',state:'paid'});
  await window.eval(script);
  assert.equal(window.document.getElementById('payment-title').textContent,'Pago de prueba confirmado');
 } finally{page.window.close();}
});
