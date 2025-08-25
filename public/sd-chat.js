/* public/sd-chat.js — Assistente AI · KPI-aware · typing animato · quick replies */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';
  const BRAND    = '#8C52FF';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-bg:#0f1220; --sd-panel:#15172a; --sd-muted:#aeb3c7; --sd-accent:${BRAND}; --sd-ring:rgba(140,82,255,.35); }
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:420px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0c0f1a;color:#eef1ff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:420px;max-height:68vh;overflow:auto;padding:16px 12px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:84%;padding:12px 14px;border-radius:14px;line-height:1.48}
  .sdw-msg p{margin:.35rem 0}
  .sdw-msg ul{margin:.35rem 0 .8rem 1.1rem}
  .sdw-msg h4{margin:.2rem 0 .4rem 0;font-size:15px;font-weight:800}
  .ai{justify-content:flex-start}
  .ai .sdw-msg{background:#151a33;border:1px solid rgba(255,255,255,.06)}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#1b2250;border:1px solid rgba(255,255,255,.1)}
  /* quick replies */
  .sdw-qr{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .sdw-chip{border:1px solid rgba(255,255,255,.18);background:transparent;color:#cfd3e9;border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer}
  /* typing */
  .typing{display:flex;align-items:center;gap:6px;opacity:.85;font-style:italic}
  .dots{display:inline-flex;gap:3px}
  .dot{width:6px;height:6px;border-radius:50%;background:#cfd3e9;opacity:.25;animation:blink 1.2s infinite}
  .dot.d2{animation-delay:.2s}.dot.d3{animation-delay:.4s}
  @keyframes blink { 0%,20%{opacity:.25} 50%{opacity:1} 100%{opacity:.25} }
  /* input + CTA */
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220;flex-wrap:wrap}
  #sdw-cta{flex:1 1 100%;background:${BRAND};color:#fff;border:0;border-radius:10px;padding:10px 12px;font-weight:800;text-align:center;cursor:pointer}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:${BRAND};border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:${BRAND};color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  a.sdw-link{color:#fff;text-decoration:underline} /* link sempre bianchi e cliccabili */
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== helpers ======
  const escapeHTML = (t) => String(t||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));
  const toHTML = (txt) => {
    let h = (txt||'');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');               // **bold**
    h = h.replace(/\*\*(.+?)\*\:\s*/g, '<h4>$1</h4>');                    // **Titolo:** -> h4
    if (/^- /m.test(h)) h = '<ul>'+h.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>'; // - bullet
    h = escapeHTML(h).replace(/\n/g,'<br/>');                              // nl2br + escape
    // poi linkify (aggiunge classe e lascia bianco)
    h = h.replace(/(https?:\/\/[^\s)<>"']+)/g, '<a class="sdw-link" href="$1" target="_blank" rel="noopener">$1</a>');
    // CTA canonical
    h = h.replace(/https?:\/\/www\.suitedigitale\.it\/candidatura\/?/g,
      '<a class="sdw-link" href="https://www.suitedigitale.it/candidatura/" target="_blank" rel="noopener">https://www.suitedigitale.it/candidatura/</a>');
    return h;
  };

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn, typingEl, welcomed=false;

  function mount() {
    if (root) return;
    // Bubble
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => open({ autostart: false });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title"><span class="ava">🤖</span> <span>Assistente AI</span> <span class="dot" title="online"></span></div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
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

    root.querySelector('#sdw-close').onclick = close;
    ctaBtn.onclick = () => { window.open(CTA_URL, '_blank'); };

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = ''; ask(v);
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });

    // messaggio soft solo se l’utente apre prima del calcolo
    addAI("Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**. Intanto sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.");
    showQuickReplies(['Perché scegliere Suite Digitale','Cos’è Suite Digitale','Come prenotare la consulenza']);
  }

  function showPanel(){ root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display='none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display='inline-flex'; }
  function scrollB(){ body.scrollTop = body.scrollHeight; }

  function addRow(role, html) {
    const row = document.createElement('div'); row.className = 'sdw-row ' + role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = html;
    row.appendChild(msg); body.appendChild(row); scrollB(); return msg;
  }
  function addME(t){ addRow('me', toHTML(t)); }
  function addAI(t){ const el = addRow('ai', toHTML(t)); return el; }

  // quick replies
  function showQuickReplies(labels){
    const last = body.lastElementChild && body.lastElementChild.querySelector('.sdw-msg');
    if(!last) return;
    const wrap = document.createElement('div'); wrap.className = 'sdw-qr';
    labels.forEach(l=>{
      const b=document.createElement('button'); b.className='sdw-chip'; b.textContent=l;
      b.onclick=()=> {
        addME(l);
        ask(l);
      };
      wrap.appendChild(b);
    });
    last.appendChild(wrap); scrollB();
  }

  // typing indicator
  function setTyping(on){
    if(on){
      if(typingEl) return;
      typingEl = document.createElement('div'); typingEl.className='sdw-row ai';
      typingEl.innerHTML = '<div class="sdw-msg typing">L’assistente sta scrivendo <span class="dots"><span class="dot"></span><span class="dot d2"></span><span class="dot d3"></span></span></div>';
      body.appendChild(typingEl); scrollB();
    }else if(typingEl){
      typingEl.remove(); typingEl=null;
    }
  }

  // ====== Backend call ======
  const BASE_CONTEXT = `
Sei l’Assistente AI di **Suite Digitale** (team integrato: strategist, media buyer, venditori telefonici/settler; piattaforma all-in-one con funnel, CRM e automazioni).
Tono: amichevole, positivo, energico, proattivo. Usa **condizionale** parlando di proiezioni del simulatore.
Se ROI/ROAS deboli: rassicura e spiega che in **consulenza gratuita** analizzeremmo situazione attuale, obiettivi, KPI, posizionamento, USP e pricing per portare la strategia in profitto.
Se KPI positivi: celebra e spiega come **scaleremmo** con test, controllo KPI e coordinamento marketing+vendite.
Evita di far “fare da solo” all’utente: valorizza ciò che faremo NOI con lui in consulenza.
Chiudi sempre con CTA: **Vuoi andare a fondo con il tuo caso?** Prenota qui 👉 ${CTA_URL}
`.trim();

  async function ask(prompt, opts={meta:null}) {
    addME(prompt);
    setTyping(true);
    try{
      const res = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt, context: BASE_CONTEXT, meta: opts.meta || null })
      });
      const j = await res.json().catch(()=>({}));
      setTyping(false);
      addAI(j.text || j.message || JSON.stringify(j));
      showQuickReplies(['Perché scegliere Suite Digitale','Come prenotare la consulenza','Come lavoriamo (marketing + vendite)']);
    }catch(e){
      setTyping(false);
      addAI(`Piccolo intoppo di rete 😅. Intanto posso darti un orientamento e prepararti alla **Consulenza Gratuita** 👉 ${CTA_URL}`);
      showQuickReplies(['Cos’è Suite Digitale','Perché scegliere Suite Digitale','Come prenotare la consulenza']);
    }
  }

  // ====== API ======
  function open(opts={}) { mount(); showPanel(); if (!welcomed && opts.autostart){ welcomed=true; /* il primo saluto lo fa già mount */ } }
  function close(){ hidePanel(); }

  // chiamata dai trigger dopo il calcolo → prompt “silente”
  function analyseKPIsSilently(kpi, contextNote) {
    mount(); showPanel();
    setTyping(true);
    const k = kpi || {};
    const prompt = `
Analizza (in condizionale) questi **KPI simulati** (non risultati reali ma proiezioni): 
- ROI previsionale: ${k.roi ?? 'nd'}%
- ROAS stimato: ${k.roas ?? 'nd'}
- Budget ADV mensile: ${k.budget != null ? k.budget : 'nd'}
- Fatturato stimato: ${k.revenue != null ? k.revenue : 'nd'}
- Canone: ${k.canone != null ? k.canone : 'nd'}
- Utile mensile: ${k.utile != null ? k.utile : 'nd'}
${contextNote ? 'Contesto: ' + contextNote : ''}

Fornisci 4–6 punti: lettura rapida, rischi/opportunità, come interverremmo noi (team integrato marketing+vendite) per portare a profitto o scalare, e chiudi con CTA “Prenota qui 👉 ${CTA_URL}”.
`.trim();
    // invio senza mostrare messaggio utente
    (async ()=>{
      try{
        const res = await fetch(ENDPOINT, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ mode:'analysis', prompt, context: BASE_CONTEXT, meta:{kpi} })
        });
        const j = await res.json().catch(()=>({}));
        setTyping(false);
        addAI(j.text || j.message || JSON.stringify(j));
        showQuickReplies(['Perché scegliere Suite Digitale','Come prenotare la consulenza','Come lavoriamo (marketing + vendite)']);
      }catch(e){
        setTyping(false);
        addAI(`Ho difficoltà a contattare il server in questo momento. Posso comunque spiegarti come interpreteremmo questi numeri e cosa faremmo in consulenza. Prenota qui 👉 ${CTA_URL}`);
        showQuickReplies(['Cos’è Suite Digitale','Perché scegliere Suite Digitale','Come prenotare la consulenza']);
      }
    })();
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  // bubble pronto
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
