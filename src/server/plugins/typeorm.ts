import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { AppDataSource } from "../../data/data-source";
import { Person } from "../../data/entity/person.entity";
import { User } from "../../data/entity/user.entity";

const typeormPlugin: FastifyPluginAsync = async (fastify, opts) => {
  try {
    await AppDataSource.initialize();
    fastify.log.info("TypeORM Data Source has been initialized!");

    // Decorate the Fastify instance with repositories
    fastify.decorate("db", {
      userRepository: AppDataSource.getRepository(User),
      personRepository: AppDataSource.getRepository(Person),
    });

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
