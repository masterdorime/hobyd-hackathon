# 02 — Data Model + Env Contract (HOBYD, MVP beku)

> Sumber kebenaran teknis. DDL di bawah **sudah disederhanakan ke scope beku**
> (tanpa chat, kategori, auction mode, thumbnail). Ambil dari sini, jangan dari prototype.

## Tabel

| Tabel | Kolom kunci |
|-------|-------------|
| `rooms` | `id, title, seller_name, status(lobby/live/ended), created_at` |
| `items` | `id, room_id, title, img_url, start_price, current_price, ends_at, winner, extensions_used, status(lobby/live/ending/extended/closed), created_at` |
| `bids` | `id, item_id, bidder, amount, created_at` (created_at = jam server) |
| `profiles` | `id, name, reputation` |
| `orders` | `id, item_id(unique), winner, status(pending/paid/expired/cancelled), created_at, paid_at` |

## DDL (apply urut di Supabase SQL editor)

```sql
create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  reputation int not null default 0
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  seller_name text not null,
  status text not null check (status in ('lobby','live','ended')) default 'lobby',
  created_at timestamptz not null default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  img_url text not null,
  start_price int not null check (start_price > 0),
  current_price int not null check (current_price > 0),
  ends_at timestamptz not null,
  winner uuid references profiles(id),
  extensions_used int not null default 0 check (extensions_used >= 0),
  status text not null default 'lobby'
    check (status in ('lobby','live','ending','extended','closed')),
  created_at timestamptz not null default now()
);

create table bids (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  bidder uuid not null references profiles(id) on delete cascade,
  amount int not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references items(id) on delete cascade,
  winner uuid not null references profiles(id),
  status text not null default 'pending'
    check (status in ('pending','paid','expired','cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index bids_item_time_idx on bids (item_id, created_at desc);
create index items_room_status_idx on items (room_id, status);
```

## RLS — client baca saja, semua tulis lewat service_role

```sql
alter table rooms enable row level security;
alter table items enable row level security;
alter table bids enable row level security;
alter table orders enable row level security;
alter table profiles enable row level security;

create policy "public read rooms" on rooms for select to anon, authenticated using (true);
create policy "public read items" on items for select to anon, authenticated using (true);
create policy "public read bids" on bids for select to anon, authenticated using (true);
create policy "public read names" on profiles for select to anon, authenticated using (true);
create policy "winner order read" on orders for select to authenticated using (auth.uid() = winner);
-- SENGAJA tidak ada policy INSERT/UPDATE/DELETE untuk anon/authenticated.
-- Semua penulisan lewat Route Handler dengan service_role setelah verifikasi JWT.
```

## Fungsi transaksional (satu transaksi = satu kebenaran)

`place_bid` (advisory lock → row lock → validasi → rate limit → insert → extend)
dan `close_item` (lock → no-op kalau sudah closed/belum habis → set winner + order).
Ambang extend: `EXTENSION_WINDOW_SEC` (10s) dan `EXTENSION_ADD_SEC` (10s) lewat
parameter, `MAX_SNIPING_EXTENSIONS` sebagai cap.

