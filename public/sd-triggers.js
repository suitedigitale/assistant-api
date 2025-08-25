/* public/sd-triggers.js — aggancia “Calcola la tua crescita” e invia KPI */
(function(){
  const W = window;

  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // -------- parsing helpers (IT) ----------
  function toNum(raw){
    if (raw==null) return null;
    let s = String(raw).replace(/\s+/g,'').replace(/[€]/g,'')
      .replace(/\./g,'').replace(/,/g,'.').replace(/[^\d\.\-]/g,'');
    if (!s || s==='.' || s==='-') return null;
    const n = Number(s);
    return isFinite(n) ? n : null;
  }
  function toPercent(raw){
    const m = String(raw).match(/-?\d+[,\.\d]*/);
    return m ? toNum(m[0]) : null;
  }
  function toRoas(raw){
    const m = String(raw).match(/-?\d+[,\.\d]*/);
    return m ? toNum(m[0]) : null;
  }

  // trova il “valore vicino” al label
  function nextNumericText(el){
    let cur = el;
    for (let depth=0; depth<6 && cur; depth++){
      // siblings
      let s = cur.nextElementSibling;
      while(s){
        const t = (s.textContent||'').trim();
        if (/[€\d]/.test(t)) return t;
        const cand = s.querySelector && s.querySelector('*:not(script):not(style)');
        if (cand && /[€\d]/.test(cand.textContent||'')) return cand.textContent;
        s = s.nextElementSibling;
      }
      // parent scope
      const scope = cur.parentElement;
      if (scope){
        const strongNum = Array.from(scope.querySelectorAll('*')).find(n => /[€\d]/.test((n.textContent||'')));
        if (strongNum) return strongNum.textContent;
      }
      cur = cur.parentElement;
    }
    return '';
  }

  function findLabelEl(labelContains){
    const all = Array.from(document.querySelectorAll('*'));
    return all.find(el =>
      el.children.length === 0 &&
      /[^\s]/.test(el.textContent || '') &&
      (el.textContent||'').toLowerCase().includes(labelContains.toLowerCase())
    ) || null;
  }

  function getFromLabel(label, kind){
    const lab = findLabelEl(label);
    if (!lab) return null;
    const near = nextNumericText(lab);
    const scopeTxt = (lab.closest('[class*="card"], [class*="block"], [class*="box"]') || lab.parentElement || lab).textContent || '';
    const pref = near || scopeTxt;
    if (kind==='percent') return toPercent(pref);
    if (kind==='roas')    return toRoas(pref);
    return toNum(pref);
  }

  function getProfit(){
    const lab = (function(){
      const all = Array.from(document.querySelectorAll('*'));
      return all.find(el => /Perdita mensile|Utile mensile/i.test(el.textContent||'')) || null;
    })();
    if (!lab) return null;
    const raw = nextNumericText(lab) || lab.textContent || '';
    const val = toNum(raw);
    if (val==null) return null;
    const isLoss = /Perdita/i.test((lab.textContent||'') + ' ' + raw);
    return isLoss ? -Math.abs(val) : Math.abs(val);
  }

  function getKPI(){
    const k = {};
    k.revenue = getFromLabel('Fatturato stimato');        // €
    k.budget  = getFromLabel('Budget ADV mensile');       // €
    k.roi     = getFromLabel('ROI previsionale','percent'); // %
    k.roas    = getFromLabel('ROAS stimato','roas');      // x
    k.profit  = getProfit();                              // utile/perdita ±€
    k.cpl     = getFromLabel('CPL stimato');              // €
    k.cpa     = getFromLabel('CPA stimato');              // €

    Object.keys(k).forEach(key => { if (k[key]==null || !isFinite(k[key])) delete k[key]; });
    return k;
  }

  function getContext(){
    const sectorEl = document.querySelector('[aria-label*="Settore"], [id*="settore"]') || document.querySelector('[data-field="settore"]');
    const sector = sectorEl ? (sectorEl.value || sectorEl.textContent || '').trim() : '';
    const b2El = document.querySelector('[data-field*="B2"], .badge-b2b, .badge-b2c');
    const channel = b2El ? (b2El.textContent||'').trim() : '';
    return `Settore: ${sector||'nd'}; Target: ${channel||'nd'}.`;
  }

  function analyseNow(){
    if (!W.SuiteAssistantChat) return;
    const kpi = getKPI();
    if (Object.keys(kpi).length === 0) {
      W.SuiteAssistantChat.open({ autostart:true });
      return;
    }
    W.SuiteAssistantChat.analyseKPIsSilently(kpi, getContext());
  }

  // dopo il click, aspetta che i valori vengano scritti nel DOM
  function waitForKPIsThenAnalyse(){
    const started = Date.now();
    (function tick(){
      const k = getKPI();
      if (Object.keys(k).length >= 2) return analyseNow();
      if (Date.now() - started > 3000) return analyseNow(); // fai quel che puoi
      setTimeout(tick, 150);
    })();
  }

  function wireCalcButton(){
    const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .filter(b => /calcola la tua crescita/i.test(b.textContent||''));
    btns.forEach(b=>{
      if (b.__sdwCalc) return;
      b.__sdwCalc = 1;
      b.addEventListener('click', () => setTimeout(waitForKPIsThenAnalyse, 60));
    });
  }

  onReady(()=>{
    // wiring iniziale e retry (SPA)
    wireCalcButton();
    let tries = 0;
    const id = setInterval(()=>{
      if (++tries>30) return clearInterval(id);
      wireCalcButton();
    }, 700);
  });
})();

