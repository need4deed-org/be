import {
  ProviderResult,
  TranslationProvider,
  TranslationRequest,
} from "../types";

const MAX_RECORDED_REQUESTS = 100;

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
