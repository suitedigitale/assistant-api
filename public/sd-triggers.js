(function(){
  // ----- CONFIG SELECTORS: adatta se servono -----
  const SEL = {
    calcBtn: 'button[id*="calcola"], button[aria-label*="calcola"], [data-cta="calcola"]',
    resultsBox: '#kpi-results, [data-kpi="results"], .kpi-results',
    // Se i KPI sono stampati con label testuali, cerchiamo per testo:
    roi:  /ROI/i,
    roas: /ROAS/i,
    cpl:  /CPL/i,
    cpa:  /CPA/i,
    budget:/Budget/i
  };

  function $(s, root=document){ try { return root.querySelector(s); } catch { return null; } }
  function $all(s, root=document){ try { return [...root.querySelectorAll(s)]; } catch { return []; } }

  const num = (t) => {
    if (!t) return null;
    const m = String(t).replace(/\s/g,'').match(/-?\d+[.,]?\d*/);
    if (!m) return null;
    return parseFloat(m[0].replace(',', '.'));
  };

  // Estrae KPI dal box risultati (per etichette testuali tipo "ROI: 95,3%")
  function scrapeKpi() {
    const box = $(SEL.resultsBox) || document.body;
    const textNodes = $all('*', box)
      .filter(el => el.childElementCount === 0)
      .map(el => el.textContent.trim())
      .filter(Boolean);

    const findVal = (regex) => {
      const t = textNodes.find(t => regex.test(t));
      if (!t) return null;
      return num(t);
    };

    const kpi = {
      roi:  findVal(SEL.roi),
      roas: findVal(SEL.roas),
      cpl:  findVal(SEL.cpl),
      cpa:  findVal(SEL.cpa),
      budget: findVal(SEL.budget)
    };

    // fallbacks percentuali
    if (kpi.roi == null) {
      // se troviamo qualcosa tipo "ROI: -94.9%" il num() sopra l’ha già preso
    }

    return kpi;
  }

  function openChatWelcome() {
    window.SuiteAssistantChat?.open({ greet:true });
  }

  function openChatWithAnalysis() {
    const kpi = scrapeKpi();
    window.SuiteAssistantChat?.open();
    setTimeout(() => {
      const msg = kpi && (kpi.roi != null || kpi.roas != null)
        ? `Analizza questi KPI e dammi una valutazione sintetica in 4-6 punti: ${JSON.stringify(kpi)}`
        : 'Analizza i miei KPI dal simulatore e fammi un riepilogo con suggerimenti.';
      window.SuiteAssistantChat?.ask(msg, { kpi });
    }, 300);
  }

  // Click sul pulsante di calcolo → apre chat e chiede analisi
  function wireCalc() {
    const btn = $(SEL.calcBtn);
    if (btn && !btn.__sdCalc) {
      btn.__sdCalc = 1;
      btn.addEventListener('click', () => {
        // aspetta che i risultati compaiano
        setTimeout(openChatWithAnalysis, 800);
      });
    }
  }

  // Se il box risultati entra in viewport, apri e analizza (fallback)
  function observeResults() {
    const box = $(SEL.resultsBox);
    if (!box || !('IntersectionObserver' in window)) return;
    let done = false;
    const io = new IntersectionObserver((entries)=>{
      const e = entries[0];
      if (!done && e && e.isIntersecting) { done = true; io.disconnect(); openChatWithAnalysis(); }
    }, { threshold: .4 });
    io.observe(box);
  }

  function boot() {
    wireCalc();
    observeResults();
    // se l’utente apre dal bubble prima del calcolo
    // la sd-chat chiama open({greet:true})
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[SD] sd-triggers.js pronto');
})();
