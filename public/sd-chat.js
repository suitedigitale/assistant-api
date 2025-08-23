(function () {
  // ===== CONFIG =====
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant'; // se il tuo dominio Vercel è diverso, sostituisci

  // ===== CSS compatto =====
  if (document.getElementById('sdw-style')) return;
  const css =
    '#sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:380px;max-width:calc(100vw - 32px);display:none}' +
    '#sdw-root.sdw-visible{display:block}' +
    '#sdw-panel{background:#151723;color:#e6e8ee;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '#sdw-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '#sdw-title{font-weight:700;font-size:14px}' +
    '#sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}' +
    '#sdw-body{height:360px;max-height:60vh;overflow:auto;padding:12px;background:#0b0c10}' +
    '.sdw-row{margin:8px 0} .me{color:#cdd2ff} .ai{color:#e6e8ee}' +
    '#sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:#151723}' +
    '#sdw-input{flex:1;background:#0f1220;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#e6e8ee;padding:10px}' +
    '#sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}' +
    '#sdw-bubble{position:fixed;right:22px;bottom:22px;background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:10px 14px;box-shadow:0 8px 20px rgba(0,0,0,.3);cursor:pointer;display:none;z-index:999999}';
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ===== UI =====
  let root, body, input, sendBtn;

  function mount() {
    if (root) return;
    // Bubble (pannello chiuso di default; lo mostriamo subito)
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente Strategico';
    bubble.onclick = () => open({ autostart: false });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML =
      '<div id="sdw-panel">' +
      '  <div id="sdw-head"><div><span id="sdw-title">Suite Digitale · Assistente</span></div>' +
      '    <button id="sdw-close" aria-label="Chiudi">×</button></div>' +
      '  <div id="sdw-body"></div>' +
      '  <div id="sdw-foot">' +
      '    <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo il budget, consigli ROI)">' +
      '    <button id="sdw-send">Invia</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(root);

    body    = root.querySelector('#sdw-body');
    input   = root.querySelector('#sdw-input');
    sendBtn = root.querySelector('#sdw-send');

    root.querySelector('#sdw-close').onclick = () => close();

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = ''; ask(v);
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
  }

  function showPanel()   { root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'none'; }
  function hidePanel()   { root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'inline-flex'; }
  function addRow(from,t){ const r = document.createElement('div'); r.className = 'sdw-row ' + from; r.textContent = (from==='me'?'Tu: ':'AI: ')+t; body.appendChild(r); body.scrollTop = body.scrollHeight; }

  // ===== Backend calls =====
  async function ask(t) {
    addRow('me', t);
    addRow('ai', '⌛ Sto analizzando…');
    try {
      const r = await fetch(ENDPOINT, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({mode:'analysis', prompt:t}) });
      const j = await r.json().catch(() => ({}));
      body.lastChild.textContent = 'AI: ' + (j.text || j.message || JSON.stringify(j));
    } catch (e) {
      body.lastChild.textContent = 'AI: errore ' + e.message;
    }
    addRow('ai', 'Vuoi prenotare una consulenza gratuita con uno strategist (€350 di valore)? Scrivi “voglio parlare con voi”.');
  }

  // ===== API =====
  function open(opts={}) { mount(); showPanel(); if (opts.autostart) ask('Analizza i miei numeri'); }
  function close()       { hidePanel(); }

  window.SuiteAssistantChat = { open, close, ask: (t)=>{ mount(); showPanel(); ask(t);} };

  // Monta bubble subito
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else { mount(); }

  console.log('[SD] sd-chat.js pronto');
})();
/* public/sd-triggers.js */
(function () {
  const SELECTORS_CLICK = ['#calcolaBtn', '[data-cta="calcola"]', 'a[href*="#sdw-open"]'];
  const SELECTORS_RESULTS = ['#kpi-results', '[data-kpi="results"]', '.kpi-results'];
  const AUTO_MSG = 'Analizza i miei KPI: ROI, ROAS e suggerimenti di budget.';

  function openAndAsk() {
    if (!window.SuiteAssistantChat) return false;
    window.SuiteAssistantChat.open({ autostart: true });
    setTimeout(() => {
      const i = document.getElementById('sdw-input');
      const b = document.getElementById('sdw-send');
      if (i && b) { i.value = AUTO_MSG; b.click(); }
    }, 350);
    return true;
  }

  function initClicks() {
    SELECTORS_CLICK.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !el.__sdw) {
        el.__sdw = 1;
        el.addEventListener('click', openAndAsk);
      }
    });
  }

  function initResultsObserver() {
    const target = SELECTORS_RESULTS.map(s => document.querySelector(s)).find(Boolean);
    if (!target || !('IntersectionObserver' in window)) return;
    let done = false;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!done && e && e.isIntersecting) {
        done = true; io.disconnect(); openAndAsk();
      }
    }, { threshold: 0.35 });
    io.observe(target);
  }

  function boot() { initClicks(); initResultsObserver(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
(function(){var s=document.createElement('script');s.src='https://assistant-api-xi.vercel.app/sd-triggers.js';s.defer=1;document.head.appendChild(s)})();

