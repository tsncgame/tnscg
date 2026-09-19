const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

const MAX_LEADERBOARD = 100;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dni

const RATE = new Map();

if (!process.env.DATABASE_URL) {
  console.error('Brak zmiennej środowiskowej DATABASE_URL. Ustaw ją w panelu Render (Environment).');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* =========================
   USERS — walidacja
========================= */

function cleanName(name) {
  return String(name || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 24);
}

function validUsername(name) {
  return /^[a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]{3,24}$/.test(name);
}

function validPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 128
  );
}

/* =========================
   HASŁA
   Trzymane razem w jednym polu password_hash jako "sól:hash".
========================= */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = String(storedHash).split(':');
    if (!salt || !hash) return false;

    const got = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');

    return (
      expected.length === got.length &&
      crypto.timingSafeEqual(got, expected)
    );
  } catch (_) {
    return false;
  }
}

/* =========================
   SESJE
   Token trafia do ciasteczka; w bazie trzymamy tylko jego hash (sha256),
   więc kradzież zrzutu bazy nie daje gotowych tokenów sesji.
========================= */

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookies(req) {
  const out = {};

  String(req.headers.cookie || '')
    .split(';')
    .forEach(x => {
      const i = x.indexOf('=');
      if (i > 0) {
        out[x.slice(0, i).trim()] = decodeURIComponent(x.slice(i + 1).trim());
      }
    });

  return out;
}

