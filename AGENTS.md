# AGENTS.md — Kontrak untuk AI Coding Agent (HOBYD)

Baca ini **sebelum menulis kode apa pun** di repo ini. Dokumen ini mengikat.

## Apa ini

HOBYD — platform **live auction** untuk kolektor (beachhead: Pokemon TCG), dibuat
untuk hackathon CR YOUTH 2026. Build **greenfield**, target selesai **12 jam** dengan
prioritas **keandalan demo live** + **kesiapan submission**.

## Baca dulu (urutan wajib)

1. `docs/00-scope-freeze.md` — **scope BEKU**. Ini yang menentukan boleh/tidak.
2. `docs/01-runbook-12h.md` — urutan tahap + checkpoint.
3. `docs/02-data-model-and-env.md` — schema, RLS, fungsi transaksional, env.
4. `docs/03-demo-scenario.md` — definisi "jalan" (acceptance + demo).

## Stack

Next.js (App Router) + TypeScript di Vercel · Supabase (Postgres/Auth/Realtime/Storage)
· LiveKit Cloud (video saja) · Midtrans sandbox (QRIS) · next-intl (ID+EN) · vitest.

## Invariant yang TIDAK boleh dilanggar

- **Server-authoritative:** browser tidak menentukan hasil lelang. Hanya Route
  Handler dengan `service_role` yang menulis DB. RLS: client baca saja.
- **Bid = atomik:** satu transaksi lewat RPC `place_bid` (advisory lock → row lock →
  validasi → rate limit → insert → extend). Jangan pecah jadi beberapa query dari app.
- **Waktu = jam server.** Jangan percaya `created_at` / waktu dari klien.
- **Anti-sniping:** extend +10s saat `0 <= (ends_at - now) < 10s` dan `extensions_used
  < MAX_SNIPING_EXTENSIONS` (5). Bid setelah `ends_at` ditolak, tidak membuka ulang.
- **Closer idempoten:** `POST` saja (GET tidak boleh mengubah state); tutup dua kali
  tetap satu order (`on conflict do nothing`).
- **Video terpisah dari state bid.** Kalau video mati, bidding harus tetap jalan.

## Larangan

- **JANGAN tambah fitur** di luar `00-scope-freeze.md`. Kalau menganggur, poles
  keandalan, bukan menambah fitur.
- JANGAN pakai chat/kategori/auction-mode/thumbnail dari prototype lama.
- JANGAN commit `.env.local` atau secret apa pun.
- JANGAN menunda deploy ke akhir — deploy tiap checkpoint.

## Konvensi

- Commit kecil & sering, pesan jelas (`feat:`, `fix:`, `chore:`, `docs:`). Commit
  history = bahan laporan pengembangan.
- Catat keputusan/penyimpangan di `DEVLOG.md` (1 baris per kejadian).
- Validasi setiap tahap: `npx vitest run` · `npx tsc --noEmit` · `npx next build`.
- Struktur folder mengikuti `docs/01-runbook-12h.md` (app/api, lib/supabase, dll).

## Root terkait

- Prototype acuan (jangan disalin bulat-bulat): `C:\Users\TRISTAN\Hobyd\.worktrees\hobyd-mvp`.
  Kalau macet dan waktu kritis, lihat "Cadangan C" di runbook.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
