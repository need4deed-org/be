import { MigrationInterface, QueryRunner } from "typeorm";

export class GenesisBaseSchema1763036250000 implements MigrationInterface {
  name = "GenesisBaseSchema1763036250000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── ENUMS (idempotent via DO blocks) ────────────────────────────────────

    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.accompanying_language_to_translate_enum AS ENUM ('deutsche','englishOk','noTranslation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.agent_engagement_status_enum AS ENUM ('agent-new','agent-active','agent-unresponsive','agent-inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.agent_person_role_enum AS ENUM ('social-worker','volunteer-coordinator','manager','project-coordinator','psychologist','project-staff','childcare-worker','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.agent_person_status_enum AS ENUM ('active','pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.agent_search_status_enum AS ENUM ('agent-searching','agent-not-needed','agent-volunteers-found'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.agent_trust_level_enum AS ENUM ('agent-high','agent-low','agent-unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.agent_type_enum AS ENUM ('AE','GU1','GU2','GU2+','GU3','NU','ASOG','counseling-center','tandem','multiple-social-support'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.appreciation_title_enum AS ENUM ('t-shirt','benefit-card','tote-bag'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.comment_entity_type_enum AS ENUM ('none','activity','agent','comment','category','district','language','lead_from','opportunity','skill','volunteer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.communication_communication_type_enum AS ENUM ('briefed','first-inquiry-sent','opportunity-list-sent','status-update','post-match-followup','matched','accompanying-not-found','accompanying-matched','opportunity-updated','opportunity-confirmation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.communication_contact_method_enum AS ENUM ('email','phone-number','telegram','whatsapp','signal','sms','voicenote','video-call'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.communication_contact_type_enum AS ENUM ('called','tried-to-call','texted-or-emailed','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.config_config_key_enum AS ENUM ('schema','reference_data','master_data','truncate-all'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.deal_language_proficiency_enum AS ENUM ('intermediate','fluent','native','advanced','beginner'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.deal_language_purpose_enum AS ENUM ('general','translation','recipient'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.deal_type_enum AS ENUM ('volunteer','opportunity'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.document_type_enum AS ENUM ('measles-vacc-cert','good-conduct-cert','CGC-application','passport-copy'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.event_n4d_type_enum AS ENUM ('party','workshop'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.field_translation_entity_type_enum AS ENUM ('none','activity','agent','comment','category','district','language','lead_from','opportunity','skill','volunteer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.notion_relation_host_type_enum AS ENUM ('none','activity','agent','comment','category','district','language','lead_from','opportunity','skill','volunteer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.notion_relation_tenant_type_enum AS ENUM ('none','activity','agent','comment','category','district','language','lead_from','opportunity','skill','volunteer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.opportunity_status_enum AS ENUM ('opp-new','opp-searching','opp-active','opp-inactive','opp-past'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.opportunity_status_match_enum AS ENUM ('opp-vol-pending-match','opp-vol-no-matches','opp-vol-matched','opp-vol-needs-rematch','opp-vol-unmatched','opp-vol-past'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.opportunity_translation_type_enum AS ENUM ('deutsche','englishOk','noTranslation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.opportunity_type_enum AS ENUM ('accompanying','regular','events'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.opportunity_volunteer_status_enum AS ENUM ('opp-pending','opp-matched','opp-active','opp-past'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.option_item_type_enum AS ENUM ('none','activity','agent','comment','category','district','language','lead_from','opportunity','skill','volunteer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.timeline_content_entity_type_enum AS ENUM ('none','activity','agent','comment','category','district','language','lead_from','opportunity','skill','volunteer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.timeline_content_type_enum AS ENUM ('create','update','remove','comment','status','matching'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.timeline_source_entity_type_enum AS ENUM ('none','activity','agent','comment','category','district','language','lead_from','opportunity','skill','volunteer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.timeline_target_entity_type_enum AS ENUM ('none','activity','agent','comment','category','district','language','lead_from','opportunity','skill','volunteer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.timeslot_occasional_enum AS ENUM ('weekends','weekdays'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.user_role_enum AS ENUM ('user','coordinator','agent','volunteer','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.volunteer_status_appreciation_enum AS ENUM ('t-shirt','benefit-card','tote-bag'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.volunteer_status_cgc_enum AS ENUM ('undefined','yes','no','asked_to_apply','applied_self','applied_n4d'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.volunteer_status_cgc_process_enum AS ENUM ('uploaded','missing'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.volunteer_status_communication_enum AS ENUM ('called','email-sent','briefed','tried-call','not-responding'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.volunteer_status_engagement_enum AS ENUM ('vol-new','vol-active','vol-available','vol-temp-unavailable','vol-inactive','vol-unresponsive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.volunteer_status_match_enum AS ENUM ('vol-no-matches','vol-pending-match','vol-matched','vol-needs-rematch','vol-past'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.volunteer_status_type_enum AS ENUM ('accompanying','regular','events','regular-accompanying'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE public.volunteer_status_vaccination_enum AS ENUM ('undefined','yes','no','asked_to_apply','applied_self','applied_n4d'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    // ─── SEQUENCES ───────────────────────────────────────────────────────────

    for (const seq of [
      "accompanying_id_seq",
      "activity_id_seq",
      "activity_log_id_seq",
      "address_id_seq",
      "agent_id_seq",
      "agent_language_id_seq",
      "agent_person_id_seq",
      "agent_postcode_id_seq",
      "appreciation_id_seq",
      "category_id_seq",
      "comment_id_seq",
      "comment_person_id_seq",
      "communication_id_seq",
      "config_id_seq",
      "deal_id_seq",
      "deal_activity_id_seq",
      "deal_district_id_seq",
      "deal_language_id_seq",
      "deal_skill_id_seq",
      "deal_timeslot_id_seq",
      "district_id_seq",
      "district_postcode_id_seq",
      "document_id_seq",
      "event_n4d_id_seq",
      "event_translation_id_seq",
      "field_translation_id_seq",
      "language_id_seq",
      "lead_from_id_seq",
      "notion_relation_id_seq",
      "opportunity_id_seq",
      "opportunity_volunteer_id_seq",
      "option_id_seq",
      "organization_id_seq",
      "person_id_seq",
      "post_id_seq",
      "postcode_id_seq",
      "skill_id_seq",
      "testimonial_id_seq",
      "timeline_id_seq",
      "timeslot_id_seq",
      "trusted_domain_id_seq",
      "user_id_seq",
      "volunteer_id_seq",
    ]) {
      await queryRunner.query(
        `CREATE SEQUENCE IF NOT EXISTS public.${seq} AS integer START 1 INCREMENT 1 NO MINVALUE NO MAXVALUE CACHE 1`,
      );
    }

    // ─── TABLES ──────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.language (
        id integer NOT NULL,
        iso_code character varying NOT NULL,
        title character varying NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.postcode (
        id integer NOT NULL,
        longitude numeric(10,7),
        latitude numeric(9,7),
        value character varying NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.district (
        id integer NOT NULL,
        title character varying NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.category (
        id integer NOT NULL,
        title character varying NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.skill (
        id integer NOT NULL,
        title character varying NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.lead_from (
        id integer NOT NULL,
        count integer DEFAULT 0 NOT NULL,
        title character varying NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.address (
        id integer NOT NULL,
        title character varying,
        street character varying,
        postcode_id integer NOT NULL,
        city character varying
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.person (
        id integer NOT NULL,
        first_name character varying NOT NULL,
        middle_name character varying,
        last_name character varying,
        email character varying,
        phone character varying,
        avatar_url character varying,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        address_id integer,
        preferred_communication_type text[] DEFAULT '{mobilePhone}'::text[] NOT NULL,
        landline character varying
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."user" (
        id integer NOT NULL,
        email character varying NOT NULL,
        password character varying NOT NULL,
        is_active boolean DEFAULT false NOT NULL,
        role public.user_role_enum DEFAULT 'user'::public.user_role_enum NOT NULL,
        language character varying DEFAULT 'en'::character varying NOT NULL,
        timezone character varying DEFAULT 'CET'::character varying NOT NULL,
        person_id integer,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.organization (
        id integer NOT NULL,
        title character varying NOT NULL,
        email character varying,
        phone character varying,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        address_id integer NOT NULL,
        person_id integer NOT NULL,
        website character varying
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.district_postcode (
        id integer NOT NULL,
        district_id integer NOT NULL,
        postcode_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.agent (
        id integer NOT NULL,
        title character varying NOT NULL,
        type public.agent_type_enum,
        website character varying,
        trust_level public.agent_trust_level_enum DEFAULT 'agent-unknown'::public.agent_trust_level_enum NOT NULL,
        search_status public.agent_search_status_enum DEFAULT 'agent-not-needed'::public.agent_search_status_enum NOT NULL,
        services text[],
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        address_id integer,
        district_id integer,
        engagement_status public.agent_engagement_status_enum DEFAULT 'agent-new'::public.agent_engagement_status_enum NOT NULL,
        info character varying,
        organization_id integer,
        nid character varying
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.agent_postcode (
        id integer NOT NULL,
        agent_id integer NOT NULL,
        postcode_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.timeslot (
        id integer NOT NULL,
        info character varying,
        rrule character varying,
        start timestamp without time zone,
        "end" timestamp without time zone,
        occasional public.timeslot_occasional_enum
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.deal (
        id integer NOT NULL,
        type public.deal_type_enum NOT NULL,
        postcode_id integer NOT NULL,
        info character varying,
        category_id integer
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.activity (
        id integer NOT NULL,
        title character varying NOT NULL,
        category_id integer
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.volunteer (
        id integer NOT NULL,
        info_about character varying,
        info_experience character varying,
        status_engagement public.volunteer_status_engagement_enum DEFAULT 'vol-new'::public.volunteer_status_engagement_enum NOT NULL,
        status_communication public.volunteer_status_communication_enum,
        status_appreciation public.volunteer_status_appreciation_enum,
        status_type public.volunteer_status_type_enum,
        status_match public.volunteer_status_match_enum DEFAULT 'vol-no-matches'::public.volunteer_status_match_enum NOT NULL,
        status_cgc_process public.volunteer_status_cgc_process_enum,
        status_vaccination public.volunteer_status_vaccination_enum DEFAULT 'undefined'::public.volunteer_status_vaccination_enum NOT NULL,
        status_cgc public.volunteer_status_cgc_enum DEFAULT 'undefined'::public.volunteer_status_cgc_enum NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        deal_id integer,
        person_id integer,
        preferred_communication_type text[] DEFAULT '{mobilePhone}'::text[] NOT NULL,
        date_return timestamp without time zone,
        nid character varying,
        status_vaccination_date timestamp without time zone,
        status_cgc_application_date timestamp without time zone,
        status_cgc_date timestamp without time zone,
        share_contact boolean DEFAULT true NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.accompanying (
        id integer NOT NULL,
        address character varying NOT NULL,
        name character varying NOT NULL,
        phone character varying,
        email character varying,
        date timestamp with time zone NOT NULL,
        language_to_translate public.accompanying_language_to_translate_enum,
        postcode_id integer
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.opportunity (
        id integer NOT NULL,
        title character varying NOT NULL,
        type public.opportunity_type_enum NOT NULL,
        info character varying,
        translation_type public.opportunity_translation_type_enum,
        info_confidential character varying,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        deal_id integer,
        agent_id integer,
        status public.opportunity_status_enum DEFAULT 'opp-new'::public.opportunity_status_enum NOT NULL,
        number_volunteers integer DEFAULT 1 NOT NULL,
        accompanying_id integer,
        nid character varying,
        status_match public.opportunity_status_match_enum DEFAULT 'opp-vol-no-matches'::public.opportunity_status_match_enum NOT NULL,
        district_id integer,
        contact_person_id integer,
        submitted_by_person_id integer
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.opportunity_volunteer (
        id integer NOT NULL,
        status public.opportunity_volunteer_status_enum NOT NULL,
        opportunity_id integer NOT NULL,
        volunteer_id integer NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.option (
        id integer NOT NULL,
        item_type public.option_item_type_enum NOT NULL,
        item_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.field_translation (
        id integer NOT NULL,
        field_name character varying DEFAULT 'title'::character varying NOT NULL,
        language_id integer,
        entity_type public.field_translation_entity_type_enum DEFAULT 'none'::public.field_translation_entity_type_enum NOT NULL,
        entity_id integer NOT NULL,
        translation text NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.timeline (
        id integer NOT NULL,
        source_entity_type public.timeline_source_entity_type_enum,
        source_entity_id integer,
        target_entity_type public.timeline_target_entity_type_enum NOT NULL,
        target_entity_id integer NOT NULL,
        content_entity_type public.timeline_content_entity_type_enum NOT NULL,
        content_entity_id integer NOT NULL,
        content_type public.timeline_content_type_enum NOT NULL,
        "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
        content text NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.event_n4d (
        id integer NOT NULL,
        is_active boolean DEFAULT false NOT NULL,
        date timestamp with time zone NOT NULL,
        date_end timestamp with time zone,
        type public.event_n4d_type_enum DEFAULT 'party'::public.event_n4d_type_enum NOT NULL,
        pic character varying(256),
        location_link character varying(256),
        rsvp_link character varying(256) NOT NULL,
        followup_link character varying(256),
        address character varying(256) NOT NULL,
        host_name character varying(256),
        language_id integer
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.event_translation (
        id integer NOT NULL,
        title character varying(256),
        subtitle character varying(256),
        menu_title character varying(256),
        time_str character varying(256),
        location_comment character varying(256),
        description text NOT NULL,
        short_description character varying(512) NOT NULL,
        additional_title character varying(256),
        additional_info jsonb,
        outro text,
        followup_text character varying(256),
        eventn4d_id integer,
        language_id integer
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.testimonial (
        id integer NOT NULL,
        is_active boolean DEFAULT false NOT NULL,
        name character varying(256),
        pic character varying(256),
        person_id integer,
        language_id integer
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.agent_language (
        id integer NOT NULL,
        agent_id integer NOT NULL,
        language_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.agent_person (
        id integer NOT NULL,
        role public.agent_person_role_enum DEFAULT 'other'::public.agent_person_role_enum NOT NULL,
        agent_id integer NOT NULL,
        person_id integer NOT NULL,
        status public.agent_person_status_enum DEFAULT 'active'::public.agent_person_status_enum NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.appreciation (
        id integer NOT NULL,
        title public.appreciation_title_enum NOT NULL,
        date_due timestamp without time zone,
        date_delivery timestamp without time zone,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        opportunity_id integer,
        volunteer_id integer NOT NULL,
        user_id integer
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.comment (
        id integer NOT NULL,
        text text NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        language_id integer,
        user_id integer NOT NULL,
        entity_type public.comment_entity_type_enum DEFAULT 'none'::public.comment_entity_type_enum NOT NULL,
        entity_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.comment_person (
        id integer NOT NULL,
        comment_id integer NOT NULL,
        person_id integer NOT NULL,
        read_at timestamp without time zone
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.communication (
        id integer NOT NULL,
        contact_type public.communication_contact_type_enum NOT NULL,
        contact_method public.communication_contact_method_enum NOT NULL,
        communication_type public.communication_communication_type_enum,
        date timestamp without time zone DEFAULT now() NOT NULL,
        volunteer_id integer,
        user_id integer,
        agent_id integer,
        opportunity_id integer,
        CONSTRAINT "CHK_0ea4b79edeac5eaa19c54735c7" CHECK (((CASE WHEN (volunteer_id IS NOT NULL) THEN 1 ELSE 0 END + CASE WHEN (agent_id IS NOT NULL) THEN 1 ELSE 0 END) + CASE WHEN (opportunity_id IS NOT NULL) THEN 1 ELSE 0 END) >= 1)
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.config (
        id integer NOT NULL,
        config_key public.config_config_key_enum NOT NULL,
        config_value boolean
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.deal_activity (
        id integer NOT NULL,
        deal_id integer NOT NULL,
        activity_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.deal_district (
        id integer NOT NULL,
        deal_id integer NOT NULL,
        district_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.deal_language (
        id integer NOT NULL,
        proficiency public.deal_language_proficiency_enum DEFAULT 'advanced'::public.deal_language_proficiency_enum,
        purpose public.deal_language_purpose_enum DEFAULT 'general'::public.deal_language_purpose_enum,
        deal_id integer NOT NULL,
        language_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.deal_skill (
        id integer NOT NULL,
        deal_id integer NOT NULL,
        skill_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.deal_timeslot (
        id integer NOT NULL,
        deal_id integer NOT NULL,
        timeslot_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.document (
        id integer NOT NULL,
        type public.document_type_enum NOT NULL,
        s3_key character varying NOT NULL,
        original_name character varying NOT NULL,
        mime_type character varying NOT NULL,
        volunteer_id integer,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.notion_relation (
        id integer NOT NULL,
        payroll character varying,
        host_nid character varying NOT NULL,
        host_type public.notion_relation_host_type_enum NOT NULL,
        host_id integer NOT NULL,
        tenant_nid character varying NOT NULL,
        tenant_type public.notion_relation_tenant_type_enum NOT NULL,
        tenant_id integer
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.post (
        id integer NOT NULL,
        text text NOT NULL,
        author_id integer NOT NULL,
        agent_id integer,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.post_opportunity (
        post_id integer NOT NULL,
        opportunity_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.post_person (
        post_id integer NOT NULL,
        person_id integer NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.activity_log (
        id integer NOT NULL,
        date date NOT NULL,
        hours numeric(5,2) NOT NULL,
        opportunity_volunteer_id integer NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.trusted_domain (
        id integer NOT NULL,
        domain character varying NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )`);

    // ─── SEQUENCE OWNERSHIP & COLUMN DEFAULTS ─────────────────────────────────
    // Both are idempotent (SET DEFAULT overwrites, OWNED BY reassigns).

    const seqOwners: [string, string, string][] = [
      ["accompanying_id_seq", "accompanying", "id"],
      ["activity_id_seq", "activity", "id"],
      ["activity_log_id_seq", "activity_log", "id"],
      ["address_id_seq", "address", "id"],
      ["agent_id_seq", "agent", "id"],
      ["agent_language_id_seq", "agent_language", "id"],
      ["agent_person_id_seq", "agent_person", "id"],
      ["agent_postcode_id_seq", "agent_postcode", "id"],
      ["appreciation_id_seq", "appreciation", "id"],
      ["category_id_seq", "category", "id"],
      ["comment_id_seq", "comment", "id"],
      ["comment_person_id_seq", "comment_person", "id"],
      ["communication_id_seq", "communication", "id"],
      ["config_id_seq", "config", "id"],
      ["deal_id_seq", "deal", "id"],
      ["deal_activity_id_seq", "deal_activity", "id"],
      ["deal_district_id_seq", "deal_district", "id"],
      ["deal_language_id_seq", "deal_language", "id"],
      ["deal_skill_id_seq", "deal_skill", "id"],
      ["deal_timeslot_id_seq", "deal_timeslot", "id"],
      ["district_id_seq", "district", "id"],
      ["district_postcode_id_seq", "district_postcode", "id"],
      ["document_id_seq", "document", "id"],
      ["event_n4d_id_seq", "event_n4d", "id"],
      ["event_translation_id_seq", "event_translation", "id"],
      ["field_translation_id_seq", "field_translation", "id"],
      ["language_id_seq", "language", "id"],
      ["lead_from_id_seq", "lead_from", "id"],
      ["notion_relation_id_seq", "notion_relation", "id"],
      ["opportunity_id_seq", "opportunity", "id"],
      ["opportunity_volunteer_id_seq", "opportunity_volunteer", "id"],
      ["option_id_seq", "option", "id"],
      ["organization_id_seq", "organization", "id"],
      ["person_id_seq", "person", "id"],
      ["post_id_seq", "post", "id"],
      ["postcode_id_seq", "postcode", "id"],
      ["skill_id_seq", "skill", "id"],
      ["testimonial_id_seq", "testimonial", "id"],
      ["timeline_id_seq", "timeline", "id"],
      ["timeslot_id_seq", "timeslot", "id"],
      ["trusted_domain_id_seq", "trusted_domain", "id"],
      ["user_id_seq", '"user"', "id"],
      ["volunteer_id_seq", "volunteer", "id"],
    ];

    for (const [seq, tbl, col] of seqOwners) {
      await queryRunner.query(
        `ALTER SEQUENCE public.${seq} OWNED BY public.${tbl}.${col}`,
      );
      await queryRunner.query(
        `ALTER TABLE ONLY public.${tbl} ALTER COLUMN ${col} SET DEFAULT nextval('public.${seq}'::regclass)`,
      );
    }

    // ─── PRIMARY KEYS ────────────────────────────────────────────────────────

    const pks: [string, string, string][] = [
      ["accompanying", "PK_d0fd931d21e719a937ba4ca36ac", "id"],
      ["activity", "PK_24625a1d6b1b089c8ae206fe467", "id"],
      ["activity_log", "PK_067d761e2956b77b14e534fd6f1", "id"],
      ["address", "PK_d92de1f82754668b5f5f5dd4fd5", "id"],
      ["agent", "PK_1000e989398c5d4ed585cf9a46f", "id"],
      ["agent_language", "PK_c4b59dce9dddd19cb7ab607b1ad", "id"],
      ["agent_person", "PK_d78c87230af992a1bf93c5b93ae", "id"],
      ["agent_postcode", "PK_790c4a8ac360683061758eea4fb", "id"],
      ["appreciation", "PK_d9824c8e198e82f7394c805eddf", "id"],
      ["category", "PK_9c4e4a89e3674fc9f382d733f03", "id"],
      ["comment", "PK_0b0e4bbc8415ec426f87f3a88e2", "id"],
      ["comment_person", "PK_f3a5d50a9812f4f4a03921497f7", "id"],
      ["communication", "PK_392407b9e9100bee1a64e26cd5d", "id"],
      ["config", "PK_d0ee79a681413d50b0a4f98cf7b", "id"],
      ["deal", "PK_9ce1c24acace60f6d7dc7a7189e", "id"],
      ["deal_activity", "PK_2dfd3d9d6571f3b52b4f2a2f7b6", "id"],
      ["deal_district", "PK_f166ddb3884b15af861573d036b", "id"],
      ["deal_language", "PK_f41aff0608b977c9b2a70e484ff", "id"],
      ["deal_skill", "PK_791b2c5c3ae4db034fef8999c35", "id"],
      ["deal_timeslot", "PK_4259966a4f5f9cc66b7179d94e2", "id"],
      ["district", "PK_ee5cb6fd5223164bb87ea693f1e", "id"],
      ["district_postcode", "PK_0e1774a1cd62d250b9564ab0904", "id"],
      ["document", "PK_e57d3357f83f3cdc0acffc3d777", "id"],
      ["event_n4d", "PK_e0df3ada625ad10e0b3fbeaec47", "id"],
      ["event_translation", "PK_d5739128be79554fecf75dca107", "id"],
      ["field_translation", "PK_9159080b83585be7c50d6a9883e", "id"],
      ["language", "PK_cc0a99e710eb3733f6fb42b1d4c", "id"],
      ["lead_from", "PK_62c40760ad8725f93fa01345855", "id"],
      ["notion_relation", "PK_a9db9fcae0b0476e5142622c0c0", "id"],
      ["opportunity", "PK_085fd6d6f4765325e6c16163568", "id"],
      ["opportunity_volunteer", "PK_501d2e5de509fa64503be23ae18", "id"],
      ["option", "PK_e6090c1c6ad8962eea97abdbe63", "id"],
      ["organization", "PK_472c1f99a32def1b0abb219cd67", "id"],
      ["person", "PK_5fdaf670315c4b7e70cce85daa3", "id"],
      ["post", "PK_be5fda3aac270b134ff9c21cdee", "id"],
      ["postcode", "PK_c19bc9f774c1cf019766a35ca4d", "id"],
      ["skill", "PK_a0d33334424e64fb78dc3ce7196", "id"],
      ["testimonial", "PK_e1aee1c726db2d336480c69f7cb", "id"],
      ["timeline", "PK_f841188896cefd9277904ec40b9", "id"],
      ["timeslot", "PK_cd8bca557ee1eb5b090b9e63009", "id"],
      ["trusted_domain", "PK_b8c4fcc9a45771d9f59e1dd6b1b", "id"],
      ['"user"', "PK_cace4a159ff9f2512dd42373760", "id"],
      ["volunteer", "PK_76924da1998b3e07025e04c4d3c", "id"],
    ];

    // A PK-add can't rely on `EXCEPTION WHEN duplicate_object` for idempotency:
    // Postgres checks "table already has a PK" before it checks "constraint
    // name already exists", so it raises invalid_table_definition (uncaught
    // here) rather than duplicate_object whenever the table already has any
    // primary key, even one with this exact name. Guard explicitly instead.
    for (const [tbl, name, cols] of pks) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conrelid = 'public.${tbl}'::regclass AND contype = 'p'
          ) THEN
            ALTER TABLE ONLY public.${tbl} ADD CONSTRAINT "${name}" PRIMARY KEY (${cols});
          END IF;
        END $$`);
    }

    // Composite PKs
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conrelid = 'public.post_person'::regclass AND contype = 'p'
        ) THEN
          ALTER TABLE ONLY public.post_person ADD CONSTRAINT "PK_2752a498efcea4ce067c3ced8b6" PRIMARY KEY (post_id, person_id);
        END IF;
      END $$`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conrelid = 'public.post_opportunity'::regclass AND contype = 'p'
        ) THEN
          ALTER TABLE ONLY public.post_opportunity ADD CONSTRAINT "PK_83c02a05c6699152a7619ca8de2" PRIMARY KEY (post_id, opportunity_id);
        END IF;
      END $$`);

    // ─── UNIQUE CONSTRAINTS ───────────────────────────────────────────────────

    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.activity ADD CONSTRAINT "UQ_a28a1682ea80f10d1ecc7babaa0" UNIQUE (title); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.address ADD CONSTRAINT "UQ_dc72f107eef6108d4163fae4cd2" UNIQUE (title); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent ADD CONSTRAINT "UQ_c13f74bf3e3d5e4fedf63231881" UNIQUE (title); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.category ADD CONSTRAINT "UQ_9f16dbbf263b0af0f03637fa7b5" UNIQUE (title); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_activity ADD CONSTRAINT "UQ_916f710fb2164dee243ab81e42d" UNIQUE (deal_id, activity_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_district ADD CONSTRAINT "UQ_bb2d0e17996f1cc2e8c36b8097c" UNIQUE (deal_id, district_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_skill ADD CONSTRAINT "UQ_cf0a989e58c03a76911ea044fa5" UNIQUE (deal_id, skill_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_timeslot ADD CONSTRAINT "UQ_dc6a725ff9fddeff3866465fc95" UNIQUE (deal_id, timeslot_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.document ADD CONSTRAINT "UQ_761a987245fa09ddf48e5aafcf4" UNIQUE (type, volunteer_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.opportunity_volunteer ADD CONSTRAINT "UQ_ef61e09ab1a57be86168bd83378" UNIQUE (opportunity_id, volunteer_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.organization ADD CONSTRAINT "UQ_a7c11b94f5aaa12289f67de3f8f" UNIQUE (title); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.skill ADD CONSTRAINT "UQ_5b1131c92af934e7c2a1322ec87" UNIQUE (title); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public."user" ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE (email); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    // ─── FOREIGN KEYS ────────────────────────────────────────────────────────

    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.event_n4d ADD CONSTRAINT "FK_019ed6de3369ed99b82ebf1b85c" FOREIGN KEY (language_id) REFERENCES public.language(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent_postcode ADD CONSTRAINT "FK_0c0882d8ac7a24eec11d7bff144" FOREIGN KEY (agent_id) REFERENCES public.agent(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.organization ADD CONSTRAINT "FK_0f31fe3925535afb5462326d7d6" FOREIGN KEY (address_id) REFERENCES public.address(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.event_translation ADD CONSTRAINT "FK_10fabc95d13968a570404f5c516" FOREIGN KEY (language_id) REFERENCES public.language(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent_person ADD CONSTRAINT "FK_1fc545aa66757a901d425e88f0b" FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.opportunity ADD CONSTRAINT "FK_20c491a989b6d30143c9487fa3c" FOREIGN KEY (district_id) REFERENCES public.district(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.appreciation ADD CONSTRAINT "FK_29ae22414bad9bb74367b329b00" FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.appreciation ADD CONSTRAINT "FK_2a91e0b949799349a3a87aa220b" FOREIGN KEY (volunteer_id) REFERENCES public.volunteer(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal ADD CONSTRAINT "FK_2e866113f33c2e1a3f9d81a4133" FOREIGN KEY (category_id) REFERENCES public.category(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.post ADD CONSTRAINT "FK_2f1a9ca8908fc8168bc18437f62" FOREIGN KEY (author_id) REFERENCES public.person(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.communication ADD CONSTRAINT "FK_3120e867d4bf41caa7b8984440e" FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_skill ADD CONSTRAINT "FK_407bd56cbfa76cc7d99fb29f01a" FOREIGN KEY (deal_id) REFERENCES public.deal(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.event_translation ADD CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66" FOREIGN KEY (eventn4d_id) REFERENCES public.event_n4d(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.opportunity_volunteer ADD CONSTRAINT "FK_4a47cea224192a18c9bb93c07b4" FOREIGN KEY (opportunity_id) REFERENCES public.opportunity(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.volunteer ADD CONSTRAINT "FK_4b1093af5610c75cfca53546c0d" FOREIGN KEY (deal_id) REFERENCES public.deal(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.opportunity ADD CONSTRAINT "FK_4f3dd494438470c347902f276d7" FOREIGN KEY (submitted_by_person_id) REFERENCES public.person(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_district ADD CONSTRAINT "FK_56838b99011fdc67a0b38169026" FOREIGN KEY (district_id) REFERENCES public.district(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.activity ADD CONSTRAINT "FK_5d3d888450207667a286922f945" FOREIGN KEY (category_id) REFERENCES public.category(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.post ADD CONSTRAINT "FK_60618b67a1e1043df6380caa22f" FOREIGN KEY (agent_id) REFERENCES public.agent(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_activity ADD CONSTRAINT "FK_60a29bcf00ea63da27514e8f748" FOREIGN KEY (activity_id) REFERENCES public.activity(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.post_opportunity ADD CONSTRAINT "FK_61a8575d8e7c30b3462fa19f6d0" FOREIGN KEY (opportunity_id) REFERENCES public.opportunity(id) ON UPDATE CASCADE ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.opportunity ADD CONSTRAINT "FK_62f9c6aaa610596f0d5f972e962" FOREIGN KEY (deal_id) REFERENCES public.deal(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent_language ADD CONSTRAINT "FK_655274b2246207a662e3940b0d4" FOREIGN KEY (agent_id) REFERENCES public.agent(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent ADD CONSTRAINT "FK_6b58af875f81124b0cd64dc843a" FOREIGN KEY (district_id) REFERENCES public.district(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.post_person ADD CONSTRAINT "FK_6d5bd5330c6c6d717fb4128190f" FOREIGN KEY (post_id) REFERENCES public.post(id) ON UPDATE CASCADE ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.opportunity ADD CONSTRAINT "FK_72b2a2637cc12f5d5b71bb3236e" FOREIGN KEY (agent_id) REFERENCES public.agent(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.communication ADD CONSTRAINT "FK_73aa11f1d453a65ba3cebda85fb" FOREIGN KEY (opportunity_id) REFERENCES public.opportunity(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.district_postcode ADD CONSTRAINT "FK_7b72f500f43de90b1a7d6e60ead" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent ADD CONSTRAINT "FK_7b8b0514632bffdf8d13afbc9de" FOREIGN KEY (address_id) REFERENCES public.address(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.activity_log ADD CONSTRAINT "FK_7f5f4c33b2fbdc19b1f8460b5f0" FOREIGN KEY (opportunity_volunteer_id) REFERENCES public.opportunity_volunteer(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.field_translation ADD CONSTRAINT "FK_804ca3b0c276af3e8b593664f06" FOREIGN KEY (language_id) REFERENCES public.language(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.comment_person ADD CONSTRAINT "FK_81d4ae770167ca1c3196b3c3b52" FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_timeslot ADD CONSTRAINT "FK_8a6ceb170e7eb33cadfa425a455" FOREIGN KEY (timeslot_id) REFERENCES public.timeslot(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_skill ADD CONSTRAINT "FK_8d6f46ceb923a37da3891ace9ac" FOREIGN KEY (skill_id) REFERENCES public.skill(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent ADD CONSTRAINT "FK_92b5f704c0b5e65fb0698240744" FOREIGN KEY (organization_id) REFERENCES public.organization(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_language ADD CONSTRAINT "FK_9e1f3159d0361d8f7131f3db643" FOREIGN KEY (language_id) REFERENCES public.language(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.comment_person ADD CONSTRAINT "FK_a32624ba70e3dc1462329a6323e" FOREIGN KEY (comment_id) REFERENCES public.comment(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.accompanying ADD CONSTRAINT "FK_a48f002dffae26a9642e2f7cefb" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public."user" ADD CONSTRAINT "FK_a4cee7e601d219733b064431fba" FOREIGN KEY (person_id) REFERENCES public.person(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal ADD CONSTRAINT "FK_b709f61f789979d2087bfc41768" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_timeslot ADD CONSTRAINT "FK_b8ec1df4dc435355a2863782b81" FOREIGN KEY (deal_id) REFERENCES public.deal(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_district ADD CONSTRAINT "FK_b9f762e06a46859f822e66e11d1" FOREIGN KEY (deal_id) REFERENCES public.deal(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.comment ADD CONSTRAINT "FK_bbfe153fa60aa06483ed35ff4a7" FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.opportunity_volunteer ADD CONSTRAINT "FK_c0f508b980be4be0b244a5471a1" FOREIGN KEY (volunteer_id) REFERENCES public.volunteer(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.post_person ADD CONSTRAINT "FK_c2ec8325a53c239442778bd029d" FOREIGN KEY (person_id) REFERENCES public.person(id) ON UPDATE CASCADE ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent_language ADD CONSTRAINT "FK_c58ded607e284db17d03e9eb20b" FOREIGN KEY (language_id) REFERENCES public.language(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.testimonial ADD CONSTRAINT "FK_c6bdc688fecc9e338d0c4018c4c" FOREIGN KEY (language_id) REFERENCES public.language(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_activity ADD CONSTRAINT "FK_c8b28c14786d76527d121126259" FOREIGN KEY (deal_id) REFERENCES public.deal(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.person ADD CONSTRAINT "FK_cd587348ca3fec07931de208299" FOREIGN KEY (address_id) REFERENCES public.address(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.appreciation ADD CONSTRAINT "FK_ce5266cf486c563f4e2c8babe4c" FOREIGN KEY (opportunity_id) REFERENCES public.opportunity(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.district_postcode ADD CONSTRAINT "FK_d3b662cb01cdb6f22c7097e0b33" FOREIGN KEY (district_id) REFERENCES public.district(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.opportunity ADD CONSTRAINT "FK_dad52d4b309d2e04b9663fbb36d" FOREIGN KEY (contact_person_id) REFERENCES public.person(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.post_opportunity ADD CONSTRAINT "FK_dfcd3c6cd9a6db4700cd5ebe6c0" FOREIGN KEY (post_id) REFERENCES public.post(id) ON UPDATE CASCADE ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.document ADD CONSTRAINT "FK_e1d6fe65e869e2858d0acfef925" FOREIGN KEY (volunteer_id) REFERENCES public.volunteer(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.address ADD CONSTRAINT "FK_e1d98846fd3dcdea8e3f267e7eb" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.opportunity ADD CONSTRAINT "FK_e82fe25e9f9cbe9edbb6cba8c19" FOREIGN KEY (accompanying_id) REFERENCES public.accompanying(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.communication ADD CONSTRAINT "FK_e8f1435f58864dd4b55c47d1468" FOREIGN KEY (agent_id) REFERENCES public.agent(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.organization ADD CONSTRAINT "FK_e94553ff34338a3882ed305a74d" FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent_postcode ADD CONSTRAINT "FK_ec2a5aa17ef1f489815ee8cefdf" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.comment ADD CONSTRAINT "FK_f02c3b7cc4d58ca622a90d682a0" FOREIGN KEY (language_id) REFERENCES public.language(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.deal_language ADD CONSTRAINT "FK_f65d3334e061a3490b70b0b4eb9" FOREIGN KEY (deal_id) REFERENCES public.deal(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.testimonial ADD CONSTRAINT "FK_f7086d54eec10b450adee1be7b9" FOREIGN KEY (person_id) REFERENCES public.person(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.communication ADD CONSTRAINT "FK_fb198b1a72d3e9fa9e006c824c0" FOREIGN KEY (volunteer_id) REFERENCES public.volunteer(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.volunteer ADD CONSTRAINT "FK_fc40d3eada517c3c9315e0c9e51" FOREIGN KEY (person_id) REFERENCES public.person(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE ONLY public.agent_person ADD CONSTRAINT "FK_ffb35bb3606febae68541916709" FOREIGN KEY (agent_id) REFERENCES public.agent(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    // ─── INDEXES ─────────────────────────────────────────────────────────────

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_0913ee135f62eccb90f53047ad" ON public.comment_person USING btree (comment_id, person_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_3998cf87b5faec4e52018bddbd" ON public.trusted_domain USING btree (domain)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_61a8575d8e7c30b3462fa19f6d" ON public.post_opportunity USING btree (opportunity_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_68fcd3be0d9a16a5b6c8371133" ON public.timeline USING btree (target_entity_type, target_entity_id, "timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6d5bd5330c6c6d717fb4128190" ON public.post_person USING btree (post_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_81d4ae770167ca1c3196b3c3b5" ON public.comment_person USING btree (person_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_8c3af29493287693cdd82d99c1" ON public.comment USING btree (entity_type, entity_id, language_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c2ec8325a53c239442778bd029" ON public.post_person USING btree (person_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cd9cbf582b713498a61c626c2d" ON public.field_translation USING btree (language_id, entity_type, entity_id, field_name)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dfcd3c6cd9a6db4700cd5ebe6c" ON public.post_opportunity USING btree (post_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_f15c4b743ddfba08409b99f797" ON public.agent_person USING btree (agent_id, person_id, role)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_person_search_gin" ON public.person USING gin (to_tsvector('simple'::regconfig, (((((COALESCE(first_name, ''::character varying))::text || ' '::text) || (COALESCE(last_name, ''::character varying))::text) || ' '::text) || (COALESCE(email, ''::character varying))::text)))`,
    );

    // ─── MARK ALL PRIOR MIGRATIONS AS ALREADY RUN ────────────────────────────
    // Idempotent: WHERE NOT EXISTS prevents duplicate inserts on existing DBs.

    const migrations: [number, string][] = [
      [1763036250587, "UpdateVolunteerListMv1763036250587"],
      [1763636303849, "AddEventEntity1763636303849"],
      [1765976202270, "AddCityToAddressEntity1765976202270"],
      [1766003754834, "AddPreferredCommToVolunteerEntity1766003754834"],
      [1766352158945, "ChangeVolunteerPreferredCommToArray1766352158945"],
      [1767357208920, "AddDocumentEntity1767357208920"],
      [1767816732428, "AddCommunicationEntity1767816732428"],
      [1768772092135, "AddAppreciationEntity1768772092135"],
      [1769012055276, "CatchTsJan211769012055276"],
      [1769183878914, "AddVolunteerReturnDate1769183878914"],
      [1769606450859, "SyncAndUpdateOppVolM2m1769606450859"],
      [1770126767598, "UpdateOppProfile1770126767598"],
      [1770226586693, "UpdateOppTypeEnum1770226586693"],
      [1770655462205, "AddAccomponyingEntity1770655462205"],
      [1770713139121, "AddConfigKey1770713139121"],
      [1771086827549, "UpdateAgentEntity1771086827549"],
      [1771201168124, "UpdateAgentEntity21771201168124"],
      [1771505596306, "UpdateAgentEntity31771505596306"],
      [1771858452728, "UpdateAgentEntity41771858452728"],
      [1772005888557, "UpdateOppProfileProfLang1772005888557"],
      [1772019993181, "UpdateCommentEtity1772019993181"],
      [1772052519214, "UpdatePersonEntity1772052519214"],
      [1772545971802, "MoveAccompanyingToOpportunity1772545971802"],
      [1772609767417, "CheckIfInSync1772609767417"],
      [1773268076415, "UpdateAgentEntity6AgentPerson1773268076415"],
      [1773413991868, "UpdatePersonEntityAddLandline1773413991868"],
      [1773423834140, "UpdateAgentEntity71773423834140"],
      [1773438090614, "UpdateCommunicationEntity1773438090614"],
      [1773746534596, "UpdateCommentEtity21773746534596"],
      [1774135672526, "AddNotionRelationEntity1774135672526"],
      [1776035229092, "AddVolIndeces1776035229092"],
      [1776321570996, "UpdateOppOrphanage1776321570996"],
      [1776699111911, "UpdateAgentEntity1776699111911"],
      [1776935007602, "AddNidToAgentVolOpp1776935007602"],
      [1777230024863, "UpdateVolOppAgentSetNids1777230024863"],
      [1777284365646, "AddInactiveToOppStatus1777284365646"],
      [1777382465431, "RemoveNotionRelUnique1777382465431"],
      [1777462201044, "UpdateOppEntityAddMissingValuesToEnums1777462201044"],
      [1777481403775, "LoadStatusesOppVol1777481403775"],
      [1777884798498, "AddCommunicationsFromNotion1777884798498"],
      [1777973964566, "ConsolidateLegacyDistricts1777973964566"],
      [1778069345200, "AddDistrictToOpp1778069345200"],
      [1778503017097, "AddVolunteerDocStatusDates1778503017097"],
      [1778578280034, "AddPostcodeToAccompanying1778578280034"],
      [1778579676871, "UpdateAccompanyingPostcodeFkSetNull1778579676871"],
      [1778864931379, "SetAgentDistrictFromPlz1778864931379"],
      [1779186682996, "FixTranslationOfLanguageTitles1779186682996"],
      [1779737272182, "SyncEntitiesDdl1779737272182"],
      [1779738026660, "AddUniqueOppVol1779738026660"],
      [1779739039589, "SeedMatchedOppVol1779739039589"],
      [1779809730247, "FixMatchedOppVolUseNid1779809730247"],
      [1779900000000, "AddContactPersonToOpportunity1779900000000"],
      [1780167679271, "AddSubmittedByPersonToOpportunity1780167679271"],
      [1780169787517, "BackfillOpportunitySubmittedByPerson1780169787517"],
      [
        1780182685021,
        "BackfillOpportunitySubmittedByPerson4FieldBlobs1780182685021",
      ],
      [1780430062141, "AddCommentPersonM2m1780430062141"],
      [1780430801611, "AddUniqueAgentPersonRole1780430801611"],
      [1780432006040, "AddIndexCommentPersonPersonId1780432006040"],
      [1780485146870, "AddDealActivity1780485146870"],
      [1780487570188, "AddUniqueDealActivity1780487570188"],
      [1780488457577, "AddDealSkill1780488457577"],
      [1780492917105, "FlattenDealLanguageDropProfile1780492917105"],
      [1780512794386, "FlattenDealTimeslotDropTime1780512794386"],
      [1780515101270, "AddDealDistrict1780515101270"],
      [1780516402900, "DropLocation1780516402900"],
      [1781004181023, "AddStatusToAgentPerson1781004181023"],
      [1781277697986, "AddTrustedDomain1781277697986"],
      [1781600000000, "BackfillOpportunityStatusMatch1781600000000"],
      [1782222001656, "AddActivityLog1782222001656"],
      [1782245067240, "AddReadAtToCommentPerson1782245067240"],
      [1782897313819, "AddShareContactToVolunteer1782897313819"],
      [
        1782903516653,
        "CommunicationNullableFksAndOpportunityRelation1782903516653",
      ],
      [1783342906122, "AddPostEntity1783342906122"],
    ];

    for (const [ts, migName] of migrations) {
      await queryRunner.query(
        `INSERT INTO public.be_migrations (timestamp, name) SELECT ${ts}, '${migName}' WHERE NOT EXISTS (SELECT 1 FROM public.be_migrations WHERE timestamp = ${ts} AND name = '${migName}')`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // genesis is irreversible — removing it would require recreating the original
    // scrambled-dump bootstrap, which we explicitly replaced
  }
}
