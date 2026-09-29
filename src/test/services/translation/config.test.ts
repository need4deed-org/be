import { Lang } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRANSLATION_MODEL,
  getTranslationConfig,
} from "../../../services/translation/config";
import { FakeProvider } from "../../../services/translation/providers/fake";

describe("getTranslationConfig", () => {
  it("is disabled by default, with the spike's model and limits", () => {
    const config = getTranslationConfig({});
    expect(config.enabled).toBe(false);
    expect(config.model).toBe(DEFAULT_TRANSLATION_MODEL);
    expect(config.cronSchedule).toBe("* * * * *");
    expect(config.maxRequestsPerMinute).toBe(45);
    expect(config.token).toBeUndefined();
  });

  it("reads the environment", () => {
    const config = getTranslationConfig({
      TRANSLATION_ENABLED: "true",
      INFOMANIAK_AI_PRODUCT_ID: "111768",
      INFOMANIAK_AI_TOKEN: "token",
      INFOMANIAK_AI_MODEL: "some/model",
      CRON_SCHEDULE_TRANSLATION: "*/5 * * * *",
      TRANSLATION_MAX_RPM: "20",
    });
    expect(config).toMatchObject({
      enabled: true,
      productId: "111768",
      token: "token",
      model: "some/model",
      cronSchedule: "*/5 * * * *",
      maxRequestsPerMinute: 20,
    });
  });

  it("ignores an invalid rate limit", () => {
    expect(
      getTranslationConfig({ TRANSLATION_MAX_RPM: "-3" }).maxRequestsPerMinute,
    ).toBe(45);
  });
});

describe("FakeProvider", () => {
  it("answers deterministically and records requests", async () => {
    const provider = new FakeProvider();
    const request = {
      text: "Kinderbetreuung",
      targetLang: Lang.EN,
      glossary: [],
    };
    expect(await provider.translate(request)).toEqual({
      status: "ok",
      text: "[en] Kinderbetreuung",
      model: "fake",
    });
    expect(provider.requests).toEqual([request]);
  });

  it("lets a test choose the outcome", async () => {
    const provider = new FakeProvider(() => ({
      status: "error",
      kind: "rate_limited",
    }));
    expect(
      await provider.translate({
        text: "x",
        targetLang: Lang.DE,
        glossary: [],
      }),
    ).toEqual({ status: "error", kind: "rate_limited" });
  });
});
