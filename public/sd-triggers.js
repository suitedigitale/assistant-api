/* public/sd-triggers.js — apre su “Calcola” e invia KPI anche se la chat non è ancora pronta */
(function () {
  // --- util numerico (da “€ 1.590”, “-95,36%”, “0,2x”)
  function num(s) {
    if (!s) return null;
    const t = (s+'').replace(/\./g,'').replace(/€/g,'').replace(/,/g,'.').replace(/[^\d.-]/g,'').trim();
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  }

  // --- cerca valore partendo da etichette
  function pickByLabel(labelContains) {
    const lc = labelContains.toLowerCase();
    const nodes = Array.from(document.querySelectorAll('section,div,li,p,span,h1,h2,h3'));
    for (const n of nodes) {
      const tx = (n.textContent||'').toLowerCase();
      if (!tx.includes(lc)) continue;
      // prova: numero nel nodo successivo o nel contenitore card
      const near = n.nextElementSibling?.textContent || n.parentElement?.textContent || n.textContent || '';
      const raw = near.trim();
      const m = raw.match(/-?\€?\s?[\d\.\,]+|[-]?\d+,\d+%|[-]?\d+(\.\d+)?x/gi);
      if (m && m[0]) return m[0];
    }
    return null;
  }

  function readKPI() {
    const roiTxt  = document.querySelector('[data-kpi="roi"]')?.textContent || pickByLabel('roi previs');
    const roasTxt = document.querySelector('[data-kpi="roas"]')?.textContent || pickByLabel('roas');
    const budTxt  = document.querySelector('[data-kpi="budget"]')?.textContent || pickByLabel('budget adv');
    const revTxt  = document.querySelector('[data-kpi="revenue"]')?.textContent || pickByLabel('fatturato stim');
    const proTxt  = document.querySelector('[data-kpi="profit"]')?.textContent || pickByLabel('perdita mensile') || pickByLabel('utile mensile');
    const cplTxt  = document.querySelector('[data-kpi="cpl"]')?.textContent || pickByLabel('cpl');
    const cpaTxt  = document.querySelector('[data-kpi="cpa"]')?.textContent || pickByLabel('cpa');

    let roi = num(roiTxt);
    let roas = num(roasTxt);
    // se scritto “0,2x” funziona già; se fosse “0.2x” idem
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
    const sector = Array.from(document.querySelectorAll('select,[data-field="settore"],[data-name="settore"],[class*="settore"]'))
      .map(n=>n.value || n.getAttribute('value') || n.textContent).find(Boolean);
    const b2 = (document.body.textContent||'').match(/\bB2B|B2C\b/i)?.[0] || '';
    return [sector, b2].filter(Boolean).join(' - ');
  }

  // --- coda se la chat non è pronta
  window.__sdQueue = window.__sdQueue || [];
  function runOrQueue(fn){
    if (window.SuiteAssistantChat && window.SuiteAssistantChat.analyseKPIsSilently) fn();
    else window.__sdQueue.push(fn);
  }
  document.addEventListener('SuiteAssistantReady', ()=>{
    const q = window.__sdQueue.splice(0);
    q.forEach(fn=>{ try{ fn(); }catch(_){} });
  });

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
          const full = JSON.stringify(k);
          if (full.includes('null')) return; // aspetta che i numeri compaiano davvero
          runOrQueue(()=> {
            window.SuiteAssistantChat.open({autostart:true});
            window.SuiteAssistantChat.analyseKPIsSilently(k, sectorContext());
          });
        }, 300);
      });
    });
  }

  // delegation globale (cattura pulsanti creati dopo)
  function delegateClicks() {
    document.addEventListener('click', (e)=>{
      const el = e.target.closest('button, a, [role="button"], .btn, .button, input[type="submit"]');
      if (!el) return;
      if (!isCalcElement(el)) return;
      setTimeout(()=>{
        const k = readKPI();
        const full = JSON.stringify(k);
        if (full.includes('null')) return;
        runOrQueue(()=> {
          window.SuiteAssistantChat.open({autostart:true});
          window.SuiteAssistantChat.analyseKPIsSilently(k, sectorContext());
        });
      }, 320);
    }, true);
  }

  // fallback: non appena “appaiono” i KPI -> analizza una sola volta per set
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
          runOrQueue(()=> {
            window.SuiteAssistantChat.open({autostart:true});
            window.SuiteAssistantChat.analyseKPIsSilently(k, sectorContext());
          });
        }
      }, 250);
    });
    mo.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  }

  function boot() {
    // NIENTE auto-open all’avvio pagina
    attachToExistingButtons();
    delegateClicks();
    observeKPI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
