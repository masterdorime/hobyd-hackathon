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
