import { UserRole } from "need4deed-sdk";
import { ILike } from "typeorm";

export function getUserWhere(search?: string, role?: UserRole) {
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
