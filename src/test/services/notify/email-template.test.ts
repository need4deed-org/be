import { Lang } from "need4deed-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonFromUrl } from "../../../data/utils";
import {
  createManifestLoader,
  escapeHtml,
  fillTemplate,
  renderEmail,
  resolveContent,
  resolveFlatContent,
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

  it("treats a nullish (undefined) value as unresolved, not the word 'undefined'", () => {
    const result = fillTemplate(
      { subject: "Date: {{date}}" },
      { date: undefined },
    );
    expect(result.subject).toBe("Date: {{date}}");
  });

  it("treats a nullish (null) value as unresolved", () => {
    const result = fillTemplate(
      { subject: "Date: {{ date }}" },
      { date: null },
    );
    expect(result.subject).toBe("Date: {{ date }}");
  });

  it("fills a placeholder normally when the value is present", () => {
    const result = fillTemplate(
      { subject: "Date: {{ date }}" },
      { date: "2026-08-28" },
    );
    expect(result.subject).toBe("Date: 2026-08-28");
  });

  it("never flags literal user content that happens to contain the word 'undefined'", () => {
    const result = fillTemplate(
      { subject: "{{ title }}" },
      { title: "My undefined project" },
    );
    expect(result.subject).toBe("My undefined project");
  });
});

// ─── fillTemplate: localized values ─────────────────────────────────────────

