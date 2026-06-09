import type { JWT, TokenType } from "@fastify/jwt";
import { Lang } from "need4deed-sdk";
import {
  emailTemplateFetchTimeoutMs,
  emailTemplateTtlMs,
  emailVerificationManifestUrl,
  urlEmailVerification,
} from "../../../config/constants";
import type User from "../../../data/entity/user.entity";
import { fetchJsonFromUrl } from "../../../data/utils";
import logger from "../../../logger";
import type { EmailMessage, EmailTransport } from "../types";

export interface EmailVerificationDeps {
  email: EmailTransport;
  jwt: JWT;
}

interface LocaleContent {
  subject: string;
  html?: string;
  text?: string;
}
type VerificationManifest = Partial<Record<Lang, LocaleContent>>;

const URL_PLACEHOLDER = "{{verificationUrl}}";
const DEFAULT_LOCALE = Lang.EN;

// Built-in fallback used when the CDN manifest is missing/invalid, so a
// verification email always sends (and in the user's language where possible).
const BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Account Created",
    text: `Your account has been created successfully. Please verify your email:\n${URL_PLACEHOLDER}`,
    html: `<p>Your account has been created successfully. Please verify your email:</p><p><a href="${URL_PLACEHOLDER}">${URL_PLACEHOLDER}</a></p>`,
  },
  [Lang.DE]: {
    subject: "Konto erstellt",
    text: `Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail:\n${URL_PLACEHOLDER}`,
    html: `<p>Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail:</p><p><a href="${URL_PLACEHOLDER}">${URL_PLACEHOLDER}</a></p>`,
  },
};

let manifestCache: { value: VerificationManifest; expires: number } | null =
  null;

/** Test-only: drop the cached manifest so each test fetches fresh. */
export function resetVerificationTemplateCache(): void {
  manifestCache = null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Load the email manifest from the CDN, cached in-memory for emailTemplateTtlMs.
 * On any failure, serve the last good value if we have one, else null (→ the
 * caller falls back to BUILTIN). Never throws.
 */
async function loadManifest(): Promise<VerificationManifest | null> {
  const now = Date.now();
  if (manifestCache && now < manifestCache.expires) {
    return manifestCache.value;
  }
  try {
    const value = (await withTimeout(
      fetchJsonFromUrl(emailVerificationManifestUrl),
      emailTemplateFetchTimeoutMs,
    )) as VerificationManifest;
    manifestCache = { value, expires: now + emailTemplateTtlMs };
    return value;
  } catch (err) {
    logger.warn(
      `email verification manifest fetch failed: ${err instanceof Error ? err.message : err}`,
    );
    return manifestCache?.value ?? null; // last-good (stale) or built-in
  }
}

function resolveLocale(language: string | undefined): Lang {
  return language === Lang.DE
    ? Lang.DE
    : language === Lang.EN
      ? Lang.EN
      : DEFAULT_LOCALE;
}

function isValid(content: LocaleContent | undefined): content is LocaleContent {
  return Boolean(content?.subject && (content.html || content.text));
}

function resolveContent(
  manifest: VerificationManifest | null,
  locale: Lang,
): LocaleContent {
  const candidates = [manifest?.[locale], manifest?.[DEFAULT_LOCALE]];
  return candidates.find(isValid) ?? BUILTIN[locale] ?? BUILTIN[DEFAULT_LOCALE];
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

  logger.debug(`sendEmailVerification: ${user.email}`);

  const content = resolveContent(
    await loadManifest(),
    resolveLocale(user.language),
  );
  const fill = (s?: string) => s?.split(URL_PLACEHOLDER).join(url);

  const message: EmailMessage = {
    to: user.email,
    subject: content.subject,
    ...(content.text ? { text: fill(content.text) } : {}),
    ...(content.html ? { html: fill(content.html) } : {}),
  };

  await email.send(message);
}
