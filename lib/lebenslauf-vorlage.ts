import type { Lang } from "@/lib/lang";
import type { LebenslaufProfil } from "@/lib/lebenslauf-store";

/**
 * DIE VORLAGE „EXECUTIVE" — DATEN UND WORTE (Owner 22.08.2026: „Design ONE single premium
 * candidate profile template … Executive").
 *
 * WARUM EINE EIGENE DATEI UND NICHT DER SPEICHER: `lib/lebenslauf-store.ts` beschreibt, was
 * von einem Bewerber GESPEICHERT wird (Rohdaten aus der Auswertung). Hier steht, was die
 * fertige Seite ZEIGT — eine Ebene darüber. Die beiden dürfen sich unterscheiden: Der
 * Speicher kennt `stichpunkte: string[]`, die Vorlage kennt „Selected Impact" mit Zahl und
 * Zeile. Wer die Vorlage an echte Profile hängt, schreibt genau EINEN Übersetzer zwischen
 * beiden (`ausProfil`), statt die Seite an den Rohdaten entlangzubauen.
 *
 * KEINE ERFUNDENEN ZAHLEN (Auftrag: „Use numbers only if they come from the candidate's CV.
 * Do not invent achievements."). Seit dem 24.08.2026 ist das Muster der GRÜNDER selbst —
 * jede Zahl steht in seinem echten Lebenslauf (cv26-Geza-Lakatos_de) bzw. seiner eigenen
 * Auswertung. Wer das Beispiel ändert, ändert es gegen dieselbe Quelle.
 */

/**
 * DAS EINE BEISPIEL-VIDEO DES THEMAS (Dauerregel Memory `landingpage-video-ist-kachel-video`:
 * EIN Video aus EINER Konstante für Landingpage-Karte UND Katalog-Kachel UND Themen-Kreis).
 * Echter Lauf (Ginas Foto + Anna Kellers Muster-CV), liegt fest im Repo statt an einem
 * ablaufenden Supabase-Link.
 */
/* SEIT 24.08.2026 DER GRÜNDER SELBST (Owner: „der Hero braucht ein echtes Gesicht. Der Text
   verspricht ‚du selbst, echt' — mit dem KI-Model daneben glaubt ihn niemand" · „mach mal in
   dem Template mein Video und mein Lebenslauf"). Sein HeyGen-Video, komprimiert auf 720p mit
   Faststart; das Anna-Keller-Material (KI-Lauf) bleibt im Ordner als Reserve liegen. */
export const LEBENSLAUF_BEISPIEL_VIDEO = "/Lebenslauf/geza-beispiel.mp4";
export const LEBENSLAUF_BEISPIEL_POSTER = "/Lebenslauf/geza-beispiel.jpg";

export type ExecutiveErfahrung = {
  rolle: string;
  firma: string;
  zeitraum: string;
  /** EINE Zeile — Ergebnis oder Verantwortung, nie der ganze Lebenslauf. */
  ergebnis: string;
};

export type ExecutivePassung = {
  titel: string;
  /** `stark` = „Strong Match", `gut` = „Good Match". KEINE Prozentzahl (Auftrag: „Do NOT
      display arbitrary percentages such as 68% Match") — eine erfundene Zahl behauptet eine
      Messung, die es nicht gibt, und beschädigt genau das Vertrauen, das die Seite braucht. */
  staerke: "stark" | "gut";
  /** Höchstens vier Gründe — sie sollen in zwei Spalten in eine Zeile passen. */
  gruende: string[];
  href?: string;
};

