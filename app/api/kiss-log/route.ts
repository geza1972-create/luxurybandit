import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { readKissLog, writeKissLog, getSignedUrl, deleteTryThisLookImage, createSignedUploadUrl, readTryThisLookState, readWetterSubscribers, type KissLogEntry, avatarMerken } from "@/lib/try-this-look-store";
import { GNADENFRIST_MS, lieferungAnstossen } from "@/lib/kiss-delivery";
import { pruefeAlter } from "@/lib/minderjaehrig-pruefen";
import { GEBURTSTAG_LOOKS } from "@/lib/geburtstag-looks";
import { VERSPRECHEN_LOOKS } from "@/lib/versprechen-looks";
import { POLEDANCE_SETS } from "@/lib/poledance";
import { KUSS_SZENEN } from "@/lib/kuss-szenen";
import { zieleSaeubern } from "@/lib/future-ziele";

/**
 * Die Kennungen, die es wirklich gibt — der Wertevorrat fuer `look`.
 *
 * MIT DEN VERSPRECHEN-LOOKS (11.08.2026, an einem echten Auftrag gefunden: 878ce862 wurde
 * bezahlt und trug KEINEN Look). Hier stand nur die Geburtstagsliste, und was nicht darin
 * steht, wird stillschweigend weggeworfen — „villa" fiel also bei jedem Versprechen-Auftrag
 * heraus. Folgen, beide unsichtbar bis zur Auslieferung:
 *
 *   1. `geburtstagLook(undefined)` faellt auf den ERSTEN Geburtstags-Look zurueck: Wer eine
 *      Videobotschaft an sich selbst kauft, bekommt Torte und Kerzen.
 *   2. Der gesprochene Satz haengt am Look (`VERSPRECHEN_LOOKS.some(...)` in
 *      /api/geburtstag-video) — ohne Look sagt die Stimme „Happy birthday".
 *
 * Ein Wertevorrat, der ein Thema nicht kennt, verwirft dessen Wahl lautlos. Deshalb kommt
 * hier jede Look-Liste des Hauses hinein, nicht eine.
 */
/* MIT DEN TANZ-SETS (15.08.2026, Owner: „der generiert nur mit der ersten wardrobe, also mit
   dem rosa" · „ich habe die grüne ausgewählt gehabt"). Genau der Fall, vor dem der Absatz
   darueber warnt — nur diesmal fiel die Wahl nicht beim Versprechen heraus, sondern beim
   Tanz: `haus/rot/schwarz/blau/gruen/lack/rotstudio` standen in keiner Liste, also verwarf
   die Route sie stillschweigend, und die Erzeugung nahm den Rueckfall — das erste Set. */
/* MIT DEN KUSS-SZENEN (16.08.2026): Seit die neue Kette je Szene einen eigenen Bild- und
   Bewegungs-Prompt hat, MUSS die gewaehlte Szene am Auftrag stehen — sonst rendert der
   Server-Rettungsweg eine andere als die bestellte. Genau die Falle, vor der der Absatz
   darueber warnt, nur mit einer dritten Liste. */
const LOOK_IDS: string[] = [...GEBURTSTAG_LOOKS, ...VERSPRECHEN_LOOKS, ...POLEDANCE_SETS, ...KUSS_SZENEN].map(l => l.id);

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
type Kopf = { x: number; y: number; w: number; h: number };
type NacktUrteil = { abweisen: boolean; ablegen: boolean; warnung?: string; alter?: number;
  /**
   * DIE KOPF-RECHTECKE, IN DER REIHENFOLGE DER ÜBERGEBENEN BILDER (Owner 16.08.2026,
   * „kannst du die erkennen und schneiden?" · „gratis"). `null` heisst: kein brauchbares
   * Rechteck — dann wird nicht geschnitten. Sie fallen bei der Prüfung ab, die ohnehin läuft;
   * siehe `kopfAus` in lib/minderjaehrig-pruefen.ts.
   */
  koepfe?: (Kopf | null)[] };

