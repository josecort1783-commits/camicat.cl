import {AGENDA_ONLINE} from './config.js';
import {escapeHtml as esc,uniqueId} from './model.js';
const KEY='camicat-agenda-demo-v1';
const FIELDS='id,name,location,starts_on,hours,published';
const chile=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Santiago'});
const day=new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'long',timeZone:'UTC'});
const fmt=new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
function validDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'2020-01-01'||value>'2100-12-31')return false;
 const date=new Date(value+'T12:00:00Z');
 return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;
}
function valid(entry){return entry&&typeof entry.name==='string'&&entry.name.trim().length>=2&&entry.name.length<=80&&typeof entry.location==='string'&&entry.location.trim().length>=2&&entry.location.length<=130&&(entry.starts_on===null||validDate(entry.starts_on))&&typeof entry.hours==='string'&&entry.hours.length<=55&&typeof entry.published==='boolean';}
function readDemo(){try{const entries=JSON.parse(localStorage.getItem(KEY));return Array.isArray(entries)?entries.filter(p=>valid(p)&&/^[\da-f-]{32,36}$/.test(p.id)):[];}catch{return [];}}
export function createAgenda(client){
 const $=s=>document.querySelector(s);
 let connected=false,entries=readDemo(),editing=null,busy=false,ready=true,generation=0;
 const form=$('#agendaForm');
 const message=text=>$('#agendaStatus').textContent=text;
 function render(){
  const ordered=[...entries].sort((a,b)=>(a.starts_on??'9999').localeCompare(b.starts_on??'9999')||a.name.localeCompare(b.name,'es'));
  const dateParts=Object.fromEntries(chile.formatToParts(new Date()).map(p=>[p.type,p.value]));
  const today=dateParts.year+'-'+dateParts.month+'-'+dateParts.day;
  const visible=ordered.filter(p=>p.published&&(p.starts_on===null||p.starts_on>=today)).slice(0,4);
  $('#agendaPreview').innerHTML=Array.from({length:4},(_,i)=>{
   const p=visible[i];return `<article class="agenda-preview-card"><small>${p?.starts_on?esc(day.format(new Date(p.starts_on+'T12:00:00Z'))):p?'Punto fijo':'Próxima fecha'}</small><b>${p?esc(p.name):'Por anunciar'}</b><span>${p?esc(p.location):'Lugar y fecha por confirmar'}</span>${p?.hours?`<span>${esc(p.hours)}</span>`:''}</article>`;
  }).join('');
  $('#agendaEntries').innerHTML=ordered.map(p=>`<article class="agenda-entry"><div><b>${esc(p.name)}</b><p>${p.starts_on?esc(fmt.format(new Date(p.starts_on+'T12:00:00Z'))):'Punto de venta fijo'} · ${esc(p.location)}${p.hours?' · '+esc(p.hours):''}</p>${!p.published?'<small>Oculto en la tienda</small>':''}</div><div class="agenda-row-actions"><button type="button" data-agenda-edit="${esc(p.id)}">Editar</button><button type="button" data-agenda-toggle="${esc(p.id)}">${p.published?'Ocultar':'Mostrar'}</button></div></article>`).join('');
  $('#agendaSave').textContent=busy?'Guardando…':editing?'Guardar cambios':connected?'Publicar en la agenda':'Agregar a mi prueba';
  $('#agendaSave').disabled=busy||!ready;
  $('#agendaCancel').hidden=!editing;
  $('#agendaMode').textContent=connected?(ready?'Tienda conectada · los cambios guardados se publican al instante.':'Agenda pública pendiente de conexión.'):'Modo de prueba · se guarda en este dispositivo.';
  form.setAttribute('aria-busy',String(busy));
  $('#agendaEntries').querySelectorAll('button').forEach(b=>b.disabled=busy||!ready);
 }
 function reset(){editing=null;form.reset();}
 async function connect(value){
  const token=++generation;connected=value;ready=!value;busy=false;entries=value?[]:readDemo();reset();render();message(value?'Cargando agenda…':'');
  if(!value)return;
  if(!AGENDA_ONLINE){message('La publicación de la agenda está pendiente de habilitación. Cierra tu acceso para probar el formulario.');return;}
  try{
   const {data,error}=await client.from('camicat_agenda').select(FIELDS).order('starts_on',{ascending:true,nullsFirst:false});
   if(token!==generation)return;
   if(error||!Array.isArray(data))throw error??Error();
   entries=data.filter(valid);ready=true;message('');
  }catch(error){if(token===generation)message(['PGRST205','42P01'].includes(error?.code)?'La agenda en línea aún no está habilitada. Puedes probarla al cerrar tu acceso.':'No pudimos cargar la agenda. Vuelve a entrar para reintentar.');}
  if(token===generation)render();
 }
 async function save(entry,id,resetOnSuccess){
  const token=generation,wasConnected=connected;busy=true;render();message('');
  try{
   let result={...entry,id:id||uniqueId()};
   if(wasConnected){
    const table=client.from('camicat_agenda');
    const query=id?table.update(entry).eq('id',id):table.insert(entry);
    const {data,error}=await query.select(FIELDS).single();
    if(error||!valid(data))throw Error();
    result=data;
   }
   if(token!==generation)return;
   const next=id?entries.map(p=>p.id===id?result:p):[...entries,result];
   if(!wasConnected)localStorage.setItem(KEY,JSON.stringify(next));
   entries=next;
   if(resetOnSuccess)reset();
   message(wasConnected?'Agenda actualizada en la tienda.':'Cambio guardado en tu prueba. La tienda pública sigue igual.');
  }catch{if(token===generation)message('No se pudo guardar. Revisa la conexión e inténtalo de nuevo.');}
  finally{if(token===generation){busy=false;render();}}
 }
 form.onsubmit=e=>{
  e.preventDefault();if(busy||!ready)return;
  const current=entries.find(p=>p.id===editing);
  const entry={name:$('#agendaName').value.trim(),location:$('#agendaLocation').value.trim(),starts_on:$('#agendaDate').value||null,hours:$('#agendaHours').value.trim(),published:current?.published??true};
  if(!valid(entry)){message('Revisa el nombre, el lugar y la fecha antes de guardar.');return;}
  void save(entry,editing,true);
 };
 $('#agendaCancel').onclick=()=>{if(!busy){reset();message('');render();}};
 $('#agendaEntries').onclick=e=>{
  const button=e.target.closest('button');if(!button||busy||!ready)return;
  const p=entries.find(p=>p.id===(button.dataset.agendaEdit||button.dataset.agendaToggle));if(!p)return;
  if(button.dataset.agendaEdit){
   editing=p.id;$('#agendaName').value=p.name;$('#agendaLocation').value=p.location;$('#agendaDate').value=p.starts_on??'';$('#agendaHours').value=p.hours;message('');render();$('#agendaName').focus();
  }else{
   const {id,...entry}=p;void save({...entry,published:!p.published},id,false);
  }
 };
 render();return {connect};
}
