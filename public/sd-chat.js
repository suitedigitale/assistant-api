/* public/sd-chat.js — UI + AI + Leggi tutto + typing + CTA gradient */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-bg:#0f1220; --sd-panel:#15172a; --sd-muted:#aeb3c7; --sd-accent:#8C52FF; --sd-ring:rgba(140,82,255,.35); }
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:2147483647;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:420px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0c0f1a;color:#eef1ff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:16px 12px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .ai{justify-content:flex-start}
  .me{justify-content:flex-end}
  .sdw-msg{max-width:82%;padding:12px 14px;border-radius:14px;line-height:1.45}
  .ai .sdw-msg{background:#151a33;border:1px solid rgba(255,255,255,.06); text-align:left;}
  .me .sdw-msg{background:#9255FF;border:1px solid #38006A}
  .sdw-msg p{margin:.35rem 0}
  .sdw-msg ul{margin:.35rem 0 .8rem 1.1rem}
  .sdw-msg h4{margin:.2rem 0 .4rem 0;font-size:15px;font-weight:800}
  .sdw-readmore{display:block;margin-top:8px;font-size:12px;opacity:.85;cursor:pointer;text-decoration:underline}
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:#8C52FF;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:linear-gradient(135deg,#FD3F3F,#8930BB);color:#fff;border:0;border-radius:12px;padding:10px 12px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.03)}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:#8C52FF;color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:2147483647}
  a.sdw-link{color:#fff;text-decoration:underline}
  a.sdw-link:hover{opacity:.9}
  .sdw-typing{display:inline-flex;align-items:center;gap:8px;opacity:.9}
  .sdw-dots{display:inline-block;width:22px;text-align:left}
  .sdw-dots:after{content:"…"; animation: sdw-dot 1.2s infinite}
  @keyframes sdw-dot{0%{content:"."}33%{content:".."}66%{content:"..."}100%{content:"."}}
  .sdw-suggest{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .sdw-chip{border:1px solid rgba(255,255,255,.18);background:transparent;color:#cfd3e9;border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== tiny helpers ======
  const clampText = (txt, limit=520) => {
    if (!txt) return { short:'', full:'', truncated:false };
    const s = String(txt);
    if (s.length <= limit) return { short:s, full:s, truncated:false };
    return { short:s.slice(0, limit), full:s, truncated:true };
  };

  const toHTML = (txt) => {
    if (txt == null) return '';
    let h = String(txt);

    // **bold**
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Titoli stile "**Titolo:**" -> <h4>Titolo</h4>
    h = h.replace(/\*\*(.+?)\*\:\s*/g, '<h4>$1</h4>');

    // Link markdown [testo](https://url) -> <a>
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" class="sdw-link" target="_blank" rel="noopener">$1</a>');

    // URL nudi -> <a> (evita parentesi/punteggiatura finali)
    h = h.replace(/(^|[\s(])((https?:\/\/[^\s<>()\]\}]+))(?![^<]*>)/g, '$1<a href="$2" class="sdw-link" target="_blank" rel="noopener">$2</a>');

    // Bullet “- testo” -> lista (se inizia riga)
    if (/^- /m.test(h)) h = '<ul>'+h.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';

    // A capo
    return h.replace(/\n/g,'<br/>');
  };

  // sound all’apertura bubble (breve “ping” via WebAudio)
  function playOpenSound() {
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.05;
      o.connect(g); g.connect(ctx.destination); o.start();
      setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.15); o.stop(ctx.currentTime+0.16); }, 60);
    }catch{}
  }

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn, bubble;

  function mount() {
    if (root) return;

    bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => open({ autostart: true });
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

        <div style="padding:0 12px 8px 12px">
          <div class="sdw-suggest" id="sdw-suggest"></div>
          <button id="sdw-cta">Richiedi un’analisi gratuita 👉</button>
        </div>

        <div id="sdw-foot">
          <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo budget e KPI)">
          <button id="sdw-send">Invia</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    body    = root.querySelector('#sdw-body');
    input   = root.querySelector('#sdw-input');
    sendBtn = root.querySelector('#sdw-send');
    ctaBtn  = root.querySelector('#sdw-cta');

    root.querySelector('#sdw-close').onclick = () => close();
    ctaBtn.onclick = () => { window.open(CTA_URL, '_blank'); };

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = '';
      ask(v, {silent:false});
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });

    // suggerimenti (quick replies)
    const sugg = [
      'Cos’è il MarkSelling™?',
      'Perché scegliere Suite Digitale?',
      'Cosa succede nella consulenza gratuita?',
      'Come funziona la presa appuntamenti?'
    ];
    const sugWrap = root.querySelector('#sdw-suggest');
    sugg.forEach(label=>{
      const b=document.createElement('button'); b.className='sdw-chip'; b.textContent=label;
      b.onclick = ()=> ask(label, {silent:true}); // NIENTE duplicazione del messaggio utente
      sugWrap.appendChild(b);
    });
  }

  function showPanel(){ root.classList.add('sdw-visible'); bubble.style.display='none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); bubble.style.display='inline-flex'; }
  function scrollToEnd(){ body.scrollTop = body.scrollHeight; }

  function addRow(role, textHTML, withClamp=true){
    const row = document.createElement('div'); row.className = 'sdw-row ' + role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg';

    if (withClamp) {
      const { short, full, truncated } = clampText(textHTML, 520);
      msg.innerHTML = toHTML(short);
      if (truncated) {
        const rm = document.createElement('a');
        rm.className = 'sdw-readmore';
        rm.textContent = 'Leggi tutto';
        rm.onclick = ()=> {
          msg.innerHTML = toHTML(full);
          const less = document.createElement('a');
          less.className = 'sdw-readmore';
          less.textContent = 'Mostra meno';
          less.onclick = ()=> { msg.innerHTML = toHTML(short); msg.appendChild(rm); scrollToEnd(); };
          msg.appendChild(less);
          scrollToEnd();
        };
        msg.appendChild(rm);
      }
    } else {
      msg.innerHTML = toHTML(textHTML);
    }

    row.appendChild(msg); body.appendChild(row);
    scrollToEnd();
  }

  function addTyping(){
    const row = document.createElement('div'); row.className='sdw-row ai';
    const msg = document.createElement('div'); msg.className='sdw-msg';
    msg.innerHTML = `<span class="sdw-typing">L’assistente sta scrivendo <span class="sdw-dots"></span></span>`;
    row.appendChild(msg); body.appendChild(row);
    scrollToEnd();
    return row;
  }

  // ====== Backend call ======
  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', prompt); // l’utente a destra
    const typingRow = addTyping();

    // Prompt base (CONTEXT) — MarkSelling™ + KPI realistici
    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**.

🎯 Missione
- Rispondi in modo cordiale, entusiasta e professionale.
- Aiuta l’utente a capire i **KPI del simulatore** (sono **proiezioni realistiche** basate su **migliaia di dati reali** raccolti su **220+ progetti**), e indirizzalo alla **Consulenza Gratuita**.
- Non inserire link in chiaro: **invita sempre a usare la CTA "Richiedi un’analisi gratuita" qui sotto 👇**.

🥇 USP: MarkSelling™
- **MarkSelling™** = metodo che **unisce marketing & vendite** in **un unico team operativo** (strategist, media buyer, venditori telefonici/setter), con **KPI condivisi, un solo playbook e responsabilità sul risultato**.
- Costa **meno di un singolo apprendista**, ma offre **strategia su misura**, **funnel & landing**, **CRM e automazioni pronti day-1**, **campagne multicanale** (Meta, Google, TikTok, LinkedIn) e **presa appuntamenti entro 5’**.
- Elimina lo spreco dei reparti separati: **meno lead mal gestiti, più appuntamenti e vendite**.

🌐 Piattaforma & Processo
- Piattaforma **all-in-one**: funnel, CRM, automazioni, dashboard su **CPA, ROAS, Appuntamenti e Vendite**.
- Dalla **strategia** alla **vendita** in un unico flusso coordinato.
- Valorizza casi d’uso per **PMI**, **Professionisti** e **Grandi aziende** quando utile.

🧭 Come rispondere
- Per i KPI del simulatore usa **sempre il condizionale** (“avresti”, “potresti”, “si potrebbe…”).
- Se alcuni KPI mancano/sono zero, **non inventare numeri**: dillo e proponi la call.
- In caso di **ROI/ROAS deboli**: rassicura e spiega che in consulenza analizzeremo **posizionamento, USP, pricing, margini, funnel e conversioni** per rimettere la strategia in rotta (approccio MarkSelling™).
- In caso di **KPI buoni**: spiega come **si potrebbe scalare** in sicurezza con controllo KPI e team integrato.
- Usa **grassetto** per i concetti chiave e **elenchi** per chiarezza.
- Se la domanda esce dal perimetro (marketing, vendite, Suite Digitale, piattaforma): rispondi brevemente che sei specializzato su questi temi e invita a contattarci a **marketing@suitedigitale.it** o **+39 351 509 4722**.

🧩 Chiusura
- Chiudi SEMPRE con:  
  **“Vuoi passare dai numeri all’azione? Usa il bottone qui sotto 👇 per richiedere un’analisi gratuita.”**
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
      // rimpiazzo typing con risposta (clamp + readmore)
      typingRow.remove();
      addRow('ai', out, true);
    } catch (e) {
      typingRow.remove();
      addRow('ai',
        `Al momento non riesco a contattare il server. 
Nel frattempo posso prepararti al meglio: con **MarkSelling™** uniamo marketing & vendite in **un unico team** per ridurre sprechi e aumentare vendite.
**Vuoi passare dai numeri all’azione? Usa il bottone qui sotto 👇 per richiedere un’analisi gratuita.**`
      );
    }
  }

  // ====== API pubbliche per i trigger ======
  function open(opts={}) {
    mount(); showPanel(); playOpenSound();
    if (opts.autostart) {
      // Benvenuto iniziale (una volta aperto manualmente)
      addRow('ai',
`Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**. 
Intanto sono qui per qualsiasi dubbio su KPI, budget o strategia.

Con il **MarkSelling™** uniamo **marketing & vendite** in **un unico team** (strategist, media buyer, venditori) che lavora sullo **stesso obiettivo**. 
Meno sprechi, più appuntamenti e vendite — e **costa meno di un singolo apprendista**.

Quando sei pronto, calcola: ti commento i KPI in modo chiaro e ti dico come potremmo farli crescere.
`
      );
    }
  }
  function close(){ hidePanel(); }

  // il trigger “Calcola” richiama questa (non mostra l’input utente)
  function analyseKPIsSilently(kpi, contextNote) {
    mount(); showPanel(); // non aggiunge messaggi utente
    const k = kpi || {};
    const prompt = `
Analizza i seguenti **KPI simulati** (proiezioni realistiche, basate su migliaia di dati reali da 220+ progetti):
ROI: ${k.roi ?? 'nd'} | ROAS: ${k.roas ?? 'nd'} | CPL: ${k.cpl ?? 'nd'} | CPA: ${k.cpa ?? 'nd'} | Budget: ${k.budget ?? 'nd'} | Fatturato: ${k.revenue ?? 'nd'} | Utile/Perdita: ${k.profit ?? 'nd'}.
${contextNote ? 'Contesto: ' + contextNote : ''}

Scrivi **4–6 punti**, tono entusiasta ma concreto, **al condizionale**. 
- Interpreta i numeri in modo obiettivo (se un valore manca, dillo senza inventare).
- Se ROI/ROAS fossero deboli: spiega come il **MarkSelling™** (marketing+vendite integrati) potrebbe ridurre sprechi, chiarire **posizionamento/USP**, migliorare **pricing**, **margini**, **funnel** e **tassi di conversione** fino a riportare la strategia in utile.
- Se KPI fossero buoni: spiega come **si potrebbe scalare** in sicurezza con controllo KPI e team integrato.
- Evidenzia sempre: **team unico**, **KPI condivisi**, **funnel+CRM+automazioni pronti**, **presa appuntamenti in 5’**.
- Non inserire link: invita a usare la **CTA qui sotto**.

Chiudi SEMPRE con:  
**“Vuoi passare dai numeri all’azione? Usa il bottone qui sotto 👇 per richiedere un’analisi gratuita.”**
`.trim();
    ask(prompt, {silent:true, meta:{kpi}});
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  // bubble sempre pronto
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
