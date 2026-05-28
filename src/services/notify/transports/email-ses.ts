import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { defaultFrom } from "../../../config/constants";
import type { EmailMessage, EmailTransport } from "../types";

export class SesEmailTransport implements EmailTransport {
  constructor(private readonly client: SESv2Client) {}

  async send(msg: EmailMessage): Promise<void> {
    const configurationSet = process.env.AWS_SES_CONFIGURATION_SET;
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
      ...(configurationSet ? { ConfigurationSetName: configurationSet } : {}),
    });
    await this.client.send(cmd);
  }
}

export function createSesClient(): SESv2Client {
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  // In ECS, static keys would override the task role and break SES auth.
  // Only set them locally (dev / LocalStack); otherwise let the SDK's
  // default credential provider chain resolve them.
  const credentials =
    accessKeyId && secretAccessKey
      ? { accessKeyId, secretAccessKey }
      : undefined;
  const endpoint = process.env.AWS_SES_ENDPOINT;

  return new SESv2Client({
    region: process.env.AWS_SES_REGION,
    credentials,
    ...(endpoint ? { endpoint } : {}),
  });
}
