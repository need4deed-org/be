import { FastifyInstance } from "fastify";
import {
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import DistrictPostcode from "../../../data/entity/m2m/district-postcode";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("opportunity own address (be#1291)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const prefix = `Own Address ${suffix}`;
  let ngoPostcode: Postcode;
  let ngoDistrictId: number;
  let ownPostcode: Postcode;
  let ownDistrictId: number;
  let otherPostcode: Postcode;
  let otherDistrictId: number;
  let agent: Agent;
  let agentAddress: Address;
  let coordinator: Person;
  let cookie: string;
  const deals: Deal[] = [];
  const accompanyings: Accompanying[] = [];

  const addressRepository = () => getRepository(dataSource, Address);

  async function newOpportunity(
    overrides: Partial<Opportunity> = {},
  ): Promise<Opportunity> {
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: ngoPostcode.id }),
    );
    deals.push(deal);
    return fastify.db.opportunityRepository.save(
      new Opportunity({
        title: prefix,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.SEARCHING,
        dealId: deal.id,
        agentId: agent.id,
        districtId: ngoDistrictId,
        ...overrides,
      }),
    );
  }

  const patch = (id: number, payload: object) =>
    fastify.inject({
      method: "PATCH",
      url: `/opportunity/${id}`,
      cookies: { [accessCookieName]: cookie },
      payload,
    });
  const stored = (id: number) =>
    fastify.db.opportunityRepository.findOneOrFail({
      where: { id },
      relations: ["address.postcode"],
    });
  const ownAddress = (postcode: Postcode, street = "Musterstraße 1") => ({
    street,
    postcode: postcode.value,
    city: "Berlin",
  });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const links = await getRepository(dataSource, DistrictPostcode).find({
      relations: ["postcode"],
      order: { id: "ASC" },
    });
    const firstLinkByPostcode = new Map<number, DistrictPostcode>();
    for (const link of links) {
      if (!firstLinkByPostcode.has(link.postcodeId)) {
        firstLinkByPostcode.set(link.postcodeId, link);
      }
    }
    const [ngoLink, ownLink, otherLink] = [
      ...firstLinkByPostcode.values(),
    ].filter(
      (link, index, all) =>
        all.findIndex((other) => other.districtId === link.districtId) ===
        index,
    );
    if (!ngoLink || !ownLink || !otherLink) {
      throw new Error(
        "Fixture needs seeded postcodes in at least three districts (district_postcode).",
      );
    }
    ({ postcode: ngoPostcode, districtId: ngoDistrictId } = ngoLink);
    ({ postcode: ownPostcode, districtId: ownDistrictId } = ownLink);
    ({ postcode: otherPostcode, districtId: otherDistrictId } = otherLink);

    agentAddress = await addressRepository().save(
      new Address({ postcodeId: ngoPostcode.id }),
    );
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `${prefix} NGO`,
        addressId: agentAddress.id,
        districtId: ngoDistrictId,
      }),
    );

    coordinator = await fastify.db.personRepository.save(
      new Person({ firstName: "Own", lastName: `Address${suffix}` }),
    );
    const email = `own-address-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinator.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    cookie = res.cookies.find((c) => c.name === accessCookieName)
      ?.value as string;
  });

  afterAll(async () => {
    const opportunities = await fastify.db.opportunityRepository.find({
      where: { title: prefix },
    });
    await fastify.db.opportunityRepository.delete({ title: prefix });
    const ownAddressIds = opportunities
      .map(({ addressId }) => addressId)
      .filter((id): id is number => !!id);
    if (ownAddressIds.length) {
      await addressRepository().delete(ownAddressIds);
    }
    for (const accompanying of accompanyings) {
      await fastify.db.accompanyingRepository.delete({ id: accompanying.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await addressRepository().delete({ id: agentAddress.id });
    await fastify.db.userRepository.delete({ personId: coordinator.id });
    await fastify.db.personRepository.delete({ id: coordinator.id });
    await fastify.close();
  });

  describe("PATCH /opportunity/:id", () => {
    it("adds an own address and takes the district from its postcode", async () => {
      const opportunity = await newOpportunity();

      const res = await patch(opportunity.id, {
        address: ownAddress(ownPostcode, " Musterstraße 1 "),
      });

      expect(res.statusCode).toBe(204);
      const saved = await stored(opportunity.id);
      expect(saved.address).toMatchObject({
        street: "Musterstraße 1",
        city: "Berlin",
        postcode: { value: ownPostcode.value },
      });
      expect(saved.districtId).toBe(ownDistrictId);
    });

    it("updates the same address row in place and re-syncs the district", async () => {
      const opportunity = await newOpportunity();
      await patch(opportunity.id, { address: ownAddress(ownPostcode) });
      const { addressId } = await stored(opportunity.id);

      const res = await patch(opportunity.id, {
        address: ownAddress(otherPostcode, "Andere Straße 2"),
      });

      expect(res.statusCode).toBe(204);
      const saved = await stored(opportunity.id);
      expect(saved.addressId).toBe(addressId);
      expect(saved.address).toMatchObject({
        street: "Andere Straße 2",
        postcode: { value: otherPostcode.value },
      });
      expect(saved.districtId).toBe(otherDistrictId);
    });

    it("leaves the address alone when the body doesn't mention it", async () => {
      const opportunity = await newOpportunity();
      await patch(opportunity.id, { address: ownAddress(ownPostcode) });

      const res = await patch(opportunity.id, { title: prefix });

      expect(res.statusCode).toBe(204);
      const saved = await stored(opportunity.id);
      expect(saved.addressId).not.toBeNull();
      expect(saved.districtId).toBe(ownDistrictId);
    });

    it("goes back to the NGO's address on null: the row is deleted and the district re-derived", async () => {
      const opportunity = await newOpportunity();
      await patch(opportunity.id, { address: ownAddress(ownPostcode) });
      const { addressId } = await stored(opportunity.id);

      const res = await patch(opportunity.id, { address: null });

      expect(res.statusCode).toBe(204);
      const saved = await stored(opportunity.id);
      expect(saved.addressId).toBeNull();
      expect(saved.districtId).toBeNull();
      expect(
        await addressRepository().findOneBy({ id: addressId! }),
      ).toBeNull();

      const detail = await fastify.inject({
        method: "GET",
        url: `/opportunity/${opportunity.id}`,
        cookies: { [accessCookieName]: cookie },
      });
      expect(detail.statusCode).toBe(200);
      expect(detail.json().data.district.id).toBe(ngoDistrictId);
    });

    it.each([
      [
        "a non-German postcode",
        { street: "Rue 1", postcode: "75001x", city: "Paris" },
      ],
      ["a blank city", { street: "Weg 1", postcode: "10115", city: " " }],
      ["a missing street", { postcode: "10115", city: "Berlin" }],
      ["an empty string", ""],
    ])("rejects %s with 400 and changes nothing", async (_, address) => {
      const opportunity = await newOpportunity();
      await patch(opportunity.id, { address: ownAddress(ownPostcode) });
      const before = await stored(opportunity.id);

      const res = await patch(opportunity.id, { address });

      expect(res.statusCode).toBe(400);
      expect(await stored(opportunity.id)).toEqual(before);
    });

    it("rejects an address on an accompanying opportunity with 400", async () => {
      const opportunity = await newOpportunity({
        type: OpportunityType.ACCOMPANYING,
      });

      const res = await patch(opportunity.id, {
        address: ownAddress(ownPostcode),
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toMatch(/accompanying/i);
      expect((await stored(opportunity.id)).addressId).toBeNull();
    });

    it("drops the own address when the opportunity switches to accompanying", async () => {
      const opportunity = await newOpportunity();
      await patch(opportunity.id, { address: ownAddress(ownPostcode) });
      const { addressId } = await stored(opportunity.id);
      const appointment = await fastify.db.accompanyingRepository.save(
        new Accompanying({
          name: "Refugee",
          address: "Appointment St 1",
          postcodeId: otherPostcode.id,
        }),
      );
      accompanyings.push(appointment);
      await fastify.db.opportunityRepository.update(opportunity.id, {
        accompanyingId: appointment.id,
      });

      const res = await patch(opportunity.id, {
        opportunity_type: OpportunityType.ACCOMPANYING,
      });

      expect(res.statusCode).toBe(204);
      const saved = await stored(opportunity.id);
      expect(saved.addressId).toBeNull();
      expect(saved.districtId).toBe(otherDistrictId);
      expect(
        await addressRepository().findOneBy({ id: addressId! }),
      ).toBeNull();
    });

    it("keeps the new address's district when an accompanying opportunity becomes regular with one", async () => {
      const appointment = await fastify.db.accompanyingRepository.save(
        new Accompanying({
          name: "Refugee",
          address: "Appointment St 2",
          postcodeId: otherPostcode.id,
        }),
      );
      accompanyings.push(appointment);
      const opportunity = await newOpportunity({
        type: OpportunityType.ACCOMPANYING,
        accompanyingId: appointment.id,
        districtId: otherDistrictId,
      });

      const res = await patch(opportunity.id, {
        opportunity_type: OpportunityType.REGULAR,
        address: ownAddress(ownPostcode),
      });

      expect(res.statusCode).toBe(204);
      const saved = await stored(opportunity.id);
      expect(saved.type).toBe(OpportunityType.REGULAR);
      expect(saved.accompanyingId).toBeNull();
      expect(saved.districtId).toBe(ownDistrictId);
    });
  });

  describe("GET /opportunity/:id", () => {
    type Caller = "ngo" | "matchedVolunteer" | "pendingVolunteer";
    const callerCookies = {} as Record<Caller, string>;
    const callerPersons: Person[] = [];
    const volunteers: Volunteer[] = [];
    let opportunity: Opportunity;

    async function loginAs(caller: Caller, role: UserRole): Promise<Person> {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Own", lastName: `${caller}${suffix}` }),
      );
      callerPersons.push(person);
      const email = `own-address-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: await hashPassword(PASSWORD),
          role,
          isActive: true,
          personId: person.id,
        }),
      );
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      callerCookies[caller] = res.cookies.find(
        (c) => c.name === accessCookieName,
      )?.value as string;
      return person;
    }

    async function volunteerWithMatch(
      caller: Caller,
      status: OpportunityVolunteerStatusType,
    ): Promise<void> {
      const person = await loginAs(caller, UserRole.VOLUNTEER);
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: ngoPostcode.id }),
      );
      deals.push(deal);
      const volunteer = await fastify.db.volunteerRepository.save(
        new Volunteer({ personId: person.id, dealId: deal.id }),
      );
      volunteers.push(volunteer);
      await fastify.db.opportunityVolunteerRepository.save(
        new OpportunityVolunteer({
          opportunityId: opportunity.id,
          volunteerId: volunteer.id,
          status,
        }),
      );
    }

    const getAs = (as: Caller | "coordinator") =>
      fastify.inject({
        method: "GET",
        url: `/opportunity/${opportunity.id}`,
        cookies: {
          [accessCookieName]: as === "coordinator" ? cookie : callerCookies[as],
        },
      });

    beforeAll(async () => {
      opportunity = await newOpportunity();
      await patch(opportunity.id, { address: ownAddress(ownPostcode) });

      const ngoPerson = await loginAs("ngo", UserRole.AGENT);
      await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId: agent.id,
          personId: ngoPerson.id,
          role: AgentRoleType.SOCIAL_WORKER,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
      await volunteerWithMatch(
        "matchedVolunteer",
        OpportunityVolunteerStatusType.MATCHED,
      );
      await volunteerWithMatch(
        "pendingVolunteer",
        OpportunityVolunteerStatusType.PENDING,
      );
    });

    afterAll(async () => {
      for (const volunteer of volunteers) {
        await fastify.db.opportunityVolunteerRepository.delete({
          volunteerId: volunteer.id,
        });
        await fastify.db.volunteerRepository.delete({ id: volunteer.id });
      }
      for (const person of callerPersons) {
        await fastify.db.agentPersonRepository.delete({ personId: person.id });
        await fastify.db.userRepository.delete({ personId: person.id });
        await fastify.db.personRepository.delete({ id: person.id });
      }
    });

    it.each(["coordinator", "ngo", "matchedVolunteer"] as const)(
      "returns the address to the %s",
      async (as) => {
        const res = await getAs(as);

        expect(res.statusCode).toBe(200);
        expect(res.json().data).toMatchObject({
          address: ownAddress(ownPostcode),
          postcode: ownPostcode.value,
          district: { id: ownDistrictId },
        });
      },
    );

    it("returns a null address, but the own postcode and district, to a volunteer who isn't matched", async () => {
      const res = await getAs("pendingVolunteer");

      expect(res.statusCode).toBe(200);
      const { data } = res.json();
      expect(data.address).toBeNull();
      expect(data.postcode).toBe(ownPostcode.value);
      expect(data.district).toEqual({ id: ownDistrictId });
      expect(res.body).not.toContain("Musterstraße");
    });

    it("returns a null address for an opportunity without one", async () => {
      const withoutAddress = await newOpportunity();

      const res = await fastify.inject({
        method: "GET",
        url: `/opportunity/${withoutAddress.id}`,
        cookies: { [accessCookieName]: cookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.address).toBeNull();
      expect(res.json().data.postcode).toBe(ngoPostcode.value);
    });
  });

  describe("DELETE /opportunity/:id", () => {
    it("deletes the opportunity's own address row with it", async () => {
      const opportunity = await newOpportunity();
      await patch(opportunity.id, { address: ownAddress(ownPostcode) });
      const { addressId } = await stored(opportunity.id);

      const res = await fastify.inject({
        method: "DELETE",
        url: `/opportunity/${opportunity.id}`,
        cookies: { [accessCookieName]: cookie },
      });

      expect(res.statusCode).toBe(200);
      expect(
        await addressRepository().findOneBy({ id: addressId! }),
      ).toBeNull();
    });
  });

  describe("postcode validation", () => {
    let storedInvalid: Postcode;

    beforeAll(async () => {
      storedInvalid = await fastify.db.postcodeRepository.save(
        new Postcode({ value: `X${suffix}`.slice(0, 5) }),
      );
    });

    afterAll(async () => {
      await fastify.db.postcodeRepository.delete({ id: storedInvalid.id });
    });

    it("rejects a non-German postcode even when it is already stored", async () => {
      const opportunity = await newOpportunity();

      const res = await patch(opportunity.id, {
        address: { street: "Weg 1", postcode: storedInvalid.value, city: "X" },
      });

      expect(res.statusCode).toBe(400);
      expect((await stored(opportunity.id)).addressId).toBeNull();
    });
  });

  describe("GET /opportunity/map", () => {
    let ngoWithoutDistrict: Agent;
    let ngoWithoutDistrictAddress: Address;
    let unlinkedPostcode: Postcode;

    beforeAll(async () => {
      let value: string;
      do {
        value = `8${randomNumericSuffix(4)}`;
      } while (await fastify.db.postcodeRepository.findOneBy({ value }));
      unlinkedPostcode = await fastify.db.postcodeRepository.save(
        new Postcode({ value }),
      );
      ngoWithoutDistrictAddress = await addressRepository().save(
        new Address({ postcodeId: ngoPostcode.id }),
      );
      ngoWithoutDistrict = await fastify.db.agentRepository.save(
        new Agent({
          title: `${prefix} NGO without district`,
          addressId: ngoWithoutDistrictAddress.id,
        }),
      );
    });

    afterAll(async () => {
      const opportunities = await fastify.db.opportunityRepository.find({
        where: { agentId: ngoWithoutDistrict.id },
      });
      await fastify.db.opportunityRepository.delete({
        agentId: ngoWithoutDistrict.id,
      });
      const ownAddressIds = opportunities
        .map(({ addressId }) => addressId)
        .filter((id): id is number => !!id);
      if (ownAddressIds.length) {
        await addressRepository().delete(ownAddressIds);
      }
      await fastify.db.agentRepository.delete({ id: ngoWithoutDistrict.id });
      await addressRepository().delete({ id: ngoWithoutDistrictAddress.id });
      await fastify.db.postcodeRepository.delete({ id: unlinkedPostcode.id });
    });

    it("doesn't count an own address outside any district in the NGO's district", async () => {
      const atNgo = await newOpportunity({
        agentId: ngoWithoutDistrict.id,
        districtId: undefined,
      });
      const elsewhereAddress = await addressRepository().save(
        new Address({
          street: "Weg 1",
          city: "X",
          postcodeId: unlinkedPostcode.id,
        }),
      );
      await newOpportunity({
        agentId: ngoWithoutDistrict.id,
        districtId: undefined,
        addressId: elsewhereAddress.id,
      });

      const res = await fastify.inject({
        method: "GET",
        url: `/opportunity/map?districtId=${ngoDistrictId}&language=de&filter[agentId]=${ngoWithoutDistrict.id}`,
        cookies: { [accessCookieName]: cookie },
      });

      expect(res.statusCode).toBe(200);
      const { markers, total } = res.json().data;
      expect(total).toBe(1);
      expect(
        markers.flatMap(({ children }: { children: { id: number }[] }) =>
          children.map(({ id }) => id),
        ),
      ).toEqual([atNgo.id]);
    });
  });
});
