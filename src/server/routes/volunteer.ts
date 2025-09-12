import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { ApiVolunteerGetList, VolunteerFormData } from "need4deed-sdk";

import { Lang } from "need4deed-sdk";
import { Id } from "../../data/types";
import {
  leadFromParser,
  parseFormData,
  serialize,
  volunteerFormParser,
  volunteerSerializer,
} from "../../services";
import { volunteerFormSchema, volunteerResponseSchema } from "../schema";
import { responseErrors } from "../schema/responseErrors";
import { RoutePrefix } from "../types";
import { addTranslatedFields, getLanguageCode } from "../utils";
import { updateLeads } from "../utils/updateLeads";
import { writeVolunteer } from "../utils/writeVolunteer";

const defaultTake = 12;

async function volunteerRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.VOLUNTEER;

  fastify.get<{
    Querystring: {
      page: string;
      limit: string;
      language: string;
    };
    Reply: {
      message: string;
      count?: number;
      data?: Array<ApiVolunteerGetList>;
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
              count: { type: "number" },
              data: { type: "array", items: volunteerResponseSchema },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const page = Math.abs(parseInt(request.query.page)) || 1;
      const take = Math.abs(parseInt(request.query.limit)) || defaultTake;
      const skip = (page - 1) * take;

      const isoCode = getLanguageCode(request.query.language) || Lang.DE;

      try {
        const volunteerRepository = fastify.db.volunteerRepository;

        const [volunteers, count] = await volunteerRepository.findAndCount({
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

        await addTranslatedFields(volunteers, isoCode);

        const data = serialize(volunteers, volunteerSerializer);

        return reply.status(200).send({
          message: `Volunteers page ${page}`,
          count,
          data,
        });
      } catch (error) {
        fastify.log.error(`Error fetching volunteers: ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.post<{
    Querystring: {
      language: string;
    };
    Body: VolunteerFormData;
    Reply: {
      message: string;
      data?: { id: Id };
    };
  }>(
    prefixedPath,
    {
      schema: {
        body: volunteerFormSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "object",
                properties: { id: { type: ["string", "number"] } },
                required: ["id"],
              },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      fastify.log.debug(`endpoint:POST: ${JSON.stringify(request.body)}`);
      try {
        const volunteer = await parseFormData(
          request.body,
          volunteerFormParser,
        );

        const leads = await parseFormData(
          request.body.leadFrom,
          leadFromParser,
        );

        const id = await writeVolunteer(volunteer);
        if (id) {
          await updateLeads(leads);
        }

        return reply.status(200).send({
          message: "Volunteer stored.",
          data: { id },
        });
      } catch (error) {
        fastify.log.error(`Error writing volunteer: ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );
}

export default fp(volunteerRoutes, {
  name: "volunteer-routes",
  dependencies: ["typeorm-plugin"],
});
