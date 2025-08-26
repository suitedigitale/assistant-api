(function () {
  // ===== CONFIG =====
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant'; // se down, c’è fallback locale
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ===== CSS =====
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root{--sd-bg:#0b0f1a;--sd-panel:#11162a;--sd-ink:#eaf0ff;--sd-muted:#a7b0c8;--sd-accent:#8C52FF;--sd-ring:rgba(140,82,255,.35)}
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0b0f1a;color:var(--sd-ink);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:16px 12px;background:#080c16;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:82%;padding:12px 14px;border-radius:14px;line-height:1.48;position:relative;border:1px solid rgba(255,255,255,.08)}
  .sdw-msg p{margin:.35rem 0}
  .sdw-msg h4{margin:.15rem 0 .35rem 0;font-size:15px;font-weight:800}
  .sdw-msg .more{display:inline-block;margin-top:8px;font-weight:700;cursor:pointer;text-decoration:underline}
  .ai{justify-content:flex-start}
  .ai .sdw-msg{background:#141b38}
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#1a1d3f;border-color:#9255FF}
  .me .sdw-msg::before{content:"";position:absolute;inset:0;border-radius:14px;pointer-events:none;box-shadow:0 0 0 2px #9255FF}
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:var(--sd-accent);border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:var(--sd-accent);color:#fff;border:0;border-radius:12px;padding:12px 14px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.02)}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:var(--sd-accent);color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  .sdw-sugs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .sdw-sugs button{background:#0e1330;border:1px solid rgba(255,255,255,.08);color:#dfe5ff;border-radius:999px;padding:8px 12px;cursor:pointer}
  .typing{display:inline-flex;align-items:center;gap:8px;background:#151a33;border:1px dashed rgba(255,255,255,.18)}
  .typing .dots{width:22px;display:inline-block;text-align:left}
  .typing .dots::after{content:"…";animation:blink 1.2s steps(4,end) infinite}
  @keyframes blink{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}
  .sdw-link{color:#fff;text-decoration:underline}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ===== helpers =====
  const escapeHTML = s => (s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const toHTML = (txt) => {
    let h = escapeHTML(txt||'');
    // grassetto **testo**
    h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    // "Titolo:" -> h4
    h = h.replace(/\*\*(.+?)\*\:\s*/g,'<h4>$1</h4>');
    // niente auto-link: eventuali URL rimangono testo, non cliccabili
    // nuove righe
    h = h.replace(/\n/g,'<br/>');
    return h;
  };
  function addRow(role, html, opts={}) {
    const row = document.createElement('div'); row.className = 'sdw-row '+role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = html;
    // Leggi tutto
    const MAX = 360; // px
    const enableClamp = () => {
      if (msg.scrollHeight > MAX) {
        msg.style.maxHeight = MAX+'px'; msg.style.overflow = 'hidden';
        const more = document.createElement('a'); more.className='more'; more.textContent='Leggi tutto';
        more.onclick = () => {
          const exp = msg.style.maxHeight === '';
          if (exp) { msg.style.maxHeight = MAX+'px'; more.textContent='Leggi tutto'; }
          else { msg.style.maxHeight=''; more.textContent='Mostra meno'; }
        };
        msg.appendChild(document.createElement('br'));
        msg.appendChild(more);
      }
    };
    row.appendChild(msg); body.appendChild(row);
    if (!opts.noClamp) requestAnimationFrame(enableClamp);
    body.scrollTop = 0; // resta all’inizio del messaggio
    return msg;
  }

  // ===== UI =====
  let root, body, input, sendBtn, ctaBtn, bubble;

  function mount() {
    if (root) return;
    bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => open({ autostart:true });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title"><span class="ava">🤖</span><span>Assistente AI</span><span class="dot"></span></div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div class="sdw-sugs" id="sdw-sugs"></div>
        <button id="sdw-cta">Richiedi un’analisi gratuita 👇</button>
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
  function showPanel(){ root.classList.add('sdw-visible'); bubble.style.display='none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); bubble.style.display='inline-flex'; }

  // Suggerimenti
  function renderSugs(){
    const sugs = [
      'Cos’è Suite Digitale? Spiegalo in 6-8 righe, senza link.',
      'Perché scegliere Suite Digitale rispetto a un’agenzia?',
      'Come prenotare la consulenza'
    ];
    const wrap = document.getElementById('sdw-sugs'); wrap.innerHTML='';
    sugs.forEach(t=>{
      const b=document.createElement('button'); b.textContent=t;
      b.onclick=()=>ask(t,{silent:true}); // non mostra il messaggio utente
      wrap.appendChild(b);
    });
  }

  // ===== Backend call =====
  function typingOn(){
    return addRow('ai', toHTML(`L'assistente sta scrivendo<span class='dots'></span>`), {noClamp:true});
  }

  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(prompt));
    const loader = typingOn();

    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale** (tono amichevole, energico, professionale).
Parla SEMPRE al **condizionale** perché i KPI sono **simulati**.
Non inserire link nel testo: se serve, di’ “clicca sul bottone qui sotto”.
Valorizza sempre il nostro **CLOSETING** (marketing+vendite integrati): strategist, media buyer, CRM specialist, setter/closer telefonici coordinati.
Se KPI negativi: rassicura, spiega che in consulenza analizzeremmo USP, posizionamento, pricing, margini e conversioni per riportare la strategia in profitto.
Se KPI buoni: spiega come scaleremmo con controllo rigoroso dei KPI e processo integrato.
Chiudi con una call-to-action: “Se vuoi, **prenota una consulenza di analisi gratuita**: clicca sul bottone qui sotto.”.
`.trim();

    try {
      const res = await fetch(ENDPOINT, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt, context: CONTEXT, meta: opts.meta||null })
      });
      const j = await res.json().catch(()=> ({}));
      const out = (j && (j.text || j.message)) ? (j.text || j.message) : 'Ok.';
      loader.innerHTML = toHTML(out);
    } catch (e) {
      loader.innerHTML = toHTML(
        `Posso aiutarti anche senza server. Vuoi un’analisi dei KPI simulati o capire cos’è **Suite Digitale**? `+
        `Se vuoi fissare una call, **clicca sul bottone qui sotto**.`
      );
    }
  }

  // ===== API pubbliche per i trigger =====
  function welcome(){
    addRow('ai', toHTML(
`Ciao! 👋 Per darti un’analisi precisa dovresti **compilare il simulatore** e premere **Calcola la tua crescita**. 
Intanto sono qui per qualsiasi dubbio su KPI, budget, ROAS o strategia.`));
  }

  function open(opts={}){ mount(); showPanel(); renderSugs(); if (opts.autostart) welcome(); }
  function close(){ hidePanel(); }

  // richiamato dai trigger dopo il click su “Calcola”
  function analyseKPIsSilently(kpi, contextNote){
    mount(); showPanel(); renderSugs();
    const k = kpi||{};
    const prompt = `
Analizza in 4–6 punti questi **KPI simulati** (non reali): 
- Fatturato: ${k.revenue ?? 'nd'}
- Budget ADV: ${k.budget ?? 'nd'}
- Canone Suite Digitale: ${k.fee ?? 'nd'}
- ROI: ${k.roi ?? 'nd'}%
- ROAS: ${k.roas ?? 'nd'}x
- CPL: ${k.cpl ?? 'nd'}
- CPA: ${k.cpa ?? 'nd'}
- Utile/Perdita: ${k.profit ?? 'nd'}

Usa il **condizionale** (“rientrerebbero”, “potrebbe”, “andrebbe”).
Se ROI/ROAS bassi: niente tutorial operativo, spiega che in call definiremmo **USP**, **posizionamento**, **pricing**, **margini** e ottimizzazioni end-to-end.
Ricorda i nostri **vantaggi CLOSETING** (marketing+vendite uniti).
Non inserire link nel testo; dì: “prenota dal bottone qui sotto 👇”.
${contextNote?('Contesto: '+contextNote):''}
`.trim();
    ask(prompt,{silent:true, meta:{kpi}});
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  // monta bubble
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
