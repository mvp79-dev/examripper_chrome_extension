import { Sleep } from '../lib/ericchase/Algorithm/Sleep.js';
import { CompoundSubscription, OptionalStore, Store } from '../lib/ericchase/Design Pattern/Observer/Store.js';
import { type WebRequest, RebuildAndSendRequest } from '../lib/ericchase/Platform/Browser/Extension/WebRequest.js';
import { ChildListObserver } from '../lib/ericchase/Platform/Web/DOM/MutationObserver/ChildList.js';
import { ElementAddedObserver } from '../lib/ericchase/Platform/Web/DOM/MutationObserver/ElementAdded.js';
import { Message, MessageAction } from '../lib/Message.js';

interface AssignmentData {
  _id: string;
  mediaId: string;
  teacherAssignmentId: string;
  timeIntervals: {
    date: string;
    views: number;
  }[];
}
interface Question {
  type: string;
  questionNumber: number;
  time: number;
  duration: number;
  body: {
    text: string;
    html: string;
    _id: string;
  }[];
  choices: {
    choiceNumber: number;
    body: {
      text: string;
      html: string;
      _id: string;
    }[];
    feedback: {
      text: string;
      html: string;
      _id: string;
    }[];
    isCorrect: boolean;
    _id: string;
  }[];
  createdBy: string;
  _id: string;
}

let isTimelineUnlocked = false;
let clickToAnswer = true;

const assignmentDataStore = new OptionalStore<AssignmentData>();
const edpuzzleVersion = new OptionalStore<string>();
const questionsStore = new OptionalStore<Question[]>();
const webRequestStore = new OptionalStore<WebRequest>();

async function onMessageHandler(message: Message) {
  try {
    switch (message.action) {
      case MessageAction.Edpuzzle_WebRequest:
        webRequestStore.set(message.data.webRequest);
        break;
      case MessageAction.Edpuzzle_UnlockTimeline:
        if (isTimelineUnlocked === false) {
          CompoundSubscription([assignmentDataStore, edpuzzleVersion], ([data, version], unsubscribe) => {
            if (data && version) {
              unsubscribe();
              unlockTimeline(data, version);
            }
          });
        }
        break;
      case MessageAction.Edpuzzle_ClickToAnswer:
        clickToAnswer = message.data.enabled;
        console.log('clickToAnswer:', clickToAnswer);
        break;
    }
  } catch (error) {
    console.error(error);
  }
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // This page was restored from the bfcache.
    console.log('%cThis page was restored from the bfcache.', 'color:red');
  } else {
    // This page was loaded normally.
    console.log('%cThis page was loaded normally.', 'color:red');

    injectScript_GetVersion();
    chrome.runtime.onMessage.addListener(onMessageHandler);
    chrome.runtime.sendMessage(Message(MessageAction.Edpuzzle_GetWebRequest, {}));
    webRequestStore.subscribe((webRequest) => {
      if (webRequest) getAssignmentData(webRequest);
    });
    assignmentDataStore.subscribe((data) => {
      if (data?.mediaId) getQuestions(data.mediaId);
    });
    questionsStore.subscribe((questions) => {
      if (questions) watchForQuestions();
    });
  }
});

// gets the Edpuzzle Version
function injectScript_GetVersion() {
  const script = document.createElement('script');
  script.async = false;
  script.src = chrome.runtime.getURL('web_accessible_resources/edpuzzle_inject.js');
  script.type = 'text/javascript';
  document.head.append(script);
  const observer = new ElementAddedObserver({
    selector: 'input#version',
  });
  observer.subscribe((input) => {
    if (input instanceof HTMLInputElement) {
      edpuzzleVersion.set(input.value);
      observer.disconnect();
    }
  });
}

async function getAssignmentData(webRequest: WebRequest, retryCount = 0) {
  if (retryCount > 5) {
    throw 'All requests for data failed.';
  }
  const response = await RebuildAndSendRequest(webRequest);
  if (response?.status === 200) {
    assignmentDataStore.set(await response.json());
  } else {
    await Sleep(500);
    await getAssignmentData(webRequest, retryCount + 1);
  }
}

