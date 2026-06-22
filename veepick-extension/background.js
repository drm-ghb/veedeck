chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "veepick-pick-image",
      title: "Wybierz zdjęcie dla veepick",
      contexts: ["all"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "veepick-pick-image") return;
  if (info.srcUrl) {
    // Right-clicked directly on an image — use it immediately
    chrome.storage.local.set({ veepick_picked_image: info.srcUrl });
  } else if (tab?.id) {
    // Right-clicked elsewhere — inject image-picker so user can hover over images
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["image-picker.js"] }).catch(() => {});
  }
});

// Toggle panel in the active tab on icon click
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["panel.js"] }).catch(() => {});
});

// Handle messages from panel.js content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Relay image pick to storage
  if (msg.type === "veepick-image-pick" && msg.url) {
    chrome.storage.local.set({ veepick_picked_image: msg.url });
    return;
  }

  // Proxy API fetch (content scripts may have CORS issues)
  if (msg.type === "api-fetch") {
    fetch(msg.url, msg.options)
      .then(async (res) => {
        const text = await res.text();
        sendResponse({ ok: res.ok, status: res.status, text });
      })
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true; // keep channel open for async response
  }

  // Inject image picker into the sender tab
  if (msg.type === "inject-image-picker" && sender.tab?.id) {
    chrome.scripting.executeScript({ target: { tabId: sender.tab.id }, files: ["image-picker.js"] }).catch(() => {});
  }

  // Fetch image as data URL (bypasses page CSP restrictions)
  if (msg.type === "fetch-image" && msg.url) {
    fetch(msg.url)
      .then(async (res) => {
        if (!res.ok) { sendResponse({ ok: false }); return; }
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ ok: true, dataUrl: reader.result });
        reader.readAsDataURL(blob);
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});
