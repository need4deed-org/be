import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { VolunteerLegacyFormData } from "need4deed-sdk";
import {
  leadFromParser,
  parseFormData,
  volunteerFormParser,
} from "../../../services";
import { getVolunteerFormData, writeVolunteer } from "../../utils";
import { updateLeads } from "../../utils/updateLeads";

export default async function volunteerLegacyRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Querystring: { id: number }; Body: VolunteerLegacyFormData }>(
    "/",
    async (request, reply) => {
      const opportunityId = request.query.id;
      const volunteerFormData = await getVolunteerFormData(
        Object.assign(request.body, { opportunityId }),
      );

      const volunteer = await parseFormData(
        volunteerFormData,
        volunteerFormParser,
      );

      const leads = await parseFormData(
        volunteerFormData.leadFrom,
        leadFromParser,
      );

      const id = await writeVolunteer(volunteer);
      if (id) {
        await updateLeads(leads);
      }

      return reply.status(200).send({
        message: "Volunteer has been created.",
        data: { id },
      });
    },
  );
}