// requires both the WebRequest and the Edpuzzle Version
async function unlockTimeline(data: AssignmentData, version: string) {
  if ((data.timeIntervals.at(-1)?.views ?? 0) > 0) {
    isTimelineUnlocked = true;
  } else {
    const csrf_response = await fetch('https://edpuzzle.com/api/v3/csrf');
    const csrf_body = await csrf_response.json();
    if (!csrf_body.CSRFToken) {
      throw 'Missing { CSRFToken }';
    }
    await fetch(`https://edpuzzle.com/api/v4/media_attempts/${data._id}/watch`, {
      method: 'POST',
      headers: {
        accept: 'application/json,text/plain,*/*',
        accept_language: 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'x-csrf-token': csrf_body.CSRFToken,
        'x-edpuzzle-referrer': `https://edpuzzle.com/assignments/${data.teacherAssignmentId}/watch`,
        'x-edpuzzle-web-version': version,
      },
      body: JSON.stringify({ timeIntervalNumber: 10 }),
    });
    window.location.reload();
  }
}

async function getQuestions(mediaId?: string) {
  if (!mediaId) {
    const assignmentId = new URL(window.location.href).pathname.split('/').at(-2);
    const assignments_response = await fetch(`https://edpuzzle.com/api/v3/assignments/${assignmentId}`);
    const assignments_data = await assignments_response.json();
    const { teacherAssignments } = assignments_data ?? {};
    if (!Array.isArray(teacherAssignments)) {
      throw 'Missing { teacherAssignments }';
    }
    const { contentId } = teacherAssignments[0];
    if (!contentId) {
      throw 'Missing { contentId }';
    }
    mediaId = contentId;
  }
  if (!mediaId) {
    throw 'Missing { mediaId }';
  }

  const media_response = await fetch(`https://edpuzzle.com/api/v3/media/${mediaId}`, {
    credentials: 'omit',
  });
  const media_data = await media_response.json();
  const { questions } = media_data ?? {};
  if (!Array.isArray(questions)) {
    throw 'Missing { questions }';
  }

  const questionToChoicesArray: Question[] = [];
  for (const question of questions) {
    questionToChoicesArray.push(question);
  }
  questionsStore.set((questions as Question[]).sort(({ time: a }, { time: b }) => a - b));
}

function watchForQuestions() {
  const childListObserver = new ChildListObserver({});
  childListObserver.subscribe((record) => {
    if (record.target instanceof Element && isVisible(record.target) && record.target && record.target.getAttribute('aria-label')?.startsWith('Question')) {
      addQuestionHeaderSection(record.target);
    }
    const treeWalker = document.createTreeWalker(record.target, NodeFilter.SHOW_ELEMENT);
    while (treeWalker.nextNode()) {
      if (treeWalker.currentNode instanceof Element && isVisible(treeWalker.currentNode) && treeWalker.currentNode.getAttribute('aria-label')?.startsWith('Question')) {
        addQuestionHeaderSection(treeWalker.currentNode);
      }
    }
  });
  const treeWalker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
  while (treeWalker.nextNode()) {
    if (treeWalker.currentNode instanceof Element && isVisible(treeWalker.currentNode) && treeWalker.currentNode.getAttribute('aria-label')?.startsWith('Question')) {
      addQuestionHeaderSection(treeWalker.currentNode);
    }
  }
}

