import { GlobSearch } from './lib/external/Algorithm/String/Search/GlobSearch.js';
import { WebRequestCache } from './lib/external/Platform/Browser/Extension/WebRequest.js';
import { Message, MessageAction } from './lib/Message.js';

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.tabs.create({ url: 'https://examripper-288287396080.herokuapp.com/auth/start-auth' });
  }
});

function injectOverlayIcon(tabId: number) {

  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['overlay/overlay.js']
  });
}

let tabId_global: any = null;
let breakIntervalId: number | NodeJS.Timeout | ReturnType<typeof setTimeout> | null = null;
let breakTimeoutId:NodeJS.Timeout | ReturnType<typeof setTimeout> |  number | null = null;
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
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
      case MessageAction.EdpuzzleOverlayUnlockTimeline:
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0].id) chrome.tabs.sendMessage(tabs[0].id, Message(MessageAction.Edpuzzle_UnlockTimeline, {}));
        });
        break;
      case MessageAction.EdpuzzleFinishAllMultipleChoice:
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0].id) chrome.tabs.sendMessage(tabs[0].id, Message(MessageAction.Edpuzzle_SubmitAllAnswers, {}));
        });
        break;
    }
  }

  if (tabId_global === null) {
    console.error('Tab ID is not set');
    return;
  }

  console.log('message.action', message.action);

  if (message.action === 'startTyping') {
    console.log('Starting typing on tabId:', tabId_global);
    chrome.scripting.executeScript({
      target: { tabId: tabId_global },
      func: injectScript,
      args: [
          message.data.text,
          message.data.typingSpeed,
          message.data.mistakeRate,
          message.data.correctionSpeed,
          message.data.breakTime,
          message.data.breakInterval,
      ],
    }).catch(error => console.error('Error executing script:', error));
  }

  else if (message.action === "updateProgress") {
    chrome.runtime.sendMessage({ action: "progressUpdate", progress: message.progress });
  }

  else if (message.action === "stopTyping") {
    console.log('Stopping typing on tabId:', tabId_global);
    // Send a message to the content script to stop typing
    chrome.tabs.sendMessage(tabId_global, {action: "stopTyping"});
  }

  else if (message.action === "pauseTyping") {
    console.log('Pausing typing on tabId:', tabId_global);
    chrome.tabs.sendMessage(tabId_global, { action: 'pauseTyping' });
  } else if (message.action === 'resumeTyping') {
    console.log('Resuming typing on tabId:', tabId_global);
    chrome.tabs.sendMessage(tabId_global, { action: 'resumeTyping' });
  }

  else if (message.action === "startBreak") {
    console.log('Starting break on tabId:', tabId_global);
    chrome.tabs.sendMessage(tabId_global, {action: "startBreak"});
  }

  else if (message.action === "skipBreak") {
    console.log('Skipping break');
    if (breakTimeoutId !== null) {
      clearTimeout(breakTimeoutId);
      breakTimeoutId = null;
    }
    chrome.tabs.sendMessage(tabId_global, {action: "skipBreak"});
    chrome.runtime.sendMessage({ action: "breakSkipped" });
  }

  if (message.action === "updateBreak" || message.action === "startBreak" || message.action === "breakEnded") {
    // Relay the message to all tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message);
        }
      });
    });
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
    if (GlobSearch(tabUrl?tabUrl:'', '*://edpuzzle.com/*')) {
      console.log('edpuzzle');
      injectOverlayIcon(tabId?tabId:0);
    }    
      chrome.action.setPopup({ tabId, popup: getPopupPage(tabUrl) });
    //   if (donor_status === false) {
    //   chrome.action.setPopup({ tabId, popup: '/popup/loggedInNoSub.html' });
    // } else if (donor_status === true) {
    //   chrome.action.setPopup({ tabId, popup: getPopupPage(tabUrl) });
    // } else {
    //   chrome.action.setPopup({ tabId, popup: '/popup/start.html' });
    // }
  });
}

updatePopupPage();

