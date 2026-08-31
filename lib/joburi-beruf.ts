/**
 * VOM GETIPPTEN BERUF ZUM BEREICH (Owner 31.08.2026: „was arbeitest du auch eintippen oder
 * noch besser was bist du vom beruf").
 *
 * Vorher wählte man eine von acht Kacheln. Für einen Recruiter ist das fast wertlos:
 * „Gesundheit / Pflege" kann die Chefärztin sein oder der Fahrer des Pflegedienstes.
 * „Asistentă medicală" ist eine Person, mit der man reden kann. Deshalb tippt er es jetzt.
 *
 * DIE STATISTIK BRAUCHT TROTZDEM KATEGORIEN. „IT", „it", „programator", „lucrez în IT" sind
 * vier Schreibweisen für eine Zeile — und eine Studie, die ihre Zeilen nicht zählen kann,
 * hat keine Aussage. Deshalb ordnet diese Datei den freien Text einem der acht Bereiche zu.
 * Der Originaltext bleibt IMMER erhalten (`berufsfeldFrei`); der Bereich ist nur die grobe
 * Schublade daneben, nie ein Ersatz.
 *
 * ES IST EINE STICHWORTLISTE UND KEIN MODELL. Ein KI-Aufruf je Antwort kostete rund vier
 * Cent — bei 500 Antworten also 20 € für eine Einordnung, die eine Wortliste genauso gut
 * hinbekommt (Hausregel: kein bezahlter Aufruf für etwas Ableitbares). Sie ist zudem
 * deterministisch: Dieselbe Eingabe ergibt in einem halben Jahr dieselbe Zeile.
 *
 * RUMÄNISCH UND DEUTSCH STEHEN NEBENEINANDER, weil der Trichter in beiden Sprachen läuft.
 * Wer eine Lücke findet, ergänzt hier ein Wort — nicht im Trichter.
 */

const BEREICHE: { feld: string; woerter: string[] }[] = [
  { feld: "sanatate", woerter: [
    "asistent", "asistenta", "medical", "medic", "doctor", "infirmier", "ingrijire", "ingrijitor",
    "farmac", "stomatolog", "kinetoterap", "pflege", "krankenschwester", "krankenpfleger",
    "altenpfleger", "arzt", "ärztin", "arztin", "hebamme", "sanitäter", "sanitater", "apotheke",
  ]},
  { feld: "it", woerter: [
    "it", "program", "developer", "dezvoltator", "software", "web", "frontend", "backend",
    "devops", "tester", "qa", "data", "date", "retea", "rețea", "sysadmin", "informatic",
    "entwickler", "informatik", "netzwerk", "admin",
  ]},
  { feld: "finante", woerter: [
    "contabil", "financ", "banca", "bancar", "audit", "fiscal", "salariz", "buchhalt",
    "finanz", "bank", "steuer", "controlling", "lohnbuch",
  ]},
  { feld: "logistica", woerter: [
    "logistic", "sofer", "șofer", "camion", "curier", "depozit", "transport", "expedit",
    "fahrer", "lkw", "lager", "spedition", "kurier", "stapler",
  ]},
  { feld: "inginerie", woerter: [
    "inginer", "productie", "producție", "mecanic", "electric", "electrician", "sudor",
    "lacatus", "lăcătuș", "strungar", "cnc", "instalator", "constructor", "zidar", "dulgher",
    "ingenieur", "techniker", "mechaniker", "elektriker", "schlosser", "schweisser",
    "schweißer", "monteur", "produktion", "maler", "installateur", "bau",
  ]},
  { feld: "vanzari", woerter: [
    "vanzari", "vânzări", "vanzator", "vânzător", "comercial", "agent", "reprezentant",
    "verkauf", "vertrieb", "verkäufer", "verkaufer", "kundenberater", "aussendienst",
  ]},
  { feld: "suport", woerter: [
    "suport", "support", "client", "call center", "callcenter", "relatii", "relații",
    "receptie", "recepție", "kundenservice", "kundenbetreuung", "callcenter", "hotline",
    "empfang", "sachbearbeit", "büro", "buro", "sekretär", "sekretar",
  ]},
  { feld: "altul", woerter: [
    /* bewusst leer: die Auffangschublade */
  ]},
];

/**
 * Ordnet einen getippten Beruf einem der acht Bereiche zu. Ohne Treffer: „altul" — und das
 * ist kein Makel, sondern ein Hinweis: Häuft sich dort etwas, gehört ein Wort in die Liste.
 */
export function berufZuBereich(text?: string): string {
  const t = String(text ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // Diakritika weg: „șofer" = „sofer"
    .trim();
  if (t.length < 2) return "";
  for (const b of BEREICHE) {
    /* Wortanfang statt „enthält": Sonst fischt das Kürzel „it" jedes „Arbeit" und
       „Sicherheit" ab und die IT-Spalte wäre die grösste der Studie. */
    if (b.woerter.some(w => new RegExp(`(^|[^a-z])${w}`, "i").test(t))) return b.feld;
  }
  return "altul";
}
