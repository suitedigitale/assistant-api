/* public/sd-chat.js — UI completa (bubble, welcome, chips, typing, clamp, CTA) */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
(function injectCSS(){
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-bg:#0f1220; --sd-panel:#15172a; --sd-accent:#7b5cff; --sd-ring:rgba(123,92,255,.35); }

  /* posizionamento con safe-area */
  #sdw-root{
    position:fixed;
    right: max(14px, env(safe-area-inset-right));
    bottom: max(14px, env(safe-area-inset-bottom));
    z-index:999999;
    font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;
    width:360px;                 /* più stretto */
    max-width: min(92vw, 380px); /* non oltre schermo */
    display:none;
  }
  #sdw-root.sdw-visible{display:block}

  /* pannello flessibile: non supera l’altezza dello schermo */
  #sdw-panel{
    background:#0c0f1a;color:#eef1ff;
    border:1px solid rgba(255,255,255,.08);
    border-radius:16px; overflow:hidden;
    box-shadow:0 22px 60px rgba(0,0,0,.45);
    display:flex; flex-direction:column;
    max-height: calc(86dvh - 8px);   /* limite dinamico */
  }

  #sdw-head{
    display:flex; align-items:center; gap:8px; justify-content:space-between;
    padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.06); background:#0f1220;
    flex:0 0 auto;
  }
  #sdw-title{display:flex; align-items:center; gap:10px; font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}

  /* SOLO il body scorre; altezza auto gestita dal pannello */
  #sdw-body{
    flex:1 1 auto;
    overflow:auto;
    padding:14px 12px;
    background:#0a0d17;
    scrollbar-width:thin;
  }

  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:86%;padding:12px 14px;border-radius:14px;line-height:1.45;position:relative}
  .sdw-msg h4{margin:.2rem 0 .45rem 0;font-size:15px;font-weight:800}
  .ai{justify-content:flex-start}
  .ai .sdw-msg{background:#151a33;border:1px solid rgba(255,255,255,.06)}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#1b2250;border:1px solid #9255FF}

  .chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 12px 0 12px;flex:0 0 auto}
  .chip{background:#101432;border:1px solid rgba(255,255,255,.08);padding:10px 12px;border-radius:999px;cursor:pointer;font-size:14px;color:#e5e9ff}
  .chip:hover{background:#141a3c}

  #sdw-foot{
    display:flex; gap:8px; padding:10px 12px;
    border-top:1px solid rgba(255,255,255,.06); background:#0f1220;
    flex:0 0 auto;
  }
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}

  #sdw-cta{
    position:sticky; bottom:0; margin:8px 12px;
    background:linear-gradient(90deg,#FD3F3F 0%,#8930BB 100%);
    color:#fff; border:0; border-radius:12px; padding:12px 14px;
    text-align:center; font-weight:800; cursor:pointer
  }
  #sdw-cta:hover{filter:brightness(1.02)}

  #sdw-bubble{
    position:fixed; right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom));
    background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999
  }

  /* Link bianchi */
  .sdw-msg a, a.sdw-link { color:#ffffff !important; text-decoration:underline; }
  .sdw-msg a:hover { opacity:.9; }

  /* typing */
  .typing{display:inline-flex;align-items:center;gap:6px}
  .dots span{display:inline-block;width:6px;height:6px;border-radius:999px;background:#cbd5ff;margin-left:3px;animation:blink 1.3s infinite}
  .dots span:nth-child(2){animation-delay:.15s}
  .dots span:nth-child(3){animation-delay:.3s}
  @keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}

  /* clamp */
  .clamp-wrap{position:relative}
  .clamp-inner{display:block;overflow:hidden}
  .fade-bottom{position:absolute;left:0;right:0;bottom:0;height:48px;background:linear-gradient(180deg,rgba(21,26,51,0) 0%, rgba(21,26,51,1) 70%)}
  .clamp-actions{margin-top:6px}
  .clamp-actions a{font-size:13px;cursor:pointer;text-decoration:underline;color:#cfe1ff}

  /* ulteriori strette per schermi piccoli in altezza */
  @media (max-height: 740px){
    #sdw-panel{max-height: calc(82dvh - 8px);}
  }
  @media (max-width: 420px){
    #sdw-root{width: 92vw;}
  }
  `;
  const st=document.createElement('style'); st.id='sdw-style'; st.textContent=css; document.head.appendChild(st);
})();


  // ====== tiny helpers ======
  const toHTML = (txt) => {
    if (txt == null) return '';
    let h = String(txt);
    // **bold**
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // "**Titolo:**" -> <h4>
    h = h.replace(/\*\*(.+?)\*\:\s*/g, '<h4>$1</h4>');
    // [testo](url)
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // URL nudi
    h = h.replace(/(^|[\s(])((https?:\/\/[^\s<>()\]\}]+))(?![^<]*>)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    // bullet
    if (/^- /m.test(h)) h = '<ul>'+h.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';
    return h.replace(/\n/g,'<br/>');
  };

  function clampMessage(div, maxPx){
    const already = div.querySelector('.clamp-wrap');
    if (already) return;
    if (div.scrollHeight <= maxPx + 8) return; // non serve

    const content = document.createElement('div');
    content.className = 'clamp-inner';
    content.style.maxHeight = maxPx+'px';
    content.innerHTML = div.innerHTML;

    const wrap = document.createElement('div');
    wrap.className = 'clamp-wrap';
    wrap.appendChild(content);

    const fade = document.createElement('div'); fade.className = 'fade-bottom';
    wrap.appendChild(fade);

    const actions = document.createElement('div'); actions.className = 'clamp-actions';
    const more = document.createElement('a'); more.textContent = 'Leggi tutto';
    const less = document.createElement('a'); less.textContent = 'Mostra meno'; less.style.display='none';
    actions.appendChild(more); actions.appendChild(document.createTextNode(' ')); actions.appendChild(less);

    div.innerHTML = '';
    div.appendChild(wrap);
    div.appendChild(actions);

    more.onclick = () => {
      content.style.maxHeight = 'none';
      fade.style.display='none';
      more.style.display='none';
      less.style.display='inline';
    };
    less.onclick = () => {
      content.style.maxHeight = maxPx+'px';
      fade.style.display='';
      more.style.display='inline';
      less.style.display='none';
      // dopo il “meno” riportiamo lo scroll all’inizio del messaggio
      div.closest('#sdw-body').scrollTop = div.offsetTop - 16;
    };
  }

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn, chipsBox;

  function mount() {
    if (root) return;

    // Bubble
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => open({ autostart: true });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title"><span class="ava">🤖</span><span>Assistente AI</span><span class="dot"></span></div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div class="chips" id="sdw-chips"></div>
        <div id="sdw-foot"><button id="sdw-cta">Richiedi un’analisi gratuita 👉</button></div>
        <div id="sdw-foot">
          <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo budget e KPI)">
          <button id="sdw-send">Invia</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    body     = root.querySelector('#sdw-body');
    chipsBox = root.querySelector('#sdw-chips');
    input    = root.querySelector('#sdw-input');
    sendBtn  = root.querySelector('#sdw-send');
    ctaBtn   = root.querySelector('#sdw-cta');

    root.querySelector('#sdw-close').onclick = () => close();
    ctaBtn.onclick = () => window.open(CTA_URL, '_blank');

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = '';
      ask(v, { silent:false });
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); fire(); } });
  }
  function showPanel(){ root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'inline-flex'; }

  function addRow(role, html, {clamp=false}={}){
    const row = document.createElement('div'); row.className='sdw-row '+role;
    const msg = document.createElement('div'); msg.className='sdw-msg'; msg.innerHTML = html;
    row.appendChild(msg); body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    if (clamp) clampMessage(msg, 150); // ~8-10 righe
    return msg;
  }

  function renderChips(){
    chipsBox.innerHTML='';
    const items = [
      'Cos’è il MarkSelling™?',
      'Perché scegliere Suite Digitale?',
      'Cosa succede nella consulenza gratuita?',
      'Come funziona la presa appuntamenti?'
    ];
    items.forEach(label=>{
      const b = document.createElement('button'); b.className='chip'; b.textContent=label;
      b.onclick = ()=> ask(label, {silent:false});
      chipsBox.appendChild(b);
    });
  }

  // ====== Backend call ======
  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(prompt));
    const typing = addRow('ai',
      `<span class="typing">L'assistente sta scrivendo <span class="dots"><span></span><span></span><span></span></span></span>`
    );

    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**. Tono: cordiale, energico, motivante, tecnico ma informale.
USP: **MarkSelling™**, il metodo che unisce marketing & vendite in un **unico team operativo** (strategist, media buyer, venditori), con piattaforma all-in-one (funnel, CRM, automazioni, lead gen, **presa appuntamenti**).
I KPI del simulatore sono **realistici**: derivano da **migliaia di dati** e da **220+ progetti reali** gestiti (benchmark per settore e modelli B2B/B2C).

Se la domanda è off-topic rispetto a marketing/servizi Suite Digitale, spiega che sei specializzato e invita a scriverci: **marketing@suitedigitale.it** o **+39 351 509 4722**.

Format numerico:
- **ROI** con **%** e virgola italiana (es. -92,59%),
- **ROAS** con suffisso **x** (es. 0,4x).

Chiudi le risposte con invito alla consulenza:
“**Vuoi andare a fondo con il tuo caso?** Clicca sul bottone qui sotto 👇”.
`.trim();

    try{
      const res = await fetch(ENDPOINT,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt, context: CONTEXT, meta: opts.meta||null })
      });
      const j = await res.json().catch(()=>({}));
      const out = (j && (j.text||j.message)) ? (j.text||j.message) : 'Posso aiutarti su KPI, budget, ROAS e strategia.';
      typing.innerHTML = toHTML(out);
      clampMessage(typing, 150); // applica clamp alla risposta AI
    }catch(e){
      typing.innerHTML = toHTML(
        `In questo momento non riesco a contattare il server. Intanto posso darti indicazioni generali e prepararti alla **Consulenza Gratuita**.`
      );
      clampMessage(typing, 150);
    }
  }

  // ====== API pubbliche per i trigger ======
  function open(opts={}){
    mount(); showPanel();
    renderChips();
    if (opts.autostart){
      addRow('ai', toHTML(
        `Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**. 
Sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.`), {clamp:false});
    }
  }
  function close(){ hidePanel(); }

  function analyseKPIsSilently(kpi, contextNote){
    mount(); showPanel(); renderChips();
    const k = kpi || {};
    const prompt = `
Analizza questi KPI **simulati** (proiezioni, non risultati attuali):
ROI: ${k.roi ?? 'nd'} | ROAS: ${k.roas ?? 'nd'} | CPL: ${k.cpl ?? 'nd'} | CPA: ${k.cpa ?? 'nd'} | Budget: ${k.budget ?? 'nd'} | Fatturato: ${k.revenue ?? 'nd'} | Utile/Perdita: ${k.profit ?? 'nd'}.
${contextNote ? 'Contesto: ' + contextNote : ''}

Rispondi **al condizionale**:
- lettura rapida e concreta dei numeri,
- perché il **MarkSelling™** (team integrato marketing+vendite) sarebbe determinante,
- se ROI/ROAS fossero deboli: invito forte alla consulenza gratuita,
- se i numeri fossero buoni: come si potrebbe scalare con controllo KPI.
Chiudi con: “**Vuoi andare a fondo con il tuo caso?** Clicca sul bottone qui sotto 👇”.
`.trim();
    ask(prompt, {silent:true, meta:{kpi}});
  }

  // expose
  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  // mount bubble subito
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
