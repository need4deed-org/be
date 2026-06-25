import type { JWT } from "@fastify/jwt";
import { Lang } from "need4deed-sdk";
import {
  emailPasswordResetManifestUrl,
  RESET_LIFESPAN_MS,
  urlPasswordReset,
} from "../../../config/constants";
import type User from "../../../data/entity/user.entity";
import logger from "../../../logger";
import {
  createManifestLoader,
  fillTemplate,
  resolveContent,
  resolveLocale,
  type LocaleContent,
} from "../email-template";
import type { EmailMessage, EmailTransport } from "../types";

export interface PasswordResetDeps {
  email: EmailTransport;
  jwt: JWT;
}

const BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Password Reset",
    text: `A password reset has been requested for your account. To reset your password, follow this link:\n{{resetUrl}}\n\nIf you did not request this, please ignore this email.`,
    html: `<p>A password reset has been requested for your account.</p>\n<p><a href="{{resetUrl}}">Reset your password</a></p>\n<p>If you did not request this, please ignore this email.</p>`,
  },
  [Lang.DE]: {
    subject: "Passwort zurücksetzen",
    text: `Es wurde ein Zurücksetzen des Passworts für dein Konto angefordert. Um dein Passwort zurückzusetzen, folge diesem Link:\n{{resetUrl}}\n\nFalls du dies nicht angefordert hast, ignoriere diese E-Mail bitte.`,
    html: `<p>Es wurde ein Zurücksetzen des Passworts für dein Konto angefordert.</p>\n<p><a href="{{resetUrl}}">Passwort zurücksetzen</a></p>\n<p>Falls du dies nicht angefordert hast, ignoriere diese E-Mail bitte.</p>`,
  },
};

const loader = createManifestLoader(emailPasswordResetManifestUrl);

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
  });

  const message: EmailMessage = {
    to: user.email,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  };

  await email.send(message);
}
