# GILI

Asset management dashboard for organizing illustration assets.

**Version:** 1.0.23

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

