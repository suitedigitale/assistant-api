/* public/sd-triggers.js — legge TUTTI i KPI dal DOM e apre/analizza dopo il “Calcola” */
(function () {
  // Selettori principali
  const SELECTORS_CLICK   = ['#calcolaBtn', '[data-cta="calcola"]', 'a[href*="#sdw-open"]'];
  const RESULTS_SCOPE     = ['#kpi-results', '[data-kpi="results"]', '.kpi-results']; // contenitore risultati, se esiste

  // ===== Helpers parsing numeri =====
  const pick = (arr)=>arr.filter(Boolean)[0]||null;
  const getById = (id)=>{ const el=document.getElementById(id); return el?String(el.textContent||''):''; };
  const getByData = (key)=>{ const el=document.querySelector('[data-kpi="'+key+'"]'); return el?String(el.textContent||''):''; };
  const parsePercent = (t)=>{ const s=String(t||'').replace(',','.'); const m=s.match(/-?\d+(?:\.\d+)?/); return m?parseFloat(m[0]):null; };
  const parseMoney   = (t)=>{ const s=String(t||'').replace(/[^\d,.-]/g,'').replace(/\.(?=\d{3}\b)/g,'').replace(',','.'); const n=parseFloat(s); return isNaN(n)?null:n; };

  // Trova valore dentro un contenitore risultati cercando una label
  function findInScope(labelRegex){
    const scopes = RESULTS_SCOPE.map(s=>document.querySelector(s)).filter(Boolean);
    for(const box of scopes){
      const txt = (box.textContent||'').replace(/\s+/g,' ');
      const m = txt.match(labelRegex);
      if(m){
        // prendi la prima cifra dopo il match
        const after = txt.slice(m.index + m[0].length);
        const num = after.match(/-?\d+(?:[.,]\d+)?/);
        if(num){
          const raw = num[0];
          if(labelRegex.source.includes('ROI')) return parsePercent(raw);
          if(labelRegex.source.includes('ROAS')) return parsePercent(raw); // ROAS come numero (es. 3.2)
          // fallback money
          return parseMoney(raw);
        }
      }
    }
    return null;
  }

  function readKPIs() {
    // ROI
    const roi = pick([
      parsePercent(getById('roiKPI')),
      parsePercent(getById('roi')),
      parsePercent(getByData('roi')),
      findInScope(/ROI\s*previsionale/i)
    ]);

    // ROAS
    const roas = pick([
      parsePercent(getById('roasKPI')),
      parsePercent(getById('roas')),
      parsePercent(getByData('roas')),
      findInScope(/ROAS\s*stimato/i)
    ]);

    // Fatturato stimato
    const revenue = pick([
      parseMoney(getById('fatturatoKPI')),
      parseMoney(getById('fat')),
      parseMoney(getByData('fatturato')),
      findInScope(/Fatturato\s*stimato/i)
    ]);

    // Budget ADV mensile
    const budget = pick([
      parseMoney(getById('budgetKPI')),
      parseMoney(getById('bud')),
      parseMoney(getByData('budget')),
      findInScope(/Budget\s*ADV\s*mensile/i)
    ]);

    // Canone
    const canone = pick([
      parseMoney(getById('canoneSuiteDigitaleKPI')),
      parseMoney(getById('can')),
      parseMoney(getByData('canone')),
      findInScope(/Canone/i)
    ]);

    // Utile mensile
    const utile = pick([
      parseMoney(getById('utileKPI')),
      parseMoney(getById('utileMensileKPI')),
      parseMoney(getById('uti')),
      parseMoney(getByData('utile')),
      findInScope(/Utile\s*mensile/i)
    ]);

    // Se ROAS manca ma ho revenue e budget → calcolo
    const roasCalc = (roas==null && revenue!=null && budget>0) ? (revenue / budget) : roas;

    return { roi, roas: roasCalc, revenue, budget, canone, utile };
  }

  // Apri chat e manda analisi silente
  function openAndAnalyse() {
    if (!window.SuiteAssistantChat) return false;
    const kpi = readKPIs();
    window.SuiteAssistantChat.analyseKPIsSilently(kpi, 'Simulazione eseguita dal configuratore');
    return true;
  }

  // Click listener sui bottoni Calcola
  function initClicks() {
    SELECTORS_CLICK.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !el.__sdw) {
        el.__sdw = 1;
        el.addEventListener('click', () => {
          // aspetta un attimo che i risultati compaiano nel DOM
          setTimeout(openAndAnalyse, 400);
        });
      }
    });

    // fallback: delega globale se il testo contiene “calcola la tua crescita”
    document.addEventListener('click', (e)=>{
      const btn = e.target.closest('button, a, [role="button"]');
      if (!btn) return;
      const txt = (btn.textContent || '').toLowerCase();
      if (txt.includes('calcola la tua crescita')){
        setTimeout(openAndAnalyse, 400);
      }
    }, true);
  }

  function boot() {
    if (!window.SuiteAssistantChat) { setTimeout(boot, 300); return; }
    initClicks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
