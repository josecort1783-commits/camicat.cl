export function createStaffSecurity(client){
 const $=id=>document.getElementById(id);
 const start=$('openStaffSecurity'),begin=$('startStaffMfa'),f=$('staffMfaForm'),status=$('staffMfaStatus'),qr=$('staffMfaQr'),code=$('staffMfaCode'),dialog=$('staffSecurityDialog');
 if(!start||!client.auth.mfa)return {connect(){},requireVerified:async()=>true};
 let factor=null;
 function reset(){
  qr.removeAttribute('src');qr.hidden=true;f.hidden=true;code.value='';begin.hidden=true;begin.disabled=false;status.textContent='';
 }
 async function refresh(){
  reset();
  try{
   const {data,error}=await client.auth.mfa.listFactors();if(error)throw error;
   const current=data.totp.find(x=>x.status==='verified');
   if(current){status.textContent='Tu cuenta ya tiene una aplicación autenticadora verificada.';return;}
   status.textContent='Usa una aplicación autenticadora para generar un código sin esperar correos.';
   begin.hidden=false;
  }catch{status.textContent='No pudimos verificar el estado de tu cuenta. Intenta más tarde.';}
 }
 start.onclick=()=>{dialog.showModal();void refresh();};
 $('closeStaffSecurity').onclick=()=>dialog.close();
 dialog.addEventListener('close',reset);
 begin.onclick=async()=>{
  begin.disabled=true;status.textContent='Preparando el código QR…';
  try{
   const list=await client.auth.mfa.listFactors();if(list.error)throw list.error;
   for(const pending of list.data.all.filter(x=>x.factor_type==='totp'&&x.status==='unverified'&&x.friendly_name==='Camicat')){const removed=await client.auth.mfa.unenroll({factorId:pending.id});if(removed.error)throw removed.error;}
   const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Camicat',issuer:'Camicat'});if(error)throw error;
   if(!dialog.open)return;
   if(!data.totp?.qr_code?.startsWith('data:image/svg+xml;'))throw Error('qr');
   factor=data.id;qr.src=data.totp.qr_code;qr.hidden=false;f.hidden=false;begin.hidden=true;status.textContent='Escanea el QR desde tu aplicación e ingresa el código de seis dígitos.';
  }catch{status.textContent='No pudimos generar la configuración. Vuelve a intentarlo.';}finally{begin.disabled=false;}
 };
 f.onsubmit=async e=>{
  e.preventDefault();
  if(!factor||!/^\d{6}$/.test(code.value))return;
  const button=f.querySelector('button');button.disabled=true;
  try{
   const {error}=await client.auth.mfa.challengeAndVerify({factorId:factor,code:code.value});
   if(error)throw error;
   reset();status.textContent='Tu aplicación autenticadora quedó verificada. Conserva el acceso a ella.';
  }catch{status.textContent='Ese código no se pudo verificar. Revisa el código actual de la aplicación.';code.select();}
  finally{button.disabled=false;}
 };
 async function requireVerified(){
  const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error)throw Error('No pudimos comprobar el segundo factor. Intenta nuevamente.');
  if(assurance.data.nextLevel!=='aal2'||assurance.data.currentLevel==='aal2')return true;
  const list=await client.auth.mfa.listFactors();
  const verified=list.data?.totp?.find(x=>x.status==='verified');
  if(list.error||!verified)throw Error('No encontramos tu aplicación autenticadora.');
  const gate=$('staffMfaGate'),input=$('staffMfaGateCode'),form=$('staffMfaGateForm'),msg=$('staffMfaGateStatus'),button=form.querySelector('button');
  msg.textContent=''; input.value=''; gate.showModal(); input.focus();
  return new Promise(resolve=>{
   let ok=false;
   gate.addEventListener('close',()=>{form.onsubmit=null;input.value='';resolve(ok);},{once:true});
   $('cancelStaffMfaGate').onclick=()=>gate.close();
   form.onsubmit=async e=>{e.preventDefault();button.disabled=true;
    try{const {error}=await client.auth.mfa.challengeAndVerify({factorId:verified.id,code:input.value});if(error)throw error;ok=true;gate.close();}
    catch{msg.textContent='El código no se pudo comprobar. Prueba con el código actual.';input.select();}
    finally{button.disabled=false;}
   };
  });
 }
 return {requireVerified,connect(open){start.hidden=!open;if(!open&&dialog.open)dialog.close();}};
}
