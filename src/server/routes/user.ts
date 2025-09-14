import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

import Person, { PersonUpdateType } from "../../data/entity/person.entity";
import User from "../../data/entity/user.entity";
import { Role } from "../../data/types";
import { hashPassword } from "../../data/utils";
import { sendVerificationEmail } from "../../services";
import { responseErrors } from "../schema/responseErrors";
import {
  createUserBodySchema,
  userResponseSchema,
  userResponseSchemaIncludePerson,
  userVerifyEmailSchema,
} from "../schema/user.schema";
import { RoutePrefix } from "../types";

async function userRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.USER;
  fastify.get<{
    Reply: {
      message: string;
      data?: Array<User>;
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
              data: { type: "array", items: userResponseSchema },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ role: Role.ADMIN })],
    },
    async (request, reply) => {
      try {
        const userRepository = fastify.db.userRepository;
        const users = await userRepository.find();
        return reply
          .status(200)
          .send({ message: "List of users", data: users });
      } catch (error) {
        fastify.log.error(`Error fetching users: ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.get<{
    Reply: {
      message: string;
      data?: User;
    };
  }>(
    prefixedPath + "/:id",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: userResponseSchema,
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ allowSelf: true })],
    },
    async (request, reply) => {
      const userId = (request.params as { id: string }).id;
      try {
        const userRepository = fastify.db.userRepository;
        const user = await userRepository.findOne({
          where: { id: parseInt(userId) },
        });

        if (!user) {
          return reply
            .status(404)
            .send({ message: `User id:${userId} not found.` });
        }

        return reply
          .status(200)
          .send({ message: `Details for account id:${userId}`, data: user });
      } catch (error) {
        fastify.log.error(`Error fetching user: ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.post<{ Body: { token: string } }>(
    prefixedPath + RoutePrefix.VERIFY_EMAIL,
    {
      schema: {
        body: userVerifyEmailSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              verified: { type: "boolean" },
            },
            required: ["message", "verified"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const token = request.body.token;

      const userRepository = fastify.db.userRepository;
      if (!userRepository) {
        fastify.log.error("userRepository is not initialized!");
        return reply.status(500).send({ message: "Internal Server Error." });
      }

      if (!token) {
        return reply
          .status(400)
          .send({ message: "Token is required for email verification." });
      }

      let decodedToken: { email: string };
      try {
        decodedToken = await fastify.jwt.verify(token);
      } catch (error) {
        fastify.log.error(`JWT verification failed: ${error}`);
        return reply.status(400).send({ message: "Invalid or expired token." });
      }

      const email = decodedToken?.email;

      if (!email) {
        return reply.status(400).send({ message: "Invalid token format." });
      }

      try {
        const user = await userRepository.findOne({
          where: { email },
        });

        if (!user) {
          fastify.log.warn(`User with email ${email} not found.`);
          return reply.status(400).send({ message: "Invalid token." });
        }

        if (user.isActive) {
          return reply.status(200).send({
            message: "Email is already verified.",
            verified: true,
          });
        }

        user.isActive = true;
        await userRepository.save(user);

        return reply.status(200).send({
          message: "Email verified successfully.",
          verified: true,
        });
      } catch (error) {
        fastify.log.error(`Error verifying email: ${error}`);
        return reply.status(500).send({
          message: "Failed to verify email due to an internal error.",
        });
      }
    },
  );

  fastify.post<{
    Body: {
      email: string;
      password?: string;
      isActive?: boolean;
      role?: string;
      language?: string;
      timezone?: string;
      person: PersonUpdateType;
      resolvedPerson: Partial<Person>;
    };
    Reply: User | { message: string; errors?: any };
  }>(
    prefixedPath,
    {
      schema: {
        body: createUserBodySchema,
        response: {
          201: userResponseSchemaIncludePerson,
          ...responseErrors,
        },
      },
      // Pre-handler hook to resolve/create the Person entity
      preHandler: async (request, reply) => {
        const { person: personData } = request.body;
        const personRepository = fastify.db.personRepository;

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
          resolvedPerson = new Person(personData);

          const errors = await validate(resolvedPerson);
          if (errors.length > 0) {
            fastify.log.error("New Person entity validation errors:", errors);
            return reply.status(400).send({
              message: "Validation failed for new person data",
              errors: errors.flatMap((err) =>
                Object.values(err.constraints || {}),
              ),
            });
          }
        }
        request.resolvedPerson = resolvedPerson;
      },
    },
    async (request, reply) => {
      const {
        email,
        password: passwordPlain,
        role,
        language,
        timezone,
      } = request.body;
      const userRepository = fastify.db.userRepository;
      if (!userRepository) {
        fastify.log.error("Repository is undefined!");
        return reply
          .status(500)
          .send({ message: "Internal Server Error: DB not loaded" });
      }

      const person = request.resolvedPerson;
      const password = await hashPassword(passwordPlain);
      const isActive = false;
      const newUser = new User({
        email,
        password,
        role,
        isActive,
        language,
        timezone,
        person,
      });

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
        const savedUser = await userRepository.save(newUser);

        sendVerificationEmail({ fastify, user: savedUser });

        reply.status(201).send(savedUser);
      } catch (error) {
        fastify.log.error(
          `Error creating user: ${JSON.stringify(error, null, 4)}`,
        );
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
