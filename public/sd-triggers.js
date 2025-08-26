/* public/sd-triggers.js — apre la chat su “Calcola” e invia KPI reali */
(function(){
  const S = {
    calcBtn: ['#calcolaBtn', '[data-cta="calcola"]', 'button', 'a'],

    // label → valori nel simulatore (fallback a ricerca testuale vicino)
    labels: {
      revenue: ['Fatturato stimato'],                  // € 3.250
      budget:  ['Budget ADV mensile'],                 // € 1.590
      roi:     ['ROI previsionale'],                   // -95,36%
      roas:    ['ROAS stimato'],                       // 0,2x
      profit:  ['Perdita mensile','Utile mensile'],    // € -2.570 / € 1.234
      cpl:     ['CPL stimato'],                        // € 30
      cpa:     ['CPA stimato']                         // € 318
    }
  };

  function normNum(txt){
    if (!txt) return null;
    txt = (txt+'').replace(/\s/g,'');
    // percentuali
    if (/%/.test(txt)) {
      let v = parseFloat(txt.replace('%','').replace(',','.'));
      return isNaN(v) ? null : v;
    }
    // roas "0,2x"
    if (/x$/i.test(txt)) {
      let v = parseFloat(txt.replace('x','').replace(',','.'));
      return isNaN(v) ? null : v;
    }
    // euro "€ -2.570"
    txt = txt.replace(/[€\.]/g,'').replace(',','.');
    let n = parseFloat(txt);
    return isNaN(n) ? null : n;
  }

  function findByLabel(label){
    // cerca un nodo che contenga il testo label e prendi il valore più vicino
    const all = Array.from(document.querySelectorAll('body *')).filter(n=>{
      return n.childElementCount===0 && n.textContent && n.textContent.trim().length<=64;
    });
    // best candidate con label
    let idx = all.findIndex(n => (n.textContent||'').trim().toLowerCase().includes(label.toLowerCase()));
    if (idx<0) return null;

    // cerca entro i successivi 6 nodi una cifra
    for (let i=idx;i<Math.min(all.length, idx+8);i++){
      const t = (all[i].textContent||'').trim();
      if (/[0-9]/.test(t) && (/[€%x]/.test(t) || /^[0-9\.\,\-\s]+$/.test(t))) {
        const v = normNum(t);
        if (v!==null) return v;
      }
    }
    return null;
  }

  function readKPI(){
    const out = {};
    for (const key of Object.keys(S.labels)) {
      const labels = S.labels[key];
      let v = null;
      for (const L of labels) { v = findByLabel(L); if (v!==null) break; }
      out[key] = v;
    }
    return out;
  }

  function openAndAnalyse(){
    if (!window.SuiteAssistantChat) return;
    const kpi = readKPI();
    const ctx  = ''; // volendo puoi aggiungere settore/canale se hai badge in pagina
    window.SuiteAssistantChat.analyseKPIsSilently(kpi, ctx);
  }

  function hookCalc(){
    const btn = (S.calcBtn
      .map(sel=>Array.from(document.querySelectorAll(sel)))
      .flat())
      .find(el => /calcola/i.test(el.textContent||''));
    if (!btn || btn.__sdw) return;
    btn.__sdw = 1;
    btn.addEventListener('click', () => setTimeout(openAndAnalyse, 20));
  }

  // non aprire mai da soli: solo on demand (click calcola o apertura manuale)
  function onReady(){
    hookCalc();
    // se la chat non è mai stata aperta manualmente, mostra solo la bubble
    if (!document.getElementById('sdw-bubble') && window.SuiteAssistantChat) {
      window.SuiteAssistantChat.open({ autostart:false }); // monta bubble, non apre il pannello
      window.SuiteAssistantChat.close();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();

  // in caso di SPA/aggiornamenti dinamici
  const mo = new MutationObserver(hookCalc);
  mo.observe(document.documentElement, {childList:true, subtree:true});
  console.log('[SD] sd-triggers.js pronto');
})();
