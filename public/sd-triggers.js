/* public/sd-triggers.js — apre la chat al calcolo e invia KPI reali (ID del simulatore) */
(function () {
  const BTN_CALCOLA = '#calcolaBtn';

  // ID mappati dal tuo simulatore
  const KPI_MAP = {
    revenue:      '#fatturatoKPI',
    budget:       '#budgetKPI',
    canone:       '#canoneSuiteDigitaleKPI',
    roi:          '#roiKPI',            // percentuale con virgola
    roas:         '#roasKPI',           // "0,4x"
    profit:       '#utilePerditaKPI',
    cpl:          '#cplKPI',
    cpa:          '#cpaKPI',
    lead:         '#leadKPI',
    appointments: '#appuntamentiKPI',
    convLeadApp:  '#convLeadAppKPI',
    convAppCliente:'#convAppClienteKPI'
  };

  function numFromText(el){
    if (!el) return null;
    // 1) dataset.target se presente
    if (el.dataset && el.dataset.target != null){
      const v = parseFloat(String(el.dataset.target).replace(',', '.'));
      return Number.isFinite(v)?v:null;
    }
    // 2) testo
    let t = (el.textContent||'').trim();
    if (!t) return null;
    // ROAS "0,4x" → 0.4
    t = t.replace(/x$/i,'');
    // solo cifre/segni/separatori
    let cleaned = t.replace(/[^\d.,\-]/g,'');
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g,'').replace(',', '.');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const v = parseFloat(cleaned);
    return Number.isFinite(v)?v:null;
  }

  function collectKPI(){
    const out = {};
    for (const [key, sel] of Object.entries(KPI_MAP)){
      const v = numFromText(document.querySelector(sel));
      if (v!=null) out[key]=v;
    }
    if (!(out.cpl>0)) delete out.cpl;
    if (!(out.cpa>0)) delete out.cpa;
    return out;
  }

  function collectContext(){
    const val = q => (document.querySelector(q)||{}).value || '';
    const toI = q => parseInt((document.querySelector(q)||{}).value||'0',10)||0;
    return {
      tipo: val('#tipoBusiness'),
      settore: val('#settore'),
      funnel: toI('#funnel'),
      clienti_mensili: toI('#clienti'),
      mol_percent: toI('#mol'),
      scontrino_index: toI('#scontrino')
    };
  }

  function waitKPIReady(timeout=2500){
    const start = Date.now();
    return new Promise(resolve=>{
      (function loop(){
        const ok = (document.querySelector('#fatturatoKPI')?.dataset?.target!=null) ||
                   (document.querySelector('#result') && document.querySelector('#result').style.display==='block');
        if (ok) return resolve(true);
        if (Date.now()-start>timeout) return resolve(false);
        requestAnimationFrame(loop);
      })();
    });
  }

  async function onCalcola(){
    setTimeout(async ()=>{
      await waitKPIReady(2500);
      const kpi = collectKPI();
      const ctx = collectContext();
      if (!window.SuiteAssistantChat) return;
      window.SuiteAssistantChat.open({autostart:false});
      window.SuiteAssistantChat.analyseKPIsSilently(kpi, JSON.stringify(ctx));
    }, 300);
  }

  function bind(){
    const btn = document.querySelector(BTN_CALCOLA);
    if (btn && !btn.__sd_bind){
      btn.__sd_bind=1;
      btn.addEventListener('click', onCalcola);
    }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  console.log('[SD] sd-triggers.js pronto');
})();
