/**
 * src/data/defaultData.js
 * Authentic Profile & Link Hub Data
 * Pre-populated with Maiddress ( DEV ) configuration from Supabase and user setup.
 */

export const THEME_PRESETS = [
  { id: 'cyber-neon', name: 'Cyber Neon', description: 'High-contrast cyberpunk glow with electric cyan and magenta' },
  { id: 'midnight-glow', name: 'Midnight Glow', description: 'Deep space navy with neon violet and sapphire accents' },
  { id: 'lofi-aesthetic', name: 'Lo-Fi Aesthetic', description: 'Warm retro twilight, sunset peach, and cozy vibes' },
  { id: 'clean-minimalist', name: 'Clean Minimalist', description: 'Sophisticated monochrome slate with crisp typography' },
  { id: 'retro-vaporwave', name: 'Retro Vaporwave', description: '90s nostalgia synth aesthetic with pink and pastel teal' },
];

export const LAYOUT_STYLES = [
  { id: 'bento', name: 'Bento Grid', description: 'Modern asymmetric modular layout' },
  { id: 'stack', name: 'Classic Stack', description: 'Single-column vertical stream' },
  { id: 'cards', name: 'Masonry Cards', description: 'Multi-column balanced grid' },
];

export const CARD_STYLES = [
  { id: 'glassmorphism', name: 'Glassmorphism', description: 'Frosted blur background with subtle translucent border' },
  { id: 'neon-border', name: 'Neon Glow', description: 'Glowing colored aura borders' },
  { id: 'minimal-flat', name: 'Minimal Flat', description: 'Clean solid background with crisp outlines' },
];

export const PARTICLE_DENSITIES = [
  { id: 'off', name: 'Disabled' },
  { id: 'low', name: 'Low (30 particles)' },
  { id: 'medium', name: 'Medium (60 particles)' },
  { id: 'high', name: 'High (100 particles)' },
];

export const FAVORITE_CATEGORIES = [
  { id: 'tech', label: 'Tech Stack & Tools', icon: 'Code' },
  { id: 'gaming', label: 'Gaming & Virtual Worlds', icon: 'Gamepad2' },
  { id: 'anime', label: 'Anime & Cinema', icon: 'Film' },
  { id: 'music', label: 'Music & Audio', icon: 'Music' },
  { id: 'hobbies', label: 'Creative Hobbies', icon: 'Palette' },
];

