import { Lang } from "need4deed-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import logger from "../../../logger";
import { InfomaniakProvider } from "../../../services/translation/providers/infomaniak";

const SECRET_TEXT = "Frau L. hat einen Termin beim Kardiologen";
const request = {
  text: SECRET_TEXT,
  targetLang: Lang.EN,
  glossary: [{ de: "Sprachcafé", en: "language café" }],
};
const provider = new InfomaniakProvider({
  productId: "111768",
  token: "secret-token",
  model: "mistralai/Mistral-Small-4-119B-2603",
  timeoutMs: 20_000,
});

const fetchMock = vi.fn();

function completion(content: unknown, extra: object = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      model: "mistralai/Mistral-Small-4-119B-2603",
      choices: [
        {
          message: {
            content:
              typeof content === "string" ? content : JSON.stringify(content),
          },
        },
      ],
      usage: { prompt_tokens: 364, completion_tokens: 32 },
      ...extra,
    }),
  };
}

const errorStatus = (status: number) => ({
  ok: false,
  status,
  json: async () => ({ error: { message: SECRET_TEXT } }),
});

// Everything any logger call received, as one string.
function loggedText(spies: ReturnType<typeof vi.spyOn>[]): string {
  return JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("InfomaniakProvider", () => {
  it("sends one field as strict json_schema chat completion", async () => {
    fetchMock.mockResolvedValueOnce(
      completion({ text: "Ms L. has an appointment" }),
    );

    await provider.translate(request);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.infomaniak.com/2/ai/111768/openai/v1/chat/completions",
    );
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer secret-token");
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(init.body);
    expect(body.model).toBe("mistralai/Mistral-Small-4-119B-2603");
    expect(body.temperature).toBe(0);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("into English");
    expect(body.messages[0].content).toContain("- Sprachcafé = language café");
    // The text only ever travels JSON-encoded in the user message.
    expect(body.messages[0].content).not.toContain(SECRET_TEXT);
    expect(JSON.parse(body.messages[1].content)).toEqual({
      targetLang: "en",
      text: SECRET_TEXT,
    });
  });

  it("returns the translation with model and usage", async () => {
    fetchMock.mockResolvedValueOnce(
      completion({ text: "Ms L. has an appointment" }),
    );

    expect(await provider.translate(request)).toEqual({
      status: "ok",
      text: "Ms L. has an appointment",
      model: "mistralai/Mistral-Small-4-119B-2603",
      usage: { promptTokens: 364, completionTokens: 32 },
    });
  });

  it("classifies failures", async () => {
    fetchMock.mockResolvedValueOnce(errorStatus(429));
    expect(await provider.translate(request)).toEqual({
      status: "error",
      kind: "rate_limited",
    });

    fetchMock.mockResolvedValueOnce(errorStatus(503));
    expect(await provider.translate(request)).toMatchObject({
      kind: "unavailable",
    });

    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error("timed out"), { name: "TimeoutError" }),
    );
    expect(await provider.translate(request)).toMatchObject({
      kind: "unavailable",
    });

    fetchMock.mockResolvedValueOnce(errorStatus(400));
    expect(await provider.translate(request)).toMatchObject({
      kind: "bad_response",
    });
  });

  it("treats anything but {text: string} as a bad response", async () => {
    for (const content of ["not json", { translation: "x" }, { text: 42 }]) {
      fetchMock.mockResolvedValueOnce(completion(content));
      expect(await provider.translate(request)).toEqual({
        status: "error",
        kind: "bad_response",
      });
    }
    fetchMock.mockResolvedValueOnce(completion("", { choices: [] }));
    expect(await provider.translate(request)).toMatchObject({
      kind: "bad_response",
    });
  });

  it("never logs source or translated text", async () => {
    const spies = [
      vi.spyOn(logger, "debug"),
      vi.spyOn(logger, "info"),
      vi.spyOn(logger, "warn"),
      vi.spyOn(logger, "error"),
    ];
    fetchMock
      .mockResolvedValueOnce(completion({ text: "Ms L. has an appointment" }))
      .mockResolvedValueOnce(errorStatus(400))
      .mockResolvedValueOnce(completion("not json"));

    for (let i = 0; i < 3; i++) {
      await provider.translate(request);
    }

    const logged = loggedText(spies);
    expect(logged).not.toContain("Frau L.");
    expect(logged).not.toContain("Ms L.");
    expect(logged).not.toContain("secret-token");
  });
});
