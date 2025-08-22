// api/ping.mjs — test minimo per capire se il deploy arriva e quale progetto/dominio stiamo colpendo
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    route: "/api/ping",
    method: req.method,
    ts: Date.now()
  });
}
