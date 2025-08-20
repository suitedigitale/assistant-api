// api/assistant.mjs  (ESM + body parser manuale)
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// CORS: permette più origini separate da virgola in CORS_ORIGIN
function setCors(req, res) {
  const allowList = (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map(s => s.trim());
  const origin = req.headers.origin;
  const allow = allowList.includes("*")
    ? "*"
    : (allowList.includes(origin) ? origin : allowList[0] || "*");
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok:false, message:"Method not allowed" });

  try {
    const { mode, prompt } = await readJsonBody(req);

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: [{ type: "text", text: "Scrivi in italiano. Tono professionale e chiaro. Usa paragrafi e liste dove utile." }]},
        { role: "user",   content: [{ type: "text", text: prompt || "" }]}
      ],
      max_output_tokens: 700
    });

    const text = response.output_text ||
                 (response.output?.[0]?.content?.[0]?.text?.value) ||
                 "Non è stato possibile generare una risposta in questo momento.";

    return res.status(200).json({ ok:true, text, mode: mode || null });
  } catch (err) {
    console.error("Assistant error:", err);
    return res.status(500).json({ ok:false, message: err?.message || "Errore nel generare la risposta." });
  }
}
