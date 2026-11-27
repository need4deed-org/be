import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiGroupDeleteResponse,
  ApiGroupGet,
  ApiGroupGetList,
  ApiGroupPatch,
  ApiGroupPost,
  UserRole,
} from "need4deed-sdk";
import logger from "../../logger";
import {
  groupDeleteResponseSchema,
  groupItemResponseSchema,
  groupListResponseSchema,
  groupPatchBodySchema,
  groupPostBodySchema,
  idParamSchema,
  responseErrors,
} from "../schema";
import { ParamsId, ReplyData } from "../types";
import {
  createVolunteerGroup,
  deleteVolunteerGroup,
  getVolunteerGroup,
  listVolunteerGroups,
  renameVolunteerGroup,
} from "../utils/data/volunteer-group";

export default async function groupRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate({ role: UserRole.ADMIN }));

  fastify.get<{ Reply: ReplyData<ApiGroupGetList[]> }>(
    "/",
    {
      schema: {
        response: { 200: groupListResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const data = await listVolunteerGroups(
        fastify.db.volunteerGroupRepository.manager,
      );
      logger.info(
        `Admin ${request.authUser!.id} listed groups (${data.length})`,
      );
      return reply.status(200).send({
        message: `${data.length} groups.`,
        data,
      });
    },
  );

  fastify.get<{ Params: ParamsId; Reply: ReplyData<ApiGroupGet> }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: { 200: groupItemResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = await getVolunteerGroup(
        fastify.db.volunteerGroupRepository.manager,
        id,
      );
      logger.info(`Admin ${request.authUser!.id} viewed group ${id}`);
      return reply.status(200).send({
        message: `Group (id:${id}).`,
        data,
      });
    },
  );

  fastify.post<{ Body: ApiGroupPost; Reply: ReplyData<ApiGroupGet> }>(
    "/",
    {
      schema: {
        body: groupPostBodySchema,
        response: { 201: groupItemResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const adminId = request.authUser!.id;
      const data =
        await fastify.db.volunteerGroupRepository.manager.transaction(
          (manager) => createVolunteerGroup(manager, request.body),
        );
      const scope =
        data.organizationId !== null
          ? `organization:${data.organizationId}`
          : `agent:${data.agentId}`;
      logger.info(`Admin ${adminId} created group ${data.id} (${scope})`);
      return reply.status(201).send({
        message: `Group (id:${data.id}) created.`,
        data,
      });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Body: ApiGroupPatch;
    Reply: ReplyData<ApiGroupGet>;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: groupPatchBodySchema,
        response: { 200: groupItemResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const adminId = request.authUser!.id;
      const data =
        await fastify.db.volunteerGroupRepository.manager.transaction(
          (manager) => renameVolunteerGroup(manager, id, request.body.title),
        );
      logger.info(`Admin ${adminId} renamed group ${id}`);
      return reply.status(200).send({
        message: `Group (id:${id}) updated.`,
        data,
      });
    },
  );

  fastify.delete<{
    Params: ParamsId;
    Reply: ReplyData<ApiGroupDeleteResponse>;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: { 200: groupDeleteResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const adminId = request.authUser!.id;
      const data =
        await fastify.db.volunteerGroupRepository.manager.transaction(
          (manager) => deleteVolunteerGroup(manager, id, adminId),
        );
      logger.info(
        `Admin ${adminId} deleted group ${id} (volunteers=${data.counts.volunteers}, opportunities=${data.counts.opportunities}, accounts=${data.counts.accounts}, erasedPersons=${data.erasedPersons})`,
      );
      return reply.status(200).send({
        message: `Group (id:${id}) deleted.`,
        data,
      });
    },
  );
}
