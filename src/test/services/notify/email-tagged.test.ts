import { EntityTableName, Lang } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { urlApp } from "../../../config/constants";
import { fetchJsonFromUrl } from "../../../data/utils";
import {
  buildTaggedLink,
  resetTaggedTemplateCache,
  sendEmailTagged,
  type EmailTaggedInput,
} from "../../../services/notify/events/email-tagged";
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
  resetTaggedTemplateCache();
  vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("no CDN in tests"));
});

function input(over: Partial<EmailTaggedInput> = {}): EmailTaggedInput {
  return {
    recipient: { email: "cora@example.com", name: "Cora", language: "en" },
    authorName: "Alex",
    text: "@Cora please call the volunteer",
    where: {
      kind: "comment",
      entityType: EntityTableName.VOLUNTEER,
      entityId: 7,
    },
    ...over,
  };
}

describe("buildTaggedLink", () => {
  it.each([
    [
      { kind: "comment", entityType: EntityTableName.VOLUNTEER, entityId: 7 },
      "dashboard/volunteers/7",
    ],
    [
      { kind: "comment", entityType: EntityTableName.OPPORTUNITY, entityId: 8 },
      "dashboard/opportunities/8",
    ],
    [
      { kind: "comment", entityType: EntityTableName.AGENT, entityId: 9 },
      "dashboard/agents/9",
    ],
    [
      { kind: "comment", entityType: EntityTableName.LEAD, entityId: 1 },
      "dashboard",
    ],
    [{ kind: "comment", entityType: EntityTableName.VOLUNTEER }, "dashboard"],
    [{ kind: "post" }, "dashboard/posts"],
  ] as const)("links %o to %s, per language", (where, path) => {
    expect(buildTaggedLink(where)).toEqual({
      [Lang.EN]: `${urlApp}/en/${path}`,
      [Lang.DE]: `${urlApp}/de/${path}`,
    });
  });
});

describe("sendEmailTagged", () => {
  it("renders the English builtin for an English user", async () => {
    await sendEmailTagged(email, input());

    const msg = send.mock.calls[0][0];
    expect(msg.to).toBe("cora@example.com");
    expect(msg.subject).toBe(
      "Alex tagged you in a comment on a volunteer — Need4Deed",
    );
    expect(msg.text).toContain("Hi Cora,");
    expect(msg.text).toContain("@Cora please call the volunteer");
    expect(msg.text).toContain(`${urlApp}/en/dashboard/volunteers/7`);
    expect(validateEmailMessage(msg)).toEqual([]);
  });

  it("renders the German builtin, with the German link, for a German user", async () => {
    await sendEmailTagged(
      email,
      input({
        recipient: { email: "cora@example.com", name: "Cora", language: "de" },
      }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe(
      "Alex hat dich in einem Kommentar zu einer freiwilligen Person markiert — Need4Deed",
    );
    expect(msg.text).toContain("Hallo Cora,");
    expect(msg.text).toContain(`${urlApp}/de/dashboard/volunteers/7`);
  });

  it.each([
    [{ kind: "post" } as const, "a post"],
    [
      { kind: "comment", entityType: EntityTableName.OPPORTUNITY } as const,
      "a comment on an opportunity",
    ],
    [
      { kind: "comment", entityType: EntityTableName.AGENT } as const,
      "a comment on an organisation",
    ],
    [
      { kind: "comment", entityType: EntityTableName.LEAD } as const,
      "a comment",
    ],
    [{ kind: "comment" } as const, "a comment"],
  ])("describes %o as '%s'", async (where, expected) => {
    await sendEmailTagged(email, input({ where }));

    expect(send.mock.calls[0][0].subject).toBe(
      `Alex tagged you in ${expected} — Need4Deed`,
    );
  });

  it("falls back to per-language placeholders for missing names", async () => {
    await sendEmailTagged(
      email,
      input({
        authorName: undefined,
        recipient: { email: "cora@example.com", language: "de" },
      }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toMatch(/^Jemand hat dich/);
    expect(msg.text).toContain("Hallo zusammen,");
  });

  it("keeps a literal {{ ... }} in the tag text from suspending the send", async () => {
    await sendEmailTagged(email, input({ text: "see {{ this }}" }));

    const msg = send.mock.calls[0][0];
    expect(validateEmailMessage(msg)).toEqual([]);
    expect(msg.text).toContain("see {​{ this }​}");
  });

  it("uses the manifest entry for the recipient's locale", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      en: { subject: "EN {{ authorName }}", text: "{{ where }} {{ link }}" },
      de: { subject: "DE {{ authorName }}", text: "{{ where }} {{ link }}" },
    });

    await sendEmailTagged(email, input({ where: { kind: "post" } }));

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("EN Alex");
    expect(msg.text).toBe(`a post ${urlApp}/en/dashboard/posts`);
  });

  it("takes labels from the manifest entry, key by key, else the builtin", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      en: {
        subject: "{{ authorName }} / {{ where }}",
        text: "Hi {{ recipientName }}",
        labels: { commentOnVolunteer: "a note on a volunteer", someone: "" },
      },
    });

    await sendEmailTagged(
      email,
      input({
        authorName: undefined,
        recipient: { email: "cora@example.com", language: "en" },
      }),
    );

    const msg = send.mock.calls[0][0];
    // Overridden label used; the empty "someone" override is ignored.
    expect(msg.subject).toBe("Someone / a note on a volunteer");
    // Not overridden: the builtin label.
    expect(msg.text).toBe("Hi there");
  });

  it("uses the labels of the entry actually used, when the recipient's locale is missing", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      de: {
        subject: "{{ where }}",
        text: "{{ link }}",
        labels: { post: "einem Pinnwand-Beitrag" },
      },
    });

    await sendEmailTagged(email, input({ where: { kind: "post" } }));

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("einem Pinnwand-Beitrag");
    expect(msg.text).toBe(`${urlApp}/de/dashboard/posts`);
  });

  it("HTML-escapes user text in an html body", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      en: { subject: "s", html: "<p>{{ authorName }}: {{ tagText }}</p>" },
      de: { subject: "s", html: "<p>{{ authorName }}: {{ tagText }}</p>" },
    });

    await sendEmailTagged(
      email,
      input({ authorName: "A & B", text: '<script>alert("x")</script>' }),
    );

    expect(send.mock.calls[0][0].html).toBe(
      "<p>A &amp; B: &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>",
    );
  });
});
