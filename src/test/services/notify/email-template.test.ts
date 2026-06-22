import { Lang } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonFromUrl } from "../../../data/utils";
import {
  createManifestLoader,
  fillTemplate,
  resolveContent,
  resolveLocale,
  type LocaleContent,
} from "../../../services/notify/email-template";

vi.mock("../../../data/utils", () => ({
  fetchJsonFromUrl: vi.fn(),
}));

// ─── fillTemplate ────────────────────────────────────────────────────────────

describe("fillTemplate", () => {
  it("substitutes a single placeholder in all fields", () => {
    const result = fillTemplate(
      {
        subject: "Hello {{name}}",
        text: "Hi {{name}}, welcome!",
        html: "<p>Hi {{name}}</p>",
      },
      { name: "Alice" },
    );
    expect(result.subject).toBe("Hello Alice");
    expect(result.text).toBe("Hi Alice, welcome!");
    expect(result.html).toBe("<p>Hi Alice</p>");
  });

  it("substitutes multiple distinct placeholders", () => {
    const result = fillTemplate(
      {
        subject: "{{event}} confirmation",
        html: "<p>Dear {{name}}, your {{event}} is on {{date}}.</p>",
        text: "Dear {{name}}, your {{event}} is on {{date}}.",
      },
      { name: "Bob", event: "appointment", date: "2026-07-01" },
    );
    expect(result.subject).toBe("appointment confirmation");
    expect(result.html).toBe(
      "<p>Dear Bob, your appointment is on 2026-07-01.</p>",
    );
    expect(result.text).toBe("Dear Bob, your appointment is on 2026-07-01.");
  });

  it("replaces the same placeholder appearing multiple times", () => {
    const result = fillTemplate(
      { subject: "link", html: '<a href="{{url}}">{{url}}</a>' },
      { url: "https://example.com/verify" },
    );
    expect(result.html).toBe(
      '<a href="https://example.com/verify">https://example.com/verify</a>',
    );
    expect(result.html).not.toContain("{{url}}");
  });

  it("accepts {{ key }} with surrounding whitespace", () => {
    const result = fillTemplate(
      { subject: "{{ name }} joined" },
      { name: "Eve" },
    );
    expect(result.subject).toBe("Eve joined");
  });

  it("omits html and text keys when absent from content", () => {
    const result = fillTemplate({ subject: "plain" }, {});
    expect(result).toEqual({ subject: "plain" });
    expect("html" in result).toBe(false);
    expect("text" in result).toBe(false);
  });

  it("preserves unresolved placeholders in output", () => {
    const result = fillTemplate(
      { subject: "Hi {{name}}", text: "Code: {{code}}" },
      { name: "Alice" },
    );
    expect(result.subject).toBe("Hi Alice");
    expect(result.text).toBe("Code: {{code}}");
  });

  it("ignores extra vars that have no matching placeholder", () => {
    const result = fillTemplate(
      { subject: "Hello {{name}}" },
      { name: "Dave", unused: "x" },
    );
    expect(result.subject).toBe("Hello Dave");
  });

  it("substitutes an empty string value correctly", () => {
    const result = fillTemplate({ subject: "Hi {{name}}" }, { name: "" });
    expect(result.subject).toBe("Hi ");
  });
});

// ─── resolveLocale ───────────────────────────────────────────────────────────

describe("resolveLocale", () => {
  it("returns DE for 'de'", () => {
    expect(resolveLocale("de")).toBe(Lang.DE);
  });

  it("returns EN for 'en'", () => {
    expect(resolveLocale("en")).toBe(Lang.EN);
  });

  it("falls back to EN for unknown languages", () => {
    expect(resolveLocale("fr")).toBe(Lang.EN);
    expect(resolveLocale(undefined)).toBe(Lang.EN);
  });
});

// ─── resolveContent ──────────────────────────────────────────────────────────

const builtin: Record<Lang, LocaleContent> = {
  [Lang.EN]: { subject: "Builtin EN", text: "builtin en text" },
  [Lang.DE]: { subject: "Builtin DE", text: "builtin de text" },
};

describe("resolveContent", () => {
  it("returns the manifest entry for the requested locale", () => {
    const manifest = {
      [Lang.EN]: { subject: "Manifest EN", html: "<p>en</p>" },
      [Lang.DE]: { subject: "Manifest DE", html: "<p>de</p>" },
    };
    expect(resolveContent(manifest, Lang.DE, builtin).subject).toBe(
      "Manifest DE",
    );
  });

  it("falls back to EN manifest when requested locale is missing", () => {
    const manifest = {
      [Lang.EN]: { subject: "Manifest EN", html: "<p>en</p>" },
    };
    expect(resolveContent(manifest, Lang.DE, builtin).subject).toBe(
      "Manifest EN",
    );
  });

  it("falls back to builtin when manifest is null", () => {
    expect(resolveContent(null, Lang.DE, builtin).subject).toBe("Builtin DE");
  });

  it("falls back to builtin when manifest entry is invalid (no body)", () => {
    const manifest = { [Lang.EN]: { subject: "no body" } };
    expect(resolveContent(manifest, Lang.EN, builtin).subject).toBe(
      "Builtin EN",
    );
  });
});

// ─── createManifestLoader ────────────────────────────────────────────────────

describe("createManifestLoader", () => {
  const url = "https://cdn.example.com/emails/test.json";
  const manifest = {
    [Lang.EN]: { subject: "Test", html: "<p>test</p>" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns the manifest", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);
    const loader = createManifestLoader(url);
    expect(await loader.load()).toEqual(manifest);
  });

  it("caches within TTL (single fetch across multiple calls)", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);
    const loader = createManifestLoader(url);
    await loader.load();
    await loader.load();
    expect(fetchJsonFromUrl).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after resetCache()", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);
    const loader = createManifestLoader(url);
    await loader.load();
    loader.resetCache();
    await loader.load();
    expect(fetchJsonFromUrl).toHaveBeenCalledTimes(2);
  });

  it("returns null on fetch failure when no stale cache exists", async () => {
    vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("CDN down"));
    const loader = createManifestLoader(url);
    expect(await loader.load()).toBeNull();
  });

  it("serves stale cache when a subsequent fetch fails after TTL expires", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchJsonFromUrl)
      .mockResolvedValueOnce(manifest)
      .mockRejectedValueOnce(new Error("CDN down"));
    const loader = createManifestLoader(url);

    await loader.load(); // populates cache
    vi.advanceTimersByTime(11 * 60 * 1000); // past default 10-min TTL
    const result = await loader.load(); // fetch fails → returns stale
    expect(result).toEqual(manifest);
    vi.useRealTimers();
  });
});
