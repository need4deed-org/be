--
-- PostgreSQL database dump
--

\restrict NgqAT9RvApvzbsLKRpv63QpKeJq6zWVQZdxdxWH1l5LJvb2ktMwKB6cT8tUX7J1

-- Dumped from database version 17.2 (Debian 17.2-1.pgdg120+1)
-- Dumped by pg_dump version 18.0 (Ubuntu 18.0-1.pgdg24.04+3)

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
    'pending-match',
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
    'event',
    'festival',
    'weekend-only'
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
-- Data for Name: activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity (id, title, category_id) FROM stdin;
1	Daycare	2
2	Sports	5
3	Language café	1
4	Translation	1
5	Fillout German forms	1
6	Arts	2
7	Gardening	3
8	One-day	4
9	Playing	2
10	Reading	1
11	Activities-women	3
12	Activities-men	3
13	Tutoring	1
14	Clothing Sorting	3
15	Excursions	5
16	Miscellaneous	3
17	Mentorship	3
18	Accompanying to government appointments	6
19	Apartment viewing accompanying	6
20	Schools meetings accompanying	6
21	Accompanying	6
22	Accompanying to doctors'	6
\.


--
-- Data for Name: address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address (id, title, street, postcode_id) FROM stdin;
1	Dummy	\N	1
2	\N		1
3	\N		1
4	\N		1
5	\N		1
6	\N		1
7	\N		1
8	\N		1
9	\N		1
10	\N		1
11	\N		1
12	\N		1
13	\N		1
14	\N		1
15	\N		1
16	\N		1
17	\N		1
18	\N		1
19	\N		1
20	\N		1
21	\N		1
22	\N		1
23	\N		1
24	\N		1
25	\N		1
26	\N		1
27	\N		1
28	\N		1
29	\N		1
30	\N		1
31	\N		1
32	\N		1
33	\N		1
34	\N		1
35	\N		1
36	\N		1
37	\N		1
38	\N		1
39	\N		1
40	\N		1
41	\N		1
42	\N		1
43	\N		1
44	\N		1
45	\N		1
46	\N		1
47	\N		1
48	\N		1
49	\N		1
50	\N		1
51	\N		1
52	\N		1
53	\N		1
54	\N		1
55	\N		1
56	\N		1
57	\N		1
58	\N		1
59	\N		1
60	\N		1
61	\N		1
62	\N		1
63	\N		1
64	\N		1
65	\N		1
66	\N		1
67	\N		1
68	\N		1
69	\N		1
70	\N		1
71	\N		1
72	\N		1
73	\N		1
74	\N		1
75	\N		1
76	\N		1
77	\N		1
78	\N		1
79	\N		1
80	\N		1
81	\N		1
82	\N		1
83	\N		1
84	\N		1
85	\N		1
86	\N		1
87	\N		1
88	\N		1
89	\N		1
90	\N		1
91	\N		1
92	\N		1
93	\N		1
94	\N		1
95	\N		1
96	\N		1
97	\N		1
98	\N		1
99	\N		1
100	\N		1
101	\N		1
102	\N		1
103	\N		1
104	\N		1
105	\N		1
106	\N		1
107	\N		1
108	\N		1
109	\N		1
110	\N		1
111	\N		1
112	\N		1
113	\N		1
114	\N		1
115	\N		1
116	\N		1
117	\N		1
118	\N		1
119	\N		1
120	\N		1
121	\N		1
122	\N		1
123	\N		1
124	\N		1
125	\N		1
126	\N		1
127	\N		1
128	\N		1
129	\N		1
130	\N		1
131	\N		1
132	\N		1
133	\N		1
134	\N		1
135	\N		1
136	\N		1
137	\N		1
138	\N		1
139	\N		1
140	\N		1
141	\N		1
142	\N		1
143	\N		1
144	\N		1
145	\N		1
146	\N		1
147	\N		1
148	\N		1
149	\N		1
150	\N		1
151	\N		1
152	\N		1
153	\N		1
154	\N		1
155	\N		1
156	\N		1
157	\N		1
158	\N		1
159	\N		1
160	\N		1
161	\N		1
162	\N		1
163	\N		1
164	\N		1
165	\N		1
166	\N		1
168	\N		1
167	\N		1
169	\N		1
170	\N		1
171	\N		1
172	\N		1
173	\N		1
174	\N		1
175	\N		1
176	\N		1
177	\N		1
178	\N		1
179	\N		1
180	\N		1
181	\N		1
182	\N		1
183	\N		1
184	\N		1
185	\N		1
188	\N		1
196	\N		1
204	\N		1
212	\N		1
219	\N		1
228	\N		1
235	\N		1
243	\N		1
251	\N		1
258	\N		1
267	\N		1
275	\N		1
282	\N		1
291	\N		1
299	\N		1
309	\N		1
314	\N		60
323	\N		164
329	\N		18
339	\N		9
349	\N		177
356	\N		57
366	\N		26
375	\N		98
384	\N		55
393	\N		66
402	\N		28
411	\N		57
420	\N		65
428	\N		108
437	\N		50
445	\N		130
454	\N		127
462	\N		1
471	\N		55
478	\N		74
486	\N		186
493	\N		62
502	\N		95
509	\N		66
519	\N		16
534	\N		126
186	\N		1
202	\N		1
214	\N		1
226	\N		1
239	\N		1
255	\N		1
265	\N		1
278	\N		1
288	\N		1
302	\N		1
321	\N		139
333	\N		141
347	\N		189
361	\N		1
376	\N		60
385	\N		59
394	\N		6
405	\N		139
415	\N		67
430	\N		101
439	\N		94
452	\N		168
466	\N		26
482	\N		69
495	\N		142
504	\N		114
512	\N		10
520	\N		1
189	\N		1
190	\N		1
191	\N		1
192	\N		1
193	\N		1
194	\N		1
197	\N		1
198	\N		1
199	\N		1
200	\N		1
201	\N		1
205	\N		1
206	\N		1
207	\N		1
208	\N		1
209	\N		1
210	\N		1
213	\N		1
215	\N		1
216	\N		1
217	\N		1
220	\N		1
221	\N		1
222	\N		1
223	\N		1
224	\N		1
225	\N		1
229	\N		1
230	\N		1
231	\N		1
232	\N		1
233	\N		1
236	\N		1
237	\N		1
238	\N		1
240	\N		1
241	\N		1
244	\N		1
245	\N		1
246	\N		1
247	\N		1
248	\N		1
249	\N		1
252	\N		1
253	\N		1
254	\N		1
256	\N		1
259	\N		1
260	\N		1
261	\N		1
262	\N		1
263	\N		1
264	\N		1
268	\N		1
269	\N		1
270	\N		1
271	\N		1
272	\N		1
273	\N		1
276	\N		1
277	\N		1
279	\N		1
280	\N		1
283	\N		1
284	\N		1
285	\N		1
286	\N		1
287	\N		1
289	\N		1
292	\N		1
293	\N		1
294	\N		1
295	\N		1
296	\N		1
297	\N		1
300	\N		1
301	\N		1
303	\N		1
304	\N		1
305	\N		1
306	\N		1
307	\N		1
310	\N		1
311	\N		8
312	\N		60
315	\N		1
316	\N		65
317	\N		4
318	\N		11
319	\N		28
320	\N		153
324	\N		164
325	\N		64
326	\N		143
327	\N		1
330	\N		52
331	\N		110
332	\N		147
334	\N		27
335	\N		36
336	\N		51
337	\N		85
340	\N		144
341	\N		162
342	\N		44
343	\N		10
344	\N		189
345	\N		192
346	\N		11
350	\N		23
351	\N		116
352	\N		52
353	\N		56
354	\N		144
357	\N		24
358	\N		23
359	\N		154
360	\N		148
362	\N		1
363	\N		6
364	\N		62
367	\N		19
368	\N		185
369	\N		60
370	\N		129
371	\N		178
372	\N		59
373	\N		26
377	\N		59
378	\N		43
379	\N		7
380	\N		23
381	\N		59
382	\N		58
386	\N		81
387	\N		5
388	\N		9
389	\N		59
390	\N		8
391	\N		77
395	\N		23
396	\N		64
397	\N		63
398	\N		63
399	\N		143
400	\N		57
403	\N		6
404	\N		101
406	\N		179
407	\N		127
408	\N		60
409	\N		18
412	\N		76
413	\N		108
414	\N		141
416	\N		32
417	\N		120
418	\N		50
421	\N		1
422	\N		147
423	\N		50
424	\N		183
425	\N		117
426	\N		9
429	\N		46
431	\N		65
432	\N		1
433	\N		27
434	\N		54
435	\N		53
438	\N		65
440	\N		44
441	\N		189
442	\N		76
443	\N		65
446	\N		46
447	\N		50
448	\N		47
449	\N		9
450	\N		146
451	\N		23
455	\N		49
456	\N		6
457	\N		39
458	\N		144
187	\N		1
195	\N		1
203	\N		1
211	\N		1
218	\N		1
227	\N		1
234	\N		1
242	\N		1
250	\N		1
257	\N		1
266	\N		1
274	\N		1
281	\N		1
290	\N		1
298	\N		1
308	\N		1
313	\N		64
322	\N		113
328	\N		172
338	\N		90
348	\N		8
355	\N		163
365	\N		11
374	\N		58
383	\N		8
392	\N		2
401	\N		131
410	\N		9
419	\N		6
427	\N		45
436	\N		104
444	\N		62
453	\N		7
461	\N		62
470	\N		18
477	\N		8
485	\N		62
492	\N		8
501	\N		140
508	\N		128
518	\N		103
523	\N		99
527	\N		65
459	\N		69
467	\N		6
475	\N		147
483	\N		8
491	\N		20
496	\N		141
505	\N		22
513	\N		54
522	\N		145
460	\N		53
468	\N		29
479	\N		141
489	\N		151
498	\N		143
510	\N		101
521	\N		21
524	\N		102
463	\N		27
472	\N		54
481	\N		103
494	\N		59
507	\N		115
515	\N		144
525	\N		4
530	\N		11
464	\N		190
473	\N		6
480	\N		139
488	\N		2
497	\N		54
506	\N		86
514	\N		61
532	\N		9
465	\N		60
476	\N		43
490	\N		6
503	\N		2
516	\N		189
528	\N		125
535	\N		121
536	\N		31
537	\N		122
538	\N		15
539	\N		149
540	\N		160
541	\N		182
542	\N		106
543	\N		170
544	\N		100
545	\N		111
546	\N		132
547	\N		17
548	\N		89
549	\N		68
469	\N		7
484	\N		133
500	\N		81
517	\N		71
531	\N		102
533	\N		107
474	\N		51
487	\N		105
499	\N		64
511	\N		29
526	\N		60
529	\N		24
\.


--
-- Data for Name: agent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agent (id, title, type, operator_type, operator_id, person_id, postcode_id) FROM stdin;
1	Schwalbenweg	RAC	organization	1	535	107
2	Gehrenseestr.	RAC	organization	2	536	126
3	Seehausener Str.	RAC	organization	3	537	128
4	Refugium Lichtenberg	RAC	organization	4	538	11
5	Dingolfinger Str.	RAC	organization	5	539	121
6	Hotel Plaza Inn	RAC	organization	6	540	31
7	Storkower Straße 160 	RAC	organization	7	541	19
8	Alt-Moabit	RAC	organization	8	542	26
9	Columbiadamm 84	RAC	organization	9	543	56
10	Blumberger Damm	RAC	organization	10	544	122
11	Niedstr.	RAC	organization	11	545	77
12	Bornitzstraße	RAC	organization	12	546	15
13	noname alexandra.schafflhuber@elkb.de	RAC	organization	13	547	1
14	Chris-Gueffroy-Allee	RAC	organization	14	548	102
15	Haus Leo	RAC	organization	15	549	27
16	Kablower Weg	RAC	organization	16	550	107
17	Degnerstr.	RAC	organization	17	551	126
18	Kurt-Schumacher-Damm	RAC	organization	18	552	149
19	Landsberger Allee	RAC	organization	19	3	1
20	Murtzaner Ring	RAC	organization	20	3	1
21	Stallschreiberstr.	RAC	organization	21	553	58
22	Radickestr.	RAC	organization	22	554	105
23	Bernauer Str.	RAC	organization	23	555	160
24	Hangar 1-3	RAC	organization	24	556	71
25	Am Beelitzhof	RAC	organization	25	557	182
26	Konrad-Wolf-Str.	RAC	organization	26	558	127
27	noname beeke.wattenberg@xenion.org	RAC	organization	27	559	56
28	Rahnsdorf	RAC	organization	28	560	130
29	noname benn-mierendorffinsel@mts-socialdesign.com	RAC	organization	29	561	31
30	Chaussee Str.	RAC	organization	30	562	146
31	noname Liudmila.avdonina@jao-berlin.de	RAC	organization	31	563	106
32	Freiheit	RAC	organization	32	564	170
33	Refugium Hausvaterweg	RAC	organization	33	565	128
34	noname mentoren@xenion.org	RAC	organization	34	566	57
35	Trachenbergring	RAC	organization	35	3	1
36	Osteweg	RAC	organization	36	567	185
37	noname info@benn-altglienicke.de	RAC	organization	37	568	106
38	noname au@schoeneberg-hilft.de	RAC	organization	38	569	53
39	Buschkrugallee	RAC	organization	39	570	100
40	Storkower Straße 118	RAC	organization	40	571	19
41	Salvador-Allende-Str.	RAC	organization	41	572	111
42	noname tuemptner@reinhold-burger-schule.de	RAC	organization	42	573	139
43	Bühringstraße	RAC	organization	43	574	132
44	noname sozialdienst.dingolfinger@drk-mueggelspree.de	RAC	organization	44	575	121
45	noname social@cityeleven.de	RAC	organization	45	564	170
46	Invalidenstraße	RAC	organization	46	576	2
47	Max-Brunnow-Straße	RAC	organization	47	577	17
48	noname battiati@drk-mueggelspree.de	RAC	organization	48	578	107
49	noname l.mcghie@sin-ev.de	RAC	organization	49	545	77
50	noname sozialearbeit118a@stk118.de	RAC	organization	50	579	19
51	noname marie.willeke@bzsl.de	RAC	organization	51	560	130
52	noname contact@cityeleven.de	RAC	organization	52	580	170
53	Wotanstraße	RAC	organization	53	581	15
54	Straßburger Straße	RAC	organization	54	582	18
55	noname contact@need4deed.org	RAC	organization	55	583	66
56	Brabanter Str. GU3	RAC	organization	56	3	1
57	Soorstraße	RAC	organization	57	3	1
58	Refugium Hohentwielsteig	RAC	organization	58	584	183
59	Marienfelder Allee	RAC	organization	59	585	89
60	Karl-Marx-Str.	RAC	organization	60	586	68
61	Colditzstraße	RAC	organization	61	587	19
62	Töpchiner Weg	RAC	organization	62	588	95
63	Kiefholzstraße 71	RAC	organization	63	3	1
64	noname	RAC	organization	64	3	1
65	noname begleitung@example.com	RAC	organization	65	589	5
66	Kiefholzstr. 36 	RAC	organization	66	590	101
67	Ankunftszentrum Tegel	RAC	organization	67	591	27
68	noname Sven.Clausen@ib.de	RAC	organization	68	592	100
69	noname betreuung-ksd@eu-homecare.com	RAC	organization	69	593	149
70	noname mehri.mohammadzadeh@ib.de	RAC	organization	70	594	55
71	noname fadare@drk-mueggelspree.de	RAC	organization	71	595	121
72	noname kagirov@berliner-stadtmission.de	RAC	organization	72	596	111
73	noname info@kieztandem.de	RAC	organization	73	597	110
74	Rudolf-Leonhard-Str.	RAC	organization	74	3	1
75	Luckenwalder Straße	RAC	organization	75	3	1
76	noname termine-hk@berliner-stadtmission.de	RAC	organization	76	598	7
77	Maxie-Wander-Str.	RAC	organization	77	3	1
78	Haus Kopernikus	RAC	organization	78	3	1
79	Alfred-Randt-Straße	RAC	organization	79	549	111
80	Fritz-Wildung-Straße	RAC	organization	80	3	1
81	Am Oberhafen	RAC	organization	81	599	170
82	Haarlemer Str.	RAC	organization	82	600	100
83	Buchholzer Str.	RAC	organization	83	3	1
84	Quittenweg	RAC	organization	84	3	1
85	Grünauer Straße	RAC	organization	85	3	1
86	Siverstorpstraße	RAC	organization	86	3	1
87	Hagenower Ring	RAC	organization	87	3	1
88	Albert-Kuntz-Str.	RAC	organization	88	3	1
89	Bitterfelder Str.	RAC	organization	89	3	1
\.


--
-- Data for Name: agent_postcode; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agent_postcode (id, agent_id, postcode_id) FROM stdin;
\.


--
-- Data for Name: category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.category (id, title) FROM stdin;
1	de-lng-support
2	child-care
3	skills-based
4	events
5	sport-activities
6	accompanying
\.


--
-- Data for Name: deal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deal (id, type, postcode_id, time_id, location_id, profile_id) FROM stdin;
1	volunteer	1	1	1	1
2	volunteer	1	2	2	3
3	volunteer	1	3	3	5
4	volunteer	1	5	5	309
5	volunteer	1	7	7	312
6	volunteer	1	6	6	311
7	volunteer	1	9	9	317
8	volunteer	1	10	10	4
9	volunteer	1	4	4	209
10	volunteer	1	12	11	282
11	volunteer	1	35	34	315
12	volunteer	1	28	27	194
13	volunteer	1	29	28	183
14	volunteer	1	33	32	307
15	opportunity	105	11	22	6
16	volunteer	1	47	45	230
17	volunteer	1	46	46	233
18	volunteer	1	55	54	299
19	volunteer	1	61	60	97
20	volunteer	1	63	62	136
21	volunteer	1	41	40	168
22	volunteer	1	68	67	175
23	volunteer	1	16	14	203
24	volunteer	1	44	43	187
25	volunteer	1	71	70	181
26	volunteer	1	19	17	249
27	volunteer	1	89	88	316
28	volunteer	1	24	23	53
29	volunteer	1	96	94	154
30	volunteer	1	42	41	182
31	volunteer	1	105	103	191
32	volunteer	1	56	55	286
33	volunteer	1	88	87	313
34	volunteer	1	36	35	22
35	volunteer	1	79	78	244
36	volunteer	1	82	81	271
37	volunteer	1	57	56	301
38	volunteer	1	87	86	304
39	volunteer	1	8	8	314
40	volunteer	1	130	124	78
41	volunteer	1	129	125	81
42	volunteer	1	171	163	85
43	volunteer	1	37	36	102
44	volunteer	1	174	167	145
45	volunteer	1	138	133	140
46	volunteer	1	175	168	162
47	volunteer	1	97	95	156
48	volunteer	1	102	102	165
49	volunteer	1	179	172	199
50	volunteer	1	106	104	205
51	volunteer	1	49	49	240
52	volunteer	1	34	33	310
53	volunteer	1	62	61	91
54	volunteer	1	210	200	112
55	volunteer	1	212	203	143
56	volunteer	1	214	206	172
57	volunteer	1	146	142	210
58	volunteer	1	181	173	201
59	volunteer	1	156	151	268
60	volunteer	1	281	259	250
61	volunteer	1	21	18	278
62	volunteer	1	238	221	24
63	volunteer	1	240	223	45
64	volunteer	1	167	160	108
65	volunteer	102	208	199	529
66	volunteer	1	65	64	151
67	volunteer	1	40	39	141
68	volunteer	1	103	100	192
69	volunteer	1	69	68	176
70	volunteer	65	107	105	532
71	volunteer	1	112	110	247
72	volunteer	1	117	115	277
73	volunteer	1	52	51	292
74	volunteer	1	116	114	263
75	volunteer	1	54	53	275
76	volunteer	1	189	182	300
77	volunteer	1	120	118	293
78	volunteer	1	122	120	306
79	volunteer	1	196	188	10
80	volunteer	1	126	121	29
81	volunteer	1	127	122	56
82	volunteer	1	27	26	166
83	volunteer	1	139	136	159
84	volunteer	1	279	257	185
85	volunteer	1	218	209	215
86	volunteer	1	50	48	262
87	volunteer	1	48	47	241
88	volunteer	1	75	73	260
89	volunteer	1	160	155	295
90	volunteer	1	22	20	272
91	volunteer	1	86	84	261
92	volunteer	1	125	261	475
93	volunteer	1	93	91	13
94	volunteer	1	300	279	144
95	volunteer	1	38	37	95
96	volunteer	1	98	96	158
97	volunteer	1	143	135	126
98	volunteer	1	104	101	179
99	volunteer	1	43	42	170
100	volunteer	1	305	284	238
101	volunteer	1	110	109	236
102	volunteer	1	187	180	267
103	volunteer	1	113	112	254
104	volunteer	1	51	50	2
105	volunteer	1	121	119	302
106	volunteer	1	58	57	308
107	volunteer	1	195	187	7
108	volunteer	1	194	186	31
109	volunteer	1	199	191	49
110	volunteer	1	201	192	43
111	volunteer	1	131	126	90
112	volunteer	1	25	24	66
113	volunteer	1	272	250	107
114	volunteer	1	132	128	9
115	volunteer	1	211	202	131
116	volunteer	1	64	63	137
117	volunteer	1	141	137	171
118	volunteer	1	275	253	189
119	volunteer	1	148	143	213
120	volunteer	1	149	144	225
121	volunteer	1	18	16	239
122	volunteer	1	77	76	266
123	volunteer	108	124	260	438
124	volunteer	1	85	85	298
125	volunteer	1	284	263	11
126	volunteer	1	342	306	65
127	volunteer	1	242	226	70
128	volunteer	1	94	92	72
129	volunteer	1	295	275	122
130	volunteer	1	39	38	129
131	volunteer	1	26	25	109
132	volunteer	1	176	169	193
133	volunteer	1	109	107	243
134	volunteer	1	185	178	234
135	volunteer	1	186	179	223
136	volunteer	1	254	237	280
137	volunteer	1	319	287	17
138	volunteer	1	265	243	57
139	volunteer	1	123	315	423
140	volunteer	1	136	132	134
141	volunteer	55	262	318	384
142	volunteer	1	144	139	174
143	volunteer	1	145	140	190
144	volunteer	1	278	255	207
145	volunteer	1	108	106	226
146	volunteer	1	157	152	279
147	volunteer	1	74	74	259
148	volunteer	1	154	149	276
149	volunteer	1	78	77	273
150	volunteer	1	159	153	291
151	volunteer	11	261	301	366
152	volunteer	1	337	302	524
153	volunteer	1	232	218	8
154	volunteer	1	164	157	33
155	volunteer	1	286	265	55
156	volunteer	1	163	156	15
157	volunteer	1	288	267	54
158	volunteer	1	290	269	52
177	volunteer	1	70	69	202
189	volunteer	1	173	166	84
210	volunteer	1	158	154	283
216	volunteer	20	361	341	495
225	volunteer	1	346	309	148
228	volunteer	1	303	282	167
234	volunteer	18	347	346	334
238	volunteer	1	377	331	62
245	volunteer	1	273	251	123
256	volunteer	1	248	231	178
258	volunteer	1	111	108	248
259	volunteer	62	349	358	368
261	volunteer	1	321	289	41
264	volunteer	1	99	97	177
281	volunteer	1	411	344	157
288	volunteer	1	267	245	61
289	volunteer	8	230	351	502
302	volunteer	101	333	364	430
303	volunteer	1	59	58	38
305	volunteer	9	379	352	536
313	volunteer	1	243	225	50
318	volunteer	141	406	361	500
321	volunteer	114	234	374	503
327	volunteer	4	257	357	323
333	volunteer	125	258	366	533
351	volunteer	1	263	241	27
352	volunteer	99	422	365	528
354	volunteer	129	369	368	378
365	volunteer	1	235	220	34
383	volunteer	1	190	183	303
412	volunteer	1	225	216	258
421	volunteer	128	237	382	509
426	volunteer	64	395	433	404
438	volunteer	103	385	409	485
463	volunteer	104	470	500	436
471	volunteer	1	269	247	77
476	volunteer	192	479	459	351
479	volunteer	60	489	482	318
496	volunteer	90	477	504	340
504	volunteer	65	519	490	422
507	volunteer	9	529	498	341
512	volunteer	110	523	527	333
525	volunteer	62	520	526	457
538	volunteer	117	540	540	427
159	volunteer	1	344	307	93
169	volunteer	1	192	184	305
180	volunteer	1	73	72	237
188	volunteer	1	301	280	133
191	volunteer	1	249	232	160
196	volunteer	1	30	29	252
213	volunteer	23	260	300	355
217	volunteer	1	233	219	19
218	volunteer	145	287	266	527
223	volunteer	1	294	273	106
224	volunteer	1	246	229	120
236	volunteer	1	200	190	46
239	volunteer	1	323	291	73
257	volunteer	1	250	233	195
262	volunteer	1	325	293	132
272	volunteer	1	84	83	296
274	volunteer	130	315	356	446
277	volunteer	1	362	320	28
279	volunteer	1	410	343	111
292	volunteer	1	76	75	255
296	volunteer	147	229	310	478
299	volunteer	164	310	360	331
311	volunteer	1	364	322	30
324	volunteer	98	413	401	376
329	volunteer	2	386	349	489
330	volunteer	1	209	201	114
336	volunteer	59	446	375	375
356	volunteer	127	428	405	459
364	volunteer	151	430	410	490
366	volunteer	140	162	394	499
398	volunteer	56	475	418	356
399	volunteer	7	494	443	400
424	volunteer	58	418	475	374
431	volunteer	54	512	472	434
451	volunteer	1	53	52	274
458	volunteer	64	367	444	319
460	volunteer	26	472	412	380
475	volunteer	1	268	246	92
487	volunteer	1	328	295	142
500	volunteer	148	508	510	361
505	volunteer	71	518	483	521
518	volunteer	8	393	518	347
521	opportunity	37	538	534	539
528	volunteer	65	535	530	324
530	volunteer	43	517	474	488
531	volunteer	23	521	528	455
160	volunteer	1	293	272	94
162	volunteer	55	228	325	470
163	volunteer	1	66	65	130
164	volunteer	1	252	234	197
184	volunteer	1	165	158	44
190	volunteer	1	14	12	88
207	volunteer	1	215	205	169
220	volunteer	1	291	270	71
227	volunteer	1	247	230	121
232	volunteer	1	306	285	242
243	volunteer	1	327	296	127
248	volunteer	1	220	211	220
249	volunteer	1	226	217	251
268	volunteer	1	67	66	163
284	volunteer	1	119	117	290
295	volunteer	1	95	93	118
310	volunteer	1	409	342	47
315	volunteer	1	245	228	125
331	volunteer	1	207	198	98
341	volunteer	1	341	304	36
349	volunteer	60	388	431	468
359	volunteer	131	396	411	410
368	volunteer	57	426	371	399
392	volunteer	8	380	449	386
405	volunteer	1	320	288	63
415	volunteer	28	490	469	325
430	volunteer	11	465	439	350
435	volunteer	67	462	435	435
443	volunteer	178	492	457	381
445	volunteer	59	351	473	498
446	volunteer	94	357	335	450
447	volunteer	16	443	447	517
448	volunteer	143	509	495	330
467	volunteer	179	471	493	409
481	volunteer	76	522	501	425
488	volunteer	1	378	332	146
515	volunteer	1	391	333	116
520	volunteer	27	503	521	464
523	volunteer	53	514	508	469
527	volunteer	36	501	519	339
536	opportunity	11	539	539	540
541	opportunity	15	541	541	541
542	opportunity	170	542	542	542
543	opportunity	36	543	543	543
544	opportunity	40	544	544	544
545	opportunity	19	545	545	545
546	opportunity	26	546	546	546
547	opportunity	56	547	547	547
548	opportunity	149	548	548	548
549	opportunity	48	549	549	549
550	opportunity	15	550	550	550
551	opportunity	1	551	551	551
552	opportunity	19	552	552	552
553	opportunity	42	553	553	553
554	opportunity	20	554	554	554
555	opportunity	144	555	555	555
556	opportunity	122	556	556	556
557	opportunity	51	557	557	557
558	opportunity	130	558	558	558
559	opportunity	105	559	559	559
560	opportunity	27	560	560	560
561	opportunity	15	561	561	561
562	opportunity	11	562	562	562
563	opportunity	11	563	563	563
564	opportunity	11	564	564	564
565	opportunity	11	565	565	565
566	opportunity	11	566	566	566
567	opportunity	130	567	567	567
568	opportunity	107	568	568	568
569	opportunity	19	569	569	569
570	opportunity	19	570	570	570
571	opportunity	126	571	571	571
572	opportunity	126	572	572	572
573	opportunity	149	573	573	573
574	opportunity	126	574	574	574
575	opportunity	11	575	575	575
576	opportunity	1	576	576	576
577	opportunity	146	577	577	577
578	opportunity	120	578	578	578
579	opportunity	58	579	579	579
580	opportunity	15	580	580	580
581	opportunity	105	581	581	581
582	opportunity	160	582	582	582
583	opportunity	71	583	583	583
584	opportunity	59	584	584	584
585	opportunity	1	585	585	585
586	opportunity	1	586	586	586
587	opportunity	1	587	587	587
588	opportunity	57	588	588	588
589	opportunity	126	589	589	589
590	opportunity	58	590	590	590
591	opportunity	127	591	591	591
592	opportunity	56	592	592	592
593	opportunity	104	593	593	593
594	opportunity	22	594	594	594
595	opportunity	113	595	595	595
596	opportunity	139	596	596	596
597	opportunity	31	597	597	597
598	opportunity	31	598	598	598
599	opportunity	31	599	599	599
600	opportunity	149	600	600	600
601	opportunity	3	601	601	601
602	opportunity	105	602	602	602
603	opportunity	56	603	603	603
604	opportunity	170	604	604	604
605	opportunity	128	605	605	605
606	opportunity	56	606	606	606
607	opportunity	121	607	607	607
608	opportunity	58	608	608	608
609	opportunity	57	609	609	609
610	opportunity	102	610	610	610
611	opportunity	126	611	611	611
612	opportunity	1	612	612	612
613	opportunity	144	613	613	613
614	opportunity	185	614	614	614
615	opportunity	185	615	615	615
616	opportunity	185	616	616	616
617	opportunity	1	617	617	617
618	opportunity	106	618	618	618
619	opportunity	53	619	619	619
620	opportunity	100	620	620	620
621	opportunity	128	621	621	621
622	opportunity	125	622	622	622
623	opportunity	2	623	623	623
624	opportunity	48	624	624	624
625	opportunity	15	625	625	625
626	opportunity	31	626	626	626
627	opportunity	83	627	627	627
628	opportunity	31	628	628	628
629	opportunity	11	629	629	629
630	opportunity	2	630	630	630
631	opportunity	185	631	631	631
632	opportunity	121	632	632	632
633	opportunity	111	633	633	633
634	opportunity	111	634	634	634
635	opportunity	31	635	635	635
636	opportunity	121	636	636	636
637	opportunity	139	637	637	637
638	opportunity	126	638	638	638
639	opportunity	3	639	639	639
640	opportunity	107	640	640	640
641	opportunity	132	641	641	641
642	opportunity	121	642	642	642
643	opportunity	170	643	643	643
644	opportunity	2	644	644	644
645	opportunity	107	645	645	645
646	opportunity	17	646	646	646
647	opportunity	107	647	647	647
648	opportunity	107	648	648	648
649	opportunity	77	649	649	649
650	opportunity	19	650	650	650
651	opportunity	130	651	651	651
652	opportunity	170	652	652	652
653	opportunity	2	653	653	653
654	opportunity	17	654	654	654
655	opportunity	2	655	655	655
656	opportunity	131	656	656	656
161	volunteer	1	299	278	124
171	volunteer	1	203	194	23
175	volunteer	1	277	256	204
199	volunteer	141	318	327	483
203	volunteer	1	206	197	74
222	volunteer	1	169	162	110
230	volunteer	1	100	99	153
235	volunteer	185	368	347	371
240	volunteer	1	354	314	87
255	volunteer	1	170	164	103
294	volunteer	1	345	308	147
301	volunteer	1	266	244	35
304	volunteer	60	402	336	531
325	volunteer	51	394	354	344
332	volunteer	1	219	210	198
340	volunteer	1	363	321	18
363	volunteer	27	424	419	433
377	volunteer	74	316	420	480
387	volunteer	43	468	440	387
408	volunteer	1	264	242	37
410	volunteer	52	507	481	332
417	volunteer	8	90	240	486
423	opportunity	126	527	487	538
452	volunteer	1	17	15	245
455	volunteer	1	224	215	206
459	volunteer	29	384	458	471
470	volunteer	143	464	486	508
477	volunteer	1	223	214	232
486	volunteer	1	280	258	228
517	volunteer	153	486	503	326
522	volunteer	49	525	507	458
540	volunteer	143	502	532	398
165	volunteer	1	180	174	186
172	volunteer	1	270	248	117
173	volunteer	1	134	129	115
182	volunteer	1	239	222	39
198	volunteer	189	13	329	526
200	volunteer	1	353	312	75
202	volunteer	1	204	195	89
208	volunteer	1	276	254	200
241	volunteer	1	128	123	59
244	volunteer	1	356	317	150
251	volunteer	1	31	31	264
253	volunteer	1	289	268	64
263	volunteer	1	324	292	104
265	volunteer	1	331	299	184
280	volunteer	1	298	276	135
286	volunteer	86	374	363	505
290	volunteer	1	330	298	161
307	volunteer	127	403	355	413
308	volunteer	144	334	392	465
312	volunteer	1	365	323	69
317	volunteer	101	339	370	523
319	volunteer	1	193	185	12
342	volunteer	1	92	90	40
346	volunteer	7	473	430	453
367	volunteer	85	431	395	346
375	volunteer	183	447	389	426
378	volunteer	6	359	391	472
379	volunteer	6	421	408	477
389	volunteer	189	449	414	447
391	volunteer	1	274	252	139
393	volunteer	27	451	423	343
400	volunteer	65	474	437	437
402	volunteer	50	370	380	419
409	volunteer	1	376	330	25
444	volunteer	7	439	446	474
466	volunteer	1	182	175	235
482	volunteer	1	251	235	218
485	volunteer	5	467	456	388
490	volunteer	1	307	286	294
495	volunteer	63	498	511	397
502	volunteer	116	511	517	363
510	volunteer	26	433	509	367
513	volunteer	66	408	502	512
532	volunteer	6	461	496	408
166	volunteer	1	45	44	227
246	volunteer	4	329	297	530
306	volunteer	11	309	353	328
314	volunteer	1	296	277	86
320	volunteer	1	271	249	100
322	volunteer	1	216	207	188
362	volunteer	177	423	403	354
373	volunteer	10	197	416	513
374	volunteer	144	414	417	360
381	volunteer	81	389	393	506
390	volunteer	21	400	385	520
394	volunteer	59	415	421	382
397	volunteer	46	387	397	451
441	volunteer	189	466	492	353
465	volunteer	1	166	159	80
478	volunteer	23	491	489	383
493	volunteer	32	526	523	417
503	volunteer	189	412	467	345
526	volunteer	60	533	533	418
539	volunteer	54	524	536	501
167	volunteer	1	114	111	270
174	volunteer	1	140	134	155
176	volunteer	1	147	141	216
183	volunteer	1	285	264	58
193	volunteer	1	183	177	217
195	volunteer	1	177	171	180
197	volunteer	102	227	334	537
206	volunteer	1	135	130	113
209	volunteer	1	153	148	211
211	volunteer	1	83	82	285
215	volunteer	1	283	262	20
221	volunteer	1	292	271	67
226	volunteer	1	101	98	164
231	volunteer	172	259	345	336
233	volunteer	1	20	19	253
266	volunteer	1	213	204	152
273	volunteer	144	236	319	522
278	volunteer	1	340	303	26
282	volunteer	1	253	236	231
287	volunteer	1	355	313	105
297	volunteer	101	312	359	414
309	volunteer	54	317	378	473
335	volunteer	1	416	387	372
339	volunteer	65	469	407	440
343	volunteer	139	308	381	327
348	volunteer	61	390	398	518
357	volunteer	57	335	388	421
360	volunteer	46	404	428	429
370	volunteer	142	401	386	496
380	volunteer	64	441	379	511
395	volunteer	28	460	445	402
414	volunteer	1	91	89	42
422	volunteer	6	485	488	493
434	volunteer	120	459	476	415
439	volunteer	54	442	452	514
457	volunteer	103	338	369	525
483	volunteer	1	255	238	257
497	volunteer	59	532	516	391
509	volunteer	6	516	522	379
519	volunteer	164	504	515	337
534	volunteer	144	537	538	342
168	volunteer	1	115	113	265
179	volunteer	1	155	150	269
186	volunteer	1	241	224	60
187	volunteer	1	297	274	101
192	volunteer	1	184	176	229
194	volunteer	1	304	283	224
237	volunteer	1	352	311	32
270	volunteer	1	151	146	246
291	volunteer	1	221	212	221
323	volunteer	1	32	30	256
337	volunteer	1	397	406	442
338	volunteer	190	419	390	466
347	volunteer	6	405	373	456
353	volunteer	58	381	404	390
369	volunteer	1	375	328	14
376	volunteer	9	398	436	431
385	volunteer	52	432	422	362
396	volunteer	39	440	413	461
406	volunteer	1	198	189	16
413	volunteer	9	435	460	411
419	volunteer	59	434	455	394
428	volunteer	133	484	451	491
436	volunteer	8	373	463	484
437	volunteer	50	399	377	444
440	volunteer	9	429	438	454
453	volunteer	24	161	442	535
461	volunteer	8	476	491	392
469	volunteer	23	513	485	403
472	volunteer	22	448	494	516
489	volunteer	50	483	464	448
491	volunteer	45	456	506	432
506	volunteer	66	493	520	401
514	volunteer	6	505	513	406
537	volunteer	162	531	537	352
170	volunteer	1	322	290	68
181	volunteer	1	23	21	288
185	volunteer	1	244	227	96
204	volunteer	1	205	196	83
214	volunteer	60	311	337	377
229	volunteer	105	231	326	492
247	volunteer	1	142	138	173
254	volunteer	1	366	324	79
275	volunteer	44	371	339	463
276	volunteer	29	372	340	515
285	volunteer	95	282	348	504
298	volunteer	141	314	384	416
300	volunteer	1	202	193	48
326	volunteer	47	383	376	449
344	volunteer	147	332	383	428
345	volunteer	139	437	372	407
350	volunteer	26	458	399	482
358	volunteer	9	427	427	389
361	volunteer	168	420	396	460
371	volunteer	1	137	131	138
382	volunteer	1	172	165	99
384	volunteer	1	256	239	297
386	volunteer	10	452	424	349
403	volunteer	163	478	426	364
404	volunteer	62	455	429	462
427	volunteer	69	438	477	467
429	volunteer	24	515	468	358
454	volunteer	50	499	480	441
456	volunteer	139	496	450	481
462	volunteer	81	313	466	396
474	volunteer	64	450	432	329
484	volunteer	18	506	497	476
499	volunteer	1	302	281	119
508	volunteer	60	497	505	373
511	volunteer	6	425	470	420
516	volunteer	2	481	525	393
529	volunteer	60	487	529	320
535	volunteer	2	528	514	519
178	volunteer	1	72	71	214
201	volunteer	1	60	59	21
205	volunteer	1	326	294	128
212	volunteer	1	81	80	287
219	volunteer	1	168	161	76
242	volunteer	11	191	316	534
250	volunteer	1	222	213	222
252	volunteer	63	350	338	405
260	volunteer	69	360	350	487
267	volunteer	1	217	208	196
269	volunteer	1	80	79	281
271	volunteer	113	392	367	322
283	volunteer	1	188	181	289
293	volunteer	1	343	305	51
316	volunteer	1	118	116	284
328	volunteer	115	407	362	510
334	volunteer	1	152	147	219
355	volunteer	1	382	434	365
372	volunteer	76	358	415	443
388	volunteer	62	336	441	494
401	volunteer	62	444	453	507
407	volunteer	146	457	448	452
411	volunteer	44	348	400	348
416	volunteer	154	445	454	359
418	volunteer	19	510	471	369
420	volunteer	186	495	479	497
425	volunteer	59	453	402	385
432	volunteer	1	150	145	212
433	volunteer	147	480	461	335
442	volunteer	57	417	425	357
449	volunteer	23	454	462	370
450	volunteer	1	15	13	149
464	volunteer	1	178	170	208
468	volunteer	108	436	478	424
473	volunteer	1	133	127	82
480	volunteer	53	463	465	439
492	volunteer	18	482	484	412
494	volunteer	51	500	499	479
498	volunteer	65	536	524	445
501	volunteer	8	488	512	321
524	volunteer	141	530	531	338
533	volunteer	77	534	535	395
657	opportunity	18	657	657	657
658	opportunity	18	658	658	658
659	opportunity	15	659	659	659
660	opportunity	66	660	660	660
661	opportunity	122	661	661	661
662	opportunity	19	662	662	662
663	opportunity	1	663	663	663
664	opportunity	120	664	664	664
665	opportunity	120	665	665	665
666	opportunity	1	666	666	666
667	opportunity	149	667	667	667
668	opportunity	149	668	668	668
669	opportunity	31	669	669	669
670	opportunity	132	670	670	670
671	opportunity	120	671	671	671
672	opportunity	1	672	672	672
673	opportunity	17	673	673	673
674	opportunity	2	674	674	674
675	opportunity	119	675	675	675
676	opportunity	1	676	676	676
677	opportunity	119	677	677	677
678	opportunity	183	678	678	678
679	opportunity	170	679	679	679
680	opportunity	1	680	680	680
681	opportunity	1	681	681	681
682	opportunity	56	682	682	682
683	opportunity	120	683	683	683
684	opportunity	1	684	684	684
685	opportunity	89	685	685	685
686	opportunity	89	686	686	686
687	opportunity	31	687	687	687
688	opportunity	68	688	688	688
689	opportunity	1	689	689	689
690	opportunity	15	690	690	690
691	opportunity	113	691	691	691
692	opportunity	127	692	692	692
693	opportunity	19	693	693	693
694	opportunity	126	694	694	694
695	opportunity	126	695	695	695
696	opportunity	95	696	696	696
697	opportunity	101	697	697	697
698	opportunity	1	698	698	698
699	opportunity	1	699	699	699
700	opportunity	1	700	700	700
701	opportunity	1	701	701	701
702	opportunity	1	702	702	702
703	opportunity	1	703	703	703
704	opportunity	1	704	704	704
705	opportunity	1	705	705	705
706	opportunity	1	706	706	706
707	opportunity	5	707	707	707
708	opportunity	19	708	708	708
709	opportunity	19	709	709	709
710	opportunity	101	710	710	710
711	opportunity	186	711	711	711
712	opportunity	18	712	712	712
713	opportunity	121	713	713	713
714	opportunity	127	714	714	714
715	opportunity	88	715	715	715
716	opportunity	19	716	716	716
717	opportunity	160	717	717	717
718	opportunity	170	718	718	718
719	opportunity	170	719	719	719
720	opportunity	68	720	720	720
721	opportunity	79	721	721	721
722	opportunity	117	722	722	722
723	opportunity	18	723	723	723
724	opportunity	19	724	724	724
725	opportunity	149	725	725	725
726	opportunity	10	726	726	726
727	opportunity	19	727	727	727
728	opportunity	10	728	728	728
729	opportunity	1	729	729	729
730	opportunity	144	730	730	730
731	opportunity	80	731	731	731
732	opportunity	18	732	732	732
733	opportunity	100	733	733	733
734	opportunity	149	734	734	734
735	opportunity	101	735	735	735
736	opportunity	55	736	736	736
737	opportunity	58	737	737	737
738	opportunity	121	738	738	738
739	opportunity	183	739	739	739
740	opportunity	70	740	740	740
741	opportunity	128	741	741	741
742	opportunity	111	742	742	742
743	opportunity	111	743	743	743
744	opportunity	110	744	744	744
745	opportunity	121	745	745	745
746	opportunity	27	746	746	746
747	opportunity	132	747	747	747
748	opportunity	83	748	748	748
749	opportunity	54	749	749	749
750	opportunity	57	750	750	750
751	opportunity	61	751	751	751
752	opportunity	1	752	752	752
753	opportunity	148	753	753	753
754	opportunity	100	754	754	754
755	opportunity	19	755	755	755
756	opportunity	126	756	756	756
757	opportunity	126	757	757	757
758	opportunity	111	758	758	758
759	opportunity	100	759	759	759
760	opportunity	31	760	760	760
761	opportunity	31	761	761	761
762	opportunity	71	762	762	762
763	opportunity	121	763	763	763
764	opportunity	153	764	764	764
765	opportunity	7	765	765	765
766	opportunity	1	766	766	766
767	opportunity	1	767	767	767
768	opportunity	1	768	768	768
769	opportunity	57	769	769	769
770	opportunity	31	770	770	770
771	opportunity	149	771	771	771
772	opportunity	15	772	772	772
773	opportunity	58	773	773	773
774	opportunity	88	774	774	774
775	opportunity	88	775	775	775
776	opportunity	121	776	776	776
777	opportunity	185	777	777	777
778	opportunity	170	778	778	778
779	opportunity	57	779	779	779
780	opportunity	149	780	780	780
781	opportunity	149	781	781	781
782	opportunity	185	782	782	782
783	opportunity	56	783	783	783
784	opportunity	10	784	784	784
785	opportunity	111	785	785	785
786	opportunity	186	786	786	786
787	opportunity	59	787	787	787
788	opportunity	59	788	788	788
789	opportunity	59	789	789	789
790	opportunity	1	790	790	790
791	opportunity	1	791	791	791
792	opportunity	1	792	792	792
793	opportunity	1	793	793	793
794	opportunity	70	794	794	794
795	opportunity	100	795	795	795
796	opportunity	150	796	796	796
797	opportunity	70	797	797	797
798	opportunity	68	798	798	798
799	opportunity	10	799	799	799
800	opportunity	68	800	800	800
801	opportunity	84	801	801	801
802	opportunity	1	802	802	802
803	opportunity	185	803	803	803
804	opportunity	185	804	804	804
805	opportunity	19	805	805	805
806	opportunity	19	806	806	806
807	opportunity	170	807	807	807
808	opportunity	107	808	808	808
809	opportunity	8	809	809	809
810	opportunity	68	810	810	810
811	opportunity	100	811	811	811
812	opportunity	68	812	812	812
813	opportunity	150	813	813	813
814	opportunity	8	814	814	814
815	opportunity	1	815	815	815
816	opportunity	126	816	816	816
817	opportunity	149	817	817	817
818	opportunity	1	818	818	818
819	opportunity	120	819	819	819
820	opportunity	68	820	820	820
821	opportunity	144	821	821	821
822	opportunity	70	822	822	822
823	opportunity	144	823	823	823
824	opportunity	101	824	824	824
825	opportunity	1	825	825	825
826	opportunity	1	826	826	826
827	opportunity	1	827	827	827
828	opportunity	1	828	828	828
829	opportunity	1	829	829	829
830	opportunity	1	830	830	830
831	opportunity	1	831	831	831
832	opportunity	1	832	832	832
833	opportunity	1	833	833	833
834	opportunity	1	834	834	834
835	opportunity	1	835	835	835
836	opportunity	1	836	836	836
837	opportunity	1	837	837	837
838	opportunity	1	838	838	838
839	opportunity	1	839	839	839
840	opportunity	1	840	840	840
841	opportunity	1	841	841	841
842	opportunity	1	842	842	842
843	opportunity	1	843	843	843
844	opportunity	1	844	844	844
845	opportunity	1	845	845	845
846	opportunity	1	846	846	846
847	opportunity	1	847	847	847
848	opportunity	1	848	848	848
849	opportunity	1	849	849	849
850	opportunity	1	850	850	850
851	opportunity	1	851	851	851
852	opportunity	1	852	852	852
853	opportunity	1	853	853	853
854	opportunity	1	854	854	854
855	opportunity	1	855	855	855
856	opportunity	1	856	856	856
857	opportunity	1	857	857	857
858	opportunity	1	858	858	858
859	opportunity	1	859	859	859
860	opportunity	1	860	860	860
861	opportunity	1	861	861	861
862	opportunity	1	862	862	862
863	opportunity	1	863	863	863
864	opportunity	1	864	864	864
865	opportunity	1	865	865	865
866	opportunity	1	866	866	866
867	opportunity	1	867	867	867
868	opportunity	1	868	868	868
869	opportunity	1	869	869	869
870	opportunity	1	870	870	870
871	opportunity	1	871	871	871
872	opportunity	1	872	872	872
873	opportunity	1	873	873	873
874	opportunity	1	874	874	874
875	opportunity	1	875	875	875
876	opportunity	1	876	876	876
877	opportunity	1	877	877	877
878	opportunity	1	878	878	878
879	opportunity	1	879	879	879
880	opportunity	1	880	880	880
881	opportunity	1	881	881	881
882	opportunity	1	882	882	882
883	opportunity	1	883	883	883
884	opportunity	1	884	884	884
885	opportunity	1	885	885	885
886	opportunity	1	886	886	886
887	opportunity	1	887	887	887
888	opportunity	1	888	888	888
889	opportunity	1	889	889	889
890	opportunity	1	890	890	890
891	opportunity	1	891	891	891
892	opportunity	1	892	892	892
893	opportunity	1	893	893	893
894	opportunity	1	894	894	894
895	opportunity	1	895	895	895
896	opportunity	1	896	896	896
897	opportunity	1	897	897	897
898	opportunity	1	898	898	898
899	opportunity	1	899	899	899
900	opportunity	1	900	900	900
901	opportunity	1	901	901	901
902	opportunity	1	902	902	902
903	opportunity	1	903	903	903
904	opportunity	1	904	904	904
905	opportunity	1	905	905	905
906	opportunity	1	906	906	906
907	opportunity	1	907	907	907
908	opportunity	1	908	908	908
909	opportunity	1	909	909	909
910	opportunity	1	910	910	910
911	opportunity	1	911	911	911
912	opportunity	1	912	912	912
913	opportunity	1	913	913	913
914	opportunity	1	914	914	914
915	opportunity	1	915	915	915
916	opportunity	1	916	916	916
917	opportunity	1	917	917	917
918	opportunity	1	918	918	918
919	opportunity	1	919	919	919
920	opportunity	1	920	920	920
921	opportunity	1	921	921	921
922	opportunity	1	922	922	922
923	opportunity	1	923	923	923
924	opportunity	1	924	924	924
925	opportunity	1	925	925	925
926	opportunity	1	926	926	926
927	opportunity	1	927	927	927
928	opportunity	1	928	928	928
929	opportunity	1	929	929	929
930	opportunity	1	930	930	930
931	opportunity	1	931	931	931
932	opportunity	1	932	932	932
933	opportunity	1	933	933	933
934	opportunity	1	934	934	934
935	opportunity	1	935	935	935
936	opportunity	1	936	936	936
937	opportunity	1	937	937	937
938	opportunity	1	938	938	938
939	opportunity	1	939	939	939
940	opportunity	1	940	940	940
941	opportunity	1	941	941	941
942	opportunity	1	942	942	942
943	opportunity	1	943	943	943
944	opportunity	1	944	944	944
945	opportunity	1	945	945	945
946	opportunity	1	946	946	946
947	opportunity	1	947	947	947
948	opportunity	1	948	948	948
949	opportunity	1	949	949	949
950	opportunity	1	950	950	950
951	opportunity	1	951	951	951
952	opportunity	1	952	952	952
953	opportunity	1	953	953	953
954	opportunity	1	954	954	954
955	opportunity	1	955	955	955
956	opportunity	1	956	956	956
957	opportunity	1	957	957	957
958	opportunity	1	958	958	958
959	opportunity	1	959	959	959
960	opportunity	1	960	960	960
961	opportunity	1	961	961	961
962	opportunity	1	962	962	962
963	opportunity	1	963	963	963
964	opportunity	1	964	964	964
965	opportunity	1	965	965	965
966	opportunity	1	966	966	966
967	opportunity	1	967	967	967
968	opportunity	1	968	968	968
969	opportunity	1	969	969	969
970	opportunity	1	970	970	970
971	opportunity	1	971	971	971
972	opportunity	1	972	972	972
973	opportunity	1	973	973	973
974	opportunity	1	974	974	974
975	opportunity	1	975	975	975
976	opportunity	1	976	976	976
977	opportunity	1	977	977	977
978	opportunity	1	978	978	978
979	opportunity	1	979	979	979
980	opportunity	1	980	980	980
981	opportunity	1	981	981	981
982	opportunity	1	982	982	982
983	opportunity	1	983	983	983
984	opportunity	1	984	984	984
985	opportunity	1	985	985	985
986	opportunity	1	986	986	986
987	opportunity	1	987	987	987
988	opportunity	1	988	988	988
989	opportunity	1	989	989	989
990	opportunity	1	990	990	990
991	opportunity	1	991	991	991
992	opportunity	1	992	992	992
993	opportunity	1	993	993	993
994	opportunity	1	994	994	994
995	opportunity	1	995	995	995
996	opportunity	1	996	996	996
997	opportunity	1	997	997	997
998	opportunity	1	998	998	998
999	opportunity	1	999	999	999
1000	opportunity	1	1000	1000	1000
1001	opportunity	1	1001	1001	1001
1002	opportunity	1	1002	1002	1002
\.


--
-- Data for Name: district; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.district (id, title) FROM stdin;
1	Mitte
2	Friedrichshain-Kreuzberg
3	Pankow
4	Charlottenburg-Wilmersdorf
5	Spandau
6	Steglitz-Zehlendorf
7	Tempelhof-Schöneberg
8	Neukölln
9	Treptow-Köpenick
10	Marzahn-Hellersdorf
11	Lichtenberg
12	Reinickendorf
13	Tempelhof
14	Freidrichshain
15	Charlottenburg
16	Charlottenburg
17	Kreuzberg
18	Charlottenburg
19	Charlottenburg
20	Kreuzberg
21	Friedrichshain
22	Friedrichshain
23	Friedrichshain
24	Köpenick
25	Kreuzberg
26	Treptow
27	Friedrichshain
28	Köpenick
29	Friedrichshain
30	Remotely
31	Marzahn
32	Prenzlauer Berg
33	Moabit
34	Prenzlauer Berg
35	Wedding
36	Moabit
37	Schöneberg
38	Steglitz
39	Schöneberg
40	Steglitz
41	Zehlendorf
42	Schöneberg
43	Schöneberg
44	Steglitz
45	Rudow
46	Hellersdorf
47	Hellersdorf
48	Hellersdorf
49	Rudow
50	Phone translation
51	Wilmersdorf
52	Wilmersdorf
53	Telefonisch
54	Weißensee
55	Tegel
56	Tegel
57	Berlin
58	Marienfelde
59	Königs Wusterhausen
60	Remote
\.


--
-- Data for Name: district_postcode; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.district_postcode (id, district_id, postcode_id) FROM stdin;
1	1	2
2	1	28
3	1	145
4	1	3
5	1	32
6	1	146
7	1	4
8	1	47
9	1	147
10	1	5
11	1	48
12	1	149
13	1	6
14	1	55
15	1	150
16	1	21
17	1	58
18	1	151
19	1	24
20	1	141
21	1	25
22	1	142
23	1	26
24	1	143
25	1	27
26	1	144
27	2	6
28	2	57
29	2	7
30	2	58
31	2	8
32	2	59
33	2	9
34	2	60
35	2	10
36	2	62
37	2	16
38	2	47
39	2	54
40	2	55
41	2	56
42	3	4
43	3	126
44	3	139
45	3	9
46	3	130
47	3	140
48	3	10
49	3	131
50	3	18
51	3	132
52	3	19
53	3	133
54	3	20
55	3	134
56	3	21
57	3	135
58	3	22
59	3	136
60	3	23
61	3	137
62	3	125
63	3	138
64	4	25
65	4	38
66	4	144
67	4	177
68	4	29
69	4	39
70	4	170
71	4	188
72	4	30
73	4	40
74	4	172
75	4	189
76	4	31
77	4	41
78	4	173
79	4	190
80	4	32
81	4	42
82	4	174
83	4	33
84	4	43
85	4	175
86	4	34
87	4	44
88	4	176
89	4	35
90	4	48
91	4	192
92	4	36
93	4	49
94	4	178
95	4	37
96	4	51
97	4	179
98	5	162
99	5	172
100	5	163
101	5	173
102	5	164
103	5	175
104	5	165
105	5	180
106	5	166
107	5	167
108	5	168
109	5	169
110	5	170
111	5	171
112	6	76
113	6	87
114	6	177
115	6	78
116	6	88
117	6	188
118	6	79
119	6	89
120	6	189
121	6	80
122	6	90
123	6	190
124	6	81
125	6	181
126	6	82
127	6	182
128	6	83
129	6	183
130	6	84
131	6	184
132	6	85
133	6	185
134	6	86
135	6	186
136	7	43
137	7	53
138	7	78
139	7	189
140	7	44
141	7	56
142	7	79
143	7	45
144	7	70
145	7	82
146	7	46
147	7	71
148	7	88
149	7	47
150	7	72
151	7	89
152	7	48
153	7	73
154	7	90
155	7	49
156	7	74
157	7	91
158	7	50
159	7	75
160	7	92
161	7	51
162	7	76
163	7	93
164	7	52
165	7	77
166	7	94
167	8	56
168	8	69
169	8	100
170	8	57
171	8	70
172	8	61
173	8	74
174	8	62
175	8	91
176	8	63
177	8	94
178	8	64
179	8	95
180	8	65
181	8	96
182	8	66
183	8	97
184	8	67
185	8	98
186	8	68
187	8	99
188	9	101
189	9	110
190	9	102
191	9	111
192	9	191
193	9	112
194	9	103
195	9	113
196	9	104
197	9	116
198	9	105
199	9	106
200	9	107
201	9	108
202	9	109
203	10	109
204	10	123
205	10	114
206	10	124
207	10	115
208	10	116
209	10	117
210	10	118
211	10	119
212	10	120
213	10	121
214	10	122
215	11	11
216	11	128
217	11	12
218	11	129
219	11	13
220	11	14
221	11	15
222	11	16
223	11	17
224	11	125
225	11	126
226	11	127
227	12	148
228	12	158
229	12	149
230	12	159
231	12	150
232	12	160
233	12	151
234	12	161
235	12	152
236	12	171
237	12	153
238	12	173
239	12	154
240	12	155
241	12	156
242	12	157
\.


--
-- Data for Name: event_n4d; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_n4d (id, is_active, date, date_end, type, pic, location_link, rsvp_link, followup_link, address, host_name, language_id) FROM stdin;
\.


--
-- Data for Name: event_translation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_translation (id, title, subtitle, menu_title, time_str, location_comment, description, short_description, additional_title, additional_info, outro, followup_text, eventn4d_id, language_id) FROM stdin;
\.


--
-- Data for Name: field_translation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.field_translation (id, field_name, language_id, entity_type, entity_id, translation) FROM stdin;
1	title	1833	language	1540	German
2	title	1540	language	1540	Deutsch
3	title	1833	language	1833	English
4	title	1540	language	1833	Englisch
5	title	1833	language	345	Arabic
6	title	1540	language	345	Arabisch
7	title	1833	language	1910	Farsi/Dari
8	title	1540	language	1910	Farsi/Dari
9	title	1833	language	6644	Turkish
10	title	1540	language	6644	Türkisch
11	title	1833	language	5677	Russian
12	title	1540	language	5677	Russisch
13	title	1833	language	6769	Ukrainian
14	title	1540	language	6769	Ukrainisch
15	title	1833	language	1954	French
16	title	1540	language	1954	Französisch
17	title	1833	language	3151	Kurmanji
18	title	1540	language	3151	Kurmanci
19	title	1833	language	1200	Sorani
20	title	1540	language	1200	Sorani
21	title	1833	language	2521	Armenian
22	title	1540	language	2521	Armenisch
23	title	1833	language	618	Belarusian
24	title	1540	language	618	Weißrussisch
25	title	1833	language	1230	Chechen
26	title	1540	language	1230	Tschetschenisch
27	title	1833	language	7790	Chinese
28	title	1540	language	7790	Chinesisch
29	title	1833	language	1215	Czech
30	title	1540	language	1215	Tschechisch
31	title	1833	language	1482	Dari
32	title	1540	language	1482	Dari
33	title	1833	language	4698	Dutch
34	title	1540	language	4698	Niederländisch
35	title	1833	language	2854	Georgian
36	title	1540	language	2854	Georgisch
37	title	1833	language	1807	Greek
38	title	1540	language	1807	Griechisch
39	title	1833	language	2366	Hebrew
40	title	1540	language	2366	Hebräisch
41	title	1833	language	2388	Hindi
42	title	1540	language	2388	Hindi
43	title	1833	language	2665	Italian
44	title	1540	language	2665	Italienisch
45	title	1833	language	5445	Pashto
46	title	1540	language	5445	Paschtu
47	title	1833	language	5351	Polish
48	title	1540	language	5351	Polnisch
49	title	1833	language	5140	Punjabi
50	title	1540	language	5140	Punjabi
51	title	1833	language	5641	Romanes
52	title	1540	language	5641	Romanes
53	title	1833	language	5642	Romanian
54	title	1540	language	5642	Rumänisch
55	title	1833	language	6059	Serbian
56	title	1540	language	6059	Serbisch
57	title	1833	language	5998	Somali
58	title	1540	language	5998	Somali
59	title	1833	language	6011	Spanish
60	title	1540	language	6011	Spanisch
61	title	1833	language	6148	Swedish
62	title	1540	language	6148	Schwedisch
63	title	1833	language	6819	Urdu
64	title	1540	language	6819	Urdu
65	title	1833	language	6894	Vietnamese
66	title	1540	language	6894	Vietnamesisch
67	title	1833	language	7922	Other
68	title	1540	language	7922	Andere
69	title	1833	category	1	German Language Support
70	title	1540	category	1	Deutsche Unterstützung
71	description	1833	category	1	Fluent in German? Support refugees by teaching german at language cafes and tutoring privately or in groups.
72	description	1540	category	1	Sprichst du fließend Deutsch? Unterstütze Geflüchtete, indem du in Sprachcafés unterrichtest oder Nachhilfe gibst – privat oder in Gruppen.
73	title	1833	category	2	Childcare
74	title	1540	category	2	Kinderbetreuung
75	description	1833	category	2	We are looking for volunteers to support children in refugee accommodation centers by assisting in daycare or helping with homework. Experience with children is a plus!
76	description	1540	category	2	Hilf Kindern in Unterkünften – bei der Betreuung am Tag oder den Hausaufgaben. Erfahrung mit Kindern ist ein Plus!
77	title	1833	category	3	Skills Based Volunteering
78	title	1540	category	3	Ehrenamt mit Fachkenntnissen
79	description	1833	category	3	Some opportunities may offer a chance to use your special expertise, such as bike repair, gardening, musical skills, or organizational savvy.
80	description	1540	category	3	Nutze deine Fähigkeiten – z. B. Fahrradreparatur, Gartenarbeit oder Musik.
81	title	1833	category	4	Events
82	title	1540	category	4	Veranstaltungen
83	description	1833	category	4	Occasionally events require unique support from volunteers. These might be festivals, dinners, outings, cultural activities, a day of setting up a clothes sorting station, gardening, or a workshop.
84	description	1540	category	4	Manche Events brauchen extra Hilfe – Festivals, Ausflüge, Gartenarbeit oder Kleiderkammer einrichten.
85	title	1833	category	5	Sport activities
86	title	1540	category	5	Sportliche Aktivitäten
87	description	1833	category	5	We are always looking for volunteers either for tandem, clothes sorting or to help organize sports activities for children, teenagers or adults in accommodation centers.
88	description	1540	category	5	Hilf mit Kleiderkammer, Tandem oder Sportangebote für Kinder, Jugendliche oder Erwachsene in Unterkünften zu organisieren.
89	title	1833	category	6	Accompany a Refugee
90	title	1540	category	6	Flüchtlingen begleiten
91	description	1833	category	6	Fluent in German and a second language? Support individuals in dealing with bureaucracy at appointments - going with them to the doctor, Job Centre or otherwise.
92	description	1540	category	6	Sprichst du fließend Deutsch und eine weitere Sprache? Begleite Geflüchtete zu Ämtern, Ärzt:innen oder anderen Terminen.
93	title	1833	activity	1	Daycare
94	title	1540	activity	1	Kinderbetreuung
95	title	1833	activity	2	Sports
96	title	1540	activity	2	Sport
97	title	1833	activity	3	German language Cafe
98	title	1540	activity	3	Sprachcafé
99	title	1833	activity	4	Translation at Accommodation Centers
100	title	1540	activity	4	Sprachmittlung in Unterkünften
101	title	1833	activity	5	Fillout German forms
102	title	1540	activity	5	Ausfüllhilfe
103	title	1833	activity	6	Arts & Crafts
104	title	1540	activity	6	Basteln
105	title	1833	activity	7	Gardening
106	title	1540	activity	7	Gartenarbeit
107	title	1833	activity	8	One-day Volunteering (e.g. Festivals, Cleanups)
108	title	1540	activity	8	Eintägiges Engagement (z. B. Feier, Aufräumaktionen)
109	title	1833	activity	9	Playing board games
110	title	1540	activity	9	Brettspiele spielen
111	title	1833	activity	10	Reading books for children
112	title	1540	activity	10	Bücher vorlesen für Kinder
113	title	1833	activity	11	Activities for women
114	title	1540	activity	11	Aktivitäten für Frauen*
115	title	1833	activity	12	Activities for men
116	title	1540	activity	12	Aktivitäten für Männer*
117	title	1833	activity	13	Assist with homework
118	title	1540	activity	13	Nachhilfe
119	title	1833	activity	14	Sorting clothing
120	title	1540	activity	14	Kleiderkammer
121	title	1833	activity	15	Organizing excursions
122	title	1540	activity	15	Ausflüge organisieren
123	title	1833	activity	16	Miscellaneous
124	title	1540	activity	16	Sonstiges
125	title	1833	activity	17	Mentorship
126	title	1540	activity	17	Mentoren
127	title	1833	activity	18	Accompanying to government appointments
128	title	1540	activity	18	Begleitung: Termine bei Behörden* 
129	title	1833	activity	19	Apartment viewing accompanying
130	title	1540	activity	19	Begleitung: Wohnungsbesichtigungen
131	title	1833	activity	20	Schools meetings accompanying
132	title	1540	activity	20	Begleitung: Termine in Schulen und Kitas
133	title	1833	activity	21	Accompanying
134	title	1540	activity	21	Wegbegleitung
135	title	1833	activity	22	Accompanying to doctors' 
136	title	1540	activity	22	Begleitung: Arzttermine
137	title	1540	skill	1	Holzverarbeitung
138	title	1833	skill	1	Holzverarbeitung
139	title	1540	skill	2	Zeichnen
140	title	1833	skill	2	Zeichnen
141	title	1540	skill	3	Malen
142	title	1833	skill	3	Malen
143	title	1540	skill	4	Nähen
144	title	1833	skill	4	Nähen
145	title	1540	skill	5	Stricken
146	title	1833	skill	5	Stricken
147	title	1540	skill	6	Reparaturen
148	title	1833	skill	6	Reparaturen
149	title	1540	skill	7	Kochen
150	title	1833	skill	7	Kochen
151	title	1540	skill	8	Lehren
152	title	1833	skill	8	Lehren
153	title	1540	skill	9	Programmieren
154	title	1833	skill	9	Programmieren
155	title	1540	skill	10	Öffentliches Sprechen
156	title	1833	skill	10	Öffentliches Sprechen
157	title	1540	skill	11	Gartenarbeit
158	title	1833	skill	11	Gartenarbeit
159	title	1540	skill	12	Landschaftsgestaltung
160	title	1833	skill	12	Landschaftsgestaltung
161	title	1540	skill	13	Tischlerei
162	title	1833	skill	13	Tischlerei
163	title	1540	skill	14	Dekorieren
164	title	1833	skill	14	Dekorieren
165	title	1540	skill	15	Fahrradreparaturen
166	title	1833	skill	15	Fahrradreparaturen
167	title	1540	skill	16	Fotografie
168	title	1833	skill	16	Fotografie
169	title	1540	skill	17	Videografie
170	title	1833	skill	17	Videografie
171	title	1540	skill	18	Make-up
172	title	1833	skill	18	Make-up
173	title	1540	skill	19	Kreatives Schreiben
174	title	1833	skill	19	Kreatives Schreiben
175	title	1540	skill	20	Yoga
176	title	1833	skill	20	Yoga
177	title	1540	skill	21	Fitness
178	title	1833	skill	21	Fitness
179	title	1540	skill	22	Fußball
180	title	1833	skill	22	Fußball
181	title	1540	skill	23	Basketball
182	title	1833	skill	23	Basketball
183	title	1540	skill	24	Tanzen
184	title	1833	skill	24	Tanzen
185	title	1540	skill	25	Schach
186	title	1833	skill	25	Schach
187	title	1540	skill	26	Management
188	title	1833	skill	26	Management
189	title	1540	skill	27	Social-Media-Management (SMM)
190	title	1833	skill	27	Social-Media-Management (SMM)
191	title	1540	skill	28	Mediation
192	title	1833	skill	28	Mediation
193	title	1540	skill	29	Veranstaltungsplanung
194	title	1833	skill	29	Veranstaltungsplanung
195	title	1540	skill	30	Coaching
196	title	1833	skill	30	Coaching
197	title	1540	skill	31	Gitarre
198	title	1833	skill	31	Gitarre
199	title	1540	skill	32	Klavier
200	title	1833	skill	32	Klavier
201	title	1540	skill	33	Singen
202	title	1833	skill	33	Singen
203	title	1833	lead_from	1	Volunteering platform
204	title	1540	lead_from	1	Plattform für Freiwilligenarbeit
205	title	1833	lead_from	2	Social media
206	title	1540	lead_from	2	Soziale Medien
207	title	1833	lead_from	3	A newsletter
208	title	1540	lead_from	3	Ein Newsletter
209	title	1833	lead_from	4	Web search
210	title	1540	lead_from	4	Websuche
211	title	1833	lead_from	5	Friends
212	title	1540	lead_from	5	Freunde
213	title	1833	lead_from	6	Volunteer fair
214	title	1540	lead_from	6	Freiwilligenmesse
215	title	1833	lead_from	7	Flyer/Poster
216	title	1540	lead_from	7	Flyer/Plakat
\.


--
-- Data for Name: language; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.language (id, iso_code, title) FROM stdin;
1	aaa	Ghotuo
2	aab	Alumu-Tesu
3	aac	Ari
4	aad	Amal
5	aae	ArbÃ«reshÃ« Albanian
6	aaf	Aranadan
7	aag	Ambrak
8	aah	Abu' Arapesh
9	aai	Arifama-Miniafia
10	aak	Ankave
11	aal	Afade
12	aan	AnambÃ©
13	aao	Algerian Saharan Arabic
14	aap	ParÃ¡ ArÃ¡ra
15	aaq	Eastern Abnaki
16	aa	Afar
17	aas	AasÃ¡x
18	aat	Arvanitika Albanian
19	aau	Abau
20	aaw	Solong
21	aax	Mandobo Atas
22	aaz	Amarasi
23	aba	AbÃ©
24	abb	Bankon
25	abc	Ambala Ayta
26	abd	Manide
27	abe	Western Abnaki
28	abf	Abai Sungai
29	abg	Abaga
30	abh	Tajiki Arabic
31	abi	Abidji
32	abj	Aka-Bea
33	ab	Abkhazian
34	abl	Lampung Nyo
35	abm	Abanyom
36	abn	Abua
37	abo	Abon
38	abp	Abellen Ayta
39	abq	Abaza
40	abr	Abron
41	abs	Ambonese Malay
42	abt	Ambulas
43	abu	Abure
44	abv	Baharna Arabic
45	abw	Pal
46	abx	Inabaknon
47	aby	Aneme Wake
48	abz	Abui
49	aca	Achagua
50	acb	ÃncÃ¡
51	acd	Gikyode
52	ace	Achinese
53	acf	Saint Lucian Creole French
54	ach	Acoli
55	aci	Aka-Cari
56	ack	Aka-Kora
57	acl	Akar-Bale
58	acm	Mesopotamian Arabic
59	acn	Achang
60	acp	Eastern Acipa
61	acq	Ta'izzi-Adeni Arabic
62	acr	Achi
63	acs	AcroÃ¡
64	act	Achterhoeks
65	acu	Achuar-Shiwiar
66	acv	Achumawi
67	acw	Hijazi Arabic
68	acx	Omani Arabic
69	acy	Cypriot Arabic
70	acz	Acheron
71	ada	Adangme
72	adb	Atauran
73	add	Lidzonka
74	ade	Adele
75	adf	Dhofari Arabic
76	adg	Andegerebinha
77	adh	Adhola
78	adi	Adi
79	adj	Adioukrou
80	adl	Galo
81	adn	Adang
82	ado	Abu
83	adq	Adangbe
84	adr	Adonara
85	ads	Adamorobe Sign Language
86	adt	Adnyamathanha
87	adu	Aduge
88	adw	Amundava
89	adx	Amdo Tibetan
90	ady	Adyghe
91	adz	Adzera
92	aea	Areba
93	aeb	Tunisian Arabic
94	aec	Saidi Arabic
95	aed	Argentine Sign Language
96	aee	Northeast Pashai
97	aek	Haeke
98	ael	Ambele
99	aem	Arem
100	aen	Armenian Sign Language
101	aeq	Aer
102	aer	Eastern Arrernte
103	aes	Alsea
104	aeu	Akeu
105	aew	Ambakich
106	aey	Amele
107	aez	Aeka
108	afb	Gulf Arabic
109	afd	Andai
110	afe	Putukwam
111	afg	Afghan Sign Language
112	afh	Afrihili
113	afi	Akrukay
114	afk	Nanubae
115	afn	Defaka
116	afo	Eloyi
117	afp	Tapei
118	af	Afrikaans
119	afs	Afro-Seminole Creole
120	aft	Afitti
121	afu	Awutu
122	afz	Obokuitai
123	aga	Aguano
124	agb	Legbo
125	agc	Agatu
126	agd	Agarabi
127	age	Angal
128	agf	Arguni
129	agg	Angor
130	agh	Ngelima
131	agi	Agariya
132	agj	Argobba
133	agk	Isarog Agta
134	agl	Fembe
135	agm	Angaataha
136	agn	Agutaynen
137	ago	Tainae
138	agq	Aghem
139	agr	Aguaruna
140	ags	Esimbi
141	agt	Central Cagayan Agta
142	agu	Aguacateco
143	agv	Remontado Dumagat
144	agw	Kahua
145	agx	Aghul
146	agy	Southern Alta
147	agz	Mt. Iriga Agta
148	aha	Ahanta
149	ahb	Axamb
150	ahg	Qimant
151	ahh	Aghu
152	ahi	Tiagbamrin Aizi
153	ahk	Akha
154	ahl	Igo
155	ahm	Mobumrin Aizi
156	ahn	Ã€hÃ n
157	aho	Ahom
158	ahp	Aproumu Aizi
159	ahr	Ahirani
160	ahs	Ashe
161	aht	Ahtena
162	aia	Arosi
163	aib	Ainu (China)
164	aic	Ainbai
165	aid	Alngith
166	aie	Amara
167	aif	Agi
336	aqd	Ampari Dogon
168	aig	Antigua and Barbuda Creole English
169	aih	Ai-Cham
170	aii	Assyrian Neo-Aramaic
171	aij	Lishanid Noshan
172	aik	Ake
173	ail	Aimele
174	aim	Aimol
175	ain	Ainu (Japan)
176	aio	Aiton
177	aip	Burumakok
178	aiq	Aimaq
179	air	Airoran
180	ait	Arikem
181	aiw	Aari
182	aix	Aighon
183	aiy	Ali
184	aja	Aja (South Sudan)
185	ajg	Aja (Benin)
186	aji	AjiÃ«
187	ajn	Andajin
188	ajs	Algerian Jewish Sign Language
189	aju	Judeo-Moroccan Arabic
190	ajw	Ajawa
191	ajz	Amri Karbi
192	ak	Akan
193	akb	Batak Angkola
194	akc	Mpur
195	akd	Ukpet-Ehom
196	ake	Akawaio
197	akf	Akpa
198	akg	Anakalangu
199	akh	Angal Heneng
200	aki	Aiome
201	akj	Aka-Jeru
202	akk	Akkadian
203	akl	Aklanon
204	akm	Aka-Bo
205	ako	Akurio
206	akp	Siwu
207	akq	Ak
208	akr	Araki
209	aks	Akaselem
210	akt	Akolet
211	aku	Akum
212	akv	Akhvakh
213	akw	Akwa
214	akx	Aka-Kede
215	aky	Aka-Kol
216	akz	Alabama
217	ala	Alago
218	alc	Qawasqar
219	ald	Alladian
220	ale	Aleut
221	alf	Alege
222	alh	Alawa
223	ali	Amaimon
224	alj	Alangan
225	alk	Alak
226	all	Allar
227	alm	Amblong
228	aln	Gheg Albanian
229	alo	Larike-Wakasihu
230	alp	Alune
231	alq	Algonquin
232	alr	Alutor
233	als	Tosk Albanian
234	alt	Southern Altai
235	alu	'Are'are
236	alw	Alaba-Kâ€™abeena
237	alx	Amol
238	aly	Alyawarr
239	alz	Alur
240	ama	AmanayÃ©
241	amb	Ambo
242	amc	Amahuaca
243	ame	Yanesha'
244	amf	Hamer-Banna
245	amg	Amurdak
246	am	Amharic
247	ami	Amis
248	amj	Amdang
249	amk	Ambai
250	aml	War-Jaintia
251	amm	Ama (Papua New Guinea)
252	amn	Amanab
253	amo	Amo
254	amp	Alamblak
255	amq	Amahai
256	amr	Amarakaeri
257	ams	Southern Amami-Oshima
258	amt	Amto
259	amu	Guerrero Amuzgo
260	amv	Ambelau
261	amw	Western Neo-Aramaic
262	amx	Anmatyerre
263	amy	Ami
264	amz	Atampaya
265	ana	Andaqui
266	anb	Andoa
267	anc	Ngas
268	and	Ansus
269	ane	XÃ¢rÃ¢cÃ¹Ã¹
270	anf	Animere
271	ang	Old English (ca. 450-1100)
272	anh	Nend
273	ani	Andi
274	anj	Anor
275	ank	Goemai
276	anl	Anu-Hkongso Chin
277	anm	Anal
278	ann	Obolo
279	ano	Andoque
280	anp	Angika
281	anq	Jarawa (India)
282	anr	Andh
283	ans	Anserma
284	ant	Antakarinya
285	anu	Anuak
286	anv	Denya
287	anw	Anaang
288	anx	Andra-Hus
289	any	Anyin
290	anz	Anem
291	aoa	Angolar
292	aob	Abom
293	aoc	Pemon
294	aod	Andarum
295	aoe	Angal Enen
296	aof	Bragat
297	aog	Angoram
298	aoi	Anindilyakwa
299	aoj	Mufian
300	aok	ArhÃ¶
301	aol	Alor
302	aom	Ã–mie
303	aon	Bumbita Arapesh
304	aor	Aore
305	aos	Taikat
306	aot	Atong (India)
307	aou	A'ou
308	aox	Atorada
309	aoz	Uab Meto
310	apb	Sa'a
311	apc	Levantine Arabic
312	apd	Sudanese Arabic
313	ape	Bukiyip
314	apf	Pahanan Agta
315	apg	Ampanang
316	aph	Athpariya
317	api	ApiakÃ¡
318	apj	Jicarilla Apache
319	apk	Kiowa Apache
320	apl	Lipan Apache
321	apm	Mescalero-Chiricahua Apache
322	apn	ApinayÃ©
323	apo	Ambul
324	app	Apma
325	apq	A-Pucikwar
326	apr	Arop-Lokep
327	aps	Arop-Sissano
328	apt	Apatani
329	apu	ApurinÃ£
330	apv	Alapmunte
331	apw	Western Apache
332	apx	Aputai
333	apy	ApalaÃ­
334	apz	Safeyoka
335	aqc	Archi
337	aqg	Arigidi
338	aqk	Aninka
339	aqm	Atohwaim
340	aqn	Northern Alta
341	aqp	Atakapa
342	aqr	ArhÃ¢
343	aqt	AngaitÃ©
344	aqz	Akuntsu
345	ar	Arabic
346	arb	Standard Arabic
347	arc	Official Aramaic (700-300 BCE)
348	ard	Arabana
349	are	Western Arrarnta
350	an	Aragonese
351	arh	Arhuaco
352	ari	Arikara
353	arj	Arapaso
354	ark	ArikapÃº
355	arl	Arabela
356	arn	Mapudungun
357	aro	Araona
358	arp	Arapaho
359	arq	Algerian Arabic
360	arr	Karo (Brazil)
361	ars	Najdi Arabic
362	aru	AruÃ¡ (Amazonas State)
363	arv	Arbore
364	arw	Arawak
365	arx	AruÃ¡ (Rodonia State)
366	ary	Moroccan Arabic
367	arz	Egyptian Arabic
368	asa	Asu (Tanzania)
369	asb	Assiniboine
370	asc	Casuarina Coast Asmat
371	ase	American Sign Language
372	asf	Auslan
373	asg	Cishingini
374	ash	Abishira
375	asi	Buruwai
376	asj	Sari
377	ask	Ashkun
378	asl	Asilulu
379	as	Assamese
380	asn	XingÃº AsurinÃ­
381	aso	Dano
382	asp	Algerian Sign Language
383	asq	Austrian Sign Language
384	asr	Asuri
385	ass	Ipulo
386	ast	Asturian
387	asu	Tocantins Asurini
388	asv	Asoa
389	asw	Australian Aborigines Sign Language
390	asx	Muratayak
391	asy	Yaosakor Asmat
392	asz	As
393	ata	Pele-Ata
394	atb	Zaiwa
395	atc	Atsahuaca
396	atd	Ata Manobo
397	ate	Atemble
398	atg	Ivbie North-Okpela-Arhe
399	ati	AttiÃ©
400	atj	Atikamekw
401	atk	Ati
402	atl	Mt. Iraya Agta
403	atm	Ata
404	atn	Ashtiani
405	ato	Atong (Cameroon)
406	atp	Pudtol Atta
407	atq	Aralle-Tabulahan
408	atr	Waimiri-Atroari
409	ats	Gros Ventre
410	att	Pamplona Atta
411	atu	Reel
412	atv	Northern Altai
413	atw	Atsugewi
414	atx	Arutani
415	aty	Aneityum
416	atz	Arta
417	aua	Asumboa
418	aub	Alugu
419	auc	Waorani
420	aud	Anuta
421	aug	Aguna
422	auh	Aushi
423	aui	Anuki
424	auj	Awjilah
425	auk	Heyo
426	aul	Aulua
427	aum	Asu (Nigeria)
428	aun	Molmo One
429	auo	Auyokawa
430	aup	Makayam
431	auq	Anus
432	aur	Aruek
433	aut	Austral
434	auu	Auye
435	auw	Awyi
436	aux	AurÃ¡
437	auy	Awiyaana
438	auz	Uzbeki Arabic
439	av	Avaric
440	avb	Avau
441	avd	Alviri-Vidari
442	ae	Avestan
443	avi	Avikam
444	avk	Kotava
445	avl	Eastern Egyptian Bedawi Arabic
446	avm	Angkamuthi
447	avn	Avatime
448	avo	Agavotaguerra
449	avs	Aushiri
450	avt	Au
451	avu	Avokaya
452	avv	AvÃ¡-Canoeiro
453	awa	Awadhi
454	awb	Awa (Papua New Guinea)
455	awc	Cicipu
456	awe	AwetÃ­
457	awg	Anguthimri
458	awh	Awbono
459	awi	Aekyom
460	awk	Awabakal
461	awm	Arawum
462	awn	Awngi
463	awo	Awak
464	awr	Awera
465	aws	South Awyu
466	awt	ArawetÃ©
467	awu	Central Awyu
468	awv	Jair Awyu
469	aww	Awun
470	awx	Awara
471	awy	Edera Awyu
472	axb	Abipon
473	axe	Ayerrerenge
474	axg	Mato Grosso ArÃ¡ra
475	axk	Yaka (Central African Republic)
476	axl	Lower Southern Aranda
477	axm	Middle Armenian
478	axx	XÃ¢rÃ¢gurÃ¨
479	aya	Awar
480	ayb	Ayizo Gbe
481	ayc	Southern Aymara
482	ayd	Ayabadhu
483	aye	Ayere
484	ayg	Ginyanga
485	ayh	Hadrami Arabic
486	ayi	Leyigha
487	ayk	Akuku
488	ayl	Libyan Arabic
489	ay	Aymara
490	ayn	Sanaani Arabic
491	ayo	Ayoreo
492	ayp	North Mesopotamian Arabic
493	ayq	Ayi (Papua New Guinea)
494	ayr	Central Aymara
495	ays	Sorsogon Ayta
496	ayt	Magbukun Ayta
497	ayu	Ayu
498	ayz	Mai Brat
499	aza	Azha
500	azb	South Azerbaijani
501	azd	Eastern Durango Nahuatl
502	az	Azerbaijani
503	azg	San Pedro Amuzgos Amuzgo
504	azj	North Azerbaijani
505	azm	Ipalapa Amuzgo
506	azn	Western Durango Nahuatl
507	azo	Awing
508	azt	Faire Atta
509	azz	Highland Puebla Nahuatl
510	baa	Babatana
511	bab	Bainouk-GunyuÃ±o
512	bac	Badui
513	bae	BarÃ©
514	baf	Nubaca
515	bag	Tuki
516	bah	Bahamas Creole English
517	baj	Barakai
518	ba	Bashkir
519	bal	Baluchi
520	bm	Bambara
521	ban	Balinese
522	bao	Waimaha
523	bap	Bantawa
524	bar	Bavarian
525	bas	Basa (Cameroon)
526	bau	Bada (Nigeria)
527	bav	Vengo
528	baw	Bambili-Bambui
529	bax	Bamun
530	bay	Batuley
531	bba	Baatonum
532	bbb	Barai
533	bbc	Batak Toba
534	bbd	Bau
535	bbe	Bangba
536	bbf	Baibai
537	bbg	Barama
538	bbh	Bugan
539	bbi	Barombi
540	bbj	GhomÃ¡lÃ¡'
541	bbk	Babanki
542	bbl	Bats
543	bbm	Babango
544	bbn	Uneapa
545	bbo	Northern Bobo MadarÃ©
546	bbp	West Central Banda
547	bbq	Bamali
548	bbr	Girawa
549	bbs	Bakpinka
550	bbt	Mburku
551	bbu	Kulung (Nigeria)
552	bbv	Karnai
553	bbw	Baba
554	bbx	Bubia
555	bby	Befang
556	bca	Central Bai
557	bcb	Bainouk-Samik
558	bcc	Southern Balochi
559	bcd	North Babar
560	bce	Bamenyam
561	bcf	Bamu
562	bcg	Baga Pokur
563	bch	Bariai
564	bci	BaoulÃ©
565	bcj	Bardi
566	bck	Bunuba
567	bcl	Central Bikol
568	bcm	Bannoni
569	bcn	Bali (Nigeria)
570	bco	Kaluli
571	bcp	Bali (Democratic Republic of Congo)
572	bcq	Bench
573	bcr	Babine
574	bcs	Kohumono
575	bct	Bendi
576	bcu	Awad Bing
577	bcv	Shoo-Minda-Nye
578	bcw	Bana
579	bcy	Bacama
580	bcz	Bainouk-Gunyaamolo
581	bda	Bayot
582	bdb	Basap
583	bdc	EmberÃ¡-BaudÃ³
584	bdd	Bunama
585	bde	Bade
586	bdf	Biage
587	bdg	Bonggi
588	bdh	Baka (South Sudan)
589	bdi	Burun
590	bdj	Bai (South Sudan)
591	bdk	Budukh
592	bdl	Indonesian Bajau
593	bdm	Buduma
594	bdn	Baldemu
595	bdo	Morom
596	bdp	Bende
597	bdq	Bahnar
598	bdr	West Coast Bajau
599	bds	Burunge
600	bdt	Bokoto
601	bdu	Oroko
602	bdv	Bodo Parja
603	bdw	Baham
604	bdx	Budong-Budong
605	bdy	Bandjalang
606	bdz	Badeshi
607	bea	Beaver
608	beb	Bebele
609	bec	Iceve-Maci
610	bed	Bedoanas
611	bee	Byangsi
612	bef	Benabena
613	beg	Belait
614	beh	Biali
615	bei	Bekati'
616	bej	Beja
617	bek	Bebeli
618	be	Belarusian
619	bem	Bemba (Zambia)
620	bn	Bengali
621	beo	Beami
622	bep	Besoa
623	beq	Beembe
624	bes	Besme
625	bet	Guiberoua BÃ©te
626	beu	Blagar
627	bev	Daloa BÃ©tÃ©
628	bew	Betawi
629	bex	Jur Modo
630	bey	Beli (Papua New Guinea)
631	bez	Bena (Tanzania)
632	bfa	Bari
633	bfb	Pauri Bareli
634	bfc	Panyi Bai
635	bfd	Bafut
636	bfe	Betaf
637	bff	Bofi
638	bfg	Busang Kayan
639	bfh	Blafe
640	bfi	British Sign Language
641	bfj	Bafanji
642	bfk	Ban Khor Sign Language
643	bfl	Banda-NdÃ©lÃ©
644	bfm	Mmen
645	bfn	Bunak
646	bfo	Malba Birifor
647	bfp	Beba
648	bfq	Badaga
649	bfr	Bazigar
650	bfs	Southern Bai
651	bft	Balti
652	bfu	Gahri
653	bfw	Bondo
654	bfx	Bantayanon
655	bfy	Bagheli
656	bfz	Mahasu Pahari
657	bga	Gwamhi-Wuri
658	bgb	Bobongko
659	bgc	Haryanvi
660	bgd	Rathwi Bareli
661	bge	Bauria
662	bgf	Bangandu
663	bgg	Bugun
664	bgi	Giangan
665	bgj	Bangolan
666	bgk	Bit
667	bgl	Bo (Laos)
668	bgn	Western Balochi
669	bgo	Baga Koga
670	bgp	Eastern Balochi
671	bgq	Bagri
672	bgr	Bawm Chin
673	bgs	Tagabawa
674	bgt	Bughotu
675	bgu	Mbongno
676	bgv	Warkay-Bipim
677	bgw	Bhatri
678	bgx	Balkan Gagauz Turkish
679	bgy	Benggoi
680	bgz	Banggai
681	bha	Bharia
682	bhb	Bhili
683	bhc	Biga
684	bhd	Bhadrawahi
685	bhe	Bhaya
686	bhf	Odiai
687	bhg	Binandere
688	bhh	Bukharic
689	bhi	Bhilali
690	bhj	Bahing
691	bhl	Bimin
692	bhm	Bathari
693	bhn	Bohtan Neo-Aramaic
694	bho	Bhojpuri
695	bhp	Bima
696	bhq	Tukang Besi South
697	bhr	Bara Malagasy
698	bhs	Buwal
699	bht	Bhattiyali
700	bhu	Bhunjia
701	bhv	Bahau
702	bhw	Biak
703	bhx	Bhalay
704	bhy	Bhele
705	bhz	Bada (Indonesia)
706	bia	Badimaya
707	bib	Bissa
708	bid	Bidiyo
709	bie	Bepour
710	bif	Biafada
711	big	Biangai
712	bik	Bikol
713	bil	Bile
714	bim	Bimoba
715	bin	Bini
716	bio	Nai
717	bip	Bila
718	biq	Bipi
719	bir	Bisorio
720	bi	Bislama
721	bit	Berinomo
722	biu	Biete
723	biv	Southern Birifor
724	biw	Kol (Cameroon)
725	bix	Bijori
726	biy	Birhor
727	biz	Baloi
728	bja	Budza
729	bjb	Banggarla
730	bjc	Bariji
731	bje	Biao-Jiao Mien
732	bjf	Barzani Jewish Neo-Aramaic
733	bjg	Bidyogo
734	bjh	Bahinemo
735	bji	Burji
736	bjj	Kanauji
737	bjk	Barok
738	bjl	Bulu (Papua New Guinea)
739	bjm	Bajelani
740	bjn	Banjar
741	bjo	Mid-Southern Banda
742	bjp	Fanamaket
743	bjr	Binumarien
744	bjs	Bajan
745	bjt	Balanta-Ganja
746	bju	Busuu
747	bjv	Bedjond
748	bjw	BakwÃ©
749	bjx	Banao Itneg
750	bjy	Bayali
751	bjz	Baruga
752	bka	Kyak
753	bkc	Baka (Cameroon)
754	bkd	Binukid
755	bkf	Beeke
756	bkg	Buraka
757	bkh	Bakoko
758	bki	Baki
759	bkj	Pande
760	bkk	Brokskat
761	bkl	Berik
762	bkm	Kom (Cameroon)
763	bkn	Bukitan
764	bko	Kwa'
765	bkp	Boko (Democratic Republic of Congo)
766	bkq	BakairÃ­
767	bkr	Bakumpai
768	bks	Northern Sorsoganon
769	bkt	Boloki
770	bku	Buhid
771	bkv	Bekwarra
772	bkw	Bekwel
773	bkx	Baikeno
774	bky	Bokyi
775	bkz	Bungku
776	bla	Siksika
777	blb	Bilua
778	blc	Bella Coola
779	bld	Bolango
780	ble	Balanta-Kentohe
781	blf	Buol
782	blh	Kuwaa
783	bli	Bolia
784	blj	Bolongan
785	blk	Pa'o Karen
786	bll	Biloxi
787	blm	Beli (South Sudan)
788	bln	Southern Catanduanes Bikol
789	blo	Anii
790	blp	Blablanga
791	blq	Baluan-Pam
792	blr	Blang
793	bls	Balaesang
794	blt	Tai Dam
795	blv	Kibala
796	blw	Balangao
797	blx	Mag-Indi Ayta
798	bly	Notre
799	blz	Balantak
800	bma	Lame
801	bmb	Bembe
802	bmc	Biem
803	bmd	Baga Manduri
804	bme	Limassa
805	bmf	Bom-Kim
806	bmg	Bamwe
807	bmh	Kein
808	bmi	Bagirmi
809	bmj	Bote-Majhi
810	bmk	Ghayavi
811	bml	Bomboli
812	bmm	Northern Betsimisaraka Malagasy
813	bmn	Bina (Papua New Guinea)
814	bmo	Bambalang
815	bmp	Bulgebi
816	bmq	Bomu
817	bmr	Muinane
818	bms	Bilma Kanuri
819	bmt	Biao Mon
820	bmu	Somba-Siawari
821	bmv	Bum
822	bmw	Bomwali
823	bmx	Baimak
824	bmz	Baramu
825	bna	Bonerate
826	bnb	Bookan
827	bnc	Bontok
828	bnd	Banda (Indonesia)
829	bne	Bintauna
830	bnf	Masiwang
831	bng	Benga
832	bni	Bangi
833	bnj	Eastern Tawbuid
834	bnk	Bierebo
835	bnl	Boon
836	bnm	Batanga
837	bnn	Bunun
838	bno	Bantoanon
839	bnp	Bola
840	bnq	Bantik
841	bnr	Butmas-Tur
842	bns	Bundeli
843	bnu	Bentong
844	bnv	Bonerif
845	bnw	Bisis
846	bnx	Bangubangu
847	bny	Bintulu
848	bnz	Beezen
849	boa	Bora
850	bob	Aweer
851	bo	Tibetan
852	boe	Mundabli
853	bof	Bolon
854	bog	Bamako Sign Language
855	boh	Boma
856	boi	BarbareÃ±o
857	boj	Anjam
858	bok	Bonjo
859	bol	Bole
860	bom	Berom
861	bon	Bine
862	boo	TiemacÃ¨wÃ¨ Bozo
863	bop	Bonkiman
864	boq	Bogaya
865	bor	BorÃ´ro
866	bs	Bosnian
867	bot	Bongo
868	bou	Bondei
869	bov	Tuwuli
870	bow	Rema
871	box	Buamu
872	boy	Bodo (Central African Republic)
873	boz	TiÃ©yaxo Bozo
874	bpa	Daakaka
875	bpc	Mbuk
876	bpd	Banda-Banda
877	bpe	Bauni
878	bpg	Bonggo
879	bph	Botlikh
880	bpi	Bagupi
881	bpj	Binji
882	bpk	Orowe
883	bpl	Broome Pearling Lugger Pidgin
884	bpm	Biyom
885	bpn	Dzao Min
886	bpo	Anasi
887	bpp	Kaure
888	bpq	Banda Malay
889	bpr	Koronadal Blaan
890	bps	Sarangani Blaan
891	bpt	Barrow Point
892	bpu	Bongu
893	bpv	Bian Marind
894	bpw	Bo (Papua New Guinea)
895	bpx	Palya Bareli
896	bpy	Bishnupriya
897	bpz	Bilba
898	bqa	Tchumbuli
899	bqb	Bagusa
900	bqc	Boko (Benin)
901	bqd	Bung
902	bqf	Baga Kaloum
903	bqg	Bago-Kusuntu
904	bqh	Baima
905	bqi	Bakhtiari
906	bqj	Bandial
907	bqk	Banda-MbrÃ¨s
908	bql	Bilakura
909	bqm	Wumboko
910	bqn	Bulgarian Sign Language
911	bqo	Balo
912	bqp	Busa
913	bqq	Biritai
914	bqr	Burusu
915	bqs	Bosngun
916	bqt	Bamukumbit
917	bqu	Boguru
918	bqv	Koro Wachi
919	bqw	Buru (Nigeria)
920	bqx	Baangi
921	bqy	Bengkala Sign Language
922	bqz	Bakaka
923	bra	Braj
924	brb	Brao
925	brc	Berbice Creole Dutch
926	brd	Baraamu
927	br	Breton
928	brf	Bira
929	brg	Baure
930	brh	Brahui
931	bri	Mokpwe
932	brj	Bieria
933	brk	Birked
934	brl	Birwa
935	brm	Barambu
936	brn	Boruca
937	bro	Brokkat
938	brp	Barapasi
939	brq	Breri
940	brr	Birao
941	brs	Baras
942	brt	Bitare
943	bru	Eastern Bru
944	brv	Western Bru
945	brw	Bellari
946	brx	Bodo (India)
947	bry	Burui
948	brz	Bilbil
949	bsa	Abinomn
950	bsb	Brunei Bisaya
951	bsc	Bassari
952	bse	Wushi
953	bsf	Bauchi
954	bsg	Bashkardi
955	bsh	Kati
956	bsi	Bassossi
957	bsj	Bangwinji
958	bsk	Burushaski
959	bsl	Basa-Gumna
960	bsm	Busami
961	bsn	Barasana-Eduria
962	bso	Buso
963	bsp	Baga Sitemu
964	bsq	Bassa
965	bsr	Bassa-Kontagora
966	bss	Akoose
967	bst	Basketo
968	bsu	Bahonsuai
969	bsv	Baga SobanÃ©
970	bsw	Baiso
971	bsx	Yangkam
972	bsy	Sabah Bisaya
973	bta	Bata
974	btc	Bati (Cameroon)
975	btd	Batak Dairi
976	bte	Gamo-Ningi
977	btf	Birgit
978	btg	Gagnoa BÃ©tÃ©
979	bth	Biatah Bidayuh
980	bti	Burate
981	btj	Bacanese Malay
982	btm	Batak Mandailing
983	btn	Ratagnon
984	bto	Rinconada Bikol
985	btp	Budibud
986	btq	Batek
987	btr	Baetora
988	bts	Batak Simalungun
989	btt	Bete-Bendi
990	btu	Batu
991	btv	Bateri
992	btw	Butuanon
993	btx	Batak Karo
994	bty	Bobot
995	btz	Batak Alas-Kluet
996	bua	Buriat
997	bub	Bua
998	buc	Bushi
999	bud	Ntcham
1000	bue	Beothuk
1001	buf	Bushoong
1002	bug	Buginese
1003	buh	Younuo Bunu
1004	bui	Bongili
1005	buj	Basa-Gurmana
1006	buk	Bugawac
1007	bg	Bulgarian
1008	bum	Bulu (Cameroon)
1009	bun	Sherbro
1010	buo	Terei
1011	bup	Busoa
1012	buq	Brem
1013	bus	Bokobaru
1014	but	Bungain
1015	buu	Budu
1016	buv	Bun
1017	buw	Bubi
1018	bux	Boghom
1019	buy	Bullom So
1020	buz	Bukwen
1021	bva	Barein
1022	bvb	Bube
1023	bvc	Baelelea
1024	bvd	Baeggu
1025	bve	Berau Malay
1026	bvf	Boor
1027	bvg	Bonkeng
1028	bvh	Bure
1029	bvi	Belanda Viri
1030	bvj	Baan
1031	bvk	Bukat
1032	bvl	Bolivian Sign Language
1033	bvm	Bamunka
1034	bvn	Buna
1035	bvo	Bolgo
1036	bvp	Bumang
1037	bvq	Birri
1038	bvr	Burarra
1039	bvt	Bati (Indonesia)
1040	bvu	Bukit Malay
1041	bvv	Baniva
1042	bvw	Boga
1043	bvx	Dibole
1044	bvy	Baybayanon
1045	bvz	Bauzi
1046	bwa	Bwatoo
1047	bwb	Namosi-Naitasiri-Serua
1048	bwc	Bwile
1049	bwd	Bwaidoka
1050	bwe	Bwe Karen
1051	bwf	Boselewa
1052	bwg	Barwe
1053	bwh	Bishuo
1054	bwi	Baniwa
1055	bwj	LÃ¡Ã¡ LÃ¡Ã¡ Bwamu
1056	bwk	Bauwaki
1057	bwl	Bwela
1058	bwm	Biwat
1059	bwn	Wunai Bunu
1060	bwo	Boro (Ethiopia)
1061	bwp	Mandobo Bawah
1062	bwq	Southern Bobo MadarÃ©
1063	bwr	Bura-Pabir
1064	bws	Bomboma
1065	bwt	Bafaw-Balong
1066	bwu	Buli (Ghana)
1067	bww	Bwa
1068	bwx	Bu-Nao Bunu
1069	bwy	Cwi Bwamu
1070	bwz	Bwisi
1071	bxa	Tairaha
1072	bxb	Belanda Bor
1073	bxc	Molengue
1074	bxd	Pela
1075	bxe	Birale
1076	bxf	Bilur
1077	bxg	Bangala
1078	bxh	Buhutu
1079	bxi	Pirlatapa
1080	bxj	Bayungu
1081	bxk	Bukusu
1082	bxl	Jalkunan
1083	bxm	Mongolia Buriat
1084	bxn	Burduna
1085	bxo	Barikanchi
1086	bxp	Bebil
1087	bxq	Beele
1088	bxr	Russia Buriat
1089	bxs	Busam
1090	bxu	China Buriat
1091	bxv	Berakou
1092	bxw	Bankagooma
1093	bxz	Binahari
1094	bya	Batak
1095	byb	Bikya
1096	byc	Ubaghara
1097	byd	Benyadu'
1098	bye	Pouye
1099	byf	Bete
1100	byg	Baygo
1101	byh	Bhujel
1102	byi	Buyu
1103	byj	Bina (Nigeria)
1104	byk	Biao
1105	byl	Bayono
1106	bym	Bidjara
1107	byn	Bilin
1108	byo	Biyo
1109	byp	Bumaji
1110	byq	Basay
1111	byr	Baruya
1112	bys	Burak
1113	byt	Berti
1114	byv	Medumba
1115	byw	Belhariya
1116	byx	Qaqet
1117	byz	Banaro
1118	bza	Bandi
1119	bzb	Andio
1120	bzc	Southern Betsimisaraka Malagasy
1121	bzd	Bribri
1122	bze	Jenaama Bozo
1123	bzf	Boikin
1124	bzg	Babuza
1125	bzh	Mapos Buang
1126	bzi	Bisu
1127	bzj	Belize Kriol English
1128	bzk	Nicaragua Creole English
1129	bzl	Boano (Sulawesi)
1130	bzm	Bolondo
1131	bzn	Boano (Maluku)
1132	bzo	Bozaba
1133	bzp	Kemberano
1134	bzq	Buli (Indonesia)
1135	bzr	Biri
1136	bzs	Brazilian Sign Language
1137	bzt	Brithenig
1138	bzu	Burmeso
1139	bzv	Naami
1140	bzw	Basa (Nigeria)
1141	bzx	KÉ›lÉ›ngaxo Bozo
1142	bzy	Obanliku
1143	bzz	Evant
1144	caa	ChortÃ­
1145	cab	Garifuna
1146	cac	Chuj
1147	cad	Caddo
1148	cae	Lehar
1149	caf	Southern Carrier
1150	cag	NivaclÃ©
1151	cah	Cahuarano
1152	caj	ChanÃ©
1153	cak	Kaqchikel
1154	cal	Carolinian
1155	cam	CemuhÃ®
1156	can	Chambri
1157	cao	ChÃ¡cobo
1158	cap	Chipaya
1159	caq	Car Nicobarese
1160	car	Galibi Carib
1161	cas	TsimanÃ©
1162	ca	Catalan
1163	cav	CavineÃ±a
1164	caw	Callawalla
1165	cax	Chiquitano
1166	cay	Cayuga
1167	caz	Canichana
1168	cbb	CabiyarÃ­
1169	cbc	Carapana
1170	cbd	Carijona
1171	cbg	Chimila
1172	cbi	Chachi
1173	cbj	Ede Cabe
1174	cbk	Chavacano
1175	cbl	Bualkhaw Chin
1176	cbn	Nyahkur
1177	cbo	Izora
1178	cbq	Tsucuba
1179	cbr	Cashibo-Cacataibo
1180	cbs	Cashinahua
1181	cbt	Chayahuita
1182	cbu	Candoshi-Shapra
1183	cbv	Cacua
1184	cbw	Kinabalian
1185	cby	Carabayo
1186	ccc	Chamicuro
1187	ccd	Cafundo Creole
1188	cce	Chopi
1189	ccg	Samba Daka
1190	cch	Atsam
1191	ccj	Kasanga
1192	ccl	Cutchi-Swahili
1193	ccm	Malaccan Creole Malay
1194	cco	Comaltepec Chinantec
1195	ccp	Chakma
1196	ccr	Cacaopera
1197	cda	Choni
1198	cde	Chenchu
1199	cdf	Chiru
1200	cdh	Chambeali
1201	cdi	Chodri
1202	cdj	Churahi
1203	cdm	Chepang
1204	cdn	Chaudangsi
1205	cdo	Min Dong Chinese
1206	cdr	Cinda-Regi-Tiyal
1207	cds	Chadian Sign Language
1208	cdy	Chadong
1209	cdz	Koda
1210	cea	Lower Chehalis
1211	ceb	Cebuano
1212	ceg	Chamacoco
1213	cek	Eastern Khumi Chin
1214	cen	Cen
1215	cs	Czech
1216	cet	CentÃºÃºm
1217	cey	Ekai Chin
1218	cfa	Dijim-Bwilim
1219	cfd	Cara
1220	cfg	Como Karim
1221	cfm	Falam Chin
1222	cga	Changriwa
1223	cgc	Kagayanen
1224	cgg	Chiga
1225	cgk	Chocangacakha
1226	ch	Chamorro
1227	chb	Chibcha
1228	chc	Catawba
1229	chd	Highland Oaxaca Chontal
1230	ce	Chechen
1231	chf	Tabasco Chontal
1232	chg	Chagatai
1233	chh	Chinook
1234	chj	OjitlÃ¡n Chinantec
1235	chk	Chuukese
1236	chl	Cahuilla
1237	chm	Mari (Russia)
1238	chn	Chinook jargon
1239	cho	Choctaw
1240	chp	Chipewyan
1241	chq	Quiotepec Chinantec
1242	chr	Cherokee
1243	cht	CholÃ³n
1244	cu	Church Slavic
1245	cv	Chuvash
1246	chw	Chuwabu
1247	chx	Chantyal
1248	chy	Cheyenne
1249	chz	OzumacÃ­n Chinantec
1250	cia	Cia-Cia
1251	cib	Ci Gbe
1252	cic	Chickasaw
1253	cid	Chimariko
1254	cie	Cineni
1255	cih	Chinali
1256	cik	Chitkuli Kinnauri
1257	cim	Cimbrian
1258	cin	Cinta Larga
1259	cip	Chiapanec
1260	cir	Tiri
1261	ciw	Chippewa
1262	ciy	Chaima
1263	cja	Western Cham
1264	cje	Chru
1265	cjh	Upper Chehalis
1266	cji	Chamalal
1267	cjk	Chokwe
1268	cjm	Eastern Cham
1269	cjn	Chenapian
1270	cjo	AshÃ©ninka Pajonal
1271	cjp	CabÃ©car
1272	cjs	Shor
1273	cjv	Chuave
1274	cjy	Jinyu Chinese
1275	ckb	Central Kurdish
1276	ckh	Chak
1277	ckl	Cibak
1278	ckm	Chakavian
1279	ckn	Kaang Chin
1280	cko	Anufo
1281	ckq	Kajakse
1282	ckr	Kairak
1283	cks	Tayo
1284	ckt	Chukot
1285	cku	Koasati
1286	ckv	Kavalan
1287	ckx	Caka
1288	cky	Cakfem-Mushere
1289	ckz	Cakchiquel-QuichÃ© Mixed Language
1290	cla	Ron
1291	clc	Chilcotin
1292	cld	Chaldean Neo-Aramaic
1293	cle	Lealao Chinantec
1294	clh	Chilisso
1295	cli	Chakali
1296	clj	Laitu Chin
1297	clk	Idu-Mishmi
1298	cll	Chala
1299	clm	Clallam
1300	clo	Lowland Oaxaca Chontal
1301	cls	Classical Sanskrit
1302	clt	Lautu Chin
1303	clu	Caluyanun
1304	clw	Chulym
1305	cly	Eastern Highland Chatino
1306	cma	Maa
1307	cme	Cerma
1308	cmg	Classical Mongolian
1309	cmi	EmberÃ¡-ChamÃ­
1310	cml	Campalagian
1311	cmm	Michigamea
1312	cmn	Mandarin Chinese
1313	cmo	Central Mnong
1314	cmr	Mro-Khimi Chin
1315	cms	Messapic
1316	cmt	Camtho
1317	cna	Changthang
1318	cnb	Chinbon Chin
1319	cnc	CÃ´Ã´ng
1320	cng	Northern Qiang
1321	cnh	Hakha Chin
1322	cni	AshÃ¡ninka
1323	cnk	Khumi Chin
1324	cnl	Lalana Chinantec
1325	cno	Con
1326	cnp	Northern Ping Chinese
1327	cnq	Chung
1328	cnr	Montenegrin
1329	cns	Central Asmat
1330	cnt	Tepetotutla Chinantec
1331	cnu	Chenoua
1332	cnw	Ngawn Chin
1333	cnx	Middle Cornish
1334	coa	Cocos Islands Malay
1335	cob	Chicomuceltec
1336	coc	Cocopa
1337	cod	Cocama-Cocamilla
1338	coe	Koreguaje
1339	cof	Colorado
1340	cog	Chong
1341	coh	Chonyi-Dzihana-Kauma
1342	coj	Cochimi
1343	cok	Santa Teresa Cora
1344	col	Columbia-Wenatchi
1345	com	Comanche
1346	con	CofÃ¡n
1347	coo	Comox
1348	cop	Coptic
1349	coq	Coquille
1350	kw	Cornish
1351	co	Corsican
1352	cot	Caquinte
1353	cou	Wamey
1354	cov	Cao Miao
1355	cow	Cowlitz
1356	cox	Nanti
1357	coz	Chochotec
1358	cpa	Palantla Chinantec
1359	cpb	Ucayali-YurÃºa AshÃ©ninka
1360	cpc	AjyÃ­ninka Apurucayali
1361	cpg	Cappadocian Greek
1362	cpi	Chinese Pidgin English
1363	cpn	Cherepon
1364	cpo	Kpeego
1365	cps	Capiznon
1366	cpu	Pichis AshÃ©ninka
1367	cpx	Pu-Xian Chinese
1368	cpy	South Ucayali AshÃ©ninka
1369	cqd	Chuanqiandian Cluster Miao
1370	cra	Chara
1371	crb	Island Carib
1372	crc	Lonwolwol
1373	crd	Coeur d'Alene
1374	cr	Cree
1375	crf	Caramanta
1376	crg	Michif
1377	crh	Crimean Tatar
1378	cri	SÃ£otomense
1379	crj	Southern East Cree
1380	crk	Plains Cree
1381	crl	Northern East Cree
1382	crm	Moose Cree
1383	crn	El Nayar Cora
1384	cro	Crow
1385	crq	Iyo'wujwa Chorote
1386	crr	Carolina Algonquian
1387	crs	Seselwa Creole French
1388	crt	Iyojwa'ja Chorote
1389	crv	Chaura
1390	crw	Chrau
1391	crx	Carrier
1392	cry	Cori
1393	crz	CruzeÃ±o
1394	csa	Chiltepec Chinantec
1395	csb	Kashubian
1396	csc	Catalan Sign Language
1397	csd	Chiangmai Sign Language
1398	cse	Czech Sign Language
1399	csf	Cuba Sign Language
1400	csg	Chilean Sign Language
1401	csh	Asho Chin
1402	csi	Coast Miwok
1403	csj	Songlai Chin
1404	csk	Jola-Kasa
1405	csl	Chinese Sign Language
1406	csm	Central Sierra Miwok
1407	csn	Colombian Sign Language
1408	cso	Sochiapam Chinantec
1409	csp	Southern Ping Chinese
1410	csq	Croatia Sign Language
1411	csr	Costa Rican Sign Language
1412	css	Southern Ohlone
1413	cst	Northern Ohlone
1414	csv	Sumtu Chin
1415	csw	Swampy Cree
1416	csx	Cambodian Sign Language
1417	csy	Siyin Chin
1418	csz	Coos
1419	cta	Tataltepec Chatino
1420	ctc	Chetco
1421	ctd	Tedim Chin
1422	cte	Tepinapa Chinantec
1423	ctg	Chittagonian
1424	cth	Thaiphum Chin
1425	ctl	Tlacoatzintepec Chinantec
1426	ctm	Chitimacha
1427	ctn	Chhintange
1428	cto	EmberÃ¡-CatÃ­o
1429	ctp	Western Highland Chatino
1430	cts	Northern Catanduanes Bikol
1431	ctt	Wayanad Chetti
1432	ctu	Chol
1433	cty	Moundadan Chetty
1434	ctz	Zacatepec Chatino
1435	cua	Cua
1436	cub	Cubeo
1437	cuc	Usila Chinantec
1438	cuh	Chuka
1439	cui	Cuiba
1440	cuj	Mashco Piro
1441	cuk	San Blas Kuna
1442	cul	Culina
1443	cuo	Cumanagoto
1444	cup	CupeÃ±o
1445	cuq	Cun
1446	cur	Chhulung
1447	cut	Teutila Cuicatec
1448	cuu	Tai Ya
1449	cuv	Cuvok
1450	cuw	Chukwa
1451	cux	Tepeuxila Cuicatec
1452	cuy	Cuitlatec
1453	cvg	Chug
1454	cvn	Valle Nacional Chinantec
1455	cwa	Kabwa
1456	cwb	Maindo
1457	cwd	Woods Cree
1458	cwe	Kwere
1459	cwg	Chewong
1460	cwt	Kuwaataay
1461	cxh	Cha'ari
1462	cya	Nopala Chatino
1463	cyb	Cayubaba
1464	cy	Welsh
1465	cyo	Cuyonon
1466	czh	Huizhou Chinese
1467	czk	Knaanic
1468	czn	Zenzontepec Chatino
1469	czo	Min Zhong Chinese
1470	czt	Zotung Chin
1471	daa	DangalÃ©at
1472	dac	Dambi
1473	dad	Marik
1474	dae	Duupa
1475	dag	Dagbani
1476	dah	Gwahatike
1477	dai	Day
1478	daj	Dar Fur Daju
1479	dak	Dakota
1480	dal	Dahalo
1481	dam	Damakawa
1482	da	Danish
1483	dao	Daai Chin
1484	daq	Dandami Maria
1485	dar	Dargwa
1486	das	Daho-Doo
1487	dau	Dar Sila Daju
1488	dav	Taita
1489	daw	Davawenyo
1490	dax	Dayi
1491	daz	Dao
1492	dba	Bangime
1493	dbb	Deno
1494	dbd	Dadiya
1495	dbe	Dabe
1496	dbf	Edopi
1497	dbg	Dogul Dom Dogon
1498	dbi	Doka
1499	dbj	Ida'an
1500	dbl	Dyirbal
1501	dbm	Duguri
1502	dbn	Duriankere
1503	dbo	Dulbu
1504	dbp	Duwai
1505	dbq	Daba
1506	dbr	Dabarre
1507	dbt	Ben Tey Dogon
1508	dbu	Bondum Dom Dogon
1509	dbv	Dungu
1510	dbw	Bankan Tey Dogon
1511	dby	Dibiyaso
1512	dcc	Deccan
1513	dcr	Negerhollands
1514	dda	Dadi Dadi
1515	ddd	Dongotono
1516	dde	Doondo
1517	ddg	Fataluku
1518	ddi	West Goodenough
1519	ddj	Jaru
1520	ddn	Dendi (Benin)
1521	ddo	Dido
1522	ddr	Dhudhuroa
1523	dds	Donno So Dogon
1524	ddw	Dawera-Daweloor
1525	dec	Dagik
1526	ded	Dedua
1527	dee	Dewoin
1528	def	Dezfuli
1529	deg	Degema
1530	deh	Dehwari
1531	dei	Demisa
1532	dek	Dek
1533	del	Delaware
1534	dem	Dem
1535	den	Slave (Athapascan)
1536	dep	Pidgin Delaware
1537	deq	Dendi (Central African Republic)
1538	der	Deori
1539	des	Desano
1540	de	German
1541	dev	Domung
1542	dez	Dengese
1543	dga	Southern Dagaare
1544	dgb	Bunoge Dogon
1545	dgc	Casiguran Dumagat Agta
1546	dgd	Dagaari Dioula
1547	dge	Degenan
1548	dgg	Doga
1549	dgh	Dghwede
1550	dgi	Northern Dagara
1551	dgk	Dagba
1552	dgl	Andaandi
1553	dgn	Dagoman
1554	dgo	Dogri (individual language)
1555	dgr	Tlicho
1556	dgs	Dogoso
1557	dgt	Ndra'ngith
1558	dgw	Daungwurrung
1559	dgx	Doghoro
1560	dgz	Daga
1561	dhd	Dhundari
1562	dhg	Dhangu-Djangu
1563	dhi	Dhimal
1564	dhl	Dhalandji
1565	dhm	Zemba
1566	dhn	Dhanki
1567	dho	Dhodia
1568	dhr	Dhargari
1569	dhs	Dhaiso
1570	dhu	Dhurga
1571	dhv	Dehu
1572	dhw	Dhanwar (Nepal)
1573	dhx	Dhungaloo
1574	dia	Dia
1575	dib	South Central Dinka
1576	dic	Lakota Dida
1577	did	Didinga
1578	dif	Dieri
1579	dig	Digo
1580	dih	Kumiai
1581	dii	Dimbong
1582	dij	Dai
1583	dik	Southwestern Dinka
1584	dil	Dilling
1585	dim	Dime
1586	din	Dinka
1587	dio	Dibo
1588	dip	Northeastern Dinka
1589	diq	Dimli (individual language)
1590	dir	Dirim
1591	dis	Dimasa
1592	diu	Diriku
1593	dv	Dhivehi
1594	diw	Northwestern Dinka
1595	dix	Dixon Reef
1596	diy	Diuwe
1597	diz	Ding
1598	dja	Djadjawurrung
1599	djb	Djinba
1600	djc	Dar Daju Daju
1601	djd	Djamindjung
1602	dje	Zarma
1603	djf	Djangun
1604	dji	Djinang
1605	djj	Djeebbana
1606	djk	Eastern Maroon Creole
1607	djm	Jamsay Dogon
1608	djn	Jawoyn
1609	djo	Jangkang
1610	djr	Djambarrpuyngu
1611	dju	Kapriman
1612	djw	Djawi
1613	dka	Dakpakha
1614	dkg	Kadung
1615	dkk	Dakka
1616	dkr	Kuijau
1617	dks	Southeastern Dinka
1618	dkx	Mazagway
1619	dlg	Dolgan
1620	dlk	Dahalik
1621	dlm	Dalmatian
1622	dln	Darlong
1623	dma	Duma
1624	dmb	Mombo Dogon
1625	dmc	Gavak
1626	dmd	Madhi Madhi
1627	dme	Dugwor
1628	dmf	Medefaidrin
1629	dmg	Upper Kinabatangan
1630	dmk	Domaaki
1631	dml	Dameli
1632	dmm	Dama
1633	dmo	Kemedzung
1634	dmr	East Damar
1635	dms	Dampelas
1636	dmu	Dubu
1637	dmv	Dumpas
1638	dmw	Mudburra
1639	dmx	Dema
1640	dmy	Demta
1641	dna	Upper Grand Valley Dani
1642	dnd	Daonda
1643	dne	Ndendeule
1644	dng	Dungan
1645	dni	Lower Grand Valley Dani
1646	dnj	Dan
1647	dnk	Dengka
1648	dnn	DzÃ¹Ã¹ngoo
1649	dno	Ndrulo
1650	dnr	Danaru
1651	dnt	Mid Grand Valley Dani
1652	dnu	Danau
1653	dnv	Danu
1654	dnw	Western Dani
1655	dny	DenÃ­
1656	doa	Dom
1657	dob	Dobu
1658	doc	Northern Dong
1659	doe	Doe
1660	dof	Domu
1661	doh	Dong
1662	doi	Dogri (macrolanguage)
1663	dok	Dondo
1664	dol	Doso
1665	don	Toura (Papua New Guinea)
1666	doo	Dongo
1667	dop	Lukpa
1668	doq	Dominican Sign Language
1669	dor	Dori'o
1670	dos	DogosÃ©
1671	dot	Dass
1672	dov	Dombe
1673	dow	Doyayo
1674	dox	Bussa
1675	doy	Dompo
1676	doz	Dorze
1677	dpp	Papar
1678	drb	Dair
1679	drc	Minderico
1680	drd	Darmiya
1681	dre	Dolpo
1682	drg	Rungus
1683	dri	C'Lela
1684	drl	Paakantyi
1685	drn	West Damar
1686	dro	Daro-Matu Melanau
1687	drq	Dura
1688	drs	Gedeo
1689	drt	Drents
1690	dru	Rukai
1691	dry	Darai
1692	dsb	Lower Sorbian
1693	dse	Dutch Sign Language
1694	dsh	Daasanach
1695	dsi	Disa
1696	dsk	Dokshi
1697	dsl	Danish Sign Language
1698	dsn	Dusner
1699	dso	Desiya
1700	dsq	Tadaksahak
1701	dsz	Mardin Sign Language
1702	dta	Daur
1703	dtb	Labuk-Kinabatangan Kadazan
1704	dtd	Ditidaht
1705	dth	Adithinngithigh
1706	dti	Ana Tinga Dogon
1707	dtk	Tene Kan Dogon
1708	dtm	Tomo Kan Dogon
1709	dtn	DaatsÊ¼iÌin
1710	dto	Tommo So Dogon
1711	dtp	Kadazan Dusun
1712	dtr	Lotud
1713	dts	Toro So Dogon
1714	dtt	Toro Tegu Dogon
1715	dtu	Tebul Ure Dogon
1716	dty	Dotyali
1717	dua	Duala
1718	dub	Dubli
1719	duc	Duna
1720	due	Umiray Dumaget Agta
1721	duf	Dumbea
1722	dug	Duruma
1723	duh	Dungra Bhil
1724	dui	Dumun
1725	duk	Uyajitaya
1726	dul	Alabat Island Agta
1727	dum	Middle Dutch (ca. 1050-1350)
1728	dun	Dusun Deyah
1729	duo	Dupaninan Agta
1730	dup	Duano
1731	duq	Dusun Malang
1732	dur	Dii
1733	dus	Dumi
1734	duu	Drung
1735	duv	Duvle
1736	duw	Dusun Witu
1737	dux	Duungooma
1738	duy	Dicamay Agta
1739	duz	Duli-Gey
1740	dva	Duau
1741	dwa	Diri
1742	dwk	Dawik Kui
1743	dwr	Dawro
1744	dws	Dutton World Speedwords
1745	dwu	Dhuwal
1746	dww	Dawawa
1747	dwy	Dhuwaya
1748	dwz	Dewas Rai
1749	dya	Dyan
1750	dyb	Dyaberdyaber
1751	dyd	Dyugun
1752	dyg	Villa Viciosa Agta
1753	dyi	Djimini Senoufo
1754	dym	Yanda Dom Dogon
1755	dyn	Dyangadi
1756	dyo	Jola-Fonyi
1757	dyr	Dyarim
1758	dyu	Dyula
1759	dyy	Djabugay
1760	dza	Tunzu
1761	dzd	Daza
1762	dze	Djiwarli
1763	dzg	Dazaga
1764	dzl	Dzalakha
1765	dzn	Dzando
1766	dz	Dzongkha
1767	eaa	Karenggapa
1768	ebc	Beginci
1769	ebg	Ebughu
1770	ebk	Eastern Bontok
1771	ebo	Teke-Ebo
1772	ebr	EbriÃ©
1773	ebu	Embu
1774	ecr	Eteocretan
1775	ecs	Ecuadorian Sign Language
1776	ecy	Eteocypriot
1777	eee	E
1778	efa	Efai
1779	efe	Efe
1780	efi	Efik
1781	ega	Ega
1782	egl	Emilian
1783	egm	Benamanga
1784	ego	Eggon
1785	egy	Egyptian (Ancient)
1786	ehs	Miyakubo Sign Language
1787	ehu	Ehueun
1788	eip	Eipomek
1789	eit	Eitiep
1790	eiv	Askopan
1791	eja	Ejamat
1792	eka	Ekajuk
1793	eke	Ekit
1794	ekg	Ekari
1795	eki	Eki
1796	ekk	Standard Estonian
1797	ekl	Kol (Bangladesh)
1798	ekm	Elip
1799	eko	Koti
1800	ekp	Ekpeye
1801	ekr	Yace
1802	eky	Eastern Kayah
1803	ele	Elepi
1804	elh	El Hugeirat
1805	eli	Nding
1806	elk	Elkei
1807	el	Modern Greek (1453-)
1808	elm	Eleme
1809	elo	El Molo
1810	elu	Elu
1811	elx	Elamite
1812	ema	Emai-Iuleha-Ora
1813	emb	Embaloh
1814	eme	Emerillon
1815	emg	Eastern Meohang
1816	emi	Mussau-Emira
1817	emk	Eastern Maninkakan
1818	emm	Mamulique
1819	emn	Eman
1820	emp	Northern EmberÃ¡
1821	emq	Eastern Minyag
1822	ems	Pacific Gulf Yupik
1823	emu	Eastern Muria
1824	emw	Emplawas
1825	emx	Erromintxela
1826	emy	Epigraphic Mayan
1827	emz	Mbessa
1828	ena	Apali
1829	enb	Markweeta
1830	enc	En
1831	end	Ende
1832	enf	Forest Enets
1833	en	English
1834	enh	Tundra Enets
1835	enl	Enlhet
1836	enm	Middle English (1100-1500)
1837	enn	Engenni
1838	eno	Enggano
1839	enq	Enga
1840	enr	Emumu
1841	enu	Enu
1842	env	Enwan (Edo State)
1843	enw	Enwan (Akwa Ibom State)
1844	enx	Enxet
1845	eot	Beti (CÃ´te d'Ivoire)
1846	epi	Epie
1847	eo	Esperanto
1848	era	Eravallan
1849	erg	Sie
1850	erh	Eruwa
1851	eri	Ogea
1852	erk	South Efate
1853	ero	Horpa
1854	err	Erre
1855	ers	Ersu
1856	ert	Eritai
1857	erw	Erokwanas
1858	ese	Ese Ejja
1859	esg	Aheri Gondi
1860	esh	Eshtehardi
1861	esi	North Alaskan Inupiatun
1862	esk	Northwest Alaska Inupiatun
1863	esl	Egypt Sign Language
1864	esm	Esuma
1865	esn	Salvadoran Sign Language
1866	eso	Estonian Sign Language
1867	esq	Esselen
1868	ess	Central Siberian Yupik
1869	et	Estonian
1870	esu	Central Yupik
1871	esy	Eskayan
1872	etb	Etebi
1873	etc	Etchemin
1874	eth	Ethiopian Sign Language
1875	etn	Eton (Vanuatu)
1876	eto	Eton (Cameroon)
1877	etr	Edolo
1878	ets	Yekhee
1879	ett	Etruscan
1880	etu	Ejagham
1881	etx	Eten
1882	etz	Semimi
1883	eud	Eudeve
1884	eu	Basque
1885	eve	Even
1886	evh	Uvbie
1887	evn	Evenki
1888	ee	Ewe
1889	ewo	Ewondo
1890	ext	Extremaduran
1891	eya	Eyak
1892	eyo	Keiyo
1893	eza	Ezaa
1894	eze	Uzekwe
1895	faa	Fasu
1896	fab	Fa d'Ambu
1897	fad	Wagi
1898	faf	Fagani
1899	fag	Finongan
1900	fah	Baissa Fali
1901	fai	Faiwol
1902	faj	Faita
1903	fak	Fang (Cameroon)
1904	fal	South Fali
1905	fam	Fam
1906	fan	Fang (Equatorial Guinea)
1907	fo	Faroese
1908	fap	Paloor
1909	far	Fataleka
1910	fa	Persian
1911	fat	Fanti
1912	fau	Fayu
1913	fax	Fala
1914	fay	Southwestern Fars
1915	faz	Northwestern Fars
1916	fbl	West Albay Bikol
1917	fcs	Quebec Sign Language
1918	fer	Feroge
1919	ffi	Foia Foia
1920	ffm	Maasina Fulfulde
1921	fgr	Fongoro
1922	fia	Nobiin
1923	fie	Fyer
1924	fif	Faifi
1925	fj	Fijian
1926	fil	Filipino
1927	fi	Finnish
1928	fip	Fipa
1929	fir	Firan
1930	fit	Tornedalen Finnish
1931	fiw	Fiwaga
1932	fkk	Kirya-KonzÉ™l
1933	fkv	Kven Finnish
1934	fla	Kalispel-Pend d'Oreille
1935	flh	Foau
1936	fli	Fali
1937	fll	North Fali
1938	fln	Flinders Island
1939	flr	Fuliiru
1940	fly	Flaaitaal
1941	fmp	Fe'fe'
1942	fmu	Far Western Muria
1943	fnb	Fanbak
1944	fng	Fanagalo
1945	fni	Fania
1946	fod	Foodo
1947	foi	Foi
1948	fom	Foma
1949	fon	Fon
1950	for	Fore
1951	fos	Siraya
1952	fpe	Fernando Po Creole English
1953	fqs	Fas
1954	fr	French
1955	frc	Cajun French
1956	frd	Fordata
1957	frk	Frankish
1958	frm	Middle French (ca. 1400-1600)
1959	fro	Old French (842-ca. 1400)
1960	frp	Arpitan
1961	frq	Forak
1962	frr	Northern Frisian
1963	frs	Eastern Frisian
1964	frt	Fortsenal
1965	fy	Western Frisian
1966	fse	Finnish Sign Language
1967	fsl	French Sign Language
1968	fss	Finland-Swedish Sign Language
1969	fub	Adamawa Fulfulde
1970	fuc	Pulaar
1971	fud	East Futuna
1972	fue	Borgu Fulfulde
1973	fuf	Pular
1974	fuh	Western Niger Fulfulde
1975	fui	Bagirmi Fulfulde
1976	fuj	Ko
1977	ff	Fulah
1978	fum	Fum
1979	fun	FulniÃ´
1980	fuq	Central-Eastern Niger Fulfulde
1981	fur	Friulian
1982	fut	Futuna-Aniwa
1983	fuu	Furu
1984	fuv	Nigerian Fulfulde
1985	fuy	Fuyug
1986	fvr	Fur
1987	fwa	FwÃ¢i
1988	fwe	Fwe
1989	gaa	Ga
1990	gab	Gabri
1991	gac	Mixed Great Andamanese
1992	gad	Gaddang
1993	gae	Guarequena
1994	gaf	Gende
1995	gag	Gagauz
1996	gah	Alekano
1997	gai	Borei
1998	gaj	Gadsup
1999	gak	Gamkonora
2000	gal	Galolen
2001	gam	Kandawo
2002	gan	Gan Chinese
2003	gao	Gants
2004	gap	Gal
2005	gaq	Gata'
2006	gar	Galeya
2007	gas	Adiwasi Garasia
2008	gat	Kenati
2009	gau	Mudhili Gadaba
2010	gaw	Nobonob
2011	gax	Borana-Arsi-Guji Oromo
2012	gay	Gayo
2013	gaz	West Central Oromo
2014	gba	Gbaya (Central African Republic)
2015	gbb	Kaytetye
2016	gbd	Karajarri
2017	gbe	Niksek
2018	gbf	Gaikundi
2019	gbg	Gbanziri
2020	gbh	Defi Gbe
2021	gbi	Galela
2022	gbj	Bodo Gadaba
2023	gbk	Gaddi
2024	gbl	Gamit
2025	gbm	Garhwali
2026	gbn	Mo'da
2027	gbo	Northern Grebo
2028	gbp	Gbaya-Bossangoa
2029	gbq	Gbaya-Bozoum
2030	gbr	Gbagyi
2031	gbs	Gbesi Gbe
2032	gbu	Gagadu
2033	gbv	Gbanu
2034	gbw	Gabi-Gabi
2035	gbx	Eastern Xwla Gbe
2036	gby	Gbari
2037	gbz	Zoroastrian Dari
2038	gcc	Mali
2039	gcd	Ganggalida
2040	gce	Galice
2041	gcf	Guadeloupean Creole French
2042	gcl	Grenadian Creole English
2043	gcn	Gaina
2044	gcr	Guianese Creole French
2045	gct	Colonia Tovar German
2046	gda	Gade Lohar
2047	gdb	Pottangi Ollar Gadaba
2048	gdc	Gugu Badhun
2049	gdd	Gedaged
2050	gde	Gude
2051	gdf	Guduf-Gava
2052	gdg	Ga'dang
2053	gdh	Gadjerawang
2054	gdi	Gundi
2055	gdj	Gurdjar
2056	gdk	Gadang
2057	gdl	Dirasha
2058	gdm	Laal
2059	gdn	Umanakaina
2060	gdo	Ghodoberi
2061	gdq	Mehri
2062	gdr	Wipi
2063	gds	Ghandruk Sign Language
2064	gdt	Kungardutyi
2065	gdu	Gudu
2066	gdx	Godwari
2067	gea	Geruma
2068	geb	Kire
2069	gec	Gboloo Grebo
2070	ged	Gade
2071	gef	Gerai
2072	geg	Gengle
2073	geh	Hutterite German
2074	gei	Gebe
2075	gej	Gen
2076	gek	Ywom
2077	gel	ut-Ma'in
2078	geq	Geme
2079	ges	Geser-Gorom
2080	gev	Eviya
2081	gew	Gera
2082	gex	Garre
2083	gey	Enya
2084	gez	Geez
2085	gfk	Patpatar
2086	gft	Gafat
2087	gga	Gao
2088	ggb	Gbii
2089	ggd	Gugadj
2090	gge	Gurr-goni
2091	ggg	Gurgula
2092	ggk	Kungarakany
2093	ggl	Ganglau
2094	ggt	Gitua
2095	ggu	Gagu
2096	ggw	Gogodala
2097	gha	GhadamÃ¨s
2098	ghc	Hiberno-Scottish Gaelic
2099	ghe	Southern Ghale
2100	ghh	Northern Ghale
2101	ghk	Geko Karen
2102	ghl	Ghulfan
2103	ghn	Ghanongga
2104	gho	Ghomara
2105	ghr	Ghera
2106	ghs	Guhu-Samane
2107	ght	Kuke
2108	gia	Kija
2109	gib	Gibanawa
2110	gic	Gail
2111	gid	Gidar
2112	gie	GaÉ“ogbo
2113	gig	Goaria
2114	gih	Githabul
2115	gii	Girirra
2116	gil	Gilbertese
2117	gim	Gimi (Eastern Highlands)
2118	gin	Hinukh
2119	gip	Gimi (West New Britain)
2120	giq	Green Gelao
2121	gir	Red Gelao
2122	gis	North Giziga
2123	git	Gitxsan
2124	giu	Mulao
2125	giw	White Gelao
2126	gix	Gilima
2127	giy	Giyug
2128	giz	South Giziga
2129	gjk	Kachi Koli
2130	gjm	Gunditjmara
2131	gjn	Gonja
2132	gjr	Gurindji Kriol
2133	gju	Gujari
2134	gka	Guya
2135	gkd	MagÉ¨ (Madang Province)
2136	gke	Ndai
2137	gkn	Gokana
2138	gko	Kok-Nar
2139	gkp	Guinea Kpelle
2140	gku	Ç‚Ungkue
2141	gd	Scottish Gaelic
2142	glb	Belning
2143	glc	Bon Gula
2144	gld	Nanai
2145	ga	Irish
2146	gl	Galician
2147	glh	Northwest Pashai
2148	glj	Gula Iro
2149	glk	Gilaki
2150	gll	Garlali
2151	glo	Galambu
2152	glr	Glaro-Twabo
2153	glu	Gula (Chad)
2154	gv	Manx
2155	glw	Glavda
2156	gly	Gule
2157	gma	Gambera
2158	gmb	Gula'alaa
2159	gmd	MÃ¡ghdÃ¬
2160	gmg	MagÉ¨yi
2161	gmh	Middle High German (ca. 1050-1500)
2162	gml	Middle Low German
2163	gmm	Gbaya-Mbodomo
2164	gmn	Gimnime
2165	gmr	Mirning
2166	gmu	Gumalu
2167	gmv	Gamo
2168	gmx	Magoma
2169	gmy	Mycenaean Greek
2170	gmz	Mgbolizhia
2171	gna	Kaansa
2172	gnb	Gangte
2173	gnc	Guanche
2174	gnd	Zulgo-Gemzek
2175	gne	Ganang
2176	gng	Ngangam
2177	gnh	Lere
2178	gni	Gooniyandi
2179	gnj	Ngen
2180	gnk	ÇGana
2181	gnl	Gangulu
2182	gnm	Ginuman
2183	gnn	Gumatj
2184	gno	Northern Gondi
2185	gnq	Gana
2186	gnr	Gureng Gureng
2187	gnt	Guntai
2188	gnu	Gnau
2189	gnw	Western Bolivian GuaranÃ­
2190	gnz	Ganzi
2191	goa	Guro
2192	gob	Playero
2193	goc	Gorakor
2194	god	GodiÃ©
2195	goe	Gongduk
2196	gof	Gofa
2197	gog	Gogo
2198	goh	Old High German (ca. 750-1050)
2199	goi	Gobasi
2200	goj	Gowlan
2201	gok	Gowli
2202	gol	Gola
2203	gom	Goan Konkani
2204	gon	Gondi
2205	goo	Gone Dau
2206	gop	Yeretuar
2207	goq	Gorap
2208	gor	Gorontalo
2209	gos	Gronings
2210	got	Gothic
2211	gou	Gavar
2212	gov	Goo
2213	gow	Gorowa
2214	gox	Gobu
2215	goy	Goundo
2216	goz	Gozarkhani
2217	gpa	Gupa-Abawa
2218	gpe	Ghanaian Pidgin English
2219	gpn	Taiap
2220	gqa	Ga'anda
2221	gqi	Guiqiong
2222	gqn	Guana (Brazil)
2223	gqr	Gor
2224	gqu	Qau
2225	gra	Rajput Garasia
2226	grb	Grebo
2227	grc	Ancient Greek (to 1453)
2228	grd	Guruntum-Mbaaru
2229	grg	Madi
2230	grh	Gbiri-Niragu
2231	gri	Ghari
2232	grj	Southern Grebo
2233	grm	Kota Marudu Talantang
2234	gn	Guarani
2235	gro	Groma
2236	grq	Gorovu
2237	grr	Taznatit
2238	grs	Gresi
2239	grt	Garo
2240	gru	Kistane
2241	grv	Central Grebo
2242	grw	Gweda
2243	grx	Guriaso
2244	gry	Barclayville Grebo
2245	grz	Guramalum
2246	gse	Ghanaian Sign Language
2247	gsg	German Sign Language
2248	gsl	Gusilay
2249	gsm	Guatemalan Sign Language
2250	gsn	Nema
2251	gso	Southwest Gbaya
2252	gsp	Wasembo
2253	gss	Greek Sign Language
2254	gsw	Swiss German
2255	gta	GuatÃ³
2256	gtu	Aghu-Tharnggala
2257	gua	Shiki
2258	gub	GuajajÃ¡ra
2259	guc	Wayuu
2260	gud	YocobouÃ© Dida
2261	gue	Gurindji
2262	guf	Gupapuyngu
2263	gug	Paraguayan GuaranÃ­
2264	guh	Guahibo
2265	gui	Eastern Bolivian GuaranÃ­
2266	gu	Gujarati
2267	guk	Gumuz
2268	gul	Sea Island Creole English
2269	gum	Guambiano
2270	gun	MbyÃ¡ GuaranÃ­
2271	guo	Guayabero
2272	gup	Gunwinggu
2273	guq	AchÃ©
2274	gur	Farefare
2275	gus	Guinean Sign Language
2276	gut	MalÃ©ku JaÃ­ka
2277	guu	YanomamÃ¶
2278	guw	Gun
2279	gux	GourmanchÃ©ma
2280	guz	Gusii
2281	gva	Guana (Paraguay)
2282	gvc	Guanano
2283	gve	Duwet
2284	gvf	Golin
2285	gvj	GuajÃ¡
2286	gvl	Gulay
2287	gvm	Gurmana
2288	gvn	Kuku-Yalanji
2289	gvo	GaviÃ£o Do JiparanÃ¡
2290	gvp	ParÃ¡ GaviÃ£o
2291	gvr	Gurung
2292	gvs	Gumawana
2293	gvy	Guyani
2294	gwa	Mbato
2295	gwb	Gwa
2296	gwc	Gawri
2297	gwd	Gawwada
2298	gwe	Gweno
2299	gwf	Gowro
2300	gwg	Moo
2301	gwi	GwichÊ¼in
2302	gwj	Ç€Gwi
2303	gwm	Awngthim
2304	gwn	Gwandara
2305	gwr	Gwere
2306	gwt	Gawar-Bati
2307	gwu	Guwamu
2308	gww	Kwini
2309	gwx	Gua
2310	gxx	WÃ¨ Southern
2311	gya	Northwest Gbaya
2312	gyb	Garus
2313	gyd	Kayardild
2314	gye	Gyem
2315	gyf	Gungabula
2316	gyg	Gbayi
2317	gyi	Gyele
2318	gyl	Gayil
2319	gym	NgÃ¤bere
2320	gyn	Guyanese Creole English
2321	gyo	Gyalsumdo
2322	gyr	Guarayu
2323	gyy	Gunya
2324	gyz	Geji
2325	gza	Ganza
2326	gzi	Gazi
2327	gzn	Gane
2328	haa	Han
2329	hab	Hanoi Sign Language
2330	hac	Gurani
2331	had	Hatam
2332	hae	Eastern Oromo
2333	haf	Haiphong Sign Language
2334	hag	Hanga
2335	hah	Hahon
2336	hai	Haida
2337	haj	Hajong
2338	hak	Hakka Chinese
2339	hal	Halang
2340	ham	Hewa
2341	han	Hangaza
2342	hao	HakÃ¶
2343	hap	Hupla
2344	haq	Ha
2345	har	Harari
2346	has	Haisla
2347	ht	Haitian
2348	ha	Hausa
2349	hav	Havu
2350	haw	Hawaiian
2351	hax	Southern Haida
2352	hay	Haya
2353	haz	Hazaragi
2354	hba	Hamba
2355	hbb	Huba
2356	hbn	Heiban
2357	hbo	Ancient Hebrew
2358	sh	Serbo-Croatian
2359	hbu	Habu
2360	hca	Andaman Creole Hindi
2361	hch	Huichol
2362	hdn	Northern Haida
2363	hds	Honduras Sign Language
2364	hdy	Hadiyya
2365	hea	Northern Qiandong Miao
2366	he	Hebrew
2367	hed	HerdÃ©
2368	heg	Helong
2369	heh	Hehe
2370	hei	Heiltsuk
2371	hem	Hemba
2372	hz	Herero
2373	hgm	HaiÇom
2374	hgw	Haigwai
2375	hhi	Hoia Hoia
2376	hhr	Kerak
2377	hhy	Hoyahoya
2378	hia	Lamang
2379	hib	Hibito
2380	hid	Hidatsa
2381	hif	Fiji Hindi
2382	hig	Kamwe
2383	hih	Pamosu
2384	hii	Hinduri
2385	hij	Hijuk
2386	hik	Seit-Kaitetu
2387	hil	Hiligaynon
2388	hi	Hindi
2389	hio	Tsoa
2390	hir	HimarimÃ£
2391	hit	Hittite
2392	hiw	Hiw
2393	hix	HixkaryÃ¡na
2394	hji	Haji
2395	hka	Kahe
2396	hke	Hunde
2397	hkh	Khah
2398	hkk	Hunjara-Kaina Ke
2399	hkn	Mel-Khaonh
2400	hks	Hong Kong Sign Language
2401	hla	Halia
2402	hlb	Halbi
2403	hld	Halang Doan
2404	hle	Hlersu
2405	hlt	Matu Chin
2406	hlu	Hieroglyphic Luwian
2407	hma	Southern Mashan Hmong
2408	hmb	Humburi Senni Songhay
2409	hmc	Central Huishui Hmong
2410	hmd	Large Flowery Miao
2411	hme	Eastern Huishui Hmong
2412	hmf	Hmong Don
2413	hmg	Southwestern Guiyang Hmong
2414	hmh	Southwestern Huishui Hmong
2415	hmi	Northern Huishui Hmong
2416	hmj	Ge
2417	hmk	Maek
2418	hml	Luopohe Hmong
2419	hmm	Central Mashan Hmong
2420	hmn	Hmong
2421	ho	Hiri Motu
2422	hmp	Northern Mashan Hmong
2423	hmq	Eastern Qiandong Miao
2424	hmr	Hmar
2425	hms	Southern Qiandong Miao
2426	hmt	Hamtai
2427	hmu	Hamap
2428	hmv	Hmong DÃ´
2429	hmw	Western Mashan Hmong
2430	hmy	Southern Guiyang Hmong
2431	hmz	Hmong Shua
2432	hna	Mina (Cameroon)
2433	hnd	Southern Hindko
2434	hne	Chhattisgarhi
2435	hng	Hungu
2436	hnh	ÇAni
2437	hni	Hani
2438	hnj	Hmong Njua
2439	hnn	Hanunoo
2440	hno	Northern Hindko
2441	hns	Caribbean Hindustani
2442	hnu	Hung
2443	hoa	Hoava
2444	hob	Mari (Madang Province)
2445	hoc	Ho
2446	hod	Holma
2447	hoe	Horom
2448	hoh	HobyÃ³t
2449	hoi	Holikachuk
2450	hoj	Hadothi
2451	hol	Holu
2452	hom	Homa
2453	hoo	Holoholo
2454	hop	Hopi
2455	hor	Horo
2456	hos	Ho Chi Minh City Sign Language
2457	hot	Hote
2458	hov	Hovongan
2459	how	Honi
2460	hoy	Holiya
2461	hoz	Hozo
2462	hpo	Hpon
2463	hps	Hawai'i Sign Language (HSL)
2464	hra	Hrangkhol
2465	hrc	Niwer Mil
2466	hre	Hre
2467	hrk	Haruku
2468	hrm	Horned Miao
2469	hro	Haroi
2470	hrp	Nhirrpi
2471	hrt	HÃ©rtevin
2472	hru	Hruso
2473	hr	Croatian
2474	hrw	Warwar Feni
2475	hrx	Hunsrik
2476	hrz	Harzani
2477	hsb	Upper Sorbian
2478	hsh	Hungarian Sign Language
2479	hsl	Hausa Sign Language
2480	hsn	Xiang Chinese
2481	hss	Harsusi
2482	hti	Hoti
2483	hto	Minica Huitoto
2484	hts	Hadza
2485	htu	Hitu
2486	htx	Middle Hittite
2487	hub	Huambisa
2488	huc	Ç‚Hua
2489	hud	Huaulu
2490	hue	San Francisco Del Mar Huave
2491	huf	Humene
2492	hug	Huachipaeri
2493	huh	Huilliche
2494	hui	Huli
2495	huj	Northern Guiyang Hmong
2496	huk	Hulung
2497	hul	Hula
2498	hum	Hungana
2499	hu	Hungarian
2500	huo	Hu
2501	hup	Hupa
2502	huq	Tsat
2503	hur	Halkomelem
2504	hus	Huastec
2505	hut	Humla
2506	huu	Murui Huitoto
2507	huv	San Mateo Del Mar Huave
2508	huw	Hukumina
2509	hux	NÃ¼pode Huitoto
2510	huy	HulaulÃ¡
2511	huz	Hunzib
2512	hvc	Haitian Vodoun Culture Language
2513	hve	San Dionisio Del Mar Huave
2514	hvk	Haveke
2515	hvn	Sabu
2516	hvv	Santa MarÃ­a Del Mar Huave
2517	hwa	WanÃ©
2518	hwc	Hawai'i Creole English
2519	hwo	Hwana
2520	hya	Hya
2521	hy	Armenian
2522	hyw	Western Armenian
2523	iai	Iaai
2524	ian	Iatmul
2525	iar	Purari
2526	iba	Iban
2527	ibb	Ibibio
2528	ibd	Iwaidja
2529	ibe	Akpes
2530	ibg	Ibanag
2531	ibh	Bih
2532	ibl	Ibaloi
2533	ibm	Agoi
2534	ibn	Ibino
2535	ig	Igbo
2536	ibr	Ibuoro
2537	ibu	Ibu
2538	iby	Ibani
2539	ica	Ede Ica
2540	ich	Etkywan
2541	icl	Icelandic Sign Language
2542	icr	Islander Creole English
2543	ida	Idakho-Isukha-Tiriki
2544	idb	Indo-Portuguese
2545	idc	Idon
2546	idd	Ede Idaca
2547	ide	Idere
2548	idi	Idi
2549	io	Ido
2550	idr	Indri
2551	ids	Idesa
2552	idt	IdatÃ©
2553	idu	Idoma
2554	ifa	Amganad Ifugao
2555	ifb	Batad Ifugao
2556	ife	IfÃ¨
2557	iff	Ifo
2558	ifk	Tuwali Ifugao
2559	ifm	Teke-Fuumu
2560	ifu	Mayoyao Ifugao
2561	ify	Keley-I Kallahan
2562	igb	Ebira
2563	ige	Igede
2564	igg	Igana
2565	igl	Igala
2566	igm	Kanggape
2567	ign	Ignaciano
2568	igo	Isebe
2569	igs	Interglossa
2570	igw	Igwe
2571	ihb	Iha Based Pidgin
2572	ihi	Ihievbe
2573	ihp	Iha
2574	ihw	Bidhawal
2575	ii	Sichuan Yi
2576	iin	Thiin
2577	ijc	Izon
2578	ije	Biseni
2579	ijj	Ede Ije
2580	ijn	Kalabari
2581	ijs	Southeast Ijo
2582	ike	Eastern Canadian Inuktitut
2583	ikh	Ikhin-Arokho
2584	iki	Iko
2585	ikk	Ika
2586	ikl	Ikulu
2587	iko	Olulumo-Ikom
2588	ikp	Ikpeshi
2589	ikr	Ikaranggal
2590	iks	Inuit Sign Language
2591	ikt	Inuinnaqtun
2592	iu	Inuktitut
2593	ikv	Iku-Gora-Ankwa
2594	ikw	Ikwere
2595	ikx	Ik
2596	ikz	Ikizu
2597	ila	Ile Ape
2598	ilb	Ila
2599	ie	Interlingue
2600	ilg	Garig-Ilgar
2601	ili	Ili Turki
2602	ilk	Ilongot
2603	ilm	Iranun (Malaysia)
2604	ilo	Iloko
2605	ilp	Iranun (Philippines)
2606	ils	International Sign
2607	ilu	Ili'uun
2608	ilv	Ilue
2609	ima	Mala Malasar
2610	imi	Anamgura
2611	iml	Miluk
2612	imn	Imonda
2613	imo	Imbongu
2614	imr	Imroing
2615	ims	Marsian
2616	imt	Imotong
2617	imy	Milyan
2618	ia	Interlingua (International Auxiliary Language Association)
2619	inb	Inga
2620	id	Indonesian
2621	ing	Degexit'an
2622	inh	Ingush
2623	inj	Jungle Inga
2624	inl	Indonesian Sign Language
2625	inm	Minaean
2626	inn	Isinai
2627	ino	Inoke-Yate
2628	inp	IÃ±apari
2629	ins	Indian Sign Language
2630	int	Intha
2631	inz	IneseÃ±o
2632	ior	Inor
2633	iou	Tuma-Irumu
2634	iow	Iowa-Oto
2635	ipi	Ipili
2636	ik	Inupiaq
2637	ipo	Ipiko
2638	iqu	Iquito
2639	iqw	Ikwo
2640	ire	Iresim
2641	irh	Irarutu
2642	iri	Rigwe
2643	irk	Iraqw
2644	irn	IrÃ¡ntxe
2645	irr	Ir
2646	iru	Irula
2647	irx	Kamberau
2648	iry	Iraya
2649	isa	Isabi
2650	isc	Isconahua
2651	isd	Isnag
2652	ise	Italian Sign Language
2653	isg	Irish Sign Language
2654	ish	Esan
2655	isi	Nkem-Nkum
2656	isk	Ishkashimi
2657	is	Icelandic
2658	ism	Masimasi
2659	isn	Isanzu
2660	iso	Isoko
2661	isr	Israeli Sign Language
2662	ist	Istriot
2663	isu	Isu (Menchum Division)
2664	isv	Interslavic
2665	it	Italian
2666	itb	Binongan Itneg
2667	itd	Southern Tidung
2668	ite	Itene
2669	iti	Inlaod Itneg
2670	itk	Judeo-Italian
2671	itl	Itelmen
2672	itm	Itu Mbon Uzo
2673	ito	Itonama
2674	itr	Iteri
2675	its	Isekiri
2676	itt	Maeng Itneg
2677	itv	Itawit
2678	itw	Ito
2679	itx	Itik
2680	ity	Moyadan Itneg
2681	itz	ItzÃ¡
2682	ium	Iu Mien
2683	ivb	Ibatan
2684	ivv	Ivatan
2685	iwk	I-Wak
2686	iwm	Iwam
2687	iwo	Iwur
2688	iws	Sepik Iwam
2689	ixc	Ixcatec
2690	ixl	Ixil
2691	iya	Iyayu
2692	iyo	Mesaka
2693	iyx	Yaka (Congo)
2694	izh	Ingrian
2695	izm	Kizamani
2696	izr	Izere
2697	izz	Izii
2698	jaa	JamamadÃ­
2699	jab	Hyam
2700	jac	Popti'
2701	jad	Jahanka
2702	jae	Yabem
2703	jaf	Jara
2704	jah	Jah Hut
2705	jaj	Zazao
2706	jak	Jakun
2707	jal	Yalahatan
2708	jam	Jamaican Creole English
2709	jan	Jandai
2710	jao	Yanyuwa
2711	jaq	Yaqay
2712	jas	New Caledonian Javanese
2713	jat	Jakati
2714	jau	Yaur
2715	jv	Javanese
2716	jax	Jambi Malay
2717	jay	Yan-nhangu
2718	jaz	Jawe
2719	jbe	Judeo-Berber
2720	jbi	Badjiri
2721	jbj	Arandai
2722	jbk	Barikewa
2723	jbm	Bijim
2724	jbn	Nafusi
2725	jbo	Lojban
2726	jbr	Jofotek-Bromnya
2727	jbt	JabutÃ­
2728	jbu	Jukun Takum
2729	jbw	Yawijibaya
2730	jcs	Jamaican Country Sign Language
2731	jct	Krymchak
2732	jda	Jad
2733	jdg	Jadgali
2734	jdt	Judeo-Tat
2735	jeb	Jebero
2736	jee	Jerung
2737	jeh	Jeh
2738	jei	Yei
2739	jek	Jeri Kuo
2740	jel	Yelmek
2741	jen	Dza
2742	jer	Jere
2743	jet	Manem
2744	jeu	Jonkor Bourmataguil
2745	jgb	Ngbee
2746	jge	Judeo-Georgian
2747	jgk	Gwak
2748	jgo	Ngomba
2749	jhi	Jehai
2750	jhs	Jhankot Sign Language
2751	jia	Jina
2752	jib	Jibu
2753	jic	Tol
2754	jid	Bu (Kaduna State)
2755	jie	Jilbe
2756	jig	Jingulu
2757	jih	sTodsde
2758	jii	Jiiddu
2759	jil	Jilim
2760	jim	Jimi (Cameroon)
2761	jio	Jiamao
2762	jiq	Guanyinqiao
2763	jit	Jita
2764	jiu	Youle Jinuo
2765	jiv	Shuar
2766	jiy	Buyuan Jinuo
2767	jje	Jejueo
2768	jjr	Bankal
2769	jka	Kaera
2770	jkm	Mobwa Karen
2771	jko	Kubo
2772	jkp	Paku Karen
2773	jkr	Koro (India)
2774	jks	Amami Koniya Sign Language
2775	jku	Labir
2776	jle	Ngile
2777	jls	Jamaican Sign Language
2778	jma	Dima
2779	jmb	Zumbun
2780	jmc	Machame
2781	jmd	Yamdena
2782	jmi	Jimi (Nigeria)
2783	jml	Jumli
2784	jmn	Makuri Naga
2785	jmr	Kamara
2786	jms	Mashi (Nigeria)
2787	jmw	Mouwase
2788	jmx	Western Juxtlahuaca Mixtec
2789	jna	Jangshung
2790	jnd	Jandavra
2791	jng	Yangman
2792	jni	Janji
2793	jnj	Yemsa
2794	jnl	Rawat
2795	jns	Jaunsari
2796	job	Joba
2797	jod	Wojenaka
2798	jog	Jogi
2799	jor	JorÃ¡
2800	jos	Jordanian Sign Language
2801	jow	Jowulu
2802	jpa	Jewish Palestinian Aramaic
2803	ja	Japanese
2804	jpr	Judeo-Persian
2805	jqr	Jaqaru
2806	jra	Jarai
2807	jrb	Judeo-Arabic
2808	jrr	Jiru
2809	jrt	Jakattoe
2810	jru	JaprerÃ­a
2811	jsl	Japanese Sign Language
2812	jua	JÃºma
2813	jub	Wannu
2814	juc	Jurchen
2815	jud	Worodougou
2816	juh	HÃµne
2817	jui	Ngadjuri
2818	juk	Wapan
2819	jul	Jirel
2820	jum	Jumjum
2821	jun	Juang
2822	juo	Jiba
2823	jup	HupdÃ«
2824	jur	JurÃºna
2825	jus	Jumla Sign Language
2826	jut	Jutish
2827	juu	Ju
2828	juw	WÃ£pha
2829	juy	Juray
2830	jvd	Javindo
2831	jvn	Caribbean Javanese
2832	jwi	Jwira-Pepesa
2833	jya	Jiarong
2834	jye	Judeo-Yemeni Arabic
2835	jyy	Jaya
2836	kaa	Kara-Kalpak
2837	kab	Kabyle
2838	kac	Kachin
2839	kad	Adara
2840	kae	Ketangalan
2841	kaf	Katso
2842	kag	Kajaman
2843	kah	Kara (Central African Republic)
2844	kai	Karekare
2845	kaj	Jju
2846	kak	Kalanguya
2847	kl	Kalaallisut
2848	kam	Kamba (Kenya)
2849	kn	Kannada
2850	kao	Xaasongaxango
2851	kap	Bezhta
2852	kaq	Capanahua
2853	ks	Kashmiri
2854	ka	Georgian
2855	kr	Kanuri
2856	kav	KatukÃ­na
2857	kaw	Kawi
2858	kax	Kao
2859	kay	KamayurÃ¡
2860	kk	Kazakh
2861	kba	Kalarko
2862	kbb	KaxuiÃ¢na
2863	kbc	KadiwÃ©u
2864	kbd	Kabardian
2865	kbe	Kanju
2866	kbg	Khamba
2867	kbh	CamsÃ¡
2868	kbi	Kaptiau
2869	kbj	Kari
2870	kbk	Grass Koiari
2871	kbl	Kanembu
2872	kbm	Iwal
2873	kbn	Kare (Central African Republic)
2874	kbo	Keliko
2875	kbp	KabiyÃ¨
2876	kbq	Kamano
2877	kbr	Kafa
2878	kbs	Kande
2879	kbt	Abadi
2880	kbu	Kabutra
2881	kbv	Dera (Indonesia)
2882	kbw	Kaiep
2883	kbx	Ap Ma
2884	kby	Manga Kanuri
2885	kbz	Duhwa
2886	kca	Khanty
2887	kcb	Kawacha
2888	kcc	Lubila
2889	kcd	NgkÃ¢lmpw Kanum
2890	kce	Kaivi
2891	kcf	Ukaan
2892	kcg	Tyap
2893	kch	Vono
2894	kci	Kamantan
2895	kcj	Kobiana
2896	kck	Kalanga
2897	kcl	Kela (Papua New Guinea)
2898	kcm	Gula (Central African Republic)
2899	kcn	Nubi
2900	kco	Kinalakna
2901	kcp	Kanga
2902	kcq	Kamo
2903	kcr	Katla
2904	kcs	Koenoem
2905	kct	Kaian
2906	kcu	Kami (Tanzania)
2907	kcv	Kete
2908	kcw	Kabwari
2909	kcx	Kachama-Ganjule
2910	kcy	Korandje
2911	kcz	Konongo
2912	kda	Worimi
2913	kdc	Kutu
2914	kdd	Yankunytjatjara
2915	kde	Makonde
2916	kdf	Mamusi
2917	kdg	Seba
2918	kdh	Tem
2919	kdi	Kumam
2920	kdj	Karamojong
2921	kdk	NumÃ¨Ã¨
2922	kdl	Tsikimba
2923	kdm	Kagoma
2924	kdn	Kunda
2925	kdp	Kaningdon-Nindem
2926	kdq	Koch
2927	kdr	Karaim
2928	kdt	Kuy
2929	kdu	Kadaru
2930	kdw	Koneraw
2931	kdx	Kam
2932	kdy	Keder
2933	kdz	Kwaja
2934	kea	Kabuverdianu
2935	keb	KÃ©lÃ©
2936	kec	Keiga
2937	ked	Kerewe
2938	kee	Eastern Keres
2939	kef	Kpessi
2940	keg	Tese
2941	keh	Keak
2942	kei	Kei
2943	kej	Kadar
2944	kek	KekchÃ­
2945	kel	Kela (Democratic Republic of Congo)
2946	kem	Kemak
2947	ken	Kenyang
2948	keo	Kakwa
2949	kep	Kaikadi
2950	keq	Kamar
2951	ker	Kera
2952	kes	Kugbo
2953	ket	Ket
2954	keu	Akebu
2955	kev	Kanikkaran
2956	kew	West Kewa
2957	kex	Kukna
2958	key	Kupia
2959	kez	Kukele
2960	kfa	Kodava
2961	kfb	Northwestern Kolami
2962	kfc	Konda-Dora
2963	kfd	Korra Koraga
2964	kfe	Kota (India)
2965	kff	Koya
2966	kfg	Kudiya
2967	kfh	Kurichiya
2968	kfi	Kannada Kurumba
2969	kfj	Kemiehua
2970	kfk	Kinnauri
2971	kfl	Kung
2972	kfm	Khunsari
2973	kfn	Kuk
2974	kfo	Koro (CÃ´te d'Ivoire)
2975	kfp	Korwa
2976	kfq	Korku
2977	kfr	Kachhi
2978	kfs	Bilaspuri
2979	kft	Kanjari
2980	kfu	Katkari
2981	kfv	Kurmukar
2982	kfw	Kharam Naga
2983	kfx	Kullu Pahari
2984	kfy	Kumaoni
2985	kfz	KoromfÃ©
2986	kga	Koyaga
2987	kgb	Kawe
2988	kge	Komering
2989	kgf	Kube
2990	kgg	Kusunda
2991	kgi	Selangor Sign Language
2992	kgj	Gamale Kham
2993	kgk	KaiwÃ¡
2994	kgl	Kunggari
2995	kgn	Karingani
2996	kgo	Krongo
2997	kgp	Kaingang
2998	kgq	Kamoro
2999	kgr	Abun
3000	kgs	Kumbainggar
3001	kgt	Somyev
3002	kgu	Kobol
3003	kgv	Karas
3004	kgw	Karon Dori
3005	kgx	Kamaru
3006	kgy	Kyerung
3007	kha	Khasi
3008	khb	LÃ¼
3009	khc	Tukang Besi North
3010	khd	BÃ¤di Kanum
3011	khe	Korowai
3012	khf	Khuen
3013	khg	Khams Tibetan
3014	khh	Kehu
3015	khj	Kuturmi
3016	khk	Halh Mongolian
3017	khl	Lusi
3018	km	Khmer
3019	khn	Khandesi
3020	kho	Khotanese
3021	khp	Kapori
3022	khq	Koyra Chiini Songhay
3023	khr	Kharia
3024	khs	Kasua
3025	kht	Khamti
3026	khu	Nkhumbi
3027	khv	Khvarshi
3028	khw	Khowar
3029	khx	Kanu
3030	khy	Kele (Democratic Republic of Congo)
3031	khz	Keapara
3032	kia	Kim
3033	kib	Koalib
3034	kic	Kickapoo
3035	kid	Koshin
3036	kie	Kibet
3037	kif	Eastern Parbate Kham
3038	kig	Kimaama
3039	kih	Kilmeri
3040	kii	Kitsai
3041	kij	Kilivila
3042	ki	Kikuyu
3043	kil	Kariya
3044	kim	Karagas
3045	rw	Kinyarwanda
3046	kio	Kiowa
3047	kip	Sheshi Kham
3048	kiq	Kosadle
3049	ky	Kirghiz
3050	kis	Kis
3051	kit	Agob
3052	kiu	Kirmanjki (individual language)
3053	kiv	Kimbu
3054	kiw	Northeast Kiwai
3055	kix	Khiamniungan Naga
3056	kiy	Kirikiri
3057	kiz	Kisi
3058	kja	Mlap
3059	kjb	Q'anjob'al
3060	kjc	Coastal Konjo
3061	kjd	Southern Kiwai
3062	kje	Kisar
3063	kjg	Khmu
3064	kjh	Khakas
3065	kji	Zabana
3066	kjj	Khinalugh
3067	kjk	Highland Konjo
3068	kjl	Western Parbate Kham
3069	kjm	KhÃ¡ng
3070	kjn	Kunjen
3071	kjo	Harijan Kinnauri
3072	kjp	Pwo Eastern Karen
3073	kjq	Western Keres
3074	kjr	Kurudu
3075	kjs	East Kewa
3076	kjt	Phrae Pwo Karen
3077	kju	Kashaya
3078	kjv	Kaikavian Literary Language
3079	kjx	Ramopa
3080	kjy	Erave
3081	kjz	Bumthangkha
3082	kka	Kakanda
3083	kkb	Kwerisa
3084	kkc	Odoodee
3085	kkd	Kinuku
3086	kke	Kakabe
3087	kkf	Kalaktang Monpa
3088	kkg	Mabaka Valley Kalinga
3089	kkh	KhÃ¼n
3090	kki	Kagulu
3091	kkj	Kako
3092	kkk	Kokota
3093	kkl	Kosarek Yale
3094	kkm	Kiong
3095	kkn	Kon Keu
3096	kko	Karko
3097	kkp	Gugubera
3098	kkq	Kaeku
3099	kkr	Kir-Balar
3100	kks	Giiwo
3101	kkt	Koi
3102	kku	Tumi
3103	kkv	Kangean
3104	kkw	Teke-Kukuya
3105	kkx	Kohin
3106	kky	Guugu Yimidhirr
3107	kkz	Kaska
3108	kla	Klamath-Modoc
3109	klb	Kiliwa
3110	klc	Kolbila
3111	kld	Gamilaraay
3112	kle	Kulung (Nepal)
3113	klf	Kendeje
3114	klg	Tagakaulo
3115	klh	Weliki
3116	kli	Kalumpang
3117	klj	Khalaj
3118	klk	Kono (Nigeria)
3119	kll	Kagan Kalagan
3120	klm	Migum
3121	kln	Kalenjin
3122	klo	Kapya
3123	klp	Kamasa
3124	klq	Rumu
3125	klr	Khaling
3126	kls	Kalasha
3127	klt	Nukna
3128	klu	Klao
3129	klv	Maskelynes
3130	klw	Tado
3131	klx	Koluwawa
3132	kly	Kalao
3133	klz	Kabola
3134	kma	Konni
3135	kmb	Kimbundu
3136	kmc	Southern Dong
3137	kmd	Majukayang Kalinga
3138	kme	Bakole
3139	kmf	Kare (Papua New Guinea)
3140	kmg	KÃ¢te
3141	kmh	Kalam
3142	kmi	Kami (Nigeria)
3143	kmj	Kumarbhag Paharia
3144	kmk	Limos Kalinga
3145	kml	Tanudan Kalinga
3146	kmm	Kom (India)
3147	kmn	Awtuw
3148	kmo	Kwoma
3149	kmp	Gimme
3150	kmq	Kwama
3151	kmr	Northern Kurdish
3152	kms	Kamasau
3153	kmt	Kemtuik
3154	kmu	Kanite
3155	kmv	KaripÃºna Creole French
3156	kmw	Komo (Democratic Republic of Congo)
3157	kmx	Waboda
3158	kmy	Koma
3159	kmz	Khorasani Turkish
3160	kna	Dera (Nigeria)
3161	knb	Lubuagan Kalinga
3162	knc	Central Kanuri
3163	knd	Konda
3164	kne	Kankanaey
3165	knf	Mankanya
3166	kng	Koongo
3167	kni	Kanufi
3168	knj	Western Kanjobal
3169	knk	Kuranko
3170	knl	Keninjal
3171	knm	KanamarÃ­
3172	knn	Konkani (individual language)
3173	kno	Kono (Sierra Leone)
3174	knp	Kwanja
3175	knq	Kintaq
3176	knr	Kaningra
3177	kns	Kensiu
3178	knt	Panoan KatukÃ­na
3179	knu	Kono (Guinea)
3180	knv	Tabo
3181	knw	Kung-Ekoka
3182	knx	Kendayan
3183	kny	Kanyok
3184	knz	KalamsÃ©
3185	koa	Konomala
3186	koc	Kpati
3187	kod	Kodi
3188	koe	Kacipo-Bale Suri
3189	kof	Kubi
3190	kog	Cogui
3191	koh	Koyo
3192	koi	Komi-Permyak
3193	kok	Konkani (macrolanguage)
3194	kol	Kol (Papua New Guinea)
3195	kv	Komi
3196	kg	Kongo
3197	koo	Konzo
3198	kop	Waube
3199	koq	Kota (Gabon)
3200	ko	Korean
3201	kos	Kosraean
3202	kot	Lagwan
3203	kou	Koke
3204	kov	Kudu-Camo
3205	kow	Kugama
3206	koy	Koyukon
3207	koz	Korak
3208	kpa	Kutto
3209	kpb	Mullu Kurumba
3210	kpc	Curripaco
3211	kpd	Koba
3212	kpe	Kpelle
3213	kpf	Komba
3214	kpg	Kapingamarangi
3215	kph	Kplang
3216	kpi	Kofei
3217	kpj	KarajÃ¡
3218	kpk	Kpan
3219	kpl	Kpala
3220	kpm	Koho
3221	kpn	KepkiriwÃ¡t
3222	kpo	Ikposo
3223	kpq	Korupun-Sela
3224	kpr	Korafe-Yegha
3225	kps	Tehit
3226	kpt	Karata
3227	kpu	Kafoa
3228	kpv	Komi-Zyrian
3229	kpw	Kobon
3230	kpx	Mountain Koiali
3231	kpy	Koryak
3232	kpz	Kupsabiny
3233	kqa	Mum
3234	kqb	Kovai
3235	kqc	Doromu-Koki
3236	kqd	Koy Sanjaq Surat
3237	kqe	Kalagan
3238	kqf	Kakabai
3239	kqg	Khe
3240	kqh	Kisankasa
3241	kqi	Koitabu
3242	kqj	Koromira
3243	kqk	Kotafon Gbe
3244	kql	Kyenele
3245	kqm	Khisa
3246	kqn	Kaonde
3247	kqo	Eastern Krahn
3248	kqp	KimrÃ©
3249	kqq	Krenak
3250	kqr	Kimaragang
3251	kqs	Northern Kissi
3252	kqt	Klias River Kadazan
3253	kqu	Seroa
3254	kqv	Okolod
3255	kqw	Kandas
3256	kqx	Mser
3257	kqy	Koorete
3258	kqz	Korana
3259	kra	Kumhali
3260	krb	Karkin
3261	krc	Karachay-Balkar
3262	krd	Kairui-Midiki
3263	kre	PanarÃ¡
3264	krf	Koro (Vanuatu)
3265	krh	Kurama
3266	kri	Krio
3267	krj	Kinaray-A
3268	krk	Kerek
3269	krl	Karelian
3270	krn	Sapo
3271	krp	Durop
3272	krr	Krung
3273	krs	Gbaya (Sudan)
3274	krt	Tumari Kanuri
3275	kru	Kurukh
3276	krv	Kavet
3277	krw	Western Krahn
3278	krx	Karon
3279	kry	Kryts
3280	krz	Sota Kanum
3281	ksb	Shambala
3282	ksc	Southern Kalinga
3283	ksd	Kuanua
3284	kse	Kuni
3285	ksf	Bafia
3286	ksg	Kusaghe
3287	ksh	KÃ¶lsch
3288	ksi	Krisa
3289	ksj	Uare
3290	ksk	Kansa
3291	ksl	Kumalu
3292	ksm	Kumba
3293	ksn	Kasiguranin
3294	kso	Kofa
3295	ksp	Kaba
3296	ksq	Kwaami
3297	ksr	Borong
3298	kss	Southern Kisi
3299	kst	WinyÃ©
3300	ksu	Khamyang
3301	ksv	Kusu
3302	ksw	S'gaw Karen
3303	ksx	Kedang
3304	ksy	Kharia Thar
3305	ksz	Kodaku
3306	kta	Katua
3307	ktb	Kambaata
3308	ktc	Kholok
3309	ktd	Kokata
3310	kte	Nubri
3311	ktf	Kwami
3312	ktg	Kalkutung
3313	kth	Karanga
3314	kti	North Muyu
3315	ktj	Plapo Krumen
3316	ktk	Kaniet
3317	ktl	Koroshi
3318	ktm	Kurti
3319	ktn	KaritiÃ¢na
3320	kto	Kuot
3321	ktp	Kaduo
3322	ktq	Katabaga
3323	kts	South Muyu
3324	ktt	Ketum
3325	ktu	Kituba (Democratic Republic of Congo)
3326	ktv	Eastern Katu
3327	ktw	Kato
3328	ktx	KaxararÃ­
3329	kty	Kango (Bas-UÃ©lÃ© District)
3330	ktz	JuÇ€Ê¼hoan
3331	kj	Kuanyama
3332	kub	Kutep
3333	kuc	Kwinsu
3334	kud	'Auhelawa
3335	kue	Kuman (Papua New Guinea)
3336	kuf	Western Katu
3337	kug	Kupa
3338	kuh	Kushi
3339	kui	KuikÃºro-KalapÃ¡lo
3340	kuj	Kuria
3341	kuk	Kepo'
3342	kul	Kulere
3343	kum	Kumyk
3344	kun	Kunama
3345	kuo	Kumukio
3346	kup	Kunimaipa
3347	kuq	Karipuna
3348	ku	Kurdish
3349	kus	Kusaal
3350	kut	Kutenai
3351	kuu	Upper Kuskokwim
3352	kuv	Kur
3353	kuw	Kpagua
3354	kux	Kukatja
3355	kuy	Kuuku-Ya'u
3356	kuz	Kunza
3357	kva	Bagvalal
3358	kvb	Kubu
3359	kvc	Kove
3360	kvd	Kui (Indonesia)
3361	kve	Kalabakan
3362	kvf	Kabalai
3363	kvg	Kuni-Boazi
3364	kvh	Komodo
3365	kvi	Kwang
3366	kvj	Psikye
3367	kvk	Korean Sign Language
3368	kvl	Kayaw
3369	kvm	Kendem
3370	kvn	Border Kuna
3371	kvo	Dobel
3372	kvp	Kompane
3373	kvq	Geba Karen
3374	kvr	Kerinci
3375	kvt	Lahta Karen
3376	kvu	Yinbaw Karen
3377	kvv	Kola
3378	kvw	Wersing
3379	kvx	Parkari Koli
3380	kvy	Yintale Karen
3381	kvz	Tsakwambo
3382	kwa	DÃ¢w
3383	kwb	Kwa
3384	kwc	Likwala
3385	kwd	Kwaio
3386	kwe	Kwerba
3387	kwf	Kwara'ae
3388	kwg	Sara Kaba Deme
3389	kwh	Kowiai
3390	kwi	Awa-Cuaiquer
3391	kwj	Kwanga
3392	kwk	Kwakiutl
3393	kwl	Kofyar
3394	kwm	Kwambi
3395	kwn	Kwangali
3396	kwo	Kwomtari
3397	kwp	Kodia
3398	kwr	Kwer
3399	kws	Kwese
3400	kwt	Kwesten
3401	kwu	Kwakum
3402	kwv	Sara Kaba NÃ¡Ã 
3403	kww	Kwinti
3404	kwx	Khirwar
3405	kwy	San Salvador Kongo
3406	kwz	Kwadi
3407	kxa	Kairiru
3408	kxb	Krobu
3409	kxc	Konso
3410	kxd	Brunei
3411	kxf	Manumanaw Karen
3412	kxh	Karo (Ethiopia)
3413	kxi	Keningau Murut
3414	kxj	Kulfa
3415	kxk	Zayein Karen
3416	kxm	Northern Khmer
3417	kxn	Kanowit-Tanjong Melanau
3418	kxo	KanoÃ©
3419	kxp	Wadiyara Koli
3420	kxq	SmÃ¤rky Kanum
3421	kxr	Koro (Papua New Guinea)
3422	kxs	Kangjia
3423	kxt	Koiwat
3424	kxv	Kuvi
3425	kxw	Konai
3426	kxx	Likuba
3427	kxy	Kayong
3428	kxz	Kerewo
3429	kya	Kwaya
3430	kyb	Butbut Kalinga
3431	kyc	Kyaka
3432	kyd	Karey
3433	kye	Krache
3434	kyf	Kouya
3435	kyg	Keyagana
3436	kyh	Karok
3437	kyi	Kiput
3438	kyj	Karao
3439	kyk	Kamayo
3440	kyl	Kalapuya
3441	kym	Kpatili
3442	kyn	Northern Binukidnon
3443	kyo	Kelon
3444	kyp	Kang
3445	kyq	Kenga
3446	kyr	KuruÃ¡ya
3447	kys	Baram Kayan
3448	kyt	Kayagar
3449	kyu	Western Kayah
3450	kyv	Kayort
3451	kyw	Kudmali
3452	kyx	Rapoisi
3453	kyy	Kambaira
3454	kyz	KayabÃ­
3455	kza	Western Karaboro
3456	kzb	Kaibobo
3457	kzc	Bondoukou Kulango
3458	kzd	Kadai
3459	kze	Kosena
3460	kzf	Da'a Kaili
3461	kzg	Kikai
3462	kzi	Kelabit
3463	kzk	Kazukuru
3464	kzl	Kayeli
3465	kzm	Kais
3466	kzn	Kokola
3467	kzo	Kaningi
3468	kzp	Kaidipang
3469	kzq	Kaike
3470	kzr	Karang
3471	kzs	Sugut Dusun
3472	kzu	Kayupulau
3473	kzv	Komyandaret
3474	kzw	KarirÃ­-XocÃ³
3475	kzx	Kamarian
3476	kzy	Kango (Tshopo District)
3477	kzz	Kalabra
3478	laa	Southern Subanen
3479	lab	Linear A
3480	lac	Lacandon
3481	lad	Ladino
3482	lae	Pattani
3483	laf	Lafofa
3484	lag	Rangi
3485	lah	Lahnda
3486	lai	Lambya
3487	laj	Lango (Uganda)
3488	lal	Lalia
3489	lam	Lamba
3490	lan	Laru
3491	lo	Lao
3492	lap	Laka (Chad)
3493	laq	Qabiao
3494	lar	Larteh
3495	las	Lama (Togo)
3496	la	Latin
3497	lau	Laba
3498	lv	Latvian
3499	law	Lauje
3500	lax	Tiwa
3501	lay	Lama Bai
3502	laz	Aribwatsa
3503	lbb	Label
3504	lbc	Lakkia
3505	lbe	Lak
3506	lbf	Tinani
3507	lbg	Laopang
3508	lbi	La'bi
3509	lbj	Ladakhi
3510	lbk	Central Bontok
3511	lbl	Libon Bikol
3512	lbm	Lodhi
3513	lbn	Rmeet
3514	lbo	Laven
3515	lbq	Wampar
3516	lbr	Lohorung
3517	lbs	Libyan Sign Language
3518	lbt	Lachi
3519	lbu	Labu
3520	lbv	Lavatbura-Lamusong
3521	lbw	Tolaki
3522	lbx	Lawangan
3523	lby	Lamalama
3524	lbz	Lardil
3525	lcc	Legenyem
3526	lcd	Lola
3527	lce	Loncong
3528	lcf	Lubu
3529	lch	Luchazi
3530	lcl	Lisela
3531	lcm	Tungag
3532	lcp	Western Lawa
3533	lcq	Luhu
3534	lcs	Lisabata-Nuniali
3535	lda	Kla-Dan
3536	ldb	DuÌƒya
3537	ldd	Luri
3538	ldg	Lenyima
3539	ldh	Lamja-Dengsa-Tola
3540	ldi	Laari
3541	ldj	Lemoro
3542	ldk	Leelau
3543	ldl	Kaan
3544	ldm	Landoma
3545	ldn	LÃ¡adan
3546	ldo	Loo
3547	ldp	Tso
3548	ldq	Lufu
3549	lea	Lega-Shabunda
3550	leb	Lala-Bisa
3551	lec	Leco
3552	led	Lendu
3553	lee	LyÃ©lÃ©
3554	lef	Lelemi
3555	leh	Lenje
3556	lei	Lemio
3557	lej	Lengola
3558	lek	Leipon
3559	lel	Lele (Democratic Republic of Congo)
3560	lem	Nomaande
3561	len	Lenca
3562	leo	Leti (Cameroon)
3563	lep	Lepcha
3564	leq	Lembena
3565	ler	Lenkau
3566	les	Lese
3567	let	Lesing-Gelimi
3568	leu	Kara (Papua New Guinea)
3569	lev	Lamma
3570	lew	Ledo Kaili
3571	lex	Luang
3572	ley	Lemolang
3573	lez	Lezghian
3574	lfa	Lefa
3575	lfn	Lingua Franca Nova
3576	lga	Lungga
3577	lgb	Laghu
3578	lgg	Lugbara
3579	lgh	Laghuu
3580	lgi	Lengilu
3581	lgk	Lingarak
3582	lgl	Wala
3583	lgm	Lega-Mwenga
3584	lgn	T'apo
3585	lgo	Lango (South Sudan)
3586	lgq	Logba
3587	lgr	Lengo
3588	lgs	Guinea-Bissau Sign Language
3589	lgt	Pahi
3590	lgu	Longgu
3591	lgz	Ligenza
3592	lha	Laha (Viet Nam)
3593	lhh	Laha (Indonesia)
3594	lhi	Lahu Shi
3595	lhl	Lahul Lohar
3596	lhm	Lhomi
3597	lhn	Lahanan
3598	lhp	Lhokpu
3599	lhs	MlahsÃ¶
3600	lht	Lo-Toga
3601	lhu	Lahu
3602	lia	West-Central Limba
3603	lib	Likum
3604	lic	Hlai
3605	lid	Nyindrou
3606	lie	Likila
3607	lif	Limbu
3608	lig	Ligbi
3609	lih	Lihir
3610	lij	Ligurian
3611	lik	Lika
3612	lil	Lillooet
3613	li	Limburgan
3614	ln	Lingala
3615	lio	Liki
3616	lip	Sekpele
3617	liq	Libido
3618	lir	Liberian English
3619	lis	Lisu
3620	lt	Lithuanian
3621	liu	Logorik
3622	liv	Liv
3623	liw	Col
3624	lix	Liabuku
3625	liy	Banda-Bambari
3626	liz	Libinza
3627	lja	Golpa
3628	lje	Rampi
3629	lji	Laiyolo
3630	ljl	Li'o
3631	ljp	Lampung Api
3632	ljw	Yirandali
3633	ljx	Yuru
3634	lka	Lakalei
3635	lkb	Kabras
3636	lkc	Kucong
3637	lkd	LakondÃª
3638	lke	Kenyi
3639	lkh	Lakha
3640	lki	Laki
3641	lkj	Remun
3642	lkl	Laeko-Libuat
3643	lkm	Kalaamaya
3644	lkn	Lakon
3645	lko	Khayo
3646	lkr	PÃ¤ri
3647	lks	Kisa
3648	lkt	Lakota
3649	lku	Kungkari
3650	lky	Lokoya
3651	lla	Lala-Roba
3652	llb	Lolo
3653	llc	Lele (Guinea)
3654	lld	Ladin
3655	lle	Lele (Papua New Guinea)
3656	llf	Hermit
3657	llg	Lole
3658	llh	Lamu
3659	lli	Teke-Laali
3660	llj	Ladji Ladji
3661	llk	Lelak
3662	lll	Lilau
3663	llm	Lasalimu
3664	lln	Lele (Chad)
3665	llp	North Efate
3666	llq	Lolak
3667	lls	Lithuanian Sign Language
3668	llu	Lau
3669	llx	Lauan
3670	lma	East Limba
3671	lmb	Merei
3672	lmc	Limilngan
3673	lmd	Lumun
3674	lme	PÃ©vÃ©
3675	lmf	South Lembata
3676	lmg	Lamogai
3677	lmh	Lambichhong
3678	lmi	Lombi
3679	lmj	West Lembata
3680	lmk	Lamkang
3681	lml	Hano
3682	lmn	Lambadi
3683	lmo	Lombard
3684	lmp	Limbum
3685	lmq	Lamatuka
3686	lmr	Lamalera
3687	lmu	Lamenu
3688	lmv	Lomaiviti
3689	lmw	Lake Miwok
3690	lmx	Laimbue
3691	lmy	Lamboya
3692	lna	Langbashe
3693	lnb	Mbalanhu
3694	lnd	Lundayeh
3695	lng	Langobardic
3696	lnh	Lanoh
3697	lni	Daantanai'
3698	lnj	Leningitij
3699	lnl	South Central Banda
3700	lnm	Langam
3701	lnn	Lorediakarkar
3702	lns	Lamnso'
3703	lnu	Longuda
3704	lnw	Lanima
3705	lnz	Lonzo
3706	loa	Loloda
3707	lob	Lobi
3708	loc	Inonhan
3709	loe	Saluan
3710	lof	Logol
3711	log	Logo
3712	loh	Laarim
3713	loi	Loma (CÃ´te d'Ivoire)
3714	loj	Lou
3715	lok	Loko
3716	lol	Mongo
3717	lom	Loma (Liberia)
3718	lon	Malawi Lomwe
3719	loo	Lombo
3720	lop	Lopa
3721	loq	Lobala
3722	lor	TÃ©Ã©n
3723	los	Loniu
3724	lot	Otuho
3725	lou	Louisiana Creole
3726	lov	Lopi
3727	low	Tampias Lobu
3728	lox	Loun
3729	loy	Loke
3730	loz	Lozi
3731	lpa	Lelepa
3732	lpe	Lepki
3733	lpn	Long Phuri Naga
3734	lpo	Lipo
3735	lpx	Lopit
3736	lqr	Logir
3737	lra	Rara Bakati'
3738	lrc	Northern Luri
3739	lre	Laurentian
3740	lrg	Laragia
3741	lri	Marachi
3742	lrk	Loarki
3743	lrl	Lari
3744	lrm	Marama
3745	lrn	Lorang
3746	lro	Laro
3747	lrr	Southern Yamphu
3748	lrt	Larantuka Malay
3749	lrv	Larevat
3750	lrz	Lemerig
3751	lsa	Lasgerdi
3752	lsb	Burundian Sign Language
3753	lsc	Albarradas Sign Language
3754	lsd	Lishana Deni
3755	lse	Lusengo
3756	lsh	Lish
3757	lsi	Lashi
3758	lsl	Latvian Sign Language
3759	lsm	Saamia
3760	lsn	Tibetan Sign Language
3761	lso	Laos Sign Language
3762	lsp	Panamanian Sign Language
3763	lsr	Aruop
3764	lss	Lasi
3765	lst	Trinidad and Tobago Sign Language
3766	lsv	Sivia Sign Language
3767	lsw	Seychelles Sign Language
3768	lsy	Mauritian Sign Language
3769	ltc	Late Middle Chinese
3770	ltg	Latgalian
3771	lth	Thur
3772	lti	Leti (Indonesia)
3773	ltn	LatundÃª
3774	lto	Tsotso
3775	lts	Tachoni
3776	ltu	Latu
3777	lb	Luxembourgish
3778	lua	Luba-Lulua
3779	lu	Luba-Katanga
3780	luc	Aringa
3781	lud	Ludian
3782	lue	Luvale
3783	luf	Laua
3784	lg	Ganda
3785	lui	Luiseno
3786	luj	Luna
3787	luk	Lunanakha
3788	lul	Olu'bo
3789	lum	Luimbi
3790	lun	Lunda
3791	luo	Luo (Kenya and Tanzania)
3792	lup	Lumbu
3793	luq	Lucumi
3794	lur	Laura
3795	lus	Lushai
3796	lut	Lushootseed
3797	luu	Lumba-Yakkha
3798	luv	Luwati
3799	luw	Luo (Cameroon)
3800	luy	Luyia
3801	luz	Southern Luri
3802	lva	Maku'a
3803	lvi	Lavi
3804	lvk	Lavukaleve
3805	lvl	Lwel
3806	lvs	Standard Latvian
3807	lvu	Levuka
3808	lwa	Lwalu
3809	lwe	Lewo Eleng
3810	lwg	Wanga
3811	lwh	White Lachi
3812	lwl	Eastern Lawa
3813	lwm	Laomian
3814	lwo	Luwo
3815	lws	Malawian Sign Language
3816	lwt	Lewotobi
3817	lwu	Lawu
3818	lww	Lewo
3819	lxm	Lakurumau
3820	lya	Layakha
3821	lyg	Lyngngam
3822	lyn	Luyana
3823	lzh	Literary Chinese
3824	lzl	Litzlitz
3825	lzn	Leinong Naga
3826	lzz	Laz
3827	maa	San JerÃ³nimo TecÃ³atl Mazatec
3828	mab	Yutanduchi Mixtec
3829	mad	Madurese
3830	mae	Bo-Rukul
3831	maf	Mafa
3832	mag	Magahi
3833	mh	Marshallese
3834	mai	Maithili
3835	maj	Jalapa De DÃ­az Mazatec
3836	mak	Makasar
3837	ml	Malayalam
3838	mam	Mam
3839	man	Mandingo
3840	maq	ChiquihuitlÃ¡n Mazatec
3841	mr	Marathi
3842	mas	Masai
3843	mat	San Francisco Matlatzinca
3844	mau	Huautla Mazatec
3845	mav	SaterÃ©-MawÃ©
3846	maw	Mampruli
3847	max	North Moluccan Malay
3848	maz	Central Mazahua
3849	mba	Higaonon
3850	mbb	Western Bukidnon Manobo
3851	mbc	Macushi
3852	mbd	Dibabawon Manobo
3853	mbe	Molale
3854	mbf	Baba Malay
3855	mbh	Mangseng
3856	mbi	Ilianen Manobo
3857	mbj	NadÃ«b
3858	mbk	Malol
3859	mbl	MaxakalÃ­
3860	mbm	Ombamba
3861	mbn	MacaguÃ¡n
3862	mbo	Mbo (Cameroon)
3863	mbp	Malayo
3864	mbq	Maisin
3865	mbr	Nukak MakÃº
3866	mbs	Sarangani Manobo
3867	mbt	Matigsalug Manobo
3868	mbu	Mbula-Bwazza
3869	mbv	Mbulungish
3870	mbw	Maring
3871	mbx	Mari (East Sepik Province)
3872	mby	Memoni
3873	mbz	Amoltepec Mixtec
3874	mca	Maca
3875	mcb	Machiguenga
3876	mcc	Bitur
3877	mcd	Sharanahua
3878	mce	Itundujia Mixtec
3879	mcf	MatsÃ©s
3880	mcg	Mapoyo
3881	mch	Maquiritari
3882	mci	Mese
3883	mcj	Mvanip
3884	mck	Mbunda
3885	mcl	Macaguaje
3886	mcm	Malaccan Creole Portuguese
3887	mcn	Masana
3888	mco	CoatlÃ¡n Mixe
3889	mcp	Makaa
3890	mcq	Ese
3891	mcr	Menya
3892	mcs	Mambai
3893	mct	Mengisa
3894	mcu	Cameroon Mambila
3895	mcv	Minanibai
3896	mcw	Mawa (Chad)
3897	mcx	Mpiemo
3898	mcy	South Watut
3899	mcz	Mawan
3900	mda	Mada (Nigeria)
3901	mdb	Morigi
3902	mdc	Male (Papua New Guinea)
3903	mdd	Mbum
3904	mde	Maba (Chad)
3905	mdf	Moksha
3906	mdg	Massalat
3907	mdh	Maguindanaon
3908	mdi	Mamvu
3909	mdj	Mangbetu
3910	mdk	Mangbutu
3911	mdl	Maltese Sign Language
3912	mdm	Mayogo
3913	mdn	Mbati
3914	mdp	Mbala
3915	mdq	Mbole
3916	mdr	Mandar
3917	mds	Maria (Papua New Guinea)
3918	mdt	Mbere
3919	mdu	Mboko
3920	mdv	Santa LucÃ­a Monteverde Mixtec
3921	mdw	Mbosi
3922	mdx	Dizin
3923	mdy	Male (Ethiopia)
3924	mdz	SuruÃ­ Do ParÃ¡
3925	mea	Menka
3926	meb	Ikobi
3927	mec	Marra
3928	med	Melpa
3929	mee	Mengen
3930	mef	Megam
3931	meh	Southwestern Tlaxiaco Mixtec
3932	mei	Midob
3933	mej	Meyah
3934	mek	Mekeo
3935	mel	Central Melanau
3936	mem	Mangala
3937	men	Mende (Sierra Leone)
3938	meo	Kedah Malay
3939	mep	Miriwoong
3940	meq	Merey
3941	mer	Meru
3942	mes	Masmaje
3943	met	Mato
3944	meu	Motu
3945	mev	Mano
3946	mew	Maaka
3947	mey	Hassaniyya
3948	mez	Menominee
3949	mfa	Pattani Malay
3950	mfb	Bangka
3951	mfc	Mba
3952	mfd	Mendankwe-Nkwen
3953	mfe	Morisyen
3954	mff	Naki
3955	mfg	Mogofin
3956	mfh	Matal
3957	mfi	Wandala
3958	mfj	Mefele
3959	mfk	North Mofu
3960	mfl	Putai
3961	mfm	Marghi South
3962	mfn	Cross River Mbembe
3963	mfo	Mbe
3964	mfp	Makassar Malay
3965	mfq	Moba
3966	mfr	Marrithiyel
3967	mfs	Mexican Sign Language
3968	mft	Mokerang
3969	mfu	Mbwela
3970	mfv	Mandjak
3971	mfw	Mulaha
3972	mfx	Melo
3973	mfy	Mayo
3974	mfz	Mabaan
3975	mga	Middle Irish (900-1200)
3976	mgb	Mararit
3977	mgc	Morokodo
3978	mgd	Moru
3979	mge	Mango
3980	mgf	Maklew
3981	mgg	Mpumpong
3982	mgh	Makhuwa-Meetto
3983	mgi	Lijili
3984	mgj	Abureni
3985	mgk	Mawes
3986	mgl	Maleu-Kilenge
3987	mgm	Mambae
3988	mgn	Mbangi
3989	mgo	Meta'
3990	mgp	Eastern Magar
3991	mgq	Malila
3992	mgr	Mambwe-Lungu
3993	mgs	Manda (Tanzania)
3994	mgt	Mongol
3995	mgu	Mailu
3996	mgv	Matengo
3997	mgw	Matumbi
3998	mgy	Mbunga
3999	mgz	Mbugwe
4000	mha	Manda (India)
4001	mhb	Mahongwe
4002	mhc	Mocho
4003	mhd	Mbugu
4004	mhe	Besisi
4005	mhf	Mamaa
4006	mhg	Margu
4007	mhi	Ma'di
4008	mhj	Mogholi
4009	mhk	Mungaka
4010	mhl	Mauwake
4011	mhm	Makhuwa-Moniga
4012	mhn	MÃ³cheno
4013	mho	Mashi (Zambia)
4014	mhp	Balinese Malay
4015	mhq	Mandan
4016	mhr	Eastern Mari
4017	mhs	Buru (Indonesia)
4018	mht	Mandahuaca
4019	mhu	Digaro-Mishmi
4020	mhw	Mbukushu
4021	mhx	Maru
4022	mhy	Ma'anyan
4023	mhz	Mor (Mor Islands)
4024	mia	Miami
4025	mib	AtatlÃ¡huca Mixtec
4026	mic	Mi'kmaq
4027	mid	Mandaic
4028	mie	Ocotepec Mixtec
4029	mif	Mofu-Gudur
4030	mig	San Miguel El Grande Mixtec
4031	mih	Chayuco Mixtec
4032	mii	ChigmecatitlÃ¡n Mixtec
4033	mij	Abar
4034	mik	Mikasuki
4035	mil	PeÃ±oles Mixtec
4036	mim	Alacatlatzala Mixtec
4037	min	Minangkabau
4038	mio	Pinotepa Nacional Mixtec
4039	mip	Apasco-Apoala Mixtec
4040	miq	MÃ­skito
4041	mir	Isthmus Mixe
4042	mis	Uncoded languages
4043	mit	Southern Puebla Mixtec
4044	miu	Cacaloxtepec Mixtec
4045	miw	Akoye
4046	mix	Mixtepec Mixtec
4047	miy	Ayutla Mixtec
4048	miz	Coatzospan Mixtec
4049	mjb	Makalero
4050	mjc	San Juan Colorado Mixtec
4051	mjd	Northwest Maidu
4052	mje	Muskum
4053	mjg	Tu
4054	mjh	Mwera (Nyasa)
4055	mji	Kim Mun
4056	mjj	Mawak
4057	mjk	Matukar
4058	mjl	Mandeali
4059	mjm	Medebur
4060	mjn	Ma (Papua New Guinea)
4061	mjo	Malankuravan
4062	mjp	Malapandaram
4063	mjq	Malaryan
4064	mjr	Malavedan
4065	mjs	Miship
4066	mjt	Sauria Paharia
4067	mju	Manna-Dora
4068	mjv	Mannan
4069	mjw	Karbi
4070	mjx	Mahali
4071	mjy	Mahican
4072	mjz	Majhi
4073	mka	Mbre
4074	mkb	Mal Paharia
4075	mkc	Siliput
4076	mk	Macedonian
4077	mke	Mawchi
4078	mkf	Miya
4079	mkg	Mak (China)
4080	mki	Dhatki
4081	mkj	Mokilese
4082	mkk	Byep
4083	mkl	Mokole
4084	mkm	Moklen
4085	mkn	Kupang Malay
4086	mko	Mingang Doso
4087	mkp	Moikodi
4088	mkq	Bay Miwok
4089	mkr	Malas
4090	mks	Silacayoapan Mixtec
4091	mkt	Vamale
4092	mku	Konyanka Maninka
4093	mkv	Mafea
4094	mkw	Kituba (Congo)
4095	mkx	Kinamiging Manobo
4096	mky	East Makian
4097	mkz	Makasae
4098	mla	Malo
4099	mlb	Mbule
4100	mlc	Cao Lan
4101	mle	Manambu
4102	mlf	Mal
4103	mg	Malagasy
4104	mlh	Mape
4105	mli	Malimpung
4106	mlj	Miltu
4107	mlk	Ilwana
4108	mll	Malua Bay
4109	mlm	Mulam
4110	mln	Malango
4111	mlo	Mlomp
4112	mlp	Bargam
4113	mlq	Western Maninkakan
4114	mlr	Vame
4115	mls	Masalit
4116	mt	Maltese
4117	mlu	To'abaita
4118	mlv	Motlav
4119	mlw	Moloko
4120	mlx	Malfaxal
4121	mlz	Malaynon
4122	mma	Mama
4123	mmb	Momina
4124	mmc	MichoacÃ¡n Mazahua
4125	mmd	Maonan
4126	mme	Mae
4127	mmf	Mundat
4128	mmg	North Ambrym
4129	mmh	MehinÃ¡ku
4130	mmi	Musar
4131	mmj	Majhwar
4132	mmk	Mukha-Dora
4133	mml	Man Met
4134	mmm	Maii
4135	mmn	Mamanwa
4136	mmo	Mangga Buang
4137	mmp	Siawi
4138	mmq	Musak
4139	mmr	Western Xiangxi Miao
4140	mmt	Malalamai
4141	mmu	Mmaala
4142	mmv	Miriti
4143	mmw	Emae
4144	mmx	Madak
4145	mmy	Migaama
4146	mmz	Mabaale
4147	mna	Mbula
4148	mnb	Muna
4149	mnc	Manchu
4150	mnd	MondÃ©
4151	mne	Naba
4152	mnf	Mundani
4153	mng	Eastern Mnong
4154	mnh	Mono (Democratic Republic of Congo)
4155	mni	Manipuri
4156	mnj	Munji
4157	mnk	Mandinka
4158	mnl	Tiale
4159	mnm	Mapena
4160	mnn	Southern Mnong
4161	mnp	Min Bei Chinese
4162	mnq	Minriq
4163	mnr	Mono (USA)
4164	mns	Mansi
4165	mnu	Mer
4166	mnv	Rennell-Bellona
4167	mnw	Mon
4168	mnx	Manikion
4169	mny	Manyawa
4170	mnz	Moni
4171	moa	Mwan
4172	moc	MocovÃ­
4173	mod	Mobilian
4174	moe	Innu
4175	mog	Mongondow
4176	moh	Mohawk
4177	moi	Mboi
4178	moj	Monzombo
4179	mok	Morori
4180	mom	Mangue
4181	mn	Mongolian
4182	moo	Monom
4183	mop	MopÃ¡n Maya
4184	moq	Mor (Bomberai Peninsula)
4185	mor	Moro
4186	mos	Mossi
4187	mot	BarÃ­
4188	mou	Mogum
4189	mov	Mohave
4190	mow	Moi (Congo)
4191	mox	Molima
4192	moy	Shekkacho
4193	moz	Mukulu
4194	mpa	Mpoto
4195	mpb	Malak Malak
4196	mpc	Mangarrayi
4197	mpd	Machinere
4198	mpe	Majang
4199	mpg	Marba
4200	mph	Maung
4201	mpi	Mpade
4202	mpj	Martu Wangka
4203	mpk	Mbara (Chad)
4204	mpl	Middle Watut
4205	mpm	YosondÃºa Mixtec
4206	mpn	Mindiri
4207	mpo	Miu
4208	mpp	Migabac
4209	mpq	MatÃ­s
4210	mpr	Vangunu
4211	mps	Dadibi
4212	mpt	Mian
4213	mpu	MakurÃ¡p
4214	mpv	Mungkip
4215	mpw	Mapidian
4216	mpx	Misima-Panaeati
4217	mpy	Mapia
4218	mpz	Mpi
4219	mqa	Maba (Indonesia)
4220	mqb	Mbuko
4221	mqc	Mangole
4222	mqe	Matepi
4223	mqf	Momuna
4224	mqg	Kota Bangun Kutai Malay
4225	mqh	Tlazoyaltepec Mixtec
4226	mqi	Mariri
4227	mqj	Mamasa
4228	mqk	Rajah Kabunsuwan Manobo
4229	mql	Mbelime
4230	mqm	South Marquesan
4231	mqn	Moronene
4232	mqo	Modole
4233	mqp	Manipa
4234	mqq	Minokok
4235	mqr	Mander
4236	mqs	West Makian
4237	mqt	Mok
4238	mqu	Mandari
4239	mqv	Mosimo
4240	mqw	Murupi
4241	mqx	Mamuju
4242	mqy	Manggarai
4243	mqz	Pano
4244	mra	Mlabri
4245	mrb	Marino
4246	mrc	Maricopa
4247	mrd	Western Magar
4248	mre	Martha's Vineyard Sign Language
4249	mrf	Elseng
4250	mrg	Mising
4251	mrh	Mara Chin
4252	mi	Maori
4253	mrj	Western Mari
4254	mrk	Hmwaveke
4255	mrl	Mortlockese
4256	mrm	Merlav
4257	mrn	Cheke Holo
4258	mro	Mru
4259	mrp	Morouas
4260	mrq	North Marquesan
4261	mrr	Maria (India)
4262	mrs	Maragus
4263	mrt	Marghi Central
4264	mru	Mono (Cameroon)
4265	mrv	Mangareva
4266	mrw	Maranao
4267	mrx	Maremgi
4268	mry	Mandaya
4269	mrz	Marind
4270	ms	Malay (macrolanguage)
4271	msb	Masbatenyo
4272	msc	Sankaran Maninka
4273	msd	Yucatec Maya Sign Language
4274	mse	Musey
4275	msf	Mekwei
4276	msg	Moraid
4277	msh	Masikoro Malagasy
4278	msi	Sabah Malay
4279	msj	Ma (Democratic Republic of Congo)
4280	msk	Mansaka
4281	msl	Molof
4282	msm	Agusan Manobo
4283	msn	VurÃ«s
4284	mso	Mombum
4285	msp	MaritsauÃ¡
4286	msq	Caac
4287	msr	Mongolian Sign Language
4288	mss	West Masela
4289	msu	Musom
4290	msv	Maslam
4291	msw	Mansoanka
4292	msx	Moresada
4293	msy	Aruamu
4294	msz	Momare
4295	mta	Cotabato Manobo
4296	mtb	Anyin Morofo
4297	mtc	Munit
4298	mtd	Mualang
4299	mte	Mono (Solomon Islands)
4300	mtf	Murik (Papua New Guinea)
4301	mtg	Una
4302	mth	Munggui
4303	mti	Maiwa (Papua New Guinea)
4304	mtj	Moskona
4305	mtk	Mbe'
4306	mtl	Montol
4307	mtm	Mator
4308	mtn	Matagalpa
4309	mto	Totontepec Mixe
4310	mtp	WichÃ­ LhamtÃ©s Nocten
4311	mtq	Muong
4312	mtr	Mewari
4313	mts	Yora
4314	mtt	Mota
4315	mtu	Tututepec Mixtec
4316	mtv	Asaro'o
4317	mtw	Southern Binukidnon
4318	mtx	TidaÃ¡ Mixtec
4319	mty	Nabi
4320	mua	Mundang
4321	mub	Mubi
4322	muc	Ajumbu
4323	mud	Mednyj Aleut
4324	mue	Media Lengua
4325	mug	Musgu
4326	muh	MÃ¼ndÃ¼
4327	mui	Musi
4328	muj	Mabire
4329	muk	Mugom
4330	mul	Multiple languages
4331	mum	Maiwala
4332	muo	Nyong
4333	mup	Malvi
4334	muq	Eastern Xiangxi Miao
4335	mur	Murle
4336	mus	Creek
4337	mut	Western Muria
4338	muu	Yaaku
4339	muv	Muthuvan
4340	mux	Bo-Ung
4341	muy	Muyang
4342	muz	Mursi
4343	mva	Manam
4344	mvb	Mattole
4345	mvd	Mamboru
4346	mve	Marwari (Pakistan)
4347	mvf	Peripheral Mongolian
4348	mvg	YucuaÃ±e Mixtec
4349	mvh	Mulgi
4350	mvi	Miyako
4351	mvk	Mekmek
4352	mvl	Mbara (Australia)
4353	mvn	Minaveha
4354	mvo	Marovo
4355	mvp	Duri
4356	mvq	Moere
4357	mvr	Marau
4358	mvs	Massep
4359	mvt	Mpotovoro
4360	mvu	Marfa
4361	mvv	Tagal Murut
4362	mvw	Machinga
4363	mvx	Meoswar
4364	mvy	Indus Kohistani
4365	mvz	Mesqan
4366	mwa	Mwatebu
4367	mwb	Juwal
4368	mwc	Are
4369	mwe	Mwera (Chimwera)
4370	mwf	Murrinh-Patha
4371	mwg	Aiklep
4372	mwh	Mouk-Aria
4373	mwi	Labo
4374	mwk	Kita Maninkakan
4375	mwl	Mirandese
4376	mwm	Sar
4377	mwn	Nyamwanga
4378	mwo	Central Maewo
4379	mwp	Kala Lagaw Ya
4380	mwq	MÃ¼n Chin
4381	mwr	Marwari
4382	mws	Mwimbi-Muthambi
4383	mwt	Moken
4384	mwu	Mittu
4385	mwv	Mentawai
4386	mww	Hmong Daw
4387	mwz	Moingi
4388	mxa	Northwest Oaxaca Mixtec
4389	mxb	TezoatlÃ¡n Mixtec
4390	mxc	Manyika
4391	mxd	Modang
4392	mxe	Mele-Fila
4393	mxf	Malgbe
4394	mxg	Mbangala
4395	mxh	Mvuba
4396	mxi	Mozarabic
4397	mxj	Miju-Mishmi
4398	mxk	Monumbo
4399	mxl	Maxi Gbe
4400	mxm	Meramera
4401	mxn	Moi (Indonesia)
4402	mxo	Mbowe
4403	mxp	Tlahuitoltepec Mixe
4404	mxq	Juquila Mixe
4405	mxr	Murik (Malaysia)
4406	mxs	Huitepec Mixtec
4407	mxt	Jamiltepec Mixtec
4408	mxu	Mada (Cameroon)
4409	mxv	MetlatÃ³noc Mixtec
4410	mxw	Namo
4411	mxx	Mahou
4412	mxy	Southeastern NochixtlÃ¡n Mixtec
4413	mxz	Central Masela
4414	my	Burmese
4415	myb	Mbay
4416	myc	Mayeka
4417	mye	Myene
4418	myf	Bambassi
4419	myg	Manta
4420	myh	Makah
4421	myj	Mangayat
4422	myk	Mamara Senoufo
4423	myl	Moma
4424	mym	Me'en
4425	myo	Anfillo
4426	myp	PirahÃ£
4427	myr	Muniche
4428	mys	Mesmes
4429	myu	MundurukÃº
4430	myv	Erzya
4431	myw	Muyuw
4432	myx	Masaaba
4433	myy	Macuna
4434	myz	Classical Mandaic
4435	mza	Santa MarÃ­a Zacatepec Mixtec
4436	mzb	Tumzabt
4437	mzc	Madagascar Sign Language
4438	mzd	Malimba
4439	mze	Morawa
4440	mzg	Monastic Sign Language
4441	mzh	WichÃ­ LhamtÃ©s GÃ¼isnay
4442	mzi	IxcatlÃ¡n Mazatec
4443	mzj	Manya
4444	mzk	Nigeria Mambila
4445	mzl	MazatlÃ¡n Mixe
4446	mzm	Mumuye
4447	mzn	Mazanderani
4448	mzo	Matipuhy
4449	mzp	Movima
4450	mzq	Mori Atas
4451	mzr	MarÃºbo
4452	mzs	Macanese
4453	mzt	Mintil
4454	mzu	Inapang
4455	mzv	Manza
4456	mzw	Deg
4457	mzx	Mawayana
4458	mzy	Mozambican Sign Language
4459	mzz	Maiadomu
4460	naa	Namla
4461	nab	Southern NambikuÃ¡ra
4462	nac	Narak
4463	nae	Naka'ela
4464	naf	Nabak
4465	nag	Naga Pidgin
4466	naj	Nalu
4467	nak	Nakanai
4468	nal	Nalik
4469	nam	Ngan'gityemerri
4470	nan	Min Nan Chinese
4471	nao	Naaba
4472	nap	Neapolitan
4473	naq	Khoekhoe
4474	nar	Iguta
4475	nas	Naasioi
4476	nat	CaÌ±hungwaÌ±ryaÌ±
4477	na	Nauru
4478	nv	Navajo
4479	naw	Nawuri
4480	nax	Nakwi
4481	nay	Ngarrindjeri
4482	naz	Coatepec Nahuatl
4483	nba	Nyemba
4484	nbb	Ndoe
4485	nbc	Chang Naga
4486	nbd	Ngbinda
4487	nbe	Konyak Naga
4488	nbg	Nagarchal
4489	nbh	Ngamo
4490	nbi	Mao Naga
4491	nbj	Ngarinyman
4492	nbk	Nake
4493	nr	South Ndebele
4494	nbm	Ngbaka Ma'bo
4495	nbn	Kuri
4496	nbo	Nkukoli
4497	nbp	Nnam
4498	nbq	Nggem
4499	nbr	Numana
4500	nbs	Namibian Sign Language
4501	nbt	Na
4502	nbu	Rongmei Naga
4503	nbv	Ngamambo
4504	nbw	Southern Ngbandi
4505	nby	Ningera
4506	nca	Iyo
4507	ncb	Central Nicobarese
4508	ncc	Ponam
4509	ncd	Nachering
4510	nce	Yale
4511	ncf	Notsi
4512	ncg	Nisga'a
4513	nch	Central Huasteca Nahuatl
4514	nci	Classical Nahuatl
4515	ncj	Northern Puebla Nahuatl
4516	nck	Na-kara
4517	ncl	MichoacÃ¡n Nahuatl
4518	ncm	Nambo
4519	ncn	Nauna
4520	nco	Sibe
4521	ncq	Northern Katang
4522	ncr	Ncane
4523	ncs	Nicaraguan Sign Language
4524	nct	Chothe Naga
4525	ncu	Chumburung
4526	ncx	Central Puebla Nahuatl
4527	ncz	Natchez
4528	nda	Ndasa
4529	ndb	Kenswei Nsei
4530	ndc	Ndau
4531	ndd	Nde-Nsele-Nta
4532	nd	North Ndebele
4533	ndf	Nadruvian
4534	ndg	Ndengereko
4535	ndh	Ndali
4536	ndi	Samba Leko
4537	ndj	Ndamba
4538	ndk	Ndaka
4539	ndl	Ndolo
4540	ndm	Ndam
4541	ndn	Ngundi
4542	ng	Ndonga
4543	ndp	Ndo
4544	ndq	Ndombe
4545	ndr	Ndoola
4546	nds	Low German
4547	ndt	Ndunga
4548	ndu	Dugun
4549	ndv	Ndut
4550	ndw	Ndobo
4551	ndx	Nduga
4552	ndy	Lutos
4553	ndz	Ndogo
4554	nea	Eastern Ngad'a
4555	neb	Toura (CÃ´te d'Ivoire)
4556	nec	Nedebang
4557	ned	Nde-Gbite
4558	nee	NÃªlÃªmwa-Nixumwak
4559	nef	Nefamese
4560	neg	Negidal
4561	neh	Nyenkha
4562	nei	Neo-Hittite
4563	nej	Neko
4564	nek	Neku
4565	nem	Nemi
4566	nen	Nengone
4567	neo	NÃ¡-Meo
4568	ne	Nepali (macrolanguage)
4569	neq	North Central Mixe
4570	ner	Yahadian
4571	nes	Bhoti Kinnauri
4572	net	Nete
4573	neu	Neo
4574	nev	Nyaheun
4575	new	Newari
4576	nex	Neme
4577	ney	Neyo
4578	nez	Nez Perce
4579	nfa	Dhao
4580	nfd	Ahwai
4581	nfl	Ayiwo
4582	nfr	Nafaanra
4583	nfu	Mfumte
4584	nga	Ngbaka
4585	ngb	Northern Ngbandi
4586	ngc	Ngombe (Democratic Republic of Congo)
4587	ngd	Ngando (Central African Republic)
4588	nge	Ngemba
4589	ngg	Ngbaka Manza
4590	ngh	NÇng
4591	ngi	Ngizim
4592	ngj	Ngie
4593	ngk	Dalabon
4594	ngl	Lomwe
4595	ngm	Ngatik Men's Creole
4596	ngn	Ngwo
4597	ngp	Ngulu
4598	ngq	Ngurimi
4599	ngr	Engdewu
4600	ngs	Gvoko
4601	ngt	Kriang
4602	ngu	Guerrero Nahuatl
4603	ngv	Nagumi
4604	ngw	Ngwaba
4605	ngx	Nggwahyi
4606	ngy	Tibea
4607	ngz	Ngungwel
4608	nha	Nhanda
4609	nhb	Beng
4610	nhc	Tabasco Nahuatl
4611	nhd	ChiripÃ¡
4612	nhe	Eastern Huasteca Nahuatl
4613	nhf	Nhuwala
4614	nhg	Tetelcingo Nahuatl
4615	nhh	Nahari
4616	nhi	ZacatlÃ¡n-AhuacatlÃ¡n-Tepetzintla Nahuatl
4617	nhk	Isthmus-Cosoleacaque Nahuatl
4618	nhm	Morelos Nahuatl
4619	nhn	Central Nahuatl
4620	nho	Takuu
4621	nhp	Isthmus-Pajapan Nahuatl
4622	nhq	Huaxcaleca Nahuatl
4623	nhr	Naro
4624	nht	Ometepec Nahuatl
4625	nhu	Noone
4626	nhv	Temascaltepec Nahuatl
4627	nhw	Western Huasteca Nahuatl
4628	nhx	Isthmus-Mecayapan Nahuatl
4629	nhy	Northern Oaxaca Nahuatl
4630	nhz	Santa MarÃ­a La Alta Nahuatl
4631	nia	Nias
4632	nib	Nakame
4633	nid	Ngandi
4634	nie	Niellim
4635	nif	Nek
4636	nig	Ngalakgan
4637	nih	Nyiha (Tanzania)
4638	nii	Nii
4639	nij	Ngaju
4640	nik	Southern Nicobarese
4641	nil	Nila
4642	nim	Nilamba
4643	nin	Ninzo
4644	nio	Nganasan
4645	niq	Nandi
4646	nir	Nimboran
4647	nis	Nimi
4648	nit	Southeastern Kolami
4649	niu	Niuean
4650	niv	Gilyak
4651	niw	Nimo
4652	nix	Hema
4653	niy	Ngiti
4654	niz	Ningil
4655	nja	Nzanyi
4656	njb	Nocte Naga
4657	njd	Ndonde Hamba
4658	njh	Lotha Naga
4659	nji	Gudanji
4660	njj	Njen
4661	njl	Njalgulgule
4662	njm	Angami Naga
4663	njn	Liangmai Naga
4664	njo	Ao Naga
4665	njr	Njerep
4666	njs	Nisa
4667	njt	Ndyuka-Trio Pidgin
4668	nju	Ngadjunmaya
4669	njx	Kunyi
4670	njy	Njyem
4671	njz	Nyishi
4672	nka	Nkoya
4673	nkb	Khoibu Naga
4674	nkc	Nkongho
4675	nkd	Koireng
4676	nke	Duke
4677	nkf	Inpui Naga
4678	nkg	Nekgini
4679	nkh	Khezha Naga
4680	nki	Thangal Naga
4681	nkj	Nakai
4682	nkk	Nokuku
4683	nkm	Namat
4684	nkn	Nkangala
4685	nko	Nkonya
4686	nkp	Niuatoputapu
4687	nkq	Nkami
4688	nkr	Nukuoro
4689	nks	North Asmat
4690	nkt	Nyika (Tanzania)
4691	nku	Bouna Kulango
4692	nkv	Nyika (Malawi and Zambia)
4693	nkw	Nkutu
4694	nkx	Nkoroo
4695	nkz	Nkari
4696	nla	Ngombale
4697	nlc	Nalca
4698	nl	Dutch
4699	nle	East Nyala
4700	nlg	Gela
4701	nli	Grangali
4702	nlj	Nyali
4703	nlk	Ninia Yali
4704	nll	Nihali
4705	nlm	Mankiyali
4706	nlo	Ngul
4707	nlq	Lao Naga
4708	nlu	Nchumbulu
4709	nlv	Orizaba Nahuatl
4710	nlw	Walangama
4711	nlx	Nahali
4712	nly	Nyamal
4713	nlz	NalÃ¶go
4714	nma	Maram Naga
4715	nmb	Big Nambas
4716	nmc	Ngam
4717	nmd	Ndumu
4718	nme	Mzieme Naga
4719	nmf	Tangkhul Naga (India)
4720	nmg	Kwasio
4721	nmh	Monsang Naga
4722	nmi	Nyam
4723	nmj	Ngombe (Central African Republic)
4724	nmk	Namakura
4725	nml	Ndemli
4726	nmm	Manangba
4727	nmn	ÇƒXÃ³Ãµ
4728	nmo	Moyon Naga
4729	nmp	Nimanbur
4730	nmq	Nambya
4731	nmr	Nimbari
4732	nms	Letemboi
4733	nmt	Namonuito
4734	nmu	Northeast Maidu
4735	nmv	Ngamini
4736	nmw	Nimoa
4737	nmx	Nama (Papua New Guinea)
4738	nmy	Namuyi
4739	nmz	Nawdm
4740	nna	Nyangumarta
4741	nnb	Nande
4742	nnc	Nancere
4743	nnd	West Ambae
4744	nne	Ngandyera
4745	nnf	Ngaing
4746	nng	Maring Naga
4747	nnh	Ngiemboon
4748	nni	North Nuaulu
4749	nnj	Nyangatom
4750	nnk	Nankina
4751	nnl	Northern Rengma Naga
4752	nnm	Namia
4753	nnn	Ngete
4754	nn	Norwegian Nynorsk
4755	nnp	Wancho Naga
4756	nnq	Ngindo
4757	nnr	Narungga
4758	nnt	Nanticoke
4759	nnu	Dwang
4760	nnv	Nugunu (Australia)
4761	nnw	Southern Nuni
4762	nny	Nyangga
4763	nnz	Nda'nda'
4764	noa	Woun Meu
4765	nb	Norwegian BokmÃ¥l
4766	noc	Nuk
4767	nod	Northern Thai
4768	noe	Nimadi
4769	nof	Nomane
4770	nog	Nogai
4771	noh	Nomu
4772	noi	Noiri
4773	noj	Nonuya
4774	nok	Nooksack
4775	nol	Nomlaki
4776	non	Old Norse
4777	nop	Numanggang
4778	noq	Ngongo
4779	no	Norwegian
4780	nos	Eastern Nisu
4781	not	Nomatsiguenga
4782	nou	Ewage-Notu
4783	nov	Novial
4784	now	Nyambo
4785	noy	Noy
4786	noz	Nayi
4787	npa	Nar Phu
4788	npb	Nupbikha
4789	npg	Ponyo-Gongwang Naga
4790	nph	Phom Naga
4791	npi	Nepali (individual language)
4792	npl	Southeastern Puebla Nahuatl
4793	npn	Mondropolon
4794	npo	Pochuri Naga
4795	nps	Nipsan
4796	npu	Puimei Naga
4797	npx	Noipx
4798	npy	Napu
4799	nqg	Southern Nago
4800	nqk	Kura Ede Nago
4801	nql	Ngendelengo
4802	nqm	Ndom
4803	nqn	Nen
4804	nqo	N'Ko
4805	nqq	Kyan-Karyaw Naga
4806	nqt	Nteng
4807	nqy	Akyaung Ari Naga
4808	nra	Ngom
4809	nrb	Nara
4810	nrc	Noric
4811	nre	Southern Rengma Naga
4812	nrf	JÃ¨rriais
4813	nrg	Narango
4814	nri	Chokri Naga
4815	nrk	Ngarla
4816	nrl	Ngarluma
4817	nrm	Narom
4818	nrn	Norn
4819	nrp	North Picene
4820	nrr	Norra
4821	nrt	Northern Kalapuya
4822	nru	Narua
4823	nrx	Ngurmbur
4824	nrz	Lala
4825	nsa	Sangtam Naga
4826	nsb	Lower Nossob
4827	nsc	Nshi
4828	nsd	Southern Nisu
4829	nse	Nsenga
4830	nsf	Northwestern Nisu
4831	nsg	Ngasa
4832	nsh	Ngoshie
4833	nsi	Nigerian Sign Language
4834	nsk	Naskapi
4835	nsl	Norwegian Sign Language
4836	nsm	Sumi Naga
4837	nsn	Nehan
4838	nso	Pedi
4839	nsp	Nepalese Sign Language
4840	nsq	Northern Sierra Miwok
4841	nsr	Maritime Sign Language
4842	nss	Nali
4843	nst	Tase Naga
4844	nsu	Sierra Negra Nahuatl
4845	nsv	Southwestern Nisu
4846	nsw	Navut
4847	nsx	Nsongo
4848	nsy	Nasal
4849	nsz	Nisenan
4850	ntd	Northern Tidung
4851	nte	Nathembo
4852	ntg	Ngantangarra
4853	nti	Natioro
4854	ntj	Ngaanyatjarra
4855	ntk	Ikoma-Nata-Isenye
4856	ntm	Nateni
4857	nto	Ntomba
4858	ntp	Northern Tepehuan
4859	ntr	Delo
4860	ntu	NatÃ¼gu
4861	ntw	Nottoway
4862	ntx	Tangkhul Naga (Myanmar)
4863	nty	Mantsi
4864	ntz	Natanzi
4865	nua	Yuanga
4866	nuc	Nukuini
4867	nud	Ngala
4868	nue	Ngundu
4869	nuf	Nusu
4870	nug	Nungali
4871	nuh	Ndunda
4872	nui	Ngumbi
4873	nuj	Nyole
4874	nuk	Nuu-chah-nulth
4875	nul	Nusa Laut
4876	num	Niuafo'ou
4877	nun	Anong
4878	nuo	NguÃ´n
4879	nup	Nupe-Nupe-Tako
4880	nuq	Nukumanu
4881	nur	Nukuria
4882	nus	Nuer
4883	nut	Nung (Viet Nam)
4884	nuu	Ngbundu
4885	nuv	Northern Nuni
4886	nuw	Nguluwan
4887	nux	Mehek
4888	nuy	Nunggubuyu
4889	nuz	Tlamacazapa Nahuatl
4890	nvh	Nasarian
4891	nvm	Namiae
4892	nvo	Nyokon
4893	nwa	Nawathinehena
4894	nwb	Nyabwa
4895	nwc	Classical Newari
4896	nwe	Ngwe
4897	nwg	Ngayawung
4898	nwi	Southwest Tanna
4899	nwm	Nyamusa-Molo
4900	nwo	Nauo
4901	nwr	Nawaru
4902	nww	Ndwewe
4903	nwx	Middle Newar
4904	nwy	Nottoway-Meherrin
4905	nxa	Nauete
4906	nxd	Ngando (Democratic Republic of Congo)
4907	nxe	Nage
4908	nxg	Ngad'a
4909	nxi	Nindi
4910	nxk	Koki Naga
4911	nxl	South Nuaulu
4912	nxm	Numidian
4913	nxn	Ngawun
4914	nxo	Ndambomo
4915	nxq	Naxi
4916	nxr	Ninggerum
4917	nxx	Nafri
4918	ny	Nyanja
4919	nyb	Nyangbo
4920	nyc	Nyanga-li
4921	nyd	Nyore
4922	nye	Nyengo
4923	nyf	Giryama
4924	nyg	Nyindu
4925	nyh	Nyikina
4926	nyi	Ama (Sudan)
4927	nyj	Nyanga
4928	nyk	Nyaneka
4929	nyl	Nyeu
4930	nym	Nyamwezi
4931	nyn	Nyankole
4932	nyo	Nyoro
4933	nyp	Nyang'i
4934	nyq	Nayini
4935	nyr	Nyiha (Malawi)
4936	nys	Nyungar
4937	nyt	Nyawaygi
4938	nyu	Nyungwe
4939	nyv	Nyulnyul
4940	nyw	Nyaw
4941	nyx	Nganyaywana
4942	nyy	Nyakyusa-Ngonde
4943	nza	Tigon Mbembe
4944	nzb	Njebi
4945	nzd	Nzadi
4946	nzi	Nzima
4947	nzk	Nzakara
4948	nzm	Zeme Naga
4949	nzr	Dir-Nyamzak-Mbarimi
4950	nzs	New Zealand Sign Language
4951	nzu	Teke-Nzikou
4952	nzy	Nzakambay
4953	nzz	Nanga Dama Dogon
4954	oaa	Orok
4955	oac	Oroch
4956	oar	Old Aramaic (up to 700 BCE)
4957	oav	Old Avar
4958	obi	ObispeÃ±o
4959	obk	Southern Bontok
4960	obl	Oblo
4961	obm	Moabite
4962	obo	Obo Manobo
4963	obr	Old Burmese
4964	obt	Old Breton
4965	obu	Obulom
4966	oca	Ocaina
4967	och	Old Chinese
4968	oc	Occitan (post 1500)
4969	ocm	Old Cham
4970	oco	Old Cornish
4971	ocu	Atzingo Matlatzinca
4972	oda	Odut
4973	odk	Od
4974	odt	Old Dutch
4975	odu	Odual
4976	ofo	Ofo
4977	ofs	Old Frisian
4978	ofu	Efutop
4979	ogb	Ogbia
4980	ogc	Ogbah
4981	oge	Old Georgian
4982	ogg	Ogbogolo
4983	ogo	Khana
4984	ogu	Ogbronuagum
4985	oht	Old Hittite
4986	ohu	Old Hungarian
4987	oia	Oirata
4988	oie	Okolie
4989	oin	Inebu One
4990	ojb	Northwestern Ojibwa
4991	ojc	Central Ojibwa
4992	ojg	Eastern Ojibwa
4993	oj	Ojibwa
4994	ojp	Old Japanese
4995	ojs	Severn Ojibwa
4996	ojv	Ontong Java
4997	ojw	Western Ojibwa
4998	oka	Okanagan
4999	okb	Okobo
5000	okc	Kobo
5001	okd	Okodia
5002	oke	Okpe (Southwestern Edo)
5003	okg	Koko Babangk
5004	okh	Koresh-e Rostam
5005	oki	Okiek
5006	okj	Oko-Juwoi
5007	okk	Kwamtim One
5008	okl	Old Kentish Sign Language
5009	okm	Middle Korean (10th-16th cent.)
5010	okn	Oki-No-Erabu
5011	oko	Old Korean (3rd-9th cent.)
5012	okr	Kirike
5013	oks	Oko-Eni-Osayen
5014	oku	Oku
5015	okv	Orokaiva
5016	okx	Okpe (Northwestern Edo)
5017	okz	Old Khmer
5018	ola	Walungge
5019	old	Mochi
5020	ole	Olekha
5021	olk	Olkol
5022	olm	Oloma
5023	olo	Livvi
5024	olr	Olrat
5025	olt	Old Lithuanian
5026	olu	Kuvale
5027	oma	Omaha-Ponca
5028	omb	East Ambae
5029	omc	Mochica
5030	omg	Omagua
5031	omi	Omi
5032	omk	Omok
5033	oml	Ombo
5034	omn	Minoan
5035	omo	Utarmbung
5036	omp	Old Manipuri
5037	omr	Old Marathi
5038	omt	Omotik
5039	omu	Omurano
5040	omw	South Tairora
5041	omx	Old Mon
5042	omy	Old Malay
5043	ona	Ona
5044	onb	Lingao
5045	one	Oneida
5046	ong	Olo
5047	oni	Onin
5048	onj	Onjob
5049	onk	Kabore One
5050	onn	Onobasulu
5051	ono	Onondaga
5052	onp	Sartang
5053	onr	Northern One
5054	ons	Ono
5055	ont	Ontenu
5056	onu	Unua
5057	onw	Old Nubian
5058	onx	Onin Based Pidgin
5059	ood	Tohono O'odham
5060	oog	Ong
5061	oon	Ã–nge
5062	oor	Oorlams
5063	oos	Old Ossetic
5064	opa	Okpamheri
5065	opk	Kopkaka
5066	opm	Oksapmin
5067	opo	Opao
5068	opt	Opata
5069	opy	OfayÃ©
5070	ora	Oroha
5071	orc	Orma
5072	ore	OrejÃ³n
5073	org	Oring
5074	orh	Oroqen
5075	or	Oriya (macrolanguage)
5076	om	Oromo
5077	orn	Orang Kanaq
5078	oro	Orokolo
5079	orr	Oruma
5080	ors	Orang Seletar
5081	ort	Adivasi Oriya
5082	oru	Ormuri
5083	orv	Old Russian
5084	orw	Oro Win
5085	orx	Oro
5086	ory	Odia
5087	orz	Ormu
5088	osa	Osage
5089	osc	Oscan
5090	osi	Osing
5091	osn	Old Sundanese
5092	oso	Ososo
5093	osp	Old Spanish
5094	os	Ossetian
5095	ost	Osatu
5096	osu	Southern One
5097	osx	Old Saxon
5098	ota	Ottoman Turkish (1500-1928)
5099	otb	Old Tibetan
5100	otd	Ot Danum
5101	ote	Mezquital Otomi
5102	oti	Oti
5103	otk	Old Turkish
5104	otl	Tilapa Otomi
5105	otm	Eastern Highland Otomi
5106	otn	Tenango Otomi
5107	otq	QuerÃ©taro Otomi
5108	otr	Otoro
5109	ots	Estado de MÃ©xico Otomi
5110	ott	Temoaya Otomi
5111	otu	Otuke
5112	otw	Ottawa
5113	otx	Texcatepec Otomi
5114	oty	Old Tamil
5115	otz	Ixtenco Otomi
5116	oua	Tagargrent
5117	oub	Glio-Oubi
5118	oue	Oune
5119	oui	Old Uighur
5120	oum	Ouma
5121	ovd	Elfdalian
5122	owi	Owiniga
5123	owl	Old Welsh
5124	oyb	Oy
5125	oyd	Oyda
5126	oym	Wayampi
5127	oyy	Oya'oya
5128	ozm	Koonzime
5129	pab	ParecÃ­s
5130	pac	Pacoh
5131	pad	PaumarÃ­
5132	pae	Pagibete
5133	paf	ParanawÃ¡t
5134	pag	Pangasinan
5135	pah	Tenharim
5136	pai	Pe
5137	pak	ParakanÃ£
5138	pal	Pahlavi
5139	pam	Pampanga
5140	pa	Panjabi
5141	pao	Northern Paiute
5142	pap	Papiamento
5143	paq	Parya
5144	par	Panamint
5145	pas	Papasena
5146	pau	Palauan
5147	pav	PakaÃ¡snovos
5148	paw	Pawnee
5149	pax	PankararÃ©
5150	pay	Pech
5151	paz	PankararÃº
5152	pbb	PÃ¡ez
5153	pbc	Patamona
5154	pbe	Mezontla Popoloca
5155	pbf	Coyotepec Popoloca
5156	pbg	Paraujano
5157	pbh	E'Ã±apa Woromaipu
5158	pbi	Parkwa
5159	pbl	Mak (Nigeria)
5160	pbm	Puebla Mazatec
5161	pbn	Kpasam
5162	pbo	Papel
5163	pbp	Badyara
5164	pbr	Pangwa
5165	pbs	Central Pame
5166	pbt	Southern Pashto
5167	pbu	Northern Pashto
5168	pbv	Pnar
5169	pby	Pyu (Papua New Guinea)
5170	pca	Santa InÃ©s Ahuatempan Popoloca
5171	pcb	Pear
5172	pcc	Bouyei
5173	pcd	Picard
5174	pce	Ruching Palaung
5175	pcf	Paliyan
5176	pcg	Paniya
5177	pch	Pardhan
5178	pci	Duruwa
5179	pcj	Parenga
5180	pck	Paite Chin
5181	pcl	Pardhi
5182	pcm	Nigerian Pidgin
5183	pcn	Piti
5184	pcp	Pacahuara
5185	pcw	Pyapun
5186	pda	Anam
5187	pdc	Pennsylvania German
5188	pdi	Pa Di
5189	pdn	Podena
5190	pdo	Padoe
5191	pdt	Plautdietsch
5192	pdu	Kayan
5193	pea	Peranakan Indonesian
5194	peb	Eastern Pomo
5195	ped	Mala (Papua New Guinea)
5196	pee	Taje
5197	pef	Northeastern Pomo
5198	peg	Pengo
5199	peh	Bonan
5200	pei	Chichimeca-Jonaz
5201	pej	Northern Pomo
5202	pek	Penchal
5203	pel	Pekal
5204	pem	Phende
5205	peo	Old Persian (ca. 600-400 B.C.)
5206	pep	Kunja
5207	peq	Southern Pomo
5208	pes	Iranian Persian
5209	pev	PÃ©mono
5210	pex	Petats
5211	pey	Petjo
5212	pez	Eastern Penan
5213	pfa	PÃ¡Ã¡fang
5214	pfe	Pere
5215	pfl	Pfaelzisch
5216	pga	Sudanese Creole Arabic
5217	pgd	GÄndhÄrÄ«
5218	pgg	Pangwali
5219	pgi	Pagi
5220	pgk	Rerep
5221	pgl	Primitive Irish
5222	pgn	Paelignian
5223	pgs	Pangseng
5224	pgu	Pagu
5225	pgz	Papua New Guinean Sign Language
5226	pha	Pa-Hng
5227	phd	Phudagi
5228	phg	Phuong
5229	phh	Phukha
5230	phj	Pahari
5231	phk	Phake
5232	phl	Phalura
5233	phm	Phimbi
5234	phn	Phoenician
5235	pho	Phunoi
5236	phq	Phana'
5237	phr	Pahari-Potwari
5238	pht	Phu Thai
5239	phu	Phuan
5240	phv	Pahlavani
5241	phw	Phangduwali
5242	pia	Pima Bajo
5243	pib	Yine
5244	pic	Pinji
5245	pid	Piaroa
5246	pie	Piro
5247	pif	Pingelapese
5248	pig	Pisabo
5249	pih	Pitcairn-Norfolk
5250	pij	Pijao
5251	pil	Yom
5252	pim	Powhatan
5253	pin	Piame
5254	pio	Piapoco
5255	pip	Pero
5256	pir	Piratapuyo
5257	pis	Pijin
5258	pit	Pitta Pitta
5259	piu	Pintupi-Luritja
5260	piv	Pileni
5261	piw	Pimbwe
5262	pix	Piu
5263	piy	Piya-Kwonci
5264	piz	Pije
5265	pjt	Pitjantjatjara
5266	pka	ArdhamÄgadhÄ« PrÄkrit
5267	pkb	Pokomo
5268	pkc	Paekche
5269	pkg	Pak-Tong
5270	pkh	Pankhu
5271	pkn	Pakanha
5272	pko	PÃ¶koot
5273	pkp	Pukapuka
5274	pkr	Attapady Kurumba
5275	pks	Pakistan Sign Language
5276	pkt	Maleng
5277	pku	Paku
5278	pla	Miani
5279	plb	Polonombauk
5280	plc	Central Palawano
5281	pld	Polari
5282	ple	Palu'e
5283	plg	PilagÃ¡
5284	plh	Paulohi
5285	pi	Pali
5286	plk	Kohistani Shina
5287	pll	Shwe Palaung
5288	pln	Palenquero
5289	plo	Oluta Popoluca
5290	plq	Palaic
5291	plr	Palaka Senoufo
5292	pls	San Marcos Tlacoyalco Popoloca
5293	plt	Plateau Malagasy
5294	plu	PalikÃºr
5295	plv	Southwest Palawano
5296	plw	Brooke's Point Palawano
5297	ply	Bolyu
5298	plz	Paluan
5299	pma	Paama
5300	pmb	Pambia
5301	pmd	Pallanganmiddang
5302	pme	Pwaamei
5303	pmf	Pamona
5304	pmh	MÄhÄrÄá¹£á¹­ri PrÄkrit
5305	pmi	Northern Pumi
5306	pmj	Southern Pumi
5307	pml	Lingua Franca
5308	pmm	Pomo
5309	pmn	Pam
5310	pmo	Pom
5311	pmq	Northern Pame
5312	pmr	Paynamar
5313	pms	Piemontese
5314	pmt	Tuamotuan
5315	pmw	Plains Miwok
5316	pmx	Poumei Naga
5317	pmy	Papuan Malay
5318	pmz	Southern Pame
5319	pna	Punan Bah-Biau
5320	pnb	Western Panjabi
5321	pnc	Pannei
5322	pnd	Mpinda
5323	pne	Western Penan
5324	png	Pangu
5325	pnh	Penrhyn
5326	pni	Aoheng
5327	pnj	Pinjarup
5328	pnk	Paunaka
5329	pnl	Paleni
5330	pnm	Punan Batu 1
5331	pnn	Pinai-Hagahai
5332	pno	Panobo
5333	pnp	Pancana
5334	pnq	Pana (Burkina Faso)
5335	pnr	Panim
5336	pns	Ponosakan
5337	pnt	Pontic
5338	pnu	Jiongnai Bunu
5339	pnv	Pinigura
5340	pnw	Banyjima
5341	pnx	Phong-Kniang
5342	pny	Pinyin
5343	pnz	Pana (Central African Republic)
5344	poc	Poqomam
5345	poe	San Juan Atzingo Popoloca
5346	pof	Poke
5347	pog	PotiguÃ¡ra
5348	poh	Poqomchi'
5349	poi	Highland Popoluca
5350	pok	PokangÃ¡
5351	pl	Polish
5352	pom	Southeastern Pomo
5353	pon	Pohnpeian
5354	poo	Central Pomo
5355	pop	PwapwÃ¢
5356	poq	Texistepec Popoluca
5357	pt	Portuguese
5358	pos	Sayula Popoluca
5359	pot	Potawatomi
5360	pov	Upper Guinea Crioulo
5361	pow	San Felipe Otlaltepec Popoloca
5362	pox	Polabian
5363	poy	Pogolo
5364	ppe	Papi
5365	ppi	Paipai
5366	ppk	Uma
5367	ppl	Pipil
5368	ppm	Papuma
5369	ppn	Papapana
5370	ppo	Folopa
5371	ppp	Pelende
5372	ppq	Pei
5373	pps	San LuÃ­s Temalacayuca Popoloca
5374	ppt	Pare
5375	ppu	Papora
5376	pqa	Pa'a
5377	pqm	Malecite-Passamaquoddy
5378	prc	Parachi
5379	prd	Parsi-Dari
5380	pre	Principense
5381	prf	Paranan
5382	prg	Prussian
5383	prh	Porohanon
5384	pri	PaicÃ®
5385	prk	Parauk
5386	prl	Peruvian Sign Language
5387	prm	Kibiri
5388	prn	Prasuni
5389	pro	Old ProvenÃ§al (to 1500)
5390	prq	AshÃ©ninka PerenÃ©
5391	prr	Puri
5392	prs	Dari
5393	prt	Phai
5394	pru	Puragi
5395	prw	Parawen
5396	prx	Purik
5397	prz	Providencia Sign Language
5398	psa	Asue Awyu
5399	psc	Iranian Sign Language
5400	psd	Plains Indian Sign Language
5401	pse	Central Malay
5402	psg	Penang Sign Language
5403	psh	Southwest Pashai
5404	psi	Southeast Pashai
5405	psl	Puerto Rican Sign Language
5406	psm	Pauserna
5407	psn	Panasuan
5408	pso	Polish Sign Language
5409	psp	Philippine Sign Language
5410	psq	Pasi
5411	psr	Portuguese Sign Language
5412	pss	Kaulong
5413	pst	Central Pashto
5414	psu	Sauraseni PrÄkrit
5415	psw	Port Sandwich
5416	psy	Piscataway
5417	pta	Pai Tavytera
5418	pth	PataxÃ³ HÃ£-Ha-HÃ£e
5419	pti	Pindiini
5420	ptn	Patani
5421	pto	Zo'Ã©
5422	ptp	Patep
5423	ptq	Pattapu
5424	ptr	Piamatsina
5425	ptt	Enrekang
5426	ptu	Bambam
5427	ptv	Port Vato
5428	ptw	Pentlatch
5429	pty	Pathiya
5430	pua	Western Highland Purepecha
5431	pub	Purum
5432	puc	Punan Merap
5433	pud	Punan Aput
5434	pue	Puelche
5435	puf	Punan Merah
5436	pug	Phuie
5437	pui	Puinave
5438	puj	Punan Tubu
5439	pum	Puma
5440	puo	Puoc
5441	pup	Pulabu
5442	puq	Puquina
5443	pur	PuruborÃ¡
5444	pus	Pashto
5445	ps	Pushto
5446	put	Putoh
5447	puu	Punu
5448	puw	Puluwatese
5449	pux	Puare
5450	puy	PurisimeÃ±o
5451	pwa	Pawaia
5452	pwb	Panawa
5453	pwg	Gapapaiwa
5454	pwi	Patwin
5455	pwm	Molbog
5456	pwn	Paiwan
5457	pwo	Pwo Western Karen
5458	pwr	Powari
5459	pww	Pwo Northern Karen
5460	pxm	Quetzaltepec Mixe
5461	pye	Pye Krumen
5462	pym	Fyam
5463	pyn	PoyanÃ¡wa
5464	pys	Paraguayan Sign Language
5465	pyu	Puyuma
5466	pyx	Pyu (Myanmar)
5467	pyy	Pyen
5468	pze	Pesse
5469	pzh	Pazeh
5470	pzn	Jejara Naga
5471	qua	Quapaw
5472	qub	Huallaga HuÃ¡nuco Quechua
5473	quc	K'iche'
5474	qud	CalderÃ³n Highland Quichua
5475	qu	Quechua
5476	quf	Lambayeque Quechua
5477	qug	Chimborazo Highland Quichua
5478	quh	South Bolivian Quechua
5479	qui	Quileute
5480	quk	Chachapoyas Quechua
5481	qul	North Bolivian Quechua
5482	qum	Sipacapense
5483	qun	Quinault
5484	qup	Southern Pastaza Quechua
5485	quq	Quinqui
5486	qur	Yanahuanca Pasco Quechua
5487	qus	Santiago del Estero Quichua
5488	quv	Sacapulteco
5489	quw	Tena Lowland Quichua
5490	qux	Yauyos Quechua
5491	quy	Ayacucho Quechua
5492	quz	Cusco Quechua
5493	qva	Ambo-Pasco Quechua
5494	qvc	Cajamarca Quechua
5495	qve	Eastern ApurÃ­mac Quechua
5496	qvh	HuamalÃ­es-Dos de Mayo HuÃ¡nuco Quechua
5497	qvi	Imbabura Highland Quichua
5498	qvj	Loja Highland Quichua
5499	qvl	Cajatambo North Lima Quechua
5500	qvm	Margos-Yarowilca-Lauricocha Quechua
5501	qvn	North JunÃ­n Quechua
5502	qvo	Napo Lowland Quechua
5503	qvp	Pacaraos Quechua
5504	qvs	San MartÃ­n Quechua
5505	qvw	Huaylla Wanca Quechua
5506	qvy	Queyu
5507	qvz	Northern Pastaza Quichua
5508	qwa	Corongo Ancash Quechua
5509	qwc	Classical Quechua
5510	qwh	Huaylas Ancash Quechua
5511	qwm	Kuman (Russia)
5512	qws	Sihuas Ancash Quechua
5513	qwt	Kwalhioqua-Tlatskanai
5514	qxa	ChiquiÃ¡n Ancash Quechua
5515	qxc	Chincha Quechua
5516	qxh	Panao HuÃ¡nuco Quechua
5517	qxl	Salasaca Highland Quichua
5518	qxn	Northern Conchucos Ancash Quechua
5519	qxo	Southern Conchucos Ancash Quechua
5520	qxp	Puno Quechua
5521	qxq	Qashqa'i
5522	qxr	CaÃ±ar Highland Quichua
5523	qxs	Southern Qiang
5524	qxt	Santa Ana de Tusi Pasco Quechua
5525	qxu	Arequipa-La UniÃ³n Quechua
5526	qxw	Jauja Wanca Quechua
5527	qya	Quenya
5528	qyp	Quiripi
5529	raa	Dungmali
5530	rab	Camling
5531	rac	Rasawa
5532	rad	Rade
5533	raf	Western Meohang
5534	rag	Logooli
5535	rah	Rabha
5536	rai	Ramoaaina
5537	raj	Rajasthani
5538	rak	Tulu-Bohuai
5539	ral	Ralte
5540	ram	Canela
5541	ran	Riantana
5542	rao	Rao
5543	rap	Rapanui
5544	raq	Saam
5545	rar	Rarotongan
5546	ras	Tegali
5547	rat	Razajerdi
5548	rau	Raute
5549	rav	Sampang
5550	raw	Rawang
5551	rax	Rang
5552	ray	Rapa
5553	raz	Rahambuu
5554	rbb	Rumai Palaung
5555	rbk	Northern Bontok
5556	rbl	Miraya Bikol
5557	rbp	Barababaraba
5558	rcf	RÃ©union Creole French
5559	rdb	Rudbari
5560	rea	Rerau
5561	reb	Rembong
5562	ree	Rejang Kayan
5563	reg	Kara (Tanzania)
5564	rei	Reli
5565	rej	Rejang
5566	rel	Rendille
5567	rem	Remo
5568	ren	Rengao
5569	rer	Rer Bare
5570	res	Reshe
5571	ret	Retta
5572	rey	Reyesano
5573	rga	Roria
5574	rge	Romano-Greek
5575	rgk	Rangkas
5576	rgn	Romagnol
5577	rgr	ResÃ­garo
5578	rgs	Southern Roglai
5579	rgu	Ringgou
5580	rhg	Rohingya
5581	rhp	Yahang
5582	ria	Riang (India)
5583	rib	Bribri Sign Language
5584	rif	Tarifit
5585	ril	Riang Lang
5586	rim	Nyaturu
5587	rin	Nungu
5588	rir	Ribun
5589	rit	Ritharrngu
5590	riu	Riung
5591	rjg	Rajong
5592	rji	Raji
5593	rjs	Rajbanshi
5594	rka	Kraol
5595	rkb	Rikbaktsa
5596	rkh	Rakahanga-Manihiki
5597	rki	Rakhine
5598	rkm	Marka
5599	rkt	Rangpuri
5600	rkw	Arakwal
5601	rma	Rama
5602	rmb	Rembarrnga
5603	rmc	Carpathian Romani
5604	rmd	Traveller Danish
5605	rme	Angloromani
5606	rmf	Kalo Finnish Romani
5607	rmg	Traveller Norwegian
5608	rmh	Murkim
5609	rmi	Lomavren
5610	rmk	Romkun
5611	rml	Baltic Romani
5612	rmm	Roma
5613	rmn	Balkan Romani
5614	rmo	Sinte Romani
5615	rmp	Rempi
5616	rmq	CalÃ³
5617	rms	Romanian Sign Language
5618	rmt	Domari
5619	rmu	Tavringer Romani
5620	rmv	Romanova
5621	rmw	Welsh Romani
5622	rmx	Romam
5623	rmy	Vlax Romani
5624	rmz	Marma
5625	rnb	Brunca Sign Language
5626	rnd	Ruund
5627	rng	Ronga
5628	rnl	Ranglong
5629	rnn	Roon
5630	rnp	Rongpo
5631	rnr	Nari Nari
5632	rnw	Rungwa
5633	rob	Tae'
5634	roc	Cacgia Roglai
5635	rod	Rogo
5636	roe	Ronji
5637	rof	Rombo
5638	rog	Northern Roglai
5639	rm	Romansh
5640	rol	Romblomanon
5641	rom	Romany
5642	ro	Romanian
5643	roo	Rotokas
5644	rop	Kriol
5645	ror	Rongga
5646	rou	Runga
5647	row	Dela-Oenale
5648	rpn	Repanbitip
5649	rpt	Rapting
5650	rri	Ririo
5651	rrm	Moriori
5652	rro	Waima
5653	rrt	Arritinngithigh
5654	rsb	Romano-Serbian
5655	rsk	Ruthenian
5656	rsl	Russian Sign Language
5657	rsm	Miriwoong Sign Language
5658	rsn	Rwandan Sign Language
5659	rsw	Rishiwa
5660	rtc	Rungtu Chin
5661	rth	Ratahan
5662	rtm	Rotuman
5663	rts	Yurats
5664	rtw	Rathawi
5665	rub	Gungu
5666	ruc	Ruuli
5667	rue	Rusyn
5668	ruf	Luguru
5669	rug	Roviana
5670	ruh	Ruga
5671	rui	Rufiji
5672	ruk	Che
5673	rn	Rundi
5674	ruo	Istro Romanian
5675	rup	Macedo-Romanian
5676	ruq	Megleno Romanian
5677	ru	Russian
5678	rut	Rutul
5679	ruu	Lanas Lobu
5680	ruy	Mala (Nigeria)
5681	ruz	Ruma
5682	rwa	Rawo
5683	rwk	Rwa
5684	rwl	Ruwila
5685	rwm	Amba (Uganda)
5686	rwo	Rawa
5687	rwr	Marwari (India)
5688	rxd	Ngardi
5689	rxw	Karuwali
5690	ryn	Northern Amami-Oshima
5691	rys	Yaeyama
5692	ryu	Central Okinawan
5693	rzh	RÄziá¸¥Ä«
5694	saa	Saba
5695	sab	Buglere
5696	sac	Meskwaki
5697	sad	Sandawe
5698	sae	SabanÃª
5699	saf	Safaliba
5700	sg	Sango
5701	sah	Yakut
5702	saj	Sahu
5703	sak	Sake
5704	sam	Samaritan Aramaic
5705	sa	Sanskrit
5706	sao	Sause
5707	saq	Samburu
5708	sar	Saraveca
5709	sas	Sasak
5710	sat	Santali
5711	sau	Saleman
5712	sav	Saafi-Saafi
5713	saw	Sawi
5714	sax	Sa
5715	say	Saya
5716	saz	Saurashtra
5717	sba	Ngambay
5718	sbb	Simbo
5719	sbc	Kele (Papua New Guinea)
5720	sbd	Southern Samo
5721	sbe	Saliba
5722	sbf	Chabu
5723	sbg	Seget
5724	sbh	Sori-Harengan
5725	sbi	Seti
5726	sbj	Surbakhal
5727	sbk	Safwa
5728	sbl	Botolan Sambal
5729	sbm	Sagala
5730	sbn	Sindhi Bhil
5731	sbo	SabÃ¼m
5732	sbp	Sangu (Tanzania)
5733	sbq	Sileibi
5734	sbr	Sembakung Murut
5735	sbs	Subiya
5736	sbt	Kimki
5737	sbu	Stod Bhoti
5738	sbv	Sabine
5739	sbw	Simba
5740	sbx	Seberuang
5741	sby	Soli
5742	sbz	Sara Kaba
5743	scb	Chut
5744	sce	Dongxiang
5745	scf	San Miguel Creole French
5746	scg	Sanggau
5747	sch	Sakachep
5748	sci	Sri Lankan Creole Malay
5749	sck	Sadri
5750	scl	Shina
5751	scn	Sicilian
5752	sco	Scots
5753	scp	Hyolmo
5754	scq	Sa'och
5755	scs	North Slavey
5756	sct	Southern Katang
5757	scu	Shumcho
5758	scv	Sheni
5759	scw	Sha
5760	scx	Sicel
5761	sda	Toraja-Sa'dan
5762	sdb	Shabak
5763	sdc	Sassarese Sardinian
5764	sde	Surubu
5765	sdf	Sarli
5766	sdg	Savi
5767	sdh	Southern Kurdish
5768	sdj	Suundi
5769	sdk	Sos Kundi
5770	sdl	Saudi Arabian Sign Language
5771	sdn	Gallurese Sardinian
5772	sdo	Bukar-Sadung Bidayuh
5773	sdp	Sherdukpen
5774	sdq	Semandang
5775	sdr	Oraon Sadri
5776	sds	Sened
5777	sdt	Shuadit
5778	sdu	Sarudu
5779	sdx	Sibu Melanau
5780	sdz	Sallands
5781	sea	Semai
5782	seb	Shempire Senoufo
5783	sec	Sechelt
5784	sed	Sedang
5785	see	Seneca
5786	sef	Cebaara Senoufo
5787	seg	Segeju
5788	seh	Sena
5789	sei	Seri
5790	sej	Sene
5791	sek	Sekani
5792	sel	Selkup
5793	sen	NanerigÃ© SÃ©noufo
5794	seo	Suarmin
5795	sep	SÃ¬cÃ¬tÃ© SÃ©noufo
5796	seq	Senara SÃ©noufo
5797	ser	Serrano
5798	ses	Koyraboro Senni Songhai
5799	set	Sentani
5800	seu	Serui-Laut
5801	sev	Nyarafolo Senoufo
5802	sew	Sewa Bay
5803	sey	Secoya
5804	sez	Senthang Chin
5805	sfb	Langue des signes de Belgique Francophone
5806	sfe	Eastern Subanen
5807	sfm	Small Flowery Miao
5808	sfs	South African Sign Language
5809	sfw	Sehwi
5810	sga	Old Irish (to 900)
5811	sgb	Mag-antsi Ayta
5812	sgc	Kipsigis
5813	sgd	Surigaonon
5814	sge	Segai
5815	sgg	Swiss-German Sign Language
5816	sgh	Shughni
5817	sgi	Suga
5818	sgj	Surgujia
5819	sgk	Sangkong
5820	sgm	Singa
5821	sgp	Singpho
5822	sgr	Sangisari
5823	sgs	Samogitian
5824	sgt	Brokpake
5825	sgu	Salas
5826	sgw	Sebat Bet Gurage
5827	sgx	Sierra Leone Sign Language
5828	sgy	Sanglechi
5829	sgz	Sursurunga
5830	sha	Shall-Zwall
5831	shb	Ninam
5832	shc	Sonde
5833	shd	Kundal Shahi
5834	she	Sheko
5835	shg	Shua
5836	shh	Shoshoni
5837	shi	Tachelhit
5838	shj	Shatt
5839	shk	Shilluk
5840	shl	Shendu
5841	shm	Shahrudi
5842	shn	Shan
5843	sho	Shanga
5844	shp	Shipibo-Conibo
5845	shq	Sala
5846	shr	Shi
5847	shs	Shuswap
5848	sht	Shasta
5849	shu	Chadian Arabic
5850	shv	Shehri
5851	shw	Shwai
5852	shx	She
5853	shy	Tachawit
5854	shz	Syenara Senoufo
5855	sia	Akkala Sami
5856	sib	Sebop
5857	sid	Sidamo
5858	sie	Simaa
5859	sif	Siamou
5860	sig	Paasaal
5861	sih	Zire
5862	sii	Shom Peng
5863	sij	Numbami
5864	sik	Sikiana
5865	sil	Tumulung Sisaala
5866	sim	Mende (Papua New Guinea)
5867	si	Sinhala
5868	sip	Sikkimese
5869	siq	Sonia
5870	sir	Siri
5871	sis	Siuslaw
5872	siu	Sinagen
5873	siv	Sumariup
5874	siw	Siwai
5875	six	Sumau
5876	siy	Sivandi
5877	siz	Siwi
5878	sja	Epena
5879	sjb	Sajau Basap
5880	sjd	Kildin Sami
5881	sje	Pite Sami
5882	sjg	Assangori
5883	sjk	Kemi Sami
5884	sjl	Sajalong
5885	sjm	Mapun
5886	sjn	Sindarin
5887	sjo	Xibe
5888	sjp	Surjapuri
5889	sjr	Siar-Lak
5890	sjs	Senhaja De Srair
5891	sjt	Ter Sami
5892	sju	Ume Sami
5893	sjw	Shawnee
5894	ska	Skagit
5895	skb	Saek
5896	skc	Ma Manda
5897	skd	Southern Sierra Miwok
5898	ske	Seke (Vanuatu)
5899	skf	SakirabiÃ¡
5900	skg	Sakalava Malagasy
5901	skh	Sikule
5902	ski	Sika
5903	skj	Seke (Nepal)
5904	skm	Kutong
5905	skn	Kolibugan Subanon
5906	sko	Seko Tengah
5907	skp	Sekapan
5908	skq	Sininkere
5909	skr	Saraiki
5910	sks	Maia
5911	skt	Sakata
5912	sku	Sakao
5913	skv	Skou
5914	skw	Skepi Creole Dutch
5915	skx	Seko Padang
5916	sky	Sikaiana
5917	skz	Sekar
5918	slc	SÃ¡liba
5919	sld	Sissala
5920	sle	Sholaga
5921	slf	Swiss-Italian Sign Language
5922	slg	Selungai Murut
5923	slh	Southern Puget Sound Salish
5924	sli	Lower Silesian
5925	slj	SalumÃ¡
5926	sk	Slovak
5927	sll	Salt-Yui
5928	slm	Pangutaran Sama
5929	sln	Salinan
5930	slp	Lamaholot
5931	slr	Salar
5932	sls	Singapore Sign Language
5933	slt	Sila
5934	slu	Selaru
5935	sl	Slovenian
5936	slw	Sialum
5937	slx	Salampasu
5938	sly	Selayar
5939	slz	Ma'ya
5940	sma	Southern Sami
5941	smb	Simbari
5942	smc	Som
5943	se	Northern Sami
5944	smf	Auwe
5945	smg	Simbali
5946	smh	Samei
5947	smj	Lule Sami
5948	smk	Bolinao
5949	sml	Central Sama
5950	smm	Musasa
5951	smn	Inari Sami
5952	sm	Samoan
5953	smp	Samaritan
5954	smq	Samo
5955	smr	Simeulue
5956	sms	Skolt Sami
5957	smt	Simte
5958	smu	Somray
5959	smv	Samvedi
5960	smw	Sumbawa
5961	smx	Samba
5962	smy	Semnani
5963	smz	Simeku
5964	sn	Shona
5965	snc	Sinaugoro
5966	sd	Sindhi
5967	sne	Bau Bidayuh
5968	snf	Noon
5969	sng	Sanga (Democratic Republic of Congo)
5970	sni	Sensi
5971	snj	Riverain Sango
5972	snk	Soninke
5973	snl	Sangil
5974	snm	Southern Ma'di
5975	snn	Siona
5976	sno	Snohomish
5977	snp	Siane
5978	snq	Sangu (Gabon)
5979	snr	Sihan
5980	sns	South West Bay
5981	snu	Senggi
5982	snv	Sa'ban
5983	snw	Selee
5984	snx	Sam
5985	sny	Saniyo-Hiyewe
5986	snz	Kou
5987	soa	Thai Song
5988	sob	Sobei
5989	soc	So (Democratic Republic of Congo)
5990	sod	Songoora
5991	soe	Songomeno
5992	sog	Sogdian
5993	soh	Aka
5994	soi	Sonha
5995	soj	Soi
5996	sok	Sokoro
5997	sol	Solos
5998	so	Somali
5999	soo	Songo
6000	sop	Songe
6001	soq	Kanasi
6002	sor	Somrai
6003	sos	Seeku
6004	st	Southern Sotho
6005	sou	Southern Thai
6006	sov	Sonsorol
6007	sow	Sowanda
6008	sox	Swo
6009	soy	Miyobe
6010	soz	Temi
6011	es	Spanish
6012	spb	Sepa (Indonesia)
6013	spc	SapÃ©
6014	spd	Saep
6015	spe	Sepa (Papua New Guinea)
6016	spg	Sian
6017	spi	Saponi
6018	spk	Sengo
6019	spl	Selepet
6020	spm	Akukem
6021	spn	SanapanÃ¡
6022	spo	Spokane
6023	spp	Supyire Senoufo
6024	spq	Loreto-Ucayali Spanish
6025	spr	Saparua
6026	sps	Saposa
6027	spt	Spiti Bhoti
6028	spu	Sapuan
6029	spv	Sambalpuri
6030	spx	South Picene
6031	spy	Sabaot
6032	sqa	Shama-Sambuga
6033	sqh	Shau
6034	sq	Albanian
6035	sqk	Albanian Sign Language
6036	sqm	Suma
6037	sqn	Susquehannock
6038	sqo	Sorkhei
6039	sqq	Sou
6040	sqr	Siculo Arabic
6041	sqs	Sri Lankan Sign Language
6042	sqt	Soqotri
6043	squ	Squamish
6044	sqx	Kufr Qassem Sign Language (KQSL)
6045	sra	Saruga
6046	srb	Sora
6047	src	Logudorese Sardinian
6048	sc	Sardinian
6049	sre	Sara
6050	srf	Nafi
6051	srg	Sulod
6052	srh	Sarikoli
6053	sri	Siriano
6054	srk	Serudung Murut
6055	srl	Isirawa
6056	srm	Saramaccan
6057	srn	Sranan Tongo
6058	sro	Campidanese Sardinian
6059	sr	Serbian
6060	srq	SirionÃ³
6061	srr	Serer
6062	srs	Sarsi
6063	srt	Sauri
6064	sru	SuruÃ­
6065	srv	Southern Sorsoganon
6066	srw	Serua
6067	srx	Sirmauri
6068	sry	Sera
6069	srz	Shahmirzadi
6070	ssb	Southern Sama
6071	ssc	Suba-Simbiti
6072	ssd	Siroi
6073	sse	Balangingi
6074	ssf	Thao
6075	ssg	Seimat
6076	ssh	Shihhi Arabic
6077	ssi	Sansi
6078	ssj	Sausi
6079	ssk	Sunam
6080	ssl	Western Sisaala
6081	ssm	Semnam
6082	ssn	Waata
6083	sso	Sissano
6084	ssp	Spanish Sign Language
6085	ssq	So'a
6086	ssr	Swiss-French Sign Language
6087	sss	SÃ´
6088	sst	Sinasina
6089	ssu	Susuami
6090	ssv	Shark Bay
6091	ss	Swati
6092	ssx	Samberigi
6093	ssy	Saho
6094	ssz	Sengseng
6095	sta	Settla
6096	stb	Northern Subanen
6097	std	Sentinel
6098	ste	Liana-Seti
6099	stf	Seta
6100	stg	Trieng
6101	sth	Shelta
6102	sti	Bulo Stieng
6103	stj	Matya Samo
6104	stk	Arammba
6105	stl	Stellingwerfs
6106	stm	Setaman
6107	stn	Owa
6108	sto	Stoney
6109	stp	Southeastern Tepehuan
6110	stq	Saterfriesisch
6111	str	Straits Salish
6112	sts	Shumashti
6113	stt	Budeh Stieng
6114	stu	Samtao
6115	stv	Silt'e
6116	stw	Satawalese
6117	sty	Siberian Tatar
6118	sua	Sulka
6119	sub	Suku
6120	suc	Western Subanon
6121	sue	Suena
6122	sug	Suganga
6123	sui	Suki
6124	suj	Shubi
6125	suk	Sukuma
6126	su	Sundanese
6127	suo	Bouni
6128	suq	Tirmaga-Chai Suri
6129	sur	Mwaghavul
6130	sus	Susu
6131	sut	Subtiaba
6132	suv	Puroik
6133	suw	Sumbwa
6134	sux	Sumerian
6135	suy	SuyÃ¡
6136	suz	Sunwar
6137	sva	Svan
6138	svb	Ulau-Suain
6139	svc	Vincentian Creole English
6140	sve	Serili
6141	svk	Slovakian Sign Language
6142	svm	Slavomolisano
6143	svs	Savosavo
6144	svx	Skalvian
6145	sw	Swahili (macrolanguage)
6146	swb	Maore Comorian
6147	swc	Congo Swahili
6148	sv	Swedish
6149	swf	Sere
6150	swg	Swabian
6151	swh	Swahili (individual language)
6152	swi	Sui
6153	swj	Sira
6154	swk	Malawi Sena
6155	swl	Swedish Sign Language
6156	swm	Samosa
6157	swn	Sawknah
6158	swo	Shanenawa
6159	swp	Suau
6160	swq	Sharwa
6161	swr	Saweru
6162	sws	Seluwasan
6163	swt	Sawila
6164	swu	Suwawa
6165	swv	Shekhawati
6166	sww	Sowa
6167	swx	SuruahÃ¡
6168	swy	Sarua
6169	sxb	Suba
6170	sxc	Sicanian
6171	sxe	Sighu
6172	sxg	Shuhi
6173	sxk	Southern Kalapuya
6174	sxl	Selian
6175	sxm	Samre
6176	sxn	Sangir
6177	sxo	Sorothaptic
6178	sxr	Saaroa
6179	sxs	Sasaru
6180	sxu	Upper Saxon
6181	sxw	Saxwe Gbe
6182	sya	Siang
6183	syb	Central Subanen
6184	syc	Classical Syriac
6185	syi	Seki
6186	syk	Sukur
6187	syl	Sylheti
6188	sym	Maya Samo
6189	syn	Senaya
6190	syo	Suoy
6191	syr	Syriac
6192	sys	Sinyar
6193	syw	Kagate
6194	syx	Samay
6195	syy	Al-Sayyid Bedouin Sign Language
6196	sza	Semelai
6197	szb	Ngalum
6198	szc	Semaq Beri
6199	sze	Seze
6200	szg	Sengele
6201	szl	Silesian
6202	szn	Sula
6203	szp	Suabo
6204	szs	Solomon Islands Sign Language
6205	szv	Isu (Fako Division)
6206	szw	Sawai
6207	szy	Sakizaya
6208	taa	Lower Tanana
6209	tab	Tabassaran
6210	tac	Lowland Tarahumara
6211	tad	Tause
6212	tae	Tariana
6213	taf	TapirapÃ©
6214	tag	Tagoi
6215	ty	Tahitian
6216	taj	Eastern Tamang
6217	tak	Tala
6218	tal	Tal
6219	ta	Tamil
6220	tan	Tangale
6221	tao	Yami
6222	tap	Taabwa
6223	taq	Tamasheq
6224	tar	Central Tarahumara
6225	tas	Tay Boi
6226	tt	Tatar
6227	tau	Upper Tanana
6228	tav	Tatuyo
6229	taw	Tai
6230	tax	Tamki
6231	tay	Atayal
6232	taz	Tocho
6233	tba	AikanÃ£
6234	tbc	Takia
6235	tbd	Kaki Ae
6236	tbe	Tanimbili
6237	tbf	Mandara
6238	tbg	North Tairora
6239	tbh	Dharawal
6240	tbi	Gaam
6241	tbj	Tiang
6242	tbk	Calamian Tagbanwa
6243	tbl	Tboli
6244	tbm	Tagbu
6245	tbn	Barro Negro Tunebo
6246	tbo	Tawala
6247	tbp	Taworta
6248	tbr	Tumtum
6249	tbs	Tanguat
6250	tbt	Tembo (Kitembo)
6251	tbu	Tubar
6252	tbv	Tobo
6253	tbw	Tagbanwa
6254	tbx	Kapin
6255	tby	Tabaru
6256	tbz	Ditammari
6257	tca	Ticuna
6258	tcb	Tanacross
6259	tcc	Datooga
6260	tcd	Tafi
6261	tce	Southern Tutchone
6262	tcf	Malinaltepec Me'phaa
6263	tcg	Tamagario
6264	tch	Turks And Caicos Creole English
6265	tci	WÃ¡ra
6266	tck	Tchitchege
6267	tcl	Taman (Myanmar)
6268	tcm	Tanahmerah
6269	tcn	Tichurong
6270	tco	Taungyo
6271	tcp	Tawr Chin
6272	tcq	Kaiy
6273	tcs	Torres Strait Creole
6274	tct	T'en
6275	tcu	Southeastern Tarahumara
6276	tcw	TecpatlÃ¡n Totonac
6277	tcx	Toda
6278	tcy	Tulu
6279	tcz	Thado Chin
6280	tda	Tagdal
6281	tdb	Panchpargania
6282	tdc	EmberÃ¡-TadÃ³
6283	tdd	Tai NÃ¼a
6284	tde	Tiranige Diga Dogon
6285	tdf	Talieng
6286	tdg	Western Tamang
6287	tdh	Thulung
6288	tdi	Tomadino
6289	tdj	Tajio
6290	tdk	Tambas
6291	tdl	Sur
6292	tdm	Taruma
6293	tdn	Tondano
6294	tdo	Teme
6295	tdq	Tita
6296	tdr	Todrah
6297	tds	Doutai
6298	tdt	Tetun Dili
6299	tdv	Toro
6300	tdx	Tandroy-Mahafaly Malagasy
6301	tdy	Tadyawan
6302	tea	Temiar
6303	teb	Tetete
6304	tec	Terik
6305	ted	Tepo Krumen
6306	tee	Huehuetla Tepehua
6307	tef	Teressa
6308	teg	Teke-Tege
6309	teh	Tehuelche
6310	tei	Torricelli
6311	tek	Ibali Teke
6312	te	Telugu
6313	tem	Timne
6314	ten	Tama (Colombia)
6315	teo	Teso
6316	tep	Tepecano
6317	teq	Temein
6318	ter	Tereno
6319	tes	Tengger
6320	tet	Tetum
6321	teu	Soo
6322	tev	Teor
6323	tew	Tewa (USA)
6324	tex	Tennet
6325	tey	Tulishi
6326	tez	Tetserret
6327	tfi	Tofin Gbe
6328	tfn	Tanaina
6329	tfo	Tefaro
6330	tfr	Teribe
6331	tft	Ternate
6332	tga	Sagalla
6333	tgb	Tobilung
6334	tgc	Tigak
6335	tgd	Ciwogai
6336	tge	Eastern Gorkha Tamang
6337	tgf	Chalikha
6338	tgh	Tobagonian Creole English
6339	tgi	Lawunuia
6340	tgj	Tagin
6341	tg	Tajik
6342	tl	Tagalog
6343	tgn	Tandaganon
6344	tgo	Sudest
6345	tgp	Tangoa
6346	tgq	Tring
6347	tgr	Tareng
6348	tgs	Nume
6349	tgt	Central Tagbanwa
6350	tgu	Tanggu
6351	tgv	Tingui-Boto
6352	tgw	Tagwana Senoufo
6353	tgx	Tagish
6354	tgy	Togoyo
6355	tgz	Tagalaka
6356	th	Thai
6357	thd	Kuuk Thaayorre
6358	the	Chitwania Tharu
6359	thf	Thangmi
6360	thh	Northern Tarahumara
6361	thi	Tai Long
6362	thk	Tharaka
6363	thl	Dangaura Tharu
6364	thm	Aheu
6365	thn	Thachanadan
6366	thp	Thompson
6367	thq	Kochila Tharu
6368	thr	Rana Tharu
6369	ths	Thakali
6370	tht	Tahltan
6371	thu	Thuri
6372	thv	Tahaggart Tamahaq
6373	thy	Tha
6374	thz	Tayart Tamajeq
6375	tia	Tidikelt Tamazight
6376	tic	Tira
6377	tif	Tifal
6378	tig	Tigre
6379	tih	Timugon Murut
6380	tii	Tiene
6381	tij	Tilung
6382	tik	Tikar
6383	til	Tillamook
6384	tim	Timbe
6385	tin	Tindi
6386	tio	Teop
6387	tip	Trimuris
6388	tiq	TiÃ©fo
6389	ti	Tigrinya
6390	tis	Masadiit Itneg
6391	tit	Tinigua
6392	tiu	Adasen
6393	tiv	Tiv
6394	tiw	Tiwi
6395	tix	Southern Tiwa
6396	tiy	Tiruray
6397	tiz	Tai Hongjin
6398	tja	Tajuasohn
6399	tjg	Tunjung
6400	tji	Northern Tujia
6401	tjj	Tjungundji
6402	tjl	Tai Laing
6403	tjm	Timucua
6404	tjn	Tonjon
6405	tjo	Temacine Tamazight
6406	tjp	Tjupany
6407	tjs	Southern Tujia
6408	tju	Tjurruru
6409	tjw	Djabwurrung
6410	tka	TrukÃ¡
6411	tkb	Buksa
6412	tkd	Tukudede
6413	tke	Takwane
6414	tkf	TukumanfÃ©d
6415	tkg	Tesaka Malagasy
6416	tkl	Tokelau
6417	tkm	Takelma
6418	tkn	Toku-No-Shima
6419	tkp	Tikopia
6420	tkq	Tee
6421	tkr	Tsakhur
6422	tks	Takestani
6423	tkt	Kathoriya Tharu
6424	tku	Upper Necaxa Totonac
6425	tkv	Mur Pano
6426	tkw	Teanu
6427	tkx	Tangko
6428	tkz	Takua
6429	tla	Southwestern Tepehuan
6430	tlb	Tobelo
6431	tlc	Yecuatla Totonac
6432	tld	Talaud
6433	tlf	Telefol
6434	tlg	Tofanma
6435	tlh	Klingon
6436	tli	Tlingit
6437	tlj	Talinga-Bwisi
6438	tlk	Taloki
6439	tll	Tetela
6440	tlm	Tolomako
6441	tln	Talondo'
6442	tlo	Talodi
6443	tlp	Filomena Mata-CoahuitlÃ¡n Totonac
6444	tlq	Tai Loi
6445	tlr	Talise
6446	tls	Tambotalo
6447	tlt	Sou Nama
6448	tlu	Tulehu
6449	tlv	Taliabu
6450	tlx	Khehek
6451	tly	Talysh
6452	tma	Tama (Chad)
6453	tmb	Katbol
6454	tmc	Tumak
6455	tmd	Haruai
6456	tme	TremembÃ©
6457	tmf	Toba-Maskoy
6458	tmg	TernateÃ±o
6459	tmh	Tamashek
6460	tmi	Tutuba
6461	tmj	Samarokena
6462	tml	Tamnim Citak
6463	tmm	Tai Thanh
6464	tmn	Taman (Indonesia)
6465	tmo	Temoq
6466	tmq	Tumleo
6467	tmr	Jewish Babylonian Aramaic (ca. 200-1200 CE)
6468	tms	Tima
6469	tmt	Tasmate
6470	tmu	Iau
6471	tmv	Tembo (Motembo)
6472	tmw	Temuan
6473	tmy	Tami
6474	tmz	Tamanaku
6475	tna	Tacana
6476	tnb	Western Tunebo
6477	tnc	Tanimuca-RetuarÃ£
6478	tnd	Angosturas Tunebo
6479	tng	Tobanga
6480	tnh	Maiani
6481	tni	Tandia
6482	tnk	Kwamera
6483	tnl	Lenakel
6484	tnm	Tabla
6485	tnn	North Tanna
6486	tno	Toromono
6487	tnp	Whitesands
6488	tnq	Taino
6489	tnr	MÃ©nik
6490	tns	Tenis
6491	tnt	Tontemboan
6492	tnu	Tay Khang
6493	tnv	Tangchangya
6494	tnw	Tonsawang
6495	tnx	Tanema
6496	tny	Tongwe
6497	tnz	Ten'edn
6498	tob	Toba
6499	toc	Coyutla Totonac
6500	tod	Toma
6501	tof	Gizrra
6502	tog	Tonga (Nyasa)
6503	toh	Gitonga
6504	toi	Tonga (Zambia)
6505	toj	Tojolabal
6506	tok	Toki Pona
6507	tol	Tolowa
6508	tom	Tombulu
6509	to	Tonga (Tonga Islands)
6510	too	Xicotepec De JuÃ¡rez Totonac
6511	top	Papantla Totonac
6512	toq	Toposa
6513	tor	Togbo-Vara Banda
6514	tos	Highland Totonac
6515	tou	Tho
6516	tov	Upper Taromi
6517	tow	Jemez
6518	tox	Tobian
6519	toy	Topoiyo
6520	toz	To
6521	tpa	Taupota
6522	tpc	AzoyÃº Me'phaa
6523	tpe	Tippera
6524	tpf	Tarpia
6525	tpg	Kula
6526	tpi	Tok Pisin
6527	tpj	TapietÃ©
6528	tpk	Tupinikin
6529	tpl	Tlacoapa Me'phaa
6530	tpm	Tampulma
6531	tpn	TupinambÃ¡
6532	tpo	Tai Pao
6533	tpp	Pisaflores Tepehua
6534	tpq	Tukpa
6535	tpr	TuparÃ­
6536	tpt	Tlachichilco Tepehua
6537	tpu	Tampuan
6538	tpv	Tanapag
6539	tpx	Acatepec Me'phaa
6540	tpy	Trumai
6541	tpz	Tinputz
6542	tqb	TembÃ©
6543	tql	Lehali
6544	tqm	Turumsa
6545	tqn	Tenino
6546	tqo	Toaripi
6547	tqp	Tomoip
6548	tqq	Tunni
6549	tqr	Torona
6550	tqt	Western Totonac
6551	tqu	Touo
6552	tqw	Tonkawa
6553	tra	Tirahi
6554	trb	Terebu
6555	trc	Copala Triqui
6556	trd	Turi
6557	tre	East Tarangan
6558	trf	Trinidadian Creole English
6559	trg	LishÃ¡n DidÃ¡n
6560	trh	Turaka
6561	tri	TriÃ³
6562	trj	Toram
6563	trl	Traveller Scottish
6564	trm	Tregami
6565	trn	Trinitario
6566	tro	Tarao Naga
6567	trp	Kok Borok
6568	trq	San MartÃ­n Itunyoso Triqui
6569	trr	Taushiro
6570	trs	Chicahuaxtla Triqui
6571	trt	Tunggare
6572	tru	Turoyo
6573	trv	Sediq
6574	trw	Torwali
6575	trx	Tringgus-Sembaan Bidayuh
6576	try	Turung
6577	trz	TorÃ¡
6578	tsa	Tsaangi
6579	tsb	Tsamai
6580	tsc	Tswa
6581	tsd	Tsakonian
6582	tse	Tunisian Sign Language
6583	tsg	Tausug
6584	tsh	Tsuvan
6585	tsi	Tsimshian
6586	tsj	Tshangla
6587	tsk	Tseku
6588	tsl	Ts'Ã¼n-Lao
6589	tsm	Turkish Sign Language
6590	tn	Tswana
6591	ts	Tsonga
6592	tsp	Northern Toussian
6593	tsq	Thai Sign Language
6594	tsr	Akei
6595	tss	Taiwan Sign Language
6596	tst	Tondi Songway Kiini
6597	tsu	Tsou
6598	tsv	Tsogo
6599	tsw	Tsishingini
6600	tsx	Mubami
6601	tsy	Tebul Sign Language
6602	tsz	Purepecha
6603	tta	Tutelo
6604	ttb	Gaa
6605	ttc	Tektiteko
6606	ttd	Tauade
6607	tte	Bwanabwana
6608	ttf	Tuotomb
6609	ttg	Tutong
6610	tth	Upper Ta'oih
6611	tti	Tobati
6612	ttj	Tooro
6613	ttk	Totoro
6614	ttl	Totela
6615	ttm	Northern Tutchone
6616	ttn	Towei
6617	tto	Lower Ta'oih
6618	ttp	Tombelala
6619	ttq	Tawallammat Tamajaq
6620	ttr	Tera
6621	tts	Northeastern Thai
6622	ttt	Muslim Tat
6623	ttu	Torau
6624	ttv	Titan
6625	ttw	Long Wat
6626	tty	Sikaritai
6627	ttz	Tsum
6628	tua	Wiarumus
6629	tub	TÃ¼batulabal
6630	tuc	Mutu
6631	tud	TuxÃ¡
6632	tue	Tuyuca
6633	tuf	Central Tunebo
6634	tug	Tunia
6635	tuh	Taulil
6636	tui	Tupuri
6637	tuj	Tugutil
6638	tk	Turkmen
6639	tul	Tula
6640	tum	Tumbuka
6641	tun	Tunica
6642	tuo	Tucano
6643	tuq	Tedaga
6644	tr	Turkish
6645	tus	Tuscarora
6646	tuu	Tututni
6647	tuv	Turkana
6648	tux	TuxinÃ¡wa
6649	tuy	Tugen
6650	tuz	Turka
6651	tva	Vaghua
6652	tvd	Tsuvadi
6653	tve	Te'un
6654	tvi	Tulai
6655	tvk	Southeast Ambrym
6656	tvl	Tuvalu
6657	tvm	Tela-Masbuar
6658	tvn	Tavoyan
6659	tvo	Tidore
6660	tvs	Taveta
6661	tvt	Tutsa Naga
6662	tvu	Tunen
6663	tvw	Sedoa
6664	tvx	Taivoan
6665	tvy	Timor Pidgin
6666	twa	Twana
6667	twb	Western Tawbuid
6668	twc	Teshenawa
6669	twd	Twents
6670	twe	Tewa (Indonesia)
6671	twf	Northern Tiwa
6672	twg	Tereweng
6673	twh	Tai DÃ³n
6674	tw	Twi
6675	twl	Tawara
6676	twm	Tawang Monpa
6677	twn	Twendi
6678	two	Tswapong
6679	twp	Ere
6680	twq	Tasawaq
6681	twr	Southwestern Tarahumara
6682	twt	TuriwÃ¡ra
6683	twu	Termanu
6684	tww	Tuwari
6685	twx	Tewe
6686	twy	Tawoyan
6687	txa	Tombonuo
6688	txb	Tokharian B
6689	txc	Tsetsaut
6690	txe	Totoli
6691	txg	Tangut
6692	txh	Thracian
6693	txi	Ikpeng
6694	txj	Tarjumo
6695	txm	Tomini
6696	txn	West Tarangan
6697	txo	Toto
6698	txq	Tii
6699	txr	Tartessian
6700	txs	Tonsea
6701	txt	Citak
6702	txu	KayapÃ³
6703	txx	Tatana
6704	txy	Tanosy Malagasy
6705	tya	Tauya
6706	tye	Kyanga
6707	tyh	O'du
6708	tyi	Teke-Tsaayi
6709	tyj	Tai Do
6710	tyl	Thu Lao
6711	tyn	Kombai
6712	typ	Thaypan
6713	tyr	Tai Daeng
6714	tys	TÃ y Sa Pa
6715	tyt	TÃ y Tac
6716	tyu	Kua
6717	tyv	Tuvinian
6718	tyx	Teke-Tyee
6719	tyy	Tiyaa
6720	tyz	TÃ y
6721	tza	Tanzanian Sign Language
6722	tzh	Tzeltal
6723	tzj	Tz'utujil
6724	tzl	Talossan
6725	tzm	Central Atlas Tamazight
6726	tzn	Tugun
6727	tzo	Tzotzil
6728	tzx	Tabriak
6729	uam	UamuÃ©
6730	uan	Kuan
6731	uar	Tairuma
6732	uba	Ubang
6733	ubi	Ubi
6734	ubl	Buhi'non Bikol
6735	ubr	Ubir
6736	ubu	Umbu-Ungu
6737	uby	Ubykh
6738	uda	Uda
6739	ude	Udihe
6740	udg	Muduga
6741	udi	Udi
6742	udj	Ujir
6743	udl	Wuzlam
6744	udm	Udmurt
6745	udu	Uduk
6746	ues	Kioko
6747	ufi	Ufim
6748	uga	Ugaritic
6749	ugb	Kuku-Ugbanh
6750	uge	Ughele
6751	ugh	Kubachi
6752	ugn	Ugandan Sign Language
6753	ugo	Ugong
6754	ugy	Uruguayan Sign Language
6755	uha	Uhami
6756	uhn	Damal
6757	ug	Uighur
6758	uis	Uisai
6759	uiv	Iyive
6760	uji	Tanjijili
6761	uka	Kaburi
6762	ukg	Ukuriguma
6763	ukh	Ukhwejo
6764	uki	Kui (India)
6765	ukk	Muak Sa-aak
6766	ukl	Ukrainian Sign Language
6767	ukp	Ukpe-Bayobiri
6768	ukq	Ukwa
6769	uk	Ukrainian
6770	uks	UrubÃº-Kaapor Sign Language
6771	uku	Ukue
6772	ukv	Kuku
6773	ukw	Ukwuani-Aboh-Ndoni
6774	uky	Kuuk-Yak
6775	ula	Fungwa
6776	ulb	Ulukwumi
6777	ulc	Ulch
6778	ule	Lule
6779	ulf	Usku
6780	uli	Ulithian
6781	ulk	Meriam Mir
6782	ull	Ullatan
6783	ulm	Ulumanda'
6784	uln	Unserdeutsch
6785	ulu	Uma' Lung
6786	ulw	Ulwa
6787	uly	Buli
6788	uma	Umatilla
6789	umb	Umbundu
6790	umc	Marrucinian
6791	umd	Umbindhamu
6792	umg	Morrobalama
6793	umi	Ukit
6794	umm	Umon
6795	umn	Makyan Naga
6796	umo	UmotÃ­na
6797	ump	Umpila
6798	umr	Umbugarla
6799	ums	Pendau
6800	umu	Munsee
6801	una	North Watut
6802	und	Undetermined
6803	une	Uneme
6804	ung	Ngarinyin
6805	uni	Uni
6806	unk	EnawenÃ©-NawÃ©
6807	unm	Unami
6808	unn	Kurnai
6809	unr	Mundari
6810	unu	Unubahe
6811	unx	Munda
6812	unz	Unde Kaili
6813	uon	Kulon
6814	upi	Umeda
6815	upv	Uripiv-Wala-Rano-Atchin
6816	ura	Urarina
6817	urb	UrubÃº-Kaapor
6818	urc	Urningangg
6819	ur	Urdu
6820	ure	Uru
6821	urf	Uradhi
6822	urg	Urigina
6823	urh	Urhobo
6824	uri	Urim
6825	urk	Urak Lawoi'
6826	url	Urali
6827	urm	Urapmin
6828	urn	Uruangnirin
6829	uro	Ura (Papua New Guinea)
6830	urp	Uru-Pa-In
6831	urr	Lehalurup
6832	urt	Urat
6833	uru	Urumi
6834	urv	Uruava
6835	urw	Sop
6836	urx	Urimo
6837	ury	Orya
6838	urz	Uru-Eu-Wau-Wau
6839	usa	Usarufa
6840	ush	Ushojo
6841	usi	Usui
6842	usk	Usaghade
6843	usp	Uspanteco
6844	uss	us-Saare
6845	usu	Uya
6846	uta	Otank
6847	ute	Ute-Southern Paiute
6848	uth	ut-Hun
6849	utp	Amba (Solomon Islands)
6850	utr	Etulo
6851	utu	Utu
6852	uum	Urum
6853	uur	Ura (Vanuatu)
6854	uuu	U
6855	uve	West Uvean
6856	uvh	Uri
6857	uvl	Lote
6858	uwa	Kuku-Uwanh
6859	uya	Doko-Uyanga
6860	uz	Uzbek
6861	uzn	Northern Uzbek
6862	uzs	Southern Uzbek
6863	vaa	Vaagri Booli
6864	vae	Vale
6865	vaf	Vafsi
6866	vag	Vagla
6867	vah	Varhadi-Nagpuri
6868	vai	Vai
6869	vaj	Sekele
6870	val	Vehes
6871	vam	Vanimo
6872	van	Valman
6873	vao	Vao
6874	vap	Vaiphei
6875	var	Huarijio
6876	vas	Vasavi
6877	vau	Vanuma
6878	vav	Varli
6879	vay	Wayu
6880	vbb	Southeast Babar
6881	vbk	Southwestern Bontok
6882	vec	Venetian
6883	ved	Veddah
6884	vel	Veluws
6885	vem	Vemgo-Mabas
6886	ve	Venda
6887	veo	VentureÃ±o
6888	vep	Veps
6889	ver	Mom Jango
6890	vgr	Vaghri
6891	vgt	Vlaamse Gebarentaal
6892	vic	Virgin Islands Creole English
6893	vid	Vidunda
6894	vi	Vietnamese
6895	vif	Vili
6896	vig	Viemo
6897	vil	Vilela
6898	vin	Vinza
6899	vis	Vishavan
6900	vit	Viti
6901	viv	Iduna
6902	vjk	Bajjika
6903	vka	Kariyarra
6904	vkj	Kujarge
6905	vkk	Kaur
6906	vkl	Kulisusu
6907	vkm	Kamakan
6908	vkn	Koro Nulu
6909	vko	Kodeoha
6910	vkp	Korlai Creole Portuguese
6911	vkt	Tenggarong Kutai Malay
6912	vku	Kurrama
6913	vkz	Koro Zuba
6914	vlp	Valpei
6915	vls	Vlaams
6916	vma	Martuyhunira
6917	vmb	Barbaram
6918	vmc	Juxtlahuaca Mixtec
6919	vmd	Mudu Koraga
6920	vme	East Masela
6921	vmf	MainfrÃ¤nkisch
6922	vmg	Lungalunga
6923	vmh	Maraghei
6924	vmi	Miwa
6925	vmj	Ixtayutla Mixtec
6926	vmk	Makhuwa-Shirima
6927	vml	Malgana
6928	vmm	Mitlatongo Mixtec
6929	vmp	Soyaltepec Mazatec
6930	vmq	Soyaltepec Mixtec
6931	vmr	Marenje
6932	vms	Moksela
6933	vmu	Muluridyi
6934	vmv	Valley Maidu
6935	vmw	Makhuwa
6936	vmx	Tamazola Mixtec
6937	vmy	Ayautla Mazatec
6938	vmz	MazatlÃ¡n Mazatec
6939	vnk	Vano
6940	vnm	Vinmavis
6941	vnp	Vunapu
6942	vo	VolapÃ¼k
6943	vor	Voro
6944	vot	Votic
6945	vra	Vera'a
6946	vro	VÃµro
6947	vrs	Varisi
6948	vrt	Burmbar
6949	vsi	Moldova Sign Language
6950	vsl	Venezuelan Sign Language
6951	vsn	Vedic Sanskrit
6952	vsv	Valencian Sign Language
6953	vto	Vitou
6954	vum	Vumbu
6955	vun	Vunjo
6956	vut	Vute
6957	vwa	Awa (China)
6958	waa	Walla Walla
6959	wab	Wab
6960	wac	Wasco-Wishram
6961	wad	Wamesa
6962	wae	Walser
6963	waf	WakonÃ¡
6964	wag	Wa'ema
6965	wah	Watubela
6966	wai	Wares
6967	waj	Waffa
6968	wal	Wolaytta
6969	wam	Wampanoag
6970	wan	Wan
6971	wao	Wappo
6972	wap	Wapishana
6973	waq	Wagiman
6974	war	Waray (Philippines)
6975	was	Washo
6976	wat	Kaninuwa
6977	wau	WaurÃ¡
6978	wav	Waka
6979	waw	Waiwai
6980	wax	Watam
6981	way	Wayana
6982	waz	Wampur
6983	wba	Warao
6984	wbb	Wabo
6985	wbe	Waritai
6986	wbf	Wara
6987	wbh	Wanda
6988	wbi	Vwanji
6989	wbj	Alagwa
6990	wbk	Waigali
6991	wbl	Wakhi
6992	wbm	Wa
6993	wbp	Warlpiri
6994	wbq	Waddar
6995	wbr	Wagdi
6996	wbs	West Bengal Sign Language
6997	wbt	Warnman
6998	wbv	Wajarri
6999	wbw	Woi
7000	wca	YanomÃ¡mi
7001	wci	Waci Gbe
7002	wdd	Wandji
7003	wdg	Wadaginam
7004	wdj	Wadjiginy
7005	wdk	Wadikali
7006	wdt	Wendat
7007	wdu	Wadjigu
7008	wdy	Wadjabangayi
7009	wea	Wewaw
7010	wec	WÃ¨ Western
7011	wed	Wedau
7012	weg	Wergaia
7013	weh	Weh
7014	wei	Kiunum
7015	wem	Weme Gbe
7016	weo	Wemale
7017	wep	Westphalien
7018	wer	Weri
7019	wes	Cameroon Pidgin
7020	wet	Perai
7021	weu	Rawngtu Chin
7022	wew	Wejewa
7023	wfg	Yafi
7024	wga	Wagaya
7025	wgb	Wagawaga
7026	wgg	Wangkangurru
7027	wgi	Wahgi
7028	wgo	Waigeo
7029	wgu	Wirangu
7030	wgy	Warrgamay
7031	wha	Sou Upaa
7032	whg	North Wahgi
7033	whk	Wahau Kenyah
7034	whu	Wahau Kayan
7035	wib	Southern Toussian
7036	wic	Wichita
7037	wie	Wik-Epa
7038	wif	Wik-Keyangan
7039	wig	Wik Ngathan
7040	wih	Wik-Me'anha
7041	wii	Minidien
7042	wij	Wik-Iiyanh
7043	wik	Wikalkan
7044	wil	Wilawila
7045	wim	Wik-Mungkan
7046	win	Ho-Chunk
7047	wir	WirafÃ©d
7048	wiu	Wiru
7049	wiv	Vitu
7050	wiy	Wiyot
7051	wja	Waja
7052	wji	Warji
7053	wka	Kw'adza
7054	wkb	Kumbaran
7055	wkd	Wakde
7056	wkl	Kalanadi
7057	wkr	Keerray-Woorroong
7058	wku	Kunduvadi
7059	wkw	Wakawaka
7060	wky	Wangkayutyuru
7061	wla	Walio
7062	wlc	Mwali Comorian
7063	wle	Wolane
7064	wlg	Kunbarlang
7065	wlh	Welaun
7066	wli	Waioli
7067	wlk	Wailaki
7068	wll	Wali (Sudan)
7069	wlm	Middle Welsh
7070	wa	Walloon
7071	wlo	Wolio
7072	wlr	Wailapa
7073	wls	Wallisian
7074	wlu	Wuliwuli
7075	wlv	WichÃ­ LhamtÃ©s Vejoz
7076	wlw	Walak
7077	wlx	Wali (Ghana)
7078	wly	Waling
7079	wma	Mawa (Nigeria)
7080	wmb	Wambaya
7081	wmc	Wamas
7082	wmd	MamaindÃ©
7083	wme	Wambule
7084	wmg	Western Minyag
7085	wmh	Waima'a
7086	wmi	Wamin
7087	wmm	Maiwa (Indonesia)
7088	wmn	Waamwang
7089	wmo	Wom (Papua New Guinea)
7090	wms	Wambon
7091	wmt	Walmajarri
7092	wmw	Mwani
7093	wmx	Womo
7094	wnb	Mokati
7095	wnc	Wantoat
7096	wnd	Wandarang
7097	wne	Waneci
7098	wng	Wanggom
7099	wni	Ndzwani Comorian
7100	wnk	Wanukaka
7101	wnm	Wanggamala
7102	wnn	Wunumara
7103	wno	Wano
7104	wnp	Wanap
7105	wnu	Usan
7106	wnw	Wintu
7107	wny	Wanyi
7108	woa	Kuwema
7109	wob	WÃ¨ Northern
7110	woc	Wogeo
7111	wod	Wolani
7112	woe	Woleaian
7113	wof	Gambian Wolof
7114	wog	Wogamusin
7115	woi	Kamang
7116	wok	Longto
7117	wo	Wolof
7118	wom	Wom (Nigeria)
7119	won	Wongo
7120	woo	Manombai
7121	wor	Woria
7122	wos	Hanga Hundi
7123	wow	Wawonii
7124	woy	Weyto
7125	wpc	Maco
7126	wrb	Waluwarra
7127	wrg	Warungu
7128	wrh	Wiradjuri
7129	wri	Wariyangga
7130	wrk	Garrwa
7131	wrl	Warlmanpa
7132	wrm	Warumungu
7133	wrn	Warnang
7134	wro	Worrorra
7135	wrp	Waropen
7136	wrr	Wardaman
7137	wrs	Waris
7138	wru	Waru
7139	wrv	Waruna
7140	wrw	Gugu Warra
7141	wrx	Wae Rana
7142	wry	Merwari
7143	wrz	Waray (Australia)
7144	wsa	Warembori
7145	wsg	Adilabad Gondi
7146	wsi	Wusi
7147	wsk	Waskia
7148	wsr	Owenia
7149	wss	Wasa
7150	wsu	Wasu
7151	wsv	Wotapuri-Katarqalai
7152	wtb	Matambwe
7153	wtf	Watiwa
7154	wth	Wathawurrung
7155	wti	Berta
7156	wtk	Watakataui
7157	wtm	Mewati
7158	wtw	Wotu
7159	wua	Wikngenchera
7160	wub	Wunambal
7161	wud	Wudu
7162	wuh	Wutunhua
7163	wul	Silimo
7164	wum	Wumbvu
7165	wun	Bungu
7166	wur	Wurrugu
7167	wut	Wutung
7168	wuu	Wu Chinese
7169	wuv	Wuvulu-Aua
7170	wux	Wulna
7171	wuy	Wauyai
7172	wwa	Waama
7173	wwb	Wakabunga
7174	wwo	Wetamut
7175	wwr	Warrwa
7176	www	Wawa
7177	wxa	Waxianghua
7178	wxw	Wardandi
7179	wyb	Wangaaybuwan-Ngiyambaa
7180	wyi	Woiwurrung
7181	wym	Wymysorys
7182	wyn	Wyandot
7183	wyr	WayorÃ³
7184	wyy	Western Fijian
7185	xaa	Andalusian Arabic
7186	xab	Sambe
7187	xac	Kachari
7188	xad	Adai
7189	xae	Aequian
7190	xag	Aghwan
7191	xai	KaimbÃ©
7192	xaj	ArarandewÃ¡ra
7193	xak	MÃ¡ku
7194	xal	Kalmyk
7195	xam	Ç€Xam
7196	xan	Xamtanga
7197	xao	Khao
7198	xap	Apalachee
7199	xaq	Aquitanian
7200	xar	Karami
7201	xas	Kamas
7202	xat	Katawixi
7203	xau	Kauwera
7204	xav	XavÃ¡nte
7205	xaw	Kawaiisu
7206	xay	Kayan Mahakam
7207	xbb	Lower Burdekin
7208	xbc	Bactrian
7209	xbd	Bindal
7210	xbe	Bigambal
7211	xbg	Bunganditj
7212	xbi	Kombio
7213	xbj	Birrpayi
7214	xbm	Middle Breton
7215	xbn	Kenaboi
7216	xbo	Bolgarian
7217	xbp	Bibbulman
7218	xbr	Kambera
7219	xbw	KambiwÃ¡
7220	xby	Batjala
7221	xcb	Cumbric
7222	xcc	Camunic
7223	xce	Celtiberian
7224	xcg	Cisalpine Gaulish
7225	xch	Chemakum
7226	xcl	Classical Armenian
7227	xcm	Comecrudo
7228	xcn	Cotoname
7229	xco	Chorasmian
7230	xcr	Carian
7231	xct	Classical Tibetan
7232	xcu	Curonian
7233	xcv	Chuvantsy
7234	xcw	Coahuilteco
7235	xcy	Cayuse
7236	xda	Darkinyung
7237	xdc	Dacian
7238	xdk	Dharuk
7239	xdm	Edomite
7240	xdo	Kwandu
7241	xdq	Kaitag
7242	xdy	Malayic Dayak
7243	xeb	Eblan
7244	xed	Hdi
7245	xeg	ÇXegwi
7246	xel	Kelo
7247	xem	Kembayan
7248	xep	Epi-Olmec
7249	xer	XerÃ©nte
7250	xes	Kesawai
7251	xet	XetÃ¡
7252	xeu	Keoru-Ahia
7253	xfa	Faliscan
7254	xga	Galatian
7255	xgb	Gbin
7256	xgd	Gudang
7257	xgf	Gabrielino-FernandeÃ±o
7258	xgg	Goreng
7259	xgi	Garingbal
7260	xgl	Galindan
7261	xgm	Dharumbal
7262	xgr	Garza
7263	xgu	Unggumi
7264	xgw	Guwa
7265	xha	Harami
7266	xhc	Hunnic
7267	xhd	Hadrami
7268	xhe	Khetrani
7269	xhm	Middle Khmer (1400 to 1850 CE)
7270	xh	Xhosa
7271	xhr	Hernican
7272	xht	Hattic
7273	xhu	Hurrian
7274	xhv	Khua
7275	xib	Iberian
7276	xii	Xiri
7277	xil	Illyrian
7278	xin	Xinca
7279	xir	XiriÃ¢na
7280	xis	Kisan
7281	xiv	Indus Valley Language
7282	xiy	Xipaya
7283	xjb	Minjungbal
7284	xjt	Jaitmatang
7285	xka	Kalkoti
7286	xkb	Northern Nago
7287	xkc	Kho'ini
7288	xkd	Mendalam Kayan
7289	xke	Kereho
7290	xkf	Khengkha
7291	xkg	Kagoro
7292	xki	Kenyan Sign Language
7293	xkj	Kajali
7294	xkk	Kachok
7295	xkl	Mainstream Kenyah
7296	xkn	Kayan River Kayan
7297	xko	Kiorr
7298	xkp	Kabatei
7299	xkq	Koroni
7300	xkr	XakriabÃ¡
7301	xks	Kumbewaha
7302	xkt	Kantosi
7303	xku	Kaamba
7304	xkv	Kgalagadi
7305	xkw	Kembra
7306	xkx	Karore
7307	xky	Uma' Lasan
7308	xkz	Kurtokha
7309	xla	Kamula
7310	xlb	Loup B
7311	xlc	Lycian
7312	xld	Lydian
7313	xle	Lemnian
7314	xlg	Ligurian (Ancient)
7315	xli	Liburnian
7316	xln	Alanic
7317	xlo	Loup A
7318	xlp	Lepontic
7319	xls	Lusitanian
7320	xlu	Cuneiform Luwian
7321	xly	Elymian
7322	xma	Mushungulu
7323	xmb	Mbonga
7324	xmc	Makhuwa-Marrevone
7325	xmd	Mbudum
7326	xme	Median
7327	xmf	Mingrelian
7328	xmg	Mengaka
7329	xmh	Kugu-Muminh
7330	xmj	Majera
7331	xmk	Ancient Macedonian
7332	xml	Malaysian Sign Language
7333	xmm	Manado Malay
7334	xmn	Manichaean Middle Persian
7335	xmo	Morerebi
7336	xmp	Kuku-Mu'inh
7337	xmq	Kuku-Mangk
7338	xmr	Meroitic
7339	xms	Moroccan Sign Language
7340	xmt	Matbat
7341	xmu	Kamu
7342	xmv	Antankarana Malagasy
7343	xmw	Tsimihety Malagasy
7344	xmx	Salawati
7345	xmy	Mayaguduna
7346	xmz	Mori Bawah
7347	xna	Ancient North Arabian
7348	xnb	Kanakanabu
7349	xng	Middle Mongolian
7350	xnh	Kuanhua
7351	xni	Ngarigu
7352	xnj	Ngoni (Tanzania)
7353	xnk	Nganakarti
7354	xnm	Ngumbarl
7355	xnn	Northern Kankanay
7356	xno	Anglo-Norman
7357	xnq	Ngoni (Mozambique)
7358	xnr	Kangri
7359	xns	Kanashi
7360	xnt	Narragansett
7361	xnu	Nukunul
7362	xny	Nyiyaparli
7363	xnz	Kenzi
7364	xoc	O'chi'chi'
7365	xod	Kokoda
7366	xog	Soga
7367	xoi	Kominimung
7368	xok	Xokleng
7369	xom	Komo (Sudan)
7370	xon	Konkomba
7371	xoo	XukurÃº
7372	xop	Kopar
7373	xor	Korubo
7374	xow	Kowaki
7375	xpa	Pirriya
7376	xpb	Northeastern Tasmanian
7377	xpc	Pecheneg
7378	xpd	Oyster Bay Tasmanian
7379	xpe	Liberia Kpelle
7380	xpf	Southeast Tasmanian
7381	xpg	Phrygian
7382	xph	North Midlands Tasmanian
7383	xpi	Pictish
7384	xpj	Mpalitjanh
7385	xpk	Kulina Pano
7386	xpl	Port Sorell Tasmanian
7387	xpm	Pumpokol
7388	xpn	KapinawÃ¡
7389	xpo	Pochutec
7390	xpp	Puyo-Paekche
7391	xpq	Mohegan-Pequot
7392	xpr	Parthian
7393	xps	Pisidian
7394	xpt	Punthamara
7395	xpu	Punic
7396	xpv	Northern Tasmanian
7397	xpw	Northwestern Tasmanian
7398	xpx	Southwestern Tasmanian
7399	xpy	Puyo
7400	xpz	Bruny Island Tasmanian
7401	xqa	Karakhanid
7402	xqt	Qatabanian
7403	xra	KrahÃ´
7404	xrb	Eastern Karaboro
7405	xrd	Gundungurra
7406	xre	Kreye
7407	xrg	Minang
7408	xri	Krikati-Timbira
7409	xrm	Armazic
7410	xrn	Arin
7411	xrr	Raetic
7412	xrt	Aranama-Tamique
7413	xru	Marriammu
7414	xrw	Karawa
7415	xsa	Sabaean
7416	xsb	Sambal
7417	xsc	Scythian
7418	xsd	Sidetic
7419	xse	Sempan
7420	xsh	Shamang
7421	xsi	Sio
7422	xsj	Subi
7423	xsl	South Slavey
7424	xsm	Kasem
7425	xsn	Sanga (Nigeria)
7426	xso	Solano
7427	xsp	Silopi
7428	xsq	Makhuwa-Saka
7429	xsr	Sherpa
7430	xsu	SanumÃ¡
7431	xsv	Sudovian
7432	xsy	Saisiyat
7433	xta	Alcozauca Mixtec
7434	xtb	Chazumba Mixtec
7435	xtc	Katcha-Kadugli-Miri
7436	xtd	Diuxi-Tilantongo Mixtec
7437	xte	Ketengban
7438	xtg	Transalpine Gaulish
7439	xth	Yitha Yitha
7440	xti	Sinicahua Mixtec
7441	xtj	San Juan Teita Mixtec
7442	xtl	Tijaltepec Mixtec
7443	xtm	Magdalena PeÃ±asco Mixtec
7444	xtn	Northern Tlaxiaco Mixtec
7445	xto	Tokharian A
7446	xtp	San Miguel Piedras Mixtec
7447	xtq	Tumshuqese
7448	xtr	Early Tripuri
7449	xts	Sindihui Mixtec
7450	xtt	Tacahua Mixtec
7451	xtu	Cuyamecalco Mixtec
7452	xtv	Thawa
7453	xtw	TawandÃª
7454	xty	Yoloxochitl Mixtec
7455	xua	Alu Kurumba
7456	xub	Betta Kurumba
7457	xud	Umiida
7458	xug	Kunigami
7459	xuj	Jennu Kurumba
7460	xul	Ngunawal
7461	xum	Umbrian
7462	xun	Unggaranggu
7463	xuo	Kuo
7464	xup	Upper Umpqua
7465	xur	Urartian
7466	xut	Kuthant
7467	xuu	Kxoe
7468	xve	Venetic
7469	xvi	Kamviri
7470	xvn	Vandalic
7471	xvo	Volscian
7472	xvs	Vestinian
7473	xwa	Kwaza
7474	xwc	Woccon
7475	xwd	Wadi Wadi
7476	xwe	Xwela Gbe
7477	xwg	Kwegu
7478	xwj	Wajuk
7479	xwk	Wangkumara
7480	xwl	Western Xwla Gbe
7481	xwo	Written Oirat
7482	xwr	Kwerba Mamberamo
7483	xwt	Wotjobaluk
7484	xww	Wemba Wemba
7485	xxb	Boro (Ghana)
7486	xxk	Ke'o
7487	xxm	Minkin
7488	xxr	KoropÃ³
7489	xxt	Tambora
7490	xya	Yaygir
7491	xyb	Yandjibara
7492	xyj	Mayi-Yapi
7493	xyk	Mayi-Kulan
7494	xyl	Yalakalore
7495	xyt	Mayi-Thakurti
7496	xyy	Yorta Yorta
7497	xzh	Zhang-Zhung
7498	xzm	Zemgalian
7499	xzp	Ancient Zapotec
7500	yaa	Yaminahua
7501	yab	Yuhup
7502	yac	Pass Valley Yali
7503	yad	Yagua
7504	yae	PumÃ©
7505	yaf	Yaka (Democratic Republic of Congo)
7506	yag	YÃ¡mana
7507	yah	Yazgulyam
7508	yai	Yagnobi
7509	yaj	Banda-Yangere
7510	yak	Yakama
7511	yal	Yalunka
7512	yam	Yamba
7513	yan	Mayangna
7514	yao	Yao
7515	yap	Yapese
7516	yaq	Yaqui
7517	yar	Yabarana
7518	yas	Nugunu (Cameroon)
7519	yat	Yambeta
7520	yau	Yuwana
7521	yav	Yangben
7522	yaw	YawalapitÃ­
7523	yax	Yauma
7524	yay	Agwagwune
7525	yaz	Lokaa
7526	yba	Yala
7527	ybb	Yemba
7528	ybe	West Yugur
7529	ybh	Yakha
7530	ybi	Yamphu
7531	ybj	Hasha
7532	ybk	Bokha
7533	ybl	Yukuben
7534	ybm	Yaben
7535	ybn	YabaÃ¢na
7536	ybo	Yabong
7537	ybx	Yawiyo
7538	yby	Yaweyuha
7539	ych	Chesu
7540	ycl	Lolopo
7541	ycn	Yucuna
7542	ycp	Chepya
7543	ycr	Yilan Creole
7544	yda	Yanda
7545	ydd	Eastern Yiddish
7546	yde	Yangum Dey
7547	ydg	Yidgha
7548	ydk	Yoidik
7549	yea	Ravula
7550	yec	Yeniche
7551	yee	Yimas
7552	yei	Yeni
7553	yej	Yevanic
7554	yel	Yela
7555	yer	Tarok
7556	yes	Nyankpa
7557	yet	Yetfa
7558	yeu	Yerukula
7559	yev	Yapunda
7560	yey	Yeyi
7561	yga	Malyangapa
7562	ygi	Yiningayi
7563	ygl	Yangum Gel
7564	ygm	Yagomi
7565	ygp	Gepo
7566	ygr	Yagaria
7567	ygs	YolÅ‹u Sign Language
7568	ygu	Yugul
7569	ygw	Yagwoia
7570	yha	Baha Buyang
7571	yhd	Judeo-Iraqi Arabic
7572	yhl	Hlepho Phowa
7573	yhs	Yan-nhaÅ‹u Sign Language
7574	yia	Yinggarda
7575	yi	Yiddish
7576	yif	Ache
7577	yig	Wusa Nasu
7578	yih	Western Yiddish
7579	yii	Yidiny
7580	yij	Yindjibarndi
7581	yik	Dongshanba Lalo
7582	yil	Yindjilandji
7583	yim	Yimchungru Naga
7584	yin	Riang Lai
7585	yip	Pholo
7586	yiq	Miqie
7587	yir	North Awyu
7588	yis	Yis
7589	yit	Eastern Lalu
7590	yiu	Awu
7591	yiv	Northern Nisu
7592	yix	Axi Yi
7593	yiz	Azhe
7594	yka	Yakan
7595	ykg	Northern Yukaghir
7596	ykh	Khamnigan Mongol
7597	yki	Yoke
7598	ykk	Yakaikeke
7599	ykl	Khlula
7600	ykm	Kap
7601	ykn	Kua-nsi
7602	yko	Yasa
7603	ykr	Yekora
7604	ykt	Kathu
7605	yku	Kuamasi
7606	yky	Yakoma
7607	yla	Yaul
7608	ylb	Yaleba
7609	yle	Yele
7610	ylg	Yelogu
7611	yli	Angguruk Yali
7612	yll	Yil
7613	ylm	Limi
7614	yln	Langnian Buyang
7615	ylo	Naluo Yi
7616	ylr	Yalarnnga
7617	ylu	Aribwaung
7618	yly	NyÃ¢layu
7619	ymb	Yambes
7620	ymc	Southern Muji
7621	ymd	Muda
7622	yme	Yameo
7623	ymg	Yamongeri
7624	ymh	Mili
7625	ymi	Moji
7626	ymk	Makwe
7627	yml	Iamalele
7628	ymm	Maay
7629	ymn	Yamna
7630	ymo	Yangum Mon
7631	ymp	Yamap
7632	ymq	Qila Muji
7633	ymr	Malasar
7634	yms	Mysian
7635	ymx	Northern Muji
7636	ymz	Muzi
7637	yna	Aluo
7638	ynd	Yandruwandha
7639	yne	Lang'e
7640	yng	Yango
7641	ynk	Naukan Yupik
7642	ynl	Yangulam
7643	ynn	Yana
7644	yno	Yong
7645	ynq	Yendang
7646	yns	Yansi
7647	ynu	Yahuna
7648	yob	Yoba
7649	yog	Yogad
7650	yoi	Yonaguni
7651	yok	Yokuts
7652	yol	Yola
7653	yom	Yombe
7654	yon	Yongkom
7655	yo	Yoruba
7656	yot	Yotti
7657	yox	Yoron
7658	yoy	Yoy
7659	ypa	Phala
7660	ypb	Labo Phowa
7661	ypg	Phola
7662	yph	Phupha
7663	ypm	Phuma
7664	ypn	Ani Phowa
7665	ypo	Alo Phola
7666	ypp	Phupa
7667	ypz	Phuza
7668	yra	Yerakai
7669	yrb	Yareba
7670	yre	YaourÃ©
7671	yrk	Nenets
7672	yrl	Nhengatu
7673	yrm	Yirrk-Mel
7674	yrn	Yerong
7675	yro	YaroamÃ«
7676	yrs	Yarsun
7677	yrw	Yarawata
7678	yry	Yarluyandi
7679	ysc	Yassic
7680	ysd	Samatao
7681	ysg	Sonaga
7682	ysl	Yugoslavian Sign Language
7683	ysm	Myanmar Sign Language
7684	ysn	Sani
7685	yso	Nisi (China)
7686	ysp	Southern Lolopo
7687	ysr	Sirenik Yupik
7688	yss	Yessan-Mayo
7689	ysy	Sanie
7690	yta	Talu
7691	ytl	Tanglang
7692	ytp	Thopho
7693	ytw	Yout Wam
7694	yty	Yatay
7695	yua	Yucateco
7696	yub	Yugambal
7697	yuc	Yuchi
7698	yud	Judeo-Tripolitanian Arabic
7699	yue	Yue Chinese
7700	yuf	Havasupai-Walapai-Yavapai
7701	yug	Yug
7702	yui	YurutÃ­
7703	yuj	Karkar-Yuri
7704	yuk	Yuki
7705	yul	Yulu
7706	yum	Quechan
7707	yun	Bena (Nigeria)
7708	yup	Yukpa
7709	yuq	Yuqui
7710	yur	Yurok
7711	yut	Yopno
7712	yuw	Yau (Morobe Province)
7713	yux	Southern Yukaghir
7714	yuy	East Yugur
7715	yuz	Yuracare
7716	yva	Yawa
7717	yvt	Yavitero
7718	ywa	Kalou
7719	ywg	Yinhawangka
7720	ywl	Western Lalu
7721	ywn	Yawanawa
7722	ywq	Wuding-Luquan Yi
7723	ywr	Yawuru
7724	ywt	Xishanba Lalo
7725	ywu	Wumeng Nasu
7726	yww	Yawarawarga
7727	yxa	Mayawali
7728	yxg	Yagara
7729	yxl	Yardliyawarra
7730	yxm	Yinwum
7731	yxu	Yuyu
7732	yxy	Yabula Yabula
7733	yyr	Yir Yoront
7734	yyu	Yau (Sandaun Province)
7735	yyz	Ayizi
7736	yzg	E'ma Buyang
7737	yzk	Zokhuo
7738	zaa	Sierra de JuÃ¡rez Zapotec
7739	zab	Western Tlacolula Valley Zapotec
7740	zac	OcotlÃ¡n Zapotec
7741	zad	Cajonos Zapotec
7742	zae	Yareni Zapotec
7743	zaf	Ayoquesco Zapotec
7744	zag	Zaghawa
7745	zah	Zangwal
7746	zai	Isthmus Zapotec
7747	zaj	Zaramo
7748	zak	Zanaki
7749	zal	Zauzou
7750	zam	MiahuatlÃ¡n Zapotec
7751	zao	Ozolotepec Zapotec
7752	zap	Zapotec
7753	zaq	AloÃ¡pam Zapotec
7754	zar	RincÃ³n Zapotec
7755	zas	Santo Domingo Albarradas Zapotec
7756	zat	Tabaa Zapotec
7757	zau	Zangskari
7758	zav	Yatzachi Zapotec
7759	zaw	Mitla Zapotec
7760	zax	Xadani Zapotec
7761	zay	Zayse-Zergulla
7762	zaz	Zari
7763	zba	Balaibalan
7764	zbc	Central Berawan
7765	zbe	East Berawan
7766	zbl	Blissymbols
7767	zbt	Batui
7768	zbu	Bu (Bauchi State)
7769	zbw	West Berawan
7770	zca	Coatecas Altas Zapotec
7771	zcd	Las Delicias Zapotec
7772	zch	Central Hongshuihe Zhuang
7773	zdj	Ngazidja Comorian
7774	zea	Zeeuws
7775	zeg	Zenag
7776	zeh	Eastern Hongshuihe Zhuang
7777	zem	Zeem
7778	zen	Zenaga
7779	zga	Kinga
7780	zgb	Guibei Zhuang
7781	zgh	Standard Moroccan Tamazight
7782	zgm	Minz Zhuang
7783	zgn	Guibian Zhuang
7784	zgr	Magori
7785	za	Zhuang
7786	zhb	Zhaba
7787	zhd	Dai Zhuang
7788	zhi	Zhire
7789	zhn	Nong Zhuang
7790	zh	Chinese
7791	zhw	Zhoa
7792	zia	Zia
7793	zib	Zimbabwe Sign Language
7794	zik	Zimakani
7795	zil	Zialo
7796	zim	Mesme
7797	zin	Zinza
7798	ziw	Zigula
7799	ziz	Zizilivakan
7800	zka	Kaimbulawa
7801	zkd	Kadu
7802	zkg	Koguryo
7803	zkh	Khorezmian
7804	zkk	Karankawa
7805	zkn	Kanan
7806	zko	Kott
7807	zkp	SÃ£o Paulo KaingÃ¡ng
7808	zkr	Zakhring
7809	zkt	Kitan
7810	zku	Kaurna
7811	zkv	Krevinian
7812	zkz	Khazar
7813	zla	Zula
7814	zlj	Liujiang Zhuang
7815	zlm	Malay (individual language)
7816	zln	Lianshan Zhuang
7817	zlq	Liuqian Zhuang
7818	zlu	Zul
7819	zma	Manda (Australia)
7820	zmb	Zimba
7821	zmc	Margany
7822	zmd	Maridan
7823	zme	Mangerr
7824	zmf	Mfinu
7825	zmg	Marti Ke
7826	zmh	Makolkol
7827	zmi	Negeri Sembilan Malay
7828	zmj	Maridjabin
7829	zmk	Mandandanyi
7830	zml	Matngala
7831	zmm	Marimanindji
7832	zmn	Mbangwe
7833	zmo	Molo
7834	zmp	Mpuono
7835	zmq	Mituku
7836	zmr	Maranunggu
7837	zms	Mbesa
7838	zmt	Maringarr
7839	zmu	Muruwari
7840	zmv	Mbariman-Gudhinma
7841	zmw	Mbo (Democratic Republic of Congo)
7842	zmx	Bomitaba
7843	zmy	Mariyedi
7844	zmz	Mbandja
7845	zna	Zan Gula
7846	zne	Zande (individual language)
7847	zng	Mang
7848	znk	Manangkari
7849	zns	Mangas
7850	zoc	CopainalÃ¡ Zoque
7851	zoh	Chimalapa Zoque
7852	zom	Zou
7853	zoo	AsunciÃ³n Mixtepec Zapotec
7854	zoq	Tabasco Zoque
7855	zor	RayÃ³n Zoque
7856	zos	Francisco LeÃ³n Zoque
7857	zpa	Lachiguiri Zapotec
7858	zpb	Yautepec Zapotec
7859	zpc	Choapan Zapotec
7860	zpd	Southeastern IxtlÃ¡n Zapotec
7861	zpe	Petapa Zapotec
7862	zpf	San Pedro Quiatoni Zapotec
7863	zpg	Guevea De Humboldt Zapotec
7864	zph	Totomachapan Zapotec
7865	zpi	Santa MarÃ­a Quiegolani Zapotec
7866	zpj	Quiavicuzas Zapotec
7867	zpk	Tlacolulita Zapotec
7868	zpl	LachixÃ­o Zapotec
7869	zpm	Mixtepec Zapotec
7870	zpn	Santa InÃ©s Yatzechi Zapotec
7871	zpo	AmatlÃ¡n Zapotec
7872	zpp	El Alto Zapotec
7873	zpq	Zoogocho Zapotec
7874	zpr	Santiago Xanica Zapotec
7875	zps	CoatlÃ¡n Zapotec
7876	zpt	San Vicente CoatlÃ¡n Zapotec
7877	zpu	YalÃ¡lag Zapotec
7878	zpv	Chichicapan Zapotec
7879	zpw	Zaniza Zapotec
7880	zpx	San Baltazar Loxicha Zapotec
7881	zpy	Mazaltepec Zapotec
7882	zpz	Texmelucan Zapotec
7883	zqe	Qiubei Zhuang
7884	zra	Kara (Korea)
7885	zrg	Mirgan
7886	zrn	Zerenkel
7887	zro	ZÃ¡paro
7888	zrp	Zarphatic
7889	zrs	Mairasi
7890	zsa	Sarasira
7891	zsk	Kaskean
7892	zsl	Zambian Sign Language
7893	zsm	Standard Malay
7894	zsr	Southern Rincon Zapotec
7895	zsu	Sukurum
7896	zte	Elotepec Zapotec
7897	ztg	XanaguÃ­a Zapotec
7898	ztl	LapaguÃ­a-Guivini Zapotec
7899	ztm	San AgustÃ­n Mixtepec Zapotec
7900	ztn	Santa Catarina Albarradas Zapotec
7901	ztp	Loxicha Zapotec
7902	ztq	Quioquitani-QuierÃ­ Zapotec
7903	zts	Tilquiapan Zapotec
7904	ztt	Tejalapan Zapotec
7905	ztu	GÃ¼ilÃ¡ Zapotec
7906	ztx	Zaachila Zapotec
7907	zty	Yatee Zapotec
7908	zuh	Tokano
7909	zu	Zulu
7910	zum	Kumzari
7911	zun	Zuni
7912	zuy	Zumaya
7913	zwa	Zay
7914	zxx	No linguistic content
7915	zyb	Yongbei Zhuang
7916	zyg	Yang Zhuang
7917	zyj	Youjiang Zhuang
7918	zyn	Yongnan Zhuang
7919	zyp	Zyphe Chin
7920	zza	Zaza
7921	zzj	Zuojiang Zhuang
7922	zzz	Other
\.


--
-- Data for Name: lead_from; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_from (id, count, title) FROM stdin;
1	0	platform
2	0	media
3	0	newsletter
4	0	search
5	0	Friends
6	0	fair
7	0	Flyer
\.


--
-- Data for Name: location; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.location (id, type, info) FROM stdin;
1	district	\N
2	district	\N
3	district	\N
4	district	\N
5	district	\N
6	district	\N
7	district	\N
8	district	\N
9	district	\N
10	district	\N
11	district	\N
12	district	\N
13	district	\N
14	district	\N
15	district	\N
16	district	\N
17	district	\N
18	district	\N
19	district	\N
20	district	\N
21	district	\N
22	district	\N
23	district	\N
24	district	\N
25	district	\N
26	district	\N
27	district	\N
28	district	\N
29	district	\N
30	district	\N
31	district	\N
32	district	\N
33	district	\N
34	district	\N
35	district	\N
36	district	\N
37	district	\N
38	district	\N
39	district	\N
40	district	\N
41	district	\N
42	district	\N
43	district	\N
44	district	\N
45	district	\N
46	district	\N
47	district	\N
48	district	\N
49	district	\N
50	district	\N
51	district	\N
52	district	\N
53	district	\N
54	district	\N
55	district	\N
56	district	\N
57	district	\N
58	district	\N
59	district	\N
60	district	\N
61	district	\N
62	district	\N
63	district	\N
64	district	\N
65	district	\N
66	district	\N
67	district	\N
68	district	\N
69	district	\N
70	district	\N
71	district	\N
72	district	\N
73	district	\N
74	district	\N
75	district	\N
76	district	\N
77	district	\N
78	district	\N
79	district	\N
80	district	\N
81	district	\N
82	district	\N
83	district	\N
84	district	\N
85	district	\N
86	district	\N
87	district	\N
88	district	\N
89	district	\N
90	district	\N
91	district	\N
92	district	\N
93	district	\N
94	district	\N
95	district	\N
96	district	\N
97	district	\N
98	district	\N
99	district	\N
100	district	\N
101	district	\N
102	district	\N
103	district	\N
104	district	\N
105	district	\N
106	district	\N
107	district	\N
108	district	\N
109	district	\N
110	district	\N
111	district	\N
112	district	\N
113	district	\N
114	district	\N
115	district	\N
116	district	\N
117	district	\N
118	district	\N
119	district	\N
120	district	\N
121	district	\N
122	district	\N
123	district	\N
124	district	\N
125	district	\N
126	district	\N
127	district	\N
128	district	\N
129	district	\N
130	district	\N
131	district	\N
132	district	\N
133	district	\N
134	district	\N
135	district	\N
136	district	\N
137	district	\N
138	district	\N
139	district	\N
140	district	\N
141	district	\N
142	district	\N
143	district	\N
144	district	\N
145	district	\N
146	district	\N
147	district	\N
148	district	\N
149	district	\N
150	district	\N
151	district	\N
152	district	\N
153	district	\N
154	district	\N
155	district	\N
156	district	\N
157	district	\N
158	district	\N
159	district	\N
160	district	\N
161	district	\N
162	district	\N
163	district	\N
164	district	\N
165	district	\N
166	district	\N
167	district	\N
168	district	\N
169	district	\N
170	district	\N
171	district	\N
172	district	\N
173	district	\N
174	district	\N
175	district	\N
176	district	\N
177	district	\N
178	district	\N
179	district	\N
180	district	\N
181	district	\N
182	district	\N
183	district	\N
184	district	\N
185	district	\N
186	district	\N
187	district	\N
188	district	\N
189	district	\N
190	district	\N
191	district	\N
192	district	\N
193	district	\N
194	district	\N
195	district	\N
196	district	\N
197	district	\N
198	district	\N
199	district	\N
200	district	\N
201	district	\N
202	district	\N
203	district	\N
204	district	\N
205	district	\N
206	district	\N
207	district	\N
208	district	\N
209	district	\N
210	district	\N
211	district	\N
212	district	\N
213	district	\N
214	district	\N
215	district	\N
216	district	\N
217	district	\N
218	district	\N
219	district	\N
220	district	\N
221	district	\N
222	district	\N
223	district	\N
224	district	\N
225	district	\N
226	district	\N
227	district	\N
237	district	\N
242	district	\N
285	district	\N
289	district	\N
291	district	\N
348	district	\N
354	district	\N
371	district	\N
374	district	\N
381	district	\N
400	district	\N
401	district	\N
410	district	\N
416	district	\N
430	district	\N
433	district	\N
450	district	\N
458	district	\N
475	district	\N
493	district	\N
499	district	\N
507	district	\N
513	district	\N
517	district	\N
530	district	\N
533	district	\N
228	district	\N
232	district	\N
238	district	\N
246	district	\N
259	district	\N
262	district	\N
273	district	\N
275	district	\N
295	district	\N
298	district	\N
302	district	\N
309	district	\N
313	district	\N
318	district	\N
321	district	\N
326	district	\N
328	district	\N
331	district	\N
343	district	\N
344	district	\N
365	district	\N
397	district	\N
420	district	\N
423	district	\N
429	district	\N
445	district	\N
451	district	\N
466	district	\N
470	district	\N
483	district	\N
492	district	\N
497	district	\N
503	district	\N
511	district	\N
522	district	\N
229	district	\N
233	district	\N
243	district	\N
250	district	\N
271	district	\N
278	district	\N
284	district	\N
303	district	\N
305	district	\N
327	district	\N
333	district	\N
336	district	\N
345	district	\N
355	district	\N
356	district	\N
388	district	\N
393	district	\N
395	district	\N
408	district	\N
432	district	\N
516	district	\N
524	district	\N
531	district	\N
537	district	\N
230	district	\N
261	district	\N
265	district	\N
269	district	\N
272	district	\N
282	district	\N
283	district	\N
287	district	\N
300	district	\N
311	district	\N
320	district	\N
322	district	\N
329	district	\N
350	district	\N
359	district	\N
384	district	\N
385	district	\N
387	district	\N
392	district	\N
396	district	\N
398	district	\N
405	district	\N
412	district	\N
414	district	\N
415	district	\N
424	district	\N
434	district	\N
437	district	\N
439	district	\N
446	district	\N
453	district	\N
456	district	\N
505	district	\N
515	district	\N
519	district	\N
523	district	\N
526	district	\N
538	district	\N
231	district	\N
239	district	\N
252	district	\N
257	district	\N
277	district	\N
281	district	\N
292	district	\N
294	district	\N
301	district	\N
323	district	\N
340	district	\N
349	district	\N
352	district	\N
353	district	\N
360	district	\N
369	district	\N
376	district	\N
382	district	\N
386	district	\N
389	district	\N
407	district	\N
435	district	\N
457	district	\N
459	district	\N
463	district	\N
465	district	\N
471	district	\N
488	district	\N
234	district	\N
240	district	\N
245	district	\N
249	district	\N
256	district	\N
260	district	\N
288	district	\N
293	district	\N
297	district	\N
304	district	\N
307	district	\N
324	district	\N
330	district	\N
341	district	\N
342	district	\N
363	district	\N
364	district	\N
372	district	\N
378	district	\N
390	district	\N
399	district	\N
402	district	\N
413	district	\N
421	district	\N
447	district	\N
452	district	\N
477	district	\N
501	district	\N
509	district	\N
518	district	\N
529	district	\N
235	district	\N
247	district	\N
254	district	\N
264	district	\N
268	district	\N
310	district	\N
315	district	\N
337	district	\N
358	district	\N
361	district	\N
366	district	\N
368	district	\N
373	district	\N
375	district	\N
377	district	\N
379	district	\N
404	district	\N
411	district	\N
419	district	\N
427	district	\N
460	district	\N
462	district	\N
473	district	\N
476	district	\N
478	district	\N
479	district	\N
485	district	\N
494	district	\N
496	district	\N
500	district	\N
502	district	\N
506	district	\N
525	district	\N
528	district	\N
532	district	\N
539	district	\N
541	district	\N
542	district	\N
543	district	\N
544	district	\N
545	district	\N
546	district	\N
547	district	\N
548	district	\N
549	district	\N
550	district	\N
551	district	\N
552	district	\N
553	district	\N
554	district	\N
555	district	\N
556	district	\N
557	district	\N
558	district	\N
559	district	\N
560	district	\N
561	district	\N
562	district	\N
563	district	\N
564	district	\N
565	district	\N
566	district	\N
567	district	\N
568	district	\N
569	district	\N
570	district	\N
571	district	\N
572	district	\N
573	district	\N
574	district	\N
575	district	\N
576	district	\N
577	district	\N
578	district	\N
579	district	\N
580	district	\N
581	district	\N
582	district	\N
583	district	\N
584	district	\N
585	district	\N
586	district	\N
587	district	\N
588	district	\N
589	district	\N
590	district	\N
591	district	\N
592	district	\N
593	district	\N
594	district	\N
595	district	\N
596	district	\N
597	district	\N
598	district	\N
599	district	\N
600	district	\N
601	district	\N
602	district	\N
603	district	\N
604	district	\N
605	district	\N
606	district	\N
607	district	\N
608	district	\N
609	district	\N
610	district	\N
611	district	\N
612	district	\N
613	district	\N
614	district	\N
615	district	\N
616	district	\N
617	district	\N
618	district	\N
619	district	\N
620	district	\N
621	district	\N
622	district	\N
623	district	\N
624	district	\N
625	district	\N
626	district	\N
627	district	\N
628	district	\N
629	district	\N
630	district	\N
631	district	\N
632	district	\N
633	district	\N
634	district	\N
635	district	\N
636	district	\N
637	district	\N
638	district	\N
639	district	\N
640	district	\N
641	district	\N
642	district	\N
643	district	\N
644	district	\N
645	district	\N
646	district	\N
647	district	\N
648	district	\N
649	district	\N
650	district	\N
651	district	\N
652	district	\N
653	district	\N
654	district	\N
655	district	\N
656	district	\N
657	district	\N
658	district	\N
659	district	\N
660	district	\N
661	district	\N
662	district	\N
663	district	\N
664	district	\N
665	district	\N
666	district	\N
667	district	\N
668	district	\N
669	district	\N
670	district	\N
671	district	\N
672	district	\N
673	district	\N
674	district	\N
675	district	\N
676	district	\N
677	district	\N
678	district	\N
679	district	\N
680	district	\N
681	district	\N
682	district	\N
683	district	\N
684	district	\N
685	district	\N
686	district	\N
687	district	\N
688	district	\N
689	district	\N
690	district	\N
691	district	\N
692	district	\N
693	district	\N
694	district	\N
695	district	\N
696	district	\N
697	district	\N
698	district	\N
699	district	\N
700	district	\N
701	district	\N
702	district	\N
703	district	\N
704	district	\N
705	district	\N
706	district	\N
707	district	\N
708	district	\N
709	district	\N
710	district	\N
711	district	\N
712	district	\N
713	district	\N
714	district	\N
715	district	\N
716	district	\N
717	district	\N
718	district	\N
719	district	\N
720	district	\N
721	district	\N
722	district	\N
723	district	\N
724	district	\N
725	district	\N
726	district	\N
727	district	\N
728	district	\N
729	district	\N
730	district	\N
236	district	\N
253	district	\N
255	district	\N
258	district	\N
274	district	\N
280	district	\N
290	district	\N
296	district	\N
299	district	\N
306	district	\N
312	district	\N
335	district	\N
362	district	\N
383	district	\N
406	district	\N
409	district	\N
425	district	\N
426	district	\N
428	district	\N
431	district	\N
436	district	\N
438	district	\N
444	district	\N
448	district	\N
449	district	\N
455	district	\N
461	district	\N
467	district	\N
469	district	\N
481	district	\N
486	district	\N
490	district	\N
491	district	\N
510	district	\N
514	district	\N
540	district	\N
241	district	\N
266	district	\N
270	district	\N
276	district	\N
316	district	\N
319	district	\N
325	district	\N
334	district	\N
338	district	\N
339	district	\N
347	district	\N
357	district	\N
391	district	\N
394	district	\N
442	district	\N
443	district	\N
464	district	\N
474	district	\N
480	district	\N
489	district	\N
498	district	\N
512	district	\N
520	district	\N
535	district	\N
536	district	\N
244	district	\N
248	district	\N
251	district	\N
263	district	\N
267	district	\N
279	district	\N
286	district	\N
308	district	\N
314	district	\N
317	district	\N
332	district	\N
346	district	\N
351	district	\N
367	district	\N
370	district	\N
380	district	\N
403	district	\N
417	district	\N
418	district	\N
422	district	\N
440	district	\N
441	district	\N
454	district	\N
468	district	\N
472	district	\N
482	district	\N
484	district	\N
487	district	\N
495	district	\N
504	district	\N
508	district	\N
521	district	\N
527	district	\N
534	district	\N
731	district	\N
732	district	\N
733	district	\N
734	district	\N
735	district	\N
736	district	\N
737	district	\N
738	district	\N
739	district	\N
740	district	\N
741	district	\N
742	district	\N
743	district	\N
744	district	\N
745	district	\N
746	district	\N
747	district	\N
748	district	\N
749	district	\N
750	district	\N
751	district	\N
752	district	\N
753	district	\N
754	district	\N
755	district	\N
756	district	\N
757	district	\N
758	district	\N
759	district	\N
760	district	\N
761	district	\N
762	district	\N
763	district	\N
764	district	\N
765	district	\N
766	district	\N
767	district	\N
768	district	\N
769	district	\N
770	district	\N
771	district	\N
772	district	\N
773	district	\N
774	district	\N
775	district	\N
776	district	\N
777	district	\N
778	district	\N
779	district	\N
780	district	\N
781	district	\N
782	district	\N
783	district	\N
784	district	\N
785	district	\N
786	district	\N
787	district	\N
788	district	\N
789	district	\N
790	district	\N
791	district	\N
792	district	\N
793	district	\N
794	district	\N
795	district	\N
796	district	\N
797	district	\N
798	district	\N
799	district	\N
800	district	\N
801	district	\N
802	district	\N
803	district	\N
804	district	\N
805	district	\N
806	district	\N
807	district	\N
808	district	\N
809	district	\N
810	district	\N
811	district	\N
812	district	\N
813	district	\N
814	district	\N
815	district	\N
816	district	\N
817	district	\N
818	district	\N
819	district	\N
820	district	\N
821	district	\N
822	district	\N
823	district	\N
824	district	\N
825	district	\N
826	district	\N
827	district	\N
828	district	\N
829	district	\N
830	district	\N
831	district	\N
832	district	\N
833	district	\N
834	district	\N
835	district	\N
836	district	\N
837	district	\N
838	district	\N
839	district	\N
840	district	\N
841	district	\N
842	district	\N
843	district	\N
844	district	\N
845	district	\N
846	district	\N
847	district	\N
848	district	\N
849	district	\N
850	district	\N
851	district	\N
852	district	\N
853	district	\N
854	district	\N
855	district	\N
856	district	\N
857	district	\N
858	district	\N
859	district	\N
860	district	\N
861	district	\N
862	district	\N
863	district	\N
864	district	\N
865	district	\N
866	district	\N
867	district	\N
868	district	\N
869	district	\N
870	district	\N
871	district	\N
872	district	\N
873	district	\N
874	district	\N
875	district	\N
876	district	\N
877	district	\N
878	district	\N
879	district	\N
880	district	\N
881	district	\N
882	district	\N
883	district	\N
884	district	\N
885	district	\N
886	district	\N
887	district	\N
888	district	\N
889	district	\N
890	district	\N
891	district	\N
892	district	\N
893	district	\N
894	district	\N
895	district	\N
896	district	\N
897	district	\N
898	district	\N
899	district	\N
900	district	\N
901	district	\N
902	district	\N
903	district	\N
904	district	\N
905	district	\N
906	district	\N
907	district	\N
908	district	\N
909	district	\N
910	district	\N
911	district	\N
912	district	\N
913	district	\N
914	district	\N
915	district	\N
916	district	\N
917	district	\N
918	district	\N
919	district	\N
920	district	\N
921	district	\N
922	district	\N
923	district	\N
924	district	\N
925	district	\N
926	district	\N
927	district	\N
928	district	\N
929	district	\N
930	district	\N
931	district	\N
932	district	\N
933	district	\N
934	district	\N
935	district	\N
936	district	\N
937	district	\N
938	district	\N
939	district	\N
940	district	\N
941	district	\N
942	district	\N
943	district	\N
944	district	\N
945	district	\N
946	district	\N
947	district	\N
948	district	\N
949	district	\N
950	district	\N
951	district	\N
952	district	\N
953	district	\N
954	district	\N
955	district	\N
956	district	\N
957	district	\N
958	district	\N
959	district	\N
960	district	\N
961	district	\N
962	district	\N
963	district	\N
964	district	\N
965	district	\N
966	district	\N
967	district	\N
968	district	\N
969	district	\N
970	district	\N
971	district	\N
972	district	\N
973	district	\N
974	district	\N
975	district	\N
976	district	\N
977	district	\N
978	district	\N
979	district	\N
980	district	\N
981	district	\N
982	district	\N
983	district	\N
984	district	\N
985	district	\N
986	district	\N
987	district	\N
988	district	\N
989	district	\N
990	district	\N
991	district	\N
992	district	\N
993	district	\N
994	district	\N
995	district	\N
996	district	\N
997	district	\N
998	district	\N
999	district	\N
1000	district	\N
1001	district	\N
1002	district	\N
\.


--
-- Data for Name: location_address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.location_address (id, location_id, address_id) FROM stdin;
\.


--
-- Data for Name: location_district; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.location_district (id, location_id, district_id) FROM stdin;
1	4	13
2	8	14
3	11	1
4	23	3
5	24	14
6	12	15
7	13	16
8	14	17
9	27	13
10	28	14
11	15	18
12	16	19
13	17	20
14	31	15
15	30	15
16	20	21
17	19	22
18	18	23
19	21	24
20	33	1
21	32	8
22	8	25
23	22	26
24	35	12
25	37	21
26	36	17
27	38	21
28	25	27
29	39	1
30	26	28
31	41	11
32	42	21
33	44	15
34	45	26
35	46	1
36	47	1
37	48	11
38	29	29
39	49	17
40	50	21
41	51	21
42	52	15
43	53	21
44	54	8
45	56	1
46	55	8
47	57	21
48	58	21
49	59	15
50	60	1
51	24	17
52	61	21
53	62	8
54	12	17
55	63	15
56	64	15
57	65	24
58	40	30
59	13	21
60	66	15
61	67	30
62	14	8
63	69	21
64	43	31
65	68	15
66	70	17
67	71	1
68	15	21
69	72	21
70	16	21
71	73	1
72	74	21
73	75	15
74	17	1
75	76	17
76	78	3
77	77	21
78	79	15
79	30	21
80	31	21
81	81	1
82	20	1
83	80	21
84	18	17
85	19	1
86	83	15
87	82	15
88	21	11
89	85	21
90	84	1
91	86	11
92	88	14
93	8	1
94	89	15
95	90	21
96	91	15
97	92	1
98	23	32
99	93	15
100	36	1
101	37	17
102	38	17
103	25	17
104	94	8
105	96	15
106	39	3
107	97	21
108	95	8
109	26	8
110	98	21
111	99	15
112	41	13
113	100	17
114	101	17
115	102	30
116	42	17
117	103	15
118	104	8
119	44	21
120	105	8
121	106	15
122	107	17
123	110	21
124	111	15
125	48	3
126	109	1
127	108	15
128	112	21
129	29	17
130	49	1
131	113	21
132	114	17
133	51	17
134	50	17
135	115	1
136	116	15
137	52	21
138	53	17
139	117	15
140	118	17
141	119	17
142	55	26
143	120	21
144	57	1
145	33	33
146	87	34
147	121	8
148	35	35
149	122	1
150	58	17
151	59	21
152	123	21
153	126	17
154	127	15
155	24	1
156	61	1
157	130	21
158	129	15
159	131	15
160	132	21
161	63	17
162	134	15
163	137	17
164	138	21
165	136	17
166	139	1
167	66	21
168	69	17
169	68	13
170	140	17
171	141	17
172	142	1
173	144	21
174	143	8
175	145	15
176	147	15
177	71	33
178	148	15
179	146	21
180	47	36
181	72	17
182	16	17
183	73	3
184	75	21
185	149	21
186	74	17
204	21	1
210	86	26
213	89	17
222	161	15
228	165	15
232	166	21
233	38	10
239	12	43
244	65	45
248	13	46
256	174	17
262	178	15
280	115	3
287	182	37
304	122	3
309	123	17
322	131	21
338	206	11
340	140	8
356	216	15
362	73	32
370	79	46
374	77	8
382	21	8
393	90	11
396	158	17
403	160	5
407	161	33
410	164	11
412	165	21
414	229	15
420	64	51
424	135	13
429	232	21
448	105	13
468	53	32
474	119	3
480	240	15
486	189	21
494	122	32
503	196	1
513	128	53
524	204	21
529	136	37
533	66	24
541	209	8
557	148	33
563	75	8
570	152	11
578	20	54
597	89	11
619	228	21
626	276	15
634	281	15
644	169	1
653	234	17
661	179	3
673	112	37
683	286	15
686	183	17
701	192	13
710	247	21
727	251	17
734	131	11
742	138	3
752	256	37
765	215	46
774	75	3
784	30	3
791	83	8
799	262	17
814	267	38
821	226	32
828	225	24
832	273	17
840	229	38
894	241	1
905	59	3
911	315	12
915	196	37
922	249	11
927	316	21
933	297	1
955	141	32
961	212	1
966	216	11
974	146	8
983	153	8
995	262	1
1001	90	33
1007	158	8
1015	324	17
1025	162	13
1034	278	13
1047	232	8
1076	286	46
1081	240	17
1090	288	17
1101	58	37
1123	130	26
1130	131	33
1146	210	33
1172	219	13
1177	321	1
1182	264	35
1186	304	17
1189	324	8
1198	162	51
1207	308	33
1220	326	13
1237	52	1
1242	181	8
1253	189	8
1263	312	35
1274	247	24
1281	198	45
1287	296	1
1294	131	8
1304	211	37
1324	83	5
1334	262	32
1337	321	33
1341	322	24
1344	305	8
1353	225	3
1357	333	21
1371	231	35
1381	236	13
1391	181	32
1397	240	11
1405	190	30
1410	241	32
1418	246	10
1428	316	30
1433	297	35
1445	204	51
1451	215	31
1471	339	8
1474	320	8
1481	322	1
1496	93	37
1517	183	8
1526	349	17
1530	350	8
1535	289	30
1540	246	1
1545	365	15
1552	295	10
1569	147	38
1581	353	11
1593	89	45
1600	323	8
1609	308	35
1620	15	3
1633	240	1
1644	189	12
1663	351	1
1672	212	51
1683	353	31
1707	333	24
1720	52	32
1729	240	33
1741	185	35
1753	58	51
1762	365	8
1770	214	8
1778	354	13
1782	388	17
1800	159	3
1816	394	1
1828	382	46
1849	247	3
1854	127	32
1872	401	45
1888	391	17
1900	159	32
1910	357	32
1924	382	17
1937	330	30
1951	215	45
1978	390	51
1983	408	11
1985	393	37
1992	89	55
187	150	21
196	154	21
209	84	3
231	93	21
243	95	26
253	171	17
267	110	17
274	112	17
285	52	46
292	120	11
299	186	17
301	121	45
303	191	24
307	58	1
316	24	8
319	200	8
326	132	17
331	138	1
339	208	15
349	212	15
358	148	1
364	149	17
380	20	32
402	227	21
408	199	51
426	169	11
433	170	21
443	176	17
452	111	1
465	51	35
469	239	15
477	120	1
484	188	8
491	191	11
502	123	24
507	197	1
512	250	15
516	202	8
523	97	17
531	253	45
540	140	50
547	212	21
551	71	32
562	73	35
569	79	17
584	82	8
586	84	54
600	158	1
633	38	33
638	135	41
647	170	46
657	283	17
674	237	1
705	193	17
718	248	1
735	201	17
756	140	37
762	212	17
773	16	13
798	218	37
801	157	8
806	265	11
818	159	17
836	278	38
841	309	24
851	231	3
858	99	8
861	234	1
866	177	1
872	236	33
881	113	3
891	240	46
895	287	33
898	190	11
903	312	1
909	58	32
914	123	8
930	130	13
937	97	1
944	138	32
950	208	37
958	258	46
975	79	31
997	303	33
1008	264	3
1014	305	17
1022	161	55
1028	273	1
1038	166	8
1050	13	31
1060	44	51
1072	52	31
1078	19	13
1080	183	11
1084	327	33
1099	331	37
1112	249	1
1137	204	38
1154	216	1
1174	262	3
1179	90	8
1184	158	30
1191	227	30
1194	161	35
1200	228	45
1210	166	32
1213	281	17
1224	233	8
1228	283	35
1259	288	1
1267	313	32
1276	292	31
1288	297	32
1295	205	41
1299	207	8
1318	79	32
1350	159	31
1359	228	37
1370	282	41
1396	348	1
1406	330	17
1412	331	41
1423	293	51
1434	298	38
1442	252	31
1448	212	37
1453	217	51
1464	31	51
1476	321	37
1485	324	13
1492	228	38
1497	281	11
1501	13	8
1505	235	31
1512	238	31
1531	189	32
1536	288	8
1549	293	41
1558	299	35
1562	204	41
1572	366	46
1583	354	37
1586	356	54
1590	320	30
1599	322	8
1607	333	17
1619	357	17
1630	359	17
1638	335	24
1649	241	5
1657	198	13
1664	336	8
1680	145	8
1701	159	8
1706	277	35
1737	335	11
1744	242	32
1751	246	8
1769	210	5
1776	352	32
1798	342	51
1804	165	37
1808	333	11
1820	381	3
1827	240	8
1829	383	3
1830	372	3
1839	386	21
1845	189	5
1848	246	3
1855	295	3
1865	214	3
1891	393	3
1899	304	13
1908	15	45
1934	386	17
1959	258	3
1972	387	35
1975	405	32
1993	90	54
2000	333	1
2008	183	26
2045	241	54
2051	365	13
2059	145	5
188	78	32
194	30	17
203	18	1
212	156	21
237	96	30
241	39	32
246	169	21
258	44	17
261	177	21
268	111	31
273	180	46
279	51	1
283	53	1
289	119	1
293	57	3
295	185	21
298	189	15
313	198	15
321	202	17
333	136	30
344	210	15
347	211	15
359	47	12
367	74	11
372	30	1
401	159	21
415	166	17
419	96	37
428	98	1
435	101	8
441	68	52
444	177	17
456	108	11
467	116	17
471	182	13
496	193	21
500	246	15
511	24	37
515	130	8
518	201	21
525	138	33
530	205	8
537	208	1
543	141	33
554	216	21
558	16	33
566	146	1
573	77	32
577	155	13
591	262	21
598	265	24
602	268	21
608	91	5
617	164	1
622	277	1
628	279	30
639	231	11
656	176	11
664	175	46
670	285	1
678	113	33
689	185	11
704	59	8
713	245	17
719	249	17
738	97	11
745	299	21
748	66	11
755	141	3
764	71	38
770	213	1
775	150	45
783	76	35
789	260	26
802	303	1
808	89	1
815	269	11
830	164	8
839	280	33
848	281	21
860	233	11
867	44	13
873	175	17
886	286	21
913	313	21
917	195	37
923	294	1
935	129	3
941	252	17
946	318	17
952	255	26
959	211	1
963	215	17
970	150	13
977	74	35
988	319	1
992	219	11
998	320	21
1003	222	37
1010	266	8
1013	269	26
1021	272	26
1027	228	8
1048	98	30
1054	234	32
1062	283	37
1067	111	35
1069	238	17
1073	113	32
1087	330	15
1103	194	13
1116	293	38
1121	316	11
1127	129	54
1140	207	33
1148	212	33
1152	147	8
1157	75	37
1163	30	12
1167	21	54
1176	303	3
1188	305	11
1196	225	8
1203	274	35
1223	170	11
1227	177	13
1231	108	32
1235	116	37
1240	286	17
1249	328	46
1265	244	1
1270	246	11
1286	130	35
1291	251	37
1301	204	55
1306	212	32
1309	147	37
1316	148	35
1319	30	5
1321	154	26
1327	337	17
1329	339	17
1333	220	33
1336	303	12
1340	342	15
1347	324	37
1352	270	32
1354	162	41
1361	308	30
1365	229	41
1374	13	33
1384	116	5
1389	286	24
1399	349	15
1413	244	8
1417	313	37
1425	198	37
1430	127	1
1435	97	35
1439	336	17
1473	220	8
1482	304	1
1491	333	46
1513	239	8
1518	358	8
1527	185	32
1541	313	5
1547	198	5
1551	127	33
1557	336	1
1565	208	51
1570	216	3
1597	304	33
1612	344	32
1623	239	3
1627	181	26
1631	370	17
1648	288	3
1659	365	17
1667	298	41
1677	147	13
1689	377	15
1696	89	37
1702	323	13
1718	357	1
189	76	1
226	164	21
230	37	24
235	133	41
242	168	21
257	104	13
263	179	11
269	15	47
275	29	1
282	116	21
288	118	8
291	184	21
318	130	17
324	203	30
328	97	48
345	142	8
348	143	37
360	16	1
371	152	17
378	154	17
386	84	32
389	219	21
395	221	11
418	38	1
423	39	35
446	179	31
453	15	17
459	29	8
466	113	1
475	181	17
479	57	32
495	59	1
499	194	17
506	126	37
514	251	21
522	252	21
528	134	8
536	256	1
553	215	21
560	48	54
576	154	1
582	83	1
585	85	37
588	219	17
593	157	1
601	266	17
604	269	24
616	162	5
630	280	1
632	93	1
645	13	24
651	171	37
658	177	11
665	15	24
676	238	21
682	119	32
698	289	21
703	290	17
715	126	13
721	294	17
728	295	15
740	204	1
751	139	30
761	258	21
766	147	1
771	145	17
776	146	33
780	152	1
804	90	1
811	264	33
826	271	33
831	228	17
835	277	33
842	308	15
855	282	38
868	178	37
875	108	33
878	29	32
884	52	11
892	185	1
897	288	21
902	244	24
916	247	46
926	127	24
929	317	8
939	132	37
947	139	35
953	256	38
973	106	56
980	154	37
990	301	26
991	302	45
993	218	35
999	321	15
1012	323	21
1016	159	24
1035	280	3
1043	281	46
1049	282	13
1058	176	32
1065	108	3
1075	117	32
1082	185	33
1089	242	24
1092	311	11
1095	290	32
1107	196	35
1113	294	8
1126	251	8
1133	299	1
1162	79	1
1169	83	37
1170	319	33
1202	165	8
1234	285	35
1239	239	1
1280	332	21
1293	336	21
1302	208	55
1307	258	24
1330	340	15
1342	89	32
1364	93	32
1372	310	32
1385	285	54
1392	117	35
1395	347	13
1411	291	26
1438	131	3
1444	66	32
1450	258	11
1454	216	8
1460	79	37
1463	83	13
1475	303	35
1490	165	32
1500	310	30
1508	357	21
1515	117	51
1539	193	13
1546	292	26
1564	212	35
1571	214	1
1588	220	3
1595	90	12
1602	343	30
1634	372	21
1640	349	1
1645	330	1
1658	249	30
1688	376	21
1705	228	26
1709	93	35
1717	116	35
1724	238	33
1728	371	21
1731	382	15
1736	361	32
1740	349	33
1757	198	26
1766	207	35
1771	147	35
1786	376	17
1795	321	35
1803	323	26
1813	116	51
1825	371	17
1838	398	17
1844	328	3
1856	131	38
1871	400	15
1873	402	15
1875	403	15
1885	376	1
1889	408	21
1902	13	45
1907	170	32
1916	239	13
1931	414	15
1933	398	8
1943	246	32
1948	201	41
1956	210	35
1981	420	8
1996	13	37
190	151	21
198	153	21
202	19	33
211	8	32
234	167	5
254	42	1
264	105	37
270	48	32
276	114	8
297	187	17
300	190	21
308	194	21
315	127	21
317	61	32
323	129	21
335	139	33
343	69	1
354	215	15
366	72	1
376	155	8
385	18	32
390	220	21
400	91	33
438	234	21
454	110	26
462	114	13
504	195	1
519	63	32
527	137	12
535	254	21
542	210	21
556	213	17
571	30	33
587	261	1
592	156	11
610	271	1
625	274	1
643	282	37
649	101	37
654	235	21
660	284	26
669	106	38
672	180	31
677	116	1
681	117	1
685	181	24
692	187	8
697	288	15
700	191	26
712	196	30
717	197	37
725	127	17
732	298	15
741	132	8
760	143	13
767	214	46
781	74	32
787	31	3
794	300	1
797	219	24
805	156	8
812	268	11
822	227	11
833	165	1
846	93	33
849	12	13
853	65	26
865	176	1
879	238	46
885	117	33
896	242	17
901	311	21
906	193	1
921	248	8
925	293	37
956	210	1
962	147	33
968	217	3
976	152	32
981	30	32
986	21	35
996	157	30
1023	271	3
1030	277	3
1041	230	3
1056	235	17
1064	236	37
1097	193	33
1111	248	32
1131	97	8
1136	134	13
1141	208	5
1153	213	12
1164	154	13
1175	320	17
1181	268	8
1185	266	32
1193	270	8
1205	277	32
1215	310	3
1238	29	13
1250	329	51
1255	190	8
1260	59	51
1268	314	1
1273	245	8
1283	316	31
1315	75	13
1320	80	54
1346	323	11
1360	276	32
1369	230	30
1377	99	13
1400	185	3
1404	242	33
1422	292	8
1437	251	13
1441	299	30
1447	211	54
1458	214	31
1467	354	15
1469	338	8
1480	342	1
1493	277	30
1499	231	54
1506	236	35
1511	52	8
1520	348	8
1524	335	17
1525	362	21
1537	241	37
1542	58	35
1561	252	1
1567	258	31
1575	79	54
1592	321	38
1605	228	13
1611	281	31
1614	170	33
1635	373	21
1641	185	26
1656	245	26
1660	127	8
1668	207	12
1693	369	21
1697	342	32
1703	165	30
1712	170	8
1719	380	21
1735	360	51
1742	386	15
1747	193	35
1756	332	10
1768	215	32
1773	366	31
1774	145	3
1785	355	54
1815	357	3
1826	370	26
1833	361	35
1850	241	26
1861	258	8
1868	216	37
1883	390	1
1895	410	17
1903	175	32
1911	52	45
1917	238	3
1920	371	1
1927	396	5
1946	415	37
1953	365	45
1958	416	21
1987	369	24
1991	304	26
2016	424	21
2021	427	21
2023	412	21
2026	382	11
2037	386	1
2064	418	1
2067	403	37
2074	435	17
2089	13	5
2098	52	5
191	79	21
197	155	17
206	82	17
214	157	21
216	158	21
220	124	38
223	125	39
238	64	42
250	102	38
259	176	21
271	109	3
281	50	1
284	117	21
302	192	17
312	197	17
327	134	1
353	173	50
361	217	21
404	225	21
421	12	38
427	231	21
432	13	17
437	171	1
442	44	1
450	106	5
461	238	15
470	117	17
478	183	21
483	242	15
489	121	13
493	244	21
498	247	15
509	249	21
538	257	13
550	214	21
565	74	8
575	31	33
603	267	37
605	224	1
612	272	24
624	278	1
636	12	53
641	98	8
650	42	26
655	44	37
662	236	1
680	52	24
688	240	21
693	186	30
720	293	15
736	63	35
772	217	8
782	77	13
788	80	3
813	266	1
817	306	5
829	162	38
834	275	26
845	310	1
863	171	38
883	237	32
890	183	24
899	289	46
918	245	24
936	131	1
954	140	13
964	214	17
967	145	24
994	220	10
1004	89	33
1011	267	41
1020	224	35
1026	164	3
1032	274	37
1042	310	33
1055	170	24
1070	116	8
1074	239	11
1100	291	31
1104	313	17
1114	197	13
1119	332	15
1128	298	30
1135	205	38
1138	66	33
1144	69	13
1149	215	24
1159	150	26
1165	80	35
1171	300	32
1183	322	17
1199	273	8
1218	282	51
1225	176	26
1232	236	38
1241	19	35
1244	183	1
1252	242	1
1257	311	8
1266	58	38
1272	195	13
1278	293	13
1292	97	32
1298	299	32
1310	217	35
1343	266	35
1356	164	35
1362	277	12
1378	175	31
1383	345	15
1390	19	41
1394	346	32
1431	317	13
1443	207	3
1449	210	32
1456	75	26
1462	352	21
1498	344	3
1502	170	1
1507	108	35
1521	240	31
1532	364	17
1550	332	24
1559	131	32
1577	30	55
1594	303	54
1615	236	51
1624	286	31
1639	362	46
1671	258	1
1679	366	11
1681	30	35
1685	368	11
1699	322	30
1713	175	8
1734	373	17
1743	328	33
1749	364	26
1760	201	54
1764	374	11
1784	389	8
1793	379	17
1799	322	26
1810	175	3
1817	52	12
1836	362	11
1847	399	1
1853	201	51
1860	215	12
1866	366	30
1877	368	3
1879	375	1
1884	389	30
1898	90	35
1904	235	3
1921	411	3
1922	412	15
1928	335	1
1938	288	5
1944	241	35
1950	295	32
1960	366	54
1962	145	37
1964	400	1
1968	403	30
1970	368	32
1973	375	8
1977	389	37
1980	377	33
1982	391	31
1984	409	17
2003	286	3
2011	395	54
2029	396	51
2032	335	33
2041	330	37
2053	131	13
2058	214	12
2061	216	38
2079	391	1
2083	438	21
2088	410	32
2099	15	5
2109	421	17
2133	288	13
192	77	17
201	20	3
224	162	15
240	135	44
252	101	1
266	175	15
277	49	8
286	181	21
306	193	15
311	196	15
320	201	15
329	137	1
334	205	17
337	66	17
342	141	1
351	213	21
365	146	17
392	89	24
406	92	32
416	230	21
425	65	37
431	233	21
434	100	8
440	174	1
451	175	21
458	237	21
464	50	33
473	52	17
485	187	1
488	190	46
501	245	21
510	127	46
517	131	17
534	139	8
544	144	37
548	258	15
559	47	35
567	150	8
580	260	24
595	263	1
606	159	46
611	226	3
615	92	35
623	37	26
635	96	51
640	65	13
666	111	3
684	184	1
694	242	21
706	58	8
731	297	17
739	252	46
750	207	17
759	69	32
778	72	32
792	21	26
809	304	15
816	305	21
838	274	33
843	166	1
852	232	1
874	15	11
882	239	17
889	184	8
912	246	17
919	197	38
938	201	33
943	299	17
948	66	1
957	69	37
979	77	26
1000	265	26
1005	268	31
1017	227	1
1036	229	13
1040	325	13
1046	65	51
1057	174	13
1066	15	31
1079	184	26
1085	189	33
1093	289	11
1102	314	17
1110	247	17
1118	127	11
1143	141	35
1150	71	54
1156	145	11
1166	31	35
1197	164	32
1209	229	51
1217	231	30
1226	235	24
1246	240	24
1248	185	8
1261	291	8
1279	294	30
1290	201	30
1300	66	8
1305	210	8
1313	214	11
1323	31	54
1335	320	1
1339	268	30
1345	304	24
1348	161	51
1363	309	26
1375	233	3
1380	108	37
1387	52	33
1393	183	33
1398	335	21
1402	350	17
1407	289	1
1415	314	30
1420	245	32
1424	249	3
1426	332	17
1432	351	21
1440	138	54
1452	147	5
1459	146	35
1472	340	1
1479	89	12
1484	323	1
1487	159	1
1495	276	37
1504	175	1
1509	15	8
1516	181	13
1556	201	5
1568	215	8
1573	75	35
1578	367	24
1580	83	51
1582	319	35
1584	368	21
1587	339	37
1591	369	15
1601	159	33
1613	13	3
1618	235	1
1622	52	3
1626	183	3
1629	348	37
1652	246	33
1661	295	33
1666	131	12
1673	210	37
1676	214	33
1692	220	32
1694	90	13
1700	305	13
1711	281	1
1738	385	21
1739	362	24
1748	244	26
1761	336	30
1772	216	12
1780	387	17
1789	392	26
1792	220	37
1801	304	30
1806	277	54
1819	380	17
1823	183	37
1834	335	31
1841	185	54
1852	332	1
1857	198	35
1863	252	3
1867	147	51
1876	404	21
1893	379	1
1901	165	5
1912	380	33
1936	397	17
1947	247	32
1955	252	32
1965	417	1
1986	220	26
1998	175	12
2006	380	8
2038	397	33
2049	242	13
193	152	21
200	80	17
207	56	37
215	90	17
219	160	30
225	163	11
227	128	40
229	36	8
247	99	21
251	170	15
260	106	12
290	183	15
305	59	17
310	195	17
332	26	49
336	207	15
350	214	15
369	151	17
375	153	17
383	83	17
388	218	1
391	156	17
409	162	17
411	228	15
417	93	17
422	25	8
449	107	8
460	112	8
492	192	8
508	198	17
521	132	1
532	207	21
545	69	8
552	145	46
572	76	32
579	80	33
594	90	31
607	270	21
614	225	17
621	275	8
627	229	37
663	107	37
668	108	1
671	29	3
679	239	21
690	241	17
696	190	17
707	291	21
716	292	21
722	198	1
729	296	21
733	202	13
744	137	5
749	254	17
768	216	17
777	149	8
785	153	1
807	222	8
820	270	17
825	161	5
844	230	1
850	25	13
857	13	11
862	174	37
869	283	1
876	111	5
904	290	1
910	314	21
924	198	8
928	295	21
932	296	17
945	205	37
951	207	1
960	71	35
969	148	38
982	31	32
1002	156	26
1018	307	17
1024	225	1
1029	165	33
1033	309	30
1045	231	32
1063	175	24
1083	328	21
1088	241	33
1094	244	11
1106	246	24
1124	296	11
1129	201	32
1139	254	1
1145	211	3
1151	214	24
1158	148	13
1187	323	17
1204	276	8
1212	230	32
1221	232	35
1243	117	38
1256	241	8
1269	123	13
1275	197	41
1282	295	24
1289	298	37
1296	138	35
1303	254	26
1314	145	31
1317	146	32
1322	82	41
1325	319	3
1326	300	35
1338	90	3
1351	271	35
1367	281	24
1401	328	11
1403	189	3
1414	193	32
1427	295	11
1436	201	37
1446	208	35
1455	213	35
1468	355	21
1483	305	32
1488	225	32
1519	359	21
1528	328	31
1538	244	3
1543	247	31
1553	351	17
1560	207	32
1576	145	33
1585	355	11
1598	305	30
1604	225	37
1608	276	13
1637	361	33
1642	363	38
1646	242	3
1651	244	32
1655	313	13
1669	374	46
1682	352	1
1684	354	38
1687	355	32
1691	379	21
1695	321	13
1698	304	8
1704	225	13
1708	308	51
1715	310	35
1723	381	1
1727	370	8
1733	372	1
1746	330	33
1752	241	13
1763	131	37
1767	258	33
1777	353	8
1779	368	31
1781	375	17
1788	391	21
1794	369	46
1814	15	12
1822	238	8
1831	373	1
1842	242	37
1859	365	30
1880	388	1
1897	89	38
1905	333	31
1918	395	38
1930	413	21
1939	328	32
1949	131	55
1957	214	32
1976	388	8
1994	159	12
2014	423	1
2017	426	15
2019	371	32
2042	246	12
2055	127	30
2063	417	3
2093	159	45
2105	239	35
2111	425	21
195	31	17
205	83	21
208	85	17
217	91	1
218	159	15
221	92	3
265	107	1
272	108	46
346	144	1
352	145	21
357	147	21
368	150	11
379	80	1
384	82	1
387	85	1
399	223	17
430	99	17
439	235	15
447	236	15
482	241	21
497	58	33
526	26	26
546	143	38
555	147	17
561	217	17
568	72	3
574	153	11
583	19	38
589	218	33
599	222	1
609	227	17
613	161	12
620	165	17
631	230	11
637	25	37
642	232	17
646	99	1
652	174	30
659	178	33
687	57	35
691	189	17
695	287	1
699	243	33
702	244	17
708	194	1
714	195	8
723	24	13
730	130	32
737	129	33
743	134	37
747	253	26
753	208	50
757	210	17
763	211	31
769	148	37
779	79	11
786	154	8
790	82	37
796	302	8
800	220	11
803	263	12
819	224	33
824	272	1
856	169	32
864	235	46
870	107	13
877	285	3
880	116	33
888	19	55
893	189	1
900	243	37
908	194	8
931	251	1
940	204	37
972	72	35
985	82	38
1006	322	21
1031	276	1
1039	93	8
1051	326	24
1053	233	1
1061	177	8
1068	285	32
1098	312	33
1105	123	45
1108	195	38
1115	292	11
1120	295	17
1125	297	8
1134	138	30
1155	217	13
1161	72	54
1168	82	13
1173	220	1
1180	89	8
1192	224	51
1206	280	32
1211	93	3
1216	98	37
1222	99	37
1229	175	11
1233	15	1
1245	334	24
1247	335	15
1251	327	35
1262	193	8
1271	196	51
1285	317	37
1297	252	11
1308	215	11
1312	213	55
1328	338	17
1332	341	3
1355	273	32
1366	344	1
1376	170	31
1382	15	33
1388	238	11
1408	311	30
1419	58	13
1457	145	1
1465	353	46
1478	90	32
1503	233	32
1510	116	38
1523	361	1
1533	242	8
1544	245	13
1555	298	51
1563	66	12
1574	146	54
1579	352	17
1596	342	3
1606	277	55
1610	93	13
1616	310	26
1625	238	1
1632	371	15
1636	360	5
1647	364	8
1653	58	54
1662	332	11
1670	252	33
1675	216	32
1678	75	54
1710	13	32
1716	15	32
1722	239	32
1732	383	1
1759	127	3
1765	252	8
1775	30	54
1797	89	5
1802	225	26
1809	281	33
1821	239	37
1851	249	54
1862	207	54
1870	30	51
1878	387	1
1896	321	51
1914	394	33
1925	372	32
1932	362	31
1935	349	35
1941	399	33
1952	198	41
1990	321	41
1997	235	32
2002	52	37
2018	240	32
2028	373	35
2043	189	55
2052	215	37
2056	416	3
2073	389	38
2078	377	8
2082	409	24
2085	369	11
2092	235	12
2096	170	45
2112	424	17
2118	428	1
2127	414	37
2135	189	13
199	81	8
236	25	1
245	98	17
249	100	1
255	172	37
278	113	17
294	33	35
296	188	17
314	126	8
325	63	1
330	204	15
341	209	17
355	71	3
363	75	17
373	76	33
377	31	1
381	19	5
394	157	17
397	222	17
398	224	15
405	226	1
413	37	8
436	42	8
445	178	17
455	109	32
457	180	11
463	115	32
472	118	37
476	184	17
481	185	17
487	186	8
490	243	15
505	248	17
520	129	17
539	255	17
549	211	17
564	149	1
581	21	3
590	220	17
596	264	1
618	273	21
629	166	11
648	233	17
667	109	35
675	50	32
709	246	21
711	123	11
724	250	51
726	128	41
746	205	30
754	255	8
758	144	13
793	85	13
795	301	11
810	158	33
823	307	21
827	92	54
837	276	17
847	38	45
854	98	32
859	170	17
871	179	32
887	181	11
907	291	11
920	292	17
934	298	1
942	134	38
949	254	11
965	213	33
971	75	32
978	149	32
984	80	32
987	83	32
989	300	3
1009	304	21
1019	270	11
1037	308	1
1044	12	51
1052	99	32
1059	171	13
1071	29	37
1077	181	1
1086	329	30
1091	190	31
1096	59	32
1109	245	1
1117	198	3
1122	317	30
1132	252	24
1142	256	41
1147	258	17
1160	146	3
1178	222	13
1190	159	11
1195	271	12
1201	333	15
1208	309	45
1214	12	41
1219	13	1
1230	171	41
1236	238	24
1254	330	21
1258	289	31
1264	331	38
1277	249	8
1284	127	31
1311	216	33
1331	219	26
1349	343	17
1358	165	3
1368	98	26
1373	326	26
1379	235	11
1386	239	33
1409	288	33
1416	123	26
1421	247	11
1429	296	30
1461	30	38
1466	319	32
1470	356	3
1477	268	26
1486	343	8
1489	164	54
1494	308	38
1514	286	11
1522	360	15
1529	363	1
1534	330	11
1548	249	32
1554	97	54
1566	210	45
1589	340	51
1603	165	12
1617	175	33
1621	116	13
1628	117	41
1643	328	1
1650	193	26
1654	247	33
1665	201	38
1674	215	3
1686	375	21
1690	378	17
1714	235	33
1721	286	1
1726	359	26
1730	384	35
1750	288	32
1755	249	35
1787	377	17
1790	378	1
1807	13	12
1812	235	8
1818	286	33
1824	395	37
1837	397	15
1843	330	8
1858	374	31
1864	210	13
1882	406	8
1887	377	1
1890	409	21
1894	369	17
1906	281	8
1913	381	32
1919	240	3
1926	373	32
1929	385	1
1940	189	38
1945	332	33
1966	402	21
1988	379	8
1995	165	55
1999	281	3
2012	422	17
2015	425	15
2031	385	8
2034	413	17
2039	288	38
2044	399	35
2050	295	12
2062	400	37
2069	419	33
2071	434	30
1725	183	32
1745	189	37
1754	247	8
1758	295	8
1783	390	15
1791	393	15
1796	90	26
1805	228	51
1811	170	3
1832	396	15
1835	385	17
1840	349	38
1846	288	37
1869	145	32
1874	354	51
1881	405	11
1886	407	17
1892	220	13
1909	286	8
1915	183	13
1923	383	32
1942	242	38
1954	127	12
1961	147	41
1963	216	5
1967	418	17
1969	404	17
1971	419	1
1974	406	32
1979	407	8
1989	410	1
2004	15	37
2010	239	26
2025	383	35
2035	431	17
2046	332	8
2060	432	15
2065	402	17
2104	238	12
2110	423	33
2114	440	21
2128	413	8
2136	246	45
2144	252	13
2147	145	38
2174	410	35
2184	52	38
2194	239	54
2199	424	1
2201	440	17
2207	382	1
2214	413	3
2219	328	54
2225	247	37
2239	400	13
2259	453	17
2266	235	37
2271	175	5
2276	183	51
2282	421	8
2309	246	5
2321	214	5
2339	464	15
2344	451	3
2350	235	5
2357	159	38
2363	238	5
2382	382	32
2389	474	15
2393	448	26
2399	295	38
2402	127	38
2410	460	11
2429	369	32
2442	281	37
2450	425	37
2455	426	51
2473	335	37
2478	330	54
2493	460	32
2499	461	3
2502	377	5
2520	159	13
2536	471	13
2543	473	1
2557	488	1
2566	214	13
2583	477	13
2601	175	26
2605	281	38
2611	478	24
2615	472	8
2621	412	12
2628	480	8
2631	295	13
2656	409	26
2670	286	13
2695	447	54
2697	247	35
2705	214	35
2726	333	5
2747	412	35
2752	247	54
2758	215	41
2768	490	24
2785	175	51
2794	478	13
2809	127	51
2814	504	37
2838	333	55
2848	498	1
2854	499	8
2870	214	41
2885	467	13
2912	515	32
2920	511	8
2921	496	11
2940	523	15
2949	515	12
2955	516	8
2961	517	31
2966	519	1
2971	513	8
2990	467	51
2994	519	33
3006	502	37
3009	503	37
3039	526	33
3058	528	11
3076	529	31
3079	507	51
3085	508	35
3100	528	33
3131	528	3
3148	496	55
3154	535	3
3158	537	17
3165	529	13
3173	532	8
3181	528	35
3219	539	11
3239	541	11
3240	542	5
3241	543	51
3242	544	51
3243	545	38
3244	546	33
3245	547	13
3246	548	12
3247	549	15
3248	550	11
3249	551	57
3250	552	32
3251	553	51
3252	554	32
3253	555	1
3254	556	31
3255	557	37
3256	558	3
3257	559	26
3258	560	21
3259	561	11
3260	562	11
3261	563	11
3262	564	11
3263	565	11
3264	566	11
3265	567	3
3266	568	26
3267	569	32
3268	570	32
3269	571	11
3270	572	11
3271	573	12
3272	573	55
3273	574	11
3274	575	11
3275	576	11
3276	577	1
3277	578	31
3278	579	17
3279	580	11
3280	581	26
3281	582	12
3282	583	13
2001	170	12
2007	394	3
2009	238	32
2013	421	21
2020	411	32
2022	428	17
2027	372	13
2030	430	17
2033	414	17
2036	398	13
2047	415	38
2076	388	13
2097	333	33
2103	183	35
2120	371	37
2141	242	26
2150	416	32
2155	433	17
2164	377	3
2178	220	54
2197	423	32
2211	414	38
2230	215	38
2235	214	37
2251	437	8
2264	165	51
2267	159	5
2279	239	51
2285	425	1
2292	456	15
2324	400	35
2347	452	11
2366	421	37
2377	429	13
2397	247	38
2419	463	17
2425	464	17
2435	235	38
2444	175	55
2456	478	21
2463	473	17
2472	474	21
2490	400	41
2501	435	45
2508	466	8
2514	438	8
2530	469	35
2549	479	41
2558	246	13
2568	475	8
2573	482	17
2587	409	13
2593	235	13
2597	170	26
2636	332	53
2643	482	1
2652	465	37
2658	369	13
2664	170	35
2673	281	55
2677	456	8
2682	457	51
2687	458	37
2692	335	35
2700	258	26
2704	432	3
2708	482	8
2712	491	11
2734	444	13
2739	497	17
2740	498	17
2743	458	35
2750	499	1
2757	295	35
2764	482	37
2773	450	54
2777	170	51
2782	286	35
2788	497	1
2791	493	32
2797	485	35
2802	499	33
2815	510	17
2821	496	17
2832	235	51
2836	483	37
2841	497	3
2851	485	54
2856	486	35
2861	258	51
2864	127	41
2869	509	17
2882	465	41
2890	286	51
2897	505	1
2901	521	15
2915	509	1
2927	467	35
2931	519	17
2935	470	13
2945	508	1
2953	511	26
2958	490	13
2963	467	54
2977	514	17
2982	515	37
2987	512	32
3010	522	32
3013	496	33
3020	521	33
3030	503	5
3036	513	26
3040	508	37
3057	474	45
3063	507	35
3064	496	32
3075	528	31
3080	496	12
3087	526	30
3095	507	41
3102	508	51
3116	474	55
3132	533	35
3134	514	12
3146	536	24
3155	536	11
3164	528	37
3166	496	26
3172	514	5
3177	474	41
3187	514	55
3190	496	51
3196	496	41
2005	381	35
2024	429	21
2040	328	30
2048	247	12
2070	368	54
2077	420	30
2086	393	38
2091	89	53
2095	175	45
2102	380	30
2116	240	30
2129	335	8
2132	386	8
2139	415	13
2148	214	45
2154	417	32
2172	393	13
2180	170	37
2189	394	35
2196	421	11
2200	426	33
2202	445	33
2204	412	1
2220	330	13
2234	432	46
2243	433	1
2254	408	26
2284	454	1
2290	445	3
2303	413	26
2306	288	54
2319	127	5
2330	402	32
2340	465	15
2349	89	35
2360	468	15
2373	471	3
2378	445	35
2385	442	33
2428	409	32
2432	452	8
2438	333	12
2446	380	26
2458	240	35
2461	472	17
2469	458	17
2480	242	41
2485	127	55
2500	462	3
2507	464	1
2513	452	37
2518	467	17
2521	333	30
2528	15	35
2539	456	1
2542	484	11
2546	412	32
2555	335	13
2578	491	21
2580	463	1
2584	465	8
2602	52	54
2610	493	15
2616	484	3
2633	127	26
2640	489	1
2646	462	35
2649	435	13
2655	466	38
2661	483	1
2669	52	51
2675	425	51
2680	497	21
2690	474	24
2698	295	26
2707	459	30
2715	501	15
2721	235	35
2723	467	8
2728	52	41
2737	478	8
2756	246	54
2770	501	30
2776	369	35
2784	238	54
2798	502	17
2804	494	35
2813	509	15
2818	482	26
2823	511	21
2829	465	51
2833	467	38
2837	281	35
2842	456	13
2847	506	8
2852	502	1
2862	503	33
2874	516	21
2879	490	8
2884	501	38
2889	519	15
2898	513	17
2910	258	41
2933	505	8
2938	498	3
2962	525	15
2968	520	37
2985	496	1
2991	483	51
2995	333	54
3000	521	1
3004	498	30
3008	507	37
3037	333	41
3041	530	15
3046	503	55
3051	525	30
3066	531	8
3073	474	37
3078	530	1
3091	519	55
3101	533	1
3115	526	13
3123	530	13
3136	536	17
3145	535	33
3153	528	30
3160	474	54
3169	536	33
3178	535	38
3184	532	3
3188	538	1
3194	538	33
3200	538	30
3204	538	35
2054	252	37
2057	258	32
2066	433	15
2068	404	1
2080	437	17
2081	408	1
2090	165	35
2094	281	32
2101	394	32
2106	439	21
2113	426	1
2115	411	54
2138	247	45
2149	432	21
2152	400	38
2156	402	1
2162	443	1
2171	379	37
2177	235	45
2185	286	12
2195	422	37
2217	386	35
2238	216	35
2241	418	30
2244	402	8
2245	389	41
2249	420	26
2252	450	21
2255	409	1
2261	379	26
2270	170	5
2274	286	45
2283	423	12
2291	240	13
2295	429	30
2301	414	13
2310	448	33
2316	252	35
2320	432	17
2332	462	21
2333	443	32
2352	333	32
2364	439	1
2369	454	3
2388	413	51
2398	332	5
2405	432	24
2422	437	26
2433	89	54
2440	286	5
2451	439	8
2464	412	3
2476	448	35
2483	215	26
2492	475	1
2509	451	5
2515	235	55
2522	52	35
2532	425	13
2540	457	37
2550	447	8
2560	295	53
2564	145	51
2571	433	26
2588	451	35
2594	492	17
2600	468	35
2604	15	54
2609	439	26
2613	470	1
2618	473	8
2644	496	15
2662	492	8
2667	159	35
2696	480	37
2701	127	35
2703	332	13
2706	489	3
2714	500	24
2716	450	35
2733	15	41
2753	258	35
2759	432	32
2763	489	32
2766	496	46
2806	508	15
2828	466	41
2839	238	51
2845	493	51
2849	484	13
2859	514	15
2865	432	35
2872	504	38
2886	512	17
2895	456	35
2907	499	37
2914	522	21
2929	286	41
2936	506	38
2944	514	46
2951	509	33
2960	524	13
2969	505	37
2976	474	3
2992	525	17
2999	505	26
3018	333	51
3025	528	21
3038	521	8
3043	514	31
3056	514	1
3067	518	51
3084	533	17
3122	514	32
3135	535	1
3142	529	37
3174	496	35
3185	536	32
3193	514	13
3202	514	26
3207	514	35
3211	514	54
3215	514	51
3220	514	41
2072	405	54
2087	220	35
2100	286	32
2117	427	17
2124	442	15
2126	385	3
2131	328	35
2146	258	12
2166	391	3
2186	444	15
2223	332	32
2228	415	41
2232	127	37
2247	435	8
2287	426	37
2289	455	21
2298	442	1
2314	295	5
2338	450	17
2342	409	8
2356	15	13
2381	412	8
2391	189	51
2400	215	13
2413	461	33
2417	435	30
2426	466	1
2434	13	26
2437	170	55
2448	238	38
2453	470	17
2466	446	32
2471	480	15
2474	288	41
2481	295	55
2486	145	54
2489	481	37
2498	402	13
2503	463	11
2519	170	13
2525	175	13
2531	454	35
2535	478	17
2544	485	1
2548	442	38
2554	480	17
2559	247	13
2562	215	35
2570	459	33
2585	464	33
2591	438	37
2599	333	45
2617	485	33
2623	474	17
2634	215	54
2642	495	21
2654	464	8
2659	235	26
2671	15	51
2702	215	51
2722	170	54
2727	159	54
2736	470	32
2765	459	37
2767	491	1
2781	159	51
2790	470	37
2796	458	51
2807	258	54
2812	432	13
2816	214	51
2834	159	41
2855	507	17
2867	246	41
2878	496	24
2896	520	17
2908	507	1
2925	517	24
2939	521	21
2974	498	32
2993	527	24
3021	526	1
3027	474	12
3031	515	38
3033	518	8
3042	529	17
3050	518	13
3059	529	11
3071	508	13
3096	496	45
3105	529	33
3117	528	8
3126	532	24
3133	519	51
3138	496	38
3144	514	30
3149	537	21
3182	496	54
3192	537	32
3198	537	12
3203	537	30
3208	537	45
3212	537	37
3216	537	5
3223	537	38
3226	537	13
3230	537	35
3233	537	51
2075	436	21
2084	379	32
2107	395	51
2121	429	1
2125	396	41
2142	215	5
2160	435	1
2163	420	13
2168	409	11
2170	369	31
2175	165	54
2181	333	8
2192	439	17
2198	425	17
2206	429	8
2210	446	21
2213	447	21
2218	288	35
2226	295	37
2236	145	13
2253	391	26
2257	451	1
2272	15	55
2288	440	1
2305	335	32
2311	330	26
2315	242	54
2327	459	15
2335	463	21
2337	437	30
2351	467	15
2359	52	13
2362	444	17
2367	469	1
2375	456	21
2387	335	12
2392	246	38
2409	459	21
2414	476	17
2421	377	37
2423	450	1
2431	453	26
2436	467	21
2443	468	1
2465	382	35
2477	189	41
2479	247	55
2484	258	38
2491	432	1
2494	459	1
2506	465	17
2517	13	35
2524	468	33
2527	238	55
2533	439	13
2538	240	54
2541	472	1
2551	458	11
2563	127	13
2567	432	33
2572	402	51
2576	476	31
2590	452	55
2595	467	1
2603	286	55
2614	457	35
2619	446	13
2632	258	13
2638	432	8
2645	476	1
2648	491	17
2650	463	8
2657	452	13
2672	238	26
2674	444	5
2676	478	11
2681	498	21
2685	446	26
2709	495	35
2711	462	54
2718	464	32
2732	281	13
2746	474	11
2755	503	15
2769	500	30
2772	466	35
2779	333	38
2793	498	11
2799	474	31
2819	459	35
2825	500	26
2831	512	21
2846	470	5
2863	515	1
2873	459	51
2888	483	38
2904	502	8
2919	516	17
2923	490	37
2930	281	51
2942	484	54
2947	507	33
2964	483	35
2965	281	41
2975	508	33
3003	528	15
3017	527	11
3024	529	21
3048	507	13
3055	526	8
3062	515	13
3068	532	15
3082	531	3
3090	529	1
3093	535	15
3098	532	46
3104	474	38
3109	530	30
3111	532	17
3119	533	33
3141	537	15
3147	532	31
3152	514	45
3159	535	32
3183	537	8
3234	540	46
2108	422	8
2119	412	17
2122	382	31
2123	441	21
2130	397	8
2134	330	38
2143	131	35
2151	216	13
2157	403	51
2161	436	1
2167	408	3
2169	438	17
2176	89	13
2182	281	12
2203	240	37
2205	371	13
2208	441	17
2222	246	37
2227	131	51
2237	416	26
2242	417	35
2258	369	1
2262	393	51
2269	281	30
2278	238	37
2300	447	17
2312	332	37
2318	258	37
2323	216	54
2325	449	17
2328	460	21
2331	461	1
2343	369	33
2354	170	38
2361	380	13
2368	425	8
2372	455	17
2376	457	17
2380	473	21
2386	458	21
2396	242	51
2401	258	5
2408	475	17
2420	477	17
2427	451	37
2439	159	55
2459	456	17
2468	479	38
2487	214	55
2497	476	11
2504	450	33
2512	483	15
2545	446	30
2553	474	46
2561	258	55
2579	435	37
2582	450	3
2598	159	26
2625	447	32
2637	214	26
2641	461	35
2647	490	21
2665	333	37
2684	485	3
2691	499	15
2699	246	35
2724	13	41
2731	175	54
2742	484	37
2745	502	21
2754	127	54
2762	504	30
2771	464	37
2786	444	41
2795	484	55
2805	247	51
2811	246	51
2824	490	1
2830	170	41
2843	505	17
2853	474	1
2857	247	41
2875	489	54
2881	464	13
2891	281	54
2892	238	41
2900	470	38
2905	474	33
2906	514	21
2913	295	41
2918	332	41
2922	464	51
2948	503	32
2952	510	12
2956	496	31
2959	512	8
2967	333	35
2972	526	21
2979	507	8
2984	510	35
2986	490	26
2998	470	35
3007	514	24
3012	509	35
3029	507	38
3035	519	37
3045	528	17
3047	515	55
3052	521	32
3054	508	38
3060	503	51
3069	533	21
3083	532	21
3089	514	8
3097	531	32
3108	535	21
3110	531	12
3118	529	8
3127	496	5
3140	474	26
3156	532	1
3171	474	51
3175	529	26
3180	514	38
3191	532	32
3199	532	12
3206	532	30
3210	532	45
3213	532	37
3217	532	5
3221	532	38
3224	532	55
3227	532	13
3228	532	26
3231	532	35
3235	532	54
3237	532	51
3238	532	41
2137	332	3
2145	127	45
2165	437	1
2179	159	37
2188	380	37
2193	395	41
2209	442	17
2229	252	26
2256	438	24
2273	52	55
2280	439	11
2286	424	32
2294	412	33
2313	247	5
2341	466	15
2345	438	11
2355	175	38
2370	426	5
2394	397	51
2403	145	35
2407	400	51
2411	418	13
2418	443	51
2424	465	21
2430	438	1
2445	15	26
2449	469	33
2454	455	1
2467	447	1
2496	433	13
2505	477	8
2534	470	24
2547	382	54
2589	369	55
2607	444	32
2612	456	33
2620	442	55
2627	486	1
2630	247	26
2653	450	32
2660	438	35
2666	13	51
2679	470	8
2688	442	35
2693	494	3
2713	490	17
2719	466	13
2730	286	26
2735	456	32
2744	442	51
2748	486	32
2751	480	13
2761	214	54
2774	465	13
2778	467	37
2783	281	26
2789	456	37
2792	506	17
2803	507	15
2817	332	35
2822	491	3
2827	464	38
2866	295	51
2871	332	51
2877	511	17
2894	497	32
2899	506	37
2909	508	17
2917	504	13
2926	512	1
2934	520	8
2946	499	13
2950	522	17
2954	504	41
2970	470	26
2983	509	30
2988	518	11
2996	520	35
3001	526	17
3016	519	8
3026	502	13
3032	496	8
3034	525	32
3049	496	3
3065	521	37
3072	514	33
3077	515	41
3081	521	35
3088	528	1
3103	526	37
3107	519	13
3113	508	41
3120	519	35
3125	536	46
3129	526	26
3137	530	26
3151	529	38
3163	514	37
3170	528	13
3179	536	8
3197	535	51
2140	295	45
2153	418	8
2158	419	35
2159	389	51
2173	13	38
2183	175	37
2190	183	54
2216	397	37
2224	448	1
2246	436	32
2250	377	32
2263	13	55
2277	444	21
2296	382	8
2302	385	35
2307	397	13
2322	145	26
2329	433	8
2346	453	8
2358	286	37
2365	423	35
2371	470	21
2374	240	26
2383	446	1
2390	288	51
2404	216	51
2412	433	37
2416	462	1
2441	52	26
2452	454	12
2460	457	32
2470	442	37
2475	246	55
2488	216	41
2511	369	12
2523	286	38
2529	444	8
2537	455	32
2552	486	15
2575	490	15
2596	13	54
2624	494	1
2629	246	26
2635	145	41
2639	459	32
2651	377	51
2668	175	35
2678	493	1
2686	473	30
2694	486	33
2720	369	26
2729	238	35
2738	493	33
2741	485	32
2787	505	21
2801	412	51
2808	503	1
2844	513	21
2850	478	26
2860	508	21
2868	510	1
2880	517	46
2903	484	26
2911	503	3
2924	518	21
2928	483	13
2943	502	32
2957	518	17
2973	521	17
2980	503	12
3005	474	32
3014	518	1
3022	470	51
3053	519	5
3074	519	38
3092	534	51
3106	514	3
3114	496	37
3121	535	17
3128	474	13
3139	532	11
3157	496	13
3161	536	1
3167	537	11
3189	528	54
2187	15	38
2191	238	45
2212	385	32
2215	335	3
2221	189	35
2231	242	35
2233	258	45
2240	449	21
2248	443	33
2260	452	17
2265	89	26
2268	333	3
2275	380	38
2281	422	13
2293	457	15
2297	441	8
2299	446	11
2304	458	15
2308	189	54
2317	215	55
2326	418	37
2334	435	32
2336	377	45
2348	13	13
2353	281	45
2379	472	21
2384	447	11
2395	330	35
2406	214	38
2415	402	37
2447	444	1
2457	471	37
2462	429	26
2482	332	38
2495	482	21
2510	409	55
2516	89	51
2526	281	5
2556	487	11
2565	332	55
2569	489	21
2574	461	32
2577	462	32
2581	377	13
2586	466	37
2592	483	17
2606	238	13
2608	425	26
2622	458	1
2626	335	26
2663	467	33
2683	484	32
2689	412	37
2710	496	21
2717	465	38
2725	483	33
2749	494	32
2760	332	26
2775	235	54
2780	483	8
2800	486	37
2810	295	54
2820	489	35
2826	501	37
2835	286	54
2840	175	41
2858	494	54
2876	482	51
2883	518	15
2887	235	41
2893	333	13
2902	498	8
2916	510	32
2932	333	26
2937	513	1
2941	474	8
2978	502	30
2981	522	1
2989	517	30
2997	513	32
3002	508	8
3011	515	5
3015	525	1
3019	513	13
3023	508	32
3028	514	11
3044	474	30
3061	530	17
3070	526	32
3086	474	5
3094	530	8
3099	536	15
3112	536	21
3124	531	35
3130	529	32
3143	528	32
3150	474	35
3162	532	33
3168	535	37
3176	537	1
3186	535	13
3195	536	12
3201	536	30
3205	536	45
3209	536	37
3214	536	38
3218	536	55
3222	536	13
3225	536	26
3229	536	35
3232	536	51
3236	536	41
3283	584	17
3284	585	13
3285	586	13
3286	587	12
3287	588	17
3288	589	11
3289	590	17
3290	591	11
3291	592	13
3292	593	26
3293	594	3
3294	595	24
3295	596	3
3296	597	15
3297	598	15
3298	598	51
3299	599	15
3300	599	51
3301	600	12
3302	600	55
3303	601	1
3304	602	26
3305	603	17
3306	604	21
3307	605	11
3308	606	13
3309	607	31
3310	608	17
3311	609	1
3312	609	8
3313	609	32
3314	609	37
3315	609	13
3316	610	26
3317	611	11
3318	612	58
3319	613	1
3320	614	41
3321	615	38
3322	615	41
3323	616	41
3324	617	1
3325	618	24
3326	619	5
3327	620	1
3328	621	15
3329	622	3
3330	623	1
3331	624	37
3332	625	11
3333	626	15
3334	627	38
3335	628	38
3336	629	11
3337	630	1
3338	631	41
3339	632	46
3340	633	24
3341	634	24
3342	635	15
3343	636	12
3344	637	3
3345	638	3
3346	639	1
3347	641	54
3348	644	1
3349	645	24
3350	645	26
3351	646	11
3352	647	24
3353	647	26
3354	649	37
3355	651	3
3356	653	1
3357	654	11
3358	655	1
3359	656	54
3360	657	32
3361	658	32
3362	659	21
3363	660	8
3364	661	31
3365	662	37
3366	663	8
3367	664	31
3368	665	31
3369	666	3
3370	667	12
3371	668	37
3372	669	15
3373	670	54
3374	671	31
3375	672	51
3376	674	1
3377	675	31
3378	676	51
3379	677	12
3380	678	41
3381	679	21
3382	680	41
3383	681	11
3384	682	13
3385	683	31
3386	684	11
3387	685	13
3388	686	13
3389	687	1
3390	688	8
3391	689	8
3392	691	26
3393	692	21
3394	693	13
3395	694	11
3396	695	11
3397	696	8
3398	697	26
3399	698	3
3400	698	32
3401	699	26
3402	700	11
3403	701	11
3404	702	13
3405	703	11
3406	704	11
3407	705	37
3408	705	13
3409	706	12
3410	708	32
3411	709	54
3412	710	26
3413	711	41
3414	712	1
3415	713	31
3416	714	46
3417	715	37
3418	715	13
3419	716	32
3420	717	55
3421	718	5
3422	719	5
3423	720	8
3424	721	38
3425	722	46
3426	723	8
3427	724	31
3428	725	12
3429	726	21
3430	727	37
3431	728	21
3432	729	11
3433	732	8
3434	735	26
3435	737	17
3436	739	41
3437	740	13
3438	741	11
3439	744	24
3440	744	26
3441	745	31
3442	746	1
3443	747	3
3444	748	38
3445	749	17
3446	750	17
3447	751	8
3448	752	31
3449	753	31
3450	754	8
3451	755	32
3452	756	11
3453	757	11
3454	758	24
3455	759	8
3456	760	15
3457	760	51
3458	761	15
3459	761	51
3460	762	17
3461	762	37
3462	762	13
3463	763	46
3464	763	31
3465	764	31
3466	764	55
3467	766	26
3468	767	26
3469	768	46
3470	769	17
3471	770	26
3472	771	12
3473	772	11
3474	773	17
3475	774	13
3476	775	13
3477	776	45
3478	777	41
3479	778	5
3480	779	8
3481	780	12
3482	781	12
3483	782	38
3484	782	41
3485	783	1
3486	784	21
3487	785	24
3488	785	26
3489	786	41
3490	787	17
3491	788	17
3492	789	17
3493	790	11
3494	791	3
3495	792	8
3496	793	11
3497	794	13
3498	795	8
3499	796	12
3500	797	13
3501	798	8
3502	799	11
3503	800	8
3504	801	38
3505	802	26
3506	803	41
3507	804	41
3508	805	3
3509	805	32
3510	806	3
3511	806	32
3512	807	5
3513	808	26
3514	809	21
3515	810	8
3516	811	8
3517	812	8
3518	813	12
3519	814	21
3520	815	51
3521	816	11
3522	817	12
3523	818	8
3524	819	46
3525	820	26
3526	821	35
3527	822	13
3528	823	1
3529	824	26
3530	825	8
3531	826	11
3532	827	26
3533	828	1
3534	829	26
3535	830	38
3536	831	38
3537	832	13
3538	833	54
3539	834	13
3540	835	13
3541	836	8
3542	837	8
3543	838	8
3544	839	1
3545	840	41
3546	841	1
3547	842	8
3548	843	15
3549	844	1
3550	845	51
3551	846	41
3552	847	37
3553	848	31
3554	849	13
3555	850	1
3556	851	12
3557	852	17
3558	853	46
3559	854	11
3560	855	1
3561	856	11
3562	857	8
3563	858	1
3564	859	1
3565	860	8
3566	861	1
3567	862	24
3568	863	37
3569	864	1
3570	865	1
3571	866	46
3572	867	15
3573	868	1
3574	869	1
3575	870	1
3576	871	1
3577	872	37
3578	873	15
3579	874	59
3580	875	11
3581	876	32
3582	877	1
3583	878	1
3584	879	8
3585	880	24
3586	880	26
3587	881	24
3588	881	26
3589	882	24
3590	882	26
3591	883	37
3592	884	24
3593	885	11
3594	886	15
3595	887	31
3596	888	31
3597	889	3
3598	890	3
3599	891	41
3600	892	3
3601	893	3
3602	893	60
3603	894	31
3604	895	11
3605	896	46
3606	897	31
3607	898	13
3608	899	5
3609	900	11
3610	901	31
3611	902	26
3612	903	46
3613	904	46
3614	905	3
3615	906	13
3616	907	8
3617	908	11
3618	909	11
3619	910	51
3620	911	46
3621	912	11
3622	913	41
3623	914	32
3624	915	51
3625	916	51
3626	917	51
3627	918	41
3628	919	33
3629	920	33
3630	921	32
3631	922	57
3632	923	46
3633	924	55
3634	925	41
3635	926	32
3636	927	3
3637	928	3
3638	929	13
3639	930	11
3640	931	57
3641	932	3
3642	933	33
3643	934	8
3644	935	8
3645	936	1
3646	937	46
3647	938	11
3648	939	13
3649	940	31
3650	941	57
3651	942	26
3652	943	24
3653	944	3
3654	945	31
3655	946	8
3656	947	5
3657	948	1
3658	949	11
3659	951	1
3660	952	3
3661	953	3
3662	954	8
3663	955	46
3664	956	31
3665	957	15
3666	958	8
3667	959	37
3668	960	1
3669	961	11
3670	962	11
3671	963	3
3672	964	1
3673	965	1
3674	966	37
3675	967	3
3676	968	1
3677	969	12
3678	970	8
3679	971	31
3680	972	11
3681	973	21
3682	973	13
3683	974	46
3684	975	13
3685	976	37
3686	977	46
3687	978	46
3688	979	11
3689	980	11
3690	981	46
3691	981	11
3692	982	11
3693	983	46
3694	983	26
3695	984	57
3696	985	57
3697	986	11
3698	987	31
3699	988	26
3700	989	26
3701	990	3
3702	991	8
3703	992	13
3704	993	3
3705	994	3
3706	995	3
3707	996	8
3708	997	26
3709	998	46
3710	999	46
3711	1000	46
3712	1001	11
3713	1002	11
\.


--
-- Data for Name: location_postcode; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.location_postcode (id, location_id, postcode_id) FROM stdin;
\.


--
-- Data for Name: opportunity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opportunity (id, title, type, info, translation_type, info_confidential, created_at, updated_at, deal_id, agent_id) FROM stdin;
1	Begleitung zum Termin für schulärztliche Untersuchung im Gesundheitsamt Treptow	volunteering		deutsche		2025-11-01 20:51:17.401521	2025-11-01 20:51:17.401521	15	1
2	Hilfe beim Deutschlernen	volunteering	Das Sprachniveau ist sehr unterschiedlich – einige Bewohnerinnen sprechen schon recht gut Deutsch, andere haben geringe oder gar keine Kenntnisse. Es ist also eine gemischte Gruppe.    Grundsätzlich geht es darum, die Grundlagen der deutschen Sprache zu vermitteln und die Bewohnerinnen im Alltag sprachlich zu stärken.Besonders hilfreich wären feste Lernzeiten, Lehrmaterialien sowie Unterstützung durch Ehrenamtliche oder Lehrkräfte. \nEine begleitende Kinderbetreuung wäre ebenfalls wünschenswert, um die Teilnahme zu erleichtern.\nAls Raum steht aktuell der Aufenthaltsraum zur Verfügung. Die genaue Kapazität müsste bei Bedarf vor Ort abgestimmt werden.\nWir sind offen für beide Formate – Einzel- oder Gruppenunterricht.Das hängt davon ab, was möglich ist und wie viele Teilnehmende am Ende regelmäßig kommen.	noTranslation		2025-11-01 20:51:20.214413	2025-11-01 20:51:20.214413	423	2
3	Begleitung zur Radiologie	volunteering		deutsche		2025-11-01 20:51:20.427389	2025-11-01 20:51:20.427389	521	3
4	Begleitung zum Arzt	volunteering		deutsche		2025-11-01 20:51:20.490186	2025-11-01 20:51:20.490186	536	4
5	Begleitung zum Arzttermin	volunteering		deutsche		2025-11-01 20:51:20.506318	2025-11-01 20:51:20.506318	541	4
6	Begleitung zur Urologie	volunteering		deutsche		2025-11-01 20:51:20.53359	2025-11-01 20:51:20.53359	542	5
7	Begleitung zur Endokrinologie	volunteering		deutsche		2025-11-01 20:51:20.549013	2025-11-01 20:51:20.549013	543	5
8	Kinderphysiotherapie - Begleitung	volunteering		deutsche		2025-11-01 20:51:20.571394	2025-11-01 20:51:20.571394	544	6
9	Begleitung zum Besprechungstermin	volunteering		deutsche		2025-11-01 20:51:20.593648	2025-11-01 20:51:20.593648	545	7
10	Mitarbeit beim Basteln mit unserem Ehrenamtlichen Boris. Er ist ein Bastler mit Herz & Seele. (www.projekt-bastelbogen.de)	volunteering	Boris, der Bastler, hätte gerne einen bastelbegeisterten Menschen, der mit ihm eine kleine Gruppe von Kindern, max. 2-4, betreut, selbst mit bastelt und gerne mit Kindern arbeitet. Es reicht aus, wenn diese Person Schere und Lineal mitbringt. Die Tage und Uhrzeiten sind nicht festgelegt und können mit Boris und unserem Leitungsteam abgesprochen werden. Boris' Kontakt: b.voigt@posteo.de	noTranslation		2025-11-01 20:51:20.624631	2025-11-01 20:51:20.624631	546	8
11	Begleitung (Übersetzung) zur Schuldnerberatung	volunteering		deutsche		2025-11-01 20:51:20.652807	2025-11-01 20:51:20.652807	547	9
12	Russisch Dolmetschen beim Kardiologen	volunteering		deutsche		2025-11-01 20:51:20.681772	2025-11-01 20:51:20.681772	548	10
13	Sprachmittlung und Begleitung Deutsch Russisch MRT Termin	volunteering		deutsche		2025-11-01 20:51:20.702715	2025-11-01 20:51:20.702715	549	11
14	FrauenCafe	volunteering	Wir möchten in unserer Einrichtung einmal pro Woche ein Frauencafe (Sprachcafe) organisieren. Dafür suchen wir engagierte Freiwillige, die Freude am Gespräch haben und andere motivieren, mitzuerzählen. Gemeinsam wollen wir in entspannter Atmosphäre Deutsch sprechen, voneinander lernen und uns austauschen.	noTranslation		2025-11-01 20:51:20.746089	2025-11-01 20:51:20.746089	550	12
15	Wegbegleitung	volunteering		englishOk		2025-11-01 20:51:20.770658	2025-11-01 20:51:20.770658	551	13
16	Flinta Workshop zu Körper	volunteering	2 Stunden Sprachmittlung (dt. - türk.) in einem Flinta Workshop zu Körper, Gesundheit und Zyklus	noTranslation		2025-11-01 20:51:20.789431	2025-11-01 20:51:20.789431	552	7
17	Begleitung zur HNO	volunteering		deutsche		2025-11-01 20:51:20.804724	2025-11-01 20:51:20.804724	553	5
18	Begleitung zur Gastroenterologie	volunteering		deutsche		2025-11-01 20:51:20.820971	2025-11-01 20:51:20.820971	554	5
19	Russisch/Ukrainisch Dolmetscher*in im Virchow Klinikum	volunteering		deutsche		2025-11-01 20:51:20.841795	2025-11-01 20:51:20.841795	555	10
20	Freiwillige Helfer*innen gesucht für Sommerfest am 29.08. in der Aufnahmeeinrichtung	volunteering	Für unser Sommerfest am 29. August in der Aufnahmeeinrichtung am Blumberger Damm suchen wir noch freiwillige Helfer*innen! \n⏰ Zeit: 14:00 – 18:00 Uhr (inkl. Aufbau/Abbau)\nWir freuen uns über Unterstützung in folgenden Bereichen: \n- Hilfe bei Aufbau und Abbau (Pavillons, Tische, Technik etc.) \n- Essensausgabe\n- Musikalische Beiträge oder DJ ( ein großer Teufel Speaker ist vorhanden) \n- Betreuung bzw. Angebot von Sport- oder Spielangeboten \n- Durchführung von kreativen Workshops für Erwachsene (z. B. Basteln, Schreiben, Malen …) Falls ihr eigene Ideen habt – sehr gerne! 💬\nIch habe nur ein kleines Budget, aber falls Materialkosten anfallen sollten, können wir darüber natürlich sprechen. Wenn ihr Zeit und Lust habt, euch zu beteiligen, meldet euch gerne bei mir.	noTranslation		2025-11-01 20:51:20.871313	2025-11-01 20:51:20.871313	556	10
21	Sprachmittlung Deutsch Englisch für Behörde	volunteering		deutsche		2025-11-01 20:51:20.886202	2025-11-01 20:51:20.886202	557	11
22	Arzt Begleitung	volunteering		deutsche		2025-11-01 20:51:20.898957	2025-11-01 20:51:20.898957	558	6
23	Sprachmittlung für Beratungstermin zum Thema Sorgerecht	volunteering		deutsche		2025-11-01 20:51:20.925138	2025-11-01 20:51:20.925138	559	14
24	Familie bei Renovierungsarbeiten unterstützen (Streichen, spachteln etc.)	volunteering	Eine Familie unserer Unterkunft hat endlich eine Wohnung gefunden. Leider ist diese sehr renovierungsbedürftig und sie würden sich über jeden Helfenden Hand freuen.\nAb 06.08. brauchen sie Unterstützung. \nDer Mann arbeitet montags bis freitags tagsüber und kann auch nur abends leider an der Wohnung arbeiten. Die Arbeiten wären Spachtel- und Streichtätigkeiten. Falls Personen auch beim Bau ein Küche oder Aufbau helfen könnten, wäre das auch super. Die Frau spricht sehr gut englisch, gut deutsch und russisch als Muttersprache. Der Mann spricht sehr gut Deutsch und auch russisch als Muttersprache.	noTranslation		2025-11-01 20:51:20.958512	2025-11-01 20:51:20.958512	560	15
25	Unterstütze bei der Kinderbetreuung	volunteering	Wir suchen Freiwillige, die sich um die Kinder kümmern, mit ihnen spielen und eine schöne Zeit haben.	noTranslation		2025-11-01 20:51:20.976471	2025-11-01 20:51:20.976471	561	12
26	Unterstützung in der Kleiderkammer	volunteering	Wir suchen jemand für unsere Kleiderkammer (Spenden aussortieren und für die Bewohnenden zur Verfügung stellen). Das wäre mittwochs 11-13:00.	noTranslation		2025-11-01 20:51:21.000424	2025-11-01 20:51:21.000424	562	4
27	Klavierunterricht für Kinder,Kinderbetreuung im Jugendraum	volunteering	Wir haben einen Jugendraum vor kurzem und würden gerne paar Ehrenamtlichen haben,die Aktivitäten für Kinder anbieten.Auch haben wir auch paar Keyboards für Klavier und würden  uns freuen auf Freiwillige freuen,die im Bereich was machen wollen..	noTranslation		2025-11-01 20:51:21.026442	2025-11-01 20:51:21.026442	563	4
28	Organisiere Sportaktivitäten für Kinder	volunteering	Wir suchen Ehrenamtlichen für Sportaktivitäten für Kinder (Tischtennis oder Fußball).	noTranslation		2025-11-01 20:51:21.046957	2025-11-01 20:51:21.046957	564	4
29	Nachhilfeunterricht für Schulkinder	volunteering		noTranslation		2025-11-01 20:51:21.062407	2025-11-01 20:51:21.062407	565	4
30	Unterstützung für Gartenprojekt:Hochbeet	volunteering	Wir werden mit den Bewohnenden Hochbeet pflanzen.Dafür benötigen wir Unterstützung.Idealerweise Jemand der ein bisschen Erfahrung hat oder einfach Lust hat,zu unterstützen.	noTranslation		2025-11-01 20:51:21.087346	2025-11-01 20:51:21.087346	566	4
31	Arzt Begleitung	volunteering		deutsche		2025-11-01 20:51:21.103178	2025-11-01 20:51:21.103178	567	6
32	Kinderschminken und weiteres beim Sommerfest in Grünau	volunteering	Wir suchen nach Freiwilligen, die uns bei Kinderschminken unterstützen können. Falls es noch weitere Freiwillige gibt, die uns an diesem Tag unterstützen könnten, wäre das ebenfalls wunderbar.	noTranslation		2025-11-01 20:51:21.139754	2025-11-01 20:51:21.139754	568	16
33	Co-Leitung für Sprachcafe	volunteering	Es gibt schon eine erfahrene Freiwillige, die sich um die Planung des Sprachcafes kümmert. Wir suchen eine deutsche Muttersprachler:in, die Dienstag Nachmittags von 15-16:30 Zeit und Lust hat gemeinsam das Cafe zu betreuen. Keine Erfahrung im Unterrichten ist notwendig.	noTranslation		2025-11-01 20:51:21.155921	2025-11-01 20:51:21.155921	569	7
34	Kinderaktivitäten gestalten	volunteering	Wir brauchen dringend montags von 16-18 Uhr Freiwillige, die mit den Kindern im Garten spielen oder basteln während die Frauen an Workshops teilnehmen.	noTranslation		2025-11-01 20:51:21.178019	2025-11-01 20:51:21.178019	570	7
35	Frauencafé, Deutschkonversation	volunteering		noTranslation		2025-11-01 20:51:21.201884	2025-11-01 20:51:21.201884	571	17
36	Nachhilfe Grundschule	volunteering		noTranslation		2025-11-01 20:51:21.217134	2025-11-01 20:51:21.217134	572	17
37	Deutsch lernen und dabei Spaß haben	volunteering	Eine Gruppe von Jugendlichen möchte gerne ihr Deutsch verbessern und üben, und dabei auch Spaß haben. Gesucht wird eine Person, die mit den Jüngs und Mädels Deutsch sprechen möchte.	noTranslation		2025-11-01 20:51:21.243942	2025-11-01 20:51:21.243942	573	18
38	Bewegungsangebote und Tanzen	volunteering		noTranslation		2025-11-01 20:51:21.261484	2025-11-01 20:51:21.261484	574	17
39	Deutschunterricht für Erwachsene	volunteering		noTranslation		2025-11-01 20:51:21.277723	2025-11-01 20:51:21.277723	575	4
40	Unterstütze Bewohner*innen beim Deutschlernen in Lichtenberg	volunteering	Die Bewohner*innen einer Unterkunft in Lichtenberg wünschen sich Unterstützung beim Deutschlernen und bei der Verbesserung ihrer Deutschkenntnisse. Sie können sich ehrenamtlich engagieren, indem Sie eine Person mit Nachhilfeunterricht unterstützen, ein Sprachcafé für eine kleine Gruppe leiten oder an einem Sprachaustausch teilnehmen.	noTranslation		2025-11-01 20:51:21.29601	2025-11-01 20:51:21.29601	576	19
41	Begleitung und Sprachmittlung Sorani, Psychiatertermin	volunteering		englishOk		2025-11-01 20:51:21.310295	2025-11-01 20:51:21.310295	577	6
42	Sportfest in Marzahn-Süd	volunteering	Wir brauchen Unterstützung durch Freiwillige, die an verschiedenen Sportstationen helfen, die Namen der Kinder aufzuschreiben, die an bestimmten Sportstationen teilnehmen möchten, oder die Kinder zu der Sportart führen, die sie suchen.	noTranslation		2025-11-01 20:51:21.331272	2025-11-01 20:51:21.331272	578	20
43	Deutsch/Mathe Nachhilfe für neunte Klasse	volunteering	Wir suchen eine Person, die Einzelunterricht in Deutsch/Mathe geben könnte.	noTranslation		2025-11-01 20:51:21.355466	2025-11-01 20:51:21.355466	579	21
44	Begleitung zur Geburtsanmeldung	volunteering		deutsche		2025-11-01 20:51:21.372548	2025-11-01 20:51:21.372548	580	5
45	Unterstützung beim Sommerfest in Adlershof	volunteering	Wir suchen nach Freiwilligen, die uns beim Sommerfest unterstützen können.  Wir werden diesmal ohne Grill, aber mit Spielen für Kinder, Tanz und vielfältigem Essen aus verschiedenen Kulturen feiern.	noTranslation		2025-11-01 20:51:21.406604	2025-11-01 20:51:21.406604	581	22
46	Kinderbetreuung: Basteln, Malen, Sport usw.	volunteering	Es gibt Kinder, die auch Arabisch, Georgisch, Tigrinisch und Armenisch sprechen. Sie sind von 6 bis 12 Jahre alt and die Freiwilligen sollen den Kinderbetreuer*innen helfen. Die Kinderbetreuung findet bis 18:30 Uhr statt.	noTranslation		2025-11-01 20:51:21.438259	2025-11-01 20:51:21.438259	582	23
47	Organisiere unser Sprachcafé mit	volunteering	Mitorganisiere ein Sprachcafé für die Bewohner*innen der Unterkunft! Es findet immer donnerstags von 17 bis 19 Uhr statt.	noTranslation		2025-11-01 20:51:21.476336	2025-11-01 20:51:21.476336	583	24
48	Begleitung - Doltmescher/*inn (Deutsch-Ukrainisch/Russisch)	volunteering		noTranslation		2025-11-01 20:51:21.494373	2025-11-01 20:51:21.494373	584	9
49	Kleiderkammer für Männer	volunteering	Unterstütze eine Kleiderkammer (von 13 bis 15 Uhr) durch Sortieren und Ausgeben von Kleidung.	noTranslation		2025-11-01 20:51:21.510791	2025-11-01 20:51:21.510791	585	24
50	Kleiderkammer für Frauen und Kinder	volunteering	Unterstütze eine Kleiderkammer (von 13 bis 15 Uhr) durch Sortieren und Ausgeben von Kleidung.	noTranslation		2025-11-01 20:51:21.526974	2025-11-01 20:51:21.526974	586	24
51	Bücher für Kinder vorlesen in Reinickendorf	volunteering	In der Unterkunft gibt es eine kleine Bibliothek mit Büchern in verschiedenen Sprachen. Es werden Freiwillige gesucht, die gerne für oder mit den Kindern Bücher lesen.\nDer Zeitplan ist flexibel und kann individuell besprochen werden.	noTranslation		2025-11-01 20:51:21.541102	2025-11-01 20:51:21.541102	587	18
52	Begleitung zur Handchirugie	volunteering		englishOk		2025-11-01 20:51:21.566014	2025-11-01 20:51:21.566014	588	25
53	Unterstützung gesucht: Sommerfest am 22.08.2025 – Ehrenamtliche für Grillen, Kochen oder Kinderaktionen gesucht	volunteering	Hallo zusammen,  für unser Sommerfest am 22.08.2025 von 15–18 Uhr suchen wir engagierte Ehrenamtliche, die Lust haben, uns zu unterstützen – z. B. beim Grillen, Kochen oder mit Kinderaktionen wie Basteln, Malen oder Spielen.  Ihr könnt euch gern nach euren Interessen einbringen – wir sind offen und flexibel.	noTranslation		2025-11-01 20:51:21.595502	2025-11-01 20:51:21.595502	589	2
54	Übersetzung auf Farsi für Schulung!	volunteering		noTranslation		2025-11-01 20:51:21.611512	2025-11-01 20:51:21.611512	590	21
55	Sommerferien Betreuung mit Projekten und Ausflügen	volunteering	In den Sommerferien Kinderbetreuung Montag-Freitag mit Proketen den ganzen Tag oder Nachmittags (z.B. Malen, Basteln, Sport, Tanzen, Theater) und Ausflüge den ganzen Tag in Berlin (z.B. Sport, Zoo, Museum, Zirkus, Endeckungstouren).	noTranslation		2025-11-01 20:51:21.651636	2025-11-01 20:51:21.651636	591	26
56	Alltagsbegleitung von Familie	volunteering	Wir suchen eine ehrenamtliche Person, die eine afghanische Familie im Alltag als Mentor:in unterstützen möchte. Die Familie wünscht sich eine:n Mentor:in, die:der Farsi oder Dari spricht und sie bei bürokratischen Angelegenheiten unterstützt sowie bei Terminen begleitet und ggf. übersetzten kann. Die Familie lebt mit 5 Kindern (6-21 Jahre) erst seit kurzer Zeit in Berlin. Da die Familie in verschiedenen Bereichen Unterstützung sucht, wird es noch eine zweite Mentorin geben mit der die Unterstützungsbereiche aufgeteilt werden können. Die Mentor:innenschaft wird durch das Team von XENION e.V. begleitet. Im XENION-Mentor:innenprogramm unterstützten ehrenamtliche Mentor:innen geflüchtete Einzelpersonen und Familien beim Ankommen in Berlin. Die Tandems treffen sich einmal die Woche für 2-3 Stunden, über den Zeitraum von einem Jahr. Wenn Du Interesse hast die Familie zu unterstützen und dich als Mentor:in zu engagieren, melde Dich gerne bei mailto:beeke.wattenberg@xenion.org !	noTranslation		2025-11-01 20:51:21.673826	2025-11-01 20:51:21.673826	592	27
57	Sprachmittlung für Jobcenter-Termin	volunteering		deutsche		2025-11-01 20:51:21.68692	2025-11-01 20:51:21.68692	593	14
58	Begleitung zur und Dolmetschen bei Mammografie	volunteering		deutsche		2025-11-01 20:51:21.707742	2025-11-01 20:51:21.707742	594	10
59	Begleitung beim Einkaufen, Medikamente abholen etc.	volunteering	Im Rahmen unseres Projekts "Auf Achse" beim BZSL suchen wir freiwillige Unterstützer:innen für ein Ehepaar mit chronischer Erkrankung. Er sitz und bewegt sich im Rollstuhl und sie ist sehbehindert. Sie benötigen insbesondere Unterstützung beim Einkaufen und Abholen der Medikamente sowie ggf. bei anderen alltäglichen Aktivitäten. Sie sprechen Russisch, Georgisch und etwas Deutsch.	noTranslation		2025-11-01 20:51:21.737065	2025-11-01 20:51:21.737065	595	28
60	Wegbegleitung zur Arztpraxis	volunteering		noTranslation		2025-11-01 20:51:21.750134	2025-11-01 20:51:21.750134	596	26
61	Freiwillige und Ehrenamtliche für BENN Mierendorffinsel	volunteering	Wir suchen nach Freiwilligen, die folgende Aktivitäten bei uns im WERK-RAUM und im Gemeinschaftsraum unterstützen möchten:\n- Fahrradwerkstatt jeden Dienstag 16-18 Uhr;\n- Nähwerkstatt jeden Donnerstag 16-18 Uhr;\n- Sprachcafé jeden Mittwoch 16:30-18:00 im Gemeinschaftsraum.\nIm Sprachcafé suchen wir einerseits Freiwillige für die Moderation des Sprachcafés (am besten eine Person, die Deutsch, Arabisch und/oder Türkisch spricht). des Weiteren suchen wir Freiwillige für die Kinderbetreuung während des Sprachcafés, damit noch mehr Personen (in Carearbeit) daran teilnehmen können.	noTranslation		2025-11-01 20:51:21.804495	2025-11-01 20:51:21.804495	597	29
62	Sprachcafé	volunteering	Wir würden uns sehr freuen, wenn jemand Lust hätte, ein Sprachcafé anzubieten – der große Raum steht uns dafür zur Verfügung und bietet viel Platz für Begegnung und Austausch.	noTranslation		2025-11-01 20:51:21.820559	2025-11-01 20:51:21.820559	598	6
63	Basteln für Kinder	volunteering	Wir suchen Unterstützung im Bereich Kinderbetreuung oder kreative Bastelangebote für Kinder im Alter von 2 bis 5 Jahren. Die Eltern sind in der Regel mit vor Ort, freuen sich aber sehr, wenn es für die Kleinen ein paar schöne Beschäftigungsmöglichkeiten gibt.	noTranslation		2025-11-01 20:51:21.863383	2025-11-01 20:51:21.863383	599	6
64	Kinderschminken beim Sommerfest	volunteering	Wir suchen Freiwillige, die Kinderschminken als Aktion oder Angebot parallel zum Sommerfest kostenlos anbieten können.	noTranslation		2025-11-01 20:51:21.88888	2025-11-01 20:51:21.88888	600	18
65	Begleitung zur Charité	volunteering		noTranslation		2025-11-01 20:51:21.912327	2025-11-01 20:51:21.912327	601	30
66	Begleitung zur Frauen Beratung	volunteering		noTranslation		2025-11-01 20:51:21.937332	2025-11-01 20:51:21.937332	602	31
67	Begleitung - Doltmescher/*inn (Deutsch-Ukrainisch/Russisch)	volunteering		noTranslation		2025-11-01 20:51:21.958101	2025-11-01 20:51:21.958101	603	9
68	Unterstützung beim Dolmetschen: Arzttermin	volunteering		noTranslation		2025-11-01 20:51:21.988659	2025-11-01 20:51:21.988659	604	32
69	Aktivitäten für männliche Geflüchtete (zum Beispiel Sprachkaffee, Sport, zusammen kochen und grillen) im Welcome Raum der Unterkunft.	volunteering	Bei der Unterkunft handelt es sich um eine Erstaufnahme Einrichtung für Geflüchtete, in der Unterkunft gibt es viel in der Kinderbetreuung und in der Betreuung von Frauen* aber grade junge Männer* fallen zurzeit ein bisschen aus dem Raster. In der Unterkunft gibt es einen Welcome Raum, mit einem Boxsack und einer Tischtennisplatte, es gibt ein großes Außengelände mit einem Fußballplatz und einer Grillmöglichkeit. Es gibt ein großes Team an Beschäftigten welche gerne unterstützen und zur Seite stehen. Wir freuen uns über Rückmeldungen.	noTranslation		2025-11-01 20:51:22.025213	2025-11-01 20:51:22.025213	605	33
70	Yogakurs für Seniorinnen	volunteering	Biete einen Yogakurs an!	noTranslation		2025-11-01 20:51:22.052417	2025-11-01 20:51:22.052417	606	9
71	Unterstützung beim Sommerfest	volunteering	Wir sind eine Erstaufnahmeeinrichtung für geflüchtete Familien in Biesdorf. Bei uns leben ca. 300 Bewohner aus unterschiedlichsten Ländern.  Am Freitag, den 29.08. zwischen 14-17 Uhr feiern wir unser erstes Sommerfest in der Unterkunft. Wir freuen uns über helfende Hände!	noTranslation		2025-11-01 20:51:22.085881	2025-11-01 20:51:22.085881	607	5
72	Aktivitäten für Bewohner*innen gestalten	volunteering	Wir suchen nach Freiwilligen, die uns mit folgenden Aktivitäten unterstützen könnten:\n- Sportangebot für Männer (z.B. Tischtennis usw.)\n- Unterstützung im Fußballtraining für Kinder (dienstags 16-18 Uhr)\n- Deutsch Nachhilfe	noTranslation		2025-11-01 20:51:22.119589	2025-11-01 20:51:22.119589	608	21
73	Alltagsbegleitung durch ehrenamtliche Mentor*innen in Berlin Xenion	volunteering	Das Projekt wird vom psychosozialen Zentrum XENION im Rahmen eines ganzheitlichen Ansatzes umgesetzt. Die Ehrenamtlichen werden professionell durch das hauptamtliche Team betreut, können Schulungen und ein Aktivitätenprogramm besuchen und bei Bedarf eine Einzelsupervision in Anspruch..	noTranslation		2025-11-01 20:51:22.154237	2025-11-01 20:51:22.154237	609	34
74	Unterstützung bei der Kinderbetreuung Sommerferien	volunteering	Wir suchen Freiwillige, die uns während der Sommerpause mit folgenden Aktivitäten unterstützen können:\n- 1x in der Woche Schach Club;\n- 1x in der Woche  Sport- und Spielaktivitäten mit den Kindern;\n\nDas Alter von den Kindern ist sehr unterschiedlich. Wir haben am meistens Kinder ab 6 Jahre bis 12 Jahre.	noTranslation		2025-11-01 20:51:22.183532	2025-11-01 20:51:22.183532	610	14
75	Wohnungssuche Beratung vor Ort	volunteering	Die Bewohner*innen brauchen Unterstützung bei der Wohnungssuche. Es geht um Fragen wie:    Wo und wie beantragt man einen WBS (Wohnberechtigungsschein)?\nWas ist eine SCHUFA-Auskunft, wie bekommt man sie, und was wird geprüft?\nWo kann man seriös nach Wohnungen suchen, ohne auf illegaleAngebote hereinzufallen (z. B. Schwarzmarkler)? \nWelche Hilfe bietet das Jobcenter, z. B. bei der Mietzahlung oder Wohnungssuche?\nAußerdem geht es darum, wie man sich überhaupt bewirbt und wo man suchen kann. Viele kennen das Grundwissen schon, aber in der aktuellen Situation ist es trotzdem schwer, eine Wohnung zu finden.\nDer Termin ist flexibel. Wir richten uns gerne nach den Möglichkeiten der Ehrenamtlichen.	noTranslation		2025-11-01 20:51:22.207195	2025-11-01 20:51:22.207195	611	2
76	Sportunterricht für Kinder in Marienfelde	volunteering	Es wäre ideal, wenn die Freiwillige Deutsch sprechen, da die Kinder es lernen sollen. Das ganze Team spricht Russisch.	noTranslation		2025-11-01 20:51:22.231791	2025-11-01 20:51:22.231791	612	35
77	Dolmetschen im Virchow Klinikum	volunteering		noTranslation		2025-11-01 20:51:22.249132	2025-11-01 20:51:22.249132	613	10
78	Individuelle Vorbereitung für Deutschprüfungen	volunteering	Unterstütze erwachsene Bewohner*innen bei der Vorbereitung für Deutschprüfungen (A2-B2)	noTranslation		2025-11-01 20:51:22.273564	2025-11-01 20:51:22.273564	614	36
79	Deutschnachhilfe / Lernen A1 (Individuell für mobilitätseingschränkte Person)	volunteering	Victor ist neu in die GU Osteweg gezogen, zuvor hat er in Mitte gewohnt. Er ist durch eine chronische Erkrankung mobilitätseingeschränkt, weshalb er nicht an allen Deutschkursen teilnehmen kann. Daher suchen wir eine Person, die ihn individuell im Osteweg beim Deutschlernen unterstützen kann. Er hat den A1 Kurs schon abgeschlossen und ist mitten im Niveau A2.1. Er ist zeitlich flexibel. Im Osteweg gibt es einen Hausaufgabenraum mit Tafel und Computern, die gern genutzt werden können oder man trifft sich bei Victor in der Wohnküche.Victor spricht Englisch und Igbo muttersprachlich und ist 43 Jahre alt.	noTranslation		2025-11-01 20:51:22.301046	2025-11-01 20:51:22.301046	615	36
80	Nachhilfe alle Klassenstufen für die Fächer Deutsch, Mathe, Englisch	volunteering	Wir suchen jemand mit Interesse an Nachhilfe mit Fokus auf Deutsch, Mathe, Englisch. Falls jemand aber lieber zu, Beispiel eine Lesegruppe oder Gruppen-Nachhilfe machen möchte, ist das auch möglich.	noTranslation		2025-11-01 20:51:22.31806	2025-11-01 20:51:22.31806	616	36
81	Unterstütze mit Kinderbetreuung in Mitte	volunteering	Am besten wäre es, wenn die Freiwilligen jeweils 2-3 Stunden mitarbeiten könnten. Es wäre toll, wenn sie regelmäßig kommen könnten.	noTranslation		2025-11-01 20:51:22.340187	2025-11-01 20:51:22.340187	617	30
82	Unterstützung bei Begegnungsformaten wie Nachbarschaftstreff, Café Palme oder Gartengruppe	volunteering	Wir begleiten momentan drei Begegnungsformate in Unterkünften bzw. mit BewohnerInnen der Unterkünfte in Altglienicke. Wir suchen Freiwillige, die unsere Arbeit unterstützen. Das ist in vielfältiger Weise möglich..In den Café Formaten kann gemeinam Deutsch gelernt werden, gemeinam Kuchen gebacken und international gekocht werden, wir tanzen manchmal, spielen Schach, hören uns gegenseitig zu.. Die Gartengruppe kümmert sich um die Grünanlagen in den Einrichtungen in Altglienicke wie Cabuwazi und Kiezclub. Wir pflanzen und pflegen naturnahe Orte, bauen Hochbeete und lernen gleich noch bisschen Deutsch dabei :)	noTranslation		2025-11-01 20:51:22.395172	2025-11-01 20:51:22.395172	618	37
83	Begleitung zu einem Termin beim Jobcenter Spandau	volunteering		noTranslation		2025-11-01 20:51:22.424102	2025-11-01 20:51:22.424102	619	38
84	Dolmetschen beim Jobcenter	volunteering		noTranslation		2025-11-01 20:51:22.453591	2025-11-01 20:51:22.453591	620	39
85	Begleitung zum Arzt/Neurologe	volunteering		noTranslation		2025-11-01 20:51:22.46946	2025-11-01 20:51:22.46946	621	3
86	Begleitung zum Arzt	volunteering		englishOk		2025-11-01 20:51:22.485458	2025-11-01 20:51:22.485458	622	3
87	Begleitung zum Ferienprogramm	volunteering	Zwei Wochen ab dem 4.8.2025. Um 8:30 Uhr abholen und zum Schul-Umwelt-Zentrum, begleiten dann wieder am Nachmittag (gegen 15 Uhr) zurück. Es ist eine Gruppe von 10 Kindern und sie werden schon von einer Mitarbeiterin begleitet aber sie brauchen nur eine Person.	noTranslation		2025-11-01 20:51:22.509049	2025-11-01 20:51:22.509049	623	30
88	Übersetzung ins Russisch beim Arzttermin für Internist	volunteering		noTranslation		2025-11-01 20:51:22.538865	2025-11-01 20:51:22.538865	624	40
89	Dolmetschen beim Arzt	volunteering		noTranslation		2025-11-01 20:51:22.555796	2025-11-01 20:51:22.555796	625	10
90	Sprachmittlung Georgisch psychologische Beratung	volunteering	In den beiden Unterkünften in Charlottenburg, gibt es einen hohen Bedarf von Menschen, die Georgisch sprechen und psychologische Beratung wünschen, SprInt hat aber nur sehr wenige Kapazitäten und Gespräche können darum nur in sehr großen Abständen und mit langer Wartezeit stattfinden. Darum frage ich an, ob eine Person, die Georgisch spricht sich vorstellen könnte gelegentlich zu übersetzen.	noTranslation		2025-11-01 20:51:22.576887	2025-11-01 20:51:22.576887	626	6
91	Arzt Begleitung	volunteering		noTranslation		2025-11-01 20:51:22.592843	2025-11-01 20:51:22.592843	627	6
92	Begleitung zur Charité	volunteering		noTranslation		2025-11-01 20:51:22.613549	2025-11-01 20:51:22.613549	628	6
93	Unterstützung beim Sommerfest	volunteering	Kinderschminke, Hüpfburg, Basteln, Essenausgabe, Auf-Abbau	noTranslation		2025-11-01 20:51:22.634994	2025-11-01 20:51:22.634994	629	4
94	OP Vorbereitung - HNO	volunteering		noTranslation		2025-11-01 20:51:22.652324	2025-11-01 20:51:22.652324	630	6
95	Dolmetschen beim Aufnahmezentrum zur stationären Behandlung	volunteering		noTranslation		2025-11-01 20:51:22.670045	2025-11-01 20:51:22.670045	631	36
96	Dolmetschen Russisch im Krankenhaus	volunteering		noTranslation		2025-11-01 20:51:22.691323	2025-11-01 20:51:22.691323	632	10
97	Unterstützung beim Abbau des Sommerfests	volunteering	Wir suchen Unterstützung beim Aubbau unseres Sommerfests am Freitag, 11.07.25 zwischen 18-19:30 Uhr. Natürlich sind die Helfenden herzlich eingeladen auch schon ab 15 Uhr zum Fest zu kommen. Für das leibliche Wohl (Getränke, Grillgut, Kuchen) ist gesorgt. Wir freuen uns über tatkräftige Unterstützung :)	noTranslation		2025-11-01 20:51:22.727015	2025-11-01 20:51:22.727015	633	41
98	Unterstützung beim Aufbau des Sommerfests	volunteering	Wir suchen Unterstützung beim Aufbau unseres Sommerfests (Dekorieren, Aufstellen von Tischen, Grill, Vorbereitung von Getränken) am Freitag, 11.07.25 zwischen 12-15 Uhr. Natürlich sind die Helfenden herzlich eingeladen auch noch zum Fest zu bleiben. Für das leibliche Wohl (Getränke, Grillgut, Kuchen) ist gesorgt. Wir freuen uns über tatkräftige Unterstützung :)	noTranslation		2025-11-01 20:51:22.751239	2025-11-01 20:51:22.751239	634	41
99	Sprachmittlung Spanisch	volunteering		noTranslation		2025-11-01 20:51:22.772851	2025-11-01 20:51:22.772851	635	6
100	Begleitung zum Standesamt	volunteering		noTranslation		2025-11-01 20:51:22.789816	2025-11-01 20:51:22.789816	636	5
101	Sprachliche Hilfe bei Eltern- und Schülerinnengespräch mit Lehrkraft	volunteering		noTranslation		2025-11-01 20:51:22.817341	2025-11-01 20:51:22.817341	637	42
102	Sprachmittlung beim Gespräch mit dem Sozialteam	volunteering		noTranslation		2025-11-01 20:51:22.834081	2025-11-01 20:51:22.834081	638	2
103	Russisch Dolmetschen bei Arzttermin	volunteering		noTranslation		2025-11-01 20:51:22.853014	2025-11-01 20:51:22.853014	639	10
104	Übersetzen beim Arzttermin	volunteering		noTranslation		2025-11-01 20:51:22.878157	2025-11-01 20:51:22.878157	640	1
105	Unterstützung beim Sommerfest	volunteering	Unser Fest findet am 04.07. zwischen 14 und 18 Uhr statt und wir suchen aktuell zu diesem Anlass ehrenamtliche Unterstützung für Kinderangebote (Kreatives, Sport/Bewegung, Kinderschminken/Tattoos, Luftballontiere etc.), Hilfe beim Auf- und Abbau sowie während des Fests und darüber hinaus auch Angebote für Erwachsene (Zeichnen, Handarbeit etc.). Wir sind für alles offen und freue mich über engagierte Ehrenamtliche, die gerne auch ihre eigenen Ideen mitbringen und umsetzen können!	noTranslation		2025-11-01 20:51:22.914544	2025-11-01 20:51:22.914544	641	43
106	Dolmetscher für Termin für MRT	volunteering		noTranslation		2025-11-01 20:51:22.941954	2025-11-01 20:51:22.941954	642	44
107	Einschulungsuntersuchung	volunteering		noTranslation		2025-11-01 20:51:22.969332	2025-11-01 20:51:22.969332	643	45
108	Begleitung für Ausflüge	volunteering	Wir suchen Ehrenamtliche, die die Kinderbetreuung für 2-3 Stunden nachmittags bei Ausflügen unterstützen.  In der Nähe gibt es Spielplätz, Kindermuseen, Parks und Freizeitangebote.	noTranslation		2025-11-01 20:51:23.007654	2025-11-01 20:51:23.007654	644	46
109	Freizeitaktivitäten- und/oder Freizeitangebote für Frauen	volunteering	Ziel ist es, den Frauen, die in der GU im Kaklower Weg leben (alle mit kleinen Kindern), jede Art von Freizeitbeschäftigung anzubieten. Es wäre ideal, einmal pro Woche, aber ich bleibe zu Ihrer vollen Verfügung für jede Beratung.	noTranslation		2025-11-01 20:51:23.029048	2025-11-01 20:51:23.029048	645	16
110	Musikalische Darbietung am Tag des Sommerfestes	volunteering	Es kann gerne auch eine Musikgruppe oder eine Tanzgruppe sein, wir haben ein Budget von 250 EUR zur Verfügung. Vielen Dank!	noTranslation		2025-11-01 20:51:23.062747	2025-11-01 20:51:23.062747	646	47
111	Basteln & Malen	volunteering	Kreative Nachmittagsaktivitäten für Kinder bis zu 14 Jahren. Gemeinsam malen und/oder basteln. Ein Nachmittag pro Woche nach Ihrer Wahl (je nach ihrer Verfügbarkeit) am Montag, Mittwoch oder Donnerstag,  in unserer GU im Kablower Weg 89 - 12526 Berlin.	noTranslation		2025-11-01 20:51:23.088594	2025-11-01 20:51:23.088594	647	16
112	Begleitung von Kindern im Jugendclub	volunteering		noTranslation		2025-11-01 20:51:23.106429	2025-11-01 20:51:23.106429	648	48
113	Sprachmittlung Französisch	volunteering		noTranslation		2025-11-01 20:51:23.128942	2025-11-01 20:51:23.128942	649	49
114	Jobcenter begleitung	volunteering		noTranslation		2025-11-01 20:51:23.151871	2025-11-01 20:51:23.151871	650	50
115	Begleitung bei alltäglichen Aktivitäten, Unterstützung beim Deutsch lernen	volunteering	Im Rahmen unseres Projekts „Auf Achse“ suchen wir ehrenamtliche Unterstützung für einen Mann aus Kamerun mit einer Sehbehinderung. Er wohnt in Köpenick und spricht Französisch, ein bisschen Englisch und hat begonnen Deutsch zu lernen. Er benötigt Hilfe bei alltäglichen Aktivitäten wie Einkaufen, Haushalt organisieren oder einmaligen Aktivitäten wie das Einrichten der Wohnung. Zudem würde er sich über Unterstützung beim Deutsch lernen freuen.	noTranslation		2025-11-01 20:51:23.178908	2025-11-01 20:51:23.178908	651	51
116	Begleitung zur Schuluntersuchung beim Bezirksamt	volunteering		noTranslation		2025-11-01 20:51:23.207652	2025-11-01 20:51:23.207652	652	52
117	Sport mit Jungs (9-13 Jahre)	volunteering	Wir suchen männliche Ehrenamtliche, die 2-3 Stunden nachmittags bei sportlichen Aktivitäten unterstützen. In unserer Unterkunft gibt es einen Kinderraum, einen großen Innenhof mit Garten und in der Nähe Spielplätze und Freizeitangebote.	noTranslation		2025-11-01 20:51:23.240336	2025-11-01 20:51:23.240336	653	46
118	Nachhilfe für Kinder, bei Möglichkeit auch für Jugendliche	volunteering	Es kann auch ein Nachmittag in der Woche sein, da wir hierfür flexibel sind haben wir Tage die in Frage kommen markiert.	noTranslation		2025-11-01 20:51:23.271118	2025-11-01 20:51:23.271118	654	47
119	Kinderbetreuung	volunteering		noTranslation		2025-11-01 20:51:23.288101	2025-11-01 20:51:23.288101	655	46
120	Begleitung zur Innere Medizin/ Internist	volunteering		noTranslation		2025-11-01 20:51:23.315203	2025-11-01 20:51:23.315203	656	53
121	Begleitung zum Spielplatz oder Kolle 8 und zurück, Sport und Bewegungsangebot	volunteering		noTranslation		2025-11-01 20:51:23.344455	2025-11-01 20:51:23.344455	657	54
122	Begleitung und Betreuung von 5 Kindern (5-7 Jahre) in die Bibliothek am Wasserturm	volunteering	Wir brauchen eine(n) Frewilligen, der/die die Kinder jeden zweiten Mittwoch zwischen 16:30 und 18:30 von der Unterkunft in die Bibliothek und zurück begleitet und die Kinder während des Angebots ("Podesthelden" und "ABC-Piraten") betreut.	noTranslation		2025-11-01 20:51:23.362976	2025-11-01 20:51:23.362976	658	54
123	Begleitung zur Bank	volunteering		noTranslation		2025-11-01 20:51:23.381105	2025-11-01 20:51:23.381105	659	53
124	Aktivitäten für Männer in Neukölln gestalten	volunteering	Ankommen, Verstehen, Teilhaben. Gemeinsam neue Wege gehen: Männerprojekt von GBZ e.V.  Geflüchtete Männer in Berlin stehen vor vielfältigen Herausforderungen: das Verstehen gesellschaftlicher Normen, Integrationshürden oder das Gefühl von Isolation. Genau hier setzt unser Männerprojekt an. Es schafft einen geschützten Raum für Orientierung, Austausch und Bildung – mit dem Ziel, gesellschaftliche Teilhabe zu erleichtern und neue Perspektiven zu eröffnen.	noTranslation		2025-11-01 20:51:23.418388	2025-11-01 20:51:23.418388	660	55
125	Begleitung zu MVZ Radiologie	volunteering		noTranslation		2025-11-01 20:51:23.436008	2025-11-01 20:51:23.436008	661	10
126	Begleitung zum Auguste Viktoria Klinikum	volunteering		noTranslation		2025-11-01 20:51:23.454606	2025-11-01 20:51:23.454606	662	7
127	Organisiere Spiele für Kinder im Spielraum in Neukölln	volunteering	Sprachen sind kein Muss, aber die meisten im Team sprechen Deutsch.\nPlayroom ist ein Projekt, das bereits seit mehr als einem Jahr läuft. Es gibt eine Gruppe von Freiwilligen, die am Dienstag- und Mittwochabend Aktivitäten für Kinder organisieren. Da es im Hotel keine ganztägige Kinderbetreuung gibt, können umso mehr Aktivitäten organisiert werden, je mehr Freiwillige es gibt.	noTranslation		2025-11-01 20:51:23.481016	2025-11-01 20:51:23.481016	663	39
128	Sitzbank-Reparatur	volunteering	Unterstützung bei der Reparatur der Paletten-Sitzbank. Ehrenamtliche, die Kenntnisse mit Holz haben, wären ideal. Bewohnenden  werden bei der Tätigkeit unterstützen. Wir haben einige extra Paletten in der Unterkunft, die für die Aktion genutzt werden können.  Danke für Ihre Hilfe und Unterstützung.	noTranslation		2025-11-01 20:51:23.505953	2025-11-01 20:51:23.505953	664	20
129	Unterstützung in der Ferienzeit	volunteering	Unterstützung von Ehrenamtlichen während der Ferienzeit. Gibt es im Hinterhaus der Unterkunft einen Spielplatz. Wenn Sie einen Freiwilligen finden könnten, der die Kinder dorthin bringt und mit ihnen Sport treibt, oder einen Freiwilligen, der mit den Kindern nicht-sportliche Aktivitäten unternimmt. Zu den nicht-sportlichen Aktivitäten gehört die Betreuung der Kinder in der Kita. Vorlesen oder jemand, der Interesse an Aktivitäten während der Ferienzeit hat.	noTranslation		2025-11-01 20:51:23.532567	2025-11-01 20:51:23.532567	665	20
130	Aktivitäten für ein Frauen*café	volunteering	Unterstütze das Team einer Unterkunft bei der Einrichtung eines Frauenraums für Geflüchtete, der den Interessen der Bewohnerinnen entspricht. Sie wollen einen Ort des Kennenlernens und des kulturellen Austauschs schaffen, an dem sich die Frauen sicher fühlen und den Raum nach Belieben nutzen können.	noTranslation		2025-11-01 20:51:23.560055	2025-11-01 20:51:23.560055	666	7
131	Begleitung zum Standesamt	volunteering		noTranslation		2025-11-01 20:51:23.576366	2025-11-01 20:51:23.576366	667	18
132	Begleitung/Übersetzung deutsch	volunteering		noTranslation		2025-11-01 20:51:23.592405	2025-11-01 20:51:23.592405	668	18
133	Sprachmittlung in Unterkunft Urhobo	volunteering		noTranslation		2025-11-01 20:51:23.610194	2025-11-01 20:51:23.610194	669	6
134	Erstorientierung für eine arabischsprachige Frau	volunteering	Wir suchen im Moment eine arabischsprachige Ehrenamtliche, die gelegentlich eine tunesische Bewohnerin begleiten könnte, für sie gegebenenfalls übersetzen würde und ihr Dinge wie das Ticketlösen etc. zeigt. Die Bewohnerin hat frisch entbunden, spricht noch keinerlei Deutsch und hat noch jede Menge bürokratisch und sozial vor sich. Wir würden uns sehr freuen, wenn sich für sie jemand findet, der Lust auf eine Eins-zu-Eins-Betreuung hat!	noTranslation		2025-11-01 20:51:23.62736	2025-11-01 20:51:23.62736	670	43
135	Übersetzung ins Russisch beim Zahnarzttermin	volunteering		noTranslation		2025-11-01 20:51:23.648945	2025-11-01 20:51:23.648945	671	40
136	Hilfe bei den Hausaufgaben für Grundschüler*innen in Wilmersdorf	volunteering	Es handelt sich um eine regelmäßige Freiwilligenarbeit (einmal pro Woche). Es wird Unterstützung für Grundschulkinder in verschiedenen Fächern benötigt. Die Kinder sprechen Deutsch, also sollte der Freiwillige auch Deutsch sprechen können.	noTranslation		2025-11-01 20:51:23.666883	2025-11-01 20:51:23.666883	672	56
137	Frauenarzt	volunteering		noTranslation		2025-11-01 20:51:23.680918	2025-11-01 20:51:23.680918	673	53
138	Überzetzung/Begleitung beim Termin mit dem Psychologe	volunteering		noTranslation		2025-11-01 20:51:23.696035	2025-11-01 20:51:23.696035	674	3
139	Verantwortliche für Kleiderkammer	volunteering	Wir suchen engagierte Freiwillige, die unsere Kleiderkammer in der Aufnahmeeinrichtung unterstützen möchten.  \nIhre Aufgaben:  Sortierung von Kleidung: Sie nehmen neu angekommene Kleiderspenden entgegen, sortieren diese nach Kategorien (z. B. Größe, Jahreszeit) und organisieren die Lagerung. Ausgabe an Bewohner:innen: Sie helfen bei der Ausgabe der Kleidung an die Bewohner:innen der Unterkunft. Die Termine für die Ausgabe werden durch den Infopoint koordiniert. \nOrdnung und Übersicht: Sie tragen dazu bei, die Kleiderkammer sauber, geordnet und übersichtlich zu halten, damit Bewohner:innen schnell das finden, was sie benötigen.	noTranslation		2025-11-01 20:51:23.721417	2025-11-01 20:51:23.721417	675	10
140	Sprachmittlung Georgisch und Russisch	volunteering	Die Bewohner*innen der Unterkunft benötigen dringend Unterstützung bei Übersetzungen (Georgisch/Russisch - Englisch/Deutsch).	noTranslation		2025-11-01 20:51:23.741382	2025-11-01 20:51:23.741382	676	57
141	Farsi Übersetzung im Standesamt Reinickendorf für Geburtsanmeldung am 19:05 um 12:00	volunteering		noTranslation		2025-11-01 20:51:23.758369	2025-11-01 20:51:23.758369	677	10
142	Nachhilfe in Englisch und Deutsch: Anfängerniveu, Einzel- oder Gruppenunterricht	volunteering	Hallo, wir suchen Nachhilfe in Englisch, Deutsch und allgemein Hausaufgabenhilfe auf relativ einfachem Niveau. Es gibt einzelne Kinder und junge Erwachsene, die selbst Nachhilfe suchen aber auch Eltern, die für ihre Kinder Nachhilfe suchen. Teilweise wäre Einzelunterricht nötig oder aber auch ein offenes Nachhilfeangebot in einem unserer Clubräume.	noTranslation		2025-11-01 20:51:23.785418	2025-11-01 20:51:23.785418	678	58
143	Begleitung- Hörgerateversorgung (Voruntersuchung)	volunteering		noTranslation		2025-11-01 20:51:23.806099	2025-11-01 20:51:23.806099	679	32
144	Unterstütze bei Kinderbetreuung in Zehlendorf	volunteering	Freiwillige werden zur Unterstützung des Kinderbetreuungspersonals benötigt (Organisation von Aktivitäten, Einbringen neuer Ideen, Unterstützung bei bestehenden Aktivitäten wie Spielen und Basteln)	noTranslation		2025-11-01 20:51:23.831123	2025-11-01 20:51:23.831123	680	58
145	Ausflüge für Familien	volunteering	Unterstützung bei der Organisation von Ausflügen und Freizeitaktivitäten außerhalb der Unterkunft für die dort lebenden Familien.	noTranslation		2025-11-01 20:51:23.851954	2025-11-01 20:51:23.851954	681	4
146	Sprachcafé für Bewohner*innen	volunteering	Wir suchen nach Freiwilligen mit fortgeschrittenen Deutschkenntnissen, die die Bewohner*innen der Unterkunft Deutsch beibringen möchten.	noTranslation		2025-11-01 20:51:23.873272	2025-11-01 20:51:23.873272	682	9
147	Begleitung zum  Orthopädietechnik	volunteering		noTranslation		2025-11-01 20:51:23.88807	2025-11-01 20:51:23.88807	683	53
148	Unterstützung mit Übersetzungen für Sozialarbeiter*innen	volunteering	Unterstützung der Sozialarbeiter*innen bei Übersetzungen während der Beratungsstunden.	noTranslation		2025-11-01 20:51:23.906492	2025-11-01 20:51:23.906492	684	19
149	Hausaufgabenhilfe	volunteering	Wir suchen Ehrenamtliche für die Hausaufgabenhilfe in unserer Gemeinschaftsunterkunft.	noTranslation		2025-11-01 20:51:23.93387	2025-11-01 20:51:23.93387	685	59
150	Telefondienst	volunteering	Wir suchen Ehrenamtliche, die Spaß am Telefonieren haben und in unserer Einrichtung Anrufe entgegennehmen und weiterleiten.	noTranslation		2025-11-01 20:51:23.95117	2025-11-01 20:51:23.95117	686	59
151	Begleitung HNO-Klinik - Op Voruntersuchung	volunteering		noTranslation		2025-11-01 20:51:23.966559	2025-11-01 20:51:23.966559	687	6
152	Unterstütze ein Sprachcafé und ein Männer*café	volunteering	Wir suchen Ehrenamtliche, die Lust haben, das Männercafé mitzugestalten und sich dort zu engagieren. Außerdem wollen wir gemeinsam das Konzept entwickeln und kreative Ideen austauschen.	noTranslation		2025-11-01 20:51:24.003118	2025-11-01 20:51:24.003118	688	60
153	Sprachtandem in Neukölln	volunteering	Bewohner*innen der Gemeinschaftsunterkunft möchten ihre Deutschkenntnisse verbessern. Sie sind an einem Deutschkurs interessiert und würden gerne daran teilnehmen.	noTranslation		2025-11-01 20:51:24.018373	2025-11-01 20:51:24.018373	689	60
154	Begleitung zu Behördengängen und  Arztterminen	volunteering		noTranslation		2025-11-01 20:51:24.029173	2025-11-01 20:51:24.029173	690	53
155	Unterstützung bei der Gartenarbeit (Gemüsegarten)	volunteering	Es gibt einen kleinen Gemüsegarten im Hof, und die Mitarbeiter*innen würden sich über die Unterstützung einer Person freuen, die sich mit dem Gärtnern auskennt. Die Gartensaison wäre etwa Mitte Oktober zu Ende.	noTranslation		2025-11-01 20:51:24.054444	2025-11-01 20:51:24.054444	691	28
156	Kinderarzt Begleitung	volunteering		noTranslation		2025-11-01 20:51:24.068864	2025-11-01 20:51:24.068864	692	26
157	Nachhilfe bei der Ausbildung	volunteering	Gesucht wird eine Frau, die einer Frau Nachhilfe bei der Ausbildung zur Sozialassistentin gibt.	noTranslation		2025-11-01 20:51:24.096158	2025-11-01 20:51:24.096158	693	61
158	Lebenslauf schreiben	volunteering	.	noTranslation		2025-11-01 20:51:24.117522	2025-11-01 20:51:24.117522	694	17
159	Nähkurs für Jugendliche	volunteering		noTranslation		2025-11-01 20:51:24.139155	2025-11-01 20:51:24.139155	695	17
160	Organisiere Aktivitäten für Frauen	volunteering	Wir suchen Freiwillige, die Aktivitäten für Frauen organisieren möchten, z.B. Yoga, Tanzen, Musik usw.	noTranslation		2025-11-01 20:51:24.166896	2025-11-01 20:51:24.166896	696	62
161	Nachhilfe für Kinder und Jugendliche	volunteering	Unterstütze Kinder, die in einer Gemeinschaftsunterkunft leben, mit Nachhilfeunterricht!	noTranslation		2025-11-01 20:51:24.193808	2025-11-01 20:51:24.193808	697	63
162	Unterstütze mit Kinderbetreuung in Prenzlauer Berg	volunteering	Organisiere spannende Aktivitäten für Kinder und unterstütze sie beim Basteln.	noTranslation		2025-11-01 20:51:24.217864	2025-11-01 20:51:24.217864	698	40
163	Unterstütze mit Kinderbetreuung in Grünau	volunteering	Plane und organisiere Bastelaktivitäten für Kinder in einer Unterkunft in Grünau.	noTranslation		2025-11-01 20:51:24.237797	2025-11-01 20:51:24.237797	699	16
164	Nachhilfe in Lichtenberg	volunteering	Unterstütze Kinder, die in der Gemeinschaftsunterkunft leben, mit Nachhilfeunterricht!	noTranslation		2025-11-01 20:51:24.255799	2025-11-01 20:51:24.255799	700	19
165	Organisiere Kinderbetreuung in Lichtenberg	volunteering	Unterstütze beim Aufbau einer Kinderbetreuung und organisiere lustige Aktivitäten für Kinder, die in einer Unterkunft in Lichterberg leben. Es gibt dort noch keine offizielle Kinderbetreuung, so dass die Freiwilligen selbst für die Organisation der Aktivitäten verantwortlich sind.	noTranslation		2025-11-01 20:51:24.273234	2025-11-01 20:51:24.273234	701	19
166	Organisiere Aktivitäten für Kinder in Tempelhof	volunteering	Organisiere lustige Spiele und andere Aktivitäten für Kinder (ab 7 Jahren), die in einer Unterkunft in Tempelhof leben. Die Zeiten für die Freiwilligenarbeit können individuell besprochen werden.	noTranslation		2025-11-01 20:51:24.285902	2025-11-01 20:51:24.285902	702	24
167	Sportunterricht für die Bewohner*innen	volunteering	Die Bewohner*innen der Unterkunft würden gerne mit Freiwilligen Fußball, Volleyball, Tischtennis und andere Spiele spielen. Der Zeitplan ist flexibel und kann mit der Ehrenamtskoordination abgesprochen werden.	noTranslation		2025-11-01 20:51:24.314864	2025-11-01 20:51:24.314864	703	33
168	Organisiere Kinderbetreuung in Lichtenberg	volunteering	Montag haben wir leider keine eigene Betreuung und bräuchten da eigentlich sehr dringend Hilfe. Das ließe sich aber wegen des 4 AugenPrinzips nur lösen wenn wir über Euch gleich 2 Ehrenamtliche bekämen die zeitgleich könnten.Sprachlich wäre Deutsch als Basis vor allem für die Hausaufgabenbetreuung wichtig. Ansonsten haben wir Kinder, die arabisch, farsi, russisch georgisch etc sprechen- da wäre alles natürlich hilfreich aber nicht Voraussetzung.	noTranslation		2025-11-01 20:51:24.341265	2025-11-01 20:51:24.341265	704	2
169	Sei Teil des Hürdenspringers in Tempelhof-Schöneberg	volunteering	Es handelt sich um ein langfristiges Programm, das eine ernsthafte Entwicklung der Freiwilligen erfordert.	noTranslation		2025-11-01 20:51:24.363135	2025-11-01 20:51:24.363135	705	64
170	Unterstütze mit Kinderbetreuung in Tegel	volunteering	Sie brauchenFreiwillige, die Aktivitäten für die Kinder organisiert und die Kinderbetreuer*innen unterstützt. Da es sich um eine Erstaufnahmeeinrichtung handelt, gehen einige der Kinder noch nicht zur Schule, so dass die Hilfe auch am Vormittag benötigt werden könnte.\nFreiwillige könnten eigene Ideen einbringen und diese umsetzen.	noTranslation		2025-11-01 20:51:24.394992	2025-11-01 20:51:24.394992	706	18
171	Arztbegleitung	volunteering	Begleitung zum Zahnarzt	noTranslation		2025-11-01 20:51:24.421007	2025-11-01 20:51:24.421007	707	65
172	Kinderaktivitäten gestalten	volunteering	Eigeninitiative und erste Erfahrungen in der Arbeit mit Kindern notwendig, da relativ große Altersspanne. Das Angebot findet im Garten am Montag zw. 16 und 18 Uhr statt.	noTranslation		2025-11-01 20:51:24.438054	2025-11-01 20:51:24.438054	708	7
173	Übersetzung beim Jugendamt wegen Vaterschaftsanerkennung	volunteering		noTranslation		2025-11-01 20:51:24.455581	2025-11-01 20:51:24.455581	709	50
174	Deutsch Hausaufgabenhilfe mit Muttersprachler*innen	volunteering	Wir sind eine Unterkunft für Geflüchtete. Wir haben bereits eine Deutsch-Hausaufgabenhilfe, jedoch wünschen sich unsere Bewohner*innen dies durch eine*n Deutsch-Muttersprachler*in.	noTranslation		2025-11-01 20:51:24.482916	2025-11-01 20:51:24.482916	710	66
175	Dolmetschen bei Kardiologe	volunteering		noTranslation		2025-11-01 20:51:24.500099	2025-11-01 20:51:24.500099	711	36
176	Untersuchung: Neurologie	volunteering		noTranslation		2025-11-01 20:51:24.518876	2025-11-01 20:51:24.518876	712	54
177	Gemeinsames Musizieren	volunteering	Wir sind eine Unterkunft für Geflüchtete in Marzahn und suchen jemanden, der ein Instrument spielt oder singt und Lust hat, mit einigen unserer Bewohner*innen wöchentlich zu musizieren.	noTranslation		2025-11-01 20:51:24.551296	2025-11-01 20:51:24.551296	713	5
178	Begleitung zum Jobcenter	volunteering		noTranslation		2025-11-01 20:51:24.568884	2025-11-01 20:51:24.568884	714	19
179	Nachhilfe in Deutsch, Mathe	volunteering	Wir benötigen für unsere Schüler Nachhilfe, vorrangig in den Fächern Deutsch und Mathe	noTranslation		2025-11-01 20:51:24.593887	2025-11-01 20:51:24.593887	715	35
180	Begleitung zum Frauenarzt	volunteering		noTranslation		2025-11-01 20:51:24.610012	2025-11-01 20:51:24.610012	716	53
181	Begleitung zur Augenklinik	volunteering		noTranslation		2025-11-01 20:51:24.629636	2025-11-01 20:51:24.629636	717	53
182	Unterstützung bei Kinderbetreuung / Basteln	volunteering	Organisiere lustige Aktivitäten für Kinder!	noTranslation		2025-11-01 20:51:24.656001	2025-11-01 20:51:24.656001	718	32
183	Ausflüge für die Bewohner*innen	volunteering	Wir suchen Freiwillige, die Ausflüge für Jugendliche und ältere Bewohner*innen organisieren können. Es muss nicht regel	noTranslation		2025-11-01 20:51:24.678579	2025-11-01 20:51:24.678579	719	32
184	Begleitung zum Kino für Geflüchtete	volunteering		noTranslation		2025-11-01 20:51:24.691015	2025-11-01 20:51:24.691015	720	63
185	Übersetzung bei Ärzten	volunteering		noTranslation		2025-11-01 20:51:24.714491	2025-11-01 20:51:24.714491	721	67
186	Dolmetscher Rumänisch/ Russisch	volunteering		noTranslation		2025-11-01 20:51:24.728579	2025-11-01 20:51:24.728579	722	20
187	Untersuchung: HNO Begleitung	volunteering		noTranslation		2025-11-01 20:51:24.744617	2025-11-01 20:51:24.744617	723	54
188	Begleitung zum Zahnarzt	volunteering		noTranslation		2025-11-01 20:51:24.761236	2025-11-01 20:51:24.761236	724	40
189	Begleitung zum Vaterschaftsanerkennungstermin	volunteering		noTranslation		2025-11-01 20:51:24.779968	2025-11-01 20:51:24.779968	725	18
190	Begleitung zu Orthopäde	volunteering		noTranslation		2025-11-01 20:51:24.795044	2025-11-01 20:51:24.795044	726	18
191	Übersetzung Russsich Arzt	volunteering		noTranslation		2025-11-01 20:51:24.812547	2025-11-01 20:51:24.812547	727	40
192	Unterstützung beim Dolmetschen: Arzttermin	volunteering		noTranslation		2025-11-01 20:51:24.835028	2025-11-01 20:51:24.835028	728	32
193	Sprachmittlung Russisch während Sprechstunde im Unterkunft	volunteering	Wir brauchen bitte Sprachmittlung Unterstützung für unsere russischsprachigen Bewohner*innen. Unsere russischsprachige Sozialarbeiterin ist vom 14. bis 25. April im Urlaub. Die Sprechstunden findet nur montags, dienstags, donnerstags und freitags von 10 bis 12Uhr und montags, dienstags und donnerstags von 14-16Uhr statt. Auch hier freuen wir für jede Zeit und jedes Datum, das möglich ist; wir würden diese Unterstützung sehr zu schätzen wissen. Vielen Dank im Voraus!	noTranslation		2025-11-01 20:51:24.85115	2025-11-01 20:51:24.85115	729	3
194	Begleitung zur Ausländerbehörde	volunteering		noTranslation		2025-11-01 20:51:24.869284	2025-11-01 20:51:24.869284	730	18
195	Sprachmittlung bei Lungenfacharzt	volunteering		noTranslation		2025-11-01 20:51:24.888635	2025-11-01 20:51:24.888635	731	10
196	Begleitung beim Arzttermin	volunteering		noTranslation		2025-11-01 20:51:24.906887	2025-11-01 20:51:24.906887	732	54
197	Begleitung zur Dermatochiurgie	volunteering		noTranslation		2025-11-01 20:51:24.932158	2025-11-01 20:51:24.932158	733	68
198	Begleitung zu Diabetologen	volunteering		noTranslation		2025-11-01 20:51:24.952151	2025-11-01 20:51:24.952151	734	69
199	Unterstütze bei der Wohnungssuche	volunteering	Wir haben mehrere Bewohner*innen, die gerne Hilfe hätten, wie man sich selbst eine eigene Wohnung sucht (wo sucht man, welche Unterlagen muss ich vorbereiten/beantragen, wie mache ich eine Bewerbung, was nehme ich mit zur Wohnungsbesichtigung etc.	noTranslation		2025-11-01 20:51:24.98025	2025-11-01 20:51:24.98025	735	66
200	Übersetzer für den Psychiater	volunteering		noTranslation		2025-11-01 20:51:25.00292	2025-11-01 20:51:25.00292	736	70
201	Angebote für Kinder	volunteering	Wir suchen nach Freiwilligen, die Aktivitäten für Kinder in unserer Unterkunft machen können.	noTranslation		2025-11-01 20:51:25.033037	2025-11-01 20:51:25.033037	737	21
202	Begleitung zur Schule Anmeldung.	volunteering		noTranslation		2025-11-01 20:51:25.055362	2025-11-01 20:51:25.055362	738	71
203	Nachhilfe in Deutsch, Englisch und Mathe für einen Schüler der 3. Klasse aus Georgien	volunteering	30 Min etwa Unterricht. Demetre erlebe ich als ein lieber, ruhiger und neugieriger Junge. Mit der Mutter will er leider nicht lernen. Daher bat mich die Mutter um Unterstützung.	noTranslation		2025-11-01 20:51:25.071145	2025-11-01 20:51:25.071145	739	58
204	Nachhilfe für einen Erwachsenen, der gerade seine Ausbildung begonnen hat.	volunteering	Die Zeit und der Wochentag, dan dem die Hilfe benötigt wird, stehen noch nicht fest.	noTranslation		2025-11-01 20:51:25.087801	2025-11-01 20:51:25.087801	740	61
205	Sprachmittlung auf Farsi, Türkisch und/oder Kurdisch	volunteering	Wir benötigen Sprachmittler, die unsere Sozialarbeiterinnen in den Sprechstunden unterstützen können. Die Sprechstunden findet montags, dienstags, donnerstags und freitags von 10 bis 12Uhr und montags, dienstags und donnerstags von 14-16Uhr statt. Die Sprachen, die wir benötigen, sind  Farsi, Türkisch und/oder Kurdisch aber vor allem Persisch. Auch hier freuen wir für jede Zeit und jedes Datum, das möglich ist; wir würden diese Unterstützung sehr zu schätzen wissen. Vielen Dank im Voraus!	noTranslation		2025-11-01 20:51:25.111731	2025-11-01 20:51:25.111731	741	3
206	Begleitung zur  Brustzentrum Charite	volunteering		noTranslation		2025-11-01 20:51:25.139328	2025-11-01 20:51:25.139328	742	72
207	Begleitung zur Nuclearmed	volunteering		noTranslation		2025-11-01 20:51:25.155294	2025-11-01 20:51:25.155294	743	72
208	Ehrenamtliche für KIEZTANDEMs gesucht!	volunteering	Das KIEZTANDEM bringt Menschen mit Flucht- und Migrationserfahrung und interessierte Freiwillige, die schon länger in Berlin leben, zusammen.  Je nach Interessen und Hobbys finden wir, das hauptamtliche Team, einen oder eine passende Tandempartner:in. Die freiwillig engagieren Nachbarinnen und Nachbarn unterstützen als Patinnen und Paten bei der Orientierung und Alltagsbewältigung der Zugewanderten im neuen Lebensumfeld, indem sie z. B. zusammen den Kiez erkunden, gemeinsam Freizeit verbringen, beim Erlernen der deutschen Sprache oder bei Behördengängen.  Die Tandems verbringen 2-3 Stunden Zeit pro Woche. Das hauptamtliche Team begleitet die Tandems und organisiert Austauschtreffen, Fortbildungen und Ausflüge für die Tandems und Interessierte.  Das Team ist außerdem zuständig für den Prozess des Matchings und die Begleitung der Patenschaften. Die Projektmitarbeiterinnen sind Ansprechpersonen für Fragen, Probleme, Idee u.a.  Voraussetzungen für ein Engagement im KIEZTANDEM: Sie müssen mindestens 18 Jahre alt sein; Interesse am interkulturellen Dialog haben; es sollte die Bereitschaft da sein, an Qualifizierungsseminaren teilzunehmen; Sie sollten Freude am Austausch und gemeinsamen Aktivitäten haben.  Ehrenamtliche Tandempartner:innen müssen keine ausgebildeten Fachkräfte oder Sozialarbeiter:innen sein.	noTranslation		2025-11-01 20:51:25.184605	2025-11-01 20:51:25.184605	744	73
209	Begleitung zur Neurologie	volunteering		noTranslation		2025-11-01 20:51:25.201784	2025-11-01 20:51:25.201784	745	5
210	Sprachmittlung für einen internen Termin mit unserer Sozialarbeiterin	volunteering		noTranslation		2025-11-01 20:51:25.217129	2025-11-01 20:51:25.217129	746	15
211	Sprachmittlung bei SIBUZ Pankow	volunteering		noTranslation		2025-11-01 20:51:25.237789	2025-11-01 20:51:25.237789	747	64
212	Begleitung zur Charite (Urologie)	volunteering		noTranslation		2025-11-01 20:51:25.258104	2025-11-01 20:51:25.258104	748	74
213	Begleitung zum Radiologietermin	volunteering		noTranslation		2025-11-01 20:51:25.277857	2025-11-01 20:51:25.277857	749	54
214	Übersetzer für den Psychiater	volunteering		noTranslation		2025-11-01 20:51:25.293839	2025-11-01 20:51:25.293839	750	75
215	Begleitung beim Arzttermin für Bewohnerin	volunteering		noTranslation		2025-11-01 20:51:25.314397	2025-11-01 20:51:25.314397	751	54
216	Begleitung Türkisch-Deutsch Psychologe Kaulsdorf	volunteering		noTranslation		2025-11-01 20:51:25.332877	2025-11-01 20:51:25.332877	752	64
217	Wegbegleitung zum PIA-Termin	volunteering		noTranslation		2025-11-01 20:51:25.350216	2025-11-01 20:51:25.350216	753	10
218	Begleitung zu einem Anwaltstermin im Rathaus Neukölln	volunteering		noTranslation		2025-11-01 20:51:25.369473	2025-11-01 20:51:25.369473	754	39
219	Unterstützung bei Sport-, Spiel- und Kreativangeboten	volunteering		noTranslation		2025-11-01 20:51:25.40307	2025-11-01 20:51:25.40307	755	7
220	Nachhilfe für Grundschulkinder	volunteering	Wir suchen nach einer Nachhilfe für die Grundschulkinder. Uhrzeit ab 15.30 Uhr, montags oder donnerstags. (gute Deutschkenntnisse sind Voraussetzung)	noTranslation		2025-11-01 20:51:25.418012	2025-11-01 20:51:25.418012	756	2
221	Yogakurs für Mädchen und Frauen	volunteering	Wir würden zur baldigen Eröffnung unseres Frauenraums gerne regelmäßig für einen kleinen Frauenkreis Yoga anbieten und suchen nach einer empathischen Frau, die Lust hätte ihr Hobby/Profession mit uns zuteilen ;).	noTranslation		2025-11-01 20:51:25.442888	2025-11-01 20:51:25.442888	757	2
222	Unterstützung für unser Männercafé	volunteering	Wir organisieren mit dem BENN-Team ein Männercafé für die Bewohner und planen ein Mal pro Monat auch Männer aus der Nachbarschaft einzuladen. Dafür brauchen wir einen Freiwilligen, der die Männer sprachlich unterstütz, indem er Deutsch-Farsi und Farsi-Deutsch übersetzt. Es gibt derzeit keinen festen Termin.	noTranslation		2025-11-01 20:51:25.464508	2025-11-01 20:51:25.464508	758	41
223	Begleitung zur Krankenkasse (AOK) Termin	volunteering		noTranslation		2025-11-01 20:51:25.47941	2025-11-01 20:51:25.47941	759	39
224	Ausfüllhilfen von Dokumenten	volunteering	* gerne auch immer zu festen Zeiten - je nach Präferenz (immer nur wochentags, nicht am Wochenende)	noTranslation		2025-11-01 20:51:25.514004	2025-11-01 20:51:25.514004	760	6
225	Organisation von sportlichen Angeboten	volunteering	* gerne auch immer zu festen Zeiten - je nach Präferenz (immer nur wochentags, nicht am Wochenende)	noTranslation		2025-11-01 20:51:25.550902	2025-11-01 20:51:25.550902	761	6
226	Kleiderkammer Betreuung	volunteering	Wir brauchen Hilfe für die regelmäßige Betreuung der Kleiderkammer	noTranslation		2025-11-01 20:51:25.578204	2025-11-01 20:51:25.578204	762	24
227	Freizeitangebot für Kinder	volunteering	Wir sind eine Erstaufnahmeeinrichtung in Marzahn und freuen uns über Freiwillige, die mit unseren Kindern Kreativ-oder Sportangebote durchführen.	noTranslation		2025-11-01 20:51:25.607795	2025-11-01 20:51:25.607795	763	5
228	Wegbegleitung von Marzahn nach Tegel	volunteering		noTranslation		2025-11-01 20:51:25.627329	2025-11-01 20:51:25.627329	764	74
229	Begleitung zum Hautarzt	volunteering		noTranslation		2025-11-01 20:51:25.647421	2025-11-01 20:51:25.647421	765	76
230	Unterstützung von Sozialarbeitern bei Übersetzungen - Türkisch und Kurdisch in Treptow	volunteering	Wir würden uns freuen, wenn uns jemand mit Türkisch- oder/und Kurdischkenntnisen bei den Sprechstunden unterstützen konnten.\nEinmal die Woche recht.	noTranslation		2025-11-01 20:51:25.667488	2025-11-01 20:51:25.667488	766	1
231	Ausfüllhilfe für Bewohner*innen	volunteering	Unterstütze Bewohner*innen einer Unterkunft in Treptow-Köpenick, indem du mit ihnen verschiedene Formulare ausfüllst, z.B. Jobcenter, Sozialamt, Familienkasse etc.\nDer Einsatz kann individuell mit der EAK abgesprochen werden.\nDeutschkenntnisse sind erforderlich.	noTranslation		2025-11-01 20:51:25.697625	2025-11-01 20:51:25.697625	767	1
232	Sport und Aktivitäten für Kinder und Jugendliche in Hellersdorf	volunteering	Wir suchen nach Freiwilligen, die uns für mindestens 6 Monate unterstützen möchten.	noTranslation		2025-11-01 20:51:25.729539	2025-11-01 20:51:25.729539	768	77
233	Begleitung zum und vom ambulanten Eingriff im Krankenhaus Vivantes Urban	volunteering		noTranslation		2025-11-01 20:51:25.747847	2025-11-01 20:51:25.747847	769	25
234	Begleitung zum LAF-Behörde	volunteering		noTranslation		2025-11-01 20:51:25.765125	2025-11-01 20:51:25.765125	770	1
235	Begleitung zum Jugendamt	volunteering		noTranslation		2025-11-01 20:51:25.780049	2025-11-01 20:51:25.780049	771	18
236	Nachhilfe	volunteering	Möchten Sie Kinder und Jugendliche beim Lernen unterstützen? Wir suchen Freiwillige, die regelmäßig bei den Hausaufgaben helfen und Freude am gemeinsam Lernen haben. In einer offenen und freundlichen Atmosphäre können Sie Wissen vermitteln, Motivation fördern un einen wertvollen Beitrag zur Bildung leisten. Die Kinder freuen sich schon auf Sie!	noTranslation		2025-11-01 20:51:25.817604	2025-11-01 20:51:25.817604	772	12
237	Fahrradwerkstatt	volunteering		noTranslation		2025-11-01 20:51:25.853381	2025-11-01 20:51:25.853381	773	21
238	Sprachunterricht	volunteering	Wir würden uns sehr freuen, wenn es Freiweillige gibt, die unseren Bewohner Deutsch beibringen würden. Für die Älteren z.B. einfaches Deutsch, um sich in der Apotheke ein Nasenspray holen zu können, nach dem Weg fragen. Also eine leichte Kommunikation	noTranslation		2025-11-01 20:51:25.872289	2025-11-01 20:51:25.872289	774	35
239	Nachhilfe Grundschule / Oberschule	volunteering	Wir bräuchten Unterstützung für unsere Schüler.	noTranslation		2025-11-01 20:51:25.891628	2025-11-01 20:51:25.891628	775	35
240	Begleitung zu Augenarzt	volunteering		noTranslation		2025-11-01 20:51:25.908101	2025-11-01 20:51:25.908101	776	18
241	Deutschlernen A1.2	volunteering	In der Nachhilfe können gemeinsam die Unterlagen aus dem Kursbuch nachbearbeitet werden, Hausaufgaben erledigt werden, sich einfach so unterhalten werden oder die/der Ehrenamtliche nutzt Unterlagen aus unserem Fundus hier in der Unterkunft oder bringt- sehr gern auch- eigene Ideen ein.   Shoukreya kann sich gut Montags bis Donnerstag am Nachmittag ab 14.30 Uhr bis 18 Uhr flexibel treffen, gern ein- bis zweimal wöchentlich an einem regelmäßigen Tag. Es wäre am Einfachsten für Sie, wenn man sich im Hausaufgabenraum im Osteweg treffen könnte.	noTranslation		2025-11-01 20:51:25.924835	2025-11-01 20:51:25.924835	777	36
242	Job Center Spandau Termin Begleitung	volunteering		noTranslation		2025-11-01 20:51:25.942996	2025-11-01 20:51:25.942996	778	32
243	Begleitung zum MVZ für Familien	volunteering		noTranslation		2025-11-01 20:51:25.964217	2025-11-01 20:51:25.964217	779	78
244	Übersetzungsbegleitung zur Sparkasse (Kontoeröffnung)	volunteering		noTranslation		2025-11-01 20:51:25.982998	2025-11-01 20:51:25.982998	780	18
245	Sparkassen-Termin, Kontoeröffnung	volunteering		noTranslation		2025-11-01 20:51:26.002337	2025-11-01 20:51:26.002337	781	18
246	Unterstützung Mathe 8.Klasse	volunteering	Eine Schülerin (15 Jahre alt) sucht eine Frau, die mit ihr gemeinsam Mathe üben kann ( (zzt. Binomische Formeln).	noTranslation		2025-11-01 20:51:26.021308	2025-11-01 20:51:26.021308	782	36
247	Russischdolmetscher für die Begleitung zum Gastroenterelogen	volunteering		noTranslation		2025-11-01 20:51:26.040155	2025-11-01 20:51:26.040155	783	9
248	Sprachmittlung im Vivantes Klinikum Friedrichshain	volunteering		noTranslation		2025-11-01 20:51:26.058565	2025-11-01 20:51:26.058565	784	78
249	Begleitung von Nachhilfe für Kinder und Jugendliche	volunteering		noTranslation		2025-11-01 20:51:26.089308	2025-11-01 20:51:26.089308	785	79
250	Begleitung zum Arzttermin	volunteering		noTranslation		2025-11-01 20:51:26.108571	2025-11-01 20:51:26.108571	786	80
251	Begleitung zu Kinder Physiotherapie	volunteering		noTranslation		2025-11-01 20:51:26.132668	2025-11-01 20:51:26.132668	787	78
252	Begleitung zu Kinder Physiotherapie	volunteering		noTranslation		2025-11-01 20:51:26.157935	2025-11-01 20:51:26.157935	788	78
253	Begleitung zu Kinder Physiotherapie	volunteering		noTranslation		2025-11-01 20:51:26.187939	2025-11-01 20:51:26.187939	789	78
254	Unterstütze in den Ferien mit den Kindern	volunteering	Habt ihr Lust vielleicht nächste Woche, mir, in den Ferien mit den Kindern zu helfen? Zum Beispiel Mittwoch (05.02) können wir vormittags ins Kino gehen da wäre eine Unterstützung cool und am Freitag (07.02) könnten wir mit den Kindern kochen/Pizza machen.	noTranslation		2025-11-01 20:51:26.205592	2025-11-01 20:51:26.205592	790	33
255	Nachhilfe in Pankow	volunteering	Unterstütze Kinder, indem du ihnen Nachhilfeunterricht in verschiedenen Schulfächern gibst. Grundschüler benötigen die meiste Unterstützung.	noTranslation		2025-11-01 20:51:26.222785	2025-11-01 20:51:26.222785	791	40
256	Nachhilfe für Kinder in Neukölln	volunteering	Es werden Freiwillige gesucht, die Schulkindern bei ihren Hausaufgaben helfen. Die Kinder sprechen Deutsch.	noTranslation		2025-11-01 20:51:26.242703	2025-11-01 20:51:26.242703	792	62
257	Nachhilfe in Lichtenberg	volunteering	Die Kinder sprechen Deutsch, wir wissen nichts über ihr Alter. Sie würden Hilfe in verschiedenen Fächern benötigen.	noTranslation		2025-11-01 20:51:26.267493	2025-11-01 20:51:26.267493	793	3
258	Begleitung zum Hautarzt	volunteering		noTranslation		2025-11-01 20:51:26.288507	2025-11-01 20:51:26.288507	794	78
259	Sprachmittlungsbegleitung zum Standesamt	volunteering		noTranslation		2025-11-01 20:51:26.30467	2025-11-01 20:51:26.30467	795	18
260	Dolmetscher (Arabisch-Deutsch) zum KJGD	volunteering		noTranslation		2025-11-01 20:51:26.325238	2025-11-01 20:51:26.325238	796	18
261	Begleitung zur Verbraucherzentrale	volunteering		noTranslation		2025-11-01 20:51:26.344356	2025-11-01 20:51:26.344356	797	9
262	Sporttrainer*in für einen Sportraum	volunteering	Für unseren kleinen Sportraum benötigen wir einen männlichen sowie eine weibliche Ehrenamtliche, die Lust und Spaß daran hätte unsere Bewohner Anleitungen zur Anwendung der Sportgeräte zu geben. Im Moment haben wir ein Fausthantelset, ein Liegestützgriff sowie Mini-Bänder. Yoga-Matten haben wir ebenfalls. Da Männer und Frauen getrennt trainieren möchten brauchen wir entsprechen 1 männlicher Ehrenamtliche für den Männern und 1 weibliche Ehrenamtliche für die Frauen.	noTranslation		2025-11-01 20:51:26.370917	2025-11-01 20:51:26.370917	798	60
263	Vivantes MVZ Landsberger Allee Gesundheitszentrum für Kinder	volunteering		noTranslation		2025-11-01 20:51:26.388227	2025-11-01 20:51:26.388227	799	7
264	Ehrenamtliche*r für die Fahrradwerkstatt	volunteering	Die Gemeinschaftsunterkunft Kiefholzstraße 71 verfügt über eine vollständige Fahrradwerkstatt. Werkzeug ist vorhanden. Der oder die Freiwillige kann ein bis zwei Stunden in der Woche alte Fahrräder reparieren, welche Bewohnenden dann zu verfügung gestellt werden. Eine weitere Aufgabe ist es den Kindern der Unterkunft beim Aufpumpen der eigenen Fahrräder zu helfen oder Schrauben wieder fest zu drehen.	noTranslation		2025-11-01 20:51:26.415976	2025-11-01 20:51:26.415976	800	63
265	Dolmetschung für Arzttermin	volunteering		noTranslation		2025-11-01 20:51:26.43441	2025-11-01 20:51:26.43441	801	78
266	Bastelstunden in Treptow	volunteering	Organisiere Aktivitäten für Kinder und unterstütze die Kinderbetreuer*innen bei der Planung von Bastelaktivitäten.	noTranslation		2025-11-01 20:51:26.461124	2025-11-01 20:51:26.461124	802	22
267	Sprachmittlung Farsi-Deutsch für unseren Sozialdienst	volunteering	Wir suchen nach Unterstützung mit der Farsi-Deutsch-Sprachmittlung für unseren Sozialdienst während Sprechstunden. Ihr könnt uns entweder vor Ort oder telefonisch unterstützen, die Zeiten besprechen wir mit jeder*n persönlich.	noTranslation		2025-11-01 20:51:26.483389	2025-11-01 20:51:26.483389	803	36
268	Nachhilfe ab 5. Klasse	volunteering	Wir suchen nach Freiwilligen, die die Kinder ab 5. Klasse Nachhilfe-Unterricht anbieten können.	noTranslation		2025-11-01 20:51:26.502105	2025-11-01 20:51:26.502105	804	36
269	Sport für Geflüchtete	volunteering	Treibe Sport mit den Bewohner*innen unserer Unterkunft zusammmen!	noTranslation		2025-11-01 20:51:26.533841	2025-11-01 20:51:26.533841	805	7
270	Basteln & Malangebote für Kinder	volunteering	Wir suchen nach Freiwillige, die mit den Kinder zusammen malen und basteln möchten.	noTranslation		2025-11-01 20:51:26.559361	2025-11-01 20:51:26.559361	806	7
271	Biete Frauen eine Sportstunde an	volunteering	Wir suchen nach einer Trainerin, die den Frauen in unserer Unterkunft eine Sportstunde (z.B. Bewegungsübungen oder Ähnliches) anbieten könnte.	noTranslation		2025-11-01 20:51:26.60063	2025-11-01 20:51:26.60063	807	81
272	Begleitung zur Klinik für Psychiatrie	volunteering		noTranslation		2025-11-01 20:51:26.615855	2025-11-01 20:51:26.615855	808	1
273	Begleitung zum Arzttermin	volunteering		noTranslation		2025-11-01 20:51:26.631316	2025-11-01 20:51:26.631316	809	39
274	Unterstütze ein Frauentreffen bei Handarbeit	volunteering	Wir organisieren freitags nachmittags ab 15.00 Uhr einen Frauentreff und könnte dafür auch Unterstützung gebrauchen. Beim Frauentreff werden Handarbeiten (Stricken, Nähen, Basteln etc.) angeboten.  Für die Zukunft sind auch Ausflüge geplant. Wichtig ist, dass es eine weibliche Freiwillige ist.	noTranslation		2025-11-01 20:51:26.65494	2025-11-01 20:51:26.65494	810	60
275	Sprachcafé für Männer*	volunteering	Organisiere und leite ein Sprachcafé für Männer* in einer Gemeinschaftsunterkunft in Neukölln. Es wäre toll, wenn Du in diesem Bereich schon Erfahrung hättest und regelmäßig kommen könntest.	noTranslation		2025-11-01 20:51:26.68149	2025-11-01 20:51:26.68149	811	82
276	Gestalte didaktische Aktivitäten für Kinder	volunteering	Wir suchen Freiwillige, die Lust haben, einmal in der Woche mit Kindern eine pädagogische Aktivität zu machen (Musik, Kunst, Basteln, Geschichten vorlesen und darüber sprechen, oder auch Gärtnern, Backen, Sport...). Wir sind offen für Ideen.  Uhrzeiten: Dienstag, Mittwoch oder Freitag ab 16.30 Uhr bis spätestens 18.00 Uhr.	noTranslation		2025-11-01 20:51:26.705278	2025-11-01 20:51:26.705278	812	60
277	Dolmetscher (Arabisch-Deutsch)	volunteering		deutsche		2025-11-01 20:51:26.717974	2025-11-01 20:51:26.717974	813	18
278	Begleitung/dolmetschen zum Arzttermin	volunteering		noTranslation		2025-11-01 20:51:26.736544	2025-11-01 20:51:26.736544	814	78
279	Kinderbetreuung in Wilmersdorf	volunteering	In der Regel sind es 3-7 Kinder und 1 Kinderbetreuerin. Sie wünschte sich Unterstützung und jemanden, der neue Ideen in die Kinderbetreuung bringt.\nSie spricht kein Englisch.	noTranslation		2025-11-01 20:51:26.759422	2025-11-01 20:51:26.759422	815	57
280	Nachhilfe für unsere Schulkinder	volunteering	Wir freuen uns über Freiwillige, die gerne mit Kindern arbeiten und ihnen bei den Hausaufgaben und bei der Vorbereitung von Prüfungen helfen.	noTranslation		2025-11-01 20:51:26.775977	2025-11-01 20:51:26.775977	816	2
281	Begleitung zum Termin, Übersetzung Französisch	volunteering		noTranslation		2025-11-01 20:51:26.790507	2025-11-01 20:51:26.790507	817	61
282	Gartenarbeit in Neukölln	volunteering	Der Zeitplan ist flexibel und kann mit den Freiwilligen abgesprochen werden. Die Idee ist, neue Hochbeete zu bauen und sie mit allem zu bepflanzen, was die Bewohner*innen dort haben möchten.	noTranslation		2025-11-01 20:51:26.80854	2025-11-01 20:51:26.80854	818	60
283	Dolmetscher Arabisch oder Kurmandschi	volunteering		deutsche		2025-11-01 20:51:26.831458	2025-11-01 20:51:26.831458	819	20
284	Sei Teil der Fahrradwerkstatt	volunteering	Sei Teil unserer Fahrradwerkstatt und repariere Fahrräder mit den Bewohner*innen zusammen.	noTranslation		2025-11-01 20:51:26.856489	2025-11-01 20:51:26.856489	820	63
285	Begleitung zum Virchow Klinikum (Charite)	volunteering		noTranslation		2025-11-01 20:51:26.874519	2025-11-01 20:51:26.874519	821	83
286	Begleitung zur Schuldnerberatung und Insolvenzberatung	volunteering		noTranslation		2025-11-01 20:51:26.889876	2025-11-01 20:51:26.889876	822	9
287	Begleitung zur Charite	volunteering		noTranslation		2025-11-01 20:51:26.904915	2025-11-01 20:51:26.904915	823	54
288	Unterstütze queere Geflüchtete bei Ankommen in Berlin	volunteering	Unterstütze queere Geflüchtete, die neu in Berlin sind, dabei, die Stadt und ihre Infrastruktur kennenzulernen!\nDie Idee für diese Freiwilligenarbeit ist, dass du eine Person in ihren ersten Wochen in Berlin unterstützt, ihr die Stadt zeigst und ihr Informationen über tolle queere Räume in Berlin gibst.	noTranslation		2025-11-01 20:51:26.936592	2025-11-01 20:51:26.936592	824	66
289	Begleitung zur Augenklinik (Vivantes Neukölln)	volunteering		noTranslation		2025-11-01 20:51:26.952578	2025-11-01 20:51:26.952578	825	78
290	Winterfest in Lichtenberg	volunteering	Eine Unterkunft in Lichtenberg plant ein Winterfest für die Bewohner*innen. Freiwillige werden gesucht für\n- Unterstützung bei den Vorbereitungen ab 12 Uhr\n- Ausgabe von Speisen und Getränken ab 15 Uhr\n- Organisation von Aktivitäten für Kinder und Erwachsene ab 15 Uhr	noTranslation		2025-11-01 20:51:26.966288	2025-11-01 20:51:26.966288	826	33
291	Unterstützung bei der Gartenarbeit (Gemüsegarten)	volunteering	Es gibt einen kleinen Gemüsegarten im Hof, und die Mitarbeiter*innen würden sich über die Unterstützung einer Person freuen, die sich mit dem Gärtnern auskennt.\nDie Gartensaison wäre etwa Mitte Oktober zu Ende.	noTranslation		2025-11-01 20:51:26.986782	2025-11-01 20:51:26.986782	827	28
292	Organisiere Sportunterricht für Jugendliche	volunteering	Organisiere sportliche Aktivitäten, z. B. Tischtennis, Tischfußball, Basketball, Kickboxen usw. für Jugendliche und Kinder in einer Unterkunft!\nDu kannst auch Ihre eigenen Ideen für weitere lustige Aktivitäten einbringen.	noTranslation		2025-11-01 20:51:27.00887	2025-11-01 20:51:27.00887	828	46
293	Begleite Kinder aus Grünau nach Altglienicke	volunteering	Begleite Kinder, die in einer Unterkunft in Grünau leben, einmal pro Woche zum Zirkus Cabuwazi in Altglienicke und zurück.	noTranslation		2025-11-01 20:51:27.030295	2025-11-01 20:51:27.030295	829	16
294	Accompany to the Charité (Neurology)	volunteering		noTranslation		2025-11-01 20:51:27.047016	2025-11-01 20:51:27.047016	830	39
295	Accompany to the Charité (Neurology)	volunteering		noTranslation		2025-11-01 20:51:27.070229	2025-11-01 20:51:27.070229	831	39
296	Accompany to a debt counselling	volunteering		noTranslation		2025-11-01 20:51:27.085581	2025-11-01 20:51:27.085581	832	9
297	Begleitung zum Psychiatrietermin	volunteering		noTranslation		2025-11-01 20:51:27.104304	2025-11-01 20:51:27.104304	833	64
298	Aktivitäten für Kleinkinder (1-3 Jahre)	volunteering	Plane Aktivitäten für Kleinkinder (1-3 Jahre) in einer Gemeinschaftsunterkunft für Geflüchtete. Sie haben vor kurzem einen speziellen Raum für Kleinkinder eröffnet und würden gerne von Freiwilligen unterstützt werden, die Erfahrung mit kleinen Kindern haben und gerne Zeit mit ihnen verbringen.	noTranslation		2025-11-01 20:51:27.118463	2025-11-01 20:51:27.118463	834	61
299	Brettspiele mit Jugendlichen spielen	volunteering	Spiele Brettspiele mit Jugendlichen im neuen Jugendraum in der Gemeinschaftsunterkunft für Geflüchtete. Dort gibt es auch einen Fernseher, damit du mit ihnen Filme anschauen kannst.	noTranslation		2025-11-01 20:51:27.138516	2025-11-01 20:51:27.138516	835	61
300	Organisiere ein Sprachcafé in Britz	volunteering	Jeder*e Bewohner*in der Unterkunft ist willkommen, am Sprachcafé teilzunehmen. Das Ziel des Sprachcafés ist es, den Bewohnern einen sicheren Raum zu bieten, in dem sie Deutsch üben und nützliche Wörter und Redewendungen lernen können.\nEs sollte sehr zugänglich sein.\nEs gibt dort kein Sprachcafé, also sollten Freiwillige in der Lage sein, es einzurichten und zu leiten.	noTranslation		2025-11-01 20:51:27.16484	2025-11-01 20:51:27.16484	836	82
301	Supporting with daycare	volunteering	Die meisten der Kinder kommen aus Syrien. Die Koordinatorin der Tagesstätte spricht nur Deutsch. Sie brauchen eine unabhängige Person mit Erfahrung in der Kinderbetreuung.\nSie würden auch gerne Freiwillige finden, die mit den Kindern Fußball spielen können.	noTranslation		2025-11-01 20:51:27.185417	2025-11-01 20:51:27.185417	837	82
302	Plane Ausflüge für Frauen in Britz	volunteering	Freiwillige können mit ihnen in Museen gehen, in der Nachbarschaft spazieren gehen oder andere schöne Dinge unternehmen. Museen und Galerien bieten manchmal kostenlose Eintrittskarten für Geflüchtete an.	noTranslation		2025-11-01 20:51:27.213677	2025-11-01 20:51:27.213677	838	82
303	Accompany to an MRI appointment	volunteering		noTranslation		2025-11-01 20:51:27.228743	2025-11-01 20:51:27.228743	839	40
304	Nachhilfeunterricht (Englisch und Deutsch) in Zehlendorf	volunteering	Sie brauchen Freiwillige, die Kinder bei der Nachhilfe und bei den Hausaufgaben (verschiedene Schulfächer, einschließlich Englisch) unterstützen können. Die Kinder sprechen Deutsch und sind in verschiedenen Klassenstufen. Die Freiwilligen sollten Deutsch sprechen können, außer für die englische Nachhilfe.	noTranslation		2025-11-01 20:51:27.249039	2025-11-01 20:51:27.249039	840	58
305	Begleitung zum Neurologen	volunteering		noTranslation		2025-11-01 20:51:27.270544	2025-11-01 20:51:27.270544	841	28
440	Translation at Amtsgericht Schöneberg on the 28th of March at 9:30	volunteering		noTranslation		2025-11-01 20:51:29.864798	2025-11-01 20:51:29.864798	976	10
306	Nachhilfe in Neukölln	volunteering	Es handelt sich um eine regelmäßige Freiwilligenarbeit (einmal pro Woche). Es wird Unterstützung für Schulkinder in verschiedenen Fächern benötigt. Die Kinder sprechen Deutsch, also sollte der Freiwillige auch Deutsch sprechen können.	noTranslation		2025-11-01 20:51:27.286424	2025-11-01 20:51:27.286424	842	60
307	Translate at the LAF	volunteering		noTranslation		2025-11-01 20:51:27.299998	2025-11-01 20:51:27.299998	843	83
308	Begleitung zur Hochschulambulanz für Augenheilkunde	volunteering		noTranslation		2025-11-01 20:51:27.320338	2025-11-01 20:51:27.320338	844	10
309	Unterstützung einer älteren Frau im Alltag	volunteering	Helfen Sie einer 80-jährigen Frau aus der Ukraine bei alltäglichen Verrichtungen, wie z. B. beim Einkaufen im Supermarkt, beim Schuhekaufen usw. Diese Möglichkeit ist flexibel und wird direkt mit dem Flüchtling vereinbart.	noTranslation		2025-11-01 20:51:27.338158	2025-11-01 20:51:27.338158	845	80
310	Accompany a refugee to the appointment and back	volunteering		noTranslation		2025-11-01 20:51:27.353614	2025-11-01 20:51:27.353614	846	58
311	Accompany to a kid’s doctor	volunteering		noTranslation		2025-11-01 20:51:27.368579	2025-11-01 20:51:27.368579	847	79
312	Winterfest in Marzahn	volunteering	Für die Weihnachtsfeier am 13. Dezember können Sie den Kindern Weihnachtsgeschichten vorlesen und/oder den Weihnachtsmann spielen - ideal wären natürlich Weihnachtsgeschichten. Wenn Sie daran Spaß haben und kreativ sind, lassen Sie es uns wissen!	noTranslation		2025-11-01 20:51:27.380568	2025-11-01 20:51:27.380568	848	10
313	Accompany to debt counselling	volunteering		noTranslation		2025-11-01 20:51:27.395507	2025-11-01 20:51:27.395507	849	9
314	Accompany to a counselling appointment	volunteering		noTranslation		2025-11-01 20:51:27.409562	2025-11-01 20:51:27.409562	850	61
315	Accompany to a pre-school check up	volunteering		noTranslation		2025-11-01 20:51:27.424188	2025-11-01 20:51:27.424188	851	18
316	Accompany to an MRI appointment	volunteering		noTranslation		2025-11-01 20:51:27.441404	2025-11-01 20:51:27.441404	852	78
317	Begleitung zum Unfallkrankenhaus Berlin	volunteering		noTranslation		2025-11-01 20:51:27.462538	2025-11-01 20:51:27.462538	853	10
318	Support with daycare in Lichtenberg	volunteering	Sie brauchen Freiwillige, die sie bei der Kinderbetreuung unterstützen und neue kreative Ideen einbringen.	noTranslation		2025-11-01 20:51:27.487855	2025-11-01 20:51:27.487855	854	3
319	Begleitung zur Charité	volunteering		noTranslation		2025-11-01 20:51:27.50202	2025-11-01 20:51:27.50202	855	8
320	Sprachmittlung für Sozialarbeiter*innen	volunteering	Sie brauchen Freiwillige, die die Sozialarbeiter*innen bei den Beratungen für die Bewohner*innen unterstützen. Der Zeitplan wird individuell besprochen.	noTranslation		2025-11-01 20:51:27.520929	2025-11-01 20:51:27.520929	856	3
321	Begleitung zu Vivantes Neukölln	volunteering		noTranslation		2025-11-01 20:51:27.53698	2025-11-01 20:51:27.53698	857	64
322	Begleitung zur Charité Wedding	volunteering	Klinik für Hepatopogie und Gastoenterologie, Sprechstunde für gastrointestinale Onkologie	noTranslation		2025-11-01 20:51:27.553619	2025-11-01 20:51:27.553619	858	46
323	Begleitung zur Charité Wedding	volunteering		noTranslation		2025-11-01 20:51:27.568907	2025-11-01 20:51:27.568907	859	46
324	Begleitung zum Gesundheitsamt Neukölln	volunteering		noTranslation		2025-11-01 20:51:27.586134	2025-11-01 20:51:27.586134	860	39
325	Accompany to the Charit	volunteering		noTranslation		2025-11-01 20:51:27.599551	2025-11-01 20:51:27.599551	861	10
326	Translate from English to German for a doctor’s appointment	volunteering		noTranslation		2025-11-01 20:51:27.621788	2025-11-01 20:51:27.621788	862	84
327	Begleitung zum Arzttermin (Gastroenterologie)	volunteering		noTranslation		2025-11-01 20:51:27.638421	2025-11-01 20:51:27.638421	863	40
328	Accompany to Venenzentrum	volunteering		noTranslation		2025-11-01 20:51:27.657022	2025-11-01 20:51:27.657022	864	39
329	Begleitung zur Physiotherapie	volunteering		noTranslation		2025-11-01 20:51:27.673697	2025-11-01 20:51:27.673697	865	46
330	Begleitung zur Schulanmeldung	volunteering		noTranslation		2025-11-01 20:51:27.694975	2025-11-01 20:51:27.694975	866	77
331	Begleitung zu einer MRT-Untersuchung	volunteering		noTranslation		2025-11-01 20:51:27.710822	2025-11-01 20:51:27.710822	867	40
332	Begleitung zur Physiotherapie	volunteering		noTranslation		2025-11-01 20:51:27.73062	2025-11-01 20:51:27.73062	868	46
333	Begleitung zur Physiotherapie	volunteering		noTranslation		2025-11-01 20:51:27.74737	2025-11-01 20:51:27.74737	869	46
334	Begleitung zur Physiotherapie	volunteering		noTranslation		2025-11-01 20:51:27.764043	2025-11-01 20:51:27.764043	870	46
335	Begleitung zur Physiotherapie	volunteering		noTranslation		2025-11-01 20:51:27.779229	2025-11-01 20:51:27.779229	871	46
336	Accompany to a paediatrician appointment	volunteering		noTranslation		2025-11-01 20:51:27.793016	2025-11-01 20:51:27.793016	872	79
337	Accompany to a pediatrician appointment	volunteering		noTranslation		2025-11-01 20:51:27.807127	2025-11-01 20:51:27.807127	873	39
338	Accompany to a radiology appointment	volunteering		noTranslation		2025-11-01 20:51:27.822214	2025-11-01 20:51:27.822214	874	79
339	Accompany to an apartment viewing	volunteering		noTranslation		2025-11-01 20:51:27.838359	2025-11-01 20:51:27.838359	875	83
340	Sprachmittlung für eine Schulhilfekonferenz	volunteering		noTranslation		2025-11-01 20:51:27.85411	2025-11-01 20:51:27.85411	876	64
341	Accompany to a neurology appointment	volunteering		noTranslation		2025-11-01 20:51:27.871107	2025-11-01 20:51:27.871107	877	79
342	Begleitung zur Physiotherapie	volunteering		noTranslation		2025-11-01 20:51:27.887174	2025-11-01 20:51:27.887174	878	46
343	Sprachcafé in Neukölln	volunteering	Dieses Sprachcafé gibt es nun schon seit über einem Jahr. Es hat eine Kerngruppe von Teilnehmer*innen, die hauptsächlich Arabisch sprechen, aber alle sind willkommen, sich ihm anzuschließen.	noTranslation		2025-11-01 20:51:27.902803	2025-11-01 20:51:27.902803	879	39
344	Spiele Brettspiele mit Bewohner*innen einer Unterkunft in Grünau	volunteering	Spielen Sie Tischspiele mit den Bewohnern!	noTranslation		2025-11-01 20:51:27.932812	2025-11-01 20:51:27.932812	880	85
345	Nachhilfeunterricht in Grünau	volunteering	Unterstütze die Kinder beim Erlernen und Verbessern ihrer Deutschkenntnisse und beim Erledigen ihrer Hausaufgaben.	noTranslation		2025-11-01 20:51:27.962886	2025-11-01 20:51:27.962886	881	85
346	Deutschunterricht in Grünau	volunteering	Unterstütze die Bewohner*innen beim Erlernen und Verbessern ihrer Deutschkenntnisse:\n- Leite ein Sprachcafé und unterrichte dort Deutsch\n- Unterstütze sie beim Deutschlernen im Einzelunterricht.	noTranslation		2025-11-01 20:51:27.99193	2025-11-01 20:51:27.99193	882	85
347	Englisch- und Deutschnachhilfe für eine arabischsprachige Person	volunteering	Eine Geflüchtete studiert Sozialarbeit und braucht Unterstützung in Deutsch und Englisch.	noTranslation		2025-11-01 20:51:28.008149	2025-11-01 20:51:28.008149	883	64
348	Tischtennis spielen in Treptow-Köpenick	volunteering	Im Hof gibt es eine Tischtennisplatte. Sie brauchen einen Freiwilligen, der vorbeikommt und mit den Bewohnern spielt. Die Zeiten können flexibel sein.	noTranslation		2025-11-01 20:51:28.033008	2025-11-01 20:51:28.033008	884	85
349	Unterstützung bei der Einrichtung eines Raums für Jugendliche in Lichtenberg	volunteering	Sie sind gerade dabei, ihren Jugendraum zu gestalten und suchen derzeit eine freiwillige Person, die ihnen bei der Gestaltung des Raums hilft und den Raum dann 1-2 Mal pro Woche nachmittags für Kinder zwischen 9 und 17 Jahren betreut.	noTranslation		2025-11-01 20:51:28.058412	2025-11-01 20:51:28.058412	885	4
350	Sportstunde für Erwachsene	volunteering	Organisiere sportliche Aktivitäten für Erwachsene!	noTranslation		2025-11-01 20:51:28.074031	2025-11-01 20:51:28.074031	886	57
351	Accompany groups of children to a swimming class	volunteering	Volunteers are needed to accompany groups of children to a swimming class during the autumn break.	noTranslation		2025-11-01 20:51:28.090586	2025-11-01 20:51:28.090586	887	20
352	Begleite Kinder zum Judo-Unterricht	volunteering	In der Unterkunft gibt es Kinder, die sich für das Judotraining interessieren.\nEs findet jeden Dienstag statt.\n\nDie Freiwilligen müssen um 16 Uhr hier sein. Die Aufgabe ist es, mit den Kindern (9-11 Kinder) in die Sporthalle zu gehen und sie nach dem Judotraining wieder hierher zu bringen.	noTranslation		2025-11-01 20:51:28.106824	2025-11-01 20:51:28.106824	888	20
353	Büchervorlesung für Kinder in Karow	volunteering	Unterstütze die Kinderbetreuer*innen, indem du Bücher für oder mit Kindern in der Unterkunft liest.	noTranslation		2025-11-01 20:51:28.124992	2025-11-01 20:51:28.124992	889	86
354	Sprachcafé/Deutschunterricht in Karow	volunteering	Es werden Freiwillige gesucht, die den Bewohnern die Grundlagen der deutschen Sprache beibringen (erste Begriffe des täglichen Lebens etc.) oder Nachhilfe geben. Ein bis zweimal pro Woche wäre ausreichend.\nWenn du Erfahrung im Unterrichten von Deutsch hast, ist diese Freiwilligenarbeit genau das Richtige für dich!\nDie Zeiten werden individuell besprochen.	noTranslation		2025-11-01 20:51:28.13947	2025-11-01 20:51:28.13947	890	86
355	Englischunterricht für einen Jugendlichen	volunteering	Ein 14-jähriger Junge sucht Unterstützung in Englisch, da er Schwierigkeiten hat, mit dem Lehrplan seiner Englischklasse Schritt zu halten.\nEs ist wichtig, dass der Freiwillige zumindest etwas Deutsch spricht.	noTranslation		2025-11-01 20:51:28.158162	2025-11-01 20:51:28.158162	891	58
356	Unterstütze eine Klederkammer in Karow	volunteering	Derzeit wird Hilfe für die Kleiderkammer benötigt. Dies betrifft sowohl das Einsortieren der Kleidung in die Regale nach Art und Größe als auch die Verteilung der Kleidung, wenn eine Person oder Familie aus dem Zentrum etwas benötigt. Eine Unterstützung an nur einem Tag in der Woche wäre sehr hilfreich.	noTranslation		2025-11-01 20:51:28.171434	2025-11-01 20:51:28.171434	892	86
357	Einmal pro Woche für Sozialarbeiter*innen übersetzen	volunteering	Die Sozialarbeiterinnen einer Unterkunft in Pankow brauchen Unterstützung beim Übersetzen ins Französische und Deutsche für neue Bewohnerinnen. Der Zeitplan ist flexibel und sollte nicht mehr als 2-3 Stunden pro Tag einmal pro Woche oder weniger in Anspruch nehmen, wenn du nicht jede Woche verfügbar bist.\nWenn du am Telefon übersetzen kannst, wäre das ebenfalls eine große Hilfe.	noTranslation		2025-11-01 20:51:28.193045	2025-11-01 20:51:28.193045	893	83
358	Unterstütze Sozialarbeiter*innen durch Sprachmittlung	volunteering	Wöchentliche Unterstützung für Sozialarbeiter - die Zeiten hängen von den Freiwilligen ab.\nSie brauchen Unterstützung in Türkisch, Dari und Französisch.	noTranslation		2025-11-01 20:51:28.216296	2025-11-01 20:51:28.216296	894	10
359	Organisiere Kinderbetreuung in Lichtenberg	volunteering	Sie brauchen Freiwillige, die helfen, Aktivitäten für Kinder zu organisieren und die Betreuer*innen zu unterstützen. Die Zeiten können mit dem Freiwilligen abgesprochen werden. Die meisten Kinder gehen zur Schule, daher findet die meiste Zeit der Tagesbetreuung zwischen 14 und 17 Uhr statt.	noTranslation		2025-11-01 20:51:28.25004	2025-11-01 20:51:28.25004	895	4
360	Sprachcafé in Hellersdorf	volunteering	Die Bewohner*innen einer Unterkunft wollen ihr Deutsch verbessern und können auch anderen Menschen ihre Sprache beibringen. Wenn jemand z.B. Farsi lernen möchte, kann er mit einem Bewohner ein Sprachtandem machen und sich gegenseitig helfen.\nDie Sprachen der Bewohner sind Farsi, Arabisch, Türkisch, Russisch und Französisch.	noTranslation		2025-11-01 20:51:28.264314	2025-11-01 20:51:28.264314	896	10
361	Unterstütze bei der Hausaufgabenhilfe	volunteering	Hausaufgabenhilfe für alle Altersstufen.	noTranslation		2025-11-01 20:51:28.282793	2025-11-01 20:51:28.282793	897	10
362	Accompany to a neurology appointment	volunteering		noTranslation		2025-11-01 20:51:28.295438	2025-11-01 20:51:28.295438	898	61
363	Kinderbetreuung in Spandau	volunteering		noTranslation		2025-11-01 20:51:28.315693	2025-11-01 20:51:28.315693	899	81
364	Sommerfest Refugium Lichtenberg	volunteering	Auf-Abbau, Kinderschminken, Getränke/Snacks Ausgabe, Spielangebote, Hüpfburg Betreuung	noTranslation		2025-11-01 20:51:28.333559	2025-11-01 20:51:28.333559	900	4
365	Richte eine Kleiderkammer ein	volunteering	Die Ehrenamtskoordinatorin möchte in der Unterkunft eine Kleiderkammer einrichten.\nEs werden 5-6 Personen gesucht, die bei dieser Aufgabe helfen können.	noTranslation		2025-11-01 20:51:28.352234	2025-11-01 20:51:28.352234	901	10
366	Mach Zuckerwatte bei einem Sommerfest	volunteering	Unterstützung bei der Herstellung von Zuckerwatte bei einem Sommerfest in einer Flüchtlingsunterkunft. Wenn Du ein paar Stunden Zeit hast, lass es uns bitte wissen!	noTranslation		2025-11-01 20:51:28.370702	2025-11-01 20:51:28.370702	902	1
367	Unterstütze die Kleiderkammer in Hellersdorf	volunteering	Es gibt eine Kleiderkammer, in der zwei der Bewohner*innen ehrenamtlich tätig sind. Sie würden gerne von anderen Freiwilligen unterstützt werden.\nDer Zeitplan kann mit der Ehrenamtskoordinatorin besprochen werden.\nEs werden auch Freiwillige benötigt, die bei der Suche nach Winterkleidungsspenden und deren Abholung helfen.	noTranslation		2025-11-01 20:51:28.394056	2025-11-01 20:51:28.394056	903	10
368	Sprachcafé/Nachhilfe in Hellersdorf	volunteering	Einige der Bewohner*innen der Unterkunft besuchen bereits einen Deutschkurs und benötigen Unterstützung bei den Hausaufgaben, der Grammatik usw. Der Zeitplan ist flexibel und kann je nach Ihrer Verfügbarkeit geändert werden.\nEs handelt sich nicht um ein klassisches Sprachcafé, sondern um Nachhilfeunterricht für Erwachsene.	noTranslation		2025-11-01 20:51:28.413088	2025-11-01 20:51:28.413088	904	10
369	Unterstütze eine Kleiderkammer in Pankow	volunteering	Sie brauchen neue Freiwillige. Der Zeitplan kann mit der Ehrenamtskoordinatorin besprochen werden.	noTranslation		2025-11-01 20:51:28.434618	2025-11-01 20:51:28.434618	905	83
370	Unterstütze mit Kinderbetreuung in Tempelhof	volunteering	Unterstütze die Kinderbetreuer*innen bei der Organisation von Spielen und Aktivitäten für die Kinder.\nSie würden sich über Freiwillige freuen, die regelmäßig kommen und zwischen 12:30 und 16:30 Uhr kreative Aktivitäten für die Kinder organisieren.	noTranslation		2025-11-01 20:51:28.44778	2025-11-01 20:51:28.44778	906	61
371	Männer*café  in Neukölln	volunteering	Das Männercafé bietet die Möglichkeit, von anderen Männern zu lernen und sich gegenseitig zu unterstützen. Workshops, Diskussionsgruppen und gemeinsame Aktivitäten werden angeboten, um Austausch und Wachstum zu fördern. Es ist ein Ort, an dem Männer* neue Perspektiven gewinnen können.\nEs wäre auch toll, einen Freiwilligen zu haben, der die Gruppe leitet, etwas über Deutschland erklärt und gemeinsam Berlin erkundet.	noTranslation		2025-11-01 20:51:28.472221	2025-11-01 20:51:28.472221	907	82
372	Kleiderkammer in Lichtenberg	volunteering	Die Kleiderkammer braucht Hilfe und jemanden, der sich engagieren möchte. Im Moment gibt es nur einen Freiwilligen, der sie unterstützt. Die Kleiderkammer ist mittwochs von 11:00 bis 13:00 Uhr geöffnet und die Freiwilligen können gerne zwei Stunden oder länger bleiben.	noTranslation		2025-11-01 20:51:28.495744	2025-11-01 20:51:28.495744	908	4
373	Sommerfest in Lichtenberg	volunteering	Am 24.09. findet in einer Gemeinschaftsunterkunft ein Sommerfest statt. Dafür werden an diesem Tag von 14:00-18:00 Uhr helfende Hände gesucht für z.B: Auf- und Abbau von Tischen/Stühlen, Kinderschminken, Hüpfburg, Ausschank von Getränken und Popcorn, Tombola, etc.	noTranslation		2025-11-01 20:51:28.516947	2025-11-01 20:51:28.516947	909	4
374	Deutschlernen für einen Geflüchteten aus Ukraine	volunteering	Es handelt sich um einen älteren ukrainischen Mann, der etwas Deutschkenntnisse benötigt. Er ist bis September zeitlich flexibel und bereit, sich mit dem Freiwilligen außerhalb der Unterkunft zu treffen. Es wäre am besten, wenn der Freiwillige auch älter ist.	noTranslation		2025-11-01 20:51:28.532181	2025-11-01 20:51:28.532181	910	80
375	Sportfest Marzahn	volunteering	Das sind die Veranstaltungen, und jede Station braucht eine oder zwei Personen, die die Karten stempeln (die Teilnehmer könnten ihre Karten stempeln lassen und am Ende einen Preis für ihre Teilnahme bekommen) oder die Namen der Kinder aufschreiben, die teilnehmen möchten, oder die Kinder zu den richtigen Stationen führen, kurz gesagt, am Stand anwesend sein.	noTranslation		2025-11-01 20:51:28.547717	2025-11-01 20:51:28.547717	911	20
376	Unterstütze beim Frauencafé	volunteering	Hast du gerade eine Person(gerne eine Frau),die Lust hast bei Frauencafé mitzuhelfen? Sowohl Unterstützung bei der Vorbereitung, Durchführung und Nachbereitung. Sie kann gerne ihre Idee einbringen. Eine plus wäre,wenn die Person türkisch, russisch, georgisch oder arabisch zusätzlich kann. Aber das ist kein Muss	noTranslation		2025-11-01 20:51:28.571225	2025-11-01 20:51:28.571225	912	4
377	Unterstütze bei einem Sommerfest in Zehlendorf	volunteering	Freiwillige werden für die Organisation von Aktivitäten für Kinder, die Ausgabe von Speisen und Getränken, die Mithilfe beim Aufräumen usw. benötigt.	noTranslation		2025-11-01 20:51:28.587882	2025-11-01 20:51:28.587882	913	58
378	Begleite Bewohner*innen zu einem FreiluftKino in Prenzlauerberg	volunteering	Könnte ich über euch Ehrenamtlichen finden, die Lust hätten einige Bewohner aus der Unterkunft abzuholen und mit denen zur Filmveranstaltung zu kommen? (20 min. zu fuß) Die Veranstaltung ist kostenlos, die Ehrenamtlichen + Bewohner bekommen die Getränke umsonst  \n\n21. August 2024, 20:30 – 22:30 Uhr\n28. August 2024, 20:30 – 22:30 Uhr\n4. September 2024, 20:15 – 22:15 Uhr\n11. September 2024, 20:00 – 22:00 Uhr\n\nContact person: Hend Reffky Mobil: +49 (0)159 043 61 513 Email: mailto:hend.refky@pfefferwerk.de	noTranslation		2025-11-01 20:51:28.608787	2025-11-01 20:51:28.608787	914	54
379	Unterstütze die Bewohner*innen, die Nachbarschaft in Wilmersdorf besser kennenzulernen	volunteering	Die Idee für diese Freiwilligenarbeit ist es, die Bewohner des RAC dabei zu unterstützen, neue Dinge in ihrer Nachbarschaft zu entdecken und zu unternehmen. Das könnte einmal im Monat oder alle zwei Wochen geschehen. Wenn es Gemeinschaftszentren, Sportspiele oder andere Aktivitäten für Kinder/Erwachsene gibt, wäre es die Aufgabe der Freiwilligen, die Bewohner*innen zu begleiten, damit sie sich akzeptiert und sicher fühlen.	noTranslation		2025-11-01 20:51:28.638365	2025-11-01 20:51:28.638365	915	56
380	Suche nach Aktivitäten für Kinder in Wilmersdorf	volunteering	Es handelt sich um zwei Schwestern mit mehreren Kindern. Beide sind alleinerziehende Mütter, einige der Kinder sind behindert. Sie haben nicht die Zeit, sich um Aktivitäten und Unternehmungen für jedes Kind zu kümmern, deshalb wären sie froh, wenn sie dabei etwas Unterstützung bekämen.	noTranslation		2025-11-01 20:51:28.65745	2025-11-01 20:51:28.65745	916	56
381	Play with kids and organise activities for the during a summer festival in Wilmersdorf	volunteering	Es werden Freiwillige gesucht, die Aktivitäten für Kinder organisieren können (Schminken, Spiele, Sport, Popcorn usw.).\n\nDie Freiwilligen können einfach um 13 Uhr vorbeikommen. Wir müssen sie nicht vorher vorstellen.\n\nKontaktperson: Young-Sun Song	noTranslation		2025-11-01 20:51:28.674424	2025-11-01 20:51:28.674424	917	56
382	Support with accompanying kids around in the neighborhood in Zehlendorf	volunteering	Begleiten Sie die Kinder zu verschiedenen Aktivitäten in der Nachbarschaft, z. B. Fußball usw.	noTranslation		2025-11-01 20:51:28.690214	2025-11-01 20:51:28.690214	918	58
383	Unterstützung einer arabischsprachigen Familie bei dem Ankommen in Moabit	volunteering	Es handelt sich um eine große Familie, bestehend aus 7 Personen, die im April 2024 nach Berlin gezogen sind. Sie brauchen Hilfe, um sich in der Stadt zurechtzufinden, um etwas zu unternehmen usw. Die Großmutter der Familie ist behindert und benutzt einen Rollstuhl.	noTranslation		2025-11-01 20:51:28.711826	2025-11-01 20:51:28.711826	919	8
384	Deutsch lernen und üben	volunteering	Sie kümmert sich um ihren Mann und hat sehr wenig Zeit, um Deutsch zu lernen. Es wäre toll, jemanden für ein Deutsch-Russisch/Deutsch-Ukrainisch zu haben.	noTranslation		2025-11-01 20:51:28.733865	2025-11-01 20:51:28.733865	920	8
385	Sortierung  und Ausgabe von den Spenden der Tafel e.V.	volunteering	Wir suchen noch Leute, die uns bei der  Sortierung  und Ausgabe von den Spenden der Tafel e. V. am Montag und/oder  Freitag  zwischen 14 und 17 Uhr helfen.\nBerliner Tafel is organising food donations, more info here https://www.berliner-tafel.de/	noTranslation		2025-11-01 20:51:28.751089	2025-11-01 20:51:28.751089	921	40
386	Wegbegleitung für Kinder	volunteering	Gleich schon beginnen die Sommerferien. Damit unsere lieben Kinder sich aber nicht langweilen müssen, haben wir ihnen ein buntes Programm mit zahlreichen Aktivitäten und Ausflügen zusammengestellt.\n \nEben für diese Ausflüge benötigen wir noch die ein oder andere erwachsene Begleitperson, damit möglichst viele Kinder daran teilnehmen können (Pro Erwachsenen 5 Kinder).Folgendes ist geplant:\n \n• 02.08. – Lobecksportplatz, 10 -13:30 Uhr\n• 05.08. – Treptower Park, Insel der Jugend, 14 – 17 Uhr\n• 06.08. – Kino: Garfield, Cubix Alexanderplatz, 9:30 – 13 Uhr\n• 12.08. – Plantsche, Volkspark Friedrichshain, 10:30 – 16:30 Uhr\n• 13.08. – Naturkundemuseum, 9:30 -14 Uhr\n• 19.08. – Gleisdreieckpark, 10 – 16:30 Uhr\n• 23.08. – Britzer Garten, 9:30 – 13:30 Uhr\n• 26.08. – Spielplatz Ritterburg, 14 – 16:30 Uhr\n• 28.08. – Holzbauworkshop Kreativhaus Mitte, 10 – 13 Uhr\n• 29.08. – Haus der Natur, Wuhlheide, 10 – 17:00 Uhr\n \nEs handelt sich größtenteils um Halbtagsausflüge. Treffpunkt ist immer hier bei uns in der Unterkunft. Natürlich müssen die Kinder hierhin auch wieder zurück.\nWer also Zeit und Lust hat (oder jemanden kennt, der Zeit und Lust hat) bei einer oder mehreren Aktivitäten zu unterstützen, melde sich für nähere Informationen bitte bei uns unter mailto:ehrenamt@prisod-wohnend.de.\n\nContact details of the RAC\nmailto:p.dzyuballa@prisod-wohnen.de\nmailto:ehrenamt-stallschreiber@prisod-wohnen.de\nmailto:stallschreiber-kb@prisod-wohnen.de	noTranslation		2025-11-01 20:51:28.769212	2025-11-01 20:51:28.769212	922	21
387	Kinderbetreuung während Sommerpause	volunteering	Bis Ende August \nKinder (Altersgruppe 5 - 14 Jahre)\nAktivitäten wie Malen, Spielen, Lesen usw. zu betreuen.\nDie Freiwilligen müssen nicht regelmäßig kommen. Einmal oder zweimal pro Woche ist auch sehr hilfreich.	noTranslation		2025-11-01 20:51:28.795537	2025-11-01 20:51:28.795537	923	20
388	Unterstützung bei einem Sommerfest	volunteering	Es wäre großartig, wenn wir Freiwillige hätten, etwa für die folgenden Aktivitäten:\n \n- Theater/Zauberer\n- Tänzer/Sänger\n- Catering Helfer\n- Reinigung\n- Popcorn/Süßemaschine\n- Gesichter Malen\n- Spiele für Kinder und Erwachsene	noTranslation		2025-11-01 20:51:28.818162	2025-11-01 20:51:28.818162	924	18
389	Fahrradwerkstatt in Zehlendorf	volunteering	Freiwillige fpr die Mitarbeit in der Fahrradselbsthilfewerkstatt (Tatsächlich auch als Honorarkraft auf selbstständiger Basis möglich)	noTranslation		2025-11-01 20:51:28.834801	2025-11-01 20:51:28.834801	925	58
390	Kinderschminken für ein Sommerfest	volunteering	Wir suchen also vor allem nach Menschen, die Lust darauf haben, etwas mit Kindern zu machen oder mit Eltern und Kindern. Ganz konkret suchen wir aktuell nach einer Person, die bei unserem Sommerfest am 12.07. Kinderschminken anbietet.	noTranslation		2025-11-01 20:51:28.84986	2025-11-01 20:51:28.84986	926	54
391	Unterstütze ein Männer*cafe in Pankow	volunteering	Es werden Freiwillige für ein Männer-Café gesucht (zwei Stunden, in denen sich die n Männer treffen und über Dinge reden können, die sie interessieren)	noTranslation		2025-11-01 20:51:28.874664	2025-11-01 20:51:28.874664	927	83
392	Aktivitäten für Jugendliche in Pankow	volunteering	Es werden Freiwillige für einen sogenannten Jungstreff gesucht, bei dem sich Jugendliche treffen und gemeinsam etwas unternehmen.	noTranslation		2025-11-01 20:51:28.899109	2025-11-01 20:51:28.899109	928	83
393	Gruppe von Freiwilligen für den Hangars	volunteering		noTranslation		2025-11-01 20:51:28.92086	2025-11-01 20:51:28.92086	929	24
394	Unterstütze mit Kinderbetreuung	volunteering	Wir benötigen grundsätzlich Unterstützung Mo, Mi und Do jeweils im Zeitraum 15:00 -18:00 Uhr.Mittwoch und Donnerstag jeweils als Unterstützung unserer eigenen Kinderbetreuung.	noTranslation		2025-11-01 20:51:28.951171	2025-11-01 20:51:28.951171	930	2
395	Accompanying a family from Afghanistan to doctor’s appointments around Berlin	volunteering		noTranslation		2025-11-01 20:51:28.972891	2025-11-01 20:51:28.972891	931	64
396	Kinderbetreuung am Wochenende in Pankow	volunteering		noTranslation		2025-11-01 20:51:28.991339	2025-11-01 20:51:28.991339	932	83
397	Einem Ehepaar aus Afghanistan in Moabit das Lesen und Schreiben auf Deutsch beibringen	volunteering	Sie sind älter und müssen Deutsch lesen und schreiben lernen, bevor sie einen Deutschkurs besuchen können.	noTranslation		2025-11-01 20:51:29.011345	2025-11-01 20:51:29.011345	933	8
398	Aktivitäten für Frauen in Neukölln	volunteering	Es wird eine Freiwillige (Frau) gesucht, der unterhaltsame Aktivitäten für die Frauen im RAC organisiert. Das kann ein Ausflug sein oder etwas, das die Bewohner*innen interessiert.	noTranslation		2025-11-01 20:51:29.034077	2025-11-01 20:51:29.034077	934	62
399	Organisieren Sie Kunst- und Bastelkurse für Kinder und Jugendliche in Neukölln	volunteering	Es werden Freiwillige für die Organisation von Kunst- und Handwerksaktivitäten für Kinder benötigt, z. B. Zeichnen, Malen, Formen, Origami usw.	noTranslation		2025-11-01 20:51:29.058913	2025-11-01 20:51:29.058913	935	62
400	Führe ein Sprachcafé in Wedding	volunteering	Sie brauchen Freiwillige für Schlasch, ein Projekt des Club DIalog. Dort gibt es einmal pro Woche ein deutsches Sprachcafé für russisch- und ukrainischsprachige Jugendliche, in dem sie auf spielerische Weise ihr Deutsch üben können.	noTranslation		2025-11-01 20:51:29.073783	2025-11-01 20:51:29.073783	936	64
401	Unterstütze ein Sprachcafé für Frauen in Hellersdorf	volunteering	Es gibt eine Gruppe von Frauen, die gerne jemanden hätten, mit dem sie ihr Deutsch üben können.\nDer Freiwillige sollte vorzugsweise eine Frau sein.	noTranslation		2025-11-01 20:51:29.091427	2025-11-01 20:51:29.091427	937	77
402	Organisiere Aktivitäten für die Kinderbetreuung in Lichtenberg	volunteering	Außer donnerstags gibt es keine Tagesbetreuung. Es gibt eine Kinderbetreuering, die Unterstützung braucht, da es ziemlich viele Kinder gibt.	noTranslation		2025-11-01 20:51:29.118062	2025-11-01 20:51:29.118062	938	87
403	Kunst und Handwerk für Kinder und ihre Familien in Tempelhof	volunteering	Es ist bereits eine Freiwillige aktiv, die Unterstützung braucht. Kunst und Handwerk können unterschiedlich sein, je nachdem, was der Freiwillige kann (Zeichnen, Gießen, Bildhauerei usw.)	noTranslation		2025-11-01 20:51:29.137388	2025-11-01 20:51:29.137388	939	61
404	Organisiere Aktivitäten für Kinder und Jugendliche in Marzahn - IB	volunteering	Alles, was Freiwillige als eigene Aktivitäten machen können. vorzugsweise mit Kindern und Jugendlichen ist vor allem bis 18.00 Uhr willkommen, aber nach einiger Eingewöhnung auch nach Feierabend. Zusätzlich manchmal Begleitung zur LEA oder zum Gericht	noTranslation		2025-11-01 20:51:29.162084	2025-11-01 20:51:29.162084	940	64
405	Begleiten Sie Kinder beim KinderKulturMonat im Oktober in Berlin	volunteering	Der Kinder·Kultur·Monat ist ein Festival für Kinder und Ihre Familien in Berlin.\nMit Kunst, Musik. Tanz. Kino. Besuchen im Museum. Und vielen anderen Sachen.\nDas Festival ist jedes Jahr im Oktober.\nAn jedem Wochen·ende im Oktober\ngibt es spannende Sachen zum Mitmachen und Ausprobieren.\nIn allen Bezirken in Berlin öffnen Häuser für Kunst und Kultur Ihre Türen.\nZum Beispiel:\nTheater und Museen KinosKunst·schulen, Musik·schulen und Tanz·schulenKunst·galerien, Ausstellungenund viele andere Häuser\nAlle freuen sich auf Euch!	noTranslation		2025-11-01 20:51:29.194636	2025-11-01 20:51:29.194636	941	64
406	Nähen oder Stricken mit Frauen in Treptow-Köpenick	volunteering	Im Unterkunftszentrum gibt es Nähmaschinen und Materialien zum Stricken. Es wird eine Freiwillige gesucht, die zweimal im Monat mit den Frauen stricken/nähen könnte.	noTranslation		2025-11-01 20:51:29.220934	2025-11-01 20:51:29.220934	942	28
407	Unterstütze ein türkischsprachiges Kind beim Deutschlernen in Treptow-Köpenick	volunteering	Kein Türkisch ist in Ordnung, die Freiwilligen müssen die beiden Treffen mit dem Kind in Anwesenheit des VC und der Mutter des Kindes abhalten (Dienstag/Mittwoch/Donnerstag).\nDieses Kind geht zur Schule, hat aber Schwierigkeiten, den Anschluss an die anderen zu finden, daher wäre es toll, wenn es jemanden gäbe, der es unterstützt.	noTranslation		2025-11-01 20:51:29.241361	2025-11-01 20:51:29.241361	943	28
408	Beglteitung zu einer Kitabesichtigung	volunteering		noTranslation		2025-11-01 20:51:29.26052	2025-11-01 20:51:29.26052	944	40
409	Sportaktivitäten	volunteering		noTranslation		2025-11-01 20:51:29.275828	2025-11-01 20:51:29.275828	945	10
410	Unterstützung bei einem Sommerfest	volunteering	Freiwillige werden für die Ausgabe von Speisen und Getränken, die Organisation von Aktivitäten für Kinder und Jugendliche benötigt	noTranslation		2025-11-01 20:51:29.290729	2025-11-01 20:51:29.290729	946	62
411	Doctor’s Appointment: Kid	volunteering		noTranslation		2025-11-01 20:51:29.308142	2025-11-01 20:51:29.308142	947	39
412	Doctor’s Appointment: Kid	volunteering		noTranslation		2025-11-01 20:51:29.327224	2025-11-01 20:51:29.327224	948	39
413	Sorting Papers for Residents	volunteering		noTranslation		2025-11-01 20:51:29.345155	2025-11-01 20:51:29.345155	949	87
414	Aktionstag von Aprilsix-Freiwilligen	volunteering	Freiwilligenarbeit für ein Team von LucaNet (30 Personen) in Berlin für Montag, den 24.06., am Nachmittag (ab circa 14:00 Uhr).\nKönnen wir euch mit kleinen Teams aus 2-5 Personen bei bestimmten Aktionen unterstützen?	noTranslation		2025-11-01 20:51:29.357337	2025-11-01 20:51:29.357337	950	64
415	Gartenfreiwilligentag in Mitte	volunteering		noTranslation		2025-11-01 20:51:29.371162	2025-11-01 20:51:29.371162	951	46
416	Multi Translation Buchholtz	volunteering		noTranslation		2025-11-01 20:51:29.393163	2025-11-01 20:51:29.393163	952	83
417	vietnamesisches Greifswalderstr	volunteering		noTranslation		2025-11-01 20:51:29.41104	2025-11-01 20:51:29.41104	953	40
418	Russian German Jobcenter	volunteering		noTranslation		2025-11-01 20:51:29.43285	2025-11-01 20:51:29.43285	954	9
419	Operation doctors translation persian	volunteering		noTranslation		2025-11-01 20:51:29.451849	2025-11-01 20:51:29.451849	955	74
420	Doctors appointments	volunteering		noTranslation		2025-11-01 20:51:29.46802	2025-11-01 20:51:29.46802	956	77
421	Artztermin Radiografie	volunteering		noTranslation		2025-11-01 20:51:29.487416	2025-11-01 20:51:29.487416	957	61
422	Augenartzttermin	volunteering		noTranslation		2025-11-01 20:51:29.505854	2025-11-01 20:51:29.505854	958	46
423	JobCenter Tempelhof-Schöneberg	volunteering		noTranslation		2025-11-01 20:51:29.524267	2025-11-01 20:51:29.524267	959	9
424	Voruntersuchung für die OP	volunteering		noTranslation		2025-11-01 20:51:29.542687	2025-11-01 20:51:29.542687	960	46
425	Going to appointments with a visually impaired person	volunteering		noTranslation		2025-11-01 20:51:29.562111	2025-11-01 20:51:29.562111	961	4
426	Spazierengehen mit einem Bewohner	volunteering		noTranslation		2025-11-01 20:51:29.581247	2025-11-01 20:51:29.581247	962	4
427	Wohnungsbesichtigung	volunteering		noTranslation		2025-11-01 20:51:29.602178	2025-11-01 20:51:29.602178	963	88
428	Sprachmittlung Farsi	volunteering		noTranslation		2025-11-01 20:51:29.623163	2025-11-01 20:51:29.623163	964	46
429	Accompanying of a pregnant person to Charite	volunteering		noTranslation		2025-11-01 20:51:29.641497	2025-11-01 20:51:29.641497	965	18
430	Accompanying to Agentur für Arbeit Tempelhof-Schöneberg	volunteering		noTranslation		2025-11-01 20:51:29.660344	2025-11-01 20:51:29.660344	966	9
431	artz Myocardszintigraphie	volunteering		noTranslation		2025-11-01 20:51:29.681756	2025-11-01 20:51:29.681756	967	46
432	Charite accompanying Persian	volunteering		noTranslation		2025-11-01 20:51:29.699581	2025-11-01 20:51:29.699581	968	46
433	Aktivitäten für ein Sommerfest	volunteering	- Theater/Magier\n- TänzerInnen/SängerInnen\n- Catering-Helfer\n- Reinigung\n- Popcorn-/Bonbonmaschine\n- Gesichtsbemalung\n- Spiele für Kinder und Erwachsene	noTranslation		2025-11-01 20:51:29.71615	2025-11-01 20:51:29.71615	969	18
434	Begleitung für Mutter mit 5jähriger Tochter zu einer Sprachstandsfeststellung	volunteering		noTranslation		2025-11-01 20:51:29.734254	2025-11-01 20:51:29.734254	970	39
435	Begleitung beim Arzttermin	volunteering		noTranslation		2025-11-01 20:51:29.757506	2025-11-01 20:51:29.757506	971	77
436	Accompanying - Doctor’s appointment	volunteering		noTranslation		2025-11-01 20:51:29.777862	2025-11-01 20:51:29.777862	972	88
437	Accompanying children to activities outside of refugee accommodation centres	volunteering	It will be needed mostly during school breaks and in summer in different RACs	noTranslation		2025-11-01 20:51:29.805167	2025-11-01 20:51:29.805167	973	24
438	Laloka	volunteering	Es könnte eine Samstagsveranstaltung für Frauen geben, und in dieser Zeit bräuchten sie eine Tagesbetreuung. außerdem brauchen sie manchmal Übersetzungen für Termine, vor allem auf Französisch	noTranslation		2025-11-01 20:51:29.831727	2025-11-01 20:51:29.831727	974	64
439	Clean-Up in der GU Columbidamm 84	volunteering		noTranslation		2025-11-01 20:51:29.846562	2025-11-01 20:51:29.846562	975	9
441	Unterstützung bei einem Bauprojekt	volunteering	Unterstützung bei einem Bauprojekt: Pavillon mit Sitzmöglichkeiten auf dem Hof der Gemeinschaftsunterkunft	noTranslation		2025-11-01 20:51:29.881393	2025-11-01 20:51:29.881393	977	88
442	Sorting letters and papers with the refugees	volunteering		noTranslation		2025-11-01 20:51:29.901494	2025-11-01 20:51:29.901494	978	88
443	Support a Syrian family find their way in Germany	volunteering		noTranslation		2025-11-01 20:51:29.919928	2025-11-01 20:51:29.919928	979	3
444	Unterstützung beim Gemeinschaftsgarten	volunteering		noTranslation		2025-11-01 20:51:29.935375	2025-11-01 20:51:29.935375	980	87
445	PC-Kenntnisse beibringen	volunteering	Maxie-Wander-Str. braucht auch Freiwillige, um bei der Einrichtung der PCs zu helfen	noTranslation		2025-11-01 20:51:29.962676	2025-11-01 20:51:29.962676	981	87
446	Organisiere ein Sprachcafé	volunteering	Ist noch nicht organisiert, es gibt aber Räumlichkeiten.	noTranslation		2025-11-01 20:51:29.980395	2025-11-01 20:51:29.980395	982	87
447	Opening bank accounts	volunteering		noTranslation		2025-11-01 20:51:30.006518	2025-11-01 20:51:30.006518	983	84
448	Accompanying to administrative offices	volunteering	Needed everywhere.	noTranslation		2025-11-01 20:51:30.035451	2025-11-01 20:51:30.035451	984	87
449	Accompanying to doctor’s appointments	volunteering	Needed everywhere, short notice	noTranslation		2025-11-01 20:51:30.062623	2025-11-01 20:51:30.062623	985	77
450	Translation at LEA on the 4th of March at 10:10	volunteering		noTranslation		2025-11-01 20:51:30.081631	2025-11-01 20:51:30.081631	986	87
451	Supporting a French speaking mother	volunteering	Ideally a volunteer would come to the reception centre once a week	noTranslation		2025-11-01 20:51:30.102456	2025-11-01 20:51:30.102456	987	10
452	Deutschprüfungvorberetiung	volunteering		noTranslation		2025-11-01 20:51:30.118887	2025-11-01 20:51:30.118887	988	66
453	Translation Support	volunteering		noTranslation		2025-11-01 20:51:30.145336	2025-11-01 20:51:30.145336	989	66
454	Translation Support	volunteering		noTranslation		2025-11-01 20:51:30.160729	2025-11-01 20:51:30.160729	990	40
455	Translation Support	volunteering		noTranslation		2025-11-01 20:51:30.180349	2025-11-01 20:51:30.180349	991	63
456	Sei Teil der Gartengruppe	volunteering		noTranslation		2025-11-01 20:51:30.194333	2025-11-01 20:51:30.194333	992	9
457	Translation Support	volunteering		noTranslation		2025-11-01 20:51:30.218795	2025-11-01 20:51:30.218795	993	40
458	Translation Support	volunteering		noTranslation		2025-11-01 20:51:30.240354	2025-11-01 20:51:30.240354	994	83
459	Organisiere Tanzworkshops	volunteering		noTranslation		2025-11-01 20:51:30.253901	2025-11-01 20:51:30.253901	995	43
460	Sprachmittlung während ärtzlichen Beratungsstunden	volunteering		noTranslation		2025-11-01 20:51:30.265163	2025-11-01 20:51:30.265163	996	39
461	Leite ein Sprachcafé	volunteering		noTranslation		2025-11-01 20:51:30.287072	2025-11-01 20:51:30.287072	997	84
462	Translation support	volunteering		noTranslation		2025-11-01 20:51:30.304738	2025-11-01 20:51:30.304738	998	10
463	Organisiere Sportaktivitäten für Kinder	volunteering		noTranslation		2025-11-01 20:51:30.322422	2025-11-01 20:51:30.322422	999	89
464	Unterstütze bei der Kinderbetreuung	volunteering	Deutschkenntnisse sind gewünscht.	noTranslation		2025-11-01 20:51:30.346579	2025-11-01 20:51:30.346579	1000	88
465	Fahrradwerkstatt in Lichtenberg	volunteering		noTranslation		2025-11-01 20:51:30.363465	2025-11-01 20:51:30.363465	1001	12
466	Translations (Farsi, Russian)	volunteering		noTranslation		2025-11-01 20:51:30.386597	2025-11-01 20:51:30.386597	1002	12
\.


--
-- Data for Name: option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.option (id, item_type, item_id) FROM stdin;
1	language	345
2	language	618
3	language	1200
4	language	1215
5	language	1230
6	language	1482
7	language	1540
8	language	1807
9	language	1833
10	language	1910
11	language	1954
12	language	2366
13	language	2388
14	language	2521
15	language	2665
16	language	2854
17	language	3151
18	language	4698
19	language	5140
20	language	5351
21	language	5445
22	language	5641
23	language	5642
24	language	5677
25	language	5998
26	language	6011
27	language	6059
28	language	6148
29	language	6644
30	language	6769
31	language	6819
32	language	6894
33	language	7790
34	language	7922
35	activity	1
36	activity	2
37	activity	3
38	activity	4
39	activity	5
40	activity	6
41	activity	7
42	activity	8
43	activity	9
44	activity	10
45	activity	11
46	activity	12
47	activity	13
48	activity	14
49	activity	15
50	activity	16
51	activity	17
52	activity	18
53	activity	19
54	activity	20
55	activity	21
56	activity	22
57	district	1
58	district	2
59	district	3
60	district	4
61	district	5
62	district	6
63	district	7
64	district	8
65	district	9
66	district	10
67	district	11
68	district	12
69	lead_from	1
70	lead_from	2
71	lead_from	3
72	lead_from	4
73	lead_from	5
74	lead_from	6
75	lead_from	7
76	skill	1
77	skill	2
78	skill	3
79	skill	4
80	skill	5
81	skill	6
82	skill	7
83	skill	8
84	skill	9
85	skill	10
86	skill	11
87	skill	12
88	skill	13
89	skill	14
90	skill	15
91	skill	16
92	skill	17
93	skill	18
94	skill	19
95	skill	20
96	skill	21
97	skill	22
98	skill	23
99	skill	24
100	skill	25
101	skill	26
102	skill	27
103	skill	28
104	skill	29
105	skill	30
106	skill	31
107	skill	32
108	skill	33
\.


--
-- Data for Name: organization; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organization (id, title, email, phone, created_at, updated_at, address_id, person_id) FROM stdin;
1	Schwalbenweg	schwalbenweg.psych@eu-homecare.com	015155802637	2025-11-01 20:51:16.86491	2025-11-01 20:51:16.86491	533	535
2	Gehrenseestr.	m.hakim@albatrosggmbh.de	0176 1983 1254	2025-11-01 20:51:20.137895	2025-11-01 20:51:20.137895	534	536
3	Seehausener Str.	shs47-sozialteam@volkssolidaritaet.de	030403661290	2025-11-01 20:51:20.411728	2025-11-01 20:51:20.411728	508	537
4	Refugium Lichtenberg	dieng@awo-mitte.de	0306800790285	2025-11-01 20:51:20.484821	2025-11-01 20:51:20.484821	318	538
5	Dingolfinger Str.	sozialdienst.dingolfinger@drk-mueggelspree.de	030239893078	2025-11-01 20:51:20.529897	2025-11-01 20:51:20.529897	535	539
6	Hotel Plaza Inn	alessia.arbustini@ib.de	+4915785557305	2025-11-01 20:51:20.5678	2025-11-01 20:51:20.5678	536	540
7	Storkower Straße 160 	omar@awo-mitte.de	0151 414 011 32	2025-11-01 20:51:20.590022	2025-11-01 20:51:20.590022	367	541
8	Alt-Moabit	t.weichert@sin-ev.de	03074001805	2025-11-01 20:51:20.621245	2025-11-01 20:51:20.621245	366	542
9	Columbiadamm 84	arrate.gutierrez@lfg-b.de	030 213 099 230	2025-11-01 20:51:20.649032	2025-11-01 20:51:20.649032	353	543
10	Blumberger Damm	sozialteam.blumbergerdamm@heroeurope.com	030 40 36 40 337	2025-11-01 20:51:20.677866	2025-11-01 20:51:20.677866	537	544
11	Niedstr.	l.mcghie@sin-ev.de	03089742660	2025-11-01 20:51:20.699361	2025-11-01 20:51:20.699361	391	545
12	Bornitzstraße	aday@drk-mueggelspree.de	030 5130 190-08	2025-11-01 20:51:20.743242	2025-11-01 20:51:20.743242	538	546
13	noname alexandra.schafflhuber@elkb.de	alexandra.schafflhuber@elkb.de	0151 65662532	2025-11-01 20:51:20.767429	2025-11-01 20:51:20.767429	2	547
14	Chris-Gueffroy-Allee	marie.paquignon@ib.de	03030096746	2025-11-01 20:51:20.921723	2025-11-01 20:51:20.921723	524	548
15	Haus Leo	vonmeltzer@berliner-stadtmission.de	01756046880	2025-11-01 20:51:20.9552	2025-11-01 20:51:20.9552	334	549
16	Kablower Weg	kurbag@drk-mueggelspree.de	030239893062	2025-11-01 20:51:21.136941	2025-11-01 20:51:21.136941	533	550
17	Degnerstr.	ehrenamt-degner@prisod-wohnen.de	030629397829	2025-11-01 20:51:21.199431	2025-11-01 20:51:21.199431	534	551
18	Kurt-Schumacher-Damm	Betreuung-KSD@eu-homecare.com	+49 151 74352644	2025-11-01 20:51:21.241453	2025-11-01 20:51:21.241453	539	552
19	Landsberger Allee	\N	\N	2025-11-01 20:51:21.293585	2025-11-01 20:51:21.293585	1	3
20	Murtzaner Ring	\N	\N	2025-11-01 20:51:21.328368	2025-11-01 20:51:21.328368	1	3
21	Stallschreiberstr.	ehrenamt-stallschreiber@prisod-wohnen.de	01738203720	2025-11-01 20:51:21.351842	2025-11-01 20:51:21.351842	382	553
22	Radickestr.	kurbag@drk-mueggelspree.de	030 23 989 30 67	2025-11-01 20:51:21.402884	2025-11-01 20:51:21.402884	487	554
23	Bernauer Str.	alejandra.ciro@heroeurope.com	030403640472	2025-11-01 20:51:21.435125	2025-11-01 20:51:21.435125	540	555
24	Hangar 1-3	papush@awo-mitte.de	0303450569308	2025-11-01 20:51:21.472466	2025-11-01 20:51:21.472466	517	556
25	Am Beelitzhof	ann-christin.krugel@ib.de	03084720394	2025-11-01 20:51:21.562531	2025-11-01 20:51:21.562531	541	557
26	Konrad-Wolf-Str.	max.gonzalez@volkssolidaritaet.de	015115088798	2025-11-01 20:51:21.648532	2025-11-01 20:51:21.648532	454	558
27	noname beeke.wattenberg@xenion.org	beeke.wattenberg@xenion.org	0152 09656081	2025-11-01 20:51:21.670953	2025-11-01 20:51:21.670953	353	559
28	Rahnsdorf	marie.willeke@bzsl.de	015750960962	2025-11-01 20:51:21.733115	2025-11-01 20:51:21.733115	445	560
29	noname benn-mierendorffinsel@mts-socialdesign.com	benn-mierendorffinsel@mts-socialdesign.com	017622339899	2025-11-01 20:51:21.801402	2025-11-01 20:51:21.801402	536	561
30	Chaussee Str.	e.boerner@bethania.de	0151 18001794	2025-11-01 20:51:21.909659	2025-11-01 20:51:21.909659	450	562
31	noname Liudmila.avdonina@jao-berlin.de	Liudmila.avdonina@jao-berlin.de	015904487223	2025-11-01 20:51:21.933936	2025-11-01 20:51:21.933936	542	563
32	Freiheit	social@cityeleven.de	+49 30 2009 2693	2025-11-01 20:51:21.985298	2025-11-01 20:51:21.985298	543	564
33	Refugium Hausvaterweg	storm@awo-mitte.de	016098051024	2025-11-01 20:51:22.021693	2025-11-01 20:51:22.021693	508	565
34	noname mentoren@xenion.org	mentoren@xenion.org	030880667375	2025-11-01 20:51:22.15169	2025-11-01 20:51:22.15169	356	566
35	Trachenbergring	\N	\N	2025-11-01 20:51:22.228754	2025-11-01 20:51:22.228754	1	3
36	Osteweg	franz@milaa-berlin.de	015777691250	2025-11-01 20:51:22.264834	2025-11-01 20:51:22.264834	368	567
37	noname info@benn-altglienicke.de	info@benn-altglienicke.de	03053007040	2025-11-01 20:51:22.39133	2025-11-01 20:51:22.39133	542	568
38	noname au@schoeneberg-hilft.de	au@schoeneberg-hilft.de	015560079346	2025-11-01 20:51:22.420307	2025-11-01 20:51:22.420307	435	569
39	Buschkrugallee	Ahmed.Isamaldin.Mohamed.Ahmed@ib.de	015785542175	2025-11-01 20:51:22.450015	2025-11-01 20:51:22.450015	544	570
40	Storkower Straße 118	sozialearbeit118a@stk118.de	030 41 717190	2025-11-01 20:51:22.535378	2025-11-01 20:51:22.535378	367	571
41	Salvador-Allende-Str.	paulina.heine@volkssolidaritaet.de	015115088898	2025-11-01 20:51:22.722596	2025-11-01 20:51:22.722596	545	572
42	noname tuemptner@reinhold-burger-schule.de	tuemptner@reinhold-burger-schule.de	01795962708	2025-11-01 20:51:22.813382	2025-11-01 20:51:22.813382	321	573
43	Bühringstraße	odilia.voigt@heroeurope.com	015562653465	2025-11-01 20:51:22.910272	2025-11-01 20:51:22.910272	546	574
44	noname sozialdienst.dingolfinger@drk-mueggelspree.de	sozialdienst.dingolfinger@drk-mueggelspree.de	030239893075	2025-11-01 20:51:22.938186	2025-11-01 20:51:22.938186	535	575
45	noname social@cityeleven.de	social@cityeleven.de	+49 30 2009 2693	2025-11-01 20:51:22.965361	2025-11-01 20:51:22.965361	543	564
46	Invalidenstraße	kuczera@gu-invalidenstr.de	0302332196157	2025-11-01 20:51:23.003769	2025-11-01 20:51:23.003769	392	576
47	Max-Brunnow-Straße	ehrenamt-max-brunnow@prisod-wohnen.de	030 403 995 20	2025-11-01 20:51:23.058986	2025-11-01 20:51:23.058986	547	577
48	noname battiati@drk-mueggelspree.de	battiati@drk-mueggelspree.de	+4915223203175	2025-11-01 20:51:23.103912	2025-11-01 20:51:23.103912	533	578
49	noname l.mcghie@sin-ev.de	l.mcghie@sin-ev.de	03089742660	2025-11-01 20:51:23.12536	2025-11-01 20:51:23.12536	391	545
50	noname sozialearbeit118a@stk118.de	sozialearbeit118a@stk118.de	03041717190	2025-11-01 20:51:23.147315	2025-11-01 20:51:23.147315	367	579
51	noname marie.willeke@bzsl.de	marie.willeke@bzsl.de	015750960962	2025-11-01 20:51:23.175119	2025-11-01 20:51:23.175119	445	560
52	noname contact@cityeleven.de	contact@cityeleven.de	03020092693	2025-11-01 20:51:23.203742	2025-11-01 20:51:23.203742	543	580
53	Wotanstraße	khalilzadeh@drk-mueggelspree.de	030239893052	2025-11-01 20:51:23.310728	2025-11-01 20:51:23.310728	538	581
54	Straßburger Straße	joanna.lundt@heroeurope.com	017669707582	2025-11-01 20:51:23.340675	2025-11-01 20:51:23.340675	329	582
55	noname contact@need4deed.org	contact@need4deed.org	015170437839	2025-11-01 20:51:23.414648	2025-11-01 20:51:23.414648	393	583
56	Brabanter Str. GU3	\N	\N	2025-11-01 20:51:23.664405	2025-11-01 20:51:23.664405	1	3
57	Soorstraße	\N	\N	2025-11-01 20:51:23.738894	2025-11-01 20:51:23.738894	1	3
58	Refugium Hohentwielsteig	Todt@awo-mitte.de	03050931547	2025-11-01 20:51:23.781999	2025-11-01 20:51:23.781999	424	584
59	Marienfelder Allee	magdalena.halekotte@ib.de	030 4570 777 27	2025-11-01 20:51:23.93038	2025-11-01 20:51:23.93038	548	585
60	Karl-Marx-Str.	ehrenamt.gukm@tamaja.de	+49 15780632534	2025-11-01 20:51:23.998975	2025-11-01 20:51:23.998975	549	586
61	Colditzstraße	p.kanyo@albatrosggmbh.de	403638427	2025-11-01 20:51:24.092768	2025-11-01 20:51:24.092768	367	587
62	Töpchiner Weg	ehrenamt.gutw@tamaja.de	01779038263	2025-11-01 20:51:24.163306	2025-11-01 20:51:24.163306	502	588
63	Kiefholzstraße 71	\N	\N	2025-11-01 20:51:24.191035	2025-11-01 20:51:24.191035	1	3
64	noname	\N	\N	2025-11-01 20:51:24.359895	2025-11-01 20:51:24.359895	1	3
65	noname begleitung@example.com	begleitung@example.com	+49302345678	2025-11-01 20:51:24.417627	2025-11-01 20:51:24.417627	387	589
66	Kiefholzstr. 36 	Anna.Seifert@lfg-b.de	+4915115074477	2025-11-01 20:51:24.47951	2025-11-01 20:51:24.47951	430	590
67	Ankunftszentrum Tegel	info@need4deed.org	017660991831	2025-11-01 20:51:24.711142	2025-11-01 20:51:24.711142	334	591
68	noname Sven.Clausen@ib.de	Sven.Clausen@ib.de	+49 1512 2128152	2025-11-01 20:51:24.928386	2025-11-01 20:51:24.928386	544	592
69	noname betreuung-ksd@eu-homecare.com	betreuung-ksd@eu-homecare.com	0151 74352644	2025-11-01 20:51:24.948374	2025-11-01 20:51:24.948374	539	593
70	noname mehri.mohammadzadeh@ib.de	mehri.mohammadzadeh@ib.de	017629124123	2025-11-01 20:51:24.998919	2025-11-01 20:51:24.998919	384	594
71	noname fadare@drk-mueggelspree.de	fadare@drk-mueggelspree.de	030 2398938 76	2025-11-01 20:51:25.051538	2025-11-01 20:51:25.051538	535	595
72	noname kagirov@berliner-stadtmission.de	kagirov@berliner-stadtmission.de	030 690333901	2025-11-01 20:51:25.135569	2025-11-01 20:51:25.135569	545	596
73	noname info@kieztandem.de	info@kieztandem.de	0174 2394904	2025-11-01 20:51:25.180861	2025-11-01 20:51:25.180861	331	597
74	Rudolf-Leonhard-Str.	\N	\N	2025-11-01 20:51:25.254917	2025-11-01 20:51:25.254917	1	3
75	Luckenwalder Straße	\N	\N	2025-11-01 20:51:25.290267	2025-11-01 20:51:25.290267	1	3
76	noname termine-hk@berliner-stadtmission.de	termine-hk@berliner-stadtmission.de	0170 2057696	2025-11-01 20:51:25.644434	2025-11-01 20:51:25.644434	379	598
77	Maxie-Wander-Str.	\N	\N	2025-11-01 20:51:25.726335	2025-11-01 20:51:25.726335	1	3
78	Haus Kopernikus	\N	\N	2025-11-01 20:51:25.96119	2025-11-01 20:51:25.96119	1	3
79	Alfred-Randt-Straße	vonmeltzer@berliner-stadtmission.de	01756046880	2025-11-01 20:51:26.084067	2025-11-01 20:51:26.084067	545	549
80	Fritz-Wildung-Straße	\N	\N	2025-11-01 20:51:26.105509	2025-11-01 20:51:26.105509	1	3
81	Am Oberhafen	ehrenamtskoordination@gu-oberhafen.de	030 2332 1961-36	2025-11-01 20:51:26.59695	2025-11-01 20:51:26.59695	543	599
82	Haarlemer Str.	Maria-Berenike.Haeusler@lfg-b.de	01511 507 663 4	2025-11-01 20:51:26.677588	2025-11-01 20:51:26.677588	544	600
83	Buchholzer Str.	\N	\N	2025-11-01 20:51:26.871628	2025-11-01 20:51:26.871628	1	3
84	Quittenweg	\N	\N	2025-11-01 20:51:27.61841	2025-11-01 20:51:27.61841	1	3
85	Grünauer Straße	\N	\N	2025-11-01 20:51:27.929755	2025-11-01 20:51:27.929755	1	3
86	Siverstorpstraße	\N	\N	2025-11-01 20:51:28.121495	2025-11-01 20:51:28.121495	1	3
87	Hagenower Ring	\N	\N	2025-11-01 20:51:29.114766	2025-11-01 20:51:29.114766	1	3
88	Albert-Kuntz-Str.	\N	\N	2025-11-01 20:51:29.598855	2025-11-01 20:51:29.598855	1	3
89	Bitterfelder Str.	\N	\N	2025-11-01 20:51:30.319223	2025-11-01 20:51:30.319223	1	3
\.


--
-- Data for Name: person; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.person (id, first_name, middle_name, last_name, email, phone, avatar_url, created_at, updated_at, address_id) FROM stdin;
1	John	Admin	Doe	\N	\N	\N	2025-11-01 20:51:11.090744	2025-11-01 20:51:11.090744	\N
2	Sarah	Coordinator	Doe	\N	\N	\N	2025-11-01 20:51:11.090744	2025-11-01 20:51:11.090744	\N
3	Anna	User	Doe	anna.doe@need4deed.org	\N	\N	2025-11-01 20:51:11.090744	2025-11-01 20:51:11.090744	1
4	Varuzhan	\N	Karapetyan	varuzhan.karapetyan23@gmail.com	+4917674904748	all_genders_avatar.png	2025-11-01 20:51:12.158151	2025-11-01 20:51:12.158151	2
5	laura	\N	castilo	lauraraquelcas@gmail.com	015770236121	all_genders_avatar.png	2025-11-01 20:51:12.158284	2025-11-01 20:51:12.158284	3
6	Sophie	\N	Irtenkauf	sophie.irtenkauf@uni-erfurt.de	017610815452	all_genders_avatar.png	2025-11-01 20:51:12.15841	2025-11-01 20:51:12.15841	4
7	Giulia	\N	\N	giulia_zaninelli@hotmail.it	0039 3498843112	all_genders_avatar.png	2025-11-01 20:51:12.159425	2025-11-01 20:51:12.159425	5
8	Ricardo	\N	Garcia	ricardogonzalezgar@gmail.com	+4915735121419	all_genders_avatar.png	2025-11-01 20:51:12.159654	2025-11-01 20:51:12.159654	6
9	Jane	\N	Sayner	jsccberlin@gmail.com	00491636281139	all_genders_avatar.png	2025-11-01 20:51:12.159814	2025-11-01 20:51:12.159814	8
10	Geumah	\N	Lee	rnakslak@gmail.com	+4917632595268	all_genders_avatar.png	2025-11-01 20:51:12.160783	2025-11-01 20:51:12.160783	11
11	Charlotte	\N	Goudouneix	charlotte.goudouneix@yahoo.fr	+33772151146	all_genders_avatar.png	2025-11-01 20:51:12.160947	2025-11-01 20:51:12.160947	12
12	Rafael	\N	Cardoso	rafaelcardoso.email@gmail.com	017657862561	all_genders_avatar.png	2025-11-01 20:51:12.162858	2025-11-01 20:51:12.162858	7
13	Jasmina	\N	\N	yasmina.hadjistoyanova@gmail.com	+359988959312	all_genders_avatar.png	2025-11-01 20:51:12.163617	2025-11-01 20:51:12.163617	14
14	Katina	\N	Schwarz	katina.schwarz@posteo.de	017632653028	all_genders_avatar.png	2025-11-01 20:51:12.162178	2025-11-01 20:51:12.162178	13
15	Frederike	\N	Helmke	frederike.helmke@web.de	015259575224	all_genders_avatar.png	2025-11-01 20:51:12.164057	2025-11-01 20:51:12.164057	15
16	Ashleigh	\N	White	south_ash@hotmail.co.uk	017643224393	all_genders_avatar.png	2025-11-01 20:51:12.16425	2025-11-01 20:51:12.16425	9
17	anna	\N	\N	kazarina.anna216@gmail.com	017645654312	all_genders_avatar.png	2025-11-01 20:51:12.16682	2025-11-01 20:51:12.16682	10
18	Lívia	\N	Romão	liviarmacedo1@gmail.com	+4917638846742	all_genders_avatar.png	2025-11-01 20:51:12.167999	2025-11-01 20:51:12.167999	16
19	Skylar	\N	Strange	viennaskylar@yahoo.com	+4915751161159	all_genders_avatar.png	2025-11-01 20:51:12.168743	2025-11-01 20:51:12.168743	18
20	Talia	\N	Yücel	talityucel@gmail.com	017682004506 @Taliaycl	all_genders_avatar.png	2025-11-01 20:51:12.168896	2025-11-01 20:51:12.168896	19
21	Aya	\N	Douba	ayadouba@gmail.com	Baataataa	all_genders_avatar.png	2025-11-01 20:51:12.167348	2025-11-01 20:51:12.167348	17
22	Laura	\N	\N	laura.diazmarugan@gmail.com	00491704988303	all_genders_avatar.png	2025-11-01 20:51:12.169046	2025-11-01 20:51:12.169046	20
23	Mika	\N	\N	mika.fugmann@gmail.com	0160 797 5572	all_genders_avatar.png	2025-11-01 20:51:12.169167	2025-11-01 20:51:12.169167	21
24	anna	\N	\N	annbritvina@gmail.com	49 175 8710618	all_genders_avatar.png	2025-11-01 20:51:12.169789	2025-11-01 20:51:12.169789	22
25	Nuriddin	\N	\N	saidovnuriddin@gmail.com	+491742312681	all_genders_avatar.png	2025-11-01 20:51:12.170474	2025-11-01 20:51:12.170474	23
26	Giorgia	\N	\N	giorgia.quartaroli1@gmail.com	00491603351607	all_genders_avatar.png	2025-11-01 20:51:12.170893	2025-11-01 20:51:12.170893	25
27	Oinamo	\N	\N	oina.sher@gmail.com	+4917676410304	all_genders_avatar.png	2025-11-01 20:51:12.171762	2025-11-01 20:51:12.171762	28
28	Liliia	\N	Ozharevska	p.lil4ik@gmail.com	+380975746728	all_genders_avatar.png	2025-11-01 20:51:12.173438	2025-11-01 20:51:12.173438	29
29	Agnieszka	\N	Piechnik	piechnikagnieszka@gmail.com	0048664581410	all_genders_avatar.png	2025-11-01 20:51:12.174089	2025-11-01 20:51:12.174089	24
30	Md	\N	Islam	arshad.ukmail@gmail.com	+491793452248	all_genders_avatar.png	2025-11-01 20:51:12.174881	2025-11-01 20:51:12.174881	31
31	Zhané	\N	Hylton	zhane-hylton1994@hotmail.co.uk	01734035424	all_genders_avatar.png	2025-11-01 20:51:12.175193	2025-11-01 20:51:12.175193	30
32	Elisa	\N	\N	elisa.facondini.95@gmail.com	00393491110841	all_genders_avatar.png	2025-11-01 20:51:12.176387	2025-11-01 20:51:12.176387	26
33	Monica	\N	Oberschelp	monica.oberschelp@web.de	015905243840	all_genders_avatar.png	2025-11-01 20:51:12.17739	2025-11-01 20:51:12.17739	27
34	Andris	\N	Braeuer	andibraeuer12@gmail.com	+49 162 5380150	all_genders_avatar.png	2025-11-01 20:51:12.178729	2025-11-01 20:51:12.178729	34
35	Julia	\N	Szabo	julialucaszabo@gmail.com	00306972609400	all_genders_avatar.png	2025-11-01 20:51:12.179366	2025-11-01 20:51:12.179366	32
36	Agathe	\N	Landel	agathe.landel1@hotmail.fr	+33676109171	all_genders_avatar.png	2025-11-01 20:51:12.179855	2025-11-01 20:51:12.179855	33
37	Aaron	\N	Woeste	ajwoeste@gmail.com	015237678457	all_genders_avatar.png	2025-11-01 20:51:12.18033	2025-11-01 20:51:12.18033	35
38	Mohanad	\N	Mabrouk	mohanad.mabrouk@gmail.com	+4915510640135	all_genders_avatar.png	2025-11-01 20:51:12.180926	2025-11-01 20:51:12.180926	36
39	Stanislas	\N	Chesnoy	chesnoy.stanislas@gmail.com	+33632562400	all_genders_avatar.png	2025-11-01 20:51:12.181748	2025-11-01 20:51:12.181748	38
40	Arshiyah	\N	Kotowaroo	arshiyahkotowaroo@gmail.com	+49 17666646677	all_genders_avatar.png	2025-11-01 20:51:12.181871	2025-11-01 20:51:12.181871	39
41	Selma	\N	Erdoğdu	selmanurerdogdu@gmail.com	+49 176 62123332	all_genders_avatar.png	2025-11-01 20:51:12.182447	2025-11-01 20:51:12.182447	40
42	Stefania	\N	\N	stefa.babaiants@gmail.com	01755944624	all_genders_avatar.png	2025-11-01 20:51:12.1816	2025-11-01 20:51:12.1816	37
43	Arturo	\N	Florio	florioarturo@gmail.com	+49 178911 8371	all_genders_avatar.png	2025-11-01 20:51:12.18379	2025-11-01 20:51:12.18379	41
44	Claudia	\N	Zapata	claudiazapataponce@gmail.com	015731661790	all_genders_avatar.png	2025-11-01 20:51:12.184963	2025-11-01 20:51:12.184963	45
45	Laura	\N	Toro	laura.toro@est.uexternado.edu.co	+57 3134781022	all_genders_avatar.png	2025-11-01 20:51:12.185615	2025-11-01 20:51:12.185615	46
46	Yassine	\N	Belam	belamyassine@gmail.com	00393487845232	all_genders_avatar.png	2025-11-01 20:51:12.185916	2025-11-01 20:51:12.185916	43
47	Najmeh	\N	Farhadian	najmehfarhadian323@yahoo.com	017684013762	all_genders_avatar.png	2025-11-01 20:51:12.186037	2025-11-01 20:51:12.186037	47
48	Haroon	\N	\N	sayedharoonsadat@hotmail.com	+4917674692956	all_genders_avatar.png	2025-11-01 20:51:12.186568	2025-11-01 20:51:12.186568	48
49	Stephanie	\N	Lund	steplund@gmail.com	015223495552	all_genders_avatar.png	2025-11-01 20:51:12.185786	2025-11-01 20:51:12.185786	42
50	Olena	\N	Smetanina	o.smetanka@icloud.com	@o_smetanka	all_genders_avatar.png	2025-11-01 20:51:12.187905	2025-11-01 20:51:12.187905	51
51	Najmeh	\N	Farhadian	najmehfarhadian323@yahoo.com	017684013762	all_genders_avatar.png	2025-11-01 20:51:12.188721	2025-11-01 20:51:12.188721	50
52	Sarah	\N	Liedtke	sar.liedtke@gmail.com	01772984030	all_genders_avatar.png	2025-11-01 20:51:12.187124	2025-11-01 20:51:12.187124	44
53	Faradin	\N	Aslinasab	fardinaslinasab@yahoo.de	017621693996	all_genders_avatar.png	2025-11-01 20:51:12.189119	2025-11-01 20:51:12.189119	49
54	Alexis	\N	Monnoyeur	alexis.monnoyeur@gmail.com	+33607822807	all_genders_avatar.png	2025-11-01 20:51:12.189635	2025-11-01 20:51:12.189635	52
55	Ahmed	\N	\N	ahmed299188@gmail.com	015786364990	all_genders_avatar.png	2025-11-01 20:51:12.190434	2025-11-01 20:51:12.190434	54
56	Golzar	\N	Atefi	atefigolzar@gmail.com	+33768333713	all_genders_avatar.png	2025-11-01 20:51:12.190543	2025-11-01 20:51:12.190543	55
57	Marie	\N	Minderjahn	marieminderjahn@gmail.com	+491637085417	all_genders_avatar.png	2025-11-01 20:51:12.191091	2025-11-01 20:51:12.191091	56
58	Tanja	\N	Tissen	tanja.tissen@gmail.com	015209494557	all_genders_avatar.png	2025-11-01 20:51:12.190303	2025-11-01 20:51:12.190303	53
59	Maziar	\N	\N	maziar.momenii@gmail.com	017663321801	all_genders_avatar.png	2025-11-01 20:51:12.192478	2025-11-01 20:51:12.192478	59
67	Theodore	\N	Evans	tjdcevans@gmail.com	+4917623735571	all_genders_avatar.png	2025-11-01 20:51:12.197127	2025-11-01 20:51:12.197127	60
74	Maryna	\N	\N	rado4ka2010@gmail.com	*491759703527	all_genders_avatar.png	2025-11-01 20:51:12.204367	2025-11-01 20:51:12.204367	73
83	Vladyslava	\N	\N	vladahekal@gmail.com	017676243422	all_genders_avatar.png	2025-11-01 20:51:12.21037	2025-11-01 20:51:12.21037	77
90	Ngwe	\N	Jordan	ngwebaleba123@gmail.com	+33605752559	all_genders_avatar.png	2025-11-01 20:51:12.214915	2025-11-01 20:51:12.214915	90
98	Adam	\N	Khaiauri	khayriadam262503@gmail.com	+49 163 4443697	all_genders_avatar.png	2025-11-01 20:51:12.219098	2025-11-01 20:51:12.219098	94
106	zeynep	\N	\N	zeynepsatir35@gmail.com	+4915204839362	all_genders_avatar.png	2025-11-01 20:51:12.223473	2025-11-01 20:51:12.223473	105
113	Salawu	\N	olawunmi	saok2019@yahoo.com	+2348052243294	all_genders_avatar.png	2025-11-01 20:51:12.230126	2025-11-01 20:51:12.230126	113
122	anna	\N	\N	kazarina.anna216@gmail.com	anyaizberlina	all_genders_avatar.png	2025-11-01 20:51:12.234739	2025-11-01 20:51:12.234739	121
131	Michael	\N	Guerin	mikexguerin@gmail.com	017677487247	all_genders_avatar.png	2025-11-01 20:51:12.238045	2025-11-01 20:51:12.238045	131
138	Natalia	\N	(dey/sie)	natashok1508@gmail.com	@natalischko	all_genders_avatar.png	2025-11-01 20:51:12.242572	2025-11-01 20:51:12.242572	137
144	Anna	\N	Dinwoodie	annalove4@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.246336	2025-11-01 20:51:12.246336	145
151	Bochra	\N	Mekno	bochra.mekni@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.250881	2025-11-01 20:51:12.250881	144
160	Imane	\N	Alaoui	elom.imane@gmail.com	+4917636268516	all_genders_avatar.png	2025-11-01 20:51:12.257617	2025-11-01 20:51:12.257617	154
169	Serhii	\N	\N	serhii.shteinikov@gmx.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.266488	2025-11-01 20:51:12.266488	169
179	Ondrej	\N	Surovec	o.surovec@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.274406	2025-11-01 20:51:12.274406	176
187	Timo	\N	\N	abatim@web.de	017645323617	all_genders_avatar.png	2025-11-01 20:51:12.282899	2025-11-01 20:51:12.282899	187
197	soukaina	\N	seffar	seffar.skn@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.29131	2025-11-01 20:51:12.29131	197
206	mati	\N	\N	mattgammie@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.30742	2025-11-01 20:51:12.30742	202
216	Sandra	\N	Jayamaha	sandrajayamaha400@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.317386	2025-11-01 20:51:12.317386	217
225	Gleb	\N	Beloborodov	belgangleb@gmail.com	+4917662667443	all_genders_avatar.png	2025-11-01 20:51:12.323	2025-11-01 20:51:12.323	224
233	badrie	\N	khalili	badrichc@molsa.gov.il	0506211133	all_genders_avatar.png	2025-11-01 20:51:12.329365	2025-11-01 20:51:12.329365	233
241	Adrian	\N	Reichow	adrianreichow@googlemail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.335397	2025-11-01 20:51:12.335397	240
250	Phil	\N	Cattani	phil_cattani@startmail.com	+491778801718	all_genders_avatar.png	2025-11-01 20:51:12.341303	2025-11-01 20:51:12.341303	247
257	Nicola	\N	Mellor	nikki.mellor1@gmail.com	+447989029724	all_genders_avatar.png	2025-11-01 20:51:12.346021	2025-11-01 20:51:12.346021	255
265	Adam	\N	\N	adam.andtraore@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.35118	2025-11-01 20:51:12.35118	262
273	Caroline	\N	\N	cs.maneno@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.355591	2025-11-01 20:51:12.355591	270
281	Najib	\N	Sadaat	najeeb.szu@gmail.com	015734109725	all_genders_avatar.png	2025-11-01 20:51:12.360122	2025-11-01 20:51:12.360122	278
288	Baris	\N	Karalar	karalarbaris@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.36454	2025-11-01 20:51:12.36454	286
297	Christine	\N	\N	tinousheen@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.368481	2025-11-01 20:51:12.368481	298
302	or	\N	\N	orkain@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.375348	2025-11-01 20:51:12.375348	301
309	Ellene	\N	\N	ellene.hartounian@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.384122	2025-11-01 20:51:12.384122	303
315	Mouna	\N	Hammoudi	mounahammoudi8@gmail.com	+49 176 80855166	all_genders_avatar.png	2025-11-01 20:51:12.388445	2025-11-01 20:51:12.388445	313
323	Pablo	\N	\N	pablosuana21@hotmail.com	+34679642056	all_genders_avatar.png	2025-11-01 20:51:12.393694	2025-11-01 20:51:12.393694	319
330	Antonia	\N	\N	antonia.lecour@gmail.com	015128261785	all_genders_avatar.png	2025-11-01 20:51:12.402391	2025-11-01 20:51:12.402391	329
340	Feruza	\N	Ochilova	feruzzkaochilova@gmail.com	017670001273	all_genders_avatar.png	2025-11-01 20:51:12.41377	2025-11-01 20:51:12.41377	338
348	Anamaria	\N	Koridze	koridze.anamaria@gmail.com	+4917670336575	all_genders_avatar.png	2025-11-01 20:51:12.419952	2025-11-01 20:51:12.419952	349
357	Hanna	\N	Carlsson	hannacar@stanford.edu	+1 7134388312	all_genders_avatar.png	2025-11-01 20:51:12.4245	2025-11-01 20:51:12.4245	356
365	Bedene	\N	Greenspan	bedeneg@aol.com	01746855020	all_genders_avatar.png	2025-11-01 20:51:12.429382	2025-11-01 20:51:12.429382	364
373	Mahreen	\N	Zaidi	mahrsanmiguel@gmail.com	+49 177 1956252	all_genders_avatar.png	2025-11-01 20:51:12.434271	2025-11-01 20:51:12.434271	369
381	Bartosz	\N	Plotka	bartosz.plotka1@gmail.com	015163434791	all_genders_avatar.png	2025-11-01 20:51:12.438592	2025-11-01 20:51:12.438592	380
388	Tara	\N	Horan	tarahoran1979@gmail.com	015236364875	all_genders_avatar.png	2025-11-01 20:51:12.443333	2025-11-01 20:51:12.443333	387
396	Kazuyuki	\N	Murphey	kaz.iiokamurphey@gmail.com	+1 3343330617	all_genders_avatar.png	2025-11-01 20:51:12.448847	2025-11-01 20:51:12.448847	394
405	Inga	\N	\N	ingaridder@web.de	Ingar8	all_genders_avatar.png	2025-11-01 20:51:12.453951	2025-11-01 20:51:12.453951	397
412	Katri	\N	Nykänen	katri.nykanen@gmail.com	17672426811	all_genders_avatar.png	2025-11-01 20:51:12.458574	2025-11-01 20:51:12.458574	409
421	Shayne	\N	Wenzel	shayne.wenzel22@gmail.com	+4917636668529	all_genders_avatar.png	2025-11-01 20:51:12.464624	2025-11-01 20:51:12.464624	420
429	Hoi	\N	Ng	angelhoiching@gmail.com	+49 15752459681	all_genders_avatar.png	2025-11-01 20:51:12.474649	2025-11-01 20:51:12.474649	429
438	Philipp	\N	Chapkovski	chapkovski@gmail.com	015123570022	all_genders_avatar.png	2025-11-01 20:51:12.483561	2025-11-01 20:51:12.483561	437
447	Yuqing	\N	Lei	leslielei19@gmail.com	0170 1858122	all_genders_avatar.png	2025-11-01 20:51:12.489899	2025-11-01 20:51:12.489899	445
455	Ahmad	\N	Amr	mouriamrx@gmail.com	00491628624923	all_genders_avatar.png	2025-11-01 20:51:12.500277	2025-11-01 20:51:12.500277	451
463	Chris	\N	Droppa	chris.droppa@gmail.com	+4917679834531	all_genders_avatar.png	2025-11-01 20:51:12.505705	2025-11-01 20:51:12.505705	463
472	Mercita	\N	Benjamin	mercitajbenjamin@gmail.com	612550183	all_genders_avatar.png	2025-11-01 20:51:12.510773	2025-11-01 20:51:12.510773	473
480	Elif	\N	Mungan	elifmungann97@gmail.com	+491629620622	all_genders_avatar.png	2025-11-01 20:51:12.517314	2025-11-01 20:51:12.517314	480
489	Daniele	\N	Musmarra	musmarrad@gmail.com	+4917635502084	all_genders_avatar.png	2025-11-01 20:51:12.527673	2025-11-01 20:51:12.527673	488
498	Aline	\N	\N	lenimorr@bennington.edu	+1 312 343 1204	all_genders_avatar.png	2025-11-01 20:51:12.536004	2025-11-01 20:51:12.536004	497
506	Jeannette	\N	Greven	jfg2121@gmail.com	01792393247	all_genders_avatar.png	2025-11-01 20:51:12.541742	2025-11-01 20:51:12.541742	505
513	Simal	\N	\N	simalparlak@gmail.com	+491775498002	all_genders_avatar.png	2025-11-01 20:51:12.546199	2025-11-01 20:51:12.546199	510
522	Azéline	\N	Boucher	azeline.boucher@tutanota.com	15510768252	all_genders_avatar.png	2025-11-01 20:51:12.550565	2025-11-01 20:51:12.550565	521
527	Paula	\N	Oliveira	paulaemmerling@gmail.com	015256541191	all_genders_avatar.png	2025-11-01 20:51:12.644697	2025-11-01 20:51:12.644697	525
530	Asgari	\N	\N	roxaasghari@gmail.com	01636289612	all_genders_avatar.png	2025-11-01 20:51:12.749514	2025-11-01 20:51:12.749514	528
60	Austin	\N	Chase	austinsydneychase@icloud.com	AustinChase	all_genders_avatar.png	2025-11-01 20:51:12.193882	2025-11-01 20:51:12.193882	57
69	Ani	\N	\N	anniebarbakadze@gmail.com	+491601411654	all_genders_avatar.png	2025-11-01 20:51:12.199976	2025-11-01 20:51:12.199976	68
76	Ирина	\N	\N	irinaoleg0213@gmail.com	015253264087	all_genders_avatar.png	2025-11-01 20:51:12.205744	2025-11-01 20:51:12.205744	75
85	Rankob	\N	\N	rankov1961@gmail.com	017620353791	all_genders_avatar.png	2025-11-01 20:51:12.211673	2025-11-01 20:51:12.211673	83
91	ella	\N	stone	ellafrancescastone@gmail.com	017631151997	all_genders_avatar.png	2025-11-01 20:51:12.216074	2025-11-01 20:51:12.216074	86
100	Ilan	\N	Woodward	mr.jones175@gmail.com	+33601441967 or @yolo127	all_genders_avatar.png	2025-11-01 20:51:12.220161	2025-11-01 20:51:12.220161	100
109	SakeenaTalat	\N	\N	ayaalja299@gmail.com	+49 1637431291	all_genders_avatar.png	2025-11-01 20:51:12.224966	2025-11-01 20:51:12.224966	107
119	Ingrid	\N	Hardy	gridou.35@hotmail.fr	+33 673233007	all_genders_avatar.png	2025-11-01 20:51:12.230995	2025-11-01 20:51:12.230995	118
129	Göran	\N	Kügler	goeran.kuegler@gmx.de	+4917630510116	all_genders_avatar.png	2025-11-01 20:51:12.23757	2025-11-01 20:51:12.23757	128
142	Sakina	\N	Lagzaee	s.lakzaee@gmail.com	015904866332	all_genders_avatar.png	2025-11-01 20:51:12.243469	2025-11-01 20:51:12.243469	135
149	Hala	\N	Mardini	halamardini999@hotmail.com	01783589545	all_genders_avatar.png	2025-11-01 20:51:12.248774	2025-11-01 20:51:12.248774	150
156	Sylvia	\N	Chen	sylvia.y.chen@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.253082	2025-11-01 20:51:12.253082	156
166	Ammar	\N	\N	ammarralahmad@gmail.com	01777217552	all_genders_avatar.png	2025-11-01 20:51:12.262066	2025-11-01 20:51:12.262066	164
174	Hafsa	\N	Bennis	hafsa.bennis@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.27021	2025-11-01 20:51:12.27021	174
184	Vera	\N	Shchelkina	imitator@gmail.com	+491782068181	all_genders_avatar.png	2025-11-01 20:51:12.278681	2025-11-01 20:51:12.278681	185
193	Sara	\N	Ashour	sara.samir.89@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.286449	2025-11-01 20:51:12.286449	192
203	Kay	\N	Teuber	kayteuber49@gmail.com	015201318972	all_genders_avatar.png	2025-11-01 20:51:12.296005	2025-11-01 20:51:12.296005	203
212	Jason	\N	Woods	woods.jas@me.com	01727251552	all_genders_avatar.png	2025-11-01 20:51:12.312452	2025-11-01 20:51:12.312452	212
222	Mahshid	\N	Sherafat	sherafat.mahshid@gmail.com	01791179051	all_genders_avatar.png	2025-11-01 20:51:12.320313	2025-11-01 20:51:12.320313	221
230	Vitoria	\N	maielo	vitoriamaielobarretomachado@gmail.com	+49 17622629451	all_genders_avatar.png	2025-11-01 20:51:12.326842	2025-11-01 20:51:12.326842	230
239	Altaï	\N	\N	altaidarrieu@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.332319	2025-11-01 20:51:12.332319	232
247	Jennifer	\N	\N	jenniferjaison03@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.338279	2025-11-01 20:51:12.338279	239
256	Maddy	\N	Black	mjblack2020@outlook.com	07732289013	all_genders_avatar.png	2025-11-01 20:51:12.343797	2025-11-01 20:51:12.343797	248
261	Valentina	\N	Bodini	valentina.bodini93@gmail.com	+4917630664355	all_genders_avatar.png	2025-11-01 20:51:12.348874	2025-11-01 20:51:12.348874	260
269	Imran	\N	Mohammad	sheikhimransir@gmail.com	015212821339	all_genders_avatar.png	2025-11-01 20:51:12.353402	2025-11-01 20:51:12.353402	268
277	Ergin	\N	Egeli	egeliergin@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.357924	2025-11-01 20:51:12.357924	277
285	Katinka	\N	Pim	katinkapim21@icloud.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.362263	2025-11-01 20:51:12.362263	284
294	Ganesh	\N	\N	nickverheul@live.nl	+31644486742	all_genders_avatar.png	2025-11-01 20:51:12.368129	2025-11-01 20:51:12.368129	289
301	Sara	\N	Perego	peregosara06@yahoo.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.3729	2025-11-01 20:51:12.3729	296
306	Peggy	\N	\N	peggyhughes375@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.382157	2025-11-01 20:51:12.382157	308
313	Ahmed	\N	Sobky	asobky@gmail.com	@sobky87	all_genders_avatar.png	2025-11-01 20:51:12.387604	2025-11-01 20:51:12.387604	312
322	Asli	\N	Yilmaz	solmazz.asli@gmail.com	https://t.me/solmazzasli	all_genders_avatar.png	2025-11-01 20:51:12.392685	2025-11-01 20:51:12.392685	317
329	Riccardo	\N	\N	rrichards07@hotmail.com	+49 174 7320897	all_genders_avatar.png	2025-11-01 20:51:12.400406	2025-11-01 20:51:12.400406	327
338	Qing	\N	Liu	qingliu0207@gmail.com	017672869560	all_genders_avatar.png	2025-11-01 20:51:12.411385	2025-11-01 20:51:12.411385	333
347	Julia	\N	Moog	julia-moog@web.de	015141849067	all_genders_avatar.png	2025-11-01 20:51:12.419044	2025-11-01 20:51:12.419044	348
354	Matin	\N	Hoseinpanah	hpanah.m@gmail.com	015129511053	all_genders_avatar.png	2025-11-01 20:51:12.42337	2025-11-01 20:51:12.42337	353
363	Mohamedkhaled	\N	\N	mohamedkhaledsaref90@gmail.com	01201823994	all_genders_avatar.png	2025-11-01 20:51:12.428255	2025-11-01 20:51:12.428255	362
371	Can	\N	Asal	asal.can@gmail.com	+491772377799	all_genders_avatar.png	2025-11-01 20:51:12.433365	2025-11-01 20:51:12.433365	372
379	Alexandra	\N	Kudlek	alexandra-kudlek@web.de	01729380752	all_genders_avatar.png	2025-11-01 20:51:12.437748	2025-11-01 20:51:12.437748	378
386	Katharina	\N	Dieball	katharinadieball@t-online.de	+4917639901360	all_genders_avatar.png	2025-11-01 20:51:12.442404	2025-11-01 20:51:12.442404	382
394	Floris	\N	Alphen	floris.alphen@outlook.de	017623262478	all_genders_avatar.png	2025-11-01 20:51:12.447806	2025-11-01 20:51:12.447806	391
402	Adriana	\N	Cervantes	mirandacervantes.adriana@gmail.com	017634692567	all_genders_avatar.png	2025-11-01 20:51:12.453069	2025-11-01 20:51:12.453069	402
410	Marie	\N	Stahlhofen	marie.stahlhofen@posteo.de	015750275862	all_genders_avatar.png	2025-11-01 20:51:12.457554	2025-11-01 20:51:12.457554	410
419	Lea	\N	Zeller	l.zeller234@gmail.com	+4915150704661	all_genders_avatar.png	2025-11-01 20:51:12.462918	2025-11-01 20:51:12.462918	419
427	Margherita	\N	Concina	margheritaelenaconcina@gmail.com	+49 1622775869	all_genders_avatar.png	2025-11-01 20:51:12.472857	2025-11-01 20:51:12.472857	427
437	Polina	\N	\N	polina.zvezd@gmail.com	015239541353	all_genders_avatar.png	2025-11-01 20:51:12.481109	2025-11-01 20:51:12.481109	436
444	Nora	\N	Fermor	n.fermor@gmx.de	017647301389	all_genders_avatar.png	2025-11-01 20:51:12.488732	2025-11-01 20:51:12.488732	441
453	Mila	\N	Hueter	hueter.mila@gmail.com	15154840657	all_genders_avatar.png	2025-11-01 20:51:12.493856	2025-11-01 20:51:12.493856	453
461	Sara	\N	Guldbrandt	sara.guldbrandt@gmail.com	+4560718570	all_genders_avatar.png	2025-11-01 20:51:12.504946	2025-11-01 20:51:12.504946	457
469	Benjamin	\N	Salon	benjamin.salon1@gmail.com	+33665690805	all_genders_avatar.png	2025-11-01 20:51:12.509894	2025-11-01 20:51:12.509894	471
477	Ilyas	\N	\N	ilyas.gue@gmail.com	+33651083811	all_genders_avatar.png	2025-11-01 20:51:12.515668	2025-11-01 20:51:12.515668	477
485	Sophia	\N	Tilsen	bejena2500@gmail.com	@huibuuuh	all_genders_avatar.png	2025-11-01 20:51:12.525899	2025-11-01 20:51:12.525899	486
494	Steve	\N	\N	srrogue@gmail.com	55555555555	all_genders_avatar.png	2025-11-01 20:51:12.53444	2025-11-01 20:51:12.53444	493
503	Yevheniia	\N	Hubenko	2310po@gmail.com	+4915206821129	all_genders_avatar.png	2025-11-01 20:51:12.540817	2025-11-01 20:51:12.540817	504
511	Nilgun	\N	Sadik	nilgnbyrkdr@gmail.com	015772782681	all_genders_avatar.png	2025-11-01 20:51:12.545471	2025-11-01 20:51:12.545471	512
519	Dipthi	\N	Chacko	chokloti6@gmail.com	015229549319	all_genders_avatar.png	2025-11-01 20:51:12.549649	2025-11-01 20:51:12.549649	515
61	Ehsan	\N	Aliabadi	ehsan.e.aliabadi@gmail.com	01631279911	all_genders_avatar.png	2025-11-01 20:51:12.194442	2025-11-01 20:51:12.194442	61
70	Laura	\N	Stuhler	laura.stuhler98@gmail.com	+4916097556977	all_genders_avatar.png	2025-11-01 20:51:12.200738	2025-11-01 20:51:12.200738	64
77	Karishma	\N	\N	karishmabhugul@gmail.com	+49 152 04319810	all_genders_avatar.png	2025-11-01 20:51:12.206512	2025-11-01 20:51:12.206512	76
86	Marika	\N	\N	marsavych@gmail.com	marsavych	all_genders_avatar.png	2025-11-01 20:51:12.212088	2025-11-01 20:51:12.212088	84
92	Ahmad	\N	Bakdad	bakdad.de@gmail.com	004915735563523	all_genders_avatar.png	2025-11-01 20:51:12.216463	2025-11-01 20:51:12.216463	91
101	Amelie	\N	Riedesel	amelie-riedesel@web.de	015110790844	all_genders_avatar.png	2025-11-01 20:51:12.220547	2025-11-01 20:51:12.220547	98
110	Josephine	\N	Draper	josephine.draper@gmail.com	01633680575	all_genders_avatar.png	2025-11-01 20:51:12.225374	2025-11-01 20:51:12.225374	108
118	Nilufarkhon	\N	Akiljonova	nakiljanova@gmail.com	015736684638	all_genders_avatar.png	2025-11-01 20:51:12.230731	2025-11-01 20:51:12.230731	111
130	Lida	\N	\N	leeda.ebrahimi@gmail.com	@Zebra1110	all_genders_avatar.png	2025-11-01 20:51:12.237766	2025-11-01 20:51:12.237766	129
157	Helen	\N	Faller	helen.faller@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.253614	2025-11-01 20:51:12.253614	157
167	Erin	\N	Kelso	erin.maria.kelso@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.262724	2025-11-01 20:51:12.262724	165
175	Rebecca	\N	Hill	rj.hill24@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.270843	2025-11-01 20:51:12.270843	170
185	Omar	\N	\N	omar.km91m@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.279332	2025-11-01 20:51:12.279332	182
194	Francesca	\N	Brauer	frannibr@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.287125	2025-11-01 20:51:12.287125	191
204	Eimal	\N	Daqiq	aimaldaqiq786@gmail.com	+49 157 53220988	all_genders_avatar.png	2025-11-01 20:51:12.296709	2025-11-01 20:51:12.296709	204
213	Alba	\N	Melguizo	albamelgap@gmail.com	0034671835549	all_genders_avatar.png	2025-11-01 20:51:12.31324	2025-11-01 20:51:12.31324	213
223	Pamela	\N	(coordinator)	pamela.jesreil@joindeed.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.320809	2025-11-01 20:51:12.320809	216
231	Maria	\N	Gomez	maria.fernanda.gomez@zalando.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.327286	2025-11-01 20:51:12.327286	225
245	Gwynith	\N	Tucker	gwynitht@gmail.com	+4917659177520	all_genders_avatar.png	2025-11-01 20:51:12.336913	2025-11-01 20:51:12.336913	245
254	Selin	\N	Bal	selinnbal97@gmail.com	015750659508	all_genders_avatar.png	2025-11-01 20:51:12.342126	2025-11-01 20:51:12.342126	253
263	Narges	\N	Toyserkani	nargess.mt@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.35089	2025-11-01 20:51:12.35089	264
279	Nikola	\N	Říhová	nikola.rihova16@seznam.cz	+420 722756286	all_genders_avatar.png	2025-11-01 20:51:12.356914	2025-11-01 20:51:12.356914	276
291	Camille	\N	Luc	camillemluc@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.365691	2025-11-01 20:51:12.365691	292
308	Emma	\N	Przybilla	przybilla.emma@gmail.com	Insta emma.milaa	all_genders_avatar.png	2025-11-01 20:51:12.383824	2025-11-01 20:51:12.383824	305
321	Mitra	\N	Teimoorzadeh	mitra0210@gmail.com	01772131330	all_genders_avatar.png	2025-11-01 20:51:12.39192	2025-11-01 20:51:12.39192	323
333	Vera	\N	Schmidt	veramariaschmidt@gmail.com	00491637658612	all_genders_avatar.png	2025-11-01 20:51:12.404727	2025-11-01 20:51:12.404727	332
343	Elena	\N	Solonnikov	esolonnikov@aol.de	+4915773576582	all_genders_avatar.png	2025-11-01 20:51:12.415682	2025-11-01 20:51:12.415682	341
352	Theresa	\N	Freitag	theresa.freitag@gmx.net	015234102452	all_genders_avatar.png	2025-11-01 20:51:12.422474	2025-11-01 20:51:12.422474	347
362	Bartosz	\N	Plotka	bartosz.plotka1@gmail.com	015163434791	all_genders_avatar.png	2025-11-01 20:51:12.427292	2025-11-01 20:51:12.427292	358
370	Kseniia	\N	\N	madambagaeva@gmail.com	Telegram/WhatsApp: +380935247463	all_genders_avatar.png	2025-11-01 20:51:12.432256	2025-11-01 20:51:12.432256	367
378	Stephanie	\N	Cybulla	stephanie.cybulla@gmx.de	+4915204099453	all_genders_avatar.png	2025-11-01 20:51:12.43667	2025-11-01 20:51:12.43667	370
385	Raúl	\N	\N	radaroaq@gmail.com	radaroaq1	all_genders_avatar.png	2025-11-01 20:51:12.441018	2025-11-01 20:51:12.441018	384
393	Emma	\N	Glajchen	glajchenemma@gmail.com	+19148749599	all_genders_avatar.png	2025-11-01 20:51:12.446408	2025-11-01 20:51:12.446408	392
401	Jeff	\N	Hinson	jeffmbsr@gmail.com	+49 17660856004	all_genders_avatar.png	2025-11-01 20:51:12.45173	2025-11-01 20:51:12.45173	395
409	Ibrahim	\N	Albakkar	ibrahimalbakkar0@gmail.com	017680125025	all_genders_avatar.png	2025-11-01 20:51:12.456576	2025-11-01 20:51:12.456576	407
417	Maral	\N	Vafaei	ma.vafaei92@gmail.com	17627459848	all_genders_avatar.png	2025-11-01 20:51:12.461666	2025-11-01 20:51:12.461666	418
425	Laila	\N	Fakori	laila.fakory@gmail.com	017641755448	all_genders_avatar.png	2025-11-01 20:51:12.470397	2025-11-01 20:51:12.470397	424
434	Ava	\N	Twohig	ava@lilipadlibrary.org	+14154240166	all_genders_avatar.png	2025-11-01 20:51:12.479048	2025-11-01 20:51:12.479048	434
443	Jayasurya	\N	Mohan	jayasuryamohan.24@gmail.com	+49 15510804653	all_genders_avatar.png	2025-11-01 20:51:12.487147	2025-11-01 20:51:12.487147	443
454	Bassem	\N	Ibrahim	bassemmohamed1994@gmail.com	17671769320	all_genders_avatar.png	2025-11-01 20:51:12.494345	2025-11-01 20:51:12.494345	454
466	Mia	\N	Knezevic	miaisabelak@gmail.com	+16509466613	all_genders_avatar.png	2025-11-01 20:51:12.50682	2025-11-01 20:51:12.50682	467
479	Ziad	\N	Almaraghi	ziad.maraghi@hotmail.com	017680797488	all_genders_avatar.png	2025-11-01 20:51:12.514433	2025-11-01 20:51:12.514433	474
487	(Anahita)Fatemeh	\N	Sheykh	fateme.gheysari8686@gmail.com	15732119905	all_genders_avatar.png	2025-11-01 20:51:12.526793	2025-11-01 20:51:12.526793	484
496	Ulrike	\N	Carrillo	ulrikecarrillo@yahoo.de	015755513213	all_genders_avatar.png	2025-11-01 20:51:12.535251	2025-11-01 20:51:12.535251	496
510	Aya	\N	Jlaoul	jlaoulaya2@gmail.com	+49 174 6414314	all_genders_avatar.png	2025-11-01 20:51:12.543185	2025-11-01 20:51:12.543185	503
536	Mohammad	\N	Hakim	m.hakim@albatrosggmbh.de	0176 1983 1254	all_genders_avatar.png	2025-11-01 20:51:19.964302	2025-11-01 20:51:19.964302	534
62	Asena	\N	Yazdic	gokce.yazdic@gmail.com	17677861592	all_genders_avatar.png	2025-11-01 20:51:12.194579	2025-11-01 20:51:12.194579	62
75	Khaled	\N	\N	kerdjakhaled2@gmail.com	0668122770	all_genders_avatar.png	2025-11-01 20:51:12.205242	2025-11-01 20:51:12.205242	74
84	Akya	\N	Tugran	akyadeniztugran@gmail.com	00491797418744	all_genders_avatar.png	2025-11-01 20:51:12.210956	2025-11-01 20:51:12.210956	82
93	Ibthal	\N	Hanafi	ibthal.hanafi@gmail.com	+49 1516 4652479	all_genders_avatar.png	2025-11-01 20:51:12.216734	2025-11-01 20:51:12.216734	92
105	Biget	\N	Ulutaş	bigetulutas96@gmail.com	017623619832	all_genders_avatar.png	2025-11-01 20:51:12.2227	2025-11-01 20:51:12.2227	104
120	Alia	\N	Abdelhamid	alia.marzouk@hotmail.com	01626634109	all_genders_avatar.png	2025-11-01 20:51:12.231112	2025-11-01 20:51:12.231112	116
128	Sina	\N	Mahmoodi	sina.mahmoodi.cs@gmail.com	015780927620	all_genders_avatar.png	2025-11-01 20:51:12.237401	2025-11-01 20:51:12.237401	126
140	Naureen	\N	Mustafa	naureenmustafa5@gmail.com	+4915257481357	all_genders_avatar.png	2025-11-01 20:51:12.243231	2025-11-01 20:51:12.243231	139
146	Ayla	\N	Munem	ayla.munem@gmail.com	015755719670	all_genders_avatar.png	2025-11-01 20:51:12.246806	2025-11-01 20:51:12.246806	147
153	Pinar	\N	\N	czpinar@hotmail.com	01601840012	all_genders_avatar.png	2025-11-01 20:51:12.251316	2025-11-01 20:51:12.251316	146
162	Neama	\N	Khaled	neamaakahledmansour123@gmail.com	+201005312775	all_genders_avatar.png	2025-11-01 20:51:12.25842	2025-11-01 20:51:12.25842	159
171	Maria	\N	Golubeva	maria.sergeevna.golubeva@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.26724	2025-11-01 20:51:12.26724	172
181	Ksenija	\N	SundejevA	ksenija.sundejeva@posteo.net	\N	all_genders_avatar.png	2025-11-01 20:51:12.275095	2025-11-01 20:51:12.275095	179
189	Maihan	\N	\N	mihanekhteyari44@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.283572	2025-11-01 20:51:12.283572	189
199	Merve	\N	Agin	merveagin@gmail.com	+49 1520 4509363	all_genders_avatar.png	2025-11-01 20:51:12.292203	2025-11-01 20:51:12.292203	193
208	Carlotta	\N	Geerds	lotta.geerds@gmail.com	01743353312	all_genders_avatar.png	2025-11-01 20:51:12.308517	2025-11-01 20:51:12.308517	207
218	Milan	\N	Alblinger	miamica1998@hotmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.31789	2025-11-01 20:51:12.31789	214
227	Habib	\N	isamil	habib.ismael3@gmail.com	+49 176 84382573	all_genders_avatar.png	2025-11-01 20:51:12.32337	2025-11-01 20:51:12.32337	227
235	Yana	\N	Ivanova	ivanovayana@hotmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.329897	2025-11-01 20:51:12.329897	234
243	Richard	\N	Wanekeya	richard.wanekeya@gmail.com	+4915754831373	all_genders_avatar.png	2025-11-01 20:51:12.336084	2025-11-01 20:51:12.336084	243
252	Rahul	\N	Prosper	rahuljersonm@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.341724	2025-11-01 20:51:12.341724	251
259	Umair	\N	Sarfraz	aquadestructor@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.34643	2025-11-01 20:51:12.34643	258
267	Alejandra	\N	Morin	alejandravijil@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.351587	2025-11-01 20:51:12.351587	266
275	Ebru	\N	Duhan	e.dursn@hotmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.356008	2025-11-01 20:51:12.356008	275
283	Linn	\N	Blomkvist	linn.m.blomkvist@gmail.com	+4798817653	all_genders_avatar.png	2025-11-01 20:51:12.360531	2025-11-01 20:51:12.360531	282
290	Vladislav	\N	Timoshenko	kidalv2012@gmail.com	01787567428	all_genders_avatar.png	2025-11-01 20:51:12.365138	2025-11-01 20:51:12.365138	291
305	Mia	\N	\N	miasdarmawan@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.380523	2025-11-01 20:51:12.380523	304
314	zhenja	\N	\N	feygl.jp@gmail.com	015121396286	all_genders_avatar.png	2025-11-01 20:51:12.388157	2025-11-01 20:51:12.388157	310
326	Gian	\N	Abdulla	gian.abdulla@gmail.com	017683282274	all_genders_avatar.png	2025-11-01 20:51:12.395453	2025-11-01 20:51:12.395453	324
339	Yasmeen	\N	Batool	yasmeen.batool37@gmail.com	+491782969714	all_genders_avatar.png	2025-11-01 20:51:12.409372	2025-11-01 20:51:12.409372	337
356	Clémence	\N	CARRE	clemence.2975@gmail.com	+33618206323	all_genders_avatar.png	2025-11-01 20:51:12.422626	2025-11-01 20:51:12.422626	352
372	Silvia	\N	Zanetti	silvia.zanetti.97@hotmail.com	0157 5404 3131	all_genders_avatar.png	2025-11-01 20:51:12.432654	2025-11-01 20:51:12.432654	371
387	Aya	\N	Kouamé	aya.kwame@gmx.net	0173 6050770	all_genders_avatar.png	2025-11-01 20:51:12.441451	2025-11-01 20:51:12.441451	385
404	Oskar	\N	Burmann	oskar.burmann@gmx.de	1778593331	all_genders_avatar.png	2025-11-01 20:51:12.452344	2025-11-01 20:51:12.452344	401
420	Marlene	\N	Sonnemann	sonnemann.marlene2006@gmail.com	017657984166	all_genders_avatar.png	2025-11-01 20:51:12.462111	2025-11-01 20:51:12.462111	413
436	alice	\N	\N	alice_massam@hotmail.com	+491748203465	all_genders_avatar.png	2025-11-01 20:51:12.477423	2025-11-01 20:51:12.477423	432
452	Zakia	\N	Soomauroo	s.zakia@pm.me	015147057626	all_genders_avatar.png	2025-11-01 20:51:12.491439	2025-11-01 20:51:12.491439	449
462	Autumn	\N	Scott	scottautumn16@gmail.com	scottumn	all_genders_avatar.png	2025-11-01 20:51:12.505388	2025-11-01 20:51:12.505388	461
470	Tatjana	\N	Shigailow	shigailowt@gmail.com	+4917656729900	all_genders_avatar.png	2025-11-01 20:51:12.510285	2025-11-01 20:51:12.510285	468
478	Jelena	\N	Ristic	rjelena2013@gmail.com	017676215501	all_genders_avatar.png	2025-11-01 20:51:12.516353	2025-11-01 20:51:12.516353	478
486	Amelie	\N	Hornung	amelie.hornung195@gmail.com	015739541333	all_genders_avatar.png	2025-11-01 20:51:12.5265	2025-11-01 20:51:12.5265	482
495	Zabiullah	\N	\N	znoori931@gmail.com	015213427595	all_genders_avatar.png	2025-11-01 20:51:12.53497	2025-11-01 20:51:12.53497	495
504	Karla	\N	Ricaurte	kvrv29@gmail.com	+49 152 36994814	all_genders_avatar.png	2025-11-01 20:51:12.541134	2025-11-01 20:51:12.541134	500
515	Kathryn	\N	Gorman	kathrynmaree777@gmail.com	1721647773	all_genders_avatar.png	2025-11-01 20:51:12.547154	2025-11-01 20:51:12.547154	511
524	Aya	\N	Moh	aya.eryani@gmail.com	015123177819	all_genders_avatar.png	2025-11-01 20:51:12.551479	2025-11-01 20:51:12.551479	522
538	Ndiabel	\N	Dieng	dieng@awo-mitte.de	0306800790285	all_genders_avatar.png	2025-11-01 20:51:20.479587	2025-11-01 20:51:20.479587	318
539	Christina	\N	Kirilenko	sozialdienst.dingolfinger@drk-mueggelspree.de	030239893078	all_genders_avatar.png	2025-11-01 20:51:20.526009	2025-11-01 20:51:20.526009	535
540	Alessia	\N	Arbustini	alessia.arbustini@ib.de	+4915785557305	all_genders_avatar.png	2025-11-01 20:51:20.563906	2025-11-01 20:51:20.563906	536
541	Wana	\N	Omar	omar@awo-mitte.de	0151 414 011 32	all_genders_avatar.png	2025-11-01 20:51:20.58723	2025-11-01 20:51:20.58723	367
542	Tom	\N	Weichert	t.weichert@sin-ev.de	03074001805	all_genders_avatar.png	2025-11-01 20:51:20.61762	2025-11-01 20:51:20.61762	366
543	Arrate	\N	Gutierrez	arrate.gutierrez@lfg-b.de	030 213 099 230	all_genders_avatar.png	2025-11-01 20:51:20.645281	2025-11-01 20:51:20.645281	353
544	Lisa	\N	Bauer	sozialteam.blumbergerdamm@heroeurope.com	030 40 36 40 337	all_genders_avatar.png	2025-11-01 20:51:20.673939	2025-11-01 20:51:20.673939	537
545	Luca	\N	McGhie	l.mcghie@sin-ev.de	03089742660	all_genders_avatar.png	2025-11-01 20:51:20.696452	2025-11-01 20:51:20.696452	391
546	Refik	\N	Aday	aday@drk-mueggelspree.de	030 5130 190-08	all_genders_avatar.png	2025-11-01 20:51:20.739772	2025-11-01 20:51:20.739772	538
547	alexandra.schafflhuber	\N	\N	alexandra.schafflhuber@elkb.de	0151 65662532	all_genders_avatar.png	2025-11-01 20:51:20.763845	2025-11-01 20:51:20.763845	2
548	Marie	\N	Paquignon	marie.paquignon@ib.de	03030096746	all_genders_avatar.png	2025-11-01 20:51:20.917664	2025-11-01 20:51:20.917664	524
549	Malin	\N	Meltzer	vonmeltzer@berliner-stadtmission.de	01756046880	all_genders_avatar.png	2025-11-01 20:51:20.950945	2025-11-01 20:51:20.950945	334
550	Slfana	\N	Kurbag	kurbag@drk-mueggelspree.de	030239893062	all_genders_avatar.png	2025-11-01 20:51:21.133372	2025-11-01 20:51:21.133372	533
63	Hadeer	\N	Hassan	hadeer.hesham94@hotmail.com	01788029155	all_genders_avatar.png	2025-11-01 20:51:12.194813	2025-11-01 20:51:12.194813	58
79	AMEDE	\N	NIYONGERE	amede.niyongere@gmail.com	+491601508031	all_genders_avatar.png	2025-11-01 20:51:12.207742	2025-11-01 20:51:12.207742	79
87	Fabienne	\N	Buchner	fabienne.bcnr@gmail.com	+4915159433905	all_genders_avatar.png	2025-11-01 20:51:12.212941	2025-11-01 20:51:12.212941	87
95	Amin	\N	Rashti	amin.mnr@gmail.com	+4915158871158	all_genders_avatar.png	2025-11-01 20:51:12.216956	2025-11-01 20:51:12.216956	96
103	Andreas	\N	Nielsen	geyserq@gmail.com	015228030799	all_genders_avatar.png	2025-11-01 20:51:12.221218	2025-11-01 20:51:12.221218	99
116	DENIZ	\N	SCHULZE	deniz.schulze@gmail.com	015901310166	all_genders_avatar.png	2025-11-01 20:51:12.230495	2025-11-01 20:51:12.230495	110
126	Katharina	\N	Tittel	katharina.tittel@sciencespo.fr	+491637810066 / @ktnbu	all_genders_avatar.png	2025-11-01 20:51:12.235859	2025-11-01 20:51:12.235859	123
136	Matteo	\N	\N	cattablack@gmail.com	+49 17637826239	all_genders_avatar.png	2025-11-01 20:51:12.2403	2025-11-01 20:51:12.2403	133
143	Raunaq	\N	Malhotra	roney.1919@gmail.com	+4915510054931	all_genders_avatar.png	2025-11-01 20:51:12.246059	2025-11-01 20:51:12.246059	140
158	Fátima	\N	Lara	faty777rio@hotmail.com	015731661777	all_genders_avatar.png	2025-11-01 20:51:12.25192	2025-11-01 20:51:12.25192	152
168	Sandra	\N	Soomre	sannnuh@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.262945	2025-11-01 20:51:12.262945	166
177	Ezgi	\N	Dikdur	ezgidikdur@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.273935	2025-11-01 20:51:12.273935	167
191	Fooziye	\N	Shaykhzade	sheykhzade.fa@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.284732	2025-11-01 20:51:12.284732	190
201	Eloïse	\N	Sinou	eloïse.sinou@sciencespo.fr	0033 7 44 40 01 47	all_genders_avatar.png	2025-11-01 20:51:12.293354	2025-11-01 20:51:12.293354	200
210	Daniil	\N	\N	daniil.gonikman.0307@gmail.com	+4915735704445	all_genders_avatar.png	2025-11-01 20:51:12.309775	2025-11-01 20:51:12.309775	206
220	Aysegul	\N	Ozmen	aysegulozmen.iu@gmail.com	017624904019	all_genders_avatar.png	2025-11-01 20:51:12.318513	2025-11-01 20:51:12.318513	219
240	Anna	\N	Winslow	felicksx@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.334858	2025-11-01 20:51:12.334858	238
272	Celina	\N	Schmidtke	celinaschmidtke@gmx.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.353991	2025-11-01 20:51:12.353991	269
286	Julia	\N	Ruston	juliaruston1999@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.362575	2025-11-01 20:51:12.362575	280
299	Mythri	\N	\N	mythri.chandramohan11@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.368373	2025-11-01 20:51:12.368373	294
304	SakeenaTalat	\N	\N	sakeena.talat@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.377039	2025-11-01 20:51:12.377039	297
311		\N	\N	foxopusconner@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.385055	2025-11-01 20:51:12.385055	307
317	Krešimir	\N	Franin	krfranin@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.389203	2025-11-01 20:51:12.389203	315
325	Mediha	\N	Husic	m.husic@gmx.de	017645664535	all_genders_avatar.png	2025-11-01 20:51:12.394474	2025-11-01 20:51:12.394474	321
332	George	\N	Lanets	george.lanets@gmail.com	@GeorgeLanetz	all_genders_avatar.png	2025-11-01 20:51:12.404007	2025-11-01 20:51:12.404007	331
342	Ariane	\N	Geisler	geisler.ariane@gmail.com	@jadzia42	all_genders_avatar.png	2025-11-01 20:51:12.415149	2025-11-01 20:51:12.415149	340
350	Selena	\N	Garcia	selena.garcia.maita@gmail.com	+4917636652782	all_genders_avatar.png	2025-11-01 20:51:12.420756	2025-11-01 20:51:12.420756	345
359	Amara	\N	\N	amara06@hotmail.de	01754650749	all_genders_avatar.png	2025-11-01 20:51:12.425218	2025-11-01 20:51:12.425218	359
367	Damla	\N	\N	damlacalik1@gmail.com	+4917684235567	all_genders_avatar.png	2025-11-01 20:51:12.430215	2025-11-01 20:51:12.430215	366
375	May	\N	Al-Hammadi	mayanwar39@gmail.com	+49 176 77860290	all_genders_avatar.png	2025-11-01 20:51:12.43493	2025-11-01 20:51:12.43493	375
390	Olivia	\N	Noss	olivenoss@gmail.com	@olivenoss	all_genders_avatar.png	2025-11-01 20:51:12.444212	2025-11-01 20:51:12.444212	389
398	MD.	\N	MIAJEE	rahmanforhad007@gmail.com	+8801643342253	all_genders_avatar.png	2025-11-01 20:51:12.449645	2025-11-01 20:51:12.449645	399
407	Nagy	\N	Zóra	nagyjuliazora@gmail.com	06704139062	all_genders_avatar.png	2025-11-01 20:51:12.454634	2025-11-01 20:51:12.454634	405
414	Yoanna	\N	Yankova	yoannayankova2000@gmail.com	015201080879	all_genders_avatar.png	2025-11-01 20:51:12.459525	2025-11-01 20:51:12.459525	412
423	josefina	\N	\N	josefina.errazkin@gmail.com	1621744686	all_genders_avatar.png	2025-11-01 20:51:12.466233	2025-11-01 20:51:12.466233	415
431	Yifan	\N	Zhang	zhang.ff@hotmail.com	Guobenxm	all_genders_avatar.png	2025-11-01 20:51:12.476104	2025-11-01 20:51:12.476104	426
440	Pauline	\N	Bruninx	lara.bruninx@gmx.de	+436704065588	all_genders_avatar.png	2025-11-01 20:51:12.48484	2025-11-01 20:51:12.48484	438
448	Maral	\N	Vafaei	ma.vafaei92@gmail.com	17627459848	all_genders_avatar.png	2025-11-01 20:51:12.490663	2025-11-01 20:51:12.490663	447
457	Anna	\N	Wilkinson	annalizwilkinson@gmail.com	+491789325047	all_genders_avatar.png	2025-11-01 20:51:12.501325	2025-11-01 20:51:12.501325	455
465	solmaz	\N	shariati	solmaz.shariati2@gmail.com	0176 35816353	all_genders_avatar.png	2025-11-01 20:51:12.506403	2025-11-01 20:51:12.506403	464
474	Kira	\N	Liljegren	kira.lisere@gmail.com	+16028033544	all_genders_avatar.png	2025-11-01 20:51:12.511495	2025-11-01 20:51:12.511495	469
482	Janay	\N	Sukkarieh	janaysukkarieh@gmail.com	+491623934189	all_genders_avatar.png	2025-11-01 20:51:12.518722	2025-11-01 20:51:12.518722	483
491	Smart	\N	Gafar	gafarsmart@gmail.com	15166110442	all_genders_avatar.png	2025-11-01 20:51:12.528935	2025-11-01 20:51:12.528935	487
500	Ana	\N	Paula	anapaulazolliker@gmsil.com	15221525418	all_genders_avatar.png	2025-11-01 20:51:12.537196	2025-11-01 20:51:12.537196	501
508	Nguyen	\N	Khoa	weakfuntimefreddy203@gmail.com	+49 163 2953877	all_genders_avatar.png	2025-11-01 20:51:12.542493	2025-11-01 20:51:12.542493	507
517	Giada	\N	Maniscalco	maniscalcogiada@gmail.com	01778767679	all_genders_avatar.png	2025-11-01 20:51:12.548646	2025-11-01 20:51:12.548646	514
64	Olena	\N	Avramenko	lenaavramenko@gmail.com	01746665631	all_genders_avatar.png	2025-11-01 20:51:12.194923	2025-11-01 20:51:12.194923	65
71	Hubert	\N	Launois	hubert.launois@sciencespo.fr	+33 7 82 89 69 35	all_genders_avatar.png	2025-11-01 20:51:12.202241	2025-11-01 20:51:12.202241	70
80	Anzhela	\N	\N	angela.zayceva@hotmail.com	01796919851	all_genders_avatar.png	2025-11-01 20:51:12.207902	2025-11-01 20:51:12.207902	80
88	Flora	\N	Williams	florawilliams189@gmail.com	+4915141287887	all_genders_avatar.png	2025-11-01 20:51:12.213048	2025-11-01 20:51:12.213048	88
96	Brooj	\N	\N	broojyemen@gmail.com	017640597759	all_genders_avatar.png	2025-11-01 20:51:12.217063	2025-11-01 20:51:12.217063	97
104	Sevval	\N	Mirhan	sevval.mirhan@gmail.com	015752901729	all_genders_avatar.png	2025-11-01 20:51:12.221334	2025-11-01 20:51:12.221334	103
114	Milad	\N	Majidi	majidimilad367@gmail.com	+49 176 83482678	all_genders_avatar.png	2025-11-01 20:51:12.230253	2025-11-01 20:51:12.230253	114
123	Ayham	\N	Jat	aljatayham@gmail.com	017655436266	all_genders_avatar.png	2025-11-01 20:51:12.234872	2025-11-01 20:51:12.234872	122
132	Lumi	\N	\N	lumilausas@gmail.com	01786322241	all_genders_avatar.png	2025-11-01 20:51:12.238186	2025-11-01 20:51:12.238186	132
139	Samia	\N	\N	mahamsaeed109@gmail.com	017640421567	all_genders_avatar.png	2025-11-01 20:51:12.242717	2025-11-01 20:51:12.242717	138
145	Mohsen	\N	vaezi	m_vaezi78@yahoo.com	015772401094	all_genders_avatar.png	2025-11-01 20:51:12.246464	2025-11-01 20:51:12.246464	143
152	Arianna	\N	Dalerci	arianna.dalerci@gmail.com	004917660444142	all_genders_avatar.png	2025-11-01 20:51:12.251014	2025-11-01 20:51:12.251014	151
161	Anna	\N	Mikhalovskaia	annamikh@seznam.cz	017641130997	all_genders_avatar.png	2025-11-01 20:51:12.257905	2025-11-01 20:51:12.257905	162
170	Serhii	\N	\N	machairodus2012@gmail.com	+49 176 864 94 205	all_genders_avatar.png	2025-11-01 20:51:12.266742	2025-11-01 20:51:12.266742	171
180	Laiba	\N	Malik	laibamalik998@gmail.com	017626546371	all_genders_avatar.png	2025-11-01 20:51:12.274621	2025-11-01 20:51:12.274621	178
188	Olga	\N	\N	vallena555@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.283123	2025-11-01 20:51:12.283123	188
198	Matilda	\N	Gustafsson	matilda.gustafsson@gmx.com	17660188481	all_genders_avatar.png	2025-11-01 20:51:12.291588	2025-11-01 20:51:12.291588	194
207	Rahaf	\N	\N	rahaf.alsabaagh@gmail.com	‏‪004915143380623‬‏	all_genders_avatar.png	2025-11-01 20:51:12.307851	2025-11-01 20:51:12.307851	199
217	Marvin	\N	Hicke	thisismarvinh@gmail.com	1 (865) 604- 7495	all_genders_avatar.png	2025-11-01 20:51:12.317532	2025-11-01 20:51:12.317532	215
226	Jessica	\N	denHeyer	jess.denheyer@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.323124	2025-11-01 20:51:12.323124	222
234	Tessa	\N	\N	tessa.spam@posteo.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.329478	2025-11-01 20:51:12.329478	231
242	Samsondeen	\N	Dare	dsamsondeen@gmail.com	017635935296	all_genders_avatar.png	2025-11-01 20:51:12.335587	2025-11-01 20:51:12.335587	242
251	Nadhilla	\N	Mazaya	nadhillamazaya@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.341442	2025-11-01 20:51:12.341442	250
258	Sofie	\N	Munch	sofie_hjortskovmunch@hotmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.346164	2025-11-01 20:51:12.346164	257
266	Isabel	\N	\N	isabel.pattuzzi@gmail.com	015738205272	all_genders_avatar.png	2025-11-01 20:51:12.351325	2025-11-01 20:51:12.351325	263
274	Francesca	\N	\N	meyfrancesca@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.355732	2025-11-01 20:51:12.355732	274
282	Susan	\N	Were	susanwere15@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.360254	2025-11-01 20:51:12.360254	281
289	Eliana	\N	Coschignano	eli.coschignano@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.364667	2025-11-01 20:51:12.364667	290
298	Elisabeth	\N	\N	elisabeth_rosenkranz@t-online.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.368581	2025-11-01 20:51:12.368581	299
303	Mariela	\N	Zendejas	mariela.zendejas@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.375572	2025-11-01 20:51:12.375572	302
310	Nikki	\N	Mellor	nikki.mellor1@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.384258	2025-11-01 20:51:12.384258	306
316	DOMINIC	\N	WATERHOUSE	dtmw7227@gmail.com	@KrossenerSt	all_genders_avatar.png	2025-11-01 20:51:12.388621	2025-11-01 20:51:12.388621	314
324	Bulin	\N	\N	fionabulin@gmail.com	+4915753403823	all_genders_avatar.png	2025-11-01 20:51:12.393879	2025-11-01 20:51:12.393879	320
331	Malina	\N	Haider	haider.malina@web.de	017647140706	all_genders_avatar.png	2025-11-01 20:51:12.402752	2025-11-01 20:51:12.402752	330
341	Sarah	\N	Neugebauer	sarah.neugebauer@gmx.net	015731860908	all_genders_avatar.png	2025-11-01 20:51:12.414098	2025-11-01 20:51:12.414098	339
349	Ana	\N	Galindo	ruth@flower.ai	+49 173 8860153	all_genders_avatar.png	2025-11-01 20:51:12.420116	2025-11-01 20:51:12.420116	346
358	Marie	\N	Minderjahn	marieminderjahn@gmail.com	+491637085417	all_genders_avatar.png	2025-11-01 20:51:12.424649	2025-11-01 20:51:12.424649	357
366	Farzam	\N	Parvasi	farzamparvasi@gmail.com	+4915563381931	all_genders_avatar.png	2025-11-01 20:51:12.429539	2025-11-01 20:51:12.429539	365
374	Fiona	\N	Robic	fiona.verran@hotmail.co.uk	+447758697013	all_genders_avatar.png	2025-11-01 20:51:12.434375	2025-11-01 20:51:12.434375	374
382	Laila	\N	Bintner	lailabi@icloud.com	00352691313100	all_genders_avatar.png	2025-11-01 20:51:12.438738	2025-11-01 20:51:12.438738	381
389	Tal	\N	levy	talevi100@gmail.com	015143422839	all_genders_avatar.png	2025-11-01 20:51:12.443485	2025-11-01 20:51:12.443485	388
397	Giulia	\N	Russo	russo.giulia.93@hotmail.it	+4915221078801	all_genders_avatar.png	2025-11-01 20:51:12.449011	2025-11-01 20:51:12.449011	398
406	petra	\N	sinn	1wahnsinn@gmx.de	01515 5609799	all_genders_avatar.png	2025-11-01 20:51:12.454091	2025-11-01 20:51:12.454091	404
413	Glenda	\N	Romano	glenda.naos98@gmail.com	+39 331 477 3424	all_genders_avatar.png	2025-11-01 20:51:12.458798	2025-11-01 20:51:12.458798	414
422	Juliane	\N	Bekou	pastorinjuliane@aol.de	01793802798	all_genders_avatar.png	2025-11-01 20:51:12.464966	2025-11-01 20:51:12.464966	421
430	Friedrich	\N	Geiger	herr@geiger.berlin	@Friedrich_Bln	all_genders_avatar.png	2025-11-01 20:51:12.474981	2025-11-01 20:51:12.474981	430
439	Juan	\N	Galeano	juano.quinones@gmail.com	+49 163 5195023	all_genders_avatar.png	2025-11-01 20:51:12.483895	2025-11-01 20:51:12.483895	435
446	Miriam	\N	Diallo	miriam.mbalou@gmail.com	@dia_miri	all_genders_avatar.png	2025-11-01 20:51:12.49006	2025-11-01 20:51:12.49006	446
456	Jamie	\N	Durant	jamiedurant@college.harvard.edu	617-899-1527	all_genders_avatar.png	2025-11-01 20:51:12.500488	2025-11-01 20:51:12.500488	456
464	Khalid	\N	\N	khalid.nashy@gmail.com	015560200519	all_genders_avatar.png	2025-11-01 20:51:12.505844	2025-11-01 20:51:12.505844	458
473	Garret	\N	Goodhue	garretgoodhue@gmail.com	4901792176653	all_genders_avatar.png	2025-11-01 20:51:12.510916	2025-11-01 20:51:12.510916	472
481	Daniel	\N	Kupferberg	dk@danielkupferberg.dk	01772485338	all_genders_avatar.png	2025-11-01 20:51:12.517611	2025-11-01 20:51:12.517611	479
490	Lily	\N	Wang	lily.maya.wang@gmail.com	+4915737244158	all_genders_avatar.png	2025-11-01 20:51:12.527945	2025-11-01 20:51:12.527945	489
499	Ana	\N	Clément	ananicoclement@gmail.com	+33767246702	all_genders_avatar.png	2025-11-01 20:51:12.536258	2025-11-01 20:51:12.536258	494
507	Gokmen	\N	Oz	gokmenoz89@gmail.com	+4916092408473	all_genders_avatar.png	2025-11-01 20:51:12.541902	2025-11-01 20:51:12.541902	506
514	Anna	\N	Fontanini	fontaninian@gmail.com	+49 176 28452298	all_genders_avatar.png	2025-11-01 20:51:12.546344	2025-11-01 20:51:12.546344	513
523	Joséphine	\N	Vitalis	josephine.vitalis@ipu-berlin.de	01632652350	all_genders_avatar.png	2025-11-01 20:51:12.550722	2025-11-01 20:51:12.550722	517
525	Manar	\N	Bashaaib	manarbashaaib@gmail.com	+49 179 4138703	all_genders_avatar.png	2025-11-01 20:51:12.598856	2025-11-01 20:51:12.598856	523
65	Luca	\N	\N	vollhudson@gmail.com	01624388127	all_genders_avatar.png	2025-11-01 20:51:12.196119	2025-11-01 20:51:12.196119	66
72	Emir	\N	Ercan	emirpendragon@gmail.com	017684891417	all_genders_avatar.png	2025-11-01 20:51:12.20319	2025-11-01 20:51:12.20319	71
81	rouai	\N	ihcene	rouaidhikraihcene@gmail.com	0696479183	all_genders_avatar.png	2025-11-01 20:51:12.208875	2025-11-01 20:51:12.208875	81
89	Nina	\N	Litke	nlitke@me.com	017681164437	all_genders_avatar.png	2025-11-01 20:51:12.213858	2025-11-01 20:51:12.213858	89
99	türkan	\N	demirdag	turkandemirdagofficial@gmail.com	17636935234	all_genders_avatar.png	2025-11-01 20:51:12.219742	2025-11-01 20:51:12.219742	93
107	Nigel	\N	Walcot	norfolkandhope@icloud.com	015151917752	all_genders_avatar.png	2025-11-01 20:51:12.223889	2025-11-01 20:51:12.223889	106
117	Adeline	\N	\N	adelinefv@posteo.de	AdelineEmily	all_genders_avatar.png	2025-11-01 20:51:12.230603	2025-11-01 20:51:12.230603	117
124	Vrushin	\N	\N	vrushin89@gmail.com	t.me/Vrushin	all_genders_avatar.png	2025-11-01 20:51:12.23562	2025-11-01 20:51:12.23562	125
134	Sophie	\N	Winfield-Pust	sophie.wp2007@gmail.com	+49 1520 9036403	all_genders_avatar.png	2025-11-01 20:51:12.24007	2025-11-01 20:51:12.24007	127
141	İdil	\N	Şakar	idildenizsakar1998@gmail.com	+491749115021	all_genders_avatar.png	2025-11-01 20:51:12.244137	2025-11-01 20:51:12.244137	141
148	CHRISTIAN	\N	HAWKEY	christianhawkey@gmail.com	017664226699	all_genders_avatar.png	2025-11-01 20:51:12.248394	2025-11-01 20:51:12.248394	149
155	Juliet	\N	Kelso	julietmkelso@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.252618	2025-11-01 20:51:12.252618	155
165	Aishwarya	\N	Murali	aaishwaryamurali@gmail.com	01624729020	all_genders_avatar.png	2025-11-01 20:51:12.261408	2025-11-01 20:51:12.261408	163
173	Rafael	\N	Cueto	rafa.bembia@gmail.com	+491724202379	all_genders_avatar.png	2025-11-01 20:51:12.269556	2025-11-01 20:51:12.269556	168
183	Brendt	\N	\N	fiedler_bernd@yahoo.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.278019	2025-11-01 20:51:12.278019	181
192	Natia	\N	Makishvili	makishvilinatia989@gmail.com	017684744389	all_genders_avatar.png	2025-11-01 20:51:12.285785	2025-11-01 20:51:12.285785	186
202	Alessandra	\N	Clark	alessandra.clark@hotmail.com	+44 7470002963	all_genders_avatar.png	2025-11-01 20:51:12.295272	2025-11-01 20:51:12.295272	201
211	Alexandra	\N	Sasha)	s.alexandra.orlova@gmail.com	015164660074	all_genders_avatar.png	2025-11-01 20:51:12.311666	2025-11-01 20:51:12.311666	211
221	Paola	\N	Gega	p-gega@live.de	+491632165789	all_genders_avatar.png	2025-11-01 20:51:12.31982	2025-11-01 20:51:12.31982	220
229	Gianpietro	\N	Battistutti	brighele@icloud.com	+4915155155868	all_genders_avatar.png	2025-11-01 20:51:12.326345	2025-11-01 20:51:12.326345	229
238	Anna	\N	Bezborodova	annabezborodova90@gmail.com	017637139414	all_genders_avatar.png	2025-11-01 20:51:12.331892	2025-11-01 20:51:12.331892	237
246	Anja	\N	Fordon	afordon@posteo.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.337717	2025-11-01 20:51:12.337717	246
255	josefina	\N	errazkin	josefina.errazkin@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.343352	2025-11-01 20:51:12.343352	254
260	Nadja	\N	Singer	nsinger@gmx.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.348369	2025-11-01 20:51:12.348369	259
268	Nele	\N	Dietrich	nxdietrich@gmail.com	+49 152 53393366	all_genders_avatar.png	2025-11-01 20:51:12.353023	2025-11-01 20:51:12.353023	267
276	Guy	\N	Norton	guynorton@proton.me	015123650862	all_genders_avatar.png	2025-11-01 20:51:12.35754	2025-11-01 20:51:12.35754	272
284	Hashaam	\N	Ahmed	s.ahmed.hashaam@gmail.com	01635174611	all_genders_avatar.png	2025-11-01 20:51:12.361883	2025-11-01 20:51:12.361883	285
293	Anna	\N	Karapiperidis	annakarapiperidis@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.366349	2025-11-01 20:51:12.366349	288
300	Sofia	\N	Gelfand	sogelfand@gmail.com	+4915209526864	all_genders_avatar.png	2025-11-01 20:51:12.370213	2025-11-01 20:51:12.370213	300
319	Katerina	\N	Resek	katerina.resek@gmail.com	+49 176 21408677	all_genders_avatar.png	2025-11-01 20:51:12.390615	2025-11-01 20:51:12.390615	316
327	Mouna	\N	Hammoudi	mounahammoudi8@gmail.com	+49 176 80855166	all_genders_avatar.png	2025-11-01 20:51:12.396924	2025-11-01 20:51:12.396924	325
335	Jennifer	\N	Fink	jennifer.fink@online.de	+49 15228742375	all_genders_avatar.png	2025-11-01 20:51:12.406849	2025-11-01 20:51:12.406849	335
345	Theresa	\N	Freitag	theresa.freitag@gmx.net	015234102452	all_genders_avatar.png	2025-11-01 20:51:12.416945	2025-11-01 20:51:12.416945	344
351	Anshul	\N	Bansal	banshul26@gmail.com	+491632084107 / Telegram - @anshulbansal26	all_genders_avatar.png	2025-11-01 20:51:12.421897	2025-11-01 20:51:12.421897	351
361	Rania	\N	Fattoum	raniabenfattoum@gmail.com	+49 1716935906	all_genders_avatar.png	2025-11-01 20:51:12.426732	2025-11-01 20:51:12.426732	360
369	Hengameh	\N	Shendi	hengamehkhodadadi@gmail.com	15112358903	all_genders_avatar.png	2025-11-01 20:51:12.431704	2025-11-01 20:51:12.431704	368
377	Rebecca	\N	Byrne	beckyleighannebyrne@icloud.com	+353879741619	all_genders_avatar.png	2025-11-01 20:51:12.436113	2025-11-01 20:51:12.436113	376
384	Michael	\N	Achtzehn	michaelachtzehn@gmail.com	0176 31370737	all_genders_avatar.png	2025-11-01 20:51:12.440477	2025-11-01 20:51:12.440477	383
392	Kerstin	\N	Larsson	kerstinlarsn@gmail.com	+46761040415	all_genders_avatar.png	2025-11-01 20:51:12.445756	2025-11-01 20:51:12.445756	390
400	Emina	\N	Djelil	eminadjelil@googlemail.com	015164586569	all_genders_avatar.png	2025-11-01 20:51:12.451114	2025-11-01 20:51:12.451114	400
408	Nataliia	\N	Kalynovska	nata.li@me.com	+49 174 6549489	all_genders_avatar.png	2025-11-01 20:51:12.456044	2025-11-01 20:51:12.456044	406
416	Zunaira	\N	Siddique	zunaira518@gmail.com	+4915259616430	all_genders_avatar.png	2025-11-01 20:51:12.460914	2025-11-01 20:51:12.460914	417
424	Josefine	\N	Albrecht	josefine.albrecht@posteo.de	01639285318	all_genders_avatar.png	2025-11-01 20:51:12.469299	2025-11-01 20:51:12.469299	422
433	Akesi	\N	Asmah	akesi18.asmah@gmail.com	15738778315	all_genders_avatar.png	2025-11-01 20:51:12.478287	2025-11-01 20:51:12.478287	433
442	Lakshmi	\N	N	lakshmi8289@gmail.com	01788140285	all_genders_avatar.png	2025-11-01 20:51:12.486436	2025-11-01 20:51:12.486436	442
451	Stefanie	\N	Marquardt	stefaniemarquardt@gmail.com	015778287242	all_genders_avatar.png	2025-11-01 20:51:12.49214	2025-11-01 20:51:12.49214	450
460	Alaa	\N	Ibrahim	alaa_ibrahim_@outlook.com	+49 1522 154 145 0	all_genders_avatar.png	2025-11-01 20:51:12.503085	2025-11-01 20:51:12.503085	460
468	Anna	\N	Brooks-Kasteel	anabk@posteo.de	017638339153	all_genders_avatar.png	2025-11-01 20:51:12.507632	2025-11-01 20:51:12.507632	465
476	Berkay	\N	Kocak	kocakberkayy@gmail.com	015752217854	all_genders_avatar.png	2025-11-01 20:51:12.513299	2025-11-01 20:51:12.513299	475
484	Elisa	\N	Ferrari	e.ferrari8219@gmail.com	015161617523	all_genders_avatar.png	2025-11-01 20:51:12.521682	2025-11-01 20:51:12.521682	481
493	Anna	\N	Fitzhugh	annaafitzhugh@gmail.com	+14432998075	all_genders_avatar.png	2025-11-01 20:51:12.531306	2025-11-01 20:51:12.531306	490
501	ahmed	\N	hanino	ahmdhnynw195@gmail.com	017622177281	all_genders_avatar.png	2025-11-01 20:51:12.539001	2025-11-01 20:51:12.539001	502
509	Elena	\N	Pochinskaia	e.pochinskaja@gmail.com	+4915757913672	all_genders_avatar.png	2025-11-01 20:51:12.543848	2025-11-01 20:51:12.543848	508
516	Helena	\N	Golderer	helenagolderer@gmx.de	015739411081	all_genders_avatar.png	2025-11-01 20:51:12.547953	2025-11-01 20:51:12.547953	519
526	Mutahar	\N	Hanifi	mutahar.hanifi@gmail.com	+49 178 4390793	all_genders_avatar.png	2025-11-01 20:51:12.615963	2025-11-01 20:51:12.615963	524
529	Sinduja	\N	Chandrasekaran	sinduchandru92@gmail.com	+4915203971469	all_genders_avatar.png	2025-11-01 20:51:12.704485	2025-11-01 20:51:12.704485	527
532	Marie	\N	Minderjahn	marieminderjahn@gmail.com	+491637085417	all_genders_avatar.png	2025-11-01 20:51:12.760105	2025-11-01 20:51:12.760105	529
66	Hesham	\N	Elkashash	hecham_adel@hotmail.com	+491783090623	all_genders_avatar.png	2025-11-01 20:51:12.194695	2025-11-01 20:51:12.194695	63
82	Jenny	\N	Zimmermann	zimmermann.jenny.1@web.de	017657830612 (i am not often on telegram)	all_genders_avatar.png	2025-11-01 20:51:12.207548	2025-11-01 20:51:12.207548	78
97	Milena	\N	Mayordomo	milena.mayordomo@hotmail.com	+491712744192	all_genders_avatar.png	2025-11-01 20:51:12.216854	2025-11-01 20:51:12.216854	95
111	Natalia	\N	Constantin	nataliatconstantin@gmail.com	+49 176 80753025	all_genders_avatar.png	2025-11-01 20:51:12.226128	2025-11-01 20:51:12.226128	109
115	Juliette	\N	Meyssonnier	juliettemesso@gmail.com	+33762546870	all_genders_avatar.png	2025-11-01 20:51:12.23037	2025-11-01 20:51:12.23037	115
125	Senya	\N	\N	arsenii.tolstikov@need4deed.org	015222782615	all_genders_avatar.png	2025-11-01 20:51:12.235764	2025-11-01 20:51:12.235764	124
135	Laurén	\N	Kleist	laurenkleist111@gmail.com	+4917656990633	all_genders_avatar.png	2025-11-01 20:51:12.240197	2025-11-01 20:51:12.240197	136
154	Daniel	\N	Lopez	kremerdaniel@yahoo.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.25179	2025-11-01 20:51:12.25179	153
163	Mary-Dora	\N	Bloch-Hansen	marydorabh@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.258973	2025-11-01 20:51:12.258973	160
172	anna	\N	\N	tukachula@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.267755	2025-11-01 20:51:12.267755	173
182	Natia	\N	Makishvili	makishvilinatia989@gmail.com	017684744389	all_genders_avatar.png	2025-11-01 20:51:12.275596	2025-11-01 20:51:12.275596	180
190	Camila	\N	\N	camendozavidal@gmail.com	+491626446485	all_genders_avatar.png	2025-11-01 20:51:12.284051	2025-11-01 20:51:12.284051	184
200	Sun	\N	Mun	munjoanne@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.292809	2025-11-01 20:51:12.292809	198
209	Mariia	\N	Tereshchenko	unlabel11@gmail.com	+4916096209151	all_genders_avatar.png	2025-11-01 20:51:12.309097	2025-11-01 20:51:12.309097	209
219	Dmitrii	\N	\N	dvshorzh@gmail.com	+4915203941804	all_genders_avatar.png	2025-11-01 20:51:12.31821	2025-11-01 20:51:12.31821	218
228	Samir	\N	Al-Maamoory	samir.msc.83@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.323635	2025-11-01 20:51:12.323635	228
236	Simon	\N	Edwards	siedwards6@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.33024	2025-11-01 20:51:12.33024	235
244	Tamisa	\N	Honda	seekohonda@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.336412	2025-11-01 20:51:12.336412	244
253	Victor	\N	Sonntag	raphaelsonntag@gmx.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.342008	2025-11-01 20:51:12.342008	252
262	Abhimanyu	\N	Singh	abhimanyu1singh01@gmail.com	+49 17683369464	all_genders_avatar.png	2025-11-01 20:51:12.349033	2025-11-01 20:51:12.349033	261
271	Lujain	\N	Mansour	hazem_lujain@yahoo.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.355312	2025-11-01 20:51:12.355312	271
287	Alekh	\N	Anil	alekhanil1@gmail.com	17632528138	all_genders_avatar.png	2025-11-01 20:51:12.36121	2025-11-01 20:51:12.36121	283
295	Alejandro	\N	Bonatto	alejandro_bonatto@yahoo.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.368272	2025-11-01 20:51:12.368272	295
307	Paul	\N	Duleyha	paul.duleyha@gmail.com	+33 6 03 84 11 24	all_genders_avatar.png	2025-11-01 20:51:12.382396	2025-11-01 20:51:12.382396	309
318	Aashutosh	\N	\N	aashutoshkumarshah2@gmail.com	015510075099	all_genders_avatar.png	2025-11-01 20:51:12.38974	2025-11-01 20:51:12.38974	318
334	peiris	\N	\N	niroshan.peiris@web.de	017634253124	all_genders_avatar.png	2025-11-01 20:51:12.401939	2025-11-01 20:51:12.401939	328
344	Natalia	\N	Gonzalez	nagugon@gmail.com	01729949067	all_genders_avatar.png	2025-11-01 20:51:12.41589	2025-11-01 20:51:12.41589	343
360	Valeria	\N	Orlova	lera3012@yahoo.de	+4915775071917	all_genders_avatar.png	2025-11-01 20:51:12.424351	2025-11-01 20:51:12.424351	355
376	Maya	\N	Scott	mayascott66@gmail.com	+49 15560204809	all_genders_avatar.png	2025-11-01 20:51:12.434083	2025-11-01 20:51:12.434083	373
391	Felicia	\N	Ziesak	felicia.ziesak@gmx.de	015904867462	all_genders_avatar.png	2025-11-01 20:51:12.443171	2025-11-01 20:51:12.443171	386
403	Gokce	\N	Yazdic	gokce.yazdic@gmail.com	+4917677861592	all_genders_avatar.png	2025-11-01 20:51:12.453612	2025-11-01 20:51:12.453612	403
418	Yashar	\N	\N	yaa6aar@gmail.com	004915754029151	all_genders_avatar.png	2025-11-01 20:51:12.46015	2025-11-01 20:51:12.46015	416
426	Oubeda	\N	\N	oubeda-altaleb@outlook.com	017645626717	all_genders_avatar.png	2025-11-01 20:51:12.470772	2025-11-01 20:51:12.470772	425
435	Saeid	\N	Behbahaninia	sbehb91@gmail.com	017684914653	all_genders_avatar.png	2025-11-01 20:51:12.479281	2025-11-01 20:51:12.479281	431
445	Madeleine	\N	Stephan	madeleine.stephan@outlook.com	01511 5227962	all_genders_avatar.png	2025-11-01 20:51:12.489536	2025-11-01 20:51:12.489536	440
459	Victoria	\N	\N	vickywissdorf@gmail.com	+491737347371	all_genders_avatar.png	2025-11-01 20:51:12.502184	2025-11-01 20:51:12.502184	459
475	Joana	\N	Atabão	joana.atabao@gmail.com	+351912644064	all_genders_avatar.png	2025-11-01 20:51:12.510601	2025-11-01 20:51:12.510601	466
492	Mudar	\N	Tulaimat	mudartulimat1998@gmail.com	+49 176 59667191	all_genders_avatar.png	2025-11-01 20:51:12.527377	2025-11-01 20:51:12.527377	491
502	Joris	\N	Piening	jorispiening1999@gmail.com	015734975913	all_genders_avatar.png	2025-11-01 20:51:12.539941	2025-11-01 20:51:12.539941	498
518	Ilya	\N	\N	festeloqq@gmail.com	t.me/festelo	all_genders_avatar.png	2025-11-01 20:51:12.5473	2025-11-01 20:51:12.5473	518
534	Mutahar	\N	Hanifi	mutahar.hanifi@gmail.com	+4915733448954	all_genders_avatar.png	2025-11-01 20:51:12.763047	2025-11-01 20:51:12.763047	531
68	Francesca	\N	Harrison	francesca_harrison@hotmail.co.uk	01734268730	all_genders_avatar.png	2025-11-01 20:51:12.199036	2025-11-01 20:51:12.199036	67
78	Amir	\N	Geranmayeh	amir.h.geranmayeh@gmail.com	015787301604	all_genders_avatar.png	2025-11-01 20:51:12.207366	2025-11-01 20:51:12.207366	72
94	Mohammad	\N	Hassan	m.shawky.hassan@gmail.com	015224180702	all_genders_avatar.png	2025-11-01 20:51:12.21567	2025-11-01 20:51:12.21567	85
108	Yalcin	\N	\N	yalcin@erleblebici.net	015560240357	all_genders_avatar.png	2025-11-01 20:51:12.224498	2025-11-01 20:51:12.224498	102
121	Veronica	\N	Maitre	maitre.veronica@gmail.com	491633726036	all_genders_avatar.png	2025-11-01 20:51:12.231207	2025-11-01 20:51:12.231207	120
133	Alasdair	\N	MacLeod	tidewater41009@me.com	01782363185	all_genders_avatar.png	2025-11-01 20:51:12.237927	2025-11-01 20:51:12.237927	130
147	Daisy	\N	\N	daisywells19@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.246196	2025-11-01 20:51:12.246196	142
159	Sara	\N	Shokravi	sarashokravi@yahoo.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.2573	2025-11-01 20:51:12.2573	158
176	Sabine	\N	zelando	mattgammie@gmail.commailto:sabine.hopmann.lopez@zalando.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.271058	2025-11-01 20:51:12.271058	175
186	Mariela	\N	Zendejas	paulawurche@gmx.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.27955	2025-11-01 20:51:12.27955	183
196	Tobias	\N	Tarnow	tobi.tarnow@gmx.de	00491784511902	all_genders_avatar.png	2025-11-01 20:51:12.29096	2025-11-01 20:51:12.29096	196
214	Mariam	\N	Akel	mariamabouakel@gmail.com	01788931563	all_genders_avatar.png	2025-11-01 20:51:12.314015	2025-11-01 20:51:12.314015	210
224	Tevdore	\N	Avalishvili	tevdoreavalishvili@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.322699	2025-11-01 20:51:12.322699	223
237	Noémie	\N	Quinson	noemie.quinson@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.331018	2025-11-01 20:51:12.331018	236
248	Alghaith	\N	Alasas	\N	+4917666816316	all_genders_avatar.png	2025-11-01 20:51:12.338949	2025-11-01 20:51:12.338949	241
270	Jeet	\N	Thakkar	jeet.thakkarr@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.353761	2025-11-01 20:51:12.353761	265
278	Yaren	\N	Açıkgöz	sude.acikgoz@hotmail.com	+49 1634533240	all_genders_avatar.png	2025-11-01 20:51:12.358055	2025-11-01 20:51:12.358055	273
292	Paula	\N	Breuckmann	paula.breuckmann@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.364427	2025-11-01 20:51:12.364427	287
312	chiara	\N	\N	chiaralanzi93@gmail.com	0049 17661943287	all_genders_avatar.png	2025-11-01 20:51:12.386792	2025-11-01 20:51:12.386792	311
320	Silvia	\N	Koch	silba.koch@web.de	+49 176 72885980	all_genders_avatar.png	2025-11-01 20:51:12.391381	2025-11-01 20:51:12.391381	322
328	Alexander	\N	Gruhn	alexander.gruhn@gmail.com	+4915251767083	all_genders_avatar.png	2025-11-01 20:51:12.398079	2025-11-01 20:51:12.398079	326
336	Amir	\N	Hugeyrat	hugeyrat.amir@gmail.com	+4917668094183	all_genders_avatar.png	2025-11-01 20:51:12.4081	2025-11-01 20:51:12.4081	336
346	Nizar	\N	Kazal	fabian.kazal@gmail.com	015756593029	all_genders_avatar.png	2025-11-01 20:51:12.417576	2025-11-01 20:51:12.417576	342
355	Amelia	\N	Szymańska	amelachs0@gmail.com	+49 176 46733117	all_genders_avatar.png	2025-11-01 20:51:12.424208	2025-11-01 20:51:12.424208	354
368	adi	\N	\N	adityajayasuriya@gmail.com	@adyt_369	all_genders_avatar.png	2025-11-01 20:51:12.430624	2025-11-01 20:51:12.430624	361
383	Olivia	\N	\N	kzx@gmx.de	017622930368	all_genders_avatar.png	2025-11-01 20:51:12.438439	2025-11-01 20:51:12.438439	379
399	Sofia	\N	Mohamed	sofiazaky5@gmail.com	017683409388	all_genders_avatar.png	2025-11-01 20:51:12.44858	2025-11-01 20:51:12.44858	396
415	Vadym	\N	Maslovskyi	maslovskiy.v.m@gmail.com	+4915140166890	all_genders_avatar.png	2025-11-01 20:51:12.458399	2025-11-01 20:51:12.458399	411
432	Stefanie	\N	Sonnemann	sonnemann@berlin.de	017655136626	all_genders_avatar.png	2025-11-01 20:51:12.474341	2025-11-01 20:51:12.474341	428
450	Jasmin	\N	Ibrahim	jasminibrahim0@gmail.com	+49 1577 3211998	all_genders_avatar.png	2025-11-01 20:51:12.489721	2025-11-01 20:51:12.489721	444
467	ONUR	\N	ARICI	aricionurtest@gmail.com	+447438942743	all_genders_avatar.png	2025-11-01 20:51:12.505535	2025-11-01 20:51:12.505535	462
483	Yamen	\N	Zaatari	yamen.zaatari@hotmail.com	+4917663668215	all_genders_avatar.png	2025-11-01 20:51:12.517003	2025-11-01 20:51:12.517003	476
497	Pierre	\N	Renard	pierre@renardrenard.com	01731972929	all_genders_avatar.png	2025-11-01 20:51:12.533264	2025-11-01 20:51:12.533264	492
512	Alize	\N	Unal	deniz.alize@hotmail.com	015734847968	all_genders_avatar.png	2025-11-01 20:51:12.544745	2025-11-01 20:51:12.544745	509
520	Rola	\N	Hammad	rola.hammad@yahoo.de	017680397543	all_genders_avatar.png	2025-11-01 20:51:12.549799	2025-11-01 20:51:12.549799	520
537	Sozialteam	\N	\N	shs47-sozialteam@volkssolidaritaet.de	030403661290	all_genders_avatar.png	2025-11-01 20:51:20.390899	2025-11-01 20:51:20.390899	508
73	Marie	\N	Kaiser	marie.b.kaiser@posteo.de	01794830667	all_genders_avatar.png	2025-11-01 20:51:12.201922	2025-11-01 20:51:12.201922	69
102	Gleb	\N	\N	glebmar2001@gmail.com	@glebmarin	all_genders_avatar.png	2025-11-01 20:51:12.221079	2025-11-01 20:51:12.221079	101
112	Hashaam	\N	Ahmed	mollielavery@live.co.uk	‭+34617377594‬	all_genders_avatar.png	2025-11-01 20:51:12.229612	2025-11-01 20:51:12.229612	112
127	Dennis	\N	Wendt	denniswendt3@icloud.com	00491712066361	all_genders_avatar.png	2025-11-01 20:51:12.234984	2025-11-01 20:51:12.234984	119
137	Fateme	\N	Farrokh	fatema555ebrahimi@gmail.com	+4915231486035	all_genders_avatar.png	2025-11-01 20:51:12.240413	2025-11-01 20:51:12.240413	134
150	Tracy	\N	Fuad	tracymayfuad@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.247765	2025-11-01 20:51:12.247765	148
164	Amelie	\N	Eckersley	amelie.eckersley@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.260274	2025-11-01 20:51:12.260274	161
178	Polina	\N	\N	polweyd@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.274174	2025-11-01 20:51:12.274174	177
195	Ekin	\N	Aktarici	aktariciekin@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.287792	2025-11-01 20:51:12.287792	195
205	Wajih	\N	\N	wajihc12019@yahoo.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.297382	2025-11-01 20:51:12.297382	205
215	MOR	\N	EINI	mor.eini30@gmail.com	017621457976	all_genders_avatar.png	2025-11-01 20:51:12.317192	2025-11-01 20:51:12.317192	208
232	Alisa	\N	Nikitina	al.printempo@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.3276	2025-11-01 20:51:12.3276	226
249	Nand	\N	Sharma	nanduupadhyay98@gmail.com	017628521415	all_genders_avatar.png	2025-11-01 20:51:12.339097	2025-11-01 20:51:12.339097	249
264	Andrea	\N	Ortiz	andreaoruiz16@gmail.com	+34 619768191	all_genders_avatar.png	2025-11-01 20:51:12.349179	2025-11-01 20:51:12.349179	256
280	Franki	\N	Jenkins	fgjenkins@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.358342	2025-11-01 20:51:12.358342	279
296	Aline	\N	\N	aliner.evangelista@gmail.com	\N	all_genders_avatar.png	2025-11-01 20:51:12.367207	2025-11-01 20:51:12.367207	293
337	Andressa	\N	Reze	dre.reze@gmail.com	+4915222971319	all_genders_avatar.png	2025-11-01 20:51:12.405089	2025-11-01 20:51:12.405089	334
353	Judà	\N	Faigen	faigenjuda@gmail.com	017680115662	all_genders_avatar.png	2025-11-01 20:51:12.421193	2025-11-01 20:51:12.421193	350
364	Kazuyuki	\N	Murphey	kaz.iiokamurphey@gmail.com	+13343330617	all_genders_avatar.png	2025-11-01 20:51:12.428968	2025-11-01 20:51:12.428968	363
380	Szecsanov	\N	Buki	bukicica@gmail.com	209885761	all_genders_avatar.png	2025-11-01 20:51:12.437075	2025-11-01 20:51:12.437075	377
395	Ella	\N	Jungheinrich	ella.jungheinrich@gmx.de	+4916093228490	all_genders_avatar.png	2025-11-01 20:51:12.446973	2025-11-01 20:51:12.446973	393
411	Sophie	\N	Vandyck	smvandyck1@gmail.com	@zophiie	all_genders_avatar.png	2025-11-01 20:51:12.456878	2025-11-01 20:51:12.456878	408
428	Pauline	\N	Lieben-Seutter	plieben@gmail.com	0170 1466511	all_genders_avatar.png	2025-11-01 20:51:12.471435	2025-11-01 20:51:12.471435	423
441	Phoebe	\N	Ball	phoebe_ball@hotmail.com	Prb_pb	all_genders_avatar.png	2025-11-01 20:51:12.485339	2025-11-01 20:51:12.485339	439
449	Thomas	\N	Delchambre	delchambrethomas@gmail.com	0032474357551	all_genders_avatar.png	2025-11-01 20:51:12.491005	2025-11-01 20:51:12.491005	448
458	Peter	\N	Riley	bbrex@hotmail.co.uk	01723869758	all_genders_avatar.png	2025-11-01 20:51:12.501506	2025-11-01 20:51:12.501506	452
471	Luzia	\N	Plaisant	luziplaisant@web.de	\N	all_genders_avatar.png	2025-11-01 20:51:12.508996	2025-11-01 20:51:12.508996	470
488	Stefan	\N	LeFebvre	stefanlefebvre@yahoo.com	+49 17668949727	all_genders_avatar.png	2025-11-01 20:51:12.524424	2025-11-01 20:51:12.524424	485
505	Leslie	\N	Salazar	leslie.t.salazar@gmail.com	+49 163 0006896	all_genders_avatar.png	2025-11-01 20:51:12.540114	2025-11-01 20:51:12.540114	499
521	Benjamin	\N	Ochs	benjamin.ochs@mailbox.org	01704477292	all_genders_avatar.png	2025-11-01 20:51:12.548958	2025-11-01 20:51:12.548958	516
528	Anna	\N	Shraer	annashraer@gmail.com	01794208869	all_genders_avatar.png	2025-11-01 20:51:12.646886	2025-11-01 20:51:12.646886	526
531	Jennifer	\N	\N	meetjenny22@yahoo.com	01517 5391260	all_genders_avatar.png	2025-11-01 20:51:12.759897	2025-11-01 20:51:12.759897	530
535	Oscar	\N	Pardo	schwalbenweg.psych@eu-homecare.com	015155802637	all_genders_avatar.png	2025-11-01 20:51:15.82355	2025-11-01 20:51:15.82355	533
533	Arianna	\N	Petrulli	petrulli.ari@gmail.com	+4917620937971	all_genders_avatar.png	2025-11-01 20:51:12.76269	2025-11-01 20:51:12.76269	532
551	Jacqueline	\N	Lesch	ehrenamt-degner@prisod-wohnen.de	030629397829	all_genders_avatar.png	2025-11-01 20:51:21.196656	2025-11-01 20:51:21.196656	534
552	Stefanie	\N	Lutz	Betreuung-KSD@eu-homecare.com	+49 151 74352644	all_genders_avatar.png	2025-11-01 20:51:21.238752	2025-11-01 20:51:21.238752	539
553	Theresa	\N	Braun	ehrenamt-stallschreiber@prisod-wohnen.de	01738203720	all_genders_avatar.png	2025-11-01 20:51:21.347689	2025-11-01 20:51:21.347689	382
554	Slfana	\N	Kurbag	kurbag@drk-mueggelspree.de	030 23 989 30 67	all_genders_avatar.png	2025-11-01 20:51:21.398895	2025-11-01 20:51:21.398895	487
555	Alejandra	\N	Ciro	alejandra.ciro@heroeurope.com	030403640472	all_genders_avatar.png	2025-11-01 20:51:21.431565	2025-11-01 20:51:21.431565	540
556	Veronika	\N	Papush	papush@awo-mitte.de	0303450569308	all_genders_avatar.png	2025-11-01 20:51:21.468499	2025-11-01 20:51:21.468499	517
557	Ann-Christin	\N	Krugel	ann-christin.krugel@ib.de	03084720394	all_genders_avatar.png	2025-11-01 20:51:21.558789	2025-11-01 20:51:21.558789	541
558	Max	\N	Ehrenamtskoordinator	max.gonzalez@volkssolidaritaet.de	015115088798	all_genders_avatar.png	2025-11-01 20:51:21.64503	2025-11-01 20:51:21.64503	454
559	Beeke	\N	Mentor:innenprogramm	beeke.wattenberg@xenion.org	0152 09656081	all_genders_avatar.png	2025-11-01 20:51:21.667369	2025-11-01 20:51:21.667369	353
560	Marie	\N	Willeke	marie.willeke@bzsl.de	015750960962	all_genders_avatar.png	2025-11-01 20:51:21.728332	2025-11-01 20:51:21.728332	445
561	Antje	\N	Marx	benn-mierendorffinsel@mts-socialdesign.com	017622339899	all_genders_avatar.png	2025-11-01 20:51:21.798034	2025-11-01 20:51:21.798034	536
562	Edda	\N	Börner	e.boerner@bethania.de	0151 18001794	all_genders_avatar.png	2025-11-01 20:51:21.906869	2025-11-01 20:51:21.906869	450
563	Liudmila	\N	Avdonina	Liudmila.avdonina@jao-berlin.de	015904487223	all_genders_avatar.png	2025-11-01 20:51:21.930099	2025-11-01 20:51:21.930099	542
564	City	\N	Soziales	social@cityeleven.de	+49 30 2009 2693	all_genders_avatar.png	2025-11-01 20:51:21.981383	2025-11-01 20:51:21.981383	543
565	Natia	\N	Kariauli	storm@awo-mitte.de	016098051024	all_genders_avatar.png	2025-11-01 20:51:22.017758	2025-11-01 20:51:22.017758	508
566	Anette	\N	Koch	mentoren@xenion.org	030880667375	all_genders_avatar.png	2025-11-01 20:51:22.148836	2025-11-01 20:51:22.148836	356
567	Julia	\N	Franz	franz@milaa-berlin.de	015777691250	all_genders_avatar.png	2025-11-01 20:51:22.262021	2025-11-01 20:51:22.262021	368
568	Mirjam	\N	Schenal	info@benn-altglienicke.de	03053007040	all_genders_avatar.png	2025-11-01 20:51:22.386996	2025-11-01 20:51:22.386996	542
569	Anastasija	\N	Au	au@schoeneberg-hilft.de	015560079346	all_genders_avatar.png	2025-11-01 20:51:22.416145	2025-11-01 20:51:22.416145	435
570	Ahmed	\N	Isamaldin	Ahmed.Isamaldin.Mohamed.Ahmed@ib.de	015785542175	all_genders_avatar.png	2025-11-01 20:51:22.445867	2025-11-01 20:51:22.445867	544
571	Ewa	\N	Koslowski	sozialearbeit118a@stk118.de	030 41 717190	all_genders_avatar.png	2025-11-01 20:51:22.531413	2025-11-01 20:51:22.531413	367
572	Paulina	\N	Heine	paulina.heine@volkssolidaritaet.de	015115088898	all_genders_avatar.png	2025-11-01 20:51:22.718144	2025-11-01 20:51:22.718144	545
573	Frau	\N	Tümptner	tuemptner@reinhold-burger-schule.de	01795962708	all_genders_avatar.png	2025-11-01 20:51:22.808956	2025-11-01 20:51:22.808956	321
574	Odilia	\N	Voigt	odilia.voigt@heroeurope.com	015562653465	all_genders_avatar.png	2025-11-01 20:51:22.90623	2025-11-01 20:51:22.90623	546
575	Christina	\N	Kirilenko	sozialdienst.dingolfinger@drk-mueggelspree.de	030239893075	all_genders_avatar.png	2025-11-01 20:51:22.933759	2025-11-01 20:51:22.933759	535
576	Anna	\N	Kuczera	kuczera@gu-invalidenstr.de	0302332196157	all_genders_avatar.png	2025-11-01 20:51:22.99937	2025-11-01 20:51:22.99937	392
577	GU	\N	Saric	ehrenamt-max-brunnow@prisod-wohnen.de	030 403 995 20	all_genders_avatar.png	2025-11-01 20:51:23.054663	2025-11-01 20:51:23.054663	547
578	Leonardo	\N	Battiati	battiati@drk-mueggelspree.de	+4915223203175	all_genders_avatar.png	2025-11-01 20:51:23.101229	2025-11-01 20:51:23.101229	533
579	Ewa	\N	Koslowski	sozialearbeit118a@stk118.de	03041717190	all_genders_avatar.png	2025-11-01 20:51:23.143384	2025-11-01 20:51:23.143384	367
580	Mandy	\N	Urban	contact@cityeleven.de	03020092693	all_genders_avatar.png	2025-11-01 20:51:23.199406	2025-11-01 20:51:23.199406	543
581	Khalilzadeh	\N	\N	khalilzadeh@drk-mueggelspree.de	030239893052	all_genders_avatar.png	2025-11-01 20:51:23.30645	2025-11-01 20:51:23.30645	538
582	Joanna	\N	Lundt	joanna.lundt@heroeurope.com	017669707582	all_genders_avatar.png	2025-11-01 20:51:23.336466	2025-11-01 20:51:23.336466	329
583	Sami	\N	\N	contact@need4deed.org	015170437839	all_genders_avatar.png	2025-11-01 20:51:23.410131	2025-11-01 20:51:23.410131	393
584	Jolanda	\N	Todt	Todt@awo-mitte.de	03050931547	all_genders_avatar.png	2025-11-01 20:51:23.777926	2025-11-01 20:51:23.777926	424
585	Magdalena	\N	Halekotte	magdalena.halekotte@ib.de	030 4570 777 27	all_genders_avatar.png	2025-11-01 20:51:23.926306	2025-11-01 20:51:23.926306	548
586	Myrto	\N	Munhoz-Boillot	ehrenamt.gukm@tamaja.de	+49 15780632534	all_genders_avatar.png	2025-11-01 20:51:23.994376	2025-11-01 20:51:23.994376	549
587	Peter	\N	Kanyó	p.kanyo@albatrosggmbh.de	403638427	all_genders_avatar.png	2025-11-01 20:51:24.088816	2025-11-01 20:51:24.088816	367
588	Tamer	\N	Subasi	ehrenamt.gutw@tamaja.de	01779038263	all_genders_avatar.png	2025-11-01 20:51:24.160146	2025-11-01 20:51:24.160146	502
589	Thomas	\N	Weber	begleitung@example.com	+49302345678	all_genders_avatar.png	2025-11-01 20:51:24.413581	2025-11-01 20:51:24.413581	387
590	Anna	\N	Seifert	Anna.Seifert@lfg-b.de	+4915115074477	all_genders_avatar.png	2025-11-01 20:51:24.475559	2025-11-01 20:51:24.475559	430
591	Ina	\N	BAS	info@need4deed.org	017660991831	all_genders_avatar.png	2025-11-01 20:51:24.707317	2025-11-01 20:51:24.707317	334
592	Sven	\N	Clausen	Sven.Clausen@ib.de	+49 1512 2128152	all_genders_avatar.png	2025-11-01 20:51:24.924272	2025-11-01 20:51:24.924272	544
593	David	\N	Maya	betreuung-ksd@eu-homecare.com	0151 74352644	all_genders_avatar.png	2025-11-01 20:51:24.944321	2025-11-01 20:51:24.944321	539
594	Mehri	\N	Zadeh	mehri.mohammadzadeh@ib.de	017629124123	all_genders_avatar.png	2025-11-01 20:51:24.994944	2025-11-01 20:51:24.994944	384
595	Fadare	\N	Dolapo	fadare@drk-mueggelspree.de	030 2398938 76	all_genders_avatar.png	2025-11-01 20:51:25.047584	2025-11-01 20:51:25.047584	535
596	Ramzan	\N	Kagirov	kagirov@berliner-stadtmission.de	030 690333901	all_genders_avatar.png	2025-11-01 20:51:25.131407	2025-11-01 20:51:25.131407	545
597	Sophie	\N	Hollop	info@kieztandem.de	0174 2394904	all_genders_avatar.png	2025-11-01 20:51:25.176878	2025-11-01 20:51:25.176878	331
598	Malin	\N	Lox	termine-hk@berliner-stadtmission.de	0170 2057696	all_genders_avatar.png	2025-11-01 20:51:25.639828	2025-11-01 20:51:25.639828	379
599	Vedat	\N	Dayan	ehrenamtskoordination@gu-oberhafen.de	030 2332 1961-36	all_genders_avatar.png	2025-11-01 20:51:26.592637	2025-11-01 20:51:26.592637	543
600	Maria-Berenike	\N	Häusler	Maria-Berenike.Haeusler@lfg-b.de	01511 507 663 4	all_genders_avatar.png	2025-11-01 20:51:26.673293	2025-11-01 20:51:26.673293	544
\.


--
-- Data for Name: postcode; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.postcode (id, longitude, latitude, value) FROM stdin;
1	\N	\N	12345
2	13.3846074	52.5322530	10115
3	13.3872223	52.5169655	10117
4	13.4053209	52.5304772	10119
5	13.4096284	52.5213124	10178
6	13.4163353	52.5121934	10179
7	13.4393827	52.5123063	10243
8	13.4647553	52.5006585	10245
9	13.4655536	52.5161596	10247
10	13.4427724	52.5237626	10249
11	13.5147644	52.5132299	10315
12	13.4907669	52.4979014	10317
13	13.5286872	52.4834850	10318
14	13.5188024	52.4991936	10319
15	13.4968621	52.5206131	10365
16	13.4820993	52.5246229	10367
17	13.4694499	52.5294756	10369
18	13.4257038	52.5351824	10405
19	13.4491709	52.5336070	10407
20	13.4413572	52.5443185	10409
21	13.4111863	52.5377637	10435
22	13.4125808	52.5448532	10437
23	13.4121146	52.5521596	10439
24	13.3371634	52.5307202	10551
25	13.3214655	52.5305064	10553
26	13.3354570	52.5215317	10555
27	13.3594370	52.5233235	10557
28	13.3499203	52.5301232	10559
29	13.3056876	52.5151965	10585
30	13.3195166	52.5184473	10587
31	13.3057090	52.5275504	10589
32	13.3273638	52.5088240	10623
33	13.3146866	52.5094582	10625
34	13.3029957	52.5079844	10627
35	13.3085871	52.5027952	10629
36	13.3137529	52.4966568	10707
37	13.3031166	52.4938818	10709
38	13.2904513	52.4981211	10711
39	13.3132726	52.4850887	10713
40	13.3288773	52.4824450	10715
41	13.3275478	52.4907978	10717
42	13.3256787	52.4988463	10719
43	13.3427020	52.4974551	10777
44	13.3394753	52.4921119	10779
45	13.3529141	52.4935684	10781
46	13.3623702	52.4964239	10783
47	13.3642499	52.5073096	10785
48	13.3438693	52.5077800	10787
49	13.3377037	52.5016673	10789
50	13.3508815	52.4873089	10823
51	13.3412437	52.4837595	10825
52	13.3542578	52.4837764	10827
53	13.3607965	52.4761881	10829
54	13.3974708	52.4926228	10961
55	13.3812583	52.5001610	10963
56	13.3948846	52.4853754	10965
57	13.4164153	52.4905026	10967
58	13.4011321	52.5024880	10969
59	13.4355579	52.5009216	10997
60	13.4265585	52.4969173	10999
61	13.4370598	52.4798983	12043
62	13.4392319	52.4854637	12045
63	13.4284746	52.4905245	12047
64	13.4220096	52.4763489	12049
65	13.4298765	52.4669011	12051
66	13.4325289	52.4768383	12053
67	13.4485985	52.4712085	12055
68	13.4632834	52.4683988	12057
69	13.4512862	52.4809198	12059
70	13.4023350	52.4644018	12099
71	13.3790681	52.4784948	12101
72	13.3746916	52.4640553	12103
73	13.3713783	52.4492183	12105
74	13.3916956	52.4312234	12107
75	13.3993547	52.4464376	12109
76	13.3461930	52.4653194	12157
77	13.3369177	52.4736776	12159
78	13.3269683	52.4703786	12161
79	13.3184588	52.4626412	12163
80	13.3148381	52.4556652	12165
81	13.3337921	52.4485942	12167
82	13.3435329	52.4547905	12169
83	13.3095486	52.4443763	12203
84	13.2945233	52.4339729	12205
85	13.3132013	52.4198864	12207
86	13.3290974	52.4179166	12209
87	13.3462165	52.4394748	12247
88	13.3518131	52.4263655	12249
89	13.3750326	52.4133955	12277
90	13.3530530	52.4106265	12279
91	13.4020728	52.4032700	12305
92	13.3906968	52.3886300	12307
93	13.4171451	52.3904869	12309
94	13.4281341	52.4508702	12347
95	13.4220802	52.4252545	12349
96	13.4555127	52.4327583	12351
97	13.4589222	52.4227378	12353
98	13.4978282	52.4109915	12355
99	13.4905231	52.4293003	12357
100	13.4531345	52.4473339	12359
101	13.4671837	52.4865593	12435
102	13.4816810	52.4623959	12437
103	13.5280824	52.4655687	12459
104	13.5051497	52.4437059	12487
105	13.5431533	52.4356043	12489
106	13.5416543	52.4128329	12524
107	13.5642097	52.3976388	12526
108	13.6338820	52.3856250	12527
109	13.5790983	52.4626736	12555
110	13.5917549	52.4303434	12557
111	13.6632729	52.4148970	12559
112	13.6361643	52.4586110	12587
113	13.7033607	52.4438132	12589
114	13.5882914	52.5234890	12619
115	13.5878077	52.5027261	12621
116	13.6164940	52.5025915	12623
117	13.6134938	52.5372253	12627
118	13.5901148	52.5413115	12629
119	13.5659854	52.5501377	12679
120	13.5366916	52.5369038	12681
121	13.5590592	52.5075193	12683
122	13.5650082	52.5390868	12685
123	13.5644734	52.5564134	12687
124	13.5675161	52.5664762	12689
125	13.4908448	52.5815103	13051
126	13.5045996	52.5500144	13053
127	13.4959966	52.5400851	13055
128	13.5414743	52.5710531	13057
129	13.5216911	52.5808522	13059
130	13.4481848	52.5564791	13086
131	13.4707988	52.5603234	13088
132	13.4409974	52.5706802	13089
133	13.4829397	52.6328592	13125
134	13.4380363	52.6199998	13127
135	13.4579275	52.5920578	13129
136	13.3996793	52.5823594	13156
137	13.3834822	52.5931990	13158
138	13.3978193	52.6229802	13159
139	13.4084067	52.5695443	13187
140	13.4219228	52.5642815	13189
141	13.3654554	52.5490604	13347
142	13.3473385	52.5579884	13349
143	13.3328290	52.5506527	13351
144	13.3494934	52.5415929	13353
145	13.3905844	52.5417740	13355
146	13.3825454	52.5502547	13357
147	13.3850886	52.5598757	13359
148	13.3223947	52.5739096	13403
149	13.2967157	52.5595627	13405
150	13.3511527	52.5726566	13407
151	13.3713614	52.5678750	13409
152	13.3455836	52.6020476	13435
153	13.3284333	52.5904606	13437
154	13.3583654	52.5976339	13439
155	13.2895520	52.6398939	13465
156	13.3074771	52.6171050	13467
157	13.3421701	52.6118861	13469
158	13.2487547	52.6121623	13503
159	13.2404369	52.5839011	13505
160	13.2717063	52.5765026	13507
161	13.3005851	52.5891876	13509
162	13.1793722	52.5310243	13581
163	13.1823535	52.5436597	13583
164	13.2049129	52.5477271	13585
165	13.1854257	52.5767180	13587
166	13.1675593	52.5570279	13589
167	13.1404510	52.5344700	13591
168	13.1672052	52.5148261	13593
169	13.1962245	52.5116147	13595
170	13.2194947	52.5272474	13597
171	13.2350066	52.5462937	13599
172	13.2990918	52.5398280	13627
173	13.2661218	52.5421736	13629
174	13.2683381	52.5208268	14050
175	13.2568588	52.5155892	14052
176	13.2386960	52.5159052	14053
177	13.2365122	52.4831290	14193
178	13.2879138	52.5072502	14057
179	13.2877739	52.5205239	14059
180	13.1516432	52.4707850	14089
181	13.1439867	52.4197352	14109
182	13.2025783	52.4462865	14129
183	13.2385050	52.4368309	14163
184	13.2535592	52.4175191	14165
185	13.2764669	52.4211709	14167
186	13.2573183	52.4496179	14169
187	13.2365122	52.4831290	14193
188	13.2828670	52.4588830	14195
189	13.3117896	52.4733586	14197
190	13.2950710	52.4776610	14199
191	13.5286443	52.4527703	12439
192	13.2447320	52.5019509	14055
193	13.6873885	52.3857080	15537
194	13.7053667	52.4597828	15566
195	13.7560579	52.4459538	15569
\.


--
-- Data for Name: profile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profile (id, info, category_id) FROM stdin;
1	\N	\N
2	\N	\N
3	\N	\N
4	\N	\N
5	\N	\N
6	\N	\N
7	\N	\N
8	Grundkenntnisse Arabisch ist auch sehr hochgegriffen;	\N
9	\N	\N
10	I’d most preferably to have on Tuesdays but other days are also fine!	\N
11	I work on shift base, so I am not available for sure saturdays and sundays, during the week I could have some free days and different shifts. If you add me to a group with a planned and shared calendar I can join any location according to my shifts.	\N
12	My schedule is flexible. I can accommodate different time periods, if agreed in advance.	\N
13	\N	\N
14	\N	\N
15	\N	\N
16	\N	\N
17	\N	\N
18	\N	\N
19	\N	\N
20	\N	\N
21	\N	\N
22	I have a disability related to my menstrual cycle. Because if this I can only guarantee I can participate between 1-2 a month. For Saturdays, I might be flexible and can do it either from 4-6 pm or 6-8pm	\N
23	I work as a model and I have a flexible routine. I never really know when I’m going to have work so I checked most times and days.	\N
24	\N	\N
25	I am also working and studying therefore I am not available on Mondays, Tuesdays and Wednesdays originally, but in case of an urgent need I would work to make it possible	\N
26	\N	\N
27	\N	\N
28	\N	\N
29	\N	\N
30	\N	\N
31	I can be available most of the time between 9h-16h (with some exceptions) if I know in advance	\N
32	My schedule will change in the next weeks	\N
33	\N	\N
34	\N	\N
35	\N	\N
36	I would mostly prefer the weekend. However, If that is not possible all the time, I can avail myself during the afternoon on some weekdays with prior notice. I live in Frankfurt (Oder).	\N
37	During the week generally available after 17 due to work obligations. Earlier may be possible on certain days.	\N
38	\N	\N
39	\N	\N
40	\N	\N
41	My schedule might chance as from the next week	\N
42	Ich wohne in Alt Buckow 12349. Ich hoffe, dass ich in der Nähe hier arbeiten kann.	\N
43	I am working shifts (early, late or night) so it really depends on my work schedule. Usually I am off monday and tuesday, so would be available in the afternoon (but again that can change from to week)	\N
44	I would probably need to adapt and update my schedule once i get the confirmation for my german classes schedule.	\N
45	\N	\N
46	\N	\N
47	I am working full time job, so unfortunately can support mostly on the weekends	\N
48	\N	\N
49	\N	\N
50	\N	\N
51	\N	\N
52	\N	\N
53	I would like to volunteer 1 time per week please	\N
54	\N	\N
55	\N	\N
56	\N	\N
57	Contact me via whatsapp if needed whenever and I will see my availability	\N
58	\N	\N
59	\N	\N
60	\N	\N
61	I may need to change it in the future as I intend to take German language classes (I am roughly B1 level). As of now I only want to do at most 20 hours per week.	\N
62	\N	\N
63	\N	\N
64	\N	\N
65	Ich habe von Montag bis Donnerstag einen Deutschkurs. Am liebsten die restlichen drei Tage nachmittags und abends.	\N
66	\N	\N
67	I‘m also available for flexible/one time translations at different times	\N
68	no	\N
69	\N	\N
70	\N	\N
71	\N	\N
72	Ab Oktober bin ich werktags frei	\N
73	\N	\N
74	I don’t have my university schedule yet, so I will have to adjust	\N
75	About my schedule right now my school is on vacation but it's gonna start October when it's started my schedule can be changed and I might have to do this preferances again thank you for understanding.  🙏	\N
76	Ja	\N
77	No i dont have	\N
78	\N	\N
79	I am unemployed at the moment. As soon as I find a job my volunteering opportunities will change.	\N
80	I prefer to volunteer in weekends	\N
81	\N	\N
82	nein	\N
83	I am in my semester break so I am very flexible	\N
84	\N	\N
85	\N	\N
86	I am only available for the rest of August	\N
87	I may have additional availability during the weekdays, however it depends on my work schedule and meetings, therefore it is difficult to commit to a slot on a regular basis.	\N
88	Omaha pro Woche	\N
89	Hello! In the past I was volunteering in a cafe where we were taking care of refugee kids while their parents were attending a german course. Something like this or something like doing arts or crafts / leisure time activities with the kids, would be awesome. I habe basic skills in arabic. And I would like to volunteer approx 2h a week. Kind regards, Jenny	\N
90	Ich habe leider noch nicht meinen Stundenplan für die Uni bekommen deswegen kann es gut sein, dass die Zeiten an welchen ich Zeit habe sich nochmal verändern. Und ich kann erst ab dem 6.10 wieder weil ich dann erst zurück nach Berlin komme	\N
91	I am very flexible, I can volunteer when most convenient for you!	\N
92	\N	\N
93	In the end, availability depends on the workload, so it's difficult to say what would be possible during the week.	\N
94	\N	\N
95	Ich bin bis September weg. Ich fange dann mit einem neuen Job an. Bin mir nicht sicher wie viele Energie ich danach haben wird. Hab daher nur donnerstags frei gemacht für jetzt.	\N
96	\N	\N
97	\N	\N
98	\N	\N
99	\N	\N
100	Shawky 01.08.2024: She used to be a school teacher for math and physics back in Yemen	\N
101	I will start studying in the middle of September and don't know yet what the schedule will be, but I will naturally be much less available.	\N
102	Unfortuntaley I work full time, so after 6 would only work for me.	\N
106	\N	\N
103	Schedule changes. Happy to help when needed, just let me know.	\N
119	\N	\N
133	I'm flexible - all depends on how often I'm volunteering. Also Tempelhof is an option, just need more time to get there and back.	\N
143	It changes the next month.	\N
154	I often work one week on one week off in my regular job so some at times I would be available during the week and other weeks I would not be available when working my regular job. When Im not working my hours can be flexible	\N
168	\N	\N
177	It all depends on my kids' schedule, so when the school or Kita are closed, I won't be available.	\N
186	My schedule changes from day to day, so I might be able to help more or less depending on the schedule	\N
195	\N	\N
205	\N	\N
220	\N	\N
235	\N	\N
244	\N	\N
255	\N	\N
267	Nope / Contacted for post-match followup	\N
276	Contacted for post-match followup	\N
283	\N	\N
293	\N	\N
305	\N	\N
314	\N	\N
321	\N	\N
333	I've heard good things of your team and activity, so I'm inspired to join.	\N
340	\N	\N
346	\N	\N
355	\N	\N
362	\N	\N
369	\N	\N
378	\N	\N
384	I'd like to work in gardening, planting trees, etc., and I can also help sort clothes. I'm a teacher with 15 years of experience in Venezuela, but I've only been here in Germany for a short time.	\N
392	Hello, My name is Kerstin Larsson and I am a student pursuing my master's degree in Paris in International Development. I will be going to Berlin over the summer from June 22 for at least a month, probably longer. I will be studying German each day from 9-12.30 during the weeks and the hours after that I would like to help out and volunteer. I am also available during the weekends. Please let me know if you need any additional information about me and my experiences. Best regards/ Kerstin Larsson	\N
401	\N	\N
408	\N	\N
417	\N	\N
424	I can also crochet and braid hairstyles from series and movies, I don't know whether that is relevant or even helpful.	\N
433	\N	\N
439	\N	\N
448	\N	\N
455	\N	\N
464	Ultimate Frisbee  - i also put things i am not expert at but down to do (:	\N
474	My availability on Mondays & Fridays depends on the week--more often than not I am available, but sometimes I'm not in Berlin. I will also be gone from 17.04-25.04 (Easter holidays). Other than that, I have a lot of experience with theatre/acting in addition to the other ones I listed above.	\N
488	Hello,	\N
500	\N	\N
513	\N	\N
524	\N	\N
535	I will be available from 9th of December onwards for the rest of December. Unfortunately I cannot offer long-term support as I will not be in Berlin from January onwards.	\N
104	I work full-time, but it's pretty flexible:)	\N
113	On October I will start school so my schedule might change and I won’t be in Germany for the last two weeks of August	\N
120	To be after working hours	\N
128	Maybe I’ll only be available until the end of September	\N
136	\N	\N
144	\N	\N
150	Generally flexible for anytime	\N
158	\N	\N
166	\N	\N
175	\N	\N
184	\N	\N
192	\N	\N
201	\N	\N
209	\N	\N
218	Dear Need4Deed team,Me and 2 of my close friends are coming from Tennessee to Berlin from May 26-June 2 in search of potential volunteering opportunities. We are specifically searching for ones assisting Ukrainian refugees in Berlin because one of my friends is Ukrainian and has much family still in Ukraine. He is fluent in Ukrainian and I am fluent in German. Please let me know if there are any opportunities, specifically ones helping Ukrainians.Thank you, Marvin	\N
225	\N	\N
241	\N	\N
250	\N	\N
257	Contacted for post-match followup	\N
280	Ich kann bei Bedarf auch an anderen Tagen einspringen aber den Mittwoch Nachmittag habe ich immer frei und kann dementsprechend zu dieser Zeit regelmäßig.	\N
289	\N	\N
297	Contacted for post-match followup	\N
313	\N	\N
320	\N	\N
326	Ich habe einen Minijob, wo ich sehr unterschiedliche Zeiten habe, ich kann  also jede Woche unterschiedlich. An den angegebenen Zeiten sollte ich (hoffentlich) immer können und manchmal auch an den anderen Tagen:)	\N
332	\N	\N
356	\N	\N
371	\N	\N
400	\N	\N
416	Hello! I'm a certificated yoga teacher, I will be happy to volunteering offering some lessons.	\N
432	Hi! I would love to get involved in your activities, especially creative ones. I have some experience from a few years ago in arts&crafts for 1-3 year olds for KiezOase Schöneberg, which was very fun, and with adults with disabilities. My Führungszeugnis is unfortunately not up to date.	\N
447	\N	\N
463	\N	\N
478	Hello dear community, I have a 5 volunteering day paid leave from my work that I want to use for a good cause this year with volunteering. I saw this opportunity that I thought I might be a good fit but I am also open for other opportunities. What is important for me is that I can commit to it for only 10 weeks in half days and preferably on Friday afternoon as I need to submit these days to my manager as soon as possible for approval. I would also appreciate if I could get somehow a participation letter that could be a proof. Please let me know if you can provide me these and if I need to do anything else to become a volunteer starting from February 7th until April 11th on Fridays in the afternoons.	\N
491	\N	\N
504	\N	\N
515	\N	\N
530	Ich bin nur jede zweite Woche in Berlin	\N
536	\N	\N
105	von 9-17 bin ich nicht verfügbar unter der Woche aber danach und am Wochenende ziemlich flexibel	\N
114	\N	\N
121	\N	\N
129	\N	\N
137	I finish my work every day at 15 mon-fri	\N
145	\N	\N
157	\N	\N
174	\N	\N
191	\N	\N
203	Canceled volunteering Praktikum because marzahn was the only option and it was too far for her	\N
212	No	\N
224	\N	\N
234	\N	\N
245	\N	\N
259	\N	\N
266	\N	\N
275	can be flexible	\N
282	\N	\N
292	\N	\N
300	Contacted for post-match followup	\N
307	\N	\N
311	\N	\N
322	\N	\N
330	\N	\N
338	\N	\N
349	\N	\N
363	\N	\N
374	\N	\N
386	\N	\N
403	I'm also a meditation and mindfulness teacher, and happy to volunteer to teach that to children or adults.	\N
419	\N	\N
435	\N	\N
451	Hello! I've selected all the time frames that would fit in my schedule, however, since I am still studying and working, I can only volunteer regularly (bi-weekly preferred but every week also works) in ONE of these time frames. On thursdays I have a bi-weekly uni class, so for those timeframes (except the 17-20) I could only do every other thursday!	\N
467	\N	\N
480	\N	\N
495	\N	\N
503	Mein Deutschniveau ist A2. Ich setze mein weiteres Studium fort	\N
516	\N	\N
527	\N	\N
537	\N	\N
107	I live in Wilmersdorf that is why I only selected 2 options but I can also do other locations if needed	\N
115	\N	\N
123	Full availability at the moment however this may change upon employment / Experience working with kids, Pediatric occupational therapist in Australia, film and photography. A1.2 language course. Experience in arts/crafts with kids -Vostel.	\N
131	I travel a lot so I cannot guarantee availability every week.	\N
139	My schedule is very irregular, so it is truly impossible to estimate availability. But if I'm notified about the event in advance (at least 2 weeks), then I can manage to fit in volunteering	\N
147	\N	\N
152	I can be sometimes available in more time slots	\N
161	\N	\N
169	\N	\N
178	\N	\N
187	\N	\N
194	\N	\N
204	no	\N
211	Available time as it is for now, but I would have to make changes to it in the future due to different reasons	\N
221	I will try to be consistant however the schedule will depend on my job interview schedule.	\N
228	\N	\N
236	n/a	\N
243	\N	\N
252	I work in the evenings during the weekday.  Currently need to be home by 4pm.	\N
260	\N	\N
265	Hello,\nMy name is Adam. I have read this position with interest. \nI am unemployed at the moment with loads of free time.\nI used to babysit and would like to become an Erzieher. / Contacted for post-match followup.	\N
274	The schedule can change depending on the week but this is generally, with advance notice, can make it.	\N
281	\N	\N
291	I will probably start working as a freelancer / full time and/or German classes in near future so i don't know about my available times yet	\N
299	Ich bin seit fast einem Jahr in der Unterkunft Columbiadamm 84 engagiert, dies wurde von Bevos vermittelt, aber dann sind alle Kontakte zu Bevos eingeschlafen, weil die e-Mail-Adressen nicht mehr funktionierten etc. Das hat mich doch sehr enttäuscht und ich war auf meine eigene Initiative angewiesen. Ich bin jweiter an einem Austausch mit andereren Sprachhelfern interessiert	\N
306	\N	\N
310	\N	\N
316	\N	\N
318	\N	\N
325	\N	\N
345	\N	\N
352	I can write. I can do writing Workshops.	\N
361	\N	\N
375	\N	\N
390	\N	\N
398	I can speak Bengali, English, and basic German (A2 level). I am flexible with working times and willing to work on weekdays and weekends if needed. I am open to working in any location in Germany where accommodation is available. I am interested in healthcare, elderly care, working with people with disabilities, and helping in hospitals or care homes.	\N
409	\N	\N
418	\N	\N
427	\N	\N
437	I would like to preferably work with kids and queer refugees.	\N
446	\N	\N
456	N/a	\N
465	\N	\N
473	\N	\N
484	Am available weekends at any time or early in the morning on weekdays or later in the day on weekdays.	\N
493	I speak A2/B1 German.	\N
507	\N	\N
522	\N	\N
108	\N	\N
116	I am studying my my Deutsch Cours and it start at 9 o'clock morning up to 13 Afternoon and it’s from Monday to Friday	\N
130	Flexible	\N
146	\N	\N
160	I’m in town for 3 months doing research and am flexible in my schedule, though will be busy at different times for different meetings	\N
170	\N	\N
182	Nein	\N
196	\N	\N
213	\N	\N
227	\N	\N
240	I am allowed to take 1 day for volunteering each month. Fridays would work best with my work schedule. If possible.	\N
256	I might need to adjust my schedule if I get hired by an employer.	\N
271	Contacted for post-match followup	\N
285	\N	\N
301	\N	\N
309	\N	\N
327	\N	\N
339	\N	\N
354	\N	\N
368	\N	\N
381	\N	\N
389	Times are flexible. Preference would be teaching kids chess/guitar	\N
399	\N	\N
413	Ich fahre schon lange Skateboard und mach Kickboxen. Diese kann ich den Kindern beibringen.	\N
428	\N	\N
441	Liebes Need4Deed-Team,  ich bin Vater von zwei kleinen Kindern (4 und 7 Jahre alt), lebe in Schöneberg, Berlin und arbeite an einer Universität. Ich komme ursprünglich aus Russland, spreche Russisch als Muttersprache und habe etwa B2-Niveau in Deutsch.  Da ich selbst viel Freude daran habe, Zeit mit Kindern zu verbringen, würde ich mich sehr freuen, geflüchtete Kinder in der Gemeinschaftsunterkunft zu unterstützen – sei es beim Spielen, Basteln oder einfach im gemeinsamen Alltag. Es wäre schön, einen kleinen Beitrag zu ihrem Wohlbefinden leisten zu können.  Ich freue mich auf Ihre Rückmeldung!  Herzliche Grüße, Philipp Chapkovski, Ph.D https://chapkovski.github.io/ +4915123570022	\N
450	\N	\N
459	Chess Football, basketball, chess, Support with	\N
469	\N	\N
482	\N	\N
490	\N	\N
499	\N	\N
510	\N	\N
521	Picking Spanish up again. Soccer, May Thai, Lindy hop, Capoeira.	\N
533	\N	\N
538	\N	\N
109	Ich bin eigentlich flexibel aber dass sind doch meine Präferenzen	\N
117	\N	\N
125	\N	\N
134	I am available from July 22 on and then for a couple of weeks as indicated above. After that I enter back into a tighter work schedule.	\N
141	\N	\N
155	\N	\N
162	\N	\N
171	\N	\N
179	\N	\N
188	Bei mir variieren meien Verfügbarkeiten stark, da ich gerade keine wirklich geregelte Woche habe. Gebt mir aber gerne Bescheid wann und wo ihr Menschen benötigt, ich unterstütze euch gerne!	\N
197	\N	\N
206	- 28.05.2024: Dear Mohammad Hassan, I don't Führungszeugnis but I have Anmeldung in Berlin, I'm also living in a immigrants Heim and I don't have permit, even I don't have refugee permit but my permit is in process,  it will take months, I'm waiting for appointment so I don't know it's possible for me to take Führungszeugnis when I don't have permit?Best regards	\N
214	\N	\N
222	i'm mostly very flexible due to work, sometimes i have to work on weekends but then i'm free during the week, this can vary from week to week	\N
230	\N	\N
237	\N	\N
246	For now I'm available 7 days a week but in 4 weeks time I'll be starting German language classes, from then I'll only be available evenings and weekends	\N
253	\N	\N
262	\N	\N
268	\N	\N
277	I will have wisdom teeth surgery on 05.03 so I expect to be able to start volunteering in mid-march. and to fit my schedule I would like to volunteer 1-3 days a week	\N
286	I work full weekdays but can do m	\N
294	\N	\N
315	\N	\N
317	\N	\N
337	\N	\N
344	\N	\N
350	\N	\N
359	\N	\N
366	\N	\N
376	\N	\N
382	\N	\N
391	\N	\N
397	I have long experience working with children, both due to professional activities (summer schools, baby sitting) and as a volunteer, more recently worked with an association offering after school activities of an underserved community in the amazons in Peru.	\N
406	\N	\N
414	\N	\N
422	\N	\N
429	I am Angela from Hong Kong, wanted to participate as a volunteer to help people, I did it many time since teenager.	\N
438	Ich arbeite selbst in einer Behörde und kann daher bei Antragstellungen ggf. unterstützen.	\N
445	\N	\N
454	I have a yoga teacher for children certification and would be happy to work with children.	\N
460	\N	\N
470	Hi, I am a young professional in IT. I have every friday free from the end of February to the end of March, I would love to help and support at the Tempelhof refugee center. I think I am quite good with children and I would really enjoy supporting the day care and committing to create and organize some fun activities for the children to do. On the side I can also help with anyone in need of programming or IT support! My skills in german are currently around A2/B1 but I am improving every day. Best, Benjamin	\N
476	\N	\N
483	As a freelancer with a patchwork of different dayjobs, my schedule varies from week to week. My main interest / thing I would currently like to offer is a set of art/sculpture workshop ideas for kids/youth, which I currently facilitate at Atrium Kunstschule in Reinickendorf. These workshop concepts can be adopted to various circumstances.	\N
492	\N	\N
498	\N	\N
508	\N	\N
514	\N	\N
523	\N	\N
531	flexible but not always avilable- need to ask	\N
110	\N	\N
118	\N	\N
126	\N	\N
135	I will be on vacation outside of Berlin until the 28th of June, but afterwards, I will be in Berlin and can commit to the hours marked above.	\N
148	\N	\N
153	I am usually available Mon-Fri after 18:00 since I work full-time. I am free on the weekends.	\N
164	\N	\N
173	\N	\N
181	I work freelance and have two kids, so my availability changes from week to week. She is out of Berlin until June 23rd.	\N
190	\N	\N
199	\N	\N
208	\N	\N
216	\N	\N
229	\N	\N
239	I have a full time job during the weekday (8 to 6pm) so I can only work outside of these hours	\N
248	i am	\N
261	\N	\N
272	Contacted for post-match followup	\N
284	I am a working student and my schedule changes every semester so I would have to modify it according to that.	\N
298	-	\N
304	\N	\N
334	\N	\N
341	\N	\N
348	\N	\N
358	\N	\N
367	\N	\N
377	\N	\N
385	\N	\N
396	\N	\N
407	I am from Hungary, and i would like to volunteer for two weeks in June!	\N
415	I am software engineer and can teach programming	\N
423	not registered for regular, just asked to do one time translation	\N
430	Gegen Masern bin ich bin aufgrund einer Masernerkrankung während meiner Kindheit immun	\N
440	\N	\N
449	\N	\N
458	\N	\N
468	\N	\N
477	\N	\N
487	\N	\N
501	\N	\N
511	\N	\N
518	\N	\N
532	\N	\N
541	\N	\N
542	\N	\N
543	\N	\N
544	\N	\N
545	\N	\N
546	\N	\N
547	\N	\N
548	\N	\N
549	\N	\N
550	\N	\N
551	\N	\N
552	\N	\N
553	\N	\N
554	\N	\N
555	\N	\N
556	\N	\N
557	\N	\N
558	\N	\N
559	\N	\N
560	\N	\N
561	\N	\N
562	\N	\N
563	\N	\N
564	\N	\N
565	\N	\N
566	\N	\N
567	\N	\N
568	\N	\N
569	\N	\N
570	\N	\N
571	\N	\N
572	\N	\N
573	\N	\N
574	\N	\N
575	\N	\N
576	\N	\N
577	\N	\N
578	\N	\N
579	\N	\N
580	\N	\N
581	\N	\N
582	\N	\N
583	\N	\N
584	\N	\N
585	\N	\N
586	\N	\N
587	\N	\N
588	\N	\N
589	\N	\N
590	\N	\N
591	\N	\N
592	\N	\N
593	\N	\N
594	\N	\N
595	\N	\N
596	\N	\N
597	\N	\N
598	\N	\N
599	\N	\N
600	\N	\N
601	\N	\N
602	\N	\N
603	\N	\N
604	\N	\N
605	\N	\N
606	\N	\N
607	\N	\N
608	\N	\N
609	\N	\N
610	\N	\N
611	\N	\N
612	\N	\N
613	\N	\N
614	\N	\N
615	\N	\N
616	\N	\N
617	\N	\N
618	\N	\N
619	\N	\N
620	\N	\N
621	\N	\N
622	\N	\N
623	\N	\N
624	\N	\N
625	\N	\N
626	\N	\N
627	\N	\N
628	\N	\N
629	\N	\N
630	\N	\N
631	\N	\N
632	\N	\N
633	\N	\N
634	\N	\N
635	\N	\N
636	\N	\N
637	\N	\N
638	\N	\N
639	\N	\N
640	\N	\N
641	\N	\N
642	\N	\N
643	\N	\N
644	\N	\N
645	\N	\N
646	\N	\N
647	\N	\N
648	\N	\N
649	\N	\N
650	\N	\N
651	\N	\N
652	\N	\N
653	\N	\N
654	\N	\N
655	\N	\N
656	\N	\N
657	\N	\N
658	\N	\N
659	\N	\N
660	\N	\N
661	\N	\N
662	\N	\N
663	\N	\N
664	\N	\N
665	\N	\N
666	\N	\N
667	\N	\N
668	\N	\N
669	\N	\N
670	\N	\N
671	\N	\N
672	\N	\N
673	\N	\N
674	\N	\N
675	\N	\N
676	\N	\N
677	\N	\N
678	\N	\N
679	\N	\N
680	\N	\N
681	\N	\N
682	\N	\N
683	\N	\N
684	\N	\N
685	\N	\N
686	\N	\N
687	\N	\N
688	\N	\N
689	\N	\N
690	\N	\N
691	\N	\N
692	\N	\N
693	\N	\N
694	\N	\N
695	\N	\N
696	\N	\N
697	\N	\N
698	\N	\N
699	\N	\N
111	It can sometimes change but, in principle, I am relatively flexible as I work from home, but I will be fitting various other things in. It also somewhat depends on the location in question. As for locations, I could also potentially travel further afield, and have done in the past when going to accommodation centres to provide assistance, but my preference would be for around Neukölln, so I only ticked the actual preferences. It also perhaps depends on the time of the errand. In principle though, for a couple of hours a week/a couple of times a month, I should be rather flexible.	\N
124	\N	\N
132	\N	\N
142	\N	\N
159	I'm very busy but would like to help with translation when I can. I had measles when I was a small child.	\N
167	\N	\N
176	\N	\N
185	\N	\N
193	\N	\N
202	\N	\N
210	Nein	\N
219	\N	\N
226	My personal schedule could change, as I am a student and I don’t always have fixed schedule. As of now I’m relatively free, however that may change, of which I would let you know in advance.	\N
233	i am a social worker working with young ofender	\N
242	\N	\N
251	\N	\N
258	My schedule changes every week/month because of my work. / Contacted for post-match followup	\N
270	Actually im not into regular volunteering as im working whenever im free i do volunteering	\N
279	\N	\N
288	\N	\N
296	\N	\N
308	Monday - Thursday might be hard for me as I need to work at 9 am	\N
323	\N	\N
331	\N	\N
343	My mother tongue is brazilian portuguese.	\N
353	\N	\N
365	\N	\N
373	\N	\N
380	\N	\N
388	\N	\N
395	\N	\N
405	\N	\N
411	Preferred time frame would be either fridays (any time) or on the weekend.	\N
421	Hello here,  I am currently looking for an opportunity to volunteer and realize myself in this need.  I am from Ukraine and have been living and working in Berlin for over a year, studying the language.  I am fluent in Ukrainian and Russian. A little worse in English and at an intermediate level in German. But I am constantly working on it.  I work in the IT field, but in the past, while studying at the university, I worked part-time as a tutor in mathematics, Ukrainian language and history mostly with young people.  If you suddenly have a need, I can find free time after 6 pm (Monday, Wednesday, and also up to 3 hours on weekends).  Best wishes, Vadym	\N
431	\N	\N
444	\N	\N
457	- Shawky 18.03.2024: She helped during the Iftar. She wants to do only accompanying, because her schedule is not clear (doing her MA)	\N
466	Please just email or message me to contact me.	\N
472	\N	\N
481	\N	\N
489	I work on shifts, that Is why I did not select some time frames	\N
496	\N	\N
505	A1.2 level German	\N
512	\N	\N
520	\N	\N
526	\N	\N
540	\N	\N
112	I can only work until October	\N
127	\N	\N
140	Earlier rather later in the day	\N
149	\N	\N
156	\N	\N
163	\N	\N
172	\N	\N
180	\N	\N
189	Werktags keine verbindl. Festlegungen im Vorhinein wg. Arbeit. Jedoch relativ gute Schancen bei spontanen Anfragen für Treptow bzw. Rudow vormittags.	\N
198	\N	\N
207	I am applying for payed jobs at the moment which is why my schedule could change by a bit in the next month or so. But then I should still be available for at least 10 hours a week for the next months.	\N
215	No	\N
223	\N	\N
231	\N	\N
238	\N	\N
247	\N	\N
254	\N	\N
263	\N	\N
269	As I am a student and have a mini job as well, my availability might change throughout the next months because of possible classes or be subject to meetings scheduled for my job. I think I still have to figure out how to best integrate volunteer work into my usual schedule. / Contacted for post-match followup.	\N
278	\N	\N
287	\N	\N
295	\N	\N
302	Contacted for post-match followup	\N
324	I speak fluent Portuguese and am currently learning Russian.	\N
329	\N	\N
335	hi, zu den Zeiten: ich habe eine Auswahl angegeben, die für mich grundsätzlich regelmäßig möglich sind. Insgesamt kann ich mir so 4-8h pro Woche vorstellen. Machmal muss ich wegen des Studiums ist Arbeit über mehrere Tage wegfahren. Ich habe eine Schauspielausbildung und kann gerne, was mit Sprechen und Vorlesen machen. Außerdem Interesse an schulischer Mathematik. Gruppen geleitet habe ich noch nicht und ist mir möglicherweise zu schwierig. Ich habe ein Führungszeugnis von 2021/2022, ist das aktuell genug? Freue mich über ein Kennenlernen.	\N
342	Valid from 21st July 2025 until 30th July. Before starting my new job I have 2 weeks off. I have worked in big companies as Executive Assistant and also in a ministry recently, so I know German bureaucracy and also real estate agents etc. Very well and would like to help. Lots of experience in Hospitality & Event Management, Star Trek, Architecture / Guide Tours, Club Culture, Chaos Computer Club	\N
347	Ich habe die Trainer C-Linzenz fürs Jugendfussball. Würde gerne Kindern, wenn Interesse da ist Tennis beibringen. Ich spiele selbst erst ein halbes Jahr, aber finde den Sport sowohl sehr gut für den Körper als auch um Fähigkeiten fürs Leben zu erlernen.	\N
357	\N	\N
364	Ich bin erstmal nicht in Berlin, aber ungefähr ab Mitte August erreichbar.	\N
372	\N	\N
379	\N	\N
387	\N	\N
394	\N	\N
404	\N	\N
410	\N	\N
420	I'm a fully qualified fitness coach	\N
426	\N	\N
436	ok with bein translation on the list for appointments but not a priority she is into regular volunteering and close to her place so in  radickestrs RAC is 22 min bus.	\N
442	Hey! I would love to help out. I currently work at an NGO which does an online 'sprachcafé' and I would be more than happy to use what I have learned through organising this:) Or generally would be keen to help.	\N
452	\N	\N
461	I'm really good at playing the clarinet and sing so I can help and volunteer in teaching music	\N
471	I am working full time but am available most days during my lunch break (12-2pm), so could be available then for appointments for example.	\N
479	\N	\N
486	I would like to have more information on how to help with translating from French to English.	\N
494	\N	\N
502	I usually work in the cultural field as an event producer.	\N
509	\N	\N
517	\N	\N
525	\N	\N
528	After choosing the schedule will I be able to change it later.	\N
534	\N	\N
122	\N	\N
138	I could be available on other days. Please ask!	\N
151	\N	\N
165	\N	\N
183	they want to have a company day on 24.6 they are ca. 9 people.	\N
200	sometimes I have work on Fridays from 13.30	\N
217	\N	\N
232	\N	\N
249	Half of the month I'm available on Monday from 4pm, the other half I'm available 6pm.	\N
264	Contacted for post-match followup	\N
273	\N	\N
290	\N	\N
303	Contacted for post-match followup	\N
312	\N	\N
319	\N	\N
328	\N	\N
336	nice to hear	\N
351	\N	\N
360	\N	\N
370	\N	\N
383	I'm starting my 80% position on July, so I will be available Fridays from 1th of July	\N
393	I am a classically trained flautist and am comfortable teaching the recorder. Also can read sheet music. I am also involved at a basketball club in Berlin so can potentially organize an event through that.	\N
402	\N	\N
412	\N	\N
425	Hey Team, I am Yoanna and am a native Bulgarian speaker (German & English C1). I am a student working part-time and am generally flexible Thursday and Friday either mornings/afternoons as well as evenings (17-20h) and sometimes on the weekend. I am open to any activities and would love to also engage in organizing some events like Sprachcafe or Festivals. Let me know how I can be helpful!	\N
434	\N	\N
443	\N	\N
453	\N	\N
462	Happy to teach self defence!	\N
475	This is a test from Onur ARICI	\N
485	I am good at small talk but of course in German is still a bit slow. Vielen Dank Elisa Ferrari	\N
497	\N	\N
506	\N	\N
519	I also play american football, I like to create content..	\N
529	No	\N
539	\N	\N
700	\N	\N
701	\N	\N
702	\N	\N
703	\N	\N
704	\N	\N
705	\N	\N
706	\N	\N
707	\N	\N
708	\N	\N
709	\N	\N
710	\N	\N
711	\N	\N
712	\N	\N
713	\N	\N
714	\N	\N
715	\N	\N
716	\N	\N
717	\N	\N
718	\N	\N
719	\N	\N
720	\N	\N
721	\N	\N
722	\N	\N
723	\N	\N
724	\N	\N
725	\N	\N
726	\N	\N
727	\N	\N
728	\N	\N
729	\N	\N
730	\N	\N
731	\N	\N
732	\N	\N
733	\N	\N
734	\N	\N
735	\N	\N
736	\N	\N
737	\N	\N
738	\N	\N
739	\N	\N
740	\N	\N
741	\N	\N
742	\N	\N
743	\N	\N
744	\N	\N
745	\N	\N
746	\N	\N
747	\N	\N
748	\N	\N
749	\N	\N
750	\N	\N
751	\N	\N
752	\N	\N
753	\N	\N
754	\N	\N
755	\N	\N
756	\N	\N
757	\N	\N
758	\N	\N
759	\N	\N
760	\N	\N
761	\N	\N
762	\N	\N
763	\N	\N
764	\N	\N
765	\N	\N
766	\N	\N
767	\N	\N
768	\N	\N
769	\N	\N
770	\N	\N
771	\N	\N
772	\N	\N
773	\N	\N
774	\N	\N
775	\N	\N
776	\N	\N
777	\N	\N
778	\N	\N
779	\N	\N
780	\N	\N
781	\N	\N
782	\N	\N
783	\N	\N
784	\N	\N
785	\N	\N
786	\N	\N
787	\N	\N
788	\N	\N
789	\N	\N
790	\N	\N
791	\N	\N
792	\N	\N
793	\N	\N
794	\N	\N
795	\N	\N
796	\N	\N
797	\N	\N
798	\N	\N
799	\N	\N
800	\N	\N
801	\N	\N
802	\N	\N
803	\N	\N
804	\N	\N
805	\N	\N
806	\N	\N
807	\N	\N
808	\N	\N
809	\N	\N
810	\N	\N
811	\N	\N
812	\N	\N
813	\N	\N
814	\N	\N
815	\N	\N
816	\N	\N
817	\N	\N
818	\N	\N
819	\N	\N
820	\N	\N
821	\N	\N
822	\N	\N
823	\N	\N
824	\N	\N
825	\N	\N
826	\N	\N
827	\N	\N
828	\N	\N
829	\N	\N
830	\N	\N
831	\N	\N
832	\N	\N
833	\N	\N
834	\N	\N
835	\N	\N
836	\N	\N
837	\N	\N
838	\N	\N
839	\N	\N
840	\N	\N
841	\N	\N
842	\N	\N
843	\N	\N
844	\N	\N
845	\N	\N
846	\N	\N
847	\N	\N
848	\N	\N
849	\N	\N
850	\N	\N
851	\N	\N
852	\N	\N
853	\N	\N
854	\N	\N
855	\N	\N
856	\N	\N
857	\N	\N
858	\N	\N
859	\N	\N
860	\N	\N
861	\N	\N
862	\N	\N
863	\N	\N
864	\N	\N
865	\N	\N
866	\N	\N
867	\N	\N
868	\N	\N
869	\N	\N
870	\N	\N
871	\N	\N
872	\N	\N
873	\N	\N
874	\N	\N
875	\N	\N
876	\N	\N
877	\N	\N
878	\N	\N
879	\N	\N
880	\N	\N
881	\N	\N
882	\N	\N
883	\N	\N
884	\N	\N
885	\N	\N
886	\N	\N
887	\N	\N
888	\N	\N
889	\N	\N
890	\N	\N
891	\N	\N
892	\N	\N
893	\N	\N
894	\N	\N
895	\N	\N
896	\N	\N
897	\N	\N
898	\N	\N
899	\N	\N
900	\N	\N
901	\N	\N
902	\N	\N
903	\N	\N
904	\N	\N
905	\N	\N
906	\N	\N
907	\N	\N
908	\N	\N
909	\N	\N
910	\N	\N
911	\N	\N
912	\N	\N
913	\N	\N
914	\N	\N
915	\N	\N
916	\N	\N
917	\N	\N
918	\N	\N
919	\N	\N
920	\N	\N
921	\N	\N
922	\N	\N
923	\N	\N
924	\N	\N
925	\N	\N
926	\N	\N
927	\N	\N
928	\N	\N
929	\N	\N
930	\N	\N
931	\N	\N
932	\N	\N
933	\N	\N
934	\N	\N
935	\N	\N
936	\N	\N
937	\N	\N
938	\N	\N
939	\N	\N
940	\N	\N
941	\N	\N
942	\N	\N
943	\N	\N
944	\N	\N
945	\N	\N
946	\N	\N
947	\N	\N
948	\N	\N
949	\N	\N
950	\N	\N
951	\N	\N
952	\N	\N
953	\N	\N
954	\N	\N
955	\N	\N
956	\N	\N
957	\N	\N
958	\N	\N
959	\N	\N
960	\N	\N
961	\N	\N
962	\N	\N
963	\N	\N
964	\N	\N
965	\N	\N
966	\N	\N
967	\N	\N
968	\N	\N
969	\N	\N
970	\N	\N
971	\N	\N
972	\N	\N
973	\N	\N
974	\N	\N
975	\N	\N
976	\N	\N
977	\N	\N
978	\N	\N
979	\N	\N
980	\N	\N
981	\N	\N
982	\N	\N
983	\N	\N
984	\N	\N
985	\N	\N
986	\N	\N
987	\N	\N
988	\N	\N
989	\N	\N
990	\N	\N
991	\N	\N
992	\N	\N
993	\N	\N
994	\N	\N
995	\N	\N
996	\N	\N
997	\N	\N
998	\N	\N
999	\N	\N
1000	\N	\N
1001	\N	\N
1002	\N	\N
\.


--
-- Data for Name: profile_activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profile_activity (id, profile_id, activity_id) FROM stdin;
1	2	1
2	6	18
3	59	1
4	78	1
5	114	1
6	126	1
7	141	1
8	158	1
9	165	1
10	179	7
11	185	1
12	190	7
13	198	1
14	199	1
15	205	7
16	221	1
17	217	1
18	212	1
20	225	7
19	220	1
21	226	7
22	219	1
23	224	7
24	223	1
25	236	1
26	235	1
27	234	1
28	231	1
29	241	1
30	240	1
31	251	1
32	254	1
33	260	1
34	256	1
35	263	1
36	261	1
37	265	1
38	270	1
39	275	1
40	277	1
41	271	1
42	274	1
43	283	1
44	286	1
45	287	1
46	296	1
47	298	1
48	300	1
49	302	1
50	307	1
51	305	1
52	306	1
53	310	1
54	10	1
55	13	1
56	29	1
57	23	1
58	45	7
59	61	1
60	64	1
61	50	1
62	81	7
63	82	1
64	86	7
65	89	1
66	90	7
67	85	1
68	83	1
69	91	1
70	98	1
71	95	7
72	99	1
73	113	1
74	115	1
75	112	1
76	120	1
77	121	1
78	140	7
79	151	7
80	155	1
81	156	1
82	154	1
83	152	1
84	153	7
85	162	1
86	164	1
87	169	1
88	172	7
89	170	7
90	160	1
91	174	7
92	180	1
93	192	7
94	193	1
95	202	1
96	196	7
97	204	1
98	197	1
99	208	1
100	210	7
101	215	1
102	206	1
103	213	7
104	218	1
105	222	1
106	228	1
107	227	7
108	229	1
109	238	1
110	242	1
111	246	1
112	248	1
113	257	1
114	255	1
115	267	1
116	279	1
117	284	1
118	290	1
119	294	1
120	295	1
121	289	1
122	297	1
123	303	1
124	304	1
125	320	21
126	318	12
127	321	11
128	319	3
129	323	6
130	325	6
131	324	21
132	326	11
133	322	18
134	329	7
135	328	18
136	327	4
137	330	18
138	332	11
139	333	12
140	334	17
141	331	3
142	337	11
143	336	3
144	342	21
145	341	18
146	335	22
147	340	21
148	339	21
149	344	6
150	345	11
151	343	11
152	346	11
153	338	21
154	350	6
155	351	18
156	347	1
157	352	21
158	349	11
159	353	11
160	357	11
161	355	5
162	354	11
163	348	18
164	359	18
165	358	21
166	362	11
167	360	11
168	361	11
169	356	21
170	365	12
171	363	11
172	366	9
173	367	11
174	369	6
175	372	7
176	373	11
177	364	21
178	368	22
179	376	11
180	371	11
181	374	11
182	378	14
183	375	5
184	379	21
185	377	3
186	382	11
195	386	12
203	398	21
209	400	11
217	406	12
225	412	6
233	419	11
244	445	12
250	452	21
259	470	1
268	11	7
277	48	7
284	70	1
289	100	7
295	135	1
304	184	1
308	198	7
312	532	1
322	492	1
328	25	7
354	154	7
359	164	7
363	208	7
379	324	22
387	336	2
400	350	1
408	362	6
416	356	22
422	374	1
430	384	7
437	392	6
444	397	11
453	403	7
459	416	2
471	434	6
491	481	1
500	498	1
509	528	6
516	147	7
539	489	1
545	521	7
549	514	1
555	41	7
560	116	7
568	329	8
577	342	18
585	350	7
594	363	14
602	373	14
610	367	13
618	385	1
625	397	1
633	400	1
638	427	11
650	437	1
666	491	2
676	398	1
679	411	1
686	424	9
702	536	7
707	324	6
720	347	13
730	361	10
738	369	8
741	357	3
756	388	16
760	400	15
764	422	16
770	437	16
780	482	2
783	528	4
785	365	2
787	398	7
799	406	7
803	455	1
814	322	13
827	350	9
832	353	7
844	369	9
850	385	10
856	399	8
865	461	10
873	393	8
881	448	9
908	352	19
915	360	9
923	397	10
954	333	10
964	345	2
983	425	9
988	393	2
992	326	8
1002	352	14
1007	351	16
1016	445	2
1019	469	4
1037	364	16
1054	338	16
187	384	14
196	392	11
204	399	6
210	396	1
218	417	6
226	424	11
234	436	11
242	442	21
247	449	21
255	447	11
266	518	1
270	17	7
278	51	7
290	104	1
300	166	7
307	200	7
329	26	1
336	47	1
342	75	7
344	87	7
350	119	1
356	157	1
366	215	7
376	328	13
382	332	6
388	335	5
393	339	11
401	353	14
409	360	6
418	369	15
426	377	8
439	386	6
463	429	1
476	445	6
485	460	6
493	463	1
502	511	7
505	35	7
514	135	7
515	150	7
520	207	7
533	443	10
542	508	1
566	324	11
574	335	10
582	346	15
591	351	19
599	362	14
605	357	14
613	374	16
645	436	16
651	441	7
657	449	16
668	497	1
689	440	9
692	454	8
708	332	7
716	344	3
728	353	15
735	363	1
740	379	14
759	417	2
793	411	9
797	415	2
807	452	9
818	332	17
822	341	5
831	344	8
839	363	15
843	364	19
860	445	8
864	447	8
868	359	4
895	342	15
898	320	7
912	363	5
919	379	17
925	394	13
926	388	4
928	400	3
943	406	8
950	448	10
958	330	17
970	350	2
986	469	2
990	427	16
1005	363	8
1015	425	10
1017	457	10
1020	340	4
1023	427	8
1027	330	13
1034	363	9
1052	320	9
1063	427	9
1076	427	10
1084	358	2
1086	379	13
1096	400	13
1099	352	4
1100	352	13
1102	540	22
188	383	21
197	393	11
205	404	11
216	410	21
228	426	11
240	439	21
251	454	21
263	468	11
269	12	7
272	33	1
279	55	1
294	128	7
315	537	14
323	505	1
327	18	1
335	32	7
347	82	7
348	116	1
373	321	6
384	330	12
395	346	14
407	358	22
421	364	22
429	371	14
438	393	6
449	405	12
464	424	6
473	442	11
484	447	6
495	484	1
506	30	7
529	432	1
557	69	7
567	321	2
576	337	1
622	388	7
634	407	7
641	418	6
649	444	9
658	464	7
670	510	2
680	389	9
687	426	4
700	519	7
710	325	8
723	338	11
752	397	8
758	408	8
766	419	10
771	441	2
777	469	8
790	387	1
795	409	4
805	448	8
810	457	1
815	324	5
819	342	6
824	337	3
836	358	6
847	382	4
859	442	4
861	441	4
863	463	8
876	425	8
883	481	2
888	515	2
892	332	8
904	350	10
918	357	9
922	385	13
924	387	9
938	375	4
948	437	4
955	324	17
963	325	13
979	364	1
981	397	4
984	457	9
985	458	10
1006	362	2
1011	364	5
1029	353	10
1045	341	4
1053	352	15
1056	364	10
1091	538	3
189	370	15
206	401	11
215	414	21
223	423	16
232	433	11
239	435	11
253	457	21
265	503	1
301	167	1
338	62	1
346	89	7
362	180	7
364	204	7
372	318	11
380	329	3
397	338	22
411	357	6
424	367	4
436	385	6
445	390	8
454	411	6
460	420	8
467	419	1
477	444	8
494	473	2
521	380	14
524	415	1
540	488	1
541	493	1
547	519	1
551	14	7
552	47	7
556	79	7
563	323	8
572	333	14
579	341	6
587	347	2
593	354	5
608	379	19
614	391	7
623	370	8
660	460	7
669	501	1
672	520	1
678	380	1
685	425	1
694	462	2
696	485	2
704	318	3
727	351	14
736	373	1
742	377	13
754	404	9
761	405	16
773	467	2
820	320	15
829	352	11
842	373	15
855	408	10
869	375	2
877	418	7
899	337	8
909	358	14
920	364	14
945	427	7
956	332	9
989	406	9
995	342	7
1001	320	16
1018	458	2
1025	324	8
1028	333	13
1032	320	8
1035	338	17
1038	356	8
1043	332	13
1051	358	8
1061	400	9
1078	379	2
1083	324	4
1089	352	17
1101	539	22
190	388	21
199	394	11
207	402	11
214	411	11
221	416	8
230	429	6
237	438	21
246	448	11
252	455	21
262	475	2
280	52	1
285	74	1
293	123	1
297	147	1
302	158	7
305	195	7
326	507	7
332	28	7
340	61	7
349	111	1
360	160	7
367	206	7
377	322	5
385	333	6
398	352	22
413	365	3
427	375	3
441	387	11
452	407	1
468	433	6
483	454	11
489	461	6
496	482	7
527	413	2
543	495	2
554	62	7
583	343	2
598	348	4
606	364	18
617	375	17
626	401	1
639	428	1
656	453	2
684	415	7
690	448	16
713	342	19
719	346	4
726	359	17
733	362	1
745	381	2
751	395	2
757	403	2
772	431	4
781	508	2
798	425	16
812	326	15
817	333	8
830	338	19
840	356	14
849	368	4
852	394	4
862	460	8
870	398	2
875	406	16
884	457	8
886	497	2
897	330	3
903	340	3
907	338	15
914	362	8
917	369	10
931	458	9
937	359	13
941	411	2
946	455	8
953	326	3
957	342	5
960	320	17
967	338	5
982	400	17
1009	369	13
1041	418	2
1062	418	4
1067	342	16
1069	320	10
1081	352	3
1090	400	4
1103	541	22
1104	542	22
1105	543	22
1106	544	22
1107	545	22
1108	546	6
1109	547	18
1110	548	22
1111	549	22
1112	550	3
1113	551	21
1114	552	4
1115	553	22
1116	554	22
1117	555	22
1118	556	8
1119	557	18
1120	558	22
1121	559	18
1122	560	16
1123	561	1
1124	562	14
1125	563	1
1126	564	1
1127	565	13
1128	566	7
1129	567	22
1130	568	8
1131	569	3
1132	570	1
1133	571	11
1134	572	13
1135	573	3
1136	574	2
1137	575	3
1138	576	3
1139	577	22
1140	578	8
1141	579	13
1142	580	22
1143	581	8
1144	582	1
1145	583	3
1146	584	18
1147	585	14
1148	586	14
1149	587	10
1150	588	22
1151	589	8
1152	590	22
1153	591	6
1154	591	1
1155	591	15
1156	591	2
1157	592	17
1158	593	18
1159	594	21
1160	594	22
1161	595	21
1162	596	21
1163	597	1
1164	597	15
1165	597	3
1166	597	16
1167	598	3
1168	599	1
1169	600	8
1170	601	22
1171	602	21
1172	603	18
1173	604	22
1174	605	12
1175	606	11
1176	606	2
1177	607	8
1178	608	12
1179	608	3
1180	608	2
1181	608	13
1182	609	17
1183	610	1
1184	611	5
1185	612	2
1186	613	22
1187	614	16
1188	615	12
1189	615	3
1190	615	13
1191	616	13
1192	617	1
1193	618	7
1194	618	3
1195	618	17
1196	618	9
1197	618	10
1198	619	18
1199	620	18
1200	621	22
191	385	11
202	390	11
213	408	11
222	422	12
231	428	11
238	437	21
248	441	6
257	461	11
260	469	11
264	495	1
267	7	3
282	54	7
287	528	11
298	150	1
310	221	7
320	443	16
330	14	1
343	79	1
352	121	7
355	152	7
365	197	7
381	325	14
392	345	6
405	354	19
419	372	3
431	383	8
447	404	6
458	417	8
470	418	11
475	439	16
481	453	1
488	451	2
503	504	2
531	440	7
534	467	1
537	477	1
559	119	7
562	536	1
565	318	7
571	325	17
581	340	18
589	359	1
619	392	1
629	387	6
636	405	11
642	419	8
648	445	1
659	457	6
664	461	1
681	399	7
695	476	7
703	326	1
711	330	15
729	354	8
748	375	8
750	370	2
765	428	10
769	445	7
778	461	9
784	335	2
789	386	10
792	380	7
808	454	10
825	340	5
838	360	8
848	391	10
879	455	16
889	326	7
893	324	3
901	339	3
905	353	3
940	408	4
947	445	9
961	339	8
972	362	9
976	379	16
997	337	10
1003	338	3
1010	373	8
1013	400	16
1022	406	10
1024	326	9
1036	379	9
1042	455	4
1058	379	10
1066	324	10
1072	356	13
1088	320	4
192	391	11
200	395	6
211	407	6
220	420	11
236	430	21
249	446	1
261	463	11
273	30	1
292	107	7
306	207	1
318	413	1
321	496	2
331	19	7
341	73	7
357	162	7
361	193	7
371	229	7
374	323	7
386	337	6
394	341	11
402	347	9
410	361	6
434	388	11
446	402	6
456	406	6
462	422	6
482	455	12
486	457	11
492	469	6
498	499	1
519	184	7
523	399	1
526	426	2
536	479	1
544	515	1
575	320	6
590	338	18
592	353	1
600	356	18
607	372	8
621	394	10
627	402	1
632	396	13
643	434	8
647	439	8
654	455	11
663	481	7
673	528	8
675	386	7
683	420	9
693	432	7
697	479	7
699	493	7
701	505	2
705	329	2
717	340	19
724	345	1
731	360	17
737	376	4
747	385	9
753	402	16
763	434	9
776	463	16
779	501	7
782	517	2
788	383	2
791	393	7
796	424	10
801	435	10
821	325	10
833	354	10
845	357	8
853	388	8
866	469	9
867	335	13
872	411	10
878	427	1
885	479	2
887	521	2
911	349	8
927	402	10
929	432	10
933	493	2
942	393	10
949	464	2
951	447	4
968	352	6
977	373	17
991	455	10
994	332	10
996	333	2
999	339	10
1004	358	5
1014	418	10
1026	342	3
1031	358	7
1046	351	4
1047	326	10
1049	342	17
1059	373	10
1065	326	13
1068	358	9
1092	342	13
1094	352	8
193	381	3
201	397	21
212	403	6
224	418	21
241	432	6
254	451	8
275	43	1
288	94	7
296	126	7
325	517	1
339	69	1
351	115	7
369	222	7
375	326	6
383	334	13
391	340	22
399	349	14
406	348	5
414	355	4
420	376	1
428	378	7
435	382	6
442	398	12
450	396	7
466	427	12
472	435	6
480	452	11
487	472	1
499	500	1
508	52	7
510	77	7
513	123	7
518	167	7
525	409	10
530	448	1
535	476	1
546	512	7
550	26	7
569	322	3
573	330	1
580	344	7
588	352	18
595	360	3
603	369	3
611	378	8
616	382	7
628	404	1
653	452	6
665	469	16
671	506	7
674	383	9
698	489	7
712	320	14
718	337	7
725	349	3
734	356	19
743	368	8
755	401	8
767	436	10
774	460	16
804	430	10
813	329	4
837	349	17
854	402	8
880	437	2
890	333	9
896	325	2
906	344	2
916	373	7
930	488	2
939	399	9
962	341	10
969	358	1
974	351	17
993	324	16
1012	356	7
1030	337	2
1055	363	10
1060	406	2
1070	352	5
1080	320	2
194	387	21
208	405	21
219	415	6
227	425	11
235	434	11
245	444	6
256	460	12
271	15	7
276	46	1
281	58	7
286	77	1
291	101	1
299	161	1
303	178	7
309	199	7
313	235	7
314	535	1
319	431	9
324	512	1
333	527	1
337	65	1
368	218	7
378	320	12
389	342	22
403	351	11
415	366	10
423	368	18
433	381	8
443	370	3
451	408	6
457	410	8
465	428	6
478	449	11
501	506	1
512	101	7
532	431	10
538	468	4
548	505	7
553	65	7
558	111	7
564	326	14
570	332	1
584	349	1
597	358	18
604	376	7
612	377	10
620	371	2
630	408	1
637	429	8
644	433	1
655	465	2
661	447	1
667	463	7
682	406	1
691	456	2
709	333	7
715	341	1
721	350	8
739	364	11
746	382	10
749	394	2
762	427	6
800	418	1
802	440	10
806	459	2
809	432	8
816	318	2
826	339	1
835	361	2
841	362	7
851	397	9
871	420	2
874	422	9
882	454	4
894	318	13
902	345	8
913	356	1
921	391	2
932	461	2
934	469	10
936	354	13
965	340	10
973	349	10
978	356	5
987	399	2
998	330	10
1000	353	9
1033	352	1
1040	400	8
1048	324	9
1050	353	13
1064	341	13
1071	338	10
1075	400	10
1082	400	2
1093	320	13
1097	352	9
198	389	6
229	427	21
243	440	11
258	458	21
274	35	1
283	68	1
311	220	7
316	380	6
317	409	7
334	41	1
345	83	7
353	156	7
358	169	7
370	228	7
390	344	1
396	343	8
404	359	11
412	363	6
417	373	6
425	379	12
432	391	6
440	394	1
448	401	6
455	400	6
461	425	6
469	436	7
474	437	6
479	441	1
490	458	11
497	487	1
504	522	3
507	55	7
511	104	7
517	161	7
522	389	8
528	430	1
561	157	7
578	339	6
586	345	14
596	361	9
601	365	10
609	368	5
615	381	9
624	395	9
631	403	16
635	417	9
640	422	7
646	435	1
652	442	6
662	458	6
677	393	1
688	430	8
706	322	17
714	339	14
722	352	12
732	358	19
744	391	9
768	444	10
775	447	7
786	392	9
794	420	10
811	458	7
823	330	5
828	345	3
834	351	15
846	379	1
857	400	5
858	405	2
891	329	13
900	341	9
910	351	5
935	519	2
944	418	16
952	520	2
959	337	9
966	353	8
971	363	17
975	369	2
980	387	10
1008	379	8
1021	341	2
1039	373	9
1044	339	13
1057	356	4
1073	363	13
1074	373	13
1077	364	4
1079	342	8
1085	338	4
1087	427	2
1095	427	4
1098	352	10
1201	622	22
1202	623	1
1203	624	22
1204	625	22
1205	626	4
1206	627	22
1207	628	22
1208	629	8
1209	630	22
1210	631	22
1211	632	22
1212	633	8
1213	634	8
1214	635	4
1215	636	18
1216	637	20
1217	638	4
1218	639	22
1219	641	8
1220	642	22
1221	643	21
1222	643	20
1223	644	15
1224	645	11
1225	646	16
1226	646	8
1227	647	6
1228	649	4
1229	651	21
1230	652	20
1231	653	2
1232	654	13
1233	655	1
1234	656	22
1235	657	1
1236	657	2
1237	658	1
1238	659	21
1239	660	12
1240	661	22
1241	662	22
1242	663	1
1243	664	7
1244	665	2
1245	666	11
1246	667	18
1247	668	21
1248	668	4
1249	669	21
1250	669	4
1251	670	11
1252	670	17
1253	671	22
1254	671	4
1255	672	13
1256	673	22
1257	674	22
1258	675	14
1259	676	4
1260	677	18
1261	677	4
1262	678	13
1263	679	22
1264	680	1
1265	681	15
1266	682	3
1267	684	4
1268	685	13
1269	686	16
1270	688	12
1271	689	3
1272	691	7
1273	693	13
1274	694	16
1275	695	16
1276	696	11
1277	697	13
1278	698	1
1279	699	1
1280	700	13
1281	701	1
1282	702	1
1283	703	2
1284	704	1
1285	705	17
1286	706	1
1287	708	1
1288	710	13
1289	711	22
1290	711	4
1291	713	16
1292	715	13
1293	716	22
1294	717	22
1295	718	1
1296	719	15
1297	724	22
1298	725	22
1299	725	4
1300	728	22
1301	728	4
1302	729	4
1303	730	21
1304	731	21
1305	735	16
1306	737	6
1307	737	1
1308	737	10
1309	741	4
1310	742	22
1311	742	4
1312	743	22
1313	744	17
1314	747	3
1315	747	4
1316	749	22
1317	749	4
1318	751	22
1319	751	4
1320	752	22
1321	752	4
1322	753	21
1323	754	21
1324	754	4
1325	755	6
1326	755	2
1327	757	11
1328	757	2
1329	758	12
1330	760	5
1331	761	2
1332	762	14
1333	763	1
1334	764	21
1335	766	4
1336	767	5
1337	768	2
1338	769	22
1339	769	4
1340	770	21
1341	772	13
1342	773	16
1343	774	3
1344	775	13
1345	776	22
1346	780	21
1347	780	4
1348	781	21
1349	781	4
1350	782	13
1351	783	21
1352	783	22
1353	784	21
1354	784	4
1355	785	13
1356	787	21
1357	787	22
1358	787	1
1359	788	21
1360	788	22
1361	788	1
1362	789	21
1363	789	22
1364	789	1
1365	791	13
1366	792	13
1367	793	13
1368	796	21
1369	796	4
1370	799	22
1371	800	16
1372	802	6
1373	803	4
1374	804	13
1375	814	22
1376	814	4
1377	815	1
1378	818	7
1379	819	21
1380	819	4
1381	824	17
1382	827	7
1383	828	2
1384	829	21
1385	831	21
1386	831	22
1387	831	4
1388	834	1
1389	836	3
1390	837	1
1391	838	15
1392	838	17
1393	840	13
1394	841	22
1395	841	4
1396	842	13
1397	844	22
1398	844	4
1399	846	21
1400	853	22
1401	854	1
1402	856	4
1403	857	21
1404	858	21
1405	862	22
1406	862	4
1407	864	21
1408	866	21
1409	866	20
1410	868	22
1411	875	19
1412	879	3
1413	881	3
1414	881	13
1415	882	3
1416	882	13
1417	883	13
1418	884	2
1419	885	17
1420	886	2
1421	887	21
1422	888	21
1423	889	1
1424	890	3
1425	891	13
1426	892	14
1427	893	4
1428	894	4
1429	895	6
1430	895	1
1431	895	2
1432	897	13
1433	899	1
1434	900	8
1435	901	14
1436	903	14
1437	904	3
1438	904	13
1439	905	14
1440	906	1
1441	907	15
1442	907	17
1443	908	14
1444	909	8
1445	910	17
1446	912	17
1447	914	21
1448	915	17
1449	916	17
1450	918	21
1451	919	17
1452	920	13
1453	922	21
1454	923	1
1455	926	6
1456	926	1
1457	927	3
1458	927	17
1459	928	17
1460	930	1
1461	931	4
1462	932	1
1463	933	13
1464	934	17
1465	935	6
1466	936	3
1467	937	3
1468	938	1
1469	939	6
1470	940	6
1471	941	21
1472	941	6
1473	941	1
1474	943	13
1475	944	21
1476	945	2
1477	947	21
1478	948	21
1479	949	4
1480	950	14
1481	951	7
1482	952	4
1483	953	4
1484	954	21
1485	954	4
1486	955	4
1487	956	21
1488	957	21
1489	958	21
1490	959	21
1491	960	21
1492	961	21
1493	962	17
1494	963	21
1495	964	21
1496	965	21
1497	966	21
1498	967	21
1499	968	21
1500	969	6
1501	970	21
1502	971	21
1503	972	21
1504	973	21
1505	974	21
1506	974	1
1507	974	4
1508	976	4
1509	979	17
1510	980	7
1511	981	13
1512	982	3
1513	983	21
1514	984	21
1515	984	4
1516	985	21
1517	985	4
1518	986	4
1519	987	17
1520	989	4
1521	990	4
1522	991	4
1523	992	7
1524	993	4
1525	994	4
1526	995	6
1527	997	3
1528	998	4
1529	999	1
1530	1000	1
1531	1002	4
\.


--
-- Data for Name: profile_language; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profile_language (id, proficiency, profile_id, language_id) FROM stdin;
1	native	4	1540
2	fluent	4	5677
3	advanced	6	5677
4	fluent	9	2521
5	fluent	66	1833
6	fluent	130	1833
7	intermediate	250	345
9	native	316	620
8	fluent	315	1833
10	fluent	88	5677
11	fluent	102	1833
12	fluent	149	1833
13	native	187	1910
14	native	191	620
15	native	233	345
16	fluent	230	1833
17	native	239	1833
18	native	245	1833
19	fluent	243	1833
20	fluent	249	1833
21	intermediate	253	1833
22	fluent	262	1833
23	intermediate	2	1833
24	native	272	1833
25	native	278	1833
26	native	288	1833
27	intermediate	299	1833
28	fluent	301	1833
29	fluent	308	1833
30	fluent	21	1833
31	fluent	38	1833
32	fluent	9	1833
33	fluent	53	1833
34	fluent	66	1540
35	fluent	109	1833
36	fluent	136	1833
37	fluent	138	1833
38	fluent	159	1833
39	fluent	163	345
40	fluent	130	1540
41	intermediate	175	1833
42	fluent	176	1833
43	fluent	181	1833
44	fluent	183	1833
45	native	194	620
46	native	214	620
47	fluent	211	1833
48	fluent	237	1833
49	native	252	1833
50	fluent	259	1833
51	native	244	620
52	fluent	260	1833
53	fluent	250	1833
54	fluent	264	1833
55	fluent	268	1833
56	native	273	620
57	fluent	256	1833
58	native	266	1833
59	fluent	281	1833
60	native	261	620
61	fluent	285	1833
62	fluent	307	1833
63	native	310	1833
64	native	313	1954
65	fluent	315	6059
66	fluent	316	1833
67	fluent	486	1833
68	fluent	22	1833
69	fluent	72	1833
70	fluent	84	1833
71	fluent	85	1833
72	fluent	102	1540
73	fluent	95	1833
74	fluent	129	1540
75	fluent	153	1833
76	native	177	345
77	native	168	1833
78	fluent	186	1833
79	native	182	620
80	fluent	170	1833
81	fluent	165	345
82	native	179	620
83	fluent	191	1833
84	fluent	187	5677
85	native	201	620
86	fluent	205	1833
87	fluent	226	1833
88	native	227	1833
89	native	236	620
90	fluent	233	1833
91	fluent	230	1540
92	fluent	241	1833
93	fluent	247	1833
94	native	243	1540
95	native	248	620
96	native	254	620
97	native	240	1833
98	native	263	620
99	native	262	1540
100	native	265	620
101	native	2	6644
102	fluent	274	1833
103	native	277	345
104	fluent	292	1833
105	fluent	275	1833
106	native	293	1833
107	native	286	1833
108	native	299	1540
109	native	302	620
110	native	301	1540
111	native	306	620
112	fluent	308	1540
113	fluent	327	1833
114	fluent	423	1540
115	intermediate	438	1833
116	fluent	21	1540
117	fluent	38	1540
118	fluent	9	1540
119	fluent	78	5677
120	fluent	97	345
121	fluent	91	1833
122	fluent	90	1833
123	fluent	113	1833
124	fluent	112	345
125	fluent	131	1833
126	fluent	134	1833
127	fluent	136	1540
128	fluent	138	1910
129	intermediate	137	1833
130	fluent	140	1833
131	fluent	151	1833
132	fluent	143	1833
133	fluent	159	1540
134	fluent	126	1833
135	fluent	173	1833
136	fluent	155	1833
137	native	171	5677
138	fluent	130	5677
139	fluent	163	1540
140	intermediate	189	1833
141	fluent	172	1833
142	native	175	5677
143	fluent	174	1833
144	fluent	176	1540
145	native	181	5677
146	native	202	1833
147	fluent	185	1833
148	fluent	190	1833
149	native	216	345
150	native	210	345
151	fluent	213	1833
152	fluent	212	1833
153	fluent	225	1833
154	native	232	345
155	native	219	1833
156	native	214	1833
157	native	211	5677
158	fluent	258	1833
159	fluent	237	1540
160	native	251	345
161	native	259	1540
162	fluent	260	1540
163	fluent	276	1833
164	intermediate	250	1910
165	fluent	269	1833
166	native	273	1833
167	native	244	1833
168	native	255	1833
169	fluent	266	1540
170	native	281	1910
171	native	268	1910
172	native	279	1833
173	intermediate	283	345
174	native	287	1833
175	fluent	291	1833
176	fluent	271	1833
177	native	261	1833
178	native	285	6644
179	fluent	298	1833
180	fluent	296	1833
181	fluent	304	1833
182	fluent	313	1540
183	native	316	5677
184	fluent	478	1833
185	native	486	1954
186	fluent	24	1833
219	native	226	5677
232	native	277	1833
243	native	355	1833
251	fluent	16	1833
256	fluent	59	1540
297	intermediate	232	1833
306	fluent	250	1540
315	fluent	8	1833
319	fluent	15	1833
333	fluent	67	1833
353	native	193	1833
356	fluent	208	1833
361	native	218	1833
387	native	355	1540
399	native	513	6644
419	fluent	112	1540
425	native	189	5677
431	fluent	185	5677
434	fluent	198	1833
447	native	470	1954
452	fluent	8	1540
460	native	509	5677
463	fluent	24	6769
467	fluent	51	1540
473	fluent	70	5677
481	fluent	120	1833
488	fluent	121	1833
491	fluent	178	1540
497	intermediate	231	5677
499	native	242	5677
506	fluent	533	1540
517	native	416	2665
522	fluent	37	1540
523	fluent	57	1833
530	fluent	77	345
537	fluent	127	1540
556	native	472	1833
563	fluent	523	1540
574	fluent	54	1910
596	native	242	6769
604	native	368	1833
617	fluent	32	345
620	fluent	41	1833
627	fluent	146	1833
629	fluent	127	5677
662	fluent	69	1833
669	fluent	319	1540
675	fluent	368	1540
680	native	405	1540
681	native	431	7790
693	fluent	146	1540
710	fluent	489	1954
719	native	518	2665
722	fluent	69	1540
725	fluent	116	1910
750	fluent	520	1833
751	native	505	6644
754	fluent	514	1833
764	native	420	1833
770	native	459	345
772	native	456	620
782	fluent	512	1833
801	native	357	1833
826	fluent	402	1833
830	intermediate	399	1954
836	native	456	1833
842	native	512	6644
858	fluent	370	1833
861	native	394	1954
869	fluent	467	1540
873	native	474	1833
886	intermediate	402	1954
890	native	399	1540
894	fluent	459	1833
901	fluent	321	1833
904	native	343	7922
910	intermediate	385	1540
912	fluent	394	1540
926	fluent	514	6011
944	fluent	329	6011
948	fluent	318	1833
951	native	349	6011
957	native	392	620
964	native	497	1833
965	native	482	6011
973	native	408	6644
993	fluent	392	1833
1000	native	340	7922
1004	native	409	6769
1008	native	448	1910
1032	fluent	412	6148
1034	fluent	448	3151
1084	fluent	422	1540
1089	fluent	457	1833
1113	intermediate	341	1954
1117	native	333	5677
1118	intermediate	422	6011
1131	native	501	1540
1148	intermediate	338	1954
1154	fluent	338	1540
1169	intermediate	342	6011
187	fluent	42	6644
199	fluent	154	1833
201	fluent	158	1833
210	native	191	5677
222	fluent	242	1833
239	native	305	620
240	fluent	303	1833
259	fluent	74	1833
274	fluent	143	1910
280	native	173	5677
283	native	189	1540
299	native	246	1833
302	fluent	258	3151
313	fluent	478	1540
316	native	504	345
321	fluent	34	1833
335	fluent	96	1833
339	fluent	76	6769
344	fluent	120	345
348	fluent	124	1910
363	fluent	235	1833
371	fluent	267	1833
374	fluent	294	1833
376	fluent	289	1540
386	native	336	1833
396	fluent	27	1910
412	fluent	98	5677
423	fluent	143	1540
440	fluent	232	1540
448	native	478	6644
457	fluent	19	1833
474	fluent	67	1540
479	fluent	86	5677
510	native	336	1540
528	fluent	105	1833
540	fluent	150	345
550	intermediate	250	6769
566	fluent	518	1833
570	fluent	36	2388
584	fluent	122	6644
588	fluent	133	5677
602	native	331	1910
606	native	414	1540
612	fluent	483	1540
616	fluent	17	1540
638	native	428	1540
645	fluent	443	1833
648	native	490	7790
656	fluent	518	1540
660	fluent	30	1833
674	intermediate	378	1833
686	fluent	25	1540
688	fluent	32	1833
695	fluent	531	1833
701	native	429	620
713	native	487	1540
739	intermediate	404	1833
743	fluent	444	1833
775	native	500	1540
778	native	516	1833
822	fluent	340	618
844	fluent	111	1540
847	intermediate	345	7922
856	intermediate	367	1540
862	native	388	1833
876	fluent	511	1954
897	intermediate	447	1954
902	fluent	353	1833
945	intermediate	321	1540
956	fluent	397	1833
961	intermediate	440	1954
975	native	409	5677
978	native	453	1833
982	fluent	326	1833
994	native	387	1540
1012	intermediate	325	1540
1020	native	392	6148
1044	fluent	337	1833
1045	native	383	5351
1049	native	397	2665
1056	native	339	1540
1081	native	330	1540
1082	native	337	3151
1085	fluent	363	1833
1090	advanced	538	1910
1097	native	488	345
1101	intermediate	333	2366
1107	fluent	455	1833
1112	fluent	379	7922
1124	native	519	345
1125	native	341	1540
1132	advanced	538	1540
1134	native	338	7790
1135	fluent	341	2665
1142	fluent	338	1833
1156	fluent	391	6011
1158	intermediate	418	6011
1161	native	324	6011
1170	advanced	539	5677
188	fluent	40	1833
198	fluent	145	1833
208	fluent	179	1833
211	fluent	201	1833
215	fluent	217	1833
227	fluent	254	1833
241	native	306	1833
257	fluent	81	5677
268	fluent	114	1833
273	fluent	140	1540
290	native	198	345
300	fluent	219	1540
307	intermediate	268	5677
324	fluent	44	1833
331	fluent	60	1833
336	fluent	86	1833
341	fluent	122	1833
349	fluent	145	1540
354	native	195	345
377	fluent	300	1833
382	native	533	1910
402	fluent	46	1833
414	fluent	529	1910
418	fluent	114	6644
424	fluent	169	1910
429	native	204	620
445	fluent	421	1833
459	fluent	34	1540
471	fluent	60	1540
475	fluent	93	1833
486	fluent	144	1910
500	native	280	1540
529	fluent	92	1540
532	fluent	104	1833
534	fluent	100	1833
536	fluent	128	1833
547	native	207	1540
549	fluent	228	1833
567	fluent	28	1833
571	fluent	527	1833
583	fluent	86	6769
587	fluent	124	5677
592	fluent	147	1833
594	native	224	6644
595	native	238	5677
597	native	294	5677
599	native	319	1954
610	fluent	446	1833
614	fluent	496	1833
637	native	365	345
639	native	430	1540
654	native	523	6644
671	native	334	1540
685	native	496	1910
690	fluent	75	6644
692	fluent	105	6644
699	native	390	1540
715	native	495	345
740	native	419	1910
753	fluent	496	2388
780	fluent	468	6011
785	fluent	47	5677
789	native	329	1833
793	fluent	343	1833
798	intermediate	376	1833
805	native	407	620
810	fluent	432	1833
815	native	520	1954
818	fluent	517	1833
820	native	528	345
821	fluent	531	5677
828	native	433	620
831	fluent	389	1540
837	fluent	500	6011
852	fluent	349	1833
879	fluent	528	1833
887	intermediate	420	6011
905	fluent	346	6819
907	intermediate	349	1540
914	native	411	1540
928	fluent	340	1833
930	native	359	6644
931	fluent	375	6644
935	intermediate	412	1954
940	fluent	439	1540
941	fluent	516	6011
950	fluent	356	1833
954	native	370	5351
962	native	432	2665
983	native	321	2665
987	fluent	318	1954
992	intermediate	397	1954
998	native	497	1954
1006	native	437	1910
1010	native	326	1540
1013	native	318	1540
1019	fluent	397	1540
1043	native	325	6011
1048	fluent	381	6011
1051	native	400	1540
1077	native	464	1833
1092	fluent	358	1833
1099	native	361	1540
1111	native	358	1540
1147	native	324	1833
1168	intermediate	342	5677
189	fluent	13	1833
195	fluent	118	1833
197	fluent	124	1833
206	fluent	165	1833
216	fluent	223	1833
224	fluent	243	6011
230	fluent	263	1833
264	fluent	529	1833
265	fluent	115	1833
271	native	131	1954
279	native	171	6769
293	native	213	1540
310	fluent	283	1833
312	fluent	537	1833
320	fluent	522	1833
342	fluent	85	6769
360	fluent	199	1833
370	fluent	238	1833
380	native	534	1833
383	native	319	345
397	fluent	37	1833
404	fluent	57	345
409	fluent	89	1540
413	fluent	107	1833
417	fluent	127	1833
428	native	200	1833
437	native	221	5677
446	native	465	345
453	fluent	524	345
456	fluent	11	1540
461	fluent	36	1833
494	native	197	6644
507	fluent	327	7922
518	native	446	7790
520	fluent	17	1833
526	fluent	61	1833
554	native	421	5677
569	fluent	58	1910
575	fluent	64	1833
579	fluent	67	5677
585	fluent	101	1540
601	fluent	334	1833
615	fluent	14	1833
621	fluent	75	1833
623	fluent	105	1540
625	fluent	104	5677
630	fluent	142	1833
636	intermediate	390	1954
641	native	450	620
650	fluent	494	1954
664	fluent	65	6769
665	fluent	93	5677
667	fluent	148	1540
677	native	404	345
684	fluent	505	1833
691	fluent	87	6644
698	native	386	1833
700	intermediate	365	1833
732	native	372	1833
752	fluent	14	1540
767	fluent	389	1833
783	native	506	6011
797	intermediate	344	1540
799	intermediate	382	1954
803	native	374	1833
808	native	466	620
809	native	467	1833
814	intermediate	477	5677
829	native	420	1540
838	fluent	447	1833
849	native	346	1910
851	fluent	376	1540
854	native	382	1540
863	fluent	411	1833
865	fluent	407	1833
868	fluent	462	1954
881	native	359	1540
885	native	433	1833
925	native	517	1540
968	fluent	351	1833
971	native	402	6011
976	native	435	6011
999	native	364	1540
1026	fluent	340	5677
1029	fluent	335	6011
1035	fluent	481	1833
1040	fluent	321	6011
1042	intermediate	318	6011
1046	fluent	369	1833
1052	native	497	2665
1057	fluent	398	1833
1068	native	403	620
1088	native	455	345
1093	native	332	1540
1095	native	341	1833
1096	fluent	425	1540
1103	intermediate	422	2665
1121	fluent	455	1540
1137	native	391	620
1155	native	352	5677
1160	native	395	1540
1167	native	342	1540
190	fluent	72	1540
196	fluent	84	1910
225	native	247	1540
235	native	293	1540
250	fluent	10	1833
261	fluent	9	5677
270	fluent	139	1833
282	fluent	188	1833
286	fluent	196	1833
292	fluent	221	1833
309	native	291	6644
332	fluent	70	1833
368	fluent	231	1540
373	intermediate	280	1954
381	fluent	323	1833
384	native	327	1540
416	fluent	132	1833
420	fluent	131	1540
426	native	172	6769
433	native	196	1910
438	native	222	1540
441	native	258	6644
449	native	502	1954
450	native	492	1833
465	fluent	39	1540
482	fluent	125	1540
490	fluent	167	1833
493	native	195	1833
504	native	323	6644
512	native	366	1910
539	fluent	530	1833
558	native	443	620
589	fluent	144	1540
593	fluent	167	1540
605	intermediate	377	1540
624	fluent	73	1833
647	fluent	489	1833
661	fluent	79	1833
706	native	443	7922
714	fluent	468	1540
718	fluent	28	5677
721	native	30	5351
731	fluent	346	1833
733	fluent	344	1833
738	native	371	1910
741	native	442	1833
746	native	460	1833
762	intermediate	390	6011
765	intermediate	365	1540
769	intermediate	413	1833
777	native	451	1540
796	intermediate	360	1540
802	intermediate	394	1833
824	fluent	354	1540
825	fluent	375	1833
832	fluent	413	1540
859	intermediate	357	1540
875	fluent	477	6059
878	native	514	2665
880	fluent	340	1230
906	native	362	1954
913	fluent	388	1954
915	native	424	1540
924	native	511	6011
929	fluent	335	1833
937	native	426	1910
958	fluent	387	1833
960	fluent	462	2665
967	intermediate	340	1540
995	fluent	401	1833
1062	native	330	1833
1066	native	422	1833
1070	advanced	538	2521
1078	fluent	521	1833
1091	native	469	345
1122	native	457	1540
1130	native	418	1833
1138	native	417	6148
1144	intermediate	341	7922
1146	intermediate	418	2665
191	fluent	76	5677
203	fluent	164	1833
214	native	205	1540
220	fluent	231	1833
226	native	248	1833
231	fluent	280	1833
249	fluent	27	1833
263	fluent	82	345
272	fluent	138	1540
288	fluent	216	1833
296	intermediate	206	1833
305	native	269	1540
308	native	279	6644
325	native	527	345
347	fluent	144	1833
351	native	162	5677
355	fluent	180	1833
359	native	201	6644
365	native	217	5677
392	native	446	620
394	fluent	7	1540
403	fluent	49	1910
407	fluent	92	1833
411	fluent	117	1833
430	fluent	207	1833
442	native	251	1833
443	intermediate	250	5677
444	intermediate	537	5677
454	native	504	620
470	fluent	71	1833
477	fluent	94	345
484	fluent	133	1833
505	native	319	1833
513	native	384	6011
515	fluent	414	1833
541	fluent	161	1833
544	intermediate	189	6769
546	native	204	1833
565	native	11	2665
577	fluent	65	5677
609	intermediate	416	6011
613	fluent	25	1833
619	fluent	68	6644
631	fluent	530	1540
642	native	421	6769
649	fluent	487	1833
668	fluent	147	1540
679	fluent	410	1833
687	fluent	14	1954
704	intermediate	472	2665
711	native	490	1833
717	native	18	1954
729	native	329	345
735	native	376	345
736	fluent	382	1833
749	native	477	1833
766	fluent	399	1833
774	native	485	2665
788	fluent	157	1540
806	fluent	442	1540
833	fluent	429	1833
835	fluent	454	1833
850	fluent	362	1833
853	fluent	360	5351
857	fluent	385	1833
871	fluent	452	1833
882	intermediate	354	5677
899	fluent	490	6011
903	native	318	345
908	native	367	6644
932	fluent	415	1833
947	fluent	350	1833
969	intermediate	335	1954
972	fluent	412	1540
984	intermediate	353	7922
990	fluent	381	1540
1001	fluent	351	1540
1005	intermediate	380	1540
1015	native	356	1910
1039	native	320	1833
1047	intermediate	373	1540
1050	fluent	401	6011
1053	advanced	538	345
1067	intermediate	397	6011
1072	fluent	479	1540
1074	intermediate	339	5677
1086	native	406	1833
1106	native	403	1833
1110	fluent	469	1833
1114	native	425	7922
1115	native	488	1833
1128	intermediate	333	6769
1136	fluent	458	1540
1140	advanced	538	5677
1143	fluent	352	1833
1150	fluent	341	6011
1153	intermediate	324	1540
1162	native	445	620
1166	native	445	7922
192	fluent	99	1833
204	fluent	153	1540
213	native	224	345
218	native	229	620
252	fluent	513	1833
255	fluent	48	345
262	fluent	90	1540
269	fluent	134	1540
285	fluent	174	1540
291	native	190	5677
303	native	251	620
311	fluent	295	1833
314	fluent	502	1833
326	fluent	509	1540
329	fluent	45	345
340	fluent	103	1833
358	fluent	197	1833
369	fluent	242	1540
372	fluent	257	1833
385	intermediate	331	1833
388	intermediate	366	1540
391	fluent	416	1833
398	fluent	10	1540
408	fluent	74	1540
436	native	228	345
439	native	206	1910
462	fluent	58	1833
466	fluent	45	1833
489	fluent	147	345
495	fluent	218	1540
496	native	224	5677
498	fluent	238	1540
501	intermediate	257	6769
503	native	297	1540
516	intermediate	396	1954
531	fluent	117	1540
535	fluent	132	1910
543	fluent	184	1833
548	fluent	185	6769
553	fluent	430	1833
562	intermediate	504	1833
581	fluent	94	1833
586	fluent	135	1833
591	native	148	1910
600	fluent	328	1540
607	native	396	1540
608	fluent	405	1833
611	native	473	1833
622	fluent	87	1833
628	fluent	128	1540
634	native	184	6644
635	native	536	620
643	fluent	472	1954
651	native	468	1833
658	fluent	26	1540
666	fluent	116	1833
683	native	498	1954
689	fluent	62	1833
697	fluent	354	1833
702	native	413	345
709	native	500	1833
712	fluent	516	345
723	fluent	79	1540
727	native	322	1540
744	fluent	431	1833
758	fluent	531	1540
761	fluent	386	1540
763	fluent	409	1833
771	fluent	449	1833
790	fluent	322	5677
791	native	347	1540
812	fluent	431	1540
813	intermediate	460	1954
819	fluent	514	1954
823	fluent	359	1833
834	native	459	620
841	native	510	6894
845	fluent	157	6644
846	native	329	1954
848	intermediate	343	1540
860	intermediate	374	1540
864	fluent	424	1833
867	native	466	1910
877	fluent	517	1954
884	fluent	409	1540
888	fluent	412	1833
891	native	435	620
909	fluent	381	1833
918	fluent	440	1833
938	fluent	435	1833
952	native	385	7922
974	native	380	1833
979	native	439	6011
981	native	508	1540
985	native	350	6011
989	fluent	356	1540
997	native	440	1540
1024	native	441	620
1031	native	398	620
1055	fluent	479	1833
1058	intermediate	464	7790
1063	native	337	1540
1073	intermediate	332	1833
1079	intermediate	361	1954
1083	native	369	5677
1098	native	521	1954
1105	native	434	1833
1109	advanced	538	1954
1119	native	417	1833
1120	native	501	1833
1127	intermediate	425	5677
1139	fluent	418	1954
1141	native	519	1954
1163	fluent	342	1833
1164	native	445	1833
1172	advanced	540	6011
1175	advanced	541	6011
1176	advanced	542	5677
1177	advanced	543	5677
1178	advanced	544	5677
1179	advanced	545	6644
1180	advanced	546	345
1181	advanced	546	1833
1182	advanced	546	1540
1183	advanced	546	1910
1184	advanced	546	6644
1185	advanced	547	5677
1186	advanced	547	6769
1187	advanced	548	5641
1188	advanced	548	5677
1189	advanced	549	5677
1190	advanced	550	345
1191	advanced	550	1833
1192	advanced	550	1954
1193	advanced	550	2854
1194	advanced	550	1540
1195	advanced	550	1910
1196	advanced	550	5677
1197	advanced	550	6644
1198	advanced	550	6769
1199	advanced	550	6894
1200	advanced	551	6011
1201	advanced	552	1540
1202	advanced	552	3151
1203	advanced	552	6644
1204	advanced	553	5677
1205	advanced	554	5677
1206	advanced	555	5677
1207	advanced	555	6769
1208	advanced	556	345
1209	advanced	556	1833
1210	advanced	556	1954
1211	advanced	556	1540
1212	advanced	556	5677
1213	advanced	556	6644
1214	advanced	557	1833
1215	advanced	558	2854
1216	advanced	559	3348
1217	advanced	560	1833
1218	advanced	560	1540
1219	advanced	560	5677
1220	advanced	561	1833
1221	advanced	561	1540
1222	advanced	561	6644
1223	advanced	562	345
1224	advanced	562	2854
1225	advanced	562	1540
1226	advanced	562	1910
1227	advanced	562	5677
1228	advanced	563	1833
1229	advanced	563	1954
1230	advanced	563	1540
1231	advanced	563	5677
1232	advanced	563	6644
1233	advanced	564	345
1234	advanced	564	1540
1235	advanced	564	5677
1236	advanced	564	6644
1237	advanced	565	1540
1238	advanced	566	345
1239	advanced	566	1833
1240	advanced	566	1954
1241	advanced	566	1540
1242	advanced	566	5677
1243	advanced	567	2854
193	fluent	103	345
205	fluent	177	1833
207	native	192	1910
212	native	199	620
217	fluent	234	1833
233	fluent	284	1833
236	native	289	1833
238	fluent	302	1833
247	native	475	1833
253	fluent	29	1540
260	fluent	89	1833
267	fluent	112	1833
277	fluent	126	1540
284	native	172	5677
289	native	210	620
298	fluent	222	1833
317	fluent	11	1833
322	fluent	33	1833
328	fluent	39	1833
337	fluent	108	1833
345	fluent	125	345
350	fluent	178	1833
357	native	186	5677
367	native	234	1540
379	native	303	5677
390	fluent	396	1833
393	fluent	12	1833
401	fluent	43	1833
427	native	188	1540
432	fluent	215	1833
458	native	522	1540
468	fluent	54	1833
472	fluent	50	1833
478	fluent	106	1833
485	fluent	124	1540
487	fluent	148	1833
502	fluent	294	1540
509	fluent	331	1540
511	fluent	355	6011
524	fluent	35	1833
527	fluent	73	345
533	fluent	107	6644
551	fluent	390	1833
552	fluent	428	1833
557	fluent	471	1833
560	fluent	525	1833
568	fluent	26	1833
573	fluent	52	1910
582	fluent	106	1540
626	fluent	132	1540
632	fluent	150	1833
655	fluent	18	1833
670	fluent	322	1833
682	fluent	463	1833
707	fluent	485	1833
730	fluent	345	1833
742	intermediate	410	1954
748	native	484	1833
756	fluent	62	1910
757	fluent	146	6644
759	native	536	2665
768	native	429	7790
787	fluent	116	6644
792	native	345	1540
795	fluent	372	1540
840	fluent	490	1540
870	intermediate	440	4698
889	native	408	620
893	native	389	2366
896	native	454	1540
919	native	462	1540
922	native	452	1540
934	fluent	409	5351
946	native	353	1540
949	intermediate	343	6011
963	intermediate	452	2665
966	fluent	364	1833
977	fluent	437	1833
980	fluent	448	1833
986	fluent	325	1833
988	fluent	383	1833
1003	native	412	7922
1011	intermediate	321	5677
1016	fluent	383	1540
1025	fluent	339	1833
1054	fluent	441	1833
1059	native	481	6644
1061	fluent	361	1833
1065	native	373	6011
1069	native	457	345
1075	native	398	7922
1076	fluent	425	1833
1108	intermediate	457	1954
1123	advanced	538	2854
1149	fluent	352	1540
1159	fluent	324	7922
194	fluent	85	5677
209	fluent	186	1540
221	native	532	1833
228	fluent	270	1833
258	fluent	78	6769
266	fluent	113	6644
276	fluent	159	5677
281	fluent	169	1833
294	native	212	5677
301	native	211	6769
304	native	276	6644
323	native	36	620
330	fluent	51	1833
334	fluent	80	1833
338	fluent	110	1833
346	fluent	84	1540
362	native	224	1910
364	native	223	1910
375	fluent	297	1833
389	fluent	384	1833
395	fluent	31	1833
400	fluent	16	1540
405	fluent	48	1833
410	fluent	83	1833
415	fluent	100	345
421	fluent	139	1540
455	fluent	20	1540
483	fluent	101	1833
514	native	377	1833
525	fluent	68	1833
538	fluent	123	1833
555	native	465	620
564	fluent	20	5677
572	fluent	55	1910
576	fluent	51	5677
590	fluent	119	1833
598	fluent	327	6059
618	fluent	63	1910
633	fluent	161	1540
646	fluent	451	1833
653	native	525	5677
663	fluent	51	6769
672	native	344	345
673	native	348	1540
708	intermediate	451	1954
716	fluent	506	1833
724	fluent	111	345
728	fluent	319	6011
737	native	378	1540
745	native	463	1540
760	native	354	2854
779	native	490	1954
784	intermediate	518	6644
794	intermediate	346	1540
807	native	410	1540
816	native	511	1833
827	native	409	1833
839	fluent	516	1954
843	fluent	47	6769
866	fluent	436	1833
872	intermediate	432	1954
900	fluent	329	1540
911	fluent	370	1540
916	native	407	7922
917	fluent	436	1540
921	fluent	432	1540
923	fluent	474	1540
933	fluent	402	1540
943	fluent	508	1833
959	native	436	5677
991	intermediate	388	6011
1002	native	335	1540
1007	native	453	1540
1014	intermediate	337	7790
1017	native	373	1833
1021	native	401	1540
1022	native	497	1540
1023	native	479	345
1028	native	351	6011
1030	native	393	1833
1033	native	464	620
1037	native	493	1833
1041	native	361	345
1071	native	441	5677
1080	fluent	333	1833
1104	native	363	2388
1129	native	417	1910
1145	native	391	1833
1151	intermediate	391	1954
1152	fluent	418	5677
1171	native	427	345
1173	intermediate	427	1833
1174	fluent	427	1540
200	fluent	156	1833
202	fluent	162	1833
223	fluent	236	1833
229	fluent	265	1833
234	native	290	1833
237	native	300	620
242	fluent	327	1954
244	native	366	1833
245	native	423	5677
246	native	438	1540
248	fluent	7	1833
254	fluent	56	1833
275	fluent	152	345
278	fluent	155	1540
287	fluent	185	1540
295	native	225	6644
318	fluent	20	1833
327	fluent	24	5677
343	fluent	99	6644
352	fluent	160	1833
366	native	229	1833
378	native	305	1833
406	fluent	23	1833
422	fluent	152	1833
435	fluent	220	1833
451	fluent	523	1833
464	native	527	620
469	fluent	64	345
476	fluent	96	1910
480	fluent	122	1540
492	fluent	160	1540
508	native	328	1833
519	fluent	483	1833
521	native	27	5677
542	fluent	139	5677
545	native	200	1540
559	native	494	1833
561	fluent	524	1833
578	fluent	71	1540
580	fluent	93	1540
603	fluent	348	345
640	native	465	1833
644	intermediate	471	1954
652	fluent	524	1540
657	fluent	28	1910
659	fluent	36	6819
676	intermediate	371	1833
678	fluent	419	1833
694	fluent	150	1540
696	fluent	536	1833
703	native	450	1833
705	native	471	1540
720	fluent	47	1833
726	fluent	157	1833
734	native	360	1833
747	native	515	1833
755	fluent	25	6644
773	native	471	5677
776	native	489	2665
781	fluent	510	1833
786	fluent	111	1833
800	fluent	367	1833
804	fluent	404	1540
811	native	444	1540
817	fluent	496	6819
855	intermediate	372	6819
874	fluent	460	1540
883	native	375	1540
892	fluent	426	1833
895	fluent	439	1833
898	fluent	516	1540
920	intermediate	467	6011
927	native	507	1833
936	fluent	408	1833
939	native	437	620
942	native	447	1540
953	intermediate	381	1954
955	fluent	388	1540
970	native	415	6819
996	native	436	6769
1009	native	491	1910
1018	native	381	2665
1027	native	364	5677
1036	native	491	1540
1038	fluent	326	6011
1060	intermediate	521	345
1064	intermediate	369	1540
1087	intermediate	403	7790
1094	native	379	1833
1100	intermediate	330	2665
1102	native	369	6769
1116	native	521	1540
1126	native	458	1833
1133	fluent	519	1833
1157	fluent	395	1833
1165	intermediate	342	1954
1244	advanced	568	345
1245	advanced	568	1540
1246	advanced	568	1910
1247	advanced	568	5677
1248	advanced	568	6644
1249	advanced	569	1540
1250	advanced	570	345
1251	advanced	570	1833
1252	advanced	570	1540
1253	advanced	570	1910
1254	advanced	570	5677
1255	advanced	570	6644
1256	advanced	571	1833
1257	advanced	571	1540
1258	advanced	571	1910
1259	advanced	572	1833
1260	advanced	572	1540
1261	advanced	572	1910
1262	advanced	573	345
1263	advanced	573	1540
1264	advanced	574	1833
1265	advanced	574	1540
1266	advanced	574	1910
1267	advanced	575	1540
1268	advanced	576	5677
1269	advanced	576	6769
1270	advanced	577	3348
1271	advanced	578	1833
1272	advanced	578	1540
1273	advanced	579	1540
1274	advanced	580	5677
1275	advanced	581	345
1276	advanced	581	1833
1277	advanced	581	1540
1278	advanced	581	1910
1279	advanced	581	5677
1280	advanced	581	6644
1281	advanced	582	345
1282	advanced	582	2521
1283	advanced	582	2854
1284	advanced	582	1540
1285	advanced	583	345
1286	advanced	583	1833
1287	advanced	583	2854
1288	advanced	583	1540
1289	advanced	583	5444
1290	advanced	583	1910
1291	advanced	583	5677
1292	advanced	583	6644
1293	advanced	584	5677
1294	advanced	584	6769
1295	advanced	585	1833
1296	advanced	585	1540
1297	advanced	586	1833
1298	advanced	586	1540
1299	advanced	587	1540
1300	advanced	588	1910
1301	advanced	589	345
1302	advanced	589	1540
1303	advanced	589	7922
1304	advanced	589	1910
1305	advanced	589	5677
1306	advanced	589	6644
1307	advanced	589	6769
1308	advanced	590	1910
1309	advanced	591	345
1310	advanced	591	1540
1311	advanced	591	1910
1312	advanced	591	5677
1313	advanced	592	1910
1314	advanced	593	1910
1315	advanced	594	5641
1316	advanced	594	5677
1317	advanced	595	2854
1318	advanced	595	5677
1319	advanced	597	345
1320	advanced	597	1954
1321	advanced	597	1540
1322	advanced	597	1910
1323	advanced	597	6644
1324	advanced	597	6769
1325	advanced	598	1540
1326	advanced	599	345
1327	advanced	599	1833
1328	advanced	599	1954
1329	advanced	599	1540
1330	advanced	599	1910
1331	advanced	599	5677
1332	advanced	599	6644
1333	advanced	599	6769
1334	advanced	600	345
1335	advanced	600	1833
1336	advanced	600	1540
1337	advanced	600	1910
1338	advanced	600	6644
1339	advanced	601	3151
1340	advanced	601	6644
1341	advanced	602	2854
1342	advanced	602	5677
1343	advanced	603	5677
1344	advanced	603	6769
1345	advanced	604	5677
1346	advanced	604	6769
1347	advanced	606	1540
1348	advanced	606	5677
1349	advanced	606	6769
1350	advanced	607	345
1351	advanced	607	1833
1352	advanced	607	1540
1353	advanced	607	3151
1354	advanced	607	1910
1355	advanced	607	5677
1356	advanced	607	6644
1357	advanced	608	345
1358	advanced	608	1833
1359	advanced	608	1954
1360	advanced	608	1540
1361	advanced	608	1910
1362	advanced	608	5677
1363	advanced	608	6644
1364	advanced	609	345
1365	advanced	609	1954
1366	advanced	609	1540
1367	advanced	609	1910
1368	advanced	609	5677
1369	advanced	609	6644
1370	advanced	609	6769
1371	advanced	610	345
1372	advanced	610	1540
1373	advanced	610	1910
1374	advanced	610	5677
1375	advanced	610	6644
1376	advanced	611	345
1377	advanced	611	2521
1378	advanced	611	1910
1379	advanced	611	1954
1380	advanced	611	2854
1381	advanced	611	1540
1382	advanced	611	5677
1383	advanced	612	1833
1384	advanced	612	1540
1385	advanced	612	5677
1386	advanced	613	5677
1387	advanced	613	6769
1388	advanced	614	1540
1389	advanced	615	1833
1390	advanced	615	7922
1391	advanced	616	1540
1392	advanced	617	1833
1393	advanced	617	1540
1394	advanced	617	5677
1395	advanced	617	6644
1396	advanced	617	6769
1397	advanced	618	345
1398	advanced	618	1540
1399	advanced	618	3151
1400	advanced	618	1910
1401	advanced	618	5677
1402	advanced	618	6059
1403	advanced	618	6644
1404	advanced	619	5677
1405	advanced	619	6769
1406	advanced	620	5677
1407	advanced	620	6769
1408	advanced	621	5677
1409	advanced	622	5677
1410	advanced	623	5392
1411	advanced	623	1833
1412	advanced	623	1540
1413	advanced	623	6644
1414	advanced	624	5677
1415	advanced	624	6769
1416	advanced	625	5677
1417	advanced	626	1833
1418	advanced	626	2854
1419	advanced	626	1540
1420	advanced	627	345
1421	advanced	628	5677
1422	advanced	628	6769
1423	advanced	629	1833
1424	advanced	629	1954
1425	advanced	629	1540
1426	advanced	630	6644
1427	advanced	631	1910
1428	advanced	632	5677
1429	advanced	632	6769
1430	advanced	633	345
1431	advanced	633	1833
1432	advanced	633	1540
1433	advanced	633	1910
1434	advanced	634	345
1435	advanced	634	1833
1436	advanced	634	1540
1437	advanced	634	1910
1438	advanced	635	1833
1439	advanced	635	1540
1440	advanced	635	6011
1441	advanced	636	5677
1442	advanced	637	6769
1443	advanced	638	2521
1444	advanced	639	5677
1445	advanced	640	345
1446	advanced	640	1954
1447	advanced	640	1910
1448	advanced	640	5677
1449	advanced	640	6644
1450	advanced	641	345
1451	advanced	641	1833
1452	advanced	641	1540
1453	advanced	641	1910
1454	advanced	641	6644
1455	advanced	642	5677
1456	advanced	643	5677
1457	advanced	643	6769
1458	advanced	644	345
1459	advanced	644	1833
1460	advanced	644	1540
1461	advanced	644	1910
1462	advanced	644	5351
1463	advanced	644	6011
1464	advanced	645	1540
1465	advanced	645	6644
1466	advanced	646	1540
1467	advanced	647	1833
1468	advanced	647	1540
1469	advanced	647	6644
1470	advanced	649	1954
1471	advanced	650	5677
1472	advanced	651	1833
1473	advanced	651	1954
1474	advanced	652	5677
1475	advanced	652	6769
1476	advanced	653	345
1477	advanced	653	1833
1478	advanced	653	1540
1479	advanced	653	1910
1480	advanced	653	5351
1481	advanced	653	6011
1482	advanced	654	345
1483	advanced	654	2854
1484	advanced	654	1540
1485	advanced	654	1910
1486	advanced	654	6644
1487	advanced	654	6894
1488	advanced	655	1833
1489	advanced	655	1540
1490	advanced	656	5677
1491	advanced	657	1540
1492	advanced	658	1540
1493	advanced	659	1954
1494	advanced	660	345
1495	advanced	660	1833
1496	advanced	660	1540
1497	advanced	660	1910
1498	advanced	660	5677
1499	advanced	660	6644
1500	advanced	661	1954
1501	advanced	662	6644
1502	advanced	663	345
1503	advanced	663	1833
1504	advanced	663	1540
1505	advanced	663	5677
1506	advanced	663	6644
1507	advanced	664	345
1508	advanced	664	1540
1509	advanced	664	1910
1510	advanced	664	6644
1511	advanced	665	345
1512	advanced	665	1540
1513	advanced	665	1910
1514	advanced	666	345
1515	advanced	666	5392
1516	advanced	666	1910
1517	advanced	666	1954
1518	advanced	666	3348
1519	advanced	666	5677
1520	advanced	666	6644
1521	advanced	667	1910
1522	advanced	668	5677
1523	advanced	669	7922
1524	advanced	670	345
1525	advanced	671	5677
1526	advanced	671	6769
1527	advanced	672	1540
1528	advanced	673	1954
1529	advanced	674	2521
1530	advanced	675	345
1531	advanced	675	1833
1532	advanced	675	1540
1533	advanced	675	1910
1534	advanced	675	6644
1535	advanced	676	2854
1536	advanced	676	5677
1537	advanced	677	1910
1538	advanced	678	1540
1539	advanced	678	6644
1540	advanced	679	5677
1541	advanced	679	6769
1542	advanced	680	1833
1543	advanced	680	1540
1544	advanced	680	7922
1545	advanced	680	5677
1546	advanced	680	6644
1547	advanced	681	345
1548	advanced	681	1833
1549	advanced	681	1910
1550	advanced	681	6644
1551	advanced	682	1540
1552	advanced	682	5677
1553	advanced	682	6769
1554	advanced	683	1910
1555	advanced	684	5677
1556	advanced	684	6769
1557	advanced	685	1540
1558	advanced	686	1540
1559	advanced	687	345
1560	advanced	688	345
1561	advanced	688	1540
1562	advanced	688	1910
1563	advanced	688	6644
1564	advanced	689	1540
1565	advanced	691	345
1566	advanced	691	1833
1567	advanced	691	1540
1568	advanced	691	1910
1569	advanced	691	6644
1570	advanced	692	5677
1571	advanced	693	1540
1572	advanced	694	345
1573	advanced	694	1833
1574	advanced	694	1540
1575	advanced	694	1910
1576	advanced	695	1833
1577	advanced	695	1540
1578	advanced	695	1910
1579	advanced	696	345
1580	advanced	696	1540
1581	advanced	696	1910
1582	advanced	697	345
1583	advanced	697	1954
1584	advanced	697	2854
1585	advanced	697	1540
1586	advanced	697	6644
1587	advanced	698	5392
1588	advanced	698	5641
1589	advanced	698	5677
1590	advanced	698	6644
1591	advanced	699	345
1592	advanced	699	5392
1593	advanced	699	6644
1594	advanced	700	5677
1595	advanced	700	6769
1596	advanced	701	5677
1597	advanced	701	6769
1598	advanced	703	345
1599	advanced	703	5392
1600	advanced	703	1833
1601	advanced	703	1540
1602	advanced	703	7922
1603	advanced	703	5677
1604	advanced	703	6644
1605	advanced	704	345
1606	advanced	704	1833
1607	advanced	704	1540
1608	advanced	704	7922
1609	advanced	704	1910
1610	advanced	704	5677
1611	advanced	705	1540
1612	advanced	706	345
1613	advanced	706	5392
1614	advanced	706	1833
1615	advanced	706	1910
1616	advanced	706	1954
1617	advanced	706	1540
1618	advanced	706	7922
1619	advanced	706	6644
1620	advanced	707	345
1621	advanced	707	1540
1622	advanced	708	1833
1623	advanced	708	1540
1624	advanced	709	5642
1625	advanced	709	5641
1626	advanced	710	1540
1627	advanced	711	1910
1628	advanced	712	345
1629	advanced	712	3348
1630	advanced	713	345
1631	advanced	713	1540
1632	advanced	713	1910
1633	advanced	713	5677
1634	advanced	713	6644
1635	advanced	713	6769
1636	advanced	714	5677
1637	advanced	714	6769
1638	advanced	715	1540
1639	advanced	715	5677
1640	advanced	715	6769
1641	advanced	716	1954
1642	advanced	717	5677
1643	advanced	717	6769
1644	advanced	718	1540
1645	advanced	718	5677
1646	advanced	718	6769
1647	advanced	719	1540
1648	advanced	719	5677
1649	advanced	719	6769
1650	advanced	721	5677
1651	advanced	722	5677
1652	advanced	723	1910
1653	advanced	724	5677
1654	advanced	725	1910
1655	advanced	726	1910
1656	advanced	727	5677
1657	advanced	727	6769
1658	advanced	728	5677
1659	advanced	728	6769
1660	advanced	729	5677
1661	advanced	730	1833
1662	advanced	730	1910
1663	advanced	731	5641
1664	advanced	731	5677
1665	advanced	732	1910
1666	advanced	733	5677
1667	advanced	735	345
1668	advanced	735	1833
1669	advanced	735	1540
1670	advanced	735	1910
1671	advanced	735	5677
1672	advanced	735	6644
1673	advanced	736	345
1674	advanced	737	345
1675	advanced	737	1540
1676	advanced	737	1910
1677	advanced	737	5677
1678	advanced	737	6644
1679	advanced	738	6059
1680	advanced	739	1540
1681	advanced	741	7922
1682	advanced	741	1910
1683	advanced	741	6644
1684	advanced	742	6644
1685	advanced	743	6644
1686	advanced	744	1540
1687	advanced	745	5392
1688	advanced	745	1910
1689	advanced	746	5677
1690	advanced	747	5642
1691	advanced	747	5677
1692	advanced	748	5392
1693	advanced	748	1910
1694	advanced	749	6644
1695	advanced	750	345
1696	advanced	751	5392
1697	advanced	751	1910
1698	advanced	752	6644
1699	advanced	753	1910
1700	advanced	754	5677
1701	advanced	755	1833
1702	advanced	755	1540
1703	advanced	756	1540
1704	advanced	757	345
1705	advanced	757	1540
1706	advanced	757	1910
1707	advanced	758	1833
1708	advanced	758	1540
1709	advanced	758	1910
1710	advanced	759	5677
1711	advanced	760	345
1712	advanced	760	1833
1713	advanced	760	1954
1714	advanced	760	1540
1715	advanced	760	1910
1716	advanced	760	5677
1717	advanced	760	6644
1718	advanced	761	345
1719	advanced	761	1833
1720	advanced	761	1954
1721	advanced	761	1540
1722	advanced	761	1910
1723	advanced	761	5677
1724	advanced	761	6644
1725	advanced	762	1833
1726	advanced	762	1540
1727	advanced	762	5677
1728	advanced	762	6769
1729	advanced	763	345
1730	advanced	763	1833
1731	advanced	763	1540
1732	advanced	763	1910
1733	advanced	763	5677
1734	advanced	763	6644
1735	advanced	764	345
1736	advanced	764	1833
1737	advanced	766	3348
1738	advanced	766	6644
1739	advanced	767	345
1740	advanced	767	5392
1741	advanced	767	1910
1742	advanced	767	2854
1743	advanced	767	1540
1744	advanced	767	5677
1745	advanced	767	6644
1746	advanced	768	345
1747	advanced	768	1833
1748	advanced	768	1540
1749	advanced	768	7922
1750	advanced	768	1910
1751	advanced	768	6644
1752	advanced	769	6644
1753	advanced	770	2854
1754	advanced	771	345
1755	advanced	772	345
1756	advanced	772	1833
1757	advanced	772	1954
1758	advanced	772	2854
1759	advanced	772	1540
1760	advanced	772	3348
1761	advanced	772	1910
1762	advanced	772	5677
1763	advanced	772	6644
1764	advanced	772	6769
1765	advanced	772	6894
1766	advanced	773	345
1767	advanced	773	1833
1768	advanced	773	1954
1769	advanced	773	1540
1770	advanced	773	1910
1771	advanced	773	5677
1772	advanced	773	6644
1773	advanced	773	6769
1774	advanced	774	1540
1775	advanced	774	5677
1776	advanced	775	1540
1777	advanced	775	5677
1778	advanced	776	1910
1779	advanced	777	5392
1780	advanced	777	1540
1781	advanced	778	5677
1782	advanced	778	6769
1783	advanced	779	5677
1784	advanced	779	6644
1785	advanced	780	1910
1786	advanced	781	5392
1787	advanced	782	1540
1788	advanced	783	5677
1789	advanced	784	1910
1790	advanced	785	5677
1791	advanced	785	6769
1792	advanced	786	5677
1793	advanced	787	3348
1794	advanced	787	6644
1795	advanced	788	3348
1796	advanced	788	6644
1797	advanced	789	3348
1798	advanced	789	6644
1799	advanced	792	1540
1800	advanced	793	345
1801	advanced	793	1540
1802	advanced	793	1910
1803	advanced	794	5392
1804	advanced	794	1910
1805	advanced	795	1954
1806	advanced	796	345
1807	advanced	797	5677
1808	advanced	797	6769
1809	advanced	798	345
1810	advanced	798	5392
1811	advanced	798	1540
1812	advanced	798	1910
1813	advanced	798	5677
1814	advanced	798	6644
1815	advanced	799	6644
1816	advanced	800	345
1817	advanced	800	1833
1818	advanced	800	1954
1819	advanced	800	1540
1820	advanced	800	6644
1821	advanced	801	5677
1822	advanced	801	6769
1823	advanced	802	5392
1824	advanced	802	1954
1825	advanced	802	2854
1826	advanced	802	6644
1827	advanced	803	5392
1828	advanced	803	1540
1829	advanced	803	1910
1830	advanced	804	1540
1831	advanced	805	345
1832	advanced	805	1540
1833	advanced	805	1910
1834	advanced	805	6644
1835	advanced	806	345
1836	advanced	806	1540
1837	advanced	806	1910
1838	advanced	806	6644
1839	advanced	807	345
1840	advanced	807	1540
1841	advanced	807	1910
1842	advanced	807	5677
1843	advanced	807	6644
1844	advanced	808	6644
1845	advanced	809	5677
1846	advanced	810	345
1847	advanced	810	1540
1848	advanced	810	1910
1849	advanced	810	6644
1850	advanced	811	1540
1851	advanced	812	345
1852	advanced	812	1540
1853	advanced	812	1910
1854	advanced	812	6644
1855	advanced	813	345
1856	advanced	814	6644
1857	advanced	815	345
1858	advanced	815	1833
1859	advanced	815	1540
1860	advanced	815	6644
1861	advanced	816	1540
1862	advanced	817	1954
1863	advanced	818	1833
1864	advanced	818	1540
1865	advanced	819	345
1866	advanced	819	7922
1867	advanced	820	345
1868	advanced	820	1833
1869	advanced	820	1540
1870	advanced	820	1910
1871	advanced	820	6644
1872	advanced	821	345
1873	advanced	822	5677
1874	advanced	823	6644
1875	advanced	824	345
1876	advanced	824	5392
1877	advanced	824	1833
1878	advanced	824	1910
1879	advanced	824	2854
1880	advanced	824	6011
1881	advanced	824	6644
1882	advanced	825	1910
1883	advanced	827	1833
1884	advanced	827	1540
1885	advanced	828	345
1886	advanced	828	5392
1887	advanced	828	1910
1888	advanced	828	6644
1889	advanced	829	345
1890	advanced	829	5392
1891	advanced	829	6644
1892	advanced	830	2521
1893	advanced	830	5677
1894	advanced	831	2521
1895	advanced	831	5677
1896	advanced	832	5677
1897	advanced	833	5392
1898	advanced	833	1910
1899	advanced	833	6644
1900	advanced	835	345
1901	advanced	835	1540
1902	advanced	835	1910
1903	advanced	835	6644
1904	advanced	836	345
1905	advanced	836	5392
1906	advanced	836	1910
1907	advanced	836	1540
1908	advanced	836	6644
1909	advanced	837	345
1910	advanced	837	1540
1911	advanced	837	7922
1912	advanced	838	345
1913	advanced	838	1833
1914	advanced	838	1540
1915	advanced	838	1910
1916	advanced	838	6644
1917	advanced	839	5677
1918	advanced	840	1540
1919	advanced	840	3348
1920	advanced	840	5677
1921	advanced	841	5392
1922	advanced	841	1910
1923	advanced	842	1540
1924	advanced	843	1954
1925	advanced	844	5642
1926	advanced	844	5677
1927	advanced	845	5677
1928	advanced	845	6769
1929	advanced	847	5677
1930	advanced	849	5677
1931	advanced	850	345
1932	advanced	851	6644
1933	advanced	852	5392
1934	advanced	852	1910
1935	advanced	853	5392
1936	advanced	853	1910
1937	advanced	853	6644
1938	advanced	854	345
1939	advanced	854	1833
1940	advanced	854	1540
1941	advanced	854	7922
1942	advanced	854	1910
1943	advanced	855	345
1944	advanced	856	3348
1945	advanced	856	6644
1946	advanced	857	6644
1947	advanced	858	5677
1948	advanced	859	5677
1949	advanced	860	3348
1950	advanced	860	6644
1951	advanced	861	5642
1952	advanced	861	5677
1953	advanced	862	1833
1954	advanced	863	5677
1955	advanced	863	6769
1956	advanced	864	5642
1957	advanced	864	5677
1958	advanced	865	2521
1959	advanced	865	5677
1960	advanced	866	5392
1961	advanced	866	1910
1962	advanced	867	5677
1963	advanced	868	2521
1964	advanced	868	5677
1965	advanced	869	2521
1966	advanced	869	5677
1967	advanced	870	2521
1968	advanced	870	5677
1969	advanced	871	2521
1970	advanced	871	5677
1971	advanced	872	5677
1972	advanced	873	5677
1973	advanced	874	5677
1974	advanced	875	1954
1975	advanced	876	345
1976	advanced	877	5392
1977	advanced	877	1910
1978	advanced	878	2521
1979	advanced	878	5677
1980	advanced	879	1540
1981	advanced	880	345
1982	advanced	880	5392
1983	advanced	880	1910
1984	advanced	880	5677
1985	advanced	880	6644
1986	advanced	881	345
1987	advanced	881	5392
1988	advanced	881	1910
1989	advanced	881	5677
1990	advanced	881	6644
1991	advanced	882	345
1992	advanced	882	5392
1993	advanced	882	1910
1994	advanced	882	5677
1995	advanced	882	6644
1996	advanced	883	345
1997	advanced	884	345
1998	advanced	884	1833
1999	advanced	884	1540
2000	advanced	884	7922
2001	advanced	884	5677
2002	advanced	885	5392
2003	advanced	885	1910
2004	advanced	885	1540
2005	advanced	885	7922
2006	advanced	885	6644
2007	advanced	886	7922
2008	advanced	887	7922
2009	advanced	888	7922
2010	advanced	891	1540
2011	advanced	891	6644
2012	advanced	893	1954
2013	advanced	893	1540
2014	advanced	894	5392
2015	advanced	894	1910
2016	advanced	894	1954
2017	advanced	894	6644
2018	advanced	895	345
2019	advanced	895	1540
2020	advanced	895	7922
2021	advanced	895	1910
2022	advanced	895	5677
2023	advanced	895	6644
2024	advanced	896	1540
2025	advanced	897	7922
2026	advanced	897	1540
2027	advanced	898	1910
2028	advanced	899	7922
2029	advanced	899	5677
2030	advanced	900	7922
2031	advanced	901	1833
2032	advanced	901	1540
2033	advanced	902	7922
2034	advanced	902	1833
2035	advanced	902	1540
2036	advanced	903	1833
2037	advanced	903	1540
2038	advanced	903	7922
2039	advanced	904	1540
2040	advanced	905	1833
2041	advanced	905	1540
2042	advanced	905	7922
2043	advanced	906	7922
2044	advanced	907	345
2045	advanced	907	1833
2046	advanced	907	1910
2047	advanced	907	1540
2048	advanced	908	7922
2049	advanced	908	1833
2050	advanced	908	1540
2051	advanced	908	7922
2052	advanced	909	1833
2053	advanced	909	1540
2054	advanced	909	7922
2055	advanced	910	1540
2056	advanced	911	1833
2057	advanced	911	1540
2058	advanced	912	345
2059	advanced	912	2854
2060	advanced	912	1540
2061	advanced	912	5677
2062	advanced	912	6644
2063	advanced	913	1833
2064	advanced	913	1540
2065	advanced	914	1833
2066	advanced	914	1540
2067	advanced	914	6644
2068	advanced	915	345
2069	advanced	915	5392
2070	advanced	915	1833
2071	advanced	915	1910
2072	advanced	915	1540
2073	advanced	915	5677
2074	advanced	915	6644
2075	advanced	916	345
2076	advanced	916	1540
2077	advanced	917	1833
2078	advanced	917	1540
2079	advanced	918	1540
2080	advanced	919	345
2081	advanced	919	1833
2082	advanced	919	1540
2083	advanced	920	1540
2084	advanced	920	5677
2085	advanced	920	6769
2086	advanced	921	1833
2087	advanced	921	1540
2088	advanced	922	1833
2089	advanced	922	1540
2090	advanced	923	345
2091	advanced	923	1833
2092	advanced	923	1540
2093	advanced	923	7922
2094	advanced	923	1910
2095	advanced	923	5677
2096	advanced	924	345
2097	advanced	924	1833
2098	advanced	924	1540
2099	advanced	924	6644
2100	advanced	925	1833
2101	advanced	925	1540
2102	advanced	927	345
2103	advanced	927	1540
2104	advanced	927	1910
2105	advanced	927	6644
2106	advanced	928	345
2107	advanced	928	1540
2108	advanced	928	1910
2109	advanced	928	6644
2110	advanced	929	345
2111	advanced	929	1833
2112	advanced	929	1540
2113	advanced	929	1910
2114	advanced	929	6644
2115	advanced	930	345
2116	advanced	930	1833
2117	advanced	930	2854
2118	advanced	930	1540
2119	advanced	930	7922
2120	advanced	930	1910
2121	advanced	930	5677
2122	advanced	931	5392
2123	advanced	931	1540
2124	advanced	931	1910
2125	advanced	932	7922
2126	advanced	933	5392
2127	advanced	933	1540
2128	advanced	933	1910
2129	advanced	934	345
2130	advanced	934	1540
2131	advanced	934	1910
2132	advanced	934	5677
2133	advanced	935	345
2134	advanced	935	1833
2135	advanced	935	1540
2136	advanced	935	1910
2137	advanced	935	5677
2138	advanced	936	1540
2139	advanced	937	1540
2140	advanced	938	345
2141	advanced	938	1540
2142	advanced	938	7922
2143	advanced	938	1910
2144	advanced	939	1833
2145	advanced	939	1540
2146	advanced	939	1910
2147	advanced	940	345
2148	advanced	940	1833
2149	advanced	940	2854
2150	advanced	940	1540
2151	advanced	940	1910
2152	advanced	940	6644
2153	advanced	941	345
2154	advanced	941	1833
2155	advanced	941	1540
2156	advanced	941	7922
2157	advanced	941	1910
2158	advanced	941	5677
2159	advanced	941	6769
2160	advanced	942	345
2161	advanced	942	1833
2162	advanced	942	1540
2163	advanced	942	7922
2164	advanced	942	1910
2165	advanced	942	5677
2166	advanced	943	1540
2167	advanced	943	6644
2168	advanced	944	1954
2169	advanced	944	1540
2170	advanced	946	1833
2171	advanced	946	1540
2172	advanced	947	1540
2173	advanced	947	5677
2174	advanced	948	1540
2175	advanced	948	5677
2176	advanced	949	1540
2177	advanced	949	5677
2178	advanced	952	345
2179	advanced	952	1540
2180	advanced	952	6644
2181	advanced	953	6894
2182	advanced	954	1540
2183	advanced	954	5677
2184	advanced	955	5392
2185	advanced	955	1910
2186	advanced	956	1910
2187	advanced	957	1540
2188	advanced	957	5677
2189	advanced	958	1540
2190	advanced	958	5677
2191	advanced	959	1540
2192	advanced	959	5677
2193	advanced	960	1540
2194	advanced	960	5677
2195	advanced	961	1833
2196	advanced	961	1540
2197	advanced	962	1833
2198	advanced	962	1540
2199	advanced	963	1833
2200	advanced	963	1540
2201	advanced	964	1833
2202	advanced	964	1540
2203	advanced	964	1910
2204	advanced	965	1540
2205	advanced	965	6644
2206	advanced	966	1540
2207	advanced	966	5677
2208	advanced	967	1833
2209	advanced	967	1540
2210	advanced	967	5677
2211	advanced	968	1540
2212	advanced	968	1910
2213	advanced	969	1833
2214	advanced	969	1540
2215	advanced	970	1540
2216	advanced	970	5677
2217	advanced	971	1833
2218	advanced	971	1540
2219	advanced	971	3348
2220	advanced	971	6644
2221	advanced	972	2854
2222	advanced	972	1540
2223	advanced	972	5677
2224	advanced	973	345
2225	advanced	973	1833
2226	advanced	973	1540
2227	advanced	973	1910
2228	advanced	973	5677
2229	advanced	973	6644
2230	advanced	974	1833
2231	advanced	974	1954
2232	advanced	974	1540
2233	advanced	975	1833
2234	advanced	975	1540
2235	advanced	976	1954
2236	advanced	976	1540
2237	advanced	977	1833
2238	advanced	977	1540
2239	advanced	978	345
2240	advanced	978	1540
2241	advanced	978	1910
2242	advanced	978	5677
2243	advanced	979	345
2244	advanced	979	1540
2245	advanced	980	1540
2246	advanced	981	345
2247	advanced	981	1540
2248	advanced	981	1910
2249	advanced	981	5677
2250	advanced	981	6644
2251	advanced	982	1540
2252	advanced	983	345
2253	advanced	983	1954
2254	advanced	983	1540
2255	advanced	983	1910
2256	advanced	983	5677
2257	advanced	984	345
2258	advanced	984	1833
2259	advanced	984	2854
2260	advanced	984	1540
2261	advanced	984	1910
2262	advanced	984	5677
2263	advanced	985	345
2264	advanced	985	2854
2265	advanced	985	1540
2266	advanced	985	1910
2267	advanced	985	5677
2268	advanced	985	6644
2269	advanced	986	1540
2270	advanced	986	1910
2271	advanced	987	1833
2272	advanced	987	1954
2273	advanced	987	1540
2274	advanced	988	1540
2275	advanced	988	6644
2276	advanced	989	345
2277	advanced	989	2854
2278	advanced	989	1910
2279	advanced	989	5677
2280	advanced	989	6011
2281	advanced	990	5641
2282	advanced	991	1833
2283	advanced	991	1540
2284	advanced	991	6644
2285	advanced	993	2854
2286	advanced	993	1910
2287	advanced	993	6059
2288	advanced	993	6644
2289	advanced	994	2854
2290	advanced	994	1540
2291	advanced	994	6644
2292	advanced	997	1540
2293	advanced	997	1910
2294	advanced	997	6644
2295	advanced	998	1954
2296	advanced	998	5444
2297	advanced	1000	345
2298	advanced	1000	1540
2299	advanced	1000	1910
2300	advanced	1000	5677
2301	advanced	1001	1833
2302	advanced	1001	1540
2303	advanced	1002	1833
2304	advanced	1002	1540
2305	advanced	1002	1910
2306	advanced	1002	5677
\.


--
-- Data for Name: profile_skill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profile_skill (id, profile_id, skill_id) FROM stdin;
1	421	22
2	450	2
3	509	7
4	534	30
5	533	7
6	319	2
7	331	18
8	446	18
9	475	1
10	483	3
11	513	5
12	535	7
13	537	8
14	412	30
15	421	8
16	450	31
17	470	25
18	518	26
19	509	9
20	533	8
21	534	8
22	319	3
23	328	10
24	331	33
25	334	30
26	336	7
27	384	8
28	414	11
29	410	15
30	416	20
31	466	14
32	446	8
33	480	7
34	494	30
35	473	7
36	483	16
37	496	14
38	503	14
39	531	14
40	535	5
41	390	7
42	412	14
43	413	25
44	421	20
45	443	7
46	450	3
47	472	24
48	471	21
49	470	9
50	451	7
51	490	25
52	484	13
53	468	30
54	499	24
55	492	7
56	525	25
57	495	23
58	523	33
59	518	8
60	328	8
61	321	24
62	334	21
63	343	19
64	348	29
65	372	7
66	367	29
67	378	7
68	374	19
69	371	7
70	414	8
71	407	14
72	410	19
73	466	2
74	474	24
75	480	31
76	477	16
77	483	17
78	500	19
79	473	2
80	516	19
81	511	19
82	496	26
83	514	14
84	531	2
85	390	8
86	389	25
87	429	7
88	433	14
89	412	2
90	413	30
91	426	30
92	439	7
93	456	30
94	449	21
95	453	7
96	462	24
97	450	4
98	443	29
99	472	8
100	471	9
101	451	21
102	491	7
103	494	26
104	490	24
105	487	7
106	468	26
107	484	7
108	510	23
109	495	21
110	525	9
111	512	19
112	507	7
113	518	20
114	503	26
115	334	26
116	321	11
117	343	21
118	346	7
119	347	30
120	376	7
121	372	6
122	348	10
123	367	31
124	381	30
125	378	21
126	371	28
127	374	29
128	395	23
129	370	24
130	404	2
131	403	23
132	407	2
133	417	23
134	434	7
135	419	29
136	410	29
137	436	7
138	466	18
139	431	7
140	444	14
141	467	7
142	474	21
143	485	7
144	480	3
145	477	10
146	473	21
147	498	9
148	482	7
149	511	5
150	505	7
151	496	16
152	517	13
153	514	21
154	528	2
155	531	3
156	365	9
157	380	25
158	409	7
159	433	3
160	429	5
161	415	23
162	389	22
163	412	29
164	426	7
165	413	7
166	435	29
167	439	24
168	459	25
169	456	22
170	449	16
171	453	2
172	450	17
173	451	20
174	491	24
175	487	8
176	500	9
177	490	28
178	484	14
179	468	28
180	516	26
181	506	7
182	510	25
183	495	22
184	512	2
185	507	19
186	322	8
189	343	16
196	382	7
213	440	32
234	528	5
241	433	16
247	429	4
251	459	30
255	481	25
275	376	4
287	401	24
302	432	19
308	479	23
329	420	10
337	439	16
343	453	3
346	488	23
349	447	11
353	510	32
368	370	10
396	461	10
403	359	8
407	402	8
411	393	23
415	435	8
419	464	7
424	501	14
431	318	11
441	383	26
445	392	18
449	411	5
464	479	7
466	482	3
475	412	8
481	464	2
485	501	2
494	330	30
509	401	16
527	351	29
531	415	8
532	380	4
552	369	21
554	397	8
565	445	30
571	441	9
580	351	16
589	448	8
600	361	10
604	373	7
607	395	21
630	488	16
633	491	20
637	361	8
640	369	4
649	434	9
657	469	26
672	488	9
680	391	5
698	324	7
715	476	32
749	469	8
751	342	19
755	379	22
776	417	20
780	519	20
789	445	28
797	445	3
818	427	29
826	427	18
187	321	5
188	347	22
190	346	18
195	381	29
199	371	20
214	442	19
223	460	11
236	335	19
239	409	11
262	495	3
270	343	27
273	372	1
280	385	7
285	394	8
292	407	3
303	444	3
310	461	11
320	514	20
334	380	2
363	381	16
367	367	33
375	388	32
381	422	25
389	441	2
393	474	8
395	479	25
406	398	21
409	433	17
416	476	2
420	454	20
427	491	5
434	350	14
452	401	3
478	435	20
483	453	4
511	422	2
514	434	18
520	479	21
535	437	20
556	392	16
563	418	7
568	455	25
587	458	2
592	521	22
598	337	3
617	455	22
629	458	11
634	493	8
642	391	31
647	418	2
650	417	28
666	393	20
683	406	7
685	418	21
691	501	3
705	488	10
718	418	28
733	425	3
735	488	8
738	391	3
761	476	20
770	324	26
778	445	26
782	324	28
785	391	8
809	342	32
810	395	20
816	342	8
825	427	12
836	427	4
841	427	20
191	361	23
193	376	5
202	370	29
207	424	2
218	441	7
224	474	10
228	498	10
238	398	15
244	389	31
253	453	5
259	500	10
265	512	11
266	329	8
271	346	4
284	370	9
299	434	2
311	508	30
315	477	20
331	415	14
336	435	10
338	476	14
344	454	19
347	456	8
354	519	23
372	391	15
385	440	8
428	447	5
432	321	4
433	325	7
470	335	10
474	415	9
484	448	29
491	521	2
499	325	26
515	455	23
524	507	17
540	481	16
566	434	3
570	501	5
579	341	7
582	398	6
613	445	7
625	393	8
632	521	3
638	337	4
653	501	28
667	398	8
671	481	20
676	330	8
693	538	8
697	358	11
701	341	10
708	330	20
728	324	19
736	333	8
737	363	20
760	395	32
768	519	8
800	352	10
840	427	1
192	372	8
205	404	3
208	407	5
211	410	32
220	444	2
225	480	16
232	517	31
246	426	29
254	454	15
268	321	3
282	391	23
290	424	5
296	442	5
314	484	1
321	528	3
327	408	7
345	448	30
374	392	29
387	466	8
410	415	3
423	488	25
430	519	30
437	349	28
438	369	7
443	391	7
461	441	11
469	507	6
495	333	15
503	383	9
506	392	3
525	332	11
529	398	11
541	491	3
558	395	29
573	479	9
576	482	4
583	380	8
588	488	26
599	325	8
602	369	18
635	333	21
636	330	10
639	363	29
644	422	12
654	455	26
660	358	7
662	338	7
670	458	28
678	363	26
681	422	3
704	458	3
711	422	20
744	434	8
747	445	21
750	519	26
753	324	29
771	338	26
772	458	17
777	418	8
779	501	17
781	342	14
784	458	20
787	427	30
792	338	20
803	445	16
808	445	9
817	445	20
835	427	27
194	367	5
209	417	25
222	467	14
237	386	11
257	485	18
267	318	23
279	382	28
291	403	25
297	440	33
309	497	14
318	517	33
325	375	21
332	389	9
351	521	30
355	318	30
361	350	7
366	383	29
379	401	2
388	452	22
400	517	1
404	335	16
412	412	3
417	437	8
451	403	24
454	436	20
458	440	20
462	474	20
468	469	14
472	408	8
479	425	7
482	439	17
490	508	32
492	519	7
504	397	26
510	403	2
512	476	11
521	461	8
523	469	2
548	337	2
560	401	10
574	461	20
603	383	8
606	422	11
614	434	16
618	501	18
684	403	8
700	338	2
721	445	29
730	332	1
743	418	3
759	391	16
764	434	20
788	418	20
798	342	11
813	342	10
822	427	11
824	427	5
833	427	10
197	378	20
201	374	9
216	466	3
219	431	8
231	505	6
248	435	16
260	521	25
274	360	9
277	381	21
281	383	24
286	374	10
294	417	30
298	466	16
304	462	10
317	511	4
319	507	11
328	409	8
333	412	26
340	464	25
356	321	10
359	325	15
369	387	7
378	424	16
384	417	7
394	497	4
426	508	21
435	362	7
442	370	8
447	395	19
456	445	23
459	462	20
465	461	33
476	380	3
496	321	20
500	361	18
501	369	14
526	339	14
528	335	17
534	464	16
539	488	31
543	521	21
550	325	9
561	406	23
575	469	29
585	464	6
595	326	7
596	333	24
605	391	11
608	401	8
611	476	18
615	417	26
624	341	24
626	398	33
645	406	30
646	403	3
655	441	8
661	332	4
663	339	16
686	476	16
689	457	18
695	519	22
706	521	20
720	457	8
724	469	10
726	342	7
729	338	29
739	395	26
773	391	4
796	427	7
819	342	20
831	427	32
834	427	6
842	550	10
843	556	18
844	556	3
845	560	6
846	562	26
847	563	3
848	563	32
849	563	8
850	565	8
851	566	11
852	566	12
853	568	18
854	571	8
855	573	8
856	574	24
857	574	21
858	574	22
859	575	8
860	597	15
861	597	13
862	597	5
863	597	6
864	597	4
865	597	1
866	599	2
867	599	5
868	599	4
869	600	18
870	605	23
871	605	7
872	605	2
873	605	21
874	605	22
875	605	3
876	606	20
877	610	23
878	610	25
879	610	24
880	610	2
881	610	22
882	610	3
883	611	30
884	615	8
885	618	25
886	618	7
887	618	2
888	618	11
889	618	3
890	653	23
891	653	21
892	665	23
893	675	26
894	691	11
895	695	4
896	696	20
897	707	10
898	710	8
899	713	31
900	713	32
901	713	33
902	718	2
903	718	3
904	739	8
905	740	8
906	741	28
907	755	24
908	755	14
909	755	2
910	755	21
911	755	22
912	755	3
913	755	33
914	755	20
915	757	20
916	760	29
917	760	22
918	761	29
919	761	22
920	790	7
921	805	23
922	805	21
923	805	20
924	807	21
925	807	20
198	383	7
212	436	11
217	452	7
229	482	2
258	491	2
263	506	24
276	357	16
293	422	23
295	436	5
322	359	7
348	481	7
358	343	20
362	349	30
365	385	16
370	374	8
376	395	7
380	403	7
386	434	21
398	482	11
413	380	5
429	521	7
440	385	17
444	397	29
448	388	8
453	424	4
457	434	11
463	497	33
480	437	17
493	318	9
507	387	3
516	417	29
537	448	26
547	330	26
567	457	7
578	339	2
597	330	28
609	406	25
616	457	14
620	479	8
621	469	18
622	332	6
627	425	29
641	373	8
648	476	3
652	457	29
659	324	30
665	341	21
668	425	21
673	521	16
709	363	8
713	406	29
714	427	23
765	417	8
766	445	11
786	395	10
790	342	29
801	395	8
814	427	2
200	392	24
203	401	7
210	419	8
215	434	14
221	462	21
226	508	23
230	511	16
240	420	21
243	415	7
250	439	28
261	516	8
269	347	26
272	361	24
289	395	30
301	441	14
307	460	16
312	493	30
324	398	7
330	433	27
339	437	16
350	491	21
352	512	3
364	357	17
371	397	30
382	407	4
391	432	29
402	528	17
405	375	20
408	408	10
421	453	6
455	417	2
477	426	10
487	488	21
498	350	2
505	391	14
518	441	3
522	482	6
544	493	16
549	350	3
551	361	16
559	422	29
569	417	22
572	497	20
619	441	6
628	464	4
631	481	17
643	395	22
651	445	19
658	519	21
675	333	9
679	369	8
690	445	2
694	469	3
699	332	8
710	391	18
716	403	1
723	455	10
731	341	8
745	417	33
752	358	26
762	427	13
774	395	9
775	427	25
795	395	6
802	427	19
805	324	8
806	395	17
812	445	6
821	427	22
827	427	26
838	427	8
839	427	17
204	395	25
233	514	9
235	531	20
245	412	18
288	388	7
300	452	2
306	474	33
313	515	8
316	482	21
342	449	8
360	361	21
373	394	20
377	411	24
383	436	16
390	462	33
392	467	3
399	511	20
418	439	10
436	361	22
439	381	10
446	387	2
467	493	19
471	398	22
488	481	21
508	395	2
519	497	8
538	458	19
545	519	24
555	391	2
557	387	8
577	332	5
584	425	2
586	453	1
591	491	9
594	519	14
601	363	30
610	403	28
623	339	3
677	361	17
682	395	31
687	434	10
696	342	30
702	379	7
703	425	18
712	395	5
717	434	6
719	417	10
725	519	18
727	358	5
732	379	29
742	427	15
748	455	8
754	338	21
756	341	20
757	458	8
763	418	10
767	501	8
769	342	24
783	338	3
791	324	10
794	391	20
799	324	33
804	342	26
807	427	24
811	427	14
815	445	17
823	427	31
828	427	28
829	427	3
830	427	16
206	403	15
227	477	8
242	380	7
249	413	8
252	449	10
256	456	9
264	510	2
278	367	26
283	392	2
305	467	18
323	335	14
326	402	29
335	426	26
341	459	9
357	347	28
397	493	7
401	507	16
414	426	16
422	448	7
425	481	19
450	422	7
460	452	3
473	393	30
486	458	23
489	491	28
497	337	7
502	381	8
513	445	25
517	457	23
530	393	21
533	425	14
536	453	8
542	508	8
546	333	7
553	383	10
562	403	21
564	476	5
581	393	10
590	481	27
593	493	10
612	418	19
656	479	20
664	379	23
669	464	1
674	493	20
688	417	3
692	455	16
707	333	6
722	501	16
734	458	16
740	406	26
741	476	6
746	501	10
758	488	17
793	352	19
820	427	21
832	427	9
837	427	33
\.


--
-- Data for Name: skill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skill (id, title) FROM stdin;
1	Woodworking
2	Drawing
3	Painting
4	Sewing
5	Knitting
6	Repairs
7	Cooking
8	Teaching
9	Programming
10	Public speaking
11	Gardening
12	Landscaping
13	Carpentry
14	Decorating
15	Bike
16	Photography
17	Videography
18	Makeup
19	Copywriting
20	Yoga
21	Fitness
22	Football
23	Basketball
24	Dance
25	Chess
26	Management
27	SMM
28	Mediation
29	Event
30	Coaching
31	Guitar
32	Piano
33	Singing
\.


--
-- Data for Name: testimonial; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.testimonial (id, is_active, name, pic, person_id, language_id) FROM stdin;
\.


--
-- Data for Name: time; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."time" (id, info) FROM stdin;
1	\N
2	\N
3	\N
4	\N
5	\N
6	\N
7	\N
8	\N
9	\N
10	\N
11	\N
12	\N
13	\N
14	\N
15	\N
16	\N
17	\N
18	\N
19	\N
20	\N
21	\N
22	\N
23	\N
24	\N
25	\N
26	\N
27	\N
28	\N
29	\N
30	\N
31	\N
32	\N
33	\N
34	\N
35	\N
36	\N
37	\N
38	\N
39	\N
40	\N
41	\N
42	\N
43	\N
44	\N
45	\N
46	\N
47	\N
48	\N
49	\N
50	\N
51	\N
52	\N
53	\N
54	\N
55	\N
56	\N
57	\N
58	\N
59	\N
60	\N
61	\N
62	\N
63	\N
64	\N
65	\N
66	\N
67	\N
68	\N
69	\N
70	\N
71	\N
72	\N
73	\N
74	\N
75	\N
76	\N
77	\N
78	\N
79	\N
80	\N
81	\N
82	\N
83	\N
84	\N
85	\N
86	\N
87	\N
88	\N
89	\N
90	\N
91	\N
92	\N
93	\N
94	\N
95	\N
96	\N
97	\N
98	\N
99	\N
100	\N
101	\N
102	\N
103	\N
104	\N
105	\N
106	\N
107	\N
108	\N
109	\N
110	\N
111	\N
112	\N
113	\N
114	\N
115	\N
116	\N
117	\N
118	\N
119	\N
120	\N
121	\N
122	\N
123	\N
124	\N
125	\N
126	\N
127	\N
128	\N
129	\N
130	\N
131	\N
132	\N
133	\N
134	\N
135	\N
136	\N
137	\N
138	\N
139	\N
140	\N
141	\N
142	\N
143	\N
144	\N
145	\N
146	\N
147	\N
148	\N
149	\N
150	\N
151	\N
152	\N
153	\N
154	\N
155	\N
156	\N
157	\N
158	\N
159	\N
160	\N
161	\N
162	\N
163	\N
164	\N
165	\N
166	\N
167	\N
168	\N
169	\N
170	\N
171	\N
172	\N
173	\N
174	\N
175	\N
176	\N
177	\N
178	\N
179	\N
180	\N
181	\N
182	\N
183	\N
184	\N
185	\N
186	\N
187	\N
188	\N
189	\N
190	\N
191	\N
192	\N
193	\N
194	\N
195	\N
196	\N
197	\N
198	\N
199	\N
200	\N
201	\N
202	\N
203	\N
204	\N
205	\N
206	\N
207	\N
208	\N
209	\N
210	\N
211	\N
212	\N
213	\N
214	\N
215	\N
216	\N
217	\N
218	\N
219	\N
220	\N
221	\N
222	\N
223	\N
224	\N
225	\N
226	\N
227	\N
236	\N
247	\N
263	\N
272	\N
288	\N
291	\N
293	\N
297	\N
313	\N
317	\N
326	\N
353	\N
360	\N
363	\N
377	\N
382	\N
387	\N
397	\N
407	\N
434	\N
447	\N
459	\N
464	\N
471	\N
487	\N
489	\N
491	\N
505	\N
518	\N
519	\N
524	\N
540	\N
228	\N
237	\N
239	\N
241	\N
251	\N
254	\N
264	\N
268	\N
280	\N
295	\N
304	\N
306	\N
314	\N
367	\N
369	\N
374	\N
393	\N
394	\N
401	\N
404	\N
441	\N
448	\N
458	\N
488	\N
500	\N
523	\N
534	\N
229	\N
248	\N
256	\N
267	\N
279	\N
283	\N
299	\N
305	\N
315	\N
323	\N
337	\N
339	\N
341	\N
345	\N
351	\N
357	\N
359	\N
385	\N
396	\N
410	\N
414	\N
425	\N
427	\N
431	\N
439	\N
445	\N
452	\N
461	\N
502	\N
538	\N
230	\N
232	\N
235	\N
250	\N
253	\N
258	\N
259	\N
260	\N
271	\N
278	\N
287	\N
298	\N
301	\N
325	\N
328	\N
335	\N
349	\N
362	\N
364	\N
370	\N
379	\N
395	\N
398	\N
406	\N
409	\N
413	\N
432	\N
438	\N
455	\N
479	\N
482	\N
501	\N
513	\N
525	\N
532	\N
537	\N
539	\N
541	\N
542	\N
543	\N
544	\N
545	\N
546	\N
547	\N
548	\N
549	\N
550	\N
551	\N
552	\N
553	\N
554	\N
555	\N
556	\N
557	\N
558	\N
559	\N
560	\N
561	\N
562	\N
563	\N
564	\N
565	\N
566	\N
567	\N
568	\N
569	\N
570	\N
571	\N
572	\N
573	\N
574	\N
575	\N
576	\N
577	\N
578	\N
579	\N
580	\N
581	\N
582	\N
583	\N
584	\N
585	\N
586	\N
587	\N
588	\N
589	\N
590	\N
591	\N
592	\N
593	\N
594	\N
595	\N
596	\N
597	\N
598	\N
599	\N
600	\N
601	\N
602	\N
603	\N
604	\N
605	\N
606	\N
607	\N
608	\N
609	\N
610	\N
611	\N
612	\N
613	\N
614	\N
615	\N
616	\N
617	\N
618	\N
619	\N
620	\N
621	\N
622	\N
623	\N
624	\N
625	\N
626	\N
627	\N
628	\N
629	\N
630	\N
631	\N
632	\N
633	\N
634	\N
635	\N
636	\N
637	\N
638	\N
639	\N
640	\N
641	\N
642	\N
643	\N
644	\N
645	\N
646	\N
647	\N
648	\N
649	\N
650	\N
651	\N
652	\N
653	\N
654	\N
655	\N
656	\N
657	\N
658	\N
659	\N
660	\N
661	\N
662	\N
663	\N
664	\N
665	\N
666	\N
667	\N
668	\N
669	\N
670	\N
671	\N
672	\N
673	\N
674	\N
675	\N
676	\N
677	\N
678	\N
679	\N
680	\N
681	\N
682	\N
683	\N
684	\N
685	\N
686	\N
687	\N
688	\N
689	\N
690	\N
691	\N
692	\N
693	\N
694	\N
695	\N
696	\N
697	\N
698	\N
699	\N
700	\N
701	\N
702	\N
703	\N
704	\N
705	\N
706	\N
707	\N
708	\N
709	\N
710	\N
711	\N
712	\N
713	\N
714	\N
715	\N
716	\N
717	\N
718	\N
719	\N
720	\N
721	\N
722	\N
723	\N
724	\N
725	\N
726	\N
727	\N
728	\N
729	\N
231	\N
234	\N
238	\N
244	\N
252	\N
275	\N
276	\N
289	\N
331	\N
334	\N
358	\N
366	\N
390	\N
430	\N
437	\N
442	\N
446	\N
456	\N
484	\N
490	\N
498	\N
506	\N
511	\N
515	\N
521	\N
233	\N
262	\N
274	\N
281	\N
290	\N
294	\N
296	\N
311	\N
318	\N
327	\N
343	\N
344	\N
348	\N
352	\N
355	\N
356	\N
368	\N
378	\N
383	\N
389	\N
399	\N
400	\N
403	\N
408	\N
412	\N
417	\N
419	\N
436	\N
454	\N
460	\N
467	\N
473	\N
492	\N
499	\N
516	\N
520	\N
530	\N
535	\N
240	\N
243	\N
265	\N
282	\N
292	\N
310	\N
316	\N
330	\N
333	\N
338	\N
354	\N
365	\N
380	\N
386	\N
391	\N
411	\N
415	\N
423	\N
426	\N
435	\N
443	\N
451	\N
474	\N
476	\N
477	\N
485	\N
493	\N
494	\N
495	\N
503	\N
508	\N
522	\N
529	\N
536	\N
242	\N
245	\N
255	\N
261	\N
266	\N
269	\N
302	\N
309	\N
320	\N
329	\N
336	\N
350	\N
375	\N
384	\N
388	\N
392	\N
402	\N
421	\N
422	\N
428	\N
444	\N
453	\N
457	\N
463	\N
465	\N
470	\N
480	\N
497	\N
510	\N
526	\N
527	\N
246	\N
249	\N
273	\N
284	\N
307	\N
312	\N
322	\N
342	\N
346	\N
347	\N
371	\N
373	\N
416	\N
418	\N
440	\N
450	\N
462	\N
468	\N
469	\N
472	\N
475	\N
478	\N
483	\N
507	\N
509	\N
512	\N
514	\N
517	\N
528	\N
257	\N
270	\N
277	\N
285	\N
286	\N
300	\N
303	\N
308	\N
319	\N
321	\N
324	\N
332	\N
340	\N
361	\N
372	\N
376	\N
381	\N
405	\N
420	\N
424	\N
429	\N
433	\N
449	\N
466	\N
481	\N
486	\N
496	\N
504	\N
531	\N
533	\N
730	\N
731	\N
732	\N
733	\N
734	\N
735	\N
736	\N
737	\N
738	\N
739	\N
740	\N
741	\N
742	\N
743	\N
744	\N
745	\N
746	\N
747	\N
748	\N
749	\N
750	\N
751	\N
752	\N
753	\N
754	\N
755	\N
756	\N
757	\N
758	\N
759	\N
760	\N
761	\N
762	\N
763	\N
764	\N
765	\N
766	\N
767	\N
768	\N
769	\N
770	\N
771	\N
772	\N
773	\N
774	\N
775	\N
776	\N
777	\N
778	\N
779	\N
780	\N
781	\N
782	\N
783	\N
784	\N
785	\N
786	\N
787	\N
788	\N
789	\N
790	\N
791	\N
792	\N
793	\N
794	\N
795	\N
796	\N
797	\N
798	\N
799	\N
800	\N
801	\N
802	\N
803	\N
804	\N
805	\N
806	\N
807	\N
808	\N
809	\N
810	\N
811	\N
812	\N
813	\N
814	\N
815	\N
816	\N
817	\N
818	\N
819	\N
820	\N
821	\N
822	\N
823	\N
824	\N
825	\N
826	\N
827	\N
828	\N
829	\N
830	\N
831	\N
832	\N
833	\N
834	\N
835	\N
836	\N
837	\N
838	\N
839	\N
840	\N
841	\N
842	\N
843	\N
844	\N
845	\N
846	\N
847	\N
848	\N
849	\N
850	\N
851	\N
852	\N
853	\N
854	\N
855	\N
856	\N
857	\N
858	\N
859	\N
860	\N
861	\N
862	\N
863	\N
864	\N
865	\N
866	\N
867	\N
868	\N
869	\N
870	\N
871	\N
872	\N
873	\N
874	\N
875	\N
876	\N
877	\N
878	\N
879	\N
880	\N
881	\N
882	\N
883	\N
884	\N
885	\N
886	\N
887	\N
888	\N
889	\N
890	\N
891	\N
892	\N
893	\N
894	\N
895	\N
896	\N
897	\N
898	\N
899	\N
900	\N
901	\N
902	\N
903	\N
904	\N
905	\N
906	\N
907	\N
908	\N
909	\N
910	\N
911	\N
912	\N
913	\N
914	\N
915	\N
916	\N
917	\N
918	\N
919	\N
920	\N
921	\N
922	\N
923	\N
924	\N
925	\N
926	\N
927	\N
928	\N
929	\N
930	\N
931	\N
932	\N
933	\N
934	\N
935	\N
936	\N
937	\N
938	\N
939	\N
940	\N
941	\N
942	\N
943	\N
944	\N
945	\N
946	\N
947	\N
948	\N
949	\N
950	\N
951	\N
952	\N
953	\N
954	\N
955	\N
956	\N
957	\N
958	\N
959	\N
960	\N
961	\N
962	\N
963	\N
964	\N
965	\N
966	\N
967	\N
968	\N
969	\N
970	\N
971	\N
972	\N
973	\N
974	\N
975	\N
976	\N
977	\N
978	\N
979	\N
980	\N
981	\N
982	\N
983	\N
984	\N
985	\N
986	\N
987	\N
988	\N
989	\N
990	\N
991	\N
992	\N
993	\N
994	\N
995	\N
996	\N
997	\N
998	\N
999	\N
1000	\N
1001	\N
1002	\N
\.


--
-- Data for Name: time_timeslot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.time_timeslot (id, time_id, timeslot_id) FROM stdin;
1	11	1
2	13	2
3	191	3
4	90	3
5	124	5
6	125	6
7	13	7
8	237	11
9	260	17
10	261	17
11	227	10
12	282	3
13	229	12
14	228	11
15	231	14
16	234	15
17	308	20
18	311	13
19	314	22
20	315	17
21	316	11
22	317	14
23	318	8
24	123	17
25	191	18
26	257	20
27	259	21
28	262	22
29	197	22
30	236	23
31	312	8
32	332	28
33	333	17
34	334	11
35	335	28
36	338	11
37	258	11
38	228	17
39	231	28
40	162	25
41	308	10
42	347	28
43	349	17
44	313	8
45	161	11
46	336	22
47	317	28
48	13	26
49	318	3
50	310	27
51	309	28
52	348	8
53	334	33
54	335	17
55	358	28
56	351	11
57	361	33
58	338	33
59	258	27
60	230	29
61	347	21
62	367	14
63	368	32
64	349	10
65	227	30
66	282	31
67	237	33
68	332	17
69	357	17
70	360	14
71	374	14
72	234	34
73	197	6
74	379	11
75	162	6
76	308	42
77	309	21
78	311	35
79	369	42
80	381	14
81	382	14
82	370	8
83	350	36
84	383	20
85	315	38
86	334	10
87	371	17
88	335	39
89	359	2
90	385	11
91	336	6
92	384	14
93	317	17
94	372	17
95	387	3
96	373	22
97	361	32
98	389	3
99	338	17
100	390	20
101	257	40
102	259	41
103	392	8
104	347	26
105	367	28
106	348	20
107	368	26
108	312	2
109	349	30
110	282	43
111	339	44
112	237	27
113	332	44
114	314	28
115	397	22
116	399	17
117	161	6
118	386	17
119	360	13
120	400	3
121	388	8
122	374	17
123	401	8
124	230	43
125	234	27
126	379	33
127	308	13
128	309	46
129	394	17
130	380	22
131	369	27
132	381	28
133	395	22
134	382	28
135	403	14
136	383	3
137	398	8
138	315	42
139	334	30
140	316	10
141	385	33
142	351	28
143	384	28
144	317	44
145	338	43
146	257	35
147	162	2
148	418	28
149	312	43
150	349	43
151	332	18
152	396	13
153	404	6
154	314	2
155	397	28
156	310	43
157	406	17
158	336	32
159	161	3
160	373	6
161	421	6
162	407	18
163	374	21
164	390	2
165	401	32
166	333	18
167	422	3
168	358	45
169	234	43
170	197	2
171	258	46
172	392	28
173	308	40
174	393	22
175	413	22
176	348	13
177	416	17
178	369	43
179	381	17
180	424	11
181	382	3
182	427	28
183	237	43
184	428	17
185	419	14
186	383	40
193	389	10
198	313	32
200	431	22
210	332	21
216	420	28
222	444	22
223	358	18
237	447	11
249	441	36
254	370	42
282	444	28
285	451	8
286	445	28
290	395	2
292	382	18
302	438	28
313	313	42
321	417	6
346	413	26
358	459	28
375	432	43
381	467	33
403	393	17
452	485	22
473	373	2
495	439	5
500	500	14
506	418	21
511	461	6
513	482	6
517	464	10
522	412	7
534	498	22
553	479	7
566	444	26
569	418	5
574	436	40
602	495	21
609	487	6
615	477	39
626	513	17
629	448	2
638	489	5
641	482	7
650	516	32
655	498	17
661	520	28
670	489	46
675	505	42
680	523	8
686	521	28
690	500	21
694	528	3
707	525	28
724	508	47
726	509	36
730	488	13
757	481	2
763	525	5
771	505	5
777	532	8
785	508	35
793	530	17
798	528	18
800	504	26
812	521	21
817	523	40
829	531	17
837	530	47
846	535	21
849	530	5
868	539	51
871	541	52
872	542	53
873	543	54
874	544	55
875	545	56
876	546	57
877	547	58
878	548	59
879	549	60
880	550	61
881	551	62
882	552	63
883	553	64
884	554	65
885	555	66
886	556	67
887	557	68
888	558	69
889	559	70
890	560	71
891	561	72
892	562	73
893	563	74
894	564	75
895	565	76
896	566	77
897	567	78
898	568	79
899	569	80
900	570	81
901	571	82
902	572	83
903	573	84
904	574	85
905	575	86
906	576	87
907	577	88
908	578	89
909	579	90
910	580	91
911	581	92
912	582	93
913	583	94
914	584	95
915	585	96
916	586	97
917	587	98
918	588	99
919	589	100
920	590	101
921	591	102
922	592	103
923	593	104
924	594	105
925	595	106
926	596	107
927	597	108
928	598	109
929	599	110
930	600	111
931	601	112
932	602	113
933	603	114
934	604	115
935	605	116
936	606	117
937	607	118
938	608	119
939	609	120
940	610	121
941	611	122
942	612	123
943	613	124
944	614	125
945	615	126
946	616	127
947	617	128
948	618	129
949	619	130
950	620	131
951	621	132
952	622	133
953	623	134
954	624	135
955	625	136
956	626	137
957	627	138
958	628	139
959	629	140
960	630	141
961	631	142
962	632	143
963	633	144
964	634	145
965	635	146
966	636	147
967	637	148
968	638	149
969	639	150
970	640	151
971	641	152
972	642	153
973	643	154
974	644	155
975	645	156
976	646	157
977	647	158
978	648	159
979	649	160
980	650	161
981	651	162
982	652	163
187	334	27
196	430	14
199	412	22
207	395	6
208	339	18
212	437	3
229	416	44
250	388	3
263	434	20
273	161	2
284	197	7
287	423	42
291	416	47
306	429	3
308	385	7
334	440	10
339	442	17
345	348	35
351	445	17
360	428	42
367	421	26
373	466	22
376	452	5
380	460	3
399	449	40
406	475	17
423	313	13
427	415	32
432	452	36
443	470	17
454	450	47
456	486	14
467	471	32
472	474	43
476	483	33
507	477	17
521	313	40
532	434	40
563	463	40
580	506	14
586	408	18
592	509	14
596	480	40
617	491	39
621	511	20
636	433	42
687	526	14
695	487	39
714	506	40
722	448	26
729	521	3
739	526	3
749	522	21
775	531	22
804	511	46
808	493	26
814	516	26
822	530	39
825	487	7
828	535	17
848	531	47
851	524	7
859	534	36
188	359	7
201	432	11
220	401	30
239	399	46
253	443	33
256	414	17
262	435	8
281	442	28
283	358	21
288	418	39
294	335	36
297	404	7
309	389	30
314	162	26
319	415	20
324	467	11
328	470	14
331	420	5
337	388	13
344	450	39
368	448	6
374	465	39
379	425	6
384	461	22
387	472	17
391	474	27
397	408	17
404	414	18
407	445	10
416	316	46
424	444	2
436	434	42
445	439	21
448	384	30
451	443	40
460	445	30
479	442	30
481	466	6
484	497	14
487	468	40
491	476	28
504	487	22
539	456	44
544	499	20
554	435	5
556	493	20
570	508	8
581	492	21
591	488	17
595	435	36
603	483	46
606	313	35
610	515	17
612	501	6
625	456	18
628	464	21
630	499	47
637	497	39
640	471	2
645	518	17
658	513	2
660	408	21
665	499	40
676	448	7
678	518	35
681	506	13
683	470	21
696	488	42
699	509	5
709	393	2
717	498	2
727	493	47
742	477	5
745	530	14
752	487	47
760	521	44
768	508	40
770	502	39
780	526	18
782	514	35
799	487	2
806	501	26
809	502	47
815	531	6
857	531	2
864	537	47
866	537	7
189	385	3
215	405	22
217	351	17
234	425	11
258	432	33
278	449	28
293	459	14
296	447	43
303	316	27
305	463	8
335	457	6
347	414	44
389	455	13
401	358	36
463	382	36
475	495	28
485	480	17
516	483	27
523	393	39
524	367	36
533	459	44
538	505	11
548	457	26
564	484	18
571	445	26
575	434	35
579	467	46
584	513	6
588	499	39
605	463	35
614	490	36
646	514	20
651	481	32
666	507	35
716	470	5
723	514	2
734	505	2
748	520	39
753	523	17
756	497	5
762	526	44
797	526	21
816	534	17
832	502	2
840	487	26
844	530	21
865	537	2
190	317	5
202	414	8
214	398	6
228	445	14
240	438	8
243	334	43
246	385	2
269	428	32
274	400	42
279	401	13
300	397	7
322	435	17
323	460	6
336	387	26
341	458	17
353	454	22
357	382	21
361	397	36
362	469	17
366	463	20
388	398	7
393	429	32
402	197	26
412	459	17
418	483	11
422	442	10
439	404	46
450	457	2
490	436	13
494	161	46
505	489	22
509	491	22
520	442	21
529	497	28
542	373	7
545	384	5
561	483	43
572	490	5
576	502	22
620	498	20
627	520	14
642	438	35
647	466	7
662	500	30
668	509	17
691	464	36
698	504	2
704	519	47
712	471	7
718	526	28
720	500	5
731	501	47
733	497	21
735	506	35
744	433	40
747	470	46
750	514	40
755	516	2
766	488	40
778	456	46
789	521	18
818	535	28
831	520	36
835	534	39
838	531	39
847	534	47
191	400	32
195	408	14
203	415	8
211	314	7
236	427	17
241	316	30
252	430	17
261	433	8
266	237	46
277	448	22
280	458	20
298	419	44
318	432	27
325	424	5
338	390	35
365	473	3
369	385	46
371	430	30
383	396	35
395	161	7
396	457	3
400	388	7
408	435	32
415	462	30
419	463	32
425	367	21
441	482	22
442	455	35
468	462	7
480	367	5
502	444	7
508	479	2
525	488	20
537	467	43
543	495	17
562	448	18
567	466	2
568	507	8
577	511	8
582	503	6
589	485	2
593	489	27
622	505	32
648	488	32
652	493	39
654	506	28
657	470	18
664	495	36
667	508	32
671	519	39
673	511	17
679	514	17
688	522	17
702	516	42
711	497	47
713	511	32
746	511	42
754	504	7
761	408	36
767	477	36
783	516	5
788	503	2
790	533	22
795	520	47
803	532	17
824	536	17
833	523	35
839	535	30
853	533	26
855	537	6
192	387	27
197	338	46
205	423	32
226	367	39
227	380	6
244	336	42
257	413	6
272	457	22
295	427	21
312	430	10
326	455	10
333	384	10
342	444	3
348	453	47
356	468	20
364	438	17
386	427	5
413	424	46
420	448	17
430	418	47
444	456	28
458	433	17
462	395	26
482	465	47
483	490	17
488	481	22
493	336	26
498	384	21
503	457	7
518	463	13
519	485	6
531	460	26
541	439	36
549	380	26
552	504	14
558	470	44
573	510	11
590	514	8
597	454	47
604	500	10
611	507	3
616	504	28
632	393	47
649	461	39
659	522	14
669	501	17
689	520	17
715	502	17
732	523	20
743	508	13
765	486	26
774	493	2
779	534	14
781	525	36
784	433	35
805	393	26
810	503	36
823	521	5
827	524	18
830	533	17
834	535	10
843	502	7
858	538	50
861	537	39
867	537	26
194	388	20
206	434	8
213	397	21
218	384	17
230	381	21
232	424	20
238	383	35
242	439	14
268	314	26
276	387	5
289	381	5
304	359	26
310	408	28
327	456	11
329	439	28
332	351	18
349	451	6
355	434	32
377	433	20
378	395	7
385	471	17
390	470	28
414	476	14
421	484	3
429	451	26
434	478	17
447	351	21
449	464	17
453	388	26
457	380	7
465	492	14
478	429	42
486	454	39
496	499	8
501	484	44
512	492	17
514	494	44
526	486	28
535	476	17
557	461	3
559	438	40
565	442	5
594	479	26
600	476	21
608	412	26
613	508	20
634	418	36
639	459	18
644	485	7
663	464	5
672	502	6
674	503	39
685	513	26
692	485	26
706	524	22
721	408	5
736	529	17
740	500	36
772	511	13
786	511	40
801	481	7
811	520	21
820	520	5
836	521	36
845	537	22
852	530	36
204	417	22
209	426	17
219	440	33
221	442	14
224	234	46
225	162	7
235	335	48
247	421	7
255	308	35
259	348	40
260	452	28
264	436	8
267	332	35
271	373	44
275	440	3
299	462	17
301	398	13
311	464	14
315	393	6
316	431	42
320	452	21
330	336	2
340	443	27
350	380	2
352	423	5
359	462	32
363	316	43
372	367	47
382	436	20
392	439	17
405	477	14
409	479	22
410	468	13
417	336	7
428	432	46
433	417	47
435	480	20
437	425	17
440	427	36
455	488	8
464	460	7
469	398	35
471	438	13
489	434	13
497	448	44
510	435	42
515	496	40
528	501	22
530	480	13
546	443	36
551	433	32
555	425	7
560	496	35
578	482	2
585	464	30
599	516	11
601	373	26
618	425	35
624	351	36
633	486	2
635	509	28
643	521	14
656	476	5
677	525	8
684	456	27
693	527	49
697	477	47
700	433	13
703	481	42
705	476	36
719	522	10
738	503	42
741	525	27
751	528	44
764	393	7
773	501	7
776	497	36
787	498	36
791	488	35
794	505	26
802	524	44
807	535	22
819	533	6
826	481	26
841	524	2
842	533	2
850	534	21
856	534	5
860	524	26
869	540	44
870	540	18
231	446	3
233	382	44
245	429	8
248	317	36
251	390	7
265	396	40
270	455	11
307	334	46
317	412	6
343	358	5
354	381	36
370	464	28
394	373	18
398	440	30
411	382	5
426	412	2
431	490	28
438	467	17
446	473	42
459	477	28
461	479	17
466	493	14
470	494	14
474	496	20
477	463	42
492	467	27
499	408	44
527	490	21
536	471	42
540	351	5
547	500	28
550	489	28
583	512	32
587	384	36
598	481	6
607	518	6
619	510	46
623	512	42
631	517	17
653	436	35
682	482	26
701	491	47
708	466	26
710	486	7
725	477	21
728	461	47
737	456	5
758	524	6
759	498	7
769	530	28
792	523	13
796	534	28
813	526	5
821	526	36
854	502	26
862	531	7
863	531	26
983	653	164
984	654	165
985	655	166
986	656	167
987	657	168
988	658	169
989	659	170
990	660	171
991	661	172
992	662	173
993	663	174
994	664	175
995	665	176
996	666	177
997	667	178
998	668	179
999	669	180
1000	670	181
1001	671	182
1002	672	183
1003	673	184
1004	674	185
1005	675	186
1006	676	187
1007	677	188
1008	678	189
1009	679	190
1010	680	191
1011	681	192
1012	682	193
1013	683	194
1014	684	195
1015	685	196
1016	686	197
1017	687	198
1018	688	199
1019	689	200
1020	690	201
1021	691	202
1022	692	203
1023	693	204
1024	694	205
1025	695	206
1026	696	207
1027	697	208
1028	698	209
1029	699	210
1030	700	211
1031	701	212
1032	702	213
1033	703	214
1034	704	215
1035	705	216
1036	706	217
1037	707	218
1038	708	219
1039	709	220
1040	710	221
1041	711	222
1042	712	223
1043	713	224
1044	714	225
1045	715	226
1046	716	227
1047	717	228
1048	718	229
1049	719	230
1050	720	231
1051	721	232
1052	722	233
1053	723	234
1054	724	235
1055	725	236
1056	726	237
1057	727	238
1058	728	239
1059	729	240
1060	730	241
1061	731	242
1062	732	243
1063	733	244
1064	734	245
1065	735	246
1066	736	247
1067	737	248
1068	738	249
1069	739	250
1070	740	251
1071	741	252
1072	742	253
1073	743	254
1074	744	255
1075	745	256
1076	746	257
1077	747	258
1078	748	259
1079	749	260
1080	750	261
1081	751	262
1082	752	263
1083	753	264
1084	754	265
1085	755	266
1086	756	267
1087	757	268
1088	758	269
1089	759	270
1090	760	271
1091	761	272
1092	762	273
1093	763	274
1094	764	275
1095	765	276
1096	766	277
1097	767	278
1098	768	279
1099	769	280
1100	770	281
1101	771	282
1102	772	283
1103	773	284
1104	774	285
1105	775	286
1106	776	287
1107	777	288
1108	778	289
1109	779	290
1110	780	291
1111	781	292
1112	782	293
1113	783	294
1114	784	295
1115	785	296
1116	786	297
1117	787	298
1118	788	299
1119	789	300
1120	790	301
1121	791	302
1122	792	303
1123	793	304
1124	794	305
1125	795	306
1126	796	307
1127	797	308
1128	798	309
1129	799	310
1130	800	311
1131	801	312
1132	802	313
1133	803	314
1134	804	315
1135	805	316
1136	806	317
1137	807	318
1138	808	319
1139	809	320
1140	810	321
1141	811	322
1142	812	323
1143	813	324
1144	814	325
1145	815	326
1146	816	327
1147	817	328
1148	818	329
1149	819	330
1150	820	331
1151	821	332
1152	822	333
1153	823	334
1154	824	335
1155	825	336
1156	826	337
1157	827	338
1158	828	339
1159	829	340
1160	830	341
1161	831	342
1162	832	343
1163	833	344
1164	834	345
1165	835	346
1166	836	347
1167	837	348
1168	838	349
1169	839	350
1170	840	351
1171	841	352
1172	842	353
1173	843	354
1174	844	355
1175	845	356
1176	846	357
1177	847	358
1178	848	359
1179	849	360
1180	850	361
1181	851	362
1182	852	363
1183	853	364
1184	854	365
1185	855	366
1186	856	367
1187	857	368
1188	858	369
1189	859	370
1190	860	371
1191	861	372
1192	862	373
1193	863	374
1194	864	375
1195	865	376
1196	866	377
1197	867	378
1198	868	379
1199	869	380
1200	870	381
1201	871	382
1202	872	383
1203	873	384
1204	874	385
1205	875	386
1206	876	387
1207	877	388
1208	878	389
1209	879	390
1210	880	391
1211	881	392
1212	882	393
1213	883	394
1214	884	395
1215	885	396
1216	886	397
1217	887	398
1218	888	399
1219	889	400
1220	890	401
1221	891	402
1222	892	403
1223	893	404
1224	894	405
1225	895	406
1226	896	407
1227	897	408
1228	898	409
1229	899	410
1230	900	411
1231	901	412
1232	902	413
1233	903	414
1234	904	415
1235	905	416
1236	906	417
1237	907	418
1238	908	419
1239	909	420
1240	910	421
1241	911	422
1242	912	423
1243	913	424
1244	914	425
1245	915	426
1246	916	427
1247	917	428
1248	918	429
1249	919	430
1250	920	431
1251	921	432
1252	922	433
1253	923	434
1254	924	435
1255	925	436
1256	926	437
1257	927	438
1258	928	439
1259	929	440
1260	930	441
1261	931	442
1262	932	443
1263	933	444
1264	934	445
1265	935	446
1266	936	447
1267	937	448
1268	938	449
1269	939	450
1270	940	451
1271	941	452
1272	942	453
1273	943	454
1274	944	455
1275	945	456
1276	946	457
1277	947	458
1278	948	459
1279	949	460
1280	950	461
1281	951	462
1282	952	463
1283	953	464
1284	954	465
1285	955	466
1286	956	467
1287	957	468
1288	958	469
1289	959	470
1290	960	471
1291	961	472
1292	962	473
1293	963	474
1294	964	475
1295	965	476
1296	966	477
1297	967	478
1298	968	479
1299	969	480
1300	970	481
1301	971	482
1302	972	483
1303	973	484
1304	974	485
1305	975	486
1306	976	487
1307	977	488
1308	978	489
1309	979	490
1310	980	491
1311	981	492
1312	982	493
1313	983	494
1314	984	495
1315	985	496
1316	986	497
1317	987	498
1318	988	499
1319	989	500
1320	990	501
1321	991	502
1322	992	503
1323	993	504
1324	994	505
1325	995	506
1326	996	507
1327	997	508
1328	998	509
1329	999	510
1330	1000	511
1331	1001	512
1332	1002	513
\.


--
-- Data for Name: timeline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timeline (id, source_entity_type, source_entity_id, target_entity_type, target_entity_id, content_entity_type, content_entity_id, content_type, "timestamp", content) FROM stdin;
\.


--
-- Data for Name: timeslot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timeslot (id, info, rrule, start, "end", occasional) FROM stdin;
1	\N	\N	2025-09-05 08:00:00	\N	\N
2	\N	FREQ=WEEKLY;BYDAY=TH;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
3	\N	\N	\N	\N	weekdays
4	\N	\N	\N	\N	weekdays
5	\N	FREQ=WEEKLY;BYDAY=TU;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
6	\N	FREQ=WEEKLY;BYDAY=MO;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
7	\N	FREQ=WEEKLY;BYDAY=TU;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
8	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 11:00:00	2024-01-01 14:00:00	\N
9	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 11:00:00	2024-01-01 14:00:00	\N
10	\N	FREQ=WEEKLY;BYDAY=SA;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
11	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
12	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
13	\N	FREQ=WEEKLY;BYDAY=TH;	2024-01-01 11:00:00	2024-01-01 14:00:00	\N
14	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
15	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
16	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
17	\N	\N	\N	\N	weekends
18	\N	FREQ=WEEKLY;BYDAY=SU;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
19	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
20	\N	FREQ=WEEKLY;BYDAY=MO;	2024-01-01 11:00:00	2024-01-01 14:00:00	\N
21	\N	FREQ=WEEKLY;BYDAY=TH;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
22	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
23	\N	\N	\N	\N	weekends
24	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
25	\N	FREQ=WEEKLY;BYDAY=FR;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
26	\N	FREQ=WEEKLY;BYDAY=WE;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
27	\N	FREQ=WEEKLY;BYDAY=TH;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
28	\N	FREQ=WEEKLY;BYDAY=MO;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
29	\N	FREQ=WEEKLY;BYDAY=TH;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
30	\N	FREQ=WEEKLY;BYDAY=SU;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
31	\N	FREQ=WEEKLY;BYDAY=SU;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
32	\N	FREQ=WEEKLY;BYDAY=SA;	2024-01-01 11:00:00	2024-01-01 14:00:00	\N
33	\N	FREQ=WEEKLY;BYDAY=MO;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
34	\N	FREQ=WEEKLY;BYDAY=MO;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
35	\N	FREQ=WEEKLY;BYDAY=WE;	2024-01-01 11:00:00	2024-01-01 14:00:00	\N
36	\N	FREQ=WEEKLY;BYDAY=WE;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
37	\N	FREQ=WEEKLY;BYDAY=MO;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
38	\N	FREQ=WEEKLY;BYDAY=SA;	2024-01-01 11:00:00	2024-01-01 14:00:00	\N
39	\N	FREQ=WEEKLY;BYDAY=SA;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
40	\N	FREQ=WEEKLY;BYDAY=TU;	2024-01-01 11:00:00	2024-01-01 14:00:00	\N
41	\N	FREQ=WEEKLY;BYDAY=WE;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
42	\N	FREQ=WEEKLY;BYDAY=SU;	2024-01-01 11:00:00	2024-01-01 14:00:00	\N
43	\N	FREQ=WEEKLY;BYDAY=TU;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
44	\N	FREQ=WEEKLY;BYDAY=SA;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
45	\N	FREQ=WEEKLY;BYDAY=SA;	2024-01-01 17:00:00	2024-01-01 20:00:00	\N
46	\N	FREQ=WEEKLY;BYDAY=WE;	2024-01-01 14:00:00	2024-01-01 17:00:00	\N
47	\N	FREQ=WEEKLY;BYDAY=SU;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
48	\N	FREQ=WEEKLY;BYDAY=SU;	2024-01-01 08:00:00	2024-01-01 11:00:00	\N
49	Friday 11-14, Monday 11-14, Thursday 11-14, Tuesday 11-14, Wednesday 11-14	\N	\N	\N	\N
50	\N	\N	2025-08-27 17:40:00	\N	\N
51	\N	\N	2025-09-18 09:30:00	\N	\N
52	\N	\N	2025-09-01 12:15:00	\N	\N
53	\N	\N	2025-09-08 15:10:00	\N	\N
54	\N	\N	2025-08-28 14:30:00	\N	\N
55	\N	\N	2025-08-27 18:20:00	\N	\N
56	\N	\N	2025-08-28 09:45:00	\N	\N
57	Friday 14-17, Monday 14-17, Occasional Weekdays, Saturday 14-17, Sunday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
58	\N	\N	2025-09-09 11:30:00	\N	\N
59	\N	\N	2025-09-02 15:00:00	\N	\N
60	\N	\N	2025-08-29 10:40:00	\N	\N
61	Friday 14-17, Monday 14-17, Occasional Weekdays, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
62	\N	\N	2025-08-19 12:50:00	\N	\N
63	\N	\N	2025-09-01 15:00:00	\N	\N
64	\N	\N	2025-09-05 12:00:00	\N	\N
65	\N	\N	2025-09-09 14:15:00	\N	\N
66	\N	\N	2025-09-03 12:15:00	\N	\N
67	\N	\N	2025-08-29 14:00:00	\N	\N
68	\N	\N	2025-08-18 10:00:00	\N	\N
69	\N	\N	2025-08-21 09:40:00	\N	\N
70	\N	\N	2025-08-26 16:00:00	\N	\N
71	\N	\N	\N	\N	\N
72	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
73	Wednesday 11-14 | 08-11	\N	\N	\N	\N
74	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
75	Occasional Weekdays	\N	\N	\N	\N
76	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
77	\N	\N	2025-08-12 15:00:00	\N	\N
78	\N	\N	2025-08-13 10:30:00	\N	\N
79	\N	\N	2025-09-12 15:00:00	\N	\N
80	Tuesday 14-17	\N	\N	\N	\N
81	Monday 14-17 | 17-20	\N	\N	\N	\N
82	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
83	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
84	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
85	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
86	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
87	13-19, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
88	\N	\N	2025-08-11 09:30:00	\N	\N
89	\N	\N	2025-08-14 11:00:00	\N	\N
90	Occasional Weekdays | Weekends	\N	\N	\N	\N
91	\N	\N	2025-08-08 12:30:00	\N	\N
92	\N	\N	2025-08-22 15:00:00	\N	\N
93	Monday 17-20, Thursday 17-20, Tuesday 17-20	\N	\N	\N	\N
94	Thursday 17-20	\N	\N	\N	\N
95	\N	\N	2025-07-31 14:00:00	\N	\N
96	Wednesday 11-14	\N	\N	\N	\N
97	Friday 11-14, Tuesday 11-14	\N	\N	\N	\N
98	Friday 11-14 | 14-17, Monday 11-14 | 14-17, Thursday 11-14 | 14-17, Tuesday 11-14 | 14-17, Wednesday 11-14 | 14-17	\N	\N	\N	\N
99	\N	\N	2025-09-05 09:50:00	\N	\N
100	\N	\N	2025-08-22 14:30:00	\N	\N
101	\N	\N	2025-07-30 15:00:00	\N	\N
102	Friday 14-17, Monday 14-17, Saturday 14-17, Sunday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
103	Occasional Weekdays | Weekends	\N	\N	\N	\N
104	\N	\N	2025-08-05 11:00:00	\N	\N
105	\N	\N	2025-08-14 13:45:00	\N	\N
106	Friday 14-17 | 11-14, Monday 14-17 | 11-14, Occasional Weekdays, Thursday 14-17 | 11-14, Tuesday 14-17 | 11-14, Wednesday 14-17 | 11-14	\N	\N	\N	\N
107	\N	\N	2025-08-12 17:10:00	\N	\N
108	Thursday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
109	Friday 14-17 | 11-14 | 08-11, Monday 14-17 | 11-14 | 08-11, Occasional Weekdays, Thursday 14-17 | 11-14 | 08-11, Tuesday 14-17 | 11-14 | 08-11, Wednesday 14-17 | 11-14 | 08-11	\N	\N	\N	\N
110	Friday 14-17 | 11-14 | 08-11, Monday 14-17 | 11-14 | 08-11, Occasional Weekdays, Thursday 14-17 | 11-14 | 08-11, Tuesday 14-17 | 11-14 | 08-11, Wednesday 14-17 | 11-14 | 08-11	\N	\N	\N	\N
111	\N	\N	2025-07-25 14:00:00	\N	\N
112	\N	\N	2025-07-24 09:00:00	\N	\N
113	\N	\N	2025-07-24 16:00:00	\N	\N
114	\N	\N	2025-07-24 14:00:00	\N	\N
115	\N	\N	2025-07-29 08:40:00	\N	\N
116	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
117	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
118	\N	\N	2025-08-29 10:00:00	\N	\N
119	Occasional Weekdays, Tuesday 14-17	\N	\N	\N	\N
120	Occasional Weekdays | Weekends	\N	\N	\N	\N
121	Friday 14-17, Wednesday 14-17	\N	\N	\N	\N
122	Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
123	9-17, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
124	\N	\N	2025-07-31 08:00:00	\N	\N
125	Friday 11-14 | 14-17 | 17-20, Monday 11-14 | 14-17 | 17-20, Thursday 11-14 | 14-17 | 17-20, Tuesday 11-14 | 14-17 | 17-20, Wednesday 11-14 | 14-17 | 17-20	\N	\N	\N	\N
126	Friday 14-17 | 17-20 | 11-14, Monday 14-17 | 17-20 | 11-14, Saturday 14-17 | 17-20 | 11-14, Sunday 14-17 | 17-20 | 11-14, Thursday 14-17 | 17-20 | 11-14, Tuesday 14-17 | 17-20 | 11-14, Wednesday 14-17 | 17-20 | 11-14	\N	\N	\N	\N
127	Friday 17-20, Monday 17-20, Thursday 17-20, Tuesday 17-20, Wednesday 17-20	\N	\N	\N	\N
128	13-16, 14-16, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
129	Tuesday 14-17, Wednesday 11-14	\N	\N	\N	\N
130	\N	\N	2025-07-23 08:45:00	\N	\N
131	\N	\N	2025-07-21 14:00:00	\N	\N
132	\N	\N	2025-07-22 11:15:00	\N	\N
133	\N	\N	2025-07-17 11:00:00	\N	\N
134	Friday 11-14 | 08-11, Monday 11-14 | 08-11, Saturday 11-14 | 08-11, Sunday 11-14 | 08-11, Thursday 11-14 | 08-11, Tuesday 11-14 | 08-11, Wednesday 11-14 | 08-11	\N	\N	\N	\N
135	\N	\N	2025-07-21 14:30:00	\N	\N
136	\N	\N	2025-08-04 14:20:00	\N	\N
137	Occasional Weekdays	\N	\N	\N	\N
138	\N	\N	2025-07-29 10:00:00	\N	\N
139	\N	\N	2025-07-11 09:00:00	\N	\N
140	\N	\N	2025-07-15 15:00:00	\N	\N
141	\N	\N	2025-07-31 07:00:00	\N	\N
142	\N	\N	2025-07-08 11:20:00	\N	\N
143	\N	\N	2025-07-08 10:00:00	\N	\N
144	\N	\N	2025-07-11 18:00:00	\N	\N
145	\N	\N	2025-07-11 12:00:00	\N	\N
146	Occasional Weekdays	\N	2025-07-01 00:00:00	\N	\N
147	\N	\N	2025-06-30 11:00:00	\N	\N
148	\N	\N	2025-07-22 13:00:00	\N	\N
149	\N	\N	2025-06-27 16:00:00	\N	\N
150	\N	\N	2025-07-15 11:30:00	\N	\N
151	\N	\N	2025-06-23 10:50:00	\N	\N
152	\N	\N	2025-07-04 14:00:00	\N	\N
153	\N	\N	2025-06-21 10:30:00	\N	\N
154	\N	\N	2025-06-16 10:00:00	\N	\N
155	Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
156	Friday 14-17 | 17-20, Monday 14-17 | 17-20, Thursday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
157	\N	\N	2025-07-31 12:00:00	\N	\N
158	Monday 14-17, Thursday 14-17, Wednesday 14-17	\N	\N	\N	\N
159	\N	\N	2025-06-11 15:00:00	\N	\N
160	\N	\N	2025-06-03 10:30:00	\N	\N
161	\N	\N	2025-06-05 09:00:00	\N	\N
162	Friday 14-17, Monday 14-17, Saturday 14-17, Sunday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
163	\N	\N	2025-06-20 11:00:00	\N	\N
164	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
165	Monday 14-17 | 17-20, Thursday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
166	Monday 14-17, Tuesday 14-17	\N	\N	\N	\N
167	\N	\N	2025-05-28 12:30:00	\N	\N
168	Monday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
169	Wednesday 14-17 | 17-20	\N	\N	\N	\N
170	\N	\N	2025-05-26 10:30:00	\N	\N
171	Occasional Weekdays	\N	\N	\N	\N
172	\N	\N	2025-05-27 10:30:00	\N	\N
173	\N	\N	2025-05-21 13:00:00	\N	\N
174	Tuesday 17-20, Wednesday 17-20	\N	\N	\N	\N
175	Occasional Weekdays	\N	\N	\N	\N
176	Occasional Weekdays	\N	\N	\N	\N
177	16-18, Monday	\N	\N	\N	\N
178	\N	\N	2025-06-02 08:00:00	\N	\N
179	\N	\N	2025-06-11 11:00:00	\N	\N
180	\N	\N	2025-05-21 08:30:00	\N	\N
181	Occasional Weekdays | Weekends	\N	\N	\N	\N
182	\N	\N	2025-05-15 09:15:00	\N	\N
183	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
184	\N	\N	2025-05-19 08:30:00	\N	\N
185	\N	\N	2025-05-28 11:45:00	\N	\N
186	Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
187	Flexible	\N	\N	\N	\N
188	\N	\N	2025-05-19 11:00:00	\N	\N
189	Friday 14-17 | 17-20 | 08-11, Monday 14-17 | 17-20 | 08-11, Thursday 14-17 | 17-20 | 08-11, Tuesday 14-17 | 17-20 | 08-11, Wednesday 14-17 | 17-20 | 08-11	\N	\N	\N	\N
190	\N	\N	2025-07-21 07:00:00	\N	\N
191	9-17, Flexible	\N	\N	\N	\N
192	Occasional Weekdays | Weekends	\N	\N	\N	\N
193	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
194	\N	\N	2025-05-05 08:00:00	\N	\N
195	Friday 14-17 | 11-14, Monday 14-17 | 11-14, Thursday 14-17 | 11-14, Tuesday 11-14 | 14-17, Wednesday 11-14 | 14-17	\N	\N	\N	\N
196	Monday 14-17, Wednesday 14-17	\N	\N	\N	\N
197	Friday 14-17 | 11-14 | 08-11, Monday 14-17 | 11-14 | 08-11, Thursday 14-17 | 11-14, Tuesday 14-17	\N	\N	\N	\N
198	\N	\N	2025-05-28 07:00:00	\N	\N
199	Occasional Weekdays	\N	\N	\N	\N
200	Flexible	\N	\N	\N	\N
201	\N	\N	2025-05-02 16:16:00	\N	\N
202	Friday 14-17 | 11-14, Monday 14-17 | 11-14, Thursday 14-17 | 11-14, Tuesday 14-17 | 11-14, Wednesday 14-17 | 11-14	\N	\N	\N	\N
203	\N	\N	2025-04-22 11:00:00	\N	\N
204	Wednesday 14-17	\N	\N	\N	\N
205	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
206	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
207	Friday 14-17 | 17-20, Monday 11-14 | 14-17 | 17-20, Occasional Weekdays | Weekends, Saturday 14-17 | 17-20, Sunday 14-17 | 17-20, Thursday 14-17 | 17-20, Tuesday 11-14 | 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
208	16-20, Flexible	\N	\N	\N	\N
209	Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
210	14-17, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
211	13-19, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
212	13-19, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
213	14:30-17:00, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
214	Flexible, Friday, Monday, Saturday, Sunday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
215	15-18, Monday	\N	\N	\N	\N
216	Flexible	\N	\N	\N	\N
217	9-17, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
218	\N	\N	2023-12-15 15:00:00	\N	\N
219	Monday 14-17, Occasional Weekdays	\N	\N	\N	\N
220	\N	\N	2025-05-13 08:30:00	\N	\N
221	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
222	\N	\N	2025-05-02 11:30:00	\N	\N
223	\N	\N	2025-04-22 10:30:00	\N	\N
224	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
225	\N	\N	2025-04-17 08:00:00	\N	\N
226	Friday 17-20 | 14-17, Monday 14-17 | 17-20, Thursday 17-20 | 14-17, Tuesday 14-17 | 17-20, Wednesday 17-20 | 14-17	\N	\N	\N	\N
227	\N	\N	2025-04-17 11:00:00	\N	\N
228	\N	\N	2025-04-14 13:00:00	\N	\N
229	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
230	Occasional Weekdays | Weekends	\N	\N	\N	\N
231	\N	\N	2025-04-23 08:00:00	\N	\N
232	\N	\N	2025-04-07 12:45:00	\N	\N
233	\N	\N	2025-06-04 07:00:00	\N	\N
234	\N	\N	2025-04-11 10:00:00	\N	\N
235	\N	\N	2025-04-08 12:45:00	\N	\N
236	\N	\N	2025-04-28 10:15:00	\N	\N
237	\N	\N	2025-04-16 15:15:00	\N	\N
238	\N	\N	2025-04-03 08:00:00	\N	\N
239	\N	\N	2025-04-14 12:45:00	\N	\N
240	\N	\N	\N	\N	\N
241	\N	\N	2025-03-27 11:30:00	\N	\N
242	\N	\N	2025-03-27 08:30:00	\N	\N
243	\N	\N	2025-03-19 11:00:00	\N	\N
244	\N	\N	2025-03-20 11:30:00	\N	\N
245	\N	\N	2025-03-07 11:00:00	\N	\N
246	Occasional Weekdays | Weekends	\N	\N	\N	\N
247	\N	\N	2025-03-19 11:00:00	\N	\N
248	Friday 14-17 | 17-20, Monday 14-17 | 17-20, Thursday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
249	\N	\N	2025-03-24 09:00:00	\N	\N
250	Friday 14-17 | 17-20, Monday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
251	Friday 17-20	\N	\N	\N	\N
252	Friday 11-14, Monday 14-17 | 11-14, Thursday 14-17 | 11-14, Tuesday 14-17 | 11-14	\N	\N	\N	\N
253	\N	\N	2025-03-21 12:30:00	\N	\N
254	\N	\N	2025-03-24 12:00:00	\N	\N
255	Occasional Weekdays | Weekends	\N	\N	\N	\N
256	\N	\N	2025-05-07 12:35:00	\N	\N
257	\N	\N	2025-03-19 14:00:00	\N	\N
258	\N	\N	2025-03-19 10:30:00	\N	\N
259	\N	\N	2025-03-18 08:30:00	\N	\N
260	\N	\N	2025-03-18 10:50:00	\N	\N
261	\N	\N	2025-03-19 00:00:00	\N	\N
262	\N	\N	2025-03-19 11:20:00	\N	\N
263	\N	\N	2025-03-13 08:00:00	\N	\N
264	\N	\N	2025-03-13 13:00:00	\N	\N
265	\N	\N	2025-06-03 14:30:00	\N	\N
266	Friday 14-17 | 17-20, Monday 14-17 | 17-20, Occasional Weekdays, Thursday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
267	Monday 14-17, Occasional Weekdays, Thursday 14-17	\N	\N	\N	\N
268	Friday 14-17, Monday 14-17, Saturday 14-17, Sunday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
269	Occasional Weekdays	\N	\N	\N	\N
270	\N	\N	2025-03-14 09:30:00	\N	\N
271	Occasional Weekdays	\N	\N	\N	\N
272	Occasional Weekdays	\N	\N	\N	\N
273	Thursday 11-14, Tuesday 11-14	\N	\N	\N	\N
274	Friday 14-17 | 11-14, Monday 14-17 | 11-14, Thursday 14-17 | 11-14, Tuesday 14-17 | 11-14, Wednesday 14-17 | 11-14	\N	\N	\N	\N
275	\N	\N	2025-03-05 08:00:00	\N	\N
276	\N	\N	2025-04-30 13:00:00	\N	\N
277	10-12, 14-16, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
278	9-17, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
279	Flexible	\N	\N	\N	\N
280	\N	\N	2025-03-26 08:45:00	\N	\N
281	\N	\N	2025-03-03 09:00:00	\N	\N
282	\N	\N	2025-03-04 09:00:00	\N	\N
283	Friday 14-17 | 17-20, Thursday 14-17 | 17-20, Tuesday 17-20	\N	\N	\N	\N
284	Occasional Weekends | Weekdays	\N	\N	\N	\N
285	Friday 14-17 | 17-20 | 11-14 | 08-11, Monday 14-17 | 17-20 | 11-14 | 08-11, Thursday 14-17 | 17-20 | 11-14 | 08-11, Tuesday 14-17 | 17-20 | 11-14 | 08-11, Wednesday 14-17 | 17-20 | 11-14 | 08-11	\N	\N	\N	\N
286	Friday 14-17 | 17-20, Monday 14-17 | 17-20, Thursday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
287	\N	\N	2025-02-26 14:30:00	\N	\N
288	Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
289	\N	\N	2025-03-11 14:00:00	\N	\N
290	\N	\N	2025-02-18 10:10:00	\N	\N
291	\N	\N	2025-03-03 13:30:00	\N	\N
292	\N	\N	2025-03-03 10:00:00	\N	\N
293	Friday 17-20, Monday 17-20, Saturday 17-20, Thursday 17-20, Tuesday 17-20, Wednesday 17-20	\N	\N	\N	\N
294	\N	\N	2025-02-19 12:00:00	\N	\N
295	\N	\N	2025-02-21 10:00:00	\N	\N
296	Friday 14-17, Monday 14-17, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
297	\N	\N	2025-02-05 10:40:00	\N	\N
298	\N	\N	2025-02-22 12:30:00	\N	\N
299	\N	\N	2025-02-15 12:30:00	\N	\N
300	\N	\N	2025-02-08 12:30:00	\N	\N
301	Friday, Wednesday	\N	\N	\N	\N
302	Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
303	Flexible	\N	\N	\N	\N
304	14:00-17:00, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
305	\N	\N	2025-02-27 16:55:00	\N	\N
306	\N	\N	2025-02-10 09:00:00	\N	\N
307	\N	\N	2025-02-20 08:00:00	\N	\N
308	\N	\N	2025-02-05 10:00:00	\N	\N
309	Friday 17-20, Monday 17-20, Thursday 17-20, Tuesday 17-20, Wednesday 17-20	\N	\N	\N	\N
310	\N	\N	2025-02-24 09:00:00	\N	\N
311	Friday 14-17, Monday 14-17, Occasional Weekdays, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
312	\N	\N	2025-01-28 13:10:00	\N	\N
313	14-17, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
314	Friday 11-14 | 14-17, Monday 11-14 | 14-17, Thursday 11-14 | 14-17, Tuesday 11-14 | 14-17, Wednesday 11-14 | 14-17	\N	\N	\N	\N
315	Friday 14-17 | 17-20, Monday 14-17 | 17-20, Occasional Weekdays, Thursday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
316	Friday 14-17 | 17-20, Monday 14-17 | 17-20, Thursday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
317	Friday 14-17, Monday 14-17, Occasional Weekdays, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
318	Friday 11-14 | 14-17, Monday 11-14 | 14-17, Thursday 11-14 | 14-17, Tuesday 11-14 | 14-17, Wednesday 11-14 | 14-17	\N	\N	\N	\N
319	\N	\N	2025-01-22 10:00:00	\N	\N
320	\N	\N	2025-01-28 09:30:00	\N	\N
321	Friday 15-17:30, Occasional Weekdays	\N	\N	\N	\N
322	Friday 14-17 | 17-20, Monday 14-17 | 17-20, Occasional Weekdays, Thursday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
323	Friday 14-17 | 17-20, Tuesday 14-17 | 17-20, Wednesday 14-17 | 17-20	\N	\N	\N	\N
324	\N	\N	2025-01-30 08:20:00	\N	\N
325	\N	\N	2025-01-22 14:30:00	\N	\N
326	15-17, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
327	Friday 14-17, Monday 14-17, Occasional Weekdays, Thursday 14-17, Tuesday 14-17, Wednesday 14-17	\N	\N	\N	\N
328	\N	\N	2025-01-21 14:00:00	\N	\N
329	Flexible	\N	\N	\N	\N
330	\N	\N	2025-01-20 14:00:00	\N	\N
331	Friday 17-20, Monday 17-20	\N	\N	\N	\N
332	\N	\N	2025-01-06 09:00:00	\N	\N
333	\N	\N	2025-01-21 11:00:00	\N	\N
334	\N	\N	2025-01-15 09:00:00	\N	\N
335	Flexible	\N	\N	\N	\N
336	\N	\N	2024-12-18 07:45:00	\N	\N
337	\N	\N	2024-12-18 12:00:00	\N	\N
338	\N	\N	\N	\N	\N
339	16-20, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
340	14-18, Friday, Monday, Wednesday	\N	\N	\N	\N
341	\N	\N	2024-12-10 08:30:00	\N	\N
342	\N	\N	2024-12-17 08:00:00	\N	\N
343	\N	\N	2024-12-12 15:00:00	\N	\N
344	\N	\N	2024-12-17 13:30:00	\N	\N
345	17:30-20:00, Monday	\N	\N	\N	\N
346	Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
347	9-17, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
348	14-17, 15-17, Wednesday	\N	\N	\N	\N
349	Flexible	\N	\N	\N	\N
350	\N	\N	2024-12-09 09:40:00	\N	\N
351	9-18, Flexible	\N	\N	\N	\N
352	\N	\N	2024-11-26 13:30:00	\N	\N
353	9-17, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
354	\N	\N	2024-12-02 08:00:00	\N	\N
355	\N	\N	2024-11-26 12:00:00	\N	\N
356	Flexible	\N	\N	\N	\N
357	\N	\N	2024-12-03 12:30:00	\N	\N
358	\N	\N	2024-12-20 12:00:00	\N	\N
359	\N	\N	2024-12-13 00:00:00	\N	\N
360	\N	\N	2024-12-05 13:00:00	\N	\N
361	\N	\N	2024-11-25 13:00:00	\N	\N
362	\N	\N	2024-12-11 09:00:00	\N	\N
363	\N	\N	2024-12-03 10:05:00	\N	\N
364	\N	\N	2024-12-06 09:30:00	\N	\N
365	Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
366	\N	\N	2024-12-16 08:30:00	\N	\N
367	Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
368	\N	\N	2024-11-18 10:00:00	\N	\N
369	\N	\N	2024-11-18 10:15:00	\N	\N
370	\N	\N	2024-11-14 11:30:00	\N	\N
371	\N	\N	2024-11-20 09:30:00	\N	\N
372	\N	\N	2024-11-25 12:15:00	\N	\N
373	\N	\N	2024-11-14 12:00:00	\N	\N
374	\N	\N	2024-11-07 08:00:00	\N	\N
375	\N	\N	2024-11-13 13:35:00	\N	\N
376	\N	\N	2024-12-12 12:20:00	\N	\N
377	\N	\N	2024-11-06 08:00:00	\N	\N
378	\N	\N	2024-11-06 07:00:00	\N	\N
379	\N	\N	2024-11-29 15:00:00	\N	\N
380	\N	\N	2024-11-08 12:50:00	\N	\N
381	\N	\N	2024-11-13 14:00:00	\N	\N
382	\N	\N	2024-11-19 13:20:00	\N	\N
383	\N	\N	2024-11-07 15:15:00	\N	\N
384	\N	\N	2024-11-19 07:45:00	\N	\N
385	\N	\N	2024-11-06 11:10:00	\N	\N
386	\N	\N	2024-11-05 10:00:00	\N	\N
387	\N	\N	2024-11-07 10:00:00	\N	\N
388	\N	\N	2024-11-21 09:50:00	\N	\N
389	\N	\N	2024-12-10 12:00:00	\N	\N
390	18-19:30, Wednesday	\N	\N	\N	\N
391	9-17, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
392	9-17, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
393	9-17, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
394	Flexible	\N	\N	\N	\N
395	9-19, Flexible	\N	\N	\N	\N
396	14-18, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
397	Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
398	21.10-25.10, 28.10-01.11	\N	\N	\N	\N
399	16:00, 19:30, Tuesday	\N	\N	\N	\N
400	Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
401	Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
402	Flexible	\N	\N	\N	\N
403	Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
404	Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
405	9-17, Flexible	\N	\N	\N	\N
406	9-17, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
407	Flexible	\N	\N	\N	\N
408	Flexible	\N	\N	\N	\N
409	\N	\N	2024-12-17 10:20:00	\N	\N
410	9-17, Flexible	\N	\N	\N	\N
411	September 24th	\N	2024-09-24 12:10:00	\N	\N
412	September 13th	\N	\N	\N	\N
413	September 17th	\N	2024-09-17 00:00:00	\N	\N
414	9-17, Flexible, Wednesday	\N	\N	\N	\N
415	10-12, Flexible, Monday, Thursday	\N	\N	\N	\N
416	11-18, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
417	12:30-16:30, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
418	9-17, Flexible, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
419	11-13, Wednesday	\N	\N	\N	\N
420	14-18, September 24th	\N	2024-09-24 00:00:00	\N	\N
421	Flexible	\N	\N	\N	\N
422	11-16, August 26th	\N	\N	\N	\N
423	15-17, Every other Tuesday	\N	\N	\N	\N
424	11-18, August 1st	\N	\N	\N	\N
425	20-22:30, Wednesday	\N	\N	\N	\N
426	Flexible	\N	\N	\N	\N
427	Flexible	\N	\N	\N	\N
428	13-16, August 22nd	\N	\N	\N	\N
429	Flexible	\N	\N	\N	\N
430	Flexible	\N	\N	\N	\N
431	Flexible	\N	\N	\N	\N
432	14-17, Friday, Monday	\N	\N	\N	\N
433	\N	\N	\N	\N	\N
434	14-17, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
435	July 18th	\N	\N	\N	\N
436	9-17, Flexible	\N	\N	\N	\N
437	14-18, July 12th	\N	\N	\N	\N
438	19-20, Tuesday	\N	\N	\N	\N
439	17-18, Tuesday	\N	\N	\N	\N
440	Flexible	\N	\N	\N	\N
441	15-18, Thursday, Wednesday	\N	\N	\N	\N
442	Flexible	\N	\N	\N	\N
443	12-14, Saturday	\N	\N	\N	\N
444	Flexible	\N	\N	\N	\N
445	9-17, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
446	9-17, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
447	17-19, Thursday	\N	\N	\N	\N
448	Thursday	\N	\N	\N	\N
449	17-19, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
450	16-18, Tuesday	\N	\N	\N	\N
451	9-18, Flexible	\N	\N	\N	\N
452	October	\N	\N	\N	\N
453	9-18, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
454	Flexible	\N	\N	\N	\N
455	11:00, May 21st	\N	\N	\N	\N
456	Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
457	July 18th	\N	\N	\N	\N
458	10:40, June 17th	\N	\N	\N	\N
459	9:00, August 20th	\N	\N	\N	\N
460	July 1st	\N	\N	\N	\N
461	24.06.24	\N	\N	\N	\N
462	\N	\N	\N	\N	\N
463	13.06.24	\N	\N	\N	\N
464	12.06.24	\N	\N	\N	\N
465	13.06.24	\N	\N	\N	\N
466	27.06.24, Thursday	\N	\N	\N	\N
467	10.06.24	\N	\N	\N	\N
468	11:45, June 4th	\N	\N	\N	\N
469	14:45, June 19th	\N	\N	\N	\N
470	8:15, June 3rd	\N	\N	\N	\N
471	7:00, June 3rd	\N	\N	\N	\N
472	Flexible	\N	\N	\N	\N
473	Flexible	\N	\N	\N	\N
474	10:45, May 30th	\N	\N	\N	\N
475	9:00, May 31st	\N	\N	\N	\N
476	10:30, May 29th	\N	\N	\N	\N
477	9-11, May 29th	\N	\N	\N	\N
478	8:30, May 23rd	\N	\N	\N	\N
479	21.05.24	\N	\N	\N	\N
480	July 7th	\N	\N	\N	\N
481	12:00, May 21st, Tuesday	\N	\N	\N	\N
482	10:00, May 17th	\N	\N	\N	\N
483	13:30, May 28th	\N	\N	\N	\N
484	Flexible	\N	\N	\N	\N
485	Flexible, Short notice	\N	\N	\N	\N
486	\N	\N	\N	\N	\N
487	Once	\N	\N	\N	\N
488	Flexible	\N	\N	\N	\N
489	Flexible	\N	\N	\N	\N
490	Flexible	\N	\N	\N	\N
491	Flexible	\N	\N	\N	\N
492	Flexible	\N	\N	\N	\N
493	Flexible	\N	\N	\N	\N
494	Flexible	\N	\N	\N	\N
495	Flexible, Short notice	\N	\N	\N	\N
496	Flexible, Short notice	\N	\N	\N	\N
497	Once	\N	\N	\N	\N
498	Flexible	\N	\N	\N	\N
499	Flexible	\N	\N	\N	\N
500	\N	\N	\N	\N	\N
501	Flexible	\N	\N	\N	\N
502	\N	\N	\N	\N	\N
503	Flexible, Friday	\N	\N	\N	\N
504	\N	\N	\N	\N	\N
505	10-11, 14-15, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
506	Flexible	\N	\N	\N	\N
507	10-12, Thursday	\N	\N	\N	\N
508	17-18, Monday	\N	\N	\N	\N
509	10-12, 14-16, 9:30-12:30, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
510	15:30-17:00	\N	\N	\N	\N
511	14:30-17:00, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
512	Flexible	\N	\N	\N	\N
513	9-17, Friday, Monday, Thursday, Tuesday, Wednesday	\N	\N	\N	\N
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, email, password, is_active, role, language, timezone, person_id, created_at, updated_at, "personId") FROM stdin;
1	john.doe@need4deed.org	$2b$10$jebArwG0/WSBSlpkKZpU4u2qtnXo9wPXgpGktsLRHjwIMF.RMDwDK	t	admin	en	CET	\N	2025-11-01 20:51:11.090744	2025-11-01 20:51:11.090744	1
2	sarah.doe@need4deed.org	$2b$10$lE8mQC10dIbX1VuxIXcfruVWDfQSyQDBPrBjc14raADH4p/zl8.RW	t	coordinator	en	CET	\N	2025-11-01 20:51:11.090744	2025-11-01 20:51:11.090744	2
3	anna.doe@need4deed.org	$2b$10$mcI7XHX1nUIzWj2AbnLUbOpIa28uqHBWU7Yo0UQyQ6ciig1pHJN6S	t	user	en	CET	\N	2025-11-01 20:51:11.090744	2025-11-01 20:51:11.090744	3
\.


--
-- Data for Name: volunteer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.volunteer (id, info_about, info_experience, status, status_engagement, status_communication, status_appreciation, status_type, status_match, status_cgc_process, status_vaccination, status_cgc, created_at, updated_at, deal_id, person_id) FROM stdin;
1			New	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:12.88731	2025-11-01 20:51:12.88731	1	1
2			New	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:12.908551	2025-11-01 20:51:12.908551	2	1
3			New	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:12.914354	2025-11-01 20:51:12.914354	3	1
4			Active regular	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:13.427833	2025-11-01 20:51:13.427833	4	306
5			New	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:13.430814	2025-11-01 20:51:13.430814	5	311
6			Inactive	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:13.43626	2025-11-01 20:51:13.43626	6	310
7		- Nadav December 2024: He is interested in starting a theater project at the RAC when he is back from Argentina.	Active regular	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:13.442857	2025-11-01 20:51:13.442857	7	329
8			New	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:13.612374	2025-11-01 20:51:13.612374	8	1
9			New	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:13.92287	2025-11-01 20:51:13.92287	9	206
10			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:14.130276	2025-11-01 20:51:14.130276	10	282
11		1. Friedrichshain2. Atm no as I learn German in the evening and am super busy. Otherwise I could probably find 2 hours during a week day and work in the evenings to make up for it.3. I speak English, Croatian (Serbian, etc), and a bit of German. -Vostel	Inactive	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:14.150926	2025-11-01 20:51:14.150926	11	317
12		ich bin 40 Jahre alt und komme aus Georgien. In Georgien habe ich ein Studium als Lehrerin abgeschlossen und einige Jahre mit Kindern gearbeitet, unter anderem auch in einer Schule als Lehrerin. Ich bin sehr erfahren im Umgang mit Kindern und würde mich freuen bei Ihnen ehrenamtlich mitarbeiten zu können.Ich habe ein Deutschzertifikat B1 und bin aktuell sehr flexibel.Ich arbeite auch gerne mit älteren Menschen.Ich möchte auch gerne mein Deutsch üben und deswegen würde es mir auch helfen mit meinen Sprachkenntnissen. -Vostel	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:14.467316	2025-11-01 20:51:14.467316	12	192
13	they want to have a company day on 24.6 they are ca. 9 people.	Invalidenstr 31-33 hero	Matched	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:14.473655	2025-11-01 20:51:14.473655	13	176
14		- Shawky 12.03.2024: In Pakistian till April 2024, sent an email with the EFZ process.\n13.03.2024: She didn't feel comfortable sending her personal information by email	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:14.546446	2025-11-01 20:51:14.546446	14	304
15	i am a social worker working with young ofender		Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:14.709036	2025-11-01 20:51:14.709036	17	233
16			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:14.710108	2025-11-01 20:51:14.710108	16	224
17	Ich bin seit fast einem Jahr in der Unterkunft Columbiadamm 84 engagiert, dies wurde von Bevos vermittelt, aber dann sind alle Kontakte zu Bevos eingeschlafen, weil die e-Mail-Adressen nicht mehr funktionierten etc. Das hat mich doch sehr enttäuscht und ich war auf meine eigene Initiative angewiesen. Ich bin jweiter an einem Austausch mit andereren Sprachhelfern interessiert		Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:14.73889	2025-11-01 20:51:14.73889	18	298
18			Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:14.876608	2025-11-01 20:51:14.876608	19	93
19		- Shawky 05.08.2024: Spoke on the phone and asked her if she could help with Nachhilfe, since she is one of the few native German speakers we have. She expressed interest and asked me to send her the options. \n- Email to Shawky 6.12.24: I am so sorry again for my very late reply. The past weeks have been so intense and a bit overwhelming for me which is why I didn't make it. I'm sorry, I think I reached out to you in a moment just before so many things started to happen and then it all became a bit too much.. I am in touch with Myrto and have communicated that I will wait until February for things to get a bit calmer and to have more time again to meet and am I really looking forward to it!!	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:14.891565	2025-11-01 20:51:14.891565	20	135
20		- Shawky 13.06.24: Thanks a lot for filling out the volunteer information and preferences form. At the moment, we do not have any opportunities that could be done remotely, except for translations that involve knowledge of Arabic, Farsi, Turkish, Russian or Ukrainian. If something changes in the future and knowledge of Hindi, Kannada or Tamil is needed, we will definitely let you know. If something changes in your situation in the meantime and you are able to volunteer directly at one of the refugee accommodation centers we are working with, you could find a full list of the volunteer opportunities currently available on our website, etc.. / I’m interested in remote volunteering with very good English Skills and A2 German skills.I also know a lot of Indian languages.  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:14.918024	2025-11-01 20:51:14.918024	21	165
21			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:14.924209	2025-11-01 20:51:14.924209	22	172
22	Canceled volunteering Praktikum because marzahn was the only option and it was too far for her		New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:14.929195	2025-11-01 20:51:14.929195	23	201
23		- Shawky 29.05.2024: We knew him through Du für Berlin. He is a refugee, lives in another RAC in Marzahn. Communication in German, he doesn’t speak English\n- Volunteer coordinator in the RAC wants to talk about him	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:14.932471	2025-11-01 20:51:14.932471	24	185
24	I work freelance and have two kids, so my availability changes from week to week. She is out of Berlin until June 23rd.	funda: had video call on June 4th, sent information and our presentation.	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:14.937367	2025-11-01 20:51:14.937367	25	181
25	Half of the month I'm available on Monday from 4pm, the other half I'm available 6pm.	I'm Tamisa, 28 years old and Brazilian. Two and a half years ago I moved to Germany to do my doctorate. Since then I did not dedicate myself to volunteering, due to my German level, as I this opportunity does not require high comand of German  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:14.961607	2025-11-01 20:51:14.961607	26	244
26			Inactive	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:15.004005	2025-11-01 20:51:15.004005	27	314
27	I would like to volunteer 1 time per week please		New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:15.118459	2025-11-01 20:51:15.118459	28	54
28	I often work one week on one week off in my regular job so some at times I would be available during the week and other weeks I would not be available when working my regular job. When Im not working my hours can be flexible		Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:15.139807	2025-11-01 20:51:15.139807	29	147
29	Nein	Ich arbeite gerne mit Kinder und auch mit jugendliche . Mein Ziel ist mein deutsch zu verbessern durch komunikacion mit Kinder.  Ich kann mit Kinder sehr gut um gehen . Ich hab schon ein kind betreut und hat mir sehr gefallen . -Vostel	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.152747	2025-11-01 20:51:15.152747	30	182
30		Funda - had a video chat, volunteered for June. She is helping a woman regularly at the RAC in XX	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.155837	2025-11-01 20:51:15.155837	31	178
31	I work full weekdays but can do m		Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.194329	2025-11-01 20:51:15.194329	32	280
32			Temp inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:15.229777	2025-11-01 20:51:15.229777	33	307
33	I have a disability related to my menstrual cycle. Because if this I can only guarantee I can participate between 1-2 a month. For Saturdays, I might be flexible and can do it either from 4-6 pm or 6-8pm		Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.346625	2025-11-01 20:51:15.346625	34	22
34			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:15.465939	2025-11-01 20:51:15.465939	35	242
35	Contacted for post-match followup		Matched	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.483258	2025-11-01 20:51:15.483258	36	267
36			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.50137	2025-11-01 20:51:15.50137	37	297
37			Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:15.515898	2025-11-01 20:51:15.515898	38	302
38			New	\N	\N	\N	\N	\N	\N	undefined	no	2025-11-01 20:51:15.531658	2025-11-01 20:51:15.531658	39	308
39			Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:15.663836	2025-11-01 20:51:15.663836	40	76
40			Inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:15.670768	2025-11-01 20:51:15.670768	42	83
41			Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:15.670144	2025-11-01 20:51:15.670144	41	80
45			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:15.703127	2025-11-01 20:51:15.703127	47	150
59			Temp inactive	\N	\N	\N	\N	\N	\N	undefined	undefined	2025-11-01 20:51:15.996774	2025-11-01 20:51:15.996774	60	240
81		- Shawky 12.06.24 (Vostel): Thank you for reaching out to us and for your interest in volunteering at refugee accommodation centers!Quick question: Which languages would you be able to translate from Arabic to? German or English or both?	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.371784	2025-11-01 20:51:16.371784	82	166
82	I'm very busy but would like to help with translation when I can. I had measles when I was a small child.		Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.378564	2025-11-01 20:51:16.378564	83	157
83			Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.38423	2025-11-01 20:51:16.38423	84	183
87			Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:16.406985	2025-11-01 20:51:16.406985	87	237
89	Contacted for post-match followup	- Shawky (01.03.2024): Got in touch with him for playing sports with children in Lichtenberg or Marzahn, he is traveling and will be back in May	Matched	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.419647	2025-11-01 20:51:16.419647	90	270
97		Vostel: Hi there,I hope you are doing great!I have stumbled upon your ad and would love to learn more and participate. I currently have some time on my hands and would love to get them dirty by doing something hands-on. I am a big gardening enthusiast but I feel like my balcony is not big enough anymore so combining something I enjoy with something useful for the community would be lovely!Let me know what you think and we can have a chat about it.Have a great day,Ondřej \n\n- Shawky 13.06.24: Sent a request for gardening opportunity in Buckow	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.585693	2025-11-01 20:51:16.585693	98	179
99		funda- had a video chat on May 27th. She has volunteered for translation on May 29th	Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.603091	2025-11-01 20:51:16.603091	100	238
115		Nadav: The guy does not speak EN nor DE for translation. He is very much into way accompanying . Wegebegleitung	Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.78799	2025-11-01 20:51:16.78799	117	169
117	Werktags keine verbindl. Festlegungen im Vorhinein wg. Arbeit. Jedoch relativ gute Schancen bei spontanen Anfragen für Treptow bzw. Rudow vormittags.	funda- unfortunately not available in the week days	New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.793828	2025-11-01 20:51:16.793828	118	187
124	I work on shift base, so I am not available for sure saturdays and sundays, during the week I could have some free days and different shifts. If you add me to a group with a planned and shared calendar I can join any location according to my shifts.	live reinikndorf can do one a week but not on the same day. onlyn wants alex or renikendorf	Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:16.9033	2025-11-01 20:51:16.9033	125	7
135	Ich kann bei Bedarf auch an anderen Tagen einspringen aber den Mittwoch Nachmittag habe ich immer frei und kann dementsprechend zu dieser Zeit regelmäßig.	-Funda -had a video call on June4th, she can volunteer also for french, reminded her Certificate of Good Conduct / ich habe Interesse mehr über das Engagement in der Tagesbetreuung zu erfahren. Ein paar Informationen zu mir:Ich arbeite in Teilzeit in einem Start-up und mache mein Master Studium in International Relations. Ich bin 25 Jahre alt und habe ein wenig Erfahrung in der Kinderbetreuung, durch jüngere Geschwister und Babysitting und Nachhilfe verschiedener Altersgruppen  während dem Bachelorstudium. Ich würde mich total freuen regelmäßig einmal die Woche an einem Mittag/Nachmittag bei der Tagesbetreuung unterstützen zu können.  -Vostel	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.997202	2025-11-01 20:51:16.997202	136	272
143	I am applying for payed jobs at the moment which is why my schedule could change by a bit in the next month or so. But then I should still be available for at least 10 hours a week for the next months.		Inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:17.147082	2025-11-01 20:51:17.147082	144	196
172			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.503466	2025-11-01 20:51:17.503466	173	113
174		- Shawky 30.07.25: E-Mail “I’m still very interested in volunteering. I’ll be more flexible and available after the 10th of September.\nRegarding the event — I’ll be attending and am definitely looking forward to meeting you in person, especially since we didn’t get the chance to meet at last summer’s event.”	Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.517158	2025-11-01 20:51:17.517158	176	214
184		- Shawky 24.09.2024: I spoke with her on the phone, she just came back from Northern Greece, where she was volunteering with children at a camp. She is ready to travel anywhere in the weekend, even if it is not within the locations she specified. \n- Shawky 16.12.24: She left to Greece and will be there for at least 3 months	Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.621768	2025-11-01 20:51:17.621768	186	57
198	As a freelancer with a patchwork of different dayjobs, my schedule varies from week to week. My main interest / thing I would currently like to offer is a set of art/sculpture workshop ideas for kids/youth, which I currently facilitate at Atrium Kunstschule in Reinickendorf. These workshop concepts can be adopted to various circumstances.		Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.735164	2025-11-01 20:51:17.735164	199	481
199	About my schedule right now my school is on vacation but it's gonna start October when it's started my schedule can be changed and I might have to do this preferances again thank you for understanding.  🙏		Active accompany	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:17.741084	2025-11-01 20:51:17.741084	200	72
204	On October I will start school so my schedule might change and I won’t be in Germany for the last two weeks of August		Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.754648	2025-11-01 20:51:17.754648	206	105
213		Shawky 5.6.2025: She’s from Ireland, Been in Berlin for a year now, works in hospitality, mostly in the evenings, so she is quite flexible with time during the day. She speaks German well (albeit not fluently) and can also do clothes sorting and one day volunteering.\nShawky 31.07.25: She started volunteering independently at an accommodation center in Lichtenberg and will let us know if something changes in the future.	Temp inactive	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:17.80998	2025-11-01 20:51:17.80998	214	377
215		Shawky 15.03.2024: Can do sports or clothes sorting, lives in Prenzlauer Allee, Quite free in terms of time, German and English beginner, Arabic native	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.855135	2025-11-01 20:51:17.855135	216	492
219	Ja		Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:17.869665	2025-11-01 20:51:17.869665	219	74
240		- Shawky 10.10.24: Masters in Physics, worked a lot with children and adults in the past, but not as a volunteer.	Active regular	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.984732	2025-11-01 20:51:17.984732	241	52
243		Nadav 26.11.24: we called. She only speaks english, cannot guarantee when she can support or how often but theoretically it could work during mornings. she suggested bringing german and or arabic speaking friends with her to overcome the langues barriers. I mentioned i will sent her options for kids support around where she is and EFZ.	Matched	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:17.992076	2025-11-01 20:51:17.992076	242	531
248		I am a 25 years old Masters student in Berlin, and I am capable of helping. I speak Arabic, English and my Deutsch is approximately B1. -Vostel	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.003346	2025-11-01 20:51:18.003346	249	248
256	i am		Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.099604	2025-11-01 20:51:18.099604	258	247
259		- Shawky 04.02.25: She hat Lehramt studiert, hat ein Masters in Philosophie abgeschlossen und hat sehr lang deutsch und Kunst unterrichtet. Kann sich idealerweise Frietags (und in NK) freiwillig engagieren . Nadav 09.07.25: she replied on the update email and wants something on the weekends. \n- She res	Temp inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:18.182239	2025-11-01 20:51:18.182239	260	486
42	Unfortuntaley I work full time, so after 6 would only work for me.		Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:15.680147	2025-11-01 20:51:15.680147	43	101
63			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.143539	2025-11-01 20:51:16.143539	64	111
65			To rematch	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.165486	2025-11-01 20:51:16.165486	66	148
66			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.172604	2025-11-01 20:51:16.172604	67	139
108		- Shawky 30.09.24: She already filled out the form. See below	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.748031	2025-11-01 20:51:16.748031	109	47
111		- Nadav 26.09.24: He is only interested in translation from Italian to German, no other volunteering opportunities	Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.770712	2025-11-01 20:51:16.770712	112	65
113		funda: i met him with his parents at the summer fest. he is very well educated and reliable. he speaks pergecly english as well. he is disabled but her parents are ready to support him.\n\nJC 10.07.2025: he only can attend appointmets where there is an elevator and good accecibility with wheel-chair	Active accompany	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:16.77557	2025-11-01 20:51:16.77557	114	4
121			Matched	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.821888	2025-11-01 20:51:16.821888	122	266
122	Ich arbeite selbst in einer Behörde und kann daher bei Antragstellungen ggf. unterstützen.	She can do tuesdays maybe in furst one 10.6.25 othereise fridays already in 2.5 she has day off so she can start. sounds very capble and willing, only issue is time. she saw the posters camping in adlershof	Matched	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:16.830533	2025-11-01 20:51:16.830533	123	432
138	not registered for regular, just asked to do one time translation	One time match - she agreed to accompany one time and not interested in more.	Temp inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.116366	2025-11-01 20:51:17.116366	139	422
154		-Shawky 24.09.2024: I spoke with her on the phone (in German, her German seems quite ok, doesn’t speak English). She is now taking a B2 German class. She filled out the form with her husband (Fardini), but it was not clear where they learned about us (bei einer Firma in Köpenick) or what they wanted to do exactly. She was a bookkeeper in her homeland. I sent them both a list of all available opportunities and told them about the possibility of translating from German to Farsi as well.	Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.254986	2025-11-01 20:51:17.254986	155	51
157		-Shawky 24.09.2024: I spoke with his wife (Najmeh) on the phone (in German, her German seems quite ok, doesn’t speak English). She is now taking a B2 German class. She filled out the form with her husband (Fardini), but it was not clear where they learned about us (bei einer Firma in Köpenick) or what they wanted to do exactly. I sent them both a list of all available opportunities and told them about the possibility of translating from German to Farsi as well. (Got delivery notification failure for the email)	Temp inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.265116	2025-11-01 20:51:17.265116	158	53
160			Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.291597	2025-11-01 20:51:17.291597	161	118
161	Hi, I am a young professional in IT. I have every friday free from the end of February to the end of March, I would love to help and support at the Tempelhof refugee center. I think I am quite good with children and I would really enjoy supporting the day care and committing to create and organize some fun activities for the children to do. On the side I can also help with anyone in need of programming or IT support! My skills in german are currently around A2/B1 but I am improving every day. Best, Benjamin	nadav 21,2,25 phone call: i mentioned limited time he has (4 weeks) is a challenge but we can check on monday with rac. i suggested to see if we had any one timers or accompanying french englisch and he was into both otions. also he was intertetsed in our cooking event.	New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.297079	2025-11-01 20:51:17.297079	162	469
162	Flexible		Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.303052	2025-11-01 20:51:17.303052	163	125
171			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.478391	2025-11-01 20:51:17.478391	172	117
193		funda: sent a volunteering request dd. 28.05 / I'm planning to organize a team event for our company on June. I find this activity interesting and was wondering where the event would take place.  -Vostel	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.649937	2025-11-01 20:51:17.649937	194	223
197			Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.729122	2025-11-01 20:51:17.729122	198	521
211			New	\N	\N	\N	\N	\N	\N	undefined	no	2025-11-01 20:51:17.7907	2025-11-01 20:51:17.7907	210	283
212		Nadav 11.7: Lives in Pberg, can do adults no kids apart from homework support. Open for sports or men group. Anything in the east. Not working at the momemt but a student full time, will look for job later hut now flexible schedule. Will be back end of august from vacation	Opportunity sent	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:17.805463	2025-11-01 20:51:17.805463	213	353
223	To be after working hours	- Funda: I asked appointment for a short video call \n- Shawky 16.10.24: put her in touch with Alaa Atia, whose contact we got from Schöneberg Hilft	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.878594	2025-11-01 20:51:17.878594	224	120
225			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.882652	2025-11-01 20:51:17.882652	226	163
232		My german is only A1 level.  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.900056	2025-11-01 20:51:17.900056	233	252
245		Nadav 23.7.25: She said yes and then pulled back from an appointment. She also ignored the request to get her phone number. Otherwise seemed responsive and responsible.	Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.995881	2025-11-01 20:51:17.995881	247	171
253	I am unemployed at the moment. As soon as I find a job my volunteering opportunities will change.		Active accompany	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:18.084203	2025-11-01 20:51:18.084203	254	73
278	It can sometimes change but, in principle, I am relatively flexible as I work from home, but I will be fitting various other things in. It also somewhat depends on the location in question. As for locations, I could also potentially travel further afield, and have done in the past when going to accommodation centres to provide assistance, but my preference would be for around Neukölln, so I only ticked the actual preferences. It also perhaps depends on the time of the errand. In principle though, for a couple of hours a week/a couple of times a month, I should be rather flexible.		Temp inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.294186	2025-11-01 20:51:18.294186	279	110
290	I will try to be consistant however the schedule will depend on my job interview schedule.	I am Dmitrii from Russia. My German is not so good, however, I have perfect Russian and good English. I am an MBA graduated Product Manager with experience in Hong Kong and Turkey so I am good at multinational environments. -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.392604	2025-11-01 20:51:18.392604	291	219
297	Hello! I'm a certificated yoga teacher, I will be happy to volunteering offering some lessons.	Jamie 24.4 - potential great fit for volunteering, right activity, right place, right timing at Bernauer Str. 138a, 13507.\n Nadav 29.4.25: this was not a phone call appearantly just a comment of jamie. it seems there was no contact made with the volunteer.	Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:18.521466	2025-11-01 20:51:18.521466	298	413
302			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.555934	2025-11-01 20:51:18.555934	303	35
305		Shawky 04.08.24: Tried to call again, want to offer him the Kleiderkammer opportunity in Marzahn since he lives there and speaks German: https://www.notion.so/Verantwortliche-f-r-Kleiderkammer-1748d880f47481b8aab4e6969f31b939?pvs=21	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.582551	2025-11-01 20:51:18.582551	306	318
307			New	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.623426	2025-11-01 20:51:18.623426	308	464
310			Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.64465	2025-11-01 20:51:18.64465	311	29
314			Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.653583	2025-11-01 20:51:18.653583	315	123
338			Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.933584	2025-11-01 20:51:18.933584	339	440
43			Inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:15.693661	2025-11-01 20:51:15.693661	44	144
57		she lives in Hamburg, she can volunteer for phone conversations	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:15.96811	2025-11-01 20:51:15.96811	58	199
61			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.127502	2025-11-01 20:51:16.127502	62	24
70		Meine Name ist Anja und ich wohne in Alt-Treptow. - Vostel\nShawky 10.04.2025:Doing movie nights at the Hangars	Active regular	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.195078	2025-11-01 20:51:16.195078	71	246
71	I will have wisdom teeth surgery on 05.03 so I expect to be able to start volunteering in mid-march. and to fit my schedule I would like to volunteer 1-3 days a week	I hope this message finds you well. I just came across the volunteering opportunity to assist with translation at shared accommodation centers for refugees, and I am really interested in contributing.I am fluent in both Arabic and English, and I live in Pankow (super close to prenzlauer berg too). I just recently finished my studies and currently have plenty of time during the day and would love to assist refugee -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.199292	2025-11-01 20:51:16.199292	72	271
73			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.204449	2025-11-01 20:51:16.204449	74	261
77			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.226466	2025-11-01 20:51:16.226466	78	303
88		July 1st 2024: “I am currently actively looking for a job as my unemployment is coming to an end, which means I also sadly won't be able to volunteer anymore.”	Matched	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.417509	2025-11-01 20:51:16.417509	89	291
106		nadav: she wants to sprachcafe in NK, asks about the requierments @Senya was emailed. She wants to work with other volunteers and not just  lauraraquelcas@gmail.coml auraraquelcas@gmail.com set it up alone. waiting for @Senya to check with the RAC	Active regular	\N	\N	\N	\N	\N	\N	undefined	yes	2025-11-01 20:51:16.739352	2025-11-01 20:51:16.739352	107	5
144	My personal schedule could change, as I am a student and I don’t always have fixed schedule. As of now I’m relatively free, however that may change, of which I would let you know in advance.	I a small experience in gardening back from the time of my childhood…My name is Gleb, my language skills are English C2, German beginner and my native language as well. I am 26 years old and love hands-on activities.  -Vostel	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.158136	2025-11-01 20:51:17.158136	145	225
153			To rematch	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.252098	2025-11-01 20:51:17.252098	154	31
189	Omaha pro Woche		Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.639324	2025-11-01 20:51:17.639324	190	85
222		.- Shawky 08.08.2024: Talked on the phone today (in German). She’s fluent, recently moved to Berlin so does not know where things really are yet, and happy to receive options in different neighborhoods and decide accordingly.	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.873083	2025-11-01 20:51:17.873083	223	97
226		a French girl and I am motivated to help you with any kind of translation from English to French or from French to English. -Vostel	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.883883	2025-11-01 20:51:17.883883	227	119
235		- Shawky 02.10.24: She is from Colombia, studied Social Work in Bogotá and graduated at the beginning of this year. She did 5 internships and one of them was specifically focused in migrant population in Santiago de Chile, mainly with population from Peru, Colombia and Haiti… during this time she was accompanying different cases and trying to guide them through their options as much as possible. She wrote a thesis about housing conditions and the integration process of the Venezuelan population in Bogotá.\n- Shawky 22.10.24: She went back to Colombia for a couple of months, and said she will be back in January (WhatsApp exchange)	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.97562	2025-11-01 20:51:17.97562	236	45
246	Ich bin nur jede zweite Woche in Berlin	- ich wohne in Mitte und spreche Deutsch und Englisch, sowie ein bisschen französisch, spanisch und weitere Sprachen. Ich habe aktuell viel Zeit und bin sehr flexibel, bin aber jede zweite Woche unter der Woche nicht in Berlin. Ich habe bereits mit Geflüchteten gearbeitet und denke, ich kann gut mit Kindern umgehen.  -Vostel\n- Shawky 27.01.2025: We had a phone call and she mentioned she can only be in Berlin every other week. @Senya checked with Landsberger Allee (City Hotel East Berlin) (https://www.notion.so/Landsberger-Allee-City-Hotel-East-Berlin-13e8d880f4748087b9d4e482cb71e162?pvs=21) if that is a possibility	Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.996385	2025-11-01 20:51:17.996385	246	527
252		- Shawky 14.10.25: Hesham Elkashash’s wife, Initially matched to Refugium Hausvaterweg, but went once and it was too far, and they were re-matched with Storkower Straße, will meet the volunteer coordinator on 21.01.25	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:18.077012	2025-11-01 20:51:18.077012	253	63
254	Schedule changes. Happy to help when needed, just let me know.		Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.086591	2025-11-01 20:51:18.086591	255	94
269	For now I'm available 7 days a week but in 4 weeks time I'll be starting German language classes, from then I'll only be available evenings and weekends	studied childcare for 3 years back in the UK and have over 8 years of experience working with children from the age of 6 months to 10 years old as a nanny, for nurseries & schools. I love being involved with children, playing games in the park, dancing to music, baking, painting, reading stories, or creating our own stories. I have some SEN experience looking after children with hearing impairment, ADHD, and autism. \n\nI currently speak basic German but will be studying German full time from April, I'd like to volunteer well I study.	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.214845	2025-11-01 20:51:18.214845	270	245
281			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.303533	2025-11-01 20:51:18.303533	282	229
283			Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.317217	2025-11-01 20:51:18.317217	284	284
284		- Shawky 14.01.25: Studied civil engineering in Syria, interested mainly in improving German. Worked as a daycare volunteer through AWO, but was disappointed cause he didn’t get to practice German that much	Opportunity sent	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.338344	2025-11-01 20:51:18.338344	285	501
285	A1.2 level German	Shawky 22.07.25: E-mai to community outreach Feb. 27 2025 “Hello,I'm still interested. The thing is my work schedule doesn't allow me during the week, I can do weekends. +4916092408473”	Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.373539	2025-11-01 20:51:18.373539	286	507
286	I may need to change it in the future as I intend to take German language classes (I am roughly B1 level). As of now I only want to do at most 20 hours per week.		Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.382252	2025-11-01 20:51:18.382252	288	60
299		-Shawky 30.09.24: Yassine is from Morocco, but I spoke with him and he understands and communicates in other dialects, including Syrian. He doesn’t speak German, so translation would be only to English. His background is in fashion (styling women at a store), but is happy to play games with children or support with festivals.\n- Shawky 10.01.25: He left back to Morocco, won’t be back to Berlin anytime soon.	Inactive	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:18.549894	2025-11-01 20:51:18.549894	300	46
325		12.03.25: Lives on the Gleisdreieck since a few months, and will be here for at least 1 year. He is passionate about history and politics, worked for 2 ministers with the Green Party in Belgium. He’s been a tutor for law and language (English and French), has a law background. Did a lot of gym fitness. Prefers works with adults or teenagers. Very basic German, he’s a part-time tour guide. Check opportunities for French translation with social workers, Ausflüge and Nachhilfe for English	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.791279	2025-11-01 20:51:18.791279	326	449
345		Nadav tried to get in touch with her, couldn’t find the time	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.004137	2025-11-01 20:51:19.004137	346	453
44	Earlier rather later in the day		Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:15.698032	2025-11-01 20:51:15.698032	45	133
48		I’m 34 years old and I come from Sweden.I love children and I live in Schöneberg, I’m with Arbeitsamt atm so I have free time and would like to do something good with it.I got my little sister when I was 15 years old, I took care of her a lot when she was small and I’ve also taken care of friends children.I connect very easy with kids and my boyfriend is a Syrian refugee so I also have an understanding of what they might have been through. My German level is B2. -Vostel	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:15.716017	2025-11-01 20:51:15.716017	49	198
68		- Shawky 13.06.24: If something changes in the future and knowledge of Spanish, Portuguese or French is needed, we will definitely let you know.If your preferences change at some point, you could find a full list of the volunteer opportunities currently available on our website, etc.. / I am from Mexico and moved to Berlin 3 years ago. I am interested in this volunteer opportunity, I am fluent in Spanish, French, Italian, Portuguese and have a B2 level in German. I have always wanted to have the opportunity to help and assist people in need, specially refugees after seeing first hand the experiences some of them had in the north of Mexico near to the border with the United States.  -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.181773	2025-11-01 20:51:16.181773	69	173
75			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.206228	2025-11-01 20:51:16.206228	77	293
85		I am Sofie, 29 years old, from Denmark and I am looking to support your organization. I have plenty of experience taking care of children and I simply enjoy interacting, teaching and listening to them.  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.403902	2025-11-01 20:51:16.403902	88	258
94	Ich bin bis September weg. Ich fange dann mit einem neuen Job an. Bin mir nicht sicher wie viele Energie ich danach haben wird. Hab daher nur donnerstags frei gemacht für jetzt.		Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.559143	2025-11-01 20:51:16.559143	95	91
98		- Shawky 13.06.24: We currently have volunteering opportunities at two of the refugee accommodation centers in: Buckow (12349) and Rahnsdorf (12589), where they need volunteers to organize arts & crafts activities with children.  / I don't have experience with raised beds but I enjoy gardening and plants and think I would be able to learn quickly.  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.592464	2025-11-01 20:51:16.592464	99	168
101	Nope / Contacted for post-match followup	I am a master student studying tourism and hospitality management. I want to the city and its problems and I want to give my time to something valuable. -Vostel	Matched	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.619146	2025-11-01 20:51:16.619146	102	262
107	I can be available most of the time between 9h-16h (with some exceptions) if I know in advance	Shawky 30.10.24: She lives in Reuterkiez and for the next few months will have time during the day.	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.741821	2025-11-01 20:51:16.741821	108	26
112	I live in Wilmersdorf that is why I only selected 2 options but I can also do other locations if needed	My name is Sevval and I am a 27 year-old Turkish woman. I moved to Berlin in 2021 for my masters (in competition law) at FU and I have been working in the field as a consultant for over a year. Before that, I was working at a law firm in Istanbul. I always had a special interest in psychology and I have always got along with kids. I worked as a volunteer teacher in Ukaine in 2017 for over a month. When I saw this advert, I felt very excited and I would love to be a part of this with my whole heart. My German skills are around B1.2-B2  -Vostel\n\n- Shawky 07.08.2024: She would like to volunteer with her boyfriend (Yalcin, who also filled out the form and can drive to anywhere in the city). I sent them both an email asking if they would like to do the Marzahn weekend opportunity together. \n\n- Shawky 26.09.2024: Saw in the thread with Nadav that she found the Maxie-Wander-Straße opportunity too far. Sent follow up email to check if she has been sent a volunteering opportunity while I was away or if I should keep looking\n\n- Shawky 01.07.25: Thank you very much for your email. I still want to stay in the loop as I really want to participate in volunteering, but I am getting married this year, and it is like a side job next to my full-time job now. Would it be okay to stay on the list and reach you later sometime? I am so sorry for staying silent so far... WarmlySevval	Temp inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.771145	2025-11-01 20:51:16.771145	113	104
119		I am interested in helping for the garden work, I love nature, I speak intermediate German, I learn fast and I can commit 2 hours per week.  -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.802043	2025-11-01 20:51:16.802043	120	220
155		had a call, she likely gets a new job, if not she will call us back	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.255797	2025-11-01 20:51:17.255797	156	16
168		- Shawky 30.05.2024: The volunteer coordinator at the Hangars wrote to Senya that Sara can only help in the evenings. / However, i dont think i can commit weekly but rather biweekly. would sitll work for you? Wednesday at 6 am would be perfect.  -Vostel	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.349031	2025-11-01 20:51:17.349031	169	301
170	no	- Shawky 23.01.25: Manager at a travel company. Lives in Kreuzberg and works in Mitte. She has been in Germany for 3 years. She is involved in several initiatives for women in her company. Speaks English and Turkish, and some Greek.	Matched	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:17.465665	2025-11-01 20:51:17.465665	170	62
173			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.504714	2025-11-01 20:51:17.504714	174	154
179			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.532088	2025-11-01 20:51:17.532088	180	231
180		Tried to call, number didnt work	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.541698	2025-11-01 20:51:17.541698	181	287
182	I would probably need to adapt and update my schedule once i get the confirmation for my german classes schedule.	- Shawky 08.10.24: He did cultural mediation in France, which is equivalent to integration in Germany, in Marseille. Originally from Argentina. He would prefer to working mainly with adults, and adolescents (15+) not children. Not interested in playing sports 🙂 Available before 1 all weekdays, plus Sunday.	Inactive	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:17.612622	2025-11-01 20:51:17.612622	184	43
187	I'm flexible - all depends on how often I'm volunteering. Also Tempelhof is an option, just need more time to get there and back.	- Shawky 08.08.2024: Senya heard back  from the volunteer coordinator in Zehlendorf that he did go to the Summer festival, but it might be too far for him to go regularly, need to keep searching	Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.633424	2025-11-01 20:51:17.633424	188	131
201	I am in my semester break so I am very flexible	Call 26.08 (Aliana): Open to working with kids mostly, has experience reading aloud, can practice German to read aloud to kids.	Matched	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.748857	2025-11-01 20:51:17.748857	204	77
207	sometimes I have work on Fridays from 13.30	funda: sent a volunteering request dd. 28.5	To rematch	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.773944	2025-11-01 20:51:17.773944	208	194
260	My schedule might chance as from the next week	- Shawky 08.10.24: She lives in Marzahn. She is interested in working with children, doesn’t have a professional experience with them but comes from a big family from Mauritius. she is a student of business and IT at IU, she just get into the program and will send her new time availability by mail	Inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:18.186433	2025-11-01 20:51:18.186433	261	40
275		-Shawky 17.12.24:  Trained and experienced school teacher (Grundschule) from Australia and I enjoy working with Kids of all ages. Also worked as a counsellor and hypnotherapist. She is  actually available during the day, must have misunderstood the form?	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.278984	2025-11-01 20:51:18.278984	276	515
46		- Shawky 18.06.24: Had a phone call with Anna, she would love to do more activities with children and can travel beyond Friedrichshain in the weekends. I talked to her about KindekulturMonat and sent documents	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:15.703277	2025-11-01 20:51:15.703277	46	161
47			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:15.712047	2025-11-01 20:51:15.712047	48	160
55		Funda- had a video chat on June 3rd, can volunteer for June 19th\n\nSenya 26.06.2025: He is currently attending C1 Deutschkurs and would like not to miss his classes. He can only accept requests after 2 p.m.	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:15.950848	2025-11-01 20:51:15.950848	56	170
56	Nein		Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:15.958154	2025-11-01 20:51:15.958154	57	207
58		funda: volunteered on May 31st, a request sent on June 4th	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:15.987005	2025-11-01 20:51:15.987005	59	263
64	No	- Shawky 07.08.2024: We talked briefly on the phone and he wants to come meet us at the office. We scheduled a “visit” on August 13th	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.155712	2025-11-01 20:51:16.155712	65	526
80		18.11.24, Nadav: She sent a remider email and we phonecalled. she can volunteer during working hours in the first 2-3 times. afterwards in the hhours mentioned here. Need to match her this week with one on´f the storkowerstr RACs maybe @Senya	New	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:16.319428	2025-11-01 20:51:16.319428	81	49
103			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.63134	2025-11-01 20:51:16.63134	104	1
104	Contacted for post-match followup		Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.638987	2025-11-01 20:51:16.638987	105	296
109	I am working shifts (early, late or night) so it really depends on my work schedule. Usually I am off monday and tuesday, so would be available in the afternoon (but again that can change from to week)	- Shawky 29.10.24: She has some experience with people on the move as I worked for 2 years at the French Red Cross as Migration coordinator in Paris, also had some actions in informal living spaces (camps and squats in Calais and Lyon) and some experience with unaccompanied minors in camps in Paris.	Matched	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:16.752403	2025-11-01 20:51:16.752403	110	36
110	Ich habe leider noch nicht meinen Stundenplan für die Uni bekommen deswegen kann es gut sein, dass die Zeiten an welchen ich Zeit habe sich nochmal verändern. Und ich kann erst ab dem 6.10 wieder weil ich dann erst zurück nach Berlin komme	Comes back early October, match mid-September? -Aliana	Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:16.765137	2025-11-01 20:51:16.765137	111	87
118			New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.800863	2025-11-01 20:51:16.800863	119	208
126	Ab Oktober bin ich werktags frei		Active regular	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:16.925298	2025-11-01 20:51:16.925298	128	68
131		I am Camila from Uruguay. I would be really interested in learning more about this volunteering opportunity. I am looking to be more in contact with children as the little ones bring me a lot of joy and helping them would bring me even more joy :) In case it's relevant, my German skills are A2-B1, my native language is Spanish and I'm native level speaker in English.At the moment I have availability to come on weekdays at the stated times 18-19:30 Uhr) -Vostel	To rematch	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.960727	2025-11-01 20:51:16.960727	132	190
137	Contact me via whatsapp if needed whenever and I will see my availability	- Shawky 24.09.2024: Email forwarded to Funda (I am officially B2 German yet I had a C1 6months course. I chose only basic-fluent since in the form there were no intermediate options. Yes I would be comfortable being a Dolmetscher in both De/En/Ar if needed, yet I am more confident speaking Ar/En.)	Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.113255	2025-11-01 20:51:17.113255	138	55
140	I'd like to work in gardening, planting trees, etc., and I can also help sort clothes. I'm a teacher with 15 years of experience in Venezuela, but I've only been here in Germany for a short time.	nadav 11.6: i tried to telegramm call and text, he is not very reactive. i gave up. doesnt seem to have much opportunities for him either..	Temp inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.141341	2025-11-01 20:51:17.141341	141	385
156		- Shawky 15.10.24: Masters degree in accounting and finance, has banking background. He plays football, volleyball, table tennis, Now looking for a job while taking a German course everyday from 1.00 to 4.30	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.259794	2025-11-01 20:51:17.259794	157	48
163		- Shawky 23.05.24: Asked her about the daycare opportunity in Chauseestr. / I'm a Turkish woman and I've been living in Berlin for 10 months. My native language is Turkish and I speak English fluently. I have a basic level of proficiency in German and I'm trying to improve it. I completed my bachelor in Sociology in Turkey and I'm currently pursuing a master's degree in urban studies. I've been working with children for a while now, providing care services to children from needy families. I am patient with children and genuinely interested in their world.-Vostel	Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.311893	2025-11-01 20:51:17.311893	164	195
178	As I am a student and have a mini job as well, my availability might change throughout the next months because of possible classes or be subject to meetings scheduled for my job. I think I still have to figure out how to best integrate volunteer work into my usual schedule. / Contacted for post-match followup.	Shawky 31.07.25: She talked to the coordinator at Trachenbergring (https://www.notion.so/Trachenbergring-54403e371fcd447cb9934d556427c503?pvs=21)  about the problem that the children are not attending her hip hop, and then agreed that she would join other projects they are doing just to get to know the kids so that they get to know her. She feels that people at the accommodation center there are not coordinated. She is now volunteering at another accommodation center Refugium Hausvaterweg (https://www.notion.so/Refugium-Hausvaterweg-86c3031b76ee473b8005241a0d82bae4?pvs=21) : She gets a text from them when they need something, mostly helping with children, accompanying them to the cinema, the zoo, etc..), I offered her a T-shirt and sent event invitation for 8. August	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.530543	2025-11-01 20:51:17.530543	179	268
196			New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.694581	2025-11-01 20:51:17.694581	197	534
203	I don’t have my university schedule yet, so I will have to adjust	- Email from Hubert 05.09.24: Thank you very much for your e mail.I’m doing volunteering to be helpful so if your need is having people to translate in pankow … I can give it a try. This way I will be able to I can see how realist it is with strassbahne (1 hour to come and 1 hour to come back at least) and how I feel there.I can’t promise for now that I will accept this mission, but I’m motivated to give it a try !! Waiting for your answerBest wishes	Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:17.748963	2025-11-01 20:51:17.748963	203	71
242	Generally flexible for anytime	I am a 24 year old Syrian and currently finishing my academic journey at FU Berlin. I can speak English and Arabic with mother tongue proficiency, fluent in German, and can understand and slightly communicate in Spanish. Lately I've been finding myself to be a children magnet, so I cannot imagine a better place to help, especially with anything art related as I also think of myself as an artist and have slight experience with guiding art workshops for children.  -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.990479	2025-11-01 20:51:17.990479	244	149
251			New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.054624	2025-11-01 20:51:18.054624	252	405
257		Funda- had a video chat on June 6th	Temp inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.101824	2025-11-01 20:51:18.101824	257	193
265			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.204099	2025-11-01 20:51:18.204099	265	177
271			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.223464	2025-11-01 20:51:18.223464	272	295
376			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.350858	2025-11-01 20:51:19.350858	377	478
49		Bin männlich, 30 Jahre hier in Berlin geboren und helfe gerne aus wenn ich kann. Ich hab mal ein Ökologisches Freiwilliges Jahr gemacht also mit Unkraut kenn ich mich aus.   -Vostel	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.717052	2025-11-01 20:51:15.717052	50	203
52	I am very flexible, I can volunteer when most convenient for you!	Vostel: I am a freelance graphic designer and I love all things arty so I would absolutely love to get involved with arts and craft with the children. When I was at university I spent summer holidays working at a kids summer camp in London and so enjoyed being surrounded by children and working hard to make them have a good time! -Vostel	Active regular	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.916595	2025-11-01 20:51:15.916595	53	88
60			Opportunity sent	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.018983	2025-11-01 20:51:16.018983	61	276
62		- Shawky 15.10.2024: He attended Voluntea with Alia and would like to do sports activities in the weekend. He is only available on weekends or evenings.	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:16.140239	2025-11-01 20:51:16.140239	63	38
69			Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.190196	2025-11-01 20:51:16.190196	70	529
72			Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.201148	2025-11-01 20:51:16.201148	73	289
78	I’d most preferably to have on Tuesdays but other days are also fine!	nadav 19.11.24: called, she is up for locations outside xberg but not far away ones - so well connected racs around the ring are ok but nothing crazy- better nk though. @Senya who is in need for nachhilfe in these days i would want to send her two options tomorrow morning together with the CGC request . 27.11:_waiting for @Senya for matching email	Inactive	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:16.302893	2025-11-01 20:51:16.302893	79	10
96		I live in Berlin. Im Internet in volunteering my time to repair cycles. I am a cyclist myself and have a decent knowhow of cycle repair. With the right tools I have repaired and maintained my own cycles. -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.577815	2025-11-01 20:51:16.577815	97	124
116	I finish my work every day at 15 mon-fri	- Shawky 18.07.2024: He is only interested in bike repair and lives in Wedding. If there is something nearby, he can do it. I told him we will keep him posted / Looking for regular volunteer activity, already did bike repair for some days -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:16.787664	2025-11-01 20:51:16.787664	116	136
148	Contacted for post-match followup	- Funda 27.05.2024: Contacted for translation, she can translate to English, says her German is not good enough	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.162413	2025-11-01 20:51:17.162413	148	275
159			New	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.268069	2025-11-01 20:51:17.268069	160	92
165	My schedule changes from day to day, so I might be able to help more or less depending on the schedule	Funda is already in touch for translation appointments	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.321324	2025-11-01 20:51:17.321324	165	184
169	I work as a model and I have a flexible routine. I never really know when I’m going to have work so I checked most times and days.		Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.465171	2025-11-01 20:51:17.465171	171	18
188		Translation feedback form sent to the volunteer	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.636613	2025-11-01 20:51:17.636613	189	78
191		I'm a part-time illustrator and web designer with lots of free time on my hands. -Vostel	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.646472	2025-11-01 20:51:17.646472	192	226
218		- Shawky 24.09.2024: I talked to her on the phone, asked her to get in touch with the GU since she didn’t hear back from them, and sent her the EFZ information	Active regular	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:17.86826	2025-11-01 20:51:17.86826	220	70
227			New	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.886179	2025-11-01 20:51:17.886179	229	491
230	nice to hear		New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.893043	2025-11-01 20:51:17.893043	231	334
234		Shawky 26.06.25: Seit 6 Jahren wohnt sie in Deutschland, hat als eine Yoga lehrerin gearbeitet und hat sich schon in einem Heim in Zehlendorf ehrenamtlich engagiert. Arbeitet jetzt nicht und hat Zeit, sie bevorzugt Deutsch für Kommunikation aber kann Yogakursen nur auf Englisch oder Farsi anbieten. (Also very happy to do accompanying or anything else if needed)	Active accompany	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:17.929485	2025-11-01 20:51:17.929485	235	369
244	Full availability at the moment however this may change upon employment / Experience working with kids, Pediatric occupational therapist in Australia, film and photography. A1.2 language course. Experience in arts/crafts with kids -Vostel.	I have just moved to Berlin from Australia and am looking to volunteer with where I can. I have an appointment in mid August to get a working holiday visa for 1 year. I have extensive experience working with children and was a paediatric Occupational Therapist in Australia. I have also worked in the film and photography industry for many years. I have just finished my A1.2 intensive language course however, please note, I am still at a very basic level of understanding and speaking ability thus far. Whilst completing the language course in Mainz, I volunteered to engage in arts and crafts with the refugee kids so have some experience in this work already - I would love to continue this here in Berlin!  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.992368	2025-11-01 20:51:17.992368	245	121
249	i'm mostly very flexible due to work, sometimes i have to work on weekends but then i'm free during the week, this can vary from week to week		Inactive	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:18.01095	2025-11-01 20:51:18.01095	250	221
258			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.140235	2025-11-01 20:51:18.140235	259	365
268		funda: “I have been attending my Deutsch B2 class Monday through Friday between 12:00 PM and 03:15 PM.The class will approximately last until mid March next year and unfortunately I will not be able to volunteer during the mentioned timeframe.”	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.212034	2025-11-01 20:51:18.212034	269	281
322	I might need to adjust my schedule if I get hired by an employer.		New	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.754495	2025-11-01 20:51:18.754495	323	251
330			Matched	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:18.889835	2025-11-01 20:51:18.889835	331	98
332		Nadav 3.12.24: phone call - Student she wants to support in translation and in regular volunteering. Sound very excited and is interested in the certificate for volunteering. mentioned long term volunteering. has experience in it. We saw her EFZ. need to be matched with RAC @Senya and get a video call @Funda Oral	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.894956	2025-11-01 20:51:18.894956	333	530
336	Hey! I would love to help out. I currently work at an NGO which does an online 'sprachcafé' and I would be more than happy to use what I have learned through organising this:) Or generally would be keen to help.	Shawky 16.04.25: She works as a community manager at an NGO, and leads an online Sprachcafe there once a week. She likes knitting and doing collages and happy to participate in Fraunecafes. Her German level is C1/C2, and she is available mostly in the mornings (until 2), but can also be flexible according to the needs, so you can discuss the details together.	Matched	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:18.925076	2025-11-01 20:51:18.925076	337	436
375		lives in fhain can get to stokowerstr. wants to volunteer in whatever in lichtenberg etc. unimployed right now\nSenya 05.08.2025 - The VC confirmed, that he’s active in the RAC	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.346582	2025-11-01 20:51:19.346582	376	431
446		Shawky 22.07.25: Spoke briefly, he was at a workshop and we agree to talk in the next couple of days. \nShawky 31.07.25: Er hat von uns beim lesbisch-schwulen Fest gehört, In Berlin aufgewachsen, arbeitet geade in Workshops , Teams, Spricht Deutsch und Englisch und kann gern mit Jungs und Mädchen arbeiten. Er wohnt in Wedding und kann in die GU Freitags gehen.	To rematch	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:19.939328	2025-11-01 20:51:19.939328	448	328
50	I am allowed to take 1 day for volunteering each month. Fridays would work best with my work schedule. If possible.	Helping kids have fun and learn through art and play sounds like an amazing way to use my volunteering time. I have basic German language skills (A2.1) and have worked with children before, teaching English in Vietnam.  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.748774	2025-11-01 20:51:15.748774	51	236
53	I can only work until October	Came to Germany as a refugee 5 years ago, fluent in German and English, Arabic native language -Vostel\n\nEmail to Shawky 2.10.24: I met with Tamer and have been tutoring primary school children at the accommodation for the past two weeks. However, I recently started college, and it has become increasingly difficult to find time for volunteer work.\nI’ve spoken to Tamer to see if we can find a solution that works for both of us. If we are unable to resolve the situation, I may have to step back from the role, unfortunately.\nThank you for your understanding, and I’ll keep you updated on the outcome.	Active regular	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:15.921081	2025-11-01 20:51:15.921081	54	109
74	Contacted for post-match followup	- Shawky 26.03.2024: We put her in contact with Columbiadamm for yoga classes, then she sent them an email saying she has an emergency	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.205593	2025-11-01 20:51:16.205593	76	299
86			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.405421	2025-11-01 20:51:16.405421	86	260
93		- Shawky 11.07.2024: She lives in Essen, can’t come to Berlin	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.557316	2025-11-01 20:51:16.557316	94	142
95			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.569654	2025-11-01 20:51:16.569654	96	156
125	Ich habe von Montag bis Donnerstag einen Deutschkurs. Am liebsten die restlichen drei Tage nachmittags und abends.	Senya 05.11.24: She went to Am Oberhafen (https://www.notion.so/Am-Oberhafen-f3ab29b6848a447e9d03e1e6ed167ce0?pvs=21) and ended up not volunteering because she has some problems with the JobCenter. The VC mentioned that it seemed like she was only there for a certificate that she was volunteering.	Inactive	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:16.911672	2025-11-01 20:51:16.911672	126	64
127			Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:16.926059	2025-11-01 20:51:16.926059	127	69
129			Matched	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.946127	2025-11-01 20:51:16.946127	130	127
133			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.975212	2025-11-01 20:51:16.975212	133	241
141		Senya 05.11.24: She sent an email to Shawky on Oct 29th saying that she’s moving to Jordan and stops volunteering for a while, but will get back to the VC of Refugium Lichtenberg once she comes back.	Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.14367	2025-11-01 20:51:17.14367	142	164
147		- Shawky 29.05.2024: Sent follow up email to both her and Alba. They are active and happy 🙂 / I'm Andrea, a 25 year old Spanish girl who just landed in Berlin. I've studied International Cooperation and specialized in work with migrants and/or refugees. -Vostel	Active regular	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.161586	2025-11-01 20:51:17.161586	149	264
150		JC /03.07.2025 I spoke with him — he is currently studying for a Master's degree in Economics here in Berlin. He has experience working with children and can assist with small festivals. He is interested in volunteering on a regular basis.	New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.201264	2025-11-01 20:51:17.201264	151	366
166	Actually im not into regular volunteering as im working whenever im free i do volunteering	Lives in Stuttgart, wanted to come to the Spring Festival in Pankow,\nbut cancelled a week before	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.330719	2025-11-01 20:51:17.330719	167	269
181		Shawky 31.10.24: wants to help with daycare for refugee children for 1-2 hours per week. She already worked in the refugee home in Tegel, has a migration background herself and currently has more free time. Can support with homework -  lives in Neuköln.	Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.612212	2025-11-01 20:51:17.612212	182	33
185		Funda: sent an email for a video chat // Has a C2 English certificate.	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.622049	2025-11-01 20:51:17.622049	185	95
186	I will start studying in the middle of September and don't know yet what the schedule will be, but I will naturally be much less available.	Mein Deutsch ist schon okay, ich wohn und arbeit hier in deutschland schon zeit 5 jahren, und sprech auch Englisch, Italienisch, und Französisch. Ich will gerne probieren bei euch zu hilfen. Ich will und versuch trotzdem zu mein deutsch bessern und mein vocabulär expandieren. Ich hab noch fass kein erfahrung beim volunteer working aber will gerne jetzt anfangen zu es ein regulär sache in mein leben haben -Vosel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.63199	2025-11-01 20:51:17.63199	187	100
202	Hello! In the past I was volunteering in a cafe where we were taking care of refugee kids while their parents were attending a german course. Something like this or something like doing arts or crafts / leisure time activities with the kids, would be awesome. I habe basic skills in arabic. And I would like to volunteer approx 2h a week. Kind regards, Jenny		Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.748051	2025-11-01 20:51:17.748051	202	82
205	Maybe I’ll only be available until the end of September	- Shawky 06.08.24: She is doing her PhD in France about the representation of refugees in mass media. \n- Senya 06.11.24: She went back to France and is not active anymore. I got this info from the VC of Buschkrugallee	Inactive	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:17.755262	2025-11-01 20:51:17.755262	205	126
206			Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.76143	2025-11-01 20:51:17.76143	207	159
210			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.790516	2025-11-01 20:51:17.790516	212	285
217		She wants to volunteer alone. i asked about the ring area, if its 30-40 min ride from her area its ok. want to translate of needed. wants to come to voluntea	Matched	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:17.863519	2025-11-01 20:51:17.863519	218	524
220	I‘m also available for flexible/one time translations at different times	funda wrote a welcome email	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.870383	2025-11-01 20:51:17.870383	221	58
250	Contacted for post-match followup		Matched	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.019761	2025-11-01 20:51:18.019761	251	259
263	It all depends on my kids' schedule, so when the school or Kita are closed, I won't be available.	-Funda had a video chat on June 12	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.198391	2025-11-01 20:51:18.198391	264	174
274		She contacted us through Instagram for a particular opportunity (Nadav responded, early April 2025)	Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.260021	2025-11-01 20:51:18.260021	275	445
277		- Shawky 07.11. 2024: She is a native German speaker and is happy to help with anything related to language support for children or adults. She lives in Gesundbrunnen.	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.283144	2025-11-01 20:51:18.283144	278	23
304			Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.579371	2025-11-01 20:51:18.579371	305	533
308			New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.628098	2025-11-01 20:51:18.628098	309	473
324			Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.77084	2025-11-01 20:51:18.77084	325	336
342		Shawky 29.07.25: Asked JC to call, since they are interested mainly in accompanying	New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.962624	2025-11-01 20:51:18.962624	343	325
344	I am from Hungary, and i would like to volunteer for two weeks in June!	Nadav:we exchanged emails i let her know its not relevant the june two weeks thing	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.997927	2025-11-01 20:51:18.997927	345	407
350		I just filled up the form and I forgot to mention one moment, that I am looking forward to be volunteering and that could be anywhere from one month to 6, is that would be okey ? (Vostel, 7.11.2024)\n\nWe had a call. unclear employment situation, now he has time and preffer to do single actions so accompany in english or in no languge or events	Inactive	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.020608	2025-11-01 20:51:19.020608	351	25
51		- Shawky 11.03.2024: Checking with Tegel RAC if she could do daycare starting 16.00\n- Senya 06.11.24: She is still active in Chaussestr.	Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:15.769522	2025-11-01 20:51:15.769522	52	309
76	can be flexible		Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.203331	2025-11-01 20:51:16.203331	75	274
91	This is a test from Onur ARICI		Active regular	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.457319	2025-11-01 20:51:16.457319	92	467
100	n/a		New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.612545	2025-11-01 20:51:16.612545	101	235
128			Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.937827	2025-11-01 20:51:16.937827	129	116
134			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.978199	2025-11-01 20:51:16.978199	134	234
136		nadav: had a phone call. she is limited in her schedule but interested in supporting. invalidenstr and chuessestr sound like the only options.	Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.099742	2025-11-01 20:51:17.099742	137	15
142		I’m fluent in English and Russian and live in Neukölln (S/U bahn Hermannstrasse). I can be available in the first half of the day on weekdays except for Friday.  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.146931	2025-11-01 20:51:17.146931	143	188
145			Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.159175	2025-11-01 20:51:17.159175	146	277
167	Hello,\nMy name is Adam. I have read this position with interest. \nI am unemployed at the moment with loads of free time.\nI used to babysit and would like to become an Erzieher. / Contacted for post-match followup.		Matched	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.334719	2025-11-01 20:51:17.334719	168	265
183		- Shawky 26.09.24: Sent her a follow up message on WhatsApp to see if she got in touch with the GU	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.611144	2025-11-01 20:51:17.611144	183	56
195	I work in the evenings during the weekday.  Currently need to be home by 4pm.		Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.658308	2025-11-01 20:51:17.658308	196	250
200			To rematch	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.741678	2025-11-01 20:51:17.741678	201	19
208	Available time as it is for now, but I would have to make changes to it in the future due to different reasons	I live in Berlin (Moabit) and would like to support with translation for refugees. I am fluent in English and am native in Russian and Ukrainian. -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.781785	2025-11-01 20:51:17.781785	209	209
237	I may have additional availability during the weekdays, however it depends on my work schedule and meetings, therefore it is difficult to commit to a slot on a regular basis.		Active accompany	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:17.979568	2025-11-01 20:51:17.979568	240	84
241			Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.989847	2025-11-01 20:51:17.989847	243	122
264		Funda had a video chat on June 5th /  I was an English teacher for kids in Iran for 5 years and a volunteer at a refugee center in Romania. I speak Pashto, Persian English, and learning German. I think I can be a useful person at this place, I love kids and taking care of them.  -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.205	2025-11-01 20:51:18.205	267	191
287	von 9-17 bin ich nicht verfügbar unter der Woche aber danach und am Wochenende ziemlich flexibel		Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.384014	2025-11-01 20:51:18.384014	287	106
291			Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.398983	2025-11-01 20:51:18.398983	292	256
298			Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.532733	2025-11-01 20:51:18.532733	299	321
312			Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.65078	2025-11-01 20:51:18.65078	313	44
315	I am a working student and my schedule changes every semester so I would have to modify it according to that.		Temp inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.664082	2025-11-01 20:51:18.664082	316	279
317		- Shawky 16.10.25: Background in public relations, media work, etc for the US embassy. Still not clear whether she will be in Berlin after March/April, so would be ideal for something short term like kitchen or Kleiderkammer support	To rematch	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.719523	2025-11-01 20:51:18.719523	318	496
318	My schedule is flexible. I can accommodate different time periods, if agreed in advance.	18.11.24 Nadav: Phone call i asked him about this : https://www.notion.so/Unterst-tzung-bei-der-Einrichtung-eines-Raums-f-r-Jugendliche-in-Lichtenberg-11f8d880f474802f98adfdbe331f1bb0?pvs=21\nHe said yes. he is ca 60 years old flexi times has kids. souds exicited. his german is good for communication (i estimate b2) but not translation. his french should be fluent. native portugese. @Senya i will sent a CGC email you can sent the intro to the RAC?	Matched	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:18.730631	2025-11-01 20:51:18.730631	319	12
319	Shawky 01.08.2024: She used to be a school teacher for math and physics back in Yemen	Hi all!I’m sorry for the late reply. Life has gotten quite busy, and unfortunately, I won’t be able to help this year. However, I hope to be able to assist next year when things settle down, and I’ll contact you when I’m in a better position to help. (Email to Shawky 08.10.24)	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.737852	2025-11-01 20:51:18.737852	320	96
340	I would mostly prefer the weekend. However, If that is not possible all the time, I can avail myself during the afternoon on some weekdays with prior notice. I live in Frankfurt (Oder).	- Shawky 22.10.24: He lives in Frankfurt Oder, but can come to Berlin for Nachhilfe (English not German). He is doing his PhD in entrepreneurship management with a focus on refugees, and worked for a law firm in the UK, where he also provided support for asylum seekers. He speaks English, Bengali, Urdu and Hindi.	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.95301	2025-11-01 20:51:18.95301	341	30
353		JC / 02.07.2025 / I spoke with her, and she’s still interested in volunteering from time to time. She is interested in working with kids and women, has musical skills. I’ll send her the documents (EFZ application, etc.) tomorrow.	To rematch	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.04843	2025-11-01 20:51:19.04843	354	378
357	Times are flexible. Preference would be teaching kids chess/guitar	Shawky 3.6.25: He is a programmer. He has taught guitar before, and is also interested in teaching chess as well to children or adults. He has 2 children of his own, and wanted to make sure the Arabs/Muslims in the GU would be ok having an Israeli volunteer.\nShawky 22.7.25: He started volunteering at the Playroom in Buschkrugallee (Hotel Centro) (https://www.notion.so/Buschkrugallee-Hotel-Centro-91145604e0f64dbda9d14d642bd41462?pvs=21), he feels it is a bit far. I told him to let us know when the commute starts to feel too much.	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:19.110512	2025-11-01 20:51:19.110512	358	389
361		Shawky 15.07.25: She volunteered before in an Erstaufnahmeeinrichtung, she did a lot of translation there when it was needed and was involved in Frauencafe. She is a fulltime student at FU and doing 2 jobs. Until October, she can do it during the week.\nShawky 22.07.25: Message from volunteer coordinator “Lieber Arsenii,\nvielen Dank für die Herstellung des Kontakts! Anamaria und ich haben jetzt für den 29.07 einen Kennlerntermin vereinbart.\nLiebe Grüße\nLaura”	Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.173298	2025-11-01 20:51:19.173298	362	348
364		- Shawky 22.10.24: She worked with children before in a Kindergarten, but she is not really interested in organizing activities for children, but she can spend some time with them, etc. She is interested in dealing with humans mainly.	Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.232181	2025-11-01 20:51:19.232181	365	32
365			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.245325	2025-11-01 20:51:19.245325	366	500
391		Shawky 27.05.2025: Queer, Half German, half South-African. He is currently not working yet, so is flexible with time. He has a particular interest in arts & crafts with children: painting and watercolor. He is fluent in German, and works in communication (PR and internal communications within the company and event management). Volunteered before at soup kitchens. He is here till the end of July, away for 3 months but coming back.	Temp inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:19.461462	2025-11-01 20:51:19.461462	392	384
54	It changes the next month.	Doesn’t live in Berlin	Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:15.924886	2025-11-01 20:51:15.924886	55	137
79			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.308326	2025-11-01 20:51:16.308326	80	28
84	No	- Shawky 29.05.2024: Sent follow up email to both her and Andrea. They are active and happy 🙂	Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:16.38844	2025-11-01 20:51:16.38844	85	213
92			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.532854	2025-11-01 20:51:16.532854	93	8
120	I have a full time job during the weekday (8 to 6pm) so I can only work outside of these hours	I don't have much experience with gardening, but I'm really eager to learn. I'm a fast learner and super motivated to jump in and help out. -Altai	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.814459	2025-11-01 20:51:16.814459	121	239
123	-	Jamie / Nadav: not respond no whatsapp no telegram	Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.838831	2025-11-01 20:51:16.838831	124	294
132		funda has sent a request on June 4th re translation request	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.974289	2025-11-01 20:51:16.974289	135	222
146			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.16016	2025-11-01 20:51:17.16016	147	253
151		18.11.24 Nadav: CALLED AND ASKED ABOUT karl marx strasse https://www.notion.so/Sprachtandem-in-Neuk-lln-59227f8b06a245a6acc8e23a519de1e0?pvs=21. She is into that. @Senya would be nice to have a matching email ! Danke she will apply for cgc herself she has german id so she can do it online. \n- All Nachhilfe but Math, very interested in sports with children and dancing	Active regular	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:17.242828	2025-11-01 20:51:17.242828	152	520
152	Grundkenntnisse Arabisch ist auch sehr hochgegriffen;	Nadav 19.11.24< we had a phone call. SHe cannot befire 18 so i suggested sprachkafe https://www.notion.so/600f99bd3879463facda780e28a503ca?pvs=21 or spielraum neueköln on wedsdays she agreed. i wll ask for docs for CGC and ׂׂׂsenya if can you email sonja and sophie would be great @Senya	Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.249468	2025-11-01 20:51:17.249468	153	6
164			Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.318722	2025-11-01 20:51:17.318722	166	215
175		- Shawky 24.05.2024: She did a Measles vaccination at the US, but has no proof of it	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.519289	2025-11-01 20:51:17.519289	177	200
177		I'd like to start helping out once or twice a month? I work afternoon - night so I have flexibility in mornings.  -Vostel	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.529609	2025-11-01 20:51:17.529609	178	212
214		- Shawky 11.11. 2024: She already filled out the form before, so I sent her an email “I hope this email finds you well. I just saw that you've filled out our volunteering form again, so I just wanted to double check with you if everything is going well, or if there is anything else I could help with.”	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.85276	2025-11-01 20:51:17.85276	215	17
221		Have been doing this on my bikes for longer than I can remember..… -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.871468	2025-11-01 20:51:17.871468	222	107
231		funda-contacted for 1st week of June	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.895991	2025-11-01 20:51:17.895991	232	232
233		Shawky 22.07.25: Spoke briefly, she will call back tomorrow (Wednesday)	To rematch	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.902257	2025-11-01 20:51:17.902257	234	330
238			Active accompany	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:17.978554	2025-11-01 20:51:17.978554	238	61
279	I will be on vacation outside of Berlin until the 28th of June, but afterwards, I will be in Berlin and can commit to the hours marked above.	Nadav 10,07.25: she is leaving Berlin to amsterdam but just in case i tried to send her the sommerfest Aufbau abbau for tomorrow she showd interest i told her to call the coordinator directly if she is really up for it.	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.297312	2025-11-01 20:51:18.297312	280	134
292		- Nadav Nir Begin forwarded message:From: Volunteer <mailto:volunteer@need4deed.org>Date: 19. September 2024 at 16:00:31 CESTTo: mailto:o.smetanka@icloud.comSubject: Re: Volunteer OpportunitiesHey again, I just thought about another option if you are interested it would perhaps be the most effective one!Members of a women’s group in the refugee accommodation centre in NK (Frauencafe) would like to go out and learn more about Berlin. Volunteers can take them to museums, walk around the neighbourhood or do other fun things. Museums and galleries sometimes provide free tickets for refugees.What do you think?On Thu, Sep 19, 2024 at 3:12 PM Volunteer <mailto:volunteer@need4deed.org> wrote:Thank you for your interest in volunteering through Need4Deed! Most of the opportunities are before 17 so if your schedule is sometimes flexible it would be great to know. Otherwise, there is currently a need in supporting Sommerfest at the 24.09.24 in Lichtenberg 10315. This means either helping out before, during or after! Would this be something you would be interested in? Thanks!	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.476445	2025-11-01 20:51:18.476445	293	50
313	I am only available for the rest of August		Active regular	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:18.651452	2025-11-01 20:51:18.651452	314	86
323		Shawky 23.6.24: We spoke briefly, she will call back after an appointment. I am thinking of this opportunity for her: Freizeitaktivitäten- und/oder Freizeitangebote für Frauen (https://www.notion.so/Freizeitaktivit-ten-und-oder-Freizeitangebote-f-r-Frauen-2098d880f474818d9811f7632f88ac65?pvs=21). Nadav 09.07.25: she texted us on the phone wanting to get a certificate for volunteering and mentioning the volunteering has not started yet. \nShawky 31.07.25: She is leaving Berlin in September	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.760246	2025-11-01 20:51:18.760246	324	375
335		Peyvand 10.6.25: you pronounce “Jan” not Can. He seems really cool and flexible and will also ask some friends to fill out the volunteering form. :) Lichtenberg, Marzahn would also be ok for him. Interested in one day volunteering or accompanying. He offered to do one time Yoga with a friend for example	Active accompany	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:18.924329	2025-11-01 20:51:18.924329	336	371
337	Please just email or message me to contact me.		New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.92987	2025-11-01 20:51:18.92987	338	465
356	Hello here,  I am currently looking for an opportunity to volunteer and realize myself in this need.  I am from Ukraine and have been living and working in Berlin for over a year, studying the language.  I am fluent in Ukrainian and Russian. A little worse in English and at an intermediate level in German. But I am constantly working on it.  I work in the IT field, but in the past, while studying at the university, I worked part-time as a tutor in mathematics, Ukrainian language and history mostly with young people.  If you suddenly have a need, I can find free time after 6 pm (Monday, Wednesday, and also up to 3 hours on weekends).  Best wishes, Vadym		Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.060736	2025-11-01 20:51:19.060736	357	415
360		- Shawky 25.03.2025: He’s an actor (stage and screen), went to art school, studied photography. Does pottery, and had many years experience as a gardener in London. He had experience working with children in a center for kids with autism, helped them learn to read, can also help with Engliish homework. Born in 1976 (does he need a Measles vaccination?), open to commuting up to an hour.	Matched	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.123731	2025-11-01 20:51:19.123731	361	458
363		- Shawky 21.01.25: She’s from Canada, used to teach dancing classes to children. She is passionate about dancing (hip hop, break dance,), practices meditation and has guided some people before, not professionally though. She is a corporate lawyer, particularly interested in refugee and immigration law, but not an expert. She has a lawyer friend who lives in Frankfurt Oder and could ask if they would be interested in supporting with an event like a panel or post-film discussion. She lives in Wedding and can only volunteer on weekends. Her German level is C1.	Matched	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.231655	2025-11-01 20:51:19.231655	364	490
67			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.17729	2025-11-01 20:51:16.17729	68	189
90			Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:16.429344	2025-11-01 20:51:16.429344	91	257
102			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:16.624632	2025-11-01 20:51:16.624632	103	255
105	Monday - Thursday might be hard for me as I need to work at 9 am		To rematch	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:16.646798	2025-11-01 20:51:16.646798	106	305
114	I travel a lot so I cannot guarantee availability every week.	Lumi: Danke für die Anfrage, das schaffe ich leider nicht an dem Tag wegen Arbeit. Aber frag mich weiterhin immer gerne an. Nadav: she had a very bad luck already 4 opportunities that it was not needed both acccompanying and regular, emailed her with opportunuies 09,.7	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:16.782218	2025-11-01 20:51:16.782218	115	132
130	Ich bin eigentlich flexibel aber dass sind doch meine Präferenzen	“Meine Erfahrungen liegen zwar 20 Jahre zurück, als ich als Vertretungslehrer und Pädagoge in der Nachmittagsbetreuung von Kindern gearbeitet habe. In den letzten Jahren hatte ich jedoch viel Gelegenheit, mit meinem jetzt sechsjährigen Neffen zu spielen und Zeit zu verbringen” -Vostel	Active regular	\N	\N	\N	\N	\N	\N	undefined	yes	2025-11-01 20:51:16.952611	2025-11-01 20:51:16.952611	131	103
139	I am available from July 22 on and then for a couple of weeks as indicated above. After that I enter back into a tighter work schedule.		New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.136206	2025-11-01 20:51:17.136206	140	129
149	I will probably start working as a freelancer / full time and/or German classes in near future so i don't know about my available times yet		Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.166254	2025-11-01 20:51:17.166254	150	288
158	In the end, availability depends on the workload, so it's difficult to say what would be possible during the week.		Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.266015	2025-11-01 20:51:17.266015	159	89
176	no		Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.52031	2025-11-01 20:51:17.52031	175	202
190	I’m in town for 3 months doing research and am flexible in my schedule, though will be busy at different times for different meetings		Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.645492	2025-11-01 20:51:17.645492	191	155
192		- funda: can volunteer for July 1st\n- Shawky 23.01.25: We spoke again about her volunteering interests. She is working more this year, so is available occasionally, ideally for one-day events or so. @Senya connected her with Refugium Lichtenberg for the Kleiderkammer.	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.649263	2025-11-01 20:51:17.649263	193	211
194		- Shawky 13.06.24: There is a volunteering opportunity available in Pankow (Buchholz Straße) on Saturdays between 12.00 and 14.00  to do various activities for children, and they are quite flexible about what that activity would be. / While I may not possess specific language skills beyond basic German, I am a quick learner and a dedicated worker.  -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.652657	2025-11-01 20:51:17.652657	195	180
209			Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:17.788472	2025-11-01 20:51:17.788472	211	278
216		- Shawky 11.11.24: “Thanks a lot for filling out Need4Deed's information form and for your interest in volunteering at refugee accommodation centers. You mentioned you were specifically interested in helping with sorting out clothes, but the accommodation center in Tempelhof needs volunteers on Tuesdays and Thursdays from 12 to 2 p.m. and you don't seem to be free during those times according to the form. Can you please let us know if anything changed in your schedule?\nOtherwise, we have a few other volunteering opportunities in different locations in Berlin. Could you please have a look here and let us know if something seems relevant and convenient for you?”	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.855752	2025-11-01 20:51:17.855752	217	13
224		04.11.24 - Senya talked to him, he works at Tesla, is available for appointments and is coming to the volunTEA on the 7th of November	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.881097	2025-11-01 20:51:17.881097	225	145
228			Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:17.887125	2025-11-01 20:51:17.887125	228	167
247		I am Sandra from Sri Lanka. I am 19 and I completed the Advanced Level recently. Now I am seeking for jobs. Also hope to pursue my higher studies… I love kids and enjoy working with them. I do have experience in childcare. I am confident that my communication and interpersonal skills would allow me to make meaningful contributions to your team. -Vostel	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.000858	2025-11-01 20:51:18.000858	248	216
261			Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.194765	2025-11-01 20:51:18.194765	262	128
262	I work full-time, but it's pretty flexible:)	He talked to Nadav in September 2024 and told him he is specifically interested in Kinderbetreuung or Tutoring	Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.198242	2025-11-01 20:51:18.198242	263	102
266	I can be sometimes available in more time slots	Experience with Red Cross, human rights association, management skills, A2 German -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.205277	2025-11-01 20:51:18.205277	266	151
273			New	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:18.256041	2025-11-01 20:51:18.256041	274	447
294			Active regular	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.478699	2025-11-01 20:51:18.478699	295	115
343			Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.994468	2025-11-01 20:51:18.994468	344	424
354			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.052939	2025-11-01 20:51:19.052939	355	363
358		Shawky: Lives in Weißensee, Studiert Germanistik, would like to do a Sprachcafe	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.111664	2025-11-01 20:51:19.111664	359	404
362		Jamie 04/7 - called, she is free all day Monday through Wednesday, is most interested in daycare/art based volunteering. Prenzlauer berg and the surrounding areas are best for her. Nadav 23.4: Senya will ask Stk 118 - they said yes we will ask for EFZ and match.	Matched	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:19.175736	2025-11-01 20:51:19.175736	363	433
381		English B2-C1. Turkish refugee. Worked as a translator for a pregnant woman 3-4 times a week.	Active accompany	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:19.379565	2025-11-01 20:51:19.379565	382	99
383	Contacted for post-match followup	- Shawky 11.03.2024: Interested in the Lichtenberg Sprachcafe	Matched	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:19.405544	2025-11-01 20:51:19.405544	384	292
386		Shawky 4.6.25: She is currently between jobs, volunteering now at Tafel on Wednesdays. She is a marketing professional, studied business administration. She did some tutoring before, and is interesting in teaching children German, English and Math.  She will be out of Berlin until June 18th.	Active regular	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:19.416682	2025-11-01 20:51:19.416682	387	379
388			Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.438278	2025-11-01 20:51:19.438278	389	444
408	During the week generally available after 17 due to work obligations. Earlier may be possible on certain days.	- Shawky 29.10.24: He is an English-German translator (English is his mother tongue) and studied languages. He learned about us from Berlin Scholars.	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.646039	2025-11-01 20:51:19.646039	408	37
413	Ich wohne in Alt Buckow 12349. Ich hoffe, dass ich in der Nähe hier arbeiten kann.	- Shawky 15.10.24: I spoke with her on the phone, she speaks only Turkish, but wants to improve her German. Funda spoke with her and understood that she is working till 13.00 so can volunteer after that.	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.691588	2025-11-01 20:51:19.691588	414	41
419			New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.721455	2025-11-01 20:51:19.721455	420	485
422		JC / 02.07.2025 / Tryed to call but telefonumber does not exist… \nShawky/ JC 03.07.25: Sent an email asking for the correct number	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.745245	2025-11-01 20:51:19.745245	425	380
430	No		New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.818111	2025-11-01 20:51:19.818111	432	210
434	Am available weekends at any time or early in the morning on weekdays or later in the day on weekdays.		Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.848243	2025-11-01 20:51:19.848243	436	482
437			Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.857088	2025-11-01 20:51:19.857088	439	514
229	I am usually available Mon-Fri after 18:00 since I work full-time. I am free on the weekends.	- Message to Shawky 04.08.2024:  the organizor (Buchholz) reached out and offered me to start immediately. I however had to postpone this since of last minute circumstances with my job.I told them i'd be happy to start at another time in the future and they aggreed. / I am 29 years old, I come from Italy but I am also half German and can speak both languages fluently. I have lots of experience in gardening, especially with permaculture. I have two 72h permaculture design certificates, and I assisted many outdoor projects concerning greenhouses and plants all around the world, volunteering in farms as well. I studied landscape architecture in university before coming in this city. I also have experience in volunteering with refugee organisations. I moved to Berlin 2 years ago, I work a full-time office job, and I miss having my hands in the soil. If I can help in any way let me know, I live in Kreuzberg and can meet up weekly for the project. -Vostel	Matched	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.890252	2025-11-01 20:51:17.890252	230	152
236	My schedule will change in the next weeks		Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:17.977448	2025-11-01 20:51:17.977448	237	21
239		- Shawky 26.09.2024: Had a call with Hesham, he has been living here for 2 years and his German level is A1. He is starting a new job, so still on Probezeit, but in 2 weeks will be available during the day. He lives in Lichenberg and prefers to volunteer there, and has experience with different sports. Hadeer is his wife, they filled out the form at the same time.\n- Shawky 14.10.25: Initially matched to Refugium Hausvaterweg, but went once and it was too far, and they were re-matched with Storkower Straße, will meet the volunteer coordinator on 21.01.25	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:17.981453	2025-11-01 20:51:17.981453	239	66
255			Temp inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.091444	2025-11-01 20:51:18.091444	256	175
267			Temp inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.20895	2025-11-01 20:51:18.20895	268	162
276			Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.279727	2025-11-01 20:51:18.279727	277	27
280		Ich bin 42 j.a,ich arbeite als gesundheitspersonal und ich lebe seit 6 Jahren in Berlin.Meine Muttersprache ist Turkisch aber ich kann auch Deutsch und Englisch beim C1 Niveau sprechen.Sie können mich am montags unter der Nummer:0160184001 -Vostel	Temp inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.298204	2025-11-01 20:51:18.298204	281	153
282		funda: sent a request dd. 28.5	Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.310311	2025-11-01 20:51:18.310311	283	286
288	I usually work in the cultural field as an event producer.	- Shawky 15.01.25: Has mainly background in organizing cultural events, particularly with live acts. Prefers working with adults, and is quite busy in the summer, but could help with things before. He knows the queer scene and could help refugees at Kiefholzstraße	Matched	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:18.3877	2025-11-01 20:51:18.3877	289	497
289			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.392176	2025-11-01 20:51:18.392176	290	158
296		Shawky 15.05.25: Sie is Lehrkraft für die Oberstufe, unterrichtet eine Willkommensklase für Schüler*innen mit Fluchthintergrund. Sie wohnt in Alt-Treptow (PLZ 12435)\n\nShawky 23.07.25: She started a few weeks ago at Kiefholzstraße 71 (https://www.notion.so/Kiefholzstra-e-71-36d6e8e04625423b9b447766d8537999?pvs=21) and sems quite happy. Told her about the August event and asked about the T-shirt size and and address	Active regular	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:18.511859	2025-11-01 20:51:18.511859	297	406
301		- Shawky 06.11.2024: He has experience working with children, used to babysit when he in high school and college, and is now taking a class in English teaching, so would be very good for supporting with English teaching. He is a native speaker, and open to playing spotrs (although not an expert) and helping with other activities with kids and adults. Lives in Friedrichshain.	Matched	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:18.551624	2025-11-01 20:51:18.551624	301	34
309	I am working full time job, so unfortunately can support mostly on the weekends	- Shawky 15.10.24: Ukranian, came to Berlin 2 years ago. She is working full time (marketing job), she really wants to volunteer and applied to different organizations, but was rejected because of German skills. She volunteered at a cafe in Alexanderplatz on weekends. She is willing to do anything. Senya suggested putting her in touch with the Ukrainian GU at Charlottenbourg.	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.643846	2025-11-01 20:51:18.643846	310	42
320	Mein Deutschniveau ist A2. Ich setze mein weiteres Studium fort		New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.740595	2025-11-01 20:51:18.740595	321	503
321	Bei mir variieren meien Verfügbarkeiten stark, da ich gerade keine wirklich geregelte Woche habe. Gebt mir aber gerne Bescheid wann und wo ihr Menschen benötigt, ich unterstütze euch gerne!		Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.743873	2025-11-01 20:51:18.743873	322	186
326			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.82418	2025-11-01 20:51:18.82418	327	322
329		Works as data protection consultant -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.889544	2025-11-01 20:51:18.889544	330	108
341		- Shawky 22.10.24: He came to see us at the office.\n- Senya 05.11.24: He is active in GU Storkowerstr. 118 on Fridays (sports for kids)	Active regular	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:18.956939	2025-11-01 20:51:18.956939	342	39
371			Opportunity sent	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.310561	2025-11-01 20:51:19.310561	372	442
373		nadav 9.7.25: no experience in volunteeing. helped woman to find jobs related to sofdev. friay are possible . Is a Trans person and asked if thats an issue for GUs. i sent some options she lives in wedding but can bike ride to places	To rematch	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:19.332842	2025-11-01 20:51:19.332842	374	355
377			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.364119	2025-11-01 20:51:19.364119	378	472
378		Need4Deed intern Feb-April 2025	Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:19.374339	2025-11-01 20:51:19.374339	379	466
384			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.406273	2025-11-01 20:51:19.406273	385	356
390	My schedule is very irregular, so it is truly impossible to estimate availability. But if I'm notified about the event in advance (at least 2 weeks), then I can manage to fit in volunteering		Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.453174	2025-11-01 20:51:19.453174	391	138
403	Happy to teach self defence!	Friend of Theodor	Opportunity sent	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:19.627082	2025-11-01 20:51:19.627082	404	462
404		-Shawky 11.11.2024: She lives in Wedding, happy to help with Nachhilfe or Sprachcafe. Senya is in touch with Invalidentstraße to see if they are interested in her profile	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.638977	2025-11-01 20:51:19.638977	406	14
414			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.699109	2025-11-01 20:51:19.699109	415	323
420			Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.722429	2025-11-01 20:51:19.722429	421	509
433		Nadav 29.5: from argentina. doesnt have measels proof. she will go to haustzart. Has 1 year old efz. - can german b2 . she works and study, so pretty busy, can come by maybe twice a month. she can . monday wedsdays finnish earlier so maybe afternoon. Was intriduced to buschkoaklee sonja but she on vacavtion. Waiting respond from her	Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:19.847473	2025-11-01 20:51:19.847473	435	423
436	I am good at small talk but of course in German is still a bit slow. Vielen Dank Elisa Ferrari	- Shawky 23.01.25: Native English speaker, hotel manager and volunteered before with elderly people in London. She works part-time, she has done German up to B2, but hasn’t really practiced much. She would like to practice German, and lives in Schöneweide.	Inactive	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.856476	2025-11-01 20:51:19.856476	438	484
399	I would like to preferably work with kids and queer refugees.	B1 can communicate in german basics. now unimployed tue-wed.thursday are possible. need to cgc ant matching	Active accompany	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.584637	2025-11-01 20:51:19.584637	400	435
270		31.07.25: She knew about us through Bezirksamt Treptow-Köpenick, She is retired (66 years old) so doesn’t need Masernimpfung. She studies Russian and English at Humboldt university. When Germany was unified, she lost her job as translator, but is certified translator for official documents, she can do direct translation at doctors’ appointments, but needs to be briefed in advance. She worked with Ukrainian families in 2022, and worked a bit in the US, so her English is very good, She worked for an American law firm in Berlin, and then changed her career to become an IT trainer. We agreed she will start with summer festivals and see (because she is in Rente, she travels a lot and can’t commit to a fixed weekly schedule)	To rematch	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:18.215728	2025-11-01 20:51:18.215728	271	320
272		nadav: He was trying to be active in the summer now reregistered. back then tryied to do bot hregular and accopanying but it didnt work out. asked him to fillout the EFZ again (resent the same email) and i mentioned we will try to rematch and call	To rematch	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:18.23109	2025-11-01 20:51:18.23109	273	519
311		- Shawky 26.09.24: Learned from Nadav they use “they” as pronouns. They are in communciation with Nadav, they are a programmer and came to the office. They were matched to NK.  Did not get the EFZ - probably nadav messed up	Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.646866	2025-11-01 20:51:18.646866	312	67
331		I am fluent in English, French, and Moroccan Arabic and have a very adaptable schedule.  I reside in Schöneberg, but I am more than willing to commute anywhere within Berlin.  -Vostel	Matched	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:18.890305	2025-11-01 20:51:18.890305	332	197
346	N/a	Need4Deed intern Feb-April 2025	Matched	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:19.004893	2025-11-01 20:51:19.004893	347	456
349			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.019375	2025-11-01 20:51:19.019375	350	475
370			New	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.307706	2025-11-01 20:51:19.307706	370	495
379			To rematch	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.378789	2025-11-01 20:51:19.378789	380	505
405		- Shawky 26.09.2024: Learned from Nadav and Funda he is not suitable for translation\n- Shawky 22.10.24: He used to be an electrical engineer in Iran, then worked here for 8 months at Ditsch Bäckerei. He wants to improve his German, but is suited mainly for sports, I would say (He can play football)	Active accompany	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:19.639868	2025-11-01 20:51:19.639868	405	59
416	I would like to have more information on how to help with translating from French to English.		New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.708457	2025-11-01 20:51:19.708457	417	477
431	hi, zu den Zeiten: ich habe eine Auswahl angegeben, die für mich grundsätzlich regelmäßig möglich sind. Insgesamt kann ich mir so 4-8h pro Woche vorstellen. Machmal muss ich wegen des Studiums ist Arbeit über mehrere Tage wegfahren. Ich habe eine Schauspielausbildung und kann gerne, was mit Sprechen und Vorlesen machen. Außerdem Interesse an schulischer Mathematik. Gruppen geleitet habe ich noch nicht und ist mir möglicherweise zu schwierig. Ich habe ein Führungszeugnis von 2021/2022, ist das aktuell genug? Freue mich über ein Kennenlernen.	Shawky 17.07.25: She is studying Filmregie in Stuttgart, but lives in Berlin. She has less time in the summer, but will have more time starting September (I suggested we introduce her anyways and let the accommodation center know). She mentioned in her note “Ich habe eine Schauspielausbildung und kann gerne, was mit Sprechen und Vorlesen machen. Außerdem Interesse an schulischer Mathematik. Gruppen geleitet habe ich noch nicht und ist mir möglicherweise zu schwierig.”	Matched	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:19.83061	2025-11-01 20:51:19.83061	433	333
440			Active regular	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.874333	2025-11-01 20:51:19.874333	442	357
447		Shawky 3.7.25: Left a message for WhatsApp, wanted to tell him about sports activities and Sommerfests, since he is mostly available on weekends	New	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:19.948858	2025-11-01 20:51:19.948858	449	362
481	Contacted for post-match followup	currently I’m pursuing master of public health in Arden University and I done my mbbs from Ukraine so when I was studying I did work for NGO in rural area for helping people for make it awareness about infectious disease prevention -Nand	Matched	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.177554	2025-11-01 20:51:20.177554	483	249
500			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.276934	2025-11-01 20:51:20.276934	502	351
503	Picking Spanish up again. Soccer, May Thai, Lindy hop, Capoeira.	- Nadav: Tried to call monday 2.12.24, she emailed she will call me back wedsday 4.12.24. more active things, can do acompamy anything that has to do with activities, sports, she is a teacher for kids soccer in the weekends! For sports best is Trachenbergring \n- Shawky 14.01.25: Her schedule is changing constantly at the moment, so she prefers to do more accompanying/ translation rather than regular volunteering, and will let us know if something changes	Inactive	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:20.285991	2025-11-01 20:51:20.285991	505	523
520		- Shawky 03.03.25: Egyptian just recently moved to Berlin. 6 years of Experience working with refugees in the UN agency for migration (IOM) in Egypt and Caritas Egypt. At the moment not employed, can volunteer on weekdays. BA in fine arts, but worked mostly in development (Caritas, community empowerment with refugees in Egypt, giving cultural orientation classes)\n- Senya 10.07.25: She moved to a different Bezirk and stopped volunteering in Osteweg in June 2025. It would be great to reach out to her.\n\n- Shawky 23.07.25: “I moved to Moabit last month and unfortunately it was hard to continue volunteering with the accommodation centre as it was a very long commute. At the moment my time is a bit tight as I just started a German course, and it takes place 5 days a week! But in the future, I would be happy to contact you to perhaps find another volunteering opportunity when my course has concluded and I have more free time. \n All the best,\nAlaa”	Temp inactive	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:20.395609	2025-11-01 20:51:20.395609	523	460
524			Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.408931	2025-11-01 20:51:20.408931	527	335
525	I speak fluent Portuguese and am currently learning Russian.		New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.412047	2025-11-01 20:51:20.412047	528	319
536	I can speak Bengali, English, and basic German (A2 level). I am flexible with working times and willing to work on weekdays and weekends if needed. I am open to working in any location in Germany where accommodation is available. I am interested in healthcare, elderly care, working with people with disabilities, and helping in hospitals or care homes.		New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.492118	2025-11-01 20:51:20.492118	540	398
293		I live in Tiergarten/ Moabit  -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.478403	2025-11-01 20:51:18.478403	294	146
295	Hello dear community, I have a 5 volunteering day paid leave from my work that I want to use for a good cause this year with volunteering. I saw this opportunity that I thought I might be a good fit but I am also open for other opportunities. What is important for me is that I can commit to it for only 10 weeks in half days and preferably on Friday afternoon as I need to submit these days to my manager as soon as possible for approval. I would also appreciate if I could get somehow a participation letter that could be a proof. Please let me know if you can provide me these and if I need to do anything else to become a volunteer starting from February 7th until April 11th on Fridays in the afternoons.	Nadav 22.1.25: He is in Turkey right now he cannot volunteer on mondays. once he is back next week we will have an intro talk (for translation support and general i guess together)	Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.486064	2025-11-01 20:51:18.486064	296	476
300	Gegen Masern bin ich bin aufgrund einer Masernerkrankung während meiner Kindheit immun		New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.550359	2025-11-01 20:51:18.550359	302	430
303	flexible but not always avilable- need to ask		Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.562019	2025-11-01 20:51:18.562019	304	528
306	Ich fahre schon lange Skateboard und mach Kickboxen. Diese kann ich den Kindern beibringen.	Nadav 30.04.25: In general he wants to do a volunteering that might give him a mini job later but open to this type of engagement too. He is open for accompanying but mostly working with kids. Nachhilfe: mathe deutch. Schedule wise: he is doing FSJ (like BDF for youngers) through AWO in vivantes and has an exam on 10.5.25. He can volunteer in another day maybe tueds too but only from 17. has until 10.5 test so after he can come bit before 17.00. a few times to meet RAC emloyees etc. He saw the poster.  @Senya we can mathc him with Refugium Hausvaterweg (https://www.notion.so/Refugium-Hausvaterweg-86c3031b76ee473b8005241a0d82bae4?pvs=21) he has EFZ that is 7 months old.	Inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:18.615586	2025-11-01 20:51:18.615586	307	409
316			Active accompany	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:18.702078	2025-11-01 20:51:18.702078	317	513
327			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.877231	2025-11-01 20:51:18.877231	328	508
334		Nadav 09-07.2025: Adi is a long time old suedkruez volunteer that is activly showing up to events since 2 years but not activly voulnteering any more, hopefully he will support in the sommerfest! we need to apply for EFZ	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:18.922227	2025-11-01 20:51:18.922227	335	368
339		Shawky 30.10.24: She would like to volunteer as a language mediator/ companion for refugees. She  speaks English (fluent) and French (native), German at an intermediary level, sufficiently to translate everyday interactions if needed. Currently staying in Zehlendorf but open to travelling. Has some free time during weekdays and weekends, especially on Monday, Tuesday, Saturday and Sunday.	Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:18.952566	2025-11-01 20:51:18.952566	340	11
347		nadav: Has experience wsnts to support kids had much time now in the next months and sfter maybe still had time. Not avilsble 9.12-10.1 . Worked much in refugee related projects and volunteered a öot. Lives in hermannplaz wpuld like to volubteer not super fsr has only bike no bvg. I mentioned i will send efz and opportunuties tomorroe., @Senya if you csn think of something helpful for her she got much experience time and soubfs serious. Only limitation is the NK think (hangars of course also would work.	Matched	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:19.011361	2025-11-01 20:51:19.011361	348	517
352		Shawky 27.05.25: Has a degree in teaching German as a foreign language, but at the moment is a project manager. Worked previously at a language school, and can teach language and worked before with adults mainly.  She can only volunteer starting 18.00 or on weekends.	Matched	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:19.045244	2025-11-01 20:51:19.045244	353	386
368		nadav: we had a phone call, she lives in weissensee ok with both RACs in lichtenberg and has decades of teaching experience, currently unemployed and wants to volunteer unsure about the weekly but can do maybe 1-2 month and sometimes every week. Sounds excited but in an adult way.   I mentioned the new RAC she was very into it	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.300128	2025-11-01 20:51:19.300128	369	9
385			Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.409402	2025-11-01 20:51:19.409402	386	344
387			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.433407	2025-11-01 20:51:19.433407	388	488
389			Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.43885	2025-11-01 20:51:19.43885	390	522
398		Shawky 23.07.25: Sie kann gerne bei Nachhilfe helfen, She hat viele private Erfahrungen in der Familie mit Kindern, Wohnst in Dahlem. Arbeitet selbstständig und mit der Zeit flexibel	Matched	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:19.58353	2025-11-01 20:51:19.58353	399	383
400		- Shawky 23.01.25: He didn’t share his phone number, so I sent him an email with our number and asked him to call back. He had sent us earlier a list of items for donations, which @Senya shared with GUs in Neukölln	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.596615	2025-11-01 20:51:19.596615	401	494
402	Ich bin erstmal nicht in Berlin, aber ungefähr ab Mitte August erreichbar.	nadav: i didnt call but put a remider when she is back	Temp inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.622035	2025-11-01 20:51:19.622035	403	360
407	I am also working and studying therefore I am not available on Mondays, Tuesdays and Wednesdays originally, but in case of an urgent need I would work to make it possible	- Shawky 07.11.2024: She works with Hochdrei in Potsdam, does theater and improv activities with teenagers.	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.645531	2025-11-01 20:51:19.645531	409	20
418		Nadav: she wants to learn german i told her its not best option but we can try GUs where no RU speakers so she can practice maybe with kids. I offered to start with the sommerfest in weissensee shecsaid yes. 4.7.25.	Active regular	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:19.713491	2025-11-01 20:51:19.713491	418	370
438	I have a yoga teacher for children certification and would be happy to work with children.	Traveling now (04.03.2025). We will talk again on Thursday (march 6th). She is wissenschaflicher Mitarbeiter in the University, very happy to offer Nachhilfe für Englisch, Mathe, Deutsch, as well as yoga for children. Available only on Fridays	Matched	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:19.859486	2025-11-01 20:51:19.859486	440	452
439			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.863934	2025-11-01 20:51:19.863934	441	352
449	The schedule can change depending on the week but this is generally, with advance notice, can make it.	Interested indoing activities with children in Marzahn, working on Measles vaccination	Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:19.977613	2025-11-01 20:51:19.977613	451	273
461	ok with bein translation on the list for appointments but not a priority she is into regular volunteering and close to her place so in  radickestrs RAC is 22 min bus.	Shawky: She started volunteering. The amount of children is a lot, so she wants to bring in her mother	Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:20.109176	2025-11-01 20:51:20.109176	463	437
467	I'm also a meditation and mindfulness teacher, and happy to volunteer to teach that to children or adults.		New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.137506	2025-11-01 20:51:20.137506	469	401
469	No i dont have		Inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:20.141343	2025-11-01 20:51:20.141343	471	75
476	I'm starting my 80% position on July, so I will be available Fridays from 1th of July		New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.159817	2025-11-01 20:51:20.159817	478	381
328	I work on shifts, that Is why I did not select some time frames	- Shawky 23.01.25: Tried calling and left him a message on WhatsApp\n- Shawky 30.01.25: Tried calling again	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.878948	2025-11-01 20:51:18.878948	329	489
333		I speak fluent German and English and although I have never had a professional job in childcare or pedagogy, I have much experience with children and have been babysitting for different families since I was a teenager.  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:18.896286	2025-11-01 20:51:18.896286	334	218
348		- Nadav April 2025: She replied to a message about Begleitung on Telegram (Kino) and committed to doing it	New	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:19.014326	2025-11-01 20:51:19.014326	349	468
351	After choosing the schedule will I be able to change it later.		Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.023597	2025-11-01 20:51:19.023597	352	525
359	I am Angela from Hong Kong, wanted to participate as a volunteer to help people, I did it many time since teenager.		Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.115701	2025-11-01 20:51:19.115701	360	429
366		Shawky 21.07.25: From Afghanistan, Been here 3 years, she is working part-time for an online grocery jobs “Flink”. She has experience translating at refugee accommodation centers from Dari to German, but prefers not to do doctor’s appointments (at accommodation centers, social workers). She is interested in cooking, makeup (for adults), also sewing, etc.	To rematch	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:19.249559	2025-11-01 20:51:19.249559	367	339
397		Nadav 09.07.25	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.569754	2025-11-01 20:51:19.569754	398	354
427			New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.777893	2025-11-01 20:51:19.777893	429	358
432	I am software engineer and can teach programming	Nadav 25.4: she is motivated and responsive, wanted to do cv writing, can also volunteer around warshaeurstr but we have no RACs there. We are waiting to hear if the RAC needs non german speakers. RAC into it. awaitng for EFZ	Matched	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:19.833037	2025-11-01 20:51:19.833037	434	416
442	My availability on Mondays & Fridays depends on the week--more often than not I am available, but sometimes I'm not in Berlin. I will also be gone from 17.04-25.04 (Easter holidays). Other than that, I have a lot of experience with theatre/acting in addition to the other ones I listed above.	- Shawky 03.03.25: American, Fulbright scholar currently working 3 days a week in Berlin as an English teaching assistant through a program run by the American and German governments. Has a “global seal of biliteracy in German” at the advanced level, and would be very interested in helping out with Nachhilfe. She works in Straußberg (can go there Tuesday, wednesday Thursday) otherwise Mondays and Fridays	Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.88732	2025-11-01 20:51:19.88732	444	474
450		Kenyan male and aged 34 years old. I am interested in taking part in your event. I am an asylum seeker in Germany and I live in Wünsdof Waldstadt.  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.988065	2025-11-01 20:51:19.988065	452	243
453	- 28.05.2024: Dear Mohammad Hassan, I don't Führungszeugnis but I have Anmeldung in Berlin, I'm also living in a immigrants Heim and I don't have permit, even I don't have refugee permit but my permit is in process,  it will take months, I'm waiting for appointment so I don't know it's possible for me to take Führungszeugnis when I don't have permit?Best regards	Im Eimal Daqiq from Afghanistan and Im also refugee but I would like to join your team. -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.022063	2025-11-01 20:51:20.022063	455	204
455			Opportunity sent	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:20.054346	2025-11-01 20:51:20.054346	457	518
460		Shawky 3.6.25: She said she couldn’t talk and will talk back\nShawky 5.6.25: She said she is not sure if she can volunteer anymore.I sent her our email and phone number and asked her to call back when/if she is free again.	Temp inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.106517	2025-11-01 20:51:20.106517	462	391
514	I am a classically trained flautist and am comfortable teaching the recorder. Also can read sheet music. I am also involved at a basketball club in Berlin so can potentially organize an event through that.	Moved to Berlin last September. Studied bioengineering and worked as a management and works now at an immunology lab at Charite, with a focus on neurology of children. Interested in working with children and young people, worked as a volunteer in medical settings in the US with refugees. She is a classically trained flautist and is comfortable teaching the recorder. Also can read sheet music. She is also involved at a basketball club in Berlin so can potentially organize an event through that. She’s quite flexible with time, can organize her schedule accordingly.	Inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:20.34538	2025-11-01 20:51:20.34538	516	393
516	Ich habe die Trainer C-Linzenz fürs Jugendfussball. Würde gerne Kindern, wenn Interesse da ist Tennis beibringen. Ich spiele selbst erst ein halbes Jahr, aber finde den Sport sowohl sehr gut für den Körper als auch um Fähigkeiten fürs Leben zu erlernen.		New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.360015	2025-11-01 20:51:20.360015	518	347
518	Ultimate Frisbee  - i also put things i am not expert at but down to do (:	Friend of Theodor	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:20.374672	2025-11-01 20:51:20.374672	520	463
532	I also play american football, I like to create content..	- Shawky 23.01.25: She is Moroccan, and has experience volunteering with children with special needs in Morocco. She has been in Berlin for 3 years as an “influencer marketing manager”, and has experience in coaching and personal development.	Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:20.474134	2025-11-01 20:51:20.474134	535	510
355	Chess Football, basketball, chess, Support with	- Shawky 03.03.2025: Hadeer’s cousin, wants to volunteer with her and Hesham at the same GU (Hotel Generator)	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.057404	2025-11-01 20:51:19.057404	356	454
367		Shawky 12.05.25: Called and left a voice note	New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.26826	2025-11-01 20:51:19.26826	368	400
394			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.537108	2025-11-01 20:51:19.537108	395	402
417		Nadav 16.6: she will be back in september	Temp inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.709647	2025-11-01 20:51:19.709647	419	387
424		Shawky: Has a Fortbildung in DLL (Deutschlehrkrafte), wants to volunteer mainly with children. She worked with a Kita in Egypt for a couple of months. She prefers communication mainly in German or Arabic.	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.747865	2025-11-01 20:51:19.747865	426	399
456			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.067832	2025-11-01 20:51:20.067832	458	315
468		Shawky 08.01.2025: Schedule changed, no longer available	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.140813	2025-11-01 20:51:20.140813	470	502
470		- Shawky 16.01.25: Native English speaker, speaks good German and Arabic. Lived in Palestine for many years, her husband is Syrian and has a child. Willing to travel 30-45 minutes, mainly after work or on weekends.	Active accompany	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:20.145428	2025-11-01 20:51:20.145428	472	506
473			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.155495	2025-11-01 20:51:20.155495	476	350
477			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.160275	2025-11-01 20:51:20.160275	479	313
479	Hey Team, I am Yoanna and am a native Bulgarian speaker (German & English C1). I am a student working part-time and am generally flexible Thursday and Friday either mornings/afternoons as well as evenings (17-20h) and sometimes on the weekend. I am open to any activities and would love to also engage in organizing some events like Sprachcafe or Festivals. Let me know how I can be helpful!	Jamie - Spoke to her on the phone. Interested in Sprachcafe and working with kids in general. Columbiadamm 10, Hangar 1-3, 12101 doing Sprachcafe was identified as potentially the best fit. She wants to know more about what Sprachcafe looks like, who is leading the programming etc..	Matched	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:20.167421	2025-11-01 20:51:20.167421	481	414
480	Dear Need4Deed team,Me and 2 of my close friends are coming from Tennessee to Berlin from May 26-June 2 in search of potential volunteering opportunities. We are specifically searching for ones assisting Ukrainian refugees in Berlin because one of my friends is Ukrainian and has much family still in Ukraine. He is fluent in Ukrainian and I am fluent in German. Please let me know if there are any opportunities, specifically ones helping Ukrainians.Thank you, Marvin		New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.171565	2025-11-01 20:51:20.171565	482	217
484		- Shawky 30.05.2024: He lives in Dresden! / I can fluently speak English and arabic Can translate both ways If i can be any use to you  -Vostel	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.195841	2025-11-01 20:51:20.195841	486	227
487			Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.214287	2025-11-01 20:51:20.214287	489	448
488			Inactive	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:20.218999	2025-11-01 20:51:20.218999	490	290
515	Ich habe einen Minijob, wo ich sehr unterschiedliche Zeiten habe, ich kann  also jede Woche unterschiedlich. An den angegebenen Zeiten sollte ich (hoffentlich) immer können und manchmal auch an den anderen Tagen:)		Matched	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.349061	2025-11-01 20:51:20.349061	517	324
401		Nadav 29.4.25: no reaction per phone, sent email with general link and the EFZ.	Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.604545	2025-11-01 20:51:19.604545	402	417
535		- Email 03.01.24: Liebe Nadav, Vielen Dank für deine Email! Ich habe meine Anmeldung gerade abgeschickt. Ich werde ab Montag in Berlin sein und freue mich, mit euch zu arbeiten!Liebe Grüße, Leni\n- Shawky 14.01.25: Tried to call a few times. Sent a WhatsApp voice note	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.48929	2025-11-01 20:51:20.48929	539	498
369	I could be available on other days. Please ask!	Volunteered one day at the Sommerfest in Prenzlauer Berg (Makeup for Children)	Active regular	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.306415	2025-11-01 20:51:19.306415	371	130
372		- Shawky 14.01.25: She studied international relations (migration management), worked with UN refugees in turkey for 6 years, registering information and assisting with resettlement interviews. She is interested mainly in working with adults (no experience with children) and particularly with knitting or providing support to social workers, given her experience with refugees and migrants. She is not working now and flexible with time.	Inactive	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.32014	2025-11-01 20:51:19.32014	373	511
374		Nadav 22.4 : She registered twice. Only email communication so far. (deleted the previous registration). Said yes TO Töpchiner Weg (https://www.notion.so/T-pchiner-Weg-978dcef46c85466c844d674573c8a45b?pvs=21), needs to be matched	Active accompany	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:19.344247	2025-11-01 20:51:19.344247	375	425
426			Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.766855	2025-11-01 20:51:19.766855	428	487
451	I will be available from 9th of December onwards for the rest of December. Unfortunately I cannot offer long-term support as I will not be in Berlin from January onwards.		New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.999448	2025-11-01 20:51:19.999448	453	532
454			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.046118	2025-11-01 20:51:20.046118	456	480
463	I prefer to volunteer in weekends		New	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.119785	2025-11-01 20:51:20.119785	465	79
464			Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.125553	2025-11-01 20:51:20.125553	466	230
465			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.134625	2025-11-01 20:51:20.134625	467	408
501			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.277036	2025-11-01 20:51:20.277036	503	345
504			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.284885	2025-11-01 20:51:20.284885	506	395
508		Shawky 3.7.25: Left a voice note, will ask if she can travel to the Frauencafe in Köpenick, and if she is interested in working with children, check German level \nShawky 15.7.25: She is originally from Turkey, specialized in child protection, worked with Syrian and Afghani refugee children there, went to Ukraine with Red Cross for one and a half year, now back in Germany for her MA thesis. Her German level is B1, currently doing a B2 course. Her first thesis in Turkey conditional cash transfers for refugees in Turkey (Istanbul), current thesis in Bonn about social protection system in Ukraine. For Kinderbetreuung, she can organize group activities for children, and she can also work with teenagers on development/ psychological/ career consultations in addition to the group activities.	Active regular	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.299627	2025-11-01 20:51:20.299627	510	367
380		-Email to Shawky 25.01.25: I am interested in supporting daycare either in Mitte or Wilmersdorf. After Feb 7, I might have more availability. I will let you know as soon as I confirm my German class schedule.	Opportunity sent	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.379299	2025-11-01 20:51:19.379299	381	504
382	Contacted for post-match followup	- Shawky 07.03.2024: Interested in Playroom in Britz \n- Shawky 16.05.2024: She can translate from Russian to English only, not to German	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.396387	2025-11-01 20:51:19.396387	383	300
396	Hello! I've selected all the time frames that would fit in my schedule, however, since I am still studying and working, I can only volunteer regularly (bi-weekly preferred but every week also works) in ONE of these time frames. On thursdays I have a bi-weekly uni class, so for those timeframes (except the 17-20) I could only do every other thursday!	Shawky 14.04.25: wrote her a message on Telegram, best suited for Nachhilfe Trachenbergring (https://www.notion.so/Trachenbergring-54403e371fcd447cb9934d556427c503?pvs=21) Nachhilfe in Deutsch, Mathe (https://www.notion.so/Nachhilfe-in-Deutsch-Mathe-1d08d880f47481d2bbf9f60d3544f0da?pvs=21) \n\nShawky 14.04.25: She found about us through Google search, it was on GoVolunteer. She doesn't have much experience with children but doesn’t mind doing Nachhilfe for German. she's doing her MA in media psychology, Tuesday is generally a good day, but can be flexible with the schedule depending on what is available. She can commute up to 40 mins a day. She has yoga and sports trainer license. She worked in a gym, and is also up for Sprachcafes and Nachhilfe. \n\nSenya 11.07.25: From the VC of Trachenbergring: “Miri macht hier jetzt ein Sprachcafé, was gut angenommen wird.”	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:19.551473	2025-11-01 20:51:19.551473	397	446
406		She’s a social worker, works at a student center	Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.644709	2025-11-01 20:51:19.644709	407	451
410		Shawky 21.07.25: Left voice note, Wanted to check if she can help with daycare or Sprachcafe at Hotel Plaza Inn (https://www.notion.so/Hotel-Plaza-Inn-1ac8d880f4748089ab25c7c31784b3e9?pvs=21) or with the opportunities at BENN Freiwillige und Ehrenamtliche für BENN Mierendorffinsel (https://www.notion.so/Freiwillige-und-Ehrenamtliche-f-r-BENN-Mierendorffinsel-2328d880f474811db1b5e3c2933abd21?pvs=21) \n\nVostel: “Ich habe selbst ein FSJ in einer Kita für benachteiligte Kinder gemacht und nach meinem Studium im KinderRechteForum verschiedene Projekte für und mit Kindern umgesetzt – unter anderem zu den Themen Kinderrechte, Gewaltprävention und demokratische Teilhabe.Insgesamt bin ich seit einigen Jahren im gemeinnützigen Bereich aktiv, habe dort u. a. Bildungsprojekte geplant, durchgeführt und evaluiert, Fortbildungen für Freiwillige gegeben und Projektteams begleitet. Mein Master in „Nonprofit Management & Public Governance“ hat meinen Fokus noch stärker auf gesellschaftliche Teilhabe und Unterstützung geflüchteter Menschen gelenkt.Ich freue mich, wenn ich euch mit meiner Erfahrung und ganz viel Herz für Kinder unterstützen kann – aktuell wäre ich ca. einmal pro Woche verfügbar.Herzliche GrüßeMalina”	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.65502	2025-11-01 20:51:19.65502	410	331
425			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.765511	2025-11-01 20:51:19.765511	427	459
444			Opportunity sent	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.896777	2025-11-01 20:51:19.896777	446	441
448		Beginner photographer and mainly interested in photographing and documenting events	Active regular	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.972647	2025-11-01 20:51:19.972647	450	143
457	I am working full time but am available most days during my lunch break (12-2pm), so could be available then for appointments for example.	- Shawky 04.02.25: She is a professional coder, does data engineering as her job. For fitness, she does Pilates, yoga, and weights training. For translation, she could do it only if the time works, she said she could take a break from work when needed.	Active accompany	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:20.074846	2025-11-01 20:51:20.074846	459	470
474			Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.155649	2025-11-01 20:51:20.155649	477	228
482			Active accompany	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:20.178552	2025-11-01 20:51:20.178552	485	388
496			To rematch	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:20.249772	2025-11-01 20:51:20.249772	498	443
507			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.295183	2025-11-01 20:51:20.295183	509	364
526			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.44208	2025-11-01 20:51:20.44208	529	316
528		- Shawky 04.03.25: Bassem’s friend, speaks German and can help with English homework, but not German. \n\n- JC (prototype)	Active accompany	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:20.452293	2025-11-01 20:51:20.452293	531	455
392	My mother tongue is brazilian portuguese.		New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.512477	2025-11-01 20:51:19.512477	393	337
409	My schedule changes every week/month because of my work. / Contacted for post-match followup	- Message on August 5th: Hello Aliana, I went to the refugee shelter on 13th July in Pankow. I met with Sedona from the organisation to play with kids there and I think it went quite well! I could make it just once because I work on Saturdays too (or I was taking vacation for summer). Thank you for reaching out. Kind regards Selin Bal	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:19.655381	2025-11-01 20:51:19.655381	412	254
415		JC / 02.07.2025 / I spoke with Amara yesterday, and she’s really interested in helping in any way she can. She’s especially eager to support women or children, but she’s also open to helping other groups in need.	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.7002	2025-11-01 20:51:19.7002	416	359
428			New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.784385	2025-11-01 20:51:19.784385	430	349
435		Shawky 14.04.25: Left a voice message, best suited for Nachhilfe Trachenbergring (https://www.notion.so/Trachenbergring-54403e371fcd447cb9934d556427c503?pvs=21) Nachhilfe in Deutsch, Mathe (https://www.notion.so/Nachhilfe-in-Deutsch-Mathe-1d08d880f47481d2bbf9f60d3544f0da?pvs=21) or Basteln\n\nShawky 16.04.25: Sie ist ganz flexibel, Sie wohnt in Schöneberg und hat Erfahrungen mit Kindern und Nachhilfe, auch als Babysitter. Sie hat besonders Interesse an Kunst und Basteln, aber kann auch bei Vorlesung, Nachhilfe (Deutsch) oder anderen Bedarfen helfen. Mittwochs funktioneren am besten und sie hat schon ein EFZ und Masernimpfungsnachweis.	Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.8533	2025-11-01 20:51:19.8533	437	428
443		- Shawky 29.01.25: She has a BA in international law and MA in international humanitarian action. Been volunteering for 9 years now with migrants and refugees, did a lot of legal case work in Bangkok. She is now working as a nanny, so has experience with children. Available from 9.00 till 3.30 or after 6 p.m. Still taking A1 German classes.\n- Shawky 06.02.2025: @Senya got in touch with the RAC at Wotanstraße mentioning her specific background and Clemens expressed interest. We put them in touch. She has an EFZ from Paris	Matched	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:19.888506	2025-11-01 20:51:19.888506	445	499
445			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.905695	2025-11-01 20:51:19.905695	447	516
491		Nadav 23.4: available from 13:00 was coach, does music production, love to work with kids, starts A1 german now, very fresh in Berlin only 3 months. needs to apply for cgc but has no passport or Swedish id so inactive until we can apply for EFZ	Temp inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.231701	2025-11-01 20:51:20.231701	493	418
519		Jamie 04.17: studying for atleast a year and a half longer in Berlin. Mainly thinking about volunteering in accommodation centers. lives in schoneberg, below zooilogisher garten. Doesn#t know class schedule right now, classes are often until 5pm, sometimes until 3pm. Will know what schedule looks like next week. Interested in arts and crafts. Has a bike so travelling long distances isnt a problem. Interested in sprachcafe schoneberg and Mentorship in <schoneberg.	Matched	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:20.378306	2025-11-01 20:51:20.378306	522	457
533	I can write. I can do writing Workshops.		Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.486915	2025-11-01 20:51:20.486915	537	343
393		Shawky: From Luxembourg, she is has been living in Berlin for 2 years. Studying Anthropolgy and literature at FU, she found out about us through a flyer in Mitte. Speaks French, German and English. She is interested in cooking. She helped tutor and baby sit in the past. \n\nShawky 24.06.25: (Email) Hi Mohammad,I'm so sorry I didn't get back to your last mail. As I am leaving Berlin for three months very soon, I don't have the capacity at the moment. I'll be happy to get back in touch with you when I'm back!Cheers,Michael	Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.512879	2025-11-01 20:51:19.512879	394	382
395	I'm really good at playing the clarinet and sing so I can help and volunteer in teaching music	Senya 11.07.25: From the VC: Ein Mädchen aus Dänemark hatte angefragt aber leider hat es mit dem Führungszeugnis beantragen nicht funktioniert… sie ist nur ein Semester hier und hätte das ohne Wohnsitz in Bonn beantragen müssen und cih glaube, am Ende war alles zu kompliziert leider!”	Matched	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:19.546405	2025-11-01 20:51:19.546405	396	461
411		Vostel 28.07.25: “Sehr geehrte Damen und Herren,ich suche derzeit nach einer Möglichkeit, mich wieder in der Flüchtlingshilfe zu engagieren. 2015 bis 2019 habe ich schon in dem Bereich mich ehrenamtlich engagiert bzw. für verschiedene Organisationen gearbeitet. Ich bin bilingual aufgewachsen (Arabisch-Deutsch) und habe 6 Jahre meiner Kindheit und Jugend in Syrien gelebt. Daher spreche ich fließend Arabisch und kenne mich gut mit den kulturellen Gepflogenheiten für den Raum aus. Damals habe ich Menschen zu ihren Terminen als Sprachmittler begleitet und ihnen bei Briefen und Formularen geholfen. Also so ziemlich das, wonach Sie in Ihrem Inserat suchen. Das Engagement von damals würde ich sehr gerne wieder aufnehmen. Meine Stärken liegen im richtigen Umgang mit Menschen, einer emphatischen Art und natürlich meiner Zweisprachigkeit.Wenn da bei Ihnen Bedarf besteht, bin ich gerne da um auszuhelfen.”\n\nShawky 29.07.25: Asked JC to call, since they are interested mainly in accompanying	Active accompany	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.658872	2025-11-01 20:51:19.658872	411	346
412	Preferred time frame would be either fridays (any time) or on the weekend.	Shawky 06.05.25: She got busy and cannot volunteer anymore, will let us know if something changes.\n\nNadav 25.4.25 : Into sports with kids or adults i talked with her about hotel generator she is interested. we will match and she will get efz email @Senya	Inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:19.662721	2025-11-01 20:51:19.662721	413	410
421	I speak A2/B1 German.	- Shawky 22.01.25: Tried calling and left her a message on WhatsApp	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.728934	2025-11-01 20:51:19.728934	422	493
423		nadav 11.06.: doing intense german course, studying online course from uk adult health social care, want to work with vulnerable groups, works as nanny here in Berlin. wants to meet new people get experience has degree in philosophy so trying to look experience hands on- now a2 starting b1. wants to improve the German likes between xberg and mitte. she has an anmeldung	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:19.747219	2025-11-01 20:51:19.747219	424	374
429		- Nadav is already in touch with her about a side project	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:19.792838	2025-11-01 20:51:19.792838	431	434
458			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.080025	2025-11-01 20:51:20.080025	460	376
466	I can also crochet and braid hairstyles from series and movies, I don't know whether that is relevant or even helpful.	nadav 30.04.25: she is vey young just finished school 19  years old.. has timre till septenber . waiting for efz for matching with Bornitzstraße (https://www.notion.so/Bornitzstra-e-d3b83fd648ee416984deb55fdce1e93d?pvs=21) Unterstütze bei der Kinderbetreuung. is probably the kid of sonnemann@berlin.de (https://www.notion.so/sonnemann-berlin-de-1dc8d880f47481f4928fecab81fea51a?pvs=21)	Active regular	\N	\N	\N	\N	\N	\N	yes	applied_self	2025-11-01 20:51:20.134973	2025-11-01 20:51:20.134973	468	420
478		Nadav: He used to work in BAMF. Has interest in both mentoring and kleiderkammer in Hangars or whatever is needed. right now has more time.	Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.164988	2025-11-01 20:51:20.164988	480	439
505			To rematch	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.291775	2025-11-01 20:51:20.291775	507	341
513	I am studying my my Deutsch Cours and it start at 9 o'clock morning up to 13 Afternoon and it’s from Monday to Friday	A2 Deutsch -Vostel	Active accompany	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.332945	2025-11-01 20:51:20.332945	515	114
531	Valid from 21st July 2025 until 30th July. Before starting my new job I have 2 weeks off. I have worked in big companies as Executive Assistant and also in a ministry recently, so I know German bureaucracy and also real estate agents etc. Very well and would like to help. Lots of experience in Hospitality & Event Management, Star Trek, Architecture / Guide Tours, Club Culture, Chaos Computer Club	Shawky 25.07.25: Sent her asking if she is only available to volunteer for the two weeks in July she mentioned in her comments. She replied that she doesn’t know yet and I told her to get in touch when she knows, invited her to the Telegram group.	Temp inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.463162	2025-11-01 20:51:20.463162	534	342
441		nadav: she is personal trainier and would feel confertable in sport, never went to a sprach cafe, teaching would be better fit than spach cafe. filling out forms is more what she wants than kids help. not into kids. I connected her to Chhris about Frisbee in the same cener we are waiting for a reply from \n\nShawky 22.07.25: We had a wonderful call, she already started volunteering at Hotel Plaza Inn (https://www.notion.so/Hotel-Plaza-Inn-1ac8d880f4748089ab25c7c31784b3e9?pvs=21), joining the Frisbee class with Chris, went a few times but is traveling for a while and will be back in February. She will let us know if she is interested again when she is back.	Temp inactive	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:19.88251	2025-11-01 20:51:19.88251	443	372
459	Hello, My name is Kerstin Larsson and I am a student pursuing my master's degree in Paris in International Development. I will be going to Berlin over the summer from June 22 for at least a month, probably longer. I will be studying German each day from 9-12.30 during the weeks and the hours after that I would like to help out and volunteer. I am also available during the weekends. Please let me know if you need any additional information about me and my experiences. Best regards/ Kerstin Larsson		Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.104338	2025-11-01 20:51:20.104338	461	392
472		Shawky 30.07.25: She works in IT, can only volunteer in weekends or in the evenings during the week. She volunteered in Morocco with children with cancer, playing and doing activities with them, Her German is strong enough to do German Unterricht with women (specially Arabic-speaking women) as well as with children who need help. I am inquiring with Senya about the possibility of this opportunity in Töpchiner Weg to see if it is possible for the weekends: @Organisiere Aktivitäten für Frauen	Matched	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.14847	2025-11-01 20:51:20.14847	474	327
483			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.181332	2025-11-01 20:51:20.181332	484	471
485		Teilzeitlehrerin in Pakistan -Vostel	Matched	\N	\N	\N	\N	\N	\N	no	undefined	2025-11-01 20:51:20.198081	2025-11-01 20:51:20.198081	487	140
486			Active accompany	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.202849	2025-11-01 20:51:20.202849	488	141
490	Hi! I would love to get involved in your activities, especially creative ones. I have some experience from a few years ago in arts&crafts for 1-3 year olds for KiezOase Schöneberg, which was very fun, and with adults with disabilities. My Führungszeugnis is unfortunately not up to date.		Matched	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:20.232081	2025-11-01 20:51:20.232081	491	427
494			New	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:20.242414	2025-11-01 20:51:20.242414	496	340
495			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.247143	2025-11-01 20:51:20.247143	497	390
509	I'm a fully qualified fitness coach	Nadav 22.4: she lives in mittte, wants to do sports, right now is not working day time but this can change. does not want to volunteer deep in the east because of posssisble racism (she is black). We will try to match her with charlottenburg hotel Hotel Plaza Inn (https://www.notion.so/Hotel-Plaza-Inn-1ac8d880f4748089ab25c7c31784b3e9?pvs=21)	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:20.312724	2025-11-01 20:51:20.312724	511	419
523		Nadav 30.04.25: She is here for one month for sure. After that, her stay is uncertain due to visa issues. She is a UK citizen.\nShe can support accompanying work in English, Russian, and French. She has extensive experience working with children and women’s groups, and is also comfortable working with younger children.\nShe does not have an Anmeldung and is currently checking the UK background check (CGC) online.\nWe agreed that she will work on obtaining the CGC from the UK and send it to us. If we have suitable accompanying opportunities in May, we will match her accordingly.\nIf she receives a visa and remains in Berlin, we will consider her for childcare support in a RAC.	Temp inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:20.407967	2025-11-01 20:51:20.407967	526	411
534		Shawky 14.04.25: left a voice note, best suited for translation, but need to check availability beyond weekends.	To rematch	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.488139	2025-11-01 20:51:20.488139	538	426
452	Liebes Need4Deed-Team,  ich bin Vater von zwei kleinen Kindern (4 und 7 Jahre alt), lebe in Schöneberg, Berlin und arbeite an einer Universität. Ich komme ursprünglich aus Russland, spreche Russisch als Muttersprache und habe etwa B2-Niveau in Deutsch.  Da ich selbst viel Freude daran habe, Zeit mit Kindern zu verbringen, würde ich mich sehr freuen, geflüchtete Kinder in der Gemeinschaftsunterkunft zu unterstützen – sei es beim Spielen, Basteln oder einfach im gemeinsamen Alltag. Es wäre schön, einen kleinen Beitrag zu ihrem Wohlbefinden leisten zu können.  Ich freue mich auf Ihre Rückmeldung!  Herzliche Grüße, Philipp Chapkovski, Ph.D https://chapkovski.github.io/ +4915123570022	- Teaches at the university (political science and sociology), he has 2 children (Elternsinitiative in school), so has experience jumping in for teachers when needed.	Matched	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:20.01053	2025-11-01 20:51:20.01053	454	438
462			Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.112347	2025-11-01 20:51:20.112347	464	205
471	nein		Inactive	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:20.148292	2025-11-01 20:51:20.148292	473	81
475			Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:20.156633	2025-11-01 20:51:20.156633	475	90
489		Nadav 28.4.25: did a lot of creatives things with adults bit with kids too with finnished . nachhilfe can also work. asked about  @Senya can you ask seehoferstr if they need nach hilfe or kinderbetreuung she might be soon avilable in afternoon but so far its this schedule but she has good teaching exoperince and weekend also option if they can. otherwise storkowerstr	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:20.229594	2025-11-01 20:51:20.229594	492	412
498		Shawky 15.07.25: born in Austria, speaks Tunisian Arabic too. She works professionally as an actress and dancer, and would love to volunteer —especially playing and working with children, creating joyful and meaningful moments together.	Opportunity sent	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:20.27161	2025-11-01 20:51:20.27161	500	361
499		Shawky 04.08.25: From Vostel: “mein Name ist Chiara und ich bin zertifizierte Yogalehrerin (Yoga Alliance), ausgebildet in Indien mit Schwerpunkt auf Hatha-Yoga, Atemarbeit sowie Klangheilung (Sound Healing/Sound Bath). Ich lebe in Berlin ( Ostkreuz) und möchte gerne meine Zeit, Energie und Fähigkeiten ehrenamtlich zur Verfügung stellen, um Ihre wichtige Arbeit zu unterstützen. Ich bin überzeugt, dass Yoga, insbesondere in Gemeinschaft, sowohl körperliche als auch seelische Stärke fördern kann – und Momente der Ruhe und Verbundenheit schafft, gerade für Menschen in schwierigen Lebenssituationen.In der Vergangenheit habe ich bereits in Italien und Berlin als freiwillige Yogalehrerin in verschiedenen sozialen Einrichtungen gearbeitet. Zurzeit unterrichte ich Yoga weiterhin ehrenamtlich in meinem Kiez und an der Universität.Beruflich komme ich ursprünglich aus dem Mode- und E-Commerce-Bereich als Merchandise Planner und Data Analyst. Aktuell konzentriere ich mich jedoch ganz auf meine Weiterbildung in den Bereichen Ayurveda, Yoga und Deutsch. Ich habe kürzlich ein C1-Zertifikat in Deutsch erworben und spreche Italienisch, Spanisch, Russisch, Englisch und Deutsch.Ich freue mich sehr, meine Zeit und mein Wissen im Rahmen Ihrer Projekte einzubringen. Ich bin unter der Woche zeitlich flexibel und freue mich auf Ihre Rückmeldung.Vielen dank,Chiara”	New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.275857	2025-11-01 20:51:20.275857	501	312
506		9 July JCi, I spoke with her, and she’s more interested in helping with smaller tasks, such as assisting with the summer fest, yoga for women, or activities for seniors and children. She doesn’t feel comfortable with her level of German yet, she is more flexible in September and she is interested on practicing her German.	Temp inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.292777	2025-11-01 20:51:20.292777	508	373
511		- Shawky 12.12.24: Born and raised in Turkey, studied literature and philosophy in Istanbul. She is doing a masters in Education in Potsdam. No German.	Matched	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:20.313297	2025-11-01 20:51:20.313297	513	512
512			New	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.328284	2025-11-01 20:51:20.328284	514	396
517		Shawky 04.08.25: E-Mail “Hallo zusammen,  ich würde mich gerne beim Sommerfest in Tegel am 22.08. engagieren, hier hat sich auch eine Kommilitonin von mir angemeldet. Das Ausschreiben finde ich auf der Webseite jedoch nicht. Sind denn noch Freiwillige gesucht? Ich würde mich darüber freuen, mich melden zu dürfen.” E-mailed back to let them know the festival is in Lichtenberg, copied Senya	To rematch	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.364705	2025-11-01 20:51:20.364705	519	326
521		Shawky 21.07.25: Sozialwissenschaft studiert, möchte mehr Leute kennenlernen, Wohnt in Berlin seit einem Jahr und kann mit Frauen (nicht Männern) oder Kindern arbeiten. Arbeitet in Senatverwaltung für Jugend und Familie in Reinickendorf, wohnt in Wedding, aber zieht bald nach Prenzlauer Berg. Kann nur nach 17.00 Uhr im Laufe der Woche oder an Wochenende. Ich habe die Link für Angebote geschickt.	Opportunity sent	\N	\N	\N	\N	\N	\N	yes	applied_n4d	2025-11-01 20:51:20.403954	2025-11-01 20:51:20.403954	524	338
527	Hello,	Shawky 01.07.25: Syrian, Interested in Kleiderkammer, also in festivals. Likes cooking a lot. Studies energy engineering in Syria. He was giving computer courses in refugees, works in the humanitarian field, more on the technical side. He lived in Prague before, plays guitar, and has played before in refugee contexts. He seems more interested in one-day events, he came to our events several times and like	Active regular	\N	\N	\N	\N	\N	\N	no	yes	2025-11-01 20:51:20.443499	2025-11-01 20:51:20.443499	530	483
530		Shawky 13.05.25: Native Berliner. He is studying computer science (business informatics), currently doing an internship. He likes sports with kids with migration backgrounds (he played in the basketball league and plays volleyball too, but also football). He prefers working with children, he was working for a Kindergarten before assisting teachers. He can help with Nachhilfe (Math, Chemistry & German). He lives in Schöneberg/Friedenau (closer to Steglitz). His office is close to the Hauptbahnhof, so can travel from there  as well up to 30-40 mins commute.	Inactive	\N	\N	\N	\N	\N	\N	no	applied_n4d	2025-11-01 20:51:20.457796	2025-11-01 20:51:20.457796	533	394
492		- Shawky 28.01.2025: He studied all his life in the German school in Cairo, so can speak German fluently and is familiar with the education system. Works as a software developer, been in Germany for 10 years. Can help with Nachhilfe, particularly for Math and science, as well as German. He can also help teenagers with university applications. He can only volunteer after 5 during the week or on weekends. \n- Senya 10.07.2025: Upd. from the VC. He’s still active there doing private Math tutoring.	Active regular	\N	\N	\N	\N	\N	\N	no	applied_self	2025-11-01 20:51:20.232928	2025-11-01 20:51:20.232928	494	479
493	I have long experience working with children, both due to professional activities (summer schools, baby sitting) and as a volunteer, more recently worked with an association offering after school activities of an underserved community in the amazons in Peru.	She’s Italian, been living in Berlin for 6 years. She is taking a break. She has a long experience working in HR, so can also help with job placement for teenagers and adults. She can volunteer in NK or Tempelhof, but willing to travel elsewhere. She has a valid EFZ.	Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.242149	2025-11-01 20:51:20.242149	495	397
497		- From Nadav September 2024: Seems he was more looking for a job and he sent his CV	Inactive	\N	\N	\N	\N	\N	\N	yes	no	2025-11-01 20:51:20.255811	2025-11-01 20:51:20.255811	499	112
502		Shawky 12.05.25: Called and left a voice note	New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.279052	2025-11-01 20:51:20.279052	504	421
510	I've heard good things of your team and activity, so I'm inspired to join.		New	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.313131	2025-11-01 20:51:20.313131	512	332
522	- Shawky 18.03.2024: She helped during the Iftar. She wants to do only accompanying, because her schedule is not clear (doing her MA)		Inactive	\N	\N	\N	\N	\N	\N	no	no	2025-11-01 20:51:20.406001	2025-11-01 20:51:20.406001	525	450
529			Matched	\N	\N	\N	\N	\N	\N	yes	yes	2025-11-01 20:51:20.456241	2025-11-01 20:51:20.456241	532	403
\.


--
-- Name: activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_id_seq', 22, true);


--
-- Name: address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.address_id_seq', 549, true);


--
-- Name: agent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agent_id_seq', 89, true);


--
-- Name: agent_postcode_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agent_postcode_id_seq', 1, false);


--
-- Name: category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.category_id_seq', 6, true);


--
-- Name: deal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deal_id_seq', 1002, true);


--
-- Name: district_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.district_id_seq', 60, true);


--
-- Name: district_postcode_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.district_postcode_id_seq', 242, true);


--
-- Name: event_n4d_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_n4d_id_seq', 1, false);


--
-- Name: event_translation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_translation_id_seq', 1, false);


--
-- Name: field_translation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.field_translation_id_seq', 216, true);


--
-- Name: language_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.language_id_seq', 7922, true);


--
-- Name: lead_from_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_from_id_seq', 7, true);


--
-- Name: location_address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.location_address_id_seq', 1, false);


--
-- Name: location_district_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.location_district_id_seq', 3713, true);


--
-- Name: location_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.location_id_seq', 1002, true);


--
-- Name: location_postcode_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.location_postcode_id_seq', 1, false);


--
-- Name: opportunity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.opportunity_id_seq', 466, true);


--
-- Name: option_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.option_id_seq', 108, true);


--
-- Name: organization_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.organization_id_seq', 89, true);


--
-- Name: person_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.person_id_seq', 600, true);


--
-- Name: postcode_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.postcode_id_seq', 195, true);


--
-- Name: profile_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profile_activity_id_seq', 1531, true);


--
-- Name: profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profile_id_seq', 1002, true);


--
-- Name: profile_language_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profile_language_id_seq', 2306, true);


--
-- Name: profile_skill_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profile_skill_id_seq', 925, true);


--
-- Name: skill_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.skill_id_seq', 33, true);


--
-- Name: testimonial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.testimonial_id_seq', 1, false);


--
-- Name: time_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.time_id_seq', 1002, true);


--
-- Name: time_timeslot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.time_timeslot_id_seq', 1332, true);


--
-- Name: timeline_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.timeline_id_seq', 1, false);


--
-- Name: timeslot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.timeslot_id_seq', 513, true);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_id_seq', 3, true);


--
-- Name: volunteer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.volunteer_id_seq', 536, true);


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
-- Name: volunteer_list_mv; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.volunteer_list_mv;


--
-- PostgreSQL database dump complete
--

\unrestrict NgqAT9RvApvzbsLKRpv63QpKeJq6zWVQZdxdxWH1l5LJvb2ktMwKB6cT8tUX7J1

