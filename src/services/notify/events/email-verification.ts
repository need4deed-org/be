import type { JWT, TokenType } from "@fastify/jwt";
import { UserRole } from "need4deed-sdk";
import {
  emailVerificationManifestUrl,
  urlEmailVerification,
} from "../../../config/constants";
import type User from "../../../data/entity/user.entity";
import logger from "../../../logger";
import { VERIFICATION_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveContent,
  resolveLocale,
} from "../email-template";
import type { EmailMessage, EmailTransport } from "../types";

export interface EmailVerificationDeps {
  email: EmailTransport;
  jwt: JWT;
}

const loader = createManifestLoader(emailVerificationManifestUrl);

/** Test-only: drop the cached manifest so each test fetches fresh. */
export function resetVerificationTemplateCache(): void {
  loader.resetCache();
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
  const roleParam =
    user.role === UserRole.AGENT ? `?role=${UserRole.AGENT}` : "";
  const url = `${urlEmailVerification}/${token}${roleParam}`;

  logger.debug(`sendEmailVerification: ${user.email}, url: ${url}`);

  const content = resolveContent(
    await loader.load(),
    resolveLocale(user.language),
    BUILTIN,
  );
  const { subject, html, text } = fillTemplate(content, {
    verificationUrl: url,
  });

  const message: EmailMessage = {
    to: user.email,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  };

  await email.send(message);
}
