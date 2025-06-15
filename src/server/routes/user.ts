import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

import { AppDataSource } from "../../data/data-source";
import { Person, PersonUpdateType } from "../../data/entity/person.entity";
import { User } from "../../data/entity/user.entity";
import {
  createUserBodySchema,
  userResponseSchema,
} from "../../data/schema/user.schema";
import { hashPassword } from "../../data/utils";

async function userRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || "/account";

  fastify.get(prefixedPath, async (request, reply) => {
    const users = await AppDataSource.manager.find(User);
    return { message: "List of users", data: users };
  });

  fastify.get(prefixedPath + "/:id", async (request, reply) => {
    const userId = (request.params as { id: string }).id;
    const user = await AppDataSource.manager.findOne(User, {
      where: { id: parseInt(userId) },
    });
    return {
      message: user
        ? `Details for account ${userId}`
        : `Account ${userId} not found`,
      data: user,
    };
  });

  fastify.post<{
    Body: {
      email: string;
      password?: string;
      isActive?: boolean;
      role?: string;
      language?: string;
      timezone?: string;
      person: PersonUpdateType;
    };
    Reply: User | { message: string; errors?: any };
  }>(
    prefixedPath,
    {
      schema: {
        body: createUserBodySchema,
        response: {
          201: userResponseSchema,
          400: {
            type: "object",
            properties: {
              message: { type: "string" },
              errors: { type: "array", items: { type: "string" } },
            },
          },
          404: { type: "object", properties: { message: { type: "string" } } },
          409: { type: "object", properties: { message: { type: "string" } } },
          500: { type: "object", properties: { message: { type: "string" } } },
        },
      },
      // Pre-handler hook to resolve/create the Person entity
      preHandler: async (request, reply) => {
        const { person: personData } = request.body;
        // const personRepository = request.db.personRepository;
        const personRepository = request.server.db.personRepository;
        if (!request.server.db) {
          fastify.log.error("request.server.db is undefined!");
          return reply
            .status(500)
            .send({ message: "Internal Server Error: DB not loaded" });
        }

        let resolvedPerson: Person | null = null;

        if (personData.id) {
          // Case 1: person.id is provided - find existing person
          try {
            resolvedPerson = await personRepository.findOneBy({
              id: personData.id,
            });
          } catch (error) {
            fastify.log.error("Error finding person by ID:", error);
            return reply
              .status(500)
              .send({ message: "Error retrieving person data." });
          }

          if (!resolvedPerson) {
            return reply
              .status(404)
              .send({ message: `Person with ID ${personData.id} not found.` });
          }
        } else {
          const newPerson = new Person();
          newPerson.firstName = personData.firstName!;
          newPerson.lastName = personData.lastName!;
          newPerson.middleName = personData.middleName || null;
          newPerson.email = personData.email || null;
          newPerson.phone = personData.phone || null;
          newPerson.address = personData.address || null;

          const errors = await validate(newPerson);
          if (errors.length > 0) {
            fastify.log.error("New Person entity validation errors:", errors);
            return reply.status(400).send({
              message: "Validation failed for new person data",
              errors: errors.flatMap((err) =>
                Object.values(err.constraints || {}),
              ),
            });
          }

          try {
            resolvedPerson = await personRepository.save(newPerson);
          } catch (error) {
            fastify.log.error("Error creating new person:", error);
            return reply
              .status(500)
              .send({ message: "Failed to create new person." });
          }
        }
        request.resolvedPerson = resolvedPerson;
      },
    },
    async (request, reply) => {
      const { email, password, isActive, role, language, timezone } =
        request.body;
      const accountRepository = request.server.db.accountRepository;
      if (!accountRepository) {
        fastify.log.error("accountRepository is undefined!");
        return reply
          .status(500)
          .send({ message: "Internal Server Error: DB not loaded" });
      }

      const resolvedPerson = request.resolvedPerson!;

      const newUser = new User();
      newUser.email = email;
      if (password) newUser.password = await hashPassword(password);
      if (typeof isActive === "boolean") newUser.isActive = isActive;
      if (role) newUser.role = role;
      if (language) newUser.language = language;
      if (timezone) newUser.timezone = timezone;
      newUser.person = resolvedPerson;
      newUser.personId = resolvedPerson.id;

      // Validate the Account entity using class-validator
      const errors = await validate(newUser);
      if (errors.length > 0) {
        fastify.log.error("User entity validation errors:", errors);
        return reply.status(400).send({
          message: "Validation failed for newUser data",
          errors: errors.flatMap((err) => Object.values(err.constraints || {})),
        });
      }

      try {
        const savedUser = await accountRepository.save(newUser);
        // To ensure the 'person' relation is loaded in the response,
        // we might need to explicitly load it or return a fresh find.
        // For simplicity, we'll return the savedAccount, but be aware TypeORM
        // might not load relations by default after save.
        // If `savedAccount.person` is `undefined`, fetch it:
        savedUser.person = savedUser.person || resolvedPerson;

        reply.status(201).send(savedUser);
      } catch (error: any) {
        fastify.log.error("Error creating account:", error);
        if (error.code === "23505" && error.detail.includes("email")) {
          return reply
            .status(409)
            .send({ message: "User with this email already exists." });
        }
        reply.status(500).send({
          message: "Failed to create user due to an internal error.",
        });
      }
    },
  );
}

export default fp(userRoutes, {
  name: "user-routes",
  dependencies: ["typeorm-plugin"],
});
