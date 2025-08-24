/* public/sd-chat.js — baseline stabile (brand #8C52FF) con SOUND su apertura */
(function () {
  // ===== CONFIG =====
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant'; // il tuo endpoint
  const BRAND    = '#8C52FF';

  // ===== CSS compatto =====
  (function ensureStyle(){
    if (document.getElementById('sdw-style')) return;
    const css =
      '#sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:380px;max-width:calc(100vw - 32px);display:none}' +
      '#sdw-root.sdw-visible{display:block}' +
      '#sdw-panel{background:#151723;color:#e6e8ee;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
      '#sdw-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}' +
      '#sdw-title{display:flex;align-items:center;gap:10px;font-weight:800;font-size:14px}' +
      '#sdw-title .pfp{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:' + BRAND + '1a;color:' + BRAND + ';border:1px solid ' + BRAND + '33}' +
      '#sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}' +
      '#sdw-body{height:360px;max-height:60vh;overflow:auto;padding:12px;background:#0b0c10}' +
      '.sdw-row{display:flex;margin:8px 0}' +
      '.sdw-row.ai{justify-content:flex-start;gap:8px}' +
      '.sdw-row.me{justify-content:flex-end}' +
      '.sdw-bubble{max-width:80%;padding:10px 12px;border-radius:14px;line-height:1.45;white-space:pre-wrap}' +
      '.sdw-row.ai .sdw-bubble{background:#111427;border:1px solid rgba(255,255,255,.08)}' +
      '.sdw-row.me .sdw-bubble{background:' + BRAND + ';color:#fff;border:0;border-top-right-radius:4px}' +
      '.sdw-pfp{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:' + BRAND + '1a;color:' + BRAND + ';border:1px solid ' + BRAND + '33;margin-top:2px}' +
      '#sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:#151723}' +
      '#sdw-input{flex:1;background:#0f1220;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#e6e8ee;padding:10px}' +
      '#sdw-send{background:' + BRAND + ';border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer;font-weight:700}' +
      '#sdw-bubble{position:fixed;right:22px;bottom:22px;background:' + BRAND + ';color:#fff;border:0;border-radius:999px;padding:10px 14px;box-shadow:0 8px 20px rgba(0,0,0,.3);cursor:pointer;display:none;z-index:999999;font-weight:800}';
    const st = document.createElement('style'); st.id='sdw-style'; st.textContent=css; document.head.appendChild(st);
  })();

  // ===== SOUND (solo apertura bubble/pannello) =====
  function ding(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type='sine'; o.frequency.value=880; g.gain.value=0.0001;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.25);
      o.stop(ctx.currentTime+0.26);
    }catch(e){}
  }

  // ===== UI =====
  let root, body, input, sendBtn;

  function mount() {
    if (root) return;

    // Bubble
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = 'Assistente AI';
    bubble.onclick = () => open({ autostart: false });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML =
      '<div id="sdw-panel">' +
      '  <div id="sdw-head">' +
      '    <div id="sdw-title"><span class="pfp sdw-pfp">🤖</span><span>Assistente AI</span></div>' +
      '    <button id="sdw-close" aria-label="Chiudi">×</button>' +
      '  </div>' +
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

    root.querySelector('#sdw-close').onclick = close;

    const fire = () => {
      const v = (input.value || '').trim(); if (!v) return;
      input.value = ''; ask(v);
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });

    // Messaggio di benvenuto AI
    addAI('Ciao! Compila il simulatore e premi **Calcola la tua crescita**: ti darei una lettura dei KPI simulati e i prossimi step.');
  }

  function showPanel()   { root.classList.add('sdw-visible'); const b=document.getElementById('sdw-bubble'); if(b) b.style.display='none'; }
  function hidePanel()   { root.classList.remove('sdw-visible'); const b=document.getElementById('sdw-bubble'); if(b) b.style.display='inline-flex'; }
  function scrollB()     { body.scrollTop = body.scrollHeight; }

  function escapeHTML(t){ return String(t).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
  function linkify(t){
    const s = escapeHTML(t).replace(/https?:\/\/[^\s)]+/g,(m)=>`<a href="${m.replace(/\)\]|\]|\)$/g,'')}" target="_blank" rel="noopener" style="color:${BRAND};text-decoration:underline">${m}</a>`);
    return s.replace(/https:\/\/www\.suitedigitale\.it\/candidatura\/?(\))?/g,
      `<a href="https://www.suitedigitale.it/candidatura/" target="_blank" rel="noopener" style="color:${BRAND};text-decoration:underline">https://www.suitedigitale.it/candidatura/</a>`);
  }

  function addRow(side, html){
    const r = document.createElement('div'); r.className = 'sdw-row ' + side;
    if(side==='ai'){
      r.innerHTML = '<span class="sdw-pfp">🤖</span><div class="sdw-bubble">'+html+'</div>';
    }else{
      r.innerHTML = '<div class="sdw-bubble">'+html+'</div>';
    }
    body.appendChild(r); scrollB();
  }
  function addME(t){ addRow('me', escapeHTML(t)); }
  function addAI(t){ addRow('ai', linkify(t)); }

  // ===== Backend calls =====
  async function ask(t) {
    addME(t);
    addAI('⌛ Sto analizzando…');
    try {
      const r = await fetch(ENDPOINT, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({mode:'analysis', prompt:t}) });
      const j = await r.json().catch(() => ({}));
      body.lastChild.querySelector('.sdw-bubble').innerHTML = linkify(j.text || j.message || JSON.stringify(j));
    } catch (e) {
      body.lastChild.querySelector('.sdw-bubble').textContent = 'AI: errore ' + e.message;
    }
  }

  // ===== API =====
  function open(opts={}) { mount(); showPanel(); ding(); if (opts.autostart) { addAI('Sono qui! Dimmi pure cosa vuoi analizzare.'); } }
  function close()       { hidePanel(); }

  window.SuiteAssistantChat = { open, close, ask };

  // Monta bubble subito
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
