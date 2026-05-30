# Design System: CanvasDocs

## 1. Visual Theme & Atmosphere

CanvasDocs' interface is a document structure terminal — a canvas-based tool for organizing prompts, roadmaps, and documentation. The environment is built on deep navy-black surfaces (`#0d1117`) with a faint teal-blue atmospheric glow that gives the darkness depth and directionality. This is not a marketing page — it is a document architecture instrument, and every design decision reinforces that identity.

The primary action color is a bold electric blue (`#3b6ef8`), used exclusively for high-stakes actions: "Add Node," "Create Snapshot," "Export Canvas." These are the moments of structural transformation, and the blue reads as "execute." Alongside this sits an emerald green (`#22c55e`) used purely for validation success, active states, and connection confirmation — the green checkmark for valid structures. The contrast between blue (action) and green (trust/verification) is the core visual grammar of the interface.

A distinctive serif italic font — a humanist oldstyle face — appears exclusively on modal titles ("Export Canvas," "Snapshot Comparison") and special state headings, creating a moment of ceremonial gravitas inside the otherwise monospace-and-sans environment. This typographic rupture signals: *this interaction matters*. All other UI text operates in a clean sans-serif (Inter or system-ui), with heavy use of uppercase monospace labels for structural metadata and technical field identifiers.

The background is never flat — a large radial dark gradient creates an off-center atmospheric glow that adds dimensionality to the canvas without distracting from content. Node cards use solid surfaces with colored accent borders, modals overlay with frosted-dark backgrounds, and validation panels use semantic tints for status communication.

**Key Characteristics:**
- Deep navy-black canvas (`#0d1117`) with subtle radial atmospheric glow — not flat black
- Dual-accent system: Electric Blue (`#3b6ef8`) for execution actions, Emerald Green (`#22c55e`) for trust/validation states
- Serif italic intrusion: humanist italic for modal/ceremony titles, sans for everything else
- Uppercase monospace field labels and structural metadata throughout
- Colored node type borders (emerald for sections, blue for headings, violet for paragraphs, amber for code)
- Green-tinted validation success banner, red-tinted for errors
- Zero-server design philosophy: UI constantly reminds users "all data stored locally"
- Warm amber (`#f59e0b`) for advisory/warning highlights and focus mode indicators

## 2. Color Palette & Roles

### Primary Actions
- **Electric Blue** (`#3b6ef8`): The core execution color — used for all primary CTA buttons: Add Node, Create Snapshot, Export Canvas. This is the "commit operation" signal. Used as solid fill with white text.
- **Blue Hover** (`#2d5ce8`): Slightly deeper blue for hover states on primary CTAs.
- **Blue Glow** (`rgba(59, 110, 248, 0.15)`): Diffused blue used for input focus rings and subtle active-state tints.

### Trust & Validation States
- **Emerald Active** (`#22c55e`): The valid/connected signal — used for validation success checkmarks, "VALID" status badge, and active connection indicators. Green = structure confirmed.
- **Validation Success Green** (`rgba(20, 83, 45, 0.4)`): The deep green background tint of valid structure panels.
- **Emerald Glow** (`rgba(34, 197, 94, 0.2)`): Used for progress indicators and subtle green accent backgrounds.

### Surface & Background
- **Abyss Navy** (`#0d1117`): The primary page canvas — a deep navy-black with visible blue undertone.
- **Card Surface** (`#161b22`): Primary card and container background — one shade lighter than Abyss Navy.
- **Elevated Surface** (`#1c2128`): Secondary elevation — input fields, code blocks, and inner containers.
- **Modal Overlay** (`rgba(0, 0, 0, 0.72)`): Full-screen modal backdrop, semi-transparent with slight blur.

### Borders & Dividers
- **Standard Border** (`#30363d`): The primary containment border for cards and panels.
- **Subtle Border** (`#21262d`): Very faint inner borders and section dividers.
- **Input Border** (`#30363d`): Form field borders in resting state.
- **Input Focus Border** (`#3b6ef8`): Electric blue border on focused inputs.

### Node Type Colors
- **Section Node** (`#22c55e`): Emerald green border accent
- **Heading Node** (`#3b6ef8`): Electric blue border accent
- **Paragraph Node** (`#8b5cf6`): Violet border accent
- **Code Node** (`#f59e0b`): Amber border accent
- **List Node** (`#ec4899`): Pink border accent

### Text
- **Primary White** (`#e6edf3`): Main body text on dark surfaces.
- **Secondary Gray** (`#8b949e`): Supporting text, subtitles, field descriptions.
- **Monospace Muted** (`#6e7681`): De-emphasized metadata text in code/mono contexts.
- **Pure White** (`#ffffff`): Buttons text on blue CTAs, highest-emphasis labels.
- **Label Uppercase** (`#7d8590`): Uppercase field labels and section identifiers.

### Semantic & Special
- **Warning Amber** (`#f59e0b`): Advisory call-outs and focus mode indicators.
- **Danger Red** (`#f87171`): Validation errors, orphaned nodes, circular dependencies.
- **Info Teal** (`rgba(59, 130, 246, 0.15)`): Subtle info panel backgrounds.
- **Code Cyan** (`#58c4dc`): Inline code highlights and algorithm strings.
- **Hash Green** (`#3fb950`): Cryptographic hash strings and fingerprint values.

### Gradient & Atmosphere
- **Page Radial Glow**: `radial-gradient(ellipse at 30% 20%, rgba(30, 50, 80, 0.6) 0%, transparent 60%)`
- **Connection Line Gradient**: From node color to target node color with opacity

## 3. Typography Rules

