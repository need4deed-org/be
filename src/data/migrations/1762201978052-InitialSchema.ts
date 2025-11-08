import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1762201978052 implements MigrationInterface {
    name = 'InitialSchema1762201978052'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event_translation" DROP CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event_translation" ADD CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66" FOREIGN KEY ("eventn4d_id") REFERENCES "event_n4d"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
