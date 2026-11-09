import { FastifyInstance, LightMyRequestResponse } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import { accessCookieName } from "../../config/constants";
import { dataSource } from "../../data/data-source";
import Deal from "../../data/entity/deal.entity";
import Address from "../../data/entity/location/address.entity";
import PostcodeCommute from "../../data/entity/location/postcode-commute.entity";
import Postcode from "../../data/entity/location/postcode.entity";
import AgentPerson from "../../data/entity/m2m/agent-person";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../data/entity/opportunity/agent.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import Person from "../../data/entity/person.entity";
import User from "../../data/entity/user.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../data/types";
import { getRepository, hashPassword } from "../../data/utils";
import { randomNumericSuffix } from "../random";

const PASSWORD = "test_password";

type PostcodeKey = "home" | "noCommute" | "work" | "workOther";
export type CommuteVolunteerKey =
  | "commuter"
  | "dealOnly"
  | "nowhere"
  | "noCommute"
  | "owned";
export type CommuteOpportunityKey =
  | "ownHome"
  | "ownWork"
  | "ownOther"
  | "ownNoPostcode"
  | "foreignWork";
export type CommuteCaller = "coordinator" | "agent" | "otherAgent" | "owned";

const COMMUTES: [PostcodeKey, PostcodeKey, number][] = [
  ["home", "work", 27],
  ["home", "workOther", 30],
  ["work", "home", 3],
  ["workOther", "work", 12],
];

const VOLUNTEER_HOME: Record<
  CommuteVolunteerKey,
  { address: PostcodeKey | null; deal: PostcodeKey | null }
> = {
  commuter: { address: "home", deal: "workOther" },
  dealOnly: { address: null, deal: "home" },
  nowhere: { address: null, deal: null },
  noCommute: { address: "noCommute", deal: "home" },
  owned: { address: "home", deal: null },
};

const OPPORTUNITY_PLACE: Record<
  CommuteOpportunityKey,
  { deal: PostcodeKey | null; foreign?: boolean }
> = {
  ownHome: { deal: "home" },
  ownWork: { deal: "work" },
  ownOther: { deal: "workOther" },
  ownNoPostcode: { deal: null },
  foreignWork: { deal: "work", foreign: true },
};

const LINKS: [CommuteVolunteerKey, CommuteOpportunityKey][] = [
  ["commuter", "ownWork"],
  ["dealOnly", "ownWork"],
  ["nowhere", "ownWork"],
  ["noCommute", "ownWork"],
  ["owned", "ownWork"],
  ["commuter", "ownOther"],
  ["commuter", "ownNoPostcode"],
  ["commuter", "foreignWork"],
];

export interface CommutePairsFixture {
  agent: Agent;
  otherAgent: Agent;
  volunteers: Record<CommuteVolunteerKey, Volunteer>;
  opportunities: Record<CommuteOpportunityKey, Opportunity>;
  cookies: Record<CommuteCaller, string>;
  get: (caller: CommuteCaller, url: string) => Promise<LightMyRequestResponse>;
  cleanup: () => Promise<void>;
}

