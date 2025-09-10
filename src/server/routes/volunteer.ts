import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { ApiVolunteerGetList, VolunteerFormData } from "need4deed-sdk";

import { Lang } from "need4deed-sdk";
import { Repository } from "typeorm";
import FieldTranslation from "../../data/entity/field_translation.entity";
import Language from "../../data/entity/profile/language.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { Id, TranslationEntityType } from "../../data/types";
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
import { getLanguageCode } from "../utils";
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

        await addTranslatedFields(fastify, volunteers, isoCode);

        const data = serialize(volunteers, volunteerSerializer);

        return reply.status(200).send({
          message: `Volunteers page ${page}`,
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

        await parseFormData(request.body.leadFrom, leadFromParser);

        const id = await writeVolunteer(volunteer);

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

async function addTranslatedFields(
  fastify: FastifyInstance,
  volunteers: Volunteer[],
  isoCode: Lang,
) {
  let language: Language;
  let languageRepository: Repository<Language>;
  let fieldTranslationRepository: Repository<FieldTranslation>;
  try {
    fieldTranslationRepository = fastify.db.fieldTranslationRepository;
    languageRepository = fastify.db.languageRepository;
    language = await languageRepository.findOne({ where: { isoCode } });
    if (!language) {
      throw new Error(`Language ${isoCode} not found.`);
    }
  } catch (error) {
    fastify.log.error(`Error loading language: ${error}`);
    throw new Error(error.message);
  }
  for (const volunteer of volunteers) {
    for (const pl of volunteer.deal.profile.profileLanguage) {
      const translation = await fieldTranslationRepository.findOne({
        where: {
          language,
          entityType: TranslationEntityType.LANGUAGE,
          entityId: pl.language.id,
        },
      });
      pl.language.translation = translation?.translation;
    }
    for (const pa of volunteer.deal.profile.profileActivity) {
      const translation = await fieldTranslationRepository.findOne({
        where: {
          language,
          entityType: TranslationEntityType.ACTIVITY,
          entityId: pa.activity.id,
        },
      });
      pa.activity.translation = translation?.translation;
    }
    for (const ps of volunteer.deal.profile.profileSkill) {
      const translation = await fieldTranslationRepository.findOne({
        where: {
          language,
          entityType: TranslationEntityType.SKILL,
          entityId: ps.skill.id,
        },
      });
      ps.skill.translation = translation?.translation;
    }
  }
}
