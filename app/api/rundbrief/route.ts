import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readKissConfig, getSignedUrl, createSignedUploadUrl } from "@/lib/try-this-look-store";
import { alleEmpfaenger } from "@/lib/portal-empfaenger";
import { sendEmail } from "@/lib/email-send";
import { fillPrices } from "@/lib/pricing";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Ein Rundbrief an alle dauert länger als eine Sekunde: eine Mail je ~1 s, plus das Poster.
export const maxDuration = 300;

/**
 * DER RUNDBRIEF AN ALLE — Thema Kuss.
 *
 * Owner 31.07.2026: „wir müssen jetzt eine E-Mail rausschicken mit dem Thema Kuss an alle
 * User. Bei vielen hat es heute nicht geklappt. Und wir müssen es sagen dass der Preis jetzt
 * 2,99 ist und wir heute an der Software gearbeitet haben. Sie können es gratis versuchen.
 * Und wir müssen einen Video-Poster schicken."
 *
 * DREI SCHUTZVORRICHTUNGEN, weil ein Rundbrief nicht zurückzuholen ist:
 *   1. `test: "adresse"` schickt an GENAU EINE Adresse. Das ist der Normalfall beim Bauen.
 *   2. Ohne `all: true` wird NICHTS verschickt — die Route zählt dann nur und meldet, wen
 *      sie gefunden hätte. So sieht man die Zahl, bevor man sie auslöst.
 *   3. Nur Admin. Ein offener Rundbrief-Endpunkt wäre ein Geschenk an jeden Fremden.
 *
 * WAS DRINSTEHT, und warum genau das: Wer heute erfolglos war, hat eine Enttäuschung erlebt.
 * Ihn jetzt nur mit einem Preis anzuschreiben, wäre Werbung; ihn zuerst um Entschuldigung zu
 * bitten und den Gratis-Versuch anzubieten, ist eine Einladung, es noch einmal zu versuchen.
 * Der Preis kommt danach — und aus der Preistabelle, nie von Hand getippt.
 */

