// api/assistant.mjs — tester v3

export default async function handler(req, res) {
  // CORS su ogni risposta (semplice ma efficace per i test)
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  // Preflight
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // GET di prova: deve SEMPRE rispondere così
  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      message: "assistant alive (GET) v3",
      method: req.method,
      ts: Date.now()
    });
    return;
  }

  // POST di prova: idem
  if (req.method === "POST") {
    res.status(200).json({
      ok: true,
      message: "assistant alive (POST) v3",
      method: req.method,
      ts: Date.now()
    });
    return;
  }

  // Qualsiasi altro metodo
  res.status(405).json({ ok: false, message: "Method not allowed", method: req.method });
}
