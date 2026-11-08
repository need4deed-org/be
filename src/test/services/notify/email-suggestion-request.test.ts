import { beforeEach, describe, expect, it, vi } from "vitest";
import { urlApp } from "../../../config/constants";
import { fetchJsonFromUrl } from "../../../data/utils";
import {
  resetSuggestionRequestTemplateCache,
  sendEmailSuggestionRequest,
  type EmailSuggestionRequestInput,
} from "../../../services/notify/events/email-suggestion-request";
import type { EmailTransport } from "../../../services/notify/types";
import { validateEmailMessage } from "../../../services/notify/validate-email-message";

vi.mock("../../../data/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../data/utils")>();
  return { ...actual, fetchJsonFromUrl: vi.fn() };
});

const send = vi.fn();
const email: EmailTransport = { send };

beforeEach(() => {
  vi.clearAllMocks();
  resetSuggestionRequestTemplateCache();
  vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("no CDN in tests"));
});

function input(
  over: Partial<EmailSuggestionRequestInput> = {},
): EmailSuggestionRequestInput {
  return {
    recipient: { email: "olga@example.com", name: "Olga", language: "en" },
    requesterName: "Rita",
    requesterAgent: "Haus Linde",
    volunteerId: 7,
    volunteerName: "Vera",
    opportunityTitle: "German tutoring",
    ...over,
  };
}

describe("sendEmailSuggestionRequest", () => {
  it("renders the English builtin with the volunteer card link", async () => {
    await sendEmailSuggestionRequest(email, input());

    const msg = send.mock.calls[0][0];
    expect(msg.to).toBe("olga@example.com");
    expect(msg.subject).toBe(
      "Haus Linde would like Vera for an opportunity — Need4Deed",
    );
    expect(msg.text).toContain("Hi Olga,");
    expect(msg.text).toContain("Rita from Haus Linde");
    expect(msg.text).toContain('"German tutoring"');
    expect(msg.text).toContain(`${urlApp}/en/dashboard/volunteers/7`);
    expect(validateEmailMessage(msg)).toEqual([]);
  });

  it("renders the German builtin, with the German link, for a German user", async () => {
    await sendEmailSuggestionRequest(
      email,
      input({
        recipient: { email: "olga@example.com", name: "Olga", language: "de" },
      }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe(
      "Haus Linde fragt Vera für ein Gesuch an — Need4Deed",
    );
    expect(msg.text).toContain("Hallo Olga,");
    expect(msg.text).toContain(`${urlApp}/de/dashboard/volunteers/7`);
    expect(validateEmailMessage(msg)).toEqual([]);
  });

  it("falls back to neutral labels without names, and neutralizes braces", async () => {
    await sendEmailSuggestionRequest(
      email,
      input({
        recipient: { email: "olga@example.com", language: "en" },
        requesterName: undefined,
        opportunityTitle: "{{ link }}",
      }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("Hi there,");
    expect(msg.text).toContain("Someone from Haus Linde");
    expect(msg.text).not.toContain('"{{ link }}"');
    expect(validateEmailMessage(msg)).toEqual([]);
  });

  it("refuses a recipient without an email", async () => {
    await expect(
      sendEmailSuggestionRequest(email, input({ recipient: { email: "" } })),
    ).rejects.toThrow("missing recipient email");
    expect(send).not.toHaveBeenCalled();
  });
});
