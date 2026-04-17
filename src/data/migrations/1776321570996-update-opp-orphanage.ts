import { MigrationInterface, QueryRunner } from "typeorm";
import { NotFoundError } from "../../config";

export class UpdateOppOrphanage1776321570996 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Get the agent
    const [agent] = await queryRunner.query(
      `SELECT id FROM agent WHERE title = 'Orphanage For Opportunities'`,
    );
    if (!agent) {
      throw new NotFoundError('Agent "Orphanage For Opportunities" not found');
    }

    // 2. Get the person
    const [[person]] = await queryRunner.query(
      `UPDATE person
      SET email = 'sarah.doe@need4deed.org'
      WHERE first_name = 'Sarah' AND last_name = 'Doe'
      RETURNING id`,
    );
    if (!person) {
      throw new NotFoundError("Person with name Sarah Doe not found");
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
        `SELECT id FROM postcode WHERE value = '12435'`,
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
      `SELECT id FROM agent WHERE title = 'Orphanage For Opportunities'`,
    );
    const [person] = await queryRunner.query(
      `SELECT id FROM person WHERE email = 'sarah.doe@need4deed.org'`,
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
