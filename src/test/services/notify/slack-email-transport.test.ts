import { describe, expect, it, vi } from "vitest";
import logger from "../../../logger";
import { DryRunSlackTransport } from "../../../services/notify/transports/dry-run";
import {
  htmlToText,
  SlackEmailTransport,
  splitText,
} from "../../../services/notify/transports/slack-email";
import type { SlackMessage } from "../../../services/notify/types";

type Block = {
  type: string;
  text?: { type: string; text: string };
  fields?: { text: string }[];
};

async function post(msg: Parameters<SlackEmailTransport["send"]>[0]) {
  const send = vi.fn(async (_: SlackMessage) => {});
  await new SlackEmailTransport({ send }).send(msg);
  expect(send).toHaveBeenCalledTimes(1);
  const message = send.mock.calls[0][0];
  return { message, blocks: message.blocks as Block[] };
}

const bodyOf = (blocks: Block[]) =>
  blocks.filter((b) => b.type === "section" && b.text).map((b) => b.text!.text);

// be#1088: cron emails are posted to #cron-notifications, not sent.
describe("SlackEmailTransport", () => {
  it("posts header, To/Cc/Subject and the text body to the cron channel", async () => {
    const { message, blocks } = await post({
      to: ["vera@example.com", "max@example.com"],
      cc: "team@example.com",
      subject: "Status <update> & more",
      text: "Hello Vera,\nhow is it going?",
      html: "<p>ignored</p>",
    });

    expect(message.channel).toBe("cron");
    expect(blocks[0]).toEqual({
      type: "header",
      text: { type: "plain_text", text: "Cron email, not sent" },
    });
    expect(blocks[1].fields!.map((f) => f.text)).toEqual([
      "*To*\nvera@example.com, max@example.com",
      "*Cc*\nteam@example.com",
      "*Subject*\nStatus &lt;update&gt; &amp; more",
    ]);
    expect(bodyOf(blocks)).toEqual(["Hello Vera,\nhow is it going?"]);
  });

  it("keeps names out of the message text, which the dry run logs", async () => {
    const { message } = await post({
      to: "vera@example.com",
      subject: "Begleitung für Vera Volunteer",
      text: "Hallo Vera",
    });

    expect(message.text).toBe("Cron email, not sent");
  });

  it("uses the HTML, without tags, when there is no text", async () => {
    const { blocks } = await post({
      to: "vera@example.com",
      subject: "Hi",
      html: "<p>Hello <b>Vera</b>,</p><p>see you &amp; bye</p>",
    });

    expect(bodyOf(blocks)).toEqual(["Hello Vera,\nsee you & bye"]);
  });

  it("splits a long body into sections of at most 3,000 characters", async () => {
    const line = "x".repeat(99);
    const text = Array.from({ length: 100 }, () => line).join("\n");

    const { blocks } = await post({
      to: "a@example.com",
      subject: "Long",
      text,
    });

    const sections = bodyOf(blocks);
    expect(sections.length).toBeGreaterThan(1);
    expect(sections.every((s) => s.length <= 3000)).toBe(true);
    expect(sections.join("\n")).toBe(text);
  });

  it("stays within Slack's 50 blocks, marking the cut", async () => {
    const { blocks } = await post({
      to: "a@example.com",
      subject: "Huge",
      text: "y".repeat(200_000),
    });

    expect(blocks.length).toBeLessThanOrEqual(50);
    expect(bodyOf(blocks).at(-1)).toMatch(/… \(truncated\)$/);
    expect(bodyOf(blocks).every((s) => s.length <= 3000)).toBe(true);
  });

  it("posts nothing through the dry-run Slack transport, logging no names", async () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => logger);

    await new SlackEmailTransport(new DryRunSlackTransport()).send({
      to: "vera@example.com",
      subject: "Begleitung für Vera Volunteer",
      text: "Hallo Vera",
    });

    const logged = JSON.stringify(info.mock.calls);
    expect(logged).toContain("slack suppressed");
    expect(logged).not.toContain("Vera");
    info.mockRestore();
  });
});

describe("splitText", () => {
  it("returns short text as one chunk", () => {
    expect(splitText("short", 3000)).toEqual(["short"]);
  });

  it("cuts at a line break in the chunk's second half", () => {
    const text = `${"a".repeat(70)}\n${"b".repeat(70)}`;
    expect(splitText(text, 100)).toEqual(["a".repeat(70), "b".repeat(70)]);
  });
});

describe("htmlToText", () => {
  it("drops style blocks and turns line breaks into newlines", () => {
    expect(htmlToText("<style>p{color:red}</style>One<br/>Two<br>Three")).toBe(
      "One\nTwo\nThree",
    );
  });
});
