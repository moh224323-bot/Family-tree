// Shared runtime for شجرتنا public pages: Supabase client, site status, header, maintenance screen.
(function(){
  const asVisitor = new URLSearchParams(location.search).get('as') === 'visitor';
  const SB = window.supabase.createClient(window.FT_CONFIG.url, window.FT_CONFIG.key,
    asVisitor ? {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'ft-visitor-preview'}} : undefined);

  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TZ = 'Asia/Riyadh';
  const fmt = (opts, cal) => new Intl.DateTimeFormat(cal==='h' ? 'ar-SA-u-ca-islamic-umalqura-nu-latn' : 'ar-u-ca-gregory-nu-latn', Object.assign({timeZone:TZ}, opts));
  const D = {
    day: d => fmt({day:'numeric'}).format(d),
    month: d => fmt({month:'long'}).format(d),
    monthYear: d => fmt({month:'long', year:'numeric'}).format(d),
    weekday: d => fmt({weekday:'long'}).format(d),
    full: d => fmt({weekday:'long', day:'numeric', month:'long', year:'numeric'}).format(d),
    time: d => fmt({hour:'numeric', minute:'2-digit'}).format(d),
    hijri: d => fmt({day:'numeric', month:'long', year:'numeric'}, 'h').format(d),
    hijriShort: d => fmt({day:'numeric', month:'long'}, 'h').format(d),
    ymd: d => { const p = fmt({year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(d); const g = t => p.find(x=>x.type===t).value; return g('year')+'-'+g('month')+'-'+g('day'); }
  };
  const KIND = {wedding:'زواج', gathering:'جمعة عائلية', meeting:'لقاء', other:'مناسبة'};
  const photoUrl = path => window.FT_CONFIG.url + '/storage/v1/object/public/photos/' + path.split('/').map(encodeURIComponent).join('/');

  function toast(t){ const el=document.getElementById('toast'); if(!el) return; el.textContent=t; el.classList.add('on'); clearTimeout(toast.h); toast.h=setTimeout(()=>el.classList.remove('on'),2200); }

  function applyMode(m){
    const off = m.online===false, admin = m.viewer==='admin';
    const mnt=document.getElementById('mnt'), bar=document.getElementById('adminBar');
    if(mnt) mnt.hidden = !(off && !admin);
    if(bar) bar.hidden = !(off && admin);
    document.body.classList.toggle('prev-admin', !!(off && admin));
    document.body.style.overflow = (off && !admin) ? 'hidden' : '';
    const msg=document.getElementById('mntMsg'); if(msg) msg.textContent = m.msg||'';
    const b=document.getElementById('mntBack'); if(b){ b.hidden=!m.back; b.textContent = m.back ? 'نعود '+m.back : ''; }
  }
  let mode = {};
  window.addEventListener('message', e => { if(e.origin===location.origin && e.data && e.data.type==='site-mode'){ mode=Object.assign(mode,e.data); applyMode(mode); } });

  async function boot(){
    if(document.readyState==='loading') await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
    const {data, error} = await SB.rpc('get_site_status');
    if(error) throw error;
    const site = data || {};
    const FAM = site.family_name || 'العائلة';
    const FAMT = FAM==='العائلة' ? 'شجرة العائلة' : 'شجرة عائلة '+FAM;
    document.querySelectorAll('[data-fam]').forEach(el => el.textContent = FAM);
    document.querySelectorAll('[data-famt]').forEach(el => el.textContent = FAMT);
    mode = {online: site.online!==false, msg: site.msg||'', back: site.back||'', viewer: (site.is_staff && !asVisitor) ? 'admin' : 'visitor'};
    applyMode(mode);
    return Object.assign({}, site, {FAM, FAMT});
  }

  const pc = n => n===1?'صورة واحدة':n===2?'صورتان':(n>=3&&n<=10)?n+' صور':n+' صورة';
  window.FT = {SB, esc, D, KIND, photoUrl, toast, boot, asVisitor, pc};
})();
