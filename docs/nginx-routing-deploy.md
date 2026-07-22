# Nginx config — veedeck.com routing PL/EN

## Kontekst

Serwis veedeck.com działa na serwerze OVH (nginx). Wdrożono strukturę dwujęzyczną `/pl/` i `/en/`. Poniższy config zastępuje `.htaccess` (który działa tylko na Apache i jest ignorowany przez nginx).

---

## Config do wklejenia

### 1. Blok `map` — dodaj do `http {}` w głównym configu

Plik: `/etc/nginx/nginx.conf` (lub includowany plik w bloku `http {}`)

```nginx
map $http_accept_language $lang_redirect {
    default /pl/;
    ~*^en /en/;
}
```

> **Ważne:** `map` musi być w kontekście `http {}`, nie `server {}`.

---

### 2. Zaktualizowany `server {}` block

Plik: np. `/etc/nginx/sites-available/veedeck.com` lub `/etc/nginx/conf.d/veedeck.com.conf`

```nginx
server {
    server_name veedeck.com;
    index index.html;
    root /var/www/html;

    listen 8080 default_server;

    # Root → język na podstawie Accept-Language
    location = / {
        return 302 $lang_redirect;
    }

    # ── PL redirects (301) ────────────────────────────────────────
    location = /cennik                          { return 301 /pl/cennik/; }
    location = /o-nas                           { return 301 /pl/o-nas/; }
    location = /wtyczka                         { return 301 /pl/wtyczka/; }
    location = /moduly                          { return 301 /pl/moduly/; }
    location = /kontakt                         { return 301 /pl/kontakt/; }
    location = /demo                            { return 301 /pl/demo/; }
    location = /polityka-prywatnosci            { return 301 /pl/polityka-prywatnosci/; }
    location = /polityka-prywatnosci-veepick    { return 301 /pl/polityka-prywatnosci-veepick/; }
    location = /polityka-cookies                { return 301 /pl/polityka-cookies/; }
    location = /pomoc                           { return 301 /pl/pomoc/; }
    location = /pomoc/faq                       { return 301 /pl/pomoc/faq/; }
    location = /pomoc/jak-zaczac                { return 301 /pl/pomoc/jak-zaczac/; }
    location = /pomoc/dla-projektantow          { return 301 /pl/pomoc/dla-projektantow/; }
    location = /pomoc/dla-klientow-i-wykonawcow { return 301 /pl/pomoc/dla-klientow-i-wykonawcow/; }
    location = /pomoc/zglos-blad                { return 301 /pl/pomoc/zglos-blad/; }
    location = /pomoc/rozwiazywanie-problemow   { return 301 /pl/pomoc/rozwiazywanie-problemow/; }

    # ── EN redirects (301) ────────────────────────────────────────
    location = /pricing                         { return 301 /en/pricing/; }
    location = /about                           { return 301 /en/about/; }
    location = /plugin                          { return 301 /en/plugin/; }
    location = /modules                         { return 301 /en/modules/; }
    location = /contact                         { return 301 /en/contact/; }
    location = /privacy-policy                  { return 301 /en/privacy-policy/; }
    location = /privacy-policy-veepick          { return 301 /en/privacy-policy-veepick/; }
    location = /cookie-policy                   { return 301 /en/cookie-policy/; }
    location = /help                            { return 301 /en/help/; }
    location = /help/faq                        { return 301 /en/help/faq/; }
    location = /help/getting-started            { return 301 /en/help/getting-started/; }
    location = /help/for-designers              { return 301 /en/help/for-designers/; }
    location = /help/for-clients-and-contractors { return 301 /en/help/for-clients-and-contractors/; }
    location = /help/report-a-bug              { return 301 /en/help/report-a-bug/; }
    location = /help/troubleshooting            { return 301 /en/help/troubleshooting/; }

    # ── Aplikacja ─────────────────────────────────────────────────
    location = /login     { return 301 https://app.veedeck.com/login; }
    location = /dashboard { return 301 https://app.veedeck.com/; }

    # ── Pliki statyczne i strony ──────────────────────────────────
    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    error_page 404 /404.html;
    location = /404.html {
        internal;
    }
}
```

---

## Wdrożenie — krok po kroku

```bash
# 1. Edytuj config
nano /etc/nginx/sites-available/veedeck.com

# 2. Sprawdź składnię
nginx -t

# 3. Przeładuj nginx (bez downtime)
systemctl reload nginx
```

---

## Co zweryfikować po wdrożeniu

### Routing

| URL | Oczekiwany wynik |
|-----|-----------------|
| `veedeck.com/` (przeglądarka EN) | 302 → `/en/` |
| `veedeck.com/` (przeglądarka PL) | 302 → `/pl/` |
| `veedeck.com/cennik` | 301 → `/pl/cennik/` |
| `veedeck.com/pricing` | 301 → `/en/pricing/` |
| `veedeck.com/pomoc/faq` | 301 → `/pl/pomoc/faq/` |
| `veedeck.com/pl/cennik/` | strona cennika PL (bez redirect) |
| `veedeck.com/en/pricing/` | strona cennika EN (bez redirect) |
| `veedeck.com/login` | 301 → `https://app.veedeck.com/login` |

Szybki test z curl (bez podążania za redirectami):
```bash
curl -I https://veedeck.com/cennik
# Powinno zwrócić: HTTP/2 301 i Location: /pl/cennik/

curl -I -H "Accept-Language: en" https://veedeck.com/
# Powinno zwrócić: HTTP/2 302 i Location: /en/
```

### Zasoby statyczne

Strony w `/pl/` i `/en/` używają relatywnych ścieżek do zasobów (obrazki, JS). Sprawdź czy ładują się poprawnie:

- [ ] Logo i ikony widoczne na `/pl/cennik/`
- [ ] Logo i ikony widoczne na `/en/pricing/`
- [ ] Logo i ikony widoczne na `/pl/pomoc/faq/` (3 poziomy głęboko — ścieżki `../../..`)
- [ ] Skrypty JS działają (menu mobilne, animacje)

Jeśli zasoby nie ładują się — ścieżki relatywne w wygenerowanych plikach wymagają korekty w `scripts/build-site-i18n.mjs`.

### SEO

- [ ] Brak pętli redirectów (`/` → `/pl/` → `/` itd.)
- [ ] `hreflang` widoczny w `<head>` na `/pl/cennik/` i `/en/pricing/`
- [ ] `sitemap.xml` dostępny pod `veedeck.com/sitemap.xml`
- [ ] Google Search Console — dodaj nowy sitemap po indeksowaniu

---

## Uwagi

- `.htaccess` w repozytorium (`site/.htaccess`) jest nieużywany na nginx — można go zostawić lub usunąć.
- Root `/` używa `302` (nie `301`) bo redirect zależy od headera `Accept-Language` — zmienny, więc nie powinien być cachowany przez przeglądarki ani CDN.
- Stare flat `.html` pliki (np. `cennik.html`) nadal istnieją w `site/` — nginx serwuje je przez `$uri.html` w `try_files`, ale tylko jeśli ktoś wejdzie bezpośrednio na `/cennik.html`. Można je usunąć po potwierdzeniu że wszystko działa.
