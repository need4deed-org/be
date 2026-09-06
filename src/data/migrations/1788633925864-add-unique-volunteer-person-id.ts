import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueVolunteerPersonId1788633925864
  implements MigrationInterface
{
  name = "AddUniqueVolunteerPersonId1788633925864";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP CONSTRAINT "FK_fc40d3eada517c3c9315e0c9e51"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD CONSTRAINT "UQ_fc40d3eada517c3c9315e0c9e51" UNIQUE ("person_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD CONSTRAINT "FK_fc40d3eada517c3c9315e0c9e51" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP CONSTRAINT "FK_fc40d3eada517c3c9315e0c9e51"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP CONSTRAINT "UQ_fc40d3eada517c3c9315e0c9e51"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD CONSTRAINT "FK_fc40d3eada517c3c9315e0c9e51" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
