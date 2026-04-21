// ── Debug helper ──────────────────────────────────────────────────────────────
const DEBUG = true;
const log = (...args) => DEBUG && console.log("[veepick]", ...args);

// ── State ─────────────────────────────────────────────────────────────────────
let appUrl = "";
let apiKey = "";
let lists = [];     // { id, name, sections: [{id, name}] }
let product = null; // extracted or manual product data

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// Screens
const screenLoading = $("screen-loading");
const screenSetup   = $("screen-setup");
const screenMain    = $("screen-main");

// Setup
const inputAppUrl  = $("input-app-url");
const inputApiKey  = $("input-api-key");
const btnConnect   = $("btn-connect");
const btnOpenApp   = $("btn-open-app");

// Main
const selectList    = $("select-list");
const selectSection = $("select-section");
const btnAdd        = $("btn-add");
const userEmail     = $("user-email");
const toast         = $("toast");

// Product display (auto)
const productAuto   = $("product-auto");
const productManual = $("product-manual");
const extractStatus = $("extract-status");

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "success") {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = "toast"; }, 3500);
}

// ── Show screen ───────────────────────────────────────────────────────────────
function showScreen(name) {
  screenLoading.style.display = name === "loading" ? "flex" : "none";
  screenSetup.className   = "screen" + (name === "setup" ? " active" : "");
  screenMain.className    = "screen" + (name === "main"  ? " active" : "");
}

// ── API fetch helper ──────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${appUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Load lists into selectors ─────────────────────────────────────────────────
function populateListSelector() {
  selectList.innerHTML = '<option value="">— wybierz listę —</option>';
  lists.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.name;
    selectList.appendChild(opt);
  });

  // Restore last selection
  chrome.storage.local.get(["lastListId", "lastSectionId"], ({ lastListId, lastSectionId }) => {
    if (lastListId) {
      selectList.value = lastListId;
      populateSectionSelector(lastListId, lastSectionId);
    }
  });
}

function populateSectionSelector(listId, defaultSectionId = null) {
  selectSection.innerHTML = '<option value="">— wybierz sekcję —</option>';
  const list = lists.find((l) => l.id === listId);
  if (!list) return;
  list.sections.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    selectSection.appendChild(opt);
  });
  // Auto-select first section or last used
  if (defaultSectionId) {
    selectSection.value = defaultSectionId;
  } else if (list.sections.length > 0) {
    selectSection.value = list.sections[0].id;
  }
}

selectList.addEventListener("change", () => {
  populateSectionSelector(selectList.value);
  chrome.storage.local.set({ lastListId: selectList.value, lastSectionId: "" });
  checkDuplicate();
});

selectSection.addEventListener("change", () => {
  chrome.storage.local.set({ lastSectionId: selectSection.value });
  checkDuplicate();
});

// ── Recent products ───────────────────────────────────────────────────────────
function renderRecent() {
  chrome.storage.local.get(["recentProducts"], ({ recentProducts }) => {
    const items = recentProducts ?? [];
    const section = $("recent-section");
    const list = $("recent-list");
    if (items.length === 0) { section.style.display = "none"; return; }
    section.style.display = "block";
    list.innerHTML = "";
    items.slice(0, 5).forEach((p) => {
      const li = document.createElement("li");
      li.className = "recent-item";
      li.innerHTML = `
        <span class="recent-item-name" title="${p.name}">${p.name}</span>
        <span class="recent-item-store">${p.store ?? ""}</span>
      `;
      list.appendChild(li);
    });
  });
}

function addToRecent(p) {
  chrome.storage.local.get(["recentProducts"], ({ recentProducts }) => {
    const items = recentProducts ?? [];
    const updated = [{ name: p.name, store: p.store, added_at: Date.now() }, ...items].slice(0, 10);
    chrome.storage.local.set({ recentProducts: updated });
  });
}

