/* public/sd-triggers.js — apre su “Calcola la tua crescita” e legge KPI in modo robusto */
(function () {

  // --- utili parsing ---
  function numFrom(text){
    if (!text) return null;
    const t = (text+'').replace(/\s/g,'').replace(/[€x]/g,'');
    // “-95,36%” -> -95.36 | “1.590” -> 1590
    const normalized = t.replace(/\./g,'').replace(',', '.');
    const m = normalized.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  function findByLabel(label){
    const nodes = Array.from(document.querySelectorAll('div,span,td,th,p,li'));
    const hit = nodes.find(n => n.textContent && n.textContent.trim().toLowerCase().includes(label));
    if (!hit) return null;
    // prova a leggere numero nel blocco vicino
    const box = hit.closest('div') || hit.parentElement;
    const cand = (box ? Array.from(box.querySelectorAll('*')) : [])
      .concat(hit.nextElementSibling ? [hit.nextElementSibling] : []);
    for (const el of cand){
      const v = numFrom(el.textContent);
      if (v !== null) return v;
    }
    // fallback: direttamente dal testo del label
    const v = numFrom(hit.textContent);
    return v;
  }

  function readKPIs(){
    // preferisci badges in alto, poi le card interne
    const all = Array.from(document.querySelectorAll('div,span'));
    let roi=null, roas=null, revenue=null, budget=null, fee=null, profit=null, cpl=null, cpa=null;

    // STRISCIA ALTA
    all.forEach(n=>{
      const t=(n.textContent||'').trim();
      if (/^ROI:/i.test(t)) roi = numFrom(t);
      if (/^Fatturato:/i.test(t)) revenue = numFrom(t);
      if (/^(Utile|Perdita):/i.test(t)) profit = numFrom(t);
    });

    // CARD INTERNE (fallback)
    if (revenue==null) revenue = findByLabel('fatturato stimato');
    if (budget ==null) budget  = findByLabel('budget adv mensile');
    if (fee    ==null) fee     = findByLabel('canone suite digitale');
    if (roi    ==null) roi     = findByLabel('roi previsionale');
    if (roas   ==null) roas    = findByLabel('roas stimato');
    if (profit ==null) profit  = findByLabel('perdita mensile') ?? findByLabel('utile mensile');
    // CPL/CPA (se non ci sono, lasciamo null)
    cpl = findByLabel('cpl stimato');
    cpa = findByLabel('cpa stimato');

    return { roi, roas, revenue, budget, fee, profit, cpl, cpa };
  }

  function openAndAnalyse(note){
    const ok = window.SuiteAssistantChat && window.SuiteAssistantChat.analyseKPIsSilently;
    if (!ok) return false;
    const kpi = readKPIs();
    // se troviamo solo ROI ma tutto il resto è null, non forziamo l’analisi
    const values = Object.values(kpi).filter(v=>v!=null);
    if (values.length < 2) { // quasi vuoto: meglio accoglienza standard
      window.SuiteAssistantChat.open({autostart:true});
      return true;
    }
    window.SuiteAssistantChat.analyseKPIsSilently(kpi, note || '');
    return true;
  }

  function afterCalcHandler(){
    openAndAnalyse('Analisi generata dopo “Calcola la tua crescita”.');
  }

  function bindCalcButtons(){
    const candidates = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
    candidates.forEach(el=>{
      const t = (el.innerText || el.value || '').toLowerCase();
      if (/calcola la tua crescita/.test(t) && !el.__sdw){
        el.__sdw = 1;
        el.addEventListener('click', ()=>{
          // aspetta il rendering KPI
          setTimeout(afterCalcHandler, 650);
        });
      }
    });
  }

  function boot(){
    bindCalcButtons();
    // observer sui risultati: se compaiono box KPI, prova una sola volta
    const target = document.body;
    if (!('MutationObserver' in window) || !target) return;
    let tried = false;
    const mo = new MutationObserver(()=>{
      if (tried) return;
      const haveResults = !!document.querySelector('*:contains("ROI")') || !!document.querySelector('*:contains("Fatturato")');
      if (haveResults){ tried = true; setTimeout(afterCalcHandler, 500); }
    });
    mo.observe(target, {childList:true, subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
