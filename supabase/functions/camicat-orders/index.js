import {createMailer} from './notifications.mjs';
const origin = 'https://www.camicat.cl';
const url = Deno.env.get('SUPABASE_URL');
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const mailKey = Deno.env.get('CAMICAT_RESEND_API_KEY');
const mailFrom = Deno.env.get('CAMICAT_ORDER_FROM');
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Vary':'Origin'};
const response = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const clean = (value,max) => typeof value==='string' ? value.trim().replace(/\s+/gu,' ').slice(0,max) : '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cap = /^(?:[a-f0-9]{64}|[0-9A-HJKMNP-TV-Z]{16})$/;
const statuses = {recibido:'Solicitud recibida',cotizado:'Cotización preparada',confirmado:'Pedido confirmado',preparando:'En preparación',listo:'Listo para retirar',enviado:'Despachado',entregado:'Entregado',cancelado:'Cancelado'};
async function hash(s) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');}
async function call(path,{method='GET',body,bearer=secret,prefer}={}) {
 const r=await fetch(url+path,{method,headers:{apikey:secret,Authorization:'Bearer '+bearer,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(7500)});
 const data=await r.json().catch(()=>null);
 if(!r.ok) throw new Error(data?.message??'service_error');
 return data;
}
const db=(table,query='',options)=>call('/rest/v1/'+table+query,options);
const rpc=async (name,p)=>{const data=await db('rpc/'+name,'',{method:'POST',body:{p}});return Array.isArray(data)?data[0]:data;};
const baseFields='public_number,kind,status,delivery,commune,region,items,estimate,total,next_step,tracking,created_at,updated_at';
const staffFields='id,'+baseFields+',customer_name,customer_email,note,mail_status';
const publicView = o => Object.fromEntries(baseFields.split(',').map(k=>[k,o[k]]));
async function staff(req) {
 const value=req.headers.get('authorization')??'';
 if(!/^Bearer [\w.-]{40,4096}$/.test(value)) return null;
 let user;
 try {user=await call('/auth/v1/user',{bearer:value.slice(7)});} catch {return null;}
 if(!user?.id||!user.email_confirmed_at) return null;
 const [member]=await db('camicat_admin_members','?select=panel_label&user_id=eq.'+encodeURIComponent(user.id));
 const [policy]=await db('camicat_order_staff_policy','?select=can_read_audit&email=eq.'+encodeURIComponent(user.email?.toLowerCase()||''));
 return member&&policy?{id:user.id,label:member.panel_label,audit:policy.can_read_audit}:null;
}
const mailer=createMailer({db,rpc,key:mailKey,from:mailFrom,origin,getOwnerRecipients:async()=>{const rows=await db('camicat_order_staff_policy','?select=email&notify_orders=eq.true');return rows.map(r=>r.email);}});
Deno.serve(async req=>{
 if(req.headers.get('origin')!==origin) return response({error:'Origen no permitido.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method==='GET')return response({service:'camicat-orders',emailConfigured:mailer.configured});
 if(req.method!=='POST')return response({error:'Método no permitido.'},405);
 try{
  const reader=req.body?.getReader();if(!reader)return response({error:'Faltan los datos.'},400);
  const decoder=new TextDecoder();let size=0,raw='';
  for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>10000){await reader.cancel();return response({error:'La solicitud es demasiado larga.'},413);}raw+=decoder.decode(chunk.value,{stream:true});}
  let p;try{p=JSON.parse(raw+decoder.decode());}catch{return response({error:'Datos inválidos.'},400);}
  if(!p||typeof p!=='object') return response({error:'Datos inválidos.'},400);
  if(p.action==='create'){
   const name=clean(p.name,80),email=clean(p.email,160).toLowerCase(),commune=clean(p.commune,70),region=clean(p.region,70),note=clean(p.note,700);
   const isCustom=p.kind==='personalizada';
   if(p.consent!==true|| !uuid.test(p.requestId??'')||!cap.test(p.token??'')|| name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
    !['catalogo','personalizada'].includes(p.kind)||!['retiro','envio','por_definir'].includes(p.delivery)||
    (p.delivery==='envio'&&(!commune||!region))||(isCustom&&note.length<8)||
    (!isCustom&&(!Array.isArray(p.items)||!p.items.length||p.items.length>15||p.items.some(x=>!x||!(/^[a-z][a-z0-9-]{0,99}$/).test(x.id??'')||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>20)||new Set(p.items.map(x=>x.id)).size!==p.items.length)))
     return response({error:'Revisa los datos de contacto y de la solicitud.'},400);
   const addr=(req.headers.get('x-real-ip')??req.headers.get('x-forwarded-for')??'unknown').split(',')[0].slice(0,80);
   const payload={request_id:p.requestId,token_hash:await hash(p.token),rate_key:await hash(secret+'|'+addr),kind:p.kind,name,email,delivery:p.delivery,commune:p.delivery==='envio'?commune:'',region:p.delivery==='envio'?region:'',note,items:isCustom?[]:p.items};
   const o=await rpc('camicat_receive_request',payload);
   let emailStatus=o.mail_status;
   try{emailStatus=await mailer.receive(o,p.token);}catch{emailStatus='failed';}
   return response({order:publicView(o),emailStatus});
  }
  if(p.action==='track'){
   if(!cap.test(p.token??''))return response({error:'El enlace de seguimiento no es válido.'},400);
   const [o]=await db('camicat_orders','?select=id,'+baseFields+'&token_hash=eq.'+await hash(p.token)+'&limit=1');
   if(!o)return response({error:'No encontramos esta solicitud. Revisa el enlace completo.'},404);
   const events=await db('camicat_order_events','?select=status,detail,created_at&order_id=eq.'+o.id+'&order=created_at.asc&limit=50');
   return response({order:publicView(o),events});
  }
  if(!['staff-list','staff-alerts','staff-retry-mail','staff-update','audit'].includes(p.action))return response({error:'Acción desconocida.'},400);
  const actor=await staff(req);
  if(!actor)return response({error:'Inicia sesión en el panel con una cuenta autorizada.'},401);
  if(p.action==='staff-retry-mail') {
   if(!uuid.test(p.id??''))return response({error:'Pedido inválido.'},400);
   await mailer.dispatch(p.id);
   return response({mailConfigured:mailer.configured,notifications:await mailer.summary([p.id])});
  }
  if(p.action==='staff-list'||p.action==='staff-alerts') {
   const orders=await db('camicat_orders','?select='+staffFields+'&order=created_at.desc&limit=100');
   if(mailer.configured) {
    const pending=await db('camicat_order_notifications','?select=order_id&state=in.(pending,failed,sending)&order=created_at.asc&limit=12');
    await Promise.all([...new Set(pending.map(x=>x.order_id))].slice(0,3).map(id=>mailer.dispatch(id).catch(()=>null)));
   }
   const notifications=await mailer.summary(orders.map(o=>o.id));
   const needsResponse=orders.filter(o=>['recibido','cotizado'].includes(o.status)).length;
   if(p.action==='staff-alerts')return response({needsResponse,mailConfigured:mailer.configured});
   return response({actor,orders,notifications,needsResponse,mailConfigured:mailer.configured});
  }
  if(p.action==='audit'){
   if(!actor.audit)return response({error:'Tu cuenta no tiene acceso a auditoría.'},403);
   return response({events:await db('camicat_audit','?select=occurred_at,actor_label,action,subject,detail&order=occurred_at.desc&limit=100')});
  }
  if(!uuid.test(p.id??'')||!Object.hasOwn(statuses,p.status)||p.status==='recibido'||(p.total!=null&&(!Number.isInteger(p.total)||p.total<0||p.total>99999999)))return response({error:'Revisa el estado y el total.'},400);
  const updated=await rpc('camicat_move_request',{id:p.id,actor:actor.id,status:p.status,total:p.total??null,detail:clean(p.detail,260),tracking:clean(p.tracking,120)});
  try{await mailer.dispatch(updated.id);}catch{/* The panel can retry queued email. */}
  return response({order:Object.fromEntries(staffFields.split(',').map(k=>[k,updated[k]]))});
 }catch(e){
  const msg=e instanceof Error?e.message:'';
  const errors={camicat_unavailable:'Una pieza ya no está disponible. Revisa tu selección.',camicat_invalid_items:'No se pudo confirmar la selección.',camicat_rate_limit:'Llegaste al límite temporal de solicitudes. Intenta más tarde.',camicat_need_total:'Agrega el total final y las condiciones de entrega.',camicat_need_pickup:'Indica el lugar y horario de retiro.',camicat_need_tracking:'Indica el transportista y el número de seguimiento.',camicat_invalid_transition:'El estado cambió en otro dispositivo. Actualiza la bandeja.',camicat_order_missing:'No encontramos el pedido.'};
  return response({error:errors[msg]??'No se pudo completar la solicitud. Intenta de nuevo.'},msg==='camicat_rate_limit'?429:errors[msg]?409:503);
 }
});
