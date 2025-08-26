/* public/sd-triggers.js — apre la chat su “Calcola” e invia KPI leggendo DAGLI ID REALI */
(function () {
  // ---- Selettori degli ID reali del simulatore (dal tuo file) ----
  const SEL = {
    revenue: '#fatturatoKPI',             // es: "€ 3.250"
    budget:  '#budgetKPI',                // es: "€ 1.590"
    canone:  '#canoneSuiteDigitaleKPI',   // es: "€ 1.106" (non usato dal prompt ma lo mando in meta)
    roi:     '#roiKPI',                   // es: "-95,36%"
    roas:    '#roasKPI',                  // es: "0,2x"
    profit:  '#utilePerditaKPI',          // es: "€ -2.570" (utile/perdita)
    cpl:     '#cplKPI',                   // es: "€ 30"
    cpa:     '#cpaKPI'                    // es: "€ 318"
  };

  // ---- Button “Calcola la tua crescita” (dal markup del simulatore) ----
  const CALC_SELECTORS = ['#calcolaBtn', '[data-cta="calcola"]'];

  // ---- Utilità: parsing robusto (formato IT) ----
  function getText(sel) {
    const el = document.querySelector(sel);
    return el ? (el.textContent || '').trim() : '';
  }
  function toNumber(txt) {
    if (!txt) return null;
    // rimuovi tutto tranne cifre, segno, virgole/punti, poi normalizza: 1.590 -> 1590,  -95,36% -> -95.36, 0,2x -> 0.2
    let t = String(txt)
      .replace(/\s+/g, '')
      .replace(/[€%x]/gi, '')
      .replace(/\./g, '')        // separatori migliaia
      .replace(',', '.');        // decimali IT -> EN
    const n = parseFloat(t.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? null : n;
  }

  function readKPIFromIDs() {
    const kpi = {
      revenue: toNumber(getText(SEL.revenue)),
      budget:  toNumber(getText(SEL.budget)),
      roi:     toNumber(getText(SEL.roi)),      // percentuale già senza simbolo
      roas:    toNumber(getText(SEL.roas)),     // 0,2x -> 0.2
      profit:  toNumber(getText(SEL.profit)),
      cpl:     toNumber(getText(SEL.cpl)),
      cpa:     toNumber(getText(SEL.cpa))
    };
    const meta = {
      canone: toNumber(getText(SEL.canone))
    };
    return { kpi, meta };
  }

  function openAndAnalyse() {
    if (!window.SuiteAssistantChat) return;
    const { kpi, meta } = readKPIFromIDs();

    // Se non è stato letto nulla, non aprire/analizzare
    const someValue = Object.values(kpi).some(v => typeof v === 'number' && !isNaN(v));
    if (!someValue) {
      console.warn('[SD] KPI non trovati, analisi annullata:', kpi);
      return;
    }

    // Apri pannello e invia KPI alla funzione silente
    try {
      window.SuiteAssistantChat.analyseKPIsSilently(kpi, meta && meta.canone ? `Canone: ${meta.canone}` : '');
    } catch (e) {
      console.error('[SD] analyseKPIsSilently error:', e);
    }
  }

  function hookCalcOnce() {
    const btn = CALC_SELECTORS
      .map(q => Array.from(document.querySelectorAll(q)))
      .flat()
      .find(b => /calcola/i.test((b.textContent || '')));
    if (!btn || btn.__sdHook) return;

    btn.__sdHook = true;
    btn.addEventListener('click', () => {
      // dai il tempo al simulatore di aggiornare i numeri a DOM
      setTimeout(openAndAnalyse, 50);
    });
    console.log('[SD] trigger agganciato a:', btn);
  }

  // ---- Bootstrap (non apriamo la chat all’avvio: solo bubble invisibile) ----
  function onReady() {
    hookCalcOnce();

    // Assicura che il widget sia montato (bubble) senza aprire il pannello
    if (window.SuiteAssistantChat && !document.getElementById('sdw-root')) {
      window.SuiteAssistantChat.open({ autostart: false });
      window.SuiteAssistantChat.close();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  // Se la pagina è dinamica, ri-aggancia i listener
  const mo = new MutationObserver(hookCalcOnce);
  mo.observe(document.documentElement, { childList: true, subtree: true });

  console.log('[SD] sd-triggers.js pronto (lettura KPI per ID)');
})();
