
  # GILI (Yoj)

Asset Dashboard
• Browse assets by category: All Assets, Spot Illus, Micro Illustration, Icons, Projects
• Search across asset name, filename, and type
• Sort by Most Recent (default), Alphabetical, or By Type
• Grid or list view, with adjustable card size (4–10 columns)
• Create projects and add/remove assets to organize them into collections
• Click any asset to open a detail panel: preview image, name, type, tags, Lightroom URL (copy button), Add to Project
• Loading state shows a spinner while fetching from the database instead of a blank/empty screen
• Dark mode toggle (persists across sessions, follows system preference on first load)
• Collapsible sidebar (icon-only or full labels), with the active section highlighted

Admin Menu (password-protected)
• Password gate to keep casual users out (default password set at setup, changeable — not real security, since it's a client-side app)
• Upload Asset — bulk import via CSV (3-column format: filename, Lightroom URL, category; category auto-detected from filename prefix if omitted), with a downloadable template
• CSV Viewer & Import — open a local CSV file, preview it in a paginated table (100 rows/page, jump to any page), then choose any row range to import without processing the whole file — useful for large exports (thousands of rows) from other tools
• Manage Asset — edit or delete existing assets
• Analytics — total asset count, plus a breakdown by type (Spot/Micro/Icon/Other) and distribution percentages
• Export CSV — download every asset currently in the database as a CSV file
• Hard Reset Database — wipes all assets permanently; requires both the admin password and typing a confirmation phrase, to prevent accidental deletion
• Settings — change the admin password
• Behind the scenes

Backend: Appwrite Cloud (Frankfurt region)
• Client-side caching (5-minute TTL) so reopening the app doesn't re-fetch everything each time; a manual refresh bypasses the cache
• Bulk imports are rate-limited and safe to retry — already-imported rows are automatically skipped, so a partially-failed import can just be re-run
• Deployed via Vercel, auto-deploys from the GitHub repo on push
