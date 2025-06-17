import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

import { Person, PersonCreateType } from "../../data/entity/person.entity";
import {
  newPersonSchema,
  personResponseSchema,
} from "../../data/schema/person.schema";
import { responseErrors } from "../../data/schema/responseErrors";
import { Role } from "../../data/types";
import { RoutePrefix } from "../types";

async function personRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.PERSON;

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
    prefixedPath,
    { schema, onRequest: [fastify.authenticate({ role: Role.ADMIN })] },
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
    `${prefixedPath}/:id`,
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

        if (user.role !== Role.ADMIN && user.personId !== parsedPersonId) {
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

  fastify.post<{
    Body: PersonCreateType;
    Reply: { message: string; errors?: string[]; data?: Person };
  }>(
    prefixedPath,
    {
      schema: {
        body: newPersonSchema,
        response: {
          201: personResponseSchema,
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const personRepository = request.server.db.personRepository;
      const personData = request.body;

      const newPerson = new Person();
      newPerson.firstName = personData.firstName;
      newPerson.lastName = personData.lastName;
      newPerson.middleName = personData.middleName || null;
      newPerson.email = personData.email || null;
      newPerson.phone = personData.phone || null;
      newPerson.address = personData.address || null;

      const errors = await validate(newPerson);
      if (errors.length > 0) {
        fastify.log.error(
          "Person entity validation errors (class-validator):",
          errors,
        );
        return reply.status(400).send({
          message: "Entity validation failed during creation",
          errors: errors.flatMap((err) => Object.values(err.constraints || {})),
        });
      }

      try {
        const savedPerson = await personRepository.save(newPerson);
        reply.status(201).send({
          message: "Successfully created a new person",
          data: savedPerson,
        });
      } catch (error: any) {
        fastify.log.error("Error creating person:", error);
        if (error.code === "23505" && error.detail.includes("email")) {
          return reply
            .status(409)
            .send({ message: "Person with this email already exists." });
        }
        reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );
}

export default fp(personRoutes, {
  name: "person-routes",
  dependencies: ["typeorm-plugin"],
});
