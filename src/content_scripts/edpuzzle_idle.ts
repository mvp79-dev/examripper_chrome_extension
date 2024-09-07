import { Sleep } from '../lib/external/Algorithm/Sleep.js';
import { Const, Optional } from '../lib/external/Design Pattern/Observer/Store.js';
import { type WebRequest, RebuildAndSendRequest } from '../lib/external/Platform/Browser/Extension/WebRequest.js';
import { ChildListObserver } from '../lib/external/Platform/Web/DOM/MutationObserver/ChildList.js';
import { ElementAddedObserver } from '../lib/external/Platform/Web/DOM/MutationObserver/ElementAdded.js';
import { Message, MessageAction } from '../lib/Message.js';

interface AssignmentData {
  medias?: { questions: Question[] }[];
  // extras added in
  privacy?: 'public' | 'private';
}
interface AssignmentAttemptData {
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
    public textElement: HTMLElement,
    public text: string,
    public answerSection: HTMLElement,
  ) {
    textElement.style.setProperty('cursor', 'pointer');
    textElement.addEventListener('click', this.handler);
  }
  public cleanup() {
    this.textElement.style.removeProperty('cursor');
    this.textElement.removeEventListener('click', this.handler);
  }
  private handler = () => {
    // console.log('paragraph clicked:', this.textElement);
    markCorrectAnswers(this);
  };
}

let timelineUnlocked = false;

const assignment_data = new Const<AssignmentData>();
const assignment_attempt_data = new Const<AssignmentAttemptData>();
const assignment_attempt_webrequest = new Const<WebRequest>();
const edpuzzle_version = new Const<string>();
const questions_array = new Const<Question[]>();

const click_to_answer = new Optional<boolean>();
const questionObserver_unsubscribe = new Optional<() => void>();
const questionHeaderToSection_map = new Map<Element, QuestionSection>();

const domParser = new DOMParser();

async function onMessageHandler(message: Message) {
  try {
    switch (message.action) {
      case MessageAction.Edpuzzle_WebRequest:
        assignment_attempt_webrequest.set(message.data.webRequest);
        break;
      case MessageAction.Edpuzzle_UnlockTimeline:
        unlockTimeline(await assignment_attempt_data.get(), await edpuzzle_version.get());
        break;
      case MessageAction.Edpuzzle_ClickToAnswer:
        click_to_answer.set(message.data.enabled);
        break;
      case MessageAction.Edpuzzle_SubmitAllAnswers:
        submitAllAnswers(await assignment_attempt_data.get(), await edpuzzle_version.get());
        break;
    }
  } catch (error) {
    console.error(error);
  }
}