```sql
create or replace function place_bid(
  p_item_id uuid, p_bidder uuid, p_amount int,
  p_max_extensions int, p_window_secs int, p_add_secs int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now();
  v_item items%rowtype; v_bid bids%rowtype; v_extended boolean := false;
begin
  if p_item_id is null or p_bidder is null or p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if p_max_extensions is null or p_max_extensions < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid'); end if;

  perform pg_advisory_xact_lock(hashtext(p_item_id::text));

  select * into v_item from items where id = p_item_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if v_item.status = 'closed' or v_now > v_item.ends_at then
    return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if p_amount <= v_item.current_price then
    return jsonb_build_object('ok', false, 'error', 'too_low'); end if;
  if exists (select 1 from bids
             where item_id = p_item_id and bidder = p_bidder
               and created_at > v_now - interval '1 second') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;

  insert into bids (item_id, bidder, amount)
  values (p_item_id, p_bidder, p_amount) returning * into v_bid;

  if v_item.ends_at - v_now >= interval '0 seconds'
     and v_item.ends_at - v_now < make_interval(secs => p_window_secs)
     and v_item.extensions_used < p_max_extensions then
    v_extended := true;
    update items set current_price = p_amount,
      ends_at = v_item.ends_at + make_interval(secs => p_add_secs),
      extensions_used = v_item.extensions_used + 1,
      status = 'extended'
    where id = p_item_id;
  else
    update items set current_price = p_amount where id = p_item_id;
  end if;

  return jsonb_build_object('ok', true, 'bid', row_to_json(v_bid), 'extended', v_extended);
end; $$;

revoke all on function place_bid(uuid,uuid,int,int,int,int) from public, anon, authenticated;
grant all on function place_bid(uuid,uuid,int,int,int,int) to service_role;

create or replace function close_item(p_item_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now(); v_item items%rowtype; v_winner uuid; v_price int;
begin
  if p_item_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  perform pg_advisory_xact_lock(hashtext(p_item_id::text));
  select * into v_item from items where id = p_item_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_item.status = 'closed' or v_now <= v_item.ends_at then
    return jsonb_build_object('ok', true, 'noop', true); end if;

  select bidder, amount into v_winner, v_price from bids
  where item_id = p_item_id
  order by amount desc, created_at asc, id asc limit 1;

  if not found then
    update items set status = 'closed' where id = p_item_id;
    return jsonb_build_object('ok', true, 'closed', true, 'winner', null);
  end if;
  update items set status = 'closed', winner = v_winner, current_price = v_price
  where id = p_item_id;
  insert into orders (item_id, winner, status)
  values (p_item_id, v_winner, 'pending') on conflict (item_id) do nothing;
  return jsonb_build_object('ok', true, 'closed', true, 'winner', v_winner);
end; $$;

revoke all on function close_item(uuid) from public, anon, authenticated;
grant all on function close_item(uuid) to service_role;
```

## Realtime + profil

```sql
-- WAJIB: tabel yang di-subscribe UI harus masuk publication,
-- kalau tidak callback postgres_changes diam-diam tidak pernah jalan.
do $$ begin alter publication supabase_realtime add table bids;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table items; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table rooms; exception when duplicate_object then null; end $$;

-- Auto-create profile saat signup (name = prefix email).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## Supabase API keys (sistem baru — bukan legacy)

Supabase mengganti `anon`/`service_role` (JWT lama) dengan key pendek. Pakai yang baru:

| Key | Nilai | Dipakai di | Peran Postgres |
|-----|-------|-----------|----------------|
| Publishable | `sb_publishable_...` | Browser + server (baca ber-JWT) | `anon` / `authenticated` |
| Secret | `sb_secret_...` | **Hanya server** (Route Handler) | `service_role` (bypass RLS) |

Aturan:
- Dua-duanya **wajib ada** — secret saja tidak cukup. Client (login + Realtime) butuh publishable.
- Secret key **tidak pernah** diberi prefix `NEXT_PUBLIC_`, tidak masuk git, tidak di browser.
  Supabase menolak secret key yang datang dari browser (HTTP 401).
- Key baru **bukan JWT** → dikirim lewat header `apikey`. Pakai `@supabase/ssr` + `supabase-js`
  versi terbaru yang sudah mendukungnya.
- Legacy `anon`/`service_role` masih jalan kalau kamu belum mau pindah, tapi deprecated akhir 2026.

## Env contract

| Env | Sumber / isi |
|-----|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings › API Keys, key `sb_publishable_...` (browser aman) |
| `SUPABASE_SECRET_KEY` | Supabase → Settings › API Keys, key `sb_secret_...` (**server-only**) |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit Cloud → project |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit Cloud (**server-only**) |
| `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` | Midtrans sandbox |
| `MAX_SNIPING_EXTENSIONS` | `5` |
| `EXTENSION_WINDOW_SEC` | `10` |
| `EXTENSION_ADD_SEC` | `10` |
| `AUCTION_DURATION_SEC` | `120` |
| `PAYMENT_WINDOW_SEC` | `300` (5:00) |

## Aturan lelang (jangan diubah tanpa alasan)

- Bid = integer IDR **strictly greater** dari `current_price`, tanpa kelipatan tetap.
- Anti-sniping: `0 <= (ends_at - now) < 10s` **dan** `extensions_used < 5` → `+10s`.
- Bid yang tiba setelah `ends_at` → tolak 4xx, **tidak** membuka ulang lelang.
- Rate limit: maks 1 bid/detik per user per item (di dalam transaksi).
- `created_at` selalu jam server; timestamp dari klien diabaikan.
- Winner: `amount desc, created_at asc, id asc` (tiebreak deterministik).
- `orders.status`: `pending → paid` (confirm) atau `pending → expired` (timeout 5:00).
  `expired` terminal → relist = item baru. `cancelled` khusus pembatalan manual.
