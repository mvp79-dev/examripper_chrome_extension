import type { WebRequest } from './external/Platform/Browser/Extension/WebRequest.js';

export enum MessageAction {
  Edpuzzle_WebRequest = 'Edpuzzle_WebRequest',
  Edpuzzle_GetWebRequest = 'Edpuzzle_GetWebRequest',
  Edpuzzle_ClickToAnswer = 'Edpuzzle_ClickToAnswer',
  Edpuzzle_GetClickToAnswer = 'Edpuzzle_GetClickToAnswer',
  Edpuzzle_UnlockTimeline = 'Edpuzzle_UnlockTimeline',
  Edpuzzle_SubmitAllAnswers = 'Edpuzzle_SubmitAllAnswers',
  DocsAutoTyper_StartTyping = 'startTyping',
  DocsProgressTracker = 'updateProgress',
  DocsStopTyping = 'stopTyping',
  DocsPauseTyping = 'pauseTyping',
  DocsResumeTyping = 'resumeTyping',
  DocsSkipBreak = 'skipBreak',
  DocsStopBreak = 'stopBreak',
  GetOverlayContent = 'getOverlayContent',
}

export type Message =
  | { action: MessageAction.Edpuzzle_WebRequest; data: { webRequest: WebRequest } } //
  | { action: MessageAction.Edpuzzle_GetWebRequest }
  | { action: MessageAction.Edpuzzle_ClickToAnswer; data: { enabled: boolean } }
  | { action: MessageAction.Edpuzzle_GetClickToAnswer }
  | { action: MessageAction.Edpuzzle_UnlockTimeline }
  | { action: MessageAction.Edpuzzle_SubmitAllAnswers }
  | { action: MessageAction.DocsAutoTyper_StartTyping; data: { text: string; typingSpeed: number; mistakeRate: number; correctionSpeed: number; breakTime: number; breakInterval: number } }
  | { action: MessageAction.DocsProgressTracker; progress: number }
  | { action: MessageAction.DocsStopTyping }
  | { action: MessageAction.DocsPauseTyping }
  | { action: MessageAction.DocsResumeTyping };

export function Message<T extends Message['action']>(
  action: T,
  data: T extends MessageAction.Edpuzzle_WebRequest //
    ? { webRequest: WebRequest }
    : T extends MessageAction.Edpuzzle_ClickToAnswer
      ? { enabled: boolean }
      : T extends MessageAction.DocsAutoTyper_StartTyping
      ? { text: string; typingSpeed: number; mistakeRate: number; correctionSpeed: number; breakTime: number; breakInterval: number }
    : T extends MessageAction.DocsProgressTracker
      ? { progress: number }
      : {},
): Extract<Message, { action: T }> {
  return { action, data } as Extract<Message, { action: T }>;
}
