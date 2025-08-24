/* public/sd-chat.js — Suite Digitale mini widget (brand #8C52FF) */
(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const BRAND   = '#8C52FF';        // colore principale
  const DARKBG  = '#0c0f1a';
  const PANEL   = '#121528';
  const TEXT    = '#e9ecff';
  const MUTED   = 'rgba(233,236,255,.65)';
  const GREEN   = '#2cd573';

  // ====== STYLE (non blocca il montaggio se già presente) ======
  (function ensureStyle(){
    if (document.getElementById('sdw-style')) return;
    const css = `
#sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;width:420px;max-width:calc(100vw - 32px);display:none}
#sdw-root.sdw-visible{display:block}
#sdw-panel{background:${PANEL};color:${TEXT};border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.40)}
#sdw-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
#sdw-title{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px}
#sdw-title .pfp{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:${BRAND}1a;color:${BRAND};border:1px solid ${BRAND}33}
#sdw-title .dot{width:8px;height:8px;border-radius:999px;background:${GREEN};box-shadow:0 0 0 2px ${PANEL}}
#sdw-close{background:transparent;border:0;color:${MUTED};cursor:pointer;font-size:20px;line-height:1;padding:4px;border-radius:8px}
#sdw-close:hover{background:rgba(255,255,255,.06);color:${TEXT}}

#sdw-body{height:420px;max-height:70vh;overflow:auto;padding:16px;background:${DARKBG}}
.msg{display:flex;margin:10px 0;gap:8px}
.msg .pfp{width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:${BRAND}1a;color:${BRAND};border:1px solid ${BRAND}33;flex:0 0 28px;margin-top:2px}
.bubble{max-width:80%;padding:12px 14px;border-radius:14px;line-height:1.45;white-space:pre-wrap}
.bubble h4{margin:0 0 6px;font-size:14px;font-weight:800;color:${TEXT}}
.bubble ul{margin:6px 0 0 18px}
.bubble p{margin:0 0 8px}
.ai  .bubble{background:#111427;border:1px solid rgba(255,255,255,.08);color:${TEXT}}
.me  {justify-content:flex-end}
.me  .bubble{background:${BRAND};color:#fff;border:0;border-top-right-radius:4px}
.ai  .bubble a{color:${BRAND};text-decoration:underline}
.me  .bubble a{color:#fff;text-decoration:underline}

#sdw-foot{padding:10px;background:${PANEL};border-top:1px solid rgba(255,255,255,.08)}
#sdw-cta{margin-bottom:10px;background:${BRAND};color:#fff;border:0;width:100%;border-radius:12px;padding:10px 12px;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px}
#sdw-cta:hover{filter:brightness(1.04)}
#sdw-inputwrap{display:flex;gap:8px}
#sdw-input{flex:1;background:#0f1220;border:1px solid rgba(255,255,255,.12);border-radius:12px;color:${TEXT};padding:11px 12px}
#sdw-send{background:${BRAND};border:0;color:#fff;border-radius:12px;padding:0 16px;min-width:72px;cursor:pointer;font-weight:700}
#sdw-send:hover{filter:brightness(1.05)}
#sdw-bubble{position:fixed;right:22px;bottom:22px;background:${BRAND};color:#fff;border:0;border-radius:999px;padding:12px 16px;box-shadow:0 10px 24px rgba(0,0,0,.3);cursor:pointer;display:none;z-index:999999;font-weight:800}
#sdw-bubble:hover{filter:brightness(1.05)}
.typing{opacity:.75;font-style:italic}
    `;
    const st = document.createElement('style');
    st.id='sdw-style';
    st.textContent = css;
    document.head.appendChild(st);
  })();

  // ====== SOUND (solo all’apertura) ======
  function ding(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type='sine'; o.frequency.value=880;
      g.gain.value=0.0001; o.connect(g); g.connect(ctx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.25);
      o.stop(ctx.currentTime+0.26);
    }catch(e){}
  }

  // ====== DOM refs ======
  let root, body, input, sendBtn, ctaBtn, typingEl;

  // ====== MOUNT ======
  function mount(){
    if (root) return;

    // floating bubble
    const fab = document.createElement('button');
    fab.id='sdw-bubble';
    fab.type='button';
    fab.textContent='Assistente AI';
    fab.onclick = () => open({autostart:false});
    document.body.appendChild(fab);
    fab.style.display='inline-flex';

    // panel
    root = document.createElement('div'); root.id='sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title">
            <span class="pfp">🤖</span>
            <span>Assistente AI</span>
            <span class="dot" title="Online"></span>
          </div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div id="sdw-foot">
          <button id="sdw-cta">Richiedi un’analisi gratuita 👉</button>
          <div id="sdw-inputwrap">
            <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo il budget, consigli)">
            <button id="sdw-send">Invia</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    body    = root.querySelector('#sdw-body');
    input   = root.querySelector('#sdw-input');
    sendBtn = root.querySelector('#sdw-send');
    ctaBtn  = root.querySelector('#sdw-cta');

    root.querySelector('#sdw-close').onclick = close;
    ctaBtn.onclick = () => window.open('https://www.suitedigitale.it/candidatura/', '_blank', 'noopener');

    const fire = () => {
      const v = (input.value||'').trim(); if(!v) return;
      input.value=''; ask(v);
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); fire(); } });

    // messaggio di benvenuto (AI)
    addAI(`Ciao! Per aiutarti davvero mi servirebbero i tuoi parametri. Compila il simulatore (tipo business e settore, clienti mensili, scontrino medio e margine) poi premi **Calcola la tua crescita**. Ti restituirei ROI/ROAS, budget e i punti da migliorare.`, true);
  }

  function showPanel(){ root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display='none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display='inline-flex'; }
  function scrollB(){ body.scrollTop = body.scrollHeight; }

  // ====== Messages ======
  function addRowHTML(side, html){
    const row = document.createElement('div'); row.className = 'msg '+side;
    if(side==='ai'){
      row.innerHTML = `<span class="pfp">🤖</span><div class="bubble">${html}</div>`;
    }else{
      row.innerHTML = `<div class="bubble">${html}</div>`;
    }
    body.appendChild(row); scrollB();
  }
  function md(txt){
    // minimale: **bold**, liste, linee, h4 (###)
    let t = (txt||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/^### (.+)$/gm,'<h4>$1</h4>')
      .replace(/^- (.+)$/gm,'<li>$1</li>')
      .replace(/\n{2,}/g,'\n\n')
      .replace(/\n/g,'<br>');
    // lista <li> → <ul>
    t = t.replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>');
    // linkify + fix candidatura
    t = t.replace(/https?:\/\/[^\s)]+/g,(m)=>{
      const clean = m.replace(/\)\]|\]|\)$/g,''); // pulizia eventuale markdown rotto
      return `<a href="${clean}" target="_blank" rel="noopener">${clean}</a>`;
    });
    // se dentro testo appare candidatura, mantieni il link corretto e visibile
    t = t.replace(/https:\/\/www\.suitedigitale\.it\/candidatura\/?(\))?/g,
      `<a href="https://www.suitedigitale.it/candidatura/" target="_blank" rel="noopener">https://www.suitedigitale.it/candidatura/</a>`);
    return t;
  }
  function addME(text){ addRowHTML('me', md(text)); }
  function addAI(text, first=false){
    addRowHTML('ai', md(text));
    if(first) scrollB();
  }
  function setTyping(on){
    if(on){
      typingEl = document.createElement('div');
      typingEl.className='msg ai';
      typingEl.innerHTML = `<span class="pfp">🤖</span><div class="bubble typing">Sta scrivendo…</div>`;
      body.appendChild(typingEl); scrollB();
    }else if(typingEl){
      typingEl.remove(); typingEl=null;
    }
  }

  // ====== KPI READER ======
  function numFromEuro(text){
    if(!text) return null;
    const m = text.replace(/\./g,'').replace(',', '.').match(/€\s*[-+]?\d+(\.\d+)?/);
    return m ? parseFloat(m[0].replace(/[€\s]/g,'')) : null;
  }
  function numFromPercent(text){
    if(!text) return null;
    const m = text.replace(',', '.').match(/[-+]?\d+(\.\d+)?\s*%/);
    return m ? parseFloat(m[0].replace('%','').trim()) : null;
  }
  function numFromX(text){
    if(!text) return null;
    const m = text.replace(',', '.').match(/[-+]?\d+(\.\d+)?\s*x/);
    return m ? parseFloat(m[0].replace('x','').trim()) : null;
  }
  function closestText(selector, needle){
    const all = Array.from(document.querySelectorAll(selector));
    const t = (needle||'').toLowerCase();
    return all.find(el => (el.innerText||'').toLowerCase().includes(t));
  }
  function readEuroByLabel(label){
    const el = closestText('section,div,li,span,p,article', label);
    if(!el) return null;
    // prova nello stesso blocco
    const block = el.closest('div,section,article') || el;
    const txt = block.innerText;
    return numFromEuro(txt);
  }
  function readPercentByLabel(label){
    const el = closestText('section,div,li,span,p,article', label);
    if(!el) return null;
    const block = el.closest('div,section,article') || el;
    const txt = block.innerText;
    return numFromPercent(txt);
  }
  function readXByLabel(label){
    const el = closestText('section,div,li,span,p,article', label);
    if(!el) return null;
    const block = el.closest('div,section,article') || el;
    const txt = block.innerText;
    return numFromX(txt);
  }
  function readChannel(){
    const el = closestText('label,div,span,p', 'a chi vendi') || closestText('div,span,p','B2B');
    const all = document.querySelectorAll('select,button,div,span');
    let v = '';
    Array.from(all).forEach(n=>{
      const tx=(n.innerText||'').toUpperCase();
      if(/B2B/.test(tx)) v='B2B';
      if(/B2C/.test(tx)) v='B2C';
    });
    return v || 'Non indicato';
  }
  function readSector(){
    const lab = closestText('label,div,span,p', 'Settore');
    if(!lab) {
      // prova a trovare il valore selezionato per settore
      const s = Array.from(document.querySelectorAll('select option'))
        .find(o => (o.selected && (o.innerText||'').trim().length>1));
      return s ? s.innerText.trim() : 'Non indicato';
    }
    const block = lab.closest('div,section,article')||lab;
    const selected = block.querySelector('option[selected], .selected, [aria-selected="true"]');
    if(selected) return (selected.innerText||selected.textContent||'').trim();
    // fallback: il testo dentro il blocco con capitalizzazione
    return (block.innerText||'').split('\n').map(s=>s.trim()).filter(Boolean)[1] || 'Non indicato';
  }

  function readKPIs(){
    // Etichette robustissime
    const fatturato = readEuroByLabel('Fatturato stimato')      || readEuroByLabel('Fatturato');
    const budget    = readEuroByLabel('Budget ADV mensile')     || readEuroByLabel('Budget');
    const canone    = readEuroByLabel('Canone Suite Digitale')  || readEuroByLabel('Canone');

    const roi       = readPercentByLabel('ROI previsionale')    || readPercentByLabel('ROI');
    const roas      = readXByLabel('ROAS stimato')              || readXByLabel('ROAS');

    // Utile o Perdita
    let utile = readEuroByLabel('Utile mensile');
    if(utile==null){
      const perdita = readEuroByLabel('Perdita mensile');
      utile = (perdita!=null)? (-Math.abs(perdita)) : null;
    }

    const channel = readChannel();
    const sector  = readSector();

    return { fatturato, budget, canone, roi, roas, utile, channel, sector };
  }

  // ====== PROMPTS ======
  function buildKpiPrompt(k){
    const clean = (v,unit)=> (v==null?'ND': (unit==='€'?`€ ${v.toLocaleString('it-IT')}`: unit==='%'? `${v.toLocaleString('it-IT')}%` : `${v}`));
    return (
`Analizza questi KPI *simulati* e rispondi **al condizionale** in 4–6 punti, brevi ma solidi, con titoletti in **grassetto**:
- ROI: ${clean(k.roi,'%')}
- ROAS: ${clean(k.roas,'x')}
- Fatturato: ${clean(k.fatturato,'€')}
- Budget ADV: ${clean(k.budget,'€')}
- Canone Suite Digitale: ${clean(k.canone,'€')}
- Utile mensile: ${clean(k.utile,'€')}
- Canale: ${k.channel}
- Settore: ${k.sector}

Linee guida IMPORTANTI:
• Spiega i numeri come proiezioni del simulatore: “otterresti, rientrerebbero, si genererebbe…”.
• Niente tutorial operativi. Valorizza che **Suite Digitale** unirebbe marketing + vendite (strategist, media buyer, CRM specialist, setter/chatter).
• Evidenzia perché *un team integrato* migliorerebbe coerenza e performance.
• Se i KPI risultassero critici, non colpevolizzare: parlane con energia e prospettiva.
• Chiudi SEMPRE con invito alla CTA (senza incollare il link raw nel testo: c’è il bottone in basso).`
    );
  }

  // ====== ANALYSE + ASK ======
  async function analyseKPIsSilently(){
    const k = readKPIs();
    // se almeno ROI o ROAS o Budget c'è → procedi
    const hasAny = [k.fatturato,k.budget,k.canone,k.roi,k.roas,k.utile].some(v=>v!=null);
    const prompt = hasAny
      ? buildKpiPrompt(k)
      : `Non riesco a leggere KPI dal DOM. Parla al condizionale e guida comunque: chiederei all’utente di completare il simulatore (tipo business, settore, clienti/mese, scontrino medio, margine) e premere **Calcola la tua crescita**. Ricorda sempre il valore del team integrato marketing+vendite e la CTA conclusiva.`;
    await ask(prompt, {silent:true});
  }

  async function ask(text, opts={}){
    // echo utente (se non silent)
    if(!opts.silent) addME(text);
    setTyping(true);
    try{
      const r = await fetch(ENDPOINT, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt: text })
      });
      const j = await r.json().catch(()=>({}));
      const out = j.text || j.message || 'Non ho una risposta al momento.';
      setTyping(false);
      addAI(out);
    }catch(e){
      setTyping(false);
      // Fallback locale (mai “assistant alive”)
      addAI(`Non riuscirei a contattare il server in questo momento. In ogni caso, potrei dirti che con un team integrato di strategist, media buyer, CRM specialist e setter telefonici **otterresti** una gestione coordinata dalla campagna alla vendita, evitando dispersioni e tempi morti. Se vuoi, clicca la CTA qui sotto per richiedere un’analisi gratuita: ti mostreremmo dove **potresti** migliorare ROI/ROAS e come impostare una macchina di crescita efficace.`);
    }
  }

  // ====== API ======
  function open(opts={}){
    mount(); showPanel(); ding(); // suono solo all’apertura
    if(opts.autostart) ask('Ciao! Se compili il simulatore, ti restituirei un’analisi pronta dei KPI e i prossimi step più intelligenti per crescere.', {silent:true});
  }
  function close(){ hidePanel(); }
  async function analyse(){ await analyseKPIsSilently(); }

  window.SuiteAssistantChat = { open, close, ask, analyse };

  // monta subito
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  console.log('[SD] sd-chat.js pronto');
})();
