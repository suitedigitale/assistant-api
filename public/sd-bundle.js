/* public/sd-bundle.js — carica chat + triggers con log */
(function () {
  var BASE = 'https://assistant-api-xi.vercel.app';

  function load(u, next){
    var s = document.createElement('script');
    s.src = u + (u.indexOf('?')>-1 ? '&' : '?') + 'v=' + Date.now(); // cache-bust aggressivo
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.onload = function(){ console.log('[SD] loaded', u); next && next(); };
    s.onerror = function(e){ console.error('[SD] load error', u, e); };
    document.head.appendChild(s);
  }

  // 1) chat -> 2) triggers (solo quando la chat è pronta)
  load(BASE + '/sd-chat.js', function(){ 
    load(BASE + '/sd-triggers.js');
  });
})();
