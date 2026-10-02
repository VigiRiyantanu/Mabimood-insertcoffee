/* ============================================================
   data.js — SATU-SATUNYA file yang perlu diedit untuk
   mengganti konten portofolio (skills, projects, experience,
   contact, nav).

   Status isi file ini:
     [SIAP]     Nama, email, LinkedIn, Instagram
     [CONTOH]   Skills, projects, pendidikan, GitHub
   Yang masih berupa CONTOH wajib diganti dengan data asli Anda.
   ============================================================ */

/* ------------------------------------------------------------
   1. IDENTITAS
   ------------------------------------------------------------ */
const SITE = {
  name: "Nurul Fitriani",
  availability: "Terbuka untuk kolaborasi & peluang baru",

  // Dipakai di form kontak (mailto). Ganti dengan email asli.
  contactEmail: "nurul09fit@gmail.com",

  // Tahun footer. null = memakai tahun berjalan secara otomatis.
  copyrightYear: null
};

/* ------------------------------------------------------------
   2. NAVBAR
   ------------------------------------------------------------ */
const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" }
];

/* ------------------------------------------------------------
   3. ABOUT — daftar poin "Yang sedang dipelajari"
   ------------------------------------------------------------ */
const ABOUT_LEARNING = [
  "HTML5 & semantic markup",
  "CSS modern (Flexbox, Grid, responsif)",
  "JavaScript (DOM, fetch, async/await)",
  "REST API & operasi CRUD database",
  "Git, Linux, dan kontainer Docker"
];

/* ------------------------------------------------------------
   4. SKILLS
   ------------------------------------------------------------
   Struktur tiap skill:
     name  : nama skill
     level : 0-100 (tinggat familiarize, bukan klaim ahli)
     note  : keterangan opsional
   Grup:
     title : judul kategori
     icon  : emoji (opsional)
   ------------------------------------------------------------ */
const SKILL_GROUPS = [
  {
    title: "Frontend",
    icon: "🖥️",
    skills: [
      { name: "HTML", level: 85, note: "Struktur semantik & aksesibilitas" },
      { name: "CSS", level: 75, note: "Flexbox, Grid, animasi, responsif" },
      { name: "JavaScript", level: 60, note: "DOM, event, fetch, async/await" }
    ]
  },
  {
    title: "Version Control & Tools",
    icon: "🌿",
    skills: [
      { name: "Git", level: 65, note: "branch, merge, pull request" },
      { name: "GitHub", level: 60, note: "repository & kolaborasi" },
      { name: "Linux", level: 50, note: "terminal & administrasi dasar" }
    ]
  },
  {
    title: "Backend & Data",
    icon: "🗄️",
    skills: [
      { name: "REST API", level: 50, note: "endpoint, status code, CRUD" },
      { name: "Database", level: 45, note: "SQL dasar, relasi, query" },
      { name: "Docker", level: 35, note: "image, container, volume" }
    ]
  },
  {
    title: "Jaringan & Lainnya",
    icon: "🌐",
    skills: [
      { name: "Networking", level: 40, note: "HTTP, DNS, request-response" },
      { name: "Figma", level: 45, note: "layout & design system dasar" },
      { name: "Problem Solving", level: 70, note: "logika & algoritma dasar" }
    ]
  }
];

/* ------------------------------------------------------------
   5. PROJECTS
   ------------------------------------------------------------
   Struktur tiap project:
     title    : nama project
     year     : tahun / periode
     status   : label kecil (mis. "Belajar", "Prototype")
     image    : path gambar preview (disarankan rasio 16:10)
     alt      : alt text gambar (WAJIB diisi demi SEO)
     desc     : deskripsi singkat
     tech     : array teknologi yang dipakai
     demo     : URL demo (null = tombol disembunyikan)
     repo     : URL GitHub (null = tombol disembunyikan)
     featured : true = tampil lebih dulu
   ------------------------------------------------------------ */
const PLACEHOLDER_IMAGE = "assets/img/project-placeholder.svg";

