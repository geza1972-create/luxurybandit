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
    /* HIER STAND `"/demo/[schluessel]": ["./public/Armee/**"]` UND MUSSTE WIEDER RAUS
       (02.09.2026, am fehlgeschlagenen Deploy): Die Zeile zog zehn Megabyte Video in die
       Server-Funktion, damit `readdirSync` die Szenen findet — und brachte damit eine
       ANDERE Funktion über Vercels 250-MB-Grenze. Die Dateien braucht die Funktion gar
       nicht, nur ihre NAMEN; die stehen jetzt fest in lib/demo-armee.ts. Ausgeliefert
       werden die Videos weiterhin vom CDN, das ist unverändert. */
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
        /* LAKATOSBANDI.COM — DAS PORTAL (Owner 10.09.2026). Wurzel und Login VOR den echten
           Seiten, denn `/` und `/login` gibt es im Haus schon. Nur auf diesem Host. */
        { source: "/", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal" },
        { source: "/login", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/login" },
        /* ── DAS JOURNAL IST WIEDER ERREICHBAR (20.09.2026, auf der Live-Seite gemessen) ────────
           Diese zwei Regeln standen hier seit dem 10.09. und sind am 18.09. mit dem Commit „Artist
           Fair" herausgefallen. Seitdem fing die Hausregel `/[creator]/[[...project]]` jede
           Adresse `lakatosbandi.com/journal/…` ab (`x-matched-path` sagte es) — jeder Artikel-Link
           im Kopf, auf der Startseite, in Facebook-Posts und bei Google landete auf der falschen
           Seite. Zuerst das Journal, sonst hielte `/:kuenstler` „journal" für einen Künstler. */
        { source: "/journal", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/journal" },
        { source: "/journal/:pfad*", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/journal/:pfad*" },
        /* DIE ANMELDUNG AUF LAKATOSBANDI.COM (Owner 11.09.2026: „du musst schauen, wo die Seite angelegt wird. Nicht auf
           VersusForge") — derselbe Chat wie /engine, VOR `/:kuenstler`, damit „start" kein Künstler ist. */
        { source: "/start", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/engine" },
        /* DIE BESTÄTIGUNG AUS SEINER MAIL (Owner 12.09.2026: „also vorher") — der Klick, der seine
           Seite überhaupt erst anlegt. Muss VOR `/:kuenstler` stehen, sonst wäre „bestaetigen" ein
           Künstlername. */
        { source: "/bestaetigen", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/bestaetigen" },
        /* Der Klick aus der Folgen-Mail (Owner 13.09.2026). Wie `/bestaetigen` VOR `/:kuenstler`,
           sonst wäre „urmaresti" ein Künstlername. */
        { source: "/urmaresti", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/urmaresti" },
        /* Die Rückkehr von der Kasse (Owner 16.09.2026). Ebenfalls VOR `/:kuenstler` — sonst
           wäre „comanda" ein Künstlername und die Bestätigung eine 404. */
        { source: "/comanda", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/comanda" },
        /* „Über uns" (Owner 18.09.2026) — wie die anderen Hausnamen VOR `/:kuenstler`, sonst
           wäre „despre" ein Künstlername. */
        { source: "/despre", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/despre" },
        /* Löschen auf lakatosbandi.com statt auf der Firmen-Anzeigenseite (Owner 11.09.2026). */
        { source: "/:kuenstler/loeschen", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/:kuenstler/loeschen" },
        /* ── SEIN DASHBOARD (Owner 18.09.2026: „Link zum Dashboard geht nicht") ──────────────
           Der Knopf in „Seite bearbeiten" zeigt auf `/<name>/dashboard`. Auf lakatosbandi.com
           gab es dafür keine Umschreibung, also fing die Hausregel `/[creator]/[[...project]]`
           die Adresse ab und zeigte die VersusForge-Seite. Muss VOR `/:kuenstler/:werk` stehen,
           sonst wäre „dashboard" ein Werk. */
        { source: "/:kuenstler/dashboard", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/versusforge/:kuenstler/dashboard" },
        /* Die Seite eines Werks (Owner 11.09.2026: „hier komme ich nicht auf die Kunstwerk-Seite drauf"). */
        /* Die Seite hinter dem QR-Code auf dem Poster (15.09.2026): nur der Film, formatfüllend. */
        { source: "/:kuenstler/:werk(standard|\\d+)", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/:kuenstler/:werk" },
        /* ── „portal" IST KEIN KÜNSTLER (18.09.2026, auf der Live-Seite gemessen) ──────────
           `beforeFiles`-Regeln greifen auch auf einen Pfad, den eine Regel darüber schon
           umgeschrieben hat: „/" wurde zu „/portal", und diese Zeile machte daraus
           „/portal/portal" — die Startseite von lakatosbandi.com war eine 404
           (`x-nextjs-rewritten-path: /portal/portal`). Der Name „portal" ist deshalb hier
           ausgenommen; dasselbe gilt für die anderen Hausnamen, die schon oben umgeschrieben
           werden.

           `engine` gehört dazu (18.09.2026, Owner: „der Trichter ist weg"): `/start` wird oben zu
           `/engine`, und diese Zeile machte daraus `/portal/engine` — die Anmeldung für Künstler
           war eine 404. Wer hier eine neue Umschreibung auf EINEN Pfadteil einträgt, muss ihn in
           dieser Liste ausnehmen. */
        { source: "/:kuenstler((?!portal$|engine$|api$|_next$|journal$)[^/]+)", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/portal/:kuenstler" },
      ],
    };
  },
  async redirects() {
    return [
      /**
       * DIE ENGINE HAT EINE EIGENE ADRESSE (Owner 09.09.2026: „ich will, dass die
       * luxurybandit.com Adresse unter versusforge.com läuft, aber die Engine soll dann
       * ihre Adresse bekommen: versusforge.com/engine").
       *
       * Sie lag unter `/themes/versusforge` — als Topic neben Kuss und Hochzeit. Diese
       * Adresse steht in geteilten Links, in der Kachel von gestern und in den Mails, die
       * schon draussen sind. Ohne diese zwei Zeilen liefe jeder davon in eine 404.
       *
       * `permanent: false`: Der Umzug ist eine Woche alt und die Strecke wird noch gebaut.
       * Eine dauerhafte Weiterleitung merken sich Browser und Suchmaschinen so gründlich,
       * dass ein Zurück Tage dauert.
       */
      /* `/themes/versusforge` selbst leitet NICHT mehr um (Owner 10.09.2026: „normalerweise
         haben wir eine Landingpage dazu, die für SEO gemacht ist") — dort steht jetzt die
         Landingpage „Marketing for Art", je Sprache unter `/en`, `/ro`, `/de`. Nur die alten
         Unterpfade `plan` und `start` gehen weiter zur Engine — ein allgemeines `:pfad*`
         schluckte sonst auch die Sprach-Adressen. */
      { source: "/themes/versusforge/:pfad(plan|start)/:rest*", destination: "/engine/:pfad/:rest*", permanent: false },
      /* DER KÜNSTLER-CHAT LIEGT AUF LAKATOSBANDI.COM/START (Owner 11.09.2026: „nicht auf VersusForge"). Nur auf dem Host
         versusforge.com und nur diese zwei Adressen — /engine/anfragen (Admin) bleibt. Die Sprache (?lang=) wandert mit. */
      { source: "/engine", has: [{ type: "host", value: "(www\\.)?versusforge\\.com" }], destination: "https://lakatosbandi.com/start", permanent: false },
      { source: "/engine/agent", has: [{ type: "host", value: "(www\\.)?versusforge\\.com" }], destination: "https://lakatosbandi.com/start", permanent: false },
      /* DIE ALTE KONTAKT-SEITE GIBT ES FÜR KÜNSTLER NICHT MEHR (Owner 11.09.2026, Bild „Strasse 1 · 12345 Ort": „nicht mehr
         sehr klug") — alte Links landen auf seiner Seite mit geöffnetem Agenten. `?h=` wandert mit. */
      { source: "/:kuenstler/kontakt", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.com" }], destination: "/:kuenstler?agent=1", permanent: false },
      /* LAKATOSBANDI.RO IST DIE RUMÄNISCHE TÜR (Owner 11.09.2026: „ich habe auch die Domain lakatosbandi.ro registriert,
         soll auf die RO-Adresse leiten"). Alles auf .ro landet auf lakatosbandi.com mit ?lang=ro, der Pfad bleibt —
         lakatosbandi.ro/start → /start?lang=ro. Vorerst nicht dauerhaft, bis es läuft. */
      { source: "/:pfad*", has: [{ type: "host", value: "(www\\.)?lakatosbandi\\.ro" }], destination: "https://lakatosbandi.com/:pfad*?lang=ro", permanent: false },
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
