export const RECOVERY_LIMIT_MS=13500;
export function recoveryFetch(input,options={},fetcher=globalThis.fetch){
 const url=typeof input==='string'?input:input.url??String(input);
 if(!url.includes('/auth/v1/recover'))return fetcher(input,options);
 const controller=new AbortController();
 const original=options.signal??input?.signal;
 const cancel=()=>controller.abort(original.reason);
 if(original?.aborted)cancel();else original?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>controller.abort(new Error('recovery_timeout')),12000);
 return Promise.resolve().then(()=>fetcher(input,{...options,signal:controller.signal})).finally(()=>{
  clearTimeout(timer);
  original?.removeEventListener('abort',cancel);
 });
}

export function recoveryRequest(auth,email,timeout=RECOVERY_LIMIT_MS){
 let timer;
 const limit=new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(Object.assign(new Error('recovery_timeout'),{code:'recovery_timeout'})),timeout);
 });
 return Promise.race([
  Promise.resolve().then(()=>auth.resetPasswordForEmail(email.trim(),{redirectTo:'https://www.camicat.cl/admin'})),
  limit
 ]).finally(()=>clearTimeout(timer));
}

export function recoveryMessage(error){
 if(error?.status===429||['over_email_send_rate_limit','over_request_rate_limit'].includes(error?.code))
  return 'Se alcanzó el límite temporal de correos. Si ya pediste un enlace, revisa Spam o Promociones y espera antes de pedir otro.';
 if(error?.code==='recovery_timeout'||error?.status===504||error?.name==='AbortError'||error?.message?.includes('recovery_timeout'))
  return 'No pudimos confirmar el envío a tiempo. Revisa Spam o Promociones antes de volver a intentar.';
 if(error?.status>=500)
  return 'El servicio de correo no pudo completar la solicitud. Intenta más tarde. Si ya tienes contraseña, puedes iniciar sesión.';
 return 'No pudimos solicitar el enlace. Revisa tu conexión e inténtalo de nuevo.';
}
