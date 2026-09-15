# Anti-PPT — hukum desain adegan

Dokumen ini adalah alasan skill ini ada. Semua isinya lahir dari revisi
seorang kreator video terhadap hasil pertama yang "secara teknis benar"
tapi ditolak mentah-mentah dengan kalimat: *"ini masih terkesan seperti presentasi ppt ."*

## Kenapa model selalu jatuh ke pola slide

Model dilatih menyusun INFORMASI: judul → penjelas → bukti pendukung.
Struktur itu bagus untuk dokumen, dan fatal untuk motion graphic.
Video promosi tidak menjelaskan — ia **menyatakan**, satu pukulan per shot,
dan membiarkan gerakan + musik yang membawa emosinya. Kalau kamu merasa
sebuah adegan "kurang informasi", itu justru tanda adegannya sudah benar.

## Tabel pelanggaran → perbaikan (kasus nyata)

| Pelanggaran (ditolak) | Perbaikan (diterima) |
|---|---|
| Kicker "02 — FITUR" + judul 2 baris + body copy 2 baris + 4 chip badge, layout kolom kiri-kanan | Satu kalimat ≤ 5 kata di tengah-atas + satu objek produk naik ke tengah |
| Tiga baris teks besar berisi tiga klaim "TANPA …" | Headline 2 kata + tiga tile ikon berlabel 1-2 kata |
| Opener produk B memakai kulit opener produk A (palet, glow, nebula, font yang sama) karena diambil dari starter/proyek lama | Gaya diturunkan dari brand B lewat style brief: palet dari logo/ikon B, font berkarakter lain, bahasa latar lain, tanda tangan gerak lain (SKILL.md Hukum #3) |
| Semua judul KAPITAL SEMUA, font lebar bobot 800, selalu di tengah, masuk dengan stagger huruf yang sama — "teks terlalu kaku" | Sentence case bobot 500, satu kata sorotan dalam pill + sparkle, tanda baca pop terpisah, ukuran/arah/posisi bergantian (techniques.md §1) |
| Ladang 96 batang cahaya putih ber-bloom di belakang judul — "background ngga jelas, ngga kontras" | Kantong gelap di bawah teks, partikel berwarna sisi gelap palet dan redup, ≤ 40 elemen terang, bloom hanya di objek (techniques.md §1b) |
| Semua opener gelap dengan nebula/partikel, latar tidak pernah dipertimbangkan per segmen | Latar dari tema (gradien terang, warna lembut, blok warna, kertas, foto, atau gelap); pergantian diputuskan per segmen di style brief dan terjadi di balik cut/wipe (techniques.md §7b) |
| Setiap proyek memakai sorotan pill + bintang yang sama persis (warisan satu proyek yang pernah diterima) | Aturannya hanya "satu kata sorotan"; bentuknya (pill/garis/marker/kotak/warna/coret) dipilih per proyek di style brief, ornamen hanya dari bentuk brand (techniques.md §1) |
| Dua opener untuk produk berbeda sama-sama berlatar batang/potongan cahaya melesat ke samping ("lane" / "range") — hasil aturan "objek melintas tiap detik" | Gerak latar dipilih dari menu techniques.md §7c (gradien berpindah, blob, grain hidup, sapuan cahaya, bentuk berputar, partikel naik, grid bernapas…) dan berbeda dari proyek sebelumnya; aliran horizontal hanya untuk tema kecepatan/aliran |
| Transisi: balok/persegi warna datar raksasa menyapu miring di setiap cut ("kotak persegi aneh"), atau garis tipis menyapu | Menu transisi techniques.md §4c: push-through 3D, kartu berputar dari kedalaman, objek berketebalan melewati lensa, mask bentuk brand, sapuan cahaya; minimal dua jenis, satu berkedalaman, wipe ≤ 2 |
| Latar flat satu warna (gelap atau terang) dari awal sampai akhir | Permukaan latar ≥ 2 lapis dari menu §7d: glow horizon, duotone diagonal, mesh blob, spotlight + tint, langit berlapis, tekstur — warna dari palet |
| Menyalin palet, font, dan tata letak video referensi yang disodorkan user | Ambil ritme dan energinya saja; kulit lahir dari tema produk — katakan itu ke user satu kalimat |
| Menampilkan `com.example.app` (nama package) di adegan CTA | Dihapus. User tidak peduli; kalau perlu, cukup baris hasil pencarian store |
| Teks in/out dengan kamera statis | Push-through: kamera dorong masuk ke teks lama → cut → tarik mundur dari teks baru |
| Glow tebal 4 lapis di semua judul | Judul putih bersih + drop shadow tipis; glow disimpan untuk OBJEK (tile, input, ornamen) |
| Latar warp 520 garis putih panjang | 300 partikel pendek berwarna gelap senada — latar tidak boleh bersaing dengan subjek |
| Latar biru merata (flat) | Gradasi vertikal tegas: nyaris hitam di atas, menyala di horizon bawah |
| Elemen UI (badge status) muncul mendahului kalimat utamanya | Urutan atensi: kalimat → objek utama → detail pendukung |
| Zoom push-through dipakai di SEMUA transisi | Perpustakaan gerakan: spin, yaw 3D, roll, elemen terbang melewati lensa; zoom hanya saat termotivasi (mis. menyelam ke layar mockup). "Satu jenis transisi di semua cut" = template transisi PPT, cuma versi mahal |
| Whip-pan translasi — tepi panggung tersingkap jadi gap hitam | Terbaca "pindah halaman". Jangan pernah menggeser dunia sampai tepinya terlihat |
| Spin/yaw/roll kejut (zoom+putar tiba-tiba dengan blur di tiap cut) | Ditolak: "kaya editan CapCut". Itu bahasa PRESET editor video, bukan motion design. Ganti: kamera bernapas + koreografi elemen beririsan + object wipe |

## Pola gagal yang dihasilkan model lain dengan skill ini (5 Sep 2026)

Explainer sejarah 30 dtk, 6 adegan, dinilai "kaya PPT" oleh user. Kodenya:

| Yang dibuat | Kenapa PPT | Yang seharusnya |
|---|---|---|
| 6 × `<section class="scene">` berisi foto full-bleed, dinyalakan `autoAlpha` bergantian | Ganti section = ganti slide, apa pun transisinya | Satu dunia yang mengalir; adegan berganti karena kamera/dunia bergerak atau whip ke sudut lain |
| Tiap section: eyebrow (kicker) + judul 2 baris + kredit | Tiga tingkat teks = layout slide | Satu angka/kalimat besar + satu label yang hidup di dunia |
| Gerak hanya Ken Burns foto 1.08 → 1.015 dan scale bump `#world` 1.12 → .96 di tiap cut | Gerak yang sama di semua cut = template | Parallax, objek melintas, whip, instrumen (peta/profil/speedometer), kamera bernapas beda per momen |
| Light leak di setiap cut | Preset editor video | Simpan untuk satu momen istimewa |
| Tidak ada subjek yang bertahan antar adegan | Tidak ada yang "dibawa" penonton | Hero hadir > 60 % durasi |

Pelajaran: hukum naratif saja tidak cukup untuk model yang tidak pernah
ditegur user; perlu larangan struktural yang bisa diperiksa dari kode
(SKILL.md → "Larangan struktural") dan starter yang memaksa rig yang benar
(`assets/starter-explainer.html`).

## Prinsip yang bisa dibawa ke proyek mana pun

1. **Satu shot = satu pernyataan.** Kalimat ≤ 5 kata lebih kuat daripada
   kalimat lengkap. "Dua kata. Satu pukulan." mengalahkan "Aplikasi ini
   bisa melakukan X, Y, dan Z untuk kamu".
2. **Hierarki atensi per adegan:** kalimat dulu, objek utama menyusul,
   detail paling akhir — jangan pernah terbalik.
3. **Teks panjang adalah bug.** Kalau sebuah klaim butuh > 6 kata,
   pecah jadi dua adegan atau ubah jadi visual (ikon, angka, mockup).
4. **Metadata bukan konten.** Nama package, URL panjang, versi, footnote —
   buang. Penonton awam tidak membacanya, penonton teknis tidak membutuhkannya.
5. **Mockup UI adalah pengecualian teks banyak** — layar aplikasi boleh penuh
   teks kecil karena ia dibaca sebagai GAMBAR, bukan sebagai teks. Justru
   itu: mockup harus setia pada aplikasi aslinya (font, warna, layout).
6. **Gerakan adalah kalimatnya juga.** Zoom masuk = penekanan; pan menyusur =
   pengungkapan bertahap; pull-back = reveal; bounce kecil = playful.
   Pilih gerakan yang searti dengan kalimatnya, jangan acak.
7. **Transisi ala motion designer, bukan preset editor.** Dua kegagalan
   berturut-turut mengajarkan urutannya: whip translasi menyingkap tepi
   ("pindah halaman"); spin/yaw kejut terbaca "efek CapCut". Yang benar:
   (a) kamera BERNAPAS — drift zoom pelan tanpa henti, tak pernah
   menyentak; (b) perpindahan dikerjakan KOREOGRAFI ELEMEN yang keluar-
   masuk beririsan waktu; (c) OBJECT WIPE — sebuah elemen/ornamen menyapu
   dekat lensa menutup frame, adegan berganti di baliknya; (d) zoom cepat
   hanya bila TERMOTIVASI (menyelam ke layar mockup). Efek kejut apa pun
   (zoom/putar tiba-tiba + blur di tiap cut) adalah tanda bahaya.
8. **Kamera adalah pemersatu.** Sekali kamu punya rig kamera yang menggerakkan
   seluruh dunia, adegan-adegan terpisah terasa satu film. Tanpa itu,
   berapapun polesan per adegan, hasilnya tetap deck yang di-autoplay.
9. **Ritme keluar-masuk asimetris.** Masuk pelan-tegas (0.7–1.3 detik,
   `power4.out`), keluar cepat (0.35–0.55 detik, `power2.in`). Simetris
   terasa mekanis.
10. **Pilih 1–2 momen istimewa.** Efek paling mahal (pan 3D per kata, logo
   build-on) dipakai sekali-dua kali saja. Dipakai di semua tempat,
   berhenti terasa istimewa.
11. **Kalau ragu, gelapkan latarnya dan besarkan teksnya.** Kontras adalah
    produksi termurah yang paling sering dilupakan.

## Kalibrasi rasa (heuristik cepat)

Screenshot sebuah frame lalu tanya:

- Bisakah frame ini jadi slide korporat tanpa diubah? → gagal, rombak.
- Apakah mataku tahu harus melihat ke mana dalam 0,2 detik? → kalau tidak,
  kurangi elemen.
- Kalau semua teks disembunyikan, apakah latarnya masih menarik tapi tidak
  berisik? → keduanya harus ya.
- Apakah ada sesuatu yang BERGERAK karena kamera, bukan karena elemen
  menganimasikan dirinya sendiri? → harus ya di tiap transisi.
