/**
 * Skrypt do tworzenia kodów promocyjnych (Kapsle) w bazie Neon.
 *
 * Użycie:
 *   node create-promo-code.js <KOD> <ile_kapsli> <ile_uzyc> [wygasa_YYYY-MM-DD]
 *
 * Przykłady:
 *   node create-promo-code.js START2026 25 50
 *   node create-promo-code.js SWIETA2026 100 500 2026-01-06
 *
 * Wymaga zmiennej środowiskowej DATABASE_URL (connection string z Neona,
 * wersja "pooled", z ?sslmode=require) — ustaw ją lokalnie przed uruchomieniem, np.:
 *
 *   DATABASE_URL="postgres://user:pass@ep-xxx-pooler.neon.tech/db?sslmode=require" node create-promo-code.js START2026 25 50
 *
 * Ten skrypt NIE jest częścią serwera — odpalasz go ręcznie z własnego
 * komputera (albo z Render Shell), tylko wtedy kiedy chcesz dodać nowy kod.
 */

const { Client } = require('pg');

async function main() {
  const [, , codeArg, rewardArg, usesArg, expiresArg] = process.argv;

  if (!codeArg || !rewardArg || !usesArg) {
    console.error('Użycie: node create-promo-code.js <KOD> <ile_kapsli> <ile_uzyc> [wygasa_YYYY-MM-DD]');
    process.exit(1);
  }

  const code = codeArg.trim().toUpperCase();
  const reward = parseInt(rewardArg, 10);
  const uses = parseInt(usesArg, 10);
  const expiresAt = expiresArg ? new Date(expiresArg) : null;

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    console.error('Nieprawidłowy kod: dozwolone litery/cyfry/_/-, 3-32 znaki.');
    process.exit(1);
  }

  if (!Number.isFinite(reward) || reward <= 0) {
    console.error('Liczba kapsli musi być liczbą dodatnią.');
    process.exit(1);
  }

  if (!Number.isFinite(uses) || uses <= 0) {
    console.error('Liczba użyć musi być liczbą dodatnią.');
    process.exit(1);
  }

  if (expiresArg && isNaN(expiresAt.getTime())) {
    console.error('Nieprawidłowa data wygaśnięcia, użyj formatu YYYY-MM-DD.');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Brak zmiennej środowiskowej DATABASE_URL.');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(
      `INSERT INTO promo_codes (code, kapsle_reward, max_uses, uses_left, expires_at)
       VALUES ($1, $2, $3, $3, $4)
       RETURNING id, code, kapsle_reward, max_uses, expires_at`,
      [code, reward, uses, expiresAt]
    );

    const row = result.rows[0];

    console.log('Utworzono kod promocyjny:');
    console.log(`  Kod:          ${row.code}`);
    console.log(`  Nagroda:      ${row.kapsle_reward} kapsli`);
    console.log(`  Liczba użyć:  ${row.max_uses}`);
    console.log(`  Wygasa:       ${row.expires_at ? row.expires_at.toISOString() : 'nigdy'}`);

  } catch (err) {
    if (err.code === '23505') {
      console.error(`Kod "${code}" już istnieje w bazie.`);
    } else {
      console.error('Błąd zapisu do bazy:', err.message);
    }
    process.exit(1);

  } finally {
    await client.end();
  }
}

main();
