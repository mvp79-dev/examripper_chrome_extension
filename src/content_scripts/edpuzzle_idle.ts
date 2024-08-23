import { Sleep } from '../lib/ericchase/Algorithm/Sleep.js';
import { Once, Optional } from '../lib/ericchase/Design Pattern/Observer/Store.js';
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

class QuestionSection {
  constructor(
    public paragraph: HTMLParagraphElement,
    public text: string,
    public answerSection: HTMLElement,
  ) {
    paragraph.style.setProperty('cursor', 'pointer');
    paragraph.addEventListener('click', this.handler);
  }
  public cleanup() {
    this.paragraph.style.removeProperty('cursor');
    this.paragraph.removeEventListener('click', this.handler);
  }
  private handler = () => {
    console.log('paragraph clicked:', this.paragraph);
    answerQuestion(this);
  };
}

let timelineUnlocked = false;

const assignment_data = new Once<AssignmentData>();
const edpuzzle_version = new Once<string>();
const page_webrequest = new Once<WebRequest>();
const questions_array = new Once<Question[]>();

const click_to_answer = new Optional<boolean>();
const questionObserver_unsubscribe = new Optional<() => void>();
const questionHeaderToSection_map = new Map<Element, QuestionSection>();

const domParser = new DOMParser();

async function onMessageHandler(message: Message) {
  try {
    switch (message.action) {
      case MessageAction.Edpuzzle_WebRequest:
        page_webrequest.set(message.data.webRequest);
        break;
      case MessageAction.Edpuzzle_UnlockTimeline:
        unlockTimeline(await assignment_data.get(), await edpuzzle_version.get());
        break;
      case MessageAction.Edpuzzle_ClickToAnswer:
        click_to_answer.set(message.data.enabled);
        break;
    }
  } catch (error) {
    console.log(error);
  }
}

async function onInit() {
  try {
    await getAssignmentData(await page_webrequest.get());
    await getQuestions((await assignment_data.get()).mediaId);
    click_to_answer.subscribe((enabled) => {
      console.log('click_to_answer:', enabled);
      if (enabled === true) {
        setupQuestionObserver();
      } else {
        cleanupQuestionObserver();
      }
    });
  } catch (error) {
    console.log(error);
  }
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // This page was restored from the bfcache.
    console.log('%cThis page was restored from the bfcache.', 'color:red');
  } else {
    // This page was loaded normally.
    console.log('%cThis page was loaded normally.', 'color:red');

    getVersion();
    chrome.runtime.onMessage.addListener(onMessageHandler);
    chrome.runtime.sendMessage(Message(MessageAction.Edpuzzle_GetWebRequest, {}));
    chrome.runtime.sendMessage(Message(MessageAction.Edpuzzle_GetClickToAnswer, {}));
    onInit();
  }
});

// gets the Edpuzzle Version
function getVersion(): void {
  const script = document.createElement('script');
  script.async = false;
  script.src = chrome.runtime.getURL('web_accessible_resources/edpuzzle_inject.js');
  script.type = 'text/javascript';
  document.head.append(script);
  const observer = new ElementAddedObserver({
    selector: 'input#edpuzzle_version',
  });
  observer.subscribe((input) => {
    if (input instanceof HTMLInputElement) {
      observer.disconnect();
      edpuzzle_version.set(input.value);
    }
  });
}

async function getAssignmentData(webRequest: WebRequest, retryCount = 0): Promise<void> {
  if (retryCount > 5) {
    throw 'All requests for data failed.';
  }
  const response = await RebuildAndSendRequest(webRequest);
  if (response?.status === 200) {
    assignment_data.set(await response.json());
  } else {
    await Sleep(500);
    await getAssignmentData(webRequest, retryCount + 1);
  }
}

async function getQuestions(mediaId?: string): Promise<void> {
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
  questions_array.set((questions as Question[]).sort(({ time: a }, { time: b }) => a - b));
}

async function unlockTimeline(data: AssignmentData, version: string): Promise<void> {
  if (timelineUnlocked || (data.timeIntervals.at(-1)?.views ?? 0) > 0) {
    timelineUnlocked = true;
    console.log('Already Unlocked');
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

async function setupQuestionObserver() {
  console.log('setupQuestionObserver');
  if ((await questionObserver_unsubscribe.get()) === undefined) {
    questionObserver_unsubscribe.set(
      new ChildListObserver({}).subscribe((record) => {
        tryAddQuestionSection(record.target);
        const treeWalker = document.createTreeWalker(record.target, NodeFilter.SHOW_ELEMENT);
        while (treeWalker.nextNode()) {
          tryAddQuestionSection(treeWalker.currentNode);
        }
      }),
    );
    for (const element of document.querySelectorAll("section[aria-label^='Question']")) {
      tryAddQuestionSection(element);
    }
  }
}
function tryAddQuestionSection(headerSection: Node) {
  if (headerSection instanceof HTMLElement && headerSection.matches("section[aria-label^='Question']")) {
    console.log('tryAddQuestionSection', { headerSection });
    if (!questionHeaderToSection_map.has(headerSection)) {
      const header = headerSection.parentElement;
      if (!(header instanceof HTMLElement && header.tagName === 'HEADER')) {
        // console.log('header not found');
        return;
      }
      const answerSection = header.nextElementSibling?.firstElementChild;
      if (!(answerSection instanceof HTMLElement && answerSection.tagName === 'SECTION')) {
        // console.log('answerSection not found');
        return;
      }
      for (const questionParagraph of header.querySelectorAll('p')) {
        const questionText = questionParagraph.textContent?.trim() ?? '';
        if (questionText !== '') {
          questionHeaderToSection_map.set(headerSection, new QuestionSection(questionParagraph, questionText, answerSection));
          // console.log('questionSection added');
          return;
        }
      }
      // console.log('questionText not found');
    }
  }
}
async function cleanupQuestionObserver() {
  console.log('cleanupQuestionObserver');
  (await questionObserver_unsubscribe.get())?.();
  questionObserver_unsubscribe.set(undefined);
  for (const [, section] of questionHeaderToSection_map) {
    section.cleanup();
  }
  questionHeaderToSection_map.clear();
}
async function answerQuestion(questionSection: QuestionSection) {
  // console.log('answerQuestion', { questions_array });
  const questions = await questions_array.get();
  if (!questions) return;

  // console.log(`Looking for Question Text "${questionSection.text}"`);
  for (const question of questions) {
    const parsedQuestion = parseQuestion(question);
    // console.log({ question });
    // console.log({ parsedQuestion });

    // console.log(questionSection.text, '===', parsedQuestion.Html);
    // console.log(questionSection.text, '===', parsedQuestion.Text);
    // console.log(questionSection.text === parsedQuestion.Html || questionSection.text === parsedQuestion.Text);
    if (questionSection.text === parsedQuestion.Html || questionSection.text === parsedQuestion.Text) {
      const treeWalker = document.createTreeWalker(questionSection.answerSection, NodeFilter.SHOW_ELEMENT);
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
      return;
    }
  }
}
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
