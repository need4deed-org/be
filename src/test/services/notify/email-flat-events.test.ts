import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonFromUrl } from "../../../data/utils";
import {
  ACCOMPANY_MATCH_BUILTIN,
  ACCOMPANY_NOT_FOUND_BUILTIN,
  INTRODUCTION_BUILTIN,
  NEW_REGULAR_BUILTIN,
  POST_MATCH_CHECKUP_BUILTIN,
  REGULAR_UPDATE_BUILTIN,
  STALE_BUILTIN,
  SUGGESTION_BUILTIN,
} from "../../../services/notify/builtin-content";
import {
  resetAccompanyMatchTemplateCache,
  sendEmailAccompanyMatch,
} from "../../../services/notify/events/email-accompany-match";
import {
  resetAccompanyNotFoundTemplateCache,
  sendEmailAccompanyNotFound,
} from "../../../services/notify/events/email-accompany-not-found";
import {
  resetIntroductionTemplateCache,
  sendEmailIntroduction,
} from "../../../services/notify/events/email-introduction";
import {
  resetNewRegularTemplateCache,
  sendEmailNewRegular,
} from "../../../services/notify/events/email-new-regular";
import {
  resetPostMatchCheckupTemplateCache,
  sendEmailPostMatchCheckup,
} from "../../../services/notify/events/email-post-match-checkup";
import {
  resetRegularUpdateTemplateCache,
  sendEmailRegularUpdate,
} from "../../../services/notify/events/email-regular-update";
import {
  resetStaleTemplateCache,
  sendEmailStale,
} from "../../../services/notify/events/email-stale";
import {
  resetSuggestionTemplateCache,
  sendEmailSuggestion,
} from "../../../services/notify/events/email-suggestion";
import type { EmailTransport } from "../../../services/notify/types";

// Covers the 8 flat-content senders that (unlike email-verification and
// email-new-accompanying) had no dedicated test at all — each only ever ran
// through job tests with fastify.notify.* mocked out, so nothing exercised
// resolveFlatContent()'s actual manifest-vs-builtin selection for them. See
// be#838/be#839 review.
vi.mock("../../../data/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../data/utils")>();
  return { ...actual, fetchJsonFromUrl: vi.fn() };
});

const send = vi.fn();
const email: EmailTransport = { send };

function person(over: Record<string, unknown> = {}) {
  // A plain object literal, not a `Person` instance, so `.name` (a getter on
  // the real class computed from firstName/middleName/lastName) must be set
  // explicitly here — otherwise it silently resolves to `undefined` instead
  // of throwing, which a naive "no unresolved {{ }}" check wouldn't catch.
  return {
    firstName: "Test",
    lastName: "Person",
    name: "Test Person",
    email: "person@example.com",
    phone: "0301234567",
    users: [],
    ...over,
  };
}

function volunteer(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    person: person({
      firstName: "Vera",
      lastName: "Volunteer",
      name: "Vera Volunteer",
      email: "vera@example.com",
    }),
    deal: {
      postcode: { value: "10115" },
      dealLanguage: [],
      dealSkill: [],
      dealTimeslot: [],
    },
    statusCGC: "no",
    statusCgcProcess: "missing",
    statusVaccination: "no",
    shareContact: true,
    ...over,
  };
}

function opportunity(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Opportunity title",
    info: "some info",
    translationType: "Arabic",
    contactPerson: person({
      firstName: "Con",
      lastName: "Tact",
      name: "Con Tact",
      email: "contact@example.com",
    }),
    district: { title: "Mitte" },
    accompanying: {
      name: "Client",
      address: "Main street 1",
      phone: "0309876543",
      languageToTranslate: "Arabic",
      postcode: { value: "10115" },
    },
    onetimer: { date: new Date("2026-03-05T13:30:00.000Z") },
    ...over,
  };
}

function ov(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    volunteerId: 1,
    opportunityId: 1,
    volunteer: volunteer(),
    opportunity: opportunity(),
    ...over,
  };
}

