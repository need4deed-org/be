import logger from "../../../logger";
import type { SlackChannel, SlackTransport } from "../types";

export interface OpsAlertDeps {
  slack?: SlackTransport;
}

async function postSlackNotice(
  slack: SlackTransport | undefined,
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

export async function sendOpsAlert(
  { slack }: OpsAlertDeps,
  text: string,
): Promise<void> {
  await postSlackNotice(slack, "ops", text);
}

export async function sendArrival(
  { slack }: OpsAlertDeps,
  text: string,
): Promise<void> {
  await postSlackNotice(slack, "arrivals", text);
}
