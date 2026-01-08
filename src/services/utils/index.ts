import { BaseError } from "../../config/error/base";

type Success<T> = readonly [T, null];
type Failure<E = Error> = readonly [null, E];
type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Wraps an asynchronous Promise and converts its outcome into a Result<T, E> type.
 * A successful Promise resolves to [value, null].
 * A rejected Promise is caught and resolves to [null, error].
 *
 * @param promise The Promise to execute.
 * @returns A Promise that resolves to a Result tuple.
 */
export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const result = await promise;
    return [result, null] as const;
  } catch (error) {
    return [null, error as E] as const;
  }
}

/**
 * Extracts the HTTP status code from an error object.
 * * If the error is an instance of `BaseError` and contains a valid numeric
 * status code, that code is returned. Otherwise, it defaults to 500.
 *
 * @param {BaseError | Error} error - The error object to inspect.
 * @returns {number} The extracted HTTP status code or 500 if not found.
 * * @example
 * const code = getErrorStatusCode(new BaseError("Not Found", 404)); // returns 404
 * const defaultCode = getErrorStatusCode(new Error("Generic error")); // returns 500
 */
export function getErrorStatusCode(error: BaseError | Error): number {
  if (error && error instanceof BaseError) {
    const statusCode = error.statusCode;
    if (typeof statusCode === "number") {
      return statusCode;
    }
  }
  return 500; // Default to Internal Server Error
}
