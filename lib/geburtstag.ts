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
 * KEIN TEXT IM VIDEO: Die alte Bella-Vorlage trug „Hey Darling, Happy Birthday!" eingebrannt —
 * daher stammt der Halbsatz; er bleibt als Wache. Ohne ihn schreibt Pixverse solche
 * Schriftzüge gern mit, und dann stünde ein fremder Gruss auf einem Geschenk für einen ganz
 * bestimmten Menschen.
 */
export const GEBURTSTAG_PROMPT =
  "The woman from @image1 says: \"Happy birthday to you! Happy birthday to you!\" " +
  "She holds the cake from @image2 and wears the outfit from @image2, " +
  "in the same warm candlelit room. " +
  "No text, no letters, no writing anywhere in the frame.";

/**
 * DIE VORLAGE — das zweite Referenzbild.
 *
 * Sie liefert drei Dinge auf einmal: den Look, die Torte in der Hand und die Umgebung.
 * Deshalb steht sie an BEIDEN Stellen im Prompt oben.
 *
 * SEIT 07.08.2026 DAS SCHOKO-SET STATT DER DESSOUS-VORLAGE (Owner: „generiere ein Video
 * dass nicht nach erotik aussieht", dann „der Look und die Torte sind sehr gut"): festliches
 * Kleid statt Wäsche, Schokoladentorte statt rosa („Ich brauche eine schöne Schokoladentorte"),
 * auf 3:4 beschnitten — das Kartenmaß des Trichters. Ein Geschenk „für Mama, für die
 * Schwester" (so die eigene Anlass-Zeile) darf nicht wie ein Erotik-Produkt aussehen; genau
 * daran ist der Eigentümer-Test am 07.08. hängen geblieben. Die Kleidung ist im Prompt
 * ALLGEMEIN zu halten (Owner: „falls ein Mann sich hochlädt, dann er muss natürlich kein
 * Kleid haben"). Die alte Datei (birthday-set.png) bleibt unangerufen liegen, für den
 * Fall eines Rückbaus.
 *
 * Statisch im Repo, nicht im Speicher: Ein signierter Link läuft ab, dieser Pfad nie — und die
 * Vorlage ist Teil des Produkts, nicht gepflegter Inhalt.
 */
export const GEBURTSTAG_SET = "/Birthday/birthday-set-schoko.jpg";

/**
 * DAS BEISPIELVIDEO — seit 07.08.2026 aus der neuen Kette erzeugt, nicht mehr mitgeliefert:
 * OpenAI-Avatar (gpt-image-1.5, Qualität medium — „medum reicht") → HeyGen `POST /v3/videos`
 * (engine avatar_iv, Look = dieses Set, aspect „auto" ergibt 3:4, Tempo 1.0, 720p, Stimme
 * „Joy"). 4,6 Sekunden, ~20 Cent laut Verbrauchszähler; abgenommen mit „alles passt perfekt".
 * Zugleich der Beweis, dass dieselbe Strecke Kundenvideos automatisch erzeugen kann —
 * der Trichter selbst ruft bis zu seinem Umbau weiter Pixverse mit GEBURTSTAG_PROMPT.
 */
export const GEBURTSTAG_VIDEO = "/Birthday/hbd-schoko.mp4";

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
