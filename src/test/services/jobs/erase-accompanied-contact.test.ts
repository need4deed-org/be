import { FastifyInstance } from "fastify";
import { OpportunityStatusType, OpportunityType } from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { createServer } from "../../../server";
import { berlinDayBoundaries } from "../../../services/jobs/berlin-dates";
import { eraseAccompaniedContact } from "../../../services/jobs/erase-accompanied-contact";
import { randomNumericSuffix } from "../../random";

const suffix = Number(randomNumericSuffix());
const RUN_DAY = new Date(1960 + (suffix % 20), 5, 15);
const atNoon = (year: number, month: number, day: number) =>
  new Date(
    berlinDayBoundaries(new Date(year, month, day)).startOfDay.getTime() +
      12 * 3600 * 1000,
  );

type Key = "pastMonth" | "exactlyMonth" | "future" | "regular";

describe("eraseAccompaniedContact", () => {
  let fastify: FastifyInstance;
  const rows = {} as Record<
    Key,
    { accompanying: Accompanying; opportunity: Opportunity }
  >;
  const onetimers: Onetimer[] = [];

  const create = async (key: Key, date: Date, type: OpportunityType) => {
    const onetimer = await fastify.db.onetimerRepository.save(
      new Onetimer({ date }),
    );
    onetimers.push(onetimer);
    const accompanying = await fastify.db.accompanyingRepository.save(
      new Accompanying({
        name: `Refugee ${key} ${suffix}`,
        phone: "+49 30 1234567",
        email: `refugee-${key}-${suffix}@test.need4deed.org`,
        address: `Appointment street ${suffix}`,
      }),
    );
    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Erase ${key} ${suffix}`,
        type,
        status: OpportunityStatusType.PAST,
        onetimerId: onetimer.id,
        accompanyingId: accompanying.id,
      }),
    );
    rows[key] = { accompanying, opportunity };
  };

  const reload = (key: Key) =>
    fastify.db.accompanyingRepository.findOneByOrFail({
      id: rows[key].accompanying.id,
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    const y = RUN_DAY.getFullYear();
    await create("pastMonth", atNoon(y, 4, 14), OpportunityType.ACCOMPANYING);
    await create(
      "exactlyMonth",
      atNoon(y, 4, 15),
      OpportunityType.ACCOMPANYING,
    );
    await create("future", atNoon(y, 6, 1), OpportunityType.ACCOMPANYING);
    await create("regular", atNoon(y, 3, 1), OpportunityType.REGULAR);
    await eraseAccompaniedContact(fastify, RUN_DAY);
  });

  afterAll(async () => {
    const opportunities = Object.values(rows).map(
      ({ opportunity }) => opportunity.id,
    );
    const accompanyings = Object.values(rows).map(
      ({ accompanying }) => accompanying.id,
    );
    await fastify.db.opportunityRepository.delete({ id: In(opportunities) });
    await fastify.db.accompanyingRepository.delete({ id: In(accompanyings) });
    await fastify.db.onetimerRepository.delete({
      id: In(onetimers.map(({ id }) => id)),
    });
    await fastify.close();
  });

  it("erases name and phone once the appointment is more than a month ago", async () => {
    const erased = await reload("pastMonth");
    expect(erased.name).toBe("");
    expect(erased.phone).toBeNull();
    expect(erased.email).toBe(rows.pastMonth.accompanying.email);
    expect(erased.address).toBe(rows.pastMonth.accompanying.address);
  });

  it("keeps them on the day exactly a month after and for later appointments", async () => {
    for (const key of ["exactlyMonth", "future"] as Key[]) {
      const kept = await reload(key);
      expect(kept.name).toBe(rows[key].accompanying.name);
      expect(kept.phone).toBe("+49 30 1234567");
    }
  });

  it("leaves rows of non-accompanying opportunities to their own cleanup", async () => {
    expect((await reload("regular")).name).toBe(rows.regular.accompanying.name);
  });
});
