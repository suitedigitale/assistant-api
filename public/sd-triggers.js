/* public/sd-triggers.js — ascolta KPI dal simulatore e apre la chat */
(function(){
  // Apri chat al primo uso “manuale”
  document.addEventListener('SuiteAssistantLoaderReady', function(){
    // opzionale: niente autostart qui, lasciamo al bubble o al postMessage
  });

  // Ascolta KPI dal simulatore
  window.addEventListener('message', function(ev){
    const d = ev && ev.data;
    if (!d || d.type !== 'SD_KPI') return;
    const kpi = d.payload || {};
    const note = d.context ? JSON.stringify(d.context) : '';

    if (window.SuiteAssistantChat && typeof window.SuiteAssistantChat.analyseKPIsSilently==='function'){
      window.SuiteAssistantChat.analyseKPIsSilently(kpi, note);
    } else {
      // se la chat non è ancora pronta, ritenta tra un attimo
      setTimeout(()=>window.postMessage(d,'*'), 250);
    }
  }, false);

  console.log('[SD] sd-triggers.js pronto');
})();
