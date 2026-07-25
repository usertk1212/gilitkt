# GILI

Asset management dashboard for organizing illustration assets.

**Version:** 1.0.22

## ✨ Features

### Asset Dashboard
- Browse by category (All Assets, Spot Illus, Micro Illustration, Icons, Supergraphic, Others, Projects)
- Search by asset name, filename, or type (debounced)
- Sort by Most Recent, Alphabetical, or Type
- Grid/List view with adjustable card size (4–10 columns)
- Pagination at 100 assets per page, with First/Last and jump-to-page
- Create projects and organize assets into collections
- Asset detail panel (preview, metadata, tags, Source link that opens the asset in Lightroom, copy link, Add to Project)
- Fullscreen image zoom — scroll to zoom, drag to pan, double-click for 2x, Esc to close
- Click a filename to copy it
- Loading spinner while fetching data
- Dark mode (persists across sessions, follows system preference)
- Collapsible sidebar with active section highlight
- About dialog, opened from the version label in the sidebar footer

### Superuser
*(formerly "Admin")*
- Password-protected Superuser panel *(client-side only)*
- **Session auto-locks after 15 minutes idle**, with a 60-second warning; any click or keypress extends it
- **Sessions never expire mid-import** — a running job holds the session open
- Bulk CSV import (+ downloadable template, auto-detect category)
- CSV preview with pagination (100 rows/page) and row-number sort (ascending/descending)
- **Database checker** — compares the CSV against the database and reports exactly which rows are missing, as collapsed ranges you can copy
- **Three import selection modes** — "Not in database" (auto-selects new rows only), "Pick manually" (per-row checkboxes), and "Row range"
- **Pause / Resume / Stop an import**, from a floating panel available on every screen
- **Imports survive navigation** — going back to the dashboard mid-import does not restart it
- Optional "update type only" mode for rows that already exist
- Edit & delete assets
- Analytics (total assets, type breakdown & percentages)
- Export database to CSV
- Hard reset database (password + typed confirmation required)
- Change Superuser password

## 🎨 Design System

Follows **tiket.com Passport 4.6**.

- **Color:** full primitive + semantic token layers (Background / Text / Icon / Stroke), light and dark, plus Festive and Tier gradients
- **Typography:** Tiket Odyssey (self-hosted woff2), Passport type ladder from Heading 1 down to Extra Small Print
- **Buttons:** TDS variants — Primary, Secondary, Tertiary, Invert, Alert — flat fills, no gradients
- **Radius:** 8px
- **Grid:** 16-column dashboard (28px margin) and 12-column desktop (120px margin), 24px gutter
- **Icons:** single in-house solid 24×24 set, `currentColor` throughout so dark mode works

## ⚙️ Tech
- **Backend:** Appwrite Cloud (Frankfurt)
- **Cache:** 5-minute client-side cache with manual refresh
- **Import:** Retry-safe, skips already imported rows, pausable and resumable
- **Deployment:** Vercel with automatic GitHub deployments

## 🚀 Running locally

```bash
npm i
npm run dev
```

## 📝 Changelog

### 1.0.22
- Asset detail panel gained a **Source** row that opens the asset directly in Lightroom
- About dialog copy is now "Crafted & developed with JOY"

### 1.0.21
- Clicking the version label in the sidebar opens an About dialog (3:2 image placeholder + "designed & developed by YOJ.")

### 1.0.20
- Project export (CSV and TXT) now writes only `nama_file` (raw database value) and `url_lightroom`
- Superuser session auto-locks after 15 minutes idle, and never locks during an active import
- Pause / Resume / Stop controls for CSV imports, in a floating panel available app-wide
- Imports keep running when you navigate back to the dashboard
- All UI copy switched to English
- Dashboard background set to white (N0)

### 1.0.19
- Buttons rebuilt on the TDS spec: five flat variants, no gradients, real disabled tokens
- 8px radius applied across the app
- Every icon now comes from the in-house SVG set, including the shadcn primitives
- "Most Recent" uses a sort icon; Admin renamed to **Superuser** with a lightning icon
- Dedicated zoom-in / zoom-out icons in the image inspector

### 1.0.18
- CSV database checker: see exactly which rows are missing before importing
- Three selection modes (not-in-database / manual / range), per-row status badges and filters

### 1.0.17
- Passport typography tokens and utility classes
- 16-column dashboard and 12-column desktop grid tokens

### 1.0.16
- Passport 4.6 color foundation wired into light and dark mode

### 1.0.15
- Tiket Odyssey self-hosted webfonts
- Semantic versioning introduced, version shown in the sidebar footer

## 🔒 Security note

The Superuser password is **not** a security boundary. GILI is a static site with
no backend, so the password is fetched into the browser to be compared, and the
unlock flag lives in `sessionStorage`. It keeps casual users out of destructive
actions; it does not stop anyone who opens devtools. Enforcing this properly
would mean Appwrite accounts plus collection-level permissions.
