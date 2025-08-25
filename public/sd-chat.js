/* public/sd-chat.js — bubble + UI + invii “silenti” + link cliccabili + stile messaggi + typing */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root {
    --sd-bg:#0f1220; --sd-panel:#14172b;
    --sd-accent:#8C52FF; --sd-accent-weak:rgba(140,82,255,.35);
    --sd-text:#eef1ff; --sd-muted:#aeb3c7;
    --sd-chip:#1d2347;
  }
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:var(--sd-panel);color:var(--sd-text);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:var(--sd-text);opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:16px 12px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:82%;padding:12px 14px;border-radius:14px;line-height:1.45}
  .sdw-msg p{margin:.35rem 0}
  .sdw-msg ul{margin:.35rem 0 .8rem 1.1rem}
  .sdw-msg h4{margin:.2rem 0 .4rem 0;font-size:15px;font-weight:800}
  .ai{justify-content:flex-start}
  .ai .sdw-msg{background:#162047;border:1px solid rgba(255,255,255,.06)}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#211a45;border:1px solid rgba(255,255,255,.1)}
  .typing{justify-content:flex-start}
  .typing .sdw-msg{background:#11152b;border:1px dashed rgba(255,255,255,.15)}
  .dots::after{content:""; display:inline-block; width:1em; text-align:left; animation:sdw-dots 1.2s steps(4,end) infinite}
  @keyframes sdw-dots { 0%{content:""} 25%{content:"."} 50%{content:".."} 75%{content:"..."} 100%{content:""} }
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:var(--sd-text);padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-accent-weak)}
  #sdw-send{background:var(--sd-accent);border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:#2a1a64;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 12px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.05)}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:var(--sd-accent);color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  a.sdw-link{color:#fff;text-decoration:underline}
  .sdw-sugg{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .sdw-chip{background:var(--sd-chip);border:1px solid rgba(255,255,255,.1);padding:8px 12px;border-radius:999px;font-size:13px;color:#dbe0ff;cursor:pointer}
  .sdw-chip:hover{filter:brightness(1.06)}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== tiny helpers ======
  const escapeHTML = (s) => (s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));
  const toHTML = (txt) => {
    // 1) normalizza (evita HTML “grezzo” che il modello a volte genera)
    let h = escapeHTML(txt||'');

    // 2) markdown bold **x**
    h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');

    // 3) markdown links [testo](url)
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a class="sdw-link" target="_blank" rel="noopener">$1</a>');

    // 4) rimuovi eventuale url nudo subito dopo il link markdown (duplicati)
    h = h.replace(/<\/a>\s*\(https?:\/\/[^\s)]+\)/g,'</a>');

    // 5) url nudi -> a
    h = h.replace(/(^|[\s(])(https?:\/\/[^\s)]+)(?=$|[\s)])/g,'$1<a class="sdw-link" target="_blank" rel="noopener">$2</a>');

    // 6) linee "- " -> <ul><li>..</li></ul> (solo se ci sono bullet)
    if (/^- /m.test(h)) {
      // suddividi su blocchi per non “wrappare” testo non-bullet
      h = h.split(/\n\n+/).map(block=>{
        if (/^- /m.test(block)) {
          return '<ul>'+block.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';
        }
        return '<p>'+block+'</p>';
      }).join('');
    } else {
      // paragrafi semplici
      h = h.split(/\n\n+/).map(b=>'<p>'+b.replace(/\n/g,'<br/>')+'</p>').join('');
    }
    return h;
  };

  // suono all’apertura (no typing)
  function playOpen() {
    try {
      const a = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA...'); // (beep corto base64 – opzionale)
      a.volume = 0.15; a.play().catch(()=>{});
    } catch(_) {}
  }

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn, bubble, typingRow, suggBox;

  function mount() {
    if (root) return;

    // Bubble pronto
    bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => { open({ autostart:false }); };
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
        <div id="sdw-foot">
          <button id="sdw-cta">Richiedi un’analisi gratuita 👉</button>
        </div>
        <div id="sdw-foot">
          <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo il budget, consigli)">
          <button id="sdw-send">Invia</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    body    = root.querySelector('#sdw-body');
    input   = root.querySelector('#sdw-input');
    sendBtn = root.querySelector('#sdw-send');
    ctaBtn  = root.querySelector('#sdw-cta');

    root.querySelector('#sdw-close').onclick = () => close();
    ctaBtn.onclick = () => { window.open(CTA_URL,'_blank'); };

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = '';
      ask(v, {silent:false});
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
  }

  function showPanel(){
    root.classList.add('sdw-visible');
    bubble.style.display = 'none';
    playOpen();
  }
  function hidePanel(){
    root.classList.remove('sdw-visible');
    bubble.style.display = 'inline-flex';
  }

  function addRow(role, html) {
    const row = document.createElement('div'); row.className = 'sdw-row ' + role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = html;
    row.appendChild(msg); body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }
  function setTyping(on) {
    if (on) {
      if (typingRow) return;
      typingRow = addRow('typing', toHTML("L'assistente sta scrivendo<span class='dots'></span>"));
    } else {
      if (typingRow) { typingRow.remove(); typingRow = null; }
    }
  }
  function renderSuggestions(items) {
    // rimuovi precedenti
    if (suggBox && suggBox.parentNode) suggBox.parentNode.removeChild(suggBox);
    if (!items || !items.length) return;

    suggBox = document.createElement('div');
    suggBox.className = 'sdw-sugg';
    items.forEach(t=>{
      const b = document.createElement('button');
      b.className = 'sdw-chip';
      b.type = 'button';
      b.textContent = t;
      b.onclick = ()=> { if (suggBox) suggBox.remove(); ask(t, {silent:false}); };
      suggBox.appendChild(b);
    });
    body.appendChild(suggBox);
    body.scrollTop = body.scrollHeight;
  }

  // ====== Backend call (silente possibile) ======
  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(prompt));
    renderSuggestions([]); // svuota
    setTyping(true);

    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**.
