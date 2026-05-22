import { ILike } from "typeorm";

export function getUserWhere(search?: string) {
  // `person.name` is a calculated getter (firstName + middleName + lastName),
  // so there is no column to match — search the underlying columns instead.
  return {
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
