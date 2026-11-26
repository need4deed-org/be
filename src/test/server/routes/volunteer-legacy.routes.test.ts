import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../data/data-source";
import LeadFrom from "../../../data/entity/lead.entity";
import Address from "../../../data/entity/location/address.entity";
import StatisticsEvent from "../../../data/entity/statistics-event.entity";
import VolunteerLeadFrom from "../../../data/entity/volunteer/volunteer-lead-from.entity";
import { getRepository } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

describe("POST /volunteer/legacy", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const email = `legacy-volunteer-${suffix}@test.need4deed.org`;
  let volunteerId: number | undefined;
  let lead: LeadFrom;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    lead = await dataSource.manager.save(
      new LeadFrom({ title: `Legacy source ${suffix}` }),
    );
  });

  afterAll(async () => {
    if (volunteerId) {
      const volunteer = await fastify.db.volunteerRepository.findOneOrFail({
        where: { id: volunteerId },
        relations: ["person"],
      });
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
      await fastify.db.dealRepository.delete({ id: volunteer.dealId });
      await fastify.db.personRepository.delete({ id: volunteer.personId });
      if (volunteer.person.addressId) {
        await getRepository(dataSource, Address).delete({
          id: volunteer.person.addressId,
        });
      }
    }
    await dataSource.manager.delete(StatisticsEvent, {
      valueKey: String(lead.id),
      metric: "lead-from",
    });
    await dataSource.manager.delete(LeadFrom, lead.id);
    await fastify.close();
  });

  it("posts the new volunteer to the arrivals channel", async () => {
    const arrival = vi
      .spyOn(fastify.notify, "arrival")
      .mockResolvedValue(undefined);

    const res = await fastify.inject({
      method: "POST",
      url: "/volunteer/legacy",
      payload: {
        full_name: `Legacy Volunteer${suffix}`,
        phone: "+491701234567",
        email,
        postal_code: 10115,
        good_conduct_certificate: "No",
        if_measles_vaccination: false,
        lead_from: `${lead.title}, ${lead.title}`,
        schedule: [],
        preferred_berlin_locations: [],
        activities: [],
        skills: [],
        native_languages: [],
        fluent_languages: [],
        intermediate_languages: [],
        comments: "",
        language: "en",
      },
    });

    expect(res.statusCode).toBe(200);
    volunteerId = res.json().data.id;
    const answers = await dataSource.manager.findBy(VolunteerLeadFrom, {
      volunteerId,
    });
    expect(answers).toEqual([
      expect.objectContaining({
        leadFromId: lead.id,
        statisticsEventId: expect.any(Number),
      }),
    ]);
    expect(
      (await dataSource.manager.findOneByOrFail(LeadFrom, { id: lead.id }))
        .count,
    ).toBe(1);
    expect(arrival).toHaveBeenCalledWith(
      expect.stringContaining(
        `New volunteer arrived: Legacy Volunteer${suffix}`,
      ),
    );
    arrival.mockRestore();
  });
});
