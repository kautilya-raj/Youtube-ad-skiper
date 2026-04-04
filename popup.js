const toggle = document.getElementById("toggle");
const count = document.getElementById("count");

// Load saved state
chrome.storage.sync.get(["enabled", "adsSkipped"], (data) => {
  toggle.checked = data.enabled !== false; // default true
  count.textContent = data.adsSkipped || 0;
});

// Toggle handler
toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: toggle.checked });
});

// Live-update the counter while popup is open
chrome.storage.onChanged.addListener((changes) => {
  if (changes.adsSkipped) {
    count.textContent = changes.adsSkipped.newValue;
  }
});