// ── Display product data from content.js ──────────────────────────────────────
function displayProduct(p) {
  product = p;
  if (!p) {
    // Auto-extract failed — show manual form
    productAuto.style.display = "none";
    productManual.style.display = "block";
    return;
  }

  productAuto.style.display = "block";
  productManual.style.display = "none";

  $("product-name").textContent = p.name || "—";
  $("product-price").textContent = p.price ? p.price + " " : "";
  $("product-store").textContent = p.store ? `· ${p.store}` : "";
  extractStatus.textContent = "✓ Wykryto produkt automatycznie";
  extractStatus.className = "extract-status success";

  checkDuplicate();

  if (p.image) {
    $("product-img").src = p.image;
    $("product-img").style.display = "block";
    $("product-img-placeholder").style.display = "none";
  }
}

// ── Get product from current tab via content.js ───────────────────────────────
async function extractProductFromPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.url?.startsWith("chrome://")) {
      displayProduct(null);
      return;
    }

    // Send message to content.js
    const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PRODUCT" })
      .catch(() => null);

    log("Content script response:", response);

    if (response?.product) {
      displayProduct(response.product);
    } else {
      displayProduct(null);
    }
  } catch (e) {
    log("Extract error:", e);
    displayProduct(null);
  }
}

// ── Read manual form values ───────────────────────────────────────────────────
function getManualProduct() {
  return {
    name: $("manual-name").value.trim(),
    price: $("manual-price").value.trim(),
    url: $("manual-url").value.trim() || window.__veepickTabUrl || "",
    image: $("manual-image").value.trim(),
    store: $("manual-store").value.trim(),
    catalogNumber: null,
  };
}

// ── Duplicate check ───────────────────────────────────────────────────────────
function checkDuplicate() {
  const sectionId = selectSection.value;
  const listId    = selectList.value;
  if (!sectionId || !listId) return;

  const list    = lists.find((l) => l.id === listId);
  const section = list?.sections.find((s) => s.id === sectionId);
  if (!section) return;

  const isManual = productManual.style.display !== "none";
  const p = isManual ? getManualProduct() : product;
  if (!p?.name) return;

  const pUrl = p.url?.trim();
  const isDuplicate = pUrl
    ? section.products.some((sp) => sp.url === pUrl)
    : section.products.some((sp) => sp.name.toLowerCase() === p.name.trim().toLowerCase());

  btnAdd.disabled  = isDuplicate;
  btnAdd.textContent = isDuplicate ? "Ten produkt jest w tej sekcji" : "Dodaj produkt do listy";
}

// ── Add product ───────────────────────────────────────────────────────────────
btnAdd.addEventListener("click", async () => {
  const listId = selectList.value;
  const sectionId = selectSection.value;

  if (!listId || !sectionId) {
    showToast("Wybierz listę i sekcję", "error");
    return;
  }

  // Determine product data
  const isManual = productManual.style.display !== "none";
  const p = isManual ? getManualProduct() : product;

  if (!p?.name) {
    showToast("Uzupełnij nazwę produktu", "error");
    return;
  }

  btnAdd.disabled = true;
  btnAdd.textContent = "Dodawanie…";

  const comment = $("input-comment").value.trim();

  try {
    await apiFetch("/api/extension/product", {
      method: "POST",
      body: JSON.stringify({
        listId,
        sectionId,
        name: p.name,
        url: p.url ?? "",
        imageUrl: p.image ?? "",
        price: p.price ?? "",
        supplier: p.store ?? "",
        quantity: 1,
        description: comment || null,
        catalogNumber: p.catalogNumber ?? null,
      }),
    });

    addToRecent(p);
    showToast("Dodano produkt do listy ✓");
    renderRecent();
    $("input-comment").value = "";

    // Update local section data so duplicate check reflects the addition
    const addedList    = lists.find((l) => l.id === listId);
    const addedSection = addedList?.sections.find((s) => s.id === sectionId);
    if (addedSection) {
      addedSection.products.push({ url: p.url?.trim() || null, name: p.name });
    }

    // Notify background to flush pending products too
    chrome.runtime.sendMessage({ type: "FLUSH_PENDING", appUrl, apiKey });

    // Remove image picker from page and close popup after brief delay
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            document.getElementById("veepick-picker")?.remove();
            document.getElementById("veepick-picker-styles")?.remove();
          },
        }).catch(() => {});
      }
    } catch {}
    setTimeout(() => window.close(), 1200);

  } catch (err) {
    log("Add product error:", err);

    // Save as pending for when back online (skip for known duplicates)
    if (!err.message?.includes("już istnieje")) {
      chrome.runtime.sendMessage({ type: "SAVE_PENDING", product: {
        ...p, listId, sectionId, comment, added_at: Date.now()
      }});
      showToast("Nie udało się dodać. Zapisano lokalnie — spróbuj ponownie.", "error");
    } else {
      showToast("Ten produkt jest już w tej sekcji", "error");
    }
  } finally {
    checkDuplicate();
  }
});

