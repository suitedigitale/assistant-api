/* public/sd-triggers.js — lettura KPI ancorata alle etichette + invio silente all’AI */
(function () {

  // Trova il bottone “Calcola la tua crescita”
  function findCalculateButton() {
    const all = Array.from(document.querySelectorAll('button, a'));
    return all.find(el => /calcola la tua crescita/i.test(el.textContent || ''));
  }

  // Numero IT -> float (gestisce € 1.590, -92,08%, 0,2x)
  function itNumber(str) {
    if (!str) return null;
    let s = (str+'').trim();

    // rimuovi tutto tranne cifre, segni, separatori, x e %
    // ma mantieni x e % per pattern successivi
    // normalizza migliaia/punto, decimali/virgola
    s = s.replace(/€|\s/g,'').replace(/[^\d.,xX%\-]/g,'').replace(/\.(?=\d{3}\b)/g,'').replace(',', '.');

    // prendi solo la parte numerica iniziale (es. "0.2x" -> "0.2")
    const m = s.match(/^-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return isFinite(n) ? n : null;
  }

  // Ritorna il PRIMO numero DOPO l’etichetta, nello stesso contenitore
  function numberRightAfterLabel(containerText, labelRegex, valueRegex) {
    const txt = (containerText || '').replace(/\s+/g,' ').trim();
    const mLabel = txt.match(labelRegex);
    if (!mLabel) return null;
    const idx = txt.indexOf(mLabel[0]);
    if (idx < 0) return null;
    const after = txt.slice(idx + mLabel[0].length);
    const mVal = after.match(valueRegex);
    return mVal ? itNumber(mVal[0]) : null;
  }

  // Cerca il “contenitore più piccolo” che contiene sia etichetta sia valore
  function readByLabel(labelRegex, valueRegex) {
    const nodes = Array.from(document.querySelectorAll('div,section,article,li,p,span'));
    let best = null;
    for (const el of nodes) {
      const t = (el.innerText || '').trim();
      if (!labelRegex.test(t)) continue;

      // prendi solo contenitori “piccoli” (per evitare wrapper enormi)
      if (t.length > 600) continue;

      // prova prima nel testo dell’elemento
      let val = numberRightAfterLabel(t, labelRegex, valueRegex);

      // fallback: prova nella stringa del parent immediato
      if (val == null && el.parentElement) {
        const pt = (el.parentElement.innerText || '').trim();
        val = numberRightAfterLabel(pt, labelRegex, valueRegex);
      }

      if (val != null) {
        const score = t.length; // penalizza contenitori grandi
        if (!best || score < best.score) best = { value: val, score, el };
      }
    }
    return best ? best.value : null;
  }

  // Legge i KPI agganciandosi alle etichette del simulatore
  function getKPIsFromPage() {
    const ROI_LABEL   = /ROI\b|ROI\s*previsionale/i;
    const ROAS_LABEL  = /ROAS\b|ROAS\s*stimato/i;
    const BUDGET_LAB  = /Budget\s*ADV\s*mensile/i;
    const REV_LABEL   = /Fatturato\s*stimato/i;
    const CPL_LABEL   = /\bCPL\b|\bCPL\s*stimato/i;
    const CPA_LABEL   = /\bCPA\b|\bCPA\s*stimato/i;

    const PERC_VAL    = /-?\d+(?:[.,]\d+)?\s*%/;            // -92,08%
    const ROAS_VAL    = /-?\d+(?:[.,]\d+)?\s*(?:x)?/i;      // 0,2x oppure 3
    const MONEY_VAL   = /(€\s*)?-?\d[\d.,]*/;               // € 17.125 o -18.897

    const roi     = readByLabel(ROI_LABEL,  PERC_VAL);
    const roas    = readByLabel(ROAS_LABEL, ROAS_VAL);
    const budget  = readByLabel(BUDGET_LAB, MONEY_VAL);
    const revenue = readByLabel(REV_LABEL,  MONEY_VAL);
    const cpl     = readByLabel(CPL_LABEL,  MONEY_VAL);
    const cpa     = readByLabel(CPA_LABEL,  MONEY_VAL);

    // validi se almeno ROI o ROAS sono presenti
    const ok = (roi !== null || roas !== null);
    return ok ? { roi, roas, cpl, cpa, budget, revenue } : null;
  }

  // Piccolo contesto utile (settore, target)
  function getContextNote() {
    const nodes = Array.from(document.querySelectorAll('label,div,span,p,button'));
    const take = (re) => {
      const el = nodes.find(n => re.test((n.textContent||'').trim()));
      if (!el) return null;
      const cand = el.nextElementSibling || el.parentElement;
      const txt = cand ? (cand.textContent||'').trim() : '';
      return txt && txt.length < 120 ? txt : null;
    };
    const target = take(/a chi vendi|tipo business/i);
    const sector = take(/settore/i);
    const list = [];
    if (target) list.push(`target: ${target}`);
    if (sector) list.push(`settore: ${sector}`);
    return list.length ? list.join(' · ') : null;
  }

  // Invoca la chat in “silenzioso” con i KPI
  function onCalculate() {
    const k = getKPIsFromPage();
    if (!k) {
      if (window.SuiteAssistantChat) window.SuiteAssistantChat.open({ autostart:true });
      return;
    }
    const note = getContextNote();
    if (window.SuiteAssistantChat) {
      window.SuiteAssistantChat.analyseKPIsSilently(k, note);
    }
  }

  // Wire al click del bottone
  function wireCalculate() {
    const btn = findCalculateButton();
    if (!btn || btn.__sdw) return;
    btn.__sdw = true;
    btn.addEventListener('click', () => {
      // dai tempo al DOM di aggiornare i riquadri
      setTimeout(onCalculate, 400);
    });
  }

  // Niente extra: la chat gestisce il benvenuto
  function wireOpenBubbleHint(){
    const bubble = document.getElementById('sdw-bubble');
    if (bubble && !bubble.__sdw) bubble.__sdw = true;
  }

  function boot() {
    wireCalculate();
    wireOpenBubbleHint();
    const mo = new MutationObserver(() => wireCalculate());
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
