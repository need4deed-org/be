import { AgentRoleType, OpportunityLegacyFormData } from "need4deed-sdk";
import { DataSource, EntityManager, ILike } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";
import { getNameFields } from "../../../services/dto/utils";
import { createAddress, patchOrReplaceAddress } from "./for-routes";

type SubmitterFields = Pick<
  OpportunityLegacyFormData,
  "rac_email" | "rac_full_name" | "rac_phone"
> &
  Partial<Pick<OpportunityLegacyFormData, "rac_address" | "rac_plz">>;

const FALLBACK_PLZ = "12345";

export const DUMMY_ADDRESS_TITLE = "Dummy";

export function streetFromAddress(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/[\s,]*\b\d{5}\b.*$/, "").trim();
}

async function syncSubmitterAddress(
  person: Person,
  body: SubmitterFields,
  manager: DataSource | EntityManager,
): Promise<void> {
  const street = streetFromAddress(body.rac_address);
  const plz = (body.rac_plz ?? "").trim();
  if (!street && !plz) {
    return;
  }

  const postcodeRepository = getRepository(manager, Postcode);
  const resolved = plz
    ? await postcodeRepository.findOneBy({ value: plz })
    : null;

  if (person.addressId) {
    if (!street && !resolved) {
      return;
    }
    const addressData: Partial<Address> & { id: number } = {
      id: person.addressId,
    };
    if (street) {
      addressData.street = street;
    }
    const patched = await patchOrReplaceAddress(
      person.id,
      addressData,
      resolved ? { id: resolved.id } : {},
      manager,
    );
    if (patched) {
      return;
    }
  }

  const address = await createAddress(
    { street: street || undefined },
    resolved ? { id: resolved.id } : { value: FALLBACK_PLZ },
    manager,
  );
  if (address) {
    person.addressId = address.id;
    await getRepository(manager, Person).update(
      { id: person.id },
      { addressId: address.id },
    );
  }
}

function resolveName(
  rawName: string | undefined,
  email: string,
): { firstName: string; middleName?: string; lastName?: string } {
  const { firstName, middleName, lastName } = getNameFields(
    (rawName ?? "").trim(),
  );
  return {
    firstName: firstName || email.split("@")[0] || "unknown",
    middleName,
    lastName,
  };
}

export async function getOrCreateSubmitterPerson(
  body: SubmitterFields,
  agentId: number,
  manager: DataSource | EntityManager = dataSource,
): Promise<Person | null> {
  const email = (body.rac_email ?? "").trim();
  if (!email) {
    return null;
  }

  const personRepository = getRepository(manager, Person);
  const agentPersonRepository = getRepository(manager, AgentPerson);

  let person = await personRepository.findOne({
    where: { email: ILike(email) },
  });

  if (!person) {
    const { firstName, middleName, lastName } = resolveName(
      body.rac_full_name,
      email,
    );
    person = await personRepository.save(
      new Person({
        firstName,
        middleName,
        lastName,
        email,
        phone: body.rac_phone || undefined,
      }),
    );
  } else {
    let dirty = false;
    const fullName = (body.rac_full_name ?? "").trim();
    if (fullName) {
      const { firstName, middleName, lastName } = resolveName(fullName, email);
      person.firstName = firstName;
      person.middleName = middleName ?? (null as unknown as undefined);
      person.lastName = lastName ?? (null as unknown as undefined);
      dirty = true;
    }
    const phone = (body.rac_phone ?? "").trim();
    if (phone) {
      person.phone = phone;
      dirty = true;
    }
    if (dirty) {
      person = await personRepository.save(person);
    }
  }

  await syncSubmitterAddress(person, body, manager);

  const existingLink = await agentPersonRepository.findOne({
    where: { agentId, personId: person.id },
  });
  if (!existingLink) {
    await agentPersonRepository.save(
      new AgentPerson({
        agentId,
        personId: person.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
      }),
    );
  }

  return person;
}
