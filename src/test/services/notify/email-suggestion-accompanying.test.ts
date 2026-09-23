import { TranslatedIntoType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonFromUrl } from "../../../data/utils";
import { sendEmailSuggestionAccompanying } from "../../../services/notify/events/email-suggestion-accompanying";
import type { EmailTransport } from "../../../services/notify/types";

vi.mock("../../../data/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../data/utils")>();
  return { ...actual, fetchJsonFromUrl: vi.fn() };
});

const send = vi.fn();
const email: EmailTransport = { send };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("no CDN in tests"));
});

function buildOv(opportunityOver: Record<string, unknown> = {}) {
  return {
    id: 1,
    volunteerId: 1,
    volunteer: {
      person: { name: "Vera Volunteer", email: "vera@example.com" },
    },
    opportunity: {
      id: 1,
      title: "Hospital visit",
      accompanying: {
        address: "Main street 1",
        languageToTranslate: TranslatedIntoType.DEUTSCHE,
        postcode: { value: "10115" },
      },
      onetimer: { date: new Date("2026-03-05T13:30:00.000Z") },
      deal: {
        dealLanguage: [
          { language: { title: "Arabic", translation: "Arabisch" } },
        ],
      },
      ...opportunityOver,
    },
  } as unknown as Parameters<typeof sendEmailSuggestionAccompanying>[1];
}

describe("sendEmailSuggestionAccompanying", () => {
  it("combines languageToTranslate with the deal's requested language into a target-source pair", async () => {
    await sendEmailSuggestionAccompanying(email, buildOv());

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("Language: Deutsch-Arabisch");
    expect(msg.text).toContain("Sprache: Deutsch-Arabisch");
    expect(msg.text).not.toContain("{{");
  });

  it("falls back to the standalone label when the deal has no requested languages", async () => {
    await sendEmailSuggestionAccompanying(
      email,
      buildOv({ deal: { dealLanguage: [] } }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("Language: Nur Deutsch");
  });

  it("renders appointment details from onetimer.date and accompanying.postcode", async () => {
    await sendEmailSuggestionAccompanying(email, buildOv());

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("10115");
    expect(msg.text).toContain("Main street 1");
    expect(msg.text).not.toContain("undefined");
  });
});