chrome.tabs.onActivated.addListener(function (activeInfo) {
  console.log('chrome.tabs.onActivated', activeInfo);
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    updatePopupPage(tab.id, tab.url);
  });
  tabId_global = activeInfo.tabId;
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log('chrome.tabs.onUpdated', tabId, changeInfo, tab);
  if (changeInfo.status === 'complete' && tab.active) {
    updatePopupPage(tabId, tab.url);
  }
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://docs.google.com/document/')) {
    tabId_global = tabId;
    chrome.storage.local.remove('autoTyperState', () => {
      if (chrome.runtime.lastError) {
        console.error('Error removing autoTyperState:', chrome.runtime.lastError);
      } else {
        console.log('autoTyperState removed from local storage');
      }
    });
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

function injectScript(text: string, typingSpeed: number, mistakeRate: number, correctionSpeed: number, breakTime: number, breakInterval: number) {
  console.log('Injecting script with text:', text);
  let isTyping = true;
  let isPaused = false;
  let isOnBreak = false;

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "stopTyping") {
      isTyping = false;
    } else if (message.action === "pauseTyping") {
      isPaused = true;
    } else if (message.action === 'resumeTyping') {
      isPaused = false;
    } else if (message.action === "startBreak") {
      isOnBreak = true;
    } else if (message.action === "breakEnded") {
      isOnBreak = false;
    } 
    if (message.action === "skipBreak") {
      console.log("Break skipped in content script");
      resumeTyping();
    }
    sendResponse({received: true});
    return true; // Keeps the message channel open for sendResponse
  });

  function pauseTyping() {
    isPaused = true;
  }

  function resumeTyping() {
    isPaused = false;
  }

  async function simulateTyping(inputElement: any, char: any, delay: any) {
    console.log('Typing:', char);
    return new Promise((resolve) => {
      setTimeout(() => {
        let eventObj;
        if (char === '\n') {
          eventObj = new KeyboardEvent('keydown', {
            bubbles: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            charCode: 13,
          });
        } else {
          eventObj = new KeyboardEvent('keypress', {
            bubbles: true,
            key: char,
            charCode: char.charCodeAt(0),
            keyCode: char.charCodeAt(0),
            which: char.charCodeAt(0),
          });
        }
        inputElement.dispatchEvent(eventObj);
        resolve();
      }, delay);
    });
  }

  async function typeStringWithRandomDelay(inputElement: any, string: any) {
    const lowerBoundValue = 10000 / typingSpeed;
    const upperBoundValue = lowerBoundValue * 0.8;
    let wordCount = 0;
    let mistakeCount = 0;
    console.log('Typing string:', string);
    for (let i = 0; i < string.length; i++) {
      if (!isTyping) {
        console.log('Typing stopped');
        break;
      }
      while (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
      }

      const char = string[i];
      const randomDelay = Math.floor(Math.random() * (upperBoundValue - lowerBoundValue + 1)) + lowerBoundValue;

      if (wordCount >= breakInterval) {
        wordCount = 0;
        await startBreak(breakTime*60);
      }

      await simulateTyping(inputElement, char, randomDelay);
      if (char === ' ' || char === '\n') wordCount++;

      if (i % 10 === 0 || i === string.length - 1) {
        const progress = Math.round((i / string.length) * 100);
        chrome.runtime.sendMessage({ action: 'updateProgress', progress });
      }
    }
    if (!isTyping) {
      chrome.runtime.sendMessage({ action: 'typingComplete' });
    }
  }

  async function startBreak(breakTime: number) {
    chrome.runtime.sendMessage({ action: "startBreak", breakTime });
    pauseTyping();
    // breakTimeoutId = setTimeout(() => {
    //   chrome.runtime.sendMessage({ action: "breakEnded" });
    //   resumeTyping();
    //   breakTimeoutId = null;
    // }, breakTime * 1000);
    for (let i = 0; i < breakTime; i++) {
      if (!isPaused) break;
      chrome.runtime.sendMessage({ action: "updateBreak", timeLeft: breakTime - i });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    chrome.runtime.sendMessage({ action: "breakEnded" });
  }

  const iframe = document.querySelector('.docs-texteventtarget-iframe');
  if (iframe) {
    const input = iframe.contentDocument.activeElement;
    typeStringWithRandomDelay(input, text);
  } else {
    console.error('Input element not found.');
  }
}
