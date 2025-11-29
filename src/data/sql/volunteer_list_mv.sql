CREATE MATERIALIZED VIEW volunteer_list_mv AS
WITH
-- 1. Aggregate Languages (M2M)
volunteer_languages AS (
    SELECT v.id AS volunteer_id, array_agg(l.id) AS language_ids_array, string_agg((l.title)::text, ' '::text) AS languages_text, bool_or(((l.title)::text = 'German'::text)) AS has_german_language
    FROM volunteer v
    LEFT JOIN deal d ON v.deal_id = d.id
    LEFT JOIN profile pr ON d.profile_id = pr.id
    LEFT JOIN profile_language pl ON pr.id = pl.profile_id
    LEFT JOIN language l ON pl.language_id = l.id
    GROUP BY v.id
),
-- 2. Aggregate Skills (M2M) - Titles for Search
volunteer_skills AS (
    SELECT v.id AS volunteer_id, string_agg((s.title)::text, ' '::text) AS skills_text
    FROM volunteer v
    LEFT JOIN deal d ON v.deal_id = d.id
    LEFT JOIN profile pr ON d.profile_id = pr.id
    LEFT JOIN profile_skill ps ON pr.id = ps.profile_id
    LEFT JOIN skill s ON ps.skill_id = s.id
    GROUP BY v.id
),
-- 3. Aggregate Activities (M2M) - Titles for Search
volunteer_activities AS (
    SELECT v.id AS volunteer_id, string_agg((a.title)::text, ' '::text) AS activities_text
    FROM volunteer v
    LEFT JOIN deal d ON v.deal_id = d.id
    LEFT JOIN profile pr ON d.profile_id = pr.id
    LEFT JOIN profile_activity pa ON pr.id = pa.profile_id
    LEFT JOIN activity a ON pa.activity_id = a.id
    GROUP BY v.id
),
-- 4. Aggregate Districts (M2M via deal location)
volunteer_districts AS (
    SELECT v.id AS volunteer_id, array_agg(dt.id) AS district_ids_array, string_agg((dt.title)::text, ' '::text) AS districts_text
    FROM volunteer v
    LEFT JOIN deal d ON v.deal_id = d.id
    LEFT JOIN location_district ld ON d.location_id = ld.location_id
    LEFT JOIN district dt ON ld.district_id = dt.id
    GROUP BY v.id
),
-- 🔑 NEW: 5. Aggregate Availability (M2M via deal time)
volunteer_availability AS (
    SELECT
        v.id AS volunteer_id,
        -- Aggregate regular days (e.g., Monday). Assumes timeslot has 'day' and 'type' columns.
        array_agg(t.day) FILTER (WHERE t.type = 'regular') AS available_days_array,
        -- Aggregate time blocks (e.g., 08-11). Assumes timeslot has 'time_block' column.
        array_agg(t.time_block) FILTER (WHERE t.type = 'regular') AS available_times_array,
        -- Aggregate occasional types (e.g., weekends). Assumes 'day' holds the occasional descriptor.
        array_agg(t.day) FILTER (WHERE t.type = 'occasional') AS available_occasional_array
    FROM volunteer v
    LEFT JOIN deal d ON v.deal_id = d.id
    LEFT JOIN "time" tm ON d.time_id = tm.id
    LEFT JOIN time_timeslot tts ON tm.id = tts.time_id
    LEFT JOIN timeslot t ON tts.timeslot_id = t.id
    GROUP BY v.id
)
-- Final SELECT for the Materialized View
SELECT
    v.id AS volunteer_id,
    v.status,
    v.status_engagement,
    v.status_type AS volunteer_type,
    p.avatar_url,
    
    CONCAT_WS(' ', 
        NULLIF(TRIM(BOTH FROM p.first_name), ''::text), 
        NULLIF(TRIM(BOTH FROM p.middle_name), ''::text), 
        NULLIF(TRIM(BOTH FROM p.last_name), ''::text)
    ) AS full_name,
    
    vl.language_ids_array,
    vl.has_german_language,
    vd.district_ids_array,
    
    -- 🔑 NEW AVAILABILITY COLUMNS EXPOSED
    va.available_days_array,
    va.available_times_array,
    va.available_occasional_array,
    
    -- EXPANDED search_vector
    to_tsvector('english'::regconfig,
        COALESCE(vd.districts_text, ''::text) || ' ' ||
        COALESCE(vs.skills_text, ''::text) || ' ' ||
        COALESCE(va.activities_text, ''::text) || ' ' ||
        COALESCE(vl.languages_text, ''::text) || ' ' ||
        COALESCE(v.info_about, ''::text) || ' ' ||
        COALESCE(v.info_experience, ''::text) || ' ' ||
        COALESCE(pr.info, ''::text) || ' ' ||
        COALESCE(loc.info, ''::text) || ' ' ||
        COALESCE(t.info, ''::text)
    ) AS search_vector
FROM public.volunteer v
JOIN public.person p ON ((v.person_id = p.id))
LEFT JOIN public.deal d ON v.deal_id = d.id
LEFT JOIN public.profile pr ON d.profile_id = pr.id
LEFT JOIN public.location loc ON d.location_id = loc.id
LEFT JOIN public."time" t ON d.time_id = t.id
LEFT JOIN volunteer_languages vl ON v.id = vl.volunteer_id
LEFT JOIN volunteer_skills vs ON v.id = vs.volunteer_id
LEFT JOIN volunteer_activities va ON v.id = va.volunteer_id
LEFT JOIN volunteer_districts vd ON v.id = vd.volunteer_id
-- 🔑 NEW AVAILABILITY JOIN
LEFT JOIN volunteer_availability va ON v.id = va.volunteer_id;