import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // EIGENES BAU-VERZEICHNIS FÜR PRÜFBAUTEN (30.07.2026).
  //
  // Bisher musste der Entwicklungsserver für jeden `npm run build` gestoppt werden, weil sich
  // beide dasselbe `.next` teilen und der Server danach mit „__webpack_modules__ is not a
  // function" abstürzt. Für den Owner hiess das jedes Mal: mitten im Ausprobieren steht
  // „Netzwerkfehler", weil die Seite gerade niemanden zum Antworten hat.
  //
  // Mit `LB_DIST_DIR=.next-build npm run build` schreibt der Prüfbau woandershin und der
  // Server läuft weiter. Ohne die Variable bleibt alles wie vorher (Vercel baut normal).
  distDir: process.env.LB_DIST_DIR || ".next",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  outputFileTracingRoot: projectRoot,
  /**
   * DER VERSPRECHEN-ORDNER MUSS IN DIE SERVER-FUNKTION (11.08.2026).
   *
   * Die Themenseite liest ihre Beispielvideos aus `public/Versprechen` (siehe
   * lib/versprechen-videos.ts) — so wird aus „Datei hineinlegen" eine neue Folie, ohne dass
   * jemand Code anfasst. Was in `public/` liegt, liefert auf Vercel aber das CDN aus; in der
   * Server-Funktion ist es nur, wenn die Bau-Spurensuche es mitnimmt. Ohne diese Zeile
   * findet `readdirSync` dort nichts und die Seite fiele auf das eine Kachel-Video zurück:
   * lokal vier Folien, live eine — der schlimmste Fehler, weil er beim Testen unsichtbar ist.
   */
  outputFileTracingIncludes: {
    "/themes/versprechen": ["./public/Versprechen/**"],
    /* Dieselbe Regel für die Ordner-Karten (13.08.2026): Landingpage UND Tunnel lesen
       public/Tryon bzw. public/Chat per readdir (lib/tryon-videos.ts) — ohne diese Zeilen
       fände die Server-Funktion auf Vercel nichts und die Karte stünde live leer. */
    "/themes/tryon": ["./public/Tryon/**"],
    "/themes/tryon/start": ["./public/Tryon/**"],
    "/themes/chat": ["./public/Chat/**"],
    "/themes/chat/start": ["./public/Chat/**"],
  },
  /**
   * DIE MUSIK-ROUTE DARF NICHT DEN GANZEN public-ORDNER TRAGEN (GEMESSEN beim Deploy
   * 13.08.2026: „api/feed-music is 318.32mb … exceeds 250mb"). Sie liest per readdir nur
   * die MP3s im public-WURZELordner; die Bau-Spurensuche nahm aber ALLES mit — und seit
   * den Try-on-Videos platzt damit das Funktions-Limit. Die schweren Medientypen fliegen
   * aus IHREM Bündel; die MP3s bleiben drin, die Seiten-Funktionen oben sind unberührt.
   */
  outputFileTracingExcludes: {
    "/api/feed-music": ["./public/**/*.mp4", "./public/**/*.mov", "./public/**/*.jpg", "./public/**/*.jpeg", "./public/**/*.png", "./public/**/*.svg"],
    /* Der GENERISCHE Ordner-Leser (lib/tryon-videos.ts, `ordnerVideos(name)`) hat einen
       dynamischen Pfad — die Spurensuche kann ihn nicht auflösen und nimmt vorsichtshalber
       GANZ public mit (GEMESSEN: „themes/chat/start is 318.27mb"). Deshalb je Seite:
       public/** raus, der eigene Ordner kommt über die Includes oben wieder rein
       (Includes schlagen Excludes). Wer ordnerVideos in einer NEUEN Seite benutzt,
       braucht hier dasselbe Paar. */
    "/themes/tryon": ["./public/**"],
    "/themes/tryon/start": ["./public/**"],
    "/themes/chat": ["./public/**"],
    "/themes/chat/start": ["./public/**"],
  },
  async rewrites() {
    // Mirror every public page under /admin/… for signed-in admins. `afterFiles` runs
    // AFTER real pages/files, so genuine admin dashboards (/admin/looks, /admin/trends,
    // /admin/curators, …) keep priority; only /admin paths with no page of their own
    // fall through here and render the matching public page (URL stays /admin/…).
    return {
      beforeFiles: [
        // luxurybandit.com now opens on the Models marketplace (the start page). The root
        // "/" is handled by app/page.tsx, which redirects to /stores?view=models — no rewrite
        // here (a rewrite would keep the URL "/" and drop ?view=models on the client).
        // /wardrobe is a clean URL for the Wardrobe (garderobe) gallery — the browser
        // URL stays /wardrobe while /stores renders it (usePathname → onWardrobe → garderobe tab).
        { source: "/wardrobe", destination: "/stores" },
      ],
      afterFiles: [
        { source: "/admin/:path*", destination: "/:path*" },
      ],
    };
  },
  async redirects() {
    return [
      {
        /* DAS „LUXURYBANDIT SYSTEM" IST WEG (Owner 10.08.2026: „Wir verkaufen keine Systeme.
           … Wir löschen das jetzoge jetzt"). An seiner Stelle steht das VERSPRECHEN. Die alte
           Adresse liegt in Anzeigen, in geteilten Links und in der Sitemap von gestern — ohne
           diese Zeile landet jeder davon auf einer 404 statt auf dem neuen Thema. */
        source: "/themes/luxurybandit-plan",
        destination: "/themes/versprechen",
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
        // The old /clothes catalogue (mixed Bellucci + model look-photos) is retired —
        // the real garment gallery is /wardrobe. Redirect so stale menu links / bookmarks
        // land on the correct wardrobe, never the old wrong catalogue.
        source: "/clothes",
        destination: "/wardrobe",
        permanent: false
      },
      {
        // Romanian route name retired → the wardrobe. Old bookmarks/shares keep working.
        source: "/haine",
        destination: "/wardrobe",
        permanent: false
      },
      {
        source: "/mai-ieftin",
        destination: "/luxury-products",
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
