import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import User from "../../data/entity/user.entity";
import {
  BrevoEmailTransport,
  CommentTaggedInput,
  EmailTransport,
  sendCommentTagged,
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
}

declare module "fastify" {
  interface FastifyInstance {
    notify: NotifyService;
  }
}

function buildEmailTransport(): EmailTransport {
  return new BrevoEmailTransport(process.env.BREVO_API_KEY ?? "");
}

function buildSlackTransport(): SlackTransport | undefined {
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
  });
}

export default fp(notifyPlugin, {
  name: "notify",
  dependencies: ["jwt-auth-plugin"],
});
