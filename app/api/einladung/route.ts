import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readEinladungen, writeEinladungen, getSignedUrl, type Einladung } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";
import { getCheckoutSession, stripeConfigured } from "@/lib/stripe";
import { TRIAL_DAYS, LAUFZEIT_TAGE, ONCE_CENTS } from "@/lib/pricing";
import { einloeseToken } from "@/lib/einloese-token";

/**
 * DIE ZWEI GUTSCHEIN-MAILS (Owner 06.08.2026: „es kommt eine bestätigung dass der Gutschein
 * versendet wurde und email geht an beide raus. Käufer und Empfänger."). In der Sprache, in
 * der die Karte gebaut wurde — die beste Vermutung für beide Seiten.
 */
const MAIL_TEXTE: Record<string, {
  empfBetreff: (von: string) => string;
  empfText: (von: string, link: string) => string;
  kaeuferBetreff: string;
  kaeuferText: (empf: string, link: string) => string;
  knopf: string;
}> = {
  de: {
    empfBetreff: v => `🎁 ${v} hat ein Geschenk für dich`,
    empfText: (v, l) => `${v} hat dir eine Gutschein-Karte geschickt.\n\nÖffne sie hier — dein Geschenk wartet hinter dem Knopf:\n${l}\n\nDas Guthaben gehört zu dieser E-Mail-Adresse.`,
    kaeuferBetreff: "Dein Gutschein ist verschickt 🎁",
    kaeuferText: (e, l) => `Deine Gutschein-Karte ist fertig${e ? ` und per E-Mail an ${e} unterwegs` : ""}.\n\nDein Link — du kannst ihn zusätzlich selbst verschicken:\n${l}`,
    knopf: "Zur Karte",
  },
  en: {
    empfBetreff: v => `🎁 ${v} has a present for you`,
    empfText: (v, l) => `${v} sent you a voucher card.\n\nOpen it here — your present is waiting behind the button:\n${l}\n\nThe credit belongs to this email address.`,
    kaeuferBetreff: "Your voucher is on its way 🎁",
    kaeuferText: (e, l) => `Your voucher card is ready${e ? ` and on its way to ${e} by email` : ""}.\n\nYour link — you can also send it yourself:\n${l}`,
    knopf: "Open the card",
  },
  ro: {
    empfBetreff: v => `🎁 ${v} are un cadou pentru tine`,
    empfText: (v, l) => `${v} ți-a trimis un card cu un voucher.\n\nDeschide-l aici — cadoul tău așteaptă în spatele butonului:\n${l}\n\nCreditul aparține acestei adrese de e-mail.`,
    kaeuferBetreff: "Voucherul tău e pe drum 🎁",
    kaeuferText: (e, l) => `Cardul tău cu voucher e gata${e ? ` și pe drum spre ${e} pe e-mail` : ""}.\n\nLinkul tău — îl poți trimite și tu:\n${l}`,
    knopf: "Deschide cardul",
  },
  es: {
    empfBetreff: v => `🎁 ${v} tiene un regalo para ti`,
    empfText: (v, l) => `${v} te ha enviado una tarjeta con un vale.\n\nÁbrela aquí — tu regalo espera detrás del botón:\n${l}\n\nEl saldo pertenece a esta dirección de correo.`,
    kaeuferBetreff: "Tu vale está en camino 🎁",
    kaeuferText: (e, l) => `Tu tarjeta con el vale está lista${e ? ` y en camino a ${e} por correo` : ""}.\n\nTu enlace — también puedes enviarlo tú:\n${l}`,
    knopf: "Abrir la tarjeta",
  },
  fr: {
    empfBetreff: v => `🎁 ${v} a un cadeau pour toi`,
    empfText: (v, l) => `${v} t'a envoyé une carte avec un bon cadeau.\n\nOuvre-la ici — ton cadeau t'attend derrière le bouton :\n${l}\n\nLe crédit appartient à cette adresse e-mail.`,
    kaeuferBetreff: "Ton bon cadeau est en route 🎁",
    kaeuferText: (e, l) => `Ta carte est prête${e ? ` et en route vers ${e} par e-mail` : ""}.\n\nTon lien — tu peux aussi l'envoyer toi-même :\n${l}`,
    knopf: "Ouvrir la carte",
  },
  pt: {
    empfBetreff: v => `🎁 ${v} tem um presente para ti`,
    empfText: (v, l) => `${v} enviou-te um cartão com um vale.\n\nAbre-o aqui — o teu presente espera atrás do botão:\n${l}\n\nO saldo pertence a este endereço de e-mail.`,
    kaeuferBetreff: "O teu vale vai a caminho 🎁",
    kaeuferText: (e, l) => `O teu cartão com o vale está pronto${e ? ` e a caminho de ${e} por e-mail` : ""}.\n\nO teu link — também o podes enviar tu:\n${l}`,
    knopf: "Abrir o cartão",
  },
  it: {
    empfBetreff: v => `🎁 ${v} ha un regalo per te`,
    empfText: (v, l) => `${v} ti ha mandato una card con un buono.\n\nAprila qui — il tuo regalo ti aspetta dietro il pulsante:\n${l}\n\nIl credito appartiene a questo indirizzo e-mail.`,
    kaeuferBetreff: "Il tuo buono è in viaggio 🎁",
    kaeuferText: (e, l) => `La tua card con il buono è pronta${e ? ` e in viaggio verso ${e} via e-mail` : ""}.\n\nIl tuo link — puoi anche inviarlo tu:\n${l}`,
    knopf: "Apri la card",
  },
};

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
// POST { chatLoeschen: id, at, name, text, device }                       → { ok, chat }
// POST { news: id, text, device }                                          → { ok, empfaenger }
// POST { pruefen: id, device }                                            → { darf }
// POST { edit: id, device, sie, er, datum, ort, adresse, telefon }        → { ok }
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
    // Nur bei einer Zusage relevant (Owner 02.08.2026: „vegetarisch, vegan oder normal") —
    // wer absagt, bekommt kein Menü, egal was mitgeschickt wurde.
    const menuRoh = sauber(body.menu, 20);
    const menu: "normal" | "vegetarisch" | "vegan" | undefined =
      ja && (menuRoh === "vegetarisch" || menuRoh === "vegan" || menuRoh === "normal") ? menuRoh : undefined;
    // Gästezahl hinter dieser EINEN Zusage (Owner 02.08.2026: „die Gästezahl muss noch klar
    // stehen") — geklemmt auf 1–10, nur bei einer Zusage gespeichert, wer absagt zählt nicht mit.
    const personen = Math.max(1, Math.min(10, Math.round(Number(body.personen) || 1)));
    const eintrag = { name, ja, at: new Date().toISOString(), email: gastMail, menu, personen: ja ? personen : undefined };
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
  /**
   * DARF ICH BEARBEITEN? Der Browser fragt mit seiner Geraetekennung nach, statt dass wir die
   * Kennung des Paares oeffentlich ausliefern — sonst koennte sie jeder abschreiben und sich
   * damit als Brautpaar ausgeben.
   */
  const pruefen = sauber(body.pruefen, 60);
  if (pruefen) {
    const alle = await readEinladungen();
    const e = alle.find(x => x.id === pruefen);
    if (!e) return NextResponse.json({ darf: false });
    const admin = await isAdminRequest(request).catch(() => false);
    const geraet = sauber(body.device, 80);
    return NextResponse.json({ darf: admin || (!!geraet && e.device === geraet) });
  }

  /**
   * ÄNDERN (Owner 31.07.2026: „sie werden das editieren können, also muss ein Edit-Button
   * stehen").
   *
   * Der Link bleibt derselbe — das ist der ganze Punkt. Eine Hochzeit verschiebt sich, der
   * Saal wechselt, die Uhrzeit auch; wer dafuer einen zweiten Link braucht, muss ihn an
   * achtzig Leute nachschicken und weiss nie, wer noch den alten hat.
   */
  const edit = sauber(body.edit, 60);
  if (edit) {
    const alle = await readEinladungen();
    const e = alle.find(x => x.id === edit);
    if (!e || e.revoked) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const admin = await isAdminRequest(request).catch(() => false);
    const geraet = sauber(body.device, 80);
    if (!admin && !(geraet && e.device === geraet)) {
      return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    const sieNeu = sauber(body.sie, 40), erNeu = sauber(body.er, 40);
    if (sieNeu) e.sie = sieNeu;
    if (erNeu) e.er = erNeu;
    // Leere Felder loeschen den Wert ausdruecklich — sonst wird man einen Tippfehler nie los.
    e.datum = sauber(body.datum, 10) || undefined;
    e.ort = sauber(body.ort, 120) || undefined;
    e.adresse = sauber(body.adresse, 160) || undefined;
    e.telefon = sauber(body.telefon, 32).replace(/[^0-9+ ]/g, "") || undefined;
    await writeEinladungen(alle);
    return NextResponse.json({ ok: true });
  }

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

  /**
   * CHAT-NACHRICHT LÖSCHEN (Ä12, Owner 02.08.2026, nach Beratung ueber Chat-Zugriff): Der
   * Gruppenchat bleibt bewusst offen fuer jeden mit dem Link — kein Passwort, keine
   * Zusage-Pflicht. Das Sicherheitsventil ist stattdessen ein Radiergummi: Nur das
   * Brautpaar (dasselbe Geraet wie beim Anlegen, oder der Admin) kann eine einzelne
   * unpassende Nachricht entfernen. Gaeste sehen den Loeschknopf nie (siehe GruppenChat.tsx).
   *
   * DIESELBE Wiederauferstehungs-Gefahr wie beim Schreiben: Ein gleichzeitig schreibender
   * Gast koennte eine gerade geloeschte Nachricht sonst per Lesen-Aendern-Schreiben auf der
   * gemeinsamen Datei wiederbeleben. Darum dieselbe Pruef-Schleife wie beim Senden oben.
   */
  const chatLoeschen = sauber(body.chatLoeschen, 60);
  if (chatLoeschen) {
    const at = sauber(body.at, 40);
    const name = sauber(body.name, 40);
    const text = sauber(body.text, 500);
    if (!at || !text) return NextResponse.json({ error: "Nachricht fehlt." }, { status: 400 });
    const admin = await isAdminRequest(request).catch(() => false);
    const geraet = sauber(body.device, 80);
    for (let versuch = 0; versuch < 4; versuch++) {
      const alle = await readEinladungen();
      const e = alle.find(x => x.id === chatLoeschen);
      if (!e || e.revoked) return NextResponse.json({ error: "Not found." }, { status: 404 });
      if (!admin && !(geraet && e.device === geraet)) {
        return NextResponse.json({ error: "Not yours." }, { status: 403 });
      }
      const vorher = e.chat?.length ?? 0;
      e.chat = (e.chat ?? []).filter(c => !(c.at === at && c.text === text && c.name === name));
      if (e.chat.length === vorher) return NextResponse.json({ ok: true, chat: e.chat }); // schon weg
      await writeEinladungen(alle);
      await new Promise(r => setTimeout(r, 150 + versuch * 200));
      const nach = (await readEinladungen()).find(x => x.id === chatLoeschen);
      if (!nach?.chat?.some(c => c.at === at && c.text === text && c.name === name)) {
        return NextResponse.json({ ok: true, chat: nach?.chat ?? [] });
      }
    }
    return NextResponse.json({ error: "Konnte nicht gelöscht werden." }, { status: 503 });
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
  /* Das Thema entscheidet die Pflichten, also steht es VOR der Prüfung. Weisse Liste wie
     unten beim Eintrag: Unbekanntes wird zur Hochzeit, dem Urzustand dieser Karte. */
  const themaWahl = sauber(body.thema, 20) === "holiday" ? "holiday" as const
    : sauber(body.thema, 20) === "gutschein" ? "gutschein" as const : undefined;
  const gutschein = themaWahl === "gutschein";
  /**
   * BEIM GUTSCHEIN GIBT ES KEIN „ER" (Owner 05.08.2026): Einer schenkt einem, und wer der
   * Empfänger ist, steht in der Botschaft — nicht in einem Namensfeld. Verlangt wird nur der
   * Absendername, sonst öffnet jemand ein Geschenk und weiss nicht, von wem es kommt.
   */
  if ((!videoUrl && !bildUrl) || !sie || (!er && !gutschein)) {
    return NextResponse.json({ error: "Ein Bild oder Video und beide Namen sind nötig." }, { status: 400 });
  }
  /**
   * DIE GUTSCHEIN-KARTE IST GRATIS (Owner 06.08.2026: „er muss nur den kredit oder das
   * produkt bezahlen, dass ers verschenken möchte. … Die Gutscheingenerierung kostet
   * nichts."). Hier stand für einen Tag eine 402-Sperre auf dem bezahlten 9,99-Auftrag —
   * sie ist mit dem Preis gefallen: Die Karte ist Text plus unser fertiges Bella-Video und
   * kostet uns nichts; bezahlt wird nur das GESCHENK darin, und das prüft sein eigener
   * Kaufweg (das Stripe-Etikett unten). Der Gratis-Trichter ist Absicht — genau der eine,
   * den das Konzept offen lassen wollte (§3b, „der Gratis-Schritt").
   */

  /**
   * DER BEIGELEGTE TOPIC-GUTSCHEIN (Owner 06.08.2026: „jeder Topic als Gutschein einfügen").
   *
   * Der Browser liefert nur die SITZUNGSNUMMER seines Gutschein-Kaufs; was darin steckt
   * (Betrag, Thema, Empfänger), wird von Stripe zurückgelesen — Skill `bezahlung` §3. Ein
   * Client, der Betrag oder Thema selbst behaupten dürfte, würde sich ein 60-€-Etikett auf
   * eine unbezahlte Karte schreiben. Gutgeschrieben hat das Guthaben längst
   * `/api/checkout-status` (idempotent je Sitzung) — hier wird nur das ETIKETT für die Karte
   * geholt. Und es ist eine Nebensache: Scheitert das Lesen, geht die Karte trotzdem raus,
   * nur ohne Etikett — das Guthaben selbst liegt sicher beim Beschenkten.
   *
   * DIE TESTKLAPPE trägt dieselben drei Schlösser wie in `/api/checkout-status`: lokale
   * Umgebungsvariable, nie in Produktion, Sitzungsnummer muss mit `TEST-` beginnen (eine
   * echte beginnt mit `cs_`). Sie liefert ein festes 15-€-Kuss-Etikett — geprüft wird der
   * WEG, nicht die Buchhaltung.
   */
  const lbSession = gutschein ? sauber(body.lbGutscheinSession, 200) : "";
  let lbGutschein: Pick<Einladung, "lbGutscheinCents" | "lbGutscheinTopic" | "lbGutscheinEmpfaenger"> = {};
  if (lbSession) {
    const testKlappeOffen = !!process.env.LB_TEST_CHECKOUT
      && process.env.NODE_ENV !== "production"
      && lbSession.startsWith("TEST-");
    try {
      if (testKlappeOffen) {
        console.warn("[einladung] TESTKLAPPE — vorgetaeuschter Gutschein, nur lokal:", lbSession);
        lbGutschein = { lbGutscheinCents: ONCE_CENTS, lbGutscheinTopic: "kiss", lbGutscheinEmpfaenger: "test@example.com" };
      } else if (stripeConfigured()) {
        const s = await getCheckoutSession(lbSession);
        const bezahltOk = s.paymentStatus === "paid" || s.paymentStatus === "no_payment_required";
        if (bezahltOk && s.metadata.kind === "gutschein") {
          lbGutschein = {
            lbGutscheinCents: (typeof s.amountTotal === "number" ? s.amountTotal : Number(s.metadata.cents ?? 0)) || undefined,
            lbGutscheinTopic: String(s.metadata.topic ?? "") || undefined,
            lbGutscheinEmpfaenger: String(s.metadata.empfaenger ?? "").trim().toLowerCase() || undefined,
          };
        }
      }
    } catch { /* Etikett ist Best-effort — die Karte blockiert das nie */ }
  }

  // Kennung: lang genug, dass sie niemand rät, kurz genug für eine Nachricht.
  const id = `${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const eintrag: Einladung = {
    id,
    createdAt: new Date().toISOString(),
    genId: sauber(body.genId, 80) || undefined,
    videoUrl: videoUrl || undefined,
    bildUrl: bildUrl || undefined,
    /**
     * EIN MONAT, ab dem Anlegen (Owner 01.08.2026: „sie können es für 1,49 behalten, aber ab
     * dem zweiten Monat müssen sie Abo bezahlen für 24 im Monat, wenn sie die Karte behalten
     * wollen"). Vorher standen hier sieben Tage Probe.
     *
     * Der Unterschied ist nicht die Zahl, sondern die Geschichte: Sieben Tage sind eine
     * Probe, die man beweisen muss. Ein Monat ist das GEKAUFTE — für 1,49 gehört ihr die
     * Einladung, sie verschickt sie, sammelt Zusagen, führt die Gruppe. Erst wenn die
     * Hochzeit länger her ist als ein Monat, wird aus dem Kauf ein Abo: 24,50 im Monat, wenn
     * die Karte samt Gästegruppe weiterleben soll.
     *
     * Für die meisten Hochzeiten reicht der Monat vor dem Fest — genau deshalb ist die
     * Verlängerung ein echtes Angebot und keine Falle: Wer die Erinnerung behalten will,
     * zahlt weiter; wer nicht, hat trotzdem bekommen, wofür er bezahlt hat.
     *
     * Update 02.08.2026 (Owner): zurück auf 7 Tage — „nach 7 Tagen mit Abo laufen, nicht
     * nächsten Monat". Die Zahl kommt aus TRIAL_DAYS in lib/pricing.ts, damit Seite,
     * Preiszeile und diese Frist nie wieder auseinanderlaufen.
     */
    /* Beim Gutschein sind es die 30 Tage jeder GEKAUFTEN Seite (LAUFZEIT_TAGE, Owner:
       „alle haben ein Verfallsdatum. 30 Tage") — er ist bezahlt, keine Probewoche. */
    probeBis: new Date(Date.now() + (gutschein ? LAUFZEIT_TAGE : TRIAL_DAYS) * 24 * 60 * 60 * 1000).toISOString(),
    sie, er,
    datum: sauber(body.datum, 10) || undefined,
    ort: sauber(body.ort, 120) || undefined,
    adresse: sauber(body.adresse, 160) || undefined,
    // Nur Ziffern, Plus und Leerzeichen — daraus baut die Karte den wa.me-Link.
    telefon: sauber(body.telefon, 32).replace(/[^0-9+ ]/g, "") || undefined,
    lang: sauber(body.lang, 5) || "en",
    /**
     * WELCHER ANLASS (Owner 04.08.2026: die Urlaubs-Einladung). Steuert, was der Eingeladene
     * zu sehen bekommt — bei „holiday" nur Ja/Nein, kein Menü, keine Gästezahl, kein
     * Gruppenchat: Eine Urlaubs-Einladung geht an EINEN Menschen, da gibt es nichts zu
     * verwalten.
     *
     * Fehlt das Feld, ist es eine Hochzeit. Das ist wichtig: Alle Einladungen, die vor
     * diesem Tag angelegt wurden, tragen es nicht — sie müssen weiter genau so aussehen wie
     * bisher, sonst verlieren bereits verschickte Links über Nacht ihre Gästeliste.
     */
    /* Weisse Liste statt Durchreichen: Nur Themen, die die Anzeige auch kennt. Ein unbekannter
       Wert wird zu `undefined` und damit zur Hochzeit — dem Urzustand dieser Karte. */
    thema: themaWahl,
    /* Fremde Gutscheine (Link-Feld) sind seit 06.08.2026 abgeschafft — es liegt nur noch
       UNSER Geschenk in der Karte, verifiziert über die Stripe-Sitzung oben. */
    ...lbGutschein,
    bisDatum: sauber(body.bisDatum, 10) || undefined,
    /* 300 Zeichen wie im Formular — der Deckel gilt auch hier, weil der Browser luegen kann. */
    botschaft: sauber(body.botschaft, 300) || undefined,
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

  /**
   * DIE ZWEI MAILS — Käufer UND Empfänger (Owner 06.08.2026). Best-effort wie jede Mail in
   * dieser Datei: Die Karte scheitert nie an SMTP.
   *
   * DER EMPFÄNGER-LINK IST UNTERSCHRIEBEN (`?e=…&t=…`): Die Karte hinterlegt seine Adresse
   * dann als Geräte-Login — Klick in der Mail heisst angemeldet, Guthaben sichtbar, und
   * „Jetzt einlösen" landet auf der Themenseite des Geschenks mit geladenem Konto. Der
   * NACKTE Karten-Link (weitergeleitet, im Chat) meldet niemanden an — sonst würde jeder
   * Mitleser zum Kontoinhaber. Begründung ausführlich in lib/einloese-token.
   */
  if (gutschein) {
    const M = MAIL_TEXTE[String(eintrag.lang ?? "en")] ?? MAIL_TEXTE.en;
    const kartenLink = `${origin}/einladung/${id}`;
    const empf = String(lbGutschein.lbGutscheinEmpfaenger ?? "");
    const alsHtml = (text: string, link: string) =>
      `<p>${text.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`
      + `<p><a href="${link}">${M.knopf} 🎁</a></p>`;
    if (empf) {
      const einloeseLink = `${kartenLink}?e=${encodeURIComponent(empf)}&t=${einloeseToken(id, empf)}`;
      void sendEmail({
        to: empf,
        subject: M.empfBetreff(sie),
        replyTo: eintrag.email || undefined,
        text: M.empfText(sie, einloeseLink),
        html: alsHtml(M.empfText(sie, einloeseLink), einloeseLink),
      }).catch(() => {});
    }
    if (eintrag.email) {
      void sendEmail({
        to: eintrag.email,
        subject: M.kaeuferBetreff,
        text: M.kaeuferText(empf, kartenLink),
        html: alsHtml(M.kaeuferText(empf, kartenLink), kartenLink),
      }).catch(() => {});
    }
  }
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
      zusagen: (e.zusagen ?? []).map(z => ({ name: z.name, ja: z.ja, menu: z.menu })),
      chat: e.chat ?? [],
      news: e.news ?? [],
    });
  }
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  return NextResponse.json({ entries: alle });
}
