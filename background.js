console.log('background.js loaded');

/** @param {string | undefined} tabUrl */
function isValidExamUrl(tabUrl) {
  console.log(tabUrl);
  return true;
  return tabUrl?.startsWith('https://course.apexlearning.com/') && tabUrl?.endsWith('assessment');
}

/**
 * @param {number=} tabId
 * @param {string=} tabUrl
 */
function updatePopupPage(tabId, tabUrl) {
  chrome.storage.local.get(['donor_status'], function (result) {
    //TODO: unmock donor status
    const donorStatus = true;
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


chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Code to be executed on first install
    // eg. open a tab with a url
    chrome.tabs.create({
      url: "https://google.comhttps://examripper-288287396080.herokuapp.com/auth/start-auth"
    });
  }
});