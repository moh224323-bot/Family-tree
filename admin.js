(function(){
'use strict';
const SB = window.supabase.createClient(window.FT_CONFIG.url, window.FT_CONFIG.key);

/* ================= state ================= */
let ME=null;              // staff row of the signed-in user
let P=[], by={}, founder=null, B=[];
let SUPS=[], REQS=[], LOG=[];
let EVS=[], ALB=[], PH={};
let MAR=[];               // marriages (wives)
let INVS=[],RESP=[],INVD={}; // invitations, their responses, cached invitee lists
let TOURS=[];              // tournaments (admin only)
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
const joinN=ids=>ids.filter(i=>by[i]).map(i=>by[i].n).join(' بن ');
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
const wivesOf=id=>MAR.filter(m=>m.husband_id===id).sort((a,b)=>a.wife_order-b.wife_order||a.id-b.id);
const marById=id=>MAR.find(m=>m.id===id);
const wifeName=m=>m?(m.wife_name||(by[m.wife_person_id]?by[m.wife_person_id].n:'زوجة')):'';
const wifeFull=m=>m?wifeName(m)+(m.wife_family?' '+m.wife_family:''):'';
const ORD=['الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة'];
const ordName=n=>ORD[n-1]||('رقم '+n);
const WST={married:'على ذمته',divorced:'مطلّقة',deceased:'متوفاة'};
const curSup=()=>ME&&ME.role==='supervisor'?ME:null;
const scopesOf=s=>s?((s.scopes&&s.scopes.length)?s.scopes:(s.scope_root?[s.scope_root]:[])).filter(r=>by[r]):[];
const inScope=id=>{const s=curSup();if(!s)return true;const a=anc(id);return scopesOf(s).some(r=>a.includes(r));};
const scopeNames=(s,k=2)=>scopesOf(s).map(r=>'فرع '+short(r,k)).join('، ');
const scopeTotal=s=>{const rs=scopesOf(s);return P.filter(x=>{const a=anc(x.id);return rs.some(r=>a.includes(r));}).length;};
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
 trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
 star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
 trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'
};
const ic=(n,s=18,c='currentColor')=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const avatar=(id,size)=>`<span class="av" style="background:${colorOf(id)}${size?`;width:${size}px;height:${size}px`:''}">${by[id]&&by[id].photo?`<img src="${esc(photoUrl(by[id].photo))}" alt="" loading="lazy">`:esc(by[id]?by[id].n[0]:'؟')}</span>`;

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
  SB.rpc('get_family_tree'),
  SB.from('requests').select('*').eq('status','pending').order('created_at',{ascending:false}),
  SB.from('audit_log').select('*').order('created_at',{ascending:false}).limit(300),
  SB.from('site_settings').select('*').eq('id',1).maybeSingle(),
  isAdmin()?SB.from('staff').select('*').order('id'):Promise.resolve({data:[]}),
  isAdmin()?SB.from('staff_scopes').select('*').order('created_at'):Promise.resolve({data:[]}),
  SB.from('events').select('*').order('starts_at',{ascending:false}),
  SB.from('albums').select('*'),
  SB.from('photos').select('*').order('created_at'),
  SB.from('marriages').select('*').order('husband_id').order('wife_order').order('id'),
  isAdmin()?SB.from('invitations').select('*').order('created_at',{ascending:false}):Promise.resolve({data:[]}),
  isAdmin()?SB.from('invitation_responses').select('*').order('updated_at',{ascending:false}):Promise.resolve({data:[]}),
  isAdmin()?SB.from('tournaments').select('*').order('created_at',{ascending:false}):Promise.resolve({data:[]})
 ];
 const [pp,tr,rq,lg,st,sf,scp,ev,al,ph,mr,iv,ir,tu]=await Promise.all(q);
 INVS=iv.error?[]:(iv.data||[]);RESP=ir.error?[]:(ir.data||[]);TOURS=tu.error?[]:(tu.data||[]);
 for(const r of [pp,tr,rq,lg,st,sf,scp,ev,al,ph]) if(r.error) throw r.error;
 MAR=mr.error?[]:(mr.data||[]);
 EVS=ev.data||[];ALB=al.data||[];PH={};(ph.data||[]).forEach(p=>(PH[p.album_id]=PH[p.album_id]||[]).push(p));
 P=[];by={};
 const det={};(pp.data||[]).forEach(r=>det[r.id]=r);
 const base=new Map();(tr.data||[]).forEach(r=>base.set(r.id,r));(pp.data||[]).forEach(r=>base.set(r.id,r));
 base.forEach((t,id)=>{const r=det[id]||t;const x={id,n:r.first_name,p:r.father_id||0,b:r.birth_year,d:r.death_year,dead:!!r.is_dead||r.death_year!=null,g:String(r.gender||'m').trim(),vis:r.visibility||'public',ph:r.phone||'',nt:r.notes||'',by:r.created_by_name||'',at:r.created_at||null,photo:r.photo_path||t.photo_path||null,mom:r.mother_marriage_id||null,bio:r.bio||'',occ:r.occupation||'',kids:[]};P.push(x);by[x.id]=x;});
 P.forEach(x=>{if(x.p&&by[x.p])by[x.p].kids.push(x.id);});
 // siblings: entry order, and those with a known birth year are arranged oldest-first among themselves
// (a sibling without a year keeps his place instead of being pushed to the end)
P.forEach(x=>{const ids=x.kids.slice().sort((a,b)=>a-b);const slots=[],known=[];ids.forEach((id,i)=>{if(by[id].b){slots.push(i);known.push(id);}});known.sort((a,b)=>by[a].b-by[b].b||a-b);slots.forEach((i,j)=>ids[i]=known[j]);x.kids=ids;});
 founder=P.find(x=>!x.p)||null;
 B=founder?founder.kids:[];
 bColor={};B.forEach((c,i)=>bColor[c]=PAL[i%PAL.length]);if(founder)bColor[founder.id]='#4F5D2F';
 REQS=rq.data||[];LOG=lg.data||[];SET=st.data||{};
 SUPS=(sf.data||[]).filter(s=>s.role==='supervisor');
 SUPS.forEach(s=>{s.scopes=(scp.data||[]).filter(x=>x.staff_id===s.id).map(x=>x.root_id);});
}
async function refresh(){try{await loadAll();}catch(e){toast(errMsg(e),true);}render();}

/* ================= nav ================= */
const visibleReqs=()=>REQS.filter(r=>{const t=r.father_id||r.target_id;return by[t]&&inScope(t);});
function renderNav(){
 const admin=isAdmin();
 const items=[['overview','home','نظرة عامة'],['members','users','الأفراد'],['requests','inbox','الطلبات',visibleReqs().length],['events','cal','الفعاليات',EVS.filter(e=>evEnd(e)>=new Date()).length,'g'],['photos','img','الصور'],...(admin?[['invites','star','الدعوات',RESP.filter(r=>r.data_state==='pending').length],['tours','trophy','البطولات',TOURS.filter(t=>!t.archived&&t.status==='open').length,'g'],['site','globe','الموقع والنشر',SET.online===false?'متوقف':0],['sups','shield','المشرفون',SUPS.length,'g']]:[]),['log','clock','سجل التعديلات'],...(admin?[['settings','gear','الخصوصية والإعدادات']]:[])];
 const s=curSup();
 document.getElementById('side').innerHTML=items.map(([k,i,t,c,cl])=>`<button type="button" class="nav ${S.view===k?'on':''}" data-view="${k}">${ic(i)}<span>${t}</span>${c?`<span class="c ${cl||''}">${c}</span>`:''}</button>`).join('')+
 `<div class="sidefoot">${s?`<b>صلاحياتك</b>مشرف على ${esc(scopeNames(s))} (${scopeTotal(s)} فردًا). ${can('direct')?'إضافاتك تُنشر مباشرة.':'إضافاتك تُراجع من المدير قبل النشر.'}`:`<b>المدير العام</b>صلاحيات كاملة على ${P.length} فردًا${B.length?' و'+B.length+' فروع':''}.`}</div>`;
}

