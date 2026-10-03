import { describe, expect, it } from "vitest";
import {
  dryRunEnvNames,
  isDryRun,
  slackWebhookUrls,
} from "../../../server/plugins/notify";
import { firstEnvValue } from "../../../server/utils";

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

describe("dryRunEnvNames", () => {
  it("lists the transport's own variable before the global one", () => {
    expect(dryRunEnvNames("SLACK")).toEqual([
      "NOTIFY_SLACK_DRY_RUN",
      "NOTIFY_DRY_RUN",
    ]);
  });
});

describe("firstEnvValue", () => {
  it("returns the first variable that is set, even if empty", () => {
    expect(firstEnvValue({ B: "b", C: "c" }, ["A", "B", "C"])).toBe("b");
    expect(firstEnvValue({ A: "", B: "b" }, ["A", "B"])).toBe("");
    expect(firstEnvValue({}, ["A"])).toBeUndefined();
  });
});

describe("isDryRun", () => {
  it("lets the transport's variable win over the global one", () => {
    expect(
      isDryRun("SLACK", {
        NOTIFY_SLACK_DRY_RUN: "false",
        NOTIFY_DRY_RUN: "true",
      }),
    ).toBe(false);
    expect(isDryRun("SLACK", { NOTIFY_DRY_RUN: "true" })).toBe(true);
  });

  it("defaults to a dry run everywhere but production", () => {
    expect(isDryRun("EMAIL", { NODE_ENV: "development" })).toBe(true);
    expect(isDryRun("EMAIL", { NODE_ENV: "production" })).toBe(false);
  });
});
