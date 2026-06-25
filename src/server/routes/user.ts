import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  AgentMembershipStatus,
  AgentRoleType,
  ApiUserGet,
  ApiUserPost,
  Lang,
  SortOrder,
  UserRole,
} from "need4deed-sdk";
import { FindOptionsWhere, ILike } from "typeorm";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../config";
import Person from "../../data/entity/person.entity";
import User from "../../data/entity/user.entity";
import { hashPassword } from "../../data/utils";
import logger from "../../logger";
import { serializeUserToMeDTO } from "../../services/dto/dto-user";
import { responseSchema, userListQuerySchema } from "../schema";
import { responseErrors } from "../schema/responseErrors";
import {
  createUserBodySchema,
  userResponseSchema,
  userResponseSchemaIncludePerson,
  userVerifyEmailSchema,
} from "../schema/user.schema";
import { QuerystringUserList, ReplyDataCount, RoutePrefix } from "../types";
import { getSkipTake, getUserWhere, isEmailDomainTrusted } from "../utils";

export default async function userRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Querystring: QuerystringUserList;
    Reply: ReplyDataCount<ApiUserGet[]>;
  }>(
    "/",
    {
      schema: {
        querystring: userListQuerySchema,
        response: responseSchema("ApiUserMe#", true),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { page, limit, search, role, sortOrder } = request.query;
      const [skip, take] = getSkipTake({ page, limit });
      const direction = sortOrder === SortOrder.OldToNew ? "ASC" : "DESC";

      const userRepository = fastify.db.userRepository;
      const [users, count] = await userRepository.findAndCount({
        where: getUserWhere(search, role) as FindOptionsWhere<User>,
        relations: ["person"],
        skip,
        take,
        order: { id: direction },
      });

      const data = users.map(serializeUserToMeDTO);

      return reply.status(200).send({
        message: `List of users page:${page || 1}`,
        data,
        count,
      });
    },
  );

  fastify.get<{
    Reply: {
      message: string;
      data?: User;
    };
  }>(
    "/:id",
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
        logger.error(`Error fetching user: ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.get<{ Querystring: { access?: string } }>(
    RoutePrefix.ME,
    {
      schema: {
        querystring: {
          type: ["object", "null"],
          properties: {
            access: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                $ref: "ApiUserMe#",
              },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const userRepository = fastify.db.userRepository;
      if (!userRepository) {
        logger.error("userRepository is not initialized!");
        return reply.status(500).send({ message: "Internal Server Error." });
      }

      try {
        const user = await userRepository.findOne({
          where: { id: request.user?.id },
          relations: ["person"],
        });

        if (!user) {
          return reply.status(404).send({ message: "User not found." });
        }

        let agentId: number | undefined;
        if (user.role === UserRole.AGENT && user.personId) {
          // Prefer VOLUNTEER_COORDINATOR role; fall back to any active membership.
          const membership =
            (await fastify.db.agentPersonRepository.findOne({
              where: {
                personId: user.personId,
                status: AgentMembershipStatus.ACTIVE,
                role: AgentRoleType.VOLUNTEER_COORDINATOR,
              },
              order: { id: "ASC" },
            })) ??
            (await fastify.db.agentPersonRepository.findOne({
              where: {
                personId: user.personId,
                status: AgentMembershipStatus.ACTIVE,
              },
              order: { id: "ASC" },
            }));
          agentId = membership?.agentId;
        }

        const payload = serializeUserToMeDTO(user, agentId);
        return reply
          .status(200)
          .send({ message: "Logged in User", data: payload });
      } catch (error) {
        logger.error(`Error fetching user: ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.post<{ Body: { token: string } }>(
    RoutePrefix.VERIFY_EMAIL,
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
        logger.error("userRepository is not initialized!");
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
        logger.error(`JWT verification failed: ${error}`);
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
          logger.warn(`User with email ${email} not found.`);
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
        logger.error(`Error verifying email: ${error}`);
        return reply.status(500).send({
          message: "Failed to verify email due to an internal error.",
        });
      }
    },
  );

  fastify.post<{
    Body: ApiUserPost;
    Reply: User | { message: string; errors?: any };
  }>(
    "/",
    {
      schema: {
        body: createUserBodySchema,
        response: {
          201: userResponseSchemaIncludePerson,
          ...responseErrors,
        },
      },
      // Pre-handler hook: authorize the registration and resolve the Person.
      preHandler: async (request) => {
        const { person: personData, email, role } = request.body;

        // Privileged roles cannot be self-assigned via registration.
        if (role === UserRole.ADMIN || role === UserRole.COORDINATOR) {
          throw new UnauthorizedError();
        }

        // Agents must register from a known RAC email domain: either an
        // existing agent member already shares it, or it's on the trusted-domain
        // allowlist (so a brand-new org's first representative can register).
        // Volunteers and users self-register freely.
        if (role === UserRole.AGENT) {
          const domain = (email || "").split("@").pop();
          const matchingAgent = await fastify.db.agentRepository.findOne({
            where: {
              agentPerson: { person: { email: ILike(`%@${domain}`) } },
            },
          });
          if (!matchingAgent && !(await isEmailDomainTrusted(email))) {
            throw new NotFoundError();
          }
        }

        const personRepository = fastify.db.personRepository;

        // Existing person by id.
        if (personData.id) {
          const resolvedPerson = await personRepository.findOneBy({
            id: personData.id,
          });
          if (!resolvedPerson) {
            throw new BadRequestError(
              `Person with ID ${personData.id} not found.`,
            );
          }
          // Backfill the account email onto the person when it has none
          // (cascade-saved with the user); never overwrite an existing value.
          if (!resolvedPerson.email) {
            resolvedPerson.email = email;
          }
          request.resolvedPerson = resolvedPerson;
          return;
        }

        // New person. Mirror the account email onto the person so the person
        // record carries the same email the user registered with.
        const newPerson = new Person(personData);
        newPerson.email = email;
        const errors = await validate(newPerson);
        if (errors.length > 0) {
          logger.error(
            `New Person entity validation errors: ${JSON.stringify(errors)}`,
          );
          const messages = errors.flatMap((err) =>
            Object.values(err.constraints || {}),
          );
          throw new BadRequestError(
            `Validation failed for new person data: ${messages.join("; ")}`,
          );
        }
        request.resolvedPerson = newPerson;
      },
    },
    async (request, reply) => {
      const { email, password: passwordPlain, role, language } = request.body;
      const userRepository = fastify.db.userRepository;

      // Surface the duplicate-email case as 409 up front (the DB unique
      // constraint remains the ultimate guard for the rare race).
      if (await userRepository.findOneBy({ email })) {
        throw new ConflictError("User with this email already exists.");
      }

      const newUser = new User({
        email,
        password: await hashPassword(passwordPlain),
        role,
        isActive: false,
        language: language ?? Lang.EN,
        // Server-controlled (not in ApiUserPost). Set explicitly to the entity
        // default so class-validator's @IsString passes (the DB default only
        // applies at INSERT, not to the in-memory entity being validated).
        timezone: "CET",
        person: request.resolvedPerson,
      });

      // Validate the User entity using class-validator
      const errors = await validate(newUser);
      if (errors.length > 0) {
        logger.error(
          `User entity validation errors: ${JSON.stringify(errors)}`,
        );
        return reply.status(400).send({
          message: "Validation failed for newUser data",
          errors: errors.flatMap((err) => Object.values(err.constraints || {})),
        });
      }

      // Unexpected DB errors propagate to the global error handler.
      const savedUser = await userRepository.save(newUser);

      fastify.notify.emailVerification(savedUser).catch((err) => {
        logger.error(
          `Failed to send verification email for user ${savedUser.id}: ${err instanceof Error ? err.message : err}`,
        );
      });

      return reply.status(201).send(savedUser);
    },
  );

  // Admin-only user creation — accepts any role including admin/coordinator.
  // Unlike POST /user/ this endpoint requires an authenticated admin session
  // and activates the account immediately (no email verification flow).
  fastify.post<{
    Body: ApiUserPost;
    Reply: User | { message: string; errors?: any };
  }>(
    "/admin",
    {
      schema: {
        body: createUserBodySchema,
        response: {
          201: userResponseSchemaIncludePerson,
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ role: UserRole.ADMIN })],
      preHandler: async (request) => {
        const { person: personData, email } = request.body;
        const personRepository = fastify.db.personRepository;

        if (personData.id) {
          const resolvedPerson = await personRepository.findOneBy({
            id: personData.id,
          });
          if (!resolvedPerson) {
            throw new BadRequestError(
              `Person with ID ${personData.id} not found.`,
            );
          }
          if (!resolvedPerson.email) {
            resolvedPerson.email = email;
          }
          request.resolvedPerson = resolvedPerson;
          return;
        }

        const newPerson = new Person(personData);
        newPerson.email = email;
        const errors = await validate(newPerson);
        if (errors.length > 0) {
          const messages = errors.flatMap((err) =>
            Object.values(err.constraints || {}),
          );
          throw new BadRequestError(
            `Validation failed for new person data: ${messages.join("; ")}`,
          );
        }
        request.resolvedPerson = newPerson;
      },
    },
    async (request, reply) => {
      const { email, password: passwordPlain, role, language } = request.body;
      const userRepository = fastify.db.userRepository;

      if (await userRepository.findOneBy({ email })) {
        throw new ConflictError("User with this email already exists.");
      }

      const newUser = new User({
        email,
        password: await hashPassword(passwordPlain),
        role,
        isActive: true,
        language: language ?? Lang.EN,
        timezone: "CET",
        person: request.resolvedPerson,
      });

      const errors = await validate(newUser);
      if (errors.length > 0) {
        logger.error(
          `User entity validation errors: ${JSON.stringify(errors)}`,
        );
        return reply.status(400).send({
          message: "Validation failed for newUser data",
          errors: errors.flatMap((err) => Object.values(err.constraints || {})),
        });
      }

      const savedUser = await userRepository.save(newUser);
      return reply.status(201).send(savedUser);
    },
  );
}
