//TODO: unmock the server when done
// const API_URLS = {
//   image: 'https://examripper-288287396080.herokuapp.com/imageDetermine',
//   text: 'https://examripper-288287396080.herokuapp.com/api/ask',
// };
const API_URLS = {
  image: 'http://localhost:8000/',
  text: 'http://localhost:8000/',
};

//
//

// Call updateAuthToken at app start or when needed
//TODO: unmock auth token
// let globalAuthToken = /** @type{ string | null }*/ (null);
// updateAuthToken();
let globalAuthToken = 'mock-auth-token';

let intervalBetween = 1000;
let abortHighlighting = false;

let loopCount = 0;
let imageSearches = 0;
let requestCount = 0;
let submitCount = 0;

let scriptStatus = /** @type {'Ready'|'Running'|'Stopping'} */ ('Ready');

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log('Received Message:', message);
  switch (message.action) {
    case 'getStatus': {
      sendResponse({ status: scriptStatus });
      break;
    }
    case 'startHighlighting': {
      if (message.interval) {
        intervalBetween = message.interval;
      }
      startHighlighting();
      break;
    }
    case 'stopHighlighting': {
      stopHighlighting();
      break;
    }
  }
});

onMessage('getStatus', (message, sender, sendResponse) => {
  sendResponse({ status: scriptStatus });
});

onMessage('startHighlighting', (message, sender, sendResponse) => {
  if (message.interval) {
    intervalBetween = message.interval;
  }
  startHighlighting();
});

onMessage('stopHighlighting', (message, sender, sendResponse) => {
  stopHighlighting();
});

/**
 * @param {string} action
 * @param {(message:any, sender:any, sendResponse:any)=>void} fn
 */
function onMessage(action, fn) {
  // if (message.action === action) {
  //   fn();
  // }
}

// Auth Functions

async function updateAuthToken() {
  console.log('enter:', arguments.callee.name);

  try {
    globalAuthToken = await getAuthToken();
    console.log('Auth token updated globally:', globalAuthToken);
  } catch (error) {
    console.error('Error updating global auth token:', error);
  }
}

async function getAuthToken() {
  console.log('enter:', arguments.callee.name);

  return new Promise((resolve, reject) => {
    chrome.storage.local.get('authToken', function (result) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      return resolve(result.authToken);
    });
  });
}

// Core Functions

async function startHighlighting() {
  console.log('enter:', arguments.callee.name);

  abortHighlighting = false;

  loopCount = 0;
  imageSearches = 0;
  requestCount = 0;
  submitCount = 0;

  await updateStatus('Running');

  try {
    await runHighlighting();
    while (abortHighlighting === false) {
      await callOnNextTick(async () => await runHighlighting());
    }
  } catch (error) {
    console.log('Error:', error);
  }

  await updateStatus('Ready');
}

async function runHighlighting() {
  console.log('enter:', arguments.callee.name);

  for (const form of document.querySelectorAll('form')) {
    if (await findButton(form, 'VIEW SUMMARY')) {
      stopHighlighting();
      break;
    }
    if (await findButton(form, 'SUBMIT')) {
      console.log('loop count:', ++loopCount);
      if (isQuestion(form)) {
        if (isAnswerHereQuestion(form)) {
          await processAnswerHereQuestion(form);
          continue;
        }
        if (isDragAndDropQuestion(form)) {
          await processDragAndDropQuestion(form);
          continue;
        }
        //TODO: should this only be toggled once per form?
        addVisualFeedbackColor(form);
        if (await processMultipleChoiceQuestion(form)) {
          if (await tryClickSubmitButton(form)) {
            await sleep(5000);
            if (await answerFeedbackContains('CORRECT')) {
              //TODO: should we wait for the Submit button's text to change?
              await tryClickNextButton(form);
              //TODO: should we try clicking multiple Next buttons?
            } else {
              console.log('ANSWER INCORRECT??');
              //TODO: find correct answer and send to server
            }
          }
        }
      }
    }
  }
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
async function sleep(ms) {
  console.log('enter:', arguments.callee.name);

  assertNotAborting();
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        assertNotAborting();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    }, ms);
  });
}

