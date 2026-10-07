import logger from "../../../logger";
import type {
  EmailMessage,
  EmailTransport,
  SlackMessage,
  SlackTransport,
} from "../types";

const DRY_RUN_RECIPIENT = "test@need4deed.org";

function count(addresses: string | string[] | undefined): number {
  if (!addresses) {
    return 0;
  }
  return Array.isArray(addresses) ? addresses.length : 1;
}

export class DryRunEmailTransport implements EmailTransport {
  constructor(private readonly realTransport: EmailTransport) {}

  async send(msg: EmailMessage): Promise<void> {
    const originalTo = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
    const originalCc = msg.cc
      ? Array.isArray(msg.cc)
        ? msg.cc.join(", ")
        : msg.cc
      : undefined;
    const prefix = originalCc
      ? `[TO: ${originalTo} CC: ${originalCc}]`
      : `[TO: ${originalTo}]`;
    const redirected: EmailMessage = {
      ...msg,
      to: DRY_RUN_RECIPIENT,
      cc: undefined,
      subject: `${prefix} ${msg.subject}`,
    };
    logger.info(
      `[notify:dry-run] redirecting email to ${DRY_RUN_RECIPIENT} — ${count(msg.to)} recipient(s), ${count(msg.cc)} cc`,
    );
    await this.realTransport.send(redirected);
  }
}

export class DryRunSlackTransport implements SlackTransport {
  async send(msg: SlackMessage): Promise<void> {
    logger.info(`[notify:dry-run] slack suppressed — channel: ${msg.channel}`);
  }
}
