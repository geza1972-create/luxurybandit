import { NextResponse } from "next/server";
import { str, GROSS } from "@/lib/agent-modell";
import { agentDeckel, analyseDeckel, VF_ANALYSE_MIT_LEAD } from "@/lib/versusforge-deckel";
import { bildPruefen, kunstPruefen } from "@/lib/versusforge-moderation";
import { bildAnsehen } from "@/lib/versusforge-bild-ansehen";
import { leadAnlegen, leadLesen } from "@/lib/kuenstler-lead";
import { notifyAdminWhatsApp } from "@/lib/notify-admin";
import { kuenstlerListe } from "@/lib/lakatosbandi";
import { loginLinkSchicken } from "@/lib/kuenstler-login-post";
import { spruchAusBefund } from "@/lib/kuenstler-sprueche";
import { zugSchreiben, laufFotoSpeichern } from "@/lib/versusforge-lauf";

/**
 * DIE VORSCHAU IM TRICHTER — EIN WERK, EIN SPRUCH (Owner 13.09.2026: „Dann wird der Button aktiv
 * Jetzt analysieren. Dann die Analyse zeigt ein Beispiel. Ein kunstwerk und der Spruch drunter,
 * die anderen nicht. Dann drunter. Willst du das auf unserer Seite veröffentlichen und
 * vermarkten? Ja.").
 *
 * ── WARUM ES DIESEN SCHRITT GIBT ────────────────────────────────────────────────────────────
 *
 * Bisher gab der Mensch seine Adresse, BEVOR er je etwas von uns gesehen hatte. Gemessen am
 * 13.09.2026: von 25 Gesprächen kamen 11 bis zu den Bildern und nur 4 ans Ende. Jetzt sieht er
 * zuerst, was wir aus einem seiner Werke machen — und entscheidet danach.
 *
 * ── NUR EIN EINZIGES BILD WIRD ANGESEHEN ────────────────────────────────────────────────────
 *
 * Der Owner will ein BEISPIEL zeigen, „die anderen nicht". Das ist zugleich die günstige
 * Variante: Ein vollständiger Künstler kostet sechs Modellaufrufe JE WERK. Wer hier abspringt,
 * hätte uns fünf Bilder lang Geld gekostet, ohne je zuzustimmen
 * ([[kein-token-fuer-abbrecher]]). Die übrigen Werke werden erst nach seinem „Ja" verarbeitet.
 *
 * ── DER DECKEL ERSETZT DEN SCHLÜSSEL ────────────────────────────────────────────────────────
 *
 * `api/portal-spruch` schützt sich mit dem Dashboard-Schlüssel des Künstlers — ausdrücklich
 * wegen der Kosten, nicht wegen der Daten. Hier gibt es noch keinen Künstler und keinen
 * Schlüssel: Wer die Adresse kennt, könnte beliebig Bilder schicken und auf unsere Rechnung
 * rechnen lassen. Deshalb derselbe Tagesdeckel je Gerät, den auch der Chat benutzt
 * (`agentDeckel`) — kein zweiter Riegel daneben, sondern derselbe.
 *
 * ── GEPRÜFT WIRD VOR DEM ANSEHEN ────────────────────────────────────────────────────────────
 *
 * Dieselbe Reihenfolge wie in der Agenten-Route: Was `bildPruefen` als verboten einstuft, wird
 * nicht angesehen — unter so etwas darf nie ein Verkaufsspruch stehen, auch nicht als Vorschau.
 *
 * ── UND ES WIRD NICHTS GESPEICHERT ──────────────────────────────────────────────────────────
 *
 * Kein Künstler, keine Ablage, kein Bild auf dem Server. Der Spruch geht zurück in den Chat und
 * verschwindet mit ihm, wenn er nicht weitermacht.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * ── ZEIT ZUM DENKEN (14.09.2026) ────────────────────────────────────────────────────────────
 *
 * Hier stand nichts — also galt der Vercel-Standard von rund 10–15 Sekunden. In dieser Route
 * laufen aber ZWEI Aufrufe auf gpt-5 (Bild ansehen, dann den Satz schreiben) plus die
 * Bildprüfung. Das ist in 15 Sekunden nicht zu schaffen.
 *
 * Was der Mensch davon sah: „Analizează…", dann ein Fehler. Er hatte nichts falsch gemacht —
 * wir haben ihn mitten in der Analyse abgeschnitten. Gemessen am 14.09.2026: 73 Leute wählten
 * ein Bild, nur 15 kamen bis zum fertigen Werk.
 *
 * Zehn andere teure Routen im Haus setzen längst 30 bis 300 Sekunden; ausgerechnet die teuerste
 * hatte nichts.
 */
