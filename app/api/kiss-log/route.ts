import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { readKissLog, writeKissLog, getSignedUrl, deleteTryThisLookImage, createSignedUploadUrl, readTryThisLookState, readWetterSubscribers, type KissLogEntry } from "@/lib/try-this-look-store";
import { GNADENFRIST_MS } from "@/lib/kiss-delivery";
import { pruefeAlter } from "@/lib/minderjaehrig-pruefen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * NACKTHEIT WIRD AM EINGANG ABGEWIESEN (Owner 03.08.2026: „wenn Leute nackte Frauen
 * hochladen muss die Meldung kommen, dieses Bild kann nicht akzeptiert werden. Ich will aber
 * als Admin den Verlauf sehen beim Uploadbilder").
 *
 * WARUM JETZT UND NICHT MEHR SPAETER: Bis heute fiel Nacktheit erst bei der Erzeugung auf —
 * OpenAI wies das Bild ab, und der Trichter sagte „gratis nicht verwendbar". Seit der Kuss
 * ohne Gratis-Bild direkt an die Kasse geht, gaebe es diesen Moment nicht mehr: Der Besucher
 * wuerde ZAHLEN und erst danach erfahren, dass sein Foto nie durchkommt. Die Absage gehoert
 * an den Upload, nicht hinter die Kasse.
 *
 * DIE ZWEI FAELLE SIND NICHT DASSELBE — daher zwei verschiedene Antworten:
 *
 *   Erwachsen + nackt → abweisen, ABER ABLEGEN. Der Owner will den Verlauf sehen; ohne
 *                       Ablage stuende in seiner Galerie eine leere Zeile und er wuesste
 *                       nicht, was jemand versucht hat. Der Eintrag traegt `altersWarnung`,
 *                       damit das Warnzeichen in der Galerie steht.
 *   Kind + nackt      → abweisen und NICHTS ablegen. Das ist die eine Regel ohne Ausnahme
 *                       (siehe lib/minderjaehrig-pruefen.ts): Dieses Material darf unseren
 *                       Speicher nicht beruehren — auch nicht, um es dem Owner zu zeigen.
 *
 * NICHT WIEDER EINGEHAENGT wird die ALTERSSPERRE fuer bekleidete Bilder: Die hat der Owner
 * am 01.08.2026 ausdruecklich entfernt („mach die Alterskontrolle raus"). Hier wirkt allein
 * die Nacktheit — ein `minderjaehrig`-Urteil ohne Nacktheit laesst dieses Tor durch.
 */
type NacktUrteil = { abweisen: boolean; ablegen: boolean; warnung?: string; alter?: number };

async function nacktheitsTor(bilder: string[]): Promise<NacktUrteil> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const echte = bilder.filter(b => String(b ?? "").startsWith("data:"));
  // Ohne Schluessel oder ohne Bild gibt es nichts zu pruefen — dann wie bisher durchlassen.
  if (!key || !echte.length) return { abweisen: false, ablegen: true };
  const urteile = await Promise.all(echte.map(b => pruefeAlter(b, key).catch(() => null)));

  // Kind + nackt zuerst: dieser Fall darf nicht in den Speicher, egal was sonst noch gilt.
  if (urteile.some(u => u && !u.ok && u.grund === "kind-nackt")) {
    console.error(`[upload-tor] KIND + NACKTHEIT — abgewiesen, nichts abgelegt | ${new Date().toISOString()}`);
    return { abweisen: true, ablegen: false, warnung: "kind-nackt" };
  }
  /**
   * Die Bibliothek antwortet je nach `MINOR_CHECK_MODE` unterschiedlich: im Beobachten-Modus
   * (der Vorgabe) kommt Nacktheit als `ok: true` mit `warnung`, scharf gestellt als
   * `ok: false` mit `grund`. Fuer dieses Tor zaehlt BEIDES als Nacktheit — der Owner hat sie
   * heute abgewiesen haben wollen, unabhaengig davon, wie die Umgebung eingestellt ist.
   */
  const nackt = urteile.some(u => !!u && ((u.ok && u.warnung === "nacktheit") || (!u.ok && u.grund === "nacktheit")));
  if (nackt) {
    const alter = urteile.map(u => (u && u.ok ? u.alter : u && !u.ok ? u.alter ?? 0 : 0)).find(n => !!n) ?? 0;
    console.warn(`[upload-tor] Nacktheit erkannt — abgewiesen, aber abgelegt (alter≈${alter})`);
    return { abweisen: true, ablegen: true, warnung: "nacktheit", alter };
  }
  return { abweisen: false, ablegen: true };
}

