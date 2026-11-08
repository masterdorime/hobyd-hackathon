# HOBYD Setup & Deployment

Dokumen ini mereproduksi environment HOBYD dari kosong sampai demo production.
Jangan menaruh nilai secret di README, commit, screenshot, atau chat.

## 1. Requirements

- Node.js 24+
- npm
- Akses ke Supabase, LiveKit Cloud, Midtrans Sandbox, GitHub, dan Vercel
- Supabase CLI opsional untuk operasi database remote

## 2. Install

```bash
npm install
cp .env.example .env.local
```

Isi `.env.local` dengan nama berikut. Nilai asli hanya disimpan lokal.

| Name | Scope |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public |
| `SUPABASE_SECRET_KEY` | server only |
| `NEXT_PUBLIC_LIVEKIT_URL` | public |
| `LIVEKIT_API_KEY` | server only |
| `LIVEKIT_API_SECRET` | server only |
| `MIDTRANS_SERVER_KEY` | server only |
| `MIDTRANS_CLIENT_KEY` | server only |
| `MAX_SNIPING_EXTENSIONS` | server config, default `5` |
| `EXTENSION_WINDOW_SEC` | server config, default `10` |
| `EXTENSION_ADD_SEC` | server config, default `10` |
| `AUCTION_DURATION_SEC` | server config, default `120` |
| `PAYMENT_WINDOW_SEC` | server config, default `300` |

## 3. Supabase

1. Buat project Supabase baru.
2. Jalankan `supabase/schema.sql` di SQL Editor.
3. Jalankan `supabase/seed.sql`.
4. Buat bucket **public** bernama `item-images` dan `room-thumbnails`.
5. Buat satu seller dan tiga bidder melalui **Authentication → Users**.
6. Setiap user yang login dapat menjadi seller untuk room miliknya; tidak ada allowlist email.

Schema membuat RLS pada semua tabel. Client hanya mendapat `SELECT`; mutasi hanya
lewat Route Handler dengan `SUPABASE_SECRET_KEY`. Setiap user memiliki maksimal
satu room melalui unique `owner_id`, dengan nama, enam kategori tetap, dan
thumbnail opsional. Fungsi `place_bid`, `close_item`, dan `create_live_item`
mencabut akses `anon/authenticated` dan memberi akses hanya ke `service_role`.

Reset data demo sebelum presentasi (hanya untuk room seed):

```sql
delete from public.orders
where item_id in (
  select id from public.items
  where room_id = '00000000-0000-4000-8000-000000000001'
);
delete from public.bids
where item_id in (
  select id from public.items
  where room_id = '00000000-0000-4000-8000-000000000001'
);
delete from public.items
where room_id = '00000000-0000-4000-8000-000000000001';
update public.rooms
set status = 'lobby'
where id = '00000000-0000-4000-8000-000000000001';
```

Hapus juga file uji di bucket `item-images` melalui Dashboard Storage. Jangan
menghapus akun Auth demo atau room seed.

## 4. LiveKit

1. Buat project LiveKit Cloud.
2. Salin URL WebSocket dan API key/secret ke env.
3. Tidak perlu menaruh secret di browser. Browser hanya menerima JWT sementara.
4. Seller mendapat `canPublish:true`; bidder hanya `canSubscribe:true`.

Jika kamera/LiveKit gagal, auction tetap berjalan. UI menampilkan fallback video
dan tombol bid tetap aktif.

## 5. Midtrans Sandbox

1. Ambil **Server Key** dan **Client Key** dari dashboard Midtrans mode Sandbox.
2. Isi `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY`; jangan pakai production key.
3. Di **Settings → Configuration → Payment Notification URL**, isi:

```text
https://hobyd-hackathon.vercel.app/api/orders/webhook
```

Webhook memverifikasi SHA-512 `order_id + status_code + gross_amount + server_key`,
payment type `qris`, dan nominal order lokal. Signature salah tidak menulis status.

Escape hatch sandbox: tombol **Konfirmasi pembayaran sandbox** memakai endpoint
mock-confirm yang tetap mensyaratkan winner, status pending, dan deadline server
yang belum lewat. Ini hanya fallback ketika webhook eksternal tidak tersedia.

## 6. Verifikasi lokal

```bash
npm run typecheck
npm run lint
npx vitest run
npx next build
```

Test integrasi Supabase memakai akun demo yang sudah ada dan fixture sementara
yang dibersihkan sendiri:

```bash
$env:RUN_SUPABASE_INTEGRATION="1"
node --env-file=.env.local --env-file=.env.demo.local `
  node_modules/vitest/vitest.mjs run tests/auction-rpc.integration.test.ts tests/close-rpc.integration.test.ts
```

SQL boundary test dijalankan eksplisit dan selalu rollback:

```bash
npx supabase db query --remote=<project-ref> --file=supabase/tests/auction-boundaries.sql --yes
```

## 7. Deploy Vercel

1. Hubungkan repository GitHub.
2. Tambahkan semua env ke Production; tandai secret sebagai sensitive.
3. Deploy:

```bash
npx vercel --prod --yes
```

4. Verifikasi `/id`, `/en`, `/login`, QR, webhook, dan fallback video pada URL
   production—bukan hanya localhost.

## 8. Golden Path

Ikuti `docs/03-demo-scenario.md`: seller Go Live → buat item → tiga bidder sinkron
→ anti-sniping sampai cap 5 → winner lock → satu order → QR create/resume →
paid atau mock-confirm → late protection → expired relist → video-off bid tetap
diterima.
