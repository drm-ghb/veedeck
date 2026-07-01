// Veepick Panel — injected into the page on extension icon click
(function () {
  const PANEL_ID = "veepick-panel";
  const PANEL_VERSION = "2.4";

  // Toggle if already exists and version matches; replace if outdated
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    if (existing.dataset.version === PANEL_VERSION) {
      const isHidden = existing.style.getPropertyValue("display") === "none";
      existing.style.setProperty("display", isHidden ? "flex" : "none", "important");
      if (isHidden) return;
      // hide sidebar when hiding panel
      document.getElementById("veepick-sidebar")?.remove();
      return;
    }
    existing.remove();
    document.getElementById("veepick-panel-styles")?.remove();
    document.getElementById("veepick-mat-icons")?.remove();
    document.getElementById("veepick-sidebar")?.remove();
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.id = "veepick-panel-styles";
  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300&display=swap');
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
    #veepick-panel .vp-header h1 { font-size: 15px; font-weight: 300; font-family: 'Nunito', sans-serif; letter-spacing: -0.05em; flex: 1; margin: 0; }
    #veepick-panel .vp-icon-btn { background: none; border: none; cursor: pointer; color: #999; padding: 4px; border-radius: 4px; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; }
    #veepick-panel .vp-icon-btn:hover { color: #333; background: #f4f4f4; }
    #veepick-panel.vp-collapsed { width: 44px !important; }
    #veepick-panel.vp-collapsed .vp-screen,
    #veepick-panel.vp-collapsed .vp-tabs,
    #veepick-panel.vp-collapsed .vp-scroll,
    #veepick-panel.vp-collapsed .vp-footer,
    #veepick-panel.vp-collapsed .vp-history { display: none !important; }
    #veepick-panel.vp-collapsed .vp-header h1,
    #veepick-panel.vp-collapsed #vp-settingsBtn,
    #veepick-panel.vp-collapsed #vp-refreshBtn,
    #veepick-panel.vp-collapsed #vp-close { display: none !important; }
    #veepick-panel.vp-collapsed .vp-header { flex-direction: column; justify-content: center; align-items: center; gap: 8px; padding: 12px 6px; }
    #veepick-panel .vp-screen { padding: clamp(8px, 1.5vh, 14px); overflow-y: auto; flex: 1; }
    #vp-screenMain { padding: 0 !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; }
    #veepick-panel .vp-scroll { flex: 1; overflow-y: auto; padding: clamp(8px, 1.5vh, 14px); }
    #veepick-panel .vp-footer { flex-shrink: 0; padding: clamp(6px, 1.2vh, 10px) clamp(8px, 1.5vh, 14px); border-top: 1px solid #f0f0f0; background: #fff; }
    #veepick-panel .vp-hidden { display: none !important; }
    #veepick-panel .vp-setup-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    #veepick-panel .vp-setup-desc { color: #666; font-size: 12px; line-height: 1.5; margin-bottom: 12px; }
    #veepick-panel label { display: block; font-size: 12px; font-weight: 500; color: #555; margin-bottom: 4px; }
    #veepick-panel input, #veepick-panel select {
      width: 100%; border: 1px solid #e0e0e0; border-radius: 6px; padding: 7px 10px;
      font-size: 13px; outline: none; transition: border-color .15s; background: #fafafa; color: #111;
    }
    #veepick-panel input:focus, #veepick-panel select:focus { border-color: #6366f1; background: #fff; }
    #veepick-panel .vp-field { margin-bottom: clamp(6px, 1vh, 10px); }
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
      width: 100%; height: clamp(80px, 18vh, 160px); border-radius: 10px; background: #f4f4f4;
      border: 1px solid #eee; overflow: hidden; display: flex;
      align-items: center; justify-content: center; margin-bottom: 8px; position: relative;
    }
    #veepick-panel .vp-preview-img-wrap img { width: 100%; height: 100%; object-fit: contain; }
    #veepick-panel .vp-img-placeholder { font-size: 48px; color: #ccc; }
    #veepick-panel .vp-pname { font-weight: 600; font-size: 13px; line-height: 1.4; word-break: break-word; margin-bottom: 2px; }
    #veepick-panel .vp-pprice { font-size: 15px; font-weight: 700; color: #111; }
    #veepick-panel .vp-divider { height: 1px; background: #f0f0f0; margin: 10px 0; }
    #veepick-panel .vp-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #veepick-panel .vp-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
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

    /* ── Settings preference row ── */
    #veepick-panel .vp-setting-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-top: 1px solid #f0f0f0; margin-top: 12px; }
    #veepick-panel .vp-setting-label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #333; margin: 0; }
    #veepick-panel .vp-switch { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
    #veepick-panel .vp-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
    #veepick-panel .vp-switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #d1d5db; border-radius: 20px; transition: background .2s; }
    #veepick-panel .vp-switch-slider:before { content: ""; position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    #veepick-panel .vp-switch input:checked + .vp-switch-slider { background: #6366f1; }
    #veepick-panel .vp-switch input:checked + .vp-switch-slider:before { transform: translateX(16px); }
    /* ── Info icon + tooltip ── */
    #veepick-panel .vp-info-wrap { position: relative; display: inline-flex; align-items: center; }
    #veepick-panel .vp-info-icon { width: 15px; height: 15px; border-radius: 50%; background: #e5e7eb; color: #6b7280; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; cursor: default; font-style: normal; line-height: 1; }
    #veepick-panel .vp-info-tooltip { display: none; position: absolute; left: 0; top: 20px; background: #1f2937; color: #fff; font-size: 11px; line-height: 1.5; padding: 8px 10px; border-radius: 6px; width: 220px; z-index: 10; pointer-events: none; }
    #veepick-panel .vp-info-wrap:hover .vp-info-tooltip { display: block; }

    /* ── Tabs ── */
    #veepick-panel .vp-tabs { display: flex; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
    #veepick-panel .vp-tab { flex: 1 !important; padding: 7px 8px !important; font-size: 12px !important; font-weight: 600 !important; text-align: center !important; cursor: pointer !important; border: none !important; border-bottom: 2px solid transparent !important; border-radius: 0 !important; outline: none !important; background: none !important; box-shadow: none !important; color: #999 !important; transition: color .15s, border-color .15s !important; position: relative !important; }
    #veepick-panel .vp-tab:focus, #veepick-panel .vp-tab:active { background: none !important; box-shadow: none !important; outline: none !important; }
    #veepick-panel .vp-tab.vp-tab-active { color: #6366f1 !important; border-bottom-color: #6366f1 !important; background: none !important; }
    #veepick-panel .vp-tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: #9ca3af; color: #fff; font-size: 10px; font-weight: 700; margin-left: 5px; vertical-align: middle; }

    /* ── Section preview button ── */
    #veepick-panel .vp-field-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    #veepick-panel .vp-preview-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: #4338ca; padding: 0; font-weight: 600; margin-top: 5px; display: block; }
    #veepick-panel .vp-preview-btn:hover { text-decoration: underline; }
    #veepick-panel .vp-preview-btn:disabled { color: #ccc; cursor: default; }

    /* ── History tab ── */
    #veepick-panel .vp-history { flex: 1; overflow-y: auto; }
    #veepick-panel .vp-history-empty { padding: 40px 20px; text-align: center; color: #aaa; font-size: 12px; line-height: 1.6; }
    #veepick-panel .vp-history-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #f5f5f5; }
    #veepick-panel .vp-history-img { width: 44px; height: 44px; border-radius: 6px; object-fit: contain; background: #f5f5f5; flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #ccc; }
    #veepick-panel .vp-history-img img { width: 100%; height: 100%; object-fit: contain; }
    #veepick-panel .vp-history-info { flex: 1; min-width: 0; }
    #veepick-panel .vp-history-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111; }
    #veepick-panel .vp-history-meta { font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    #veepick-panel .vp-history-del { background: none; border: none; cursor: pointer; color: #ccc; padding: 6px; border-radius: 4px; flex-shrink: 0; transition: color .12s, background .12s; line-height: 1; font-size: 14px; }
    #veepick-panel .vp-history-del:hover { color: #ef4444; background: #fef2f2; }
    #veepick-panel .vp-history-del-loading { opacity: 0.4; pointer-events: none; }

    /* ── Left sidebar ── */
    #veepick-sidebar {
      all: initial;
      position: fixed !important;
      right: 340px !important;
      top: 0 !important;
      height: 100vh !important;
      width: 260px !important;
      background: #fff !important;
      box-shadow: -6px 0 28px rgba(0,0,0,0.14) !important;
      z-index: 2147483645 !important;
      display: none !important;
      flex-direction: column !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      font-size: 13px !important;
      color: #111 !important;
      border-radius: 12px 0 0 12px !important;
      transform: translateX(100%) !important;
      transition: transform 0.22s ease !important;
      overflow: hidden !important;
    }
    #veepick-sidebar.vp-sb-shown { display: flex !important; }
    #veepick-sidebar.vp-sb-open { transform: translateX(0) !important; }
    #veepick-sidebar * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    #veepick-sidebar .vp-sb-header { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
    #veepick-sidebar .vp-sb-title { font-size: 13px; font-weight: 700; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #veepick-sidebar .vp-sb-close { background: none; border: none; cursor: pointer; color: #999; font-size: 16px; line-height: 1; padding: 2px; border-radius: 4px; }
    #veepick-sidebar .vp-sb-close:hover { color: #333; background: #f4f4f4; }
    #veepick-sidebar .vp-sb-list { flex: 1; overflow-y: auto; }
    #veepick-sidebar .vp-sb-empty { padding: 32px 16px; text-align: center; color: #aaa; font-size: 12px; line-height: 1.6; }
    #veepick-sidebar .vp-sb-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #f5f5f5; }
    #veepick-sidebar .vp-sb-img { width: 44px; height: 44px; border-radius: 6px; background: #f5f5f5; flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #ccc; }
    #veepick-sidebar .vp-sb-img img { width: 100%; height: 100%; object-fit: contain; }
    #veepick-sidebar .vp-sb-info { flex: 1; min-width: 0; }
    #veepick-sidebar .vp-sb-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #veepick-sidebar .vp-sb-price { font-size: 11px; color: #888; margin-top: 2px; }
    #veepick-sidebar .vp-sb-count { font-size: 11px; color: #aaa; padding: 8px 14px 6px; }
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
      <button class="vp-icon-btn vp-hidden" id="vp-collapseBtn" title="Zwiń panel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
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
      <div class="vp-setting-row">
        <div class="vp-setting-label">
          <span>Zapamiętuj listę i sekcję</span>
          <div class="vp-info-wrap">
            <span class="vp-info-icon">i</span>
            <div class="vp-info-tooltip">Gdy włączone, wtyczka zapamiętuje ostatnio wybraną listę zakupową i sekcję i przywraca je przy kolejnym otwarciu panelu. Gdy wyłączone, musisz wybrać listę i sekcję za każdym razem od nowa.</div>
          </div>
        </div>
        <label class="vp-switch">
          <input type="checkbox" id="vp-rememberListSection" />
          <span class="vp-switch-slider"></span>
        </label>
      </div>
    </div>

    <div id="vp-screenMain" class="vp-screen vp-hidden">
      <!-- Tabs -->
      <div class="vp-tabs">
        <button class="vp-tab vp-tab-active" id="vp-tabAdd">Dodaj produkt</button>
        <button class="vp-tab" id="vp-tabHistory">Ostatnio dodane<span id="vp-historyBadge" class="vp-tab-badge vp-hidden">0</span></button>
      </div>

      <!-- Add product tab -->
      <div id="vp-contentAdd" class="vp-scroll">
        <div class="vp-preview">
          <div class="vp-preview-img-wrap">
            <span class="vp-img-placeholder" id="vp-previewImgPlaceholder">🛍</span>
            <img id="vp-previewImg" class="vp-hidden" alt="" />
          </div>
          <div class="vp-pname vp-hidden" id="vp-previewName"></div>
          <div class="vp-pprice vp-hidden" id="vp-previewPrice"></div>
        </div>
        <p class="vp-hint" id="vp-imagePickerHint">Najedź na zdjęcie na stronie aby wybrać inne</p>
        <div class="vp-field"><label>Lista zakupowa</label><select id="vp-selectList"><option value="">Wybierz listę...</option></select></div>
        <div class="vp-field">
          <label>Sekcja</label>
          <select id="vp-selectSection" disabled><option value="">Wybierz sekcję...</option></select>
          <button class="vp-preview-btn" id="vp-sidebarToggle" disabled>Podgląd sekcji</button>
        </div>
        <div class="vp-divider"></div>
        <div class="vp-field"><label>Nazwa *</label><input id="vp-fieldName" type="text" placeholder="Nazwa produktu" /></div>
        <div class="vp-field"><label>Kategoria</label><select id="vp-fieldCategory"><option value="">Brak kategorii</option></select></div>
        <div class="vp-field"><label>Notatka</label><input id="vp-fieldNote" type="text" placeholder="Dodatkowe uwagi dla klienta..." /></div>
        <div class="vp-row3">
          <div class="vp-field"><label>Cena</label><input id="vp-fieldPrice" type="text" placeholder="np. 299 PLN" /></div>
          <div class="vp-field"><label>Ilość</label><input id="vp-fieldQty" type="number" min="1" value="1" /></div>
          <div class="vp-field"><label>Wymiar</label><input id="vp-fieldDimensions" type="text" placeholder="np. 60x80 cm" /></div>
        </div>
        <div class="vp-row2">
          <div class="vp-field"><label>Producent</label><input id="vp-fieldManufacturer" type="text" placeholder="np. Sklum" /></div>
          <div class="vp-field"><label>Kolor</label><input id="vp-fieldColor" type="text" placeholder="np. Biały" /></div>
        </div>
      </div>
      <div id="vp-footerAdd" class="vp-footer">
        <div id="vp-duplicateWarning" class="vp-status error vp-hidden"></div>
        <button class="vp-btn vp-btn-primary" id="vp-btnAdd" disabled>Dodaj do listy</button>
        <div id="vp-mainStatus"></div>
        <div class="vp-user-info" id="vp-userInfo"></div>
      </div>

      <!-- History tab -->
      <div id="vp-contentHistory" class="vp-history vp-hidden">
        <div class="vp-history-empty">Brak historii.<br/>Dodane produkty pojawią się tutaj.</div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // ── Sidebar element ────────────────────────────────────────────────────────
  const sidebar = document.createElement("div");
  sidebar.id = "veepick-sidebar";
  sidebar.innerHTML = `
    <div class="vp-sb-header">
      <span class="vp-sb-title" id="vp-sb-title">Produkty w sekcji</span>
      <button class="vp-sb-close" id="vp-sb-close" title="Zamknij">✕</button>
    </div>
    <div class="vp-sb-list" id="vp-sb-list">
      <div class="vp-sb-empty">Wybierz sekcję aby zobaczyć produkty.</div>
    </div>
  `;
  document.body.appendChild(sidebar);

  // ── State ─────────────────────────────────────────────────────────────────
  let apiKey = "";
  let baseUrl = "";
  let lists = [];
  let productData = {};
  let activeTab = "add"; // "add" | "history"
  let sidebarOpen = false;
  let collapsed = false;
  let rememberListSection = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const vp = (id) => document.getElementById(id);

  function showScreen(name) {
    ["vp-screenSetup", "vp-screenSettings", "vp-screenMain"].forEach((id) => {
      vp(id).classList.toggle("vp-hidden", id !== name);
    });
    vp("vp-settingsBtn").classList.toggle("vp-hidden", name !== "vp-screenMain");
    vp("vp-refreshBtn").classList.toggle("vp-hidden", name !== "vp-screenMain");
    vp("vp-collapseBtn").classList.toggle("vp-hidden", name !== "vp-screenMain");
    if (name !== "vp-screenMain") closeSidebar();
    // Reset collapsed state when switching screens
    if (name !== "vp-screenMain" && collapsed) {
      collapsed = false;
      panel.classList.remove("vp-collapsed");
    }
  }

  function toggleCollapse() {
    collapsed = !collapsed;
    panel.classList.toggle("vp-collapsed", collapsed);
    vp("vp-collapseBtn").innerHTML = collapsed
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
    vp("vp-collapseBtn").title = collapsed ? "Rozwiń panel" : "Zwiń panel";
    if (collapsed) closeSidebar();
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

  function formatRelativeTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return "przed chwilą";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min temu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} godz. temu`;
    return `${Math.floor(diff / 86400000)} dni temu`;
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;
    vp("vp-tabAdd").classList.toggle("vp-tab-active", tab === "add");
    vp("vp-tabHistory").classList.toggle("vp-tab-active", tab === "history");
    vp("vp-contentAdd").classList.toggle("vp-hidden", tab !== "add");
    vp("vp-footerAdd").classList.toggle("vp-hidden", tab !== "add");
    vp("vp-contentHistory").classList.toggle("vp-hidden", tab !== "history");
    if (tab === "history") {
      closeSidebar();
      renderHistory();
    }
  }

  // ── History ───────────────────────────────────────────────────────────────
  function updateHistoryBadge(history) {
    const badge = vp("vp-historyBadge");
    if (history.length > 0) {
      badge.textContent = history.length > 9 ? "9+" : String(history.length);
      badge.classList.remove("vp-hidden");
    } else {
      badge.classList.add("vp-hidden");
    }
  }

  async function saveToHistory(item) {
    const stored = await chrome.storage.local.get("vp_history");
    const history = [item, ...(stored.vp_history || [])].slice(0, 20);
    await chrome.storage.local.set({ vp_history: history });
    updateHistoryBadge(history);
  }

  async function renderHistory() {
    const stored = await chrome.storage.local.get("vp_history");
    const history = stored.vp_history || [];
    const container = vp("vp-contentHistory");

    if (history.length === 0) {
      container.innerHTML = `<div class="vp-history-empty">Brak historii.<br/>Dodane produkty pojawią się tutaj.</div>`;
      return;
    }

    container.innerHTML = history.map((item) => `
      <div class="vp-history-item">
        <div class="vp-history-img">${item.imageUrl ? "" : "🛍"}</div>
        <div class="vp-history-info">
          <div class="vp-history-name" title="${item.name}">${item.name}</div>
          <div class="vp-history-meta">${item.listName} · ${item.sectionName}</div>
          <div class="vp-history-meta">${formatRelativeTime(item.addedAt)}</div>
        </div>
        <button class="vp-history-del" title="Usuń z listy" data-pid="${item.productId}" data-lid="${item.listId}" data-sid="${item.sectionId}">🗑</button>
      </div>
    `).join("");

    // Load images via background (bypasses page CSP)
    const imgContainers = container.querySelectorAll(".vp-history-img");
    history.forEach((item, i) => {
      if (item.imageUrl && imgContainers[i]) loadImgInto(imgContainers[i], item.imageUrl);
    });

    container.querySelectorAll(".vp-history-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.classList.add("vp-history-del-loading");
        const res = await apiFetch(`/api/extension/product/${btn.dataset.pid}?listId=${btn.dataset.lid}&sectionId=${btn.dataset.sid}`, { method: "DELETE" });
        if (res.ok) {
          const s2 = await chrome.storage.local.get("vp_history");
          const updated = (s2.vp_history || []).filter((h) => h.productId !== btn.dataset.pid);
          await chrome.storage.local.set({ vp_history: updated });
          updateHistoryBadge(updated);
          renderHistory();
          // Update duplicate check data
          const list = lists.find((l) => l.id === btn.dataset.lid);
          const section = list?.sections.find((s) => s.id === btn.dataset.sid);
          if (section?.products) {
            section.products = section.products.filter((p) => p.id !== btn.dataset.pid);
          }
        } else {
          btn.classList.remove("vp-history-del-loading");
        }
      });
    });
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  function openSidebar() {
    sidebarOpen = true;
    sidebar.classList.add("vp-sb-shown");
    sidebar.offsetHeight; // force reflow so transition fires
    sidebar.classList.add("vp-sb-open");
    vp("vp-sidebarToggle").textContent = "Ukryj listę";
    populateSidebar();
  }

  function closeSidebar() {
    sidebarOpen = false;
    sidebar.classList.remove("vp-sb-open");
    setTimeout(() => { if (!sidebarOpen) sidebar.classList.remove("vp-sb-shown"); }, 230);
    if (vp("vp-sidebarToggle")) vp("vp-sidebarToggle").textContent = "Podgląd listy";
  }

  function toggleSidebar() {
    if (sidebarOpen) closeSidebar(); else openSidebar();
  }

  function populateSidebar() {
    const sectionId = vp("vp-selectSection").value;
    const listId = vp("vp-selectList").value;
    if (!sectionId || !listId) {
      vp("vp-sb-title").textContent = "Produkty w sekcji";
      vp("vp-sb-list").innerHTML = `<div class="vp-sb-empty">Wybierz sekcję aby zobaczyć produkty.</div>`;
      return;
    }
    const list = lists.find((l) => l.id === listId);
    const section = list?.sections.find((s) => s.id === sectionId);
    const products = section?.products || [];

    vp("vp-sb-title").textContent = section?.name || "Sekcja";
    const listEl = vp("vp-sb-list");

    if (products.length === 0) {
      listEl.innerHTML = `<div class="vp-sb-empty">Sekcja jest pusta.</div>`;
      return;
    }

    listEl.innerHTML = `<div class="vp-sb-count">${products.length} ${products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktów"}</div>` +
      products.map((p) => `
        <div class="vp-sb-item">
          <div class="vp-sb-img">${p.imageUrl ? "" : "🛍"}</div>
          <div class="vp-sb-info">
            <div class="vp-sb-name" title="${p.name}">${p.name}</div>
            ${p.price ? `<div class="vp-sb-price">${p.price}</div>` : ""}
          </div>
        </div>
      `).join("");

    // Load images via background (bypasses page CSP)
    const imgContainers = listEl.querySelectorAll(".vp-sb-item .vp-sb-img");
    products.forEach((p, i) => {
      if (p.imageUrl && imgContainers[i]) loadImgInto(imgContainers[i], p.imageUrl);
    });
  }

  function updateSidebarIfOpen() {
    if (sidebarOpen) populateSidebar();
    const sectionId = vp("vp-selectSection").value;
    vp("vp-sidebarToggle").disabled = !sectionId;
  }

  // ── Image proxy via background (bypasses page CSP) ────────────────────────
  function loadImgViaBackground(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "fetch-image", url }, (r) => {
        if (chrome.runtime.lastError || !r?.ok) resolve(null);
        else resolve(r.dataUrl);
      });
    });
  }

  function loadImgInto(container, url) {
    loadImgViaBackground(url).then((dataUrl) => {
      if (dataUrl) {
        const img = document.createElement("img");
        img.src = dataUrl;
        container.innerHTML = "";
        container.appendChild(img);
      }
    });
  }

  // ── API via background ─────────────────────────────────────────────────────
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

  // ── Extract product data ───────────────────────────────────────────────────
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
    function findAttributeValue(labelPatterns) {
      const allRows = document.querySelectorAll("tr, li, dl > div, [class*='attr'], [class*='spec'], [class*='param'], [class*='detail']");
      for (const row of allRows) {
        const text = row.textContent || "";
        for (const pattern of labelPatterns) {
          if (pattern.test(text)) {
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
    const ogImage = getMeta("og:image");
    const imageUrl = (ld?.image && (() => { const img = Array.isArray(ld.image) ? ld.image[0] : ld.image; return typeof img === "string" ? img : (img?.url || img?.contentUrl || null); })())
      || (ogImage && ogImage.startsWith("http") ? ogImage : null)
      || (() => {
        const selectors = [
          'img[itemprop="image"]',
          '.page-product-show__content-image',
          '[class*="product-image"] img',
          '[class*="product__image"] img',
          '[class*="gallery"] img',
          '#product-image img',
          '.swiper-slide img',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el?.src && el.src.startsWith("http")) return el.src;
        }
        return null;
      })()
      || null;
    const price = (ld && resolvePrice(ld.offers)) || (() => {
      const raw = getMeta("product:price:amount") || getMeta("og:price:amount");
      const cur = getMeta("product:price:currency");
      const curLabel = (!cur || cur === "PLN") ? "zł" : cur;
      if (!raw) return null;
      const num = parseFloat(raw.replace(",", "."));
      return isNaN(num) ? null : `${num} ${curLabel}`;
    })() || (() => {
      const raw = queryText(['[itemprop="price"]', '#product-price', '.product-price', '[class*="product__price"]', '[class*="product-price"]:not([class*="list"])', '.price__value', '[class*="price-value"]', '.product__price-value']);
      if (!raw) return null;
      if (/zł|PLN|EUR|USD|GBP/i.test(raw)) return raw;
      const cur = document.querySelector('[itemprop="priceCurrency"]')?.getAttribute("content") ||
                  document.querySelector('[itemprop="priceCurrency"]')?.textContent?.trim() || "zł";
      const num = parseFloat(raw.replace(/[\s\u00a0]/g, "").replace(",", "."));
      if (isNaN(num)) return null;
      const label = cur === "PLN" ? "zł" : cur;
      return `${Number.isInteger(num) ? num : num.toFixed(2).replace(".", ",")} ${label}`;
    })() || null;

    let manufacturer = (ld?.brand && (typeof ld.brand === "string" ? ld.brand : ld.brand?.name)) || null;
    if (!manufacturer) manufacturer = queryText(['[itemprop="brand"] [itemprop="name"]', '[itemprop="brand"]', '[itemprop="manufacturer"]', '.product-brand', '.product__brand', '.brand-name', '.manufacturer-name', '[data-testid="brand"]', '.product-manufacturer', 'a[class*="brand"]']);
    if (!manufacturer) manufacturer = findAttributeValue([/producent/i, /marka/i, /brand/i, /manufacturer/i]);
    if (!manufacturer) {
      // Fallback: use og:site_name (reliable for single-brand shops like artera.pl)
      manufacturer = getMeta("og:site_name") || null;
    }

    let color = ld?.color || getMeta("product:color") || null;
    if (!color) color = queryText(['[itemprop="color"]', '.product-color', '.color-name', '.selected-color', '[data-testid="color"]']);
    if (!color) color = findAttributeValue([/kolor/i, /color/i, /barwa/i]);

    let dimensions = findAttributeValue([/wymiary/i, /wymiar/i, /dimensions/i, /rozmiar/i, /gabaryty/i, /długość.*szerokość/i, /dl\..*szer\./i]);

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

  // ── Render preview ─────────────────────────────────────────────────────────
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

  // ── Lists / sections ───────────────────────────────────────────────────────
  async function populateLists() {
    const sel = vp("vp-selectList");
    sel.innerHTML = '<option value="">Wybierz listę...</option>';
    for (const list of lists) {
      const opt = document.createElement("option");
      opt.value = list.id;
      opt.textContent = list.name + (list.project?.title ? ` (${list.project.title})` : "");
      sel.appendChild(opt);
    }
    // Restore last selection only if user enabled it
    if (rememberListSection) {
      const stored = await chrome.storage.local.get(["lastListId", "lastSectionId"]);
      if (stored.lastListId) {
        sel.value = stored.lastListId;
        if (sel.value) {
          populateSections(sel.value, stored.lastSectionId || null);
          return;
        }
      }
    }
    updateAddBtn();
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

  function populateSections(listId, restoreSectionId = null) {
    const sel = vp("vp-selectSection");
    sel.innerHTML = '<option value="">Wybierz sekcję...</option>';
    sel.disabled = !listId;
    if (!listId) {
      vp("vp-sidebarToggle").disabled = true;
      updateAddBtn();
      return;
    }
    const list = lists.find((l) => l.id === listId);
    if (!list) { updateAddBtn(); return; }
    for (const section of list.sections) {
      const opt = document.createElement("option");
      opt.value = section.id;
      opt.textContent = section.name;
      sel.appendChild(opt);
    }
    sel.disabled = false;
    if (restoreSectionId) {
      sel.value = restoreSectionId;
    }
    vp("vp-sidebarToggle").disabled = !sel.value;
    updateAddBtn();
    updateSidebarIfOpen();
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

  // ── Connect ────────────────────────────────────────────────────────────────
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

  // ── Settings ───────────────────────────────────────────────────────────────
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

  // ── Main init ──────────────────────────────────────────────────────────────
  async function initMain() {
    showScreen("vp-screenMain");
    switchTab("add");
    vp("vp-previewName").textContent = "Pobieranie danych...";

    try {
      const res = await apiFetch("/api/extension/me");
      if (!res.ok) throw new Error();
      const me = await res.json();
      vp("vp-userInfo").textContent = `Zalogowany: ${me.name || me.email}`;
    } catch { vp("vp-userInfo").textContent = ""; }

    productData = extractProductData();

    const stored = await chrome.storage.local.get(["veepick_picked_image", "vp_history"]);
    if (stored.veepick_picked_image) {
      productData.imageUrl = stored.veepick_picked_image;
      chrome.storage.local.remove("veepick_picked_image");
      showPickedHint();
    }
    updateHistoryBadge(stored.vp_history || []);

    renderPreview(productData);
    chrome.runtime.sendMessage({ type: "inject-image-picker" });

    try {
      const res = await apiFetch("/api/extension/data");
      if (!res.ok) throw new Error();
      const data = await res.json();
      lists = data.lists || [];
      await populateLists();
      populateCategories(data.categories || []);
      updateAddBtn();
    } catch { setStatus("vp-mainStatus", "Błąd pobierania list. Sprawdź połączenie.", "error"); }
  }

  // ── Add product ────────────────────────────────────────────────────────────
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
      const added = await res.json();

      const addedList = lists.find((l) => l.id === listId);
      const addedSection = addedList?.sections.find((s) => s.id === sectionId);
      if (addedSection?.products) addedSection.products.push({ id: added.id, url: productData.url?.trim() || null, name, imageUrl: productData.imageUrl || null, price: price || null });

      setStatus("vp-mainStatus", "✓ Produkt dodany do listy!", "success");
      updateSidebarIfOpen();

      // Save to history
      await saveToHistory({
        productId: added.id,
        listId,
        sectionId,
        name,
        imageUrl: productData.imageUrl || null,
        price: price || null,
        listName: addedList?.name || "",
        sectionName: addedSection?.name || "",
        addedAt: Date.now(),
      });

      setTimeout(() => {
        document.getElementById("veepick-picker")?.remove();
        document.getElementById("veepick-picker-styles")?.remove();
        closeSidebar();
        panel.style.setProperty("display", "none", "important");
      }, 1200);
    } catch (e) {
      setStatus("vp-mainStatus", e.message || "Błąd dodawania.", "error");
    } finally {
      vp("vp-btnAdd").innerHTML = "Dodaj do listy";
    }
  }

  // ── Image pick via storage listener ───────────────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.veepick_picked_image) return;
    const url = changes.veepick_picked_image.newValue;
    if (!url) return;
    productData = { ...productData, imageUrl: url };
    renderPreview(productData);
    chrome.storage.local.remove("veepick_picked_image");
    showPickedHint();
  });

  // ── Events ─────────────────────────────────────────────────────────────────
  vp("vp-close").addEventListener("click", () => {
    document.getElementById("veepick-picker")?.remove();
    document.getElementById("veepick-picker-styles")?.remove();
    closeSidebar();
    panel.style.setProperty("display", "none", "important");
  });

  vp("vp-collapseBtn").addEventListener("click", toggleCollapse);
  vp("vp-sb-close").addEventListener("click", closeSidebar);
  vp("vp-sidebarToggle").addEventListener("click", toggleSidebar);

  vp("vp-tabAdd").addEventListener("click", () => switchTab("add"));
  vp("vp-tabHistory").addEventListener("click", () => switchTab("history"));

  vp("vp-refreshBtn").addEventListener("click", () => {
    productData = extractProductData();
    renderPreview(productData);
    setStatus("vp-mainStatus", "Odświeżono dane strony.", "info");
    setTimeout(() => setStatus("vp-mainStatus", "", ""), 2000);
  });
  vp("vp-settingsBtn").addEventListener("click", () => {
    vp("vp-settingsBaseUrl").value = baseUrl;
    vp("vp-settingsApiKey").value = apiKey;
    vp("vp-rememberListSection").checked = rememberListSection;
    showScreen("vp-screenSettings");
  });
  vp("vp-btnBackFromSettings").addEventListener("click", () => showScreen("vp-screenMain"));
  vp("vp-rememberListSection").addEventListener("change", () => {
    rememberListSection = vp("vp-rememberListSection").checked;
    chrome.storage.local.set({ rememberListSection });
  });
  vp("vp-btnSaveSettings").addEventListener("click", saveSettings);
  vp("vp-btnDisconnect").addEventListener("click", disconnect);
  vp("vp-btnConnect").addEventListener("click", connect);
  vp("vp-btnAdd").addEventListener("click", addProduct);

  vp("vp-selectList").addEventListener("change", () => {
    const id = vp("vp-selectList").value;
    populateSections(id);
    if (rememberListSection) chrome.storage.local.set({ lastListId: id, lastSectionId: "" });
  });
  vp("vp-selectSection").addEventListener("change", () => {
    const id = vp("vp-selectSection").value;
    if (rememberListSection) chrome.storage.local.set({ lastSectionId: id });
    updateAddBtn();
    updateSidebarIfOpen();
    vp("vp-sidebarToggle").disabled = !id;
  });
  vp("vp-fieldName").addEventListener("input", updateAddBtn);

  // ── Boot ───────────────────────────────────────────────────────────────────
  chrome.storage.local.get(["apiKey", "baseUrl", "rememberListSection"], (stored) => {
    apiKey = stored.apiKey || "";
    baseUrl = stored.baseUrl || "";
    rememberListSection = stored.rememberListSection === true;
    if (apiKey) {
      initMain();
    } else {
      showScreen("vp-screenSetup");
    }
  });
})();