/* ================= views ================= */
const main=document.getElementById('main');
function scopeBar(){const s=curSup();return s?`<div class="scopebar">${ic('lock',18,'#8A6A26')}<span>تعمل ضمن ${scopesOf(s).length>1?'فروعك':'فرعك'}: <b>${esc(scopeNames(s,3))}</b> فقط. ${can('direct')?'':'أي إضافة تُرسل للمدير العام للاعتماد.'}</span></div>`:'';}

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
 const roots=s?scopesOf(s):B;
 const bars=roots.filter(b=>by[b]).map(b=>({b,n:scopeSize(b),sp:SUPS.filter(x=>scopesOf(x).some(r=>r===b||anc(r).includes(b)))}));
 const mx=Math.max(1,...bars.map(x=>x.n));
 return `<div class="ph"><div><h1>أهلًا ${esc(myName())}</h1><p>${s?'هذه نظرة على فرعك':'هذه نظرة عامة على '+(SET.family_name&&SET.family_name!=='العائلة'?'شجرة عائلة '+esc(SET.family_name):'شجرة العائلة')}</p></div>
  <div class="sp">${can('add')?`<button class="btn p" type="button" data-act="add">${ic('plus')}إضافة فرد</button>`:''}${isAdmin()?`<button class="btn" type="button" data-act="addSup">${ic('shield')}تعيين مشرف</button>`:''}</div></div>
  ${SET.online===false?`<div class="alert">${ic('power',18,'#A3412C')}<span><b>الموقع متوقف للزوار</b> منذ ${esc(ago(SET.changed_at))}.</span>${isAdmin()?`<button class="btn sm p" type="button" data-act="goOn">إعادة النشر</button>`:''}</div>`:''}
  ${scopeBar()}
  <div class="kpis">
   <div class="card kpi"><span class="l">${ic('users',16)}${s?'أفراد الفرع':'إجمالي الأفراد'}</span><span class="v">${pool.length}</span><span class="d">+${month} خلال 30 يومًا</span></div>
   <div class="card kpi"><span class="l">${ic('inbox',16)}طلبات بانتظار المراجعة</span><span class="v" style="color:#8A6A26">${reqs.length}</span><span class="d" style="color:var(--muted)">${reqs.length?'أقدمها '+esc(ago(reqs[reqs.length-1].created_at)):'لا يوجد'}</span></div>
   <div class="card kpi"><span class="l">${ic('user',16)}على قيد الحياة</span><span class="v">${living}</span><span class="d" style="color:var(--muted)">${pool.length?Math.round(living/pool.length*100):0}٪ من ${s?'الفرع':'العائلة'}</span></div>
   <div class="card kpi"><span class="l">${ic('shield',16)}${s?'صلاحياتك':'المشرفون'}</span><span class="v">${s?[s.can_add,s.can_edit,s.can_delete,s.can_publish].filter(Boolean).length+'/4':SUPS.length}</span><span class="d" style="color:var(--muted)">${s?'إضافة · تعديل · حذف · نشر مباشر':(SUPS.length?'يغطّون '+new Set(SUPS.flatMap(x=>scopesOf(x).map(r=>branchOf(r)))).size+' من '+B.length+' فروع':'لم تعيّن مشرفين بعد')}</span></div>
  </div>
  <div class="grid2" style="margin-bottom:18px">${calCard()}${upcomingCard()}</div>
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
 return P.filter(x=>inScope(x.id)&&(S.branch==='all'||branchOf(x.id)===+S.branch)&&(S.genF==='all'||gen(x.id)===+S.genF)&&(S.status==='all'||(S.status==='alive'?!x.dead:x.dead))&&(!qq||norm(fullName(x.id)).includes(qq)||(x.occ&&norm(x.occ).includes(qq))))
  .sort((a,b)=>(b.id===S.fresh)-(a.id===S.fresh)||new Date(b.at||0)-new Date(a.at||0));
}
function vMembers(){
 if(!founder)return vStart();
 const list=filtered(); const shown=list.slice(0,S.limit); const s=curSup();
 const maxG=Math.max(1,...P.map(x=>gen(x.id)));
 return `<div class="ph"><div><h1>الأفراد</h1><p>${s?'أفراد '+esc(scopeNames(s)):'كل أفراد العائلة'} · ${list.length} نتيجة</p></div>
  <div class="sp">${can('add')?`<button class="btn p" type="button" data-act="add">${ic('plus')}إضافة فرد</button>`:''}</div></div>
  ${scopeBar()}
  <section class="card">
   <div class="tools">
    <label class="search">${ic('search',18,'#736D5F')}<input id="mq" type="search" placeholder="ابحث بالاسم أو النسب أو المهنة، مثل: محمد بن صالح" value="${esc(S.q)}" aria-label="بحث في الأفراد"></label>
    ${s||!B.length?'':`<select class="sel" id="fb" aria-label="الفرع"><option value="all">كل الفروع</option>${B.map(b=>`<option value="${b}" ${S.branch==b?'selected':''}>فرع ${esc(by[b].n)}</option>`).join('')}</select>`}
    <select class="sel" id="fg" aria-label="الجيل"><option value="all">كل الأجيال</option>${Array.from({length:maxG},(_,i)=>i+1).map(g=>`<option value="${g}" ${S.genF==g?'selected':''}>الجيل ${g}</option>`).join('')}</select>
    <select class="sel" id="fs" aria-label="الحالة"><option value="all">الكل</option><option value="alive" ${S.status==='alive'?'selected':''}>الأحياء</option><option value="dead" ${S.status==='dead'?'selected':''}>المتوفون</option></select>
   </div>
   <div class="tw"><table><thead><tr><th>الفرد</th><th>الفرع</th><th>الجيل</th><th>الميلاد</th><th>الحالة</th><th>الأبناء</th><th>أُضيف بواسطة</th><th></th></tr></thead><tbody>
   ${shown.map(x=>`<tr class="${x.id===S.fresh?'new':''}"><td><div class="who">${avatar(x.id)}<span><b>${esc(x.n)}${x.g==='f'?' <span class="badge b-mute" style="height:20px;font-size:11px">أنثى</span>':''}${x.vis==='staff'?' <span class="badge b-gold" style="height:20px;font-size:11px">مخفي</span>':''}${x.bio?' <span class="badge b-blue" style="height:20px;font-size:11px">سيرة</span>':''}</b><span class="sub">${x.occ?'<b style="font-weight:600;color:var(--text)">'+esc(x.occ)+'</b> · ':''}${esc(fullName(x.id).split(' بن ').slice(1,4).join(' بن ')||'الجد المؤسس')}${x.mom&&marById(x.mom)?' · أمه: '+esc(wifeFull(marById(x.mom))):''}${x.g!=='f'&&wivesOf(x.id).length?' · '+wivesOf(x.id).length+(wivesOf(x.id).length===1?' زوجة':' زوجات'):''}</span></span></div></td>
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
 return `<div class="ph"><div><h1>المشرفون والصلاحيات</h1><p>كل مشرف يدير الفروع المحددة له فقط، ولا يعدّل خارجها</p></div>
 ${founder?`<div class="sp"><button class="btn p" type="button" data-act="addSup">${ic('plus')}تعيين مشرف</button></div>`:''}</div>
 <div class="note" style="background:var(--bluebg);color:#24485E;margin-bottom:18px">${ic('info',18,'#2F5D7A')}<span>نطاق المشرف هو الشخص أو الأشخاص الذين تبدأ منهم فروعه، ويقدر يضيف تحت أي واحد من ذريتهم فقط. تقدر تعطي المشرف أكثر من فرع. يدخل المشرف من صفحة لوحة التحكم ببريده الإلكتروني نفسه الذي تسجّله هنا.</span></div>
 ${!SUPS.length?`<section class="card"><div class="empty">${founder?'لم تعيّن أي مشرف بعد.':'أضف الجد المؤسس وفروعه أولًا، ثم عيّن مشرفين عليها.'}</div></section>`:''}
 <div class="sups">${SUPS.map(s=>{const perms=[['can_add','إضافة أفراد','ابن أو بنت تحت أي فرد في فرعه'],['can_edit','تعديل البيانات','الأسماء والتواريخ والحالة'],['can_delete','حذف أفراد','من ليس لهم أبناء فقط'],['can_publish','نشر مباشر','بدون انتظار اعتماد المدير']];
  return `<article class="card sup"><div class="hd"><span class="av" style="background:${colorOf(scopesOf(s)[0])};width:46px;height:46px">${esc((s.display_name||'؟')[0])}</span><div><b>${esc(s.display_name)}</b><span class="sub" style="direction:ltr;display:block;text-align:right">${esc(s.email)}</span></div><span class="badge ${s.last_seen?'b-ok':'b-gold'}" style="margin-inline-start:auto">${s.last_seen?'دخل '+esc(ago(s.last_seen)):'لم يدخل بعد'}</span></div>
  <div class="scope" style="flex-direction:column;align-items:stretch;gap:8px"><div style="display:flex;align-items:center;gap:8px"><span>${scopesOf(s).length>1?'الفروع':'الفرع'}</span><span class="sub" style="margin-inline-start:auto">${scopeTotal(s)} فردًا</span></div>
   ${scopesOf(s).map(r=>`<div style="display:flex;align-items:center;gap:8px"><i class="dot" style="background:${colorOf(r)}"></i><b style="font-weight:600">فرع ${esc(short(r,3))}</b><span class="sub">${scopeSize(r)}</span>${scopesOf(s).length>1?`<button type="button" class="lnk" data-rmscope="${s.id}:${r}" style="margin-inline-start:auto;color:#A3412C">إزالة</button>`:''}</div>`).join('')}
   <button type="button" class="btn sm" data-addscope="${s.id}" style="align-self:flex-start">${ic('plus',15)}إضافة فرع آخر</button></div>
  <div>${perms.map(([k,t,h])=>`<div class="perm"><span>${t}<small>${h}</small></span><button type="button" class="sw" role="switch" aria-checked="${!!s[k]}" aria-label="${t}" data-perm="${s.id}:${k}" ${k!=='can_add'&&k!=='can_edit'&&k!=='can_delete'&&!s.can_add?'disabled':''}></button></div>`).join('')}</div>
  <div class="ft"><button class="lnk" type="button" data-rmsup="${s.id}" style="color:#A3412C;margin:0">إلغاء الإشراف</button></div></article>`;}).join('')}</div>`;
}

function logRows(list){
 const m={add:['plus','#E7EBDA','#3E4A24'],ok:['check','#E7EBDA','#3E4A24'],edit:['edit','#DFEAF1','#2F5D7A'],sup:['shield','#F5EBD3','#6B4F14'],no:['x','#F6E1DA','#A3412C'],perm:['lock','#F5EBD3','#6B4F14']};
 return list.length?list.map(l=>{const t=m[l.kind]||m.edit;return `<div class="li"><span class="ic" style="background:${t[1]}">${ic(t[0],17,t[2])}</span><div class="tx"><b>${esc(l.actor_name)}</b> ${esc(l.action)} <b>${esc(l.target||'')}</b></div><span class="sub">${esc(ago(l.created_at))}</span></div>`;}).join(''):'<div class="empty">لا يوجد نشاط بعد.</div>';
}
function vLog(){return `<div class="ph"><div><h1>سجل التعديلات</h1><p>كل إضافة أو تعديل أو اعتماد يُسجَّل تلقائيًا باسم من قام به، ولا يمكن حذفه</p></div></div>${scopeBar()}<section class="card"><div class="list">${logRows(LOG)}</div></section>`;}

function vSettings(){
 const rows=[['show_women','إظهار أسماء البنات في الشجرة العامة','عند الإيقاف تظهر للمشرفين والمدير فقط'],['show_births','إظهار سنوات الميلاد والوفاة','في الموقع العام'],['show_wives','إظهار أسماء الزوجات (الأمهات) في الموقع العام','عند الإيقاف تظهر للمشرفين والمدير فقط، ولا يظهر للزوار أي شيء عن الأمهات'],['supervisors_direct_default','السماح للمشرفين الجدد بالنشر المباشر','ينطبق على المشرفين الذين تعيّنهم لاحقًا']];
 return `<div class="ph"><div><h1>الخصوصية والإعدادات</h1><p>تحكم في من يرى ماذا</p></div></div>
 <section class="card" style="max-width:760px"><div class="list">${rows.map(([k,t,h])=>`<div class="li"><div class="tx"><b>${t}</b><div class="sub">${h}</div></div><button type="button" class="sw" role="switch" aria-checked="${!!SET[k]}" aria-label="${t}" data-set="${k}"></button></div>`).join('')}</div></section>
 <section class="card" style="max-width:760px;margin-top:18px"><div class="ch"><h2>اسم العائلة</h2></div><div class="db" style="padding:18px"><div class="f"><label for="famIn">اسم العائلة كما يظهر في الموقع</label><input class="inp" id="famIn" maxlength="60" value="${esc(SET.family_name||'')}" placeholder="مثال: آل فلان"></div><div><button class="btn p" type="button" data-act="saveFam">حفظ</button></div></div></section>
 <section class="card" style="max-width:760px;margin-top:18px"><div class="ch"><h2>حسابك</h2></div><div class="db" style="padding:18px"><div class="f"><label for="meIn">اسمك كما يظهر في السجل</label><input class="inp" id="meIn" maxlength="80" value="${esc(myName())}"></div><div><button class="btn" type="button" data-act="saveMe">حفظ الاسم</button></div></div></section>`;
}

function render(){
 if(!ME)return;
 if(!isAdmin()&&['sups','settings','site','invites','tours'].includes(S.view))S.view='overview';
 renderNav();
 const v={tours:vTours,invites:vInvites,site:vSite,events:vEvents,photos:vPhotos,overview:vOverview,members:vMembers,requests:vRequests,sups:vSups,log:vLog,settings:vSettings}[S.view]||vOverview;
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
 if(mode==='edit'){const x=by[opts.id];D.g=x.g;D.status=x.dead?'dead':'alive';D.vis=x.vis||'public';D.mom=x.mom?String(x.mom):'';}
 else D.mom=defaultMom(D.father);
 if(mode==='add'&&!founder)D.founder=true;
 drawHTML(); drawer.classList.add('on'); scrim.classList.add('on');
 setTimeout(()=>{const f=drawer.querySelector('input');f&&f.focus();},250);
}
function defaultMom(f){const w=f?wivesOf(f):[];return w.length===1?String(w[0].id):'';}
function closeDrawer(){drawer.classList.remove('on');scrim.classList.remove('on');D=null;}
function drawHTML(){
 const s=curSup(); const x=D.edit?by[D.edit]:null;
 const direct=can('direct');
 const title=x?'تعديل بيانات '+esc(x.n):D.founder?'إضافة الجد المؤسس':'إضافة فرد جديد';
 const canDel=x&&can('del')&&!x.kids.length;
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">${title}</h3><div class="sub" style="margin-top:4px">${D.founder?'أول اسم في الشجرة، وكل الفروع تنطلق منه':s?'ضمن '+esc(scopeNames(s)):'أي مكان في الشجرة'}</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <form class="db" id="mf" novalidate onsubmit="return false">
  <div class="f"><span class="lb">الصورة <span class="sub">(اختياري)</span></span>
   <div class="pphoto"><span class="pv-av" style="background:${x?colorOf(x.id):'var(--sand)'}">${D.pprev?`<img src="${D.pprev}" alt="">`:(!D.premove&&x&&x.photo)?`<img src="${esc(photoUrl(x.photo))}" alt="">`:ic('user',30,'#8A7F66')}</span>
    <span style="display:flex;flex-wrap:wrap;gap:8px"><label class="btn sm" for="pfile" style="cursor:pointer">${ic('img',15)}${D.pprev||(x&&x.photo&&!D.premove)?'تغيير الصورة':'اختر صورة'}</label><input id="pfile" type="file" accept="image/*" hidden>
    ${D.pprev||(x&&x.photo&&!D.premove)?'<button class="btn sm no" type="button" data-act="rmPhoto">إزالة</button>':''}</span></div>
   <span class="h">تظهر في بطاقة الشخص في الموقع. تُقص على شكل دائرة.</span></div>
  ${x?`<div class="chosen">${avatar(x.id)}<span>${esc(fullName(x.id))}<small>الجيل ${gen(x.id)}</small></span></div>`:D.founder?'':`
  <div class="f"><span class="lb">الأب</span>
   ${D.father?`<div class="chosen">${avatar(D.father,30)}<span>${esc(short(D.father,4))}<small>الجيل ${gen(D.father)} · ${by[D.father].kids.length} أبناء حاليًا</small></span><button class="btn sm" type="button" data-act="clearFather">تغيير</button></div>`:
   `<div class="pick"><input class="inp" id="fq" type="search" autocomplete="off" placeholder="اكتب اسم الأب ونسبه، مثل: سعد بن فهد" aria-label="ابحث عن الأب"><div class="opts" id="fo"></div></div><span class="h">${s?'تظهر لك أسماء فرعك فقط':'ابحث في كل العائلة'}</span>`}
   <span class="err" id="eF">اختر الأب من القائمة</span></div>`}
  ${momPicker(x?x.p:D.father)}
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
  <div class="f"><label for="occ">المهنة <span class="sub">(اختياري، تظهر تحت اسمه في الموقع)</span></label><input class="inp" id="occ" maxlength="60" list="occList" value="${x?esc(x.occ):''}" placeholder="مثال: مهندس مدني، معلم، طبيب، رجل أعمال، طالب، متقاعد"><datalist id="occList">${[...new Set(P.map(p=>p.occ).filter(Boolean))].sort().map(o=>`<option value="${esc(o)}">`).join('')}</datalist></div>
  <div class="f"><label for="bio">السيرة الذاتية <span class="sub">(اختياري، تظهر في بطاقته بالموقع)</span></label><textarea class="inp" id="bio" maxlength="4000" rows="5" style="min-height:120px" placeholder="نبذة عن حياته: مكان الولادة، الدراسة، العمل، المناصب، الإنجازات، مواقف يذكرها أهله…">${x?esc(x.bio):''}</textarea><span class="h" id="bioN">${x&&x.bio?x.bio.length:0} / 4000</span></div>
  <div class="f"><label for="nt">ملاحظة داخلية <span class="sub">(اختياري)</span></label><textarea class="inp" id="nt" maxlength="1000" placeholder="مصدر المعلومة، أو أي توضيح">${x?esc(x.nt):''}</textarea></div>
  ${x&&x.g!=='f'?wivesSummary(x.id):''}
  <div class="preview" id="pv"></div>
  ${!direct&&!x?`<div class="note" style="background:var(--goldbg);color:#5E4716">${ic('info',18,'#8A6A26')}<span>بما أن صلاحية النشر المباشر غير مفعّلة لك، سيُرسل هذا الطلب للمدير العام للاعتماد ويظهر في الشجرة بعدها.</span></div>`:''}
 </form>
 <div class="df"><button class="btn p" type="button" data-act="save" ${D.busy?'disabled':''}>${D.busy?'جارٍ الحفظ…':x?'حفظ التعديلات':direct?'إضافة للشجرة':'إرسال للاعتماد'}</button><button class="btn" type="button" data-act="close">إلغاء</button>
 ${canDel?`<button class="btn no" type="button" data-act="del" style="margin-inline-start:auto">${ic('trash',15)}${D.delArm?'اضغط مرة ثانية للتأكيد':'حذف'}</button>`:x&&can('del')&&x.kids.length?'<span class="sub" style="margin-inline-start:auto">لا يمكن حذف من له أبناء</span>':''}</div>`;
 bindDrawer(); preview();
 const pf=document.getElementById('pfile');
 if(pf)pf.onchange=()=>{const f=pf.files&&pf.files[0];if(!f)return;const keep=collect();if(D.pprev)URL.revokeObjectURL(D.pprev);D.pf=f;D.pprev=URL.createObjectURL(f);D.premove=false;drawHTML();restore(keep);};
}
function momPicker(f){
 if(!f||!by[f])return '';const w=wivesOf(f);
 if(!w.length)return can('edit')&&inScope(f)?`<div class="f"><span class="lb">الأم</span><div class="sub">لم تُسجَّل زوجات لـ ${esc(by[f].n)} بعد. <button class="lnk" type="button" data-wives="${f}" style="margin:0;display:inline">أضف زوجاته</button></div></div>`:'';
 return `<div class="f"><span class="lb">الأم</span><div class="segm wrap" data-seg="mom">${w.map(m=>`<button type="button" class="${D.mom===String(m.id)?'on':''}" data-v="${m.id}">${esc(wifeName(m))}<small>الزوجة ${ordName(m.wife_order)}</small></button>`).join('')}<button type="button" class="${!D.mom?'on':''}" data-v="">غير محدد</button></div>
  ${can('edit')&&inScope(f)?`<button class="lnk" type="button" data-wives="${f}" style="margin:0;text-align:right">إدارة زوجات ${esc(by[f].n)}</button>`:''}</div>`;
}
function wivesSummary(id){
 const w=wivesOf(id);
 return `<div class="f"><span class="lb">الزوجات</span>${w.length?`<div class="list" style="border:1px solid var(--line);border-radius:12px">${w.map(m=>`<div class="li" style="padding:10px 12px"><span class="ic" style="background:var(--goldbg);width:30px;height:30px;font-size:12px;font-weight:700;color:#6B4F14">${m.wife_order}</span><div class="tx"><b>${esc(wifeFull(m))}</b><div class="sub">الزوجة ${ordName(m.wife_order)} · ${WST[m.status]||''} · ${P.filter(c=>c.mom===m.id).length} أبناء</div></div></div>`).join('')}</div>`:'<div class="sub">لا توجد زوجات مسجّلة.</div>'}
  ${can('edit')?`<button class="btn sm" type="button" data-wives="${id}" style="align-self:flex-start">${ic('users',15)}${w.length?'إدارة الزوجات':'إضافة زوجة'}</button>`:''}</div>`;
}
function preview(){const pv=document.getElementById('pv');if(!pv||!D)return;const n=((document.getElementById('nm')||{}).value||'').trim();const f=D.edit?by[D.edit].p:D.father;
 if(D.founder){pv.innerHTML=`سيظهر في أعلى الشجرة باسم:<br><b>${esc(n||'…')}</b> · الجد المؤسس`;return;}
 pv.innerHTML=f&&by[f]?`سيظهر في الشجرة باسم:<br><b>${esc(n||'…')} ${D.g==='f'?'بنت':'بن'} ${esc(fullName(f).split(' بن ').slice(0,4).join(' بن '))}</b> · الجيل ${gen(f)+1}`:D.edit?`<b>${esc(n||'…')}</b> · الجد المؤسس`:'اختر الأب لترى كيف سيظهر الاسم في الشجرة.';}
function bindDrawer(){
 drawer.querySelectorAll('[data-seg]').forEach(sg=>sg.onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=sg.dataset.seg;const keep=collect();D[k]=b.dataset.v;drawHTML();restore(keep);});
 const nm=document.getElementById('nm');if(nm)nm.oninput=preview;
 const bio=document.getElementById('bio');if(bio)bio.oninput=()=>{document.getElementById('bioN').textContent=bio.value.length+' / 4000';};
 const fq=document.getElementById('fq'),fo=document.getElementById('fo');
 if(fq){fq.oninput=()=>{const v=norm(fq.value);if(!v){fo.classList.remove('on');return;}
  const res=P.filter(x=>x.g!=='f'&&inScope(x.id)&&norm(fullName(x.id)).includes(v)).sort((a,b)=>gen(a.id)-gen(b.id)).slice(0,10);
  fo.innerHTML=res.length?res.map(x=>`<button type="button" class="opt" data-father="${x.id}">${avatar(x.id)}<span>${esc(x.n)}<small>${esc(fullName(x.id).split(' بن ').slice(1,5).join(' بن ')||'الجد المؤسس')} · ج${gen(x.id)}</small></span></button>`).join(''):'<div class="empty" style="padding:14px">لا يوجد اسم مطابق'+(curSup()?' في فرعك':'')+'</div>';fo.classList.add('on');};}
}
function collect(){const g=id=>{const e=document.getElementById(id);return e?e.value:undefined;};return {nm:g('nm'),by:g('by'),dy:g('dy'),ph:g('ph'),nt:g('nt'),bio:g('bio'),occ:g('occ')};}
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
 const row={first_name:nm,gender:D.g,birth_year:yr,death_year:D.status==='dead'?dyr:null,is_dead:D.status==='dead',visibility:D.vis,phone:(v.ph||'').trim()||null,notes:(v.nt||'').trim()||null,bio:(v.bio||'').trim()||null,occupation:(v.occ||'').trim()||null};
 const momOk=D.mom&&marById(+D.mom)&&marById(+D.mom).husband_id===fth; if(fth&&wivesOf(fth).length)row.mother_marriage_id=momOk?+D.mom:null;
 D.busy=true;drawHTML();restore(v);
 const oldPhoto=D.edit?by[D.edit].photo:null;let newPhoto=null;
 try{
  if(D.pf){const img=await prepPortrait(D.pf);newPhoto='people/'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)+'.jpg';
   const up=await SB.storage.from('photos').upload(newPhoto,img,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});if(up.error){newPhoto=null;throw up.error;}
   row.photo_path=newPhoto;}
  else if(D.premove)row.photo_path=null;
  const dropOld=()=>{if(oldPhoto&&(newPhoto||D.premove))SB.storage.from('photos').remove([oldPhoto]).catch(()=>{});};
  if(D.edit){
   const {error}=await SB.from('persons').update(row).eq('id',D.edit);if(error)throw error;
   dropOld();S.fresh=D.edit;closeDrawer();await refresh();toast('تم حفظ التعديلات');return;
  }
  if(D.founder||can('direct')){
   const {data,error}=await SB.from('persons').insert({...row,father_id:D.founder?null:fth,created_by_name:myName()}).select('id').single();if(error)throw error;
   const wasFounder=D.founder;
   S.fresh=data.id;S.view='members';S.q='';closeDrawer();await refresh();
   toast(wasFounder?`تمت إضافة ${nm} جدًّا مؤسسًا للشجرة`:`تمت إضافة ${nm} ${row.gender==='f'?'بنت':'بن'} ${by[fth]?by[fth].n:''} للشجرة`);return;
  }
  const {error}=await SB.from('requests').insert({kind:'add',father_id:fth,payload:{name:nm,gender:D.g,birth_year:yr,death_year:row.death_year,note:row.notes,photo_path:newPhoto||undefined,mother_marriage_id:row.mother_marriage_id||undefined,bio:row.bio||undefined,occupation:row.occupation||undefined},submitter_name:myName(),source:'supervisor',submitted_by_email:ME.email,status:'pending'});if(error)throw error;
  S.view='requests';S.rqTab='all';closeDrawer();await refresh();toast('أُرسل الطلب للمدير العام للاعتماد');
 }catch(e){if(newPhoto)SB.storage.from('photos').remove([newPhoto]).catch(()=>{});if(D){D.busy=false;drawHTML();restore(v);}toast(errMsg(e),true);}
}
async function prepPortrait(file){
 let src,w,h;
 try{src=await createImageBitmap(file,{imageOrientation:'from-image'});w=src.width;h=src.height;}
 catch(_){src=await loadImg(file);w=src.naturalWidth;h=src.naturalHeight;}
 const side=Math.min(w,h),sx=(w-side)/2,sy=Math.max(0,(h-side)*0.35),out=Math.min(720,side);
 const c=document.createElement('canvas');c.width=out;c.height=out;const x=c.getContext('2d');x.imageSmoothingQuality='high';
 x.drawImage(src,sx,sy,side,side,0,0,out,out);if(src.close)src.close();
 const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.86));if(!blob)throw new Error('تعذّرت معالجة الصورة');return blob;
}
async function deleteMember(){
 if(!D||!D.edit)return;
 if(!D.delArm){const keep=collect();D.delArm=true;drawHTML();restore(keep);return;}
 const x=by[D.edit];
 try{const {error}=await SB.from('persons').delete().eq('id',x.id);if(error)throw error;if(x.photo)SB.storage.from('photos').remove([x.photo]).catch(()=>{});closeDrawer();await refresh();toast('تم حذف '+x.n);}
 catch(e){toast(errMsg(e),true);}
}

