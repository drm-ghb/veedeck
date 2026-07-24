/* veedeck — mega menu „Funkcje"
   --------------------------------
   Łączy pozycje nawigacji „Moduły" + „Wtyczka" w jedną rozwijaną pozycję
   „Funkcje" (układ Propozycji 2: siatka modułów + panel z widokami i wtyczką).
   Sam wstrzykuje CSS i panel do navbara — wystarczy dołączyć:
     <script src="veedeck-megamenu.js"></script>  (po veedeck-i18n.js)
   Obsługuje desktop (hover/klik) i mobile (akordeon) oraz język PL/EN
   (czyta localStorage 'veedeck_lang' i reaguje na klik flagi). */

(function () {
  "use strict";

  var MODULES_PAGE = "/moduly";
  var PLUGIN_PAGE  = "/wtyczka";
  var PANELS_LINK  = "/#panele";

  var RF_SVG = '<svg class="vd-rf" viewBox="-22 -22 228 229" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M121.728 122.988L162.007 82.6681C166.445 78.2248 163.239 70.6362 156.959 70.7215L146.549 70.8628L119.786 71.2261C119.236 71.2336 118.707 71.014 118.324 70.6191L86.1743 37.4878L58.6215 8.66333C55.9075 5.82403 51.389 5.77308 48.6117 8.55045L8.55019 48.6119C5.84554 51.3166 5.81265 55.6914 8.47633 58.4364L36.4243 87.2378L68.6112 120.408C68.9724 120.78 69.1749 121.278 69.1759 121.796L69.2485 158.623C69.2607 164.855 76.7967 167.965 81.2007 163.557L121.728 122.988ZM121.728 122.988L177.228 178.488" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

  // ── Dane (jedno źródło, PL + EN) ──
  var MODULES = [
    { icon: "group",          pl: "Klienci",        en: "Clients",        dpl: "Klienci, projekty, płatności",          den: "Clients, projects, payments",          href: "#klienci" },
    { icon: "renderflow",     pl: "ProjectFlow",    en: "ProjectFlow",    dpl: "Rendery z pinami komentarzy klienta",   den: "Renders with client comment pins",     href: "#projectflow" },
    { icon: "local_mall",     pl: "Listy zakupowe", en: "Shopping lists", dpl: "Produkty z cenami i linkami",           den: "Products with prices and links",        href: "#listy" },
    { icon: "interests",      pl: "Moodboardy",     en: "Moodboards",     dpl: "Zbieraj inspiracje i wizualne koncepcje", den: "Collect inspiration and visual concepts", href: "#moodboardy" },
    { icon: "check_box",      pl: "Zadania",        en: "Tasks",          dpl: "Lista do zrobienia z terminami",        den: "A to-do list with deadlines",          href: "#zadania" },
    { icon: "assignment",     pl: "Ankiety",        en: "Surveys",        dpl: "Briefy i ankiety dla klienta",          den: "Briefs and surveys for the client",    href: "#ankiety" },
    { icon: "package_2",      pl: "Produkty",       en: "Products",       dpl: "Twoja kartoteka mebli i materiałów",    den: "Your furniture & materials library",   href: "#produkty" },
    { icon: "engineering",    pl: "Wykonawcy",      en: "Contractors",    dpl: "Rysunki i dokumenty dla wykonawców",    den: "Drawings & docs for contractors",      href: "#wykonawcy" },
    { icon: "calendar_month", pl: "Kalendarz",      en: "Calendar",       dpl: "Spotkania, dostawy, deadline'y",        den: "Meetings, deliveries, deadlines",      href: "#kalendarz" },
    { icon: "note_stack",     pl: "Notatnik",       en: "Notes",          dpl: "Szybkie notatki i szkice",              den: "Quick notes and sketches",             href: "#notatnik" },
    { icon: "chat_bubble",    pl: "Dyskusje",       en: "Discussions",    dpl: "Komentowanie renderów z klientem",      den: "Discuss renders with the client",      href: "#dyskusje" },
    { icon: "wand_stars",     pl: "Veezard",        en: "Veezard",        dpl: "Twój osobisty czarodziej AI.",       den: "Your personal AI wizard.",  soon: true, ai: true, href: "#generator3d" }
  ];
  var VIEWS = [
    { icon: "design_services", pl: "Panel Projektanta", en: "Designer Panel",   dpl: "Pełna kontrola — tworzysz i udostępniasz", den: "Full control — you create and share" },
    { icon: "reviews",         pl: "Panel Klienta",     en: "Client Panel",     dpl: "Przegląda rendery, pinuje i akceptuje",    den: "Reviews renders, pins and approves" },
    { icon: "engineering",     pl: "Panel Wykonawcy",   en: "Contractor Panel", dpl: "Rysunki i dokumenty do realizacji",        den: "Drawings & documents to build from" }
  ];
  var STR = {
    funkcje:  { pl: "Funkcje", en: "Features" },
    moduly:   { pl: "Moduły",  en: "Modules" },
    widoki:   { pl: "Widoki",  en: "Views" },
    eyebrow:  { pl: "Czego nie ma konkurencja", en: "What others don't have" },
    panels:   { pl: "Jeden projekt. Trzy panele.", en: "One project. Three panels." },
    panelsub: { pl: "Każda rola widzi swój dopasowany widok — Ty decydujesz, co komu udostępniasz.",
                en: "Each role sees its own tailored view — you decide what to share with whom." },
    plugName: { pl: "Wtyczka veepick", en: "veepick plugin" },
    plugDesc: { pl: "Dodawaj produkty z dowolnego sklepu jednym kliknięciem.",
                en: "Add products from any store in one click." },
    allmods:  { pl: "Wszystkie moduły", en: "All modules" }
  };

  function lang() {
    try { return localStorage.getItem("veedeck_lang") === "en" ? "en" : "pl"; }
    catch (e) { return "pl"; }
  }
  function modHref(m) { return MODULES_PAGE + m.href; }
  function iconHTML(ic) {
    return ic === "renderflow" ? RF_SVG
      : '<span class="material-symbols-rounded">' + ic + "</span>";
  }

  // ── CSS ──
  var CSS = [
    ".vd-mm-trigger{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:14px;font-weight:500;color:var(--muted-foreground,#6B6F80);background:none;border:0;padding:0;cursor:pointer;transition:color .15s;line-height:1;}",
    ".vd-mm-trigger:hover,.vd-mm-trigger.is-open{color:var(--foreground,#24252B);}",
    ".vd-mm-trigger .vd-mm-chev{width:16px;height:16px;transition:transform .2s;}",
    ".vd-mm-trigger.is-open .vd-mm-chev{transform:rotate(180deg);color:var(--primary,#4F46E5);}",
    ".vd-mm-trigger.is-open{color:var(--primary,#4F46E5);}",

    ".vd-mm-backdrop{position:fixed;inset:0;z-index:38;background:rgba(15,15,20,.12);opacity:0;pointer-events:none;transition:opacity .18s;}",
    ".vd-mm-backdrop.show{opacity:1;pointer-events:auto;}",

    ".vd-mm-panel{position:fixed;left:50%;transform:translateX(-50%) translateY(-8px);z-index:42;width:min(1040px,calc(100vw - 28px));background:#fff;border:1px solid var(--border,#E5E7EB);border-radius:16px;box-shadow:0 30px 70px -28px rgba(30,27,75,.42),0 8px 24px -10px rgba(30,27,75,.16);overflow:hidden;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;}",
    ".vd-mm-panel.show{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0);}",
    ".vd-mm-grid{display:grid;grid-template-columns:1.7fr 1fr;}",
    "@media (max-width:880px){.vd-mm-grid{grid-template-columns:1fr;}}",

    ".vd-mm-mods{padding:22px 24px;min-width:0;}",
    ".vd-mm-eyebrow{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground,#6B6F80);margin:0 0 14px;display:flex;align-items:center;gap:8px;}",
    ".vd-mm-eyebrow .ct{color:var(--primary,#4F46E5);}",
    "a.vd-mm-eyebrow--link{text-decoration:none;cursor:pointer;transition:color .15s;}",
    "a.vd-mm-eyebrow--link::after{content:'arrow_forward';font-family:'Material Symbols Rounded';font-size:14px;letter-spacing:0;text-transform:none;opacity:0;margin-left:-2px;transition:opacity .15s,transform .15s;transform:translateX(-3px);}",
    "a.vd-mm-eyebrow--link:hover{color:var(--primary,#4F46E5);}",
    "a.vd-mm-eyebrow--link:hover::after{opacity:1;transform:translateX(0);}",
    ".vd-mm-mgrid{display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;}",
    "@media (max-width:560px){.vd-mm-mgrid{grid-template-columns:1fr;}}",

    ".vd-mm-mi{display:flex;gap:12px;align-items:flex-start;padding:10px;border-radius:11px;transition:background .14s;}",
    ".vd-mm-mi:hover{background:var(--indigo-50,#EEF2FF);}",
    ".vd-mm-ic{width:38px;height:38px;border-radius:10px;flex-shrink:0;background:var(--indigo-50,#EEF2FF);color:var(--primary,#4F46E5);display:grid;place-items:center;}",
    ".vd-mm-ic .material-symbols-rounded{font-size:21px;font-variation-settings:'FILL' 1,'wght' 500;}",
    ".vd-mm-ic .vd-rf{width:20px;height:20px;color:var(--primary,#4F46E5);}",
    ".vd-mm-tx{min-width:0;}",
    ".vd-mm-name{font-family:'Inter',sans-serif;font-weight:600;font-size:14px;color:var(--foreground,#24252B);letter-spacing:-.01em;display:flex;align-items:center;gap:7px;line-height:1.3;}",
    ".vd-mm-desc{font-size:12.5px;color:var(--muted-foreground,#6B6F80);line-height:1.4;margin-top:2px;}",
    ".vd-mm-soon{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--primary,#4F46E5);background:var(--indigo-50,#EEF2FF);border-radius:999px;padding:2px 6px;}",
    ".vd-mm-mi--ai{align-items:center;background:linear-gradient(100deg,rgba(124,58,237,.07),rgba(79,70,229,.05));border:1px solid rgba(124,58,237,.18);}",
    ".vd-mm-mi--ai:hover{background:linear-gradient(100deg,rgba(124,58,237,.12),rgba(79,70,229,.08));border-color:rgba(124,58,237,.30);}",
    ".vd-mm-ic--ai,.vd-mm-srow .sic.vd-mm-ic--ai{background:linear-gradient(135deg,#8B5CF6,#4F46E5);color:#fff;box-shadow:0 4px 12px -4px rgba(124,58,237,.5);}",
    ".vd-mm-ic--ai .material-symbols-rounded{color:#fff;}",
    ".vd-mm-ai-badge{display:inline-grid;place-items:center;width:19px;height:19px;border-radius:5px;background:linear-gradient(135deg,#8B5CF6,#4F46E5);color:#fff;font-family:'Inter',sans-serif;font-size:9.5px;font-weight:800;letter-spacing:.02em;box-shadow:0 2px 6px -2px rgba(124,58,237,.55);}",

    ".vd-mm-promo{padding:20px;background:#FAFAFB;border-left:1px solid var(--border,#E5E7EB);display:flex;flex-direction:column;gap:14px;}",
    "@media (max-width:880px){.vd-mm-promo{border-left:0;border-top:1px solid var(--border,#E5E7EB);}}",
    ".vd-mm-card{border-radius:14px;padding:20px;color:#fff;position:relative;overflow:hidden;background:radial-gradient(circle at 88% 6%,rgba(165,180,252,.34) 0%,transparent 55%),linear-gradient(150deg,#3C33C9 0%,#4F46E5 60%,#6B63F0 100%);box-shadow:0 18px 40px -22px rgba(30,27,75,.5);}",
    ".vd-mm-card .pc-eyebrow{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#C7D2FE;}",
    ".vd-mm-card h4{font-family:'Inter',sans-serif;font-size:18px;margin:8px 0 4px;color:#fff;letter-spacing:-.02em;font-weight:700;}",
    ".vd-mm-card .pc-sub{font-size:12.5px;color:rgba(255,255,255,.82);line-height:1.45;}",
    ".vd-mm-views{margin-top:14px;display:grid;gap:8px;}",
    "a.vd-mm-view{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.12);border-radius:10px;padding:9px 11px;transition:background .15s;}",
    "a.vd-mm-view:hover{background:rgba(255,255,255,.24);}",
    ".vd-mm-view>.material-symbols-rounded{font-size:19px;color:#fff;flex-shrink:0;}",
    ".vd-mm-view .v-tx{min-width:0;display:flex;flex-direction:column;}",
    ".vd-mm-view .v-n{font-size:12.5px;font-weight:600;color:#fff;line-height:1.25;}",
    ".vd-mm-view .v-d{font-size:11px;font-weight:400;color:rgba(255,255,255,.74);line-height:1.3;margin-top:1px;}",
    ".vd-mm-view .v-ar{margin-left:auto;font-size:16px;color:#fff;opacity:0;transition:opacity .15s;flex-shrink:0;}",
    "a.vd-mm-view:hover .v-ar{opacity:.85;}",

    "a.vd-mm-plugin{border-radius:14px;border:1px solid var(--border,#E5E7EB);background:#fff;padding:14px;display:flex;gap:12px;align-items:center;transition:border-color .15s,box-shadow .15s,transform .15s;}",
    "a.vd-mm-plugin:hover{border-color:color-mix(in srgb,var(--primary,#4F46E5) 35%,var(--border,#E5E7EB));box-shadow:0 10px 26px -16px rgba(79,70,229,.45);transform:translateY(-1px);}",
    ".vd-mm-plugin .pp-ic{width:40px;height:40px;border-radius:10px;background:var(--indigo-50,#EEF2FF);display:grid;place-items:center;flex-shrink:0;overflow:hidden;}",
    ".vd-mm-plugin .pp-ic img{width:26px;height:26px;object-fit:contain;display:block;}",
    ".vd-mm-plugin .pp-bd{min-width:0;flex:1;}",
    ".vd-mm-plugin .pp-name{font-family:'Inter',sans-serif;font-weight:600;font-size:13.5px;color:var(--foreground,#24252B);}",
    ".vd-mm-plugin .pp-desc{font-size:11.5px;color:var(--muted-foreground,#6B6F80);margin-top:2px;}",
    ".vd-mm-plugin .pp-tag{font-size:10px;font-weight:600;color:var(--primary,#4F46E5);margin-top:4px;letter-spacing:.04em;}",
    ".vd-mm-plugin .pp-ar{margin-left:auto;font-size:18px;color:var(--primary,#4F46E5);opacity:0;transition:opacity .15s;flex-shrink:0;align-self:center;}",
    "a.vd-mm-plugin:hover .pp-ar{opacity:1;}",

    /* ── Mobile akordeon ── */
    "nav.top.open .nav-burger{display:none!important;}",
    ".vd-mm-macc{display:flex;align-items:center;width:100%;text-align:left;background:none;cursor:pointer;border:0;border-bottom:1px solid var(--border,#E5E7EB);padding:16px 4px;font-family:inherit;font-size:17px;font-weight:500;color:var(--foreground,#24252B);transition:color .12s ease;}",
    ".vd-mm-macc:hover,.vd-mm-macc.open{color:var(--primary,#4F46E5);}",
    ".vd-mm-macc .am-chev{margin-left:auto;width:20px;height:20px;transition:transform .2s;color:var(--muted-foreground,#6B6F80);}",
    ".vd-mm-macc:hover .am-chev,.vd-mm-macc.open .am-chev{color:var(--primary,#4F46E5);}",
    ".vd-mm-macc.open .am-chev{transform:rotate(180deg);}",
    ".vd-mm-msplit{display:flex;align-items:center;padding:0;border-bottom:1px solid var(--border,#E5E7EB);}",
    ".vd-mm-msplit-lbl{flex:1;display:flex;align-items:center;padding:16px 4px;text-decoration:none;font-family:inherit;font-size:17px;font-weight:500;color:var(--foreground,#24252B);transition:color .12s ease;}",
    ".vd-mm-msplit-lbl:hover,.vd-mm-msplit.open .vd-mm-msplit-lbl{color:var(--primary,#4F46E5);}",
    ".vd-mm-msplit-chev{flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:16px 4px 16px 12px;background:none;border:0;cursor:pointer;color:var(--muted-foreground,#6B6F80);transition:color .12s ease;}",
    ".vd-mm-msplit-chev:hover,.vd-mm-msplit.open .vd-mm-msplit-chev{color:var(--primary,#4F46E5);}",
    ".vd-mm-msplit .am-chev{width:20px;height:20px;transition:transform .2s;}",
    ".vd-mm-msplit.open .am-chev{transform:rotate(180deg);}",
    ".vd-mm-msub{display:none;padding:2px 0 14px;}",
    ".vd-mm-msub.open{display:block;}",
    ".vd-mm-msub .sub-h{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground,#6B6F80);margin:12px 6px 2px;display:flex;align-items:center;gap:7px;}",
    ".vd-mm-msub .sub-h .ct{color:var(--primary,#4F46E5);}",
    "a.sub-h--link{text-decoration:none;cursor:pointer;}",
    "a.sub-h--link:active{color:var(--primary,#4F46E5);}",
    ".vd-mm-srow{display:flex;align-items:center;gap:12px;padding:10px 6px;}",
    ".vd-mm-srow .sic{width:36px;height:36px;border-radius:9px;background:var(--indigo-50,#EEF2FF);color:var(--primary,#4F46E5);display:grid;place-items:center;flex-shrink:0;overflow:hidden;}",
    ".vd-mm-srow .sic .material-symbols-rounded{font-size:20px;font-variation-settings:'FILL' 1,'wght' 500;}",
    ".vd-mm-srow .sic .vd-rf{width:18px;height:18px;color:var(--primary,#4F46E5);}",
    ".vd-mm-srow .sic img{width:23px;height:23px;object-fit:contain;}",
    ".vd-mm-srow .stx{min-width:0;}",
    ".vd-mm-srow .snm{font-family:'Inter',sans-serif;font-weight:600;font-size:14.5px;line-height:1.25;color:var(--foreground,#24252B);display:flex;align-items:center;gap:7px;}",
    ".vd-mm-srow .sd{font-size:12px;color:var(--muted-foreground,#6B6F80);line-height:1.3;margin-top:1px;}",
    ".vd-mm-srow:active{background:var(--indigo-50,#EEF2FF);border-radius:10px;}",
    /* CTA przyklejone do dołu szuflady */
    ".mobile-menu .mobile-cta{margin-top:auto;padding-top:24px;}"
  ].join("\n");

  function ensureFont() {
    if (document.querySelector('link[href*="Material+Symbols+Rounded"]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block";
    document.head.appendChild(l);
  }
  function injectCSS() {
    if (document.getElementById("vd-mm-css") || document.querySelector('link[href*="veedeck-megamenu.css"]')) return;
    var st = document.createElement("style");
    st.id = "vd-mm-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ── Budowa panelu (desktop) ──
  function buildPanel() {
    var L = lang();
    var mods = MODULES.map(function (m) {
      return '<a class="vd-mm-mi' + (m.ai ? " vd-mm-mi--ai" : "") + '" href="' + modHref(m) + '">' +
        '<span class="vd-mm-ic' + (m.ai ? " vd-mm-ic--ai" : "") + '">' + iconHTML(m.icon) + "</span>" +
        '<span class="vd-mm-tx"><span class="vd-mm-name">' + m[L] +
        (m.ai ? ' <span class="vd-mm-ai-badge">AI</span>' : "") +
        (m.soon ? ' <span class="vd-mm-soon">' + (L === "en" ? "Soon" : "Wkrótce") + "</span>" : "") +
        '</span><span class="vd-mm-desc">' + m["d" + L] + "</span></span></a>";
    }).join("");

    var views = VIEWS.map(function (v) {
      return '<a class="vd-mm-view" href="' + PANELS_LINK + '">' +
        '<span class="material-symbols-rounded">' + v.icon + "</span>" +
        '<span class="v-tx"><span class="v-n">' + v[L] + '</span><span class="v-d">' + v["d" + L] + "</span></span>" +
        '<span class="material-symbols-rounded v-ar">arrow_forward</span></a>';
    }).join("");

    var panel = document.createElement("div");
    panel.className = "vd-mm-panel";
    panel.setAttribute("role", "region");
    panel.innerHTML =
      '<div class="vd-mm-grid">' +
        '<div class="vd-mm-mods">' +
          '<a class="vd-mm-eyebrow vd-mm-eyebrow--link" href="' + MODULES_PAGE + '">' + STR.moduly[L] + ' <span class="ct">· 12</span></a>' +
          '<div class="vd-mm-mgrid">' + mods + "</div>" +
        "</div>" +
        '<div class="vd-mm-promo">' +
          '<div class="vd-mm-card">' +
            '<div class="pc-eyebrow">' + STR.eyebrow[L] + "</div>" +
            "<h4>" + STR.panels[L] + "</h4>" +
            '<div class="pc-sub">' + STR.panelsub[L] + "</div>" +
            '<div class="vd-mm-views">' + views + "</div>" +
          "</div>" +
          '<a class="vd-mm-plugin" href="' + PLUGIN_PAGE + '">' +
            '<span class="pp-ic"><img src="/veepick-icon.png" alt="veepick"></span>' +
            '<div class="pp-bd"><div class="pp-name">' + STR.plugName[L] + "</div>" +
            '<div class="pp-desc">' + STR.plugDesc[L] + "</div>" +
            '<div class="pp-tag">Chrome · Edge · Firefox</div></div>' +
            '<span class="material-symbols-rounded pp-ar">arrow_forward</span>' +
          "</a>" +
        "</div>" +
      "</div>";
    return panel;
  }

  // ── Pozycjonowanie pod navbarem ──
  function positionPanel(panel, nav) {
    var h = nav ? nav.getBoundingClientRect().bottom : 68;
    panel.style.top = Math.max(0, h + 6) + "px";
  }

  // ── Desktop: wstaw trigger + panel ──
  function setupDesktop(nav) {
    var links = nav.querySelector(".nav-links");
    if (!links) return;

    var trigger = links.querySelector(".vd-mm-trigger");
    if (!trigger) {
      var modLink = links.querySelector('a[href="' + MODULES_PAGE + '"]');
      var plugLink = links.querySelector('a[href="' + PLUGIN_PAGE + '"]');
      var anchor = modLink || links.firstElementChild;
      trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "vd-mm-trigger";
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML = '<span class="vd-mm-lbl">' + STR.funkcje[lang()] + "</span>" +
        '<svg class="vd-mm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';
      if (anchor) links.insertBefore(trigger, anchor);
      if (modLink) modLink.remove();
      if (plugLink) plugLink.remove();
    }

    var backdrop = document.createElement("div");
    backdrop.className = "vd-mm-backdrop";
    document.body.appendChild(backdrop);

    var panel = buildPanel();
    document.body.appendChild(panel);

    var openState = false, hideTimer = null;
    function open() {
      clearTimeout(hideTimer);
      positionPanel(panel, nav);
      panel.classList.add("show");
      backdrop.classList.add("show");
      trigger.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      openState = true;
    }
    function close() {
      panel.classList.remove("show");
      backdrop.classList.remove("show");
      trigger.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      openState = false;
    }
    function deferClose() { clearTimeout(hideTimer); hideTimer = setTimeout(close, 140); }

    trigger.addEventListener("mouseenter", open);
    trigger.addEventListener("mouseleave", deferClose);
    trigger.addEventListener("click", function (e) { e.preventDefault(); openState ? close() : open(); });
    panel.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
    panel.addEventListener("mouseleave", deferClose);
    backdrop.addEventListener("click", close);
    panel.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("resize", function () { if (openState) positionPanel(panel, nav); });
    window.addEventListener("scroll", function () { if (openState) positionPanel(panel, nav); }, { passive: true });

    // rebuild on language change
    nav._vdRebuild = function () {
      var lbl = trigger.querySelector(".vd-mm-lbl");
      if (lbl) lbl.textContent = STR.funkcje[lang()];
      var fresh = buildPanel();
      panel.innerHTML = fresh.innerHTML;
    };
  }

  // ── Mobile: "Funkcje" split — tekst → /moduly, chevron → akordeon ──
  function setupMobile(nav) {
    var inner = document.querySelector(".mobile-menu-inner");
    if (!inner || inner.querySelector(".vd-mm-macc")) return;

    var modLink = inner.querySelector('a.menu-link[href="' + MODULES_PAGE + '"]');
    var plugLink = inner.querySelector('a.menu-link[href="' + PLUGIN_PAGE + '"]');
    var anchor = modLink || inner.firstElementChild;
    var L = lang();

    // Wrapper: tekst-link + button z chevronem
    var wrapper = document.createElement("div");
    wrapper.className = "menu-link vd-mm-macc vd-mm-msplit";

    var textLink = document.createElement("a");
    textLink.href = MODULES_PAGE;
    textLink.className = "vd-mm-msplit-lbl";
    textLink.innerHTML = '<span class="vd-mm-mlbl">' + STR.funkcje[L] + "</span>";

    var chevBtn = document.createElement("button");
    chevBtn.type = "button";
    chevBtn.className = "vd-mm-msplit-chev";
    chevBtn.setAttribute("aria-label", "Rozwiń moduły");
    chevBtn.innerHTML = '<svg class="am-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';

    wrapper.appendChild(textLink);
    wrapper.appendChild(chevBtn);

    var sub = document.createElement("div");
    sub.className = "vd-mm-msub";

    function fillSub() {
      var l2 = lang();
      function row(href, icHTML, name, desc, soon, ai) {
        return '<a class="vd-mm-srow" href="' + href + '">' +
          '<span class="sic' + (ai ? " vd-mm-ic--ai" : "") + '">' + icHTML + "</span>" +
          '<span class="stx"><span class="snm">' + name +
          (ai ? ' <span class="vd-mm-ai-badge">AI</span>' : "") +
          (soon ? ' <span class="vd-mm-soon">' + (l2 === "en" ? "Soon" : "Wkrótce") + "</span>" : "") +
          '</span><span class="sd">' + desc + "</span></span></a>";
      }
      var mods = MODULES.map(function (m) {
        return row(modHref(m), iconHTML(m.icon), m[l2], m["d" + l2], m.soon, m.ai);
      }).join("");
      var views = VIEWS.map(function (v) {
        return row(PANELS_LINK, '<span class="material-symbols-rounded">' + v.icon + "</span>", v[l2], v["d" + l2]);
      }).join("");
      var plug = row(PLUGIN_PAGE, '<img src="/veepick-icon.png" alt="">', STR.plugName[l2], STR.plugDesc[l2]);
      sub.innerHTML =
        '<a class="sub-h sub-h--link" href="' + MODULES_PAGE + '">' + STR.moduly[l2] + ' <span class="ct">· 12</span></a>' + mods +
        '<div class="sub-h">' + STR.widoki[l2] + ' <span class="ct">· 3</span></div>' + views +
        '<div class="sub-h">' + STR.plugName[l2] + "</div>" + plug;
    }
    fillSub();

    if (anchor) {
      inner.insertBefore(wrapper, anchor);
      inner.insertBefore(sub, anchor);
    }
    if (modLink) modLink.remove();
    if (plugLink) plugLink.remove();

    chevBtn.addEventListener("click", function () {
      var on = sub.classList.toggle("open");
      wrapper.classList.toggle("open", on);
      chevBtn.setAttribute("aria-label", on ? "Zwiń moduły" : "Rozwiń moduły");
    });

    nav._vdRebuildMobile = function () {
      var lbl = wrapper.querySelector(".vd-mm-mlbl");
      if (lbl) lbl.textContent = STR.funkcje[lang()];
      fillSub();
    };
  }
  function init() {
    var nav = document.getElementById("siteNav") || document.querySelector("nav.top");
    if (!nav) return;
    ensureFont();
    injectCSS();
    setupDesktop(nav);
    setupMobile(nav);

    // reaguj na zmianę języka (klik flagi w przełączniku i18n)
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-lang]")) {
        setTimeout(function () {
          if (nav._vdRebuild) nav._vdRebuild();
          if (nav._vdRebuildMobile) nav._vdRebuildMobile();
        }, 0);
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
