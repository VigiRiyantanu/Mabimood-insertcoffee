# ☕ INSERT COFFEE

> **Coffee, Games, and Chill** — A modern, immersive web application combining an artisanal coffee menu with retro arcade minigames, fully modularized for professional maintenance and scalability.

---

## 🌟 Features

- **☕ Artisanal Coffee & Pastry Menu:** Explore specialty drinks, customizable brewing options, and delicious pastries with live cart & checkout simulation.
- **🕹️ Retro Arcade Hub:** Play 12 built-in browser minigames to earn points and discounts (Snake, Tetris, Pong, Breakout, Space Invaders, Space War, Coffee Mario, Flappy, Minesweeper, Memory, 2048, Tic Tac Toe).
- **🛡️ Admin Portal & Live Orders Monitor:** Dedicated login page for Barista & Manager to monitor live incoming orders, advance status (`received` -> `preparing` -> `ready` -> `completed`), and manage product catalog stock.
- **🔥 Firebase & Cloud Firestore Integration:** Real-time database synchronization for orders and catalog items across devices, with instant offline fallback.
- **🏆 Live Arcade Leaderboard:** Real-time synchronized hall of fame rankings across all minigames with Cloud Firestore & local persistence, minimal Top 3 highlights, current player rank display, and interactive landing page summary.
- **🔊 Immersive Audio FX:** Retro sound effects powered by the Web Audio API and voice announcements for ready orders.
- **💾 Local & Cloud Persistence:** Real-time Firestore sync with LocalStorage fail-safe.

---

## 👥 Pengembang Team MabiMood

Project ini dibuat dan dikembangkan secara kolaboratif oleh 4 anggota **Team MabiMood** dengan struktur pohon organisasi:

```text
                         👑 [LEADER]
                       Vigi Riyantanu
          (Project Leader, Game Arch & UI Composer)
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
          [MEMBER]         [MEMBER]         [MEMBER]
       Nurul Fitriani   Fahmi El Murottal  Ahmad Azka Ibadillah
          (UI/UX)          (Frontend)        (Assets & QA)
```

| Foto Circle | Nama | Peran (Role) | Tanggung Jawab | Portofolio & GitHub |
| :---: | :--- | :---: | :--- | :---: |
| <a href="portofolio-vigi/" target="_blank"><img src="assets/img/team/vigi.jpg" width="52" height="52" style="border-radius:50%;object-fit:cover;display:block;margin:auto;"/></a> | **Vigi Riyantanu** | 👑 **Leader** | Project Leader, Game Architecture, UI Composer & Fullstack | [📁 Portofolio Vigi](portofolio-vigi/) • [@fujikomilk17](https://github.com/fujikomilk17) |
| <a href="portofolio-fitri/" target="_blank"><img src="assets/img/team/nurul.jpg" width="52" height="52" style="border-radius:50%;object-fit:cover;display:block;margin:auto;"/></a> | **Nurul Fitriani** | **Member** | UI/UX & Creative Design Systems | [📁 Portofolio Nurul](portofolio-fitri/) • [LinkedIn](https://www.linkedin.com/in/nurul-fitriani-42ab90421/) |
| <a href="portofolio-fahmi/" target="_blank"><img src="assets/img/team/fahmi.jpg" width="52" height="52" style="border-radius:50%;object-fit:cover;display:block;margin:auto;"/></a> | **Fahmi El Murottal** | **Member** | Frontend Engineering | [📁 Portofolio Fahmi](portofolio-fahmi/) • [@fahmielmurottal-sys](https://github.com/fahmielmurottal-sys) |
| <a href="portofolio-azka/" target="_blank"><img src="assets/img/team/jheng.jpg" width="52" height="52" style="border-radius:50%;object-fit:cover;display:block;margin:auto;"/></a> | **Ahmad Azka Ibadillah** | **Member** | Assets, Content & Quality Assurance | [📁 Portofolio Azka](portofolio-azka/) • *(GitHub belum ditambahkan)* |

---

## 📂 Project Structure

```text
teamproject/
├── index.html                   # Main HTML entry point (Store, Games, Display, Leaderboard Summary)
├── leaderboard/
│   └── index.html               # Dedicated Leaderboard Page (Overall & Game-specific rankings)
├── leaderboard.html             # Quick redirect alias to leaderboard/index.html
├── admin/
│   └── index.html               # Dedicated Admin Portal & Cashier Dashboard
├── admin.html                   # Quick redirect alias to admin/index.html
├── playerloginpage.html         # Gamertag authentication & player profile portal
├── assets/
│   ├── css/
│   │   ├── style.css            # Master entry stylesheet (imports modular CSS below)
│   │   ├── base.css             # Design tokens, reset, typography, navbar & transitions
│   │   ├── store.css            # Coffee menu, hero stage, cart drawer, checkout & order tracking
│   │   ├── arcade.css           # Retro arcade hub, game stage & CRT effects
│   │   ├── leaderboard.css      # Hall of fame, podium top 3 & minimal gaming aesthetic
│   │   ├── admin.css            # Admin portal dashboard, live orders & menu manager
│   │   ├── profile.css          # User profile modal, gamertag prompt & avatar
│   │   └── player-login.css     # Dedicated retro login page styling
│   └── js/
│       ├── data.js              # Central source of truth: default PRODUCTS, CATEGORIES, GAMES
│       ├── audio.js             # Retro Web Audio API sound synthesizer (shared across app & admin)
│       ├── store.js             # Local/cloud stores: CartStore, OrderStore, HSStore, UserStore & auth
│       ├── effects.js           # 3D canvas, universal tilt, parallax, confetti & background dino
│       ├── games.js             # Retro Game Engine + 10 classic minigames (Snake, Tetris, Pong, dll)
│       ├── app.js               # Main SPA router, cart drawer UI, menu filters & queue display
│       ├── admin.js             # Admin authentication, order monitor & catalog manager
│       ├── leaderboard.js       # Reusable Leaderboard service & rendering engine
│       ├── player-login.js      # Player login validation & motion effects
│       └── firebase-config.js   # Firebase Auth & Cloud Firestore sync service
├── server.py                    # Lightweight Python 3 development server (No-cache)
├── agent.md                     # Agent specification and architectural guidelines
└── README.md                    # Project documentation
```


---

## Admin Portal & Akses Kasir / Barista

- **URL Akses:** Buka `/admin/` (file [admin/index.html](file:///c:/Users/hiura/Documents/mbg/teamproject/admin/index.html)) atau klik tombol **Admin** di navbar.
- **Kredensial Default (Demo / Mode Lokal):**
  - **Email:** `admin@insertcoffee.id`
  - **Password:** `admin123`
- **Fitur Admin:**
  1. **Live Orders Monitor:** Memantau pesanan masuk secara real-time, mengubah status pesanan (`Mulai Buat`, `Pesanan Siap`, `Selesai`), memicu suara notifikasi dan pengumuman panggilan ke layar antrean.
  2. **Manajemen Menu & Stok:** Menambah menu baru, mengedit harga dan deskripsi, mengubah status stok (*Tersedia* / *Habis*), menghapus menu, dan 1-Click *Seed Menu Default ke Cloud Firestore*.
  3. **Konfigurasi Firebase & Firestore:** Memasukkan kredensial Firebase Web App langsung dari dashboard tanpa harus mengedit file kode, serta tombol tes koneksi real-time.

## 🚀 Getting Started

No complex build steps or package managers required! Simply serve the project using any static file server:

```bash
# Using Python 3
python3 -m http.server 8080

# Using Node.js (npx)
npx serve .
```

Open your browser and navigate to `http://localhost:8080`.
