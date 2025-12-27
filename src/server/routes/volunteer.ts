import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import {
  ApiVolunteerGet,
  ApiVolunteerGetList,
  Lang,
  QueryParamsKeys,
  UserRole,
  VolunteerFormData,
  VolunteerPatchBodyData,
} from "need4deed-sdk";
import LocationDistrict from "../../data/entity/m2m/location-district";
import ProfileActivity from "../../data/entity/m2m/profile-activity";
import ProfileLanguage from "../../data/entity/m2m/profile-language";
import ProfileSkill from "../../data/entity/m2m/profile-skill";
import TimeTimeslot from "../../data/entity/m2m/time-timeslot";
import Person from "../../data/entity/person.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { Id } from "../../data/types";
import {
  leadFromParser,
  parseFormData,
  serialize,
  volunteerFormParser,
  volunteerListSerializer,
} from "../../services";
import { responseErrors } from "../schema";
import { RoutePrefix } from "../types";
import {
  EnumValuesMap,
  fetchVolunteerById,
  getFilteredVolunteers,
  getLanguageCode,
  getOrCreateTimeslot,
  getPatchData,
  parseQueryParams,
  patchAddress,
  patchEntity,
  updateOptionList,
} from "../utils";
import { updateLeads } from "../utils/updateLeads";
import { writeVolunteer } from "../utils/writeVolunteer";

async function volunteerRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.VOLUNTEER;
  const relations = [
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
  ];

  fastify.get<{
    Params: { id: string };
    Querystring: {
      language: string;
    };
    Reply: {
      message: string;
      data?: ApiVolunteerGet;
    };
  }>(
    `${prefixedPath}/:id`,
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "volunteer-api-id#" },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ role: UserRole.COORDINATOR })],
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        fastify.log.error(`${id} is not a valid id.`);
        return reply.status(400).send({ message: `${id} is not a valid id.` });
      }

      const isoCode = getLanguageCode(request.query.language) || Lang.DE;

      try {
        const data = await fetchVolunteerById(id, isoCode, relations);
        if (!data) {
          fastify.log.error(`Failed fetching volunteer (id=${id}).`);
          throw new Error(`Volunteer (id=${id}) not found after patch.`);
        }
        return reply.status(200).send({
          message: `Volunteer (id=${id}) patched.`,
          data,
        });
      } catch (error) {
        fastify.log.error(`Error fetching volunteer id=${id}: ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.get<{
    Querystring: EnumValuesMap<typeof QueryParamsKeys>;
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
              data: { type: "array", items: { $ref: "volunteer-api#" } },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ role: UserRole.COORDINATOR })],
    },
    async (request, reply) => {
      try {
        const {
          page,
          limit,
          orderDirection,
          language,
          filter: {
            accompanying,
            german,
            search,
            district,
            languages,
            statusType,
            engagement,
            availability,
          },
        } = parseQueryParams(request.query);
        fastify.log.debug(
          `GET /volunteer parsed: ${JSON.stringify({
            page,
            limit,
            orderDirection,
            language,
            filter: {
              accompanying,
              german,
              search,
              district,
              languages,
              statusType,
              engagement,
              availability,
            },
          })}`,
        );

        const [volunteers, count] = await getFilteredVolunteers(fastify, {
          page,
          limit,
          orderDirection,
          language,
          filter: {
            accompanying,
            german,
            search,
            district,
            languages,
            statusType,
            engagement,
            availability,
          },
        });

        const data = serialize(volunteers, volunteerListSerializer);

        reply.status(200).send({
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

  fastify.patch<{
    Params: { id: string };
    Querystring: {
      language: string;
    };
    Body: VolunteerPatchBodyData;
    Reply: {
      message: string;
      data?: ApiVolunteerGet;
    };
  }>(
    `${prefixedPath}/:id`,
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
          required: ["id"],
        },
        body: { $ref: "volunteer-api-id-part#" },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "volunteer-api-id#" },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ role: UserRole.COORDINATOR })],
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply
          .status(400)
          .send({ message: `${request.params.id}: is not a valid id.` });
      }

      const {
        volunteerData,
        personData,
        addressData,
        postcodeData,
        languages,
        availability,
        activities,
        skills,
        locations,
      } = getPatchData(request.body);

      try {
        if (volunteerData) {
          const success = await patchEntity(Volunteer, id, volunteerData);
          if (!success) {
            return reply.status(400).send({
              message: `Volunteer (id=${id}) not updated.`,
            });
          }
        }

        if (personData && personData.id) {
          const success = await patchEntity(Person, personData.id, personData);
          if (!success) {
            return reply.status(400).send({
              message: `Person (id=${personData.id}) not updated.`,
            });
          }
        }

        if (addressData && addressData.id) {
          const success = await patchAddress(addressData, postcodeData);
          if (!success) {
            return reply.status(400).send({
              message: `Address (id=${addressData.id}) not updated.`,
            });
          }
        }

        if (languages) {
          const success = await updateOptionList(
            id,
            ProfileLanguage,
            languages,
          );
          if (!success) {
            return reply.status(400).send({
              message: `Languages for volunteer (id=${id}) not updated.`,
            });
          }
        }

        if (availability) {
          const success = await updateOptionList(
            id,
            TimeTimeslot,
            await Promise.all(
              availability.map((availabilityObject) => {
                if (availabilityObject.id) {
                  return { id: availabilityObject.id };
                }
                return getOrCreateTimeslot(availabilityObject);
              }),
            ),
          );
          if (!success) {
            return reply.status(400).send({
              message: `Availability for volunteer (id=${id}) not updated.`,
            });
          }
        }

        if (activities) {
          const success = await updateOptionList(
            id,
            ProfileActivity,
            activities,
          );
          if (!success) {
            return reply.status(400).send({
              message: `Activities for volunteer (id=${id}) not updated.`,
            });
          }
        }

        if (skills) {
          const success = await updateOptionList(id, ProfileSkill, skills);
          if (!success) {
            return reply.status(400).send({
              message: `Skills for volunteer (id=${id}) not updated.`,
            });
          }
        }

        if (locations) {
          const success = await updateOptionList(
            id,
            LocationDistrict,
            locations,
          );
          if (!success) {
            return reply.status(400).send({
              message: `Locations for volunteer (id=${id}) not updated.`,
            });
          }
        }
      } catch (error) {
        fastify.log.error(`Error patching volunteer data (id=${id}): ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }

      const isoCode = getLanguageCode(request.query.language) || Lang.DE;

      try {
        const data = await fetchVolunteerById(id, isoCode, relations);
        if (!data) {
          fastify.log.error(
            `Failed fetching volunteer (id=${id}) after patch.`,
          );
          throw new Error(`Volunteer (id=${id}) not found after patch.`);
        }
        return reply.status(200).send({
          message: `Volunteer (id=${id}) patched.`,
          data,
        });
      } catch (error) {
        fastify.log.error(`Error fetching volunteer (id=${id}): ${error}`);
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
        body: { $ref: "volunteer-form-data" },
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
