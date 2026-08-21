export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  // Extra fields merged into the error response body alongside `error` +
  // `message` (see the global error handler in src/server/index.ts) — for
  // subclasses that need to carry structured data (e.g. a conflicting
  // resource's id) beyond a plain message.
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
