import { FastifyInstance } from "fastify";
import "./data"; // initialize database connection
import { createServer } from "./server";

let server: FastifyInstance;

export async function start() {
  try {
    server = await createServer();
    const port = Number(process.env.PORT) || 5000;
    await server.listen({ port, host: "0.0.0.0" });
    server.log.info("Server started.");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
