# Dynamic Creative Profile & Link Hub - Test Infrastructure (`TEST_INFRA.md`)

## 1. Overview & Architecture

This document describes the test architecture, methodologies, coverage matrices, and execution procedures for the **Dynamic Creative Profile & Link Hub** web application.

The test harness provides **requirement-driven, opaque-box end-to-end verification** designed to validate all 25 features identified in `PROJECT.md` across a rigorous 4-Tier testing pyramid, supporting progressive testability across Milestones M1 through M6.

### Architectural Principles
1. **Opaque-Box & Requirement-Driven**: Tests are designed strictly against system requirements (`ORIGINAL_REQUEST.md`), specifications (`PROJECT.md`), and interface contracts, without dependency on internal implementation quirks.
2. **Zero-Dependency Native Execution**: The test suite runs natively on Node.js (v18+ / v24+) using standard built-ins (`node:assert`, `node:fs`, `node:path`), ensuring instant execution in CI/CD without prerequisite `node_modules` installation.
3. **Progressive Testability**: Features are mapped to milestones (M1–M6). Engineers can execute milestone-scoped suites (`--milestone=M1`) during active development or full regression runs (`node tests/run-all-tests.js`).
4. **Non-Facade Integrity**: Tests strictly assert required files, schema validity, DOM contracts, security boundaries, and runtime behaviors. No trivial mock tests that pass blindly without verifying substance.

---

## 2. The 4-Tier Test Methodology

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 4: Real-World Scenarios (End-to-End Journeys)          │
│ - Complete Visitor Journey (Browse, Audio, Filter, Clean)   │
│ - Complete Owner Journey (Auth, Live WYSIWYG, Save, Refresh)│
│ - Disaster Recovery & JSON Import/Export                    │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Cross-Feature Combinations (Pairwise Matrix)        │
│ - Themes x Layouts Matrix (15 combinations)                 │
│ - Themes x Card Styles Matrix (15 combinations)             │
│ - Audio Playback State x Dynamic Theme Swapping             │
│ - Owner Mode vs Visitor Mode x Link Inactive Visibility     │
│ - Offline Demo PIN (admin123) x Local Storage x Dirty State │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary & Corner Cases                             │
│ - Missing optional fields & empty strings                   │
│ - Extreme length stress (Bio 2000c, Quote 500c, Name 250c)  │
│ - Zero links empty state & 50+ high-volume links            │
│ - URL security & XSS protocol rejection (javascript:, data:)│
│ - Synthetic harmonic oscillation visualizer fallback        │
│ - LocalStorage QuotaExceededError & Incognito resiliency    │
│ - Broken avatar fallback initials generator                 │
│ - Malformed / Corrupted JSON import recovery                │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Feature Coverage (Category-Partition)               │
│ - Features 1 through 25 mapped across 7 categories:         │
│   Toolchain, Static Hosting, CI/CD, Supabase, Schema DDL,   │
│   Offline Fallback, Store, Docs, Canvas, Physics, Theme     │
│   Engine, Theme Switcher, Music Player, Soundwave Visualizer│
│   Streaming Links, Header, Bento Grid, Favorites, Social Hub│
│   Dual-Mode Auth, Live Drawer, WYSIWYG, Save, E2E Pass,     │
│   Adversarial Hardening                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Feature Traceability Matrix (Features 1–25)

