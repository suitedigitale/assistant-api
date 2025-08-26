/* public/sd-triggers.js — apre la chat su “Calcola” e invia KPI dagli ID */
(function(){
  var SEL = ['#calcolaBtn','[data-cta="calcola"]','button','a'];
  var ID  = {
    revenue:'#fatturatoKPI',   // € 3.250
    budget :'#budgetKPI',      // € 1.590
    roi    :'#roiKPI',         // -95,36%
    roas   :'#roasKPI',        // 0,2x
    profit :'#utilePerditaKPI',// € -2.570 / € 1.234
    cpl    :'#cplKPI',         // € 30   (se presente)
    cpa    :'#cpaKPI'          // € 318  (se presente)
  };

  function txt(sel){ var e=document.querySelector(sel); return e?(e.innerText||e.textContent||'').trim():''; }
  function num(t){
    if(!t) return null;
    t=String(t).replace(/\s+/g,'');
    if(/x$/i.test(t)) t=t.replace(/x/i,'');          // "0,2x"
    t=t.replace(/[€%]/g,'').replace(/\./g,'').replace(',','.');
    t=t.replace(/[^0-9.\-]/g,''); var n=parseFloat(t);
    return isNaN(n)?null:n;
  }
  function read(){
    var k={ revenue:num(txt(ID.revenue)), budget:num(txt(ID.budget)),
            roi:num(txt(ID.roi)), roas:num(txt(ID.roas)), profit:num(txt(ID.profit)),
            cpl:num(txt(ID.cpl)), cpa:num(txt(ID.cpa)) };
    Object.keys(k).forEach(x=>k[x]==null && delete k[x]); // niente zeri finti
    return k;
  }

  function hook(){
    var btn = SEL.map(q=>Array.from(document.querySelectorAll(q))).flat()
      .find(b=>(b.textContent||'').match(/calcola.*crescita/i));
    if(!btn || btn.__sd) return; btn.__sd=1;
    btn.addEventListener('click', function(){
      setTimeout(function(){
        if(!window.SuiteAssistantChat) return;
        var k = read(); if(Object.keys(k).length)
          window.SuiteAssistantChat.analyseKPIsSilently(k,'');
      }, 250); // lascia aggiornare i numeri
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', hook); else hook();
  new MutationObserver(hook).observe(document.documentElement,{childList:true,subtree:true});
  console.log('[SD] triggers minimal ready');
})();
