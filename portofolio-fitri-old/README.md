# Portofolio — Nurul Fitriani

Website portofolio pribadi: modern, profesional, clean, dan responsif.
Dibangun dengan **HTML + CSS + JavaScript murni** — tanpa framework, tanpa build step,
tanpa dependency. Cukup buka `index.html`, selesai.

Tema utama **dark**, tersedia tombol pengalih ke tema terang.
Seluruh teks memakai Bahasa Indonesia.

---

## 1. Cara menjalankan

### Cara tercepat (tanpa instalasi apa pun)

Buka `index.html` dengan klik ganda, atau seret ke browser.

### Cara disarankan (local server)

Some URL seperti `mailto:` dan font Google bekerja paling baik lewat local server.
Pilih **satu** dari berikut:

```bash
# Python 3 (hampir selalu sudah ada di Linux/macOS)
python3 -m http.server 8000

# atau Node.js
npx serve .

# atau PHP
php -S localhost:8000
```

Lalu buka: <http://localhost:8000>

> **Penting:** form kontak memakai `mailto:` (membuka aplikasi email Anda).
> Form ini **tidak** mengirim data ke server — tidak ada backend di proyek ini.
> Ganti `contactEmail` di `js/data.js` dengan email asli Anda agar tombol Kirim berfungsi.
> Selama masih `email@example.com`, form sengaja menampilkan peringatan dan tidak mengirim apa pun.

### Cara dibuka dari HP / laptop lain (jaringan yang sama)

```bash
./serve.sh          # port 8000
./serve.sh 3000     # port lain
```

Skrip tersebut menjalankan server di `0.0.0.0` (bukan hanya `localhost`) lalu
mencetak semua alamat yang bisa dipakai:

```
  Komputer ini : http://localhost:8000/
  Jaringan     : http://192.168.56.122:8000/   (enp0s8)
```

Buka alamat **Jaringan** di browser HP atau laptop lain. Syaratnya:

1. Perangkat lain terhubung ke **Wi-Fi/jaringan yang sama** dengan komputer ini.
2. **Firewall komputer ini mengizinkan** koneksi masuk (Linux biasanya sudah terbuka secara default;
   bila tidak: `sudo ufw allow 8000/tcp`).
3. Mode adapter jaringan harus **Bridged / Bridge** — lihat catatan di bawah.

Manual bila tanpa skrip:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

> **Penting — mode adapter jaringan.** Website ini berada di dalam
> **mesin virtual (VirtualBox)**, sehingga IP `10.0.2.x` (NAT) dan `192.168.56.x`
> (Host-Only) **tidak bisa dijangkau** oleh HP yang tersambung ke Wi-Fi asli.
>
> Agar bisa dibuka dari perangkat lain, ubah pengaturan jaringan VM:
> **VirtualBox → Settings → Network → Adapter 1 → Attached to: Bridged Adapter**
> (pilih adapter Wi-Fi/ethernet fisik yang dipakai host), lalu nyalakan ulang VM.
> Setelah berubah, jalankan `./serve.sh` lagi untuk melihat IP baru.
>
> Alternatif tanpa mengubah VM: set **Port Forwarding** di VirtualBox
> (mis. host port 8000 → guest 8000), lalu buka `http://<IP-host>:8000/`.

---

## 2. Struktur folder

```
fitriporto/
├── index.html              # struktur semantik + SEO (satu-satunya halaman)
├── serve.sh                # jalankan di jaringan lokal (0.0.0.0) + cetak URL
├── README.md
├── css/
│   ├── base.css            # reset, design token (warna/tipografi/spacing), aksesibilitas
│   ├── layout.css          # container, section, grid
│   ├── components.css      # navbar, tombol, card, badge, timeline, form, footer
│   ├── sections.css        # hero, about, skills, projects, experience
│   └── responsive.css      # breakpoint tablet & mobile + gaya cetak
├── js/
│   ├── data.js             # ★ SEMUA KONTEN ADA DI SINI
│   ├── nav.js              # link navbar/footer, hamburger, scroll spy
│   ├── render.js           # merender data.js menjadi HTML
│   └── main.js             # animasi reveal, smooth scroll, tema, form kontak
└── assets/
    ├── favicon.svg
    └── img/
        ├── avatar-placeholder.svg        # ganti dengan foto Anda
        └── project-placeholder.svg        # ganti dengan screenshot project
```

Urutan pemanggilan script di `index.html` **tidak boleh diacak**:
`data.js` → `nav.js` → `render.js` → `main.js`.

---

## 3. Cara mengedit konten

**Semua yang perlu Anda ubah ada di `js/data.js`.** Tidak perlu menyentuh HTML/CSS.

### 3.1 Identitas & email

```js
const SITE = {
  name: "Nurul Fitriani",
  availability: "Terbuka untuk kolaborasi & peluang baru",
  contactEmail: "nurul09fit@gmail.com",   // ← dipakai form kontak
  copyrightYear: null                  // null = tahun berjalan otomatis
};
```

### 3.2 Skills

Tambah/hapus skill di dalam `SKILL_GROUPS`. `level` adalah 0–100 dan menyatakan
**tingkat familiarize**, bukan klaim ahli.

```js
{
  title: "Frontend",
  icon: "🖥️",                       // emoji, boleh dihapus
  skills: [
    { name: "HTML", level: 85, note: "Struktur semantik & aksesibilitas" },
    { name: "CSS",  level: 75, note: "Flexbox, Grid, responsif" }
  ]
}
```

Untuk menambah kategori baru, tambahkan objek baru ke array `SKILL_GROUPS`.
CSS otomatis menyesuaikan (4 kolom di desktop, 2 di tablet, 1 di mobile).

