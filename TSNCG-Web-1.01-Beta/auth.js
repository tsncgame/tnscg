(function(){
  const API_URL = 'https://tsncg.onrender.com';

  const $ = id => document.getElementById(id);

  const status = $('authStatus');
  const user = $('authUser');

  const loginForm = $('loginForm');
  const registerForm = $('registerForm');

  const loginTab = $('loginTab');
  const registerTab = $('registerTab');

  function msg(t, ok = false) {
    if (status) {
      status.textContent = t;
      status.className = 'auth-status ' + (ok ? 'ok' : '');
    }
  }

  async function post(path, data) {
    const r = await fetch(${API_URL}${path}, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    const text = await r.text();

    let d = {};

    try {
      d = text ? JSON.parse(text) : {};
    } catch (_) {
      throw new Error(Serwer zwrócił nieprawidłową odpowiedź (${r.status}));
    }

    if (!r.ok) {
      throw new Error(d.error || Błąd serwera (${r.status}));
    }

    return d;
  }

  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();

    try {
      await post('/api/login', {
        username: $('loginUsername').value,
        password: $('loginPassword').value
      });

      msg('ZALOGOWANO ✓', true);

      setTimeout(() => {
        location.href = 'game.html';
      }, 250);

    } catch (err) {
      msg(err.message);
    }
  });

  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();

    try {
      await post('/api/register', {
        username: $('registerUsername').value,
        password: $('registerPassword').value
      });

      msg('KONTO UTWORZONE ✓', true);

      setTimeout(() => {
        location.href = 'game.html';
      }, 250);

    } catch (err) {
      msg(err.message);
    }
  });

  loginTab?.addEventListener('click', () => {
    loginForm?.classList.remove('hidden');
    registerForm?.classList.add('hidden');

    loginTab.classList.add('active');
    registerTab?.classList.remove('active');
  });

  registerTab?.addEventListener('click', () => {
    registerForm?.classList.remove('hidden');
    loginForm?.classList.add('hidden');

    registerTab.classList.add('active');
    loginTab?.classList.remove('active');
  });

  async function refresh() {
    try {
      const r = await fetch(${API_URL}/api/me, {
        cache: 'no-store',
        credentials: 'include'
      });

      if (r.ok) {
        const d = await r.json();

        if (user) {
          user.textContent = 'ZALOGOWANY: ' + d.user.username;
        }
      }
    } catch (_) {}
  }

  $('logoutButton')?.addEventListener('click', async () => {
    await fetch(${API_URL}/api/logout, {
      method: 'POST',
      credentials: 'include'
    });

    location.reload();
  });

  refresh();
})();
