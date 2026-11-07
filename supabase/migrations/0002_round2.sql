-- IGNIS round 2 (docs/DECISIONS-ROUND2.md). Additive only — 0001_init.sql stays verbatim §4.
-- Run AFTER 0001_init.sql and BEFORE seed.sql. OWNER: Coder A.

-- ---------------------------------------------------------------------------
-- Audit + revision columns, changing-condition qualifier (A2, B)
-- ---------------------------------------------------------------------------
alter table experiments
  add column updated_at timestamptz not null default now(),
  add column verified_at timestamptz,
  -- [{parameter, from, to, stored, note}] — a test whose condition changed during the run.
  -- Matching/narration must never treat that parameter as constant (src/lib/types.ts).
  add column condition_changes jsonb;

alter table experiments add constraint condition_changes_is_array
  check (condition_changes is null or jsonb_typeof(condition_changes) = 'array');

-- Publication = a named human reviewer (A2). Mirrors src/lib/verifier.ts.
alter table experiments add constraint verified_by_is_a_real_name check (
  verified_by is null or (
    char_length(btrim(verified_by)) >= 2
    and verified_by !~* '\m(placeholder|tbd|todo|test|tester|testing|unknown|anonymous|anon|dummy|sample|example)\M'
  )
);

create or replace function set_updated_at() returns trigger
  language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger experiments_set_updated_at
  before update on experiments
  for each row execute function set_updated_at();

-- Briefing cache identity includes the catalog revision (B). scenario_hash holds
-- briefingCacheKey() from src/server/cacheKey.ts; this column is for auditing.
alter table briefings_cache add column catalog_revision text;

-- ---------------------------------------------------------------------------
-- Public catalog stats (D): COUNTS ONLY. Lets the public UI say "N cards in review"
-- without exposing a single draft row. revision changes whenever a verified card is
-- added, corrected or unpublished.
-- ---------------------------------------------------------------------------
create or replace function public.catalog_stats() returns json
  language sql stable security definer set search_path = public as $$
  select json_build_object(
    'verified',     count(*) filter (where verified_by is not null),
    'in_review',    count(*) filter (where verified_by is null),
    'campaigns',    coalesce((select json_agg(c order by c)
                                from (select distinct campaign as c from experiments
                                      where verified_by is not null) s), '[]'::json),
    'last_updated', max(updated_at) filter (where verified_by is not null),
    'revision',     coalesce(md5(string_agg(id::text || ':' || updated_at::text, ',' order by id)
                                 filter (where verified_by is not null)), 'empty')
  )
  from experiments;
$$;

revoke all on function public.catalog_stats() from public;
grant execute on function public.catalog_stats() to anon, authenticated, service_role;