export type ExecutiveProfil = {
  id: string;
  name: string;
  /** Die Positionierung unter dem Namen — die zweitwichtigste Zeile der Seite. */
  rolle: string;
  /** „Berlin · Remote EU" — Ort UND Arbeitsform in einer Zeile. */
  ort: string;
  /** „German native · English C1" — kurz für den Kopf; die Langfassung steht in `sprachen`. */
  sprachenKurz: string;
  /** „Available from September" — leer heisst: kein Status, die Zeile fehlt ganz. */
  verfuegbar?: string;
  /** Drei bis vier Schwerpunkte im Kopf. Mehr liest im Zehn-Sekunden-Blick niemand. */
  schwerpunkte: string[];
  /** Das Porträt. Ist ein Video da, ist dieses Bild zugleich sein Standbild (Skill `card`:
      „nie ein Video ohne Poster"). */
  portraitUrl: string;
  videoUrl?: string;
  /** „60 sec. Introduction" — steht auf dem Video, kommt aus den Daten, nicht aus dem Code. */
  videoLabel?: string;
  /** Vier bis fünf Zeilen. Die KI schreibt sie aus dem Lebenslauf, der Mensch gibt sie frei. */
  profil: string;
  /** Sechs bis acht Begriffe. */
  expertise: string[];
  erfahrung: ExecutiveErfahrung[];
  /** Genau drei — mehr Zahlen nebeneinander liest man als Schaubild, nicht als Beleg. */
  impact: { zahl: string; text: string }[];
  ausbildung: { titel: string; ort: string; zeitraum: string }[];
  sprachen: { sprache: string; niveau: string }[];
  passendeRollen: ExecutivePassung[];
  /** Der Lebenslauf als Datei — der Knopf fehlt ohne sie. */
  cvUrl?: string;
  /** Beispiel-Fragen für den Profil-Chat. Sie zeigen, was er kann, ohne dass man tippen muss. */
  chatFragen: string[];
  /**
   * KONTAKTDATEN ERST NACH FREIGABE (Owner 20.08.2026, siehe `kontaktSichtbar` in
   * lib/lebenslauf-store.ts): Die Seite geht an Firmen OHNE Kontaktkarte; erst wenn eine
   * Firma Interesse an genau diesem Kandidaten bestätigt, wird sie sichtbar. Vorgabe `false`.
   */
  kontaktSichtbar?: boolean;
  kontakt?: { ort?: string; telefon?: string; email?: string; profilLink?: string };
};

/** Die Worte der Seite in den sieben Hausprachen (lib/lang.ts). Der INHALT (Lebenslauf) bleibt
    in der Sprache des Bewerbers — übersetzt wird die Bedienung ringsum, nicht sein Werdegang. */
export type ExecutiveTexte = {
  marke: string;
  teilen: string; kopiert: string; menu: string; menuTitel: string;
  profil: string; expertise: string; erfahrung: string; impact: string;
  bildung: string; sprachen: string; passung: string;
  stark: string; gut: string; warum: string; rolleAnsehen: string;
  ganzeCv: string;
  interessiert: (name: string) => string;
  interessiertText: string;
  interview: string; nachricht: string; cvLaden: string;
  kontakt: string; kontaktSpaeter: string;
  chatEinstieg: (name: string) => string;
  chatHinweis: string; chatBeispiele: string; chatZu: string;
};

