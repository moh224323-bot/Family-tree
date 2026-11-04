(function(){
'use strict';
const SB = window.supabase.createClient(window.FT_CONFIG.url, window.FT_CONFIG.key);

/* ================= state ================= */
let ME=null;              // staff row of the signed-in user
let P=[], by={}, founder=null, B=[];
let SUPS=[], REQS=[], LOG=[];
let SET={};
const S={view:'overview',q:'',branch:'all',genF:'all',status:'all',limit:25,rqTab:'all',fresh:null,pvDev:'d',pvViewer:'visitor'};

/* ================= helpers ================= */
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ ابن /g,' بن ').replace(/\s+/g,' ').trim();
function anc(id){const r=[];let c=by[id];let guard=0;while(c&&guard++<200){r.push(c.id);c=by[c.p];}return r;}
const gen=id=>anc(id).length;
const desc=id=>{let n=0;const s=[...(by[id]?by[id].kids:[])];while(s.length){const c=s.pop();n++;s.push(...by[c].kids);}return n;};
const short=(id,k=2)=>by[id]?anc(id).slice(0,k).map(i=>by[i].n).join(' بن '):'—';
const fullName=id=>by[id]?anc(id).map(i=>by[i].n).join(' بن '):'—';
const branchOf=id=>{const a=anc(id);return a.length>=2?a[a.length-2]:a[0];};
const PAL=['#C9A75E','#9DAA74','#D39A72','#86AE9F','#C2AE84','#B79A7A','#A3B58C'];
let bColor={};
const colorOf=id=>bColor[branchOf(id)]||'#C9A75E';
const YEAR=new Date().getFullYear();
const scopeSize=root=>by[root]?desc(root)+1:0;
function ago(ts){if(!ts)return '';const d=(Date.now()-new Date(ts).getTime())/1000;
 if(d<60)return 'الآن';if(d<3600)return 'قبل '+Math.round(d/60)+' دقيقة';if(d<86400)return 'قبل '+Math.round(d/3600)+' ساعة';if(d<86400*7)return 'قبل '+Math.round(d/86400)+' يوم';
 return new Date(ts).toLocaleDateString('ar-SA-u-ca-gregory',{year:'numeric',month:'short',day:'numeric'});}
const isAdmin=()=>ME&&ME.role==='admin';
const curSup=()=>ME&&ME.role==='supervisor'?ME:null;
const inScope=id=>{const s=curSup();return !s||anc(id).includes(s.scope_root);};
const can=p=>{const s=curSup();if(!s)return true;return {add:s.can_add,edit:s.can_edit,del:s.can_delete,direct:s.can_add&&s.can_publish}[p];};
const myName=()=>ME?ME.display_name:'';

/* ================= icons ================= */
const I={
 home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5.5 2 5.5 5"/>',
 inbox:'<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 check:'<path d="M5 12l5 5 9-10"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
 tree:'<path d="M12 21v-8"/><path d="M12 15l-4-3"/><path d="M12 13l4-3"/><circle cx="12" cy="6" r="3"/><circle cx="6" cy="10" r="2"/><circle cx="18" cy="8" r="2"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
 eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 power:'<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
 trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>'
};
const ic=(n,s=18,c='currentColor')=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const avatar=(id,size)=>`<span class="av" style="background:${colorOf(id)}${size?`;width:${size}px;height:${size}px`:''}">${esc(by[id]?by[id].n[0]:'؟')}</span>`;

/* ================= toast ================= */
function toast(t,bad){const el=document.getElementById('toast');el.innerHTML=ic(bad?'info':'check',18,bad?'#F3B9A8':'#C9D3B0')+'<span>'+esc(t)+'</span>';el.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>el.classList.remove('on'),bad?4200:2600);}
const errMsg=e=>{const m=(e&&(e.message||e.error_description))||'حدث خطأ غير متوقع';
 if(/row-level security|permission denied/i.test(m))return 'ليست لديك صلاحية لهذا الإجراء';
 if(/persons_single_root/.test(m))return 'يوجد جد مؤسس بالفعل';
 if(/violates foreign key/.test(m))return 'لا يمكن الحذف لوجود أبناء أو بيانات مرتبطة';
 if(/Invalid login credentials/i.test(m))return 'البريد أو كلمة المرور غير صحيحة';
 if(/Email not confirmed/i.test(m))return 'لم يتم تأكيد البريد بعد. افتح رسالة التأكيد في بريدك';
 if(/already registered/i.test(m))return 'هذا البريد مسجّل مسبقًا، استخدم تسجيل الدخول';
 if(/Password should be/i.test(m))return 'كلمة المرور قصيرة، استخدم 6 أحرف على الأقل';
 if(/Failed to fetch|NetworkError/i.test(m))return 'تعذّر الاتصال، تحقق من الإنترنت';
 return m;};

/* ================= data ================= */
async function loadAll(){
 const q=[
  SB.from('persons').select('*').order('id'),
  SB.rpc('get_tree'),
  SB.from('requests').select('*').eq('status','pending').order('created_at',{ascending:false}),
  SB.from('audit_log').select('*').order('created_at',{ascending:false}).limit(300),
  SB.from('site_settings').select('*').eq('id',1).maybeSingle(),
  isAdmin()?SB.from('staff').select('*').order('id'):Promise.resolve({data:[]})
 ];
 const [pp,tr,rq,lg,st,sf]=await Promise.all(q);
 for(const r of [pp,tr,rq,lg,st,sf]) if(r.error) throw r.error;
 P=[];by={};
 const det={};(pp.data||[]).forEach(r=>det[r.id]=r);
 const base=new Map();(tr.data||[]).forEach(r=>base.set(r.id,r));(pp.data||[]).forEach(r=>base.set(r.id,r));
 base.forEach((t,id)=>{const r=det[id]||t;const x={id,n:r.first_name,p:r.father_id||0,b:r.birth_year,d:r.death_year,dead:!!r.is_dead||r.death_year!=null,g:String(r.gender||'m').trim(),vis:r.visibility||'public',ph:r.phone||'',nt:r.notes||'',by:r.created_by_name||'',at:r.created_at||null,kids:[]};P.push(x);by[x.id]=x;});
 P.forEach(x=>{if(x.p&&by[x.p])by[x.p].kids.push(x.id);});
 P.forEach(x=>x.kids.sort((a,b)=>(by[a].b||9999)-(by[b].b||9999)||a-b));
 founder=P.find(x=>!x.p)||null;
 B=founder?founder.kids:[];
 bColor={};B.forEach((c,i)=>bColor[c]=PAL[i%PAL.length]);if(founder)bColor[founder.id]='#4F5D2F';
 REQS=rq.data||[];LOG=lg.data||[];SET=st.data||{};
 SUPS=(sf.data||[]).filter(s=>s.role==='supervisor');
}
async function refresh(){try{await loadAll();}catch(e){toast(errMsg(e),true);}render();}

/* ================= nav ================= */
const visibleReqs=()=>REQS.filter(r=>{const t=r.father_id||r.target_id;return by[t]&&inScope(t);});
function renderNav(){
 const admin=isAdmin();
 const items=[['overview','home','نظرة عامة'],['members','users','الأفراد'],['requests','inbox','الطلبات',visibleReqs().length],...(admin?[['site','globe','الموقع والنشر',SET.online===false?'متوقف':0],['sups','shield','المشرفون',SUPS.length,'g']]:[]),['log','clock','سجل التعديلات'],...(admin?[['settings','gear','الخصوصية والإعدادات']]:[])];
 const s=curSup();
 document.getElementById('side').innerHTML=items.map(([k,i,t,c,cl])=>`<button type="button" class="nav ${S.view===k?'on':''}" data-view="${k}">${ic(i)}<span>${t}</span>${c?`<span class="c ${cl||''}">${c}</span>`:''}</button>`).join('')+
 `<div class="sidefoot">${s?`<b>صلاحياتك</b>مشرف على فرع ${esc(short(s.scope_root,2))} (${scopeSize(s.scope_root)} فردًا). ${can('direct')?'إضافاتك تُنشر مباشرة.':'إضافاتك تُراجع من المدير قبل النشر.'}`:`<b>المدير العام</b>صلاحيات كاملة على ${P.length} فردًا${B.length?' و'+B.length+' فروع':''}.`}</div>`;
}

