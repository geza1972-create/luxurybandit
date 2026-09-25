import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { werkKacheln, portalPfade } from "@/lib/lakatosbandi";
import { druckPreisCents, druckAbzugCents, istDatei, istEigenesStueck, druckVersandCents, posterPreisA3Cents, DRUCK_LAENDER } from "@/lib/lakatosbandi-druck";
import { kundenbildZettel } from "@/lib/lakatosbandi-kundenbild";
import { korbAblegen } from "@/lib/lakatosbandi-bestellung";
import { createPackCheckout, stripeConfigured } from "@/lib/stripe";
import { keinMensch } from "@/lib/kein-mensch";

/**
 * DIE KASSE FÜR DRUCKE — EIN POSTEN ODER EIN GANZER KORB (Owner 15.09.2026: „das problem wird
 * sein wenn jemand mehr kaufen möchte. Wir haben kein warenkorb").
 *
 * ── DER BETRAG KOMMT NIE AUS DEM BROWSER (Skill `bezahlung`, Regel 3) ───────────────────────
 *
 * Der Korb sagt WAS er will — Mandant, Werk, Material, Größe. Welcher Betrag daran hängt, weiss
 * allein `druckPreisCents`. Ein unbekannter Posten bekommt KEINE Kasse und keinen Rückfall auf
 * die kleinste Stufe: Sonst entstünde eine Bestellung über einen Preis, den nie jemand
 * angezeigt bekommen hat.
 *
 * JEDER POSTEN WIRD EINZELN GEPRÜFT — Mandant, Reproduktions-Merker, Werk, Material, Größe. Ein
 * einziger fauler Posten kippt den ganzen Kauf: lieber keine Kasse als eine Bestellung mit einer
 * Zeile, die niemand ausliefern kann.
 *
 * ── NUR REPRODUKTIONEN ──────────────────────────────────────────────────────────────────────
 *
 * Ein lebender Künstler verkauft ein Original und handelt den Preis selbst aus. Hier kaufen darf
 * man nur auf Seiten mit `reproduktion`.
 *
 * ── VERSAND EINMAL, NICHT JE POSTEN ─────────────────────────────────────────────────────────
 *
 * Fünf Poster kommen in einem Paket. Fünfmal Versand zu berechnen wäre der einfachste Weg, einen
 * Käufer zu verlieren, der gerade fünf Dinge in den Korb gelegt hat.
 *
 * ── DIE ADRESSE HOLT STRIPE ─────────────────────────────────────────────────────────────────
 *
 * `shipping_address_collection` — wir fragen sie nicht selbst ab und speichern sie nicht.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Mehr passt in kein Paket und in keine ehrliche Bestellung. */
const HOECHSTENS = 20;

type Posten = { mandant: string; werk: string; material: string; groesse: string; name: string; cents: number; bild?: string };

