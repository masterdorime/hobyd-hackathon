# DEVLOG — Catatan Pengembangan HOBYD

> Satu baris per keputusan / masalah / penyimpangan. Ini bahan mentah
> **laporan pengembangan** dan harus selaras dengan proposal.

Format: `YYYY-MM-DD HH:MM | tahap | kejadian | keputusan/aksi`

## Log

- 2026-11-07 | Fase 0 | Scope dibekukan ke 6 fitur inti proposal, tanpa tambahan | tulis `docs/00-scope-freeze.md`
- 2026-11-07 | Fase 0 | Root build baru dibuat (greenfield) | `C:\Users\TRISTAN\hobyd-hackathon`
- 2026-11-08 | Fase awal | User memilih urutan UI-shell-first | Deploy awal + mobile-first tetap wajib sebelum integrasi
- 2026-11-08 | Tahap 1 | Next.js 16.4 memakai Tailwind Turbopack tanpa `postcss.config.mjs`, runtime Node 24 | Selaraskan `@types/node@24`, jalankan `next typegen && tsc --noEmit`
- 2026-11-08 | Tahap 2 | Routing next-intl dan navigasi instant Next 16 | Pakai `proxy.ts`, `setRequestLocale`, dan blocking route untuk param halaman
- 2026-11-08 | Tahap 3 | Kredensial lama dipetakan ke publishable/secret key; uji memakai empat akun demo baru | RLS/RPC tetap ditolak untuk client; tidak ada akun existing diubah
- 2026-11-08 | Tahap 1 | User memilih project Supabase greenfield `hobyd-hackathon`, bukan pilot | Schema+seed diterapkan; client select-only dan server write lewat service_role
- 2026-11-08 | Tahap 4 | Waktu mulai item tidak bisa dipercaya dari browser | RPC `create_live_item` menghitung `ends_at=now()+duration` di Postgres
- 2026-11-08 | Tahap 4 | `cacheComponents` Supabase SSR memicu background `Date.now` saat prerender | Gunakan App Router standar; matikan `cacheComponents`+`partialPrefetching`, jadikan route live/auth dinamis
- 2026-11-08 | Tahap 6 | Optimasi adaptive media mengganggu first-frame subscriber | Gunakan default `Room` LiveKit; auction tetap independen dari status media
