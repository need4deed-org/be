import { UserRole } from "need4deed-sdk";
import { QueryRunner } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dataSource } from "../../../../data/data-source";
import User from "../../../../data/entity/user.entity";
import Volunteer from "../../../../data/entity/volunteer/volunteer.entity";
import { isVolunteerDeactivated } from "../../../../server/utils/data/is-volunteer-deactivated";
import { createVolunteer } from "../../../data/match-fixtures";
import { randomNumericSuffix } from "../../../random";

describe("isVolunteerDeactivated", () => {
  let queryRunner: QueryRunner;
  let volunteer: Volunteer;

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
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  const addUser = (
    personId: number,
    role: UserRole,
    deactivatedAt: Date | null,
    createdAt = new Date("2026-01-01"),
  ) =>
    queryRunner.manager.save(
      new User({
        email: `deactivated-${randomNumericSuffix()}@example.org`,
        password: "",
        personId,
        role,
        isActive: !deactivatedAt,
        deactivatedAt,
        createdAt,
      }),
    );

  const check = (volunteerId = volunteer.id) =>
    isVolunteerDeactivated(queryRunner.manager, volunteerId);

  it("is false for a volunteer without a login", async () => {
    expect(await check()).toBe(false);
  });

  it("is false while the volunteer login is active", async () => {
    await addUser(volunteer.personId, UserRole.VOLUNTEER, null);

    expect(await check()).toBe(false);
  });

  it("is true once the volunteer login is deactivated", async () => {
    await addUser(volunteer.personId, UserRole.VOLUNTEER, new Date());

    expect(await check()).toBe(true);
  });

  it("is false when a login is issued after the deactivation", async () => {
    await addUser(
      volunteer.personId,
      UserRole.VOLUNTEER,
      new Date("2026-02-01"),
    );
    await addUser(
      volunteer.personId,
      UserRole.VOLUNTEER,
      null,
      new Date("2026-03-01"),
    );

    expect(await check()).toBe(false);
  });

  it("is true when one of two earlier logins is deactivated", async () => {
    await addUser(volunteer.personId, UserRole.VOLUNTEER, null);
    await addUser(
      volunteer.personId,
      UserRole.VOLUNTEER,
      new Date("2026-02-01"),
    );

    expect(await check()).toBe(true);
  });

  it("ignores a deactivated login of another role on the same person", async () => {
    await addUser(volunteer.personId, UserRole.COORDINATOR, new Date());

    expect(await check()).toBe(false);
  });

  it("ignores another volunteer's deactivated login", async () => {
    const other = await createVolunteer(queryRunner.manager);
    await addUser(other.personId, UserRole.VOLUNTEER, new Date());

    expect(await check()).toBe(false);
  });
});
