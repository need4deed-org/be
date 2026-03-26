import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { FastifyInstance } from "fastify";
import { FastifyMailer, FastifyMailerOptions } from "fastify-mailer";
import fp from "fastify-plugin";
import { SendMailOptions } from "nodemailer"; // Nodemailer types
import logger from "../../logger";
import { getSesClient } from "../../services/email/ses";

type SupportedTransport = "ses";

interface EmailPluginOptions extends FastifyMailerOptions {
  provider: SupportedTransport;
  defaultFrom?: string; // Optional default 'from' address
}

declare module "fastify" {
  interface FastifyInstance {
    mailer: FastifyMailer;
    emailService: {
      send: (mailOptions: SendMailOptions) => Promise<unknown>;
    };
  }
}

async function emailPlugin(
  fastify: FastifyInstance,
  options: EmailPluginOptions,
) {
  let _nodemailerTransportConfig: FastifyMailerOptions["transport"];

  switch (options.provider) {
    case "ses": {
      const sesClient = getSesClient();
      _nodemailerTransportConfig = {
        SES: {
          ses: sesClient,
          SendEmailCommand,
        },
      };
      break;
    }
    default:
      throw new Error(`Unsupported email provider type: ${options.provider}`);
  }

  fastify.decorate("emailService", {
    send: async (mailOptions: SendMailOptions) => {
      if (!mailOptions.from && options.defaultFrom) {
        mailOptions.from = options.defaultFrom;
      }

      try {
        const info = await fastify.mailer.sendMail(mailOptions);
        logger.info(`Email sent: ${info.messageId}`);
        return info;
      } catch (error) {
        logger.error(`Failed to send email: ${error.message}`);
      }
    },
  });
}

export default fp(emailPlugin, {
  name: "email-service",
  dependencies: ["fastify-mailer"], // Ensure fastify-mailer is loaded before this plugin
});
