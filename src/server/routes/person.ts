import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin"; // <--- Import fastify-plugin
import { Person, PersonCreateType } from "../../data/entity/person";
import {
  newPersonSchema,
  personResponseSchema,
} from "../../data/schema/person";
// import { AppDataSource } from "../../data/data-source"; // <-- No longer needed if using fastify.db

async function personRoutes( // Changed from userRoutes for clarity with file name
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || "/person";

  const schema = {
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: personResponseSchema, // Use the new response schema for array items
          },
        },
        required: ["message", "data"],
      },
    },
  };

  fastify.get(prefixedPath, { schema }, async (request, reply) => {
    // Use the decorated repository
    const persons = await fastify.db.personRepository.find();
    return { message: "List of persons", data: persons };
  });

  fastify.get(`${prefixedPath}/:id`, { schema }, async (request, reply) => {
    const personId = (request.params as { id: string }).id;
    const parsedPersonId = parseInt(personId); // Add parsing and validation for safety
    if (isNaN(parsedPersonId) || parsedPersonId <= 0) {
      return reply.status(400).send({ message: "Invalid person ID provided." });
    }

    // Use the decorated repository
    const person = await fastify.db.personRepository.findOne({
      where: { id: parsedPersonId },
    });
    return {
      message: person
        ? `Details for person ${personId}` // Changed from user for consistency
        : `Person ${personId} not found`, // Changed from user
      data: [person],
    };
  });

  fastify.post<{
    Body: PersonCreateType;
  }>(
    prefixedPath,
    {
      schema: {
        body: newPersonSchema, // Use your existing JSON Schema for the request body
        response: {
          201: personResponseSchema, // Use the new response schema for success
          400: {
            type: "object",
            properties: {
              message: { type: "string" },
              errors: { type: "array", items: { type: "string" } },
            },
          },
          409: { type: "object", properties: { message: { type: "string" } } },
          500: { type: "object", properties: { message: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const personRepository = request.server.db.personRepository;
      const personData = request.body; // Fastify has already validated this against newPersonSchema

      const newPerson = new Person();
      newPerson.firstName = personData.firstName;
      newPerson.lastName = personData.lastName;
      newPerson.middleName = personData.middleName || null;
      newPerson.email = personData.email || null;
      newPerson.phone = personData.phone || null;
      newPerson.address = personData.address || null;

      // Use class-validator for validating the actual Person entity instance
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
        reply.status(201).send(savedPerson); // Fastify validates this response against personResponseSchema
      } catch (error: any) {
        fastify.log.error("Error creating person:", error);
        if (error.code === "23505" && error.detail.includes("email")) {
          return reply
            .status(409)
            .send({ message: "Person with this email already exists." });
        }
        reply.status(500).send({
          message: "Failed to create person due to an internal error.",
        });
      }
    },
  );
}

// Export wrapped with fp and declare dependency on typeorm-plugin
export default fp(personRoutes, {
  name: "person-routes", // Give it a name
  dependencies: ["typeorm-plugin"], // Declare dependency on typeorm-plugin
});
