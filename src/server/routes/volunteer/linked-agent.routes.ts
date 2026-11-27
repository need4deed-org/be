import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { VolunteerAuditLogType } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";
import VolunteerAgentLink from "../../../data/entity/volunteer/volunteer-agent-link.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import {
  IdAgentIdParam,
  idAgentIdParamSchema,
  responseSchema,
} from "../../schema";
import { ReplyMessage } from "../../types";
import { assertCoordinatorOrGroupCoordinator } from "../../utils";

export default function volunteerLinkedAgentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.delete<{ Params: IdAgentIdParam; Reply: ReplyMessage }>(
    "/:agentId",
    {
      schema: {
        params: idAgentIdParamSchema,
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      await assertCoordinatorOrGroupCoordinator(request);
      const { id: volunteerId, agentId } = request.params;

      await fastify.db.volunteerRepository.manager.transaction(
        async (manager) => {
          const { affected } = await manager.delete(VolunteerAgentLink, {
            volunteerId,
            agentId,
          });
          if (!affected) {
            throw new NotFoundError(
              `Volunteer (id:${volunteerId}) isn't connected to agent (id:${agentId}).`,
            );
          }
          const agent = await manager.findOne(Agent, {
            where: { id: agentId },
            select: { id: true, title: true },
          });
          await manager.insert(
            VolunteerAuditLog,
            new VolunteerAuditLog({
              volunteerId,
              type: VolunteerAuditLogType.AGENT_UNLINKED,
              detail: `Disconnected from ${agent?.title} (id:${agentId}).`,
              actorUserId: request.authUser?.id,
              occurredAt: new Date(),
            }),
          );
        },
      );

      return reply.status(200).send({
        message: `Volunteer (id:${volunteerId}) disconnected from agent (id:${agentId}).`,
      });
    },
  );
}
