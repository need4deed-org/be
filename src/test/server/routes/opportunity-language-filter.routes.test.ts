import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  LangProficiency,
  LangPurpose,
  OpportunityStatusType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type Key = "germanOnly" | "english";

describe("GET /opportunity language filter", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  let cookie: string;
  let person: Person;
  let agent: Agent;
  let districtId: number;
  let englishId: number;
  let germanId: number;
  const deals: Deal[] = [];
  const opportunities = {} as Record<Key, Opportunity>;

  const list = (query: string) =>
    fastify.inject({
      method: "GET",
      url: `/opportunity?limit=100&${query}`,
      cookies: { [accessCookieName]: cookie },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const [district]: { id: number }[] = await dataSource.query(
      `SELECT id FROM district ORDER BY id LIMIT 1`,
    );
    districtId = district.id;
    englishId = (
      await fastify.db.languageRepository.findOneByOrFail({ isoCode: "en" })
    ).id;
    germanId = (
      await fastify.db.languageRepository.findOneByOrFail({ isoCode: "de" })
    ).id;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Language Filter Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );

    const languagesOf: Record<Key, [number, LangPurpose][]> = {
      germanOnly: [[germanId, LangPurpose.RECIPIENT]],
      english: [
        [englishId, LangPurpose.GENERAL],
        [germanId, LangPurpose.RECIPIENT],
      ],
    };
    for (const key of Object.keys(languagesOf) as Key[]) {
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      );
      deals.push(deal);
      await getRepository(dataSource, DealLanguage).save(
        languagesOf[key].map(
          ([languageId, purpose]) =>
            new DealLanguage({
              dealId: deal.id,
              languageId,
              purpose,
              proficiency: LangProficiency.FLUENT,
            }),
        ),
      );
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Language Filter ${key} ${suffix}`,
          type: OpportunityType.REGULAR,
          status: OpportunityStatusType.SEARCHING,
          dealId: deal.id,
          agentId: agent.id,
          districtId,
        }),
      );
    }

    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Language", lastName: `Filter${suffix}` }),
    );
    const email = `language-filter-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: person.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    cookie = res.cookies.find((c) => c.name === accessCookieName)
      ?.value as string;
  });

  afterAll(async () => {
    for (const opportunity of Object.values(opportunities)) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.userRepository.delete({ personId: person.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.close();
  });

  const ownIds = (data: { id: number }[]) =>
    data
      .map(({ id }) => id)
      .filter((id) =>
        Object.values(opportunities).some(
          (opportunity) => opportunity.id === id,
        ),
      );

  it.each([
    ["language only", () => ""],
    ["with district", () => `&filter[district][]=${districtId}`],
    [
      "with district and status",
      () => `&filter[district][]=${districtId}&filter[status][]=opp-searching`,
    ],
    ["sorted by start date", () => "&sortBy=start-date"],
  ])("returns only opportunities with that language (%s)", async (_, extra) => {
    const res = await list(`filter[language][]=${englishId}${extra()}`);
    expect(res.statusCode).toBe(200);
    expect(ownIds(res.json().data)).toEqual([opportunities.english.id]);
  });

  it("returns all of a matching opportunity's languages, not just the filtered one", async () => {
    const res = await list(`filter[language][]=${englishId}`);
    const match = res
      .json()
      .data.find(({ id }: { id: number }) => id === opportunities.english.id);
    expect(match.languages.map(({ id }: { id: number }) => id).sort()).toEqual(
      [englishId, germanId].sort(),
    );
  });
});
