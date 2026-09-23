import {
  AgentMembershipStatus,
  ApiAgentContactPost,
  UserRole,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { dataSource } from "../../../data/data-source";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";
import { createAddress } from "./for-routes";

// Only a Person who already has an AGENT-role User represents someone with
// real, existing NGO login access — that's the one case where linking
// (rather than creating a duplicate Person) actually grants them access to
// this agent too, mirroring what joinAgent (write-agent-registration.ts)
// does for self-service registration (be#1048). A match on a VOLUNTEER/
// COORDINATOR-only Person, or no match at all, falls through to the
// existing new-Person path unchanged.
//
// Matches on Person.email OR any linked User's email — Person.email is
// often unset for agent-side people, with the real identifying email living
// on the User row instead (same reasoning as resolveJoinStatus in
// write-agent-registration.ts).
//
// Doesn't reuse getOrCreateSubmitterPerson (opportunity-legacy's rac_email
// linking) — that helper links unconditionally regardless of whether the
// matched Person has any User at all, which is right for its own use case
// (submitter tracking) but wrong here: granting a real NGO membership is a
// higher-stakes action than that submitter-tracking link.
async function findExistingAgentUserPerson(
  manager: EntityManager,
  email: string,
): Promise<Person | null> {
  const person = await getRepository(manager, Person)
    .createQueryBuilder("person")
    .leftJoinAndSelect("person.users", "users")
    .where("person.email ILIKE :email", { email })
    .orWhere("users.email ILIKE :email", { email })
    .getOne();

  const hasAgentUser = person?.users?.some(
    (user) => user.role === UserRole.AGENT,
  );
  return hasAgentUser ? person! : null;
}

/**
 * Adds a contact to an existing agent, from that agent's own profile —
 * distinct from the self-registration flow (write-agent-registration.ts),
 * which only ever links the *authenticated caller's own* person.
 *
 * If `input.email` matches an existing Person who already has an AGENT-role
 * User, links that existing Person with a new AgentPerson membership
 * (ACTIVE immediately — a coordinator/admin doing this deliberately is
 * itself the approval, same reasoning as joinAgent) instead of creating a
 * duplicate, disconnected Person (be#1048). Idempotent: an existing
 * membership for the same (agent, person, role) is returned as-is.
 *
 * Otherwise (no email, or no matching AGENT-role Person), behavior is
 * unchanged: always creates a brand-new Person. Address is best-effort: if
 * street+postcode are given but the postcode doesn't resolve to a known
 * Postcode, the contact is still created without an address rather than
 * failing the whole request. Person + AgentPerson are written in one
 * transaction so a partial failure can't leave an orphan Person with no
 * membership.
 */
export async function createAgentContact(
  agentId: number,
  input: ApiAgentContactPost,
): Promise<AgentPerson> {
  let result!: AgentPerson;

  await dataSource.manager.transaction(async (manager) => {
    const personRepository = getRepository(manager, Person);
    const agentPersonRepository = getRepository(manager, AgentPerson);

    const existingPerson = input.email
      ? await findExistingAgentUserPerson(manager, input.email)
      : null;

    if (existingPerson) {
      const existingMembership = await agentPersonRepository.findOne({
        where: { agentId, personId: existingPerson.id, role: input.role },
      });
      const agentPerson =
        existingMembership ??
        (await agentPersonRepository.save(
          new AgentPerson({
            agentId,
            personId: existingPerson.id,
            role: input.role,
            status: AgentMembershipStatus.ACTIVE,
          }),
        ));
      agentPerson.person = existingPerson;
      result = agentPerson;
      return;
    }

    let addressId: number | undefined;
    if (input.addressStreet && input.addressPostcode) {
      const address = await createAddress(
        { street: input.addressStreet },
        { value: input.addressPostcode },
        manager,
      );
      addressId = address?.id;
    }

    const person = await personRepository.save(
      new Person({
        firstName: input.firstName,
        middleName: input.middleName || undefined,
        lastName: input.lastName,
        email: input.email || undefined,
        phone: input.phone || undefined,
        landline: input.landline || undefined,
        addressId,
      }),
    );

    const agentPerson = await agentPersonRepository.save(
      new AgentPerson({
        agentId,
        personId: person.id,
        role: input.role,
      }),
    );
    agentPerson.person = person;

    result = agentPerson;
  });

  return result;
}
