import { getSignedUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * HERUNTERLADEN, DAS AUF DEM HANDY FUNKTIONIERT (Owner 09.08.2026, mit einem Bild seines
 * iPhones: „Ich habe auf Download geklickt auf dem Handy und dann öffnet sich das. Ich kann
 * da nichts machen. Weder Fenster schliessen noch Download.").
 *
 * WARUM DER ALTE WEG AUF DEM IPHONE STIRBT: Er holte die Datei per `fetch`, baute daraus
 * einen Blob und klickte einen unsichtbaren Link an. Auf dem Schreibtisch tadellos — auf
 * iOS nicht: Safari erlaubt einen ausgelösten Download nur, solange die Fingerberührung
 * „frisch" ist. Nach dem `await` ist sie verbraucht, der Klick verpufft, und der Notausgang
 * (`window.open`) landete auf der nackten Speicher-Adresse: ein Videospieler ohne
 * Zurück-Knopf, ohne Fenster-Schliessen, ohne Download. Eine Sackgasse.
 *
 * DER WEG, DER TRÄGT: ein GEWÖHNLICHER Link (`<a href>`) auf diese Route. Kein JavaScript,
 * kein Warten, keine verbrauchte Berührung — und weil hier `Content-Disposition:
 * attachment` steht, bietet jedes Handy die Datei zum SICHERN an, statt sie abzuspielen.
 *
 * ZUR SICHERHEIT: Nur Pfade aus unserem eigenen Ordner (`try-this-look/…`) werden
 * ausgeliefert, und `..` ist verboten — sonst wäre das hier ein offener Umschlagplatz, über
 * den jeder beliebige Speicher-Adressen durch unseren Server ziehen könnte. Der Pfad selbst
 * ist eine Zufallskennung; wer sie hat, hatte ohnehin schon den signierten Link.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pfad = (url.searchParams.get("path") ?? "").trim();
  const name = (url.searchParams.get("name") ?? "luxurybandit").replace(/[^a-z0-9.\-_]+/gi, "-").slice(0, 80);

  if (!pfad.startsWith("try-this-look/") || pfad.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const signiert = await getSignedUrl(pfad).catch(() => "");
    if (!signiert) return new Response("Not found", { status: 404 });
    const datei = await fetch(signiert);
    if (!datei.ok || !datei.body) return new Response("Not found", { status: 404 });

    /* Auch die Original-Aufnahme eines Bewerbers (mov/webm vom Handy, notfalls reine
       Tonspur) — vorher bekam alles ausser mp4/png ein „image/jpeg" übergestülpt. */
    const typ = pfad.endsWith(".mp4") ? "video/mp4"
      : pfad.endsWith(".mov") ? "video/quicktime"
      : pfad.endsWith(".webm") ? "video/webm"
      : pfad.endsWith(".m4a") ? "audio/mp4"
      : pfad.endsWith(".mp3") ? "audio/mpeg"
      : pfad.endsWith(".png") ? "image/png"
      /* AUCH DOKUMENTE (28.08.2026): Der Lebenslauf in den Assets ist ein PDF oder eine
         Word-Datei — bis hierher bekam beides „image/jpeg" übergestülpt, und die
         heruntergeladene Datei liess sich nicht öffnen. Gemessen am David-Testkonto:
         `image/jpeg` auf einer .pdf. */
      : pfad.endsWith(".pdf") ? "application/pdf"
      : pfad.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : pfad.endsWith(".doc") ? "application/msword"
      : "image/jpeg";
    return new Response(datei.body, {
      headers: {
        "content-type": typ,
        /* DAS IST DIE GANZE MAGIE: „attachment" heisst sichern, nicht abspielen. */
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "private, max-age=0, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
