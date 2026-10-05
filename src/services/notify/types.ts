export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

// "cron": #cron-notifications (C0C3A594KHT), where the cron jobs' emails are
// posted for coordinators instead of being sent (be#1088).
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
