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
//
// Exact, case-insensitive match on a trimmed value (LOWER(...) = LOWER(...)),
// not ILIKE: `email` is an unvalidated string reachable by any active AGENT
// member (not just coordinators/admins), and ILIKE treats `%`/`_` as
// wildcards, letting a crafted value enumerate or link other NGOs' users
// (be#1048 review). Inner-joins only AGENT-role users, so a Person with no
// User at all (e.g. a stale duplicate from before this feature existed)
// can never match, and getOne() can't pick an unrelated userless Person over
// the real AGENT-linked one (be#1048 review).
async function findExistingAgentUserPerson(
  manager: EntityManager,
  email: string,
): Promise<Person | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return getRepository(manager, Person)
    .createQueryBuilder("person")
    .innerJoinAndSelect("person.users", "users", "users.role = :role", {
      role: UserRole.AGENT,
    })
    .where("LOWER(person.email) = :email", { email: normalizedEmail })
    .orWhere("LOWER(users.email) = :email", { email: normalizedEmail })
    .getOne();
}

/**
 * Adds a contact to an existing agent, from that agent's own profile —
 * distinct from the self-registration flow (write-agent-registration.ts),
 * which only ever links the *authenticated caller's own* person.
 *
 * If `input.email` matches an existing Person who already has an AGENT-role
 * User, links that existing Person with a new AgentPerson membership instead
 * of creating a duplicate, disconnected Person (be#1048). `input`'s other
 * fields (name, phone, address, …) are ignored in this case: the existing
 * Person's own profile stays authoritative rather than being overwritten by
 * whatever the caller happened to type for someone else's account
 * (be#1048 review). Idempotent: an existing membership for the same (agent,
 * person, role) is returned as-is, except a coordinator/admin promotes a
 * PENDING one straight to ACTIVE (that's the same deliberate approval a
 * fresh link from them would represent).
 *
 * A new membership is ACTIVE immediately only for a coordinator/admin
 * caller — that action is itself the approval, same reasoning as joinAgent.
 * An AGENT caller (an active member of *some* agent, but not necessarily
 * this one or with this user's consent) instead creates a PENDING
 * membership, moderated the same way as a self-service join request via
 * GET/PATCH /agent/membership (be#1048 review).
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
  callerRole: UserRole,
): Promise<AgentPerson> {
  let result!: AgentPerson;
  const canApprove =
    callerRole === UserRole.COORDINATOR || callerRole === UserRole.ADMIN;

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
      let agentPerson = existingMembership;
      if (!agentPerson) {
        agentPerson = await agentPersonRepository.save(
          new AgentPerson({
            agentId,
            personId: existingPerson.id,
            role: input.role,
            status: canApprove
              ? AgentMembershipStatus.ACTIVE
              : AgentMembershipStatus.PENDING,
          }),
        );
      } else if (
        canApprove &&
        agentPerson.status === AgentMembershipStatus.PENDING
      ) {
        agentPerson.status = AgentMembershipStatus.ACTIVE;
        agentPerson = await agentPersonRepository.save(agentPerson);
      }
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