export const EXECUTIVE_TEXTE: Record<Lang, ExecutiveTexte> = {
  en: {
    marke: "Talent", teilen: "Share profile", kopiert: "Link copied", menu: "Menu", menuTitel: "Sections",
    profil: "Profile", expertise: "Core Expertise", erfahrung: "Experience", impact: "Selected Impact",
    bildung: "Education", sprachen: "Languages", passung: "Roles that fit this profile",
    stark: "Strong Match", gut: "Good Match", warum: "Why", rolleAnsehen: "View role",
    ganzeCv: "The complete career history is in the CV.",
    interessiert: (n) => `Interested in ${n}?`,
    interessiertText: "Send a request and we pass it to the candidate the same day.",
    interview: "Request an interview", nachricht: "Send a message", cvLaden: "Download CV",
    kontakt: "Contact", kontaktSpaeter: "Contact details are released once an employer confirms interest.",
    chatEinstieg: (n) => `Ask about ${n}'s experience`,
    chatHinweis: "Answers come only from the verified CV and this profile. Nothing is added.",
    chatBeispiele: "For example", chatZu: "Close",
  },
  de: {
    marke: "Talent", teilen: "Profil teilen", kopiert: "Link kopiert", menu: "Menü", menuTitel: "Abschnitte",
    profil: "Profil", expertise: "Kernkompetenzen", erfahrung: "Erfahrung", impact: "Ausgewählte Ergebnisse",
    bildung: "Ausbildung", sprachen: "Sprachen", passung: "Rollen, die zu diesem Profil passen",
    stark: "Starke Passung", gut: "Gute Passung", warum: "Warum", rolleAnsehen: "Rolle ansehen",
    ganzeCv: "Der vollständige Werdegang steht im Lebenslauf.",
    interessiert: (n) => `Interesse an ${n}?`,
    interessiertText: "Schick eine Anfrage — wir geben sie noch am selben Tag weiter.",
    interview: "Gespräch anfragen", nachricht: "Nachricht senden", cvLaden: "Lebenslauf laden",
    kontakt: "Kontakt", kontaktSpaeter: "Die Kontaktdaten werden frei, sobald eine Firma Interesse bestätigt.",
    chatEinstieg: (n) => `Frag nach ${n}s Erfahrung`,
    chatHinweis: "Antworten kommen nur aus dem geprüften Lebenslauf und diesem Profil. Nichts wird ergänzt.",
    chatBeispiele: "Zum Beispiel", chatZu: "Schliessen",
  },
  ro: {
    marke: "Talent", teilen: "Distribuie profilul", kopiert: "Link copiat", menu: "Meniu", menuTitel: "Secțiuni",
    profil: "Profil", expertise: "Competențe cheie", erfahrung: "Experiență", impact: "Rezultate selectate",
    bildung: "Studii", sprachen: "Limbi", passung: "Roluri potrivite pentru acest profil",
    stark: "Potrivire puternică", gut: "Potrivire bună", warum: "De ce", rolleAnsehen: "Vezi rolul",
    ganzeCv: "Parcursul complet se află în CV.",
    interessiert: (n) => `Interesat de ${n}?`,
    interessiertText: "Trimite o cerere — o transmitem candidatului în aceeași zi.",
    interview: "Cere un interviu", nachricht: "Trimite un mesaj", cvLaden: "Descarcă CV-ul",
    kontakt: "Contact", kontaktSpaeter: "Datele de contact se deblochează după ce o firmă confirmă interesul.",
    chatEinstieg: (n) => `Întreabă despre experiența lui ${n}`,
    chatHinweis: "Răspunsurile vin doar din CV-ul verificat și din acest profil. Nimic nu este inventat.",
    chatBeispiele: "De exemplu", chatZu: "Închide",
  },
  es: {
    marke: "Talent", teilen: "Compartir perfil", kopiert: "Enlace copiado", menu: "Menú", menuTitel: "Secciones",
    profil: "Perfil", expertise: "Competencias clave", erfahrung: "Experiencia", impact: "Resultados destacados",
    bildung: "Formación", sprachen: "Idiomas", passung: "Puestos que encajan con este perfil",
    stark: "Encaje alto", gut: "Buen encaje", warum: "Por qué", rolleAnsehen: "Ver puesto",
    ganzeCv: "La trayectoria completa está en el CV.",
    interessiert: (n) => `¿Interesa ${n}?`,
    interessiertText: "Envía una solicitud y la trasladamos el mismo día.",
    interview: "Solicitar entrevista", nachricht: "Enviar mensaje", cvLaden: "Descargar CV",
    kontakt: "Contacto", kontaktSpaeter: "Los datos de contacto se liberan cuando una empresa confirma su interés.",
    chatEinstieg: (n) => `Pregunta por la experiencia de ${n}`,
    chatHinweis: "Las respuestas salen solo del CV verificado y de este perfil. No se añade nada.",
    chatBeispiele: "Por ejemplo", chatZu: "Cerrar",
  },
  fr: {
    marke: "Talent", teilen: "Partager le profil", kopiert: "Lien copié", menu: "Menu", menuTitel: "Sections",
    profil: "Profil", expertise: "Compétences clés", erfahrung: "Expérience", impact: "Résultats sélectionnés",
    bildung: "Formation", sprachen: "Langues", passung: "Postes qui correspondent à ce profil",
    stark: "Forte adéquation", gut: "Bonne adéquation", warum: "Pourquoi", rolleAnsehen: "Voir le poste",
    ganzeCv: "Le parcours complet figure dans le CV.",
    interessiert: (n) => `${n} vous intéresse ?`,
    interessiertText: "Envoyez une demande — nous la transmettons le jour même.",
    interview: "Demander un entretien", nachricht: "Envoyer un message", cvLaden: "Télécharger le CV",
    kontakt: "Contact", kontaktSpaeter: "Les coordonnées sont libérées dès qu'une entreprise confirme son intérêt.",
    chatEinstieg: (n) => `Interroger le parcours de ${n}`,
    chatHinweis: "Les réponses viennent uniquement du CV vérifié et de ce profil. Rien n'est ajouté.",
    chatBeispiele: "Par exemple", chatZu: "Fermer",
  },
  pt: {
    marke: "Talent", teilen: "Partilhar perfil", kopiert: "Link copiado", menu: "Menu", menuTitel: "Secções",
    profil: "Perfil", expertise: "Competências principais", erfahrung: "Experiência", impact: "Resultados selecionados",
    bildung: "Formação", sprachen: "Línguas", passung: "Funções que combinam com este perfil",
    stark: "Correspondência forte", gut: "Boa correspondência", warum: "Porquê", rolleAnsehen: "Ver função",
    ganzeCv: "O percurso completo está no CV.",
    interessiert: (n) => `Interesse em ${n}?`,
    interessiertText: "Envia um pedido — encaminhamos no próprio dia.",
    interview: "Pedir entrevista", nachricht: "Enviar mensagem", cvLaden: "Descarregar CV",
    kontakt: "Contacto", kontaktSpaeter: "Os contactos são libertados assim que uma empresa confirma interesse.",
    chatEinstieg: (n) => `Pergunta sobre a experiência de ${n}`,
    chatHinweis: "As respostas vêm apenas do CV verificado e deste perfil. Nada é acrescentado.",
    chatBeispiele: "Por exemplo", chatZu: "Fechar",
  },
  it: {
    marke: "Talent", teilen: "Condividi profilo", kopiert: "Link copiato", menu: "Menu", menuTitel: "Sezioni",
    profil: "Profilo", expertise: "Competenze chiave", erfahrung: "Esperienza", impact: "Risultati selezionati",
    bildung: "Formazione", sprachen: "Lingue", passung: "Ruoli adatti a questo profilo",
    stark: "Forte corrispondenza", gut: "Buona corrispondenza", warum: "Perché", rolleAnsehen: "Vedi il ruolo",
    ganzeCv: "Il percorso completo è nel CV.",
    interessiert: (n) => `Interessa ${n}?`,
    interessiertText: "Invia una richiesta — la giriamo in giornata.",
    interview: "Richiedi un colloquio", nachricht: "Invia un messaggio", cvLaden: "Scarica il CV",
    kontakt: "Contatti", kontaktSpaeter: "I contatti si sbloccano quando un'azienda conferma l'interesse.",
    chatEinstieg: (n) => `Chiedi dell'esperienza di ${n}`,
    chatHinweis: "Le risposte vengono solo dal CV verificato e da questo profilo. Nulla viene aggiunto.",
    chatBeispiele: "Per esempio", chatZu: "Chiudi",
  },
};

