import { checkAccess, createRecoveryClient } from './cloud.js';

export function showPasswordReset() {
 const url=new URL(location.href);
 const fragment=new URLSearchParams(url.hash.slice(1));
 const legacyLink=['recovery','invite'].includes(fragment.get('type'));
 const linkError=fragment.has('error_code')||url.searchParams.has('error_code');
 if(!legacyLink&&!linkError&&!/^\/admin\/restablecer\/?$/.test(url.pathname))return false;

 const get=id=>document.getElementById(id);
 const form=get('staffNewPasswordForm'),status=get('staffNewPasswordStatus');
 const password=get('newStaffPassword'),repeat=get('repeatStaffPassword');
 const submit=get('saveNewStaffPassword'),finish=get('staffResetFinish');
 const email=get('staffResetAccount'),title=get('staffNewPasswordTitle');
 const accessToken=fragment.get('access_token'),refreshToken=fragment.get('refresh_token');
 document.body.dataset.staffPanel='reset';
 document.title='Restablecer contraseña · Camicat';
 history.replaceState(null,'','/admin/restablecer');

 async function initialize(){
  if(linkError||!legacyLink||!accessToken||!refreshToken)throw Error('invalid_link');
  const recovery=createRecoveryClient();
  const {data,error}=await recovery.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
  if(error||!data?.session)throw Error('invalid_link');
  const account=await checkAccess(recovery);
  if(!account?.email||account.id!==data.session.user.id)throw Error('invalid_link');
  const assurance=await recovery.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error)throw Error('invalid_link');
  if(assurance.data?.nextLevel==='aal2'&&assurance.data.currentLevel!=='aal2'){
   status.textContent='Esta cuenta tiene verificación en dos pasos. Contacta al encargado de Camicat para completar la recuperación.';
   finish.hidden=false;
   return;
  }

  email.textContent=account.email;
  get('staffResetAccountLine').hidden=false;
  form.hidden=false;
  status.textContent='';
  password.focus({preventScroll:true});

  repeat.oninput=()=>repeat.setCustomValidity('');
  form.onsubmit=async event=>{
   event.preventDefault();
   if(submit.disabled)return;
   repeat.setCustomValidity(repeat.value===password.value?'':'Las contraseñas deben coincidir.');
   if(!form.reportValidity())return;
   submit.disabled=true;
   status.textContent='Guardando tu contraseña…';
   try{
    const {error}=await recovery.auth.updateUser({password:password.value});
    if(error)throw error;
    form.reset();
    form.hidden=true;
    get('staffResetAccountLine').hidden=true;
    title.textContent='Contraseña actualizada';
    status.textContent='Ahora inicia sesión en el panel con tu correo y tu nueva contraseña.';
    finish.href='/admin?restablecida=1';
    finish.hidden=false;
    finish.focus({preventScroll:true});
    void recovery.auth.signOut({scope:'local'}).catch(()=>{});
   }catch(error){
    status.textContent=error?.code==='same_password'
     ?'Elige una contraseña distinta de la anterior.'
     :'No pudimos guardar la contraseña. Si el enlace venció, solicita uno nuevo desde el panel.';
   }finally{submit.disabled=false;}
  };
 }
 initialize().catch(()=>{
  status.textContent='Este enlace es inválido, venció o ya se usó. Vuelve al panel y solicita un enlace nuevo.';
  finish.hidden=false;
 });
 return true;
}