/* ================= views ================= */
const main=document.getElementById('main');
function scopeBar(){const s=curSup();return s?`<div class="scopebar">${ic('lock',18,'#8A6A26')}<span>تعمل ضمن فرع <b>${esc(short(s.scope_root,3))}</b> فقط. ${can('direct')?'':'أي إضافة تُرسل للمدير العام للاعتماد.'}</span></div>`:'';}

function vStart(){
 return `<div class="ph"><div><h1>أهلًا ${esc(myName())}</h1><p>الشجرة فارغة الآن، وكل شيء جاهز لتبدأ</p></div></div>
 <section class="card" style="padding:34px 26px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;max-width:720px">
  <span class="ic big" style="background:var(--olivebg)">${ic('tree',28,'#3E4A24')}</span>
  <h2 style="font-family:'Reem Kufi',serif;font-size:24px;margin:0">ابدأ بالجد المؤسس</h2>
  <p class="sub" style="margin:0;line-height:1.8;max-width:480px">أضف أول جد للعائلة، ثم أضف أبناءه واحدًا واحدًا. كل فرد تضيفه يظهر في الموقع مباشرة.</p>
  ${isAdmin()?`<button class="btn p" type="button" data-act="add">${ic('plus')}إضافة الجد المؤسس</button>`:'<p class="sub">بانتظار المدير العام لإضافة الجد المؤسس.</p>'}
 </section>`;
}

function vOverview(){
 if(!founder)return vStart();
 const s=curSup();
 const pool=P.filter(x=>inScope(x.id));
 const living=pool.filter(x=>!x.dead).length;
 const reqs=visibleReqs();
 const month=pool.filter(x=>x.at&&Date.now()-new Date(x.at).getTime()<30*86400000).length;
 const roots=s?[s.scope_root]:B;
 const bars=roots.filter(b=>by[b]).map(b=>({b,n:scopeSize(b),sp:SUPS.filter(x=>x.scope_root===b||anc(x.scope_root).includes(b))}));
 const mx=Math.max(1,...bars.map(x=>x.n));
 return `<div class="ph"><div><h1>أهلًا ${esc(myName())}</h1><p>${s?'هذه نظرة على فرعك':'هذه نظرة عامة على '+(SET.family_name&&SET.family_name!=='العائلة'?'شجرة عائلة '+esc(SET.family_name):'شجرة العائلة')}</p></div>
  <div class="sp">${can('add')?`<button class="btn p" type="button" data-act="add">${ic('plus')}إضافة فرد</button>`:''}${isAdmin()?`<button class="btn" type="button" data-act="addSup">${ic('shield')}تعيين مشرف</button>`:''}</div></div>
  ${SET.online===false?`<div class="alert">${ic('power',18,'#A3412C')}<span><b>الموقع متوقف للزوار</b> منذ ${esc(ago(SET.changed_at))}.</span>${isAdmin()?`<button class="btn sm p" type="button" data-act="goOn">إعادة النشر</button>`:''}</div>`:''}
  ${scopeBar()}
  <div class="kpis">
   <div class="card kpi"><span class="l">${ic('users',16)}${s?'أفراد الفرع':'إجمالي الأفراد'}</span><span class="v">${pool.length}</span><span class="d">+${month} خلال 30 يومًا</span></div>
   <div class="card kpi"><span class="l">${ic('inbox',16)}طلبات بانتظار المراجعة</span><span class="v" style="color:#8A6A26">${reqs.length}</span><span class="d" style="color:var(--muted)">${reqs.length?'أقدمها '+esc(ago(reqs[reqs.length-1].created_at)):'لا يوجد'}</span></div>
   <div class="card kpi"><span class="l">${ic('user',16)}على قيد الحياة</span><span class="v">${living}</span><span class="d" style="color:var(--muted)">${pool.length?Math.round(living/pool.length*100):0}٪ من ${s?'الفرع':'العائلة'}</span></div>
   <div class="card kpi"><span class="l">${ic('shield',16)}${s?'صلاحياتك':'المشرفون'}</span><span class="v">${s?[s.can_add,s.can_edit,s.can_delete,s.can_publish].filter(Boolean).length+'/4':SUPS.length}</span><span class="d" style="color:var(--muted)">${s?'إضافة · تعديل · حذف · نشر مباشر':(SUPS.length?'يغطّون '+new Set(SUPS.map(x=>branchOf(x.scope_root))).size+' من '+B.length+' فروع':'لم تعيّن مشرفين بعد')}</span></div>
  </div>
  <div class="grid2">
   <section class="card"><div class="ch"><h2>طلبات تنتظرك</h2><button class="lnk" type="button" data-view="requests">عرض الكل</button></div>
    <div class="list">${reqRows(reqs.slice(0,4))}</div></section>
   <section class="card"><div class="ch"><h2>${s?'فرعك':'الفروع الرئيسية'}</h2><span class="sub" style="margin-inline-start:auto">عدد الأفراد والمشرف</span></div>
    <div class="bars">${bars.length?bars.map(x=>`<div class="bar"><span style="display:flex;align-items:center;gap:8px"><i class="dot" style="background:${colorOf(x.b)}"></i>فرع ${esc(by[x.b].n)}</span><span class="t"><i style="width:${x.n/mx*100}%;background:${colorOf(x.b)}"></i></span><span class="n">${x.n}</span><span class="s">${x.sp.length?'المشرف: '+x.sp.map(p=>esc(p.display_name)).join('، '):'<span style="color:#A3412C">بلا مشرف</span>'}</span></div>`).join(''):'<div class="empty" style="padding:10px">أضف أبناء الجد المؤسس لتظهر الفروع هنا.</div>'}</div></section>
  </div>
  <section class="card" style="margin-top:18px"><div class="ch"><h2>آخر النشاط</h2><button class="lnk" type="button" data-view="log">السجل الكامل</button></div><div class="list">${logRows(LOG.slice(0,5))}</div></section>`;
}

function filtered(){
 const qq=norm(S.q);
 return P.filter(x=>inScope(x.id)&&(S.branch==='all'||branchOf(x.id)===+S.branch)&&(S.genF==='all'||gen(x.id)===+S.genF)&&(S.status==='all'||(S.status==='alive'?!x.dead:x.dead))&&(!qq||norm(fullName(x.id)).includes(qq)))
  .sort((a,b)=>(b.id===S.fresh)-(a.id===S.fresh)||new Date(b.at||0)-new Date(a.at||0));
}
function vMembers(){
 if(!founder)return vStart();
 const list=filtered(); const shown=list.slice(0,S.limit); const s=curSup();
 const maxG=Math.max(1,...P.map(x=>gen(x.id)));
 return `<div class="ph"><div><h1>الأفراد</h1><p>${s?'أفراد فرع '+esc(short(s.scope_root,2)):'كل أفراد العائلة'} · ${list.length} نتيجة</p></div>
  <div class="sp">${can('add')?`<button class="btn p" type="button" data-act="add">${ic('plus')}إضافة فرد</button>`:''}</div></div>
  ${scopeBar()}
  <section class="card">
   <div class="tools">
    <label class="search">${ic('search',18,'#736D5F')}<input id="mq" type="search" placeholder="ابحث بالاسم أو النسب، مثل: محمد بن صالح" value="${esc(S.q)}" aria-label="بحث في الأفراد"></label>
    ${s||!B.length?'':`<select class="sel" id="fb" aria-label="الفرع"><option value="all">كل الفروع</option>${B.map(b=>`<option value="${b}" ${S.branch==b?'selected':''}>فرع ${esc(by[b].n)}</option>`).join('')}</select>`}
    <select class="sel" id="fg" aria-label="الجيل"><option value="all">كل الأجيال</option>${Array.from({length:maxG},(_,i)=>i+1).map(g=>`<option value="${g}" ${S.genF==g?'selected':''}>الجيل ${g}</option>`).join('')}</select>
    <select class="sel" id="fs" aria-label="الحالة"><option value="all">الكل</option><option value="alive" ${S.status==='alive'?'selected':''}>الأحياء</option><option value="dead" ${S.status==='dead'?'selected':''}>المتوفون</option></select>
   </div>
   <div class="tw"><table><thead><tr><th>الفرد</th><th>الفرع</th><th>الجيل</th><th>الميلاد</th><th>الحالة</th><th>الأبناء</th><th>أُضيف بواسطة</th><th></th></tr></thead><tbody>
   ${shown.map(x=>`<tr class="${x.id===S.fresh?'new':''}"><td><div class="who">${avatar(x.id)}<span><b>${esc(x.n)}${x.g==='f'?' <span class="badge b-mute" style="height:20px;font-size:11px">أنثى</span>':''}${x.vis==='staff'?' <span class="badge b-gold" style="height:20px;font-size:11px">مخفي</span>':''}</b><span class="sub">${esc(fullName(x.id).split(' بن ').slice(1,4).join(' بن ')||'الجد المؤسس')}</span></span></div></td>
    <td><span style="display:inline-flex;align-items:center;gap:7px"><i class="dot" style="background:${colorOf(x.id)}"></i>${x.id===founder.id?'—':esc(by[branchOf(x.id)].n)}</span></td>
    <td>${gen(x.id)}</td><td>${x.b||'—'}</td>
    <td>${x.dead?`<span class="badge b-mute">${x.g==='f'?'توفيت':'توفي'}${x.d?' '+x.d:''}</span>`:'<span class="badge b-ok">حي</span>'}</td>
    <td>${x.kids.length}</td><td class="sub">${esc(x.by||'—')}<br>${esc(ago(x.at))}</td>
    <td style="white-space:nowrap">${can('edit')?`<button class="btn sm" type="button" data-edit="${x.id}">${ic('edit',15)}تعديل</button>`:''}${can('add')&&x.g!=='f'?` <button class="btn sm" type="button" data-addchild="${x.id}" title="إضافة ابن أو بنت">${ic('plus',15)}</button>`:''}</td></tr>`).join('')}
   </tbody></table></div>
   ${!list.length?'<div class="empty">لا يوجد أفراد يطابقون البحث.</div>':''}
   ${list.length>S.limit?`<div class="more"><button class="btn" type="button" data-act="more">عرض ${Math.min(25,list.length-S.limit)} آخرين</button></div>`:''}
  </section>`;
}

