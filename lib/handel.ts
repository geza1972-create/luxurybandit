import { fillPrices } from "@/lib/pricing";
import type { Lang } from "@/lib/lang";

/**
 * DER HANDEL STEHT VOR DER ARBEIT (KONZEPT-GESCHENKE-UND-IDEEN.md, Punkt 2 des Pakets).
 *
 * Owner 04.08.2026: „Der Handel steht VOR der Arbeit, nie danach. Genau die Überraschung nach
 * getaner Arbeit ist der Fehler, den wir Canva vorwerfen — ihn selbst zu bauen wäre das Ende
 * der Glaubwürdigkeit."
 *
 * WAS DAS HEISST, GANZ WÖRTLICH: Bevor jemand ein Foto aussucht, zuschneidet und hochlädt —
 * bevor er also ARBEITET —, muss dastehen, was er dafür bekommt und was es kostet. Nicht auf
 * dem Kaufknopf drei Schritte später, nicht auf der Kassenseite, sondern am Eingang.
 *
 * WARUM EINE EIGENE DATEI und nicht je Trichter eine Zeile: Genau daran ist der Preis vorher
 * auseinandergelaufen (siehe `components/ThemenPreis.tsx` — auf der Hochzeits-Kachel stand
 * 24 €, die Kasse nahm 1,49 €). Drei Trichter mit je sieben Sprachen sind einundzwanzig
 * Gelegenheiten, eine Zahl falsch abzuschreiben. Hier steht der Satz EINMAL, die Leiter
 * darunter nennt je Thema nur noch PLATZHALTER, und `fillPrices` füllt sie aus `lib/pricing`.
 *
 * NICHT AUF DIE LANDINGPAGE (Owner 04.08.2026, zu ThemenPreis: „das schreibst du nicht: aus
 * deinem Guthaben · Aufladung 4,99 € oder 9,99 €"). Unter der Überschrift weiss der Besucher
 * noch nicht, was er kauft — dort steht nur die Zahl. Diese Zeile gehört an den EINGANG DES
 * TRICHTERS, also dorthin, wo er gleich sein Foto hergibt.
 *
 * SIE VERSPRICHT NUR, WAS DER TRICHTER HEUTE WIRKLICH TUT. Die Gratis-Stufe steht in der
 * Leiter unten nur dort, wo es sie gibt (heute allein beim System — überall sonst steht
 * `keinGratis` in `lib/geschenke.ts`). Wer die Gratis-Stufe zurückholt, setzt hier `gratis`
 * auf true und ändert KEINEN Text: Der Satz dafür steht in allen sieben Sprachen bereit.
 */

/** Die Trichter, die einen Eingang mit Foto-Upload haben. Unbekanntes ergibt keine Zeile. */
export type HandelThema = "kiss" | "birthday" | "poledance" | "wedding" | "holiday" | "plan" | "gutschein";

