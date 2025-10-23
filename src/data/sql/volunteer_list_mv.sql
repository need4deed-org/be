CREATE MATERIALIZED VIEW volunteer_list_mv AS
WITH
-- 1. Aggregate Languages (M2M) - Used for search, filtering by ID, and 'german' flag
volunteer_languages AS (
    SELECT
        v.id AS volunteer_id,
        array_agg(l.id) AS language_ids_array,
        string_agg(l.title, ' ') AS languages_text,
        bool_or(l.title = 'German') AS has_german_language
    FROM volunteer v
    LEFT JOIN deal d ON v.deal_id = d.id
    LEFT JOIN profile pr ON d.profile_id = pr.id
    LEFT JOIN profile_language pl ON pr.id = pl.profile_id
    LEFT JOIN language l ON pl.language_id = l.id
    GROUP BY v.id
),
-- 2. Aggregate Skills (M2M) - Used for search
volunteer_skills AS (
    SELECT
        v.id AS volunteer_id,
        string_agg(s.title, ' ') AS skills_text
    FROM volunteer v
    LEFT JOIN deal d ON v.deal_id = d.id
    LEFT JOIN profile pr ON d.profile_id = pr.id
    LEFT JOIN profile_skill ps ON pr.id = ps.profile_id
    LEFT JOIN skill s ON ps.skill_id = s.id
    GROUP BY v.id
),
-- 3. Aggregate Activities (M2M) - Used for search
volunteer_activities AS (
    SELECT
        v.id AS volunteer_id,
        string_agg(a.title, ' ') AS activities_text
    FROM volunteer v
    LEFT JOIN deal d ON v.deal_id = d.id
    LEFT JOIN profile pr ON d.profile_id = pr.id
    LEFT JOIN profile_activity pa ON pr.id = pa.profile_id
    LEFT JOIN activity a ON pa.activity_id = a.id
    GROUP BY v.id
),
-- 4. Aggregate Districts (M2M via deal location) - Used for search AND filtering by ID
volunteer_districts AS (
    SELECT
        v.id AS volunteer_id,
        array_agg(dt.id) AS district_ids_array,
        string_agg(dt.title, ' ') AS districts_text
    FROM volunteer v
    LEFT JOIN deal d ON v.deal_id = d.id
    LEFT JOIN location_district ld ON d.location_id = ld.location_id
    LEFT JOIN district dt ON ld.district_id = dt.id
    GROUP BY v.id
)

-- Final SELECT for the Materialized View
SELECT
    v.id AS volunteer_id,
    v.status,
    v.status_engagement,
    v.status_type AS volunteer_type,
    p.avatar_url,
    
    -- 🔑 New full_name field using NULLIF and TRIM to match the JS logic:
    CONCAT_WS(' ', 
        NULLIF(TRIM(p.first_name), ''), 
        NULLIF(TRIM(p.middle_name), ''), 
        NULLIF(TRIM(p.last_name), '')
    ) AS full_name,
    
    vl.language_ids_array,
    vl.has_german_language,
    vd.district_ids_array,
    -- search_vector still relies on the base names for indexing/searchability, 
    -- but they are not exposed directly in the view's output columns unless needed for search:
    to_tsvector('english',
        COALESCE(vd.districts_text, '') || ' ' ||
        COALESCE(vs.skills_text, '') || ' ' ||
        COALESCE(va.activities_text, '') || ' ' ||
        COALESCE(vl.languages_text, '')
    ) AS search_vector
FROM volunteer v
JOIN person p ON v.person_id = p.id
LEFT JOIN volunteer_languages vl ON v.id = vl.volunteer_id
LEFT JOIN volunteer_skills vs ON v.id = vs.volunteer_id
LEFT JOIN volunteer_activities va ON v.id = va.volunteer_id
LEFT JOIN volunteer_districts vd ON v.id = vd.volunteer_id;