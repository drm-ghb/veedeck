/**
 * build-site-i18n.mjs
 * Generates /pl/ and /en/ static HTML trees from the source site files.
 *
 * Usage:  node scripts/build-site-i18n.mjs
 *
 * Output: site/pl/**  site/en/**
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = join(__dirname, '../site');
const DOMAIN = 'https://veedeck.com';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Load VEEDECK_I18N dictionary from veedeck-i18n.js
// ─────────────────────────────────────────────────────────────────────────────
const i18nSrc = readFileSync(join(SITE, 'veedeck-i18n.js'), 'utf8');
const dictPart = i18nSrc.split('(function ()')[0];
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(dictPart, ctx);
const I18N = ctx.window.VEEDECK_I18N || {};
// Sort longest key first to avoid partial-match replacements
const DICT_ENTRIES = Object.entries(I18N).sort((a, b) => b[0].length - a[0].length);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pages configuration
// ─────────────────────────────────────────────────────────────────────────────
const PAGES = [
  // ── Marketing pages ──────────────────────────────────────────────────────
  {
    src: 'index.html',
    plDir: 'pl', enDir: 'en',
    plUrl: '/pl/', enUrl: '/en/',
    enTitle: 'veedeck - The all-in-one platform for interior designers',
    enDesc: 'veedeck is the platform for interior design studios: project management, renders with pins, shopping lists, client portal and more. 14-day free trial.',
    type: 'marketing',
  },
  {
    src: 'cennik.html',
    plDir: 'pl/cennik', enDir: 'en/pricing',
    plUrl: '/pl/cennik/', enUrl: '/en/pricing/',
    enTitle: 'Pricing | veedeck',
    enDesc: 'Simple, transparent pricing for veedeck. Choose the plan that fits your studio. 14-day free trial, no credit card required.',
    type: 'marketing',
  },
  {
    src: 'o-nas.html',
    plDir: 'pl/o-nas', enDir: 'en/about',
    plUrl: '/pl/o-nas/', enUrl: '/en/about/',
    enTitle: 'About us | veedeck',
    enDesc: 'Learn about the veedeck team and mission: building the best platform for interior design studios.',
    type: 'marketing',
  },
  {
    src: 'wtyczka.html',
    plDir: 'pl/wtyczka', enDir: 'en/plugin',
    plUrl: '/pl/wtyczka/', enUrl: '/en/plugin/',
    enTitle: 'veepick Plugin | veedeck',
    enDesc: 'The veepick browser extension for interior designers: add products from any online shop to your veedeck shopping lists in one click.',
    type: 'marketing',
  },
  {
    src: 'moduly.html',
    plDir: 'pl/moduly', enDir: 'en/modules',
    plUrl: '/pl/moduly/', enUrl: '/en/modules/',
    enTitle: 'Modules | veedeck',
    enDesc: 'Nine modules in one platform: ProjectFlow, shopping lists, clients, contractors, tasks, surveys, calendar, notes and discussions.',
    type: 'marketing',
  },
  {
    src: 'kontakt.html',
    plDir: 'pl/kontakt', enDir: 'en/contact',
    plUrl: '/pl/kontakt/', enUrl: '/en/contact/',
    enTitle: 'Contact | veedeck',
    enDesc: 'Get in touch with the veedeck team. Book a demo or ask your question directly.',
    type: 'marketing',
  },
  {
    src: 'demo.html',
    plDir: 'pl/demo', enDir: 'en/demo',
    plUrl: '/pl/demo/', enUrl: '/en/demo/',
    enTitle: 'Book a demo | veedeck',
    enDesc: 'Book a personal veedeck walkthrough. See how the platform works in your interior design workflow.',
    type: 'marketing',
  },
  {
    src: 'polityka-prywatnosci.html',
    plDir: 'pl/polityka-prywatnosci', enDir: 'en/privacy-policy',
    plUrl: '/pl/polityka-prywatnosci/', enUrl: '/en/privacy-policy/',
    enTitle: 'Privacy Policy | veedeck',
    enDesc: 'Privacy policy for veedeck platform users.',
    type: 'marketing',
  },
  {
    src: 'polityka-prywatnosci-veepick.html',
    enSrc: 'privacy-policy-veepick.html',   // separate EN source already in English
    plDir: 'pl/polityka-prywatnosci-veepick', enDir: 'en/privacy-policy-veepick',
    plUrl: '/pl/polityka-prywatnosci-veepick/', enUrl: '/en/privacy-policy-veepick/',
    enTitle: 'Privacy Policy - veepick | veedeck',
    enDesc: 'Privacy policy for the veepick browser extension.',
    type: 'marketing',
  },
  {
    src: 'polityka-cookies.html',
    plDir: 'pl/polityka-cookies', enDir: 'en/cookie-policy',
    plUrl: '/pl/polityka-cookies/', enUrl: '/en/cookie-policy/',
    enTitle: 'Cookie Policy | veedeck',
    enDesc: 'Cookie policy for veedeck.com.',
    type: 'marketing',
  },

  // ── Pomoc / Help pages ───────────────────────────────────────────────────
  {
    src: 'pomoc/index.html',
    plDir: 'pl/pomoc', enDir: 'en/help',
    plUrl: '/pl/pomoc/', enUrl: '/en/help/',
    enTitle: 'veedeck - Help Center | support and frequently asked questions',
    enDesc: "Find answers to the most common questions about veedeck: setup, panels, the veepick plugin and payments. Didn't find what you need? Write to us.",
    type: 'pomoc', pomocKey: 'pomoc-index',
  },
  {
    src: 'pomoc/faq/index.html',
    plDir: 'pl/pomoc/faq', enDir: 'en/help/faq',
    plUrl: '/pl/pomoc/faq/', enUrl: '/en/help/faq/',
    enTitle: 'FAQ | veedeck Help Center',
    enDesc: 'Frequently asked questions about veedeck: trials, client access, veepick plugin, interface language and team size.',
    type: 'pomoc', pomocKey: 'faq',
  },
  {
    src: 'pomoc/jak-zaczac/index.html',
    plDir: 'pl/pomoc/jak-zaczac', enDir: 'en/help/getting-started',
    plUrl: '/pl/pomoc/jak-zaczac/', enUrl: '/en/help/getting-started/',
    enTitle: 'Getting started | veedeck Help Center',
    enDesc: 'Step-by-step guide to getting started with veedeck: registration, login and password reset.',
    type: 'pomoc', pomocKey: 'jak-zaczac',
  },
  {
    src: 'pomoc/dla-projektantow/index.html',
    plDir: 'pl/pomoc/dla-projektantow', enDir: 'en/help/for-designers',
    plUrl: '/pl/pomoc/dla-projektantow/', enUrl: '/en/help/for-designers/',
    enTitle: 'For designers | veedeck Help Center',
    enDesc: 'Guide to all modules in the designer panel: ProjectFlow, shopping lists, clients, contractors, veepick plugin and more.',
    type: 'pomoc', pomocKey: 'dla-projektantow',
  },
  {
    src: 'pomoc/dla-klientow-i-wykonawcow/index.html',
    plDir: 'pl/pomoc/dla-klientow-i-wykonawcow', enDir: 'en/help/for-clients-and-contractors',
    plUrl: '/pl/pomoc/dla-klientow-i-wykonawcow/', enUrl: '/en/help/for-clients-and-contractors/',
    enTitle: 'For clients &amp; contractors | veedeck Help Center',
    enDesc: 'How to browse a shared project, leave comments, approve products and work with files — from the client and contractor perspective.',
    type: 'pomoc', pomocKey: 'dla-klientow-i-wykonawcow',
  },
  {
    src: 'pomoc/rozwiazywanie-problemow/index.html',
    plDir: 'pl/pomoc/rozwiazywanie-problemow', enDir: 'en/help/troubleshooting',
    plUrl: '/pl/pomoc/rozwiazywanie-problemow/', enUrl: '/en/help/troubleshooting/',
    enTitle: 'Troubleshooting | veedeck Help Center',
    enDesc: 'Most common issues with login, renders, shopping lists, payments and the veepick plugin — and how to fix them quickly.',
    type: 'pomoc', pomocKey: 'rozwiazywanie-problemow',
  },
  {
    src: 'pomoc/zglos-blad/index.html',
    plDir: 'pl/pomoc/zglos-blad', enDir: 'en/help/report-a-bug',
    plUrl: '/pl/pomoc/zglos-blad/', enUrl: '/en/help/report-a-bug/',
    enTitle: 'Report a bug | veedeck Help Center',
    enDesc: 'Bug report form for veedeck. Describe the issue and the team will respond within 24 hours on working days.',
    type: 'pomoc', pomocKey: 'zglos-blad',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. EN content templates for Pomoc pages
//    Each template replaces everything between <!-- HERO --> and <!-- FOOTER -->
// ─────────────────────────────────────────────────────────────────────────────
const ARROW_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"></path></svg>`;

const EN_SUB_NAV = (activeKey) => {
  const links = [
    { key: 'getting-started', href: '/en/help/getting-started/', label: 'Getting started' },
    { key: 'for-designers',   href: '/en/help/for-designers/',   label: 'For designers' },
    { key: 'for-clients',     href: '/en/help/for-clients-and-contractors/', label: 'For clients &amp; contractors' },
    { key: 'faq',             href: '/en/help/faq/',             label: 'FAQ' },
    { key: 'troubleshooting', href: '/en/help/troubleshooting/', label: 'Troubleshooting' },
    { key: 'report-a-bug',    href: '/en/help/report-a-bug/',    label: 'Report a bug' },
  ];
  return `<div class="sub-nav">${links.map(l =>
    `<a href="${l.href}"${l.key === activeKey ? ' class="active"' : ''}>${l.label}</a>`
  ).join('\n      ')}</div>`;
};

const FILTER_HELP_SCRIPT = `
<script>
  function filterHelp(query) {
    var q = query.trim().toLowerCase();
    var items = document.querySelectorAll('.help-section .acc');
    items.forEach(function (item) {
      var text = item.textContent.toLowerCase();
      var match = !q || text.indexOf(q) !== -1;
      item.style.display = match ? '' : 'none';
      if (q && match) item.open = true;
    });
  }
</script>
`;

const POMOC_EN_CONTENT = {

  // ── /en/help/ ─────────────────────────────────────────────────────────────
  'pomoc-index': `<!-- HERO -->
<section class="page-hero">
  <div class="container">
    <div class="eyebrow">Help Center</div>
    <h1>How can we help you?</h1>
    <p class="lead">Instructions, answers to the most common questions and support — for designers, clients and contractors using veedeck.</p>
    <div class="help-search">
      <span class="material-symbols-rounded">search</span>
      <input type="text" id="helpSearch" placeholder="Search e.g. &ldquo;pin&rdquo;, &ldquo;veepick&rdquo;, &ldquo;password&rdquo;…" oninput="filterHelp(this.value)">
    </div>
    <div class="help-quick">
      <a href="/en/help/getting-started/">Getting started</a>
      <a href="/en/help/for-designers/">For designers</a>
      <a href="/en/help/for-clients-and-contractors/">For clients &amp; contractors</a>
      <a href="/en/help/faq/">FAQ</a>
      <a href="/en/help/troubleshooting/">Troubleshooting</a>
      <a href="/en/help/report-a-bug/">Report a bug</a>
    </div>
  </div>
</section>

<!-- ROLE CARDS -->
<section class="role-section">
  <div class="container">
    <div class="role-grid">
      <a class="role-card" href="/en/help/getting-started/" style="display:block;">
        <div class="ic"><span class="material-symbols-rounded">rocket_launch</span></div>
        <h3>Getting started</h3>
        <p>Registration, login and first steps in veedeck — in 5 minutes.</p>
        <span class="go">Go ${ARROW_SVG}</span>
      </a>
      <a class="role-card" href="/en/help/for-designers/" style="display:block;">
        <div class="ic"><span class="material-symbols-rounded">design_services</span></div>
        <h3>For designers</h3>
        <p>ProjectFlow, shopping lists, clients, contractors, veepick plugin and more.</p>
        <span class="go">Go ${ARROW_SVG}</span>
      </a>
      <a class="role-card" href="/en/help/for-clients-and-contractors/" style="display:block;">
        <div class="ic"><span class="material-symbols-rounded">groups</span></div>
        <h3>For clients &amp; contractors</h3>
        <p>How to browse a project, leave comments and approve products.</p>
        <span class="go">Go ${ARROW_SVG}</span>
      </a>
      <a class="role-card" href="/en/help/faq/" style="display:block;">
        <div class="ic"><span class="material-symbols-rounded">quiz</span></div>
        <h3>FAQ</h3>
        <p>Frequently asked questions about veedeck, plans and the veepick plugin.</p>
        <span class="go">Go ${ARROW_SVG}</span>
      </a>
      <a class="role-card" href="/en/help/troubleshooting/" style="display:block;">
        <div class="ic"><span class="material-symbols-rounded">build</span></div>
        <h3>Troubleshooting</h3>
        <p>Login, renders, shopping lists, payments and the veepick plugin.</p>
        <span class="go">Go ${ARROW_SVG}</span>
      </a>
      <a class="role-card" href="/en/help/report-a-bug/" style="display:block;">
        <div class="ic"><span class="material-symbols-rounded">bug_report</span></div>
        <h3>Report a bug</h3>
        <p>Bug report form — we respond within 24 hours.</p>
        <span class="go">Go ${ARROW_SVG}</span>
      </a>
    </div>
  </div>
</section>

<script>
  function filterHelp(query) {
    var q = query.trim().toLowerCase();
    var items = document.querySelectorAll('.role-section .role-card');
    items.forEach(function (item) {
      var text = item.textContent.toLowerCase();
      var match = !q || text.indexOf(q) !== -1;
      item.style.display = match ? '' : 'none';
    });
  }
</script>
`,

  // ── /en/help/faq/ ─────────────────────────────────────────────────────────
  'faq': `<!-- HERO -->
<section class="page-hero sub-hero">
  <div class="container">
    <div class="breadcrumb"><a href="/en/help/">Help Center</a><span>／</span><span>FAQ</span></div>
    <div class="eyebrow">FAQ</div>
    <h1>Frequently asked questions</h1>
    <p class="lead">Quick answers to questions designers and clients ask most often.</p>
    <div class="help-search">
      <span class="material-symbols-rounded">search</span>
      <input type="text" id="helpSearch" placeholder="Search on this page…" oninput="filterHelp(this.value)">
    </div>
    ${EN_SUB_NAV('faq')}
  </div>
</section>

<section class="help-section" id="faq">
  <div class="container">
    <div class="acc-group">
      <details class="acc" open>
        <summary><span class="sum-title">Can I try veedeck without providing a payment card?</span></summary>
        <div class="acc-body"><p>Yes — registration gives you 30 days of full access without a card.</p></div>
      </details>
      <details class="acc">
        <summary><span class="sum-title">Does the client need to create an account to see a project?</span></summary>
        <div class="acc-body"><p>Yes. Client access to a project always goes through an account that you create for them in the Clients module (via email invitation or manually).</p></div>
      </details>
      <details class="acc">
        <summary><span class="sum-title">Is the veepick plugin available in all plans?</span></summary>
        <div class="acc-body"><p>Yes, it is included in every plan.</p></div>
      </details>
      <details class="acc">
        <summary><span class="sum-title">Can I change the interface language?</span></summary>
        <div class="acc-body"><p>Yes — Settings → Appearance → Interface language (Polish / English).</p></div>
      </details>
      <details class="acc">
        <summary><span class="sum-title">Can the client see my tasks and notes?</span></summary>
        <div class="acc-body"><p>No. Tasks and notes are private — visible only to you and your team.</p></div>
      </details>
      <details class="acc">
        <summary><span class="sum-title">How many people can I invite to the team?</span></summary>
        <div class="acc-body"><p>It depends on your plan — check current limits in Settings → Plan &amp; billing or on the <a href="/en/pricing/">pricing page</a>.</p></div>
      </details>
    </div>
  </div>
</section>
${FILTER_HELP_SCRIPT}`,

  // ── /en/help/getting-started/ ─────────────────────────────────────────────
  'jak-zaczac': `<!-- HERO -->
<section class="page-hero sub-hero">
  <div class="container">
    <div class="breadcrumb"><a href="/en/help/">Help Center</a><span>／</span><span>Getting started</span></div>
    <div class="eyebrow">Start</div>
    <h1>Getting started</h1>
    <p class="lead">veedeck works with three panels tailored to each role: designer panel, client panel, and contractor panel. Below is a step-by-step guide: registration, login and password reset.</p>
    <div class="help-search">
      <span class="material-symbols-rounded">search</span>
      <input type="text" id="helpSearch" placeholder="Search on this page…" oninput="filterHelp(this.value)">
    </div>
    ${EN_SUB_NAV('getting-started')}
  </div>
</section>

<section class="help-section" id="getting-started">
  <div class="container">
    <div class="acc-group">
      <details class="acc" open>
        <summary><span class="material-symbols-rounded lead-ic">person_add</span><span class="sum-title">Registration (for designers)</span></summary>
        <div class="acc-body">
          <ol>
            <li>Go to the login page and select "Sign up".</li>
            <li>Enter your name, email address and password (min. 8 characters, including a lowercase letter, uppercase letter and a digit).</li>
            <li>Check your email inbox — you'll receive an activation link valid for 24 hours.</li>
            <li>Click the link to activate your account.</li>
          </ol>
          <p>After activation you get a 30-day trial period — no credit card required.</p>
        </div>
      </details>
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">login</span><span class="sum-title">Log in</span></summary>
        <div class="acc-body"><p>Standard email + password form, available on the login page.</p></div>
      </details>
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">lock_reset</span><span class="sum-title">Forgot my password</span></summary>
        <div class="acc-body">
          <ol>
            <li>On the login page, click "Forgot my password".</li>
            <li>Enter your account email address.</li>
            <li>Check your inbox (including the spam folder) — you'll receive a password reset link.</li>
            <li>Click the link and set a new password.</li>
          </ol>
        </div>
      </details>
    </div>
  </div>
</section>
${FILTER_HELP_SCRIPT}`,

  // ── /en/help/for-designers/ ───────────────────────────────────────────────
  'dla-projektantow': `<!-- HERO -->
<section class="page-hero sub-hero">
  <div class="container">
    <div class="breadcrumb"><a href="/en/help/">Help Center</a><span>／</span><span>For designers</span></div>
    <div class="eyebrow">Modules</div>
    <h1>For designers</h1>
    <p class="lead">A guide to all modules in the designer panel: ProjectFlow, shopping lists, clients, contractors, the veepick plugin and more.</p>
    <div class="help-search">
      <span class="material-symbols-rounded">search</span>
      <input type="text" id="helpSearch" placeholder="Search on this page…" oninput="filterHelp(this.value)">
    </div>
    ${EN_SUB_NAV('for-designers')}
  </div>
</section>

<section class="help-section" id="for-designers">
  <div class="container">
    <div class="acc-group">

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">space_dashboard</span><span class="sum-title">Main dashboard</span></summary>
        <div class="acc-body">
          <p>Your starting dashboard — at a glance you see what needs attention: number of clients, active projects and shopping lists, recent projects with render preview, tasks for today and overdue ones, unread comments/pins, requests to change status or restore a version, and unread chat messages.</p>
          <p>Clicking any element takes you straight to the right place in the app.</p>
        </div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">push_pin</span><span class="sum-title">ProjectFlow - renders &amp; visualisations</span></summary>
        <div class="acc-body">
          <p>The heart of veedeck: upload renders, organise them into rooms and collect live client feedback. Structure: <strong>Project → Rooms</strong> (e.g. Living room, Kitchen) <strong>→ (optional folders) → Renders</strong>.</p>
          <p><strong>How to add a new project:</strong></p>
          <ol><li>Open "ProjectFlow" in the sidebar.</li><li>Click "New project".</li><li>Enter a title and optionally assign a client from the database.</li><li>Click "Create".</li></ol>
          <p><strong>How to add a render to a room:</strong></p>
          <ol><li>Open a project.</li><li>Click the room you want to add a file to (or create a new one with the "+" icon).</li><li>Click "Add render" or drag the file onto the upload area.</li></ol>
          <p>Supported formats: JPEG, PNG, WebP, HEIC and PDF. Render statuses: <em>Under review</em> → <em>Accepted</em> / <em>Rejected</em>. Uploading a new file to an existing render creates the next version — previous ones are preserved in the history and can be compared or restored.</p>
          <p><strong>Comments and pins:</strong> the client (if you allow it) clicks directly on the image to leave a note at a specific spot. You see every comment with a status of New / In progress / Done and can reply in the thread.</p>
          <p><strong>How to share a project with a client:</strong></p>
          <ol><li>Go to the "Clients" module.</li><li>Open the client profile → "Contacts" tab.</li><li>Select a contact person (or add a new one) and assign them to the project.</li></ol>
          <p><strong>What you can configure per project</strong> (Project settings): whether the client can comment and place pins, independently accept renders, change status without requesting approval, restore older versions, upload their own files, and which modules are visible to them.</p>
        </div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">local_mall</span><span class="sum-title">Shopping lists</span></summary>
        <div class="acc-body">
          <p>Product breakdowns (furniture, lighting, fixtures, etc.) for client approval. Structure: <strong>List → Sections → Products</strong>.</p>
          <p><strong>How to add a product:</strong></p>
          <ol><li>Open a list and select (or create) a section.</li><li>Click "+ Add product".</li><li>Paste a shop link, fill in data manually, pick from the product library, or use the veepick plugin.</li></ol>
          <p><strong>Faster product adding — veepick plugin:</strong> instead of copying data by hand, install <a href="https://chromewebstore.google.com/detail/veepick/ahnalaifooponobepoccpecdhdkgalmd?hl=en" target="_blank" rel="noopener noreferrer" style="color:#7C3AED;text-decoration:underline;font-weight:600;">→ veepick in the Chrome Web Store</a>. When you're on a product page in a shop, click the plugin icon, select the shopping list and confirm — the data (name, image, price, link) fills in automatically.</p>
          <p>Product statuses are set by the client: no status → Accepted / Rejected. The list can be exported to PDF or CSV (list menu → three dots), with full product data and — if you share prices — totals.</p>
        </div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">group</span><span class="sum-title">Clients</span></summary>
        <div class="acc-body">
          <p>Your contact and investor database: add and edit clients, contact persons (each with their own login account), assign to projects, archive.</p>
          <p><strong>Email invitation:</strong> client profile → "Contacts" → select/add a person → "Send invitation". The client receives an email with a link to set their password (valid 24 h).</p>
          <p><strong>Manual account creation:</strong> client profile → "Contacts" → "Create account" and enter the credentials you share directly with the client.</p>
        </div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">engineering</span><span class="sum-title">Contractors</span></summary>
        <div class="acc-body">
          <p><strong>How to add a contractor and assign them to a project:</strong></p>
          <ol><li>Sidebar → "Contractors" → "Add contractor".</li><li>Enter a name or company name.</li><li>Open the profile → "Assign project" and select a project from the list.</li><li>In the assignment, add folders and upload files.</li></ol>
          <p>Folders have three types: Drawings, Visualisations, Other — you can also link a folder directly from ProjectFlow (syncs automatically) or hide it from the contractor.</p>
          <p>You create the contractor's account in their profile ("Create account") — you share the login credentials directly with them; the app does not send passwords by email automatically.</p>
        </div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">check_box</span><span class="sum-title">Tasks</span></summary>
        <div class="acc-body"><p>A simple task list with subtasks, priorities (Low / Medium / High) and statuses (To do / In progress / Done). Tasks are private — the client cannot see them. You can assign a task to a project, client or team member.</p></div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">assignment</span><span class="sum-title">Surveys</span></summary>
        <div class="acc-body">
          <p><strong>How to send a survey:</strong></p>
          <ol><li>Sidebar → "Surveys" → "New survey" (from scratch or from a template).</li><li>Add questions (short/long answer, single/multiple choice, rating, yes/no, budget range).</li><li>Assign to a client (optional).</li><li>Set the status to "Active" — otherwise the survey stays as a "Draft" and the client cannot see it.</li></ol>
          <p>The survey appears automatically in the assigned client's panel — no link needs to be sent. You'll see responses in the "Responses" tab.</p>
        </div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">calendar_month</span><span class="sum-title">Calendar &amp; Notepad</span></summary>
        <div class="acc-body"><p><strong>Calendar</strong> — events with date, time, description and a guest list (adding guests from the client database from the Studio plan). <strong>Notepad</strong> — notes with a text editor and attachments, private to you and your team.</p></div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">chat_bubble</span><span class="sum-title">Discussions</span></summary>
        <div class="acc-body"><p>A built-in messenger for internal conversations, project conversations (with clients) and conversations with contractors — in real time, without switching to email or external messaging apps.</p></div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">package_2</span><span class="sum-title">Product library</span></summary>
        <div class="acc-body"><p>A global product database for your workspace. Products are added here automatically when you add them to a shopping list (via link or manually) or save them with the veepick plugin — once saved, a product can be reused across multiple projects.</p></div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">extension</span><span class="sum-title">veepick plugin</span></summary>
        <div class="acc-body">
          <p>A browser extension that lets you add products from any online shop to shopping lists without copying data by hand. Available in all plans.</p>
          <p><strong>Installation:</strong></p>
          <ol><li>Install the veepick plugin from the Chrome Web Store (or Opera Add-ons).</li><li>Open the plugin panel and log in with the access key from Settings → Plugin (veepick).</li><li>Done — the plugin is connected to your account.</li></ol>
          <p><strong>How to add a product via veepick:</strong></p>
          <ol><li>Go to the product page in a shop.</li><li>Click the veepick icon in the browser toolbar.</li><li>Select a shopping list.</li><li>Confirm — the product data fills in automatically.</li></ol>
          <p>If the plugin doesn't fetch data from the page or shows an authorisation error — check in Settings whether the access key is up to date and try generating a new one.</p>
        </div>
      </details>

      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">settings</span><span class="sum-title">Settings &amp; account</span></summary>
        <div class="acc-body">
          <p>In Settings you manage: <strong>Profile</strong> (account details, photo), <strong>Branding</strong> (logo and welcome message visible in the client panel), <strong>Appearance</strong> (theme, light/dark/system mode, PL/EN language, module visibility), <strong>Users</strong> (team and permissions), <strong>Notifications</strong> (email summaries, modules and frequency), <strong>Plugin</strong> (access key), <strong>Plan &amp; billing</strong>, and <strong>Account</strong> (password, account deletion).</p>
        </div>
      </details>

    </div>
  </div>
</section>

<!-- GLOSSARY -->
<section class="help-section" id="glossary">
  <div class="container">
    <div class="help-head">
      <div class="eyebrow">Glossary</div>
      <h2>Glossary</h2>
    </div>
    <dl class="glossary-grid">
      <div class="gloss-item"><dt>Project</dt><dd>One design commission for one client — contains rooms, renders and shopping lists.</dd></div>
      <div class="gloss-item"><dt>Room</dt><dd>A space within a project (e.g. living room, kitchen) that groups renders.</dd></div>
      <div class="gloss-item"><dt>Render</dt><dd>A visualisation file (image or PDF) uploaded to a room, with a status and version history.</dd></div>
      <div class="gloss-item"><dt>Pin</dt><dd>A comment attached to a specific location on a render.</dd></div>
      <div class="gloss-item"><dt>Shopping list</dt><dd>A product breakdown prepared for the client, divided into sections.</dd></div>
      <div class="gloss-item"><dt>Product library</dt><dd>An archive of all saved products, ready to reuse in future projects.</dd></div>
      <div class="gloss-item"><dt>Workspace</dt><dd>Your working environment — all projects, clients and settings.</dd></div>
      <div class="gloss-item"><dt>Trial period</dt><dd>30 days of free access after registration, no credit card required.</dd></div>
      <div class="gloss-item"><dt>Client panel</dt><dd>A simplified project view for the client, without designer tools.</dd></div>
      <div class="gloss-item"><dt>Contractor panel</dt><dd>A view for the contractor — only their folders and files.</dd></div>
      <div class="gloss-item"><dt>Assignment</dt><dd>The link between a contractor and a specific project.</dd></div>
      <div class="gloss-item"><dt>veepick</dt><dd>A browser extension that adds products from online shops directly to shopping lists.</dd></div>
    </dl>
  </div>
</section>
${FILTER_HELP_SCRIPT}`,

  // ── /en/help/for-clients-and-contractors/ ────────────────────────────────
  'dla-klientow-i-wykonawcow': `<!-- HERO -->
<section class="page-hero sub-hero">
  <div class="container">
    <div class="breadcrumb"><a href="/en/help/">Help Center</a><span>／</span><span>For clients &amp; contractors</span></div>
    <div class="eyebrow">Panels</div>
    <h1>For clients &amp; contractors</h1>
    <p class="lead">How to browse a shared project, leave comments, approve products and work with files — from the client and contractor perspective.</p>
    <div class="help-search">
      <span class="material-symbols-rounded">search</span>
      <input type="text" id="helpSearch" placeholder="Search on this page…" oninput="filterHelp(this.value)">
    </div>
    ${EN_SUB_NAV('for-clients')}
  </div>
</section>

<section class="help-section" id="for-clients">
  <div class="container">
    <div class="help-head">
      <div class="eyebrow">Client panel</div>
      <h2>For clients</h2>
      <p>If the designer has shared a project with you, you access it through your own client account, which the designer creates for you. Once logged in, you see all assigned projects, shopping lists and surveys in one place.</p>
    </div>
    <div class="acc-group">
      <details class="acc" open>
        <summary><span class="material-symbols-rounded lead-ic">visibility</span><span class="sum-title">What you can do in your panel</span></summary>
        <div class="acc-body">
          <ul>
            <li>Browse renders and visualisations in the room gallery.</li>
            <li>Click directly on an image to leave a comment at a specific spot (a pin).</li>
            <li>Accept or reject renders and products on the shopping list.</li>
            <li>Browse and export the shopping list.</li>
            <li>Chat with the designer.</li>
            <li>From the Studio plan — see the project schedule, payments and documents.</li>
          </ul>
        </div>
      </details>
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">push_pin</span><span class="sum-title">How to leave a comment on a render</span></summary>
        <div class="acc-body">
          <ol><li>Open a render in full-screen view.</li><li>Click the area on the image that your note refers to.</li><li>Enter the comment text (optionally a title) and confirm.</li></ol>
          <p>The designer will see your comment immediately and will be able to reply.</p>
        </div>
      </details>
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">help</span><span class="sum-title">I don't see the commenting option / can't log in</span></summary>
        <div class="acc-body"><p>The ability to comment is controlled by the designer — if it is disabled for your project, contact them directly. Problem logging in? Check whether you have an account set up by the designer and use the "Forgot my password" option on the login page.</p></div>
      </details>
    </div>
  </div>
</section>

<section class="help-section" id="for-contractors">
  <div class="container">
    <div class="help-head">
      <div class="eyebrow">Contractor panel</div>
      <h2>For contractors</h2>
      <p>If the designer has assigned you to a project, you log in to the dedicated contractor panel using the account they created for you.</p>
    </div>
    <div class="acc-group">
      <details class="acc" open>
        <summary><span class="material-symbols-rounded lead-ic">folder_shared</span><span class="sum-title">What you see in your panel</span></summary>
        <div class="acc-body">
          <ul>
            <li>A list of projects you have been assigned to.</li>
            <li>Folders with files (drawings, visualisations, other documents) within each project.</li>
            <li>The ability to add pins and comments on files.</li>
            <li>A direct chat with the designer.</li>
            <li>Notifications about new files and messages.</li>
          </ul>
          <p>You see only your own assignments — you have no access to other contractors' or the designer's clients' data.</p>
        </div>
      </details>
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">visibility_off</span><span class="sum-title">I can't see a folder the designer mentioned</span></summary>
        <div class="acc-body"><p>Ask the designer to check whether the folder is set as hidden — folder visibility is controlled by the designer.</p></div>
      </details>
    </div>
  </div>
</section>
${FILTER_HELP_SCRIPT}`,

  // ── /en/help/troubleshooting/ ─────────────────────────────────────────────
  'rozwiazywanie-problemow': `<!-- HERO -->
<section class="page-hero sub-hero">
  <div class="container">
    <div class="breadcrumb"><a href="/en/help/">Help Center</a><span>／</span><span>Troubleshooting</span></div>
    <div class="eyebrow">Troubleshooting</div>
    <h1>Troubleshooting</h1>
    <p class="lead">The most common issues with login, renders, shopping lists, payments and the veepick plugin — and how to fix them quickly.</p>
    <div class="help-search">
      <span class="material-symbols-rounded">search</span>
      <input type="text" id="helpSearch" placeholder="Search on this page…" oninput="filterHelp(this.value)">
    </div>
    ${EN_SUB_NAV('troubleshooting')}
  </div>
</section>

<section class="help-section" id="troubleshooting">
  <div class="container">
    <div class="acc-group">
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">key</span><span class="sum-title">Login &amp; access</span></summary>
        <div class="acc-body">
          <p><strong>I can't log in (wrong credentials).</strong></p>
          <ol><li>Check that the email and password are entered correctly.</li><li>Use the "Forgot my password" option.</li><li>Check your inbox (including spam) for an activation email.</li><li>If the problem persists — contact veedeck support.</li></ol>
          <p><strong>I see a message about an expired trial.</strong> Click "Upgrade plan", choose a plan and complete payment — access is usually restored within a few minutes.</p>
          <p><strong>The invitation link doesn't work.</strong> Links are valid for 24 hours — ask the designer to resend the invitation.</p>
        </div>
      </details>
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">image</span><span class="sum-title">Renders &amp; files</span></summary>
        <div class="acc-body">
          <p><strong>A render won't open or takes a very long time to load.</strong> Refresh the page, try a different browser (Chrome recommended) — PDF files may take longer on a slower connection.</p>
          <p><strong>A file upload freezes or shows an error.</strong> Check the format (JPEG, PNG, WebP, HEIC, PDF) and try again — large files can take several minutes to upload.</p>
          <p><strong>A status changed but the other party can't see it.</strong> Ask them to refresh the page — updates happen in real time but require an active internet connection.</p>
        </div>
      </details>
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">shopping_cart</span><span class="sum-title">Shopping lists</span></summary>
        <div class="acc-body">
          <p><strong>The client accepted a product but the status didn't change.</strong> Refresh the list and check whether the client clicked the approval button rather than just viewing the product.</p>
          <p><strong>I can't export the list to PDF.</strong> Refresh the page, try in Chrome — if it still doesn't work, contact support.</p>
        </div>
      </details>
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">payments</span><span class="sum-title">Payments</span></summary>
        <div class="acc-body">
          <p><strong>Payment failed.</strong> Check your card details (number, CVV, expiry date), make sure the card supports online payments in the chosen currency, and contact your bank if you suspect a block.</p>
          <p><strong>I paid but still see the expired trial message.</strong> Wait 5–10 minutes and refresh the page. If access is still blocked after 15 minutes — contact support with proof of payment.</p>
        </div>
      </details>
      <details class="acc">
        <summary><span class="material-symbols-rounded lead-ic">extension_off</span><span class="sum-title">veepick plugin</span></summary>
        <div class="acc-body">
          <p><strong>The plugin won't connect to the account / shows an authorisation error.</strong> Check in Settings whether the access key is up to date — if in doubt, generate a new one.</p>
          <p><strong>The plugin doesn't fetch data from the shop page.</strong> Some pages block automatic data fetching — fill in the missing fields manually.</p>
        </div>
      </details>
    </div>
  </div>
</section>
${FILTER_HELP_SCRIPT}`,

  // ── /en/help/report-a-bug/ ────────────────────────────────────────────────
  'zglos-blad': `<!-- HERO -->
<section class="page-hero sub-hero">
  <div class="container">
    <div class="breadcrumb"><a href="/en/help/">Help Center</a><span>／</span><span>Report a bug</span></div>
    <div class="eyebrow">Support</div>
    <h1>Report a bug</h1>
    <p class="lead">Didn't find the answer in the Help Center and something isn't working as it should? Describe the issue — the veedeck team responds within 24 hours on working days.</p>
    <div class="help-search">
      <span class="material-symbols-rounded">search</span>
      <input type="text" id="helpSearch" placeholder="Search on this page…" oninput="filterHelp(this.value)">
    </div>
    ${EN_SUB_NAV('report-a-bug')}
  </div>
</section>

<section class="help-section bug-section" id="report-a-bug">
  <div class="container">
    <div class="help-head" style="margin: 0 auto 32px; text-align: center;">
      <div class="eyebrow">Support</div>
      <h2>Report a bug</h2>
      <p style="margin: 0 auto;">Didn't find the answer above and something isn't working as it should? Describe the issue — the veedeck team responds within 24 hours on working days.</p>
    </div>

    <div class="bug-card">
      <h3>Bug report form</h3>
      <p class="form-sub">The more details you provide, the faster we can find the cause.</p>

      <form class="bug-form" id="bugForm" action="https://formspree.io/f/xlgyqbjd" method="POST">
        <input type="hidden" name="_subject" value="Bug report from veedeck.com">
        <div class="bug-row">
          <div class="field">
            <label for="bg-name">Full name</label>
            <input id="bg-name" name="name" type="text" required placeholder="Anna Kowalska">
          </div>
          <div class="field">
            <label for="bg-email">Email</label>
            <input id="bg-email" name="email" type="email" required placeholder="anna@studio.com">
          </div>
        </div>

        <div class="bug-row">
          <div class="field">
            <label for="bg-role">Your role</label>
            <select id="bg-role" name="role">
              <option>Designer</option>
              <option>Client</option>
              <option>Contractor</option>
            </select>
          </div>
          <div class="field">
            <label for="bg-module">Module / area</label>
            <select id="bg-module" name="module">
              <option>ProjectFlow (renders)</option>
              <option>Shopping lists</option>
              <option>Clients</option>
              <option>Contractors</option>
              <option>Tasks</option>
              <option>Surveys</option>
              <option>Calendar / Notepad</option>
              <option>Discussions</option>
              <option>Product library</option>
              <option>veepick plugin</option>
              <option>Settings &amp; account</option>
              <option>Payments</option>
              <option>Login / access</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div class="bug-row">
          <div class="field">
            <label for="bg-severity">Priority</label>
            <select id="bg-severity" name="severity">
              <option>Low - cosmetic / minor</option>
              <option>Medium - makes work harder</option>
              <option selected>High - blocks a key feature</option>
              <option>Critical - I can't use veedeck</option>
            </select>
          </div>
          <div class="field">
            <label for="bg-link">Link to the location in the app (optional)</label>
            <input id="bg-link" name="link" type="url" placeholder="https://app.veedeck.com/…">
          </div>
        </div>

        <div class="field">
          <label for="bg-desc">Issue description</label>
          <textarea id="bg-desc" name="description" required placeholder="What happened? What were you trying to do, and what happened instead? Can it be reproduced?"></textarea>
        </div>

        <div class="field-file">
          <label>Screenshot (optional)</label>
          <label class="file-drop" for="bg-file">
            <input id="bg-file" name="attachment" type="file" accept="image/*" style="display:none;" onchange="this.parentElement.textContent = this.files[0] ? this.files[0].name : 'Click to add a screenshot (PNG, JPG)';">
            Click to add a screenshot (PNG, JPG)
          </label>
        </div>

        <label class="field-checkbox">
          <input type="checkbox" required>
          <span>I consent to the processing of my data for handling this report, in accordance with the <a href="/en/privacy-policy/" style="color:var(--primary);text-decoration:underline;">privacy policy</a>.</span>
        </label>

        <button type="submit" class="bug-submit">
          Send report
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"></path></svg>
        </button>

        <div class="form-confirm" id="bugFormConfirm">&#10003; Thank you! Your report has been sent — we'll get back to you within 24 hours.</div>
      </form>
    </div>

    <p class="help-foot">Prefer to write directly? Contact us at <a href="mailto:support@veedeck.com">support@veedeck.com</a> or the <a href="/en/contact/">contact page</a>.</p>
  </div>
</section>

<script>
  (function () {
    var form = document.getElementById('bugForm');
    var confirm = document.getElementById('bugFormConfirm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('.bug-submit');
      btn.disabled = true;
      btn.style.opacity = '0.7';
      var data = new FormData(form);
      fetch('https://formspree.io/f/xlgyqbjd', {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        if (res.ok) {
          confirm.classList.add('show');
          form.reset();
        } else {
          btn.disabled = false;
          btn.style.opacity = '';
          alert('Something went wrong. Please try again or email us directly at support@veedeck.com.');
        }
      }).catch(function () {
        btn.disabled = false;
        btn.style.opacity = '';
        alert('Something went wrong. Please try again or email us directly at support@veedeck.com.');
      });
    });
  })();
</script>
${FILTER_HELP_SCRIPT}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/** Fix relative/broken asset paths → root-relative */
function fixAssets(html) {
  return html
    .replace(/src="[.\/]*vee-icon\.png"/g, 'src="/vee-icon.png"')
    .replace(/src="[.\/]*vee_black\.png"/g, 'src="/vee_black.png"')
    .replace(/href="[.\/]*veedeckicon\.png"/g, 'href="/veedeckicon.png"')
    .replace(/src="[.\/]*veedeckicon\.png"/g, 'src="/veedeckicon.png"')
    .replace(/src="[.\/]*hero-render\.png"/g, 'src="/hero-render.png"')
    .replace(/src="[.\/]*hero-watermark-b\.svg"/g, 'src="/hero-watermark-b.svg"')
    .replace(/src="[.\/]*rf-detail\.png"/g, 'src="/rf-detail.png"')
    .replace(/src="[.\/]*sofa-seria-7r\.png"/g, 'src="/sofa-seria-7r.png"')
    .replace(/src="[.\/]*veepic\.png"/g, 'src="/veepic.png"')
    .replace(/src="[.\/]*veepick-icon\.png"/g, 'src="/veepick-icon.png"')
    .replace(/src="[.\/]*chrome-logo\.webp"/g, 'src="/chrome-logo.webp"')
    .replace(/src="[.\/]*renderflow-icon\.png"/g, 'src="/renderflow-icon.png"')
    .replace(/src="[.\/]*team-founder\.png"/g, 'src="/team-founder.png"')
    .replace(/src="[.\/]*team-adrianna\.jpg"/g, 'src="/team-adrianna.jpg"')
    .replace(/src="[.\/]*team-oskar\.png"/g, 'src="/team-oskar.png"')
    .replace(/src="[.\/]*tomasz-ziolkowski\.jpg"/g, 'src="/tomasz-ziolkowski.jpg"')
    .replace(/src="[.\/]*veedeck_ikona\.png"/g, 'src="/veedeck_ikona.png"')
    .replace(/src="[.\/]*veedeck_ikona\.svg"/g, 'src="/veedeck_ikona.svg"')
    .replace(/src="[.\/]*veedeckicon\.png"/g, 'src="/veedeckicon.png"')
    .replace(/src="[.\/]*veedeck-megamenu\.js"/g, 'src="/veedeck-megamenu.js"')
    .replace(/src="[.\/]*veedeck-reveal\.js"/g, 'src="/veedeck-reveal.js"');
}

