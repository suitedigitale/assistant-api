/* public/sd-triggers.js — apre la chat e invia l’analisi KPI dopo “Calcola la tua crescita” */
(function () {

  // numerici “€ 1.590”, “-95,36%”, “0,2x”
  function num(s) {
    if (!s) return null;
    const t = (s+'').replace(/\./g,'').replace(/€/g,'').replace(/,/g,'.').replace(/[^\d.-]/g,'').trim();
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  }

  // cerca per etichetta
  function pickByLabel(labelContains) {
    const nodes = Array.from(document.querySelectorAll('*')).filter(n=>{
      const txt = (n.textContent||'').toLowerCase();
      return txt.includes(labelContains);
    });
    for (const n of nodes) {
      const box = n.closest('[class*="card"], [class*="box"], [class*="result"], .result, .card, div') || n;
      const cand = (box.textContent||'').trim();
      const m = cand.match(/-?\€?\s?[\d\.\,]+|[-]?\d+,\d+%|[-]?\d+(\.\d+)?x/gi);
      if (m && m.length) return m[0];
    }
    return null;
  }

  function readKPI() {
    const roiTxt  = document.querySelector('[data-kpi="roi"]')?.textContent || pickByLabel('roi previs');
    const roasTxt = document.querySelector('[data-kpi="roas"]')?.textContent || pickByLabel('roas stimat');
    const budTxt  = document.querySelector('[data-kpi="budget"]')?.textContent || pickByLabel('budget adv');
    const revTxt  = document.querySelector('[data-kpi="revenue"]')?.textContent || pickByLabel('fatturato stim');
    const proTxt  = document.querySelector('[data-kpi="profit"]')?.textContent || pickByLabel('perdita mensile') || pickByLabel('utile mensile');
    const cplTxt  = document.querySelector('[data-kpi="cpl"]')?.textContent || pickByLabel('cpl');
    const cpaTxt  = document.querySelector('[data-kpi="cpa"]')?.textContent || pickByLabel('cpa');

    let roi = num(roiTxt);
    let roas = num(roasTxt);
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

  // -------- apertura chat “gentile”
  function politeOpen() {
    window.SuiteAssistantChat?.open?.({ autostart:true });
  }

  // -------- intercetta il click su “Calcola la tua crescita”
  function isCalcElement(el) {
    const t = (el.innerText || el.textContent || '').toLowerCase().replace(/\s+/g,' ');
    return t.includes('calcola') && (t.includes('cresc') || t.includes('risult'));
  }

  function attachToExistingButtons() {
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], .btn, .button'));
    els.forEach(el=>{
      if (el.__sdw_calc) return;
      if (!isCalcElement(el)) return;
      el.__sdw_calc = 1;
      el.addEventListener('click', ()=>{
        setTimeout(()=>{
          const kpi = readKPI();
          const sector = sectorContext();
          window.SuiteAssistantChat?.analyseKPIsSilently?.(kpi, sector);
        }, 250);
      });
    });
  }

  // delegation: prende anche elementi creati dopo
  function delegateClicks() {
    document.addEventListener('click', (e)=>{
      const el = e.target.closest('button, a, [role="button"], .btn, .button');
      if (!el) return;
      if (!isCalcElement(el)) return;
      setTimeout(()=>{
        const kpi = readKPI();
        const sector = sectorContext();
        window.SuiteAssistantChat?.analyseKPIsSilently?.(kpi, sector);
      }, 300);
    }, true);
  }

  // osserva cambi nel DOM (SPA)
  function observeMutations() {
    const mo = new MutationObserver(()=>attachToExistingButtons());
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }

  function sectorContext() {
    const sector = Array.from(document.querySelectorAll('select, [data-field="settore"], [data-name="settore"], [class*="settore"]'))
      .map(n=>n.value || n.getAttribute('value') || n.textContent).find(Boolean);
    const b2 = (document.body.textContent||'').match(/\bB2B|B2C\b/i)?.[0] || '';
    return [sector, b2].filter(Boolean).join(' - ');
  }

  function boot() {
    politeOpen();
    attachToExistingButtons();
    delegateClicks();
    observeMutations();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

