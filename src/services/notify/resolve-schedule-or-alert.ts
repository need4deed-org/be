import { errorEmailRecipient } from "../../config/constants";
import DealTimeslot from "../../data/entity/m2m/deal-timeslot";
import logger from "../../logger";
import type { EmailTransport } from "./types";

/**
 * Resolves a volunteer's schedule text via `formatter`, degrading to
 * `fallback` and alerting `errorEmailRecipient` instead of throwing when the
 * underlying Timeslot data is malformed. A bad schedule row is a
 * display-field bug, not a reason to silently block the whole
 * match-introduction email — see be#932.
 *
 * `errorTransport` must be a transport that bypasses dry-run redirection
 * (the raw SMTP client, same as ValidatingEmailTransport's errorTransport,
 * be#847) — otherwise the alert would silently go to the dry-run recipient
 * in every non-prod environment instead of actually reaching anyone. Both
 * the schedule-formatting failure and a failure to send the alert itself are
 * caught and logged rather than thrown, so this function never blocks the
 * caller's email from going out.
 */
export async function resolveScheduleOrAlert(
  errorTransport: EmailTransport,
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
    try {
      await errorTransport.send({
        to: errorEmailRecipient,
        subject: `[notify] malformed Timeslot data — ${context}`,
        text: `A schedule formatter threw while building an outbound email: ${message}\n\nThe email was still sent, with the fallback text "${fallback}" in place of the volunteer's schedule. Check this deal's dealTimeslot rows.`,
      });
    } catch (alertError) {
      const alertMessage =
        alertError instanceof Error ? alertError.message : String(alertError);
      logger.error(
        `[notify] failed to send malformed-Timeslot alert (${context}): ${alertMessage}`,
      );
    }
    return fallback;
  }
}
