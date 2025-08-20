// Serverless Function per Vercel (CommonJS)
const OpenAI = require("openai");

// La chiave è in una variabile d'ambiente su Vercel (mai nel browser!)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  // --- CORS: consenti chiamate dal tuo dominio Framework360 ---
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const { mode, prompt } = req.body || {};

    // Responses API (moderna)
    const response = await client.responses.create({
      model: "gpt-4o-mini", // veloce ed economico; puoi cambiare modello
      input: [
        {
          role: "system",
          content: [{ type: "text", text: "Scrivi in italiano. Tono professionale, chiaro. Usa paragrafi e liste dove utile." }]
        },
        { role: "user", content: [{ type: "text", text: prompt || "" }] }
      ],
      max_output_tokens: 700
    });

    const text =
      response.output_text ||
      (response.output?.[0]?.content?.[0]?.text?.value) ||
      "Non è stato possibile generare una risposta in questo momento.";

    res.status(200).json({ ok: true, text, mode: mode || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Errore nel generare la risposta." });
  }
};
