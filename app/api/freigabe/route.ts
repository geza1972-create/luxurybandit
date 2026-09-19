import { NextResponse } from "next/server";
import { kaeufeLesen } from "@/lib/lakatosbandi-kaeufe";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { mandantLesen, mandantLoeschen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { motivPfad, pruefPfad } from "@/lib/versusforge-moderation";
import { werkeAbgelehntPerPost } from "@/lib/versusforge-freigabe-post";

/**
 * ── DAS FREIGABE-WERKZEUG (Owner 18.09.2026) ─────────────────────────────────────────────────
 *
 * „Ich muss nur beim Freigeben schauen, und wenn ich Ablehnen klicke, bekommen sie eine
 * E-Mail." · „Ich selektiere und markiere, dann Button Senden — und sie bekommen EINE E-Mail,
 * nicht 5 E-Mails für jedes Werk."
 *
 * ── WARUM NICHT DIE MAIL-KNÖPFE ─────────────────────────────────────────────────────────────
 *
 * Es gab schon einen Weg: je auffälligem Bild eine Mail mit zwei Knöpfen
 * (`api/versusforge-freigabe`). Der trägt, solange im Monat drei Bilder auffallen. Seit JEDES
 * Bild in die Prüfung geht, wären es bei einem Künstler mit zwölf Werken zwölf Mails an den
 * Owner und zwölf einzelne Absagen an ihn. Das ist keine Auswahl mehr, das ist ein Postfach.
 *
 * Hier liegt alles auf EINER Seite, und die Entscheidung geht in EINEM Zug raus.
 *
 * ── DIE ABSAGE IST EINE MAIL JE KÜNSTLER ────────────────────────────────────────────────────
 *
 * Drei abgelehnte Werke bei demselben Künstler ergeben EINE Nachricht. Fünf Mails mit derselben
 * Begründung liest niemand, und sie klingen wie eine Maschine, die ihn nicht mag.
 *
 * ── GET ZEIGT, POST ENTSCHEIDET ─────────────────────────────────────────────────────────────
 *
 * Dieselbe Trennung wie beim alten Weg: Ein GET, das freigibt, hätte alles freigegeben, sobald
 * ein Virenscanner den Link öffnet.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const OK = (s: string) => mandantPruefen(EIGENER_MANDANT, s).ok;

/** Alles, was gerade wartet — quer über alle Künstler. */
async function wartendes(): Promise<{ mandant: string; nr: string; zeit: string; bestand: boolean }[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "versusforge-motiv-pruefung", limit: 1000, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) return [];
  /* Supabase listet je Ebene: zuerst die Künstlerordner, dann deren Dateien. */
  const ordner = ((await res.json()) as { name: string; id: string | null }[]).filter(d => !d.id).map(d => d.name);
  const alles: { mandant: string; nr: string; zeit: string; bestand: boolean }[] = [];
  for (const m of ordner) {
    const r = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: `versusforge-motiv-pruefung/${m}`, limit: 200, sortBy: { column: "name", order: "asc" } }),
    });
    if (!r.ok) continue;
    const dateien = (await r.json()) as { name: string; id: string | null; updated_at?: string; created_at?: string }[];
    /* Schon abgelehnte bleiben liegen, damit der Künstler sie tauschen kann — sie gehören
       aber nicht mehr in DIESE Liste, sonst entscheidet der Owner zweimal über dasselbe. */
    const abgelehnt = new Set(dateien.filter(d => d.name.endsWith(".abgelehnt.json")).map(d => d.name.replace(/\.abgelehnt\.json$/, "")));
    /**
     * ── „NEU" HEISST: NICHT AUS DEM BESTAND (Owner 18.09.2026, nach dem ersten Lauf) ──────────
     *
     * Der Zeitstempel allein taugt nicht: Der Bestandsimport hat 123 Dateien in derselben Stunde
     * kopiert, also war plötzlich ALLES „neu" — ein Etikett, das überall steht, sagt nichts.
     *
     * Der Zettel `<nr>.bestand` unterscheidet sie: Er liegt genau bei den Bildern, die schon auf
     * der Seite standen und nur zum Nachprüfen hereinkopiert wurden. Was ihn NICHT trägt, ist
     * wirklich frisch hochgeladen.
     */
    const bestand = new Set(dateien.filter(d => d.name.endsWith(".bestand")).map(d => d.name.replace(/\.bestand$/, "")));
    for (const d of dateien) {
      if (!d.id || !d.name.endsWith(".jpg")) continue;
      const nr = d.name.replace(/\.jpg$/, "");
      if (abgelehnt.has(nr)) continue;
      alles.push({ mandant: m, nr, zeit: String(d.updated_at ?? d.created_at ?? ""), bestand: bestand.has(nr) });
    }
  }
  return alles;
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  if (!OK(String(sp.get("s") ?? ""))) return NextResponse.json({ ok: false }, { status: 403 });

  /* Ein einzelnes Bild — die Prüfablage wird NIE öffentlich ausgeliefert, nur hier und nur mit
     Schlüssel. */
  const m = String(sp.get("m") ?? "");
  const nr = String(sp.get("nr") ?? "");
  if (m && nr) {
    const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pruefPfad(m, nr))}`);
    if (!r.ok) return NextResponse.json({ ok: false }, { status: 404 });
    return new NextResponse(await r.arrayBuffer(), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  }

  /**
   * ── DIE KÄUFE (Owner 19.09.2026: „ich muss hier die Käufe sehen, mit Poster, die generiert
   * worden sind") ────────────────────────────────────────────────────────────────────────────
   *
   * Jedes erzeugte Blatt liegt als Kundenbild mit `stil: true` — den Merker setzt ausschliesslich
   * die BEZAHLTE Erzeugungs-Route. Die Liste ist damit zugleich die Liste der Verkäufe: Was hier
   * steht, hat jemand bezahlt.
   *
   * MIT DEN ZEILEN, DIE DER KÄUFER GETIPPT HAT — daran sieht der Owner, ob das Fenster benutzt
   * wird oder ob Leute weiter mit „Numele tău" kaufen.
   *
   * Das BILD kommt einzeln über `?kauf=<kennung>`; hier stehen nur die Angaben, sonst lägen
   * dreissig Fotos in einer Antwort.
   */
  const kauf = String(sp.get("kauf") ?? "");
  if (kauf && /^[0-9a-f]{24}$/.test(kauf)) {
    const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`lakatosbandi-kundenbild/${kauf}.jpg`)}`);
    if (!r.ok) return NextResponse.json({ ok: false }, { status: 404 });
    return new NextResponse(await r.arrayBuffer(), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  }
  if (sp.get("was") === "kaeufe") {
    return NextResponse.json({ ok: true, kaeufe: await kaeufeLesen() });
  }

  /**
   * ── DAS NEUESTE ZUERST (Owner 18.09.2026: „in meiner Freigabe müssen die neuesten Bilder nach
   * oben und als neu erscheinen") ─────────────────────────────────────────────────────────────
   *
   * Die Ablage liefert alphabetisch: `adrianrosu` immer oben, ein Künstler, der sich heute Nacht
   * angemeldet hat, ganz unten hinter 120 Bildern. Wer prüft, will aber genau ihn zuerst sehen —
   * er wartet, die anderen liegen seit Tagen.
   *
   * Sortiert wird nach dem Zeitstempel der Datei in der Ablage. Innerhalb eines Künstlers bleibt
   * die Reihenfolge seiner Werke erhalten; die KÜNSTLER stehen nach ihrem jüngsten Bild.
   */
  const liste = (await wartendes()).sort((a, b) => b.zeit.localeCompare(a.zeit));
  /**
   * ── NAME UND ADRESSE STEHEN DABEI (Owner 18.09.2026: „wenn Bilder reinkommen, muss Künstler
   * und E-Mail stehen") ──────────────────────────────────────────────────────────────────────
   *
   * Ein Bild allein sagt nicht, wessen Bild es ist — und beim Ablehnen geht eine Nachricht an
   * eine Adresse, die der Owner vorher gesehen haben muss. Steht dort keine, ist das die
   * wichtigste Information auf der ganzen Seite: Dieser Künstler erfährt von der Absage nichts.
   *
   * Einmal je Künstler geholt, nicht je Bild — bei zwölf Werken wären es sonst zwölf Abrufe
   * derselben Datei.
   */
  const wer = new Map<string, { name: string; mail: string }>();
  for (const w of liste) {
    if (wer.has(w.mandant)) continue;
    const m = await mandantLesen(w.mandant);
    wer.set(w.mandant, { name: m?.name ?? w.mandant, mail: String(m?.mail ?? "") });
  }
  /**
   * ── DER BEFUND REIST MIT (Owner 18.09.2026: „das muss als Chip") ────────────────────────────
   *
   * Liegt neben dem Bild ein `<nr>.befund.json` (aus `api/freigabe-befund`), kommt er hier mit
   * und die Seite hakt die passenden Gründe vor an. Fehlt er, ist das kein Fehler — dann
   * entscheidet der Owner ohne Vorschlag, so wie bisher.
   */
  const befunde = await Promise.all(liste.map(async w => {
    const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`versusforge-motiv-pruefung/${w.mandant}/${w.nr}.befund.json`)}`);
    if (!r.ok) return null;
    try { return (await r.json()) as { umgebung: number; schief: boolean; unscharf: boolean; spiegelung: boolean }; }
    catch { return null; }
  }));

  /**
   * ── OHNE ADRESSE GEHÖREN SIE NICHT IN DIESE LISTE (Owner 18.09.2026) ────────────────────────
   *
   * „Die ohne E-Mail musst du hier nicht auflisten, dafür kannst du mir eine Extraliste machen
   * zum Löschen."
   *
   * Das ist richtig, und zwar nicht nur der Übersicht wegen: Bei einem Künstler ohne Adresse
   * geht keine Absage raus. Er stünde zwischen den anderen, der Owner klickt „Ablehnen", die
   * Zählung sagt „2 Künstler bekommen eine Mail" — und einer erfährt nie, warum sein Bild weg
   * ist. Ein stiller Sonderfall mitten in einer Liste ist schlimmer als gar kein Eintrag.
   *
   * Es sind ausserdem fast alle Testkonten, und die will niemand einzeln durchklicken.
   */
  const mitMail = liste.filter(w => (wer.get(w.mandant)?.mail ?? "").includes("@"));
  const ohne = liste.filter(w => !(wer.get(w.mandant)?.mail ?? "").includes("@"));
  const ohneMail = [...new Set(ohne.map(w => w.mandant))].map(m => ({
    mandant: m,
    name: wer.get(m)?.name ?? m,
    bilder: ohne.filter(w => w.mandant === m).length,
  }));

  return NextResponse.json({
    ok: true,
    werke: mitMail.map(w => ({
      ...w,
      /* „neu" heisst: in den letzten 24 Stunden hochgeladen. Eine Zahl, keine Stimmung — und
         sie altert von selbst, ohne dass jemand ein Häkchen zurücksetzen muss. */
      neu: !w.bestand && !!w.zeit && Date.now() - Date.parse(w.zeit) < 24 * 3600 * 1000,
      ...(wer.get(w.mandant) ?? { name: w.mandant, mail: "" }),
      ...(befunde[liste.indexOf(w)] ? { befund: befunde[liste.indexOf(w)] } : {}),
    })),
    ohneMail,
    /* Auch ihre Bilder gehen mit — der eigene Reiter zeigt sie, sonst löscht der Owner blind
       (Owner 18.09.2026: „mach mir ein Tab für die Bilder ohne E-Mail"). */
    werkeOhneMail: ohne.map(w => ({
      ...w,
      ...(wer.get(w.mandant) ?? { name: w.mandant, mail: "" }),
      ...(befunde[liste.indexOf(w)] ? { befund: befunde[liste.indexOf(w)] } : {}),
    })),
  });
}

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as {
    s?: string;
    entscheidungen?: { mandant: string; nr: string; aktion: "frei" | "abgelehnt"; gruende?: string[]; notiz?: string }[];
  };
  if (!OK(String(b.s ?? ""))) return NextResponse.json({ ok: false }, { status: 403 });
  const liste = Array.isArray(b.entscheidungen) ? b.entscheidungen : [];
  if (!liste.length) return NextResponse.json({ ok: false, grund: "leer" }, { status: 400 });

  const loeschen = (pfad: string) => supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [pfad] }),
  });

  let frei = 0, ab = 0;
  /* Je Künstler die Liste seiner abgelehnten Werke — daraus wird EINE Mail. */
  const abgelehntJe = new Map<string, { titel: string; gruende: string[]; notiz?: string; bild?: Buffer }[]>();
  /* Die Titel stehen in seinen Werkangaben; einmal je Künstler geholt. */
  const angaben = new Map<string, Awaited<ReturnType<typeof mandantLesen>>>();
  const holen = async (k: string) => {
    if (!angaben.has(k)) angaben.set(k, await mandantLesen(k));
    return angaben.get(k) ?? null;
  };

  for (const e of liste) {
    const quelle = pruefPfad(e.mandant, e.nr);
    /**
     * ── DER MERKER „BESTAND" (Owner 18.09.2026: „mache alle Bilder rein, die wir schon haben") ─
     *
     * Für den Durchgang durch die BEREITS VERÖFFENTLICHTEN Werke werden die Bilder in die
     * Prüfung KOPIERT, nicht verschoben — sonst wären alle Künstlerseiten leer, bis der Owner
     * durch ist. Neben jede Kopie legt der Durchgang eine leere Datei `<nr>.bestand`.
     *
     * Sie entscheidet, was ein „Ablehnen" bedeutet:
     *   · MIT Merker — das Bild steht schon auf der Seite. Ablehnen nimmt es auch von dort weg,
     *     sonst hätte die Ablehnung keine Wirkung.
     *   · OHNE Merker — ein Künstler hat gerade etwas Neues hochgeladen. Ablehnen wirft NUR das
     *     Neue weg; was vorher auf seiner Seite stand, bleibt. Ohne diese Unterscheidung würde
     *     ein schlechtes neues Foto sein gutes altes mit in den Abgrund ziehen.
     */
    const merker = `${pruefPfad(e.mandant, e.nr).replace(/\.jpg$/, "")}.bestand`;
    const istBestand = (await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(merker)}`, { method: "HEAD" })).ok;

    if (e.aktion === "abgelehnt") {
      /**
       * ── ERST DAS BILD HOLEN, DANN LÖSCHEN (Owner 18.09.2026: „man sollte die Bilder
       * mitschicken, klein") ────────────────────────────────────────────────────────────────
       *
       * Die Absage trägt das Werk als kleines Bild im Text — sonst weiss er bei „Nr. 4" nicht,
       * welches gemeint ist. Danach ist es weg, also muss es JETZT gelesen werden.
       *
       * 320 Pixel und Qualität 72: gross genug zum Wiedererkennen, klein genug, dass eine Mail
       * mit zwölf Absagen nicht an der Grössengrenze eines Postfachs scheitert.
       *
       * Scheitert das Verkleinern, geht die Mail ohne Bild raus — eine Absage ohne Bild ist
       * besser als keine Absage.
       */
      let klein: Buffer | undefined;
      try {
        const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(quelle)}`);
        if (!r.ok) {
          console.warn(`[freigabe] Bild zum Mitschicken nicht gefunden: ${quelle} (${r.status})`);
        } else {
          const roh = Buffer.from(await r.arrayBuffer());
          /**
           * ── DAS BILD GEHT MIT, AUCH WENN DAS VERKLEINERN SCHEITERT (Owner 18.09.2026: „du
           * hast das Bild nicht mitgeschickt") ────────────────────────────────────────────────
           *
           * Vorher hing der Anhang am Gelingen von `sharp`. Scheitert das in der Cloud — andere
           * Architektur, fehlende Binärdatei, Speichergrenze —, fing mein `catch` es ab, und die
           * Mail ging STILL ohne Bild raus. Der Owner sah nur das Ergebnis: kein Bild.
           *
           * Jetzt ist das Verkleinern eine Verbesserung, keine Bedingung. Klappt es nicht, reist
           * das Originalbild mit, solange es unter einer Grenze bleibt, die ein Postfach annimmt.
           * Ein grosses Bild ist besser als keines.
           */
          try {
            const sharp = (await import("sharp")).default;
            klein = await sharp(roh)
              .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 72 })
              .toBuffer();
          } catch (err) {
            console.warn("[freigabe] Verkleinern fehlgeschlagen, schicke das Original:", err);
            if (roh.length <= 900_000) klein = roh;
          }
        }
      } catch (err) { console.warn("[freigabe] Bild fürs Mail nicht lesbar:", err); }

      /**
       * ── ABGELEHNT HEISST MARKIERT, NICHT GELÖSCHT (Owner 18.09.2026: „oder du musst das Bild
       * einfach nur deaktiviert markieren und er soll da austauschen" · „also nicht löschen") ──
       *
       * VORHER WURDE ES GELÖSCHT. Der Künstler sah danach in seinem Dashboard eine leere graue
       * Kachel mit „Schimbă imaginea" — und wusste nicht, welches Werk gemeint war und warum.
       * Die Stelle zum Tauschen war da, das Bild dazu nicht.
       *
       * Jetzt bleibt die Datei liegen, und daneben steht ein Zettel `<nr>.abgelehnt.json` mit
       * Datum und Gründen. Daraus wird im Dashboard eine Kachel, die SEIN Bild zeigt, rot
       * markiert ist und sagt, was fehlt. Öffentlich ist es trotzdem nicht: Die Prüfablage wird
       * nie ausgeliefert.
       *
       * VON DER SEITE KOMMT ES TROTZDEM WEG, wenn es dort stand (`istBestand`) — eine Ablehnung
       * ohne Wirkung wäre keine.
       */
      const zettel = `${quelle.replace(/\.jpg$/, "")}.abgelehnt.json`;
      const weg = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(zettel)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
        body: JSON.stringify({
          zeit: new Date().toISOString(),
          gruende: Array.isArray(e.gruende) ? e.gruende.slice(0, 8) : [],
          ...(e.notiz ? { notiz: String(e.notiz).slice(0, 300) } : {}),
        }),
      });
      if (istBestand) await loeschen(motivPfad(e.mandant, e.nr));
      await loeschen(merker);
      if (weg.ok) {
        ab++;
        const m = await holen(e.mandant);
        const wi = m?.werkInfo?.[e.nr] as { titel?: string } | undefined;
        const titel = String(wi?.titel ?? "").trim() || `Nr. ${e.nr}`;
        /**
         * ── DER VERMERK GEHÖRT AUCH IN DEN DATENSATZ (Owner 19.09.2026: „Maia Bild fehlt") ───
         *
         * Der Zettel oben liegt in der Prüfablage — für das Werkzeug richtig, fürs Portal
         * unbrauchbar: Die Startseite müsste dafür bei jedem Aufruf zweiundzwanzig Ordner
         * auflisten. Also hier ein Feld am Werk, wie `freiAm` beim Freigeben.
         *
         * OHNE DAS blieb Maias Kachel stehen, obwohl alle vier Fotos abgelehnt waren: Eine
         * Kachel entsteht aus dem SATZ (`werkKacheln` liest `hook`/`hooks`), nicht aus dem
         * Bild — und der Satz überlebt die Ablehnung. Der Besucher sah einen leeren Rahmen
         * mit ihrem Namen darunter.
         */
        if (m) {
          try {
            const alles = m.werkInfo ?? {};
            await mandantSpeichern(e.mandant, {
              ...m,
              werkInfo: { ...alles, [e.nr]: { ...(alles[e.nr] ?? {}), abgelehntAm: new Date().toISOString(), freiAm: undefined } },
            });
            angaben.delete(e.mandant);
          } catch (err) { console.warn("[freigabe] Ablehnungs-Vermerk nicht gespeichert:", e.mandant, e.nr, err); }
        }
        const bisher = abgelehntJe.get(e.mandant) ?? [];
        bisher.push({ titel, gruende: Array.isArray(e.gruende) ? e.gruende.slice(0, 8) : [], ...(e.notiz ? { notiz: String(e.notiz).slice(0, 300) } : {}), ...(klein ? { bild: klein } : {}) });
        abgelehntJe.set(e.mandant, bisher);
      }
      continue;
    }
    await loeschen(merker);
    /* Freigeben: erst den Platz räumen, dann verschieben — Verschieben überschreibt nicht. */
    await loeschen(motivPfad(e.mandant, e.nr));
    const v = await supabaseFetch("/storage/v1/object/move", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId: BUCKET, sourceKey: quelle, destinationKey: motivPfad(e.mandant, e.nr) }),
    });
    if (v.ok) {
      frei++;
      /**
       * ── WANN DU ES FREIGEGEBEN HAST (Owner 18.09.2026: „das Neueste ist das, was ich zuletzt
       * freigegeben habe") ──────────────────────────────────────────────────────────────────
       *
       * Die Startseite sortierte nach dem ANMELDEDATUM DES KÜNSTLERS — wer sich im Juli
       * angemeldet hat, stand mit einem heute freigegebenen Werk trotzdem hinten. „Neu" heisst
       * aber: gerade hereingekommen, gerade freigegeben.
       *
       * Der Zeitpunkt wird HIER geschrieben, nicht beim Rendern gelesen: Sonst müsste die
       * Startseite bei jedem Aufruf zweiundzwanzig Ordner auflisten, nur um eine Reihenfolge zu
       * bestimmen. Einmal schreiben, immer billig lesen.
       */
      try {
        const m = await holen(e.mandant);
        if (m) {
          const wi = m.werkInfo ?? {};
          await mandantSpeichern(e.mandant, {
            ...m,
            /**
             * ── WER EIN WERK FREIGIBT, GIBT DEN KÜNSTLER FREI (Owner 19.09.2026: „ich habe gerade
             * ein neues Profil freigegeben, der erscheint nirgendwo") ────────────────────────────
             *
             * ZWEI SCHALTER, EINER DAVON UNSICHTBAR. Ein Künstler erscheint im Portal nur mit
             * `freigabe: "frei"` UND `portal: true` (`imPortalSichtbar`). Diese beiden setzt bis
             * heute allein `api/versusforge-freigabe` — der Knopf in der Anmelde-Mail. Wer
             * stattdessen hier, in der Bilder-Freigabe, alle seine Werke durchwinkte, hatte den
             * Künstler in seinem Kopf freigegeben und im Datensatz nicht: Die Bilder lagen in der
             * Galerie, und die Seite zeigte ihn trotzdem nirgends.
             *
             * GEMESSEN am 19.09.2026 an „Caricaturist AI": fünf Werke in der Galerie, Abo bezahlt,
             * `freigabe: "offen"`, `portal: false` — unsichtbar auf jeder Fläche.
             *
             * EIN JA ZU SEINEM WERK IST DAS JA ZU IHM. Etwas anderes kann ein Freigeben hier nicht
             * bedeuten; es gibt in diesem Werkzeug keinen zweiten Sinn. Der Weg zurück bleibt, wo
             * er war: „Offline nehmen" auf seiner Seite.
             *
             * ABLEHNEN TUT DAS NICHT — dort unten wird nichts freigeschaltet. Wer alles ablehnt,
             * lässt den Künstler, wo er war.
             */
            ...(m.freigabe === "frei" ? {} : { freigabe: "frei" as const, freigabeAm: new Date().toISOString() }),
            portal: true,
            /* `abgelehntAm` fällt weg: Wer jetzt freigegeben ist, ist nicht mehr abgelehnt. */
            werkInfo: { ...wi, [e.nr]: { ...(wi[e.nr] ?? {}), freiAm: new Date().toISOString(), abgelehntAm: undefined } },
          });
          angaben.delete(e.mandant);
        }
      } catch (err) { console.warn("[freigabe] Freigabe-Zeitpunkt nicht gespeichert:", e.mandant, e.nr, err); }
    } else console.error("[freigabe] Verschieben gescheitert:", e.mandant, e.nr, v.status);
  }

  /**
   * ── EINE MAIL JE KÜNSTLER, NACH ALLEN ENTSCHEIDUNGEN ────────────────────────────────────────
   *
   * Erst wird alles verschoben und gelöscht, dann geschrieben. Andersherum bekäme jemand die
   * Absage, während seine anderen Werke noch in der Schleife hängen — und ein Fehler mitten
   * darin hätte eine Mail hinterlassen, zu der es keinen Zustand gibt.
   */
  let post = 0;
  for (const [mandant, werke] of abgelehntJe) {
    const m = await holen(mandant);
    const an = String(m?.mail ?? "");
    if (!an.includes("@")) { console.warn("[freigabe] ohne Adresse, keine Absage:", mandant); continue; }
    /* Im Protokoll steht, wie viele Bilder wirklich mitgehen — ohne das ist „das Bild fehlt"
       nicht von „die Mail kam nicht an" zu unterscheiden. */
    console.info(`[freigabe] Absage an ${mandant}: ${werke.length} Werk(e), davon ${werke.filter(w => w.bild).length} mit Bild`);
    const ok = await werkeAbgelehntPerPost({
      an, mandant, schluessel: String(m?.schluessel ?? ""), sprache: m?.sprache, werke,
    }).catch(e => { console.error("[freigabe] Absage-Mail fehlgeschlagen:", e); return false; });
    if (ok) post++;
  }

  /**
   * ── DIE ANTWORT SAGT, WAS WIRKLICH IN DER MAIL STAND (Owner 18.09.2026: „doch, ich habe einen
   * Chip angehakt: es passt nicht") ───────────────────────────────────────────────────────────
   *
   * Er hat einen Grund angeklickt, in der Mail stand keiner — und von aussen ist nicht zu
   * unterscheiden, ob der Browser ihn nicht geschickt, die Route ihn verloren oder die Mail ihn
   * nicht gesetzt hat. Statt zu raten, gibt die Route zurück, womit sie gearbeitet hat: Die
   * Seite zeigt es direkt neben dem Senden-Knopf.
   *
   * Das bleibt drin. Es kostet nichts und beantwortet dieselbe Frage beim nächsten Mal in einer
   * Sekunde statt in einer halben Stunde.
   */
  const belegt = [...abgelehntJe.entries()].map(([m, w]) =>
    `${m}: ${w.map(x => `${x.titel} [${x.gruende.join("+") || "OHNE GRUND"}]${x.bild ? " +Bild" : " OHNE BILD"}`).join(", ")}`);
  return NextResponse.json({ ok: true, frei, abgelehnt: ab, mails: post, belegt });
}

/**
 * ── EINEN KÜNSTLER GANZ LÖSCHEN (Owner 18.09.2026: „dafür kannst du mir eine Extraliste machen
 * zum Löschen") ──────────────────────────────────────────────────────────────────────────────
 *
 * Nur für die Liste ohne Adresse gedacht — dort stehen die Testkonten und die Anmeldungen, die
 * nie zu Ende gegangen sind.
 *
 * `mandantLoeschen` räumt ALLES weg: Datensatz, Werke, Profilbild, Bilder in der Prüfung und
 * die Besucherschritte. Es meldet `false`, statt halb zu löschen — lieber ehrlich scheitern.
 *
 * ES GEHT NICHT ZURÜCK. Deshalb verlangt die Seite zwei Tipps ([[loeschen-zwei-tipps-rot]]) und
 * nennt vorher den Namen, den sie löscht.
 */
export async function DELETE(request: Request) {
  const b = (await request.json().catch(() => ({}))) as { s?: string; mandant?: string };
  if (!OK(String(b.s ?? ""))) return NextResponse.json({ ok: false }, { status: 403 });
  const mandant = String(b.mandant ?? "").replace(/[^a-z0-9-]/gi, "");
  if (!mandant) return NextResponse.json({ ok: false, grund: "leer" }, { status: 400 });
  /* Wer eine Adresse hat, wird hier nicht gelöscht — dieser Weg ist nur für die Extraliste. */
  const m = await mandantLesen(mandant);
  if (String(m?.mail ?? "").includes("@")) return NextResponse.json({ ok: false, grund: "hat-mail" }, { status: 400 });
  const ok = await mandantLoeschen(mandant);
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