export const DEFAULT_PROFILE_DATA = {
  profile: {
    name: 'Maiddress ( DEV )',
    handle: '@maiddress_cc',
    bio: `Maiddress = {
"age": 0,
"gender": "Idc",
"mbti": ["INTJ", "INTP"],
"skills": ["Law", "WebDev", "Lua"],
"likes": ["Book", "Quiet", "Code"],
"timezone": "Asia/Bangkok"
}`,
    quote: '"ดูที่ผลก่อนการกระทำ"',
    avatarUrl: './avatar.png',
    bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    location: 'เมืองไทย',
    statusBadge: 'ดูเมะ ไม่ก็ ทำอะไรไปเรื่อย',
    footerCraftedBy: 'Maiddress ( DEV )',
    footerCopyright: 'All rights reserved',
    footerCredits: 'Powered by React, Vite, Tailwind CSS • Hosted on GitHub Pages',
    showFooterCredits: false,
  },
  links: [
    {
      id: '2ab6189c-fdaf-4e68-830b-81d99cccb32e',
      title: 'Github',
      url: 'https://github.com/cssiom-cloud',
      icon: 'Github',
      category: 'project',
      order: 0,
      isActive: true,
      highlightColor: '#00f0ff',
    },
    {
      id: '0abdadcf-ab62-4832-b5d7-a1b00909ac38',
      title: 'Youtube',
      url: 'https://www.youtube.com/channel/UChFfB497R62hL7Sxhuw8OXw',
      icon: 'Youtube',
      category: 'creative',
      order: 1,
      isActive: true,
      highlightColor: '#ff007f',
    },
    {
      id: '0de8bcc4-aadc-4508-8f4f-beab3e319e11',
      title: 'Twitter',
      url: 'https://x.com/xjjsjjj20854',
      icon: 'Twitter',
      category: 'social',
      order: 2,
      isActive: true,
      highlightColor: '#38bdf8',
    },
    {
      id: '87565834-360a-4400-bc7e-243435565082',
      title: 'Facebook',
      url: 'https://www.facebook.com/profile.php?id=61578894628209&locale=th_TH',
      icon: 'Facebook',
      category: 'social',
      order: 3,
      isActive: true,
      highlightColor: '#1877f2',
    },
    {
      id: 'a72fb10b-0135-4f13-b28a-edb55d31c31a',
      title: 'Instagram',
      url: 'https://www.instagram.com/maiddresscodex/',
      icon: 'Instagram',
      category: 'social',
      order: 4,
      isActive: true,
      highlightColor: '#e1306c',
    },
    {
      id: 'b0b80d08-a2d6-4180-adcc-9949ffec7592',
      title: 'Gmail',
      url: 'mailto:kandasuththichesth692@gmail.com',
      icon: 'Mail',
      category: 'work',
      order: 5,
      isActive: true,
      highlightColor: '#ea4335',
    },
  ],
  favorites: [
    {
      id: '57fcb2cf-1ffb-492f-9c00-e2ae3db54d90',
      category: 'gaming',
      title: 'Roblox',
      subtitle: 'เกมทั่วไป',
      iconOrImage: 'Star',
      badge: 'A-tier',
      linkUrl: 'https://www.roblox.com/users/4058677348/profile',
      order: 0,
    },
    {
      id: '8a2ef29d-b61e-48a5-ad4c-a7144a98a367',
      category: 'tech',
      title: 'Discord',
      subtitle: 'maiddress_cc ใช้ทุกวัน',
      iconOrImage: 'Heart',
      badge: 'S-Tier',
      order: 1,
    },
    {
      id: '1d89c8fd-50bd-4da6-b704-2f4cc06e5cf4',
      category: 'gaming',
      title: 'Warno',
      subtitle: 'เกมสงครามวางแผน',
      iconOrImage: 'Gamepad2',
      badge: 'A-Tier',
      order: 2,
    },
    {
      id: 'fd3fd2eb-bb05-4b6a-a5e3-a7266f203a02',
      category: 'anime',
      title: 'Anime',
      subtitle: 'เรื่อง cyberpunk edgerunners นางร้ายมือใหม่ เป็นกำลังใจให้ด้วยนะเจ้าค่ะ',
      iconOrImage: 'Heart',
      badge: 'Favorite',
      order: 3,
    },
    {
      id: '4ad0f7e7-17eb-4c9c-9c58-691ae8d873e0',
      category: 'hobbies',
      title: 'Hobbies',
      subtitle: 'ชอบอ่านหนังสือทั่วไป ไม่เกี่ยวกับเรื่องเรียน และ ชอบหาความรู้ด้านวิจัย',
      iconOrImage: 'Music',
      badge: 'Personal',
      order: 4,
    },
  ],
  music: {
    title: 'PLEASE - Atom ชนกันต์ 【OFFICIAL MV 】',
    artist: 'ชนกันต์ รัตนอุดม',
    audioUrl: './audio/please-atom.mp3',
    coverUrl: './music-cover.png',
    spotifyUrl: 'https://open.spotify.com/track/6p07G2uB42l15vJp6wYy6z',
    youtubeUrl: 'https://www.youtube.com/watch?v=0hVf90v_9bE',
    isAutoPlay: true,
    defaultVolume: 0.1,
  },
  settings: {
    themePreset: 'cyber-neon',
    layoutStyle: 'bento',
    cardStyle: 'glassmorphism',
    particleDensity: 'medium',
    enableEnterScreen: false,
    customColors: {
      primary: '#00f0ff',
      secondary: '#ff007f',
      base: '#090a0f',
      surface: '#10141f',
      surfaceHover: '#181e2e',
      glow: '#00f0ff',
      textMain: '#f1f5f9',
      textSub: '#94a3b8',
    },
  },
};
