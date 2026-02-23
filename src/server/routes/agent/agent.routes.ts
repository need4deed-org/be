import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  AgentEngagementStatusType,
  AgentTrustType,
  AgentVolunteerSearchType,
  ApiAgentGet,
  ApiAgentGetList,
  ApiCommunicationGet,
  CommunicationType,
  ContactMethodType,
  ContactType,
  UserRole,
} from "need4deed-sdk";
import { dtoAgentGetList } from "../../../services";
import { agentListQuerySchema, responseSchema } from "../../schema";
import { ParamsId, QuerystringAgentGetList, ReplyDataCount } from "../../types";
import {
  getDistrictToAgentHandler,
  getSkipTake,
  normalizeStringArrayInput,
} from "../../utils";
import { addVolunteerToAgent } from "../../utils/data/add-volunteer-to-agent";

export default async function agentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );
  fastify.get<{
    Querystring: QuerystringAgentGetList;
    Reply: ReplyDataCount<ApiAgentGetList[]>;
  }>(
    "/",
    {
      schema: {
        querystring: agentListQuerySchema,
        response: responseSchema("ApiAgentGetList#", true),
      },
    },
    async (request, reply) => {
      const { page, limit, ...filters } = request.query;
      const [skip, take] = getSkipTake({ page, limit });
      const where = Object.fromEntries(
        Object.entries(filters as QuerystringAgentGetList).map(
          ([key, value]) => [key, normalizeStringArrayInput(value)],
        ),
      );

      const agentRepository = fastify.db.agentRepository;
      const relations = [
        "address.postcode",
        "district",
        "opportunity.opportunityVolunteer",
      ];

      const [agents, count] = await agentRepository.findAndCount({
        where,
        relations,
        skip,
        take,
      });

      const { addDistrictToAgent, updates } = getDistrictToAgentHandler();
      const agentsDistrict = await Promise.all(agents.map(addDistrictToAgent));
      const agentsDistrictVolunteer = agentsDistrict.map(addVolunteerToAgent);
      const data = agentsDistrictVolunteer.map(dtoAgentGetList);

      if (updates.length > 0) {
        await agentRepository.save(updates);
      }

      return reply.status(200).send({
        message: "Agents fetched successfully",
        data,
        count,
      });
    },
  );

  fastify.get<{ Params: ParamsId }>("/:id", async (request, reply) => {
    const { id } = request.params;
    const now = new Date();
    const data: ApiAgentGet = {
      id: Number(id),
      title: "Hanger 1-3",
      type: undefined,
      createdAt: now,
      statusEngagement: AgentEngagementStatusType.NEW,
      volunteerSearch: AgentVolunteerSearchType.NOT_NEEDED,
      trustLevel: AgentTrustType.UNKNOWN,
      activeVolunteers: 0,
      comments: [
        {
          id: 1,
          timestamp: new Date("2025-01-15T10:00:00.000Z"),
          content: "Initial contact made with agent.",
          authorName: "Coordinator A",
          entityId: Number(id),
          entityType: "agent",
        },
        {
          id: 2,
          timestamp: new Date("2025-01-20T14:30:00.000Z"),
          content: "Follow-up scheduled for next week.",
          authorName: "Coordinator B",
          entityId: Number(id),
          entityType: "agent",
        },
      ],
      agentDetails: {
        about:
          "A refugee accommodation centre providing housing and support services for newly arrived refugees in Berlin.",
        website: "orgname.de",
        address: "Musterstraße 12, Berlin, 10115",
        organizationType: undefined,
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

  fastify.get("/:id/communication", async (_request, reply) => {
    const data: ApiCommunicationGet[] = [
      {
        id: 1001,
        contactType: ContactType.CALL,
        contactMethod: ContactMethodType.PHONE,
        communicationType: CommunicationType.FIRST_INQUIRY,
        date: new Date("2025-06-01T10:00:00.000Z"),
        volunteerId: 0,
        userId: 1,
      },
      {
        id: 1002,
        contactType: ContactType.TEXT_EMAIL,
        contactMethod: ContactMethodType.EMAIL,
        communicationType: CommunicationType.POST_FOLLOWUP,
        date: new Date("2025-06-10T14:30:00.000Z"),
        volunteerId: 0,
        userId: 1,
      },
    ];
    return reply.status(200).send({
      message: "Agent communications fetched successfully",
      data,
      count: 2,
    });
  });
}
