# Teknik — resep efek yang sudah teruji

Semua resep dinyatakan generik; angka adalah titik awal yang terbukti enak,
bukan hukum. Font, warna, dan konten selalu milik brand user.

## Daftar isi

1. Tipografi hidup (split per huruf, pill sorotan, arah bergantian) + 1b. Kontras latar
2. Motion blur berarah (pembeda utama dari "web animation")
3. Kamera: push-through antar segmen
4. Kamera: pan 3D menyusur kalimat per kata
4b. Transisi antar adegan — hierarki yang benar
5. Light leak transisi
6. Glow yang benar (dan kapan tidak)
7. Latar Three.js: nebula, debu, grid, ornamen 3D, bloom
8. Tile ikon & mockup UI
9. Ketikan / angka hidup yang deterministik
10. Jebakan (bug yang pernah terjadi)

---

## 1. Tipografi hidup — resep dari opener yang DITERIMA vs yang DITOLAK

Kasus nyata (6 Sep 2026). Opener A ditolak: "teks terlalu kaku". Setiap
judulnya KAPITAL SEMUA, satu font lebar bobot 800, selalu di tengah, masuk
dengan stagger huruf yang sama, tanpa kata sorotan, tanpa variasi ukuran.
Opener B disebut "perfect": kalimat sentence case bobot 500, SATU kata kunci
per kalimat di dalam pill yang mengembang dari kiri + sparkle, tanda baca
muncul terpisah setelahnya, ukuran dan arah masuk bergantian tiap adegan,
sebagian kalimat diletakkan di dekat objeknya (bukan selalu di tengah), dan
adegan gelap bergantian dengan adegan terang. Resep B:

> **Peringatan bentuk.** Di opener B, sorotannya berupa pill biru yang
> mengembang dari kiri dengan bintang kecil (sparkle) di sudutnya. Itu
> TANDA TANGAN proyek itu, bukan aturan. Yang jadi aturan hanya: satu kata
> sorotan per kalimat. BENTUK sorotan dipilih di style brief dan konsisten
> dalam satu video; ORNAMEN (bintang, titik, garis kilat) opsional dan
> diturunkan dari bentuk brand/tema — kalau tidak ada alasan, tanpa ornamen.
> Dua proyek berbeda dengan pill + bintang yang sama = menyalin kulit.

**Menu bentuk sorotan** (pilih satu per video):

| Varian | Rasa | Cocok untuk |
|---|---|---|
| `pill` — blok warna mengembang dari kiri | tegas, produk digital | app, SaaS, tech |
| `under` — garis bawah tebal menggambar dari kiri | editorial, tenang | finansial, produktivitas, jurnalistik |
| `marker` — coretan stabilo miring, sedikit transparan | hangat, manusiawi | edukasi, komunitas, kuliner |
| `box` — kotak garis tipis menggambar keliling | teknis, presisi | developer tools, hardware |
| `color` — hanya warna kata berubah, tanpa bidang | mewah, minimal | fashion, properti, otomotif |
| `strike` — garis coret lalu kata pengganti muncul | ironis, sebelum/sesudah | promo "bukan X, tapi Y" |

