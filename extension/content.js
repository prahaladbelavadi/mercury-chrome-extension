// Content script — runs in the context of every page.
// Currently used only as an injection target for tab capture;
// extend here to add page-aware features (selection capture, etc.).

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    sendResponse({ text: window.getSelection()?.toString() || '' });
  }
});
