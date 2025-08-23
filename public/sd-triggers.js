(function () {
  // Bottone "Calcola la tua crescita"
  const SELECTORS_CLICK = ['#calcolaBtn', '[data-cta="calcola"]', 'a[href*="#sdw-open"]'];
  // Sezione risultati
  const SELECTORS_RESULTS = ['#kpi-results', '[data-kpi="results"]', '.kpi-results'];

  function openAndExplain() {
    if (!window.SuiteAssistantChat) return false;
    // apre la chat e avvia spiegazione (se i risultati ci sono)
    window.SuiteAssistantChat.open({ autostart: true, forceExplain: true });
    return true;
  }

  function initClicks() {
    SELECTORS_CLICK.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !el.__sdw) {
        el.__sdw = 1;
        el.addEventListener('click', () => setTimeout(openAndExplain, 100)); // attendo che la pagina aggiorni i risultati
      }
    });
  }

  function initResultsObserver() {
    const target = SELECTORS_RESULTS.map(s => document.querySelector(s)).find(Boolean);
    if (!target || !('IntersectionObserver' in window)) return;
    let done = false;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!done && e && e.isIntersecting) {
        done = true; io.disconnect();
        openAndExplain();
      }
    }, { threshold: 0.35 });
    io.observe(target);
  }

  function boot() { initClicks(); initResultsObserver(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