async function onInit() {
  try {
    await getAssignmentData(await assignment_attempt_webrequest.get());
    await getAssignmentAttemptData(await assignment_attempt_webrequest.get());
    await getQuestions((await assignment_attempt_data.get()).mediaId);
    click_to_answer.subscribe((enabled) => {
      if (enabled === true) {
        setupQuestionObserver();
      } else {
        cleanupQuestionObserver();
      }
    });
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

    getVersion();
    injectVideoSpeedFeature();
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
  script.src = chrome.runtime.getURL('web_accessible_resources/edpuzzle_inject_version.js');
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

// video speed feature
function injectVideoSpeedFeature(): void {
  const script = document.createElement('script');
  script.async = false;
  script.src = chrome.runtime.getURL('web_accessible_resources/edpuzzle_inject_video_speed.js');
  script.type = 'text/javascript';
  document.head.append(script);
}

async function getAssignmentData(webRequest: WebRequest, retryCount = 0): Promise<void> {
  if (retryCount > 5) {
    throw 'All requests for data failed.';
  }
  // clone the WebRequest data and change url
  const assignment_webrequest: WebRequest = {};
  if (webRequest.bodyDetails) {
    assignment_webrequest.bodyDetails = { ...webRequest.bodyDetails };
    assignment_webrequest.bodyDetails.url = webRequest.bodyDetails.url.replace('/attempt?type=media', '');
  }
  if (webRequest.headersDetails) {
    assignment_webrequest.headersDetails = { ...webRequest.headersDetails };
    assignment_webrequest.headersDetails.url = webRequest.headersDetails.url.replace('/attempt?type=media', '');
  }
  const response = await RebuildAndSendRequest(assignment_webrequest);
  if (response?.status === 200) {
    assignment_data.set(await response.json());
    // console.log(assignment_webrequest.bodyDetails?.url ?? assignment_webrequest.headersDetails?.url ?? '???');
    // console.log(await assignment_data.get());
  } else {
    await Sleep(500);
    await getAssignmentData(webRequest, retryCount + 1);
  }
}

async function getAssignmentAttemptData(webRequest: WebRequest, retryCount = 0): Promise<void> {
  if (retryCount > 5) {
    throw 'All requests for data failed.';
  }
  const response = await RebuildAndSendRequest(webRequest);
  if (response?.status === 200) {
    assignment_attempt_data.set(await response.json());
    // console.log(webRequest.bodyDetails?.url ?? webRequest.headersDetails?.url ?? '???');
    // console.log(await assignment_attempt_data.get());
  } else {
    await Sleep(500);
    await getAssignmentAttemptData(webRequest, retryCount + 1);
  }
}

async function getQuestions(mediaId?: string): Promise<void> {
  // if (!mediaId) // need to get privacy information anyways
  {
    const assignmentId = new URL(window.location.href).pathname.split('/').at(-2);
    const assignments_response = await fetch(`https://edpuzzle.com/api/v3/assignments/${assignmentId}`);
    const assignments_data = await assignments_response.json();
    const { teacherAssignments, medias } = assignments_data ?? {};
    // console.log({ teacherAssignments, medias });
    if (!Array.isArray(teacherAssignments)) {
      throw 'Missing { teacherAssignments }';
    }
    if (Array.isArray(medias)) {
      (await assignment_data.get()).privacy = medias[0].privacy;
    } else {
      console.error('warning: could not determine if assignment is public or private. defaulting to private');
      (await assignment_data.get()).privacy = 'private';
    }
    const { contentId } = teacherAssignments[0];
    if (!contentId) {
      throw 'Missing { contentId }';
    }
    if (mediaId !== contentId) {
      console.error('warning: mediaId not equal to contentId. not sure what this could mean');
      mediaId = contentId;
    }
  }
  if (!mediaId) {
    throw 'Missing { mediaId }';
  }

  const media_response = await fetch(`https://edpuzzle.com/api/v3/media/${mediaId}`, {
    credentials: 'omit',
  });
  const media_data = await media_response.json();
  let { questions } = media_data ?? {};
  if (!Array.isArray(questions)) {
    // throw 'Missing { questions }';
    // console.log('Could not get questions with answers. Using original questions data.');
    questions = (await assignment_data.get()).medias?.[0].questions;
  }

  const questionToChoicesArray: Question[] = [];
  for (const question of questions) {
    questionToChoicesArray.push(question);
  }
  questions_array.set((questions as Question[]).sort(({ time: a }, { time: b }) => a - b));
}

async function unlockTimeline(data: AssignmentAttemptData, version: string): Promise<void> {
  if (timelineUnlocked || (data.timeIntervals.at(-1)?.views ?? 0) > 0) {
    timelineUnlocked = true;
    // console.log('Already Unlocked');
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

// Answering Questions

async function setupQuestionObserver() {
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
        const textElement = questionParagraph.parentElement;
        if (textElement) {
          const text = textElement.textContent?.trim() ?? '';
          if (text !== '') {
            questionHeaderToSection_map.set(headerSection, new QuestionSection(textElement, text, answerSection));
            // console.log('questionSection added');
            return;
          }
        }
      }
      // console.log('questionText not found');
    }
  }
}
async function cleanupQuestionObserver() {
  (await questionObserver_unsubscribe.get())?.();
  questionObserver_unsubscribe.set(undefined);
  for (const [, section] of questionHeaderToSection_map) {
    section.cleanup();
  }
  questionHeaderToSection_map.clear();
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
async function markCorrectAnswers(questionSection: QuestionSection) {
  // console.log('questions_array:', questions_array);
  const questions = await questions_array.get();
  if (!questions) return;

  /** // TODO
   * Some questions can have the exact same question text. It stands to follow
   * that some questions can have both the same question text AND choices. All
   * of these have unique IDs, but these IDs are not included with the HTML of
   * either questions or answers. This isn't an issue when posting answers
   * programmatically, but it is a definite challenge when marking the correct
   * answer choices during user interaction.
   *
   * The only potential workaround I can think of is to match the question's
   * `time` property to the `currentTime` property of the video element. They
   * seem to be exact matches. The video element resides in an iframe, so
   * accessing it will pose another difficult challenge.
   */

  //  console.log(`Looking for Question Text "${questionSection.text}"`);
  for (const question of questions) {
    // console.log({ question });
    const parsedQuestion = parseQuestion(question);
    //  console.log({ parsedQuestion });

    //  console.log(questionSection.text, '===', parsedQuestion.Html);
    //  console.log(questionSection.text, '===', parsedQuestion.Text);
    //  console.log(questionSection.text === parsedQuestion.Html || questionSection.text === parsedQuestion.Text);
    if (questionSection.text === parsedQuestion.Html || questionSection.text === parsedQuestion.Text) {
      // console.log({ question_text: questionSection.text });
      // TODO: after confirming the question and answers, send to AI server
      const treeWalker = document.createTreeWalker(questionSection.answerSection, NodeFilter.SHOW_ELEMENT);
      while (treeWalker.nextNode()) {
        if (treeWalker.currentNode instanceof HTMLParagraphElement) {
          if (treeWalker.parentNode()) {
            const choiceText = treeWalker.currentNode.textContent?.trim();
            for (const choice of parsedQuestion.Choices) {
              //  console.log(choiceText, '===', choice.Html);
              //  console.log(choiceText, '===', choice.Text);
              if (choiceText === choice.Html || choiceText === choice.Text) {
                //  console.log(`isCorrect: ${choice.IsCorrect}`);
                if (choice.IsCorrect) {
                  treeWalker.currentNode.click();
                  //  console.log('clicked');
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

async function submitAllAnswers(data: AssignmentAttemptData, version: string): Promise<void> {
  // find out which questions have already been answered
  const attempt_response = await fetch(`https://edpuzzle.com/api/v3/assignments/${data.teacherAssignmentId}/attempt`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.5',
      'x-edpuzzle-web-version': version,
      'x-edpuzzle-referrer': `https://edpuzzle.com/assignments/${data.teacherAssignmentId}/watch`,
    },
  });
  const attempt_body = await attempt_response.json();
  const answered_question_ids = new Set<string>();
  for (const answer of attempt_body.answers) {
    answered_question_ids.add(answer.questionId);
  }

  // answer remaining questions
  for (const question of await questions_array.get()) {
    if (!answered_question_ids.has(question._id)) {
      const csrf_response = await fetch('https://edpuzzle.com/api/v3/csrf');
      const csrf_body = await csrf_response.json();
      if (!csrf_body.CSRFToken) {
        throw 'Missing { CSRFToken }';
      }
      await fetch(`https://edpuzzle.com/api/v3/attempts/${data._id}/answers`, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/json',
          'x-edpuzzle-web-version': version,
          'x-edpuzzle-referrer': `https://edpuzzle.com/assignments/${data.teacherAssignmentId}/watch`,
          'x-csrf-token': csrf_body.CSRFToken,
        },
        body: JSON.stringify({
          answers: [
            {
              type: question.type, //
              questionId: question._id,
              choices: question.choices.filter((_) => _.isCorrect).map((_) => _._id),
            },
          ],
        }),
        method: 'POST',
      });
      await Sleep(500);
    }
  }
}
