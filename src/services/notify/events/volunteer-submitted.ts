import logger from "../../../logger";
import type { SlackTransport } from "../types";
import { formatBerlinTimestamp } from "../utils";

export interface VolunteerSubmittedDeps {
  slack?: SlackTransport;
}

export async function notifyVolunteerSubmitted(
  { slack }: VolunteerSubmittedDeps,
  email: string,
): Promise<void> {
  if (!slack) {
    return;
  }
  try {
    await slack.send({
      channel: "ops",
      text: `New volunteer arrived: ${email} at ${formatBerlinTimestamp()}`,
    });
  } catch (err) {
    logger.warn(
      `volunteerSubmitted slack notification failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}
