import { EMAIL_NOTE_MAX_LENGTH } from "need4deed-sdk";

export const emailNoteSchema = {
  $id: "EmailNote",
  type: "string",
  maxLength: EMAIL_NOTE_MAX_LENGTH,
};
