import { describe, expect, it, vi } from "vitest";
import { sendTagged } from "../../../services/notify/events/tagged";
import type { SlackTransport } from "../../../services/notify/types";

describe("sendTagged", () => {
  const input = {
    authorName: "Alex",
    taggedNames: ["Cora", "Dan"],
    text: "please check",
  };

  it.each([
    ["comment", "a comment"],
    ["post", "a post"],
  ] as const)("posts a %s tag to the comments channel", async (kind, label) => {
    const send = vi.fn();
    await sendTagged({ slack: { send } }, { kind, ...input });

    expect(send).toHaveBeenCalledWith({
      channel: "comments",
      text: `🏷️ *Alex* tagged Cora, Dan in ${label}:\n> please check`,
    });
  });

  it("no-ops without a Slack transport", async () => {
    await expect(
      sendTagged({}, { kind: "post", ...input }),
    ).resolves.toBeUndefined();
  });

  it("swallows a Slack failure", async () => {
    const slack: SlackTransport = {
      send: vi.fn().mockRejectedValue(new Error("webhook down")),
    };
    await expect(
      sendTagged({ slack }, { kind: "comment", ...input }),
    ).resolves.toBeUndefined();
  });
});
