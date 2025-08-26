/* public/sd-chat.js — bubble + UI + invii “silenti” + clamp + typing */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root {
    --sd-bg:#0f1220; --sd-panel:#15172a; --sd-muted:#aeb3c7;
    --sd-accent:#8C52FF; --sd-ring:rgba(140,82,255,.35);
    --sd-user:#9255FF; --sd-user-border:#38006A;
  }
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;
    font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;
    max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0c0f1a;color:#eef1ff;border:1px solid rgba(255,255,255,.08);
    border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:10px;justify-content:space-between;
    padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:420px;max-height:66vh;overflow:auto;padding:16px 12px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:82%;padding:12px 14px;border-radius:14px;line-height:1.45;position:relative}
  .ai{justify-content:flex-start}
  .ai .sdw-msg{background:#151a33;border:1px solid rgba(255,255,255,.06)}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:var(--sd-user);border:2px solid var(--sd-user-border);color:#fff}
  .sdw-msg h4{margin:.15rem 0 .35rem 0;font-size:15px;font-weight:800}
  .sdw-msg p{margin:.25rem 0}
  .sdw-msg ul{margin:.3rem 0 .6rem 1.15rem}
  .sdw-msg strong{font-weight:800}
  a.sdw-link{color:#fff;text-decoration:underline}
  .typing{opacity:.9}
  .typing .dots{display:inline-block;width:18px;text-align:left}
  .typing .dots:after{content:'…';animation:sdDots 1.2s infinite}
  @keyframes sdDots{0%{content:' .  '}33%{content:' .. '}66%{content:' ...'}100%{content:' .  '}}
  /* clamp */
  .clamp-wrap{max-height:260px;overflow:hidden;mask-image:linear-gradient(#000, #0008 80%, transparent)}
  .clamp-actions{display:flex;gap:8px;margin-top:8px}
  .clamp-btn{background:transparent;border:0;color:var(--sd-accent);cursor:pointer;font-weight:700;padding:0}
  /* footer */
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220;flex-wrap:wrap}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:var(--sd-accent);border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:2px 0;background:#7b5cff;border:0;color:#fff;border-radius:12px;padding:12px 14px;
    text-align:center;font-weight:800;cursor:pointer;width:100%}
  #sdw-cta:hover{filter:brightness(1.04)}
  /* chips */
  .chips{display:flex;gap:10px;flex-wrap:wrap;margin:6px 12px 0 12px}
  .chip{background:#10142a;border:1px solid rgba(255,255,255,.08);color:#e2e6ff;border-radius:999px;padding:8px 12px;cursor:pointer;font-size:13px}
  /* bubble */
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:var(--sd-accent);color:#fff;border:0;border-radius:999px;
    padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== tiny helpers ======
  const toHTML = (txt) => {
    // niente link testuali: evitiamo auto-ancore, usiamo solo bold/elenchi
    let h = (txt||'').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // titoletti "**X:**" -> <h4>
    h = h.replace(/\*\*(.+?)\*\:\s*/g, '<h4>$1</h4>');
    // bullet "- " -> <ul><li>
    if (/^- /m.test(h)) h = '<ul>'+h.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';
    return h.replace(/\n/g,'<br/>');
  };

  function beepOpen() {
    try{
      const ac = new (window.AudioContext||window.webkitAudioContext)();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.05, ac.currentTime+0.01);
      o.start(); o.stop(ac.currentTime+0.15);
    }catch(e){}
  }

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn, chipsWrap;

  function clampify(msgEl){
    // applica clamping solo alle risposte AI
    requestAnimationFrame(()=>{
      if (msgEl.scrollHeight <= 280) return;
      const wrap = document.createElement('div');
      wrap.className = 'clamp-wrap';
      wrap.innerHTML = msgEl.innerHTML;
      msgEl.innerHTML = '';
      msgEl.appendChild(wrap);
      const actions = document.createElement('div');
      actions.className = 'clamp-actions';
      const more = document.createElement('button'); more.className='clamp-btn'; more.textContent='Leggi tutto';
      actions.appendChild(more);
      msgEl.appendChild(actions);
      let expanded = false;
      more.onclick = () => {
        expanded = !expanded;
        if (expanded) {
          wrap.style.maxHeight = 'none'; wrap.style.maskImage='none';
          more.textContent = 'Mostra meno';
        } else {
          wrap.style.maxHeight = '260px'; wrap.style.maskImage='';
          more.textContent = 'Leggi tutto';
        }
      };
    });
  }

  function addRow(role, html) {
    const row = document.createElement('div'); row.className = 'sdw-row ' + role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = html;
    row.appendChild(msg); body.appendChild(row);
    if (role === 'ai') clampify(msg);
    body.scrollTop = body.scrollHeight;
    return msg;
  }

  function typingStart(){
    const msg = addRow('ai', toHTML("L'assistente sta scrivendo<span class='dots'></span>"));
    msg.parentElement.classList.add('typing');
  }
  function typingStop(){
    const last = body.querySelector('.typing');
    if (last) last.classList.remove('typing');
  }

  function mount() {
    if (root) return;
    // Bubble
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble'; bubble.type='button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => open({ autostart: true });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title"><span class="ava">🤖</span> <span>Assistente AI</span> <span class="dot"></span></div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div class="chips" id="sdw-chips" style="display:none"></div>
        <div id="sdw-foot">
          <button id="sdw-cta">Richiedi un’analisi gratuita 👇</button>
          <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo il budget, consigli)">
          <button id="sdw-send">Invia</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    body     = root.querySelector('#sdw-body');
    input    = root.querySelector('#sdw-input');
    sendBtn  = root.querySelector('#sdw-send');
    ctaBtn   = root.querySelector('#sdw-cta');
    chipsWrap= root.querySelector('#sdw-chips');

    root.querySelector('#sdw-close').onclick = close;
    ctaBtn.onclick = () => window.open(CTA_URL, '_blank');

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = '';
      ask(v, { showUser:true });
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
  }

  function showPanel(){
    root.classList.add('sdw-visible');
    const bubble = document.getElementById('sdw-bubble'); if (bubble) bubble.style.display='none';
  }
  function hidePanel(){
    root.classList.remove('sdw-visible');
    const bubble = document.getElementById('sdw-bubble'); if (bubble) bubble.style.display='inline-flex';
  }

  // chips helper
  function showChips(list){
    chipsWrap.innerHTML='';
    list.forEach(txt=>{
      const c = document.createElement('button');
      c.className='chip'; c.textContent = txt;
      c.onclick = ()=> ask(txt, { showUser:false });
      chipsWrap.appendChild(c);
    });
    chipsWrap.style.display = list.length ? 'flex' : 'none';
  }

  // ====== Backend call ======
  async function ask(prompt, opts={showUser:true, meta:null}) {
    if (opts.showUser) addRow('me', toHTML(prompt));
    typingStart();

    // prompt “specialista” + policy messaggi
    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**.
Tono: amichevole, energico, proattivo. Parla SEMPRE al **condizionale** (sono simulazioni).
Non inserire link testuali: invita a **cliccare il bottone qui sotto 👇** per prenotare la Consulenza Gratuita.
Ricorda i nostri USP e il **CLOSETING** (unione Marketing & Vendite): team integrato (strategist, media buyer, venditori),
piattaforma all-in-one (funnel, CRM, automazioni), lead generation, presa appuntamenti.
Se la domanda non è pertinente al marketing/servizi Suite Digitale, spiega che sei specializzato e invita a scriverci:
marketing@suitedigitale.it o +39 351 509 4722.
`.trim();

    try {
      const res = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          mode:'analysis',
          prompt,
          context: CONTEXT,
          meta: opts.meta || null
        })
      });
      const j = await res.json().catch(() => ({}));
      typingStop();
      const out = (j && (j.text || j.message)) ? j.text || j.message : 'Non ho ricevuto una risposta.';
      const target = body.querySelector('.typing .sdw-msg') || addRow('ai','');
      if (target.parentElement.classList.contains('typing')) target.parentElement.classList.remove('typing');
      target.innerHTML = toHTML(out);
      clampify(target);
      body.scrollTop = body.scrollHeight;

      // suggerimenti dinamici (semplici predefiniti)
      showChips([
        'Cos’è Suite Digitale',
        'Perché scegliere Suite Digitale',
        'Come prenotare la consulenza'
      ]);
    } catch (e) {
      typingStop();
      addRow('ai', toHTML(
        `Piccolo intoppo di rete. Intanto posso rispondere a dubbi su KPI, budget o ROAS. Se vuoi un’analisi completa, **clicca il bottone qui sotto 👇**.`
      ));
    }
  }

  // ====== API pubbliche per i trigger ======
  function open(opts={}) {
    mount(); showPanel(); beepOpen();
    if (opts.autostart) {
      // messaggio di benvenuto (AI)
      addRow('ai', toHTML(
        `Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**.
         Intanto sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.`
      ));
      showChips(['Cos’è Suite Digitale','Perché scegliere Suite Digitale','Come prenotare la consulenza']);
    }
  }
  function close(){ hidePanel(); }

  // richiamato dai trigger dopo “Calcola”
  function analyseKPIsSilently(kpi, contextNote) {
    mount(); showPanel();
    const k = kpi || {};
    const prompt = `
Analizza questi KPI **simulati** (non sono risultati storici):
ROI: ${k.roi ?? 'nd'} • ROAS: ${k.roas ?? 'nd'} • CPL: ${k.cpl ?? 'nd'} • CPA: ${k.cpa ?? 'nd'}
Budget ADV: ${k.budget ?? 'nd'} • Fatturato: ${k.revenue ?? 'nd'} • Utile/Perdita: ${k.profit ?? 'nd'}.
${contextNote ? 'Contesto: ' + contextNote : ''}

Fornisci una lettura in 4–6 punti, usando il **condizionale** (proiezioni).
- Se ROI/ROAS fossero deboli: rassicura e spiega che in consulenza definiremmo USP forte, posizionamento, pricing e ottimizzazioni per tornare in profitto.
- Se i numeri fossero buoni: tono energico, come scalare con controllo KPI.
- Ricorda il nostro **CLOSETING** (marketing+vendite integrati) come vantaggio competitivo.
- **Non inserire link**: chiudi invitando a cliccare il bottone qui sotto 👇.
`.trim();
    ask(prompt, { showUser:false, meta:{kpi} });
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();

