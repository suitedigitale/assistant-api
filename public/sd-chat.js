/* public/sd-chat.js — bubble + UI + typing + link bianchi cliccabili + “leggi di più” */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-panel:#14172b; --sd-bg:#0a0d17; --sd-accent:#8C52FF; --sd-accent-weak:rgba(140,82,255,.35); --sd-text:#eef1ff; --sd-chip:#1d2347; }
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:var(--sd-panel);color:var(--sd-text);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:var(--sd-text);opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:16px 12px;background:var(--sd-bg);scrollbar-width:thin}
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
  .dots::after{content:"";display:inline-block;width:1em;text-align:left;animation:sdw-dots 1.2s steps(4,end) infinite}
  @keyframes sdw-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}100%{content:""}}
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:var(--sd-text);padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-accent-weak)}
  #sdw-send{background:var(--sd-accent);border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:#2a1a64;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 12px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:var(--sd-accent);color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  /* link SEMPRE bianchi e cliccabili */
  #sdw-panel a, #sdw-panel a:visited { color:#fff !important; text-decoration:underline; pointer-events:auto }
  .sdw-sugg{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .sdw-chip{background:var(--sd-chip);border:1px solid rgba(255,255,255,.1);padding:8px 12px;border-radius:999px;font-size:13px;color:#dbe0ff;cursor:pointer}
  .sdw-chip:hover{filter:brightness(1.06)}
  /* clamp + read more */
  .sdw-content{display:block}
  .sdw-content.sdw-collapsed{max-height:260px;overflow:hidden;position:relative}
  .sdw-content.sdw-collapsed:after{content:"";position:absolute;left:0;right:0;bottom:0;height:60px;background:linear-gradient(180deg, rgba(20,23,43,0) 0%, rgba(20,23,43,1) 100%)}
  .sdw-more{margin-top:6px;background:transparent;border:0;color:#dbe0ff;text-decoration:underline;cursor:pointer}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== helpers ======
  const escapeHTML = (s) => (s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));
  const toHTML = (txt) => {
    let h = escapeHTML(txt||'');
    h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');                                     // **bold**
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a target="_blank" rel="noopener">$1</a>'); // [t](url)
    h = h.replace(/<\/a>\s*\(https?:\/\/[^\s)]+\)/g,'</a>');                                   // dedup
    h = h.replace(/(^|[\s(])(https?:\/\/[^\s)]+)(?=$|[\s)])/g,'$1<a target="_blank" rel="noopener">$2</a>'); // nudi
    const blocks = h.split(/\n\n+/).map(b=>{
      if (/^- /m.test(b)) return '<ul>'+b.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';
      return '<p>'+b.replace(/\n/g,'<br/>')+'</p>';
    });
    return blocks.join('');
  };

  function playOpen() {
    try {
      const a = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA'); a.volume=.15; a.play().catch(()=>{});
    } catch(_) {}
  }

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn, bubble, typingRow, suggBox;

  function mount() {
    if (root) return;

    bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => { open({ autostart:false }); };
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title"><span class="ava">🤖</span> <span>Assistente AI</span> <span class="dot"></span></div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div id="sdw-foot"><button id="sdw-cta">Richiedi un’analisi gratuita 👉</button></div>
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

  function showPanel(){ root.classList.add('sdw-visible'); bubble.style.display='none'; playOpen(); }
  function hidePanel(){ root.classList.remove('sdw-visible'); bubble.style.display='inline-flex'; }

  function addRow(role, html, {raw=false}={}) {
    const row = document.createElement('div'); row.className = 'sdw-row ' + role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg';
    // wrap content -> per clamp
    msg.innerHTML = raw ? `<div class="sdw-content">${html}</div>` : `<div class="sdw-content">${toHTML(html)}</div>`;
    row.appendChild(msg); body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    maybeClamp(msg.querySelector('.sdw-content'));
    return row;
  }

  function setTyping(on) {
    if (on) {
      if (typingRow) return;
      typingRow = addRow('typing', `L'assistente sta scrivendo <span class="dots"></span>`, {raw:true});
    } else {
      if (typingRow) { typingRow.remove(); typingRow = null; }
    }
  }

  function renderSuggestions(items) {
    if (suggBox && suggBox.parentNode) suggBox.parentNode.removeChild(suggBox);
    if (!items || !items.length) return;
    suggBox = document.createElement('div'); suggBox.className='sdw-sugg';
    items.forEach(t=>{
      const b=document.createElement('button'); b.className='sdw-chip'; b.type='button'; b.textContent=t;
      b.onclick=()=>{ if (suggBox) suggBox.remove(); ask(t,{silent:false}); };
      suggBox.appendChild(b);
    });
    body.appendChild(suggBox); body.scrollTop=body.scrollHeight;
  }

  // clamp per testi lunghi
  function maybeClamp(el){
    requestAnimationFrame(()=>{
      if (!el) return;
      if (el.scrollHeight <= 260) return;
      el.classList.add('sdw-collapsed');
      const more = document.createElement('button');
      more.className='sdw-more';
      more.textContent='Leggi di più';
      more.onclick=()=>{
        const c = el.classList.toggle('sdw-collapsed');
        more.textContent = c ? 'Leggi di più' : 'Mostra meno';
      };
      el.parentNode.appendChild(more);
    });
  }

  // ====== Backend call ======
  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', prompt);
    renderSuggestions([]);
    setTyping(true);

    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**.
Parla con tono amichevole, energico e in **condizionale** (sono proiezioni del simulatore).
Ricorda i benefici: team integrato (strategist, media buyer, CRM, venditori), piattaforma all-in-one, funnel e automazioni.
Se ROI/ROAS fossero negativi: rassicura e spiega che in consulenza rivedremmo posizionamento, USP, pricing, margini e conversioni.
Se fossero positivi: entusiasmati e spiega come **scaleremmo** con controllo KPI.
Non dare istruzioni operative fai-da-te: focalizza il valore della consulenza.
Se la domanda è fuori tema, indica contatti: **marketing@suitedigitale.it** – **+39 351 509 4722**.
Chiudi SEMPRE con: **Richiedi un’analisi gratuita 👉** ${CTA_URL}
`.trim();

    try {
      const res = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt, context: CONTEXT, meta: opts.meta || null })
      });
      const j   = await res.json().catch(()=>({}));
      const out = (j && (j.text || j.message)) ? j.text || j.message : JSON.stringify(j);
      setTyping(false);
      addRow('ai', out);
      renderSuggestions(['Cos’è Suite Digitale','Perché scegliere Suite Digitale','Come prenotare la consulenza']);
    } catch(e) {
      setTyping(false);
      addRow('ai',
        `Adesso il server non risponde. Posso comunque darti una panoramica e spiegarti come lavoreremmo insieme.
**Vuoi andare a fondo con il tuo caso?** Richiedi un’analisi gratuita 👉 ${CTA_URL}`
      );
    }
  }

  // ====== API pubbliche per i trigger ======
  function open(opts={}) {
    mount(); showPanel();
    if (opts.autostart) {
      addRow('ai',
        `Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**.  
Intanto sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.`
      );
      renderSuggestions(['Cos’è Suite Digitale','Perché scegliere Suite Digitale','Come prenotare la consulenza']);
    }
  }
  function close(){ hidePanel(); }

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