| # | Feature | Milestone | Category | Test File | Test Case Name |
|---|---------|-----------|----------|-----------|----------------|
| 1 | Toolchain Scaffolding | M1 | Toolchain | `tier1-feature-coverage.test.js` | `F01: Toolchain Scaffolding - package.json and config files` |
| 2 | Static Hosting Config | M1 | Build | `tier1-feature-coverage.test.js` | `F02: Static Hosting Config - vite.config.js base path` |
| 3 | CI/CD Deploy Workflow | M1 | CI/CD | `tier1-feature-coverage.test.js` | `F03: CI/CD Deploy Workflow - GitHub Pages Actions workflow` |
| 4 | Supabase Client Integration | M1 | Storage | `tier1-feature-coverage.test.js` | `F04: Supabase Client Integration - Safe configuration and client module` |
| 5 | Database Schema DDL | M1 | Database | `tier1-feature-coverage.test.js` | `F05: Database Schema DDL - PostgreSQL schema with 4 tables and RLS` |
| 6 | Offline Seed & Fallback Data | M1 | Storage | `tier1-feature-coverage.test.js` | `F06: Offline Seed & Fallback Data - defaultData.js & dataProvider.js` |
| 7 | Global Reactive Store | M1 | State | `tier1-feature-coverage.test.js` | `F07: Global Reactive Store - useProfileStore.js` |
| 8 | Project Documentation | M1 | Docs | `tier1-feature-coverage.test.js` | `F08: Project Documentation - README.md completeness` |
| 9 | HTML5 Particle Canvas | M2 | Visuals | `tier1-feature-coverage.test.js` | `F09: HTML5 Particle Canvas - Native 2D canvas simulation` |
| 10 | Mouse & Touch Physics | M2 | Visuals | `tier1-feature-coverage.test.js` | `F10: Mouse & Touch Physics - Repulsion, attraction & constellation lines` |
| 11 | Dynamic Theme Engine | M2 | Theming | `tier1-feature-coverage.test.js` | `F11: Dynamic Theme Engine - 5 presets & CSS variables` |
| 12 | Theme Switcher UI | M2 | Theming | `tier1-feature-coverage.test.js` | `F12: Theme Switcher UI - Interactive theme picker` |
| 13 | Embedded Music Player | M3 | Audio | `tier1-feature-coverage.test.js` | `F13: Embedded Music Player - Audio controls & vinyl state` |
| 14 | Soundwave Visualizer | M3 | Audio | `tier1-feature-coverage.test.js` | `F14: Soundwave Visualizer - Animated wave bars with fallback oscillation` |
| 15 | External Streaming Links | M3 | Audio | `tier1-feature-coverage.test.js` | `F15: External Streaming Links - Spotify & YouTube links` |
| 16 | Profile Header & Status | M4 | Profile | `tier1-feature-coverage.test.js` | `F16: Profile Header & Status - Avatar, Bio, Quote, Status pill` |
| 17 | Categorized Links Grid | M4 | Links | `tier1-feature-coverage.test.js` | `F17: Categorized Links Grid - Bento / Stack links layout` |
| 18 | Favorites & Interests Grid | M4 | Content | `tier1-feature-coverage.test.js` | `F18: Favorites & Interests Grid - Categorized cards showcase` |
| 19 | Responsive Viewport & Social Hub | M4 | UI | `tier1-feature-coverage.test.js` | `F19: Responsive Viewport & Social Hub - Mobile adaptivity & footer` |
| 20 | Dual-Mode Authentication | M5 | Auth | `tier1-feature-coverage.test.js` | `F20: Dual-Mode Authentication - Login modal with Demo PIN admin123` |
| 21 | Live Customizer Drawer | M5 | CMS | `tier1-feature-coverage.test.js` | `F21: Live Customizer Drawer - Slide-over drawer with 5 tabs` |
| 22 | Real-time WYSIWYG Preview | M5 | CMS | `tier1-feature-coverage.test.js` | `F22: Real-time WYSIWYG Preview - Direct store state reactivity` |
| 23 | Save & Export Actions | M5 | Storage | `tier1-feature-coverage.test.js` | `F23: Save & Export Actions - Commit, Revert, Reset, JSON Export/Import` |
| 24 | E2E Testing Suite Pass | M6 | QA | `tier1-feature-coverage.test.js` | `F24: E2E Testing Suite Integrity - Non-facade test verification` |
| 25 | Adversarial Coverage Hardening | M6 | Security | `tier1-feature-coverage.test.js` | `F25: Adversarial Coverage Hardening - Sanitization and Stress contracts` |

---

## 4. Test Directory Layout