/** Fix all internal nav/footer hrefs → absolute /pl/ or /en/ paths */
function fixLinks(html, lang) {
  const pl = '/pl';
  const en = '/en';
  const helpPl = '/pl/pomoc';
  const helpEn = '/en/help';
  const isEn = lang === 'en';

  return html
    // ── Logo / home links ──────────────────────────────────────────
    .replace(/href="([.\/]*)index\.html#demo"/g, `href="${isEn ? en : pl}/#demo"`)
    .replace(/href="([.\/]*)index\.html"/g,      `href="${isEn ? en : pl}/"`)

    // ── Main nav links (broken capitalized filenames) ──────────────
    .replace(/href="[.\/]*Veedeck Moduly\.html"/g,  isEn ? 'href="/en/modules/"'  : 'href="/pl/moduly/"')
    .replace(/href="[.\/]*Wtyczka\.html"/g,          isEn ? 'href="/en/plugin/"'   : 'href="/pl/wtyczka/"')
    .replace(/href="[.\/]*Cennik\.html"/g,           isEn ? 'href="/en/pricing/"'  : 'href="/pl/cennik/"')
    .replace(/href="[.\/]*Demo\.html"/g,             isEn ? 'href="/en/demo/"'     : 'href="/pl/demo/"')
    .replace(/href="[.\/]*[Oo] nas\.html"/g,         isEn ? 'href="/en/about/"'    : 'href="/pl/o-nas/"')
    .replace(/href="[.\/]*Kontakt\.html"/g,          isEn ? 'href="/en/contact/"'  : 'href="/pl/kontakt/"')

    // ── Lowercase filenames (some pages use these) ─────────────────
    .replace(/href="([.\/]*)moduly\.html"/g,   isEn ? 'href="/en/modules/"'  : 'href="/pl/moduly/"')
    .replace(/href="([.\/]*)wtyczka\.html"/g,  isEn ? 'href="/en/plugin/"'   : 'href="/pl/wtyczka/"')
    .replace(/href="([.\/]*)cennik\.html"/g,   isEn ? 'href="/en/pricing/"'  : 'href="/pl/cennik/"')
    .replace(/href="([.\/]*)demo\.html"/g,     isEn ? 'href="/en/demo/"'     : 'href="/pl/demo/"')
    .replace(/href="([.\/]*)o-nas\.html"/g,    isEn ? 'href="/en/about/"'    : 'href="/pl/o-nas/"')
    .replace(/href="([.\/]*)kontakt\.html"/g,  isEn ? 'href="/en/contact/"'  : 'href="/pl/kontakt/"')

    // ── Login ──────────────────────────────────────────────────────
    .replace(/href="([.\/]*)login\.html"/g, 'href="https://app.veedeck.com/login"')

    // ── Legal (broken capitalized) ─────────────────────────────────
    .replace(/href="[.\/]*Polityka prywatnosci veepick\.html"/g,
      isEn ? 'href="/en/privacy-policy-veepick/"' : 'href="/pl/polityka-prywatnosci-veepick/"')
    .replace(/href="[.\/]*Polityka prywatnosci\.html"/g,
      isEn ? 'href="/en/privacy-policy/"' : 'href="/pl/polityka-prywatnosci/"')
    .replace(/href="[.\/]*Polityka cookies\.html"/g,
      isEn ? 'href="/en/cookie-policy/"' : 'href="/pl/polityka-cookies/"')
    // lowercase
    .replace(/href="([.\/]*)polityka-prywatnosci-veepick\.html"/g,
      isEn ? 'href="/en/privacy-policy-veepick/"' : 'href="/pl/polityka-prywatnosci-veepick/"')
    .replace(/href="([.\/]*)privacy-policy-veepick\.html"/g, 'href="/en/privacy-policy-veepick/"')
    .replace(/href="([.\/]*)polityka-prywatnosci\.html"/g,
      isEn ? 'href="/en/privacy-policy/"' : 'href="/pl/polityka-prywatnosci/"')
    .replace(/href="([.\/]*)polityka-cookies\.html"/g,
      isEn ? 'href="/en/cookie-policy/"' : 'href="/pl/polityka-cookies/"')

    // ── Pomoc index (from root pages, footer "Centrum pomocy") ─────
    .replace(/href="pomoc\/index\.html"/g, isEn ? 'href="/en/help/"'  : 'href="/pl/pomoc/"')
    .replace(/href="([.\/]*)pomoc\/"(?!jak|dla|faq|roz|zgł)/g,
      isEn ? 'href="/en/help/"' : 'href="/pl/pomoc/"')

    // ── Pomoc sub-nav (from pomoc/*/index.html) ─────────────────────
    .replace(/href="\.\.\/jak-zaczac\/"/g,
      isEn ? 'href="/en/help/getting-started/"' : 'href="/pl/pomoc/jak-zaczac/"')
    .replace(/href="\.\.\/dla-projektantow\/"/g,
      isEn ? 'href="/en/help/for-designers/"' : 'href="/pl/pomoc/dla-projektantow/"')
    .replace(/href="\.\.\/dla-klientow-i-wykonawcow\/"/g,
      isEn ? 'href="/en/help/for-clients-and-contractors/"' : 'href="/pl/pomoc/dla-klientow-i-wykonawcow/"')
    .replace(/href="\.\.\/faq\/"/g,
      isEn ? 'href="/en/help/faq/"' : 'href="/pl/pomoc/faq/"')
    .replace(/href="\.\.\/rozwiazywanie-problemow\/"/g,
      isEn ? 'href="/en/help/troubleshooting/"' : 'href="/pl/pomoc/rozwiazywanie-problemow/"')
    .replace(/href="\.\.\/zglos-blad\/"/g,
      isEn ? 'href="/en/help/report-a-bug/"' : 'href="/pl/pomoc/zglos-blad/"')
    // breadcrumb back to help root (../ from pomoc/* pages)
    .replace(/href="\.\.\/"/g,
      isEn ? 'href="/en/help/"' : 'href="/pl/pomoc/"')

    // ── Pomoc sub-nav (from pomoc/index.html, no ../ prefix) ──────
    .replace(/href="jak-zaczac\/"/g,
      isEn ? 'href="/en/help/getting-started/"' : 'href="/pl/pomoc/jak-zaczac/"')
    .replace(/href="dla-projektantow\/"/g,
      isEn ? 'href="/en/help/for-designers/"' : 'href="/pl/pomoc/dla-projektantow/"')
    .replace(/href="dla-klientow-i-wykonawcow\/"/g,
      isEn ? 'href="/en/help/for-clients-and-contractors/"' : 'href="/pl/pomoc/dla-klientow-i-wykonawcow/"')
    .replace(/href="faq\/"/g,
      isEn ? 'href="/en/help/faq/"' : 'href="/pl/pomoc/faq/"')
    .replace(/href="rozwiazywanie-problemow\/"/g,
      isEn ? 'href="/en/help/troubleshooting/"' : 'href="/pl/pomoc/rozwiazywanie-problemow/"')
    .replace(/href="zglos-blad\/"/g,
      isEn ? 'href="/en/help/report-a-bug/"' : 'href="/pl/pomoc/zglos-blad/"')

    // ── Footer "Centrum pomocy" link (from pomoc/index.html) ───────
    .replace(/href="index\.html"/g,
      isEn ? 'href="/en/help/"' : 'href="/pl/pomoc/"');
}

