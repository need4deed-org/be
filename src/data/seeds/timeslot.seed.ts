import { OccasionalType } from "need4deed-sdk";
import { DataSource } from "typeorm";
import Timeslot from "../entity/time/timeslot.entity";
import { getRepository } from "../utils";
import { getCount } from "./utils";

export async function seedTimeslots(dataSource: DataSource): Promise<void> {
  const timeslotRepository = getRepository(dataSource, Timeslot);

  const count = await getCount(timeslotRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding timeslots.");
    return;
  }
  const date = "2024-01-01";

  const timeslots: Partial<Timeslot>[] = [];

  for (const day of ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]) {
    const rrule = `FREQ=WEEKLY;BYDAY=${day};`;
    for (const timeframe of [
      [`${day}-morning`, 8, 11],
      [`${day}-noon`, 11, 14],
      [`${day}-afternoon`, 14, 17],
      [`${day}-evening`, 17, 20],
    ] as [string, number, number][]) {
      const [info, startHour, endHour] = timeframe;
      const start = new Date(`${date} ${startHour}:00`);
      const end = new Date(`${date} ${endHour}:00`);

      timeslots.push(new Timeslot({ info, rrule, start, end }));
    }
  }

  timeslots.push({ info: "occasional", occasional: OccasionalType.WEEKDAYS });
  timeslots.push({ info: "occasional", occasional: OccasionalType.WEEKENDS });

  await timeslotRepository.save(timeslots);

  dataSource.logger.log("info", "Timeslots has been seeded.");
}
