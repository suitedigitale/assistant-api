/* public/sd-triggers.js — apre chat su “Calcola la tua crescita” + legge KPI */
(function () {
  const WAIT_MS = 120; // piccolo delay dopo il click per permettere al DOM di aggiornarsi

  // utilities parsing EU style
  const num = (t) => {
    if (!t) return null;
    const s = String(t).replace(/\s/g,'').replace(/\./g,'').replace(/,/g,'.').replace(/[^\d\.\-]/g,'');
    const v = parseFloat(s); return isFinite(v) ? v : null;
  };
  const findByLabel = (labelPart) => {
    // cerca un box con quel titolo e prende il numero visibile dentro
    const all = document.querySelectorAll('div, section, article, li, .card, .box');
    labelPart = (labelPart||'').toLowerCase();
    for (const el of all){
      const txt = (el.textContent||'').trim().toLowerCase();
      if (!txt) continue;
      if (txt.includes(labelPart)){
        // prova a pescare un “€ 1.590” o “0,2x” o % ecc nella stessa card
        const m = txt.match(/[-+]?\d[\d\.\,]*(?:x|%|€)?/g);
        if (m && m.length){
          // prendi l'ultimo (spesso è il valore grande)
          return m[m.length-1];
        }
      }
    }
    return null;
  };

  function readKPIs(){
    // label che il tuo simulatore mostra (italiano)
    const revenueT = findByLabel('fatturato stimato');
    const budgetT  = findByLabel('budget adv mensile');
    const feeT     = findByLabel('canone suite digitale');
    const roiT     = findByLabel('roi previsionale') || findByLabel('roi stimato');
    const roasT    = findByLabel('roas stimato');
    const utileT   = findByLabel('utile mensile') || findByLabel('perdita mensile');

    // converti
    const out = {};
    if (revenueT) out.revenue = num(revenueT);
    if (budgetT)  out.budget  = num(budgetT);
    if (feeT)     out.fee     = num(feeT);
    if (roiT)     out.roi     = num(roiT);     // es: -95,36%
    if (roasT)    out.roas    = num(roasT);    // es: 0,2x
    if (utileT)   out.profit  = num(utileT);   // può essere negativo

    return out;
  }

  // trova il pulsante “Calcola la tua crescita”
  function findCalcButton(){
    // prova prima per testo
    const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const b1 = btns.find(b => /calcola la tua crescita/i.test(b.textContent||''));
    if (b1) return b1;
    // fallback: colore/CTA vicino al simulatore
    const b2 = btns.find(b => /calcola/i.test(b.textContent||''));
    return b2 || null;
  }

  function onCalcClick(){
    setTimeout(()=>{ // lascia aggiornare i risultati
      const kpi = readKPIs();
      if (!window.SuiteAssistantChat){ return; }
      window.SuiteAssistantChat.open({autostart:false});
      // se almeno ROI o ROAS o fatturato/budget ci sono, analizza; altrimenti saluta e guida
      const hasAny = !!(kpi && (kpi.roi!=null || kpi.roas!=null || kpi.revenue!=null || kpi.budget!=null));
      if (hasAny){
        window.SuiteAssistantChat.analyseKPIsSilently(kpi, 'KPI letti dal simulatore dopo il click su Calcola la tua crescita');
      } else {
        window.SuiteAssistantChat.ask(
          'Non ho trovato KPI da analizzare. Dimmi settore (B2B o B2C), scontrino medio e margine: ti preparo comunque una valutazione orientativa.',
          { silent:false }
        );
      }
    }, WAIT_MS);
  }

  function boot(){
    const btn = findCalcButton();
    if (!btn) return;
    if (btn.__sdw) return; btn.__sdw = 1;
    btn.addEventListener('click', onCalcClick);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // se cambia dinamicamente la pagina, ritenta
  const mo = new MutationObserver(()=>boot());
  mo.observe(document.documentElement, {childList:true, subtree:true});

  console.log('[SD] sd-triggers.js pronto');
})();
