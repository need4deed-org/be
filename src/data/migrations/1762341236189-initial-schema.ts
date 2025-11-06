import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1762341236189 implements MigrationInterface {
  name = "InitialSchema1762341236189";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "event_translation" ("id" SERIAL NOT NULL, "title" character varying(256), "subtitle" character varying(256), "menu_title" character varying(256), "time_str" character varying(256), "location_comment" character varying(256), "description" text NOT NULL, "short_description" character varying(512) NOT NULL, "additional_title" character varying(256), "additional_info" jsonb, "outro" text, "followup_text" character varying(256), "eventn4d_id" integer, "language_id" integer, CONSTRAINT "PK_d5739128be79554fecf75dca107" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."event_n4d_type_enum" AS ENUM('party', 'workshop')`,
    );
    await queryRunner.query(
      `CREATE TABLE "event_n4d" ("id" SERIAL NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "date_end" TIMESTAMP WITH TIME ZONE, "type" "public"."event_n4d_type_enum" NOT NULL DEFAULT 'party', "pic" character varying(256), "location_link" character varying(256), "rsvp_link" character varying(256) NOT NULL, "followup_link" character varying(256), "address" character varying(256) NOT NULL, "host_name" character varying(256), "language_id" integer, CONSTRAINT "PK_e0df3ada625ad10e0b3fbeaec47" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "category" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, CONSTRAINT "UQ_9f16dbbf263b0af0f03637fa7b5" UNIQUE ("title"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "category_id" integer, CONSTRAINT "UQ_a28a1682ea80f10d1ecc7babaa0" UNIQUE ("title"), CONSTRAINT "PK_24625a1d6b1b089c8ae206fe467" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_activity" ("id" SERIAL NOT NULL, "profile_id" integer NOT NULL, "activity_id" integer NOT NULL, CONSTRAINT "PK_8433b160087402e98a26f61c1b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "skill" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, CONSTRAINT "UQ_5b1131c92af934e7c2a1322ec87" UNIQUE ("title"), CONSTRAINT "PK_a0d33334424e64fb78dc3ce7196" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_skill" ("id" SERIAL NOT NULL, "profile_id" integer NOT NULL, "skill_id" integer NOT NULL, CONSTRAINT "PK_7703bcb3f88131f9b11bfee8554" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile" ("id" SERIAL NOT NULL, "info" character varying, "category_id" integer, CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."profile_language_proficiency_enum" AS ENUM('beginner', 'intermediate', 'advanced', 'fluent', 'native')`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_language" ("id" SERIAL NOT NULL, "proficiency" "public"."profile_language_proficiency_enum" DEFAULT 'advanced', "profile_id" integer NOT NULL, "language_id" integer NOT NULL, CONSTRAINT "PK_a5e5b2402dffa65cf72af5925d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "language" ("id" SERIAL NOT NULL, "iso_code" character varying NOT NULL, "title" character varying NOT NULL, CONSTRAINT "PK_cc0a99e710eb3733f6fb42b1d4c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "testimonial" ("id" SERIAL NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "name" character varying(256), "pic" character varying(256), "person_id" integer, "language_id" integer, CONSTRAINT "PK_e1aee1c726db2d336480c69f7cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'coordinator', 'agent', 'volunteer', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "role" "public"."user_role_enum" NOT NULL DEFAULT 'user', "language" character varying NOT NULL DEFAULT 'en', "timezone" character varying NOT NULL DEFAULT 'CET', "person_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "personId" integer, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_enum" AS ENUM('New', 'Opportunity sent', 'Matched', 'Active regular', 'Active accompany', 'Active fest', 'To rematch', 'Temp inactive', 'Inactive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_engagement_enum" AS ENUM('new', 'active', 'available', 'temp-unavailable', 'inactive', 'unresponsive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_communication_enum" AS ENUM('called', 'email-sent', 'briefed', 'tried-call', 'not-responding')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_appreciation_enum" AS ENUM('t-shirt', 'benefit-card', 'tote-bag')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_type_enum" AS ENUM('accompanying', 'regular', 'event', 'festival', 'weekend-only')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_match_enum" AS ENUM('no-matches', 'pending_match', 'matched', 'needs-rematch')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_cgc_process_enum" AS ENUM('uploaded', 'missing')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_vaccination_enum" AS ENUM('undefined', 'yes', 'no', 'asked_to_apply', 'applied_self', 'applied_n4d')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_cgc_enum" AS ENUM('undefined', 'yes', 'no', 'asked_to_apply', 'applied_self', 'applied_n4d')`,
    );
    await queryRunner.query(
      `CREATE TABLE "volunteer" ("id" SERIAL NOT NULL, "info_about" character varying, "info_experience" character varying, "status" "public"."volunteer_status_enum" NOT NULL DEFAULT 'New', "status_engagement" "public"."volunteer_status_engagement_enum", "status_communication" "public"."volunteer_status_communication_enum", "status_appreciation" "public"."volunteer_status_appreciation_enum", "status_type" "public"."volunteer_status_type_enum", "status_match" "public"."volunteer_status_match_enum", "status_cgc_process" "public"."volunteer_status_cgc_process_enum", "status_vaccination" "public"."volunteer_status_vaccination_enum" NOT NULL DEFAULT 'undefined', "status_cgc" "public"."volunteer_status_cgc_enum" NOT NULL DEFAULT 'undefined', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deal_id" integer, "person_id" integer, CONSTRAINT "PK_76924da1998b3e07025e04c4d3c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "person" ("id" SERIAL NOT NULL, "first_name" character varying NOT NULL, "middle_name" character varying, "last_name" character varying, "email" character varying, "phone" character varying, "avatar_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "address_id" integer, CONSTRAINT "PK_5fdaf670315c4b7e70cce85daa3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "email" character varying, "phone" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "address_id" integer NOT NULL, "person_id" integer NOT NULL, CONSTRAINT "UQ_a7c11b94f5aaa12289f67de3f8f" UNIQUE ("title"), CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "location_district" ("id" SERIAL NOT NULL, "location_id" integer NOT NULL, "district_id" integer NOT NULL, CONSTRAINT "PK_828664dee332d2dc0499a1bd5e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "district" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, CONSTRAINT "PK_ee5cb6fd5223164bb87ea693f1e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "district_postcode" ("id" SERIAL NOT NULL, "district_id" integer NOT NULL, "postcode_id" integer NOT NULL, CONSTRAINT "PK_0e1774a1cd62d250b9564ab0904" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "location_postcode" ("id" SERIAL NOT NULL, "location_id" integer NOT NULL, "postcode_id" integer NOT NULL, CONSTRAINT "PK_5b564ff03a6b7e9427cc3b6c5f0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "postcode" ("id" SERIAL NOT NULL, "longitude" numeric(10,7), "latitude" numeric(9,7), "value" character varying NOT NULL, CONSTRAINT "PK_c19bc9f774c1cf019766a35ca4d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "address" ("id" SERIAL NOT NULL, "title" character varying, "street" character varying, "postcode_id" integer NOT NULL, CONSTRAINT "UQ_dc72f107eef6108d4163fae4cd2" UNIQUE ("title"), CONSTRAINT "PK_d92de1f82754668b5f5f5dd4fd5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "location_address" ("id" SERIAL NOT NULL, "location_id" integer NOT NULL, "address_id" integer NOT NULL, CONSTRAINT "PK_bf1188fd425a5c4f19d6fa22c2e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."location_type_enum" AS ENUM('postcode', 'district', 'address', 'geolocation')`,
    );
    await queryRunner.query(
      `CREATE TABLE "location" ("id" SERIAL NOT NULL, "type" "public"."location_type_enum" NOT NULL DEFAULT 'district', "info" character varying, CONSTRAINT "PK_876d7bdba03c72251ec4c2dc827" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_postcode" ("id" SERIAL NOT NULL, "agent_id" integer NOT NULL, "postcode_id" integer NOT NULL, CONSTRAINT "PK_790c4a8ac360683061758eea4fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_type_enum" AS ENUM('RAC', 'NGO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "type" "public"."agent_type_enum" NOT NULL DEFAULT 'RAC', "operator_type" character varying NOT NULL, "operator_id" integer NOT NULL, "person_id" integer, "postcode_id" integer, CONSTRAINT "UQ_c13f74bf3e3d5e4fedf63231881" UNIQUE ("title"), CONSTRAINT "PK_1000e989398c5d4ed585cf9a46f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_type_enum" AS ENUM('volunteering', 'accompanying')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_translation_type_enum" AS ENUM('deutsche', 'englishOk', 'noTranslation')`,
    );
    await queryRunner.query(
      `CREATE TABLE "opportunity" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "type" "public"."opportunity_type_enum" NOT NULL, "info" character varying, "translation_type" "public"."opportunity_translation_type_enum", "info_confidential" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deal_id" integer, "agent_id" integer, CONSTRAINT "PK_085fd6d6f4765325e6c16163568" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeslot_occasional_enum" AS ENUM('weekends', 'weekdays')`,
    );
    await queryRunner.query(
      `CREATE TABLE "timeslot" ("id" SERIAL NOT NULL, "info" character varying, "rrule" character varying, "start" TIMESTAMP, "end" TIMESTAMP, "occasional" "public"."timeslot_occasional_enum", CONSTRAINT "PK_cd8bca557ee1eb5b090b9e63009" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "time_timeslot" ("id" SERIAL NOT NULL, "time_id" integer NOT NULL, "timeslot_id" integer NOT NULL, CONSTRAINT "PK_5b5d0d8fb34e9de7849a058ad08" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "time" ("id" SERIAL NOT NULL, "info" character varying, CONSTRAINT "PK_9ec81ea937e5d405c33a9f49251" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deal_type_enum" AS ENUM('volunteer', 'opportunity')`,
    );
    await queryRunner.query(
      `CREATE TABLE "deal" ("id" SERIAL NOT NULL, "type" "public"."deal_type_enum" NOT NULL, "postcode_id" integer NOT NULL, "time_id" integer NOT NULL, "location_id" integer NOT NULL, "profile_id" integer, CONSTRAINT "PK_9ce1c24acace60f6d7dc7a7189e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."field_translation_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "field_translation" ("id" SERIAL NOT NULL, "field_name" character varying NOT NULL DEFAULT 'title', "language_id" integer, "entity_type" "public"."field_translation_entity_type_enum" NOT NULL DEFAULT 'none', "entity_id" integer NOT NULL, "translation" text NOT NULL, CONSTRAINT "PK_9159080b83585be7c50d6a9883e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cd9cbf582b713498a61c626c2d" ON "field_translation" ("language_id", "entity_type", "entity_id", "field_name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lead_from" ("id" SERIAL NOT NULL, "count" integer NOT NULL DEFAULT '0', "title" character varying NOT NULL, CONSTRAINT "PK_62c40760ad8725f93fa01345855" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."option_item_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "option" ("id" SERIAL NOT NULL, "item_type" "public"."option_item_type_enum" NOT NULL, "item_id" integer NOT NULL, CONSTRAINT "PK_e6090c1c6ad8962eea97abdbe63" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_source_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_target_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_content_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_content_type_enum" AS ENUM('create', 'update', 'remove', 'comment', 'status', 'matching')`,
    );
    await queryRunner.query(
      `CREATE TABLE "timeline" ("id" SERIAL NOT NULL, "source_entity_type" "public"."timeline_source_entity_type_enum", "source_entity_id" integer, "target_entity_type" "public"."timeline_target_entity_type_enum" NOT NULL, "target_entity_id" integer NOT NULL, "content_entity_type" "public"."timeline_content_entity_type_enum" NOT NULL, "content_entity_id" integer NOT NULL, "content_type" "public"."timeline_content_type_enum" NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "content" text NOT NULL, CONSTRAINT "PK_f841188896cefd9277904ec40b9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_68fcd3be0d9a16a5b6c8371133" ON "timeline" ("target_entity_type", "target_entity_id", "timestamp") `,
    );
    await queryRunner.query(
      `ALTER TABLE "event_translation" ADD CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66" FOREIGN KEY ("eventn4d_id") REFERENCES "event_n4d"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_translation" ADD CONSTRAINT "FK_10fabc95d13968a570404f5c516" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d" ADD CONSTRAINT "FK_019ed6de3369ed99b82ebf1b85c" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" ADD CONSTRAINT "FK_5d3d888450207667a286922f945" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_activity" ADD CONSTRAINT "FK_24c6818a8464f28891481760531" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_activity" ADD CONSTRAINT "FK_850d7554542cf85eee1f9aee1fa" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_skill" ADD CONSTRAINT "FK_dc3b7860ffbacd6dfcffbae9b06" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_skill" ADD CONSTRAINT "FK_0010601b9bf612cda40aae1ed5f" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD CONSTRAINT "FK_49ea3bc2c466d5b457352c8a9b1" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_language" ADD CONSTRAINT "FK_2115a7ecd80ab0e1c36565f87fd" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_language" ADD CONSTRAINT "FK_9b9cfa82b0245720d200c4b3bb5" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonial" ADD CONSTRAINT "FK_f7086d54eec10b450adee1be7b9" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonial" ADD CONSTRAINT "FK_c6bdc688fecc9e338d0c4018c4c" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_6aac19005cea8e2119cbe7759e8" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD CONSTRAINT "FK_4b1093af5610c75cfca53546c0d" FOREIGN KEY ("deal_id") REFERENCES "deal"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD CONSTRAINT "FK_fc40d3eada517c3c9315e0c9e51" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" ADD CONSTRAINT "FK_cd587348ca3fec07931de208299" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_0f31fe3925535afb5462326d7d6" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_e94553ff34338a3882ed305a74d" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_district" ADD CONSTRAINT "FK_1c289fab06d04d9bbff9d6d0028" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_district" ADD CONSTRAINT "FK_721d5d8783c928890db616cfbe7" FOREIGN KEY ("district_id") REFERENCES "district"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "district_postcode" ADD CONSTRAINT "FK_d3b662cb01cdb6f22c7097e0b33" FOREIGN KEY ("district_id") REFERENCES "district"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "district_postcode" ADD CONSTRAINT "FK_7b72f500f43de90b1a7d6e60ead" FOREIGN KEY ("postcode_id") REFERENCES "postcode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_postcode" ADD CONSTRAINT "FK_6c2e2c49c9b9e2647a76dce1538" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_postcode" ADD CONSTRAINT "FK_8008547ccf8fed17a64fd13d3a8" FOREIGN KEY ("postcode_id") REFERENCES "postcode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "address" ADD CONSTRAINT "FK_e1d98846fd3dcdea8e3f267e7eb" FOREIGN KEY ("postcode_id") REFERENCES "postcode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_address" ADD CONSTRAINT "FK_3191fd40b5538e1e5c3857042f2" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_address" ADD CONSTRAINT "FK_bdd8e88dbc7fe1ad3f6b1f949c9" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_postcode" ADD CONSTRAINT "FK_0c0882d8ac7a24eec11d7bff144" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_postcode" ADD CONSTRAINT "FK_ec2a5aa17ef1f489815ee8cefdf" FOREIGN KEY ("postcode_id") REFERENCES "postcode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_d78c87230af992a1bf93c5b93ae" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_790c4a8ac360683061758eea4fb" FOREIGN KEY ("postcode_id") REFERENCES "postcode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD CONSTRAINT "FK_62f9c6aaa610596f0d5f972e962" FOREIGN KEY ("deal_id") REFERENCES "deal"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD CONSTRAINT "FK_72b2a2637cc12f5d5b71bb3236e" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_timeslot" ADD CONSTRAINT "FK_42f12245378cdfc151d3af2189d" FOREIGN KEY ("time_id") REFERENCES "time"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_timeslot" ADD CONSTRAINT "FK_44cb00266b6e97b935c34c50686" FOREIGN KEY ("timeslot_id") REFERENCES "timeslot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal" ADD CONSTRAINT "FK_9f36d6cf04687b811690d82a3c1" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal" ADD CONSTRAINT "FK_b709f61f789979d2087bfc41768" FOREIGN KEY ("postcode_id") REFERENCES "postcode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal" ADD CONSTRAINT "FK_cefd2ee093f33d43794ebf5ed07" FOREIGN KEY ("time_id") REFERENCES "time"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal" ADD CONSTRAINT "FK_f5c86a234c167277fb5c18518b9" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD CONSTRAINT "FK_804ca3b0c276af3e8b593664f06" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP CONSTRAINT "FK_804ca3b0c276af3e8b593664f06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal" DROP CONSTRAINT "FK_f5c86a234c167277fb5c18518b9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal" DROP CONSTRAINT "FK_cefd2ee093f33d43794ebf5ed07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal" DROP CONSTRAINT "FK_b709f61f789979d2087bfc41768"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal" DROP CONSTRAINT "FK_9f36d6cf04687b811690d82a3c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_timeslot" DROP CONSTRAINT "FK_44cb00266b6e97b935c34c50686"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_timeslot" DROP CONSTRAINT "FK_42f12245378cdfc151d3af2189d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP CONSTRAINT "FK_72b2a2637cc12f5d5b71bb3236e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP CONSTRAINT "FK_62f9c6aaa610596f0d5f972e962"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_790c4a8ac360683061758eea4fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_d78c87230af992a1bf93c5b93ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_postcode" DROP CONSTRAINT "FK_ec2a5aa17ef1f489815ee8cefdf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_postcode" DROP CONSTRAINT "FK_0c0882d8ac7a24eec11d7bff144"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_address" DROP CONSTRAINT "FK_bdd8e88dbc7fe1ad3f6b1f949c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_address" DROP CONSTRAINT "FK_3191fd40b5538e1e5c3857042f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "address" DROP CONSTRAINT "FK_e1d98846fd3dcdea8e3f267e7eb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_postcode" DROP CONSTRAINT "FK_8008547ccf8fed17a64fd13d3a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_postcode" DROP CONSTRAINT "FK_6c2e2c49c9b9e2647a76dce1538"`,
    );
    await queryRunner.query(
      `ALTER TABLE "district_postcode" DROP CONSTRAINT "FK_7b72f500f43de90b1a7d6e60ead"`,
    );
    await queryRunner.query(
      `ALTER TABLE "district_postcode" DROP CONSTRAINT "FK_d3b662cb01cdb6f22c7097e0b33"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_district" DROP CONSTRAINT "FK_721d5d8783c928890db616cfbe7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_district" DROP CONSTRAINT "FK_1c289fab06d04d9bbff9d6d0028"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_e94553ff34338a3882ed305a74d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_0f31fe3925535afb5462326d7d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" DROP CONSTRAINT "FK_cd587348ca3fec07931de208299"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP CONSTRAINT "FK_fc40d3eada517c3c9315e0c9e51"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP CONSTRAINT "FK_4b1093af5610c75cfca53546c0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_6aac19005cea8e2119cbe7759e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonial" DROP CONSTRAINT "FK_c6bdc688fecc9e338d0c4018c4c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonial" DROP CONSTRAINT "FK_f7086d54eec10b450adee1be7b9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_language" DROP CONSTRAINT "FK_9b9cfa82b0245720d200c4b3bb5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_language" DROP CONSTRAINT "FK_2115a7ecd80ab0e1c36565f87fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" DROP CONSTRAINT "FK_49ea3bc2c466d5b457352c8a9b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_skill" DROP CONSTRAINT "FK_0010601b9bf612cda40aae1ed5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_skill" DROP CONSTRAINT "FK_dc3b7860ffbacd6dfcffbae9b06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_activity" DROP CONSTRAINT "FK_850d7554542cf85eee1f9aee1fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_activity" DROP CONSTRAINT "FK_24c6818a8464f28891481760531"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity" DROP CONSTRAINT "FK_5d3d888450207667a286922f945"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d" DROP CONSTRAINT "FK_019ed6de3369ed99b82ebf1b85c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_translation" DROP CONSTRAINT "FK_10fabc95d13968a570404f5c516"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_translation" DROP CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_68fcd3be0d9a16a5b6c8371133"`,
    );
    await queryRunner.query(`DROP TABLE "timeline"`);
    await queryRunner.query(`DROP TYPE "public"."timeline_content_type_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."timeline_content_entity_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_target_entity_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_source_entity_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "option"`);
    await queryRunner.query(`DROP TYPE "public"."option_item_type_enum"`);
    await queryRunner.query(`DROP TABLE "lead_from"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cd9cbf582b713498a61c626c2d"`,
    );
    await queryRunner.query(`DROP TABLE "field_translation"`);
    await queryRunner.query(
      `DROP TYPE "public"."field_translation_entity_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "deal"`);
    await queryRunner.query(`DROP TYPE "public"."deal_type_enum"`);
    await queryRunner.query(`DROP TABLE "time"`);
    await queryRunner.query(`DROP TABLE "time_timeslot"`);
    await queryRunner.query(`DROP TABLE "timeslot"`);
    await queryRunner.query(`DROP TYPE "public"."timeslot_occasional_enum"`);
    await queryRunner.query(`DROP TABLE "opportunity"`);
    await queryRunner.query(
      `DROP TYPE "public"."opportunity_translation_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."opportunity_type_enum"`);
    await queryRunner.query(`DROP TABLE "agent"`);
    await queryRunner.query(`DROP TYPE "public"."agent_type_enum"`);
    await queryRunner.query(`DROP TABLE "agent_postcode"`);
    await queryRunner.query(`DROP TABLE "location"`);
    await queryRunner.query(`DROP TYPE "public"."location_type_enum"`);
    await queryRunner.query(`DROP TABLE "location_address"`);
    await queryRunner.query(`DROP TABLE "address"`);
    await queryRunner.query(`DROP TABLE "postcode"`);
    await queryRunner.query(`DROP TABLE "location_postcode"`);
    await queryRunner.query(`DROP TABLE "district_postcode"`);
    await queryRunner.query(`DROP TABLE "district"`);
    await queryRunner.query(`DROP TABLE "location_district"`);
    await queryRunner.query(`DROP TABLE "organization"`);
    await queryRunner.query(`DROP TABLE "person"`);
    await queryRunner.query(`DROP TABLE "volunteer"`);
    await queryRunner.query(`DROP TYPE "public"."volunteer_status_cgc_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_vaccination_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_cgc_process_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."volunteer_status_match_enum"`);
    await queryRunner.query(`DROP TYPE "public"."volunteer_status_type_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_appreciation_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_communication_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_engagement_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."volunteer_status_enum"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TABLE "testimonial"`);
    await queryRunner.query(`DROP TABLE "language"`);
    await queryRunner.query(`DROP TABLE "profile_language"`);
    await queryRunner.query(
      `DROP TYPE "public"."profile_language_proficiency_enum"`,
    );
    await queryRunner.query(`DROP TABLE "profile"`);
    await queryRunner.query(`DROP TABLE "profile_skill"`);
    await queryRunner.query(`DROP TABLE "skill"`);
    await queryRunner.query(`DROP TABLE "profile_activity"`);
    await queryRunner.query(`DROP TABLE "activity"`);
    await queryRunner.query(`DROP TABLE "category"`);
    await queryRunner.query(`DROP TABLE "event_n4d"`);
    await queryRunner.query(`DROP TYPE "public"."event_n4d_type_enum"`);
    await queryRunner.query(`DROP TABLE "event_translation"`);
  }
}
