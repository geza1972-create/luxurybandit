import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen, mandantSpeichern, type WerkInfo } from "@/lib/versusforge-mandanten";
import { istKuenstler } from "@/lib/lakatosbandi";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import { introLoeschen, introsVorab } from "@/lib/kuenstler-agent-intro";
import { spruecheNachtragen } from "@/lib/kuenstler-sprueche";
import { profilNachtragen } from "@/lib/kuenstler-profil";
import { neuesWerkAnFollower } from "@/lib/versusforge-folgen-neu-post";
import { after } from "next/server";
import { preisText } from "@/lib/lakatosbandi-preis";
import { ereignisMerken } from "@/lib/versusforge-ereignis";
import { darfKi, werkeGrenze } from "@/lib/versusforge-abo";

/**
 * SEINE SEITE SPEICHERN (Owner 11.09.2026: „Dann wird er den Link bekommen, dass er öffnen und es ergänzen
 * kann. Profilbild hochladen, Text über sich …" · „er muss es dort bearbeiten. WYSIWYG").
 *
 * Nur mit seinem Dashboard-Schlüssel. Hier gehen nur TEXTE durch — Name, Ort, Über mich, die Sprüche und
 * Titel · Technik · Größe · Jahr je Kachel. Bilder laufen weiter über `api/versusforge-bild` (mit der
 * Inhaltsprüfung), die Ablage ist dort die Wahrheit.
 *
 * DIE KACHEL-NUMMERN BLEIBEN STABIL: Kachel i gehört zu Motiv Nr. i. Wird eine entfernt, bleibt ihr Platz
 * in `hooks` leer statt nachzurücken — sonst stünde unter Bild 3 plötzlich der Spruch von Bild 4.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ── „@name" IST AUCH EINE ADRESSE (Owner 13.09.2026: „Feld für Instagram oder Facebook") ─────
 *
 * Künstler tippen ihren Namen, nicht eine URL. Wer das mit einer Fehlermeldung abweist, baut
 * dieselbe stumme Hürde wie der Hochladen-Knopf heute morgen. Also: `@name` und `name` werden zu
 * `https://instagram.com/name`, eine vollständige Adresse bleibt, wie sie ist — und was gar keine
 * Adresse sein kann, wird zu "" statt zu einem toten Link auf der öffentlichen Seite.
 */
