# TSNCG Web 1.02 Beta

Wersja przeglądarkowa z kontami, sesjami, antycheatem i topką.

## Uruchomienie

```bash
npm start
```

Otwórz `http://localhost:3000`.

## Konta

- Rejestracja i logowanie.
- Hasła są haszowane przez Node.js `crypto.scryptSync` z losową solą.
- Sesja jest trzymana w ciasteczku HttpOnly.
- Baza znajduje się w `database.json`.
- Hasła nigdy nie są zapisywane jako plaintext.

## Antycheat

- Serwer śledzi zweryfikowane pakiety kliknięć.
- Limity częstotliwości żądań.
- Limit rozmiaru pakietu klików.
- Wynik topki wymaga zalogowania i jest odrzucany przy oczywiście niemożliwej liczbie klików.
- Topka jest aktualizowana tylko po stronie serwera.

To nadal jest antycheat klasy Beta, nie system e-sportowego laboratorium bezpieczeństwa. Przy publicznym wdrożeniu warto przenieść bazę do PostgreSQL/SQLite, dodać HTTPS, reverse proxy, trwałe sesje i pełną serwerową symulację ekonomii gry.
