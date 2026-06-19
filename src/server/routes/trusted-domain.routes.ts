import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiTrustedDomainPatch,
  ApiTrustedDomainPost,
  UserRole,
} from "need4deed-sdk";
import { Not } from "typeorm";
import { ConflictError, NotFoundError } from "../../config";
import TrustedDomain from "../../data/entity/trusted-domain.entity";
import {
  idParamSchema,
  responseErrors,
  responseSchema,
  trustedDomainBodySchema,
  trustedDomainItemResponseSchema,
  trustedDomainListResponseSchema,
} from "../schema";
import { ParamsId } from "../types";

const dtoTrustedDomain = (td: TrustedDomain) => ({
  id: td.id,
  domain: td.domain,
});

const normalize = (domain: string) => domain.trim().toLowerCase();

export default async function trustedDomainRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  // The trusted-domain allowlist gates agent self-registration, so managing it
  // is COORDINATOR/ADMIN only (ADMIN bypasses the role check).
  fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.get(
    "/",
    {
      schema: {
        response: { 200: trustedDomainListResponseSchema, ...responseErrors },
      },
    },
    async (_request, reply) => {
      const domains = await fastify.db.trustedDomainRepository.find({
        order: { domain: "ASC" },
      });
      return reply.status(200).send({
        message: `${domains.length} trusted domains.`,
        data: domains.map(dtoTrustedDomain),
      });
    },
  );

  fastify.post<{ Body: ApiTrustedDomainPost }>(
    "/",
    {
      schema: {
        body: trustedDomainBodySchema,
        response: {
          201: trustedDomainItemResponseSchema,
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const domain = normalize(request.body.domain);
      const repo = fastify.db.trustedDomainRepository;

      // Surface the duplicate up front as 409; the unique index is the ultimate
      // guard for the rare race.
      if (await repo.findOneBy({ domain })) {
        throw new ConflictError(`Domain "${domain}" is already trusted.`);
      }

      const saved = await repo.save(new TrustedDomain({ domain }));
      return reply.status(201).send({
        message: `Trusted domain "${domain}" added.`,
        data: dtoTrustedDomain(saved),
      });
    },
  );

  fastify.patch<{ Params: ParamsId; Body: ApiTrustedDomainPatch }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: trustedDomainBodySchema,
        response: { 200: trustedDomainItemResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const repo = fastify.db.trustedDomainRepository;

      const existing = await repo.findOneBy({ id });
      if (!existing) {
        throw new NotFoundError(`Trusted domain (id:${id}) not found.`);
      }

      const domain = normalize(request.body.domain);
      if (await repo.findOneBy({ domain, id: Not(id) })) {
        throw new ConflictError(`Domain "${domain}" is already trusted.`);
      }

      existing.domain = domain;
      const saved = await repo.save(existing);
      return reply.status(200).send({
        message: `Trusted domain (id:${id}) updated.`,
        data: dtoTrustedDomain(saved),
      });
    },
  );

  fastify.delete<{ Params: ParamsId }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { affected } = await fastify.db.trustedDomainRepository.delete({
        id,
      });
      if (!affected) {
        throw new NotFoundError(`Trusted domain (id:${id}) not found.`);
      }

      return reply
        .status(200)
        .send({ message: `Trusted domain (id:${id}) deleted.` });
    },
  );
}
