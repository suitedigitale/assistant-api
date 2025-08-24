// --- formatter Markdown leggero: **bold**, newline-><br>, link cliccabili ---
function fmt(html) {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  let out = esc(html);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(https?:\/\/[^\s)]+)(\)?)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>$2');
  out = out.replace(/\n/g, '<br>');
  return out;
}

// --- mini suoni (solo dopo interazione utente) ---
let _userInteracted = false;
document.addEventListener('pointerdown', () => { _userInteracted = true; }, { once:true });

function beep(ms=120, freq=660, vol=0.03){
  if (!_userInteracted || !window.AudioContext) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type='sine'; osc.frequency.value=freq;
    gain.gain.value = vol;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); setTimeout(()=>{ osc.stop(); ctx.close(); }, ms);
  } catch {}
}

// --- bolla "sta scrivendo…" ---
let _typingRow = null;
function showTyping(){
  if (_typingRow) return;
  const r = document.createElement('div');
  r.className = 'sdw-row ai';
  r.innerHTML = `<span style="opacity:.85">Sta scrivendo</span>
  <span class="dots" style="display:inline-block;width:20px;text-align:left">...</span>`;
  body.appendChild(r); body.scrollTop = body.scrollHeight;
  _typingRow = r;

  // animazione "..." semplice
  let i=0; const el=r.querySelector('.dots');
  r._dotsTimer = setInterval(()=>{ el.textContent=['.','..','...'][i++%3]; }, 300);
}
function hideTyping(){
  if (!_typingRow) return;
  clearInterval(_typingRow._dotsTimer);
  _typingRow.remove(); _typingRow=null;
}

// --- chiamata all'endpoint + UI ---
async function ask(text) {
  addRow('me', text);

  showTyping();  // sta scrivendo
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ mode:'analysis', prompt:text })
    });
    const j = await r.json().catch(()=> ({}));
    hideTyping();
    const msg = j.text || j.message || JSON.stringify(j);
    const row = document.createElement('div');
    row.className = 'sdw-row ai';
    row.innerHTML = fmt(msg);
    body.appendChild(row); body.scrollTop = body.scrollHeight;
  } catch (e) {
    hideTyping();
    addRow('ai', 'Si è verificato un errore di rete. Riproviamo tra poco.');
  }
}

// prompt per analisi KPI (proiezioni)
function kpiPrompt(k, note) {
  const parts = [];
  if (typeof k.roi    === 'number') parts.push(`"roi": ${k.roi}`);
  if (typeof k.roas   === 'number') parts.push(`"roas": ${k.roas}`);
  if (typeof k.budget === 'number') parts.push(`"budget": ${k.budget}`);
  if (typeof k.revenue=== 'number') parts.push(`"revenue": ${k.revenue}`);
  if (typeof k.canone === 'number') parts.push(`"canone": ${k.canone}`);
  if (typeof k.profit === 'number') parts.push(`"profit": ${k.profit}`);
  const ctx = note ? `Contesto: ${note}.` : '';

  return `
Sei l'**Assistente AI** di Suite Digitale. I dati che seguono sono **proiezioni** generate da un simulatore
in base ai parametri inseriti dall'utente (non fotografano l'andamento passato, ma cosa accadrebbe con quei parametri).
Analizza in 4–7 punti con tono **tecnico ma amichevole ed energico**.

Dati (formato JSON):
{ ${parts.join(', ')} }

${ctx}

Regole:
- Spiega **cosa significano** i valori *come proiezioni*, non come storico.
- Se il ROI è negativo o il ROAS basso, evidenzia i rischi (pricing, margini, costi, conversioni).
- Se i numeri sono buoni, valorizza il potenziale ma invita comunque a definire una strategia scalabile.
- Inserisci un punto dedicato ai **benefici di Suite Digitale**: team integrato (strategist, media buyer, CRM specialist, setter/chatter)
  che unisce marketing e vendite in un unico flusso coordinato (no fornitori separati).
- Se utile, cita brevemente **idee di funnel** adatte al settore/target (da validare poi in consulenza).
- Concludi con una call to action chiara: **Richiedi un'analisi gratuita** (link: https://www.suitedigitale.it/candidatura/) oppure
  contatti diretti (Email: marketing@suitedigitale.it – WhatsApp: +393515094722).
- Usa **grassetti** per concetti chiave ed elenchi numerati o puntati quando aiutano la lettura.
- Non dare istruzioni “fai da te” dettagliate: punta il valore del nostro team dedicato.
`;
}

// API esposte al trigger
window.SuiteAssistantChat = window.SuiteAssistantChat || {};
window.SuiteAssistantChat.analyseKPIsSilently = function (kpis, note) {
  mount(); showPanel();
  beep(120, 760); // ding all'apertura da evento calcola (se l'utente ha interagito già sul sito)
  showTyping();
  // invia prompt senza mostrarlo in chat
  (async () => {
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'analysis', prompt: kpiPrompt(kpis, note) })
      });
      const j = await r.json().catch(()=> ({}));
      hideTyping();
      const row = document.createElement('div');
      row.className = 'sdw-row ai';
      row.innerHTML = fmt(j.text || j.message || JSON.stringify(j));
      body.appendChild(row); body.scrollTop = body.scrollHeight;
    } catch {
      hideTyping();
      addRow('ai','Ops, non riesco a completare l’analisi ora. Prova di nuovo o scrivimi qui sotto.');
    }
  })();
};
