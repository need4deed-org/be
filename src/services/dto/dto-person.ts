import { ApiPersonGet, ApiPersonPatch } from "need4deed-sdk";
import { DeepPartial } from "typeorm";
import Person from "../../data/entity/person.entity";
import { getCoordinates } from "./utils";

export function dtoParsePerson(
  apiPerson: Omit<ApiPersonPatch, "address">,
): DeepPartial<Person> {
  return {
    firstName: apiPerson.firstName,
    middleName: apiPerson.middleName,
    lastName: apiPerson.lastName,
    email: apiPerson.email,
    phone: apiPerson.phone,
    landline: apiPerson.landline,
    avatarUrl: apiPerson.avatarUrl,
    ...(apiPerson.preferredComm !== undefined && {
      preferredCommunicationType: Array.isArray(apiPerson.preferredComm)
        ? apiPerson.preferredComm
        : [apiPerson.preferredComm].filter(Boolean),
    }),
  };
}

export function dtoSerializePerson(person: Person): ApiPersonGet {
  return person
    ? {
        id: person.id,
        firstName: person.firstName,
        middleName: person.middleName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        landline: person.landline,
        avatarUrl: person.avatarUrl,
        preferredComm: person.preferredCommunicationType,
        address: {
          id: person.addressId,
          street: person.address?.street,
          city: person.address?.city,
          postcode: {
            id: person.address?.postcode?.id,
            code: person.address?.postcode?.value,
            ...getCoordinates(person.address?.postcode),
          },
        },
      }
    : ({} as ApiPersonGet);
}
