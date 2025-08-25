/* public/sd-triggers.js — apre SOLO su “Calcola la tua crescita” e invia KPI, evitando 0 fasulli */
(function () {
  // --- numerico (accetta "€ 1.590", "-95,36%", "0,2x")
  function num(s) {
    if (s == null) return null;
    // estrai primo numero plausibile (anche % o x)
    const raw = (s+'').match(/-?\d+(?:[.,]\d+)?/);
    if (!raw) return null;
    const t = raw[0].replace(/\./g,'').replace(',', '.');
    const n = parseFloat(t);
    if (!isFinite(n)) return null;
    // scarta 0 "falso" (se non siamo sicuri, meglio null)
    return Math.abs(n) < 1e-9 ? null : n;
  }

  // --- text by common ids / data-* / name
  function byIds(ids) {
    for (const id of ids) {
      const el = document.getElementById(id) ||
                 document.querySelector(`[data-kpi="${id}"]`) ||
                 document.querySelector(`[name="${id}"]`);
      const t  = el && (el.textContent || el.value || '').trim();
      if (t) return t;
    }
    return null;
  }

  // --- fallback cercando vicino a etichette
  function pickByLabel(...labels) {
    const nodes = Array.from(document.querySelectorAll('section,div,li,p,span,h1,h2,h3,td,th'));
    for (const n of nodes) {
      const tx = (n.textContent||'').toLowerCase();
      if (!labels.some(l=>tx.includes(l))) continue;
      // cerca un valore qui o nel vicino
      const near = n.nextElementSibling?.textContent || n.parentElement?.textContent || n.textContent || '';
      const raw = near.trim();
      const m = raw.match(/-?\€?\s?[\d\.\,]+%?|[-]?\d+([.,]\d+)?x/gi);
      if (m && m[0]) return m[0];
    }
    return null;
  }

  function readKPI() {
    // Prova ID noti → poi fallback etichette italiane
    const roiTxt  = byIds(['roiKPI','roi'])       || pickByLabel('roi previs', 'roi');
    const roasTxt = byIds(['roasKPI','roas'])     || pickByLabel('roas');
    const budTxt  = byIds(['budgetKPI','bud'])    || pickByLabel('budget adv','budget mensile','budget');
    const revTxt  = byIds(['fatturatoKPI','fat']) || pickByLabel('fatturato stim','fatturato');
    const proTxt  = byIds(['profittoKPI','utileKPI','perditaKPI']) || pickByLabel('utile mensile','perdita mensile','utile/perdita');
    // CPL / CPA con sinonimi
    const cplTxt  = byIds(['cplKPI','cpl'])       || pickByLabel('cpl','costo per lead','costo contatto');
    const cpaTxt  = byIds(['cpaKPI','cpa'])       || pickByLabel('cpa','costo per acquisizione','costo cliente');

    const roi   = num(roiTxt);
    const roas  = num(roasTxt);
    const bud   = num(budTxt);
    const rev   = num(revTxt);
    const prof  = num(proTxt);
    const cpl   = num(cplTxt);
    const cpa   = num(cpaTxt);

    return {
      roi:     (typeof roi  === 'number') ? roi  : null,
      roas:    (typeof roas === 'number') ? roas : null,
      budget:  (typeof bud  === 'number') ? bud  : null,
      revenue: (typeof rev  === 'number') ? rev  : null,
      profit:  (typeof prof === 'number') ? prof : null,
      // SOLO se letti: altrimenti null → non verranno analizzati
      cpl:     (typeof cpl  === 'number') ? cpl  : null,
      cpa:     (typeof cpa  === 'number') ? cpa  : null
    };
  }

  function sectorContext() {
    const sector = Array.from(document.querySelectorAll('select,[data-field="settore"],[data-name="settore"],[class*="settore"]'))
      .map(n=>n.value || n.getAttribute('value') || n.textContent).find(Boolean);
    const b2 = (document.body.textContent||'').match(/\bB2B|B2C\b/i)?.[0] || '';
    return [sector, b2].filter(Boolean).join(' - ');
  }

  // coda se la chat non è pronta
  window.__sdQueue = window.__sdQueue || [];
  function runOrQueue(fn){
    if (window.SuiteAssistantChat && window.SuiteAssistantChat.analyseKPIsSilently) fn();
    else window.__sdQueue.push(fn);
  }
  document.addEventListener('SuiteAssistantReady', ()=>{
    const q = window.__sdQueue.splice(0);
    q.forEach(fn=>{ try{ fn(); }catch(_){} });
  });

  // riconosci “Calcola la tua crescita”
  function isCalcElement(el) {
    if (!el) return false;
    if (el.id && el.id.toLowerCase() === 'calcolabtn') return true;
    const t = (el.innerText || el.textContent || '').toLowerCase().replace(/\s+/g,' ');
    return t.includes('calcola') && (t.includes('cresc') || t.includes('risult') || t.includes('tua crescita'));
  }

  // arm solo dopo click → niente auto-open su page load
  let armed = false;

  function openAndAnalyseWithRetry() {
    armed = true; // abilita lettura
    runOrQueue(()=> window.SuiteAssistantChat.open({autostart:true}));

    let tries = 18; // ~18*180ms ≈ 3.2s
    (function tick(){
      if (!armed) return;
      const k = readKPI();
      // “pronto” se almeno ROI è numerico (evita 0/null fasulli)
      if (k && typeof k.roi === 'number') {
        runOrQueue(()=> window.SuiteAssistantChat.analyseKPIsSilently(k, sectorContext()));
        return;
      }
      if (--tries > 0) setTimeout(tick, 180);
    })();
  }

  function attachToExistingButtons() {
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], .btn, .button, input[type="submit"], #calcolaBtn, [data-cta="calcola"]'));
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
      const el = e.target.closest('button, a, [role="button"], .btn, .button, input[type="submit"], #calcolaBtn, [data-cta="calcola"]');
      if (!isCalcElement(el)) return;
      setTimeout(openAndAnalyseWithRetry, 140);
    }, true);
  }

  // rimuoviamo l’auto-analisi via MutationObserver all’avvio:
  // la faremo SOLO se l’utente ha cliccato calcola (armed = true)
  function observeResultsAfterClick() {
    const mo = new MutationObserver(()=>{
      if (!armed) return;
      const k = readKPI();
      if (k && typeof k.roi === 'number') {
        armed = false; // una volta letti, disarma
        runOrQueue(()=> {
          window.SuiteAssistantChat.open({autostart:true});
          window.SuiteAssistantChat.analyseKPIsSilently(k, sectorContext());
        });
      }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  }

  function boot() {
    attachToExistingButtons();
    delegateClicks();
    observeResultsAfterClick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