async function nacktheitsTor(bilder: string[]): Promise<NacktUrteil> {
  const key = process.env.OPENAI_API_KEY?.trim();
  /* MIT PLATZHALTERN: Der Aufrufer uebergibt [er, sie] und muss die Antwort derselben Stelle
     zuordnen koennen. Ein `filter` wuerde die Plaetze verschieben — dann truege das Foto der
     Frau das Rechteck des Mannes. */
  const echte = bilder.map(b => (String(b ?? "").startsWith("data:") ? String(b) : ""));
  if (!key || !echte.some(Boolean)) return { abweisen: false, ablegen: true };
  const urteile = await Promise.all(echte.map(b => (b ? pruefeAlter(b, key).catch(() => null) : Promise.resolve(null))));
  const koepfe: (Kopf | null)[] = urteile.map(u => (u && u.ok && u.kopf ? u.kopf : null));

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
    /**
     * NACKTHEIT WEIST NICHT MEHR AB (Owner 16.08.2026, wörtlich: „er bekommt das video am
     * ende, aber zu seiner überraschung, die frau wird angezogen sein :)").
     *
     * WAS HIER STAND: `abweisen: true` samt der Absage „No naked — go to Pornhub!". Sie war
     * richtig, solange die Vorlage 1:1 ins Video wanderte. Seit der neuen Kette (16.08.2026)
     * geht nur noch der KOPF an OpenAI, und der Bildprompt zieht die Frau in ein
     * bodenlanges Abendkleid — eine nackte Vorlage kann gar kein nacktes Ergebnis mehr
     * erzeugen. Damit ist die Absage nur noch ein verlorener Kunde.
     *
     * WAS BLEIBT: die Warnung am Eintrag. Der Owner will jeden Upload sehen („ich will
     * trotzdem alles sehen was leute hochladen und abgelehnt wird") — und gemessen am
     * 16.08.2026 hat das Tor in 113 Einträgen dreimal angeschlagen, zweimal bei ihm selbst.
     * Ein Zeichen in der Liste ist die ehrliche Antwort auf eine Prüfung dieser Güte; eine
     * Sperre war es nicht.
     *
     * NICHT BETROFFEN: Kind + Nacktheit, ein paar Zeilen darüber. Das bleibt abgewiesen und
     * ungespeichert, ohne Ausnahme und unabhängig von jeder Kette.
     */
    console.warn(`[upload-tor] Nacktheit erkannt — durchgelassen, markiert, nur Kopf geht weiter (alter≈${alter})`);
    return { abweisen: false, ablegen: true, warnung: "nacktheit", alter, koepfe };
  }
  return { abweisen: false, ablegen: true, koepfe };
}

/** Die Absage, die der Besucher liest — in seiner Sprache, kurz und ohne Vorwurf. */
/* DER SPRUCH IST VOM OWNER (13.08.2026, wörtlich samt Smiley: „No naked, go to
   pornhub! :)") — frech vorneweg, der zweite Satz sagt klar, was zu tun ist. */
