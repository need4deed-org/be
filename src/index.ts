import "./data";
import logger from "./logger";
import { createServer } from "./server";

export async function start() {
  try {
    const server = await createServer();
    const port = Number(process.env.PORT) || 5000;
    await server.listen({ port, host: "0.0.0.0" });
    logger.info("Server started.");

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`);
      const forceExit = setTimeout(() => process.exit(1), 10_000);
      try {
        await server.close();
      } catch (err) {
        logger.error(err);
      } finally {
        clearTimeout(forceExit);
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