/**
 * DAS BEISPIEL-PROFIL — die fiktive Anna Keller aus `public/Resume/…CV.pdf`.
 *
 * Es steht hier und nicht in der Seite, damit die Vorlage an EINER Stelle mit echten Daten
 * gefüttert werden kann: Wer sie an einen echten Bewerber hängt, baut ein Objekt derselben
 * Form und reicht es hinein — die Seite kennt keinen Sonderfall „Beispiel".
 */
export const EXECUTIVE_BEISPIEL: ExecutiveProfil = {
  /* DAS MUSTER IST JETZT DER GRÜNDER SELBST (Owner 24.08.2026: „mach mal in dem Template
     mein Video und mein Lebenslauf") — echte Daten aus seiner eigenen Auswertung
     (Profil cde90e16…, CV cv26-Geza-Lakatos_de) statt der erfundenen Anna Keller. Der
     Seitentext verspricht „ein echtes Profil", also zeigt das Muster eines. KEINE erfundenen
     Zahlen: 20+ Jahre (CV: seit 1996), 200+ Studierende und die zwei eigenen Apps stehen
     wörtlich im Lebenslauf. Inhalt auf DEUTSCH (Sprache seines CVs) — andere Betrachter
     bekommen die Laufzeit-Übersetzung (executiveInSprache). Kontaktdaten stehen BEWUSST
     nicht hier: Diese Datei landet im Client-Bundle, und die Karte zeigt ohnehin den
     Freigabe-Satz (Vermittlungsmodell). */
  id: "executive-vorlage",
  name: "Geza Lakatos",
  rolle: "UX-Berater & KI-App-Entwickler",
  ort: "EU, Deutschland",
  sprachenKurz: "Deutsch C2 · Englisch C1 · Rumänisch C2",
  schwerpunkte: ["Produktstrategie", "No-Code-Prototyping", "KI-Integration", "UX-Training"],
  portraitUrl: LEBENSLAUF_BEISPIEL_POSTER,
  videoUrl: LEBENSLAUF_BEISPIEL_VIDEO,
  videoLabel: "Kurzvorstellung",
  profil:
    "Geza Lakatos, UX-Berater und Designer. Ich habe für die Bundesdruckerei das UX-Design " +
    "einer nationalen Datenplattform geleitet, bei Festo Industry-4.0-Wartungskonzepte " +
    "mitentwickelt und zuletzt eigene KI-gestützte Apps wie Nutrycoach.ai und LuxuryBandit " +
    "von der Idee bis zum MVP realisiert. Mein Schwerpunkt liegt auf AI-assisted App " +
    "Strategy, No-Code-Prototyping und skalierbaren Designsystemen. Ich suche jetzt eine " +
    "Rolle, in der ich Produktvisionen strategisch weiterführen kann — sei es als Senior " +
    "UX/Product Lead, strategischer Berater oder in einem interdisziplinären Team, das KI " +
    "ernsthaft in die Produktentwicklung integriert.",
  expertise: ["UX-Strategie", "Prototyping", "KI-Workflows", "Designsysteme", "Barrierefreiheit", "Workshop-Moderation"],
  erfahrung: [
    { rolle: "Founder / UX-Designer", firma: "LuxuryBandit (eigenes Projekt)", zeitraum: "2026–heute", ergebnis: "KI-gestützte Video-Plattform von der Idee bis zum laufenden Produkt gebaut." },
    { rolle: "Founder / UX-Designer", firma: "Nutrycoach.ai (eigenes Projekt)", zeitraum: "2025–Mai 2026", ergebnis: "UX und MVP einer KI-Ernährungs-App komplett selbst umgesetzt." },
    { rolle: "UX-Berater", firma: "Bundesdruckerei Gruppe GmbH", zeitraum: "2022–2024", ergebnis: "UX-Strategie der nationalen Datenplattform geleitet." },
  ],
  impact: [
    { zahl: "20+", text: "Jahre Produktgestaltung, seit 1996" },
    { zahl: "200+", text: "Studierende betreut, UX Design Institute" },
    { zahl: "2", text: "eigene KI-Apps bis zum MVP" },
  ],
  ausbildung: [
    { titel: "Dipl. Kommunikationsdesigner", ort: "FH Mannheim", zeitraum: "" },
  ],
  sprachen: [
    { sprache: "Deutsch", niveau: "C2" },
    { sprache: "Englisch", niveau: "C1" },
    { sprache: "Rumänisch", niveau: "C2" },
    { sprache: "Ungarisch", niveau: "B2" },
  ],
  passendeRollen: [
    {
      titel: "Produkt- & UX-Strategie", staerke: "stark",
      gruende: ["Leitung UX-Strategie Bundesdruckerei", "AI-assisted App Strategy entwickelt", "20+ Jahre Produktgestaltung"],
      href: "https://www.google.com/search?q=" + encodeURIComponent("Produkt- & UX-Strategie jobs remote"),
    },
    {
      titel: "No-Code & KI-Entwicklung", staerke: "gut",
      gruende: ["Nutrycoach.ai UX und MVP gebaut", "LuxuryBandit KI-gestützte App umgesetzt", "Erfahrung mit Bolt.new und Claude Code"],
      href: "https://www.google.com/search?q=" + encodeURIComponent("No-Code KI-Entwicklung jobs remote"),
    },
    {
      titel: "UX-Training & Mentoring", staerke: "gut",
      gruende: ["200+ Studierende am UX Design Institute", "Workshops und Mentoring durchgeführt", "Figma-Workflows gelehrt und implementiert"],
      href: "https://www.google.com/search?q=" + encodeURIComponent("UX Training Mentoring jobs remote"),
    },
  ],
  chatFragen: [
    "Hat Geza Erfahrung mit KI-Produktentwicklung?",
    "Welche UX-Projekte belegt sein Lebenslauf?",
    "Hat er mit Behörden und Konzernen gearbeitet?",
  ],
  /* Bewusst ZU: So sieht die Seite aus, die an eine Firma geht (Vermittlungsmodell). */
  kontaktSichtbar: false,
};

