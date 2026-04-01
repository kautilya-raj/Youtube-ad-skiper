(function () {
  let skipped = 0;
  let muted = false;

  function skipAds() {
    // 1. Click "Skip Ad" button if available
    const skipBtn =
      document.querySelector('.ytp-skip-ad-button') ||
      document.querySelector('.ytp-ad-skip-button') ||
      document.querySelector('button[class*="skip-ad"]') ||
      document.querySelector('.ytp-ad-skip-button-modern');

    if (skipBtn) {
      skipBtn.click();
      skipped++;
      updateBadge();
      return;
    }

    // 2. For unskippable ads: mute + fast-forward to end
    const video = document.querySelector('video');
    const adBadge =
      document.querySelector('.ytp-ad-simple-ad-badge') ||
      document.querySelector('.ytp-ad-preview-container') ||
      document.querySelector('.ytp-ad-duration-remaining') ||
      document.querySelector('[class*="ytp-ad-"]');

    if (video && adBadge) {
      // Mute only if not already muted
      if (!muted) {
        video.muted = true;
        muted = true;
      }
      // Fast-forward to near the end
      if (video.duration && video.currentTime < video.duration - 0.5) {
        video.currentTime = video.duration - 0.1;
      }
    } else {
      // Restore mute state after ad
      if (muted && video) {
        video.muted = false;
        muted = false;
      }
    }
  }

  function updateBadge() {
    // Send count to popup if open
    chrome.runtime.sendMessage({ type: 'skipped', count: skipped }).catch(() => {});
  }

  // Run every 300ms
  setInterval(skipAds, 300);

  // Listen for popup asking for count
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'getCount') sendResponse({ count: skipped });
  });
})();
