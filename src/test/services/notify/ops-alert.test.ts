import { describe, expect, it, vi } from "vitest";
import {
  sendArrival,
  sendOpsAlert,
} from "../../../services/notify/events/ops-alert";
import type { SlackTransport } from "../../../services/notify/types";

describe.each([
  ["sendOpsAlert", sendOpsAlert, "ops"],
  ["sendArrival", sendArrival, "arrivals"],
] as const)("%s", (_, send, channel) => {
  it(`posts to the ${channel} channel`, async () => {
    const slack = { send: vi.fn() };
    await send({ slack }, "hello");

    expect(slack.send).toHaveBeenCalledWith({ channel, text: "hello" });
  });

  it("no-ops without a Slack transport", async () => {
    await expect(send({}, "hello")).resolves.toBeUndefined();
  });

  it("swallows a Slack failure", async () => {
    const slack: SlackTransport = {
      send: vi.fn().mockRejectedValue(new Error("webhook down")),
    };
    await expect(send({ slack }, "hello")).resolves.toBeUndefined();
  });
});
