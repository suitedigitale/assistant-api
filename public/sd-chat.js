(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';
  const AVATAR   = '🤖';
  const ONLINE   = true;

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
#sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;width:380px;max-width:calc(100vw - 32px);display:none}
#sdw-root.sdw-visible{display:block}
#sdw-panel{background:#0f1220;color:#e6e8ee;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}
#sdw-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
#sdw-title{display:flex;align-items:center;gap:8px;font-weight:700}
.sdw-ava{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#1b1f36;font-size:14px}
.sdw-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:6px;background:#34d399;box-shadow:0 0 0 1px #0f1220}
#sdw-close{background:transparent;border:0;color:#bfc4ff;font-size:18px;cursor:pointer}
#sdw-body{height:370px;max-height:60vh;overflow:auto;padding:12px;background:#0b0c17}
.msg{display:flex;margin:8px 0;gap:10px}
.msg .bubble{max-width:74%;padding:10px 12px;border-radius:14px;line-height:1.35;box-shadow:0 6px 18px rgba(0,0,0,.18)}
.msg.ai{justify-content:flex-start}
.msg.ai .bubble{background:#19213c}
.msg.me{justify-content:flex-end}
.msg.me .bubble{background:#7b5cff;color:#fff;border-top-right-radius:6px}
.msg.ai .who{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1b1f36}
.msg.me .who{display:none}
#sdw-foot{display:flex;flex-direction:column;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:#101327}
.sdw-cta{display:inline-flex;justify-content:center;align-items:center;border:0;background:#1e293b;color:#e6e8ee;border-radius:12px;padding:8px 12px;cursor:pointer;transition:.15s}
.sdw-cta:hover{background:#23314a}
.sdw-cta a{color:#e6e8ee;text-decoration:none}
.sdw-row{display:flex;gap:8px}
#sdw-input{flex:1;background:#0f1220;border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#e6e8ee;padding:10px 12px}
#sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:12px;padding:0 14px;min-width:70px;cursor:pointer}
#sdw-bubble{position:fixed;right:24px;bottom:24px;background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:10px 14px;box-shadow:0 10px 24px rgba(0,0,0,.35);cursor:pointer;display:none;z-index:999999}
  `.trim();
  const st = document.createElement('style'); st.id='sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn;

  function mount() {
    if (root) return;

    // Bubble (mostrata fin da subito)
    const bubble = document.createElement('button');
    bubble.id = 'sdw-bubble';
    bubble.type = 'button';
    bubble.textContent = 'Assistente AI';
    bubble.onclick = () => open({ greet: true });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-title">
            <span class="sdw-ava">${AVATAR}</span>
            <span>Assistente AI</span>
            ${ONLINE ? '<span class="sdw-dot" title="Online"></span>' : ''}
          </div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div id="sdw-foot">
          <button class="sdw-cta" id="sdw-cta"><a href="${CTA_URL}" target="_blank" rel="noopener">Richiedi un’analisi gratuita 👉</a></button>
          <div class="sdw-row">
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

    root.querySelector('#sdw-close').onclick = () => close();

    const fire = () => {
      const v = (input.value || '').trim();
      if (!v) return;
      input.value = '';
      ask(v);
    };
    sendBtn.onclick = fire;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
  }

  function showPanel() { root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display='none'; }
  function hidePanel() { root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display='inline-flex'; }
  function row(from, html) {
    const el = document.createElement('div'); el.className = `msg ${from}`;
    const who = document.createElement('div'); who.className = 'who'; who.textContent = AVATAR;
    const b   = document.createElement('div'); b.className   = 'bubble'; b.innerHTML = html;
    if (from === 'ai') { el.appendChild(who); el.appendChild(b); } else { el.appendChild(b); }
    body.appendChild(el); body.scrollTop = body.scrollHeight;
    return el;
  }

  // ====== Backend ======
  async function ask(t, opts = {}) {
    row('me', escapeHtml(t));
    const wait = row('ai', '⌛ Sto analizzando…');

    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ mode:'analysis', prompt: t, kpi: opts.kpi || {} })
      });
      const j = await r.json().catch(()=> ({}));
      wait.querySelector('.bubble').innerHTML =
        'ai' && j?.text ? nl2br(escapeHtml(j.text))
                       : 'Al momento non riesco a rispondere. Scrivimi pure su <b>marketing@suitedigitale.it</b> o WhatsApp <b>+39 351 509 4722</b>.';
    } catch (e) {
      wait.querySelector('.bubble').textContent = 'Errore rete: ' + e.message;
    }
    body.scrollTop = body.scrollHeight;
  }

  // ====== Helpers ======
  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
  function nl2br(s){ return s.replace(/\n/g,'<br>'); }

  // ====== API ======
  function welcomeMessage() {
    row('ai', nl2br(escapeHtml(
`Ciao! Per aiutarti davvero mi servono i tuoi parametri.
Compila il simulatore (tipo business, settore, clienti mensili, scontrino medio, margine) e poi premi **Calcola la tua crescita**. 
Ti restituisco ROI/ROAS, budget e i punti da migliorare.
Intanto, se vuoi parlarne con uno strategist: Consulenza Gratuita → ${CTA_URL}`)));
  }
  function open(opts={}) { mount(); showPanel(); if (opts.greet) welcomeMessage(); }
  function close(){ hidePanel(); }

  window.SuiteAssistantChat = {
    open, close,
    ask: (text, opts) => { mount(); showPanel(); ask(text, opts); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');
})();