/** Die Absage, die der Besucher liest — in seiner Sprache, kurz und ohne Vorwurf. */
const ABGELEHNT: Record<string, string> = {
  en: "This image cannot be accepted. Please upload a photo with clothes on.",
  de: "Dieses Bild kann nicht akzeptiert werden. Bitte lade ein Foto mit Kleidung hoch.",
  ro: "Această imagine nu poate fi acceptată. Te rugăm să încarci o poză în care ești îmbrăcat.",
  es: "Esta imagen no se puede aceptar. Sube una foto con ropa, por favor.",
  fr: "Cette image ne peut pas être acceptée. Merci d'envoyer une photo habillé.",
  pt: "Esta imagem não pode ser aceite. Por favor carrega uma foto com roupa.",
  it: "Questa immagine non può essere accettata. Carica una foto vestito, per favore.",
};
const abgelehntText = (lang?: string) => ABGELEHNT[String(lang ?? "en").slice(0, 2)] ?? ABGELEHNT.en;

// Kiss-Log: der Funnel meldet jede FERTIGE Generierung (POST, öffentlich — der Funnel läuft
// auch anonym); das Admin-Tool auf /themes/kiss listet sie (GET, admin-only).
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  // NUR DAS EIGENE THEMA (Owner 31.07.2026). Ohne Angabe kommt alles — damit bleibt eine
  // Gesamtübersicht möglich, ohne dass eine Themenseite die fremden Besucher mitzeigt.
  const nurThema = String(new URL(request.url).searchParams.get("theme") ?? "").trim();
  const alle = await readKissLog();
  const entries = nurThema ? alle.filter(e => (e.theme || "kiss") === nurThema) : alle;
  // Signierte Adressen dazu, damit das Werkzeug die Bilder direkt anzeigen kann.
  /**
   * KATALOG-FRAUEN HABEN KEIN GESPEICHERTES FOTO (Owner 30.07.2026: „wieso sehe ich sein
   * Upload nicht bei SIE"). Gespeichert wird nur, was der Besucher selbst hochlädt — bei
   * einer unserer Frauen wäre das eine sinnlose Kopie. Fürs Werkzeug lösen wir das Foto
   * deshalb beim Anzeigen über die Model-Kennung auf; dann ist die Spalte immer gefüllt.
   */
  const katalog = new Map<string, string>();
  try {
    const st = await readTryThisLookState();
    for (const c of (st.curators ?? []) as { id?: string; photoPath?: string; photoUrl?: string }[]) {
      if (c?.id && (c.photoPath || c.photoUrl)) katalog.set(String(c.id), String(c.photoPath || c.photoUrl));
    }
  } catch { /* ohne Katalog bleibt die Spalte eben leer */ }

  /**
   * STEHT ER SCHON IN EINER LISTE? (Owner 30.07.2026: „du sollst noch vergleichen ob das ein
   * Typ aus der Member-Liste ist, egal ob Wetter oder Kiss, alle.")
   *
   * Geprüft wird über die E-Mail und — für die ohne Adresse — über die Gerätekennung, die
   * beim Eintragen in der Notiz landet. So sieht er auf einen Blick, ob da ein Bekannter
   * wiederkommt oder ein Neuer anklopft.
   */
  const listen: { name: string; mails: Set<string>; geraete: Set<string> }[] = [];
  for (const [modelId, name] of [["", "Wetter"], ["kiss", "Kissing"]] as const) {
    try {
      const subs = await readWetterSubscribers(modelId || undefined);
      listen.push({
        name,
        mails: new Set(subs.map(x => String(x.email ?? "").trim().toLowerCase()).filter(Boolean)),
        geraete: new Set(subs.map(x => (String(x.note ?? "").match(/·\s*([A-Za-z0-9-]{8,})\s*$/) || [])[1] ?? "").filter(Boolean)),
      });
    } catch { /* eine fehlende Liste darf die Anzeige nicht kippen */ }
  }
  const bekanntAus = (e: KissLogEntry) => {
    const mail = String(e.email ?? "").trim().toLowerCase();
    const ger = String(e.device ?? "").trim();
    return listen.filter(l => (mail && l.mails.has(mail)) || (ger && l.geraete.has(ger))).map(l => l.name);
  };

  const mitBildern = await Promise.all(entries.map(async e => ({
    ...e,
    imageUrl: e.imagePath ? await getSignedUrl(e.imagePath).catch(() => "") : "",
    personUrl: e.personPath ? await getSignedUrl(e.personPath).catch(() => "") : "",
    listen: bekanntAus(e),
    modelUrl: e.modelPath
      ? await getSignedUrl(e.modelPath).catch(() => "")
      : await (async () => {
          const p = e.modelId ? katalog.get(String(e.modelId)) : "";
          if (!p) return "";
          return p.startsWith("http") ? p : await getSignedUrl(p).catch(() => "");
        })(),
  })));
  return NextResponse.json({ entries: mitBildern });
}

