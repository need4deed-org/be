import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import DistrictPostcode from "../../../data/entity/m2m/district-postcode";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { getDistrictCentroids } from "../../../data/utils/get-district";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("volunteer district map access", () => {
  let fastify: FastifyInstance;
  let districtId: number;
  let agentPerson: Person;
  let volunteerPerson: Person;
  let volunteerAddress: Address;
  let volunteerPostcode: Postcode;
  let volunteerDistrictPostcode: DistrictPostcode;
  let volunteerDeal: Deal;
  let volunteerProfile: Volunteer;
  let agentCookie: string;
  let volunteerCookie: string;
  const suffix = randomNumericSuffix();

  async function login(email: string): Promise<string> {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return response.cookies.find((cookie) => cookie.name === accessCookieName)!
      .value;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    const [geocodedDistrict]: { districtId: number }[] =
      await fastify.db.districtRepository.manager.query(
        `SELECT dp.district_id AS "districtId"
           FROM district_postcode dp
           JOIN postcode p ON p.id = dp.postcode_id
          WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
          ORDER BY dp.id
          LIMIT 1`,
      );
    districtId = geocodedDistrict.districtId;
    agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Map", lastName: `Agent ${suffix}` }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Map", lastName: `Volunteer ${suffix}` }),
    );
    volunteerPostcode = await fastify.db.postcodeRepository.save(
      new Postcode({ value: `9${suffix}` }),
    );
    volunteerDistrictPostcode = await fastify.db.agentRepository.manager
      .getRepository(DistrictPostcode)
      .save(
        new DistrictPostcode({
          districtId,
          postcodeId: volunteerPostcode.id,
        }),
      );
    volunteerAddress = await fastify.db.agentRepository.manager
      .getRepository(Address)
      .save(new Address({ postcodeId: volunteerPostcode.id }));
    await fastify.db.personRepository.update(volunteerPerson.id, {
      addressId: volunteerAddress.id,
    });
    volunteerDeal = await fastify.db.dealRepository.save(
      new Deal({
        type: DealType.VOLUNTEER,
        postcodeId: volunteerPostcode.id,
      }),
    );
    volunteerProfile = await fastify.db.volunteerRepository.save(
      new Volunteer({
        personId: volunteerPerson.id,
        dealId: volunteerDeal.id,
      }),
    );
    const password = await hashPassword(PASSWORD);
    const agentEmail = `district-map-agent-${suffix}@test.need4deed.org`;
    const volunteerEmail = `district-map-volunteer-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save([
      new User({
        email: agentEmail,
        password,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
      new User({
        email: volunteerEmail,
        password,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: volunteerPerson.id,
      }),
    ]);
    agentCookie = await login(agentEmail);
    volunteerCookie = await login(volunteerEmail);
  });

  afterAll(async () => {
    if (fastify) {
      await fastify.db.userRepository.delete([
        { personId: agentPerson.id },
        { personId: volunteerPerson.id },
      ]);
      if (volunteerProfile) {
        await fastify.db.volunteerRepository.delete({
          id: volunteerProfile.id,
        });
      }
      if (volunteerDeal) {
        await fastify.db.dealRepository.delete({ id: volunteerDeal.id });
      }
      await fastify.db.personRepository.delete([
        { id: agentPerson.id },
        { id: volunteerPerson.id },
      ]);
      if (volunteerAddress) {
        await fastify.db.agentRepository.manager
          .getRepository(Address)
          .delete({ id: volunteerAddress.id });
      }
      if (volunteerDistrictPostcode) {
        await fastify.db.agentRepository.manager
          .getRepository(DistrictPostcode)
          .delete({ id: volunteerDistrictPostcode.id });
      }
      if (volunteerPostcode) {
        await fastify.db.postcodeRepository.delete({
          id: volunteerPostcode.id,
        });
      }
      await fastify.close();
    }
  });

  it("allows agent district aggregates but denies their individual volunteer markers", async () => {
    const aggregate = await fastify.inject({
      method: "GET",
      url: "/volunteer/districts",
      cookies: { [accessCookieName]: agentCookie },
    });
    const markers = await fastify.inject({
      method: "GET",
      url: `/volunteer/map?districtId=${districtId}&language=de`,
      cookies: { [accessCookieName]: agentCookie },
    });

    expect(aggregate.statusCode).toBe(200);
    expect(markers.statusCode).toBe(403);
  });

  it("allows volunteer callers to request their visible volunteer markers", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/volunteer/map?districtId=${districtId}&language=de`,
      cookies: { [accessCookieName]: volunteerCookie },
    });

    expect(response.statusCode).toBe(200);
    const marker = response
      .json()
      .data.markers.find((item: { children: { id: number }[] }) =>
        item.children.some((child) => child.id === volunteerProfile.id),
      );
    const centroid = (await getDistrictCentroids([districtId])).get(districtId);
    expect(marker).toBeDefined();
    expect(marker.lat).toBeCloseTo(centroid!.latitude!);
    expect(marker.lon).toBeCloseTo(centroid!.longitude!);
  });
});
