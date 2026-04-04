// YT Ad Skipper — Content Script
// Runs on all youtube.com pages

(function () {
  "use strict";

  const CONFIG = {
    checkInterval: 300,       // ms between checks
    speedMultiplier: 16,      // playback speed for unskippable ads
    debug: false,
  };

  let enabled = true;
  let adsSkipped = 0;
  let originalSpeed = 1;
  let isSpedUp = false;

  // ── Load settings ──────────────────────────────────────────────
  chrome.storage.sync.get(["enabled", "adsSkipped"], (data) => {
    if (data.enabled !== undefined) enabled = data.enabled;
    if (data.adsSkipped !== undefined) adsSkipped = data.adsSkipped;
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) enabled = changes.enabled.newValue;
  });

  function incrementSkipped() {
    adsSkipped++;
    chrome.storage.sync.set({ adsSkipped });
  }

  function log(...args) {
    if (CONFIG.debug) console.log("[YT Ad Skipper]", ...args);
  }

  // ── Skip button clicker ────────────────────────────────────────
  function tryClickSkip() {
    const selectors = [
      ".ytp-skip-ad-button",
      ".ytp-ad-skip-button",
      ".ytp-ad-skip-button-modern",
      'button.ytp-ad-skip-button',
      ".videoAdUiSkipButton",
      'button[id^="skip-button"]',
      ".ytp-ad-skip-button-slot button",
      // "Skip Ads" text-based fallback
      'button.ytp-ad-skip-button-modern .ytp-ad-skip-button-text',
    ];

    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        log("Clicked skip button:", sel);
        incrementSkipped();
        return true;
      }
    }

    // Fallback: look for any visible button whose text contains "Skip"
    const allButtons = document.querySelectorAll(
      ".ytp-ad-skip-button-slot button, .ytp-skip-ad-button, button"
    );
    for (const btn of allButtons) {
      const text = btn.textContent?.trim().toLowerCase() || "";
      if (
        (text.includes("skip") || text.includes("ad")) &&
        btn.offsetParent !== null &&
        btn.closest(".ad-showing, .ytp-ad-player-overlay, .video-ads")
      ) {
        btn.click();
        log("Clicked skip (text match):", text);
        incrementSkipped();
        return true;
      }
    }

    return false;
  }

  // ── Overlay / banner ad removal ────────────────────────────────
  function removeOverlayAds() {
    const overlaySelectors = [
      ".ytp-ad-overlay-container",
      ".ytp-ad-overlay-slot",
      'div[id="player-ads"]',
      "#masthead-ad",
      "#player-ads",
      "ytd-ad-slot-renderer",
      "ytd-banner-promo-renderer",
      "ytd-statement-banner-renderer",
      "ytd-in-feed-ad-layout-renderer",
      "ytd-promoted-sparkles-web-renderer",
      "ytd-display-ad-renderer",
      "#ad-text",
      ".ytd-mealbar-promo-renderer",
      "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']",
    ];

    for (const sel of overlaySelectors) {
      document.querySelectorAll(sel).forEach((el) => {
        if (el && el.offsetParent !== null) {
          el.remove();
          log("Removed overlay:", sel);
        }
      });
    }
  }

  // ── Speed through unskippable ads ──────────────────────────────
  function handleUnskippableAd(video) {
    if (!video) return;

    // If ad is playing and there's no skip button, speed it up
    if (!isSpedUp) {
      originalSpeed = video.playbackRate;
      video.playbackRate = CONFIG.speedMultiplier;
      video.muted = true;
      isSpedUp = true;
      log("Sped up unskippable ad to", CONFIG.speedMultiplier, "x");
    }
  }

  function restorePlayback(video) {
    if (isSpedUp && video) {
      video.playbackRate = originalSpeed || 1;
      video.muted = false;
      isSpedUp = false;
      log("Restored normal playback");
    }
  }

  // ── Detect if an ad is currently playing ───────────────────────
  function isAdPlaying() {
    const player = document.querySelector(".html5-video-player");
    if (player && player.classList.contains("ad-showing")) return true;

    const adIndicators = [
      ".ytp-ad-player-overlay",
      ".ytp-ad-player-overlay-instream-info",
      ".ytp-ad-text",
      ".ytp-ad-preview-container",
      'div.ytp-ad-text[id="ad-text:N"]',
    ];
    return adIndicators.some((sel) => {
      const el = document.querySelector(sel);
      return el && el.offsetParent !== null;
    });
  }

  // ── Main loop ──────────────────────────────────────────────────
  function mainLoop() {
    if (!enabled) {
      const video = document.querySelector("video");
      restorePlayback(video);
      return;
    }

    const video = document.querySelector("video");

    if (isAdPlaying()) {
      // 1. Try clicking skip
      const skipped = tryClickSkip();

      // 2. If no skip button, speed through
      if (!skipped && video) {
        handleUnskippableAd(video);
      }
    } else {
      // Not in an ad — restore if needed
      restorePlayback(video);
    }

    // 3. Always clean up overlay / banner ads
    removeOverlayAds();
  }

  // ── Start ──────────────────────────────────────────────────────
  setInterval(mainLoop, CONFIG.checkInterval);

  // Also observe DOM mutations for dynamic ad injection
  const observer = new MutationObserver(() => {
    if (enabled) {
      tryClickSkip();
      removeOverlayAds();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  log("YT Ad Skipper loaded ✓");
})();
