import { GlobSearch } from './lib/ericchase/Algorithm/String/Search/GlobSearch.js';
import { WebRequestCache } from './lib/ericchase/Platform/Browser/Extension/WebRequest.js';
import { Message, MessageAction } from './lib/Message.js';

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.tabs.create({ url: 'https://examripper-288287396080.herokuapp.com/auth/start-auth' });
  }
});

chrome.runtime.onConnect.addListener(function () {});

chrome.runtime.onMessage.addListener((message: Message, sender) => {
  if (sender.tab?.id) {
    const tab_id = sender.tab.id;
    switch (message.action) {
      case MessageAction.Edpuzzle_GetWebRequest:
        WebRequestCache.Subscribe(() => {
          const webRequest = WebRequestCache.TabIdToRequestMap.get(tab_id);
          if (webRequest) {
            chrome.tabs.sendMessage(tab_id, Message(MessageAction.Edpuzzle_WebRequest, { webRequest }));
            return { abort: true };
          }
        });
        break;
      case MessageAction.Edpuzzle_GetClickToAnswer:
        chrome.storage.local.get('edpuzzle_clickToAnswer', ({ edpuzzle_clickToAnswer }) => {
          const enabled = typeof edpuzzle_clickToAnswer === 'boolean' ? edpuzzle_clickToAnswer : false;
          chrome.tabs.sendMessage(tab_id, Message(MessageAction.Edpuzzle_ClickToAnswer, { enabled }));
        });
        break;
    }
  }
});

//                                                                            //
// EXAM RIPPER

console.log('background.js loaded');

function getPopupPage(tabUrl = '') {
  console.log({ tabUrl });
  if (GlobSearch(tabUrl, '*://course.apexlearning.com/*assessment')) {
    console.log('examripper');
    return '/popup/examripper.html';
  }
  if (GlobSearch(tabUrl, '*://edpuzzle.com/*')) {
    console.log('edpuzzle');
    return '/popup/edpuzzle.html';
  }
  console.log('loggedInSub');
  return '/popup/loggedInSub.html';
}

// TODO: probably remove this in favor of getPopupPage
// function isValidExamUrl(tabUrl: string | undefined) {
//   console.log(tabUrl);
//   // return tabUrl?.startsWith('https://course.apexlearning.com/') && tabUrl?.endsWith('assessment');
//   if (tabUrl?.startsWith('http://127.0.0.1:8000/')) return true;
//   if (tabUrl?.startsWith('https://edpuzzle.com/assignments/')) return true;
//   return false;
// }

function updatePopupPage(tabId?: number, tabUrl?: string) {
  chrome.storage.local.get(['donor_status'], function ({ donor_status }) {
    if (donor_status === false) {
      chrome.action.setPopup({ tabId, popup: '/popup/loggedInNoSub.html' });
    } else if (donor_status === true) {
      chrome.action.setPopup({ tabId, popup: getPopupPage(tabUrl) });
    } else {
      chrome.action.setPopup({ tabId, popup: '/popup/start.html' });
    }
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

//                                                                            //
// ED PUZZLE

function onBeforeRequestHandler(details: chrome.webRequest.WebRequestBodyDetails) {
  if (details.tabId !== -1) {
    details.url;
    WebRequestCache.AddBody(details);
  }
}
function onBeforeSendHeadersHandler(details: chrome.webRequest.WebRequestHeadersDetails) {
  if (details.tabId !== -1) {
    WebRequestCache.AddHeaders(details);
  }
}

chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequestHandler, //
  { urls: ['https://edpuzzle.com/api/v3/assignments/*/attempt?type=media'] },
  ['requestBody'],
);
chrome.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendHeadersHandler, //
  { urls: ['https://edpuzzle.com/api/v3/assignments/*/attempt?type=media'] },
  ['requestHeaders'],
);
