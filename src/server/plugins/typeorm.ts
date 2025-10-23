import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { AppDataSource } from "../../data/data-source";
import FieldTranslation from "../../data/entity/field_translation.entity";
import Option from "../../data/entity/option.entity";
import Person from "../../data/entity/person.entity";
import Language from "../../data/entity/profile/language.entity";
import User from "../../data/entity/user.entity";
import VolunteerListMV from "../../data/entity/volunteer/volunteer-list-mv.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";

const typeormPlugin: FastifyPluginAsync = async (fastify, opts) => {
  try {
    await AppDataSource.initialize();
    fastify.log.info("TypeORM Data Source has been initialized!");

    // Decorate the Fastify instance with repositories
    fastify.decorate("db", {
      userRepository: AppDataSource.getRepository(User),
      personRepository: AppDataSource.getRepository(Person),
      volunteerRepository: AppDataSource.getRepository(Volunteer),
      languageRepository: AppDataSource.getRepository(Language),
      fieldTranslationRepository: AppDataSource.getRepository(FieldTranslation),
      optionRepository: AppDataSource.getRepository(Option),
      volunteerListMvRepository: AppDataSource.getRepository(VolunteerListMV),
    });

    // TODO: add validation of others
    if (!fastify.db.userRepository || !fastify.db.personRepository) {
      fastify.log.error(
        "ERROR: Repositories were not correctly initialized on fastify.db",
      );
      throw new Error("Database repositories failed to initialize.");
    }

    // Close connection when Fastify closes
    fastify.addHook("onClose", async (instance) => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        fastify.log.info("TypeORM Data Source has been closed.");
      }
    });
  } catch (err) {
    fastify.log.error("Error during TypeORM Data Source initialization:", err);
    throw err; // prevent server from starting without DB
  }
};

export default fp(typeormPlugin, { name: "typeorm-plugin" });
