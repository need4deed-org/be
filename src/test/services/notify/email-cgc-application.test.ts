import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cgcApplicationFormFileName,
  emailFromCommunity,
  urlApp,
} from "../../../config/constants";
import { fetchFileFromUrl, fetchJsonFromUrl } from "../../../data/utils";
import {
  AttachmentUnavailableError,
  EmailSendError,
  SuspendedEmailError,
} from "../../../services/notify";
import {
  resetCgcApplicationTemplateCache,
  sendEmailCgcApplication,
} from "../../../services/notify/events/email-cgc-application";

vi.mock("../../../data/utils", () => ({
  fetchJsonFromUrl: vi.fn(),
  fetchFileFromUrl: vi.fn(),
}));

const send = vi.fn();
const email = { send };
const form = Buffer.from("%PDF-1.4");
const input = {
  volunteerEmail: "vera@example.com",
  volunteerName: "Vera",
  coordinatorName: "Cora",
  coordinatorEmail: "cora@need4deed.org",
};

beforeEach(() => {
  vi.clearAllMocks();
  resetCgcApplicationTemplateCache();
  vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("no manifest"));
  vi.mocked(fetchFileFromUrl).mockResolvedValue(form);
});

describe("sendEmailCgcApplication", () => {
  it("emails the volunteer the form, cc community@, signed by the coordinator", async () => {
    await sendEmailCgcApplication(email, input);

    const msg = send.mock.calls[0][0];
    expect(msg.to).toBe("vera@example.com");
    expect(msg.cc).toBe(emailFromCommunity);
    expect(msg.replyTo).toEqual(["cora@need4deed.org", emailFromCommunity]);
    expect(msg.attachments).toEqual([
      {
        filename: cgcApplicationFormFileName,
        content: form,
        contentType: "application/pdf",
      },
    ]);
    expect(msg.text).toContain("Hi Vera,");
    expect(msg.text).toMatch(/All the best,\nCora, Need4Deed$/);
    expect(msg.text).toContain(`${urlApp}/en/data-privacy`);
    expect(msg.text).toContain(`${urlApp}/en/agreement`);
    expect(msg.text).toContain(`(${emailFromCommunity}) is copied`);
    expect(msg.text).not.toMatch(/\{\{/);
  });

  it("writes German for a German-speaking volunteer", async () => {
    await sendEmailCgcApplication(email, { ...input, language: "de" });

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("Hallo Vera,");
    expect(msg.text).toContain(`${urlApp}/de/data-privacy`);
  });

  it("defaults to English when the language is unknown", async () => {
    await sendEmailCgcApplication(email, { ...input, language: "fr" });

    expect(send.mock.calls[0][0].text).toContain("Hi Vera,");
  });

  it("uses the CDN manifest when it has the locale", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      en: {
        subject: "EFZ",
        text: "Dear {{ volunteerName }}, {{ signature }}",
      },
    });

    await sendEmailCgcApplication(email, input);

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("EFZ");
    expect(msg.text).toBe("Dear Vera, Cora, Need4Deed");
  });

  it("greets without a name when the volunteer has none", async () => {
    await sendEmailCgcApplication(email, { ...input, volunteerName: "" });

    expect(send.mock.calls[0][0].text).toMatch(/^Hi there,/);
  });

  it("uses the English builtin over a German-only manifest for an English volunteer", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      de: { subject: "EFZ", text: "Hallo" },
    });

    await sendEmailCgcApplication(email, input);

    expect(send.mock.calls[0][0].text).toMatch(/^Hi Vera,/);
  });

  it("links the pages in the language the manifest falls back to", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      en: { subject: "EFZ", text: "{{ dataPrivacyUrl }} {{ agreementUrl }}" },
    });

    await sendEmailCgcApplication(email, { ...input, language: "de" });

    expect(send.mock.calls[0][0].text).toBe(
      `${urlApp}/en/data-privacy ${urlApp}/en/agreement`,
    );
  });

  it("signs as the team when the coordinator has no name", async () => {
    await sendEmailCgcApplication(email, {
      ...input,
      coordinatorName: " ",
      coordinatorEmail: undefined,
    });

    const msg = send.mock.calls[0][0];
    expect(msg.text).toMatch(/All the best,\nThe Need4Deed Team$/);
    expect(msg.replyTo).toBe(emailFromCommunity);
  });

  it("signs as the team in German too", async () => {
    await sendEmailCgcApplication(email, {
      ...input,
      language: "de",
      coordinatorName: undefined,
    });

    expect(send.mock.calls[0][0].text).toMatch(/Dein Need4Deed-Team$/);
  });

  it("downloads the form once and reuses it", async () => {
    await sendEmailCgcApplication(email, input);
    await sendEmailCgcApplication(email, input);

    expect(fetchFileFromUrl).toHaveBeenCalledTimes(1);
  });

  it("falls back to the last good form when the CDN fails after the TTL", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      await sendEmailCgcApplication(email, input);
      vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000);
      vi.mocked(fetchFileFromUrl).mockRejectedValue(new Error("CDN down"));

      await sendEmailCgcApplication(email, input);

      expect(fetchFileFromUrl).toHaveBeenCalledTimes(2);
      expect(send.mock.calls[1][0].attachments[0].content).toBe(form);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not re-fetch a missing manifest on every send", async () => {
    await sendEmailCgcApplication(email, input);
    await sendEmailCgcApplication(email, input);

    expect(fetchJsonFromUrl).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[1][0].text).toMatch(/^Hi Vera,/);
  });

  it("rejects a form that is not a PDF", async () => {
    vi.mocked(fetchFileFromUrl).mockResolvedValue(Buffer.from("<html>"));

    await expect(sendEmailCgcApplication(email, input)).rejects.toThrow(
      "unexpected file content",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("waits before retrying the CDN after a failed refresh", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      await sendEmailCgcApplication(email, input);
      vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000);
      vi.mocked(fetchFileFromUrl).mockRejectedValue(new Error("CDN down"));

      await sendEmailCgcApplication(email, input);
      await sendEmailCgcApplication(email, input);

      expect(fetchFileFromUrl).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not send without the form", async () => {
    vi.mocked(fetchFileFromUrl).mockRejectedValue(new Error("CDN down"));

    const sent = sendEmailCgcApplication(email, input);

    await expect(sent).rejects.toBeInstanceOf(AttachmentUnavailableError);
    await expect(sent).rejects.toThrow("CDN down");
    expect(send).not.toHaveBeenCalled();
  });

  it("wraps a mail server failure in EmailSendError", async () => {
    send.mockRejectedValueOnce(new Error("smtp down"));

    await expect(sendEmailCgcApplication(email, input)).rejects.toBeInstanceOf(
      EmailSendError,
    );
  });

  it("passes a suspended email through as is", async () => {
    const suspended = new SuspendedEmailError(["subject is blank"]);
    send.mockRejectedValueOnce(suspended);

    await expect(sendEmailCgcApplication(email, input)).rejects.toBe(suspended);
  });
});
