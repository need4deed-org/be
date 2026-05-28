import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { defaultFrom } from "../../../config/constants";
import type { EmailMessage, EmailTransport } from "../types";

export class SesEmailTransport implements EmailTransport {
  constructor(private readonly client: SESv2Client) {}

  async send(msg: EmailMessage): Promise<void> {
    const cmd = new SendEmailCommand({
      FromEmailAddress: msg.from ?? defaultFrom,
      Destination: { ToAddresses: [msg.to] },
      Content: {
        Simple: {
          Subject: { Data: msg.subject },
          Body: {
            ...(msg.text ? { Text: { Data: msg.text } } : {}),
            ...(msg.html ? { Html: { Data: msg.html } } : {}),
          },
        },
      },
    });
    await this.client.send(cmd);
  }
}

export function createSesClient(): SESv2Client {
  return new SESv2Client({
    region: process.env.AWS_SES_REGION,
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
    },
  });
}
