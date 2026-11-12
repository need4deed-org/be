import { MigrationInterface, QueryRunner } from "typeorm";

export class TimestamptzInstantColumns1794490900333
  implements MigrationInterface
{
  name = "TimestamptzInstantColumns1794490900333";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_person" ALTER COLUMN "read_at" TYPE timestamptz USING "read_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_log" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_log" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "date_due" TYPE timestamptz USING "date_due" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "date_delivery" TYPE timestamptz USING "date_delivery" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_vaccination_date" TYPE timestamptz USING "status_vaccination_date" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_cgc_application_date" TYPE timestamptz USING "status_cgc_application_date" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_cgc_date" TYPE timestamptz USING "status_cgc_date" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "date_return" TYPE timestamptz USING "date_return" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "date" TYPE timestamptz USING "date" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" ALTER COLUMN "occurred_at" TYPE timestamptz USING "occurred_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "deactivated_at" TYPE timestamptz USING "deactivated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ALTER COLUMN "revoked_at" TYPE timestamptz USING "revoked_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ALTER COLUMN "last_used_at" TYPE timestamptz USING "last_used_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_reaction" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_event_registration" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_session" ALTER COLUMN "rotated_at" TYPE timestamptz USING "rotated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_session" ALTER COLUMN "expires_at" TYPE timestamptz USING "expires_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_session" ALTER COLUMN "revoked_at" TYPE timestamptz USING "revoked_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_session" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "statistics_event" ALTER COLUMN "occurred_at" TYPE timestamptz USING "occurred_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "timestamp" TYPE timestamptz USING "timestamp" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "trusted_domain" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trusted_domain" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "timestamp" TYPE timestamp USING "timestamp" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "statistics_event" ALTER COLUMN "occurred_at" TYPE timestamp USING "occurred_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_session" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_session" ALTER COLUMN "revoked_at" TYPE timestamp USING "revoked_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_session" ALTER COLUMN "expires_at" TYPE timestamp USING "expires_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_session" ALTER COLUMN "rotated_at" TYPE timestamp USING "rotated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_event_registration" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_reaction" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ALTER COLUMN "last_used_at" TYPE timestamp USING "last_used_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ALTER COLUMN "revoked_at" TYPE timestamp USING "revoked_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "deactivated_at" TYPE timestamp USING "deactivated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" ALTER COLUMN "occurred_at" TYPE timestamp USING "occurred_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "date" TYPE timestamp USING "date" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "date_return" TYPE timestamp USING "date_return" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_cgc_date" TYPE timestamp USING "status_cgc_date" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_cgc_application_date" TYPE timestamp USING "status_cgc_application_date" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_vaccination_date" TYPE timestamp USING "status_vaccination_date" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "date_delivery" TYPE timestamp USING "date_delivery" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "date_due" TYPE timestamp USING "date_due" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_log" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_log" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_person" ALTER COLUMN "read_at" TYPE timestamp USING "read_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
    );
  }
}