type Bloecke = {
  /** Die Gratis-Stufe — das Bild mit dem Muster, das er behalten und verschicken DARF. */
  gratis: string;
  /** Das Bild kostet etwas (Hochzeit, Urlaub). `{preis}` wird aus der Leiter gesetzt. */
  bild: string;
  /** Das Video kostet etwas. `{preis}` wird aus der Leiter gesetzt. */
  video: string;
  /** Bild UND Video in einem Zug — der zweite Knopf im Einladungs-Dialog. */
  videoGleich: string;
  /** Die Analyse des Systems. */
  analyse: string;
  /**
   * DIE ZUSAGE, DIE DAS BLINDE ZAHLEN TRAEGT (Owner 05.08.2026: „die frage ist nur, was
   * passiert wenn die leute mit dem video nicht zufrieden sind, oder ai macht es nicht
   * richtig?").
   *
   * Die Antwort steht seit dem 03.08. im Code — `app/api/kiss-erstattung`: ein gescheiterter
   * Lauf wird nie abgebucht, und ein geliefertes, aber unbrauchbares Video gibt es mit zwei
   * Tipps zurueck, als Guthaben, einmal je Auftrag. Nur ERFAEHRT er das bisher erst NACH dem
   * Kauf, unter dem fertigen Video.
   *
   * ER STEHT TROTZDEM NICHT AM EINGANG — Owner 05.08.2026, wenige Minuten spaeter: „nenene,
   * sie sind schlau. Das Bild sieht manchmal ok aus, es ist doch AI. Manchmal haben sie bloede
   * Bilder hochgeladen und dann ist er schuld, nicht wir."
   *
   * Er hat recht, und es ist die aeltere Erkenntnis von beiden: Eine BEWORBENE Rueckgabe
   * erzeugt das Verhalten, das sie abfedern soll. Wer vor dem Kauf liest „sonst Geld zurueck",
   * prueft das Ergebnis mit anderen Augen. Die Erstattung bleibt — als Anfrage unter dem
   * fertigen Video, die der Owner freigibt (app/api/kiss-erstattung). Sie wird nur nicht
   * angepriesen.
   *
   * Der Baustein bleibt in sieben Sprachen liegen; ein `garantie: true` in der Leiter holt ihn
   * zurueck, falls die Entscheidung je kippt.
   *
   * „ALS GUTHABEN" STEHT AUSDRUECKLICH DA, weil es die Wahrheit ist: Zurueck kommt Guthaben,
   * keine Gutschrift auf die Karte. Ein Satz, der mehr verspricht als die Route einloest, ist
   * genau die Ueberraschung nach getaner Arbeit, gegen die diese Zeile gebaut ist.
   */
  garantie: string;
  /**
   * DER ZAHLWEG BEIM GUTHABEN (Owner 03.08.2026: „hier muss doch stehen dass das Video {once}
   * kostet aber er muss das Konto mit mindestens {topup} aufladen. Sonst fühlt er sich
   * ausgeraubt").
   *
   * Derselbe Gedanke wie `guthabenVorabHinweis` in `lib/kiss-i18n.ts` — dort steht er direkt
   * über dem Knopf, hier am Eingang. Beides ist richtig: Am Eingang ist es der Handel, über
   * dem Knopf die letzte Warnung vor der Kassenseite. Doppelt gesagt ist bei Geld kein Fehler.
   */
  guthaben: string;
};

/**
 * DEUTSCH IST DER URTEXT (Owner 04.08.2026: „wir bearbeiten jetzt zuerst die deutsche Seite,
 * dann übersetzen wir, weil ich besser deutsch kann"). Wer eine Zeile ändert, ändert sie hier
 * und trägt sie danach in die anderen sechs nach.
 *
 * KEINE ZAHLEN IN DIESEN SÄTZEN — nur `{preis}` und `{topup}`. Die Hausregel steht in
 * `lib/pricing.ts` und im Memory `prices-only-from-pricing-table`.
 */
const DE: Bloecke = {
  gratis: "Dein Bild ist gratis — mit dem Muster „© luxurybandit.com“ darüber. Behalten, herunterladen, verschicken: alles erlaubt.",
  bild: "Das Bild kostet {preis}.",
  video: "Das Video kostet {preis}.",
  videoGleich: "Gleich als Video: {preis}.",
  analyse: "Die Analyse kostet {preis}.",
  garantie: "Wird es nichts, bekommst du dein Geld als Guthaben zurück.",
  guthaben: "Bezahlt wird aus deinem Guthaben — die kleinste Aufladung ist {topup}, der Rest bleibt dir.",
};

const EN: Bloecke = {
  gratis: "Your picture is free — with the “© luxurybandit.com” pattern across it. Keep it, download it, send it: all fine.",
  bild: "The picture costs {preis}.",
  video: "The video costs {preis}.",
  videoGleich: "As a video right away: {preis}.",
  analyse: "The analysis costs {preis}.",
  garantie: "If it does not turn out, you get your money back as credit.",
  guthaben: "It is paid from your balance — the smallest top-up is {topup}, and whatever is left stays yours.",
};

const RO: Bloecke = {
  gratis: "Poza ta e gratuită — cu modelul „© luxurybandit.com” peste ea. O poți păstra, descărca și trimite.",
  bild: "Poza costă {preis}.",
  video: "Videoclipul costă {preis}.",
  videoGleich: "Direct ca videoclip: {preis}.",
  analyse: "Analiza costă {preis}.",
  garantie: "Dacă nu iese bine, primești banii înapoi ca și credit.",
  guthaben: "Se plătește din creditul tău — cea mai mică reîncărcare este {topup}, iar restul rămâne al tău.",
};