/**
 * DAS FOTO WIRD BEIM HOCHLADEN GESPEICHERT, nicht erst beim Ergebnis (Owner 30.07.2026:
 * „das Bild muss gespeichert werden in dem Moment wo er das hochlädt").
 *
 * Sonst sieht man nichts von denen, bei denen die Erzeugung scheitert oder die vorher
 * abspringen — und genau die sind interessant: sie zeigen, was die Leute WOLLTEN.
 */
async function ablegen(dataUrl: string): Promise<string> {
  try {
    const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl).trim());
    if (!m) return "";
    const up = await createSignedUploadUrl("uploads", (m[1].split("/")[1] ?? "jpg").replace(/[^a-z0-9]/gi, ""));
    const put = await fetch(up.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": m[1], "x-upsert": "true" },
      body: new Uint8Array(Buffer.from(m[2], "base64")),
    });
    return put.ok ? up.path : "";
  } catch { return ""; }   // Ablage ist Zugabe — der Trichter läuft weiter
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { theme?: string; modelId?: string; modelName?: string; videoUrl?: string; videoId?: string; remove?: string; update?: string; email?: string; device?: string; imagePath?: string; personPath?: string; personImage?: string; modelImage?: string; modelPath?: string; lang?: string };

  /**
   * LÖSCHEN — Admin ODER der Besitzer (Owner 30.07.2026: „kann er sie auch löschen?").
   *
   * Besitzer heisst: dasselbe Gerät wie beim Hochladen, oder ein angemeldetes Konto mit
   * derselben E-Mail. Ohne diese Prüfung könnte jeder fremde Bilder löschen, indem er eine
   * Kennung rät.
   */
  if (body.remove) {
    const admin = await isAdminRequest(request).catch(() => false);
    if (!admin) {
      const alleJetzt = await readKissLog();
      const ziel = alleJetzt.find(e => e.id === body.remove);
      const geraet = String(body.device ?? "").trim();
      const konto = await getSellerFromRequest(request).catch(() => null);
      const mail = String(konto?.email ?? "").trim().toLowerCase();
      const darf = !!ziel && (
        (!!geraet && ziel.device === geraet) ||
        (!!mail && String(ziel.email ?? "").toLowerCase() === mail)
      );
      if (!darf) return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    const alle = await readKissLog();
    const weg = alle.find(e => e.id === body.remove);
    const entries = alle.filter(e => e.id !== body.remove);
    await writeKissLog(entries);
    // MIT den Dateien löschen (Owner 30.07.2026: „ich lösche die auch"). Bliebe nur die
    // Zeile weg, lägen die Fotos weiter im Speicher — er hätte gelöscht und es wäre nichts
    // gelöscht.
    for (const pfad of [weg?.imagePath, weg?.personPath, weg?.modelPath]) {
      if (pfad) await deleteTryThisLookImage(pfad).catch(() => {});
    }
    return NextResponse.json({ ok: true, entries });
  }

  /**
   * FREIGEBEN FUERS TEILEN (Owner 01.08.2026: „in dem Moment wo er shart muss er wissen dass
   * es public wird"). Der Teilen-Dialog im Trichter ruft das hier, NACHDEM der Besitzer die
   * Frage bestaetigt hat. Erst dieser Stempel macht die Werk-Seite /w/[id] sichtbar — und
   * zwar nur das ERGEBNIS, nie die hochgeladenen Vorlagen. Besitzer heisst wie beim Loeschen:
   * dasselbe Geraet oder das angemeldete Konto.
   */
  if ((body as { share?: string }).share) {
    const zielId = String((body as { share?: string }).share);
    const alle = await readKissLog();
    const ziel = alle.find(e => e.id === zielId);
    if (!ziel) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const admin = await isAdminRequest(request).catch(() => false);
    if (!admin) {
      const geraet = String(body.device ?? "").trim();
      const konto = await getSellerFromRequest(request).catch(() => null);
      const mail = String(konto?.email ?? "").trim().toLowerCase();
      const darf = (!!geraet && ziel.device === geraet) || (!!mail && String(ziel.email ?? "").toLowerCase() === mail);
      if (!darf) return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    if (!ziel.sharedAt) { ziel.sharedAt = new Date().toISOString(); await writeKissLog(alle); }
    return NextResponse.json({ ok: true });
  }

  // Update: nach der Zahlung liefert der Funnel die ECHTE Video-URL nach (Fake-Flow:
  // Eintrag entsteht beim Teaser ohne URL, das echte Video rendert erst nach dem Kauf).
  if (body.update) {
    const videoUrl = String(body.videoUrl ?? "").trim();
    const imagePath = String(body.imagePath ?? "").trim();
    const modelBild = String(body.modelImage ?? "");
    const personBild = String(body.personImage ?? "");
    // DIE AUFTRAGSNUMMER DES LAUFENDEN VIDEOS (Owner 30.07.2026: „Server liefert das bezahlte
    // Video"). Der Browser meldet sie, sobald er den Auftrag gestartet hat — damit der Server
    // denselben Auftrag zu Ende bringt, statt einen zweiten zu bezahlen.
    const videoId = String(body.videoId ?? "").trim().slice(0, 80);
    const modelName = String(body.modelName ?? "").trim().slice(0, 60);
    const modelId = String(body.modelId ?? "").trim().slice(0, 80);
    // Die Alterspruefung stand hier vom 31.07. bis 01.08.2026 — entfernt auf Anweisung
    // (Owner: „mach die Alterskontrolle raus. OpenAI blockiert eh schon zu viel").
    if (!videoUrl && !imagePath && !modelBild && !personBild && !videoId && !modelName) {
      return NextResponse.json({ error: "nothing to update." }, { status: 400 });
    }
    /**
     * DAS TOR GILT AUCH FUERS ZWEITE FOTO (Owner 03.08.2026). Der zweite Upload laeuft ueber
     * `update` an denselben Eintrag — ohne diese Pruefung waere genau er das Schlupfloch:
     * erst ein harmloses Bild, dann das andere.
     */
    const torU = await nacktheitsTor([personBild, modelBild]);
    if (torU.abweisen && !torU.ablegen) {
      return NextResponse.json({ error: abgelehntText(body.lang), bildAbgelehnt: true, altersSperre: true }, { status: 400 });
    }
    const entries = await readKissLog();
    const e = entries.find(x => x.id === body.update);
    if (e) {
      if (videoUrl) {
        e.videoUrl = videoUrl;
        // Der Browser hat DIESEN Auftrag zu Ende gebracht — der Server muss ihn nicht noch
        // einmal abholen und keine Mail schicken. Ohne die Marke bekäme der Kunde sein Video
        // zweimal: einmal auf dem Schirm, einmal per Post.
        if (e.videoId) e.videoDoneId = e.videoId;
      }
      if (videoId) {
        e.videoId = videoId;
        /**
         * EIN NEUER AUFTRAG BRAUCHT WIEDER EIN NETZ (Owner 30.07.2026: „funktioniert das ganze
         * mit abo genauso?"). Ein Abonnent macht mehrere Videos hintereinander im selben
         * Eintrag — jedes einzelne muss der Server zu Ende bringen können, nicht nur das
         * erste. Die Frist beginnt neu, die Fehlversuche werden zurückgesetzt.
         */
        if (e.paid && videoId !== e.videoDoneId) {
          e.videoDueAt = new Date(Date.now() + GNADENFRIST_MS).toISOString();
          e.videoTries = 0;
          e.videoError = undefined;
        }
      }
      if (imagePath.startsWith("try-this-look/")) e.imagePath = imagePath;
      // WEN ER GEWÄHLT HAT, steht am selben Eintrag — auch wenn er es später ändert.
      if (!e.theme && String(body.theme ?? "").trim()) e.theme = String(body.theme).trim().slice(0, 20);
      if (modelId) e.modelId = modelId;
      if (modelName) e.modelName = modelName;
      if (modelBild.startsWith("data:") && !e.modelPath) {
        const p2 = await ablegen(modelBild);
        if (p2) e.modelPath = p2;
      }
      // SEIN Foto gehört an DENSELBEN Eintrag (Owner 30.07.2026: „selbst dann muss ich sehen
      // wen er ausgewählt hat"). Vorher legte sein Upload einen ZWEITEN Eintrag an — ihr Bild
      // stand am ersten, seins am zweiten, und in beiden Zeilen fehlte die Hälfte.
      if (personBild.startsWith("data:") && !e.personPath) {
        const p3 = await ablegen(personBild);
        if (p3) e.personPath = p3;
      }
      // Warnzeichen auch hier setzen — sonst traegt es nur, wer beim ERSTEN Bild auffiel.
      if (torU.warnung) { e.altersWarnung = torU.warnung; if (torU.alter) e.altersGeschaetzt = torU.alter; }
      /**
       * DIE ADRESSE NACHTRAGEN (Owner 03.08.2026: „die email wird nicht erfasst, nichts").
       * Das Upload-Tor im Trichter erzwingt sie VOR dem ersten Foto — aber der Eintrag
       * entsteht erst MIT dem Foto. Also bringt jeder Upload sie mit, und hier landet sie
       * am Eintrag. Nie ueberschreiben: Die erste bestaetigte Adresse bleibt.
       */
      const mailU = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
      if (mailU && !e.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mailU)) e.email = mailU;
      await writeKissLog(entries);
    }
    // Abgelegt (der Owner sieht den Verlauf), aber der Besucher bekommt die Absage.
    if (torU.abweisen) {
      return NextResponse.json({ error: abgelehntText(body.lang), bildAbgelehnt: true, altersSperre: true }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  /**
   * DIE ALTERSSPERRE IST RAUS (Owner 01.08.2026: „mach die Alterskontrolle raus. OpenAI
   * blockiert eh schon zu viel"). Sie prüfte hier jedes Foto VOR dem Ablegen (31.07.–01.08.);
   * das Argument des Owners: gpt-image-1 weist problematische Aufträge ohnehin selbst ab, die
   * Vorprüfung war doppelt und kostete je Upload Zeit und einen API-Aufruf. Der Owner prüft
   * die Galerie-Liste laufend von Hand und löscht selbst. `lib/minderjaehrig-pruefen.ts`
   * bleibt liegen — Wiedereinhängen ist eine Zeile; alte Warnzeichen bleiben sichtbar.
   */
  // DAS TOR VOR DER ABLAGE (Owner 03.08.2026) — siehe `nacktheitsTor` oben.
  const tor = await nacktheitsTor([String(body.personImage ?? ""), String(body.modelImage ?? "")]);
  if (tor.abweisen && !tor.ablegen) {
    // Kind + nackt: nichts ablegen, keine Zeile, nur die Absage.
    return NextResponse.json({ error: abgelehntText(body.lang), bildAbgelehnt: true, altersSperre: true }, { status: 400 });
  }

  let personPath = String(body.personPath ?? "").trim();
  if (!personPath && String(body.personImage ?? "").startsWith("data:")) personPath = await ablegen(String(body.personImage));
  // AUCH DIE FRAU, die er selbst hochgeladen hat (Owner 30.07.2026: „ich sehe das Bild von
  // der Frau nicht, die ich hochgeladen habe").
  let modelPath = String(body.modelPath ?? "").trim();
  if (!modelPath && String(body.modelImage ?? "").startsWith("data:")) modelPath = await ablegen(String(body.modelImage));

  // Neu: eine Generierung (beim Hochladen angelegt, Ergebnis wird nachgetragen).
  const entry: KissLogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    modelId: String(body.modelId ?? "").trim() || undefined,
    modelName: String(body.modelName ?? "").trim().slice(0, 60) || undefined,
    videoUrl: String(body.videoUrl ?? "").trim() || undefined,
    paid: false,
    imagePath: String(body.imagePath ?? "").trim().startsWith("try-this-look/") ? String(body.imagePath).trim() : undefined,
    personPath: personPath.startsWith("try-this-look/") ? personPath : undefined,
    modelPath: modelPath.startsWith("try-this-look/") ? modelPath : undefined,
    email: String(body.email ?? "").trim().toLowerCase().slice(0, 160) || undefined,
    device: String(body.device ?? "").trim().slice(0, 80) || undefined,
    theme: String(body.theme ?? "").trim().slice(0, 20) || undefined,
    // Das Warnzeichen für die Galerie — nur gesetzt, wenn etwas auffiel.
    altersWarnung: tor.warnung,
    altersGeschaetzt: tor.alter || undefined,
  };
  const entries = [entry, ...(await readKissLog())];
  await writeKissLog(entries);
  /**
   * ABGELEGT UND TROTZDEM ABGEWIESEN (Owner 03.08.2026). Die Zeile steht jetzt in der
   * Galerie — mit Bild und Warnzeichen, damit der Owner den Verlauf sieht. Der Besucher
   * bekommt die Absage. Die Kennung reist mit: Laedt er gleich ein anderes Foto hoch, soll
   * es an DENSELBEN Eintrag, nicht in eine zweite halbe Zeile.
   */
  if (tor.abweisen) {
    return NextResponse.json({ error: abgelehntText(body.lang), bildAbgelehnt: true, altersSperre: true, id: entry.id }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: entry.id });
}
