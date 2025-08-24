// api/assistant.js  (ESM su Vercel)

// --- CORS helper ---
function setCors(res) {
  res.setHeader('Vary', 'Origin');
  // in produzione puoi mettere il dominio esatto del tuo sito:
  // res.setHeader('Access-Control-Allow-Origin', 'https://www.suitedigitale.it');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// --- piccola utility per leggere in sicurezza il body JSON ---
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

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ ok: true, message: 'assistant alive (GET)' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  // ---- POST: chiama OpenAI ----
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, message: 'OPENAI_API_KEY mancante su Vercel' });
    return;
  }

  const { prompt = '', mode = 'chat', kpi = {} } = await readJson(req);

  // "Istruzioni" per l’AI in linea con Suite Digitale
  const system = `
Sei l'Assistente AI di Suite Digitale.
- Specializzato su: KPI (ROI/ROAS), budget, funnel, marketing & vendite, consulenza Suite Digitale.
- Se l'utente chiede cose off-topic, rispondi cortesemente che sei focalizzato su Suite Digitale e sui numeri del simulatore.
- Tono: chiaro, concreto, incoraggiante ma non generico. Offri sempre un next-step pratico.
- Se ricevi numeri/KPI, commentali e proponi azioni per migliorare.
- Quando utile ricorda la "Consulenza Gratuita" (https://www.suitedigitale.it/candidatura/).
  `.trim();

  // Se abbiamo KPI dal client possiamo inserirli nel contesto
  const kpiContext = kpi && Object.keys(kpi).length
    ? `\nDati KPI utente (se presenti): ${JSON.stringify(kpi)}\n`
    : '';

  const user = `${kpiContext}${prompt}`.trim();

  try {
    // Usiamo le Chat Completions per compatibilità ampia
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.5,
        messages: [
          { role: 'system', content: system },
          { role: 'user',    content: user }
        ]
      })
    });

    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content?.trim();

    if (!r.ok || !text) {
      // debug minimo in risposta
      res.status(200).json({
        ok: false,
        message: 'Non riesco a generare una risposta al momento.',
        debug: j?.error || j
      });
      return;
    }

    res.status(200).json({ ok: true, text });
  } catch (e) {
    res.status(200).json({ ok: false, message: 'Errore AI', error: String(e) });
  }
}
