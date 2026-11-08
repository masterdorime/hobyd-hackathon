begin;

-- With PostgreSQL now(), ends_at-now() == 10s in this transaction.
-- Frozen place_bid uses a strict < 10s window, so no extension is allowed.
do $$
declare
  v_room uuid := gen_random_uuid();
  v_item uuid := gen_random_uuid();
  v_bidder uuid;
  v_before timestamptz;
  v_after timestamptz;
  v_result jsonb;
begin
  select id into v_bidder from public.profiles order by id limit 1;
  if v_bidder is null then raise exception 'boundary fixture needs a demo profile'; end if;

  insert into public.rooms (id, title, seller_name, status)
  values (v_room, 'SQL BOUNDARY TEST', 'fixture', 'live');
  insert into public.items (
    id, room_id, title, img_url, start_price, current_price,
    ends_at, extensions_used, status
  ) values (
    v_item, v_room, 'Exact boundary', 'https://example.com/card.png',
    1000000, 1000000, now() + interval '10 seconds', 0, 'live'
  );

  select ends_at into v_before from public.items where id = v_item;
  select public.place_bid(v_item, v_bidder, 1100000, 5, 10, 10) into v_result;
  select ends_at into v_after from public.items where id = v_item;

  if (v_result->>'ok') <> 'true' then
    raise exception 'boundary bid was rejected: %', v_result;
  end if;
  if (v_result->>'extended') <> 'false' or v_after is distinct from v_before then
    raise exception 'exact 10 second boundary incorrectly extended: %', v_result;
  end if;
end $$;

rollback;
