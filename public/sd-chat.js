(function () {
  // ====== CONFIG ======
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant'; // lascia così finché l'endpoint resta questo
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ====== CSS ======
  if (document.getElementById('sdw-style')) return;
  const css = `
  #sdw-root{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:380px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#151723;color:#e6e8ee;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  #sdw-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
  #sdw-title{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px}
  #sdw-avatar{width:22px;height:22px;border-radius:999px;background:#0f1220;display:inline-flex;align-items:center;justify-content:center}
  #sdw-status{width:8px;height:8px;border-radius:999px;background:#3ddc84;box-shadow:0 0 0 2px rgba(61,220,132,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}
  #sdw-body{height:360px;max-height:60vh;overflow:auto;padding:12px;background:#0b0c10}
  .sdw-row{margin:8px 0;line-height:1.45}
  .sdw-row.me{color:#cdd2ff}
  .sdw-row.ai{color:#e6e8ee}
  .sdw-row.ai .tag {opacity:.75}
  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:#151723;align-items:center}
  #sdw-cta{font-size:12px;background:#21243a;color:#e6e8ee;border:1px solid rgba(255,255,255,.08);padding:6px 10px;border-radius:10px;text-decoration:none;white-space:nowrap}
  #sdw-input{flex:1;background:#0f1220;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#e6e8ee;padding:10px}
  #sdw-send{background:#7b5cff;border:0;color:#fff;border-radius:10px;padding:0 12px;min-width:68px;cursor:pointer}
  #sdw-bubble{position:fixed;right:22px;bottom:22px;background:#7b5cff;color:#fff;border:0;border-radius:999px;padding:10px 14px;box-shadow:0 8px 20px rgba(0,0,0,.3);cursor:pointer;display:none;z-index:999999}
  `;
  const st = document.createElement('style'); st.id = 'sdw-style'; st.textContent = css; document.head.appendChild(st);

  // ====== UI ======
  let root, body, input, sendBtn, ctaBtn, bubble, explainedOnce=false;

  function mount() {
    if (root) return;

    // Bubble (mostrata subito)
    bubble = document.createElement('button');
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
          <div id="sdw-title">
            <span id="sdw-avatar">🤖</span>
            <span>Assistente AI</span>
            <span id="sdw-status" title="Online"></span>
          </div>
          <button id="sdw-close" aria-label="Chiudi">×</button>
        </div>
        <div id="sdw-body"></div>
        <div id="sdw-foot">
          <a id="sdw-cta" href="${CTA_URL}" target="_blank" rel="noopener">Consulenza Gratuita</a>
          <input id="sdw-input" type="text" placeholder="Scrivi qui… (es. rivediamo il budget, consigli ROI)">
          <button id="sdw-send">Invia</button>
        </div>
      </div>`;
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

  function showPanel(){ root.classList.add('sdw-visible'); if (bubble) bubble.style.display = 'none'; }
  function hidePanel(){ root.classList.remove('sdw-visible'); if (bubble) bubble.style.display = 'inline-flex'; }
  function addRow(from, t){
    const r = document.createElement('div');
    r.className = 'sdw-row ' + from;
    if (from === 'ai') {
      r.innerHTML = `<span class="tag">🤖</span> ${t}`;
    } else {
      r.textContent = 'Tu: ' + t;
    }
    body.appendChild(r); body.scrollTop = body.scrollHeight;
  }

  // ====== LETTURA KPI DAL DOM ======
  function num(n){ if (n==null) return null; const x = (''+n).replace(/\./g,'').replace(',', '.').replace(/[^\-\d\.]/g,''); const f=parseFloat(x); return isFinite(f)?f:null; }
  function text(sel){ const el=document.querySelector(sel); return el?el.textContent:''; }

  function extractByRegex(re){ const m=re.exec(document.body.innerText); return m?m[1]:null; }

  function parseKpis(){
    // ROI (pattern robusto: cerca "ROI: 95,3%")
    let roiTxt =
      text('[data-kpi="roi"]') ||
      text('#kpi-roi') ||
      extractByRegex(/ROI[^0-9\-]*([-+]?\d+(?:[.,]\d+)?)\s*%/i);

    const roi = num(roiTxt);

    // ROAS (se c'è)
    let roasTxt =
      text('[data-kpi="roas"]') ||
      text('#kpi-roas') ||
      extractByRegex(/ROAS[^0-9]*([-+]?\d+(?:[.,]\d+)?)/i);
    const roas = num(roasTxt);

    // Perdita/Profitto (trova valore € se presente vicino a parole chiave)
    let profitTxt =
      extractByRegex(/(Perdita|Profitto|Utile)[^0-9\-]*([-+]?\d+(?:[.,]\d+)?)\s*€/i) ||
      extractByRegex(/([-+]?\d+(?:[.,]\d+)?)\s*€\s*(di\s*)?(perdita|utile|profitto)/i);
    const profit = num(profitTxt);

    return { roi, roas, profit };
  }

  function hasResults(){
    // presenza sezione risultati
    const hit = document.querySelector('#kpi-results, [data-kpi="results"], .kpi-results');
    if (hit) return true;
    // fallback: se nel testo pagina appare "strategia" e numeri come ROI
    const roiFound = !!extractByRegex(/ROI[^0-9\-]*([-+]?\d+(?:[.,]\d+)?)\s*%/i);
    return roiFound;
  }

  // ====== COPY DINAMICO ======
  function explainResults(){
    const k = parseKpis();
    explainedOnce = true;

    if (k.roi==null){
      addRow('ai', "Ho aperto i risultati ma non trovo il ROI in pagina. Aggiorna o riprova a cliccare «Calcola la tua crescita». Se vuoi ti guido nello step-by-step.");
      return;
    }

    if (k.roi >= 100){
      const msg =
        `ROI stimato ≈ ${k.roi.toFixed(1)}%. Bene! Per ogni 100€ investiti rientrano circa ${ (k.roi/100*100).toFixed(0) }€. `+
        `Il prossimo passo è **scalare** senza far esplodere CPL e CAC: vediamo insieme budget, conversioni chiave e punti di leva. `+
        `Prenota la **Consulenza Gratuita**: in call impostiamo un piano per crescere in modo prevedibile.`;
      addRow('ai', msg);
    } else {
      const msg =
        `ROI stimato ≈ ${k.roi.toFixed(1)}%. La strategia risulta **in perdita**: ogni 100€ investiti ne rientrano meno di 100. `+
        (k.profit!=null ? `Impatto stimato: ~${k.profit.toLocaleString('it-IT')}€.` : ``) + ` `+
        `Ti aiuto a rimetterti in rotta rivedendo **budget ADV, CPL atteso e tassi di conversione**. `+
        `Prenota la **Consulenza Gratuita**: analizziamo insieme come trasformare la strategia in un percorso scalabile.`;
      addRow('ai', msg);
    }
  }

  function guideUser(){
    addRow('ai',
      "Ciao! Per aiutarti al meglio compila il simulatore in 5 step:\n" +
      "1) **Seleziona il settore**\n" +
      "2) **Quanti funnel** attivi in parallelo\n" +
      "3) **Nuovi clienti/mese** desiderati\n" +
      "4) **Prezzo medio** del prodotto/servizio\n" +
      "5) **Margine di profitto (MOL)**\n" +
      "Poi premi **«Calcola la tua crescita»**: quando compaiono i risultati te li spiego io. Se vuoi scrivi **guidami**."
    );
  }

  // ====== BACKEND (facoltativo) + fallback locale ======
  async function ask(t) {
    addRow('me', t);

    // comandi rapidi
    if (/^guidami$/i.test(t)) { guideUser(); return; }
    if (/^spiega|^analizza|^analisi|^kpi|^risultati/i.test(t)) { explainResults(); return; }

    // se ci sono risultati, prova a spiegare
    if (hasResults() && !/ping|test/i.test(t)) { explainResults(); }

    // tentativo verso l'endpoint (se risponde, lo mostriamo; altrimenti fallback)
    try {
      const r = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode: 'analysis', prompt: t })
      });
      const j = await r.json().catch(() => ({}));
      if (j && (j.text || j.message)) {
        addRow('ai', (j.text || j.message));
        return;
      }
    } catch(e) { /* silence */ }

    // fallback smart
    if (/ping|test/i.test(t)) {
      addRow('ai', "Sono qui! 👋 Posso spiegarti i KPI o guidarti nella compilazione. Scrivi **spiega i risultati** oppure **guidami**.");
    } else if (!hasResults()) {
      addRow('ai', "Prima otteniamo i risultati: completa gli step e premi **«Calcola la tua crescita»**. Poi ti spiego tutto io.");
    } else {
      explainResults();
    }
  }

  // ====== API ======
  function open(opts={}) {
    mount(); showPanel();
    // autostart: se ho risultati spiego, altrimenti guido
    if (opts.autostart){
      if (hasResults()) explainResults();
      else guideUser();
    }
    // trigger esplicito (da sd-triggers.js) può forzare direttamente explain
    if (opts.forceExplain){ explainResults(); }
  }
  function close(){ hidePanel(); }

  // esponi pubblicamente
  window.SuiteAssistantChat = {
    open, close,
    ask: (t)=>{ mount(); showPanel(); ask(t); },
    explain: ()=>{ mount(); showPanel(); explainResults(); },
    guide: ()=>{ mount(); showPanel(); guideUser(); }
  };

  // Monta bubble subito
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  console.log('[SD] sd-chat.js pronto');

  // === carica i trigger (senza crossOrigin) ===
  var s2 = document.createElement('script');
  s2.src = '/sd-triggers.js';
  document.head.appendChild(s2);
})();