async function stopHighlighting() {
  console.log('scriptStatus:', scriptStatus);
  await updateStatus('Stopping');
  abortHighlighting = true;
  removeAllVisualFeedback();
}

/** @param {HTMLFormElement} form */
function isQuestion(form) {
  return Array.from(form.querySelectorAll('*')).some((el) => {
    return el.innerText?.includes('Question') && el.innerText?.includes('of');
  });
}

/** @param {HTMLFormElement} form */
function isAnswerHereQuestion(form) {
  // check if there is an input in the form with the placeholder as "Answer here" if there is refresh the page
  return form.querySelector('input[data-placeholder="Answer here"]');
}

/** @param {HTMLFormElement} form */
function isDragAndDropQuestion(form) {
  // check if form.innerHTML.includes("drag-source") if its true refresh the page
  return form.innerHTML.includes('drag-source');
}

/** @param {HTMLFormElement} form */
async function processAnswerHereQuestion(form) {
  console.log('Answer input found. Not Implemented. Refreshing page.');
  location.reload();
}

/** @param {HTMLFormElement} form */
async function processDragAndDropQuestion(form) {
  console.log('Drag source found. Not Implemented. Refreshing page.');
  location.reload();
}

/** @param {HTMLFormElement} form */
async function processMultipleChoiceQuestion(form) {
  if (getVisualFeedbackColor(form) === 'blue') {
    return await sendFormData(form);
  }
}

/** @param {HTMLFormElement} form */
async function sendFormData(form) {
  console.log('enter:', arguments.callee.name);
  const images = form.querySelectorAll('img');
  const svgs = form.querySelectorAll('svg');
  if (images.length > 0 || svgs.length > 0) {
    return await sendFormImageData(form);
  } else {
    return await sendFormTextData(form);
  }
}

/** @param {HTMLFormElement} form */
async function sendFormImageData(form) {
  console.log('enter:', arguments.callee.name);

  // logImagesInForm(form);
  const { request_data } = await makeImageRequestData(form);
  const { response_data } = await makeAPICall(API_URLS.image, request_data);
  return await processAPIResponse(form, response_data.response);
}

/** @param {HTMLFormElement} form */
async function sendFormTextData(form) {
  console.log('enter:', arguments.callee.name);

  const { request_data } = await makeTextRequestData(form);
  const { response_data } = await makeAPICall(API_URLS.text, request_data);
  // findMatchingLabel(form, response_data.response);
  return await processAPIResponse(form, response_data.response, response_data.quizId);
}

/**
 * @param {HTMLFormElement} form
 * @param {string} matchText
 */
async function processAPIResponse(form, matchText) {
  console.log('enter:', arguments.callee.name);

  // give time for dom updates to be processed
  return callOnNextTick(async () => {
    console.log('matchText', matchText);
    assertFormHasText(form, matchText);
    const label = findFirstLabelWithText(form, matchText);
    const radio = findFirstRadioButton(label);
    await callOnNextTick(async () => radio.click());
    console.log(`clicked radio button: ${radio.name}`);
    return true;
  });
}

/** @param {HTMLFormElement} form */
async function tryClickSubmitButton(form) {
  console.log('enter:', arguments.callee.name);

  const button = await tryClickButton(form, 'SUBMIT');
  if (button) console.log('Clicked Submit button for the', addOrdinalSuffix(++submitCount), 'time', button);
  return button;
}

/** @param {HTMLFormElement} form */
async function tryClickNextButton(form) {
  console.log('enter:', arguments.callee.name);

  const button = await tryClickButton(form, 'NEXT QUESTION');
  if (button) console.log('Clicked Next button:', button);
  return button;
}

/**
 * @param {HTMLFormElement} form
 * @param {string} target_text
 */
async function tryClickButton(form, target_text) {
  console.log('enter:', arguments.callee.name);

  target_text = target_text.trim().toLocaleUpperCase();

  // give time for dom updates to be processed
  return await callOnNextTick(async () => {
    const buttons = form.querySelectorAll('button');
    for (const button of buttons) {
      console.log('button', button);
      if (target_text === button.innerText?.trim().toLocaleUpperCase()) {
        button.click();
        return button;
      }
    }
    const inputs = form.querySelectorAll('input');
    for (const input of inputs) {
      console.log('input', input);
      if (input.type === 'submit' || input.type === 'button') {
        if (target_text === input.value.trim().toLocaleUpperCase()) {
          input.click();
          return input;
        }
      }
    }
    return false;
  });
}

