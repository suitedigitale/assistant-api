/* public/sd-bundle.js — carica chat + triggers in sequenza */
(function () {
  var BASE = 'https://assistant-api-xi.vercel.app';

  function load(u, next){
    var s = document.createElement('script');
    s.src = u + (u.indexOf('?')>-1 ? '&' : '?') + 'v=6'; // bump per ricaricare CSS/JS
    s.defer = true;
    s.onload = function(){ next && next(); };
    document.head.appendChild(s);
  }

  load(BASE + '/sd-chat.js', function(){ load(BASE + '/sd-triggers.js'); });

  try { document.dispatchEvent(new Event('SuiteAssistantLoaderReady')); } catch(e){}
})();
