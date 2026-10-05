import { TranslatedIntoType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonFromUrl } from "../../../data/utils";
import {
  resetSuggestionAccompanyingTemplateCache,
  sendEmailSuggestionAccompanying,
} from "../../../services/notify/events/email-suggestion-accompanying";
import type { EmailTransport } from "../../../services/notify/types";

vi.mock("../../../data/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../data/utils")>();
  return { ...actual, fetchJsonFromUrl: vi.fn() };
});

const send = vi.fn();
const email: EmailTransport = { send };

beforeEach(() => {
  vi.clearAllMocks();
  resetSuggestionAccompanyingTemplateCache();
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
    expect(msg.text).toContain("Language: German-Arabic");
    expect(msg.text).toContain("Sprache: Deutsch-Arabisch");
    expect(msg.text).not.toContain("{{");
  });

  it("falls back to the standalone label when the deal has no requested languages", async () => {
    await sendEmailSuggestionAccompanying(
      email,
      buildOv({ deal: { dealLanguage: [] } }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("Language: Only German");
    expect(msg.text).toContain("Sprache: Nur Deutsch");
  });

  it("falls back to the builtin when a flat manifest leaves the language open (be#1075)", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      subject: "CDN subject",
      text: "Language: {{ accompaniedpersonLanguage }}",
    });

    await sendEmailSuggestionAccompanying(email, buildOv());

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("Accompanying opportunity match — Need4Deed");
    expect(msg.text).toContain("Language: German-Arabic");
    expect(msg.text).toContain("Sprache: Deutsch-Arabisch");
  });

  it("uses a flat manifest that picks each part's language", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      subject: "CDN subject",
      text: "EN {{ accompaniedpersonLanguage.en }} / DE {{ accompaniedpersonLanguage.de }}",
    });

    await sendEmailSuggestionAccompanying(email, buildOv());

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("CDN subject");
    expect(msg.text).toBe("EN German-Arabic / DE Deutsch-Arabisch");
  });

  it("renders appointment details from onetimer.date and accompanying.postcode", async () => {
    await sendEmailSuggestionAccompanying(email, buildOv());

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("10115");
    expect(msg.text).not.toContain("undefined");
  });

  it("gives the full street address", async () => {
    await sendEmailSuggestionAccompanying(
      email,
      buildOv({ district: { title: "Neukölln" } }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("Address: Main street 1, 10115");
    expect(msg.text).not.toContain("Neukölln");
  });
});
