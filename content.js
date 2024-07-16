//TODO: unmock the server when done
// const API_URLS = {
//   image: 'https://examripper-288287396080.herokuapp.com/imageDetermine',
//   text: 'https://examripper-288287396080.herokuapp.com/api/ask',
// };
const API_URLS = {
  image: 'http://localhost:8000/',
  text: 'http://localhost:8000/',
};

async function getAuthToken() {
  //TODO: unmock when done
  return 'mock-auth-token';
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('authToken', function (result) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      return resolve(result.authToken);
    });
  });
}

class Highlighter {
  static Analytics = {
    image_search_count: 0,
    process_loop_count: 0,
    request_count: 0,
    submission_count: 0,
  };

  static Question_Type = Object.freeze({
    Answer_Here: 'Answer_Here',
    Drag_and_Drop: 'Drag_and_Drop',
    Multiple_Choice: 'Multiple_Choice',
  });

  static Status = Object.freeze({
    Ready: 'Ready',
    Running: 'Running',
    Stopping: 'Stopping',
  });

  abort = false;
  status = /** @type {keyof Highlighter.Status}*/ (Highlighter.Status.Ready);

  /**
   * @param {number} action_interval
   * @memberof Highlighter
   */
  constructor(action_interval) {
    this.action_interval = action_interval;
  }

  /** @memberof Highlighter */
  start() {
    log_call();

    const self = this;
    self.updateStatus('Running');
    (async function loop() {
      console.log('');
      console.log('');
      console.log('');
      try {
        self.assertNotAborting();
        await self.process();
        setTimeout(() => loop(), self.action_interval);
      } catch (error) {
        self.updateStatus('Ready');
        if (error === 'Abort') {
          console.log('Abort');
        } else {
          console.log('Error:', error);
        }
      }
    })();
  }

  /** @memberof Highlighter */
  stop() {
    log_call();

    this.updateStatus('Stopping');
    this.abort = true;
  }

  /**
   * @param {keyof Highlighter.Status} new_status
   * @memberof Highlighter */
  updateStatus(new_status) {
    log_call();

    if (this.status === 'Ready' && new_status === 'Stopping') {
      new_status = 'Ready';
    }
    this.status = new_status;
    chrome.runtime.sendMessage({ action: 'updateStatus', status: this.status });
  }

  /** @memberof Highlighter */
  async process() {
    log_call();

    const form = this.getNextUnansweredQuestionForm();
    const response_data = await this.sendFormDataToServer(form);
    const question_type = this.getQuestionType(form);

    this.assertNotAborting();

    if (question_type === 'Answer_Here') {
      console.log('writing in short answer');
    }

    if (question_type === 'Drag_and_Drop') {
      console.log('dragging items to correct boxes');
    }

    if (question_type === 'Multiple_Choice') {
      console.log('selecting multiple choice answer');
      const firstMatchingLabel = new InnerTextMatcher([...form.querySelectorAll('label')], [response_data.response]).firstToIncludeAny();
      const radioButton = firstMatchingLabel ? this.getRadioInputs(firstMatchingLabel)[0] : undefined;
      if (radioButton) {
        console.log('radioButton.click()');
        radioButton.click();
        await this.pause(this.action_interval);
      } else {
        // it would be weird that the radio button is missing, but what if we don't find it?
        return;
      }
    }

    this.assertNotAborting();

    console.log('looking for submit button');
    const submit_button = new TextMatcher(this.getButtons(form), ['innerText', 'value'], ['Submit']).firstToIncludeAny();
    console.log('submit_button:', submit_button);
    if (submit_button) {
      console.log('submit_button.click()');
      submit_button.click();
      await this.pause(1000);
      // wait long enough for server to process text
      // should we wait for the Submit button's text to change?
      // ideally, we would wait for the form's html to change a bit
    } else {
      // it would be weird that the submit button is missing, but what if we don't find it?
      return;
    }

    this.assertNotAborting();

    console.log('looking for feedback');
    const feedbackSection = this.getFeedbackSection(form);
    if (feedbackSection) {
      if (new InnerTextMatcher([feedbackSection], ['Correct']).anyIncludesAny()) {
        form.setAttribute('data-answered', 'true');
      } else {
        // tell server that answer was incorrect
        // what to do next?
        return;
      }
    } else {
      // couldn't find the feedback section
      // what to do next?
      return;
    }

    this.assertNotAborting();

    console.log('looking for next question button');
    const next_button = new InnerTextMatcher(this.getButtons(form), ['Next Question']).firstToIncludeAny();
    if (next_button) {
      console.log('next_button.click()');
      next_button.click();
      await this.pause(this.action_interval);
      // are there multiple next buttons?
    }

    console.log('looking for view summary button');
    const view_summary_button = new InnerTextMatcher(this.getButtons(form), ['View Summary']).firstToIncludeAny();
    if (view_summary_button) {
      this.stop();
    }
  }

