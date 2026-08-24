import { translateMany } from "@/lib/translate";
import type { ExecutiveProfil } from "@/lib/lebenslauf-vorlage";
import type { Lang } from "@/lib/lang";

/**
 * DER INHALT DES DOSSIERS IN DER SPRACHE DES BETRACHTERS (Owner 24.08.2026: „diese Seite
 * soll man übersetzen können. Dafür haben wir oben die Sprachen.").
 *
 * Die Bedienung ringsum (EXECUTIVE_TEXTE) war immer siebensprachig — der INHALT (Profiltext,
 * Kompetenzen, Rollen) stand bisher fest in der Sprache des Lebenslaufs. Dieser Baustein
 * schickt die Inhalts-Felder eines fertigen `ExecutiveProfil` durch die Haus-Übersetzung
 * (`translateMany`): EIN API-Aufruf beim ersten Besuch je Sprache, danach kommt alles aus
 * dem Dauer-Cache — dieselbe Sparsamkeit wie bei den Landingpage-Texten (lib/tr-object.ts).
 *
 * WAS NIE ÜBERSETZT WIRD: der Name, Firmennamen (`erfahrung[].firma`), Zahlen
 * (`impact[].zahl`), Kontakt (Telefon/Mail/Links), die Video-Adresse. Was die Maschine
 * ohnehin unangetastet lässt: Zeiträume aus reinen Jahreszahlen.
 *
 * EIGENE DATEI statt in lib/lebenslauf-vorlage.ts: Die Vorlage wird auch von Bausteinen
 * importiert, die im Browser landen (LebenslaufBeispiel) — `translateMany` hängt am
 * Server-Speicher (Supabase-Schlüssel) und darf dort nie hineingeraten.
 */
export async function executiveInSprache(p: ExecutiveProfil, lang: Lang): Promise<ExecutiveProfil> {
  /* Deutscher Lebenslauf vor deutschem Betrachter: nichts zu tun — und vor allem kein
     „DE→DE"-Aufruf, der den Text versehentlich in eine andere Sprache dreht und das
     DAUERHAFT cached (dieselbe Falle wie der RO-Schutz in lib/translate.ts). */
  const istDeutsch = /[äöüßÄÖÜ]/.test(`${p.profil} ${p.expertise.join(" ")} ${p.rolle}`);
  if (lang === "de" && istDeutsch) return p;

  /* Einsammeln und Wiedereinsetzen laufen in EXAKT derselben Reihenfolge — `naechster()`
     ist ein Zeiger, kein Nachschlagen. Leere Strings reichen durch (translateMany lässt
     sie unangetastet), damit die Plätze stimmen. */
  const eingabe: string[] = [
    p.rolle, p.ort, p.sprachenKurz, p.verfuegbar ?? "", p.videoLabel ?? "", p.profil,
    ...p.schwerpunkte,
    ...p.expertise,
    ...p.erfahrung.flatMap(e => [e.rolle, e.zeitraum, e.ergebnis]),
    ...p.impact.map(z => z.text),
    ...p.ausbildung.map(a => a.titel),
    ...p.sprachen.flatMap(s => [s.sprache, s.niveau]),
    ...p.passendeRollen.flatMap(r => [r.titel, ...r.gruende]),
    ...p.chatFragen,
  ];

  try {
    const raus = await translateMany(eingabe, lang);
    let i = 0;
    const naechster = () => raus[i++] ?? "";
    return {
      ...p,
      rolle: naechster(),
      ort: naechster(),
      sprachenKurz: naechster(),
      verfuegbar: naechster() || undefined,
      videoLabel: naechster() || undefined,
      profil: naechster(),
      schwerpunkte: p.schwerpunkte.map(() => naechster()),
      expertise: p.expertise.map(() => naechster()),
      erfahrung: p.erfahrung.map(e => ({ ...e, rolle: naechster(), zeitraum: naechster(), ergebnis: naechster() })),
      impact: p.impact.map(z => ({ ...z, text: naechster() })),
      ausbildung: p.ausbildung.map(a => ({ ...a, titel: naechster() })),
      sprachen: p.sprachen.map(s => ({ ...s, sprache: naechster(), niveau: naechster() })),
      passendeRollen: p.passendeRollen.map(r => ({ ...r, titel: naechster(), gruende: r.gruende.map(() => naechster()) })),
      chatFragen: p.chatFragen.map(() => naechster()),
    };
  } catch {
    return p;   // Übersetzung ist Zugabe — die Seite erscheint notfalls im Original
  }
}
