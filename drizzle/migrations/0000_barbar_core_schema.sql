
create extension if not exists btree_gist with schema extensions;

create type public.app_role as enum ('admin', 'salon_owner', 'customer');
create type public.salon_status as enum ('pending', 'active', 'suspended');
create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.salon_gender as enum ('unisex', 'men', 'women');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  phone text check (phone is null or char_length(phone) <= 20),
  city text check (city is null or char_length(city) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,140}$'),
  tagline text check (tagline is null or char_length(tagline) <= 160),
  description text check (description is null or char_length(description) <= 2000),
  gender public.salon_gender not null default 'unisex',
  address_line text not null check (char_length(address_line) between 3 and 250),
  area text not null check (char_length(area) between 2 and 80),
  city text not null check (char_length(city) between 2 and 60),
  pincode text check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
  phone text check (phone is null or char_length(phone) <= 20),
  cover_image text,
  amenities text[] not null default '{}',
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  review_count integer not null default 0,
  status public.salon_status not null default 'pending',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index salons_city_idx on public.salons (lower(city));
create index salons_owner_idx on public.salons (owner_id);
grant select on public.salons to anon;
grant select, update, delete on public.salons to authenticated;
grant all on public.salons to service_role;
alter table public.salons enable row level security;

create table public.salon_hours (
  salon_id uuid not null references public.salons(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_closed boolean not null default false,
  open_time time not null default '10:00',
  close_time time not null default '20:00',
  primary key (salon_id, weekday),
  check (is_closed or close_time > open_time)
);
grant select on public.salon_hours to anon;
grant select, insert, update, delete on public.salon_hours to authenticated;
grant all on public.salon_hours to service_role;
alter table public.salon_hours enable row level security;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text check (description is null or char_length(description) <= 500),
  category text not null default 'Hair' check (char_length(category) between 2 and 40),
  price_paise integer not null check (price_paise >= 0 and price_paise <= 10000000),
  duration_min integer not null check (duration_min between 5 and 480),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_salon_idx on public.services (salon_id);
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  title text check (title is null or char_length(title) <= 80),
  bio text check (bio is null or char_length(bio) <= 500),
  years_experience integer check (years_experience is null or years_experience between 0 and 60),
  specialties text[] not null default '{}',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index staff_salon_idx on public.staff (salon_id);
grant select on public.staff to anon;
grant select, insert, update, delete on public.staff to authenticated;
grant all on public.staff to service_role;
alter table public.staff enable row level security;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  salon_id uuid not null references public.salons(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  staff_id uuid not null references public.staff(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.booking_status not null default 'pending',
  price_paise integer not null check (price_paise >= 0),
  service_name text not null,
  duration_min integer not null,
  notes text check (notes is null or char_length(notes) <= 500),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  cancelled_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  constraint bookings_no_staff_overlap exclude using gist (
    staff_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);
create index bookings_customer_idx on public.bookings (customer_id, start_at desc);
create index bookings_salon_idx on public.bookings (salon_id, start_at);
grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;

create or replace function public.owns_salon(_salon_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.salons where id = _salon_id and owner_id = auth.uid())
$$;

create or replace function public.salon_visible(_salon_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.salons s
    where s.id = _salon_id
      and (
        s.status = 'active'
        or s.owner_id = auth.uid()
        or public.has_role(auth.uid(), 'admin')
        or exists (select 1 from public.bookings b where b.salon_id = s.id and b.customer_id = auth.uid())
      )
  )
$$;

create or replace function public.is_customer_of_my_salon(_customer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b join public.salons s on s.id = b.salon_id
    where b.customer_id = _customer_id and s.owner_id = auth.uid()
  )
$$;

create policy "Own profile readable" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin') or public.is_customer_of_my_salon(id));
create policy "Own profile insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "Own profile update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Salons visible" on public.salons for select to anon, authenticated
  using (public.salon_visible(id));
create policy "Owner or admin updates salon" on public.salons for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes salon" on public.salons for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Hours visible" on public.salon_hours for select to anon, authenticated
  using (public.salon_visible(salon_id));
create policy "Owner manages hours" on public.salon_hours for all to authenticated
  using (public.owns_salon(salon_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.owns_salon(salon_id) or public.has_role(auth.uid(), 'admin'));

create policy "Services visible" on public.services for select to anon, authenticated
  using (public.salon_visible(salon_id));
create policy "Owner manages services" on public.services for all to authenticated
  using (public.owns_salon(salon_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.owns_salon(salon_id) or public.has_role(auth.uid(), 'admin'));

create policy "Staff visible" on public.staff for select to anon, authenticated
  using (public.salon_visible(salon_id));
create policy "Owner manages staff" on public.staff for all to authenticated
  using (public.owns_salon(salon_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.owns_salon(salon_id) or public.has_role(auth.uid(), 'admin'));

create policy "Bookings visible to participants" on public.bookings for select to authenticated
  using (customer_id = auth.uid() or public.owns_salon(salon_id) or public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger services_touch before update on public.services for each row execute function public.touch_updated_at();
create trigger staff_touch before update on public.staff for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();

create or replace function public.salons_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
    if new.status is distinct from old.status
      or new.owner_id is distinct from old.owner_id
      or new.is_demo is distinct from old.is_demo
      or new.rating is distinct from old.rating
      or new.review_count is distinct from old.review_count
      or new.slug is distinct from old.slug then
      raise exception 'Only an admin can change status, owner, slug, rating or demo flag';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger salons_guard before update on public.salons for each row execute function public.salons_guard();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 100),
    left(new.raw_user_meta_data->>'phone', 20)
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.register_salon(
  _name text, _city text, _area text, _address_line text,
  _phone text default null, _gender public.salon_gender default 'unisex',
  _description text default null, _pincode text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_id uuid; base_slug text; final_slug text; n int := 0;
begin
  if uid is null then raise exception 'Please sign in first'; end if;
  if (select count(*) from public.salons where owner_id = uid) >= 3 then
    raise exception 'You can register up to 3 salons';
  end if;
  base_slug := trim(both '-' from regexp_replace(lower(coalesce(_name,'') || '-' || coalesce(_area,'')), '[^a-z0-9]+', '-', 'g'));
  if char_length(base_slug) < 2 then base_slug := 'salon'; end if;
  base_slug := left(base_slug, 120);
  final_slug := base_slug;
  while exists (select 1 from public.salons where slug = final_slug) loop
    n := n + 1; final_slug := base_slug || '-' || n;
  end loop;
  insert into public.salons (owner_id, name, slug, city, area, address_line, phone, gender, description, pincode, status)
  values (uid, trim(_name), final_slug, trim(_city), trim(_area), trim(_address_line), nullif(trim(_phone),''), _gender, nullif(trim(_description),''), nullif(trim(_pincode),''), 'pending')
  returning id into new_id;
  insert into public.salon_hours (salon_id, weekday, is_closed, open_time, close_time)
  select new_id, d, false, '10:00', case when d = 0 then '18:00'::time else '20:00'::time end
  from generate_series(0, 6) d;
  insert into public.user_roles (user_id, role) values (uid, 'salon_owner') on conflict do nothing;
  return new_id;
end $$;

create or replace function public._resolve_booking_slot(
  _salon_id uuid, _service_id uuid, _staff_id uuid, _start_at timestamptz, _exclude_booking uuid
) returns table (staff_id uuid, end_at timestamptz, price_paise integer, service_name text, duration_min integer)
language plpgsql security definer set search_path = public as $$
declare svc record; hrs record; local_start timestamp; local_end timestamp; v_end timestamptz; v_staff uuid;
begin
  if not exists (select 1 from public.salons s where s.id = _salon_id and s.status = 'active') then
    raise exception 'This salon is not accepting bookings right now';
  end if;
  select * into svc from public.services sv where sv.id = _service_id and sv.salon_id = _salon_id and sv.is_active;
  if not found then raise exception 'This service is not available at this salon'; end if;
  if _start_at < now() + interval '15 minutes' then raise exception 'Please choose a time at least 15 minutes from now'; end if;
  if _start_at > now() + interval '60 days' then raise exception 'Bookings can be made up to 60 days ahead'; end if;

  local_start := _start_at at time zone 'Asia/Kolkata';
  local_end := local_start + make_interval(mins => svc.duration_min);
  if extract(minute from local_start)::int % 15 <> 0 or extract(second from local_start) <> 0 then
    raise exception 'Please choose a valid time slot';
  end if;
  select * into hrs from public.salon_hours h where h.salon_id = _salon_id and h.weekday = extract(dow from local_start)::int;
  if not found or hrs.is_closed then raise exception 'The salon is closed on that day'; end if;
  if local_end::date <> local_start::date or local_start::time < hrs.open_time or local_end::time > hrs.close_time then
    raise exception 'That time is outside opening hours';
  end if;
  v_end := _start_at + make_interval(mins => svc.duration_min);

  if _staff_id is not null then
    if not exists (select 1 from public.staff st where st.id = _staff_id and st.salon_id = _salon_id and st.is_active) then
      raise exception 'The selected stylist is not available';
    end if;
    if exists (
      select 1 from public.bookings b
      where b.staff_id = _staff_id and b.status in ('pending','confirmed')
        and b.id is distinct from _exclude_booking
        and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(_start_at, v_end, '[)')
    ) then
      raise exception 'That time was just booked. Please pick another slot';
    end if;
    v_staff := _staff_id;
  else
    select st.id into v_staff from public.staff st
    where st.salon_id = _salon_id and st.is_active
      and not exists (
        select 1 from public.bookings b
        where b.staff_id = st.id and b.status in ('pending','confirmed')
          and b.id is distinct from _exclude_booking
          and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(_start_at, v_end, '[)')
      )
    order by (select count(*) from public.bookings b2 where b2.staff_id = st.id and b2.start_at::date = _start_at::date), st.created_at
    limit 1;
    if v_staff is null then raise exception 'No stylist is free at that time. Please pick another slot'; end if;
  end if;

  return query select v_staff, v_end, svc.price_paise, svc.name, svc.duration_min;
end $$;
revoke all on function public._resolve_booking_slot(uuid, uuid, uuid, timestamptz, uuid) from public, anon, authenticated;

create or replace function public.create_booking(
  _salon_id uuid, _service_id uuid, _staff_id uuid, _start_at timestamptz, _notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r record; new_id uuid;
begin
  if uid is null then raise exception 'Please sign in to book'; end if;
  if _notes is not null and char_length(_notes) > 500 then raise exception 'Notes are too long'; end if;
  if (select count(*) from public.bookings where customer_id = uid and status in ('pending','confirmed') and start_at > now()) >= 5 then
    raise exception 'You can hold up to 5 upcoming bookings at a time';
  end if;
  select * into r from public._resolve_booking_slot(_salon_id, _service_id, _staff_id, _start_at, null);
  if exists (
    select 1 from public.bookings b where b.customer_id = uid and b.status in ('pending','confirmed')
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(_start_at, r.end_at, '[)')
  ) then raise exception 'You already have another booking at that time'; end if;
  begin
    insert into public.bookings (customer_id, salon_id, service_id, staff_id, start_at, end_at, status, price_paise, service_name, duration_min, notes)
    values (uid, _salon_id, _service_id, r.staff_id, _start_at, r.end_at, 'pending', r.price_paise, r.service_name, r.duration_min, nullif(trim(_notes), ''))
    returning id into new_id;
  exception when exclusion_violation then
    raise exception 'That time was just booked. Please pick another slot';
  end;
  return new_id;
end $$;

create or replace function public.reschedule_booking(_booking_id uuid, _start_at timestamptz, _staff_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b record; r record;
begin
  if uid is null then raise exception 'Please sign in'; end if;
  select * into b from public.bookings where id = _booking_id for update;
  if not found or b.customer_id <> uid then raise exception 'Booking not found'; end if;
  if b.status not in ('pending','confirmed') then raise exception 'Only upcoming bookings can be rescheduled'; end if;
  if b.start_at <= now() then raise exception 'This booking has already started'; end if;
  select * into r from public._resolve_booking_slot(b.salon_id, b.service_id, _staff_id, _start_at, b.id);
  if exists (
    select 1 from public.bookings x where x.customer_id = uid and x.id <> b.id and x.status in ('pending','confirmed')
      and tstzrange(x.start_at, x.end_at, '[)') && tstzrange(_start_at, r.end_at, '[)')
  ) then raise exception 'You already have another booking at that time'; end if;
  begin
    update public.bookings set start_at = _start_at, end_at = r.end_at, staff_id = r.staff_id, status = 'pending'
    where id = b.id;
  exception when exclusion_violation then
    raise exception 'That time was just booked. Please pick another slot';
  end;
end $$;

create or replace function public.cancel_booking(_booking_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b record; is_staff_side boolean;
begin
  if uid is null then raise exception 'Please sign in'; end if;
  select * into b from public.bookings where id = _booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  is_staff_side := public.owns_salon(b.salon_id) or public.has_role(uid, 'admin');
  if b.customer_id <> uid and not is_staff_side then raise exception 'Booking not found'; end if;
  if b.status not in ('pending','confirmed') then raise exception 'This booking can no longer be cancelled'; end if;
  if not is_staff_side and b.start_at <= now() then raise exception 'This booking has already started'; end if;
  update public.bookings set status = 'cancelled', cancel_reason = left(nullif(trim(_reason),''), 300), cancelled_by = uid
  where id = b.id;
end $$;

create or replace function public.set_booking_status(_booking_id uuid, _status public.booking_status)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b record;
begin
  if uid is null then raise exception 'Please sign in'; end if;
  select * into b from public.bookings where id = _booking_id for update;
  if not found or not (public.owns_salon(b.salon_id) or public.has_role(uid, 'admin')) then
    raise exception 'Booking not found';
  end if;
  if b.status not in ('pending','confirmed') then raise exception 'This booking is already closed'; end if;
  if _status = 'pending' then raise exception 'Invalid status'; end if;
  if b.status = 'pending' and _status not in ('confirmed','cancelled') then
    raise exception 'Confirm the booking first';
  end if;
  if b.status = 'confirmed' and _status not in ('completed','no_show','cancelled') then
    raise exception 'Invalid status change';
  end if;
  update public.bookings set status = _status, cancelled_by = case when _status = 'cancelled' then uid else cancelled_by end
  where id = b.id;
end $$;

create or replace function public.get_available_slots(_salon_id uuid, _service_id uuid, _staff_id uuid, _date date)
returns setof timestamptz language plpgsql stable security definer set search_path = public as $$
declare dur int; hrs record; t timestamp; s timestamptz; e timestamptz;
begin
  if not exists (select 1 from public.salons where id = _salon_id and status = 'active') then return; end if;
  select duration_min into dur from public.services where id = _service_id and salon_id = _salon_id and is_active;
  if dur is null then return; end if;
  select * into hrs from public.salon_hours where salon_id = _salon_id and weekday = extract(dow from _date)::int;
  if not found or hrs.is_closed then return; end if;
  t := _date + hrs.open_time;
  while t + make_interval(mins => dur) <= _date + hrs.close_time loop
    s := t at time zone 'Asia/Kolkata';
    e := s + make_interval(mins => dur);
    if s >= now() + interval '15 minutes' and s <= now() + interval '60 days' then
      if exists (
        select 1 from public.staff st
        where st.salon_id = _salon_id and st.is_active and (_staff_id is null or st.id = _staff_id)
          and not exists (
            select 1 from public.bookings b where b.staff_id = st.id and b.status in ('pending','confirmed')
              and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(s, e, '[)')
          )
      ) then
        return next s;
      end if;
    end if;
    t := t + interval '15 minutes';
  end loop;
end $$;

create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorised'; end if;
  return json_build_object(
    'customers', (select count(*) from public.profiles),
    'salons', (select count(*) from public.salons),
    'salons_pending', (select count(*) from public.salons where status = 'pending'),
    'services', (select count(*) from public.services),
    'staff', (select count(*) from public.staff),
    'bookings', (select count(*) from public.bookings),
    'bookings_upcoming', (select count(*) from public.bookings where status in ('pending','confirmed') and start_at > now()),
    'bookings_completed', (select count(*) from public.bookings where status = 'completed'),
    'bookings_cancelled', (select count(*) from public.bookings where status = 'cancelled'),
    'booked_value_paise', (select coalesce(sum(price_paise),0) from public.bookings where status in ('pending','confirmed','completed'))
  );
end $$;

create or replace function public.admin_list_users()
returns table (id uuid, full_name text, phone text, city text, email text, created_at timestamptz, roles public.app_role[], booking_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorised'; end if;
  return query
    select p.id, p.full_name, p.phone, p.city, u.email::text, p.created_at,
      coalesce((select array_agg(r.role order by r.role) from public.user_roles r where r.user_id = p.id), '{}'),
      (select count(*) from public.bookings b where b.customer_id = p.id)
    from public.profiles p left join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;

create or replace function public.admin_set_role(_user_id uuid, _role public.app_role, _grant boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorised'; end if;
  if _user_id = auth.uid() and _role = 'admin' and not _grant then raise exception 'You cannot remove your own admin role'; end if;
  if _grant then
    insert into public.user_roles (user_id, role) values (_user_id, _role) on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user_id and role = _role;
  end if;
end $$;

revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_set_role(uuid, public.app_role, boolean) from public, anon;
revoke execute on function public.register_salon(text, text, text, text, text, public.salon_gender, text, text) from public, anon;
revoke execute on function public.create_booking(uuid, uuid, uuid, timestamptz, text) from public, anon;
revoke execute on function public.reschedule_booking(uuid, timestamptz, uuid) from public, anon;
revoke execute on function public.cancel_booking(uuid, text) from public, anon;
revoke execute on function public.set_booking_status(uuid, public.booking_status) from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_role(uuid, public.app_role, boolean) to authenticated;
grant execute on function public.register_salon(text, text, text, text, text, public.salon_gender, text, text) to authenticated;
grant execute on function public.create_booking(uuid, uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz, uuid) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.set_booking_status(uuid, public.booking_status) to authenticated;
grant execute on function public.get_available_slots(uuid, uuid, uuid, date) to anon, authenticated;

insert into public.salons (id, name, slug, tagline, description, gender, address_line, area, city, pincode, phone, cover_image, amenities, rating, review_count, status, is_demo) values
('d0000000-0000-4000-8000-000000000001', 'Kesar & Blade Barbers', 'demo-kesar-blade-indiranagar', 'Classic cuts, hot-towel shaves', 'Demo listing for preview only — not a real business. A warm, wood-and-brass barber lounge specialising in fades, beard sculpting and straight-razor shaves.', 'men', '12, 100 Feet Road (sample address)', 'Indiranagar', 'Bengaluru', '560038', '+91 90000 00001', 'demo:1', array['AC','Card & UPI','Wi-Fi'], 4.7, 212, 'active', true),
('d0000000-0000-4000-8000-000000000002', 'Saffron Studio Unisex Salon', 'demo-saffron-studio-koramangala', 'Hair, skin & bridal for everyone', 'Demo listing for preview only — not a real business. A bright unisex studio for cuts, colour, keratin and party makeup.', 'unisex', '48, 5th Block (sample address)', 'Koramangala', 'Bengaluru', '560095', '+91 90000 00002', 'demo:2', array['AC','Card & UPI','Parking'], 4.5, 168, 'active', true),
('d0000000-0000-4000-8000-000000000003', 'The Gilded Razor', 'demo-gilded-razor-bandra', 'Bandra''s gentleman''s grooming den', 'Demo listing for preview only — not a real business. Premium grooming with beard rituals, head massages and modern crops.', 'men', '7, Hill Road (sample address)', 'Bandra West', 'Mumbai', '400050', '+91 90000 00003', 'demo:3', array['AC','Card & UPI','Coffee'], 4.8, 301, 'active', true),
('d0000000-0000-4000-8000-000000000004', 'Mehndi & Mane Beauty Lounge', 'demo-mehndi-mane-andheri', 'Hair, threading & bridal styling', 'Demo listing for preview only — not a real business. A cosy salon for women offering threading, waxing, hair spa and bridal looks.', 'women', '22, Lokhandwala Complex (sample address)', 'Andheri West', 'Mumbai', '400053', '+91 90000 00004', 'demo:2', array['AC','UPI','Women-only staff'], 4.6, 140, 'active', true),
('d0000000-0000-4000-8000-000000000005', 'Noir Cut Company', 'demo-noir-cut-hauz-khas', 'Sharp fades in South Delhi', 'Demo listing for preview only — not a real business. A moody, modern barbershop known for skin fades and textured crops.', 'men', '3, Hauz Khas Village (sample address)', 'Hauz Khas', 'New Delhi', '110016', '+91 90000 00005', 'demo:1', array['AC','Card & UPI'], 4.4, 96, 'active', true),
('d0000000-0000-4000-8000-000000000006', 'Charminar Classic Salon', 'demo-charminar-classic-banjara-hills', 'Unisex family salon', 'Demo listing for preview only — not a real business. Unisex family salon with kids'' cuts, facials and hair colour.', 'unisex', '15, Road No. 12 (sample address)', 'Banjara Hills', 'Hyderabad', '500034', '+91 90000 00006', 'demo:3', array['AC','Kids friendly','UPI'], 4.3, 87, 'active', true),
('d0000000-0000-4000-8000-000000000007', 'Peshwa Grooming Co.', 'demo-peshwa-grooming-koregaon-park', 'Craft barbering in Koregaon Park', 'Demo listing for preview only — not a real business. Beard design, scalp treatments and classic barbering.', 'men', '9, Lane 6 (sample address)', 'Koregaon Park', 'Pune', '411001', '+91 90000 00007', 'demo:3', array['AC','Card & UPI','Music'], 4.6, 120, 'active', true),
('d0000000-0000-4000-8000-000000000008', 'Marina Glow Salon', 'demo-marina-glow-t-nagar', 'Hair, skin and nails in T. Nagar', 'Demo listing for preview only — not a real business. Unisex salon for haircuts, hair spa, facials and manicures.', 'unisex', '31, Usman Road (sample address)', 'T. Nagar', 'Chennai', '600017', '+91 90000 00008', 'demo:2', array['AC','UPI','Parking'], 4.5, 109, 'active', true);

insert into public.salon_hours (salon_id, weekday, is_closed, open_time, close_time)
select s.id, d,
  (s.id = 'd0000000-0000-4000-8000-000000000005' and d = 2),
  case when d = 0 then '10:00'::time else '09:30'::time end,
  case when d = 0 then '18:00'::time else '21:00'::time end
from public.salons s cross join generate_series(0, 6) d
where s.is_demo;

insert into public.services (salon_id, name, category, description, price_paise, duration_min, sort_order)
select s.id, t.name, t.category, t.description,
  ((round(t.base_rupees * s.mult / 50.0) * 50)::int * 100), t.duration, t.ord
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 1.2, 'men'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 1.1, 'unisex'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 1.5, 'men'),
  ('d0000000-0000-4000-8000-000000000004'::uuid, 1.2, 'women'),
  ('d0000000-0000-4000-8000-000000000005'::uuid, 1.0, 'men'),
  ('d0000000-0000-4000-8000-000000000006'::uuid, 0.8, 'unisex'),
  ('d0000000-0000-4000-8000-000000000007'::uuid, 1.0, 'men'),
  ('d0000000-0000-4000-8000-000000000008'::uuid, 0.9, 'unisex')
) as s(id, mult, kind)
join (values
  ('Classic Haircut', 'Hair', 'Consultation, wash, cut and styling.', 400, 30, 1, array['men','unisex']),
  ('Skin Fade', 'Hair', 'Precision fade with clipper and razor finish.', 550, 45, 2, array['men']),
  ('Beard Trim & Shape', 'Beard', 'Line-up, trim and beard oil finish.', 250, 20, 3, array['men','unisex']),
  ('Hot Towel Shave', 'Beard', 'Traditional straight-razor shave with hot towels.', 350, 30, 4, array['men']),
  ('Head Massage (Champi)', 'Spa', 'Relaxing 20-minute oil head massage.', 300, 20, 5, array['men','unisex','women']),
  ('Women''s Haircut & Blow-dry', 'Hair', 'Cut, wash and blow-dry styling.', 800, 60, 6, array['women','unisex']),
  ('Global Hair Colour', 'Colour', 'Ammonia-free global colour, price for medium length.', 2500, 120, 7, array['women','unisex']),
  ('Hair Spa', 'Spa', 'Deep-conditioning hair spa treatment.', 1200, 60, 8, array['women','unisex','men']),
  ('Eyebrow Threading', 'Skin', 'Shape and clean-up.', 80, 15, 9, array['women','unisex']),
  ('Fruit Facial', 'Skin', 'Cleanse, scrub, massage and pack.', 900, 60, 10, array['women','unisex']),
  ('Kids Haircut (under 10)', 'Hair', 'Gentle and quick cut for kids.', 250, 20, 11, array['unisex','men'])
) as t(name, category, description, base_rupees, duration, ord, kinds)
on s.kind = any(t.kinds);

insert into public.staff (salon_id, name, title, bio, years_experience, specialties) values
('d0000000-0000-4000-8000-000000000001', 'Ravi Kumar', 'Senior Barber', 'Demo profile. Fade specialist with a steady razor hand.', 9, array['Fades','Hot towel shave']),
('d0000000-0000-4000-8000-000000000001', 'Imran Shaikh', 'Beard Artist', 'Demo profile. Beard sculpting and line-ups.', 6, array['Beard design']),
('d0000000-0000-4000-8000-000000000001', 'Suresh Gowda', 'Barber', 'Demo profile. Classic cuts and head massages.', 4, array['Classic cuts','Champi']),
('d0000000-0000-4000-8000-000000000002', 'Ananya Rao', 'Creative Director', 'Demo profile. Colour and precision cuts.', 11, array['Colour','Balayage']),
('d0000000-0000-4000-8000-000000000002', 'Karthik Nair', 'Stylist', 'Demo profile. Men''s grooming and textured cuts.', 5, array['Men''s cuts']),
('d0000000-0000-4000-8000-000000000002', 'Divya Menon', 'Skin Therapist', 'Demo profile. Facials and threading.', 7, array['Facials','Threading']),
('d0000000-0000-4000-8000-000000000003', 'Farhan Qureshi', 'Master Barber', 'Demo profile. Two decades of straight-razor craft.', 18, array['Shaves','Classic cuts']),
('d0000000-0000-4000-8000-000000000003', 'Aditya Patil', 'Barber', 'Demo profile. Modern crops and fades.', 5, array['Fades']),
('d0000000-0000-4000-8000-000000000004', 'Priya Deshmukh', 'Senior Stylist', 'Demo profile. Bridal hair and blow-dries.', 10, array['Bridal','Blow-dry']),
('d0000000-0000-4000-8000-000000000004', 'Sneha Kulkarni', 'Beautician', 'Demo profile. Threading, waxing and facials.', 6, array['Threading','Facials']),
('d0000000-0000-4000-8000-000000000005', 'Vikram Singh', 'Lead Barber', 'Demo profile. Skin fades and textured crops.', 8, array['Skin fade']),
('d0000000-0000-4000-8000-000000000005', 'Arjun Mehta', 'Barber', 'Demo profile. Beard trims and kids'' cuts.', 3, array['Beard']),
('d0000000-0000-4000-8000-000000000006', 'Lakshmi Reddy', 'Stylist', 'Demo profile. Family cuts and colour.', 12, array['Colour','Kids cuts']),
('d0000000-0000-4000-8000-000000000006', 'Sai Teja', 'Barber', 'Demo profile. Men''s cuts and beard work.', 5, array['Men''s cuts']),
('d0000000-0000-4000-8000-000000000007', 'Omkar Joshi', 'Master Barber', 'Demo profile. Beard design and scalp care.', 10, array['Beard design','Scalp care']),
('d0000000-0000-4000-8000-000000000007', 'Rohan Pawar', 'Barber', 'Demo profile. Fades and classic cuts.', 4, array['Fades']),
('d0000000-0000-4000-8000-000000000008', 'Meena Subramanian', 'Senior Stylist', 'Demo profile. Hair spa and colour.', 9, array['Hair spa','Colour']),
('d0000000-0000-4000-8000-000000000008', 'Karthikeyan R', 'Barber', 'Demo profile. Men''s grooming.', 6, array['Men''s cuts']),
('d0000000-0000-4000-8000-000000000008', 'Revathi S', 'Nail & Skin Artist', 'Demo profile. Facials and manicures.', 5, array['Facials']);