/**
 * @param {HTMLFormElement} form
 * @param {string} target_text
 */
async function findButton(form, target_text) {
  console.log('enter:', arguments.callee.name);

  target_text = target_text.trim().toLocaleUpperCase();

  // give time for dom updates to be processed
  return await callOnNextTick(async () => {
    const buttons = form.querySelectorAll('button');
    for (const button of buttons) {
      console.log(button);
      console.log('button text:', button.innerText?.trim().toLocaleUpperCase());
      if (target_text === button.innerText?.trim().toLocaleUpperCase()) {
        return button;
      }
    }
    const inputs = form.querySelectorAll('input');
    for (const input of inputs) {
      if (input.type === 'submit' || input.type === 'button') {
        if (target_text === input.value.trim().toLocaleUpperCase()) {
          return input;
        }
      }
    }
    return false;
  });
}

// Visual Feedback

/** @param {HTMLFormElement} form */
function addVisualFeedbackColor(form) {
  const newColor = getVisualFeedbackColor(form) === 'red' ? 'blue' : 'red';
  form.dataset.color = `2px solid ${newColor}`;
}

/** @param {HTMLFormElement} form */
function getVisualFeedbackColor(form) {
  return form.dataset.color === '2px solid red' ? 'red' : 'blue';
}

function removeAllVisualFeedback() {
  for (const form of document.querySelectorAll('form')) {
    form.style.removeProperty('border');
  }
}

// Utility Functions

/**
 * @throws 'Abort Highlighting'
 */
function assertNotAborting() {
  if (abortHighlighting === false) {
    return true;
  }
  throw 'Abort Highlighting';
}

/**
 * @param {HTMLFormElement} form
 * @param {string} matchText
 * @throws 'No matching text found in form.'
 */
function assertFormHasText(form, matchText) {
  if (form.innerText.includes(matchText)) {
    return true;
  }
  throw 'No matching text found in form.';
}

/** @param {HTMLFormElement} form */
function logImagesInForm(form) {
  console.log('enter:', arguments.callee.name);

  const images = form.querySelectorAll('img');
  console.log('image search count:', ++imageSearches);
  console.log('Found', images.length, 'image(s) in the form.');
  images.forEach((img, index) => {
    console.log(`Image ${index + 1}: SRC=${img.src}, ALT=${img.alt}`);
  });
}

/**
 * @param {HTMLFormElement} form
 * @param {string} matchText
 */
function findMatchingLabel(form, matchText) {
  console.log('enter:', arguments.callee.name);

  matchText = matchText.toLocaleLowerCase();
  for (const label of form.querySelectorAll('label')) {
    const labelText = label.querySelector('span')?.innerText;
    if (labelText && labelText === matchText) {
      console.log('Matched Label:', labelText);
      return;
    }
  }
  console.log('No matching label found.');
}

/**
 * @param {HTMLFormElement} form
 * @param {string} matchText
 * @throws 'No matching label found.'
 */
function findFirstLabelWithText(form, matchText) {
  console.log('enter:', arguments.callee.name);

  // form.querySelectorAll('.ng-star-inserted, .sia-choice-letter');
  const labels = form.querySelectorAll('label');
  for (const label of labels) {
    if (label.innerText.includes(matchText)) {
      console.log('first matching label:', label);
      return label;
    }
  }
  throw 'No matching label found.';
}

/**
 * @param {HTMLLabelElement} label
 * @throws 'Could not find radio button.'
 */
function findFirstRadioButton(label) {
  console.log('enter:', arguments.callee.name);

  for (const input of label.querySelectorAll('input')) {
    if (input.type === 'radio') {
      console.log('first radio button:', input);
      return input;
    }
  }
  throw 'Could not find radio button.';
}

