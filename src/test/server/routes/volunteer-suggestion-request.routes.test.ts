import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  EntityTableName,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import CommentPerson from "../../../data/entity/m2m/comment-person";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type AgentKey = "requester" | "owner" | "loner" | "silent";
type Caller = "requester" | "owner" | "coordinator";
type VolunteerKey = "owned" | "platform" | "own" | "loner" | "silent";
type OpportunityKey = "open" | "past" | "linked" | "owners";

describe("POST /volunteer/:id/suggestion-request (be#1317)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  const agents = {} as Record<AgentKey, Agent>;
  const volunteers = {} as Record<VolunteerKey, Volunteer>;
  const opportunities = {} as Record<OpportunityKey, Opportunity>;
  const persons = {} as Record<Caller, Person>;
  const users = {} as Record<Caller, User>;
  const volunteerPersons: Person[] = [];
  const deals: Deal[] = [];
  const cookies = {} as Record<Caller, string>;

  const requestSuggestion = (
    as: Caller,
    volunteer: VolunteerKey,
    opportunity: OpportunityKey,
  ) =>
    fastify.inject({
      method: "POST",
      url: `/volunteer/${volunteers[volunteer].id}/suggestion-request`,
      cookies: { [accessCookieName]: cookies[as] },
      payload: { opportunityId: opportunities[opportunity].id },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    vi.spyOn(fastify.notify, "emailSuggestionRequest").mockResolvedValue(
      undefined,
    );
    vi.spyOn(fastify.notify, "tagged").mockResolvedValue(undefined);

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const sharing: Record<AgentKey, boolean> = {
      requester: true,
      owner: true,
      loner: false,
      silent: true,
    };
    for (const key of Object.keys(sharing) as AgentKey[]) {
      agents[key] = await fastify.db.agentRepository.save(
        new Agent({
          title: `Request Agent ${key} ${suffix}`,
          engagementStatus: AgentEngagementStatusType.ACTIVE,
          sharesVolunteers: sharing[key],
        }),
      );
    }

    const pwHash = await hashPassword(PASSWORD);
    for (const caller of ["requester", "owner", "coordinator"] as Caller[]) {
      persons[caller] = await fastify.db.personRepository.save(
        new Person({ firstName: "Req", lastName: `${caller}${suffix}` }),
      );
      const email = `request-${caller}-${suffix}@test.need4deed.org`;
      users[caller] = await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role:
            caller === "coordinator" ? UserRole.COORDINATOR : UserRole.AGENT,
          isActive: true,
          personId: persons[caller].id,
        }),
      );
      if (caller !== "coordinator") {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId: agents[caller].id,
            personId: persons[caller].id,
            role: AgentRoleType.VOLUNTEER_COORDINATOR,
            status: AgentMembershipStatus.ACTIVE,
          }),
        );
      }
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }

    const silentMember = await fastify.db.personRepository.save(
      new Person({ firstName: "Silent", lastName: `member${suffix}` }),
    );
    volunteerPersons.push(silentMember);
    await fastify.db.userRepository.save(
      new User({
        email: `request-silent-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: false,
        personId: silentMember.id,
      }),
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agents.silent.id,
        personId: silentMember.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const owners: Record<VolunteerKey, number | null> = {
      owned: agents.owner.id,
      platform: null,
      own: agents.requester.id,
      loner: agents.loner.id,
      silent: agents.silent.id,
    };
    for (const [key, ownerAgentId] of Object.entries(owners) as [
      VolunteerKey,
      number | null,
    ][]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Vera", lastName: `${key}${suffix}` }),
      );
      volunteerPersons.push(person);
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
      );
      deals.push(deal);
      volunteers[key] = await fastify.db.volunteerRepository.save(
        new Volunteer({ dealId: deal.id, personId: person.id, ownerAgentId }),
      );
    }

    const opportunitySetup: Record<
      OpportunityKey,
      { agent: AgentKey; status: OpportunityStatusType }
    > = {
      open: { agent: "requester", status: OpportunityStatusType.ACTIVE },
      past: { agent: "requester", status: OpportunityStatusType.PAST },
      linked: { agent: "requester", status: OpportunityStatusType.SEARCHING },
      owners: { agent: "owner", status: OpportunityStatusType.ACTIVE },
    };
    for (const [key, { agent, status }] of Object.entries(opportunitySetup) as [
      OpportunityKey,
      (typeof opportunitySetup)[OpportunityKey],
    ][]) {
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      );
      deals.push(deal);
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Request Opportunity ${key} ${suffix}`,
          type: OpportunityType.REGULAR,
          status,
          agentId: agents[agent].id,
          dealId: deal.id,
        }),
      );
    }
    await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        volunteerId: volunteers.owned.id,
        opportunityId: opportunities.linked.id,
        status: OpportunityVolunteerStatusType.PENDING,
      }),
    );
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const volunteerIds = Object.values(volunteers).map(({ id }) => id);
    const comments = await fastify.db.commentRepository.find({
      where: {
        entityType: EntityTableName.VOLUNTEER,
        entityId: In(volunteerIds),
      },
    });
    const commentIds = comments.map(({ id }) => id);
    if (commentIds.length > 0) {
      await fastify.db.commentRepository.manager
        .getRepository(CommentPerson)
        .delete({ commentId: In(commentIds) });
      await fastify.db.commentRepository.delete({ id: In(commentIds) });
    }
    await fastify.db.opportunityVolunteerRepository.delete({
      volunteerId: In(volunteerIds),
    });
    await fastify.db.volunteerRepository.delete({ id: In(volunteerIds) });
    await fastify.db.opportunityRepository.delete({
      id: In(Object.values(opportunities).map(({ id }) => id)),
    });
    await fastify.db.dealRepository.delete({
      id: In(deals.map(({ id }) => id)),
    });
    const personIds = [...Object.values(persons), ...volunteerPersons].map(
      ({ id }) => id,
    );
    await fastify.db.agentPersonRepository.delete({ personId: In(personIds) });
    await fastify.db.userRepository.delete({ personId: In(personIds) });
    await fastify.db.personRepository.delete({ id: In(personIds) });
    await fastify.db.agentRepository.delete({
      id: In(Object.values(agents).map(({ id }) => id)),
    });
    await fastify.close();
  });

  it("sends the request to the owning NGO: a tagged comment, an email per member and a Slack notice", async () => {
    const res = await requestSuggestion("requester", "owned", "open");
    expect(res.statusCode).toBe(201);

    const comments = await fastify.db.commentRepository.find({
      where: {
        entityType: EntityTableName.VOLUNTEER,
        entityId: volunteers.owned.id,
      },
      relations: { commentPerson: true },
    });
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toContain(agents.requester.title);
    expect(comments[0].text).toContain(opportunities.open.title);
    expect(comments[0].commentPerson.map(({ personId }) => personId)).toEqual([
      persons.owner.id,
    ]);

    await vi.waitFor(() =>
      expect(fastify.notify.emailSuggestionRequest).toHaveBeenCalledTimes(1),
    );
    expect(fastify.notify.emailSuggestionRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: expect.objectContaining({ email: users.owner.email }),
        requesterAgent: agents.requester.title,
        volunteerId: volunteers.owned.id,
        volunteerName: `Vera owned${suffix}`,
        opportunityTitle: opportunities.open.title,
      }),
    );
    expect(fastify.notify.tagged).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "comment",
        taggedNames: [persons.owner.name],
      }),
    );
  });

  it("409s a repeated request for the same volunteer and opportunity", async () => {
    expect(
      (await requestSuggestion("requester", "owned", "open")).statusCode,
    ).toBe(409);
  });

  it("400s when the owning NGO has no active member to ask", async () => {
    expect(
      (await requestSuggestion("requester", "silent", "open")).statusCode,
    ).toBe(400);
  });

  it("400s a platform volunteer, who stays with the coordinator flow", async () => {
    expect(
      (await requestSuggestion("requester", "platform", "open")).statusCode,
    ).toBe(400);
  });

  it("400s the NGO's own volunteer, who it suggests directly", async () => {
    expect(
      (await requestSuggestion("requester", "own", "open")).statusCode,
    ).toBe(400);
  });

  it("404s a volunteer of an NGO that doesn't share", async () => {
    expect(
      (await requestSuggestion("requester", "loner", "open")).statusCode,
    ).toBe(404);
  });

  it("404s an opportunity of another NGO", async () => {
    expect(
      (await requestSuggestion("requester", "owned", "owners")).statusCode,
    ).toBe(404);
  });

  it("400s an opportunity that is no longer open", async () => {
    expect(
      (await requestSuggestion("requester", "owned", "past")).statusCode,
    ).toBe(400);
  });

  it("409s when the volunteer is already linked to the opportunity", async () => {
    expect(
      (await requestSuggestion("requester", "owned", "linked")).statusCode,
    ).toBe(409);
  });

  it("403s a coordinator, who suggests directly", async () => {
    expect(
      (await requestSuggestion("coordinator", "owned", "open")).statusCode,
    ).toBe(403);
  });

  describe("comments on owned volunteers", () => {
    const notes = {} as Record<
      "tagged" | "untagged" | "taggedOnPlatform" | "byRequester",
      Comment
    >;

    const getComment = (as: Caller, id: number) =>
      fastify.inject({
        method: "GET",
        url: `/comment/${id}`,
        cookies: { [accessCookieName]: cookies[as] },
      });
    const commentIds = async (as: Caller, volunteer: VolunteerKey) => {
      const res = await fastify.inject({
        method: "GET",
        url: `/comment?entityType=volunteer&entityId=${volunteers[volunteer].id}`,
        cookies: { [accessCookieName]: cookies[as] },
      });
      expect(res.statusCode).toBe(200);
      return (res.json().data as { id: number }[]).map(({ id }) => id);
    };

    beforeAll(async () => {
      const setup = {
        tagged: { volunteer: "owned", author: "coordinator", tag: true },
        untagged: { volunteer: "owned", author: "coordinator", tag: false },
        taggedOnPlatform: {
          volunteer: "platform",
          author: "coordinator",
          tag: true,
        },
        byRequester: { volunteer: "owned", author: "requester", tag: false },
      } as const;
      for (const [key, { volunteer, author, tag }] of Object.entries(setup)) {
        const comment = await fastify.db.commentRepository.save(
          fastify.db.commentRepository.create({
            text: `Note ${key} ${suffix}`,
            entityType: EntityTableName.VOLUNTEER,
            entityId: volunteers[volunteer].id,
            user: { id: users[author].id },
          }),
        );
        if (tag) {
          await fastify.db.commentRepository.manager
            .getRepository(CommentPerson)
            .save(
              new CommentPerson({
                commentId: comment.id,
                personId: persons.owner.id,
              }),
            );
        }
        notes[key as keyof typeof notes] = comment;
      }
    });

    it("shows the owning NGO comments tagging them on its volunteers", async () => {
      expect(await commentIds("owner", "owned")).toContain(notes.tagged.id);
      expect((await getComment("owner", notes.tagged.id)).statusCode).toBe(200);
    });

    it("keeps other notes on its volunteers staff-only", async () => {
      expect(await commentIds("owner", "owned")).not.toContain(
        notes.untagged.id,
      );
      expect((await getComment("owner", notes.untagged.id)).statusCode).toBe(
        404,
      );
    });

    it("hides a tag on a volunteer the NGO doesn't own", async () => {
      expect(await commentIds("owner", "platform")).toEqual([]);
      expect(
        (await getComment("owner", notes.taggedOnPlatform.id)).statusCode,
      ).toBe(404);
    });

    it("lets an NGO read what it wrote, and nothing else on another NGO's volunteer", async () => {
      const ids = await commentIds("requester", "owned");
      expect(ids).toContain(notes.byRequester.id);
      expect(ids).not.toContain(notes.tagged.id);
      expect(
        (await getComment("requester", notes.byRequester.id)).statusCode,
      ).toBe(200);
    });

    it("keeps a coordinator's full view", async () => {
      expect(await commentIds("coordinator", "owned")).toEqual(
        expect.arrayContaining([
          notes.tagged.id,
          notes.untagged.id,
          notes.byRequester.id,
        ]),
      );
    });
  });
});
