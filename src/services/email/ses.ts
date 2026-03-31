import { SESv2Client } from "@aws-sdk/client-sesv2";

interface AwsSesConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string; // Optional, for temporary credentials
}

export const sesConfig: AwsSesConfig = {
  region: process.env.AWS_SES_REGION,
  accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
};

let sesClient: SESv2Client | null = null;

export function getSesClient(): SESv2Client {
  if (!sesClient) {
    sesClient = new SESv2Client({
      region: sesConfig.region,
      credentials: {
        accessKeyId: sesConfig.accessKeyId,
        secretAccessKey: sesConfig.secretAccessKey,
        sessionToken: sesConfig.sessionToken, // Optional
      },
    });
  }
  return sesClient;
}
