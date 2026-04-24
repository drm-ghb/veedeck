// Veepick Panel — injected into the page on extension icon click
(function () {
  const PANEL_ID = "veepick-panel";
  const PANEL_VERSION = "1.8";

  // Toggle if already exists and version matches; replace if outdated
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    if (existing.dataset.version === PANEL_VERSION) {
      const isHidden = existing.style.getPropertyValue("display") === "none";
      existing.style.setProperty("display", isHidden ? "flex" : "none", "important");
      return;
    }
    // Outdated panel — remove and reinject
    existing.remove();
    document.getElementById("veepick-panel-styles")?.remove();
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.id = "veepick-panel-styles";
  styleEl.textContent = `
    #veepick-panel {
      all: initial;
      position: fixed !important;
      right: 0 !important;
      top: 0 !important;
      height: 100vh !important;
      width: 340px !important;
      z-index: 2147483646 !important;
      background: #fff !important;
      border-radius: 12px 0 0 12px !important;
      box-shadow: -4px 0 32px rgba(0,0,0,0.18) !important;
      display: flex !important;
      flex-direction: column !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      font-size: 13px !important;
      color: #111 !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    #veepick-panel * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    #veepick-panel .vp-header { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
    #veepick-panel .vp-header img { width: 24px; height: 24px; border-radius: 4px; object-fit: contain; }
    #veepick-panel .vp-header h1 { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; flex: 1; margin: 0; }
    #veepick-panel .vp-icon-btn { background: none; border: none; cursor: pointer; color: #999; padding: 4px; border-radius: 4px; font-size: 16px; line-height: 1; }
    #veepick-panel .vp-icon-btn:hover { color: #333; background: #f4f4f4; }
    #veepick-panel .vp-screen { padding: 14px; overflow-y: auto; flex: 1; }
    #veepick-panel .vp-hidden { display: none !important; }
    #veepick-panel .vp-setup-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    #veepick-panel .vp-setup-desc { color: #666; font-size: 12px; line-height: 1.5; margin-bottom: 12px; }
    #veepick-panel label { display: block; font-size: 12px; font-weight: 500; color: #555; margin-bottom: 4px; }
    #veepick-panel input, #veepick-panel select {
      width: 100%; border: 1px solid #e0e0e0; border-radius: 6px; padding: 7px 10px;
      font-size: 13px; outline: none; transition: border-color .15s; background: #fafafa; color: #111;
    }
    #veepick-panel input:focus, #veepick-panel select:focus { border-color: #6366f1; background: #fff; }
    #veepick-panel .vp-field { margin-bottom: 10px; }
    #veepick-panel .vp-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; padding: 9px 14px; border-radius: 7px; border: none;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s;
    }
    #veepick-panel .vp-btn:disabled { opacity: 0.5; cursor: default; }
    #veepick-panel .vp-btn-primary { background: #6366f1; color: #fff; }
    #veepick-panel .vp-btn-primary:hover:not(:disabled) { background: #4f46e5; }
    #veepick-panel .vp-btn-outline { background: #fff; color: #333; border: 1px solid #e0e0e0; margin-top: 8px; }
    #veepick-panel .vp-btn-outline:hover:not(:disabled) { background: #f5f5f5; }
    #veepick-panel .vp-preview { margin-bottom: 8px; }
    #veepick-panel .vp-preview-img-wrap {
      width: 100%; height: 190px; border-radius: 10px; background: #f4f4f4;
      border: 1px solid #eee; overflow: hidden; display: flex;
      align-items: center; justify-content: center; margin-bottom: 8px; position: relative;
    }
    #veepick-panel .vp-preview-img-wrap img { width: 100%; height: 100%; object-fit: contain; }
    #veepick-panel .vp-img-placeholder { font-size: 48px; color: #ccc; }
    #veepick-panel .vp-pname { font-weight: 600; font-size: 13px; line-height: 1.4; word-break: break-word; margin-bottom: 2px; }
    #veepick-panel .vp-pprice { font-size: 15px; font-weight: 700; color: #111; }
    #veepick-panel .vp-divider { height: 1px; background: #f0f0f0; margin: 10px 0; }
    #veepick-panel .vp-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #veepick-panel .vp-status { margin-top: 10px; padding: 8px 10px; border-radius: 6px; font-size: 12px; text-align: center; }
    #veepick-panel .vp-status.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    #veepick-panel .vp-status.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    #veepick-panel .vp-status.info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    #veepick-panel .vp-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: vp-spin .6s linear infinite; }
    @keyframes vp-spin { to { transform: rotate(360deg); } }
    #veepick-panel .vp-hint { font-size: 10px; color: #aaa; margin-bottom: 10px; }
    #veepick-panel .vp-user-info { font-size: 11px; color: #888; margin-top: 6px; }
    #veepick-panel .vp-back-btn { background: none; border: none; color: #6366f1; cursor: pointer; font-size: 12px; margin-bottom: 10px; padding: 0; display: block; }
    #veepick-panel .vp-back-btn:hover { text-decoration: underline; }
  `;
  document.head.appendChild(styleEl);

  // ── HTML ──────────────────────────────────────────────────────────────────
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.dataset.version = PANEL_VERSION;
  panel.innerHTML = `
    <div class="vp-header">
      <img src="${chrome.runtime.getURL("icons/icon48.png")}" alt="Veepick" />
      <h1>Veepick</h1>
      <button class="vp-icon-btn vp-hidden" id="vp-settingsBtn" title="Ustawienia">⚙</button>
      <button class="vp-icon-btn vp-hidden" id="vp-refreshBtn" title="Odśwież dane strony">↺</button>
      <button class="vp-icon-btn" id="vp-close" title="Zamknij">✕</button>
    </div>

    <div id="vp-screenSetup" class="vp-screen">
      <p class="vp-setup-title">Połącz z veedeck</p>
      <p class="vp-setup-desc">Wklej swój klucz API z ustawień konta w veedeck (Ustawienia → Wtyczka).</p>
      <div class="vp-field"><label>Adres aplikacji</label><input id="vp-inputBaseUrl" type="url" placeholder="np. https://veedeck.vercel.app" /></div>
      <div class="vp-field"><label>Klucz API</label><input id="vp-inputApiKey" type="text" placeholder="vp_..." /></div>
      <button class="vp-btn vp-btn-primary" id="vp-btnConnect">Połącz</button>
      <div id="vp-setupStatus"></div>
    </div>

    <div id="vp-screenSettings" class="vp-screen vp-hidden">
      <button class="vp-back-btn" id="vp-btnBackFromSettings">← Wróć</button>
      <div class="vp-field"><label>Adres aplikacji</label><input id="vp-settingsBaseUrl" type="url" /></div>
      <div class="vp-field"><label>Klucz API</label><input id="vp-settingsApiKey" type="text" /></div>
      <button class="vp-btn vp-btn-primary" id="vp-btnSaveSettings">Zapisz</button>
      <button class="vp-btn vp-btn-outline" id="vp-btnDisconnect">Rozłącz konto</button>
      <div id="vp-settingsStatus"></div>
    </div>

    <div id="vp-screenMain" class="vp-screen vp-hidden">
      <div class="vp-preview">
        <div class="vp-preview-img-wrap">
          <span class="vp-img-placeholder" id="vp-previewImgPlaceholder">🛍</span>
          <img id="vp-previewImg" class="vp-hidden" alt="" />
        </div>
        <div class="vp-pname" id="vp-previewName">Ładowanie...</div>
        <div class="vp-pprice" id="vp-previewPrice"></div>
      </div>
      <p class="vp-hint" id="vp-imagePickerHint">Najedź na zdjęcie na stronie aby wybrać inne</p>
      <div class="vp-field"><label>Lista zakupowa</label><select id="vp-selectList"><option value="">Wybierz listę...</option></select></div>
      <div class="vp-field"><label>Sekcja</label><select id="vp-selectSection" disabled><option value="">Wybierz sekcję...</option></select></div>
      <div class="vp-divider"></div>
      <div class="vp-field"><label>Nazwa *</label><input id="vp-fieldName" type="text" placeholder="Nazwa produktu" /></div>
      <div class="vp-field"><label>Kategoria</label><select id="vp-fieldCategory"><option value="">Brak kategorii</option></select></div>
      <div class="vp-row2">
        <div class="vp-field"><label>Cena</label><input id="vp-fieldPrice" type="text" placeholder="np. 299 PLN" /></div>
        <div class="vp-field"><label>Ilość</label><input id="vp-fieldQty" type="number" min="1" value="1" /></div>
      </div>
      <div class="vp-row2">
        <div class="vp-field"><label>Producent</label><input id="vp-fieldManufacturer" type="text" placeholder="np. Sklum" /></div>
        <div class="vp-field"><label>Kolor</label><input id="vp-fieldColor" type="text" placeholder="np. Biały" /></div>
      </div>
      <div class="vp-field"><label>Wymiar</label><input id="vp-fieldDimensions" type="text" placeholder="np. 60x80 cm" /></div>
      <div class="vp-field"><label>Notatka</label><input id="vp-fieldNote" type="text" placeholder="Dodatkowe uwagi dla klienta..." /></div>
      <div id="vp-duplicateWarning" class="vp-status error vp-hidden"></div>
      <button class="vp-btn vp-btn-primary" id="vp-btnAdd" disabled>Dodaj do listy</button>
      <div id="vp-mainStatus"></div>
      <div class="vp-user-info" id="vp-userInfo"></div>
    </div>
  `;
  document.body.appendChild(panel);

  // ── State ─────────────────────────────────────────────────────────────────
  let apiKey = "";
  let baseUrl = "";
  let lists = [];
  let productData = {};

  // ── Helpers ───────────────────────────────────────────────────────────────
  const vp = (id) => document.getElementById(id);

  function showScreen(name) {
    ["vp-screenSetup", "vp-screenSettings", "vp-screenMain"].forEach((id) => {
      vp(id).classList.toggle("vp-hidden", id !== name);
    });
    vp("vp-settingsBtn").classList.toggle("vp-hidden", name !== "vp-screenMain");
    vp("vp-refreshBtn").classList.toggle("vp-hidden", name !== "vp-screenMain");
  }

  function setStatus(id, msg, type) {
    const el = vp(id);
    el.textContent = msg;
    el.className = msg ? `vp-status ${type}` : "";
  }

  function showPickedHint() {
    const hint = vp("vp-imagePickerHint");
    if (!hint) return;
    hint.textContent = "✓ Zdjęcie wybrane";
    hint.style.color = "#4f46e5";
    setTimeout(() => { hint.textContent = "Najedź na zdjęcie na stronie aby wybrać inne"; hint.style.color = ""; }, 2500);
  }

  // ── API via background (avoids CORS issues in content scripts) ────────────
  function apiFetch(path, options = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "api-fetch",
        url: `${baseUrl}${path}`,
        options: {
          method: options.method || "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: options.body || undefined,
        },
      }, (response) => {
        if (chrome.runtime.lastError || !response) {
          resolve({ ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve("") });
          return;
        }
        resolve({
          ok: response.ok,
          status: response.status,
          json: () => { try { return Promise.resolve(JSON.parse(response.text)); } catch { return Promise.resolve({}); } },
          text: () => Promise.resolve(response.text || ""),
        });
      });
    });
  }

  // ── Extract product data directly from page DOM ───────────────────────────
  function extractProductData() {
    function getMeta(prop) {
      return document.querySelector(`meta[property="${prop}"]`)?.content ||
             document.querySelector(`meta[name="${prop}"]`)?.content || null;
    }
    function getJsonLd() {
      for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const data = JSON.parse(s.textContent);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item["@type"] === "Product" || (Array.isArray(item["@type"]) && item["@type"].includes("Product"))) return item;
          }
        } catch {}
      }
      return null;
    }
    function resolvePrice(offers) {
      if (!offers) return null;
      const o = Array.isArray(offers) ? offers[0] : offers;
      const price = o?.price ?? o?.lowPrice;
      const currency = o?.priceCurrency === "PLN" || !o?.priceCurrency ? "zł" : (o?.priceCurrency ?? "zł");
      if (price == null) return null;
      const num = parseFloat(String(price).replace(",", "."));
      if (isNaN(num)) return null;
      return `${Number.isInteger(num) ? num : num.toFixed(2).replace(".", ",")} ${currency}`;
    }
    function queryText(selectors) {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const text = el?.textContent?.replace(/\s+/g, " ").trim();
        if (text && text.length > 0 && text.length < 120) return text;
      }
      return null;
    }
    // Look for a label-value pair in product attribute tables
    function findAttributeValue(labelPatterns) {
      const allRows = document.querySelectorAll("tr, li, dl > div, [class*='attr'], [class*='spec'], [class*='param'], [class*='detail']");
      for (const row of allRows) {
        const text = row.textContent || "";
        for (const pattern of labelPatterns) {
          if (pattern.test(text)) {
            // Try to get just the value part (after the label)
            const tds = row.querySelectorAll("td, dd, span, div");
            if (tds.length >= 2) {
              for (let i = 1; i < tds.length; i++) {
                const val = tds[i].textContent?.replace(/\s+/g, " ").trim();
                if (val && val.length > 0 && val.length < 120 && !pattern.test(val)) return val;
              }
            }
            break;
          }
        }
      }
      return null;
    }

    const ld = getJsonLd();
    const name = (ld?.name || getMeta("og:title") || document.title || "").replace(/\s+/g, " ").trim();
    const imageUrl = (ld?.image && (Array.isArray(ld.image) ? ld.image[0] : ld.image)) || getMeta("og:image") || null;
    const price = (ld && resolvePrice(ld.offers)) || (() => {
      const raw = getMeta("product:price:amount") || getMeta("og:price:amount");
      const cur = getMeta("product:price:currency");
      const curLabel = (!cur || cur === "PLN") ? "zł" : cur;
      if (!raw) return null;
      const num = parseFloat(raw.replace(",", "."));
      return isNaN(num) ? null : `${num} ${curLabel}`;
    })() || null;

    // Manufacturer: JSON-LD → itemprop → DOM selectors → og:site_name
    let manufacturer = (ld?.brand && (typeof ld.brand === "string" ? ld.brand : ld.brand?.name)) || null;
    if (!manufacturer) manufacturer = queryText([
      '[itemprop="brand"] [itemprop="name"]', '[itemprop="brand"]',
      '[itemprop="manufacturer"]', '.product-brand', '.product__brand',
      '.brand-name', '.manufacturer-name', '[data-testid="brand"]',
      '.product-manufacturer', 'a[class*="brand"]',
    ]);
    if (!manufacturer) manufacturer = findAttributeValue([
      /producent/i, /marka/i, /brand/i, /manufacturer/i,
    ]);

    // Color: JSON-LD → itemprop → DOM selectors → attribute table
    let color = ld?.color || getMeta("product:color") || null;
    if (!color) color = queryText([
      '[itemprop="color"]', '.product-color', '.color-name',
      '.selected-color', '[data-testid="color"]',
    ]);
    if (!color) color = findAttributeValue([/kolor/i, /color/i, /barwa/i]);

    // Dimensions: not in JSON-LD standard, look in DOM tables
    let dimensions = findAttributeValue([
      /wymiary/i, /wymiar/i, /dimensions/i, /rozmiar/i, /gabaryty/i,
      /długość.*szerokość/i, /dl\..*szer\./i,
    ]);

    const description = (ld?.description || getMeta("og:description") || getMeta("description") || null);
    const hostname = location.hostname;
    return {
      name,
      url: location.href,
      imageUrl: typeof imageUrl === "string" ? imageUrl : null,
      price, manufacturer, color, dimensions,
      description: description ? description.slice(0, 300) : null,
      supplier: hostname.startsWith("www.") ? hostname : `www.${hostname}`,
    };
  }

  // ── Render preview ────────────────────────────────────────────────────────
  function renderPreview(p) {
    vp("vp-previewName").textContent = p.name || "Bez nazwy";
    vp("vp-previewPrice").textContent = p.price || "";
    if (p.imageUrl) {
      vp("vp-previewImg").src = p.imageUrl;
      vp("vp-previewImg").classList.remove("vp-hidden");
      vp("vp-previewImgPlaceholder").classList.add("vp-hidden");
    } else {
      vp("vp-previewImg").classList.add("vp-hidden");
      vp("vp-previewImgPlaceholder").classList.remove("vp-hidden");
    }
    vp("vp-fieldName").value = p.name || "";
    vp("vp-fieldPrice").value = p.price || "";
    vp("vp-fieldManufacturer").value = p.manufacturer || "";
    vp("vp-fieldColor").value = p.color || "";
    vp("vp-fieldDimensions").value = p.dimensions || "";
    updateAddBtn();
  }

  // ── Lists / sections ──────────────────────────────────────────────────────
  function populateLists() {
    const sel = vp("vp-selectList");
    sel.innerHTML = '<option value="">Wybierz listę...</option>';
    for (const list of lists) {
      const opt = document.createElement("option");
      opt.value = list.id;
      opt.textContent = list.name + (list.project?.title ? ` (${list.project.title})` : "");
      sel.appendChild(opt);
    }
  }

  function populateCategories(categories) {
    const sel = vp("vp-fieldCategory");
    sel.innerHTML = '<option value="">Brak kategorii</option>';
    for (const cat of categories) {
      const opt = document.createElement("option");
      opt.value = cat.value;
      opt.textContent = cat.label;
      sel.appendChild(opt);
    }
  }

  function populateSections(listId) {
    const sel = vp("vp-selectSection");
    sel.innerHTML = '<option value="">Wybierz sekcję...</option>';
    sel.disabled = !listId;
    if (!listId) return;
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    for (const section of list.sections) {
      const opt = document.createElement("option");
      opt.value = section.id;
      opt.textContent = section.name;
      sel.appendChild(opt);
    }
    sel.disabled = false;
  }

  function updateAddBtn() {
    const sectionId = vp("vp-selectSection").value;
    const name = vp("vp-fieldName").value.trim();

    if (!sectionId || !name) {
      vp("vp-btnAdd").disabled = true;
      vp("vp-btnAdd").textContent = "Dodaj do listy";
      return;
    }

    const listId = vp("vp-selectList").value;
    const list = lists.find((l) => l.id === listId);
    const section = list?.sections.find((s) => s.id === sectionId);
    const url = productData.url?.trim();

    const warning = vp("vp-duplicateWarning");
    if (section?.products) {
      const isDuplicate = url
        ? section.products.some((p) => p.url === url)
        : section.products.some((p) => p.name.toLowerCase() === name.toLowerCase());

      if (warning) {
        if (isDuplicate) {
          warning.textContent = `Ten produkt jest już na tej liście w sekcji „${section.name}"`;
          warning.classList.remove("vp-hidden");
        } else {
          warning.classList.add("vp-hidden");
        }
      }
    } else if (warning) {
      warning.classList.add("vp-hidden");
    }

    vp("vp-btnAdd").disabled = false;
    vp("vp-btnAdd").textContent = "Dodaj do listy";
  }

  // ── Connect ───────────────────────────────────────────────────────────────
  async function connect() {
    const key = vp("vp-inputApiKey").value.trim();
    const url = vp("vp-inputBaseUrl").value.trim().replace(/\/$/, "");
    if (!key || !url) { setStatus("vp-setupStatus", "Uzupełnij wszystkie pola.", "error"); return; }
    setStatus("vp-setupStatus", "Sprawdzanie...", "info");
    try {
      const tempApiKey = apiKey; const tempBaseUrl = baseUrl;
      apiKey = key; baseUrl = url;
      const res = await apiFetch("/api/extension/me");
      if (!res.ok) { apiKey = tempApiKey; baseUrl = tempBaseUrl; throw new Error("Nieprawidłowy klucz lub adres."); }
      const user = await res.json();
      await chrome.storage.local.set({ apiKey: key, baseUrl: url });
      setStatus("vp-setupStatus", `Połączono jako ${user.name || user.email}`, "success");
      setTimeout(() => initMain(), 800);
    } catch (e) {
      setStatus("vp-setupStatus", e.message || "Błąd połączenia.", "error");
    }
  }

  // ── Settings ──────────────────────────────────────────────────────────────
  async function saveSettings() {
    const key = vp("vp-settingsApiKey").value.trim();
    const url = vp("vp-settingsBaseUrl").value.trim().replace(/\/$/, "");
    if (!key || !url) { setStatus("vp-settingsStatus", "Uzupełnij wszystkie pola.", "error"); return; }
    try {
      const tempApiKey = apiKey; const tempBaseUrl = baseUrl;
      apiKey = key; baseUrl = url;
      const res = await apiFetch("/api/extension/me");
      if (!res.ok) { apiKey = tempApiKey; baseUrl = tempBaseUrl; throw new Error("Nieprawidłowy klucz lub adres."); }
      await chrome.storage.local.set({ apiKey: key, baseUrl: url });
      setStatus("vp-settingsStatus", "Zapisano.", "success");
      setTimeout(() => { setStatus("vp-settingsStatus", "", ""); showScreen("vp-screenMain"); initMain(); }, 800);
    } catch (e) {
      setStatus("vp-settingsStatus", e.message || "Błąd.", "error");
    }
  }

  async function disconnect() {
    await chrome.storage.local.set({ apiKey: "", baseUrl: "" });
    apiKey = "";
    showScreen("vp-screenSetup");
    vp("vp-inputBaseUrl").value = baseUrl;
  }

  // ── Main init ─────────────────────────────────────────────────────────────
  async function initMain() {
    showScreen("vp-screenMain");
    vp("vp-previewName").textContent = "Pobieranie danych...";

    // Fetch user info
    try {
      const res = await apiFetch("/api/extension/me");
      if (!res.ok) throw new Error();
      const me = await res.json();
      vp("vp-userInfo").textContent = `Zalogowany: ${me.name || me.email}`;
    } catch { vp("vp-userInfo").textContent = ""; }

    // Extract product data directly from page DOM (no executeScript needed)
    productData = extractProductData();

    // Apply previously picked image if any
    const stored = await chrome.storage.local.get("veepick_picked_image");
    if (stored.veepick_picked_image) {
      productData.imageUrl = stored.veepick_picked_image;
      chrome.storage.local.remove("veepick_picked_image");
      showPickedHint();
    }

    renderPreview(productData);

    // Ask background to inject image picker
    chrome.runtime.sendMessage({ type: "inject-image-picker" });

    // Fetch lists
    try {
      const res = await apiFetch("/api/extension/data");
      if (!res.ok) throw new Error();
      const data = await res.json();
      lists = data.lists || [];
      populateLists();
      populateCategories(data.categories || []);
      updateAddBtn();
    } catch { setStatus("vp-mainStatus", "Błąd pobierania list. Sprawdź połączenie.", "error"); }
  }

  // ── Add product ───────────────────────────────────────────────────────────
  async function addProduct() {
    const listId = vp("vp-selectList").value;
    const sectionId = vp("vp-selectSection").value;
    const name = vp("vp-fieldName").value.trim();
    const price = vp("vp-fieldPrice").value.trim();
    const quantity = parseInt(vp("vp-fieldQty").value) || 1;
    const manufacturer = vp("vp-fieldManufacturer").value.trim();
    const color = vp("vp-fieldColor").value.trim();
    const dimensions = vp("vp-fieldDimensions").value.trim();
    const note = vp("vp-fieldNote").value.trim();
    const category = vp("vp-fieldCategory").value || null;
    if (!name || !sectionId) return;

    vp("vp-btnAdd").disabled = true;
    vp("vp-btnAdd").innerHTML = '<span class="vp-spinner"></span> Dodawanie...';
    setStatus("vp-mainStatus", "", "");

    try {
      const res = await apiFetch("/api/extension/product", {
        method: "POST",
        body: JSON.stringify({ listId, sectionId, name, url: productData.url || null, imageUrl: productData.imageUrl || null, price: price || null, manufacturer: manufacturer || null, color: color || null, dimensions: dimensions || null, note: note || null, category: category || null, supplier: productData.supplier || null, description: productData.description || null, quantity }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Błąd serwera"); }
      const addedSection = lists.find((l) => l.id === listId)?.sections.find((s) => s.id === sectionId);
      if (addedSection?.products) addedSection.products.push({ url: productData.url?.trim() || null, name });
      setStatus("vp-mainStatus", "✓ Produkt dodany do listy!", "success");
      updateAddBtn();
      // Hide panel and remove image picker after brief delay
      setTimeout(() => {
        document.getElementById("veepick-picker")?.remove();
        document.getElementById("veepick-picker-styles")?.remove();
        panel.style.setProperty("display", "none", "important");
      }, 1200);
    } catch (e) {
      setStatus("vp-mainStatus", e.message || "Błąd dodawania.", "error");
    } finally {
      vp("vp-btnAdd").innerHTML = "Dodaj do listy";
    }
  }

  // ── Image pick via storage listener ──────────────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.veepick_picked_image) return;
    const url = changes.veepick_picked_image.newValue;
    if (!url) return;
    productData = { ...productData, imageUrl: url };
    renderPreview(productData);
    chrome.storage.local.remove("veepick_picked_image");
    showPickedHint();
  });

  // ── Events ────────────────────────────────────────────────────────────────
  vp("vp-close").addEventListener("click", () => { panel.style.setProperty("display", "none", "important"); });
  vp("vp-refreshBtn").addEventListener("click", () => {
    productData = extractProductData();
    renderPreview(productData);
    vp("vp-fieldName").value = productData.name || "";
    vp("vp-fieldPrice").value = productData.price || "";
    vp("vp-fieldManufacturer").value = productData.manufacturer || "";
    vp("vp-fieldColor").value = productData.color || "";
    vp("vp-fieldDimensions").value = productData.dimensions || "";
    setStatus("vp-mainStatus", "Odświeżono dane strony.", "info");
    setTimeout(() => setStatus("vp-mainStatus", "", ""), 2000);
  });
  vp("vp-settingsBtn").addEventListener("click", () => {
    vp("vp-settingsBaseUrl").value = baseUrl;
    vp("vp-settingsApiKey").value = apiKey;
    showScreen("vp-screenSettings");
  });
  vp("vp-btnBackFromSettings").addEventListener("click", () => showScreen("vp-screenMain"));
  vp("vp-btnSaveSettings").addEventListener("click", saveSettings);
  vp("vp-btnDisconnect").addEventListener("click", disconnect);
  vp("vp-btnConnect").addEventListener("click", connect);
  vp("vp-btnAdd").addEventListener("click", addProduct);
  vp("vp-selectList").addEventListener("change", () => { populateSections(vp("vp-selectList").value); updateAddBtn(); });
  vp("vp-selectSection").addEventListener("change", updateAddBtn);
  vp("vp-fieldName").addEventListener("input", updateAddBtn);

  // ── Boot ──────────────────────────────────────────────────────────────────
  chrome.storage.local.get(["apiKey", "baseUrl"], (stored) => {
    apiKey = stored.apiKey || "";
    baseUrl = stored.baseUrl || "";
    if (apiKey) {
      initMain();
    } else {
      showScreen("vp-screenSetup");
    }
  });
})();
