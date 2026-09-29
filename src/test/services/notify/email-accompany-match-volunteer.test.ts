import { TranslatedIntoType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonFromUrl } from "../../../data/utils";
import {
  resetAccompanyMatchVolunteerTemplateCache,
  sendEmailAccompanyMatchVolunteer,
} from "../../../services/notify/events/email-accompany-match-volunteer";
import type { EmailTransport } from "../../../services/notify/types";

vi.mock("../../../data/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../data/utils")>();
  return { ...actual, fetchJsonFromUrl: vi.fn() };
});

const send = vi.fn();
const email: EmailTransport = { send };

beforeEach(() => {
  vi.clearAllMocks();
  resetAccompanyMatchVolunteerTemplateCache();
  vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("no CDN in tests"));
});

function buildOv() {
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
        name: "Client",
        phone: "0123",
        languageToTranslate: TranslatedIntoType.ENGLISH_OK,
        postcode: { value: "10115" },
      },
      onetimer: { date: new Date("2026-03-05T13:30:00.000Z") },
      deal: {
        dealLanguage: [
          { language: { title: "Arabic", translation: "Arabisch" } },
        ],
      },
    },
  } as unknown as Parameters<typeof sendEmailAccompanyMatchVolunteer>[1];
}

describe("sendEmailAccompanyMatchVolunteer", () => {
  it("renders the accompanied person's language in the language of each part (be#1075)", async () => {
    await sendEmailAccompanyMatchVolunteer(email, buildOv());

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("Languages: German/English-Arabic");
    expect(msg.text).toContain("Sprachen: Deutsch/Englisch-Arabisch");
    expect(msg.text).not.toContain("{{");
  });
});
