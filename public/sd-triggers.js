/* public/sd-triggers.js — hook “Calcola la tua crescita” + scraping KPI robusto */
(function(){
  const TRY_SELECTORS = ['#calcolaBtn', '[data-cta="calcola"]', 'button'];
  const LABELS = [
    {key:'revenue',  rx:/fatturato\s+stimato/i, kind:'money'},
    {key:'budget',   rx:/budget\s+adv/i,       kind:'money'},
    {key:'fee',      rx:/canone\s+suite\s+digitale/i, kind:'money'},
    {key:'roi',      rx:/roi\s+previsionale/i, kind:'percent'},
    {key:'roas',     rx:/roas\s+stimato/i,     kind:'mult'},      // "0,2x"
    {key:'profit',   rx:/(utile|perdita)\s+mensile/i, kind:'money'},
    {key:'cpl',      rx:/cpl\s+stimato/i,      kind:'money'},
    {key:'cpa',      rx:/cpa\s+stimato/i,      kind:'money'}
  ];

  const money = (s)=>{ if(!s) return null; const m=String(s).replace(/[^\d,.\-]/g,'').replace(/\./g,'').replace(',', '.'); const v=parseFloat(m); return isNaN(v)?null:+v.toFixed(2); };
  const percent=(s)=>{ if(!s) return null; const m=String(s).replace(/[^\d,\-]/g,'').replace(',','.'); const v=parseFloat(m); return isNaN(v)?null:+v.toFixed(2); };
  const mult   =(s)=>{ if(!s) return null; const m=String(s).replace(/[^\d,.\-]/g,'').replace(',', '.'); const v=parseFloat(m); return isNaN(v)?null:+v.toFixed(2); };

  function nearestNumberText(el){
    if(!el) return null;
    // prova dentro lo stesso "card"
    let card = el.closest('div,section,li,article') || el.parentElement;
    if(card){
      const txt = card.textContent || '';
      const nums = txt.match(/[-]?\d[\d\.\,]*\s*(?:x|€|%|k)?/gi);
      if(nums && nums.length>0) return nums[nums.length-1];
    }
    // fallback: fratelli
    let sib = el.nextElementSibling;
    if(sib) return sib.textContent || null;
    return null;
  }

  function findValueByLabel(rx, kind){
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
    let candidates=[];
    while(walker.nextNode()){
      const n = walker.currentNode;
      const t = (n.textContent||'').trim();
      if (t && rx.test(t)) candidates.push(n);
    }
    for (const el of candidates){
      const raw = nearestNumberText(el);
      if(!raw) continue;
      if (kind==='money'){ const v = money(raw); if(v!=null) return v; }
      if (kind==='percent'){ const v = percent(raw); if(v!=null) return v; }
      if (kind==='mult'){ const v = mult(raw); if(v!=null) return v; }
    }
    return null;
  }

  function grabKPIs(){
    const out = {};
    LABELS.forEach(({key,rx,kind})=>{
      const v = findValueByLabel(rx, kind);
      if (v!=null) out[key]=v;
    });
    // se non abbiamo CPL/CPA non inserirli (evitiamo zeri sballati)
    return out;
  }

  function currentContext(){
    // prova a leggere business e settore
    const ctx = [];
    const q1 = Array.from(document.querySelectorAll('select, [role="combobox"], .sd-select, .select')).find(el => /A chi vendi|prodotti|servizi/i.test(el.closest('div')?.textContent||''));
    const q2 = Array.from(document.querySelectorAll('select, [role="combobox"], .sd-select, .select')).find(el => /settore/i.test(el.closest('div')?.textContent||''));
    const v1 = (q1 && (q1.value || q1.textContent)) ? (q1.value || q1.textContent).trim() : null;
    const v2 = (q2 && (q2.value || q2.textContent)) ? (q2.value || q2.textContent).trim() : null;
    if (v1) ctx.push('Business: '+v1);
    if (v2) ctx.push('Settore: '+v2);
    return ctx.join(' | ');
  }

  function onCalculate(){
    // attende che la pagina aggiorni i risultati, poi estrae i KPI
    setTimeout(() => {
      const kpi = grabKPIs();
      const ctx = currentContext();
      if (window.SuiteAssistantChat && typeof window.SuiteAssistantChat.analyseKPIsSilently==='function'){
        window.SuiteAssistantChat.analyseKPIsSilently(kpi, ctx);
      }
    }, 350);
  }

  function bind(){
    // aggancia tutti i bottoni "calcola"
    TRY_SELECTORS.forEach(sel=>{
      document.querySelectorAll(sel).forEach(btn=>{
        if (btn.__sdwBound) return;
        const label = (btn.textContent||'').toLowerCase();
        if (sel==='button' && !/calcola/.test(label)) return; // solo bottoni con "calcola"
        btn.__sdwBound = true;
        btn.addEventListener('click', onCalculate);
      });
    });
  }

  function boot(){
    bind();
    // rebind se cambia il DOM (page builders dinamici)
    const mo = new MutationObserver(()=>bind());
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
