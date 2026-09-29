import logger from "../../../logger";
import {
  buildSystemPrompt,
  buildUserMessage,
  RESPONSE_SCHEMA,
} from "../prompt";
import {
  ProviderResult,
  TranslationProvider,
  TranslationRequest,
} from "../types";

export interface InfomaniakProviderConfig {
  productId: string;
  token: string;
  model: string;
  timeoutMs: number;
}

interface ChatCompletion {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Infomaniak AI Tools, OpenAI-compatible chat completions (be#1065). One
 * field per call, temperature 0 (outputs still vary), strict json_schema
 * output. Logs status codes and token counts only, never text: request
 * and response bodies carry user-entered content.
 */
export class InfomaniakProvider implements TranslationProvider {
  readonly name = "infomaniak";

  constructor(private readonly config: InfomaniakProviderConfig) {}

  async translate(request: TranslationRequest): Promise<ProviderResult> {
    const { productId, token, model, timeoutMs } = this.config;
    const started = Date.now();

    let response: Response;
    try {
      response = await fetch(
        `https://api.infomaniak.com/2/ai/${productId}/openai/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "translation",
                strict: true,
                schema: RESPONSE_SCHEMA,
              },
            },
            messages: [
              {
                role: "system",
                content: buildSystemPrompt(
                  request.targetLang,
                  request.glossary,
                ),
              },
              {
                role: "user",
                content: buildUserMessage(request.text, request.targetLang),
              },
            ],
          }),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
    } catch (err) {
      // Timeout or network failure.
      logger.warn(
        { provider: this.name, error: (err as Error).name },
        "translation: provider request failed",
      );
      return { status: "error", kind: "unavailable" };
    }

    if (!response.ok) {
      logger.warn(
        { provider: this.name, status: response.status },
        "translation: provider returned an error status",
      );
      if (response.status === 429) {
        return { status: "error", kind: "rate_limited" };
      }
      return {
        status: "error",
        kind: response.status >= 500 ? "unavailable" : "bad_response",
      };
    }

    let text: unknown;
    let completion: ChatCompletion;
    try {
      completion = (await response.json()) as ChatCompletion;
      const content = completion.choices?.[0]?.message?.content;
      text = content ? (JSON.parse(content) as { text?: unknown }).text : null;
    } catch {
      return this.badResponse();
    }
    if (typeof text !== "string") {
      return this.badResponse();
    }

    const usage = completion.usage && {
      promptTokens: completion.usage.prompt_tokens ?? 0,
      completionTokens: completion.usage.completion_tokens ?? 0,
    };
    logger.debug(
      { provider: this.name, ms: Date.now() - started, ...usage },
      "translation: provider call done",
    );
    return { status: "ok", text, model: completion.model ?? model, usage };
  }

  private badResponse(): ProviderResult {
    logger.warn(
      { provider: this.name },
      "translation: provider response was not a translation",
    );
    return { status: "error", kind: "bad_response" };
  }
}
