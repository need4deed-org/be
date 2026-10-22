import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { errorEmailRecipient, TRUTHY } from "../../config/constants";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import User from "../../data/entity/user.entity";
import logger from "../../logger";
import {
  CgcApplicationEmailInput,
  CRON_EMAIL_DRY_RUN,
  CRON_EMAIL_SENT,
  DryRunEmailTransport,
  DryRunSlackTransport,
  EmailTaggedInput,
  EmailTransport,
  RegistrationEmailRecipient,
  sendEmailAccompanyMatch,
  sendEmailAccompanyMatchVolunteer,
  sendEmailAccompanyNotFound,
  sendEmailCgcApplication,
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

type MatchEmail = (
  ov: OpportunityVolunteer,
  emailNote?: string,
) => Promise<void>;

interface NotifyService {
  emailVerification(user: User): Promise<void>;
  passwordReset(user: User): Promise<void>;
  opsAlert(text: string): Promise<void>;
  tagged(input: TaggedInput): Promise<void>;
  emailSuggestion: MatchEmail;
  emailSuggestionAccompanying: MatchEmail;
  emailIntroduction: MatchEmail;
  emailAccompanyMatch: MatchEmail;
  emailAccompanyMatchVolunteer(ov: OpportunityVolunteer): Promise<void>;
  emailNewRegular(opportunity: Opportunity): Promise<void>;
  emailNewAccompanying(opportunity: Opportunity): Promise<void>;
  emailRegistration(volunteer: RegistrationEmailRecipient): Promise<void>;
  emailTagged(input: EmailTaggedInput): Promise<void>;
  emailCgcApplication(input: CgcApplicationEmailInput): Promise<void>;
}

export type EmailDelivery = "sent" | "dry-run";

interface CronNotifyService {
  emailStale(ov: OpportunityVolunteer): Promise<void>;
  emailPostMatchCheckup(ov: OpportunityVolunteer): Promise<void>;
  emailAccompanyNotFound(opportunity: Opportunity): Promise<EmailDelivery>;
  emailRegularUpdate(opportunity: Opportunity): Promise<void>;
}

declare module "fastify" {
  interface FastifyInstance {
    notify: NotifyService;
    cronNotify: CronNotifyService;
  }
}

export function dryRunEnvNames(transportKey: string): string[] {
  return [`NOTIFY_${transportKey}_DRY_RUN`, "NOTIFY_DRY_RUN"];
}

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
  return new ValidatingEmailTransport(deliverable, smtp, errorEmailRecipient);
}

function buildNotifyEmailTransport(): {
  validating: (rejectSuspended?: boolean) => EmailTransport;
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
    validating: (rejectSuspended = false) =>
      new ValidatingEmailTransport(
        deliverable,
        smtp,
        errorEmailRecipient,
        rejectSuspended,
      ),
    raw: smtp,
  };
}

const SLACK_WEBHOOK_ENV: Record<SlackChannel, string> = {
  ops: "SLACK_OPS_WEBHOOK_URL",
  comments: "SLACK_COMMENTS_WEBHOOK_URL",
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

export function cronSlackTransport(
  slack: SlackTransport | undefined,
  env: Env = process.env,
): SlackTransport | undefined {
  if (slack && (isDryRun("SLACK", env) || slackWebhookUrls(env).cron)) {
    return slack;
  }
  logger.warn(
    "notify: SLACK_CRON_WEBHOOK_URL unset — cron emails are not posted to #cron-notifications; accompany-not-found is still emailed, with no Slack record",
  );
  return undefined;
}

export function buildCronEmailTransport(
  cronSlack: SlackTransport | undefined,
  header?: string,
): EmailTransport {
  return cronSlack
    ? new SlackEmailTransport(cronSlack, header)
    : { send: async () => {} };
}

export function emailedCronHeader(env: Env = process.env): string {
  return isDryRun("EMAIL", env) ? CRON_EMAIL_DRY_RUN : CRON_EMAIL_SENT;
}

export function emailThenRecord(
  email: EmailTransport,
  record: EmailTransport,
): EmailTransport {
  return {
    send: async (msg) => {
      await email.send(msg);
      await record.send(msg).catch((err) => {
        logger.error(
          `notify: email sent but not posted to #cron-notifications: ${err}`,
        );
      });
    },
  };
}

async function notifyPlugin(fastify: FastifyInstance) {
  const emailVerify = buildVerifyEmailTransport();
  const { validating: validatingNotify, raw: emailNotifyRaw } =
    buildNotifyEmailTransport();
  const emailNotify = validatingNotify();
  const emailNotifyRejecting = validatingNotify(true);
  const slack = buildSlackTransport();
  const matchEmail =
    (send: typeof sendEmailSuggestion): MatchEmail =>
    (ov, emailNote) =>
      send(
        emailNote ? emailNotifyRejecting : emailNotify,
        ov,
        emailNotifyRaw,
        emailNote,
      );

  fastify.decorate("notify", {
    emailVerification: (user: User) =>
      sendEmailVerification({ email: emailVerify, jwt: fastify.jwt }, user),
    passwordReset: (user: User) =>
      sendPasswordReset({ email: emailVerify, jwt: fastify.jwt }, user),
    opsAlert: (text: string) => sendOpsAlert({ slack }, text),
    tagged: (input: TaggedInput) => sendTagged({ slack }, input),
    emailSuggestion: matchEmail(sendEmailSuggestion),
    emailSuggestionAccompanying: matchEmail(sendEmailSuggestionAccompanying),
    emailIntroduction: matchEmail(sendEmailIntroduction),
    emailAccompanyMatch: matchEmail(sendEmailAccompanyMatch),
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
    emailCgcApplication: (input: CgcApplicationEmailInput) =>
      sendEmailCgcApplication(emailNotifyRejecting, input),
  });

  const cronSlack = cronSlackTransport(slack);
  const emailDelivery: EmailDelivery = isDryRun("EMAIL") ? "dry-run" : "sent";
  const cronEmail = buildCronEmailTransport(cronSlack);
  const cronEmailSent = emailThenRecord(
    validatingNotify(true),
    buildCronEmailTransport(cronSlack, emailedCronHeader()),
  );
  fastify.decorate("cronNotify", {
    emailStale: (ov: OpportunityVolunteer) => sendEmailStale(cronEmail, ov),
    emailPostMatchCheckup: (ov: OpportunityVolunteer) =>
      sendEmailPostMatchCheckup(cronEmail, ov),
    emailAccompanyNotFound: async (opportunity: Opportunity) => {
      await sendEmailAccompanyNotFound(cronEmailSent, opportunity);
      return emailDelivery;
    },
    emailRegularUpdate: (opportunity: Opportunity) =>
      sendEmailRegularUpdate(cronEmail, opportunity),
  });
}

export default fp(notifyPlugin, {
  name: "notify",
  dependencies: ["jwt-auth-plugin"],
});