const ES: Bloecke = {
  gratis: "Tu imagen es gratis — con el patrón «© luxurybandit.com» encima. Puedes guardarla, descargarla y enviarla.",
  bild: "La imagen cuesta {preis}.",
  video: "El vídeo cuesta {preis}.",
  videoGleich: "Directamente en vídeo: {preis}.",
  analyse: "El análisis cuesta {preis}.",
  garantie: "Si no sale bien, te devolvemos el dinero como saldo.",
  guthaben: "Se paga con tu saldo — la recarga más pequeña es {topup}, y lo que sobra queda para ti.",
};

const FR: Bloecke = {
  gratis: "Ton image est gratuite — avec le motif « © luxurybandit.com » dessus. Tu peux la garder, la télécharger et l’envoyer.",
  bild: "L’image coûte {preis}.",
  video: "La vidéo coûte {preis}.",
  videoGleich: "Directement en vidéo : {preis}.",
  analyse: "L’analyse coûte {preis}.",
  garantie: "Si le résultat ne va pas, tu récupères ton argent en crédit.",
  guthaben: "C’est payé depuis ton solde — la plus petite recharge est {topup}, et ce qui reste est à toi.",
};

const PT: Bloecke = {
  gratis: "A tua imagem é grátis — com o padrão «© luxurybandit.com» por cima. Podes guardá-la, transferi-la e enviá-la.",
  bild: "A imagem custa {preis}.",
  video: "O vídeo custa {preis}.",
  videoGleich: "Já como vídeo: {preis}.",
  analyse: "A análise custa {preis}.",
  garantie: "Se não ficar bom, devolvemos o dinheiro como saldo.",
  guthaben: "É pago com o teu saldo — o carregamento mais pequeno é {topup}, e o resto fica para ti.",
};

const IT: Bloecke = {
  gratis: "La tua immagine è gratis — con la scritta «© luxurybandit.com» ripetuta sopra. Puoi tenerla, scaricarla e inviarla.",
  bild: "L’immagine costa {preis}.",
  video: "Il video costa {preis}.",
  videoGleich: "Subito come video: {preis}.",
  analyse: "L’analisi costa {preis}.",
  garantie: "Se non viene bene, ti restituiamo i soldi come credito.",
  guthaben: "Si paga dal tuo credito — la ricarica più piccola è {topup}, e il resto resta tuo.",
};

const TABELLE: Record<Lang, Bloecke> = { de: DE, en: EN, ro: RO, es: ES, fr: FR, pt: PT, it: IT };

/**
 * DIE LEITER JE THEMA — WAS DIE KASSE WIRKLICH NIMMT, nicht was gemeint war.
 *
 * Jede Zeile ist an der Route nachgeschlagen, nicht an der Absicht (dieselbe Prüfung, die
 * `themenPreisCents` in lib/pricing.ts über sich schreibt):
 *
 *   kiss                  `unlock("once")` → ONCE_CENTS, nur über Guthaben (`nurGuthaben`)
 *   birthday · poledance  dito, aber POLEDANCE_CENTS (`videoPreisCents` in KissFunnel)
 *   wedding · holiday     `/api/kiss-video-checkout`: ONCE_CENTS, mit `videoAufpreis`
 *                         VIDEO_UPGRADE_CENTS (components/EinladungBauen: `erzeugen(alsVideo)`)
 *   plan                  Bild gratis, Analyse über `/api/plan-checkout` → PLAN_CENTS
 *
 * `gratis: true` steht heute NUR beim System — überall sonst trägt `lib/geschenke.ts` ein
 * `keinGratis`, und ein Gratis-Versprechen auf einem Trichter, der keins einhält, ist genau
 * der Fehler, den diese Zeile verhindern soll.
 */
