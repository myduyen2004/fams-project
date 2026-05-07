--
-- PostgreSQL database dump
--

\restrict vh6VNRdU9ZEP0BVp8ueo7jIKCTQzKNQRhtUKikhdqLpJAUl1PVbTB2yPaKZgnL3

-- Dumped from database version 15.17 (Debian 15.17-1.pgdg12+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: round(double precision, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.round(double precision, integer) RETURNS numeric
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
                            SELECT round($1::numeric, $2);
                        $_$;


ALTER FUNCTION public.round(double precision, integer) OWNER TO postgres;

--
-- Name: sync_class_section_status_from_semester(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_class_section_status_from_semester() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    target_class_status VARCHAR(50);
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'COMPLETED' THEN
            target_class_status := 'FINISHED';
        ELSIF NEW.status = 'ONGOING' THEN
            target_class_status := 'ONGOING';
        ELSE
            target_class_status := 'UPCOMING';
        END IF;

        UPDATE class_sections 
        SET status = target_class_status 
        WHERE semester_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_class_section_status_from_semester() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academic_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.academic_requests (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    request_type character varying(50) NOT NULL,
    request_title character varying(255) NOT NULL,
    semester_id bigint,
    course_id bigint,
    class_section_id character varying(50),
    to_class_name character varying(100),
    to_major character varying(100),
    to_specialization character varying(100),
    to_sub_specialization character varying(100),
    reason text,
    note text,
    file_url character varying(500),
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    start_date date,
    due_date date,
    approver_id bigint,
    approved_at timestamp without time zone,
    approver_note character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.academic_requests OWNER TO postgres;

--
-- Name: academic_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.academic_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.academic_requests_id_seq OWNER TO postgres;

--
-- Name: academic_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.academic_requests_id_seq OWNED BY public.academic_requests.id;


--
-- Name: access_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.access_logs (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    location character varying(100),
    status character varying(50),
    ip_address character varying(45),
    user_agent character varying(255),
    access_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.access_logs OWNER TO postgres;

--
-- Name: access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.access_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.access_logs_id_seq OWNER TO postgres;

--
-- Name: access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.access_logs_id_seq OWNED BY public.access_logs.id;


--
-- Name: ai_chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_chat_messages (
    id bigint NOT NULL,
    session_id bigint NOT NULL,
    content text NOT NULL,
    role character varying(20) NOT NULL,
    is_error boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    token_count integer,
    model_version character varying(50),
    processing_time_ms bigint,
    redirect_path character varying(255)
);


ALTER TABLE public.ai_chat_messages OWNER TO postgres;

--
-- Name: ai_chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_chat_messages_id_seq OWNER TO postgres;

--
-- Name: ai_chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_chat_messages_id_seq OWNED BY public.ai_chat_messages.id;


--
-- Name: ai_chat_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_chat_sessions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    title character varying(200),
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    last_message_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ai_chat_sessions OWNER TO postgres;

--
-- Name: ai_chat_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_chat_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_chat_sessions_id_seq OWNER TO postgres;

--
-- Name: ai_chat_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_chat_sessions_id_seq OWNED BY public.ai_chat_sessions.id;


--
-- Name: ai_tool_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_tool_tests (
    id bigint NOT NULL,
    tool_id bigint NOT NULL,
    is_passed boolean DEFAULT false NOT NULL,
    test_query text,
    test_result_summary text,
    logs text,
    execution_time_ms bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ai_tool_tests OWNER TO postgres;

--
-- Name: ai_tool_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_tool_tests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_tool_tests_id_seq OWNER TO postgres;

--
-- Name: ai_tool_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_tool_tests_id_seq OWNED BY public.ai_tool_tests.id;


--
-- Name: ai_tools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_tools (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    sql_template text,
    accuracy_percentage double precision,
    is_active boolean DEFAULT true NOT NULL,
    allowed_roles text DEFAULT 'ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT'::text,
    required_fields text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    required_resp_fields text,
    CONSTRAINT chk_ai_tools_type CHECK (((type)::text = ANY ((ARRAY['SQL_TEMPLATE'::character varying, 'BACKEND_ACTION'::character varying, 'NAVIGATE_ONLY'::character varying])::text[])))
);


ALTER TABLE public.ai_tools OWNER TO postgres;

--
-- Name: ai_tools_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_tools_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_tools_id_seq OWNER TO postgres;

--
-- Name: ai_tools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_tools_id_seq OWNED BY public.ai_tools.id;


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    id bigint NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    level character varying(20) NOT NULL,
    type character varying(30) DEFAULT 'SYSTEM'::character varying NOT NULL,
    user_id bigint,
    is_resolved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.alerts_id_seq OWNER TO postgres;

--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- Name: assignment_image_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_image_embeddings (
    id bigint NOT NULL,
    submission_id bigint NOT NULL,
    assignment_id bigint NOT NULL,
    course_id bigint NOT NULL,
    student_id bigint NOT NULL,
    file_name character varying(255),
    page_or_chunk character varying(120),
    content_preview text,
    embedding public.vector NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assignment_image_embeddings OWNER TO postgres;

--
-- Name: assignment_image_embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignment_image_embeddings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assignment_image_embeddings_id_seq OWNER TO postgres;

--
-- Name: assignment_image_embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignment_image_embeddings_id_seq OWNED BY public.assignment_image_embeddings.id;


--
-- Name: assignment_plagiarism_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_plagiarism_checks (
    id bigint NOT NULL,
    assignment_id bigint NOT NULL,
    target_submission_id bigint NOT NULL,
    compared_submission_id bigint,
    checker_lecturer_id bigint NOT NULL,
    scope character varying(100) NOT NULL,
    model_name character varying(120) NOT NULL,
    strategy character varying(255) NOT NULL,
    text_score double precision,
    image_score double precision,
    metadata_score double precision,
    file_name_score double precision,
    probability double precision,
    plagiarism_percent integer,
    plagiarized boolean,
    target_text_length integer,
    compared_text_length integer,
    content_based boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    plagiarized_text boolean,
    plagiarized_image boolean,
    text_threshold double precision,
    image_threshold double precision,
    overall_comment text,
    match_comment text,
    reason_tags character varying(500),
    index_coverage double precision
);


ALTER TABLE public.assignment_plagiarism_checks OWNER TO postgres;

--
-- Name: assignment_plagiarism_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignment_plagiarism_checks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assignment_plagiarism_checks_id_seq OWNER TO postgres;

--
-- Name: assignment_plagiarism_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignment_plagiarism_checks_id_seq OWNED BY public.assignment_plagiarism_checks.id;


--
-- Name: assignment_submission_vector_index; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_submission_vector_index (
    id bigint NOT NULL,
    submission_id bigint NOT NULL,
    course_id bigint NOT NULL,
    status character varying(20) NOT NULL,
    error_message text,
    indexed_at timestamp without time zone,
    attempt_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assignment_submission_vector_index OWNER TO postgres;

--
-- Name: assignment_submission_vector_index_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignment_submission_vector_index_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assignment_submission_vector_index_id_seq OWNER TO postgres;

--
-- Name: assignment_submission_vector_index_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignment_submission_vector_index_id_seq OWNED BY public.assignment_submission_vector_index.id;


--
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_submissions (
    id bigint NOT NULL,
    assignment_id bigint NOT NULL,
    student_id bigint NOT NULL,
    enrollment_id bigint NOT NULL,
    file_url character varying(2000),
    file_name character varying(1000),
    note text,
    status character varying(20) DEFAULT 'SUBMITTED'::character varying NOT NULL,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    lecturer_comment text,
    plagiarism_percent integer,
    plagiarism_status character varying(20) DEFAULT 'NOT_CHECKED'::character varying
);


ALTER TABLE public.assignment_submissions OWNER TO postgres;

--
-- Name: assignment_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignment_submissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assignment_submissions_id_seq OWNER TO postgres;

--
-- Name: assignment_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignment_submissions_id_seq OWNED BY public.assignment_submissions.id;


--
-- Name: assignment_text_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_text_embeddings (
    id bigint NOT NULL,
    submission_id bigint NOT NULL,
    assignment_id bigint NOT NULL,
    course_id bigint NOT NULL,
    student_id bigint NOT NULL,
    file_name character varying(255),
    page_or_chunk character varying(120),
    content_preview text,
    embedding public.vector NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assignment_text_embeddings OWNER TO postgres;

--
-- Name: assignment_text_embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignment_text_embeddings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assignment_text_embeddings_id_seq OWNER TO postgres;

--
-- Name: assignment_text_embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignment_text_embeddings_id_seq OWNED BY public.assignment_text_embeddings.id;


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignments (
    id bigint NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    class_name character varying(50) NOT NULL,
    created_by bigint NOT NULL,
    due_date timestamp without time zone,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    reference_url character varying(500),
    reference_name character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    timetable_slot_id bigint,
    reminder_sent boolean DEFAULT false NOT NULL,
    plagiarism_text_threshold double precision DEFAULT 0.70 NOT NULL,
    plagiarism_image_threshold double precision DEFAULT 0.95 NOT NULL
);


ALTER TABLE public.assignments OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assignments_id_seq OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignments_id_seq OWNED BY public.assignments.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    is_present boolean NOT NULL,
    session character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_configs (
    id bigint NOT NULL,
    config_key character varying(50) DEFAULT 'SYSTEM_CONFIG'::character varying NOT NULL,
    face_recognition_enabled boolean DEFAULT true NOT NULL,
    wifi_location_enabled boolean DEFAULT false NOT NULL,
    absent_threshold_minutes integer DEFAULT 30 NOT NULL,
    min_attendance_percentage double precision DEFAULT 80.0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    manual_enabled boolean DEFAULT true NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL
);


ALTER TABLE public.attendance_configs OWNER TO postgres;

--
-- Name: attendance_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.attendance_configs_id_seq OWNER TO postgres;

--
-- Name: attendance_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_configs_id_seq OWNED BY public.attendance_configs.id;


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: attendance_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_sessions (
    id bigint NOT NULL,
    timetable_slot_id bigint NOT NULL,
    lecturer_id bigint NOT NULL,
    opened_at timestamp without time zone NOT NULL,
    closed_at timestamp without time zone,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.attendance_sessions OWNER TO postgres;

--
-- Name: attendance_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.attendance_sessions_id_seq OWNER TO postgres;

--
-- Name: attendance_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_sessions_id_seq OWNED BY public.attendance_sessions.id;


--
-- Name: chat_group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_group_members (
    id bigint NOT NULL,
    chat_group_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role character varying(20) DEFAULT 'MEMBER'::character varying NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    left_at timestamp without time zone
);


ALTER TABLE public.chat_group_members OWNER TO postgres;

--
-- Name: chat_group_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_group_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.chat_group_members_id_seq OWNER TO postgres;

--
-- Name: chat_group_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_group_members_id_seq OWNED BY public.chat_group_members.id;


--
-- Name: chat_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_groups (
    id bigint NOT NULL,
    name character varying(200) NOT NULL,
    class_name character varying(50),
    created_by_id bigint NOT NULL,
    type character varying(20) DEFAULT 'CLASS'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_groups OWNER TO postgres;

--
-- Name: chat_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.chat_groups_id_seq OWNER TO postgres;

--
-- Name: chat_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_groups_id_seq OWNED BY public.chat_groups.id;


--
-- Name: chat_message_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_message_reactions (
    id bigint NOT NULL,
    message_id bigint NOT NULL,
    user_id bigint NOT NULL,
    emoji character varying(50) NOT NULL,
    reacted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_message_reactions OWNER TO postgres;

--
-- Name: chat_message_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_message_reactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.chat_message_reactions_id_seq OWNER TO postgres;

--
-- Name: chat_message_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_message_reactions_id_seq OWNED BY public.chat_message_reactions.id;


--
-- Name: chat_message_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_message_reads (
    id bigint NOT NULL,
    message_id bigint NOT NULL,
    user_id bigint NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_message_reads OWNER TO postgres;

--
-- Name: chat_message_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_message_reads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.chat_message_reads_id_seq OWNER TO postgres;

--
-- Name: chat_message_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_message_reads_id_seq OWNED BY public.chat_message_reads.id;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id bigint NOT NULL,
    chat_group_id bigint NOT NULL,
    sender_id bigint NOT NULL,
    content text,
    type character varying(20) DEFAULT 'TEXT'::character varying NOT NULL,
    attachment_url character varying(500),
    attachment_name character varying(255),
    reply_to_id bigint,
    is_deleted boolean DEFAULT false,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.chat_messages_id_seq OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: class_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_sections (
    class_name character varying(50) NOT NULL,
    course_id bigint NOT NULL,
    lecturer_id bigint,
    semester_id bigint NOT NULL,
    status character varying(20) DEFAULT 'UPCOMING'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    number_of_slots integer DEFAULT 20,
    max_students integer DEFAULT 30,
    current_enrollment integer DEFAULT 0,
    grades_submitted boolean DEFAULT false NOT NULL,
    grades_submitted_at timestamp without time zone,
    grades_submitted_by bigint,
    grades_published boolean DEFAULT false NOT NULL,
    grades_published_at timestamp without time zone,
    grades_published_by bigint,
    resit_grades_published boolean DEFAULT false NOT NULL,
    resit_grades_published_at timestamp without time zone,
    resit_grades_published_by bigint,
    CONSTRAINT class_sections_status_check CHECK (((status)::text = ANY ((ARRAY['UPCOMING'::character varying, 'ONGOING'::character varying, 'FINISHED'::character varying])::text[])))
);


ALTER TABLE public.class_sections OWNER TO postgres;

--
-- Name: COLUMN class_sections.grades_submitted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.class_sections.grades_submitted IS 'Whether grades have been submitted to academic office';


--
-- Name: COLUMN class_sections.grades_submitted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.class_sections.grades_submitted_at IS 'Timestamp when grades were submitted';


--
-- Name: COLUMN class_sections.grades_submitted_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.class_sections.grades_submitted_by IS 'Reference to the user who submitted the grades';


--
-- Name: course_prerequisites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_prerequisites (
    course_id bigint NOT NULL,
    prerequisite_id bigint NOT NULL,
    CONSTRAINT chk_no_self_reference CHECK ((course_id <> prerequisite_id))
);


ALTER TABLE public.course_prerequisites OWNER TO postgres;

--
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    credits integer DEFAULT 3,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    number_of_slots integer DEFAULT 20,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    is_calculated_in_gpa boolean DEFAULT true NOT NULL
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.courses_id_seq OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enrollments (
    id bigint NOT NULL,
    class_name character varying(50) NOT NULL,
    student_code character varying(20) NOT NULL,
    student_id bigint NOT NULL,
    status character varying(20) DEFAULT 'ENROLLED'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.enrollments OWNER TO postgres;

--
-- Name: enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enrollments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.enrollments_id_seq OWNER TO postgres;

--
-- Name: enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enrollments_id_seq OWNED BY public.enrollments.id;


--
-- Name: face_encodings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.face_encodings (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    encoding_data bytea NOT NULL,
    registered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    liveness_verified boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    face_image text
);


ALTER TABLE public.face_encodings OWNER TO postgres;

--
-- Name: TABLE face_encodings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.face_encodings IS 'Stores face recognition encoding vectors for biometric verification';


--
-- Name: COLUMN face_encodings.encoding_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.face_encodings.encoding_data IS '128-dimensional face encoding vector from face_recognition library';


--
-- Name: COLUMN face_encodings.liveness_verified; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.face_encodings.liveness_verified IS 'Whether the face was registered with liveness detection';


--
-- Name: COLUMN face_encodings.face_image; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.face_encodings.face_image IS 'Base64 encoded face image captured during registration';


--
-- Name: face_encodings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.face_encodings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.face_encodings_id_seq OWNER TO postgres;

--
-- Name: face_encodings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.face_encodings_id_seq OWNED BY public.face_encodings.id;


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO postgres;

--
-- Name: grade_components; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grade_components (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    weight double precision NOT NULL,
    course_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    is_resit boolean DEFAULT false NOT NULL,
    reference_component_id bigint
);


ALTER TABLE public.grade_components OWNER TO postgres;

--
-- Name: grade_components_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grade_components_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.grade_components_id_seq OWNER TO postgres;

--
-- Name: grade_components_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grade_components_id_seq OWNED BY public.grade_components.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holidays (
    id bigint NOT NULL,
    semester_id bigint,
    holiday_date date NOT NULL,
    description character varying(255),
    is_recurring boolean DEFAULT false NOT NULL
);


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holidays_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.holidays_id_seq OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: import_detail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_detail (
    id bigint NOT NULL,
    import_history_id bigint NOT NULL,
    row_number integer NOT NULL,
    row_data text,
    error_message text,
    status character varying(20) DEFAULT 'SUCCESS'::character varying
);


ALTER TABLE public.import_detail OWNER TO postgres;

--
-- Name: import_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_detail_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.import_detail_id_seq OWNER TO postgres;

--
-- Name: import_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_detail_id_seq OWNED BY public.import_detail.id;


--
-- Name: import_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_history (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    entity_type character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    imported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    success_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    total_count integer DEFAULT 0,
    status character varying(20) DEFAULT 'COMPLETED'::character varying
);


ALTER TABLE public.import_history OWNER TO postgres;

--
-- Name: import_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.import_history_id_seq OWNER TO postgres;

--
-- Name: import_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_history_id_seq OWNED BY public.import_history.id;


--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_jobs (
    id bigint NOT NULL,
    job_id character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    filename character varying(255),
    total_records integer,
    processed_records integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    status_message character varying(255),
    error_message text,
    created_by character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone
);


ALTER TABLE public.import_jobs OWNER TO postgres;

--
-- Name: import_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.import_jobs_id_seq OWNER TO postgres;

--
-- Name: import_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_jobs_id_seq OWNED BY public.import_jobs.id;


--
-- Name: lecturer_grade_otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lecturer_grade_otps (
    user_id bigint NOT NULL,
    otp_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at timestamp without time zone
);


ALTER TABLE public.lecturer_grade_otps OWNER TO postgres;

--
-- Name: TABLE lecturer_grade_otps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.lecturer_grade_otps IS 'Stores fixed OTP for lecturers to verify before managing grades';


--
-- Name: COLUMN lecturer_grade_otps.otp_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lecturer_grade_otps.otp_hash IS 'BCrypt hashed 6-digit OTP code';


--
-- Name: COLUMN lecturer_grade_otps.last_used_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.lecturer_grade_otps.last_used_at IS 'Timestamp of last successful OTP verification';


--
-- Name: lecturer_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lecturer_profiles (
    user_id bigint NOT NULL,
    bio text,
    department character varying(100),
    expertise character varying(500),
    major_id bigint,
    specialization_id bigint
);


ALTER TABLE public.lecturer_profiles OWNER TO postgres;

--
-- Name: majors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.majors (
    id bigint NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    program_duration character varying(50) DEFAULT 4,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.majors OWNER TO postgres;

--
-- Name: majors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.majors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.majors_id_seq OWNER TO postgres;

--
-- Name: majors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.majors_id_seq OWNED BY public.majors.id;


--
-- Name: news; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.news (
    id bigint NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    type character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'MEDIUM'::character varying NOT NULL,
    sender_id bigint,
    target_type character varying(20) DEFAULT 'ALL'::character varying NOT NULL,
    scheduled_at timestamp without time zone,
    sent_at timestamp without time zone,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    target_url character varying(255),
    target_class_name character varying(100),
    thumbnail_image character varying(500),
    CONSTRAINT notifications_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['ALL'::character varying, 'STUDENT'::character varying, 'LECTURER'::character varying, 'ACADEMIC_STAFF'::character varying, 'ADMIN'::character varying, 'USER'::character varying])::text[])))
);


ALTER TABLE public.news OWNER TO postgres;

--
-- Name: news_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.news_attachments (
    news_id bigint NOT NULL,
    url text NOT NULL
);


ALTER TABLE public.news_attachments OWNER TO postgres;

--
-- Name: news_read_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.news_read_status (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    news_id bigint NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.news_read_status OWNER TO postgres;

--
-- Name: news_read_status_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.news_read_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.news_read_status_id_seq OWNER TO postgres;

--
-- Name: news_read_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.news_read_status_id_seq OWNED BY public.news_read_status.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    type character varying(30) DEFAULT 'SYSTEM'::character varying NOT NULL,
    target_url character varying(255),
    target_type character varying(20) DEFAULT 'USER'::character varying NOT NULL,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.news.id;


--
-- Name: notifications_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq1 OWNER TO postgres;

--
-- Name: notifications_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq1 OWNED BY public.notifications.id;


--
-- Name: room_wifi_access_points; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.room_wifi_access_points (
    id bigint NOT NULL,
    room_id bigint NOT NULL,
    wifi_access_point_id bigint NOT NULL,
    signal_strength integer,
    is_primary boolean DEFAULT false NOT NULL,
    position_note character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.room_wifi_access_points OWNER TO postgres;

--
-- Name: room_wifi_access_points_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.room_wifi_access_points_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.room_wifi_access_points_id_seq OWNER TO postgres;

--
-- Name: room_wifi_access_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.room_wifi_access_points_id_seq OWNED BY public.room_wifi_access_points.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rooms (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    capacity integer,
    building character varying(50),
    floor integer,
    grid_row integer,
    grid_col integer,
    grid_row_span integer DEFAULT 1,
    grid_col_span integer DEFAULT 1,
    status character varying(20) DEFAULT 'AVAILABLE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    code character varying(20),
    type character varying(20) DEFAULT 'CLASSROOM'::character varying NOT NULL,
    description character varying(500)
);


ALTER TABLE public.rooms OWNER TO postgres;

--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rooms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rooms_id_seq OWNER TO postgres;

--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: schedule_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedule_requests (
    id bigint NOT NULL,
    requester_id bigint NOT NULL,
    class_name character varying(50) NOT NULL,
    original_slot_id bigint,
    requested_slot_id bigint,
    requested_room_id bigint,
    type character varying(20) NOT NULL,
    reason text,
    file text,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    approver_id bigint,
    approved_at timestamp without time zone,
    approver_note character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    requested_date date,
    requested_slot_number integer
);


ALTER TABLE public.schedule_requests OWNER TO postgres;

--
-- Name: schedule_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schedule_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.schedule_requests_id_seq OWNER TO postgres;

--
-- Name: schedule_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schedule_requests_id_seq OWNED BY public.schedule_requests.id;


--
-- Name: semester_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semester_configs (
    id bigint NOT NULL,
    semester_id bigint NOT NULL,
    max_slot_per_day integer DEFAULT 4 NOT NULL,
    slot_per_subject_per_week integer DEFAULT 2 NOT NULL,
    slot_duration integer DEFAULT 90 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.semester_configs OWNER TO postgres;

--
-- Name: semester_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semester_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.semester_configs_id_seq OWNER TO postgres;

--
-- Name: semester_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semester_configs_id_seq OWNED BY public.semester_configs.id;


--
-- Name: semester_weekdays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semester_weekdays (
    id bigint NOT NULL,
    semester_id bigint NOT NULL,
    weekday integer NOT NULL
);


ALTER TABLE public.semester_weekdays OWNER TO postgres;

--
-- Name: semester_weekdays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semester_weekdays_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.semester_weekdays_id_seq OWNER TO postgres;

--
-- Name: semester_weekdays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semester_weekdays_id_seq OWNED BY public.semester_weekdays.id;


--
-- Name: semesters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semesters (
    id bigint NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status character varying(20) DEFAULT 'UPCOMING'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text
);


ALTER TABLE public.semesters OWNER TO postgres;

--
-- Name: semesters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semesters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.semesters_id_seq OWNER TO postgres;

--
-- Name: semesters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semesters_id_seq OWNED BY public.semesters.id;


--
-- Name: slot_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.slot_types (
    id bigint NOT NULL,
    semester_id bigint NOT NULL,
    name character varying(50) NOT NULL,
    slot_index integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    description character varying(255),
    duration character varying(20) DEFAULT 'MINUTES_90'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.slot_types OWNER TO postgres;

--
-- Name: slot_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.slot_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.slot_types_id_seq OWNER TO postgres;

--
-- Name: slot_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.slot_types_id_seq OWNED BY public.slot_types.id;


--
-- Name: specialization_courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specialization_courses (
    id bigint NOT NULL,
    specialization_id bigint NOT NULL,
    course_id bigint NOT NULL,
    order_index integer DEFAULT 0,
    semester integer DEFAULT 1,
    note character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.specialization_courses OWNER TO postgres;

--
-- Name: specialization_courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specialization_courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.specialization_courses_id_seq OWNER TO postgres;

--
-- Name: specialization_courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specialization_courses_id_seq OWNED BY public.specialization_courses.id;


--
-- Name: specializations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specializations (
    id bigint NOT NULL,
    major_id bigint NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.specializations OWNER TO postgres;

--
-- Name: specializations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specializations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.specializations_id_seq OWNER TO postgres;

--
-- Name: specializations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specializations_id_seq OWNED BY public.specializations.id;


--
-- Name: staging_cs_7dc4c199; Type: TABLE; Schema: public; Owner: postgres
--

CREATE UNLOGGED TABLE public.staging_cs_7dc4c199 (
    row_num integer NOT NULL,
    class_name character varying(100),
    course_code character varying(50),
    lecturer_code character varying(50),
    max_students character varying(10),
    error_message text
);


ALTER TABLE public.staging_cs_7dc4c199 OWNER TO postgres;

--
-- Name: staging_cs_7dc4c199_row_num_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE UNLOGGED SEQUENCE public.staging_cs_7dc4c199_row_num_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.staging_cs_7dc4c199_row_num_seq OWNER TO postgres;

--
-- Name: staging_cs_7dc4c199_row_num_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staging_cs_7dc4c199_row_num_seq OWNED BY public.staging_cs_7dc4c199.row_num;


--
-- Name: staging_cs_aa8fb3a6; Type: TABLE; Schema: public; Owner: postgres
--

CREATE UNLOGGED TABLE public.staging_cs_aa8fb3a6 (
    row_num integer NOT NULL,
    class_name character varying(100),
    course_code character varying(50),
    lecturer_code character varying(50),
    max_students character varying(10),
    error_message text
);


ALTER TABLE public.staging_cs_aa8fb3a6 OWNER TO postgres;

--
-- Name: staging_cs_aa8fb3a6_row_num_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE UNLOGGED SEQUENCE public.staging_cs_aa8fb3a6_row_num_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.staging_cs_aa8fb3a6_row_num_seq OWNER TO postgres;

--
-- Name: staging_cs_aa8fb3a6_row_num_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staging_cs_aa8fb3a6_row_num_seq OWNED BY public.staging_cs_aa8fb3a6.row_num;


--
-- Name: staging_enr_6e0ac58c; Type: TABLE; Schema: public; Owner: postgres
--

CREATE UNLOGGED TABLE public.staging_enr_6e0ac58c (
    row_num integer NOT NULL,
    student_code character varying(50),
    class_name character varying(100),
    error_message text
);


ALTER TABLE public.staging_enr_6e0ac58c OWNER TO postgres;

--
-- Name: staging_enr_6e0ac58c_row_num_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE UNLOGGED SEQUENCE public.staging_enr_6e0ac58c_row_num_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.staging_enr_6e0ac58c_row_num_seq OWNER TO postgres;

--
-- Name: staging_enr_6e0ac58c_row_num_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staging_enr_6e0ac58c_row_num_seq OWNED BY public.staging_enr_6e0ac58c.row_num;


--
-- Name: staging_enr_c4d1b9ec; Type: TABLE; Schema: public; Owner: postgres
--

CREATE UNLOGGED TABLE public.staging_enr_c4d1b9ec (
    row_num integer NOT NULL,
    student_code character varying(50),
    class_name character varying(100),
    error_message text
);


ALTER TABLE public.staging_enr_c4d1b9ec OWNER TO postgres;

--
-- Name: staging_enr_c4d1b9ec_row_num_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE UNLOGGED SEQUENCE public.staging_enr_c4d1b9ec_row_num_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.staging_enr_c4d1b9ec_row_num_seq OWNER TO postgres;

--
-- Name: staging_enr_c4d1b9ec_row_num_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staging_enr_c4d1b9ec_row_num_seq OWNED BY public.staging_enr_c4d1b9ec.row_num;


--
-- Name: student_attendances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_attendances (
    id bigint NOT NULL,
    session_id bigint NOT NULL,
    student_id bigint NOT NULL,
    status character varying(20) NOT NULL,
    check_in_time timestamp without time zone,
    method character varying(20),
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    face_confidence double precision,
    wifi_bssid character varying(17),
    wifi_rssi integer,
    updated_by_id bigint,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attempt_count integer DEFAULT 0,
    failure_reason character varying(500),
    requires_manual_verify boolean DEFAULT false,
    manual_verified_by bigint,
    manual_verified_at timestamp without time zone,
    captured_face_url character varying(500)
);


ALTER TABLE public.student_attendances OWNER TO postgres;

--
-- Name: COLUMN student_attendances.attempt_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_attendances.attempt_count IS 'Number of face recognition attempts made';


--
-- Name: COLUMN student_attendances.requires_manual_verify; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_attendances.requires_manual_verify IS 'Whether lecturer needs to manually verify this attendance';


--
-- Name: student_attendances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_attendances_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_attendances_id_seq OWNER TO postgres;

--
-- Name: student_attendances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_attendances_id_seq OWNED BY public.student_attendances.id;


--
-- Name: student_grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_grades (
    id bigint NOT NULL,
    enrollment_id bigint NOT NULL,
    grade_component_id bigint NOT NULL,
    score double precision NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    graded_at timestamp without time zone,
    graded_by_id bigint,
    note character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.student_grades OWNER TO postgres;

--
-- Name: student_grades_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_grades_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_grades_id_seq OWNER TO postgres;

--
-- Name: student_grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_grades_id_seq OWNED BY public.student_grades.id;


--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_profiles (
    user_id bigint NOT NULL,
    major_id bigint,
    specialization_id bigint,
    sub_specialization_id bigint,
    course character varying(20),
    gpa double precision
);


ALTER TABLE public.student_profiles OWNER TO postgres;

--
-- Name: sub_specialization_courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sub_specialization_courses (
    id bigint NOT NULL,
    sub_specialization_id bigint NOT NULL,
    course_id bigint NOT NULL,
    order_index integer DEFAULT 0,
    semester integer DEFAULT 1,
    note character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sub_specialization_courses OWNER TO postgres;

--
-- Name: sub_specialization_courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sub_specialization_courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sub_specialization_courses_id_seq OWNER TO postgres;

--
-- Name: sub_specialization_courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sub_specialization_courses_id_seq OWNED BY public.sub_specialization_courses.id;


--
-- Name: sub_specializations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sub_specializations (
    id bigint NOT NULL,
    specialization_id bigint NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sub_specializations OWNER TO postgres;

--
-- Name: sub_specializations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sub_specializations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sub_specializations_id_seq OWNER TO postgres;

--
-- Name: sub_specializations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sub_specializations_id_seq OWNED BY public.sub_specializations.id;


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_logs (
    id bigint NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    type character varying(20) NOT NULL,
    source character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    performer_id bigint,
    ip_address character varying(50),
    user_agent text,
    old_value text,
    new_value text
);


ALTER TABLE public.system_logs OWNER TO postgres;

--
-- Name: system_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_logs_id_seq OWNER TO postgres;

--
-- Name: system_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_logs_id_seq OWNED BY public.system_logs.id;


--
-- Name: teaching_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teaching_assignments (
    id bigint NOT NULL,
    lecturer_id bigint NOT NULL,
    course_id bigint NOT NULL,
    semester_id bigint NOT NULL,
    max_classes integer DEFAULT 3 NOT NULL,
    assigned_classes integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.teaching_assignments OWNER TO postgres;

--
-- Name: teaching_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teaching_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.teaching_assignments_id_seq OWNER TO postgres;

--
-- Name: teaching_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teaching_assignments_id_seq OWNED BY public.teaching_assignments.id;


--
-- Name: timetable_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timetable_slots (
    id bigint NOT NULL,
    room_id bigint,
    day_of_week integer NOT NULL,
    slot_number integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'SCHEDULED'::character varying,
    note character varying(500),
    class_name character varying(50),
    date date,
    slot_type_id bigint
);


ALTER TABLE public.timetable_slots OWNER TO postgres;

--
-- Name: timetable_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timetable_slots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.timetable_slots_id_seq OWNER TO postgres;

--
-- Name: timetable_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timetable_slots_id_seq OWNED BY public.timetable_slots.id;


--
-- Name: user_device_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_device_tokens (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token character varying(255) NOT NULL,
    platform character varying(50),
    device_id character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_device_tokens OWNER TO postgres;

--
-- Name: user_device_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_device_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_device_tokens_id_seq OWNER TO postgres;

--
-- Name: user_device_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_device_tokens_id_seq OWNED BY public.user_device_tokens.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    permission character varying(50) NOT NULL,
    granted_by bigint,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_permissions_id_seq OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    ip_address character varying(45),
    province character varying(100),
    city character varying(100),
    latitude numeric(10,8),
    longitude numeric(11,8),
    login_time timestamp without time zone NOT NULL,
    last_activity_time timestamp without time zone,
    is_active boolean DEFAULT true,
    user_agent character varying(500)
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_sessions_id_seq OWNER TO postgres;

--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(50),
    password character varying(255),
    email character varying(150) NOT NULL,
    full_name character varying(150) NOT NULL,
    code character varying(50),
    dob date,
    phone character varying(20),
    avatar character varying(255),
    role character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    face_data_status character varying(20),
    is_password_changed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    face_registration_attempts integer DEFAULT 0 NOT NULL,
    face_registration_blocked_until timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: wifi_access_points; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wifi_access_points (
    id bigint NOT NULL,
    ssid character varying(100) NOT NULL,
    bssid character varying(17) NOT NULL,
    name character varying(100),
    location character varying(200),
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.wifi_access_points OWNER TO postgres;

--
-- Name: wifi_access_points_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wifi_access_points_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wifi_access_points_id_seq OWNER TO postgres;

--
-- Name: wifi_access_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wifi_access_points_id_seq OWNED BY public.wifi_access_points.id;


--
-- Name: academic_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_requests ALTER COLUMN id SET DEFAULT nextval('public.academic_requests_id_seq'::regclass);


--
-- Name: access_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_logs ALTER COLUMN id SET DEFAULT nextval('public.access_logs_id_seq'::regclass);


--
-- Name: ai_chat_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_messages ALTER COLUMN id SET DEFAULT nextval('public.ai_chat_messages_id_seq'::regclass);


--
-- Name: ai_chat_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_sessions ALTER COLUMN id SET DEFAULT nextval('public.ai_chat_sessions_id_seq'::regclass);


--
-- Name: ai_tool_tests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tool_tests ALTER COLUMN id SET DEFAULT nextval('public.ai_tool_tests_id_seq'::regclass);


--
-- Name: ai_tools id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tools ALTER COLUMN id SET DEFAULT nextval('public.ai_tools_id_seq'::regclass);


--
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- Name: assignment_image_embeddings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_image_embeddings ALTER COLUMN id SET DEFAULT nextval('public.assignment_image_embeddings_id_seq'::regclass);


--
-- Name: assignment_plagiarism_checks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_plagiarism_checks ALTER COLUMN id SET DEFAULT nextval('public.assignment_plagiarism_checks_id_seq'::regclass);


--
-- Name: assignment_submission_vector_index id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submission_vector_index ALTER COLUMN id SET DEFAULT nextval('public.assignment_submission_vector_index_id_seq'::regclass);


--
-- Name: assignment_submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions ALTER COLUMN id SET DEFAULT nextval('public.assignment_submissions_id_seq'::regclass);


--
-- Name: assignment_text_embeddings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_text_embeddings ALTER COLUMN id SET DEFAULT nextval('public.assignment_text_embeddings_id_seq'::regclass);


--
-- Name: assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments ALTER COLUMN id SET DEFAULT nextval('public.assignments_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: attendance_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_configs ALTER COLUMN id SET DEFAULT nextval('public.attendance_configs_id_seq'::regclass);


--
-- Name: attendance_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions ALTER COLUMN id SET DEFAULT nextval('public.attendance_sessions_id_seq'::regclass);


--
-- Name: chat_group_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_group_members ALTER COLUMN id SET DEFAULT nextval('public.chat_group_members_id_seq'::regclass);


--
-- Name: chat_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_groups ALTER COLUMN id SET DEFAULT nextval('public.chat_groups_id_seq'::regclass);


--
-- Name: chat_message_reactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reactions ALTER COLUMN id SET DEFAULT nextval('public.chat_message_reactions_id_seq'::regclass);


--
-- Name: chat_message_reads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reads ALTER COLUMN id SET DEFAULT nextval('public.chat_message_reads_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: enrollments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments ALTER COLUMN id SET DEFAULT nextval('public.enrollments_id_seq'::regclass);


--
-- Name: face_encodings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.face_encodings ALTER COLUMN id SET DEFAULT nextval('public.face_encodings_id_seq'::regclass);


--
-- Name: grade_components id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_components ALTER COLUMN id SET DEFAULT nextval('public.grade_components_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: import_detail id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_detail ALTER COLUMN id SET DEFAULT nextval('public.import_detail_id_seq'::regclass);


--
-- Name: import_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_history ALTER COLUMN id SET DEFAULT nextval('public.import_history_id_seq'::regclass);


--
-- Name: import_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_jobs ALTER COLUMN id SET DEFAULT nextval('public.import_jobs_id_seq'::regclass);


--
-- Name: majors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.majors ALTER COLUMN id SET DEFAULT nextval('public.majors_id_seq'::regclass);


--
-- Name: news id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: news_read_status id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news_read_status ALTER COLUMN id SET DEFAULT nextval('public.news_read_status_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq1'::regclass);


--
-- Name: room_wifi_access_points id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_wifi_access_points ALTER COLUMN id SET DEFAULT nextval('public.room_wifi_access_points_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: schedule_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_requests ALTER COLUMN id SET DEFAULT nextval('public.schedule_requests_id_seq'::regclass);


--
-- Name: semester_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semester_configs ALTER COLUMN id SET DEFAULT nextval('public.semester_configs_id_seq'::regclass);


--
-- Name: semester_weekdays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semester_weekdays ALTER COLUMN id SET DEFAULT nextval('public.semester_weekdays_id_seq'::regclass);


--
-- Name: semesters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters ALTER COLUMN id SET DEFAULT nextval('public.semesters_id_seq'::regclass);


--
-- Name: slot_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_types ALTER COLUMN id SET DEFAULT nextval('public.slot_types_id_seq'::regclass);


--
-- Name: specialization_courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialization_courses ALTER COLUMN id SET DEFAULT nextval('public.specialization_courses_id_seq'::regclass);


--
-- Name: specializations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations ALTER COLUMN id SET DEFAULT nextval('public.specializations_id_seq'::regclass);


--
-- Name: staging_cs_7dc4c199 row_num; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staging_cs_7dc4c199 ALTER COLUMN row_num SET DEFAULT nextval('public.staging_cs_7dc4c199_row_num_seq'::regclass);


--
-- Name: staging_cs_aa8fb3a6 row_num; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staging_cs_aa8fb3a6 ALTER COLUMN row_num SET DEFAULT nextval('public.staging_cs_aa8fb3a6_row_num_seq'::regclass);


--
-- Name: staging_enr_6e0ac58c row_num; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staging_enr_6e0ac58c ALTER COLUMN row_num SET DEFAULT nextval('public.staging_enr_6e0ac58c_row_num_seq'::regclass);


--
-- Name: staging_enr_c4d1b9ec row_num; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staging_enr_c4d1b9ec ALTER COLUMN row_num SET DEFAULT nextval('public.staging_enr_c4d1b9ec_row_num_seq'::regclass);


--
-- Name: student_attendances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_attendances ALTER COLUMN id SET DEFAULT nextval('public.student_attendances_id_seq'::regclass);


--
-- Name: student_grades id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_grades ALTER COLUMN id SET DEFAULT nextval('public.student_grades_id_seq'::regclass);


--
-- Name: sub_specialization_courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_specialization_courses ALTER COLUMN id SET DEFAULT nextval('public.sub_specialization_courses_id_seq'::regclass);


--
-- Name: sub_specializations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_specializations ALTER COLUMN id SET DEFAULT nextval('public.sub_specializations_id_seq'::regclass);


--
-- Name: system_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs ALTER COLUMN id SET DEFAULT nextval('public.system_logs_id_seq'::regclass);


--
-- Name: teaching_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments ALTER COLUMN id SET DEFAULT nextval('public.teaching_assignments_id_seq'::regclass);


--
-- Name: timetable_slots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots ALTER COLUMN id SET DEFAULT nextval('public.timetable_slots_id_seq'::regclass);


--
-- Name: user_device_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_device_tokens ALTER COLUMN id SET DEFAULT nextval('public.user_device_tokens_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wifi_access_points id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wifi_access_points ALTER COLUMN id SET DEFAULT nextval('public.wifi_access_points_id_seq'::regclass);


--
-- Name: academic_requests academic_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_requests
    ADD CONSTRAINT academic_requests_pkey PRIMARY KEY (id);


--
-- Name: access_logs access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_messages ai_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_sessions ai_chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_sessions
    ADD CONSTRAINT ai_chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: ai_tool_tests ai_tool_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tool_tests
    ADD CONSTRAINT ai_tool_tests_pkey PRIMARY KEY (id);


--
-- Name: ai_tools ai_tools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tools
    ADD CONSTRAINT ai_tools_pkey PRIMARY KEY (id);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: assignment_image_embeddings assignment_image_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_image_embeddings
    ADD CONSTRAINT assignment_image_embeddings_pkey PRIMARY KEY (id);


--
-- Name: assignment_plagiarism_checks assignment_plagiarism_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_plagiarism_checks
    ADD CONSTRAINT assignment_plagiarism_checks_pkey PRIMARY KEY (id);


--
-- Name: assignment_submission_vector_index assignment_submission_vector_index_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submission_vector_index
    ADD CONSTRAINT assignment_submission_vector_index_pkey PRIMARY KEY (id);


--
-- Name: assignment_submission_vector_index assignment_submission_vector_index_submission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submission_vector_index
    ADD CONSTRAINT assignment_submission_vector_index_submission_id_key UNIQUE (submission_id);


--
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assignment_text_embeddings assignment_text_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_text_embeddings
    ADD CONSTRAINT assignment_text_embeddings_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: attendance_configs attendance_configs_configkey_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_configs
    ADD CONSTRAINT attendance_configs_configkey_key UNIQUE (config_key);


--
-- Name: attendance_configs attendance_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_configs
    ADD CONSTRAINT attendance_configs_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance_sessions attendance_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id);


--
-- Name: chat_group_members chat_group_members_chat_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT chat_group_members_chat_group_id_user_id_key UNIQUE (chat_group_id, user_id);


--
-- Name: chat_group_members chat_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT chat_group_members_pkey PRIMARY KEY (id);


--
-- Name: chat_groups chat_groups_class_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT chat_groups_class_name_key UNIQUE (class_name);


--
-- Name: chat_groups chat_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT chat_groups_pkey PRIMARY KEY (id);


--
-- Name: chat_message_reactions chat_message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reactions
    ADD CONSTRAINT chat_message_reactions_pkey PRIMARY KEY (id);


--
-- Name: chat_message_reads chat_message_reads_message_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_message_id_user_id_key UNIQUE (message_id, user_id);


--
-- Name: chat_message_reads chat_message_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: class_sections class_sections_class_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT class_sections_class_name_key UNIQUE (class_name);


--
-- Name: class_sections class_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT class_sections_pkey PRIMARY KEY (class_name);


--
-- Name: course_prerequisites course_prerequisites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT course_prerequisites_pkey PRIMARY KEY (course_id, prerequisite_id);


--
-- Name: courses courses_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_code_key UNIQUE (code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_class_name_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_class_name_student_id_key UNIQUE (class_name, student_id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: face_encodings face_encodings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.face_encodings
    ADD CONSTRAINT face_encodings_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: grade_components grade_components_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_components
    ADD CONSTRAINT grade_components_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: import_detail import_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_detail
    ADD CONSTRAINT import_detail_pkey PRIMARY KEY (id);


--
-- Name: import_history import_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_history
    ADD CONSTRAINT import_history_pkey PRIMARY KEY (id);


--
-- Name: import_jobs import_jobs_jobid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_jobid_key UNIQUE (job_id);


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_pkey PRIMARY KEY (id);


--
-- Name: lecturer_grade_otps lecturer_grade_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_grade_otps
    ADD CONSTRAINT lecturer_grade_otps_pkey PRIMARY KEY (user_id);


--
-- Name: lecturer_profiles lecturer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_profiles
    ADD CONSTRAINT lecturer_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: majors majors_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.majors
    ADD CONSTRAINT majors_code_key UNIQUE (code);


--
-- Name: majors majors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.majors
    ADD CONSTRAINT majors_pkey PRIMARY KEY (id);


--
-- Name: news_read_status news_read_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news_read_status
    ADD CONSTRAINT news_read_status_pkey PRIMARY KEY (id);


--
-- Name: news notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey1 PRIMARY KEY (id);


--
-- Name: room_wifi_access_points room_wifi_access_points_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_wifi_access_points
    ADD CONSTRAINT room_wifi_access_points_pkey PRIMARY KEY (id);


--
-- Name: room_wifi_access_points room_wifi_access_points_room_id_wifi_access_point_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_wifi_access_points
    ADD CONSTRAINT room_wifi_access_points_room_id_wifi_access_point_id_key UNIQUE (room_id, wifi_access_point_id);


--
-- Name: rooms rooms_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_code_key UNIQUE (code);


--
-- Name: rooms rooms_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_name_key UNIQUE (name);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: schedule_requests schedule_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_pkey PRIMARY KEY (id);


--
-- Name: semester_configs semester_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semester_configs
    ADD CONSTRAINT semester_configs_pkey PRIMARY KEY (id);


--
-- Name: semester_configs semester_configs_semester_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semester_configs
    ADD CONSTRAINT semester_configs_semester_id_key UNIQUE (semester_id);


--
-- Name: semester_weekdays semester_weekdays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semester_weekdays
    ADD CONSTRAINT semester_weekdays_pkey PRIMARY KEY (id);


--
-- Name: semester_weekdays semester_weekdays_semester_id_weekday_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semester_weekdays
    ADD CONSTRAINT semester_weekdays_semester_id_weekday_key UNIQUE (semester_id, weekday);


--
-- Name: semesters semesters_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters
    ADD CONSTRAINT semesters_code_key UNIQUE (code);


--
-- Name: semesters semesters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters
    ADD CONSTRAINT semesters_pkey PRIMARY KEY (id);


--
-- Name: slot_types slot_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_types
    ADD CONSTRAINT slot_types_pkey PRIMARY KEY (id);


--
-- Name: slot_types slot_types_semester_id_slot_index_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_types
    ADD CONSTRAINT slot_types_semester_id_slot_index_key UNIQUE (semester_id, slot_index);


--
-- Name: specialization_courses specialization_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialization_courses
    ADD CONSTRAINT specialization_courses_pkey PRIMARY KEY (id);


--
-- Name: specialization_courses specialization_courses_specialization_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialization_courses
    ADD CONSTRAINT specialization_courses_specialization_id_course_id_key UNIQUE (specialization_id, course_id);


--
-- Name: specializations specializations_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_code_key UNIQUE (code);


--
-- Name: specializations specializations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_pkey PRIMARY KEY (id);


--
-- Name: staging_cs_7dc4c199 staging_cs_7dc4c199_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staging_cs_7dc4c199
    ADD CONSTRAINT staging_cs_7dc4c199_pkey PRIMARY KEY (row_num);


--
-- Name: staging_cs_aa8fb3a6 staging_cs_aa8fb3a6_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staging_cs_aa8fb3a6
    ADD CONSTRAINT staging_cs_aa8fb3a6_pkey PRIMARY KEY (row_num);


--
-- Name: staging_enr_6e0ac58c staging_enr_6e0ac58c_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staging_enr_6e0ac58c
    ADD CONSTRAINT staging_enr_6e0ac58c_pkey PRIMARY KEY (row_num);


--
-- Name: staging_enr_c4d1b9ec staging_enr_c4d1b9ec_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staging_enr_c4d1b9ec
    ADD CONSTRAINT staging_enr_c4d1b9ec_pkey PRIMARY KEY (row_num);


--
-- Name: student_attendances student_attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_attendances
    ADD CONSTRAINT student_attendances_pkey PRIMARY KEY (id);


--
-- Name: student_grades student_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_grades
    ADD CONSTRAINT student_grades_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: sub_specialization_courses sub_specialization_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_specialization_courses
    ADD CONSTRAINT sub_specialization_courses_pkey PRIMARY KEY (id);


--
-- Name: sub_specialization_courses sub_specialization_courses_sub_specialization_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_specialization_courses
    ADD CONSTRAINT sub_specialization_courses_sub_specialization_id_course_id_key UNIQUE (sub_specialization_id, course_id);


--
-- Name: sub_specializations sub_specializations_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_specializations
    ADD CONSTRAINT sub_specializations_code_key UNIQUE (code);


--
-- Name: sub_specializations sub_specializations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_specializations
    ADD CONSTRAINT sub_specializations_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: teaching_assignments teaching_assignments_lecturer_id_course_id_semester_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_lecturer_id_course_id_semester_id_key UNIQUE (lecturer_id, course_id, semester_id);


--
-- Name: teaching_assignments teaching_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_pkey PRIMARY KEY (id);


--
-- Name: timetable_slots timetable_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_pkey PRIMARY KEY (id);


--
-- Name: assignment_submissions uk_assignment_student; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT uk_assignment_student UNIQUE (assignment_id, student_id);


--
-- Name: chat_message_reactions uk_message_user_emoji; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reactions
    ADD CONSTRAINT uk_message_user_emoji UNIQUE (message_id, user_id, emoji);


--
-- Name: ai_tools uq_ai_tools_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tools
    ADD CONSTRAINT uq_ai_tools_name UNIQUE (name);


--
-- Name: user_device_tokens user_device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_device_tokens
    ADD CONSTRAINT user_device_tokens_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_permission_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_permission_key UNIQUE (user_id, permission);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_code_key UNIQUE (code);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: wifi_access_points wifi_access_points_bssid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wifi_access_points
    ADD CONSTRAINT wifi_access_points_bssid_key UNIQUE (bssid);


--
-- Name: wifi_access_points wifi_access_points_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wifi_access_points
    ADD CONSTRAINT wifi_access_points_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: idx_academic_request_semester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_academic_request_semester ON public.academic_requests USING btree (semester_id);


--
-- Name: idx_academic_request_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_academic_request_status ON public.academic_requests USING btree (status);


--
-- Name: idx_academic_request_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_academic_request_student ON public.academic_requests USING btree (student_id);


--
-- Name: idx_academic_request_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_academic_request_type ON public.academic_requests USING btree (request_type);


--
-- Name: idx_ai_tool_tests_tool_created_at_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_tool_tests_tool_created_at_desc ON public.ai_tool_tests USING btree (tool_id, created_at DESC);


--
-- Name: idx_ai_tool_tests_tool_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_tool_tests_tool_id ON public.ai_tool_tests USING btree (tool_id);


--
-- Name: idx_ai_tools_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_tools_is_active ON public.ai_tools USING btree (is_active);


--
-- Name: idx_aie_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aie_course_id ON public.assignment_image_embeddings USING btree (course_id);


--
-- Name: idx_aie_submission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aie_submission_id ON public.assignment_image_embeddings USING btree (submission_id);


--
-- Name: idx_apc_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apc_assignment ON public.assignment_plagiarism_checks USING btree (assignment_id);


--
-- Name: idx_apc_compared_submission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apc_compared_submission ON public.assignment_plagiarism_checks USING btree (compared_submission_id);


--
-- Name: idx_apc_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apc_created_at ON public.assignment_plagiarism_checks USING btree (created_at);


--
-- Name: idx_apc_target_submission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apc_target_submission ON public.assignment_plagiarism_checks USING btree (target_submission_id);


--
-- Name: idx_assignment_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_class ON public.assignments USING btree (class_name);


--
-- Name: idx_assignment_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_created_by ON public.assignments USING btree (created_by);


--
-- Name: idx_assignment_slot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_slot ON public.assignments USING btree (timetable_slot_id);


--
-- Name: idx_assignment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_status ON public.assignments USING btree (status);


--
-- Name: idx_assignment_sub_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_sub_assignment ON public.assignment_submissions USING btree (assignment_id);


--
-- Name: idx_assignment_sub_enrollment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_sub_enrollment ON public.assignment_submissions USING btree (enrollment_id);


--
-- Name: idx_assignment_sub_plagiarism_percent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_sub_plagiarism_percent ON public.assignment_submissions USING btree (plagiarism_percent);


--
-- Name: idx_assignment_sub_plagiarism_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_sub_plagiarism_status ON public.assignment_submissions USING btree (plagiarism_status);


--
-- Name: idx_assignment_sub_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_sub_status ON public.assignment_submissions USING btree (status);


--
-- Name: idx_assignment_sub_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_sub_student ON public.assignment_submissions USING btree (student_id);


--
-- Name: idx_asvi_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asvi_course_id ON public.assignment_submission_vector_index USING btree (course_id);


--
-- Name: idx_asvi_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asvi_status ON public.assignment_submission_vector_index USING btree (status);


--
-- Name: idx_ate_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ate_course_id ON public.assignment_text_embeddings USING btree (course_id);


--
-- Name: idx_ate_submission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ate_submission_id ON public.assignment_text_embeddings USING btree (submission_id);


--
-- Name: idx_class_section_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_section_status ON public.class_sections USING btree (status);


--
-- Name: idx_class_sections_course; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_sections_course ON public.class_sections USING btree (course_id);


--
-- Name: idx_class_sections_grades_submitted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_sections_grades_submitted ON public.class_sections USING btree (grades_submitted) WHERE (grades_submitted = true);


--
-- Name: idx_class_sections_name_upper_trim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_sections_name_upper_trim ON public.class_sections USING btree (upper(TRIM(BOTH FROM class_name)));


--
-- Name: idx_class_sections_semester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_sections_semester ON public.class_sections USING btree (semester_id);


--
-- Name: idx_course_number_of_slots; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_course_number_of_slots ON public.courses USING btree (number_of_slots);


--
-- Name: idx_course_prerequisites_course; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_course_prerequisites_course ON public.course_prerequisites USING btree (course_id);


--
-- Name: idx_course_prerequisites_prereq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_course_prerequisites_prereq ON public.course_prerequisites USING btree (prerequisite_id);


--
-- Name: idx_courses_code_upper_trim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_courses_code_upper_trim ON public.courses USING btree (upper(TRIM(BOTH FROM code)));


--
-- Name: idx_enrollment_class_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollment_class_name ON public.enrollments USING btree (class_name);


--
-- Name: idx_enrollment_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollment_student ON public.enrollments USING btree (student_id);


--
-- Name: idx_enrollment_student_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollment_student_code ON public.enrollments USING btree (student_code);


--
-- Name: idx_face_encodings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_face_encodings_user_id ON public.face_encodings USING btree (user_id);


--
-- Name: idx_grade_component_course; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grade_component_course ON public.grade_components USING btree (course_id);


--
-- Name: idx_grade_component_resit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grade_component_resit ON public.grade_components USING btree (is_resit);


--
-- Name: idx_grade_component_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grade_component_type ON public.grade_components USING btree (type);


--
-- Name: idx_holidays_semester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_holidays_semester ON public.holidays USING btree (semester_id);


--
-- Name: idx_lecturer_grade_otps_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lecturer_grade_otps_user_id ON public.lecturer_grade_otps USING btree (user_id);


--
-- Name: idx_message_reaction_message; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_reaction_message ON public.chat_message_reactions USING btree (message_id);


--
-- Name: idx_message_reaction_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_reaction_user ON public.chat_message_reactions USING btree (user_id);


--
-- Name: idx_news_read_status_news; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_read_status_news ON public.news_read_status USING btree (news_id);


--
-- Name: idx_news_read_status_read_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_read_status_read_at ON public.news_read_status USING btree (read_at);


--
-- Name: idx_news_read_status_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_read_status_user ON public.news_read_status USING btree (user_id);


--
-- Name: idx_news_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_sender ON public.news USING btree (sender_id);


--
-- Name: idx_news_sent_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_sent_at ON public.news USING btree (sent_at);


--
-- Name: idx_news_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_status ON public.news USING btree (status);


--
-- Name: idx_news_target_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_target_class ON public.news USING btree (target_class_name);


--
-- Name: idx_news_target_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_target_type ON public.news USING btree (target_type);


--
-- Name: idx_news_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_type ON public.news USING btree (type);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_sent_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_sent_at ON public.notifications USING btree (sent_at);


--
-- Name: idx_notifications_target_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_target_type ON public.notifications USING btree (target_type);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_schedule_request_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_request_class ON public.schedule_requests USING btree (class_name);


--
-- Name: idx_schedule_request_requester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_request_requester ON public.schedule_requests USING btree (requester_id);


--
-- Name: idx_schedule_request_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_request_status ON public.schedule_requests USING btree (status);


--
-- Name: idx_semester_configs_semester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_semester_configs_semester ON public.semester_configs USING btree (semester_id);


--
-- Name: idx_semester_weekdays_semester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_semester_weekdays_semester ON public.semester_weekdays USING btree (semester_id);


--
-- Name: idx_semesters_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_semesters_status ON public.semesters USING btree (status);


--
-- Name: idx_slot_types_semester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_slot_types_semester ON public.slot_types USING btree (semester_id);


--
-- Name: idx_specializations_major; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_specializations_major ON public.specializations USING btree (major_id);


--
-- Name: idx_student_attendance_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_attendance_session ON public.student_attendances USING btree (session_id);


--
-- Name: idx_student_attendance_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_attendance_student ON public.student_attendances USING btree (student_id);


--
-- Name: idx_student_attendances_manual_verify; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_attendances_manual_verify ON public.student_attendances USING btree (requires_manual_verify) WHERE (requires_manual_verify = true);


--
-- Name: idx_sub_specializations_spec; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sub_specializations_spec ON public.sub_specializations USING btree (specialization_id);


--
-- Name: idx_timetable_slot_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timetable_slot_status ON public.timetable_slots USING btree (status);


--
-- Name: idx_token_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_user ON public.user_device_tokens USING btree (user_id);


--
-- Name: idx_token_value; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_token_value ON public.user_device_tokens USING btree (token);


--
-- Name: idx_user_code_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_code_trgm ON public.users USING gin (code public.gin_trgm_ops);


--
-- Name: idx_user_email_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_email_trgm ON public.users USING gin (email public.gin_trgm_ops);


--
-- Name: idx_user_full_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_full_name_trgm ON public.users USING gin (full_name public.gin_trgm_ops);


--
-- Name: idx_user_news; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_news ON public.news_read_status USING btree (user_id, news_id);


--
-- Name: idx_user_permission_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permission_user ON public.user_permissions USING btree (user_id);


--
-- Name: idx_users_code_upper_trim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_code_upper_trim ON public.users USING btree (upper(TRIM(BOTH FROM code))) WHERE ((role)::text = 'STUDENT'::text);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_users_username_upper_trim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username_upper_trim ON public.users USING btree (upper(TRIM(BOTH FROM username)));


--
-- Name: staging_cs_7dc4c199_class_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX staging_cs_7dc4c199_class_name_idx ON public.staging_cs_7dc4c199 USING btree (class_name);


--
-- Name: staging_cs_7dc4c199_course_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX staging_cs_7dc4c199_course_code_idx ON public.staging_cs_7dc4c199 USING btree (course_code);


--
-- Name: staging_cs_aa8fb3a6_class_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX staging_cs_aa8fb3a6_class_name_idx ON public.staging_cs_aa8fb3a6 USING btree (class_name);


--
-- Name: staging_cs_aa8fb3a6_course_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX staging_cs_aa8fb3a6_course_code_idx ON public.staging_cs_aa8fb3a6 USING btree (course_code);


--
-- Name: staging_enr_6e0ac58c_class_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX staging_enr_6e0ac58c_class_name_idx ON public.staging_enr_6e0ac58c USING btree (class_name);


--
-- Name: staging_enr_6e0ac58c_student_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX staging_enr_6e0ac58c_student_code_idx ON public.staging_enr_6e0ac58c USING btree (student_code);


--
-- Name: staging_enr_c4d1b9ec_class_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX staging_enr_c4d1b9ec_class_name_idx ON public.staging_enr_c4d1b9ec USING btree (class_name);


--
-- Name: staging_enr_c4d1b9ec_student_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX staging_enr_c4d1b9ec_student_code_idx ON public.staging_enr_c4d1b9ec USING btree (student_code);


--
-- Name: ai_chat_sessions trg_ai_chat_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ai_chat_sessions_updated_at BEFORE UPDATE ON public.ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_tools trg_ai_tools_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ai_tools_updated_at BEFORE UPDATE ON public.ai_tools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attendance_configs trg_attendance_configs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_attendance_configs_updated_at BEFORE UPDATE ON public.attendance_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: class_sections trg_class_sections_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_class_sections_updated_at BEFORE UPDATE ON public.class_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: courses trg_courses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: enrollments trg_enrollments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: grade_components trg_grade_components_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_grade_components_updated_at BEFORE UPDATE ON public.grade_components FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: majors trg_majors_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_majors_updated_at BEFORE UPDATE ON public.majors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: news trg_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: room_wifi_access_points trg_room_wifi_access_points_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_room_wifi_access_points_updated_at BEFORE UPDATE ON public.room_wifi_access_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rooms trg_rooms_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: schedule_requests trg_schedule_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_schedule_requests_updated_at BEFORE UPDATE ON public.schedule_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: semesters trg_semesters_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_semesters_updated_at BEFORE UPDATE ON public.semesters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: specialization_courses trg_specialization_courses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_specialization_courses_updated_at BEFORE UPDATE ON public.specialization_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: specializations trg_specializations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_specializations_updated_at BEFORE UPDATE ON public.specializations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_grades trg_student_grades_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_student_grades_updated_at BEFORE UPDATE ON public.student_grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_specialization_courses trg_sub_specialization_courses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sub_specialization_courses_updated_at BEFORE UPDATE ON public.sub_specialization_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_specializations trg_sub_specializations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sub_specializations_updated_at BEFORE UPDATE ON public.sub_specializations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: semesters trg_sync_class_section_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_class_section_status AFTER UPDATE OF status ON public.semesters FOR EACH ROW EXECUTE FUNCTION public.sync_class_section_status_from_semester();


--
-- Name: teaching_assignments trg_teaching_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_teaching_assignments_updated_at BEFORE UPDATE ON public.teaching_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: timetable_slots trg_timetable_slots_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_timetable_slots_updated_at BEFORE UPDATE ON public.timetable_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_device_tokens trg_user_device_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_device_tokens_updated_at BEFORE UPDATE ON public.user_device_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wifi_access_points trg_wifi_access_points_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_wifi_access_points_updated_at BEFORE UPDATE ON public.wifi_access_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: access_logs access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ai_chat_messages ai_chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE;


--
-- Name: ai_chat_sessions ai_chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_sessions
    ADD CONSTRAINT ai_chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: alerts alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: assignment_image_embeddings assignment_image_embeddings_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_image_embeddings
    ADD CONSTRAINT assignment_image_embeddings_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_image_embeddings assignment_image_embeddings_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_image_embeddings
    ADD CONSTRAINT assignment_image_embeddings_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: assignment_image_embeddings assignment_image_embeddings_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_image_embeddings
    ADD CONSTRAINT assignment_image_embeddings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: assignment_image_embeddings assignment_image_embeddings_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_image_embeddings
    ADD CONSTRAINT assignment_image_embeddings_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assignment_submissions(id) ON DELETE CASCADE;


--
-- Name: assignment_plagiarism_checks assignment_plagiarism_checks_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_plagiarism_checks
    ADD CONSTRAINT assignment_plagiarism_checks_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_plagiarism_checks assignment_plagiarism_checks_checker_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_plagiarism_checks
    ADD CONSTRAINT assignment_plagiarism_checks_checker_lecturer_id_fkey FOREIGN KEY (checker_lecturer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: assignment_plagiarism_checks assignment_plagiarism_checks_compared_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_plagiarism_checks
    ADD CONSTRAINT assignment_plagiarism_checks_compared_submission_id_fkey FOREIGN KEY (compared_submission_id) REFERENCES public.assignment_submissions(id) ON DELETE SET NULL;


--
-- Name: assignment_plagiarism_checks assignment_plagiarism_checks_target_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_plagiarism_checks
    ADD CONSTRAINT assignment_plagiarism_checks_target_submission_id_fkey FOREIGN KEY (target_submission_id) REFERENCES public.assignment_submissions(id) ON DELETE CASCADE;


--
-- Name: assignment_submission_vector_index assignment_submission_vector_index_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submission_vector_index
    ADD CONSTRAINT assignment_submission_vector_index_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: assignment_submission_vector_index assignment_submission_vector_index_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submission_vector_index
    ADD CONSTRAINT assignment_submission_vector_index_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assignment_submissions(id) ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--
-- Name: assignment_submissions assignment_submissions_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);


--
-- Name: assignment_submissions assignment_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: assignment_text_embeddings assignment_text_embeddings_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_text_embeddings
    ADD CONSTRAINT assignment_text_embeddings_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_text_embeddings assignment_text_embeddings_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_text_embeddings
    ADD CONSTRAINT assignment_text_embeddings_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: assignment_text_embeddings assignment_text_embeddings_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_text_embeddings
    ADD CONSTRAINT assignment_text_embeddings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: assignment_text_embeddings assignment_text_embeddings_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_text_embeddings
    ADD CONSTRAINT assignment_text_embeddings_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assignment_submissions(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_class_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_class_name_fkey FOREIGN KEY (class_name) REFERENCES public.class_sections(class_name);


--
-- Name: assignments assignments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: assignments assignments_timetable_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_timetable_slot_id_fkey FOREIGN KEY (timetable_slot_id) REFERENCES public.timetable_slots(id);


--
-- Name: attendance_sessions attendance_sessions_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id);


--
-- Name: attendance_sessions attendance_sessions_timetable_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_timetable_slot_id_fkey FOREIGN KEY (timetable_slot_id) REFERENCES public.timetable_slots(id);


--
-- Name: attendance attendance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: chat_group_members chat_group_members_chat_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT chat_group_members_chat_group_id_fkey FOREIGN KEY (chat_group_id) REFERENCES public.chat_groups(id) ON DELETE CASCADE;


--
-- Name: chat_group_members chat_group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT chat_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_groups chat_groups_class_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT chat_groups_class_name_fkey FOREIGN KEY (class_name) REFERENCES public.class_sections(class_name);


--
-- Name: chat_groups chat_groups_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT chat_groups_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: chat_message_reactions chat_message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reactions
    ADD CONSTRAINT chat_message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_message_reactions chat_message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reactions
    ADD CONSTRAINT chat_message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_message_reads chat_message_reads_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_message_reads chat_message_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_chat_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_chat_group_id_fkey FOREIGN KEY (chat_group_id) REFERENCES public.chat_groups(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.chat_messages(id);


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: class_sections class_sections_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT class_sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: class_sections class_sections_grades_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT class_sections_grades_submitted_by_fkey FOREIGN KEY (grades_submitted_by) REFERENCES public.users(id);


--
-- Name: class_sections class_sections_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT class_sections_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id);


--
-- Name: class_sections class_sections_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT class_sections_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: enrollments enrollments_class_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_class_name_fkey FOREIGN KEY (class_name) REFERENCES public.class_sections(class_name);


--
-- Name: academic_requests fk_academic_request_approver; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_requests
    ADD CONSTRAINT fk_academic_request_approver FOREIGN KEY (approver_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: academic_requests fk_academic_request_class_section; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_requests
    ADD CONSTRAINT fk_academic_request_class_section FOREIGN KEY (class_section_id) REFERENCES public.class_sections(class_name) ON DELETE SET NULL;


--
-- Name: academic_requests fk_academic_request_course; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_requests
    ADD CONSTRAINT fk_academic_request_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: academic_requests fk_academic_request_semester; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_requests
    ADD CONSTRAINT fk_academic_request_semester FOREIGN KEY (semester_id) REFERENCES public.semesters(id) ON DELETE SET NULL;


--
-- Name: academic_requests fk_academic_request_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_requests
    ADD CONSTRAINT fk_academic_request_student FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ai_tool_tests fk_ai_tool_tests_tool; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tool_tests
    ADD CONSTRAINT fk_ai_tool_tests_tool FOREIGN KEY (tool_id) REFERENCES public.ai_tools(id) ON DELETE CASCADE;


--
-- Name: student_attendances fk_attendance_manual_verified_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_attendances
    ADD CONSTRAINT fk_attendance_manual_verified_by FOREIGN KEY (manual_verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: class_sections fk_class_sections_grades_published_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT fk_class_sections_grades_published_by FOREIGN KEY (grades_published_by) REFERENCES public.users(id);


--
-- Name: class_sections fk_class_sections_resit_grades_published_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT fk_class_sections_resit_grades_published_by FOREIGN KEY (resit_grades_published_by) REFERENCES public.users(id);


--
-- Name: face_encodings fk_face_encoding_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.face_encodings
    ADD CONSTRAINT fk_face_encoding_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: grade_components fk_grade_component_course; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_components
    ADD CONSTRAINT fk_grade_component_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: grade_components fk_grade_component_reference; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_components
    ADD CONSTRAINT fk_grade_component_reference FOREIGN KEY (reference_component_id) REFERENCES public.grade_components(id) ON DELETE SET NULL;


--
-- Name: lecturer_grade_otps fk_lecturer_grade_otps_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_grade_otps
    ADD CONSTRAINT fk_lecturer_grade_otps_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lecturer_profiles fk_lp_major; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_profiles
    ADD CONSTRAINT fk_lp_major FOREIGN KEY (major_id) REFERENCES public.majors(id) ON DELETE SET NULL;


--
-- Name: lecturer_profiles fk_lp_specialization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_profiles
    ADD CONSTRAINT fk_lp_specialization FOREIGN KEY (specialization_id) REFERENCES public.specializations(id) ON DELETE SET NULL;


--
-- Name: news_read_status fk_news_read_status_news; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news_read_status
    ADD CONSTRAINT fk_news_read_status_news FOREIGN KEY (news_id) REFERENCES public.news(id) ON DELETE CASCADE;


--
-- Name: news_read_status fk_news_read_status_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news_read_status
    ADD CONSTRAINT fk_news_read_status_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: course_prerequisites fk_prereq_course; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT fk_prereq_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_prerequisites fk_prereq_prerequisite; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT fk_prereq_prerequisite FOREIGN KEY (prerequisite_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: system_logs fk_system_logs_performer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT fk_system_logs_performer FOREIGN KEY (performer_id) REFERENCES public.users(id);


--
-- Name: timetable_slots fk_timetable_slot_class; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT fk_timetable_slot_class FOREIGN KEY (class_name) REFERENCES public.class_sections(class_name) ON DELETE CASCADE;


--
-- Name: grade_components grade_components_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_components
    ADD CONSTRAINT grade_components_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: holidays holidays_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id) ON DELETE CASCADE;


--
-- Name: import_detail import_detail_import_history_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_detail
    ADD CONSTRAINT import_detail_import_history_id_fkey FOREIGN KEY (import_history_id) REFERENCES public.import_history(id) ON DELETE CASCADE;


--
-- Name: import_history import_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_history
    ADD CONSTRAINT import_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: lecturer_profiles lecturer_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_profiles
    ADD CONSTRAINT lecturer_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: news_attachments news_attachments_news_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news_attachments
    ADD CONSTRAINT news_attachments_news_id_fkey FOREIGN KEY (news_id) REFERENCES public.news(id) ON DELETE CASCADE;


--
-- Name: news notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: room_wifi_access_points room_wifi_access_points_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_wifi_access_points
    ADD CONSTRAINT room_wifi_access_points_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: room_wifi_access_points room_wifi_access_points_wifi_access_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_wifi_access_points
    ADD CONSTRAINT room_wifi_access_points_wifi_access_point_id_fkey FOREIGN KEY (wifi_access_point_id) REFERENCES public.wifi_access_points(id);


--
-- Name: schedule_requests schedule_requests_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: schedule_requests schedule_requests_class_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_class_name_fkey FOREIGN KEY (class_name) REFERENCES public.class_sections(class_name);


--
-- Name: schedule_requests schedule_requests_original_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_original_slot_id_fkey FOREIGN KEY (original_slot_id) REFERENCES public.timetable_slots(id);


--
-- Name: schedule_requests schedule_requests_requested_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_requested_room_id_fkey FOREIGN KEY (requested_room_id) REFERENCES public.rooms(id);


--
-- Name: schedule_requests schedule_requests_requested_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_requested_slot_id_fkey FOREIGN KEY (requested_slot_id) REFERENCES public.timetable_slots(id);


--
-- Name: schedule_requests schedule_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_requests
    ADD CONSTRAINT schedule_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id);


--
-- Name: semester_configs semester_configs_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semester_configs
    ADD CONSTRAINT semester_configs_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id) ON DELETE CASCADE;


--
-- Name: semester_weekdays semester_weekdays_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semester_weekdays
    ADD CONSTRAINT semester_weekdays_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id) ON DELETE CASCADE;


--
-- Name: slot_types slot_types_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_types
    ADD CONSTRAINT slot_types_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id) ON DELETE CASCADE;


--
-- Name: specialization_courses specialization_courses_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialization_courses
    ADD CONSTRAINT specialization_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: specialization_courses specialization_courses_specialization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialization_courses
    ADD CONSTRAINT specialization_courses_specialization_id_fkey FOREIGN KEY (specialization_id) REFERENCES public.specializations(id) ON DELETE CASCADE;


--
-- Name: specializations specializations_major_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_major_id_fkey FOREIGN KEY (major_id) REFERENCES public.majors(id) ON DELETE CASCADE;


--
-- Name: student_attendances student_attendances_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_attendances
    ADD CONSTRAINT student_attendances_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;


--
-- Name: student_attendances student_attendances_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_attendances
    ADD CONSTRAINT student_attendances_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_attendances student_attendances_updated_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_attendances
    ADD CONSTRAINT student_attendances_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES public.users(id);


--
-- Name: student_grades student_grades_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_grades
    ADD CONSTRAINT student_grades_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);


--
-- Name: student_grades student_grades_grade_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_grades
    ADD CONSTRAINT student_grades_grade_component_id_fkey FOREIGN KEY (grade_component_id) REFERENCES public.grade_components(id);


--
-- Name: student_grades student_grades_graded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_grades
    ADD CONSTRAINT student_grades_graded_by_id_fkey FOREIGN KEY (graded_by_id) REFERENCES public.users(id);


--
-- Name: student_profiles student_profiles_major_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_major_id_fkey FOREIGN KEY (major_id) REFERENCES public.majors(id);


--
-- Name: student_profiles student_profiles_specialization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_specialization_id_fkey FOREIGN KEY (specialization_id) REFERENCES public.specializations(id);


--
-- Name: student_profiles student_profiles_sub_specialization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_sub_specialization_id_fkey FOREIGN KEY (sub_specialization_id) REFERENCES public.sub_specializations(id);


--
-- Name: student_profiles student_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sub_specialization_courses sub_specialization_courses_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_specialization_courses
    ADD CONSTRAINT sub_specialization_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: sub_specialization_courses sub_specialization_courses_sub_specialization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_specialization_courses
    ADD CONSTRAINT sub_specialization_courses_sub_specialization_id_fkey FOREIGN KEY (sub_specialization_id) REFERENCES public.sub_specializations(id) ON DELETE CASCADE;


--
-- Name: sub_specializations sub_specializations_specialization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_specializations
    ADD CONSTRAINT sub_specializations_specialization_id_fkey FOREIGN KEY (specialization_id) REFERENCES public.specializations(id) ON DELETE CASCADE;


--
-- Name: teaching_assignments teaching_assignments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: teaching_assignments teaching_assignments_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id);


--
-- Name: teaching_assignments teaching_assignments_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: timetable_slots timetable_slots_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: timetable_slots timetable_slots_slot_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_slot_type_id_fkey FOREIGN KEY (slot_type_id) REFERENCES public.slot_types(id);


--
-- Name: user_device_tokens user_device_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_device_tokens
    ADD CONSTRAINT user_device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict vh6VNRdU9ZEP0BVp8ueo7jIKCTQzKNQRhtUKikhdqLpJAUl1PVbTB2yPaKZgnL3

