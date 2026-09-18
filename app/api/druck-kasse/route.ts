import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { werkKacheln } from "@/lib/lakatosbandi";
import { druckPreisCents, istTextil, istDatei, druckVersandCents, DRUCK_LAENDER } from "@/lib/lakatosbandi-druck";
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

type Posten = { mandant: string; werk: string; material: string; groesse: string; name: string; cents: number };

export async function POST(request: Request) {
  if (keinMensch(request)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!stripeConfigured()) return NextResponse.json({ ok: false, grund: "keine-kasse" }, { status: 503 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  /* Ein einzelner Posten kommt weiterhin ohne Korb — der Agent kauft so. */
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
    /* Sein Honorar liegt oben drauf, und ob es gilt, entscheidet DIESE Zeile — nicht der
       Browser (Owner 16.09.2026: „dann muss die marge drauf"). */
    const cents = druckPreisCents(material, groesse, !m.reproduktion);
    if (cents === null) return NextResponse.json({ ok: false, grund: "kein-preis" }, { status: 400 });

    const schluessel = String(kachel.i) === "-1" ? "standard" : String(kachel.i);
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
      /* „L cm" wäre Unsinn — Zentimeter nur beim Druck. */
      name: `${titel} · ${material} · ${groesse}${istTextil(material) || istDatei(material) ? "" : " cm"}`,
    });
  }

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

  try {
    const sitzung = await createPackCheckout({
      posten: posten.map(p => ({ amount: p.cents, name: p.name })),
      /* ZURÜCK AUF EINE ECHTE BESTÄTIGUNGSSEITE (Owner 16.09.2026: „aber eine Bestätigungsseite
         gibt es immer noch nicht") — vorher landete er mit `?bestellt=1` wieder auf der
         Werkseite, und diesen Anhänger las niemand. Die Sitzungskennung reist mit, damit die
         Seite bei Stripe nachfragen kann, statt einen Kauf zu behaupten. */
      successUrl: `${basis}/comanda?s={CHECKOUT_SESSION_ID}&lang=${encodeURIComponent(sprache)}`,
      cancelUrl: zurueck,
      sprache,
      metadata: {
        art: "druck",
        /* Was bestellt wurde, kurz genug für Stripes Feldgrenze. */
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
