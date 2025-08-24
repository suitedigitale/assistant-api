<script>
// =========================
//  Suite Digitale - Triggers
// =========================
(function(){
  const OPEN = () => window.SuiteAssistantChat && window.SuiteAssistantChat.open({ autostart:true });
  const ASK  = (m) => window.SuiteAssistantChat && window.SuiteAssistantChat.ask(m);

  // Utils per leggere le KPI dalla pagina
  const txt = (id) => { const el=document.getElementById(id); return el ? el.textContent.trim() : ''; };
  const num = (id) => {
    const t = txt(id).replace(/\./g,'').replace(',', '.');
    const n = parseFloat(t); return isNaN(n) ? null : n;
  };
  const vis = (sel) => {
    const el = document.querySelector(sel);
    return !!(el && getComputedStyle(el).display !== 'none');
  };

  // Messaggi dinamici in base alle KPI
  function kpiMessage(){
    const roi  = num('roiKPI');
    const roas = num('roasKPI');
    const utile = num('utilePerditaKPI');
    const budget = num('budgetKPI');
    const fatt = num('fatturatoKPI');
    const canone = num('canoneSuiteDigitaleKPI');

    if (roi === null || roas === null || utile === null) {
      return 'Fammi calcolare i tuoi KPI: premi “Calcola la tua crescita” e ti spiego ROI, ROAS, budget e come migliorare.';
    }

    // Formattazioni semplici
    const fmt = (n, d=0) => (Number(n||0)).toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d});
    const euro = (n) => '€ ' + fmt(n, 0);

    if (roi < 0 || utile < 0) {
      return (
        'ROI stimato ≈ ' + fmt(roi,2) + '%. La strategia risulta in **perdita**: ogni 100€ investiti ne rientrano meno di 100. ' +
        'Ti aiuto a rimetterti in rotta rivedendo **budget ADV** (' + euro(budget) + '), **CPL atteso** e **tassi di conversione**. ' +
        'Suggerisco: abbassa il costo/lead, migliora il tasso lead→appuntamento e aumenta lo scontrino medio. ' +
        'Prenota la **Consulenza Gratuita**: analizziamo insieme come trasformare la strategia in un percorso scalabile.'
      );
    } else {
      return (
        'Ottimo! **ROI ≈ ' + fmt(roi,2) + '%** e **ROAS ≈ ' + fmt(roas,1) + 'x**. ' +
        'Utile mensile stimato: ' + euro(utile) + '. Fatturato: ' + euro(fatt) + '. Budget ADV: ' + euro(budget) +
        ' + canone servizio ' + euro(canone) + '. ' +
        'Ti spiego come scalare in sicurezza: mantieni il ROAS sopra soglia, reinveste parte dell’utile e ottimizza funnel/vendite. ' +
        'Facciamo il punto insieme con la **Consulenza Gratuita**: primo step per impostare il piano di crescita.'
      );
    }
  }

  // Se l’utente apre la chat senza aver calcolato nulla
  function noCalcMessage(){
    return (
      'Ciao! Per aiutarti davvero mi servono i tuoi parametri. Compila il simulatore (tipo business e settore, clienti mensili, ' +
      'scontrino medio e margine) poi premi **Calcola la tua crescita**. Ti restituisco ROI/ROAS, budget e i punti da migliorare.'
    );
  }

  // Click sul bottone "Calcola la tua crescita" → apri chat e invia analisi
  function onCalcClick(){
    const btn = document.querySelector('#calcolaBtn,[data-cta="calcola"]');
    if (!btn || btn.__sdw) return;
    btn.__sdw = 1;
    btn.addEventListener('click', () => {
      // aspetta che le KPI compaiano
      setTimeout(() => {
        OPEN();
        setTimeout(() => ASK(kpiMessage()), 250);
      }, 400);
    });
  }

  // Click manuale su elementi che vuoi facciano partire la chat
  function genericOpeners(){
    ['a[href*="#sdw-open"]'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !el.__sdw) {
        el.__sdw = 1;
        el.addEventListener('click', e => { e.preventDefault(); OPEN(); });
      }
    });
  }

  // Se l’utente apre la chat senza KPI calcolate (per sicurezza)
  function greetIfNoResults(){
    const haveResult = vis('#result') || (document.getElementById('summaryDock') && document.getElementById('summaryDock').getAttribute('aria-hidden')==='false');
    if (!haveResult) {
      // appena la chat è pronta, manda il messaggio
      if (window.SuiteAssistantChat) {
        setTimeout(() => ASK(noCalcMessage()), 500);
      }
    }
  }

  function boot(){
    onCalcClick();
    genericOpeners();
    greetIfNoResults();
    console.log('[SD] sd-triggers.js attivo');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>