/* ================= drawer: supervisor ================= */
function drawSup(){
 if(!D.pp)D.pp={can_add:true,can_edit:true,can_delete:false,can_publish:!!SET.supervisors_direct_default};
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">تعيين مشرف فرع</h3><div class="sub" style="margin-top:4px">يدير المشرف الفروع التي تختارها فقط، بالصلاحيات التي تحددها</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <div class="db">
  <div class="f"><label for="spn">1. اسم المشرف</label><input class="inp" id="spn" maxlength="80" value="${esc(D.spn||'')}" placeholder="مثال: خالد بن سعد"><span class="err" id="eS">اكتب اسم المشرف</span></div>
  <div class="f"><label for="spe">بريده الإلكتروني</label><input class="inp" id="spe" type="email" dir="ltr" value="${esc(D.spe||'')}" placeholder="name@example.com"><span class="h">يدخل به المشرف للوحة التحكم بعد إنشاء حسابه.</span><span class="err" id="eE">اكتب بريدًا صحيحًا</span></div>
  <div class="f"><span class="lb">2. على أي فروع يشرف؟ <span class="sub">(فرع أو أكثر)</span></span>${scopePicker(D.scs)}<span class="err" id="eC">اختر فرعًا واحدًا على الأقل</span></div>
  <div class="f"><span class="lb">3. الصلاحيات</span><div class="checks">
   ${[['can_add','إضافة أفراد'],['can_edit','تعديل البيانات'],['can_delete','حذف أفراد'],['can_publish','نشر مباشر بدون اعتمادي']].map(([k,t])=>`<div class="perm"><span>${t}</span><button type="button" class="sw" role="switch" aria-checked="${D.pp[k]}" data-pp="${k}" aria-label="${t}"></button></div>`).join('')}
  </div></div>
 </div>
 <div class="df"><button class="btn p" type="button" data-act="saveSup" ${D.busy?'disabled':''}>${D.busy?'جارٍ الحفظ…':'تعيين المشرف'}</button><button class="btn" type="button" data-act="close">إلغاء</button></div>`;
 bindScopeSearch();
}
function scopePicker(sel,excl){
 sel=sel||[];excl=excl||[];
 return `${sel.length?`<div style="display:flex;flex-direction:column;gap:8px">${sel.map(r=>`<div class="chosen">${avatar(r,30)}<span>فرع ${esc(short(r,3))}<small>${scopeSize(r)} فردًا تحت هذا الفرع</small></span><button class="btn sm" type="button" data-unsc="${r}">إزالة</button></div>`).join('')}</div>`:''}
  <div class="chips" style="display:flex;flex-wrap:wrap;gap:8px">${B.filter(b=>!sel.includes(b)&&!excl.includes(b)).map(b=>`<button type="button" class="btn sm" data-sc="${b}">${ic('plus',14)}<i class="dot" style="background:${colorOf(b)}"></i>فرع ${esc(by[b].n)} <span class="sub">${scopeSize(b)}</span></button>`).join('')}</div>
  <div class="pick"><input class="inp" id="scq" type="search" autocomplete="off" placeholder="أو ابحث عن فرع أصغر بالاسم والنسب" aria-label="ابحث عن فرع"><div class="opts" id="sco"></div></div>`;
}
function bindScopeSearch(){
 const i=document.getElementById('scq'),o=document.getElementById('sco');
 if(i)i.oninput=()=>{const v=norm(i.value);if(!v){o.classList.remove('on');return;}
  const ex=D.mode==='scope'?scopesOf(SUPS.find(z=>z.id===D.sid)):[];const res=P.filter(x=>x.g!=='f'&&!(D.scs||[]).includes(x.id)&&!ex.includes(x.id)&&norm(fullName(x.id)).includes(v)).sort((a,b)=>gen(a.id)-gen(b.id)).slice(0,10);
  o.innerHTML=res.length?res.map(x=>`<button type="button" class="opt" data-sc="${x.id}">${avatar(x.id)}<span>فرع ${esc(x.n)} (${scopeSize(x.id)})<small>${esc(fullName(x.id).split(' بن ').slice(1,4).join(' بن ')||'الجد المؤسس')} · ج${gen(x.id)}</small></span></button>`).join(''):'<div class="empty" style="padding:14px">لا توجد نتائج</div>';o.classList.add('on');};
}
function drawAddScope(){
 const s=SUPS.find(x=>x.id===D.sid);
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">إضافة فرع لـ ${esc(s.display_name)}</h3><div class="sub" style="margin-top:4px">يشرف حاليًا على: ${esc(scopeNames(s))}</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <div class="db"><div class="f"><span class="lb">اختر الفرع الجديد</span>${scopePicker(D.scs,scopesOf(s))}<span class="err" id="eC">اختر فرعًا</span></div>
 <div class="note" style="background:var(--bluebg);color:#24485E">${ic('info',18,'#2F5D7A')}<span>نفس صلاحياته الحالية تنطبق على الفرع الجديد.</span></div></div>
 <div class="df"><button class="btn p" type="button" data-act="saveScope" ${D.busy?'disabled':''}>${D.busy?'جارٍ الحفظ…':'إضافة'}</button><button class="btn" type="button" data-act="close">إلغاء</button></div>`;
 bindScopeSearch();
}
const redrawScopes=()=>{if(D.mode==='scope')drawAddScope();else{keepSup();drawSup();}};
function keepSup(){const n=document.getElementById('spn'),e=document.getElementById('spe');if(n)D.spn=n.value;if(e)D.spe=e.value;}
async function saveSup(){
 keepSup();let ok=true;const e=(id,on)=>{document.getElementById(id).classList.toggle('on',on);if(on)ok=false;};
 const name=(D.spn||'').trim(), email=(D.spe||'').trim().toLowerCase();
 e('eS',!name);e('eE',!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));e('eC',!(D.scs&&D.scs.length));if(!ok)return;
 D.busy=true;drawSup();
 try{const {data:st,error}=await SB.from('staff').insert({email,display_name:name,role:'supervisor',scope_root:D.scs[0],...D.pp}).select('id').single();if(error)throw error;
  if(D.scs.length>1){const r=await SB.from('staff_scopes').insert(D.scs.slice(1).map(root_id=>({staff_id:st.id,root_id})));if(r.error)throw r.error;}
  closeDrawer();S.view='sups';await refresh();toast(`تم تعيين ${name}. أرسل له رابط لوحة التحكم ليُنشئ حسابه بنفس البريد`);}
 catch(err){if(D){D.busy=false;drawSup();}toast(/duplicate key|staff_email_key/.test(err.message||'')?'هذا البريد مسجّل لمشرف آخر':errMsg(err),true);}
}

/* ================= wives ================= */
function openWives(hid,back){const prev=D&&D.mode!=='wives'?D:null;D={mode:'wives',hus:hid,w:null,st:'married',busy:false,arm:null,back:back||prev};drawWives();drawer.classList.add('on');scrim.classList.add('on');}
function drawWives(){
 const h=by[D.hus],w=wivesOf(D.hus),cur=D.w?marById(D.w):null;
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">زوجات ${esc(h.n)}</h3><div class="sub" style="margin-top:4px">${esc(short(h.id,4))}</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <div class="db">
  ${w.length?`<div class="list" style="border:1px solid var(--line);border-radius:14px">${w.map((m,i)=>{const kids=P.filter(c=>c.mom===m.id);return `<div class="li" style="padding:12px;align-items:flex-start;flex-wrap:wrap">
   <span class="ic" style="background:var(--goldbg);width:34px;height:34px;font-weight:700;color:#6B4F14">${m.wife_order}</span>
   <div class="tx"><b>${esc(wifeFull(m))}</b><div class="sub">الزوجة ${ordName(m.wife_order)} · ${WST[m.status]||''}</div>
    <div class="sub">${kids.length?'أبناؤها: '+kids.map(c=>esc(c.n)).join('، '):'لا أبناء مرتبطين بها بعد'}</div></div>
   <span style="display:flex;gap:6px">${i>0?`<button class="btn sm" type="button" data-wup="${m.id}" title="تقديمها في الترتيب" aria-label="تقديم">↑</button>`:''}<button class="btn sm" type="button" data-wedit="${m.id}">${ic('edit',15)}تعديل</button></span></div>`;}).join('')}</div>`:'<div class="note" style="background:var(--soft)">لا توجد زوجات مسجّلة بعد. أضف الزوجة الأولى، وإذا كان له أكثر من زوجة أضفهن بالترتيب.</div>'}
  <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--bg)">
   <b>${cur?'تعديل بيانات '+esc(wifeName(cur)):'إضافة زوجة'+(w.length?' ('+ordName(w.length+1)+')':'')}</b>
   <div class="row2"><div class="f"><label for="wn">اسمها</label><input class="inp" id="wn" maxlength="80" value="${esc(cur?cur.wife_name||'':'')}" placeholder="مثال: نورة بنت عبدالله"><span class="err" id="eW">اكتب اسمها</span></div>
   <div class="f"><label for="wf">عائلتها <span class="sub">(اختياري)</span></label><input class="inp" id="wf" maxlength="60" value="${esc(cur?cur.wife_family||'':'')}" placeholder="مثال: آل فلان"></div></div>
   <div class="f"><span class="lb">الحالة</span><div class="segm" data-wst>${Object.entries(WST).map(([k,t])=>`<button type="button" class="${D.st===k?'on':''}" data-v="${k}">${t}</button>`).join('')}</div></div>
   <div class="f"><label for="wnt">ملاحظة داخلية <span class="sub">(اختياري)</span></label><input class="inp" id="wnt" maxlength="500" value="${esc(cur?cur.notes||'':'')}"></div>
   ${!SET.show_wives?`<span class="h">${ic('lock',13)} أسماء الزوجات لا تظهر في الموقع العام حاليًا (من الخصوصية والإعدادات).</span>`:''}
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn p" type="button" data-act="saveWife" ${D.busy?'disabled':''}>${D.busy?'جارٍ الحفظ…':cur?'حفظ':'إضافة'}</button>${cur?`<button class="btn" type="button" data-act="newWife">إلغاء التعديل</button><button class="btn no" type="button" data-act="delWife" style="margin-inline-start:auto">${ic('trash',15)}${D.arm===cur.id?'اضغط للتأكيد':'حذف'}</button>`:''}</div>
   ${cur&&P.some(c=>c.mom===cur.id)?'<span class="h">عند الحذف يبقى أبناؤها في الشجرة لكن بدون أم محددة.</span>':''}
  </div>
 </div>
 <div class="df">${D.back?`<button class="btn" type="button" data-act="wivesBack">رجوع</button>`:''}<button class="btn" type="button" data-act="close">إغلاق</button></div>`;
 drawer.querySelector('[data-wst]').onclick=e=>{const b=e.target.closest('button');if(!b)return;const k={wn:document.getElementById('wn').value,wf:document.getElementById('wf').value,wnt:document.getElementById('wnt').value};D.st=b.dataset.v;drawWives();Object.entries(k).forEach(([i,v])=>document.getElementById(i).value=v);};
}
async function saveWife(){
 const n=document.getElementById('wn').value.trim(),f=document.getElementById('wf').value.trim(),nt=document.getElementById('wnt').value.trim();
 document.getElementById('eW').classList.toggle('on',!n);if(!n||D.busy)return;
 const row={wife_name:n,wife_family:f||null,status:D.st,notes:nt||null};
 D.busy=true;const hid=D.hus;
 try{
  let r;if(D.w)r=await SB.from('marriages').update(row).eq('id',D.w);
  else{const w=wivesOf(hid);r=await SB.from('marriages').insert({...row,husband_id:hid,wife_order:(w.length?Math.max(...w.map(m=>m.wife_order)):0)+1,created_by_name:myName()});}
  if(r.error)throw r.error;
  const was=D.w;await loadAll();D.busy=false;D.w=null;D.st='married';D.arm=null;drawWives();render();toast(was?'تم حفظ بيانات الزوجة':'أُضيفت الزوجة');
 }catch(e){D.busy=false;drawWives();toast(errMsg(e),true);}
}
async function delWife(){
 const m=marById(D.w);if(!m)return;if(D.arm!==m.id){D.arm=m.id;drawWives();return;}
 const {error}=await SB.from('marriages').delete().eq('id',m.id);if(error){toast(errMsg(error),true);return;}
 await loadAll();D.w=null;D.arm=null;drawWives();render();toast('حُذفت الزوجة');
}
async function wifeUp(id){
 const w=wivesOf(D.hus),i=w.findIndex(m=>m.id===id);if(i<1)return;const a=w[i-1],b=w[i];
 const r1=await SB.from('marriages').update({wife_order:b.wife_order}).eq('id',a.id);const r2=await SB.from('marriages').update({wife_order:a.wife_order}).eq('id',b.id);
 if(r1.error||r2.error){toast(errMsg(r1.error||r2.error),true);}
 await loadAll();drawWives();render();
}
document.addEventListener('click',e=>{
 if(!ME)return;const t=e.target.closest('[data-wives],[data-wedit],[data-wup],[data-act="saveWife"],[data-act="delWife"],[data-act="newWife"],[data-act="wivesBack"]');if(!t)return;
 const d=t.dataset;
 if(d.wives){const keep=D&&D.mode!=='wives'&&typeof collect==='function'?collect():null;openWives(+d.wives);if(D.back)D.back.keep=keep;return;}
 if(d.wedit){const m=marById(+d.wedit);D.w=m.id;D.st=m.status;D.arm=null;drawWives();document.getElementById('wn').focus();return;}
 if(d.wup){wifeUp(+d.wup);return;}
 if(d.act==='saveWife'){saveWife();return;}
 if(d.act==='delWife'){delWife();return;}
 if(d.act==='newWife'){D.w=null;D.st='married';D.arm=null;drawWives();return;}
 if(d.act==='wivesBack'){const b=D.back;D=b;if(D.mode==='edit'||D.mode==='add'){if(D.father&&!wivesOf(D.father).some(m=>String(m.id)===D.mom))D.mom=defaultMom(D.father);drawHTML();if(b.keep)restore(b.keep);}return;}
});

/* ================= invitations (RSVP + collecting missing data) ================= */
const invLink=v=>location.origin+location.pathname.replace(/[^/]*$/,'')+'invite.html?i='+v.slug;
const invEvent=v=>EVS.find(e=>e.id===v.event_id)||null;
const RST={yes:['سيحضر','b-ok'],maybe:['لم يقرر','b-gold'],no:['اعتذر','b-red']};
const WELCOME=t=>`السلام عليكم ورحمة الله وبركاته،

يسرّنا أن ندعوكم لحضور «${t}»، لقاءٌ يجمع شباب العائلة على المحبة والأُلفة، نجدّد فيه روابط القربى، ونتعارف عن قرب، ونصنع معًا ذكريات جميلة تبقى للأجيال القادمة.