/**
 * DER EINE ÜBERSETZER — `LebenslaufProfil` (Speicher-Rohdaten) → `ExecutiveProfil` (Seite).
 * Genau der Baustein, den der Kopf dieser Datei ankündigt: Die echte Profilseite
 * (`app/lebenslauf/[id]`) rendert seit dem 24.08.2026 die Executive-Vorlage (Owner: „unter
 * der Landingpage die Seite, die der User bekommt … Die Leute kaufen was sie sehen" — was
 * das Beispiel zeigt, muss auch geliefert werden).
 *
 * NUR WAS DA IST: Die Auswertung liefert weniger Felder, als das Muster-Profil zeigt
 * (kein Impact, keine Ausbildung, keine Sprachtabelle) — diese Abschnitte bleiben dann
 * einfach weg, die Vorlage blendet leere Listen selbst aus. NIE erfinden (Auftrag: „Do not
 * invent achievements"), NIE Prozentzahlen.
 */

/** „Wann kannst du anfangen?" — dieselben drei Kennungen wie im Trichter
    (`VERFUEGBARKEIT` in LebenslaufStartClient), hier in Worten. De/En wie der Trichter. */
const VERFUEGBAR_WORT: Record<string, { de: string; en: string }> = {
  sofort: { de: "Sofort verfügbar", en: "Available immediately" },
  "1monat": { de: "Verfügbar in 1 Monat", en: "Available in 1 month" },
  flexibel: { de: "Flexibel verfügbar", en: "Availability flexible" },
};

