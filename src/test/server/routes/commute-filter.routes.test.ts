import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  OpportunityStatusType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import PostcodeCommute from "../../../data/entity/location/postcode-commute.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";
const LISTS = ["/volunteer", "/opportunity"];

type PostcodeKey = "origin" | "near" | "far" | "unmatched";

// Asymmetric on purpose, so measuring the wrong direction fails the tests.
const COMMUTES: [PostcodeKey, PostcodeKey, number][] = [
  ["near", "origin", 20],
  ["far", "origin", 50],
  ["origin", "near", 50],
  ["origin", "far", 20],
];

type VolunteerKey =
  | "from20"
  | "from50"
  | "unmatched"
  | "noAddressDeal20"
  | "noAddressDeal50"
  | "sameAsOrigin";

const VOLUNTEER_HOME: Record<
  VolunteerKey,
  { address: PostcodeKey | null; deal: PostcodeKey }
> = {
  from20: { address: "near", deal: "far" },
  from50: { address: "far", deal: "near" },
  unmatched: { address: "unmatched", deal: "far" },
  noAddressDeal20: { address: null, deal: "near" },
  noAddressDeal50: { address: null, deal: "far" },
  sameAsOrigin: { address: "origin", deal: "far" },
};

type OpportunityKey =
  | "deal20"
  | "deal50"
  | "accompanying20Deal50"
  | "accompanying50Deal20"
  | "accompanyingWithoutPostcodeDeal50"
  | "dealUnmatched"
  | "noDeal"
  | "noDealAgent50";

const OPPORTUNITY_PLACE: Record<
  OpportunityKey,
  {
    deal: PostcodeKey | null;
    accompanying?: PostcodeKey | null;
    atAgentNear?: boolean;
  }
> = {
  deal20: { deal: "far", atAgentNear: true },
  deal50: { deal: "near" },
  accompanying20Deal50: { deal: "near", accompanying: "far" },
  accompanying50Deal20: { deal: "far", accompanying: "near" },
  accompanyingWithoutPostcodeDeal50: { deal: "near", accompanying: null },
  dealUnmatched: { deal: "unmatched" },
  noDeal: { deal: null },
  noDealAgent50: { deal: null, atAgentNear: true },
};

