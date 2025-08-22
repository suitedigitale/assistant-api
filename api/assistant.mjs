// api/assistant.mjs
// Endpoint Vercel (ESM). CORS safe + echo "pong" per test rapido.

export default async function handler(req, res) {
  // --- CORS ---
  const origin = req.headers.origin || "";
  const allowList = (process.env.ALLOW_ORIGINS || process.env.CORS_ORIGIN || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const allowed = allowList.includes(origin);

  // Header CORS su TUTTE le risposte (anche errori e preflight)
  res.setHeader("Vary", "Origin");
  if (allowed) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Solo POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    // Body JSON (Vercel lo passa già parsato; fallback per sicurezza)
    const body = typeof req.body === "object" && req.body !== null
      ? req.body
      : JSON.parse(req.body || "{}");

    const { mode, prompt } = body;

    // --- TEST: rispondo "pong" così verifichi CORS dal sito ---
    // Quando vuoi attivare OpenAI, commenta queste 2 righe e usa il blocco sotto.
    const text = `pong: ho ricevuto "${prompt || ""}" (mode: ${mode || "n/a"})`;
    return res.status(200).json({ ok: true, text });

    /*  ====== (OPZIONALE) RIATTIVA OPENAI QUI SOTTO ======

    import OpenAI from "openai";
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, message: "Missing OPENAI_API_KEY" });
    }

    const sys = "Sei l'Assistente Strategico di Suite Digitale. Rispondi in italiano, chiaro e pratico.";
    const user = prompt || "Ping di prova";

    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user",   content: user }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const aiText = chat.choices?.[0]?.message?.content?.trim() || "Nessuna risposta.";
    return res.status(200).json({ ok: true, text: aiText });

    ====== FINE BLOCCO OPENAI ====== */
  } catch (err) {
    console.error("[assistant/api] error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
