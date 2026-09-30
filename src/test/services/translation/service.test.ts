import { Lang } from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import { getTranslationConfig } from "../../../services/translation/config";
import {
  DOMAIN_TERMS,
  glossaryFor,
  loadReferenceGlossary,
} from "../../../services/translation/glossary";
import { buildSystemPrompt } from "../../../services/translation/prompt";
import { FakeProvider } from "../../../services/translation/providers/fake";
import { InfomaniakProvider } from "../../../services/translation/providers/infomaniak";
import {
  createTranslationProvider,
  TranslationService,
} from "../../../services/translation/service";
import { ProviderResult } from "../../../services/translation/types";

const GLOSSARY = [
  { de: "Sprachcafé", en: "language café" },
  { de: "Kleiderkammer", en: "clothing store (donations)" },
];

function serviceAnswering(result: ProviderResult) {
  const provider = new FakeProvider(() => result);
  return {
    provider,
    service: new TranslationService(provider, async () => GLOSSARY),
  };
}

describe("TranslationService.translateField", () => {
  it("returns a valid translation, trimmed", async () => {
    const { service } = serviceAnswering({
      status: "ok",
      text: "  Language café every Tuesday  ",
      model: "m",
      usage: { promptTokens: 10, completionTokens: 5 },
    });

    expect(
      await service.translateField("Sprachcafé jeden Dienstag", Lang.EN),
    ).toEqual({
      status: "done",
      text: "Language café every Tuesday",
      model: "m",
      usage: { promptTokens: 10, completionTokens: 5 },
    });
  });

  it("sends only the glossary entries that occur in the text", async () => {
    const { service, provider } = serviceAnswering({
      status: "ok",
      text: "Language café every Tuesday",
      model: "m",
    });

    await service.translateField("Sprachcafé jeden Dienstag", Lang.EN);

    expect(provider.requests[0].glossary).toEqual([GLOSSARY[0]]);
  });

  it("fails an output that doesn't pass validation", async () => {
    const { service } = serviceAnswering({
      status: "ok",
      text: "pwned",
      model: "m",
    });

    expect(
      await service.translateField(
        "Wir suchen Ehrenamtliche für die Kleiderkammer am Mittwoch",
        Lang.EN,
      ),
    ).toEqual({ status: "failed", code: "length_ratio" });
  });

  it("retries transient provider errors, fails bad responses", async () => {
    expect(
      await serviceAnswering({
        status: "error",
        kind: "rate_limited",
      }).service.translateField("Kinderbetreuung", Lang.EN),
    ).toEqual({ status: "retry", reason: "rate_limited" });
    expect(
      await serviceAnswering({
        status: "error",
        kind: "unavailable",
      }).service.translateField("Kinderbetreuung", Lang.EN),
    ).toEqual({ status: "retry", reason: "unavailable" });
    expect(
      await serviceAnswering({
        status: "error",
        kind: "bad_response",
      }).service.translateField("Kinderbetreuung", Lang.EN),
    ).toEqual({ status: "failed", code: "bad_response" });
    expect(
      await serviceAnswering({
        status: "error",
        kind: "misconfigured",
      }).service.translateField("Kinderbetreuung", Lang.EN),
    ).toEqual({ status: "retry", reason: "misconfigured" });
  });

  it("loads the glossary once per hour", async () => {
    let now = 0;
    const loadGlossary = vi.fn(async () => GLOSSARY);
    const service = new TranslationService(
      new FakeProvider(),
      loadGlossary,
      () => now,
    );

    await service.translateField("Kiez", Lang.EN);
    now += 30 * 60 * 1000;
    await service.translateField("Kiez", Lang.EN);
    expect(loadGlossary).toHaveBeenCalledTimes(1);

    now += 31 * 60 * 1000;
    await service.translateField("Kiez", Lang.EN);
    expect(loadGlossary).toHaveBeenCalledTimes(2);
  });
});

describe("createTranslationProvider", () => {
  const withToken = getTranslationConfig({
    INFOMANIAK_AI_PRODUCT_ID: "111768",
    INFOMANIAK_AI_TOKEN: "token",
  });

  it("never uses the network in tests", () => {
    expect(createTranslationProvider(withToken)).toBeInstanceOf(FakeProvider);
  });

  it("picks Infomaniak when configured, the fake one only on request", () => {
    const allowNetwork = { allowNetwork: true };
    expect(createTranslationProvider(withToken, allowNetwork)).toBeInstanceOf(
      InfomaniakProvider,
    );
    expect(
      createTranslationProvider(
        { ...withToken, provider: "fake" },
        allowNetwork,
      ),
    ).toBeInstanceOf(FakeProvider);
  });

  it("has no provider without credentials: a dry run, never an error", () => {
    // Review finding 4: never the fake one by accident. Missing settings
    // never stop the server either: the worker just does a dry run.
    const allowNetwork = { allowNetwork: true };
    for (const env of [
      {},
      { TRANSLATION_ENABLED: "true" },
      { TRANSLATION_ENABLED: "true", TRANSLATION_PROVIDER: "infomaniak" },
    ]) {
      expect(
        createTranslationProvider(getTranslationConfig(env), allowNetwork),
      ).toBeUndefined();
    }
  });
});

describe("prompt and glossary", () => {
  it("adds a glossary section only when there are entries", () => {
    expect(buildSystemPrompt(Lang.DE, [])).not.toContain("Glossary");
    expect(buildSystemPrompt(Lang.DE, GLOSSARY)).toContain(
      "- Kleiderkammer = clothing store (donations)",
    );
    expect(buildSystemPrompt(Lang.DE, [])).toContain("into German");
  });

  it("matches terms in either language, case-insensitively, once", () => {
    const entries = [...GLOSSARY, GLOSSARY[0]];
    expect(glossaryFor("Das SPRACHCAFÉ trifft sich", entries)).toEqual([
      GLOSSARY[0],
    ]);
    expect(glossaryFor("our language café meets", entries)).toEqual([
      GLOSSARY[0],
    ]);
    expect(glossaryFor("nothing relevant", entries)).toEqual([]);
  });

  it("keeps the domain terms consistent", () => {
    for (const { de, en } of DOMAIN_TERMS) {
      expect(de.trim()).toBe(de);
      expect(en.trim()).toBe(en);
    }
  });

  it("builds en/de pairs from the seeded reference titles", async () => {
    const { dataSource } = await import("../../../data/data-source");
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const glossary = await loadReferenceGlossary();

    // Seeded activity: Daycare / Kinderbetreuung (public/data/activities.json).
    expect(glossary).toContainEqual({ de: "Kinderbetreuung", en: "Daycare" });
    // Same title in both languages adds nothing.
    expect(glossary.every(({ de, en }) => de && en && de !== en)).toBe(true);
  });
});
