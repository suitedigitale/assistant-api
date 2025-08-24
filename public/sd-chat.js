/* public/sd-chat.js — Suite Digitale: chat + KPI analyzer
   - Link sempre cliccabili e visibili
   - CTA verde “Richiedi un’analisi gratuita 👉”
   - Analisi KPI in CONDIZIONALE (simulatore)
   - Niente messaggi “interni” mostrati all’utente
   - Suono apertura + suono “sta scrivendo…”
*/
(function () {
  // ========= CONFIG =========
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL = 'https://www.suitedigitale.it/candidatura/';
  const WELCOME_AI = `
<b>Ciao!</b> Per aiutarti davvero mi servono i tuoi parametri. 
Compila il simulatore (tipo business & settore, clienti mensili, scontrino medio e margine) poi premi <b>Calcola la tua crescita</b>. 
Ti restituirei ROI/ROAS, budget e i punti da migliorare.`;

  // ========= STYLE =========
  if (document.getElementById('sdw-style')) return;
  const css = `
#sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:380px;max-width:calc(100vw - 32px);display:none}
#sdw-root.sdw-visible{display:block}
#sdw-panel{background:#0c1020;color:#e8ecff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 70px rgba(0,0,0,.45)}
#sdw-head{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
#sdw-title{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px}
#sdw-title .dot{width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
#sdw-close{background:transparent;border:0;color:#e8ecff;opacity:.8;cursor:pointer;font-size:18px}
#sdw-body{height:420px;max-height:70vh;overflow:auto;padding:14px 12px 120px;background:#0a0d1a}
#sdw-body .msg{display:flex;gap:8px;margin:10px 0;align-items:flex-end}
#sdw-body .msg .avatar{font-size:18px;opacity:.9}
#sdw-body .bubble{max-width:80%;padding:14px 16px;border-radius:16px;line-height:1.45}
#sdw-body .bubble p{margin:0 0 8px}
#sdw-body .bubble p:last-child{margin:0}
#sdw-body .bubble ul{margin:6px 0 0 18px}
#sdw-body .bubble a{color:#7dd3fc !important;text-decoration:underline}
#sdw-body .ai .bubble{background:#141a34;border:1px solid rgba(255,255,255,.08)}
#sdw-body .me{justify-content:flex-end}
#sdw-body .me .bubble{background:#233bff;color:#fff;border:0}
#sdw-foot{position:absolute;left:0;right:0;bottom:0;padding:10px 10px 12px;display:flex;flex-direction:column;gap:10px;background:linear-gradient(180deg,rgba(12,16,32,0) 0,#0c1020 22px,#0c1020 100%)}
#sdw-cta{background:#16a34a;color:#fff;border:0;border-radius:12px;padding:12px 14px;font-weight:700;cursor:pointer;display:flex;justify-content:center;gap:10px}
#sdw-cta:hover{background:#128a3f}
#sdw-inputrow{display:flex;gap:8px}
#sdw-input{flex:1;background:#0f1530;border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#e8ecff;padding:12px 12px}
#sdw-send{background:#233bff;border:0;color:#fff;border-radius:12px;padding:0 14px;min-width:74px;cursor:pointer}
#sdw-bubble{position:fixed;right:22px;bottom:22px;background:#233bff;color:#fff;border:0;border-radius:999px;padding:11px 18px;box-shadow:0 10px 26px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
.typing{opacity:.8;font-style:italic}
.small{font-size:13px}
.h{font-weight:800}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ========= UI =========
  let root, body, input, sendBtn, ctaBtn, typingRow;
  let typingTicker = null;

  function mount() {
    if (root) return;

    // Bubble
    const bubbleBtn = document.createElement('button');
    bubbleBtn.id = 'sdw-bubble';
    bubbleBtn.type = 'button';
    bubbleBtn.innerHTML = '🤖 Assistente AI';
    bubbleBtn.onclick = () => open({ autostart:false });
    document.body.appendChild(bubbleBtn);
    bubbleBtn.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title"><span class="avatar">🤖</span> Assistente AI <span class="dot" title="Online"></span></div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div id="sdw-foot">
          <button id="sdw-cta">Richiedi un’analisi gratuita 👉</button>
          <div id="sdw-inputrow">
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

    root.querySelector('#sdw-close').onclick = () => close();
    ctaBtn.onclick = () => window.open(CTA_URL, '_blank', 'noopener');

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = ''; ask(v);
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); }});
  }

  function showPanel(){
    root.classList.add('sdw-visible');
    document.getElementById('sdw-bubble').style.display = 'none';
    playOpenSound();
  }
  function hidePanel(){
    root.classList.remove('sdw-visible');
    document.getElementById('sdw-bubble').style.display = 'inline-flex';
  }

  function addRow(from, html, asHtml=true){
    // from: 'ai' | 'me' | 'sys'
    const row = document.createElement('div');
    row.className = 'msg ' + from;
    row.innerHTML = `
      ${from==='ai' ? '<span class="avatar">🤖</span>' : ''}
      <div class="bubble">${asHtml ? html : escapeHtml(html)}</div>
    `;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  function escapeHtml(s){
    return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  }

  // ========= SOUND =========
  let audioCtx = null;
  function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

  function playOpenSound(){
    try{
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 740;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.16);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + 0.18);
    }catch(_){}
  }
  function startTypingSound(){
    try{
      ensureAudio();
      if(typingTicker) return;
      // piccolo beep ogni ~900ms finché “sta scrivendo…”
      typingTicker = setInterval(() => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type='triangle'; o.frequency.value=520;
        g.gain.setValueAtTime(0.0001,audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.04,audioCtx.currentTime+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.09);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime+0.1);
      }, 900);
    }catch(_){}
  }
  function stopTypingSound(){
    if(typingTicker){ clearInterval(typingTicker); typingTicker=null; }
  }

  // ========= HELPERS =========
  function postprocessAI(html){
    // 1) trasforma eventuali URL in <a>
    html = html.replace(/(https?:\/\/[^\s)]+)(?=[)\s]|$)/g, m => {
      return `<a href="${m}" target="_blank" rel="noopener">${m}</a>`;
    });
    // 2) niente “doppia” sintassi markdown tipo [url](url)
    html = html.replace(/\[https?:\/\/[^\]]+\]\((https?:\/\/[^\)]+)\)/g, (_m, p1) => {
      return `<a href="${p1}" target="_blank" rel="noopener">${p1}</a>`;
    });
    return html;
  }

  function aiTyping(){
    if(typingRow) return;
    typingRow = addRow('ai', `<span class="typing">Sta scrivendo…</span>`);
    startTypingSound();
  }
  function aiTyped(html){
    stopTypingSound();
    if(typingRow){
      typingRow.querySelector('.bubble').innerHTML = html;
      typingRow = null;
      body.scrollTop = body.scrollHeight;
    }else{
      addRow('ai', html);
    }
  }

  // ========= KPI PARSER (tollerante) =========
  const IT = (s)=>s?.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
  const numRE = /-?\d{1,3}(?:[\.\s]\d{3})*(?:[\,\.]\d+)?|-?\d+(?:[\,\.]\d+)?/;

  function parseNumber(txt){
    if(!txt) return null;
    const m = String(txt).match(numRE);
    if(!m) return null;
    let val = m[0].replace(/\s/g,'');
    // formati italiani: 1.590 -> 1590 | 0,2 -> 0.2
    if (/,/.test(val) && /\./.test(val)) {
      // "1.590,25"
      val = val.replace(/\./g,'').replace(',', '.');
    } else if (/,/.test(val)) {
      val = val.replace(',', '.');
    } else {
      val = val.replace(/\./g,'');
    }
    const n = Number(val);
    return isFinite(n) ? n : null;
  }

  function findValueNear(labelCandidates){
    const nodes = Array.from(document.querySelectorAll('div,span,li,strong,p,b,em,small'));
    const cand = nodes.find(n => labelCandidates.some(L => IT(n.textContent||'').includes(IT(L))));
    if(!cand) return null;
    // prova lo stesso nodo
    let n = parseNumber(cand.textContent);
    if(n!==null) return n;
    // prova parent
    if(cand.parentElement){
      n = parseNumber(cand.parentElement.textContent);
      if(n!==null) return n;
    }
    // prova sibling successivo
    if(cand.nextElementSibling){
      n = parseNumber(cand.nextElementSibling.textContent);
      if(n!==null) return n;
    }
    // fallback: risali un po’ e prendi il primo numero importante
    let p = cand.parentElement;
    for(let i=0;i<3 && p;i++, p=p.parentElement){
      n = parseNumber(p.textContent);
      if(n!==null) return n;
    }
    return null;
  }

  function readKPIsFromPage(){
    const k = {
      revenue:     findValueNear(['Fatturato stimato','Fatturato','Ricavi']),
      advBudget:   findValueNear(['Budget ADV mensile','Budget ADV','Budget']),
      canone:      findValueNear(['Canone Suite Digitale','Canone']),
      roi:         findValueNear(['ROI previsionale','ROI']),
      roas:        findValueNear(['ROAS stimato','ROAS']),
      profit:      findValueNear(['Perdita mensile','Utile mensile','Perdita','Utile'])
    };
    // tip business & settore (se presenti nel simulatore)
    const typeNode = Array.from(document.querySelectorAll('label,div,span,button')).find(n => IT(n.textContent||'').includes('a chi vendi') || IT(n.textContent||'').includes('tipo business'));
    const sectorNode = Array.from(document.querySelectorAll('label,div,span,button')).find(n => IT(n.textContent||'').includes('settore'));
    const sel = (el)=> el && el.parentElement && el.parentElement.querySelector('select,[role="combobox"],.select,.value');
    const typeVal = sel(typeNode)?.textContent || '';
    const sectorVal = sel(sectorNode)?.textContent || '';

    return { ...k, type: typeVal.trim(), sector: sectorVal.trim() };
  }

  // ========= AI ASK (generico) =========
  async function ask(userText){
    addRow('me', escapeHtml(userText), false);
    aiTyping();
    try{
      const r = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt: userText })
      });
      const j = await r.json().catch(()=> ({}));
      const html = postprocessAI(j.text || j.message || 'OK');
      aiTyped(html + footerCTA());
    }catch(e){
      aiTyped(`Ho avuto un piccolo intoppo tecnico. Intanto posso spiegarti come lavorerebbe il nostro team integrato marketing + vendite. ${footerCTA()}`);
    }
  }

  function footerCTA(){
    return `<div class="small" style="margin-top:10px"><a href="${CTA_URL}" target="_blank" rel="noopener"><b>Richiedi un’analisi gratuita 👉</b></a></div>`;
  }

  // ========= KPI ANALYSIS (silenziosa: non mostra l’input tecnico) =========
  async function analyseKPIsSilently(){
    const k = readKPIsFromPage();
    // serve almeno ROI o ROAS o Revenue+Budget per dare un senso
    const enough = [k.roi, k.roas, k.revenue, k.advBudget, k.profit].some(v => typeof v === 'number' && !Number.isNaN(v));
    if(!enough) return false;

    const ctx = [
      k.type ? `• Tipo: ${k.type}` : '',
      k.sector ? `• Settore: ${k.sector}` : '',
      (k.revenue!=null)   ? `• Fatturato simulato: ${k.revenue}` : '',
      (k.advBudget!=null) ? `• Budget ADV simulato: ${k.advBudget}` : '',
      (k.canone!=null)    ? `• Canone piattaforma simulato: ${k.canone}` : '',
      (k.roi!=null)       ? `• ROI simulato: ${k.roi}` : '',
      (k.roas!=null)      ? `• ROAS simulato: ${k.roas}` : '',
      (k.profit!=null)    ? `• Utile/Perdita stimato: ${k.profit}` : ''
    ].filter(Boolean).join('\n');

    const prompt = `
Sei l'assistente di Suite Digitale.
Parla in <b>ITALIANO</b>, tono <b>amichevole ma tecnico</b>, e usa sempre il <b>CONDIZIONALE</b> perché sono proiezioni del simulatore.

Contesto utente:
${ctx}

Obiettivo:
- Offriresti una <b>valutazione sintetica</b> (4–6 punti massimi) dei KPI <b>simulati</b>.
- Non daresti tutorial operativi: spiega che <b>durante la consulenza gratuita</b> analizzeremmo <i>pricing, margini, posizionamento, funnel, CRM e campagne</i> con team integrato (strategist, media buyer, CRM specialist e setter telefonici).
- Se i numeri fossero negativi, incoraggeresti con empatia e valorizzeresti il supporto del team.
- Se i numeri fossero positivi, sottolineeresti come potremmo scalare in modo controllato e multi-canale.
- Evita di incollare URL in chiaro (la CTA la aggiungo io).
- Quando parli di canali/funnel, inquadra a livello alto (lo valuteremmo in consulenza), non far fare "faidate" all’utente.
- Formatta con titoletti in <b>grassetto</b> ed elenchi quando utile.

Rispondi in HTML (p, ul/li, b).`;

    aiTyping();
    try{
      const r = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt })
      });
      const j = await r.json().catch(()=> ({}));
      const html = postprocessAI(j.text || j.message || 'Pronto!');
      aiTyped(html + footerCTA());
      return true;
    }catch(_){
      aiTyped(`Posso darti un primo quadro generale in base al settore e al tipo di business, poi in call valuteremmo nel dettaglio pricing, margini e funnel migliori. ${footerCTA()}`);
      return true;
    }
  }

  // ========= API =========
  function open(opts={}){
    mount(); showPanel();
    if(opts.autostart){
      // Benvenuto AI
      addRow('ai', `<p>${WELCOME_AI}</p>`);
    }
  }
  function close(){ hidePanel(); }

  // Espongo per i trigger esterni
  window.SuiteAssistantChat = {
    open, close,
    ask: (t)=>{ mount(); showPanel(); ask(t); },
    analyse: ()=>{ mount(); showPanel(); return analyseKPIsSilently(); }
  };

  // Bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else { mount(); }

  console.log('[SD] sd-chat.js pronto');
})();
