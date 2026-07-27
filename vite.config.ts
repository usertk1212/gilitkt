import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

/**
 * Fill in the site's absolute URL for the Open Graph tags in index.html.
 *
 * WHY A PLUGIN RATHER THAN A PLAIN VITE ENV VAR
 * og:url and og:image must be absolute — Slack ignores relative paths. Vite can
 * substitute %VITE_FOO% in index.html on its own, but that has two problems:
 * if the variable isn't set it leaves the literal "%VITE_FOO%" behind (a broken
 * URL, and an unfetchable image for Slack), and when it IS set Vite's replacement
 * runs before this plugin, so any normalisation here is skipped — which produced
 * "https://host//og-image.jpg" from a value with a trailing slash.
 *
 * Hence the token is __SITE_URL__, which Vite does not recognise, so this plugin
 * is the only thing that touches it and the value is always normalised.
 *
 * The URL is resolved with fallbacks, and always ends up valid:
 *
 *   1. VITE_SITE_URL              — manual override for a custom domain
 *   2. VERCEL_PROJECT_PRODUCTION_URL — set automatically by Vercel on every build,
 *      including preview builds, and holds the shortest production domain. Vercel
 *      recommends this over VERCEL_URL because VERCEL_URL sits behind Deployment
 *      Protection and a crawler couldn't fetch the image through it.
 *   3. VERCEL_URL                 — last-resort deployment host
 *   4. ""                         — local dev; the tags collapse to relative paths,
 *                                   which nothing is scraping anyway
 *
 * The upshot: link previews work on Vercel with no configuration at all.
 */
function openGraphUrls() {
  const raw =
    process.env.VITE_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    ''
  // No trailing slash, so `${base}/og-image.jpg` can't become a double slash.
  const base = raw.replace(/\/+$/, '')

  return {
    name: 'open-graph-urls',
    transformIndexHtml(html: string) {
      return html.replaceAll('__SITE_URL__', base)
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    openGraphUrls(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },
})
