# Changelog

Belum dirilis di GitHub — semua perubahan di bawah ini terkumpul dalam 1.0.0.

## 1.0.0 — 2026-09-06 (prarilis, dalam pengembangan)

Skill motion graphic umum untuk agen AI apa pun (format Agent Skills terbuka): opener/promo, bumper/ident, intro/outro, kinetic typography, title/lower third, explainer. Diuji "dingin" (sesi baru tanpa memori) dan dengan agen lain.

**Prinsip & aturan**
- Hukum #1 anti-slide, Hukum #2 deterministik, Hukum #3 gaya lahir dari tema (style brief wajib, tabel delapan arah gaya, referensi hanya menyumbang ritme, proyek berbeda harus berbeda di ≥ 3 dari palet/font/latar/gerak — termasuk bentuk sorotan dan ornamen), Hukum #4 teks hidup & latar tunduk.
- Larangan struktural yang bisa diperiksa dari kode (bukan section yang di-fade, ada benang merah visual, ≤ 2 tingkat teks, gerak tiap detik, transisi bervariasi, starter yang benar).
- Transisi dari menu (`techniques.md` §4c) dengan minimal satu berkedalaman 3D; balok/persegi datar menyapu ditolak. Permukaan latar dari menu §7d (gradien/cahaya/tekstur ≥ 2 lapis), flat ditolak. Hukum #3 poin 6 "Bebas berekspresi".
- Gerak latar dipilih dari menu (`techniques.md` §7c), bukan otomatis "benda melintas ke samping"; aliran horizontal hanya untuk tema kecepatan/aliran dan tidak dua proyek berturut.
- Latar tidak default gelap: dari tema (gradien terang, warna lembut, blok warna, kertas, foto, atau gelap); pergantian latar diputuskan per segmen di style brief, bila ada terjadi di balik cut/wipe.
- Tipografi: sentence case bobot 500–600, satu kata sorotan per kalimat dengan bentuk yang dipilih per proyek (pill/garis bawah/marker/kotak/warna/coret; ornamen tidak default), tanda baca pop terpisah, ukuran/arah/posisi bergantian; kontras latar terukur (kantong teks, luminance, batas partikel, uji grayscale).
- Sudut pandang wajib berganti (katalog instrumen: speedometer, peta simulasi, profil ketinggian, balapan peta, interior, tampak depan) + kamera bernapas.
- Default deliverable: 16:9, tanpa caption, tanpa player, autoplay + loop; `?debug=1` panel scrub, `?clean=1` export.
- Explainer: satu pertanyaan sebelum mulai (gaya, rasio, durasi, suara), pagar durasi ≤ 90 dtk, penyerahan memuat naskah VO + ajakan merekam, retime ke audio.

**Isi paket**
- Starter opener (arsitektur, bukan gaya: token abu-abu placeholder, semua warna WebGL dari token CSS, blok STYLE BRIEF, contoh pergantian latar gelap → terang) dan lima starter explainer (kartun kolase, jurnalisme visual, katalog putih, sketsa vintage, aksi kontinu).
- `scripts/snap.mjs` (verifikasi frame kunci), `scripts/export-frames.mjs` (MP4 bila diminta), `scripts/vo-pauses.html` (deteksi jeda VO tanpa ffmpeg), `scripts/serve.py` (opsional).
- Jebakan terdokumentasi: `tl.pause(t)` menekan callback; `visibility` anak SVG menembus induk; transform SVG via atribut; panggung dipusatkan dengan translate; latar WebGL dengan warna hardcode membawa kulit produk lama.