export const maxDuration = 120;

/** Vier Megabyte — dieselbe Grenze wie beim Anlegen der Werke in `portal/bestaetigen`. */
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return NextResponse.json({ ok: false, grund: "kein-schluessel" }, { status: 503 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const angefangen = Date.now();
  const bild = String(b.bild ?? "");
  const sprache = str(b.sprache, 5) || "ro";
  /* Die Klammer um die Züge im Protokoll — dieselbe Kennung wie in der Agenten-Route. */
  const gespraech = str(b.gespraech, 60) || "ohne";
  const zugNr = Math.max(1, Math.round(Number(b.zug)) || 1);

  if (!bild.startsWith("data:image/")) {
    return NextResponse.json({ ok: false, grund: "kein-bild" }, { status: 400 });
  }
  /* Die base64-Länge ist rund 4/3 der Bytes — grob genug, um Riesen abzuweisen, bevor wir sie
     überhaupt dekodieren. */
  if (bild.length > MAX_BYTES * 1.4) {
    return NextResponse.json({ ok: false, grund: "zu-gross" }, { status: 413 });
  }

  const stand = await agentDeckel(str(b.device, 80));
  if (!stand.erlaubt) return NextResponse.json({ ok: false, grund: "deckel" }, { status: 429 });



  /**
   * ── „NEU GENERIEREN" BEZAHLT NICHT ZWEIMAL FÜRS HINSEHEN (Owner 13.09.2026: „dann soll er 3
   * mal eine neuen chance bekommen" · „Neu generieren?") ─────────────────────────────────────
   *
   * Die Analyse ist die teure Hälfte (1061 hinein / 670 hinaus auf gpt-5), der Satz die
   * günstige. Am Bild ändert sich zwischen zwei Versuchen nichts — nur der Satz soll anders
   * werden. Schickt der Browser den Befund vom ersten Mal zurück, wird das Bild NICHT erneut
   * angesehen.
   *
   * WARUM DAS UNBEDENKLICH IST: Der Befund ist eine Beschreibung, kein Recht. Wer ihn
   * verfälschte, bekäme einen unpassenden Satz unter SEIN eigenes Bild — mehr nicht. Gegen
   * Missbrauch auf unsere Kosten steht der Deckel oben, und der zählt jeden Aufruf.
   */
  const mit = (b.befund ?? null) as Record<string, unknown> | null;
  const befundZurueck = mit && (str(mit.szene, 400) || str(mit.motiv, 120))
    ? {
      medium: str(mit.medium, 60), stil: str(mit.stil, 60), motiv: str(mit.motiv, 120),
      merkmale: (Array.isArray(mit.merkmale) ? mit.merkmale : []).slice(0, 7).map(x => str(x, 60)),
      selten: str(mit.selten, 200), erinnertAn: str(mit.erinnertAn, 120),
      traum: str(mit.traum, 160), szene: str(mit.szene, 400),
    }
    : null;

  /**
   * ── ZWEI FREIE ANALYSEN, DANN IST SCHLUSS (Owner 14.09.2026: „sie haben 2 Versuche frei auf
   * dem Gerät jetzt") ────────────────────────────────────────────────────────────────────────
   *
   * NUR BEIM ERSTEN MAL ZÄHLEN: „Neu schreiben" schickt den Befund zurück und sieht das Bild
   * nicht erneut an — es wäre unfair, dafür einen der zwei Versuche zu nehmen, und teuer ist es
   * auch nicht.
   *
   * STEHT HIER UND NICHT WEITER OBEN, weil `befundZurueck` erst darüber entsteht. Genau das habe
   * ich am 14.09.2026 zweimal falsch gemacht.
   */
  /**
   * ── SEINE KENNUNG AUS DEM SOFORTFORMULAR (Owner 14.09.2026, Weg „B") ───────────────────────
   *
   * Sie kam per Mail (`?l=…`) und trägt Name und Adresse, die er bei Facebook gegeben hat. Hier
   * wird sie zum ersten Mal wirklich benutzt — bis heute reiste sie durch den ganzen Trichter
   * und wurde am Ende weggeworfen (`leadLesen` stand in keiner Datei).
   *
   * ZWEI WIRKUNGEN: Er wird nicht noch einmal nach Name und Adresse gefragt (die Karte im Chat
   * entfällt), und er hat mehr freie Analysen — für ihn ist bei Meta bezahlt worden.
   *
   * STEHT HIER UND NICHT WEITER OBEN: `befundZurueck` entsteht direkt darüber, und der Deckel
   * gleich darunter braucht das Ergebnis. Genau diese Reihenfolge ist am 14.09.2026 zweimal
   * verrutscht.
   */
  const leadKennung = str(b.lead, 64).replace(/[^a-f0-9]/gi, "");
  const leadDaten = leadKennung ? await leadLesen(leadKennung).catch(() => null) : null;

  if (!befundZurueck) {
    const analyseStand = await analyseDeckel(str(b.device, 80), leadDaten ? VF_ANALYSE_MIT_LEAD : undefined);
    if (!analyseStand.erlaubt) {
      return NextResponse.json({ ok: false, grund: "verbraucht" }, { status: 429 });
    }
  }

  /**
   * ── DIE ADRESSE WIRD ZUERST GESICHERT (Owner 14.09.2026: „er muss seine Email und Name
   * angeben" · „Es gibt kein Gratis mehr") ───────────────────────────────────────────────────
   *
   * VOR der Analyse, nicht danach: Die Analyse ist der teure, langsame Teil und kann scheitern.
   * Stünde das Ablegen dahinter, wäre bei jedem Fehlschlag genau das weg, wofür er bezahlt hat —
   * seine Adresse.
   *
   * NUR BEIM ERSTEN MAL: Kommt ein Befund zurück, lässt er denselben Satz neu schreiben. Dann ist
   * er längst erfasst, und ein zweiter Eintrag wäre derselbe Mensch ein zweites Mal.
   */
  /* WAS ER SELBST TIPPT, HAT VORRANG — er darf seinen Künstlernamen hier noch ändern. Erst wenn
     der Browser nichts schickt (weil die Karte bei vorhandener Kennung gar nicht erscheint),
     gilt, was im Sofortformular stand. */
  const name = str(b.name, 80) || String(leadDaten?.name ?? "").slice(0, 80);
  const mail = (str(b.mail, 120) || String(leadDaten?.mail ?? "")).trim().toLowerCase();

  /**
   * ── ER HAT SCHON EINE SEITE (Owner 14.09.2026: „er müsste doch im Tunnel eine Meldung
   * bekommen: diese Adresse existiert schon, du hast schon eine Webseite. Benutze deine Webseite,
   * um weitere Bilder hochzuladen") ───────────────────────────────────────────────────────────
   *
   * VOR DER ANALYSE, nicht danach: Ein bestehender Künstler braucht keine zweite Vorschau, und
   * sie würde uns einen gpt-5-Aufruf kosten. Seine Werke gehören in sein Dashboard, wo sie zu
   * seiner Seite kommen — nicht in eine zweite, fremde Seite.
   *
   * UND ER BEKOMMT GLEICH SEINEN LINK: Abweisen allein hülfe ihm nicht; wer seine Seite nicht
   * mehr findet, steht sonst da wie ausgesperrt. Derselbe Weg wie `api/portal-login`.
   *
   * ABGELEHNTE ZÄHLEN NICHT: Wessen Seite abgelehnt wurde, darf es neu versuchen.
   */
  if (!befundZurueck && mail) {
    const schon = await kuenstlerListe(
      k => String(k.mail ?? "").trim().toLowerCase() === mail && k.freigabe !== "abgelehnt",
    ).catch(() => []);
    if (schon.length) {
      const k = schon[0];
      void loginLinkSchicken(mail, sprache).catch(e => console.error("[portal-vorschau] Login-Link gescheitert:", e));
      console.info("[portal-vorschau] Adresse hat schon eine Seite:", k?.kennung);
      return NextResponse.json({ ok: false, grund: "hat-seite" }, { status: 409 });
    }
  }

  if (!befundZurueck && mail) {
    void leadAnlegen({ mail, name, sprache }).catch(e => console.error("[portal-vorschau] Lead nicht abgelegt:", e));
    /**
     * UND SOFORT AUFS TELEFON: Abgelegt allein nützt nichts — `versusforge-fb-lead/` liest sonst
     * niemand, die Adressen lägen ungesehen da. Der Owner erfährt es in dem Moment, in dem jemand
     * sie gibt (er wollte das ausdrücklich: „ich will eine SMS bekommen, wenn jemand den Tunnel
     * öffnet").
     */
    notifyAdminWhatsApp(`🎨 Analiză nouă: ${name || "(fără nume)"} · ${mail}`);
  }

  /* Die Prüfung entfällt beim zweiten Versuch: Dasselbe Bild wurde beim ersten Mal geprüft, und
     zwischen den Versuchen wandert es nicht durch den Browser. */
  if (!befundZurueck) {
    const urteil = await bildPruefen({ apiKey, bild }).catch(() => null);
    if (urteil?.urteil === "verboten") {
      console.warn("[portal-vorschau] Bild abgelehnt, nicht angesehen:", urteil.gruende.join("/"));
      return NextResponse.json({ ok: false, grund: "abgelehnt" }, { status: 422 });
    }

    /**
     * ── UND IST ES ÜBERHAUPT EIN WERK? (Owner 14.09.2026: „Leute haben versucht Bullshit
     * hochzuladen und wir haben hier Analysen gemacht") ──────────────────────────────────────
     *
     * Ein Mitgliedschafts-Zertifikat hat eine volle gpt-5-Analyse bekommen. Diese Prüfung läuft
     * auf dem kleinen Modell und kostet einen Bruchteil davon — sie steht hier, weil direkt
     * darunter der teure Aufruf beginnt.
     *
     * Im Zweifel lässt sie durch (Begründung in `kunstPruefen`): Ein durchgerutschtes Zertifikat
     * kostet Cent, ein abgewiesenes Werk einen Künstler.
     */
    const kunst = await kunstPruefen({ apiKey, bild }).catch(() => ({ kunst: true, was: "" }));
    if (!kunst.kunst) {
      console.warn("[portal-vorschau] Kein Werk, nicht analysiert:", kunst.was);
      return NextResponse.json({ ok: false, grund: "kein-werk" }, { status: 422 });
    }
  }

  /* DAS GROSSE MODELL FÜR DIE EINE ANALYSE (Owner 13.09.2026: „eine richtige analyse … nicht
     mit mini"). Es ist das einzige Bild, das der Trichter ansieht — und sein Urteil trägt den
     Satz, der später unter dem Werk steht. */
  const gesehen = befundZurueck
    ? { ok: true as const, werk: befundZurueck, verbrauch: { hinein: 0, heraus: 0, aufrufe: 0 } }
    : await bildAnsehen({ apiKey, bild, modell: GROSS }).catch(e => ({ ok: false as const, fehler: String(e) }));
  if (!gesehen.ok) {
    console.warn("[portal-vorschau] Bild nicht gelesen:", gesehen.fehler ?? "unbekannt");
    /**
     * DER GRUND GEHT NUR AUF DER WERKBANK MIT (13.09.2026).
     *
     * Innere Zustände sieht der Nutzer nie — unsere Meldungen sind für uns geschrieben und
     * deutsch, der Trichter läuft in sieben Sprachen (dieselbe Regel wie im Chat, der einen
     * `code` schickt und den Satz selbst übersetzt). Beim Suchen ist der Grund aber das
     * Einzige, was zählt, und an das Serverprotokoll kommt man von aussen nicht heran.
     *
     * `process.env.NODE_ENV` wird beim Bauen fest eingesetzt: In der ausgerollten Fassung steht
     * dieser Zweig nicht im Bündel, niemand kann ihn von aussen auslösen.
     */
    return NextResponse.json({
      ok: false,
      grund: "nicht-gelesen",
      ...(process.env.NODE_ENV !== "production" ? { fehler: gesehen.fehler } : {}),
    }, { status: 502 });
  }

  let spruchVerbrauch = { hinein: 0, heraus: 0 };
  const { spruch } = await spruchAusBefund({
    apiKey, befund: gesehen.werk, sprache,
    /* DAS BILD SELBST, nicht nur der Befund (Owner 14.09.2026: „was zum Henker wurde hier
       generiert"). Es liegt hier ohnehin in der Hand — ohne es entstand eine Nacherzählung
       englischer Stichworte samt falschem Artikel. Begründung in `spruchAusBefund`. */
    bild,
    melden: v => { spruchVerbrauch = { hinein: v.hinein, heraus: v.heraus }; },
  }).catch(() => ({ spruch: "", titel: "" }));
  if (!spruch) return NextResponse.json({ ok: false, grund: "kein-spruch" }, { status: 502 });

  /**
   * ── WAS EIN INTERESSENT KOSTET (Owner 13.09.2026: „Ja die kosten für Open AI kommen noch
   * dazu. Da müssen wir auch sparen.") ────────────────────────────────────────────────────────
   *
   * Bis hierher protokollierte nur der Chat seine Kosten (`laufKosten` in lib/versusforge-lauf.ts);
   * was Bildanalyse und Spruch verbrauchen, stand nirgends — und was man nicht misst, kann man
   * nicht senken.
   *
   * NUR AUF DER WERKBANK, wie die Fehlermeldung oben: Der Besucher hat mit unseren Kosten
   * nichts zu tun. In der ausgerollten Fassung steht der Zweig nicht im Bündel; für die
   * laufende Beobachtung dient die Zeile im Serverprotokoll darunter.
   */
  /**
   * BEIDE AUFRUFE LAUFEN JETZT AUF `gpt-5` — UND DESSEN PREIS STEHT NICHT IM HAUS.
   *
   * `laufKosten` rechnet ausschliesslich mit dem Preis von `gpt-5-mini` (PREIS in
   * lib/versusforge-lauf.ts). Seit die Analyse auf dem grossen Modell läuft, wäre eine damit
   * gerechnete Euro-Zahl schlicht FALSCH — und eine falsche Kostenzahl ist schlimmer als gar
   * keine, weil man sie glaubt. Deshalb: Token melden, Euro erst, wenn der Preis hinterlegt ist.
   */
  console.log(
    `[portal-vorschau] Analyse (gross): ${gesehen.verbrauch.hinein}/${gesehen.verbrauch.heraus} Token · `
    + `Spruch (gross): ${spruchVerbrauch.hinein}/${spruchVerbrauch.heraus} Token — Preis für gpt-5 nicht hinterlegt`,
  );

  /**
   * ── INS PROTOKOLL, AUCH WENN ER ABBRICHT (Owner 13.09.2026: „ich will das Bild im Chat sehen,
   * falls er das lässt" · schon am 11.09.2026: „ich will alles sehen, was sie hochladen") ──────
   *
   * DER NEUE WEG GING AM PROTOKOLL VORBEI. Der alte Trichter lief über die Agenten-Route, die
   * jeden Zug und jedes Bild ablegt; `api/portal-vorschau` ruft der Browser direkt. Damit
   * hinterliess jemand, der nach der Vorschau aufhört, GAR NICHTS — man sah nicht einmal, dass
   * er da war. Das ist schlechter als vorher.
   *
   * DAS BILD NUR BEIM ERSTEN MAL: Beim zweiten Satz liegt der Befund vor, das Bild ist dasselbe
   * und längst abgelegt — ein zweites Exemplar wäre nur Speicher.
   *
   * EIN ZUG JE SATZ: Wer neu schreiben lässt, erzeugt einen weiteren Eintrag. Genau daran ist
   * später abzulesen, ob die Sätze taugen.
   *
   * `void` UND BEST-EFFORT wie in der Agenten-Route: Ein Protokoll darf ein Gespräch nie kosten.
   */
  const fotoPfad = befundZurueck ? null : await laufFotoSpeichern(gespraech, zugNr, 0, bild).catch(() => null);
  void zugSchreiben({
    gespraech,
    nr: zugNr,
    zeit: new Date().toISOString(),
    sprache,
    geraet: str(b.device, 80),
    mensch: befundZurueck ? "[neu schreiben]" : "[Werk hochgeladen]",
    agent: spruch.slice(0, 400),
    ...(fotoPfad ? { fotos: [fotoPfad] } : {}),
    /* NUR BEIM ERSTEN ZUG: Da werden Name und Adresse erfasst — bei „neu schreiben" stehen sie
       längst fest und würden hier nur denselben Menschen ein zweites Mal eintragen. */
    ...(!befundZurueck && mail ? { kontakt: { name, mail } } : {}),
    werkzeuge: befundZurueck ? ["spruch"] : ["bild_ansehen", "spruch"],
    hinein: gesehen.verbrauch.hinein + spruchVerbrauch.hinein,
    heraus: gesehen.verbrauch.heraus + spruchVerbrauch.heraus,
    aufrufe: befundZurueck ? 1 : 2,
    /**
     * EURO BLEIBT 0 — UND ZWAR ABSICHTLICH. `laufKosten` rechnet mit dem Preis von gpt-5-mini;
     * hier laufen beide Aufrufe auf gpt-5, dessen Preis im Haus nicht hinterlegt ist. Eine mit
     * dem falschen Preis gerechnete Zahl stünde dauerhaft im Protokoll und würde später als
     * Tatsache gelesen. Die Token stehen daneben und sind wahr.
     */
    euro: 0,
    dauer: Date.now() - angefangen,
    fassung: 0,
  });

  return NextResponse.json({
    ok: true,
    spruch,
    /* Der Befund reist zurück, damit ein zweiter Versuch die Analyse überspringen kann. */
    befund: gesehen.werk,
    ...(process.env.NODE_ENV !== "production"
      ? { kosten: { ansehenToken: gesehen.verbrauch, spruchToken: spruchVerbrauch } }
      : {}),
  });
}