export async function POST(request: Request) {
  if (keinMensch(request)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!stripeConfigured()) return NextResponse.json({ ok: false, grund: "keine-kasse" }, { status: 503 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  /* Ein einzelner Posten kommt weiterhin ohne Korb — der Agent kauft so. */
  /* Gefüllt beim Durchgehen der Posten — die erste Adresse, die an einem Bild hängt. */
  let kaeuferMail = "";
  const roh = Array.isArray(b.artikel) && b.artikel.length
    ? (b.artikel as Record<string, unknown>[])
    : [b];
  if (roh.length > HOECHSTENS) return NextResponse.json({ ok: false, grund: "zu-viele" }, { status: 400 });

  const sprache = str(b.sprache, 5) || "ro";
  const posten: Posten[] = [];
  /* Dieselbe Seite wird oft mehrfach bestellt — einmal lesen reicht. */
  /* Der Testkauf des Owners — erkannt am Admin-Schlüssel, den die Seite mitschickt. */
  const istAdmin = mandantPruefen(EIGENER_MANDANT, str(b.s, 200)).ok;

  const gelesen = new Map<string, Awaited<ReturnType<typeof mandantLesen>>>();

  for (const a of roh) {
    const mandant = str(a.mandant, 80);
    if (!mandant) return NextResponse.json({ ok: false, grund: "kein-druck" }, { status: 404 });
    if (!gelesen.has(mandant)) gelesen.set(mandant, await mandantLesen(mandant));
    const m = gelesen.get(mandant);
    /**
     * ── VERKAUFT WIRD NUR, WAS UNS ZUSTEHT ────────────────────────────────────────────────
     *
     * Bei den gemeinfreien Meistern immer (`reproduktion`), bei einem lebenden Künstler nur,
     * wenn er selbst zugestimmt hat (`posterViu`, sein Häkchen im Formular, 16.09.2026). Ohne
     * das eine oder andere entsteht hier keine Kasse — auch dann nicht, wenn der Browser es
     * behauptet.
     */
    if (!m || (!m.reproduktion && !m.posterViu) || m.freigabe !== "frei") {
      return NextResponse.json({ ok: false, grund: "kein-druck" }, { status: 404 });
    }

    const werkRoh = str(a.werk, 10);
    const nr = werkRoh === "standard" ? "-1" : (/^-?\d+$/.test(werkRoh) ? String(Number(werkRoh)) : "-1");
    const kacheln = werkKacheln(m);
    const kachel = kacheln.find(k => String(k.i) === nr) ?? kacheln[0];
    if (!kachel) return NextResponse.json({ ok: false, grund: "kein-werk" }, { status: 404 });

    const material = str(a.material, 20);
    const groesse = str(a.groesse, 20);
    /**
     * ── WAS AUF DEM BLATT STEHT, BESTIMMT DEN ANTEIL (Owner 18.09.2026: „wenn das Bild nicht
     * generiert ist, dann darf man keine Lizenz verlangen" · „1 Euro bekommt der Künstler") ──
     *
     * Drei Fälle, und der Server entscheidet sie allein (Skill `bezahlung`, Regel 3):
     *   — kein eigenes Bild → das Werk des Künstlers → volle Lizenz (10 €)
     *   — eigenes Bild, IM STIL ERZEUGT → sein Stil ist drin → volle Lizenz (10 €)
     *   — eigenes Bild, nur hochgeladen → nichts von ihm drauf → Vermittlung (1 €)
     *
     * Der Beweis ist der Zettel neben dem abgelegten Bild; `stil: true` schreibt nur die
     * Erzeugungs-Route. Eine erfundene oder fremde Kennung fällt hier durch und wird verworfen
     * — dann gilt der teurere Fall, nie der billigere.
     */
    const bildId = str(a.bild, 32);
    const zettel = bildId ? await kundenbildZettel(bildId) : null;
    const eigenes = zettel && zettel.mandant === mandant;
    /* Hat er seine Adresse schon einmal getippt (im Fenster am Blatt), fragt Stripe sie nicht
       noch einmal ab (Owner 19.09.2026: „ich muss in Stripe immer zwei Mal die E-Mail angeben"). */
    if (!kaeuferMail && String(zettel?.mail ?? "").includes("@")) kaeuferMail = String(zettel!.mail).trim();
    /**
     * ── DIE VOLLE LIZENZ GILT FÜR SEIN WERK, NICHT FÜR DAS BLATT DES KUNDEN (Owner 19.09.2026:
     * „es müsste jetzt insgesamt 18 kosten der Druck, wenn er generiert hat sein Bild") ───────
     *
     * HIER STAND `!zettel.stil ? Vermittlung : volle Lizenz` — ein erzeugtes Blatt trug also die
     * 10 € Lizenz UND kostete vorher 10 € fürs Erzeugen. Zusammen 28 € für ein A3 ohne Rahmen,
     * das ohne Erzeugung 18 € kostet. „Etwas zu viel", und zwar doppelt kassiert für dasselbe
     * Blatt.
     *
     * Die volle Lizenz bleibt, wofür sie gedacht war: wenn SEIN Werk gedruckt wird. Setzt ein
     * Kunde sein eigenes Bild auf das Blatt, ist nichts von ihm darauf — dann bekommt er nichts
     * (Owner 19.09.2026: „nein. wir verdienen beim Druck des Prints."). Bis dahin war dafür eine
     * Vermittlung von 1 € vorgesehen; sie fällt weg, und der Druck wird für den Käufer um
     * denselben Euro billiger.
     *
     * ERZEUGT WIRD OHNEHIN NUR BEI DEN KÜNSTLERN DES HAUSES (Owner 19.09.2026: „nur auf die von
     * mir extra dafür erstellten. Und hierfür gibt es keine Lizenz. Ich bekomme alles."). Bei
     * einem echten Künstler kann gar kein erzeugtes Bild entstehen — der Schalter `kunstAn` steht
     * dort nicht.
     */
    /* ── UND NICHT BEI SEINEN EIGENEN GENERATOREN (Owner 19.09.2026) ──────────────────────
       `kunstAn` tragen nur Künstler, die der Owner selbst angelegt hat. Dort gibt es niemanden
       zu bezahlen; eine Lizenz wäre eine Buchung von ihm an sich selbst, die der Käufer bezahlt.
       Hier steht die verbindliche Rechnung — der Satz auf der Seite folgt ihr nur. */
    /* Kein Lizenzaufschlag auf ein eigenes Stück wie die Sonnenbrille oder Textil (Owner
       21.09.2026) — die verbindliche Prüfung, dieselbe Ausnahme wie am Kaufknopf. */
    const anteil = !istEigenesStueck(material) && !m.reproduktion && !eigenes && m.kunstAn !== true;
    const schluessel = String(kachel.i) === "-1" ? "standard" : String(kachel.i);
    /* Sein eigener Posterpreis (Owner 25.09.2026) — aus dem Datensatz, nie aus dem Browser. */
    const cents = druckPreisCents(material, groesse, anteil, posterPreisA3Cents(m.werkInfo?.[schluessel]?.posterPreis));
    if (cents === null) return NextResponse.json({ ok: false, grund: "kein-preis" }, { status: 400 });

    /* Und nur die Werke, die er angehakt hat (Owner 16.09.2026: „auch bei jedem bild"). Hat er
       noch keines gewählt, gelten alle — dieselbe Regel wie auf seiner Seite. */
    if (!m.reproduktion) {
      const auswahl = kacheln.some(x => m.werkInfo?.[String(x.i) === "-1" ? "standard" : String(x.i)]?.poster);
      if (auswahl && !m.werkInfo?.[schluessel]?.poster) {
        return NextResponse.json({ ok: false, grund: "kein-druck" }, { status: 404 });
      }
    }
    const titel = m.werkInfo?.[schluessel]?.titel || m.name || mandant;
    posten.push({
      mandant, werk: String(kachel.i), material, groesse, cents,
      /* Für die Anrechnung unten: nur ein ERZEUGTES Bild ist schon bezahlt worden. */
      ...(zettel?.stil ? { erzeugt: bildId } : {}),
      ...(eigenes ? { bild: bildId } : {}),
      /* „L cm" wäre Unsinn — Zentimeter nur beim Druck. */
      name: `${titel} · ${material} · ${groesse}${istEigenesStueck(material) || istDatei(material) ? "" : " cm"}`,
    });
  }

  /**
   * ── DAS ERZEUGEN WIRD AUF DEN DRUCK ANGERECHNET (Owner 19.09.2026: „hier kostet eigentlich der
   * Print 18 + 10 seine Generierung, also 28 Euro. Etwas zu viel" · „also 10 abziehen, oder?") ──
   *
   * EINMAL JE ERZEUGTEM BILD, nicht je Stück: Wer dasselbe Blatt dreimal druckt, hat einmal
   * erzeugt — dreimal abzuziehen wäre ein Rabatt fürs Mengenbestellen, den niemand beschlossen
   * hat. Der Abzug landet auf dem ersten Posten mit dieser Kennung.
   *
   * AUF DEM SERVER, nicht im Browser: Der Knopf zeigt denselben Preis, aber verbindlich ist der
   * Zettel neben dem abgelegten Bild (`stil: true` schreibt nur die bezahlte Erzeugungs-Route).
   *
   * Den Boden — nie unter die Druckkosten — setzt `druckAbzugCents`.
   */
  const schonAngerechnet = new Set<string>();
  for (const p of posten) {
    const id = (p as { erzeugt?: string }).erzeugt;
    if (!id || schonAngerechnet.has(id)) continue;
    const ab = druckAbzugCents(p.material, p.groesse, p.cents);
    if (ab > 0) { p.cents -= ab; schonAngerechnet.add(id); }
  }
  /* Der Merker gehört nicht in die Bestellung — er hat seine Arbeit getan. */
  for (const p of posten) delete (p as { erzeugt?: string }).erzeugt;

  /**
   * ── ZURÜCK AUF DIESELBE SEITE, AUF DER ER STAND (Owner 17./18.09.2026: „habe dir gesagt, mit
   * back vom warenkorb springt er nicht, wo es war") ─────────────────────────────────────────
   *
   * Hier stand die Live-Adresse fest im Code. Wer auf dem Entwicklungsrechner (oder auf einer
   * Vorschau-Adresse) abbrach, landete deshalb auf lakatosbandi.com — einer anderen Maschine
   * mit anderem Stand. Es sah aus, als springe die Seite irgendwohin; sie sprang auf einen
   * anderen Server.
   *
   * Jetzt zählt der Ursprung DIESES Aufrufs. Nur unsere eigenen Hosts sind zugelassen (localhost
   * zum Testen, alles unter lakatosbandi.com / luxurybandit.com / vercel.app): Sonst könnte
   * jemand über einen gefälschten `Host`-Kopf eine Kasse bauen, die auf seine Seite zurückführt.
   */
  const kopfHost = request.headers.get("host") ?? "";
  const eigenerHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(kopfHost)
    || /(^|\.)(lakatosbandi\.com|luxurybandit\.com|vercel\.app)(:\d+)?$/.test(kopfHost);
  const schema = request.headers.get("x-forwarded-proto") ?? (kopfHost.startsWith("localhost") ? "http" : "https");
  const basis = eigenerHost && kopfHost ? `${schema}://${kopfHost}` : "https://lakatosbandi.com";
  /**
   * ── ABBRECHEN FÜHRT DORTHIN ZURÜCK, WO ER WAR (Owner 17.09.2026: „dann von stripe back vom
   * poster shop und springt zur originale") ─────────────────────────────────────────────────
   *
   * Vorher stand hier die nackte Künstleradresse ohne `?ansicht=poster`. Wer im Postershop auf
   * „Kaufen" tippte und es sich anders überlegte, landete in der Originalansicht — als hätte er
   * den Laden gewechselt.
   *
   * Der Browser schickt die Seite mit, von der er kommt. Genommen wird sie NUR als Pfad auf
   * unserer eigenen Adresse: ein einzelner Schrägstrich am Anfang, kein `//` und kein `http`.
   * Sonst wäre das eine offene Weiterleitung — ein Kaufknopf, der auf eine fremde Seite führt.
   */
  const her = str(b.zurueck, 300);
  const eigen = /^\/[A-Za-z0-9\-_/?=&%.,+#]*$/.test(her) && !her.startsWith("//") ? her : "";
  const zurueck = eigen ? `${basis}${eigen}` : (posten.length === 1 ? `${basis}/${posten[0].mandant}` : basis);

  /* Vor der Kasse ablegen: Scheitert es, wird trotzdem verkauft — dann steht im Klartextfeld
     immer noch, was bestellt wurde (nur ohne die Bilder). */
  const korbId = await korbAblegen(posten).catch(() => null);

  try {
    const sitzung = await createPackCheckout({
      posten: posten.map(p => ({ amount: p.cents, name: p.name })),
      /* ZURÜCK AUF EINE ECHTE BESTÄTIGUNGSSEITE (Owner 16.09.2026: „aber eine Bestätigungsseite
         gibt es immer noch nicht") — vorher landete er mit `?bestellt=1` wieder auf der
         Werkseite, und diesen Anhänger las niemand. Die Sitzungskennung reist mit, damit die
         Seite bei Stripe nachfragen kann, statt einen Kauf zu behaupten. */
      /**
       * ── DER PFAD IST NICHT ÜBERALL DERSELBE (Owner 19.09.2026: „Profil nicht gefunden") ────
       *
       * `/comanda` gibt es nur auf lakatosbandi.com, und zwar durch einen Rewrite
       * (next.config.mjs). Überall sonst — localhost, Vorschau, versusforge.com — liegt die
       * Seite unter `/portal/comanda`.
       *
       * HART GESCHRIEBEN FÜHRTE DAS NACH DER ZAHLUNG INS LEERE: `localhost:3000/comanda` fällt
       * in die Künstlerseite `/[creator]`, und dort heisst „comanda" ein Künstler, den es nicht
       * gibt — „Profil nicht gefunden", nach einem echten Kauf.
       *
       * `portalPfade(host)` kennt beide Welten; dieselbe Stelle, die auch Login und Preise
       * richtig setzt.
       */
      successUrl: `${basis}${portalPfade(kopfHost).start === "/" ? "" : "/portal"}/comanda?s={CHECKOUT_SESSION_ID}&lang=${encodeURIComponent(sprache)}`,
      cancelUrl: zurueck,
      ...(kaeuferMail ? { email: kaeuferMail } : {}),
      sprache,
      metadata: {
        art: "druck",
        /* Der ganze Korb liegt bei uns; hier reist nur seine Kennung (18.09.2026) — an jedem
           Posten hängt jetzt auch das Bild des Kunden, und das passt in kein 500-Zeichen-Feld. */
        ...(korbId ? { korbId } : {}),
        /* Was bestellt wurde, zusätzlich als Klartext — das sieht man in Stripe. */
        korb: posten.map(p => `${p.mandant}/${p.werk}/${p.material}/${p.groesse}`).join(";").slice(0, 480),
        /* Damit die Bestätigung in der Sprache ankommt, in der bestellt wurde. */
        sprache,
      },
      /* ── EINE DATEI WIRD NICHT GELIEFERT (Owner 16.09.2026: „als datei zu herunterladen") ──
         Fünf Euro Versand auf einen Download wären eine Gebühr für nichts, und die Adresse
         abzufragen eine Frage ohne Zweck. Nur wenn wirklich etwas ins Paket kommt, steht beides
         in der Kasse — bei gemischten Bestellungen also weiterhin. */
      /**
       * ── KEIN VERSAND BEIM ADMIN-TESTKAUF (Owner 16.09.2026: „es ist nicht 0") ────────────
       *
       * Ein Gutschein über 100 % zieht bei Stripe nur die WARE ab, nie die Lieferung — der
       * Testkauf endete deshalb bei 5 €. Mit dem Admin-Schlüssel entfällt die Versandzeile, und
       * zusammen mit dem Gutschein steht am Ende wirklich null.
       *
       * GEPRÜFT WIRD AUF DEM SERVER, nicht im Browser: Der Schlüssel ist derselbe, mit dem der
       * Owner Seiten freigibt; ohne ihn ändert sich nichts.
       */
      /* Und je Stück (Owner 17.09.2026): 5 € für das erste, 2 € für jedes weitere — sonst zahlt
         das Haus bei einem Korb mit drei Postern zwei Sendungen aus eigener Tasche. */
      ...(posten.every(p => istDatei(p.material)) || istAdmin ? {} : {
        versandLaender: [...DRUCK_LAENDER],
        versandCents: druckVersandCents(posten.map(p => p.material)),
      }),
    });
    return NextResponse.json({ ok: true, url: sitzung.url });
  } catch {
    return NextResponse.json({ ok: false, grund: "kasse-fehler" }, { status: 502 });
  }
}
