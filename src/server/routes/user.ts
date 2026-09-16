import { validate } from "class-validator";
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
import { FindOptionsWhere, ILike } from "typeorm";
import {
  BadRequestError,
  ConflictError,
  InvalidOrganizationEmailError,
  PersonAlreadyRegisteredError,
  UnauthenticatedError,
  UnauthorizedError,
} from "../../config";
import {
  COORDINATOR_INVITE_LIFESPAN_MS,
  urlCoordinatorInvite,
} from "../../config/constants";
import Person from "../../data/entity/person.entity";
import User from "../../data/entity/user.entity";
import { hashPassword } from "../../data/utils";
import logger from "../../logger";
import { serializeUserToMeDTO } from "../../services/dto/dto-user";
import { responseSchema, userListQuerySchema } from "../schema";
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
  QuerystringUserList,
  ReplyDataCount,
  RoutePrefix,
} from "../types";
import {
  getSkipTake,
  getUserWhere,
  validateAndSaveUser,
  verifyTokenOfType,
} from "../utils";
import { getActiveAgentMemberships } from "../utils/data/get-agent-memberships";
import { pickRepresentativeMembership } from "../utils/data/get-agent-person-representative";
import { getVolunteerIdByPersonId } from "../utils/data/get-volunteer-id-by-person-id";
import { isAgentDomainAllowed } from "../utils/data/is-agent-domain-allowed";

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
          // Single query, derive both fields from it — querying agentId and
          // agentMemberships separately let them race against a concurrent
          // membership change and disagree (be#809 review).
          const memberships = await getActiveAgentMemberships(user.personId);
          agentId = pickRepresentativeMembership(memberships)?.agentId;

          // Dedupe by agentId: a person can hold multiple roles at the same
          // agent (AgentPerson's unique index is the (agentId, personId,
          // role) triple), but ApiAgentMembershipSummary has no role field.
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
          logger.warn("User not found for login attempt.");
          return reply.status(400).send({ message: "Invalid token." });
        }

        // Only meaningful for VOLUNTEER: does the Person this account is
        // linked to (possibly an existing one, via be#947's email-linking)
        // already have a Volunteer profile — same email-first check
        // documented in fe#956 (never resolved via userId/personId
        // assumptions on their own, always the verified email's Person).
        let hasVolunteerProfile: boolean | undefined;
        if (user.role === UserRole.VOLUNTEER && user.personId) {
          hasVolunteerProfile =
            (await getVolunteerIdByPersonId(user.personId)) !== undefined;
        }

        const volunteerProfileFields =
          hasVolunteerProfile !== undefined ? { hasVolunteerProfile } : {};

        if (user.isActive) {
          return reply.status(200).send({
            message: "Email is already verified.",
            verified: true,
            ...volunteerProfileFields,
          });
        }

        user.isActive = true;
        await userRepository.save(user);

        return reply.status(200).send({
          message: "Email verified successfully.",
          verified: true,
          ...volunteerProfileFields,
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
        //
        // A free/consumer domain (gmail.com, yahoo.com, ...) never qualifies
        // via the existing-member shortcut — anyone can register an address
        // there, so one agent already using it says nothing about this
        // signup. Only an explicit TrustedDomain entry can clear the gate for
        // those domains (be#1001).
        if (role === UserRole.AGENT) {
          const allowed = await isAgentDomainAllowed(email, (domain) =>
            fastify.db.agentRepository
              .findOne({
                where: {
                  agentPerson: { person: { email: ILike(`%@${domain}`) } },
                },
              })
              .then((agent) => !!agent),
          );
          if (!allowed) {
            throw new InvalidOrganizationEmailError();
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

        // No explicit person.id — look up an existing Person by email
        // (case-insensitively) before creating a new, disconnected one, e.g.
        // a Person that already exists via a legacy Volunteer row (be#923).
        const existingPerson = await personRepository.findOne({
          where: { email: ILike(email) },
          relations: ["users"],
        });
        if (existingPerson) {
          // Conservative default: a Person that already has a User (any
          // role) is not re-registrable — point them at login instead of
          // silently attaching a second account to the same Person.
          if (existingPerson.users?.length) {
            throw new PersonAlreadyRegisteredError();
          }
          request.resolvedPerson = existingPerson;
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

      // Unexpected DB errors propagate to the global error handler.
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

  // Admin-only: generate a coordinator invite link, so the admin never sets
  // or sees the coordinator's password themselves (be#1002 epic). The
  // upfront email check below is the same race-tolerant pattern as POST
  // /user/admin above — a concurrent duplicate falls through to the global
  // error handler rather than a clean 409, same trade-off made there.
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

      if (await fastify.db.userRepository.findOneBy({ email })) {
        throw new ConflictError("User with this email already exists.");
      }

      const token = fastify.jwt.sign(
        { email, person, type: "coordinator-invite" },
        { expiresIn: `${COORDINATOR_INVITE_LIFESPAN_MS}` },
      );
      // Derived from the token's own exp claim rather than a second
      // Date.now() call, so it can't drift from what the server actually
      // enforces on consumption.
      const { exp } = fastify.jwt.decode<{ exp: number }>(token)!;

      return reply.status(201).send({
        token,
        link: `${urlCoordinatorInvite}?token=${encodeURIComponent(token)}`,
        expiresAt: new Date(exp * 1000).toISOString(),
      });
    },
  );

  // Public: consume a coordinator invite link. Mirrors the authByVerifyToken
  // preHandler pattern in volunteer/register.routes.ts — the caller is
  // authorized by the invite JWT itself, not a session (be#1002 epic).
  // Single-use is enforced the same way the email-uniqueness race is
  // tolerated elsewhere in this file: once consumed, the User row for this
  // email exists, so a token replay hits the same "already exists" check
  // below (backed by the DB's unique constraint on User.email) rather than
  // creating a second account. No separate used/consumedAt row needed.
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

        if (
          await fastify.db.userRepository.findOneBy({ email: payload.email })
        ) {
          throw new ConflictError("User with this email already exists.");
        }

        // Same email-first lookup as POST / (be#923) — an invited
        // coordinator's email may already have a Person row (e.g. a prior
        // Volunteer signup with no User yet); link to it instead of
        // creating a disconnected duplicate. Shares request.resolvedPerson
        // with POST / and POST /admin rather than a separate field.
        const existingPerson = await fastify.db.personRepository.findOne({
          where: { email: ILike(payload.email) },
          relations: ["users"],
        });
        if (existingPerson?.users?.length) {
          throw new PersonAlreadyRegisteredError();
        }

        request.coordinatorInvite = { email: payload.email };
        request.resolvedPerson =
          existingPerson ??
          new Person({ ...payload.person, email: payload.email });
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
