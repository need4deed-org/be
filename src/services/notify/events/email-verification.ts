import type { JWT, TokenType } from "@fastify/jwt";
import { urlEmailVerification } from "../../../config/constants";
import type User from "../../../data/entity/user.entity";
import logger from "../../../logger";
import type { EmailTransport } from "../types";

export interface EmailVerificationDeps {
  email: EmailTransport;
  jwt: JWT;
}

export async function sendEmailVerification(
  { email, jwt }: EmailVerificationDeps,
  user: User,
): Promise<void> {
  if (!user?.email) {
    throw new Error("User email is required for verification");
  }

  const token = jwt.sign({
    id: user.id,
    email: user.email,
    type: "verify" as TokenType,
  });
  const url = `${urlEmailVerification}/${token}`;
  const copy =
    "Your account has been created successfully. Please verify your email:";

  logger.debug(`sendEmailVerification: ${user.email}`);

  await email.send({
    to: user.email,
    subject: "Account Created",
    text: `${copy}\n${url}`,
    html: `<p>${copy}</p><p><a href="${url}">${url}</a></p>`,
  });
}
