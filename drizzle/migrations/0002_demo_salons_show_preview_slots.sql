CREATE OR REPLACE FUNCTION public.get_available_slots(_salon_id uuid, _service_id uuid, _staff_id uuid, _date date)
 RETURNS SETOF timestamp with time zone
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare dur int; hrs record; t timestamp; s timestamptz; e timestamptz;
begin
  -- Demo salons show preview times; actual booking is still refused in _resolve_booking_slot.
  if not exists (select 1 from public.salons where id = _salon_id and status = 'active') then return; end if;
  select duration_min into dur from public.services where id = _service_id and salon_id = _salon_id and is_active;
  if dur is null then return; end if;
  select * into hrs from public.salon_hours where salon_id = _salon_id and weekday = extract(dow from _date)::int;
  if not found or hrs.is_closed then return; end if;
  t := _date + hrs.open_time;
  while t + make_interval(mins => dur) <= _date + hrs.close_time loop
    s := t at time zone 'Asia/Kolkata'; e := s + make_interval(mins => dur);
    if s >= now() + interval '15 minutes' and s <= now() + interval '60 days' then
      if exists (select 1 from public.staff st where st.salon_id = _salon_id and st.is_active and (_staff_id is null or st.id = _staff_id)
        and not exists (select 1 from public.bookings b where b.staff_id = st.id and b.status in ('pending','confirmed') and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(s, e, '[)'))) then
        return next s;
      end if;
    end if;
    t := t + interval '15 minutes';
  end loop;
end $function$;