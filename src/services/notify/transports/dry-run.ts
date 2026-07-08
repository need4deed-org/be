import logger from "../../../logger";
import type {
  EmailMessage,
  EmailTransport,
  SlackMessage,
  SlackTransport,
} from "../types";

const DRY_RUN_RECIPIENT = "test@need4deed.org";

export class DryRunEmailTransport implements EmailTransport {
  constructor(private readonly realTransport: EmailTransport) {}

  async send(msg: EmailMessage): Promise<void> {
    const originalTo = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
    const redirected: EmailMessage = {
      ...msg,
      to: DRY_RUN_RECIPIENT,
      subject: `[TO: ${originalTo}] ${msg.subject}`,
    };
    logger.info(
      `[notify:dry-run] redirecting email to ${DRY_RUN_RECIPIENT} — original to: "${originalTo}", subject: "${msg.subject}"`,
    );
    await this.realTransport.send(redirected);
  }
}

export class DryRunSlackTransport implements SlackTransport {
  async send(msg: SlackMessage): Promise<void> {
    logger.info(
      `[notify:dry-run] slack suppressed — channel: ${msg.channel}, text: "${msg.text}"`,
    );
  }
}
