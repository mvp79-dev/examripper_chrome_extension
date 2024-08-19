console.log('background.js loaded');

/** @param {string | undefined} tabUrl */
function isValidExamUrl(tabUrl) {
  console.log(tabUrl);
  return tabUrl?.startsWith('https://course.apexlearning.com/') && tabUrl?.endsWith('assessment');
}

/**
 * @param {number=} tabId
 * @param {string=} tabUrl
 */
function updatePopupPage(tabId, tabUrl) {
  chrome.storage.local.get(['donor_status'], function (result) {
    console.log(result);
    let donorStatus = result.donor_status;
    console.log('donorStatus:', donorStatus);

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


chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === "install" || details.reason === "update") {
      chrome.tabs.create({ url: "https://examripper-288287396080.herokuapp.com/auth/start-auth" });
  }
});