describe("filter[commute-postcode] / filter[max-commute-minutes] on GET /volunteer and GET /opportunity", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  let cookie: string;
  let coordinator: Person;
  let agent: Agent;
  let agentNear: Agent;
  const postcodes = {} as Record<PostcodeKey, Postcode>;
  const extraPostcodes: Postcode[] = [];
  let withoutCoordinates: Postcode;
  const volunteers = {} as Record<VolunteerKey, Volunteer>;
  const opportunities = {} as Record<OpportunityKey, Opportunity>;
  const persons: Person[] = [];
  const addresses: Address[] = [];
  const deals: Deal[] = [];
  const accompanyings: Accompanying[] = [];

  async function dealAt(key: PostcodeKey) {
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcodes[key].id }),
    );
    deals.push(deal);
    return deal;
  }

  const get = (url: string) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookie },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const values = new Set<string>();
    while (values.size < 5) {
      values.add(`8${randomNumericSuffix(4)}`);
    }
    const [originValue, ...otherValues] = [...values];
    const located = (value: string, i: number) =>
      new Postcode({ value, latitude: 52.5 + i / 100, longitude: 13.4 });
    const postcodeRepository = getRepository(dataSource, Postcode);
    const originDuplicateFirst = await postcodeRepository.save(
      located(originValue, 0),
    );
    const [origin, near, far, unmatched] = await postcodeRepository.save(
      [originValue, ...otherValues.slice(0, 3)].map(located),
    );
    withoutCoordinates = await postcodeRepository.save(
      new Postcode({ value: otherValues[3] }),
    );
    extraPostcodes.push(originDuplicateFirst, withoutCoordinates);
    Object.assign(postcodes, { origin, near, far, unmatched });
    await getRepository(dataSource, PostcodeCommute).save(
      COMMUTES.map(
        ([from, to, minutes]) =>
          new PostcodeCommute({
            fromPostcodeId: postcodes[from].id,
            toPostcodeId: postcodes[to].id,
            minutes,
          }),
      ),
    );

    for (const [key, home] of Object.entries(VOLUNTEER_HOME)) {
      const address = home.address
        ? await getRepository(dataSource, Address).save(
            new Address({ postcodeId: postcodes[home.address].id }),
          )
        : null;
      if (address) {
        addresses.push(address);
      }
      const person = await fastify.db.personRepository.save(
        new Person({
          firstName: key,
          lastName: `Commute${suffix}`,
          addressId: address?.id,
        }),
      );
      persons.push(person);
      volunteers[key as VolunteerKey] =
        await fastify.db.volunteerRepository.save(
          new Volunteer({
            dealId: (await dealAt(home.deal)).id,
            personId: person.id,
          }),
        );
    }

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Commute Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    const agentAddress = await getRepository(dataSource, Address).save(
      new Address({ postcodeId: postcodes.near.id }),
    );
    addresses.push(agentAddress);
    agentNear = await fastify.db.agentRepository.save(
      new Agent({
        title: `Commute Agent Near ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
        addressId: agentAddress.id,
      }),
    );
    for (const [key, place] of Object.entries(OPPORTUNITY_PLACE)) {
      const accompanying =
        place.accompanying === undefined
          ? null
          : await getRepository(dataSource, Accompanying).save(
              new Accompanying({
                name: "Commute",
                address: "Commute",
                postcodeId: place.accompanying
                  ? postcodes[place.accompanying].id
                  : undefined,
              }),
            );
      if (accompanying) {
        accompanyings.push(accompanying);
      }
      opportunities[key as OpportunityKey] =
        await fastify.db.opportunityRepository.save(
          new Opportunity({
            title: `Commute ${key} ${suffix}`,
            type: accompanying
              ? OpportunityType.ACCOMPANYING
              : OpportunityType.REGULAR,
            status: OpportunityStatusType.SEARCHING,
            dealId: place.deal ? (await dealAt(place.deal)).id : undefined,
            accompanyingId: accompanying?.id,
            agentId: place.atAgentNear ? agentNear.id : agent.id,
          }),
        );
    }

    coordinator = await fastify.db.personRepository.save(
      new Person({ firstName: "Commute", lastName: `Coord${suffix}` }),
    );
    const email = `commute-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinator.id,
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
    const ids = (entities: { id: number }[]) =>
      In(entities.map(({ id }) => id));
    await fastify.db.opportunityRepository.delete({
      id: ids(Object.values(opportunities)),
    });
    await getRepository(dataSource, Accompanying).delete({
      id: ids(accompanyings),
    });
    await fastify.db.volunteerRepository.delete({
      id: ids(Object.values(volunteers)),
    });
    await fastify.db.dealRepository.delete({ id: ids(deals) });
    await fastify.db.personRepository.delete({ id: ids(persons) });
    await fastify.db.agentRepository.delete({ id: ids([agent, agentNear]) });
    await getRepository(dataSource, Address).delete({ id: ids(addresses) });
    await getRepository(dataSource, Postcode).delete({
      id: ids([...Object.values(postcodes), ...extraPostcodes]),
    });
    await fastify.db.userRepository.delete({ personId: coordinator.id });
    await fastify.db.personRepository.delete({ id: coordinator.id });
    await fastify.close();
  });

  describe.each(LISTS)("GET %s", (list) => {
    it("accepts both keys together", async () => {
      const res = await get(
        `${list}?filter[commute-postcode]=12043&filter[max-commute-minutes]=30`,
      );
      expect(res.statusCode).toBe(200);
    });

    it("accepts them together with a search, which adds its own id condition", async () => {
      const res = await get(
        `${list}?filter[search]=commute&filter[commute-postcode]=12043&filter[max-commute-minutes]=30`,
      );
      expect(res.statusCode).toBe(200);
    });

    it.each([
      ["only commute-postcode", "filter[commute-postcode]=12043"],
      ["only max-commute-minutes", "filter[max-commute-minutes]=30"],
      [
        "a postcode that is not 5 digits",
        "filter[commute-postcode]=1204&filter[max-commute-minutes]=30",
      ],
      [
        "non-integer minutes",
        "filter[commute-postcode]=12043&filter[max-commute-minutes]=half",
      ],
      [
        "more than 600 minutes",
        "filter[commute-postcode]=12043&filter[max-commute-minutes]=601",
      ],
      [
        "zero minutes",
        "filter[commute-postcode]=12043&filter[max-commute-minutes]=0",
      ],
    ])("rejects %s with 400", async (_, query) => {
      const res = await get(`${list}?${query}`);
      expect(res.statusCode).toBe(400);
    });

    it("rejects a postcode that is not in the postcode table with 400", async () => {
      const res = await get(
        `${list}?filter[commute-postcode]=00000&filter[max-commute-minutes]=30`,
      );
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe('Unknown commute postcode "00000".');
    });

    it("rejects a postcode without coordinates with 400", async () => {
      const res = await get(
        `${list}?filter[commute-postcode]=${withoutCoordinates.value}&filter[max-commute-minutes]=30`,
      );
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe(
        `Commute postcode "${withoutCoordinates.value}" has no coordinates.`,
      );
    });
  });

  const own = (
    entities: Record<string, { id: number }>,
    res: { json: () => { data: { id: number }[] } },
  ) =>
    Object.entries(entities)
      .filter(([, entity]) =>
        res.json().data.some(({ id }) => id === entity.id),
      )
      .map(([key]) => key)
      .sort();
  const commuteQuery = (max?: number) =>
    max === undefined
      ? ""
      : `&filter[commute-postcode]=${postcodes.origin.value}&filter[max-commute-minutes]=${max}`;
  const listVolunteers = (max?: number) =>
    get(
      `/volunteer?limit=50&filter[search]=Commute${suffix}${commuteQuery(max)}`,
    );
  const listOpportunities = (max?: number) =>
    get(`/opportunity?limit=100&filter[search]=${suffix}${commuteQuery(max)}`);

  const ALL_VOLUNTEERS = Object.keys(VOLUNTEER_HOME).sort();
  const ALL_OPPORTUNITIES = Object.keys(OPPORTUNITY_PLACE).sort();

  it.each([
    ["no commute filter", undefined, ALL_VOLUNTEERS],
    ["60 minutes", 60, ALL_VOLUNTEERS],
    [
      "30 minutes",
      30,
      ["from20", "noAddressDeal20", "sameAsOrigin", "unmatched"],
    ],
    [
      "20 minutes, inclusive",
      20,
      ["from20", "noAddressDeal20", "sameAsOrigin", "unmatched"],
    ],
    ["10 minutes", 10, ["sameAsOrigin", "unmatched"]],
  ])(
    "filters volunteers by the commute from their address, else deal, postcode to the origin: %s",
    async (_, max, expected) => {
      const res = await listVolunteers(max);
      expect(res.statusCode).toBe(200);
      expect(own(volunteers, res)).toEqual([...expected].sort());
    },
  );

  it.each([
    ["no commute filter", undefined, ALL_OPPORTUNITIES],
    ["60 minutes", 60, ALL_OPPORTUNITIES],
    [
      "30 minutes",
      30,
      ["accompanying20Deal50", "deal20", "dealUnmatched", "noDeal"],
    ],
    ["10 minutes", 10, ["dealUnmatched", "noDeal"]],
  ])(
    "filters opportunities by the commute from the origin to their appointment, else deal, else agent postcode: %s",
    async (_, max, expected) => {
      const res = await listOpportunities(max);
      expect(res.statusCode).toBe(200);
      expect(own(opportunities, res)).toEqual([...expected].sort());
    },
  );
});
