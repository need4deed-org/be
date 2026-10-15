import { FastifyInstance } from "fastify";
import {
  addWorkingDays,
  CommunicationType,
  isWorkingDay,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  Mock,
  vi,
} from "vitest";
import Deal from "../../../data/entity/deal.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { createServer } from "../../../server";
import type { EmailDelivery } from "../../../server/plugins/notify";
import { appointmentsDue } from "../../../services/jobs/berlin-dates";
import { scanAccompanyNotFound } from "../../../services/jobs/scan-accompany-not-found";
import { SuspendedEmailError } from "../../../services/notify";
import { randomNumericSuffix } from "../../random";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const nextWeekday = (date: Date, weekday: number) => {
  const result = new Date(date);
  while (result.getDay() !== weekday) {
    result.setDate(result.getDate() + 1);
  }
  return result;
};

const nextWorkingDay = (date: Date) => {
  const result = new Date(date);
  while (!isWorkingDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
};

const suffix = Number(randomNumericSuffix());
const RUN_DAY = nextWorkingDay(
  new Date(2040 + (suffix % 10), suffix % 12, 1 + (suffix % 27)),
);
const LATER_RUN_DAY = addWorkingDays(RUN_DAY, 5);
const MONDAY = nextWeekday(new Date(2050 + (suffix % 10), 10, 8), 1);

const dueOn = (runDay: Date, offset = 10 * HOUR) =>
  new Date(appointmentsDue(runDay, 4).from.getTime() + offset);

describe("scanAccompanyNotFound", () => {
  let fastify: FastifyInstance;
  let notify: Mock<(opportunity: Opportunity) => Promise<EmailDelivery>>;
  let agent: Agent;
  let volunteerDeal: Deal;
  let person: Person;
  let volunteer: Volunteer;
  const created: Opportunity[] = [];

  const accompanying = async (date: Date, title: string) => {
    const onetimer = await fastify.db.onetimerRepository.save(
      new Onetimer({ date }),
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

  const notifiedIds = () => notify.mock.calls.map(([opp]) => opp.id);

  const statusOf = async (opportunity: Opportunity) =>
    (
      await fastify.db.opportunityRepository.findOneByOrFail({
        id: opportunity.id,
      })
    ).status;

  const loggedFor = (opportunity: Opportunity) =>
    fastify.db.communicationRepository.countBy({
      opportunityId: opportunity.id,
      communicationType: CommunicationType.ACCOMPANYING_NOT_FOUND,
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    notify = vi.fn<(opportunity: Opportunity) => Promise<EmailDelivery>>();
    fastify.cronNotify.emailAccompanyNotFound = notify;

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (scan-not-found) ${suffix}` }),
    );
    volunteerDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: `Not found ${suffix}` }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        personId: person.id,
        dealId: volunteerDeal.id,
        statusEngagement: VolunteerStateEngagementType.AVAILABLE,
      }),
    );
  });

  beforeEach(() => {
    notify.mockReset();
    notify.mockResolvedValue("sent");
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
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  it("emails once for an appointment in the window, logs it and sets the opportunity inactive", async () => {
    const inWindow = await accompanying(dueOn(RUN_DAY), "In window");
    const outOfWindow = await accompanying(
      dueOn(RUN_DAY, -HOUR),
      "Out of window",
    );

    await scanAccompanyNotFound(fastify, RUN_DAY);

    expect(notifiedIds()).toContain(inWindow.id);
    expect(notifiedIds()).not.toContain(outOfWindow.id);
    expect(await loggedFor(inWindow)).toBe(1);
    expect(await statusOf(inWindow)).toBe(OpportunityStatusType.INACTIVE);
    expect(await loggedFor(outOfWindow)).toBe(0);
    expect(await statusOf(outOfWindow)).toBe(OpportunityStatusType.SEARCHING);
  });

  it("on a second run the same day, neither emails again nor closes a reopened opportunity", async () => {
    const opportunity = await accompanying(dueOn(RUN_DAY), "Rerun");
    await scanAccompanyNotFound(fastify, RUN_DAY);
    await fastify.db.opportunityRepository.update(opportunity.id, {
      status: OpportunityStatusType.SEARCHING,
    });

    await scanAccompanyNotFound(fastify, RUN_DAY);

    expect(notifiedIds().filter((id) => id === opportunity.id)).toHaveLength(1);
    expect(await loggedFor(opportunity)).toBe(1);
    expect(await statusOf(opportunity)).toBe(OpportunityStatusType.SEARCHING);
  });

  it("emails again when a reopened appointment was moved to a later day", async () => {
    const opportunity = await accompanying(dueOn(RUN_DAY), "Rescheduled");
    await scanAccompanyNotFound(fastify, RUN_DAY);
    await fastify.db.communicationRepository
      .createQueryBuilder()
      .update()
      .set({ date: new Date(Date.now() - 2 * DAY) })
      .where({ opportunityId: opportunity.id })
      .execute();
    await fastify.db.onetimerRepository.update(opportunity.onetimerId!, {
      date: dueOn(LATER_RUN_DAY),
    });
    await fastify.db.opportunityRepository.update(opportunity.id, {
      status: OpportunityStatusType.SEARCHING,
    });

    await scanAccompanyNotFound(fastify, LATER_RUN_DAY);

    expect(notifiedIds().filter((id) => id === opportunity.id)).toHaveLength(2);
    expect(await loggedFor(opportunity)).toBe(2);
    expect(await statusOf(opportunity)).toBe(OpportunityStatusType.INACTIVE);
  });

  it.each([
    OpportunityVolunteerStatusType.MATCHED,
    OpportunityVolunteerStatusType.ACTIVE,
  ])("skips an opportunity with a %s volunteer", async (status) => {
    const opportunity = await accompanying(dueOn(RUN_DAY), `Has ${status}`);
    await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status,
      }),
    );

    await scanAccompanyNotFound(fastify, RUN_DAY);

    expect(notifiedIds()).not.toContain(opportunity.id);
    expect(await statusOf(opportunity)).toBe(OpportunityStatusType.SEARCHING);
  });

  it("when the email fails, logs nothing, keeps the status and alerts ops", async () => {
    const opportunity = await accompanying(dueOn(RUN_DAY), "Email fails");
    notify.mockImplementation(async (opp: Opportunity) => {
      if (opp.id === opportunity.id) {
        throw new Error("smtp down");
      }
      return "sent";
    });
    const opsAlert = vi
      .spyOn(fastify.notify, "opsAlert")
      .mockResolvedValue(undefined);
    try {
      await scanAccompanyNotFound(fastify, RUN_DAY);

      expect(opsAlert).toHaveBeenCalledWith(
        expect.stringContaining(`opportunity ${opportunity.id} not emailed`),
      );
      expect(await loggedFor(opportunity)).toBe(0);
      expect(await statusOf(opportunity)).toBe(OpportunityStatusType.SEARCHING);
    } finally {
      opsAlert.mockRestore();
    }
  });

  it("in an email dry run, neither logs the communication nor closes the opportunity", async () => {
    const opportunity = await accompanying(dueOn(RUN_DAY), "Dry run");
    notify.mockResolvedValue("dry-run");

    await scanAccompanyNotFound(fastify, RUN_DAY);

    expect(notifiedIds()).toContain(opportunity.id);
    expect(await loggedFor(opportunity)).toBe(0);
    expect(await statusOf(opportunity)).toBe(OpportunityStatusType.SEARCHING);
  });

  it("when the email is suspended, logs nothing and sends no second ops alert", async () => {
    const opportunity = await accompanying(dueOn(RUN_DAY), "Suspended");
    notify.mockImplementation(async (opp: Opportunity) => {
      if (opp.id === opportunity.id) {
        throw new SuspendedEmailError(['"to" is blank']);
      }
      return "sent";
    });
    const opsAlert = vi
      .spyOn(fastify.notify, "opsAlert")
      .mockResolvedValue(undefined);
    try {
      await scanAccompanyNotFound(fastify, RUN_DAY);

      expect(opsAlert).not.toHaveBeenCalledWith(
        expect.stringContaining(`opportunity ${opportunity.id} `),
      );
      expect(await loggedFor(opportunity)).toBe(0);
      expect(await statusOf(opportunity)).toBe(OpportunityStatusType.SEARCHING);
    } finally {
      opsAlert.mockRestore();
    }
  });

  it("does not close an opportunity matched while the email was being sent", async () => {
    const opportunity = await accompanying(dueOn(RUN_DAY), "Matched meanwhile");
    notify.mockImplementation(async (opp: Opportunity) => {
      if (opp.id === opportunity.id) {
        await fastify.db.opportunityVolunteerRepository.save(
          new OpportunityVolunteer({
            opportunityId: opportunity.id,
            volunteerId: volunteer.id,
            status: OpportunityVolunteerStatusType.MATCHED,
          }),
        );
      }
      return "sent";
    });

    await scanAccompanyNotFound(fastify, RUN_DAY);

    expect(await loggedFor(opportunity)).toBe(1);
    expect(await statusOf(opportunity)).toBe(OpportunityStatusType.SEARCHING);
  });

  it("does not overwrite a status changed while the email was being sent", async () => {
    const opportunity = await accompanying(dueOn(RUN_DAY), "Changed meanwhile");
    notify.mockImplementation(async (opp: Opportunity) => {
      if (opp.id === opportunity.id) {
        await fastify.db.opportunityRepository.update(opportunity.id, {
          status: OpportunityStatusType.PAST,
        });
      }
      return "sent";
    });

    await scanAccompanyNotFound(fastify, RUN_DAY);

    expect(await statusOf(opportunity)).toBe(OpportunityStatusType.PAST);
  });

  it("when the earlier-email lookup fails, alerts ops and carries on with the others", async () => {
    const first = await accompanying(
      dueOn(LATER_RUN_DAY, 11 * HOUR),
      "Lookup fails 1",
    );
    const second = await accompanying(
      dueOn(LATER_RUN_DAY, 12 * HOUR),
      "Lookup fails 2",
    );
    const ours = [first.id, second.id];
    const findOne = fastify.db.communicationRepository.findOne.bind(
      fastify.db.communicationRepository,
    );
    let failed: number | undefined;
    const lookup = vi
      .spyOn(fastify.db.communicationRepository, "findOne")
      .mockImplementation(async (options) => {
        const where = options.where as { opportunityId?: number };
        if (
          failed === undefined &&
          where.opportunityId !== undefined &&
          ours.includes(where.opportunityId)
        ) {
          failed = where.opportunityId;
          throw new Error("db blip");
        }
        return findOne(options);
      });
    const opsAlert = vi
      .spyOn(fastify.notify, "opsAlert")
      .mockResolvedValue(undefined);
    try {
      await scanAccompanyNotFound(fastify, LATER_RUN_DAY);

      expect(opsAlert).toHaveBeenCalledWith(
        expect.stringContaining(`opportunity ${failed} not emailed`),
      );
      const other = ours.find((id) => id !== failed);
      expect(notifiedIds()).toContain(other);
      expect(notifiedIds()).not.toContain(failed);
    } finally {
      lookup.mockRestore();
      opsAlert.mockRestore();
    }
  });

  it("on a Monday, takes Friday to Sunday, leaving Monday for Tuesday", async () => {
    const at = (daysAfterMonday: number, hour: number) =>
      new Date(
        appointmentsDue(MONDAY, 0).from.getTime() +
          daysAfterMonday * DAY +
          hour * HOUR,
      );
    const appointments = {
      thursday: await accompanying(at(3, 10), "Thursday"),
      friday: await accompanying(at(4, 10), "Friday"),
      saturday: await accompanying(at(5, 10), "Saturday"),
      sunday: await accompanying(at(6, 23), "Sunday"),
      monday: await accompanying(at(7, 9), "Monday"),
    };

    await scanAccompanyNotFound(fastify, MONDAY);
    const onMonday = notifiedIds();
    notify.mockClear();
    await scanAccompanyNotFound(fastify, addWorkingDays(MONDAY, 1));
    const onTuesday = notifiedIds();

    for (const day of ["friday", "saturday", "sunday"] as const) {
      expect(onMonday).toContain(appointments[day].id);
      expect(onTuesday).not.toContain(appointments[day].id);
    }
    expect(onMonday).not.toContain(appointments.thursday.id);
    expect(onMonday).not.toContain(appointments.monday.id);
    expect(onTuesday).toContain(appointments.monday.id);
  });
});
