(function(){
  const DEBUG = false;

  // helper parsing
  const num = (t)=> {
    if (t==null) return null;
    t = (''+t).trim();
    // percentuali   es: "-95,36%"
    if (/%/.test(t)) return parseFloat(t.replace('%','').replace(/\./g,'').replace(',','.'));
    // roas "0,2x"
    if (/x$/i.test(t)) return parseFloat(t.replace(/[xX]/,'').replace('.','').replace(',','.'));
    // euro o interi "€ -2.570"
    return parseFloat(t.replace(/[^\d,\-]/g,'').replace(/\./g,'').replace(',','.'));
  };

  function readText(id){
    const el = document.getElementById(id);
    return el ? (el.textContent||'').trim() : '';
  }

  function readKPI(){
    // dalla tua pagina (Simulatore KPI.txt)
    const revenue = num(readText('fatturatoKPI'));
    const budget  = num(readText('budgetKPI'));
    const fee     = num(readText('canoneSuiteDigitaleKPI'));
    const roi     = num(readText('roiKPI'));            // percentuale
    const roas    = num(readText('roasKPI'));           // x
    const profit  = num(readText('utilePerditaKPI'));
    const cpl     = num(readText('cplKPI'));
    const cpa     = num(readText('cpaKPI'));

    const kpi = { revenue, budget, fee, roi, roas, profit, cpl, cpa };
    if (DEBUG) console.log('[SD] KPI letti:', kpi);
    return kpi;
  }

  function analyse(){
    if (!window.SuiteAssistantChat) return;
    const kpi = readKPI();
    // se CPL/CPA sono NaN o null, non inviarli (evita “0” fittizi)
    Object.keys(kpi).forEach(k => { if (kpi[k]==null || isNaN(kpi[k])) delete kpi[k]; });
    window.SuiteAssistantChat.analyseKPIsSilently(kpi, '');
  }

  function hook(){
    // bottone “Calcola la tua crescita” → id calcolaBtn nel simulatore
    const btn = document.getElementById('calcolaBtn') ||
                Array.from(document.querySelectorAll('button,a'))
                  .find(el => /calcola la tua crescita/i.test(el.textContent||''));
    if (!btn || btn.__sd_hooked) return;
    btn.__sd_hooked = 1;
    btn.addEventListener('click', () => setTimeout(analyse, 80)); // attende che i KPI vengano aggiornati
    if (DEBUG) console.log('[SD] hook OK su', btn);
  }

  function ready(){ hook(); }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();

  // in caso la pagina aggiorni DOM dinamicamente
  const mo = new MutationObserver(hook);
  mo.observe(document.documentElement, {childList:true, subtree:true});

  if (DEBUG) console.log('[SD] sd-triggers.js pronto');
})();
