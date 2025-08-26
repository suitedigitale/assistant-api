/* public/sd-chat.js — bubble + UI + quick replies + anteprima messaggi + link bianchi */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root { --sd-bg:#0f1220; --sd-panel:#15172a; --sd-muted:#aeb3c7; --sd-accent:#7b5cff; --sd-ring:rgba(123,92,255,.35); }
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0c0f1a;color:#eef1ff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:16px 12px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;flex-direction:column;gap:8px;margin:10px 0;position:relative}
  .sdw-msg{max-width:82%;padding:12px 14px;border-radius:14px;line-height:1.45;position:relative}
  .sdw-msg p{margin:.3rem 0}
  .sdw-msg ul{margin:.3rem 0 .8rem 1.1rem}
  .sdw-msg h4{margin:.2rem 0 .4rem 0;font-size:15px;font-weight:800}
  .ai .sdw-msg{align-self:flex-start;background:#151a33;border:1px solid rgba(255,255,255,.06)}
  .me .sdw-msg{align-self:flex-end;background:#1b2250;border:1px solid rgba(255,255,255,.1)}
  /* anteprima (collassato) — overlay solo quando serve */
  .sdw-collapsed .sdw-msg{max-height:220px;overflow:hidden}
  .sdw-collapsed .sdw-msg::after{
    content:"";position:absolute;left:0;right:0;bottom:0;height:56px;
    background:linear-gradient(180deg, rgba(21,26,51,0), #151a33 70%);
    pointer-events:none;border-bottom-left-radius:14px;border-bottom-right-radius:14px;
  }
  /* toggle SOTTO al balloon */
  .sdw-tools{display:block;margin-top:-2px;padding-left:4px}
  .sdw-toggle{background:transparent;border:0;color:#9dc1ff;text-decoration:underline;cursor:pointer;padding:0;font-weight:700}
  /* quick replies */
  .sdw-quick{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .sdw-chip{background:transparent;border:1px solid rgba(255,255,255,.18);color:#cfd3e9;border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer}
  .sdw-chip:hover{border-color:#9dc1ff;color:#fff}
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:#ffece6;color:#1a1b2e;border:1px solid #ffd1c4;border-radius:12px;padding:10px 12px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.02)}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  /* link sempre bianchi */
  #sdw-body a, a.sdw-link{color:#fff !important;text-decoration:underline}
  #sdw-body a:hover{opacity:.92}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== helpers ======
  const toHTML = (txt) => {
    if (txt == null) return '';
    let h = String(txt);
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*\*(.+?)\*\:\s*/g, '<h4>$1</h4>');
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" class="sdw-link" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/(^|[\s(])((https?:\/\/[^\s<>()\]\}]+))(?![^<]*>)/g,'$1<a href="$2" class="sdw-link" target="_blank" rel="noopener">$2</a>');
    if (/^- /m.test(h)) h = '<ul>'+h.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';
    return h.replace(/\n/g,'<br/>');
  };

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn;

  function mount() {
    if (root) return;
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble'; bubble.type='button'; bubble.textContent='🤖 Assistente AI';
    bubble.onclick = () => open();
    document.body.appendChild(bubble); bubble.style.display='inline-flex';

    root = document.createElement('div'); root.id='sdw-root';
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
    ctaBtn.onclick = () => window.open(CTA_URL,'_blank');

    const fire = () => {
      const v = (input.value||'').trim(); if (!v) return;
      input.value=''; ask(v,{silent:false});
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();fire();}});
  }
  function showPanel(){ root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display='none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display='inline-flex'; }

  function addRow(role, html){
    const row = document.createElement('div'); row.className='sdw-row '+role;
    const msg = document.createElement('div'); msg.className='sdw-msg'; msg.innerHTML=html;
    row.appendChild(msg); body.appendChild(row);
    body.scrollTop = row.offsetTop - 8; // resta in alto sul nuovo messaggio
    return row;
  }

  // Collassa SEMPRE subito, poi misura con doppio rAF; se non serve, rimuove collasso.
  function applyCollapsible(row){
    if (!row || row.__collapsibleApplied) return;
    const msg = row.querySelector('.sdw-msg'); if (!msg) return;

    row.classList.add('sdw-collapsed');

    const measure = () => {
      const need = msg.scrollHeight > msg.clientHeight + 4;
      if (!need){
        row.classList.remove('sdw-collapsed');
        row.__collapsibleApplied = true;
        return;
      }
      // toggle sotto al balloon (fratello della sdw-msg)
      const tools = document.createElement('div');
      tools.className='sdw-tools';
      const tgl = document.createElement('button');
      tgl.className='sdw-toggle'; tgl.type='button'; tgl.textContent='Leggi tutto';
      tgl.onclick = () => {
        const collapsed = row.classList.toggle('sdw-collapsed');
        tgl.textContent = collapsed ? 'Leggi tutto' : 'Mostra meno';
        body.scrollTop = row.offsetTop - 8;
      };
      tools.appendChild(tgl);
      row.appendChild(tools);
      row.__collapsibleApplied = true;
      body.scrollTop = row.offsetTop - 8;
    };
    // doppio rAF = misura dopo il layout completo (affidabile)
    requestAnimationFrame(()=>requestAnimationFrame(measure));
  }

  function welcomeIfEmpty(){
    if (body.childElementCount>0) return;
    const row = addRow('ai', toHTML(
`Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**.
Sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.`));
    const msg = row.querySelector('.sdw-msg');
    const qr = document.createElement('div'); qr.className='sdw-quick';
    ['Cos’è Suite Digitale?','Perché scegliere Suite Digitale?','Come prenotare la consulenza gratuita?','Come calcolate i KPI nel simulatore?']
      .forEach(label=>{
        const b=document.createElement('button'); b.className='sdw-chip'; b.type='button'; b.textContent=label;
        b.onclick=()=>ask(label,{silent:true});
        qr.appendChild(b);
      });
    msg.appendChild(qr);
  }

  // ====== Backend ======
  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(prompt));
    const loaderRow = addRow('ai', toHTML("L'assistente sta scrivendo…"));

    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**. Tono: cordiale, professionale, motivante.
Obiettivo: spiegare KPI simulati e guidare alla **Consulenza Gratuita** (bottone 👇).
Ricorda: team integrato Marketing & Vendite, piattaforma all-in-one (funnel, ADV, CRM, automazioni), presa appuntamenti.
Se domanda off-topic, indica che sei specializzato e dai **marketing@suitedigitale.it** o **+39 351 509 4722**.
Usa **grassetto** per i punti chiave. Chiudi con: “**Vuoi andare a fondo con il tuo caso?** Prenota con il bottone 👇”.`.trim();

    try{
      const res = await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'analysis',prompt,context:CONTEXT,meta:opts.meta||null})});
      const j = await res.json().catch(()=>({}));
      const out = (j && (j.text||j.message)) ? j.text||j.message : JSON.stringify(j);
      loaderRow.querySelector('.sdw-msg').innerHTML = toHTML(out);
      applyCollapsible(loaderRow);
    }catch(e){
      loaderRow.querySelector('.sdw-msg').innerHTML = toHTML(`Non riesco a contattare il server ora. Posso comunque darti indicazioni generali e prepararti alla **Consulenza Gratuita** (bottone 👇).`);
      applyCollapsible(loaderRow);
    }
  }

  // ====== API ======
  function open(){ mount(); showPanel(); welcomeIfEmpty(); }
  function close(){ hidePanel(); }

  function analyseKPIsSilently(kpi, contextNote) {
    mount(); showPanel();
    const k = kpi||{};
    const prompt = `
Analizza questi KPI simulati (non sono risultati reali ma una stima):
ROI: ${k.roi ?? 'nd'} | ROAS: ${k.roas ?? 'nd'} | CPL: ${k.cpl ?? 'nd'} | CPA: ${k.cpa ?? 'nd'} | Budget: ${k.budget ?? 'nd'} | Fatturato: ${k.revenue ?? 'nd'} | Utile/Perdita: ${k.profit ?? 'nd'}.
${contextNote ? 'Contesto: ' + contextNote : ''}

Rispondi al **condizionale** in 4–6 punti:
- interpretazione dei numeri;
- perché serve un team integrato marketing+vendite (CLOSETING);
- se ROI/ROAS fossero deboli: invito a consulenza per rimettere in rotta;
- se i numeri fossero buoni: come scalare con metodo e controllo KPI.
Chiudi con: “**Vuoi andare a fondo con il tuo caso?** Prenota con il bottone 👇”.`.trim();
    ask(prompt,{silent:true,meta:{kpi}});
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  console.log('[SD] sd-chat.js pronto');
})();
