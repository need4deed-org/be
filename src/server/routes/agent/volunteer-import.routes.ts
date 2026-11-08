import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiVolunteerImportPost,
  ApiVolunteerImportResult,
  UserRole,
} from "need4deed-sdk";
import { idParamSchema, responseErrors } from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import { importOwnedVolunteers } from "../../utils/data/import-owned-volunteers";

const reportSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: { $ref: "ApiVolunteerImportResult#" },
  },
  required: ["message"],
};

export default async function agentVolunteerImportRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{
    Params: ParamsId;
    Body: ApiVolunteerImportPost;
    Reply: ReplyData<ApiVolunteerImportResult>;
  }>(
    "/",
    {
      onRequest: fastify.authenticate({ role: UserRole.ADMIN }),
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiVolunteerImportPost#" },
        response: {
          ...responseErrors,
          200: reportSchema,
          201: reportSchema,
          400: reportSchema,
        },
      },
    },
    async (request, reply) => {
      const report = await importOwnedVolunteers(
        request,
        request.params.id,
        request.body,
      );
      if (report.invalid > 0) {
        return reply.status(400).send({
          message: "Some rows are invalid: nothing was imported.",
          data: report,
        });
      }
      if (report.dryRun) {
        return reply
          .status(200)
          .send({ message: "Dry run: nothing was imported.", data: report });
      }
      return reply.status(201).send({
        message: `Imported ${report.created} volunteer(s).`,
        data: report,
      });
    },
  );
}
