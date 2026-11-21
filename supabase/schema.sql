begin;
create schema if not exists northeast_private;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema northeast_private to anon, authenticated;

create table public.alerts (
  id bigint generated always as identity primary key,
  state text not null check (length(state) between 1 and 100),
  district text not null check (length(district) between 1 and 100),
  title text not null check (length(title) between 1 and 120),
  area text not null check (length(area) between 1 and 160),
  severity text not null check (severity in ('Advisory','Moderate','High','Severe')),
  issued_at timestamptz not null,
  instructions text not null check (length(instructions) between 1 and 1600),
  source text not null check (length(source) between 1 and 250),
  publication text not null default 'Draft' check (publication in ('Draft','Published','Expired')),
  demo boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.resources (
  id bigint generated always as identity primary key,
  state text not null check (length(state) between 1 and 100),
  district text not null check (length(district) between 1 and 100),
  name text not null check (length(name) between 1 and 120),
  type text not null check (type in ('Relief shelter','Medical facility','Emergency contact')),
  address text not null check (length(address) between 1 and 250),
  contact text not null check (length(contact) between 1 and 120),
  availability text not null check (availability in ('Open','Limited','Closed','Unknown')),
  verified_at timestamptz not null,
  demo boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.requests (
  id bigint generated always as identity primary key,
  state text not null check (state in ('Assam','Arunachal Pradesh','Manipur','Meghalaya','Mizoram','Nagaland','Sikkim','Tripura')),
  district text not null check (length(district) between 1 and 100),
  landmark text not null check (length(landmark) between 1 and 180),
  type text not null check (type in ('Evacuation','Medical help','Food and water','Shelter')),
  people integer not null check (people between 1 and 10000),
  callback text not null default '' check (length(callback) <= 30),
  status text not null default 'Submitted' check (status in ('Submitted','Acknowledged','In Progress','Resolved')),
  public_update text not null default '' check (length(public_update) <= 400),
  private_notes text not null default '' check (length(private_notes) <= 1000),
  demo boolean not null default false,
  updated_at timestamptz not null default now()
);
create table northeast_private.tracking (
  digest bytea primary key,
  request_id bigint not null unique references public.requests(id) on delete cascade
);
alter table northeast_private.tracking enable row level security;
alter table public.alerts enable row level security;
alter table public.resources enable row level security;
alter table public.requests enable row level security;

revoke all on public.alerts,public.resources,public.requests from public,anon,authenticated;
grant select on public.alerts,public.resources to anon,authenticated;
grant insert,update on public.alerts,public.resources to authenticated;
grant usage on sequence public.alerts_id_seq, public.resources_id_seq to authenticated;
grant select on public.requests to authenticated;
grant update (status,public_update,private_notes) on public.requests to authenticated;

create function public.is_admin() returns boolean language sql stable set search_path = ''
as $$ select coalesce(auth.jwt()->'app_metadata'->>'northeast_role' = 'admin',false) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;

create policy alert_read on public.alerts for select to anon,authenticated using (publication = 'Published' or (select public.is_admin()));
create policy alert_insert on public.alerts for insert to authenticated with check ((select public.is_admin()));
create policy alert_update on public.alerts for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy resource_read on public.resources for select to anon,authenticated using (true);
create policy resource_insert on public.resources for insert to authenticated with check ((select public.is_admin()));
create policy resource_update on public.resources for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy queue_read on public.requests for select to authenticated using ((select public.is_admin()));
create policy queue_update on public.requests for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create function northeast_private.touch() returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;
create trigger touch_alert before update on public.alerts for each row execute function northeast_private.touch();
create trigger touch_resource before update on public.resources for each row execute function northeast_private.touch();
create trigger touch_request before update on public.requests for each row execute function northeast_private.touch();

-- These two capability endpoints are intentionally available without an account.
-- The private implementation sets all privileged columns itself and exposes only the tracking projection.
create function northeast_private.submit(input jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  code text := encode(extensions.gen_random_bytes(24),'hex');
  request_key bigint;
begin
  insert into public.requests(state,district,landmark,type,people,callback)
  values (input->>'state',trim(input->>'district'),trim(input->>'landmark'),input->>'type',(input->>'people')::integer,coalesce(trim(input->>'callback'),''))
  returning id into request_key;
  insert into northeast_private.tracking values (extensions.digest(code,'sha256'),request_key);
  return jsonb_build_object('code',code);
end $$;

create function northeast_private.track(input jsonb) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('status',r.status,'public_update',r.public_update,'updated_at',r.updated_at,'demo',r.demo)
  from northeast_private.tracking t join public.requests r on r.id=t.request_id
  where input->>'code' ~ '^[a-f0-9]{48}$' and t.digest=extensions.digest(input->>'code','sha256')
$$;

create function public.submit_request(input jsonb) returns jsonb
language sql set search_path = '' as $$ select northeast_private.submit(input) $$;
create function public.track_request(input jsonb) returns jsonb
language sql stable set search_path = '' as $$ select northeast_private.track(input) $$;

revoke all on function northeast_private.submit(jsonb),northeast_private.track(jsonb),public.submit_request(jsonb),public.track_request(jsonb) from public,anon,authenticated;
grant execute on function northeast_private.submit(jsonb),northeast_private.track(jsonb),public.submit_request(jsonb),public.track_request(jsonb) to anon,authenticated;
commit;
