# veedeck — strona (site/)

Statyczny serwis veedeck.com. Czysty HTML/CSS/JS — bez bundlera i kroku budowania. Można serwować dowolnym hostingiem statycznym (nginx, Cloudflare Pages, cyber_Folks itp.) prosto z tego folderu.

## Strona startowa
`index.html` — z navbara prowadzą linki do wszystkich podstron.

## Podstrony
- `index.html` — strona główna
- `Veedeck Moduly.html` — moduły
- `Wtyczka.html` — wtyczka veepick
- `Cennik.html` — cennik
- `Demo.html` — demo / trial
- `O nas.html` — o nas
- `Kontakt.html` — kontakt
- `login.html` — logowanie / rejestracja (`login.html#register` → od razu tworzenie konta)
- `dashboard.html` + `dashboard.jsx` — podgląd aplikacji (React + Babel inline)
- `Polityka prywatnosci.html`, `Polityka prywatnosci veepick.html`, `Polityka cookies.html` — dokumenty prawne

## Skrypty współdzielone
- `veedeck-i18n.js` — przełącznik języka PL/EN. Sam wstrzykuje przełącznik (flagi PL + UK) do navbara i tłumaczy treść wg słownika PL→EN. Dołączać przed `</body>`.
- `veedeck-megamenu.js` — mega-menu „Funkcje" w navbarze. Dołączać po `veedeck-i18n.js`.
- `veedeck-reveal.js` — animacje scroll-reveal.

Kolejność w `<body>`:
```html
<script src="veedeck-i18n.js"></script>
<script src="veedeck-megamenu.js"></script>
<script src="veedeck-reveal.js"></script>
```

## Marka / zasoby
- Ikona (navbar/stopka): `vee-icon.png`
- Wordmark: `vee_black.png`
- Favicon: `veedeckicon.png`
- Ikona wtyczki: `veepick-icon.png`
- Zdjęcia produktów do demo: `produkty/`

## Uwagi
- Linki logowania → `login.html`. „Wypróbuj 14 dni za darmo" → `login.html#register`.
- Adresy e-mail w dokumentach prawnych są owinięte `<!--email_off-->` (wyłączenie obfuskacji Cloudflare).
- Tłumaczenia EN treści są w słowniku w `veedeck-i18n.js` (klucz = tekst PL, wartość = EN).
