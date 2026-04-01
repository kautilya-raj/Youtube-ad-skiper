chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab && tab.url && tab.url.includes('youtube.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'getCount' }, (res) => {
      if (res) document.getElementById('count').textContent = res.count;
    });
  }
});
