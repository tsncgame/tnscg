(function(){
  const API_URL = 'https://tsncg.onrender.com';

  const $ = id => document.getElementById(id);

  const status = $('authStatus');
  const user = $('authUser');

  const loginForm = $('loginForm');
  const registerForm = $('registerForm');

  const loginTab = $('loginTab');
  const registerTab = $('registerTab');

  function msg(text, ok = false) {
    if (!status) return;

    status.textContent = text;
    status.className = 'auth-status ' + (ok ? 'ok' : '');
  }

  async function post(path, data) {
    const response = await fetch(${API_URL}${path}, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    const text = await response.text();

    let dataResponse = {};

    try {
      dataResponse = text
        ? JSON.parse(text)
        : {};
    } catch (_) {
      throw new Error(
        Serwer zwrócił nieprawidłową odpowiedź (${response.status})
      );
    }

    if (!response.ok) {
      throw new Error(
        dataResponse.error ||
        Błąd serwera (${response.status})
      );
    }

    return dataResponse;
  }

  /* =========================
     LOGOWANIE
  ========================= */

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();

    msg('LOGOWANIE...');

    try {
      await post('/api/login', {
        username: $('loginUsername')?.value || '',
        password: $('loginPassword')?.value || ''
      });

      msg('ZALOGOWANO ✓', true);

      setTimeout(() => {
        location.href = 'game.html';
      }, 250);

    } catch (error) {
      msg(error.message);
    }
  });

  /* =========================
     REJESTRACJA
  ========================= */

  registerForm?.addEventListener('submit', async event => {
    event.preventDefault();

    msg('TWORZENIE KONTA...');

    try {
      await post('/api/register', {
        username: $('registerUsername')?.value || '',
        password: $('registerPassword')?.value || ''
      });

      msg('KONTO UTWORZONE ✓', true);

      setTimeout(() => {
        location.href = 'game.html';
      }, 250);

    } catch (error) {
      msg(error.message);
    }
  });

  /* =========================
     ZAKŁADKA LOGOWANIA
  ========================= */

  loginTab?.addEventListener('click', () => {
    loginForm?.classList.remove('hidden');
    registerForm?.classList.add('hidden');

    loginTab.classList.add('active');
    registerTab?.classList.remove('active');
  });

  /* =========================
     ZAKŁADKA REJESTRACJI
  ========================= */

  registerTab?.addEventListener('click', () => {
    registerForm?.classList.remove('hidden');
    loginForm?.classList.add('hidden');

    registerTab.classList.add('active');
    loginTab?.classList.remove('active');
  });

  /* =========================
     SPRAWDZANIE SESJI
  ========================= */

  async function refresh() {
    try {
      const response = await fetch(${API_URL}/api/me, {
        cache: 'no-store',
        credentials: 'include'
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (user && data.user?.username) {
        user.textContent =
          'ZALOGOWANY: ' + data.user.username;
      }

    } catch (_) {
      // Brak połączenia z API.
    }
  }

  /* =========================
     WYLOGOWANIE
  ========================= */

  $('logoutButton')?.addEventListener('click', async () => {
    try {
      await fetch(${API_URL}/api/logout, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (_) {}

    location.reload();
  });

  refresh();
})();