/** Sieben Sprachen, wie das Portal (Polnisch ist seit 30.07.2026 raus). */
const TEXTE: Record<string, {
  betreff: string; hallo: string; entschuldigung: string; gemacht: string;
  gratis: string; preis: string; knopf: string; abmelden: string; fuss: string;
}> = {
  de: {
    betreff: "Der Kuss läuft wieder — heute repariert, ein Versuch gratis",
    hallo: "Kurz in eigener Sache.",
    entschuldigung: "Wenn dein Kuss-Bild heute nicht geklappt hat: Das lag an uns, nicht an deinen Fotos. Entschuldige bitte.",
    gemacht: "Wir haben den ganzen Tag daran gearbeitet. Es läuft wieder — und es kommt jetzt zuverlässig ein Bild.",
    gratis: "Probier es noch einmal aus. Das Bild ist gratis.",
    preis: "Willst du daraus ein echtes Video machen: {once} — ohne Abo, ohne Kleingedrucktes.",
    knopf: "Jetzt gratis probieren",
    abmelden: "Keine Rundbriefe mehr",
    fuss: "Du bekommst das, weil du auf LuxuryBandit ein Bild oder Video erstellt hast.",
  },
  en: {
    betreff: "The kiss works again — fixed today, one free try",
    hallo: "A quick word from us.",
    entschuldigung: "If your kiss picture didn't work today: that was on us, not on your photos. We're sorry.",
    gemacht: "We worked on it all day. It runs again — and a picture now comes through reliably.",
    gratis: "Give it another go. The picture is free.",
    preis: "Want to turn it into a real video: {once} — no subscription, no small print.",
    knopf: "Try it free now",
    abmelden: "No more newsletters",
    fuss: "You're getting this because you created a picture or video on LuxuryBandit.",
  },
  ro: {
    betreff: "Sărutul funcționează din nou — reparat azi, o încercare gratuită",
    hallo: "Câteva cuvinte de la noi.",
    entschuldigung: "Dacă azi nu ți-a ieșit poza cu sărutul: a fost vina noastră, nu a pozelor tale. Ne pare rău.",
    gemacht: "Am lucrat la asta toată ziua. Merge din nou — și acum poza chiar iese.",
    gratis: "Mai încearcă o dată. Poza e gratuită.",
    preis: "Vrei un videoclip adevărat din ea: {once} — fără abonament, fără scris mărunt.",
    knopf: "Încearcă gratuit acum",
    abmelden: "Nu mai vreau newslettere",
    fuss: "Primești asta pentru că ai creat o poză sau un videoclip pe LuxuryBandit.",
  },
  es: {
    betreff: "El beso vuelve a funcionar — arreglado hoy, una prueba gratis",
    hallo: "Unas palabras nuestras.",
    entschuldigung: "Si hoy no te salió tu foto del beso: fue culpa nuestra, no de tus fotos. Lo sentimos.",
    gemacht: "Hemos trabajado en ello todo el día. Vuelve a funcionar — y ahora la foto sale de verdad.",
    gratis: "Inténtalo otra vez. La foto es gratis.",
    preis: "¿Quieres convertirla en un vídeo de verdad? {once} — sin suscripción, sin letra pequeña.",
    knopf: "Probar gratis ahora",
    abmelden: "No más boletines",
    fuss: "Recibes esto porque creaste una foto o un vídeo en LuxuryBandit.",
  },
  fr: {
    betreff: "Le baiser refonctionne — réparé aujourd'hui, un essai gratuit",
    hallo: "Un mot de notre part.",
    entschuldigung: "Si ta photo de baiser n'a pas marché aujourd'hui : c'était de notre faute, pas de tes photos. Désolés.",
    gemacht: "Nous y avons travaillé toute la journée. Ça remarche — et l'image arrive maintenant vraiment.",
    gratis: "Réessaie. La photo est gratuite.",
    preis: "Envie d'en faire une vraie vidéo : {once} — sans abonnement, sans petites lignes.",
    knopf: "Essayer gratuitement",
    abmelden: "Plus de newsletters",
    fuss: "Tu reçois ceci parce que tu as créé une photo ou une vidéo sur LuxuryBandit.",
  },
  pt: {
    betreff: "O beijo voltou a funcionar — reparado hoje, uma tentativa grátis",
    hallo: "Duas palavras da nossa parte.",
    entschuldigung: "Se hoje a tua foto do beijo não resultou: a culpa foi nossa, não das tuas fotos. Desculpa.",
    gemacht: "Trabalhámos nisso o dia todo. Voltou a funcionar — e agora a foto sai mesmo.",
    gratis: "Tenta outra vez. A foto é grátis.",
    preis: "Queres transformá-la num vídeo a sério: {once} — sem subscrição, sem letras pequenas.",
    knopf: "Experimenta grátis",
    abmelden: "Não quero mais newsletters",
    fuss: "Recebes isto porque criaste uma foto ou um vídeo no LuxuryBandit.",
  },
  it: {
    betreff: "Il bacio funziona di nuovo — riparato oggi, una prova gratis",
    hallo: "Due parole da parte nostra.",
    entschuldigung: "Se oggi la tua foto del bacio non ha funzionato: è stata colpa nostra, non delle tue foto. Ci dispiace.",
    gemacht: "Ci abbiamo lavorato tutto il giorno. Funziona di nuovo — e ora la foto arriva davvero.",
    gratis: "Riprova. La foto è gratis.",
    preis: "Vuoi farne un video vero: {once} — senza abbonamento, senza scritte in piccolo.",
    knopf: "Prova gratis ora",
    abmelden: "Non voglio più newsletter",
    fuss: "Ricevi questo perché hai creato una foto o un video su LuxuryBandit.",
  },
};

const html = (t: typeof TEXTE.de, link: string, unsub: string, poster: string) => `
<div style="margin:0;padding:24px 12px;background:#100d08">
 <div style="max-width:520px;margin:0 auto;background:#fffdf7;border-radius:18px;overflow:hidden;font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;color:#1a160f">
  <div style="padding:26px 26px 6px">
   <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#a8863a">LuxuryBandit</p>
   <p style="margin:14px 0 0;font-size:15px">${t.hallo}</p>
   <p style="margin:12px 0 0;font-size:17px;font-weight:800">${t.entschuldigung}</p>
   <p style="margin:12px 0 0">${t.gemacht}</p>
  </div>
  ${poster ? `<a href="${link}" style="display:block;margin:20px 26px 0"><img src="${poster}" alt="" width="468" style="display:block;width:100%;max-width:468px;height:auto;border-radius:12px"></a>` : ""}
  <div style="padding:20px 26px 26px">
   <p style="margin:0;font-size:17px;font-weight:800">${t.gratis}</p>
   <p style="margin:8px 0 0">${t.preis}</p>
   <a href="${link}" style="display:block;margin:18px 0 0;background:#f6cf51;color:#1a160f;text-align:center;text-decoration:none;font-weight:800;padding:15px 18px;border-radius:999px">${t.knopf}</a>
   <p style="margin:22px 0 0;font-size:12px;color:#6b6355">${t.fuss}</p>
   <p style="margin:6px 0 0;font-size:12px"><a href="${unsub}" style="color:#6b6355">${t.abmelden}</a></p>
  </div>
 </div>
</div>`;

/**
 * DAS POSTER — ein Standbild aus dem Kuss-Beispielvideo (Owner: „wir müssen einen Video-
 * Poster schicken"). Ein Video selbst zeigt kein Postfach an; ein Standbild schon, und es
 * verlinkt auf die Seite, wo sich das Video bewegt.
 *
 * LANG SIGNIERT: E-Mails werden auch Wochen später geöffnet. Die Standard-Adresse gilt 24
 * Stunden — danach wäre an dieser Stelle ein kaputtes Bild.
 */
