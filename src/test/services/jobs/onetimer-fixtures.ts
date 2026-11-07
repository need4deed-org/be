import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager, EntityTarget, ObjectLiteral } from "typeorm";
import { vi } from "vitest";
import Deal from "../../../data/entity/deal.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { randomNumericSuffix } from "../../random";

export const DAY = 24 * 60 * 60 * 1000;

export interface OnetimerOptions {
  date: Date;
  status?: OpportunityStatusType;
  type?: OpportunityType;
  matches?: { volunteer: Volunteer; status: OpportunityVolunteerStatusType }[];
}

export class OnetimerFixtures {
  private readonly agents: Agent[] = [];
  private readonly opportunities: Opportunity[] = [];
  private readonly volunteers: Volunteer[] = [];
  private deal?: Deal;

  constructor(private readonly fastify: FastifyInstance) {}

  async agent(): Promise<Agent> {
    const agent = await this.fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent (onetimer jobs) ${randomNumericSuffix()}`,
      }),
    );
    this.agents.push(agent);
    return agent;
  }

  async volunteer(
    statusEngagement = VolunteerStateEngagementType.AVAILABLE,
  ): Promise<Volunteer> {
    if (!this.deal) {
      const postcode = await this.fastify.db.postcodeRepository.findOneOrFail({
        where: {},
      });
      this.deal = await this.fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
      );
    }
    const person = await this.fastify.db.personRepository.save(
      new Person({
        firstName: "Test",
        lastName: `Onetimer ${randomNumericSuffix()}`,
      }),
    );
    const volunteer = await this.fastify.db.volunteerRepository.save(
      new Volunteer({
        personId: person.id,
        dealId: this.deal.id,
        statusEngagement,
      }),
    );
    this.volunteers.push(volunteer);
    return volunteer;
  }

  async onetimer(
    agent: Agent,
    {
      date,
      status = OpportunityStatusType.SEARCHING,
      type = OpportunityType.ACCOMPANYING,
      matches = [],
    }: OnetimerOptions,
  ): Promise<{ opportunity: Opportunity; matches: OpportunityVolunteer[] }> {
    const onetimer = await this.fastify.db.onetimerRepository.save(
      new Onetimer({ date }),
    );
    const opportunity = await this.fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Onetimer ${randomNumericSuffix()}`,
        type,
        status,
        agentId: agent.id,
        onetimerId: onetimer.id,
      }),
    );
    this.opportunities.push(opportunity);
    const saved = [];
    for (const match of matches) {
      saved.push(
        await this.fastify.db.opportunityVolunteerRepository.save(
          new OpportunityVolunteer({
            opportunityId: opportunity.id,
            volunteerId: match.volunteer.id,
            status: match.status,
          }),
        ),
      );
    }
    return { opportunity, matches: saved };
  }

  opportunityStatus = async (opportunity: Opportunity) =>
    (
      await this.fastify.db.opportunityRepository.findOneByOrFail({
        id: opportunity.id,
      })
    ).status;

  matchStatus = async (match: OpportunityVolunteer) =>
    (
      await this.fastify.db.opportunityVolunteerRepository.findOneByOrFail({
        id: match.id,
      })
    ).status;

  engagement = async (volunteer: Volunteer) =>
    (
      await this.fastify.db.volunteerRepository.findOneByOrFail({
        id: volunteer.id,
      })
    ).statusEngagement;

  engagementLogs = (volunteer: Volunteer) =>
    this.fastify.db.volunteerAuditLogRepository.findBy({
      volunteerId: volunteer.id,
      type: "availability_changed",
    });

  async cleanup(): Promise<void> {
    for (const opportunity of this.opportunities) {
      await this.fastify.db.opportunityRepository.delete({
        id: opportunity.id,
      });
      await this.fastify.db.onetimerRepository.delete({
        id: opportunity.onetimerId!,
      });
    }
    for (const volunteer of this.volunteers) {
      await this.fastify.db.volunteerRepository.delete({ id: volunteer.id });
      await this.fastify.db.personRepository.delete({ id: volunteer.personId });
    }
    if (this.deal) {
      await this.fastify.db.dealRepository.delete({ id: this.deal.id });
    }
    for (const agent of this.agents) {
      await this.fastify.db.agentRepository.delete({ id: agent.id });
    }
  }
}

export function failSaveOf<Entity extends ObjectLiteral>(
  target: EntityTarget<Entity>,
  id: number,
) {
  const realSave = EntityManager.prototype.save;
  return vi.spyOn(EntityManager.prototype, "save").mockImplementation(function (
    this: EntityManager,
    ...args: Parameters<EntityManager["save"]>
  ) {
    const [saveTarget, entity] = args as unknown[];
    if (saveTarget === target && (entity as { id?: number })?.id === id) {
      return Promise.reject(new Error("db unavailable"));
    }
    return (realSave as (...a: unknown[]) => Promise<unknown>).apply(
      this,
      args,
    );
  } as EntityManager["save"]);
}
