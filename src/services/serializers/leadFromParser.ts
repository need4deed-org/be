import { fastify } from "../../server";

export async function leadFromParser(leadFromData: string[]): Promise<void> {
  fastify.log.debug(`Lead from data: ${JSON.stringify(leadFromData)}`);
}
