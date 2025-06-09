import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

import { AppDataSource } from "../../data/data-source";
import { Account } from "../../data/entity/account";
import { Person, PersonUpdateType } from "../../data/entity/person";
import {
  accountResponseSchema,
  createAccountBodySchema,
} from "../../data/schema/account";

async function accountRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || "/account";

  fastify.get(prefixedPath, async (request, reply) => {
    const accounts = await AppDataSource.manager.find(Account);
    return { message: "List of accounts", data: accounts };
  });

  fastify.get(prefixedPath + "/:id", async (request, reply) => {
    const accountId = (request.params as { id: string }).id;
    const account = await AppDataSource.manager.findOne(Account, {
      where: { id: parseInt(accountId) },
    });
    return {
      message: account
        ? `Details for account ${accountId}`
        : `Account ${accountId} not found`,
      data: account,
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
    Reply: Account | { message: string; errors?: any };
  }>(
    prefixedPath,
    {
      schema: {
        body: createAccountBodySchema,
        response: {
          201: accountResponseSchema,
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
          // Case 2: person.id is NOT provided - create a new person
          const newPerson = new Person();
          newPerson.firstName = personData.firstName!; // Schema ensures these are present if id is not
          newPerson.lastName = personData.lastName!;
          newPerson.middleName = personData.middleName || null;
          newPerson.email = personData.email || null;
          newPerson.phone = personData.phone || null;
          newPerson.address = personData.address || null;

          // Validate the new Person entity using class-validator
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
            // Handle potential unique constraints for person (e.g., email) if applicable
            return reply
              .status(500)
              .send({ message: "Failed to create new person." });
          }
        }
        request.resolvedPerson = resolvedPerson; // Attach the resolved/created person to the request
      },
    },
    async (request, reply) => {
      const { email, password, isActive, role, language, timezone } =
        request.body;
      // const accountRepository = request.db.accountRepository;
      const accountRepository = request.server.db.accountRepository;
      if (!accountRepository) {
        fastify.log.error("accountRepository is undefined!");
        return reply
          .status(500)
          .send({ message: "Internal Server Error: DB not loaded" });
      }

      const resolvedPerson = request.resolvedPerson!; // Guaranteed by preHandler

      const newAccount = new Account();
      newAccount.email = email;
      if (password) newAccount.password = password; // In a real app, hash this!
      if (typeof isActive === "boolean") newAccount.isActive = isActive;
      if (role) newAccount.role = role;
      if (language) newAccount.language = language;
      if (timezone) newAccount.timezone = timezone;
      newAccount.person = resolvedPerson; // Link the resolved/created Person object
      newAccount.personId = resolvedPerson.id; // Also set the foreign key ID

      // Validate the Account entity using class-validator
      const errors = await validate(newAccount);
      if (errors.length > 0) {
        fastify.log.error("Account entity validation errors:", errors);
        return reply.status(400).send({
          message: "Validation failed for account data",
          errors: errors.flatMap((err) => Object.values(err.constraints || {})),
        });
      }

      try {
        const savedAccount = await accountRepository.save(newAccount);
        // To ensure the 'person' relation is loaded in the response,
        // we might need to explicitly load it or return a fresh find.
        // For simplicity, we'll return the savedAccount, but be aware TypeORM
        // might not load relations by default after save.
        // If `savedAccount.person` is `undefined`, fetch it:
        savedAccount.person = savedAccount.person || resolvedPerson;

        reply.status(201).send(savedAccount);
      } catch (error: any) {
        fastify.log.error("Error creating account:", error);
        if (error.code === "23505" && error.detail.includes("email")) {
          // Assuming email is unique for Account
          return reply
            .status(409)
            .send({ message: "Account with this email already exists." });
        }
        reply.status(500).send({
          message: "Failed to create account due to an internal error.",
        });
      }
    },
  );
}

export default fp(accountRoutes, {
  name: "account-routes",
  dependencies: ["typeorm-plugin"], // Ensure TypeORM plugin is loaded first});
});
