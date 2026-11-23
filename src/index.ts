import type { FastifyInstance } from "fastify";
import "./data";
import {
  alertOpsSlack,
  createFatalHandler,
  installFatalHandlers,
} from "./fatal";
import logger from "./logger";
import { createServer } from "./server";

const fatal = createFatalHandler({
  logger,
  exit: (code) => process.exit(code),
  alertOps: alertOpsSlack,
  timeoutMs: 5_000,
});

export async function start() {
  installFatalHandlers(fatal.onFatal);

  let server: FastifyInstance | undefined;
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      logger.info(`Received ${signal} again, exiting now`);
      logger.flush(() => process.exit(1));
      return;
    }
    shuttingDown = true;
    logger.info(
      `Received ${signal}, shutting down${server ? "" : " during startup"}...`,
    );
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    try {
      await server?.close();
    } catch (err) {
      logger.error(err);
    } finally {
      logger.flush(() => {
        clearTimeout(forceExit);
        if (!fatal.isExiting()) {
          process.exit(0);
        }
      });
    }
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    server = await createServer();
    const port = Number(process.env.PORT) || 5000;
    await server.listen({ port, host: "0.0.0.0" });
    logger.info("Server started.");
  } catch (err) {
    if (shuttingDown) {
      logger.error({ err }, "Startup ended during shutdown");
      return;
    }
    fatal.onFatal("startup failed", err);
  }
}

start();
