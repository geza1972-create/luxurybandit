import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { str } from "@/lib/agent-modell";
import { agentDeckel } from "@/lib/versusforge-deckel";
import { bildPruefen, motivPfad, pruefPfad } from "@/lib/versusforge-moderation";
import { mandantAnlegen, mandantAusPlan, freierName, mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { kuenstlerUrl } from "@/lib/lakatosbandi";
import { ereignisMerken } from "@/lib/versusforge-ereignis";

/**
 * DIE SEITE ENTSTEHT BEIM „DA" (Owner 13.09.2026: „dann kannst du die webseite generieren und
 * wenn er das behalten möchte dann soll er sein name und email angeben und bestätigen wenn nicht
 * wird gelöscht").
 *
 * ── DIE UMKEHRUNG GEGENÜBER BISHER ──────────────────────────────────────────────────────────
 *
 * Bis heute gab der Mensch Name und Adresse, BEVOR er je etwas von uns gesehen hatte — und
 * bestätigte danach noch eine Mail. Gemessen am 13.09.2026: von 25 Gesprächen kamen 11 bis zu
 * den Bildern und nur 4 ans Ende. Jetzt sieht er zuerst seine fertige Seite; erst wenn er sie
 * behalten will, nennt er sich. Owner dazu: „Wenn jemand seriös ist, dann macht er das. Die
 * anderen brauchen wir nicht."
 *
 * ── SIE TRÄGT NOCH KEINEN NAMEN ─────────────────────────────────────────────────────────────
 *
 * `freigabe: "offen"` und `portal: false` — damit ist sie über ihren Link erreichbar, steht aber
 * NICHT in der Übersicht auf lakatosbandi.com (`imPortalSichtbar` verlangt „frei" UND „portal").
 * Eine namenlose Seite in der Liste gehörte niemandem. Erst die Bestätigung setzt beides.
 *
 * ── DER SPRUCH WIRD NICHT NOCH EINMAL BEZAHLT ───────────────────────────────────────────────
 *
 * Er ist in der Vorschau bereits entstanden (`api/portal-vorschau`) und reist von dort mit. Ihn
 * hier neu erzeugen zu lassen, hiesse, für denselben Satz unter demselben Bild zweimal zu
 * zahlen (Owner: „Da müssen wir auch sparen").
 *
 * ── UND SIE IST KEIN FREIBRIEF ──────────────────────────────────────────────────────────────
 *
 * Kein Schlüssel schützt diesen Weg — es gibt ja noch keinen Künstler. Deshalb derselbe
 * Tagesdeckel je Gerät wie im Chat (`agentDeckel`) und dieselbe Bildprüfung wie überall: Was
 * `bildPruefen` verbietet, wird nicht abgelegt. Geprüft wird ERNEUT, obwohl die Vorschau schon
 * geprüft hat — zwischen beiden Aufrufen liegt der Browser, und was von dort kommt, ist eine
 * Behauptung.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/* Bildprüfung, Anlegen und Ablage — derselbe Grund wie in `portal-vorschau`: ohne Angabe griffe
   der Vercel-Standard von ~15 Sekunden, und der Mensch verlöre seine fertige Seite im letzten
   Schritt. */
export const maxDuration = 60;

/**
 * Wie viele Werke der Trichter annimmt — analysiert wird davon genau EINES (Owner 14.09.2026:
 * „10 Bilder zulassen, damit die Seite nach was aussieht … das kostet uns nichts. Nur eine
 * Analyse"). Dieselbe Zahl steht in `components/AgentChat.tsx`.
 */
const WERKE_TRICHTER = 10;

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const bild = String(b.bild ?? "");
  const spruch = str(b.spruch, 280).trim();
  const sprache = (str(b.sprache, 5) || "ro").slice(0, 2).toLowerCase();
  const geraet = str(b.device, 80);

  /**
   * ── OHNE NAME UND ADRESSE ENTSTEHT KEINE SEITE (Owner 14.09.2026: „ja soll gar nicht gehen
   * ohne" · „soll error kommen" · „meldung") ─────────────────────────────────────────────────
   *
   * Bis heute legte diese Route die Seite an und liess beides leer — der Mensch sollte sie erst
   * sehen und sich danach nennen. Seit die Analyse ohne E-Mail läuft, blieb genau das aus:
   * `artist-4` stand mit fünf fremden Werken da, ohne Namen, ohne Adresse, und musste gelöscht
   * werden.
   *
   * DIE SPERRE STEHT AUF DEM SERVER, nicht nur im Browser: Eine Karte, die man umgehen kann,
   * ist keine Bedingung. Sie greift VOR dem Bildprüfen und vor dem Deckel — was hier scheitert,
   * darf uns keinen Modellaufruf kosten.
   */
  const name = str(b.name, 80).replace(/\s+/g, " ").trim();
  const mail = str(b.mail, 120).trim().toLowerCase();
  /* Endung mit mindestens zwei Buchstaben — `yahoo.c` ist am 14.09.2026 genau hier durchgerutscht
     und die Post kam zurück. */
  if (!name || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(mail)) {
    return NextResponse.json({ ok: false, grund: "kontakt-fehlt" }, { status: 400 });
  }

  /**
   * ── GIBT ES DIE DOMAIN ÜBERHAUPT? (Owner 14.09.2026: „du prüfst auch die emails besser") ───
   *
   * Ein Muster prüft die FORM, nicht die Wirklichkeit: `gmial.com` sieht tadellos aus. Deshalb
   * fragt der Server das DNS, ob die Domain Post annimmt. Kostet nichts, dauert Millisekunden.
   *
   * IM ZWEIFEL DURCHLASSEN: Abgewiesen wird nur, wenn das DNS die Domain ausdrücklich nicht
   * kennt (`ENOTFOUND`/`NXDOMAIN`). Ein Netzfehler bei uns darf keinen Künstler aussperren —
   * lieber eine Adresse zu viel als eine Anmeldung zu wenig.
   */
  const domain = mail.split("@")[1] ?? "";
  try {
    const { resolveMx, resolve } = await import("node:dns/promises");
    const mx = await resolveMx(domain).catch(() => null);
    if (!mx?.length) {
      /* Manche Domains nehmen Post über den A-Eintrag an — erst wenn auch der fehlt, ist Schluss. */
      const a = await resolve(domain).catch(() => null);
      if (!a?.length) {
        console.warn("[portal-anlegen] Domain nimmt keine Post an:", domain);
        return NextResponse.json({ ok: false, grund: "mail-domain" }, { status: 400 });
      }
    }
  } catch {
    /* DNS nicht erreichbar — dann eben ohne diese Prüfung weiter. */
  }

  /**
   * ── DIE ÜBRIGEN WERKE (Owner 14.09.2026: „überlege im Tunnel doch 10 Bilder zuzulassen, damit
   * die Seite nach was aussieht … ein Bild wird nur analysiert und bekommt Text. Die anderen
   * nicht. Das kostet uns nichts") ───────────────────────────────────────────────────────────
   *
   * `bild` ist das erste — analysiert, mit Spruch. `bilder` trägt alle; hier wird der Rest
   * genommen. Fehlt das Feld, verhält sich die Route wie vorher und legt genau ein Werk an.
   */
  const weitere = (Array.isArray(b.bilder) ? b.bilder : [])
    .map(x => String(x ?? ""))
    .filter(x => x.startsWith("data:image/") && x.length <= MAX_BYTES * 1.4)
    .slice(1, WERKE_TRICHTER);

  if (!bild.startsWith("data:image/")) return NextResponse.json({ ok: false, grund: "kein-bild" }, { status: 400 });
  if (bild.length > MAX_BYTES * 1.4) return NextResponse.json({ ok: false, grund: "zu-gross" }, { status: 413 });

  const stand = await agentDeckel(geraet);
  if (!stand.erlaubt) return NextResponse.json({ ok: false, grund: "deckel" }, { status: 429 });

  const teil = bild.split(",", 2)[1] ?? "";
  const daten = teil ? Buffer.from(teil, "base64") : null;
  if (!daten?.length || daten.length > MAX_BYTES) {
    return NextResponse.json({ ok: false, grund: "kein-bild" }, { status: 400 });
  }

  const urteil = apiKey ? await bildPruefen({ apiKey, bild }).catch(() => null) : null;
  if (urteil?.urteil === "verboten") {
    console.warn("[portal-anlegen] Bild abgelehnt, nichts angelegt:", urteil.gruende.join("/"));
    return NextResponse.json({ ok: false, grund: "abgelehnt" }, { status: 422 });
  }

  /* DER BEHELFSNAME. Er steht nur so lange, bis er bestätigt — dann zieht die Seite um
     (lib/kuenstler-umzug.ts). „artist" ist in allen drei Sprachen lesbar und behauptet nichts. */
  const wunsch = await freierName("artist");
  const schluessel = randomUUID().replace(/-/g, "");
  const loeschSchluessel = randomUUID().replace(/-/g, "");

  const kennung = await mandantAnlegen(wunsch, {
    ...mandantAusPlan({
      /* Name und Adresse stehen ab dem ersten Moment fest (Owner 14.09.2026) — vorher blieben
         sie leer, und daraus entstanden herrenlose Seiten. */
      name,
      mail,
      plan: { hook: spruch, zielgruppe: [], karten: [] },
      schluessel,
      loeschSchluessel,
      sprache,
      geraet,
    }),
    /* Sichtbar über den Link, NICHT in der Übersicht (siehe oben). */
    freigabe: "offen" as const,
    portal: false,
    /* Ein Werk, und es ist das Standardmotiv (-1) — dieselbe Nummerierung wie in
       `portal/bestaetigen`, damit Kachel und Ablage überall dasselbe meinen. */
    werkNummern: [-1],
    hook: spruch,
    /* KEIN `aufbauSeit`: Es gibt nichts nachzutragen. Die übrigen Werke bleiben ohne
       Beschreibung (Owner 13.09.2026: „dann werden die anderen leer sein bei der
       Beschreibung") — `spruecheNachtragen` läuft hier bewusst NICHT. */
    aufbauSeit: "",
  });

  if (!kennung) return NextResponse.json({ ok: false, grund: "nicht-angelegt" }, { status: 502 });

  /* Markiertes Bild wandert in die Prüfablage, sonst in die Galerie — wie in `portal/bestaetigen`. */
  const ziel = urteil?.urteil === "markiert" ? pruefPfad(kennung, "") : motivPfad(kennung, "");
  const put = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(ziel)}`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: new Uint8Array(daten),
  }).catch(() => null);
  if (!put?.ok) console.error("[portal-anlegen] Werk nicht gespeichert:", kennung, put?.status);

  /**
   * ── DIE ÜBRIGEN WERKE — OHNE TEXT, ABER MIT PRÜFUNG ─────────────────────────────────────────
   *
   * Kein Modellaufruf: Sie bekommen keinen Spruch, keine Beschreibung. Was sie SEHR WOHL
   * durchlaufen, ist die Moderation — sie kostet nichts und ist die Sperre, die verhindert, dass
   * jemand über Bild Nummer sieben etwas auf eine öffentliche Seite stellt, das dort nicht
   * hingehört (Owner 13.09.2026: „jemand kann hier Pornografie posten").
   *
   * ERST SPEICHERN, DANN NUMMERIEREN: Ein abgelehntes oder kaputtes Bild wird übersprungen.
   * Stünde seine Nummer trotzdem in `werkNummern`, hätte er eine leere Kachel auf seiner Seite.
   */
  const angelegt: number[] = [];
  for (const [i, roh] of weitere.entries()) {
    const teilN = roh.split(",", 2)[1] ?? "";
    const datenN = teilN ? Buffer.from(teilN, "base64") : null;
    if (!datenN?.length || datenN.length > MAX_BYTES) continue;

    const urteilN = apiKey ? await bildPruefen({ apiKey, bild: roh }).catch(() => null) : null;
    if (urteilN?.urteil === "verboten") {
      console.warn("[portal-anlegen] Weiteres Werk abgelehnt:", kennung, i, urteilN.gruende.join("/"));
      continue;
    }

    const zielN = urteilN?.urteil === "markiert" ? pruefPfad(kennung, String(i)) : motivPfad(kennung, String(i));
    const putN = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(zielN)}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: new Uint8Array(datenN),
    }).catch(() => null);
    if (putN?.ok) angelegt.push(i);
    else console.error("[portal-anlegen] Weiteres Werk nicht gespeichert:", kennung, i, putN?.status);
  }

  /* Die Kacheln nachtragen — frisch lesen, eng schreiben: `mandantSpeichern` legt den GANZEN
     Datensatz ohne Merge ab. */
  if (angelegt.length) {
    const frisch = await mandantLesen(kennung);
    if (frisch) {
      await mandantSpeichern(kennung, { ...frisch, werkNummern: [-1, ...angelegt] })
        .catch(e => console.error("[portal-anlegen] Kacheln nicht nachgetragen:", kennung, e));
    }
  }

  /* Noch ohne Namen — den nennt er erst beim Behalten. Der Satz lautet dann „artist-7 hat eine
     Seite angelegt.", und das ist genau die Stufe, die der Owner im Dashboard sehen will. */
  void ereignisMerken(kennung, "", "seiteAngelegt");

  /**
   * ── KEINE MELDUNG MEHR AN DIESER STELLE (Owner 14.09.2026: „A") ────────────────────────────
   *
   * Hier standen Freigabe-WhatsApp und Anmelde-Mail — beide schon beim Anlegen, absichtlich vor
   * Name und Adresse. Das war richtig, SOLANGE die Adresse vorher im Trichter abgefragt wurde.
   *
   * SEIT DIE ANALYSE OHNE E-MAIL LÄUFT, ist das der Normalfall geworden: Der Owner bekam Post
   * zu jemandem, den er nicht erreichen kann („NEUER KÜNSTLER: (noch ohne Namen)", Adresse
   * leer), und gab im Zweifel eine Seite frei, die niemandem gehört — genau so ist artist-4
   * entstanden und musste wieder gelöscht werden.
   *
   * BEIDE MELDUNGEN GIBT ES WEITERHIN, nur später: `api/portal-behalten` schickt dieselbe Mail
   * UND denselben Freigabe-Link, dann aber mit Name und Adresse. Wer nie beansprucht, erzeugt
   * keine Post mehr — die Seite bleibt unbeansprucht liegen und fällt dem Aufräumer zu.
   */

  return NextResponse.json({
    ok: true,
    kennung,
    schluessel,
    url: `${kuenstlerUrl(kennung)}?k=${encodeURIComponent(schluessel)}`,
  });
}