const LEITER: Record<HandelThema, {
  gratis?: boolean; bild?: string; video?: string; videoGleich?: string; analyse?: string;
  garantie?: boolean; guthaben?: boolean;
}> = {
  /**
   * OHNE DEN GUTHABEN-SATZ (Owner 05.08.2026: „aufladen muss mann dann mit 14,99€ mindestens").
   *
   * Der Satz erklärte eine Lücke: Video 1,49 €, kleinste Aufladung 4,99 € — dazwischen lag ein
   * Rest, den man ansprechen musste, damit sich niemand ausgeraubt fühlt. Aufladung und Preis
   * sind jetzt DIESELBE Zahl; es gibt keine Lücke mehr und damit nichts zu erklären. „Das
   * Video kostet 14,99 €" ist die ganze Wahrheit, und ein Satz weniger am Eingang ist ein
   * Satz, den er wirklich liest.
   *
   * Der Baustein bleibt in allen sieben Sprachen stehen (`B.guthaben`): Wer je wieder eine
   * Aufladung einführt, die grösser ist als der Preis, schaltet ihn hier auf `true` — und
   * braucht keine Übersetzung.
   */
  /**
   * KEINE GRATIS-STUFE (Owner 05.08.2026: „ich will auch keine bilder mehr verschenken").
   * Der Satz dafür bleibt in allen sieben Sprachen liegen — ein `gratis: true` hier holt ihn
   * zurück, falls die Entscheidung je wieder kippt.
   */
  kiss:      { video: "{once}" },
  /**
   * TANZ UND GEBURTSTAG BLEIBEN OHNE — und das ist keine Preisentscheidung, sondern eine
   * technische: Beide bestehen aus EINEM Pixverse-Lauf mit einem einzigen Foto (`nurSie`,
   * `garmentBild`). Es gibt dort gar keinen Bild-Schritt, den man verschenken könnte, und
   * OpenAI würde die Tanz-Vorlage am Eingang abweisen (Memory `pixverse-accepts-lingerie-refs`).
   * Ein Gratis-Bild dort ist ein eigenes Produkt, kein Schalter.
   */
  birthday:  { video: "{tanz}" },
  poledance: { video: "{tanz}" },
  wedding:   { bild: "{once}", videoGleich: "{videoauf}" },
  holiday:   { bild: "{once}", videoGleich: "{videoauf}" },
  /**
   * DER GUTSCHEIN KOSTET WIE JEDES GESCHENK — {once}, und mehr steht hier nicht.
   *
   * Kein `bild`/`videoGleich`-Paar wie bei Hochzeit und Urlaub: Dort waehlt er zwischen einer
   * Bildkarte und einer Videokarte, weil wir das Video ERZEUGEN. Beim Gutschein bringt er sein
   * eigenes Video mit (oder nimmt unser fertiges) — es gibt keine zweite Stufe, zwischen der
   * man waehlen koennte, also auch keinen Aufpreis zu nennen.
   */
  gutschein: { video: "{once}" },
  plan:      { gratis: true, analyse: "{plan}" },
};

/**
 * Der fertige Satz für den Eingang eines Trichters — in seiner Sprache, mit Zahlen aus
 * `lib/pricing`. Kennt die Leiter das Thema nicht, kommt ein leerer String zurück und die
 * Zeile erscheint gar nicht: lieber nichts als ein geratener Preis.
 */
export function handelZeile(thema: HandelThema, lang?: string): string {
  const l = (String(lang ?? "en").slice(0, 2) as Lang);
  const B = TABELLE[l] ?? TABELLE.en;
  const stufe = LEITER[thema];
  if (!stufe) return "";

  const teile = [
    stufe.gratis ? B.gratis : "",
    stufe.bild ? B.bild.replace("{preis}", stufe.bild) : "",
    stufe.video ? B.video.replace("{preis}", stufe.video) : "",
    stufe.videoGleich ? B.videoGleich.replace("{preis}", stufe.videoGleich) : "",
    stufe.analyse ? B.analyse.replace("{preis}", stufe.analyse) : "",
    stufe.guthaben ? B.guthaben : "",
    // Ganz zum Schluss: erst was es kostet, dann was passiert, wenn es schiefgeht.
    stufe.garantie ? B.garantie : "",
  ].filter(Boolean);

  return fillPrices(teile.join(" "), l);
}
