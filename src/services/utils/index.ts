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
 * A higher-order function that wraps a synchronous function in a try/catch block.
 * * If the wrapped function executes successfully, it returns the result.
 * If it throws an error, the error is passed to the provided logger
 * and the function returns `null`.
 *
 * @template T - A function type that represents the function being wrapped.
 * * @param {T} fn - The synchronous function to be executed safely.
 * @param {(err: unknown) => void} logger - A callback function to handle or log errors.
 * * @returns {(...args: Parameters<T>) => (ReturnType<T> | null)}
 * A new function that accepts the same arguments as `fn` and returns its result or `null`.
 * * @example
 * const parseData = (json: string) => JSON.parse(json);
 * const safeParse = tryCatchFn(parseData, console.error);
 * * const result = safeParse('{"valid": "json"}'); // Returns { valid: "json" }
 * const badResult = safeParse('invalid-json');   // Logs error and returns null
 */
export const tryCatchFn =
  <T extends (...args: unknown[]) => ReturnType<T>>(
    fn: T,
    logger: (err: unknown) => void,
  ) =>
  (...args: Parameters<T>): ReturnType<T> | null => {
    try {
      return fn(...args);
    } catch (error) {
      logger(error);
      return null;
    }
  };

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

export function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

export function deepMerge(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}
