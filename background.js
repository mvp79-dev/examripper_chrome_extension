console.log('background.js loaded');

/** @param {string | undefined} tabUrl */
function isValidExamUrl(tabUrl) {
  //TODO: unmock this
  return tabUrl?.startsWith('http://localhost:5500/');
  return tabUrl?.startsWith('https://course.apexlearning.com/') && tabUrl?.endsWith('assessment');
}

/**
 * @param {number=} tabId
 * @param {string=} tabUrl
 */
function updatePopupPage(tabId, tabUrl) {
  chrome.storage.local.get(['donor_status'], function (result) {
    //TODO: unmock donor status
    result.donor_status = true;

    const donorStatus = result.donor_status;
    if (donorStatus === false) {
      chrome.action.setPopup({ tabId, popup: '/popup/loggedInNoSub.html' });
      return;
    }
    if (donorStatus === true) {
      if (isValidExamUrl(tabUrl)) {
        chrome.action.setPopup({ tabId, popup: '/popup/examripper.html' });
      } else {
        chrome.action.setPopup({ tabId, popup: '/popup/loggedInSub.html' });
      }
      return;
    }
    chrome.action.setPopup({ tabId, popup: '/popup/start.html' });
  });
}

updatePopupPage();

chrome.tabs.onActivated.addListener(function (activeInfo) {
  console.log('chrome.tabs.onActivated', activeInfo);
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    updatePopupPage(tab.id, tab.url);
  });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log('chrome.tabs.onUpdated', tabId, changeInfo, tab);
  if (changeInfo.status === 'complete' && tab.active) {
    updatePopupPage(tabId, tab.url);
  }
});

// needed to avoid errors
chrome.runtime.onConnect.addListener(function () {});
chrome.runtime.onMessage.addListener(function () {});
