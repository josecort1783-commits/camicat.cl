'use strict';
(async()=>{
 if($('#encuentranos').dataset.agendaOnline!=='true')return;
 const month=new Intl.DateTimeFormat('es-CL',{month:'long',timeZone:'UTC'});
 const full=new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const res=await fetch('https://wbqpcunyzvdvhaiduyem.supabase.co/rest/v1/camicat_agenda?select=name,location,starts_on,hours&published=eq.true&order=starts_on.asc.nullslast,name.asc&limit=4',{headers:{apikey:'sb_publishable_cYM7lEnUtR51n2-Gqhv5kQ_TKbRnu_h'},signal:controller.signal});
  if(!res.ok)return;
  const rows=await res.json();
  if(!Array.isArray(rows)||rows.length>4||!rows.every(p=>p&&typeof p.name==='string'&&p.name.length<=80&&typeof p.location==='string'&&p.location.length<=130&&typeof p.hours==='string'&&p.hours.length<=55&&(p.starts_on===null||/^\d{4}-\d{2}-\d{2}$/.test(p.starts_on)&&Number.isFinite(+new Date(p.starts_on+'T12:00:00Z')))))return;
  if(!rows.length)return;
  const card=(entry,index)=>{
   if(!entry)return `<article class="agenda-card agenda-open-slot" aria-hidden="true"><div class="agenda-date"><span>—</span><small>PARADA 0${index+1}</small></div><h3>Por anunciar</h3><p>Lugar y fecha por confirmar</p></article>`;
   const date=entry.starts_on?new Date(entry.starts_on+'T12:00:00Z'):null;
   const stamp=date?`<time class="agenda-date" datetime="${entry.starts_on}" aria-label="${escapeHtml(full.format(date))}"><span>${date.getUTCDate()}</span><small>${escapeHtml(month.format(date))} · ${date.getUTCFullYear()}</small></time>`:`<div class="agenda-date agenda-fixed">${uiIcon('pin')}<small>PUNTO FIJO</small></div>`;
   return `<article class="agenda-card">${stamp}<h3>${escapeHtml(entry.name)}</h3><p>${uiIcon('pin')}${escapeHtml(entry.location)}</p>${entry.hours?`<p class="agenda-hours">${escapeHtml(entry.hours)}</p>`:''}</article>`;
  };
  $('#agendaCards').innerHTML=Array.from({length:4},(_,i)=>card(rows[i],i)).join('');
  $('#agendaEmpty').hidden=true;
  const first=rows[0];
  $('#agendaTeaser').textContent=[first.name,first.starts_on?full.format(new Date(first.starts_on+'T12:00:00Z')):null,first.location].filter(Boolean).join(' · ');
  document.documentElement.dataset.agendaSource='supabase';
 }catch{/* Keep the existing static agenda when the connection is unavailable. */}
 finally{clearTimeout(timer);}
})();
