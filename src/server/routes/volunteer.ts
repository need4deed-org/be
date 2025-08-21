import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

import { serialize } from "../../services";
import { volunteerSerializer } from "../../services/serializers/volunteerSerializer";
import { volunteerResponseSchema } from "../schema";
import { responseErrors } from "../schema/responseErrors";
import { Hour, RoutePrefix, VolunteerAPI } from "../types";

const dummyVolunteer: VolunteerAPI = {
  name: "XYN",
  phone: "123",
  email: "a@b.cc",
  nativeLanguages: ["XUJ"],
  fluentLanguages: ["XUJ"],
  intermediateLanguages: ["XUJ"],
  availability: [{ day: "ByDay.SU", daytime: [Hour.H07, Hour.H19] }],
  activities: ["xnr", "xyn", "xuj"],
  skills: ["xnr", "xyn", "xuj"],
} as unknown as VolunteerAPI;

async function volunteerRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.VOLUNTEER;

  fastify.get<{
    Querystring: {
      page: string;
      limit: string;
    };
    Reply: {
      message: string;
      data?: Array<VolunteerAPI>;
    };
  }>(
    prefixedPath,
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "array", items: volunteerResponseSchema },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const page = parseInt(request.query.page) || 1;
      const take = parseInt(request.query.limit) || 12;
      const skip = (page - 1) * take;

      const volunteerRepository = fastify.db.volunteerRepository;

      const volunteers = await volunteerRepository.find({
        skip,
        take,
        relations: [
          "person",
          "person.address",
          "person.address.postcode",
          "deal",
          "deal.postcode",
          "deal.profile",
          "deal.profile.profileActivity.activity",
          "deal.profile.profileSkill.skill",
          "deal.profile.profileLanguage.language",
          "deal.time",
          "deal.time.timeTimeslot.timeslot",
          "deal.location",
          "deal.location.locationPostcode.postcode",
          "deal.location.locationDistrict.district",
          "deal.location.locationAddress.address",
          "deal.location.locationAddress.address.postcode",
        ],
      });

      const data = serialize(volunteers, volunteerSerializer);

      return reply.send({
        message: `Volunteers page ${page}`,
        data: [dummyVolunteer],
      });
    },
  );
}

export default fp(volunteerRoutes, {
  name: "volunteer-routes",
  dependencies: ["typeorm-plugin"],
});
