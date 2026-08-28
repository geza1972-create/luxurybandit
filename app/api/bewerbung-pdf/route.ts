import { NextResponse } from "next/server";
import { leseLebenslauf } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";
import { bewerbungAlsPdf, type PdfFoto } from "@/lib/bewerbung-pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DER PDF-DOWNLOAD DES RESUME GENERATORS (Owner 26.08.2026: „Bewerbungsgenerator.
 * Als PDF. … Mit wasserzeichen. Will er ohne, muss er zahlen 9,99 Euro").
 *
 * GET ?id=<bewerbungsId>&device=<geraet> → das PDF, on-the-fly aus dem Profil gebaut.
 *
 * WARUM ON-THE-FLY STATT ABGELEGT: Das Profil in Supabase IST die Quelle — das PDF ist
 * jederzeit daraus reproduzierbar (Hausregel `paid-jobs-must-survive-the-browser`:
 * der Server liefert nach, der Browser ist nur die Anzeige). Keine zweite Datei, die
 * beim Bearbeiten veralten könnte.
 *
 * DAS WASSERZEICHEN ENTSCHEIDET DER SERVER: `bezahlt` am Profil — nie ein
 * Client-Parameter. Die Muster-Fassung ist voll brauchbar und darf verschickt werden
 * (Hausregel `gratis-nur-mit-muster`); ohne Wasserzeichen gibt es sie erst, wenn die
 * Kasse `bezahlt` gestempelt hat.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  const device = String(url.searchParams.get("device") ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Bewerbung nicht gefunden." }, { status: 404 });
  /* Besitz wie überall am Profil — bei einer Bewerbungs-Kopie hängt er am Hauptprofil. */
  const basis = profil.basisId ? await leseLebenslauf(profil.basisId) : profil;
  /**
   * DIE MUSTER-BEWERBUNG DARF JEDER SEHEN (28.08.2026) — sie ist das Beispiel, das im
   * David-Flow zeigt, WAS man kauft (Owner: „wir machen das nur pdf und anschreiben").
   * Der Inhalt ist erfunden (Musterfirmen, keine echte Person), es gibt also nichts zu
   * schützen; ohne diese Ausnahme fiele das eigene Beispiel unter dieselbe Besitzprüfung
   * wie eine fremde Bewerbung.
   */
  const oeffentlichesMuster = id === "david-muster-cora";
  if (!basis) return NextResponse.json({ error: "Bewerbung nicht gefunden." }, { status: 404 });
  if (!oeffentlichesMuster && !(await darfAmProfilArbeiten(basis, device, request))) {
    return NextResponse.json({ error: "Diese Bewerbung gehört zu einem anderen Browser. Öffne sie auf dem Gerät, auf dem du sie erstellt hast." }, { status: 403 });
  }

  /* Das Foto der Bewerbung (oder des Hauptprofils) — unlesbar/fehlend ist nie ein
     Abbruch, dann kommt der Lebenslauf ohne Bild. */
  let foto: PdfFoto = null;
  const fotoUrl = profil.fotoUrl || basis.fotoUrl || "";
  if (fotoUrl) {
    try {
      const absolut = fotoUrl.startsWith("http") ? fotoUrl : `${url.origin}${fotoUrl}`;
      const r = await fetch(absolut);
      if (r.ok) {
        const bytes = new Uint8Array(await r.arrayBuffer());
        if (bytes[0] === 0xFF && bytes[1] === 0xD8) foto = { bytes, typ: "jpg" };
        else if (bytes[0] === 0x89 && bytes[1] === 0x50) foto = { bytes, typ: "png" };
      }
    } catch { /* siehe oben */ }
  }

  /* `bezahlt` gilt, wenn die Bewerbung ODER ihr Hauptprofil bezahlt ist — wer das
     Hauptprofil gekauft hat, bekommt keine Muster-Schranke auf seinen Versionen. */
  const bezahlt = profil.bezahlt === true || basis.bezahlt === true;
  /* DIE GEWÄHLTE VORLAGE (28.08.2026) — sie steht am Profil; die Adresse darf sie zum
     Ansehen überschreiben (`?vorlage=marine`), damit die Galerie ihre Vorschauen holen
     kann, ohne für jede Vorlage ein eigenes Profil anzulegen. */
  const vorlage = String(url.searchParams.get("vorlage") ?? "").trim() || profil.pdfVorlage || basis.pdfVorlage || "";
  const pdf = await bewerbungAlsPdf(profil, { wasserzeichen: !bezahlt, foto, vorlage });

  const dateiname = `Bewerbung${profil.anzeigeTitel ? `-${profil.anzeigeTitel}` : ""}${profil.name ? `-${profil.name}` : ""}`
    .replace(/[^\p{L}\p{N} _-]+/gu, "").replace(/\s+/g, "-").slice(0, 80) || "Bewerbung";
  /**
   * ANSEHEN ODER HERUNTERLADEN — DER AUFRUFER ENTSCHEIDET (Owner 28.08.2026: „soll sich im
   * Browser öffnen").
   *
   * Bisher ging das PDF IMMER als `attachment` raus. Für einen Download-Knopf ist das
   * richtig; für einen Tipp auf die Kachel in der Galerie nicht. Dort will man erst SEHEN,
   * was man gekauft hat — ein Klick, der wortlos eine Datei in den Download-Ordner legt,
   * fühlt sich an, als wäre nichts passiert. Herunterladen kann man aus der Vorschau des
   * Browsers heraus immer noch, mit einem Knopf, den jeder kennt.
   *
   * `?ansehen=1` schaltet auf `inline`. OHNE den Parameter bleibt alles wie bisher — die
   * Download-Knöpfe in der Lebenslauf-Tür und im David-Angebot hängen daran, und ein
   * stillschweigend geändertes Verhalten wäre dort ein Rückschritt.
   */
  const ansehen = url.searchParams.get("ansehen") === "1";
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${ansehen ? "inline" : "attachment"}; filename="${dateiname}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
