import { MigrationInterface, QueryRunner } from "typeorm";

export class DropLocation1780516402900 implements MigrationInterface {
  name = "DropLocation1780516402900";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The Location graph is fully dead: districts moved to deal_district (#616),
    // location_address/location_postcode were always empty & unused, and
    // location.type (constant 'district') / location.info (all NULL) are never
    // read. The deal's single postcode lives on deal.postcode_id. Drop it all.
    await queryRunner.query(
      `ALTER TABLE "deal" DROP CONSTRAINT "FK_f5c86a234c167277fb5c18518b9"`,
    );
    await queryRunner.query(`ALTER TABLE "deal" DROP COLUMN "location_id"`);
    await queryRunner.query(`DROP TABLE "location_postcode"`);
    await queryRunner.query(`DROP TABLE "location_district"`);
    await queryRunner.query(`DROP TABLE "location_address"`);
    await queryRunner.query(`DROP TABLE "location"`);
    await queryRunner.query(`DROP TYPE "public"."location_type_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Structural restore only — the (empty/constant) location data is not
    // recovered, and deal.location_id is re-added nullable since the table is
    // already populated.
    await queryRunner.query(
      `CREATE TYPE "public"."location_type_enum" AS ENUM('postcode', 'district', 'address', 'geolocation')`,
    );
    await queryRunner.query(
      `CREATE TABLE "location" ("id" SERIAL NOT NULL, "type" "public"."location_type_enum" NOT NULL DEFAULT 'district', "info" character varying, CONSTRAINT "PK_876d7bdba03c72251ec4c2dc827" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "location_postcode" ("id" SERIAL NOT NULL, "location_id" integer NOT NULL, "postcode_id" integer NOT NULL, CONSTRAINT "PK_5b564ff03a6b7e9427cc3b6c5f0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_postcode" ADD CONSTRAINT "FK_6c2e2c49c9b9e2647a76dce1538" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_postcode" ADD CONSTRAINT "FK_8008547ccf8fed17a64fd13d3a8" FOREIGN KEY ("postcode_id") REFERENCES "postcode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "location_district" ("id" SERIAL NOT NULL, "location_id" integer NOT NULL, "district_id" integer NOT NULL, CONSTRAINT "PK_828664dee332d2dc0499a1bd5e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_district" ADD CONSTRAINT "FK_1c289fab06d04d9bbff9d6d0028" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_district" ADD CONSTRAINT "FK_721d5d8783c928890db616cfbe7" FOREIGN KEY ("district_id") REFERENCES "district"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "location_address" ("id" SERIAL NOT NULL, "location_id" integer NOT NULL, "address_id" integer NOT NULL, CONSTRAINT "PK_bf1188fd425a5c4f19d6fa22c2e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_address" ADD CONSTRAINT "FK_3191fd40b5538e1e5c3857042f2" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_address" ADD CONSTRAINT "FK_bdd8e88dbc7fe1ad3f6b1f949c9" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "deal" ADD "location_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "deal" ADD CONSTRAINT "FK_f5c86a234c167277fb5c18518b9" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
