/* public/sd-triggers.js — Bridge affidabile KPI -> Chat
   - Ascolta SD_KPI (postMessage o CustomEvent)
   - Normalizza i numeri e chiama analyseKPIsSilently(kpi, context)
   - Fallback: prova a reagire al click su "Calcola la tua crescita"
*/
(function () {
  const W = window;

  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // ---------------- normalizzatori ----------------
  function toNum(raw){
    if (raw==null) return null;
    let s = String(raw).trim();
    // percentuali tipo "-95,36%" -> "-95,36"
    s = s.replace(/%/g,'');
    // roas tipo "0,2x" -> "0,2"
    s = s.replace(/x/gi,'');
    // valuta: toglie € e spazi
    s = s.replace(/[€\s]/g,'');
    // separatori decimali IT -> EN
    s = s.replace(/\./g,'').replace(/,/g,'.');
    // pulizia finale
    s = s.replace(/[^\d.\-]/g,'');
    if (!s || s === '.' || s === '-' ) return null;
    const n = Number(s);
    return isFinite(n) ? n : null;
  }

  function normalizeKPI(obj){
    if (!obj) return {};
    const out = {};
    const map = {
      revenue:'revenue', fatturato:'revenue',
      budget:'budget',   budget_adv:'budget',
      roi:'roi',
      roas:'roas',
      cpl:'cpl',
      cpa:'cpa',
      profit:'profit', utile:'profit', perdita:'profit'
    };
    for (const k in obj){
      const key = map[k] || k;
      const val = toNum(obj[k]);
      if (val!=null) out[key] = val;
    }
    // se è una perdita assicurati che il segno sia negativo quando coerente
    if (obj.perdita!=null && out.profit!=null) out.profit = -Math.abs(out.profit);
    return out;
  }

  function contextToNote(ctx){
    if (!ctx) return '';
    if (typeof ctx === 'string') return ctx;
    const bits = [];
    if (ctx.sector) bits.push(`Settore: ${ctx.sector}`);
    if (ctx.channel) bits.push(`Target: ${ctx.channel}`);
    if (ctx.note) bits.push(ctx.note);
    return bits.join(' · ');
  }

  function openAndAnalyse(kpi, ctxNote){
    if (!W.SuiteAssistantChat) return;
    try {
      // mostra pannello e analizza (messaggio "silente")
      W.SuiteAssistantChat.analyseKPIsSilently(kpi, ctxNote || '');
    } catch (e) {
      console.warn('[SD triggers] analyse error', e);
    }
  }

  // ---------------- Bridge: due modi equivalenti ----------------
  // 1) postMessage dal simulatore
  W.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d && d.type === 'SD_KPI' && d.payload){
      const kpi = normalizeKPI(d.payload);
      const note = contextToNote(d.context || d.contextNote);
      openAndAnalyse(kpi, note);
    }
  });

  // 2) CustomEvent('SD_KPI', { detail:{ kpi, context } })
  document.addEventListener('SD_KPI', (ev) => {
    const det = (ev && ev.detail) || {};
    const kpi = normalizeKPI(det.kpi || det.payload);
    const note = contextToNote(det.context);
    openAndAnalyse(kpi, note);
  });

  // Espone una API manuale se vuoi chiamarla da console/test
  W.SuiteAssistantChatBridge = {
    sendKPI(kpi, context){
      const kk = normalizeKPI(kpi);
      openAndAnalyse(kk, contextToNote(context));
    }
  };

  // ---------------- Fallback "Calcola la tua crescita" ----------------
  function wireCalcButton(){
    const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .filter(b => /calcola\s+la\s+tua\s+crescita/i.test(b.textContent||''));
    btns.forEach(b=>{
      if (b.__sdwired) return;
      b.__sdwired = 1;
      b.addEventListener('click', () => {
        // il simulatore dovrebbe emettere SD_KPI; in mancanza proviamo ad aprire soltanto
        setTimeout(() => {
          if (W.SuiteAssistantChat) W.SuiteAssistantChat.open({ autostart: false });
        }, 150);
      });
    });
  }

  onReady(()=>{
    wireCalcButton();
    // rewire per SPA
    let tries = 0;
    const id = setInterval(()=>{
      if (++tries>40) return clearInterval(id);
      wireCalcButton();
    }, 700);
  });

  console.log('[SD] triggers bridge pronto');
})();
