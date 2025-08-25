/* public/sd-chat.js — bubble + UI + typing + chips + clamp + stile */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';
  const BRAND    = '#8C52FF';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-bg:#0b0f1a; --sd-panel:#11152b; --sd-chip:#121732; --sd-accent:${BRAND}; --sd-ring:rgba(140,82,255,.35); }
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:420px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0b0f1a;color:#eef1ff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:14px 10px;background:#0b0f1a;scrollbar-width:thin}
  .sdw-row{display:flex;flex-wrap:wrap;align-items:flex-start;margin:10px 0}
  .sdw-msg{flex:1 1 auto;max-width:100%;padding:12px 14px;border-radius:14px;line-height:1.48;background:#121732;border:1px solid rgba(255,255,255,.06);overflow-wrap:anywhere;white-space:normal}
  .sdw-msg p{margin:.35rem 0}
  .sdw-msg ul{margin:.35rem 0 .8rem 1.1rem}
  .sdw-msg h4{margin:.2rem 0 .35rem 0;font-size:15px;font-weight:800}
  .ai{justify-content:flex-start}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#1b2250;border:1px solid rgba(255,255,255,.1)}
  .typing .sdw-msg{opacity:.9}
  .sdw-dots{display:inline-block;width:1.2em;text-align:left}
  .sdw-dots::after{content:'…';animation:sd-dots 1.2s steps(3,end) infinite}
  @keyframes sd-dots { 0% {content:'';} 33% {content:'.';} 66% {content:'..';} 100% {content:'...';} }

  /* chips sotto il messaggio */
  .sdw-chips{flex:0 0 100%;width:100%;display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0 0}
  .sdw-chip{display:inline-flex;align-items:center;background:var(--sd-chip);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 10px;font-size:12px;color:#fff;cursor:pointer}
  .sdw-chip:hover{border-color:#fff}

  /* clamp con leggi di più */
  .sdw-msg.clamped{position:relative;max-height:220px;overflow:hidden}
  .sdw-msg.clamped::after{content:'';position:absolute;left:0;right:0;bottom:0;height:54px;background:linear-gradient(180deg,rgba(18,23,50,0) 0%, rgba(18,23,50,.96) 70%)}
  .sdw-expand{margin-top:6px;background:transparent;border:0;color:#cfe0ff;text-decoration:underline;cursor:pointer;font-size:12px}

  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:var(--sd-accent);border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}

  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:var(--sd-accent);color:#fff;border:0;border-radius:12px;padding:12px 14px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.05)}

  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:var(--sd-accent);color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}

  /* link chiari (bianco) */
  a.sdw-link{color:#fff;text-decoration:underline}
  a.sdw-link:hover{filter:brightness(1.15)}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== tiny helpers ======
  const toHTML = (txt='') => {
    let h = txt
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')           // **bold**
      .replace(/\*\*(.+?)\*:\s*/g, '<h4>$1</h4>');                 // **Titolo:**
    // bullets "- "
    if (/^- /m.test(h)) h = '<ul>'+h.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';
    // link -> <a> (se dovessero comparire comunque)
    h = h.replace(/(https?:\/\/[^\s)]+)/g, '<a class="sdw-link" target="_blank" rel="noopener">$1</a>');
    return h.replace(/\n/g,'<br/>');
  };

  // clamp “leggi di più”
  function clampMessage(msgEl){
    // già corto?
    if (msgEl.scrollHeight <= 220) return;
    msgEl.classList.add('clamped');
    const btn = document.createElement('button');
    btn.className='sdw-expand'; btn.textContent='Leggi di più';
    btn.onclick = ()=> {
      if (msgEl.classList.contains('clamped')) {
        msgEl.classList.remove('clamped'); btn.textContent='Mostra meno';
      } else {
        msgEl.classList.add('clamped'); btn.textContent='Leggi di più';
      }
    };
    msgEl.parentElement.appendChild(btn);
  }

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn;
  const ding = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA...'); // beep corto

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
    ctaBtn.onclick = () => window.open(CTA_URL, '_blank');

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = '';
      ask(v, {silent:false});
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
  }
  function showPanel(){ root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'none'; try{ding.currentTime=0; ding.play().catch(()=>{});}catch(_){}} 
  function hidePanel(){ root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'inline-flex'; }

  function addRow(role, html) {
    const row = document.createElement('div'); row.className = 'sdw-row ' + role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = html;
    row.appendChild(msg); body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return {row, msg};
  }

  function addTyping() {
    return addRow('ai typing', `L'assistente sta scrivendo<span class="sdw-dots"></span>`);
  }

  function addChips(rowEl, items){
    if (!items || !items.length) return;
    const old = rowEl.querySelector('.sdw-chips'); if (old) old.remove();
    const wrap = document.createElement('div'); wrap.className='sdw-chips';
    items.forEach(({label, prompt})=>{
      const b = document.createElement('button');
      b.className='sdw-chip'; b.type='button'; b.textContent=label;
      b.onclick = ()=> ask(prompt,{silent:false});
      wrap.appendChild(b);
    });
    rowEl.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  // ====== Backend call ======
  const FAQ = `
- **Devo assumere io venditori o marketing?** No: ti diamo un team di strategist, media buyer, CRM specialist e venditori già formato, che lavora come **reparto esteso** della tua azienda.
- **Chi forma i venditori?** Noi. Li allineiamo al marketing e costruiamo script su misura, coerenti con i messaggi di campagna.
- **Garantite risultati?** Non promettiamo numeri fissi: usiamo la formula **soddisfatto o rimborsato**. Se in un mese non raggiungiamo appuntamenti/vendite previsti, il mese successivo **il servizio è gratuito**, finché non sei profittevole.
- **Dati del configuratore:** derivano da **220+ progetti reali**. Ogni settore ha benchmark (CPL, tassi, ecc.) che il sistema adatta a funnel, appuntamenti e scontrino impostati.
- **Costo/risultati:** il prezzo è su misura in base a funnel, lead e appuntamenti gestiti. Budget ADV tipico da 20–30€/die, oltre al canone; più investi (con metodo), più crescono i risultati.
`.trim();

  function baseContext(){
    return `
Sei l’Assistente AI di **Suite Digitale**. Tono: amichevole, energico, professionale.
Non inserire link: invita sempre a **cliccare il bottone in basso “Richiedi un’analisi gratuita 👉”**.
Ricorda i nostri vantaggi: team integrato Marketing+Vendite (strategist, media buyer, CRM, venditori), piattaforma all-in-one, funnel e processi coordinati.
Se la domanda non è nel perimetro marketing/servizio, rispondi brevemente e reindirizza alla consulenza.

FAQ sintetiche utili:
${FAQ}
`.trim();
  }

  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(prompt));
    const typing = addTyping();

    const CONTEXT = baseContext();

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

      // pulizia: se il modello mette link, togliamo e invitiamo alla CTA
      let text = out.replace(/https?:\/\/\S+/g,'').trim();
      const {row} = typing;
      row.classList.remove('typing');
      row.querySelector('.sdw-msg').innerHTML = toHTML(text);
      clampMessage(row.querySelector('.sdw-msg'));

      // chips contestuali
      addChips(row, [
        {label:'Cos’è Suite Digitale', prompt:'Spiegami in breve cos’è Suite Digitale e come lavora il team marketing+vendite, senza link.'},
        {label:'Perché scegliere Suite Digitale', prompt:'Elenca 4 motivi per cui Suite Digitale è diversa da un’agenzia (senza link).'},
        {label:'Come prenotare la consulenza', prompt:'Dimmi come funziona la consulenza gratuita e cosa analizzerete, senza link.'},
      ]);
    } catch (e) {
      const {row} = typing;
      row.classList.remove('typing');
      row.querySelector('.sdw-msg').innerHTML = toHTML(
        `Al momento non riesco a contattare il server. Posso comunque darti indicazioni generali e poi **clicchi il bottone sotto** per parlarne con uno strategist.`
      );
      clampMessage(row.querySelector('.sdw-msg'));
    }
    body.scrollTop = body.scrollHeight;
  }

  // ====== API pubbliche per i trigger ======
  function open(opts={}) {
    mount(); showPanel();
    if (opts.autostart) {
      const {row} = addRow('ai', toHTML(
        `Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**. Intanto sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.`
      ));
      clampMessage(row.querySelector('.sdw-msg'));
      addChips(row, [
        {label:'Cos’è Suite Digitale', prompt:'Cos’è Suite Digitale? Spiegalo in 6-8 righe, senza link.'},
        {label:'Perché scegliere Suite Digitale', prompt:'Perché scegliere Suite Digitale invece di un’agenzia? 4 punti chiave, senza link.'},
        {label:'Come prenotare la consulenza', prompt:'Come funziona la consulenza gratuita e quali aspetti analizzeremo? senza link.'},
      ]);
    }
  }
  function close(){ hidePanel(); }

  // richiamato dai trigger dopo click “Calcola”
  function analyseKPIsSilently(kpi, contextNote) {
    mount(); showPanel();
    const k = kpi || {};
    const parts = [];
    if (k.roi!=null)      parts.push(`ROI: ${k.roi}`);
    if (k.roas!=null)     parts.push(`ROAS: ${k.roas}`);
    if (k.budget!=null)   parts.push(`Budget: €${k.budget}`);
    if (k.revenue!=null)  parts.push(`Fatturato: €${k.revenue}`);
    if (k.profit!=null)   parts.push(`${k.profit>=0?'Utile':'Perdita'}: €${k.profit}`);
    if (k.cpl!=null)      parts.push(`CPL: €${k.cpl}`);
    if (k.cpa!=null)      parts.push(`CPA: €${k.cpa}`);

    const prompt = `
Analizza questi **KPI simulati** (non sono risultati reali ma proiezioni del simulatore):
${parts.join(' | ')}.
${contextNote ? 'Contesto: ' + contextNote : ''}

Parla al **condizionale** (es. “otterresti, rientrerebbero…”). Se i numeri sono negativi, rassicura e spiega che in consulenza valuteremmo posizionamento/USP, pricing e ottimizzazioni di funnel per ridurre i costi e aumentare i tassi. 
Se i numeri sono buoni, spiega come potremmo scalare controllando KPI.
Non inserire link; chiudi invitando a **cliccare il bottone in basso**.
`.trim();
    ask(prompt, {silent:true, meta:{kpi}});
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  // bubble sempre pronto
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
