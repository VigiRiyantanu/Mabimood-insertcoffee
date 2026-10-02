<div align="center">

# ☕ INSERT COFFEE

### Coffee, Games, and Chill.

**An immersive web app that blends an artisanal coffee menu with a retro arcade — order, play, earn, repeat.**

![Status](https://img.shields.io/badge/status-active-success?style=flat-square)
![Frontend](https://img.shields.io/badge/frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-f7df1e?style=flat-square)
![Backend](https://img.shields.io/badge/backend-Firebase%20Firestore-ffca28?style=flat-square&logo=firebase&logoColor=black)
![Build](https://img.shields.io/badge/build-zero%20config-blue?style=flat-square)
![Team](https://img.shields.io/badge/team-MabiMood-ff69b4?style=flat-square)

[Getting Started](#-getting-started) •
[Features](#-features) •
[Architecture](#-architecture) •
[Admin Portal](#-admin-portal) •
[Team](#-team)

</div>

---

## 📖 Overview

**Insert Coffee** reimagines the café experience: customers browse a specialty coffee and pastry menu, place orders through a live cart and checkout flow, and play **12 built-in retro minigames** to earn points and discounts while they wait.

Behind the counter, baristas and managers run the shop from a dedicated **Admin Portal** with real-time order monitoring and catalog management, all synchronized across devices through **Firebase Cloud Firestore**, with an automatic **LocalStorage fallback** when offline.

> **Zero build step. Zero dependencies to install.** Serve the folder and you're live.

---

## ✨ Features

### 🛍️ For Customers
| Feature | Description |
| :-- | :-- |
| **Artisanal Menu** | Specialty drinks, customizable brewing options, and pastries |
| **Live Cart & Checkout** | Smooth cart drawer with checkout simulation and order tracking |
| **Queue Display** | Live order status and voice announcements when your order is ready |
| **Player Profiles** | Gamertag authentication and profile portal |

### 🕹️ Retro Arcade Hub
12 browser minigames that earn points and discounts:

`Snake` · `Tetris` · `Pong` · `Breakout` · `Space Invaders` · `Space War` · `Coffee Mario` · `Flappy` · `Minesweeper` · `Memory` · `2048` · `Tic Tac Toe`

### 🏆 Live Leaderboard
- Real-time Hall of Fame across all minigames (Cloud Firestore + local persistence)
- Overall and per-game rankings
- Top 3 podium highlights and current player rank
- Interactive summary on the landing page

### 🛡️ For Staff (Barista & Manager)
- **Live Orders Monitor**: `received` → `preparing` → `ready` → `completed`
- **Menu & Stock Manager**: add, edit, delete items, toggle availability
- **Firebase Config UI**: connect your Firebase project from the dashboard, no code edits

### 🔊 Experience
- Retro sound effects via the **Web Audio API**
- Voice announcements for ready orders
- 3D canvas effects, tilt, parallax, and confetti

---

## 🧱 Tech Stack

| Layer | Technology |
| :-- | :-- |
| **Frontend** | HTML5, modular CSS3, Vanilla JavaScript (SPA-style routing) |
| **Database & Auth** | Firebase Authentication, Cloud Firestore |
| **Offline Fallback** | LocalStorage |
| **Audio** | Web Audio API |
| **Dev Server** | Python 3 (`server.py`, no-cache) |

---

## 🚀 Getting Started

### Prerequisites
Any static file server: Python 3 **or** Node.js.

### Run locally

```bash
# Option 1: Python 3
python3 -m http.server 8080

# Option 2: Project dev server (no-cache)
python3 server.py

# Option 3: Node.js
npx serve .
```

Open **http://localhost:8080** in your browser.

### Quick links

| Page | Path |
| :-- | :-- |
| Store & Arcade | `/` |
| Leaderboard | `/leaderboard/` |
| Player Login | `/playerloginpage.html` |
| Admin Portal | `/admin/` |

---

## 🛡️ Admin Portal

Open `/admin/` or click **Admin** in the navbar.

**Demo credentials (local mode):**

| Field | Value |
| :-- | :-- |
| Email | `admin@insertcoffee.id` |
| Password | `admin123` |

> ⚠️ **Security note:** These credentials are for demo and local development only. Replace them and enable Firebase Authentication before any production deployment.

### Connecting Firebase
1. Open the Admin Portal and go to **Firebase Configuration**.
2. Paste your Firebase Web App credentials.
3. Click **Test Connection**.
4. Click **Seed Default Menu to Cloud Firestore** to populate the catalog in one click.

---

## 🏗️ Architecture

```text
teamproject/
├── index.html                # Main entry: Store, Games, Display, Leaderboard summary
├── leaderboard/index.html    # Dedicated leaderboard page
├── admin/index.html          # Admin portal & cashier dashboard
├── playerloginpage.html      # Gamertag authentication & player profile
├── leaderboard.html          # Redirect alias → leaderboard/
├── admin.html                # Redirect alias → admin/
├── assets/
│   ├── css/                  # Modular stylesheets (style.css imports all)
│   │   ├── base.css          # Design tokens, reset, typography, navbar
│   │   ├── store.css         # Menu, hero, cart drawer, checkout, tracking
│   │   ├── arcade.css        # Arcade hub, game stage, CRT effects
│   │   ├── leaderboard.css   # Hall of fame & podium
│   │   ├── admin.css         # Dashboard, live orders, menu manager
│   │   ├── profile.css       # Profile modal & avatar
│   │   └── player-login.css  # Retro login page
│   └── js/
│       ├── data.js           # Source of truth: PRODUCTS, CATEGORIES, GAMES
│       ├── audio.js          # Web Audio synthesizer
│       ├── store.js          # CartStore, OrderStore, HSStore, UserStore
│       ├── effects.js        # 3D canvas, tilt, parallax, confetti
│       ├── games.js          # Game engine + minigames
│       ├── app.js            # SPA router, cart UI, filters, queue
│       ├── admin.js          # Admin auth, order monitor, catalog manager
│       ├── leaderboard.js    # Leaderboard service & renderer
│       ├── player-login.js   # Login validation & motion
│       └── firebase-config.js# Firebase Auth & Firestore sync
├── server.py                 # Lightweight Python dev server
├── agent.md                  # Agent spec & architectural guidelines
└── README.md
```

### Design principles
- **Modular by default:** one concern per file, shared services reused across the app and admin.
- **Offline-first resilience:** Firestore syncs in real time; LocalStorage keeps everything working if the connection drops.
- **Single source of truth:** products, categories, and games are defined once in `data.js`.

---

## 👥 Team

Built collaboratively by **Team MabiMood**.

| | Name | Role | Focus | Links |
| :-: | :-- | :-: | :-- | :-- |
| <img src="assets/img/team/vigi.jpg" width="52" height="52" style="border-radius:50%;object-fit:cover;"/> | **Vigi Riyantanu** | 👑 Leader | Project Lead, Game Architecture, UI Composer, Fullstack | [Portfolio](portofolio-vigi/) • [GitHub](https://github.com/fujikomilk17) |
| <img src="assets/img/team/nurul.jpg" width="52" height="52" style="border-radius:50%;object-fit:cover;"/> | **Nurul Fitriani** | Member | UI/UX & Creative Design Systems | [Portfolio](portofolio-fitri/) • [LinkedIn](https://www.linkedin.com/in/nurul-fitriani-42ab90421/) |
| <img src="assets/img/team/fahmi.jpg" width="52" height="52" style="border-radius:50%;object-fit:cover;"/> | **Fahmi El Murottal** | Member | Frontend Engineering | [Portfolio](portofolio-fahmi/) • [GitHub](https://github.com/fahmielmurottal-sys) |
| <img src="assets/img/team/jheng.jpg" width="52" height="52" style="border-radius:50%;object-fit:cover;"/> | **Ahmad Azka Ibadillah** | Member | Assets, Content & Quality Assurance | [Portfolio](portofolio-azka/) |

---

## 🗺️ Roadmap

- [x] Coffee & pastry menu with cart and checkout simulation
- [x] 12 retro arcade minigames
- [x] Real-time leaderboard
- [x] Admin portal with live orders and stock management
- [x] Firebase Firestore sync with offline fallback
- [ ] Production-grade admin authentication
- [ ] Real payment gateway integration
- [ ] PWA support (installable, offline cache)
- [ ] Multi-branch / multi-outlet support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please read [`agent.md`](agent.md) for architectural guidelines before contributing.

---

## 📄 License

Add your license here (e.g. MIT) and include a `LICENSE` file in the repository root.

---

<div align="center">

**Made with ☕ and 🕹️ by Team MabiMood**

*Insert coin. Insert coffee. Press start.*

</div>
