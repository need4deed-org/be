import { errorEmailRecipient } from "../../config/constants";
import logger from "../../logger";
import type { EmailTransport } from "./types";

export interface ResolveOrAlertLabels {
  /** e.g. "Timeslot data", "dealLanguage data" — used in the alert subject/log. */
  dataLabel: string;
  /** e.g. "the volunteer's schedule" — the field the fallback replaces. */
  fieldLabel: string;
  /** e.g. "dealTimeslot rows" — where to look to fix the underlying data. */
  rowsLabel: string;
}

/**
 * Resolves a value via `formatter`, degrading to `fallback` and alerting
 * `errorEmailRecipient` instead of throwing when the underlying relation
 * data is malformed (e.g. an orphaned FK). A bad row is a display-field bug,
 * not a reason to silently block the whole email — see be#932/be#941/be#942.
 *
 * `errorTransport` must be a transport that bypasses dry-run redirection
 * (the raw SMTP client, same as ValidatingEmailTransport's errorTransport,
 * be#847) — otherwise the alert would silently go to the dry-run recipient
 * in every non-prod environment instead of actually reaching anyone. Both
 * the formatting failure and a failure to send the alert itself are caught
 * and logged rather than thrown, so this never blocks the caller's email
 * from going out.
 */
export async function resolveOrAlert<T, R>(
  errorTransport: EmailTransport,
  input: T,
  formatter: (input: T) => R,
  fallback: R,
  context: string,
  { dataLabel, fieldLabel, rowsLabel }: ResolveOrAlertLabels,
): Promise<R> {
  try {
    return formatter(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      `[notify] ${dataLabel} formatting failed, using fallback (${context}): ${message}`,
    );
    try {
      await errorTransport.send({
        to: errorEmailRecipient,
        subject: `[notify] malformed ${dataLabel} — ${context}`,
        text: `A formatter threw while building an outbound email: ${message}\n\nThe email was still sent, with the fallback value "${fallback}" in place of ${fieldLabel}. Check this deal's ${rowsLabel}.`,
      });
    } catch (alertError) {
      const alertMessage =
        alertError instanceof Error ? alertError.message : String(alertError);
      logger.error(
        `[notify] failed to send malformed-${dataLabel} alert (${context}): ${alertMessage}`,
      );
    }
    return fallback;
  }
}
