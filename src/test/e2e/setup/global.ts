/**
 * Vitest global setup for e2e tests.
 *
 * Runs once in the main vitest process before any test workers start.
 * Applies migrations and seeds all reference + test fixture data so that
 * test files can connect to an already-prepared database.
 *
 * Seeds are idempotent — re-running against an existing DB is safe.
 */
export async function setup(): Promise<void> {
  // Dynamic imports avoid decorator metadata issues in the global setup context.
  const { dataSource } = await import("../../../data/data-source");
  const { seedReference } = await import("../../../data/seeds/seed");
  const { seedUser } = await import("../../../data/seeds/user.seed");
  const { seedTestFixtures } = await import(
    "../../../data/seeds/fixtures/test"
  );

  await dataSource.initialize();
  await dataSource.runMigrations();
  await seedReference(dataSource);
  await seedUser(dataSource);
  await seedTestFixtures(dataSource);
  // Do not destroy: @AfterInsert hooks on OpportunityVolunteer fire async and
  // use this same dataSource singleton. Destroying here would cut them off.
  // Vitest forks get their own module instances; this connection is only in
  // the main process and is released when vitest exits.
}
