/* public/sd-triggers.js — apre la chat e lancia l’analisi KPI al click su “Calcola la tua crescita” */
(function () {
  function byText(tag, text) {
    const t = text.toLowerCase();
    return Array.from(document.querySelectorAll(tag)).find(
      el => (el.textContent || '').toLowerCase().includes(t)
    );
  }

  function ensure() {
    if (!window.SuiteAssistantChat) {
      setTimeout(ensure, 300);
      return;
    }
    wire();
  }

  function wire() {
    // 1) Trova il pulsante "Calcola la tua crescita"
    let calcBtn =
      document.querySelector('#calcolaBtn, [data-cta="calcola"]') ||
      byText('button', 'calcola la tua crescita') ||
      byText('a', 'calcola la tua crescita');

    if (calcBtn && !calcBtn.__sdw) {
      calcBtn.__sdw = 1;
      calcBtn.addEventListener('click', () => {
        setTimeout(() => {
          window.SuiteAssistantChat.open({ autostart: false });
          window.SuiteAssistantChat.analyse();
        }, 500);
      });
    }

    // 2) Se la sezione risultati entra a viewport, analizza comunque
    const resultsSel = ['#kpi-results', '.kpi-results', '[data-kpi="results"]'];
    const target = resultsSel.map(s => document.querySelector(s)).find(Boolean);
    if (target && 'IntersectionObserver' in window) {
      let done = false;
      const io = new IntersectionObserver((entries) => {
        if (!done && entries[0] && entries[0].isIntersecting) {
          done = true; io.disconnect();
          window.SuiteAssistantChat.open({ autostart: false });
          window.SuiteAssistantChat.analyse();
        }
      }, { threshold: 0.25 });
      io.observe(target);
    }
  }

  ensure();
})();
