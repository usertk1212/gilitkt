# GILI

Asset management dashboard for organizing illustration assets.

**Version:** 1.0.46

## ✨ Features

### Asset Dashboard
- Browse by category (All Assets, Spot Illus, Micro Illustration, Icons, Supergraphic, Others, Projects)
- Search by asset name, filename or type, matching each word separately — "train blue" finds `tds_ic_train_blue`, in any word order, and pasting a full filename works too
- Tag chips are multi-select filters: clicking adds a `#tag` to the search, several can be on at once (any of them matches), and active chips are highlighted
- Sort by Most Recent, Alphabetical, or Type
- Grid/List view with adjustable card size (4–10 columns)
- Pagination at 50 assets per page; a fixed bottom pager on mobile that is visible without scrolling, plus a full pager with First/Last and jump-to-page at the end of the grid
- Create projects and organize assets into collections
- Asset detail panel (preview, metadata, tags, Source link that opens the asset in Lightroom, copy link, Add to Project) — a bottom sheet with swipe-to-dismiss on mobile, a right-side panel on desktop
- GILI brand mark in the mobile header, which also opens the About dialog
- Fullscreen image zoom — scroll to zoom, drag to pan, double-click for 2x, Esc to close
- Click a filename to copy it
- Loading spinner while fetching data
- Instant loads from a persistent local cache, with a "last synced" indicator in the sidebar
- Dark mode (persists across sessions, follows system preference)
- Collapsible sidebar with active section highlight
- About dialog, opened from the version label in the sidebar footer

### Superuser
*(formerly "Admin")*
- One Superuser, one password. The password is never stored — only a salted PBKDF2-SHA256 credential at 600,000 iterations, so it can't be read out of the bundle or out of Appwrite
- **About Image** — upload a 3:2 image for the About dialog, with drag-to-reposition, zoom and crop before saving. Stored in an Appwrite Storage bucket, so it's shared across every device and browser
- Password-protected Superuser panel *(client-side only)*
- **Session auto-locks after 15 minutes idle**, with a 60-second warning; any click or keypress extends it
- **Sessions never expire mid-import** — a running job holds the session open
- **Upload CSV** — bulk import with a downloadable template and auto-detected category
- **Manual Input** — add a few assets without a CSV: multi-row form with auto-derived name and type, per-row New/Replaced/Unchanged status, and duplicate detection both inside the form and against the library
- CSV preview with pagination (100 rows/page) and row-number sort (ascending/descending)
- **Database checker** — grades every CSV row as New, Replaced (filename matches but Lightroom issued a new link) or Unchanged, and reports missing rows as collapsed ranges you can copy
- **Three import selection modes** — "Not in database" (auto-selects new rows only), "Pick manually" (per-row checkboxes), and "Row range"
- **Pause / Resume / Stop an import**, from a floating panel available on every screen
- **Imports survive navigation** — going back to the dashboard mid-import does not restart it
- Re-uploaded assets are relinked automatically: a changed url_lightroom for an existing filename replaces the stored link, counted separately in the import summary
- Optional "update type only" mode for rows that already exist
- Edit & delete assets
- Anonymous usage counting: active devices in the last 7/30 days, all-time devices split desktop/mobile, and total sessions — no IP, no user-agent, no personal data
- Analytics — total assets, per-category counts and shares, assets added in the last 7/30 days, and a data-health panel flagging uncategorised assets, missing Lightroom links and duplicate filenames
- **Backup & Restore** — one JSON file with every asset and project, plus assets-only CSV export and a snapshot/read-budget panel
- Hard reset database (password + typed confirmation required)
- Change Superuser password from the UI — applies immediately on every device, no redeploy. Requires the current password, and enforces a 12-character minimum with penalties for predictable shapes
- Failed unlock attempts trigger an escalating cooldown (15s doubling to 5 minutes) after 5 tries

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
- **Cache:** IndexedDB, no expiry; a single freshness request per load decides whether to re-sync
- **Import:** Retry-safe, skips already imported rows, pausable and resumable
- **Deployment:** Vercel with automatic GitHub deployments

## 🚀 Running locally

```bash
npm i
npm run dev
```

## 📝 Changelog

