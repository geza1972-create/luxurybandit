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
        source: "/",
        destination: "/stores?tab=community",
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
      }
    ];
  },
  images: {
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
