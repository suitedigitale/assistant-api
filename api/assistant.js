// /api/assistant.js
export default async function handler(req, res) {
  // CORS molto aperto per il test
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Preflight
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({ ok: true, message: "assistant alive (GET)" });
    return;
  }

  if (req.method === "POST") {
    let body = {};
    try { body = req.body || {}; } catch {}
    res.status(200).json({ ok: true, message: "assistant alive (POST)", body });
    return;
  }

  res.status(405).json({ ok: false, message: "Method not allowed" });
}
