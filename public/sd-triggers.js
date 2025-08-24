/* public/sd-triggers.js — ascolta “Calcola la tua crescita”, legge i KPI, invia in silenzio */
(function () {

  // Trova bottone “Calcola la tua crescita”
  function findCalculateButton() {
    const all = Array.from(document.querySelectorAll('button, a'));
    return all.find(el => /calcola la tua crescita/i.test(el.textContent || ''));
  }

  // Utility: numero italiano -> float (accetta “-95,36%”, “€ 1.590”)
  function itNumber(str) {
    if (!str) return null;
    const s = (str+'').replace(/\s/g,'').replace('€','').replace(/[^0-9,.\-]/g,'').replace(/\./g,'').replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  // Cerca una card che contenga label + un valore dentro
  function readMetric(labelRegex, valuePattern) {
    const nodes = Array.from(document.querySelectorAll('section,div,li,span,p,article'));
    for (const el of nodes) {
      const t = (el.textContent||'').trim();
      if (labelRegex.test(t)) {
        const m = t.match(valuePattern);
        if (m) return itNumber(m[0]);
        // prova nei discendenti
        const sub = (Array.from(el.querySelectorAll('*')).map(n=>n.textContent).join(' ')) || '';
        const m2 = sub.match(valuePattern);
        if (m2) return itNumber(m2[0]);
      }
    }
    return null;
  }

  // Lettura robusta dei KPI dalle “schede” del simulatore
  function getKPIsFromPage() {
    // percentuali
    const roi   = readMetric(/roi/i,   /-?\d+(?:[.,]\d+)?\s*%/i);
    const roas  = readMetric(/roas/i,  /-?\d+(?:[.,]\d+)?/i);
    // euro / importi
    const budget    = readMetric(/budget\s*adv/i, /(€\s*)?\d[\d\.\,]*/i);
    const revenue   = readMetric(/fatturato/i,     /(€\s*)?\d[\d\.\,]*/i);
    const cpl       = readMetric(/\bCPL\b|\bCPL\s*stimato/i, /(€\s*)?\d[\d\.\,]*/i);
    const cpa       = readMetric(/\bCPA\b|\bCPA\s*stimato/i, /(€\s*)?\d[\d\.\,]*/i);

    // validi solo se ROI o ROAS presenti
    const ok = (roi !== null || roas !== null);
    return ok ? { roi, roas, cpl, cpa, budget, revenue } : null;
  }

  // Contesto extra: prova a leggere “settore” e “a chi vendi”
  function getContextNote() {
    const nodes = Array.from(document.querySelectorAll('label,div,span,p,button'));
    const pick = (re) => {
      const el = nodes.find(n => re.test((n.textContent||'').trim()));
      if (!el) return null;
      // prendi qualcosa vicino (es. valore visibile)
      const sib = el.nextElementSibling || el.parentElement;
      const txt = sib ? (sib.textContent||'').trim() : '';
      return txt && txt.length < 120 ? txt : null;
    };
    const target = pick(/a chi vendi|tipo business/i);
    const sector = pick(/settore/i);
    const list = [];
    if (target) list.push(`target: ${target}`);
    if (sector) list.push(`settore: ${sector}`);
    return list.length ? list.join(' · ') : null;
  }

  // Apri chat e analizza KPI in silenzio
  function onCalculate() {
    const k = getKPIsFromPage();
    if (!k) {
      // Non forzare: apri chat con benvenuto se KPI non ci sono
      if (window.SuiteAssistantChat) window.SuiteAssistantChat.open({ autostart:true });
      return;
    }
    const note = getContextNote();
    if (window.SuiteAssistantChat) {
      window.SuiteAssistantChat.analyseKPIsSilently(k, note);
    }
  }

  // Listener sul bottone “Calcola la tua crescita”
  function wireCalculate() {
    const btn = findCalculateButton();
    if (!btn || btn.__sdw) return;
    btn.__sdw = true;
    btn.addEventListener('click', () => {
      // lascia il tempo alla pagina di aggiornare i risultati
      setTimeout(onCalculate, 250);
    });
  }

  // Se l’utente apre la chat senza KPI -> guida alla compilazione
  function wireOpenBubbleHint() {
    // bubble definito dallo script chat
    const bubble = document.getElementById('sdw-bubble');
    if (!bubble || bubble.__sdw) return;
    bubble.__sdw = true;
    bubble.addEventListener('click', () => {
      // la chat gestisce da sola il messaggio di benvenuto
    });
  }

  function boot() {
    wireCalculate();
    wireOpenBubbleHint();

    // alcune pagine ricaricano componenti dinamicamente
    const mo = new MutationObserver(() => wireCalculate());
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