/**
 * Apply VEEDECK_I18N dictionary to translate PL text to EN.
 * Only touches text nodes (content between > and <), never tag attributes or
 * script/style content. Skips single-char entries to avoid substring corruption
 * (e.g. "i"→"and" would corrupt href="/en/plugin/" → "/en/plugandn/").
 */
function applyDict(html) {
  const result = [];
  let i = 0;
  let skipBlock = false;  // true when inside <script> or <style>

  while (i < html.length) {
    const nextTag = html.indexOf('<', i);

    if (nextTag === -1) {
      // Remaining content after last tag
      result.push(skipBlock ? html.slice(i) : translateText(html.slice(i)));
      break;
    }

    // Text node before this tag
    if (nextTag > i) {
      const chunk = html.slice(i, nextTag);
      result.push(skipBlock ? chunk : translateText(chunk));
    }

    // Find closing >
    let tagEnd = html.indexOf('>', nextTag);
    if (tagEnd === -1) { result.push(html.slice(nextTag)); break; }
    const tag = html.slice(nextTag, tagEnd + 1);
    result.push(tag);

    // Track script/style blocks — don't translate their content
    if (/^<script[\s>]/i.test(tag))       skipBlock = true;
    else if (/^<\/script>/i.test(tag))    skipBlock = false;
    else if (/^<style[\s>]/i.test(tag))   skipBlock = true;
    else if (/^<\/style>/i.test(tag))     skipBlock = false;

    i = tagEnd + 1;
  }

  return result.join('');
}

