import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UserRole } from "need4deed-sdk";
import Profile from "../../../data/entity/profile/profile.entity";
import { categorize } from "../../../data/utils";
import { dtoOpportunityGetList } from "../../../services/dto/dto-opportunity";

export default async function opportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.get("/", async (_request, reply) => {
    const relations = ["deal.profile.profileActivity.activity"];
    const opportunityRepository = fastify.db.opportunityRepository;
    const [opportunities, count] = await opportunityRepository.findAndCount({
      relations,
      skip: 0,
      take: 12,
    });

    const updates: Profile[] = [];
    const data = opportunities.map((opportunity) => {
      if (opportunity.deal.profile.categoryId) {
        return dtoOpportunityGetList(opportunity);
      }
      opportunity.deal.profile.categoryId = categorize(
        opportunity.deal.profile.profileActivity.map(
          ({ activity }) => activity.categoryId,
        ),
      );
      updates.push(opportunity.deal.profile);
      return dtoOpportunityGetList(opportunity);
    });

    if (updates.length > 0) {
      const profileRepository = fastify.db.profileRepository;
      await profileRepository.save(updates);
    }

    return reply.status(200).send({
      message: "Opportunity routes are working.",
      data,
      count,
    });
  });
}
