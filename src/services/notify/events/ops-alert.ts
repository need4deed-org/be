import logger from "../../../logger";
import type { SlackTransport } from "../types";

export interface OpsAlertDeps {
  slack?: SlackTransport;
}

export async function sendOpsAlert(
  { slack }: OpsAlertDeps,
  text: string,
): Promise<void> {
  if (!slack) {
    return;
  }
  try {
    await slack.send({ channel: "ops", text });
  } catch (err) {
    logger.warn(
      `opsAlert slack notification failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}
