import {
  EntityTableName,
  Lang,
  OpportunityType,
  TranslationStatus,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Language from "../../../data/entity/profile/language.entity";
import logger from "../../../logger";
import { getTranslationConfig } from "../../../services/translation/config";
import { FakeProvider } from "../../../services/translation/providers/fake";
import { enqueue, sourceHashOf } from "../../../services/translation/queue";
import { TranslationService } from "../../../services/translation/service";
import {
  ProviderResult,
  TranslationRequest,
} from "../../../services/translation/types";
import { runTranslationBatch } from "../../../services/translation/worker";
import { randomNumericSuffix } from "../../random";

const OPP = EntityTableName.OPPORTUNITY;
const config = { ...getTranslationConfig({}), maxRequestsPerMinute: 60 };

describe("runTranslationBatch", () => {
  const suffix = randomNumericSuffix();
  const created: number[] = [];
  let deId: number;

  const manager = () => dataSource.manager;
  const noSleep = { sleep: async () => {} };

  function worker(
    respond?: (
      r: TranslationRequest,
    ) => ProviderResult | Promise<ProviderResult>,
  ) {
    const provider = new FakeProvider(respond);
    return {
      provider,
      service: new TranslationService(provider, async () => []),
    };
  }

  // A German opportunity with its English title queued; returns the row.
  async function queued(title = `Kinderbetreuung ${suffix}`) {
    const opportunity = await manager().save(
      new Opportunity({
        title: `${title} ${created.length}`,
        type: OpportunityType.REGULAR,
        originalLanguageId: deId,
      }),
    );
    created.push(opportunity.id);
    await enqueue(manager(), OPP, opportunity, { title: opportunity.title });
    const row = await manager().findOneByOrFail(FieldTranslation, {
      opportunityId: opportunity.id,
    });
    return { opportunity, row };
  }

  const reload = (id: number) =>
    manager().findOneByOrFail(FieldTranslation, { id });

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    deId = (await manager().findOneByOrFail(Language, { isoCode: "de" })).id;
  });

  afterAll(async () => {
    if (created.length) {
      await manager().delete(Opportunity, created);
    }
  });

  it("translates a pending row and stores the result", async () => {
    const { row, opportunity } = await queued();
    const { service, provider } = worker();

    const stats = await runTranslationBatch(manager(), service, config, {
      rowIds: [row.id],
      ...noSleep,
    });

    expect(stats).toMatchObject({ picked: 1, done: 1, failed: 0 });
    expect(provider.requests[0]).toMatchObject({
      text: opportunity.title,
      targetLang: Lang.EN,
    });
    expect(await reload(row.id)).toMatchObject({
      status: TranslationStatus.DONE,
      translation: `[en] ${opportunity.title}`,
      model: "fake",
      lastErrorCode: null,
    });
  });

  it("stores a validation failure with its code, without retrying", async () => {
    const { row } = await queued(
      "Wir suchen Ehrenamtliche für unsere Kleiderkammer",
    );
    const { service } = worker(() => ({
      status: "ok",
      text: "pwned",
      model: "m",
    }));

    const stats = await runTranslationBatch(manager(), service, config, {
      rowIds: [row.id],
      ...noSleep,
    });

    expect(stats.failures).toEqual({ length_ratio: 1 });
    expect(await reload(row.id)).toMatchObject({
      status: TranslationStatus.FAILED,
      lastErrorCode: "length_ratio",
      attempts: 0,
    });
  });

  it("retries transient errors after a backoff, then gives up", async () => {
    const { row } = await queued();
    const { service, provider } = worker(() => ({
      status: "error",
      kind: "unavailable",
    }));
    const run = () =>
      runTranslationBatch(manager(), service, config, {
        rowIds: [row.id],
        ...noSleep,
      });

    expect(await run()).toMatchObject({ retried: 1 });
    expect(await reload(row.id)).toMatchObject({
      status: TranslationStatus.PENDING,
      attempts: 1,
    });

    // Backing off: not picked again right away.
    expect(await run()).toMatchObject({ picked: 0 });

    for (let attempt = 2; attempt <= config.maxAttempts; attempt++) {
      await manager().query(
        `UPDATE field_translation SET updated_at = now() - interval '1 day' WHERE id = $1`,
        [row.id],
      );
      await run();
    }
    expect(provider.requests).toHaveLength(config.maxAttempts);
    expect(await reload(row.id)).toMatchObject({
      status: TranslationStatus.FAILED,
      lastErrorCode: "provider_unavailable",
      attempts: config.maxAttempts,
    });
  });

  it("ends the run on a rate limit", async () => {
    const first = await queued();
    const second = await queued();
    const { service, provider } = worker(() => ({
      status: "error",
      kind: "rate_limited",
    }));

    const stats = await runTranslationBatch(manager(), service, config, {
      rowIds: [first.row.id, second.row.id],
      ...noSleep,
    });

    expect(stats).toMatchObject({ picked: 2, retried: 1, rateLimited: true });
    expect(provider.requests).toHaveLength(1);
    // Review finding 5: our own rate limit doesn't use up the row's attempts.
    expect(await reload(first.row.id)).toMatchObject({
      status: TranslationStatus.PENDING,
      attempts: 0,
    });
  });

  it("ends the run on rejected credentials without failing rows", async () => {
    // Review finding 3: an expired token must not fail the queue for good.
    const first = await queued();
    const second = await queued();
    const { service, provider } = worker(() => ({
      status: "error",
      kind: "misconfigured",
    }));

    const stats = await runTranslationBatch(manager(), service, config, {
      rowIds: [first.row.id, second.row.id],
      ...noSleep,
    });

    expect(stats).toMatchObject({ misconfigured: true, failed: 0 });
    expect(provider.requests).toHaveLength(1);
    expect(await reload(first.row.id)).toMatchObject({
      status: TranslationStatus.PENDING,
      attempts: 0,
    });
  });

  it("removes a pending row whose source text is gone", async () => {
    // Review finding 6: such rows stayed the oldest due and blocked the queue.
    const { row, opportunity } = await queued();
    await manager().update(Opportunity, opportunity.id, { title: "" });
    const { service, provider } = worker();

    const stats = await runTranslationBatch(manager(), service, config, {
      rowIds: [row.id],
      ...noSleep,
    });

    expect(stats).toMatchObject({ picked: 1, removed: 1 });
    expect(provider.requests).toHaveLength(0);
    expect(
      await manager().findOneBy(FieldTranslation, { id: row.id }),
    ).toBeNull();
  });

  it("discards a result when the source is edited during the call", async () => {
    const { row, opportunity } = await queued();
    const edited = `${opportunity.title} am Montag`;
    const { service } = worker(async (request) => {
      // The coordinator saves a new title while the model is working.
      await manager().update(Opportunity, opportunity.id, { title: edited });
      await enqueue(manager(), OPP, opportunity, { title: edited });
      return { status: "ok", text: `[en] ${request.text}`, model: "fake" };
    });

    const stats = await runTranslationBatch(manager(), service, config, {
      rowIds: [row.id],
      ...noSleep,
    });

    expect(stats).toMatchObject({ done: 0, stale: 1 });
    expect(await reload(row.id)).toMatchObject({
      status: TranslationStatus.PENDING,
      translation: null,
      sourceHash: sourceHashOf(edited),
    });

    // The next run translates the new text.
    const next = await runTranslationBatch(
      manager(),
      worker().service,
      config,
      {
        rowIds: [row.id],
        ...noSleep,
      },
    );
    expect(next.done).toBe(1);
    expect((await reload(row.id)).translation).toBe(`[en] ${edited}`);
  });

  it("counts an outage during a source edit as stale, not as a retry", async () => {
    // Full-review finding 2: the guarded write changes nothing then.
    const { row, opportunity } = await queued();
    const edited = `${opportunity.title} am Montag`;
    const { service } = worker(async () => {
      await manager().update(Opportunity, opportunity.id, { title: edited });
      await enqueue(manager(), OPP, opportunity, { title: edited });
      return { status: "error", kind: "unavailable" };
    });

    const stats = await runTranslationBatch(manager(), service, config, {
      rowIds: [row.id],
      ...noSleep,
    });

    expect(stats).toMatchObject({ stale: 1, retried: 0, failed: 0 });
    expect(await reload(row.id)).toMatchObject({
      attempts: 0,
      sourceHash: sourceHashOf(edited),
    });
  });

  it("spaces calls to stay under the rate limit", async () => {
    const rows = [await queued(), await queued(), await queued()];
    let clock = 0;
    const sleep = vi.fn(async (ms: number) => {
      clock += ms;
    });

    await runTranslationBatch(manager(), worker().service, config, {
      rowIds: rows.map(({ row }) => row.id),
      now: () => clock,
      sleep,
    });

    // 60 per minute: one call a second.
    expect(sleep.mock.calls).toEqual([[1000], [1000]]);
  });

  it("never logs source or translated text", async () => {
    const { row, opportunity } = await queued("Frau L. braucht Begleitung");
    const spies = [
      vi.spyOn(logger, "debug"),
      vi.spyOn(logger, "info"),
      vi.spyOn(logger, "warn"),
    ];

    await runTranslationBatch(manager(), worker().service, config, {
      rowIds: [row.id],
      ...noSleep,
    });

    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    vi.restoreAllMocks();
    expect(logged).toContain("translation: batch done");
    expect(logged).not.toContain(opportunity.title);
    expect(logged).not.toContain("Frau L.");
  });
});
