# Design System: Wisdom UI — Minecraft Pixel Characters

## 1. Visual Theme & Atmosphere

A nostalgic yet premium pixel-art interface that channels the blocky charm of Minecraft while maintaining sophisticated interaction design. The atmosphere is **playful-crafty** — like a digital tabletop where legendary thinkers gather as collectible pixel figurines. Each character is a hand-crafted CSS box-shadow pixel sprite standing on a floating island stage. Density sits at 4 (balanced breathing room), Variance at 7 (asymmetric character placement with staggered heights), Motion at 8 (perpetual idle animations, spring-physics reactions).

The visual language fuses 8-bit pixel precision with modern CSS animation — pixel characters breathe, bounce, and react with spring physics, creating a living diorama of wisdom. The canvas is dark, textured with subtle noise grain, making the pixel characters glow like embers in a crafting furnace.

## 2. Color Palette & Roles

### Base Surfaces
- **Obsidian Deep** (#0F0F13) — Primary background, deep dark with warm undertone
- **Cave Stone** (#1A1A24) — Card/surface fill, slightly lighter dark
- **Bedrock** (#252533) — Hover states, elevated surfaces
- **Gravel Mist** (#3A3A4D) — Borders, structural lines

### Character Identity Colors (per agent)
- **Jobs Black** (#18181B) — Steve Jobs, turtleneck silhouette
- **Musk Cyan** (#06B6D4) — Elon Musk, rocket flame accent
- **Sunzi Crimson** (#DC2626) — 孙子, war banner red
- **Confucius Violet** (#7C3AED) — 孔子, scholarly purple
- **Graham Emerald** (#059669) — Paul Graham, YC green
- **Andreessen Amber** (#D97706) — Marc Andreessen, silicon gold
- **Inamori Rose** (#DB2777) — 稻盛和夫, sakura pink
- **Yangming Teal** (#0891B2) — 王阳明, ink-wash blue
- **Mao Vermillion** (#EF4444) — 毛泽东, revolutionary red
- **Laotzu Sage** (#65A30D) — 老子, nature green

### Functional
- **Pixel White** (#F0F0F0) — Primary text on dark, never pure white
- **Stone Gray** (#9CA3AF) — Secondary text, metadata
- **Ender Glow** (rgba(99,102,241,0.15)) — Active/focus ring, subtle indigo
- **XP Bar Green** (#22C55E) — Success states, streaming indicator

### Banned
- No pure black (#000000) — always use Obsidian Deep
- No neon outer glow — pixel characters use inner shadow depth
- No purple/blue neon aesthetic — character colors are identity-driven, not decorative
- No gradient text on large headers

## 3. Typography Rules

- **Display:** `Press Start 2P` — Pixel-perfect Minecraft headline font, track-tight, used for character names and board title only
- **Body:** `Geist` — Clean modern sans-serif for role descriptions and chat content, relaxed leading
- **Mono:** `Geist Mono` — For timestamps, agent IDs, technical metadata
- **Pixel Size Scale:** 8px base unit (1px = 1 Minecraft pixel at 1x, rendered at 8px for visibility)
- **Banned:** Inter, generic system serif fonts. No font below 10px for readability.

## 4. Component Stylings

### Pixel Character (Core Component)
- **Size:** 64px × 64px base (8×8 pixel grid at 8px scale)
- **Technique:** CSS box-shadow pixel art on a single 8px × 8px element
- **Shadow:** Inner pixel-depth via `box-shadow` layers, no outer glow
- **Base Platform:** 80px × 16px floating island with grass-top gradient
- **Name Tag:** `Press Start 2P`, 10px, centered below platform, character identity color
- **Role Label:** `Geist`, 11px, Stone Gray, below name tag

### Character States
- **Idle:** Perpetual 3s breathing animation (translateY ±2px, spring ease)
- **Hover:** Scale 1.08, character color intensifies, platform emits soft glow, name tag brightens
- **Active/Speaking:** Bounce animation (translateY -8px), speech bubble appears, XP bar fills
- **Click:** Jump-spin (360° rotate + translateY -16px), particle burst effect
- **Drag:** Ghost trail (opacity 0.3 afterimage), character follows cursor with spring lag

### Speech Bubble
- **Shape:** Pixel-perfect rounded rectangle with triangular pointer
- **Background:** Cave Stone with 1px Gravel Mist border
- **Text:** Geist, 13px, Pixel White, max-width 240px
- **Animation:** Typewriter effect for streaming text, spring entrance

### Floating Island Platform
- **Top:** Grass gradient (character identity color → dark green)
- **Body:** Stone texture via repeating pixel gradient
- **Bottom:** Bedrock shadow, slight float animation (translateY ±1px, 4s)
- **Shadow:** Diffused below, rgba(0,0,0,0.3), blur 8px

### Board Layout
- **Grid:** CSS Grid, asymmetric columns — not equal 3-column
- **Gap:** 32px between characters, breathing room
- **Background:** Obsidian Deep with subtle noise grain (fixed pseudo-element)
- **Container:** max-width 1200px centered

## 5. Layout Principles

- **Asymmetric Grid:** Characters arranged in staggered rows, not a rigid matrix. Front row 4, back row 3, balcony row 3 — like theater seating
- **Vertical Rhythm:** Characters at varying heights (front row lower, back row elevated via translateY)
- **No Overlapping:** Each character + platform occupies its own clean spatial zone
- **Single Column Collapse (< 768px):** Characters stack vertically, horizontal scroll banned
- **Touch Targets:** Minimum 44px × 44px for all interactive character areas
- **Max-Width Containment:** 1200px centered, characters never stretch full-width
- **CSS Grid over Flexbox:** Use grid-template-areas for character placement

## 6. Motion & Interaction

### Spring Physics
- **Default:** `stiffness: 180, damping: 12` — snappy Minecraft feel, slightly bouncy
- **Idle Breathing:** 3s infinite, translateY ±2px, spring ease-in-out
- **Platform Float:** 4s infinite, translateY ±1px, gentle sine wave

### Mouse Reactions
- **Hover Enter:** Scale 1.08 over 200ms spring, color saturation +20%
- **Hover Leave:** Scale 1.0 over 300ms spring, color returns
- **Click:** Jump-spin sequence — translateY -16px + rotate 360° over 500ms, then land with 150ms squash (scaleY 0.9, scaleX 1.1), then recover
- **Double-Click:** Special reaction per character (Jobs: shakes head, Musk: rocket boost, Sunzi: sword slash, etc.)
- **Drag Start:** Character follows cursor with 50ms spring lag, ghost trail
- **Drag End:** Character snaps back to position with overshoot bounce

### Streaming Animation
- **Speaking Character:** Bounce idle, speech bubble typewriter, XP bar fills left-to-right
- **Non-Speaking:** Subtle attention turn (slight rotateY toward speaker)

### Performance
- Animate exclusively via `transform` and `opacity`
- Never animate `top`, `left`, `width`, `height`
- Grain/noise on fixed pseudo-element only
- `will-change: transform` on character containers
- `contain: layout style paint` on each character cell

## 7. Anti-Patterns (Banned)

- No emojis in UI text — use pixel art icons instead
- No Inter font — `Press Start 2P` + `Geist` only
- No pure black (#000000) — always Obsidian Deep (#0F0F13)
- No neon outer glow on characters — inner pixel depth only
- No equal 3-column card grid — asymmetric theater layout
- No generic placeholder names — use actual wisdom team member names
- No fake metrics or statistics — only real agent output
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash")
- No filler UI text ("Click to interact", "Hover me")
- No circular spinners — use pixel-art loading animations (spinning pickaxe, etc.)
- No overlapping elements — clean spatial separation always
- No custom mouse cursors — use CSS cursor states only
- No broken image links — all visuals are pure CSS pixel art
- No `LABEL // YEAR` formatting
- No gradient text on large headers
