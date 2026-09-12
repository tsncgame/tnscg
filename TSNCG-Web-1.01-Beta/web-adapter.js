(function () {
  const KEY = 'tsncg-web-save-v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; }
  }
  function write(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return { ok: true }; }
    catch (error) { return { ok: false, error: error.message }; }
  }
  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  window.tsncg = {
    loadSave: async () => read(),
    saveGame: async (data) => write(data),
    resetSave: async () => { localStorage.removeItem(KEY); return { ok: true }; },
    exportSave: async (data) => { downloadJson(data, 'TSNCG-save.json'); return { ok: true }; },
    importSave: async () => new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return resolve({ ok: false, canceled: true });
        try {
          const data = JSON.parse(await file.text());
          if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid');
          resolve({ ok: true, data });
        } catch (_) { resolve({ ok: false, canceled: false }); }
      };
      input.click();
    }),
    listMusic: async () => [],
    setFullscreen: async value => {
      try {
        if (value && !document.fullscreenElement) await document.documentElement.requestFullscreen();
        if (!value && document.fullscreenElement) await document.exitFullscreen();
      } catch (_) {}
      return !!document.fullscreenElement;
    },
    getFullscreen: async () => !!document.fullscreenElement
  };
})();
