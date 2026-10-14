import { FastifyInstance } from "fastify";
import { ApiOrganizationGetList } from "need4deed-sdk";
import { dtoOrganizationGetList } from "../../../services/dto/dto-organization";

export async function listOrganizations(
  fastify: FastifyInstance,
): Promise<ApiOrganizationGetList[]> {
  const organizations = await fastify.db.organizationRepository.find({
    order: { title: "ASC" },
  });
  return organizations.map(dtoOrganizationGetList);
}