const PROJECTS = [
  {
    title: "Website Portofolio Pribadi",
    year: "2026",
    status: "Teman Belajar",
    image: PLACEHOLDER_IMAGE,
    alt: "Tampilan preview website portofolio pribadi dengan tema gelap",
    desc: "Website portofolio statis bertema gelap yang dibangun dari HTML, CSS, dan JavaScript murni. Dilengkapi layout responsif, animasi saat section muncul, dan menu hamburger untuk mobile.",
    tech: ["HTML", "CSS", "JavaScript"],
    demo: null,
    repo: null,
    featured: true
  },
  {
    title: "Website Reservasi Restaurant",
    year: "2026",
    status: "Project Belajar",
    image: PLACEHOLDER_IMAGE,
    alt: "Tampilan preview website reservasi restaurant",
    desc: "Website company profile untuk restaurante dengan halaman menu, form reservasi, dan validasi input di sisi client. Designed untuk latihan membangun UI yang rapi dan mudah dibaca.",
    tech: ["HTML", "CSS", "JavaScript"],
    demo: null,
    repo: null,
    featured: true
  },
  {
    title: "To-Do List dengan Local Storage",
    year: "2026",
    status: "Latihan JavaScript",
    image: PLACEHOLDER_IMAGE,
    alt: "Tampilan preview aplikasi to-do list",
    desc: "Aplikasi daftar tugas sederhana yang menyimpan data di localStorage. Fokus pada manipulasi DOM, event handling, dan pemisahan logika data dari tampilan.",
    tech: ["JavaScript", "Local Storage", "CSS"],
    demo: null,
    repo: null,
    featured: false
  },
  {
    title: "REST API sederhana (CRUD Produk)",
    year: "2026",
    status: "Belajar Backend",
    image: PLACEHOLDER_IMAGE,
    alt: "Tampilan preview dokumentasi REST API CRUD produk",
    desc: "Latihan membuat REST API dengan operasi CRUD, validasi input, dan respons JSON yang sesuai. Dipakai untuk memahami konsep endpoint, method HTTP, dan status code.",
    tech: ["REST API", "JSON", "Database"],
    demo: null,
    repo: null,
    featured: false
  },
  {
    title: "Dashboard Cuaca Sederhana",
    year: "2025",
    status: "Latihan Fetch API",
    image: PLACEHOLDER_IMAGE,
    alt: "Tampilan preview dashboard cuaca dengan fetch API",
    desc: "Mini project untuk belajar pengambilan data dari API publik menggunakan fetch dan async/await, lengkap dengan tampilan loading/error state.",
    tech: ["JavaScript", "Fetch API", "CSS"],
    demo: null,
    repo: null,
    featured: false
  },
  {
    title: "Landing Page Produk Teknologi",
    year: "2025",
    status: "Project Desain",
    image: PLACEHOLDER_IMAGE,
    alt: "Tampilan preview landing page produk teknologi",
    desc: "Landing page satu halaman untuk produk teknologi fiktif, berfokus pada section yang rapi, hierarki informasi, dan tampilan yang konsisten di berbagai ukuran layar.",
    tech: ["HTML", "CSS"],
    demo: null,
    repo: null,
    featured: false
  }
];

/* ------------------------------------------------------------
   6. EXPERIENCE / EDUCATION / ORGANIZATION / SERTIFIKAT
   ------------------------------------------------------------
   Struktur tiap item:
     period   : contoh "2025 — Sekarang"
     title    : nama jabatan / jenjang / organisasi
     org      : nama lembaga (opsional)
     type     : "education" | "experience" | "organization" | "certificate"
     status   : "current" (tanda sedang berjalan) | "done"
     desc     : deskripsi singkat (opsional)
     points   : array bullet (opsional)
     muted    : true = tampilkan lebih redup (untuk placeholder)
   ------------------------------------------------------------ */
