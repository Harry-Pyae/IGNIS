-- IGNIS 0003: shared per-IP rate limit (§10). Additive only. OWNER: Coder A.
-- The in-memory limiter never returned 429 in production (state isn't shared across Vercel
-- function instances). This counter lives in Postgres, so every instance sees the same count.
-- Keys are sha256(bucket:ip) computed on the server: no raw IP addresses are stored.
-- Only the service role can touch it (src/server/rateLimit.ts), and the app FAILS OPEN when
-- the counter is unreachable, so a demo never dies on the limiter.

create table if not exists rate_limits (
  key      text primary key,
  count    int not null,
  reset_at timestamptz not null
);
alter table rate_limits enable row level security;
-- No policies: anon/authenticated get nothing. Belt and braces:
revoke all on rate_limits from anon, authenticated;

-- One atomic hit: starts a new window or counts within the current one.
-- Returns {allowed, retry_after_s}.
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_s int)
  returns json
  language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_reset timestamptz;
begin
  insert into rate_limits as r (key, count, reset_at)
    values (p_key, 1, now() + make_interval(secs => p_window_s))
  on conflict (key) do update set
    count    = case when r.reset_at <= now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at <= now() then now() + make_interval(secs => p_window_s) else r.reset_at end
  returning count, reset_at into v_count, v_reset;

  -- Housekeeping on ~1% of calls: drop windows that ended over an hour ago.
  if random() < 0.01 then
    delete from rate_limits where reset_at < now() - interval '1 hour';
  end if;

  return json_build_object(
    'allowed', v_count <= p_limit,
    'retry_after_s', greatest(1, ceil(extract(epoch from (v_reset - now())))::int)
  );
end $$;

revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
