import { errorEmailRecipient } from "../../config/constants";
import logger from "../../logger";
import type { EmailTransport } from "./types";

export interface ResolveOrAlertLabels {
  dataLabel: string;
  fieldLabel: string;
  rowsLabel: string;
}

export const DEAL_LANGUAGE_LABELS: ResolveOrAlertLabels = {
  dataLabel: "dealLanguage data",
  fieldLabel: "the volunteer's language",
  rowsLabel: "dealLanguage rows",
};

export const OPPORTUNITY_SCHEDULE_LABELS: ResolveOrAlertLabels = {
  dataLabel: "opportunity Timeslot data",
  fieldLabel: "the opportunity's schedule",
  rowsLabel: "opportunity dealTimeslot rows",
};

function formatFallback(fallback: unknown): string {
  return typeof fallback === "object" && fallback !== null
    ? JSON.stringify(fallback)
    : String(fallback);
}

export async function resolveOrAlert<T, R>(
  errorTransport: EmailTransport,
  input: T,
  formatter: (input: T) => R,
  fallback: R,
  context: string,
  { dataLabel, fieldLabel, rowsLabel }: ResolveOrAlertLabels,
): Promise<R> {
  try {
    return await formatter(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      `[notify] ${dataLabel} formatting failed, using fallback (${context}): ${message}`,
    );
    try {
      await errorTransport.send({
        to: errorEmailRecipient,
        subject: `[notify] malformed ${dataLabel} — ${context}`,
        text: `A formatter threw while building an outbound email: ${message}\n\nThe email was still sent, with the fallback value "${formatFallback(fallback)}" in place of ${fieldLabel}. Check this deal's ${rowsLabel}.`,
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
