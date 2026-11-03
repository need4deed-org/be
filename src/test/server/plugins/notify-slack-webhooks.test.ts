import { describe, expect, it } from "vitest";
import {
  dryRunEnvNames,
  isDryRun,
  slackWebhookUrls,
  slackWebhookWarnings,
} from "../../../server/plugins/notify";
import { firstEnvValue } from "../../../server/utils";

describe("slackWebhookUrls", () => {
  it("maps each webhook variable to its channel", () => {
    expect(
      slackWebhookUrls({
        SLACK_OPS_WEBHOOK_URL: "https://hooks.example/ops",
        SLACK_ARRIVALS_WEBHOOK_URL: "https://hooks.example/arrivals",
        SLACK_ACTIVITY_WEBHOOK_URL: "https://hooks.example/activity",
      }),
    ).toEqual({
      ops: "https://hooks.example/ops",
      arrivals: "https://hooks.example/arrivals",
      activity: "https://hooks.example/activity",
    });
  });

  it("leaves out channels without a webhook", () => {
    expect(
      slackWebhookUrls({
        SLACK_ARRIVALS_WEBHOOK_URL: "https://hooks.example/arrivals",
      }),
    ).toEqual({ arrivals: "https://hooks.example/arrivals" });
  });

  it("ignores the retired webhook names", () => {
    expect(
      slackWebhookUrls({
        SLACK_CRON_WEBHOOK_URL: "https://hooks.example/cron",
        SLACK_COMMENTS_WEBHOOK_URL: "https://hooks.example/comments",
      }),
    ).toEqual({});
  });
});

describe("slackWebhookWarnings", () => {
  const live = { NOTIFY_SLACK_DRY_RUN: "false" };

  it("is quiet when every channel has its own webhook", () => {
    expect(
      slackWebhookWarnings({
        ...live,
        SLACK_OPS_WEBHOOK_URL: "https://hooks.example/ops",
        SLACK_ARRIVALS_WEBHOOK_URL: "https://hooks.example/arrivals",
        SLACK_ACTIVITY_WEBHOOK_URL: "https://hooks.example/activity",
      }),
    ).toEqual([]);
  });

  it("names each channel without a webhook", () => {
    expect(
      slackWebhookWarnings({
        ...live,
        SLACK_OPS_WEBHOOK_URL: "https://hooks.example/ops",
      }),
    ).toEqual([
      "notify: SLACK_ARRIVALS_WEBHOOK_URL unset — arrivals Slack notices are dropped",
      "notify: SLACK_ACTIVITY_WEBHOOK_URL unset — activity Slack notices are dropped",
    ]);
  });

  it("is quiet in a Slack dry run", () => {
    expect(slackWebhookWarnings({ NOTIFY_SLACK_DRY_RUN: "true" })).toEqual([]);
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
