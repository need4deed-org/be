export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export type SlackChannel = "ops";

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
