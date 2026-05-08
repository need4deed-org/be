import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { initDatabase } from "../../data";
import { dataSource } from "../../data/data-source";
import Comment from "../../data/entity/comment.entity";
import Communication from "../../data/entity/communication.entity";
import Deal from "../../data/entity/deal.entity";
import Document from "../../data/entity/document.entity";
import FieldTranslation from "../../data/entity/field_translation.entity";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../data/entity/opportunity/agent.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import Option from "../../data/entity/option.entity";
import Organization from "../../data/entity/organization.entity";
import Person from "../../data/entity/person.entity";
import Language from "../../data/entity/profile/language.entity";
import User from "../../data/entity/user.entity";
import Appreciation from "../../data/entity/volunteer/appreciation.entity";
import VolunteerListMV from "../../data/entity/volunteer/volunteer-list-mv.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import logger from "../../logger";

const typeormPlugin: FastifyPluginAsync = async (fastify) => {
  try {
    if (!dataSource.isInitialized) {
      logger.info("Initializing TypeORM Data Source...");
      await initDatabase();
    }
    logger.info("TypeORM Data Source has been initialized!");

    // Decorate the Fastify instance with repositories
    fastify.decorate("db", {
      userRepository: dataSource.getRepository(User),
      personRepository: dataSource.getRepository(Person),
      volunteerRepository: dataSource.getRepository(Volunteer),
      languageRepository: dataSource.getRepository(Language),
      fieldTranslationRepository: dataSource.getRepository(FieldTranslation),
      optionRepository: dataSource.getRepository(Option),
      volunteerListMvRepository: dataSource.getRepository(VolunteerListMV),
      commentRepository: dataSource.getRepository(Comment),
      documentRepository: dataSource.getRepository(Document),
      communicationRepository: dataSource.getRepository(Communication),
      appreciationRepository: dataSource.getRepository(Appreciation),
      opportunityVolunteerRepository:
        dataSource.getRepository(OpportunityVolunteer),
      opportunityRepository: dataSource.getRepository(Opportunity),
      dealRepository: dataSource.getRepository(Deal),
      agentRepository: dataSource.getRepository(Agent),
      organizationRepository: dataSource.getRepository(Organization),
    });

    // TODO: add validation of others
    if (!fastify.db.userRepository || !fastify.db.personRepository) {
      logger.error(
        "ERROR: Repositories were not correctly initialized on fastify.db",
      );
      throw new Error("Database repositories failed to initialize.");
    }

    // Close connection when Fastify closes
    fastify.addHook("onClose", async () => {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
        logger.info("TypeORM Data Source has been closed.");
      }
    });
  } catch (err) {
    logger.error(`Error during TypeORM Data Source initialization: ${err}`);
    throw err; // prevent server from starting without DB
  }
};

export default fp(typeormPlugin, { name: "typeorm-plugin" });
