/* sd-triggers.js — mini triggers lato pagina */
(function () {
  try {
    console.log('[SD] sd-triggers.js attivo');

    // 1) Apri chat se clicchi un qualsiasi elemento con [data-sd-open]
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-sd-open]');
      if (!t) return;
      try { window.SuiteAssistantChat?.open({ autostart: true }); } catch (_) {}
    });

    // 2) Espone un helper per test: quickAsk('ping')
    window.quickAsk = function (text = 'ping') {
      try { window.SuiteAssistantChat?.open({ autostart: true }); } catch (_) {}
      setTimeout(() => {
        const input = document.getElementById('sdw-input');
        const send  = document.getElementById('sdw-send');
        if (input && send) {
          input.value = String(text);
          send.click();
        }
      }, 200);
    };

    // 3) (opzionale) Auto-apri se qualcuno setta questa flag
    if (window.__SD_AUTOSTART === true) {
      try { window.SuiteAssistantChat?.open({ autostart: true }); } catch (_) {}
    }
  } catch (e) {
    console.warn('[SD] trigger error:', e);
  }
})();
