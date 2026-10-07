import type { EmailMessage, EmailTransport, SlackTransport } from "../types";

const HEADER = "Cron email, not sent";
const SECTION_LIMIT = 3000;
const MAX_BODY_SECTIONS = 47;

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

export function splitText(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
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
