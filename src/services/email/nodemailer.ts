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

export function getMailerConfigForGoogle() {
  return {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GOOGLE_SMTP_USER_EMAIL,
      pass: process.env.GOOGLE_SMTP_APP_PASSWORD,
    },
  };
}
