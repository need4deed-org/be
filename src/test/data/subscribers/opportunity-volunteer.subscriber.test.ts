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
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { randomNumericSuffix } from "../../random";
import {
  createOpportunity,
  createVolunteer,
  deleteFixtures,
} from "../match-fixtures";

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

  it("recomputes and locks old and new parents when a link moves", async () => {
    const other = await createOpportunity(
      queryRunner.manager,
      `Subscriber other ${suffix}`,
    );
    const ov = await link(OpportunityVolunteerStatusType.MATCHED);
    ov.opportunityId = other.id;
    await queryRunner.manager.save(ov);

    expect(await statuses()).toEqual([
      VolunteerStateMatchType.MATCHED,
      OpportunityMatchStatusType.NEEDS_REMATCH,
    ]);
    expect(
      (
        await queryRunner.manager.findOneByOrFail(Opportunity, {
          id: other.id,
        })
      ).statusMatch,
    ).toBe(OpportunityMatchStatusType.MATCHED);
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
  const volunteers: Volunteer[] = [];
  const opportunities: Opportunity[] = [];
  let link: OpportunityVolunteer;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const manager = dataSource.manager;
    volunteers.push(await createVolunteer(manager));
    opportunities.push(await createOpportunity(manager, `Locking ${suffix}`));
    link = await manager.save(
      new OpportunityVolunteer({
        volunteerId: volunteers[0].id,
        opportunityId: opportunities[0].id,
        status: OpportunityVolunteerStatusType.PENDING,
      }),
    );
  });

  afterAll(async () => {
    // Links go with their volunteer/opportunity (ON DELETE CASCADE).
    await deleteFixtures(dataSource.manager, volunteers, opportunities);
  });

  // Resolves once the backend is waiting on a lock held by another one.
  const waitUntilBlocked = async (pid: number) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const [{ blocked }] = await dataSource.query(
        "SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked",
        [pid],
      );
      if (blocked) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`backend ${pid} never blocked`);
  };

  it("serialises on the opportunity instead of deadlocking", async () => {
    const opportunity = opportunities[0];
    const cron = dataSource.createQueryRunner();
    const coordinator = dataSource.createQueryRunner();
    let coordinatorSave: Promise<void> | undefined;
    await cron.connect();
    await coordinator.connect();
    try {
      const [{ pid }] = await coordinator.query(
        "SELECT pg_backend_pid() AS pid",
      );

      await cron.startTransaction();
      // Like applyOnetimerTransition: the opportunity row first.
      await cron.manager.update(
        Opportunity,
        { id: opportunity.id },
        { title: `Locking ${suffix} (cron)` },
      );

      await coordinator.startTransaction();
      coordinatorSave = coordinator.manager
        .save(
          Object.assign(new OpportunityVolunteer(), link, {
            status: OpportunityVolunteerStatusType.MATCHED,
          }),
        )
        .then(() => coordinator.commitTransaction());

      await waitUntilBlocked(pid);

      await cron.manager.save(
        Object.assign(new OpportunityVolunteer(), link, {
          status: OpportunityVolunteerStatusType.ACTIVE,
        }),
      );
      await cron.commitTransaction();
      await coordinatorSave;
    } finally {
      // The cron first: an open cron transaction would keep the coordinator's
      // save waiting on its locks.
      if (cron.isTransactionActive) {
        await cron.rollbackTransaction();
      }
      await Promise.allSettled([coordinatorSave]);
      if (coordinator.isTransactionActive) {
        await coordinator.rollbackTransaction();
      }
      await cron.release();
      await coordinator.release();
    }

    // The coordinator's save waited for the cron, so it wrote last.
    expect(
      (
        await dataSource.manager.findOneByOrFail(OpportunityVolunteer, {
          id: link.id,
        })
      ).status,
    ).toBe(OpportunityVolunteerStatusType.MATCHED);
    expect(
      (
        await dataSource.manager.findOneByOrFail(Opportunity, {
          id: opportunity.id,
        })
      ).statusMatch,
    ).toBe(OpportunityMatchStatusType.MATCHED);
  });
});
