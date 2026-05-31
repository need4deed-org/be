import { AgentRoleType, UserRole } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import AgentLanguage from "../../../data/entity/m2m/agent-language";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createAddress } from "./for-routes";

export interface RegisterAgentInput {
  email: string;
  password: string;
  language?: string;
  timezone?: string;
  person: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  agent: {
    title: string;
    type?: Agent["type"];
    info?: string;
    website?: string;
    services?: Agent["services"];
    addressStreet?: string;
    addressPostcode?: string;
    districtId?: number;
    languages?: number[];
  };
}

export interface RegisterAgentResult {
  userId: number;
  agentId: number;
  personId: number;
}

/**
 * Persist a self-registered agent in one transaction:
 *   1. Person (with optional Address resolved from street + postcode)
 *   2. User (role: AGENT, isActive: false, password hashed, person linked)
 *   3. Agent (with optional Address from the same street + postcode)
 *   4. AgentPerson linking the Person to the Agent as VOLUNTEER_COORDINATOR
 *   5. AgentLanguage rows for the selected language ids (best-effort)
 *
 * Address creation is best-effort: createAddress returns null when the
 * postcode value can't be resolved, in which case the entity is saved without
 * an addressId (the column is nullable on both Person and Agent).
 *
 * The caller fires the email-verification side effect AFTER this returns
 * successfully, mirroring the POST /user pattern (fire-and-forget, not in
 * the txn — verification failure shouldn't roll back the registration).
 */
export async function writeAgentRegistration(
  input: RegisterAgentInput,
): Promise<RegisterAgentResult> {
  const passwordHash = await hashPassword(input.password);

  let result!: RegisterAgentResult;

  await dataSource.manager.transaction(async (manager) => {
    const street = input.agent.addressStreet;
    const postcodeValue = input.agent.addressPostcode;
    const address =
      street && postcodeValue
        ? await createAddress({ street }, { value: postcodeValue }, manager)
        : null;

    const personRepository = manager.getRepository(Person);
    const person = await personRepository.save(
      new Person({
        firstName: input.person.firstName,
        lastName: input.person.lastName,
        email: input.email,
        phone: input.person.phone || undefined,
        addressId: address?.id,
      }),
    );

    const userRepository = manager.getRepository(User);
    const user = await userRepository.save(
      new User({
        email: input.email,
        password: passwordHash,
        role: UserRole.AGENT,
        isActive: false,
        language: input.language ?? "en",
        timezone: input.timezone ?? "CET",
        personId: person.id,
      }),
    );

    const agentRepository = manager.getRepository(Agent);
    const agent = await agentRepository.save(
      new Agent({
        title: input.agent.title,
        type: input.agent.type,
        info: input.agent.info,
        website: input.agent.website,
        services: input.agent.services,
        districtId: input.agent.districtId,
        addressId: address?.id,
      }),
    );

    const agentPersonRepository = manager.getRepository(AgentPerson);
    await agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: person.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
      }),
    );

    if (input.agent.languages?.length) {
      const agentLanguageRepository = manager.getRepository(AgentLanguage);
      await agentLanguageRepository.save(
        input.agent.languages.map(
          (languageId) => ({ agentId: agent.id, languageId }) as AgentLanguage,
        ),
      );
    }

    result = { userId: user.id, agentId: agent.id, personId: person.id };
  });

  return result;
}

/**
 * Maps the underlying Postgres unique-violation errors to a small shape the
 * route handler can use to return a 409 with a useful field hint, without
 * leaking the raw error.
 */
export function classifyRegisterAgentConflict(
  err: unknown,
): "email" | "title" | null {
  const e = err as { code?: string; detail?: string };
  if (e?.code !== "23505" || !e.detail) {
    return null;
  }
  if (e.detail.includes("email")) {return "email";}
  if (e.detail.includes("title")) {return "title";}
  return null;
}
