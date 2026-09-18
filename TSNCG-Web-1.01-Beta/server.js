```js
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DB = path.join(ROOT, 'database.json');
const PORT = Number(process.env.PORT) || 3000;

const MAX = 100;
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7;

const RATE = new Map();
const SESSIONS = new Map();

/* =========================
   DATABASE
========================= */

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DB, 'utf8'));
  } catch (_) {
    return {
      users: [],
      leaderboard: []
    };
  }
}

function writeDb(db) {
  const tmp = DB + '.tmp';

  fs.writeFileSync(
    tmp,
    JSON.stringify(db, null, 2),
    'utf8'
  );

  fs.renameSync(tmp, DB);
}

let db = readDb();

if (!db.users) db.users = [];
if (!db.leaderboard) db.leaderboard = [];

/* =========================
   USERS
========================= */

function cleanName(name) {
  return String(name || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 24);
}

function normalizeUsername(name) {
  return cleanName(name).toLowerCase();
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
   PASSWORDS
========================= */

function hashPassword(
  password,
  salt = crypto.randomBytes(16).toString('hex')
) {
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString('hex');

  return {
    salt,
    hash
  };
}

function verifyPassword(password, user) {
  try {
    const got = crypto.scryptSync(
      password,
      user.salt,
      64
    );

    const expected = Buffer.from(
      user.passwordHash,
      'hex'
    );

    return (
      expected.length === got.length &&
      crypto.timingSafeEqual(got, expected)
    );
  } catch (_) {
    return false;
  }
}

/* =========================
   SESSIONS
========================= */

function token() {
  return crypto.randomBytes(32).toString('hex');
}

function cookies(req) {
  const out = {};

  String(req.headers.cookie || '')
    .split(';')
    .forEach(x => {
      const i = x.indexOf('=');

      if (i > 0) {
        out[x.slice(0, i).trim()] =
          decodeURIComponent(
            x.slice(i + 1).trim()
          );
      }
    });

  return out;
}

function getSession(req) {
  const sid = cookies(req).tsncg_session;

  const session =
    sid && SESSIONS.get(sid);

  if (
    !session ||
    session.expires < Date.now()
  ) {
    if (sid) {
      SESSIONS.delete(sid);
    }

    return null;
  }

  session.expires =
    Date.now() + SESSION_TTL;

  return {
    sid,
    ...session
  };
}

function setSession(res, user) {
  const sid = token();

  SESSIONS.set(sid, {
    userId: user.id,
    expires: Date.now() + SESSION_TTL,
    startedAt: Date.now(),
    verifiedClicks: 0,
    lastBatch: Date.now()
  });

  res.setHeader(
    'Set-Cookie',
    `tsncg_session=${sid}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${SESSION_TTL / 1000}`
  );
}

function clearSession(res, req) {
  const sid =
    cookies(req).tsncg_session;

  if (sid) {
    SESSIONS.delete(sid);
  }

  res.setHeader(
    'Set-Cookie',
    'tsncg_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
  );
}

function userFor(session) {
  return (
    session &&
    db.users.find(
      u => u.id === session.userId
    )
  );
}

/* =========================
   CORS
========================= */

```js
function corsHeaders(req) {
  const origin = req.headers.origin;

  if (!origin) {
    return {};
  }

  const allowed =
    /^https:\/\/(?:[a-zA-Z0-9-]+\.)*pages\.dev$/.test(origin) ||
    /^https?:\/\/localhost(?::\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin);

  if (!allowed) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}
