/* public/sd-chat.js — bubble + UI + invii “silenti” + link cliccabili + welcome + suggerimenti */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL = 'https://www.suitedigitale.it/candidatura/';

  // ====== STATE ======
  let root, body, input, sendBtn, ctaBtn, suggWrap, bubbleBtn;
  let hasWelcomed = false;
  let inKpiAnalysis = false;

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-bg:#0f1220; --sd-panel:#15172a; --sd-bubble:#7b5cff; --sd-muted:#aeb3c7; --sd-accent:#7b5cff; --sd-ring:rgba(123,92,255,.35); }
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0c0f1a;color:#eef1ff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:16px 12px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:82%;padding:12px 14px;border-radius:14px;line-height:1.45}
  .sdw-msg p{margin:.3rem 0}
  .sdw-msg ul{margin:.3rem 0 .8rem 1.1rem}
  .sdw-msg h4{margin:.2rem 0 .4rem 0;font-size:15px;font-weight:800}
  .ai{justify-content:flex-start}
  .ai .sdw-msg{background:#151a33;border:1px solid rgba(255,255,255,.06)}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#1b2250;border:1px solid rgba(255,255,255,.1)}
  /* link sempre visibili (bianchi) */
  #sdw-panel a.sdw-link, .sdw-msg a{color:#fff !important; text-decoration:underline}
  .sdw-msg a:hover{opacity:.9}
  .sdw-msg a:visited{color:#eaeaff !important}
  /* typing */
  .typing{opacity:.9}
  .dots{display:inline-block; min-width:1ch}
  .dots:after{content:""; display:inline-block; width:1.5ch; text-align:left; animation:sd-dots 1.2s infinite}
  @keyframes sd-dots{0%{content:"."}33%{content:".."}66%{content:"..."}100%{content:"."}}
  /* chips suggerimenti */
  #sdw-sugg{display:flex;flex-wrap:wrap;gap:8px;margin:8px 4px 0 4px}
  .sdw-chip{font-size:12px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.18); background:#0f1220; color:#cfd3e9; cursor:pointer}
  /* foot */
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:#7b5cff;color:#fff;border:0;border-radius:12px;padding:10px 12px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.02)}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== tiny helpers ======
  function toHTML(txt) {
    if (txt == null) return '';
    let h = String(txt);

    // **bold**
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Titoli stile "**Titolo:**" -> <h4>Titolo</h4>
    h = h.replace(/\*\*(.+?)\*\:\s*/g, '<h4>$1</h4>');

    // Link markdown [testo](https://url) -> <a href="...">testo</a>
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" class="sdw-link" target="_blank" rel="noopener">$1</a>');
    // URL “nudi” -> <a href="...">...</a> (evita parentesi/punteggiatura finali)
    h = h.replace(/(^|[\s(])((https?:\/\/[^\s<>()\]\}]+))(?![^<]*>)/g, '$1<a href="$2" class="sdw-link" target="_blank" rel="noopener">$2</a>');

    // Bullet "- " → lista (solo se presenti)
    let replaced = false;
    h = h.replace(/^- (.+)$/gm, () => { replaced = true; return '<li>$1</li>'; });
    if (replaced) h = '<ul>' + h + '</ul>';

    // A capo
    return h.replace(/\n/g,'<br/>');
  }

  function addRow(role, html) {
    const row = document.createElement('div'); row.className = 'sdw-row ' + role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = html;
    row.appendChild(msg); body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  function setTyping() {
    addRow('ai', `L'assistente sta scrivendo<span class="dots"></span>`);
    body.lastChild.classList.add('typing');
  }
  function replaceTypingWith(html) {
    const last = body.lastChild;
    if (last && last.classList.contains('typing')) {
      last.querySelector('.sdw-msg').innerHTML = html;
      last.classList.remove('typing');
      return true;
    }
    addRow('ai', html);
    return false;
  }

  // ====== SUGGERIMENTI ======
  const SUGGESTIONS = [
    { label: "Cos'è Suite Digitale", prompt: "Spiegami cos'è Suite Digitale in 5 punti chiari e concreti." },
    { label: "Perché scegliere Suite Digitale", prompt: "Perché dovrei scegliere Suite Digitale? Dammi i benefici rispetto a un'agenzia tradizionale." },
    { label: "Come prenotare la consulenza", prompt: "Come funziona la consulenza gratuita e cosa analizzeremo nella prima chiamata?" }
  ];
  function renderSuggestions() {
    if (!suggWrap) return;
    suggWrap.innerHTML = '';
    SUGGESTIONS.forEach(s => {
      const b = document.createElement('button');
      b.className = 'sdw-chip'; b.type = 'button'; b.textContent = s.label;
      b.onclick = () => ask(s.prompt, { silent:false });
      suggWrap.appendChild(b);
    });
  }

  // ====== UI ======
  function mount() {
    if (root) return;
    // Bubble
    bubbleBtn = document.createElement('button');
    bubbleBtn.id = 'sdw-bubble';
    bubbleBtn.type = 'button';
    bubbleBtn.textContent = '🤖 Assistente AI';
    bubbleBtn.onclick = () => open({ autostart: true });
    document.body.appendChild(bubbleBtn);
    bubbleBtn.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title"><span class="ava">🤖</span> <span>Assistente AI</span> <span class="dot"></span></div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>

        <div id="sdw-sugg"></div>

        <div id="sdw-foot">
          <button id="sdw-cta">Richiedi un’analisi gratuita 👉</button>
        </div>
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
    suggWrap = root.querySelector('#sdw-sugg');

    root.querySelector('#sdw-close').onclick = () => close();
    ctaBtn.onclick = () => { window.open(CTA_URL, '_blank'); };

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = '';
      ask(v, {silent:false});
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
  }

  function showPanel(){ root.classList.add('sdw-visible'); bubbleBtn.style.display = 'none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); bubbleBtn.style.display = 'inline-flex'; }

  function welcomeIfNeeded() {
    if (hasWelcomed || inKpiAnalysis) return;
    if (!body || body.childElementCount > 0) return;
    addRow('ai', toHTML(
      `Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**. 
Intanto sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.`
    ));
    renderSuggestions();
    hasWelcomed = true;
  }

  // ====== Backend call (silente possibile) ======
  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(prompt));
    setTyping();

    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**. Tono: amichevole, professionale, motivante.
Obiettivo: far capire KPI **simulati** e guidare alla **Consulenza Gratuita** (bottone sotto). 
Ricorda i benefici: team integrato Marketing & Vendite (strategist, media buyer, venditori telefonici/chatter), 
piattaforma all-in-one (funnel, CRM, automazioni), lead gen + presa appuntamenti coordinati.
Se la domanda non è pertinente, spiega che sei specializzato e invita a scriverci: marketing@suitedigitale.it o +39 351 509 4722.
Usa **grassetto**, elenchi chiari, e parla al **condizionale** quando parli di proiezioni.
Non inserire link “clicca qui”: ricorda che l’utente ha il bottone **Richiedi un’analisi gratuita 👉** qui sotto.
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
      replaceTypingWith(toHTML(out));
    } catch (e) {
      replaceTypingWith(toHTML(
        `Al momento non riesco a contattare il server.  
Nel frattempo posso darti un’indicazione generale e prepararti alla **Consulenza Gratuita**.`
      ));
    }
    renderSuggestions();
  }

  // ====== API pubbliche per i trigger ======
  function open(opts={}) {
    mount(); showPanel();
    // Se apro il bubble prima del calcolo → messaggio di benvenuto
    if (opts.autostart) welcomeIfNeeded();
  }
  function close(){ hidePanel(); }

  // richiamato dai trigger dopo il click su “Calcola”
  function analyseKPIsSilently(kpi, contextNote) {
    mount(); showPanel();
    inKpiAnalysis = true;
    const k = kpi || {};
    const prompt = `
Analizza questi KPI **simulati** (non risultati reali): 
ROI: ${k.roi ?? 'nd'} | ROAS: ${k.roas ?? 'nd'} | ${k.cpl>0?`CPL: ${k.cpl} | `:''}${k.cpa>0?`CPA: ${k.cpa} | `:''}Budget: ${k.budget ?? 'nd'} | Fatturato: ${k.revenue ?? 'nd'} | Utile/Perdita: ${k.profit ?? 'nd'}.
${contextNote ? 'Contesto: ' + contextNote : ''}

Dammi una valutazione in 4–6 punti al **condizionale**, chiara e concreta. 
- Se ROI/ROAS risultassero deboli: rassicura e spiega che in **consulenza gratuita** analizzeremmo posizionamento, USP, pricing, margini e conversioni per portare il sistema a profitto.
- Se i numeri risultassero buoni: spiega come si potrebbe **scalare** in modo controllato (budget, nurturing, up/cross-sell, controllo KPI) con il nostro team integrato.
Chiudi ricordando che sotto c’è il bottone **Richiedi un’analisi gratuita 👉**.
`.trim();
    ask(prompt, {silent:true, meta:{kpi}});
    // al termine della prima risposta KPI, torna a non bloccare il welcome per future sessioni
    setTimeout(()=>{ inKpiAnalysis = false; }, 2000);
  }

  // bubble sempre pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { mount(); });
  } else { mount(); }

  // Espongo API
  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  console.log('[SD] sd-chat.js pronto');
})();
