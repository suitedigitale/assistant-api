/* public/sd-chat.js — bubble + UI + FAQ locali + clamp + typing */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-bg:#0b0e1a; --sd-panel:#12162a; --sd-accent:#8C52FF; --sd-ring:rgba(140,82,255,.35); --sd-muted:#aeb3c7; }
  #sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0b0e1a;color:#eef1ff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:388px;max-height:62vh;overflow:auto;padding:14px 10px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:84%;padding:12px 14px;border-radius:14px;line-height:1.48;background:#121732;border:1px solid rgba(255,255,255,.06)}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#1b2250;border:1px solid rgba(255,255,255,.1)}
  .sdw-msg p{margin:.35rem 0}
  .sdw-msg strong{font-weight:800}
  .sdw-msg h4{margin:.2rem 0 .4rem 0;font-size:15px;font-weight:800}
  .sdw-msg ul{margin:.3rem 0 .8rem 1.1rem}
  .typing .sdw-msg{display:flex;align-items:center;gap:6px}
  .dots{display:inline-block;width:24px;text-align:left}
  .dots:after{content:"⋯";animation:sdw-dots 1s steps(4,end) infinite}
  @keyframes sdw-dots{0%{content:"."}25%{content:".."}50%{content:"..."}75%{content:".."}100%{content:"."}}
  /* clamp */
  .sdw-clamp{position:relative;max-height:280px;overflow:hidden}
  .sdw-fade{position:absolute;left:0;right:0;bottom:0;height:52px;background:linear-gradient(180deg,rgba(10,13,23,0) 0%, #0a0d17 70%)}
  .sdw-toggle{margin-top:6px;background:transparent;border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:999px;padding:6px 10px;cursor:pointer;font-size:12px}
  /* footer */
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220;align-items:center}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:var(--sd-accent);border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:var(--sd-accent);color:#fff;border:0;border-radius:12px;padding:12px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.06)}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:var(--sd-accent);color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  /* link (se mai comparisse) — bianco a riposo */
  a.sdw-link{color:#fff;text-decoration:underline}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== helpers ======
  const toHTML = (txt='') => {
    let h = String(txt);
    // **bold**
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // **Titolo:** -> <h4>
    h = h.replace(/\*\*(.+?)\*\:\s*/g, '<h4>$1</h4>');
    // bullet "- "
    if (/^- /m.test(h)) h = '<ul>'+h.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';
    // niente auto-link (niente URL cliccabili nel testo)
    return h.replace(/\n/g,'<br/>');
  };

  function clampLong(msgEl){
    // applica clamp solo su messaggi AI lunghi
    if (!msgEl) return;
    // già clamped?
    if (msgEl.classList.contains('sdw-clamp-applied')) return;
    // misura
    const needClamp = msgEl.scrollHeight > 320;
    if (!needClamp) return;
    msgEl.classList.add('sdw-clamp','sdw-clamp-applied');
    const fade = document.createElement('div'); fade.className = 'sdw-fade';
    const toggle = document.createElement('button'); toggle.className='sdw-toggle'; toggle.textContent='Leggi di più';
    toggle.onclick = () => {
      if (msgEl.classList.contains('sdw-clamp')) {
        msgEl.classList.remove('sdw-clamp'); fade.remove(); toggle.textContent='Mostra di meno';
      } else {
        msgEl.classList.add('sdw-clamp'); msgEl.appendChild(fade); toggle.textContent='Leggi di più';
      }
    };
    msgEl.appendChild(fade);
    msgEl.parentElement.appendChild(toggle);
  }

  // ===== UI =====
  let root, body, input, sendBtn, ctaBtn, bubble;

  function mount() {
    if (root) return;

    // Bubble (non auto-apre)
    bubble = document.createElement('button');
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
    ctaBtn.onclick = () => { window.open(CTA_URL, '_blank'); };

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = ''; ask(v, {silent:false});
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
  }
  function showPanel(){ root.classList.add('sdw-visible'); bubble.style.display = 'none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); bubble.style.display = 'inline-flex'; }
  function addRow(role, html, typing=false){
    const row = document.createElement('div'); row.className = 'sdw-row '+role+(typing?' typing':'');
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = html;
    row.appendChild(msg); body.appendChild(row); body.scrollTop = body.scrollHeight;
    return msg;
  }
  function showTyping(){
    return addRow('ai', `L'assistente sta scrivendo <span class="dots"></span>`, true);
  }

  // ===== FAQ locali =====
  const FAQS = [
    { test: /(devo|dovr[oò]|serve).*(assumere|assumir[eà]).*(venditor|team|marketing|crm)/i,
      answer: `No: ti diamo un **team già formato** di strategist, media buyer, **CRM specialist** e **venditori telefonici** che lavorerebbe come **estensione della tua azienda**. Non dovresti assumere nessuno: il team è **incluso**.` },
    { test: /(chi|come).*(forma|formate).*(venditor)/i,
      answer: `La **formazione** e l’allineamento dei venditori li gestiremmo noi, preparando anche lo **script di vendita** coerente con i messaggi di marketing.` },
    { test: /(garantite|garanzia|risultat)/i,
      answer: `Non garantiamo numeri precisi, ma adottiamo la formula **“soddisfatto o rimborsato”**: se in un mese non raggiungessimo gli **appuntamenti o le vendite previste**, il mese successivo il servizio sarebbe **interamente gratuito**, finché non rientreresti in **ROI positivo**.` },
    { test: /(come).*(calcol|ottengo).*(cpl|cpa|roas)/i,
      answer: `I valori come **CPL/CPA/ROAS** derivano da **benchmark reali** di oltre **220 progetti**. Il sistema adatta i parametri a **business, settore, n. funnel, appuntamenti e scontrino medio** impostati nel simulatore.` },
    { test: /(dati).*(real|veri|certificat)/i,
      answer: `Sì: i dati provengono da progetti **B2B/B2C reali** gestiti dal nostro team. Non sono stime generiche: sono **metriche certificate sul campo**.` },
    { test: /(se cambio|cambio).*(settore)/i,
      answer: `Cambierebbero in modo **significativo**, perché ogni settore ha **costi** e **conversioni** diversi. Il simulatore serve proprio a vedere come la proiezione si adatta al tuo modello.` },
    { test: /(prezzo|costo).*(fisso|aumenta|varia)/i,
      answer: `Il prezzo sarebbe **su misura**: dipende da **n. funnel**, volumi di **lead** gestiti e **appuntamenti**. Combiniamo servizi **standard + performance**; nel simulatore vedi **già** il costo previsto.` },
    { test: /(costo minimo|max|budget).*(risultat)/i,
      answer: `Dipenderebbe dal settore, ma in genere consigliamo **€20–30/giorno** di ADV **oltre** al canone base. Da lì in avanti, **più budget ⇒ più lead** con controllo di **CPL/CPA**.` },
    { test: /(quanto|in quanto).*(tempo).*(lead|primi)/i,
      answer: `I **primi lead** arriverebbero **nei primi giorni**; dopo circa **1 mese** il sistema girerebbe a pieno regime e ci aspetteremmo le **prime chiusure**.` },
    { test: /(se investo|aumento).*(budget)/i,
      answer: `In modo **proporzionale**: più budget ⇒ più lead (a parità di funnel e conversioni). Il simulatore mostra già il **budget minimo** consigliato.` },
    { test: /(quante|quali).*(vendite|chius)/i,
      answer: `Le **vendite stimate** dipendono da **scontrino medio** e **tasso di conversione** appuntamenti→clienti. Con scontrino alto, meno clienti ma **valore maggiore** per ogni vendita.` },
    { test: /(cos'?è|che cos'?è|spiega).*(roas)/i,
      answer: `Il **ROAS** è il ritorno sull’investimento **pubblicitario**. Un ROAS 5 significherebbe che per ogni €1 investito in ADV genereresti **€5 di fatturato**.` }
  ];
  function tryLocalFAQ(text){
    if (!text) return null;
    for (const f of FAQS){ if (f.test.test(text)) {
      return f.answer + `

**Se vuoi prenotare una Consulenza di analisi gratuita, clicca sul bottone qui sotto.**`;
    }}
    return null;
  }

  // ===== Backend call (niente link nelle risposte) =====
  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(prompt));
    const typingMsg = showTyping();

    // 1) FAQ locali
    const local = tryLocalFAQ(prompt);
    if (local){
      typingMsg.innerHTML = toHTML(local);
      clampLong(typingMsg);
      return;
    }

    // 2) contesto AI
    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**.
- Tono: amichevole, tecnico ma motivante.
- Parla sempre al **condizionale**: i KPI sono **proiezioni simulate**, non risultati storici.
- Metti i benefici del nostro **team integrato Marketing + Vendite** (strategist, media buyer, CRM specialist, venditori telefonici).
- Evita istruzioni “fai-da-te”: spiega **cosa faremmo noi** (posizionamento, USP, pricing, ottimizzare conversioni, ridurre sprechi).
- **NON inserire link/URL**. Chiudi con:
  "**Se vuoi prenotare una Consulenza di analisi gratuita, clicca sul bottone qui sotto.**"
- Usa **grassetti** per concetti chiave ed elenchi quando utile.
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
      const out = (j && (j.text || j.message)) ? j.text || j.message : 'Non ho ricevuto testo dal modello.';
      typingMsg.innerHTML = toHTML(out + `

**Se vuoi prenotare una Consulenza di analisi gratuita, clicca sul bottone qui sotto.**`);
      clampLong(typingMsg);
    } catch (e) {
      typingMsg.innerHTML = toHTML(
        `In questo momento non riesco a contattare il server, ma posso già orientarti sui prossimi passi.
**Se vuoi prenotare una Consulenza di analisi gratuita, clicca sul bottone qui sotto.**`
      );
      clampLong(typingMsg);
    }
  }

  // ===== API pubbliche & flussi =====
  function open(opts={}) {
    mount(); showPanel();
    if (opts.autostart) {
      const welcome = `Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**.
Nel frattempo sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.`;
      addRow('ai', toHTML(welcome));
    }
  }
  function close(){ hidePanel(); }

  // chiamata “silente” dai triggers dopo il click su “Calcola”
  function analyseKPIsSilently(kpi, contextNote) {
    mount(); showPanel();
    const k = kpi || {};
    // Genera prompt condizionale solo con i campi presenti (niente zero finti)
    const parts = [];
    if (k.revenue!=null) parts.push(`Fatturato: €${k.revenue}`);
    if (k.budget!=null)  parts.push(`Budget ADV: €${k.budget}`);
    if (k.fee!=null)     parts.push(`Canone: €${k.fee}`);
    if (k.roi!=null)     parts.push(`ROI: ${k.roi}%`);
    if (k.roas!=null)    parts.push(`ROAS: ${k.roas}x`);
    if (k.cpl!=null)     parts.push(`CPL: €${k.cpl}`);
    if (k.cpa!=null)     parts.push(`CPA: €${k.cpa}`);
    const kline = parts.length ? parts.join(' | ') : '(KPI non disponibili)';

    const prompt = `
Analizza questi **KPI simulati** (proiezione, non storico):
${kline}
${contextNote ? 'Contesto: ' + contextNote : ''}

Dammi 4–6 punti:
- interpretazione **condizionale** dei KPI;
- cosa faremmo noi (posizionamento, USP, pricing, ottimizzare conversioni, tagliare sprechi);
- se ROI/ROAS deboli: rassicura e invita alla consulenza;
- se i numeri fossero buoni: come scaleremmo con controllo KPI.
Chiudi con: "**Se vuoi prenotare una Consulenza di analisi gratuita, clicca sul bottone qui sotto.**"
`.trim();
    ask(prompt, {silent:true, meta:{kpi}});
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  // bubble pronto
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
