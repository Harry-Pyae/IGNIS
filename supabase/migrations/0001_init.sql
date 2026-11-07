-- IGNIS initial schema — copied verbatim from IGNIS_BUILD_PLAN.md §4.
-- RLS policies (§10) follow the schema. Changes go through Coder A only.

create table experiments (
  id uuid primary key default gen_random_uuid(),
  domain text not null default 'solid_flammability'
    check (domain in ('solid_flammability','smoke_detection')),  -- future: 'droplet_combustion'
  campaign text not null,              -- 'BASS' | 'BASS-II' | 'Saffire-I' ... 'SoFIE-MIST' | 'SAME'
  test_id text not null,               -- e.g. 'BASS-II test 17'
  fuel_material text not null,         -- normalized: 'PMMA', 'cotton_fiberglass', 'nomex', ...
  material_class text not null
    check (material_class in ('thermoplastic','fabric','aramid_fabric','insulation','other')),
  fuel_form text not null,             -- 'flat_sheet' | 'rod' | 'fabric' | 'thick_slab'
  thickness_mm numeric,                -- null = not stated
  o2_pct numeric,                      -- normalized volume %
  flow_cm_s numeric,                   -- forced flow velocity
  pressure_kpa numeric,
  ignition_method text,
  outcome text not null check (outcome in ('sustained','extinguished','transition','partial')),
  spread_rate_mm_s numeric,
  key_observation_quote text not null, -- verbatim from source, with original units
  observation_summary text,            -- curator's plain-language summary (1-2 sentences)
  source_title text not null,
  source_url text not null,            -- NTRS or PSI link
  psi_investigation text,              -- e.g. 'BASS' (psi.nasa.gov investigation name)
  source_page int,                     -- all provenance fields nullable; NEVER fabricated
  source_figure text,
  source_table text,
  source_section text,
  ntrs_id text,                        -- when source is NASA Technical Reports Server
  doi text,                            -- only when a DOI actually exists
  media_url text,                      -- NASA footage/still if available
  telemetry jsonb,                     -- optional: {label, x_label, y_label, points: [[x,y],...]} digitized curve
  verified_by text,                    -- curator name; card is PUBLIC only when non-null
  notes text,
  created_at timestamptz default now()
);

create table scenarios_log (          -- optional analytics; harmless
  id uuid primary key default gen_random_uuid(),
  raw_input text, parsed jsonb, created_at timestamptz default now()
);

create table briefings_cache (
  id uuid primary key default gen_random_uuid(),
  scenario_hash text unique, briefing jsonb, created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- §10 Security: Row Level Security
--   * anon may SELECT experiments only where verified_by is not null
--   * no public insert/update/delete on any table
--   * service-role (server routes only) bypasses RLS for writes
-- ---------------------------------------------------------------------------
alter table experiments     enable row level security;
alter table scenarios_log   enable row level security;
alter table briefings_cache enable row level security;

create policy "public reads verified experiments"
  on experiments for select
  to anon, authenticated
  using (verified_by is not null);

-- No other policies: with RLS on, anon/authenticated get no rows and cannot
-- write to scenarios_log or briefings_cache. Belt and braces on top of RLS:
revoke insert, update, delete on experiments, scenarios_log, briefings_cache from anon, authenticated;
revoke select on scenarios_log, briefings_cache from anon, authenticated;
