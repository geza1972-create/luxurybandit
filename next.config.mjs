import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  outputFileTracingRoot: projectRoot,
  async rewrites() {
    // Mirror every public page under /admin/… for signed-in admins. `afterFiles` runs
    // AFTER real pages/files, so genuine admin dashboards (/admin/looks, /admin/trends,
    // /admin/curators, …) keep priority; only /admin paths with no page of their own
    // fall through here and render the matching public page (URL stays /admin/…).
    return {
      afterFiles: [
        { source: "/admin/:path*", destination: "/:path*" },
      ],
    };
  },
  async redirects() {
    return [
      {
        // Home = the Fashionshow GRID overview (hero + tabs + 3-col grid), not the
        // immersive reel. Tapping any tile still opens the full-screen reel.
        source: "/",
        destination: "/home",
        permanent: false
      },
      {
        // Repositioned "become a model" → "own an AI influencer". Old ad links / shares
        // / OG all still resolve to the new landing.
        source: "/become-a-model",
        destination: "/own-influencer",
        permanent: false
      },
      {
        source: "/tools/fashion-creator",
        destination: "/tools/luxbanditcut",
        permanent: false
      },
      {
        source: "/try-this-look",
        destination: "/stores",
        permanent: false
      },
      {
        source: "/seller/dashboard",
        destination: "/user/myaccount",
        permanent: true
      },
      {
        // "seller" reads wrong for a general sign-in — the canonical login is /login.
        source: "/seller/login",
        destination: "/login",
        permanent: true
      }
    ];
  },
  images: {
    // optImg() requests w=300/400/500/700 + q=70 — those MUST be whitelisted or
    // /_next/image responds 400 and every tile flashes a broken (white) image
    // before the raw-URL fallback kicks in ("weiße Blitzer").
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 300, 384, 400, 500],
    deviceSizes: [640, 700, 750, 828, 1080, 1200, 1920, 2048, 3840],
    qualities: [70, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fmodxuwkumfrzmpxtvwr.supabase.co",
        pathname: "/storage/v1/**"
      }
    ]
  }
};

export default nextConfig;