  /** @memberof Highlighter */
  getNextUnansweredQuestionForm() {
    log_call();

    for (const form of document.querySelectorAll('form')) {
      // look for custom injected data
      if (form.getAttribute('data-answered') === 'true') {
        continue; // skip
      }
      // search for "Question ... of"
      if (new InnerTextMatcher([form], ['Question', 'of']).anyIncludesEachInOrder()) {
        return form;
      }
      // search for expected buttons
      if (new InnerTextMatcher(this.getButtons(form), ['Next Question', 'Submit', 'View Summary']).anyIncludesAny()) {
        return form;
      }
    }
    throw 'No unanswered questions found.';
  }

  /** @param {HTMLElement} element */
  getButtons(element) {
    log_call();

    const list = [];
    list.push(...element.querySelectorAll('button'));
    for (const input of element.querySelectorAll('input')) {
      if (input.type === 'button' || input.type === 'submit') {
        list.push(input);
      }
    }
    return list;
  }

  /** @param {HTMLElement} element */
  getImages(element) {
    log_call();

    const list = [];
    list.push(...element.querySelectorAll('img'));
    list.push(...element.querySelectorAll('svg'));
    return list;
  }

  /** @param {HTMLElement} element */
  getRadioInputs(element) {
    log_call();

    const list = [];
    for (const input of element.querySelectorAll('input')) {
      if (input.type === 'radio') {
        list.push(input);
      }
    }
    return list;
  }

  /** @param {HTMLFormElement} form */
  getQuestionType(form) {
    log_call();

    if (form.querySelector('input[data-placeholder="Answer here"]')) return Highlighter.Question_Type.Answer_Here;
    if (form.innerHTML.includes('drag-source')) return Highlighter.Question_Type.Drag_and_Drop;
    return Highlighter.Question_Type.Multiple_Choice;
  }

  /** @param {HTMLFormElement} form */
  getFeedbackSection(form) {
    log_call();

    const feedbackSection = form.querySelector('kp-question-controls');
    if (feedbackSection instanceof HTMLElement) return feedbackSection;
    return undefined;
  }

  /**
   * @param {HTMLFormElement} form
   * @memberof Highlighter
   */
  async sendFormDataToServer(form) {
    log_call();
    this.assertNotAborting();

    const authToken = await getAuthToken();
    if (authToken === null || authToken === undefined) throw 'AuthToken is null.';

    const request_data = {
      authToken: authToken,
      quizTitle: this.getQuizTitle(),
      imgdata: await this.getImageData(form),
      text: this.getQuestionText(form),
    };
    this.deleteUndefinedKeys(request_data);

    // console.log('Sending request for the', addOrdinalSuffix(++requestCount), 'time.');
    const api_url = request_data.imgdata ? API_URLS.image : API_URLS.text;
    const response = await fetch(api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request_data),
    });
    return await response.json();
  }

  /**
   * @param {HTMLFormElement} form
   * @param {object} response_data
   * @param {string=} response_data.response
   * @param {string=} response_data.quizId
   * @memberof Highlighter
   */
  async processAPIResponse(form, { response, quizId }) {
    log_call();

    if (response) {
      const label = new InnerTextMatcher([...form.querySelectorAll('label')], [response]).firstToIncludeAny();
      const radio = label ? this.getRadioInputs(label)[0] : undefined;
      if (radio) {
        radio.click();
        return true;
      }
    }
    return false;
  }

  /**
   * @param {HTMLFormElement} form
   * @memberof Highlighter
   */
  async getImageData(form) {
    log_call();

    if (this.getImages(form).length > 0) {
      // @ts-ignore
      const canvas = await html2canvas(form, { useCORS: true, allowTaint: false });
      console.log(canvas);
      const dataURL = canvas.toDataURL('image/png');
      console.log(dataURL);
      if (dataURL !== undefined && dataURL !== null && dataURL !== '') {
        return dataURL;
      }
    }
    return undefined;
  }

  /** @param {HTMLFormElement} form */
  getQuestionText(form) {
    log_call();

    const innerText = form.innerText.trim();
    if (innerText !== '') {
      return innerText;
    }
    return undefined;
  }

  getQuizTitle() {
    log_call();

    const selector_list = [
      // direct path to title
      'body > kp-app > kp-platform > kp-app-shell > kp-nav-header > div.toolbar.ng-star-inserted > kp-content-lane > div > div',
      // possible class
      '.toolbar-title-wrapper',
    ];

    for (const selector of selector_list) {
      const element = document.querySelector(selector);
      if (element instanceof HTMLElement && element.innerText !== '') {
        return element.innerText;
      }
    }

    return undefined;
  }

  /**
   * @param {HTMLElement[]} element_list
   * @param {(keyof HTMLElement)[]} prop_names
   * @memberof Highlighter
   */
  toProps(element_list, prop_names) {
    const prop_list = [];
    for (const element of element_list) {
      for (const prop_name of prop_names) {
        prop_list.push(element[prop_name]);
      }
    }
    return prop_list;
  }

  /**
   * @throws 'Abort Highlighting'
   * @memberof Highlighter
   */
  assertNotAborting() {
    if (this.abort === false) {
      return true;
    }
    throw 'Abort';
  }

  /** @param {Record<string,any>} obj */
  deleteUndefinedKeys(obj) {
    log_call();

    for (const key in obj) {
      if (obj[key] === undefined) delete obj[key];
    }
  }

  /**
   * Don't forget to `await` this call.
   * @param {number} duration_ms
   * @returns {Promise<void>}
   */
  async pause(duration_ms) {
    log_call();

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          this.assertNotAborting();
          return resolve();
        } catch (error) {
          return reject(error);
        }
      }, duration_ms);
    });
  }
}

