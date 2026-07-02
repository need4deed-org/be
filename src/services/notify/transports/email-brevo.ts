import { defaultFrom, isDev, isStaging } from "../../../config/constants";
import type { EmailMessage, EmailTransport } from "../types";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Transactional email via Brevo's REST API
 * (https://developers.brevo.com/reference/sendtransacemail). The sender must be
 * a Brevo-verified sender/domain. Uses global fetch (Node 18+), so no SDK
 * dependency is needed.
 */
export class BrevoEmailTransport implements EmailTransport {
  constructor(private readonly apiKey: string) {}

  async send(msg: EmailMessage): Promise<void> {
    if (!this.apiKey) {
      throw new Error("BREVO_API_KEY is not configured");
    }

    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: msg.from ?? defaultFrom },
        to: (Array.isArray(msg.to) ? msg.to : [msg.to]).map((email) => ({
          email,
        })),
        ...(isDev || isStaging
          ? {
              bcc: [
                { email: "dev@need4deed.org" },
                { email: "info@need4deed.org" },
              ],
            }
          : {}), // for monitoring/logging; not user-facing
        subject: msg.subject,
        ...(msg.html ? { htmlContent: msg.html } : {}),
        ...(msg.text ? { textContent: msg.text } : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`Brevo email failed (${res.status})`);
    }
  }
}
