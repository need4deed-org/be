import { TokenType } from "@fastify/jwt";
import { FastifyInstance } from "fastify";
import { urlEmailVerification } from "../../config/constants";
import User from "../../data/entity/user.entity";
import logger from "../../logger";
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

  let token: string;

  const tokenPayload = {
    id: user.id,
    email: user.email,
    type: "verify" as TokenType,
  };
  try {
    token = fastify.jwt.sign(tokenPayload);
  } catch (error) {
    logger.error(`Error signing JWT token: ${error}`);
    throw new Error("Failed to create verification token");
  }

  const url = `${urlEmailVerification}/${token}`;
  const copy =
    "Your account has been created successfully. Please verify your email:";

  const subject = "Account Created";
  const text = `${copy}
    ${url}`;
  const html = `<p>${copy}</p>
    <p><a href="${url}">${url}</a></p>`;

  logger.debug(`sendVerificationEmail: ${user.email}, url: ${url}`);

  try {
    const emailService = getEmailService(fastify);
    return await emailService.send({
      to: user.email,
      subject,
      text,
      html,
    });
  } catch (error) {
    logger.error(`Error sending verification email: ${error}`);
    throw new Error("Failed to send verification email");
  }
}
