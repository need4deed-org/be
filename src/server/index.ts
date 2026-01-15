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
import appreciationRoutes from "./routes/apprerciation.routes";
import authRoutes from "./routes/auth";
import commentRoutes from "./routes/comment";
import communicationRoutes from "./routes/communication.routes";
import healthRoutes from "./routes/health";
import optionRoutes from "./routes/option";
import personRoutes from "./routes/person";
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

export async function start() {
  fastify.log.info("Starting server...");
  try {
    // Register external schemas first so they're available for $ref resolution
    await fastify.addSchema({
      $id: "entity-types",
      ...entityTypesSchema,
    });
    await fastify.addSchema({
      $id: "sdk-types",
      ...sdkTypesSchema,
    });
    await fastify.addSchema({
      $id: "volunteer-api-id-properties",
      ...volunteerGetPropertiesSchema,
    });
    await fastify.addSchema({
      $id: "volunteer-api",
      ...volunteerApiSchema,
    });
    await fastify.addSchema({
      $id: "volunteer-api-id",
      ...volunteerApiIdSchema,
    });
    await fastify.addSchema({
      $id: "volunteer-api-id-part",
      ...volunteerApiIdPartSchema,
    });
    await fastify.addSchema({
      $id: "volunteer-form-data",
      ...volunteerFormDataSchema,
    });
    await fastify.addSchema({
      $id: "option-lists",
      ...optionListsSchema,
    });

    await fastify.setErrorHandler((error, request, reply) => {
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

    await fastify.register(typeormPlugin);
    await fastify.register(cookie);

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }
    await fastify.register(jwtPlugin, { secret });
    await fastify.register(cors, corsOptions);
    await fastify.register(multipart, {
      attachFieldsToBody: "keyValues",
    });

    await fastify.register(
      fastifyMailer,
      getMailerConfigForSES(getSesClient()),
    );
    await fastify.register(fastifySwagger, {
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
    await fastify.register(fastifySwaggerUi, {
      routePrefix: RoutePrefix.SWAGGER,
      uiConfig: {
        docExpansion: "full",
        deepLinking: false,
      },
    });
    await fastify.register(emailPlugin, { provider: "ses", defaultFrom });
    await fastify.register(healthRoutes, { prefix: RoutePrefix.HEALTH_CHECK });
    await fastify.register(authRoutes, { prefix: RoutePrefix.AUTH });
    await fastify.register(userRoutes, { prefix: RoutePrefix.USER });
    await fastify.register(personRoutes, { prefix: RoutePrefix.PERSON });
    await fastify.register(volunteerRoutes, { prefix: RoutePrefix.VOLUNTEER });
    await fastify.register(optionRoutes, { prefix: RoutePrefix.OPTION });
    await fastify.register(commentRoutes, { prefix: RoutePrefix.COMMENT });
    await fastify.register(communicationRoutes, {
      prefix: RoutePrefix.COMMUNICATION,
    });
    await fastify.register(appreciationRoutes, {
      prefix: RoutePrefix.APPRECIATION,
    });

    await fastify.ready();
    fastify.log.debug(fastify.printRoutes());

    const port = Number(process.env.PORT) || 5000;
    await fastify.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
