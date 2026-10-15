import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Deal from "../../../data/entity/deal.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { createServer } from "../../../server";
import {
  addWorkingDays,
  berlinDayBoundaries,
  berlinToday,
} from "../../../services/jobs/german-holidays";
import { scanAccompanyNotFound } from "../../../services/jobs/scan-accompany-not-found";
import { randomNumericSuffix } from "../../random";

describe("scanAccompanyNotFound", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let dealInWindow: Deal;
  let dealOutOfWindow: Deal;
  let onetimerInWindow: Onetimer;
  let onetimerOutOfWindow: Onetimer;
  let oppInWindow: Opportunity;
  let oppOutOfWindow: Opportunity;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    fastify.cronNotify.emailAccompanyNotFound = vi
      .fn()
      .mockResolvedValue(undefined);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (scan-not-found) ${suffix}` }),
    );

    const targetDay = addWorkingDays(berlinToday(), 4);
    const { startOfDay } = berlinDayBoundaries(targetDay);
    const inWindowDate = new Date(startOfDay.getTime() + 60 * 60 * 1000);
    const outOfWindowDate = new Date(startOfDay.getTime() - 60 * 60 * 1000);

    onetimerInWindow = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: inWindowDate }),
    );
    onetimerOutOfWindow = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: outOfWindowDate }),
    );

    dealInWindow = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    dealOutOfWindow = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );

    oppInWindow = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Accompanying In Window ${suffix}`,
        type: OpportunityType.ACCOMPANYING,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealInWindow.id,
        onetimerId: onetimerInWindow.id,
      }),
    );
    oppOutOfWindow = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Accompanying Out of Window ${suffix}`,
        type: OpportunityType.ACCOMPANYING,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealOutOfWindow.id,
        onetimerId: onetimerOutOfWindow.id,
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.communicationRepository.delete({
      opportunityId: oppInWindow.id,
    });
    await fastify.db.communicationRepository.delete({
      opportunityId: oppOutOfWindow.id,
    });
    await fastify.db.opportunityRepository.delete({ id: oppInWindow.id });
    await fastify.db.opportunityRepository.delete({ id: oppOutOfWindow.id });
    await fastify.db.dealRepository.delete({ id: dealInWindow.id });
    await fastify.db.dealRepository.delete({ id: dealOutOfWindow.id });
    await fastify.db.onetimerRepository.delete({ id: onetimerInWindow.id });
    await fastify.db.onetimerRepository.delete({ id: onetimerOutOfWindow.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  it("emails only for opportunities whose onetimer date falls in the target window", async () => {
    await scanAccompanyNotFound(fastify);

    const calls = (
      fastify.cronNotify.emailAccompanyNotFound as ReturnType<typeof vi.fn>
    ).mock.calls;
    const calledIds = calls.map(([opp]: [Opportunity]) => opp.id);

    expect(calledIds).toContain(oppInWindow.id);
    expect(calledIds).not.toContain(oppOutOfWindow.id);
  });

  it("logs the communication and sets the opportunity inactive, so a second run sends nothing", async () => {
    const posted = fastify.cronNotify.emailAccompanyNotFound as ReturnType<
      typeof vi.fn
    >;
    posted.mockClear();

    await scanAccompanyNotFound(fastify);

    expect(
      posted.mock.calls.filter(
        ([opp]: [Opportunity]) => opp.id === oppInWindow.id,
      ),
    ).toHaveLength(0);
    expect(
      await fastify.db.communicationRepository.countBy({
        opportunityId: oppInWindow.id,
        communicationType: CommunicationType.ACCOMPANYING_NOT_FOUND,
      }),
    ).toBe(1);
    const reloaded = await fastify.db.opportunityRepository.findOneByOrFail({
      id: oppInWindow.id,
    });
    expect(reloaded.status).toBe(OpportunityStatusType.INACTIVE);
  });

  it("does not email again when the communication is logged", async () => {
    const posted = fastify.cronNotify.emailAccompanyNotFound as ReturnType<
      typeof vi.fn
    >;
    await fastify.db.opportunityRepository.update(oppInWindow.id, {
      status: OpportunityStatusType.SEARCHING,
    });
    posted.mockClear();

    await scanAccompanyNotFound(fastify);

    expect(
      posted.mock.calls.filter(
        ([opp]: [Opportunity]) => opp.id === oppInWindow.id,
      ),
    ).toHaveLength(0);
    const reloaded = await fastify.db.opportunityRepository.findOneByOrFail({
      id: oppInWindow.id,
    });
    expect(reloaded.status).toBe(OpportunityStatusType.INACTIVE);
  });

  describe("with extra opportunities in the window", () => {
    const created: Opportunity[] = [];
    let person: Person;
    let volunteer: Volunteer;
    let volunteerDeal: Deal;

    const inWindow = async (title: string) => {
      const { startOfDay } = berlinDayBoundaries(
        addWorkingDays(berlinToday(), 4),
      );
      const onetimer = await fastify.db.onetimerRepository.save(
        new Onetimer({ date: new Date(startOfDay.getTime() + 2 * 3600_000) }),
      );
      const opportunity = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `${title} ${randomNumericSuffix()}`,
          type: OpportunityType.ACCOMPANYING,
          status: OpportunityStatusType.SEARCHING,
          agentId: agent.id,
          onetimerId: onetimer.id,
        }),
      );
      created.push(opportunity);
      return opportunity;
    };

    beforeAll(async () => {
      const postcode = await fastify.db.postcodeRepository.findOneOrFail({
        where: {},
      });
      volunteerDeal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
      );
      person = await fastify.db.personRepository.save(
        new Person({
          firstName: "Test",
          lastName: `Not found ${randomNumericSuffix()}`,
        }),
      );
      volunteer = await fastify.db.volunteerRepository.save(
        new Volunteer({
          personId: person.id,
          dealId: volunteerDeal.id,
          statusEngagement: VolunteerStateEngagementType.AVAILABLE,
        }),
      );
    });

    afterAll(async () => {
      for (const opportunity of created) {
        await fastify.db.opportunityVolunteerRepository.delete({
          opportunityId: opportunity.id,
        });
        await fastify.db.communicationRepository.delete({
          opportunityId: opportunity.id,
        });
        await fastify.db.opportunityRepository.delete({ id: opportunity.id });
        await fastify.db.onetimerRepository.delete({
          id: opportunity.onetimerId!,
        });
      }
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
      await fastify.db.personRepository.delete({ id: person.id });
      await fastify.db.dealRepository.delete({ id: volunteerDeal.id });
    });

    it.each([
      OpportunityVolunteerStatusType.MATCHED,
      OpportunityVolunteerStatusType.ACTIVE,
    ])("skips an opportunity with a %s volunteer", async (status) => {
      const opportunity = await inWindow(`Has ${status}`);
      await fastify.db.opportunityVolunteerRepository.save(
        new OpportunityVolunteer({
          opportunityId: opportunity.id,
          volunteerId: volunteer.id,
          status,
        }),
      );
      const posted = fastify.cronNotify.emailAccompanyNotFound as ReturnType<
        typeof vi.fn
      >;
      posted.mockClear();

      await scanAccompanyNotFound(fastify);

      expect(
        posted.mock.calls.map(([opp]: [Opportunity]) => opp.id),
      ).not.toContain(opportunity.id);
      const reloaded = await fastify.db.opportunityRepository.findOneByOrFail({
        id: opportunity.id,
      });
      expect(reloaded.status).toBe(OpportunityStatusType.SEARCHING);
    });

    it("when the email fails, logs nothing, keeps the status and alerts ops", async () => {
      const opportunity = await inWindow("Email fails");
      const posted = fastify.cronNotify.emailAccompanyNotFound as ReturnType<
        typeof vi.fn
      >;
      posted.mockImplementation(async (opp: Opportunity) => {
        if (opp.id === opportunity.id) {
          throw new Error("smtp down");
        }
      });
      const opsAlert = vi
        .spyOn(fastify.notify, "opsAlert")
        .mockResolvedValue(undefined);
      try {
        await scanAccompanyNotFound(fastify);

        expect(opsAlert).toHaveBeenCalledWith(
          expect.stringContaining(`opportunity ${opportunity.id} not emailed`),
        );
        expect(
          await fastify.db.communicationRepository.countBy({
            opportunityId: opportunity.id,
          }),
        ).toBe(0);
        const reloaded = await fastify.db.opportunityRepository.findOneByOrFail(
          {
            id: opportunity.id,
          },
        );
        expect(reloaded.status).toBe(OpportunityStatusType.SEARCHING);
      } finally {
        posted.mockReset();
        posted.mockResolvedValue(undefined);
        opsAlert.mockRestore();
      }
    });
  });

  it("on Monday Oct 5, takes Friday to Sunday, leaving Monday for Tuesday", async () => {
    const at = (day: number, hour: number) =>
      new Date(
        berlinDayBoundaries(new Date(2026, 9, day)).startOfDay.getTime() +
          hour * 60 * 60 * 1000,
      );
    const appointments: Record<string, Date> = {
      thursday: at(8, 10),
      friday: at(9, 10),
      saturday: at(10, 10),
      sunday: at(11, 23),
      monday: at(12, 9),
    };
    const created: Record<string, Opportunity> = {};
    const onetimers: number[] = [];
    try {
      for (const [day, date] of Object.entries(appointments)) {
        const onetimer = await fastify.db.onetimerRepository.save(
          new Onetimer({ date }),
        );
        onetimers.push(onetimer.id);
        created[day] = await fastify.db.opportunityRepository.save(
          new Opportunity({
            title: `Weekend check ${day} ${Date.now()}`,
            type: OpportunityType.ACCOMPANYING,
            status: OpportunityStatusType.SEARCHING,
            agentId: agent.id,
            onetimerId: onetimer.id,
          }),
        );
      }
      const posted = fastify.cronNotify.emailAccompanyNotFound as ReturnType<
        typeof vi.fn
      >;
      const postedOn = async (today: Date) => {
        posted.mockClear();
        await scanAccompanyNotFound(fastify, today);
        return posted.mock.calls.map(([opp]: [Opportunity]) => opp.id);
      };

      const monday = await postedOn(new Date(2026, 9, 5));
      const tuesday = await postedOn(new Date(2026, 9, 6));

      for (const day of ["friday", "saturday", "sunday"]) {
        expect(monday).toContain(created[day].id);
        expect(tuesday).not.toContain(created[day].id);
      }
      expect(monday).not.toContain(created.thursday.id);
      expect(monday).not.toContain(created.monday.id);
      expect(tuesday).toContain(created.monday.id);
    } finally {
      for (const opportunity of Object.values(created)) {
        await fastify.db.communicationRepository.delete({
          opportunityId: opportunity.id,
        });
        await fastify.db.opportunityRepository.delete({ id: opportunity.id });
      }
      for (const id of onetimers) {
        await fastify.db.onetimerRepository.delete({ id });
      }
    }
  });
});
