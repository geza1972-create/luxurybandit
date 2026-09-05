import AsciiVideo from "@/components/AsciiVideo";


/**
 * DIE WURZEL VON `yourvideogenerator.com` — ein Video in Schriftzeichen, sonst nichts.
 *
 * Owner 02.09.2026: „ich habe yourvideogenerator.com reserviert" · „ja, und da kommen noch
 * andere Funnels als White-Label" · „aber unter yourvideogenerator.com/ müsste ein cooles
 * Video sein, vollflächig. Mehr nicht" · „oder kannst du ein ASCII-Code-Video machen?" ·
 * „weisse Schrift auf schwarz".
 *
 * WAS HIER VORHER STAND: eine Erklärseite mit Überschrift, drei Orten und einem Kontaktknopf.
 * Sie ist Stück für Stück abgeräumt worden — erst die Signatur, dann das Menü, dann der
 * Kontakt — und das war jedes Mal derselbe Gedanke, den der Owner am Ende zu Ende gedacht
 * hat: Diese Domain ist ein TRÄGER für Kunden-Trichter, kein Schaufenster für uns. Wer die
 * nackte Adresse eintippt, hat sich verlaufen oder prüft, wohin ein Link führt. Er braucht
 * kein Angebot, sondern einen Beweis, dass hier jemand Videos macht.
 *
 * WARUM ASCII: Die Domain heisst „your video generator" und trägt Trichter, in denen aus
 * einem Foto ein Video wird. Ein Video, das sich vor den Augen des Betrachters aus Zeichen
 * zusammensetzt, sagt genau das — ohne ein Wort und ohne eine Marke. Und es löst nebenbei
 * ein echtes Problem: In ASCII bleibt von jedem Motiv nur Bewegung und Kontrast, also kann
 * sogar ein Kundenclip als Vorlage dienen, ohne dessen Marke preiszugeben.
 *
 * KEIN TEXT, KEIN KNOPF, KEIN MENÜ (das Menü blendet `BottomNav` am Host aus). „Mehr nicht"
 * ist wörtlich gemeint.
 */
export default function FunnelDomainStart() {
  /**
   * DER CLIP DES OWNERS (02.09.2026: „ich habe hier ein Video für die Startseite" ·
   * „youvideogenerator-video, es ist da").
   *
   * Er löst nebenbei die Flanke des vorherigen: Dort lief der Academy-Spot, und dessen
   * Schlussbild trägt die Marke des Kunden samt QR-Code — grosse Buchstaben überstehen die
   * Umrechnung in Blöcke fast unbeschadet. Dieser Clip hat weder Schrift noch Code, also
   * bleibt auf der allgemeinen Domain auch keine fremde Marke stehen.
   *
   * MIT TON, ABER STUMM ANGEFANGEN: Der Clip hat eine Tonspur; ein Browser startet ein
   * Video mit Ton aber nur nach einer Geste. Der Knopf oben rechts schaltet ihn dazu.
   */
  /**
   * WAS SIE SAGEN (Owner 02.09.2026, wörtlich diktiert: „I knew you will come back, i really
   * never left. there is thousand reasons why this is wrong and only one reason why is
   * right").
   *
   * IN VIER ZEILEN STATT DREI SÄTZEN: Bei 100 Zeichen Rasterbreite passen rund 22 Buchstaben
   * in eine lesbare Zeile — längere Zeilen werden in Blöcken zu Brei. Die Umbrüche sitzen
   * deshalb dort, wo der Satz ohnehin atmet, und der Gedankenstrich hält die letzte Hälfte
   * zusammen.
   *
   * VERSALIEN, weil eine Blockschrift bei Kleinbuchstaben die Unterlängen verliert („g", „y")
   * und aus jedem Wort ein Rechteck macht.
   */
  const SATZ = [
    "I KNEW YOU'D COME BACK",
    "I NEVER REALLY LEFT",
    "A THOUSAND REASONS",
    "WHY THIS IS WRONG",
    "AND ONE WHY IT'S RIGHT",
  ];
  return <AsciiVideo src="/youvideogenerator-video.mp4" ton zeilenText={SATZ} />;
}
