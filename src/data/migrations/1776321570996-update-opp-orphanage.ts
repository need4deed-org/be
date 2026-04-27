import { MigrationInterface, QueryRunner } from "typeorm";
import { NotFoundError } from "../../config";
import logger from "../../logger";

export class UpdateOppOrphanage1776321570996 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Get the agent
    let [agent] = await queryRunner.query(
      `SELECT id FROM agent WHERE title = $1`,
      ["Orphanage For Opportunities"],
    );
    if (!agent) {
      [agent] = await queryRunner.query(
        `INSERT INTO agent (title, info)
        VALUES ($1, $2)
        RETURNING id`,
        [
          "Orphanage For Opportunities",
          "The dummy agent account for parenting orphaned opportunities.",
        ],
      );
    }
    if (!agent) {
      throw new NotFoundError(
        'Agent "Orphanage For Opportunities" not found and could not be created.',
      );
    }

    // 2. Get the person
    let [person] = await queryRunner.query(
      `SELECT id FROM person
      WHERE first_name = $1 AND last_name = $2`,
      ["Need4Deed", "Staff"],
    );
    logger.debug(
      `UpdateOppOrphanage1776321570996:1:person:${JSON.stringify(person)}`,
    );
    if (!person) {
      [person] = await queryRunner.query(
        `INSERT INTO person (first_name, last_name)
        VALUES ($1, $2)
        RETURNING id`,
        ["Need4Deed", "Staff"],
      );
    }
    logger.debug(
      `UpdateOppOrphanage1776321570996:2:person:${JSON.stringify(person)}`,
    );
    if (!person) {
      throw new NotFoundError("Person with name Need4Deed Staff not found");
    }

    // 3. Create address for the person if not already set
    const [existingAddress] = await queryRunner.query(
      `SELECT a.id FROM address a
      JOIN person p ON p.address_id = a.id
      WHERE p.id = $1`,
      [person.id],
    );

    if (!existingAddress) {
      const [postcode] = await queryRunner.query(
        `SELECT id FROM postcode WHERE value = $1`,
        ["12435"],
      );
      if (!postcode) {
        throw new NotFoundError("Postcode 12435 not found");
      }

      const [newAddress] = await queryRunner.query(
        `INSERT INTO address (street, city, postcode_id)
        VALUES ($1, $2, $3)
        RETURNING id`,
        ["Elsenstraße 87", "Berlin", postcode.id],
      );

      await queryRunner.query(
        `UPDATE person SET address_id = $1 WHERE id = $2`,
        [newAddress.id, person.id],
      );
    }

    // 4. Create agent_person m2m link if not already existent
    const [existingLink] = await queryRunner.query(
      `SELECT id FROM agent_person WHERE agent_id = $1 AND person_id = $2`,
      [agent.id, person.id],
    );

    if (!existingLink) {
      await queryRunner.query(
        `INSERT INTO agent_person (agent_id, person_id, role)
        VALUES ($1, $2, 'volunteer-coordinator')`,
        [agent.id, person.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the agent_person link
    const [agent] = await queryRunner.query(
      `SELECT id FROM agent WHERE title = $1`,
      ["Orphanage For Opportunities"],
    );
    const [person] = await queryRunner.query(
      `SELECT id FROM person WHERE first_name = $1 AND last_name = $2`,
      ["Need4Deed", "Staff"],
    );

    if (agent && person) {
      await queryRunner.query(
        `DELETE FROM agent_person WHERE agent_id = $1 AND person_id = $2`,
        [agent.id, person.id],
      );
    }

    // Remove the address if we assigned one
    if (person) {
      await queryRunner.query(
        `UPDATE person SET address_id = NULL WHERE id = $1`,
        [person.id],
      );
      // Clean up orphaned address rows for this person's street+city combo
      await queryRunner.query(
        `DELETE FROM address
        WHERE street = 'Elsenstraße 87'
          AND city = 'Berlin'
          AND id NOT IN (
            SELECT address_id FROM person WHERE address_id IS NOT NULL
            UNION ALL
            SELECT address_id FROM agent WHERE address_id IS NOT NULL
            UNION ALL
            SELECT address_id FROM organization WHERE address_id IS NOT NULL
          )`,
      );
    }
  }
}