حضوركم شرفٌ لنا، وبه يكتمل اللقاء.`;
const AGENDA0=[{time:'8:00 م',title:'الاستقبال والقهوة',desc:''},{time:'8:30 م',title:'كلمة ترحيبية',desc:''},{time:'9:00 م',title:'تعارف ومسابقات',desc:''},{time:'10:00 م',title:'العشاء',desc:''}];
async function invPeople(v,force){
 if(!force&&INVD[v.slug])return INVD[v.slug];
 const {data,error}=await SB.rpc('get_invitation',{p_slug:v.slug});
 if(error)throw error;INVD[v.slug]=data;return data;
}
function waText(v){
 const e=invEvent(v);let t=`السلام عليكم ورحمة الله وبركاته\n\nيسعدنا دعوتكم لحضور «${v.title}»`;
 if(e){const d=new Date(e.starts_at);t+=`\n\n🗓 ${fmtD({weekday:'long',day:'numeric',month:'long'}).format(d)} (${hDate(d)})\n⏰ ${tOf(d)}`;if(e.location_name)t+=`\n📍 ${e.location_name}`;}
 t+=`\n\nنرجو تأكيد الحضور وتحديث بياناتكم في شجرة العائلة من الرابط:\n${invLink(v)}`;
 if(v.deadline)t+=`\n\nآخر موعد للتأكيد: ${fmtD({weekday:'long',day:'numeric',month:'long'}).format(new Date(v.deadline))}`;
 return t;
}
function vInvites(){
 if(S.inv){const v=INVS.find(x=>x.id===S.inv);if(v)return vInvite(v);S.inv=null;}
 return `<div class="ph"><div><h1>الدعوات</h1><p>رابط واحد ترسله للعائلة: يأكدون حضورهم، ويكمّلون بياناتهم الناقصة</p></div>
  <div class="sp"><button class="btn p" type="button" data-act="newInv">${ic('plus')}دعوة جديدة</button></div></div>
  ${INVS.length?`<div class="invs">${INVS.map(v=>{const e=invEvent(v);const rs=RESP.filter(r=>r.invitation_id===v.id);const y=rs.filter(r=>r.status==='yes').length,pend=rs.filter(r=>r.data_state==='pending').length;
   return `<button type="button" class="card invc" data-inv="${v.id}"><div class="ih"><span class="ic" style="background:var(--goldbg)">${ic('star',20,'#8A6A26')}</span><span><b>${esc(v.title)}</b><small>${e?esc(fmtD({weekday:'long',day:'numeric',month:'long'}).format(new Date(e.starts_at)))+' · '+esc(hDate(new Date(e.starts_at))):'غير مربوطة بفعالية'}</small></span>${v.is_open?'<span class="badge b-ok">مفتوحة</span>':'<span class="badge b-mute">مغلقة</span>'}</div>
   <div class="inums"><span><b>${y}</b>سيحضر</span><span><b>${rs.filter(r=>r.status==='maybe').length}</b>لم يقرر</span><span><b>${rs.filter(r=>r.status==='no').length}</b>اعتذر</span><span><b style="color:#8A6A26">${pend}</b>بيانات للاعتماد</span></div></button>`;}).join('')}</div>`
  :`<section class="card start"><h2>أول دعوة</h2><p class="muted" style="margin:0;line-height:1.8">أنشئ دعوة مربوطة بفعالية، اكتب نص الترحيب والبرنامج، وأرسل الرابط في قروب العائلة. كل شخص يدوّر على اسمه، يأكد حضوره، ويعبّي الناقص من جواله وسنة ميلاده وصورته.</p><button class="btn p" type="button" data-act="newInv">${ic('plus')}دعوة جديدة</button></section>`}`;
}
function vInvite(v){
 const e=invEvent(v),rs=RESP.filter(r=>r.invitation_id===v.id),d=INVD[v.slug];
 if(!d){invPeople(v).then(()=>{if(S.view==='invites'&&S.inv===v.id)render();}).catch(err=>toast(errMsg(err),true));}
 const people=d?d.people:[];const rset=new Set(rs.map(r=>r.person_id));
 const none=people.filter(p=>!rset.has(p.id));
 const cnt=k=>rs.filter(r=>r.status===k).length;
 const pend=rs.filter(r=>r.data_state==='pending');
 const tab=S.invTab||'resp';
 const nm=id=>by[id]?esc(joinN(anc(id).slice(0,3))):'#'+id;
 let body='';
 if(tab==='resp'){
  const list=rs.filter(r=>S.invF?r.status===S.invF:true);
  body=`<div class="tabs" style="margin:0 0 12px">${[['','الكل',rs.length],['yes','سيحضر',cnt('yes')],['maybe','لم يقرر',cnt('maybe')],['no','اعتذر',cnt('no')]].map(([k,t,n])=>`<button type="button" class="tab ${(S.invF||'')===k?'on':''}" data-invf="${k}">${t} (${n})</button>`).join('')}</div>
  <section class="card"><div class="list">${list.length?list.map(r=>`<div class="li">${by[r.person_id]?avatar(r.person_id):''}<div class="tx"><b>${nm(r.person_id)}</b>${r.note?`<div class="sub">«${esc(r.note)}»</div>`:''}<div class="sub">${esc(ago(r.updated_at))}</div></div><span class="badge ${RST[r.status][1]}">${RST[r.status][0]}</span></div>`).join(''):'<div class="empty">ما فيه ردود هنا بعد.</div>'}</div></section>
  ${cnt('yes')?`<button class="btn sm" type="button" data-act="copyYes" style="margin-top:12px">نسخ أسماء الحاضرين (${cnt('yes')})</button>`:''}`;
 }else if(tab==='data'){
  body=`${pend.length>1?`<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap"><button class="btn p" type="button" data-act="applyAll">${ic('check')}اعتماد كل البيانات (${pend.length})</button><span class="sub" style="align-self:center">تنضاف للشجرة مباشرة وتنسجل في سجل التعديلات</span></div>`:''}
  <section class="card"><div class="list">${pend.length?pend.map(r=>{const x=by[r.person_id];return `<div class="li" style="align-items:flex-start;flex-wrap:wrap">${x?avatar(r.person_id):''}<div class="tx"><b>${nm(r.person_id)}</b>
   <div class="dfields">${r.phone?`<label><input type="checkbox" checked data-rf="${r.id}:phone"> الجوال: <b dir="ltr">${esc(r.phone)}</b>${x&&x.ph?` <span class="sub">(بدل ${esc(x.ph)})</span>`:''}</label>`:''}
   ${r.birth_year?`<label><input type="checkbox" checked data-rf="${r.id}:birth"> سنة الميلاد: <b>${r.birth_year}</b> <span class="sub">(${new Date().getFullYear()-r.birth_year} سنة)</span>${x&&x.b?` <span class="sub">(بدل ${x.b})</span>`:''}</label>`:''}
   ${r.photo_path?`<label class="dph"><input type="checkbox" checked data-rf="${r.id}:photo"> الصورة: <img src="${esc(photoUrl(r.photo_path))}" alt="الصورة المرسلة" loading="lazy"></label>`:''}</div></div>
   <span style="display:flex;gap:6px"><button class="btn sm ok" type="button" data-apply="${r.id}">${ic('check',15)}اعتماد</button><button class="btn sm no" type="button" data-dismiss="${r.id}">تجاهل</button></span></div>`;}).join(''):'<div class="empty">لا توجد بيانات بانتظار الاعتماد.</div>'}</div></section>`;
 }else if(tab==='none'){
  body=`<section class="card"><div class="ch"><h2>لم يردّوا بعد (${none.length})</h2>${none.length?`<button class="lnk" type="button" data-act="copyNone">نسخ الأسماء</button>`:''}</div><div class="list">${d?(none.length?none.map(p=>`<div class="li">${by[p.id]?avatar(p.id):''}<div class="tx"><b>${esc(p.line.split(' بن ').slice(0,3).join(' بن '))}</b><div class="sub">${[p.need.phone?'بدون جوال':'',p.need.birth?'بدون سنة ميلاد':'',p.need.photo?'بدون صورة':''].filter(Boolean).join(' · ')||'بياناته مكتملة'}</div></div>${by[p.id]&&by[p.id].ph?`<a class="btn sm" href="https://wa.me/966${esc(by[p.id].ph.slice(1))}?text=${encodeURIComponent(waText(v))}" target="_blank" rel="noopener">واتساب</a>`:''}</div>`).join(''):'<div class="empty">الكل ردّ. ما شاء الله!</div>'):'<div class="empty">جارٍ التحميل…</div>'}</div></section>`;
 }else{
  const ex=new Set(v.exclude_ids||[]),inc=new Set(v.include_ids||[]);
  body=`<div class="note" style="background:var(--bluebg);color:#24485E;margin-bottom:12px">${ic('info',18,'#2F5D7A')}<span>القائمة تنحسب تلقائيًا: الأحياء من ${v.min_age} إلى ${v.max_age} سنة${v.gender==='m'?' من الذكور':''}${v.include_unknown_age?'، ومعهم من ما عنده سنة ميلاد إلا إذا كان واضح إنه أكبر (عنده أحفاد مثلًا)':''}. تقدر تستبعد أي اسم أو تضيف اسمًا من خارج الفئة.</span></div>
  <div class="pick" style="margin-bottom:12px"><input class="inp" id="incq" type="search" autocomplete="off" placeholder="أضف شخصًا للدعوة: اكتب اسمه ونسبه" aria-label="إضافة شخص للدعوة"><div class="opts" id="inco"></div></div>
  <section class="card"><div class="ch"><h2>المدعوون (${people.length})</h2></div><div class="list">${d?people.map(p=>`<div class="li">${by[p.id]?avatar(p.id):''}<div class="tx"><b>${esc(p.line.split(' بن ').slice(0,3).join(' بن '))}</b>${inc.has(p.id)?'<div class="sub">مضاف يدويًا</div>':''}</div><button class="btn sm no" type="button" data-excl="${p.id}">استبعاد</button></div>`).join(''):'<div class="empty">جارٍ التحميل…</div>'}
  ${[...ex].filter(id=>by[id]).map(id=>`<div class="li" style="opacity:.6">${avatar(id)}<div class="tx"><b>${nm(id)}</b><div class="sub">مستبعد</div></div><button class="btn sm" type="button" data-unexcl="${id}">إرجاع</button></div>`).join('')}</div></section>`;
 }
 return `<div class="ph"><div><button class="lnk" type="button" data-act="invBack" style="margin:0 0 6px;padding:0">‹ كل الدعوات</button><h1>${esc(v.title)}</h1><p>${e?esc(fmtD({weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(e.starts_at)))+' · '+esc(tOf(new Date(e.starts_at)))+(e.location_name?' · '+esc(e.location_name):''):'غير مربوطة بفعالية'}</p></div>
  <div class="sp"><button class="btn" type="button" data-act="editInv">${ic('edit')}تعديل الدعوة</button><a class="btn" href="${esc(invLink(v))}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">${ic('eye')}معاينة</a></div></div>
  <section class="card share"><div class="tx"><b>${v.is_open?'الدعوة مفتوحة':'الدعوة مغلقة'}${v.deadline?' · آخر موعد '+esc(fmtD({day:'numeric',month:'long'}).format(new Date(v.deadline))):''}</b><div class="lk" dir="ltr">${esc(invLink(v))}</div></div>
   <div class="sacts"><button class="btn p" type="button" data-act="waInv">إرسال في واتساب</button><button class="btn" type="button" data-act="copyLink">نسخ الرابط</button><button class="btn" type="button" data-act="copyMsg">نسخ الرسالة</button></div></section>
  <div class="kpis" style="margin-top:16px">
   <div class="card kpi"><span class="l">المدعوون</span><span class="v">${d?people.length:'…'}</span></div>
   <div class="card kpi"><span class="l">سيحضر</span><span class="v" style="color:var(--olive)">${cnt('yes')}</span></div>
   <div class="card kpi"><span class="l">لم يقرر</span><span class="v" style="color:#8A6A26">${cnt('maybe')}</span></div>
   <div class="card kpi"><span class="l">اعتذر</span><span class="v" style="color:var(--red)">${cnt('no')}</span></div>
   <div class="card kpi"><span class="l">لم يرد</span><span class="v">${d?none.length:'…'}</span></div>
  </div>
  <div class="tabs" style="margin-bottom:14px">${[['resp','الردود',rs.length],['data','بيانات للاعتماد',pend.length],['none','لم يردّوا',d?none.length:''],['list','قائمة المدعوين','']].map(([k,t,n])=>`<button type="button" class="tab ${tab===k?'on':''}" data-invtab="${k}">${t}${n!==''?' ('+n+')':''}</button>`).join('')}</div>
  ${body}`;
}
function invDrawer(v){
 const e0=v?null:(EVS.filter(e=>new Date(e.starts_at)>=new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]||null);
 D={mode:'inv',edit:v?v.id:null,agenda:JSON.parse(JSON.stringify(v?v.agenda:AGENDA0)),open:v?v.is_open:true,unk:v?v.include_unknown_age:true,gender:v?v.gender:'m',ask:{phone:v?v.ask_phone:true,birth:v?v.ask_birth:true,photo:v?v.ask_photo:true},busy:false,
   init:{ev:v?v.event_id||'':(e0?e0.id:''),title:v?v.title:(e0?e0.title:''),welcome:v?v.welcome||'':null,notes:v?v.notes||'':'',min:v?v.min_age:15,max:v?v.max_age:40,dl:v&&v.deadline?keyOf(new Date(v.deadline)):''}};
 if(D.init.welcome===null)D.init.welcome=WELCOME(D.init.title||'لقاء شباب العائلة');
 drawInv();drawer.classList.add('on');scrim.classList.add('on');
}
function invCollect(){const g=id=>{const e=document.getElementById(id);return e?e.value:'';};
 D.agenda=[...drawer.querySelectorAll('.agr')].map(r=>({time:r.querySelector('[data-ag=time]').value.trim(),title:r.querySelector('[data-ag=title]').value.trim(),desc:r.querySelector('[data-ag=desc]').value.trim()}));
 D.init={ev:g('ivE'),title:g('ivT'),welcome:g('ivW'),notes:g('ivN'),min:g('ivMin'),max:g('ivMax'),dl:g('ivDl')};}
function drawInv(){
 const I0=D.init,evs=EVS.slice().sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at));
 const sw=(k,on,t,h)=>`<div class="perm"><span>${t}${h?`<small>${h}</small>`:''}</span><button type="button" class="sw" role="switch" aria-checked="${on}" data-ivsw="${k}" aria-label="${t}"></button></div>`;
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">${D.edit?'تعديل الدعوة':'دعوة جديدة'}</h3><div class="sub" style="margin-top:4px">تظهر للمدعوين كصفحة دعوة أنيقة على جوالاتهم</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <div class="db">
  <div class="f"><label for="ivE">الفعالية</label>${evs.length?`<select class="inp" id="ivE"><option value="">— بدون فعالية —</option>${evs.map(e=>`<option value="${e.id}" ${String(I0.ev)===String(e.id)?'selected':''}>${esc(e.title)} · ${esc(fmtD({day:'numeric',month:'long'}).format(new Date(e.starts_at)))}</option>`).join('')}</select><span class="h">التاريخ والوقت والمكان تنسحب من الفعالية.</span>`:`<div class="note" style="background:var(--goldbg);color:#5E4716">ما فيه فعاليات بعد. أضف الفعالية من قسم «الفعاليات» عشان يطلع موعدها ومكانها في الدعوة. <button class="lnk" type="button" data-view="events" style="margin:0;display:inline">الفعاليات</button></div>`}</div>
  <div class="f"><label for="ivT">عنوان الدعوة</label><input class="inp" id="ivT" maxlength="120" value="${esc(I0.title)}" placeholder="مثال: ملتقى شباب العائلة الأول"><span class="err" id="eIT">اكتب العنوان</span></div>
  <div class="f"><label for="ivW">نص الترحيب</label><textarea class="inp" id="ivW" maxlength="3000" style="min-height:190px;line-height:1.9">${esc(I0.welcome)}</textarea></div>
  <div class="f"><span class="lb">برنامج الفعالية</span><div class="ags">${D.agenda.map((a,i)=>`<div class="agr"><input class="inp" data-ag="time" value="${esc(a.time)}" placeholder="8:00 م" aria-label="الوقت"><input class="inp" data-ag="title" value="${esc(a.title)}" placeholder="الفقرة" aria-label="الفقرة"><input class="inp agd" data-ag="desc" value="${esc(a.desc||'')}" placeholder="تفاصيل (اختياري)" aria-label="تفاصيل الفقرة"><span class="agb">${i?`<button type="button" class="btn sm" data-agup="${i}" aria-label="تقديم">↑</button>`:''}<button type="button" class="btn sm no" data-agdel="${i}" aria-label="حذف الفقرة">${ic('x',14)}</button></span></div>`).join('')}</div>
   <button type="button" class="btn sm" data-act="agAdd" style="align-self:flex-start">${ic('plus',15)}إضافة فقرة</button></div>
  <div class="f"><label for="ivN">ملاحظات <span class="sub">(اختياري: اللبس، المواقف، ما يحضره كل شخص…)</span></label><textarea class="inp" id="ivN" maxlength="1500" style="min-height:80px">${esc(I0.notes)}</textarea></div>
  <div class="f"><span class="lb">من المدعوون؟</span>
   <div class="row2"><div class="f"><label for="ivMin">من عمر</label><input class="inp" id="ivMin" inputmode="numeric" value="${esc(I0.min)}"></div><div class="f"><label for="ivMax">إلى عمر</label><input class="inp" id="ivMax" inputmode="numeric" value="${esc(I0.max)}"></div></div>
   <div class="segm"><button type="button" class="${D.gender==='m'?'on':''}" data-ivg="m">الذكور</button><button type="button" class="${D.gender==='all'?'on':''}" data-ivg="all">الجميع</button></div>
   ${sw('unk',D.unk,'ضم من ليس له سنة ميلاد','إلا إذا كان واضح إنه أكبر من الفئة')}</div>
  <div class="f"><span class="lb">اطلب من المدعو يكمّل</span>${sw('phone',D.ask.phone,'رقم الجوال','')}${sw('birth',D.ask.birth,'سنة الميلاد','')}${sw('photo',D.ask.photo,'الصورة الشخصية','')}<span class="h">يُطلب منه فقط الناقص عنده، وتنتظر اعتمادك قبل ما تنضاف للشجرة.</span></div>
  <div class="row2"><div class="f"><label for="ivDl">آخر موعد للتأكيد <span class="sub">(اختياري)</span></label><input class="inp" id="ivDl" type="date" value="${esc(I0.dl)}"></div>
  <div class="f"><span class="lb">الحالة</span>${sw('open',D.open,'الدعوة مفتوحة للردود','')}</div></div>
 </div>
 <div class="df"><button class="btn p" type="button" data-act="saveInv" ${D.busy?'disabled':''}>${D.busy?'جارٍ الحفظ…':D.edit?'حفظ':'إنشاء الدعوة'}</button><button class="btn" type="button" data-act="close">إلغاء</button>${D.edit?`<button class="btn no" type="button" data-act="delInv" style="margin-inline-start:auto">${D.arm?'اضغط للتأكيد':'حذف الدعوة'}</button>`:''}</div>`;
}
async function saveInv(){
 invCollect();const I0=D.init;
 if(!I0.title.trim()){document.getElementById('eIT').classList.add('on');return;}
 let mn=+toLat(I0.min)||0,mx=+toLat(I0.max)||40;if(mn>mx)[mn,mx]=[mx,mn];
 const row={title:I0.title.trim(),event_id:I0.ev?+I0.ev:null,welcome:I0.welcome.trim()||null,notes:I0.notes.trim()||null,agenda:D.agenda.filter(a=>a.title||a.time),
  min_age:Math.max(0,Math.min(120,mn)),max_age:Math.max(1,Math.min(120,mx)),include_unknown_age:D.unk,gender:D.gender,ask_phone:D.ask.phone,ask_birth:D.ask.birth,ask_photo:D.ask.photo,is_open:D.open,
  deadline:I0.dl?new Date(I0.dl+'T23:59:00+03:00').toISOString():null,updated_at:new Date().toISOString()};
 D.busy=true;drawInv();
 const r=D.edit?await SB.from('invitations').update(row).eq('id',D.edit).select().single():await SB.from('invitations').insert({...row,created_by_name:myName()}).select().single();
 if(r.error){D.busy=false;drawInv();toast(errMsg(r.error),true);return;}
 const id=r.data.id;delete INVD[r.data.slug];closeDrawer();await refresh();S.view='invites';S.inv=id;S.invTab='resp';render();toast(D&&D.edit?'تم حفظ الدعوة':'الدعوة جاهزة، أرسل الرابط للعائلة');
}
const toLat=s=>String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
async function copyText(t,msg){try{await navigator.clipboard.writeText(t);toast(msg);}catch(_){prompt('انسخ النص:',t);}}
async function applyResp(id,fields){const {error}=await SB.rpc('apply_invite_response',{p_id:id,p_fields:fields});if(error)throw error;}
async function setInvList(v,patch){const {error}=await SB.from('invitations').update(patch).eq('id',v.id);if(error){toast(errMsg(error),true);return;}Object.assign(v,patch);delete INVD[v.slug];render();}
document.addEventListener('input',e=>{
 if(e.target.id!=='incq')return;const v=INVS.find(x=>x.id===S.inv);const o=document.getElementById('inco');const q=norm(e.target.value);
 if(!q){o.classList.remove('on');return;}
 const res=P.filter(x=>!x.dead&&norm(fullName(x.id)).includes(q)).slice(0,10);
 o.innerHTML=res.length?res.map(x=>`<button type="button" class="opt" data-incl="${x.id}">${avatar(x.id)}<span>${esc(x.n)}<small>${esc(joinN(anc(x.id).slice(1,4)))}</small></span></button>`).join(''):'<div class="empty" style="padding:14px">لا توجد نتائج</div>';o.classList.add('on');
});
document.addEventListener('click',async e=>{
 if(!ME)return;
 const t=e.target.closest('[data-inv],[data-invtab],[data-invf],[data-apply],[data-dismiss],[data-excl],[data-unexcl],[data-incl],[data-ivsw],[data-ivg],[data-agup],[data-agdel],[data-act="newInv"],[data-act="editInv"],[data-act="saveInv"],[data-act="delInv"],[data-act="invBack"],[data-act="agAdd"],[data-act="waInv"],[data-act="copyLink"],[data-act="copyMsg"],[data-act="applyAll"],[data-act="copyYes"],[data-act="copyNone"]');
 if(!t)return;const d=t.dataset,v=INVS.find(x=>x.id===S.inv);
 if(d.inv){S.inv=+d.inv;S.invTab='resp';S.invF='';render();window.scrollTo({top:0});return;}
 if(d.invtab){S.invTab=d.invtab;render();return;}
 if(d.invf!==undefined){S.invF=d.invf;render();return;}
 if(d.ivsw){const k=d.ivsw;if(k==='open')D.open=!D.open;else if(k==='unk')D.unk=!D.unk;else D.ask[k]=!D.ask[k];t.setAttribute('aria-checked',t.getAttribute('aria-checked')!=='true');return;}
 if(d.ivg){invCollect();D.gender=d.ivg;drawInv();return;}
 if(d.agup){invCollect();const i=+d.agup;[D.agenda[i-1],D.agenda[i]]=[D.agenda[i],D.agenda[i-1]];drawInv();return;}
 if(d.agdel){invCollect();D.agenda.splice(+d.agdel,1);drawInv();return;}
 if(d.apply){t.disabled=true;const id=+d.apply;const f=[...document.querySelectorAll(`[data-rf^="${id}:"]`)].filter(c=>c.checked).map(c=>c.dataset.rf.split(':')[1]);
  try{await applyResp(id,f);await refresh();toast(f.length?'انضافت البيانات للشجرة':'تم');}catch(err){t.disabled=false;toast(errMsg(err),true);}return;}
 if(d.dismiss){t.disabled=true;const r=RESP.find(x=>x.id===+d.dismiss);try{await applyResp(r.id,[]);if(r.photo_path)await SB.storage.from('photos').remove([r.photo_path]);await refresh();toast('تم التجاهل');}catch(err){t.disabled=false;toast(errMsg(err),true);}return;}
 if(d.excl){const id=+d.excl;await setInvList(v,{exclude_ids:[...new Set([...(v.exclude_ids||[]),id])],include_ids:(v.include_ids||[]).filter(x=>x!==id)});return;}
 if(d.unexcl){const id=+d.unexcl;await setInvList(v,{exclude_ids:(v.exclude_ids||[]).filter(x=>x!==id)});return;}
 if(d.incl){const id=+d.incl;await setInvList(v,{include_ids:[...new Set([...(v.include_ids||[]),id])],exclude_ids:(v.exclude_ids||[]).filter(x=>x!==id)});toast('أُضيف '+by[id].n+' للدعوة');return;}
 const a=d.act;
 if(a==='newInv'){invDrawer(null);return;}
 if(a==='editInv'){invDrawer(v);return;}
 if(a==='saveInv'){saveInv();return;}
 if(a==='delInv'){if(!D.arm){D.arm=true;invCollect();drawInv();return;}const {error}=await SB.from('invitations').delete().eq('id',D.edit);if(error){toast(errMsg(error),true);return;}closeDrawer();S.inv=null;await refresh();toast('حُذفت الدعوة');return;}
 if(a==='invBack'){S.inv=null;render();return;}
 if(a==='agAdd'){invCollect();D.agenda.push({time:'',title:'',desc:''});drawInv();const rs=drawer.querySelectorAll('.agr');rs[rs.length-1].querySelector('[data-ag=time]').focus();return;}
 if(a==='waInv'){window.open('https://wa.me/?text='+encodeURIComponent(waText(v)),'_blank','noopener');return;}
 if(a==='copyLink'){copyText(invLink(v),'تم نسخ الرابط');return;}
 if(a==='copyMsg'){copyText(waText(v),'تم نسخ الرسالة، الصقها في واتساب');return;}
 if(a==='applyAll'){t.disabled=true;const pend=RESP.filter(r=>r.invitation_id===v.id&&r.data_state==='pending');let ok=0;for(const r of pend){try{await applyResp(r.id,['phone','birth','photo']);ok++;}catch(_){}}await refresh();toast(`اعتُمدت بيانات ${ok} من ${pend.length}`);return;}
 if(a==='copyYes'){const l=RESP.filter(r=>r.invitation_id===v.id&&r.status==='yes').map((r,i)=>(i+1)+'. '+(by[r.person_id]?joinN(anc(r.person_id).slice(0,3)):''));copyText(l.join('\n'),'تم نسخ أسماء الحاضرين');return;}
 if(a==='copyNone'){const dd=INVD[v.slug];const rset=new Set(RESP.filter(r=>r.invitation_id===v.id).map(r=>r.person_id));const l=dd.people.filter(p=>!rset.has(p.id)).map((p,i)=>(i+1)+'. '+p.line.split(' بن ').slice(0,3).join(' بن '));copyText(l.join('\n'),'تم نسخ الأسماء');return;}
});

