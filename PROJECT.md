# Project: Dynamic Creative Profile & Link Hub

## Architecture
The application is a high-performance, single-page creative web application built with **React (Vite) + Tailwind CSS + Framer Motion**, deployed as a static site to GitHub Pages with relative asset resolution (`base: './'`).

### Architectural Layers
1. **Presentation Layer**:
   - `Interactive Particle Canvas`: Native HTML5 Canvas 2D engine with 60fps physics (repulsion, attraction, constellation lines, touch/mouse interaction, theme reactivity).
   - `Visitor View`: Glassmorphic aesthetic profile header, responsive links grid (Bento/Stack), favorites/interests showcase, audio player with soundwave visualizer, theme switcher, and social hub.
   - `Owner Mode & Live Customizer Drawer`: Slide-over WYSIWYG drawer unlocked via Login modal (Supabase Auth / Offline PIN `admin123`) providing real-time background preview and management of all profile data, links, favorites, music, and layout/theme settings.
2. **State & Reactivity Layer**:
   - Centralized reactive store (`useProfileStore.js` via Zustand) maintaining draft state with instant preview reactivity, dirty checking, save, revert, and JSON import/export.
3. **Data & Persistence Layer**:
   - `Storage Provider Pattern` (`dataProvider.js`): Interacts with Supabase (`src/lib/supabase.js`) when environment keys are provided, and automatically falls back to browser `localStorage` with rich default seed data (`src/data/defaultData.js`) when offline or unconfigured.
   - Database schema (`supabase_schema.sql`): PostgreSQL DDL for `profiles`, `links`, `favorites`, `site_settings` with Row Level Security (RLS) and triggers.
4. **CI/CD & Deployment Layer**:
   - `vite.config.js` with `base: './'` for GitHub Pages subfolder asset routing.
   - GitHub Actions workflow (`.github/workflows/deploy.yml`) using official Pages artifact upload and deployment actions.
   - Comprehensive `README.md` documentation.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Toolchain Scaffolding | Vite + React + Tailwind CSS + PostCSS + Framer Motion + Lucide React setup | M1 | spec_miner_survey |
| 2 | Static Hosting Config | `vite.config.js` with `base: './'` and build target | M1 | spec_miner_survey |
| 3 | CI/CD Deploy Workflow | `.github/workflows/deploy.yml` with modern GitHub Pages actions | M1 | spec_miner_survey |
| 4 | Supabase Client Integration | `src/lib/supabase.js` with safe configuration checking (`isSupabaseConfigured`) | M1 | explorer_survey_2 |
| 5 | Database Schema DDL | `supabase_schema.sql` defining profiles, links, favorites, site_settings + RLS | M1 | explorer_survey_2, spec_miner_survey |
| 6 | Offline Seed & Fallback Data | `src/data/defaultData.js` and LocalStorage persistence in `src/lib/dataProvider.js` | M1 | explorer_survey_2 |
| 7 | Global Reactive Store | `src/store/useProfileStore.js` managing live state, dirty tracking, mutators | M1 | explorer_survey_2 |
| 8 | Project Documentation | `README.md` detailing setup, keys configuration, and GitHub Pages activation | M1 | spec_miner_survey |
| 9 | HTML5 Particle Canvas | Native Canvas 2D particle simulation with High-DPI and screen-area scaling | M2 | explorer_survey_1 |
| 10 | Mouse & Touch Physics | Cursor repulsion/attraction and constellation lines with Page Visibility pausing | M2 | explorer_survey_1 |
| 11 | Dynamic Theme Engine | CSS custom properties supporting 5 presets (`cyber-neon`, `midnight-glow`, `lofi-aesthetic`, `clean-minimalist`, `retro-vaporwave`) | M2 | explorer_survey_1 |
| 12 | Theme Switcher UI | Interactive theme picker pill/dropdown with instant zero-reload DOM update | M2 | explorer_survey_1 |
| 13 | Embedded Music Player | Floating/card audio player with Play/Pause, track progress, volume, and vinyl spin | M3 | explorer_survey_1 |
| 14 | Soundwave Visualizer | Animated wave bars with hybrid Web Audio API + synthetic harmonic oscillation | M3 | explorer_survey_1 |
| 15 | External Streaming Links | Direct action buttons to listen on Spotify and YouTube | M3 | explorer_survey_1 |
| 16 | Profile Header & Status | Avatar with glowing aura, Name, Handle, Bio, Quote, and Status badge pill | M4 | explorer_survey_1, explorer_survey_2 |
| 17 | Categorized Links Grid | Responsive Bento/Grid link cards with category filter, Lucide icons, hover effects | M4 | explorer_survey_1, explorer_survey_2 |
| 18 | Favorites & Interests Grid | Organized cards for Tech Stack, Anime, Gaming, and Hobbies | M4 | explorer_survey_1, explorer_survey_2 |
| 19 | Responsive Viewport & Social Hub | Full responsiveness (Mobile, Tablet, Desktop) and footer social links | M4 | explorer_survey_1 |
| 20 | Dual-Mode Authentication | Login modal with Supabase Auth + Offline Demo PIN (`admin123`) & discreet trigger | M5 | explorer_survey_2 |
| 21 | Live Customizer Drawer | Framer Motion slide-over drawer with 5 tabs (Profile, Links, Favorites, Music, Theme) | M5 | explorer_survey_2 |
| 22 | Real-time WYSIWYG Preview | Instant keystroke/toggle preview on main canvas/cards without page reload | M5 | explorer_survey_2 |
| 23 | Save & Export Actions | Commit to storage, Revert unsaved edits, Reset to Defaults, JSON Export/Import | M5 | explorer_survey_2 |
| 24 | E2E Testing Suite Pass | Pass 100% of Tier 1-4 tests published by E2E Testing Track | M6 | spec_miner_survey |
| 25 | Adversarial Coverage Hardening | White-box stress testing and edge-case hardening (Tier 5) | M6 | spec_miner_survey |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Foundation, Toolchain & Shared Data Layer | Package scaffolding, Vite static config (`base: './'`), Tailwind CSS, `supabase.js`, `dataProvider.js`, `defaultData.js`, `useProfileStore.js`, `supabase_schema.sql`, `.github/workflows/deploy.yml`, `README.md` | None | DONE |
| M2 | Creative Visuals Engine & Theme System | Interactive Canvas Particle Background with mouse/touch physics, 5 theme presets (`cyber-neon`, `midnight-glow`, `lofi-aesthetic`, `clean-minimalist`, `retro-vaporwave`), Theme Switcher component | M1 | DONE |
| M3 | Audio Experience & Soundwave Visualizer | Music Player component, hybrid Soundwave Visualizer (Web Audio + synthetic oscillator fallback), spinning vinyl animation, Spotify/YouTube streaming buttons | M1, M2 | DONE |
| M4 | Responsive Visitor Profile Hub & Socials | Profile Header, Links Grid (Bento/Cards), Favorites Section, Social Hub footer with discreet Owner login trigger (Ctrl+Shift+L, padlock icon) | M1, M2 | IN_PROGRESS |
| M5 | Dual-Mode Owner Auth & Live Customizer Drawer | Login Modal (Supabase Auth + Offline PIN `admin123`), Live Customizer Drawer (5 Tabs: Profile, Links CRUD with icon picker, Favorites, Music, Layout & Themes), instant WYSIWYG preview, Save/Revert/Export | M1, M2, M3, M4 | PLANNED |
| M6 | Final Milestone: E2E Test Suite Pass & Adversarial Hardening | Phase 1: 100% Pass of E2E test suite (Tiers 1-4). Phase 2: Adversarial coverage hardening (Tier 5) with Challengers | M1-M5, E2E Track | PLANNED |

