import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import cron from "node-cron";
import { dataSource } from "../../data/data-source";
import logger from "../../logger";
import { getTranslationConfig } from "../../services/translation/config";
import {
  enqueue,
  setHuman,
  setOriginalLanguage,
} from "../../services/translation/queue";
import { resolve } from "../../services/translation/resolve";
import {
  createTranslationProvider,
  TranslationService,
} from "../../services/translation/service";
import {
  BatchOptions,
  BatchStats,
  runTranslationBatch,
} from "../../services/translation/worker";
import { runWithAdvisoryLock } from "../utils";

// Unique integer key for the translation worker's advisory lock, separate
// from the notify schedulers' (20240701, 20240707).
const TRANSLATION_LOCK_ID = 20260929;

interface TranslationApi {
  enqueue: typeof enqueue;
  setHuman: typeof setHuman;
  setOriginalLanguage: typeof setOriginalLanguage;
  resolve: typeof resolve;
  // One worker run under the advisory lock; undefined when disabled or when
  // another instance holds the lock.
  runBatch(options?: BatchOptions): Promise<BatchStats | undefined>;
}

declare module "fastify" {
  interface FastifyInstance {
    translation: TranslationApi;
  }
}

/**
 * Machine translation of user-entered text (be#1064). enqueue/resolve and
 * the corrections are always available: queuing sends nothing anywhere.
 * The worker, the only part that calls a provider, runs on
 * CRON_SCHEDULE_TRANSLATION and only when TRANSLATION_ENABLED is set. It
 * has its own switch, not the notify schedulers' isCronMuted() (be#1077).
 */
async function translationPlugin(fastify: FastifyInstance): Promise<void> {
  const config = getTranslationConfig();
  const service = new TranslationService(createTranslationProvider(config));

  const runBatch = async (options?: BatchOptions) => {
    if (!config.enabled) {
      return undefined;
    }
    let stats: BatchStats | undefined;
    await runWithAdvisoryLock(async () => {
      stats = await runTranslationBatch(
        dataSource.manager,
        service,
        config,
        options,
      );
    }, TRANSLATION_LOCK_ID);
    return stats;
  };

  fastify.decorate("translation", {
    enqueue,
    setHuman,
    setOriginalLanguage,
    resolve,
    runBatch,
  });

  logger.info(
    { enabled: config.enabled, provider: service.provider.name },
    "translation: plugin ready",
  );
  if (!config.enabled) {
    return;
  }
  if (!cron.validate(config.cronSchedule)) {
    throw new Error(
      `CRON_SCHEDULE_TRANSLATION is not a valid cron expression: ${config.cronSchedule}`,
    );
  }

  const task = cron.schedule(
    config.cronSchedule,
    async () => {
      try {
        await runBatch();
      } catch (err) {
        // Name and message only: a query error's parameters may carry text.
        logger.error(
          { error: (err as Error).name, message: (err as Error).message },
          "translation: worker run failed",
        );
      }
    },
    { timezone: "Europe/Berlin" },
  );

  fastify.addHook("onClose", () => task.stop());
}

export default fp(translationPlugin, {
  name: "translation",
  dependencies: ["typeorm-plugin"],
});
