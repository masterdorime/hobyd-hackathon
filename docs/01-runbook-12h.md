# 01 — Runbook Build 12 Jam (HOBYD)

> Aturan emas: **deploy sejak jam pertama**, commit tiap langkah, **tanpa fitur baru**.
> Baca `00-scope-freeze.md` sebelum mulai. Kalau ragu: kerjakan yang bikin demo emas jalan.

## Ringkasan urutan

```
SETUP (0:00–0:45)
  → 1. SCAFFOLD + deploy kosong + schema            (0:45–2:00)
  → 2. AUTH + profile                                (2:00–3:00)
  → 3. ROOM + ITEM (seller create + Storage)         (3:00–4:30)
  → 4. BID ENGINE + anti-sniping        ★ GATE 1     (4:30–6:30)
  → 5. LIVEKIT video                                 (6:30–7:30)
  → 6. WINNER LOCK + order              ★ GATE 2     (7:30–9:00)
  → 7. PAYMENT QRIS sandbox                          (9:00–10:15)
  → 8. POLISH (i18n ID+EN, mobile)      ★ GATE 3     (10:15–11:15)
  → 9. FREEZE + smoke test + deploy final            (11:15–12:00)
```

Jam 0 = mulai. `★ GATE` = titik putuskan lanjut / cadangan.

---

## Pra-mulai (0:00–0:45) — provisioning backend fresh

Bikin project baru (jangan pakai data prototype):

- [ ] **Supabase**: project baru → jalankan schema (`docs/02-data-model-and-env.md`
      §DDL) → buat bucket Storage `item-images` (public read) → aktifkan Auth email
      → catat URL + anon key + service_role key.
- [ ] **LiveKit Cloud**: project baru → catat URL + API key + secret.
- [ ] **Midtrans sandbox**: catat server key + client key; notification URL diisi
      setelah deploy: `https://<app>.vercel.app/api/orders/webhook`.
- [ ] **Vercel**: import repo (nanti setelah push) / siapkan CLI.
- [ ] Salin `.env.example` → `.env.local`, isi semua.
- [ ] Tentukan akun seller demo (setiap user terautentikasi otomatis dapat menjadi seller room miliknya).

> Kalau satu layanan belum siap, **jangan berhenti** — pakai placeholder dan lanjut
> bagian lain; integrasi diisi saat checkpoint.

---

## Tahap 1 — Scaffold + deploy kosong + schema (0:45–2:00)

- [ ] `create-next-app` (TypeScript, App Router, Tailwind) di root ini.
- [ ] Install: `@supabase/ssr @supabase/supabase-js livekit-client livekit-server-sdk next-intl midtrans-client`; dev: `vitest`.
- [ ] Tulis `supabase/schema.sql` (dari `02-...md`) → apply ke Supabase baru.
- [ ] **Push ke GitHub + deploy Vercel kosong** → pastikan URL hidup.
- [ ] Commit: `chore: scaffold + schema + empty deploy`.

**Checkpoint 1:** URL produksi mengembalikan halaman (walau masih kosong).

## Tahap 2 — Auth + profile (2:00–3:00)

- [ ] Supabase client (browser/server/admin), `requireUser()`, `isSeller(email)`.
- [ ] Halaman login `/login`, redirect setelah login, tampilkan nama profil.
- [ ] Commit: `feat: supabase auth + seller gate`.

## Tahap 3 — Room + Item (3:00–4:30)

- [ ] `GET /api/rooms` (lobby list); halaman lobby.
- [ ] `GET /api/items?room_id=`; halaman live kerangka.
- [ ] `POST /api/items` (seller-only): upload foto ke Storage, server set
      `ends_at = now() + AUCTION_DURATION_SEC`, `status='live'`.
- [ ] Form penjual: foto + judul + harga awal (ultra-cepat).
- [ ] Commit: `feat: rooms + seller item create`.

## Tahap 4 — Bid engine + anti-sniping (4:30–6:30) ★ GATE 1

- [ ] `POST /api/bids` lewat RPC `place_bid(...)`: advisory lock → row lock →
      validasi (auth, amount>current, status, telat) → rate limit 1s → insert →
      update harga / extend.
