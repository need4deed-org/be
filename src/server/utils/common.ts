import * as crypto from "node:crypto";
import { Lang, UserRole } from "need4deed-sdk";
import { berlinDateTimeFormat, defaultPageSize } from "../../config";

export function generateRandomString(length) {
  const numBytes = Math.ceil(length / 2);
  const buffer = crypto.randomBytes(numBytes);
  return buffer.toString("hex").slice(0, length);
}

export function getLanguageCode(isoCode: string): Lang | null {
  if (typeof isoCode !== "string") {
    return null;
  }
  const isoCodeNormalized = isoCode.toLowerCase() as Lang;
  if (Object.values(Lang).includes(isoCodeNormalized)) {
    return isoCodeNormalized;
  }

  return null;
}

export function stripNullishAttributes<T>(
  obj: T,
  nullable: Array<unknown>,
): Partial<T> {
  if (obj === null || typeof obj !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => {
      if (nullable?.includes(key)) {
        return true;
      }
      return value !== null && value !== undefined;
    }),
  ) as Partial<T>;
}

export function isEmptyPlainObject<T>(obj: T): boolean {
  if (obj === null || typeof obj !== "object") {
    return false;
  }

  const proto = Object.getPrototypeOf(obj);
  const isPlainObject = proto === Object.prototype || proto === null;

  return isPlainObject && Object.keys(obj).length === 0;
}

export function getEmptyPropsNull<
  T extends Record<string, unknown | unknown[]>,
>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  return Object.keys(obj).reduce((acc: T, key: keyof T) => {
    const val = obj[key];
    acc[key] = isEmptyPlainObject(val)
      ? null
      : (getNullFromEmptyArray(val as unknown[]) as T[keyof T]);
    return acc;
  }, {} as T);
}

export function getNullFromEmptyArray<T>(arr: T[] | null): T[] | null {
  if (arr === null || !Array.isArray(arr) || arr.length > 0) {
    return arr;
  }
  return null;
}

export function validatePermissions<E extends { userId: number }>(
  entity: E,
  roles: UserRole[],
  user: { id: number; role: UserRole },
) {
  return entity.userId === user.id || roles?.includes(user.role);
}

export function getRef(reference: string) {
  return { $ref: reference };
}

export function getSkipTake(pageLimit?: {
  page?: number;
  limit?: number;
}): [number, number] {
  function isValid(value?: number) {
    return !isNaN(Number(value)) && value! > 0;
  }

  const { page, limit } = pageLimit || {};
  const take = isValid(limit) ? limit : defaultPageSize;
  const skip = ((isValid(page) ? page : 1)! - 1) * take!;
  return [skip, take!];
}

export function formatBerlinTimestamp(d: Date = new Date()): string {
  return berlinDateTimeFormat.format(d);
}

export function getVolunteerNotificationText(
  email: string,
  name: string,
  cloneIds: number[] = [],
): string {
  return `New volunteer arrived: ${name} (${email}) at ${formatBerlinTimestamp()}${cloneIds.length > 0 ? ` (Clone IDs: ${cloneIds.join(", ")})` : ""}`;
}

export function getOpportunityNotificationText(title: string): string {
  return `New opportunity arrived: "${title}" at ${formatBerlinTimestamp()}`;
}

export type Env = Record<string, string | undefined>;

export function firstEnvValue(env: Env, names: string[]): string | undefined {
  return names.map((name) => env[name]).find((value) => value !== undefined);
}
