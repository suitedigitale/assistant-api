/* public/sd-triggers.js — parser KPI ancorato a etichette + invio silente all'AI */
(function () {
  // -------- utils numeri IT --------
  function itNumber(str) {
    if (!str) return null;
    let s = (str + '').trim();

    // normalizza: togli €/spazi, conserva segni, decimali, x e %
    s = s.replace(/€|\s/g, '')
         .replace(/[^\d.,xX%\-]/g, '')    // tieni solo ciò che serve
         .replace(/\.(?=\d{3}\b)/g, '')   // 17.125 -> 17125
         .replace(',', '.');              // 1,90 -> 1.90

    // cattura la parte numerica iniziale (0.2, -92.08, ecc.)
    const m = s.match(/^-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  const RE = {
    // etichette
    ROI:   /ROI\b|ROI\s*previsionale/i,
    ROAS:  /ROAS\b|ROAS\s*stimato/i,
    BUD:   /Budget\s*ADV\s*mensile/i,
    REV:   /Fatturato\s*stimato/i,
    CAN:   /Canone\s*Suite\s*Digitale/i,
    PROF:  /(Utile|Perdita)\s*mensile/i,

    // valori
    PERC:  /-?\d+(?:[.,]\d+)?\s*%/,           // -92,08%
    ROASV: /-?\d+(?:[.,]\d+)?\s*(?:x)?/i,     // 0,2x  oppure 3
    MONEY: /(€\s*)?-?\d[\d.,]*/               // € 17.125 o -18.897
  };

  // piccolo helper: cerca, vicino alla label, il primo elemento con numero valido
  function nearestNumberNode(labelEl, valueRegex) {
    if (!labelEl) return null;

    // 1) stesso nodo
    let t = (labelEl.innerText || '').trim();
    let m = t.match(valueRegex);
    if (m) return itNumber(m[0]);

    // 2) sibling successivi (prima riga col numero)
    let sib = labelEl.nextElementSibling;
    for (let i = 0; i < 5 && sib; i++, sib = sib.nextElementSibling) {
      const ts = (sib.innerText || '').trim();
      const mm = ts.match(valueRegex);
      if (mm) return itNumber(mm[0]);
    }

    // 3) container più vicino: risali max 4 genitori e cerca dentro
    let p = labelEl;
    for (let up = 0; up < 4 && p; up++, p = p.parentElement) {
      if (!p) break;
      const all = Array.from(p.querySelectorAll('*'));
      // scorri elementi nell'ordine: il primo con match vince
      for (const el of all) {
        const tx = (el.innerText || '').trim();
        const mv = tx.match(valueRegex);
        if (mv) return itNumber(mv[0]);
      }
    }
    return null;
  }

  // trova la label (elemento) cercando testo
  function findLabelElement(labelRegex) {
    const all = Array.from(document.querySelectorAll('div,section,article,li,p,span,h1,h2,h3,h4,h5,h6,label'));
    // priorità a elementi più piccoli (evita wrapper enormi)
    let best = null;
    for (const el of all) {
      const txt = (el.innerText || '').trim();
      if (!txt) continue;
      if (!labelRegex.test(txt)) continue;
      const score = txt.length;
      if (!best || score < best.len) best = { el, len: score };
    }
    return best ? best.el : null;
  }

  // lettura KPI singolo
  function readKPI(labelRegex, valueRegex) {
    const el = findLabelElement(labelRegex);
    return nearestNumberNode(el, valueRegex);
  }

  // firma KPI pagina
  function getKPIsFromPage() {
    const roi     = readKPI(RE.ROI,  RE.PERC);
    const roas    = readKPI(RE.ROAS, RE.ROASV);
    const budget  = readKPI(RE.BUD,  RE.MONEY);
    const revenue = readKPI(RE.REV,  RE.MONEY);
    const canone  = readKPI(RE.CAN,  RE.MONEY);
    let utile     = readKPI(RE.PROF, RE.MONEY);

    // se la label contiene "Perdita mensile" ed il numero è positivo, rendilo negativo.
    const profEl = findLabelElement(RE.PROF);
    if (profEl) {
      const lt = (profEl.innerText || '').toLowerCase();
      if (/perdita/i.test(lt) && typeof utile === 'number' && utile > 0) utile = -Math.abs(utile);
    }

    const ok = [roi, roas, budget, revenue].some(v => v !== null);
    if (!ok) return null;

    return { roi, roas, budget, revenue, canone, profit: utile };
  }

  // info contesto (settore/target) se reperibili
  function getContextNote() {
    const pick = (re) => {
      const all = Array.from(document.querySelectorAll('label,div,span,p,button,h4,h5'));
      const lab = all.find(n => re.test((n.textContent || '').trim()));
      if (!lab) return null;
      const next = lab.nextElementSibling || lab.parentElement;
      const val = next ? (next.textContent || '').trim() : '';
      return val && val.length < 140 ? val : null;
    };
    const target = pick(/a chi vendi|tipo business|B2B|B2C/i);
    const sector = pick(/settore/i);
    const v = [];
    if (target) v.push(`target: ${target}`);
    if (sector) v.push(`settore: ${sector}`);
    return v.join(' · ') || null;
  }

  // bottone "Calcola la tua crescita"
  function findCalculateButton() {
    const all = Array.from(document.querySelectorAll('button,a'));
    return all.find(el => /calcola la tua crescita/i.test(el.textContent || ''));
  }

  // invio silente alla chat
  function onCalculate() {
    const k = getKPIsFromPage();
    const ctx = getContextNote();
    if (window.SuiteAssistantChat && k) {
      window.SuiteAssistantChat.analyseKPIsSilently(k, ctx);
    } else if (window.SuiteAssistantChat) {
      window.SuiteAssistantChat.open({ autostart: true }); // fallback
    }
  }

  function wireCalculate() {
    const btn = findCalculateButton();
    if (!btn || btn.__sdw) return;
    btn.__sdw = true;
    btn.addEventListener('click', () => setTimeout(onCalculate, 450));
  }

  function boot() {
    wireCalculate();
    // se cambia il DOM (SPA), riallaccia
    const mo = new MutationObserver(() => wireCalculate());
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
