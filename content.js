//TODO: unmock the server when done
// const BASE_URL = 'https://examripper-288287396080.herokuapp.com';
const BASE_URL = 'http://localhost:5500';

// const API_URLS = {
//   ask: BASE_URL + '/api/ask',
//   image: BASE_URL + '/api/image',
//   match_terms: BASE_URL + '/match-terms',
//   validate: BASE_URL + '/validate',
// };

const API_URLS = {
  checkbox: BASE_URL + '/checkbox',
  dragAndDrop: BASE_URL + '/drag-and-drop',
  freeResponse: BASE_URL + '/free-response',
  multipleChoice: BASE_URL + '/multiple-choice',
  unknown: BASE_URL + '/unknown',
  validate: BASE_URL + '/validate',
};

const NOTABLE_FUNCTIONS = () => {
  // don't call this function
  const highlighter = new Highlighter(0);
  highlighter.process;
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

/**
 * @typedef RequestData
 * @property {string} auth_token
 * @property {string=} quiz_title
 * @property {string=} imgdata
 * @property {string=} text
 * @property {string=} session_id
 * @property {boolean=} is_correct
 */

/**
 * @typedef ResponseData
 * @property {string} session_id
 * @property {string=} answer
 * @property {Record<string,string>=} answer_dictionary
 * @property {string[]=} answer_list
 */

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
    checkbox: 'checkbox',
    dragAndDrop: 'dragAndDrop',
    freeResponse: 'freeResponse',
    multipleChoice: 'multipleChoice',
    unknown: 'unknown',
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
    const question_type = this.getQuestionType(form);
    const quiz_title = this.findQuizTitle();

    console.log('question_type:', question_type);
    console.log('quiz_title:', quiz_title);

    const api_url = (function () {
      switch (question_type) {
        case Highlighter.Question_Type.checkbox:
          return API_URLS.checkbox;
        case Highlighter.Question_Type.dragAndDrop:
          return API_URLS.dragAndDrop;
        case Highlighter.Question_Type.freeResponse:
          return API_URLS.freeResponse;
        case Highlighter.Question_Type.multipleChoice:
          return API_URLS.multipleChoice;
      }
      return API_URLS.unknown;
    })();

    const api_response = await this.makeAPIRequest(api_url, quiz_title, {
      imgdata: await this.findImageData(form),
      text: this.findQuestionText(form),
    });

    const {
      session_id, //
      answer,
      answer_dictionary,
      answer_list,
    } = this.sanitizeServerResponseData(await api_response.json());

    console.log('api_response:', {
      session_id,
      answer,
      answer_dictionary,
      answer_list,
    });

    this.assertNotAborting();

    switch (question_type) {
      case Highlighter.Question_Type.checkbox:
        {
          if (answer_list === undefined) throw 'Missing `answer_list` from server response.';
          const labels = this.findMatchingLabels(form, answer_list);
          const inputs = labels.map(({ label }) => this.findCheckboxInputs(label)[0]);
          let found_count = 0;
          for (const input of inputs) {
            if (input) {
              found_count += 1;
              console.log('checking check box');
              input.click();
              await this.pause(this.action_interval);
            }
          }
          if (found_count === 0) {
            throw new ErrorNotFound(Highlighter.Question_Type.checkbox);
          }
        }
        break;
      case Highlighter.Question_Type.dragAndDrop:
        {
          if (answer_dictionary === undefined) throw 'Missing `answer_dictionary` from server response.';
          const kv_pairs = new KVPairs(answer_dictionary);
          const drag_items = this.findMatchingDragItems(form, kv_pairs.keys);
          const drop_targets = this.findMatchingDropTargets(form, kv_pairs.values);
          let found_count = 0;
          for (let i = 0; i < kv_pairs.length; i++) {
            const { value: key, drag_item } = drag_items[i];
            const { value, drop_target } = drop_targets[i];
            console.log(`${key}:${value}`, drag_item, drop_target);
            console.log('drag item:', drag_item);
            console.log('drop target:', drop_target);
            if (drag_item && drop_target) {
              found_count += 1;
              console.log('simulating drag and drop');
              DndSimulatorDataTransfer().simulate(drag_item, drop_target);
              await this.pause(this.action_interval);
            }
          }
          if (found_count === 0) {
            throw new ErrorNotFound(Highlighter.Question_Type.dragAndDrop);
          }
        }
        break;
      case Highlighter.Question_Type.freeResponse:
        {
          if (answer === undefined) throw 'Missing `answer` from server response.';
          const input = this.findFreeResponseInput(form);
          if (input) {
            console.log('writing in free response answer');
            input.value = answer;
            await this.pause(this.action_interval);
          } else {
            throw new ErrorNotFound(Highlighter.Question_Type.freeResponse);
          }
        }
        break;
      case Highlighter.Question_Type.multipleChoice:
        {
          if (answer === undefined) throw 'Missing `answer` from server response.';
          const label = this.findMatchingLabel(form, answer);
          const inputs = label ? this.findRadioInputs(label) : [];
          if (inputs[0]) {
            console.log('clicking multiple choice answer');
            inputs[0].click();
            await this.pause(this.action_interval);
          } else {
            throw new ErrorNotFound(Highlighter.Question_Type.multipleChoice);
          }
        }
        break;
    }

    await this.clickSubmitButton(form);

    // wait long enough for server to process text
    // should we wait for the Submit button's text to change?
    // ideally, we would wait for the form's html to change a bit
    await this.pause(1000);

    // send feedback to server
    const { is_correct } = this.findQuestionFeedback(form);
    if (is_correct !== undefined) {
      await this.makeAPIRequest(API_URLS.validate, quiz_title, { session_id, is_correct });
    } else {
      //TODO: there's really no other reliable way to check if the website is unresponsive
      if (this.findNextButton(form) === undefined && this.findViewSummaryButton(form) === undefined) {
        // just in case, we check to see if the submit button changed to the next button or the view summary button.
        // if not, i think we can safely say something is wrong with the page
        throw new ErrorNotFound('feedback');
      }
    }

    await this.clickNextButton(form);

    if (this.findViewSummaryButton(form)) {
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
        if (error instanceof ErrorNotFound) {
          console.log('ErrorNotFound:', error.message);
        } else if (error === 'Abort') {
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

  /**
 * @memberof Highlighter
 * @param {HTMLElement} element
 * @returns {Promise<number | undefined>} Returns a Promise that resolves to the last number found or undefined if not found.
 * this function just gets the number of questions on the quiz.
 */
  async findLastNumber(element) {
  log_call();

  // Using querySelector to select the first element with the class 'sia-question-number'
  const targetElement = element.querySelector('.sia-question-number');

  if (targetElement) {
    const content = targetElement.textContent;
    const match = content.match(/\d+$/);

    if (match) {
      const lastNumber = parseInt(match[0], 10);
      console.log(lastNumber); // Optional: log the number
      return lastNumber;
    }
  }

  return undefined;
  }

  /**
   * @param {string} api_url
   * @param {string|undefined} quiz_title
   * @param {Partial<RequestData>} data
   */
  async makeAPIRequest(api_url, quiz_title, data) {
    const auth_token = await getAuthToken();
    if (auth_token === null || auth_token === undefined) {
      throw 'AuthToken is undefined.';
    }
    /** @type {RequestData} */
    const request_data = {
      auth_token,
      quiz_title,
      imgdata: data.imgdata,
      text: data.text,
      session_id: data.session_id,
      is_correct: data.is_correct,
    };

    // remove keys that are undefined to save bandwidth
    for (const key of Object.keys(request_data)) {
      if (request_data[key] === undefined) {
        delete request_data[key];
      }
    }

    // ...specific_request_data,
    return await fetch(api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request_data),
    });
  }

  /**
   * @memberof Highlighter
   * @param {Partial<ResponseData>} response_data
   */
  sanitizeServerResponseData(response_data) {
    /** @type {ResponseData} */
    const sanitized_data = {
      session_id: '',
      answer: undefined,
      answer_dictionary: undefined,
      answer_list: undefined,
    };

    if (typeof response_data.session_id !== 'string' || response_data.session_id === '') {
      throw new ErrorNotFound('response_data.session_id');
    }
    sanitized_data.session_id = response_data.session_id;

    if (response_data.answer !== undefined && typeof response_data.answer === 'string') {
      sanitized_data.answer = response_data.answer;
    }

    if (response_data.answer_dictionary !== undefined && typeof response_data.answer_dictionary === 'object' && response_data.answer_dictionary !== null) {
      for (const [key, value] of Object.entries(response_data.answer_dictionary)) {
        if (typeof key !== 'string' || typeof value !== 'string') {
          throw new ErrorMalformed('response_data.session_id');
        }
      }
      sanitized_data.answer_dictionary = response_data.answer_dictionary;
    }

    if (response_data.answer_list !== undefined && Array.isArray(response_data.answer_list)) {
      for (const value of response_data.answer_list) {
        if (typeof value !== 'string') {
          throw new ErrorMalformed('response_data.answer_list');
        }
      }
      sanitized_data.answer_list = response_data.answer_list;
    }

    return sanitized_data;
  }

  /**
   * @memberof Highlighter
   * @param {HTMLFormElement} form
   */
  async clickSubmitButton(form) {
    this.assertNotAborting();
    const { matchedElement: submit_button } = new TextMatcher(this.findButtons(form), ['innerText', 'value'], ['Submit']).anyIncludesAny() ?? {};
    if (submit_button) {
      submit_button.click();
      await this.pause(this.action_interval);
    }
  }

  /**
   * @memberof Highlighter
   * @param {HTMLFormElement} form
   */
  async clickNextButton(form) {
    this.assertNotAborting();
    const next_button = this.findNextButton(form);
    if (next_button) {
      next_button.click();
      await this.pause(this.action_interval);
    }
  }

  // 'get' functions must return valid values or throw an error

  /** @param {HTMLFormElement} form */
  getQuestionType(form) {
    log_call();

    if (this.findCheckboxInputs(form).length > 0) return Highlighter.Question_Type.checkbox;
    if (this.findDragItems(form).length > 0) return Highlighter.Question_Type.dragAndDrop;
    if (this.findFreeResponseInput(form)) return Highlighter.Question_Type.freeResponse;
    if (this.findRadioInputs(form)) return Highlighter.Question_Type.multipleChoice;
    return Highlighter.Question_Type.unknown;
  }

  /** @memberof Highlighter */
  getNextUnansweredQuestionForm() {
    log_call();

    for (const form of document.querySelectorAll('form')) {
      if (this.findQuestionFeedback(form).is_correct !== undefined) {
        continue; // skip this form
      }
      const buttons = this.findButtons(form);
      if (buttons.length === 0) {
        continue; // skip this form
      }
      // buttons can be <button> or <input>, so check both 'innerText' and 'value' properties
      if (new TextMatcher(buttons, ['innerText', 'value'], ['Next Question', 'View Summary']).anyIncludesAny()) {
        continue; // skip this form
      }
      // search for "Question ... of"
      if (new InnerTextMatcher([form], ['Question', 'of']).anyIncludesEachInOrder()) {
        // search for "Submit" button
        if (new TextMatcher(buttons, ['innerText', 'value'], ['Submit']).anyIncludesAny()) {
          return form;
        }
      }
    }
    throw 'No unanswered questions found.';
  }

  // 'find' functions may return empty array or undefined

  /** @param {HTMLElement} parentElement */
  findButtons(parentElement) {
    log_call();

    const list = [];
    list.push(...parentElement.querySelectorAll('button'));
    for (const input of parentElement.querySelectorAll('input')) {
      if (input.type.toLowerCase() === 'button' || input.type.toLowerCase() === 'submit') {
        list.push(input);
      }
    }
    return list;
  }

  /** @param {HTMLElement} parentElement */
  findCheckboxInputs(parentElement) {
    log_call();

    const list = [];
    for (const input of parentElement.querySelectorAll('input')) {
      if (input.type.toLowerCase() === 'checkbox') {
        list.push(input);
      }
    }
    return list;
  }

  /** @param {HTMLElement} parentElement */
  findClosestDropTarget(parentElement) {
    log_call();

    const closest = parentElement.closest('kp-drop-target');
    if (closest instanceof HTMLElement) return closest;
    let current_element = parentElement;
    while (current_element.parentElement) {
      current_element = current_element.parentElement;
      const potential_targets = current_element.querySelectorAll('kp-drop-target');
      for (const potential_target of potential_targets) {
        if (potential_target instanceof HTMLElement) {
          return potential_target;
        }
      }
    }
    return undefined;
  }

  /** @param {HTMLElement} parentElement */
  findDragItems(parentElement) {
    log_call();

    const list = [];
    for (const element of parentElement.querySelectorAll('kp-drag-item')) {
      if (element instanceof HTMLElement) {
        list.push(element);
      }
    }
    return list;
  }

  /** @param {HTMLElement} parentElement */
  findDropLabels(parentElement) {
    log_call();

    const list = [];
    for (const element of parentElement.querySelectorAll('kp-drop-target-label')) {
      if (element instanceof HTMLElement) {
        list.push(element);
      }
    }
    return list;
  }

  /** @param {HTMLElement} parentElement */
  findFreeResponseInput(parentElement) {
    log_call();

    const input = parentElement.querySelector('input[data-placeholder="Answer here"]');
    if (input instanceof HTMLInputElement) {
      return input;
    }
    return undefined;
  }

  /**
   * @memberof Highlighter
   * @param {HTMLFormElement} form
   */
  async findImageData(form) {
    log_call();

    if (this.findImages(form).length > 0) {
      // @ts-ignore
      const canvas = await html2canvas(form, { useCORS: true, allowTaint: false });
      if (canvas instanceof HTMLCanvasElement) {
        const dataURL = canvas.toDataURL('image/png');
        if (dataURL !== '') {
          return dataURL;
        }
      }
    }
    return undefined;
  }

  /** @param {HTMLElement} parentElement */
  findImages(parentElement) {
    log_call();

    const list = [];
    list.push(...parentElement.querySelectorAll('img'));
    list.push(...parentElement.querySelectorAll('svg'));
    return list;
  }

  /**
   * @memberof Highlighter
   * @param {HTMLFormElement} form
   * @param {string} value
   */
  findMatchingLabel(form, value) {
    const { matchedElement: label } = new InnerTextMatcher([...form.querySelectorAll('label')], [value]).anyIncludesAny() ?? {};
    return label;
  }

  /**
   * @memberof Highlighter
   * @param {HTMLFormElement} form
   * @param {string[]} values
   */
  findMatchingLabels(form, values) {
    log_call();

    //TODO this is why TextMatcher needs to be refactored
    const list = [];
    const labels = [...form.querySelectorAll('label')];
    for (const value of values) {
      const { matchedElement: label } = new InnerTextMatcher(labels, [value]).anyIncludesAny() ?? {};
      if (label) {
        list.push({ value, label });
      }
    }
    return list;
  }

  /**
   * @memberof Highlighter
   * @param {HTMLElement} parentElement
   * @param {string[]} values
   */
  findMatchingDragItems(parentElement, values) {
    log_call();

    //TODO this is why TextMatcher needs to be refactored
    const list = [];
    const drag_items = this.findDragItems(parentElement);
    for (const value of values) {
      const { matchedElement: drag_item } = new InnerTextMatcher(drag_items, [value]).anyIncludesAny() ?? {};
      list.push({ value, drag_item });
    }
    return list;
  }

  /**
   * @memberof Highlighter
   * @param {HTMLElement} parentElement
   * @param {string[]} values
   */
  findMatchingDropTargets(parentElement, values) {
    log_call();

    //TODO this is why TextMatcher needs to be refactored
    const list = [];
    const drop_labels = this.findDropLabels(parentElement);
    for (const value of values) {
      const { matchedElement: drop_label } = new InnerTextMatcher(drop_labels, [value]).anyIncludesAny() ?? {};
      const drop_target = drop_label ? this.findClosestDropTarget(drop_label) : undefined;
      list.push({ value, drop_target });
    }
    return list;
  }

  /**
   * @memberof Highlighter
   * @param {HTMLElement} parentElement
   */
  findNextButton(parentElement) {
    const { matchedElement: next_button } = new TextMatcher(this.findButtons(parentElement), ['innerText', 'value'], ['Next Question']).anyIncludesAny() ?? {};
    return next_button;
  }

  /** @param {HTMLElement} parentElement */
  findQuestionFeedback(parentElement) {
    log_call();

    const element = parentElement.querySelector('kp-question-controls');
    if (element instanceof HTMLElement) {
      const { matchedText } = new InnerTextMatcher([element], ['Incorrect', 'Correct']).anyIncludesAny() ?? {};
      if (matchedText === 'correct') {
        return { is_correct: true };
      }
      if (matchedText === 'incorrect') {
        return { is_correct: false };
      }
    }
    return {};
  }

  /** @param {HTMLFormElement} form */
  findQuestionText(form) {
    log_call();

    const innerText = form.innerText.trim();
    if (innerText !== '') {
      return innerText;
    }
    return undefined;
  }

  findQuizTitle() {
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

  /** @param {HTMLElement} parentElement */
  findRadioInputs(parentElement) {
    log_call();

    const list = [];
    for (const input of parentElement.querySelectorAll('input')) {
      if (input.type.toLowerCase() === 'radio') {
        list.push(input);
      }
    }
    return list;
  }

  /**
   * @memberof Highlighter
   * @param {HTMLElement} parentElement
   */
  findViewSummaryButton(parentElement) {
    const { matchedElement } = new TextMatcher(this.findButtons(parentElement), ['innerText', 'value'], ['View Summary']).anyIncludesAny() ?? {};
    return matchedElement;
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
    return undefined;
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
    return undefined;
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
    return undefined;
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
    return false;
  }

  /**
   * @private
   * @memberof InnerTextMatcher
   * @param {string} property
   */
  includesEach(property) {
    for (const matchText of this.match_list) {
      const matchIndex = property.indexOf(matchText);
      if (matchIndex === -1) {
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

class KVPairs {
  /** @type {{key:string,value:any}[]} */
  data = [];
  /**
   * @memberof KVPairs
   * @param {*} o
   */
  constructor(o) {
    if (typeof o === 'object') {
      for (const [key, value] of Object.entries(o)) {
        this.data.push({ key, value });
      }
    }
  }
  get length() {
    return this.data.length;
  }
  get entries() {
    return this.data;
  }
  get keys() {
    return this.data.map(({ key }) => key);
  }
  get values() {
    return this.data.map(({ value }) => value);
  }
}

class ErrorMalformed extends Error {}
class ErrorNotFound extends Error {}

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
