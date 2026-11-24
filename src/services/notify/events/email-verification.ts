import type { JWT } from "@fastify/jwt";
import { EmailTemplateName, UserRole } from "need4deed-sdk";
import {
  urlEmailVerification,
  VERIFY_LIFESPAN_MS,
} from "../../../config/constants";
import type User from "../../../data/entity/user.entity";
import logger from "../../../logger";
import { VERIFICATION_BUILTIN as BUILTIN } from "../builtin-content";
import { fillTemplate, resolveFlatContent } from "../email-template";
import { EMAIL_TEMPLATES, EmailTemplateVars } from "../email-templates";
import type { EmailMessage, EmailTransport } from "../types";

export interface EmailVerificationDeps {
  email: EmailTransport;
  jwt: JWT;
}

const { loader } = EMAIL_TEMPLATES[EmailTemplateName.VERIFICATION];

export function resetVerificationTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailVerification(
  { email, jwt }: EmailVerificationDeps,
  user: User,
  ownerAgentId?: number,
): Promise<void> {
  if (!user?.email) {
    throw new Error("User email is required for verification");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "verify",
      ...(ownerAgentId ? { ownerAgentId } : {}),
    },
    { expiresIn: `${VERIFY_LIFESPAN_MS}` },
  );
  const roleParam =
    user.role === UserRole.AGENT || user.role === UserRole.VOLUNTEER
      ? `?role=${user.role}`
      : "";
  const url = `${urlEmailVerification}/${token}${roleParam}`;

  logger.debug(`sendEmailVerification: ${user.email}, url: ${url}`);

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, html, text } = fillTemplate(content, {
    verificationUrl: url,
  } satisfies EmailTemplateVars<EmailTemplateName.VERIFICATION>);

  const message: EmailMessage = {
    to: user.email,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  };

  await email.send(message);
}