describe("fillTemplate with localized values", () => {
  const kind = { en: "volunteer", de: "Freiwillige*r" };

  it("picks the language given explicitly by {{ key.en }} / {{ key.de }}", () => {
    const result = fillTemplate(
      { subject: "s", text: "EN: {{ kind.en }}\nDE: {{kind.de}}" },
      { kind },
    );
    expect(result.text).toBe("EN: volunteer\nDE: Freiwillige*r");
  });

  it("picks the content's locale for a plain {{ key }}", () => {
    const result = fillTemplate({ subject: "{{ kind }}" }, { kind }, Lang.DE);
    expect(result.subject).toBe("Freiwillige*r");
  });

  it("an explicit language wins over the content's locale", () => {
    const result = fillTemplate(
      { subject: "{{ kind.en }}" },
      { kind },
      Lang.DE,
    );
    expect(result.subject).toBe("volunteer");
  });

  it("leaves a plain {{ key }} unresolved when there's no locale", () => {
    const result = fillTemplate({ subject: "{{ kind }}" }, { kind });
    expect(result.subject).toBe("{{ kind }}");
  });

  it("leaves {{ key.xx }} unresolved for an unknown language", () => {
    const result = fillTemplate({ subject: "{{ kind.fr }}" }, { kind });
    expect(result.subject).toBe("{{ kind.fr }}");
  });

  it("leaves {{ key.en }} unresolved when the value is a plain string", () => {
    const result = fillTemplate({ subject: "{{ name.en }}" }, { name: "Ann" });
    expect(result.subject).toBe("{{ name.en }}");
  });

  it("still fills plain values regardless of locale", () => {
    const result = fillTemplate(
      { subject: "{{ name }}, {{ kind }}" },
      { name: "Ann", kind },
      Lang.EN,
    );
    expect(result.subject).toBe("Ann, volunteer");
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

  it("falls back to DE for unknown languages", () => {
    expect(resolveLocale("fr")).toBe(Lang.DE);
    expect(resolveLocale(undefined)).toBe(Lang.DE);
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

  it("falls back to DE manifest (the default locale) when requested locale is missing", () => {
    const manifest = {
      [Lang.DE]: { subject: "Manifest DE", html: "<p>de</p>" },
    };
    expect(resolveContent(manifest, Lang.EN, builtin).subject).toBe(
      "Manifest DE",
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

  it("uses a flat (non-locale-keyed) manifest as-is regardless of locale", () => {
    const manifest = { subject: "Flat subject", text: "flat body" };
    expect(resolveContent(manifest, Lang.EN, builtin)).toEqual(manifest);
    expect(resolveContent(manifest, Lang.DE, builtin)).toEqual(manifest);
  });

  it("falls back to builtin when a flat manifest is invalid (no body)", () => {
    const manifest = { subject: "no body" };
    expect(resolveContent(manifest, Lang.DE, builtin).subject).toBe(
      "Builtin DE",
    );
  });
});

// ─── resolveFlatContent ──────────────────────────────────────────────────────

describe("resolveFlatContent", () => {
  const flatBuiltin: LocaleContent = { subject: "Builtin", text: "fallback" };

  it("uses the flat manifest as-is when valid", () => {
    const manifest = { subject: "Flat subject", text: "flat body" };
    expect(resolveFlatContent(manifest, flatBuiltin)).toEqual(manifest);
  });

  it("falls back to builtin when manifest is null", () => {
    expect(resolveFlatContent(null, flatBuiltin)).toEqual(flatBuiltin);
  });

  it("falls back to builtin when the flat manifest is invalid (no body)", () => {
    const manifest = { subject: "no body" };
    expect(resolveFlatContent(manifest, flatBuiltin)).toEqual(flatBuiltin);
  });

  it("falls back to builtin when the manifest is unexpectedly locale-keyed", () => {
    const manifest = { [Lang.EN]: { subject: "en", text: "en body" } };
    expect(resolveFlatContent(manifest, flatBuiltin)).toEqual(flatBuiltin);
  });
});

// ─── renderEmail ─────────────────────────────────────────────────────────────

describe("renderEmail", () => {
  const kind = { en: "volunteer", de: "Freiwillige*r" };
  const perLocaleBuiltin: Record<Lang, LocaleContent> = {
    [Lang.EN]: { subject: "builtin en", text: "EN {{ kind }}" },
    [Lang.DE]: { subject: "builtin de", text: "DE {{ kind }}" },
  };
  const flatBuiltin: LocaleContent = {
    subject: "builtin flat",
    text: "EN {{ kind.en }} / DE {{ kind.de }}",
  };

  it("fills a per-locale manifest entry in its own language", () => {
    const result = renderEmail(
      {
        en: { subject: "m en", text: "EN {{ kind }}" },
        de: { subject: "m de", text: "DE {{ kind }}" },
      },
      perLocaleBuiltin,
      { kind },
      Lang.EN,
    );
    expect(result).toEqual({ subject: "m en", text: "EN volunteer" });
  });

  it("uses the language of the fallback entry, not the requested locale", () => {
    // No "en" entry: resolveContent falls back to "de", so the value must too.
    const result = renderEmail(
      { de: { subject: "m de", text: "DE {{ kind }}" } },
      perLocaleBuiltin,
      { kind },
      Lang.EN,
    );
    expect(result.text).toBe("DE Freiwillige*r");
  });

  it("fills a flat bilingual manifest by explicit languages", () => {
    const result = renderEmail(
      { subject: "m flat", text: "{{ kind.en }} / {{ kind.de }}" },
      flatBuiltin,
      { kind },
    );
    expect(result.text).toBe("volunteer / Freiwillige*r");
  });

  it("falls back to the flat builtin when the manifest leaves a language open", () => {
    const result = renderEmail(
      { subject: "m flat", text: "{{ kind }} / {{ kind }}" },
      flatBuiltin,
      { kind },
    );
    expect(result).toEqual({
      subject: "builtin flat",
      text: "EN volunteer / DE Freiwillige*r",
    });
  });

  it("falls back to the per-locale builtin when a flat manifest leaves a language open", () => {
    const result = renderEmail(
      { subject: "m flat", text: "{{ kind }}" },
      perLocaleBuiltin,
      { kind },
      Lang.DE,
    );
    expect(result).toEqual({
      subject: "builtin de",
      text: "DE Freiwillige*r",
    });
  });

  it("falls back to the builtin when the manifest is null", () => {
    const result = renderEmail(null, perLocaleBuiltin, { kind }, Lang.EN);
    expect(result).toEqual({ subject: "builtin en", text: "EN volunteer" });
  });

  it("leaves placeholders unresolved when the builtin itself leaves a language open", () => {
    const result = renderEmail(
      null,
      { subject: "s", text: "{{ kind }}" },
      { kind },
    );
    expect(result.text).toBe("{{ kind }}");
  });

  it("HTML-escapes values in the html body only, when asked", () => {
    const content = {
      subject: "{{ name }}",
      text: "{{ name }}",
      html: "<p>{{ name }}</p>",
    };
    const vars = { name: "<b>A & B</b>" };
    expect(renderEmail(content, flatBuiltin, vars)).toEqual({
      ...{ subject: "<b>A & B</b>", text: "<b>A & B</b>" },
      html: "<p><b>A & B</b></p>",
    });
    expect(
      renderEmail(content, flatBuiltin, vars, Lang.DE, {
        escapeHtmlValues: true,
      }),
    ).toEqual({
      subject: "<b>A & B</b>",
      text: "<b>A & B</b>",
      html: "<p>&lt;b&gt;A &amp; B&lt;/b&gt;</p>",
    });
  });

  it("keeps plain-string manifests working as before", () => {
    const result = renderEmail(
      { subject: "Hi {{ name }}", text: "Hello {{ name }}" },
      flatBuiltin,
      { name: "Ann" },
    );
    expect(result).toEqual({ subject: "Hi Ann", text: "Hello Ann" });
  });
});

// ─── escapeHtml ──────────────────────────────────────────────────────────────

describe("escapeHtml", () => {
  it("escapes the five HTML-special characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
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

  afterEach(() => {
    vi.useRealTimers();
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
  });
});
