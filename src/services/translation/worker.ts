import { Lang, TranslationOrigin, TranslationStatus } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import FieldTranslation from "../../data/entity/field_translation.entity";
import logger from "../../logger";
import { TranslationConfig } from "./config";
import { sourceHashOf } from "./queue";
import { translatedEntities } from "./registry";
import { TranslationService } from "./service";
import { TranslationErrorCode } from "./types";

export interface BatchOptions {
  // Only these field_translation rows (tests, manual re-runs).
  rowIds?: number[];
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface BatchStats {
  picked: number;
  done: number;
  failed: number;
  retried: number;
  // Source edited during the call: result discarded, re-translated later.
  stale: number;
  skipped: number;
  rateLimited: boolean;
  promptTokens: number;
  completionTokens: number;
  failures: Partial<Record<TranslationErrorCode, number>>;
}

const MACHINE_ENTRIES = Object.values(translatedEntities).filter(
  ({ machine }) => machine,
);

const sleepFor = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One worker run (be#1067). Picks due pending machine rows, oldest first,
 * at most one minute's worth at TRANSLATION_MAX_RPM, and translates them one
 * field per call.
 *
 * - No row locks while the provider is called (design A): each result is
 *   written only if the row still has the source hash it was picked with,
 *   so an edit during the call discards the stale result.
 * - Transient errors retry on later runs after a backoff of 2^attempts
 *   minutes (design B); a 429 ends the run.
 * - Logs counts and codes only, never text.
 */
export async function runTranslationBatch(
  manager: EntityManager,
  service: TranslationService,
  config: TranslationConfig,
  { rowIds, now = Date.now, sleep = sleepFor }: BatchOptions = {},
): Promise<BatchStats> {
  const stats: BatchStats = {
    picked: 0,
    done: 0,
    failed: 0,
    retried: 0,
    stale: 0,
    skipped: 0,
    rateLimited: false,
    promptTokens: 0,
    completionTokens: 0,
    failures: {},
  };

  const query = manager
    .getRepository(FieldTranslation)
    .createQueryBuilder("ft")
    .leftJoinAndSelect("ft.language", "language")
    .where("ft.status = :pending", { pending: TranslationStatus.PENDING })
    .andWhere("ft.origin = :machine", { machine: TranslationOrigin.MACHINE })
    .andWhere(
      "(ft.attempts = 0 OR ft.updated_at <= now() - interval '1 minute' * power(2, ft.attempts))",
    )
    .orderBy("ft.updatedAt", "ASC")
    .take(config.maxRequestsPerMinute);
  if (rowIds) {
    query.andWhere("ft.id IN (:...rowIds)", { rowIds: [0, ...rowIds] });
  }
  const rows = await query.getMany();
  stats.picked = rows.length;

  const interval = 60_000 / config.maxRequestsPerMinute;
  let lastCall: number | undefined;

  for (const row of rows) {
    const source = await sourceTextOf(manager, row);
    const lang = row.language?.isoCode as Lang | undefined;
    if (!source || !lang) {
      stats.skipped++;
      continue;
    }

    if (lastCall !== undefined) {
      const wait = interval - (now() - lastCall);
      if (wait > 0) {
        await sleep(wait);
      }
    }
    lastCall = now();

    const result = await service.translateField(source, lang);
    // Written only while the row still waits for this very source text.
    const guarded = (set: Partial<Record<keyof FieldTranslation, unknown>>) =>
      manager
        .createQueryBuilder()
        .update(FieldTranslation)
        .set({ ...set, updatedAt: () => "now()" })
        .where("id = :id AND source_hash = :hash AND status = :pending", {
          id: row.id,
          hash: row.sourceHash,
          pending: TranslationStatus.PENDING,
        })
        .execute();

    if (result.status === "done") {
      const { affected } = await guarded({
        translation: result.text,
        status: TranslationStatus.DONE,
        sourceHash: sourceHashOf(source),
        model: result.model,
        lastErrorCode: null,
      });
      if (affected) {
        stats.done++;
        stats.promptTokens += result.usage?.promptTokens ?? 0;
        stats.completionTokens += result.usage?.completionTokens ?? 0;
      } else {
        stats.stale++;
      }
    } else if (result.status === "failed") {
      const { affected } = await guarded({
        status: TranslationStatus.FAILED,
        lastErrorCode: result.code,
      });
      if (affected) {
        stats.failed++;
        stats.failures[result.code] = (stats.failures[result.code] ?? 0) + 1;
      } else {
        stats.stale++;
      }
    } else {
      const attempts = row.attempts + 1;
      const exhausted = attempts >= config.maxAttempts;
      await guarded({
        attempts,
        ...(exhausted
          ? {
              status: TranslationStatus.FAILED,
              lastErrorCode: "provider_unavailable",
            }
          : {}),
      });
      if (exhausted) {
        stats.failed++;
        stats.failures.provider_unavailable =
          (stats.failures.provider_unavailable ?? 0) + 1;
      } else {
        stats.retried++;
      }
      if (result.reason === "rate_limited") {
        stats.rateLimited = true;
        break;
      }
    }
  }

  if (stats.picked > 0) {
    logger.info(stats, "translation: batch done");
  }
  return stats;
}

// The source row's current text, or undefined when it's gone or empty.
async function sourceTextOf(
  manager: EntityManager,
  row: FieldTranslation,
): Promise<string | undefined> {
  const entry = MACHINE_ENTRIES.find(
    ({ fk }) => row[fk] !== null && row[fk] !== undefined,
  );
  if (!entry) {
    return undefined;
  }
  const entity = (await manager.findOneBy(entry.entity, {
    id: row[entry.fk] as number,
  })) as unknown as Record<string, unknown> | null;
  const text = entity?.[row.fieldName];
  return typeof text === "string" && text.trim() ? text.trim() : undefined;
}
