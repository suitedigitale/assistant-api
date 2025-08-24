/* public/sd-triggers.js — apre la chat e invia l’auto-messaggio al click su “Calcola la tua crescita” */
(function () {
  const SELECTORS_CLICK   = ['#calcolaBtn', '[data-cta="calcola"]', 'a[href*="#sdw-open"]'];
  const SELECTORS_RESULTS = ['#kpi-results', '[data-kpi="results"]', '.kpi-results'];
  const AUTO_MSG = 'Analizza i miei KPI (simulati) e dammi una lettura sintetica in 4–6 punti, con suggerimento di prossimi step e invito alla consulenza gratuita.';

  function openAndAsk() {
    if (!window.SuiteAssistantChat) return false;
    window.SuiteAssistantChat.open({ autostart: false });
    setTimeout(() => {
      const i = document.getElementById('sdw-input');
      const b = document.getElementById('sdw-send');
      if (i && b) { i.value = AUTO_MSG; b.click(); }
    }, 350);
    return true;
  }

  function initClicks() {
    SELECTORS_CLICK.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !el.__sdw) {
        el.__sdw = 1;
        el.addEventListener('click', openAndAsk);
      }
    });

    // fallback: delega globale su elementi cliccabili con testo “calcola la tua crescita”
    document.addEventListener('click', (e)=>{
      const btn = e.target.closest('button, a, [role="button"]');
      if (!btn) return;
      const txt = (btn.textContent || '').toLowerCase();
      if (txt.includes('calcola la tua crescita')) openAndAsk();
    }, true);
  }

  function initResultsObserver() {
    const target = SELECTORS_RESULTS.map(s => document.querySelector(s)).find(Boolean);
    if (!target || !('IntersectionObserver' in window)) return;
    let done = false;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!done && e && e.isIntersecting) {
        done = true; io.disconnect(); openAndAsk();
      }
    }, { threshold: 0.25 });
    io.observe(target);
  }

  function boot() {
    if (!window.SuiteAssistantChat) { setTimeout(boot, 300); return; }
    initClicks();
    initResultsObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
