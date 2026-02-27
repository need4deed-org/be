import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  OpportunityVolunteerStatusType,
  VolunteerLegacyFormData,
} from "need4deed-sdk";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
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
      const volunteerFormData = await getVolunteerFormData(request.body);

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

        if (request.body.origin_opportunity) {
          const opportunityVolunteerRepository =
            fastify.db.opportunityVolunteerRepository;
          const opportunityVolunteer = new OpportunityVolunteer({
            volunteerId: id,
            opportunityId: request.body.origin_opportunity,
            status: OpportunityVolunteerStatusType.SUGGESTED,
          });

          await opportunityVolunteerRepository.save(opportunityVolunteer);
        }
      }

      const opportunityMessage = request.body.origin_opportunity
        ? ` with opportunity id:${request.body.origin_opportunity}`
        : "";
      return reply.status(200).send({
        message: `Volunteer has been created.${opportunityMessage}`,
        data: { id },
      });
    },
  );
}
