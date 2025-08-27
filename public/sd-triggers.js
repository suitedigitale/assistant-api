/* public/sd-triggers.js — apre la chat su “Calcola” e invia KPI reali (ID dal simulatore) */
(function(){
  // Bottone “Calcola la tua crescita”
  const BTN_CALCOLA = '#calcolaBtn';

  // Mappa **ID reali** del tuo simulatore → nome campo
  const KPI_MAP = {
    revenue:        '#fatturatoKPI',            // Fatturato stimato (numero)
    budget:         '#budgetKPI',               // Budget ADV mensile
    canone:         '#canoneSuiteDigitaleKPI',  // Canone Suite Digitale
    roi:            '#roiKPI',                  // ROI previsionale (%, senza simbolo)
    roas:           '#roasKPI',                 // ROAS (x)
    profit:         '#utilePerditaKPI',         // Utile/Perdita mensile (negativo se perdita)
    cpl:            '#cplKPI',                  // CPL
    cpa:            '#cpaKPI',                  // CPA
    lead:           '#leadKPI',                 // Lead/mese
    appointments:   '#appuntamentiKPI',         // Appuntamenti
    convLeadApp:    '#convLeadAppKPI',          // Conv. Lead→App (%)
    convAppCliente: '#convAppClienteKPI'        // Conv. App→Cliente (%)
  };

  // Normalizza numeri da “€ 1.234,56” / “-12,3%” / “0,2x”
  function parseNum(txt){
    if (!txt) return null;
    txt = String(txt).trim();
    if (/%/.test(txt)) {
      const v = parseFloat(txt.replace('%','').replace(',','.'));
      return isNaN(v) ? null : v;
    }
    if (/x$/i.test(txt)) {
      const v = parseFloat(txt.replace('x','').replace(',','.'));
      return isNaN(v) ? null : v;
    }
    const clean = txt.replace(/[^\d,.\-]/g,'').replace(/\./g,'').replace(',', '.');
    const n = parseFloat(clean);
    return Number.isFinite(n) ? n : null;
  }

  function readNumber(sel) {
    const el = document.querySelector(sel);
    if (!el) return null;
    // molti KPI sono animati con data-target
    if (el.dataset && el.dataset.target != null) {
      const v = parseNum(el.dataset.target);
      if (v != null) return v;
    }
    return parseNum(el.textContent || '');
  }

  function collectKPI() {
    const k = {};
    for (const [key, sel] of Object.entries(KPI_MAP)) {
      const v = readNumber(sel);
      if (v != null) k[key] = v;
    }
    // elimina zero “falsi positivi”
    if (!(k.cpl > 0)) delete k.cpl;
    if (!(k.cpa > 0)) delete k.cpa;
    return k;
  }

  function collectContext() {
    const getVal = (q) => (document.querySelector(q) || {}).value || '';
    const toInt  = (q) => parseInt((document.querySelector(q) || {}).value || '0', 10) || 0;
    return {
      tipo: getVal('#tipoBusiness'),     // B2B / B2C
      settore: getVal('#settore'),
      funnel: toInt('#funnel'),
      clienti_mensili: toInt('#clienti'),
      mol_percent: toInt('#mol'),
      scontrino_index: toInt('#scontrino')
    };
  }

  // attende che i KPI siano visualizzati/animati
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
      window.SuiteAssistantChat.open({ autostart: false }); // apre pannello
      window.SuiteAssistantChat.analyseKPIsSilently(kpi, JSON.stringify(ctx));
    }, 300);
  }

  function bind() {
    const btn = document.querySelector(BTN_CALCOLA);
    if (btn && !btn.__sd_bind) {
      btn.__sd_bind = 1;
      btn.addEventListener('click', onCalcolaClick);
    }
  }

  // non aprire mai da soli: solo al click “Calcola”
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  // in caso di SPA/aggiornamenti dinamici
  const mo = new MutationObserver(bind);
  mo.observe(document.documentElement, {childList:true, subtree:true});

  console.log('[SD] sd-triggers.js pronto');
})();
