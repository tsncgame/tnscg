(function () {
  const API = '/api/leaderboard';
  const $ = id => document.getElementById(id);
  const modal = $('leaderboardModal');
  const list = $('leaderboardList');
  const status = $('leaderboardStatus');

  function esc(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmt(n) { return Math.floor(Number(n) || 0).toLocaleString('pl-PL'); }
  function showStatus(text) { if (status) status.textContent = text; }
  function currentStats() {
    return {
      name: (localStorage.getItem('tsncg-web-name') || '').trim().slice(0, 24),
      coins: Number(window.tsncgGame?.coins?.() || 0),
      clicks: Number(window.tsncgGame?.clicks?.() || 0),
      level: Number(window.tsncgGame?.level?.() || 1)
    };
  }
  async function load() {
    if (!list) return;
    list.innerHTML = '<p>Ładowanie topki...</p>';
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP');
      const rows = await r.json();
      if (!rows.length) { list.innerHTML = '<p>Topka jest pusta. Historyczny moment.</p>'; return; }
      list.innerHTML = rows.map((x, i) => `<div class="stage-row"><b>#${i + 1} ${esc(x.name)}</b><span>💰 ${fmt(x.coins)} • 👆 ${fmt(x.clicks)} • LVL ${fmt(x.level)}</span></div>`).join('');
    } catch (_) {
      list.innerHTML = '<p>Nie udało się pobrać topki. Serwer może jeszcze nie działać.</p>';
    }
  }
  async function submit() {
    const stats = currentStats();
    let name = stats.name;
    if (!name) { showStatus('ZALOGUJ SIĘ, ABY WYSŁAĆ WYNIK'); return; }
    try {
      const r = await fetch(API, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...stats, name}) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Błąd');
      showStatus('WYNIK ZGŁOSZONY ✓');
      await load();
    } catch (_) { showStatus('BŁĄD WYSYŁANIA WYNIKU'); }
  }
  $('leaderboardButton')?.addEventListener('click', () => { modal?.classList.remove('hidden'); load(); });
  $('leaderboardClose')?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  $('leaderboardRefresh')?.addEventListener('click', load);
  $('leaderboardSubmit')?.addEventListener('click', submit);
})();
