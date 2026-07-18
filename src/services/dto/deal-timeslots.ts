import { OccasionalType } from "need4deed-sdk";
import { dataSource } from "../../data/data-source";
import DealTimeslot from "../../data/entity/m2m/deal-timeslot";
import Timeslot from "../../data/entity/time/timeslot.entity";
import { getRepository, getRRULE, getStartEnd } from "../../data/utils";
import logger from "../../logger";
import { getTimeslot } from "../../server/utils";

// Shared by both dealParserOpportunity (legacy form) and
// dealParserOpportunityCreate (dashboard form) — the [day, daytime] timeslot
// tuple and the one-time-event datetime mean the same thing in both shapes.
export async function buildDealTimeslots(
  timeslots: [number, string][] | undefined | null,
  onetimeDateTime: string | undefined | null,
): Promise<DealTimeslot[]> {
  const dealTimeslot: DealTimeslot[] = [];

  for (const opportunityTime of timeslots || []) {
    const [day, daytime] = opportunityTime;
    let timeframe: { start?: Date; end?: Date } = { start: null, end: null };
    let rrule: string = null;
    let occasional: OccasionalType = null;
    if (day) {
      timeframe = getStartEnd(daytime as string);
      const mapDay = [
        "",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ] as const;
      rrule = getRRULE(mapDay[Number(day)]);
    } else {
      occasional = daytime.toLowerCase() as OccasionalType;
    }
    const timeslot = await getTimeslot({ rrule, ...timeframe, occasional });
    dealTimeslot.push(new DealTimeslot({ timeslot }));
  }

  if (onetimeDateTime) {
    const timeslotRepository = getRepository(dataSource, Timeslot);
    const start = new Date(onetimeDateTime);
    const info = `One-time event on ${onetimeDateTime}`;
    const timeslot = await getTimeslot({
      start,
      info,
    });

    await timeslotRepository.save(timeslot); // TODO: check if id is undefined before saving
    logger.debug(`Created one-time timeslot: ${JSON.stringify(timeslot)}`);

    dealTimeslot.push(new DealTimeslot({ timeslot }));
  }

  return dealTimeslot;
}
