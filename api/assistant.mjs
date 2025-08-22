// api/assistant.mjs — TINY CORS TEST (niente OpenAI, solo CORS OK)
export default async function handler(req, res) {
  // CORS sempre, per ogni risposta
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Preflight
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Per test: se apri l'URL nel browser (GET) vedi JSON e DEVE avere gli header CORS
  if (req.method === "GET") {
    res.status(200).json({ ok: true, message: "assistant alive (GET)" });
    return;
  }

  // POST minimale
  if (req.method === "POST") {
    res.status(200).json({ ok: true, message: "assistant alive (POST)" });
    return;
  }

  // Qualsiasi altro metodo
  res.status(405).json({ ok: false, message: "Method not allowed" });
}
