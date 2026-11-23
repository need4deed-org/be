import { hostname } from "node:os";
import { inspect } from "node:util";
import type { Logger } from "pino";
import { isDryRun, slackWebhookUrls } from "./server/plugins/notify";
import { SlackWebhookTransport } from "./services/notify/transports/slack-webhook";

const STACK_LINES = 12;
const REASON_CHARS = 500;
const EXIT_CODE = 1;

export interface FatalDeps {
  logger: Pick<Logger, "fatal" | "flush">;
  exit: (code: number) => void;
  alertOps: (text: string) => Promise<void>;
  timeoutMs: number;
}

export interface FatalHandler {
  onFatal: (kind: string, reason: unknown) => void;
  isExiting: () => boolean;
}

export function toError(reason: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }
  const error = new Error(
    inspect(reason, { depth: 2, breakLength: Infinity }).slice(0, REASON_CHARS),
  );
  error.stack = `${error.name}: ${error.message}`;
  return error;
}

const unfence = (text: string) => text.replaceAll("```", "'''");

export function fatalAlertText(kind: string, error: Error): string {
  const stack = (error.stack ?? `${error.name}: ${error.message}`)
    .split("\n")
    .slice(0, STACK_LINES)
    .join("\n");
  return `be on ${hostname()} is exiting (${kind}): ${unfence(error.message)}\n\`\`\`${unfence(stack)}\`\`\``;
}

export async function alertOpsSlack(text: string): Promise<void> {
  if (isDryRun("SLACK")) {
    return;
  }
  await new SlackWebhookTransport(slackWebhookUrls()).send({
    channel: "ops",
    text,
  });
}

export function createFatalHandler(deps: FatalDeps): FatalHandler {
  let exiting = false;

  const onFatal = (kind: string, reason: unknown) => {
    const error = toError(reason);
    const logged = { err: error };
    if (exiting) {
      deps.logger.fatal(logged, `${kind} while exiting`);
      return;
    }
    exiting = true;
    deps.logger.fatal(logged, `${kind}, exiting`);

    const forceExit = setTimeout(() => deps.exit(EXIT_CODE), deps.timeoutMs);
    deps
      .alertOps(fatalAlertText(kind, error))
      .catch((alertError: unknown) => {
        deps.logger.fatal(
          { err: toError(alertError) },
          "ops alert for the fatal error failed",
        );
      })
      .finally(() => {
        deps.logger.flush(() => {
          clearTimeout(forceExit);
          deps.exit(EXIT_CODE);
        });
      });
  };

  return { onFatal, isExiting: () => exiting };
}

export function installFatalHandlers(
  onFatal: FatalHandler["onFatal"],
  target: Pick<typeof process, "on"> = process,
): void {
  target.on("uncaughtException", (err) => onFatal("uncaughtException", err));
  target.on("unhandledRejection", (reason) =>
    onFatal("unhandledRejection", reason),
  );
}
