import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import {
  ApiAgentMembershipSummary,
  ApiCoordinatorInvitePost,
  ApiCoordinatorInviteResponse,
  ApiCoordinatorRegisterWithInvite,
  ApiUserGet,
  ApiUserPost,
  Lang,
  SortOrder,
  UserRole,
} from "need4deed-sdk";
import { FindOptionsWhere, ILike, In, Not } from "typeorm";
import {
  AlreadyUsedTokenError,
  BadRequestError,
  InvalidOrganizationEmailError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "../../config";
import {
  COORDINATOR_INVITE_LIFESPAN_MS,
  urlCoordinatorInvite,
} from "../../config/constants";
import User from "../../data/entity/user.entity";
import { hashPassword } from "../../data/utils";
import logger from "../../logger";
import { serializeUserToMeDTO } from "../../services/dto/dto-user";
import { idParamSchema, responseSchema, userListQuerySchema } from "../schema";
import { responseErrors } from "../schema/responseErrors";
import {
  coordinatorInviteBodySchema,
  coordinatorInviteResponseSchema,
  createUserBodySchema,
  registerWithInviteBodySchema,
  registerWithInviteQuerySchema,
  userResponseSchema,
  userResponseSchemaIncludePerson,
  userVerifyEmailSchema,
} from "../schema/user.schema";
import {
  CoordinatorInvitePerson,
  ParamsId,
  QuerystringUserList,
  ReplyDataCount,
  ReplyMessage,
  RoutePrefix,
} from "../types";
import {
  assertEmailAvailable,
  getSkipTake,
  getUserWhere,
  reclaimPendingUser,
  resolvePersonByEmail,
  validateAndSaveUser,
  verifyTokenOfType,
} from "../utils";
import { getActiveAgentMemberships } from "../utils/data/get-agent-memberships";
import { pickRepresentativeMembership } from "../utils/data/get-agent-person-representative";
import { getVolunteerIdByPersonId } from "../utils/data/get-volunteer-id-by-person-id";
import { isAgentDomainAllowed } from "../utils/data/is-agent-domain-allowed";
import { escapeLikePattern } from "../utils/data/person-name-ilike";

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

      // Non-staff only see staff accounts, never volunteers' or NGO users' emails.
      const callerRole = request.authUser?.role;
      const isPrivileged =
        callerRole === UserRole.COORDINATOR || callerRole === UserRole.ADMIN;
      const staffRoles = [UserRole.COORDINATOR, UserRole.ADMIN];
      if (!isPrivileged && role && !staffRoles.includes(role)) {
        return reply
          .status(200)
          .send({ message: "List of users page:1", data: [], count: 0 });
      }
      const where = getUserWhere(search, role) as FindOptionsWhere<User>;
      if (!isPrivileged) {
        where.role = role ?? In(staffRoles);
        where.isActive = true;
      }

      const userRepository = fastify.db.userRepository;
      const [users, count] = await userRepository.findAndCount({
        where,
        relations: ["person"],
        skip,
        take,
        order: { id: direction },
      });

      const data = users.map((user) => serializeUserToMeDTO(user));

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

  fastify.delete<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema(""),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;

      if (request.authUser!.id !== id) {
        throw new UnauthorizedError("Permission denied");
      }

      if (request.authUser!.role === UserRole.ADMIN) {
        const otherActiveAdmins = await fastify.db.userRepository.count({
          where: { role: UserRole.ADMIN, isActive: true, id: Not(id) },
        });
        if (otherActiveAdmins === 0) {
          throw new BadRequestError(
            "The last active admin account cannot be deactivated.",
          );
        }
      }

      const result = await fastify.db.userRepository.update(
        { id },
        { isActive: false, deactivatedAt: new Date() },
      );
      if (!result.affected) {
        throw new NotFoundError(`User id:${id} not found.`);
      }

      return reply
        .status(200)
        .send({ message: `Account id:${id} deactivated.` });
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
        let agentMemberships: ApiAgentMembershipSummary[] | undefined;
        if (user.role === UserRole.AGENT && user.personId) {
          const memberships = await getActiveAgentMemberships(user.personId);
          agentId = pickRepresentativeMembership(memberships)?.agentId;

          const membershipsByAgentId = new Map(
            memberships.map((m) => [
              m.agentId,
              { agentId: m.agentId, agentTitle: m.agent?.title ?? "" },
            ]),
          );
          agentMemberships = Array.from(membershipsByAgentId.values());
        }

        let volunteerId: number | undefined;
        if (user.role === UserRole.VOLUNTEER && user.personId) {
          volunteerId = await getVolunteerIdByPersonId(user.personId);
        }

        const payload = serializeUserToMeDTO(
          user,
          agentId,
          agentMemberships,
          volunteerId,
        );
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
              hasVolunteerProfile: { type: "boolean" },
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

      let decodedToken: { id?: number; email: string; type?: string };
      try {
        decodedToken = await fastify.jwt.verify(token);
      } catch (error) {
        logger.error(`JWT verification failed: ${error}`);
        return reply.status(400).send({ message: "Invalid or expired token." });
      }

      const email = decodedToken?.email;

      if (!email || decodedToken.type !== "verify") {
        return reply.status(400).send({ message: "Invalid token format." });
      }

      // a reclaimed email's new User must not be activated by the old User's link
      const user = decodedToken.id
        ? await userRepository.findOne({
            where: { id: decodedToken.id, email },
          })
        : null;

      if (!user) {
        logger.warn("User not found for login attempt.");
        throw new BadRequestError("Invalid token.");
      }

      let hasVolunteerProfile: boolean | undefined;
      if (user.role === UserRole.VOLUNTEER && user.personId) {
        hasVolunteerProfile =
          (await getVolunteerIdByPersonId(user.personId)) !== undefined;
      }

      const volunteerProfileFields =
        hasVolunteerProfile !== undefined ? { hasVolunteerProfile } : {};

      if (user.isActive) {
        throw new AlreadyUsedTokenError();
      }

      if (user.deactivatedAt) {
        throw new BadRequestError("Account has been deactivated.");
      }

      user.isActive = true;
      await userRepository.save(user);

      return reply.status(200).send({
        message: "Email verified successfully.",
        verified: true,
        ...volunteerProfileFields,
      });
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
      preHandler: async (request) => {
        const { person: personData, email, role } = request.body;

        if (role === UserRole.ADMIN || role === UserRole.COORDINATOR) {
          throw new UnauthorizedError();
        }

        if (role === UserRole.AGENT) {
          const allowed = await isAgentDomainAllowed(email, (domain) =>
            fastify.db.agentRepository
              .findOne({
                where: {
                  agentPerson: {
                    person: { email: ILike(`%@${escapeLikePattern(domain)}`) },
                  },
                },
              })
              .then((agent) => !!agent),
          );
          if (!allowed) {
            throw new InvalidOrganizationEmailError();
          }
        }

        if (personData.id) {
          throw new BadRequestError(
            "Linking to an existing person by id is not allowed on self-registration.",
          );
        }

        await reclaimPendingUser(fastify.db.userRepository, email);

        request.resolvedPerson = await resolvePersonByEmail(
          fastify.db.personRepository,
          email,
          personData,
        );
      },
    },
    async (request, reply) => {
      const { email, password: passwordPlain, role, language } = request.body;
      const userRepository = fastify.db.userRepository;

      await assertEmailAvailable(userRepository, email);

      const newUser = new User({
        email,
        password: await hashPassword(passwordPlain),
        role,
        isActive: false,
        language: language ?? Lang.EN,
        timezone: "CET",
        person: request.resolvedPerson,
      });

      const result = await validateAndSaveUser(userRepository, newUser);
      if (result.status === "error") {
        return reply.status(400).send({
          message: "Validation failed for newUser data",
          errors: result.errors,
        });
      }

      fastify.notify.emailVerification(result.user).catch((err) => {
        logger.error(
          `Failed to send verification email for user ${result.user.id}: ${err instanceof Error ? err.message : err}`,
        );
      });

      return reply.status(201).send(result.user);
    },
  );

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

        await reclaimPendingUser(
          fastify.db.userRepository,
          email,
          personData.id,
        );

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

        request.resolvedPerson = await resolvePersonByEmail(
          personRepository,
          email,
          personData,
          "create",
        );
      },
    },
    async (request, reply) => {
      const { email, password: passwordPlain, role, language } = request.body;
      const userRepository = fastify.db.userRepository;

      await assertEmailAvailable(userRepository, email);

      const newUser = new User({
        email,
        password: await hashPassword(passwordPlain),
        role,
        isActive: true,
        language: language ?? Lang.EN,
        timezone: "CET",
        person: request.resolvedPerson,
      });

      const result = await validateAndSaveUser(userRepository, newUser);
      if (result.status === "error") {
        return reply.status(400).send({
          message: "Validation failed for newUser data",
          errors: result.errors,
        });
      }

      return reply.status(201).send(result.user);
    },
  );

  fastify.post<{
    Body: ApiCoordinatorInvitePost;
    Reply: ApiCoordinatorInviteResponse | { message: string; errors?: any };
  }>(
    "/admin/coordinator-invite",
    {
      schema: {
        body: coordinatorInviteBodySchema,
        response: {
          201: coordinatorInviteResponseSchema,
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ role: UserRole.ADMIN })],
    },
    async (request, reply) => {
      const { email, person } = request.body;

      await assertEmailAvailable(fastify.db.userRepository, email, "allow");

      const token = fastify.jwt.sign(
        { email, person, type: "coordinator-invite" },
        { expiresIn: `${COORDINATOR_INVITE_LIFESPAN_MS}` },
      );
      const { exp } = fastify.jwt.decode<{ exp: number }>(token)!;

      return reply.status(201).send({
        token,
        link: `${urlCoordinatorInvite}?token=${encodeURIComponent(token)}`,
        expiresAt: new Date(exp * 1000).toISOString(),
      });
    },
  );

  fastify.post<{
    Body: ApiCoordinatorRegisterWithInvite;
    Querystring: { token: string };
    Reply: User | { message: string; errors?: any };
  }>(
    "/register-with-invite",
    {
      config: { public: true } as FastifyContextConfig,
      schema: {
        querystring: registerWithInviteQuerySchema,
        body: registerWithInviteBodySchema,
        response: {
          201: userResponseSchemaIncludePerson,
          ...responseErrors,
        },
      },
      preHandler: async (request) => {
        const { token } = request.query as { token?: string };

        const payload = await verifyTokenOfType<{
          email: string;
          person?: CoordinatorInvitePerson;
        }>(
          fastify,
          token,
          "coordinator-invite",
          "Invalid or expired invite token.",
          "Invalid invite token.",
        );

        if (!payload.person) {
          throw new UnauthenticatedError("Invalid invite token.");
        }

        await reclaimPendingUser(fastify.db.userRepository, payload.email);

        request.resolvedPerson = await resolvePersonByEmail(
          fastify.db.personRepository,
          payload.email,
          payload.person,
        );

        await assertEmailAvailable(fastify.db.userRepository, payload.email);

        request.coordinatorInvite = { email: payload.email };
      },
    },
    async (request, reply) => {
      const { email } = request.coordinatorInvite!;
      const { password } = request.body;

      const newUser = new User({
        email,
        password: await hashPassword(password),
        role: UserRole.COORDINATOR,
        isActive: true,
        language: Lang.EN,
        timezone: "CET",
        person: request.resolvedPerson,
      });

      const result = await validateAndSaveUser(
        fastify.db.userRepository,
        newUser,
      );
      if (result.status === "error") {
        return reply.status(400).send({
          message: "Validation failed for newUser data",
          errors: result.errors,
        });
      }

      return reply.status(201).send(result.user);
    },
  );
}
