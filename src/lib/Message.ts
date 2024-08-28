import type { WebRequest } from './external/Platform/Browser/Extension/WebRequest.js';

export enum MessageAction {
  Edpuzzle_WebRequest = 'Edpuzzle_WebRequest',
  Edpuzzle_GetWebRequest = 'Edpuzzle_GetWebRequest',
  Edpuzzle_ClickToAnswer = 'Edpuzzle_ClickToAnswer',
  Edpuzzle_GetClickToAnswer = 'Edpuzzle_GetClickToAnswer',
  Edpuzzle_UnlockTimeline = 'Edpuzzle_UnlockTimeline',
  Edpuzzle_SubmitAllAnswers = 'Edpuzzle_SubmitAllAnswers',
}

export type Message =
  | { action: MessageAction.Edpuzzle_WebRequest; data: { webRequest: WebRequest } } //
  | { action: MessageAction.Edpuzzle_GetWebRequest }
  | { action: MessageAction.Edpuzzle_ClickToAnswer; data: { enabled: boolean } }
  | { action: MessageAction.Edpuzzle_GetClickToAnswer }
  | { action: MessageAction.Edpuzzle_UnlockTimeline }
  | { action: MessageAction.Edpuzzle_SubmitAllAnswers };

export function Message<T extends Message['action']>(
  action: T,
  data: T extends MessageAction.Edpuzzle_WebRequest //
    ? { webRequest: WebRequest }
    : T extends MessageAction.Edpuzzle_ClickToAnswer
      ? { enabled: boolean }
      : {},
): Extract<Message, { action: T }> {
  return { action, data } as Extract<Message, { action: T }>;
}
