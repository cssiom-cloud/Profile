# 🗺️ แผนผังโครงสร้างสถาปัตยกรรมเว็บไซต์อย่างละเอียด (System Architecture Blueprint)
**โครงการ:** Dynamic Creative Profile & Link Hub (Maiddress Profile Hub)  
**เทคโนโลยีหลัก:** React 18, Vite, Tailwind CSS, Framer Motion, Zustand, Web Audio API, Canvas 2D, Supabase, IndexedDB

---

## 1. ภาพรวมสถาปัตยกรรมระดับระบบ (System Architecture Overview)

ระบบแบ่งออกเป็น 4 เลเยอร์หลัก: **Presentation Layer (หน้าจอแสดงผล)**, **State Management (ตัวควบคุมสถานะ)**, **Data Persistence & Cache (ระบบจัดเก็บข้อมูล)**, และ **Security & Auth (ระบบความปลอดภัย)**

```mermaid
flowchart TD
    subgraph ClientBrowser["🌐 Client Browser (อุปกรณ์ผู้ใช้ / มือถือ / เดสก์ท็อป)"]
        subgraph PresentationLayer["1. Presentation & UI Layer"]
            Preloader["⚡ SitePreloader\n(หน้าโหลด 0-100% & ปลดล็อกเสียง)"]
            CanvasLayer["✨ ParticleBackground\n(Canvas 2D Interactive Physics)"]
            MainApp["🖥️ Main App View\n(Single Page Application)"]
            Customizer["🛠️ Live Customizer Drawer\n(WYSIWYG Admin CMS)"]
            AuthModal["🔐 Login Modal\n(SHA-256 Owner Access)"]
        end

        subgraph StateLayer["2. Reactive State Management (Zustand)"]
            Store["📦 useProfileStore\n- profile\n- links\n- favorites\n- music\n- settings\n- isOwner / isDirty"]
        end

        subgraph ClientStorage["3. Client-Side Persistent Engines"]
            LocalStorage["💾 LocalStorage\n(JSON State Cache)"]
            SessionStorage["⏱️ SessionStorage\n(Brute-Force Lockout & Session)"]
            IndexedDB["🗄️ IndexedDB (mediaStorage)\n(ไฟล์เสียง MP3 / รูปภาพขนาดใหญ่)"]
        end
    end

    subgraph CloudLayer["☁️ Cloud & Hosting Infrastructure"]
        GH["🚀 GitHub Pages\n(Static Web Hosting)"]
        Supa["⚡ Supabase Backend (Cloud Database)\n- PostgreSQL Tables\n- Row Level Security (RLS)\n- Cloud Auth"]
        CDN["🎵 External Streaming & CDNs\n(Spotify / YouTube / Google Fonts)"]
    end

    GH -->|เสิร์ฟไฟล์ HTML/JS/CSS| MainApp
    PresentationLayer <-->|Subscribe & Mutate| Store
    Store <-->|Load / Sync / Save| LocalStorage
    Store <-->|Stream / Blob Cache| IndexedDB
    Store <-->|REST API / Realtime Sync| Supa
    PresentationLayer -.->|Audio Links| CDN
    AuthModal -->|Rate Limit Track| SessionStorage
```

---

## 2. แผนผังลำดับชั้นของคอมโพเนนต์ (Component Hierarchy Tree)

