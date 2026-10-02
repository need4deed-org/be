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

const TRANSLATION_LOCK_ID = 20260929;

interface TranslationApi {
  enqueue: typeof enqueue;
  setHuman: typeof setHuman;
  setOriginalLanguage: typeof setOriginalLanguage;
  resolve: typeof resolve;
  runBatch(options?: BatchOptions): Promise<BatchStats | undefined>;
}

declare module "fastify" {
  interface FastifyInstance {
    translation: TranslationApi;
  }
}

async function translationPlugin(fastify: FastifyInstance): Promise<void> {
  const config = getTranslationConfig();
  const provider = createTranslationProvider(config);
  const service = provider && new TranslationService(provider);

  const runBatch = async (options?: BatchOptions) => {
    if (!config.enabled) {
      return undefined;
    }
    if (!service) {
      logger.debug(
        "translation: dry run — no provider configured; rows stay pending, originals are served",
      );
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
    { enabled: config.enabled, provider: provider?.name ?? "none (dry run)" },
    "translation: plugin ready",
  );
  if (!config.enabled) {
    return;
  }
  if (!service) {
    logger.warn(
      "translation: TRANSLATION_ENABLED without INFOMANIAK_AI_PRODUCT_ID/INFOMANIAK_AI_TOKEN — dry run, originals are served",
    );
  }
  if (!cron.validate(config.cronSchedule)) {
    logger.error(
      { schedule: config.cronSchedule },
      "translation: CRON_SCHEDULE_TRANSLATION is not a valid cron expression — worker not scheduled",
    );
    return;
  }

  const task = cron.schedule(
    config.cronSchedule,
    async () => {
      try {
        await runBatch();
      } catch (err) {
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
