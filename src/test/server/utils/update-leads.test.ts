import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import LeadFrom from "../../../data/entity/lead.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Person from "../../../data/entity/person.entity";
import StatisticsEvent, {
  LEAD_FROM_METRIC,
} from "../../../data/entity/statistics-event.entity";
import Timeline from "../../../data/entity/timeline.entity";
import VolunteerLeadFrom from "../../../data/entity/volunteer/volunteer-lead-from.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { changeVolunteerLeadFrom } from "../../../server/utils/data/volunteer-lead-from";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

describe("volunteer lead sources", () => {
  let first: LeadFrom;
  let second: LeadFrom;
  let volunteer: Volunteer;

  const events = () =>
    dataSource.getRepository(StatisticsEvent).findBy({
      metric: LEAD_FROM_METRIC,
      valueKey: In([String(first.id), String(second.id)]),
    });

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const suffix = randomNumericSuffix();
    const repo = dataSource.getRepository(LeadFrom);
    first = await repo.save(
      new LeadFrom({ title: `Lead A ${suffix}`, count: 3 }),
    );
    second = await repo.save(
      new LeadFrom({ title: `Lead B ${suffix}`, count: 0 }),
    );
    const postcode = await firstSeeded(dataSource.getRepository(Postcode));
    const person = await dataSource.manager.save(
      new Person({ firstName: "Lead test" }),
    );
    const deal = await dataSource.manager.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await dataSource.manager.save(
      new Volunteer({ personId: person.id, dealId: deal.id }),
    );
    vi.stubEnv(
      "VOLUNTEER_LEAD_FROM_LAUNCH_AT",
      volunteer.createdAt.toISOString(),
    );
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await dataSource.manager.delete(Timeline, { targetEntityId: volunteer.id });
    await dataSource.manager.delete(Volunteer, volunteer.id);
    await dataSource.manager.delete(Deal, volunteer.dealId);
    await dataSource.manager.delete(Person, volunteer.personId);
    const ids = [String(first.id), String(second.id)];
    await dataSource
      .getRepository(StatisticsEvent)
      .delete({ metric: LEAD_FROM_METRIC, valueKey: In(ids) });
    await dataSource
      .getRepository(LeadFrom)
      .delete({ id: In([first.id, second.id]) });
  });

  it("applies ordered changes to linked statistics and rolls back an invalid batch", async () => {
    await expect(
      changeVolunteerLeadFrom(volunteer.id, 1, [
        { action: "add", optionId: first.id },
        { action: "add", optionId: first.id },
      ]),
    ).rejects.toThrow("already saved");
    expect(await events()).toHaveLength(0);
    expect(
      await dataSource.manager.findBy(VolunteerLeadFrom, {
        volunteerId: volunteer.id,
      }),
    ).toHaveLength(0);

    const repo = dataSource.getRepository(LeadFrom);
    await changeVolunteerLeadFrom(volunteer.id, 1, [
      { action: "add", optionId: first.id },
      { action: "correct", previousOptionId: first.id, optionId: second.id },
    ]);
    expect((await repo.findOneByOrFail({ id: first.id })).count).toBe(3);
    expect((await repo.findOneByOrFail({ id: second.id })).count).toBe(1);

    expect(await events()).toEqual([
      expect.objectContaining({
        valueKey: String(second.id),
        occurredAt: volunteer.createdAt,
      }),
    ]);
    expect(
      await dataSource.manager.findBy(Timeline, {
        targetEntityId: volunteer.id,
      }),
    ).toHaveLength(2);

    await changeVolunteerLeadFrom(volunteer.id, 1, [
      { action: "remove", optionId: second.id },
    ]);
    expect(await events()).toHaveLength(0);
    expect((await repo.findOneByOrFail({ id: second.id })).count).toBe(0);
  });

  it("keeps edits profile-only before launch and preserves counted events on volunteer deletion", async () => {
    vi.stubEnv(
      "VOLUNTEER_LEAD_FROM_LAUNCH_AT",
      new Date(volunteer.createdAt.getTime() + 1).toISOString(),
    );
    await changeVolunteerLeadFrom(volunteer.id, 1, [
      { action: "add", optionId: first.id },
      { action: "correct", previousOptionId: first.id, optionId: second.id },
    ]);
    expect(await events()).toHaveLength(0);
    expect(
      await dataSource.manager.findBy(VolunteerLeadFrom, {
        volunteerId: volunteer.id,
      }),
    ).toEqual([
      expect.objectContaining({
        leadFromId: second.id,
        statisticsEventId: null,
      }),
    ]);
    await changeVolunteerLeadFrom(volunteer.id, 1, [
      { action: "remove", optionId: second.id },
    ]);
    vi.stubEnv(
      "VOLUNTEER_LEAD_FROM_LAUNCH_AT",
      volunteer.createdAt.toISOString(),
    );
    await changeVolunteerLeadFrom(volunteer.id, 1, [
      { action: "add", optionId: first.id },
    ]);
    await expect(
      dataSource.manager.delete(LeadFrom, first.id),
    ).rejects.toThrow();
    await dataSource.manager.delete(Volunteer, volunteer.id);
    expect(
      await dataSource.manager.findBy(VolunteerLeadFrom, {
        volunteerId: volunteer.id,
      }),
    ).toHaveLength(0);
    expect(await events()).toEqual([
      expect.objectContaining({ valueKey: String(first.id) }),
    ]);
    expect(
      (await dataSource.manager.findOneByOrFail(LeadFrom, { id: first.id }))
        .count,
    ).toBe(4);
  });
});
