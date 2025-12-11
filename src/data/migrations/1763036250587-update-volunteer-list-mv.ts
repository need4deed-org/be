import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateVolunteerListMv1763036250587 implements MigrationInterface {
  name = "UpdateVolunteerListMv1763036250587";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the view first for idempotency
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS volunteer_list_mv;`,
    );

    const createViewQuery = `
            CREATE MATERIALIZED VIEW volunteer_list_mv AS
            WITH AggregatedTimeslots AS (
                -- 1. Aggregates timeslot data into the three required arrays for filtering
                -- Supports ToR Filters 5 & 6
                SELECT
                    d.id AS deal_id,
                    -- Aggregate BYDAY codes (e.g., 'MO', 'TU', 'FR')
                    ARRAY_AGG(
                        DISTINCT
                        SUBSTRING(t.rrule FROM 'BYDAY=([A-Z,]+)')
                    ) FILTER (WHERE t.rrule IS NOT NULL) AS available_days_array_raw,
                    -- Aggregate Time Blocks (e.g., '08-11', '14-17')
                    ARRAY_AGG(
                        DISTINCT
                        CASE
                            WHEN EXTRACT(HOUR FROM t.start) >= 8 AND EXTRACT(HOUR FROM t.end) <= 11 THEN '08-11'
                            WHEN EXTRACT(HOUR FROM t.start) >= 11 AND EXTRACT(HOUR FROM t.end) <= 14 THEN '11-14'
                            WHEN EXTRACT(HOUR FROM t.end) <= 17 AND EXTRACT(HOUR FROM t.start) >= 14 THEN '14-17'
                            WHEN EXTRACT(HOUR FROM t.end) <= 20 AND EXTRACT(HOUR FROM t.start) >= 17 THEN '17-20'
                            ELSE NULL
                        END
                    ) FILTER (WHERE t.rrule IS NOT NULL) AS available_times_array,
                    -- Aggregate Occasional statuses (e.g., 'weekends', 'public_holidays')
                    ARRAY_AGG(
                        DISTINCT t.occasional
                    ) FILTER (WHERE t.occasional IS NOT NULL) AS available_occasional_array,
                    JSONB_AGG(
                        JSONB_BUILD_OBJECT(
                            'start_hour', EXTRACT(HOUR FROM t.start),
                            'end_hour', EXTRACT(HOUR FROM t.end),
                            'byday_part', COALESCE(SUBSTRING(t.rrule FROM 'BYDAY=([A-Z,]+)'), ''),
                            'occasional', t.occasional
                        )
                    ) AS timeslot_data
                FROM
                    public.timeslot t
                INNER JOIN
                    public.time_timeslot tt ON t.id = tt.timeslot_id
                INNER JOIN
                    public.time tm ON tt.time_id = tm.id
                INNER JOIN
                    public.deal d ON tm.id = d.time_id
                GROUP BY
                    d.id
            ),
            AggregatedLanguages AS (
                -- 2. Aggregate language data by traversing deal -> profile -> profile_language -> language
                -- Supports ToR Filter 4 (language IDs) and Filter 7 (language titles for search)
                SELECT
                    d.id AS deal_id,
                    ARRAY_AGG(lang.id) AS language_ids,
                    ARRAY_AGG(lang.title) AS language_titles
                FROM public.language lang
                INNER JOIN public.profile_language pl ON lang.id = pl.language_id
                INNER JOIN public.profile p ON pl.profile_id = p.id
                INNER JOIN public.deal d ON p.id = d.profile_id
                GROUP BY d.id
            ),
            AggregatedDistricts AS (
                -- 3. Aggregate district data by traversing deal -> location -> location_district -> district
                -- This provides the IDs for ToR Filter 3 and titles for ToR Filter 7
                SELECT
                    d.id AS deal_id,
                    ARRAY_AGG(dist.id) AS district_ids,
                    ARRAY_AGG(dist.title) AS district_titles
                FROM public.district dist
                INNER JOIN public.location_district ld ON dist.id = ld.district_id
                INNER JOIN public.location l ON ld.location_id = l.id
                INNER JOIN public.deal d ON l.id = d.location_id
                GROUP BY d.id
            ),
            AggregatedActivities AS (
                -- 4. Aggregate activity data by traversing deal -> profile -> profile_activity -> activity
                -- Supports ToR Filter 7 (activity titles for search)
                SELECT
                    d.id AS deal_id,
                    ARRAY_AGG(a.id) AS activity_ids,
                    ARRAY_AGG(a.title) AS activity_titles
                FROM public.activity a
                INNER JOIN public.profile_activity pa ON a.id = pa.activity_id
                INNER JOIN public.profile p ON pa.profile_id = p.id
                INNER JOIN public.deal d ON p.id = d.profile_id
                GROUP BY d.id
            )
            SELECT
                v.id AS volunteer_id,
                d.id AS deal_id,
                v.status_engagement, -- ToR Filter 1
                v.status_type,       -- ToR Filter 2
                per.first_name,
                per.last_name,
                per.email,
                per.phone,
                per.avatar_url,
                CONCAT_WS(' ', NULLIF(TRIM(per.first_name), ''), NULLIF(TRIM(per.last_name), '')) AS full_name,
                ad.district_ids AS district_ids_array,     -- ToR Filter 3
                al.language_ids AS language_ids_array,     -- ToR Filter 4
                -- ToR Filter 4: Checks if German (ISO 'de') is in the language list.
                (al.language_ids @> ARRAY[(SELECT id FROM public.language WHERE iso_code = 'de' LIMIT 1)]::integer[]) AS has_german_language,
                -- ToR Filters 5 & 6 (Availability Arrays)
                (SELECT ARRAY_AGG(x) FROM UNNEST(at.available_days_array_raw) AS x) AS available_days_array,
                at.available_times_array,
                at.available_occasional_array,
                -- ToR Filter 7 (Search Arrays)
                aa.activity_titles,
                al.language_titles,
                ad.district_titles,
                at.timeslot_data
            FROM
                public.deal d
            INNER JOIN
                public.volunteer v ON d.id = v.deal_id
            INNER JOIN
                public.person per ON v.person_id = per.id
            INNER JOIN
                public.profile p ON d.profile_id = p.id
            INNER JOIN
                public.location l ON d.location_id = l.id
            LEFT JOIN AggregatedActivities aa ON d.id = aa.deal_id
            LEFT JOIN AggregatedLanguages al ON d.id = al.deal_id
            LEFT JOIN AggregatedTimeslots at ON d.id = at.deal_id
            LEFT JOIN AggregatedDistricts ad ON d.id = ad.deal_id
            WHERE
                d.type = 'volunteer'
            WITH DATA;
        `;

    await queryRunner.query(createViewQuery);

    // Ensure the unique index exists for CONCURRENT refresh (required after view creation)
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX mv_deal_id_unique_idx ON volunteer_list_mv (volunteer_id);`,
      );
    } catch (_) {
      // Ignore if index already exists
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP MATERIALIZED VIEW volunteer_list_mv;`);
  }
}