// ── Connect ───────────────────────────────────────────────────────────────────
btnConnect.addEventListener("click", async () => {
  const url = inputAppUrl.value.trim().replace(/\/$/, "");
  const key = inputApiKey.value.trim();

  if (!url || !key) {
    showToast("Wypełnij oba pola", "error");
    return;
  }

  btnConnect.disabled = true;
  btnConnect.textContent = "Łączenie…";

  try {
    const res = await fetch(`${url}/api/extension/me`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error("Nieprawidłowy klucz lub adres aplikacji");
    const user = await res.json();

    // Save credentials
    await chrome.storage.local.set({ appUrl: url, apiKey: key });
    appUrl = url;
    apiKey = key;

    log("Connected as:", user.email);
    await loadMainScreen(user);

  } catch (err) {
    log("Connect error:", err);
    showToast(err.message || "Błąd połączenia", "error");
  } finally {
    btnConnect.disabled = false;
    btnConnect.textContent = "Połącz";
  }
});

btnOpenApp.addEventListener("click", () => {
  const url = inputAppUrl.value.trim().replace(/\/$/, "") || "";
  const target = url ? `${url}/settings/wtyczka` : "https://twoja-aplikacja.pl/settings/wtyczka";
  chrome.tabs.create({ url: target });
});

// ── Close button ─────────────────────────────────────────────────────────────
$("btn-close").addEventListener("click", () => {
  chrome.tabs.getCurrent((tab) => {
    if (tab) {
      chrome.tabs.remove(tab.id);
    } else {
      window.close(); // fallback: normalny popup (nie karta)
    }
  });
});

// ── Settings button — go back to setup ───────────────────────────────────────
$("btn-settings").addEventListener("click", () => {
  inputAppUrl.value = appUrl;
  inputApiKey.value = apiKey;
  showScreen("setup");
});

// ── Load main screen ──────────────────────────────────────────────────────────
async function loadMainScreen(user) {
  showScreen("loading");

  try {
    const data = await apiFetch("/api/extension/data");
    lists = data.lists ?? [];
    log("Lists loaded:", lists.length);

    userEmail.textContent = user.email ?? "";
    populateListSelector();
    showScreen("main");
    renderRecent();
    await extractProductFromPage();

  } catch (err) {
    log("Load data error:", err);
    showToast("Błąd ładowania list. Sprawdź połączenie.", "error");
    showScreen("setup");
  }
}

// ── Manual form duplicate check on input ──────────────────────────────────────
$("manual-name").addEventListener("input", checkDuplicate);
$("manual-url").addEventListener("input", checkDuplicate);

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  showScreen("loading");

  const stored = await chrome.storage.local.get(["appUrl", "apiKey"]);
  appUrl = stored.appUrl ?? "";
  apiKey = stored.apiKey ?? "";

  inputAppUrl.value = appUrl;
  inputApiKey.value = apiKey;

  if (!appUrl || !apiKey) {
    showScreen("setup");
    return;
  }

  // Verify saved key
  try {
    const res = await fetch(`${appUrl}/api/extension/me`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error("invalid key");
    const user = await res.json();
    await loadMainScreen(user);
  } catch {
    showScreen("setup");
  }
})();