/**
 * @template {HTMLElement} T
 */
class TextMatcher {
  /**
   * @param {T[]} element_list
   * @param {(keyof T)[]} property_names
   * @param {string[]} match_list
   * @param {boolean=} case_sensitive
   * @memberof InnerTextMatcher
   */
  constructor(element_list, property_names, match_list, case_sensitive = false) {
    this.element_data_list = [];
    for (const element of element_list) {
      const element_data = { element, property_list: /** @type {string[]} */ ([]) };
      for (const property_name of property_names) {
        if (typeof element[property_name] === 'string') {
          element_data.property_list.push(case_sensitive ? element[property_name] : element[property_name].toLocaleLowerCase());
        }
      }
      this.element_data_list.push(element_data);
    }
    this.match_list = [];
    for (const text of match_list) {
      if (text !== '') {
        this.match_list.push(case_sensitive ? text : text.toLocaleLowerCase());
      }
    }
  }

  /**
   * @public
   * @memberof InnerTextMatcher
   */
  anyIncludesAny() {
    for (const { property_list } of this.element_data_list) {
      for (const property of property_list) {
        if (this.includesAny(property)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * @public
   * @memberof InnerTextMatcher
   */
  anyIncludesEach() {
    for (const { property_list } of this.element_data_list) {
      for (const property of property_list) {
        if (this.includesEach(property)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * @public
   * @memberof InnerTextMatcher
   */
  anyIncludesEachInOrder() {
    for (const { property_list } of this.element_data_list) {
      for (const property of property_list) {
        if (this.includesEachInOrder(property)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * @public
   * @memberof InnerTextMatcher
   */
  firstToIncludeAny() {
    for (const { element, property_list } of this.element_data_list) {
      for (const property of property_list) {
        if (this.includesAny(property)) {
          return element;
        }
      }
    }
    return undefined;
  }

  /**
   * @public
   * @memberof InnerTextMatcher
   */
  firstToIncludeEach() {
    for (const { element, property_list } of this.element_data_list) {
      for (const property of property_list) {
        if (this.includesEach(property)) {
          return element;
        }
      }
    }
    return undefined;
  }

  /**
   * @public
   * @memberof InnerTextMatcher
   */
  firstToIncludeEachInOrder() {
    for (const { element, property_list } of this.element_data_list) {
      for (const property of property_list) {
        if (this.includesEachInOrder(property)) {
          return element;
        }
      }
    }
    return undefined;
  }

  /**
   * @private
   * @param {string} property
   * @memberof InnerTextMatcher
   */
  includesAny(property) {
    for (const matchText of this.match_list) {
      if (property.indexOf(matchText) > -1) {
        return true;
      }
    }
    return false;
  }

  /**
   * @private
   * @param {string} property
   * @memberof InnerTextMatcher
   */
  includesEach(property) {
    for (const matchText of this.match_list) {
      if (property.indexOf(matchText) === -1) {
        return false;
      }
    }
    return true;
  }

  /**
   * @private
   * @param {string} property
   * @memberof InnerTextMatcher
   */
  includesEachInOrder(property) {
    let startIndex = 0;
    for (const matchText of this.match_list) {
      const matchIndex = property.indexOf(matchText, startIndex);
      if (matchIndex === -1) {
        return false;
      }
      startIndex = matchIndex + matchText.length;
    }
    return true;
  }
}

/**
 * @template {HTMLElement} T
 * @extends TextMatcher<T>
 */
class InnerTextMatcher extends TextMatcher {
  /**
   * @param {T[]} element_list
   * @param {string[]} match_list
   * @param {boolean=} case_sensitive
   * @memberof InnerTextMatcher
   */
  constructor(element_list, match_list, case_sensitive = false) {
    super(element_list, ['innerText'], match_list, case_sensitive);
  }
}

//
//
//

let highlighter = /** @type{Highlighter|undefined} */ (undefined);

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log('Received Message:', message);
  switch (message.action) {
    case 'getStatus': {
      sendResponse({ status: highlighter?.status ?? Highlighter.Status.Ready });
      break;
    }
    case 'startHighlighting': {
      if (highlighter) highlighter.stop();
      highlighter = new Highlighter(message.interval);
      highlighter.start();
      break;
    }
    case 'stopHighlighting': {
      if (highlighter) highlighter.stop();
      break;
    }
  }
});

function log_call() {
  const stack = new Error().stack;
  const caller = stack?.split('\n')[2].trim();
  if (caller) console.log('>', caller);
}
