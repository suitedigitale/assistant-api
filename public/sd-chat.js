/* public/sd-chat.js — UI chat + CTA + quick replies + clamp */
(function () {
  const ENDPOINT = 'https://assistant-api-xi.vercel.app/api/assistant';
  const CTA_URL  = 'https://www.suitedigitale.it/candidatura/';

  // ---------- CSS ----------
  if (document.getElementById('sdw-style')) return;
  const css = `
  :root{--sd-accent:#8C52FF;--sd-muted:#b8bed2}
  #sdw-root{position:fixed;right:24px;bottom:24px;z-index:999999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:410px;max-width:calc(100vw - 32px);display:none}
  #sdw-root.sdw-visible{display:block}
  #sdw-panel{background:#0c0f1a;color:#eef1ff;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.45)}
  #sdw-head{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0f1220}
  #sdw-title{display:flex;align-items:center;gap:10px;font-weight:800}
  #sdw-title .ava{font-size:20px}
  #sdw-title .dot{width:8px;height:8px;background:#22c55e;border-radius:999px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
  #sdw-close{background:transparent;border:0;color:#e6e8ee;opacity:.8;cursor:pointer;font-size:18px}

  #sdw-body{height:380px;max-height:62vh;overflow:auto;padding:16px 12px;background:#0a0d17;scrollbar-width:thin}
  .sdw-row{display:flex;margin:10px 0}
  .sdw-msg{max-width:82%;padding:12px 14px;border-radius:14px;line-height:1.45;background:#151a33;border:1px solid rgba(255,255,255,.06)}
  .sdw-msg p{margin:.3rem 0}
  .sdw-msg ul{margin:.3rem 0 .6rem 1.1rem}
  .sdw-msg li{margin:.12rem 0}
  .sdw-msg h4{margin:.2rem 0 .4rem 0;font-size:15px;font-weight:800}
  .sdw-msg strong{font-weight:800}

  /* utente */
  .me{justify-content:flex-end}
  .me .sdw-msg{background:#9255FF;border:1px solid #7a3fe6;color:#fff}

  /* typing */
  .typing .sdw-msg{opacity:.9}
  .dots{display:inline-block;min-width:1.2em}
  .dots:after{content:'…';animation:sdDots 1.2s steps(3,end) infinite}
  @keyframes sdDots{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}

  /* clamp/leggi-tutto */
  .sdw-clamped{max-height:240px;overflow:hidden;position:relative}
  .sdw-clamped:after{content:'';position:absolute;left:0;right:0;bottom:0;height:56px;background:linear-gradient(to bottom, rgba(21,26,51,0), #151a33)}
  .sdw-more{margin-top:8px;background:transparent;border:0;color:#fff;text-decoration:underline;cursor:pointer}

  .chips{display:flex;gap:8px;flex-wrap:wrap;margin:8px 4px 0}
  .chip{background:#121632;border:1px solid rgba(255,255,255,.1);color:#dfe3ff;border-radius:999px;padding:8px 12px;cursor:pointer;font-size:13px}
  .chip:hover{border-color:var(--sd-accent)}

  #sdw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1220;flex-wrap:wrap}
  #sdw-input{flex:1;background:#0c1026;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e8
