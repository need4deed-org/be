import logger from "../../../logger";
import type { EmailMessage, EmailTransport } from "../types";
import { validateEmailMessage } from "../validate-email-message";

function formatReport(msg: EmailMessage, problems: string[]): string {
  const to = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
  const cc = msg.cc
    ? Array.isArray(msg.cc)
      ? msg.cc.join(", ")
      : msg.cc
    : undefined;

  return [
    "An outbound email was suspended because it failed content validation:",
    "",
    ...problems.map((p) => `- ${p}`),
    "",
    "--- Original message ---",
    `From: ${msg.from ?? "(default)"}`,
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: ${msg.subject}`,
    "",
    "Text:",
    msg.text ?? "(none)",
    ...(msg.html !== undefined ? ["", "Html:", msg.html] : []),
  ].join("\n");
}

/**
 * Validates a computed EmailMessage before handing it to the real transport.
 * On failure, suspends the send and instead reports the full original
 * message + the problems found to `errorRecipient`, via `errorTransport`
 * rather than `deliverable` — this is an internal engineering alert, not
 * end-user-facing content, so it must always actually reach someone
 * regardless of dry-run config (pass the transport's real underlying SMTP
 * client here, not a dry-run-wrapped one).
 */
export class ValidatingEmailTransport implements EmailTransport {
  constructor(
    private readonly deliverable: EmailTransport,
    private readonly errorTransport: EmailTransport,
    private readonly errorRecipient: string,
  ) {}

  async send(msg: EmailMessage): Promise<void> {
    const problems = validateEmailMessage(msg);
    if (problems.length === 0) {
      await this.deliverable.send(msg);
      return;
    }

    const to = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
    logger.error(
      `[notify] suspended invalid outbound email (to: ${to}): ${problems.join("; ")}`,
    );

    await this.errorTransport.send({
      to: this.errorRecipient,
      from: msg.from,
      subject: `[Suspended invalid email] ${msg.subject || "(no subject)"}`,
      text: formatReport(msg, problems),
    });
  }
}
