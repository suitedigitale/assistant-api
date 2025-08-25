/* public/sd-triggers.js — apre su “Calcola” e invia KPI con retry; coda se la chat non è pronta */
(function () {
  // --- numerico (“€ 1.590”, “-95,36%”, “0,2x”)
  function num(s) {
    if (!s) return null;
    const t = (s+'').replace(/\./g,'').replace(/€/g,'').replace(/,/g,'.').replace(/[^\d.-]/g,'').trim();
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  }

  // --- text by any of these ids
  function byIds(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      const t  = el && (el.textContent || el.value || '').trim();
      if (t) return t;
    }
    return null;
  }

  // --- fallback cercando vicino a etichette
  function pickByLabel(labelContains) {
    const lc = labelContains.toLowerCase();
    const nodes = Array.from(document.querySelectorAll('section,div,li,p,span,h1,h2,h3'));
    for (const n of nodes) {
      const tx = (n.textContent||'').toLowerCase();
      if (!tx.includes(lc)) continue;
      const near = n.nextElementSibling?.textContent || n.parentElement?.textContent || n.textContent || '';
      const raw = near.trim();
      const m = raw.match(/-?\€?\s?[\d\.\,]+|[-]?\d+,\d+%|[-]?\d+(\.\d+)?x/gi);
      if (m && m[0]) return m[0];
    }
    return null;
  }

  function readKPI() {
    // prova con ID “classici” del simulatore + fallback per etichette
    const roiTxt  = byIds(['roiKPI','roi'])       || pickByLabel('roi previs');
    const roasTxt = byIds(['roasKPI','roas'])     || pickByLabel('roas');
    const budTxt  = byIds(['budgetKPI','bud'])    || pickByLabel('budget adv');
    const revTxt  = byIds(['fatturatoKPI','fat']) || pickByLabel('fatturato stim');
    const proTxt  = byIds(['profittoKPI','utileKPI','perditaKPI']) || pickByLabel('utile mensile') || pickByLabel('perdita mensile');
    const cplTxt  = byIds(['cplKPI','cpl'])       || pickByLabel('cpl');
    const cpaTxt  = byIds(['cpaKPI','cpa'])       || pickByLabel('cpa');

    return {
      roi:     num(roiTxt),
      roas:    num(roasTxt),
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
    if (!el) return false;
    if (el.id && el.id.toLowerCase() === 'calcolabtn') return true;
    const t = (el.innerText || el.textContent || '').toLowerCase().replace(/\s+/g,' ');
    return t.includes('calcola') && (t.includes('cresc') || t.includes('risult') || t.includes('tua crescita'));
  }

  function openAndAnalyseWithRetry() {
    // apri SUBITO la chat (welcome), poi prova a leggere KPI con piccoli retry
    runOrQueue(()=> window.SuiteAssistantChat.open({autostart:true}));
    let tries = 12; // ~12*200ms = ~2.4s
    (function tick(){
      const k = readKPI();
      // considera “pronto” se almeno ROI esiste (il resto l’AI lo vede come “nd”)
      if (k && typeof k.roi === 'number') {
        runOrQueue(()=> window.SuiteAssistantChat.analyseKPIsSilently(k, sectorContext()));
        return;
      }
      if (--tries > 0) setTimeout(tick, 200);
    })();
  }

  function attachToExistingButtons() {
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], .btn, .button, input[type="submit"], #calcolaBtn'));
    els.forEach(el=>{
      if (el.__sdw_calc) return;
      if (!isCalcElement(el)) return;
      el.__sdw_calc = 1;
      el.addEventListener('click', ()=> setTimeout(openAndAnalyseWithRetry, 120));
    });
  }

  // delega globale (pulsanti creati dopo)
  function delegateClicks() {
    document.addEventListener('click', (e)=>{
      const el = e.target.closest('button, a, [role="button"], .btn, .button, input[type="submit"], #calcolaBtn');
      if (!isCalcElement(el)) return;
      setTimeout(openAndAnalyseWithRetry, 140);
    }, true);
  }

  // fallback: non appena “appaiono” i KPI -> analizza una sola volta
  let lastHash = '';
  let throttle;
  function observeKPI() {
    const mo = new MutationObserver(()=>{
      clearTimeout(throttle);
      throttle = setTimeout(()=>{
        const k = readKPI();
        if (!k) return;
        const hash = JSON.stringify(k);
        if (hash !== lastHash && typeof k.roi === 'number') {
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
    // Nessun auto-open all’avvio pagina
    attachToExistingButtons();
    delegateClicks();
    observeKPI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
