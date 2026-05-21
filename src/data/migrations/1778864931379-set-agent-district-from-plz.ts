import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
        UPDATE public.agent a
        SET 
            district_id = subquery.district_id,
            updated_at = NOW()
        FROM (
            SELECT DISTINCT ON (ap.agent_id) 
                ap.agent_id, 
                dp.district_id
            FROM public.agent_postcode ap
            JOIN public.district_postcode dp ON dp.postcode_id = ap.postcode_id
            ORDER BY ap.agent_id, dp.id ASC 
        ) AS subquery
        WHERE a.id = subquery.agent_id
          AND a.district_id IS NULL;
`;

export class SetAgentDistrictFromPlz1778864931379
  implements MigrationInterface
{
  name = "SetAgentDistrictFromPlz1778864931379";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
