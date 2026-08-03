/**
 * DER GEBURTSTAG — ein Geschenk, ein Prompt, ein Set.
 *
 * Owner 03.08.2026: „Jetzt müssen wir ‚She says happy birthday 🎂‘ genau wie ‚Surprise him‘
 * machen. Ein Bild von sich hochladen und den Namen von dem, der Geburtstag hat, eingeben —
 * dann wird eine Dame in einem Look generiert, mit der Torte in der Hand, genau wie Bella, und
 * auch die Umgebung ist gleich. Das muss direkt an Pixverse. Ich habe dir das Video und das
 * Bild von Bella gegeben. Prompten musst du das so: She sings Happy Birthday. Oben steht in der
 * Karte nur ‚Happy birthday to you {Name}‘."
 *
 * WARUM DIESE DATEI: dieselbe Begründung wie bei `lib/poledance.ts` und `lib/kuss-szenen.ts` —
 * der Prompt, mit dem das Beispielvideo entstand, IST das Produkt. Die Kundin klickt, weil sie
 * genau dieses Video gesehen hat. Er steht deshalb an EINER Stelle und wird nirgends im Code
 * neu getippt.
 */

/**
 * DER PROMPT.
 *
 * Owner 03.08.2026, nach dem ersten Blick auf das Ergebnis: „Prompt ist ‚happy birthday to you!
 * happy birthday to you!‘ — weil sie nicht singen kann."
 *
 * DAS IST DER GANZE UNTERSCHIED, und er ist grösser als er aussieht: „She sings Happy Birthday"
 * beschreibt eine HANDLUNG, die das Modell nachbauen soll — und Gesang ist genau das, was es
 * nicht kann; heraus kommt ein Mund, der sich zu nichts bewegt. Die WÖRTER dagegen kann es:
 * Es formt Lippen zu einem Satz, den man ihm gibt. Also steht der Satz jetzt da, wörtlich und
 * zweimal, so wie der Owner ihn geschickt hat.
 *
 * DIE BINDUNG DER BILDER bleibt wie beim Tanz, wo sie nachweislich trägt:
 *   @image1 → das Foto der Kundin   (im Trichter `person`)
 *   @image2 → Bellas Vorlage        (im Trichter `garment`)
 *
 * NEUTRALE WÖRTER (Hausregel): „outfit", nicht „lingerie", kein „lace", kein „skin".
 *
 * KEIN TEXT IM VIDEO: Bellas Vorlage trägt „Hey Darling, Happy Birthday!" eingebrannt — im
 * Beispielvideo scheint es sogar durch. Ohne den letzten Halbsatz schreibt Pixverse solche
 * Schriftzüge gern mit, und dann stünde ein fremder Gruss auf einem Geschenk für einen ganz
 * bestimmten Menschen.
 */
export const GEBURTSTAG_PROMPT =
  "The woman from @image1 says: \"Happy birthday to you! Happy birthday to you!\" " +
  "She holds the cake from @image2 and wears the outfit from @image2, " +
  "in the same warm candlelit room. " +
  "No text, no letters, no writing anywhere in the frame.";

/**
 * BELLAS VORLAGE — das zweite Referenzbild.
 *
 * Sie liefert drei Dinge auf einmal, die der Owner einzeln genannt hat: den Look, die Torte in
 * der Hand und die Umgebung. Deshalb steht sie an BEIDEN Stellen im Prompt oben.
 *
 * Statisch im Repo, nicht im Speicher: Ein signierter Link läuft ab, dieser Pfad nie — und die
 * Vorlage ist Teil des Produkts, nicht gepflegter Inhalt. Der Dateiname war
 * „ChatGPT Image 19. Juli 2026, 19_30_42.png"; umbenannt, weil Leerzeichen und Kommas in URLs
 * kodiert werden müssen und auf Vercel zusätzlich die Groß-/Kleinschreibung zählt.
 */
export const GEBURTSTAG_SET = "/Birthday/birthday-set.png";

/** Das Beispielvideo, das der Owner mitgeliefert hat — der Beweis, dass der Prompt trägt. */
export const GEBURTSTAG_VIDEO = "/Birthday/hbd.mp4";

/**
 * DIE ZEILE ÜBER DER KARTE (Owner wörtlich: „Oben steht in der Karte nur ‚Happy birthday to
 * you {Name}‘").
 *
 * Ohne Namen bleibt „Happy birthday to you" stehen — ein Geschenk ohne Empfänger ist immer noch
 * ein Geschenk, aber ein „to you ," mit leerer Stelle sieht aus wie ein Fehler.
 */
export const geburtstagTitel = (name: string): string => {
  const n = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 24);
  return n ? `Happy birthday to you ${n}` : "Happy birthday to you";
};
