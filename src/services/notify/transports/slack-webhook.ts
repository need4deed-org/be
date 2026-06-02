import type { SlackChannel, SlackMessage, SlackTransport } from "../types";

export class SlackWebhookTransport implements SlackTransport {
  constructor(
    private readonly webhookUrls: Partial<Record<SlackChannel, string>>,
  ) {}

  async send(msg: SlackMessage): Promise<void> {
    const url = this.webhookUrls[msg.channel];
    if (!url) {
      throw new Error(
        `No Slack webhook configured for channel: ${msg.channel}`,
      );
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: msg.text, blocks: msg.blocks }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Slack webhook ${msg.channel} failed (${res.status}): ${body}`,
      );
    }
  }
}
