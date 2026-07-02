import type { JWT, TokenType } from "@fastify/jwt";
import { Lang } from "need4deed-sdk";
import {
  emailVerificationManifestUrl,
  urlEmailVerification,
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

export interface EmailVerificationDeps {
  email: EmailTransport;
  jwt: JWT;
}

const BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Account Created",
    text: `Your account has been created successfully. Please verify your email:\n{{verificationUrl}}`,
    html: `<p>Your account has been created successfully. Please verify your email:</p><p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>`,
  },
  [Lang.DE]: {
    subject: "Konto erstellt",
    text: `Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail:\n{{verificationUrl}}`,
    html: `<p>Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail:</p><p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>`,
  },
};

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
  const url = `${urlEmailVerification}/${token}`;

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
