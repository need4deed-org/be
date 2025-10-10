import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import {
  ApiVolunteerGet,
  ApiVolunteerGetList,
  Lang,
  SortOrder,
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
import { Id, Role } from "../../data/types";
import {
  leadFromParser,
  parseFormData,
  serialize,
  volunteerFormParser,
  volunteerListSerializer,
  volunteerSerializer,
} from "../../services";
import {
  volunteerFormSchema,
  volunteerIdPatchBodySchema,
  volunteerIdResponseSchema,
  volunteerResponseSchema,
} from "../schema";
import { responseErrors } from "../schema/responseErrors";
import { RoutePrefix } from "../types";
import {
  addTranslatedFields,
  getLanguageCode,
  getPatchData,
  getTimedEvents,
  patchAddress,
  patchEntity,
  updateOptionList,
} from "../utils";
import { updateLeads } from "../utils/updateLeads";
import { writeVolunteer } from "../utils/writeVolunteer";

const defaultTake = 12;

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
            id: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: volunteerIdResponseSchema,
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ role: Role.COORDINATOR })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const volunteerId = Number(id);
      if (isNaN(volunteerId)) {
        fastify.log.error(`${id} is not a valid id.`);
        reply.status(400).send({ message: `${id} is not a valid id.` });
      }

      const isoCode = getLanguageCode(request.query.language) || Lang.DE;

      try {
        const volunteerRepository = fastify.db.volunteerRepository;
        const volunteer = await volunteerRepository.findOne({
          where: { id: volunteerId },
          relations,
        });

        await addTranslatedFields([volunteer], isoCode);

        const timedEvents = await getTimedEvents(volunteer);

        const data = volunteerSerializer(volunteer, timedEvents);

        return reply.status(200).send({
          message: `Volunteer id:${volunteerId}`,
          data,
        });
      } catch (error) {
        fastify.log.error(
          `Error fetching volunteer id=${volunteerId}: ${error}`,
        );
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.get<{
    Querystring: {
      page: string;
      limit: string;
      language: string;
      order: SortOrder;
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
      onRequest: [fastify.authenticate({ role: Role.COORDINATOR })],
    },
    async (request, reply) => {
      const page = Math.abs(parseInt(request.query.page)) || 1;
      const take = Math.abs(parseInt(request.query.limit)) || defaultTake;
      const skip = (page - 1) * take;

      let orderDirection: "DESC" | "ASC";
      if (request.query.order === SortOrder.NewToOld) orderDirection = "DESC";
      if (request.query.order === SortOrder.OldToNew) orderDirection = "ASC";

      const isoCode = getLanguageCode(request.query.language) || Lang.DE;

      try {
        const volunteerRepository = fastify.db.volunteerRepository;

        const [volunteers, count] = await volunteerRepository.findAndCount({
          skip,
          take,
          relations,
          ...(orderDirection
            ? {
                order: {
                  createdAt: orderDirection,
                },
              }
            : {}),
        });

        await addTranslatedFields(volunteers, isoCode);

        const data = serialize(volunteers, volunteerListSerializer);

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
        body: volunteerIdPatchBodySchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: volunteerIdResponseSchema,
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ role: Role.COORDINATOR })],
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
            return reply.status(404).send({
              message: `Volunteer (id=${id}) not found.`,
            });
          }
        }

        if (personData && personData.id) {
          const success = await patchEntity(Person, personData.id, personData);
          if (!success) {
            return reply.status(404).send({
              message: `Person (id=${personData.id}) not found.`,
            });
          }
        }

        if (addressData && addressData.id) {
          const success = await patchAddress(addressData, postcodeData);
          if (!success) {
            return reply.status(400).send({
              message: `Address (id=${addressData.id}) failed to update.`,
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
              message: `Languages for volunteer (id=${id}) failed to update.`,
            });
          }
        }

        if (availability) {
          const success = await updateOptionList(
            id,
            TimeTimeslot,
            availability,
          );
          if (!success) {
            return reply.status(400).send({
              message: `Availability for volunteer (id=${id}) failed to update.`,
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
              message: `Activities for volunteer (id=${id}) failed to update.`,
            });
          }
        }

        if (skills) {
          const success = await updateOptionList(id, ProfileSkill, skills);
          if (!success) {
            return reply.status(400).send({
              message: `Skills for volunteer (id=${id}) failed to update.`,
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
              message: `Locations for volunteer (id=${id}) failed to update.`,
            });
          }
        }
      } catch (error) {
        fastify.log.error(`Error patching volunteer data (id=${id}): ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }

      const isoCode = getLanguageCode(request.query.language) || Lang.DE;

      const volunteerRepository = fastify.db.volunteerRepository;

      try {
        const volunteer = await volunteerRepository.findOne({
          where: { id },
          relations,
        });

        if (!volunteer) {
          return reply
            .status(404)
            .send({ message: `Volunteer id:${id} not found.` });
        }

        addTranslatedFields([volunteer], isoCode);

        const timedEvents = await getTimedEvents(volunteer);

        const data = volunteerSerializer(volunteer, timedEvents);

        return reply.status(200).send({
          message: `Volunteer (id=${id}) has been patched`,
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
