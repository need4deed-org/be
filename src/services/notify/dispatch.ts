import logger from "../../logger";

export type SendStrategy = () => Promise<void>;

export async function withFallback(strategies: SendStrategy[]): Promise<void> {
  const errors: Error[] = [];
  for (const strategy of strategies) {
    try {
      await strategy();
      return;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      errors.push(error);
      logger.warn(`Notification channel failed, trying next: ${error.message}`);
    }
  }
  throw new AggregateError(errors, "All notification channels failed");
}