const ABGELEHNT: Record<string, string> = {
  en: "No naked — go to Pornhub! 🙂 Please upload a photo with clothes on.",
  de: "No naked — go to Pornhub! 🙂 Hier bitte ein Foto mit Kleidung hochladen.",
  ro: "No naked — go to Pornhub! 🙂 Aici încarcă o poză în care ești îmbrăcat.",
  es: "No naked — go to Pornhub! 🙂 Aquí sube una foto con ropa.",
  fr: "No naked — go to Pornhub! 🙂 Ici, envoie une photo habillé.",
  pt: "No naked — go to Pornhub! 🙂 Aqui carrega uma foto com roupa.",
  it: "No naked — go to Pornhub! 🙂 Qui carica una foto vestito.",
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
  /**
   * DER WEG DES BESUCHERS (Owner 16.08.2026: „ich muss bei jedem user sehen den pfad den er
   * geht. Auch wenn er auf einer anderen topic wechselt, bis er aussteigt." — mit Bild der
   * Auftragskarte: „also hier").
   *
   * DIE DATEN GAB ES SCHON, NUR NIE AN DIESER STELLE: Jeder Trichter-Schritt schreibt seit
   * Wochen ein Ereignis (`lib/track-funnel.ts`) mit Geraetekennung, Produkt und — seit heute —
   * Schritt und Vorlage. Sie lagen im Ereignis-Protokoll neben der Auftragsliste, ohne dass
   * die beiden je zusammengefuehrt wurden. Die Karte zeigte damit das ERGEBNIS eines Besuchs
   * (Fotos, bezahlt/unbezahlt) und verschwieg den Verlauf: Wo kam er her, was hat er
   * angesehen, an welcher Station ist er stehengeblieben.
   *
   * VERBUNDEN WIRD UEBER DIE GERAETEKENNUNG, nicht ueber die Adresse: Der Weg beginnt lange
   * bevor jemand seine E-Mail eintippt (seit dem 16.08. sogar noch spaeter, weil Schritt 1
   * uebersprungen werden darf). Nur so ist auch der Themenwechsel sichtbar — dasselbe Geraet
   * in Kuss UND Tanz ist EIN Mensch, seine Adresse steht vielleicht nur an einem der beiden.
   */
  const wegJeGeraet = new Map<string, { t: string; thema: string; name: string; step?: string; vorlage?: string; quelle?: string }[]>();
  try {
    const st = await readTryThisLookState();
    for (const c of (st.curators ?? []) as { id?: string; photoPath?: string; photoUrl?: string }[]) {
      if (c?.id && (c.photoPath || c.photoUrl)) katalog.set(String(c.id), String(c.photoPath || c.photoUrl));
    }
    /* Aelteste zuerst — ein Weg liest sich von oben nach unten, das Protokoll steht
       andersherum (neueste zuerst). */
    const ereignisse = [...(st.events ?? [])].reverse();
    for (const ev of ereignisse) {
      const ger = String(ev.device ?? "").trim();
      if (!ger) continue;   // ohne Kennung gehoert das Ereignis zu niemandem
      const liste = wegJeGeraet.get(ger) ?? [];
      /* Ein Deckel je Geraet: Wer sich durch fuenf Themen tippt, erzeugt schnell hundert
         Ereignisse — die Karte soll den Weg zeigen, nicht das Rohprotokoll. */
      if (liste.length >= 60) continue;
      liste.push({
        t: String(ev.createdAt ?? ""),
        thema: String(ev.theme ?? ""),
        name: String(ev.name ?? ""),
        ...(ev.step ? { step: String(ev.step) } : {}),
        ...(ev.vorlage ? { vorlage: String(ev.vorlage) } : {}),
        ...(ev.source ? { quelle: String(ev.source) } : {}),
      });
      wegJeGeraet.set(ger, liste);
    }
  } catch { /* ohne Katalog bleibt die Spalte eben leer, ohne Ereignisse fehlt nur der Weg */ }

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
    /* Sein Weg — leer, wenn das Geraet nichts gemeldet hat (alte Auftraege ohne Kennung). */
    weg: wegJeGeraet.get(String(e.device ?? "").trim()) ?? [],
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

/**
 * BESITZ EINES EINTRAGS PRUEFEN (11.08.2026, ausfaktoriert aus dem `remove`-Zweig fuer die
 * neue Wache am `update`-Zweig — siehe dort). Besitzer heisst wie beim Löschen (Owner
 * 30.07.2026): dasselbe Gerät wie beim Hochladen, oder ein angemeldetes Konto (bzw. eine
 * mitgeschickte Adresse) mit derselben E-Mail. Admin darf immer.
 *
 * Die Adresse darf auch aus dem Aufruf kommen, nicht nur aus der Anmeldung (Owner
 * 03.08.2026: „ich kann keine Bilder löschen"). Wer sein Guthaben unter einer Adresse führt,
 * aber nicht angemeldet ist, scheiterte sonst am Gerät — obwohl der Eintrag auf ihn läuft.
 */
async function istBesitzer(ziel: KissLogEntry, body: { device?: string; email?: string }, request: Request): Promise<boolean> {
  if (await isAdminRequest(request).catch(() => false)) return true;
  const geraet = String(body.device ?? "").trim();
  const konto = await getSellerFromRequest(request).catch(() => null);
  const mail = String(konto?.email ?? "").trim().toLowerCase();
  const mitgeschickt = String(body.email ?? "").trim().toLowerCase();
  /* AUCH DIE STRIPE-ADRESSE ZAEHLT (12.08.2026, dieselbe Lücke wie beim ANZEIGEN am
     01.08.2026: „ich habe auf Watch my gallery geklickt, aber das Bild ist nicht drin").
     Die Galerie ordnet Einträge über `email` ODER `paidEmail` zu — die Besitzprüfung hier
     kannte nur `email`. Wer seine Adresse erst an der Kasse hinterlassen hat, SAH seine
     Kachel also, durfte sie aber nicht löschen („Not yours." auf dem eigenen Kauf). */
  const zielMails = [String(ziel.email ?? "").toLowerCase(), String(ziel.paidEmail ?? "").toLowerCase()].filter(Boolean);
  return (
    (!!geraet && ziel.device === geraet) ||
    (!!mail && zielMails.includes(mail)) ||
    (!!mitgeschickt && zielMails.includes(mitgeschickt))
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { theme?: string; modelId?: string; modelName?: string; videoUrl?: string; videoId?: string; remove?: string; update?: string; email?: string; device?: string; imagePath?: string; personPath?: string; personImage?: string; modelImage?: string; modelPath?: string; lang?: string; empfaenger?: string; stimme?: string; look?: string; ziele?: unknown; zieleFrei?: string; satz?: string; uebernehmen?: boolean };

  /**
   * GUEST→KONTO-ÜBERNAHME (Owner 12.08.2026, Architektur-Abgleich §15–17: „Keine zweite
   * Kopie. Kein Verlust."). Wer als Gast auf diesem Gerät schon Aufträge angelegt hat und
   * meldet sich jetzt an — sie sollen unter seiner Adresse auftauchen, ohne dass irgendwo
   * ein zweiter Eintrag entsteht: derselbe Eintrag wird nur nachträglich beschriftet.
   *
   * NUR MIT GÜLTIGER SITZUNG: `getSellerFromRequest` liest den Bearer-Token aus dem
   * Aufruf — die Adresse kommt NIE aus dem Aufrufkörper, sondern ausschliesslich aus der
   * geprüften Sitzung. Sonst könnte jeder, der eine fremde Geräte-Kennung kennt (sie steht
   * offen in `lb_visitor`), sie auf die eigene Adresse umschreiben.
   *
   * NUR LEERE FELDER (Memory `guthaben-haengt-an-einer-adresse`): Trägt ein Eintrag schon
   * eine E-Mail — egal welche —, bleibt er unangetastet. Nur Gast-Einträge (Gerät passt,
   * `email` leer) bekommen die Sitzungs-Adresse. So kann diese Übernahme nie ein fremdes
   * Guthaben umbuchen, selbst wenn zwei Menschen je einmal an diesem Gerät waren.
   */
  if (body.uebernehmen) {
    const geraet = String(body.device ?? "").trim();
    const konto = await getSellerFromRequest(request).catch(() => null);
    const mail = String(konto?.email ?? "").trim().toLowerCase();
    if (!geraet || !mail) return NextResponse.json({ error: "Keine gültige Sitzung." }, { status: 401 });
    const entries = await readKissLog();
    let n = 0;
    for (const e of entries) {
      if (e.device === geraet && !String(e.email ?? "").trim()) { e.email = mail; n++; }
    }
    // Merge-sicher (writeKissLog liest vor dem Schreiben frisch nach) — nur schreiben,
    // wenn wirklich etwas beschriftet wurde.
    if (n) await writeKissLog(entries);
    return NextResponse.json({ ok: true, uebernommen: n });
  }

  /**
   * LÖSCHEN — Admin ODER der Besitzer (Owner 30.07.2026: „kann er sie auch löschen?").
   *
   * Besitzer heisst: dasselbe Gerät wie beim Hochladen, oder ein angemeldetes Konto mit
   * derselben E-Mail. Ohne diese Prüfung könnte jeder fremde Bilder löschen, indem er eine
   * Kennung rät.
   */
  if (body.remove) {
    // Besitzpruefung ausfaktoriert nach `istBesitzer` (11.08.2026) — dieselbe Logik gilt
    // jetzt auch am `update`-Zweig weiter unten, statt sie ein zweites Mal abzuschreiben.
    const alleJetzt = await readKissLog();
    const ziel = alleJetzt.find(e => e.id === body.remove);
    const darf = !!ziel && (await istBesitzer(ziel, body, request));
    if (!darf) return NextResponse.json({ error: "Not yours." }, { status: 403 });
    const alle = await readKissLog();
    const weg = alle.find(e => e.id === body.remove);
    const entries = alle.filter(e => e.id !== body.remove);
    // Die Kennung ausdruecklich als geloescht melden: `writeKissLog` mischt sonst den
    // gerade gelesenen Stand dazu — und holte den Eintrag damit sofort zurueck.
    await writeKissLog(entries, [String(body.remove)]);
    // MIT den Dateien löschen (Owner 30.07.2026: „ich lösche die auch"). Bliebe nur die
    // Zeile weg, lägen die Fotos weiter im Speicher — er hätte gelöscht und es wäre nichts
    // gelöscht. Seit 24.08.2026 auch die Eigenaufnahme (`audioPath`, Lebenslauf-Original):
    // sie ist sein Gesicht und seine Stimme — Löschen heisst löschen.
    for (const pfad of [weg?.imagePath, weg?.personPath, weg?.modelPath, weg?.audioPath]) {
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
    /* DER START-STEMPEL IM MOMENT DES KLICKS (Owner 08.08.2026: „er faengt an zu raendern
       … und auch punkt pulsiert nicht"). Die Kennung kommt erst nach 1-2 Minuten
       HeyGen-Look — bis dahin waeren Galerie-Streifen und Puls blind. Der Trichter meldet
       den Start deshalb sofort, die Kennung folgt. */
    const renderStart = (body as { renderStart?: boolean }).renderStart === true;
    /**
     * DIE RÜCKNAHME DES STARTSTEMPELS (Owner 10.08.2026: „er rändert fake").
     *
     * `renderStart` ist ein Vorschuss: Der Browser stempelt ihn, BEVOR der Startaufruf
     * durch ist, damit der Galerie-Streifen nicht ein bis zwei Minuten blind bleibt. Kommt
     * der Aufruf ohne Kennung zurück, läuft nichts — und dann muss der Vorschuss zurück,
     * sonst behauptet die Galerie eine Stunde lang eine Erzeugung, die es nie gab.
     */
    const renderAbbruch = (body as { renderAbbruch?: boolean }).renderAbbruch === true;
    const modelName = String(body.modelName ?? "").trim().slice(0, 60);
    const modelId = String(body.modelId ?? "").trim().slice(0, 80);
    // Die Alterspruefung stand hier vom 31.07. bis 01.08.2026 — entfernt auf Anweisung
    // (Owner: „mach die Alterskontrolle raus. OpenAI blockiert eh schon zu viel").
    /**
     * WAS ZAEHLT ALS „ETWAS ZU TUN"? — SEIT 11.08.2026 AUCH DIE ZIELE.
     *
     * Diese Wache steht hier, damit ein leerer Aufruf nicht die ganze Auftragsliste neu
     * schreibt. Sie kannte aber nur Bilder, Videos und Stempel: Ein Aufruf, der NUR die
     * Ziele nachtraegt, kam mit „nothing to update" zurueck — beim Pruefen gemessen. Im
     * Trichter faellt das heute nicht auf (dort reist immer eine Kennung mit), aber es ist
     * genau die Art stiller Absage, an der spaeter eine Stunde Suche haengt.
     *
     * SEIT 12.08.2026 AUCH `satz` (Zusatzauftrag Urlaub): Derselbe Fehler waere sonst hier
     * wieder eingebaut worden — ein Aufruf, der NUR den Einladungssatz nachtraegt, kaeme mit
     * „nothing to update." zurueck.
     */
    if (!videoUrl && !imagePath && !modelBild && !personBild && !videoId && !modelName
        && !renderStart && !renderAbbruch && body.ziele === undefined && typeof body.zieleFrei !== "string"
        && typeof body.satz !== "string") {
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
      /**
       * BESITZPRUEFUNG AM ÖFFENTLICHEN `update` (11.08.2026, Owner-Fund: geteilte
       * /w/<id>-Links legen die genId offen). Der `remove`- und der `share`-Zweig prüfen
       * Besitz, dieser hier prüfte bis heute NICHTS — wer eine genId kannte, konnte einen
       * fremden Auftrag umschreiben, sogar `videoUrl` setzen und damit die Liefermail
       * auslösen.
       *
       * KONSERVATIV, damit kein zahlender Kunde ausgesperrt wird: Ein Eintrag ohne `device`
       * UND ohne `email` (anonym, z. B. der allererste Aufruf, der ihn gerade erst anlegt
       * oder gleich danach ergänzt) bleibt offen wie bisher. Erst sobald der Eintrag ein
       * Gerät oder eine Adresse trägt, muss der Aufruf dazu passen — dieselbe Prüfung wie
       * beim Löschen (`istBesitzer`), inklusive des zweiten Foto-Uploads vom SELBEN Gerät.
       */
      if ((e.device || e.email) && !(await istBesitzer(e, body, request))) {
        return NextResponse.json({ error: "Not yours." }, { status: 403 });
      }
      if (videoUrl) {
        e.videoUrl = videoUrl;
        /**
         * AUCH DER GEDULDIGE KUNDE BEKOMMT SEINE MAIL (09.08.2026, Owner zum Kundenfall
         * bandiszidonia: „mail ist nicht verschickt worden bei der generierung").
         *
         * Die Liefermail hing bis heute AM WACHHUND — sie ging also nur an den, dessen
         * Browser gestorben war. Wer brav auf der Seite blieb und zusah, wie sein Video
         * fertig wurde, bekam nie eine: Sein Browser meldet das Ergebnis hierher, und hier
         * stand kein Versand. Genau falsch herum — der geduldige Kunde ist der Regelfall.
         *
         * `videoMailedAt` verhindert die zweite Mail, falls der Wachhund später doch noch
         * über denselben Auftrag läuft.
         */
        if (!e.videoMailedAt && (e.email || e.paidEmail)) {
          const o = new URL(request.url).origin;
          const schluessel = (process.env.TRY_THIS_LOOK_ADMIN_PIN ?? process.env.CRON_SECRET ?? "").trim();
          void fetch(`${o}/api/kiss-deliver?genId=${encodeURIComponent(e.id)}&nurMail=1${schluessel ? `&key=${encodeURIComponent(schluessel)}` : ""}`,
            { headers: { "cache-control": "no-store" } }).catch(() => {});
        }
        // Der Browser hat DIESEN Auftrag zu Ende gebracht — der Server muss ihn nicht noch
        // einmal abholen und keine Mail schicken. Ohne die Marke bekäme der Kunde sein Video
        // zweimal: einmal auf dem Schirm, einmal per Post.
        if (e.videoId) e.videoDoneId = e.videoId;
        e.videoFertigAt = new Date().toISOString();
      }
      if (renderStart) { e.videoStartAt = new Date().toISOString(); e.videoError = undefined; }
      /* Nichts läuft: Stempel weg, Grund hin. `videoId` bleibt unangetastet — ein FRÜHERER
         Auftrag desselben Eintrags darf davon nicht verlieren. */
      let abbruchNachliefern = false;
      if (renderAbbruch) {
        e.videoStartAt = undefined;
        const grund = String((body as { fehler?: string }).fehler ?? "").trim().slice(0, 200);
        e.videoError = grund || "Erzeugung ist gar nicht erst gestartet.";
        /**
         * DER ABBRUCH IST DER WECKRUF (14.08.2026, am eigenen 9,99-Kauf gefunden: „Eroare de
         * rețea." mit 0 Anlaeufen — der naechste Wachhund-Lauf waere der 05:00-Cron gewesen,
         * also erst am NAECHSTEN MORGEN; die Anstoss-Kette von der Zahlung lebt nur ~7 min).
         *
         * Genau hier sagt uns der Browser des Kunden, dass sein Start gescheitert ist. Die
         * Schonfrist (videoDueAt = Zahlung + Frist) existiert nur, damit Server und Browser
         * nicht doppelt rendern — meldet der Browser „bei mir laeuft nichts", ist sie
         * gegenstandslos: Frist auf JETZT ziehen und die Lieferkette wecken. kiss-deliver
         * startet nie doppelt (Laufendes wird nur beobachtet) und gibt nach MAX_VERSUCHE
         * auf; dieselbe Grenze auch hier, statt einen toten Auftrag endlos zu wecken.
         */
        if (e.paid && !e.videoUrl && (e.videoTries ?? 0) < 3) {
          e.videoDueAt = new Date().toISOString();
          abbruchNachliefern = true;
        }
      }
      if (videoId) {
        e.videoId = videoId;
        /* Startstempel fuer die Galerie („Video entsteht") — beim Geburtstag setzt ihn die
           Route selbst; hier fuer alle anderen Wege (08.08.2026). */
        e.videoStartAt = new Date().toISOString();
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
      // Der Name des Empfaengers kann sich noch aendern, solange nichts verschickt ist —
      // deshalb ueberschreibt er hier, statt nur beim Anlegen gesetzt zu werden.
      const empf = String(body.empfaenger ?? "").replace(/\s+/g, " ").trim().slice(0, 18);
      if (empf) e.empfaenger = empf;
      /* Die Stimmwahl des Geburtstags — der Nachliefer-Wachhund braucht sie beim Neustart
         (Owner 07.08.2026: „Peter hat eine Frauenstimme"). Nur die zwei bekannten Werte. */
      if (body.stimme === "mann" || body.stimme === "frau") e.stimme = body.stimme;
      /**
       * SEINE ZIELE — ÄNDERBAR BIS ZUM KAUF (Owner 11.08.2026, Ziele-Schritt).
       *
       * Wie der Empfaengername: Solange nichts geliefert ist, darf er umwaehlen, und der
       * Auftrag traegt die LETZTE Wahl. `zieleSaeubern` laesst nur bekannte Kennungen durch
       * und deckelt bei drei — der Browser bestimmt die Zahl nicht.
       *
       * NUR SETZEN, WENN ETWAS KOMMT: Ein Aufruf ohne `ziele` (der Wachhund, ein
       * Fortschritts-Stempel) darf eine getroffene Wahl nicht loeschen.
       */
      if (body.ziele !== undefined) {
        const gew = zieleSaeubern(body.ziele);
        if (gew.length) e.ziele = gew;
      }
      if (typeof body.zieleFrei === "string" && body.zieleFrei.trim()) {
        e.zieleFrei = body.zieleFrei.replace(/\s+/g, " ").trim().slice(0, 60);
      }
      /* DER EINE EINLADUNGSSATZ DES URLAUBS-TUNNELS (Owner 12.08.2026, Zusatzauftrag) —
         dasselbe Muster wie `zieleFrei` zwei Zeilen darueber, nur mit 200 statt 60 Zeichen:
         ein ganzer Satz mit Datum ist laenger als ein Stichwort hinter „etwas anderes". */
      if (typeof body.satz === "string" && body.satz.trim()) {
        e.satz = body.satz.replace(/\s+/g, " ").trim().slice(0, 200);
      }
      /* SEINE SPRACHE — LETZTE WAHL GEWINNT (11.08.2026): er kann sie im Trichter noch
         wechseln, bevor bezahlt wird; der Auftrag traegt dann die neueste. */
      const langU = String(body.lang ?? "").trim().slice(0, 5);
      if (langU) e.lang = langU;
      /* Und der gewaehlte Look — genauso streng: nur eine Kennung, die es wirklich
         gibt. Ein Fremdwort hier hiesse spaeter ein Video ohne Prompt. */
      if (LOOK_IDS.includes(String(body.look ?? ""))) e.look = String(body.look);
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
      /* Erst NACH dem Schreiben wecken — die Kette liest frisch und muss die vorgezogene
         Frist schon sehen. */
      if (abbruchNachliefern) lieferungAnstossen(new URL(request.url).origin, e.id);
    }
    // Abgelegt (der Owner sieht den Verlauf), aber der Besucher bekommt die Absage.
    if (torU.abweisen) {
      return NextResponse.json({ error: abgelehntText(body.lang), bildAbgelehnt: true, altersSperre: true }, { status: 400 });
    }
    /* Auch der ZWEITE Upload bringt sein Kopf-Rechteck zurueck — er laeuft ueber `update`,
       und ohne diese Zeile haette genau das zweite Foto keines (dieselbe Luecke, die der
       Kommentar oben fuer die Nacktheitspruefung beschreibt). */
    return NextResponse.json({ ok: true, kopfEr: torU.koepfe?.[0] ?? null, kopfSie: torU.koepfe?.[1] ?? null });
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

  /**
   * DAS STANDBILD WIRD ZUM AVATAR (Owner 09.08.2026: „ich will dass du das Video das die
   * Leute hochladen Avatar nennst … Das kann später der User immer wieder benutzen auch
   * für andere Tools, oder wenn er ein neues Video aufnimmt, dann wird es ersetzt.").
   *
   * Hier ist die Stelle, an der es entsteht: Der Trichter legt den Auftrag an und schickt
   * das Standbild seiner Aufnahme mit. Es gehört ab jetzt nicht nur DIESEM Auftrag,
   * sondern IHM — beim nächsten Video muss er sich nicht neu aufnehmen.
   *
   * Ohne Adresse kein Avatar: Er hängt am Konto, nicht am Gerät (dieselbe Regel wie beim
   * Guthaben, [[guthaben-haengt-an-einer-adresse]]). Und er wird ERSETZT, nicht gesammelt.
   */
  const adresse = String(body.email ?? "").trim().toLowerCase();
  if (adresse && modelPath.startsWith("try-this-look/")) {
    void avatarMerken(adresse, { bildPfad: modelPath });
  }

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
    empfaenger: String(body.empfaenger ?? "").replace(/\s+/g, " ").trim().slice(0, 18) || undefined,
    stimme: body.stimme === "mann" || body.stimme === "frau" ? body.stimme : undefined,
    look: LOOK_IDS.includes(String(body.look ?? "")) ? String(body.look) : undefined,
    /* Die Richtung, die er sich gegeben hat — Kennungen, nie Woerter (siehe lib/future-ziele). */
    ziele: zieleSaeubern(body.ziele).length ? zieleSaeubern(body.ziele) : undefined,
    zieleFrei: typeof body.zieleFrei === "string" && body.zieleFrei.trim()
      ? body.zieleFrei.replace(/\s+/g, " ").trim().slice(0, 60) : undefined,
    /* DER EINE EINLADUNGSSATZ DES URLAUBS-TUNNELS (Owner 12.08.2026, Zusatzauftrag). */
    satz: typeof body.satz === "string" && body.satz.trim()
      ? body.satz.replace(/\s+/g, " ").trim().slice(0, 200) : undefined,
    /* SEINE SPRACHE (11.08.2026) — damit `kiss-delivery.ts` die private Programmseite in
       SEINER Sprache anlegen kann, statt auf Englisch zurueckzufallen. */
    lang: String(body.lang ?? "").trim().slice(0, 5) || undefined,
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
  /* Die Kopf-Rechtecke reisen zum Trichter zurueck — [er, sie], dieselbe Reihenfolge, in der
     die Bilder oben ins Tor gegeben wurden. Er schneidet damit vor dem OpenAI-Schritt zu. */
  return NextResponse.json({ ok: true, id: entry.id, kopfEr: tor.koepfe?.[0] ?? null, kopfSie: tor.koepfe?.[1] ?? null });
}