**CSS**
```css
.line{font-size:112px;font-weight:500;letter-spacing:-.015em;color:#fff;white-space:nowrap;
  text-shadow:0 4px 28px rgba(0,0,0,.5);line-height:1.1;opacity:0}
.line.sm{font-size:74px}.line.md{font-size:92px}.line.lg{font-size:128px}
.line.xl{font-size:150px;font-weight:600;letter-spacing:-.02em}
.line.ink{color:var(--ink-dark);text-shadow:none}          /* versi untuk adegan terang */
.wd{display:inline-block;white-space:nowrap}
.ch{display:inline-block;will-change:transform,opacity,filter;opacity:0}
.txt2{display:inline-block;opacity:0}                        /* tanda baca: pop terpisah */
/* kata sorotan: .hl + satu varian bentuk; <i> adalah bidang/garis yang digambar */
.hl{position:relative;display:inline-block}
.hl i{position:absolute;transform:scaleX(0);transform-origin:0 50%}
.hl-t{position:relative;opacity:0}
.hl.pill{padding:.02em .24em .04em;border-radius:.26em}
.hl.pill i{inset:0;border-radius:inherit;background:linear-gradient(95deg,color-mix(in srgb,var(--accent) 70%,#000),var(--accent) 60%,var(--accent-lit))}
.hl.pill .hl-t{color:#fff}
.hl.under i{left:0;right:0;bottom:-.04em;height:.14em;border-radius:.07em;background:var(--accent)}
.hl.marker i{left:-.1em;right:-.1em;top:.5em;bottom:-.02em;background:var(--accent);opacity:.55;transform:scaleX(0) rotate(-1.5deg)}
.hl.box i{inset:-.06em -.14em;border:.04em solid var(--accent);border-radius:.12em;background:none}
.hl.color .hl-t{color:var(--accent)}      /* tanpa <i> */
/* ornamen OPSIONAL — hanya bila bentuk brand memintanya; ganti path dengan bentuk brand */
.hl-orn{position:absolute;width:.46em;height:.46em;right:-.22em;top:-.24em;fill:var(--accent-lit);opacity:0}
```

**Markup** — hanya `.txt` yang di-split per huruf; sorotan dan tanda baca
punya tween sendiri (contoh varian `under`, tanpa ornamen):
```html
<h1 class="line md"><span class="txt">Capek ngetik</span>&nbsp;<span class="hl under" id="hl-a"><i></i><span class="hl-t">caption</span></span>&nbsp;<span class="txt">satu-satu</span><span class="txt2">?</span></h1>
```

**JS** — empat pintu masuk/keluar + pill + tanda baca:
```js
const inUp  =(ch,el,at,{dur=.8,st=.024}={})=>{tl.fromTo(ch,{opacity:0,yPercent:60,scaleY:1.45},{opacity:1,yPercent:0,scaleY:1,duration:dur,ease:'power4.out',stagger:st,immediateRender:false},at);blurTween(tl,el,at,30,0,dur,VERT);};
const inLeft=(ch,el,at,{dur=.75,st=.02}={})=>{tl.fromTo(ch,{opacity:0,xPercent:-45},{opacity:1,xPercent:0,duration:dur,ease:'power4.out',stagger:st,immediateRender:false},at);blurTween(tl,el,at,50,0,dur,{ease:'power4.out'});};
const outUp =(ch,el,at,{dur=.4,st=.01}={})=>{tl.to(ch,{opacity:0,yPercent:-70,duration:dur,ease:'power2.in',stagger:st},at);blurTween(tl,el,at,0,45,dur+.1,{ease:'power2.in',...VERT});};
const outLeft=(ch,el,at,{dur=.4,st=.01}={})=>{tl.to(ch,{opacity:0,xPercent:-60,duration:dur,ease:'power2.in',stagger:st},at);blurTween(tl,el,at,0,55,dur+.1,{ease:'power2.in'});};
/* mark(): menggambar bidang/garis sorotan apa pun varian bentuknya, lalu memunculkan katanya; ornamen hanya bila ada */
const mark=(hl,at)=>{const i=$('i',hl);if(i)tl.fromTo(i,{scaleX:0},{scaleX:1,duration:.5,ease:'power3.out',immediateRender:false},at);
  tl.fromTo($('.hl-t',hl),{opacity:0,yPercent:60},{opacity:1,yPercent:0,duration:.7,ease:'power4.out',immediateRender:false},at);
  const orn=$('.hl-orn',hl);if(orn)tl.fromTo(orn,{opacity:0,scale:.2,rotate:-40},{opacity:1,scale:1,rotate:0,duration:.5,ease:'back.out(2)',immediateRender:false},at+.22);};
const popDot=(el,at)=>tl.fromTo(el,{opacity:0,yPercent:60},{opacity:1,yPercent:0,duration:.5,ease:'power4.out',immediateRender:false},at);
```
Urutan satu kalimat: `inUp(ch)` → 0,4–0,6 dtk kemudian `mark(hl)` → `popDot(txt2)`
0,25 dtk setelahnya. Kata sorotan adalah klaim utamanya; sisanya pengantar.

**Aturan keras tipografi (dari penolakan A):**
1. Sentence case, bobot 500–600. KAPITAL SEMUA + bobot 800 + font lebar
   hanya untuk SATU adegan penekanan, bukan semua.
