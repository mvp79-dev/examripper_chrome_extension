//TODO: unmock the server when done
// const API_URLS = {
//   image: 'https://examripper-288287396080.herokuapp.com/imageDetermine',
//   text: 'https://examripper-288287396080.herokuapp.com/api/ask',
// };
const API_URLS = {
  image: 'http://localhost:5500/',
  matchterms: 'http://localhost:5500/match-terms',
  text: 'http://localhost:5500/',
  validate: 'http://localhost:5500/validate',
};

const NOTABLE_FUNCTIONS = () => {
  // don't call this function
  const highlighter = new Highlighter(0);

  highlighter.process;
  highlighter.sendFormDataToServer();
  highlighter.sendAnswerFeedbackToServer();
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

  static RuntimeConnected = true;
  static Status = /** @type {keyof Highlighter.Status_Type} */ (Highlighter.Status_Type.Ready);

  /** @param {keyof Highlighter.Status_Type} new_status */
  static UpdateStatus(new_status) {
    log_call();

    if (Highlighter.Status === 'Ready' && new_status === 'Stopping') {
      new_status = 'Ready';
    }
    Highlighter.Status = new_status;
    if (Highlighter.RuntimeConnected === true) {
      console.log('UpdateStatus, Highlighter.RuntimeConnected:', Highlighter.RuntimeConnected);
      chrome.runtime.sendMessage({ action: 'updateStatus', status: Highlighter.Status });
    }
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
      // form.setAttribute('data-answered', 'true'); // question has already been submitted
      return;
    }

    const question_type = this.getQuestionType(form);
    const { quizId, response, response_data } = await this.sendFormDataToServer(form, question_type);

    this.assertNotAborting();

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

      const drag_items = [];
      for (const element of document.querySelectorAll('kp-drag-item')) {
        if (element instanceof HTMLElement) {
          drag_items.push(element);
        }
      }

      const drop_labels = [];
      for (const element of document.querySelectorAll('kp-drop-target-label')) {
        if (element instanceof HTMLElement) {
          drop_labels.push(element);
        }
      }

      for (const [key, value] of Object.entries(response_data)) {
        const { matchedElement: dragItem } = new InnerTextMatcher(drag_items, [key]).anyIncludesAny();
        // console.log('dragItem', dragItem);
        if (dragItem) {
          console.log(`First Item ID for key "${key}": ${dragItem.id}`);
          const { matchedElement: dropLabel } = new InnerTextMatcher(drop_labels, [value]).anyIncludesAny();
          // console.log('dropText', dropLabel);
          if (dropLabel) {
            const dropTarget = this.getClosestKpDropTarget(dropLabel);
            // console.log('dropTarget', dropTarget);
            if (dropTarget) {
              console.log(`First Target ID for value "${value}": ${dropTarget.id}`);
              // do dragging and dropping stuff
              DndSimulatorDataTransfer().simulate(dragItem, dropTarget);
              await this.pause(this.action_interval);
            }
          }
        }
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
        // form.setAttribute('data-answered', 'true');
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

  /**
   * @memberof Highlighter
   * @param {HTMLFormElement} form
   * @param {keyof Highlighter.Question_Type} question_type
   */
  async sendFormDataToServer(form, question_type) {
    log_call();
    this.assertNotAborting();

    const authToken = await getAuthToken();
    if (authToken === null || authToken === undefined) throw 'AuthToken is null.';

    const request_data = {
      authToken: authToken,
      quizTitle: this.getQuizTitle(),
      imgdata: await this.getImageData(form),
      text: this.getQuestionText(form),
      ...this.getFormData(form),
    };

    this.deleteUndefinedKeys(request_data);

    const api_url = (function () {
      if (question_type === 'Drag_and_Drop') {
        return API_URLS.matchterms;
      } else {
        return request_data.imgdata ? API_URLS.image : API_URLS.text;
      }
    })();

    // console.log('Sending request for the', addOrdinalSuffix(++requestCount), 'time.');
    const { id, response, ...response_data } = await (
      await fetch(api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request_data),
      })
    ).json();

    return {
      quizId: id,
      response: response,
      response_data,
    };
  }

  /**
   * @memberof Highlighter
   * @param {HTMLFormElement} form
   */
  getFormData(form) {
    const form_data = new FormData(form);
    const pojo = /** @type {Record<string,FormDataEntryValue>} */ ({});
    for (const [key, value] of form_data) {
      pojo[key] = value;
    }
    return pojo;
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
      // if (form.getAttribute('data-answered') === 'true') {
      //   continue; // skip
      // }

      const feedbackSection = this.getFeedbackSection(form);
      if (feedbackSection) {
        const { matchedText } = new InnerTextMatcher([feedbackSection], ['Incorrect', 'Correct']).anyIncludesAny();
        if (matchedText) {
          console.log(`"${matchedText}" found in feedback section, skipping.`);
          continue; // skip
        }
      }

      // search for "Question ... of"
      if (new InnerTextMatcher([form], ['Question', 'of']).anyIncludesEachInOrder()) {
        // search for "Submit" button
        if (new InnerTextMatcher(this.getButtons(form), ['Submit']).anyIncludesAny()) {
          return form;
        }
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

  /** @param {HTMLElement} element */
  getClosestKpDropTarget(element) {
    const closest = element.closest('kp-drop-target');
    if (closest) return closest;

    let current_element = element;
    while (current_element.parentElement) {
      current_element = current_element.parentElement;
      const potential_targets = current_element.querySelectorAll('kp-drop-target');
      if (potential_targets.length > 0) {
        return potential_targets[0];
      }
    }
    return undefined;
  }

  /** @param {HTMLFormElement} form */
  getFirstDragItem(form) {
    const element = form.querySelector('kp-drag-item');
    return element instanceof HTMLElement ? element : undefined;
  }

  /** @param {HTMLFormElement} form */
  getQuestionType(form) {
    log_call();

    if (this.getShortAnswerInput(form)) return Highlighter.Question_Type.Answer_Here;
    if (this.getFirstDragItem(form)) return Highlighter.Question_Type.Drag_and_Drop;
    return Highlighter.Question_Type.Multiple_Choice;
  }

  /** @param {HTMLFormElement} form */
  getShortAnswerInput(form) {
    const element = form.querySelector('input[data-placeholder="Answer here"]');
    return element instanceof HTMLInputElement ? element : undefined;
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
          const text = element[property_name].trim();
          if (text !== '') {
            element_data.property_list.push(case_sensitive ? text : text.toLocaleLowerCase());
          }
        }
      }
      this.element_data_list.push(element_data);
    }
    this.match_list = [];
    for (let match of match_list) {
      const text = match.trim();
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

function DndSimulatorDataTransfer() {
  // https://github.com/Photonios/JS-DragAndDrop-Simulator

  /*
   * The MIT License (MIT)
   *
   * Copyright (c) 2016 Swen Kooij / Photonios
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights to
   * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
   * of the Software, and to permit persons to whom the Software is furnished to do
   * so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
   * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
   * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
   */

  /*!
   * \class DndSimulatorDataTransfer
   *
   * \brief Re-implementation of the native \see DataTransfer object.
   *
   * \param data Optional: The data to initialize the data transfer object with.
   *
   * \see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
   */
  var DndSimulatorDataTransfer = function () {
    this.data = {};
  };

  /*!
   * \brief Controls the feedback currently given to the user.
   *
   * Must be any of the following strings:
   *
   * - "move"
   * - "copy"
   * - "link"
   * - "none"
   *
   * The default is "move".
   *
   * \see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/dropEffect
   */
  DndSimulatorDataTransfer.prototype.dropEffect = 'move';

  /*!
   * \brief Controls which kind of drag/drop operatins are allowed.
   *
   * Must be any of the following strings:
   *
   * - "none"
   * - "copy"
   * - "copyLink"
   * - "copyMove"
   * - "link"
   * - "linkMove"
   * - "move"
   * - "all"
   * - "uninitialized"
   *
   * The default is "all".
   *
   * \see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/effectAllowed
   */
  DndSimulatorDataTransfer.prototype.effectAllowed = 'all';

  /*!
   * \brief List of files being dragged.
   *
   * This property will remain an empty list when the drag and drop operation
   * does not involve any files.
   *
   * \see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files
   */
  DndSimulatorDataTransfer.prototype.files = [];

  /*!
   * \brief Read-only list of items being dragged.
   *
   * This is actually a list of \see DataTransferItem
   * \see https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem
   *
   * This property will remain an empty list when the drag and drop
   * operation does not involve any files.
   */
  DndSimulatorDataTransfer.prototype.items = [];

  /*!
   * \brief Read-only list of data formats that were set in
   *           the "dragstart" event.
   *
   * The order of the formats is the same order as the data
   * included in the drag operation.
   *
   * \see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types
   */
  DndSimulatorDataTransfer.prototype.types = [];

  /*!
   * \brief Removes all data.
   *
   * \param format Optional: Only remove the data associated with this format.
   *
   * \see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/clearData
   */
  DndSimulatorDataTransfer.prototype.clearData = function (format) {
    if (format) {
      delete this.data[format];

      var index = this.types.indexOf(format);
      delete this.types[index];
      delete this.data[index];
    } else {
      this.data = {};
    }
  };

  /*!
   * \brief Sets the drag operation"s drag data to the specified data
   *          and type.
   *
   * \param format A string describing the data"s format.
   * \param data   The data to store (formatted according to the
   *                 specified format).
   *
   * \see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/setData
   */
  DndSimulatorDataTransfer.prototype.setData = function (format, data) {
    this.data[format] = data;
    this.items.push(data);
    this.types.push(format);
  };

  /*!
   * \brief Retrives drag dta for the specified type.
   *
   * \param format A string describing the type of data to retrieve.
   *
   * \returns The drag data for the specified type, otherwise an empty string.
   *
   * \see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/getData
   */
  DndSimulatorDataTransfer.prototype.getData = function (format) {
    if (format in this.data) {
      return this.data[format];
    }

    return '';
  };

  /*!
   * \brief Sets a custom image to be displayed during dragging.
   *
   * \param img         An image elment to use for the drag feedback image.
   * \param xOffset    A long indicating the horizontal offset within the image.
   * \param yOffset   A long indicating the veritcal offset within the image.
   */
  DndSimulatorDataTransfer.prototype.setDragImage = function (img, xOffset, yOffset) {
    /* since simulation doesn"t replicate the visual effects, there is
    no point in implementing this */
  };

  return {
    /*!
     * \brief Simulates dragging one element on top of the other.
     *
     * Specified elements can be CSS selectors.
     *
     * \param sourceElement The element to drag to the target element.
     * \param targetElement The element the source element should be
     *                        dragged to.
     */

    /** This function was modified by ericchase.
     * @param {Element|string|null} sourceElement - Element | querySelector string
     * @param {Element|string|null} targetElement - Element | querySelector string
     */
    simulate: function (sourceElement, targetElement) {
      /* if strings are specified, assume they are CSS selectors */
      if (typeof sourceElement == 'string') {
        sourceElement = document.querySelector(sourceElement);
      }

      if (typeof targetElement == 'string') {
        targetElement = document.querySelector(targetElement);
      }

      /// [Minor Modification] Added by ericchase:
      if (sourceElement && targetElement) {
      } else return;

      console.log('dragItem', sourceElement);
      console.log('dropTarget', targetElement);

      /* get the coordinates of both elements, note that
        left refers to X, and top to Y */
      var sourceCoordinates = sourceElement.getBoundingClientRect();
      var targetCoordinates = targetElement.getBoundingClientRect();

      /* simulate a mouse down event on the coordinates
        of the source element */
      var mouseDownEvent = this.createEvent('mousedown', {
        clientX: sourceCoordinates.left,
        clientY: sourceCoordinates.top,
      });

      sourceElement.dispatchEvent(mouseDownEvent);

      /* simulate a drag start event on the source element */
      var dragStartEvent = this.createEvent('dragstart', {
        clientX: sourceCoordinates.left,
        clientY: sourceCoordinates.top,
        dataTransfer: new DndSimulatorDataTransfer(),
      });

      sourceElement.dispatchEvent(dragStartEvent);

      /* simulate a drag event on the source element */
      var dragEvent = this.createEvent('drag', {
        clientX: sourceCoordinates.left,
        clientY: sourceCoordinates.top,
      });

      sourceElement.dispatchEvent(dragEvent);

      /* simulate a drag enter event on the target element */
      var dragEnterEvent = this.createEvent('dragenter', {
        clientX: targetCoordinates.left,
        clientY: targetCoordinates.top,
        dataTransfer: dragStartEvent.dataTransfer,
      });

      targetElement.dispatchEvent(dragEnterEvent);

      /* simulate a drag over event on the target element */
      var dragOverEvent = this.createEvent('dragover', {
        clientX: targetCoordinates.left,
        clientY: targetCoordinates.top,
        dataTransfer: dragStartEvent.dataTransfer,
      });

      targetElement.dispatchEvent(dragOverEvent);

      /* simulate a drop event on the target element */
      var dropEvent = this.createEvent('drop', {
        clientX: targetCoordinates.left,
        clientY: targetCoordinates.top,
        dataTransfer: dragStartEvent.dataTransfer,
      });

      targetElement.dispatchEvent(dropEvent);

      /* simulate a drag end event on the source element */
      var dragEndEvent = this.createEvent('dragend', {
        clientX: targetCoordinates.left,
        clientY: targetCoordinates.top,
        dataTransfer: dragStartEvent.dataTransfer,
      });

      sourceElement.dispatchEvent(dragEndEvent);

      /* simulate a mouseup event on the target element */
      var mouseUpEvent = this.createEvent('mouseup', {
        clientX: targetCoordinates.left,
        clientY: targetCoordinates.top,
      });

      targetElement.dispatchEvent(mouseUpEvent);
    },

    /*!
     * \brief Creates a new fake event ready to be dispatched.
     *
     * \param eventName The type of event to create.
     *                    For example: "mousedown".
     * \param options    Dictionary of options for this event.
     *
     * \returns An event ready for dispatching.
     */
    createEvent: function (eventName, options) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent(eventName, true, true, null);

      event.view = window;
      event.detail = 0;
      event.ctlrKey = false;
      event.altKey = false;
      event.shiftKey = false;
      event.metaKey = false;
      event.button = 0;
      event.relatedTarget = null;

      /* if the clientX and clientY options are specified,
        also calculated the desired screenX and screenY values */
      if (options.clientX && options.clientY) {
        event.screenX = window.screenX + options.clientX;
        event.screenY = window.screenY + options.clientY;
      }

      /* copy the rest of the options into
        the event object */
      for (var prop in options) {
        event[prop] = options[prop];
      }

      return event;
    },
  };
}

function log_call() {
  const stack = new Error().stack;
  const caller = stack?.split('\n')[2].trim();
  if (caller) console.log('>', caller);
}

//
//
//

let highlighter = /** @type{Highlighter|undefined} */ (undefined);

// content script

function BeforeUnloadHandler() {
  Highlighter.UpdateStatus('Ready');
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // This page was restored from the bfcache.
    console.log('%cThis page was restored from the bfcache.', 'color:red');
    if (highlighter) highlighter.stop();
  } else {
    // This page was loaded normally.
    console.log('%cThis page was loaded normally.', 'color:red');

    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      console.log('Received Message:', message);
      switch (message.action) {
        case 'getStatus': {
          sendResponse({ status: Highlighter.Status });
          break;
        }
        case 'startHighlighting': {
          window.addEventListener('beforeunload', BeforeUnloadHandler);
          if (highlighter) highlighter.stop();
          highlighter = new Highlighter(message.interval);
          highlighter.start();
          break;
        }
        case 'stopHighlighting': {
          window.removeEventListener('beforeunload', BeforeUnloadHandler);
          if (highlighter) highlighter.stop();
          else Highlighter.UpdateStatus('Ready');
          break;
        }
      }
    });
  }
});
