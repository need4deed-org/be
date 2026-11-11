import {
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager, QueryRunner } from "typeorm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { DeactivatedVolunteerError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { deactivateVolunteerProfile } from "../../../server/utils/data/deactivate-volunteer-profile";
import { syncVolunteerEngagement } from "../../../server/utils/data/sync-volunteer-engagement";
import { randomNumericSuffix } from "../../random";
import {
  createOpportunity,
  createVolunteer,
  deleteFixtures,
} from "../match-fixtures";

const { ACTIVE, MATCHED, PAST } = OpportunityVolunteerStatusType;

const addLogin = (manager: EntityManager, volunteer: Volunteer) =>
  manager.save(
    new User({
      email: `deactivated-match-${randomNumericSuffix()}@example.org`,
      password: "",
      personId: volunteer.personId,
      role: UserRole.VOLUNTEER,
      isActive: true,
    }),
  );

const deactivateLogin = (manager: EntityManager, user: User) =>
  manager.update(
    User,
    { id: user.id },
    { isActive: false, deactivatedAt: new Date() },
  );

const link = (
  manager: EntityManager,
  volunteer: Volunteer,
  opportunity: Opportunity,
  status: OpportunityVolunteerStatusType,
) =>
  manager.save(
    new OpportunityVolunteer({
      volunteerId: volunteer.id,
      opportunityId: opportunity.id,
      status,
    }),
  );

describe("matching a deactivated volunteer", () => {
  const suffix = randomNumericSuffix();
  let queryRunner: QueryRunner;
  let manager: EntityManager;
  let volunteer: Volunteer;
  let opportunity: Opportunity;
  let login: User;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    manager = queryRunner.manager;
    volunteer = await createVolunteer(manager);
    opportunity = await createOpportunity(manager, `Deactivated ${suffix}`);
    login = await addLogin(manager, volunteer);
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  const engagement = async (id = volunteer.id) =>
    (await manager.findOneByOrFail(Volunteer, { id })).statusEngagement;

  it("allows a new link while the login is active", async () => {
    await expect(
      link(manager, volunteer, opportunity, MATCHED),
    ).resolves.toBeDefined();
  });

  it("rejects a new link once the login is deactivated", async () => {
    await deactivateLogin(manager, login);

    await expect(
      link(manager, volunteer, opportunity, MATCHED),
    ).rejects.toBeInstanceOf(DeactivatedVolunteerError);
  });

  it("rejects reopening an ended link", async () => {
    const ended = await link(manager, volunteer, opportunity, PAST);
    await deactivateLogin(manager, login);

    ended.status = ACTIVE;
    await expect(manager.save(ended)).rejects.toBeInstanceOf(
      DeactivatedVolunteerError,
    );
  });

  it("rejects moving another volunteer's link to the deactivated volunteer", async () => {
    const other = await createVolunteer(manager);
    const moved = await link(manager, other, opportunity, MATCHED);
    await deactivateLogin(manager, login);

    moved.volunteerId = volunteer.id;
    await expect(manager.save(moved)).rejects.toBeInstanceOf(
      DeactivatedVolunteerError,
    );
  });

  it("allows recording an ended link", async () => {
    await deactivateLogin(manager, login);

    await expect(
      link(manager, volunteer, opportunity, PAST),
    ).resolves.toBeDefined();
  });

  it("allows an open link to progress", async () => {
    const open = await link(manager, volunteer, opportunity, MATCHED);
    await deactivateLogin(manager, login);

    open.status = ACTIVE;
    await expect(manager.save(open)).resolves.toBeDefined();
  });

  it("allows ending an open link", async () => {
    const open = await link(manager, volunteer, opportunity, MATCHED);
    await deactivateLogin(manager, login);

    open.status = PAST;
    await expect(manager.save(open)).resolves.toBeDefined();
  });

  it("allows editing an ended link without reopening it", async () => {
    const ended = await link(manager, volunteer, opportunity, PAST);
    const other = await createOpportunity(manager, `Deactivated ${suffix} b`);
    await deactivateLogin(manager, login);

    ended.opportunityId = other.id;
    await expect(manager.save(ended)).resolves.toBeDefined();
  });

  it("doesn't promote a deactivated volunteer to vol-active", async () => {
    await link(manager, volunteer, opportunity, ACTIVE);
    await deactivateLogin(manager, login);
    await manager.update(
      Volunteer,
      { id: volunteer.id },
      { statusEngagement: VolunteerStateEngagementType.INACTIVE },
    );

    await syncVolunteerEngagement(manager, volunteer.id, "follow");

    expect(await engagement()).toBe(VolunteerStateEngagementType.INACTIVE);
  });

  it("still promotes a volunteer a coordinator set to vol-inactive", async () => {
    await link(manager, volunteer, opportunity, ACTIVE);
    await manager.update(
      Volunteer,
      { id: volunteer.id },
      { statusEngagement: VolunteerStateEngagementType.INACTIVE },
    );

    await syncVolunteerEngagement(manager, volunteer.id, "follow");

    expect(await engagement()).toBe(VolunteerStateEngagementType.ACTIVE);
  });
});

describe("a link insert racing self-deletion", () => {
  const suffix = randomNumericSuffix();
  const volunteers: Volunteer[] = [];
  const opportunities: Opportunity[] = [];
  let login: User | undefined;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const manager = dataSource.manager;
    volunteers.push(await createVolunteer(manager));
    opportunities.push(await createOpportunity(manager, `Racing ${suffix}`));
    login = await addLogin(manager, volunteers[0]);
  });

  afterAll(async () => {
    if (login) {
      await dataSource.manager.delete(User, login.id);
    }
    await deleteFixtures(dataSource.manager, volunteers, opportunities);
  });

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

  it("is rejected once the deletion commits", async () => {
    const [volunteer] = volunteers;
    const [opportunity] = opportunities;
    const selfDelete = dataSource.createQueryRunner();
    const coordinator = dataSource.createQueryRunner();
    let insert: Promise<unknown> | undefined;
    await selfDelete.connect();
    await coordinator.connect();
    try {
      const [{ pid }] = await coordinator.query(
        "SELECT pg_backend_pid() AS pid",
      );

      await selfDelete.startTransaction();
      await deactivateVolunteerProfile(
        selfDelete.manager,
        volunteer.personId,
        login!.id,
      );
      await deactivateLogin(selfDelete.manager, login!);

      await coordinator.startTransaction();
      insert = link(coordinator.manager, volunteer, opportunity, MATCHED);
      insert.catch(() => undefined);

      await waitUntilBlocked(pid);
      await selfDelete.commitTransaction();

      await expect(insert).rejects.toBeInstanceOf(DeactivatedVolunteerError);
    } finally {
      if (selfDelete.isTransactionActive) {
        await selfDelete.rollbackTransaction();
      }
      await Promise.allSettled([insert]);
      if (coordinator.isTransactionActive) {
        await coordinator.rollbackTransaction();
      }
      await selfDelete.release();
      await coordinator.release();
    }

    expect(
      await dataSource.manager.existsBy(OpportunityVolunteer, {
        volunteerId: volunteer.id,
      }),
    ).toBe(false);
  });
});
