import { ApiPersonGet, ApiPersonPatch } from "need4deed-sdk";
import { DeepPartial } from "typeorm";
import Person from "../../data/entity/person.entity";

export function dtoParsePerson(apiPerson: ApiPersonPatch): DeepPartial<Person> {
  return {
    firstName: apiPerson.firstName,
    middleName: apiPerson.middleName,
    lastName: apiPerson.lastName,
    email: apiPerson.email,
    phone: apiPerson.phone,
    landline: apiPerson.landline,
    avatarUrl: apiPerson.avatarUrl,
    preferredCommunicationType: Array.isArray(apiPerson.preferredComm)
      ? apiPerson.preferredComm
      : [apiPerson.preferredComm].filter(Boolean),
    ...(apiPerson.address
      ? {
          address: {
            street: apiPerson.address.street,
            city: apiPerson.address.city,
            ...(apiPerson.address.postcode
              ? {
                  postcode: {
                    id: apiPerson.address.postcode?.id,
                    value: apiPerson.address.postcode?.code,
                  },
                }
              : {}),
          },
        }
      : {}),
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
            latitude: person.address?.postcode?.latitude,
            longitude: person.address?.postcode?.longitude,
          },
        },
      }
    : ({} as ApiPersonGet);
}
