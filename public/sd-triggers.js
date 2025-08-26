/* public/sd-triggers.js — apre la chat su “Calcola” e invia KPI leggendo DAGLI ID REALI */
(function () {
  // ---- ID reali del simulatore ----
  const ID = {
    revenue: '#fatturatoKPI',             // es: "€ 3.250"
    budget:  '#budgetKPI',                // es: "€ 1.590"
    canone:  '#canoneSuiteDigitaleKPI',   // es: "€ 1.106"
    roi:     '#roiKPI',                   // es: "-95,36%"
    roas:    '#roasKPI',                  // es: "0,2x"
    profit:  '#utilePerditaKPI',          // es: "€ -2.570"
    cpl:     '#cplKPI',                   // es: "€ 30"
    cpa:     '#cpaKPI'                    // es: "€ 318"
  };

  // ---- Bottoni “Calcola la tua crescita” ----
  const CALC = ['#calcolaBtn', '[data-cta="calcola"]'];

  // ---- Utilità parsing IT ----
  function deepText(sel) {
    const el = document.querySelector(sel);
    if (!el) return '';
    let t = (el.innerText || el.textContent || '').trim();
    if (/[0-9]/.test(t)) return t;

    // se il nodo è “decorativo”, cerca un figlio con numeri
    const cand = Array.from(el.querySelectorAll('*'))
      .map(n => (n.innerText || n.textContent || '').trim())
      .find(s => /[0-9]/.test(s));
    return cand || '';
  }
  function toNum(txt) {
    if (!txt) return null;
    let t = String(txt).replace(/\s+/g, '');
    // rimuovi simboli comuni e normalizza decimali IT
    t = t.replace(/[€%x]/gi, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(t.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? null : n;
  }
  function readKPI() {
    const kpi = {
      revenue: toNum(deepText(ID.revenue)),
      budget:  toNum(deepText(ID.budget)),
      roi:     toNum(deepText(ID.roi)),
      roas:    toNum(deepText(ID.roas)),
      profit:  toNum(deepText(ID.profit)),
      cpl:     toNum(deepText(ID.cpl)),
      cpa:     toNum(deepText(ID.cpa))
    };
    const meta = { canone: toNum(deepText(ID.canone)) };

    // filtra fuori i null così non passiamo zeri finti all’AI
    Object.keys(kpi).forEach(k => (kpi[k] == null) && delete kpi[k]);

    console.log('[SD] KPI letti:', kpi, 'meta:', meta);
    return { kpi, meta };
  }

  function analyse() {
    if (!window.SuiteAssistantChat) return;
    const { kpi, meta } = readKPI();
    if (!Object.keys(kpi).length) {
      console.warn('[SD] Nessun KPI trovato: analisi annullata');
      return;
    }
    // apri e analizza
    window.SuiteAssistantChat.analyseKPIsSilently(kpi, meta.canone ? `Canone: ${meta.canone}` : '');
  }

  function hookCalcOnce() {
    const btn = CALC
      .map(q => Array.from(document.querySelectorAll(q)))
      .flat()
      .find(b => /calcola/i.test((b.textContent || '')));
    if (!btn || btn.__sdHook) return;
    btn.__sdHook = true;

    btn.addEventListener('click', () => {
      // lascia aggiornare il DOM del simulatore prima di leggere
      setTimeout(analyse, 250);
    });
    console.log('[SD] trigger agganciato a', btn);
  }

  function onReady() {
    hookCalcOnce();

    // monta solo la bubble (non aprire il pannello finché l’utente non clicca o non calcola)
    if (window.SuiteAssistantChat && !document.getElementById('sdw-root')) {
      try { window.SuiteAssistantChat.open({ autostart: false }); window.SuiteAssistantChat.close(); } catch {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();

  // per contenuti dinamici
  const mo = new MutationObserver(hookCalcOnce);
  mo.observe(document.documentElement, { childList: true, subtree: true });

  console.log('[SD] sd-triggers.js pronto (lettura KPI per ID, anti-zero)');
})();
