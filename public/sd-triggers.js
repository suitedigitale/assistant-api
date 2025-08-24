(function(){
  // -------- selettori adattati allo screen --------
  const SEL = {
    calcBtn: 'button[id*="calcola"], button[aria-label*="calcola"], [data-cta="calcola"], button:has(span:contains("Calcola la tua crescita"))',
    resultsRoot: 'section, #kpi-results, [data-kpi="results"], .kpi-results, body'
  };

  // util
  const $ = (s, root=document) => { try { return root.querySelector(s); } catch { return null; } };
  const $$ = (s, root=document) => { try { return [...root.querySelectorAll(s)]; } catch { return []; } };
  const hasNum = (t)=>/\d/.test(t||'');

  const toNumber = (text) => {
    if (!text) return null;
    let s = String(text).replace(/\s/g,'');
    // euro: €1.590  -> 1590
    s = s.replace(/[€]/g,'');
    // 0,2x -> 0,2
    s = s.replace(/x$/i,'');
    // 1.590 -> 1590
    s = s.replace(/\.(?=\d{3}\b)/g,'');
    // virgola -> punto
    s = s.replace(',', '.');
    const m = s.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };

  // cerca vicino all'etichetta (fino a 3 livelli di risalita)
  function findNearValue(labelRegex, valuePattern) {
    const nodes = $$('*', document);
    for (const el of nodes) {
      const t = el.textContent?.trim() || '';
      if (!t) continue;
      if (!labelRegex.test(t)) continue;

      // sale di container e cerca un valore con pattern
      let box = el;
      for (let i=0;i<3 && box; i++) box = box.parentElement;
      const pool = [];
      if (box) pool.push(...$$('*', box));
      pool.unshift(el.nextElementSibling, el.parentElement?.nextElementSibling);

      for (const c of pool) {
        if (!c) continue;
        const txt = c.textContent?.trim() || '';
        const m = txt.match(valuePattern);
        if (m) return toNumber(m[0]);
      }
    }
    return null;
  }

  function scrapeKpi() {
    // pattern ad hoc per quei riquadri
    const ROI   = findNearValue(/ROI\s+previsionale/i, /-?\d+[.,]?\d*\s*%/);
    const ROAS  = findNearValue(/ROAS\s+stimato/i,  /\d+[.,]?\d*\s*x/i);
    const BUDG  = findNearValue(/Budget\s+ADV\s+mensile/i, /€?\s*-?\s*\d[\d\.\,]*/);
    const CPL   = findNearValue(/CPL\s+stimato/i, /€?\s*-?\s*\d[\d\.\,]*/);
    const FATT  = findNearValue(/Fatturato\s+stimato/i, /€?\s*-?\s*\d[\d\.\,]*/);
    const APP   = findNearValue(/Appuntamenti\s+di\s+vendita/i, /-?\s*\d+/);

    const kpi = {};
    if (ROI  != null) kpi.roi  = ROI;    // percentuale
    if (ROAS != null) kpi.roas = ROAS;   // x
    if (BUDG != null) kpi.budget = BUDG; // €
    if (CPL  != null) kpi.cpl = CPL;     // €
    if (FATT != null) kpi.revenue = FATT;
    if (APP  != null) kpi.appointments = APP;

    return kpi;
  }

  function openChatWithAnalysis() {
    const kpi = scrapeKpi();
    window.SuiteAssistantChat?.open();

    // messaggio silenzioso + meta.simulated
    setTimeout(() => {
      const msg = 'Questi sono KPI **simulati** ottenuti in base ai parametri inseriti nel configuratore. Forniscimi un’analisi sintetica (4–6 punti) e suggerimenti ad alto livello.';
      window.SuiteAssistantChat?.ask(msg, { kpi, meta:{ simulated:true }, silent:true });
    }, 300);
  }

  // aggancio al click su "Calcola la tua crescita"
  function wireCalc() {
    // trova per testo, anche se il bottone non ha id/attr
    let btn = $(SEL.calcBtn);
    if (!btn) {
      btn = $$('button').find(b => /calcola\s+la\s+tua\s+crescita/i.test(b.textContent || ''));
    }
    if (btn && !btn.__sdCalc) {
      btn.__sdCalc = 1;
      btn.addEventListener('click', () => {
        // aspetta che i risultati siano dipinti
        setTimeout(openChatWithAnalysis, 900);
      });
    }
  }

  // come fallback: quando il box risultati entra in viewport
  function observeResults() {
    const root = $(SEL.resultsRoot) || document.body;
    if (!('IntersectionObserver' in window)) return;
    let done = false;
    const io = new IntersectionObserver((entries)=>{
      if (done) return;
      const e = entries[0];
      if (e && e.isIntersecting) { done = true; io.disconnect(); openChatWithAnalysis(); }
    }, { threshold: .4 });
    io.observe(root);
  }

  function boot() {
    wireCalc();
    observeResults();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[SD] sd-triggers.js pronto');
})();
