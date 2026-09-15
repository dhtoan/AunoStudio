# Roadmap — dokumen pengembangan skill ini

Ditulis supaya siapa pun (manusia atau AI) yang membuka skill ini nanti
tahu dari mana ia berasal, apa yang sudah terbukti, dan ke mana arah
penyempurnaannya.

## Asal-usul

Skill ini disuling dari satu sesi nyata (September 2026) membangun promo
opener ±32 detik untuk sebuah aplikasi Android, bersama user yang bekerja
sebagai kreator video. Draf pertama ditolak karena "seperti presentasi";
sekitar enam putaran revisi kemudian menghasilkan hukum-hukum di
`anti-ppt.md` dan resep di `techniques.md`. Prinsip penyusunannya:
**yang masuk ke skill hanyalah pelajaran yang digeneralisasi** — bukan
warna, brand, atau kalimat spesifik proyek asalnya.

## Yang sudah terbukti (jangan mundur dari sini)

- Hukum satu-kalimat-satu-objek per adegan
- Rig kamera `#world` (latar ikut ter-zoom) + push-through antar segmen
- Pan 3D per kata sebagai efek istimewa yang dijatah
- Motion blur berarah via SVG filter
- Determinisme penuh → scrub akurat + export frame-by-frame
- Verifikasi visual dengan scrub-screenshot sebelum menyerahkan
- Interogasi sumber brand asli (vector logo, token warna, klaim fitur)

## Arah pengembangan (urut prioritas kasar)

1. **Audio nyata.** Saat ini spektrum/beat prosedural (sinus + BPM konstan).
   Tambah jalur: muat file audio → precompute FFT per frame (offline, sekali)
   → simpan JSON → playback deterministik tetap terjaga. JANGAN analisis
   real-time di render loop — itu membunuh determinisme dan export.
2. **Perpustakaan transisi.** Baru ada push-through, pan 3D, light leak.
   Kandidat: whip-pan horizontal, roll (rotasi rig), rack-focus (blur
   bertukar antara dua layer), match-cut bentuk (lingkaran spektrum → ikon
   bulat), zoom-through huruf O/lubang logo.
3. **Template rundown per genre.** Struktur 6–8 adegan yang terbukti untuk:
   app promo (hook→fitur→fitur→janji→logo→CTA), event teaser, portfolio
   reel, product launch. Simpan sebagai tabel siap-isi, bukan kode.
4. **Starter multi-file.** `assets/starter.html` sengaja satu berkas agar
   mudah disalin; sediakan juga versi terpecah (struktur di
   `architecture.md`) begitu ekosistem skill mendukung folder template.
5. **Ekspor lebih mulus.** Alternatif puppeteer: `MediaRecorder` +
   `canvas.captureStream` (cepat, kualitas lebih rendah), atau WebCodecs
   `VideoEncoder` (terbaik, butuh kode lebih). Juga preset ffmpeg untuk
   vertikal 1080×1920 (ganti konstanta stage → semua resep tetap jalan).
6. **Aksesibilitas review.** Skrip kecil yang otomatis men-screenshot
   N momen kunci (`tl.time(x)` → capture) dan menyusun contact sheet —
   mempercepat loop verifikasi visual yang sekarang manual.
7. **Kalibrasi selera lanjut.** Kumpulkan lebih banyak pasangan
   ditolak→diterima dari proyek berikutnya ke tabel di `anti-ppt.md`.
   Tabel itu adalah aset paling berharga skill ini.

## Antipola yang menggoda tapi jangan

- **Menjadikan starter berisi konten contoh yang terlalu jadi** — model akan
  menyalin gayanya mentah-mentah. Starter harus polos secara konten.
- **Menambah efek demi efek.** Setiap efek baru harus lulus tes: apakah ia
  gerakan kamera / pengungkapan makna, atau cuma gimmick? Gimmick menua
  dalam hitungan bulan.
- **Menulis MUST/JANGAN tanpa alasan.** Format skill ini: aturan + kenapa +
  kasus nyatanya. Aturan tanpa cerita akan dilanggar oleh model berikutnya.
- **Mengunci ke satu library.** GSAP + Three.js adalah pilihan default,
  bukan identitas. Prinsipnya (kamera, determinisme, anti-PPT) berlaku juga
  untuk Remotion, Motion One, atau canvas murni.

## Cara memakai skill ini di AI lain

Folder ini portabel: `SKILL.md` + `references/` + `assets/` + `scripts/`
hanyalah markdown, HTML, dan skrip. Untuk AI tanpa sistem skill:
tempelkan isi `SKILL.md` sebagai instruksi, lampirkan `anti-ppt.md` +
`techniques.md` saat sesi desain, `architecture.md` saat sesi coding,
dan berikan `starter.html` sebagai titik awal kode.


## Sudah dikerjakan (Sep 2026)

- Explainer: dua gaya (kartun+VO, foto jurnalistik tanpa VO) di 9:16 —
  `references/explainer.md`. Belum ada starter khusus explainer; kandidat
  berikutnya: `assets/starter-explainer.html` (stage 9:16, helper
  say/unsay/photo/draw/cut/tint, syncAudio) supaya tidak menulis ulang.
- Deliverable satu berkas tanpa server; `seek()` sinkron; angka tabular.
