/* public/sd-chat.js — bubble + UI + “typing…” + link bianchi + read-more */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-bg:#0f1220; --sd-panel:#15172a; --sd-accent:#8C52FF; --sd-ring:rgba(140,82,255,.35); }
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0b0f1e;color:#eef1ff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:16px 12px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:82%;padding:12px 14px;border-radius:14px;line-height:1.45;background:#151a33;border:1px solid rgba(255,255,255,.06)}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#1b2250;border:1px solid rgba(255,255,255,.1)}
  .chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
  .chip{background:#152042;border:1px solid rgba(255,255,255,.08);color:#cfe0ff;padding:6px 10px;border-radius:999px;cursor:pointer;font-size:13px}
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:var(--sd-accent);border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:#19a974;color:#fff;border:1px solid #128a5f;border-radius:12px;padding:10px 12px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.02)}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:var(--sd-accent);color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  a.sdw-link{color:#fff !important;text-decoration:underline}
  .typing{opacity:.9}
  .typing .dots{display:inline-block;min-width:1.5em}
  .rm-wrap.collapsed{max-height:8.5em;overflow:hidden;position:relative}
  .rm-wrap.collapsed:after{content:'';position:absolute;left:0;right:0;bottom:0;height:2.6em;background:linear-gradient(180deg, rgba(10,13,23,0), #0a0d17 65%)}
  .rm-toggle{display:inline-block;margin-top:6px;color:#9dc1ff;cursor:pointer;font-size:13px;text-decoration:underline}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== helpers ======
  const toHTML = (txt) => {
    let h = (txt||'').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(https?:\/\/[^\s)]+)/g, '<a class="sdw-link" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\*\*(.+?)\*:\s*/g, '<h4>$1</h4>');
    if (/^- /m.test(h)) h = '<ul>'+h.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';
    return h.replace(/\n/g,'<br/>');
  };
  function addReadMore(el){
    const wrap = document.createElement('div');
    wrap.className = 'rm-wrap';
    wrap.innerHTML = el.innerHTML;
    if (wrap.textContent.trim().length < 650) return el; // short
    wrap.classList.add('collapsed');
    const t = document.createElement('span');
    t.className = 'rm-toggle';
    t.textContent = 'Leggi di più';
    t.onclick = () => {
      if (wrap.classList.contains('collapsed')) {
        wrap.classList.remove('collapsed'); t.textContent = 'Mostra di meno';
      } else {
        wrap.classList.add('collapsed'); t.textContent = 'Leggi di più';
      }
    };
    el.innerHTML = ''; el.appendChild(wrap); el.appendChild(t);
    return el;
  }

  // typing row
  let typingTimer=null;
  function addTypingRow(){
    const row = document.createElement('div'); row.className = 'sdw-row ai typing';
    const msg = document.createElement('div'); msg.className = 'sdw-msg';
    msg.innerHTML = "L'assistente sta scrivendo<span class='dots'></span>";
    row.appendChild(msg); body.appendChild(row); body.scrollTop = body.scrollHeight;
    let dots=0; typingTimer = setInterval(()=>{ dots=(dots+1)%4; msg.querySelector('.dots').textContent='.'.repeat(dots); }, 380);
    return row;
  }
  function stopTyping(row){
    if (typingTimer) { clearInterval(typingTimer); typingTimer=null; }
    row && row.remove();
  }

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn, chipsBox;

  function mount() {
    if (root) return;

    // bubble
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => open({ autostart:true });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title"><span class="ava">🤖</span> <span>Assistente AI</span> <span class="dot"></span></div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div class="chips" id="sdw-chips"></div>
        <div id="sdw-foot"><button id="sdw-cta">Richiedi un’analisi gratuita 👉</button></div>
        <div id="sdw-foot">
          <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo il budget, consigli)">
          <button id="sdw-send">Invia</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    body     = root.querySelector('#sdw-body');
    input    = root.querySelector('#sdw-input');
    sendBtn  = root.querySelector('#sdw-send');
    ctaBtn   = root.querySelector('#sdw-cta');
    chipsBox = root.querySelector('#sdw-chips');

    root.querySelector('#sdw-close').onclick = () => close();
    ctaBtn.onclick = () => window.open(CTA_URL, '_blank');

    sendBtn.onclick = () => { const v=(input.value||'').trim(); if(!v) return; input.value=''; ask(v); };
    input.addEventListener('keydown', e => { if (e.key==='Enter'){ e.preventDefault(); sendBtn.click(); }});
  }
  function showPanel(){ root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display='none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display='inline-flex'; }

  function addRow(role, html) {
    const row = document.createElement('div'); row.className = 'sdw-row '+role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = html;
    row.appendChild(msg); body.appendChild(row); addReadMore(msg);
    body.scrollTop = body.scrollHeight;
    return row;
  }
  function setChips(labels){
    chipsBox.innerHTML=''; (labels||[]).forEach(lbl=>{
      const c = document.createElement('button'); c.className='chip'; c.textContent=lbl;
      c.onclick = ()=> ask(lbl);
      chipsBox.appendChild(c);
    });
  }

  async function ask(prompt, opts={}) {
    addRow('me', toHTML(prompt));
    const typing = addTypingRow();

    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**. Tono: amichevole, energico, propositivo.
Parla SEMPRE al **condizionale**: stiamo analizzando KPI **simulati** (non risultati storici).
Valorizza i benefici: team integrato Marketing+Vendite (strategist, media buyer, venditori), piattaforma all-in-one,
funnel, CRM e automazioni coordinati. Chiudi con invito alla **Consulenza Gratuita** (usa la CTA sotto, non link in chiaro).
Se la domanda non è in tema marketing/servizi, spiega che sei specializzato e invita a scriverci a **marketing@suitedigitale.it**
o **+39 351 509 4722**.
`.trim();

    try{
      const r = await fetch(ENDPOINT, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt, context: CONTEXT })
      });
      const j = await r.json().catch(()=> ({}));
      stopTyping(typing);
      addRow('ai', toHTML(j.text || j.message || 'Ok.'));
      setChips([
        'Cos’è Suite Digitale',
        'Perché scegliere Suite Digitale',
        'Come prenotare la consulenza',
        'Come lavoriamo (marketing + vendite)'
      ]);
    }catch(e){
      stopTyping(typing);
      addRow('ai', toHTML(
        `Non riesco a contattare il server. Intanto posso darti indicazioni generali sui KPI simulati e, se vuoi, possiamo parlarne in **consulenza gratuita**.`
      ));
    }
  }

  function open(opts={}){
    mount(); showPanel();
    if (opts.autostart){
      setChips(['Cos’è Suite Digitale','Perché scegliere Suite Digitale','Come prenotare la consulenza']);
      addRow('ai', toHTML(
        `Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**. 
Sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia. Quando hai i risultati, li interpretiamo insieme 💪`
      ));
    }
  }
  function close(){ hidePanel(); }

  // analisi silente dai triggers
  function analyseKPIsSilently(kpi, note){
    mount(); showPanel();
    setChips(['Cos’è Suite Digitale','Come prenotare la consulenza','Perché scegliere Suite Digitale']);

    const k = kpi || {};
    const safe = v => (v==null || isNaN(v)) ? 'nd' : v;
    const prompt = `
Analizza KPI **simulati** (condizionale). Se ROI/ROAS deboli: rassicura e spiega come in consulenza
definiremmo posizionamento, USP, pricing, funnel e ottimizzazioni per tornare in utile. 
Se buoni: come scaleremmo in sicurezza con controllo KPI.
Usa punti chiari (4–6) e chiudi invitando a cliccare il bottone **Richiedi un’analisi gratuita 👉**.

Fatturato: ${safe(k.revenue)} — Budget ADV: ${safe(k.budget)} — ROI: ${safe(k.roi)} — ROAS: ${safe(k.roas)} — Utile/Perdita: ${safe(k.profit)}
${note ? '\nContesto: '+note : ''}
`.trim();
    ask(prompt);
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  // sound apertura (solo all’open esplicito)
  window.addEventListener('SuiteAssistantOpenSound', ()=>{
    try{
      const a = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA...');
      a.volume = 0.25; a.play().catch(()=>{});
    }catch(_){}
  });
})();