const EXPERIENCE_GROUPS = [
  {
    key: "education",
    title: "Pendidikan",
    items: [
      {
        period: "2024 — Sekarang",
        title: "Sarjana Teknik Informatika",
        org: "Nama Universitas — Ganti dengan nama sekolah Anda",
        type: "education",
        status: "current",
        desc: "Program studi peminatan jaringan dan keamanan. Sedang mempelajari dasar-dasar pemrograman, basis data, dan pemrograman berorientasi objek.",
        points: [
          "Mata kuliah pemrograman dasar dan struktur data",
          "Basis data relasional dan pemrograman web",
          "Praktikum laboratorium pemrograman"
        ]
      },
      {
        period: "2020 — 2024",
        title: "SMA / SMK — ganti dengan jenjang sekolah Anda",
        org: "Nama Sekolah",
        type: "education",
        status: "done",
        desc: "Jurusan IPA atau RPL. Minat pada komputer dan jaringan sudah muncul sejak bangku sekolah.",
        points: ["Ekstrakurikuler komputer", "Belajar dasar jaringan"]
      }
    ]
  },
  {
    key: "experience",
    title: "Pengalaman",
    items: [
      {
        period: "2026 — Sekarang",
        title: "Belajar Mandiri Web Development",
        org: "Independent",
        type: "experience",
        status: "current",
        desc: "Membangun pemahaman frontend dan backend secara bertahap melalui dokumentasi, course online, dan proyek pribadi.",
        points: [
          "Belajar fundamental HTML, CSS, dan JavaScript",
          "Membaca dokumentasi API dan membuat latihan CRUD",
          "Membiasakan alur kerja Git/GitHub"
        ]
      },
      {
        period: "2025 — 2026",
        title: "Asisten Praktikum Laboratorium",
        org: "Nama Universitas — Ganti bila ada",
        type: "experience",
        status: "done",
        desc: "Membantu praktikan dalam memahami konsep pemrograman dan menyiapkan materi praktikum.",
        points: ["Membantu troubleshooting kode praktikan"]
      }
    ]
  },
  {
    key: "organization",
    title: "Organisasi",
    items: [
      {
        period: "2025 — Sekarang",
        title: "Anggota Departemen Teknologi Informasi",
        org: "Nama Organisasi",
        type: "organization",
        status: "current",
        desc: "Ikut serta dalam kegiatan organisasi, pembuatan dokumentasi teknis, dan pendampingan workshop.",
        points: [
          "Dokumentasi teknis dan pengelolaan repository",
          "Pendampingan workshop untuk angkatan baru"
        ]
      }
    ]
  },
  {
    key: "certificate",
    title: "Sertifikat",
    items: [
      {
        period: "2026",
        title: "Sertifikat Penyelesaian Course Web Development",
        org: "Nama Platform / Penyedia",
        type: "certificate",
        status: "done",
        desc: "Ganti dengan nama sertifikat asli Anda, atau hapus seluruh item bila belum ada.",
        muted: true
      }
    ]
  }
];

/* ------------------------------------------------------------
   7. CONTACT
   ------------------------------------------------------------
   Struktur tiap item:
     label : nama tampilan
     value : teks yang ditampilkan (mis. email, username)
     href  : URL tujuan
     icon  : emoji
   Catatan: email, LinkedIn, dan Instagram di bawah sudah asli.
   Username GitHub masih contoh — ganti dengan milik Anda sendiri,
   atau hapus entri yang tidak dipakai.
   ------------------------------------------------------------ */
const CONTACTS = [
  {
    label: "Email",
    value: "nurul09fit@gmail.com",
    href: "mailto:nurul09fit@gmail.com",
    icon: "✉️"
  },
  {
    label: "GitHub",
    value: "github.com/username",
    href: "https://github.com/username",
    icon: "🐙"
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/nurul-fitriani-42ab90421",
    href: "https://www.linkedin.com/in/nurul-fitriani-42ab90421/",
    icon: "💼"
  },
  {
    label: "Instagram",
    value: "instagram.com/kgxx8574uch",
    href: "https://www.instagram.com/kgxx8574uch/",
    icon: "📷"
  }
];

/* ------------------------------------------------------------
   8. FOOTER — link sosial tambahan (opsional)
   ------------------------------------------------------------ */
const FOOTER_LINKS = [
  { label: "GitHub", href: "https://github.com/username" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/nurul-fitriani-42ab90421/" },
  { label: "Instagram", href: "https://www.instagram.com/kgxx8574uch/" },
  { label: "Email", href: "mailto:nurul09fit@gmail.com" }
];

/* ------------------------------------------------------------
   9. EKSPOR KE WINDOW
   ------------------------------------------------------------
   Blok ini tidak perlu diedit.dipakai agar nav.js, render.js,
   dan main.js dapat membaca data di atas.
   ------------------------------------------------------------ */
window.SITE = SITE;
window.NAV_LINKS = NAV_LINKS;
window.ABOUT_LEARNING = ABOUT_LEARNING;
window.SKILL_GROUPS = SKILL_GROUPS;
window.PROJECTS = PROJECTS;
window.EXPERIENCE_GROUPS = EXPERIENCE_GROUPS;
window.CONTACTS = CONTACTS;
window.FOOTER_LINKS = FOOTER_LINKS;
