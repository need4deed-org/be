--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2 (Debian 17.2-1.pgdg120+1)
-- Dumped by pg_dump version 17.2 (Debian 17.2-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: agent_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.config_type_enum AS ENUM (
    'schema',
    'reference_data',
    'master_data'
);

ALTER TYPE public.config_type_enum OWNER TO postgres;

--
-- Name: agent_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.agent_type_enum AS ENUM (
    'RAC',
    'NGO'
);

ALTER TYPE public.agent_type_enum OWNER TO postgres;

--
-- Name: deal_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.deal_type_enum AS ENUM (
    'volunteer',
    'opportunity'
);


ALTER TYPE public.deal_type_enum OWNER TO postgres;

--
-- Name: event_n4d_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_n4d_type_enum AS ENUM (
    'party',
    'workshop'
);


ALTER TYPE public.event_n4d_type_enum OWNER TO postgres;

--
-- Name: field_translation_entity_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.field_translation_entity_type_enum AS ENUM (
    'none',
    'activity',
    'skill',
    'category',
    'language',
    'lead_from',
    'district',
    'volunteer'
);


ALTER TYPE public.field_translation_entity_type_enum OWNER TO postgres;

--
-- Name: location_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.location_type_enum AS ENUM (
    'postcode',
    'district',
    'address',
    'geolocation'
);


ALTER TYPE public.location_type_enum OWNER TO postgres;

--
-- Name: opportunity_translation_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.opportunity_translation_type_enum AS ENUM (
    'deutsche',
    'englishOk',
    'noTranslation'
);


ALTER TYPE public.opportunity_translation_type_enum OWNER TO postgres;

--
-- Name: opportunity_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.opportunity_type_enum AS ENUM (
    'volunteering',
    'accompanying'
);


ALTER TYPE public.opportunity_type_enum OWNER TO postgres;

--
-- Name: option_item_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.option_item_type_enum AS ENUM (
    'none',
    'activity',
    'skill',
    'category',
    'language',
    'lead_from',
    'district',
    'volunteer'
);


ALTER TYPE public.option_item_type_enum OWNER TO postgres;

--
-- Name: profile_language_proficiency_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.profile_language_proficiency_enum AS ENUM (
    'beginner',
    'intermediate',
    'advanced',
    'fluent',
    'native'
);


ALTER TYPE public.profile_language_proficiency_enum OWNER TO postgres;

--
-- Name: timeline_content_entity_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.timeline_content_entity_type_enum AS ENUM (
    'none',
    'activity',
    'skill',
    'category',
    'language',
    'lead_from',
    'district',
    'volunteer'
);


ALTER TYPE public.timeline_content_entity_type_enum OWNER TO postgres;

--
-- Name: timeline_content_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.timeline_content_type_enum AS ENUM (
    'create',
    'update',
    'remove',
    'comment',
    'status',
    'matching'
);


ALTER TYPE public.timeline_content_type_enum OWNER TO postgres;

--
-- Name: timeline_source_entity_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.timeline_source_entity_type_enum AS ENUM (
    'none',
    'activity',
    'skill',
    'category',
    'language',
    'lead_from',
    'district',
    'volunteer'
);


ALTER TYPE public.timeline_source_entity_type_enum OWNER TO postgres;

--
-- Name: timeline_target_entity_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.timeline_target_entity_type_enum AS ENUM (
    'none',
    'activity',
    'skill',
    'category',
    'language',
    'lead_from',
    'district',
    'volunteer'
);


ALTER TYPE public.timeline_target_entity_type_enum OWNER TO postgres;

--
-- Name: timeslot_occasional_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.timeslot_occasional_enum AS ENUM (
    'weekends',
    'weekdays'
);


ALTER TYPE public.timeslot_occasional_enum OWNER TO postgres;

--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role_enum AS ENUM (
    'user',
    'coordinator',
    'agent',
    'volunteer',
    'admin'
);


ALTER TYPE public.user_role_enum OWNER TO postgres;

--
-- Name: volunteer_status_appreciation_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volunteer_status_appreciation_enum AS ENUM (
    't-shirt',
    'benefit-card',
    'tote-bag'
);


ALTER TYPE public.volunteer_status_appreciation_enum OWNER TO postgres;

--
-- Name: volunteer_status_cgc_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volunteer_status_cgc_enum AS ENUM (
    'undefined',
    'yes',
    'no',
    'asked_to_apply',
    'applied_self',
    'applied_n4d'
);


ALTER TYPE public.volunteer_status_cgc_enum OWNER TO postgres;

--
-- Name: volunteer_status_cgc_process_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volunteer_status_cgc_process_enum AS ENUM (
    'uploaded',
    'missing'
);


ALTER TYPE public.volunteer_status_cgc_process_enum OWNER TO postgres;

--
-- Name: volunteer_status_communication_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volunteer_status_communication_enum AS ENUM (
    'called',
    'email-sent',
    'briefed',
    'tried-call',
    'not-responding'
);


ALTER TYPE public.volunteer_status_communication_enum OWNER TO postgres;

--
-- Name: volunteer_status_engagement_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volunteer_status_engagement_enum AS ENUM (
    'new',
    'active',
    'available',
    'temp-unavailable',
    'inactive',
    'unresponsive'
);


ALTER TYPE public.volunteer_status_engagement_enum OWNER TO postgres;

--
-- Name: volunteer_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volunteer_status_enum AS ENUM (
    'New',
    'Opportunity sent',
    'Matched',
    'Active regular',
    'Active accompany',
    'Active fest',
    'To rematch',
    'Temp inactive',
    'Inactive'
);


ALTER TYPE public.volunteer_status_enum OWNER TO postgres;

--
-- Name: volunteer_status_match_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volunteer_status_match_enum AS ENUM (
    'no-matches',
    'pending_match',
    'matched',
    'needs-rematch'
);


ALTER TYPE public.volunteer_status_match_enum OWNER TO postgres;

--
-- Name: volunteer_status_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volunteer_status_type_enum AS ENUM (
    'accompanying',
    'regular',
    'regular-accompanying',
    'events'
);


ALTER TYPE public.volunteer_status_type_enum OWNER TO postgres;

--
-- Name: volunteer_status_vaccination_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volunteer_status_vaccination_enum AS ENUM (
    'undefined',
    'yes',
    'no',
    'asked_to_apply',
    'applied_self',
    'applied_n4d'
);


ALTER TYPE public.volunteer_status_vaccination_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.config (
    id integer NOT NULL,
    config_key public.config_type_enum NOT NULL,
    config_value character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.config OWNER TO postgres;

--
-- Name: config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.config_id_seq OWNER TO postgres;

--
-- Name: activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.config_id_seq OWNED BY public.config.id;

--
-- Name: activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity (
    id integer NOT NULL,
    title character varying NOT NULL,
    category_id integer
);


ALTER TABLE public.activity OWNER TO postgres;

--
-- Name: activity_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_id_seq OWNER TO postgres;

--
-- Name: activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_id_seq OWNED BY public.activity.id;


--
-- Name: address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address (
    id integer NOT NULL,
    title character varying,
    street character varying,
    postcode_id integer NOT NULL
);


ALTER TABLE public.address OWNER TO postgres;

--
-- Name: address_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.address_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.address_id_seq OWNER TO postgres;

--
-- Name: address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.address_id_seq OWNED BY public.address.id;


--
-- Name: agent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent (
    id integer NOT NULL,
    title character varying NOT NULL,
    type public.agent_type_enum DEFAULT 'RAC'::public.agent_type_enum NOT NULL,
    operator_type character varying NOT NULL,
    operator_id integer NOT NULL,
    person_id integer,
    postcode_id integer
);


ALTER TABLE public.agent OWNER TO postgres;

--
-- Name: agent_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_id_seq OWNER TO postgres;

--
-- Name: agent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_id_seq OWNED BY public.agent.id;


--
-- Name: agent_postcode; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_postcode (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    postcode_id integer NOT NULL
);


ALTER TABLE public.agent_postcode OWNER TO postgres;

--
-- Name: agent_postcode_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_postcode_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_postcode_id_seq OWNER TO postgres;

--
-- Name: agent_postcode_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_postcode_id_seq OWNED BY public.agent_postcode.id;


--
-- Name: be_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.be_migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.be_migrations OWNER TO postgres;

--
-- Name: be_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.be_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.be_migrations_id_seq OWNER TO postgres;

--
-- Name: be_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.be_migrations_id_seq OWNED BY public.be_migrations.id;


--
-- Name: category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.category (
    id integer NOT NULL,
    title character varying NOT NULL
);


ALTER TABLE public.category OWNER TO postgres;

--
-- Name: category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.category_id_seq OWNER TO postgres;

--
-- Name: category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.category_id_seq OWNED BY public.category.id;


--
-- Name: deal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deal (
    id integer NOT NULL,
    type public.deal_type_enum NOT NULL,
    postcode_id integer NOT NULL,
    time_id integer NOT NULL,
    location_id integer NOT NULL,
    profile_id integer
);


ALTER TABLE public.deal OWNER TO postgres;

--
-- Name: deal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deal_id_seq OWNER TO postgres;

--
-- Name: deal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deal_id_seq OWNED BY public.deal.id;


--
-- Name: district; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.district (
    id integer NOT NULL,
    title character varying NOT NULL
);


ALTER TABLE public.district OWNER TO postgres;

--
-- Name: district_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.district_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.district_id_seq OWNER TO postgres;

--
-- Name: district_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.district_id_seq OWNED BY public.district.id;


--
-- Name: district_postcode; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.district_postcode (
    id integer NOT NULL,
    district_id integer NOT NULL,
    postcode_id integer NOT NULL
);


ALTER TABLE public.district_postcode OWNER TO postgres;

--
-- Name: district_postcode_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.district_postcode_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.district_postcode_id_seq OWNER TO postgres;

--
-- Name: district_postcode_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.district_postcode_id_seq OWNED BY public.district_postcode.id;


--
-- Name: event_n4d; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_n4d (
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
);


ALTER TABLE public.event_n4d OWNER TO postgres;

--
-- Name: event_n4d_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_n4d_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_n4d_id_seq OWNER TO postgres;

--
-- Name: event_n4d_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_n4d_id_seq OWNED BY public.event_n4d.id;


--
-- Name: event_translation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_translation (
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
);


ALTER TABLE public.event_translation OWNER TO postgres;

--
-- Name: event_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_translation_id_seq OWNER TO postgres;

--
-- Name: event_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_translation_id_seq OWNED BY public.event_translation.id;


--
-- Name: field_translation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.field_translation (
    id integer NOT NULL,
    field_name character varying DEFAULT 'title'::character varying NOT NULL,
    language_id integer,
    entity_type public.field_translation_entity_type_enum DEFAULT 'none'::public.field_translation_entity_type_enum NOT NULL,
    entity_id integer NOT NULL,
    translation text NOT NULL
);


ALTER TABLE public.field_translation OWNER TO postgres;

--
-- Name: field_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.field_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.field_translation_id_seq OWNER TO postgres;

--
-- Name: field_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.field_translation_id_seq OWNED BY public.field_translation.id;


--
-- Name: language; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.language (
    id integer NOT NULL,
    iso_code character varying NOT NULL,
    title character varying NOT NULL
);


ALTER TABLE public.language OWNER TO postgres;

--
-- Name: language_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.language_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.language_id_seq OWNER TO postgres;

--
-- Name: language_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.language_id_seq OWNED BY public.language.id;


--
-- Name: lead_from; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_from (
    id integer NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    title character varying NOT NULL
);


ALTER TABLE public.lead_from OWNER TO postgres;

--
-- Name: lead_from_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_from_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_from_id_seq OWNER TO postgres;

--
-- Name: lead_from_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_from_id_seq OWNED BY public.lead_from.id;


--
-- Name: location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location (
    id integer NOT NULL,
    type public.location_type_enum DEFAULT 'district'::public.location_type_enum NOT NULL,
    info character varying
);


ALTER TABLE public.location OWNER TO postgres;

--
-- Name: location_address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_address (
    id integer NOT NULL,
    location_id integer NOT NULL,
    address_id integer NOT NULL
);


ALTER TABLE public.location_address OWNER TO postgres;

--
-- Name: location_address_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.location_address_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.location_address_id_seq OWNER TO postgres;

--
-- Name: location_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.location_address_id_seq OWNED BY public.location_address.id;


--
-- Name: location_district; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_district (
    id integer NOT NULL,
    location_id integer NOT NULL,
    district_id integer NOT NULL
);


ALTER TABLE public.location_district OWNER TO postgres;

--
-- Name: location_district_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.location_district_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.location_district_id_seq OWNER TO postgres;

--
-- Name: location_district_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.location_district_id_seq OWNED BY public.location_district.id;


--
-- Name: location_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.location_id_seq OWNER TO postgres;

--
-- Name: location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.location_id_seq OWNED BY public.location.id;


--
-- Name: location_postcode; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_postcode (
    id integer NOT NULL,
    location_id integer NOT NULL,
    postcode_id integer NOT NULL
);


ALTER TABLE public.location_postcode OWNER TO postgres;

--
-- Name: location_postcode_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.location_postcode_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.location_postcode_id_seq OWNER TO postgres;

--
-- Name: location_postcode_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.location_postcode_id_seq OWNED BY public.location_postcode.id;


--
-- Name: opportunity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunity (
    id integer NOT NULL,
    title character varying NOT NULL,
    type public.opportunity_type_enum NOT NULL,
    info character varying,
    translation_type public.opportunity_translation_type_enum,
    info_confidential character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deal_id integer,
    agent_id integer
);


ALTER TABLE public.opportunity OWNER TO postgres;

--
-- Name: opportunity_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.opportunity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opportunity_id_seq OWNER TO postgres;

--
-- Name: opportunity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.opportunity_id_seq OWNED BY public.opportunity.id;


--
-- Name: option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.option (
    id integer NOT NULL,
    item_type public.option_item_type_enum NOT NULL,
    item_id integer NOT NULL
);


ALTER TABLE public.option OWNER TO postgres;

--
-- Name: option_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.option_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.option_id_seq OWNER TO postgres;

--
-- Name: option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.option_id_seq OWNED BY public.option.id;


--
-- Name: organization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization (
    id integer NOT NULL,
    title character varying NOT NULL,
    email character varying,
    phone character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    address_id integer NOT NULL,
    person_id integer NOT NULL
);


ALTER TABLE public.organization OWNER TO postgres;

--
-- Name: organization_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organization_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organization_id_seq OWNER TO postgres;

--
-- Name: organization_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organization_id_seq OWNED BY public.organization.id;


--
-- Name: person; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.person (
    id integer NOT NULL,
    first_name character varying NOT NULL,
    middle_name character varying,
    last_name character varying,
    email character varying,
    phone character varying,
    avatar_url character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    address_id integer
);


ALTER TABLE public.person OWNER TO postgres;

--
-- Name: person_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.person_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.person_id_seq OWNER TO postgres;

--
-- Name: person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.person_id_seq OWNED BY public.person.id;


--
-- Name: postcode; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.postcode (
    id integer NOT NULL,
    longitude numeric(10,7),
    latitude numeric(9,7),
    value character varying NOT NULL
);


ALTER TABLE public.postcode OWNER TO postgres;

--
-- Name: postcode_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.postcode_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.postcode_id_seq OWNER TO postgres;

--
-- Name: postcode_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.postcode_id_seq OWNED BY public.postcode.id;


--
-- Name: profile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile (
    id integer NOT NULL,
    info character varying,
    category_id integer
);


ALTER TABLE public.profile OWNER TO postgres;

--
-- Name: profile_activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile_activity (
    id integer NOT NULL,
    profile_id integer NOT NULL,
    activity_id integer NOT NULL
);


ALTER TABLE public.profile_activity OWNER TO postgres;

--
-- Name: profile_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profile_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profile_activity_id_seq OWNER TO postgres;

--
-- Name: profile_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profile_activity_id_seq OWNED BY public.profile_activity.id;


--
-- Name: profile_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profile_id_seq OWNER TO postgres;

--
-- Name: profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profile_id_seq OWNED BY public.profile.id;


--
-- Name: profile_language; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile_language (
    id integer NOT NULL,
    proficiency public.profile_language_proficiency_enum DEFAULT 'advanced'::public.profile_language_proficiency_enum,
    profile_id integer NOT NULL,
    language_id integer NOT NULL
);


ALTER TABLE public.profile_language OWNER TO postgres;

--
-- Name: profile_language_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profile_language_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profile_language_id_seq OWNER TO postgres;

--
-- Name: profile_language_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profile_language_id_seq OWNED BY public.profile_language.id;


--
-- Name: profile_skill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile_skill (
    id integer NOT NULL,
    profile_id integer NOT NULL,
    skill_id integer NOT NULL
);


ALTER TABLE public.profile_skill OWNER TO postgres;

--
-- Name: profile_skill_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profile_skill_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profile_skill_id_seq OWNER TO postgres;

--
-- Name: profile_skill_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profile_skill_id_seq OWNED BY public.profile_skill.id;


--
-- Name: skill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill (
    id integer NOT NULL,
    title character varying NOT NULL
);


ALTER TABLE public.skill OWNER TO postgres;

--
-- Name: skill_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.skill_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.skill_id_seq OWNER TO postgres;

--
-- Name: skill_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.skill_id_seq OWNED BY public.skill.id;


--
-- Name: testimonial; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.testimonial (
    id integer NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    name character varying(256),
    pic character varying(256),
    person_id integer,
    language_id integer
);


ALTER TABLE public.testimonial OWNER TO postgres;

--
-- Name: testimonial_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.testimonial_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.testimonial_id_seq OWNER TO postgres;

--
-- Name: testimonial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.testimonial_id_seq OWNED BY public.testimonial.id;


--
-- Name: time; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."time" (
    id integer NOT NULL,
    info character varying
);


ALTER TABLE public."time" OWNER TO postgres;

--
-- Name: time_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.time_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_id_seq OWNER TO postgres;

--
-- Name: time_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.time_id_seq OWNED BY public."time".id;


--
-- Name: time_timeslot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.time_timeslot (
    id integer NOT NULL,
    time_id integer NOT NULL,
    timeslot_id integer NOT NULL
);


ALTER TABLE public.time_timeslot OWNER TO postgres;

--
-- Name: time_timeslot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.time_timeslot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_timeslot_id_seq OWNER TO postgres;

--
-- Name: time_timeslot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.time_timeslot_id_seq OWNED BY public.time_timeslot.id;


--
-- Name: timeline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timeline (
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
);


ALTER TABLE public.timeline OWNER TO postgres;

--
-- Name: timeline_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timeline_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timeline_id_seq OWNER TO postgres;

--
-- Name: timeline_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timeline_id_seq OWNED BY public.timeline.id;


--
-- Name: timeslot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timeslot (
    id integer NOT NULL,
    info character varying,
    rrule character varying,
    start timestamp without time zone,
    "end" timestamp without time zone,
    occasional public.timeslot_occasional_enum
);


ALTER TABLE public.timeslot OWNER TO postgres;

--
-- Name: timeslot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timeslot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timeslot_id_seq OWNER TO postgres;

--
-- Name: timeslot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timeslot_id_seq OWNED BY public.timeslot.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    role public.user_role_enum DEFAULT 'user'::public.user_role_enum NOT NULL,
    language character varying DEFAULT 'en'::character varying NOT NULL,
    timezone character varying DEFAULT 'CET'::character varying NOT NULL,
    person_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    "personId" integer
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: volunteer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.volunteer (
    id integer NOT NULL,
    info_about character varying,
    info_experience character varying,
    status public.volunteer_status_enum DEFAULT 'New'::public.volunteer_status_enum NOT NULL,
    status_engagement public.volunteer_status_engagement_enum,
    status_communication public.volunteer_status_communication_enum,
    status_appreciation public.volunteer_status_appreciation_enum,
    status_type public.volunteer_status_type_enum,
    status_match public.volunteer_status_match_enum,
    status_cgc_process public.volunteer_status_cgc_process_enum,
    status_vaccination public.volunteer_status_vaccination_enum DEFAULT 'undefined'::public.volunteer_status_vaccination_enum NOT NULL,
    status_cgc public.volunteer_status_cgc_enum DEFAULT 'undefined'::public.volunteer_status_cgc_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deal_id integer,
    person_id integer
);


ALTER TABLE public.volunteer OWNER TO postgres;

--
-- Name: volunteer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.volunteer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.volunteer_id_seq OWNER TO postgres;

--
-- Name: volunteer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.volunteer_id_seq OWNED BY public.volunteer.id;


--
-- Name: volunteer_list_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.volunteer_list_mv AS
 WITH volunteer_languages AS (
         SELECT v_1.id AS volunteer_id,
            array_agg(l.id) AS language_ids_array,
            string_agg((l.title)::text, ' '::text) AS languages_text,
            bool_or(((l.title)::text = 'German'::text)) AS has_german_language
           FROM ((((public.volunteer v_1
             LEFT JOIN public.deal d ON ((v_1.deal_id = d.id)))
             LEFT JOIN public.profile pr ON ((d.profile_id = pr.id)))
             LEFT JOIN public.profile_language pl ON ((pr.id = pl.profile_id)))
             LEFT JOIN public.language l ON ((pl.language_id = l.id)))
          GROUP BY v_1.id
        ), volunteer_skills AS (
         SELECT v_1.id AS volunteer_id,
            string_agg((s.title)::text, ' '::text) AS skills_text
           FROM ((((public.volunteer v_1
             LEFT JOIN public.deal d ON ((v_1.deal_id = d.id)))
             LEFT JOIN public.profile pr ON ((d.profile_id = pr.id)))
             LEFT JOIN public.profile_skill ps ON ((pr.id = ps.profile_id)))
             LEFT JOIN public.skill s ON ((ps.skill_id = s.id)))
          GROUP BY v_1.id
        ), volunteer_activities AS (
         SELECT v_1.id AS volunteer_id,
            string_agg((a.title)::text, ' '::text) AS activities_text
           FROM ((((public.volunteer v_1
             LEFT JOIN public.deal d ON ((v_1.deal_id = d.id)))
             LEFT JOIN public.profile pr ON ((d.profile_id = pr.id)))
             LEFT JOIN public.profile_activity pa ON ((pr.id = pa.profile_id)))
             LEFT JOIN public.activity a ON ((pa.activity_id = a.id)))
          GROUP BY v_1.id
        ), volunteer_districts AS (
         SELECT v_1.id AS volunteer_id,
            array_agg(dt.id) AS district_ids_array,
            string_agg((dt.title)::text, ' '::text) AS districts_text
           FROM (((public.volunteer v_1
             LEFT JOIN public.deal d ON ((v_1.deal_id = d.id)))
             LEFT JOIN public.location_district ld ON ((d.location_id = ld.location_id)))
             LEFT JOIN public.district dt ON ((ld.district_id = dt.id)))
          GROUP BY v_1.id
        )
 SELECT v.id AS volunteer_id,
    v.status,
    v.status_engagement,
    v.status_type AS volunteer_type,
    p.avatar_url,
    concat_ws(' '::text, NULLIF(TRIM(BOTH FROM p.first_name), ''::text), NULLIF(TRIM(BOTH FROM p.middle_name), ''::text), NULLIF(TRIM(BOTH FROM p.last_name), ''::text)) AS full_name,
    vl.language_ids_array,
    vl.has_german_language,
    vd.district_ids_array,
    to_tsvector('english'::regconfig, ((((((COALESCE(vd.districts_text, ''::text) || ' '::text) || COALESCE(vs.skills_text, ''::text)) || ' '::text) || COALESCE(va.activities_text, ''::text)) || ' '::text) || COALESCE(vl.languages_text, ''::text))) AS search_vector
   FROM (((((public.volunteer v
     JOIN public.person p ON ((v.person_id = p.id)))
     LEFT JOIN volunteer_languages vl ON ((v.id = vl.volunteer_id)))
     LEFT JOIN volunteer_skills vs ON ((v.id = vs.volunteer_id)))
     LEFT JOIN volunteer_activities va ON ((v.id = va.volunteer_id)))
     LEFT JOIN volunteer_districts vd ON ((v.id = vd.volunteer_id)))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.volunteer_list_mv OWNER TO postgres;

--
-- Name: config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.config ALTER COLUMN id SET DEFAULT nextval('public.config_id_seq'::regclass);


--
-- Name: activity id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity ALTER COLUMN id SET DEFAULT nextval('public.activity_id_seq'::regclass);


--
-- Name: address id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address ALTER COLUMN id SET DEFAULT nextval('public.address_id_seq'::regclass);


--
-- Name: agent id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent ALTER COLUMN id SET DEFAULT nextval('public.agent_id_seq'::regclass);


--
-- Name: agent_postcode id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_postcode ALTER COLUMN id SET DEFAULT nextval('public.agent_postcode_id_seq'::regclass);


--
-- Name: be_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.be_migrations ALTER COLUMN id SET DEFAULT nextval('public.be_migrations_id_seq'::regclass);


--
-- Name: category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category ALTER COLUMN id SET DEFAULT nextval('public.category_id_seq'::regclass);


--
-- Name: deal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal ALTER COLUMN id SET DEFAULT nextval('public.deal_id_seq'::regclass);


--
-- Name: district id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district ALTER COLUMN id SET DEFAULT nextval('public.district_id_seq'::regclass);


--
-- Name: district_postcode id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district_postcode ALTER COLUMN id SET DEFAULT nextval('public.district_postcode_id_seq'::regclass);


--
-- Name: event_n4d id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_n4d ALTER COLUMN id SET DEFAULT nextval('public.event_n4d_id_seq'::regclass);


--
-- Name: event_translation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_translation ALTER COLUMN id SET DEFAULT nextval('public.event_translation_id_seq'::regclass);


--
-- Name: field_translation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_translation ALTER COLUMN id SET DEFAULT nextval('public.field_translation_id_seq'::regclass);


--
-- Name: language id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.language ALTER COLUMN id SET DEFAULT nextval('public.language_id_seq'::regclass);


--
-- Name: lead_from id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_from ALTER COLUMN id SET DEFAULT nextval('public.lead_from_id_seq'::regclass);


--
-- Name: location id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location ALTER COLUMN id SET DEFAULT nextval('public.location_id_seq'::regclass);


--
-- Name: location_address id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_address ALTER COLUMN id SET DEFAULT nextval('public.location_address_id_seq'::regclass);


--
-- Name: location_district id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_district ALTER COLUMN id SET DEFAULT nextval('public.location_district_id_seq'::regclass);


--
-- Name: location_postcode id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_postcode ALTER COLUMN id SET DEFAULT nextval('public.location_postcode_id_seq'::regclass);


--
-- Name: opportunity id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity ALTER COLUMN id SET DEFAULT nextval('public.opportunity_id_seq'::regclass);


--
-- Name: option id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.option ALTER COLUMN id SET DEFAULT nextval('public.option_id_seq'::regclass);


--
-- Name: organization id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization ALTER COLUMN id SET DEFAULT nextval('public.organization_id_seq'::regclass);


--
-- Name: person id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person ALTER COLUMN id SET DEFAULT nextval('public.person_id_seq'::regclass);


--
-- Name: postcode id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postcode ALTER COLUMN id SET DEFAULT nextval('public.postcode_id_seq'::regclass);


--
-- Name: profile id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile ALTER COLUMN id SET DEFAULT nextval('public.profile_id_seq'::regclass);


--
-- Name: profile_activity id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_activity ALTER COLUMN id SET DEFAULT nextval('public.profile_activity_id_seq'::regclass);


--
-- Name: profile_language id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_language ALTER COLUMN id SET DEFAULT nextval('public.profile_language_id_seq'::regclass);


--
-- Name: profile_skill id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_skill ALTER COLUMN id SET DEFAULT nextval('public.profile_skill_id_seq'::regclass);


--
-- Name: skill id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill ALTER COLUMN id SET DEFAULT nextval('public.skill_id_seq'::regclass);


--
-- Name: testimonial id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testimonial ALTER COLUMN id SET DEFAULT nextval('public.testimonial_id_seq'::regclass);


--
-- Name: time id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."time" ALTER COLUMN id SET DEFAULT nextval('public.time_id_seq'::regclass);


--
-- Name: time_timeslot id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_timeslot ALTER COLUMN id SET DEFAULT nextval('public.time_timeslot_id_seq'::regclass);


--
-- Name: timeline id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timeline ALTER COLUMN id SET DEFAULT nextval('public.timeline_id_seq'::regclass);


--
-- Name: timeslot id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timeslot ALTER COLUMN id SET DEFAULT nextval('public.timeslot_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: volunteer id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.volunteer ALTER COLUMN id SET DEFAULT nextval('public.volunteer_id_seq'::regclass);


--
-- Name: opportunity PK_085fd6d6f4765325e6c16163568; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity
    ADD CONSTRAINT "PK_085fd6d6f4765325e6c16163568" PRIMARY KEY (id);


--
-- Name: district_postcode PK_0e1774a1cd62d250b9564ab0904; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district_postcode
    ADD CONSTRAINT "PK_0e1774a1cd62d250b9564ab0904" PRIMARY KEY (id);


--
-- Name: agent PK_1000e989398c5d4ed585cf9a46f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT "PK_1000e989398c5d4ed585cf9a46f" PRIMARY KEY (id);


--
-- Name: activity PK_24625a1d6b1b089c8ae206fe467; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT "PK_24625a1d6b1b089c8ae206fe467" PRIMARY KEY (id);


--
-- Name: profile PK_3dd8bfc97e4a77c70971591bdcb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY (id);


--
-- Name: organization PK_472c1f99a32def1b0abb219cd67; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY (id);


--
-- Name: location_postcode PK_5b564ff03a6b7e9427cc3b6c5f0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_postcode
    ADD CONSTRAINT "PK_5b564ff03a6b7e9427cc3b6c5f0" PRIMARY KEY (id);


--
-- Name: time_timeslot PK_5b5d0d8fb34e9de7849a058ad08; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_timeslot
    ADD CONSTRAINT "PK_5b5d0d8fb34e9de7849a058ad08" PRIMARY KEY (id);


--
-- Name: person PK_5fdaf670315c4b7e70cce85daa3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT "PK_5fdaf670315c4b7e70cce85daa3" PRIMARY KEY (id);


--
-- Name: lead_from PK_62c40760ad8725f93fa01345855; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_from
    ADD CONSTRAINT "PK_62c40760ad8725f93fa01345855" PRIMARY KEY (id);


--
-- Name: volunteer PK_76924da1998b3e07025e04c4d3c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.volunteer
    ADD CONSTRAINT "PK_76924da1998b3e07025e04c4d3c" PRIMARY KEY (id);


--
-- Name: profile_skill PK_7703bcb3f88131f9b11bfee8554; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_skill
    ADD CONSTRAINT "PK_7703bcb3f88131f9b11bfee8554" PRIMARY KEY (id);


--
-- Name: agent_postcode PK_790c4a8ac360683061758eea4fb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_postcode
    ADD CONSTRAINT "PK_790c4a8ac360683061758eea4fb" PRIMARY KEY (id);


--
-- Name: location_district PK_828664dee332d2dc0499a1bd5e2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_district
    ADD CONSTRAINT "PK_828664dee332d2dc0499a1bd5e2" PRIMARY KEY (id);


--
-- Name: profile_activity PK_8433b160087402e98a26f61c1b8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_activity
    ADD CONSTRAINT "PK_8433b160087402e98a26f61c1b8" PRIMARY KEY (id);


--
-- Name: location PK_876d7bdba03c72251ec4c2dc827; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT "PK_876d7bdba03c72251ec4c2dc827" PRIMARY KEY (id);


--
-- Name: field_translation PK_9159080b83585be7c50d6a9883e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_translation
    ADD CONSTRAINT "PK_9159080b83585be7c50d6a9883e" PRIMARY KEY (id);


--
-- Name: category PK_9c4e4a89e3674fc9f382d733f03; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY (id);


--
-- Name: deal PK_9ce1c24acace60f6d7dc7a7189e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal
    ADD CONSTRAINT "PK_9ce1c24acace60f6d7dc7a7189e" PRIMARY KEY (id);


--
-- Name: time PK_9ec81ea937e5d405c33a9f49251; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."time"
    ADD CONSTRAINT "PK_9ec81ea937e5d405c33a9f49251" PRIMARY KEY (id);


--
-- Name: skill PK_a0d33334424e64fb78dc3ce7196; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "PK_a0d33334424e64fb78dc3ce7196" PRIMARY KEY (id);


--
-- Name: profile_language PK_a5e5b2402dffa65cf72af5925d1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_language
    ADD CONSTRAINT "PK_a5e5b2402dffa65cf72af5925d1" PRIMARY KEY (id);


--
-- Name: location_address PK_bf1188fd425a5c4f19d6fa22c2e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_address
    ADD CONSTRAINT "PK_bf1188fd425a5c4f19d6fa22c2e" PRIMARY KEY (id);


--
-- Name: postcode PK_c19bc9f774c1cf019766a35ca4d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postcode
    ADD CONSTRAINT "PK_c19bc9f774c1cf019766a35ca4d" PRIMARY KEY (id);


--
-- Name: user PK_cace4a159ff9f2512dd42373760; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY (id);


--
-- Name: language PK_cc0a99e710eb3733f6fb42b1d4c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.language
    ADD CONSTRAINT "PK_cc0a99e710eb3733f6fb42b1d4c" PRIMARY KEY (id);


--
-- Name: timeslot PK_cd8bca557ee1eb5b090b9e63009; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timeslot
    ADD CONSTRAINT "PK_cd8bca557ee1eb5b090b9e63009" PRIMARY KEY (id);


--
-- Name: event_translation PK_d5739128be79554fecf75dca107; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_translation
    ADD CONSTRAINT "PK_d5739128be79554fecf75dca107" PRIMARY KEY (id);


--
-- Name: address PK_d92de1f82754668b5f5f5dd4fd5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT "PK_d92de1f82754668b5f5f5dd4fd5" PRIMARY KEY (id);


--
-- Name: be_migrations PK_db17e716f95ad729756da284318; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.be_migrations
    ADD CONSTRAINT "PK_db17e716f95ad729756da284318" PRIMARY KEY (id);


--
-- Name: event_n4d PK_e0df3ada625ad10e0b3fbeaec47; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_n4d
    ADD CONSTRAINT "PK_e0df3ada625ad10e0b3fbeaec47" PRIMARY KEY (id);


--
-- Name: testimonial PK_e1aee1c726db2d336480c69f7cb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testimonial
    ADD CONSTRAINT "PK_e1aee1c726db2d336480c69f7cb" PRIMARY KEY (id);


--
-- Name: option PK_e6090c1c6ad8962eea97abdbe63; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.option
    ADD CONSTRAINT "PK_e6090c1c6ad8962eea97abdbe63" PRIMARY KEY (id);


--
-- Name: district PK_ee5cb6fd5223164bb87ea693f1e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district
    ADD CONSTRAINT "PK_ee5cb6fd5223164bb87ea693f1e" PRIMARY KEY (id);


--
-- Name: timeline PK_f841188896cefd9277904ec40b9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timeline
    ADD CONSTRAINT "PK_f841188896cefd9277904ec40b9" PRIMARY KEY (id);


--
-- Name: skill UQ_5b1131c92af934e7c2a1322ec87; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "UQ_5b1131c92af934e7c2a1322ec87" UNIQUE (title);


--
-- Name: category UQ_9f16dbbf263b0af0f03637fa7b5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT "UQ_9f16dbbf263b0af0f03637fa7b5" UNIQUE (title);


--
-- Name: activity UQ_a28a1682ea80f10d1ecc7babaa0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT "UQ_a28a1682ea80f10d1ecc7babaa0" UNIQUE (title);


--
-- Name: organization UQ_a7c11b94f5aaa12289f67de3f8f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT "UQ_a7c11b94f5aaa12289f67de3f8f" UNIQUE (title);


--
-- Name: agent UQ_c13f74bf3e3d5e4fedf63231881; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT "UQ_c13f74bf3e3d5e4fedf63231881" UNIQUE (title);


--
-- Name: address UQ_dc72f107eef6108d4163fae4cd2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT "UQ_dc72f107eef6108d4163fae4cd2" UNIQUE (title);


--
-- Name: user UQ_e12875dfb3b1d92d7d7c5377e22; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE (email);


--
-- Name: IDX_68fcd3be0d9a16a5b6c8371133; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_68fcd3be0d9a16a5b6c8371133" ON public.timeline USING btree (target_entity_type, target_entity_id, "timestamp");


--
-- Name: IDX_cd9cbf582b713498a61c626c2d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_cd9cbf582b713498a61c626c2d" ON public.field_translation USING btree (language_id, entity_type, entity_id, field_name);


--
-- Name: profile_skill FK_0010601b9bf612cda40aae1ed5f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_skill
    ADD CONSTRAINT "FK_0010601b9bf612cda40aae1ed5f" FOREIGN KEY (skill_id) REFERENCES public.skill(id) ON DELETE CASCADE;


--
-- Name: event_n4d FK_019ed6de3369ed99b82ebf1b85c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_n4d
    ADD CONSTRAINT "FK_019ed6de3369ed99b82ebf1b85c" FOREIGN KEY (language_id) REFERENCES public.language(id);


--
-- Name: agent_postcode FK_0c0882d8ac7a24eec11d7bff144; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_postcode
    ADD CONSTRAINT "FK_0c0882d8ac7a24eec11d7bff144" FOREIGN KEY (agent_id) REFERENCES public.agent(id) ON DELETE CASCADE;


--
-- Name: organization FK_0f31fe3925535afb5462326d7d6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT "FK_0f31fe3925535afb5462326d7d6" FOREIGN KEY (address_id) REFERENCES public.address(id) ON DELETE CASCADE;


--
-- Name: event_translation FK_10fabc95d13968a570404f5c516; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_translation
    ADD CONSTRAINT "FK_10fabc95d13968a570404f5c516" FOREIGN KEY (language_id) REFERENCES public.language(id);


--
-- Name: location_district FK_1c289fab06d04d9bbff9d6d0028; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_district
    ADD CONSTRAINT "FK_1c289fab06d04d9bbff9d6d0028" FOREIGN KEY (location_id) REFERENCES public.location(id) ON DELETE CASCADE;


--
-- Name: profile_language FK_2115a7ecd80ab0e1c36565f87fd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_language
    ADD CONSTRAINT "FK_2115a7ecd80ab0e1c36565f87fd" FOREIGN KEY (profile_id) REFERENCES public.profile(id) ON DELETE CASCADE;


--
-- Name: profile_activity FK_24c6818a8464f28891481760531; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_activity
    ADD CONSTRAINT "FK_24c6818a8464f28891481760531" FOREIGN KEY (profile_id) REFERENCES public.profile(id) ON DELETE CASCADE;


--
-- Name: location_address FK_3191fd40b5538e1e5c3857042f2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_address
    ADD CONSTRAINT "FK_3191fd40b5538e1e5c3857042f2" FOREIGN KEY (location_id) REFERENCES public.location(id) ON DELETE CASCADE;


--
-- Name: event_translation FK_42df355dff4a2dd4edeb6f9fc66; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_translation
    ADD CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66" FOREIGN KEY (eventn4d_id) REFERENCES public.event_n4d(id);


--
-- Name: time_timeslot FK_42f12245378cdfc151d3af2189d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_timeslot
    ADD CONSTRAINT "FK_42f12245378cdfc151d3af2189d" FOREIGN KEY (time_id) REFERENCES public."time"(id) ON DELETE CASCADE;


--
-- Name: time_timeslot FK_44cb00266b6e97b935c34c50686; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_timeslot
    ADD CONSTRAINT "FK_44cb00266b6e97b935c34c50686" FOREIGN KEY (timeslot_id) REFERENCES public.timeslot(id) ON DELETE CASCADE;


--
-- Name: profile FK_49ea3bc2c466d5b457352c8a9b1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT "FK_49ea3bc2c466d5b457352c8a9b1" FOREIGN KEY (category_id) REFERENCES public.category(id);


--
-- Name: volunteer FK_4b1093af5610c75cfca53546c0d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.volunteer
    ADD CONSTRAINT "FK_4b1093af5610c75cfca53546c0d" FOREIGN KEY (deal_id) REFERENCES public.deal(id);


--
-- Name: activity FK_5d3d888450207667a286922f945; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT "FK_5d3d888450207667a286922f945" FOREIGN KEY (category_id) REFERENCES public.category(id);


--
-- Name: opportunity FK_62f9c6aaa610596f0d5f972e962; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity
    ADD CONSTRAINT "FK_62f9c6aaa610596f0d5f972e962" FOREIGN KEY (deal_id) REFERENCES public.deal(id);


--
-- Name: user FK_6aac19005cea8e2119cbe7759e8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "FK_6aac19005cea8e2119cbe7759e8" FOREIGN KEY ("personId") REFERENCES public.person(id);


--
-- Name: location_postcode FK_6c2e2c49c9b9e2647a76dce1538; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_postcode
    ADD CONSTRAINT "FK_6c2e2c49c9b9e2647a76dce1538" FOREIGN KEY (location_id) REFERENCES public.location(id) ON DELETE CASCADE;


--
-- Name: location_district FK_721d5d8783c928890db616cfbe7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_district
    ADD CONSTRAINT "FK_721d5d8783c928890db616cfbe7" FOREIGN KEY (district_id) REFERENCES public.district(id) ON DELETE CASCADE;


--
-- Name: opportunity FK_72b2a2637cc12f5d5b71bb3236e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity
    ADD CONSTRAINT "FK_72b2a2637cc12f5d5b71bb3236e" FOREIGN KEY (agent_id) REFERENCES public.agent(id);


--
-- Name: agent FK_790c4a8ac360683061758eea4fb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT "FK_790c4a8ac360683061758eea4fb" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id);


--
-- Name: district_postcode FK_7b72f500f43de90b1a7d6e60ead; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district_postcode
    ADD CONSTRAINT "FK_7b72f500f43de90b1a7d6e60ead" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE CASCADE;


--
-- Name: location_postcode FK_8008547ccf8fed17a64fd13d3a8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_postcode
    ADD CONSTRAINT "FK_8008547ccf8fed17a64fd13d3a8" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE CASCADE;


--
-- Name: field_translation FK_804ca3b0c276af3e8b593664f06; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_translation
    ADD CONSTRAINT "FK_804ca3b0c276af3e8b593664f06" FOREIGN KEY (language_id) REFERENCES public.language(id) ON DELETE CASCADE;


--
-- Name: profile_activity FK_850d7554542cf85eee1f9aee1fa; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_activity
    ADD CONSTRAINT "FK_850d7554542cf85eee1f9aee1fa" FOREIGN KEY (activity_id) REFERENCES public.activity(id) ON DELETE CASCADE;


--
-- Name: profile_language FK_9b9cfa82b0245720d200c4b3bb5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_language
    ADD CONSTRAINT "FK_9b9cfa82b0245720d200c4b3bb5" FOREIGN KEY (language_id) REFERENCES public.language(id) ON DELETE CASCADE;


--
-- Name: deal FK_9f36d6cf04687b811690d82a3c1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal
    ADD CONSTRAINT "FK_9f36d6cf04687b811690d82a3c1" FOREIGN KEY (profile_id) REFERENCES public.profile(id) ON DELETE CASCADE;


--
-- Name: deal FK_b709f61f789979d2087bfc41768; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal
    ADD CONSTRAINT "FK_b709f61f789979d2087bfc41768" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE CASCADE;


--
-- Name: location_address FK_bdd8e88dbc7fe1ad3f6b1f949c9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_address
    ADD CONSTRAINT "FK_bdd8e88dbc7fe1ad3f6b1f949c9" FOREIGN KEY (address_id) REFERENCES public.address(id) ON DELETE CASCADE;


--
-- Name: testimonial FK_c6bdc688fecc9e338d0c4018c4c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testimonial
    ADD CONSTRAINT "FK_c6bdc688fecc9e338d0c4018c4c" FOREIGN KEY (language_id) REFERENCES public.language(id);


--
-- Name: person FK_cd587348ca3fec07931de208299; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT "FK_cd587348ca3fec07931de208299" FOREIGN KEY (address_id) REFERENCES public.address(id) ON DELETE CASCADE;


--
-- Name: deal FK_cefd2ee093f33d43794ebf5ed07; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal
    ADD CONSTRAINT "FK_cefd2ee093f33d43794ebf5ed07" FOREIGN KEY (time_id) REFERENCES public."time"(id) ON DELETE CASCADE;


--
-- Name: district_postcode FK_d3b662cb01cdb6f22c7097e0b33; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district_postcode
    ADD CONSTRAINT "FK_d3b662cb01cdb6f22c7097e0b33" FOREIGN KEY (district_id) REFERENCES public.district(id) ON DELETE CASCADE;


--
-- Name: agent FK_d78c87230af992a1bf93c5b93ae; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT "FK_d78c87230af992a1bf93c5b93ae" FOREIGN KEY (person_id) REFERENCES public.person(id);


--
-- Name: profile_skill FK_dc3b7860ffbacd6dfcffbae9b06; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_skill
    ADD CONSTRAINT "FK_dc3b7860ffbacd6dfcffbae9b06" FOREIGN KEY (profile_id) REFERENCES public.profile(id) ON DELETE CASCADE;


--
-- Name: address FK_e1d98846fd3dcdea8e3f267e7eb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT "FK_e1d98846fd3dcdea8e3f267e7eb" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE CASCADE;


--
-- Name: organization FK_e94553ff34338a3882ed305a74d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT "FK_e94553ff34338a3882ed305a74d" FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE;


--
-- Name: agent_postcode FK_ec2a5aa17ef1f489815ee8cefdf; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_postcode
    ADD CONSTRAINT "FK_ec2a5aa17ef1f489815ee8cefdf" FOREIGN KEY (postcode_id) REFERENCES public.postcode(id) ON DELETE CASCADE;


--
-- Name: deal FK_f5c86a234c167277fb5c18518b9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal
    ADD CONSTRAINT "FK_f5c86a234c167277fb5c18518b9" FOREIGN KEY (location_id) REFERENCES public.location(id) ON DELETE CASCADE;


--
-- Name: testimonial FK_f7086d54eec10b450adee1be7b9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testimonial
    ADD CONSTRAINT "FK_f7086d54eec10b450adee1be7b9" FOREIGN KEY (person_id) REFERENCES public.person(id);


--
-- Name: volunteer FK_fc40d3eada517c3c9315e0c9e51; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.volunteer
    ADD CONSTRAINT "FK_fc40d3eada517c3c9315e0c9e51" FOREIGN KEY (person_id) REFERENCES public.person(id);


--
-- PostgreSQL database dump complete
--

