/* veedeck-reveal.js — wspólny silnik animacji scroll-reveal („Subtelne unoszenie")
   Dołącz na dowolnej podstronie:  <script src="veedeck-reveal.js"></script>
   (po treści / przed </body>). Sam wstrzykuje CSS i wykrywa nagłówki sekcji
   oraz siatki kart — pomijając hero, nawigację, stopkę i menu.
   Respektuje prefers-reduced-motion (treść pokazuje się od razu).            */
(function () {
  if (window.__veedeckReveal) return;
  window.__veedeckReveal = true;

  /* ---- CSS (raz) ---- */
  if (!document.getElementById('veedeck-reveal-css')) {
    var st = document.createElement('style');
    st.id = 'veedeck-reveal-css';
    st.textContent =
      '@media (prefers-reduced-motion: no-preference){' +
      '.reveal{opacity:0;transform:translateY(24px);' +
      'transition:opacity .6s cubic-bezier(.22,.61,.36,1),transform .6s cubic-bezier(.22,.61,.36,1);' +
      'will-change:opacity,transform;}' +
      '.reveal.in{opacity:1;transform:none;}}';
    document.head.appendChild(st);
  }

  function run() {
    var EXCLUDE = '.page-hero, .hero, nav, header, footer, .mobile-menu, .mobile-backdrop, .modal, .vp-stage, .render-stage, [data-no-reveal]';
    var GRID_RE = /(grid|cards|values|tiers|plans|pricing|benefits|features|steps|stats|panels|channels|points|shops|metrics|columns|list|row)/i;
    var CARD_RE = /(card|value|benefit|step|panel|tcard|chip|tier|plan|feature|module|item|cell|stat|faq|channel|point|shop|metric|price|col)/i;

    function inExcluded(el) { return !!(el.closest && el.closest(EXCLUDE)); }
    function clsOf(el) { return el.getAttribute ? (el.getAttribute('class') || '') : ''; }
    function elKids(el) {
      var out = [], c = el.children, i;
      for (i = 0; i < c.length; i++) if (c[i].nodeType === 1) out.push(c[i]);
      return out;
    }

    var marked = [];
    function mark(el, i) {
      if (!el || el.nodeType !== 1 || el.classList.contains('reveal')) return;
      if (inExcluded(el)) return;
      el.classList.add('reveal');
      if (i) el.style.transitionDelay = (Math.min(i, 6) * 70) + 'ms';
      marked.push(el);
    }
    function staggerKids(kids) { for (var i = 0; i < kids.length; i++) mark(kids[i], i); }

    /* ---- Pass A: nagłówki sekcji (klasa zawiera "head" i jest w niej eyebrow / nagłówek) ---- */
    document.querySelectorAll('[class*="head"]').forEach(function (h) {
      if (inExcluded(h)) return;
      if (h.closest('.reveal')) return;
      if (h.querySelector(':scope > .eyebrow, :scope > .section-eyebrow, :scope > h1, :scope > h2, :scope > h3')) {
        staggerKids(elKids(h));
      }
    });

    /* ---- Pass B: siatki / rzędy kart ---- */
    document.querySelectorAll('section, main').forEach(function (root) {
      if (inExcluded(root)) return;
      root.querySelectorAll('*').forEach(function (c) {
        if (c.classList.contains('reveal') || c.closest('.reveal')) return;
        if (inExcluded(c)) return;
        var disp = getComputedStyle(c).display;
        if (disp !== 'grid' && disp !== 'flex') return;
        var kids = elKids(c);
        if (kids.length < 2) return;
        var cardish = 0;
        for (var i = 0; i < kids.length; i++) if (CARD_RE.test(clsOf(kids[i]))) cardish++;
        if (GRID_RE.test(clsOf(c)) || cardish >= 2) staggerKids(kids);
      });
    });

    /* ---- Pass C: sekcje bez żadnego reveal — odsłoń ich główną treść ---- */
    document.querySelectorAll('section').forEach(function (sec) {
      if (inExcluded(sec)) return;
      if (sec.querySelector('.reveal')) return;
      var cont = sec.querySelector(':scope > .container') || sec;
      var kids = elKids(cont);
      if (kids.length === 1) { cont = kids[0]; kids = elKids(cont); } // rozpakuj jeden poziom
      if (kids.length) staggerKids(kids);
    });

    /* ---- Odsłanianie ---- */
    if (!('IntersectionObserver' in window)) {
      marked.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    marked.forEach(function (el) { io.observe(el); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
