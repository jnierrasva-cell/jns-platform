import type { ActionHandler } from "@/lib/workflows/types";
import { taskCreateAction } from "./task-create";
import { contactUpsertAction } from "./contact-upsert";
import { emailSendTemplateAction } from "./email-send-template";
import { smsSendAction } from "./sms-send";
import { contactAddNoteAction } from "./contact-add-note";
import { pipelineSetStageAction } from "./pipeline-set-stage";

const handlers: ActionHandler[] = [
  taskCreateAction,
  contactUpsertAction,
  emailSendTemplateAction,
  smsSendAction,
  contactAddNoteAction,
  pipelineSetStageAction,
];

const byKey = new Map(handlers.map((h) => [h.key, h]));

export function getAction(key: string): ActionHandler | undefined {
  return byKey.get(key);
}

export function listActions(): ActionHandler[] {
  return [...handlers];
}
