import {
  OpportunityMatchStatusType,
  OpportunityVolunteerStatusType,
  VolunteerStateMatchType,
} from "need4deed-sdk";
import { QueryRunner } from "typeorm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { randomNumericSuffix } from "../../random";
import { createOpportunity, createVolunteer } from "../match-fixtures";

// be#1106. Everything runs inside one uncommitted transaction: the recompute
// must see rows the transaction itself wrote, which the old fire-and-forget
// entity hooks (reading via a separate connection) could not.
describe("OpportunityVolunteerSubscriber", () => {
  const suffix = randomNumericSuffix();
  let queryRunner: QueryRunner;
  let volunteer: Volunteer;
  let opportunity: Opportunity;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    volunteer = await createVolunteer(queryRunner.manager);
    opportunity = await createOpportunity(
      queryRunner.manager,
      `Subscriber ${suffix}`,
    );
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  const statuses = async () => [
    (await queryRunner.manager.findOneByOrFail(Volunteer, { id: volunteer.id }))
      .statusMatch,
    (
      await queryRunner.manager.findOneByOrFail(Opportunity, {
        id: opportunity.id,
      })
    ).statusMatch,
  ];

  const link = (status: OpportunityVolunteerStatusType) =>
    queryRunner.manager.save(
      new OpportunityVolunteer({
        volunteerId: volunteer.id,
        opportunityId: opportunity.id,
        status,
      }),
    );

  it("recomputes both sides on insert, within the transaction", async () => {
    await link(OpportunityVolunteerStatusType.PENDING);

    expect(await statuses()).toEqual([
      VolunteerStateMatchType.PENDING_MATCH,
      OpportunityMatchStatusType.PENDING_MATCH,
    ]);
  });

  it("recomputes both sides on update", async () => {
    const ov = await link(OpportunityVolunteerStatusType.PENDING);
    ov.status = OpportunityVolunteerStatusType.ACTIVE;
    await queryRunner.manager.save(ov);

    expect(await statuses()).toEqual([
      VolunteerStateMatchType.MATCHED,
      OpportunityMatchStatusType.MATCHED,
    ]);
  });

  it("recomputes both sides on remove", async () => {
    const ov = await link(OpportunityVolunteerStatusType.MATCHED);
    await queryRunner.manager.remove(ov);

    expect(await statuses()).toEqual([
      VolunteerStateMatchType.NEEDS_REMATCH,
      OpportunityMatchStatusType.NEEDS_REMATCH,
    ]);
  });
});

// be#1106 review. Reproduces the applyOnetimerTransition interleaving: one
// transaction holds the opportunity row and then saves a link, while another
// saves the same link. Without lock ordering the second holds the link and
// waits for the opportunity in the recompute while the first waits for the
// link → Postgres deadlock error.
describe("OpportunityVolunteerSubscriber lock ordering", () => {
  const suffix = randomNumericSuffix();
  let volunteers: Volunteer[];
  let opportunity: Opportunity;
  let links: OpportunityVolunteer[];

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const manager = dataSource.manager;
    volunteers = [
      await createVolunteer(manager),
      await createVolunteer(manager),
    ];
    opportunity = await createOpportunity(manager, `Locking ${suffix}`);
    links = [];
    for (const volunteer of volunteers) {
      links.push(
        await manager.save(
          new OpportunityVolunteer({
            volunteerId: volunteer.id,
            opportunityId: opportunity.id,
            status: OpportunityVolunteerStatusType.PENDING,
          }),
        ),
      );
    }
  });

  afterAll(async () => {
    const manager = dataSource.manager;
    await manager.delete(
      OpportunityVolunteer,
      links.map(({ id }) => id),
    );
    await manager.delete(Opportunity, opportunity.id);
    for (const { id, dealId, personId } of volunteers) {
      await manager.delete(Volunteer, id);
      await manager.delete(Deal, dealId);
      await manager.delete(Person, personId);
    }
  });

  it("serialises on the opportunity instead of deadlocking", async () => {
    const cron = dataSource.createQueryRunner();
    const coordinator = dataSource.createQueryRunner();
    await cron.connect();
    await coordinator.connect();
    try {
      await cron.startTransaction();
      // Like applyOnetimerTransition: the opportunity row first.
      await cron.manager.update(
        Opportunity,
        { id: opportunity.id },
        { title: `Locking ${suffix} (cron)` },
      );

      await coordinator.startTransaction();
      const coordinatorSave = coordinator.manager
        .save(
          Object.assign(new OpportunityVolunteer(), links[0], {
            status: OpportunityVolunteerStatusType.MATCHED,
          }),
        )
        .then(() => coordinator.commitTransaction());

      // Let the coordinator's save reach its lock wait.
      await new Promise((resolve) => setTimeout(resolve, 300));

      await cron.manager.save(
        Object.assign(new OpportunityVolunteer(), links[0], {
          status: OpportunityVolunteerStatusType.ACTIVE,
        }),
      );
      await cron.commitTransaction();
      await coordinatorSave;
    } finally {
      if (cron.isTransactionActive) {
        await cron.rollbackTransaction();
      }
      if (coordinator.isTransactionActive) {
        await coordinator.rollbackTransaction();
      }
      await cron.release();
      await coordinator.release();
    }

    const saved = await dataSource.manager.findBy(OpportunityVolunteer, {
      opportunityId: opportunity.id,
    });
    expect(Object.fromEntries(saved.map((l) => [l.id, l.status]))).toEqual({
      // The coordinator's save waited for the cron, so it wrote last.
      [links[0].id]: OpportunityVolunteerStatusType.MATCHED,
      [links[1].id]: OpportunityVolunteerStatusType.PENDING,
    });
    expect(
      (
        await dataSource.manager.findOneByOrFail(Opportunity, {
          id: opportunity.id,
        })
      ).statusMatch,
    ).toBe(OpportunityMatchStatusType.MATCHED);
  });
});
