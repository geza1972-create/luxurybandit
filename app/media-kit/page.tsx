import { fillPrices, themenPreisZeile } from "@/lib/pricing";
import { Kicker, H1, Y, Lead, SectionTitle } from "@/components/Landing";
import { ThemenListe } from "@/components/CI";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import SeitenFuss from "@/components/SeitenFuss";
import { Flame, Palmtree, Star, Heart, Gift, MessageCircle, Target, Sparkles, PartyPopper } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildBellaCard, BELLA_ID } from "@/lib/bella-card";
import { resolveLang } from "@/lib/lang-server";
import { VERSPRECHEN_VIDEO, VERSPRECHEN_POSTER } from "@/lib/versprechen";
import { GEBURTSTAG_VIDEO } from "@/lib/geburtstag";
import { readCardStudioSlides, getSignedUrl, isPublicBellaPost, sortBellaPosts, readKissConfig, readThemeConfig, readTryThisLookState } from "@/lib/try-this-look-store";
import { KUSS_SZENEN } from "@/lib/kuss-szenen";
import { tryonVideos } from "@/lib/tryon-videos";
import { POLEDANCE_VIDEO, POLEDANCE_POSTER } from "@/lib/poledance";

/**
 * MEDIA-KIT-SEITE (Owner 01.09.2026: "eine neue Landingpage ... für Media Agenturen").
 *
 * Anders als der Themen-Katalog unter /themes (die "seriöse Portal"-Fassung, die seit dem
 * 31.08.2026 nur noch David, Talent Network und den Lebenslauf zeigt) ist diese Seite kein
 * Endkunden-Trichter. Sie zeigt Agenturen alles, was das Haus produzieren kann — Kuss,
 * Anprobe, Lingerie, Hochzeit, Geburtstag, Tanz, Chat, Urlaub —, damit sie einschätzen
 * können, was wir liefern. Jede Kachel führt weiterhin auf den echten, laufenden Trichter.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "LuxuryBandit — Media Kit für Agenturen",
  description: "KI-generierte Videoinhalte für Media-Agenturen: Kuss-Videos, virtuelle Anprobe, Lingerie-Looks, Hochzeitseinladungen, Geburtstagsvideos und mehr — jedes Format hier ist live.",
  robots: { index: false, follow: false },
};

type Theme = { icon: LucideIcon; title: string; tagline: string; href: string; cover?: string; video?: string; poster?: string; chips?: string; abPreis?: string };

/**
 * DREI SPRACHEN (Owner 01.09.2026: „das jetzt noch auf englisch übersetzen und rumänisch") —
 * Deutsch, Englisch, Rumänisch. Die übrigen vier Haus-Sprachen (es/fr/pt/it) fallen auf
 * Englisch zurück, statt eine vierte/fünfte/sechste/siebte Übersetzung zu erfinden, die
 * niemand beauftragt hat.
 */
