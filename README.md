
#GILI

An asset management dashboard for organizing, searching, and managing illustration assets.

---

# ✨ Features

## 📂 Asset Dashboard

- Browse assets by category:
  - All Assets
  - Spot Illustrations
  - Micro Illustrations
  - Icons
  - Projects

- Search across:
  - Asset name
  - Filename
  - Asset type

- Sort assets by:
  - Most Recent (default)
  - Alphabetical
  - Type

- Display options:
  - Grid view
  - List view
  - Adjustable card size (4–10 columns)

- Project management:
  - Create projects
  - Add assets to projects
  - Remove assets from projects

- Asset detail panel:
  - Preview image
  - Asset name
  - Type
  - Tags
  - Lightroom URL
  - Copy URL button
  - Add to Project action

- Loading state:
  - Spinner displayed while fetching data

- Theme:
  - Dark mode
  - Persists across sessions
  - Uses system preference on first visit

- Navigation:
  - Collapsible sidebar
  - Icon-only or expanded mode
  - Active section highlighting

---

## 🔒 Admin Panel

> Password protected (client-side only).

### Authentication

- Password gate
- Default password configurable
- Password can be changed from Settings

---

### Upload Assets

- Bulk CSV import
- Supports 3-column CSV:

| Filename | Lightroom URL | Category |
|----------|---------------|----------|

- Category automatically detected from filename prefix if omitted
- Downloadable CSV template included

---

### CSV Viewer & Import

Designed for handling very large CSV exports.

Features:

- Open local CSV files
- Preview before importing
- Paginated table (100 rows/page)
- Jump to any page
- Import only selected row ranges
- No need to process the entire CSV

---

### Manage Assets

- Edit asset information
- Delete assets

---

### Analytics

Dashboard includes:

- Total asset count
- Asset breakdown by type:
  - Spot
  - Micro
  - Icon
  - Other
- Distribution percentages

---

### Export

- Export the entire asset database to CSV

---

### Hard Reset Database

Permanently deletes every asset.

Safety requirements:

- Admin password
- Confirmation phrase

---

### Settings

- Change admin password

---

# ⚙️ Technical Details

### Backend

- Appwrite Cloud
- Region: Frankfurt

### Caching

- Client-side cache
- 5-minute TTL
- Manual refresh bypasses cache

### Bulk Import

- Rate-limited
- Safe to retry
- Already-imported rows automatically skipped

### Deployment

- Hosted on Vercel
- Automatic deployment from GitHub on every push

---

# 🛠 Tech Stack

- React
- Appwrite
- Vercel

---

# 📦 Deployment

The application is automatically deployed through Vercel whenever changes are pushed to the GitHub repository.
