# 00 — Scope Freeze (HOBYD Hackathon, 12 jam)

> **Status:** BEKU. Dokumen ini adalah kontrak. Kalau suatu hal tidak ada di
> "IN-SCOPE", jangan dikerjakan — walau terlihat mudah.

## Tujuan build

Website live-auction berfungsi, **fitur sama persis dengan proposal**, dengan
prioritas **keandalan demo live** dan **kesiapan submission**. Build greenfield
(dari nol) di root ini, prototype lama (`C:\Users\TRISTAN\Hobyd\.worktrees\hobyd-mvp`)
hanya jadi **acuan keputusan**, bukan kode yang disalin.

## Definisi selesai (Definition of Done)

Demo emas jalan end-to-end di URL Vercel produksi:

1. Seller login → Go Live → add item (foto + judul + harga awal)
2. ≥3 bidder login di browser berbeda → bid real-time (harga + feed bid sinkron)
3. Bid di 10 detik terakhir → timer **extend +10s** (maks 5×)
4. Timer habis → **winner lock** → halaman menang muncul
5. Winner bayar QRIS sandbox (timer 5:00) → status **paid / confirmed**
6. Timeout → **expired → item bisa di-relist** sebagai item baru

Kalau keenam poin itu jalan di produksi, build selesai — berhenti. Jangan tambah.

## IN-SCOPE (6 fitur inti — hanya ini)

1. **Auth** — Supabase Auth (email), auto-create profile.
2. **Room** — `lobby/live/ended`, satu seller (allowlist email).
3. **Item** — seller create: foto (Storage) + judul + `start_price`; server set `ends_at`.
4. **Bid** — custom amount (integer IDR > `current_price`), otorisasi di server,
   rate limit 1/detik, urut timestamp server.
5. **Anti-sniping + winner lock** — extend +10s (cap 5), closer idempoten.
6. **Payment** — QRIS sandbox, jendela 5:00, `pending → paid | expired`.

Plus yang melekat wajib: **video LiveKit**, **i18n ID+EN**, **responsif (desktop + mobile)**.

## OUT-OF-SCOPE (eksplisit — JANGAN dikerjakan)

Fitur yang ada di prototype lama tapi **TIDAK** dipakai di build ini:

- Live chat
- Kategori room (Sneakers/TCG/…)
- Auction mode soft/hard (sudden-death) — cukup satu mode anti-sniping standar
- Thumbnail room, theater mode, mobile viewer stack khusus
- Sales inbox penjual, leaderboard reputasi, kontak handover WhatsApp
- Auto-sweep stream telantar, verifikasi penjual, sengketa, multi-seller
- Video promosi/`/brag`, analitik, notifikasi

Alasan: **laporan pengembangan harus selaras dengan proposal.** Menambah fitur =
melenceng dari proposal = risiko dinilai tidak konsisten.

## Keputusan teknis yang sudah dibekukan

- **Stack:** Next.js (App Router) + TypeScript di Vercel; Supabase (Postgres/Auth/
  Realtime/Storage); LiveKit Cloud (video saja); Midtrans sandbox (QRIS).
- **Server-authoritative:** browser tidak pernah menentukan hasil lelang; hanya
  Route Handler (service_role) yang menulis DB. RLS: client baca saja.
- **Anti-sniping:** extend saat `0 <= (ends_at - now) < 10s` **dan**
  `extensions_used < 5`. Bid telat (setelah `ends_at`) ditolak, tidak pernah membuka ulang.
- **Waktu:** semua dari jam server (`now()`), bukan jam klien.
- **Pembayaran:** `expired` = terminal; penjual relist sebagai item baru.
  `cancelled` khusus pembatalan manual penjual.

Detail teknis lengkap: `docs/02-data-model-and-env.md`.

## Non-negotiable (kalau dilanggar, demo bisa jebol)

- Deploy ke Vercel **sejak jam pertama**, tiap checkpoint — jangan menunggu akhir.
- Tidak ada `created_at` dari klien; tidak ada write langsung dari klien ke Supabase.
- Satu transaksi untuk bid (advisory lock → row lock → validasi → insert).
- Tidak ada fitur baru setelah jam ke-9; masuk mode freeze + hardening.
