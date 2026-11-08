# HOBYD — Live Auction untuk Kolektor

> Live auction berbasis web: penjual menyiarkan live dan melelang item satu per
> satu, pembeli menawar real-time dengan harga yang terbentuk transparan.
> Beachhead: kolektor Pokemon TCG Indonesia.

Dibuat untuk **CR YOUTH 2026 Hackathon** — Tim Pekalongan Hemker Community,
Telkom University.

## Status

Repositori: `https://github.com/masterdorime/hobyd-hackathon`

- Live URL: `https://hobyd-hackathon.vercel.app`
- Setup production: `docs/SETUP.md`
- Demo script: `docs/03-demo-scenario.md`

## Arsitektur

- Browser hanya membaca data publik lewat Supabase RLS dan Realtime.
- Semua mutasi melewati Route Handler dengan service-role setelah verifikasi user.
- `place_bid` dan `close_item` berjalan atomik di Postgres dengan jam database.
- Anti-sniping memperpanjang maksimal 5× saat sisa waktu kurang dari 10 detik.
- LiveKit hanya membawa media. Kegagalan video tidak menghentikan bid.
- QRIS, status pembayaran, expiry, dan winner selalu diputuskan server.

## Verifikasi

- Unit/contract test dan integrasi Supabase dijalankan sebelum setiap deploy.
- `npm run typecheck`, `npm run lint`, `npx vitest run`, dan `npx next build` wajib lulus.
- Golden path production mencakup tiga bidder, anti-sniping, winner lock, satu order,
  QR create/resume, verified webhook, expiry, relist, dan bid saat video mati.

## Fitur (MVP)

- Auth + profil (Supabase)
- Room live + item (foto, judul, harga awal)
- Bidding real-time, **divalidasi server** (harga & riwayat sinkron ke semua klien)
- Multi-room: setiap user login dapat Start Live dengan nama, kategori, dan thumbnail opsional
- **Anti-sniping**: bid di 10 detik terakhir memperpanjang timer (+10s, maks 5×)
- **Winner lock** otomatis saat timer habis
- Pembayaran **QRIS sandbox** (jendela 5 menit, `pending → paid | expired`)
- Video live (LiveKit), UI **ID + EN**, responsif mobile & desktop

## Stack

Next.js (App Router) + TypeScript · Supabase (Postgres/Auth/Realtime/Storage) ·
LiveKit Cloud · Midtrans sandbox · Vercel

## Menjalankan

```bash
cp .env.example .env.local   # isi semua nilai — lihat docs/02-data-model-and-env.md
npm install
npm run dev                  # http://localhost:3000/id
```

## Deployment & verifikasi

- Supabase SQL Editor: jalankan `supabase/schema.sql`, lalu `supabase/seed.sql`.
- Storage: bucket public-read bernama `item-images` diperlukan.
- Midtrans sandbox notification URL:
  `https://hobyd-hackathon.vercel.app/api/orders/webhook`
- Test akun demo disimpan lokal dalam file yang git-ignored, bukan di repo atau README.

```bash
npm run typecheck
npm run lint
npx vitest run
npx next build
```

## Dokumentasi

- `docs/00-scope-freeze.md` — batas fitur
- `docs/01-runbook-12h.md` — rencana build
- `docs/02-data-model-and-env.md` — schema, RLS, env
- `docs/03-demo-scenario.md` — jalur demo + checklist
- `docs/SETUP.md` — *(menyusul)* setup backend + deploy