/* ================= events & photos ================= */
const KIND={wedding:'زواج',gathering:'جمعة عائلية',meeting:'لقاء',other:'مناسبة'};
const KBADGE={wedding:'b-gold',gathering:'b-ok',meeting:'b-blue',other:'b-mute'};
const TZ='Asia/Riyadh';
const fmtD=(o,h)=>new Intl.DateTimeFormat(h?'ar-SA-u-ca-islamic-umalqura-nu-latn':'ar-u-ca-gregory-nu-latn',Object.assign({timeZone:TZ},o));
const gDate=d=>fmtD({weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
const hDate=d=>fmtD({day:'numeric',month:'long',year:'numeric'},true).format(d);
const tOf=d=>fmtD({hour:'numeric',minute:'2-digit'}).format(d);
const localParts=d=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);const g=t=>p.find(x=>x.type===t).value;return {date:g('year')+'-'+g('month')+'-'+g('day'),time:g('hour')+':'+g('minute')};};
const atRiyadh=(date,time)=>new Date(date+'T'+(time||'00:00')+':00+03:00');
const photoUrl=path=>window.FT_CONFIG.url+'/storage/v1/object/public/photos/'+path.split('/').map(encodeURIComponent).join('/');
const pc=n=>n===1?'صورة واحدة':n===2?'صورتان':(n>=3&&n<=10)?n+' صور':n+' صورة';
const canMod=r=>isAdmin()||(r&&ME&&r.created_by_email===ME.email);
const evEnd=e=>e.ends_at?new Date(e.ends_at):new Date(new Date(e.starts_at).getTime()+3*3600e3);
const albumOfEvent=id=>ALB.find(a=>a.event_id===id);
const personLabel=id=>by[id]?short(id,3):'';

/* ================= dual calendar: هجري (أم القرى) + ميلادي ================= */
const dayAt=key=>new Date(key+'T12:00:00+03:00');
const keyOf=d=>localParts(d).date;
const addDays=(key,n)=>keyOf(new Date(dayAt(key).getTime()+n*86400000));
const _hp=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{timeZone:TZ,day:'numeric',month:'numeric',year:'numeric'});
const hParts=key=>{const p=_hp.formatToParts(dayAt(key));const g=t=>parseInt(p.find(x=>x.type===t).value,10);return {d:g('day'),m:g('month'),y:g('year')};};
const hMonth=(key,lang)=>new Intl.DateTimeFormat(lang==='en'?'en-u-ca-islamic-umalqura-nu-latn':'ar-SA-u-ca-islamic-umalqura-nu-latn',{timeZone:TZ,month:'long'}).format(dayAt(key));
const gMonth=(key,lang)=>new Intl.DateTimeFormat(lang==='en'?'en-US':'ar-u-ca-gregory-nu-latn',{timeZone:TZ,month:'long'}).format(dayAt(key));
const todayKey=()=>keyOf(new Date());
const KCOL={wedding:'#B08A3E',gathering:'#4F5D2F',meeting:'#2F5D7A',other:'#736D5F'};
const WD=['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
if(!S.cal)S.cal={mode:'g',anchor:null,sel:null};
function monthKeys(mode,anchor){
 const out=[];
 if(mode==='g'){const [y,m]=anchor.split('-').map(Number);const n=new Date(Date.UTC(y,m,0)).getUTCDate();for(let i=1;i<=n;i++)out.push(`${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`);return out;}
 let k=anchor,g=0;while(hParts(k).d>1&&g++<31)k=addDays(k,-1);
 const m=hParts(k).m;while(hParts(k).m===m&&out.length<31){out.push(k);k=addDays(k,1);}
 return out;
}
function rangeLabel(keys,fn){const a=fn(keys[0]),b=fn(keys[keys.length-1]);return a===b?a:a+' – '+b;}
function evsByDay(){const m={};EVS.forEach(e=>{const k=keyOf(new Date(e.starts_at));(m[k]=m[k]||[]).push(e);});Object.values(m).forEach(l=>l.sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)));return m;}
function calCard(){
 const C=S.cal,today=todayKey();C.anchor=C.anchor||today;C.sel=C.sel||today;
 const keys=monthKeys(C.mode,C.anchor),first=keys[0],last=keys[keys.length-1];
 const H0=hParts(first),H1=hParts(last),gy0=first.slice(0,4),gy1=last.slice(0,4);
 const gTitle=k=>gMonth(k)+' '+k.slice(0,4), hTitle=k=>hMonth(k)+' '+hParts(k).y;
 const main=C.mode==='g'?gTitle(first):hTitle(first)+' هـ';
 const other=C.mode==='g'?rangeLabel(keys,k=>hMonth(k))+' '+(H0.y===H1.y?H0.y:H0.y+'–'+H1.y)+' هـ':rangeLabel(keys,k=>gMonth(k))+' '+(gy0===gy1?gy0:gy0+'–'+gy1);
 const en=C.mode==='g'?gMonth(first,'en')+' '+gy0+' · '+rangeLabel(keys,k=>hMonth(k,'en'))+' '+H0.y+' AH':hMonth(first,'en')+' '+H0.y+' AH · '+rangeLabel(keys,k=>gMonth(k,'en'))+' '+gy0;
 const ev=evsByDay(),lead=dayAt(first).getUTCDay();
 const cells=Array.from({length:lead},()=>'<span class="cday blank" aria-hidden="true"></span>').join('')+keys.map(k=>{
  const g=+k.slice(8),h=hParts(k),wd=dayAt(k).getUTCDay(),list=ev[k]||[];
  const big=C.mode==='g'?g:h.d;
  const small=C.mode==='g'?(h.d===1?'1 '+hMonth(k):h.d):(g===1?'1 '+gMonth(k):g);
  const lbl=fmtD({weekday:'long',day:'numeric',month:'long'}).format(dayAt(k))+' · '+fmtD({day:'numeric',month:'long'},true).format(dayAt(k))+(list.length?' · '+list.length+' فعالية':'');
  return `<button type="button" class="cday${k===today?' today':''}${k===C.sel?' sel':''}${wd===5||wd===6?' wk':''}" data-cday="${k}" aria-label="${esc(lbl)}" aria-pressed="${k===C.sel}"><b>${big}</b><small>${esc(small)}</small>${list.length?`<span class="dots">${list.slice(0,3).map(e=>`<i style="background:${KCOL[e.kind]||KCOL.other}"></i>`).join('')}</span>`:''}</button>`;}).join('');
 const sel=C.sel,sl=ev[sel]||[];
 return `<section class="card" id="calCard"><div class="calw">
  <div class="calhd"><div class="calt"><b>${esc(main)}</b><span>${esc(other)}</span><span class="en" dir="ltr">${esc(en)}</span></div>
   <div class="calnav"><div class="tabs" role="tablist" aria-label="نوع التقويم"><button type="button" class="tab ${C.mode==='g'?'on':''}" data-cal="g" aria-selected="${C.mode==='g'}">ميلادي</button><button type="button" class="tab ${C.mode==='h'?'on':''}" data-cal="h" aria-selected="${C.mode==='h'}">هجري</button></div>
    <span style="display:flex;gap:6px"><button type="button" class="ibtn2" data-cal="prev" aria-label="الشهر السابق">›</button><button type="button" class="btn sm" data-cal="today">اليوم</button><button type="button" class="ibtn2" data-cal="next" aria-label="الشهر التالي">‹</button></span></div></div>
  <div class="cgrid" role="grid">${WD.map((w,i)=>`<span class="cwd${i>=5?' wk':''}">${w}</span>`).join('')}${cells}</div>
  <div class="cdetail"><div class="cdt"><b>${esc(fmtD({weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(dayAt(sel)))}</b><span>${esc(fmtD({day:'numeric',month:'long',year:'numeric'},true).format(dayAt(sel)))}</span><span dir="ltr">${esc(new Intl.DateTimeFormat('en-GB',{timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(dayAt(sel)))} · ${esc(hParts(sel).d+' '+hMonth(sel,'en')+' '+hParts(sel).y)} AH</span></div>
   ${sl.length?`<div class="list" style="margin-top:8px">${sl.map(e=>`<div class="li" style="padding:10px 0"><span class="dot" style="background:${KCOL[e.kind]||KCOL.other};width:10px;height:10px"></span><div class="tx"><b>${esc(e.title)}</b><div class="sub">${esc(KIND[e.kind]||'مناسبة')} · ${esc(tOf(new Date(e.starts_at)))}${e.location_name?' · '+esc(e.location_name):''}</div></div>${canMod(e)?`<button class="btn sm" type="button" data-evedit="${e.id}">${ic('edit',15)}تعديل</button>`:''}</div>`).join('')}</div>`:'<div class="sub" style="margin-top:6px">لا توجد فعاليات في هذا اليوم.</div>'}
   <button class="btn sm" type="button" data-caladd="${sel}" style="margin-top:10px">${ic('plus',15)}فعالية في هذا اليوم</button>
  </div></div></section>`;
}
function upcomingCard(){
 const now=new Date();const up=EVS.filter(e=>evEnd(e)>=now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).slice(0,5);
 return `<section class="card"><div class="ch"><h2>الفعاليات القادمة</h2><button class="lnk" type="button" data-view="events">عرض الكل</button></div>
  <div class="list">${up.length?up.map(e=>{const s=new Date(e.starts_at);const days=Math.round((dayAt(keyOf(s))-dayAt(todayKey()))/86400000);
   return `<div class="li"><span class="ic" style="background:var(--soft);flex-direction:column;width:52px;height:52px;border-radius:14px;line-height:1.1"><b style="font-family:'Reem Kufi',serif;font-size:19px">${esc(fmtD({day:'numeric'}).format(s))}</b><span style="font-size:11px;color:var(--muted)">${esc(fmtD({month:'short'}).format(s))}</span></span>
   <div class="tx"><b>${esc(e.title)}</b><div class="sub">${esc(hDate(s))} · ${esc(tOf(s))}</div><div class="sub">${days<=0?'اليوم':days===1?'غدًا':'بعد '+days+' يوم'}${e.location_name?' · '+esc(e.location_name):''}</div></div>
   <span class="dot" style="background:${KCOL[e.kind]||KCOL.other}"></span></div>`;}).join(''):`<div class="empty">لا توجد فعاليات قادمة.<br><button class="btn sm" type="button" data-act="addEv" style="margin-top:10px">${ic('plus',15)}إضافة فعالية</button></div>`}</div></section>`;
}
document.addEventListener('click',e=>{
 if(!ME)return;const t=e.target.closest('[data-cal],[data-cday],[data-caladd]');if(!t)return;
 const C=S.cal,d=t.dataset;
 if(d.caladd){D={mode:'ev',edit:null,v:{title:'',date:d.caladd,time:'20:00',end:'',loc:'',map:'',desc:''}};drawEvent();drawer.classList.add('on');scrim.classList.add('on');return;}
 if(d.cday)C.sel=d.cday;
 else if(d.cal==='g'||d.cal==='h'){C.mode=d.cal;C.anchor=C.sel;}
 else if(d.cal==='today'){C.anchor=C.sel=todayKey();}
 else{const keys=monthKeys(C.mode,C.anchor);C.anchor=d.cal==='prev'?addDays(keys[0],-1):addDays(keys[keys.length-1],1);}
 const el=document.getElementById('calCard');if(el){el.outerHTML=calCard();const n=document.querySelector(`#calCard [data-cday="${C.sel}"]`)||document.querySelector(`#calCard [data-cal="${d.cal}"]`);if(n&&d.cal!=='today')n.focus({preventScroll:true});}
});

