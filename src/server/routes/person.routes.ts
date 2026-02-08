import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiPersonGet, ApiPersonPatch, UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../config";
import Person, { PersonCreateType } from "../../data/entity/person.entity";
import { dtoParsePerson, dtoSerializePerson } from "../../services";
import { deepMerge } from "../../services/utils";
import { newPersonSchema, personResponseSchema } from "../schema/person.schema";
import { responseErrors } from "../schema/responseErrors";
import { ParamsId, ReplyData } from "../types";
import { updatePerson } from "../utils";

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
        fastify.log.error(`Error fetching persons: ${error}`);
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
        fastify.log.error(`Authentication error: ${error.message}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Reply: ReplyData<ApiPersonGet>;
    Body: ApiPersonPatch;
  }>("/:id", async (request, reply) => {
    const personId = request.params.id;
    const person = await fastify.db.personRepository.findOne({
      where: { id: personId },
      relations: ["address.postcode"],
    });

    if (!person) {
      throw new NotFoundError(`Person with id ${personId} not found.`);
    }

    const updatedPersonObj = deepMerge(
      {
        id: person.id,
        addressId: person.addressId,
        address: { postcodeId: person.address.postcodeId },
      },
      dtoParsePerson(request.body),
    );

    fastify.log.debug(
      `Updating person with id ${personId}: ${JSON.stringify(updatedPersonObj)}`,
    );

    const updatedPerson = await updatePerson(updatedPersonObj);

    fastify.log.debug(
      `Updated person with id ${personId}: ${JSON.stringify(updatedPerson)}`,
    );

    const data = dtoSerializePerson(updatedPerson);

    return reply
      .status(200)
      .send({ message: "Person updated successfully.", data });
  });

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
        fastify.log.error(
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
        fastify.log.error(`Error creating person: ${error}`);
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
