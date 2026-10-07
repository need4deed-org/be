import { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "../../../server";

const queueUntranslatedOpportunities = vi.fn(async () => 0);
vi.mock(
  "../../../server/utils/data/translate-opportunities",
  async (actual) => ({
    ...(await actual<
      typeof import("../../../server/utils/data/translate-opportunities")
    >()),
    queueUntranslatedOpportunities: () => queueUntranslatedOpportunities(),
  }),
);
// The worker would translate every pending row in the shared database.
vi.mock("../../../services/translation/worker", () => ({
  runTranslationBatch: vi.fn(async () => ({ picked: 0 })),
}));

vi.setConfig({ testTimeout: 30_000 });

// be#1068: the scheduled worker run backfills opportunities from before
// translation; a run for given rows doesn't.
describe("translation worker backfill", () => {
  let fastify: FastifyInstance | undefined;

  afterEach(async () => {
    delete process.env.TRANSLATION_ENABLED;
    delete process.env.CRON_SCHEDULE_TRANSLATION;
    queueUntranslatedOpportunities.mockClear();
    await fastify?.close();
    fastify = undefined;
  });

  async function start() {
    process.env.TRANSLATION_ENABLED = "true";
    // Never fires while a test runs.
    process.env.CRON_SCHEDULE_TRANSLATION = "0 0 1 1 *";
    fastify = await createServer();
    await fastify.ready();
    return fastify;
  }

  it("queues untranslated opportunities on a scheduled run", async () => {
    const server = await start();

    await server.translation.runBatch();

    expect(queueUntranslatedOpportunities).toHaveBeenCalledTimes(1);
  });

  it("doesn't on a run for given rows", async () => {
    const server = await start();

    await server.translation.runBatch({ rowIds: [1] });

    expect(queueUntranslatedOpportunities).not.toHaveBeenCalled();
  });
});