const UNRESOLVED_PLACEHOLDER_RE = /\{\{\s*\w+\s*\}\}/;

const CASES = [
  {
    name: "sendEmailStale",
    builtin: STALE_BUILTIN,
    resetCache: resetStaleTemplateCache,
    send: () =>
      sendEmailStale(
        email,
        ov() as unknown as Parameters<typeof sendEmailStale>[1],
      ),
  },
  {
    name: "sendEmailPostMatchCheckup",
    builtin: POST_MATCH_CHECKUP_BUILTIN,
    resetCache: resetPostMatchCheckupTemplateCache,
    send: () =>
      sendEmailPostMatchCheckup(
        email,
        ov() as unknown as Parameters<typeof sendEmailPostMatchCheckup>[1],
      ),
  },
  {
    name: "sendEmailSuggestion",
    builtin: SUGGESTION_BUILTIN,
    resetCache: resetSuggestionTemplateCache,
    send: () =>
      sendEmailSuggestion(
        email,
        ov() as unknown as Parameters<typeof sendEmailSuggestion>[1],
      ),
  },
  {
    name: "sendEmailIntroduction",
    builtin: INTRODUCTION_BUILTIN,
    resetCache: resetIntroductionTemplateCache,
    send: () =>
      sendEmailIntroduction(
        email,
        ov() as unknown as Parameters<typeof sendEmailIntroduction>[1],
      ),
  },
  {
    name: "sendEmailAccompanyMatch",
    builtin: ACCOMPANY_MATCH_BUILTIN,
    resetCache: resetAccompanyMatchTemplateCache,
    send: () =>
      sendEmailAccompanyMatch(
        email,
        ov() as unknown as Parameters<typeof sendEmailAccompanyMatch>[1],
      ),
  },
  {
    name: "sendEmailAccompanyNotFound",
    builtin: ACCOMPANY_NOT_FOUND_BUILTIN,
    resetCache: resetAccompanyNotFoundTemplateCache,
    send: () =>
      sendEmailAccompanyNotFound(
        email,
        opportunity() as unknown as Parameters<
          typeof sendEmailAccompanyNotFound
        >[1],
      ),
  },
  {
    name: "sendEmailRegularUpdate",
    builtin: REGULAR_UPDATE_BUILTIN,
    resetCache: resetRegularUpdateTemplateCache,
    send: () =>
      sendEmailRegularUpdate(
        email,
        opportunity() as unknown as Parameters<
          typeof sendEmailRegularUpdate
        >[1],
      ),
  },
  {
    name: "sendEmailNewRegular",
    builtin: NEW_REGULAR_BUILTIN,
    resetCache: resetNewRegularTemplateCache,
    send: () =>
      sendEmailNewRegular(
        email,
        opportunity() as unknown as Parameters<typeof sendEmailNewRegular>[1],
      ),
  },
];

describe.each(CASES)("$name", ({ resetCache, send: doSend }) => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCache();
  });

  it("falls back to the real BUILTIN content with no unresolved placeholders", async () => {
    vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("no CDN in tests"));

    await doSend();

    const msg = send.mock.calls[0][0];
    // builtin.subject/text may themselves contain {{ placeholders }} (e.g.
    // accompanymatch's subject) — check the *sent* message resolved them,
    // rather than exact-matching the raw, unfilled builtin content.
    expect(msg.subject).not.toMatch(UNRESOLVED_PLACEHOLDER_RE);
    expect(msg.subject).not.toContain("undefined");
    expect(msg.text ?? "").not.toMatch(UNRESOLVED_PLACEHOLDER_RE);
    expect(msg.text ?? "").not.toContain("undefined");
    expect(msg.html ?? "").not.toMatch(UNRESOLVED_PLACEHOLDER_RE);
  });

  it("prefers a valid flat CDN manifest over the builtin fallback", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      subject: "MANIFEST SUBJECT MARKER",
      text: "manifest body, no placeholders",
    });

    await doSend();

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("MANIFEST SUBJECT MARKER");
  });
});
