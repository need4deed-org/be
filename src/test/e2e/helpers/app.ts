import { FastifyInstance } from "fastify";
import { createServer } from "../../../server";

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await createServer();
  await app.ready();
  return app;
}

export function getCookie(
  cookies: { name: string; value: string }[],
  name: string,
): string | undefined {
  return cookies.find((c) => c.name === name)?.value;
}
