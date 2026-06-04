import { AgentRoleType, OpportunityLegacyFormData } from "need4deed-sdk";
import { DataSource, EntityManager, ILike } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";
import { getNameFields } from "../../../services/dto/utils";
import { createAddress, patchAddress } from "./for-routes";

// rac_address / rac_plz are optional so existing callers that only carry the
// name/phone/email blob (e.g. backfill migrations) still satisfy the type.
type SubmitterFields = Pick<
  OpportunityLegacyFormData,
  "rac_email" | "rac_full_name" | "rac_phone"
> &
  Partial<Pick<OpportunityLegacyFormData, "rac_address" | "rac_plz">>;

// An Address row cannot exist without a Postcode (NOT NULL). When a brand-new
// submitter address is created and rac_plz doesn't resolve to a known Postcode,
// fall back to this value rather than dropping the address entirely.
const FALLBACK_PLZ = "12345";

// Seeded placeholder address (see seeds/user.seed.ts) used for "unknown
// address". It is shared by many Person rows, so it must never be patched in
// place — a fresh Address is minted instead.
const DUMMY_ADDRESS_TITLE = "Dummy";

/**
 * Extract the street portion of a free-text address, cutting the German 5-digit
 * postcode and the city that follows it (e.g. "Musterstr. 1, 12345 Berlin" ->
 * "Musterstr. 1"). Returns "" when nothing usable remains.
 */
export function streetFromAddress(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return "";
  }
  // Drop the first 5-digit postcode and everything after it, plus any
  // separator (comma/whitespace) immediately preceding it.
  return trimmed.replace(/[\s,]*\b\d{5}\b.*$/, "").trim();
}

/**
 * Patch (or create) the submitter Person's Address from rac_address / rac_plz.
 *
 *   - rac_address -> address.street (postcode + city stripped).
 *   - rac_plz     -> resolved to an existing Postcode by value (never created).
 *
 * The person's address is patched in place only when they own a real,
 * non-placeholder Address. When they have no address, or only the shared
 * "Dummy" placeholder, a fresh Address is created and the person re-pointed at
 * it (so we never mutate an address other Person rows depend on):
 *
 *       - own real address + plz resolves -> update street/postcode.
 *       - own real address + plz unknown  -> update street, leave postcode.
 *       - no address / Dummy              -> create one, falling back to
 *         FALLBACK_PLZ when rac_plz does not resolve (Address needs a Postcode).
 */
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

  // Only patch an address the submitter exclusively owns. The seeded "Dummy"
  // placeholder is shared across many Person rows, so treat it as "no address"
  // and mint a dedicated one below instead of corrupting the shared row.
  let ownAddress: Address | null = null;
  if (person.addressId) {
    const current = await getRepository(manager, Address).findOneBy({
      id: person.addressId,
    });
    if (current && current.title !== DUMMY_ADDRESS_TITLE) {
      ownAddress = current;
    }
  }

  if (ownAddress) {
    if (!street && !resolved) {
      return; // nothing to change (street empty, plz unknown)
    }
    const addressData: Partial<Address> = { id: ownAddress.id };
    if (street) {
      addressData.street = street;
    }
    // resolved ? set postcode : leave the existing postcode untouched.
    await patchAddress(
      addressData,
      resolved ? { id: resolved.id } : {},
      manager,
    );
    return;
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

/**
 * Split a full name into first / middle / last via the shared getNameFields
 * helper (first token -> firstName, last token -> lastName, the rest ->
 * middleName). Falls back to the email local-part for firstName when the name
 * is empty, since Person.firstName is required.
 */
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

/**
 * Resolve a Person + AgentPerson link for the submitter of a legacy
 * opportunity:
 *
 *   1. Empty/missing rac_email -> return null (no Person manufactured).
 *   2. Lookup by email (case-insensitive).
 *        - Found     -> overwrite the rac_* fields (name/phone) from this
 *                       submission so blank/stale records get corrected. Only
 *                       fields the form actually provides are touched, so a
 *                       later submission omitting one does not wipe good data.
 *        - Not found -> create Person from rac_*.
 *   3. Patch the Person's Address from rac_address / rac_plz (see
 *      syncSubmitterAddress).
 *   4. Either way, upsert an AgentPerson link (VOLUNTEER_COORDINATOR) for
 *      (person, agentId) when one does not already exist.
 *
 * `manager` defaults to the global dataSource; pass a transactional
 * EntityManager (or a migration's QueryRunner.manager) to make the writes
 * atomic with surrounding work.
 */
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
    // Refresh the rac_* fields from this submission so blank/stale records get
    // corrected. Only overwrite a field the form actually provides — an empty
    // rac_full_name / rac_phone must not wipe an existing good value.
    let dirty = false;
    const fullName = (body.rac_full_name ?? "").trim();
    if (fullName) {
      const { firstName, middleName, lastName } = resolveName(fullName, email);
      person.firstName = firstName;
      // Use null (not undefined) for absent name parts: TypeORM skips undefined
      // on update, which would leave stale middle/last names behind (e.g.
      // resubmitting "Cher" over "Mary van der Berg" -> "Cher van der Berg").
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
