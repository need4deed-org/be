import { DataSource, EntityManager, In, IsNull } from "typeorm";
import { dataSource } from "../../../data/data-source";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Timeslot from "../../../data/entity/time/timeslot.entity";
import { getRepository } from "../../../data/utils";

// Keeps a deal's one-time timeslot on the given start, so an event whose
// onetimer date changed doesn't keep showing (and matching) the old date.
// Recurring and occasional timeslots are left alone.
export async function syncOnetimeTimeslot(
  dealId: number,
  start: Date,
  manager: DataSource | EntityManager = dataSource,
): Promise<void> {
  const dealTimeslotRepository = getRepository(manager, DealTimeslot);
  const onetime = (
    await dealTimeslotRepository.find({
      where: { dealId },
      relations: { timeslot: true },
    })
  ).filter(
    ({ timeslot }) => !timeslot.rrule && !timeslot.occasional && timeslot.start,
  );
  const stale = onetime.filter(
    ({ timeslot }) => timeslot.start.getTime() !== start.getTime(),
  );
  if (stale.length) {
    await dealTimeslotRepository.delete({ id: In(stale.map(({ id }) => id)) });
  }
  if (stale.length === onetime.length) {
    const timeslotRepository = getRepository(manager, Timeslot);
    const timeslot =
      (await timeslotRepository.findOneBy({
        start,
        rrule: IsNull(),
        occasional: IsNull(),
      })) ?? (await timeslotRepository.save(new Timeslot({ start })));
    await dealTimeslotRepository.save(
      new DealTimeslot({ dealId, timeslotId: timeslot.id }),
    );
  }
}
