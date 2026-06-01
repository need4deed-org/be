import { UserRole } from "need4deed-sdk";
import { ILike } from "typeorm";

export function getUserWhere(search?: string, role?: UserRole) {
  // `person.name` is a calculated getter (firstName + middleName + lastName),
  // so there is no column to match — search the underlying columns instead.
  return {
    ...(role ? { role } : {}),
    ...(search
      ? {
          person: [
            { firstName: ILike(`%${search}%`) },
            { middleName: ILike(`%${search}%`) },
            { lastName: ILike(`%${search}%`) },
          ],
        }
      : {}),
  };
}
