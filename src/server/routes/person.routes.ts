import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiPersonGet, ApiRepresentativePatch, UserRole } from "need4deed-sdk";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../config";
import Person, { PersonCreateType } from "../../data/entity/person.entity";
import logger from "../../logger";
import { dtoParsePerson, dtoSerializePerson } from "../../services";
import { deepMerge } from "../../services/utils";
import { idParamSchema, responseSchema } from "../schema";
import { newPersonSchema, personResponseSchema } from "../schema/person.schema";
import { responseErrors } from "../schema/responseErrors";
import { ParamsId, ReplyData } from "../types";
import { updatePerson } from "../utils";
import { getAgentPersonRepresentative } from "../utils/data/get-agent-person-representative";

export default async function personRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  const schema = {
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: personResponseSchema,
          },
        },
        required: ["message", "data"],
      },
      ...responseErrors,
    },
  };

  fastify.get<{
    Reply: {
      message: string;
      data?: Array<Person>;
    };
  }>(
    "/",
    { schema, onRequest: [fastify.authenticate({ role: UserRole.ADMIN })] },
    async (request, reply) => {
      try {
        const personRepository = fastify.db.personRepository;
        const persons = await personRepository.find();
        return { message: "List of persons", data: persons };
      } catch (error) {
        logger.error(`Error fetching persons: ${error}`);
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );

  fastify.get(
    "/:id",
    { schema, onRequest: [fastify.authenticate()] },
    async (request, reply) => {
      try {
        const personId = (request.params as { id: string }).id;
        const parsedPersonId = Number(personId);
        if (isNaN(parsedPersonId) || parsedPersonId <= 0) {
          return reply
            .status(400)
            .send({ message: "Invalid person ID provided." });
        }

        const user = await fastify.db.userRepository.findOne({
          where: { id: request.user.id },
        });

        if (!user) {
          throw new Error(
            `Error fetching person ${parsedPersonId}: user ${request.user.id} not found`,
          );
        }

        if (user.role !== UserRole.ADMIN && user.personId !== parsedPersonId) {
          return reply
            .status(403)
            .send({ message: "Insufficient permissions." });
        }

        const person = await fastify.db.personRepository.findOne({
          where: { id: parsedPersonId },
        });

        if (!person) {
          return reply
            .status(404)
            .send(`Person id:${parsedPersonId} not found.`);
        }

        return {
          message: `Details for person ${personId}`,
          data: [person],
        };
      } catch (error) {
        logger.error(`Authentication error: ${error.message}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Reply: ReplyData<ApiPersonGet>;
    Body: ApiRepresentativePatch;
  }>(
    "/:id",
    {
      onRequest: [fastify.authenticate()],
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiRepresentativePatch#" },
        response: responseSchema("ApiPersonGet#"),
      },
    },
    async (request, reply) => {
      const personId = request.params.id;
      const authUser = request.authUser!;

      if (authUser.role !== UserRole.ADMIN && authUser.personId !== personId) {
        throw new UnauthorizedError("Insufficient permissions.");
      }

      const person = await fastify.db.personRepository.findOne({
        where: { id: personId },
        relations: ["address.postcode"],
      });

      if (!person) {
        throw new NotFoundError(`Person with id ${personId} not found.`);
      }

      // role/agentId aren't person fields — a role-only patch has nothing
      // for updatePerson to change, and TypeORM throws on an empty SET
      // clause, so skip it entirely rather than no-op saving.
      const hasPersonFieldUpdates = Object.keys(request.body).some(
        (key) => key !== "role" && key !== "agentId",
      );

      const updatedPerson = hasPersonFieldUpdates
        ? await updatePerson(
            deepMerge(
              {
                id: person.id,
                addressId: person.addressId,
                address: { postcodeId: person.address.postcodeId },
              },
              dtoParsePerson(request.body),
            ),
          )
        : person;

      // role lives on AgentPerson, not person — agentId disambiguates which
      // membership to update for a person belonging to more than one agent.
      if (request.body.role !== undefined) {
        if (!request.body.agentId) {
          throw new BadRequestError(
            "agentId is required to update a representative's role.",
          );
        }

        const membership = await getAgentPersonRepresentative(
          personId,
          request.body.agentId,
        );

        if (!membership) {
          throw new NotFoundError(
            `No active agent membership found for person ${personId} at agent ${request.body.agentId}.`,
          );
        }

        membership.role = request.body.role;
        await fastify.db.agentPersonRepository.save(membership);
      }

      const data = dtoSerializePerson(updatedPerson);

      return reply
        .status(200)
        .send({ message: "Person updated successfully.", data });
    },
  );

  fastify.post<{
    Body: PersonCreateType;
    Reply: { message: string; errors?: string[]; data?: Person };
  }>(
    "/",
    {
      schema: {
        body: newPersonSchema,
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: personResponseSchema,
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const personRepository = fastify.db.personRepository;
      const personData = request.body;

      const newPerson = new Person(personData);

      const errors = await validate(newPerson);
      if (errors.length > 0) {
        logger.error(
          `Person entity validation errors (class-validator): ${JSON.stringify(errors)}`,
        );
        return reply.status(400).send({
          message: "Entity validation failed during creation",
          errors: errors.flatMap((err) => Object.values(err.constraints || {})),
        });
      }

      try {
        const savedPerson = await personRepository.save(newPerson);
        return reply.status(201).send({
          message: "Successfully created a new person",
          data: savedPerson,
        });
      } catch (error) {
        logger.error(`Error creating person: ${error}`);
        if (error.code === "23505" && error.detail.includes("email")) {
          return reply
            .status(409)
            .send({ message: "Person with this email already exists." });
        }
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );
}
