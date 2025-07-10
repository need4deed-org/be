import { FastifyInstance } from "fastify";

export function getEmailService(fastify: FastifyInstance) {
  if (!fastify.emailService) {
    throw new Error("Email service is not initialized");
  }
  return fastify.emailService;
}
