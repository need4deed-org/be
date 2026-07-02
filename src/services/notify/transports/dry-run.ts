import logger from "../../../logger";
import type {
  EmailMessage,
  EmailTransport,
  SlackMessage,
  SlackTransport,
} from "../types";

export class DryRunEmailTransport implements EmailTransport {
  async send(msg: EmailMessage): Promise<void> {
    logger.info(
      `[notify:dry-run] email suppressed — subject: "${msg.subject}"`,
    );
  }
}

export class DryRunSlackTransport implements SlackTransport {
  async send(msg: SlackMessage): Promise<void> {
    logger.info(
      `[notify:dry-run] slack suppressed — channel: ${msg.channel}, text: "${msg.text}"`,
    );
  }
}
