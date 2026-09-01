import { errorEmailRecipient } from "../../config/constants";
import DealTimeslot from "../../data/entity/m2m/deal-timeslot";
import logger from "../../logger";
import type { EmailTransport } from "./types";

/**
 * Resolves a volunteer's schedule text via `formatter`, degrading to
 * `fallback` and alerting `errorEmailRecipient` (same pattern as
 * ValidatingEmailTransport, be#847) instead of throwing when the underlying
 * Timeslot data is malformed. A bad schedule row is a display-field bug, not
 * a reason to silently block the whole match-introduction email — see be#932.
 */
export async function resolveScheduleOrAlert(
  email: EmailTransport,
  dealTimeslot: DealTimeslot[],
  formatter: (dealTimeslot: DealTimeslot[]) => string,
  fallback: string,
  context: string,
): Promise<string> {
  try {
    return formatter(dealTimeslot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      `[notify] schedule formatting failed, using fallback (${context}): ${message}`,
    );
    await email.send({
      to: errorEmailRecipient,
      subject: `[notify] malformed Timeslot data — ${context}`,
      text: `A schedule formatter threw while building an outbound email: ${message}\n\nThe email was still sent, with the fallback text "${fallback}" in place of the volunteer's schedule. Check this deal's dealTimeslot rows.`,
    });
    return fallback;
  }
}