function reqText(r){
 const p=r.payload||{};
 if(r.kind==='add')return `اقتراح إضافة <b>${esc(p.name)}</b> ${p.gender==='f'?'ابنةً':'ابنًا'} لـ <b>${esc(short(r.father_id,3))}</b>${p.birth_year?' · مواليد '+p.birth_year:''}${p.note?'<div class="sub">'+esc(p.note)+'</div>':''}`;
 if(r.kind==='edit')return `تعديل بيانات <b>${esc(short(r.target_id,3))}</b>: ${p.name?'الاسم إلى <b>'+esc(p.name)+'</b> ':''}${p.birth_year?'سنة الميلاد إلى <b>'+p.birth_year+'</b>':''}${p.note?'<div class="sub">'+esc(p.note)+'</div>':''}`;
 return `تسجيل وفاة <b>${esc(short(r.target_id,3))}</b>${p.death_year?' عام '+p.death_year:''}${p.note?'<div class="sub">'+esc(p.note)+'</div>':''}`;
}
function reqRows(list){
 if(!list.length)return '<div class="empty">لا توجد طلبات معلّقة. كل شيء محدّث.</div>';
 const canAct=r=>isAdmin()||(can('direct')&&r.source==='public');
 return list.map(r=>{const t=r.kind==='add'?['plus','#E7EBDA','#3E4A24']:r.kind==='edit'?['edit','#DFEAF1','#2F5D7A']:['info','#F5EBD3','#6B4F14'];
  return `<div class="li"><span class="ic" style="background:${t[1]}">${ic(t[0],18,t[2])}</span><div class="tx">${reqText(r)}<div class="sub">من ${esc(r.submitter_name)} · ${r.source==='supervisor'?'مشرف فرع':'اقتراح من الموقع'} · ${esc(ago(r.created_at))}</div></div>
  ${canAct(r)?`<button class="btn sm ok" type="button" data-ok="${r.id}">${ic('check',15)}اعتماد</button><button class="btn sm no" type="button" data-no="${r.id}">رفض</button>`:'<span class="badge b-gold">بانتظار المدير</span>'}</div>`;}).join('');
}
function vRequests(){
 const all=visibleReqs();
 const list=S.rqTab==='all'?all:all.filter(r=>S.rqTab==='sup'?r.source==='supervisor':r.kind===S.rqTab);
 return `<div class="ph"><div><h1>الطلبات</h1><p>اقتراحات الأقارب وإضافات المشرفين التي تحتاج اعتمادًا</p></div></div>${scopeBar()}
 <div class="tabs" style="margin-bottom:14px">${[['all','الكل',all.length],['add','إضافة',all.filter(r=>r.kind==='add').length],['edit','تعديل',all.filter(r=>r.kind==='edit').length],['death','وفاة',all.filter(r=>r.kind==='death').length],['sup','من المشرفين',all.filter(r=>r.source==='supervisor').length]].map(([k,t,n])=>`<button type="button" class="tab ${S.rqTab===k?'on':''}" data-rqtab="${k}">${t} (${n})</button>`).join('')}</div>
 <section class="card"><div class="list">${reqRows(list)}</div></section>`;
}

function vSups(){
 return `<div class="ph"><div><h1>المشرفون والصلاحيات</h1><p>كل مشرف يدير فرعًا محددًا فقط، ولا يعدّل خارج فرعه</p></div>
 ${founder?`<div class="sp"><button class="btn p" type="button" data-act="addSup">${ic('plus')}تعيين مشرف</button></div>`:''}</div>
 <div class="note" style="background:var(--bluebg);color:#24485E;margin-bottom:18px">${ic('info',18,'#2F5D7A')}<span>نطاق المشرف هو الشخص الذي يبدأ منه فرعه، ويقدر يضيف تحت أي واحد من ذريته فقط. يدخل المشرف من صفحة لوحة التحكم ببريده الإلكتروني نفسه الذي تسجّله هنا.</span></div>
 ${!SUPS.length?`<section class="card"><div class="empty">${founder?'لم تعيّن أي مشرف بعد.':'أضف الجد المؤسس وفروعه أولًا، ثم عيّن مشرفين عليها.'}</div></section>`:''}
 <div class="sups">${SUPS.map(s=>{const perms=[['can_add','إضافة أفراد','ابن أو بنت تحت أي فرد في فرعه'],['can_edit','تعديل البيانات','الأسماء والتواريخ والحالة'],['can_delete','حذف أفراد','من ليس لهم أبناء فقط'],['can_publish','نشر مباشر','بدون انتظار اعتماد المدير']];
  return `<article class="card sup"><div class="hd"><span class="av" style="background:${colorOf(s.scope_root)};width:46px;height:46px">${esc((s.display_name||'؟')[0])}</span><div><b>${esc(s.display_name)}</b><span class="sub" style="direction:ltr;display:block;text-align:right">${esc(s.email)}</span></div><span class="badge ${s.last_seen?'b-ok':'b-gold'}" style="margin-inline-start:auto">${s.last_seen?'دخل '+esc(ago(s.last_seen)):'لم يدخل بعد'}</span></div>
  <div class="scope"><i class="dot" style="background:${colorOf(s.scope_root)}"></i><span>النطاق: فرع <b>${esc(short(s.scope_root,3))}</b></span><span class="sub" style="margin-inline-start:auto">${scopeSize(s.scope_root)} فردًا</span></div>
  <div>${perms.map(([k,t,h])=>`<div class="perm"><span>${t}<small>${h}</small></span><button type="button" class="sw" role="switch" aria-checked="${!!s[k]}" aria-label="${t}" data-perm="${s.id}:${k}" ${k!=='can_add'&&k!=='can_edit'&&k!=='can_delete'&&!s.can_add?'disabled':''}></button></div>`).join('')}</div>
  <div class="ft"><button class="lnk" type="button" data-rmsup="${s.id}" style="color:#A3412C;margin:0">إلغاء الإشراف</button></div></article>`;}).join('')}</div>`;
}

function logRows(list){
 const m={add:['plus','#E7EBDA','#3E4A24'],ok:['check','#E7EBDA','#3E4A24'],edit:['edit','#DFEAF1','#2F5D7A'],sup:['shield','#F5EBD3','#6B4F14'],no:['x','#F6E1DA','#A3412C'],perm:['lock','#F5EBD3','#6B4F14']};
 return list.length?list.map(l=>{const t=m[l.kind]||m.edit;return `<div class="li"><span class="ic" style="background:${t[1]}">${ic(t[0],17,t[2])}</span><div class="tx"><b>${esc(l.actor_name)}</b> ${esc(l.action)} <b>${esc(l.target||'')}</b></div><span class="sub">${esc(ago(l.created_at))}</span></div>`;}).join(''):'<div class="empty">لا يوجد نشاط بعد.</div>';
}
function vLog(){return `<div class="ph"><div><h1>سجل التعديلات</h1><p>كل إضافة أو تعديل أو اعتماد يُسجَّل تلقائيًا باسم من قام به، ولا يمكن حذفه</p></div></div>${scopeBar()}<section class="card"><div class="list">${logRows(LOG)}</div></section>`;}

