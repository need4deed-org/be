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
