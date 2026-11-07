# 03 — Skenario Demo + Checklist Pra-Demo (HOBYD)

> Dipakai 3 hal sekaligus: (1) acceptance test build, (2) skenario presentasi/juri,
> (3) shot list video demonstrasi. Jalur ini harus jalan **100%** sebelum jam ke-12.

## Persiapan panggung (sebelum juri / sebelum rekam)

- [ ] URL produksi Vercel terbuka & responsif (cek `/id` dan `/en`).
- [ ] **Seed data**: 1 room status `live`, `seller_name` sudah terisi.
- [ ] Akun siap: **1 seller** (allowlist) + **3 akun bidder**, semua sudah login di
      browser berbeda (atau jendela incognito terpisah).
- [ ] Kamera penjual dikonfirmasi publish (video tampil di sisi viewer).
- [ ] Koneksi internet stabil; HP penjual sudah izin kamera.
- [ ] Reset ke kondisi bersih: tidak ada item aktif nyangkut, tidak ada order menggantung.
- [ ] Tab judul & favicon = HOBYD (bukan "Create Next App").
- [ ] Papan skor cadangan: screenshot tiap langkah (jaga-jaga kalau live gagal).

## Jalur demo emas (≈3 menit)

| Detik | Aksi | Yang harus terlihat |
|-------|------|---------------------|
| 0:00 | Seller login → **Go Live** | Room jadi `live`, video penjual muncul |
| 0:20 | Seller **Add item**: foto + judul + harga awal | Kartu item muncul; harga berjalan = harga awal; countdown jalan |
| 0:40 | Bidder A bid (amount > current) | Harga naik + feed bid update **di semua layar** |
| 0:55 | Bidder B & C bid lebih tinggi | Harga & feed sinkron real-time di 3 klien |
| 1:20 | Bidder A bid **di 10 detik terakhir** | Timer **extend +10s**, muncul indikator anti-sniping |
| 1:45 | (opsional) ulangi extend sampai cap | Setelah 5× **tidak** extend lagi |
| 2:00 | Timer habis | **Winner lock** → halaman "ITEM WON" untuk pemenang |
| 2:20 | Winner buka halaman bayar | QR QRIS sandbox + countdown **5:00** |
| 2:40 | Winner **confirm** (mock-confirm sandbox) | Status → **paid / ORDER CONFIRMED** |
| 3:00 | Seller **relist** contoh timeout (opsional) | Item timeout → `expired` → item baru muncul |

## Bukti "server-authoritative" (kuat untuk juri engineering)

- [ ] Tunjukkan bid **di bawah** harga berjalan → ditolak (error jelas, harga tidak berubah).
- [ ] Dua bid hampir bersamaan → **satu pemenang**, urut timestamp server.
- [ ] Tutup item dua kali (klik + timer) → **tetap satu order** (closer idempoten).
- [ ] Matikan video (tutup tab penjual) → **bidding tetap jalan** (isolasi video ↔ state).

## Latihan kegagalan (hafalkan escape-nya)

| Kalau ini terjadi | Lakukan |
|-------------------|---------|
| Video tidak muncul | Lanjut demo bidding — nyatakan video terisolasi; coba refresh sekali |
| Bid tidak update di satu klien | Refresh klien itu; nyatakan Realtime; lanjut |
| Pembayaran QR gagal | Pakai tombol **mock-confirm** (sandbox) dan jelaskan |
| Internet juri bermasalah | Tampilkan **screenshot cadangan** + commit history |

Prinsip: **jangan hentikan demo.** Semua jalur punya jalan keluar.

## Shot list video demonstrasi (rekam setelah web stabil)

1. **Hook (5s):** layar live auction dengan harga naik — "HOBYD, live auction untuk kolektor".
2. **Discover→Watch (10s):** lobby → masuk room → video penjual.
3. **Bid (15s):** dari 3 klien; sorot feed bid sinkron + harga naik.
4. **Anti-sniping (10s):** bid detik terakhir → timer extend.
5. **Win (8s):** countdown habis → modal "ITEM WON".
6. **Pay (12s):** QRIS sandbox + 5:00 → confirm → ORDER CONFIRMED.
7. **Penutup (5s):** tagline + (opsional) potongan arsitektur server-authoritative.

Total ±60–75 detik. Narasi ringkas, teks overlay ID (atau ID+EN).

## Checklist pra-deploy final

- [ ] `npx vitest run` — semua lulus.
- [ ] `npx tsc --noEmit` — tipe bersih.
- [ ] `npx next build` — build produksi sukses.
- [ ] Semua env terisi di Vercel (Production), tidak ada yang kosong.
- [ ] Notification URL Midtrans diarahkan ke `/api/orders/webhook`.
- [ ] Smoke test produksi = jalur demo emas di atas, dari nol, di perangkat bersih.
- [ ] Tag rilis dibuat (mis. `v1.0-demo`) + README final.
