import { validate } from "class-validator";
import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import {
  ApiEventN4DRegistrationGet,
  ApiEventN4DRegistrationPatch,
  ApiEventN4DRegistrationPost,
  UserRole,
} from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../config";
import EventN4DRegistration from "../../data/entity/event/event-n4d-registration.entity";
import { dtoEventN4DRegistration } from "../../services";
import {
  eventN4DRegistrationBodySchema,
  eventN4DRegistrationPatchBodySchema,
  eventN4DRegistrationPatchResponseSchema,
  eventN4DRegistrationPostResponseSchema,
  idParamSchema,
} from "../schema";
import { ParamsId, ReplyData, ReplyMessage } from "../types";
import { findVolunteerIdByEmail } from "../utils/data/find-volunteer-id-by-email";

export default async function eventN4DRegistrationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Body: ApiEventN4DRegistrationPost; Reply: ReplyMessage }>(
    "/",
    {
      config: { public: true } as FastifyContextConfig,
      schema: {
        body: eventN4DRegistrationBodySchema,
        response: eventN4DRegistrationPostResponseSchema,
      },
    },
    async (request, reply) => {
      const {
        eventId,
        isVolunteer = false,
        volunteerTypes,
        ...answers
      } = request.body;

      const event = await fastify.db.eventRepository.findOneBy({
        id: eventId,
        isActive: true,
      });
      if (!event) {
        throw new NotFoundError(`Event (id:${eventId}) not found.`);
      }
      if ((event.dateEnd ?? event.date).getTime() < Date.now()) {
        throw new BadRequestError("Event date has already passed.");
      }
      if (event.rsvpLink) {
        throw new BadRequestError(
          "Event uses its own registration link; sign up there.",
        );
      }

      const registration = new EventN4DRegistration({
        eventId,
        ...answers,
        signUpAnswer: event.signUpQuestion
          ? answers.signUpAnswer?.trim() || null
          : null,
        isVolunteer,
        volunteerTypes: isVolunteer ? (volunteerTypes ?? []) : [],
        volunteerId: isVolunteer
          ? await findVolunteerIdByEmail(
              fastify.db.volunteerRepository,
              answers.email,
            )
          : null,
      });
      const errors = await validate(registration);
      if (errors.length > 0) {
        throw new BadRequestError(
          errors.flatMap((e) => Object.values(e.constraints || {})).join(", "),
        );
      }

      await fastify.db.eventN4DRegistrationRepository.save(registration);

      return reply.status(201).send({ message: "Registration submitted." });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Body: ApiEventN4DRegistrationPatch;
    Reply: ReplyData<ApiEventN4DRegistrationGet>;
  }>(
    "/:id",
    {
      preHandler: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        body: eventN4DRegistrationPatchBodySchema,
        response: eventN4DRegistrationPatchResponseSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const repository = fastify.db.eventN4DRegistrationRepository;
      const registration = await repository.findOneBy({ id });
      if (!registration) {
        throw new NotFoundError(`Registration (id:${id}) not found.`);
      }

      registration.attended = request.body.attended;
      await repository.save(registration);

      return reply.status(200).send({
        message: `Registration id:${id} updated.`,
        data: dtoEventN4DRegistration(registration),
      });
    },
  );
}
