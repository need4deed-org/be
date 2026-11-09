import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerCommute, ApiVolunteerCommuteQuery } from "need4deed-sdk";
import { In } from "typeorm";
import { NotFoundError, UnauthorizedError } from "../../../config";
import {
  idParamSchema,
  responseSchema,
  volunteerCommuteQuerySchema,
} from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import {
  commuteOf,
  commutePairKey,
  loadCommuteRangesForCaller,
} from "../../utils";

export default function volunteerCommuteRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    Querystring: ApiVolunteerCommuteQuery;
    Reply: ReplyData<ApiVolunteerCommute[]>;
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        querystring: volunteerCommuteQuerySchema,
        response: responseSchema("ApiVolunteerCommute#", true, false),
      },
    },
    async (request, reply) => {
      const { id: volunteerId } = request.params;
      if (
        !(await fastify.db.volunteerRepository.existsBy({ id: volunteerId }))
      ) {
        throw new NotFoundError(`Volunteer (id:${volunteerId}) not found.`);
      }

      const requestedIds = [
        ...new Set([request.query.opportunity].flat().map(Number)),
      ];
      const opportunities = await fastify.db.opportunityRepository.find({
        where: { id: In(requestedIds) },
        select: { id: true, agentId: true },
      });
      const commutes = await loadCommuteRangesForCaller(
        request,
        opportunities.map(({ id: opportunityId, agentId }) => ({
          volunteerId,
          opportunityId,
          opportunityAgentId: agentId,
        })),
      );
      if (!commutes) {
        throw new UnauthorizedError(
          "Commutes are only available to coordinators, admins and NGOs.",
        );
      }
      const allowed = (opportunityId: number) =>
        commutes.has(commutePairKey({ volunteerId, opportunityId }));

      return reply.status(200).send({
        message: `Commutes for volunteer (id:${volunteerId}).`,
        data: requestedIds.filter(allowed).map((opportunityId) => ({
          opportunityId,
          commute: commuteOf(commutes, { volunteerId, opportunityId }),
        })),
      });
    },
  );
}
