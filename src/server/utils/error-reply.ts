import { BaseError, ConflictError, NotFoundError } from "../../config";

type HandledError = Error & {
  statusCode?: number;
  validation?: unknown;
  code?: string;
  detail?: string;
};

type ErrorReply = { statusCode: number; body: Record<string, unknown> };

const PG_UNIQUE_VIOLATION = "23505";

function toBaseError(error: HandledError): BaseError | undefined {
  if (error instanceof BaseError) {
    return error;
  }
  if (error.name === "EntityNotFoundError") {
    return new NotFoundError();
  }
  if (error.name === "QueryFailedError" && error.code === PG_UNIQUE_VIOLATION) {
    return new ConflictError(error.detail ?? "");
  }
  return undefined;
}

export function getErrorReply(error: HandledError): ErrorReply {
  const baseError = toBaseError(error);
  if (baseError) {
    return {
      statusCode: baseError.statusCode,
      body: {
        error: baseError.constructor.name,
        message: baseError.message,
        ...baseError.details,
      },
    };
  }

  if (error.validation) {
    return { statusCode: 400, body: { message: "Validation failed." } };
  }

  if (error.name === "UpdateValuesMissingError") {
    return { statusCode: 400, body: { message: "There's nothing to update." } };
  }

  // Plugin errors with their own client status, e.g. multipart's 413.
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return { statusCode: error.statusCode, body: { message: error.message } };
  }

  return { statusCode: 500, body: { message: "Something went wrong." } };
}
