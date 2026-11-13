// شجرتنا — shared site chrome behaviour: rotating Quran verses banner, today's date, header shadow, footer year.
(function(){
  const AYAT = [
    {t:'وَاتَّقُوا اللَّهَ الَّذِي تَسَاءَلُونَ بِهِ وَالْأَرْحَامَ ۚ إِنَّ اللَّهَ كَانَ عَلَيْكُمْ رَقِيبًا', r:'سورة النساء · الآية ١'},
    {t:'وَالَّذِينَ يَصِلُونَ مَا أَمَرَ اللَّهُ بِهِ أَن يُوصَلَ وَيَخْشَوْنَ رَبَّهُمْ وَيَخَافُونَ سُوءَ الْحِسَابِ', r:'سورة الرعد · الآية ٢١'},
    {t:'يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَاكُمْ شُعُوبًا وَقَبَائِلَ لِتَعَارَفُوا', r:'سورة الحجرات · من الآية ١٣'},
    {t:'وَآتِ ذَا الْقُرْبَىٰ حَقَّهُ وَالْمِسْكِينَ وَابْنَ السَّبِيلِ', r:'سورة الإسراء · من الآية ٢٦'}
  ];
  const DUR = 9000;
  const IC_PAUSE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  const IC_PLAY = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  function banner(box){
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vEl = box.querySelector('.verse'), rEl = box.querySelector('.ref'), dEl = box.querySelector('.dots'), pp = box.querySelector('.pp');
    dEl.innerHTML = AYAT.map((a,i)=>`<button class="dot" type="button" aria-label="الآية ${i+1} من ${AYAT.length}" data-i="${i}"><span></span></button>`).join('');
    box.style.setProperty('--dur', DUR+'ms');
    let cur = -1, timer = null, outT = null, paused = false, hover = false, left = DUR, startedAt = 0;
    function show(i){
      clearTimeout(outT);
      cur = (i + AYAT.length) % AYAT.length;
      const a = AYAT[cur];
      // keep Quranic pause marks (U+06D6–U+06ED) attached to the preceding word
      const words = a.t.split(' ').reduce((acc,w)=>{ if(/^[ۖ-ۭ]$/.test(w) && acc.length) acc[acc.length-1] += ' '+w; else acc.push(w); return acc; }, []);
      vEl.classList.remove('out');
      vEl.innerHTML = '<span><span class="br" aria-hidden="true">﴿</span>' + words.map((w,k)=>`<span class="w" style="animation-delay:${reduce?0:k*70}ms">${w}</span>`).join(' ') + '<span class="br" aria-hidden="true">﴾</span></span>';
      rEl.textContent = a.r; rEl.classList.remove('on'); void rEl.offsetWidth; rEl.classList.add('on');
      [...dEl.children].forEach((d,k)=>{ d.classList.toggle('on',k===cur); d.classList.toggle('done',k<cur); d.setAttribute('aria-current', k===cur ? 'true' : 'false'); const s=d.firstChild; s.style.animation='none'; void s.offsetWidth; s.style.animation=''; });
      left = DUR; schedule();
    }
    function schedule(){ clearTimeout(timer); timer = null; if(paused || hover || document.hidden) return; startedAt = Date.now(); timer = setTimeout(next, left); }
    function next(){ vEl.classList.add('out'); outT = setTimeout(()=>show(cur+1), reduce ? 0 : 520); }
    function hold(){ if(timer){ clearTimeout(timer); timer = null; left = Math.max(0, left - (Date.now() - startedAt)); } box.classList.add('paused'); }
    function resume(){ if(paused || hover) return; box.classList.remove('paused'); schedule(); }
    function setPP(){ pp.innerHTML = paused ? IC_PLAY : IC_PAUSE; pp.setAttribute('aria-label', paused ? 'تشغيل تبديل الآيات' : 'إيقاف تبديل الآيات'); }
    dEl.addEventListener('click', e=>{ const b = e.target.closest('.dot'); if(b) show(+b.dataset.i); });
    pp.addEventListener('click', ()=>{ paused = !paused; setPP(); paused ? hold() : resume(); });
    box.addEventListener('mouseenter', ()=>{ hover = true; hold(); });
    box.addEventListener('mouseleave', ()=>{ hover = false; resume(); });
    box.addEventListener('focusin', ()=>{ hover = true; hold(); });
    box.addEventListener('focusout', e=>{ if(!box.contains(e.relatedTarget)){ hover = false; resume(); } });
    document.addEventListener('visibilitychange', ()=>{ document.hidden ? hold() : resume(); });
    setPP(); show(0);
  }

  function init(){
    document.querySelectorAll('.ayah').forEach(banner);

    const now = new Date();
    const t = document.querySelector('.hdr .today');
    if(t){
      const tz = {timeZone:'Asia/Riyadh'};
      t.querySelector('b').textContent = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', Object.assign({weekday:'long', day:'numeric', month:'long', year:'numeric'}, tz)).format(now).replace(/\s*هـ$/,'') + ' هـ';
      t.querySelector('span').textContent = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', Object.assign({day:'numeric', month:'long', year:'numeric'}, tz)).format(now) + ' م';
    }
    document.querySelectorAll('[data-year]').forEach(el => el.textContent = now.getFullYear());

    const hdr = document.querySelector('.hdr');
    if(hdr){ const f = () => hdr.classList.toggle('scrolled', scrollY > 8); addEventListener('scroll', f, {passive:true}); f(); }

    document.querySelectorAll('[data-totop]').forEach(b => b.addEventListener('click', () => scrollTo({top:0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'})));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
