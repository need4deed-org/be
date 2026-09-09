import DealTimeslot from "../../data/entity/m2m/deal-timeslot";
import { resolveOrAlert } from "./resolve-or-alert";
import type { EmailTransport } from "./types";

/**
 * Resolves a volunteer's schedule text via `formatter`, degrading to
 * `fallback` and alerting `errorEmailRecipient` instead of throwing when the
 * underlying Timeslot data is malformed — see resolveOrAlert (be#932).
 */
export async function resolveScheduleOrAlert(
  errorTransport: EmailTransport,
  dealTimeslot: DealTimeslot[],
  formatter: (dealTimeslot: DealTimeslot[]) => string,
  fallback: string,
  context: string,
): Promise<string> {
  return resolveOrAlert(
    errorTransport,
    dealTimeslot,
    formatter,
    fallback,
    context,
    {
      dataLabel: "Timeslot data",
      fieldLabel: "the volunteer's schedule",
      rowsLabel: "dealTimeslot rows",
    },
  );
}
