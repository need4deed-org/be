import { FastifyInstance } from "fastify";
import {
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  accessCookieName,
  titleOrphanageAgent,
} from "../../../config/constants";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OrganizationPerson from "../../../data/entity/m2m/organization-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Organization from "../../../data/entity/organization.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getPostcode, hashPassword } from "../../../data/utils";
import logger from "../../../logger";
import { createServer } from "../../../server";
import { erasedEmailFor } from "../../../server/utils/data/erase-person-pii";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("groups: admin CRUD, group-scoped coordinator access, and removal", () => {
  let fastify: FastifyInstance;
  let adminCookie: string;
  let n4dCoordinatorCookie: string;
  let plainVolunteerCookie: string;
  let orphanageAgent: Agent;
  let defaultPostcodeId: number;

  const createdGroupIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdVolunteerIds: number[] = [];
  const createdOpportunityIds: number[] = [];
  const createdDealIds: number[] = [];
  const createdAgentIds: number[] = [];
  const createdOrgIds: number[] = [];
  const createdPersonIds: number[] = [];
  const createdAddressIds: number[] = [];

  async function createPerson(label: string) {
    const suffix = randomNumericSuffix();
    const address = await fastify.db.agentRepository.manager.save(
      new Address({
        street: `Group Str ${suffix}`,
        city: "Berlin",
        postcodeId: defaultPostcodeId,
      }),
    );
    createdAddressIds.push(address.id);
    const person = await fastify.db.personRepository.save(
      new Person({
        firstName: label,
        lastName: `Tester-${suffix}`,
        email: `${label.toLowerCase()}-${suffix}@group-test.need4deed.org`,
        phone: `+4930${suffix.slice(0, 7)}`,
        addressId: address.id,
      }),
    );
    createdPersonIds.push(person.id);
    return person;
  }

  async function createAccount(role: UserRole, label: string = role) {
    const suffix = randomNumericSuffix();
    const person = await createPerson(label);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `grp-${role}-${suffix}@group-test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    return { user, person };
  }

  async function login(user: User): Promise<string> {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: PASSWORD },
    });
    const cookie = response.cookies.find(
      ({ name }) => name === accessCookieName,
    );
    if (!cookie) {
      throw new Error(`login failed for ${user.email}: ${response.statusCode}`);
    }
    return cookie.value;
  }

  async function createOrg(label: string) {
    const suffix = randomNumericSuffix();
    const org = await fastify.db.organizationRepository.save(
      new Organization({ title: `${label}-${suffix}` }),
    );
    createdOrgIds.push(org.id);
    return org;
  }

  async function createAgent(label: string, organizationId?: number) {
    const suffix = randomNumericSuffix();
    const address = await fastify.db.agentRepository.manager.save(
      new Address({
        street: `Agent Str ${suffix}`,
        city: "Berlin",
        postcodeId: defaultPostcodeId,
      }),
    );
    createdAddressIds.push(address.id);
    const agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `${label}-${suffix}`,
        organizationId,
        addressId: address.id,
      }),
    );
    createdAgentIds.push(agent.id);
    return agent;
  }

  async function createVolunteer(
    label: string,
    ownerAgentId: number | null,
    withLogin = false,
  ) {
    const suffix = randomNumericSuffix();
    const person = await createPerson(label);
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: defaultPostcodeId }),
    );
    createdDealIds.push(deal.id);
    const volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        personId: person.id,
        dealId: deal.id,
        ownerAgentId,
        statusEngagement: VolunteerStateEngagementType.AVAILABLE,
        infoAbout: `About ${label} ${suffix}`,
      }),
    );
    createdVolunteerIds.push(volunteer.id);
    let user: User | undefined;
    if (withLogin) {
      user = await fastify.db.userRepository.save(
        new User({
          email: `vol-${suffix}@group-test.need4deed.org`,
          password: await hashPassword(PASSWORD),
          role: UserRole.VOLUNTEER,
          isActive: true,
          personId: person.id,
        }),
      );
      createdUserIds.push(user.id);
    }
    return { volunteer, person, user };
  }

  async function createOpportunity(label: string, agentId: number) {
    const suffix = randomNumericSuffix();
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: defaultPostcodeId }),
    );
    createdDealIds.push(deal.id);
    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `${label}-${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.SEARCHING,
        agentId,
        dealId: deal.id,
      }),
    );
    createdOpportunityIds.push(opportunity.id);
    return opportunity;
  }

  function inject(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    cookie?: string,
    payload?: object,
  ) {
    return fastify.inject({
      method,
      url,
      payload,
      cookies: cookie ? { [accessCookieName]: cookie } : undefined,
    });
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    const postcode = await getPostcode("10115");
    if (!postcode) {
      throw new Error("Seeded postcode 10115 not found.");
    }
    defaultPostcodeId = postcode.id;
    orphanageAgent = await fastify.db.agentRepository.findOneOrFail({
      where: { title: titleOrphanageAgent },
      order: { id: "ASC" },
    });

    adminCookie = await login(
      (await createAccount(UserRole.ADMIN, "Admin")).user,
    );
    n4dCoordinatorCookie = await login(
      (await createAccount(UserRole.COORDINATOR, "N4DCoord")).user,
    );
    plainVolunteerCookie = await login(
      (await createAccount(UserRole.VOLUNTEER, "PlainVol")).user,
    );
  });

  afterAll(async () => {
    if (createdGroupIds.length) {
      await fastify.db.volunteerGroupRepository.delete({
        id: In(createdGroupIds),
      });
    }
    if (createdOrgIds.length) {
      await fastify.db.volunteerGroupRepository.delete({
        organizationId: In(createdOrgIds),
      });
    }
    if (createdAgentIds.length) {
      await fastify.db.volunteerGroupRepository.delete({
        agentId: In(createdAgentIds),
      });
    }
    if (createdOpportunityIds.length) {
      await fastify.db.opportunityVolunteerRepository.delete({
        opportunityId: In(createdOpportunityIds),
      });
      await fastify.db.commentRepository.delete({
        entityId: In(createdOpportunityIds),
      });
      await fastify.db.opportunityRepository.delete({
        id: In(createdOpportunityIds),
      });
    }
    if (createdVolunteerIds.length) {
      await fastify.db.opportunityVolunteerRepository.delete({
        volunteerId: In(createdVolunteerIds),
      });
      await fastify.db.commentRepository.delete({
        entityId: In(createdVolunteerIds),
      });
      await fastify.db.volunteerRepository.delete({
        id: In(createdVolunteerIds),
      });
    }
    if (createdDealIds.length) {
      await fastify.db.dealRepository.delete({ id: In(createdDealIds) });
    }
    if (createdAgentIds.length) {
      await fastify.db.agentPersonRepository.delete({
        agentId: In(createdAgentIds),
      });
      await fastify.db.agentRepository.delete({ id: In(createdAgentIds) });
    }
    if (createdOrgIds.length) {
      await fastify.db.organizationPersonRepository.delete({
        organizationId: In(createdOrgIds),
      });
      await fastify.db.organizationRepository.delete({ id: In(createdOrgIds) });
    }
    if (createdUserIds.length) {
      await fastify.db.commentRepository.delete({
        userId: In(createdUserIds),
      });
      await fastify.db.userRepository.delete({ id: In(createdUserIds) });
    }
    if (createdPersonIds.length) {
      await fastify.db.personRepository.delete({ id: In(createdPersonIds) });
    }
    if (createdAddressIds.length) {
      await fastify.db.agentRepository.manager.delete(Address, {
        id: In(createdAddressIds),
      });
    }
    await fastify.close();
  });

  describe("ADMIN-only CRUD on /group", () => {
    it("rejects non-admin callers on every group endpoint", async () => {
      const agent = await createAgent("AuthCheckAgent");
      const created = await inject("POST", "/group", adminCookie, {
        title: "Auth Check Group",
        agentId: agent.id,
      });
      expect(created.statusCode).toBe(201);
      const groupId = created.json().data.id;
      createdGroupIds.push(groupId);

      for (const cookie of [n4dCoordinatorCookie, plainVolunteerCookie]) {
        expect((await inject("GET", "/group", cookie)).statusCode).toBe(403);
        expect(
          (await inject("GET", `/group/${groupId}`, cookie)).statusCode,
        ).toBe(403);
        expect(
          (
            await inject("POST", "/group", cookie, {
              title: "Nope",
              agentId: agent.id,
            })
          ).statusCode,
        ).toBe(403);
        expect(
          (
            await inject("PATCH", `/group/${groupId}`, cookie, {
              title: "Nope",
            })
          ).statusCode,
        ).toBe(403);
        expect(
          (await inject("DELETE", `/group/${groupId}`, cookie)).statusCode,
        ).toBe(403);
      }

      expect((await inject("GET", "/group")).statusCode).toBe(401);
    });

    it("creates, lists, fetches, renames, and validates scope rules for Träger and Einrichtung groups", async () => {
      const infoSpy = vi.spyOn(logger, "info");
      const org = await createOrg("TrägerGroup");
      const orgAgentA = await createAgent("TrägerAgentA", org.id);
      const orgAgentB = await createAgent("TrägerAgentB", org.id);
      const soloAgent = await createAgent("SoloAgent");

      await createVolunteer("OrgVolA", orgAgentA.id);
      await createVolunteer("OrgVolB", orgAgentB.id);
      await createOpportunity("OrgOppA", orgAgentA.id);
      const { person: orgManager } = await createAccount(
        UserRole.AGENT,
        "OrgMgr",
      );
      await fastify.db.organizationPersonRepository.save(
        new OrganizationPerson({
          organizationId: org.id,
          personId: orgManager.id,
          role: AgentRoleType.MANAGER,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
      // An agent_person row on a child Einrichtung must NOT count as a Träger group account.
      const { person: childAgentUser } = await createAccount(
        UserRole.AGENT,
        "ChildOnly",
      );
      await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId: orgAgentA.id,
          personId: childAgentUser.id,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );

      // Invalid POST payloads
      expect(
        (
          await inject("POST", "/group", adminCookie, {
            title: "Both Scopes",
            organizationId: org.id,
            agentId: soloAgent.id,
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (await inject("POST", "/group", adminCookie, { title: "No Scope" }))
          .statusCode,
      ).toBe(400);
      expect(
        (
          await inject("POST", "/group", adminCookie, {
            title: "   ",
            agentId: soloAgent.id,
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await inject("POST", "/group", adminCookie, {
            title: "Missing Org",
            organizationId: 999999999,
          })
        ).statusCode,
      ).toBe(404);

      // Create Träger group
      const orgPost = await inject("POST", "/group", adminCookie, {
        title: "  Träger Alpha  ",
        organizationId: org.id,
      });
      expect(orgPost.statusCode).toBe(201);
      const orgGroup = orgPost.json().data;
      createdGroupIds.push(orgGroup.id);
      expect(orgGroup).toMatchObject({
        title: "Träger Alpha",
        organizationId: org.id,
        organizationTitle: org.title,
        agentId: null,
        agentTitle: null,
        counts: { volunteers: 2, opportunities: 1, accounts: 1 },
      });

      // Duplicate & overlapping scope conflicts
      expect(
        (
          await inject("POST", "/group", adminCookie, {
            title: "Dup Org",
            organizationId: org.id,
          })
        ).statusCode,
      ).toBe(409);
      expect(
        (
          await inject("POST", "/group", adminCookie, {
            title: "Overlap Child Agent",
            agentId: orgAgentA.id,
          })
        ).statusCode,
      ).toBe(409);

      // Create single-Einrichtung group
      const agentPost = await inject("POST", "/group", adminCookie, {
        title: "Einrichtung Beta",
        agentId: soloAgent.id,
      });
      expect(agentPost.statusCode).toBe(201);
      const agentGroup = agentPost.json().data;
      createdGroupIds.push(agentGroup.id);
      expect(agentGroup).toMatchObject({
        title: "Einrichtung Beta",
        organizationId: null,
        organizationTitle: null,
        agentId: soloAgent.id,
        agentTitle: soloAgent.title,
        counts: { volunteers: 0, opportunities: 0, accounts: 0 },
      });

      // List and get
      const listRes = await inject("GET", "/group", adminCookie);
      expect(listRes.statusCode).toBe(200);
      const listedIds = listRes.json().data.map((g: { id: number }) => g.id);
      expect(listedIds).toContain(orgGroup.id);
      expect(listedIds).toContain(agentGroup.id);

      const getRes = await inject("GET", `/group/${orgGroup.id}`, adminCookie);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.json().data.counts).toEqual({
        volunteers: 2,
        opportunities: 1,
        accounts: 1,
      });

      // Rename only on PATCH
      expect(
        (
          await inject("PATCH", `/group/${orgGroup.id}`, adminCookie, {
            title: "Bad Patch",
            agentId: soloAgent.id,
          })
        ).statusCode,
      ).toBe(400);

      const patchRes = await inject(
        "PATCH",
        `/group/${orgGroup.id}`,
        adminCookie,
        { title: "Träger Alpha Renamed" },
      );
      expect(patchRes.statusCode).toBe(200);
      expect(patchRes.json().data.title).toBe("Träger Alpha Renamed");

      expect(
        infoSpy.mock.calls.some(
          ([msg]) =>
            typeof msg === "string" &&
            msg.includes(`created group ${orgGroup.id}`),
        ),
      ).toBe(true);
      expect(
        infoSpy.mock.calls.some(
          ([msg]) =>
            typeof msg === "string" &&
            msg.includes(`renamed group ${orgGroup.id}`),
        ),
      ).toBe(true);
      infoSpy.mockRestore();
    });
  });

  describe("group-scoped coordinator access", () => {
    it("limits a Träger group coordinator (organization_person) to the Träger's volunteers and opportunities", async () => {
      const org = await createOrg("ScopedTräger");
      const orgAgent1 = await createAgent("ScopedAgent1", org.id);
      const orgAgent2 = await createAgent("ScopedAgent2", org.id);
      const outsideAgent = await createAgent("OutsideAgent");

      const groupRes = await inject("POST", "/group", adminCookie, {
        title: "Scoped Träger Group",
        organizationId: org.id,
      });
      expect(groupRes.statusCode).toBe(201);
      createdGroupIds.push(groupRes.json().data.id);

      const { volunteer: groupVol1, person: groupVol1Person } =
        await createVolunteer("GroupVol1", orgAgent1.id);
      const { volunteer: groupVol2 } = await createVolunteer(
        "GroupVol2",
        orgAgent2.id,
      );
      const { volunteer: platformVol } = await createVolunteer(
        "PlatformVol",
        null,
      );
      const { volunteer: outsideVol } = await createVolunteer(
        "OutsideVol",
        outsideAgent.id,
      );

      const groupOpp1 = await createOpportunity("GroupOpp1", orgAgent1.id);
      const groupOpp2 = await createOpportunity("GroupOpp2", orgAgent2.id);
      const outsideOpp = await createOpportunity("OutsideOpp", outsideAgent.id);

      // Group coordinator via organization_person (AGENT login)
      const { user: orgCoordAgent, person: orgCoordAgentPerson } =
        await createAccount(UserRole.AGENT, "OrgCoordAgent");
      await fastify.db.organizationPersonRepository.save(
        new OrganizationPerson({
          organizationId: org.id,
          personId: orgCoordAgentPerson.id,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
      const orgCoordAgentCookie = await login(orgCoordAgent);

      // Group coordinator via organization_person (COORDINATOR login)
      const { user: orgCoordStaff, person: orgCoordStaffPerson } =
        await createAccount(UserRole.COORDINATOR, "OrgCoordStaff");
      await fastify.db.organizationPersonRepository.save(
        new OrganizationPerson({
          organizationId: org.id,
          personId: orgCoordStaffPerson.id,
          role: AgentRoleType.MANAGER,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
      const orgCoordStaffCookie = await login(orgCoordStaff);

      for (const cookie of [orgCoordAgentCookie, orgCoordStaffCookie]) {
        // GET /volunteer lists ONLY the group's volunteers (no platform or outside volunteers)
        const volList = await inject("GET", "/volunteer?limit=100", cookie);
        expect(volList.statusCode).toBe(200);
        const volIds = volList.json().data.map((v: { id: number }) => v.id);
        expect(volIds).toEqual(
          expect.arrayContaining([groupVol1.id, groupVol2.id]),
        );
        expect(volIds).not.toContain(platformVol.id);
        expect(volIds).not.toContain(outsideVol.id);

        // GET /volunteer/:id unmasked for own group, 404 for platform & outside
        const ownVolRes = await inject(
          "GET",
          `/volunteer/${groupVol1.id}`,
          cookie,
        );
        expect(ownVolRes.statusCode).toBe(200);
        expect(ownVolRes.json().data.person.firstName).toBe(
          groupVol1Person.firstName,
        );
        expect(
          (await inject("GET", `/volunteer/${platformVol.id}`, cookie))
            .statusCode,
        ).toBe(404);
        expect(
          (await inject("GET", `/volunteer/${outsideVol.id}`, cookie))
            .statusCode,
        ).toBe(404);

        // PATCH /volunteer/:id allowed for own group, 404 for outside/platform
        const patchOwnVol = await inject(
          "PATCH",
          `/volunteer/${groupVol1.id}`,
          cookie,
          { infoAbout: "Updated by group coordinator" },
        );
        expect(patchOwnVol.statusCode).toBe(200);
        expect(
          (
            await inject("PATCH", `/volunteer/${platformVol.id}`, cookie, {
              infoAbout: "Should fail",
            })
          ).statusCode,
        ).toBe(404);
        expect(
          (
            await inject("PATCH", `/volunteer/${outsideVol.id}`, cookie, {
              infoAbout: "Should fail",
            })
          ).statusCode,
        ).toBe(404);

        // GET /opportunity lists ONLY the group's opportunities
        const oppList = await inject("GET", "/opportunity?limit=100", cookie);
        expect(oppList.statusCode).toBe(200);
        const oppIds = oppList.json().data.map((o: { id: number }) => o.id);
        expect(oppIds).toEqual(
          expect.arrayContaining([groupOpp1.id, groupOpp2.id]),
        );
        expect(oppIds).not.toContain(outsideOpp.id);

        // GET & PATCH /opportunity/:id allowed for group, 404 for outside
        expect(
          (await inject("GET", `/opportunity/${groupOpp1.id}`, cookie))
            .statusCode,
        ).toBe(200);
        expect(
          (await inject("GET", `/opportunity/${outsideOpp.id}`, cookie))
            .statusCode,
        ).toBe(404);
        expect(
          (
            await inject("PATCH", `/opportunity/${groupOpp2.id}`, cookie, {
              title: "Group Opp2 Renamed",
            })
          ).statusCode,
        ).toBe(204);
        expect(
          (
            await inject("PATCH", `/opportunity/${outsideOpp.id}`, cookie, {
              title: "Should fail",
            })
          ).statusCode,
        ).toBe(404);

        // Matching: cannot match an out-of-group volunteer or opportunity
        expect(
          (
            await inject("POST", "/opportunity-volunteer", cookie, {
              opportunityId: groupOpp1.id,
              volunteerId: platformVol.id,
              status: OpportunityVolunteerStatusType.MATCHED,
            })
          ).statusCode,
        ).toBe(404);
        expect(
          (
            await inject("POST", "/opportunity-volunteer", cookie, {
              opportunityId: outsideOpp.id,
              volunteerId: groupVol1.id,
              status: OpportunityVolunteerStatusType.MATCHED,
            })
          ).statusCode,
        ).toBe(404);
      }

      // Matching inside the group succeeds with coordinator statuses
      const matchRes = await inject(
        "POST",
        "/opportunity-volunteer",
        orgCoordAgentCookie,
        {
          opportunityId: groupOpp1.id,
          volunteerId: groupVol1.id,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      );
      expect(matchRes.statusCode).toBe(201);

      // need4deed coordinator (not in any group) still sees and edits everything
      expect(
        (
          await inject(
            "GET",
            `/volunteer/${platformVol.id}`,
            n4dCoordinatorCookie,
          )
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await inject(
            "GET",
            `/volunteer/${groupVol1.id}`,
            n4dCoordinatorCookie,
          )
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await inject(
            "GET",
            `/opportunity/${groupOpp1.id}`,
            n4dCoordinatorCookie,
          )
        ).statusCode,
      ).toBe(200);
    });

    it("limits a single-Einrichtung group coordinator (agent_person) and keeps regular NGO Vorschlag anfragen unchanged", async () => {
      const groupAgent = await createAgent("SingleGroupAgent");
      const otherAgent = await createAgent("RegularNgoAgent");
      const thirdAgent = await createAgent("ThirdNgoAgent");

      const groupRes = await inject("POST", "/group", adminCookie, {
        title: "Single Einrichtung Group",
        agentId: groupAgent.id,
      });
      expect(groupRes.statusCode).toBe(201);
      createdGroupIds.push(groupRes.json().data.id);

      const { volunteer: groupVol } = await createVolunteer(
        "SingleGroupVol",
        groupAgent.id,
      );
      const { volunteer: platformVol } = await createVolunteer(
        "PlatformVolForSingle",
        null,
      );
      const { volunteer: thirdVol } = await createVolunteer(
        "ThirdNgoVol",
        thirdAgent.id,
      );

      const groupOpp = await createOpportunity("SingleGroupOpp", groupAgent.id);
      const otherOpp = await createOpportunity("RegularNgoOpp", otherAgent.id);

      // Coordinator of the single-Einrichtung group via agent_person
      const { user: singleGroupCoord, person: singleGroupCoordPerson } =
        await createAccount(UserRole.AGENT, "SingleCoord");
      await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId: groupAgent.id,
          personId: singleGroupCoordPerson.id,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
      const singleGroupCookie = await login(singleGroupCoord);

      const volList = await inject(
        "GET",
        "/volunteer?limit=100",
        singleGroupCookie,
      );
      expect(volList.statusCode).toBe(200);
      const volIds = volList.json().data.map((v: { id: number }) => v.id);
      expect(volIds).toContain(groupVol.id);
      expect(volIds).not.toContain(platformVol.id);
      expect(volIds).not.toContain(thirdVol.id);

      expect(
        (
          await inject(
            "PATCH",
            `/volunteer/${groupVol.id}`,
            singleGroupCookie,
            {
              infoAbout: "Edited by single-agent group coordinator",
            },
          )
        ).statusCode,
      ).toBe(200);
      expect(
        (await inject("GET", `/opportunity/${groupOpp.id}`, singleGroupCookie))
          .statusCode,
      ).toBe(200);
      expect(
        (await inject("GET", `/opportunity/${otherOpp.id}`, singleGroupCookie))
          .statusCode,
      ).toBe(404);

      // Regular non-group NGO member keeps "Vorschlag anfragen" flow unchanged
      const { user: regularNgo, person: regularNgoPerson } =
        await createAccount(UserRole.AGENT, "RegularNgo");
      await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId: otherAgent.id,
          personId: regularNgoPerson.id,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
      const { person: thirdNgoMember } = await createAccount(
        UserRole.AGENT,
        "ThirdNgoMember",
      );
      await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId: thirdAgent.id,
          personId: thirdNgoMember.id,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
      await fastify.db.agentRepository.update(
        { id: In([otherAgent.id, thirdAgent.id]) },
        { sharesVolunteers: true },
      );

      const regularNgoCookie = await login(regularNgo);
      const suggestionRes = await inject(
        "POST",
        `/volunteer/${thirdVol.id}/suggestion-request`,
        regularNgoCookie,
        { opportunityId: otherOpp.id },
      );
      expect(suggestionRes.statusCode).toBe(201);
      // Regular NGO still sees platform volunteer (masked)
      expect(
        (await inject("GET", `/volunteer/${platformVol.id}`, regularNgoCookie))
          .statusCode,
      ).toBe(200);
      // Clean up suggestion-request comment
      await fastify.db.commentRepository.delete({
        entityId: thirdVol.id,
      } as Partial<Comment>);
    });
  });

  describe("DELETE /group/:id hand-back and PII erasure", () => {
    it("hands volunteers, opportunities, and users back to need4deed and erases group people's PII", async () => {
      const org = await createOrg("DeleteTräger");
      const orgAgent = await createAgent("DeleteTrägerAgent", org.id);
      const bystanderAgent = await createAgent("BystanderAgent");

      const {
        volunteer: groupVol,
        person: groupVolPerson,
        user: groupVolUser,
      } = await createVolunteer("GroupVolToErase", orgAgent.id, true);
      const { volunteer: bystanderVol, person: bystanderPerson } =
        await createVolunteer("BystanderVol", bystanderAgent.id);

      const groupOpp = await createOpportunity(
        "GroupOppToHandBack",
        orgAgent.id,
      );
      const bystanderOpp = await createOpportunity(
        "BystanderOpp",
        bystanderAgent.id,
      );

      const { user: groupCoordUser, person: groupCoordPerson } =
        await createAccount(UserRole.AGENT, "GroupCoordToErase");
      await fastify.db.organizationPersonRepository.save(
        new OrganizationPerson({
          organizationId: org.id,
          personId: groupCoordPerson.id,
          role: AgentRoleType.MANAGER,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );

      const createRes = await inject("POST", "/group", adminCookie, {
        title: "Group To Delete",
        organizationId: org.id,
      });
      expect(createRes.statusCode).toBe(201);
      const groupId = createRes.json().data.id;
      createdGroupIds.push(groupId);

      const infoSpy = vi.spyOn(logger, "info");
      const deleteRes = await inject(
        "DELETE",
        `/group/${groupId}`,
        adminCookie,
      );
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.json().data).toEqual({
        id: groupId,
        counts: { volunteers: 1, opportunities: 1, accounts: 1 },
        erasedPersons: 2,
      });
      expect(
        infoSpy.mock.calls.some(
          ([msg]) =>
            typeof msg === "string" && msg.includes(`deleted group ${groupId}`),
        ),
      ).toBe(true);
      infoSpy.mockRestore();

      // Group row removed
      expect(
        await fastify.db.volunteerGroupRepository.findOneBy({ id: groupId }),
      ).toBeNull();
      expect(
        (await inject("GET", `/group/${groupId}`, adminCookie)).statusCode,
      ).toBe(404);

      // Volunteer handed back to need4deed (ownerAgentId = null), row preserved
      const reloadedVol = await fastify.db.volunteerRepository.findOneByOrFail({
        id: groupVol.id,
      });
      expect(reloadedVol.ownerAgentId).toBeNull();

      // Opportunity handed back to need4deed orphanage agent, row preserved
      const reloadedOpp =
        await fastify.db.opportunityRepository.findOneByOrFail({
          id: groupOpp.id,
        });
      expect(reloadedOpp.agentId).toBe(orphanageAgent.id);
      expect(reloadedOpp.contactPersonId).toBeNull();

      // Organization memberships detached
      expect(
        await fastify.db.organizationPersonRepository.countBy({
          organizationId: org.id,
        }),
      ).toBe(0);

      // Both group volunteer person and group coordinator person had PII erased
      for (const personId of [groupVolPerson.id, groupCoordPerson.id]) {
        const erasedPerson = await fastify.db.personRepository.findOneByOrFail({
          id: personId,
        });
        expect(erasedPerson.firstName).toBe("[deleted]");
        expect(erasedPerson.lastName).toBeNull();
        expect(erasedPerson.email).toBeNull();
        expect(erasedPerson.phone).toBeNull();
        expect(erasedPerson.addressId).toBeNull();
      }

      // Logins deactivated and emails erased
      for (const userId of [groupCoordUser.id, groupVolUser!.id]) {
        const erasedUser = await fastify.db.userRepository.findOneByOrFail({
          id: userId,
        });
        expect(erasedUser.isActive).toBe(false);
        expect(erasedUser.deactivatedAt).not.toBeNull();
        expect(erasedUser.email).toBe(erasedEmailFor(userId));
      }

      // Bystanders untouched
      const reloadedBystanderVol =
        await fastify.db.volunteerRepository.findOneByOrFail({
          id: bystanderVol.id,
        });
      expect(reloadedBystanderVol.ownerAgentId).toBe(bystanderAgent.id);
      const reloadedBystanderPerson =
        await fastify.db.personRepository.findOneByOrFail({
          id: bystanderPerson.id,
        });
      expect(reloadedBystanderPerson.firstName).toBe("BystanderVol");
      const reloadedBystanderOpp =
        await fastify.db.opportunityRepository.findOneByOrFail({
          id: bystanderOpp.id,
        });
      expect(reloadedBystanderOpp.agentId).toBe(bystanderAgent.id);
    });

    it("deletes a single-Einrichtung group, detaching agent_person and erasing its people", async () => {
      const soloAgent = await createAgent("DeleteSoloAgent");
      const { volunteer: soloVol, person: soloVolPerson } =
        await createVolunteer("SoloVolToErase", soloAgent.id);
      const soloOpp = await createOpportunity("SoloOpp", soloAgent.id);
      const { user: soloCoord, person: soloCoordPerson } = await createAccount(
        UserRole.AGENT,
        "SoloCoord",
      );
      await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId: soloAgent.id,
          personId: soloCoordPerson.id,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );

      const createRes = await inject("POST", "/group", adminCookie, {
        title: "Solo Group To Delete",
        agentId: soloAgent.id,
      });
      expect(createRes.statusCode).toBe(201);
      const groupId = createRes.json().data.id;
      createdGroupIds.push(groupId);

      const deleteRes = await inject(
        "DELETE",
        `/group/${groupId}`,
        adminCookie,
      );
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.json().data).toEqual({
        id: groupId,
        counts: { volunteers: 1, opportunities: 1, accounts: 1 },
        erasedPersons: 2,
      });

      expect(
        (
          await fastify.db.volunteerRepository.findOneByOrFail({
            id: soloVol.id,
          })
        ).ownerAgentId,
      ).toBeNull();
      expect(
        (
          await fastify.db.opportunityRepository.findOneByOrFail({
            id: soloOpp.id,
          })
        ).agentId,
      ).toBe(orphanageAgent.id);
      expect(
        await fastify.db.agentPersonRepository.countBy({
          agentId: soloAgent.id,
        }),
      ).toBe(0);
      expect(
        (
          await fastify.db.personRepository.findOneByOrFail({
            id: soloVolPerson.id,
          })
        ).firstName,
      ).toBe("[deleted]");
      expect(
        (
          await fastify.db.userRepository.findOneByOrFail({
            id: soloCoord.id,
          })
        ).email,
      ).toBe(erasedEmailFor(soloCoord.id));
    });
  });
});
