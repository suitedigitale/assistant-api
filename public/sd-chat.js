(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant'; // se cambi dominio Vercel, aggiorna qui

  // Prova a leggere i KPI dal DOM (aggiungi/ordina i selettori se serve)
  const KPI_SELECTORS = {
    roi:    ['[data-kpi="roi"]', '.kpi-roi', '#roiValue', '.tag-roi', '.kpi__roi', '.sd-roi'],
    roas:   ['[data-kpi="roas"]', '.kpi-roas', '#roasValue', '.kpi__roas', '.sd-roas'],
    budget: ['[data-kpi="budget"]', '.kpi-budget', '#budgetValue', '.kpi__budget', '.sd-budget'],
    cpl:    ['[data-kpi="cpl"]', '.kpi-cpl', '#cplValue', '.kpi__cpl', '.sd-cpl']
  };

  // ====== CSS (bubbles + header + CTA) ======
  if (document.getElementById('sdw-style')) return;
  const css =
    '#sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:380px;max-width:calc(100vw - 32px);display:none}' +
    '#sdw-root.sdw-visible{display:block}' +
    '#sdw-panel{background:#0b0c10;color:#e6e8ee;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '#sdw-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '#sdw-title{display:flex;gap:8px;align-items:center;font-weight:700;font-size:14px}' +
    '.sdw-dot{width:8px;height:8px;border-radius:999px;background:#2bd77f;box-shadow:0 0 0 3px rgba(43,215,127,.15)}' +
    '#sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}' +
    '#sdw-body{height:360px;max-height:60vh;overflow:auto;padding:12px;background:#0b0c10}' +
    '.sdw-msg{display:flex;margin:10px 0;gap:8px;max-width:85%}' +
    '.sdw-msg.ai{justify-content:flex-start}' +
    '.sdw-msg.me{justify-content:flex-end;margin-left:auto}' +
    '.sdw-bubble{padding:10px 12px;border-radius:12px;line-height:1.35;font-size:14px;white-space:pre-wrap}' +
    '.sdw-bubble.ai{background:#14172b;color:#e6e8ee;border:1px solid rgba(255,255,255,.06);border-top-left-radius:4px}' +
    '.sdw-bubble.me{background:#7b5cff;border:0;color:#fff;border-top-right-radius:4px}' +
    '.sdw-avatar{width:24px;height:24px;flex:0 0 24px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:#14172b}' +
    '#sdw-foot{display:flex;flex-direction:column;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:#111420}' +
    '#sdw-cta{background:#1b213d;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;cursor:pointer;font-size:13px;text-align:center}' +
    '#sdw-cta:hover{background:#21284d}' +
    '#sdw-row-input{display:flex;gap:8px}' +
    '#sdw-input{flex:1;background:#0f1220;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#e6e8ee;padding:10px}' +
    '#sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}' +
    '#sdw-bubble-btn{position:fixed;right:22px;bottom:22px;background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:10px 14px;box-shadow:0 8px 20px rgba(0,0,0,.3);cursor:pointer;display:none;z-index:999999}';
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn;

  function mount() {
    if (root) return;

    // Bubble button (apri/chiudi)
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble-btn';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente strategico';
    bubble.onclick = () => open({ autostart: false });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML =
      '<div id="sdw-panel">' +
      '  <div id="sdw-head">' +
      '    <div id="sdw-title"><span class="sdw-avatar">🤖</span>Assistente AI <span class="sdw-dot" title="Online"></span></div>' +
      '    <button id="sdw-close" aria-label="Chiudi">×</button>' +
      '  </div>' +
      '  <div id="sdw-body"></div>' +
      '  <div id="sdw-foot">' +
      '    <a id="sdw-cta" href="https://www.suitedigitale.it/candidatura/" target="_blank" rel="noopener">Richiedi un’analisi gratuita 👉</a>' +
      '    <div id="sdw-row-input">' +
      '      <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo il budget, consigli)" />' +
      '      <button id="sdw-send">Invia</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(root);

    body    = root.querySelector('#sdw-body');
    input   = root.querySelector('#sdw-input');
    sendBtn = root.querySelector('#sdw-send');
    ctaBtn  = root.querySelector('#sdw-cta');

    root.querySelector('#sdw-close').onclick = () => close();

    const send = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = ''; addRow('me', v); ask(v);
    };
    sendBtn.onclick = send;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
  }

  function showPanel()   { root.classList.add('sdw-visible'); document.getElementById('sdw-bubble-btn').style.display = 'none'; }
  function hidePanel()   { root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble-btn').style.display = 'inline-flex'; }

  function addRow(from, text) {
    const line = document.createElement('div');
    line.className = 'sdw-msg ' + (from === 'me' ? 'me' : 'ai');

    const avatar = document.createElement('div');
    avatar.className = 'sdw-avatar';
    avatar.textContent = (from === 'me' ? '🧑' : '🤖');

    const bubble = document.createElement('div');
    bubble.className = 'sdw-bubble ' + (from === 'me' ? 'me' : 'ai');
    bubble.textContent = text;

    if (from === 'me') {
      line.appendChild(bubble);
      line.appendChild(avatar);
    } else {
      line.appendChild(avatar);
      line.appendChild(bubble);
    }
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  // ====== KPI READER ======
  function textFrom(selList) {
    for (const s of selList) {
      const el = document.querySelector(s);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return '';
  }
  function toNumberLike(t) {
    if (!t) return null;
    // porta 12,3% -> 12.3 | "€ 1.234,50" -> 1234.5
    const cleaned = t.replace(/\s/g,'').replace(/[€]/g,'').replace(/\./g,'').replace(/,/g,'.');
    const mPerc = cleaned.match(/-?\d+(\.\d+)?(?=%)/);
    if (mPerc) return parseFloat(mPerc[0]);
    const mNum  = cleaned.match(/-?\d+(\.\d+)?/);
    return mNum ? parseFloat(mNum[0]) : null;
  }
  function readKpi() {
    const roiT    = textFrom(KPI_SELECTORS.roi);
    const roasT   = textFrom(KPI_SELECTORS.roas);
    const budgetT = textFrom(KPI_SELECTORS.budget);
    const cplT    = textFrom(KPI_SELECTORS.cpl);
    return {
      roi: toNumberLike(roiT),
      roas: toNumberLike(roasT),
      budget: toNumberLike(budgetT),
      cpl: toNumberLike(cplT),
      raw: { roiT, roasT, budgetT, cplT }
    };
  }

  function kpiAnalysis() {
    const k = readKpi();
    if (k.roi == null && k.roas == null && k.budget == null && k.cpl == null) return null;

    let out = [];
    if (k.roi != null) {
      if (k.roi < 0) {
        out.push(`ROI stimato ≈ ${k.roi}%: la strategia sembra in **perdita**. Ti aiuto a rimetterti in rotta rivedendo **budget ADV**, **CPL atteso** e **tassi di conversione**.`);
      } else if (k.roi >= 0 && k.roi < 30) {
        out.push(`ROI stimato ≈ ${k.roi}%: strategia **marginale**. Possiamo ottimizzare funnel e creatività per aumentare conversioni e valore medio d’ordine.`);
      } else {
        out.push(`ROI stimato ≈ ${k.roi}%: ottimo! Vediamo come **scalare** senza perdere marginalità (priorità: budget progressivo, controllo CPL e saturazione canali).`);
      }
    }
    if (k.roas != null)  out.push(`ROAS ≈ ${k.roas}.`);
    if (k.budget != null) out.push(`Budget stimato ≈ ${k.budget} €.`);
    if (k.cpl != null) out.push(`CPL ≈ ${k.cpl} €.`);

    out.push('Vuoi un confronto operativo? Prenota la **Consulenza Gratuita**: definiamo insieme la strategia più scalabile per il tuo caso.');
    return out.join(' ');
  }

  // ====== BACKEND CALL + fallback ======
  async function ask(t) {
    try {
      const r = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({mode:'chat', prompt:t})
      });
      const j = await r.json().catch(() => ({}));
      if (j && (j.text || j.message)) {
        addRow('ai', j.text || j.message);
        return;
      }
    } catch (e) {/* ignora, vado in fallback */}

    // Fallback specializzato (se l’API non risponde)
    addRow('ai', localReply(t));
  }

  function localReply(t) {
    const s = (t||'').toLowerCase();

    if (/(come|aiuto).*compila/.test(s) || /simulator/.test(s) || /configurator/.test(s)) {
      return 'Per ottenere un’analisi precisa compila il simulatore: tipo business e settore, **clienti mensili**, **scontrino medio** e **margine**. Poi premi **Calcola la tua crescita**: ti restituisco ROI/ROAS e i punti da migliorare.';
    }
    if (/cos.?è.*suite|chi siete|cosa fate/.test(s)) {
      return 'Suite Digitale è un team che unisce **marketing, vendite e CRM** in un’ecosistema all-in-one. Partiamo dai numeri (KPI reali), progettiamo funnel e campagne, e ti aiutiamo a crescere in modo **prevedibile e scalabile**. La **Consulenza Gratuita** è il primo step per analizzare il tuo caso.';
    }
    if (/prezzi|costi|quanto/.test(s)) {
      return 'I costi dipendono da obiettivi e complessità (paid, funnel, CRM). Con la **Consulenza Gratuita** ti diamo un perimetro chiaro: priorità, tempi e budget sostenibile. Prenotala quando vuoi 👉 https://www.suitedigitale.it/candidatura/';
    }
    // default
    return 'Sono qui per KPI, ROI/ROAS, budget, strategia e come funziona il nostro servizio. Se vuoi un parere concreto sui tuoi numeri, premi **Calcola la tua crescita** e condividi i risultati: ti do subito spunti e next-step. Puoi anche prenotare la **Consulenza Gratuita** 👉 https://www.suitedigitale.it/candidatura/';
  }

  // ====== OPEN / CLOSE con logica di benvenuto ======
  function greetBeforeCalc() {
    addRow('ai',
      'Ciao! Per aiutarti davvero mi servono i tuoi parametri. Compila il simulatore (tipo business e settore, clienti mensili, scontrino medio e margine) poi premi **Calcola la tua crescita**. Ti restituisco ROI/ROAS, budget e i punti da migliorare.'
    );
  }

  function openWithKpiAnalysis() {
    const analysis = kpiAnalysis();
    if (analysis) addRow('ai', analysis);
    else greetBeforeCalc();
  }

  function thereAreResults() {
    // se troviamo almeno un KPI, assumiamo che il calcolo sia stato fatto
    const k = readKpi();
    return (k.roi != null || k.roas != null || k.budget != null || k.cpl != null);
  }

  function open(opts={}) {
    mount(); showPanel();
    // se il pannello è vuoto, decide cosa dire per primo
    const noMessagesYet = !body.querySelector('.sdw-msg');
    if (noMessagesYet) {
      if (thereAreResults()) openWithKpiAnalysis();
      else greetBeforeCalc();
    }
    if (opts.autostart && !thereAreResults()) {
      // autostart usato da trigger prima del calcolo → solo guida
      // (se dopo il calcolo, openWithKpiAnalysis sopra copre già)
    }
  }
  function close() { hidePanel(); }

  // Espone API globali
  window.SuiteAssistantChat = {
    open, close,
    ask: (t)=>{ mount(); showPanel(); addRow('me', t); ask(t); }
  };

  // Monta subito il bubble
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
