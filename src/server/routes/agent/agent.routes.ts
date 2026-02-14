import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiAgentGet, UserRole } from "need4deed-sdk";
import { ParamsId } from "../../types";

export default async function agentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.get<{ Params: ParamsId }>("/:id", async (request, reply) => {
    const { id } = request.params;
    const now = new Date().toISOString();
    const data: ApiAgentGet = {
      id: Number(id),
      name: "Hanger 1-3",
      type: "rac",
      createdAt: now,
      statusEngagement: "new",
      volunteerSearch: "not_needed",
      trustLevel: "unknown",
      comments: [
        {
          id: 1,
          timestamp: "2025-01-15T10:00:00.000Z",
          content: "Initial contact made with agent.",
          authorName: "Coordinator A",
        },
        {
          id: 2,
          timestamp: "2025-01-20T14:30:00.000Z",
          content: "Follow-up scheduled for next week.",
          authorName: "Coordinator B",
        },
      ],
      organisationDetails: {
        about:
          "A refugee accommodation centre providing housing and support services for newly arrived refugees in Berlin.",
        website: "orgname.de",
        address: "Musterstraße 12, Berlin, 10115",
        organisationType: "Unterkunft für Geflüchtete",
        operator: "AWO",
        services: "Sozialrecht, Beratungsstelle",
        clientLanguages: [
          { id: 1, title: "Ukrainian" },
          { id: 2, title: "Russian" },
          { id: 3, title: "Farsi" },
          { id: 4, title: "Arabic" },
        ],
      },
    };
    return reply.status(200).send({
      message: "Agent fetched successfully",
      data,
      count: 1,
    });
  });

  fastify.get("/:id/communication", async (request, reply) => {
    return reply.status(200).send({
      message: "Agent communications fetched successfully",
      data: [
        {
          id: 1001,
          contactType: "called",
          contactMethod: "phone-number",
          communicationType: "initial-contact",
          date: "2025-06-01T10:00:00.000Z",
          volunteerId: 0,
          userId: 1,
        },
        {
          id: 1002,
          contactType: "emailed",
          contactMethod: "email",
          communicationType: "follow-up",
          date: "2025-06-10T14:30:00.000Z",
          volunteerId: 0,
          userId: 1,
        },
      ],
      count: 2,
    });
  });
}
