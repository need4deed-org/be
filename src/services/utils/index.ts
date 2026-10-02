import path from "path";
import { BadRequestError } from "../../config";
import { BaseError } from "../../config/error/base";

type Success<T> = readonly [T, null];
type Failure<E = Error> = readonly [null, E];
type Result<T, E = Error> = Success<T> | Failure<E>;

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

export const tryCatchFn =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T extends (...args: any[]) => ReturnType<T>>(
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

export function getErrorStatusCode(error: BaseError | Error): number {
  if (error && error instanceof BaseError) {
    const statusCode = error.statusCode;
    if (typeof statusCode === "number") {
      return statusCode;
    }
  }
  return 500;
}

export function isObject(item) {
  return Boolean(item && typeof item === "object" && !Array.isArray(item));
}

export function deepMerge(target, source) {
  if (!isObject(target)) {
    return isObject(source) ? Object.assign({}, source) : source;
  }

  const output = Object.assign({}, target);

  if (isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (key in target && isObject(target[key])) {
          output[key] = deepMerge(target[key], source[key]);
        } else {
          output[key] = Object.assign({}, source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

export function pascal2snake(pascal: string, caseTo?: "lower" | "upper") {
  const snake = pascal.replace(/([a-z0-9])([A-Z])/g, "$1_$2");

  switch (caseTo) {
    case "lower":
      return snake.toLowerCase();
    case "upper":
      return snake.toUpperCase();
    default:
  }
  return snake;
}

export function isProbablyFileSystemPath(str: string): boolean {
  if (typeof str !== "string") {
    return false;
  }
  if (/^\w+:\/\//.test(str)) {
    return false;
  }
  if (str.trim() === "") {
    return false;
  }

  return (
    path.isAbsolute(str) ||
    str.startsWith(".") ||
    str.includes("/") ||
    str.includes("\\")
  );
}

export function getDateObj(date: string, time: string): Date {
  const [hours, minutes] = time?.split(":") || "";
  const dateObj = new Date(date);
  dateObj.setHours(Number(hours));
  dateObj.setMinutes(Number(minutes));

  if (isNaN(dateObj.getTime())) {
    throw new BadRequestError("Date and/or time is invalid.");
  }

  return dateObj;
}

export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const formatTime = (date: Date): string => {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
};

export const formatAppointmentDateTime = (
  date?: Date,
): { appointmentDate: string | null; appointmentTime: string | null } => ({
  appointmentDate: date ? formatDate(date) : null,
  appointmentTime: date ? formatTime(date) : null,
});
