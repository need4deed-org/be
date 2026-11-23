import type { FastifyInstance } from "fastify";
import "./data";
import {
  alertOpsSlack,
  createFatalHandler,
  installFatalHandlers,
} from "./fatal";
import logger from "./logger";
import { createServer } from "./server";

const onFatal = createFatalHandler({
  logger,
  exit: (code) => process.exit(code),
  alertOps: alertOpsSlack,
  timeoutMs: 5_000,
});

export async function start() {
  installFatalHandlers(onFatal);

  let server: FastifyInstance | undefined;
  const shutdown = async (signal: string) => {
    logger.info(
      `Received ${signal}, shutting down${server ? "" : " during startup"}...`,
    );
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    try {
      await server?.close();
    } catch (err) {
      logger.error(err);
    } finally {
      clearTimeout(forceExit);
      logger.flush(() => process.exit(0));
    }
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  try {
    server = await createServer();
    const port = Number(process.env.PORT) || 5000;
    await server.listen({ port, host: "0.0.0.0" });
    logger.info("Server started.");
  } catch (err) {
    onFatal("startup failed", err);
  }
}

start();
