/* public/sd-triggers.js — apre la chat al click su "Calcola la tua crescita" e legge i KPI dal DOM.
   Supporta anche SD_KPI via postMessage. */
(function(){
  let wired = false;

  // ---------------------------
  // 1) postMessage (se presente)
  // ---------------------------
  window.addEventListener('message', function(ev){
    const d = ev && ev.data;
    if (!d || d.type !== 'SD_KPI') return;
    const kpi = d.payload || {};
    const note = d.context ? JSON.stringify(d.context) : '';
    runAnalysis(kpi, note);
  }, false);

  // --------------------------------------------
  // 2) Fallback: intercetta "Calcola la tua crescita"
  // --------------------------------------------
  function textContains(el, txt){
    return el && typeof el.innerText==='string' && el.innerText.toLowerCase().includes(txt.toLowerCase());
  }

  function findCalcButtons(){
    const all = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    return all.filter(el => textContains(el,'calcola la tua crescita'));
  }

  function onceWireCalc(){
    if (wired) return;
    const btns = findCalcButtons();
    if (!btns.length) { setTimeout(onceWireCalc, 600); return; }
    wired = true;
    btns.forEach(b=>{
      if (b.__sdw) return;
      b.__sdw = 1;
      b.addEventListener('click', () => {
        // aspetta che i risultati si aggiornino
        setTimeout(()=> {
          const kpi = scrapeKPIFromDOM();
          runAnalysis(kpi, 'da pulsante "Calcola la tua crescita"');
        }, 700);
      });
    });
    // nel caso compaiano nuovi pulsanti (SPA)
    const mo = new MutationObserver(()=> {
      findCalcButtons().forEach(b=>{
        if (b.__sdw) return;
        b.__sdw = 1;
        b.addEventListener('click', () => {
          setTimeout(()=> {
            const kpi = scrapeKPIFromDOM();
            runAnalysis(kpi, 'da pulsante "Calcola la tua crescita"');
          }, 700);
        });
      });
    });
    mo.observe(document.body, {childList:true, subtree:true});
  }

  // --------------------------------------------
  // 3) Scraping KPI
  // --------------------------------------------
  const nrm = s => (s||'').replace(/\s+/g,' ').trim();

  function pickNumberFrom(el){
    if (!el) return null;
    const t = el.innerText || '';
    // numero con € o migliaia, virgole/punti italiani
    const m = t.match(/-?\s*€?\s*[\d\.\s]+(?:,\d+)?| -?\d+(?:,\d+)?x| -?\d+(?:,\d+)?%/g);
    if (!m) return null;
    return m[0];
  }

  function parseCurrency(str){
    if (!str) return null;
    let s = (''+str).replace(/[^\d,\.\-]/g,'');
    // IT: separatore decimale spesso la virgola
    if (s.indexOf(',')>-1 && s.indexOf('.')>-1){
      // rimuovi punti migliaia
      s = s.replace(/\./g,'').replace(',','.');
    } else if (s.indexOf(',')>-1){
      s = s.replace(',','.');
    }
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  }

  function parsePercent(str){
    if (!str) return null;
    let s = (''+str).replace('%','').replace(/\./g,'').replace(',','.');
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  }

  function parseRatio(str){
    if (!str) return null;
    let s = (''+str).toLowerCase().replace('x','').replace(/\./g,'').replace(',','.');
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  }

  function findByLabel(label){
    const nodes = Array.from(document.querySelectorAll('div,span,p,li,h1,h2,h3,h4'));
    const lab = nodes.find(n => nrm(n.innerText).toLowerCase().includes(label.toLowerCase()));
    if (!lab) return null;

    // cerca numero nel nodo stesso o nei fratelli/parent
    const candidates = [
      lab,
      lab.nextElementSibling,
      lab.parentElement,
      lab.parentElement && lab.parentElement.nextElementSibling
    ].filter(Boolean);

    for (const c of candidates){
      const raw = pickNumberFrom(c);
      if (raw) return raw;
    }
    // tentativo allargato: tutti i discendenti
    const deep = Array.from((lab.parentElement||lab).querySelectorAll('*'))
      .map(pickNumberFrom).find(Boolean);
    return deep || null;
  }

  function scrapeKPIFromDOM(){
    // mapping etichette -> parser
    const map = {
      revenue: ['Fatturato stimato', parseCurrency],
      budget:  ['Budget ADV mensile', parseCurrency],
      roi:     ['ROI previsionale',   parsePercent],
      roas:    ['ROAS stimato',       parseRatio],
      cpl:     ['CPL stimato',        parseCurrency],
      cpa:     ['CPA stimato',        parseCurrency]
    };

    const out = {};
    Object.keys(map).forEach(key=>{
      const [label, parser] = map[key];
      const raw = findByLabel(label);
      const val = parser(raw);
      if (val!=null) out[key] = val;
    });

    // Utile/Perdita mensile (gestisce segno)
    let profitRaw = findByLabel('Perdita mensile');
    let profit = parseCurrency(profitRaw);
    if (profit!=null){ out.profit = -Math.abs(profit); }
    else {
      profitRaw = findByLabel('Utile mensile');
      profit = parseCurrency(profitRaw);
      if (profit!=null) out.profit = Math.abs(profit);
    }

    return out;
  }

  // --------------------------------------------
  // 4) Avvio analisi
  // --------------------------------------------
  function runAnalysis(kpi, note){
    if (!window.SuiteAssistantChat || typeof window.SuiteAssistantChat.analyseKPIsSilently!=='function'){
      // chat non pronta? ritenta
      return setTimeout(()=>runAnalysis(kpi,note), 250);
    }
    // non avviare se non abbiamo almeno ROI o ROAS o Budget/Fatturato
    const hasAny = kpi && (kpi.roi!=null || kpi.roas!=null || kpi.budget!=null || kpi.revenue!=null || kpi.profit!=null);
    if (!hasAny) return;
    window.SuiteAssistantChat.analyseKPIsSilently(kpi, note||'');
  }

  // bootstrap
  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', onceWireCalc);
  } else {
    onceWireCalc();
  }

  console.log('[SD] sd-triggers.js pronto (click + scraping KPI)');
})();
