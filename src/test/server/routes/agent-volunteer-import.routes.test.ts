import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  ApiVolunteerImportResult,
  ApiVolunteerImportRow,
  DocumentStatusType,
  LangProficiency,
  OpportunityType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { In, Raw } from "typeorm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import VolunteerAgentLink from "../../../data/entity/volunteer/volunteer-agent-link.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { FALLBACK_PLZ } from "../../../server/utils/data/get-or-create-submitter-person";
import { randomNonReferencePostcode, randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type Caller = "admin" | "coordinator" | "ngo" | "outsider";

describe("POST /agent/:id/volunteer-import (be#1332, be#1454)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const mail = (name: string) => `import-${name}-${suffix}@test.need4deed.org`;

  let agent: Agent;
  let otherAgent: Agent;
  let garden: Opportunity;
  let kitchen: Opportunity;
  let postcode: string;
  let postcodeId: number;
  let createdPostcode: Postcode | undefined;
  let unmatchedVolunteer: Volunteer;
  let matchedVolunteer: Volunteer;
  let foreignVolunteer: Volunteer;
  let loosePerson: Person;
  const cookies = {} as Record<Caller, string>;

  const row = (
    name: string,
    over: Partial<ApiVolunteerImportRow> = {},
  ): ApiVolunteerImportRow => ({
    firstName: `Imported ${name}`,
    lastName: `${suffix}`,
    email: mail(name),
    phone: "+49 30 1234567",
    postcode,
    ...over,
  });

  const importRows = (
    rows: ApiVolunteerImportRow[],
    {
      as = "admin",
      dryRun,
      agentId,
    }: { as?: Caller; dryRun?: boolean; agentId?: number } = {},
  ) =>
    fastify.inject({
      method: "POST",
      url: `/agent/${agentId ?? agent.id}/volunteer-import`,
      cookies: { [accessCookieName]: cookies[as] },
      payload: { rows, ...(dryRun !== undefined ? { dryRun } : {}) },
    });

  const report = (res: { json: () => { data: ApiVolunteerImportResult } }) =>
    res.json().data;

  const ownedVolunteers = () =>
    fastify.db.volunteerRepository.find({
      where: { ownerAgentId: agent.id },
      relations: { person: { address: true }, deal: true },
    });

  const ownedByEmail = (name: string) =>
    fastify.db.volunteerRepository.findOne({
      where: { ownerAgentId: agent.id, person: { email: mail(name) } },
      relationLoadStrategy: "query",
      relations: {
        person: { address: true },
        deal: {
          dealLanguage: { language: true },
          dealActivity: { activity: true },
          dealSkill: { skill: true },
          dealDistrict: { district: true },
          dealTimeslot: { timeslot: true },
        },
        opportunityVolunteer: true,
      },
    });

  const links = () =>
    fastify.db.volunteerRepository.manager.find(VolunteerAgentLink, {
      where: { agentId: In([agent.id, otherAgent.id]) },
    });

  const saveVolunteer = async (
    name: string,
    ownerAgentId: number | null = null,
  ) => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Existing", email: mail(name) }),
    );
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId }),
    );
    return fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: person.id, ownerAgentId }),
    );
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const found =
      (await fastify.db.postcodeRepository.findOne({
        where: { value: Raw((v) => `${v} ~ '^0[0-9]{4}$'`) },
      })) ??
      (createdPostcode = await fastify.db.postcodeRepository.save(
        new Postcode({ value: randomNonReferencePostcode("0") }),
      ));
    postcode = found.value;
    postcodeId = found.id;

    [agent, otherAgent] = await fastify.db.agentRepository.save([
      new Agent({
        title: `Import Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
      new Agent({
        title: `Other Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    ]);
    [garden, kitchen] = await fastify.db.opportunityRepository.save([
      new Opportunity({
        title: `Garden Help ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: agent.id,
      }),
      new Opportunity({
        title: `Kitchen ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: agent.id,
      }),
      new Opportunity({
        title: `Elsewhere ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: otherAgent.id,
      }),
    ]);

    const pwHash = await hashPassword(PASSWORD);
    const callers: Record<Caller, [UserRole, Agent?]> = {
      admin: [UserRole.ADMIN],
      coordinator: [UserRole.COORDINATOR],
      ngo: [UserRole.AGENT, agent],
      outsider: [UserRole.AGENT, otherAgent],
    };
    for (const [caller, [role, memberOf]] of Object.entries(callers) as [
      Caller,
      [UserRole, Agent?],
    ][]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Importer", lastName: `${caller}${suffix}` }),
      );
      await fastify.db.userRepository.save(
        new User({
          email: mail(caller),
          password: pwHash,
          role,
          isActive: true,
          personId: person.id,
        }),
      );
      if (memberOf) {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId: memberOf.id,
            personId: person.id,
            role: AgentRoleType.VOLUNTEER_COORDINATOR,
            status: AgentMembershipStatus.ACTIVE,
          }),
        );
      }
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: mail(caller), password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }

    const registered = await fastify.db.personRepository.save(
      new Person({ firstName: "Registered", email: mail("registered") }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: mail("registered"),
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: registered.id,
      }),
    );
    const accountOnly = await fastify.db.personRepository.save(
      new Person({ firstName: "AccountOnly", lastName: `${suffix}` }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: mail("account-only"),
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: accountOnly.id,
      }),
    );

    unmatchedVolunteer = await saveVolunteer("unmatched");
    matchedVolunteer = await saveVolunteer("matched");
    foreignVolunteer = await saveVolunteer("foreign", otherAgent.id);
    await fastify.db.opportunityVolunteerRepository.save([
      new OpportunityVolunteer({
        opportunityId: kitchen.id,
        volunteerId: matchedVolunteer.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
      new OpportunityVolunteer({
        opportunityId: kitchen.id,
        volunteerId: foreignVolunteer.id,
        status: OpportunityVolunteerStatusType.ACTIVE,
      }),
    ]);

    loosePerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Loose", email: mail("loose") }),
    );
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(fastify.notify, "activity").mockResolvedValue(undefined);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const volunteers = await fastify.db.volunteerRepository.find({
      where: [
        { ownerAgentId: In([agent.id, otherAgent.id]) },
        { id: In([unmatchedVolunteer.id, matchedVolunteer.id]) },
      ],
    });
    const volunteerIds = volunteers.map(({ id }) => id);
    await fastify.db.volunteerAuditLogRepository.delete({
      volunteerId: In(volunteerIds),
    });
    await fastify.db.volunteerRepository.delete({ id: In(volunteerIds) });
    await fastify.db.dealRepository.delete({
      id: In(volunteers.map(({ dealId }) => dealId)),
    });
    const persons = await fastify.db.personRepository.find({
      where: [
        { email: Raw((e) => `${e} LIKE '%-${suffix}@test.need4deed.org'`) },
        { lastName: Raw((l) => `${l} LIKE '%${suffix}'`) },
      ],
    });
    const personIds = persons.map(({ id }) => id);
    await fastify.db.agentPersonRepository.delete({ personId: In(personIds) });
    await fastify.db.userRepository.delete({ personId: In(personIds) });
    await fastify.db.personRepository.delete({ id: In(personIds) });
    const addressIds = persons.flatMap(({ addressId }) =>
      addressId ? [addressId] : [],
    );
    if (addressIds.length > 0) {
      await fastify.db.personRepository.manager
        .getRepository(Address)
        .delete({ id: In(addressIds) });
    }
    await fastify.db.opportunityRepository.delete({
      agentId: In([agent.id, otherAgent.id]),
    });
    await fastify.db.agentRepository.delete({
      id: In([agent.id, otherAgent.id]),
    });
    if (createdPostcode) {
      await fastify.db.postcodeRepository.delete({ id: createdPostcode.id });
    }
    await fastify.close();
  });

  it("previews a dry run without writing anything", async () => {
    const res = await importRows(
      [
        row("fresh"),
        row("matched"),
        row("unmatched"),
        row("fresh", { firstName: "Twice" }),
        row("loose", { firstName: "loose" }),
      ],
      { dryRun: true },
    );
    expect(res.statusCode).toBe(200);
    const data = report(res);
    expect(data).toMatchObject({
      dryRun: true,
      created: 2,
      skipped: 3,
      invalid: 0,
    });
    expect(
      data.rows.map(({ outcome, skipReason }) => [outcome, skipReason]),
    ).toEqual([
      ["created", undefined],
      ["skipped", "connected-existing"],
      ["skipped", "email-in-use"],
      ["skipped", "duplicate-in-import"],
      ["created", undefined],
    ]);
    expect(await ownedVolunteers()).toEqual([]);
    expect(await links()).toEqual([]);
    expect(fastify.notify.activity).not.toHaveBeenCalled();
  });

  it("imports the valid rows and reports the invalid ones", async () => {
    const res = await importRows([
      row("good"),
      row("blank", { firstName: "  " }),
      row("bad", { email: "not-an-email" }),
    ]);
    expect(res.statusCode, res.body).toBe(201);
    const data = report(res);
    expect(data).toMatchObject({ created: 1, invalid: 2 });
    expect(data.rows.map(({ errors }) => errors)).toEqual([
      undefined,
      ["firstName is required"],
      ["email is not a valid address"],
    ]);
    expect((await ownedByEmail("good"))?.person.address?.postcodeId).toBe(
      postcodeId,
    );
  });

  it("needs only a first name and an email; an unknown postcode is a warning", async () => {
    const res = await importRows([
      { firstName: "Minimal", email: mail("minimal") },
      row("nowhere", { postcode: "0000x" }),
    ]);
    expect(res.statusCode, res.body).toBe(201);
    const data = report(res);
    expect(data.created).toBe(2);
    expect(data.rows[0].warnings).toBeUndefined();
    expect(data.rows[1].warnings).toEqual(['postcode "0000x" is unknown']);
    const fallbackPostcodeId = (
      await fastify.db.postcodeRepository.findOneByOrFail({
        value: FALLBACK_PLZ,
      })
    ).id;
    for (const name of ["minimal", "nowhere"]) {
      const volunteer = await ownedByEmail(name);
      expect(volunteer?.person.addressId).toBeNull();
      expect(volunteer?.deal.postcodeId).toBe(fallbackPostcodeId);
    }
  });

  it("fills the whole profile and matches the NGO's opportunities", async () => {
    const res = await importRows([
      row("full", {
        languages: [
          { title: "ENGLISCH", proficiency: "FLUENT" as LangProficiency },
          { title: "Notalanguage" },
        ],
        activities: ["kinderbetreuung", " Sports "],
        skills: ["woodworking", "Juggling"],
        districts: ["mitte"],
        availability: [
          { day: "monday" as never, daytime: "morning" as never },
          { day: "Occasionally" as never, daytime: "Weekends" as never },
          { day: "Funday" as never, daytime: "08-11" as never },
        ],
        statusTypes: ["Regular", "accompanying", "EVENTS"] as never,
        statusEngagement: "available" as never,
        goodConductCertificate: "YES" as never,
        measlesVaccination: "maybe" as never,
        infoAbout: " About me ",
        infoExperience: "Lots",
        opportunities: [
          {
            title: `  garden help ${suffix} `,
            status: OpportunityVolunteerStatusType.ACTIVE,
          },
          {
            title: `Elsewhere ${suffix}`,
            status: OpportunityVolunteerStatusType.MATCHED,
          },
        ],
      }),
    ]);
    expect(res.statusCode, res.body).toBe(201);
    const [result] = report(res).rows;
    expect(result.outcome).toBe("created");
    expect([...(result.warnings ?? [])].sort()).toEqual(
      [
        'language "Notalanguage" is unknown',
        'availability "Funday 08-11" is unknown',
        'measles vaccination "maybe" is unknown',
        'opportunity "Elsewhere ' +
          suffix +
          "\" is not one of this NGO's opportunities",
        'skill "Juggling" is unknown',
        'volunteer type "events" dropped: only regular-accompanying kept',
        'engagement status "vol-available" replaced by "vol-active" from the opportunity matches',
      ].sort(),
    );

    const volunteer = await ownedByEmail("full");
    expect(volunteer).toMatchObject({
      statusType: ProfileVolunteeringType.REGULAR_ACCOMPANYING,
      statusCGC: DocumentStatusType.YES,
      statusVaccination: DocumentStatusType.UNDEFINED,
      infoAbout: "About me",
      infoExperience: "Lots",
    });
    const deal = volunteer!.deal;
    expect(
      deal.dealLanguage.map(({ language, proficiency }) => [
        language.title,
        proficiency,
      ]),
    ).toEqual([["English", LangProficiency.FLUENT]]);
    expect(
      deal.dealActivity.map(({ activity }) => activity.title).sort(),
    ).toEqual(["Daycare", "Sports"]);
    expect(deal.dealSkill.map(({ skill }) => skill.title)).toEqual([
      "Woodworking",
    ]);
    expect(deal.dealDistrict.map(({ district }) => district.title)).toEqual([
      "Mitte",
    ]);
    expect(deal.dealTimeslot).toHaveLength(2);
    expect(
      volunteer!.opportunityVolunteer.map(({ opportunityId, status }) => [
        opportunityId,
        status,
      ]),
    ).toEqual([[garden.id, OpportunityVolunteerStatusType.ACTIVE]]);
    expect(volunteer!.statusEngagement).toBe(
      VolunteerStateEngagementType.ACTIVE,
    );
  });

  it("connects an existing need4deed volunteer matched with the NGO, reveals nothing else", async () => {
    const res = await importRows([
      row("matched"),
      row("unmatched"),
      row("foreign"),
      row("registered"),
      row("account-only"),
      row("loose", { firstName: "Anna" }),
    ]);
    expect(res.statusCode, res.body).toBe(201);
    const data = report(res);
    expect(
      data.rows.map(({ outcome, skipReason, volunteerId, errors }) => [
        outcome,
        skipReason,
        volunteerId,
        errors,
      ]),
    ).toEqual([
      ["skipped", "connected-existing", matchedVolunteer.id, undefined],
      ["skipped", "email-in-use", undefined, undefined],
      ["skipped", "email-in-use", undefined, undefined],
      ["skipped", "email-in-use", undefined, undefined],
      ["skipped", "email-in-use", undefined, undefined],
      ["skipped", "email-in-use", undefined, undefined],
    ]);
    expect(await links()).toMatchObject([
      { volunteerId: matchedVolunteer.id, agentId: agent.id },
    ]);
    const unchanged = await fastify.db.volunteerRepository.findOneByOrFail({
      id: matchedVolunteer.id,
    });
    expect(unchanged.ownerAgentId).toBeNull();
    const audit = await fastify.db.volunteerAuditLogRepository.find({
      where: { volunteerId: matchedVolunteer.id },
    });
    expect(
      audit.filter(({ detail }) => detail.startsWith("Connected to")),
    ).toHaveLength(1);

    const notice = vi.mocked(fastify.notify.activity).mock.calls[0][0];
    expect(notice).toContain(agent.title);
    expect(notice).toContain(`connected existing volunteer`);
    expect(notice).toContain(mail("matched"));
    expect(notice).toContain("volunteer not matched with this NGO");
    expect(notice).toContain("volunteer owned by another NGO");
    expect(notice).toContain("registered account");
    expect(notice).toContain("person with another name");

    const again = await importRows([row("matched")]);
    expect(report(again).rows[0].skipReason).toBe("connected-existing");
    expect(await links()).toHaveLength(1);
  });

  it("reuses a person without a profile when the first name matches", async () => {
    const res = await importRows([row("loose", { firstName: "loose" })]);
    expect(report(res).created).toBe(1);
    expect((await ownedByEmail("loose"))?.personId).toBe(loosePerson.id);
  });

  it("lists linked volunteers under filter[ownerAgent] and shows linkedAgents", async () => {
    const list = await fastify.inject({
      method: "GET",
      url: `/volunteer?filter[ownerAgent]=${agent.id}&limit=120`,
      cookies: { [accessCookieName]: cookies.ngo },
    });
    expect(list.statusCode, list.body).toBe(200);
    const ids = (list.json().data as { id: number }[]).map(({ id }) => id);
    expect(ids).toContain(matchedVolunteer.id);
    expect(ids).not.toContain(unmatchedVolunteer.id);

    for (const as of ["admin", "ngo"] as const) {
      const res = await fastify.inject({
        method: "GET",
        url: `/volunteer/${matchedVolunteer.id}`,
        cookies: { [accessCookieName]: cookies[as] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.linkedAgents).toEqual([
        { id: agent.id, title: agent.title },
      ]);
    }
    const outsider = await fastify.inject({
      method: "GET",
      url: `/volunteer/${matchedVolunteer.id}`,
      cookies: { [accessCookieName]: cookies.outsider },
    });
    expect(outsider.json().data?.linkedAgents ?? []).toEqual([]);
  });

  it("is idempotent: importing the same rows again creates nothing", async () => {
    const before = (await ownedVolunteers()).length;
    const res = await importRows([row("good"), row("minimal")]);
    expect(res.statusCode, res.body).toBe(201);
    expect(report(res)).toMatchObject({ created: 0, skipped: 2 });
    expect(fastify.notify.activity).not.toHaveBeenCalled();
    expect(await ownedVolunteers()).toHaveLength(before);
  });

  it("rejects an import where every row is invalid", async () => {
    const res = await importRows([row("bad", { email: "nope" })]);
    expect(res.statusCode).toBe(400);
    expect(report(res)).toMatchObject({ created: 0, invalid: 1 });
  });

  it("never lets an NGO member take over an existing person", async () => {
    await fastify.db.personRepository.save(
      new Person({ firstName: "Solo", email: mail("solo") }),
    );
    const res = await importRows([row("solo", { firstName: "Solo" })], {
      as: "ngo",
    });
    expect(report(res).rows[0].skipReason).toBe("email-in-use");
    expect(await ownedByEmail("solo")).toBeNull();
    expect(vi.mocked(fastify.notify.activity).mock.calls[0][0]).toContain(
      "person without a volunteer profile",
    );
  });

  it("lets an NGO member import for its own NGO only", async () => {
    const own = await importRows([row("by-ngo")], { as: "ngo" });
    expect(own.statusCode).toBe(201);
    expect(report(own).created).toBe(1);
    expect((await importRows([row("x")], { as: "outsider" })).statusCode).toBe(
      404,
    );
    expect(
      (await importRows([row("x")], { as: "coordinator" })).statusCode,
    ).toBe(403);
    expect(
      (await importRows([row("x")], { agentId: 2147483000 })).statusCode,
    ).toBe(404);
  });
});
