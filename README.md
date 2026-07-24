# GILI (Yoj)

Asset management dashboard for organizing illustration assets.

## ✨ Features

### Asset Dashboard
- Browse by category (All Assets, Spot Illus, Micro Illustration, Icons, Projects)
- Search by asset name, filename, or type
- Sort by Most Recent, Alphabetical, or Type
- Grid/List view with adjustable card size (4–10 columns)
- Create projects and organize assets into collections
- Asset detail panel (preview, metadata, tags, Lightroom URL, copy link, Add to Project)
- Loading spinner while fetching data
- Dark mode (persists across sessions, follows system preference)
- Collapsible sidebar with active section highlight

### Admin
- Password-protected admin panel *(client-side only)*
- Bulk CSV import (+ downloadable template, auto-detect category)
- CSV preview with pagination (100 rows/page) and range import
- Edit & delete assets
- Analytics (total assets, type breakdown & percentages)
- Export database to CSV
- Hard reset database (password + confirmation required)
- Change admin password

## ⚙️ Tech
- **Backend:** Appwrite Cloud (Frankfurt)
- **Cache:** 5-minute client-side cache with manual refresh
- **Import:** Retry-safe, skips already imported rows
- **Deployment:** Vercel with automatic GitHub deployments
