import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerOpportunityGet } from "need4deed-sdk";
import { BadRequestError } from "../../../config/error/fastify";
import { opportunityOpportunityVolunteerDTO } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";

const msg400 = "URL param must ba a positive number";

export default function opportunityOpportunityVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: { id: number };
    Reply: { message: string; data: ApiVolunteerOpportunityGet[] };
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiOpportunityVolunteerGet#", true, false),
      },
    },
    async (request, reply) => {
      const opportunityId = request.params.id;
      if (opportunityId <= 0) {
        throw new BadRequestError(msg400);
      }

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const volunteers = await opportunityVolunteerRepository.find({
        where: {
          opportunityId,
        },
        relations: [
          "volunteer.person",
          "volunteer.deal.profile.profileActivity.activity",
          "volunteer.deal.profile.profileSkill.skill",
          "volunteer.deal.profile.profileLanguage.language",
          "volunteer.deal.time.timeTimeslot.timeslot",
          "volunteer.deal.location.locationDistrict.district",
        ],
      });

      const data = volunteers.map(opportunityOpportunityVolunteerDTO);

      return reply.status(200).send({
        message: `Volunteers for opportunity id:${opportunityId}.`,
        data,
      });
    },
  );
}
