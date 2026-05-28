import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import User from "../../data/entity/user.entity";
import {
  createSesClient,
  EmailTransport,
  sendEmailVerification,
  sendOpsAlert,
  SesEmailTransport,
  SlackTransport,
  SlackWebhookTransport,
} from "../../services/notify";

interface NotifyService {
  emailVerification(user: User): Promise<void>;
  opsAlert(text: string): Promise<void>;
}

declare module "fastify" {
  interface FastifyInstance {
    notify: NotifyService;
  }
}

type EmailProvider = "ses";

function buildEmailTransport(): EmailTransport {
  const provider = (process.env.EMAIL_PROVIDER ?? "ses") as EmailProvider;
  switch (provider) {
    case "ses":
      return new SesEmailTransport(createSesClient());
    default:
      throw new Error(`Unsupported email provider: ${provider}`);
  }
}

function buildSlackTransport(): SlackTransport | undefined {
  const opsUrl = process.env.SLACK_WEBHOOK_URL;
  if (!opsUrl) {
    return undefined;
  }
  return new SlackWebhookTransport({ ops: opsUrl });
}

async function notifyPlugin(fastify: FastifyInstance) {
  const email = buildEmailTransport();
  const slack = buildSlackTransport();

  fastify.decorate("notify", {
    emailVerification: (user: User) =>
      sendEmailVerification({ email, jwt: fastify.jwt }, user),
    opsAlert: (text: string) => sendOpsAlert({ slack }, text),
  });
}

export default fp(notifyPlugin, {
  name: "notify",
  dependencies: ["jwt-auth-plugin"],
});