- [ ] Realtime: subscribe `items` + `bids` (pastikan tabel masuk publication).
- [ ] UI: harga berjalan, countdown dari `ends_at`, feed bid, tombol/field Bid.
- [ ] Unit test: extend di 10s terakhir; bid telat tidak extend; cap 5 tidak extend; rate limit.
- [ ] **Deploy.** Commit: `feat: server-authoritative bids + anti-sniping`.

**★ GATE 1 (jam ~6:30):** Buka produksi — 1 seller add item, 2–3 bidder bid,
anti-sniping extend terbukti.
→ **Jalan?** lanjut Tahap 5.
→ **Belum?** jangan lanjut. Perbaiki maksimum 30 menit. Kalau masih belum,
**ambil Cadangan C** (lihat bawah).

## Tahap 5 — LiveKit video (6:30–7:30)

- [ ] `GET /api/livekit-token?roomId=` — grants: `publisher` untuk seller,
      `subscriber` untuk lain; token wajib login.
- [ ] Komponen `<LiveVideo>`: publisher (kamera penjual) / viewer.
- [ ] Video **terpisah total** dari state bid — kalau video mati, bidding tetap jalan.
- [ ] Commit: `feat: isolated livekit video`.

## Tahap 6 — Winner lock + order (7:30–9:00) ★ GATE 2

- [ ] `POST /api/items/[id]/close` (idempoten) — RPC `close_item()`:
      lock → kalau sudah closed/`now <= ends_at` → no-op; else set winner (bid
      tertinggi, tiebreak timestamp lalu id) + insert order `pending`.
- [ ] Trigger close saat hitung mundur habis + setiap bid POST mencoba close dulu.
- [ ] Halaman menang `/win/[itemId]` (modal "ITEM WON").
- [ ] Commit: `feat: idempotent closer + winner lock`.

**★ GATE 2 (jam ~9:00):** demo emas jalan sampai winner lock di produksi.
→ **Belum?** Cadangan C.

## Tahap 7 — Payment QRIS sandbox (9:00–10:15)

- [ ] Halaman bayar `/pay/[orderId]`: ringkasan + QR sandbox + countdown 5:00.
- [ ] `POST /api/orders/[id]/mock-confirm` (winner-only) → `paid`.
- [ ] `POST /api/orders/webhook` (Midtrans notification, verifikasi signature) → `paid`.
- [ ] Timeout → `expired` → penjual relist (item baru).
- [ ] Commit: `feat: sandbox qris checkout + webhook + mock confirm`.

## Tahap 8 — Polish (10:15–11:15) ★ GATE 3

- [ ] i18n ID+EN (`next-intl`), toggle bahasa.
- [ ] Responsif: mobile-first; cek di lebar 360px + desktop.
- [ ] Judul tab & favicon HOBYD (bukan "Create Next App").
- [ ] Commit: `feat: id-en locales + responsive polish`.

**★ GATE 3 (jam ~11:15):** berhenti menambah. Masuk freeze.

## Tahap 9 — Freeze + smoke test + deploy final (11:15–12:00)

- [ ] Jalankan **checklist pra-demo** (`03-demo-scenario.md`).
- [ ] Seed data demo (1 room, 1 item contoh) + akun bidder.
- [ ] Reset data demo ke kondisi bersih.
- [ ] Deploy final + tag rilis (`v1.0-demo`).
- [ ] Set notification URL Midtrans ke `/api/orders/webhook`.

---

## Cadangan C — kalau GATE gagal (waktu mepet)

Hardening prototype lama sebagai jalur penyelamat:

1. Clone/fork branch `hobyd-mvp` dari `C:\Users\TRISTAN\Hobyd\.worktrees\hobyd-mvp`.
2. Pakai ulang stack & schema yang sudah terbukti (identik, jadi nol risiko).
3. Fokus hanya: perbaiki bug + pastikan demo emas stabil. **Tidak** mengejar greenfield.
4. Tetap update README/laporan agar narasi konsisten.

Keputusan diambil di **GATE 1** atau **GATE 2**, bukan belakangan.

## Aturan gaya kerja (untuk kamu + AI agent)

- Commit kecil & sering dengan pesan jelas — ini jadi bahan laporan pengembangan.
- Setiap tahap **diakhiri dengan deploy**, bukan di akhir.
- Jangan menyentuh OUT-OF-SCOPE walau menganggur.
- Kalau ada keputusan/penyimpangan, catat 1 baris di commit message / `DEVLOG.md`.