/** Translate a plain text chunk using the VEEDECK_I18N dict (longest match first). */
function translateText(text) {
  for (const [pl, en] of DICT_ENTRIES) {
    if (pl.length < 2) continue;   // skip 1-char entries (i, a, w, …)
    if (!text.includes(pl)) continue;
    text = text.split(pl).join(en);
  }
  return text;
}

/** Remove veedeck-i18n.js script tag (no longer needed in generated files) */
function removeI18nScript(html) {
  return html
    .replace(/\n?<!-- Przełącznik języka PL\/EN -->\n?/g, '\n')
    .replace(/<script src="[^"]*veedeck-i18n\.js"><\/script>\n?/g, '');
}

/** Remove any existing hreflang/canonical tags (from source) before injecting fresh ones */
function stripExistingHreflang(html) {
  return html
    .replace(/<link rel="alternate"[^>]*hreflang[^>]*>\n?/gi, '')
    .replace(/<link rel="canonical"[^>]*>\n?/gi, '');
}

/** Inject hreflang + canonical into <head> (PL page) */
function addHreflang(html, plUrl, enUrl) {
  html = stripExistingHreflang(html);
  const tags = `
<link rel="canonical" href="${DOMAIN}${plUrl}"/>
<link rel="alternate" hreflang="pl" href="${DOMAIN}${plUrl}"/>
<link rel="alternate" hreflang="en" href="${DOMAIN}${enUrl}"/>
<link rel="alternate" hreflang="x-default" href="${DOMAIN}${plUrl}"/>`;
  return html.replace('</head>', tags + '\n</head>');
}

