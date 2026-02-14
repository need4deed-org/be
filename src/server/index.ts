import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import Fastify, { FastifyInstance } from "fastify";
import fastifyMailer from "fastify-mailer";
import { defaultFrom, selfUrl } from "../config/constants";
import { BaseError } from "../config/error/base";
import { getMailerConfigForSES, getSesClient } from "../services";
import cors, { corsOptions } from "./plugins/cors";
import emailPlugin from "./plugins/email";
import jwtPlugin from "./plugins/jwt";
import typeormPlugin from "./plugins/typeorm";
import agentRoutes from "./routes/agent/agent.routes";
import appreciationRoutes from "./routes/appreciation.routes";
import authRoutes from "./routes/auth";
import commentRoutes from "./routes/comment";
import communicationRoutes from "./routes/communication.routes";
import healthRoutes from "./routes/health";
import opportunityRoutes from "./routes/opportunity/opportunity.routes";
import optionRoutes from "./routes/option";
import personRoutes from "./routes/person.routes";
import userRoutes from "./routes/user";
import volunteerRoutes from "./routes/volunteer/volunteer.routes";
import entityTypesSchema from "./schema/entity-types.json";
import optionListsSchema from "./schema/option-lists.json";
import sdkTypesSchema from "./schema/sdk-types.json";
import volunteerApiIdPartSchema from "./schema/volunteer-api-id-part.json";
import volunteerGetPropertiesSchema from "./schema/volunteer-api-id-properties.json";
import volunteerApiIdSchema from "./schema/volunteer-api-id.json";
import volunteerApiSchema from "./schema/volunteer-api.json";
import volunteerFormDataSchema from "./schema/volunteer-form.json";
import { RoutePrefix } from "./types";

export const fastify: FastifyInstance = Fastify({
  logger: {
    level: process.env.NODE_ENV === "development" ? "debug" : undefined,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  },
  ajv: {
    customOptions: {
      strict: false,
    },
  },
});

export async function createServer(
  fastifyInstance: FastifyInstance = fastify,
): Promise<FastifyInstance> {
  // Register external schemas first so they're available for $ref resolution
  await fastifyInstance.addSchema({
    $id: "entity-types",
    ...entityTypesSchema,
  });
  await fastifyInstance.addSchema({
    $id: "sdk-types",
    ...sdkTypesSchema,
  });
  await fastifyInstance.addSchema({
    $id: "volunteer-api-id-properties",
    ...volunteerGetPropertiesSchema,
  });
  await fastifyInstance.addSchema({
    $id: "volunteer-api",
    ...volunteerApiSchema,
  });
  await fastifyInstance.addSchema({
    $id: "volunteer-api-id",
    ...volunteerApiIdSchema,
  });
  await fastifyInstance.addSchema({
    $id: "volunteer-api-id-part",
    ...volunteerApiIdPartSchema,
  });
  await fastifyInstance.addSchema({
    $id: "volunteer-form-data",
    ...volunteerFormDataSchema,
  });
  await fastifyInstance.addSchema({
    $id: "option-lists",
    ...optionListsSchema,
  });

  await fastifyInstance.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // If it's one of our custom errors, use its status code
    if (error instanceof BaseError) {
      return reply.status(error.statusCode).send({
        error: error.constructor.name,
        message: error.message,
      });
    }

    // Handle schema errors
    if (error.validation) {
      return reply.status(400).send({ message: "Validation failed" });
    }

    // Handle generic TypeORM / Unexpected errors
    return reply.status(500).send({ message: "Something went wrong." });
  });

  await fastifyInstance.register(typeormPlugin);
  await fastifyInstance.register(cookie);

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }
  await fastifyInstance.register(jwtPlugin, { secret });
  await fastifyInstance.register(cors, corsOptions);
  await fastifyInstance.register(multipart, {
    attachFieldsToBody: "keyValues",
  });

  await fastifyInstance.register(
    fastifyMailer,
    getMailerConfigForSES(getSesClient()),
  );
  await fastifyInstance.register(fastifySwagger, {
    openapi: {
      info: {
        title: "N4D Fastify API Documentation",
        description: "will come later",
        version: "0.0.1",
      },
      servers: [
        {
          url: selfUrl,
          description: "Local development server",
        },
      ],
    },
  });
  await fastifyInstance.register(fastifySwaggerUi, {
    routePrefix: RoutePrefix.SWAGGER,
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });
  await fastifyInstance.register(emailPlugin, { provider: "ses", defaultFrom });
  await fastifyInstance.register(healthRoutes, {
    prefix: RoutePrefix.HEALTH_CHECK,
  });
  await fastifyInstance.register(authRoutes, { prefix: RoutePrefix.AUTH });
  await fastifyInstance.register(userRoutes, { prefix: RoutePrefix.USER });
  await fastifyInstance.register(personRoutes, { prefix: RoutePrefix.PERSON });
  await fastifyInstance.register(volunteerRoutes, {
    prefix: RoutePrefix.VOLUNTEER,
  });
  await fastifyInstance.register(opportunityRoutes, {
    prefix: RoutePrefix.OPPORTUNITY,
  });
  await fastifyInstance.register(optionRoutes, { prefix: RoutePrefix.OPTION });
  await fastifyInstance.register(commentRoutes, {
    prefix: RoutePrefix.COMMENT,
  });
  await fastifyInstance.register(communicationRoutes, {
    prefix: RoutePrefix.COMMUNICATION,
  });
  await fastifyInstance.register(appreciationRoutes, {
    prefix: RoutePrefix.APPRECIATION,
  });
  await fastifyInstance.register(agentRoutes, { prefix: RoutePrefix.AGENT });

  return fastifyInstance;
}
