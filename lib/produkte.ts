import { geschenkPreisCents, CHAT_STUFEN, TRIAL_DAYS } from "@/lib/pricing";

/**
 * DIE EINE PRODUKT-DEFINITION (Owner-Master-Auftrag 13.08.2026, §8/§44: „LuxuryBandit is the
 * platform. Everything else is a product." — und §0: „Preserve first. Extend second.").
 *
 * WAS DIESE DATEI IST: die EINE Stelle, an der steht, WAS ein Produkt ist — Kennung,
 * Ad-Adresse, Motor, Schrittfolge, Preis-Zeiger, Ergebnis-Art, Programm-Anteil. Bis heute
 * stand das verstreut: die Schrittfolge je Start-Client, der Preis in `lib/pricing.ts`, die
 * Texte in `lib/kiss-i18n.ts`, die Weichen als `variant === "…"`-Verzweigungen im
 * `KissFunnel`. Nichts davon zieht um — diese Datei ZEIGT nur dorthin (§33 sinngemäss:
 * nichts neu bauen, nur generisch übergeben).
 *
 * WAS DIESE DATEI NICHT IST: kein neues Funnel-System, keine Datenbank, kein Creator-
 * Marktplatz (§39 „KEIN OVERENGINEERING", §35–38: Phase 2/3 bauen wir NICHT jetzt). Felder,
 * die heute niemand liest (marketing), sind bewusst nur TYPISIERT, damit die Architektur sie
 * nicht blockiert (§31) — gefüllt werden sie, wenn sie gebraucht werden.
 *
 * DIE PREISE BLEIBEN IN `lib/pricing.ts` (Dauerregel `prices-only-from-pricing-table`):
 * `preisCents` ist ein ZEIGER auf `geschenkPreisCents(slug)`, keine zweite Zahl. Wer hier
 * eine Zahl eintippt, baut den Fehler wieder ein, der uns die 15-€/9,99-€-Doppelbuchung
 * gekostet hat.
 */

/** Die vier Produkte, die der `KissFunnel` als Varianten fährt. */
export type KissFunnelVariant = "kiss" | "birthday" | "versprechen" | "poledance";

export type ProduktDefinition = {
  /** Die Kennung überall im Haus: kiss-log-`theme`, Funnel-Events, Checkout-`produkt`. */
  slug: string;
  /** Die Ad-Adresse (Owner 12.08.2026: „die muss ich in den ads einbauen"); `?light=1` hell. */
  startPfad: string;
  /**
   * WER den Trichter fährt: `kissfunnel` = `components/KissFunnel.tsx` mit dieser Variante;
   * `eigen` = der Start-Client bringt seinen eigenen Aufbau mit (Hochzeit/Urlaub/Gutschein
   * auf `TunnelKacheln`-Basis). Beide laufen im selben Gerüst (`TunnelSeite`).
   */
  motor: { art: "kissfunnel"; variant: KissFunnelVariant } | { art: "eigen" };
  /**
   * Die erreichbaren Schritte des Tunnels (KONZEPT-TUNNEL.md): 1 = Name+E-Mail,
   * 2 = Vorlagen-/Look-Wahl, 3 = Beitrag (Upload/Aufnahme) + Generieren. Die Hochzeit hat
   * keinen Auswahl-Schritt (`[1, 3]`) — es gibt genau eine Traum-Vorlage.
   */
  schritte: number[];
  /** Wohin ein BEKANNTER Besucher springt — überspringt nur Schritt 1, nie die Auswahl. */
  schrittBekannt: number;
  /** ZEIGER auf die Preistabelle — nie eine eigene Zahl (siehe Kopfkommentar). */
  preisCents: () => number;
  /**
   * Was der Käufer am Ende BESITZT (§6/§7: das Versprechen ist KEIN Video-Produkt — das
   * Video ist der Haken, das Programm der Wert): `video` = eine Videodatei in der Galerie,
   * `programm` = Video + 30-Tage-Programm, `einladung` = eine lebende Einladungsseite,
   * `gutschein` = die Gratis-Karte (bezahlt wird nur das Geschenk dahinter).
   */
  resultArt: "video" | "programm" | "einladung" | "gutschein" | "bild" | "zugang";
  /**
   * NUR bei `resultArt: "programm"` (§9: generisch denken, nichts hart für Future Self) —
   * `slug` benennt das Programm im Speicher, `dauerTage` seine Länge. Ein späteres
   * „30-Day Fitness Program" ist ein zweiter Eintrag hier, kein zweiter Code-Pfad.
   */
  programm?: { slug: string; dauerTage: number };
  /**
   * §31: Marketing-Metadaten — seit 13.08.2026 GEFÜLLT (Owner: „Ich muss bei jedes Thema
   * überlegen wie ich die Ads mache"): headline/versprechen sind die Ads-Kurzform,
   * demoAsset der public-Ordner mit den Anzeigen-Videos. Die Langform (Hooks, Primary,
   * CTA je Sprache) steht menschenlesbar in ANZEIGEN.md. Die Beträge hier sind AD-COPY
   * (Handtext wie ANZEIGEN.md) — das Preisschild der Seite kommt weiter aus pricing.ts.
   */
  marketing?: { headline?: string; versprechen?: string; zielgruppe?: string; demoAsset?: string };
};