export function executiveAusProfil(p: LebenslaufProfil, lang: Lang = "en"): ExecutiveProfil {
  const kategorien = (p.kategorien ?? []).filter(Boolean);
  const kompetenzen = (p.kompetenzen ?? []).filter(Boolean);
  const name = (p.name ?? "").trim();
  const vorname = name.split(" ")[0] || name;
  const de = lang === "de";

  /* Die Beispiel-Fragen des Profil-Chats — nur, wenn es etwas zu fragen GIBT (Memory
     `chat-no-personal-questions-buttons-only`: „Chips nie leer"). Ohne Fragen blendet die
     Vorlage den ganzen Chat-Einstieg aus. */
  const chatFragen: string[] = [];
  if (name && kategorien[0]) {
    chatFragen.push(de
      ? `Hat ${vorname} Erfahrung als ${kategorien[0]}?`
      : `Does ${vorname} have experience as ${kategorien[0]}?`);
  }
  if (name && kompetenzen[0]) {
    chatFragen.push(de
      ? `Welche Stärken belegt der Lebenslauf von ${vorname}?`
      : `Which strengths does ${vorname}'s resume document?`);
  }

  return {
    id: p.id,
    name: name || (de ? "Profil" : "Profile"),
    /* Die Positionierung: die jüngste Station; ersatzweise die erste Berufskategorie. */
    rolle: p.erfahrung?.[0]?.rolle || kategorien[0] || "",
    ort: (p.ort ?? "").trim(),
    sprachenKurz: "",
    verfuegbar: p.verfuegbarkeit
      ? (VERFUEGBAR_WORT[p.verfuegbarkeit]?.[de ? "de" : "en"] ?? "")
      : undefined,
    /* Eigene Schwerpunkte aus der Auswertung; Altprofile ohne sie fallen auf die
       Kategorien zurück (Owner 24.08.2026: „lauter Redundanzen" — deshalb getrennt). */
    schwerpunkte: (p.schwerpunkte?.length ? p.schwerpunkte : kategorien).slice(0, 4),
    /* Das Poster IST sein Foto (Skill `card`: nie ein Video ohne Poster) — die
       Fertigstellen-Route legt es seit 24.08.2026 dauerhaft ab. */
    portraitUrl: p.fotoUrl ?? "",
    videoUrl: p.videoUrl,
    profil: (p.sprechtext ?? "").trim() || (p.stichpunkte ?? []).join(" · "),
    expertise: kompetenzen,
    /* SEIT 24.08.2026 MIT FIRMA UND ERGEBNIS (Owner: „es muss alles rein") — die Vorlage
       hatte für beide schon eigene Zeilen (LebenslaufExecutive.tsx blendet sie einzeln aus,
       wenn leer), nur die Auswertung lieferte sie nie. Altprofile ohne diese Felder zeigen
       weiterhin nur Rolle + Zeitraum, keine leeren Zeilen. */
    erfahrung: (p.erfahrung ?? [])
      .filter(e => e.rolle)
      .map(e => ({ rolle: e.rolle, firma: e.firma ?? "", zeitraum: e.zeitraum, ergebnis: e.ergebnis ?? "" })),
    impact: [],
    /* Ausbildung/Sprachen kommen jetzt echt aus der Auswertung (Owner 24.08.2026 — vorher
       für JEDES reale Profil hart leer, obwohl die Vorlage eigene Abschnitte dafür hat). */
    ausbildung: (p.ausbildung ?? []).filter(a => a.titel).map(a => ({ titel: a.titel, ort: a.ort ?? "", zeitraum: a.zeitraum ?? "" })),
    sprachen: (p.sprachen ?? []).filter(s => s.sprache).map(s => ({ sprache: s.sprache, niveau: s.niveau ?? "" })),
    /* JE ROLLE EIGENE GRÜNDE aus der Auswertung (`passung`); nur Altprofile ohne sie
       wiederholen die Kompetenzen (Owner 24.08.2026: „lauter Redundanzen"). */
    passendeRollen: (p.passung?.length
      ? p.passung.map((r, i) => ({
          titel: r.rolle,
          staerke: i === 0 ? ("stark" as const) : ("gut" as const),
          gruende: r.gruende.slice(0, 4),
          href: `https://www.google.com/search?q=${encodeURIComponent(`${r.rolle} jobs remote`)}`,
        }))
      : kategorien.slice(0, 3).map((k, i) => ({
          titel: k,
          staerke: i === 0 ? ("stark" as const) : ("gut" as const),
          gruende: kompetenzen.slice(0, 4),
          href: `https://www.google.com/search?q=${encodeURIComponent(`${k} jobs remote`)}`,
        }))),
    chatFragen,
    kontaktSichtbar: p.kontaktSichtbar === true,
    kontakt: {
      ort: p.ort || undefined,
      telefon: p.telefon || undefined,
      email: p.email || undefined,
    },
  };
}
