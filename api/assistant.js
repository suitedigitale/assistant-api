// api/assistant.js  (ESM - Vercel)

// ---------- CORS ----------
function setCors(res) {
  res.setHeader('Vary', 'Origin');
  // In produzione puoi restringere al tuo dominio:
  // res.setHeader('Access-Control-Allow-Origin', 'https://www.suitedigitale.it');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function readJson(req) {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(Buffer.from(c));
    const raw = Buffer.concat(chunks).toString('utf8') || '{}';
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method === 'GET')      { res.status(200).json({ ok: true, message: 'assistant alive (GET)' }); return; }
  if (req.method !== 'POST')     { res.status(405).json({ ok: false, message: 'Method not allowed' }); return; }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { res.status(500).json({ ok:false, message:'OPENAI_API_KEY mancante su Vercel' }); return; }

  const { prompt = '', mode = 'chat', kpi = {} } = await readJson(req);

  // --------- GUIDA & BRAND (Suite Digitale) ----------
  const system = `
Sei l'Assistente AI di Suite Digitale (https://www.suitedigitale.it).
Specializzazione: simulatore KPI (ROI/ROAS), budget, funnel, marketing & vendite, piattaforma Suite Digitale e consulenza.

Identità e USP (sintesi breve ma incisiva):
- "Ti manca un team per crescere? Suite Digitale li unisce tutti."
- Forniamo un **reparto Marketing & Vendite completo** (strategist, media buyer, venditori telefonici) coordinato sullo **stesso progetto: il cliente**.
- Strategia su misura, non piani generici. Un **flusso operativo integrato**: landing, funnel, CRM, automazioni, campagne, presa appuntamenti.
- **Differenze dalle agenzie**: non solo campagne, ma anche CRM/automation e team di vendita; responsabilità unica, ottimizzazioni costanti, canali diretti con ogni reparto.
- Vantaggi ripetibili: più lead qualificati, agenda appuntamenti piena, pipeline chiare, accountability unica.

Contatti da offrire quando opportuno o se l'utente li chiede:
- Email: marketing@suitedigitale.it
- Telefono/WhatsApp: +393515094722
- Consulenza gratuita: https://www.suitedigitale.it/candidatura/

Stile di risposta:
- Tono chiaro, concreto, cordiale, orientato all'azione.
- Se l'utente fa domande off-topic, spiega gentilmente che sei specializzato sul servizio di Suite Digitale e sul simulatore KPI.
- Puoi dare consigli generici, **ma indirizza sempre** verso i benefici di affidarsi a Suite Digitale e la **Consulenza Gratuita** come primo step.

Se ricevi KPI (ROI/ROAS/budget/costi/lead ecc.):
- Analizza con obiettività in 4-6 punti sintetici.
- Se ROI negativo: spiega cosa significa con esempi semplici (es. “ogni 100€ ne rientrano meno di 100”), proponi azioni ad alto impatto e **invita** alla Consulenza Gratuita come primo passo operativo.
- Se ROI positivo: valorizza i risultati, indica leve per scalare (budget, conversioni, AOV), e **invita** comunque alla Consulenza Gratuita per costruire la macchina di crescita.
- NON proporre piani fai-da-te dettagliati; rimani su suggerimenti ad alto livello e sottolinea che il valore sta nell’avere il nostro team integrato marketing+vendite.

Output:
- Rispondi in italiano.
- Massimo 10 righe; usa elenchi puntati quando utile.
- In chiusura, breve invito alla **Consulenza Gratuita** (link).
  `.trim();

  const kpiContext = kpi && Object.keys(kpi).length
    ? `\nKPI utente:\n${JSON.stringify(kpi)}\n`
    : '';

  const user = `${kpiContext}${prompt}`.trim();

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.5,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content?.trim();

    if (!r.ok || !text) {
      res.status(200).json({ ok:false, message:'Non riesco a generare la risposta', debug: j?.error || j });
      return;
    }

    res.status(200).json({ ok:true, text });
  } catch (e) {
    res.status(200).json({ ok:false, message:'Errore AI', error:String(e) });
  }
}