function vSettings(){
 const rows=[['show_women','إظهار أسماء البنات في الشجرة العامة','عند الإيقاف تظهر للمشرفين والمدير فقط'],['show_births','إظهار سنوات الميلاد والوفاة','في الموقع العام'],['supervisors_direct_default','السماح للمشرفين الجدد بالنشر المباشر','ينطبق على المشرفين الذين تعيّنهم لاحقًا']];
 return `<div class="ph"><div><h1>الخصوصية والإعدادات</h1><p>تحكم في من يرى ماذا</p></div></div>
 <section class="card" style="max-width:760px"><div class="list">${rows.map(([k,t,h])=>`<div class="li"><div class="tx"><b>${t}</b><div class="sub">${h}</div></div><button type="button" class="sw" role="switch" aria-checked="${!!SET[k]}" aria-label="${t}" data-set="${k}"></button></div>`).join('')}</div></section>
 <section class="card" style="max-width:760px;margin-top:18px"><div class="ch"><h2>اسم العائلة</h2></div><div class="db" style="padding:18px"><div class="f"><label for="famIn">اسم العائلة كما يظهر في الموقع</label><input class="inp" id="famIn" maxlength="60" value="${esc(SET.family_name||'')}" placeholder="مثال: آل فلان"></div><div><button class="btn p" type="button" data-act="saveFam">حفظ</button></div></div></section>
 <section class="card" style="max-width:760px;margin-top:18px"><div class="ch"><h2>حسابك</h2></div><div class="db" style="padding:18px"><div class="f"><label for="meIn">اسمك كما يظهر في السجل</label><input class="inp" id="meIn" maxlength="80" value="${esc(myName())}"></div><div><button class="btn" type="button" data-act="saveMe">حفظ الاسم</button></div></div></section>`;
}

function render(){
 if(!ME)return;
 if(!isAdmin()&&['sups','settings','site'].includes(S.view))S.view='overview';
 renderNav();
 const v={site:vSite,overview:vOverview,members:vMembers,requests:vRequests,sups:vSups,log:vLog,settings:vSettings}[S.view]||vOverview;
 main.innerHTML=v();
 renderPill(); if(S.view==='site')setupPreview();
 bindMembers();
}
function bindMembers(){
 const mq=document.getElementById('mq');if(mq)mq.oninput=e=>{S.q=e.target.value;S.limit=25;const pos=e.target.selectionStart;main.innerHTML=vMembers();bindMembers();const n=document.getElementById('mq');n.focus();n.setSelectionRange(pos,pos);};
 [['fb','branch'],['fg','genF'],['fs','status']].forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.onchange=()=>{S[k]=el.value;S.limit=25;render();};});
}

