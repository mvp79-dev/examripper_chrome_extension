//TODO: unmock the server when done
// const API_URLS = {
//   image: 'https://examripper-288287396080.herokuapp.com/imageDetermine',
//   text: 'https://examripper-288287396080.herokuapp.com/api/ask',
// };
const API_URLS = {
  image: 'http://localhost:8000/',
  text: 'http://localhost:8000/',
  validate: 'http://localhost:8000/validate',
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
  //TODO: hook this up again
  static Analytics = {
    image_search_count: 0,
    process_loop_count: 0,
    request_count: 0,
    submission_count: 0,
  };

  // Add new question types here for easy suggestions.
  static Question_Type = Object.freeze({
    Answer_Here: 'Answer_Here',
    Drag_and_Drop: 'Drag_and_Drop',
    Multiple_Choice: 'Multiple_Choice',
  });

  // Add new states here.
  static Status_Type = Object.freeze({
    Ready: 'Ready',
    Running: 'Running',
    Stopping: 'Stopping',
  });

  static Status = /** @type {keyof Highlighter.Status_Type} */ (Highlighter.Status_Type.Ready);

  /** @param {keyof Highlighter.Status_Type} new_status */
  static UpdateStatus(new_status) {
    log_call();

    if (Highlighter.Status === 'Ready' && new_status === 'Stopping') {
      new_status = 'Ready';
    }
    Highlighter.Status = new_status;
    chrome.runtime.sendMessage({ action: 'updateStatus', status: Highlighter.Status });
  }

  abort = false;

  /**
   * @memberof Highlighter
   * @param {number} action_interval
   */
  constructor(action_interval) {
    this.action_interval = action_interval;
  }

  // The main method.
  /** @memberof Highlighter */
  async process() {
    log_call();

    const form = this.getNextUnansweredQuestionForm();

    console.log('looking for next question button or view summary button');
    if (new TextMatcher(this.getButtons(form), ['innerText', 'value'], ['Next Question', 'View Summary']).anyIncludesAny().matchedElement) {
      // question has already been submitted
      form.setAttribute('data-answered', 'true');
      return;
    }

    const { quizId, response } = await this.sendFormDataToServer(form);

    this.assertNotAborting();

    const question_type = this.getQuestionType(form);

    if (question_type === 'Answer_Here') {
      console.log('writing in short answer');
      const answerBox = this.getShortAnswerInput(form);
      if (answerBox) {
        answerBox.value = response;
        await this.pause(this.action_interval);
      }
    }

    if (question_type === 'Drag_and_Drop') {
      console.log('dragging items to correct boxes');
      const dragAndDrop = this.getDragAndDropSourceList(form);
      if (dragAndDrop) {
        // do dragging and dropping stuff
        await this.pause(this.action_interval);
      }
    }

    if (question_type === 'Multiple_Choice') {
      console.log('selecting multiple choice answer');
      const { matchedElement: label } = new InnerTextMatcher([...form.querySelectorAll('label')], [response]).anyIncludesAny();
      const radio_button = label ? this.getRadioInputs(label)[0] : undefined;
      if (radio_button) {
        console.log('radio_button.click()');
        radio_button.click();
        await this.pause(this.action_interval);
      } else {
        // it would be weird that the radio button is missing, but what if we don't find it?
      }
    }

    this.assertNotAborting();

    console.log('looking for submit button');
    const { matchedElement: submit_button } = new TextMatcher(this.getButtons(form), ['innerText', 'value'], ['Submit']).anyIncludesAny();
    if (submit_button) {
      console.log('submit_button.click()');
      submit_button.click();
      await this.pause(1000);
      // wait long enough for server to process text
      // should we wait for the Submit button's text to change?
      // ideally, we would wait for the form's html to change a bit
    } else {
      // it would be weird that the submit button is missing, but what if we don't find it?
      // though, it could be missing if it was already clicked and this question is being repeated
    }

    this.assertNotAborting();

    console.log('looking for feedback');
    const feedbackSection = this.getFeedbackSection(form);
    if (feedbackSection) {
      //TODO: is response_data.quizId the correct name?
      const { matchedText } = new InnerTextMatcher([feedbackSection], ['Incorrect', 'Correct']).anyIncludesAny();
      if (matchedText === 'correct') {
        form.setAttribute('data-answered', 'true');
        await this.sendAnswerFeedbackToServer({ quizId, isCorrect: true });
      }
      if (matchedText === 'incorrect') {
        await this.sendAnswerFeedbackToServer({ quizId, isCorrect: false });
      }
    } else {
      // couldn't find the feedback section
      // what to do next?
      return;
    }

    this.assertNotAborting();

    console.log('looking for next question button');
    const { matchedElement: next_button } = new TextMatcher(this.getButtons(form), ['innerText', 'value'], ['Next Question']).anyIncludesAny();
    console.log('buttons:', this.getButtons(form));
    if (next_button) {
      console.log('next_button.click()');
      next_button.click();
      await this.pause(this.action_interval);
      // are there multiple next buttons?
    }

    console.log('looking for view summary button');
    const { matchedElement: view_summary_button } = new TextMatcher(this.getButtons(form), ['innerText', 'value'], ['View Summary']).anyIncludesAny();
    if (view_summary_button) {
      console.log('found view summary button. stopping');
      this.stop();
    }
  }

  /** @memberof Highlighter */
  start() {
    log_call();

    Highlighter.UpdateStatus('Running');

    const self = this;
    (async function loop() {
      console.log('');
      console.log('');
      console.log('');
      try {
        self.assertNotAborting();
        await self.process();
        setTimeout(() => loop(), self.action_interval);
      } catch (error) {
        Highlighter.UpdateStatus('Ready');
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

    Highlighter.UpdateStatus('Stopping');
    this.abort = true;
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
      if (input.type.toLowerCase() === 'button' || input.type.toLowerCase() === 'submit') {
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
      if (input.type.toLowerCase() === 'radio') {
        list.push(input);
      }
    }
    return list;
  }

  /** @param {HTMLFormElement} form */
  getQuestionType(form) {
    log_call();

    if (this.getShortAnswerInput(form)) return Highlighter.Question_Type.Answer_Here;
    if (this.getDragAndDropSourceList(form)) return Highlighter.Question_Type.Drag_and_Drop;
    return Highlighter.Question_Type.Multiple_Choice;
  }

  /** @param {HTMLFormElement} form */
  getShortAnswerInput(form) {
    const element = form.querySelector('input[data-placeholder="Answer here"]');
    return element instanceof HTMLInputElement ? element : undefined;
  }

  /** @param {HTMLFormElement} form */
  getDragAndDropSourceList(form) {
    const element = form.querySelector('kp-drag-source-list');
    return element instanceof HTMLElement ? element : undefined;
  }

  /** @param {HTMLFormElement} form */
  getFeedbackSection(form) {
    log_call();

    const feedbackSection = form.querySelector('kp-question-controls');
    if (feedbackSection instanceof HTMLElement) return feedbackSection;
    return undefined;
  }

  /**
   * @memberof Highlighter
   * @param {HTMLFormElement} form
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
    const response_data = await response.json();
    return {
      quizId: response_data.id,
      response: response_data.response,
    };
  }

  /**
   * @memberof Highlighter
   * @param {object} params
   * @param {string} params.quizId
   * @param {boolean} params.isCorrect
   */
  async sendAnswerFeedbackToServer({ quizId, isCorrect }) {
    log_call();
    this.assertNotAborting();

    const authToken = await getAuthToken();
    if (authToken === null || authToken === undefined) throw 'AuthToken is null.';

    const request_data = {
      authToken: authToken,
      quizTitle: this.getQuizTitle(),
      id: quizId,
      isCorrect,
    };
    this.deleteUndefinedKeys(request_data);

    const response = await fetch(API_URLS.validate, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request_data),
    });
    return await response.json();
  }

  /**
   * @memberof Highlighter
   * @param {HTMLFormElement} form
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
   * @memberof Highlighter
   * @throws 'Abort Highlighting'
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
   * @memberof InnerTextMatcher
   * @param {T[]} element_list
   * @param {(keyof T)[]} property_names
   * @param {string[]} match_list
   * @param {boolean=} case_sensitive
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
    for (const { element, property_list } of this.element_data_list) {
      for (const property of property_list) {
        const matched = this.includesAny(property);
        if (matched) {
          return { matchedElement: element, matchedProperty: property, matchedText: matched.text };
        }
      }
    }
    return {};
  }

  /**
   * @public
   * @memberof InnerTextMatcher
   */
  anyIncludesEach() {
    for (const { element, property_list } of this.element_data_list) {
      for (const property of property_list) {
        if (this.includesEach(property)) {
          return { matchedElement: element, matchedProperty: property };
        }
      }
    }
    return {};
  }

  /**
   * @public
   * @memberof InnerTextMatcher
   */
  anyIncludesEachInOrder() {
    for (const { element, property_list } of this.element_data_list) {
      for (const property of property_list) {
        if (this.includesEachInOrder(property)) {
          return { matchedElement: element, matchedProperty: property };
        }
      }
    }
    return {};
  }

  /**
   * @private
   * @memberof InnerTextMatcher
   * @param {string} property
   */
  includesAny(property) {
    for (const matchText of this.match_list) {
      if (property.indexOf(matchText) > -1) {
        return { text: matchText };
      }
    }
    return undefined;
  }

  /**
   * @private
   * @memberof InnerTextMatcher
   * @param {string} property
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
   * @memberof InnerTextMatcher
   * @param {string} property
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
   * @memberof InnerTextMatcher
   * @param {T[]} element_list
   * @param {string[]} match_list
   * @param {boolean=} case_sensitive
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
      sendResponse({ status: Highlighter.Status });
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
      else Highlighter.UpdateStatus('Ready');
      break;
    }
  }
});

function log_call() {
  const stack = new Error().stack;
  const caller = stack?.split('\n')[2].trim();
  if (caller) console.log('>', caller);
}
