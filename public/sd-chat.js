/* public/sd-chat.js — bubble + UI + typing + chip + CTA (niente link in chiaro) */
(function () {
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // --- CSS ---
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root{--sd-accent:#8C52FF;--sd-bg:#0b0f1a;--sd-panel:#101426;--sd-muted:#b8bed2}
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0c0f1a;color:#eef1ff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}

  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:16px 12px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:82%;padding:12px 14px;border-radius:14px;line-height:1.45;background:#151a33;border:1px solid rgba(255,255,255,.06)}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#1a1f45;border:1px solid rgba(255,255,255,.10)}
  .sdw-msg h4{margin:.2rem 0 .4rem 0;font-size:15px;font-weight:800}
  .sdw-msg strong{font-weight:800}
  .typing .sdw-msg{opacity:.85}
  .dots{display:inline-block;min-width:1.2em}
  .dots:after{content:'…';animation:sdDots 1.2s steps(3,end) infinite}
  @keyframes sdDots{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}

  .chips{display:flex;gap:8px;flex-wrap:wrap;margin:8px 4px 0}
  .chip{background:#121632;border:1px solid rgba(255,255,255,.1);color:#dfe3ff;border-radius:999px;padding:8px 12px;cursor:pointer;font-size:13px}
  .chip:hover{border-color:var(--sd-accent)}

  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220;flex-wrap:wrap}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px rgba(140,82,255,.35)}
  #sdw-send{background:var(--sd-accent);border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{width:100%;background:#8C52FF;color:#fff;border:0;border-radius:14px;padding:12px 14px;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.04)}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:var(--sd-accent);color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  a.sdw-link{color:#fff;text-decoration:underline}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // --- helpers ---
  function sanitize(txt){ return (txt||'').replace(/https?:\/\/\S+/g,''); } // niente link testuali
  function toHTML(txt){ let h=sanitize(txt); h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>'); h=h.replace(/\*\*(.+?)\*\:\s*/g,'<h4>$1</h4>'); return h.replace(/\n/g,'<br/>'); }

  let root, body, input, sendBtn, ctaBtn, chipsBox, bubbleBtn;

  function mount() {
    if (root) return;

    // bubble
    bubbleBtn = document.createElement('button');
    bubbleBtn.id='sdw-bubble'; bubbleBtn.type='button';
    bubbleBtn.textContent='🤖 Assistente AI';
    bubbleBtn.onclick = () => open({autostart:true});
    document.body.appendChild(bubbleBtn);
    bubbleBtn.style.display='inline-flex';

    // panel
    root = document.createElement('div'); root.id='sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title"><span class="ava">🤖</span><span>Assistente AI</span><span class="dot"></span></div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div class="chips" id="sdw-chips"></div>
        <div id="sdw-foot">
          <button id="sdw-cta">Richiedi un’analisi gratuita 👉</button>
          <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo il budget, consigli)">
          <button id="sdw-send">Invia</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    body    = root.querySelector('#sdw-body');
    input   = root.querySelector('#sdw-input');
    sendBtn = root.querySelector('#sdw-send');
    ctaBtn  = root.querySelector('#sdw-cta');
    chipsBox= root.querySelector('#sdw-chips');

    root.querySelector('#sdw-close').onclick = close;
    ctaBtn.onclick = () => window.open(CTA_URL,'_blank');

    const fire = () => { const v=(input.value||'').trim(); if(!v) return; input.value=''; ask(v,{silent:false}); };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); fire(); } });

    renderQuickReplies();
  }

  function showPanel(){ root.classList.add('sdw-visible'); bubbleBtn.style.display='none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); bubbleBtn.style.display='inline-flex'; }

  function addRow(role, html, typing=false){
    const r=document.createElement('div'); r.className='sdw-row '+role+(typing?' typing':'');
    const m=document.createElement('div'); m.className='sdw-msg'; m.innerHTML=html;
    r.appendChild(m); body.appendChild(r); body.scrollTop=body.scrollHeight; return r;
  }
  function typingRow(){ return addRow('ai',"L'assistente sta scrivendo<span class='dots'></span>",true); }

  // quick replies (silent)
  const QUICK={
    cos:"Cos'è Suite Digitale? Spiegalo in 6-8 righe, senza link.",
    why:"Perché scegliere Suite Digitale rispetto a un'agenzia? Elenca i motivi in 5 punti chiari e concreti, senza link.",
    how:"Come si prenota la consulenza gratuita? Spiega i passaggi in 4-5 punti e ricordami che posso usare il bottone."
  };
  function renderQuickReplies(){
    chipsBox.innerHTML='';
    [['Cos’è Suite Digitale','cos'],['Perché scegliere Suite Digitale','why'],['Come prenotare la consulenza','how']]
    .forEach(([label,key])=>{
      const b=document.createElement('button'); b.className='chip'; b.type='button'; b.textContent=label;
      b.onclick=()=>ask(QUICK[key],{silent:true}); // non mostra il testo dell’utente
      chipsBox.appendChild(b);
    });
  }

  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(prompt));
    const trow = typingRow();

    const CONTEXT=`
Sei l’Assistente AI di **Suite Digitale**. Tono: cordiale, motivante, proattivo.
Analizza KPI **simulati** in condizionale (“otterresti / rientrerebbero…”).
Se ROI/ROAS deboli: rassicura e spiega che in consulenza analizzeremo posizionamento, USP, pricing,
margini, tassi di conversione e come evitare sprechi. Se buoni: come scalare con team integrato.
Niente link testuali: invita a cliccare **il bottone in basso**.
FAQ chiave: team incluso; formiamo venditori; soddisfatto o rimborsato (mese successivo); dati basati su 220+ progetti.
`.trim();

    try{
      const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'analysis',prompt,context:CONTEXT,meta:opts.meta||null})});
      const j=await res.json().catch(()=>({}));
      const out=(j && (j.text||j.message))? (j.text||j.message) : 'Ok.';
      trow.querySelector('.sdw-msg').innerHTML=toHTML(out)+'<br><br><strong>Vuoi andare a fondo con il tuo caso?</strong> Usa il bottone qui sotto 👉';
      trow.classList.remove('typing'); body.scrollTop=body.scrollHeight;
    }catch(e){
      trow.querySelector('.sdw-msg').innerHTML=toHTML("Non riesco a contattare il server ora. Posso comunque darti indicazioni e prenotare l’analisi dal bottone qui sotto.");
      trow.classList.remove('typing');
    }
  }

  function welcome(){
    addRow('ai', toHTML("Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**. Intanto sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia."));
  }
  function open(opts={}){ mount(); showPanel(); if (opts.autostart) welcome(); }
  function close(){ hidePanel(); }

  function analyseKPIsSilently(kpi, contextNote){
    mount(); showPanel();
    const k=kpi||{};
    const prompt=`
Analizza questi KPI **simulati** (condizionale, niente link): 
- ROI: ${k.roi ?? 'nd'} | ROAS: ${k.roas ?? 'nd'} 
- Budget: ${k.budget ?? 'nd'} | Fatturato: ${k.revenue ?? 'nd'}
${k.cpl!=null ? '- CPL: '+k.cpl : ''} ${k.cpa!=null ? '| CPA: '+k.cpa : ''}
${k.profit!=null ? '| Utile/Perdita: '+k.profit : ''}.
${contextNote ? 'Contesto: '+contextNote : ''}

Fornisci 4–6 punti: lettura rapida, rischi/opportunità, cosa faremmo in consulenza (posizionamento/USP, pricing, margini, funnel), quando scalare, invito a premere il bottone in basso.
`.trim();
    ask(prompt,{silent:true,meta:{kpi}});
  }

  window.SuiteAssistantChat={open,close,ask,analyseKPIsSilently};

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