function sozialeAdresse(roh: string, haus: string): string {
  const wert = roh.trim().replace(/\s+/g, "");
  if (!wert) return "";
  if (/^https?:\/\//i.test(wert)) {
    try {
      const u = new URL(wert);
      /**
       * NUR DAS EIGENE HAUS (GEPRÜFT 13.09.2026): Vorher ging JEDE vollständige Adresse durch —
       * `https://evil.example.com/phish` wäre als „Instagram" auf seiner Seite gelandet. Ein Link,
       * der Instagram heisst und woandershin führt, ist genau das, was Besuchern später zu Recht
       * übel aufstösst. Fremde Adresse: lieber nichts als ein falsch beschrifteter Weg.
       */
      const erlaubt = u.hostname.replace(/^www\./i, "").toLowerCase();
      if (erlaubt !== haus && !erlaubt.endsWith(`.${haus}`)) return "";
      return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
    } catch { return ""; }
  }
  /* Nur Name oder @Name — alles andere (Leerzeichen, Sonderzeichen) fällt vorher schon weg. */
  const name = wert.replace(/^@/, "").replace(/^(www\.)?(instagram|facebook)\.com\//i, "");
  return /^[A-Za-z0-9._-]{1,60}$/.test(name) ? `https://${haus}/${name}` : "";
}

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mandant = str(b.mandant, 80);
  const m = mandant ? await mandantLesen(mandant) : null;
  if (!m || !istKuenstler(m)) return NextResponse.json({ ok: false }, { status: 404 });
  if (!schluesselStimmt(m.schluessel, str(b.k, 200))) return NextResponse.json({ ok: false }, { status: 403 });

  const zeile = (v: unknown, max: number) => str(v, max).replace(/\s+/g, " ").trim();
  /**
   * ── DIE BILDGRENZE GILT JETZT AUCH HIER (Owner 14.09.2026: „auch mehr wie 10 Bilder ist
   * Premium") ────────────────────────────────────────────────────────────────────────────────
   *
   * Hier stand eine feste 13, während der Browser bei 10 sperrte. Eine Grenze, die nur im
   * Browser steht, ist keine Grenze: Wer die Route direkt anspricht, hängt sich drei Werke mehr
   * hin. Ab jetzt entscheidet das Abo — und zwar auf dem Server.
   */
  const kacheln = (Array.isArray(b.kacheln) ? b.kacheln : []).slice(0, werkeGrenze(m))
    .map(x => (x ?? {}) as Record<string, unknown>)
    .map(x => ({
      i: Math.round(Number(x.i)),
      spruch: zeile(x.spruch, 280),
      info: {
        titel: zeile(x.titel, 120), technik: zeile(x.technik, 120), groesse: zeile(x.groesse, 60), jahr: zeile(x.jahr, 12),
        /* Seine Geschichte zum Werk — Stoff für seinen Agenten (Owner 11.09.2026). */
        geschichte: str(x.geschichte, 800).trim(),
        /* Sein Preis für DIESES Werk, freiwillig und so, wie er ihn schreibt (Owner 12.09.2026:
           „wenn der künstler die preise genau einträgt bei seinen werken, dann erscheint das").
           Leer heisst: An diesem Bild steht sein allgemeiner Satz. */
        preis: preisText(x.preis),
        detalii: zeile(x.detalii, 160),
        /* Welches Werk ihn vertritt (Owner 12.09.2026) — muss hier mitgeführt werden, sonst
           verschwindet das Häkchen beim Speichern: Diese Liste ist eine Whitelist, nicht ein
           Durchreichen. Dass nur EINES gesetzt ist, stellt das Formular sicher. */
        vertritt: x.vertritt === true,
      } as WerkInfo,
    }))
    .filter(x => Number.isInteger(x.i) && x.i >= -1 && x.i <= 11);

  /**
   * ── WELCHE WERKE SIND WIRKLICH NEU (Owner 13.09.2026: die Follow-Mail bauen) ───────────────
   *
   * JETZT, VOR DEM SPEICHERN: `m` trägt noch den alten Stand. Nach `mandantSpeichern` sähe jedes
   * Werk neu aus, und jeder Follower bekäme bei jedem Speichern Post.
   *
   * NUR HINZUGEKOMMENE NUMMERN zählen — ein korrigierter Titel, ein nachgetragener Preis oder
   * ein getauschtes Bild lösen nichts aus. Das Standardmotiv (-1) bleibt aussen vor: Es stammt
   * aus dem Trichter und ist nie eine Neuigkeit für jemanden, der danach gefolgt ist.
   */
  const vorherNummern = new Set(Array.isArray(m.werkNummern) ? m.werkNummern : []);
  const neueWerke = kacheln.map(x => x.i).filter(i => i >= 0 && !vorherNummern.has(i));

  const standard = kacheln.find(x => x.i === -1);
  const hoechste = Math.max(-1, ...kacheln.map(x => x.i));
  const hooks = Array.from({ length: hoechste + 1 }, (_, j) => kacheln.find(x => x.i === j)?.spruch ?? "");
  const werkInfo: Record<string, WerkInfo> = {};
  for (const x of kacheln) werkInfo[x.i < 0 ? "standard" : String(x.i)] = x.info;

  const gespeichert = await mandantSpeichern(mandant, {
    ...m,
    name: zeile(b.name, 80) || m.name,
    ort: zeile(b.ort, 80),
    ueberMich: str(b.ueberMich, 1200).trim(),
    /* Was seine Werke kosten — ein Satz für alle Bilder (Owner 12.09.2026). */
    preisSpanne: preisText(b.preisSpanne),
    profilBild: b.profilBild === true || !!m.profilBild,
    /* Aus „@name", „name" oder einer vollen Adresse wird eine gültige Adresse — auf dem SERVER,
       nicht im Browser: Was von dort kommt, ist eine Behauptung (Owner 13.09.2026). */
    instagram: sozialeAdresse(str(b.instagram, 200), "instagram.com"),
    facebook: sozialeAdresse(str(b.facebook, 200), "facebook.com"),
    hook: standard?.spruch ?? "",
    hooks,
    werkInfo,
    werkNummern: kacheln.map(x => x.i),
  });
  /* Was sein Agent zu den Werken sagt, wird mit den neuen Angaben neu geschrieben (lib/kuenstler-agent-intro.ts). */
  if (gespeichert) await introLoeschen(mandant);
  /* …und gleich im Hintergrund neu geschrieben, damit der nächste Besucher nicht wartet (Owner 11.09.2026: „er ist zu langsam"). */
  /**
   * ERST DIE SÄTZE, DANN DIE AGENTEN-TEXTE (Owner 12.09.2026: „Grosser Button lade Bilder hoch,
   * save. Dann wird alles angelegt").
   *
   * Ein im Profil hinzugefügtes Werk hatte bisher keinen Satz unter dem Bild — den schrieb nur
   * der Trichter. `spruecheNachtragen` holt das nach; `introsVorab` läuft DANACH, weil es die
   * Sätze als Zutat liest. Beides im Hintergrund: Er hat gespeichert und wartet nicht.
   */
  /**
   * ── OHNE ABO LÄUFT HIER KEINE KI MEHR (Owner 14.09.2026: „es wird keine KI-Texte generiert,
   * wenn jemand in seinem Homepagetool Bilder hochlädt. Es sei denn, er hat ein Premium-Abo") ──
   *
   * Das war die teuerste Stelle im Haus, und niemand sah sie: Ein Klick auf „Speichern" startete
   * `spruecheNachtragen`, `profilNachtragen` (gpt-5) und `introsVorab` (gpt-5 für JEDES Werk in
   * DREI Sprachen). Bei zehn Werken sind das bis zu dreissig teure Aufrufe — ausgelöst von
   * jemandem, der nur ein Bild hochgeladen hat.
   *
   * DIE FOLLOWER-MAIL BLEIBT: Sie ist keine KI und kostet nichts. Wer ihm folgt, soll erfahren,
   * dass es ein neues Werk gibt — auch wenn er nicht zahlt.
   */
  if (gespeichert) after(async () => {
    if (!darfKi(m)) {
      if (neueWerke.length) {
        await neuesWerkAnFollower({ mandant, kuenstler: m.name, neu: neueWerke })
          .catch(e => console.warn("[portal-profil] Follower-Mail gescheitert:", e));
      }
      return;
    }
    await spruecheNachtragen(mandant).catch(e => console.warn("[portal-profil] Sätze gescheitert:", e));
    /* NACH den Sätzen: `spruecheNachtragen` legt die Bildbefunde an, aus denen die Beschreibung
       entsteht. Davor gäbe es bei einem frisch hochgeladenen Werk nichts zu beschreiben. */
    await profilNachtragen(mandant).catch(e => console.warn("[portal-profil] Beschreibung gescheitert:", e));
    /* ZULETZT DIE FOLLOWER: Erst jetzt hat das neue Werk seinen Satz, und das Bild liegt
       ausgeliefert bereit. Die Funktion bremst sich selbst auf eine Mail je Künstler und Tag. */
    if (neueWerke.length) {
      await neuesWerkAnFollower({ mandant, kuenstler: m.name, neu: neueWerke })
        .catch(e => console.warn("[portal-profil] Follower-Mail gescheitert:", e));
    }
    await introsVorab(mandant);
  });
  /* Ins Ereignisprotokoll, damit der Owner im Dashboard sieht, was passiert (Owner 14.09.2026:
     „ich will auch wissen was jeder macht in dem portal"). `void`: hält nie das Speichern auf. */
  if (gespeichert) {
    void ereignisMerken(mandant, String(m.name ?? ""), "profilGespeichert");
    if (neueWerke.length) void ereignisMerken(mandant, String(m.name ?? ""), "werkHochgeladen", neueWerke.length);
  }
  return NextResponse.json({ ok: gespeichert }, { status: gespeichert ? 200 : 502 });
}
