/* public/sd-triggers.js — apre la chat al click su "Calcola la tua crescita"
   e passa KPI letti in modo robusto (DOM + fallback su testo pagina). */
(function(){
  const W = window;

  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // ---------- helpers numerici ----------
  function toNum(raw){
    if (raw==null) return null;
    let s = String(raw).replace(/\s+/g,'').replace(/[€]/g,'')
      .replace(/\./g,'').replace(/,/g,'.').replace(/[^\d\.\-]/g,'');
    if (!s || s==='.' || s==='-') return null;
    const n = Number(s);
    return isFinite(n) ? n : null;
  }
  const toPercent = (raw)=> {
    const m = String(raw).match(/-?\d+[.,]?\d*\s*%/);
    return m ? toNum(m[0]) : null;
  };
  const toRoas = (raw)=> {
    const m = String(raw).match(/-?\d+[.,]?\d*\s*x/);
    return m ? toNum(m[0]) : null;
  };

  // ---------- lettura vicino al label (DOM) ----------
  function findLabelEl(labelContains){
    const all = Array.from(document.querySelectorAll('*'));
    return all.find(el =>
      el.children.length === 0 &&
      /[^\s]/.test(el.textContent || '') &&
      (el.textContent||'').toLowerCase().includes(labelContains.toLowerCase())
    ) || null;
  }
  function nextNumericText(el){
    let cur = el;
    for (let depth=0; depth<6 && cur; depth++){
      // sibling a destra
      let s = cur.nextElementSibling;
      while(s){
        const t = (s.textContent||'').trim();
        if (/[€\d]/.test(t)) return t;
        const cand = s.querySelector && s.querySelector('*');
        if (cand && /[€\d]/.test(cand.textContent||'')) return cand.textContent;
        s = s.nextElementSibling;
      }
      // nel contenitore
      const scope = cur.parentElement;
      if (scope){
        const strongNum = Array.from(scope.querySelectorAll('*')).find(n => /[€\d]/.test((n.textContent||'')));
        if (strongNum) return strongNum.textContent;
      }
      cur = cur.parentElement;
    }
    return '';
  }
  function getFromLabelDOM(label, kind){
    const lab = findLabelEl(label);
    if (!lab) return null;
    const raw = nextNumericText(lab) || lab.textContent || '';
    if (kind==='percent') return toPercent(raw);
    if (kind==='roas')    return toRoas(raw);
    return toNum(raw);
  }

  // ---------- fallback: scanning del testo pagina vicino al label ----------
  function pageText(){ return (document.body.innerText || '').replace(/\u00A0/g,' '); }
  function grabAfter(labelRegex, kind, windowChars=140){
    const txt = pageText();
    const rx = (labelRegex instanceof RegExp) ? labelRegex : new RegExp(labelRegex,'i');
    const m = txt.match(rx);
    if (!m) return null;
    const idx = m.index + m[0].length;
    const slice = txt.slice(idx, idx + windowChars);

    if (kind==='percent'){
      const p = slice.match(/-?\d+[.,]?\d*\s*%/);
      return p ? toNum(p[0]) : null;
    }
    if (kind==='roas'){
      const r = slice.match(/-?\d+[.,]?\d*\s*x/);
      return r ? toNum(r[0]) : null;
    }
    const e = slice.match(/€?\s*-?\s*[\d.]+(?:,\d+)?/);
    return e ? toNum(e[0]) : null;
  }

  // ---------- utile/perdita ----------
  function getProfit(){
    // DOM
    let lab = findLabelEl('Perdita mensile') || findLabelEl('Utile mensile');
    if (lab){
      const raw = (nextNumericText(lab) || lab.textContent || '');
      const val = toNum(raw);
      if (val!=null){
        const isLoss = /Perdita/i.test((lab.textContent||'') + ' ' + raw);
        return isLoss ? -Math.abs(val) : Math.abs(val);
      }
    }
    // testo pagina
    const txt = pageText();
    const mLoss = txt.match(/Perdita\s+mensile.*?(€?\s*-?\s*[\d.]+(?:,\d+)?)/i);
    if (mLoss) return -Math.abs(toNum(mLoss[1]||'')||0);
    const mProfit = txt.match(/Utile\s+mensile.*?(€?\s*-?\s*[\d.]+(?:,\d+)?)/i);
    if (mProfit) return Math.abs(toNum(mProfit[1]||'')||0);
    return null;
  }

  // ---------- KPI master ----------
  function getKPI(){
    // 1) prova DOM
    let k = {
      revenue : getFromLabelDOM('Fatturato stimato'),
      budget  : getFromLabelDOM('Budget ADV mensile'),
      canone  : getFromLabelDOM('Canone Suite Digitale'),
      roi     : getFromLabelDOM('ROI previsionale','percent'),
      roas    : getFromLabelDOM('ROAS stimato','roas'),
      cpl     : getFromLabelDOM('CPL stimato'),
      cpa     : getFromLabelDOM('CPA stimato'),
      profit  : getProfit()
    };

    // 2) se mancano pezzi, fallback “full-text”
    if (k.revenue==null) k.revenue = grabAfter(/Fatturato\s+stimato/i, 'euro');
    if (k.budget==null)  k.budget  = grabAfter(/Budget\s+ADV\s+mensile/i, 'euro');
    if (k.canone==null)  k.canone  = grabAfter(/Canone\s+Suite\s+Digitale/i, 'euro');
    if (k.roi==null)     k.roi     = grabAfter(/ROI\s+previsionale/i, 'percent');
    if (k.roas==null)    k.roas    = grabAfter(/ROAS\s+stimato/i, 'roas');
    if (k.cpl==null)     k.cpl     = grabAfter(/CPL\s+stimato/i, 'euro');
    if (k.cpa==null)     k.cpa     = grabAfter(/CPA\s+stimato/i, 'euro');
    if (k.profit==null)  k.profit  = getProfit();

    // 3) se manca profit ma abbiamo revenue/budget/canone → calcola
    if (k.profit==null && (k.revenue!=null) && (k.budget!=null)){
      const can = k.canone!=null ? k.canone : 0;
      k.profit = (k.revenue - (k.budget + can));
    }

    // pulizia: rimuovi null/NaN
    Object.keys(k).forEach(key => { if (k[key]==null || !isFinite(k[key])) delete k[key]; });

    // niente canone nel payload KPI finale (non serve al prompt)
    if ('canone' in k) delete k.canone;
    return k;
  }

  function getContext(){
    const sectorEl = document.querySelector('[aria-label*="Settore"], [id*="settore"]') || document.querySelector('[data-field="settore"]');
    const sector = sectorEl ? (sectorEl.value || sectorEl.textContent || '').trim() : '';
    const b2El = document.querySelector('[data-field*="B2"], .badge-b2b, .badge-b2c');
    const channel = b2El ? (b2El.textContent||'').trim() : '';
    return `Settore: ${sector||'nd'}; Target: ${channel||'nd'}.`;
  }

  function analyseNow(){
    if (!W.SuiteAssistantChat) return;
    const kpi = getKPI();
    if (Object.keys(kpi).length === 0) {
      W.SuiteAssistantChat.open({ autostart:true });
      return;
    }
    W.SuiteAssistantChat.analyseKPIsSilently(kpi, getContext());
  }

  // dopo click: aspetta che i valori vengano popolati nel DOM/testo
  function waitForKPIsThenAnalyse(){
    const started = Date.now();
    (function tick(){
      const k = getKPI();
      if (Object.keys(k).length >= 2) return analyseNow();
      if (Date.now() - started > 3500) return analyseNow();
      setTimeout(tick, 150);
    })();
  }

  function wireCalcButton(){
    const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .filter(b => /calcola\s+la\s+tua\s+crescita/i.test(b.textContent||''));
    btns.forEach(b=>{
      if (b.__sdwCalc) return;
      b.__sdwCalc = 1;
      b.addEventListener('click', () => setTimeout(waitForKPIsThenAnalyse, 80));
    });
  }

  onReady(()=>{
    wireCalcButton();
    // retry per SPA/ri-render
    let tries = 0;
    const id = setInterval(()=>{
      if (++tries>40) return clearInterval(id);
      wireCalcButton();
    }, 700);
  });
})();
