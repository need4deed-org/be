import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  LangProficiency,
  LangPurpose,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  toCommuteRange,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import PostcodeCommute from "../../../data/entity/location/postcode-commute.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Activity from "../../../data/entity/profile/activity.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";
const RARE_LANGUAGES = ["uk", "ar", "fa"];

type Caller = "coordinator" | "agent";

interface Profile {
  type?: ProfileVolunteeringType;
  engagement?: VolunteerStateEngagementType;
  languages?: number;
  district?: boolean;
  activity?: boolean;
  fluentGerman?: boolean;
}

describe("recommended matches (be#1184)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  let agent: Agent;
  let otherAgent: Agent;
  let districtId: number;
  let postcodeId: number;
  let appointmentPostcode: { id: number; value: string };
  let languageIds: number[];
  let germanId: number;
  let activityId: number;
  let germanActivityId: number;
  const deals: Deal[] = [];
  const persons: Person[] = [];
  const volunteers: Record<string, Volunteer> = {};
  const opportunities: Record<string, Opportunity> = {};
  const links: OpportunityVolunteer[] = [];
  const accompanyings: Accompanying[] = [];
  const onetimers: Onetimer[] = [];
  const cookies = {} as Record<Caller, string>;
  let appointmentCommute: PostcodeCommute | null = null;
  let insertedAppointmentCommute = false;

  const get = (url: string, as: Caller) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookies[as] },
    });

  const saveDeal = async (
    type: DealType,
    profile: Profile,
    purpose: LangPurpose,
    activity = activityId,
  ) => {
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type, postcodeId }),
    );
    deals.push(deal);
    const dealLanguages = languageIds.slice(0, profile.languages ?? 0).map(
      (languageId) =>
        new DealLanguage({
          dealId: deal.id,
          languageId,
          purpose,
          proficiency: LangProficiency.FLUENT,
        }),
    );
    if (profile.fluentGerman !== undefined) {
      dealLanguages.push(
        new DealLanguage({
          dealId: deal.id,
          languageId: germanId,
          purpose,
          proficiency: profile.fluentGerman
            ? LangProficiency.NATIVE
            : LangProficiency.INTERMEDIATE,
        }),
      );
    }
    await getRepository(dataSource, DealLanguage).save(dealLanguages);
    if (profile.district) {
      await getRepository(dataSource, DealDistrict).save(
        new DealDistrict({ dealId: deal.id, districtId }),
      );
    }
    if (profile.activity) {
      await getRepository(dataSource, DealActivity).save(
        new DealActivity({ dealId: deal.id, activityId: activity }),
      );
    }
    return deal;
  };

  const saveVolunteer = async (key: string, profile: Profile) => {
    const person = await fastify.db.personRepository.save(
      new Person({
        firstName: "Rec",
        lastName: `${key}${suffix}`,
        email: `rec-${key}-${suffix}@test.need4deed.org`,
      }),
    );
    persons.push(person);
    const deal = await saveDeal(
      DealType.VOLUNTEER,
      profile,
      LangPurpose.GENERAL,
    );
    volunteers[key] = await fastify.db.volunteerRepository.save(
      new Volunteer({
        personId: person.id,
        dealId: deal.id,
        statusType: profile.type ?? ProfileVolunteeringType.REGULAR,
        statusEngagement:
          profile.engagement ?? VolunteerStateEngagementType.AVAILABLE,
      }),
    );
  };

  const saveOpportunity = async (
    key: string,
    options: {
      type?: OpportunityType;
      status?: OpportunityStatusType;
      agentId?: number;
      activity?: number;
      appointmentPostcodeId?: number;
      date?: Date;
    } = {},
  ) => {
    const onetimer = options.date
      ? await fastify.db.onetimerRepository.save(
          new Onetimer({ date: options.date }),
        )
      : undefined;
    if (onetimer) {
      onetimers.push(onetimer);
    }
    const accompanying = options.appointmentPostcodeId
      ? await fastify.db.accompanyingRepository.save(
          new Accompanying({
            address: "Teststr. 1",
            name: `Rec ${suffix}`,
            postcodeId: options.appointmentPostcodeId,
          }),
        )
      : undefined;
    if (accompanying) {
      accompanyings.push(accompanying);
    }
    const deal = await saveDeal(
      DealType.OPPORTUNITY,
      { languages: 3, activity: true },
      LangPurpose.GENERAL,
      options.activity,
    );
    opportunities[key] = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Rec ${key} ${suffix}`,
        type: options.type ?? OpportunityType.REGULAR,
        status: options.status ?? OpportunityStatusType.SEARCHING,
        dealId: deal.id,
        districtId: accompanying ? undefined : districtId,
        accompanyingId: accompanying?.id,
        onetimerId: onetimer?.id,
        agentId: options.agentId ?? agent.id,
      }),
    );
  };

  const link = async (volunteerKey: string, opportunityKey: string) => {
    links.push(
      await fastify.db.opportunityVolunteerRepository.save(
        new OpportunityVolunteer({
          volunteerId: volunteers[volunteerKey].id,
          opportunityId: opportunities[opportunityKey].id,
          status: OpportunityVolunteerStatusType.PENDING,
        }),
      ),
    );
  };

  const oursIn = (
    data: { id: number }[],
    from: Record<string, { id: number }>,
  ) => {
    const byId = new Map(Object.entries(from).map(([k, v]) => [v.id, k]));
    return data
      .map(({ id }) => byId.get(id))
      .filter((key): key is string => key !== undefined);
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const [singleDistrictPostcode]: {
      districtId: number;
      postcodeId: number;
      value: string;
    }[] = await dataSource.query(
      `SELECT dp.district_id AS "districtId", p.id AS "postcodeId", p.value
         FROM district_postcode dp
         JOIN postcode p ON p.id = dp.postcode_id
        WHERE NOT EXISTS (SELECT 1 FROM district_postcode other
                           WHERE other.postcode_id = dp.postcode_id
                             AND other.id <> dp.id)
        LIMIT 1`,
    );
    districtId = singleDistrictPostcode.districtId;
    appointmentPostcode = {
      id: singleDistrictPostcode.postcodeId,
      value: singleDistrictPostcode.value,
    };
    postcodeId = (
      await fastify.db.postcodeRepository.findOneOrFail({ where: {} })
    ).id;
    if (postcodeId !== appointmentPostcode.id) {
      const commuteRepository = getRepository(dataSource, PostcodeCommute);
      const pair = {
        fromPostcodeId: postcodeId,
        toPostcodeId: appointmentPostcode.id,
      };
      const inserted = await commuteRepository
        .createQueryBuilder()
        .insert()
        .values(new PostcodeCommute({ ...pair, minutes: 42 }))
        .orIgnore()
        .execute();
      insertedAppointmentCommute = inserted.identifiers.some(Boolean);
      appointmentCommute = await commuteRepository.findOneBy(pair);
    }
    const languages = await fastify.db.languageRepository.find({
      where: { isoCode: In([...RARE_LANGUAGES, "de"]) },
    });
    languageIds = RARE_LANGUAGES.map(
      (isoCode) => languages.find((l) => l.isoCode === isoCode)!.id,
    );
    germanId = languages.find((l) => l.isoCode === "de")!.id;
    const activities = await getRepository(dataSource, Activity).find({
      relations: ["category"],
    });
    activityId = activities.find(
      (a) => a.category?.title !== "de-lng-support",
    )!.id;
    germanActivityId = activities.find(
      (a) => a.category?.title === "de-lng-support",
    )!.id;

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Rec Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    otherAgent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Rec Other ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );

    await saveOpportunity("regular");
    await saveOpportunity("elsewhere");
    await saveOpportunity("german", { activity: germanActivityId });
    await saveOpportunity("otherAgents", { agentId: otherAgent.id });
    await saveOpportunity("notSearching", {
      status: OpportunityStatusType.ACTIVE,
    });
    await saveOpportunity("event", { type: OpportunityType.EVENTS });
    await saveOpportunity("pastEvent", {
      type: OpportunityType.EVENTS,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    await saveOpportunity("accompanying", {
      type: OpportunityType.ACCOMPANYING,
      agentId: otherAgent.id,
      appointmentPostcodeId: appointmentPostcode.id,
    });

    await saveVolunteer("best", {
      languages: 3,
      district: true,
      activity: true,
      fluentGerman: true,
    });
    await saveVolunteer("second", { languages: 3, district: true });
    await saveVolunteer("third", { languages: 2 });
    await saveVolunteer("notAvailable", {
      languages: 3,
      district: true,
      activity: true,
      engagement: VolunteerStateEngagementType.ACTIVE,
    });
    await saveVolunteer("accompanyingOnly", {
      languages: 3,
      district: true,
      activity: true,
      type: ProfileVolunteeringType.ACCOMPANYING,
    });
    await saveVolunteer("regularAccompanying", {
      languages: 3,
      district: true,
      activity: true,
      type: ProfileVolunteeringType.REGULAR_ACCOMPANYING,
    });
    await saveVolunteer("alreadySuggested", {
      languages: 3,
      district: true,
      activity: true,
    });
    await saveVolunteer("askedElsewhere", {
      languages: 3,
      district: true,
      activity: true,
    });
    await saveVolunteer("events", {
      languages: 3,
      type: ProfileVolunteeringType.EVENTS,
    });
    await saveVolunteer("weakGerman", {
      languages: 3,
      district: true,
      activity: true,
      fluentGerman: false,
    });

    await link("alreadySuggested", "regular");
    await link("askedElsewhere", "elsewhere");
    await link("best", "elsewhere");

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      coordinator: UserRole.COORDINATOR,
      agent: UserRole.AGENT,
    };
    for (const caller of Object.keys(roles) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Rec", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      if (caller === "agent") {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId: agent.id,
            personId: person.id,
            role: AgentRoleType.VOLUNTEER_COORDINATOR,
            status: AgentMembershipStatus.ACTIVE,
          }),
        );
      }
      const email = `rec-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: roles[caller],
          isActive: true,
          personId: person.id,
        }),
      );
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }
  });

  afterAll(async () => {
    if (insertedAppointmentCommute && appointmentCommute) {
      await getRepository(dataSource, PostcodeCommute).delete({
        fromPostcodeId: appointmentCommute.fromPostcodeId,
        toPostcodeId: appointmentCommute.toPostcodeId,
      });
    }
    await fastify.db.opportunityVolunteerRepository.delete({
      id: In(links.map(({ id }) => id)),
    });
    await fastify.db.volunteerRepository.delete({
      id: In(Object.values(volunteers).map(({ id }) => id)),
    });
    await fastify.db.opportunityRepository.delete({
      id: In(Object.values(opportunities).map(({ id }) => id)),
    });
    await fastify.db.dealRepository.delete({
      id: In(deals.map(({ id }) => id)),
    });
    if (onetimers.length) {
      await fastify.db.onetimerRepository.delete({
        id: In(onetimers.map(({ id }) => id)),
      });
    }
    if (accompanyings.length) {
      await fastify.db.accompanyingRepository.delete({
        id: In(accompanyings.map(({ id }) => id)),
      });
    }
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
    }
    await fastify.db.personRepository.delete({
      id: In(persons.map(({ id }) => id)),
    });
    await fastify.db.agentRepository.delete({
      id: In([agent.id, otherAgent.id]),
    });
    await fastify.close();
  });

  describe("GET /opportunity/:id/recommended-volunteers", () => {
    const recommend = (key: string, as: Caller, limit = 10) =>
      get(
        `/opportunity/${opportunities[key].id}/recommended-volunteers?limit=${limit}`,
        as,
      );

    it("ranks available volunteers of a fitting type, best first, skipping suggested ones", async () => {
      const res = await recommend("regular", "coordinator");
      expect(res.statusCode).toBe(200);
      const ours = oursIn(res.json().data, volunteers);
      expect(ours.slice(0, 5)).toEqual([
        "best",
        "regularAccompanying",
        "askedElsewhere",
        "weakGerman",
        "second",
      ]);
      expect(ours).not.toContain("notAvailable");
      expect(ours).not.toContain("accompanyingOnly");
      expect(ours).not.toContain("alreadySuggested");
    });

    it("defaults to 3 results", async () => {
      const res = await get(
        `/opportunity/${opportunities.regular.id}/recommended-volunteers`,
        "coordinator",
      );
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(3);
    });

    it("rejects a limit above the maximum", async () => {
      const res = await recommend("regular", "coordinator", 11);
      expect(res.statusCode).toBe(400);
    });

    it("only recommends fluent or native German speakers for a German opportunity", async () => {
      const res = await recommend("german", "coordinator");
      const ours = oursIn(res.json().data, volunteers);
      expect(ours).toContain("best");
      expect(ours).not.toContain("weakGerman");
      expect(ours).not.toContain("second");
    });

    it("gives an NGO only volunteers who were never asked for anything, masked", async () => {
      const res = await recommend("regular", "agent");
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      const ours = oursIn(data, volunteers);
      expect(ours).toContain("regularAccompanying");
      expect(ours).not.toContain("askedElsewhere");
      expect(ours).not.toContain("best");
      const regularAccompanying = data.find(
        (row: { id: number }) => row.id === volunteers.regularAccompanying.id,
      );
      expect(regularAccompanying.email).not.toContain("@");
    });

    it("recommends nobody for an event that is already over", async () => {
      const res = await recommend("pastEvent", "coordinator");
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    });

    it("recommends nobody for an opportunity that is not searching", async () => {
      const res = await recommend("notSearching", "coordinator");
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    });

    it.each(["coordinator", "agent"] as const)(
      "carries the commute for each volunteer to a %s, 0 to 5 minutes in the same postcode",
      async (as) => {
        const res = await recommend("regular", as);
        expect(res.statusCode).toBe(200);
        const data: { id: number; commute: unknown }[] = res.json().data;
        expect(data.length).toBeGreaterThan(0);
        data.forEach((row) => expect(row).toHaveProperty("commute"));
        const ourIds = new Set(Object.values(volunteers).map(({ id }) => id));
        data
          .filter(({ id }) => ourIds.has(id))
          .forEach(({ commute }) =>
            expect(commute).toEqual({ min: 0, max: 5 }),
          );
      },
    );

    it("hides another NGO's opportunity from an NGO user", async () => {
      const res = await recommend("otherAgents", "agent");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /volunteer/:id/recommended-opportunities", () => {
    const recommend = (key: string, as: Caller) =>
      get(
        `/volunteer/${volunteers[key].id}/recommended-opportunities?limit=10`,
        as,
      );

    it("ranks searching opportunities of a fitting type, skipping linked ones", async () => {
      const res = await recommend("best", "coordinator");
      expect(res.statusCode).toBe(200);
      const ours = oursIn(res.json().data, opportunities);
      expect(ours).toEqual(
        expect.arrayContaining(["regular", "german", "otherAgents"]),
      );
      expect(ours).not.toContain("elsewhere");
      expect(ours).not.toContain("notSearching");
      expect(ours).not.toContain("event");
    });

    it("lists an accompanying opportunity with its appointment location", async () => {
      const res = await recommend("accompanyingOnly", "coordinator");
      expect(res.statusCode).toBe(200);
      const item = res
        .json()
        .data.find(
          (row: { id: number }) => row.id === opportunities.accompanying.id,
        );
      expect(item.postcode).toBe(appointmentPostcode.value);
      expect(item.district.id).toBe(districtId);
    });

    it("carries the commute to each opportunity", async () => {
      const res = await recommend("accompanyingOnly", "coordinator");
      expect(res.statusCode).toBe(200);
      const data: { id: number; commute: unknown }[] = res.json().data;
      data.forEach((row) => expect(row).toHaveProperty("commute"));
      const item = data.find(({ id }) => id === opportunities.accompanying.id);
      expect(item?.commute).toEqual(
        postcodeId === appointmentPostcode.id
          ? { min: 0, max: 5 }
          : toCommuteRange(appointmentCommute?.minutes),
      );
    });

    it("skips events that are already over", async () => {
      const res = await recommend("events", "coordinator");
      const ours = oursIn(res.json().data, opportunities);
      expect(ours).toContain("event");
      expect(ours).not.toContain("pastEvent");
    });

    it("recommends nothing to a volunteer who is not available", async () => {
      const res = await recommend("notAvailable", "coordinator");
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    });

    it("applies the German rule from the volunteer side too", async () => {
      const res = await recommend("weakGerman", "coordinator");
      const ours = oursIn(res.json().data, opportunities);
      expect(ours).toContain("regular");
      expect(ours).not.toContain("german");
    });

    it("is coordinator-only", async () => {
      const res = await recommend("best", "agent");
      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });
});
