import { afterEach, describe, expect, it, vi } from "vitest";
import logger from "../../../logger";
import {
  DryRunEmailTransport,
  DryRunSlackTransport,
} from "../../../services/notify/transports/dry-run";

// be#1102: addresses, subjects and Slack texts are personal data; the dry-run
// log says what happened without them.
describe("dry-run transports", () => {
  const info = vi.spyOn(logger, "info").mockImplementation(() => logger);
  const logged = () => JSON.stringify(info.mock.calls);

  afterEach(() => {
    info.mockClear();
  });

  it("redirects an email, logging counts but no addresses or subject", async () => {
    const real = { send: vi.fn() };

    await new DryRunEmailTransport(real).send({
      to: ["vera@example.com", "max@example.com"],
      cc: "team@example.com",
      subject: "Begleitung für Vera Volunteer",
      text: "Hallo",
    });

    const redirected = real.send.mock.calls[0][0];
    expect(redirected.to).toBe("test@need4deed.org");
    expect(redirected.subject).toContain("vera@example.com");
    expect(logged()).toContain("2 recipient(s), 1 cc");
    for (const secret of ["vera@", "max@", "team@", "Vera Volunteer"]) {
      expect(logged()).not.toContain(secret);
    }
  });

  it("keeps attachments on a redirected email", async () => {
    const real = { send: vi.fn() };
    const attachments = [
      {
        filename: "form.pdf",
        content: Buffer.from("%PDF-1.4"),
        contentType: "application/pdf",
      },
    ];

    await new DryRunEmailTransport(real).send({
      to: "vera@example.com",
      subject: "Form",
      text: "Attached.",
      attachments,
    });

    expect(real.send.mock.calls[0][0].attachments).toBe(attachments);
  });

  it("drops reply-to on a redirected email, keeping it in the subject", async () => {
    const real = { send: vi.fn() };

    await new DryRunEmailTransport(real).send({
      to: "vera@example.com",
      replyTo: ["cora@example.com", "team@example.com"],
      subject: "Form",
      text: "Attached.",
    });

    const redirected = real.send.mock.calls[0][0];
    expect(redirected.replyTo).toBeUndefined();
    expect(redirected.subject).toBe(
      "[TO: vera@example.com REPLY-TO: cora@example.com, team@example.com] Form",
    );
  });

  it("suppresses a Slack message, logging the channel but not the text", async () => {
    await new DryRunSlackTransport().send({
      channel: "comments",
      text: "Vera Volunteer tagged you",
    });

    expect(logged()).toContain("channel: comments");
    expect(logged()).not.toContain("Vera");
  });
});
