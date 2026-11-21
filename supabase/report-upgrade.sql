-- Apply after schema.sql on new installs, or directly to an existing installation.
begin;
alter table public.requests
  add column locality text check (length(locality) between 1 and 120),
  add column block text check (length(block) <= 100),
  add column ward text check (length(ward) <= 100),
  add column road text check (length(road) <= 150),
  add column building text check (length(building) <= 60),
  add column pin text check (pin ~ '^[1-9][0-9]{5}$'),
  add column latitude double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180),
  add column submitted_at timestamptz,
  add column report_events jsonb not null default '[]'::jsonb,
  add column legacy_note text,
  add constraint requests_coordinate_pair check ((latitude is null) = (longitude is null));
alter table public.requests drop constraint requests_landmark_check;
alter table public.requests add constraint requests_landmark_check
  check (length(landmark) <= 180 and (locality is not null or length(landmark) >= 1));

create function northeast_private.record_report_event() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status is distinct from new.status or old.public_update is distinct from new.public_update then
    if old.submitted_at is null and old.report_events = '[]'::jsonb then
      new.legacy_note := nullif(old.public_update,'');
    end if;
    new.report_events := old.report_events || jsonb_build_array(jsonb_build_object(
      'kind', case when old.status is distinct from new.status then 'status' else 'note' end,
      'status', new.status,
      'at', new.updated_at,
      'note', case when old.public_update is distinct from new.public_update then new.public_update else '' end
    ));
  end if;
  return new;
end $$;

-- Postgres fires same-kind triggers alphabetically. touch_request sets updated_at first.
create trigger zz_report_event before update on public.requests
for each row execute function northeast_private.record_report_event();

create or replace function northeast_private.submit(input jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  code text := encode(extensions.gen_random_bytes(24),'hex');
  request_key bigint;
  submitted timestamptz := now();
  locality_name text := nullif(trim(input->>'locality'),'');
begin
  if locality_name is null then
    raise exception 'Village, town, or locality is required.';
  end if;
  insert into public.requests(
    state,district,locality,block,ward,road,building,landmark,pin,latitude,longitude,
    type,people,callback,submitted_at,report_events
  ) values (
    input->>'state',trim(input->>'district'),locality_name,
    nullif(trim(input->>'block'),''),nullif(trim(input->>'ward'),''),
    nullif(trim(input->>'road'),''),nullif(trim(input->>'building'),''),
    coalesce(trim(input->>'landmark'),''),nullif(trim(input->>'pin'),''),
    (input->>'latitude')::double precision,(input->>'longitude')::double precision,
    input->>'type',(input->>'people')::integer,coalesce(trim(input->>'callback'),''),
    submitted,jsonb_build_array(jsonb_build_object('kind','status','status','Submitted','at',submitted,'note',''))
  ) returning id into request_key;
  insert into northeast_private.tracking values (extensions.digest(code,'sha256'),request_key);
  return jsonb_build_object('code',code);
end $$;

create or replace function northeast_private.track(input jsonb) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'status',r.status,'updated_at',r.updated_at,'submitted_at',r.submitted_at,'demo',r.demo,
    'history_incomplete',r.submitted_at is null,'events',r.report_events,
    'legacy_note',case when r.submitted_at is null and r.report_events = '[]'::jsonb
                  then nullif(r.public_update,'') else r.legacy_note end
  )
  from northeast_private.tracking t join public.requests r on r.id=t.request_id
  where input->>'code' ~ '^[a-f0-9]{48}$' and t.digest=extensions.digest(input->>'code','sha256')
$$;
notify pgrst, 'reload schema';
commit;
