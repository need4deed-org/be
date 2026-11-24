import type { JWT } from "@fastify/jwt";
import { EmailTemplateName } from "need4deed-sdk";
import { RESET_LIFESPAN_MS, urlPasswordReset } from "../../../config/constants";
import type User from "../../../data/entity/user.entity";
import logger from "../../../logger";
import { PASSWORD_RESET_BUILTIN as BUILTIN } from "../builtin-content";
import { fillTemplate, resolveContent, resolveLocale } from "../email-template";
import { EMAIL_TEMPLATES, EmailTemplateVars } from "../email-templates";
import type { EmailMessage, EmailTransport } from "../types";

export interface PasswordResetDeps {
  email: EmailTransport;
  jwt: JWT;
}

const { loader } = EMAIL_TEMPLATES[EmailTemplateName.PASSWORD_RESET];

export function resetPasswordResetTemplateCache(): void {
  loader.resetCache();
}

export async function sendPasswordReset(
  { email, jwt }: PasswordResetDeps,
  user: User,
): Promise<void> {
  if (!user?.email) {
    throw new Error("User email is required for password reset");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "reset",
    },
    { expiresIn: `${RESET_LIFESPAN_MS}` },
  );

  const url = `${urlPasswordReset}?token=${encodeURIComponent(token)}`;

  logger.debug(`sendPasswordReset: ${user.email}, url: ${url}`);

  const content = resolveContent(
    await loader.load(),
    resolveLocale(user.language),
    BUILTIN,
  );
  const { subject, html, text } = fillTemplate(content, {
    resetUrl: url,
  } satisfies EmailTemplateVars<EmailTemplateName.PASSWORD_RESET>);

  const message: EmailMessage = {
    to: user.email,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  };

  await email.send(message);
}
