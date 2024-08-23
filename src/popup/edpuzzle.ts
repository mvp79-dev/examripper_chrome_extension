import { Message, MessageAction } from '../lib/Message.js';

// TODO: hook this in with extension storage or something
const chkClickToAnswer = document.getElementById('click-answer');
if (!(chkClickToAnswer instanceof HTMLInputElement)) throw 'chkClickToAnswer is null';
chkClickToAnswer.addEventListener('change', () => {
  console.log(chkClickToAnswer.checked);
});

const btnUnlockTimeline = document.getElementById('unlock-timeline');
if (!(btnUnlockTimeline instanceof HTMLButtonElement)) throw 'btnUnlockTimeline is null';
btnUnlockTimeline.addEventListener('click', () => {
  console.log('Start');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, Message(MessageAction.Edpuzzle_UnlockTimeline, {}));
    }
  });
});
