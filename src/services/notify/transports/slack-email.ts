import type { EmailMessage, EmailTransport, SlackTransport } from "../types";

const HEADER = "Cron email, not sent";
// Slack's limit for a section's text.
const SECTION_LIMIT = 3000;
// Slack allows 50 blocks per message: header, fields and the body.
const MAX_BODY_SECTIONS = 47;

/**
 * An EmailTransport that posts the finished email to Slack #cron-notifications
 * instead of sending it (be#1088): coordinators see what the cron jobs would
 * have emailed. Wraps the notify plugin's Slack transport, so
 * NOTIFY_SLACK_DRY_RUN applies; it never sends an email, not even an error
 * one.
 *
 * The message's `text` (the notification preview, and what the dry-run
 * transport logs) is a fixed header: subjects and bodies can name people.
 */
export class SlackEmailTransport implements EmailTransport {
  constructor(private readonly slack: SlackTransport) {}

  async send(msg: EmailMessage): Promise<void> {
    await this.slack.send({
      channel: "cron",
      text: HEADER,
      blocks: emailBlocks(msg),
    });
  }
}

export function emailBlocks(msg: EmailMessage): unknown[] {
  const fields = [
    field("To", list(msg.to)),
    ...(msg.cc ? [field("Cc", list(msg.cc))] : []),
    field("Subject", msg.subject),
  ];
  const body = msg.text?.trim() || htmlToText(msg.html ?? "") || "(no body)";
  return [
    { type: "header", text: { type: "plain_text", text: HEADER } },
    { type: "section", fields },
    ...bodySections(body),
  ];
}

function list(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

function field(label: string, value: string) {
  return { type: "mrkdwn", text: `*${label}*\n${escapeMrkdwn(value)}` };
}

// The three characters Slack's mrkdwn treats as control characters.
function escapeMrkdwn(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function bodySections(body: string): unknown[] {
  const chunks = splitText(body, SECTION_LIMIT);
  if (chunks.length > MAX_BODY_SECTIONS) {
    chunks.length = MAX_BODY_SECTIONS;
    chunks[MAX_BODY_SECTIONS - 1] += "\n… (truncated)";
  }
  return chunks.map((chunk) => ({
    type: "section",
    text: { type: "plain_text", text: chunk },
  }));
}

/**
 * Splits `text` into chunks of at most `limit` characters, at a line break
 * where there is one in the chunk's second half.
 */
export function splitText(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    // Room for the truncation marker bodySections may append.
    const window = rest.slice(0, limit - 20);
    const lineBreak = window.lastIndexOf("\n");
    const cut = lineBreak > window.length / 2 ? lineBreak : window.length;
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  if (rest) {
    chunks.push(rest);
  }
  return chunks;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/** The text of an email's HTML: block ends become line breaks, tags go. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
