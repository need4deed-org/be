import {
  ApiAddress,
  ApiOrganizationContact,
  ApiOrganizationGet,
  ApiOrganizationGetList,
  Lang,
  Service,
} from "need4deed-sdk";
import Address from "../../data/entity/location/address.entity";
import Organization from "../../data/entity/organization.entity";
import Person from "../../data/entity/person.entity";
import { getCoordinates } from "./utils";

export function dtoOrganizationGetList(
  organization: Organization,
): ApiOrganizationGetList {
  return {
    id: organization.id,
    title: organization.title,
  };
}

function dtoOrganizationAddress(address?: Address | null): ApiAddress | null {
  if (!address) {
    return null;
  }
  return {
    id: address.id,
    street: address.street,
    city: address.city,
    postcode: {
      id: address.postcode?.id,
      code: address.postcode?.value,
      ...getCoordinates(address.postcode),
    },
  };
}

function dtoOrganizationContact(person: Person): ApiOrganizationContact {
  return {
    personId: person.id,
    firstName: person.firstName,
    lastName: person.lastName ?? null,
    email: person.email ?? null,
    phone: person.phone ?? null,
  };
}

export function dtoOrganizationGet(
  organization: Organization,
  agents: ApiOrganizationGet["agents"],
  services: Service[],
): ApiOrganizationGet {
  return {
    id: organization.id,
    title: organization.title,
    website: organization.website ?? null,
    address: dtoOrganizationAddress(organization.address),
    about: organization.about ?? null,
    email: organization.email ?? null,
    phone: organization.phone ?? null,
    services,
    contacts: organization.person
      ? [dtoOrganizationContact(organization.person)]
      : [],
    agents,
    originalLanguage:
      (organization.originalLanguage?.isoCode as Lang | undefined) ?? Lang.DE,
  };
}
