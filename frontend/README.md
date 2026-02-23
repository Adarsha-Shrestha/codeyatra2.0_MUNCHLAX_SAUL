# SAUL  AI Research Assistant

SAUL is an AI-powered research assistant that lets you upload and manage sources (documents, notes, scans), then chat with an AI to explore and synthesize information from those sources.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Animation | motion/react (Framer Motion), GSAP |
| Icons | lucide-react |
| Runtime | Node.js |

---

## Project Structure

```
frontend/
 app/                        # Next.js App Router
    layout.tsx              # Root layout (metadata, global CSS)
    page.tsx                # Main research workspace page
    home/
       page.tsx            # Landing / home page
    redirect/
       page.tsx            # Auth redirect handler
    api/
        sources/
           route.ts        # GET all sources / PUT update source content
        upload/
            route.ts        # POST upload file, note, or scan

 components/
    layout/                 # Page-level UI components
       Header.tsx          # Top navigation bar
       SidebarLeft.tsx     # Sources panel
       SidebarRight.tsx    # Table of contents panel
       ChatArea.tsx        # Main chat + source viewer
       AddSourceModal.tsx  # Upload / add source modal
    ui/                     # Reusable animation primitives
        BlurText.tsx        # Word/letter blur-in animation
        ShinyText.tsx       # Shimmer gradient text
        SplitText.tsx       # GSAP per-character reveal

 hooks/
    useSidebarResize.ts     # Sidebar open/close + resize logic

 lib/
    constants.ts            # SIDEBAR_WIDTH, CHAT_MIN_WIDTH, SAMPLE_MARKDOWN
    utils.ts                # cn(), getGreeting(), formatDate(), truncate()

 styles/
    globals.css             # Tailwind import, theme tokens, scrollbar styles
    variables.css           # CSS custom property reference

 types/
    index.ts                # Shared TypeScript types and interfaces

 tests/                      # Placeholder for future tests
 public/
    uploads/                # Uploaded source files (persisted locally)
 next.config.ts
 tsconfig.json
 package.json
 README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## API Routes

### `GET /api/sources`

Returns a list of all uploaded sources from `public/uploads/sources.json`.

**Response**
```json
[
  {
    "id": "1771773522462",
    "name": "my-document.txt",
    "type": "text/plain",
    "content": "...",
    "uploadedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### `POST /api/upload`

Uploads a new source (file, note, or scan).

**Request body** - `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | File | Document or image file |
| `type` | string | `"file"`, `"note"`, or `"scan"` |
| `content` | string | Text content (for notes) |
| `name` | string | Display name (for notes) |

**Response**
```json
{
  "success": true,
  "source": { "id": "...", "name": "...", "type": "...", ... }
}
```

---

### `PUT /api/sources`

Updates the content of an existing source.

**Request body** - `application/json`

```json
{
  "id": "source-id",
  "content": "updated content"
}
```

---

## Component Architecture

```
app/page.tsx
 useSidebarResize()           custom hook for sidebar state
     Header                   top bar (logo, nav, actions)
     SidebarLeft              sources list + AddSourceModal
     ChatArea                 chat messages + source viewer
     SidebarRight             table of contents (parsed from markdown)
```

### Custom Hook: `useSidebarResize`

Manages sidebar open/close state and auto-collapses sidebars responsively when the chat area would be narrower than `CHAT_MIN_WIDTH` (480px). Uses a `ResizeObserver` on the container ref.

```ts
const { containerRef, leftOpen, rightOpen, handleToggleLeft, handleToggleRight } = useSidebarResize();
```

---

## Styling

Tailwind CSS v4 with custom theme tokens defined in `styles/globals.css`:

| Token | Usage |
|---|---|
| `--color-nblm-bg` | Page background |
| `--color-nblm-panel` | Sidebar/panel background |
| `--color-nblm-border` | Border color |
| `--color-nblm-text` | Primary text |
| `--color-nblm-text-muted` | Secondary/muted text |
| `--color-nblm-accent` | Accent / highlight color |

---

## Path Aliases

The `@/*` alias maps to `./` (the `frontend/` root), configured in `tsconfig.json`.

```ts
import Header from '@/components/layout/Header';
import { useSidebarResize } from '@/hooks/useSidebarResize';
import { SAMPLE_MARKDOWN } from '@/lib/constants';
import type { SourceInfo } from '@/types';
```
