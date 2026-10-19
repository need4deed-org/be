export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  replyTo?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export type SlackChannel = "ops" | "comments" | "cron";

export interface SlackMessage {
  channel: SlackChannel;
  text: string;
  blocks?: unknown[];
}

export interface EmailTransport {
  send(msg: EmailMessage): Promise<void>;
}

export interface SlackTransport {
  send(msg: SlackMessage): Promise<void>;
}