function findQuizTitle() {
  {
    // try a direct path to title
    const selector = 'body > kp-app > kp-platform > kp-app-shell > kp-nav-header > div.toolbar.ng-star-inserted > kp-content-lane > div > div';
    const title = document.querySelector(selector)?.innerText;
    if (title) return title;
  }
  {
    // try a class
    const selector = '.toolbar-title-wrapper';
    const title = document.querySelector(selector)?.innerText;
    if (title) return title;
  }
  return '';
}

function findAnswerFeedback() {
  {
    // try a direct path to title
    const selector =
      'body > kp-app > kp-platform > kp-app-shell > mat-sidenav-container > mat-sidenav-content > kp-main > main > rt-activity-sia > kp-content-lane > div > form > kp-question-controls > div > div > div.feedback-wrap > div.feedback-body.active';
    const text = document.querySelector(selector)?.innerText;
    if (text) return text;
  }
  {
    // try a class
    const selector = '.feedback-body.active';
    const text = document.querySelector(selector)?.innerText;
    if (text) return text;
  }
  return '';
}

/** @param {string} matchText */
async function answerFeedbackContains(matchText) {
  console.log('enter:', arguments.callee.name);

  // give time for dom updates to be processed
  return callOnNextTick(async () => {
    const feedbackText = findAnswerFeedback().toLocaleUpperCase();
    return feedbackText.includes(matchText.toLocaleUpperCase());
  });
}

/**
 * @template T
 * @param {()=>Promise<T>} fn
 * @returns {Promise<T>}
 */
async function callOnNextTick(fn) {
  console.log('enter:', arguments.callee.name);

  assertNotAborting();
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        assertNotAborting();
        console.log(arguments.callee.name, ', calling function');
        return resolve(await fn());
      } catch (error) {
        return reject(error);
      }
    }, intervalBetween);
  });
}

/**
 * @param {string} api_url
 * @param {object} request_data
 * @param {object=} request_data.imgdata
 * @param {string=} request_data.text
 * @throws 'AuthToken is null.' if `globalAuthToken` is null
 * @throws 'No response received.' if `response_data.response` is undefined
 */
async function makeAPICall(api_url, request_data) {
  console.log('enter:', arguments.callee.name);

  assertNotAborting();

  if (globalAuthToken === null) throw 'AuthToken is null.';

  console.log('Sending request for the', addOrdinalSuffix(++requestCount), 'time.');
  const response = await fetch(api_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authToken: globalAuthToken,
      quizTitle: findQuizTitle(),
      ...request_data,
    }),
  });
  const response_data = await response.json();
  if (!response_data.response) throw 'No response received.';
  console.log('response:', response_data.response);
  return { response, response_data };
}

/**
 * @param {HTMLFormElement} form
 */
async function makeImageRequestData(form) {
  console.log('enter:', arguments.callee.name);

  assertNotAborting();

  // @ts-ignore
  const canvas = await html2canvas(form, { useCORS: true, allowTaint: false });
  const imgdata = canvas.toDataURL('image/png');
  console.log('imgdata:', imgdata);
  return {
    request_data: { imgdata },
  };
}

/**
 * @param {HTMLFormElement} form
 * @throws 'Form is empty.' if `form` has no text content
 */
async function makeTextRequestData(form) {
  console.log('enter:', arguments.callee.name);

  const text = form.innerText?.trim() ?? '';
  if (text === '') throw 'Form is empty.';
  return {
    request_data: { text: text },
  };
}

/** @param {number} num */
function addOrdinalSuffix(num) {
  // If the number ends in 1, the suffix is –st. If the number ends in 2, the suffix is –nd. If the number ends in 3, the suffix is –rd. If the number ends in 4-9, the suffix is –th.
  const text = num.toString(10);
  if (text.endsWith('1')) {
    return `${num}st`;
  }
  if (text.endsWith('2')) {
    return `${num}nd`;
  }
  if (text.endsWith('3')) {
    return `${num}rd`;
  }
  return `${num}th`;
}

/**
 * @param {'Ready'|'Running'|'Stopping'} status
 * @returns {Promise<void>}
 */
async function updateStatus(status) {
  console.log('enter:', arguments.callee.name, status);

  if (scriptStatus === 'Ready' && status === 'Stopping') {
    status = 'Ready';
  }
  scriptStatus = status;
  chrome.runtime.sendMessage({ action: 'updateStatus', status });
}
export {};
