import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { errorEmailRecipient, TRUTHY } from "../../config/constants";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import User from "../../data/entity/user.entity";
import logger from "../../logger";
import {
  DryRunEmailTransport,
  DryRunSlackTransport,
  EmailTaggedInput,
  EmailTransport,
  RegistrationEmailRecipient,
  sendEmailAccompanyMatch,
  sendEmailAccompanyMatchVolunteer,
  sendEmailAccompanyNotFound,
  sendEmailIntroduction,
  sendEmailNewAccompanying,
  sendEmailNewRegular,
  sendEmailPostMatchCheckup,
  sendEmailRegistration,
  sendEmailRegularUpdate,
  sendEmailStale,
  sendEmailSuggestion,
  sendEmailSuggestionAccompanying,
  sendEmailTagged,
  sendEmailVerification,
  sendOpsAlert,
  sendPasswordReset,
  sendTagged,
  SlackChannel,
  SlackEmailTransport,
  SlackTransport,
  SlackWebhookTransport,
  SmtpEmailTransport,
  TaggedInput,
  ValidatingEmailTransport,
} from "../../services/notify";
import { Env, firstEnvValue } from "../utils";

interface NotifyService {
  emailVerification(user: User): Promise<void>;
  passwordReset(user: User): Promise<void>;
  opsAlert(text: string): Promise<void>;
  tagged(input: TaggedInput): Promise<void>;
  emailSuggestion(ov: OpportunityVolunteer): Promise<void>;
  emailSuggestionAccompanying(ov: OpportunityVolunteer): Promise<void>;
  emailIntroduction(ov: OpportunityVolunteer): Promise<void>;
  emailAccompanyMatch(ov: OpportunityVolunteer): Promise<void>;
  emailAccompanyMatchVolunteer(ov: OpportunityVolunteer): Promise<void>;
  emailNewRegular(opportunity: Opportunity): Promise<void>;
  emailNewAccompanying(opportunity: Opportunity): Promise<void>;
  emailRegistration(volunteer: RegistrationEmailRecipient): Promise<void>;
  emailTagged(input: EmailTaggedInput): Promise<void>;
}

// The cron jobs' emails (be#1088): posted to Slack #cron-notifications for
// coordinators, never sent.
interface CronNotifyService {
  emailStale(ov: OpportunityVolunteer): Promise<void>;
  emailPostMatchCheckup(ov: OpportunityVolunteer): Promise<void>;
  emailAccompanyNotFound(opportunity: Opportunity): Promise<void>;
  emailRegularUpdate(opportunity: Opportunity): Promise<void>;
}

declare module "fastify" {
  interface FastifyInstance {
    notify: NotifyService;
    cronNotify: CronNotifyService;
  }
}

/** The variables that switch a transport (e.g. "EMAIL", "SLACK") to a dry
 *  run, most specific first. */
export function dryRunEnvNames(transportKey: string): string[] {
  return [`NOTIFY_${transportKey}_DRY_RUN`, "NOTIFY_DRY_RUN"];
}

/** Whether a transport runs dry in `env`: the first of its variables that
 *  is set decides; without any, everywhere but production. */
export function isDryRun(
  transportKey: string,
  env: Env = process.env,
): boolean {
  const value = firstEnvValue(env, dryRunEnvNames(transportKey));
  return value === undefined
    ? env.NODE_ENV !== "production"
    : TRUTHY.has(value);
}

function buildVerifyEmailTransport(): EmailTransport {
  const smtp = new SmtpEmailTransport({
    host: process.env.SMTP_HOST ?? "mail.infomaniak.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASS ?? "",
  });
  const deliverable = isDryRun("EMAIL") ? new DryRunEmailTransport(smtp) : smtp;
  // Error reports bypass dry-run (always the raw `smtp`, never `deliverable`)
  // — an invalid-content alert must actually reach someone regardless of
  // environment, it's not end-user-facing content.
  return new ValidatingEmailTransport(deliverable, smtp, errorEmailRecipient);
}

function buildNotifyEmailTransport(): {
  deliverable: EmailTransport;
  // The raw, un-dry-run-wrapped SMTP client — for alerts that must actually
  // reach someone regardless of environment, same rationale as
  // ValidatingEmailTransport's errorTransport just below (be#847).
  raw: EmailTransport;
} {
  const smtp = new SmtpEmailTransport({
    host: process.env.SMTP_NOTIFY_HOST ?? "mail.infomaniak.com",
    port: Number(process.env.SMTP_NOTIFY_PORT ?? 587),
    user: process.env.SMTP_NOTIFY_USER ?? "",
    password: process.env.SMTP_NOTIFY_PASS ?? "",
    from: process.env.EMAIL_FROM_NOTIFY ?? "",
  });
  const deliverable = isDryRun("EMAIL") ? new DryRunEmailTransport(smtp) : smtp;
  return {
    deliverable: new ValidatingEmailTransport(
      deliverable,
      smtp,
      errorEmailRecipient,
    ),
    raw: smtp,
  };
}

