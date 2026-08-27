import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { leseLebenslauf, schreibeLebenslauf, loescheLebenslauf, type LebenslaufProfil } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";
import { anzeigenTextBeschaffen } from "@/lib/lebenslauf-anzeige";
import { isAdminRequest } from "@/lib/admin-auth";
import { leseChance, chanceIstVeroeffentlichbar } from "@/lib/job-chancen";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * MULTI-BEWERBUNG — DIE ERZEUGUNG (Owner 25.08.2026, Konzept im Memory
 * `multi-bewerbung-konzept`): Aus dem Anzeigen-Match heraus entsteht je Stellenanzeige eine
 * ZUGESCHNITTENE Bewerbung — eine vollständige Profil-Kopie mit eigener Adresse (`basisId`
 * zeigt aufs Hauptprofil). Das Hauptprofil bleibt unangetastet: Wer eine Bewerbung
 * verschickt, verschickt deren Link, nicht sein Profil.
 *
 * DAS TOR (Owner, nach mehreren Drehungen festgenagelt): Match prüfen ist gratis, die ERSTE
 * Bewerbung ist gratis (Probe, Zähler `bewerbungenErzeugt` am Hauptprofil — Löschen gibt
 * die Probe nicht zurück), jede weitere braucht das bestehende 4,99-Abo (`aboAktiv`).
 * Keine neue Abrechnungstechnik — genau die Owner-Sorge („unglaublich kompliziert"):
 * Es ist EINE Wenn-Abfrage auf einem Häkchen, das der Abo-Webhook längst pflegt.
 *
 * BILD STATT VIDEO: Die Kopie übernimmt `videoUrl` nicht — die Videobewerbung ist der
 * spätere Zusatzkauf (Stufe 3), und das alte Video spräche ohnehin den alten Text.
 *
 * ZUSCHNEIDEN HEISST AUSWÄHLEN UND BETONEN, NIE ERFINDEN (dieselbe Vertrauensregel wie die
 * Vorlage selbst): Stationen, Zeiträume, Firmen, Ausbildung, Sprachen und Zahlen sind
 * unantastbar — die KI formuliert nur Sprechtext, Schwerpunkte, Kompetenz-Reihenfolge,
 * Ergebnis-Zeilen und die Positionierung um und schreibt das Anschreiben dazu.
 *
 * GET    ?id=…&device=…  → Hauptprofil: { darf, liste, probeFrei, aboAktiv }
 *                          Bewerbung:   { darf, basisId, anzeigeTitel, …, anschreiben }
 * POST   { id, eingabe, device?, prozent? } → erzeugt und liefert { id, url }
 * POST   { duplizieren: <bewerbungsId>, device? } → KOPIERT eine Bewerbung (Owner
 *        25.08.2026: „Bewerbung duplizieren") — reine Kopie, kein KI-Lauf; dasselbe
 *        Probe/Abo-Tor wie das Erzeugen, denn eine Kopie IST eine weitere Bewerbung.
 * DELETE { id, device? } → löscht EINE Bewerbung (nie ein Hauptprofil)
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  const device = String(url.searchParams.get("device") ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ darf: false });
  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ darf: false });
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ darf: false }, { headers: { "Cache-Control": "no-store" } });
  }
  if (profil.basisId) {
    return NextResponse.json({
      darf: true,
      basisId: profil.basisId,
      anzeigeTitel: profil.anzeigeTitel ?? "",
      anzeigeFirma: profil.anzeigeFirma ?? "",
      matchProzent: typeof profil.matchProzent === "number" ? profil.matchProzent : null,
      anschreiben: profil.anschreiben ?? "",
      viewCount: profil.viewCount ?? 0,
      videoKlicks: profil.videoKlicks ?? 0,
      /* Fuer den Video-Einstieg des Tunnels (?video=<kennung>): das Skript der Bewerbung
         als Startwert des Skript-Schritts. Nur hinter darfAmProfilArbeiten — ein Fremder
         bekommt { darf: false } und nie den Text. */
      sprechtext: profil.sprechtext ?? "",
      interesseKlicks: profil.interesseKlicks ?? 0,
      anfragen: profil.anfragen ?? [],
      /* Fuer den Kopier-Schutz am Anschreiben (Gratis-Linie, Owner 25.08.2026). */
      bezahlt: profil.bezahlt === true,
    }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({
    darf: true,
    liste: profil.bewerbungen ?? [],
    /* Das Bild für die Listen-Karten (Owner 25.08.2026: „mit Bild und abgekürzt") — alle
       Bild-Bewerbungen tragen das Porträt des Hauptprofils; EIN Feld statt je Eintrag. */
    foto: profil.fotoUrl ?? "",
    probeFrei: (profil.bewerbungenErzeugt ?? 0) === 0,
    aboAktiv: profil.aboAktiv === true,
    sprechtext: profil.sprechtext ?? "",   // Video-Einstieg, siehe Versionen-Zweig oben
    interesseKlicks: profil.interesseKlicks ?? 0,
    anfragen: profil.anfragen ?? [],

  }, { headers: { "Cache-Control": "no-store" } });
}

type Einstufung = "erfuellt" | "uebertragbar" | "erklaerbar" | "blocker";
type Empfehlung = "gut" | "bruecke" | "schwach";
/** Die Struktur-Analyse aus /api/lebenslauf-match (Baustelle A), unverändert
    durchgereicht — diese Route rechnet sie NICHT neu, sie nutzt sie nur als Kontext
    für die Strategie. */
type AnalyseEingang = { empfehlung?: string; anforderungen?: { text?: string; einstufung?: string; begruendung?: string }[] };

type Strategie = {
  staerksteArgumente?: string[]; uebertragbar?: string[]; zuErklaeren?: string[];
  betonen?: string[]; wenigerBetonen?: string[]; sprachvorteile?: string[]; nieVerstecken?: string[];
};

type Zuschnitt = {
  strategie?: Strategie;
  positionierung?: string; sprechtext?: string;
  schwerpunkte?: string[]; kompetenzen?: string[];
  ergebnisse?: { i?: number; ergebnis?: string }[];
  anschreiben?: string; anzeigeTitel?: string; anzeigeFirma?: string;
};

function extractJson(text: string): Zuschnitt | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as Zuschnitt; } catch { return null; }
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const device = String(body.device ?? "").trim().slice(0, 80);

  /* ── DUPLIZIEREN (Owner 25.08.2026) — reine Kopie einer bestehenden Bewerbung, kein
     KI-Lauf. Das Tor gilt trotzdem: Eine Kopie ist eine weitere Bewerbung. ── */
  const duplizieren = String(body.duplizieren ?? "").trim();
  if (duplizieren) {
    const quelle = await leseLebenslauf(duplizieren);
    if (!quelle?.basisId) return NextResponse.json({ error: "Nur Bewerbungen können dupliziert werden." }, { status: 400 });
    const basisD = await leseLebenslauf(quelle.basisId);
    if (!basisD || basisD.basisId) return NextResponse.json({ error: "Hauptprofil nicht gefunden." }, { status: 404 });
    if (!(await darfAmProfilArbeiten(basisD, device, request))) {
      return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    const adminD = await isAdminRequest(request).catch(() => false);
    const erzeugtD = basisD.bewerbungenErzeugt ?? 0;
    if (!adminD && erzeugtD >= 1 && basisD.aboAktiv !== true) {
      return NextResponse.json({ aboNoetig: true, error: "Die Probe-Bewerbung ist verbraucht — weitere gibt es mit dem Abo." }, { status: 402 });
    }
    const kopieId = randomUUID();
    const kopie: LebenslaufProfil = { ...quelle, id: kopieId, erstelltAm: new Date().toISOString() };
    if (!(await schreibeLebenslauf(kopie))) {
      return NextResponse.json({ error: "Kopie konnte nicht gespeichert werden." }, { status: 500 });
    }
    const frischD = (await leseLebenslauf(basisD.id)) ?? basisD;
    await schreibeLebenslauf({
      ...frischD,
      bewerbungen: [
        ...(frischD.bewerbungen ?? []),
        { id: kopieId, titel: quelle.anzeigeTitel || "Bewerbung", firma: quelle.anzeigeFirma, erstelltAm: kopie.erstelltAm, prozent: quelle.matchProzent },
      ],
      bewerbungenErzeugt: erzeugtD + 1,
    });
    return NextResponse.json({ id: kopieId, url: `/lebenslauf/${kopieId}`, titel: quelle.anzeigeTitel || "", erstelltAm: kopie.erstelltAm });
  }

  const id = String(body.id ?? "").trim();
  const eingabe = String(body.eingabe ?? "").trim().slice(0, 4000);
  /* DER JOBCHANCEN-EINGANG (Tür 2, Baustelle E/F): statt `eingabe` darf der Body eine
     `chanceId` tragen — die Anzeige kommt dann aus dem Pool, nicht vom Bewerber.
     `analyse` ist die Struktur-Analyse aus /api/lebenslauf-match, unverändert
     durchgereicht (keine zweite Analyse hier). Beide sind optional — Alt-Aufrufer
     (ProfilAssistent, Tür 1) senden weder das eine noch das andere. */
  const chanceId = String(body.chanceId ?? "").trim();
  const analyse = (body.analyse && typeof body.analyse === "object") ? (body.analyse as AnalyseEingang) : null;
  const prozent = Number.isFinite(Number(body.prozent)) ? Math.max(0, Math.min(100, Math.round(Number(body.prozent)))) : undefined;
  if (!id || (!eingabe && !chanceId)) return NextResponse.json({ error: "Kennung oder Anzeige fehlt." }, { status: 400 });

  /* IMMER VOM HAUPTPROFIL AUS (auch wenn der Aufruf von einer Bewerbungs-Seite käme):
     Ketten von Kopien einer Kopie gäbe es sonst — und das Tor (Probe/Abo) hängt am Basis-
     Zähler, der nur am Hauptprofil lebt. */
  const angefragt = await leseLebenslauf(id);
  if (!angefragt) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  const basis = angefragt.basisId ? await leseLebenslauf(angefragt.basisId) : angefragt;
  if (!basis || basis.basisId) return NextResponse.json({ error: "Hauptprofil nicht gefunden." }, { status: 404 });
  if (!(await darfAmProfilArbeiten(basis, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  /* DAS TOR — der Admin testet am Tor vorbei (Memory `admin-testet-den-kaufweg-nicht`).
     TÜR 2 IST KOMPLETT KOSTENLOS (Owner-Änderungsauftrag 26.08.2026): eine `chanceId`
     passiert OHNE dieses Tor und OHNE den Probe-Zähler zu ziehen — sie ist
     Akquisitionsaufwand, kein Produktkauf, und darf den Probe-Anspruch eines späteren
     Tür-1-Kaufs nicht verbrauchen. Stattdessen gilt unten der eigene Deckel „höchstens
     eine Mappe je Chance". */
  const admin = await isAdminRequest(request).catch(() => false);
  if (!chanceId) {
    const erzeugt = basis.bewerbungenErzeugt ?? 0;
    if (!admin && erzeugt >= 1 && basis.aboAktiv !== true) {
      return NextResponse.json({ aboNoetig: true, error: "Die Probe-Bewerbung ist verbraucht — weitere gibt es mit dem Abo." }, { status: 402 });
    }
  }

  let anzeigeText = "";
  let chanceRolle = "";
  if (chanceId) {
    const chance = await leseChance(chanceId);
    if (!chance || !chanceIstVeroeffentlichbar(chance)) {
      return NextResponse.json({ error: "Chance nicht gefunden." }, { status: 404 });
    }
    anzeigeText = chance.intern.originalText?.trim()
      || [chance.rolle, chance.kurzbeschreibung, ...chance.anforderungen].filter(Boolean).join("\n");
    chanceRolle = chance.rolle;
  } else {
    const anzeige = await anzeigenTextBeschaffen(eingabe);
    if (!anzeige.text) return NextResponse.json({ error: anzeige.fehler ?? "Keine Anzeige erkannt." }, { status: 422 });
    anzeigeText = anzeige.text;
  }

  /* HÖCHSTENS EINE MAPPE JE KANDIDAT UND CHANCE (Änderung 1, Missbrauchs-Deckel statt
     Paywall): ein zweiter Lauf auf dieselbe Chance ERSETZT die bestehende Version. */
  const bestehendeVersion = chanceId ? (basis.bewerbungen ?? []).find(b => b.chanceId === chanceId) : undefined;

  /* Erfahrung mit Index, damit die KI NUR die Ergebnis-Zeile je Station zurückgibt —
     Rolle/Firma/Zeitraum kann sie so gar nicht erst verändern. */
  const daten = {
    sprechtext: basis.sprechtext ?? "",
    kategorien: basis.kategorien ?? [],
    kompetenzen: basis.kompetenzen ?? [],
    schwerpunkte: basis.schwerpunkte ?? [],
    erfahrung: (basis.erfahrung ?? []).map((e, i) => ({ i, rolle: e.rolle, firma: e.firma ?? "", zeitraum: e.zeitraum, ergebnis: e.ergebnis ?? "" })),
    ausbildung: basis.ausbildung ?? [],
    sprachen: basis.sprachen ?? [],
    name: basis.name ?? "",
    ort: basis.ort ?? "",
  };

  const prompt = [
    "Du bereitest die Bewerbung eines Kandidaten auf EINE konkrete Stelle vor und schreibst das Anschreiben dazu. Profildaten als JSON:",
    JSON.stringify(daten),
    `Die Stellenanzeige:\n${anzeigeText}`,
    ...(analyse ? [`Ehrliche Match-Analyse für diese Stelle, bereits mit dem Bewerber geteilt (nutze sie als Kontext, rechne sie nicht neu): ${JSON.stringify(analyse)}`] : []),
    // QUELLEN-COMPLIANCE (Baustelle D/E, gilt auch fürs Anschreiben — höheres Risiko als
    // die Kurz-Analyse, weil hier ganze Sätze aus dem Originaltext entstehen könnten).
    ...(chanceId ? ["Diese Stellenanzeige ist eine interne Markt-Chance. Nenne NIRGENDS in deiner Antwort — auch nicht im Anschreiben — einen Firmennamen, eine Marke oder ein Unternehmen aus dem Text. Sprich immer nur von \"dieser Stelle\"/\"der Position\". Das Anschreiben richtet sich an den TYP der Stelle, nicht an eine konkrete Firma: neutrale Anrede, kein Firmenname."] : []),
    "ZUSCHNEIDEN HEISST AUSWÄHLEN UND BETONEN, NIE ERFINDEN. Alles, was du schreibst, muss durch die Profildaten belegt sein. Lücken gegenüber der Anzeige werden NICHT weggelogen und nicht beschönigt.",
    // DIE STRATEGIE ZUERST (Baustelle C, Owner-Auftrag: „This strategy must drive both
    // the CV and cover letter" — keine von ihr unabhängige Erzählung in sprechtext/anschreiben).
    "Leite ZUERST 'strategie' ab — sie muss sprechtext, anschreiben und die Betonung unten TRAGEN: {\"staerksteArgumente\":[bis 5 stärkste Gründe, warum der Kandidat passt],\"uebertragbar\":[bis 6 übertragbare Kompetenzen],\"zuErklaeren\":[bis 5 Lücken, die die Bewerbung offen adressieren muss — inkl. Umzug/Branchenwechsel falls zutreffend, je EIN Satz],\"betonen\":[bis 4 Erfahrungen mit mehr Gewicht],\"wenigerBetonen\":[bis 4 Erfahrungen mit weniger Gewicht],\"sprachvorteile\":[bis 3 Sprachvorteile],\"nieVerstecken\":[bis 3 echte Lücken, die NICHT versteckt werden dürfen]}.",
    "'positionierung' — EINE kurze Zeile (Jobbezeichnung/Ausrichtung) unter dem Namen, die zur Anzeige passt, ABER NUR, wenn die Erfahrung sie wirklich trägt. Trägt sie sie nicht, gib einen leeren String.",
    "'sprechtext' — der Profiltext (80–120 Wörter, erste Person, DIESELBE Sprache wie der bisherige sprechtext), der DIESER Strategie folgt: führe mit dem, was die Anzeige verlangt und das Profil belegt.",
    "'schwerpunkte' — 3–4 kurze Arbeitsfelder, auf die Anzeige hin ausgewählt/umformuliert (keine Jobtitel).",
    "'kompetenzen' — 4–6 Begriffe aus den vorhandenen Kompetenzen, die für DIESE Anzeige stärksten zuerst (umsortieren und straffen erlaubt, erfinden nicht).",
    "'ergebnisse' — je Station optional eine neu betonte Ergebnis-Zeile: [{\"i\":0,\"ergebnis\":\"…\"}]. NUR umformulieren/betonen, was in der Station schon steht; Stationen ohne Änderung weglassen.",
    // DAS ANSCHREIBEN — DIE TON-REGELN FÜR DEN QUEREINSTIEG (Owner-Auftrag, Beispiel-
    // Sätze wörtlich übernommen).
    "'anschreiben' — ein vollständiges Anschreiben (150–250 Wörter) IN DER SPRACHE DER ANZEIGE, das der Strategie folgt: konkreter Bezug auf 2–3 Anforderungen der Anzeige, je mit Beleg aus dem Profil. JEDE Lücke aus 'zuErklaeren' wird OFFEN in 1–2 Sätzen angesprochen — nicht versteckt, nicht entschuldigt. Muster-Ton: \"Meine bisherigen Positionen waren nicht formal als [Rolle] betitelt, aber [übertragbare Tätigkeit] war ein wesentlicher Teil meiner Arbeit.\" Bei Umzug ausdrücklich: \"Ich lebe derzeit in [Ort] und bin bereit, für diese Stelle nach [Zielort] umzuziehen.\" VERBOTEN: entschuldigende oder defensive Sprache (\"leider\", \"obwohl ich nur\", Rechtfertigungen), die Behauptung einer nicht vorhandenen Qualifikation, und jedes Verstecken eines Punkts aus 'nieVerstecken'. Der Ton: die Lücke ist bekannt, die vorhandene Erfahrung trägt trotzdem, der Wechsel ist eine bewusste Entscheidung. Keine Floskeln, keine erfundenen Ansprechpartner (ohne Namen neutral anreden); endet mit dem Namen des Bewerbers.",
    "'anzeigeTitel' — der Stellentitel wörtlich aus der Anzeige (kurz); 'anzeigeFirma' — der Firmenname, falls erkennbar, sonst leer.",
    "Antworte NUR als JSON: {\"strategie\":{…},\"positionierung\":\"…\",\"sprechtext\":\"…\",\"schwerpunkte\":[…],\"kompetenzen\":[…],\"ergebnisse\":[{\"i\":0,\"ergebnis\":\"…\"}],\"anschreiben\":\"…\",\"anzeigeTitel\":\"…\",\"anzeigeFirma\":\"…\"}",
  ].join("\n\n");

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } } | null;

  const text = r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
  const parsed = text ? extractJson(text) : null;
  if (!parsed) {
    return NextResponse.json({ error: r?.error?.message ?? "Zuschneiden fehlgeschlagen — bitte noch einmal." }, { status: 502 });
  }

  const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const liste = (v: unknown, max: number, laenge = 120) =>
    (Array.isArray(v) ? v : []).map(x => s(x, laenge)).filter(Boolean).slice(0, max);

  const strategieRoh = parsed.strategie ?? {};
  const strategie: NonNullable<LebenslaufProfil["strategie"]> = {
    staerksteArgumente: liste(strategieRoh.staerksteArgumente, 5, 200),
    uebertragbar: liste(strategieRoh.uebertragbar, 6, 160),
    zuErklaeren: liste(strategieRoh.zuErklaeren, 5, 200),
    betonen: liste(strategieRoh.betonen, 4, 160),
    wenigerBetonen: liste(strategieRoh.wenigerBetonen, 4, 160),
    sprachvorteile: liste(strategieRoh.sprachvorteile, 3, 120),
    nieVerstecken: liste(strategieRoh.nieVerstecken, 3, 200),
  };
  const matchEmpfehlung = (["gut", "bruecke", "schwach"] as const).includes(analyse?.empfehlung as Empfehlung)
    ? (analyse!.empfehlung as Empfehlung) : undefined;

  /* Ergebnis-Zeilen NUR an ihrer Station einsetzen — alles andere an der Erfahrung bleibt
     byte-gleich der Bestand (Stationen sind unantastbar). */
  const erfahrung = (basis.erfahrung ?? []).map((e, i) => {
    const neu = (Array.isArray(parsed.ergebnisse) ? parsed.ergebnisse : []).find(x => Number(x?.i) === i);
    const ergebnis = s(neu?.ergebnis, 220);
    return ergebnis ? { ...e, ergebnis } : e;
  });

  const anschreiben = s(parsed.anschreiben, 3000);
  /* Bei einer Jobchance NIE den von der KI extrahierten Titel/Firma übernehmen — die
     neutrale `rolle` aus dem Pool steht fest, ein Firmenname gehört dort gar nicht erst
     hinein (Quellen-Compliance, Baustelle D, dieselbe Verteidigung wie in
     lebenslauf-match: der Prompt kann ignoriert werden, dieser Codepfad nicht). */
  const anzeigeTitel = chanceId ? chanceRolle : s(parsed.anzeigeTitel, 120);
  const anzeigeFirma = chanceId ? "" : s(parsed.anzeigeFirma, 120);
  /* HÖCHSTENS EINE MAPPE JE KANDIDAT UND CHANCE (Änderung 1) — ein zweiter Lauf auf
     dieselbe `chanceId` behält die KENNUNG der bestehenden Version und überschreibt sie,
     statt eine weitere anzulegen. */
  const vid = bestehendeVersion?.id ?? randomUUID();
  const version: LebenslaufProfil = {
    ...basis,
    id: vid,
    basisId: basis.id,
    erstelltAm: bestehendeVersion?.erstelltAm ?? new Date().toISOString(),
    /* Bild statt Video (Owner) — und Abo/Index/Zähler leben NUR am Hauptprofil. */
    videoUrl: undefined,
    aboAktiv: undefined, aboSubId: undefined, aboSeit: undefined,
    bewerbungen: undefined, bewerbungenErzeugt: undefined,
    sprechtext: s(parsed.sprechtext, 1200) || basis.sprechtext,
    schwerpunkte: liste(parsed.schwerpunkte, 4, 60).length ? liste(parsed.schwerpunkte, 4, 60) : basis.schwerpunkte,
    kompetenzen: liste(parsed.kompetenzen, 6, 40).length ? liste(parsed.kompetenzen, 6, 40) : basis.kompetenzen,
    positionierung: s(parsed.positionierung, 120) || undefined,
    erfahrung,
    anschreiben: anschreiben || undefined,
    anzeigeTitel: anzeigeTitel || undefined,
    anzeigeFirma: anzeigeFirma || undefined,
    matchProzent: prozent,
    matchEmpfehlung,
    strategie,
    chanceId: chanceId || undefined,
    bezahlt: true,
  };

  if (!(await schreibeLebenslauf(version))) {
    return NextResponse.json({ error: "Bewerbung konnte nicht gespeichert werden." }, { status: 500 });
  }

  /* Index + Probe-Zähler am Hauptprofil — ZWEITER Schreibvorgang auf eine ANDERE Datei
     (kein Merge-Risiko), mit frisch gelesenem Bestand, damit eine parallele Korrektur
     nichts verliert. Bei chanceId ERSETZT diese Version einen bestehenden Eintrag (siehe
     `bestehendeVersion` oben) statt einen neuen anzulegen, und `bewerbungenErzeugt`
     bleibt unangetastet — der Zähler gehört dem Probe/Abo-Tor von Tür 1, das eine
     kostenlose Tür-2-Mappe nie verbrauchen darf (Änderung 1). */
  const frisch = (await leseLebenslauf(basis.id)) ?? basis;
  const neuerEintrag = { id: vid, titel: anzeigeTitel || "Bewerbung", firma: anzeigeFirma || undefined, erstelltAm: version.erstelltAm, prozent, chanceId: chanceId || undefined };
  const bestandsListe = frisch.bewerbungen ?? [];
  const naechsteListe = bestehendeVersion
    ? bestandsListe.map(b => (b.id === vid ? neuerEintrag : b))
    : [...bestandsListe, neuerEintrag];
  await schreibeLebenslauf({
    ...frisch,
    bewerbungen: naechsteListe,
    bewerbungenErzeugt: chanceId ? frisch.bewerbungenErzeugt : (frisch.bewerbungenErzeugt ?? 0) + 1,
  });

  return NextResponse.json({ id: vid, url: `/lebenslauf/${vid}`, titel: anzeigeTitel || "" });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });
  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ ok: true });   // schon weg — Löschen ist idempotent
  /* NUR Bewerbungen — ein Hauptprofil (bezahltes Produkt samt Video) löscht dieser Weg nie. */
  if (!profil.basisId) return NextResponse.json({ error: "Nur Bewerbungen können gelöscht werden." }, { status: 400 });
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }
  if (!(await loescheLebenslauf(id))) {
    return NextResponse.json({ error: "Löschen hat nicht geklappt." }, { status: 500 });
  }
  const basis = await leseLebenslauf(profil.basisId);
  if (basis) {
    await schreibeLebenslauf({ ...basis, bewerbungen: (basis.bewerbungen ?? []).filter(b => b.id !== id) });
  }
  return NextResponse.json({ ok: true });
}
