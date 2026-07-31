import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readEinladungen, writeEinladungen, getSignedUrl, type Einladung } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE HOCHZEITSEINLADUNG — anlegen, öffnen zählen, zurückziehen.
 *
 * Owner 31.07.2026: „ich will dass die Leute das auch als Einladung für die Hochzeit schicken
 * das Video an die Freunde."
 *
 * Warum das mehr ist als ein Teilen-Knopf: Eine Einladung geht an 50 bis 150 Menschen, und
 * jeder sieht ein KI-Video mit Gesichtern, die er KENNT. Das ist die einzige Stelle im Portal,
 * an der ein Kunde uns die nächsten Besucher bringt — deshalb wird jede Öffnung gezählt. Diese
 * Zahl entscheidet, ob daraus ein Kanal wird oder nur ein nettes Extra.
 *
 * SCHUTZ: Die Kennung ist lang und zufällig, nirgends verzeichnet, die Seite steht auf
 * `noindex`. Zurückziehen darf, wer sie angelegt hat (dasselbe Gerät) — oder der Admin.
 */

const sauber = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// POST { videoUrl, sie, er, datum?, ort?, adresse?, telefon?, genId?, device?, email?, lang? } → { id, url }
// POST { revoke: id, device? }                                            → { ok }
// POST { open: id }                                                       → { ok }  (Zähler)
// POST { rsvp: id, name, ja, email }                                      → { ok }  (Zusage)
// POST { setVideo: id, videoUrl, device }                                 → { ok, left } (Tausch)
// POST { chat: id, name, text }                                           → { ok, chat }
// POST { news: id, text, device }                                          → { ok, empfaenger }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
    || new URL(request.url).origin;

  /**
   * ÖFFNUNG ZÄHLEN. Bewusst vom Browser gemeldet und nicht beim Ausliefern der Seite: Ein
   * Vorschaubild in WhatsApp, ein Suchroboter oder ein Vorablader würde sonst als Gast zählen,
   * und die eine Zahl, an der die ganze Idee gemessen wird, wäre wertlos.
   */
  const open = sauber(body.open, 60);
  if (open) {
    try {
      const alle = await readEinladungen();
      const e = alle.find(x => x.id === open);
      if (e) {
        e.opens = (e.opens ?? 0) + 1;
        e.lastOpenAt = new Date().toISOString();
        await writeEinladungen(alle);
      }
    } catch { /* eine verlorene Zählung darf die Einladung nie stören */ }
    return NextResponse.json({ ok: true });
  }

  /**
   * EINE ZUSAGE (Owner 31.07.2026). Angehaengt statt ersetzt, und mit demselben Nachlesen wie
   * beim Anlegen: Bei einer Hochzeit antworten mehrere Gaeste in derselben Minute — ohne das
   * hier loescht die letzte Antwort die vorherige, und die Braut haette eine Liste mit Loechern.
   */
  const rsvp = sauber(body.rsvp, 60);
  if (rsvp) {
    const name = sauber(body.name, 40);
    if (!name) return NextResponse.json({ error: "Name fehlt." }, { status: 400 });
    // Die Adresse des Gastes ist Pflicht: Das Paar muss ihn erreichen können, wenn sich
    // Uhrzeit oder Ort ändern. Wofür sie ist, steht am Eingabefeld — nicht nur in den AGB.
    const gastMail = sauber(body.email, 160).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gastMail)) {
      return NextResponse.json({ error: "E-Mail fehlt." }, { status: 400 });
    }
    const ja = body.ja !== false;
    const eintrag = { name, ja, at: new Date().toISOString(), email: gastMail };
    for (let versuch = 0; versuch < 4; versuch++) {
      const alle = await readEinladungen();
      const e = alle.find(x => x.id === rsvp);
      if (!e || e.revoked) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const vorher = e.zusagen ?? [];
      // Zweimal derselbe Name = Meinung geaendert, kein zweiter Gast.
      e.zusagen = [...vorher.filter(z => z.name.toLowerCase() !== name.toLowerCase()), eintrag];
      await writeEinladungen(alle);
      await new Promise(r => setTimeout(r, 150 + versuch * 200));
      const nach = (await readEinladungen()).find(x => x.id === rsvp);
      if (nach?.zusagen?.some(z => z.name.toLowerCase() === name.toLowerCase() && z.ja === ja)) {
        /**
         * DAS PAAR ERFAEHRT ES SOFORT (Owner 31.07.2026: „die Leute werden per E-Mail
         * benachrichtigt, wenn jemand zusagt").
         *
         * Bewusst NACH dem bestaetigten Schreiben und ohne `await` im Erfolgsweg: Eine
         * klemmende Mail darf die Zusage nie verschlucken — der Gast hat geantwortet, das
         * zaehlt. Die Zahl im Betreff spart den Klick: Sie sieht am Handy, wo sie steht.
         */
        const jaZahl = (nach.zusagen ?? []).filter(z => z.ja).length;
        const neinZahl = (nach.zusagen ?? []).length - jaZahl;
        if (nach.email) {
          void sendEmail({
            to: nach.email,
            subject: ja ? `${name} kommt zu eurer Hochzeit (${jaZahl} Zusagen)`
                        : `${name} kann leider nicht (${jaZahl} Zusagen, ${neinZahl} Absagen)`,
            replyTo: gastMail,
            text: `${name} hat geantwortet: ${ja ? "kommt" : "kann leider nicht"}.\n`
              + `E-Mail: ${gastMail}\n\n`
              + `Stand: ${jaZahl} Zusagen, ${neinZahl} Absagen.\n`
              + `Eure Einladung: ${origin}/einladung/${rsvp}\n`,
            html: `<p><strong>${name}</strong> hat geantwortet: <strong>${ja ? "kommt" : "kann leider nicht"}</strong>.</p>`
              + `<p>E-Mail: <a href="mailto:${gastMail}">${gastMail}</a></p>`
              + `<p>Stand: <strong>${jaZahl}</strong> Zusagen, ${neinZahl} Absagen.</p>`
              + `<p><a href="${origin}/einladung/${rsvp}">Eure Einladung ansehen</a></p>`,
          }).catch(() => {});
        }
        return NextResponse.json({ ok: true });
      }
    }
    return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 503 });
  }

  /**
   * DAS VIDEO TAUSCHEN — bis zu fuenfmal (Owner 31.07.2026: „sie koennen das Video 5 mal
   * aendern. Die Gaeste sehen immer den neuesten Stand").
   *
   * Der Link bleibt derselbe. Das ist der ganze Witz: Sie hat ihn schon an achtzig Leute
   * verschickt — ein zweiter Link waere fuer sie eine Katastrophe. Wer die Einladung nach dem
   * Tausch oeffnet, sieht das neue Video; wer sie vorher offen hatte, beim naechsten Laden.
   *
   * Fuenf, weil jeder Tausch ein bezahlter Render ist — und weil eine Einladung, die staendig
   * ihr Gesicht wechselt, fuer die Gaeste keine Einladung mehr ist.
   */
  /**
   * EINE NACHRICHT IM GRUPPENCHAT. Angehaengt mit Nachlesen, wie ueberall in dieser Datei:
   * In einer Gruppe schreiben mehrere gleichzeitig, und ohne das verschwinden Nachrichten.
   */
  /**
   * EINE NEUIGKEIT — und die Mail an alle Gaeste.
   *
   * Nur das Paar (dasselbe Geraet) oder der Admin. Die Mail traegt den LINK, nicht den ganzen
   * Text: Der Gast soll zurueck auf die Einladung kommen, dort steht der neueste Stand, dort
   * ist die Gruppe. Genau dafuer zahlt das Paat — pardon, das Paar — jeden Monat.
   */
  const news = sauber(body.news, 60);
  if (news) {
    const text = sauber(body.text, 800);
    if (!text) return NextResponse.json({ error: "Text fehlt." }, { status: 400 });
    const alle = await readEinladungen();
    const e = alle.find(x => x.id === news);
    if (!e || e.revoked) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const admin = await isAdminRequest(request).catch(() => false);
    const geraet = sauber(body.device, 80);
    if (!admin && !(geraet && e.device === geraet)) {
      return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    e.news = [{ text, at: new Date().toISOString() }, ...(e.news ?? [])].slice(0, 50);
    await writeEinladungen(alle);

    // An jede Adresse EINZELN, nie in ein gemeinsames An-Feld: Sonst sieht jeder Gast die
    // Adressen aller anderen, und das waere ein Datenleck im Namen unserer Kundin.
    const link = `${origin}/einladung/${news}`;
    const gaeste = [...new Set((e.zusagen ?? []).map(z => z.email).filter(Boolean) as string[])];
    const betreff = `${e.sie} & ${e.er}: Neuigkeiten zur Hochzeit`;
    for (const adresse of gaeste.slice(0, 300)) {
      void sendEmail({
        to: adresse,
        subject: betreff,
        replyTo: e.email || undefined,
        text: `${text}\n\nAlles Weitere und die Gruppe: ${link}\n`,
        html: `<p>${text.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`
          + `<p><a href="${link}">Zur Einladung — dort steht der neueste Stand und die Gruppe</a></p>`,
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, empfaenger: gaeste.length, news: e.news });
  }

  const chat = sauber(body.chat, 60);
  if (chat) {
    const name = sauber(body.name, 40);
    const text = sauber(body.text, 500);
    if (!name || !text) return NextResponse.json({ error: "Name oder Text fehlt." }, { status: 400 });
    const eintrag = { name, text, at: new Date().toISOString() };
    for (let versuch = 0; versuch < 4; versuch++) {
      const alle = await readEinladungen();
      const e = alle.find(x => x.id === chat);
      if (!e || e.revoked) return NextResponse.json({ error: "Not found." }, { status: 404 });
      // Deckel: Ein voller Chat darf die eine Datei nicht sprengen, in der alle Einladungen
      // liegen. Die aeltesten fallen raus — bei einer Hochzeit zaehlt das Neueste.
      e.chat = [...(e.chat ?? []), eintrag].slice(-300);
      await writeEinladungen(alle);
      await new Promise(r => setTimeout(r, 150 + versuch * 200));
      const nach = (await readEinladungen()).find(x => x.id === chat);
      if (nach?.chat?.some(c => c.at === eintrag.at && c.text === text)) {
        return NextResponse.json({ ok: true, chat: nach.chat ?? [] });
      }
    }
    return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 503 });
  }

  const setVideo = sauber(body.setVideo, 60);
  if (setVideo) {
    const neuesVideo = sauber(body.videoUrl, 2000);
    if (!neuesVideo) return NextResponse.json({ error: "Video fehlt." }, { status: 400 });
    const alle = await readEinladungen();
    const e = alle.find(x => x.id === setVideo);
    if (!e || e.revoked) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const admin = await isAdminRequest(request).catch(() => false);
    const geraet = sauber(body.device, 80);
    if (!admin && !(geraet && e.device === geraet)) {
      return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    const schon = e.videoChanges ?? 0;
    if (!admin && schon >= 5) {
      return NextResponse.json({ error: "Limit", left: 0 }, { status: 409 });
    }
    e.videoUrl = neuesVideo;
    e.videoChanges = schon + 1;
    await writeEinladungen(alle);
    return NextResponse.json({ ok: true, left: Math.max(0, 5 - (e.videoChanges ?? 0)) });
  }

  const revoke = sauber(body.revoke, 60);
  if (revoke) {
    const alle = await readEinladungen();
    const e = alle.find(x => x.id === revoke);
    if (!e) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const admin = await isAdminRequest(request).catch(() => false);
    const geraet = sauber(body.device, 80);
    if (!admin && !(geraet && e.device === geraet)) {
      return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    e.revoked = true;
    await writeEinladungen(alle);
    return NextResponse.json({ ok: true });
  }

  const videoUrl = sauber(body.videoUrl, 2000);
  /**
   * DAS BILD KOMMT ALS PFAD, NICHT ALS DATEN-URL.
   *
   * Im Trichter liegt das Gratis-Bild als base64-Zeichenkette von ein bis zwei Megabyte. Die
   * wandert sonst in dieselbe JSON-Datei, in der ALLE Einladungen stehen — nach zwanzig
   * Einladungen waere die Datei unbrauchbar langsam, und jede Zusage muesste sie neu schreiben.
   *
   * Deshalb hier der Speicherpfad, den wir einmal langlebig signieren (zehn Jahre, wie beim
   * Video). Eine Einladung soll auch in einem Jahr noch aufgehen, wenn ein Gast sie hervorholt.
   */
  const bildPfad = sauber(body.bildPfad, 400);
  const bildUrl = bildPfad.startsWith("try-this-look/")
    ? ((await getSignedUrl(bildPfad, 60 * 60 * 24 * 365 * 10).catch(() => "")) || "")
    : sauber(body.bildUrl, 2000);
  const sie = sauber(body.sie, 40);
  const er = sauber(body.er, 40);
  if ((!videoUrl && !bildUrl) || !sie || !er) {
    return NextResponse.json({ error: "Ein Bild oder Video und beide Namen sind nötig." }, { status: 400 });
  }

  // Kennung: lang genug, dass sie niemand rät, kurz genug für eine Nachricht.
  const id = `${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const eintrag: Einladung = {
    id,
    createdAt: new Date().toISOString(),
    genId: sauber(body.genId, 80) || undefined,
    videoUrl: videoUrl || undefined,
    bildUrl: bildUrl || undefined,
    // SIEBEN TAGE, ab dem Anlegen. Lang genug, um sie wirklich zu verschicken und Antworten
    // zu bekommen; kurz genug, dass die Entscheidung nicht auf die lange Bank kommt.
    probeBis: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    sie, er,
    datum: sauber(body.datum, 10) || undefined,
    ort: sauber(body.ort, 120) || undefined,
    adresse: sauber(body.adresse, 160) || undefined,
    // Nur Ziffern, Plus und Leerzeichen — daraus baut die Karte den wa.me-Link.
    telefon: sauber(body.telefon, 32).replace(/[^0-9+ ]/g, "") || undefined,
    lang: sauber(body.lang, 5) || "en",
    email: sauber(body.email, 160).toLowerCase() || undefined,
    device: sauber(body.device, 80) || undefined,
    opens: 0,
  };
  /**
   * SCHREIBEN UND NACHSEHEN, OB ES ANKAM.
   *
   * Die Liste liegt in EINER Datei: Zwei Einladungen in derselben Sekunde lesen beide den
   * alten Stand, beide schreiben — und die zweite loescht die erste. Beim Test am 31.07.2026
   * ist genau das passiert (zwei angelegt, eine ueberlebt). Fuer eine Kundin hiesse das: Link
   * verschickt, Einladung tot.
   *
   * Deshalb wird nach dem Schreiben nachgelesen und im Zweifel noch einmal geschrieben. Kein
   * echtes Sperren — das gibt der Speicher nicht her —, aber es faengt den Fall ab, der
   * realistisch vorkommt: zwei Leute gleichzeitig, nicht zwanzig.
   */
  let drin = false;
  for (let versuch = 0; versuch < 4 && !drin; versuch++) {
    const alle = await readEinladungen();
    if (alle.some(x => x.id === id)) { drin = true; break; }
    await writeEinladungen([eintrag, ...alle]);
    await new Promise(r => setTimeout(r, 200 + versuch * 250));
    drin = (await readEinladungen()).some(x => x.id === id);
  }
  if (!drin) return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 503 });
  return NextResponse.json({ ok: true, id, url: `${origin}/einladung/${id}` });
}

// GET (admin) → alle Einladungen mit ihren Öffnungen; GET ?id= → eine einzelne (öffentlich).
export async function GET(request: Request) {
  const id = sauber(new URL(request.url).searchParams.get("id"), 60);
  const alle = await readEinladungen();
  if (id) {
    const e = alle.find(x => x.id === id);
    if (!e || e.revoked) return NextResponse.json({ error: "Not found." }, { status: 404 });
    // Öffentlich, deshalb NUR was auf der Seite steht — keine Adresse, keine Gerätekennung.
    return NextResponse.json({
      id: e.id, videoUrl: e.videoUrl, bildUrl: e.bildUrl, probeBis: e.probeBis, bezahlt: !!e.bezahlt,
      sie: e.sie, er: e.er,
      datum: e.datum ?? "", ort: e.ort ?? "", adresse: e.adresse ?? "",
      telefon: e.telefon ?? "", lang: e.lang ?? "en",
      // Oeffentlich sind Vornamen und Texte — NIE die Adressen der Gaeste.
      zusagen: (e.zusagen ?? []).map(z => ({ name: z.name, ja: z.ja })),
      chat: e.chat ?? [],
      news: e.news ?? [],
    });
  }
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  return NextResponse.json({ entries: alle });
}
