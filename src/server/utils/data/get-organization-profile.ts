import { FastifyRequest } from "fastify";
import { ApiOrganizationGet, Service } from "need4deed-sdk";
import { FindOptionsWhere } from "typeorm";
import { NotFoundError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";
import {
  dtoAgentTagCandidate,
  dtoOptionTitle,
  dtoOrganizationGet,
} from "../../../services";
import { maskForCaller } from "../pii/pre-serialization";
import { addAgentTypeServiceTranslations } from "./add-agent-type-service-translations";
import { isStaffRole } from "./is-staff-role";

export async function getOrganizationProfile(
  request: FastifyRequest,
  id: number,
): Promise<ApiOrganizationGet> {
  const { db } = request.server;
  const organization = await db.organizationRepository.findOne({
    where: { id },
    relations: ["address.postcode", "person"],
  });
  if (!organization) {
    throw new NotFoundError(`Organization (id:${id}) not found.`);
  }

  const where: FindOptionsWhere<Agent> = { organizationId: id };
  if (!isStaffRole(request.authUser?.role)) {
    where.unclaimed = false;
  }
  const agents = await db.agentRepository.find({
    where,
    relations: ["district", "agentService.service"],
    order: { title: "ASC", id: "ASC" },
  });
  await addAgentTypeServiceTranslations(agents);
  await maskForCaller(request, organization.person);

  const services = new Map<number, Service>();
  for (const { serviceId, service } of agents.flatMap(
    (agent) => agent.agentService ?? [],
  )) {
    if (!services.has(serviceId)) {
      services.set(serviceId, dtoOptionTitle(serviceId, service));
    }
  }

  return dtoOrganizationGet(
    organization,
    agents.map((agent) =>
      dtoAgentTagCandidate({
        id: agent.id,
        title: agent.title,
        districtId: agent.districtId ?? null,
        districtTitle: agent.district?.title ?? null,
      }),
    ),
    [...services.keys()].sort((a, b) => a - b).map((key) => services.get(key)!),
  );
}
