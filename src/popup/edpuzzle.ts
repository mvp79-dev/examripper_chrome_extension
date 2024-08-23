import { Message, MessageAction } from '../lib/Message.js';

const chkClickToAnswer = document.getElementById('click-answer');
if (!(chkClickToAnswer instanceof HTMLInputElement)) throw 'chkClickToAnswer is null';
chrome.storage.local.get('edpuzzle_clickToAnswer', ({ edpuzzle_clickToAnswer }) => {
  chkClickToAnswer.checked = typeof edpuzzle_clickToAnswer === 'boolean' ? edpuzzle_clickToAnswer : false;
});
chkClickToAnswer.addEventListener('change', () => {
  const enabled = chkClickToAnswer.checked;
  chrome.storage.local.set({ edpuzzle_clickToAnswer: enabled });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0].id) chrome.tabs.sendMessage(tabs[0].id, Message(MessageAction.Edpuzzle_ClickToAnswer, { enabled: enabled }));
  });
});

const btnUnlockTimeline = document.getElementById('unlock-timeline');
if (!(btnUnlockTimeline instanceof HTMLButtonElement)) throw 'btnUnlockTimeline is null';
btnUnlockTimeline.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0].id) chrome.tabs.sendMessage(tabs[0].id, Message(MessageAction.Edpuzzle_UnlockTimeline, {}));
  });
});