แผนภาพแสดงโครงสร้าง DOM และการจัดวางคอมโพเนนต์ภายใน [`src/App.jsx`](file:///d:/Vscode/PRO/Profile/src/App.jsx) ตั้งแต่ระดับ Root จนถึงคอมโพเนนต์ย่อย

```mermaid
flowchart TD
    Root["App.jsx (Root Application)"]

    %% Background & Preloader
    Root --> BG["✨ ParticleBackground\n(Interactive 2D Canvas Physics)"]
    Root --> Preload["⚡ SitePreloader\n(Progress Bar & Audio Unlocker)"]

    %% Top Bar
    Root --> TopBar["👑 Owner Top Bar (เฉพาะเจ้าของเมื่อ Login)"]
    TopBar --> ThemePills["🎨 ThemeSwitcher (Pills variant)"]
    TopBar --> EditBtn["✏️ Edit Hub Button"]
    TopBar --> LogoutBtn["🚪 Logout Button"]

    %% Main Card
    Root --> Container["📦 Main Layout Container"]
    Container --> Header["👤 ProfileHeader"]
    Container --> Player["🎵 MusicPlayer"]
    Container --> Links["🔗 LinksGrid"]
    Container --> Favs["⭐ FavoritesSection"]
    Container --> Social["🌐 SocialHub (Footer & Discreet Lock)"]

    %% Header Sub-elements
    Header --> Banner["🖼️ Hero Banner (Gradient / Image)"]
    Header --> Avatar["🟣 Glowing Avatar (avatar.png / Monogram)"]
    Header --> Badges["🏷️ Verified Badge & Location Pill"]
    Header --> Bio["💻 ColoredBio (Lua / JSON Syntax Highlighter)"]
    Header --> Quote["💬 Personal Quote Block"]

    %% Music Sub-elements
    Player --> Vinyl["💽 Vinyl Record (Spinning Disc & Tonearm)"]
    Player --> Soundwave["📊 SoundwaveVisualizer (Web Audio / Fallback)"]
    Player --> Controls["⏯️ Audio Controls (Play/Seek/Vol/Mute)"]
    Player --> ExtLinks["↗️ Spotify & YouTube Streaming Buttons"]

    %% Links Sub-elements
    Links --> FilterTabs["🗂️ Category Filter Tabs (All/Social/Projects/Work)"]
    Links --> LinkCards["🎴 LinkCard Component (Bento / Stack / Cards)"]

    %% Favorites Sub-elements
    Favs --> FavBadges["🏷️ Category Badges (Tech/Gaming/Anime/Hobbies)"]
    Favs --> FavCards["🃏 Favorite Cards (Tiers S/A/B)"]
    Favs -.-> FavModal["🔍 FavoriteDetailModal (Expanded View)"]

    %% Modals & CMS
    Root --> Login["🔐 LoginModal (SHA-256 Protected)"]
    Root --> Drawer["🛠️ LiveCustomizerDrawer (Slide-Over Panel)"]
    Root --> CropModal["✂️ ImageCropModal (HTML5 Canvas Image Cropper)"]

    %% Drawer Tabs
    Drawer --> Tab1["1. ProfileEditorTab (Bio, Avatar, Banner, Passwords)"]
    Drawer --> Tab2["2. LinksEditorTab (CRUD, Icons, Reorder)"]
    Drawer --> Tab3["3. FavoritesEditorTab (CRUD, Tiers, Notes)"]
    Drawer --> Tab4["4. MusicEditorTab (Audio Upload, Track Info)"]
    Drawer --> Tab5["5. LayoutThemeTab (5 Themes, 3 Layouts)"]
    Drawer --> DrawerFooter["💾 Footer (Save, Revert, Reset, Export/Import)"]
```

---

## 3. สถาปัตยกรรมข้อมูลและการซิงค์ (Data Flow & Persistence Pipeline)

ระบบใช้กลยุทธ์ **3-Tier Cascade Fallback** ร่วมกับ **Hybrid Local + Cloud Storage**:

```mermaid
sequenceDiagram
    autonumber
    actor User as ผู้เข้าชม / เจ้าของเว็บ
    participant App as Web App (React)
    participant Store as useProfileStore (Zustand)
    participant Provider as dataProvider.js
    participant IDB as IndexedDB (Media Storage)
    participant Local as LocalStorage
    participant Supa as Supabase Cloud

    User->>App: เปิดหน้าเว็บ (Page Load)
    App->>Store: loadInitialData()
    Store->>Provider: fetchData()

    alt เชื่อมต่อ Supabase สำเร็จ
        Provider->>Supa: Query profiles, links, favorites, settings (Timeout 3.5s)
        Supa-->>Provider: ส่งข้อมูล Cloud
        Provider->>IDB: ดึงรูปภาพ/ไฟล์เสียงขนาดใหญ่
        IDB-->>Provider: คืนค่า Object URLs
        Provider->>Local: แคชข้อมูลล่าสุดลงเครื่อง
    else ออฟไลน์ หรือ ไม่ได้ใส่ Supabase API Keys
        Provider->>Local: ดึงข้อมูลจาก LocalStorage
        alt มีข้อมูลในเครื่อง
            Local-->>Provider: คืนค่า Cached State
            Provider->>Provider: ตรวจสอบและ Migration ข้อมูลเก่าอัตโนมัติ
        else เปิดเว็บครั้งแรก / เครื่องใหม่
            Provider->>Provider: ใช้ DEFAULT_PROFILE_DATA (Maiddress Profile)
        end
    end

    Provider-->>Store: อัปเดตข้อมูลเข้า Zustand Store
    Store-->>App: Render หน้าเว็บแบบเรียลไทม์ (WYSIWYG)
```

---

## 4. แผนผังการทำงานระบบสิทธิ์และความปลอดภัย (Owner vs Visitor Flow)

เว็บมีระบบแบ่งสิทธิ์แบบ **Dual-Mode Architecture** ชัดเจน:

```mermaid
flowchart TD
    Visitor["👤 ผู้เข้าชมทั่วไป (Visitor)"]
    Owner["👑 เจ้าของเว็บ (Owner)"]

    Visitor --> V1["ดูโปรไฟล์ ฟังเพลง สลับธีมได้"]
    Visitor --> V2["กดลิงก์ไปยัง Instagram, Gmail, Discord"]
    Visitor --> V3["กดดูรายละเอียดสิ่งที่ชอบ (Favorite Modal)"]
    Visitor --> V4["ไม่มีปุ่มแก้ไข ไม่มีแถบ Admin ให้รบกวนสายตา"]

    Visitor -.->|กดปุ่มกุญแจที่ท้ายเว็บ หรือ กด Ctrl+Shift+L| LoginScreen["🔐 LoginModal"]

    LoginScreen --> CheckLock{"ตรวจสอบสถานะ Lockout\n(Brute-Force Rate Limit)"}
    CheckLock -->|ใส่รหัสผิดเกิน 5 ครั้ง| Lockout["⛔ ระงับการเข้าสู่ระบบ 60 วินาที"]
    CheckLock -->|ป้อน Username & Password| Hash["⚙️ แปลงรหัสผ่านด้วย Web Crypto SHA-256"]

    Hash --> Verify{"ตรวจสอบกับรหัสเจ้าของ"}
    Verify -->|ไม่ถูกต้อง| IncAttempt["บันทึก Failed Attempt (+1)"]
    Verify -->|ถูกต้อง| Grant["✅ อนุมัติสิทธิ์ isOwner: true"]

    Grant --> Owner
    Owner --> O1["เปิดแถบ Live Customizer Drawer"]
    Owner --> O2["แก้ไขข้อมูล / เพิ่มลบลิงก์ แบบ Live Preview"]
    Owner --> O3["อัปโหลดเพลง MP3 / รูป Avatar / Banner"]
    Owner --> O4["เปลี่ยนรหัสผ่านเจ้าของใน Profile Tab"]
    Owner --> O5["บันทึกข้อมูล (Save) หรือ สำรองไฟล์ JSON"]
```

---

## 5. ตารางสรุปโมดูลสำคัญและตำแหน่งไฟล์

| โมดูล (Module) | ไฟล์หลัก (File Path) | หน้าที่และความรับผิดชอบหลัก |
| :--- | :--- | :--- |
| **Main Orchestrator** | [`src/App.jsx`](file:///d:/Vscode/PRO/Profile/src/App.jsx) | ควบคุมแอปพลิเคชันหลัก, จัดการ Preloader, สลับโหมด Owner/Visitor |
| **Header Identity** | [`src/components/profile/ProfileHeader.jsx`](file:///d:/Vscode/PRO/Profile/src/components/profile/ProfileHeader.jsx) | แสดง Avatar ไฟนีออน, Monogram Fallback, Handle, สถานะ, คำคม |
| **Interactive Bio** | [`src/components/profile/ColoredBio.jsx`](file:///d:/Vscode/PRO/Profile/src/components/profile/ColoredBio.jsx) | แสดง Bio โค้ดสไตล์ Lua/JSON พร้อมระบบเน้นสี Syntax Highlight |
| **Audio Turntable** | [`src/components/audio/MusicPlayer.jsx`](file:///d:/Vscode/PRO/Profile/src/components/audio/MusicPlayer.jsx) | เล่นเพลง HTML5/Web Audio, แผ่นเสียงหมุน, เข็มเล่นเพลง, ปุ่มสตรีมมิ่ง |
| **Soundwave** | [`src/components/audio/SoundwaveVisualizer.jsx`](file:///d:/Vscode/PRO/Profile/src/components/audio/SoundwaveVisualizer.jsx) | คลื่นเสียงตอบสนองต่อจังหวะเพลง พร้อมระบบ Harmonic Fallback |
| **Links Engine** | [`src/components/links/LinksGrid.jsx`](file:///d:/Vscode/PRO/Profile/src/components/links/LinksGrid.jsx) | เลย์เอาต์ลิงก์ Bento Grid / Classic Stack / Masonry Cards |
| **Favorites Hub** | [`src/components/links/FavoritesSection.jsx`](file:///d:/Vscode/PRO/Profile/src/components/links/FavoritesSection.jsx) | การ์ดสิ่งที่ชอบแบ่งตามหมวดหมู่ พร้อมแท็กระดับ Tier (S/A/B) |
| **Canvas Background**| [`src/components/canvas/ParticleBackground.jsx`](file:///d:/Vscode/PRO/Profile/src/components/canvas/ParticleBackground.jsx) | จำลองฟิสิกส์อนุภาค 2D โต้ตอบกับเมาส์และการสัมผัสบนมือถือ |
| **WYSIWYG Drawer** | [`src/components/customizer/LiveCustomizerDrawer.jsx`](file:///d:/Vscode/PRO/Profile/src/components/customizer/LiveCustomizerDrawer.jsx)| ถาดปรับแต่งสด 5 แท็บ พร้อมระบบตรวจจับ `isDirty` |
| **Security Engine** | [`src/lib/auth.js`](file:///d:/Vscode/PRO/Profile/src/lib/auth.js) | ระบบความปลอดภัย SHA-256 Hashing, Brute-Force Rate Limiting |
| **Data Cascade** | [`src/lib/dataProvider.js`](file:///d:/Vscode/PRO/Profile/src/lib/dataProvider.js) | สถาปัตยกรรมกู้คืนและแคชข้อมูล 3 ระดับ (Supabase -> Local -> Seed) |
| **Large Media Engine**| [`src/lib/mediaStorage.js`](file:///d:/Vscode/PRO/Profile/src/lib/mediaStorage.js) | จัดเก็บไฟล์เสียง MP3 และภาพ HD ใน IndexedDB ไม่กิน Quota |
| **Default Seed Data**| [`src/data/defaultData.js`](file:///d:/Vscode/PRO/Profile/src/data/defaultData.js) | ข้อมูลเริ่มต้นมาตรฐานของ Maiddress (DEV) เมื่อเปิดเว็บครั้งแรก |
