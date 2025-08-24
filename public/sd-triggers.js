/* public/sd-triggers.js — apre chat + analizza KPI al click su "Calcola la tua crescita"
   + fallback su comparsa risultati, + click delegato globale */
(function () {
  function waitChat(cb){
    if (window.SuiteAssistantChat) return cb();
    setTimeout(()=>waitChat(cb), 250);
  }

  function byText(tag, txt){
    const t = txt.toLowerCase();
    return Array.from(document.querySelectorAll(tag))
      .find(el => (el.textContent||'').toLowerCase().includes(t));
  }

  function wire(){
    // 1) bottone "Calcola la tua crescita"
    let calc = document.querySelector('#calcolaBtn, [data-cta="calcola"]')
           || byText('button','calcola la tua crescita')
           || byText('a','calcola la tua crescita');
    if (calc && !calc.__sdw) {
      calc.__sdw = 1;
      calc.addEventListener('click', ()=>{
        setTimeout(()=>{ window.SuiteAssistantChat.open({autostart:false}); window.SuiteAssistantChat.analyse(); }, 500);
      });
    }

    // 2) observer risultati (ROI/ROAS presenti)
    const res = byText('section,div,article','ROI previsionale') || byText('section,div,article','ROAS');
    if (res && 'IntersectionObserver' in window) {
      let done = false;
      const io = new IntersectionObserver((en)=>{
        if (!done && en[0] && en[0].isIntersecting){
          done = true; io.disconnect();
          window.SuiteAssistantChat.open({autostart:false});
          window.SuiteAssistantChat.analyse();
        }
      }, {threshold:0.25});
      io.observe(res);
    }

    // 3) click delegato globale: qualunque elemento che contiene "calcola la tua crescita"
    document.addEventListener('click', (e)=>{
      const t = (e.target.closest('button, a, [role="button"]') || e.target);
      const tx = (t.textContent||'').toLowerCase();
      if(tx.includes('calcola la tua crescita')){
        setTimeout(()=>{ window.SuiteAssistantChat.open({autostart:false}); window.SuiteAssistantChat.analyse(); }, 500);
      }
    }, true);

    // 4) MutationObserver: se il DOM cambia ricollega
    const mo = new MutationObserver(()=>wire());
    mo.observe(document.body, {subtree:true, childList:true});
  }

  waitChat(wire);
})();
