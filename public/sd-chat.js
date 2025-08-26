/* public/sd-chat.js — bubble + UI + invii “silenti” + link cliccabili + stile messaggi */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL = 'https://www.suitedigitale.it/candidatura/';

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
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8ee;padding:10px;outline:none}
  #sdw-input:focus{border-color:var(--sd-accent);box-shadow:0 0 0 3px var(--sd-ring)}
  #sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-cta{position:sticky;bottom:0;margin:8px 0;background:#ffece6;color:#1a1b2e;border:1px solid #ffd1c4;border-radius:12px;padding:10px 12px;text-align:center;font-weight:800;cursor:pointer}
  #sdw-cta:hover{filter:brightness(1.02)}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  a.sdw-link{color:#fff;text-decoration:underline}
  a.sdw-link:hover{opacity:.9}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== tiny helpers ======
  const toHTML = (txt) => {
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

    // Bullet "- testo" -> lista rapida (solo se presente almeno un "- " a inizio linea)
    if (/^- /m.test(h)) {
      h = '<ul>'+h.replace(/^- (.+)$/gm,'<li>$1</li>')+'</ul>';
    }

    // A capo
    return h.replace(/\n/g,'<br/>');
  };

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn;

  function mount() {
    if (root) return;
    // Bubble pronto
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => open({ autostart: false });
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
      input.value = '';
      ask(v, {silent:false});
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
  }
  function showPanel(){ root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'inline-flex'; }

  function addRow(role, textHTML) {
    const row = document.createElement('div'); row.className = 'sdw-row ' + role;
    const msg = document.createElement('div'); msg.className = 'sdw-msg'; msg.innerHTML = textHTML;
    row.appendChild(msg); body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  // ====== Backend call (silente possibile) ======
  async function ask(prompt, opts={silent:false, meta:null}) {
    if (!opts.silent) addRow('me', toHTML(prompt));
    addRow('ai', toHTML('⌛ Sto analizzando…'));

    // Prompt “specialista” per ancorare toni e USP
    const CONTEXT = `
Sei l’Assistente AI di **Suite Digitale**. Tono: cordiale, professionale, motivante.
Obiettivo: aiutare l'utente a capire KPI simulati e guidarlo verso una **Consulenza Gratuita**.
Ricorda i benefici: uniamo Marketing & Vendite in un unico team (strategist, media buyer, venditori), 
Piattaforma all-in-one, funnel, CRM, automazioni, lead generation, presa appuntamenti: tutto coordinato.
Se la domanda non è pertinente al marketing/servizi Suite Digitale, spiega che sei specializzato e invita a scriverci: 
**marketing@suitedigitale.it** o **+39 351 509 4722**.
Nelle risposte: usa **grassetto** per concetti chiave, elenco numerato o puntato se aiuta. A fine risposta chiudi con un invito alla consulenza:
“**Vuoi andare a fondo con il tuo caso?** Prenota qui 👉 ${CTA_URL}”.
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
      // replace last “⌛” with answer
      body.lastChild.querySelector('.sdw-msg').innerHTML = toHTML(out);
    } catch (e) {
      body.lastChild.querySelector('.sdw-msg').innerHTML = toHTML(
        `Non riesco a contattare il server ora. Intanto ti aiuto comunque: 
**Vuoi capire ROI/ROAS e cosa fare dopo?** Posso darti indicazioni generali e prepararti alla **Consulenza Gratuita** 👉 ${CTA_URL}`
      );
    }
  }

  // ====== API pubbliche per i trigger ======
  function open(opts={}) {
    mount(); showPanel();
    // benvenuto SOLO se non siamo in analisi KPI
    if (opts.autostart) {
      ask(
        `Ciao! Per aiutarti davvero mi servono i tuoi parametri. Compila il simulatore (tipo business e settore, clienti mensili, scontrino medio e margine) poi premi **Calcola la tua crescita**. Ti restituirò ROI/ROAS, budget e i punti da migliorare.`,
        {silent:false}
      );
    }
  }
  function close(){ hidePanel(); }

  // richiamato dai trigger dopo il click su “Calcola”
  function analyseKPIsSilently(kpi, contextNote) {
    mount(); showPanel();
    const k = kpi || {};
    // prompt “silente” (non compare come messaggio utente)
    const prompt = `
Analizza questi KPI simulati (non sono risultati reali ma una stima): 
ROI: ${k.roi ?? 'nd'} | ROAS: ${k.roas ?? 'nd'} | CPL: ${k.cpl ?? 'nd'} | CPA: ${k.cpa ?? 'nd'} | Budget: ${k.budget ?? 'nd'} | Fatturato: ${k.revenue ?? 'nd'} | Utile/Perdita: ${k.profit ?? 'nd'}.
${contextNote ? 'Contesto: ' + contextNote : ''}

Dammi una valutazione in 4–6 punti al **condizionale** con:
- interpretazione rapida e concreta;
- perché è importante un team integrato marketing+vendite; 
- quando ROI/ROAS sono deboli: invito a prenotare la consulenza per rimettere in rotta;
- se i numeri sono buoni: spiegare come si potrebbe scalare con strategia e controllo KPI;
Chiudi SEMPRE con “**Vuoi andare a fondo con il tuo caso?** Prenota qui 👉 ${CTA_URL}”.
`.trim();
    ask(prompt, {silent:true, meta:{kpi}});
  }

  window.SuiteAssistantChat = { open, close, ask, analyseKPIsSilently };

  // bubble sempre pronto
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
