import { TranslatedIntoType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonFromUrl } from "../../../data/utils";
import { sendEmailNewAccompanying } from "../../../services/notify/events/email-new-accompanying";
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

function buildOpportunity(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Hospital visit",
    info: "some info",
    contactPerson: {
      name: "Jane Doe",
      email: "jane@example.com",
      users: [{ language: "de" }],
    },
    district: { title: "Mitte" },
    accompanying: {
      name: "Client Name",
      address: "Main street 1",
      phone: "123456",
      languageToTranslate: TranslatedIntoType.ENGLISH_OK,
      postcode: { value: "10115" },
    },
    onetimer: { date: new Date("2026-03-05T13:30:00.000Z") },
    ...over,
  } as unknown as Parameters<typeof sendEmailNewAccompanying>[1];
}

describe("sendEmailNewAccompanying", () => {
  it("derives appointmentTime and appointmentPlz from onetimer.date and accompanying.postcode", async () => {
    await sendEmailNewAccompanying(email, buildOpportunity());

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("10115");
    expect(msg.text).not.toContain("{{ appointmentTime }}");
    expect(msg.text).not.toContain("{{ appointmentPlz }}");
  });

  it("falls back to empty strings when onetimer or postcode are missing", async () => {
    await sendEmailNewAccompanying(
      email,
      buildOpportunity({ onetimer: undefined, accompanying: { name: "x" } }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.text).not.toContain("{{ appointmentTime }}");
    expect(msg.text).not.toContain("{{ appointmentPlz }}");
  });

  // be#846: accompaniedpersonLanguage/appointmentaLanguage were raw enum
  // values duplicated from the same source (opportunity.translationType has
  // no other reader or writer anywhere in the codebase) — mapped to a
  // human-readable label instead, from the one genuine source.
  it("maps languageToTranslate to a human-readable label, not the raw enum value", async () => {
    await sendEmailNewAccompanying(
      email,
      buildOpportunity({
        accompanying: {
          name: "Client Name",
          languageToTranslate: TranslatedIntoType.DEUTSCHE,
          postcode: { value: "10115" },
        },
      }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("Nur Deutsch");
    expect(msg.text).not.toContain("deutsche");
  });

  it("renders the same label for both language slots (single source of truth)", async () => {
    await sendEmailNewAccompanying(email, buildOpportunity());

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain("Deutsch oder Englisch, Deutsch oder Englisch");
  });

  it("renders an empty label when languageToTranslate is unset", async () => {
    await sendEmailNewAccompanying(
      email,
      buildOpportunity({
        accompanying: { name: "Client Name", postcode: { value: "10115" } },
      }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.text).not.toContain("undefined");
    expect(msg.text).toContain("Sprachen: , ");
  });
});
