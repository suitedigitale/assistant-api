/* public/sd-triggers.js — apre la chat SOLO quando serve e invia l’analisi KPI */
(function () {
  // --- numerici da “€ 1.590”, “-95,36%”, “0,2x”
  function num(s) {
    if (!s) return null;
    const t = (s+'').replace(/\./g,'').replace(/€/g,'').replace(/,/g,'.').replace(/[^\d.-]/g,'').trim();
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  }

  // --- fallback per etichetta
  function pickByLabel(labelContains) {
    const labs = Array.from(document.querySelectorAll('*'));
    for (const n of labs) {
      const txt = (n.textContent||'').toLowerCase();
      if (!txt.includes(labelContains)) continue;
      const wrap = n.closest('[class*="card"], [class*="result"], .result, .card') || n;
      const raw  = (wrap.textContent||'').trim();
      const m = raw.match(/-?\€?\s?[\d\.\,]+|[-]?\d+,\d+%|[-]?\d+(\.\d+)?x/gi);
      if (m && m[0]) return m[0];
    }
    return null;
  }

  function readKPI() {
    // prova con data-kpi, poi per etichetta
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
      budget:  num(budTxt),
      revenue: num(revTxt),
      profit:  num(proTxt),
      cpl:     num(cplTxt),
      cpa:     num(cpaTxt)
    };
  }

  function sectorContext() {
    const sector = Array.from(document.querySelectorAll('select, [data-field="settore"], [data-name="settore"], [class*="settore"]'))
      .map(n=>n.value || n.getAttribute('value') || n.textContent).find(Boolean);
    const b2 = (document.body.textContent||'').match(/\bB2B|B2C\b/i)?.[0] || '';
    return [sector, b2].filter(Boolean).join(' - ');
  }

  // --- apri chat (senza auto open all’avvio pagina)
  function openGentle() { window.SuiteAssistantChat?.open?.({ autostart:true }); }

  // --- riconosci “Calcola la tua crescita”
  function isCalcElement(el) {
    const t = (el.innerText || el.textContent || '').toLowerCase().replace(/\s+/g,' ');
    return t.includes('calcola') && (t.includes('cresc') || t.includes('risult'));
  }

  function attachToExistingButtons() {
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], .btn, .button, input[type="submit"]'));
    els.forEach(el=>{
      if (el.__sdw_calc) return;
      if (!isCalcElement(el)) return;
      el.__sdw_calc = 1;
      el.addEventListener('click', ()=>{
        setTimeout(()=>{
          const k = readKPI();
          const hash = JSON.stringify(k);
          if (hash.includes('null')) return;      // aspetta risultati reali
          window.SuiteAssistantChat?.analyseKPIsSilently?.(k, sectorContext());
        }, 300);
      });
    });
  }

  // delegation: cattura anche elementi creati dopo
  function delegateClicks() {
    document.addEventListener('click', (e)=>{
      const el = e.target.closest('button, a, [role="button"], .btn, .button, input[type="submit"]');
      if (!el) return;
      if (!isCalcElement(el)) return;
      setTimeout(()=>{
        const k = readKPI();
        const hash = JSON.stringify(k);
        if (hash.includes('null')) return;
        window.SuiteAssistantChat?.analyseKPIsSilently?.(k, sectorContext());
      }, 320);
    }, true);
  }

  // fallback: appena compaiono i KPI -> analizza (utile se il click non viene preso)
  let lastHash = '';
  let throttle;
  function observeKPI() {
    const mo = new MutationObserver(()=>{
      clearTimeout(throttle);
      throttle = setTimeout(()=>{
        const k = readKPI();
        const hash = JSON.stringify(k);
        if (!hash.includes('null') && hash !== lastHash) {
          lastHash = hash;
          window.SuiteAssistantChat?.analyseKPIsSilently?.(k, sectorContext());
        }
      }, 250);
    });
    mo.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  }

  function boot() {
    // NIENTE auto-open alla pagina: l’utente apre il bubble quando vuole
    attachToExistingButtons();
    delegateClicks();
    observeKPI();
    // opzionale: se vuoi mostrare solo il bubble al load:
    if (window.SuiteAssistantChat) { /* niente */ }
    else document.addEventListener('SuiteAssistantReady', ()=>{/* hook */});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
