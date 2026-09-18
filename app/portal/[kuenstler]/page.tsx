import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { mandantLesen, mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { spruecheNachtragen } from "@/lib/kuenstler-sprueche";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import PortalBearbeiten from "@/components/PortalBearbeiten";
import PortalFolgen from "@/components/PortalFolgen";
import PortalTeilen from "@/components/PortalTeilen";
import KuenstlerAgent from "@/components/KuenstlerAgent";
import PosterFilm from "@/components/PosterFilm";
import Poster from "@/components/Poster";
import PosterGross, { PosterGrossKnopf } from "@/components/PosterGross";
import PosterDeinBild from "@/components/PosterDeinBild";
import PosterDeinText, { PosterStil, PosterRecht } from "@/components/PosterDeinText";
import { POSTER_TITEL } from "@/lib/lakatosbandi-poster";
import KaufKnopf from "@/components/KaufKnopf";
import MehrText from "@/components/MehrText";
import Korb from "@/components/Korb";
import { preisSatz, preisText } from "@/lib/lakatosbandi-preis";
import { druckPreisCents, druckGroessenFuer, druckSpanneCents, DRUCK_KUENSTLER_CENTS, DRUCK_VERSAND_CENTS } from "@/lib/lakatosbandi-druck";
import { eur } from "@/lib/pricing";
import PreisLabel from "@/components/PreisLabel";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { aboAktiv } from "@/lib/versusforge-abo";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { istKuenstler, portalPfade, werkKacheln, kuenstlerUrl, posterAnriss, kuenstlerListe, imPortalSichtbar } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";
import PortalReiter from "@/components/PortalReiter";
import PosterZurueckSprung from "@/components/PosterZurueckSprung";
import { MessageCircle } from "lucide-react";
import PortalKuenstlerReihe from "@/components/PortalKuenstlerReihe";

/**
 * DIE SEITE EINES KÜNSTLERS: LAKATOSBANDI.COM/{NAME} (Owner 10.09.2026: „die kommen doch unter
 * lakatosbandi.com/{artistname}" · „nur auf lakatosbandi").
 *
 * Seine Werke als Hook-Kacheln und der eine Weg zu ihm: „Interessiert an meiner Kunst? Sprich mit
 * meinem Agenten." Bis der Käufer-Agent gebaut ist, führt der Knopf in das bestehende Gespräch
 * mit Name und Telefonnummer (`/{name}/kontakt` → der Trichter). Eine Kaufabwicklung gibt es
 * hier nicht (Owner: „Eine Kaufabwicklung findet hier nicht statt").
 *
 * SICHTBAR NACH DER FREIGABE — auch ohne „Ja, ins Portal": Dann steht er nicht in der Übersicht,
 * seine eigene Seite hat er trotzdem. Wartet er noch, steht ein ruhiger Satz da; abgelehnt gibt
 * es die Seite nicht.
 *
 * `?h=` aus der Anzeige wird an den Knopf weitergegeben — so steht im Dashboard, aus welchem
 * Hook die Anfrage kam.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ kuenstler: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kuenstler } = await params;
  const m = await mandantOeffentlich(kuenstler);
  if (!m || !istKuenstler(m) || m.freigabe !== "frei") return { title: "lakatosbandi.com", robots: { index: false, follow: false } };
  const kacheln = werkKacheln(m);
  const erster = kacheln[0]?.hook ?? "";
  /**
   * ── DAS VORSCHAUBILD BEIM TEILEN (Owner 12.09.2026) ──────────────────────────────────────
   *
   * Hier gab es KEIN Bild: Wer `lakatosbandi.com/seinname` auf Facebook teilte, bekam eine graue
   * Textzeile — dieselbe Lücke, die für die Journal-Seiten längst geschlossen ist. Und der
   * Künstler teilt seine Seite selbst, das ist also genau die Stelle, an der es zählt.
   *
   * WELCHES WERK: das, das er angehakt hat („dieses Bild repräsentiert mich"). Hat er nichts
   * gewählt, seine erste Kachel — wie die Seite es auch sonst hält.
   */
  const vertreter = kacheln.find(k => m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.vertritt) ?? kacheln[0];
  const bild = vertreter
    ? new URL(`/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=${vertreter.i}`, kuenstlerUrl(kuenstler)).toString()
    : "";
  return {
    title: `${m.name} — lakatosbandi.com`,
    description: erster || `${m.name} on lakatosbandi.com`,
    alternates: { canonical: kuenstlerUrl(kuenstler) },
    openGraph: {
      title: `${m.name} — lakatosbandi.com`, description: erster, type: "profile", url: kuenstlerUrl(kuenstler),
      ...(bild ? { images: [{ url: bild, alt: m.name }] } : {}),
    },
    ...(bild ? { twitter: { card: "summary_large_image" as const, title: `${m.name} — lakatosbandi.com`, description: erster, images: [bild] } } : {}),
  };
}

