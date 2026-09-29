import {
  ProviderResult,
  TranslationProvider,
  TranslationRequest,
} from "../types";

/**
 * Deterministic stand-in used in tests and when no Infomaniak token is set,
 * so neither ever touches the network. Returns "[<lang>] <text>". That passes
 * validation for short texts only: a long text comes back nearly unchanged,
 * which the same-language guard rejects as `source_is_target`. Tests that
 * need other outcomes pass `respond`.
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
