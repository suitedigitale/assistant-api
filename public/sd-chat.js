<script>
// =========================
//  Suite Digitale - Chat UI
// =========================
(function () {
  // ===== CONFIG =====
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant'; // tieni il tuo endpoint
  const CONSULENZA_URL = 'https://www.suitedigitale.it/candidatura';

  // ===== CSS =====
  if (document.getElementById('sdw-style')) return;
  const css =
    '#sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:380px;max-width:calc(100vw - 32px);display:none}' +
    '#sdw-root.sdw-visible{display:block}' +
    '#sdw-panel{background:#0b0c10;color:#e6e8ee;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '#sdw-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '#sdw-info{display:flex;align-items:center;gap:10px}' +
    '#sdw-avatar{width:26px;height:26px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:#1b1f2e;font-size:16px}' +
    '#sdw-title{font-weight:800;font-size:14px;display:inline-flex;align-items:center;gap:8px}' +
    '#sdw-online{display:inline-block;width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25)}' +
    '#sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}' +
    '#sdw-body{height:360px;max-height:60vh;overflow:auto;padding:12px;background:#0b0c10}' +
    '.sdw-row{margin:8px 0;line-height:1.45} .me{color:#cdd2ff} .ai{color:#e6e8ee}' +
    '#sdw-foot{display:flex;flex-direction:column;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:#0b0c10}' +
    '#sdw-cta{display:flex;justify-content:flex-start}' +
    '#sdw-cta a{background:#7b5cff;color:#fff;text-decoration:none;font-weight:800;border-radius:999px;padding:6px 10px;font-size:12px;display:inline-flex;gap:8px;align-items:center}' +
    '#sdw-inputrow{display:flex;gap:8px}' +
    '#sdw-input{flex:1;background:#0f1220;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#e6e8ee;padding:10px}' +
    '#sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}' +
    '#sdw-bubble{position:fixed;right:22px;bottom:22px;background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:10px 14px;box-shadow:0 8px 20px rgba(0,0,0,.3);cursor:pointer;display:none;z-index:999999}' ;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ===== UI =====
  let root, body, input, sendBtn;

  function mount() {
    if (root) return;

    // Bubble
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = '🤖 Assistente AI';
    bubble.onclick = () => open({ autostart: false });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML =
      '<div id="sdw-panel">' +
      '  <div id="sdw-head">' +
      '    <div id="sdw-info">' +
      '      <span id="sdw-avatar">🤖</span>' +
      '      <div id="sdw-title">Assistente AI <span id="sdw-online" title="Online"></span></div>' +
      '    </div>' +
      '    <button id="sdw-close" aria-label="Chiudi">×</button>' +
      '  </div>' +
      '  <div id="sdw-body"></div>' +
      '  <div id="sdw-foot">' +
      '    <div id="sdw-cta"><a href="'+CONSULENZA_URL+'" target="_blank" rel="noopener">Richiedi un’analisi gratuita 👉</a></div>' +
      '    <div id="sdw-inputrow">' +
      '      <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo il budget, consigli ROI)">' +
      '      <button id="sdw-send">Invia</button>' +
      '    </div>' +
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
  function addRow(from, t){ const r = document.createElement('div'); r.className = 'sdw-row ' + from; r.textContent = (from==='me'?'Tu: ':'AI: ') + t; body.appendChild(r); body.scrollTop = body.scrollHeight; }

  // Stato pagina (per capire se l’utente ha calcolato)
  function hasResults(){
    const res = document.getElementById('result');
    const sum = document.getElementById('summaryDock');
    if (!res) return false;
    const vis = getComputedStyle(res).display !== 'none';
    const sumVis = sum && sum.getAttribute('aria-hidden') === 'false';
    const roiEl = document.getElementById('roiKPI');
    const roiOk = !!(roiEl && roiEl.textContent.trim());
    return Boolean(vis || sumVis || roiOk);
  }

  // ===== Conversazione / Backend =====
  const THEMES = ['suite digitale','simulatore','marketing','adv','pubblicità','funnel','crm','vendite','roi','roas','cpl','kpi','strategia','lead','campagne'];
  function offTopic(q){
    const t = (q||'').toLowerCase();
    if (!t) return false;
    let hit = 0; for (const k of THEMES){ if (t.includes(k)) hit++; }
    const smallTalk = /(ciao|buongiorno|buonasera|hey|salve)/i.test(t);
    return !smallTalk && hit === 0;
  }

  async function backend(text){
    try{
      const r = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt:text })
      });
      const j = await r.json().catch(()=> ({}));
      if (j && (j.text || j.message)) return j.text || j.message;
    }catch(_){}
    return null;
  }

  async function ask(t) {
    addRow('me', t);
    addRow('ai', '⌛ Sto analizzando…');

    // Off-topic gentile
    if (offTopic(t)){
      body.lastChild.textContent = 'AI: Sono specializzato su Suite Digitale: simulatore KPI, marketing & vendite, funnel, piattaforma e consulenza. Fammi pure domande su ROI/ROAS, budget, strategia e su come funziona il nostro servizio: sono qui per aiutarti!';
      return;
    }

    // Prova backend, altrimenti fallback smart
    const fromApi = await backend(t);
    if (fromApi){
      body.lastChild.textContent = 'AI: ' + fromApi;
    } else {
      body.lastChild.textContent = 'AI: Ti rispondo subito con ciò che so. Posso guidarti a leggere KPI, stimare ROI/ROAS, rivedere budget ADV e ottimizzare funnel e vendite. Se vuoi andiamo sui tuoi numeri: compila il simulatore e premo “Calcola la tua crescita”.';
    }
  }

  function greetingIfNeeded(){
    if (hasResults()) return; // niente greeting se il calcolo è già stato fatto
    addRow('ai',
      'Ciao! Per darti un’analisi accurata ti chiedo di compilare il simulatore: ' +
      '1) scegli “A chi vendi” e il settore; 2) imposta clienti mensili, scontrino medio e margine; ' +
      '3) premi “Calcola la tua crescita”. Poi ti spiego ROI, ROAS e cosa migliorare.'
    );
  }

  // ===== API widget =====
  function open(opts={}) { mount(); showPanel(); greetingIfNeeded(); if (opts.autostart) ask('Analizza i miei numeri'); }
  function close()       { hidePanel(); }

  window.SuiteAssistantChat = { open, close, ask: (t)=>{ mount(); showPanel(); ask(t);} };

  // Monta bubble subito
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else { mount(); }

  console.log('[SD] sd-chat.js pronto');

  // ===== Carica i trigger (senza crossOrigin) =====
  const s = document.createElement('script');
  s.src = 'https://assistant-api-xi.vercel.app/sd-triggers.js';
  s.defer = true;
  document.head.appendChild(s);
})();
</script>