/** Inject hreflang + canonical for EN page */
function addHreflangEN(html, plUrl, enUrl) {
  html = stripExistingHreflang(html);
  const tags = `
<link rel="canonical" href="${DOMAIN}${enUrl}"/>
<link rel="alternate" hreflang="pl" href="${DOMAIN}${plUrl}"/>
<link rel="alternate" hreflang="en" href="${DOMAIN}${enUrl}"/>
<link rel="alternate" hreflang="x-default" href="${DOMAIN}${plUrl}"/>`;
  return html.replace('</head>', tags + '\n</head>');
}

/** Add language switcher to desktop nav-cta and mobile menu */
function addLangSwitcher(html, currentLang, altUrl) {
  const altLabel = currentLang === 'pl' ? 'EN' : 'PL';
  // Desktop nav-cta: inject before the login button
  html = html.replace(
    /(<div class="nav-cta"[^>]*>)/,
    `$1\n      <a href="${altUrl}" class="btn btn-ghost" style="font-size:12px;padding:0 10px;letter-spacing:0.06em;font-weight:700;">${altLabel}</a>`
  );
  // Mobile menu CTA: inject as first button
  html = html.replace(
    /(<div class="mobile-cta">)/,
    `$1\n      <a href="${altUrl}" class="btn btn-ghost" style="width:100%;justify-content:center;font-size:12px;font-weight:700;letter-spacing:0.06em;">${altLabel}</a>`
  );
  return html;
}

