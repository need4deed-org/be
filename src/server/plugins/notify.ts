import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { isProd, TRUTHY } from "../../config/constants";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import User from "../../data/entity/user.entity";
import {
  BrevoEmailTransport,
  CommentTaggedInput,
  DryRunEmailTransport,
  DryRunSlackTransport,
  EmailTransport,
  sendCommentTagged,
  sendEmailAccompanyMatch,
  sendEmailAccompanyNotFound,
  sendEmailIntroduction,
  sendEmailNewAccompanying,
  sendEmailNewRegular,
  sendEmailPostMatchCheckup,
  sendEmailRegularUpdate,
  sendEmailStale,
  sendEmailSuggestion,
  sendEmailVerification,
  sendOpsAlert,
  sendPasswordReset,
  SlackChannel,
  SlackTransport,
  SlackWebhookTransport,
} from "../../services/notify";

interface NotifyService {
  emailVerification(user: User): Promise<void>;
  passwordReset(user: User): Promise<void>;
  opsAlert(text: string): Promise<void>;
  commentTagged(input: CommentTaggedInput): Promise<void>;
  emailSuggestion(ov: OpportunityVolunteer): Promise<void>;
  emailStale(ov: OpportunityVolunteer): Promise<void>;
  emailIntroduction(ov: OpportunityVolunteer): Promise<void>;
  emailPostMatchCheckup(ov: OpportunityVolunteer): Promise<void>;
  emailAccompanyNotFound(opportunity: Opportunity): Promise<void>;
  emailAccompanyMatch(ov: OpportunityVolunteer): Promise<void>;
  emailRegularUpdate(opportunity: Opportunity): Promise<void>;
  emailNewRegular(opportunity: Opportunity): Promise<void>;
  emailNewAccompanying(opportunity: Opportunity): Promise<void>;
}

declare module "fastify" {
  interface FastifyInstance {
    notify: NotifyService;
  }
}

/** Resolve dry-run flag for a given transport key (e.g. "EMAIL", "SLACK").
 *  Priority: per-transport env > global env > default (!isProd). */
function isDryRun(transportKey: string): boolean {
  const perTransport = process.env[`NOTIFY_${transportKey}_DRY_RUN`];
  if (perTransport !== undefined) {
    return TRUTHY.has(perTransport);
  }

  const global = process.env.NOTIFY_DRY_RUN;
  if (global !== undefined) {
    return TRUTHY.has(global);
  }

  return !isProd;
}

function buildEmailTransport(): EmailTransport {
  if (isDryRun("EMAIL")) {
    return new DryRunEmailTransport();
  }
  return new BrevoEmailTransport(process.env.BREVO_API_KEY ?? "");
}

function buildSlackTransport(): SlackTransport | undefined {
  if (isDryRun("SLACK")) {
    return new DryRunSlackTransport();
  }

  const urls: Partial<Record<SlackChannel, string>> = {};
  if (process.env.SLACK_OPS_WEBHOOK_URL) {
    urls.ops = process.env.SLACK_OPS_WEBHOOK_URL;
  }
  if (process.env.SLACK_COMMENTS_WEBHOOK_URL) {
    urls.comments = process.env.SLACK_COMMENTS_WEBHOOK_URL;
  }
  if (Object.keys(urls).length === 0) {
    return undefined;
  }
  return new SlackWebhookTransport(urls);
}

async function notifyPlugin(fastify: FastifyInstance) {
  const email = buildEmailTransport();
  const slack = buildSlackTransport();

  fastify.decorate("notify", {
    emailVerification: (user: User) =>
      sendEmailVerification({ email, jwt: fastify.jwt }, user),
    passwordReset: (user: User) =>
      sendPasswordReset({ email, jwt: fastify.jwt }, user),
    opsAlert: (text: string) => sendOpsAlert({ slack }, text),
    commentTagged: (input: CommentTaggedInput) =>
      sendCommentTagged({ slack }, input),
    emailSuggestion: (ov: OpportunityVolunteer) =>
      sendEmailSuggestion(email, ov),
    emailStale: (ov: OpportunityVolunteer) => sendEmailStale(email, ov),
    emailIntroduction: (ov: OpportunityVolunteer) =>
      sendEmailIntroduction(email, ov),
    emailPostMatchCheckup: (ov: OpportunityVolunteer) =>
      sendEmailPostMatchCheckup(email, ov),
    emailAccompanyNotFound: (opportunity: Opportunity) =>
      sendEmailAccompanyNotFound(email, opportunity),
    emailAccompanyMatch: (ov: OpportunityVolunteer) =>
      sendEmailAccompanyMatch(email, ov),
    emailRegularUpdate: (opportunity: Opportunity) =>
      sendEmailRegularUpdate(email, opportunity),
    emailNewRegular: (opportunity: Opportunity) =>
      sendEmailNewRegular(email, opportunity),
    emailNewAccompanying: (opportunity: Opportunity) =>
      sendEmailNewAccompanying(email, opportunity),
  });
}

export default fp(notifyPlugin, {
  name: "notify",
  dependencies: ["jwt-auth-plugin"],
});
