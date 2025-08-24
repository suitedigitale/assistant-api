/* public/sd-chat.js — Suite Digitale widget (brand #8C52FF) */
(function () {
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const BRAND   = '#8C52FF';
  const DARKBG  = '#0c0f1a';
  const PANEL   = '#121528';
  const TEXT    = '#e9ecff';
  const MUTED   = 'rgba(233,236,255,.65)';
  const GREEN   = '#2cd573';

  // --- CSS (robusto) --------------------------------------------------------
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

  // --- SOUND (solo apertura) ------------------------------------------------
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

  // --- DOM refs -------------------------------------------------------------
  let root, body, input, sendBtn, ctaBtn, typingEl;

  // --- MOUNT ---------------------------------------------------------------
  function mount(){
    if (root) return;

    const fab = document.createElement('button');
    fab.id='sdw-bubble'; fab.type='button'; fab.textContent='Assistente AI';
    fab.onclick = () => open({autostart:false});
    document.body.appendChild(fab);
    fab.style.display='inline-flex';

    root = document.createElement('div'); root.id='sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title">
            <span class="pfp">🤖</span><span>Assistente AI</span><span class="dot" title="Online"></span>
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
      </div>`;
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

    addAI(`Ciao! Per aiutarti davvero mi servirebbero i tuoi parametri. Compilando il simulatore e premendo **Calcola la tua crescita**, ti restituirei un’analisi dei KPI *simulati* (ROI/ROAS, budget, utile) e i prossimi step.`, true);
  }

  function showPanel(){ root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display='none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display='inline-flex'; }
  function scrollB(){ body.scrollTop = body.scrollHeight; }

  // --- messages ------------------------------------------------------------
  function md(t){
    let s = (t||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/^### (.+)$/gm,'<h4>$1</h4>')
      .replace(/^- (.+)$/gm,'<li>$1</li>')
      .replace(/\n{2,}/g,'\n\n').replace(/\n/g,'<br>');
    s = s.replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>');
    s = s.replace(/https?:\/\/[^\s)]+/g,(m)=>{
      const clean = m.replace(/\)\]|\]|\)$/g,'');
      return `<a href="${clean}" target="_blank" rel="noopener">${clean}</a>`;
    });
    s = s.replace(/https:\/\/www\.suitedigitale\.it\/candidatura\/?(\))?/g,
      `<a href="https://www.suitedigitale.it/candidatura/" target="_blank" rel="noopener">https://www.suitedigitale.it/candidatura/</a>`);
    return s;
  }
  function addRow(side, html){
    const row = document.createElement('div'); row.className='msg '+side;
    if(side==='ai'){
      row.innerHTML = `<span class="pfp">🤖</span><div class="bubble">${html}</div>`;
    }else{
      row.innerHTML = `<div class="bubble">${html}</div>`;
    }
    body.appendChild(row); scrollB();
  }
  function addME(t){ addRow('me', md(t)); }
  function addAI(t,first){ addRow('ai', md(t)); if(first) scrollB(); }

  function setTyping(on){
    if(on){
      if(typingEl) return;
      typingEl = document.createElement('div');
      typingEl.className='msg ai';
      typingEl.innerHTML = `<span class="pfp">🤖</span><div class="bubble typing">Sta scrivendo…</div>`;
      body.appendChild(typingEl); scrollB();
    }else if(typingEl){ typingEl.remove(); typingEl=null; }
  }

  // --- KPI reader (tollerante) ---------------------------------------------
  function euroIn(txt){ if(!txt) return null; const m = txt.replace(/\./g,'').replace(',', '.').match(/€\s*[-+]?\d+(\.\d+)?/); return m?parseFloat(m[0].replace(/[€\s]/g,'')):null; }
  function percIn(txt){ if(!txt) return null; const m = txt.replace(',', '.').match(/[-+]?\d+(\.\d+)?\s*%/); return m?parseFloat(m[0].replace('%','').trim()):null; }
  function xIn(txt){ if(!txt) return null; const m = txt.replace(',', '.').match(/[-+]?\d+(\.\d+)?\s*x/); return m?parseFloat(m[0].replace('x','').trim()):null; }
  function byTxt(sel,needle){ const t=(needle||'').toLowerCase(); return Array.from(document.querySelectorAll(sel)).find(el=> (el.innerText||'').toLowerCase().includes(t)); }
  function readEuro(label){ const el = byTxt('section,div,li,span,p,article', label); if(!el) return null; const b=el.closest('div,section,article')||el; return euroIn(b.innerText); }
  function readPerc(label){ const el = byTxt('section,div,li,span,p,article', label); if(!el) return null; const b=el.closest('div,section,article')||el; return percIn(b.innerText); }
  function readX(label){ const el = byTxt('section,div,li,span,p,article', label); if(!el) return null; const b=el.closest('div,section,article')||el; return xIn(b.innerText); }
  function readChannel(){
    const all = Array.from(document.querySelectorAll('select,button,div,span'));
    let v=''; all.forEach(n=>{ const tx=(n.innerText||'').toUpperCase(); if(/B2B/.test(tx)) v='B2B'; if(/B2C/.test(tx)) v='B2C'; });
    return v || 'Non indicato';
  }
  function readSector(){
    const label = byTxt('label,div,span,p','Settore');
    if(!label){
      const opt = Array.from(document.querySelectorAll('select option')).find(o=>o.selected);
      return opt? (opt.innerText||'').trim() : 'Non indicato';
    }
    const block = label.closest('div,section,article')||label;
    const chosen = block.querySelector('option[selected], .selected, [aria-selected="true"]');
    return chosen? (chosen.innerText||'').trim() : 'Non indicato';
  }
  function readKPIs(){
    const fatturato = readEuro('Fatturato stimato')     || readEuro('Fatturato');
    const budget    = readEuro('Budget ADV mensile')    || readEuro('Budget');
    const canone    = readEuro('Canone Suite Digitale') || readEuro('Canone');
    const roi       = readPerc('ROI previsionale')      || readPerc('ROI');
    const roas      = readX('ROAS stimato')             || readX('ROAS');
    let utile       = readEuro('Utile mensile');
    if(utile==null){ const perd = readEuro('Perdita mensile'); utile = (perd!=null? -Math.abs(perd): null); }
    const channel = readChannel();
    const sector  = readSector();
    return { fatturato,budget,canone,roi,roas,utile,channel,sector };
  }
  function kpiPrompt(k){
    const c = (v,u)=> v==null?'ND': (u==='€'?`€ ${v.toLocaleString('it-IT')}`: u==='%'?`${v.toLocaleString('it-IT')}%`:`${v}`);
    return `Analizza KPI *simulati* e parla **al condizionale**, 4–6 punti con titoletti in **grassetto**:
- ROI: ${c(k.roi,'%')}
- ROAS: ${c(k.roas,'x')}
- Fatturato: ${c(k.fatturato,'€')}
- Budget ADV: ${c(k.budget,'€')}
- Canone Suite Digitale: ${c(k.canone,'€')}
- Utile mensile: ${c(k.utile,'€')}
- Canale: ${k.channel}
- Settore: ${k.sector}

Ricorda: niente tutorial esecutivi; valorizza **team integrato** (strategist, media buyer, CRM specialist, setter/chatter).  
Chiudi invitando la CTA in basso (non incollare il link).`;
  }

  // --- ASK ------------------------------------------------------------------
  async function ask(text, opts={}){
    if(!opts.silent) addME(text);
    setTyping(true);
    try{
      const r = await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'analysis',prompt:text})});
      const j = await r.json().catch(()=>({}));
      setTyping(false);
      addAI(j.text || j.message || 'Non ho una risposta al momento.');
    }catch(e){
      setTyping(false);
      addAI('Al momento non riuscirei a contattare il server. In ogni caso **potresti** ottenere risultati migliori con un team integrato marketing+vendite. Se vuoi, usa la CTA qui sotto per un’analisi gratuita.');
    }
  }
  async function analyseKPIsSilently(){
    try{
      const k = readKPIs();
      const has = [k.fatturato,k.budget,k.canone,k.roi,k.roas,k.utile].some(v=>v!=null);
      const p = has ? kpiPrompt(k)
        : 'Non leggo KPI. Chiederei di completare il simulatore e premere **Calcola la tua crescita**. Poi **potrei** analizzare le proiezioni e proporre i prossimi step con il nostro team integrato. (Chiudi con invito alla CTA).';
      await ask(p,{silent:true});
    }catch(e){
      await ask('Parlerei al condizionale e inviterei a completare il simulatore, poi CTA.',{silent:true});
    }
  }

  // --- API ------------------------------------------------------------------
  function open(opts={}){ mount(); showPanel(); try{ding();}catch(e){} if(opts.autostart){ ask('Se completi il simulatore, ti restituirei subito un’analisi KPI.',{silent:true}); } }
  function close(){ hidePanel(); }
  async function analyse(){ await analyseKPIsSilently(); }

  window.SuiteAssistantChat = { open, close, ask, analyse };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  console.log('[SD] sd-chat.js pronto');
})();
