// public/sd-chat.js
(function () {
  // ===== CONFIG =====
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant'; // cambia se serve

  // ===== CSS =====
  if (!document.getElementById('sdw-style')) {
    const css = `
#sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:380px;max-width:calc(100vw - 32px);display:none}
#sdw-root.sdw-visible{display:block}
#sdw-panel{background:#0d0f16;color:#e9eefc;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}
#sdw-head{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
#sdw-titleWrap{display:flex;align-items:center;gap:10px}
#sdw-avatar{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#23263a}
#sdw-avatar span{filter:saturate(1.2)}
#sdw-title{font-weight:700;font-size:14px}
#sdw-online{display:inline-block;width:8px;height:8px;border-radius:999px;background:#3ce77a;box-shadow:0 0 0 2px #0d0f16}
#sdw-close{background:transparent;border:0;color:#e9eefc;opacity:.8;cursor:pointer;font-size:18px}
#sdw-body{height:420px;max-height:62vh;overflow:auto;padding:16px;background:#0b0d14;display:flex;flex-direction:column;gap:10px}
.msg{display:flex;gap:8px}
.msg .bubble{max-width:78%;padding:12px 12px;border-radius:14px;line-height:1.35}
.msg.ai{justify-content:flex-start}
.msg.ai .bubble{background:#12162a;border:1px solid rgba(255,255,255,.06)}
.msg.me{justify-content:flex-end}
.msg.me .bubble{background:#7b5cff;color:#fff}
.msg .meta{font-size:12px;opacity:.65;margin-top:2px}
#sdw-foot{display:flex;flex-direction:column;gap:10px;padding:12px;border-top:1px solid rgba(255,255,255,.08);background:#0d0f16}
#sdw-cta{display:block;width:100%;text-align:center;background:#ffdeaf;color:#1a1b24;border:0;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer}
#sdw-cta:hover{filter:brightness(.98)}
#sdw-inputRow{display:flex;gap:8px}
#sdw-input{flex:1;background:#10142a;border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#e9eefc;padding:12px}
#sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 14px;min-width:72px;cursor:pointer}
#sdw-bubble{position:fixed;right:22px;bottom:22px;background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:10px 14px;box-shadow:0 8px 20px rgba(0,0,0,.3);cursor:pointer;display:none;z-index:999999}
.typing{opacity:.85}
.typing .dots{display:inline-block;width:20px;text-align:left}
a.sdw-link{color:#9ec5ff;text-decoration:underline}
    `.trim();
    const st = document.createElement('style');
    st.id = 'sdw-style';
    st.textContent = css;
    document.head.appendChild(st);
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
    bubble.onclick = () => open({ autostart: true });
    document.body.appendChild(bubble);
    bubble.style.display = 'inline-flex';

    // Panel
    root = document.createElement('div'); root.id = 'sdw-root';
    root.innerHTML = `
      <div id="sdw-panel">
        <div id="sdw-head">
          <div id="sdw-titleWrap">
            <div id="sdw-avatar"><span>🤖</span></div>
            <div>
              <div id="sdw-title">Assistente AI</div>
              <div style="display:flex;align-items:center;gap:6px"><span id="sdw-online"></span><small class="meta">Online</small></div>
            </div>
          </div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>

        <div id="sdw-body"></div>

        <div id="sdw-foot">
          <a id="sdw-cta" href="https://www.suitedigitale.it/candidatura/" target="_blank" rel="noopener">Richiedi un’analisi gratuita 👉</a>
          <div id="sdw-inputRow">
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

  function showPanel()   { root.classList.add('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'none'; }
  function hidePanel()   { root.classList.remove('sdw-visible'); document.getElementById('sdw-bubble').style.display = 'inline-flex'; }

  function addRow(from, html, raw=false) {
    const row = document.createElement('div');
    row.className = 'msg ' + (from === 'me' ? 'me' : 'ai');
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = raw ? html : fmt(html);
    row.appendChild(bubble);
    body.appendChild(row); body.scrollTop = body.scrollHeight;
    return row;
  }

  // ===== Formatting (markdown leggero + link cliccabili) =====
  function fmt(html) {
    const esc = (s) => s.replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    let out = esc(html);
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(https?:\/\/[^\s)]+)(\)?)/g, '<a class="sdw-link" href="$1" target="_blank" rel="noopener">$1</a>$2');
    out = out.replace(/\n/g, '<br>');
    return out;
  }

  // ===== mini suoni (attivi dopo prima interazione utente) =====
  let _userInteracted = false;
  document.addEventListener('pointerdown', () => { _userInteracted = true; }, { once:true });
  function beep(ms=120, freq=720, vol=0.04) {
    if (!_userInteracted || !window.AudioContext) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); setTimeout(()=>{ osc.stop(); ctx.close(); }, ms);
    } catch {}
  }

  // ===== typing indicator =====
  let _typingRow = null;
  function showTyping(){
    if (_typingRow) return;
    const row = document.createElement('div');
    row.className = 'msg ai typing';
    row.innerHTML = `<div class="bubble">Sta scrivendo <span class="dots">.</span></div>`;
    body.appendChild(row); body.scrollTop = body.scrollHeight;
    _typingRow = row;

    let i=0; const el = row.querySelector('.dots');
    row._timer = setInterval(()=>{ el.textContent = ['.','..','...'][i++%3]; }, 300);
  }
  function hideTyping(){
    if (!_typingRow) return;
    clearInterval(_typingRow._timer);
    _typingRow.remove(); _typingRow = null;
  }

  // ===== Backend call =====
  async function ask(text) {
    addRow('me', text);
    showTyping();
    try {
      const r = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt:text })
      });
      const j = await r.json().catch(() => ({}));
      hideTyping();
      const msg = j.text || j.message || JSON.stringify(j);
      addRow('ai', msg);
    } catch (e) {
      hideTyping();
      addRow('ai', 'Si è verificato un errore di rete. Prova di nuovo tra poco.');
    }
  }

  // === prompt per analisi KPI (proiezioni del simulatore, non storico) ===
  function kpiPrompt(k, note) {
    const parts = [];
    if (typeof k.roi    === 'number') parts.push(`"roi": ${k.roi}`);
    if (typeof k.roas   === 'number') parts.push(`"roas": ${k.roas}`);
    if (typeof k.budget === 'number') parts.push(`"budget": ${k.budget}`);
    if (typeof k.revenue=== 'number') parts.push(`"revenue": ${k.revenue}`);
    if (typeof k.canone === 'number') parts.push(`"canone": ${k.canone}`);
    if (typeof k.profit === 'number') parts.push(`"profit": ${k.profit}`);
    const ctx = note ? `Contesto utente: ${note}.` : '';

    // CTA esplicita, come richiesto
    const CTA = 'Usa come ultimo paragrafo la CTA **Richiedi un’analisi gratuita 👉** con link https://www.suitedigitale.it/candidatura/ (link cliccabile).';

    return `
Sei l'**Assistente AI** di Suite Digitale. Analizza questi dati che sono **proiezioni** del simulatore (non performance storiche).
Tono: **tecnico ma amichevole, energico**, chiaro e sintetico. Usa **grassetti** ed elenchi numerati/puntati quando utili.

Dati (JSON):
{ ${parts.join(', ')} }

${ctx}

Linee guida:
- Spiega cosa implicano i numeri **come proiezioni**: se positivi, evidenzia potenziale e prossimi passi; se negativi, rischi (pricing, margini, costi operativi, conversioni).
- Ricorda che Suite Digitale **unisce marketing e vendite**: strategist, media buyer, CRM specialist, setter/chatter in **un unico team coordinato** (no fornitori separati).
- Suggerisci **idee di funnel** coerenti con settore/target (da validare in consulenza).
- Non dare istruzioni "fai da te" di dettaglio: valorizza il lavoro del nostro team integrato.
- Chiudi con una call to action forte.
${CTA}
`.trim();
  }

  // ===== API esposte globalmente =====
  function open(opts={}) {
    mount(); showPanel();
    if (opts.autostart) {
      // benvenuto AI (non “Tu”)
      addRow('ai',
        `Ciao! Per aiutarti davvero mi servono i tuoi parametri. `+
        `Compila il simulatore (tipo business e settore, clienti mensili, scontrino medio e margine) e premi **Calcola la tua crescita**. `+
        `Ti restituisco una lettura dei KPI simulati (ROI/ROAS, budget, utile) e i **prossimi passi**.`
      );
    }
  }
  function close() { hidePanel(); }

  // chiamata silente dall’evento "Calcola la tua crescita"
  async function analyseKPIsSilently(kpis, note) {
    mount(); showPanel(); beep(120, 780);
    showTyping();
    try {
      const r = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt: kpiPrompt(kpis, note) })
      });
      const j = await r.json().catch(() => ({}));
      hideTyping();
      addRow('ai', j.text || j.message || JSON.stringify(j));
    } catch {
      hideTyping();
      addRow('ai', 'Ops, non riesco a completare ora. Riprova o scrivimi qui sotto.');
    }
  }

  // esporta nel namespace globale
  window.SuiteAssistantChat = {
    open, close, ask,
    analyseKPIsSilently
  };

  // monta subito il bubble
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else { mount(); }

  console.log('[SD] sd-chat.js pronto');
})();
