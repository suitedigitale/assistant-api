/* public/sd-chat.js — bubble + UI + CTA + typing + clamp + suggerimenti */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-bg:#0f1220; --sd-panel:#15172a; --sd-bubble:#8C52FF; --sd-muted:#aeb3c7; --sd-accent:#8C52FF; --sd-ring:rgba(140,82,255,.35); }

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
  .ai{justify-content:flex-start}
  .me{justify-content:flex-end}

  .sdw-msg{
    max-width:84%;
    padding:12px 14px;
    border-radius:14px;
    line-height:1.48;
    background:#121732;
    border:1px solid rgba(255,255,255,.06);
    overflow-wrap:anywhere;
    word-break:normal;
    white-space:normal;
  }
  .me .sdw-msg{background:#1b2250;border:1px solid rgba(255,255,255,.1)}
  .sdw-msg p{ margin:.35rem 0 }
  .sdw-msg strong{ font-weight:800 }
  .sdw-msg ul, .sdw-msg ol{ padding-left:1.1rem; margin:.3rem 0 .8rem 1rem; }

  /* chips (suggerimenti) */
  .sdw-chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0 0}
  .sdw-chip{background:#121732;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer}
  .sdw-chip:hover{border-color:#fff}

  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:var(--sd-accent);border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}

  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:#2bd47a;color:#0b0d16;border:0;border-radius:12px;padding:12px 14px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.02)}

  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:var(--sd-bubble);color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}

  /* typing */
  .typing{opacity:.85}
  .dots{display:inline-block;width:2ch;text-align:left}
  .dots::after{content:'…';animation:blink 1.2s steps(4,end) infinite}
  @keyframes blink{0%,20%{content:''}40%{content:'.'}60%{content:'..'}80%,100%{content:'...'}}

  /* clamp */
  .sdw-clamp{display:block;max-height:140px;overflow:hidden;position:relative}
  .sdw-fade{position:absolute;left:0;right:0;bottom:0;height:48px;background:linear-gradient(180deg,rgba(10,13,23,0),rgba(10,13,23,1))}
  .sdw-toggle{
    margin-top:6px;background:transparent;border:1px solid rgba(255,255,255,.15);
    color:#fff;border-radius:999px;padding:6px 10px;cursor:pointer;font-size:12px;align-self:flex-start;
  }
  `;

  const st = document.createElement('style'); st.id='sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== helpers ======
  function toHTML(txt=''){
    const s = String(txt).trim();
    const lines = s.split(/\r?\n/);
    let html = '';
    const bullets = [], numbers = [];

    const flush = (arr, ordered) => {
      if (!arr.length) return;
      html += ordered ? '<ol>' : '<ul>';
      for (const it of arr) html += `<li>${it}</li>`;
      html += ordered ? '</ol>' : '</ul>';
      arr.length = 0;
    };

    for (const raw of lines){
      const line = raw.trim();
      const mBullet = line.match(/^\-\s+(.*)$/);
      if (mBullet){ flush(numbers, true); bullets.push(mBullet[1].replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')); continue; }
      const mNum = line.match(/^\d+\.\s+(.*)$/);
      if (mNum){ flush(bullets, false); numbers.push(mNum[1].replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')); continue; }

      flush(bullets, false); flush(numbers, true);
      if (!line){ html += '<p>&nbsp;</p>'; continue; }
      const t = line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
      html += `<p>${t}</p>`;
    }
    flush(bullets, false); flush(numbers, true);
    return html;
  }

  function clampLong(msgEl){
    const maxLen = 850; // caratteri dopo cui clampo
    const rawText = msgEl.textContent || '';
    if (rawText.length < maxLen) return;

    msgEl.classList.add('sdw-clamp');
    const fade = document.createElement('div'); fade.className = 'sdw-fade';
    msgEl.appendChild(fade);

    const toggle = document.createElement('button');
    toggle.className = 'sdw-toggle';
    toggle.textContent = 'Leggi di più';
    msgEl.parentElement.appendChild(toggle);

    let open = false;
    toggle.onclick = () => {
      open = !open;
      msgEl.classList.toggle('sdw-clamp', !open);
      if (open) fade.remove(); else msgEl.appendChild(fade);
      toggle.textContent = open ? 'Mostra di meno' : 'Leggi di più';
      msgEl.closest('#sdw-body').scrollTop = msgEl.offsetTop - 12;
    };
  }

  function beepOpen(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type='sine'; o.frequency.value=880; g.gain.value=0.03;
      o.connect(g); g.connect(ctx.destination); o.start();
      setTimeout(()=>{o.stop();ctx.close()},130);
    }catch(_){}
  }

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn, bubble;

  function mount(){
    if (root) return;

    bubble = document.createElement('button');
    bubble.id='sdw-bubble'; bubble.type='button';
    bubble.textContent='🤖 Assistente AI';
    bubble.onclick = () => open({autostart:true});
    document.body.appendChild(bubble);
    bubble.style.display='inline-flex';

    root = document.createElement('div'); root.id='sdw-root';
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
      const v = (input.value||'').trim(); if (!v) return;
      input.value=''; ask(v,{silent:false});
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); fire(); } });
  }

  function showPanel(){ root.classList.add('sdw-visible'); bubble.style.display='none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); bubble.style.display='inline-flex'; }

  function addRow(role, html, opts={}) {
    const row = document.createElement('div'); row.className = 'sdw-row ' + role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = html;
    row.appendChild(msg); body.appendChild(row);
    if (opts.clamp) clampLong(msg);
    body.scrollTop = body.scrollHeight;
    return {row, msg};
  }

  function addChips(rowEl, items){
    if (!items || !items.length) return;
    const wrap = document.createElement('div'); wrap.className='sdw-chips';
    items.forEach(({label, prompt})=>{
      const b = document.createElement('button'); b.className='sdw-chip'; b.textContent=label;
      b.onclick = ()=> ask(prompt,{silent:false});
      wrap.appendChild(b);
    });
    rowEl.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function addTyping(){
    return addRow('ai', `<span class="typing">L'assistente sta scrivendo<span class="dots"></span></span>`);
  }

  // ====== FAQ locali (fallback) ======
  const LOCAL_FAQ = `
- **Devo assumere io i venditori o il team marketing?** No: ti forniamo un team già formato (strategist, media buyer, CRM specialist e venditori) che lavora come estensione della tua azienda.
- **Chi forma i venditori?** Noi. Prepariamo script e allineamento costante con le attività di marketing.
- **Mi garantite risultati?** Non promettiamo numeri, ma se in un mese non raggiungiamo appuntamenti/vendite previste, **il mese successivo è gratuito** finché non rientri in ROI positivo.
- **Come calcoliamo CPL/CPA/ROAS?** Da benchmark reali (220+ progetti) adattati a settore, funnel, appuntamenti e scontrino medio impostati nel simulatore.
- **I dati sono reali?** Sì, derivano dalla nostra operatività B2B/B2C su più settori.
- **Prezzo fisso?** Su misura: variabile per funnel, lead gestiti, appuntamenti. Parte da una base e integra componenti a performance.
- **Tempi dei primi lead?** In genere nei primi giorni; a regime intorno al primo mese con i primi contratti chiudibili.
  `.trim();

  // ====== BACKEND CALL ======
  async function ask(userPrompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(userPrompt));

    const typing = addTyping();

    const CONTEXT = `
Sei l'Assistente AI di **Suite Digitale**. Tono: amichevole, energico, professionale.
Parla **al condizionale**: i KPI del simulatore sono proiezioni, non risultati reali.
Se ROI/ROAS fossero bassi: rassicura e spiega che in consulenza analizzeremmo posizionamento/USP, pricing, margini, funnel e conversioni per rientrare in profitto.
Se le proiezioni fossero buone: energia positiva su come scalare con controllo KPI e team integrato.
Non inserire URL testuali nelle risposte; invita l'utente a usare il bottone "**Richiedi un’analisi gratuita 👉**" in basso.
Se la domanda esula da marketing/servizi Suite Digitale, rispondi che sei specializzato e offri aiuto via **marketing@suitedigitale.it** o **+39 351 509 4722**.
Usa **grassetto** per i concetti chiave ed elenchi ordinati/puntati quando utili.
  `.trim();

    try{
      const res = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          mode: 'analysis',
          prompt: userPrompt,
          context: CONTEXT,
          meta: opts.meta || null,
          faq: LOCAL_FAQ
        })
      });
      const j = await res.json().catch(()=>({}));
      const out = (j && (j.text||j.message)) ? (j.text||j.message) : 'Posso aiutarti su KPI, budget, ROAS, funnel e su come funziona Suite Digitale.';

      // sostituisci il typing
      typing.msg.innerHTML = toHTML(out);
      clampLong(typing.msg);

      // chips suggerite (semplici e utili)
      addChips(typing.row, [
        {label:'Cos’è Suite Digitale', prompt:'Spiegami cos’è Suite Digitale e perché unisce marketing e vendite.'},
        {label:'Perché scegliere noi', prompt:'Perché dovrei scegliere Suite Digitale rispetto a un’agenzia tradizionale?'},
        {label:'Come prenotare la consulenza', prompt:'Come funziona la consulenza gratuita e cosa succede durante la call?'}
      ]);
    }catch(e){
      typing.msg.innerHTML = toHTML(
        `Al momento non riesco a contattare il server. Intanto posso darti indicazioni generali su KPI e su come lavoreremmo insieme. Se vuoi approfondire, usa il bottone **Richiedi un’analisi gratuita 👉** qui sotto.`
      );
      clampLong(typing.msg);
    }
  }

  // ====== API pubbliche ======
  function open(opts={autostart:false}){
    mount(); showPanel(); beepOpen();
    if (opts.autostart){
      addRow('ai', toHTML(
        `Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**.  
Sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.  
Quando calcoli, ti restituirò un’analisi in linguaggio semplice e ti spiegherò come il nostro **team integrato marketing + vendite** potrebbe aiutarti.`
      ), {clamp:false});
    }
  }
  function close(){ hidePanel(); }

  // trigger chiamato dallo script dei trigger dopo il click “Calcola…”
  function analyseKPIsSilently(kpi, contextNote){
    mount(); showPanel();
    const k = kpi || {};
    const fields = [];
    if (isNum(k.roi)) fields.push(`ROI: ${k.roi}`);
    if (isNum(k.roas)) fields.push(`ROAS: ${k.roas}`);
    if (isNum(k.revenue)) fields.push(`Fatturato: €${k.revenue}`);
    if (isNum(k.budget)) fields.push(`Budget ADV: €${k.budget}`);
    if (isNum(k.fee)) fields.push(`Canone: €${k.fee}`);
    if (isNum(k.profit)) fields.push(`${k.profit >= 0 ? 'Utile' : 'Perdita'} mensile: €${k.profit}`);

    const prompt = `
Analizza questi KPI **simulati** (proiezioni, non risultati reali):
${fields.join(' | ')}

Fornisci 4–6 punti chiari:
- interpretazione al **condizionale**;
- come agirebbe Suite Digitale: posizionamento/USP, pricing e margini, ottimizzazione funnel e conversioni, integrazione marketing+vendite;
- invito finale ad usare il bottone "**Richiedi un’analisi gratuita 👉**".
Se non sono presenti CPL/CPA evitali. Evita URL nel testo.
${contextNote ? '\nNota: ' + contextNote : ''}`.trim();

    ask(prompt, {silent:true, meta:{kpi}});
  }

  function isNum(v){ return typeof v==='number' && isFinite(v); }

  // mount bubble
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  console.log('[SD] sd-chat.js pronto');
})();
