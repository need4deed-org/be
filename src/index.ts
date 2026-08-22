import "./data"; // initialize database connection
import logger from "./logger";
import { createServer } from "./server";

export async function start() {
  try {
    const server = await createServer();
    const port = Number(process.env.PORT) || 5000;
    await server.listen({ port, host: "0.0.0.0" });
    logger.info("Server started.");

    // Without an explicit handler, SIGTERM has no effect on a process running
    // as PID 1 (the kernel skips default signal actions for PID 1) — the dev
    // image's entrypoint only wraps with dumb-init under NODE_ENV=production,
    // so on n4d-dev a killed container rode out the full termination grace
    // period instead of exiting. server.close() also runs the typeorm plugin's
    // onClose hook, closing the DB connection.
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`);
      // A hung close (slow query, in-flight upload, cron scan) must not
      // reintroduce the same ride-out-the-grace-period bug this fix is for.
      const forceExit = setTimeout(() => process.exit(1), 10_000);
      try {
        await server.close();
      } catch (err) {
        logger.error(err);
      } finally {
        clearTimeout(forceExit);
        // pino-pretty runs on a worker thread; process.exit right after
        // close() can race its flush and drop the final log lines.
        logger.flush(() => process.exit(0));
      }
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

start();
