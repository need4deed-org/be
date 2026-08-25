import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueEventTranslationLanguage1787521051623
  implements MigrationInterface
{
  name = "AddUniqueEventTranslationLanguage1787521051623";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defensively drop any duplicate (eventn4d_id, language_id) rows a
    // concurrent-PATCH race (be#905) may have already produced before
    // enforcing uniqueness, keeping the lowest id.
    await queryRunner.query(
      `DELETE FROM "event_translation" a USING "event_translation" b WHERE a.id > b.id AND a.eventn4d_id = b.eventn4d_id AND a.language_id = b.language_id`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_translation" ADD CONSTRAINT "UQ_592ae4cbcb9092c02edd1a04106" UNIQUE ("eventn4d_id", "language_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_translation" DROP CONSTRAINT "UQ_592ae4cbcb9092c02edd1a04106"`,
    );
  }
}