```
d:/Vscode/PRO/Profile/
├── tests/
│   ├── helpers/
│   │   └── test-utils.js                 # Validation schemas, mock DOM, mock storage, contract validators
│   ├── run-all-tests.js                  # Master test runner with CLI filters & summary reporter
│   ├── tier1-feature-coverage.test.js    # Tier 1: Category-Partition Feature Coverage (Features 1-25)
│   ├── tier2-boundary-corner.test.js     # Tier 2: Boundary & Corner Cases (11 cases)
│   ├── tier3-pairwise-combinations.test.js# Tier 3: Cross-Feature Pairwise Matrix (6 matrices / 50+ combinations)
│   └── tier4-real-world-scenarios.test.js# Tier 4: Real-World Scenarios (Visitor, Owner, Disaster Recovery)
├── TEST_INFRA.md                         # This architecture and coverage specification
└── TEST_READY.md                         # Test readiness signoff declaration
```

---

## 5. Interface Contracts & Verification Mechanisms

### 5.1 ProfileHubData Contract
All profile data must strictly validate against `validateProfileHubData()`:
- `profile`: `name` (string, required), `handle` (string starting with `@`, required), `bio` (string), `quote` (string), `avatarUrl` (string, required).
- `links`: Array of `{ id, title, url, icon, category, order, isActive, highlightColor? }`.
- `favorites`: Array of `{ id, category: 'tech'|'gaming'|'anime'|'music'|'hobbies', title, subtitle?, iconOrImage?, badge?, order }`.
- `music`: `{ title, artist, audioUrl, coverUrl?, spotifyUrl, youtubeUrl, isAutoPlay?, defaultVolume? }`.
- `settings`: `{ themePreset, layoutStyle, cardStyle, particleDensity }`.

### 5.2 Dynamic Theming Contract
- Presets: `cyber-neon`, `midnight-glow`, `lofi-aesthetic`, `clean-minimalist`, `retro-vaporwave`.
- Applied via DOM attribute: `document.documentElement.setAttribute('data-theme', themePreset)`.
- CSS custom properties exposed: `--bg-base`, `--bg-surface`, `--accent-primary`, `--accent-secondary`, `--text-main`, `--text-sub`, `--border-glow`, `--particle-color`.

### 5.3 URL Security & Sanitization
- Rejects dangerous pseudo-protocols: `javascript:`, `data:`, `vbscript:`, `file:`.
- Automatically normalizes plain domains: `github.com/profile` -> `https://github.com/profile`.

### 5.4 Offline PIN Authentication
- Default evaluation PIN: `admin123`.
- Unlocks Owner Mode without requiring cloud Supabase credentials when testing in offline / demo mode.

---

## 6. How to Run Tests

### Run Full Test Suite
```bash
node tests/run-all-tests.js
```

### Run by Specific Tier
```bash
# Run Tier 1 (Feature Coverage)
node tests/run-all-tests.js --tier=1

# Run Tier 2 (Boundary & Corner Cases)
node tests/run-all-tests.js --tier=2

# Run Tier 3 (Cross-Feature Combinations)
node tests/run-all-tests.js --tier=3

# Run Tier 4 (Real-World Scenarios)
node tests/run-all-tests.js --tier=4
```

### Run by Milestone Focus (Progressive Testability)
```bash
# Verify Milestone 1 (Foundation & Toolchain)
node tests/run-all-tests.js --milestone=M1

# Verify Milestone 2 (Visuals & Canvas)
node tests/run-all-tests.js --milestone=M2

# Verify Milestone 3 (Audio & Visualizer)
node tests/run-all-tests.js --milestone=M3

# Verify Milestone 4 (Profile Hub & Bento Links)
node tests/run-all-tests.js --milestone=M4

# Verify Milestone 5 (Owner Auth & Live Customizer)
node tests/run-all-tests.js --milestone=M5
```

### Enable Verbose Stack Traces
```bash
node tests/run-all-tests.js --verbose
```
