(function(){
  const ENDPOINT='https://assistant-api-xi.vercel.app/api/assistant';

  // ---- CSS compatto
  if (document.getElementById('sdw-style')) return;
  const css='#sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:380px;max-width:calc(100vw - 32px);display:none}'+
            '#sdw-root.sdw-visible{display:block}'+
            '#sdw-panel{background:#151723;color:#e6e8ee;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}'+
            '#sdw-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}'+
            '#sdw-title{font-weight:700;font-size:14px}'+
            '#sdw-status{font-size:11px;color:#98a0b3;margin-left:8px;background:rgba(255,255,255,.06);padding:3px 8px;border-radius:999px}'+
            '#sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}'+
            '#sdw-body{height:360px;max-height:60vh;overflow:auto;padding:12px;background:#0b0c10}'+
            '.sdw-row{margin:8px 0} .me{color:#cdd2ff} .ai{color:#e6e8ee}'+
            '#sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:#151723}'+
            '#sdw-input{flex:1;background:#0f1220;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#e6e8ee;padding:10px}'+
            '#sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}';
  const st=document.createElement('style'); st.id='sdw-style'; st.textContent=css; document.head.appendChild(st);

  // ---- UI
  let root, body, input, sendBtn, statusEl;
  function mount(){
    if(root) return;
    root=document.createElement('div'); root.id='sdw-root';
    root.innerHTML='<div id="sdw-panel">'+
      '<div id="sdw-head"><div><span id="sdw-title">Suite Digitale · Assistente</span><span id="sdw-status">AI: Verifica…</span></div>'+
      '<button id="sdw-close" aria-label="Chiudi">×</button></div>'+
      '<div id="sdw-body"></div>'+
      '<div id="sdw-foot"><input id="sdw-input" type="text" placeholder="Scrivi qui…"><button id="sdw-send">Invia</button></div>'+
    '</div>';
    document.body.appendChild(root);
    body=root.querySelector('#sdw-body');
    input=root.querySelector('#sdw-input');
    sendBtn=root.querySelector('#sdw-send');
    statusEl=root.querySelector('#sdw-status');
    root.querySelector('#sdw-close').onclick=()=>root.classList.remove('sdw-visible');
    const fire=()=>{const v=(input.value||'').trim(); if(!v) return; input.value=''; ask(v);};
    sendBtn.onclick=fire; input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fire();}});
  }
  function show(){ root.classList.add('sdw-visible'); }
  function add(from, t){ const r=document.createElement('div'); r.className='sdw-row '+from; r.textContent=(from==='me'?'Tu: ':'AI: ')+t; body.appendChild(r); body.scrollTop=body.scrollHeight; }

  // ---- ping e ask
  async function ping(){
    try{
      const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'analysis',prompt:'ping'})});
      const j=await r.json().catch(()=>({}));
      statusEl.textContent = (j && (j.ok || j.text)) ? 'AI: Online' : 'AI: Offline';
    }catch{ statusEl.textContent='AI: Offline'; }
  }
  async function ask(t){
    add('me',t); add('ai','⌛ Sto analizzando…');
    try{
      const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'analysis',prompt:t})});
      const j=await r.json().catch(()=>({}));
      body.lastChild.textContent='AI: '+(j.text||j.message||JSON.stringify(j));
    }catch(e){ body.lastChild.textContent='AI: errore '+e.message; }
    add('ai','Vuoi prenotare una consulenza gratuita con uno strategist (€350 di valore)? Scrivi “voglio parlare con voi”.');
  }

  // ---- API globale
  function open(opts={}){
    mount(); show(); ping();
    if(opts.autostart){ add('ai','Ciao! Posso rivedere budget ADV, ROI e priorità. Scrivi “ping” per provare.'); }
  }
  window.SuiteAssistantChat = { open, quickAsk: (t)=>{mount(); show(); ask(t);} };

  console.log('[SD] sd-chat.js caricato');
})();
