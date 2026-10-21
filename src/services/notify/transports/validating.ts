import logger from "../../../logger";
import { errorName } from "../../utils";
import type { EmailMessage, EmailTransport } from "../types";
import { validateEmailMessage } from "../validate-email-message";

function joinAddresses(addresses: string | string[] | undefined) {
  return Array.isArray(addresses) ? addresses.join(", ") : addresses;
}

function formatReport(msg: EmailMessage, problems: string[]): string {
  const to = joinAddresses(msg.to);
  const cc = joinAddresses(msg.cc);
  const replyTo = joinAddresses(msg.replyTo);
  const attachments = msg.attachments?.map((a) => a.filename).join(", ");

  return [
    "An outbound email was suspended because it failed content validation:",
    "",
    ...problems.map((p) => `- ${p}`),
    "",
    "--- Original message ---",
    `From: ${msg.from ?? "(default)"}`,
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${msg.subject}`,
    ...(attachments ? [`Attachments: ${attachments}`] : []),
    "",
    "Text:",
    msg.text ?? "(none)",
    ...(msg.html !== undefined ? ["", "Html:", msg.html] : []),
  ].join("\n");
}

export class SuspendedEmailError extends Error {
  constructor(readonly problems: string[]) {
    super(`email suspended: ${problems.join("; ")}`);
    this.name = "SuspendedEmailError";
  }
}

export class EmailSendError extends Error {
  constructor(cause: unknown) {
    super(`email not accepted: ${errorName(cause)}`, { cause });
    this.name = "EmailSendError";
  }
}

export class ValidatingEmailTransport implements EmailTransport {
  constructor(
    private readonly deliverable: EmailTransport,
    private readonly errorTransport: EmailTransport,
    private readonly errorRecipient: string,
    private readonly rejectSuspended = false,
  ) {}

  async send(msg: EmailMessage): Promise<void> {
    const problems = validateEmailMessage(msg);
    if (problems.length === 0) {
      await this.deliverable.send(msg);
      return;
    }

    logger.error(
      `[notify] suspended invalid outbound email: ${problems.join("; ")}`,
    );

    try {
      await this.errorTransport.send({
        to: this.errorRecipient,
        from: msg.from,
        subject: `[Suspended invalid email] ${msg.subject || "(no subject)"}`,
        text: formatReport(msg, problems),
      });
    } catch (err) {
      logger.error(
        `[notify] suspended email report not sent: ${errorName(err)}`,
      );
      if (!this.rejectSuspended) {
        throw err;
      }
    }

    if (this.rejectSuspended) {
      throw new SuspendedEmailError(problems);
    }
  }
}