/** Replace content between <!-- HERO --> and <!-- FOOTER --> */
function injectPomocEN(html, enContent) {
  const heroMarker = '<!-- HERO -->';
  const footerMarker = '<!-- FOOTER -->';
  const heroIdx = html.indexOf(heroMarker);
  const footerIdx = html.indexOf(footerMarker);
  if (heroIdx === -1 || footerIdx === -1) {
    console.warn('  ⚠ HERO/FOOTER markers not found — skipping content injection');
    return html;
  }
  return html.slice(0, heroIdx) + enContent + '\n' + html.slice(footerIdx);
}

/** Also translate the footer nav (Produkt, Firma, Legal section links and labels) for EN pomoc pages */
function translateFooterPomoc(html) {
  // Footer column headers
  html = html.replace(/>Produkt</g, '>Product<');
  html = html.replace(/>Firma</g, '>Company<');
  // Footer links
  html = html.replace(/>Moduły</g, '>Modules<');
  html = html.replace(/>Wtyczka veepick</g, '>veepick plugin<');
  html = html.replace(/>Cennik</g, '>Pricing<');
  html = html.replace(/>O nas</g, '>About<');
  html = html.replace(/>Demo</g, '>Demo<');
  html = html.replace(/>Kontakt</g, '>Contact<');
  html = html.replace(/>Centrum pomocy</g, '>Help Center<');
  html = html.replace(/>Polityka prywatności veepick</g, '>Privacy Policy veepick<');
  html = html.replace(/>Polityka prywatności</g, '>Privacy Policy<');
  html = html.replace(/>Polityka cookies</g, '>Cookie Policy<');
  html = html.replace(/Platforma dla projektantów wnętrz\./g, 'A platform for interior designers.');
  html = html.replace(/Wszelkie prawa zastrzeżone\./g, 'All rights reserved.');
  // Nav links text
  html = html.replace(/>Moduły</g, '>Modules<');
  html = html.replace(/>Wtyczka</g, '>Plugin<');
  html = html.replace(/>Zaloguj się</g, '>Log in<');
  html = html.replace(/>Bezpłatne demo</g, '>Free demo<');
  return html;
}

