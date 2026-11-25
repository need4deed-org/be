import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiVolunteerImportPost,
  ApiVolunteerImportResult,
  UserRole,
} from "need4deed-sdk";
import { idParamSchema, responseErrors } from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import { assertAgentMemberOrStaffOr404 } from "../../utils/data/agent-membership";
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
      onRequest: fastify.authenticate({ role: UserRole.AGENT }),
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiVolunteerImportPost#" },
        response: {
          ...responseErrors,
          200: reportSchema,
          201: reportSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      await assertAgentMemberOrStaffOr404(request, id);
      const report = await importOwnedVolunteers(request, id, request.body);
      if (report.dryRun) {
        return reply
          .status(200)
          .send({ message: "Dry run: nothing was imported.", data: report });
      }
      return reply.status(201).send({
        message: `Imported ${report.created} volunteer(s); ${report.skipped} skipped, ${report.invalid} invalid.`,
        data: report,
      });
    },
  );
}
