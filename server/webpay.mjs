import { createHash, randomUUID } from 'node:crypto';

const hosts = { integration: 'webpay3gint.transbank.cl', production: 'webpay3g.transbank.cl' };
const providerPath = '/rswebpaytransaction/api/webpay/v1.2/transactions';
const cap = /^[a-f0-9]{64}$/;
const tokenPattern = /^[a-zA-Z0-9_-]{16,64}$/;
const orderId = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const mainDatabase = 'wbqpcunyzvdvhaiduyem.supabase.co';
const testCode = '597055555532';
const testSecret = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';
const returnPage = '/webpay-resultado.html';
const quoteFields = 'order_id,mode,amount,delivery,shipping,detail,approved_at';
const attemptReadFields = 'id,mode,token,state,amount,buy_order,session_id,created_at';

export function getConfig(env) {
 const mode = env.CAMICAT_WEBPAY_MODE;
 if (env.CAMICAT_WEBPAY_ENABLED !== 'true' || !Object.hasOwn(hosts, mode)) return null;
 const origin = new URL(env.CAMICAT_WEBPAY_ORIGIN);
 const db = new URL(env.CAMICAT_WEBPAY_SUPABASE_URL);
 if (origin.protocol !== 'https:' || db.protocol !== 'https:' || origin.href !== origin.origin+'/' ||
     db.href !== db.origin+'/' || !db.hostname.endsWith('.supabase.co')) throw Error('configuration');
 const isProduction = mode === 'production';
 if (isProduction && (db.hostname !== mainDatabase || origin.origin !== 'https://www.camicat.cl')) throw Error('configuration');
 if (!isProduction && (db.hostname === mainDatabase || origin.hostname === 'www.camicat.cl' || origin.hostname === 'camicat.cl')) throw Error('configuration');
 const secret = env.CAMICAT_WEBPAY_SUPABASE_SERVICE_ROLE_KEY;
 const commerceCode = isProduction ? env.CAMICAT_WEBPAY_COMMERCE_CODE : testCode;
 const apiKey = isProduction ? env.CAMICAT_WEBPAY_API_KEY : testSecret;
 if (!secret || !/^\d{12}$/.test(commerceCode ?? '') || !apiKey ||
     (isProduction && (commerceCode === testCode || apiKey === testSecret))) throw Error('configuration');
 return { mode, origin: origin.origin, db: db.origin, secret, commerceCode, apiKey };
}

