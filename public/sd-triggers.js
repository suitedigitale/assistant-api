/* public/sd-triggers.js — apre la chat al calcolo e invia i KPI reali letti dal simulatore */
(function () {
  // ====== Selettori del simulatore ======
  const BTN_CALCOLA = '#calcolaBtn';

  // Mappa ID → nome campo che mandiamo all’assistente
  const KPI_MAP = {
    revenue:            '#fatturatoKPI',            // Fatturato stimato
    budget:             '#budgetKPI',               // Budget ADV mensile
    canone:             '#canoneSuiteDigitaleKPI',  // Canone Suite Digitale
    roi:                '#roiKPI',                  // ROI previsionale (%)
    roas:               '#roasKPI',                 // ROAS stimato (x)
    profit:             '#utilePerditaKPI',         // Utile/Perdita mensile
    cpl:                '#cplKPI',                  // CPL stimato
    cpa:                '#cpaKPI',                  // CPA stimato
    lead:               '#leadKPI',                 // Lead stimati
    appointments:       '#appuntamentiKPI',         // Appuntamenti di vendita
    convLeadApp:        '#convLeadAppKPI',          // Conv. Lead/Appuntamenti (%)
    convAppCliente:     '#convAppClienteKPI'        // Conv. Appunt./Clienti (%)
  };

  // ====== Helpers ======
  function readNumber(sel) {
    const el = document.querySelector(sel);
    if (!el) return null;

    // 1) dataset.target (se presente) ha priorità
    if (el.dataset && el.dataset.target != null) {
      const v = parseFloat(String(el.dataset.target).replace(',', '.'));
      return Number.isFinite(v) ? v : null;
    }

    // 2) estrai dal testo visibile (gestione migliaia/decimali/percentuali/‘x’)
    let raw = (el.textContent || '').trim();
    if (!raw) return null;

    // tieni solo cifre, separatori e segno
    let cleaned = raw.replace(/[^\d.,\-]/g, '');

    const hasComma = cleaned.includes(',');
    const hasDot   = cleaned.includes('.');

    if (hasComma && hasDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.'); // "1.234,56" -> "1234.56"
    } else if (hasComma) {
      cleaned = cleaned.replace(',', '.'); // "92,59" -> "92.59"
    }
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
  }

  function collectKPI() {
    const k = {};
    for (const [key, sel] of Object.entries(KPI_MAP)) {
      const v = readNumber(sel);
      if (v != null) k[key] = v;
    }
    // CPL/CPA opzionali: omettili se assenti o 0
    if (!(k.cpl > 0)) delete k.cpl;
    if (!(k.cpa > 0)) delete k.cpa;
    return k;
  }

  function collectContext() {
    const getVal = (q) => (document.querySelector(q) || {}).value || '';
    const toInt  = (q) => parseInt((document.querySelector(q) || {}).value || '0', 10) || 0;
    return {
      tipo: getVal('#tipoBusiness'),         // B2B / B2C
      settore: getVal('#settore'),
      funnel: toInt('#funnel'),
      clienti_mensili: toInt('#clienti'),
      mol_percent: toInt('#mol'),
      scontrino_index: toInt('#scontrino')
    };
  }

  function waitKPIReady(timeoutMs = 2500) {
    const started = Date.now();
    return new Promise((resolve) => {
      (function tick() {
        const ok =
          (document.querySelector('#fatturatoKPI')?.dataset?.target != null) ||
          (document.querySelector('#result') && document.querySelector('#result').style.display === 'block');
        if (ok) return resolve(true);
        if (Date.now() - started > timeoutMs) return resolve(false);
        requestAnimationFrame(tick);
      })();
    });
  }

  async function onCalcolaClick() {
    setTimeout(async () => {
      await waitKPIReady(2500);
      const kpi = collectKPI();
      const ctx = collectContext();

      if (!window.SuiteAssistantChat) return;
      window.SuiteAssistantChat.open({ autostart: false });
      window.SuiteAssistantChat.analyseKPIsSilently(kpi, JSON.stringify(ctx));
    }, 350);
  }

  function bind() {
    const btn = document.querySelector(BTN_CALCOLA);
    if (btn && !btn.__sd_bind) {
      btn.__sd_bind = 1;
      btn.addEventListener('click', onCalcolaClick);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  console.log('[SD] sd-triggers.js pronto');
})();