### Font Families
- **Primary UI (Sans)**: `Inter`, fallbacks: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Modal/Ceremony (Serif Italic)**: `Georgia`, fallbacks: `'Times New Roman', 'Palatino Linotype', serif` — used *only* in italic style for modal titles
- **Monospace (Technical)**: `'SFMono-Regular'`, fallbacks: `'SF Mono', Menlo, Monaco, Consolas, monospace`

### Hierarchy

| Role | Font | Style | Size | Weight | Notes |
|------|------|-------|------|--------|-------|
| Modal Title / Ceremony | Georgia | Italic | 22–24px | 400 | "Export Canvas", "Snapshot Comparison" |
| App Name / Brand | Inter | Normal | 20px | 600 | "CanvasDocs" wordmark |
| Section Heading | Inter | Normal | 18–20px | 600 | Panel section headings |
| Node Title | Inter | Normal | 14px | 600 | Node card titles |
| Body / Standard | Inter | Normal | 14–15px | 400 | Descriptions, content |
| Button Text | Inter | Normal | 14–15px | 500–600 | CTA and action buttons |
| Field Label | SFMono | Uppercase | 11–12px | 600 | NODE TYPE, CONTENT, etc. |
| Monospace Body | SFMono | Normal | 12–13px | 400 | Hashes, IDs, timestamps |

## 4. Component Stylings

### Buttons

**Primary Blue CTA (Execute Action)**
- Background: Electric Blue (`#3b6ef8`)
- Text: Pure White (`#ffffff`), Inter, 14px, weight 600
- Padding: 10px 20px
- Border: none
- Radius: 8px
- Hover: Blue Hover (`#2d5ce8`), slight `transform: translateY(-1px)`
- Box Shadow: `0 4px 12px rgba(59, 110, 248, 0.3)`

**Ghost / Secondary (Neutral Action)**
- Background: `#21262d`
- Text: Primary White (`#e6edf3`), Inter, 14px, weight 500
- Padding: 8px 16px
- Border: `1px solid #30363d`
- Radius: 8px
- Hover: Border shifts to `#484f58`

**Icon-prefixed Action Button**
- Same as Primary Blue CTA but prefixed with emoji (⚡ 📦 🔍)
- Emoji adds visual weight and intent signal before text

### Cards & Containers

**Standard Panel**
- Background: Card Surface (`#161b22`)
- Border: `1px solid #30363d`
- Radius: 12px
- Padding: 20px
- Shadow: `0 4px 24px rgba(0,0,0,0.4)`

**Node Card**
- Background: Card Surface (`#161b22`)
- Border: `2px solid [node-type-color]`
- Radius: 10px
- Width: 256px
- Header: Node type in uppercase 11px, colored accent bar top

**Modal / Dialog**
- Background: Card Surface (`#161b22`)
- Border: `1px solid #30363d`
- Radius: 14px
- Padding: 28px
- Backdrop: `rgba(0, 0, 0, 0.72)` with `backdrop-filter: blur(4px)`

### Inputs & Forms

**Text Input (Standard)**
- Background: Elevated Surface (`#1c2128`)
- Border: `1px solid #30363d`
- Radius: 8px
- Padding: 10px 14px
- Text: Primary White (`#e6edf3`), Inter, 14px
- Focus: border becomes Electric Blue (`#3b6ef8`)

**Field Label (Uppercase)**
- Font: SFMono-Regular
- Size: 11px
- Weight: 600
- Transform: uppercase
- Letter-spacing: 0.8px
- Color: Label Uppercase (`#7d8590`)

### Badges & Tags

**Node Type Badge**
- Background: `rgba([type-color-rgb], 0.12)`
- Border: `1px solid rgba([type-color-rgb], 0.25)`
- Text: Node type color, SFMono, 11px, weight 600
- Padding: 3px 8px
- Radius: 4px

**Status Badge (Valid)**
- Background: `rgba(34, 197, 94, 0.12)`
- Text: Emerald Active (`#22c55e`), Inter, 11px, weight 700, uppercase
- Padding: 3px 10px
- Radius: 9999px (pill)
- Prefix: `●` dot indicator

### Navigation & Tabs

**App Header**
- Background: transparent (page background bleeds through)
- Logo: emoji icon (📄) + "CanvasDocs" in Inter 600
- Right side: "LOCAL ONLY" badge

**Tab Strip**
- Background container: `#0d1117`
- Active tab: `#21262d`, `1px solid #30363d`, rounded 8px
- Inactive tab: transparent, secondary text color

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 4px, 6px, 8px, 10px, 12px, 14px, 16px, 20px, 24px, 28px, 32px, 40px, 48px

### Grid & Container
- Sidebar: fixed left, 256px
- Canvas: flexible center
- Editor panel: fixed right, 320px
- Modals: centered, max-width 640px

### Whitespace Philosophy
- **Tight panel density**: Panels are compact with controlled padding.
- **Card separation through gap**: Panels separated by consistent 16px gaps.
- **Full-width elements**: Primary buttons and drop zones span full card width.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, no border | Page background |
| Contained (Level 1) | `1px solid #30363d` | Standard cards, inputs |
| Elevated (Level 2) | `1px solid #30363d` + shadow | Node cards, panels |
| Active/Accent (Level 3) | Colored border on tinted bg | Selected nodes, validation |
| Modal (Level 4) | Card bg + backdrop blur | Dialogs, overlays |

## 7. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | < 640px | Single column, panels overlay |
| Tablet | 640–1024px | Canvas + collapsed sidebar |
| Desktop | 1025–1440px | Three-column layout |
| Wide | > 1440px | Centered container, max-width ~1400px |
}