import type { WebRequest } from './ericchase/Platform/Browser/Extension/WebRequest.js';

export enum MessageAction {
  Edpuzzle_Answer = 'Edpuzzle_Answer', // ! unused
  Edpuzzle_GetAnswer = 'Edpuzzle_GetAnswer', // ! unused
  Edpuzzle_GetPageData = 'Edpuzzle_GetPageData',
  Edpuzzle_PageData = 'Edpuzzle_PageData',
  Edpuzzle_UnlockTimeline = 'Edpuzzle_UnlockTimeline',
}

export type Message =
  | {
      action: MessageAction.Edpuzzle_Answer;
      data: { answer: string };
    }
  | {
      action: MessageAction.Edpuzzle_GetAnswer;
      data: { question: string };
    }
  | {
      action: MessageAction.Edpuzzle_GetPageData;
    }
  | {
      action: MessageAction.Edpuzzle_PageData;
      data: { webRequest: WebRequest };
    }
  | {
      action: MessageAction.Edpuzzle_UnlockTimeline;
    };

export function Message<T extends Message['action']>(
  action: T,
  data: T extends MessageAction.Edpuzzle_Answer //
    ? { answer: string }
    : T extends MessageAction.Edpuzzle_GetAnswer
      ? { question: string }
      : T extends MessageAction.Edpuzzle_PageData
        ? { webRequest: WebRequest }
        : {},
): Extract<Message, { action: T }> {
  return { action, data } as Extract<Message, { action: T }>;
}
