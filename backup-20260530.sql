--
-- PostgreSQL database dump
--

\restrict 7nk9gwBYh4hr793ocBkeBqd9eH6LNgW2q46EWXg4Pb55QSqJtgQoelFjl4Zel7r

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: ai_search_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_search_logs (
    id integer NOT NULL,
    key text NOT NULL,
    "userId" integer,
    "userQuery" text NOT NULL,
    "filterExtractionPrompt" text,
    "filterExtractionResponse" text,
    "hardFilters" text,
    "softFilters" text,
    metro text,
    bus text,
    school text,
    hospital text,
    park text,
    university text,
    "homesCountBeforeFilter" integer NOT NULL,
    "homesCountAfterFilter" integer NOT NULL,
    "finalHomesCount" integer NOT NULL,
    "descriptionPhotoScore" double precision,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ai_search_logs OWNER TO postgres;

--
-- Name: ai_search_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_search_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_search_logs_id_seq OWNER TO postgres;

--
-- Name: ai_search_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_search_logs_id_seq OWNED BY public.ai_search_logs.id;


--
-- Name: areas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.areas (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    "nameGreek" text,
    city text,
    "cityGreek" text,
    country text,
    "countryGreek" text,
    district text,
    safety double precision,
    vibe text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.areas OWNER TO postgres;

--
-- Name: areas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.areas_id_seq OWNER TO postgres;

--
-- Name: areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.areas_id_seq OWNED BY public.areas.id;


--
-- Name: availabilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.availabilities (
    id integer NOT NULL,
    key text NOT NULL,
    "homeId" integer NOT NULL,
    "inquiryId" integer,
    date timestamp(3) without time zone NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.availabilities OWNER TO postgres;

--
-- Name: availabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.availabilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.availabilities_id_seq OWNER TO postgres;

--
-- Name: availabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.availabilities_id_seq OWNED BY public.availabilities.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    key text NOT NULL,
    "userId" integer NOT NULL,
    "ownerId" integer NOT NULL,
    "inquiryId" integer,
    "availabilityId" integer,
    "calComBookingId" text,
    title text NOT NULL,
    description text,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    location text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO postgres;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: bulk_upload_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bulk_upload_jobs (
    id text NOT NULL,
    "userId" integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    "filePath" text DEFAULT ''::text NOT NULL,
    options jsonb DEFAULT '{}'::jsonb NOT NULL,
    results jsonb,
    errors jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bulk_upload_jobs OWNER TO postgres;

--
-- Name: homes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.homes (
    id integer NOT NULL,
    key text NOT NULL,
    title text NOT NULL,
    description text,
    "descriptionGreek" text,
    street text,
    city text NOT NULL,
    country text NOT NULL,
    area text,
    "listingType" text DEFAULT 'rent'::text NOT NULL,
    "pricePerMonth" integer NOT NULL,
    bedrooms integer NOT NULL,
    bathrooms integer NOT NULL,
    floor integer,
    "heatingCategory" text,
    "heatingAgent" text,
    "sizeSqMeters" integer,
    "yearBuilt" integer,
    "yearRenovated" integer,
    "availableFrom" timestamp(3) without time zone NOT NULL,
    photos text,
    finalized boolean DEFAULT false NOT NULL,
    "promotedUntil" timestamp(3) without time zone,
    "premiumPromotedUntil" timestamp(3) without time zone,
    "closestMetro" double precision,
    "closestBus" double precision,
    "closestSchool" double precision,
    "closestHospital" double precision,
    "closestPark" double precision,
    "closestUniversity" double precision,
    parking boolean,
    "energyClass" text,
    "ownerId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    embedding jsonb,
    "photoTags" text
);


ALTER TABLE public.homes OWNER TO postgres;

--
-- Name: homes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.homes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.homes_id_seq OWNER TO postgres;

--
-- Name: homes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.homes_id_seq OWNED BY public.homes.id;


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inquiries (
    id integer NOT NULL,
    key text NOT NULL,
    "userId" integer NOT NULL,
    "homeId" integer NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    dismissed boolean DEFAULT false NOT NULL,
    finalized boolean DEFAULT false NOT NULL,
    "finalizedBy" integer,
    "contactInfo" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.inquiries OWNER TO postgres;

--
-- Name: inquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inquiries_id_seq OWNER TO postgres;

--
-- Name: inquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inquiries_id_seq OWNED BY public.inquiries.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    key text NOT NULL,
    "recipientId" integer NOT NULL,
    role text NOT NULL,
    type text NOT NULL,
    "homeKey" text,
    "userId" integer,
    "ownerKey" text,
    "inquiryId" integer,
    deleted boolean DEFAULT false NOT NULL,
    viewed boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ratings (
    id integer NOT NULL,
    key text NOT NULL,
    "raterId" integer NOT NULL,
    "ratedUserId" integer NOT NULL,
    type text NOT NULL,
    score integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.ratings OWNER TO postgres;

--
-- Name: ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ratings_id_seq OWNER TO postgres;

--
-- Name: ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ratings_id_seq OWNED BY public.ratings.id;


--
-- Name: search_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.search_conversations (
    id integer NOT NULL,
    key text NOT NULL,
    "userId" integer,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    "accumulatedFilters" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "listingMode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    embedding jsonb
);


ALTER TABLE public.search_conversations OWNER TO postgres;

--
-- Name: search_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.search_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.search_conversations_id_seq OWNER TO postgres;

--
-- Name: search_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.search_conversations_id_seq OWNED BY public.search_conversations.id;


--
-- Name: universities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.universities (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.universities OWNER TO postgres;

--
-- Name: universities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.universities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.universities_id_seq OWNER TO postgres;

--
-- Name: universities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.universities_id_seq OWNED BY public.universities.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    key text NOT NULL,
    email text NOT NULL,
    name text,
    "dateOfBirth" timestamp(3) without time zone,
    "clerkUserId" text,
    title text,
    occupation text,
    role text DEFAULT 'user'::text NOT NULL,
    "calComUsername" text,
    "calComAccessToken" text,
    "calComRefreshToken" text,
    "calComTokenExpiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_search_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_search_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_search_logs_id_seq'::regclass);


--
-- Name: areas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas ALTER COLUMN id SET DEFAULT nextval('public.areas_id_seq'::regclass);


--
-- Name: availabilities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availabilities ALTER COLUMN id SET DEFAULT nextval('public.availabilities_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: homes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homes ALTER COLUMN id SET DEFAULT nextval('public.homes_id_seq'::regclass);


--
-- Name: inquiries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries ALTER COLUMN id SET DEFAULT nextval('public.inquiries_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: ratings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings ALTER COLUMN id SET DEFAULT nextval('public.ratings_id_seq'::regclass);


--
-- Name: search_conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_conversations ALTER COLUMN id SET DEFAULT nextval('public.search_conversations_id_seq'::regclass);


--
-- Name: universities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universities ALTER COLUMN id SET DEFAULT nextval('public.universities_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
455c01fe-3993-463d-926b-5cfeb8ddbd37	8c1f9cd2e97bbd09817592ab4faac07e168266d5dabc6bf987b61e834f9b5568	2026-05-23 18:51:44.270739+00	20260523185144_init	\N	\N	2026-05-23 18:51:44.227097+00	1
de81513c-5aad-4953-9e11-2cc9415f5585	04249ffa58b4e8e7ab6cf4f106c5c79f8a168035df0ef88e3978fb8e66760972	2026-05-23 19:52:20.533762+00	20260523195220_add_search_conversations	\N	\N	2026-05-23 19:52:20.52437+00	1
4c5ff9aa-f8c3-4117-89f2-f7e95aaf86a0	5c762b2d98981cd66de64485f31cfc4494e2123213a40add32faf166269c95df	2026-05-23 20:21:39.62688+00	20260523202139_add_embeddings	\N	\N	2026-05-23 20:21:39.624695+00	1
02c8ea62-1264-461e-97d9-d024c254db06	2bdd8c0f428550f2708b81c284a56d9050e402891f985449097d36301e1cdc51	2026-05-24 15:05:08.444021+00	20260524150508_add_photo_tags	\N	\N	2026-05-24 15:05:08.441679+00	1
44cea429-73d7-46df-a614-56e6b3afeb13	97a669adcd2a212fc67847bf19450460b6541196049afb6de0d750b27dc261f2	2026-05-27 13:35:25.370831+00	20260527133525_add_bulk_upload_job	\N	\N	2026-05-27 13:35:25.354414+00	1
\.


--
-- Data for Name: ai_search_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_search_logs (id, key, "userId", "userQuery", "filterExtractionPrompt", "filterExtractionResponse", "hardFilters", "softFilters", metro, bus, school, hospital, park, university, "homesCountBeforeFilter", "homesCountAfterFilter", "finalHomesCount", "descriptionPhotoScore", error, "createdAt") FROM stdin;
1	cmpishgu50000vpju6gsimc7k	1	i want a house\n	System: Extract filters from real estate search query. Return JSON only.\n\nStructure: {"filters": {"city": "Athens" or null, "country": "Greece" or null, "area": "Nea Smirni" or null, "districts": ["Central Athens", "Northern Suburbs"] or null, "listingtype": "Rent" or "Buy" or null, "minPrice": 400 or null, "maxPrice": 600 or null, "minBedrooms": 2 or null, "maxBedrooms": 3 or null, "minSize": 50 or null, "maxSize": 100 or null, "parking": true or false or null, "parkingSoftPreference": true or false or null, "heatingCategory": "central" or "autonomous" or null, "heatingAgent": "natural gas" or "oil" or "electricity" or null, "minFloor": 1 or null, "maxFloor": 5 or null, "minYearBuilt": 2000 or null, "maxYearBuilt": 2020 or null, "minYearRenovated": 2010 or null, "maxYearRenovated": 2023 or null, "minBathrooms": 1 or null, "maxBathrooms": 3 or null, "Metro": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Bus": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "School": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Hospital": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Park": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "University": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Safety": "Essential" or "Strong" or "Not important" or "Not mentioned", "preferredAreas": ["Filothei", "Psychiko"] or null, "vibePreference": "waterfront" or "urban" or "central" or "family-friendly" or "quiet" or "upscale" or "working-class" or "rural" or "suburban" or null, "hasLocationPreference": true or false}}\n\nRULES:\n- HARD FILTERS (filter DB): city, country, area, districts, listingType, price, bedrooms, bathrooms, size, parking (unless soft preference), floor, yearBuilt, yearRenovated\n- Price semantics: If the user query or appended context indicates RENT/rental, minPrice/maxPrice are monthly rent. If it indicates BUY/sale/purchase, minPrice/maxPrice are total purchase price. When ambiguous and context is provided, follow the context.\n- SOFT FILTERS (scoring only): distance categories, preferredAreas, heatingCategory, heatingAgent, parking (if soft preference)\n- CRITICAL: Only extract explicitly mentioned values. Do NOT infer. "heating" alone → heatingCategory: null, heatingAgent: null\n- Parking extraction: ONLY extract parking if user explicitly mentions "parking", "garage", "car", "vehicle", or similar parking-related terms. Do NOT infer parking from mentions of pets/dogs, family, or any other context. If user mentions "dog" or "pet" → parking: null (only Park distance category should be Essential). If parking is not explicitly mentioned → parking: null\n- Soft preference phrases: "not a deal breaker", "not that important", "nice to have", "would be good but not essential" → set parkingSoftPreference: true\n- Location: Convert Greek to English ("Αθήνα" → "Athens"). Hard filter area: "in X" → area: "X". Preferred areas: "like X, Y" → area: null, preferredAreas: ["X", "Y"]\n- Districts: If user mentions a district (e.g., "Central Athens", "Northern Suburbs", "Southern Suburbs"), extract as districts: ["District Name"]. If multiple districts mentioned, extract all: districts: ["District1", "District2"]. Districts are hard filters and work like areas. If user mentions a district but no city, still extract the district (it will be filtered by available districts in DB per city if city is provided, otherwise all districts will be searched). Match district names flexibly (handle misspellings, Greek/English variations, partial names).\n- MISSING CHARACTERS & TYPOS: Be flexible with misspellings and alternative spellings. Common examples:\n  * "athns", "athens", "αθνα", "αθήνα" → "Athens"\n  * "θεσ/νικη", "θεσσαλονικη", "θεσσαλονίκη", "saloniak", "thessaloniki", "thessalonica" → "Thessaloniki"\n  * "praking", "parking", "παρκινγκ" → parking: true\n  * "salonika", "saloniki", "salonika" → "Thessaloniki"\n  * "patra", "πατρα", "πατρας" → "Patras"\n  * "iraklio", "ηρακλειο", "heraklion" → "Heraklion"\n  * Partial city names or abbreviations should be interpreted (e.g., "ath" → "Athens", "thess" → "Thessaloniki")\n- Numbers: Price without qualifiers (e.g., "I want a house for 500") → maxPrice: 500 (treat as maximum)\n- Bedrooms/Bathrooms: Fixed number without qualifier (e.g., "2 bedrooms", "two rooms", "2 bathrooms") → minBedrooms: 2, maxBedrooms: null (exact number). "at most X bedrooms" → minBedrooms: null, maxBedrooms: X. "at least X bedrooms" → minBedrooms: X, maxBedrooms: null. "exactly X bedrooms" → minBedrooms: X, maxBedrooms: X. Same logic applies to bathrooms\n- Other numbers without qualifiers → assume "at least" (set min, max: null)\n- Distance categories: Essential/Strong/Not important/Avoid. Reflect user's stated importance. "not essential" → Strong (not Essential). Unmentioned → "Not mentioned"\n- Hospital category: Essential ONLY if explicitly asked for (e.g., "near hospital", "close to hospital"). Strong if user mentions they are or have people in need/elders/elderly/seniors/disabled/vulnerable/medical needs. Otherwise → "Not mentioned"\n- Public transport rules:\n  * "public transport" or "public transportation" or "move easily" or "easy to move" or "accessibility" → Metro: Essential, Bus: Essential (Metro has higher priority)\n  * "near bus station" or "close to bus" or "bus access" → Bus: Essential (higher priority)\n  * "near metro station" or "close to metro" or "metro access" → Metro: Essential (higher priority)\n- Park category: CRITICAL - If user mentions pet/dog/cat/animal/pets → Park: Essential (ALWAYS set to Essential when pets are mentioned). Also Essential if user explicitly wants park. Strong if mentions park would be nice but no pets mentioned. Unmentioned → "Not mentioned"\n- Safety category: Essential if user explicitly wants safe area OR mentions kids/children OR person in need OR elderly. Strong if mentions safety would be nice but not in explicit ways above. Not important if not mentioned. Unmentioned → "Not mentioned"\n- Vibe preference: Extract 1-2 words describing the vibe/atmosphere the user wants based on location preferences. Location-based mappings:\n  * "near the beach", "near beach", "by the sea", "waterfront", "coastal" → vibePreference: "waterfront"\n  * "near the center", "city center", "downtown", "central", "with a lot of people", "busy area", "crowded" → vibePreference: "urban" or "central"\n  * "for kids", "family", "with children", "family-friendly" → vibePreference: "family-friendly" (matches: family, suburban, urban)\n  * "quiet", "peaceful", "calm", "tranquil", "away from noise" → vibePreference: "quiet" (matches: rural, suburban)\n  * "upscale", "luxury", "premium", "high-end", "expensive", "financial stability", "pricey" → vibePreference: "upscale"\n  * "near mountain", "mountainous", "mountain area" → vibePreference: "rural" or "quiet"\n  * "young workers", "affordable", "budget-friendly", "student area" → vibePreference: "working-class"\n  * If user mentions location preferences (beach, center, mountain, etc.), set "hasLocationPreference": true\n  * If no vibe/location mentioned → vibePreference: null, hasLocationPreference: false\n\nUser Query: i want a house\n\n\n[Search page: properties FOR RENT. minPrice/maxPrice are monthly rent in EUR unless the user clearly states otherwise.]	{"filters": {"city": null, "country": "Greece", "area": null, "districts": null, "listingtype": "Rent", "minPrice": null, "maxPrice": null, "minBedrooms": null, "maxBedrooms": null, "minSize": null, "maxSize": null, "parking": null, "parkingSoftPreference": null, "heatingCategory": null, "heatingAgent": null, "minFloor": null, "maxFloor": null, "minYearBuilt": null, "maxYearBuilt": null, "minYearRenovated": null, "maxYearRenovated": null, "minBathrooms": null, "maxBathrooms": null, "Metro": "Not mentioned", "Bus": "Not mentioned", "School": "Not mentioned", "Hospital": "Not mentioned", "Park": "Not mentioned", "University": "Not mentioned", "Safety": "Not mentioned", "preferredAreas": null, "vibePreference": null, "hasLocationPreference": false}}	{"country":"Greece","listingtype":"Rent"}	{"Safety":"Not mentioned"}	Not mentioned	Not mentioned	Not mentioned	Not mentioned	Not mentioned	Not mentioned	17	17	17	\N	\N	2026-05-23 20:16:43.901
2	cmpisscje0002vpjuns6ipafc	1	[conversational]	\N	\N	{"city":"Athens","listingType":"apartment"}	\N	\N	\N	\N	\N	\N	\N	17	12	12	\N	\N	2026-05-23 20:25:11.547
3	cmpistw8n0004vpju10nspnye	1	[conversational]	\N	\N	{"city":"Athens","country":"Greece","listingType":"apartment","maxPrice":1000,"minBedrooms":1,"maxBedrooms":1}	\N	\N	\N	\N	\N	\N	\N	3	2	2	\N	\N	2026-05-23 20:26:23.735
4	cmpitjv6a0006vpjumt44fivd	1	[conversational]	\N	\N	{"city":"Athens","listingType":"rent","maxPrice":700}	{"preferredAreas":"city centre","Safety":"Strong"}	Essential	\N	Essential	\N	Strong	\N	8	5	5	0	\N	2026-05-23 20:46:35.41
5	cmpitkmzb0007vpju86fwib17	1	[conversational]	\N	\N	{"city":"Athens","listingType":"rent","maxPrice":700}	{"preferredAreas":"city centre","Safety":"Strong"}	Essential	\N	Essential	\N	Strong	\N	8	5	5	0	\N	2026-05-23 20:47:11.447
6	cmpitkz4x0008vpjupg8oz0mk	1	[conversational]	\N	\N	{"city":"Athens","listingType":"rent","maxPrice":700}	{"preferredAreas":"city centre","Safety":"Strong"}	Essential	\N	Essential	\N	Strong	\N	8	5	5	0	\N	2026-05-23 20:47:27.202
7	cmpitl5tk0009vpjup60ne2xi	1	[conversational]	\N	\N	{"city":"Athens","listingType":"rent","maxPrice":700}	{"preferredAreas":"city centre","Safety":"Strong"}	Essential	\N	Essential	\N	Strong	\N	8	5	5	0	\N	2026-05-23 20:47:35.865
8	cmpitlae6000avpjungvi0pmx	1	[conversational]	\N	\N	{"city":"Athens","listingType":"rent","maxPrice":700}	{"preferredAreas":"city centre","Safety":"Strong"}	Essential	\N	Essential	\N	Strong	\N	8	5	5	0	\N	2026-05-23 20:47:41.79
9	cmpitp36u0001140mydh02rv8	1	[conversational]	\N	\N	{"city":"Αθήνα"}	{"vibePreference":"family-friendly","Safety":"Strong"}	Essential	\N	\N	\N	Essential	\N	17	12	12	0	\N	2026-05-23 20:50:39.078
10	cmpjyu8400017h1t5zdxpu9ed	1	[conversational]	\N	\N	{"city":"Athens","listingType":"rent","maxPrice":1100,"minBedrooms":1}	{"preferredAreas":"near the sea","parkingSoftPreference":true}	\N	\N	\N	\N	\N	\N	3	3	3	0	\N	2026-05-24 16:02:22.993
11	cmpjz9n4p0019h1t5mtu1dbvn	1	[conversational]	\N	\N	{"city":"Athens","listingType":"rent","minBedrooms":1}	{"vibePreference":"family-friendly"}	Essential	\N	\N	\N	Essential	\N	3	3	3	0	\N	2026-05-24 16:14:22.298
\.


--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.areas (id, key, name, "nameGreek", city, "cityGreek", country, "countryGreek", district, safety, vibe, "createdAt", "updatedAt") FROM stdin;
1	cmpiqyjaw0000q9efjvf9d3cz	Agia Paraskevi	Αγία Παρασκευή	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.016	2026-05-23 19:34:01.016
2	cmpiqyjb30001q9ef0n4vearx	Agia Varvara	Αγία Βαρβάρα	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.023	2026-05-23 19:34:01.023
3	cmpiqyjb40002q9efaqr1btp7	Agioi Anargyroi-Kamatero	Άγιοι Ανάργυροι-Καματερό	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.024	2026-05-23 19:34:01.024
4	cmpiqyjb50003q9ef3nmxtkfy	Agios Dimitrios	Άγιος Δημήτριος	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.025	2026-05-23 19:34:01.025
5	cmpiqyjb60004q9ef6t5e2pk1	Aigaleo	Αιγάλεω	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.026	2026-05-23 19:34:01.026
6	cmpiqyjb70005q9ef0wb3vfbt	Alimos	Άλιμος	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.027	2026-05-23 19:34:01.027
7	cmpiqyjb80006q9efkfa42ii2	Amarousio	Αμαρούσιο	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.028	2026-05-23 19:34:01.028
8	cmpiqyjb80007q9efp6k14ptp	Athens	Αθήνα	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.029	2026-05-23 19:34:01.029
9	cmpiqyjb90008q9efie27zwxv	Chaidari	Χαϊδάρι	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.03	2026-05-23 19:34:01.03
10	cmpiqyjba0009q9efxx24z3fe	Chalandri	Χαλάνδρι	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.03	2026-05-23 19:34:01.03
11	cmpiqyjba000aq9efz2yntmkv	Dafni-Ymittos	Δάφνη-Υμηττός	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.031	2026-05-23 19:34:01.031
12	cmpiqyjbb000bq9efpl8bftz8	Elliniko-Argyroupoli	Ελληνικό-Αργυρούπολη	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.032	2026-05-23 19:34:01.032
13	cmpiqyjbc000cq9efa5clbkk2	Filadelfeia-Chalkidona	Φιλαδέλφεια-Χαλκηδόνα	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.033	2026-05-23 19:34:01.033
14	cmpiqyjbd000dq9efawg0q1ul	Filothei-Psychiko	Φιλοθέη-Ψυχικό	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.033	2026-05-23 19:34:01.033
15	cmpiqyjbd000eq9efvb69257s	Galatsi	Γαλάτσι	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.034	2026-05-23 19:34:01.034
16	cmpiqyjbe000fq9efq5amt2vc	Glyfada	Γλυφάδα	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.035	2026-05-23 19:34:01.035
17	cmpiqyjbf000gq9ef6fe5wxkp	Ilion	Ίλιον	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.035	2026-05-23 19:34:01.035
18	cmpiqyjbf000hq9effvdfg53v	Ilioupoli	Ηλιούπολη	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.036	2026-05-23 19:34:01.036
19	cmpiqyjbg000iq9efly5rokw8	Irakleio	Ηράκλειο	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.037	2026-05-23 19:34:01.037
20	cmpiqyjbh000jq9efemwomx1t	Kaisariani	Καισαριανή	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.037	2026-05-23 19:34:01.037
21	cmpiqyjbh000kq9efn5gmaewk	Kallithea	Καλλιθέα	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.038	2026-05-23 19:34:01.038
22	cmpiqyjbi000lq9efqzxkzesg	Keratsini-Drapetsona	Κερατσίνι-Δραπετσώνα	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.038	2026-05-23 19:34:01.038
23	cmpiqyjbi000mq9efnkak8jqn	Kifisia	Κηφισιά	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.039	2026-05-23 19:34:01.039
24	cmpiqyjbj000nq9efi2hc9rm4	Korydallos	Κορυδαλλός	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.039	2026-05-23 19:34:01.039
25	cmpiqyjbk000oq9efqov9hkl0	Lykovrysi-Pefki	Λυκόβρυση-Πεύκη	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.04	2026-05-23 19:34:01.04
26	cmpiqyjbk000pq9ef7ymql7uq	Metamorfosi	Μεταμόρφωση	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.041	2026-05-23 19:34:01.041
27	cmpiqyjbl000qq9ef6g9jehrp	Moschato-Tavros	Μοσχάτο-Ταύρος	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.041	2026-05-23 19:34:01.041
28	cmpiqyjbl000rq9efn745mktt	Nea Ionia	Νέα Ιωνία	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.042	2026-05-23 19:34:01.042
29	cmpiqyjbm000sq9ef52yq27o5	Nea Smyrni	Νέα Σμύρνη	Athens	Αθήνα	Greece	Ελλάδα	\N	8.5	family-friendly	2026-05-23 19:34:01.042	2026-05-23 19:34:01.042
30	cmpiqyjbn000tq9efmqo4ayjb	Nikaia-Agios Ioannis Rentis	Νίκαια-Άγιος Ιωάννης Ρέντης	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.043	2026-05-23 19:34:01.043
31	cmpiqyjbo000uq9efrtj6gmjz	Palaio Faliro	Παλαιό Φάληρο	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.044	2026-05-23 19:34:01.044
32	cmpiqyjbo000vq9efmo6k3i34	Papagou-Cholargos	Παπάγου-Χολαργός	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.045	2026-05-23 19:34:01.045
33	cmpiqyjbp000wq9efqag6kekz	Piraeus	Πειραιάς	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.045	2026-05-23 19:34:01.045
34	cmpiqyjbp000xq9ef4xm2mgz2	Peristeri	Περιστέρι	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.046	2026-05-23 19:34:01.046
35	cmpiqyjbq000yq9efwhybd75d	Petroupoli	Πετρούπολη	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.046	2026-05-23 19:34:01.046
36	cmpiqyjbq000zq9ef7fmscefe	Vrilissia	Βριλήσσια	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.047	2026-05-23 19:34:01.047
37	cmpiqyjbr0010q9ef7n0wogqv	Vyronas	Βύρωνας	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.048	2026-05-23 19:34:01.048
38	cmpiqyjbs0011q9efymfhecv4	Zografou	Ζωγράφου	Athens	Αθήνα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.048	2026-05-23 19:34:01.048
39	cmpiqyjbs0012q9efk0we1dim	Ampelokipoi-Menemeni	Αμπελόκιποι-Μενεμένη	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.049	2026-05-23 19:34:01.049
40	cmpiqyjbt0013q9ef17nmfyzw	Chalkidona	Χαλκηδόνα	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.049	2026-05-23 19:34:01.049
41	cmpiqyjbt0014q9eflousim5a	Delta	Δέλτα	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.05	2026-05-23 19:34:01.05
42	cmpiqyjbu0015q9efnu5myvg0	Kalamaria	Καλαμαριά	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.05	2026-05-23 19:34:01.05
43	cmpiqyjbu0016q9efvu7hqgp5	Kordelio-Evosmos	Κορδελιό-Εύοσμος	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.051	2026-05-23 19:34:01.051
44	cmpiqyjbv0017q9ef8cau7gwk	Lagkadas	Λαγκαδάς	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.052	2026-05-23 19:34:01.052
45	cmpiqyjbw0018q9ef35qx69ge	Neapoli-Sykies	Νεάπολη-Συκιές	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.052	2026-05-23 19:34:01.052
46	cmpiqyjbw0019q9eflvlkaur8	Oraiokastro	Ωραιόκαστρο	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.053	2026-05-23 19:34:01.053
47	cmpiqyjbx001aq9ef5uq6zp5f	Pavlos Melas	Παύλος Μελάς	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.053	2026-05-23 19:34:01.053
48	cmpiqyjbx001bq9efg42vj76w	Pylaia-Chortiatis	Πυλαία-Χορτιάτης	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.054	2026-05-23 19:34:01.054
49	cmpiqyjby001cq9eflk28234c	Thermaikos	Θερμαϊκός	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.054	2026-05-23 19:34:01.054
50	cmpiqyjbz001dq9efft67ako9	Thermi	Θέρμη	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.055	2026-05-23 19:34:01.055
51	cmpiqyjc0001eq9ef3khcz8tg	Thessaloniki	Θεσσαλονίκη	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.056	2026-05-23 19:34:01.056
52	cmpiqyjc0001fq9efpc18pnua	Volvi	Βόλβη	Thessaloniki	Θεσσαλονίκη	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.057	2026-05-23 19:34:01.057
53	cmpiqyjc1001gq9efqqdql1i5	Volos	Βόλος	Volos	Βόλος	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.057	2026-05-23 19:34:01.057
54	cmpiqyjc2001hq9ef662xf2n6	Nea Ionia	Νέα Ιωνία	Volos	Βόλος	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.058	2026-05-23 19:34:01.058
55	cmpiqyjc2001iq9efdj11nqiy	Iolkos	Ιωλκός	Volos	Βόλος	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.059	2026-05-23 19:34:01.059
56	cmpiqyjc3001jq9efgd3eu4jo	Artemida	Αρτεμίδα	Volos	Βόλος	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.059	2026-05-23 19:34:01.059
57	cmpiqyjc3001kq9efj5vztmoa	Aisonia	Αισωνία	Volos	Βόλος	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.06	2026-05-23 19:34:01.06
58	cmpiqyjc4001lq9efwum8w3ee	Makrinitsa	Μακρινίτσα	Volos	Βόλος	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.06	2026-05-23 19:34:01.06
59	cmpiqyjc4001mq9efgbiu83g7	Agria	Άγρια	Volos	Βόλος	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.061	2026-05-23 19:34:01.061
60	cmpiqyjc5001nq9efxok7vqsr	Ioannina	Ιωάννινα	Ioannina	Ιωάννινα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.061	2026-05-23 19:34:01.061
61	cmpiqyjc5001oq9ef55bh1slp	Dodoni	Δωδώνη	Ioannina	Ιωάννινα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.062	2026-05-23 19:34:01.062
62	cmpiqyjc6001pq9efdab4ws7l	Konitsa	Κόνιτσα	Ioannina	Ιωάννινα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.062	2026-05-23 19:34:01.062
63	cmpiqyjc6001qq9efw6g15bf5	Metsovo	Μέτσοβο	Ioannina	Ιωάννινα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.063	2026-05-23 19:34:01.063
64	cmpiqyjc7001rq9ef3unnk0nb	Zagori	Ζαγόρι	Ioannina	Ιωάννινα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.063	2026-05-23 19:34:01.063
65	cmpiqyjc7001sq9efmqgafefd	Zitsa	Ζίτσα	Ioannina	Ιωάννινα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.064	2026-05-23 19:34:01.064
66	cmpiqyjc8001tq9ef85cm2gsl	Serres	Σέρρες	Serres	Σέρρες	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.064	2026-05-23 19:34:01.064
67	cmpiqyjc9001uq9ef9ji6gxhy	Ano Vrontou	Άνω Βροντού	Serres	Σέρρες	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.065	2026-05-23 19:34:01.065
68	cmpiqyjc9001vq9efqrg4spa3	Kapetan Mitrousi	Καπετάν Μητρούσι	Serres	Σέρρες	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.066	2026-05-23 19:34:01.066
69	cmpiqyjca001wq9ef2jvd5ng0	Lefkonas	Λευκώνας	Serres	Σέρρες	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.066	2026-05-23 19:34:01.066
70	cmpiqyjca001xq9ef07j4lu3e	Komotini	Κομοτηνή	Komotini	Κομοτηνή	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.067	2026-05-23 19:34:01.067
71	cmpiqyjcb001yq9efw4h1g3fz	Iasmos	Ίασμος	Komotini	Κομοτηνή	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.067	2026-05-23 19:34:01.067
72	cmpiqyjcb001zq9efn279qrld	Chania	Χανιά	Chania	Χανιά	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.068	2026-05-23 19:34:01.068
73	cmpiqyjcc0020q9efgmypy98e	Apokoronas	Αποκόρωνας	Chania	Χανιά	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.068	2026-05-23 19:34:01.068
74	cmpiqyjcd0021q9ef8gsr4b6r	Kissamos	Κίσσαμος	Chania	Χανιά	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.069	2026-05-23 19:34:01.069
75	cmpiqyjcd0022q9efhh3s9e3r	Platanias	Πλατανιάς	Chania	Χανιά	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.07	2026-05-23 19:34:01.07
76	cmpiqyjce0023q9efr7wl10xs	Sfakia	Σφακιά	Chania	Χανιά	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.07	2026-05-23 19:34:01.07
77	cmpiqyjce0024q9efo63d6bg8	Heraklion	Ηράκλειο	Iraklio	Ηράκλειο	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.071	2026-05-23 19:34:01.071
78	cmpiqyjcf0025q9efu7k5n8gb	Hersonissos	Χερσόνησος	Iraklio	Ηράκλειο	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.071	2026-05-23 19:34:01.071
79	cmpiqyjcf0026q9ef3cw71dh9	Minoa Pediada	Μινώα Πεδιάδα	Iraklio	Ηράκλειο	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.072	2026-05-23 19:34:01.072
80	cmpiqyjcg0027q9ef0d7k936s	Patras	Πάτρα	Patra	Πάτρα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.072	2026-05-23 19:34:01.072
81	cmpiqyjcg0028q9eflnu019en	Messatida	Μεσσάτιδα	Patra	Πάτρα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.073	2026-05-23 19:34:01.073
82	cmpiqyjch0029q9ef80orgz40	Paralia	Παραλία	Patra	Πάτρα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.073	2026-05-23 19:34:01.073
83	cmpiqyjch002aq9efrl6lr9bi	Rio	Ρίο	Patra	Πάτρα	Greece	Ελλάδα	\N	\N	\N	2026-05-23 19:34:01.074	2026-05-23 19:34:01.074
84	cmpjx0ewr000az5l2q4jfqbvs	Neos Kosmos	\N	Athens	\N	Greece	\N	\N	\N	\N	2026-05-24 15:11:12.508	2026-05-24 15:11:12.508
\.


--
-- Data for Name: availabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.availabilities (id, key, "homeId", "inquiryId", date, "startTime", "endTime", "isAvailable", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, key, "userId", "ownerId", "inquiryId", "availabilityId", "calComBookingId", title, description, "startTime", "endTime", location, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: bulk_upload_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bulk_upload_jobs (id, "userId", status, progress, total, "filePath", options, results, errors, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: homes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.homes (id, key, title, description, "descriptionGreek", street, city, country, area, "listingType", "pricePerMonth", bedrooms, bathrooms, floor, "heatingCategory", "heatingAgent", "sizeSqMeters", "yearBuilt", "yearRenovated", "availableFrom", photos, finalized, "promotedUntil", "premiumPromotedUntil", "closestMetro", "closestBus", "closestSchool", "closestHospital", "closestPark", "closestUniversity", parking, "energyClass", "ownerId", "createdAt", "updatedAt", embedding, "photoTags") FROM stdin;
48	cmpjyr22o0011h1t5es4sbw5n	House 1	This charming one-bedroom apartment in the vibrant Neos Kosmos area of Athens offers a delightful living space bathed in natural light. The third-floor unit features a modern, renovated bathroom and a cozy balcony that invites you to enjoy the views. With a generous 75 square meters, this property combines comfort and style, making it an ideal choice for those seeking a home in the heart of the city. Built in 2010 and recently renovated in 2020, the apartment boasts central heating powered by natural gas, ensuring a cozy atmosphere year-round.\n\nConveniently located, this apartment is close to various amenities, including public transportation options, schools, and local parks for leisurely walks. The area provides a lively urban vibe, with a mix of cafes, shops, and cultural attractions just a stone's throw away. Available from February 1, 2024, this home could be your perfect sanctuary in Athens. Please note that no pets are allowed, ensuring a serene living environment for all residents.	Αυτό το γοητευτικό διαμέρισμα ενός υπνοδωματίου στην ζωντανή περιοχή του Νέου Κόσμου στην Αθήνα προσφέρει έναν ευχάριστο χώρο διαβίωσης γεμάτο φυσικό φως. Η μονάδα στον 3ο όροφο διαθέτει ένα σύγχρονο, ανακαινισμένο μπάνιο και μια άνετη μπαλκονόπορτα που σας προσκαλεί να απολαύσετε τη θέα. Με 75 τετραγωνικά μέτρα, αυτή η ιδιοκτησία συνδυάζει άνεση και στυλ, καθιστώντας την ιδανική επιλογή για όσους αναζητούν ένα σπίτι στην καρδιά της πόλης. Κατασκευασμένο το 2010 και ανακαινισμένο το 2020, το διαμέρισμα διαθέτει κεντρική θέρμανση με φυσικό αέριο, διασφαλίζοντας μια ζεστή ατμόσφαιρα καθ' όλη τη διάρκεια του χρόνου.\n\nΚοντά σε διάφορες ανέσεις, όπως μέσα μαζικής μεταφοράς, σχολεία και τοπικά πάρκα για ήσυχες βόλτες, το διαμέρισμα προσφέρει μια ζωντανή αστική ατμόσφαιρα, με μια ποικιλία καφετεριών, καταστημάτων και πολιτιστικών αξιοθέατων σε κοντινές αποστάσεις. Διαθέσιμο από 1 Φεβρουαρίου 2024, αυτό το σπίτι θα μπορούσε να είναι το ιδανικό σας καταφύγιο στην Αθήνα. Σημειώστε ότι δεν επιτρέπονται κατοικίδια, εξασφαλίζοντας ένα ήσυχο περιβάλλον διαβίωσης για όλους τους κατοίκους.	Pantazi 10	Athens	Greece	Neos Kosmos	rent	800	1	1	3	central	natural gas	75	2010	2020	2024-02-01 00:00:00	["/uploads/1779638384759-25ejjd-___________________2026-05-24__5.57.27___.png","/uploads/1779638384761-zg9i06-___________________2026-05-24__5.57.19___.png","/uploads/1779638384761-hvo55-___________________2026-05-24__5.56.54___.png","/uploads/1779638384762-ljp17s-___________________2026-05-24__5.56.49___.png","/uploads/1779638384763-rc91a6-___________________2026-05-24__5.56.39___.png","/uploads/1779638384763-aecood-___________________2026-05-24__5.56.25___.png"]	f	\N	\N	\N	\N	\N	\N	\N	\N	f	B	12	2026-05-24 15:59:55.201	2026-05-24 15:59:55.201	\N	["balcony","renovated bathroom","bright","natural light"]
49	cmpjyr9il0013h1t599vzed2v	House 2	In the vibrant neighborhood of Aigaleo, this charming first-floor apartment offers a modern living experience perfect for families. Built in 2020, the residence features three spacious bedrooms and two well-appointed bathrooms, providing ample space for comfort and convenience. Enjoy the benefits of autonomous heating, ensuring a cozy atmosphere throughout the year, and take advantage of the available parking for added convenience. The energy-efficient design is a notable highlight, making it not only a stylish choice but also an economical one.\n\nFamilies will appreciate the nearby amenities, including schools and parks ideal for leisurely walks. The area boasts a lively atmosphere, with various shops, cafes, and public transport options close by, enhancing your daily lifestyle. This property will be available from February 1, 2024, allowing you to plan your move seamlessly into your new home. Experience the perfect blend of modern living and family-friendly surroundings in this delightful Aigaleo apartment.\n\nAmazing for families.	Στην ζωντανή γειτονιά του Αιγάλεω, αυτό το γοητευτικό διαμέρισμα στον πρώτο όροφο προσφέρει μια σύγχρονη εμπειρία διαβίωσης που είναι ιδανική για οικογένειες. Χτισμένο το 2020, το διαμέρισμα διαθέτει τρία ευρύχωρα υπνοδωμάτια και δύο καλά εξοπλισμένα μπάνια, προσφέροντας άνεση και ευκολία. Απολαύστε τα οφέλη της αυτόνομης θέρμανσης, εξασφαλίζοντας μια ζεστή ατμόσφαιρα καθ' όλη τη διάρκεια του χρόνου, και επωφεληθείτε από τη διαθέσιμη στάθμευση για επιπλέον ευκολία. Ο ενεργειακά αποδοτικός σχεδιασμός είναι ένα αξιόλογο χαρακτηριστικό, καθιστώντας το όχι μόνο μια κομψή επιλογή, αλλά και οικονομική.\n\nΟι οικογένειες θα εκτιμήσουν τις κοντινές ανέσεις, συμπεριλαμβανομένων σχολείων και πάρκων κατάλληλων για βόλτες. Η περιοχή διαθέτει μια ζωντανή ατμόσφαιρα, με διάφορα καταστήματα, καφέ και επιλογές δημόσιων συγκοινωνιών κοντά, ενισχύοντας τον καθημερινό σας τρόπο ζωής. Αυτό το ακίνητο θα είναι διαθέσιμο από τις 1 Φεβρουαρίου 2024, επιτρέποντάς σας να προγραμματίσετε την μετακόμισή σας ομαλά στο νέο σας σπίτι. Ζήστε την τέλεια ισορροπία σύγχρονης διαβίωσης και φιλικών προς την οικογένεια περιβαλλόντων σε αυτό το υπέροχο διαμέρισμα του Αιγάλεω.\n\nAmazing for families.	Ioanninon 35	Athens	Greece	Aigaleo	rent	1000	3	2	1	autonomous	oil	100	2020	\N	2024-02-01 00:00:00	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	t	A	12	2026-05-24 16:00:04.844	2026-05-24 16:00:04.844	\N	\N
50	cmpjyrkjp0015h1t5ndmas9bb	House 1	Experience the charm of this inviting ground floor duplex in the heart of Nea Smyrni. Bathed in natural light, this spacious one-bedroom home boasts high ceilings and beautiful hardwood floors, creating an atmosphere of warmth and comfort. The open plan design enhances the flow of the living spaces, making it an ideal setting for both relaxation and entertaining. Recently renovated in 2025, it features modern amenities that cater to today's lifestyle needs, including central heating for those cozy nights in.\n\nConveniently located, this property is within close proximity to various amenities. The nearby metro and bus stations provide excellent transport links, while schools and parks are just a short stroll away, enriching the family-friendly vibe of the area. This residence is available for rent starting February 1, 2024, and includes essential white goods for your convenience.\n\nPlease note that this property is offered with white appliances only.	Ανακαλύψτε τη γοητεία αυτού του φιλόξενου ισογείου ντουplex στο κέντρο της Νέας Σμύρνης. Λουσμένο με φυσικό φως, αυτό το ευρύχωρο διαμέρισμα ενός υπνοδωματίου διαθέτει ψηλά ταβάνια και όμορφα ξύλινα δάπεδα, δημιουργώντας μια ατμόσφαιρα ζεστασιάς και άνεσης. Ο ανοιχτός σχεδιασμός ενισχύει τη ροή των χώρων διαβίωσης, καθιστώντας το ιδανικό για χαλάρωση και ψυχαγωγία. Πρόσφατα ανακαινισμένο το 2025, διαθέτει σύγχρονες ανέσεις που καλύπτουν τις ανάγκες του σύγχρονου τρόπου ζωής, συμπεριλαμβανομένης της κεντρικής θέρμανσης για τις δροσερές νύχτες.\n\nΤο ακίνητο βρίσκεται κοντά σε διάφορες ανέσεις. Οι κοντινοί σταθμοί μετρό και λεωφορείων προσφέρουν εξαιρετική πρόσβαση στις συγκοινωνίες, ενώ τα σχολεία και τα πάρκα είναι μόλις λίγα βήματα μακριά, εμπλουτίζοντας την οικογενειακή ατμόσφαιρα της περιοχής. Αυτή η κατοικία είναι διαθέσιμη προς ενοικίαση από τις 1 Φεβρουαρίου 2024 και περιλαμβάνει βασικές λευκές συσκευές για την ευκολία σας.\n\nΠαρακαλούμε σημειώστε ότι το ακίνητο προσφέρεται μόνο με λευκές συσκευές.	Καραθεοδωρή 19	Athens	Greece	Nea Smyrni	rent	500	1	1	0	central	πετρελεο	80	2015	2025	2024-02-01 00:00:00	["/uploads/1779638405637-f6q7tj-___________________2026-05-24__5.56.03___.png","/uploads/1779638405640-pbqw54-___________________2026-05-24__5.56.18___.png","/uploads/1779638405642-ul8aue-___________________2026-05-24__5.56.11___.png"]	f	\N	\N	1	1	0.8	0.8	0.3	\N	f	Γ	12	2026-05-24 16:00:19.141	2026-05-24 16:00:19.141	\N	["bright","natural light","high ceilings","open plan","duplex","hardwood floors"]
\.


--
-- Data for Name: inquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inquiries (id, key, "userId", "homeId", approved, dismissed, finalized, "finalizedBy", "contactInfo", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, key, "recipientId", role, type, "homeKey", "userId", "ownerKey", "inquiryId", deleted, viewed, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ratings (id, key, "raterId", "ratedUserId", type, score, comment, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: search_conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.search_conversations (id, key, "userId", messages, "accumulatedFilters", "listingMode", "createdAt", "updatedAt", embedding) FROM stdin;
6	cmpjz8j1c0018h1t5rxhus1qj	1	[{"role": "user", "content": "i want a house in athens"}, {"role": "assistant", "content": "That's a great choice! To get started — which neighborhood in Athens are you thinking of, is it for rent or purchase, and what's your rough budget? Also let me know how many bedrooms/bathrooms you need and whether parking or a specific floor matters."}, {"role": "user", "content": "nothing specific...near the sea would be nice but its not a hard filter...it is for rent and i dont have a budget...at least 1 bedroom"}, {"role": "assistant", "content": "Thanks for the details! Now help me understand your lifestyle — do you have pets or kids? How important is public transport or green spaces nearby? Do you prefer a quiet street or a buzzing neighborhood?"}, {"role": "user", "content": "i have a dog and metro station nearby would be nice"}, {"role": "assistant", "content": "Great! I'll look for rental options in Athens that are pet-friendly and close to a metro station. Let's see what we can find!"}]	{"Park": "Essential", "city": "Athens", "Metro": "Essential", "listingType": "rent", "minBedrooms": 1, "vibePreference": "family-friendly"}	rent	2026-05-24 16:13:30.337	2026-05-24 16:14:22.124	\N
1	cmpisruzk0001vpju0elyny7z	1	[{"role": "user", "content": "i want a home"}, {"role": "assistant", "content": "I can help with that! Could you please specify the city or area you're interested in?"}, {"role": "user", "content": "athens"}, {"role": "assistant", "content": "Great! Now, could you let me know what type of home you're looking for? For example, an apartment or a house?"}, {"role": "user", "content": "apartment"}, {"role": "assistant", "content": "Got it! What is your budget range for the monthly rent?"}]	{"Bus": null, "Park": null, "area": null, "city": "Athens", "Metro": null, "Safety": null, "School": null, "country": null, "maxSize": null, "minSize": null, "parking": null, "Hospital": null, "maxFloor": null, "maxPrice": null, "minFloor": null, "minPrice": null, "University": null, "confidence": null, "listingType": "apartment", "maxBedrooms": null, "minBedrooms": null, "heatingAgent": null, "maxBathrooms": null, "maxYearBuilt": null, "minBathrooms": null, "minYearBuilt": null, "preferredAreas": null, "vibePreference": null, "heatingCategory": null, "maxYearRenovated": null, "minYearRenovated": null, "parkingSoftPreference": null}	rent	2026-05-23 20:24:48.801	2026-05-23 20:25:11.377	\N
2	cmpisteyo0003vpjuoemec98b	1	[{"role": "user", "content": "hey im christos and i want a home in athens for me and my dog"}, {"role": "assistant", "content": "Hi Christos! I'd love to help you find a home in Athens. Could you let me know what type of property you're looking for, like an apartment or a house, and your budget range?"}, {"role": "user", "content": "apartment and i want 1000 euros per month tops"}, {"role": "assistant", "content": "Great! I have your budget and property type. How many bedrooms do you need for you and your dog?"}, {"role": "user", "content": "1"}, {"role": "assistant", "content": "I've got your search set up for a 1-bedroom apartment in Athens with a budget of 1000 euros per month. Let me find some options for you!"}]	{"city": "Athens", "country": "Greece", "maxPrice": 1000, "listingType": "apartment", "maxBedrooms": 1, "minBedrooms": 1}	rent	2026-05-23 20:26:01.345	2026-05-23 20:26:23.568	\N
3	cmpitiym30005vpjud2scobyu	1	[{"role": "user", "content": "hi im christos"}, {"role": "assistant", "content": "Hi Christos! I'm here to help you find the perfect property. To get started — which city or neighborhood are you thinking, is it for rent or purchase, and what's your rough budget? Also let me know how many bedrooms/bathrooms you need and whether parking or a specific floor matters."}, {"role": "user", "content": "i want a home in athens preferrably close to city centre or metro, and i am at most 700 euros rent"}, {"role": "assistant", "content": "Great choice! Now help me understand your lifestyle — do you have pets or kids? How important is public transport or green spaces nearby? Do you prefer a quiet street or a buzzing neighborhood?"}, {"role": "user", "content": "1 each"}, {"role": "assistant", "content": "Thanks for sharing! I'll look for homes in Athens that are pet-friendly, have a school nearby, and are close to public transport. Let's see what we can find!"}, {"role": "user", "content": "why pet friendly????"}, {"role": "assistant", "content": "I apologize for the misunderstanding! Let's find homes in Athens that meet your needs."}, {"role": "user", "content": "nope dont like them"}, {"role": "assistant", "content": "Thanks for your patience! I'll search for homes in Athens that are close to the city center and metro, with a focus on safety and nearby schools."}, {"role": "user", "content": "asdfsadf"}, {"role": "assistant", "content": "I'm searching for rental homes in Athens that meet your criteria. Let's find the best options for you!"}, {"role": "user", "content": "asdfafdas"}, {"role": "assistant", "content": "I'm searching for rental homes in Athens that are close to the city center and metro, with a focus on safety and nearby schools. Let's find the best options for you!"}]	{"Park": "Strong", "city": "Athens", "Metro": "Essential", "Safety": "Strong", "School": "Essential", "maxPrice": 700, "listingType": "rent", "preferredAreas": "city centre"}	rent	2026-05-23 20:45:53.211	2026-05-23 20:47:41.637	\N
4	cmpito7xk0000140m7rpcnyl7	1	[{"role": "user", "content": "θελω ενα σπιτι στην αθηνα"}, {"role": "assistant", "content": "Φυσικά! Για να ξεκινήσουμε, ποια περιοχή στην Αθήνα σκέφτεστε; Είναι για ενοικίαση ή αγορά, και ποιο είναι το περίπου σας προϋπολογισμός; Πόσα υπνοδωμάτια και μπάνια χρειάζεστε; Υπάρχει κάποια προτίμηση για το πάτωμα ή το πάρκινγκ;"}, {"role": "user", "content": "δεν εχω θεμα....οτι θελεις απο αυτα"}, {"role": "assistant", "content": "Κατανοώ! Ας προχωρήσουμε στο επόμενο βήμα. Πες μου για τον τρόπο ζωής σου — έχεις κατοικίδια ή παιδιά; Πόσο σημαντική είναι η δημόσια συγκοινωνία ή οι πράσινοι χώροι κοντά; Προτιμάς μια ήσυχη γειτονιά ή μια πιο ζωντανή; "}, {"role": "user", "content": "θελω μετρο σιγουρα...και εχω σκυλο"}, {"role": "assistant", "content": "Ωραία! Έχεις σίγουρα ανάγκη από δημόσια συγκοινωνία και πάρκα για τον σκύλο σου. Ας προχωρήσουμε στην τελευταία ερώτηση: Είσαι περισσότερο εξωστρεφής ή προτιμάς να μένεις σπίτι; Σου αρέσουν οι πάρκα ή η παραλία για βόλτες; Και προτιμάς μια trendy περιοχή ή μια πιο αυθεντική και τοπική ατμόσφαιρα;"}]	{"Bus": null, "Park": "Essential", "city": "Αθήνα", "Metro": "Essential", "Safety": "Strong", "School": null, "maxSize": null, "minSize": null, "parking": null, "Hospital": null, "maxFloor": null, "maxPrice": null, "minFloor": null, "minPrice": null, "University": null, "confidence": null, "listingType": null, "maxBedrooms": null, "minBedrooms": null, "heatingAgent": null, "maxBathrooms": null, "maxYearBuilt": null, "minBathrooms": null, "minYearBuilt": null, "preferredAreas": null, "vibePreference": "family-friendly", "heatingCategory": null, "maxYearRenovated": null, "minYearRenovated": null, "hasLocationPreference": null, "parkingSoftPreference": null}	rent	2026-05-23 20:49:58.568	2026-05-23 20:50:38.811	\N
5	cmpjysbls0016h1t5dr06td86	1	[{"role": "user", "content": "hi i want a house in athens"}, {"role": "assistant", "content": "Great choice! To get started — which area in Athens are you thinking of, is it for rent or purchase, and what's your rough budget? Also let me know how many bedrooms/bathrooms you need and whether parking or a specific floor matters."}, {"role": "user", "content": "its not that big of an issue anywhere...i would prefer something near the sea i guess"}, {"role": "assistant", "content": "Thanks for sharing! Now, could you let me know if you're looking to rent or buy, and what's your budget? Also, how many bedrooms and bathrooms do you need, and does parking or a specific floor matter to you?"}, {"role": "user", "content": "rent, less than 1100 and at least 1 bedroom, parking is not an issue but it would matter more if it had...as for a floor i dont have something specific in mind"}, {"role": "assistant", "content": "Thanks for the details! Now, let's understand your lifestyle a bit more — do you have pets or kids? How important is public transport or green spaces nearby? Do you prefer a quiet street or a buzzing neighborhood?"}]	{"city": "Athens", "maxPrice": 1100, "listingType": "rent", "minBedrooms": 1, "preferredAreas": "near the sea", "parkingSoftPreference": true}	rent	2026-05-24 16:00:54.208	2026-05-24 16:02:22.719	\N
\.


--
-- Data for Name: universities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.universities (id, key, name, city, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, key, email, name, "dateOfBirth", "clerkUserId", title, occupation, role, "calComUsername", "calComAccessToken", "calComRefreshToken", "calComTokenExpiresAt", "createdAt", "updatedAt") FROM stdin;
1	cmpipnd8i0000rk8nefojdiol	christos_kyriazo@hotmail.com	chrisowner	1994-12-03 00:00:00	user_382SGMrVkJ9u9NoVmC19KdfRkjq	\N	Employed	user	\N	\N	\N	\N	2026-05-23 18:57:20.322	2026-05-23 19:24:37.221
12	cmpjvzn3s0000z5l27k17i33w	ckyriazo2@yopmail.com	karabobos	\N	user_38NygUr5bp1xHfuwphxRoLzQWjl	\N	\N	owner	\N	\N	\N	\N	2026-05-24 14:42:36.857	2026-05-24 14:43:06.51
\.


--
-- Name: ai_search_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_search_logs_id_seq', 11, true);


--
-- Name: areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.areas_id_seq', 84, true);


--
-- Name: availabilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.availabilities_id_seq', 1, false);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bookings_id_seq', 1, false);


--
-- Name: homes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.homes_id_seq', 50, true);


--
-- Name: inquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inquiries_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ratings_id_seq', 1, false);


--
-- Name: search_conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.search_conversations_id_seq', 6, true);


--
-- Name: universities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.universities_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 15, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ai_search_logs ai_search_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_search_logs
    ADD CONSTRAINT ai_search_logs_pkey PRIMARY KEY (id);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: availabilities availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availabilities
    ADD CONSTRAINT availabilities_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bulk_upload_jobs bulk_upload_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_upload_jobs
    ADD CONSTRAINT bulk_upload_jobs_pkey PRIMARY KEY (id);


--
-- Name: homes homes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homes
    ADD CONSTRAINT homes_pkey PRIMARY KEY (id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: search_conversations search_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_conversations
    ADD CONSTRAINT search_conversations_pkey PRIMARY KEY (id);


--
-- Name: universities universities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universities
    ADD CONSTRAINT universities_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ai_search_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ai_search_logs_createdAt_idx" ON public.ai_search_logs USING btree ("createdAt");


--
-- Name: ai_search_logs_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ai_search_logs_key_key ON public.ai_search_logs USING btree (key);


--
-- Name: ai_search_logs_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ai_search_logs_userId_idx" ON public.ai_search_logs USING btree ("userId");


--
-- Name: areas_city_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX areas_city_idx ON public.areas USING btree (city);


--
-- Name: areas_country_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX areas_country_idx ON public.areas USING btree (country);


--
-- Name: areas_district_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX areas_district_idx ON public.areas USING btree (district);


--
-- Name: areas_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX areas_key_key ON public.areas USING btree (key);


--
-- Name: areas_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX areas_name_idx ON public.areas USING btree (name);


--
-- Name: availabilities_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX availabilities_date_idx ON public.availabilities USING btree (date);


--
-- Name: availabilities_homeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "availabilities_homeId_idx" ON public.availabilities USING btree ("homeId");


--
-- Name: availabilities_inquiryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "availabilities_inquiryId_idx" ON public.availabilities USING btree ("inquiryId");


--
-- Name: availabilities_isAvailable_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "availabilities_isAvailable_idx" ON public.availabilities USING btree ("isAvailable");


--
-- Name: availabilities_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX availabilities_key_key ON public.availabilities USING btree (key);


--
-- Name: bookings_availabilityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "bookings_availabilityId_idx" ON public.bookings USING btree ("availabilityId");


--
-- Name: bookings_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX bookings_key_key ON public.bookings USING btree (key);


--
-- Name: bookings_ownerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "bookings_ownerId_idx" ON public.bookings USING btree ("ownerId");


--
-- Name: bookings_startTime_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "bookings_startTime_idx" ON public.bookings USING btree ("startTime");


--
-- Name: bookings_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookings_status_idx ON public.bookings USING btree (status);


--
-- Name: bookings_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "bookings_userId_idx" ON public.bookings USING btree ("userId");


--
-- Name: bulk_upload_jobs_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bulk_upload_jobs_status_idx ON public.bulk_upload_jobs USING btree (status);


--
-- Name: bulk_upload_jobs_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "bulk_upload_jobs_userId_idx" ON public.bulk_upload_jobs USING btree ("userId");


--
-- Name: homes_area_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX homes_area_idx ON public.homes USING btree (area);


--
-- Name: homes_city_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX homes_city_idx ON public.homes USING btree (city);


--
-- Name: homes_finalized_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX homes_finalized_idx ON public.homes USING btree (finalized);


--
-- Name: homes_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX homes_key_key ON public.homes USING btree (key);


--
-- Name: homes_listingType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "homes_listingType_idx" ON public.homes USING btree ("listingType");


--
-- Name: homes_ownerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "homes_ownerId_idx" ON public.homes USING btree ("ownerId");


--
-- Name: inquiries_approved_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX inquiries_approved_idx ON public.inquiries USING btree (approved);


--
-- Name: inquiries_dismissed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX inquiries_dismissed_idx ON public.inquiries USING btree (dismissed);


--
-- Name: inquiries_finalized_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX inquiries_finalized_idx ON public.inquiries USING btree (finalized);


--
-- Name: inquiries_homeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inquiries_homeId_idx" ON public.inquiries USING btree ("homeId");


--
-- Name: inquiries_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX inquiries_key_key ON public.inquiries USING btree (key);


--
-- Name: inquiries_userId_homeId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "inquiries_userId_homeId_key" ON public.inquiries USING btree ("userId", "homeId");


--
-- Name: inquiries_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inquiries_userId_idx" ON public.inquiries USING btree ("userId");


--
-- Name: notifications_deleted_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_deleted_idx ON public.notifications USING btree (deleted);


--
-- Name: notifications_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX notifications_key_key ON public.notifications USING btree (key);


--
-- Name: notifications_recipientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "notifications_recipientId_idx" ON public.notifications USING btree ("recipientId");


--
-- Name: notifications_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_type_idx ON public.notifications USING btree (type);


--
-- Name: notifications_viewed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_viewed_idx ON public.notifications USING btree (viewed);


--
-- Name: ratings_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ratings_key_key ON public.ratings USING btree (key);


--
-- Name: ratings_ratedUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ratings_ratedUserId_idx" ON public.ratings USING btree ("ratedUserId");


--
-- Name: ratings_raterId_ratedUserId_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ratings_raterId_ratedUserId_type_idx" ON public.ratings USING btree ("raterId", "ratedUserId", type);


--
-- Name: ratings_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ratings_type_idx ON public.ratings USING btree (type);


--
-- Name: search_conversations_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "search_conversations_createdAt_idx" ON public.search_conversations USING btree ("createdAt");


--
-- Name: search_conversations_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX search_conversations_key_key ON public.search_conversations USING btree (key);


--
-- Name: search_conversations_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "search_conversations_userId_idx" ON public.search_conversations USING btree ("userId");


--
-- Name: universities_city_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX universities_city_idx ON public.universities USING btree (city);


--
-- Name: universities_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX universities_key_key ON public.universities USING btree (key);


--
-- Name: users_clerkUserId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "users_clerkUserId_key" ON public.users USING btree ("clerkUserId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_key_key ON public.users USING btree (key);


--
-- Name: availabilities availabilities_homeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availabilities
    ADD CONSTRAINT "availabilities_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES public.homes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bookings bookings_availabilityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES public.availabilities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bookings bookings_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bookings bookings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bulk_upload_jobs bulk_upload_jobs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_upload_jobs
    ADD CONSTRAINT "bulk_upload_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: homes homes_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homes
    ADD CONSTRAINT "homes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: inquiries inquiries_homeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT "inquiries_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES public.homes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: inquiries inquiries_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT "inquiries_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_recipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ratings ratings_ratedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT "ratings_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ratings ratings_raterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT "ratings_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7nk9gwBYh4hr793ocBkeBqd9eH6LNgW2q46EWXg4Pb55QSqJtgQoelFjl4Zel7r

