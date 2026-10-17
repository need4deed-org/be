import { randomUUID } from "crypto";
import { EntityTableName } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../../data/data-source";
import Option from "../../../../data/entity/option.entity";
import Skill from "../../../../data/entity/profile/skill.entity";
import { seedOptions } from "../../../../data/seeds/reference/option.seed";

vi.mock("../../../../data/utils/fetch-json", () => ({
  fetchJsonFromUrl: vi.fn().mockResolvedValue([]),
}));

describe("seedOptions", () => {
  let skill: Skill;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    skill = await dataSource
      .getRepository(Skill)
      .save(new Skill({ title: `seed-options-${randomUUID()}` }));
  });

  afterAll(async () => {
    if (skill) {
      await dataSource
        .getRepository(Option)
        .delete({ itemType: EntityTableName.SKILL, itemId: skill.id });
      await dataSource.getRepository(Skill).delete(skill.id);
    }
    await dataSource.destroy();
  });

  it("adds the missing options when the table already has rows", async () => {
    const optionRepository = dataSource.getRepository(Option);
    expect(await optionRepository.count()).toBeGreaterThan(0);

    await seedOptions(dataSource);

    expect(
      await optionRepository.countBy({
        itemType: EntityTableName.SKILL,
        itemId: skill.id,
      }),
    ).toBe(1);
  });

  it("adds nothing on a second run", async () => {
    const optionRepository = dataSource.getRepository(Option);
    const before = await optionRepository.count();

    await seedOptions(dataSource);

    expect(await optionRepository.count()).toBe(before);
  });
});