### 3.3 Projects

```js
{
  title: "Website Portofolio",
  year: "2026",
  status: "Project Belajar",                       // label kecil, opsional
  image: "assets/img/project-placeholder.svg",    // rasio disarankan 16:10
  alt: "Deskripsi singkat gambar ini",             // WAJIB untuk SEO
  desc: "Penjelasan project.",
  tech: ["HTML", "CSS", "JavaScript"],
  demo: "https://contoh.com",   // null = tombol Demo disembunyikan
  repo: "https://github.com/u/p",// null = tombol GitHub disembunyikan
  featured: true                // true = tampil di urutan atas
}
```

- `demo` / `repo` diisi `null` → tombol disembunyikan, muncul badge "Segera hadir".
- `featured: true` → project diurutkan lebih dulu.
- Array kosong `[]` → section projects menampilkan pesan "Belum ada proyek".

### 3.4 Pendidikan, pengalaman, organisasi, sertifikat

Semua diisi melalui `EXPERIENCE_GROUPS`:

```js
{
  key: "education",     // dipakai sebagai id heading (harus unik)
  title: "Pendidikan",
  items: [
    {
      period: "2024 — Sekarang",
      title: "Sarjana Teknik Informatika",
      org: "Nama Universitas",
      status: "current",              // "current" → badge "Sedang berjalan"
      desc: "Deskripsi singkat.",
      points: ["Bullet satu", "Bullet dua"],
      muted: false                    // true → tampilan lebih redup
    }
  ]
}
```

Untuk menghilangkan satu kategori, hapus seluruh blok `key`-nya.
Item boleh dikosongkan dengan menghapus `desc` atau `points`.

### 3.5 Kontak & social media

```js
const CONTACTS = [
  { label: "Email",    value: "nurul09fit@gmail.com",  href: "mailto:nurul09fit@gmail.com", icon: "✉️" },
  { label: "GitHub",   value: "github.com/username",     href: "https://github.com/username", icon: "🐙" },
  { label: "LinkedIn", value: "linkedin.com/in/nurul-fitriani-42ab90421", href: "https://www.linkedin.com/in/nurul-fitriani-42ab90421/", icon: "💼" },
  { label: "Instagram",value: "instagram.com/kgxx8574uch",   href: "https://www.instagram.com/kgxx8574uch/", icon: "📷" }
];
```

`FOOTER_LINKS` untuk link tambahan di footer. Hapus entri yang tidak Anda pakai.

### 3.6 Link navbar

`NAV_LINKS` diisi otomatis. Jika menambah section baru, tambahkan section dengan
`id` yang sama di `index.html`.

---

## 4. Mengganti gambar

| Kebutuhan | File |
|---|---|
| Foto profil | ganti `assets/img/avatar-placeholder.svg` (1:1) |
| Screenshot project | ganti `assets/img/project-placeholder.svg` (16:10), lalu ubah `image` + `alt` di `data.js` |
| Favicon | ganti `assets/favicon.svg` |

Simpan gambar di `assets/img/`, lalu perbarui path + `alt` di `js/data.js`.
Selalu isi `alt` — ini dibaca mesin pencari dan pembaca layar.

---

## 5. SEO

Sudah ada di `index.html`:

- `<title>` dan `<meta name="description">` yang relevan
- Open Graph + Twitter Card
- `lang="id"`, `viewport`, `theme-color`
- struktur heading benar (satu `<h1>`, lalu `<h2>` per section, `<h3>` untuk sub-bagian)
- semantic HTML: `header` / `nav` / `main` / `section` / `article` / `aside` / `footer`
- `alt` pada setiap gambar
- link canonical — **ganti `https://example.com/`** dengan domain asli Anda setelah deploy

Belum ada structured data (JSON-LD). Jika perlu, tambahkan blok
`<script type="application/ld+json">` di dalam `<head>`.

---

## 6. Fitur

- Navbar sticky dengan efek blur + progress bar baca halaman
- Hamburger menu di mobile (menutup otomatis saat pilih link / klik luar / tekan `Esc`)
- Scroll spy — link navbar menandai section yang sedang terlihat
- Animasi reveal ringan saat section masuk layar (dihormati `prefers-reduced-motion`)
- Progress bar animasi pada skill
- Card hover, tombol dengan `transform` halus (tidak berlebihan)
- Tema gelap (default) + pengalih tema terang, tersimpan di `localStorage`
- Tombol back-to-top
- Form kontak dengan validasi client-side dan penghitung karakter
- Konten tetap terbaca bila JavaScript dimatikan (kelas `no-js`)

---

## 7. Kompatibilitas

Chrome, Edge, Firefox, Safari (versi terbaru). Layout diuji pada lebar
~1440px (desktop), ~768px (tablet), dan ~390px (mobile).

---

## 8. Deploy

Static site — bisa di-hosting di mana saja tanpa konfigurasi build:

- **GitHub Pages** — push ke repo, aktifkan Pages (branch `main`, folder `/`)
- **Netlify** — seret folder ke <https://app.netlify.com/drop>
- **Vercel** — `npx vercel`
- **Cloudflare Pages** — sambungkan repo, build command dikosongkan

Setelah deploy, ganti `https://example.com/` pada canonical & Open Graph
dengan domain asli, dan isi `contactEmail` di `js/data.js`.

---

## 9. Catatan keamanan

Semua data dari `data.js` melewati `escapeHtml()` sebelum masuk DOM, dan URL
di-filter untuk menolak skema berbahaya (`javascript:`, `vbscript:`).
Jangan pernah menempelkan HTML mentah ke `data.js` — cukup teks biasa.