const TXT = {
  de: {
    kicker: "LuxuryBandit für Agenturen",
    h1a: "Jedes Format, das wir bauen.", h1b: "Live, keine Folien.",
    lead: "Ein Media Kit für Agenturen und Marken: jedes Videoformat, das LuxuryBandit produziert, live im echten Trichter — Kasse, Lieferung, alles. Ein Format wählen und öffnen zeigt genau, was dein Kunde bekäme.",
    cta: "Beispiel ansehen", bald: "Bald verfügbar",
    was: { titel: "Was ist LuxuryBandit?", text: "LuxuryBandit ist eine Produktion, keine Prompt-Box. Wir bauen für jedes Format — Kuss, Anprobe, Lingerie, Hochzeit, Geburtstag, Chat — einen fertigen, laufenden Trichter: Landingpage, Erzeugung, Kasse, Lieferung, in einem Stück. Für eine Agentur heisst das: kein Pitch mit Slides und Versprechen. Jedes Format auf dieser Seite ist live — anklicken, ausprobieren, sehen was am Ende rauskommt." },
    warum: { titel: "Warum wir — Ketten statt ein Werkzeug", text: "Ein einzelnes KI-Modell ist nie in allem gut. Eines sitzt ein Kleidungsstück exakt, ein anderes bewegt einen Körper glaubwürdig, ein drittes hält ein Gesicht über zehn Sekunden stabil. Wer nur ein Modell benutzt, bekommt in mindestens einer Disziplin einen Kompromiss — verzerrte Stoffe, ein Gesicht, das driftet, eine Bewegung, die klebt. Deshalb schicken wir jedes Format durch eine eigene Kette aus mehreren, genau dafür ausgewählten Modellen. Jedes Glied macht eine Sache, aber die richtige — und das Ergebnis ist kein Filter über ein Foto, sondern etwas, das aussieht wie gedreht." },
    kettenTitel: "Drei Ketten aus dem Haus",
    ketten: [
      { titel: "Anprobe & Lingerie", text: "FASHN zieht das Stück exakt an — Stoff, Falte, Sitz. Pixverse übernimmt danach die Bewegung: sie dreht sich, geht ein paar Schritte, jede Seite ist zu sehen. Zwei Spezialisten, ein Ergebnis, das keiner der beiden allein liefert." },
      { titel: "Geschenkvideos (Geburtstag, Kuss, Idol)", text: "gpt-image-2 malt das Bild und hält dabei das Gesicht exakt fest (Identity Lock, kein Verwaschen). HeyGen setzt darauf Stimme und Lippen-Synchronität — inklusive der eigenen Stimme, falls vom Kunden aufgenommen." },
      { titel: "Video-Routing nach Inhalt", text: "Nicht jedes Modell darf jedes Motiv. Lingerie und Bademode laufen über Pixverse, alle anderen Szenen über fal Kling — fest verdrahtet, damit nie das falsche Modell am falschen Motiv scheitert oder blockiert." },
    ],
    meta: { titel: "Getestet auf Meta, nicht nur im Labor", text: "Diese Motive laufen bei uns selbst als Meta-Anzeigen — nicht als Showreel, das nie einem echten Publikum begegnet ist. Die Klickrate lag dabei ungewöhnlich hoch über dem, was klassische Produktbilder oder Stock-Video liefern. Dieses Format ist gerade sehr gefragt: Es fällt im Feed auf, wo die meiste Konkurrenz noch mit Fotos arbeitet — genau der Vorteil, den eine Kampagne mit echtem Werbebudget braucht." },
    anpassbar: { titel: "Jedes Format ist anpassbar", text: "Was hier läuft, ist die Vorlage — nicht das Limit. Model, Szene, Kleidungsstück, Sprache, Musik, sogar der Ablauf des Trichters selbst: Jedes dieser Tools lässt sich für eine Marke, ein Produkt oder eine Kampagne individuell umbauen. Wir liefern kein Fertigprodukt von der Stange, sondern die Maschine dahinter — angepasst auf das, was die jeweilige Kampagne wirklich braucht." },
    themes: [
      { title: "Kuss-Videokarte", tagline: "Sende einen Kuss an die Person, die du liebst — ihr Foto und deins, in einem Video.", chips: "♥ Kuss · Videokarte" },
      { title: "Luxury Looks", tagline: "Jeden Tag ein neuer Luxus-Look — im Video an ihr zu sehen.", chips: "♥ Look · Model · Video" },
      { title: "Lingerie Looks", tagline: "Sie in Wäsche — jeder Look, im Video.", chips: "♥ Wäsche · Model · Video" },
      { title: "Geburtstagsvideo", tagline: "Namen eingeben — sie sagt ihn laut, in einer Traumwelt-Geburtstagsszene.", chips: "♥ Name · Stimme · Video" },
      { title: "Surprise him (Pole Dance)", tagline: "Ein Foto, ein Lauf — sie überrascht ihn mit einem Poledance-Video.", chips: "♥ Ein Foto · Video" },
      { title: "Chat mit Bella", tagline: "Eine Frau, ein Chat — sie antwortet in deiner Sprache, Tag für Tag.", chips: "♥ Chat · Erste Nachrichten gratis" },
      { title: "Teneriffa mit Bella", tagline: "Nicht ihr Urlaub — deiner. Dein Foto, und sie ist mit dir im Video.", chips: "♥ Bella · Dein Foto · Video" },
      { title: "Einladungsvideo Urlaub", tagline: "Lade jemanden ein, mit dir zu verreisen — ein Video von euch beiden, schon dort.", chips: "♥ Dein Foto · Ihr Foto · Einladung" },
      { title: "Dein Idol mit dir", tagline: "Wähle dein Idol, füge dein Foto hinzu — ihr beide in einem Video.", chips: "♥ Idol · Dein Foto · Video" },
      { title: "Gutschein verschenken", tagline: "Geschenk oder Guthaben wählen — Bella liefert deine Botschaft als Videokarte. Ein Tipp zum Einlösen.", chips: "♥ Dein Geschenk · Deine Botschaft · Ein Tipp" },
      { title: "Future Self Program", tagline: "Sieh deine Zukunft. Mach das Versprechen. Halte es 30 Tage.", chips: "♥ Dein Zukunftsfilm · 30 Tage · Dein Versprechen" },
    ],
  },
  en: {
    kicker: "LuxuryBandit for agencies",
    h1a: "Every format we build.", h1b: "Live, not slides.",
    lead: "A media kit for agencies and brands: every video format LuxuryBandit produces, live in the real funnel — checkout, delivery, all of it. Pick a format and open it to see exactly what your client would get.",
    cta: "See example", bald: "Coming soon",
    was: { titel: "What is LuxuryBandit?", text: "LuxuryBandit is a production house, not a prompt box. For every format — kiss, try-on, lingerie, wedding, birthday, chat — we build a finished, running funnel: landing page, generation, checkout, delivery, in one piece. For an agency that means: no pitch with slides and promises. Every format on this page is live — click it, try it, see what actually comes out the other end." },
    warum: { titel: "Why us — chains, not one tool", text: "No single AI model is good at everything. One fits a garment exactly, another moves a body convincingly, a third holds a face stable for ten seconds. Use only one model and you get a compromise in at least one discipline — warped fabric, a face that drifts, motion that sticks. So we route every format through its own chain of several models, each picked for exactly one job. Every link does one thing, but the right thing — and the result isn't a filter over a photo, it's something that looks shot." },
    kettenTitel: "Three chains from our own build",
    ketten: [
      { titel: "Try-on & lingerie", text: "FASHN fits the garment exactly — fabric, fold, drape. Pixverse then takes over the motion: she turns, walks a few steps, every side is shown. Two specialists, one result that neither delivers alone." },
      { titel: "Gift videos (birthday, kiss, idol)", text: "gpt-image-2 paints the image while holding the face exactly (identity lock, no drifting). HeyGen then adds voice and lip-sync — including the customer's own voice, if recorded." },
      { titel: "Video routing by content", text: "Not every model is allowed on every subject. Lingerie and swimwear run through Pixverse, every other scene through fal Kling — hard-wired, so the wrong model never fails or blocks on the wrong subject." },
    ],
    meta: { titel: "Tested on Meta, not just in the lab", text: "These formats run as our own Meta ads — not a showreel that never met a real audience. Click-through rate came in unusually high above what classic product photos or stock video deliver. This format is in high demand right now: it stands out in a feed where most competitors still run photos — exactly the edge a campaign with real ad spend needs." },
    anpassbar: { titel: "Every format is customizable", text: "What runs here is the template — not the limit. Model, scene, garment, language, music, even the funnel's own flow: every one of these tools can be rebuilt for a brand, a product, or a campaign. We don't hand over an off-the-shelf product — we hand over the machine behind it, tuned to what the campaign actually needs." },
    themes: [
      { title: "Kiss video card", tagline: "Send a kiss to the one you love — their photo and yours, together in one video.", chips: "♥ Kiss · Video card" },
      { title: "Luxury Looks", tagline: "A fresh luxury outfit every day — see it on her, in a video.", chips: "♥ Look · Model · Video" },
      { title: "Lingerie Looks", tagline: "See her in lingerie — any look, in a video.", chips: "♥ Lingerie · Model · Video" },
      { title: "Birthday video", tagline: "Type a name — she says it out loud, in a dream-world birthday scene.", chips: "♥ Name · Voice · Video" },
      { title: "Surprise him (Pole Dance)", tagline: "One photo, one run — she surprises him with a pole-dance video.", chips: "♥ One photo · Video" },
      { title: "Chat with Bella", tagline: "One woman, one chat — she answers in your language, day after day.", chips: "♥ Chat · First messages free" },
      { title: "Tenerife with Bella", tagline: "Not her holiday — yours. Your photo, and she's in the video with you.", chips: "♥ Bella · Your photo · Video" },
      { title: "Holiday invitation video", tagline: "Ask someone to come away with you — a video of you both, already there.", chips: "♥ Your photo · Their photo · Invitation" },
      { title: "Your idol with you", tagline: "Pick your idol, add your photo — the two of you in one video.", chips: "♥ Idol · Your photo · Video" },
      { title: "Gift a voucher", tagline: "Pick a gift or credit — Bella delivers your message as a video card. One tap to redeem.", chips: "♥ Your gift · Your message · One tap" },
      { title: "Future Self Program", tagline: "See your future. Make the promise. Keep it for 30 days.", chips: "♥ Your future film · 30 days · Your promise" },
    ],
  },
  ro: {
    kicker: "LuxuryBandit pentru agenții",
    h1a: "Fiecare format pe care îl construim.", h1b: "Live, nu diapozitive.",
    lead: "Un media kit pentru agenții și branduri: fiecare format video pe care LuxuryBandit îl produce, live în trichterul real — casă, livrare, totul. Alege un format și deschide-l ca să vezi exact ce ar primi clientul tău.",
    cta: "Vezi exemplul", bald: "În curând",
    was: { titel: "Ce este LuxuryBandit?", text: "LuxuryBandit este o producție, nu o casetă de prompt. Pentru fiecare format — sărut, probă virtuală, lenjerie, nuntă, ziua de naștere, chat — construim un trichter complet, funcțional: landing page, generare, casă, livrare, dintr-o singură bucată. Pentru o agenție, asta înseamnă: fără pitch cu diapozitive și promisiuni. Fiecare format de pe această pagină este live — apeși, încerci, vezi exact ce iese la capătul celălalt." },
    warum: { titel: "De ce noi — lanțuri, nu un singur instrument", text: "Niciun model de IA nu este bun la absolut tot. Unul îmbracă o piesă exact, altul mișcă un corp credibil, un al treilea ține o față stabilă timp de zece secunde. Cine folosește un singur model obține un compromis în cel puțin o disciplină — țesături deformate, o față care alunecă, o mișcare care se blochează. De aceea trecem fiecare format printr-un lanț propriu din mai multe modele, fiecare ales exact pentru o singură sarcină. Fiecare verigă face un singur lucru, dar exact pe cel potrivit — iar rezultatul nu este un filtru peste o fotografie, ci ceva care arată ca filmat." },
    kettenTitel: "Trei lanțuri din casă",
    ketten: [
      { titel: "Probă virtuală & lenjerie", text: "FASHN îmbracă piesa exact — țesătură, pliu, cădere. Pixverse preia apoi mișcarea: se întoarce, face câțiva pași, fiecare parte este vizibilă. Doi specialiști, un rezultat pe care niciunul nu-l livrează singur." },
      { titel: "Videoclipuri cadou (ziua de naștere, sărut, idol)", text: "gpt-image-2 pictează imaginea și păstrează fața exact (identity lock, fără alunecare). HeyGen adaugă apoi vocea și sincronizarea buzelor — inclusiv vocea proprie a clientului, dacă a fost înregistrată." },
      { titel: "Rutarea video după conținut", text: "Nu orice model are voie la orice subiect. Lenjeria și costumele de baie trec prin Pixverse, toate celelalte scene prin fal Kling — fixat, ca modelul greșit să nu eșueze sau să blocheze niciodată subiectul greșit." },
    ],
    meta: { titel: "Testat pe Meta, nu doar în laborator", text: "Aceste formate rulează chiar la noi ca reclame Meta reale — nu ca un showreel care nu a întâlnit niciodată un public real. Rata de clic a fost neobișnuit de ridicată față de ce livrează fotografiile clasice de produs sau video stock. Acest format este foarte căutat acum: iese în evidență într-un feed unde majoritatea concurenței încă lucrează cu fotografii — exact avantajul de care are nevoie o campanie cu buget real de reclamă." },
    anpassbar: { titel: "Fiecare format este personalizabil", text: "Ce rulează aici este șablonul — nu limita. Model, scenă, piesă vestimentară, limbă, muzică, chiar și fluxul trichterului însuși: fiecare dintre aceste instrumente poate fi reconstruit pentru un brand, un produs sau o campanie. Nu livrăm un produs de raft, ci mașina din spatele lui — adaptată la ce are nevoie campania respectivă cu adevărat." },
    themes: [
      { title: "Felicitare video cu sărut", tagline: "Trimite un sărut persoanei pe care o iubești — poza ei și a ta, împreună într-un video.", chips: "♥ Sărut · Felicitare video" },
      { title: "Luxury Looks", tagline: "În fiecare zi o ținută de lux nouă — o vezi pe ea purtând-o, într-un video.", chips: "♥ Ținută · Model · Video" },
      { title: "Lingerie Looks", tagline: "O vezi în lenjerie — orice ținută, într-un video.", chips: "♥ Lenjerie · Model · Video" },
      { title: "Video de ziua de naștere", tagline: "Scrii un nume — ea îl spune cu voce tare, într-o scenă de vis.", chips: "♥ Nume · Voce · Video" },
      { title: "Surprise him (Pole Dance)", tagline: "O poză, un rulaj — ea îl surprinde cu un video de pole dance.", chips: "♥ O poză · Video" },
      { title: "Chat cu Bella", tagline: "O femeie, un chat — răspunde în limba ta, zi de zi.", chips: "♥ Chat · Primele mesaje gratuite" },
      { title: "Tenerife cu Bella", tagline: "Nu vacanța ei — a ta. Poza ta, iar ea e în video cu tine.", chips: "♥ Bella · Poza ta · Video" },
      { title: "Video de invitație vacanță", tagline: "Invită pe cineva să plece cu tine — un video cu voi doi, deja acolo.", chips: "♥ Poza ta · Poza ei · Invitație" },
      { title: "Idolul tău cu tine", tagline: "Alege-ți idolul, adaugă poza ta — voi doi într-un video.", chips: "♥ Idol · Poza ta · Video" },
      { title: "Dăruiește un voucher", tagline: "Alege un cadou sau credit — Bella livrează mesajul tău ca felicitare video. Un tap pentru a-l folosi.", chips: "♥ Cadoul tău · Mesajul tău · Un tap" },
      { title: "Future Self Program", tagline: "Vezi-ți viitorul. Fă promisiunea. Ține-o timp de 30 de zile.", chips: "♥ Filmul tău din viitor · 30 de zile · Promisiunea ta" },
    ],
  },
} as const;

