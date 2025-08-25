/* public/sd-triggers.js — aggancia “Calcola la tua crescita” e invia KPI */
(function(){
  const W = window;

  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // -------- parsing helpers (IT numbers) ----------
  function toNum(raw){
    if (raw==null) return null;
    let s = String(raw).replace(/\s+/g,'').replace(/[€]/g,'')
      .replace(/\./g,'').replace(/,/g,'.').replace(/[^\d\.\-]/g,'');
    if (!s || s==='.' || s==='-') return null;
    const n = Number(s);
    return isFinite(n) ? n : null;
  }
  function toPercent(raw){
    const m = String(raw).match(/-?\d+[,\.\d]*/);
    return m ? toNum(m[0]) : null;
  }
  function toRoas(raw){
    // es. "0,2x" -> 0.2
    const m = String(raw).match(/-?\d+[,\.\d]*/);
    return m ? toNum(m[0]) : null;
  }

  // -------- robust finders by label ----------
  function findCardValue(labelContains, preferPercent=false){
    // cerca nodo che contiene il label
    const all = Array.from(document.querySelectorAll('*'));
    const lab = all.find(el => el.children.length === 0 && /[^\s]/.test(el.textContent || '') &&
      (el.textContent||'').toLowerCase().includes(labelContains.toLowerCase()));
    if (!lab) return null;
    // guarda nel contenitore più vicino con un valore “grande”
    const card = lab.closest('[class*="card"], [class*="block"], [class*="box"]') || lab.parentElement;
    const scope = card || lab.parentElement || lab;
    const txt = (scope.textContent||'').replace(/\s+/g,' ');
    if (preferPercent) return toPercent(txt);
    if (/roas/i.test(labelContains)) return toRoas(txt);
    return toNum(txt);
  }

  function getKPI(){
    const k = {};
    k.revenue = findCardValue('Fatturato stimato');         // €
    k.budget  = findCardValue('Budget ADV mensile');        // €
    // “Canone Suite Digitale” non lo invio come KPI principale (ma potresti aggiungerlo con k.fee)
    k.roi     = findCardValue('ROI previsionale', true);    // %
    k.roas    = findCardValue('ROAS stimato');              // x
    // Utile/Perdita (positivo o negativo)
    const profitTxt = (function(){
      const all = Array.from(document.querySelectorAll('*'));
      const lab = all.find(el => /Perdita mensile|Utile mensile/i.test(el.textContent||''));
      if (!lab) return null;
      const scope = lab.closest('[class*="card"], [class*="block"], [class*="box"]') || lab.parentElement;
      return (scope || lab).textContent || '';
    })();
    if (profitTxt){
      const val = toNum(profitTxt);
      // “Perdita mensile” -> negativa
      const isLoss = /Perdita/i.test(profitTxt);
      k.profit = isLoss ? -Math.abs(val||0) : Math.abs(val||0);
    }

    // metriche conversione
    k.cpl = findCardValue('CPL stimato');
    k.cpa = findCardValue('CPA stimato');

    // pulizia: rimuovi null/NaN
    Object.keys(k).forEach(key => { if (k[key]==null || !isFinite(k[key])) delete k[key]; });
    return k;
  }

  function openAndAnalyse(){
    if (!W.SuiteAssistantChat) return;
    const kpi = getKPI();
    // se non abbiamo almeno ROI o ROAS + budget/fatturato, apri con invito a compilare
    if (Object.keys(kpi).length === 0) {
      W.SuiteAssistantChat.open({ autostart:true });
      return;
    }
    const sectorEl = document.querySelector('[aria-label*="Settore"], [id*="settore"]') || document.querySelector('[data-field="settore"]');
    const sector = sectorEl ? (sectorEl.value || sectorEl.textContent || '').trim() : '';
    const b2El = document.querySelector('[data-field*="B2"], .badge-b2b, .badge-b2c');
    const channel = b2El ? (b2El.textContent||'').trim() : '';
    const ctx = `Settore: ${sector||'nd'}; Target: ${channel||'nd'}.`;
    W.SuiteAssistantChat.analyseKPIsSilently(kpi, ctx);
  }

  function wireCalcButton(){
    // Agganciati al bottone “Calcola la tua crescita”
    const byText = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .find(b => /calcola la tua crescita/i.test(b.textContent||''));
    if (byText && !byText.__sdwCalc){
      byText.__sdwCalc = 1;
      byText.addEventListener('click', () => {
        // leggero delay per permettere al DOM di aggiornare i risultati
        setTimeout(openAndAnalyse, 120);
      });
    }
  }

  onReady(()=>{
    // non apriamo nulla all’avvio; solo wiring
    wireCalcButton();
    // in caso di SPA, ritenta ogni 800ms finché troviamo il bottone
    let tries = 0;
    const id = setInterval(()=>{
      if (++tries>20) return clearInterval(id);
      wireCalcButton();
    }, 800);
  });
})();

