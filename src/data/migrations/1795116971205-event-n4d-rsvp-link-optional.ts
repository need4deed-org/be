import { MigrationInterface, QueryRunner } from "typeorm";

export class EventN4dRsvpLinkOptional1795116971205
  implements MigrationInterface
{
  name = "EventN4dRsvpLinkOptional1795116971205";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_n4d" ALTER COLUMN "rsvp_link" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_n4d" ALTER COLUMN "rsvp_link" SET NOT NULL`,
    );
  }
}
