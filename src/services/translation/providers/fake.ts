import {
  ProviderResult,
  TranslationProvider,
  TranslationRequest,
} from "../types";

// Enough for any test; bounded so a long-running server with
// TRANSLATION_PROVIDER=fake (e.g. staging) doesn't keep every text.
const MAX_RECORDED_REQUESTS = 100;

/**
 * Deterministic stand-in used in tests and when TRANSLATION_PROVIDER=fake,
 * so neither ever touches the network. Returns "[<lang>] <text>". That passes
 * validation for short texts only: a long text comes back nearly unchanged,
 * which the same-language guard rejects as `source_is_target`. Tests that
 * need other outcomes pass `respond`; `requests` keeps the last 100.
 */
export class FakeProvider implements TranslationProvider {
  readonly name = "fake";
  readonly requests: TranslationRequest[] = [];

  constructor(
    private readonly respond?: (
      request: TranslationRequest,
    ) => ProviderResult | Promise<ProviderResult>,
  ) {}

  async translate(request: TranslationRequest): Promise<ProviderResult> {
    this.requests.push(request);
    if (this.requests.length > MAX_RECORDED_REQUESTS) {
      this.requests.shift();
    }
    if (this.respond) {
      return this.respond(request);
    }
    return {
      status: "ok",
      text: `[${request.targetLang}] ${request.text}`,
      model: "fake",
    };
  }
}
