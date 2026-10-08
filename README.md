# Creative Profile & Link Hub

A dynamic, high-performance personal profile and link hub built with **React (Vite) + Tailwind CSS + Framer Motion**, hosted statically on GitHub Pages with an interactive HTML5 canvas particle background, embedded music player with soundwave visualizer, 5 theme presets, and a dual-mode live customizer (WYSIWYG CMS drawer) backed by Supabase with seamless offline LocalStorage fallback.

---

## ✨ Features

- **Interactive Canvas Particle Background**: Pure HTML5 Canvas 2D engine operating at 60 FPS with mouse/touch repulsion, attraction, and constellation lines.
- **5 Aesthetic Theme Presets**: Switch instantly with zero page reload between `Cyber Neon`, `Midnight Glow`, `Lo-Fi Aesthetic`, `Clean Minimalist`, and `Retro Vaporwave`.
- **Embedded Audio Player & Soundwave**: Music player with Play/Pause, track progress, volume, animated soundwave visualizer, and Spotify/YouTube links.
- **Dual-Mode Architecture**:
  - **Visitor View**: Clean, elegant read-only profile showcase without distracting edit buttons.
  - **Owner Mode & Live Customizer**: Slide-over drawer unlocked via Supabase Auth or Offline PIN (`admin123`) or discreet shortcut (`Ctrl + Shift + L`). Real-time keystroke preview of profile details, links, favorites, audio settings, and layout styling.
- **Supabase Integration & Offline Fallback**: Syncs to PostgreSQL tables (`profiles`, `links`, `favorites`, `site_settings`) when credentials exist, and gracefully falls back to browser `localStorage` when offline or unconfigured.
- **GitHub Pages Ready**: Configured with `base: './'` and automated GitHub Actions workflow (`.github/workflows/deploy.yml`).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js `18.x` or higher (verified on Node `v24.x`)
- npm `9.x` or higher

### Installation & Run
```bash
# 1. Clone repository
git clone <repository-url>
cd Profile

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:3000` in your web browser.

---

## ⚙️ Configuration & Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Required? |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://xyz.supabase.co`) | Optional (Offline fallback active if omitted) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public API key | Optional (Offline fallback active if omitted) |

> 💡 **Offline Mode**: If `.env` is omitted or left empty, the application runs 100% locally using `localStorage` and rich seed data. You can log in using the demo PIN `admin123` to test all live customization features without creating a Supabase account.

---

## 🗄️ Supabase Database Setup (Optional)

To enable cloud persistence:
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the entire contents of `supabase_schema.sql`.
4. Copy the Project URL and Anon Key into your `.env` file.

---

## 🌐 Deploy to GitHub Pages

This project is pre-configured with modern GitHub Actions Pages deployment:

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: setup creative profile hub"
   git push origin main
   ```
2. In your GitHub repository:
   - Navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Push to `main` branch or trigger the workflow manually under **Actions** > **Deploy to GitHub Pages**.
4. Your site will be live at `https://<username>.github.io/<repo>/` with zero 404 relative path errors.

---

## 🛠️ Build Commands

```bash
# Compile and build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 📁 Project Structure

```
├── .github/workflows/deploy.yml   # GitHub Pages deployment pipeline
├── public/
│   └── favicon.svg                # Creative vector favicon
├── src/
│   ├── components/                # UI, Audio, Canvas, Customizer, Links, Profile
│   ├── data/
│   │   └── defaultData.js         # Offline seed data
│   ├── lib/
│   │   ├── dataProvider.js        # Universal storage adapter (Supabase + LocalStorage)
│   │   └── supabase.js            # Safe Supabase JS client
│   ├── store/
│   │   └── useProfileStore.js     # Zustand state store with live preview & dirty tracking
│   ├── App.jsx                    # Root view orchestrator
│   ├── index.css                  # CSS custom properties for 5 themes & glassmorphism
│   └── main.jsx                   # React 18 DOM mount
├── .env.example                   # Environment variables template
├── .gitignore                     # Git exclusions
├── index.html                     # HTML root with fonts & viewport
├── package.json                   # Dependencies & scripts
├── postcss.config.js              # PostCSS Tailwind config
├── README.md                      # Project documentation
├── supabase_schema.sql            # PostgreSQL DDL with RLS policies & seed
├── tailwind.config.js             # Tailwind CSS theme mappings
└── vite.config.js                 # Vite config with base: './'
```

---

## 📄 License
MIT
