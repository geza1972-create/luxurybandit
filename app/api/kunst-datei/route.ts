import { NextRequest } from "next/server";
import { kundenbildLesen } from "@/lib/lakatosbandi-kundenbild";
import { mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { werkKacheln, posterAnriss, kuenstlerUrl } from "@/lib/lakatosbandi";
import { druckdateiBauen, type DruckAngaben } from "@/lib/lakatosbandi-druckdatei";
import { hausherrDarf } from "@/lib/lakatosbandi-hausherr";
import { kunstBlattSatz } from "@/lib/lakatosbandi-kunst";
import { motivPfad } from "@/lib/versusforge-moderation";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { blattBildBauen } from "@/lib/lakatosbandi-blattbild";
import { filmSeite } from "@/lib/lakatosbandi-film";

/**
 * ── SEINE EIGENE DATEI, OHNE ZWEITE KASSE (Owner 19.09.2026: „generează kostet 10 Euro, klar?
 * Dann ist Download gratis") ─────────────────────────────────────────────────────────────────
 *
 * VORHER WAREN ES ZWEI ZAHLUNGEN: erzeugen (1 €), dann die Druckdatei kaufen (10 €). Wer sein
 * Bild behalten wollte, stand nach der ersten Zahlung vor einer zweiten Kasse — der Moment, in
 * dem Leute abbrechen und ihr Geld zurückfordern, weil sie das Bild für gekauft hielten.
 *
 * Jetzt kauft der eine Betrag beides. Diese Route liefert die Datei aus, ohne Stripe.
 *
 * ── WER SIE BEKOMMT, ENTSCHEIDET DER ZETTEL, NICHT DER BROWSER ──────────────────────────────
 *
 * Neben jedem abgelegten Kundenbild liegt ein Zettel (`lib/lakatosbandi-kundenbild.ts`), und
 * `stil: true` schreibt AUSSCHLIESSLICH die Erzeugungs-Route — also nur ein Lauf, der bezahlt
 * wurde. Eine erfundene Kennung fällt durch, ein nur hochgeladenes Foto auch: Das hat niemand
 * bezahlt, und die Datei dazu bleibt ein Kauf.
 *
 * Der Zettel trägt ausserdem, zu WELCHEM Werk das Bild gehört. Stimmt das nicht mit dem Aufruf
 * überein, gibt es nichts — sonst holte man sich mit einer bezahlten Kennung die Blätter aller
 * anderen Künstler.
 *
 * ── DAS BLATT IST DASSELBE WIE BEIM DRUCK ───────────────────────────────────────────────────
 *
 * Gebaut mit `druckdateiBauen`, mit denselben Angaben wie in `lakatosbandi-bestellung.ts`. Eine
 * zweite Zeichnung des Blattes wäre die Stelle, an der in vier Wochen zwei verschiedene Poster
 * herauskämen.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const FORMATE = ["A3", "A2", "A1"] as const;
type Format = (typeof FORMATE)[number];

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const bildId = String(p.get("bild") ?? "").slice(0, 32);
  const mandant = String(p.get("m") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 80);
  const werkRoh = String(p.get("i") ?? "standard").slice(0, 10);
  const format = (FORMATE as readonly string[]).includes(String(p.get("format")))
    ? (String(p.get("format")) as Format) : "A3";
  const rahmenRoh = String(p.get("rahmen") ?? "");
  const rahmen = rahmenRoh === "holz" || rahmenRoh === "schwarz" ? rahmenRoh : null;

  if (!mandant) return new Response("Not found", { status: 404 });

  /**
   * ── DER HAUSHERR LÄDT IMMER (Owner 19.09.2026: „ich soll jederzeit die Datei runterladen
   * können, egal in welchem Zustand") ─────────────────────────────────────────────────────────
   *
   * Für einen Käufer hängt die Datei am bezahlten Lauf: Wer nichts hat erzeugen lassen, hat auch
   * nichts, was gratis wäre. Für ihn gilt das nicht — es ist sein Haus, und auf einer Hochzeit
   * will er das Blatt in der Hand haben, nicht eine Kasse durchlaufen.
   *
   * „EGAL IN WELCHEM ZUSTAND" heisst wörtlich: mit erzeugtem Blatt, mit bloss hochgeladenem Foto
   * und auch ganz ohne — dann ist es das Werk des Künstlers selbst. Deshalb steht `bildId` hier
   * nicht mehr in der Pflicht.
   *
   * Geprüft wird auf dem SERVER (`hausherrDarf`, zeitsicher): Hausschlüssel oder der Schlüssel
   * genau dieses Künstlers. Ohne gültigen Schlüssel bleibt alles, wie es war.
   */
  const istHausherr = await hausherrDarf(mandant, String(p.get("s") ?? ""));

  if (!bildId && !istHausherr) return new Response("Not found", { status: 404 });

  const eigenes = bildId ? await kundenbildLesen(bildId) : null;
  /* KEIN Zettel, FREMDER Mandant oder NUR HOCHGELADEN → das ist kein bezahlter Lauf. 402 statt
     404: Die Seite soll sagen „das kostet", nicht „gibt es nicht". */
  if (!istHausherr && (!eigenes || eigenes.zettel.mandant !== mandant || !eigenes.zettel.stil)) {
    return new Response("Payment required", { status: 402 });
  }

  const nr = werkRoh === "-1" || werkRoh === "" ? "standard" : werkRoh;
  /* Der Zettel weiss, zu welchem Werk das Bild gehört — der Aufruf muss dazu passen. */
  if (eigenes) {
    const zettelNr = eigenes.zettel.werk === "-1" || eigenes.zettel.werk === "" ? "standard" : eigenes.zettel.werk;
    if (zettelNr !== nr && !istHausherr) return new Response("Payment required", { status: 402 });
  }

  const m = await mandantOeffentlich(mandant);
  if (!m) return new Response("Not found", { status: 404 });
  const info = m.werkInfo?.[nr] ?? {};
  const kachel = werkKacheln(m).find(k => (k.i < 0 ? "standard" : String(k.i)) === nr);

  try {
    /* ── SEINE ZEILEN SCHLAGEN DIE DES KÜNSTLERS (Owner 19.09.2026: „dann wird es gespeichert")
       Hat er auf dem Blatt geschrieben, steht das im Zettel (`api/kunst-text`) — und gehört in
       die Datei. Leer heisst: die Worte des Künstlers gelten weiter. */
    const seinTitel = String(eigenes?.zettel.titel ?? "").trim();
    const seinSatz = String(eigenes?.zettel.satz ?? "").trim();

    /**
     * Ohne Kundenbild ist das Werk des Künstlers selbst die Vorlage — dasselbe Motiv, das auf
     * dem Blatt steht. Nur der Hausherr kommt hier an (siehe die Prüfung oben).
     */
    let quelle = eigenes?.bild ?? null;
    if (!quelle) {
      const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(mandant, nr))}`);
      if (!r.ok) return new Response("Not found", { status: 404 });
      quelle = new Uint8Array(await r.arrayBuffer());
    }
    /**
     * ── PDF ODER BILD (Owner 19.09.2026: „ich denke, dass JPGs sogar besser sind" · „als Datei
     * und nicht PDFs") ────────────────────────────────────────────────────────────────────────
     *
     * Beide aus denselben Angaben, beide gratis: Was hier entsteht, ist reine Rechenzeit — kein
     * Modell, kein Anbieter. Das PDF für die Druckerei, das Bild für alles andere (Fotodienst,
     * Drogeriemarkt, Instagram, WhatsApp).
     */
    const alsBild = String(p.get("typ") ?? "").toLowerCase() === "jpg";
    /**
     * ── DIE DATEI MUSS DAS BLATT SEIN (Owner 19.09.2026: „wieso sehe ich in der
     * runtergeladenen Datei etwas ganz anderes?") ────────────────────────────────────────────
     *
     * ZWEI ZEILEN LIEFEN AUSEINANDER, weil die Datei sie anders herleitete als der Schirm:
     *
     *  · DER SATZ. Auf dem Blatt eines Generators steht `kunstBlattSatz(kunstStil)` —
     *    „Caricature in vintage style · lakatosbandi.com". Hier stand der HOOK des Künstlers
     *    („Transformă poza ta…"). Anderer Satz, andere Länge, andere Schriftgrösse: Das Blatt
     *    sah aus wie ein anderes Blatt.
     *  · DIE ADRESSE. Der Schirm nennt die Seite des KÜNSTLERS
     *    (`lakatosbandi.com/caricaturist-ai`), die Datei nur das Haus.
     *
     * Beide holen ihre Werte jetzt aus derselben Quelle wie die Seite. Wer die Datei neben den
     * Bildschirm legt, muss dasselbe Blatt sehen — sonst ist die Vorschau eine Behauptung.
     */
    const angaben: DruckAngaben = {
      bild: quelle,
      titel: seinTitel || [info.titel, info.jahr].filter(Boolean).join(", ") || (m.name ?? ""),
      text: seinSatz || (m.kunstAn ? kunstBlattSatz(m.kunstStil) : posterAnriss(kachel?.hook ?? "")),
      qrZiel: filmSeite(mandant, kachel?.i ?? -1),
      recht: kuenstlerUrl(mandant).replace(/^https?:\/\//, ""),
      format,
      /* `null` heisst „ohne Rahmen"; der Bauplan kennt dafür `undefined`. */
      ...(rahmen ? { rahmen } : {}),
    };
    const bytes = alsBild
      ? await blattBildBauen({ ...angaben, dpi: Math.round(Number(p.get("dpi")) || 150) })
      : await druckdateiBauen(angaben);
    const name = `${(info.titel || m.name || "poster").replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 60)} · ${format}.${alsBild ? "jpg" : "pdf"}`;
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": alsBild ? "image/jpeg" : "application/pdf",
        /* `attachment`: Der Knopf heisst „herunterladen", also soll die Datei ankommen und nicht
           in einem neuen Tab aufgehen. */
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[kunst-datei] nicht gebaut:", mandant, nr, err);
    return new Response("Not found", { status: 500 });
  }
}