/* ================= drawer: add / edit member ================= */
const drawer=document.getElementById('drawer'),scrim=document.getElementById('scrim');
let D=null;
function openDrawer(mode,opts={}){
 D={mode,g:'m',status:'alive',vis:'public',father:opts.father||null,edit:opts.id||null,busy:false,delArm:false};
 if(mode==='edit'){const x=by[opts.id];D.g=x.g;D.status=x.dead?'dead':'alive';D.vis=x.vis||'public';}
 if(mode==='add'&&!founder)D.founder=true;
 drawHTML(); drawer.classList.add('on'); scrim.classList.add('on');
 setTimeout(()=>{const f=drawer.querySelector('input');f&&f.focus();},250);
}
function closeDrawer(){drawer.classList.remove('on');scrim.classList.remove('on');D=null;}
function drawHTML(){
 const s=curSup(); const x=D.edit?by[D.edit]:null;
 const direct=can('direct');
 const title=x?'تعديل بيانات '+esc(x.n):D.founder?'إضافة الجد المؤسس':'إضافة فرد جديد';
 const canDel=x&&can('del')&&!x.kids.length;
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">${title}</h3><div class="sub" style="margin-top:4px">${D.founder?'أول اسم في الشجرة، وكل الفروع تنطلق منه':s?'ضمن فرع '+esc(short(s.scope_root,2)):'أي مكان في الشجرة'}</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <form class="db" id="mf" novalidate onsubmit="return false">
  ${x?`<div class="chosen">${avatar(x.id)}<span>${esc(fullName(x.id))}<small>الجيل ${gen(x.id)}</small></span></div>`:D.founder?'':`
  <div class="f"><span class="lb">الأب</span>
   ${D.father?`<div class="chosen">${avatar(D.father,30)}<span>${esc(short(D.father,4))}<small>الجيل ${gen(D.father)} · ${by[D.father].kids.length} أبناء حاليًا</small></span><button class="btn sm" type="button" data-act="clearFather">تغيير</button></div>`:
   `<div class="pick"><input class="inp" id="fq" type="search" autocomplete="off" placeholder="اكتب اسم الأب ونسبه، مثل: سعد بن فهد" aria-label="ابحث عن الأب"><div class="opts" id="fo"></div></div><span class="h">${s?'تظهر لك أسماء فرعك فقط':'ابحث في كل العائلة'}</span>`}
   <span class="err" id="eF">اختر الأب من القائمة</span></div>`}
  <div class="row2">
   <div class="f"><label for="nm">الاسم الأول</label><input class="inp" id="nm" maxlength="40" value="${x?esc(x.n):''}" placeholder="مثال: عبدالله"><span class="err" id="eN">اكتب الاسم</span></div>
   <div class="f"><span class="lb">الجنس</span><div class="segm" data-seg="g"><button type="button" class="${D.g==='m'?'on':''}" data-v="m">ذكر</button><button type="button" class="${D.g==='f'?'on':''}" data-v="f">أنثى</button></div></div>
  </div>
  <div class="row2">
   <div class="f"><label for="by">سنة الميلاد <span class="sub">(اختياري)</span></label><input class="inp" id="by" inputmode="numeric" value="${x&&x.b?x.b:''}" placeholder="مثال: 1995"><span class="err" id="eB">سنة غير منطقية</span></div>
   <div class="f"><span class="lb">الحالة</span><div class="segm" data-seg="status"><button type="button" class="${D.status==='alive'?'on':''}" data-v="alive">حي</button><button type="button" class="${D.status==='dead'?'on':''}" data-v="dead">متوفى</button></div></div>
  </div>
  ${D.status==='dead'?`<div class="f"><label for="dy">سنة الوفاة <span class="sub">(اختياري)</span></label><input class="inp" id="dy" inputmode="numeric" value="${x&&x.d?x.d:''}" placeholder="مثال: 2020"><span class="err" id="eD">سنة الوفاة غير منطقية</span></div>`:''}
  <div class="f"><label for="ph">رقم الجوال <span class="sub">(اختياري، لا يظهر في الموقع)</span></label><input class="inp" id="ph" inputmode="tel" maxlength="20" value="${x?esc(x.ph):''}" placeholder="05XXXXXXXX"></div>
  <div class="f"><span class="lb">من يرى هذا الفرد</span><div class="segm" data-seg="vis"><button type="button" class="${D.vis==='public'?'on':''}" data-v="public">الجميع</button><button type="button" class="${D.vis==='staff'?'on':''}" data-v="staff">المشرفون فقط</button></div>${D.vis==='staff'?'<span class="h">لن يظهر هو ولا ذريته في الموقع العام.</span>':D.g==='f'&&!SET.show_women?'<span class="h">أسماء البنات مخفية حاليًا عن الموقع العام من إعدادات الخصوصية.</span>':''}</div>
  <div class="f"><label for="nt">ملاحظة داخلية <span class="sub">(اختياري)</span></label><textarea class="inp" id="nt" maxlength="1000" placeholder="مصدر المعلومة، أو أي توضيح">${x?esc(x.nt):''}</textarea></div>
  <div class="preview" id="pv"></div>
  ${!direct&&!x?`<div class="note" style="background:var(--goldbg);color:#5E4716">${ic('info',18,'#8A6A26')}<span>بما أن صلاحية النشر المباشر غير مفعّلة لك، سيُرسل هذا الطلب للمدير العام للاعتماد ويظهر في الشجرة بعدها.</span></div>`:''}
 </form>
 <div class="df"><button class="btn p" type="button" data-act="save" ${D.busy?'disabled':''}>${D.busy?'جارٍ الحفظ…':x?'حفظ التعديلات':direct?'إضافة للشجرة':'إرسال للاعتماد'}</button><button class="btn" type="button" data-act="close">إلغاء</button>
 ${canDel?`<button class="btn no" type="button" data-act="del" style="margin-inline-start:auto">${ic('trash',15)}${D.delArm?'اضغط مرة ثانية للتأكيد':'حذف'}</button>`:x&&can('del')&&x.kids.length?'<span class="sub" style="margin-inline-start:auto">لا يمكن حذف من له أبناء</span>':''}</div>`;
 bindDrawer(); preview();
}
function preview(){const pv=document.getElementById('pv');if(!pv||!D)return;const n=((document.getElementById('nm')||{}).value||'').trim();const f=D.edit?by[D.edit].p:D.father;
 if(D.founder){pv.innerHTML=`سيظهر في أعلى الشجرة باسم:<br><b>${esc(n||'…')}</b> · الجد المؤسس`;return;}
 pv.innerHTML=f&&by[f]?`سيظهر في الشجرة باسم:<br><b>${esc(n||'…')} ${D.g==='f'?'بنت':'بن'} ${esc(fullName(f).split(' بن ').slice(0,4).join(' بن '))}</b> · الجيل ${gen(f)+1}`:D.edit?`<b>${esc(n||'…')}</b> · الجد المؤسس`:'اختر الأب لترى كيف سيظهر الاسم في الشجرة.';}
function bindDrawer(){
 drawer.querySelectorAll('[data-seg]').forEach(sg=>sg.onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=sg.dataset.seg;const keep=collect();D[k]=b.dataset.v;drawHTML();restore(keep);});
 const nm=document.getElementById('nm');if(nm)nm.oninput=preview;
 const fq=document.getElementById('fq'),fo=document.getElementById('fo');
 if(fq){fq.oninput=()=>{const v=norm(fq.value);if(!v){fo.classList.remove('on');return;}
  const res=P.filter(x=>x.g!=='f'&&inScope(x.id)&&norm(fullName(x.id)).includes(v)).sort((a,b)=>gen(a.id)-gen(b.id)).slice(0,10);
  fo.innerHTML=res.length?res.map(x=>`<button type="button" class="opt" data-father="${x.id}">${avatar(x.id)}<span>${esc(x.n)}<small>${esc(fullName(x.id).split(' بن ').slice(1,5).join(' بن ')||'الجد المؤسس')} · ج${gen(x.id)}</small></span></button>`).join(''):'<div class="empty" style="padding:14px">لا يوجد اسم مطابق'+(curSup()?' في فرعك':'')+'</div>';fo.classList.add('on');};}
}
function collect(){const g=id=>{const e=document.getElementById(id);return e?e.value:undefined;};return {nm:g('nm'),by:g('by'),dy:g('dy'),ph:g('ph'),nt:g('nt')};}
function restore(v){Object.entries(v).forEach(([k,val])=>{const e=document.getElementById(k);if(e&&val!==undefined)e.value=val;});preview();}
const toYear=v=>{v=String(v||'').trim().replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));return v===''?null:(/^\d{4}$/.test(v)?+v:NaN);};
async function saveMember(){
 if(!D||D.busy)return;
 const v=collect(); let ok=true;
 const show=(id,on)=>{const e=document.getElementById(id);if(e)e.classList.toggle('on',on);if(on)ok=false;};
 const nm=(v.nm||'').trim(); show('eN',!nm);
 const fth=D.edit?by[D.edit].p:D.father;
 if(!D.edit&&!D.founder)show('eF',!fth);
 const yr=toYear(v.by); const fb=fth&&by[fth]?by[fth].b:null;
 show('eB',Number.isNaN(yr)||(yr!=null&&(yr<1600||yr>YEAR||(fb&&yr<fb+12))));
 const dyr=D.status==='dead'?toYear(v.dy):null;
 if(D.status==='dead')show('eD',Number.isNaN(dyr)||(dyr!=null&&(dyr<1600||dyr>YEAR||(yr&&dyr<yr))));
 if(!ok)return;
 const row={first_name:nm,gender:D.g,birth_year:yr,death_year:D.status==='dead'?dyr:null,is_dead:D.status==='dead',visibility:D.vis,phone:(v.ph||'').trim()||null,notes:(v.nt||'').trim()||null};
 D.busy=true;drawHTML();restore(v);
 try{
  if(D.edit){
   const {error}=await SB.from('persons').update(row).eq('id',D.edit);if(error)throw error;
   S.fresh=D.edit;closeDrawer();await refresh();toast('تم حفظ التعديلات');return;
  }
  if(D.founder||can('direct')){
   const {data,error}=await SB.from('persons').insert({...row,father_id:D.founder?null:fth,created_by_name:myName()}).select('id').single();if(error)throw error;
   const wasFounder=D.founder;
   S.fresh=data.id;S.view='members';S.q='';closeDrawer();await refresh();
   toast(wasFounder?`تمت إضافة ${nm} جدًّا مؤسسًا للشجرة`:`تمت إضافة ${nm} ${row.gender==='f'?'بنت':'بن'} ${by[fth]?by[fth].n:''} للشجرة`);return;
  }
  const {error}=await SB.from('requests').insert({kind:'add',father_id:fth,payload:{name:nm,gender:D.g,birth_year:yr,death_year:row.death_year,note:row.notes},submitter_name:myName(),source:'supervisor',submitted_by_email:ME.email,status:'pending'});if(error)throw error;
  S.view='requests';S.rqTab='all';closeDrawer();await refresh();toast('أُرسل الطلب للمدير العام للاعتماد');
 }catch(e){if(D){D.busy=false;drawHTML();restore(v);}toast(errMsg(e),true);}
}
async function deleteMember(){
 if(!D||!D.edit)return;
 if(!D.delArm){const keep=collect();D.delArm=true;drawHTML();restore(keep);return;}
 const x=by[D.edit];
 try{const {error}=await SB.from('persons').delete().eq('id',x.id);if(error)throw error;closeDrawer();await refresh();toast('تم حذف '+x.n);}
 catch(e){toast(errMsg(e),true);}
}

/* ================= drawer: supervisor ================= */
function drawSup(){
 if(!D.pp)D.pp={can_add:true,can_edit:true,can_delete:false,can_publish:!!SET.supervisors_direct_default};
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">تعيين مشرف فرع</h3><div class="sub" style="margin-top:4px">يدير المشرف فرعًا واحدًا فقط بالصلاحيات التي تحددها</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <div class="db">
  <div class="f"><label for="spn">1. اسم المشرف</label><input class="inp" id="spn" maxlength="80" value="${esc(D.spn||'')}" placeholder="مثال: خالد بن سعد"><span class="err" id="eS">اكتب اسم المشرف</span></div>
  <div class="f"><label for="spe">بريده الإلكتروني</label><input class="inp" id="spe" type="email" dir="ltr" value="${esc(D.spe||'')}" placeholder="name@example.com"><span class="h">يدخل به المشرف للوحة التحكم بعد إنشاء حسابه.</span><span class="err" id="eE">اكتب بريدًا صحيحًا</span></div>
  <div class="f"><span class="lb">2. على أي فرع يشرف؟</span>
   ${D.sc?`<div class="chosen">${avatar(D.sc,30)}<span>فرع ${esc(short(D.sc,3))}<small>${scopeSize(D.sc)} فردًا تحت هذا الفرع</small></span><button class="btn sm" type="button" data-act="clrSc">تغيير</button></div>`:
   `<div class="chips" style="display:flex;flex-wrap:wrap;gap:8px">${B.map(b=>`<button type="button" class="btn sm" data-sc="${b}"><i class="dot" style="background:${colorOf(b)}"></i>فرع ${esc(by[b].n)} <span class="sub">${scopeSize(b)}</span></button>`).join('')}</div>
    <div class="pick"><input class="inp" id="scq" type="search" autocomplete="off" placeholder="أو ابحث عن فرع أصغر بالاسم والنسب" aria-label="ابحث عن فرع"><div class="opts" id="sco"></div></div>`}
   <span class="err" id="eC">اختر الفرع</span></div>
  <div class="f"><span class="lb">3. الصلاحيات</span><div class="checks">
   ${[['can_add','إضافة أفراد'],['can_edit','تعديل البيانات'],['can_delete','حذف أفراد'],['can_publish','نشر مباشر بدون اعتمادي']].map(([k,t])=>`<div class="perm"><span>${t}</span><button type="button" class="sw" role="switch" aria-checked="${D.pp[k]}" data-pp="${k}" aria-label="${t}"></button></div>`).join('')}
  </div></div>
 </div>
 <div class="df"><button class="btn p" type="button" data-act="saveSup" ${D.busy?'disabled':''}>${D.busy?'جارٍ الحفظ…':'تعيين المشرف'}</button><button class="btn" type="button" data-act="close">إلغاء</button></div>`;
 const i=document.getElementById('scq'),o=document.getElementById('sco');
 if(i)i.oninput=()=>{const v=norm(i.value);if(!v){o.classList.remove('on');return;}
  const res=P.filter(x=>x.g!=='f'&&norm(fullName(x.id)).includes(v)).sort((a,b)=>gen(a.id)-gen(b.id)).slice(0,10);
  o.innerHTML=res.length?res.map(x=>`<button type="button" class="opt" data-sc="${x.id}">${avatar(x.id)}<span>فرع ${esc(x.n)} (${scopeSize(x.id)})<small>${esc(fullName(x.id).split(' بن ').slice(1,4).join(' بن ')||'الجد المؤسس')} · ج${gen(x.id)}</small></span></button>`).join(''):'<div class="empty" style="padding:14px">لا توجد نتائج</div>';o.classList.add('on');};
}
function keepSup(){const n=document.getElementById('spn'),e=document.getElementById('spe');if(n)D.spn=n.value;if(e)D.spe=e.value;}
async function saveSup(){
 keepSup();let ok=true;const e=(id,on)=>{document.getElementById(id).classList.toggle('on',on);if(on)ok=false;};
 const name=(D.spn||'').trim(), email=(D.spe||'').trim().toLowerCase();
 e('eS',!name);e('eE',!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));e('eC',!D.sc);if(!ok)return;
 D.busy=true;drawSup();
 try{const {error}=await SB.from('staff').insert({email,display_name:name,role:'supervisor',scope_root:D.sc,...D.pp});if(error)throw error;
  closeDrawer();S.view='sups';await refresh();toast(`تم تعيين ${name}. أرسل له رابط لوحة التحكم ليُنشئ حسابه بنفس البريد`);}
 catch(err){if(D){D.busy=false;drawSup();}toast(/duplicate key|staff_email_key/.test(err.message||'')?'هذا البريد مسجّل لمشرف آخر':errMsg(err),true);}
}