---

## Interface Contracts

### Data Provider ↔ UI / Store
```typescript
interface ProfileHubData {
  profile: {
    name: string;
    handle: string;
    bio: string;
    quote: string;
    avatarUrl: string;
    bannerUrl?: string;
    location?: string;
    statusBadge?: string;
  };
  links: Array<{
    id: string;
    title: string;
    url: string;
    icon: string;
    category: string;
    order: number;
    isActive: boolean;
    highlightColor?: string;
  }>;
  favorites: Array<{
    id: string;
    category: 'tech' | 'gaming' | 'anime' | 'music' | 'hobbies';
    title: string;
    subtitle?: string;
    iconOrImage?: string;
    badge?: string;
    order: number;
  }>;
  music: {
    title: string;
    artist: string;
    audioUrl: string;
    coverUrl?: string;
    spotifyUrl: string;
    youtubeUrl: string;
    isAutoPlay?: boolean;
    defaultVolume?: number;
  };
  settings: {
    themePreset: 'cyber-neon' | 'midnight-glow' | 'lofi-aesthetic' | 'clean-minimalist' | 'retro-vaporwave';
    layoutStyle: 'bento' | 'stack' | 'cards';
    cardStyle: 'glassmorphism' | 'neon-border' | 'minimal-flat';
    particleDensity: 'off' | 'low' | 'medium' | 'high';
  };
}

interface DataProvider {
  isSupabaseActive: () => boolean;
  fetchData: () => Promise<ProfileHubData>;
  saveData: (data: ProfileHubData) => Promise<{ success: boolean; source: 'supabase' | 'local' }>;
  resetData: () => Promise<void>;
}
```

### Theme Engine Contract
- DOM attribute: `document.documentElement.setAttribute('data-theme', themePreset)`
- CSS variables exposed:
  - `--bg-base`, `--bg-surface`, `--accent-primary`, `--accent-secondary`, `--text-main`, `--text-sub`, `--border-glow`, `--particle-color`

### Audio Player ↔ Soundwave Visualizer Contract
```typescript
interface SoundwaveProps {
  isPlaying: boolean;
  accentColor?: string;
  audioElementRef?: React.RefObject<HTMLAudioElement>;
  barCount?: number;
}
```

---

## Code Layout
```
d:/Vscode/PRO/Profile/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── audio/
│   │   │   ├── MusicPlayer.jsx
│   │   │   └── SoundwaveVisualizer.jsx
│   │   ├── canvas/
│   │   │   └── ParticleBackground.jsx
│   │   ├── customizer/
│   │   │   ├── LiveCustomizerDrawer.jsx
│   │   │   ├── LoginModal.jsx
│   │   │   ├── ProfileEditorTab.jsx
│   │   │   ├── LinksEditorTab.jsx
│   │   │   ├── FavoritesEditorTab.jsx
│   │   │   ├── MusicEditorTab.jsx
│   │   │   └── LayoutThemeTab.jsx
│   │   ├── links/
│   │   │   ├── LinkCard.jsx
│   │   │   ├── LinksGrid.jsx
│   │   │   └── FavoritesSection.jsx
│   │   ├── profile/
│   │   │   ├── ProfileHeader.jsx
│   │   │   └── SocialHub.jsx
│   │   └── ui/
│   │       ├── ThemeSwitcher.jsx
│   │       ├── GlassCard.jsx
│   │       └── Toast.jsx
│   ├── data/
│   │   └── defaultData.js
│   ├── lib/
│   │   ├── dataProvider.js
│   │   └── supabase.js
│   ├── store/
│   │   └── useProfileStore.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── README.md
├── supabase_schema.sql
├── tailwind.config.js
└── vite.config.js
```
