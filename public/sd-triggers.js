/* public/sd-triggers.js — apre la chat al click su "Calcola la tua crescita" e legge i KPI dal DOM.
   Supporta anche SD_KPI via postMessage. */
(function(){
  let wired = false;

  // 1) postMessage (se presente)
  window.addEventListener('message', function(ev){
    const d = ev && ev.data;
    if (!d || d.type !== 'SD_KPI') return;
    runAnalysis(d.payload||{}, d.context ? JSON.stringify(d.context) : '');
  }, false);

  // 2) click su "Calcola la tua crescita"
  function textContains(el, txt){
    return el && typeof el.innerText==='string' && el.innerText.toLowerCase().includes(txt.toLowerCase());
  }
  function findCalcButtons(){
    const all = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    return all.filter(el => textContains(el,'calcola la tua crescita'));
  }
  function wireCalc(){
    const btns = findCalcButtons();
    btns.forEach(b=>{
      if (b.__sdw) return;
      b.__sdw = 1;
      b.addEventListener('click', () => {
        setTimeout(()=>{ runAnalysis(scrapeKPIFromDOM(), 'da pulsante "Calcola la tua crescita"'); }, 700);
      });
    });
  }
  function boot(){
    if (wired) return; wired=true;
    wireCalc();
    const mo = new MutationObserver(()=> wireCalc());
    mo.observe(document.body, {childList:true, subtree:true});
  }

  // 3) scraping KPI dal DOM
  const nrm = s => (s||'').replace(/\s+/g,' ').trim();
  function pickNumberFrom(el){
    if (!el) return null;
    const t = el.innerText || '';
    // match numeri con € / percentuali / x
    const m = t.match(/-?\s*€?\s*[0-9.\s]+(?:,\d+)?\s*(?:€)?|-?\s*\d+(?:,\d+)?\s*%|\d+(?:,\d+)?\s*x/gi);
    return m ? m[0] : null;
  }
  function parseCurrency(str){
    if (!str) return null;
    let s = (''+str).replace(/[^\d,\.\-]/g,'');
    if (s.indexOf(',')>-1 && s.indexOf('.')>-1){ s=s.replace(/\./g,'').replace(',','.'); }
    else if (s.indexOf(',')>-1){ s=s.replace(',','.'); }
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  }
  function parsePercent(str){
    if (!str) return null;
    let s=(''+str).replace('%','').replace(/\./g,'').replace(',','.');
    const v=parseFloat(s);
    return isNaN(v)?null:v;
  }
  function parseRatio(str){
    if (!str) return null;
    let s=(''+str).toLowerCase().replace('x','').replace(/\./g,'').replace(',','.');
    const v=parseFloat(s);
    return isNaN(v)?null:v;
  }

  function findByLabel(label){
    // cerca prima i "card" con label
    const nodes = Array.from(document.querySelectorAll('div,section,article,li,span,p,h3,h4'));
    const lab = nodes.find(n => nrm(n.innerText).toLowerCase().includes(label.toLowerCase()));
    if (!lab) return null;

    const candidates = [
      lab,
      lab.nextElementSibling,
      lab.parentElement,
      lab.parentElement && lab.parentElement.nextElementSibling
    ].filter(Boolean);

    for (const c of candidates){
      const raw = pickNumberFrom(c);
      if (raw) return raw;
      const deep = Array.from(c.querySelectorAll('*')).map(pickNumberFrom).find(Boolean);
      if (deep) return deep;
    }
    return null;
  }

  function scrapeKPIFromDOM(){
    const out = {};

    // card principali
    const revRaw = findByLabel('Fatturato stimato');
    const budRaw = findByLabel('Budget ADV mensile');
    const roiRaw = findByLabel('ROI previsionale');
    const roasRaw= findByLabel('ROAS stimato');
    const cplRaw = findByLabel('CPL stimato');
    const cpaRaw = findByLabel('CPA stimato');

    if (revRaw!=null)  out.revenue = parseCurrency(revRaw);
    if (budRaw!=null)  out.budget  = parseCurrency(budRaw);
    if (roiRaw!=null)  out.roi     = parsePercent(roiRaw);
    if (roasRaw!=null) out.roas    = parseRatio(roasRaw);
    if (cplRaw!=null)  out.cpl     = parseCurrency(cplRaw);
    if (cpaRaw!=null)  out.cpa     = parseCurrency(cpaRaw);

    // utile/perdita
    let profitRaw = findByLabel('Perdita mensile');
    let p = parseCurrency(profitRaw);
    if (p!=null) out.profit = -Math.abs(p);
    else{
      profitRaw = findByLabel('Utile mensile');
      p = parseCurrency(profitRaw);
      if (p!=null) out.profit = Math.abs(p);
    }

    // fallback extra: “pillole” in alto (Perdita:, ROI:, Fatturato:)
    if (out.revenue==null){
      const pill = Array.from(document.querySelectorAll('div,span')).find(n=>/Fatturato:\s*/i.test(n.innerText||''));
      if (pill){ const raw=pickNumberFrom(pill); const v=parseCurrency(raw); if(v!=null) out.revenue=v; }
    }
    if (out.roi==null){
      const pill = Array.from(document.querySelectorAll('div,span')).find(n=>/ROI:\s*/i.test(n.innerText||''));
      if (pill){ const raw=pickNumberFrom(pill); const v=parsePercent(raw); if(v!=null) out.roi=v; }
    }
    if (out.profit==null){
      const pill = Array.from(document.querySelectorAll('div,span')).find(n=>/Perdita:\s*/i.test(n.innerText||''));
      if (pill){ const raw=pickNumberFrom(pill); const v=parseCurrency(raw); if(v!=null) out.profit=-Math.abs(v); }
    }

    return out;
  }

  // 4) avvio analisi
  function runAnalysis(kpi, note){
    if (!window.SuiteAssistantChat || typeof window.SuiteAssistantChat.analyseKPIsSilently!=='function'){
      return setTimeout(()=>runAnalysis(kpi,note), 250);
    }
    const hasAny = kpi && (kpi.roi!=null || kpi.roas!=null || kpi.budget!=null || kpi.revenue!=null || kpi.profit!=null);
    if (!hasAny) return;
    window.SuiteAssistantChat.analyseKPIsSilently(kpi, note||'');
  }

  // bootstrap
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[SD] sd-triggers.js pronto (click + scraping KPI)');
})();
