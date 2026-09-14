import { FastifyInstance } from "fastify";
import {
  AgentRoleType,
  EntityTableName,
  OpportunityMatchStatusType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import CommentPerson from "../../../data/entity/m2m/comment-person";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Organization from "../../../data/entity/organization.entity";
import Person from "../../../data/entity/person.entity";
import Post from "../../../data/entity/post.entity";
import Testimonial from "../../../data/entity/testimonial.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

function getCookie(
  cookies: { name: string; value: string }[],
  name: string,
): string {
  const cookie = cookies.find((c) => c.name === name)?.value;
  if (!cookie) {
    throw new Error(`Cookie ${name} not found in response`);
  }
  return cookie;
}

describe("DELETE /volunteer/:id", () => {
  let fastify: FastifyInstance;

  let deal: Deal;
  let volunteerPerson: Person;
  let volunteer: Volunteer;
  let comment: Comment;
  let opportunityDeal: Deal;
  let opportunity: Opportunity;
  let opportunityVolunteer: OpportunityVolunteer;
  let agentPerson: Person;
  let coordinatorPerson: Person;
  let agentCookie: string;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const language = await fastify.db.languageRepository.findOneOrFail({
      where: {},
    });

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );

    opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (vol delete) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        dealId: opportunityDeal.id,
      }),
    );
    opportunityVolunteer = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );
    // Set deterministically rather than relying on OpportunityVolunteer's
    // fire-and-forget @AfterInsert hook (updateOpportunityMatching isn't
    // awaited there), so the "before" state for the recompute assertion
    // below isn't a race.
    await fastify.db.opportunityRepository.update(
      { id: opportunity.id },
      { statusMatch: OpportunityMatchStatusType.MATCHED },
    );

    agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Agent" }),
    );
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-vol-del-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `agent-vol-del-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
    );

    comment = await fastify.db.commentRepository.save(
      new Comment({
        text: "Test comment",
        entityType: EntityTableName.VOLUNTEER,
        entityId: volunteer.id,
        languageId: language.id,
        userId: coordinatorUser.id,
      }),
    );

    const login = async (email: string): Promise<string> => {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      return getCookie(res.cookies, accessCookieName);
    };

    agentCookie = await login(`agent-vol-del-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(
      `coordinator-vol-del-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: agentPerson.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: agentPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    // volunteer/deal/comment/opportunityVolunteer are deleted by the
    // DELETE /volunteer/:id call itself in the tests below; these are
    // best-effort in case a test fails before reaching that point.
    await fastify.db.opportunityVolunteerRepository.delete({
      id: opportunityVolunteer.id,
    });
    await fastify.db.commentRepository.delete({ id: comment.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: opportunityDeal.id });
    await fastify.close();
  });

  it("403s when a non-coordinator tries to delete a volunteer", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/${volunteer.id}`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it("404s for a nonexistent volunteer", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/999999999`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("lets a coordinator delete a volunteer, cascading its deal, comments, and match link", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/${volunteer.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    expect(
      await fastify.db.volunteerRepository.findOneBy({ id: volunteer.id }),
    ).toBeNull();
    expect(
      await fastify.db.dealRepository.findOneBy({ id: deal.id }),
    ).toBeNull();
    expect(
      await fastify.db.commentRepository.findOneBy({ id: comment.id }),
    ).toBeNull();
    expect(
      await fastify.db.opportunityVolunteerRepository.findOneBy({
        id: opportunityVolunteer.id,
      }),
    ).toBeNull();

    // The underlying Person row survives (be#727: anonymized in place, not
    // hard-deleted — see the dedicated describe block below for the full
    // erasure assertions), but its PII is gone and its login is deactivated.
    const survivingPerson = await fastify.db.personRepository.findOneBy({
      id: volunteerPerson.id,
    });
    expect(survivingPerson).not.toBeNull();
    expect(survivingPerson?.firstName).toBe("[deleted]");
    expect(survivingPerson?.lastName).toBeNull();

    // The linked opportunity's match status is recomputed now that the
    // match link is gone — confirming the deleted OpportunityVolunteer's
    // cascade (which bypasses its own @AfterRemove hook) doesn't leave the
    // opportunity stuck at MATCHED.
    const survivingOpportunity =
      await fastify.db.opportunityRepository.findOneBy({
        id: opportunity.id,
      });
    expect(survivingOpportunity).not.toBeNull();
    expect(survivingOpportunity?.statusMatch).toBe(
      OpportunityMatchStatusType.NEEDS_REMATCH,
    );
  });
});

describe("GET /volunteer", () => {
  let fastify: FastifyInstance;
  let coordinatorPerson: Person;
  let volunteerPerson: Person;
  let volunteer: Volunteer;
  let deal: Deal;
  let address: Address;
  let postcode: Postcode;
  let unrelatedPerson: Person;
  let coordinatorCookie: string;
  let unrelatedUserCookie: string;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const lastName = `MapPin-${suffix}`;
  const numericSuffix = randomNumericSuffix();
  const LAT = 52.52;
  const LON = 13.405;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcodeRepository = getRepository(dataSource, Postcode);
    postcode = await postcodeRepository.save(
      new Postcode({
        value: `1${numericSuffix}`,
        latitude: LAT,
        longitude: LON,
      }),
    );

    const addressRepository = getRepository(dataSource, Address);
    address = await addressRepository.save(
      new Address({ postcodeId: postcode.id }),
    );

    volunteerPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Test",
        lastName,
        addressId: address.id,
      }),
    );

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    unrelatedPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Unrelated" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-vol-list-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    // USER has no visibility into anyone (resolveCallerVisibility) — used to
    // verify masked callers get lat/lon nulled alongside the rest of a
    // volunteer's PII (be#661 review).
    await fastify.db.userRepository.save(
      new User({
        email: `unrelated-user-vol-list-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.USER,
        isActive: true,
        personId: unrelatedPerson.id,
      }),
    );

    const login = async (email: string): Promise<string> => {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      return getCookie(res.cookies, accessCookieName);
    };
    coordinatorCookie = await login(
      `coordinator-vol-list-${suffix}@test.need4deed.org`,
    );
    unrelatedUserCookie = await login(
      `unrelated-user-vol-list-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: unrelatedPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: unrelatedPerson.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await getRepository(dataSource, Address).delete({ id: address.id });
    await getRepository(dataSource, Postcode).delete({ id: postcode.id });
    await fastify.close();
  });

  it("serializes postcode coordinates as numeric lat/lon through the actual response schema", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/volunteer?filter[search]=${encodeURIComponent(lastName)}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].lat).toBe(LAT);
    expect(body.data[0].lon).toBe(LON);
    expect(typeof body.data[0].lat).toBe("number");
    expect(typeof body.data[0].lon).toBe("number");
  });

  it("returns null lat/lon for listType=table, which doesn't load the postcode relation", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/volunteer?listType=table&filter[search]=${encodeURIComponent(lastName)}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].lat).toBeNull();
    expect(body.data[0].lon).toBeNull();
  });

  it("nulls lat/lon for a caller with no visibility into the volunteer, alongside their masked name", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/volunteer?filter[search]=${encodeURIComponent(lastName)}`,
      cookies: { [accessCookieName]: unrelatedUserCookie },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).not.toContain(lastName);
    expect(body.data[0].lat).toBeNull();
    expect(body.data[0].lon).toBeNull();
  });
});