async function getSession(req) {
  const token = parseCookies(req).tsncg_session;
  if (!token) return null;

  const tokenHash = hashToken(token);

  const { rows } = await pool.query(
    `SELECT id, user_id, verified_clicks, last_batch_at, expires_at
     FROM sessions
     WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash]
  );

  const session = rows[0];
  if (!session) return null;

  const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(`UPDATE sessions SET expires_at = $1 WHERE id = $2`, [
    newExpiry,
    session.id
  ]);

  return session;
}

async function setSession(res, userId) {
  const token = newToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, created_at, verified_clicks, last_batch_at)
     VALUES ($1, $2, $3, now(), 0, now())`,
    [userId, tokenHash, expiresAt]
  );

  res.setHeader(
    'Set-Cookie',
    `tsncg_session=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
  );
}

async function clearSession(res, req) {
  const token = parseCookies(req).tsncg_session;

  if (token) {
    await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
  }

  res.setHeader(
    'Set-Cookie',
    'tsncg_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
  );
}

async function userForSession(session) {
  if (!session) return null;

  const { rows } = await pool.query(
    `SELECT id, username, kapsle FROM users WHERE id = $1`,
    [session.user_id]
  );

  return rows[0] || null;
}

/* =========================
   CORS
========================= */

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin) return {};

  const allowed =
    /^https:\/\/(?:[a-zA-Z0-9-]+\.)*pages\.dev$/.test(origin) ||
    /^https?:\/\/localhost(?::\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin);

  if (!allowed) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

/* =========================
   JSON / RATE LIMIT / BODY
========================= */

function json(res, status, data, extra = {}) {
  const body = JSON.stringify(data);

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'same-origin',
    ...extra
  });

  res.end(body);
}

function rateLimit(req, key, max, windowMs) {
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const k = key + ':' + ip;

  const x = RATE.get(k) || { start: now, count: 0 };

  if (now - x.start > windowMs) {
    x.start = now;
    x.count = 0;
  }

  x.count++;
  RATE.set(k, x);

  return x.count <= max;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });

    req.on('error', reject);
  });
}

/* =========================
   STATS
========================= */

function cleanStats(data) {
  const n = x => Math.max(0, Math.floor(Number(x) || 0));

  return {
    coins: n(data.coins),
    clicks: n(data.clicks),
    level: Math.max(1, n(data.level)),
    criticalClicks: n(data.criticalClicks)
  };
}

function publicRow(row, i) {
  return {
    rank: i + 1,
    name: row.username,
    coins: Number(row.coins),
    clicks: Number(row.clicks),
    level: row.level,
    verifiedClicks: Number(row.verified_clicks)
  };
}

/* =========================
   SERVER
========================= */

const server = http.createServer(async (req, res) => {
  let route;

  try {
    route = decodeURIComponent(req.url.split('?')[0]);
  } catch (_) {
    return json(res, 400, { error: 'Bad URL' });
  }

  const cors = corsHeaders(req);

  if (route.startsWith('/api/')) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      return res.end();
    }

    let session = null;
    let user = null;

    try {
      session = await getSession(req);
      user = await userForSession(session);
    } catch (err) {
      console.error('Błąd sesji/DB:', err.message);
      return json(res, 500, { error: 'Błąd serwera.' }, cors);
    }

    /* ===================== REGISTER ===================== */
    if (route === '/api/register' && req.method === 'POST') {
      if (!rateLimit(req, 'register', 5, 60_000)) {
        return json(res, 429, { error: 'Za dużo prób. Spróbuj później.' }, cors);
      }

      try {
        const data = await readBody(req);
        const username = cleanName(data.username);
        const password = data.password;

        if (!validUsername(username)) {
          return json(res, 400, { error: 'Nick: 3-24 znaków, litery/cyfry/_/-.' }, cors);
        }

        if (!validPassword(password)) {
          return json(res, 400, { error: 'Hasło musi mieć 8-128 znaków.' }, cors);
        }

        const passwordHash = hashPassword(password);

        let newUserId;

        try {
          const { rows } = await pool.query(
            `INSERT INTO users (username, password_hash, created_at)
             VALUES ($1, $2, now())
             RETURNING id`,
            [username, passwordHash]
          );
          newUserId = rows[0].id;
        } catch (err) {
          if (err.code === '23505') {
            return json(res, 409, { error: 'Taki nick już istnieje.' }, cors);
          }
          throw err;
        }

        await pool.query(
          `INSERT INTO scores (user_id, clicks, level, coins, verified_clicks, updated_at)
           VALUES ($1, 0, 1, 0, 0, now())
           ON CONFLICT (user_id) DO NOTHING`,
          [newUserId]
        );

        await setSession(res, newUserId);

        return json(res, 201, { ok: true, user: { username } }, cors);
      } catch (_) {
        return json(res, 400, { error: 'Nieprawidłowe dane.' }, cors);
      }
    }

    /* ===================== LOGIN ===================== */
    if (route === '/api/login' && req.method === 'POST') {
      if (!rateLimit(req, 'login', 10, 60_000)) {
        return json(res, 429, { error: 'Za dużo prób logowania. Spróbuj później.' }, cors);
      }

      try {
        const data = await readBody(req);
        const username = cleanName(data.username);

        const { rows } = await pool.query(
          `SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER($1)`,
          [username]
        );

        const u = rows[0];

        if (!u || !verifyPassword(data.password || '', u.password_hash)) {
          return json(res, 401, { error: 'Nieprawidłowy nick lub hasło.' }, cors);
        }

        await setSession(res, u.id);

        return json(res, 200, { ok: true, user: { username: u.username } }, cors);
      } catch (_) {
        return json(res, 400, { error: 'Nieprawidłowe dane.' }, cors);
      }
    }

    /* ===================== LOGOUT ===================== */
    if (route === '/api/logout' && req.method === 'POST') {
      await clearSession(res, req);
      return json(res, 200, { ok: true }, cors);
    }

    /* ===================== ME ===================== */
    if (route === '/api/me' && req.method === 'GET') {
      if (!user) {
        return json(res, 401, { authenticated: false }, cors);
      }

      return json(
        res,
        200,
        {
          authenticated: true,
          user: { username: user.username, kapsle: Number(user.kapsle) }
        },
        cors
      );
    }

    /* ===================== VERIFY CLICKS ===================== */
    if (route === '/api/verify-clicks' && req.method === 'POST') {
      if (!user || !session) {
        return json(res, 401, { error: 'Zaloguj się.' }, cors);
      }

      if (!rateLimit(req, 'clickbatch', 120, 60_000)) {
        return json(res, 429, { error: 'Za dużo żądań.' }, cors);
      }

      try {
        const data = await readBody(req);
        const delta = Math.floor(Number(data.delta) || 0);
        const now = Date.now();

        if (delta < 0 || delta > 50) {
          return json(res, 400, { error: 'Podejrzany pakiet klików.' }, cors);
        }

        const lastBatch = new Date(session.last_batch_at).getTime();
        const elapsed = Math.max(1, now - lastBatch) / 1000;
        const allowed = Math.min(50, Math.ceil(elapsed * 45) + 5);

        if (delta > allowed) {
          return json(
            res,
            429,
            {
              error: 'Tempo klików przekracza limit antycheata.',
              verifiedClicks: Number(session.verified_clicks)
            },
            cors
          );
        }

        const { rows } = await pool.query(
          `UPDATE sessions
           SET verified_clicks = verified_clicks + $1, last_batch_at = now()
           WHERE id = $2
           RETURNING verified_clicks`,
          [delta, session.id]
        );

        return json(
          res,
          200,
          { ok: true, verifiedClicks: Number(rows[0].verified_clicks) },
          cors
        );
      } catch (_) {
        return json(res, 400, { error: 'Nieprawidłowy pakiet.' }, cors);
      }
    }

    /* ===================== LEADERBOARD GET ===================== */
    if (route === '/api/leaderboard' && req.method === 'GET') {
      const { rows } = await pool.query(
        `SELECT u.username, s.coins, s.clicks, s.level, s.verified_clicks
         FROM scores s
         JOIN users u ON u.id = s.user_id
         ORDER BY s.coins DESC, s.verified_clicks DESC, s.clicks DESC, s.level DESC
         LIMIT $1`,
        [MAX_LEADERBOARD]
      );

      return json(res, 200, rows.map(publicRow), cors);
    }

    /* ===================== LEADERBOARD POST ===================== */
    if (route === '/api/leaderboard' && req.method === 'POST') {
      if (!user || !session) {
        return json(res, 401, { error: 'Zaloguj się, żeby wejść do topki.' }, cors);
      }

      if (!rateLimit(req, 'score', 6, 60_000)) {
        return json(res, 429, { error: 'Za dużo zgłoszeń wyniku.' }, cors);
      }

      try {
        const stats = cleanStats(await readBody(req));

        const { rows: existingRows } = await pool.query(
          `SELECT clicks, verified_clicks FROM scores WHERE user_id = $1`,
          [user.id]
        );

        const existing = existingRows[0];
        const previousClicks = existing ? Number(existing.clicks) : 0;
        const verified = Math.max(
          Number(session.verified_clicks),
          existing ? Number(existing.verified_clicks) : 0
        );

        if (stats.clicks < previousClicks) {
          return json(res, 400, { error: 'Wynik klików nie może się cofać.' }, cors);
        }

        const newClicks = stats.clicks - previousClicks;
        const maxUnverified = verified + 500;

        if (stats.clicks > maxUnverified) {
          return json(
            res,
            400,
            {
              error: 'Wynik odrzucony przez antycheat. Graj normalnie i zgłaszaj wynik po synchronizacji.',
              verifiedClicks: verified
            },
            cors
          );
        }

        if (stats.coins > 10 ** 15 || stats.clicks > 10 ** 12 || stats.level > 1e6) {
          return json(res, 400, { error: 'Wynik poza limitem.' }, cors);
        }

        const finalVerified = Math.max(verified, newClicks + previousClicks);

        const { rows } = await pool.query(
          `INSERT INTO scores (user_id, coins, clicks, level, verified_clicks, updated_at)
           VALUES ($1, $2, $3, $4, $5, now())
           ON CONFLICT (user_id) DO UPDATE SET
             coins = GREATEST(scores.coins, EXCLUDED.coins),
             clicks = GREATEST(scores.clicks, EXCLUDED.clicks),
             level = GREATEST(scores.level, EXCLUDED.level),
             verified_clicks = GREATEST(scores.verified_clicks, EXCLUDED.verified_clicks),
             updated_at = now()
           RETURNING coins, clicks, level, verified_clicks`,
          [user.id, stats.coins, stats.clicks, stats.level, finalVerified]
        );

        const row = rows[0];

        const { rows: rankRows } = await pool.query(
          `SELECT COUNT(*)::int AS rank
           FROM scores
           WHERE coins > $1
              OR (coins = $1 AND verified_clicks > $2)
              OR (coins = $1 AND verified_clicks = $2 AND clicks > $3)`,
          [row.coins, row.verified_clicks, row.clicks]
        );

        return json(
          res,
          201,
          {
            rank: rankRows[0].rank + 1,
            name: user.username,
            coins: Number(row.coins),
            clicks: Number(row.clicks),
            level: row.level,
            verifiedClicks: Number(row.verified_clicks)
          },
          cors
        );
      } catch (_) {
        return json(res, 400, { error: 'Nieprawidłowe dane.' }, cors);
      }
    }

    /* ===================== REDEEM PROMO CODE ===================== */
    if (route === '/api/redeem' && req.method === 'POST') {
      if (!user) {
        return json(res, 401, { error: 'Zaloguj się, żeby wykorzystać kod.' }, cors);
      }

      if (!rateLimit(req, 'redeem', 10, 60_000)) {
        return json(res, 429, { error: 'Za dużo prób. Spróbuj później.' }, cors);
      }

      const client = await pool.connect();

      try {
        const data = await readBody(req);
        const code = String(data.code || '').trim().toUpperCase();

        if (!code) {
          return json(res, 400, { error: 'Podaj kod.' }, cors);
        }

        await client.query('BEGIN');

        const { rows: codeRows } = await client.query(
          `SELECT id, kapsle_reward, uses_left, active, expires_at
           FROM promo_codes
           WHERE code = $1
           FOR UPDATE`,
          [code]
        );

        const promo = codeRows[0];

        if (!promo || !promo.active) {
          await client.query('ROLLBACK');
          return json(res, 404, { error: 'Nieprawidłowy kod.' }, cors);
        }

        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
          await client.query('ROLLBACK');
          return json(res, 410, { error: 'Ten kod już wygasł.' }, cors);
        }

        if (promo.uses_left <= 0) {
          await client.query('ROLLBACK');
          return json(res, 410, { error: 'Ten kod został już w pełni wykorzystany.' }, cors);
        }

        const { rows: alreadyUsed } = await client.query(
          `SELECT 1 FROM promo_redemptions WHERE user_id = $1 AND code_id = $2`,
          [user.id, promo.id]
        );

        if (alreadyUsed[0]) {
          await client.query('ROLLBACK');
          return json(res, 409, { error: 'Już wykorzystałeś ten kod.' }, cors);
        }

        await client.query(
          `UPDATE promo_codes SET uses_left = uses_left - 1 WHERE id = $1`,
          [promo.id]
        );

        await client.query(
          `INSERT INTO promo_redemptions (user_id, code_id) VALUES ($1, $2)`,
          [user.id, promo.id]
        );

        const { rows: userRows } = await client.query(
          `UPDATE users SET kapsle = kapsle + $1 WHERE id = $2 RETURNING kapsle`,
          [promo.kapsle_reward, user.id]
        );

        await client.query('COMMIT');

        return json(
          res,
          200,
          {
            ok: true,
            reward: promo.kapsle_reward,
            kapsle: Number(userRows[0].kapsle)
          },
          cors
        );
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Błąd redeem:', err.message);
        return json(res, 500, { error: 'Błąd serwera.' }, cors);
      } finally {
        client.release();
      }
    }

    /* ===================== ACHIEVEMENTS ===================== */
    if (route === '/api/achievements' && req.method === 'GET') {
      if (!user) {
        return json(res, 401, { error: 'Zaloguj się.' }, cors);
      }

      const { rows } = await pool.query(
        `SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = $1`,
        [user.id]
      );

      return json(
        res,
        200,
        rows.map(r => ({ id: r.achievement_id, unlockedAt: r.unlocked_at })),
        cors
      );
    }

    if (route === '/api/achievements/unlock' && req.method === 'POST') {
      if (!user) {
        return json(res, 401, { error: 'Zaloguj się.' }, cors);
      }

      if (!rateLimit(req, 'achievement', 30, 60_000)) {
        return json(res, 429, { error: 'Za dużo żądań.' }, cors);
      }

      try {
        const data = await readBody(req);
        const achievementId = String(data.achievementId || '').trim().slice(0, 64);

        if (!achievementId) {
          return json(res, 400, { error: 'Brak identyfikatora achievementu.' }, cors);
        }

        await pool.query(
          `INSERT INTO achievements (user_id, achievement_id, unlocked_at)
           VALUES ($1, $2, now())
           ON CONFLICT (user_id, achievement_id) DO NOTHING`,
          [user.id, achievementId]
        );

        return json(res, 200, { ok: true }, cors);
      } catch (_) {
        return json(res, 400, { error: 'Nieprawidłowe dane.' }, cors);
      }
    }

    /* ===================== DAILY QUESTS ===================== */
    if (route === '/api/daily-quests' && req.method === 'GET') {
      if (!user) {
        return json(res, 401, { error: 'Zaloguj się.' }, cors);
      }

      const { rows } = await pool.query(
        `SELECT quest_id, progress, completed
         FROM daily_quests
         WHERE user_id = $1 AND quest_date = CURRENT_DATE`,
        [user.id]
      );

      return json(
        res,
        200,
        rows.map(r => ({
          id: r.quest_id,
          progress: Number(r.progress),
          completed: r.completed
        })),
        cors
      );
    }

    if (route === '/api/daily-quests/progress' && req.method === 'POST') {
      if (!user) {
        return json(res, 401, { error: 'Zaloguj się.' }, cors);
      }

      if (!rateLimit(req, 'quest', 60, 60_000)) {
        return json(res, 429, { error: 'Za dużo żądań.' }, cors);
      }

      try {
        const data = await readBody(req);
        const questId = String(data.questId || '').trim().slice(0, 64);
        const progress = Math.max(0, Math.floor(Number(data.progress) || 0));
        const completed = Boolean(data.completed);

        if (!questId) {
          return json(res, 400, { error: 'Brak identyfikatora questa.' }, cors);
        }

        await pool.query(
          `INSERT INTO daily_quests (user_id, quest_date, quest_id, progress, completed)
           VALUES ($1, CURRENT_DATE, $2, $3, $4)
           ON CONFLICT (user_id, quest_date, quest_id) DO UPDATE SET
             progress = GREATEST(daily_quests.progress, EXCLUDED.progress),
             completed = daily_quests.completed OR EXCLUDED.completed`,
          [user.id, questId, progress, completed]
        );

        return json(res, 200, { ok: true }, cors);
      } catch (_) {
        return json(res, 400, { error: 'Nieprawidłowe dane.' }, cors);
      }
    }

    /* ===================== API 404 ===================== */
    return json(res, 404, { error: 'API not found' }, cors);
  }

  /* ======================= STATIC FILES ======================= */
  serveFile(req, res);
});

/* =========================
   STATIC SERVER
========================= */

function serveFile(req, res) {
  let url;

  try {
    url = decodeURIComponent(req.url.split('?')[0]);
  } catch (_) {
    return json(res, 400, { error: 'Bad URL' });
  }

  if (url === '/') url = '/index.html';

  const file = path.normalize(path.join(ROOT, url));

  if (!file.startsWith(ROOT)) {
    return json(res, 403, { error: 'Forbidden' });
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      return json(res, 404, { error: 'Not found' });
    }

    const ext = path.extname(file).toLowerCase();

    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.wav': 'audio/wav'
    };

    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'same-origin'
    });

    fs.createReadStream(file).pipe(res);
  });
}

/* =========================
   OKRESOWE SPRZĄTANIE WYGASŁYCH SESJI
========================= */

setInterval(() => {
  pool.query(`DELETE FROM sessions WHERE expires_at < now()`).catch(err => {
    console.error('Błąd czyszczenia sesji:', err.message);
  });
}, 1000 * 60 * 60); // co godzinę

/* =========================
   START
========================= */

pool
  .query('SELECT 1')
  .then(() => {
    server.listen(PORT, () => {
      console.log(`TSNCG Web działa: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Nie udało się połączyć z bazą danych:', err.message);
    process.exit(1);
  });
