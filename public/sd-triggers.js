/* public/sd-triggers.js — apre SOLO su “Calcola la tua crescita”, legge KPI dal box risultati, evita 0 fasulli */
(function () {
  // ---- numerico robusto
  function parseNum(s) {
    if (s == null) return null;
    const raw = (s+'').match(/-?\d+(?:[.,]\d+)?/);
    if (!raw) return null;
    const t = raw[0].replace(/\./g,'').replace(',', '.');
    const n = parseFloat(t);
    return isFinite(n) ? n : null;
  }
  const num = (s) => {
    const n = parseNum(s);
    // se non trovato, o roba sporca, torna null (evita 0 inventati)
    if (n == null) return null;
    return n;
  };

  // ---- trova il contenitore risultati per limitare la lettura
  const RESULTS_SELECTORS = ['#kpi-results', '.kpi-results', '#risultati', '[data-kpi="results"]', '#sd-results'];

  function resultsRoot() {
    for (const sel of RESULTS_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // fallback: se non c’è un container, usa il documento (meno preciso)
    return document;
  }

  // ---- dentro root: cerca per id/data-kpi, poi per etichetta vicina
  function pickByIdOrData(root, keys) {
    for (const k of keys) {
      let el = root.querySelector(`#${k}`) ||
               root.querySelector(`[data-kpi="${k}"]`) ||
               root.querySelector(`[name="${k}"]`) ||
               root.querySelector(`[id*="${k}"]`);
      const t = el && (el.textContent || el.value || '').trim();
      if (t) return t;
    }
    return null;
  }

  function pickNearLabel(root, labels) {
    const all = Array.from(root.querySelectorAll('div,section,article,li,p,span,td,th,h1,h2,h3'));
    for (const n of all) {
      const tx = (n.textContent||'').toLowerCase();
      if (!labels.some(l => tx.includes(l))) continue;
      // prova: dentro lo stesso blocco trova il primo numero “credibile”
      const card = n.closest('[class*="card"],[class*="box"],[class*="kpi"],[class*="result"],section,div') || n.parentElement || n;
      const txt = (card.textContent||'').trim();
      const m = txt.match(/-?\d+(?:[.,]\d+)?\s?(?:%|x)?|€\s?[\d\.\,]+/g);
      if (m && m.length) return m[0];
    }
    return null;
  }

  function readKPI() {
    const root = resultsRoot();

    // Preferisci ID/data-kpi noti
    const roiTxt  = pickByIdOrData(root, ['roiKPI','roi'])           || pickNearLabel(root, ['roi previs', 'roi']);
    const roasTxt = pickByIdOrData(root, ['roasKPI','roas'])         || pickNearLabel(root, ['roas']);
    const budTxt  = pickByIdOrData(root, ['budgetKPI','bud'])        || pickNearLabel(root, ['budget adv','budget mensile','budget']);
    const revTxt  = pickByIdOrData(root, ['fatturatoKPI','fat'])     || pickNearLabel(root, ['fatturato stim','fatturato']);
    const canTxt  = pickByIdOrData(root, ['canoneSuiteDigitaleKPI','can']) || pickNearLabel(root, ['canone']);
    const proTxt  = pickByIdOrData(root, ['utileKPI','profittoKPI','perditaKPI']) || pickNearLabel(root, ['utile mensile','perdita mensile','utile/perdita']);
    const cplTxt  = pickByIdOrData(root, ['cplKPI','cpl'])           || pickNearLabel(root, ['cpl','costo per lead','costo contatto']);
    const cpaTxt  = pickByIdOrData(root, ['cpaKPI','cpa'])           || pickNearLabel(root, ['cpa','costo per acquisizione','costo cliente']);

    // parse
    const cleanPercent = (t) => {
      if (!t) return null;
      const n = num(t);
      return n == null ? null : n; // lascio in %
    };
    const cleanRoas = (t) => {
      if (!t) return null;
      // “0,2x”, “5 x” → numero
      const n = num(t);
      return n == null ? null : n;
    };
    const cleanMoney = (t) => {
      if (!t) return null;
      const n = num(t);
      return n == null ? null : n; // lascio “numero” (senza €)
    };

    const k = {
      roi:     cleanPercent(roiTxt),
      roas:    cleanRoas(roasTxt),
      budget:  cleanMoney(budTxt),
      revenue: cleanMoney(revTxt),
      profit:  cleanMoney(proTxt),
      cpl:     (cplTxt ? cleanMoney(cplTxt) : null),
      cpa:     (cpaTxt ? cleanMoney(cpaTxt) : null),
      canone:  cleanMoney(canTxt)
    };

    // non inviare CPL/CPA se null (evita 0 sballati)
    if (k.cpl == null) delete k.cpl;
    if (k.cpa == null) delete k.cpa;

    return k;
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

  // apre SOLO dopo click: niente auto-open su page load
  let armed = false;

  function openAndAnalyseWithRetry() {
    armed = true;
    runOrQueue(()=> window.SuiteAssistantChat.open({autostart:true}));

    let tries = 22; // ~22*180ms ≈ 4s
    (function tick(){
      if (!armed) return;
      const k = readKPI();
      // pronto se almeno ROI o ROAS o Fatturato o Budget sono numeri
      const ready = ['roi','roas','revenue','budget','profit'].some(key => typeof k[key] === 'number');
      if (ready) {
        armed = false;
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

  // delega globale
  function delegateClicks() {
    document.addEventListener('click', (e)=>{
      const el = e.target.closest('button, a, [role="button"], .btn, .button, input[type="submit"], #calcolaBtn, [data-cta="calcola"]');
      if (!isCalcElement(el)) return;
      setTimeout(openAndAnalyseWithRetry, 140);
    }, true);
  }

  function boot() {
    attachToExistingButtons();
    delegateClicks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