function result(body, status = 200) {
 return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

function fail(reason, status = 409) {
 throw Object.assign(new Error(reason), { publicStatus: status });
}

async function readJson(request) {
 const raw = await request.text();
 if (raw.length > 2300) fail('Datos demasiado largos.', 413);
 try {
  const value = JSON.parse(raw);
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
 } catch { /* The client receives the same response for malformed JSON. */ }
 fail('Datos de pago inválidos.', 400);
}

export function classify(attempt, provider) {
 if (!provider || provider.buy_order !== attempt.buy_order || provider.session_id !== attempt.session_id ||
     provider.amount !== attempt.amount) return 'review';
 if (provider.status === 'AUTHORIZED' && provider.response_code === 0 &&
     typeof provider.authorization_code === 'string' && provider.authorization_code.trim()) return 'paid';
 if (provider.status === 'FAILED') return 'failed';
 if (['REVERSED','NULLIFIED'].includes(provider.status)) return 'cancelled';
 return 'review';
}

function paymentDestination(mode) {
 const host = hosts[mode];
 return 'https://' + host + '/webpayserver/initTransaction';
}

function dbIdentifier(value) { return encodeURIComponent(String(value)); }

export function service(cfg, fetcher = fetch) {
 const hash = token => createHash('sha256').update(token).digest('hex');

 async function db(path, { method = 'GET', body, actor, prefer } = {}) {
  const r = await fetcher(cfg.db + path, { method, headers: {
   apikey: cfg.secret, Authorization: 'Bearer ' + (actor ?? cfg.secret), 'Content-Type': 'application/json',
   ...(prefer ? { Prefer: prefer } : {}),
  }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(7000) });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw Error(data?.message ?? 'database_error');
  return data;
 }
 const table = (path, options) => db('/rest/v1/' + path, options);
 const rpc = (name,p) => table('rpc/'+name,{ method: 'POST', body: { p } });

 async function provider(method, token, body) {
  const r = await fetcher('https://' + hosts[cfg.mode] + providerPath + (token ? '/'+dbIdentifier(token) : ''), {
   method, headers: { 'Tbk-Api-Key-Id': cfg.commerceCode, 'Tbk-Api-Key-Secret': cfg.apiKey, 'Content-Type': 'application/json' },
   body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5500),
  });
  if (!r.ok) throw Error('provider_error');
  return r.json();
 }

 async function member(request) {
  const auth = request.headers.get('authorization') ?? '';
  if (!/^Bearer [\w.-]{40,4096}$/.test(auth)) fail('Inicia sesión con una cuenta del equipo de Camicat.',401);
  const user = await db('/auth/v1/user',{ actor: auth.slice(7) }).catch(() => null);
  if (!user?.email_confirmed_at || !orderId.test(user.id)) fail('Inicia sesión con una cuenta del equipo de Camicat.',401);
  const [allowed] = await table('camicat_admin_members?select=user_id&user_id=eq.'+user.id);
  if (!allowed) fail('Tu cuenta no tiene acceso al panel.',403);
  return user.id;
 }

 async function orderFor(token) {
  if (typeof token !== 'string' || !cap.test(token)) fail('Usa el enlace privado de tu pedido.',400);
  const [order] = await table('camicat_orders?select=id,status,total&token_hash=eq.'+hash(token)+'&limit=1');
  if (!order) fail('No encontramos el pedido.',404);
  return order;
 }

 async function paymentState(id) {
  const [quote] = await table('camicat_payment_quotes?select='+quoteFields+'&order_id=eq.'+id+'&mode=eq.'+cfg.mode);
  if (!quote) return {quote:null,attempt:null};
  const [attempt] = await table('camicat_payment_attempts?select='+attemptReadFields+'&order_id=eq.'+id+'&mode=eq.'+cfg.mode+'&order=created_at.desc&limit=1');
  return { quote, attempt:attempt??null };
 }

 async function finish(attempt, commit) {
  if (!['pending','review'].includes(attempt.state)) return attempt.state;
  let data;
  if (commit) data=await provider('PUT',attempt.token).catch(()=>null);
  if (!data) data=await provider('GET',attempt.token).catch(()=>null);
  const state = classify(attempt,data);
  return rpc('camicat_finish_payment',{ token:attempt.token,mode:cfg.mode,state,
   ...(state==='paid'?{amount:data.amount,buy_order:data.buy_order,session_id:data.session_id,authorization_code:data.authorization_code.trim()}:{}),
  });
 }

 async function currentState(attempt, fallback) {
  if (!attempt) return fallback;
  const elapsed=Date.now()-Date.parse(attempt.created_at);
  if (attempt.state==='creating'&&elapsed>90000) return 'ready';
  if (attempt.state==='review'||(attempt.state==='pending'&&elapsed>=270000)) return finish(attempt,false);
  return attempt.state;
 }

 async function start(p) {
  const o = await orderFor(p.token);
  const {quote} = await paymentState(o.id);
  if (!quote || o.status !== 'confirmado' || o.total !== quote.amount ||
      p.amount !== quote.amount || p.approvedAt !== quote.approved_at) fail('La cotización cambió o aún no está habilitada. Actualiza el pedido.');
  const {attempt,claimed} = await rpc('camicat_claim_payment',{
   token_hash:hash(p.token),mode:cfg.mode,amount:quote.amount,approved_at:quote.approved_at,
   buy_order:'CAM-'+randomUUID().replaceAll('-','').slice(0,22), session_id:randomUUID(),
  });
  if (!claimed){
   if (attempt.state==='pending' && Date.now()-Date.parse(attempt.created_at)<270000) return { url:paymentDestination(cfg.mode), token:attempt.token };
   if (attempt.state==='pending'||attempt.state==='review'){
    const state=await finish(attempt,false);
    if (state==='failed'||state==='cancelled') fail('Terminó el intento anterior. Puedes volver a pagar desde el pedido.');
    if (state==='paid') fail('Webpay ya confirmó el pago de este pedido.');
    fail('Estamos verificando el intento anterior. Revisa el seguimiento antes de intentar otro pago.');
   }
   fail(attempt.state==='paid'?'Este pedido ya está pagado.':'Ya estamos iniciando el pago.');
  }

  let created;
  try {
   created = await provider('POST',null,{
    buy_order:attempt.buy_order,session_id:attempt.session_id,amount:attempt.amount,
    return_url:cfg.origin+'/api/webpay-return',
   });
   const next = new URL(created.url);
   if (!tokenPattern.test(created.token) || next.origin !== 'https://'+hosts[cfg.mode] ||
       next.pathname !== '/webpayserver/initTransaction') throw Error('provider_destination');
  } catch {
   await table('camicat_payment_attempts?id=eq.'+attempt.id+'&state=eq.creating',{ method:'PATCH',body:{state:'failed',updated_at:new Date().toISOString()} });
   fail('Webpay no pudo iniciar el pago. Intenta nuevamente.',502);
  }
  const [saved] = await table('camicat_payment_attempts?id=eq.'+attempt.id+'&state=eq.creating',{
   method:'PATCH',body:{state:'pending',token:created.token,updated_at:new Date().toISOString()},prefer:'return=representation',
  });
  if (!saved) fail('No pudimos guardar el intento de pago. Actualiza el pedido.',502);
  return { url:new URL(created.url).origin+new URL(created.url).pathname, token:created.token };
 }

 async function handle(request) {
  if (request.method==='GET') return result({enabled:true,mode:cfg.mode});
  if (request.method!=='POST') return result({error:'Método no permitido.'},405);
  if (request.headers.get('origin')!==cfg.origin) return result({error:'Origen no permitido.'},403);
  try {
   const p=await readJson(request);
   if(p.action==='view'){
    const o=await orderFor(p.token);
    const {quote,attempt}=await paymentState(o.id);
    const current=quote&&o.status==='confirmado'&&o.total===quote.amount;
    const state=await currentState(attempt,current?'ready':'unavailable');
    return result({mode:cfg.mode,state,canStart:Boolean(current&&['ready','pending','failed','cancelled'].includes(state)),
     quote:quote?{amount:quote.amount,delivery:quote.delivery,shipping:quote.shipping,detail:quote.detail,approvedAt:quote.approved_at}:null});
   }
   if(p.action==='start')return result(await start(p));
   if(p.action==='staff-status'||p.action==='staff-enable'){
    const actor=await member(request);
    if(!orderId.test(p.orderId??''))fail('Pedido inválido.',400);
    if(p.action==='staff-status'){
     const {quote,attempt}=await paymentState(p.orderId);
     return result({mode:cfg.mode,state:await currentState(attempt,quote?'ready':'unavailable'),quote});
    }
    const detail=typeof p.detail==='string'?p.detail.trim():'';
    if(p.stockConfirmed!==true||!['retiro','envio'].includes(p.delivery)||!Number.isInteger(p.amount)||p.amount<1||p.amount>99999999||
       !Number.isInteger(p.shipping)||p.shipping<0||p.shipping>p.amount||(p.delivery==='retiro'&&p.shipping!==0)||detail.length<5||detail.length>260)
      fail('Confirma las piezas, el costo y las condiciones de entrega antes de habilitar el pago.',400);
    await rpc('camicat_enable_payment',{order_id:p.orderId,mode:cfg.mode,amount:p.amount,delivery:p.delivery,shipping:p.shipping,detail,actor});
    return result({state:'ready',mode:cfg.mode});
   }
   fail('Acción inválida.',400);
  } catch(error) {
   const messages={camicat_quote_not_ready:'Confirma el pedido, el total y la entrega antes de cobrar.',camicat_payment_locked:'Hay un intento activo o el pedido ya está pagado.'};
   return result({error:error.publicStatus?error.message:messages[error.message]??'No pudimos procesar la solicitud de pago.'},
    error.publicStatus??(messages[error.message]?409:503));
  }
 }

 async function callback(request) {
  if (!['GET','POST'].includes(request.method)) return result({error:'Método no permitido.'},405);
  const redirect=()=>new Response(null,{status:303,headers:{
   Location:returnPage,'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
  }});
  try {
   const fields=request.method==='GET'?new URL(request.url).searchParams:new URLSearchParams(await request.text());
   const received=fields.get('token_ws')??fields.get('TBK_TOKEN');
   if(!received||!tokenPattern.test(received)) return redirect();
   const [attempt]=await table('camicat_payment_attempts?select='+attemptReadFields+'&token=eq.'+dbIdentifier(received)+'&mode=eq.'+cfg.mode);
   if(!attempt)return redirect();
   await finish(attempt,fields.has('token_ws')&&!fields.has('TBK_TOKEN'));
   return redirect();
  } catch { return redirect(); }
 }

 return { handle, callback };
}

export function webpayEndpoint(kind) {
 return request=>{
  try {
   const cfg=getConfig(process.env);
   if(!cfg)return result({enabled:false,error:'Webpay aún no está habilitado.'},kind==='handle'&&request.method==='GET'?200:503);
   return service(cfg)[kind](request);
  }catch{ return result({error:'Webpay no está configurado.'},503); }
 };
}
