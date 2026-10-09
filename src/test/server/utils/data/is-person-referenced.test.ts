import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Deal from "../../../../data/entity/deal.entity";
import Person from "../../../../data/entity/person.entity";
import Post from "../../../../data/entity/post.entity";
import Volunteer from "../../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../../data/types";
import { getPostcode } from "../../../../data/utils";
import { createServer } from "../../../../server";
import { isPersonReferenced } from "../../../../server/utils/data/is-person-referenced";

describe("isPersonReferenced", () => {
  let fastify: FastifyInstance;
  const createdPersonIds: number[] = [];
  const createdPostIds: number[] = [];
  const createdVolunteerIds: number[] = [];
  const createdDealIds: number[] = [];

  async function makePerson(): Promise<Person> {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Referenced", lastName: "Maybe" }),
    );
    createdPersonIds.push(person.id);
    return person;
  }

  function referenced(person: Person) {
    return isPersonReferenced(fastify.db.personRepository.manager, person.id);
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    const manager = fastify.db.personRepository.manager;
    for (const id of createdPostIds) {
      await manager.delete(Post, { id });
    }
    for (const id of createdVolunteerIds) {
      await fastify.db.volunteerRepository.delete({ id });
    }
    for (const id of createdDealIds) {
      await fastify.db.dealRepository.delete({ id });
    }
    for (const id of createdPersonIds) {
      await fastify.db.personRepository.delete({ id });
    }
    await fastify.close();
  });

  it("is false for a Person nothing points at", async () => {
    expect(await referenced(await makePerson())).toBe(false);
  });

  it("is true for a Person with a Volunteer (many-to-one)", async () => {
    const person = await makePerson();
    const postcode = await getPostcode("10115");
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    createdDealIds.push(deal.id);
    const volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ personId: person.id, dealId: deal.id }),
    );
    createdVolunteerIds.push(volunteer.id);

    expect(await referenced(person)).toBe(true);
  });

  it("is true for a Person tagged in a Post (many-to-many junction)", async () => {
    const author = await makePerson();
    const tagged = await makePerson();
    const post = await fastify.db.personRepository.manager.save(
      new Post({ text: "hello", authorId: author.id, taggedPersons: [tagged] }),
    );
    createdPostIds.push(post.id);

    expect(await referenced(tagged)).toBe(true);
    expect(await referenced(author)).toBe(true);
  });
});
