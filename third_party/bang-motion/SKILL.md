---
name: bang-motion
description: Membangun motion graphic sinematik di browser (promo video, opener, intro, bumper, kinetic typography, explainer/video penjelasan bergambar 16:9 atau 9:16) memakai HTML + CSS + GSAP (+ Three.js bila perlu), dengan hasil yang bergerak seperti video sungguhan — bukan slide presentasi. Gunakan skill ini setiap kali user meminta "video promo", "opener", "intro animasi", "motion graphic", "bumper", "kinetic typography", "animasi teks sinematik", "explainer", "video penjelasan" (jurnalisme visual, kartun edukasi, kolase), atau menunjukkan referensi video promosi/explainer dan ingin dibuatkan versi web-nya — bahkan bila mereka tidak menyebut kata "motion graphic" secara eksplisit. Juga gunakan bila user mengeluh hasil animasi web "seperti PPT/presentasi" dan ingin lebih sinematik, atau ingin merender animasi web menjadi file video MP4.
license: MIT
metadata:
  author: Bang Tutorial
  author_url: https://youtube.com/bangtutorial
  version: "1.0.0"
  updated: "2026-09-06"
  homepage: https://github.com/bangtutorial/bang-motion
---

# Bang Motion — motion graphic web yang bukan PPT