export async function createCommutePairsFixture(
  fastify: FastifyInstance,
): Promise<CommutePairsFixture> {
  const suffix = randomNumericSuffix();
  const values = new Set<string>();
  while (values.size < 4) {
    values.add(`7${randomNumericSuffix(4)}`);
  }
  const [home, noCommute, work, workOther] = await getRepository(
    dataSource,
    Postcode,
  ).save(
    [...values].map(
      (value, i) =>
        new Postcode({ value, latitude: 52.5 + i / 100, longitude: 13.4 }),
    ),
  );
  const postcodes: Record<PostcodeKey, Postcode> = {
    home,
    noCommute,
    work,
    workOther,
  };
  await getRepository(dataSource, PostcodeCommute).save(
    COMMUTES.map(
      ([from, to, minutes]) =>
        new PostcodeCommute({
          fromPostcodeId: postcodes[from].id,
          toPostcodeId: postcodes[to].id,
          minutes,
        }),
    ),
  );

  const deals: Deal[] = [];
  const addresses: Address[] = [];
  const persons: Person[] = [];
  const dealAt = async (key: PostcodeKey) => {
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcodes[key].id }),
    );
    deals.push(deal);
    return deal;
  };

  const [agent, otherAgent] = await fastify.db.agentRepository.save(
    ["", " Other"].map(
      (name) =>
        new Agent({
          title: `Commute Pairs${name} ${suffix}`,
          engagementStatus: AgentEngagementStatusType.ACTIVE,
        }),
    ),
  );

  const volunteers = {} as Record<CommuteVolunteerKey, Volunteer>;
  for (const [key, place] of Object.entries(VOLUNTEER_HOME)) {
    const address = place.address
      ? await getRepository(dataSource, Address).save(
          new Address({ postcodeId: postcodes[place.address].id }),
        )
      : null;
    if (address) {
      addresses.push(address);
    }
    const person = await fastify.db.personRepository.save(
      new Person({
        firstName: key,
        lastName: `CommutePairs${suffix}`,
        addressId: address?.id,
      }),
    );
    persons.push(person);
    volunteers[key as CommuteVolunteerKey] =
      await fastify.db.volunteerRepository.save(
        new Volunteer({
          dealId: place.deal ? (await dealAt(place.deal)).id : undefined,
          personId: person.id,
          ownerAgentId: key === "owned" ? agent.id : null,
        }),
      );
  }

  const opportunities = {} as Record<CommuteOpportunityKey, Opportunity>;
  for (const [key, place] of Object.entries(OPPORTUNITY_PLACE)) {
    opportunities[key as CommuteOpportunityKey] =
      await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Commute pairs ${key} ${suffix}`,
          type: OpportunityType.REGULAR,
          status: OpportunityStatusType.SEARCHING,
          dealId: place.deal ? (await dealAt(place.deal)).id : undefined,
          agentId: place.foreign ? otherAgent.id : agent.id,
        }),
      );
  }

  const links = await fastify.db.opportunityVolunteerRepository.save(
    LINKS.map(
      ([volunteer, opportunity]) =>
        new OpportunityVolunteer({
          volunteerId: volunteers[volunteer].id,
          opportunityId: opportunities[opportunity].id,
          status: OpportunityVolunteerStatusType.MATCHED,
        }),
    ),
  );

  const pwHash = await hashPassword(PASSWORD);
  const callerUsers: Record<
    CommuteCaller,
    { role: UserRole; agentId?: number; personId?: number }
  > = {
    coordinator: { role: UserRole.COORDINATOR },
    agent: { role: UserRole.AGENT, agentId: agent.id },
    otherAgent: { role: UserRole.AGENT, agentId: otherAgent.id },
    owned: { role: UserRole.VOLUNTEER, personId: volunteers.owned.personId },
  };
  const cookies = {} as Record<CommuteCaller, string>;
  const userPersonIds: number[] = [];
  for (const [caller, { role, agentId, personId }] of Object.entries(
    callerUsers,
  )) {
    let userPersonId = personId;
    if (!userPersonId) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Pairs", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      userPersonId = person.id;
    }
    userPersonIds.push(userPersonId);
    if (agentId) {
      await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId,
          personId: userPersonId,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
    }
    const email = `commute-pairs-${caller}-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: pwHash,
        role,
        isActive: true,
        personId: userPersonId,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    cookies[caller as CommuteCaller] = res.cookies.find(
      (c) => c.name === accessCookieName,
    )?.value as string;
  }

  const ids = (entities: { id: number }[]) => In(entities.map(({ id }) => id));
  return {
    agent,
    otherAgent,
    volunteers,
    opportunities,
    cookies,
    get: (caller, url) =>
      fastify.inject({
        method: "GET",
        url,
        cookies: { [accessCookieName]: cookies[caller] },
      }),
    cleanup: async () => {
      await fastify.db.opportunityVolunteerRepository.delete({
        id: ids(links),
      });
      await fastify.db.opportunityRepository.delete({
        id: ids(Object.values(opportunities)),
      });
      await fastify.db.volunteerRepository.delete({
        id: ids(Object.values(volunteers)),
      });
      await fastify.db.dealRepository.delete({ id: ids(deals) });
      await fastify.db.agentPersonRepository.delete({
        agentId: In([agent.id, otherAgent.id]),
      });
      await fastify.db.userRepository.delete({ personId: In(userPersonIds) });
      await fastify.db.personRepository.delete({ id: ids(persons) });
      await getRepository(dataSource, Address).delete({ id: ids(addresses) });
      await fastify.db.agentRepository.delete({
        id: In([agent.id, otherAgent.id]),
      });
      await getRepository(dataSource, Postcode).delete({
        id: ids(Object.values(postcodes)),
      });
    },
  };
}
