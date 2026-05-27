import logger from "../../../logger";
import type { SlackTransport } from "../types";
import { formatBerlinTimestamp } from "../utils";

export interface OpportunitySubmittedDeps {
  slack?: SlackTransport;
}

export async function notifyOpportunitySubmitted(
  { slack }: OpportunitySubmittedDeps,
  title: string,
): Promise<void> {
  if (!slack) {
    return;
  }
  try {
    await slack.send({
      channel: "ops",
      text: `New opportunity arrived: "${title}" at ${formatBerlinTimestamp()}`,
    });
  } catch (err) {
    logger.warn(
      `opportunitySubmitted slack notification failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}
