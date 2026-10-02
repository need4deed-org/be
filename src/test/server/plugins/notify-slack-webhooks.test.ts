import { describe, expect, it } from "vitest";
import { slackWebhookUrls } from "../../../server/plugins/notify";

// Each Slack channel has its own webhook variable (be#1088 adds "cron").
describe("slackWebhookUrls", () => {
  it("maps each webhook variable to its channel", () => {
    expect(
      slackWebhookUrls({
        SLACK_OPS_WEBHOOK_URL: "https://hooks.example/ops",
        SLACK_COMMENTS_WEBHOOK_URL: "https://hooks.example/comments",
        SLACK_CRON_WEBHOOK_URL: "https://hooks.example/cron",
      }),
    ).toEqual({
      ops: "https://hooks.example/ops",
      comments: "https://hooks.example/comments",
      cron: "https://hooks.example/cron",
    });
  });

  it("leaves out channels without a webhook", () => {
    expect(
      slackWebhookUrls({
        SLACK_CRON_WEBHOOK_URL: "https://hooks.example/cron",
      }),
    ).toEqual({ cron: "https://hooks.example/cron" });
  });
});
