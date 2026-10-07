import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import LeadFrom from "../../../data/entity/lead.entity";
import StatisticsEvent, {
  LEAD_FROM_METRIC,
} from "../../../data/entity/statistics-event.entity";
import { updateLeads } from "../../../server/utils/data/update-leads";
import { randomNumericSuffix } from "../../random";

describe("updateLeads", () => {
  let first: LeadFrom;
  let second: LeadFrom;

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
  });

  afterAll(async () => {
    const ids = [String(first.id), String(second.id)];
    await dataSource
      .getRepository(StatisticsEvent)
      .delete({ metric: LEAD_FROM_METRIC, valueKey: In(ids) });
    await dataSource
      .getRepository(LeadFrom)
      .delete({ id: In([first.id, second.id]) });
  });

  it("counts each answer once and records one event per answer", async () => {
    await updateLeads([first, first, second]);

    const repo = dataSource.getRepository(LeadFrom);
    expect((await repo.findOneByOrFail({ id: first.id })).count).toBe(4);
    expect((await repo.findOneByOrFail({ id: second.id })).count).toBe(1);

    const recorded = await events();
    expect(recorded.map((e) => e.valueKey).sort()).toEqual(
      [String(first.id), String(second.id)].sort(),
    );
    expect(recorded.every((e) => e.occurredAt instanceof Date)).toBe(true);
  });

  it("does nothing for no answers", async () => {
    const before = (await events()).length;
    await expect(updateLeads([])).resolves.toBeUndefined();
    expect((await events()).length).toBe(before);
  });
});