export default async function PortalKuenstler({ params, searchParams }: Props) {
  const { kuenstler } = await params;
  const sp = await searchParams;
  const m = await mandantOeffentlich(kuenstler);
  /**
   * ── UMGEZOGEN: DIE ALTE ADRESSE FÜHRT ZUR NEUEN (Owner 18.09.2026: „gerrylouisett-2 — dann
   * ändere das. Es gibt keine zwei") ─────────────────────────────────────────────────────────
   *
   * Eine Künstleradresse steht auf gedruckten Postern und in QR-Codes an fremden Wänden. Wird
   * sie sauberer geschrieben, darf das Alte nicht ins Leere laufen: Der alte Datensatz trägt
   * `umgezogenNach`, und von dort geht es dauerhaft weiter — mit allem, was in der Adresse stand.
   */
  const umzug = String((m as Record<string, unknown> | null)?.umgezogenNach ?? "").trim();
  if (umzug && /^[a-z0-9-]{1,60}$/i.test(umzug)) {
    const eintraege = Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][];
    const q = new URLSearchParams(eintraege).toString();
    redirect(`${portalPfade((await headers()).get("host")).kuenstler(umzug)}${q ? `?${q}` : ""}`);
  }
  /* DER ADMIN SIEHT DIE GANZE SEITE, AUCH VOR DER FREIGABE UND OFFLINE (Owner 11.09.2026: „wie soll ich es freigeben, wenn
     ich keine Bilder sehen kann?" · „du sollst die ganze Seite bauen, du zeigst die Seite im Portal"). `?s=` = Admin-Schlüssel. */
  const adminS = String(sp.s ?? "");
  const admin = !!adminS && mandantPruefen(EIGENER_MANDANT, adminS).ok;
  if (!m || !istKuenstler(m) || (m.freigabe === "abgelehnt" && !admin)) notFound();

  const L = portalSprache(sp.lang, m.sprache ?? "en");
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  const h = String(sp.h ?? "").slice(0, 4);

  /**
   * ── SEITE BEARBEITEN, MIT SEINEM SCHLÜSSEL (Owner 11.09.2026: „er muss es dort bearbeiten. WYSIWYG") ──
   *
   * Der Link aus seiner Mail trägt `?k=`. Stimmt der Schlüssel, sieht er dieselbe Seite — antippbar, mit allen
   * Bildern, auch vor der Freigabe. Stimmt er nicht, sieht er die Seite wie jeder andere.
   */
  const k = String(sp.k ?? "");
  if (k) {
    const voll = await mandantLesen(kuenstler);
    if (voll && istKuenstler(voll) && schluesselStimmt(voll.schluessel, k)) {
      /* Jede Kachel mit Spruch — und jede, die er gespeichert hat, auch ohne Spruch (`werkNummern`). */
      const hooks = Array.isArray(voll.hooks) ? voll.hooks : [];
      const spruchVon = (i: number) => String((i < 0 ? voll.hook : hooks[i]) ?? "").trim();
      const nummern = [...new Set([
        ...(spruchVon(-1) ? [-1] : []),
        ...hooks.map((_, i) => i).filter(i => spruchVon(i)),
        ...(Array.isArray(voll.werkNummern) ? voll.werkNummern : []).filter(i => Number.isInteger(i) && i >= -1 && i <= 11),
      ])].sort((a, b) => a - b);
      const kacheln = nummern.map(i => ({ i, spruch: spruchVon(i) })).map(x => {
        const w = voll.werkInfo?.[x.i < 0 ? "standard" : String(x.i)] ?? {};
        return {
          ...x, titel: w.titel ?? "", technik: w.technik ?? "", groesse: w.groesse ?? "", jahr: w.jahr ?? "", geschichte: w.geschichte ?? "",
          /* Der Preis aus dem Gespräch gehört zum gewählten Bild („standard"). */
          preis: preisText(w.preis ?? ""), detalii: w.detalii ?? "",
          /* Sein Häkchen „dieses Bild repräsentiert mich" (Owner 12.09.2026) — ohne diese Zeile
             stünde das Formular bei jedem Öffnen wieder auf leer und überschriebe seine Wahl. */
          vertritt: !!w.vertritt,
          /* Sein Häkchen je Werk (Owner 16.09.2026) — ohne diese Zeile stünde es beim Öffnen wieder leer. */
          poster: !!w.poster,
          /* Vorlage erlaubt (Owner 17.09.2026) — fehlt das Feld, ist es an; so verliert niemand
             den Knopf, nur weil sein Datensatz älter ist als das Häkchen. */
          kunst: w.kunst !== false,
          /* Ob er zu diesem Werk schon gesprochen hat (Owner 17.09.2026) — sonst böte das
             Aufnahmegerät jedes Mal an, etwas aufzunehmen, das längst da ist. */
          stimme: !!w.stimme,
          stimmeAm: w.stimmeAm ?? "",
          /* Ob zu diesem Werk schon ein Film liegt — er hat im Fenster Vorrang vor der Stimme. */
          sprecher: !!w.sprecher,
          youtube: w.youtube ?? "",
        };
      });
      /**
       * ── SEIN KLICK AUS DER MAIL STÖSST DAS RECHNEN AN (Owner 12.09.2026: „klickt er drauf und
       * es wird dann alles angelegt und er sieht die Meldung … und dann tatataa") ───────────────
       *
       * Diese Seite erreicht nur, wer den Schlüssel aus seiner E-Mail hat — deshalb ist ihr
       * Aufruf die Bestätigung. Steht `aufbauSeit` am Datensatz, sind die Bilder da, aber noch
       * ohne Sätze: `spruecheNachtragen` sieht sie an, schreibt die Sätze und räumt das Feld
       * wieder weg. Das läuft NACH der Antwort (`after`), damit er sofort etwas sieht.
       */
      if (String(voll.aufbauSeit ?? "").trim()) {
        after(() => spruecheNachtragen(kuenstler).catch(e => console.warn("[portal] Aufbau gescheitert:", e)));
      }

      return (
        <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
          <PortalKopf T={T} lang={L} login={P.login} start={P.start} preise={P.preise} journal={P.journal(L)} />
          <PortalBearbeiten
            mandant={kuenstler}
            k={k}
            T={T}
            lang={L}
            aufbau={!!String(voll.aufbauSeit ?? "").trim()}
            oeffentlich={kuenstlerUrl(kuenstler)}
            start={{
              name: voll.name ?? "",
              ort: voll.ort ?? "",
              ueberMich: voll.ueberMich ?? "",
              preisSpanne: voll.preisSpanne ?? "",
              profilBild: !!voll.profilBild,
              instagram: voll.instagram ?? "",
              facebook: voll.facebook ?? "",
              posterViu: !!voll.posterViu,
              abo: aboAktiv(voll),
              frei: !voll.freigabe || voll.freigabe === "frei",
              kacheln,
            }}
          />
          <PortalFuss lang={L} />
        </div>
      );
    }
  }

  if (m.freigabe !== "frei" && !admin) {
    return (
      <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
        <PortalKopf T={T} lang={L} login={P.login} start={P.start} preise={P.preise} journal={P.journal(L)} />
        <p className="mx-auto mt-24 max-w-[420px] px-6 text-center text-[18px] leading-[1.5]">{T.pruefung}</p>
      </div>
    );
  }

  /* In der Sprache des Besuchers, sonst im Original (Owner 14.09.2026: „hier wird nichts übersetzt"). */
  const kacheln = werkKacheln(m, L);
  /* Die Bilder liefert `api/portal-werk` vor der Freigabe nur mit Schlüssel aus — für den Admin mit seinem. */
  const mitAdmin = (url: string) => (admin ? `${url}&s=${encodeURIComponent(adminS)}` : url);
  /* „VORBEȘTE CU AGENTUL MEU" ÖFFNET SEINEN AGENTEN AUF DIESER SEITE (Owner 11.09.2026) — statt der alten Firmen-Seite
     `/{name}/kontakt`. Die Kachel-Nummer geht mit, damit die Anfrage weiss, um welches Werk es geht. */
  /**
   * ── DAS ORIGINAL WIRD GEFRAGT, NICHT GEKAUFT (Owner 17.09.2026: „dort, wo man die Poster
   * kauft, kann man auch das Original anfragen, aber nicht kaufen. Dort klappt der Agent auf")
   *
   * Ein Original hat keinen Kaufknopf: Es gibt es einmal, der Preis ist verhandelbar, und der
   * Künstler will wissen, wer davorsteht. Deshalb führt dieser Weg in SEINEN Agenten — dort
   * fallen Name und Telefon an, und er ruft zurück. Beim Meister entfällt er ganz: Sein
   * Original hängt im Museum.
   */
  const agentLink = (nr?: string) =>
    `?agent=1${nr ? `&h=${encodeURIComponent(nr)}` : ""}${sp.lang ? `&lang=${encodeURIComponent(String(sp.lang))}` : ""}${admin ? `&s=${encodeURIComponent(adminS)}` : ""}`;
  const datenschutz = P.start === "/" ? "/privacy" : "/portal/privacy";
  /**
   * ── POSTER IST EINE EIGENE KATEGORIE, KEIN NEUES AUSSEHEN FÜR ALLE ─────────────────────────
   *
   * Owner 16.09.2026: „die originale bitte so lassen wie es war · ohne qr code. das ist eine
   * andere kategorie · wir können die kunst auch als poster verkaufen eines künstlers. dann
   * machen wir den auch in die Poster viu rein".
   *
   * Ein Original ist ein Unikat: ein Bild, ein Preis, ein Käufer. Ein Poster ist ein Druck, den
   * es beliebig oft gibt — mit QR-Code, Rahmenwahl und Korb. Wer auf der Seite einer Malerin
   * ihre Originale ansieht, darf dort keinen Scan-Code und keine Grössenauswahl finden; das
   * macht aus ihrem Werk eine Ware im Regal.
   *
   * Deshalb bekommt das Posterlayout NUR, was auch als Poster verkauft wird: bei den
   * gemeinfreien Meistern immer, bei einem lebenden Künstler nur unter `?ansicht=poster` —
   * der Adresse, auf die der Reiter „Poster viu" zeigt. Seine gewohnte Seite bleibt, wie sie
   * war; die Poster sind ein zweiter Raum, kein Umbau des ersten.
   */
  /**
   * ── DER QR-CODE ÖFFNET DEN FILM AUF DIESER SEITE (Owner 16.09.2026: „die seite soll nicht mehr
   * existieren wozu?" → B und C) ────────────────────────────────────────────────────────────
   *
   * Der Code trägt `?film=<nr>`. Wer scannt, landet hier, und genau dieses Werk läuft sofort
   * gross mit Musik. Schliesst er das Fenster, steht er auf der Seite des Künstlers — bei den
   * Postern, die er kaufen kann. Dafür braucht es keine zweite Seite mehr.
   */
  const filmOffen = String(sp.film ?? "").trim();
  /* ── EIN GESCANNTER CODE ÖFFNET IMMER DAS POSTER (17.09.2026 gemessen) ────────────────────
     Der Code auf dem Papier trägt nur `?film=<nr>`, ohne `ansicht=poster`. Bei einem lebenden
     Künstler zeigte die Seite dann die Originale — und das Fenster, das der Scan öffnen soll,
     gab es dort gar nicht. Wer sein gedrucktes Poster scannte, sah nichts. */
  /* ── SEINE SEITE IST DER POSTERLADEN (Owner 17.09.2026: „wir werden für die Künstler nur
     einen Postershop haben … die normale Künstlerseite verschwindet") ──────────────────────
     Wer Living Poster anbietet, hat keine zweite Seite mehr mit denselben Werken ohne Preis.
     Es gibt eine Wand: Poster mit Grösse, Rahmen und Preis — und daneben den Weg, nach dem
     Original zu fragen. `?ansicht=werke` bleibt als Rückweg für ihn selbst bestehen. */
  /**
   * ── DER POSTERSHOP IST PREMIUM (Owner 17.09.2026: „als poster anbieten ist ein premium" ·
   * „und auch als poster verkaufen nur als premium" · „Szidonia und Louisett haben premium") ──
   *
   * `m.posterViu` ist sein JA, nicht seine Berechtigung: Das Häkchen bleibt stehen, wenn ein Abo
   * ausläuft (gesetzt wurde es einmal mit Abo). Gefragt wird deshalb live — sonst verkauft ein
   * Künstler weiter Poster, für die er nicht mehr zahlt. Die gemeinfreien Meister gehören uns;
   * dort gilt Premium immer.
   */
  const premium = !!m.reproduktion || aboAktiv(m as Parameters<typeof aboAktiv>[0]);
  const posterAnsicht = !!m.posterViu && premium && sp.ansicht !== "werke";
  const kaufBar = !!m.reproduktion || posterAnsicht;
  /* Das lebende Blatt — Kundenfoto, „Generate art", überschreibbare Zeilen — hängt an
     demselben `premium` wie der Postershop (Owner 17.09.2026: „also upload und edit texte soll
     bei denen gar nicht erscheinen, nur wenn sie premium haben"). */
  const alsPoster = kaufBar;
  /* Poster und Kleidung werden getrennt gezeigt (15.09.2026) — `produkt` sagt, was ein Stück ist. */
  const istKleidung = (i: number) => !!m.werkInfo?.[i < 0 ? "standard" : String(i)]?.produkt;
  /* IN DER POSTERANSICHT NUR, WAS ER ANGEHAKT HAT (Owner 16.09.2026: „auch bei jedem bild wenn
     er das macht in seinem admin dann erscheint das in der kategorie"). Bei den gemeinfreien
     Meistern gilt weiter alles — dort setzt niemand Häkchen. */
  const posterWerk = (i: number) => !!m.werkInfo?.[i < 0 ? "standard" : String(i)]?.poster;
  /* Hat er noch KEINES angehakt, stehen alle da: Sein Ja gilt schon, die Auswahl macht er später
     — eine leere Kategorie sähe aus wie ein Fehler, nicht wie eine offene Entscheidung. */
  const eigeneAuswahl = kacheln.some(k => posterWerk(k.i));
  /**
   * ── VIER AUF EINEN BLICK, DER REST AUF KLICK (Owner 16.09.2026: „4 werke zeigen und mehr
   * button") ────────────────────────────────────────────────────────────────────────────────
   *
   * Ein Poster ist ein Blatt mit viel Papier darauf; sechs davon untereinander sind eine lange
   * Rolle, auf der das einzelne Werk untergeht. Vier zeigen, was es gibt — wer mehr will, sagt
   * es mit einem Klick (`?alle=1`).
   */
  const alleZeigen = String(sp.alle ?? "") === "1";
  const POSTER_ZUERST = 4;
  /* ── DAS REPRÄSENTATIVE WERK ZUERST (Owner 17.09.2026: „diese kachel machst du als erstes") ──
     Das Häkchen „dieses Bild repräsentiert mich" (`vertritt`, im Dashboard) bestimmt seit heute
     auch die Reihenfolge: das angehakte Werk steht vorn, der Rest bleibt in seiner Ordnung.
     So legt der Künstler selbst fest, was ein Besucher zuerst sieht — ohne neue Einstellung. */
  const vertritt = (i: number) => !!m.werkInfo?.[i < 0 ? "standard" : String(i)]?.vertritt;
  const posterKacheln = kacheln
    .filter(k => !istKleidung(k.i))
    .filter(k => !posterAnsicht || m.reproduktion || !eigeneAuswahl || posterWerk(k.i))
    .sort((a, b) => Number(vertritt(b.i)) - Number(vertritt(a.i)));
  const kleidungKacheln = kacheln.filter(k => istKleidung(k.i));
  /* Die Seite eines Werks: lakatosbandi.com/{name}/{nr} („standard" = das erste). */
  const werkLink = (i: number) =>
    `${P.kuenstler(kuenstler)}/${i < 0 ? "standard" : i}${admin ? `?s=${encodeURIComponent(adminS)}` : ""}`;
  /**
   * ── DIE POSTERKACHEL FÜHRT DORTHIN, WO AUCH DER CODE HINFÜHRT (Owner 16.09.2026: „klick auf
   * kachel soll nicht zum einzelnen werk führen sondern zum video") ─────────────────────────
   *
   * Ein Poster verspricht eine Sache: scannen und sehen, was passiert. Wer auf dem Bildschirm
   * darauf klickt, will dasselbe — nicht eine Produktseite.
   */
  const filmLink = (i: number) =>
    `${P.kuenstler(kuenstler)}?film=${i < 0 ? "standard" : i}${L === "en" ? "" : `&lang=${L}`}`;
  const freigabeLink = (a: "frei" | "abgelehnt") =>
    `/api/versusforge-freigabe?m=${encodeURIComponent(kuenstler)}&s=${encodeURIComponent(adminS)}&a=${a}`;
  /**
   * ── DIE REIHE DER ANDEREN KÜNSTLER (Owner 17.09.2026: „ich komme von einem künstler nicht
   * zu dem anderen, ich muss mich tot navigieren") ──────────────────────────────────────────
   *
   * Dieselbe Gruppe wie der aktuelle: Lebende neben Lebenden, Meister neben Meistern. Der Link
   * nimmt mit, was der Besucher gerade eingestellt hat — die Sprache und die Poster-Ansicht
   * (bei Meistern gibt es nur die eine Ansicht, dort bleibt `ansicht` weg). Das Bild ist
   * dieselbe Wahl wie sein Profilkreis oben: Foto, sonst das vertretende Werk.
   */
  const reihe = (await kuenstlerListe(imPortalSichtbar))
    /* ── DIE BEKANNTEN GEHÖREN IN DIE REIHE (Owner 17.09.2026: „hier fehlen die bekannten
       künstler") ────────────────────────────────────────────────────────────────────────────
       Erst war die Reihe nach Gruppen getrennt — Lebende neben Lebenden. Falsch herum gedacht:
       Van Gogh ist der Name, nach dem gesucht wird, und von seiner Seite aus soll man bei den
       lebenden landen (und umgekehrt). Die eigene Gruppe steht vorn, die andere schliesst an. */
    .sort((a, b) => Number(!!a.reproduktion !== !!m.reproduktion) - Number(!!b.reproduktion !== !!m.reproduktion))
    .map(x => {
      const w = werkKacheln(x, L);
      const vertreter = w.find(y => x.werkInfo?.[y.i < 0 ? "standard" : String(y.i)]?.vertritt) ?? w[0];
      const bild = x.profilBild
        ? `/api/portal-werk?m=${encodeURIComponent(x.kennung)}&i=profil`
        : (vertreter ? P.werkBild(x.kennung, vertreter.i) : "");
      const q = [
        ...(sp.ansicht === "poster" && !x.reproduktion ? ["ansicht=poster"] : []),
        ...(sp.lang ? [`lang=${encodeURIComponent(sp.lang)}`] : []),
      ];
      return { kennung: x.kennung, name: x.name, bild, aktiv: x.kennung === kuenstler,
        href: `${P.kuenstler(x.kennung)}${q.length ? `?${q.join("&")}` : ""}` };
    });

  return (
    /* `data-lang` für den Cookie-Streifen: Diese Seite läuft in der Sprache des Künstlers, ohne
       dass `?lang=` in der Adresse steht — `<html lang>` kommt aber aus dem Browser. Ohne das
       Attribut stand der Streifen hier deutsch auf einer rumänischen Seite (GEMESSEN 13.09.2026). */
    <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} preise={P.preise} journal={P.journal(L)} />
      <PortalKuenstlerReihe reihe={reihe} />
      <PosterZurueckSprung />

      <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-10 md:pt-14">
        {/* NUR FÜR DEN ADMIN: was Käufer sehen — und der Knopf dazu (Owner 11.09.2026). Deutsch, sie liest es. */}
        {admin && (
          <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-[#fff6e0] px-4 py-3 text-[14.5px] text-[#5b4a00]">
            <b>Admin-Vorschau.</b>
            <span>{m.freigabe === "frei" ? "Die Seite ist online." : m.freigabe === "abgelehnt" ? "Die Seite ist offline." : "Die Seite wartet auf Freigabe — Käufer sehen sie noch nicht."}</span>
            {m.freigabe === "frei"
              ? <a href={freigabeLink("abgelehnt")} className="font-semibold text-[#b3261e] underline">Offline nehmen</a>
              : <a href={freigabeLink("frei")} className="font-semibold text-[#1d6fd0] underline">Freigeben</a>}
          </div>
        )}
        {/* Sein Foto und sein Text — aus „Seite bearbeiten" (Owner 11.09.2026). */}
        {/**
          * ── OHNE FOTO STEHT SEIN WERK DORT (Owner 13.09.2026: „wo sind die Profilbilder?") ────
          *
          * GEMESSEN am 13.09.2026: Zehn von zwölf Künstlern haben kein Profilbild — die Stelle
          * blieb bei fast allen leer, und der Name stand nackt über der Seite.
          *
          * EIN ERZEUGTES GESICHT KOMMT HIER NICHT HIN. Das wäre ein erfundenes Porträt eines
          * realen, namentlich genannten Menschen auf seiner eigenen Seite — eine Fälschung
          * seiner Person, die er nicht einmal bemerkt. Stattdessen sein vertretendes Werk:
          * seine Kunst behauptet nichts über sein Aussehen. Lädt er ein Foto hoch, gewinnt es.
          */}
        <div className="flex items-center gap-4">
        {(() => {
          const eigenes = m.profilBild
            ? `/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=profil`
            : (() => {
                const vertreter = kacheln.find(x => m.werkInfo?.[x.i < 0 ? "standard" : String(x.i)]?.vertritt) ?? kacheln[0];
                return vertreter ? `/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=${vertreter.i}` : "";
              })();
          if (!eigenes) return null;
          return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={mitAdmin(eigenes)} alt={m.name}
              className="h-20 w-20 shrink-0 rounded-full object-cover md:h-24 md:w-24" />
          );
        })()}
        {/* ── BILD NEBEN DEM NAMEN (Owner 17.09.2026: „warum nicht bild neben namen?" · „die
            nehmen einen halben screen weg") ──────────────────────────────────────────────────
            Kreis, Name und Ort standen als drei Blöcke untereinander — auf dem Handy war der
            erste Bildschirm voll, bevor ein einziges Werk zu sehen war. Nebeneinander ist es
            dieselbe Information in einem Drittel der Höhe: das Gesicht links, Name und Ort
            rechts daneben. */}
        <span className="min-w-0">
          <h1 className="m-0 font-serif text-[32px] font-normal leading-[1.05] md:text-[52px]">{m.name}</h1>
          {m.ort ? <p className="m-0 mt-1 text-[15px] text-[#555]">{m.ort}</p> : null}
        </span>
        </div>
        {/* ── WO MAN IHM SONST FOLGT (Owner 13.09.2026: „Feld für Instagram oder Facebook") ────
            Unter dem Ort, klein und unaufdringlich: Sie sind eine Zugabe, kein Kaufweg. Wer hier
            ist, soll zuerst mit seinem Agenten sprechen — und wer ihm lieber auf Instagram folgt,
            findet es trotzdem. Nur was er eingetragen hat, steht da. */}
        {(m.instagram || m.facebook) && (
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14.5px]">
            {m.instagram && (
              <a href={m.instagram} target="_blank" rel="noopener nofollow"
                className="text-[#555] underline underline-offset-2 hover:text-[#111]">Instagram</a>
            )}
            {m.facebook && (
              <a href={m.facebook} target="_blank" rel="noopener nofollow"
                className="text-[#555] underline underline-offset-2 hover:text-[#111]">Facebook</a>
            )}
          </p>
        )}
        {/* SEIN TEXT SCHLÄGT DIE ERZEUGTE BESCHREIBUNG — immer. Die Beschreibung (dritte Person,
            aus der Bildanalyse) erscheint nur, solange er selbst nichts geschrieben hat; sie füllt
            eine Lücke, sie verdrängt nichts (Owner 13.09.2026). */}
        {m.ueberMich
          ? (
            /* Nach vier Zeilen zum Ausklappen (Owner 16.09.2026) — der Text einiger Künstler
               füllte den ganzen ersten Bildschirm, und die Werke begannen erst darunter. */
            <div className="mt-5 max-w-[640px]">
              <MehrText text={m.ueberMich} mehr={T.mehrLesen} weniger={T.wenigerLesen}
                className="whitespace-pre-line text-[16.5px] leading-[1.6] text-[#333]" />
            </div>
          )
          : m.werkBeschreibung
            ? <p className="mt-5 max-w-[640px] whitespace-pre-line text-[16.5px] leading-[1.6] text-[#333]">{m.werkBeschreibung}</p>
            : null}

        {/* ── MIT IHM SPRECHEN ODER IHM FOLGEN (Owner 13.09.2026: „ein Follow-Button einbauen") ──
            Nebeneinander, aber nicht gleichwertig: Der Agent ist gefüllt, „Folgen" nur umrandet.
            Wer kaufen will, redet; wer nur schauen will, folgt — und kommt wieder, wenn ein neues
            Werk da ist. Bisher war der zweite Besuch gar nicht vorgesehen. */}
        {/* ── EINE ZEILE, NICHT DREI BALKEN (Owner 17.09.2026: „was sollen diese fette buttons
            untereinander?" · „die nehmen einen halben screen weg") ────────────────────────────
            Gespräch, Teilen und Folgen standen als drei breite Blöcke untereinander — auf dem
            Handy stand vor dem ersten Werk nichts als Knöpfe. Jetzt stehen sie nebeneinander,
            schlanker, und nur der Weg zum Künstler bleibt schwarz gefüllt. */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <a href={agentLink(h)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#111] px-4 py-2 text-[14px] font-semibold text-white no-underline hover:bg-[#333]">
            <MessageCircle className="h-4 w-4" aria-hidden />
            {T.agentKurz}
          </a>
          {/* DER DRITTE UND LEISESTE (Owner 13.09.2026: „Künstlerseiten müssen noch einen
              Share-Button haben") — wer teilt, ist schon überzeugt; der Kaufweg bleibt der
              lauteste. Auf dem Rechner, wo das Gerät nichts zu teilen weiß, kopiert er den Link. */}
          <PortalTeilen adresse={kuenstlerUrl(kuenstler)} name={m.name} T={T} />
          <PortalFolgen mandant={kuenstler} T={T} />
        </div>

        {/* ── ZWEI KATEGORIEN (Owner 15.09.2026: „du machst die kategorie jetzt rein
            reproduceri neben Lucrari und aus lucrari machst du Originale") ─────────────────────
            Bei einem lebenden Künstler stehen seine Werke unter „Originale". Auf einer
            Reproduktions-Seite gibt es KEIN Original — dort heisst der Abschnitt „Reproduceri",
            und alles andere wäre eine Lüge über das, was man kauft. */}
        {/* ── KLEIDUNG GEHÖRT NICHT ZU DEN POSTERN (Owner 15.09.2026: „t-shirts und hoodies sind
            jetzt auch als poster. sollen wir besser nicht in dieser kategorie lassen" · „lieber
            in einer anderen mit einem anderen layout") ────────────────────────────────────────
            Ein Shirt mit QR-Code und der Zeile „VIDEOPOSTER" behauptet etwas, was es nicht ist.
            Deshalb zwei Abschnitte: oben die Poster im Posterlayout, darunter die Kleidung in
            einem schlichten Raster. */}
        <h2 className="mt-14 border-t border-[#e5e5e5] pt-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{alsPoster ? T.werkeReproduktionen : T.werke}</h2>
        {/* ── WIE ES AN DER WAND AUSSIEHT (Owner 15.09.2026: „ich habe dir zwei bilder abgelegt.
            die müssen wir zeigen") ────────────────────────────────────────────────────────────
            Das zweite Foto erklärt das Produkt ohne ein einziges Wort: jemand steht davor und
            liest auf dem Telefon, was an der Wand hängt. Deshalb steht es vor den Kacheln und
            nicht irgendwo unten. */}
        {kaufBar ? (
          <div className="mt-5">
            {/* Zuerst erklären, dann zeigen (Owner 15.09.2026: „am anfang bitte mehr erklären
                über diese kategorie und die bilder nicht so groß, die sehen aus wie die shop
                kacheln auf dem handy"). Die Fotos sind Beleg, nicht Ware — deshalb klein und
                nebeneinander, auch auf dem Handy. */}
            <p className="m-0 max-w-[62ch] text-[16px] leading-[1.6] text-[#444]">{T.posterErklaerung}</p>
            {/* GANZ ZU SEHEN, NICHT BESCHNITTEN (Owner 16.09.2026: „die will ich ganz sehen") —
                die Fotos sind hochkant (4:5); eine feste Höhe schnitt Poster und Telefon oben und
                unten ab. Genau dort steht aber, worum es geht. Reihenfolge getauscht (Owner:
                „und reihenfolge tauschen"). */}
            {/* ── KEIN WANDFOTO AUF DER KÜNSTLERSEITE (Owner 17.09.2026: „das ist zu viel" ·
                „raus damit") ─────────────────────────────────────────────────────────────────
                Das Foto zeigt ein VAN-GOGH-Blatt. Auf der Seite eines lebenden Künstlers steht
                damit fremde Ware über seinen eigenen Werken — und darunter hängen seine Poster
                ohnehin in echt. Auf der Startseite, wo das Produkt erklärt wird, bleibt es. */}
          </div>
        ) : null}

        {/* ── ZWEI LÄDEN, BEIDE SICHTBAR (Owner 17.09.2026: „also die künstler haben einen
            postershop und einen original shop, ja? Muss aber auch im profil erscheinen. Beide bei
            den leuten die premium haben") ───────────────────────────────────────────────────────
            Beide Ansichten gab es schon — aber nur über die Adresse (`?ansicht=werke`), und das
            weiss ein Besucher nicht. Ein Künstler mit Premium verkauft zweierlei: Drucke nach
            seinen Werken und die Originale selbst. Also stehen beide als Reiter da, mit eigener
            Adresse (dieselbe Begründung wie in `PortalReiter`: Google, Zurück-Knopf, ohne JS). */}
        {premium && !m.reproduktion && m.posterViu ? (
          <PortalReiter reiter={[
            { label: T.tabReproduktionen, aktiv: posterAnsicht,
              href: `${P.kuenstler(kuenstler)}?ansicht=poster${L === "en" ? "" : `&lang=${L}`}` },
            { label: T.tabWerke, aktiv: !posterAnsicht,
              href: `${P.kuenstler(kuenstler)}?ansicht=werke${L === "en" ? "" : `&lang=${L}`}` },
          ]} />
        ) : null}

        <ul className="mt-10 grid list-none grid-cols-1 gap-x-8 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {(alsPoster && !alleZeigen ? posterKacheln.slice(0, POSTER_ZUERST) : posterKacheln).map(k => (
            /* `lb-poster-block` grenzt die Rahmenwahl auf DIESE Kachel ein (globals.css) —
               sonst färbt eine Wahl alle Poster der Seite (16.09.2026). */
            /* ── DIE KACHEL HAT EINE MARKE (Owner 18.09.2026: „muss genau zu der stelle
               springen in der seite, wo er war") ───────────────────────────────────────────
               `#w-3` hängt an der Adresse, die wir Stripe für „Abbrechen" mitgeben — der Browser
               springt damit genau an dieses Werk zurück, nicht an den Seitenanfang. */
            <li key={k.i} id={`w-${k.i < 0 ? "standard" : k.i}`} className="lb-poster-block">
              {/* ── ZWEI KLICKS, ZWEI ZIELE (Owner 17.09.2026: „klick aufs bild vergrössert das
                  poster full und klick auf code führt zum QR fenster") ──────────────────────────
                  Bis heute war die ganze Kachel EIN Link zum Film — wer das Blatt genauer ansehen
                  wollte, landete im Fenster. Jetzt macht das Blatt das Blatt gross, und der Code
                  tut, was ein Code tut: er führt ins Fenster (der Link sitzt im Poster selbst).
                  Ohne Posterlayout bleibt es bei der einen Kachel zur Werkseite. */}
              <PosterGross alsPoster={alsPoster} href={agentLink(String(k.i))}>
                {/* ── DIE KACHEL IST DAS POSTER (Owner 15.09.2026: „also kachel soll aussehen
                    wie das poster mit qr code und allem") ──────────────────────────────────────

                    HTML STATT VIDEO DES GANZEN POSTERS (Owner: „drum herum ist html?"): Der
                    Rahmen, der QR und jede Zeile sind echter Text — scharf, übersetzbar, und ein
                    Bruchteil der Daten. Bewegt ist nur das Werk in der Mitte.

                    Dieselbe Reihenfolge wie auf dem gedruckten Poster, damit der Käufer es
                    wiedererkennt: QR, VIDEOPOSTER, Werk, Name, Lebensdaten, Titel, Geschichte,
                    unsere Zeile. */}
                {/* ── DAS BLATT KOMMT AUS EINEM RASTER (16.09.2026) ──────────────────────────
                    Alle Maße stehen in `lib/lakatosbandi-poster.ts` und gelten für den Schirm wie
                    für die Druckdatei. Hier wird nur noch gesagt, WAS auf dem Blatt steht. */}
                {alsPoster ? (
                  /* Der Name ist in jeder Sprache derselbe (Owner 16.09.2026: „A" · „auch die
                     kategorie heisst so in allen 3 sprachen"). */
                  <Poster
                    /* Kein Kopf über dem Werk (Owner 17.09.2026: „raus") — die Adresse steht
                       in der Rechtezeile am Fuss. */
                    /* Auch kein Künstlername und kein Profilbild auf dem Blatt (Owner
                       17.09.2026: „Gerry Louisett raus") — er steht in der Rechtezeile; oben
                       trägt der TITEL des Werks die Zeile. */
                    {...(() => {
                      /* ── DIE GROSSE ZEILE BLEIBT NIE LEER (Owner 17.09.2026: „mach noch titel
                         rein bei diesen") ──────────────────────────────────────────────────────
                         Hat der Künstler für ein Werk keinen Titel eingetragen (`werkInfo.titel`
                         im Dashboard), stünde dort nichts — auf einem Blatt, dessen Überschrift
                         genau diese Zeile ist. Dann trägt sie seinen NAMEN: echte Angabe statt
                         erfundener Werktitel, und das Blatt sieht bei jedem Werk gleich aus. */
                      const wi = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
                      const titel = wi ? [wi.titel, wi.jahr].filter(Boolean).join(", ") : "";
                      /* ── DIE GROSSE ZEILE HEISST „YOUR NAME" (Owner 17.09.2026: „your name drin
                         stehen, dann verstehen es die leute") ──────────────────────────────────
                         Vorher stand dort der Werktitel oder der Künstlername — niemand sah, dass
                         die Zeile ihm gehört. Jetzt steht der Platzhalter in seiner Sprache, den
                         er überschreibt (`PosterDeinText`), und DARUNTER klein der Stil: der
                         Werktitel, sonst der Name des Ateliers. */
                      /* Die Zeile darunter heisst „BY GERRY LOUISETT" (Owner 17.09.2026) — wer das
                         Blatt gemalt hat, nicht welches Werk es einmal war. */
                      /* ── AUF DEM BLATT STEHT SEIN NAME (Owner 17.09.2026: „ja schreib seinen
                         namen sonst dreht er durch" · „mach bei allen Künstlern den
                         Künstlernamen rein statt Numele tău") ──────────────────────────────
                         Kein Platzhalter, auch nicht über dem erzeugten Bild: Das Blatt gehört
                         dem Künstler. Der Kunde kann die Zeile überschreiben — dann tritt
                         darunter „BY …" hervor (`PosterStil`). */
                      return {
                        titel: premium ? <PosterDeinText satz={m.name} art="titel" /> : m.name,
                        stil: premium ? <PosterStil name={m.name} /> : titel,
                      };
                    })()}
                    /* ── DEN SATZ SCHREIBT DER KUNDE SELBST (Owner 17.09.2026: „ok jetzt text
                       editieren") ───────────────────────────────────────────────────────────
                       Der Stift steckt im Satz, weil nur er weiss, ob gerade gelesen oder
                       geschrieben wird. Nur im Browser — wie das Foto. */
                    text={premium ? <PosterDeinText satz={posterAnriss(k.hook)} qrEcke /> : posterAnriss(k.hook)}
                    /* Der Knopf „You as a picture" sitzt jetzt IM Bildfeld, weil er das Bild
                       tauscht (`PosterDeinBild` weiter unten) — nicht mehr hier am Blatt. */
                    qrEcke
                    /* Der Code führt ins Fenster — dorthin, wo er auch auf Papier hinführt
                       (Owner 17.09.2026: „klick auf code führt zum QR fenster"). */
                    qrLink={filmLink(k.i)}
                    qr={`/lakatosbandi/qr/${kuenstler}-${k.i < 0 ? "standard" : k.i}.png`}
                    scan={T.qrScannen}
                    /* Nur die Adresse (Owner 17.09.2026: „hier soll stehen nur
                       lakatosbandi.com") — wer das Blatt an der Wand sieht, soll EINE Sache
                       lesen und sie eintippen können, keine Rechtezeile entziffern. */
                    /* ── SEINE ADRESSE STEHT AUF DEM BLATT (Owner 18.09.2026) ─────────────
                       Bisher stand hier nur das Haus. Auf einem Blatt, das jemand in SEINEM Stil
                       erzeugt hat, gehört der Weg zu ihm: „nach dem Stil von … · lakatosbandi.com
                       /sein-name". Damit ist jedes erzeugte Bild Werbung für ihn statt Diebstahl
                       an ihm. */
                    /* Das Siegel nur bei LEBENDEN Künstlern (Owner 18.09.2026: „bei den
                       lebendigen Künstlern") — bei einem gemeinfreien Meister gibt es niemanden,
                       der eine Lizenz bekommt; der Stempel wäre dort eine Lüge. */
                    siegel={!m.reproduktion}
                    recht={<PosterRecht name={m.name} stilText={T.stilNachweis}
                      adresse={kuenstlerUrl(kuenstler).replace(/^https?:\/\//, "")} />}
                    bildEcke={<PosterGrossKnopf />}
                    bild={
                      /* ── SEIN FOTO AN DIE STELLE DES WERKS (Owner 17.09.2026: „zuerst ‚your
                         picture‘ ersetzt nur das bild") ───────────────────────────────────────
                         Nur im Browser, nichts gespeichert: „wenn er rausgeht von der seite,
                         dann ist das bild weg" — ein Zwischenspeicher, kein Konto. */
                      <PosterDeinBild knopf="You as a picture" erzeugen="Generate art" warten="Creating art…" sprache={L}
                        mandant={kuenstler} werk={k.i < 0 ? "standard" : String(k.i)}
                        /* Häkchen am Werk (`kunst`): fehlt es, ist der Knopf da; steht es auf
                           „nein", bleibt das Werk ein Werk. */
                        aus={!premium || m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.kunst === false}>
                      <PosterFilm
                        /* Im Blatt gehört der Klick dem Blatt, das Fenster dem Code
                           (Owner 17.09.2026). */
                        klickOeffnet={false}
                        quelle={m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.film
                          ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${k.i < 0 ? "standard" : k.i}&v=${encodeURIComponent(m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.filmAm ?? "1")}`
                          : undefined}
                        /* Wo der Künstler selbst über sein Werk spricht, ist ER das Fenster
                           (Owner 17.09.2026: „so müsste jedes Poster präsentiert werden"). */
                        /* Liegt sein Film auf YouTube, spielt das Fenster von dort (Owner
                           17.09.2026) — ausser er will nur gehört werden. */
                        youtube={!m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.nurStimme
                          ? m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.youtube
                          : undefined}
                        /* Häkchen „nur die Stimme": Der Film bleibt liegen, aber das Fenster
                           zeigt das Werk und spielt nur seine Tonspur (Owner 17.09.2026). */
                        sprecher={m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.sprecher
                          && !m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.nurStimme
                          ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${k.i < 0 ? "standard" : k.i}&art=sprecher&v=${encodeURIComponent(m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.sprecherAm ?? "1")}`
                          : undefined}
                        /* Seine vorgelesene Stimme — wenn es keinen Sprecher-Film gibt, ist SIE
                           der Living Poster (Owner 17.09.2026). */
                        ton={(m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.stimme
                          || (m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.sprecher
                            && m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.nurStimme))
                          ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${k.i < 0 ? "standard" : k.i}&art=${m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.stimme ? "stimme" : "sprecher"}&v=${encodeURIComponent(m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.stimmeAm ?? m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.sprecherAm ?? "1")}`
                          : undefined}
                        sprecherBild={m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.sprecher
                          ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${k.i < 0 ? "standard" : k.i}&art=sprecherbild&v=${encodeURIComponent(m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.sprecherAm ?? "1")}`
                          : undefined}
                        bild={mitAdmin(P.werkBild(kuenstler, k.i))} alt={m.name}
                        quer={!!m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.quer}
                        profil={m.profilBild ? mitAdmin(`/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=profil`) : undefined}
                        sofort={filmOffen === (k.i < 0 ? "standard" : String(k.i))}
                        kaufPoster={kaufBar ? T.kaufPoster : undefined}
                        {/* ── OHNE PREIS KEIN ORIGINAL (Owner 17.09.2026: „nur original kann man
                             nicht, falls kein preis") — steht am Werk kein Preis, ist es nicht zu
                             haben: verkauft, in einer Sammlung, oder er will es behalten. „Nach
                             dem Original fragen" führte dort in ein Gespräch, das mit einer
                             Absage endet. Das Poster bleibt bestellbar. */
                          ...(m.reproduktion || !preisText(m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.preis)
                          ? {}
                          : { kaufOriginal: { text: T.originalAnfragen, href: agentLink(k.i < 0 ? "-1" : String(k.i)) } })}
                        kuenstler={m.name} leben={m.leben}
                        titel={(() => {
                          const wi = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
                          return wi ? [wi.titel, wi.jahr].filter(Boolean).join(", ") : "";
                        })()}
                        geschichte={k.hook} ueber={m.ueberMich} />
                      </PosterDeinBild>
                    }
                  />
                ) : (
                  /* Ohne Posterlayout: das Werk allein, darunter steht die Zeile ausserhalb. */
                  <div className="flex items-center justify-center">
                    <PosterFilm fenster={false}
                      bild={mitAdmin(P.werkBild(kuenstler, k.i))} alt={m.name}
                      quer={!!m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.quer}
                      profil={m.profilBild ? mitAdmin(`/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=profil`) : undefined}
                      kuenstler={m.name} titel={(() => {
                        const wi = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
                        return wi ? [wi.titel, wi.jahr].filter(Boolean).join(", ") : "";
                      })()}
                      geschichte={k.hook} ueber={m.ueberMich} />
                  </div>
                )}
              </PosterGross>
              {(() => {
                const w = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
                /* Das Preisschild: bei Kleidung fest, beim Poster die Spanne, sonst sein Satz. */
                const fest = w?.produkt ? druckPreisCents(w.produkt, druckGroessenFuer(w.produkt)[0] ?? "") : null;
                /* Beim lebenden Künstler liegt sein Honorar oben drauf (Owner 16.09.2026) —
                   bei den gemeinfreien Meistern nicht: Dort gibt es niemanden, der bezahlt wird. */
                const spanne = fest === null && kaufBar ? druckSpanneCents(!m.reproduktion) : null;
                const preis = fest !== null ? eur(fest, L)
                  : spanne ? `${eur(spanne.von, L)} – ${eur(spanne.bis, L)}`
                    : (preisText(w?.preis) || preisSatz(m.preisSpanne, T.preisAufAnfrage));
                const zeile = !kaufBar && w ? [w.titel, w.technik, w.groesse, w.jahr].filter(Boolean).join(" · ") : "";
                return (
                  /* Luft zwischen Werk und Angaben (Owner 16.09.2026: „brauche abstand zum bild
                     preis") — ohne sie klebt das Preisschild am unteren Bildrand. */
                  <div className={alsPoster ? "mt-4 text-center" : "mt-3"}>
                    {zeile ? <p className="m-0 text-[14px] leading-[1.45] text-[#666]">{zeile}</p> : null}
                    {/* DAS PREISSCHILD IST RAUS (Owner 15.09.2026: „das raus") — bei einer
                        Reproduktion steht der Preis schon auf dem Kaufknopf, und zweimal
                        dieselbe Zahl übereinander liest niemand als Angebot, sondern als
                        Unordnung. Bei lebenden Künstlern bleibt es: dort gibt es keinen Knopf. */}
                    {preis && !kaufBar ? <p className="m-0 mt-2"><PreisLabel>{preis}</PreisLabel></p> : null}
                    {/* Der Verkaufssatz — unter der Kachel, nicht im Poster (Owner 16.09.2026).
                        Nur beim Druck: bei einem T-Shirt wäre „Drucke dieses Bildes" falsch. */}
                    {kaufBar && !w?.produkt ? (
                      <>
                        <p className="m-0 mx-auto max-w-[42ch] text-[14px] leading-[1.5] text-[#666]">
                          {m.reproduktion
                            ? T.druckVerkauf
                            : T.druckVerkaufKuenstler.replace("{anteil}", eur(DRUCK_KUENSTLER_CENTS, L))}
                        </p>
                        {/* ── DER VERSAND STEHT VOR DEM KLICK (Skill `bezahlung`, Regel 8) ──────
                            Er hängt seit 17.09.2026 an der Wahl (gerahmt fährt teurer, eine Datei
                            fährt gar nicht), also schreibt ihn der Kaufknopf selbst — hier stünde
                            sonst eine feste Zahl, die für zwei von drei Fällen falsch ist. */}

                      </>
                    ) : null}
                    {kaufBar ? (
                      <KaufKnopf mandant={kuenstler} werk={k.i < 0 ? "standard" : String(k.i)}
                        material={w?.produkt ?? "posterramaneagra"} sprache={L} anteil={!m.reproduktion} adminS={admin ? adminS : ""}
                        texte={{ kaufen: T.kaufKaufen, korb: T.kaufKorb, groesse: T.kaufGroesse, fehler: T.korbFehler,
                          ohneRahmen: T.druckOhneRahmen, ohneRahmenWahl: T.ohneRahmenWahl, mitRahmen: T.druckMitRahmen, mitRahmenWahl: T.mitRahmenWahl, versand: T.druckVersandDrin, rahmenSchwarz: T.druckRahmenSchwarz }}
                        /* Die Datei steckt im selben Block (Owner 17.09.2026) — nur beim Poster,
                           nicht bei Kleidung: „Druckdatei eines T-Shirts" gibt es nicht. */
                        datei={!w?.produkt ? { kaufen: T.dateiKaufen, erklaerung: T.dateiErklaerung,
                          schwarz: T.dateiSchwarz, holz: T.dateiHolz, ohne: T.dateiOhne } : undefined} />
                    ) : null}
                    {/* ── DIE FRAGE NACH DEM ORIGINAL STEHT BEIM KAUF, NICHT UNTER DER DATEI
                        (Owner 17.09.2026: „aber nicht hier · sondern · hier") ─────────────────
                        Ganz unten sah der Link aus wie eine Fussnote zur PDF-Datei. Er gehört
                        direkt hinter den Kaufknopf: Wer den Preis liest und das Original will,
                        findet dort den Weg — vor dem Zusatzangebot, nicht dahinter. */}
                    <a href={agentLink(String(k.i))} className="mt-3 inline-block text-[14px] text-[#111] underline">{T.agent}</a>
                  </div>
                );
              })()}
            </li>
          ))}
        </ul>

        {alsPoster && !alleZeigen && posterKacheln.length > POSTER_ZUERST ? (
          <p className="mt-10 text-center">
            <a href={`${P.kuenstler(kuenstler)}?alle=1${sp.ansicht === "poster" ? "&ansicht=poster" : ""}${L === "en" ? "" : `&lang=${L}`}`}
              className="inline-block rounded-xl border border-[#111] px-6 py-3 text-[15px] font-semibold text-[#111] no-underline transition hover:bg-[#111] hover:text-white">
              {T.mehrWerke.replace("{n}", String(posterKacheln.length))}
            </a>
          </p>
        ) : null}

        {kleidungKacheln.length > 0 && (
          <>
            <h2 className="mt-16 border-t border-[#e5e5e5] pt-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{T.werkeKleidung}</h2>
            {/* Schlichtes Raster: Foto, Titel, Preis, Kaufweg. Kein Passepartout, kein QR — ein
                Kleidungsstück ist kein gerahmtes Bild. */}
            <ul className="mt-6 grid list-none grid-cols-2 gap-x-6 gap-y-10 p-0 md:grid-cols-4">
              {kleidungKacheln.map(k => {
                const wk = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
                const pk = wk?.produkt ? druckPreisCents(wk.produkt, druckGroessenFuer(wk.produkt)[0] ?? "") : null;
                return (
                  <li key={k.i}>
                    <a href={werkLink(k.i)} className="block text-[#111] no-underline">
                      <div className="flex aspect-square items-center justify-center bg-[#f5f5f5]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mitAdmin(P.werkBild(kuenstler, k.i))} alt={wk?.titel || m.name} loading="lazy"
                          className="max-h-full max-w-full object-contain" />
                      </div>
                      {wk?.titel ? <p className="mt-3 text-[14px] font-semibold leading-[1.35]">{wk.titel}</p> : null}
                    </a>
                    {pk !== null ? <p className="mt-1.5"><PreisLabel groesse="klein">{eur(pk, L)}</PreisLabel></p> : null}
                    {wk?.produkt ? (
                      <KaufKnopf mandant={kuenstler} werk={k.i < 0 ? "standard" : String(k.i)}
                        material={wk.produkt} sprache={L} adminS={admin ? adminS : ""}
                        texte={{ kaufen: T.kaufKaufen, korb: T.kaufKorb, groesse: T.kaufGroesse, fehler: T.korbFehler,
                          ohneRahmen: T.druckOhneRahmen, ohneRahmenWahl: T.ohneRahmenWahl, mitRahmen: T.druckMitRahmen, mitRahmenWahl: T.mitRahmenWahl, versand: T.druckVersandDrin, rahmenSchwarz: T.druckRahmenSchwarz }} />
                    ) : null}
                    <a href={agentLink(String(k.i))} className="mt-1.5 inline-block text-[13.5px] text-[#111] underline">{T.agent}</a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
      <PortalFuss lang={L} />
      {/* Der Korb liegt im Browser und zeigt sich erst, wenn etwas drin ist. */}
      {kaufBar ? (
        <Korb sprache={L} texte={{
          titel: T.korbTitel, versand: T.korbVersand, summe: T.korbSumme,
          kasse: T.korbKasse, weg: T.korbWeg, leeren: T.korbLeeren, fehler: T.korbFehler,
          material: { poster: T.druckPapier, posterrama: `${T.druckPapier} · ${T.druckMitRahmen}`, posterramaneagra: `${T.druckPapier} · ${T.druckRahmenSchwarz}`, tricou: T.druckTricou, hanorac: T.druckHanorac },
        }} />
      ) : null}
      {/* Sein Agent begrüßt jeden Besucher und zählt den Besuch (Owner 11.09.2026). */}
      {/* Der Admin ist kein Besucher: nicht zählen, keine Besuchs-Mail. */}
      <KuenstlerAgent mandant={kuenstler} name={m.name} T={T} messen={!admin} hook={h} reproduktion={!!m.reproduktion} produkt={m.werkInfo?.[h === "-1" || h === "" ? "standard" : h]?.produkt}
        offen={String(sp.agent ?? "") === "1"} datenschutz={datenschutz} sprache={L}
        {...(() => {
          /* ── DIE WAHL IM AGENTENFENSTER (Owner 16.09.2026) ──────────────────────────────
             Nur wenn dieses Werk wirklich als Poster angeboten wird: der Künstler hat es
             freigegeben, es ist keine Kleidung, und es gibt einen Preis dafür. Sonst steht im
             Fenster eine Wahl zwischen einem Weg und einem, den es nicht gibt. */
          const nr = h === "-1" || h === "" ? "standard" : h;
          const wi = m.werkInfo?.[nr];
          if (m.reproduktion || !m.posterViu || wi?.produkt) return {};
          if (eigeneAuswahl && !wi?.poster) return {};
          const spanne = druckSpanneCents(true);
          return {
            posterWahl: {
              bild: mitAdmin(P.werkBild(kuenstler, nr === "standard" ? -1 : Number(nr))),
              original: `${P.kuenstler(kuenstler)}/${nr}${L === "en" ? "" : `?lang=${L}`}`,
              poster: `${P.kuenstler(kuenstler)}?ansicht=poster${L === "en" ? "" : `&lang=${L}`}`,
              preisPoster: `${T.druckAb.replace("{preis}", eur(spanne.von, L))}`,
              preisOriginal: preisText(wi?.preis) || preisSatz(m.preisSpanne, T.preisAufAnfrage),
              /* Dasselbe Blatt wie in der Kachel, nur klein — kein nachgebautes Aussehen. */
              vorschau: (
                <Poster
                  kopf={POSTER_TITEL}
                  profil={m.profilBild ? mitAdmin(`/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=profil`) : undefined}
                  name={m.name}
                  titel={[wi?.titel, wi?.jahr].filter(Boolean).join(", ")}
                  klasse="lb-poster-block"
                  bild={
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={mitAdmin(P.werkBild(kuenstler, nr === "standard" ? -1 : Number(nr)))}
                      alt="" className={wi?.quer ? "block h-auto w-full" : "block h-full w-auto"} />
                  }
                />
              ),
            },
          };
        })()} />
    </div>
  );
}