**v1.0.0 · by [Bang Tutorial](https://youtube.com/bangtutorial) · MIT.** Riwayat perubahan di `CHANGELOG.md`;
cara pasang di `README.md`.

Skill ini untuk AI coding agent apa pun (format Agent Skills terbuka).
Isinya membekukan pelajaran dari membangun promo opener nyata bersama
seorang kreator video yang berulang kali menolak hasil "rasa presentasi".
Hukum-hukum di sini lahir dari penolakan itu — patuhi sebelum menulis kode.

## Prasyarat — hanya browser

Deliverable (`index.html`) hanya butuh browser modern + internet untuk CDN
(GSAP, font). Python dan Node **opsional**, dipakai hanya untuk alat kerja:
`scripts/serve.py` (server no-cache, cuma perlu bila memakai module lokal),
puppeteer (snapshot/verifikasi otomatis, `scripts/export-frames.mjs` → MP4).
Kalau user tidak punya keduanya: (1) tetap bangun satu-berkas, buka lewat
klik dua kali; (2) verifikasi visual lewat `?debug=1` (panel scrub) dan
screenshot manual per detik kunci; (3) MP4 lewat rekam layar (OBS / rekam
tab browser) — jelaskan bahwa hasil rekam layar bisa drop frame, dan render
frame-by-frame butuh Node. Jangan pernah membuat deliverable yang butuh
`npm install` untuk DITONTON.

**ffmpeg juga opsional.** Cek dulu (`ffmpeg -version`); bila tidak ada:

| Kebutuhan | Dengan ffmpeg | Tanpa ffmpeg |
|---|---|---|
| Sinkron VO (batas kalimat/paragraf) | `silencedetect` | `scripts/vo-pauses.html` — buka di browser, pilih audio, salin `SEG`/`PARA`; hasilnya sama persis (Web Audio, tanpa instal) |
| Durasi/format audio | `ffprobe` | angka `DUR` dari vo-pauses.html; browser memutar wav/mp3/m4a/ogg langsung |
| Export MP4 | gabung PNG dari export-frames.mjs | tidak ada MP4 — tawarkan instal satu perintah (`winget install Gyan.FFmpeg` / `brew install ffmpeg`) atau rekam layar |
| Mempelajari video referensi (ekstrak frame) | `fps=` + `tile=` | minta user mengirim screenshot di detik kunci, atau buka videonya di browser dan potret pada detik tertentu |

Tanpa ffmpeg alur explainer tetap lengkap sampai sinkron VO; hanya MP4 yang
butuh instalasi.

## Player — tidak ada, autoplay, loop

Default deliverable: **tanpa panel/player apa pun di layar**, langsung
memutar saat dibuka, dan mengulang dari awal saat selesai (`onComplete →
play(0)`; bila ada suara, audio ikut diulang). Kontrol tersembunyi: R ulang,
Space jeda. Panel scrub/jam hanya muncul dengan `?debug=1` (alat review),
dan `?clean=1` menahan autoplay untuk export. Ada suara? Coba `play()`
langsung; bila diblokir browser, tahan di frame 0 dan mulai pada klik
pertama — tanpa teks "ketuk untuk mulai". Ini sudah tertanam di kedua
starter.

## Larangan struktural — uji PPT yang bisa diperiksa mekanis

Model lain (dan kamu, bila lelah) akan jatuh ke pola ini walau sudah membaca
hukum di bawah. Sebelum menyerahkan, cek KODE, bukan perasaan:

1. `grep -c "class=\"scene\"\|<section" index.html` — bila ≥ 3 adegan
   berupa `<section>` yang dinyalakan-dimatikan dengan `autoAlpha`/opacity
   → itu slide deck. Adegan harus berganti karena DUNIA/KAMERA bergerak
   (kamera bergerak, whip ke sudut lain, push-through, latar berganti),
   bukan karena section
   di-fade.
2. Ada benang merah visual yang bertahan: satu subjek (aksi kontinu) ATAU
   satu dunia kolase/kertas/putih yang disusuri kamera (kartun, foto,
   katalog, sketsa). Foto full-bleed berganti-ganti tanpa dunia bersama →
   PPT.
3. Per adegan hitung node teks: eyebrow/kicker + judul + body/kredit = 3
   tingkat → PPT. Maksimum dua: satu angka/kalimat besar + satu label dunia.
4. Ken Burns (scale 1.0→1.05 pada foto) sebagai satu-satunya gerak → PPT.
   Gerak tiap detik harus datang dari BAHASA GERAK LATAR yang dipilih di
   style brief dari menu `techniques.md` §7c (kamera bernapas di latar
   bertekstur, gradien berpindah, blob mengambang, grain hidup, sapuan
   cahaya per segmen, bentuk besar berputar lambat, partikel naik, grid
   bernapas, teks hantu bergeser, Ken Burns + parallax…). Batang/garis/
   potongan yang melintas ke samping ("lane", "range", "streak", hujan
   partikel horizontal) SUDAH dipakai dua proyek berturut-turut dengan nama
   berbeda — itu bukan default; hanya bila tema memang kecepatan/aliran,
   dan tidak boleh dua proyek berturut-turut.
5. Transisi hanya fade + scale bump + light leak di semua cut → template PPT.
   Whip ke sudut lain, cut ke instrumen (peta/speedometer/profil), push-through.
6. Explainer dimulai dari starter GAYANYA: `starter-explainer-kartun`,
   `-jurnalisme`, `-katalog`, `-sketsa` (mode kolase: kamera menyusuri aset
   diam) atau `starter-explainer` (aksi kontinu: dunia mengalir). Semuanya
   satu rig; yang beda hanya permukaan. BUKAN dari `assets/starter.html`
   (opener teks), dan bukan dari nol.

Gagal satu poin saja → rombak sebelum ditunjukkan ke user.

## Jenis pekerjaan yang dicakup

Skill ini untuk motion graphic web secara UMUM. Explainer hanya salah satu
jenis — ia punya dokumen sendiri karena strukturnya beda, bukan karena ia
yang utama.

| Jenis | Durasi lazim | Ciri | Resep |
|---|---|---|---|
| Opener / promo produk | 25–40 dtk | satu kalimat per adegan, mockup produk, satu momen istimewa, CTA | alur kerja di bawah + `references/techniques.md` |
| Bumper / ident / logo sting | 3–8 dtk | logo build-on, satu gerak tanda tangan, selesai sebelum penonton sadar | `techniques.md` (logo build-on, light leak) |
| Intro / outro kanal | 5–12 dtk | nama kanal + tanda tangan gerak yang sama tiap episode | alur kerja di bawah |
| Kinetic typography / lirik | 15–60 dtk | teks adalah subjek; split per kata/huruf; ritme mengikuti audio | `techniques.md` (split + blur berarah, pan 3D per kata) |
| Title / lower third / bumper segmen | 2–6 dtk | elemen kecil di atas footage, masuk-keluar bersih, latar transparan | `techniques.md` |
| Explainer / video penjelasan | 30–90 dtk | fakta bersumber, entitas tampil, sudut pandang berganti, lima gaya | `references/explainer.md` + starter per gaya |

## Hukum #1 — Ini video, bukan slide

Penyakit paling umum: model menyusun adegan seperti slide — judul + sub-judul
+ body copy + deretan badge. Itu langsung terbaca "PPT" dan akan ditolak.

Aturan kerasnya:

- **Satu kalimat pendek + maksimal satu objek visual per adegan.** Tidak ada
  kicker ("01 — FITUR"), sub-judul, paragraf keterangan, chip/badge fitur,
  atau metadata teknis (nama package, URL panjang).
- **Informasi baru = adegan baru**, bukan teks tambahan di adegan lama.
- **Daftar poin diganti ikon.** Tiga klaim fitur jadi tiga tile ikon
  berlabel 1-2 kata, bukan tiga baris teks.
- **Kamera tidak pernah statis.** Kalau teks hanya fade/slide in-out dengan
  latar diam, itu slide. Kamera harus mendorong, menarik, menyusur.

Baca `references/anti-ppt.md` SEBELUM mendesain adegan — berisi daftar
pelanggaran nyata beserta perbaikannya.

## Hukum #2 — Deterministik atau mati

Tidak ada satu baris pun yang membaca jam sistem. Semua visual adalah fungsi
murni dari `tl.time()` (waktu timeline GSAP): spektrum, angka berjalan,
partikel, getar kamera (sinus frekuensi tinggi, bukan `Math.random()`),
posisi objek yang "mengalir" (tween JARAK, bukan akumulasi kecepatan per
frame). Konsekuensinya: scrub akurat seperti timeline After Effects, dan
render frame-by-frame ke MP4 menghasilkan gambar identik setiap kali.

## Hukum #3 — Gaya lahir dari tema, bukan dari starter, bukan dari referensi

Kasus nyata (6 Sep 2026): opener untuk aplikasi lain keluar dengan kulit
PERSIS opener produk sebelumnya — gelap, aksen biru, glow, nebula, font yang
sama — karena model mengambil gayanya dari starter. Animasinya bagus, tetap
gagal: opener adalah wajah produk, dan dua produk tidak boleh berwajah sama.

1. **Style brief dulu, kode belakangan.** Sebelum menyentuh starter, tulis
   enam baris ini dan tunjukkan ke user bersama rundown adegan:
   - tema/produk + tiga kata sifat perasaan yang ingin ditinggalkan;
   - palet: satu warna utama DARI brand/tema (logo, ikon aplikasi, situs,
     kemasan), satu warna latar, satu aksen — sebutkan hex-nya;
   - font display yang punya karakter sesuai perasaan itu (bukan
     Poppins/Inter/Roboto/Montserrat/Arial) + font pendamping;
   - bahasa latar per segmen: satu arah dari tabel "Arah gaya" untuk semua,
     atau rencana pergantian (segmen mana ganti, ke apa, kenapa);
   - tanda tangan gerak: satu jenis gerak yang diulang sebagai identitas
     (wipe objek, roll 3D per kata, kertas terbang, garis yang menggambar,
     blok warna menabrak tepi…);
   - gerak latar: satu bahasa dari menu `techniques.md` §7c — bukan hal yang
     sama dengan tanda tangan gerak, dan bukan otomatis "benda melintas";
   - permukaan latar: dari menu §7d (gradien/cahaya/tekstur, ≥ 2 lapis) —
     bukan flat;
   - transisi: minimal dua jenis dari menu §4c, minimal satu berkedalaman
     (3D/perspektif); tanpa balok/persegi datar menyapu;
   - satu momen istimewa (di mana efek termahal dipakai, sekali).
2. **Starter adalah arsitektur, bukan gaya.** Warna abu-abu, font sistem,
   dan latar WebGL di `assets/starter.html` adalah PLACEHOLDER. Kalau salah
   satunya masih terlihat di hasil, gaya belum diturunkan. Latar WebGL
   (nebula, debu, grid, bloom) hanya satu bahasa latar dari delapan;
   matikan bila arah gayanya lain.
3. **Referensi = ritme, bukan kulit.** Dari video referensi ambil: durasi per
   shot, urutan, jenis transisi, hierarki atensi, energi. JANGAN ambil:
   palet, font, tekstur, tata letak, bentuk ornamen, kalimat. "Buatkan
   seperti ini" berarti "seenergik ini", bukan "berwarna seperti ini".
   Menjiplak kulit referensi = pelanggaran, walau user yang menyodorkannya —
   sebutkan itu satu kalimat lalu tawarkan versi yang lahir dari tema.
4. **Berbeda dari proyek sebelumnya.** Dua produk berbeda harus berbeda di
   minimal tiga dari empat: palet, font, bahasa latar, tanda tangan gerak —
   termasuk bentuk sorotan kata dan ornamennya (pill + bintang milik satu
   proyek tidak boleh muncul lagi di proyek lain).
   Jangan membuka folder proyek lama untuk "contoh" — yang boleh diwarisi
   hanya aturan di skill ini.
5. **Latar tidak default gelap.** Kasus nyata: semua opener keluar gelap
   dengan nebula karena starter dan contoh-contohnya gelap. Latar mengikuti
   tema: gradien terang, warna lembut, blok warna, kertas, foto, atau gelap
   — tabel "Arah gaya" punya delapan pilihan dan hanya dua yang gelap.
   Contoh-contoh di skill ini (kertas terang, nebula) hanya contoh, bukan
   templat yang dikunci. Pergantian latar antar adegan DIPUTUSKAN PER
   SEGMEN di style brief: ganti bila mood/topik segmennya berubah (masuk ke
   produk, dari masalah ke solusi, dari klaim ke CTA), jangan ganti hanya
   demi variasi, dan jangan satu latar karena tidak pernah dipertimbangkan.
   Bila diganti, lakukan di balik wipe/leak/cut supaya tidak terasa "ganti
   slide".
6. **Bebas berekspresi.** Hukum-hukum di sini mengunci STRUKTUR (bukan
   slide), KONTRAS (teks terbaca), dan KEBARUAN (tidak mengulang proyek
   lain) — bukan ekspresi. Gradien kaya, cahaya, 3D, kedalaman, tekstur,
   warna berani dianjurkan bila cocok dengan tema. Yang dilarang hanya
   mengambil default termurah dan mengulanginya: balok datar menyapu, garis
   melintas, latar flat, kulit proyek lain. Kalau dua pilihan sama-sama
   memenuhi hukum, pilih yang lebih berani.
7. **Yang boleh sama di semua pekerjaan:** hukum anti-PPT, rig kamera,
   determinisme, ritme masuk-keluar asimetris, ukuran teks minimum.

### Arah gaya (pilih satu; boleh memadukan dua dengan sadar)

| Arah | Latar | Tipografi | Gerak khas | Cocok untuk |
|---|---|---|---|---|
| Sinematik gelap | gradasi nyaris hitam, partikel/nebula WebGL, bloom hanya di objek | grotesk tebal bersih | push-through, cahaya di depan lensa | alat kreatif, gaming, teknologi |
| Poster color-block | bidang warna solid besar berganti tiap adegan, tanpa gradasi | display sangat tebal, huruf raksasa terpotong tepi | wipe blok, teks menabrak tepi frame | app konsumen, musik, event |
| Editorial terang | putih/krem, ruang kosong luas, garis tipis | serif display + grotesk kecil | geser halus, garis menggambar, kamera tenang | produktivitas, finansial, SaaS |
| Kertas & cetak | tekstur kertas, potongan kolase, stempel, selotip | tulisan tangan + serif | benda terbang lalu mendarat, sudut miring | edukasi, komunitas, kuliner |
| Retro / analog | warna pudar, grain, garis scan, bingkai VHS | geometris 70–90-an | glitch terkendali, zoom kasar, freeze | nostalgia, musik, hiburan |
| Brutalis mono | hitam-putih, grid keras, kotak bergaris | monospace + kondensasi | cut keras, blok bergeser, kursor berkedip | developer tools, teknis |
| Pastel ceria | pastel bertumpuk, bentuk bulat besar | rounded sans tebal | mantul elastis, bentuk mekar | anak, kesehatan, lifestyle |
| Mewah gelap | hitam + emas/perunggu, bayangan lembut, kilau | serif tinggi berspasi lebar | gerak lambat, sinar menyapu, kedalaman | fashion, otomotif, properti |

Dua opener berturut-turut memakai baris tabel yang sama = tanda bahaya;
pilih baris lain atau padukan dua baris dengan cara yang belum dipakai.

## Hukum #4 — Teks hidup, latar tunduk

Dua opener dengan rig yang sama bisa berakhir "perfect" atau "jelek parah"
hanya karena tipografi dan kontrasnya. Yang ditolak: setiap judul KAPITAL
SEMUA bobot 800 di tengah, masuk dengan cara yang sama, di atas ladang cahaya
putih yang lebih terang daripada hurufnya. Yang diterima: sentence case bobot
500, satu kata sorotan yang digambar (di proyek itu berupa pill + bintang —
itu tanda tangannya, bukan aturan), tanda baca pop terpisah, ukuran/arah/
posisi bergantian, latar tenang di bawah teks, latar berganti mengikuti
segmen. Resep lengkap dengan kode: `techniques.md`
bagian 1 dan 1b. Ringkasnya:

- Setiap kalimat: satu kata sorotan, tanda baca terpisah yang muncul
  terakhir, sentence case bobot 500–600. BENTUK sorotan (pill, garis bawah,
  marker, kotak, warna, coret) dipilih di style brief, satu bentuk per
  video, berbeda dari proyek lain; ornamen (bintang dsb.) hanya bila
  diturunkan dari bentuk brand — bukan default. Kapital-tebal hanya untuk
  satu adegan penekanan.
- Dua adegan berturut-turut tidak boleh sama dalam ukuran, arah masuk, dan
  posisi teks.
- Di KANTONG TEKS (bukan seluruh frame), latar harus GELAP (≤ 25 %
  luminance) atau TERANG (≥ 80 %), tidak pernah "ramai sedang". Di luar
  kantong, latar justru harus kaya: gradien, cahaya, tekstur (§7d) — flat
  satu warna ditolak. Elemen latar apa pun (partikel, bentuk,
  tekstur, garis): warna dari sisi gelap palet, opacity ≤ .35 di kantong
  teks, ≤ 40 elemen terang terlihat.
- Pertimbangkan selang-seling gelap–terang bila segmennya memang berganti
  mood; bukan kewajiban mekanis.

## Alur kerja

0. **Kenali jenisnya** (tabel "Jenis pekerjaan"). Explainer → buka
   `references/explainer.md` dan ikuti "Langkah nol" di sana: SATU
   pertanyaan berisi gaya (lima pilihan + rekomendasi), rasio, durasi,
   suara, plus pagar durasi. Jenis lain → lanjut; tanya hanya hal yang
   benar-benar tidak bisa diturunkan dari brief (rasio, durasi, ada
   musik/VO atau tidak), dalam satu pertanyaan.
0b. **Tulis style brief** (Hukum #3) dan tunjukkan bersama rundown. Tanpa
   style brief yang disetujui, jangan menyentuh kode.
1. **Serap referensi & sumber brand.** Minta screenshot/potongan video
   referensi bila ada; petakan per shot (durasi, gerakan, jenis transisi,
   urutan atensi) — hanya RITMENYA, bukan kulitnya (Hukum #3). Warna, logo
   (path vektor ASLI, jangan digambar ulang), font, dan klaim fitur diambil
   dari sumber resmi PRODUK yang sedang dibuat — bukan dari referensi, bukan
   dari proyek lain, bukan karangan.
2. **Tulis rundown adegan** — tabel `detik | adegan | satu kalimat | satu
   visual`. Total 25–40 detik. Minta persetujuan user atas rundown ini
   sebelum menulis kode; merombak rundown murah, merombak kode mahal.
3. **Scaffold arsitektur.** Opener/promo/bumper/typography: salin
   `assets/starter.html` (stage 1920×1080, rig kamera `#world`, scene
   Three.js ber-state, helper timeline) lalu SEGERA ganti token warna, font,
   dan bahasa latarnya sesuai style brief — starter sengaja abu-abu. Explainer: salin starter sesuai gaya —
   `starter-explainer-kartun/-jurnalisme/-katalog/-sketsa.html` (mode
   kolase: kamera into/settle/look/home di atas cutout/foto, say/unsay per
   kata, draw anotasi, push-through antar adegan) atau
   `starter-explainer.html` (aksi kontinu: dunia mengalir, hero, objek
   dunia, view peta, whip). Semua sudah autoplay + loop tanpa player. Struktur multi-file dan
   penjelasan tiap keputusan ada di `references/architecture.md`.
4. **Bangun adegan satu per satu** dengan resep di
   `references/techniques.md` (split per huruf + motion blur berarah,
   push-through kamera, pan 3D per kata, light leak, tile ikon, mockup UI).
5. **Verifikasi VISUAL, bukan cuma "kode jalan".** Kamu tidak bisa menonton
   video; kamu hanya bisa melihat FRAME. Potret 6–20 detik kunci (awal
   tiap adegan, saat teks muncul, transisi) dengan `scripts/snap.mjs`
   (puppeteer, buka `file://`, tanpa server), susun jadi lembar kontak, dan
   nilai seperti sutradara: teks kepotong? tumpang tindih? teks muncul
   sebelum kamera selesai? masih terasa slide? Perbaiki, potret lagi.
   JANGAN merender semua frame untuk mengecek — itu ribuan gambar dan bukan
   verifikasi; render penuh hanya untuk export MP4 (langkah 6) bila user
   memintanya. Tanpa Node: buka `?debug=1`, scrub manual, screenshot.
6. **Serahkan sebagai SATU `index.html` yang bisa diklik dua kali.** Output
   akhir tidak boleh butuh server/Node: CSS dan JS ditulis INLINE di dalam
   berkas (module lokal `<script type="module" src="…">` diblokir CORS saat
   dibuka lewat `file://`, module inline tidak), library dari CDN, aset
   (ikon/gambar) relatif di folder yang sama. Server no-cache
   (`scripts/serve.py`) hanya alat KERJA saat mengedit, bukan syarat
   menonton. Tanpa player di layar (lihat "Player"); sebutkan `?debug=1`
   untuk scrub. **Export MP4 hanya bila user memintanya**: `scripts/
   export-frames.mjs` merender tiap frame (60 fps) ke PNG lalu ffmpeg
   menggabungkannya — cara ini bebas frame drop, tapi mahal, jadi bukan
   langkah rutin dan bukan alat pengecekan.

7. **Khusus explainer: naskah VO + ajakan merekam** — pesan penutup wajib
   memuat naskah VO lengkap dan meminta user merekam/generate lalu mengirim
   ulang audionya untuk disinkronkan. Detail bentuk naskah, petunjuk rekam,
   dan retime di `references/explainer.md` → "Penyerahan".

## Checklist sebelum menyerahkan

- [ ] Style brief (tema, palet dari brand, font display berkarakter, satu
      bahasa latar, tanda tangan gerak, momen istimewa) ditulis dan disetujui
      SEBELUM kode
- [ ] Tidak ada sisa placeholder starter (abu-abu, font sistem, nebula bila
      arah gayanya lain) dan tidak ada kulit referensi yang disalin (palet,
      font, tekstur, tata letak, kalimat)
- [ ] Berbeda dari opener/promo sebelumnya: minimal tiga dari palet, font,
      bahasa latar, tanda tangan gerak
- [ ] Teks hidup (Hukum #4): sentence case bobot 500–600, satu kata sorotan
      per kalimat dengan BENTUK yang dipilih di style brief (bukan pill +
      bintang warisan proyek lain), tanda baca pop terpisah, ukuran/arah/
      posisi bergantian antar adegan; kapital-tebal hanya di satu adegan
- [ ] Latar tunduk (Hukum #4): di bawah teks luminance ≤ 25 % atau ≥ 80 %,
      elemen latar redup dan berwarna gelap di kantong teks; uji grayscale —
      tidak ada latar seterang huruf
- [ ] Transisi: minimal dua jenis dari menu §4c, minimal satu berkedalaman
      (3D/perspektif); tidak ada balok/persegi/garis datar menyapu penuh
      frame; wipe ≤ 2 kali dan hanya dengan objek bermakna berketebalan
- [ ] Permukaan latar dari menu §7d: ≥ 2 lapis (dasar + cahaya/tekstur/
      blob), warna dari palet — tidak flat satu warna, bukan hitam/putih murni
- [ ] Gerak latar dipilih dari menu §7c dan BERBEDA dari proyek sebelumnya;
      tidak ada batang/garis melintas ke samping kecuali tema kecepatan/
      aliran dan belum dipakai di proyek sebelumnya
- [ ] Lolos 6 poin "Larangan struktural" (bukan section yang di-fade, ada
      benang merah visual, ≤ 2 tingkat teks, gerak tiap detik, transisi
      bervariasi, starter yang benar)
- [ ] Tanpa player di layar; autoplay; loop; `?debug=1` untuk scrub
- [ ] Tiap adegan: ≤1 kalimat, ≤1 objek visual, tanpa sub-teks/badge
- [ ] Ada gerakan kamera di TIAP perpindahan segmen (push-through / pan),
      dan yang di-zoom itu seluruh dunia (latar ikut), bukan teks saja
- [ ] Motion blur berarah pada semua teks masuk/keluar
- [ ] Latar lahir dari tema (tidak otomatis gelap; terang bisa gradien,
      warna lembut, blok warna, kertas), punya kedalaman (bukan satu warna
      flat), TIDAK lebih ramai daripada subjek; pergantian latar diputuskan
      per segmen di style brief dan, bila ada, terjadi di balik wipe/cut
- [ ] Glow dipakai pada objek (tile, bar, ikon dekor) — judul teks BERSIH
      (putih penuh + drop shadow tipis), kecuali user minta sebaliknya
- [ ] Font display ≠ font mockup UI; mockup memakai font produk aslinya
- [ ] Nol pemakaian `Date.now()` / `Math.random()` di jalur render
- [ ] Sudah dipotret di detik kunci (snap.mjs / ?debug=1) dan dilihat dengan
      mata — bukan render penuh; MP4 hanya bila diminta
- [ ] Ada suara? Sertakan `buka.cmd` (flag autoplay) dan halaman menahan di
      frame awal bila autoplay diblokir — tidak pernah mulai tanpa suara
- [ ] Explainer: kamera punya koreografi (close-up → meluncur → zoom out),
      bukan hanya elemen in/out — lihat explainer.md "Kamera explainer"
- [ ] Explainer: pesan penutup memuat naskah VO lengkap + ajakan merekam /
      generate sendiri dan mengirim ulang audionya untuk disinkronkan;
      `vo-script.md` tersimpan di folder proyek
- [ ] Explainer: gaya, rasio, durasi, dan suara sudah ditanya dalam SATU
      pertanyaan (kecuali yang sudah disebut user) sebelum menulis kode;
      durasi ≤ 90 dtk kecuali diminta, adegan ≈ durasi ÷ 6
- [ ] Rasio default 16:9 / mengikuti layar; 9:16 hanya bila diminta. Tanpa
      subtitle/caption kecuali diminta. Tata letak referensi (panel, subtitle)
      tidak disalin — hanya prinsipnya
- [ ] Explainer topik aksi/kecepatan: satu subjek hadir dari awal sampai
      akhir, latar terus mengalir, angka hidup di dalam dunia (subjek
      melintas di depannya) — lihat explainer.md "Gaya kelima: aksi kontinu"
- [ ] Sudut pandang berganti: tidak ada tiga adegan berturut-turut dengan
      sudut yang sama; tiap fakta dapat instrumennya (speedometer, peta,
      profil ketinggian, balapan peta, interior, tampak depan) — lihat
      explainer.md "Sudut pandang WAJIB berganti"; kamera bernapas
- [ ] Tidak ada teks di bawah 30 px pada panggung 1080 (body ≥ 44, label ≥ 34,
      kredit ≥ 30) — ditonton di HP; teks hantu & anotasi bervariasi, bukan
      selalu outline / lingkaran putus-putus
- [ ] Explainer: tiap orang/perusahaan/tempat/produk yang DISEBUT tampil
      fotonya di adegan itu (lihat explainer.md → "Entitas yang disebut")
- [ ] `index.html` terbuka langsung lewat `file://` (klik dua kali) tanpa
      server — CSS/JS inline, tidak ada `src` module lokal
- [ ] Angka yang berubah tiap frame (jam, counter) memakai
      `font-variant-numeric:tabular-nums` + `min-width` supaya wadahnya
      tidak berubah lebar

## Jebakan yang sudah memakan korban

Detail dan perbaikannya di `references/techniques.md` bagian "Jebakan":
bloom threshold rendah → layar putih; nebula additive → menumpuk lewat bloom;
selector CSS lebih spesifik mengalahkan state awal `opacity:0` → elemen
muncul mendahului animasinya; module JS di-cache browser → edit "tidak
ngefek" (pakai server `Cache-Control: no-store`); objek 3D pipih diputar
penuh di sumbu Y → jadi sebatang garis (goyangkan, jangan putar penuh);
kotak filter SVG default memotong ekor blur (lebarkan `x/y/width/height`).

## Isi paket

| Berkas | Kapan dibaca |
|---|---|
| `references/anti-ppt.md` | sebelum mendesain adegan |
| `references/explainer.md` | bila yang diminta explainer/video penjelasan (kartun+VO, jurnalisme visual foto, katalog putih, sketsa vintage, atau aksi kontinu; default 16:9, 9:16 hanya bila diminta) |
| `references/architecture.md` | saat scaffold / butuh alasan di balik struktur |
| `references/techniques.md` | saat membangun adegan & efek |
| `references/roadmap.md` | saat mengembangkan skill ini lebih lanjut |
| `assets/starter.html` | titik awal OPENER/promo — salin, jangan tulis dari nol |
| `assets/starter-explainer.html` | EXPLAINER gaya aksi kontinu (vektor): mode aliran (strip + hero + objek dunia) + view peta + whip + contoh mode kolase |
| `assets/starter-explainer-kartun.html` | EXPLAINER kartun kolase: kertas krem + grain + noda, cutout ilustrasi, Bricolage + Caveat, pill warna |
| `assets/starter-explainer-jurnalisme.html` | EXPLAINER jurnalisme visual: hitam + grain, foto asli + tag sumber, Barlow Condensed + Plex Mono, highlighter kuning/merah, anotasi putus |
| `assets/starter-explainer-katalog.html` | EXPLAINER katalog putih: grid samar, cutout foto, Archivo Black + Caveat + Inter, highlighter kuning |
| `assets/starter-explainer-sketsa.html` | EXPLAINER sketsa vintage: kertas sepia (tekstur CSS), cutout ukiran multiply, Playfair + Garamond + Cinzel, karat & emas |
| `scripts/serve.py` | dev server no-cache (opsional, butuh Python; hanya bila memakai module lokal) |
| `scripts/snap.mjs` | VERIFIKASI: potret detik kunci → lembar kontak (opsional, butuh Node + puppeteer) |
| `scripts/vo-pauses.html` | deteksi jeda VO di browser (pengganti ffmpeg silencedetect, tanpa instal) |
| `scripts/export-frames.mjs` | EXPORT: render semua frame → MP4, hanya bila diminta (opsional, butuh Node + puppeteer + ffmpeg) |
