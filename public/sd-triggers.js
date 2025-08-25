/* public/sd-triggers.js — apre la chat e invia l’analisi KPI dopo “Calcola la tua crescita” */
(function () {
  // helper: parsers numerici “€ 1.590”, “-95,36%”, “0,2x”
  function num(s) {
    if (!s) return null;
    const t = (s+'').replace(/\./g,'').replace(/€/g,'').replace(/,/g,'.').replace(/[^\d.-]/g,'').trim();
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  }
  // trova per etichetta vicina (robusto ai cambi markup)
  function pickByLabel(labelContains) {
    const nodes = Array.from(document.querySelectorAll('*')).filter(n=>{
      const txt = (n.textContent||'').toLowerCase();
      return txt.includes(labelContains);
    });
    // prendi il primo riquadro “card” e cerca il numero visibile
    for (const n of nodes) {
      let box = n.closest('[class*="card"], [class*="box"], [class*="result"], div');
      if (!box) continue;
      const cand = (box.textContent||'').trim();
      // estrai il primo simbolo “€” o percentuali nel box
      const m = cand.match(/-?\€?\s?[\d\.\,]+|[-]?\d+,\d+%|[-]?\d+(\.\d+)?x/gi);
      if (m && m.length) return m[0];
    }
    return null;
  }

  function readKPI() {
    // prova selettori noti (se esistono nel tuo DOM), poi fallback a pickByLabel
    const roiTxt  = document.querySelector('div:has(> span:contains("ROI")) , [data-kpi="roi"]')?.textContent || pickByLabel('roi previs');
    const roasTxt = document.querySelector('[data-kpi="roas"]')?.textContent || pickByLabel('roas stimat');
    const budTxt  = document.querySelector('[data-kpi="budget"]')?.textContent || pickByLabel('budget adv');
    const revTxt  = document.querySelector('[data-kpi="revenue"]')?.textContent || pickByLabel('fatturato stim');
    const proTxt  = document.querySelector('[data-kpi="profit"]')?.textContent || pickByLabel('perdita mensile') || pickByLabel('utile mensile');

    // altre metriche se presenti
    const cplTxt  = document.querySelector('[data-kpi="cpl"]')?.textContent || pickByLabel('cpl');
    const cpaTxt  = document.querySelector('[data-kpi="cpa"]')?.textContent || pickByLabel('cpa');

    // normalizza ROI (percentuale) e ROAS (x)
    let roi = num(roiTxt);
    if (roiTxt && /%/.test(roiTxt) && roi!=null) { /* già percentuale */ }
    let roas = num(roasTxt);
    // roas “0,2x” -> 0.2
    if (roasTxt && /x/i.test(roasTxt)) roas = num(roasTxt);

    return {
      roi, roas,
      budget: num(budTxt),
      revenue: num(revTxt),
      profit:  num(proTxt),
      cpl:     num(cplTxt),
      cpa:     num(cpaTxt)
    };
  }

  // bottone “Calcola la tua crescita”
  function findCalcButtons() {
    const sels = [
      '#calcolaBtn',
      '[data-cta="calcola"]',
      'button, a'
    ];
    const all = Array.from(document.querySelectorAll(sels.join(',')));
    return all.filter(b => /calcola.*(crescita|risult)/i.test((b.textContent||'')));
  }

  function sectorContext() {
    const sector = Array.from(document.querySelectorAll('select, [data-field="settore"], [data-name="settore"], [class*="settore"]'))
      .map(n=>n.value || n.getAttribute('value') || n.textContent).find(Boolean);
    const b2  = (document.body.textContent||'').match(/\bB2B|B2C\b/i)?.[0] || '';
    return [sector, b2].filter(Boolean).join(' - ');
  }

  function wire() {
    // apri chat “gentile” se l’utente non ha ancora calcolato
    window.SuiteAssistantChat?.open?.({ autostart:true });

    // click su calcola => leggi KPI e invia
    const btns = findCalcButtons();
    btns.forEach(btn=>{
      if (btn.__sdw) return;
      btn.__sdw = 1;
      btn.addEventListener('click', ()=> {
        setTimeout(()=>{ // lascia tempo al DOM di aggiornarsi
          const kpi = readKPI();
          window.SuiteAssistantChat?.analyseKPIsSilently?.(kpi, sectorContext());
        }, 250);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