/* ================= site online / offline + preview ================= */
function modeMsg(){return {type:'site-mode',online:SET.online!==false,msg:SET.maintenance_msg||'',back:SET.back_text||'',viewer:S.pvViewer};}
function postTo(fr){try{fr&&fr.contentWindow&&fr.contentWindow.postMessage(modeMsg(),location.origin);}catch(_){}}
function renderPill(){const p=document.getElementById('sitePill');const o=SET.online!==false;p.className='spill '+(o?'on':'off');p.querySelector('span').textContent=o?'الموقع منشور':'الموقع متوقف';p.title=o?'الموقع ظاهر للعائلة':'الزوار يشوفون صفحة الصيانة';}
document.getElementById('sitePill').onclick=()=>{if(!isAdmin()){toast(SET.online!==false?'الموقع منشور للعائلة':'الموقع متوقف حاليًا من المدير العام');return;}S.view='site';render();window.scrollTo({top:0});};
const pvSrc=()=>'index.html?as='+S.pvViewer;
function vSite(){
 const o=SET.online!==false;
 const cap=!o&&S.pvViewer==='visitor'?'هذا ما يشوفه أي قريب يفتح الموقع الآن.':!o?'أنت تشوف الموقع كمدير رغم إيقافه، مع شريط تنبيه في الأعلى.':'هذا الموقع كما يظهر للعائلة الآن. جرّب تتصفح داخل المعاينة.';
 return `<div class="ph"><div><h1>الموقع والنشر</h1><p>تحكم في ظهور الموقع للعائلة، وعاينه قبل وبعد أي تغيير</p></div>
  <div class="sp"><a class="btn" href="index.html" target="_blank" rel="noopener">${ic('globe')}فتح الموقع</a><button class="btn" type="button" data-act="fullPv">${ic('eye')}معاينة بملء الشاشة</button></div></div>
 <section class="card hero-st">
  <span class="ic big" style="background:${o?'#E7EBDA':'#F6E1DA'}">${ic(o?'globe':'power',26,o?'#3E4A24':'#A3412C')}</span>
  <div style="flex:1 1 260px"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px"><b style="font-size:20px">${o?'الموقع منشور':'الموقع متوقف مؤقتًا'}</b><span class="badge ${o?'b-ok':'b-red'}">${o?'أونلاين':'أوفلاين'}</span></div>
  <div class="sub" style="margin-top:6px;line-height:1.7">${o?'أي أحد معه الرابط يقدر يتصفح الشجرة الآن.':'الزوار يشوفون صفحة الصيانة. '+(SET.allow_supervisors?'المشرفون والمدير يدخلون عادي.':'المدير العام فقط يقدر يدخل.')} آخر تغيير: ${esc(ago(SET.changed_at))}</div></div>
  <button class="btn ${o?'no':'p'}" type="button" data-act="${o?'goOff':'goOn'}">${ic('power',17)}${o?'إيقاف الموقع مؤقتًا':'إعادة نشر الموقع'}</button>
 </section>
 <section class="card" style="margin-top:18px">
  <div class="pvbar"><h2 style="margin-inline-end:auto">المعاينة</h2>
   <div class="tabs" role="tablist" aria-label="المعاينة كـ"><button type="button" class="tab ${S.pvViewer==='visitor'?'on':''}" data-pvv="visitor">كما يراه الزائر</button><button type="button" class="tab ${S.pvViewer==='admin'?'on':''}" data-pvv="admin">كما يراه المدير</button></div>
   <div class="tabs" role="tablist" aria-label="الجهاز"><button type="button" class="tab ${S.pvDev==='d'?'on':''}" data-pvd="d">كمبيوتر</button><button type="button" class="tab ${S.pvDev==='m'?'on':''}" data-pvd="m">جوال</button></div>
  </div>
  <div class="pv-wrap">${S.pvDev==='m'?`<div class="pv-phone"><iframe id="pvf" src="${pvSrc()}" title="معاينة الموقع على الجوال"></iframe></div>`:`<div class="pv-desk"><div class="chrome"><i></i><i></i><i></i><span>${esc(location.host)}</span></div><div class="vp" id="pvVp"><iframe id="pvf" src="${pvSrc()}" title="معاينة الموقع على الكمبيوتر"></iframe></div></div>`}</div>
  <div class="sub" style="padding:12px 18px">${cap}</div>
 </section>
 <section class="card" style="margin-top:18px;max-width:820px">
  <div class="ch"><h2>رسالة صفحة الصيانة</h2><span class="sub" id="msgState" style="margin-inline-start:auto">تُحفظ تلقائيًا</span></div>
  <div class="db" style="padding:18px">
   <div class="f"><label for="smsg">النص الذي يظهر للزوار</label><textarea class="inp" id="smsg">${esc(SET.maintenance_msg||'')}</textarea></div>
   <div class="f"><label for="sback">موعد العودة المتوقع <span class="sub">(اختياري)</span></label><input class="inp" id="sback" value="${esc(SET.back_text||'')}" placeholder="مثال: يوم الخميس مساءً"></div>
   <div class="perm"><span>السماح للمشرفين بالدخول أثناء الإيقاف<small>يكملون إضافة أفراد فروعهم والموقع مقفل على الباقين</small></span><button type="button" class="sw" role="switch" aria-checked="${!!SET.allow_supervisors}" aria-label="السماح للمشرفين بالدخول" data-act="allowSups"></button></div>
  </div>
 </section>`;
}
async function saveSettings(patch,okMsg){
 const prev={...SET};Object.assign(SET,patch);
 const {data,error}=await SB.from('site_settings').update(patch).eq('id',1).select().maybeSingle();
 if(error||!data){SET=prev;toast(error?errMsg(error):'ليست لديك صلاحية لهذا الإجراء',true);return false;}
 SET=data;if(okMsg)toast(okMsg);return true;
}
function fitDesk(){const vp=document.getElementById('pvVp');if(!vp)return;const f=vp.querySelector('iframe');const k=vp.clientWidth/1280;f.style.transform=`scale(${k})`;f.style.height=(vp.clientHeight/k)+'px';}
let msgT=null;
function setupPreview(){
 const f=document.getElementById('pvf');if(!f)return;
 f.addEventListener('load',()=>{postTo(f);setTimeout(()=>postTo(f),400);});
 fitDesk();
 const m=document.getElementById('smsg'),b=document.getElementById('sback'),st=document.getElementById('msgState');
 const live=()=>{SET.maintenance_msg=m.value;SET.back_text=b.value;postTo(document.getElementById('pvf'));st.textContent='جارٍ الحفظ…';
  clearTimeout(msgT);msgT=setTimeout(async()=>{const ok=await saveSettings({maintenance_msg:m.value,back_text:b.value});const s2=document.getElementById('msgState');if(s2)s2.textContent=ok?'تم الحفظ':'لم يُحفظ';},700);};
 if(m)m.oninput=live; if(b)b.oninput=live;
}
window.addEventListener('resize',fitDesk);
function goOffDrawer(){
 D={mode:'off'};
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">إيقاف الموقع مؤقتًا</h3><div class="sub" style="margin-top:4px">بيانات العائلة ما تتأثر، فقط يختفي الموقع عن الزوار</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <div class="db">
  <div class="f"><label for="omsg">الرسالة التي تظهر للزوار</label><textarea class="inp" id="omsg">${esc(SET.maintenance_msg||'')}</textarea></div>
  <div class="f"><label for="oback">موعد العودة المتوقع <span class="sub">(اختياري)</span></label><input class="inp" id="oback" value="${esc(SET.back_text||'')}" placeholder="مثال: بعد صلاة الجمعة"></div>
  <div class="perm"><span>السماح للمشرفين بالدخول أثناء الإيقاف<small>المدير العام يدخل دائمًا</small></span><button type="button" class="sw" role="switch" aria-checked="${!!SET.allow_supervisors}" aria-label="السماح للمشرفين بالدخول" id="oSup"></button></div>
  <div class="note" style="background:var(--redbg);color:#7A2E1E">${ic('info',18,'#A3412C')}<span>بمجرد الإيقاف، أي أحد يفتح الموقع يشوف صفحة الصيانة بدل الشجرة. تقدر ترجعه بضغطة من نفس المكان.</span></div>
 </div>
 <div class="df"><button class="btn p" type="button" data-act="confirmOff" style="background:#A3412C;border-color:#A3412C">${ic('power',17)}إيقاف الآن</button><button class="btn" type="button" data-act="close">إلغاء</button></div>`;
 D.allow=!!SET.allow_supervisors;
 document.getElementById('oSup').onclick=e=>{D.allow=!D.allow;e.currentTarget.setAttribute('aria-checked',D.allow);};
 drawer.classList.add('on');scrim.classList.add('on');
}
const fpv=document.createElement('div');fpv.className='fpv';fpv.setAttribute('role','dialog');fpv.setAttribute('aria-label','معاينة الموقع بملء الشاشة');document.body.appendChild(fpv);
function openFull(){
 fpv.className='fpv on'+(S.pvDev==='m'?' m':'');
 fpv.innerHTML=`<div class="bar"><b style="margin-inline-end:auto">معاينة الموقع · ${SET.online!==false?'منشور':'متوقف'}</b>
  <div class="tabs"><button type="button" class="tab ${S.pvViewer==='visitor'?'on':''}" data-fv="visitor">زائر</button><button type="button" class="tab ${S.pvViewer==='admin'?'on':''}" data-fv="admin">مدير</button></div>
  <div class="tabs"><button type="button" class="tab ${S.pvDev==='d'?'on':''}" data-fd="d">كمبيوتر</button><button type="button" class="tab ${S.pvDev==='m'?'on':''}" data-fd="m">جوال</button></div>
  <button class="btn sm" type="button" data-act="closeFull">إغلاق المعاينة</button></div>
  <div class="stagep"><iframe id="fpf" src="${pvSrc()}" title="معاينة الموقع"></iframe></div>`;
 const f=document.getElementById('fpf');f.addEventListener('load',()=>{postTo(f);setTimeout(()=>postTo(f),400);});
}
fpv.addEventListener('click',e=>{const t=e.target.closest('[data-fv],[data-fd],[data-act="closeFull"]');if(!t)return;
 if(t.dataset.fv){S.pvViewer=t.dataset.fv;openFull();return;}
 if(t.dataset.fd){S.pvDev=t.dataset.fd;openFull();return;}
 fpv.className='fpv';fpv.innerHTML='';if(S.view==='site')render();});

/* ================= global events ================= */
scrim.onclick=closeDrawer;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(fpv.classList.contains('on')){fpv.className='fpv';fpv.innerHTML='';}else if(D)closeDrawer();}});
document.addEventListener('click',async e=>{
 if(!ME)return;
 const t=e.target.closest('[data-view],[data-act],[data-edit],[data-addchild],[data-ok],[data-no],[data-rqtab],[data-perm],[data-set],[data-rmsup],[data-father],[data-sc],[data-pp],[data-pvv],[data-pvd]');
 if(!t||fpv.contains(t))return;
 const d=t.dataset;
 if(d.view){S.view=d.view;render();window.scrollTo({top:0});return;}
 if(d.father){const keep=collect();D.father=+d.father;drawHTML();restore(keep);return;}
 if(d.sc){keepSup();D.sc=+d.sc;drawSup();return;}
 if(d.pp){D.pp[d.pp]=!D.pp[d.pp];t.setAttribute('aria-checked',D.pp[d.pp]);return;}
 if(d.edit){openDrawer('edit',{id:+d.edit});return;}
 if(d.addchild){openDrawer('add',{father:+d.addchild});return;}
 if(d.rqtab){S.rqTab=d.rqtab;render();return;}
 if(d.pvv){S.pvViewer=d.pvv;render();return;}
 if(d.pvd){S.pvDev=d.pvd;render();return;}
 if(d.rmsup){
  if(t.dataset.armed!=='1'){t.dataset.armed='1';t.textContent='اضغط مرة ثانية لتأكيد الإلغاء';return;}
  const {error}=await SB.from('staff').delete().eq('id',+d.rmsup);if(error){toast(errMsg(error),true);return;}
  await refresh();toast('أُلغي الإشراف');return;}
 if(d.perm){const [sid,k]=d.perm.split(':');const s=SUPS.find(x=>x.id===+sid);if(!s)return;const patch={[k]:!s[k]};if(k==='can_add'&&s[k])patch.can_publish=false;
  const {error}=await SB.from('staff').update(patch).eq('id',s.id);if(error){toast(errMsg(error),true);return;}await refresh();toast('تم تحديث الصلاحيات');return;}
 if(d.set){const ok=await saveSettings({[d.set]:!SET[d.set]},'تم حفظ الإعداد');if(ok)t.setAttribute('aria-checked',!!SET[d.set]);return;}
 if(d.ok||d.no){
  t.disabled=true;
  const {data,error}=await SB.rpc(d.ok?'approve_request':'reject_request',{p_id:+(d.ok||d.no)});
  if(error){t.disabled=false;toast(errMsg(error),true);return;}
  if(d.ok&&data&&data.person_id)S.fresh=data.person_id;
  await refresh();toast(d.ok?'تم اعتماد الطلب':'تم رفض الطلب');return;}
 const a=d.act;
 if(a==='add'){openDrawer('add');return;}
 if(a==='addSup'){D={mode:'sup'};drawSup();drawer.classList.add('on');scrim.classList.add('on');return;}
 if(a==='close'){closeDrawer();return;}
 if(a==='save'){saveMember();return;}
 if(a==='del'){deleteMember();return;}
 if(a==='saveSup'){saveSup();return;}
 if(a==='clearFather'){const keep=collect();D.father=null;drawHTML();restore(keep);return;}
 if(a==='clrSc'){keepSup();D.sc=null;drawSup();return;}
 if(a==='more'){S.limit+=25;render();return;}
 if(a==='saveFam'){const v=document.getElementById('famIn').value.trim();if(!v){toast('اكتب اسم العائلة',true);return;}await saveSettings({family_name:v},'تم حفظ اسم العائلة');return;}
 if(a==='saveMe'){const v=document.getElementById('meIn').value.trim();if(!v){toast('اكتب اسمك',true);return;}
  const {error}=await SB.from('staff').update({display_name:v}).eq('id',ME.id);if(error){toast(errMsg(error),true);return;}ME.display_name=v;setMe();toast('تم حفظ اسمك');render();return;}
 if(a==='goOff'){goOffDrawer();return;}
 if(a==='confirmOff'){const patch={online:false,maintenance_msg:document.getElementById('omsg').value,back_text:document.getElementById('oback').value,allow_supervisors:D.allow};
  const ok=await saveSettings(patch,'تم إيقاف الموقع. الزوار يشوفون صفحة الصيانة الآن');if(ok){S.pvViewer='visitor';closeDrawer();S.view='site';await refresh();}return;}
 if(a==='goOn'){const ok=await saveSettings({online:true},'الموقع منشور من جديد');if(ok)await refresh();return;}
 if(a==='fullPv'){openFull();return;}
 if(a==='allowSups'){const ok=await saveSettings({allow_supervisors:!SET.allow_supervisors},'تم حفظ الإعداد');if(ok)t.setAttribute('aria-checked',!!SET.allow_supervisors);return;}
});

/* ================= auth gate ================= */
const gate=document.getElementById('gate');
function setMe(){document.getElementById('meNm').textContent=ME?(ME.display_name+(isAdmin()?' · المدير العام':' · مشرف')):'';document.getElementById('meAv').textContent=ME?(ME.display_name||'م')[0]:'';}
function showGate(html){gate.innerHTML=`<div class="gbox card"><div class="glogo"><svg width="44" height="44" viewBox="0 0 36 36" fill="none" stroke="#4F5D2F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 33V17"/><path d="M18 22l-6-5"/><path d="M18 19l6-5"/><circle cx="18" cy="9" r="4"/><circle cx="9" cy="14" r="3"/><circle cx="27" cy="11" r="3"/><path d="M11 33h14"/></svg><b>شجرتنا</b><span>لوحة التحكم</span></div>${html}</div>`;gate.hidden=false;document.body.classList.add('gated');}
function hideGate(){gate.hidden=true;gate.innerHTML='';document.body.classList.remove('gated');}
let gMode='in';
function loginForm(msg){
 showGate(`<div class="tabs" style="width:100%;margin-bottom:6px"><button type="button" class="tab ${gMode==='in'?'on':''}" data-g="in" style="flex:1">تسجيل الدخول</button><button type="button" class="tab ${gMode==='up'?'on':''}" data-g="up" style="flex:1">إنشاء حساب</button></div>
 <form id="gf" class="gform" novalidate>
  <div class="f"><label for="ge">البريد الإلكتروني</label><input class="inp" id="ge" type="email" dir="ltr" autocomplete="email" required></div>
  ${gMode==='reset'?'':`<div class="f"><label for="gp">كلمة المرور</label><input class="inp" id="gp" type="password" dir="ltr" autocomplete="${gMode==='up'?'new-password':'current-password'}" required minlength="6">${gMode==='up'?'<span class="h">6 أحرف على الأقل</span>':''}</div>`}
  <div class="gmsg" id="gmsg">${msg||''}</div>
  <button class="btn p" type="submit" style="width:100%;justify-content:center">${gMode==='in'?'دخول':gMode==='up'?'إنشاء الحساب':'إرسال رابط إعادة التعيين'}</button>
  ${gMode==='in'?'<button type="button" class="lnk" data-g="reset" style="margin:0 auto">نسيت كلمة المرور؟</button>':gMode==='reset'?'<button type="button" class="lnk" data-g="in" style="margin:0 auto">رجوع لتسجيل الدخول</button>':'<span class="h" style="text-align:center">للمدير والمشرفين فقط. استخدم البريد الذي سجّله لك المدير.</span>'}
 </form>`);
 gate.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{gMode=b.dataset.g;loginForm();});
 document.getElementById('gf').onsubmit=async ev=>{ev.preventDefault();
  const email=document.getElementById('ge').value.trim().toLowerCase();const pw=(document.getElementById('gp')||{}).value;
  const m=document.getElementById('gmsg');const btn=ev.target.querySelector('button[type=submit]');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){m.textContent='اكتب بريدًا صحيحًا';return;}
  if(gMode!=='reset'&&(!pw||pw.length<6)){m.textContent='كلمة المرور 6 أحرف على الأقل';return;}
  btn.disabled=true;m.textContent='';
  try{
   if(gMode==='in'){const {error}=await SB.auth.signInWithPassword({email,password:pw});if(error)throw error;await boot();}
   else if(gMode==='up'){const {data,error}=await SB.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;
    if(data.session){await boot();}else{gMode='in';loginForm('<span style="color:#3E4A24">أرسلنا رسالة تأكيد إلى '+esc(email)+'. افتحها واضغط الرابط، ثم ارجع هنا وسجّل دخولك.</span>');}}
   else{const {error}=await SB.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;m.innerHTML='<span style="color:#3E4A24">إذا كان البريد مسجّلًا ستصلك رسالة لإعادة تعيين كلمة المرور.</span>';btn.disabled=false;}
  }catch(err){m.textContent=errMsg(err);btn.disabled=false;}
 };
}
function newPasswordForm(){
 showGate(`<form id="np" class="gform" novalidate><h2 style="margin:0;font-size:18px">اختر كلمة مرور جديدة</h2>
  <div class="f"><label for="npw">كلمة المرور الجديدة</label><input class="inp" id="npw" type="password" dir="ltr" autocomplete="new-password" minlength="6"></div>
  <div class="gmsg" id="gmsg"></div><button class="btn p" type="submit" style="width:100%;justify-content:center">حفظ</button></form>`);
 document.getElementById('np').onsubmit=async ev=>{ev.preventDefault();const pw=document.getElementById('npw').value;const m=document.getElementById('gmsg');
  if(pw.length<6){m.textContent='6 أحرف على الأقل';return;}
  const {error}=await SB.auth.updateUser({password:pw});if(error){m.textContent=errMsg(error);return;}await boot();};
}
async function boot(){
 const {data:{session}}=await SB.auth.getSession();
 if(!session){ME=null;loginForm();return;}
 showGate('<div class="empty">جارٍ التحميل…</div>');
 const {data,error}=await SB.rpc('my_staff');
 if(error){showGate(`<div class="gmsg">${esc(errMsg(error))}</div><button class="btn" type="button" id="gout">تسجيل الخروج</button>`);document.getElementById('gout').onclick=signOut;return;}
 if(!data.staff){
  if(!data.has_admin){
   showGate(`<div class="gform"><h2 style="margin:0;font-size:18px">إعداد المدير العام</h2><p class="sub" style="margin:0;line-height:1.8">أنت أول من يدخل للوحة. اكتب اسمك ليظهر في سجل التعديلات، وسيصبح هذا الحساب (<span dir="ltr">${esc(data.email)}</span>) هو المدير العام.</p>
    <div class="f"><label for="cn">اسمك</label><input class="inp" id="cn" maxlength="80" value="محمد"></div><div class="gmsg" id="gmsg"></div>
    <button class="btn p" type="button" id="claim" style="width:100%;justify-content:center">ابدأ كمدير عام</button><button class="lnk" type="button" id="gout" style="margin:0 auto">تسجيل الخروج</button></div>`);
   document.getElementById('gout').onclick=signOut;
   document.getElementById('claim').onclick=async()=>{const {error}=await SB.rpc('claim_admin',{p_name:document.getElementById('cn').value});if(error){document.getElementById('gmsg').textContent=errMsg(error);return;}await boot();};
   return;
  }
  showGate(`<div class="gform"><h2 style="margin:0;font-size:18px">حسابك غير مفعّل بعد</h2><p class="sub" style="margin:0;line-height:1.8">دخلت بالبريد <span dir="ltr">${esc(data.email)}</span>، لكنه غير مسجّل كمشرف. اطلب من المدير العام تعيينك بنفس هذا البريد، ثم حدّث الصفحة.</p><button class="btn" type="button" id="gout">تسجيل الخروج</button></div>`);
  document.getElementById('gout').onclick=signOut;return;
 }
 ME=data.staff;setMe();
 try{await loadAll();}catch(e){showGate(`<div class="gmsg">${esc(errMsg(e))}</div><button class="btn" type="button" id="gretry">إعادة المحاولة</button>`);document.getElementById('gretry').onclick=boot;return;}
 hideGate();render();
}
async function signOut(){await SB.auth.signOut();ME=null;gMode='in';loginForm();}
document.getElementById('logout').onclick=signOut;
SB.auth.onAuthStateChange((ev)=>{if(ev==='PASSWORD_RECOVERY')setTimeout(newPasswordForm,0);});
boot();
})();
