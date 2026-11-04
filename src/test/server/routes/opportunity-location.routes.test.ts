import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import DistrictPostcode from "../../../data/entity/m2m/district-postcode";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type Caller = "volunteer" | "coordinator";

describe("opportunity location: appointment postcode for accompanying (be#1210)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const prefix = `Location ${suffix}`;
  let ngoPostcode: Postcode;
  let appointmentPostcode: Postcode;
  let ngoDistrictId: number;
  let appointmentDistrictId: number;
  let accompanying: Accompanying;
  const deals: Deal[] = [];
  const persons: Person[] = [];
  const opportunities = {} as Record<"accompanying" | "regular", Opportunity>;
  const cookies = {} as Record<Caller, string>;

  const get = (url: string, as: Caller) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookies[as] },
    });

  const listed = async (as: Caller, id: number) => {
    const res = await get(
      `/opportunity?limit=100&filter[search]=${encodeURIComponent(prefix)}`,
      as,
    );
    expect(res.statusCode).toBe(200);
    return res.json().data.find((row: { id: number }) => row.id === id);
  };

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
    const [ngoLink, appointmentLink] = [...firstLinkByPostcode.values()].filter(
      (link, index, all) =>
        all.findIndex((other) => other.districtId === link.districtId) ===
        index,
    );
    if (!ngoLink || !appointmentLink) {
      throw new Error(
        "Fixture needs seeded postcodes in at least two districts (district_postcode).",
      );
    }
    ngoPostcode = ngoLink.postcode;
    ngoDistrictId = ngoLink.districtId;
    appointmentPostcode = appointmentLink.postcode;
    appointmentDistrictId = appointmentLink.districtId;

    accompanying = await fastify.db.accompanyingRepository.save(
      new Accompanying({
        name: "Refugee",
        address: "Appointment St 1",
        postcodeId: appointmentPostcode.id,
      }),
    );

    for (const type of [
      OpportunityType.ACCOMPANYING,
      OpportunityType.REGULAR,
    ] as const) {
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: ngoPostcode.id }),
      );
      deals.push(deal);
      const key =
        type === OpportunityType.ACCOMPANYING ? "accompanying" : "regular";
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `${prefix} ${key}`,
          type,
          status: OpportunityStatusType.SEARCHING,
          dealId: deal.id,
          districtId: ngoDistrictId,
          accompanyingId:
            type === OpportunityType.ACCOMPANYING ? accompanying.id : undefined,
        }),
      );
    }

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      volunteer: UserRole.VOLUNTEER,
      coordinator: UserRole.COORDINATOR,
    };
    for (const caller of Object.keys(roles) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Location", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      const email = `location-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: roles[caller],
          isActive: true,
          personId: person.id,
        }),
      );
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }
  });

  afterAll(async () => {
    for (const opportunity of Object.values(opportunities)) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    await fastify.db.accompanyingRepository.delete({ id: accompanying.id });
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.close();
  });

  it("lists an accompanying opportunity with its appointment postcode and district", async () => {
    const row = await listed("coordinator", opportunities.accompanying.id);
    expect(row.postcode).toBe(appointmentPostcode.value);
    expect(row.district).toEqual({ id: appointmentDistrictId });
  });

  it("returns the same postcode and district on the detail", async () => {
    const res = await get(
      `/opportunity/${opportunities.accompanying.id}`,
      "coordinator",
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      postcode: appointmentPostcode.value,
      district: { id: appointmentDistrictId },
    });
  });

  it("keeps the NGO's postcode and district for a regular opportunity", async () => {
    const row = await listed("coordinator", opportunities.regular.id);
    expect(row.postcode).toBe(ngoPostcode.value);
    expect(row.district).toEqual({ id: ngoDistrictId });
  });

  it("hides the appointment postcode from a volunteer who isn't matched", async () => {
    const row = await listed("volunteer", opportunities.accompanying.id);
    expect(row.postcode).toBeNull();
    expect(row.district).toEqual({ id: appointmentDistrictId });
  });

  it("returns the same postcode on the volunteer-facing list", async () => {
    const res = await get(
      `/volunteer/opportunity?limit=100&type=${OpportunityType.ACCOMPANYING}&status=${OpportunityStatusType.SEARCHING}&search=${encodeURIComponent(prefix)}`,
      "coordinator",
    );
    expect(res.statusCode).toBe(200);
    const row = res
      .json()
      .data.find((r: { id: number }) => r.id === opportunities.accompanying.id);
    expect(row.postcode).toBe(appointmentPostcode.value);
  });

  it("stores the new appointment postcode's district when it is edited", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunities.accompanying.id}`,
      cookies: { [accessCookieName]: cookies.coordinator },
      payload: {
        accompanyingDetails: { appointmentPostcode: ngoPostcode.value },
      },
    });
    expect(res.statusCode).toBe(204);

    const stored = await fastify.db.opportunityRepository.findOneByOrFail({
      id: opportunities.accompanying.id,
    });
    expect(stored.districtId).toBe(ngoDistrictId);
  });
});
