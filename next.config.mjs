import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/stores",
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