async function posterBauen(): Promise<string> {
  try {
    const cfg = await readKissConfig();
    // `teaserPath` ist das Cover des Themas — dasselbe Standbild, das im Themen-Katalog
    // steht. Die `examplePaths` sind VIDEOS; ein Video lässt sich hier nicht in ein Bild
    // verwandeln (kein ffmpeg auf Vercel), deshalb kommen sie nur als letzte Wahl dran und
    // werden dann verworfen. Fehlt beides, geht die Mail ohne Bild raus — besser kein Bild
    // als ein defektes.
    const pfad = cfg.teaserPosterPath || cfg.teaserPath || (cfg.examplePaths ?? [])[0] || "";
    if (!pfad) return "";
    if (/\.(mp4|webm|mov)(\?|$)/i.test(pfad)) return "";
    const src = await getSignedUrl(pfad, 600).catch(() => "");
    if (!src) return "";
    const roh = Buffer.from(await (await fetch(src)).arrayBuffer());
    const klein = await sharp(roh).resize({ width: 936 }).jpeg({ quality: 78 }).toBuffer();
    const up = await createSignedUploadUrl("uploads", "jpg");
    const put = await fetch(up.uploadUrl, {
      method: "PUT", headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: new Uint8Array(klein),
    });
    if (!put.ok) return "";
    return (await getSignedUrl(up.path, 60 * 60 * 24 * 365).catch(() => "")) || "";
  } catch { return ""; }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { test?: string; all?: boolean; lang?: string; nurBestaetigte?: boolean };
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://luxurybandit.com";
  const vorgabe = String(body.lang ?? "en").slice(0, 5);

  const alle = await alleEmpfaenger();
  /**
   * `nurBestaetigte` lässt die unbestätigten Anzeigen-Leads weg (Owner 31.07.2026, nach dem
   * ersten Unzustellbar-Bericht). Sie sind die Gruppe, aus der die Rückläufer kommen, und
   * eine hohe Rücklaufquote beschädigt die Zustellbarkeit der ganzen Domain — bis hin zur
   * Liefermail eines zahlenden Kunden.
   */
  const empfaenger = body.nurBestaetigte ? alle.filter(e => e.bestaetigt) : alle;

  // ZÄHLEN, NICHT SENDEN — der Normalfall ohne `test` und ohne `all`.
  if (!body.test && !body.all) {
    const nachQuelle: Record<string, number> = {};
    for (const e of empfaenger) for (const q of e.quellen) nachQuelle[q] = (nachQuelle[q] ?? 0) + 1;
    return NextResponse.json({
      gesendet: 0,
      empfaenger: empfaenger.length,
      bestaetigt: alle.filter(e => e.bestaetigt).length,
      unbestaetigt: alle.filter(e => !e.bestaetigt).length,
      nachQuelle,
      hinweis: "Nur gezählt. Zum Senden: { test: \"adresse\" } oder { all: true }.",
    });
  }

  const poster = await posterBauen();
  const ziele = body.test
    ? [{ email: String(body.test).trim().toLowerCase(), name: "", lang: vorgabe, quellen: ["test"] }]
    : empfaenger;

  const ergebnisse: { email: string; ok: boolean; error?: string }[] = [];
  for (const e of ziele) {
    const t = TEXTE[(e.lang ?? vorgabe).slice(0, 2)] ?? TEXTE.en;
    // Der Preis kommt aus der Preistabelle — nie von Hand getippt (Dauerregel im Projekt).
    const preis = fillPrices(t.preis);
    const link = `${origin}/themes/kiss?utm_source=rundbrief&utm_campaign=kiss-fix`;
    const unsub = `${origin}/api/mail-abmelden?email=${encodeURIComponent(e.email)}`;
    const r = await sendEmail({
      to: e.email,
      subject: t.betreff,
      html: html({ ...t, preis }, link, unsub, poster),
      listUnsubscribe: unsub,
    }).catch(() => ({ ok: false, error: "send failed" }));
    ergebnisse.push({ email: e.email, ok: !!(r as { ok?: boolean }).ok, error: (r as { error?: string }).error });
    // EIN KLEINER ABSTAND zwischen den Mails. Hostinger drosselt bei Stoßversand, und eine
    // gedrosselte Verbindung kostet uns die Zustellung an alle danach.
    if (!body.test) await new Promise(r2 => setTimeout(r2, 350));
  }

  const gesendet = ergebnisse.filter(r => r.ok).length;
  return NextResponse.json({
    gesendet,
    versucht: ziele.length,
    test: !!body.test,
    posterDabei: !!poster,
    fehler: ergebnisse.filter(r => !r.ok).slice(0, 50),
  });
}