/** Ensure output directory exists */
function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Process a single page
// ─────────────────────────────────────────────────────────────────────────────
function processPage(page) {
  const srcFile = join(SITE, page.src);
  if (!existsSync(srcFile)) {
    console.warn(`  ⚠ Source not found: ${page.src}`);
    return;
  }
  const sourcePL = readFileSync(srcFile, 'utf8');

  // EN source may differ (e.g. privacy-policy-veepick already in EN)
  const enSrcFile = page.enSrc ? join(SITE, page.enSrc) : srcFile;
  const sourceEN = page.enSrc ? readFileSync(enSrcFile, 'utf8') : sourcePL;

  // ── Build PL version ────────────────────────────────────────────────────
  let plHtml = sourcePL;
  plHtml = fixAssets(plHtml);
  plHtml = fixLinks(plHtml, 'pl');
  plHtml = removeI18nScript(plHtml);
  plHtml = addHreflang(plHtml, page.plUrl, page.enUrl);
  plHtml = addLangSwitcher(plHtml, 'pl', page.enUrl);

  const plOutDir = join(SITE, page.plDir);
  ensureDir(plOutDir);
  writeFileSync(join(plOutDir, 'index.html'), plHtml, 'utf8');
  console.log(`  ✓ PL → ${page.plDir}/index.html`);

  // ── Build EN version ────────────────────────────────────────────────────
  let enHtml = sourceEN;
  enHtml = fixAssets(enHtml);
  enHtml = fixLinks(enHtml, 'en');
  enHtml = removeI18nScript(enHtml);

  if (page.type === 'pomoc' && page.pomocKey && POMOC_EN_CONTENT[page.pomocKey]) {
    // Replace hero + content with EN template
    enHtml = injectPomocEN(enHtml, POMOC_EN_CONTENT[page.pomocKey]);
    // Translate nav and footer text
    enHtml = translateFooterPomoc(enHtml);
    // Apply remaining dict for any stragglers
    enHtml = applyDict(enHtml);
  } else {
    // Marketing pages: apply full dict
    enHtml = applyDict(enHtml);
  }

  // Update lang attribute and title/description (handles extra attributes like data-src-ver)
  enHtml = enHtml.replace(/(<html\b[^>]*)\blang="pl"/, '$1lang="en"');
  enHtml = enHtml.replace(/<title>[^<]*<\/title>/, `<title>${page.enTitle}</title>`);
  if (page.enDesc) {
    enHtml = enHtml.replace(/<meta name="description"[^>]*>\n?/g, '');
    enHtml = enHtml.replace('</head>', `<meta name="description" content="${page.enDesc}">\n</head>`);
  }

  enHtml = addHreflangEN(enHtml, page.plUrl, page.enUrl);
  enHtml = addLangSwitcher(enHtml, 'en', page.plUrl);

  const enOutDir = join(SITE, page.enDir);
  ensureDir(enOutDir);
  writeFileSync(join(enOutDir, 'index.html'), enHtml, 'utf8');
  console.log(`  ✓ EN → ${page.enDir}/index.html`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Run
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\nveedeck i18n build — ${new Date().toLocaleString()}`);
console.log(`Site: ${SITE}\n`);

for (const page of PAGES) {
  console.log(`Processing: ${page.src}`);
  try {
    processPage(page);
  } catch (err) {
    console.error(`  ✗ Error processing ${page.src}:`, err.message);
  }
}

console.log(`\nDone. Generated ${PAGES.length * 2} files (${PAGES.length} PL + ${PAGES.length} EN).\n`);
