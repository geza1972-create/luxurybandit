import { NextResponse } from "next/server";
import { kunstErzeugen, KARIKATUR_STILE, mitUnterlage, nurGesicht, aufBlattformat } from "@/lib/lakatosbandi-kunst";
import { motivPfad } from "@/lib/versusforge-moderation";
import { hausherrDarf } from "@/lib/lakatosbandi-hausherr";
import { mandantOeffentlich, werkVorlageSperren } from "@/lib/versusforge-mandanten";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { kundenbildAblegen, kundenbildLesen, istKundenbildId } from "@/lib/lakatosbandi-kundenbild";
import { kunstGuthaben, kunstVerbrauchen, geraetSauber } from "@/lib/lakatosbandi-kunst-riegel";
import { kunstMelden } from "@/lib/lakatosbandi-kunst-melden";
import { kunstBlattMailen } from "@/lib/lakatosbandi-kunst-post";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * „GENERATE ART" — SEIN FOTO IM STIL DES WERKS (Owner 17.09.2026).
 *
 * ── NOCH OHNE KASSE (Owner 17.09.2026: „mach mal erst mal gratis") ──────────────────────────
 *
 * Der Aufpreis von 1 € und die drei Versuche sind beschlossen, aber zuerst soll es laufen und
 * gut aussehen. ACHTUNG BEIM AUSROLLEN: Solange hier nichts abgebucht wird, kostet jeder Klick
 * uns echtes Geld (~1,7 Cent) — auf einer öffentlichen Seite ohne Login ist das offen nach oben
 * (Owner selbst: „hier werden einen haufen leute generieren wenn es kostenlos ist"). Vor dem
 * Deploy kommt die Kasse davor: Guthaben prüfen → abbuchen → erst dann dieser Aufruf.
 *
 * ── WARUM DER SERVER DAS WERK SELBST HOLT ───────────────────────────────────────────────────
 *
 * fal braucht beide Bilder. Das Foto des Kunden liegt nur in seinem Browser (Daten-URI, so
 * gewollt: „wenn er rausgeht von der seite, dann ist das bild weg"). Das WERK dagegen liegt bei
 * uns — und eine Adresse wie `http://localhost:3001/...` kann fal nicht abrufen. Also lädt der
 * Server es hier und reicht es als Daten-URI weiter. Damit läuft es lokal wie in der Wolke.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    { foto?: string; bild?: string; mandant?: string; werk?: string; geraet?: string;
      titel?: string; satz?: string; mail?: string;
      /** Der Dashboard-Schlüssel des Hausherrn — dann läuft es ohne Kasse (19.09.2026). */
      s?: string } | null;

  /**
   * ── DER HAUPTSCHALTER (Owner 18.09.2026, vor dem Deploy) ────────────────────────────────────
   *
   * „You as a picture" hat noch KEINE Kasse. Ein Lauf kostet uns rund 16,5 Cent, der Knopf steht
   * auf einer offenen Seite ohne Anmeldung, und der Owner hat selbst gesagt, was dann passiert:
   * „hier werden einen haufen leute generieren wenn es kostenlos ist."
   *
   * Der Schalter ist AUS, solange `KUNST_AN` nicht auf `1` steht. Lokal steht er in der
   * `.env.local`, auf Vercel kommt er an dem Tag dazu, an dem der Euro davorsteht. Ohne
   * Schalter wäre der Deploy von heute ein offenes Portemonnaie.
   */
  if (process.env.KUNST_AN?.trim() !== "1") {
    return NextResponse.json({ fehler: "aus" }, { status: 503 });
  }

  const mandant = String(body?.mandant ?? "");
  const werk = String(body?.werk ?? "");
  const geraet = geraetSauber(body?.geraet);

  /**
   * ── DAS FOTO KOMMT AUS DEM BROWSER ODER VOM SERVER (Owner 19.09.2026) ───────────────────────
   *
   * `foto` ist der alte Weg: Der Browser schickt die Bilddaten mit. Das funktioniert, solange
   * nichts dazwischen liegt.
   *
   * `bild` ist der neue: eine Kennung aus `api/kunst-foto`. Sie wird VOR der Kasse vergeben, und
   * dann darf der Browser die Seite verlieren — Stripes Weiterleitung, ein Neuladen, ein
   * geschlossenes Fenster. Der Auftrag liegt auf dem Server ([[paid-jobs-must-survive-the-browser]]).
   *
   * Genau das hat am 19.09. echtes Geld gekostet: bezahlt, weitergeleitet, Foto weg, nichts
   * passiert.
   */
  const bildId = String(body?.bild ?? "").trim();
  const abgelegt = bildId && istKundenbildId(bildId) ? await kundenbildLesen(bildId) : null;
  if (bildId && (!abgelegt || abgelegt.zettel.mandant !== mandant)) {
    return NextResponse.json({ fehler: "unvollstaendig" }, { status: 400 });
  }
  const foto = abgelegt
    ? `data:image/jpeg;base64,${Buffer.from(abgelegt.bild).toString("base64")}`
    : String(body?.foto ?? "");
  if (!foto.startsWith("data:image/") || !mandant) {
    return NextResponse.json({ fehler: "unvollstaendig" }, { status: 400 });
  }

  /* Die Künstlerangaben werden gleich mehrfach gebraucht (Erlaubnis, Technik, Stilnotizen) —
     also einmal gelesen, VOR der Kasse. */
  const m = await mandantOeffentlich(mandant);

  /**
   * ── NUR WESSEN WERK VORLAGE SEIN DARF (Owner 19.09.2026: „wir müssen das nur bei bestimmten
   * Künstlern anbieten, also bei Caricaturist") ───────────────────────────────────────────────
   *
   * STEHT VOR DER KASSE, nicht dahinter. Andersherum schickte die Kachel den Kunden erst zu
   * Stripe und sagte ihm danach, dass es diesen Künstler gar nicht betrifft — er hätte für eine
   * Absage bezahlt.
   *
   * UND DIE PRÜFUNG GEHÖRT HIERHER, nicht nur auf die Seite: Dass der Knopf fehlt, heisst nur,
   * dass ihn niemand SIEHT. Wer die Route direkt anspricht, macht aus dem Werk eines Malers
   * trotzdem eine Vorlage — und der hat dem nie zugestimmt.
   */
  if (m?.kunstAn !== true) {
    return NextResponse.json({ fehler: "aus" }, { status: 503 });
  }

  /**
   * ── OHNE GUTHABEN LÄUFT NICHTS (Owner 18.09.2026: „und leider müssen sie 1 Euro bezahlen") ─
   *
   * Geprüft wird VOR dem Modellaufruf — ein bezahlter Aufruf für jemanden, der nicht bezahlt
   * hat, ist genau das, was die Hausregel [[kein-token-fuer-abbrecher]] verbietet.
   *
   * `402` ist keine Fehlermeldung, sondern eine Aufforderung: Die Kachel öffnet daraufhin die
   * Kasse in der Seite, und nach der Zahlung läuft die Erzeugung von selbst weiter
   * ([[aufladen-setzt-den-kauf-fort]]).
   *
   * OHNE GERÄTEKENNUNG GIBT ES KEIN GUTHABEN und also auch keinen Lauf. Ein leeres Feld wäre
   * sonst der bequemste Weg, die Kasse zu umgehen.
   */
  /**
   * ── DER HAUSHERR ZAHLT NICHT (Owner 19.09.2026: „ich will ein Konto haben als Admin, wo ich
   * nichts zahlen muss dafür") ────────────────────────────────────────────────────────────────
   *
   * Er benutzt das Werkzeug selbst — für eigene Blätter, zum Ausprobieren, für Werbung. Dass er
   * dafür seine eigene Kasse durchläuft, ist keine Sicherheit, sondern eine Schleife: Das Geld
   * geht von ihm an ihn, abzüglich Stripe-Gebühr.
   *
   * DERSELBE SCHLÜSSEL WIE ÜBERALL: `?s=` ist der Dashboard-Schlüssel aus der Umgebung
   * (`VERSUSFORGE_DASHBOARD_KEY`), geprüft mit `mandantPruefen` — ein Zeitvergleich, kein
   * `===`, und ohne eingerichteten Schlüssel lässt er niemanden durch. Kein zweiter Mechanismus,
   * keine zweite Stelle, die man vergessen kann.
   *
   * GEPRÜFT WIRD AUF DEM SERVER. Ein Merker im Browser wäre die Einladung, sich kostenlose
   * Erzeugungen selbst zuzuschreiben.
   *
   * DIE OPENAI-RECHNUNG BLEIBT. Frei ist nur die KASSE, nicht der Lauf — jedes Blatt kostet ihn
   * weiterhin rund 16 Cent beim Anbieter.
   */
  const adminS = String(body?.s ?? "").trim().slice(0, 200);
  /* Hausschlüssel ODER der Schlüssel genau dieses Künstlers (Owner 19.09.2026: „ich darf ohne
     Stripe runterladen als 286645f5…") — die Regel steht in `lib/lakatosbandi-hausherr.ts`. */
  const istAdmin = await hausherrDarf(mandant, adminS);

  if (!istAdmin && await kunstGuthaben(geraet) < 1) {
    return NextResponse.json({ fehler: "bezahlen" }, { status: 402 });
  }

  /* ── DAS WERK IST DIE STILVORLAGE, BILD 1 IM PROMPT ──────────────────────────────────────
     Der Prompt des Owners arbeitet mit zwei Bildern: das Werk bestimmt Palette, Pinsel und
     Abstraktionsgrad, das Foto die Person. Das Werk liegt in unserem Lager — und eine Adresse
     wie `http://localhost:3001/...` könnte OpenAI nicht abrufen, also geht es als Datei mit. */
  const pfad = motivPfad(mandant, werk || "standard");
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
  if (!r.ok) return NextResponse.json({ fehler: "werk-fehlt" }, { status: 404 });
  const vorlage = `data:image/jpeg;base64,${Buffer.from(new Uint8Array(await r.arrayBuffer())).toString("base64")}`;

  /* Die Technik aus seinen Werkangaben („acril", „pix", „digital" …) als Hinweis für den
     Sehen-Schritt — der Künstler weiss besser als ein Modell, womit er gearbeitet hat. */
  const technik = String(m?.werkInfo?.[werk || "standard"]?.technik ?? "").trim();
  /* Seine Notizen zur Methode — am Werk, sonst am Künstler; noch kein Feld im Dashboard, also
     heute meist leer. Der Weg ist gebaut, das Feld kommt, wenn der Owner es will. */
  const wi = m?.werkInfo?.[werk || "standard"] as Record<string, unknown> | undefined;
  /* ── BEIDES, NICHT ENTWEDER-ODER (17.09.2026) ────────────────────────────────────────────
     Die Handschrift gehört dem KÜNSTLER (flaches Gesicht, seine Palette, sein Auftrag), die
     Besonderheiten dem WERK (diese Pose, dieses Kleid, diese Tauben). Vorher schlug die
     Werk-Notiz die Künstler-Notiz aus dem Feld — wer einem Werk etwas zufügte, verlor damit die
     Handschrift. Jetzt stehen beide da: erst der Künstler, dann das Werk. */
  const notizenKuenstler = String((m as Record<string, unknown> | null)?.stilnotizen ?? "").trim();
  const notizenWerk = String(wi?.stilnotizen ?? "").trim();
  const notizen = [notizenKuenstler, notizenWerk].filter(Boolean).join(" ");
  /**
   * ── „TREU" STATT „SEHR" (Owner 18.09.2026, Vermeer neben ChatGPT: „es sieht überhaupt nicht
   * ähnlich aus bei uns") ──────────────────────────────────────────────────────────────────────
   *
   * Hier stand `"sehr"` — und `"sehr"` heisst im Klartext „style fidelity outranks likeness".
   * Wir haben also bestellt, dass das Gesicht weicht, wenn es dem Stil in die Quere kommt.
   * `"treu"` lässt den Stil voll wirken und dreht nur die Rangfolge um, wenn beides kollidiert.
   */
  /**
   * ── EIN REZEPT: DAS WERK IST IMMER DIE VORLAGE (Owner 19.09.2026: „du nimmst gar nicht meine
   * Vorlage aus dem Poster. Warum platzieren wir dann den Button in dem Poster?") ─────────────
   *
   * HIER STANDEN ZWEI REZEPTE, und das zweite war mein Fehlschluss. Aus „in diesem Fall ist es
   * Vintage-Karikaturen" hatte ich gelesen: Bei einem Karikaturisten sei sein Blatt nur ein
   * Schaufenster und der STIL das Produkt — also ging nur das Foto plus ein Stilsatz an das
   * Modell, und das Werk wurde gar nicht angefasst.
   *
   * DAS WIDERSPRICHT DER BEDIENUNG. Der Knopf liegt AUF dem Blatt, das der Besucher gerade
   * ansieht. Wer dort auf „erzeuge" drückt, erwartet SEIN Gesicht in DIESEM Bild — nicht irgendein
   * fremdes Motiv im selben Malstil. Genau das kam heraus: eine Riviera-Szene, die auf keinem
   * seiner Blätter steht.
   *
   * ALSO IMMER DAS HAUS-REZEPT: Bild A ist das Foto (Identität), Bild B das Werk (Palette, Pinsel,
   * Aufbau, Kleidung, Requisiten). Der `kunstStil` verschwindet nicht — er geht als zusätzliche
   * Notiz mit und beschreibt die Handschrift, die das Werk ohnehin zeigt. Das Werk führt, der
   * Stilsatz begleitet.
   */
  const stil = String(m?.kunstStil ?? "").trim();
  const stilSatz = stil && stil in KARIKATUR_STILE
    ? KARIKATUR_STILE[stil as keyof typeof KARIKATUR_STILE].satz
    : "";
  const ergebnis = await kunstErzeugen(
    vorlage, foto, "treu", undefined, technik,
    [notizen, stilSatz].filter(Boolean).join(" "),
  );
  if (!ergebnis.ok) {
    /* „abgelehnt" ist kein Fehler des Kunden, sondern eine Absage — und sie muss als solche
       ankommen, damit die Seite nicht „versuch es nochmal" sagt, wo nichts zu versuchen ist. */
    const status = ergebnis.grund === "abgelehnt" ? 422 : 502;
    /**
     * ── DAS WERK MERKT ES SICH SELBST (Owner 18.09.2026, an Munchs „Madonna") ───────────────
     *
     * Abgewiesen wird nicht sein Foto, sondern DAS WERK als Vorlage: Der Filter sieht einen Akt,
     * nicht ein Museumsbild. Das ändert sich beim nächsten Kunden nicht — also darf der nächste
     * Kunde diesen Knopf gar nicht mehr sehen. `werkVorlageSperren` legt denselben Schalter um,
     * den der Künstler im Dashboard hat (`kunst: false`), und hält das Datum fest.
     *
     * Kein `await` vor der Antwort wäre auf Vercel ein Abbruch mitten im Schreiben — die Antwort
     * beendet die Ausführung. Ein Fehlschlag darf die Absage aber nicht verschlucken, deshalb
     * `catch` und weiter.
     */
    const gesperrt = ergebnis.grund === "abgelehnt"
      ? await werkVorlageSperren(mandant, werk || "standard").catch(() => false)
      : false;
    /* Ob wirklich gesperrt wurde, weiss nur der Server (erst das zweite Nein sperrt) — und die
       Kachel sagt je nachdem „versuch ein anderes Foto" oder gar nichts mehr. */
    return NextResponse.json({ fehler: ergebnis.grund, gesperrt }, { status });
  }
  /**
   * ── NUR DAS GESICHT EINSETZEN, DEN REST AUS DEM WERK ZURÜCKHOLEN (Owner 18.09.2026) ────────
   *
   * Steht `KUNST_NUR_GESICHT=1`, wird aus dem erzeugten Blatt nur die Kopfpartie übernommen und
   * in die ORIGINALDATEI des Werks gesetzt. Damit sind Kleidung, Pose, Hände, Objekte,
   * Hintergrund und Palette nicht mehr „gebeten", sondern unverändert — sie werden gar nicht
   * erst neu erzeugt. Fällt der Schritt aus, kommt das erzeugte Blatt wie bisher zurück.
   *
   * VOR der Unterlage: Die blasse Unterlage gehört auf das FERTIGE Blatt, sonst läge sie unter
   * einem Bild, das gleich wieder zerschnitten wird.
   */
  const gemalt = process.env.KUNST_NUR_GESICHT?.trim() === "1"
    ? await nurGesicht(vorlage, ergebnis.bild)
    : ergebnis.bild;
  /* Das Foto als blasse Unterlage unter die Zeichnung (Owner 17.09.2026) — Ähnlichkeit aus dem
     Foto, Kunst aus den Strichen. Scheitert das Zusammensetzen, geht das erzeugte Bild allein
     zurück, statt dass der bezahlte Lauf verloren ist. */
  /**
   * ── ERST JETZT WIRD ABGEBUCHT (18.09.2026) ──────────────────────────────────────────────────
   *
   * Das Bild ist da. Wäre oben abgebucht worden, hätte ein Fehler beim Modell den bezahlten Lauf
   * gefressen — und der Käufer stünde ohne Bild und ohne Guthaben da
   * ([[paid-jobs-must-survive-the-browser]]).
   *
   * Und der Owner erfährt davon: Solange das hier Geld kostet, will er jede Erzeugung auf dem
   * Telefon sehen, nicht abends in einer Abrechnung.
   */
  /* Dem Hausherrn wird nichts abgebucht — er hat nichts eingezahlt. */
  if (!istAdmin) await kunstVerbrauchen(geraet).catch(() => 0);
  kunstMelden({ mandant, werk: werk || "standard" });

  /**
   * ── DIE BLASSE UNTERLAGE IST AUS (Owner 19.09.2026: „das Bild wird zu dunkel nach der
   * Generierung, zu viele Bleistift-Striche auch") ────────────────────────────────────────────
   *
   * SIE WAR FÜR EIN ANDERES REZEPT GEBAUT. Am 17.09. erzeugte das Modell dünne Skizzen, und sein
   * Foto mit 10 % Deckkraft darunter brachte die Ähnlichkeit zurück („das machst du als Level mit
   * 90 Prozent Transparenz wie in Photoshop, dann skribbelst du drauf").
   *
   * SEIT DAS WERK DIE VORLAGE IST, kommt ein fertig gemaltes Bild zurück — und die Unterlage tut
   * nur noch Schaden, zweifach, beides genau das, was er sieht:
   *  · ZU DUNKEL: Zusammengesetzt wird mit `multiply`. Multiply kann nur dunkler machen; jede
   *    nicht ganz weisse Stelle der Unterlage drückt das ganze Blatt nach unten.
   *  · „BLEISTIFT-STRICHE": Was vom Foto durchkommt, sind seine Kanten — Haarsträhnen, Konturen,
   *    Hintergrundlinien. Auf einem gemalten Blatt liest sich das als Gekritzel, das kein Maler
   *    gezogen hat.
   *
   * DAS BAUTEIL BLEIBT (`mitUnterlage`), nur der Schalter steht auf aus: `KUNST_UNTERLAGE=1`
   * holt sie zurück, falls ein späteres Rezept wieder dünn zeichnet.
   */
  const zusammen = process.env.KUNST_UNTERLAGE?.trim() === "1"
    ? await mitUnterlage(foto, gemalt).catch(e => {
        console.warn("[kunst] Unterlage fehlgeschlagen:", e);
        return ergebnis.bild;
      })
    : gemalt;
  /* ── UND ZULETZT AUF DAS BLATTFORMAT (Owner 19.09.2026) ─────────────────────────────────────
     Hier, an der EINEN Stelle: Was von hier weggeht, ist das Bild — für den Schirm, für die
     Druckdatei, für den Download. OpenAI kann das Verhältnis des Bildfelds nicht liefern
     (siehe `aufBlattformat`), also wird unten geschnitten und der Kopf bleibt. */
  const bild = await aufBlattformat(zusammen);
  /* ── DIE ERZEUGUNG IST DER BEWEIS (Owner 18.09.2026: „1 Euro bekommt der Künstler") ───────
     Das fertige Bild wird hier abgelegt, mit `stil: true` auf dem Zettel — an DIESER Stelle, und
     nur hier, ist belegt, dass ein Lauf im Stil des Künstlers stattgefunden hat. Die Kennung
     reist später durch die Kasse und entscheidet über 10 € Lizenz statt 1 € Vermittlung und
     darüber, ob sein Name auf das Blatt kommt.
     Scheitert die Ablage, geht das Bild trotzdem zurück: Der bezahlte Lauf darf nicht an einem
     Speicher verloren gehen — dann fehlt nur die Kennung, und der Kauf rechnet wie ein
     hochgeladenes Foto (zugunsten des Käufers, nie zu seinen Lasten). */
  /**
   * Was auf dem Blatt stand, als er drückte — leer heisst: die Worte des Künstlers gelten.
   *
   * Nach einer Zahlung kommt der Aufruf vom Server-Weg (`bild`), und der Browser hat die Zeilen
   * womöglich nicht mehr. Dann gelten die, die vor der Kasse abgelegt wurden.
   */
  const titelRoh = (String(body?.titel ?? "").replace(/\s+/g, " ").trim()
    || String(abgelegt?.zettel.titel ?? "").trim()).slice(0, 120);
  const satzRoh = (String(body?.satz ?? "").replace(/\s*\n\s*/g, " ").trim()
    || String(abgelegt?.zettel.satz ?? "").trim()).slice(0, 400);
  /* Wie Titel und Satz: Nach Stripes Weiterleitung schickt der Browser nichts mehr mit, und die
     Adresse steht dann nur noch auf dem abgelegten Zettel. */
  const mailRoh = (String(body?.mail ?? "").trim()
    || String(abgelegt?.zettel.mail ?? "").trim()).slice(0, 200);
  const id = await kundenbildAblegen(bild, {
    mandant, werk: werk || "standard", stil: true,
    ...(titelRoh ? { titel: titelRoh } : {}),
    ...(satzRoh ? { satz: satzRoh } : {}),
    /* Damit der Owner die Mail später noch einmal schicken kann (Owner 19.09.2026). */
    ...(mailRoh.includes("@") ? { mail: mailRoh } : {}),
  })
    .catch(e => { console.warn("[kunst] Kennung nicht vergeben:", e); return null; });

  /**
   * ── KEINE LIZENZ AUF ERZEUGTE BILDER (Owner 19.09.2026: „auf Künstlerbilder allgemein werden
   * keine Generierungen geben, nur auf die von mir extra dafür erstellten. Und hierfür gibt es
   * keine Lizenz. Ich bekomme alles.") ────────────────────────────────────────────────────────
   *
   * HIER STAND EINE GUTSCHRIFT von 3 € je Lauf. Sie ging von der Annahme aus, dass fremde
   * Künstler ihre Werke als Vorlage hergeben — die Annahme fällt: Erzeugt wird ausschliesslich
   * bei Künstlern, die der Owner selbst angelegt hat (`kunstAn`, oben geprüft, serverseitig).
   * Dort gibt es niemanden zu bezahlen; eine Gutschrift wäre eine Buchung von ihm an ihn selbst.
   *
   * DIE LIZENZ AM DRUCK BLEIBT, wo sie hingehört: Wird das Werk eines echten Künstlers gedruckt,
   * bekommt er seine 10 €; setzt ein Kunde sein eigenes Foto auf dessen Blatt, die Vermittlung.
   * Beides läuft über `api/druck-kasse` und `lakatosbandi-bestellung.ts`, unverändert.
   */

  /**
   * ── UND EINE MAIL MIT DEM BILD (Owner 19.09.2026: „keine Email") ───────────────────────────
   *
   * Er hat bezahlt; das Ergebnis darf nicht nur im Browser stehen. Wer das Fenster schliesst,
   * die Seite neu lädt oder das Telefon weglegt, hätte sonst zehn Euro für nichts gezahlt.
   *
   * DIE ADRESSE IST FREIWILLIG (sie steht im Fenster vor dem Knopf). Fehlt sie, wird nichts
   * verschickt und nichts bemängelt — das Bild steht dann im Blatt, und die Datei kann er
   * jederzeit laden.
   *
   * OHNE `await` VOR DER ANTWORT wäre der Versand auf Vercel ein Abbruch. Er darf aber das
   * bezahlte Bild nicht aufhalten, wenn der Mailserver klemmt — deshalb `catch`.
   */
  /* Verschickt wird mit `lib/lakatosbandi-kunst-post.ts` — dieselbe Mail, die der Owner später
     aus der Freigabe-Übersicht noch einmal schicken kann. Ein Fehlschlag darf das bezahlte Bild
     nicht aufhalten. */
  if (mailRoh.includes("@") && id) {
    await kunstBlattMailen(id).catch(e => { console.warn("[kunst] Mail nicht verschickt:", e); return null; });
  }

  /* Welcher Motor gelaufen ist, steht in der Antwort — sonst vergleicht man Ergebnisse, ohne
     zu wissen, woher sie kamen (drei Motoren, ein Schalter). */
  return NextResponse.json({ bild, modell: ergebnis.modell, id });
}
