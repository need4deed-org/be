import { hostname } from "node:os";
import type { Logger } from "pino";
import { isDryRun, slackWebhookUrls } from "./server/plugins/notify";
import { SlackWebhookTransport } from "./services/notify/transports/slack-webhook";

const STACK_LINES = 12;
const EXIT_CODE = 1;

export interface FatalDeps {
  logger: Pick<Logger, "fatal" | "flush">;
  exit: (code: number) => void;
  alertOps: (text: string) => Promise<void>;
  timeoutMs: number;
}

export function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

export function fatalAlertText(kind: string, error: Error): string {
  const stack = (error.stack ?? `${error.name}: ${error.message}`)
    .split("\n")
    .slice(0, STACK_LINES)
    .join("\n");
  return `be on ${hostname()} is exiting (${kind}): ${error.message}\n\`\`\`${stack}\`\`\``;
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

export function createFatalHandler(
  deps: FatalDeps,
): (kind: string, reason: unknown) => void {
  let exiting = false;

  return (kind, reason) => {
    const error = toError(reason);
    if (exiting) {
      deps.logger.fatal({ err: error }, `${kind} while exiting`);
      return;
    }
    exiting = true;
    deps.logger.fatal({ err: error }, `${kind}, exiting`);

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
}

export function installFatalHandlers(
  onFatal: (kind: string, reason: unknown) => void,
  target: Pick<typeof process, "on"> = process,
): void {
  target.on("uncaughtException", (err) => onFatal("uncaughtException", err));
  target.on("unhandledRejection", (reason) =>
    onFatal("unhandledRejection", reason),
  );
}
