import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { NotFoundError } from "../../../config";
import { dtoOpportunityAuditLog } from "../../../services/dto/dto-opportunity-audit-log";
import { idParamSchema, opportunityAuditLogSchemaGet200 } from "../../schema";
import { assertAgentMemberOrStaffOr403, assertRoleIn } from "../../utils";

export default function opportunityAuditLogRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{ Params: { id: number } }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: opportunityAuditLogSchemaGet200,
        },
      },
    },
    async (request, reply) => {
      assertRoleIn(request);
      const id = request.params.id;

      const opportunity = await fastify.db.opportunityRepository.findOne({
        select: { id: true, agentId: true },
        where: { id },
      });
      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${id}) not found.`);
      }
      await assertAgentMemberOrStaffOr403(
        request,
        opportunity.agentId,
        "Only staff and members of the opportunity's NGO can read its change history.",
      );

      const entries = await fastify.db.opportunityAuditLogRepository.find({
        where: { opportunityId: id },
        order: { occurredAt: "DESC", id: "DESC" },
      });

      return reply.send({
        message: `Profile changes for opportunity ${id}`,
        data: entries.map(dtoOpportunityAuditLog),
      });
    },
  );
}
