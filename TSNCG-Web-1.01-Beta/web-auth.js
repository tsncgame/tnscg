(function(){
  const API_URL = 'https://tsncg.onrender.com';

  const gate = document.getElementById('authGate');
  const userEl = document.getElementById('webUser');

  async function check(){
    try {
      const r = await fetch(`${API_URL}/api/me`, {
        cache: 'no-store',
        credentials: 'include'
      });

      if (!r.ok) {
        gate?.classList.remove('hidden');
        document.body.classList.add('auth-required');
        return false;
      }

      const d = await r.json();

      if (userEl) {
        userEl.textContent = 'KONTO: ' + d.user.username;
      }

      return true;

    } catch (_) {
      gate?.classList.remove('hidden');
      document.body.classList.add('auth-required');
      return false;
    }
  }

  document.getElementById('webLogout')?.addEventListener('click', async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (_) {}

    location.href = 'index.html#konto';
  });

  window.tsncgWebAuthReady = check();
})();
