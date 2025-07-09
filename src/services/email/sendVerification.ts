import { FastifyInstance } from "fastify";

import { TokenType } from "@fastify/jwt";
import { urlEmailVerification } from "../../config/constants";
import { User } from "../../data/entity/user.entity";
import { getEmailService } from "./helpers";

export async function sendVerificationEmail({
  fastify,
  user,
}: {
  fastify: FastifyInstance;
  user: User;
}) {
  if (!user || !user.email) {
    throw new Error("User or email is not defined");
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    type: "verify" as TokenType,
  };
  const token = fastify.jwt.sign(tokenPayload);
  const url = `${urlEmailVerification}/${token}`;
  const copy =
    "Your account has been created successfully. Please verify your email:";

  const subject = "Account Created";
  const text = `${copy}
    ${url}`;
  const html = `<p>${copy}</p>
    <p><a href="${url}">${url}</a></p>`;

  fastify.log.debug(`sendVerificationEmail: ${user.email}, url: ${url}`);

  const emailService = getEmailService(fastify);
  return await emailService.send({
    to: user.email,
    subject,
    text,
    html,
  });
}
