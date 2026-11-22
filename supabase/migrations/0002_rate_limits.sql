-- Babu Banarasi: rate limiting for the order function
-- Run once in Supabase → SQL Editor (or `supabase db push`).
-- Stores a one-way hash of each visitor's IP address (never the address itself)
-- so create-order can refuse someone placing dozens of orders a minute.

create table if not exists public.request_log (
  id       bigint generated always as identity primary key,
  ip_hash  text not null,
  fn       text not null,
  at       timestamptz not null default now()
);

create index if not exists request_log_lookup_idx on public.request_log (fn, ip_hash, at desc);

-- No policies: nobody can read or write this from the browser.
-- Only the server functions (service role) use it.
alter table public.request_log enable row level security;

-- Keep the table small: drop entries older than a day whenever new ones arrive
create or replace function public.prune_request_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if random() < 0.02 then
    delete from public.request_log where at < now() - interval '1 day';
  end if;
  return null;
end;
$$;

revoke all on function public.prune_request_log() from public, anon, authenticated;

drop trigger if exists request_log_prune on public.request_log;
create trigger request_log_prune
  after insert on public.request_log
  for each statement execute function public.prune_request_log();
