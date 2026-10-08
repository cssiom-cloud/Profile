/**
 * src/data/defaultData.js
 * Default Seed Mock Data for Dynamic Creative Profile & Link Hub
 * Pre-populated with rich creative developer content, 6 links, and 9 favorites across 4 categories.
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
    name: 'Alex Rivera',
    handle: '@alexrivera',
    bio: 'Creative Technologist & UI Engineer. Crafting digital realities with code, sound, and interactive canvas aesthetics.',
    quote: '"Dream in algorithms, craft in color, build for the future."',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    location: 'Tokyo & Neo-Metropolis',
    statusBadge: '⚡ Exploring Creative Frontiers',
  },
  links: [
    {
      id: 'link-1',
      title: 'GitHub Repositories',
      url: 'https://github.com',
      icon: 'Github',
      category: 'project',
      order: 0,
      isActive: true,
      highlightColor: '#00f2fe',
    },
    {
      id: 'link-2',
      title: 'X / Twitter Dispatch',
      url: 'https://twitter.com',
      icon: 'Twitter',
      category: 'social',
      order: 1,
      isActive: true,
      highlightColor: '#38bdf8',
    },
    {
      id: 'link-3',
      title: 'LinkedIn Network',
      url: 'https://linkedin.com',
      icon: 'Linkedin',
      category: 'work',
      order: 2,
      isActive: true,
      highlightColor: '#818cf8',
    },
    {
      id: 'link-4',
      title: 'YouTube Creative Lab',
      url: 'https://youtube.com',
      icon: 'Youtube',
      category: 'social',
      order: 3,
      isActive: true,
      highlightColor: '#f43f5e',
    },
    {
      id: 'link-5',
      title: 'Discord Community',
      url: 'https://discord.com',
      icon: 'MessageSquare',
      category: 'social',
      order: 4,
      isActive: true,
      highlightColor: '#a855f7',
    },
    {
      id: 'link-6',
      title: 'Interactive Portfolio',
      url: 'https://example.com',
      icon: 'Globe',
      category: 'project',
      order: 5,
      isActive: true,
      highlightColor: '#10b981',
    },
  ],
  favorites: [
    {
      id: 'fav-1',
      category: 'tech',
      title: 'React & Next.js',
      subtitle: 'Frontend Framework & SSR',
      iconOrImage: 'Code',
      badge: 'Daily Driver',
      order: 0,
    },
    {
      id: 'fav-2',
      category: 'tech',
      title: 'TypeScript',
      subtitle: 'Type Safety & DX Scalability',
      iconOrImage: 'Terminal',
      badge: 'Core',
      order: 1,
    },
    {
      id: 'fav-3',
      category: 'tech',
      title: 'Tailwind CSS',
      subtitle: 'Modern Styling Engine',
      iconOrImage: 'Sparkles',
      badge: 'Speed',
      order: 2,
    },
    {
      id: 'fav-4',
      category: 'tech',
      title: 'Three.js / WebGL',
      subtitle: '3D Creative Code & Shaders',
      iconOrImage: 'Layers',
      badge: 'Passion',
      order: 3,
    },
    {
      id: 'fav-5',
      category: 'gaming',
      title: 'Elden Ring',
      subtitle: 'FromSoftware Masterpiece',
      iconOrImage: 'Gamepad2',
      badge: '100% Cleared',
      order: 4,
    },
    {
      id: 'fav-6',
      category: 'gaming',
      title: 'Cyberpunk 2077',
      subtitle: 'Night City Nomad',
      iconOrImage: 'Gamepad2',
      badge: 'Phantom Liberty',
      order: 5,
    },
    {
      id: 'fav-7',
      category: 'anime',
      title: 'Steins;Gate',
      subtitle: 'Sci-Fi Time Travel Peak',
      iconOrImage: 'Film',
      badge: 'El Psy Kongroo',
      order: 6,
    },
    {
      id: 'fav-8',
      category: 'anime',
      title: 'Cyberpunk: Edgerunners',
      subtitle: 'Studio Trigger Visual Tour',
      iconOrImage: 'Film',
      badge: 'Sandy 2.0',
      order: 7,
    },
    {
      id: 'fav-9',
      category: 'music',
      title: 'Synthwave & Lo-Fi',
      subtitle: 'Night Coding Flow Vibes',
      iconOrImage: 'Music',
      badge: 'Endless Loop',
      order: 8,
    },
  ],
  music: {
    title: 'Synthetic Serenade',
    artist: 'Lofi Tokyo Beats',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80',
    spotifyUrl: 'https://open.spotify.com',
    youtubeUrl: 'https://youtube.com',
    isAutoPlay: false,
    defaultVolume: 0.7,
  },
  settings: {
    themePreset: 'cyber-neon',
    layoutStyle: 'bento',
    cardStyle: 'glassmorphism',
    particleDensity: 'medium',
  },
};
