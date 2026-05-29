// Background service worker — handles tab capture messages from popup

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CAPTURE_TAB') {
    captureActiveTab().then(sendResponse).catch((err) => {
      sendResponse({ error: err.message || 'Capture failed' });
    });
    return true; // keep message channel open for async response
  }
});

async function captureActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) throw new Error('No active tab');

  // Inject content script to grab the page HTML
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.documentElement.outerHTML,
  });

  const html = results?.[0]?.result;
  if (!html) throw new Error('Could not read page content');

  return { html, url: tab.url, title: tab.title };
}
