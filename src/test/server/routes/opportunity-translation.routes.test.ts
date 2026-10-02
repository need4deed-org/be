import { FastifyInstance } from "fastify";
import {
  EntityTableName,
  Lang,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  TranslationStatus,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import District from "../../../data/entity/location/district.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Post from "../../../data/entity/post.entity";
import Language from "../../../data/entity/profile/language.entity";
import User from "../../../data/entity/user.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { enqueue } from "../../../services/translation/queue";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "Translation-Test-1!";

// be#1068: opportunity GET routes serve title/info in ?language=, falling
// back to the original, and report originalLanguage.
describe("opportunity routes in the requested language", () => {
  let fastify: FastifyInstance;
  let cookie: string;
  let agent: Agent;
  let person: Person;
  const suffix = randomNumericSuffix();
  const ids = {} as Record<Lang, number>;
  const created: number[] = [];

  // A German opportunity with its English translations queued, and
  // optionally marked done with the given texts.
  async function germanOpportunity(english?: {
    title: string;
    info: string;
  }): Promise<Opportunity> {
    const opportunity = await dataSource.manager.save(
      new Opportunity({
        title: `Kinderbetreuung ${suffix}-${created.length}`,
        info: "Wir suchen Freiwillige",
        type: OpportunityType.REGULAR,
        originalLanguageId: ids[Lang.DE],
        agentId: agent.id,
      }),
    );
    created.push(opportunity.id);
    await enqueue(
      dataSource.manager,
      EntityTableName.OPPORTUNITY,
      opportunity,
      {
        title: opportunity.title,
        info: opportunity.info,
      },
    );
    if (english) {
      for (const [fieldName, translation] of Object.entries(english)) {
        await dataSource.manager.update(
          FieldTranslation,
          { opportunityId: opportunity.id, fieldName },
          { status: TranslationStatus.DONE, translation },
        );
      }
    }
    return opportunity;
  }

  const get = (url: string) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookie },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    for (const lang of Object.values(Lang)) {
      ids[lang] = (
        await dataSource.manager.findOneByOrFail(Language, { isoCode: lang })
      ).id;
    }

    // An agent with a district: the GET routes then derive and *save* the
    // opportunity's district on the very entity they translate, which is
    // what the "never writes back" test needs.
    const district = await dataSource.manager.findOneOrFail(District, {
      where: {},
    });
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Translation agent ${suffix}`,
        districtId: district.id,
      }),
    );
    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const email = `coordinator-translation-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: person.id,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    cookie = login.cookies.find((c) => c.name === accessCookieName)!.value;
  });

  afterAll(async () => {
    if (created.length) {
      await dataSource.manager.delete(Opportunity, created);
    }
    await fastify.db.userRepository.delete({ personId: person.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  describe("GET /opportunity/:id", () => {
    it("returns the English title and description with ?language=en", async () => {
      const opportunity = await germanOpportunity({
        title: `Childcare ${suffix}`,
        info: "We are looking for volunteers",
      });

      const res = await get(`/opportunity/${opportunity.id}?language=en`);

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toMatchObject({
        title: `Childcare ${suffix}`,
        description: "We are looking for volunteers",
        originalLanguage: "de",
      });
    });

    it("returns the original without ?language= (German default)", async () => {
      const opportunity = await germanOpportunity({
        title: `Childcare ${suffix}`,
        info: "We are looking for volunteers",
      });

      const res = await get(`/opportunity/${opportunity.id}`);

      expect(res.json().data).toMatchObject({
        title: opportunity.title,
        description: opportunity.info,
        originalLanguage: "de",
      });
    });

    it("falls back to the original while the translation is pending", async () => {
      const opportunity = await germanOpportunity();

      const res = await get(`/opportunity/${opportunity.id}?language=en`);

      expect(res.json().data.title).toBe(opportunity.title);
    });

    it("never writes the translation back to the database", async () => {
      // The route saves district updates on the same entity (be#1068).
      const opportunity = await germanOpportunity({
        title: `Childcare ${suffix}`,
        info: "We are looking for volunteers",
      });

      await get(`/opportunity/${opportunity.id}?language=en`);

      const stored = await dataSource.manager.findOneByOrFail(Opportunity, {
        id: opportunity.id,
      });
      // The route did save the entity (district derived from the agent)...
      expect(stored.districtId).toBe(agent.districtId);
      // ...without the translation.
      expect(stored).toMatchObject({
        title: opportunity.title,
        info: opportunity.info,
      });
    });

    it("reports NULL original language as German", async () => {
      const opportunity = await germanOpportunity();
      await dataSource.manager.update(Opportunity, opportunity.id, {
        originalLanguageId: null as unknown as number,
      });

      const res = await get(`/opportunity/${opportunity.id}`);

      expect(res.json().data.originalLanguage).toBe("de");
    });
  });

  describe("GET /opportunity", () => {
    it("returns English titles with ?language=en", async () => {
      const opportunity = await germanOpportunity({
        title: `Childcare list ${suffix}`,
        info: "We are looking for volunteers",
      });

      const res = await get(
        "/opportunity?language=en&limit=120&sortOrder=new-old",
      );

      expect(res.statusCode).toBe(200);
      const entry = res
        .json()
        .data.find((o: { id: number }) => o.id === opportunity.id);
      expect(entry).toMatchObject({
        title: `Childcare list ${suffix}`,
        originalLanguage: "de",
      });
    });
  });

  describe("routes embedding opportunities", () => {
    const english = {
      title: `Childcare ${suffix}`,
      info: "We need volunteers",
    };

    it("GET /volunteer/opportunity: translates and still filters", async () => {
      // `language` used to be spread into the column filter (be#1068).
      const opportunity = await germanOpportunity(english);

      const res = await get(
        `/volunteer/opportunity?type=regular&status=${OpportunityStatusType.NEW}&agentId=${agent.id}&language=en`,
      );

      expect(res.statusCode).toBe(200);
      const entry = res
        .json()
        .data.find((o: { id: number }) => o.id === opportunity.id);
      expect(entry?.title).toBe(english.title);
    });

    it("GET /agent/:id/opportunity-linked: translates", async () => {
      const opportunity = await germanOpportunity(english);

      const res = await get(
        `/agent/${agent.id}/opportunity-linked?language=en`,
      );

      expect(res.statusCode).toBe(200);
      const entry = res
        .json()
        .data.find((o: { id: number }) => o.id === opportunity.id);
      expect(entry?.title).toBe(english.title);
    });

    describe("/volunteer/:id/opportunity-linked", () => {
      let volunteer: Volunteer;
      let match: OpportunityVolunteer;
      let opportunity: Opportunity;

      beforeAll(async () => {
        opportunity = await germanOpportunity(english);
        const postcode = await dataSource.manager.findOneOrFail(Postcode, {
          where: {},
        });
        const volunteerPerson = await dataSource.manager.save(
          new Person({
            firstName: "Translation",
            lastName: `Volunteer ${suffix}`,
          }),
        );
        const deal = await dataSource.manager.save(
          new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
        );
        volunteer = await dataSource.manager.save(
          new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
        );
        match = await dataSource.manager.save(
          new OpportunityVolunteer({
            opportunityId: opportunity.id,
            volunteerId: volunteer.id,
            status: OpportunityVolunteerStatusType.PENDING,
          }),
        );
      });

      afterAll(async () => {
        await dataSource.manager.delete(OpportunityVolunteer, { id: match.id });
        await dataSource.manager.delete(VolunteerAuditLog, {
          volunteerId: volunteer.id,
        });
        await dataSource.manager.delete(Volunteer, { id: volunteer.id });
      });

      it("GET translates the linked opportunity", async () => {
        const res = await get(
          `/volunteer/${volunteer.id}/opportunity-linked?language=en`,
        );

        expect(res.statusCode).toBe(200);
        expect(res.json().data[0].title).toBe(english.title);
      });

      it("PATCH translates the response but logs the original title", async () => {
        const res = await fastify.inject({
          method: "PATCH",
          url: `/volunteer/${volunteer.id}/opportunity-linked/${match.id}?language=en`,
          cookies: { [accessCookieName]: cookie },
          payload: { status: OpportunityVolunteerStatusType.MATCHED },
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().data.title).toBe(english.title);
        const log = await dataSource.manager.findOneByOrFail(
          VolunteerAuditLog,
          {
            volunteerId: volunteer.id,
          },
        );
        expect(log.detail).toContain(opportunity.title);
        expect(log.detail).not.toContain(english.title);
      });
    });

    it("GET /post: translates linked opportunity titles", async () => {
      const opportunity = await germanOpportunity(english);
      const text = `Post about childcare ${suffix}`;
      const post = await dataSource.manager.save(
        new Post({
          text,
          authorId: person.id,
          linkedOpportunities: [opportunity],
        }),
      );

      try {
        const res = await get(
          `/post?search=${encodeURIComponent(text)}&language=en`,
        );

        expect(res.statusCode).toBe(200);
        const entry = res
          .json()
          .data.find((p: { id: number }) => p.id === post.id);
        expect(entry?.linkedOpportunities?.[0]?.title).toBe(english.title);
      } finally {
        await dataSource.manager.delete(Post, { id: post.id });
      }
    });

    it("POST /post: translates linked opportunity titles in the response", async () => {
      const opportunity = await germanOpportunity(english);

      const res = await fastify.inject({
        method: "POST",
        url: "/post?language=en",
        cookies: { [accessCookieName]: cookie },
        payload: {
          text: `New post ${suffix}`,
          linkedOpportunityIds: [opportunity.id],
        },
      });

      try {
        expect(res.statusCode).toBeLessThan(300);
        expect(res.json().data.linkedOpportunities[0].title).toBe(
          english.title,
        );
        const stored = await dataSource.manager.findOneByOrFail(Opportunity, {
          id: opportunity.id,
        });
        expect(stored.title).toBe(opportunity.title);
      } finally {
        await dataSource.manager.delete(Post, { id: res.json().data.id });
      }
    });

    it("PATCH /post/:id: translates linked opportunity titles in the response", async () => {
      const opportunity = await germanOpportunity(english);
      const post = await dataSource.manager.save(
        new Post({ text: `Patched post ${suffix}`, authorId: person.id }),
      );

      try {
        const res = await fastify.inject({
          method: "PATCH",
          url: `/post/${post.id}?language=en`,
          cookies: { [accessCookieName]: cookie },
          payload: { linkedOpportunityIds: [opportunity.id] },
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().data.linkedOpportunities[0].title).toBe(
          english.title,
        );
      } finally {
        await dataSource.manager.delete(Post, { id: post.id });
      }
    });

    it("public GET /opportunity/legacy: translates title and info", async () => {
      const opportunity = await germanOpportunity(english);

      const res = await fastify.inject({
        method: "GET",
        url: "/opportunity/legacy?language=en",
      });

      expect(res.statusCode).toBe(200);
      const entry = res
        .json()
        .find((o: { id: number }) => o.id === opportunity.id);
      expect(entry).toMatchObject({
        title: english.title,
        vo_information: english.info,
      });
    });
  });
});