function vEvents(){
 const now=new Date();
 const up=EVS.filter(e=>evEnd(e)>=now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
 const past=EVS.filter(e=>evEnd(e)<now).sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at));
 const row=e=>{const s=new Date(e.starts_at);const al=albumOfEvent(e.id);const n=al?(PH[al.id]||[]).length:0;
  return `<div class="li"><span class="ic" style="background:var(--soft);flex-direction:column;width:54px;height:54px;border-radius:14px;line-height:1.1"><b style="font-family:'Reem Kufi',serif;font-size:20px">${esc(fmtD({day:'numeric'}).format(s))}</b><span style="font-size:11px;color:var(--muted)">${esc(fmtD({month:'short'}).format(s))}</span></span>
   <div class="tx"><span class="badge ${KBADGE[e.kind]||'b-mute'}" style="height:22px;font-size:11.5px">${esc(KIND[e.kind]||'مناسبة')}</span> <b>${esc(e.title)}</b>
    <div class="sub">${esc(gDate(s))} · ${esc(hDate(s))} · ${esc(tOf(s))}${e.location_name?' · '+esc(e.location_name):''}</div>
    <div class="sub">أضافها ${esc(e.created_by_name||'—')}${n?' · '+pc(n):''}</div></div>
   <span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
    <button class="btn sm" type="button" data-evph="${e.id}">${ic('img',15)}${n?'الصور':'إضافة صور'}</button>
    ${canMod(e)?`<button class="btn sm" type="button" data-evedit="${e.id}">${ic('edit',15)}تعديل</button>`:''}
    <a class="btn sm" href="events.html#event-${e.id}" target="_blank" rel="noopener" title="عرض في الموقع">${ic('eye',15)}</a></span></div>`;};
 return `<div class="ph"><div><h1>الفعاليات</h1><p>الأعراس والجمعات واللقاءات التي تظهر في تقويم الموقع</p></div>
  <div class="sp"><button class="btn p" type="button" data-act="addEv">${ic('plus')}إضافة فعالية</button></div></div>
  <section class="card"><div class="ch"><h2>القادمة</h2><span class="sub" style="margin-inline-start:auto">${up.length}</span></div><div class="list">${up.length?up.map(row).join(''):'<div class="empty">لا توجد فعاليات قادمة. أضف أول فعالية لتظهر في تقويم العائلة.</div>'}</div></section>
  ${past.length?`<section class="card" style="margin-top:18px"><div class="ch"><h2>السابقة</h2><span class="sub" style="margin-inline-start:auto">أضف صورها لتظهر في الذكريات</span></div><div class="list">${past.map(row).join('')}</div></section>`:''}`;
}

function drawEvent(){
 const e=D.edit?EVS.find(x=>x.id===D.edit):null;
 const lp=e?localParts(new Date(e.starts_at)):null, le=e&&e.ends_at?localParts(new Date(e.ends_at)):null;
 const v=D.v||{title:e?e.title:'',date:lp?lp.date:'',time:lp?lp.time:'20:00',end:le?le.time:'',loc:e?e.location_name||'':'',map:e?e.map_url||'':'',desc:e?e.description||'':''};
 D.v=v; if(D.kind==null)D.kind=e?e.kind:'gathering'; if(D.host===undefined)D.host=e?e.host_person_id:null;
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">${e?'تعديل الفعالية':'إضافة فعالية'}</h3><div class="sub" style="margin-top:4px">تظهر في تقويم الموقع مباشرة</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <form class="db" onsubmit="return false" novalidate>
  <div class="f"><span class="lb">نوع الفعالية</span><div class="segm" data-evkind>${Object.entries(KIND).map(([k,t])=>`<button type="button" class="${D.kind===k?'on':''}" data-v="${k}">${t.replace(' عائلية','')}</button>`).join('')}</div></div>
  <div class="f"><label for="evT">العنوان</label><input class="inp" id="evT" maxlength="120" value="${esc(v.title)}" placeholder="${D.kind==='wedding'?'مثال: زواج عبدالله بن سعد':'مثال: جمعة العيد في بيت الجد'}"><span class="err" id="eT">اكتب عنوان الفعالية</span></div>
  <div class="row2">
   <div class="f"><label for="evD">التاريخ</label><input class="inp" id="evD" type="date" value="${esc(v.date)}"><span class="h" id="evH">${v.date?esc(hDate(atRiyadh(v.date,'12:00'))):'اختر التاريخ'}</span><span class="err" id="eD">اختر التاريخ</span></div>
   <div class="f"><label for="evS">الوقت</label><input class="inp" id="evS" type="time" value="${esc(v.time)}"></div>
  </div>
  <div class="f"><label for="evE">وقت الانتهاء <span class="sub">(اختياري)</span></label><input class="inp" id="evE" type="time" value="${esc(v.end)}"></div>
  <div class="f"><label for="evL">المكان <span class="sub">(اختياري)</span></label><input class="inp" id="evL" maxlength="160" value="${esc(v.loc)}" placeholder="مثال: قاعة الريم، الهفوف"></div>
  <div class="f"><label for="evM">رابط الموقع في الخرائط <span class="sub">(اختياري)</span></label><input class="inp" id="evM" dir="ltr" maxlength="600" value="${esc(v.map)}" placeholder="https://maps.app.goo.gl/..."><span class="h">من خرائط Google أو Apple: اضغط «مشاركة» ثم انسخ الرابط.</span><span class="err" id="eM">الرابط يجب أن يبدأ بـ https://</span></div>
  <div class="f"><span class="lb">صاحب الدعوة <span class="sub">(اختياري، من الشجرة)</span></span>
   ${D.host&&by[D.host]?`<div class="chosen">${avatar(D.host,30)}<span>${esc(personLabel(D.host))}</span><button class="btn sm" type="button" data-act="clrHost">تغيير</button></div>`:
   `<div class="pick"><input class="inp" id="hq" type="search" autocomplete="off" placeholder="ابحث بالاسم والنسب"><div class="opts" id="ho"></div></div>`}</div>
  <div class="f"><label for="evX">تفاصيل <span class="sub">(اختياري)</span></label><textarea class="inp" id="evX" maxlength="3000" placeholder="مثال: العشاء بعد صلاة العشاء، والدعوة عامة لكل العائلة">${esc(v.desc)}</textarea></div>
 </form>
 <div class="df"><button class="btn p" type="button" data-act="saveEv" ${D.busy?'disabled':''}>${D.busy?'جارٍ الحفظ…':e?'حفظ التعديلات':'إضافة للتقويم'}</button><button class="btn" type="button" data-act="close">إلغاء</button>
  ${e&&canMod(e)?`<button class="btn no" type="button" data-act="delEv" style="margin-inline-start:auto">${ic('trash',15)}${D.delArm?'اضغط مرة ثانية للتأكيد':'حذف'}</button>`:''}</div>`;
 const keep=()=>{D.v={title:val('evT'),date:val('evD'),time:val('evS'),end:val('evE'),loc:val('evL'),map:val('evM'),desc:val('evX')};};
 drawer.querySelector('[data-evkind]').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;keep();D.kind=b.dataset.v;drawEvent();};
 const dI=document.getElementById('evD');dI.oninput=()=>{document.getElementById('evH').textContent=dI.value?hDate(atRiyadh(dI.value,'12:00')):'اختر التاريخ';};
 const hq=document.getElementById('hq'),ho=document.getElementById('ho');
 if(hq)hq.oninput=()=>{const q=norm(hq.value);if(!q){ho.classList.remove('on');return;}
  const res=P.filter(x=>norm(fullName(x.id)).includes(q)).sort((a,b)=>gen(a.id)-gen(b.id)).slice(0,10);
  ho.innerHTML=res.length?res.map(x=>`<button type="button" class="opt" data-host="${x.id}">${avatar(x.id)}<span>${esc(x.n)}<small>${esc(fullName(x.id).split(' بن ').slice(1,4).join(' بن ')||'الجد المؤسس')}</small></span></button>`).join(''):'<div class="empty" style="padding:14px">لا يوجد اسم مطابق</div>';ho.classList.add('on');};
 D.keep=keep;
}
const val=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
async function saveEvent(){
 D.keep();const v=D.v;let ok=true;const show=(id,on)=>{const e=document.getElementById(id);if(e)e.classList.toggle('on',on);if(on)ok=false;};
 show('eT',!v.title);show('eD',!/^\d{4}-\d{2}-\d{2}$/.test(v.date));show('eM',!!v.map&&!/^https?:\/\//i.test(v.map));if(!ok)return;
 const s=atRiyadh(v.date,v.time||'00:00');let en=null;
 if(v.end){en=atRiyadh(v.date,v.end);if(en<=s)en=new Date(en.getTime()+864e5);}
 const row={title:v.title,kind:D.kind,starts_at:s.toISOString(),ends_at:en?en.toISOString():null,location_name:v.loc||null,map_url:v.map||null,description:v.desc||null,host_person_id:D.host||null};
 D.busy=true;drawEvent();
 try{const r=D.edit?await SB.from('events').update(row).eq('id',D.edit).select('id').maybeSingle():await SB.from('events').insert(row).select('id').single();
  if(r.error)throw r.error;if(!r.data)throw {message:'permission denied'};
  const was=D.edit;closeDrawer();S.view='events';await refresh();toast(was?'تم حفظ التعديلات':'أُضيفت الفعالية للتقويم');}
 catch(err){if(D){D.busy=false;drawEvent();}toast(errMsg(err),true);}
}
async function deleteEvent(){
 if(!D.delArm){D.keep();D.delArm=true;drawEvent();return;}
 const {error}=await SB.from('events').delete().eq('id',D.edit);if(error){toast(errMsg(error),true);return;}
 closeDrawer();await refresh();toast('حُذفت الفعالية. صورها باقية في الذكريات');
}
async function openEventPhotos(id){
 const e=EVS.find(x=>x.id===+id);if(!e)return;
 let al=albumOfEvent(e.id);
 if(!al){const {data,error}=await SB.from('albums').insert({title:e.title,event_id:e.id}).select().single();if(error){toast(errMsg(error),true);return;}await loadAll();al=data;}
 S.view='photos';S.album=al.id;render();window.scrollTo({top:0});
}

/* ---------- albums ---------- */
function vPhotos(){
 if(S.album&&ALB.find(a=>a.id===S.album))return vAlbum();
 S.album=null;
 const total=Object.values(PH).reduce((n,l)=>n+l.length,0);
 const albums=[...ALB].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const card=a=>{const ps=PH[a.id]||[];const c=ps.find(p=>p.id===a.cover_photo_id)||ps[0];const e=a.event_id&&EVS.find(x=>x.id===a.event_id);
  return `<button type="button" class="card albc" data-alb="${a.id}"><span class="cvr">${c?`<img src="${esc(photoUrl(c.thumb_path))}" alt="" loading="lazy">`:ic('img',34,'#C9BC9C')}</span>
   <span class="tx"><b>${esc(a.title)}</b><span class="sub">${pc(ps.length)}${e?' · '+esc(fmtD({day:'numeric',month:'short',year:'numeric'}).format(new Date(e.starts_at))):a.year?' · '+a.year:''}</span>${!ps.length?'<span class="badge b-gold" style="height:22px;font-size:11.5px">فارغ، لا يظهر في الموقع</span>':''}</span></button>`;};
 const pastNoAlbum=EVS.filter(e=>evEnd(e)<new Date()&&!albumOfEvent(e.id)).slice(0,6);
 return `<div class="ph"><div><h1>الصور</h1><p>${ALB.length} ألبوم · ${pc(total)}. كل ألبوم فيه صور يظهر في صفحة الذكريات</p></div>
  <div class="sp"><button class="btn p" type="button" data-act="addAlbum">${ic('plus')}ألبوم جديد</button></div></div>
  ${pastNoAlbum.length?`<div class="note" style="background:var(--goldbg);color:#5E4716;margin-bottom:18px;flex-wrap:wrap;align-items:center">${ic('info',18,'#8A6A26')}<span>فعاليات انتهت ولم تُضف صورها:</span>${pastNoAlbum.map(e=>`<button class="btn sm" type="button" data-evph="${e.id}">${esc(e.title)}</button>`).join('')}</div>`:''}
  ${albums.length?`<div class="albg">${albums.map(card).join('')}</div>`:`<section class="card"><div class="empty">لا توجد ألبومات بعد. أنشئ ألبومًا للصور القديمة، أو افتح أي فعالية واضغط «إضافة صور».</div></section>`}`;
}
function vAlbum(){
 const a=ALB.find(x=>x.id===S.album);const ps=PH[a.id]||[];const e=a.event_id&&EVS.find(x=>x.id===a.event_id);const mine=canMod(a);
 return `<button class="lnk" type="button" data-act="albBack" style="margin:0 0 10px">‹ كل الألبومات</button>
  <div class="ph"><div><h1>${esc(a.title)}</h1><p>${e?'ألبوم فعالية · '+esc(gDate(new Date(e.starts_at))):a.year?'سنة '+a.year:'ألبوم'} · ${pc(ps.length)}${a.description?'<br>'+esc(a.description):''}</p></div>
  <div class="sp"><label class="btn p" for="upl" style="cursor:pointer">${ic('plus')}رفع صور</label><input id="upl" type="file" accept="image/*" multiple hidden>
   ${mine?`<button class="btn" type="button" data-act="editAlbum">${ic('edit',16)}تعديل</button><button class="btn no" type="button" data-act="delAlbum">${ic('trash',16)}${S.albDel?'اضغط مرة ثانية لحذف الألبوم وصوره':'حذف الألبوم'}</button>`:''}
   ${ps.length?`<a class="btn" href="memories.html#album-${a.id}" target="_blank" rel="noopener">${ic('eye',16)}عرض في الموقع</a>`:''}</div></div>
  <div id="upst"></div>
  ${ps.length?`<div class="phg">${ps.map(p=>`<figure class="phi ${p.id===a.cover_photo_id?'cov':''}"><img src="${esc(photoUrl(p.thumb_path))}" alt="" loading="lazy">
   ${p.caption?`<figcaption>${esc(p.caption)}</figcaption>`:''}
   <span class="pa">${p.id===a.cover_photo_id?'<span class="badge b-ok" style="height:24px">الغلاف</span>':mine?`<button type="button" class="pb" data-cover="${p.id}" title="اجعلها غلاف الألبوم">${ic('star',15)}</button>`:''}
    ${canMod(p)?`<button type="button" class="pb" data-cap="${p.id}" title="تعليق">${ic('edit',15)}</button><button type="button" class="pb" data-delph="${p.id}" title="حذف">${ic('trash',15)}</button>`:''}</span></figure>`).join('')}</div>`
  :`<label class="card drop" for="upl">${ic('img',40,'#C9BC9C')}<b>ارفع صور ${esc(a.title)}</b><span class="sub">اختر صورًا من جوالك أو جهازك، ويمكنك اختيار أكثر من صورة مرة واحدة</span></label>`}`;
}
function drawAlbum(){
 const a=D.edit?ALB.find(x=>x.id===D.edit):null;
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">${a?'تعديل الألبوم':'ألبوم جديد'}</h3><div class="sub" style="margin-top:4px">${a&&a.event_id?'ألبوم مرتبط بفعالية':'للصور القديمة أو أي مناسبة غير مسجلة في التقويم'}</div></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <form class="db" onsubmit="return false" novalidate>
  <div class="f"><label for="alT">اسم الألبوم</label><input class="inp" id="alT" maxlength="120" value="${esc(a?a.title:'')}" placeholder="مثال: صور الجد حمد القديمة"><span class="err" id="eAT">اكتب اسم الألبوم</span></div>
  ${a&&a.event_id?'':`<div class="f"><label for="alY">السنة <span class="sub">(اختياري)</span></label><input class="inp" id="alY" inputmode="numeric" value="${a&&a.year?a.year:''}" placeholder="مثال: 1995"><span class="err" id="eAY">سنة غير صحيحة</span></div>`}
  <div class="f"><label for="alX">وصف <span class="sub">(اختياري)</span></label><textarea class="inp" id="alX" maxlength="1000">${esc(a?a.description||'':'')}</textarea></div>
 </form>
 <div class="df"><button class="btn p" type="button" data-act="saveAlbum">${a?'حفظ':'إنشاء الألبوم'}</button><button class="btn" type="button" data-act="close">إلغاء</button></div>`;
}
async function saveAlbum(){
 const t=val('alT'),yRaw=val('alY'),x=val('alX');let ok=true;const show=(id,on)=>{const e=document.getElementById(id);if(e)e.classList.toggle('on',on);if(on)ok=false;};
 const y=yRaw?toYear(yRaw):null;show('eAT',!t);show('eAY',Number.isNaN(y)||(y!=null&&(y<1900||y>YEAR)));if(!ok)return;
 const row={title:t,description:x||null};if(document.getElementById('alY'))row.year=y;
 const r=D.edit?await SB.from('albums').update(row).eq('id',D.edit).select().maybeSingle():await SB.from('albums').insert(row).select().single();
 if(r.error||!r.data){toast(r.error?errMsg(r.error):'ليست لديك صلاحية لهذا الإجراء',true);return;}
 const was=D.edit;closeDrawer();S.view='photos';S.album=r.data.id;await refresh();toast(was?'تم الحفظ':'تم إنشاء الألبوم. ارفع صوره الآن');
}
function drawCaption(){
 const p=Object.values(PH).flat().find(x=>x.id===D.photo);
 drawer.innerHTML=`<div class="dh"><div><h3 id="dTitle">تعليق على الصورة</h3></div><button class="x" type="button" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>
 <div class="db"><img src="${esc(photoUrl(p.thumb_path))}" alt="" style="width:100%;border-radius:14px"><div class="f"><label for="cpT">التعليق <span class="sub">(يظهر تحت الصورة)</span></label><textarea class="inp" id="cpT" maxlength="300" placeholder="مثال: الجد حمد مع أبنائه في مزرعة العائلة">${esc(p.caption||'')}</textarea></div></div>
 <div class="df"><button class="btn p" type="button" data-act="saveCap">حفظ</button><button class="btn" type="button" data-act="close">إلغاء</button></div>`;
}