Parla con tono amichevole, energico e in **condizionale** (sono proiezioni del simulatore).
Ricorda i benefici: team integrato (strategist, media buyer, CRM, venditori), piattaforma all-in-one, funnel e automazioni.
Se ROI/ROAS fossero negativi: rassicura e spiega che in consulenza rivedremmo posizionamento, USP, pricing, margini e conversioni.
Se fossero positivi: entusiasmati e spiega come **scaleremmo** con controllo KPI.
Non dare istruzioni operative da “fare da soli”: focalizza il valore della consulenza.
Se la domanda è fuori tema, spiega che sei specializzato e indica contatti: **marketing@suitedigitale.it** – **+39 351 509 4722**.
Chiudi SEMPRE con una call to action: **Richiedi un’analisi gratuita 👉** ${CTA_URL}
`.trim();

    try {
      const res = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          mode:'analysis',
          prompt: prompt,
          context: CONTEXT,
          meta: opts.meta || null
        })
      });
      const j = await res.json().catch(() => ({}));
      const out = (j && (j.text || j.message)) ? j.text || j.message : JSON.stringify(j);
      setTyping(false);
      addRow('ai', toHTML(out));

      // suggerimenti contestuali (semplici)
      renderSuggestions([
        'Cos’è Suite Digitale',
        'Perché scegliere Suite Digitale',
        'Come prenotare la consulenza'
      ]);

    } catch (e) {
      setTyping(false);
      addRow('ai', toHTML(
        `In questo momento il server non risponde. Posso comunque aiutarti con una panoramica sui KPI e su come lavoreremmo insieme.
**Vuoi andare a fondo con il tuo caso?** Richiedi un’analisi gratuita 👉 ${CTA_URL}`
      ));
    }
  }

  // ====== API pubbliche per i trigger ======
  function open(opts={}) {
    mount(); showPanel();
    if (opts.autostart) {
      const msg = `Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**. 
Intanto sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.`;
      addRow('ai', toHTML(msg));
      renderSuggestions([
        'Cos’è Suite Digitale',
        'Perché scegliere Suite Digitale',
        'Come prenotare la consulenza'
      ]);
    }
  }
  function close(){ hidePanel(); }

  // invocato dai trigger dopo “Calcola”
  function analyseKPIsSilently(kpi, note) {
    mount(); showPanel();
    const k = kpi || {};
    const prompt = `
Analizza questi **KPI simulati** (proiezione, non risultati reali):
ROI: ${k.roi ?? 'nd'} | ROAS: ${k.roas ?? 'nd'} | CPL: ${k.cpl ?? 'nd'} | CPA: ${k.cpa ?? 'nd'} | Budget: ${k.budget ?? 'nd'} | Fatturato: ${k.revenue ?? 'nd'} | Utile/Perdita: ${k.profit ?? 'nd'}.
${note ? 'Contesto settore: ' + note : ''}

Dammi una valutazione chiara in 4–6 punti **in condizionale**, spiegando come Suite Digitale aiuterebbe (posizionamento, USP, pricing, margini, conversioni).
Chiudi con **Richiedi un’analisi gratuita 👉** ${CTA_URL}
`.trim();
    ask(prompt, {silent:true, meta:{kpi}});
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  // bubble sempre pronto
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