/**
 * Reihenfolge = die Reihenfolge im Haus (Startseite/Katalog); die Schlüssel sind dieselben
 * Kennungen, die `geschenkPreisCents` und das kiss-log schon heute kennen — KEINE Umbenennung
 * (§1: bestehende Daten dürfen nicht kaputtgehen; alte kiss-log-Einträge tragen diese Slugs).
 */
export const PRODUKTE: Record<string, ProduktDefinition> = {
  versprechen: {
    slug: "versprechen",
    /* §31 — die Ads-Kurzform; die Langform (Hooks, Primary, CTA) steht in ANZEIGEN.md. */
    marketing: { headline: "Future Self Program — $9.99", versprechen: "Sieh deine Zukunft. Mach das Versprechen. Halte es 30 Tage.", demoAsset: "/Versprechen" },
    startPfad: "/themes/versprechen/start",
    motor: { art: "kissfunnel", variant: "versprechen" },
    schritte: [1, 2, 3],
    schrittBekannt: 2,
    preisCents: () => geschenkPreisCents("versprechen"),
    resultArt: "programm",
    programm: { slug: "future-self", dauerTage: TRIAL_DAYS },
  },
  kiss: {
    slug: "kiss",
    /* §31 — die Ads-Kurzform; die Langform (Hooks, Primary, CTA) steht in ANZEIGEN.md. */
    marketing: { headline: "Kiss video — $9.99", versprechen: "Zwei Fotos — ein privates Kussvideo von euch beiden.", demoAsset: "/Kiss" },
    startPfad: "/themes/kiss/start",
    motor: { art: "kissfunnel", variant: "kiss" },
    schritte: [1, 2, 3],
    schrittBekannt: 2,
    preisCents: () => geschenkPreisCents("kiss"),
    resultArt: "video",
  },
  birthday: {
    slug: "birthday",
    /* §31 — die Ads-Kurzform; die Langform (Hooks, Primary, CTA) steht in ANZEIGEN.md. */
    marketing: { headline: "Birthday video — $9.99", versprechen: "Dein Gesicht, deine Stimme — in einer Welt, die niemand erwartet.", demoAsset: "/Birthday" },
    startPfad: "/themes/birthday/start",
    motor: { art: "kissfunnel", variant: "birthday" },
    schritte: [1, 2, 3],
    schrittBekannt: 2,
    preisCents: () => geschenkPreisCents("birthday"),
    resultArt: "video",
  },
  /** Der Tanz wohnt unter /themes/surprise („Surprise him"), heisst im Log aber `poledance`. */
  poledance: {
    slug: "poledance",
    /* §31 — die Ads-Kurzform; die Langform (Hooks, Primary, CTA) steht in ANZEIGEN.md. */
    marketing: { headline: "Private surprise — $9.99", versprechen: "Ein Foto — ein privates Tanzvideo, nur für ihn.", demoAsset: "/Pooldance" },
    startPfad: "/themes/surprise/start",
    motor: { art: "kissfunnel", variant: "poledance" },
    schritte: [1, 2, 3],
    schrittBekannt: 2,
    preisCents: () => geschenkPreisCents("poledance"),
    resultArt: "video",
  },
  wedding: {
    slug: "wedding",
    /* §31 — die Ads-Kurzform; die Langform (Hooks, Primary, CTA) steht in ANZEIGEN.md. */
    marketing: { headline: "Digital wedding planner — $9.99", versprechen: "Die Video-Einladung plus Gästeliste, Menü und Gruppenchat.", demoAsset: "/Wedding" },
    startPfad: "/themes/wedding/start",
    motor: { art: "eigen" },
    schritte: [1, 3],
    schrittBekannt: 3,
    preisCents: () => geschenkPreisCents("wedding"),
    resultArt: "einladung",
  },
  holiday: {
    slug: "holiday",
    /* §31 — die Ads-Kurzform; die Langform (Hooks, Primary, CTA) steht in ANZEIGEN.md. */
    marketing: { headline: "Urlaubs-Einladung — 9,99 €", versprechen: "Zwei Fotos, eine Traum-Szene, dein Einladungssatz.", demoAsset: "/Holiday" },
    startPfad: "/themes/holiday/start",
    motor: { art: "eigen" },
    schritte: [1, 2, 3],
    schrittBekannt: 2,
    preisCents: () => geschenkPreisCents("holiday"),
    resultArt: "einladung",
  },
  /**
   * DER TRY-ON ALS TUNNEL (Owner 13.08.2026, in drei Stufen verschärft: „wenn ich den tunel
   * bei einem produkt teste muss bei allen gehen" → „Du hast keinen richtigen Tunel gebaut"
   * → „bitte keine Gratis sachen"). Drei Schritte wie überall; Schritt 3 = Foto → Look →
   * „Jetzt generieren — 9,99 €" über die EINE Kasse, das Video liefert der Server in die
   * Galerie. Die Wardrobe ist wörtlich die Admin-A-List.
   */
  tryon: {
    slug: "tryon",
    /* §31 — die Ads-Kurzform; die Langform (Hooks, Primary, CTA) steht in ANZEIGEN.md. */
    marketing: { headline: "Try this look — 9,99 €", versprechen: "Ein Foto von dir — dein Try-on-Video in der Karte.", demoAsset: "/Tryon" },
    startPfad: "/themes/tryon/start",
    motor: { art: "eigen" },
    /* DREI Schritte wie jeder Tunnel (Owner 13.08.2026: „Du hast keinen richtigen Tunel
       gebaut") — Schritt 3 ist Foto-Kachel → Ziel-Look → „Jetzt generieren" IM Gerüst;
       nur die Bezahl-Stufen nach dem Gratis-Bild wohnen weiter auf /tryon/<lookId>. */
    schritte: [1, 2, 3],
    schrittBekannt: 2,
    /* KEIN GRATIS (Owner 13.08.2026: „bitte keine Gratis sachen. Ziehe den Tunel stur
       druch von Kiss, Versprechen, Hochzeit") — der Try-on ist ein Geschenk-Video zum
       Hauspreis, dieselbe Kasse, dieselbe Lieferung in die Galerie. */
    preisCents: () => geschenkPreisCents("tryon"),
    resultArt: "video",
  },
  /**
   * DER CHAT (Owner 13.08.2026: „für chat das selbe tunel … das kostet wie Hochzeit.
   * 9,99 dann 14,99 im monat") — Einstieg zum Hauspreis (CHAT_STUFEN, price_data),
   * Verlängerung über das eine Abo wie bei der Hochzeit. Schritte [1, 3] wie die
   * Hochzeit: es gibt nichts zu wählen, Bella IST das Produkt.
   */
  chat: {
    slug: "chat",
    /* §31 — die Ads-Kurzform; die Langform (Hooks, Primary, CTA) steht in ANZEIGEN.md. */
    marketing: { headline: "KI-Freundin verschenken — 9,99 €", versprechen: "Bella schreibt jeden Tag zurück — erster Monat 9,99, dann 14,99/Monat.", demoAsset: "/Chat" },
    startPfad: "/themes/chat/start",
    motor: { art: "eigen" },
    schritte: [1, 3],
    schrittBekannt: 3,
    preisCents: () => CHAT_STUFEN[0].cents,
    resultArt: "zugang",
  },
  gutschein: {
    slug: "gutschein",
    /* §31 — die Ads-Kurzform; die Langform (Hooks, Primary, CTA) steht in ANZEIGEN.md. */
    marketing: { headline: "Der LuxuryBandit-Gutschein", versprechen: "Karte gratis — bezahlt wird nur das Geschenk dahinter.", demoAsset: "/Gutscheine" },
    startPfad: "/themes/gutschein/start",
    motor: { art: "eigen" },
    schritte: [1, 2, 3],
    schrittBekannt: 2,
    preisCents: () => geschenkPreisCents("gutschein"),
    resultArt: "gutschein",
  },
};

/**
 * Nachschlagen mit lautem Fehler statt stillem `undefined`: Ein Tippfehler im Slug soll beim
 * ersten Rendern knallen, nicht als leerer Tunnel beim Kunden ankommen.
 */
export function produkt(slug: string): ProduktDefinition {
  const p = PRODUKTE[slug];
  if (!p) throw new Error(`Unbekanntes Produkt: ${slug}`);
  return p;
}

/**
 * Die Variante für den `KissFunnel`-Motor — mit lautem Fehler, falls jemand ein
 * `eigen`-Produkt (Hochzeit/Urlaub/Gutschein) versehentlich in den KissFunnel steckt.
 */
export function kissfunnelVariant(p: ProduktDefinition): KissFunnelVariant {
  if (p.motor.art !== "kissfunnel") throw new Error(`${p.slug} fährt nicht im KissFunnel`);
  return p.motor.variant;
}