/* ---------- upload ---------- */
function loadImg(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const i=new Image();i.onload=()=>{res(i);};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('صيغة الصورة غير مدعومة'));};i.src=u;});}
async function resize(src,w,h,max,q){const k=Math.min(1,max/Math.max(w,h));const cw=Math.max(1,Math.round(w*k)),ch=Math.max(1,Math.round(h*k));
 const c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,cw,ch);
 const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q));if(!blob)throw new Error('تعذّرت معالجة الصورة');return {blob,w:cw,h:ch};}
async function prepImage(file){
 let src,w,h;
 try{src=await createImageBitmap(file,{imageOrientation:'from-image'});w=src.width;h=src.height;}
 catch(_){src=await loadImg(file);w=src.naturalWidth;h=src.naturalHeight;}
 const full=await resize(src,w,h,2048,.86), thumb=await resize(src,w,h,640,.8);
 if(src.close)src.close();
 return {full,thumb};
}
let uploading=false;
async function uploadFiles(files){
 if(uploading)return;const a=ALB.find(x=>x.id===S.album);if(!a)return;
 files=[...files].filter(f=>/^image\//.test(f.type)||/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
 if(!files.length){toast('اختر ملفات صور',true);return;}
 uploading=true;let done=0,fail=0;const st=()=>{const el=document.getElementById('upst');if(el)el.innerHTML=`<div class="note" style="background:var(--olivebg);color:var(--olive2);margin-bottom:16px;align-items:center">${ic('img',18,'#3E4A24')}<span>جارٍ رفع الصور: ${done+fail} من ${files.length}${fail?' · تعذّر '+fail:''}</span><span class="upbar"><i style="width:${(done+fail)/files.length*100}%"></i></span></div>`;};
 st();
 const queue=[...files];
 const worker=async()=>{while(queue.length){const f=queue.shift();
  try{const {full,thumb}=await prepImage(f);const id=Date.now().toString(36)+Math.random().toString(36).slice(2,8);
   const path=a.id+'/'+id+'.jpg',tpath=a.id+'/t_'+id+'.jpg';
   const u1=await SB.storage.from('photos').upload(path,full.blob,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});if(u1.error)throw u1.error;
   const u2=await SB.storage.from('photos').upload(tpath,thumb.blob,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});if(u2.error){await SB.storage.from('photos').remove([path]);throw u2.error;}
   const {error}=await SB.from('photos').insert({album_id:a.id,path,thumb_path:tpath,width:thumb.w,height:thumb.h});if(error){await SB.storage.from('photos').remove([path,tpath]);throw error;}
   done++;}catch(err){fail++;console.error(err);}
  st();}};
 await Promise.all([worker(),worker()]);
 uploading=false;await refresh();
 toast(fail?`رُفع ${pc(done)}، وتعذّر رفع ${pc(fail)}`:`رُفع ${pc(done)} بنجاح`,!!fail);
}
async function deletePhoto(id,btn){
 if(btn.dataset.armed!=='1'){btn.dataset.armed='1';btn.classList.add('arm');btn.title='اضغط مرة ثانية للحذف';toast('اضغط مرة ثانية لتأكيد حذف الصورة');return;}
 const p=Object.values(PH).flat().find(x=>x.id===id);if(!p)return;
 const {error}=await SB.from('photos').delete().eq('id',id);if(error){toast(errMsg(error),true);return;}
 await SB.storage.from('photos').remove([p.path,p.thumb_path]);
 await refresh();toast('حُذفت الصورة');
}
async function deleteAlbum(){
 if(!S.albDel){S.albDel=true;render();return;}
 S.albDel=false;const a=ALB.find(x=>x.id===S.album);const ps=PH[a.id]||[];
 const {error}=await SB.from('albums').delete().eq('id',a.id);if(error){toast(errMsg(error),true);render();return;}
 const paths=ps.flatMap(p=>[p.path,p.thumb_path]);for(let i=0;i<paths.length;i+=100)await SB.storage.from('photos').remove(paths.slice(i,i+100));
 S.album=null;await refresh();toast('حُذف الألبوم');
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
document.addEventListener('change',e=>{if(e.target&&e.target.id==='upl'&&ME){uploadFiles(e.target.files);e.target.value='';}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(fpv.classList.contains('on')){fpv.className='fpv';fpv.innerHTML='';}else if(D)closeDrawer();}});
document.addEventListener('click',async e=>{
 if(!ME)return;
 const t=e.target.closest('[data-view],[data-act],[data-edit],[data-addchild],[data-ok],[data-no],[data-rqtab],[data-perm],[data-set],[data-rmsup],[data-father],[data-sc],[data-unsc],[data-addscope],[data-rmscope],[data-pp],[data-pvv],[data-pvd],[data-evph],[data-evedit],[data-alb],[data-cover],[data-cap],[data-delph],[data-host]');
 if(!t||fpv.contains(t))return;
 const d=t.dataset;
 if(d.view){S.view=d.view;S.album=null;S.albDel=false;S.tour=null;S.tourEdit=false;render();window.scrollTo({top:0});return;}
 if(d.evph){openEventPhotos(d.evph);return;}
 if(d.evedit){D={mode:'ev',edit:+d.evedit};drawEvent();drawer.classList.add('on');scrim.classList.add('on');return;}
 if(d.host){D.keep();D.host=+d.host;drawEvent();return;}
 if(d.alb){S.album=+d.alb;S.albDel=false;render();window.scrollTo({top:0});return;}
 if(d.cover){const {data,error}=await SB.from('albums').update({cover_photo_id:+d.cover}).eq('id',S.album).select('id').maybeSingle();if(error||!data){toast(error?errMsg(error):'ليست لديك صلاحية لهذا الإجراء',true);return;}await refresh();toast('تم تعيين غلاف الألبوم');return;}
 if(d.cap){D={mode:'cap',photo:+d.cap};drawCaption();drawer.classList.add('on');scrim.classList.add('on');setTimeout(()=>{const c=document.getElementById('cpT');c&&c.focus();},250);return;}
 if(d.delph){deletePhoto(+d.delph,t);return;}
 if(d.father){const keep=collect();D.father=+d.father;D.mom=defaultMom(D.father);drawHTML();restore(keep);return;}
 if(d.sc){D.scs=[...(D.scs||[]),+d.sc].filter((v,i,a)=>a.indexOf(v)===i);if(D.mode==='scope')D.scs=[+d.sc];redrawScopes();return;}
 if(d.unsc){D.scs=(D.scs||[]).filter(r=>r!==+d.unsc);redrawScopes();return;}
 if(d.addscope){D={mode:'scope',sid:+d.addscope,scs:[]};drawAddScope();drawer.classList.add('on');scrim.classList.add('on');return;}
 if(d.rmscope){if(t.dataset.armed!=='1'){t.dataset.armed='1';t.textContent='اضغط للتأكيد';return;}
  const [sid,root]=d.rmscope.split(':').map(Number);const {error}=await SB.from('staff_scopes').delete().eq('staff_id',sid).eq('root_id',root);
  if(error){toast(errMsg(error),true);return;}await refresh();toast('أُزيل الفرع من إشرافه');return;}
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
 if(a==='clearFather'){const keep=collect();D.father=null;D.mom='';drawHTML();restore(keep);return;}
 if(a==='saveScope'){if(!(D.scs&&D.scs.length)){document.getElementById('eC').classList.add('on');return;}
  D.busy=true;drawAddScope();const {error}=await SB.from('staff_scopes').insert({staff_id:D.sid,root_id:D.scs[0]});
  if(error){D.busy=false;drawAddScope();toast(/duplicate|pkey/.test(error.message||'')?'هذا الفرع مضاف له مسبقًا':errMsg(error),true);return;}
  closeDrawer();await refresh();toast('أُضيف الفرع لإشرافه');return;}
 if(a==='more'){S.limit+=25;render();return;}
 if(a==='saveFam'){const v=document.getElementById('famIn').value.trim();if(!v){toast('اكتب اسم العائلة',true);return;}await saveSettings({family_name:v},'تم حفظ اسم العائلة');return;}
 if(a==='saveMe'){const v=document.getElementById('meIn').value.trim();if(!v){toast('اكتب اسمك',true);return;}
  const {error}=await SB.from('staff').update({display_name:v}).eq('id',ME.id);if(error){toast(errMsg(error),true);return;}ME.display_name=v;setMe();toast('تم حفظ اسمك');render();return;}
 if(a==='rmPhoto'){const keep=collect();if(D.pprev)URL.revokeObjectURL(D.pprev);D.pf=null;D.pprev=null;D.premove=!!(D.edit&&by[D.edit].photo);drawHTML();restore(keep);return;}
 if(a==='addEv'){D={mode:'ev',edit:null};drawEvent();drawer.classList.add('on');scrim.classList.add('on');return;}
 if(a==='saveEv'){saveEvent();return;}
 if(a==='delEv'){deleteEvent();return;}
 if(a==='clrHost'){D.keep();D.host=null;drawEvent();return;}
 if(a==='addAlbum'){D={mode:'album',edit:null};drawAlbum();drawer.classList.add('on');scrim.classList.add('on');return;}
 if(a==='editAlbum'){D={mode:'album',edit:S.album};drawAlbum();drawer.classList.add('on');scrim.classList.add('on');return;}
 if(a==='saveAlbum'){saveAlbum();return;}
 if(a==='delAlbum'){deleteAlbum();return;}
 if(a==='albBack'){S.album=null;S.albDel=false;render();return;}
 if(a==='saveCap'){const v=document.getElementById('cpT').value.trim();const {data,error}=await SB.from('photos').update({caption:v||null}).eq('id',D.photo).select('id').maybeSingle();if(error||!data){toast(error?errMsg(error):'ليست لديك صلاحية لهذا الإجراء',true);return;}closeDrawer();await refresh();toast('تم حفظ التعليق');return;}
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
/* ================= tournaments (any game; admin creates, family registers from the tree) ================= */
const TST={draft:['مسودة','b-mute'],open:['التسجيل مفتوح','b-ok'],closed:['التسجيل مغلق','b-gold'],done:['منتهية','b-mute']};
const tourLink=t=>location.origin+location.pathname.replace(/[^/]*$/,'')+'tournaments.html?t='+t.id;
const TE={}; // entries cache per tournament id
async function tourEntries(id,force){
 if(!force&&TE[id])return TE[id];
 const {data,error}=await SB.from('tournament_entries').select('*').eq('tournament_id',id).order('created_at');
 if(error)throw error;TE[id]=data||[];return TE[id];
}
const pName=id=>by[id]?joinN(anc(id).slice(0,3)):'—';
const tWhen=t=>t.starts_at?fmtD({weekday:'long',day:'numeric',month:'long'}).format(new Date(t.starts_at))+' · '+tOf(new Date(t.starts_at)):'الموعد لم يُحدد';
function vTours(){
 if(S.tour==='new')return vTourForm(null);
 if(S.tour){const t=TOURS.find(x=>x.id===S.tour);if(t)return S.tourEdit?vTourForm(t):vTour(t);S.tour=null;}
 const list=TOURS.filter(t=>!t.archived);
 return `<div class="ph"><div><h1>البطولات</h1><p>أنشئ أي بطولة والعائلة تسجّل فيها بأسمائها من الشجرة</p></div>
  <div class="sp"><button class="btn p" type="button" data-act="newTour">${ic('plus')}بطولة جديدة</button></div></div>
  ${list.length?`<div class="invs">${list.map(t=>`<button type="button" class="card invc" data-tour="${t.id}"><div class="ih"><span class="ic" style="background:var(--olivebg)">${ic('trophy',20,'#3E4A24')}</span><span><b>${esc(t.title)}</b><small>${t.team_size===1?'فردي':'فرق من لاعبَين'} · ${esc(tWhen(t))}</small></span><span class="badge ${TST[t.status][1]}">${TST[t.status][0]}</span></div></button>`).join('')}</div>`
  :`<section class="card start"><h2>أول بطولة</h2><p class="muted" style="margin:0;line-height:1.8">أنشئ البطولة، اكتب قوانينها، وافتح التسجيل. ترسل الرابط في قروب العائلة، وكل واحد يسجّل باسمه من الشجرة، وأنت تقبل الطلبات من هنا.</p><button class="btn p" type="button" data-act="newTour">${ic('plus')}بطولة جديدة</button></section>`}`;
}
function vTourForm(t){
 const lp=t&&t.starts_at?localParts(new Date(t.starts_at)):null, dl=t&&t.reg_deadline?keyOf(new Date(new Date(t.reg_deadline).getTime()-1000)):'';
 const ts=t?t.team_size:(S.tsz||2);
 return `<div class="ph"><div><button class="lnk" type="button" data-act="${t?'tourView':'tourBack'}" style="margin:0 0 6px;padding:0">‹ ${t?'رجوع للبطولة':'كل البطولات'}</button><h1>${t?'تعديل البطولة':'بطولة جديدة'}</h1><p>تقدر تعدّل كل شيء لاحقًا، والبطولة ما تظهر للعائلة حتى تفتح التسجيل</p></div></div>
 <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:16px;max-width:760px">
  <div class="f"><label for="tt">اسم البطولة</label><input class="inp" id="tt" maxlength="80" value="${esc(t?t.title:'')}" placeholder="مثل: بطولة السليم للبلوت"></div>
  <div class="f"><span class="lb" id="tszL">نوع التسجيل</span><div class="tabs" role="radiogroup" aria-labelledby="tszL" style="width:100%"><button type="button" class="tab ${ts===2?'on':''}" role="radio" aria-checked="${ts===2}" data-tsz="2" style="flex:1">فرق من لاعبَين</button><button type="button" class="tab ${ts===1?'on':''}" role="radio" aria-checked="${ts===1}" data-tsz="1" style="flex:1">فردي</button></div>
   ${t&&(TE[t.id]||[]).some(e=>e.status!=='rejected')?'<span class="sub">فيه تسجيلات في البطولة، غيّر نوعها بحذر.</span>':''}</div>
  <div class="row2"><div class="f"><label for="td">تاريخ البطولة <span class="sub">(اختياري)</span></label><input class="inp" id="td" type="date" value="${lp?lp.date:''}"></div>
   <div class="f"><label for="tm">الوقت</label><input class="inp" id="tm" type="time" value="${lp?lp.time:'20:00'}"></div></div>
  <div class="row2"><div class="f"><label for="tp">المكان <span class="sub">(اختياري)</span></label><input class="inp" id="tp" maxlength="120" value="${esc(t&&t.place||'')}" placeholder="مثل: استراحة العائلة"></div>
   <div class="f"><label for="tl">آخر يوم للتسجيل <span class="sub">(اختياري)</span></label><input class="inp" id="tl" type="date" value="${dl}"></div></div>
  <div class="f"><label for="tr">نظام المباريات <span class="sub">(اختياري)</span></label><input class="inp" id="tr" maxlength="60" value="${esc(t?t.match_rule||'':'خروج المغلوب · صكّة واحدة')}"></div>
  <div class="f"><label for="tru">قوانين البطولة</label><textarea class="inp" id="tru" maxlength="3000" rows="7" style="min-height:160px;line-height:1.9" placeholder="اكتب كل قانون في سطر">${esc(t&&t.rules||'')}</textarea><span class="sub">كل سطر يظهر في صفحة البطولة كبند مستقل.</span></div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><button class="btn p" type="button" data-act="saveTour">${ic('check')}${t?'حفظ التعديلات':'إنشاء البطولة'}</button>
   ${t?`<button class="btn no" type="button" data-act="archTour" style="margin-inline-start:auto">${ic('trash',16)}${S.tourArm?'متأكد؟ اضغط مرة ثانية للحذف':'حذف البطولة'}</button>`:''}</div>
 </section>`;
}
function tourCollect(){
 const g=id=>(document.getElementById(id)||{}).value||'';
 const date=g('td'),time=g('tm')||'20:00',dl=g('tl');
 return {title:g('tt').trim(),team_size:S.tsz||2,place:g('tp').trim()||null,match_rule:g('tr').trim()||null,rules:g('tru').trim()||null,
  starts_at:date?atRiyadh(date,time).toISOString():null,reg_deadline:dl?atRiyadh(dl,'23:59').toISOString():null};
}
function vTour(t){
 const es=TE[t.id];
 if(!es){tourEntries(t.id).then(()=>{if(S.view==='tours'&&S.tour===t.id)render();}).catch(err=>toast(errMsg(err),true));}
 const all=(es||[]).filter(e=>!(e.status==='rejected'&&e.note&&/^دُمج/.test(e.note)));
 const two=t.team_size===2;
 const pend=all.filter(e=>e.status==='pending'&&e.kind==='team'), ok=all.filter(e=>e.status==='approved'&&e.kind==='team');
 const solo=all.filter(e=>e.kind==='solo'&&e.status!=='rejected'), rej=all.filter(e=>e.status==='rejected');
 const tab=S.tourTab||(pend.length?'pend':'ok');
 const who=e=>two&&e.kind==='team'?`${esc(e.team_name||'فريق بدون اسم')}`:esc(pName(e.p1_id));
 const sub=e=>[two&&e.kind==='team'?esc(pName(e.p1_id))+' · '+esc(pName(e.p2_id)):'',`<span dir="ltr">${esc(e.phone)}</span>`+(e.phone2?` · <span dir="ltr">${esc(e.phone2)}</span>`:''),esc(ago(e.created_at))].filter(Boolean).join(' · ');
 const row=(e,acts)=>`<div class="li">${avatar(e.p1_id)}<div class="tx"><b>${who(e)}</b><div class="sub">${sub(e)}</div></div>${acts}</div>`;
 const decide=e=>`<span style="display:flex;gap:6px">${e.status!=='approved'?`<button class="btn sm ok" type="button" data-tok="${e.id}">${ic('check',15)}قبول</button>`:''}${e.status!=='rejected'?`<button class="btn sm no" type="button" data-tno="${e.id}">رفض</button>`:''}</span>`;
 const wa=e=>`<a class="btn sm" href="https://wa.me/966${esc(e.phone.slice(1))}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">واتساب</a>`;
 let body;
 if(!es)body='<section class="card"><div class="empty">جارٍ التحميل…</div></section>';
 else if(tab==='pend')body=`<section class="card"><div class="list">${pend.length?pend.map(e=>row(e,decide(e))).join(''):'<div class="empty">لا توجد طلبات جديدة.</div>'}</div></section>`;
 else if(tab==='ok')body=`<section class="card"><div class="ch"><h2>${two?'الفرق المؤكدة':'المشاركون المؤكدون'} (${ok.length})</h2>${ok.length?'<button class="lnk" type="button" data-act="copyTeams">نسخ القائمة</button>':''}</div><div class="list">${ok.length?ok.map(e=>row(e,`<span style="display:flex;gap:6px">${wa(e)}<button class="btn sm no" type="button" data-tno="${e.id}">إلغاء</button></span>`)).join(''):'<div class="empty">لا يوجد مؤكدون بعد.</div>'}</div></section>`;
 else if(tab==='solo'){const sel=S.tsel||[];body=`<section class="card"><div class="ch"><h2>بدون شريك (${solo.length})</h2><span class="sub" style="margin-inline-start:auto">اختر اثنين واجمعهم في فريق</span></div><div class="list">${solo.length?solo.map(e=>`<label class="li" style="cursor:pointer"><input type="checkbox" data-tsel="${e.id}" ${sel.includes(e.id)?'checked':''} style="width:20px;height:20px">${avatar(e.p1_id)}<div class="tx"><b>${esc(pName(e.p1_id))}</b><div class="sub"><span dir="ltr">${esc(e.phone)}</span> · ${esc(ago(e.created_at))}</div></div>${e.status!=='rejected'?`<button class="btn sm no" type="button" data-tno="${e.id}">رفض</button>`:''}</label>`).join('')+
   `<div class="li" style="border-bottom:0;flex-wrap:wrap"><input class="inp" id="pairName" maxlength="30" placeholder="اسم الفريق (اختياري)" style="max-width:240px"><button class="btn p" type="button" data-act="pairTour" ${sel.length===2?'':'disabled'}>${ic('plus')}اجمعهم في فريق${sel.length?' ('+sel.length+' محدد)':''}</button><span class="sub">يتأكد الفريق مباشرة ويظهر في الصفحة</span></div>`:'<div class="empty">لا يوجد أحد يبحث عن شريك.</div>'}</div></section>`;}
 else body=`<section class="card"><div class="list">${rej.length?rej.map(e=>row(e,`<button class="btn sm ok" type="button" data-tok="${e.id}">${ic('check',15)}قبول</button>`)).join(''):'<div class="empty">لا يوجد مرفوضون.</div>'}</div></section>`;
 const tabs=[['pend','بانتظار المراجعة',pend.length],['ok',two?'الفرق المؤكدة':'المؤكدون',ok.length],...(two?[['solo','بدون شريك',solo.length]]:[]),['rej','المرفوضة',rej.length]];
 return `<div class="ph"><div><button class="lnk" type="button" data-act="tourBack" style="margin:0 0 6px;padding:0">‹ كل البطولات</button><h1>${esc(t.title)}</h1><p>${two?'فرق من لاعبَين':'فردي'} · ${esc(tWhen(t))}${t.place?' · '+esc(t.place):''}</p></div>
  <div class="sp"><button class="btn" type="button" data-act="editTour">${ic('edit')}تعديل البطولة</button><a class="btn" href="${esc(tourLink(t))}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">${ic('eye')}معاينة الصفحة</a></div></div>
  <section class="card share"><div class="tx"><b>${TST[t.status][0]}${t.reg_deadline?' · آخر يوم للتسجيل '+esc(fmtD({day:'numeric',month:'long'}).format(new Date(t.reg_deadline))):''}</b><div class="lk" dir="ltr">${esc(tourLink(t))}</div></div>
   <div class="tabs" role="radiogroup" aria-label="حالة البطولة">${['draft','open','closed','done'].map(k=>`<button type="button" class="tab ${t.status===k?'on':''}" role="radio" aria-checked="${t.status===k}" data-tstat="${k}">${{draft:'مسودة',open:'مفتوح',closed:'مغلق',done:'منتهية'}[k]}</button>`).join('')}</div>
   <div class="sacts"><button class="btn p" type="button" data-act="waTour">إرسال في واتساب</button><button class="btn" type="button" data-act="copyTour">نسخ الرابط</button></div></section>
  ${t.status==='draft'?`<div class="note" style="background:var(--goldbg);color:#5E4716;margin-top:12px">${ic('info',18,'#8A6A26')}<span>البطولة مسودة: ما يشوفها إلا أنت. جرّب التسجيل من «معاينة الصفحة»، وإذا جهزت اضغط «مفتوح».</span></div>`:''}
  <div class="kpis" style="margin-top:16px">
   <div class="card kpi"><span class="l">${two?'فرق مؤكدة':'مشاركون مؤكدون'}</span><span class="v" style="color:var(--olive)">${es?ok.length:'…'}</span></div>
   <div class="card kpi"><span class="l">بانتظار المراجعة</span><span class="v" style="color:#8A6A26">${es?pend.length:'…'}</span></div>
   ${two?`<div class="card kpi"><span class="l">يبحثون عن شريك</span><span class="v">${es?solo.length:'…'}</span></div>`:''}
   <div class="card kpi"><span class="l">إجمالي اللاعبين</span><span class="v">${es?ok.concat(pend).reduce((n,e)=>n+(e.p2_id?2:1),0)+solo.length:'…'}</span></div></div>
  <div class="tabs" style="margin-bottom:14px">${tabs.map(([k,x,n])=>`<button type="button" class="tab ${tab===k?'on':''}" data-ttab="${k}">${x} (${n})</button>`).join('')}</div>
  ${body}`;
}
function tourMsg(t){
 let m=`السلام عليكم ورحمة الله وبركاته\n\nفتحنا التسجيل في «${t.title}»`;
 if(t.starts_at){const d=new Date(t.starts_at);m+=`\n\n🗓 ${fmtD({weekday:'long',day:'numeric',month:'long'}).format(d)} (${hDate(d)})\n⏰ ${tOf(d)}`;}
 if(t.place)m+=`\n📍 ${t.place}`;
 m+=`\n\n${t.team_size===2?'سجّل فريقك أو سجّل وحدك ونرتّب لك شريكًا':'سجّل باسمك'} من الرابط:\n${tourLink(t)}`;
 if(t.reg_deadline)m+=`\n\nآخر يوم للتسجيل: ${fmtD({weekday:'long',day:'numeric',month:'long'}).format(new Date(t.reg_deadline))}`;
 return m;
}
async function tourSet(e,patch,msg){
 const {error}=await SB.from('tournament_entries').update(Object.assign({decided_at:new Date().toISOString(),decided_by:myName()},patch)).eq('id',e.id);
 if(error){toast(errMsg(error),true);return;}Object.assign(e,patch);render();toast(msg);
}
document.addEventListener('change',e=>{const c=e.target.closest('[data-tsel]');if(!c||!ME)return;const id=+c.dataset.tsel;let s=S.tsel||[];s=c.checked?[...s.filter(x=>x!==id),id].slice(-2):s.filter(x=>x!==id);S.tsel=s;const n=document.getElementById('pairName'),v=n?n.value:'';render();const n2=document.getElementById('pairName');if(n2)n2.value=v;});
document.addEventListener('click',async e=>{
 if(!ME||!isAdmin())return;
 const x=e.target.closest('[data-tour],[data-ttab],[data-tstat],[data-tok],[data-tno],[data-tsz],[data-act="newTour"],[data-act="tourBack"],[data-act="tourView"],[data-act="editTour"],[data-act="saveTour"],[data-act="archTour"],[data-act="waTour"],[data-act="copyTour"],[data-act="copyTeams"],[data-act="pairTour"]');
 if(!x)return;const d=x.dataset,t=TOURS.find(v=>v.id===S.tour);
 if(d.tour){S.tour=+d.tour;S.tourEdit=false;S.tourTab=null;S.tsel=[];render();window.scrollTo({top:0});return;}
 if(d.ttab){S.tourTab=d.ttab;render();return;}
 if(d.tsz){const v=tourCollect();S.tsz=+d.tsz;render();const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};set('tt',v.title);set('tp',v.place||'');set('tr',v.match_rule||'');set('tru',v.rules||'');return;}
 if(d.act==='newTour'){S.tour='new';S.tsz=2;S.tourArm=false;render();window.scrollTo({top:0});document.getElementById('tt').focus();return;}
 if(d.act==='tourBack'){S.tour=null;S.tourEdit=false;render();return;}
 if(d.act==='tourView'){S.tourEdit=false;S.tourArm=false;render();return;}
 if(d.act==='editTour'){S.tourEdit=true;S.tsz=t.team_size;S.tourArm=false;render();window.scrollTo({top:0});return;}
 if(d.act==='saveTour'){
  const v=tourCollect();
  if(v.title.length<2){toast('اكتب اسم البطولة',true);document.getElementById('tt').focus();return;}
  x.disabled=true;
  const r=S.tour==='new'?await SB.from('tournaments').insert(Object.assign(v,{created_by_name:myName()})).select().single():await SB.from('tournaments').update(Object.assign(v,{updated_at:new Date().toISOString()})).eq('id',S.tour).select().single();
  x.disabled=false;
  if(r.error){toast(errMsg(r.error),true);return;}
  const i=TOURS.findIndex(o=>o.id===r.data.id);if(i>=0)TOURS[i]=r.data;else TOURS.unshift(r.data);
  const was=S.tour==='new';S.tour=r.data.id;S.tourEdit=false;render();window.scrollTo({top:0});toast(was?'أُنشئت البطولة كمسودة. جرّبها ثم افتح التسجيل':'تم حفظ البطولة');return;}
 if(d.act==='archTour'){if(!S.tourArm){S.tourArm=true;const v=tourCollect();render();['tt','tp','tr','tru'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.value=[v.title,v.place||'',v.match_rule||'',v.rules||''][i];});return;}
  const {error}=await SB.from('tournaments').update({archived:true,updated_at:new Date().toISOString()}).eq('id',S.tour);if(error){toast(errMsg(error),true);return;}
  t.archived=true;S.tour=null;S.tourEdit=false;S.tourArm=false;render();toast('حُذفت البطولة');return;}
 if(d.tstat){if(d.tstat===t.status)return;const {error}=await SB.from('tournaments').update({status:d.tstat,updated_at:new Date().toISOString()}).eq('id',t.id);if(error){toast(errMsg(error),true);return;}t.status=d.tstat;render();toast({draft:'صارت مسودة: مخفية عن العائلة',open:'فُتح التسجيل وصارت البطولة ظاهرة للعائلة',closed:'أُغلق التسجيل',done:'البطولة منتهية'}[d.tstat]);return;}
 if(d.tok){const en=(TE[S.tour]||[]).find(v=>v.id===+d.tok);if(en)await tourSet(en,{status:'approved'},'تم القبول');return;}
 if(d.tno){e.preventDefault();const en=(TE[S.tour]||[]).find(v=>v.id===+d.tno);if(en)await tourSet(en,{status:'rejected'},'تم الرفض');return;}
 if(d.act==='pairTour'){const s=S.tsel||[];if(s.length!==2)return;x.disabled=true;const n=document.getElementById('pairName');
  const {error}=await SB.rpc('tournament_pair',{p_a:s[0],p_b:s[1],p_team:n?n.value:''});
  if(error){x.disabled=false;toast(errMsg(error),true);return;}
  S.tsel=[];await tourEntries(S.tour,true);S.tourTab='ok';render();toast('تكوّن الفريق وتأكد');return;}
 if(d.act==='waTour'){window.open('https://wa.me/?text='+encodeURIComponent(tourMsg(t)),'_blank','noopener');return;}
 if(d.act==='copyTour'){try{await navigator.clipboard.writeText(tourLink(t));toast('نُسخ الرابط');}catch(_){toast('ما قدرنا ننسخ، انسخ الرابط يدويًا',true);}return;}
 if(d.act==='copyTeams'){const ok=(TE[t.id]||[]).filter(v=>v.status==='approved'&&v.kind==='team');
  const txt=ok.map((v,i)=>`${i+1}. `+(t.team_size===2?`${v.team_name?v.team_name+': ':''}${pName(v.p1_id)} و${pName(v.p2_id)}`:pName(v.p1_id))).join('\n');
  try{await navigator.clipboard.writeText(txt);toast('نُسخت القائمة');}catch(_){toast('ما قدرنا ننسخ',true);}return;}
});

boot();
})();
