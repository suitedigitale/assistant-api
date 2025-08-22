// api/assistant.mjs  —  CORS HOTFIX + Responses API
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- CORS HOTFIX (temporaneo: consente tutti i domini) ---
function setCors(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true; // preflight gestito
  }
  return false;
}

// Lettura body JSON (senza framework)
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    try {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        if (!data) return resolve({});
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Invalid JSON body"));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

export default async function handler(req, res) {
  // CORS
  if (setCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const mode = body?.mode || "analysis";
    const userPrompt = (body?.prompt || "").toString().slice(0, 6000);
    const ctx = (body?.ctx || "").toString();

    if (!userPrompt) {
      return res.status(400).json({ ok: false, message: "Missing prompt" });
    }

    // Prompt finale (se passi un contesto opzionale)
    const prompt = ctx ? `${ctx}\n\nDomanda utente: "${userPrompt}"` : userPrompt;

    // Chiamata Responses API (modello configurabile via env)
    const resp = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: prompt,
    });

    // Estrai testo (SDK v4)
    const text =
      resp.output_text ||
      (Array.isArray(resp.content)
        ? resp.content.map((c) => c.text || "").join("")
        : "") ||
      "";

    return res.status(200).json({ ok: true, mode, text });
  } catch (err) {
    console.error("[assistant] error:", err);
    const message =
      err?.response?.data?.error?.message || err?.message || "Internal error";
    return res.status(500).json({ ok: false, message });
  }
}
