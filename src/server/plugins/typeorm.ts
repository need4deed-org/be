import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { AppDataSource } from "../../data/data-source";
import { Account } from "../../data/entity/account";
import { Person } from "../../data/entity/person";

const typeormPlugin: FastifyPluginAsync = async (fastify, opts) => {
  try {
    // Initialize TypeORM Data Source
    await AppDataSource.initialize();
    console.log("TypeORM Data Source has been initialized!");

    // Decorate the Fastify instance with repositories
    fastify.decorate("db", {
      accountRepository: AppDataSource.getRepository(Account),
      personRepository: AppDataSource.getRepository(Person),
    });

    if (!fastify.db.accountRepository || !fastify.db.personRepository) {
      fastify.log.error(
        "ERROR: Repositories were not correctly initialized on fastify.db",
      );
      throw new Error("Database repositories failed to initialize.");
    }

    // Close connection when Fastify closes
    fastify.addHook("onClose", async (instance) => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log("TypeORM Data Source has been closed.");
      }
    });
  } catch (err) {
    console.error("Error during TypeORM Data Source initialization:", err);
    throw err; // Rethrow to prevent server from starting without DB
  }
};

export default fp(typeormPlugin, { name: "typeorm-plugin" });