```

/* =========================
   JSON
========================= */

function json(
  res,
  status,
  data,
  extra = {}
) {
  const body = JSON.stringify(data);

  res.writeHead(
    status,
    {
      'Content-Type':
        'application/json; charset=utf-8',

      'Cache-Control':
        'no-store',

      'X-Content-Type-Options':
        'nosniff',

      'X-Frame-Options':
        'SAMEORIGIN',

      'Referrer-Policy':
        'same-origin',

      ...extra
    }
  );

  res.end(body);
}

/* =========================
   RATE LIMIT
========================= */

function rateLimit(
  req,
  key,
  max,
  windowMs
) {
  const ip =
    req.socket.remoteAddress ||
    'unknown';

  const now = Date.now();

  const k =
    key + ':' + ip;

  const x =
    RATE.get(k) || {
      start: now,
      count: 0
    };

  if (
    now - x.start >
    windowMs
  ) {
    x.start = now;
    x.count = 0;
  }

  x.count++;

  RATE.set(k, x);

  return x.count <= max;
}

/* =========================
   REQUEST BODY
========================= */

function body(req) {
  return new Promise(
    (resolve, reject) => {
      let data = '';

      req.on('data', chunk => {
        data += chunk;

        if (data.length > 1e6) {
          reject(
            new Error('too large')
          );

          req.destroy();
        }
      });

      req.on('end', () => {
        try {
          resolve(
            JSON.parse(
              data || '{}'
            )
          );
        } catch (e) {
          reject(e);
        }
      });

      req.on('error', reject);
    }
  );
}

/* =========================
   STATS
========================= */

function cleanStats(data) {
  const n = x =>
    Math.max(
      0,
      Math.floor(
        Number(x) || 0
      )
    );

  return {
    coins: n(data.coins),
    clicks: n(data.clicks),
    level: Math.max(
      1,
      n(data.level)
    ),
    criticalClicks:
      n(data.criticalClicks)
  };
}

/* =========================
   LEADERBOARD
========================= */

function updateLeaderboard(
  user,
  stats
) {
  const existing =
    db.leaderboard.find(
      x => x.userId === user.id
    );

  const row =
    existing ||
    {
      userId: user.id,
      username: user.username,
      verifiedClicks: 0,
      coins: 0,
      clicks: 0,
      level: 1,
      updatedAt:
        new Date().toISOString()
    };

  row.username =
    user.username;

  row.coins =
    Math.max(
      row.coins,
      stats.coins
    );

  row.clicks =
    Math.max(
      row.clicks,
      stats.clicks
    );

  row.level =
    Math.max(
      row.level,
      stats.level
    );

  row.verifiedClicks =
    Math.max(
      row.verifiedClicks,
      stats.verifiedClicks || 0
    );

  row.updatedAt =
    new Date().toISOString();

  if (!existing) {
    db.leaderboard.push(row);
  }

  db.leaderboard.sort(
    (a, b) =>
      b.coins - a.coins ||
      b.verifiedClicks -
        a.verifiedClicks ||
      b.clicks - a.clicks ||
      b.level - a.level
  );

  db.leaderboard =
    db.leaderboard.slice(
      0,
      MAX
    );

  writeDb(db);

  return row;
}

function publicRow(x, i) {
  return {
    rank: i + 1,
    name: x.username,
    coins: x.coins,
    clicks: x.clicks,
    level: x.level,
    verifiedClicks:
      x.verifiedClicks
  };
}

/* =========================
   SERVER
========================= */

const server =
  http.createServer(
    async (req, res) => {

      const route =
        req.url.split('?')[0];

      /*
        CORS dla API
      */

      const cors =
        corsHeaders(req);

      if (route.startsWith('/api/')) {

        /*
          Preflight
        */

        if (req.method === 'OPTIONS') {
          res.writeHead(
            204,
            cors
          );

          return res.end();
        }

        const session =
          getSession(req);

        const user =
          userFor(session);

        /* =====================
           REGISTER
        ===================== */

        if (
          route === '/api/register' &&
          req.method === 'POST'
        ) {
          if (
            !rateLimit(
              req,
              'register',
              5,
              60_000
            )
          ) {
            return json(
              res,
              429,
              {
                error:
                  'Za dużo prób. Spróbuj później.'
              },
              cors
            );
          }

          try {
            const data =
              await body(req);

            const username =
              cleanName(
                data.username
              );

            const normalized =
              normalizeUsername(
                username
              );

            const password =
              data.password;

            if (
              !validUsername(
                username
              )
            ) {
              return json(
                res,
                400,
                {
                  error:
                    'Nick: 3-24 znaków, litery/cyfry/_/-.'
                },
                cors
              );
            }

            if (
              !validPassword(
                password
              )
            ) {
              return json(
                res,
                400,
                {
                  error:
                    'Hasło musi mieć 8-128 znaków.'
                },
                cors
              );
            }

            if (
              db.users.some(
                u =>
                  u.usernameNormalized ===
                  normalized
              )
            ) {
              return json(
                res,
                409,
                {
                  error:
                    'Taki nick już istnieje.'
                },
                cors
              );
            }

            const hp =
              hashPassword(
                password
              );

            const u = {
              id:
                crypto.randomUUID(),

              username,

              passwordHash:
                hp.hash,

              salt:
                hp.salt,

              createdAt:
                new Date().toISOString(),

              usernameNormalized:
                normalized
            };

            db.users.push(u);

            writeDb(db);

            setSession(
              res,
              u
            );

            return json(
              res,
              201,
              {
                ok: true,
                user: {
                  username:
                    u.username
                }
              },
              cors
            );

          } catch (_) {
            return json(
              res,
              400,
              {
                error:
                  'Nieprawidłowe dane.'
              },
              cors
            );
          }
        }

        /* =====================
           LOGIN
        ===================== */

        if (
          route === '/api/login' &&
          req.method === 'POST'
        ) {
          if (
            !rateLimit(
              req,
              'login',
              10,
              60_000
            )
          ) {
            return json(
              res,
              429,
              {
                error:
                  'Za dużo prób logowania. Spróbuj później.'
              },
              cors
            );
          }

          try {
            const data =
              await body(req);

            const u =
              db.users.find(
                x =>
                  x.usernameNormalized ===
                  normalizeUsername(
                    data.username
                  )
              );

            if (
              !u ||
              !verifyPassword(
                data.password || '',
                u
              )
            ) {
              return json(
                res,
                401,
                {
                  error:
                    'Nieprawidłowy nick lub hasło.'
                },
                cors
              );
            }

            setSession(
              res,
              u
            );

            return json(
              res,
              200,
              {
                ok: true,
                user: {
                  username:
                    u.username
                }
              },
              cors
            );

          } catch (_) {
            return json(
              res,
              400,
              {
                error:
                  'Nieprawidłowe dane.'
              },
              cors
            );
          }
        }

        /* =====================
           LOGOUT
        ===================== */

        if (
          route === '/api/logout' &&
          req.method === 'POST'
        ) {
          clearSession(
            res,
            req
          );

          return json(
            res,
            200,
            {
              ok: true
            },
            cors
          );
        }

        /* =====================
           ME
        ===================== */

        if (
          route === '/api/me' &&
          req.method === 'GET'
        ) {
          if (!user) {
            return json(
              res,
              401,
              {
                authenticated:
                  false
              },
              cors
            );
          }

          return json(
            res,
            200,
            {
              authenticated:
                true,

              user: {
                username:
                  user.username
              }
            },
            cors
          );
        }

        /* =====================
           VERIFY CLICKS
        ===================== */

        if (
          route === '/api/verify-clicks' &&
          req.method === 'POST'
        ) {
          if (
            !user ||
            !session
          ) {
            return json(
              res,
              401,
              {
                error:
                  'Zaloguj się.'
              },
              cors
            );
          }

          if (
            !rateLimit(
              req,
              'clickbatch',
              120,
              60_000
            )
          ) {
            return json(
              res,
              429,
              {
                error:
                  'Za dużo żądań.'
              },
              cors
            );
          }

          try {
            const data =
              await body(req);

            const delta =
              Math.floor(
                Number(
                  data.delta
                ) || 0
              );

            const now =
              Date.now();

            if (
              delta < 0 ||
              delta > 50
            ) {
              return json(
                res,
                400,
                {
                  error:
                    'Podejrzany pakiet klików.'
                },
                cors
              );
            }

            const elapsed =
              Math.max(
                1,
                now -
                  session.lastBatch
              ) / 1000;

            const allowed =
              Math.min(
                50,
                Math.ceil(
                  elapsed * 45
                ) + 5
              );

            if (
              delta >
              allowed
            ) {
              return json(
                res,
                429,
                {
                  error:
                    'Tempo klików przekracza limit antycheata.',
                  verifiedClicks:
                    session.verifiedClicks
                },
                cors
              );
            }

            session.verifiedClicks +=
              delta;

            session.lastBatch =
              now;

            return json(
              res,
              200,
              {
                ok: true,
                verifiedClicks:
                  session.verifiedClicks
              },
              cors
            );

          } catch (_) {
            return json(
              res,
              400,
              {
                error:
                  'Nieprawidłowy pakiet.'
              },
              cors
            );
          }
        }

        /* =====================
           LEADERBOARD GET
        ===================== */

        if (
          route === '/api/leaderboard' &&
          req.method === 'GET'
        ) {
          return json(
            res,
            200,
            db.leaderboard.map(
              publicRow
            ),
            cors
          );
        }

        /* =====================
           LEADERBOARD POST
        ===================== */

        if (
          route === '/api/leaderboard' &&
          req.method === 'POST'
        ) {
          if (
            !user ||
            !session
          ) {
            return json(
              res,
              401,
              {
                error:
                  'Zaloguj się, żeby wejść do topki.'
              },
              cors
            );
          }

          if (
            !rateLimit(
              req,
              'score',
              6,
              60_000
            )
          ) {
            return json(
              res,
              429,
              {
                error:
                  'Za dużo zgłoszeń wyniku.'
              },
              cors
            );
          }

          try {
            const stats =
              cleanStats(
                await body(req)
              );

            const existing =
              db.leaderboard.find(
                x =>
                  x.userId ===
                  user.id
              );

            const previousClicks =
              existing?.clicks || 0;

            const verified =
              Math.max(
                session.verifiedClicks,
                existing?.verifiedClicks ||
                  0
              );

            if (
              stats.clicks <
              previousClicks
            ) {
              return json(
                res,
                400,
                {
                  error:
                    'Wynik klików nie może się cofać.'
                },
                cors
              );
            }

            const newClicks =
              stats.clicks -
              previousClicks;

            const maxUnverified =
              verified + 500;

            if (
              stats.clicks >
              maxUnverified
            ) {
              return json(
                res,
                400,
                {
                  error:
                    'Wynik odrzucony przez antycheat. Graj normalnie i zgłaszaj wynik po synchronizacji.',
                  verifiedClicks:
                    verified
                },
                cors
              );
            }

            if (
              stats.coins >
                10 ** 15 ||
              stats.clicks >
                10 ** 12 ||
              stats.level >
                1e6
            ) {
              return json(
                res,
                400,
                {
                  error:
                    'Wynik poza limitem.'
                },
                cors
              );
            }

            const row =
              updateLeaderboard(
                user,
                {
                  ...stats,
                  verifiedClicks:
                    Math.max(
                      verified,
                      newClicks +
                        previousClicks
                    )
                }
              );

            return json(
              res,
              201,
              publicRow(
                row,
                db.leaderboard.indexOf(
                  row
                )
              ),
              cors
            );

          } catch (_) {
            return json(
              res,
              400,
              {
                error:
                  'Nieprawidłowe dane.'
              },
              cors
            );
          }
        }

        /* =====================
           API 404
        ===================== */

        return json(
          res,
          404,
          {
            error:
              'API not found'
          },
          cors
        );
      }

      /* =======================
         STATIC FILES
      ======================= */

      serveFile(
        req,
        res
      );
    }
  );

/* =========================
   STATIC SERVER
========================= */

function serveFile(
  req,
  res
) {
  let url;

  try {
    url =
      decodeURIComponent(
        req.url.split('?')[0]
      );
  } catch (_) {
    return json(
      res,
      400,
      {
        error:
          'Bad URL'
      }
    );
  }

  if (url === '/') {
    url = '/index.html';
  }

  const file =
    path.normalize(
      path.join(
        ROOT,
        url
      )
    );

  if (
    !file.startsWith(ROOT)
  ) {
    return json(
      res,
      403,
      {
        error:
          'Forbidden'
      }
    );
  }

  fs.stat(
    file,
    (err, st) => {
      if (
        err ||
        !st.isFile()
      ) {
        return json(
          res,
          404,
          {
            error:
              'Not found'
          }
        );
      }

      const ext =
        path.extname(
          file
        ).toLowerCase();

      const types = {
        '.html':
          'text/html; charset=utf-8',

        '.js':
          'text/javascript; charset=utf-8',

        '.css':
          'text/css; charset=utf-8',

        '.json':
          'application/json; charset=utf-8',

        '.png':
          'image/png',

        '.wav':
          'audio/wav'
      };

      res.writeHead(
        200,
        {
          'Content-Type':
            types[ext] ||
            'application/octet-stream',

          'X-Content-Type-Options':
            'nosniff',

          'X-Frame-Options':
            'SAMEORIGIN',

          'Referrer-Policy':
            'same-origin'
        }
      );

      fs.createReadStream(
        file
      ).pipe(res);
    }
  );
}

/* =========================
   START
========================= */

server.listen(
  PORT,
  () => {
    console.log(
      `TSNCG Web działa: http://localhost:${PORT}`
    );
  }
);
