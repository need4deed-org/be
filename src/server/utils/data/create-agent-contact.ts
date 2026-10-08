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
import { claimAgent } from "./claim-agent";
import { createAddress } from "./for-routes";

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

export async function createAgentContact(
  agentId: number,
  input: ApiAgentContactPost,
  callerRole: UserRole,
): Promise<AgentPerson> {
  let result!: AgentPerson;
  const canLinkExisting =
    callerRole === UserRole.COORDINATOR || callerRole === UserRole.ADMIN;

  await dataSource.manager.transaction(async (manager) => {
    const personRepository = getRepository(manager, Person);
    const agentPersonRepository = getRepository(manager, AgentPerson);

    const existingPerson =
      canLinkExisting && input.email
        ? await findExistingAgentUserPerson(manager, input.email)
        : null;

    if (existingPerson) {
      let agentPerson = await agentPersonRepository.findOne({
        where: { agentId, personId: existingPerson.id, role: input.role },
      });
      if (!agentPerson) {
        agentPerson = await agentPersonRepository.save(
          new AgentPerson({
            agentId,
            personId: existingPerson.id,
            role: input.role,
            status: AgentMembershipStatus.ACTIVE,
          }),
        );
      } else if (agentPerson.status === AgentMembershipStatus.PENDING) {
        agentPerson.status = AgentMembershipStatus.ACTIVE;
        agentPerson = await agentPersonRepository.save(agentPerson);
      }
      if (agentPerson.status === AgentMembershipStatus.ACTIVE) {
        await claimAgent(agentId, manager);
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