const questionHeaderSectionSet = new Set<Element>();
function addQuestionHeaderSection(element: Element) {
  if (!questionHeaderSectionSet.has(element)) {
    questionHeaderSectionSet.add(element);
    addQuestionClickListeners(element);
  }
}
const questionData: {
  controller?: AbortController;
  questionHeaderSection?: HTMLElement;
  questionSection?: HTMLElement;
  questionText?: string;
} = {};
function addQuestionClickListeners(headerSection: Element) {
  questionData.controller?.abort(); // release old listeners?
  questionData.controller = new AbortController();
  if (headerSection instanceof HTMLElement) {
    questionData.questionHeaderSection = headerSection;
    headerSection.style.cursor = 'pointer';
    headerSection.addEventListener('click', onQuestionClickHandler, { signal: questionData.controller.signal });
  }
  for (const section of headerSection.nextElementSibling?.querySelectorAll('section') ?? []) {
    if (section.textContent !== '') {
      questionData.questionSection = section;
      questionData.questionText = section.textContent?.trim();
      section.style.cursor = 'pointer';
      section.addEventListener('click', onQuestionClickHandler, { signal: questionData.controller.signal });
    }
  }
}
function onQuestionClickHandler() {
  questionData.questionHeaderSection?.style.removeProperty('cursor');
  questionData.questionSection?.style.removeProperty('cursor');
  answerCurrentQuestion();
  questionData.controller?.abort();
}
function answerCurrentQuestion() {
  const questions = questionsStore.value;
  if (!questions) return;
  if (!(questionData.questionHeaderSection && questionData.questionText)) return;
  const choicesSection = questionData.questionHeaderSection.parentElement?.nextElementSibling?.firstElementChild;
  if (!(choicesSection?.tagName === 'SECTION')) return;

  // console.log(`Looking for Question Text "${questionData.questionText}"`);
  for (const question of questions) {
    const parsedQuestion = parseQuestion(question);
    // console.log({ question });
    // console.log({ parsedQuestion });

    // console.log(questionData.questionText, '===', parsedQuestion.Html);
    // console.log(questionData.questionText, '===', parsedQuestion.Text);
    // console.log(questionData.questionText === parsedQuestion.Html || questionData.questionText === parsedQuestion.Text);
    if (questionData.questionText === parsedQuestion.Html || questionData.questionText === parsedQuestion.Text) {
      const treeWalker = document.createTreeWalker(choicesSection, NodeFilter.SHOW_ELEMENT);
      while (treeWalker.nextNode()) {
        if (treeWalker.currentNode instanceof HTMLParagraphElement) {
          if (treeWalker.parentNode()) {
            const choiceText = treeWalker.currentNode.textContent?.trim();
            for (const choice of parsedQuestion.Choices) {
              // console.log(choiceText, '===', choice.Html);
              // console.log(choiceText, '===', choice.Text);
              if (choiceText === choice.Html || choiceText === choice.Text) {
                // console.log(`isCorrect: ${choice.IsCorrect}`);
                if (choice.IsCorrect) {
                  treeWalker.currentNode.click();
                  // console.log('clicked');
                }
              }
            }
            treeWalker.lastChild();
          }
        }
      }
    }
  }
}

const domParser = new DOMParser();
function parseQuestion(question: Question) {
  const questionHtml = domParser.parseFromString(question.body[0].html ?? '', 'text/html').documentElement.textContent?.trim();
  const questionText = question.body[0].text ?? '';
  const Choices = [];
  for (const choice of question.choices) {
    const choiceHtml = domParser.parseFromString(choice.body[0].html ?? '', 'text/html').documentElement.textContent?.trim();
    const choiceText = choice.body[0].text ?? '';
    Choices.push({
      Html: choiceHtml !== '' ? choiceHtml : undefined,
      IsCorrect: choice.isCorrect,
      Number: choice.choiceNumber,
      Text: choiceText !== '' ? choiceText : undefined,
    });
  }
  return {
    Choices,
    Html: questionHtml !== '' ? questionHtml : undefined,
    Text: questionText !== '' ? questionText : undefined,
    Type: question.type,
  };
}

function isVisible(element: Element) {
  const { width, height } = element.getBoundingClientRect();
  return !(width === 0 && height === 0);
}

// function postAllAnswers(csrf, assignment, remainingQuestions, attemptId, total) {
//   var id = assignment.teacherAssignments[0]._id;
//   var referrer = "https://edpuzzle.com/assignments/"+id+"/watch";
//   var answersURL = "https://edpuzzle.com/api/v3/attempts/"+attemptId+"/answers";

//   var content = {answers: []};
//   var now = new Date().toISOString();
//   var questionsPart = remainingQuestions.shift();
//   for (let i=0; i<questionsPart.length; i++) {
//     let question = questionsPart[i];
//     let correctChoices = [];
//     for (let j=0; j<question.choices.length; j++) {
//       let choice = question.choices[j];
//       if (choice.isCorrect) {
//         correctChoices.push(choice._id)
//       }
//     }
//     content.answers.push({
//       "questionId": question._id,
//       "choices": correctChoices,
//       "type": "multiple-choice",
//     });
//   }

//   var headers = [
//     ['accept', 'application/json, text/plain, */*'],
//     ['accept_language', 'en-US,en;q=0.9'],
//     ['content-type', 'application/json'],
//     ['x-csrf-token', csrf],
//     ['x-edpuzzle-referrer', referrer],
//     ['x-edpuzzle-web-version', opener.__EDPUZZLE_DATA__.version]
//   ];
//   httpGet(answersURL, function() {
//     if (remainingQuestions.length == 0) {
//       button.value = "Answers submitted successfully.";
//       opener.location.reload();
//     }
//     else {
//       button.value = `Posting answers... (${total-remainingQuestions.length+1}/${total})`;
//       postAllAnswers(csrf, assignment, remainingQuestions, attemptId, total);
//     }
//   }, headers, "POST", JSON.stringify(content));
// }
