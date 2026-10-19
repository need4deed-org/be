import { beforeEach, describe, expect, it, vi } from "vitest";
import { SmtpEmailTransport } from "../../../services/notify/transports/email-smtp";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const transport = new SmtpEmailTransport({
  host: "smtp.example.com",
  port: 587,
  user: "user",
  password: "pass",
  from: "notify@example.com",
});

describe("SmtpEmailTransport", () => {
  beforeEach(() => {
    sendMail.mockReset();
  });

  it("passes attachments through to nodemailer", async () => {
    const attachment = {
      filename: "form.pdf",
      content: Buffer.from("%PDF-1.4"),
      contentType: "application/pdf",
    };

    await transport.send({
      to: "vera@example.com",
      subject: "Form",
      text: "Attached.",
      attachments: [attachment],
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [attachment] }),
    );
  });

  it("passes replyTo through to nodemailer", async () => {
    await transport.send({
      to: "vera@example.com",
      replyTo: ["cora@example.com", "team@example.com"],
      subject: "Hi",
      text: "Hello",
    });

    expect(sendMail.mock.calls[0][0].replyTo).toEqual([
      "cora@example.com",
      "team@example.com",
    ]);
  });

  it("sends no attachments key when there are none", async () => {
    await transport.send({
      to: "vera@example.com",
      subject: "Hi",
      text: "Hello",
    });

    expect(sendMail.mock.calls[0][0]).not.toHaveProperty("attachments");
  });
});
