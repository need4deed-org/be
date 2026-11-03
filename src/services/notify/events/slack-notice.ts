import logger from "../../../logger";
import type { SlackChannel, SlackTransport } from "../types";

export interface SlackNoticeDeps {
  slack?: SlackTransport;
}

export async function postSlackNotice(
  { slack }: SlackNoticeDeps,
  channel: SlackChannel,
  text: string,
): Promise<void> {
  if (!slack) {
    return;
  }
  try {
    await slack.send({ channel, text });
  } catch (err) {
    logger.warn(
      `${channel} slack notification failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}