2. Setiap kalimat punya satu kata sorotan; BENTUKNYA dari menu di atas,
   dipilih di style brief, satu bentuk per video, berbeda dari proyek
   sebelumnya. Ornamen tidak default. Kalimat tanpa sorotan hanya boleh
   untuk kalimat pendek ≤ 3 kata.
3. Dua adegan berturut-turut tidak boleh sama dalam: ukuran (sm/md/lg/xl),
   arah masuk (inUp/inLeft), posisi (tengah / dekat objek / kiri-atas).
4. Kalimat panjang dipecah dua baris dengan bobot berbeda (500 lalu 600),
   atau baris kedua jadi `.txt2` yang pop menyusul.
5. Tanda baca (? . !) selalu elemen terpisah yang muncul terakhir — itu
   "ketukan" kalimatnya.
6. Teks yang menempel pada objek (mockup, kartu) diposisikan di sisinya
   (`.pos` + left/top), bukan dipaksa ke tengah di atas objek.

## 1b. Kontras: latar tunduk pada teks

Kasus nyata yang sama: 96 batang cahaya putih dengan bloom aditif lebih
terang daripada judulnya → huruf putih kehilangan tepi ("background ngga
jelas, ngga kontras"). Aturan yang bisa diukur:
- **Kantong teks**: di area teks, luminance latar ≤ 25 % (gelap) untuk
  teks putih, atau ≥ 80 % (terang) untuk teks ink. Bila latar ramai,
  letakkan `.pocket` (radial-gradient gelap 55 % → transparan) di bawah
  teks dan nyalakan bersama teksnya.
- **Elemen latar apa pun (partikel, bentuk, tekstur, garis)**: warna diambil dari palet sisi GELAP (bukan
  putih), opacity ≤ .35 di dalam kantong teks, jumlah elemen terang yang
  terlihat ≤ 40, ukuran kecil. Bloom threshold tinggi (≥ .55) dan hanya
  untuk objek — bukan lapisan latar.
- **Uji cepat**: potret frame saat judul penuh, ubah ke grayscale; kalau
  ada bagian latar seterang huruf, latar terlalu ramai. Kalau semua teks
  disembunyikan latar harus terasa TENANG, bukan "menarik".
- **Irama gelap–terang**: selang-seling adegan gelap dan terang (mis. kartu
  "kertas" terang dengan teks ink) — kontras antar adegan lebih kuat
  daripada efek apa pun di dalam adegan.

## 2. Motion blur berarah — `feGaussianBlur` SVG

`filter: blur()` CSS mengabur ke segala arah → terlihat "tidak fokus".
Motion blur AE mengabur SEARAH gerak. `feGaussianBlur` menerima
`stdDeviation="x y"` terpisah:

```js
// buat <filter> sekali per tween, lebarkan kotaknya (default memotong ekor)
f.setAttribute('x','-70%'); f.setAttribute('y','-70%');
f.setAttribute('width','240%'); f.setAttribute('height','240%');
// tween nilai 30→0 saat masuk, 0→50 saat keluar; sumbu ikut arah gerak
blur.setAttribute('stdDeviation', `${v} ${v*0.08}`);   // gerak horizontal
```

Pasang filter saat tween mulai, LEPAS saat selesai (`filter:'none'`) —
elemen yang terus memakai filter SVG dirasterisasi ulang tiap frame, mahal.

## 3. Kamera: push-through antar segmen

Transisi paling penting. Tiga langkah pada rig `#world` (dunia utuh):

```js
const camThrough = (atCut, {push=2.0, from=1.5, inDur=.5, outDur=.95,
                            oOut='50% 50%', oIn='50% 50%'} = {}) => {
  tl.set(rig, {transformOrigin:oOut}, atCut-inDur);
  tl.to (rig, {scale:push, duration:inDur, ease:'power2.in'}, atCut-inDur);
  tl.set(rig, {transformOrigin:oIn, scale:from}, atCut);
  tl.to (rig, {scale:1, duration:outDur, ease:'power3.out'}, atCut);
};
```

- Dorong MASUK ke teks yang pergi (`power2.in` = makin cepat), cut,
  tarik MUNDUR dari teks baru yang lahir oversized (`power3.out`).
- Lompatan scale di titik cut TIDAK terlihat karena terjadi saat frame
  kosong / tertutup light leak — sengaja, ini teknik filmnya.
- `transformOrigin` menunjuk POSISI TEKS (tengah untuk hero; ~'50% 22%'
  untuk adegan yang teksnya di atas) — zoom harus menuju subjek.
- Sinkron dengan kamera WebGL (`camZ`) menambah kedalaman, tapi rig DOM
  yang membawa perasaan "kamera".

## 4. Pan 3D menyusur kalimat

Untuk 1 (maks 2) segmen istimewa: satu kalimat LEBIH LEBAR dari frame,
kamera menyusurinya, tiap kata bangun saat dilewati.

```js
// x menaruh pivot di tengah frame; xPercent (relatif lebar kalimat)
// membawa kamera — bebas dari lebar font aktual
tl.set(line, {x:W/2, xPercent:-6, rotateY:10});          // parent: perspective
tl.to (line, {xPercent:-94, duration:2.9, ease:'power1.inOut'});
tl.to (line, {rotateY:-10,  duration:2.9, ease:'power1.inOut'});
// kata: dim → terang saat kamera lewat
tl.fromTo(words, {opacity:.2, yPercent:16, scale:.96},
  {opacity:1, yPercent:0, scale:1, duration:.55, ease:'power2.out',
   stagger: panDur/(nKata-1) * 0.95});
```

Kunci rasanya: kata di DEPAN kamera redup (~20%) menunggu, kata yang sudah
dilewati tetap terang; `rotateY` berayun (bukan statis) supaya terasa dolly
melengkung; kamera WebGL ikut geser `camX` searah untuk paralaks latar.

## 4b. Transisi antar adegan — hierarki yang benar

Dua generasi transisi ditolak user sebelum ketemu yang benar:
whip translasi ("gap hitam, pindah halaman"), lalu spin/yaw/roll kejut
("kaya editan CapCut" — zoom tiba-tiba + blur adalah bahasa preset editor
video, bukan motion design). Urutan yang benar:

1. **Kamera bernapas** (fondasi, selalu aktif): rig dunia drift zoom pelan
   `sine.inOut` ±4-5% per adegan, arah bergantian, dirantai tanpa lompatan.
   Kamera tidak pernah diam dan tidak pernah menyentak.
2. **Koreografi elemen beririsan**: elemen adegan lama keluar (cepat,
   `power2.in`, blur berarah) SAMBIL elemen adegan baru masuk — irisan
   waktunya yang membuat perpindahan terasa hidup, bukan efek kameranya.
3. **Object wipe**: ornamen (bintang/bentuk brand) menyapu DEKAT lensa dan
   menutup frame tepat di titik cut; adegan berganti di baliknya. Resep:
   posisi z ≈ (camZ - 3), scale dunia ~2× tinggi-frame-pada-jarak-itu,
   lintasan diagonal `power1.inOut` ~1 detik, puncak skala tepat di cut,
   arah bergantian antar pemakaian. Awas tween lama yang masih menulis
   properti ornamen yang sama — ia membunuh wipe (cek overlap waktu).
4. **Zoom termotivasi** (jatah ±1 per video): push-through HANYA bila ada
   alasannya — menyelam ke layar mockup, masuk ke lubang logo. Zoom tanpa
   motivasi terasa efek kejut.

Element-driven exit tetap resep bagus: elemen lama terbang MELEWATI lensa
(scale ~2.2 + blur + stagger), kamera cuma menyusul halus (tanpa lompatan).

### 4c. Menu transisi — bukan balok persegi yang menyapu

Kasus nyata: dua opener berturut-turut memakai "object wipe" berupa balok
warna datar raksasa yang melintas miring ("kotak persegi aneh"), karena
contoh di skill menyebut wipe objek lebih dulu. Opener yang diterima
memakai kedalaman: push-through 3D, kartu kaca yang berputar masuk, tile
yang `rotateY` dari kedalaman, elemen yang melewati lensa dengan ketebalan.
Pilih dari menu ini; dalam satu video minimal DUA jenis, minimal SATU yang
berkedalaman (3D/perspektif), dan wipe paling banyak dua kali:

| # | Transisi | Cara | Rasa |
|---|---|---|---|
| 1 | Push-through 3D | `camThrough` + lapisan dengan `translateZ` berbeda (perspective 1400px) sehingga lapisan depan lewat lebih cepat | menyelam ke dunia |
| 2 | Kartu/objek berputar masuk (`rotateY` −35° → 0, `perspective`) | objek berikutnya datang dari kedalaman sambil berputar, yang lama pergi sebaliknya | premium, taktil |
| 3 | Objek melewati lensa dengan KETEBALAN | logo ekstrusi/kartu kaca/tile 3D (bukan persegi datar) membesar 1 → 2,5×, blur berarah, frame tertutup sesaat | sinematik |
| 4 | Sapuan cahaya (light leak / bloom through) | cahaya menutup 40–60 % frame di titik cut, bukan 100 % | lembut |
| 5 | Mask reveal lewat bentuk brand | adegan baru terlihat lewat lubang berbentuk logo/huruf yang membesar (`clip-path`/`mask`) | brand kuat |
| 6 | Whip dengan blur berarah | dunia bergeser 120–200 px + blur 18 px, 0,3 dtk, ke arah yang berganti | energik |
| 7 | Rack focus / kedalaman | adegan lama diblur & diperkecil ke belakang, adegan baru tajam dari depan | naratif |
| 8 | Koreografi beririsan tanpa cut | elemen lama keluar cepat sementara elemen baru sudah masuk; kamera bernapas terus | mengalir |
| 9 | Ganti latar di balik #1–#5 | pergantian gelap↔terang/blok warna terjadi saat frame tertutup | segmen baru |

Ditolak sebagai default: persegi/balok warna datar yang menyapu penuh
frame, garis tipis menyapu, dan satu jenis transisi yang diulang di semua
cut. Wipe boleh hanya bila objeknya bermakna dan punya kedalaman (kartu
kaca, logo ekstrusi, tile), bukan bidang datar.

## 5. Light leak transisi

Bukan garis cahaya menyapu (terlihat murahan), tapi bola cahaya lembut yang
merembes dari tepi, bergantian kiri/kanan:

- div bulat ±2400px, radial-gradient inti terang → transparan, `blur(64px)`,
  `mix-blend-mode:screen`, **di lapisan PALING ATAS** (di atas vignette;
  ia cahaya di depan lensa, bukan properti dunia)
- masuk `sine.in` 40% durasi → keluar `sine.out` 60%; drift diagonal pelan
- warnai sesuai aksen brand

## 6. Glow yang benar

Pelajaran yang mahal: **glow di semua judul = teks kusam dan norak**.

- Judul: putih penuh + `text-shadow: 0 4px 28px rgba(0,0,0,.5)` saja
  (drop shadow keterbacaan, bukan glow).
- Glow disimpan untuk OBJEK: tile ikon (rim border terang + inner glow naik
  dari bawah), input/search pill, ornamen, bar spektrum.
- Elemen realistis (baris app store, tombol) TANPA glow sama sekali —
  makin realistis elemennya, makin salah glow-nya.
- Bloom WebGL: `threshold ≥ 0.5`. Threshold rendah membuat latar ikut mekar
  dan seluruh frame putih (sudah pernah terjadi).

## 7. Latar Three.js

Lapisan dari belakang ke depan, semua diikat `state`:

- **Nebula**: plane fbm-noise shader, `NormalBlending` (JANGAN additive —
  menumpuk lewat bloom → putih), gradasi vertikal: `exp(-((y-0.02)*3.4)^2)`
  menyalakan horizon, atas diredupkan ~70%. Ini penangkal "latar flat".
- **Debu**: 1000–1500 `Points`, ukuran ∝ 1/z, kelip via sinus per-seed.
- **Grid lantai**: shader `fwidth`-antialiased, fade JAUH sebelum horizon
  (garis yang bertemu di horizon menumpuk jadi pita terang memotong teks);
  opasitas per adegan 0.2–0.6, jangan lebih.
- **Ornamen 3D** (bintang ✦, bentuk brand): `Shape` + kurva cekung →
  `ExtrudeGeometry` + bevel, `MeshStandardMaterial` + DirectionalLight —
  Basic material terlihat flat, dan flat = PPT. Goyangkan sumbu Y dengan
  sinus ±0.55 rad, JANGAN putar penuh (benda pipih dilihat dari samping =
  sebatang garis). Satu ornamen "hero" melintas cepat saat transisi.
- **Tunnel/rush**: partikel PENDEK (len 0.8–2.5), warna gelap-sedang,
  ≤300 buah, opasitas ≤0.6 — versi garis panjang putih pernah ditolak
  karena "terlalu rame, teks tidak kontras".
- **Bloom**: `UnrealBloomPass(strength .75–.95, radius .7, threshold .52)`,
  + denyut kecil mengikuti beat.
- **Kamera WebGL**: dolly `camZ` per adegan + handheld sway sinus lambat +
  shake beat via sinus frekuensi tinggi.

Gradient tambahan yang murah: div `mix-blend-mode:screen` berisi
radial-gradient aksen di bawah-tengah, DI DALAM rig `#world`.

## 7b. Latar terang & pergantian latar antar adegan

Latar WebGL gelap di §7 hanya satu bahasa. Salah satu opener yang diterima
berganti latar mengikuti segmennya: dasar gelap untuk masalah → terang
untuk solusi → kembali gelap untuk penekanan → blok warna untuk CTA. Itu
CONTOH, bukan templat: terang bisa gradien lembut dua warna palet, warna
pastel flat dengan blob, blok warna solid, kertas bertekstur, atau foto
dengan gradasi. Resep versi terang (kertas dan gradien memakai CSS yang
sama, cukup ganti `background`):

```css
.paper{position:absolute;inset:0;opacity:0;visibility:hidden;
  background:linear-gradient(180deg,#F7FAFF 0%,#EEF4FF 55%,#E6EEFF 100%)}
.paper .b{position:absolute;border-radius:50%;pointer-events:none}          /* blob warna lembut, ikut palet */
.paper .b1{left:-260px;top:-380px;width:1100px;height:1100px;background:radial-gradient(circle,color-mix(in srgb,var(--accent-lit) 38%,#fff) 0%,transparent 68%)}
.paper .b2{left:1180px;top:520px;width:1000px;height:1000px;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 22%,#fff) 0%,transparent 66%)}
.line.ink{color:#0B1B33;text-shadow:none}                                    /* teks untuk latar terang */
```
```js
/* ganti latar DI BALIK cut/wipe: frame sedang tertutup, lompatan tak terlihat */
tl.set('#paper',{autoAlpha:1},atCut); tl.to('#gl',{opacity:0,duration:.25},atCut);
tl.to('.vignette',{opacity:.35,duration:.4},atCut); tl.to('.bgfx',{opacity:0,duration:.25},atCut);
tl.to('.paper .b',{x:60,y:-40,duration:3,ease:'sine.inOut',yoyo:true,repeat:1,stagger:.4},atCut); // blob hidup
/* di t=0 (loop): kembalikan semuanya */
tl.set('#paper',{autoAlpha:0},0); tl.set(['#gl','.vignette','.bgfx'],{opacity:1},0);
```
Kapan berganti: diputuskan per segmen di style brief — ganti bila mood
atau topik segmen berubah (masalah → solusi, klaim → produk, isi → CTA);
jangan ganti hanya demi variasi. Bumper 5 detik atau opener satu mood boleh
satu latar. Yang tidak sah adalah latar yang tidak pernah dipertimbangkan:
gelap otomatis karena starter-nya gelap. Bila berganti: selalu di titik cut
(camThrough/wipe/leak), tidak pernah cross-fade di tengah adegan; teks ganti
varian (`.ink`) dan kantong gelap (`.pocket`) dimatikan di adegan terang;
vignette diringankan (0,3–0,4), bloom WebGL dimatikan. Gradien terang
contoh: `background:linear-gradient(160deg,color-mix(in srgb,var(--accent-lit) 30%,#fff),#fff 55%,color-mix(in srgb,var(--accent) 14%,#fff))`.

## 7c. Menu gerak latar — "gerak tiap detik" bukan berarti benda melintas

Kasus nyata: dua opener berturut-turut untuk produk berbeda sama-sama
memakai batang/potongan cahaya yang melesat ke samping (disebut "lane" di
satu proyek, "range" di proyek lain). Penyebabnya aturan lama "gerak harus
ada di dunia (objek melintas) tiap detik" — model memilih cara termurah
lalu mencari alasannya dari produk. Gerak latar dipilih di style brief dari
menu ini, dan harus berbeda dari proyek sebelumnya:

| # | Bahasa gerak latar | Rasa | Catatan |
|---|---|---|---|
| 1 | Latar diam bertekstur + kamera bernapas saja | tenang, mahal | cukup untuk banyak opener; gerak datang dari kamera dan objek |
| 2 | Gradien besar yang berpindah/berputar pelan (2–3 warna palet) | lembut, modern | `background-position`/sudut di-tween 8–15 dtk |
| 3 | Blob warna mengambang (2–4 lingkaran blur) | ramah, ringan | ikut palet; drift ±60 px, 4–6 dtk |
| 4 | Grain/tekstur kertas yang hidup (offset mask per frame dari t) | organik, cetak | jangan noise acak — offset dari `t` |
| 5 | Sapuan cahaya SEKALI per segmen (light sweep) | premium | bukan sapuan terus-menerus |
| 6 | Bentuk geometris besar (lingkaran/garis/logo negatif) berputar 20–40 dtk per putaran, 2 lapis parallax | brand, kuat | bentuk dari logo/tema |
| 7 | Partikel NAIK pelan (debu, gelembung, percik) | hangat, hidup | bukan horizontal; opacity ≤ .35 di kantong teks |
| 8 | Grid/pola yang bernapas (skala/opacity 1.0↔1.04, 6–10 dtk) | teknis, presisi | tanpa scroll |
| 9 | Teks hantu raksasa bergeser lambat di belakang | editorial | kontras rendah ≥ .12, satu gaya |
| 10 | Foto/ilustrasi tema dengan Ken Burns + parallax 2 lapis | naratif | butuh gradasi gelap di sisi teks |
| 11 | Aliran horizontal (streak/lane/range/hujan partikel) | kecepatan, data | HANYA bila tema = kecepatan/aliran; sudah dipakai dua proyek berturut → hindari kecuali dengan cara yang jelas baru |

Aturan: satu bahasa per opener (boleh dua bila latar berganti antar
segmen), ditulis di style brief pada baris "gerak latar", terpisah dari
"tanda tangan gerak" (yang menggerakkan OBJEK/teks, bukan latar). Menu ini
juga berlaku untuk latar WebGL §7: nebula diam + kamera bernapas adalah
#1, debu naik adalah #7; "tunnel/rush" adalah #11.

## 7d. Menu permukaan latar — gradien, cahaya, tekstur (jangan flat)

"Gelap ≤ 25 % / terang ≥ 80 % di bawah teks" adalah aturan KANTONG TEKS,
bukan perintah membuat seluruh latar flat satu warna. Opener yang diterima
memakai latar yang kaya: gelap dengan glow radial di horizon, terang dengan
gradien lembut dan blob warna palet. Menu (semua dari token palet; nilai
bebas diubah):

```css
/* a. glow horizon (gelap) */ background:radial-gradient(70% 42% at 50% 108%,color-mix(in srgb,var(--accent) 34%,transparent),color-mix(in srgb,var(--accent) 12%,transparent) 48%,transparent 70%),linear-gradient(180deg,#05060a,var(--base) 60%,#0b1020);
/* b. duotone diagonal   */ background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 55%,#000) 0%,var(--base) 45%,color-mix(in srgb,var(--accent-lit) 30%,#000) 100%);
/* c. mesh terang (blob) */ background:#F7FAFF; + 3–4 <i> radial-gradient(circle,color-mix(in srgb,var(--accent-lit) 38%,#fff),transparent 66%) berukuran 800–1200 px, drift ±60 px
/* d. spotlight + tint   */ background:radial-gradient(55% 60% at 50% 40%,color-mix(in srgb,var(--accent) 18%,var(--base)),var(--base) 75%);
/* e. langit berlapis    */ background:linear-gradient(180deg,#cfe0f5 0%,#f5efe3 100%); + pita warna tipis 2–3 lapis dengan opacity .2–.4
/* f. tekstur + tint     */ kertas/grain (feTurbulence) di atas a/b/c dengan mix-blend-mode:multiply/overlay, opacity .1–.3
```
Aturan: flat satu warna hanya untuk arah "poster color-block", dan itu pun
diberi grain/tekstur halus. Setiap latar punya ≥ 2 lapis (dasar + cahaya/
tekstur/blob). Warna latar dari palet tema, bukan hitam/putih murni.

## 8. Tile ikon & mockup UI

**Tile ikon** (pengganti daftar poin): rounded-square ±210px, rim border
aksen terang 2px, inner glow naik dari bawah (radial di 50% 115%), ikon
stroke putih 3.5–4.5 + `drop-shadow`, label 1–2 kata di bawah. Masuk
`back.out(1.9)` stagger 0.15.

**Mockup UI**: bezel `border-radius` besar + layar `overflow:hidden`;
isi mockup memakai FONT & WARNA PRODUK ASLI (bukan font display) — mockup
dinilai sebagai "aplikasinya", bukan dekorasi. Elemen hidup di dalamnya
(spektrum, angka, sparkline) digerakkan dari sumber data yang sama dengan
latar 3D supaya konsisten. Masuk sebagai OBJEK (naik dari bawah frame,
rotateY ±10–24° dengan parent `perspective`), bukan sebagai kolom layout.

## 9. Ketikan & angka hidup (deterministik)

- Ketikan: `tl.fromTo(o,{i:0},{i:n, ease:'none', onUpdate: el.textContent =
  str.slice(0, Math.round(o.i))})` — BUKAN setInterval.
- Uptime/counter: `f(t) = base + (t - tStart)`, format di render loop.
- Sparkline/spektrum: jumlah sinus berbeda frekuensi atas `t` — murah,
  terlihat organik, dan reproducible.

## 10. Jebakan

| Gejala | Sebab | Obat |
|---|---|---|
| Seluruh frame putih menyala | bloom threshold rendah + additive layers | threshold ≥.5; latar NormalBlending |
| Elemen muncul mendahului animasinya | selector CSS lebih spesifik dari state-awal `opacity:0` | jangan tulis opacity di selector spesifik; GSAP yang beri nilai akhir |
| Edit JS "tidak ngefek" | browser cache module (heuristic) | server `Cache-Control: no-store` |
| Ornamen 3D jadi garis putih | benda pipih diputar penuh sumbu Y | goyangan sinus, bukan rotasi penuh |
| Ekor blur terpotong kotak | filter region default 110% | x/y -70%, width/height 240% |
| Teks "gelap/kusam" | tumpukan glow menghisap kontras | hapus glow judul, putih penuh |
| Pita terang memotong teks di horizon | garis grid menumpuk di titik temu | fade grid sebelum horizon |
| Scrub menghasilkan gambar beda-beda | ada random/akumulasi di render | lihat daftar larangan determinisme |
| Teks patah/selebar salah saat split | split sebelum font termuat | tunggu `document.fonts.ready` |
| Huruf/pill "flash" sesaat sebelum animasi masuknya | `tl.set(el,{autoAlpha:1})` lalu `fromTo(...immediateRender:false)` mulai beberapa frame kemudian — di antaranya elemen tampil penuh | state awal `.ch`, `.hl-t`, tanda baca = `opacity:0` DI CSS, bukan hanya pembungkusnya |
| Kartu kontrol/teks bergetar lebarnya saat angka berjalan | digit proporsional (1 lebih sempit dari 8) | `font-variant-numeric:tabular-nums` + `min-width` pada elemen angka |
| Screenshot scrub tertinggal satu langkah / tidak sinkron | GSAP menulis gaya secara lazy di tick berikutnya dan kanvas menunggu rAF (yang dithrottle di tab tersembunyi) | sediakan `OPENER.seek(t)` = `tl.pause(); tl.time(t); gsap.ticker.tick(); render(t)` dan pakai itu dari puppeteer/konsol |
