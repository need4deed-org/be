import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { FastifyMailerOptions } from "fastify-mailer";

import { defaultFrom } from "../../config/constants";

export function getMailerConfigForSES(
  sesClient: SESv2Client,
): FastifyMailerOptions {
  return {
    transport: {
      SES: {
        sesClient,
        SendEmailCommand,
      },
    },
    defaults: { from: defaultFrom },
  };
}