type MediaLang = keyof typeof TXT;

/* DIE LANDINGPAGE, NICHT DER TUNNEL (Owner 01.09.2026): „es gab eine Landingpage [mit
   Beispielvideos]. Jetzt kommt der Tunnel sofort." — für Agenturen zählt zuerst das
   Beispiel, nicht das Upload-Werkzeug. `/themes/tryon` zeigt die Karte mit den Videos aus
   `public/Tryon/` und führt von dort selbst in den Tunnel (`/themes/tryon/start`). */
const TRYON = "/themes/tryon";

export default async function MediaKit() {
  const Lraw = await resolveLang();
  const L: MediaLang = Lraw === "de" || Lraw === "ro" ? Lraw : "en";
  const t = TXT[L];

  const bellaSlidesP = readCardStudioSlides(BELLA_ID).catch(() => []);

  const wetterP = (async () => {
    let cover = "";
    try {
      const { card } = await buildBellaCard({ surface: "themes" });
      cover = card?.photo || "";
    } catch { /**/ }
    return { cover };
  })();

  /**
   * LUXURY/LINGERIE LOOKS ZOGEN BISHER AUS BELLAS CURATOR-FEED (Supabase) — genau die
   * Dateien, die gelöscht wurden. Die echte Beispielquelle liegt woanders: `/themes/tryon`
   * selbst zeigt seine Kartenreihe aus `public/Tryon/` (Owner 13.08.2026: „ich habe dir
   * einige videos eingefügt für das Card"), unabhängig vom Storage. Das ist die Quelle, die
   * der Besucher sieht, bevor der Trichter (Landing statt Tunnel) — also auch die richtige
   * Quelle hier.
   */
  const tryonSet = tryonVideos();

  /* DIE LINGERIE-KACHEL ZIEHT JETZT AUS DER ECHTEN MEDIENGALERIE (Owner 01.09.2026: „hier
     das erste video nehmen") — dasselbe erste Beispiel wie oben auf der Landingpage
     `/themes/lingerie` selbst, nicht mehr die alte, feste `public/Lingerie`-Datei. */
  const lingerieVideoP = (async () => {
    try {
      const cfg = await readThemeConfig("lingerie");
      const first = (cfg.examplePaths ?? [])[0];
      if (first) return (await getSignedUrl(first).catch(() => "")) || "";
    } catch { /**/ }
    return "";
  })();

  /**
   * LINGERIE HAT EINE EIGENE LANDINGPAGE (Owner 01.09.2026: „wir hatten eine andere. das ist
   * es" — nachdem `/themes/tryon` als „das ist es nicht" verworfen wurde): `/try/[lookId]`,
   * die Lingerie-Anprobe (Memory `zwei-tryon-trichter`) — ein eigener, indexierter Trichter
   * je Look, getrennt vom allgemeinen `/themes/tryon`. Sie führt zu einem KONKRETEN Look,
   * also braucht die Kachel eine echte, veröffentlichte Lingerie-Look-ID statt einer
   * Katalogadresse.
   */
  const lingerieLookP = (async () => {
    try {
      const state = await readTryThisLookState();
      const looks = (state.looks ?? []) as Array<{ id?: string; lingerie?: boolean; published?: boolean; featured?: boolean; imageUrl?: string; frontImageUrl?: string }>;
      const kandidaten = looks.filter(l => l.lingerie && l.published && (l.imageUrl || l.frontImageUrl));
      const look = kandidaten.find(l => l.featured) ?? kandidaten[0];
      if (look?.id) return { id: look.id, image: look.imageUrl || look.frontImageUrl || "" };
    } catch { /**/ }
    return null;
  })();

  const urlaubP = (async () => {
    try {
      const all = await bellaSlidesP;
      const j = all.find(x => x.kind === "video" && !x.customer && !x.hidden && !x.private && !x.pendingApproval
        && (x.pages ?? []).includes("lp-journey") && x.path);
      if (j) return (await getSignedUrl(j.path).catch(() => "")) || "";
    } catch { /**/ }
    return "";
  })();

  /**
   * DIE HOCHZEITSKACHEL: `examplePaths` ist auf diesem Stand leer, den echten Clip trägt
   * `teaserPath` (bestätigt über /api/theme-media?theme=wedding). Erst den Teaser versuchen,
   * dann die Beispiele — nie nur eine der beiden Quellen.
   */
  const weddingP = (async () => {
    try {
      const wc = await readThemeConfig("wedding");
      const pfad = wc.teaserPath || (wc.examplePaths ?? [])[0];
      if (pfad) return (await getSignedUrl(pfad).catch(() => "")) || "";
    } catch { /**/ }
    return "";
  })();

  /**
   * DER KUSS ZEIGT EINE SEINER VIER FESTEN SZENEN (public/Kiss/…), NICHT den admin-Teaser
   * aus dem Storage — genau das tut auch `/themes/kiss` selbst (`lib/kuss-szenen.ts`). Der
   * gespeicherte `teaserPath` zeigte 2026-09-01 auf eine im Storage bereits gelöschte Datei
   * (404 bei `getSignedUrl`) — deshalb blieb die Kachel hier leer, während die echte
   * Themenseite weiterläuft: sie hängt gar nicht an dieser Datei.
   */
  const kissP = (async () => {
    let cover = "", video = "";
    try {
      const kc = await readKissConfig();
      if (kc.teaserPath) {
        const url = await getSignedUrl(kc.teaserPath).catch(() => "");
        if (url) { if (/\.(mp4|webm|mov)$/i.test(kc.teaserPath)) video = url; else cover = url; }
      }
    } catch { /**/ }
    if (!video) video = KUSS_SZENEN[0]?.clip || "";
    return { cover, video };
  })();

  const versprechenP = (async () => {
    let cover = "", video = "";
    try {
      const pc = await readThemeConfig("plan");
      if (pc.teaserPath) {
        const url = await getSignedUrl(pc.teaserPath).catch(() => "");
        if (/\.(mp4|webm|mov)$/i.test(pc.teaserPath)) video = url; else cover = url;
      }
    } catch { /**/ }
    return { cover, video };
  })();

  const [wetter, urlaubVideo, weddingVideo, kiss, versprechen, lingerieLook, lingerieVideo] = await Promise.all([
    wetterP, urlaubP, weddingP, kissP, versprechenP, lingerieLookP, lingerieVideoP,
  ]);

  const { cover: wetterCover } = wetter;
  const { cover: kissCover, video: kissVideo } = kiss;
  const { cover: versprechenCover, video: versprechenVideo } = versprechen;

  const AB_KISS = themenPreisZeile("kiss", L);
  const AB_HOCHZEIT = themenPreisZeile("wedding", L);
  const AB_BIRTHDAY = themenPreisZeile("birthday", L);
  const AB_SURPRISE = themenPreisZeile("surprise", L);
  const AB_CHAT = themenPreisZeile("chat", L);
  const AB_TRYON = themenPreisZeile("tryon", L);
  const AB_GUTSCHEIN = themenPreisZeile("gutschein", L);
  const AB_VERSPRECHEN = themenPreisZeile("versprechen", L);

  const [TH_KISS, TH_LUXURY, TH_LINGERIE, TH_BIRTHDAY, TH_SURPRISE, TH_CHAT, TH_BELLA, TH_HOLIDAY, TH_IDOL, TH_GUTSCHEIN, TH_VERSPRECHEN] = t.themes;

  const THEMES: Theme[] = [
    { icon: Heart, ...TH_KISS, href: "/themes/kiss", cover: kissCover, video: kissVideo, abPreis: AB_KISS },
    { icon: Sparkles, ...TH_LUXURY, href: TRYON, cover: tryonSet[0]?.poster, video: tryonSet[0]?.video, abPreis: AB_TRYON },
    { icon: Flame, ...TH_LINGERIE, href: "/themes/lingerie", video: lingerieVideo || undefined, abPreis: AB_TRYON },
    /* HOCHZEIT AUSGEBLENDET (Owner 01.09.2026): ihr Video fehlt wirklich im Storage (404
       bestätigt) — Kachel kommt zurück, sobald ein neues Beispiel im Hochzeits-Medien-
       Werkzeug (`/themes/wedding?admin=1`) hochgeladen ist. */
    { icon: PartyPopper, ...TH_BIRTHDAY, href: "/themes/birthday", video: GEBURTSTAG_VIDEO, abPreis: AB_BIRTHDAY },
    { icon: Star, ...TH_SURPRISE, href: "/themes/surprise", cover: POLEDANCE_POSTER, video: POLEDANCE_VIDEO, abPreis: AB_SURPRISE },
    { icon: MessageCircle, ...TH_CHAT, href: "/themes/chat", cover: "/Chat/chat-poster.jpg", poster: "/Chat/chat-poster.jpg", video: "/Chat/Private%20Chat%20Invitation_1080p.mp4", abPreis: AB_CHAT },
    { icon: Palmtree, ...TH_BELLA, href: "/themes/bella", cover: wetterCover || "/Peter/vid1-Peter-Bella.jpg", video: urlaubVideo || "/Peter/vid1-Peter-Bella.mp4" },
    { icon: Palmtree, ...TH_HOLIDAY, href: "/themes/holiday", cover: "/Holiday/urlaub-poster.jpg", poster: "/Holiday/urlaub-poster.jpg", video: "/Holiday/urlaub-beispiel.mp4", abPreis: AB_HOCHZEIT },
    { icon: Star, ...TH_IDOL, href: "/your-idol", cover: "/idol-placeholder.jpg" },
    { icon: Gift, ...TH_GUTSCHEIN, href: "/themes/gutschein", cover: "/Gutscheine/gutschein-poster.jpg", poster: "/Gutscheine/gutschein-poster.jpg", video: "/Gutscheine/PixVerse_V6_Fusion_360P_She_holds_a_cream_enve.mp4", abPreis: AB_GUTSCHEIN },
    { icon: Target, ...TH_VERSPRECHEN, href: "/themes/versprechen", cover: versprechenCover || VERSPRECHEN_POSTER, poster: VERSPRECHEN_POSTER, video: versprechenVideo || VERSPRECHEN_VIDEO, abPreis: AB_VERSPRECHEN },
  ];

  return (
    <main className="lb-bg min-h-[100dvh] text-white">
      <TopNav back={false} motto="The Media Creator" sprachen={["en", "de"]} />
      <TrackView event="themes_view" lookId="media-kit" lookName="Media Kit" />

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-3">
        <Kicker>{t.kicker}</Kicker>
        <H1>{t.h1a} <Y>{t.h1b}</Y></H1>
        <Lead className="max-w-xl">{t.lead}</Lead>

        <ThemenListe
          className="mt-6"
          ctaZeile={t.cta}
          baldZeile={t.bald}
          themen={THEMES.map(th => ({
            titel: th.title,
            zeile: th.tagline,
            href: th.href,
            bild: th.cover,
            bild2: undefined,
            video: th.video,
            poster: th.poster,
            merkmale: fillPrices(th.chips || "", L),
            abPreis: th.abPreis,
            platzhalter: <th.icon className="h-16 w-16 text-white/10" strokeWidth={1.25} />,
          }))} />

        {/* ── WAS IST LUXURYBANDIT + WARUM WIR (Owner 01.09.2026: „extrem gute Texte ...
            damit ich erklären kann wie schlau wir alles machen, Generatorenketten") ──
            Auf `/themes` steht dieselbe Frage für Endkunden; hier beantwortet sie sich
            anders, weil der Leser eine Agentur ist: nicht "was schenke ich", sondern
            "was kann dieser Anbieter, das ein Prompt-Fenster nicht kann". Die Antwort ist
            konkret — echte Modell-Ketten aus dem Haus (Memory `fashn-zieht-an-pixverse-
            filmt`, `geschenk-kette-openai-heygen`, `video-provider-routing`), keine
            Marketing-Behauptung. Drei Sprachen (Owner 01.09.2026), Texte in `TXT` oben. */}
        <section className="mt-14 space-y-11 border-t border-white/10 pt-10">
          <div>
            <SectionTitle>{t.was.titel}</SectionTitle>
            <Lead>{t.was.text}</Lead>
          </div>

          <div>
            <SectionTitle>{t.warum.titel}</SectionTitle>
            <Lead>{t.warum.text}</Lead>
            <div className="lb-karte relative mt-6 overflow-hidden rounded-[20px] px-4 pb-4 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
              <CornerOrnaments />
              <div className="lb-karte-rahmen pointer-events-none absolute inset-[8px] rounded-[14px]" />
              <div className="relative">
                <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.24em]">{t.kettenTitel}</p>
                <DividerOrnament className="mt-2" />
                <div className="mt-3 space-y-2.5">
                  {t.ketten.map((k, i) => (
                    <div key={i} className="lb-karte-news rounded-[12px] px-3 py-2.5">
                      <span className="lb-karte-gold text-[10.5px] font-black">{String(i + 1).padStart(2, "0")}</span>
                      <p className="mt-0.5 text-[12.5px] font-black leading-snug">{k.titel}</p>
                      <p className="mt-0.5 text-[11.5px] font-medium leading-snug opacity-70">{k.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>{t.meta.titel}</SectionTitle>
            <Lead>{t.meta.text}</Lead>
          </div>

          <div>
            <SectionTitle>{t.anpassbar.titel}</SectionTitle>
            <Lead>{t.anpassbar.text}</Lead>
          </div>
        </section>
      </div>
      <SeitenFuss lang={L} />
    </main>
  );
}