### 1.0.46
- Card-size slider and the per-card copy button moved from B500 (#0064D2) to B400 (#007CFF), matching the copy button already used in the detail panel
- Selected tag chips are now a soft B100 fill with a 1px B400 outline and B400 text, instead of a solid blue block
- Added `--pp-chip-selected-bg` / `--pp-chip-selected-fg` so the selected chip stays readable in dark mode: reusing the blue-high/low pair directly would have given 3.19:1 contrast there

### 1.0.45
- **Manual Input**, under Upload CSV: type a filename and the asset name and type fill themselves in, add as many rows as you need, and each row is graded New / Replaced / Unchanged before you save. Saves through the same engine as CSV import, so behaviour is identical
- Removed anonymous visitor counting. It spent one database read per browser session and was the last thing costing reads during ordinary browsing
- Fixed `--pp-text-informative`, a CSS variable that was never defined — the "Replaced" badge text in the CSV viewer had been falling back to the inherited colour since 1.0.38

### 1.0.44
- Search now matches each word independently against underscore-separated names, so "train blue" finds `tds_ic_train_blue`. Previously it substring-matched the whole query, which meant every multi-word search failed against this library's own naming convention
- Pasting a whole filename into the search box works
- Tag chips accumulate instead of replacing the query: each click toggles a `#tag`, several can be active at once (matching **any** of them), and active chips are highlighted. Typed words still narrow, so `train #tds #refund` means "train, and tagged Tds or Refund"
- Manage Asset had its own copy of the old search logic and the same bug; both screens now share one engine

### 1.0.43
- Real link previews for Slack and anywhere else that scrapes Open Graph: proper title, description and a 1200x630 preview image. The old preview showed leftover scaffolding boilerplate about screen readers, because no OG tags existed and Slack fell back to the stray `<meta name="description">`
- The preview URL resolves itself from Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, so previews work with no configuration; set `VITE_SITE_URL` only to override it with a custom domain

### 1.0.42
- **"Publish from this browser's cache"** — publishes the snapshot with zero database reads, so a browser that already has the library can unblock everyone else even while the read quota is exhausted. Publishing from the database needs the reads you've run out of, which made the fix unreachable exactly when it was needed
- Removed a health check that ran `listDocuments` before every page load and discarded the result: it charged one database read per visitor per load, so "viewers cost zero reads" was off by one per load
- A read-quota block now says what it is and how to fix it, instead of showing "Connection Error" and an empty library

### 1.0.41
- **Viewers no longer read the database.** The library is published as a single JSON snapshot in Storage; clients read that, so database reads stay flat no matter how many people use GILI. Storage transfer is billed as bandwidth, not reads
- Imports no longer scan the collection twice (~9,000 reads at 4,486 assets) — both the CSV checker and the import pre-scan resolve from the snapshot for zero reads
- Single-asset edits republish the snapshot instead of invalidating every device's cache, which used to cost a full re-scan per viewer per edit
- **Backup & Restore** replaces Export CSV: a JSON backup covering assets *and* projects, which existed only in `localStorage` and were in no export at all
- A read-budget estimate against the 500,000/month free-tier limit, so the ceiling is visible before you hit it
- "Rebuild snapshot from database" for when you want authoritative counts after editing rows in the Appwrite console

### 1.0.40
- Anonymous usage counting, shown in Analytics: active devices over 7 and 30 days, all-time devices split desktop/mobile, and total sessions. Each browser gets a random local ID; no IP address, no user-agent, nothing identifying a person
- Counts one session per browser session, so refreshing doesn't inflate it, and silently does nothing until the `usage` collection exists

### 1.0.39
- Fixed Analytics reporting 100% "Other": it read `asset.category`, a field that doesn't exist, so every asset fell through to the default branch. Counting now goes through the same function that feeds the sidebar, so the two can't disagree
- Analytics gained the missing Supergraphic category, per-category shares, added-in-last-7/30-days, and a data-health panel for uncategorised assets, missing links and duplicate filenames
- Removed the Upload Asset menu; its CSV template moved into Upload CSV so nothing was lost
- Renamed CSV Viewer to **Upload CSV**

### 1.0.38
- Re-uploading an asset to Lightroom now updates its link on import instead of leaving the row pointing at the retired file; the CSV checker grades rows as New / Replaced / Unchanged so replacements are visible before importing
- Fixed the import summary counting the entire database as "already existed" — importing 10 rows into a 4,486-asset library reported 4,486 unchanged
- Mobile pager is fixed to the viewport, so it no longer stays invisible until you scroll far enough to reach it
- Asset details open as a bottom sheet on mobile, with a drag handle and swipe-to-dismiss, instead of a cramped 340px right-side panel
- A working cache no longer looks like an error: "Offline · showing cached" is now "Showing cached copy · synced 12m ago" in a neutral colour, and the sidebar says "Local" rather than "Inactive"

### 1.0.37
- Password can now be changed from Settings and takes effect on every device immediately — the salted credential lives in Appwrite Storage instead of being compiled in
- Iterations raised 200,000 → 600,000, with a random 16-byte salt per password and self-describing credentials so future parameter changes stay verifiable
- Changing the password now requires the current one, so a borrowed unlocked session can't lock the owner out
- Weak passwords are rejected rather than merely flagged: 12-character minimum, with penalties for wordlist entries and word-then-digits shapes
- Escalating cooldown after 5 failed unlock attempts
- Pointed the Storage bucket at its real Appwrite ID

### 1.0.36
- One Superuser instead of two; `joy1212` is retired
- The password is no longer stored anywhere — only a PBKDF2-SHA256 digest (200,000 iterations, salted) is compiled into the app, and unlocking compares digests with no network call
- Settings now generates the digest for a new password instead of pretending it can change one at runtime
- About image moved to an Appwrite Storage bucket, fixing images that looked saved but showed the placeholder in incognito and on other devices
- The shared-storage indicator no longer reports "shared" when writes are actually being rejected

### 1.0.35
- Dropped the superuser/admin split: `joy1212` and `gili1212` are now two keys to the same door, and anyone who unlocks can update the About image

### 1.0.34
- Asset cards truncate long names, filenames and tag rows instead of showing per-card horizontal scrollbars
- About Image falls back to device-local storage when the Appwrite `settings` collection is missing, and says so
- Password lookups memoised for the session (was re-hitting Appwrite, and 404ing, on every unlock attempt)

### 1.0.33
- Two access levels: superuser (`joy1212`) and admin (`gili1212`)
- Superuser-only **About Image** menu: upload, reposition, zoom and crop a 3:2 image for the About dialog
- Count and sort drop to their own line on mobile so they no longer collide with the breadcrumb

### 1.0.32
- Added an error boundary: a crash now shows the actual error and a copy button instead of a blank white page
- Reverted the desktop header pager from 1.0.31 (see note); mobile sticky pager and the bottom pager are unchanged

### 1.0.31
- Fixed the zoom overlay being trapped inside the grid area: it and the detail panel are now portalled to `<body>`, since a transformed ancestor was becoming the containing block for `position: fixed`
- Card "Preview" now opens the detail panel, so there's a single path: card → detail → zoom
- Sticky header keeps breadcrumb, count and sort visible while scrolling
- Page size 100 → 50, halving scroll depth from ~7 screens to ~3.5
- Changing page now scrolls back to the top of the grid
- Breadcrumb: "All Assets" is a single "Home" crumb; categories read "Home > Spot Illus"

### 1.0.30
- Top toolbar is a single row on mobile (search + view toggle no longer stack)
- Sort now sits beside the total-assets count instead of taking its own row

### 1.0.29
- Sort moved out of the top toolbar into its own right-aligned row directly above the grid
- GILI logo gets its own row at the top on mobile
- Removed the static "Manage and organize your graphic assets" line

### 1.0.28
- Removed the stub "Edit File Details" button from the detail panel; Add to Project is now full width
- GILI logo shown in the mobile header so the app is identifiable while the sidebar is closed

### 1.0.27
- Asset detail panel no longer drifts on mobile: page scroll is locked behind it, height uses dvh so the browser address bar can't resize it, and the slide-in animation is desktop-only
- Esc now closes the detail panel

### 1.0.26
- Fixed the copy-link button being pushed outside the card at 7–10 column density

### 1.0.25
- Responsive rebuilt on the tiket breakpoint spec: mobile 360–839px, desktop 840px and up
- Fixed 840–1023px rendering the mobile layout (Tailwind's `lg` was still 1024px)
- Column ladder recalibrated against content width, so cards never go narrower on desktop than on mobile
- Defined the 3xl/4xl breakpoints the 7–10 column settings referenced but never had
- Asset detail panel is full-width on mobile instead of a fixed 340px

### 1.0.24
- Fixed the sidebar showing a red "Offline" on a healthy cache hit (regression from 1.0.23)

### 1.0.23
- Asset cache moved from localStorage to IndexedDB and no longer expires on a timer
- Each load sends **one** freshness request instead of re-downloading all assets
- Serves the cached copy when Appwrite is unreachable, with a "last synced" line in the sidebar

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

The password itself is not stored anywhere: only a salted PBKDF2-SHA256 digest is
compiled into the bundle, so nobody can read the password out of the app, the
network tab, or the database. That is a real improvement, and it is where the
improvement stops.

The Superuser gate is still **not** a security boundary. GILI is a static site
with no backend, so the comparison happens in the browser and the unlock flag
lives in `sessionStorage` — anyone comfortable with devtools can set it by hand
and skip the gate entirely. It guards against accidents, not against a
determined person. Enforcing this properly would mean Appwrite accounts plus
collection-level permissions.