// A Slack incoming webhook is tied to one channel, so each channel has its
// own variable.
const SLACK_WEBHOOK_ENV: Record<SlackChannel, string> = {
  ops: "SLACK_OPS_WEBHOOK_URL",
  comments: "SLACK_COMMENTS_WEBHOOK_URL",
  // #cron-notifications (C0C3A594KHT), be#1088.
  cron: "SLACK_CRON_WEBHOOK_URL",
};

export function slackWebhookUrls(
  env: Env = process.env,
): Partial<Record<SlackChannel, string>> {
  const urls: Partial<Record<SlackChannel, string>> = {};
  for (const [channel, name] of Object.entries(SLACK_WEBHOOK_ENV)) {
    if (env[name]) {
      urls[channel as SlackChannel] = env[name];
    }
  }
  return urls;
}

function buildSlackTransport(): SlackTransport | undefined {
  if (isDryRun("SLACK")) {
    return new DryRunSlackTransport();
  }

  const urls = slackWebhookUrls();
  if (Object.keys(urls).length === 0) {
    return undefined;
  }
  return new SlackWebhookTransport(urls);
}

/**
 * Where the cron jobs' emails go (be#1088): Slack #cron-notifications, or
 * nowhere — never to the recipients. Without SLACK_CRON_WEBHOOK_URL (e.g.
 * locally) they're dropped, with one warning at startup.
 */
export function buildCronEmailTransport(
  slack: SlackTransport | undefined,
  env: Env = process.env,
): EmailTransport {
  if (slack && (isDryRun("SLACK", env) || slackWebhookUrls(env).cron)) {
    return new SlackEmailTransport(slack);
  }
  logger.warn(
    "notify: SLACK_CRON_WEBHOOK_URL unset — the cron jobs' emails are neither posted nor sent (be#1088)",
  );
  return { send: async () => {} };
}

async function notifyPlugin(fastify: FastifyInstance) {
  const emailVerify = buildVerifyEmailTransport();
  const { deliverable: emailNotify, raw: emailNotifyRaw } =
    buildNotifyEmailTransport();
  const slack = buildSlackTransport();

  fastify.decorate("notify", {
    emailVerification: (user: User) =>
      sendEmailVerification({ email: emailVerify, jwt: fastify.jwt }, user),
    passwordReset: (user: User) =>
      sendPasswordReset({ email: emailVerify, jwt: fastify.jwt }, user),
    opsAlert: (text: string) => sendOpsAlert({ slack }, text),
    tagged: (input: TaggedInput) => sendTagged({ slack }, input),
    emailSuggestion: (ov: OpportunityVolunteer) =>
      sendEmailSuggestion(emailNotify, ov, emailNotifyRaw),
    emailSuggestionAccompanying: (ov: OpportunityVolunteer) =>
      sendEmailSuggestionAccompanying(emailNotify, ov, emailNotifyRaw),
    emailIntroduction: (ov: OpportunityVolunteer) =>
      sendEmailIntroduction(emailNotify, ov, emailNotifyRaw),
    emailAccompanyMatch: (ov: OpportunityVolunteer) =>
      sendEmailAccompanyMatch(emailNotify, ov, emailNotifyRaw),
    emailAccompanyMatchVolunteer: (ov: OpportunityVolunteer) =>
      sendEmailAccompanyMatchVolunteer(emailNotify, ov, emailNotifyRaw),
    emailNewRegular: (opportunity: Opportunity) =>
      sendEmailNewRegular(emailNotify, opportunity),
    emailNewAccompanying: (opportunity: Opportunity) =>
      sendEmailNewAccompanying(emailNotify, opportunity, emailNotifyRaw),
    emailRegistration: (volunteer: RegistrationEmailRecipient) =>
      sendEmailRegistration(emailNotify, volunteer),
    emailTagged: (input: EmailTaggedInput) =>
      sendEmailTagged(emailNotify, input),
  });

  const cronEmail = buildCronEmailTransport(slack);
  fastify.decorate("cronNotify", {
    emailStale: (ov: OpportunityVolunteer) => sendEmailStale(cronEmail, ov),
    emailPostMatchCheckup: (ov: OpportunityVolunteer) =>
      sendEmailPostMatchCheckup(cronEmail, ov),
    emailAccompanyNotFound: (opportunity: Opportunity) =>
      sendEmailAccompanyNotFound(cronEmail, opportunity),
    emailRegularUpdate: (opportunity: Opportunity) =>
      sendEmailRegularUpdate(cronEmail, opportunity),
  });
}

export default fp(notifyPlugin, {
  name: "notify",
  dependencies: ["jwt-auth-plugin"],
});
