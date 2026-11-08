# HOBYD — Live Auction untuk Kolektor

> Live auction berbasis web: penjual menyiarkan live dan melelang item satu per
> satu, pembeli menawar real-time dengan harga yang terbentuk transparan.
> Beachhead: kolektor Pokemon TCG Indonesia.

Dibuat untuk **CR YOUTH 2026 Hackathon** — Tim Pekalongan Hemker Community,
Telkom University.

## Status

Repositori: `https://github.com/masterdorime/hobyd-hackathon`

🚧 **Dalam pengerjaan (build 12 jam).** Lengkapi bagian di bawah setelah web jalan:

- [ ] Live URL Vercel: `https://<app>.vercel.app`
- [ ] Screenshot / GIF demo
- [ ] Arsitektur ringkas (video ↔ state terpisah, bid server-authoritative)

## Fitur (MVP)

- Auth + profil (Supabase)
- Room live + item (foto, judul, harga awal)
- Bidding real-time, **divalidasi server** (harga & riwayat sinkron ke semua klien)
- **Anti-sniping**: bid di 10 detik terakhir memperpanjang timer (+10s, maks 5×)
- **Winner lock** otomatis saat timer habis
- Pembayaran **QRIS sandbox** (jendela 5 menit, `pending → paid | expired`)
- Video live (LiveKit), UI **ID + EN**, responsif mobile & desktop

## Stack

Next.js (App Router) + TypeScript · Supabase (Postgres/Auth/Realtime/Storage) ·
LiveKit Cloud · Midtrans sandbox · Vercel.

## Menjalankan

```bash
cp .env.example .env.local   # isi semua nilai — lihat docs/02-data-model-and-env.md
npm install
npm run dev                  # http://localhost:3000/id
```

## Dokumentasi

- `docs/00-scope-freeze.md` — batas fitur
- `docs/01-runbook-12h.md` — rencana build
- `docs/02-data-model-and-env.md` — schema, RLS, env
- `docs/03-demo-scenario.md` — jalur demo + checklist
- `docs/SETUP.md` — *(menyusul)* setup backend + deploy