describe("DELETE /volunteer/:id erases the underlying Person (be#727)", () => {
  let fastify: FastifyInstance;
  let postcode: Postcode;
  let address: Address;
  let erasedPerson: Person;
  let erasedUser: User;
  let unrelatedAgentUser: User;
  let deal: Deal;
  let volunteer: Volunteer;
  let agent: Agent;
  let agentPerson: AgentPerson;
  let organization: Organization;
  let post: Post;
  let testimonial: Testimonial;
  let comment: Comment;
  let commentPerson: CommentPerson;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const numericSuffix = randomNumericSuffix();

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcodeRepository = getRepository(dataSource, Postcode);
    postcode = await postcodeRepository.save(
      new Postcode({ value: `1${numericSuffix}` }),
    );
    const addressRepository = getRepository(dataSource, Address);
    address = await addressRepository.save(
      new Address({ street: "Original Street 1", postcodeId: postcode.id }),
    );

    erasedPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Erase",
        lastName: "Me",
        email: `erase-me-${suffix}@test.need4deed.org`,
        phone: "+491234567",
        landline: "+497654321",
        avatarUrl: "https://example.com/avatar.png",
        addressId: address.id,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    erasedUser = await fastify.db.userRepository.save(
      new User({
        email: `volunteer-login-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: erasedPerson.id,
      }),
    );
    // Same Person, a second, unrelated login (User.personId has no
    // uniqueness constraint) — erasing the volunteer profile must not
    // silently deactivate a staff login that has nothing to do with it.
    unrelatedAgentUser = await fastify.db.userRepository.save(
      new User({
        email: `unrelated-agent-login-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: erasedPerson.id,
      }),
    );

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: erasedPerson.id }),
    );

    // The same Person also holds two other, unrelated roles — erasure must
    // anonymize their identity everywhere without deleting these records.
    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (erasure) ${suffix}` }),
    );
    agentPerson = await getRepository(dataSource, AgentPerson).save(
      new AgentPerson({
        agentId: agent.id,
        personId: erasedPerson.id,
        role: AgentRoleType.MANAGER,
      }),
    );
    organization = await getRepository(dataSource, Organization).save(
      new Organization({
        title: `Test Org (erasure) ${suffix}`,
        personId: erasedPerson.id,
      }),
    );
    post = await getRepository(dataSource, Post).save(
      new Post({ text: "Hello from a volunteer", authorId: erasedPerson.id }),
    );
    testimonial = await getRepository(dataSource, Testimonial).save(
      new Testimonial({
        name: "Erase Me (as shown on testimonial)",
        pic: "https://example.com/testimonial-pic.png",
        personId: erasedPerson.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "EraseCoordinator" }),
    );
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-erase-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );

    const language = await fastify.db.languageRepository.findOneOrFail({
      where: {},
    });
    // Attached to the Agent, not this Volunteer — a comment scoped to the
    // volunteer profile being deleted is cleaned up by the route's own
    // pre-existing logic before erasePersonPii ever runs, which would
    // cascade-delete this fixture's CommentPerson row too early to exercise
    // the count this test is actually for.
    comment = await fastify.db.commentRepository.save(
      new Comment({
        text: "Tagging the person in an unrelated comment thread",
        entityType: EntityTableName.AGENT,
        entityId: agent.id,
        languageId: language.id,
        userId: coordinatorUser.id,
      }),
    );
    commentPerson = await getRepository(dataSource, CommentPerson).save(
      new CommentPerson({ commentId: comment.id, personId: erasedPerson.id }),
    );

    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `coordinator-erase-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(login.cookies, accessCookieName);
  });

  afterAll(async () => {
    await getRepository(dataSource, CommentPerson).delete({
      id: commentPerson.id,
    });
    await fastify.db.commentRepository.delete({ id: comment.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await getRepository(dataSource, Testimonial).delete({ id: testimonial.id });
    await getRepository(dataSource, Post).delete({ id: post.id });
    await getRepository(dataSource, Organization).delete({
      id: organization.id,
    });
    await getRepository(dataSource, AgentPerson).delete({ id: agentPerson.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.userRepository.delete({ id: erasedUser.id });
    await fastify.db.userRepository.delete({ id: unrelatedAgentUser.id });
    // volunteer/deal are deleted by the DELETE call itself in the test below.
    await fastify.db.personRepository.delete({ id: erasedPerson.id });
    await getRepository(dataSource, Address).delete({ id: address.id });
    await getRepository(dataSource, Postcode).delete({ id: postcode.id });
    await fastify.close();
  });

  it("anonymizes the Person's PII, detaches (not mutates) their address, deactivates their login, and warns about other roles", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/${volunteer.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.message).toContain("anonymized");
    expect(body.message).toContain("agent-membership");
    expect(body.message).toContain("organization contact");
    expect(body.message).toContain("community post");
    expect(body.message).toContain("testimonial");
    expect(body.message).toContain("comment mention");

    const person = await fastify.db.personRepository.findOneBy({
      id: erasedPerson.id,
    });
    expect(person).not.toBeNull();
    expect(person?.firstName).toBe("[deleted]");
    expect(person?.lastName).toBeNull();
    expect(person?.email).toBeNull();
    expect(person?.phone).toBeNull();
    expect(person?.landline).toBeNull();
    expect(person?.avatarUrl).toBeNull();
    expect(person?.addressId).toBeNull();

    // The Address row itself is untouched — only detached from the Person,
    // since it may be shared with another entity.
    const survivingAddress = await getRepository(dataSource, Address).findOneBy(
      { id: address.id },
    );
    expect(survivingAddress?.street).toBe("Original Street 1");

    const user = await fastify.db.userRepository.findOneBy({
      id: erasedUser.id,
    });
    expect(user?.isActive).toBe(false);
    // The login email is itself identifying PII — replaced, not just
    // deactivated (it's NOT NULL + unique, so it can't simply be nulled).
    expect(user?.email).not.toBe(
      `volunteer-login-${suffix}@test.need4deed.org`,
    );
    expect(user?.email).toMatch(/^deleted-user-\d+@erased\.need4deed\.org$/);

    // A second, unrelated (non-VOLUNTEER-role) login for the same Person is
    // untouched — erasing the volunteer profile must not silently deactivate
    // a staff login that has nothing to do with it.
    const survivingAgentUser = await fastify.db.userRepository.findOneBy({
      id: unrelatedAgentUser.id,
    });
    expect(survivingAgentUser?.isActive).toBe(true);
    expect(survivingAgentUser?.email).toBe(
      `unrelated-agent-login-${suffix}@test.need4deed.org`,
    );

    // Testimonial survives (not cascade-deleted) but its own denormalized
    // name/pic — independent of Person — are anonymized too, and it's
    // taken off public display.
    const survivingTestimonial = await getRepository(
      dataSource,
      Testimonial,
    ).findOneBy({ id: testimonial.id });
    expect(survivingTestimonial).not.toBeNull();
    expect(survivingTestimonial?.name).toBeNull();
    expect(survivingTestimonial?.pic).toBeNull();
    expect(survivingTestimonial?.isActive).toBe(false);

    // Other roles survive — anonymization, not cascading deletion.
    expect(
      await getRepository(dataSource, AgentPerson).findOneBy({
        id: agentPerson.id,
      }),
    ).not.toBeNull();
    expect(
      await getRepository(dataSource, Organization).findOneBy({
        id: organization.id,
      }),
    ).not.toBeNull();
    expect(
      await getRepository(dataSource, Post).findOneBy({ id: post.id }),
    ).not.toBeNull();
    expect(
      await getRepository(dataSource, CommentPerson).findOneBy({
        id: commentPerson.id,
      }),
    ).not.toBeNull();
  });
});

describe("DELETE /volunteer/:id with no linked Person (be#727)", () => {
  let fastify: FastifyInstance;
  let deal: Deal;
  let volunteer: Volunteer;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "NoPersonCoordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-no-person-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `coordinator-no-person-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(login.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.close();
  });

  it("deletes cleanly with a plain message and no anonymization note", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/${volunteer.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe(`Volunteer (id:${volunteer.id}) deleted.`);
  });
});
