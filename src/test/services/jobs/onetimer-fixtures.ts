import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager, EntityTarget, In, ObjectLiteral } from "typeorm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  MockInstance,
  vi,
} from "vitest";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import logger from "../../../logger";
import { createServer } from "../../../server";
import { createVolunteer, deleteFixtures } from "../../data/match-fixtures";
import { randomNumericSuffix } from "../../random";
import { onetimerQueryScope } from "./onetimer-query-scope";

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

  constructor(private readonly fastify: FastifyInstance) {}

  private get manager(): EntityManager {
    return this.fastify.db.opportunityRepository.manager;
  }

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
    const volunteer = await createVolunteer(this.manager);
    this.volunteers.push(volunteer);
    await this.manager.update(Volunteer, volunteer.id, { statusEngagement });
    volunteer.statusEngagement = statusEngagement;
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
    await deleteFixtures(this.manager, this.volunteers, this.opportunities);
    const onetimerIds = this.opportunities.map(({ onetimerId }) => onetimerId!);
    if (onetimerIds.length) {
      await this.manager.delete(Onetimer, { id: In(onetimerIds) });
    }
    if (this.agents.length) {
      await this.manager.delete(Agent, {
        id: In(this.agents.map(({ id }) => id)),
      });
    }
  }
}

export interface OnetimerJobContext {
  fastify: FastifyInstance;
  fixtures: OnetimerFixtures;
  agent: Agent;
  loggerError: MockInstance<typeof logger.error>;
  loggerInfo: MockInstance<typeof logger.info>;
}

export function setupOnetimerJobTest(): OnetimerJobContext {
  const context = {} as OnetimerJobContext;

  beforeAll(async () => {
    context.fastify = await createServer();
    await context.fastify.ready();
    context.fixtures = new OnetimerFixtures(context.fastify);
  });

  beforeEach(async () => {
    context.loggerError = vi.spyOn(logger, "error");
    context.loggerInfo = vi.spyOn(logger, "info");
    context.agent = await context.fixtures.agent();
    onetimerQueryScope.agentId = context.agent.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    try {
      await context.fixtures?.cleanup();
    } finally {
      await context.fastify?.close();
    }
  });

  return context;
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
