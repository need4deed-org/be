import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

const PASSWORD = "test_password";

function getCookie(
  cookies: { name: string; value: string }[],
  name: string,
): string {
  const cookie = cookies.find((c) => c.name === name)?.value;
  if (!cookie) {
    throw new Error(`Cookie ${name} not found in response`);
  }
  return cookie;
}

describe("volunteer activity audit log (be#919)", () => {
  let fastify: FastifyInstance;

  let deal: Deal;
  let volunteerPerson: Person;
  let volunteer: Volunteer;
  let otherDeal: Deal;
  let otherVolunteerPerson: Person;
  let otherVolunteer: Volunteer;
  let opportunityDeal: Deal;
  let opportunity: Opportunity;
  let opportunityVolunteer: OpportunityVolunteer;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let volunteerCookie: string;
  let otherVolunteerCookie: string;
  let seededEntry: VolunteerAuditLog;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Test",
        lastName: "Volunteer",
        email: `volunteer-audit-${suffix}@example.com`,
      }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );

    otherDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    otherVolunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Other", lastName: "Volunteer" }),
    );
    otherVolunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        dealId: otherDeal.id,
        personId: otherVolunteerPerson.id,
      }),
    );

    opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (audit log) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        dealId: opportunityDeal.id,
      }),
    );
    opportunityVolunteer = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.PENDING,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );

    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-audit-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `volunteer-audit-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: volunteerPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `other-volunteer-audit-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: otherVolunteerPerson.id,
      }),
    );

    const login = async (email: string): Promise<string> => {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      return getCookie(res.cookies, accessCookieName);
    };

    coordinatorCookie = await login(
      `coordinator-audit-${suffix}@test.need4deed.org`,
    );
    volunteerCookie = await login(
      `volunteer-audit-${suffix}@test.need4deed.org`,
    );
    otherVolunteerCookie = await login(
      `other-volunteer-audit-${suffix}@test.need4deed.org`,
    );

    seededEntry = await fastify.db.volunteerAuditLogRepository.save(
      new VolunteerAuditLog({
        volunteerId: volunteer.id,
        type: "contact_details_changed",
        detail: "Contact details updated.",
        occurredAt: new Date(),
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.volunteerAuditLogRepository.delete({
      volunteerId: volunteer.id,
    });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: volunteerPerson.id });
    await fastify.db.userRepository.delete({
      personId: otherVolunteerPerson.id,
    });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.opportunityVolunteerRepository.delete({
      id: opportunityVolunteer.id,
    });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: opportunityDeal.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.volunteerRepository.delete({ id: otherVolunteer.id });
    await fastify.db.personRepository.delete({ id: otherVolunteerPerson.id });
    await fastify.db.dealRepository.delete({ id: otherDeal.id });
    await fastify.close();
  });

  describe("GET /volunteer/:id/activity-log", () => {
    it("lets a volunteer read their own activity log", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: `/volunteer/${volunteer.id}/activity-log`,
        cookies: { [accessCookieName]: volunteerCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.map((e: { id: number }) => e.id)).toContain(
        seededEntry.id,
      );
    });

    it("blocks a volunteer from reading another volunteer's activity log", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: `/volunteer/${volunteer.id}/activity-log`,
        cookies: { [accessCookieName]: otherVolunteerCookie },
      });
      expect(res.statusCode).toBe(403);
    });

    it("lets a coordinator read any volunteer's activity log", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: `/volunteer/${volunteer.id}/activity-log`,
        cookies: { [accessCookieName]: coordinatorCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.map((e: { id: number }) => e.id)).toContain(
        seededEntry.id,
      );
    });
  });

  describe("PATCH /volunteer/:id writes an audit entry", () => {
    beforeAll(async () => {
      // Clear the entry seeded for the GET describe block above so the
      // exact-length assertions below aren't thrown off by it.
      await fastify.db.volunteerAuditLogRepository.delete({
        id: seededEntry.id,
      });
    });

    it("logs one availability_changed entry when statusEngagement changes", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: `/volunteer/${volunteer.id}?language=en`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          statusEngagement: VolunteerStateEngagementType.ACTIVE,
        },
      });
      expect(res.statusCode).toBe(200);

      const entries = await fastify.db.volunteerAuditLogRepository.find({
        where: { volunteerId: volunteer.id, type: "availability_changed" },
      });
      expect(entries).toHaveLength(1);
      expect(entries[0].detail).toContain("vol-active");
    });

    it("logs one contact_details_changed entry when a person field changes", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: `/volunteer/${volunteer.id}?language=en`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          person: {
            id: volunteerPerson.id,
            firstName: "Updated",
            email: volunteerPerson.email,
          },
        },
      });
      expect(res.statusCode).toBe(200);

      const entries = await fastify.db.volunteerAuditLogRepository.find({
        where: { volunteerId: volunteer.id, type: "contact_details_changed" },
      });
      expect(entries).toHaveLength(1);
    });

    it("does not log a spurious entry when the patch round-trips the same value", async () => {
      const current = await fastify.db.volunteerRepository.findOneByOrFail({
        id: volunteer.id,
      });

      const res = await fastify.inject({
        method: "PATCH",
        url: `/volunteer/${volunteer.id}?language=en`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          statusEngagement: current.statusEngagement,
        },
      });
      expect(res.statusCode).toBe(200);

      const availabilityEntries =
        await fastify.db.volunteerAuditLogRepository.find({
          where: { volunteerId: volunteer.id, type: "availability_changed" },
        });
      expect(availabilityEntries).toHaveLength(1);
    });
  });

  describe("PATCH /volunteer/:id/opportunity-linked/:m2mId writes an audit entry", () => {
    it("logs an opportunity_status_changed entry when status changes", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: `/volunteer/${volunteer.id}/opportunity-linked/${opportunityVolunteer.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe(
        OpportunityVolunteerStatusType.MATCHED,
      );

      const entries = await fastify.db.volunteerAuditLogRepository.find({
        where: {
          volunteerId: volunteer.id,
          type: "opportunity_status_changed",
        },
      });
      expect(entries).toHaveLength(1);
      expect(entries[0].detail).toContain(
        OpportunityVolunteerStatusType.MATCHED,
      );
    });
  });
});
