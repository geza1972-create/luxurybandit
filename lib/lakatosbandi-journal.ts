/**
 * DAS JOURNAL VON LAKATOSBANDI.COM — fünf Artikel für Künstler (Owner 10.09.2026: „und schreiben
 * einige Artikel und posten unseren Hook mit dem Stein").
 *
 * WOFÜR: Google (jede Sprache eine eigene Adresse, `/journal/<sprache>/<slug>`) und Stoff für
 * Posts. Jeder Artikel endet mit dem Aufruf, sich als Künstler zu bewerben (Owner: „Artist fondator nu-mi place — noi suntem fondatorii").
 *
 * NUR, WAS STIMMT:
 *  · Pet Rock: Gary Dahl, 1975, rund 1,5 Millionen Stück zu je knapp 4 Dollar — belegt.
 *  · Preisstufen 200–1.000 / 1.000–2.000 / ab 2.000 € sind die Einordnung des Owners
 *    (lib/versusforge-kunst-rezept.ts, `PREISSTUFEN`) — als Orientierung formuliert, nicht als Gesetz.
 *  · Owner zum Preis: „Man kann nur vergleichen, was die anderen für diese Art von Kunst
 *    VERKAUFEN, nicht verlangen."
 *  · Keine erfundenen Studien, Prozentzahlen oder Künstler.
 *
 * FEST GESCHRIEBEN, NICHT MASCHINELL ÜBERSETZT — ein Artikel ist Aushängeschild, kein Knopftext.
 * Keine geraden Anführungszeichen im Text: “ ” und „ “ statt ".
 */
export type JournalSprache = "en" | "ro" | "de";

export type ArtikelText = {
  titel: string;
  beschreibung: string;
  lead: string;
  teile: { h: string; p: string[] }[];
  merksatz: string;
  /**
   * EIN BILD IM ARTIKEL, je Sprache (Dateiname in public/lakatosbandi/journal/). Optional —
   * die ersten fünf Artikel haben keines und sollen keines bekommen.
   *
   * WARUM JE SPRACHE und nicht je Artikel: Das Bild trägt Text. Ein rumänisches Zitatbild über
   * einem deutschen Artikel wäre falsch. Nicht zu verwechseln mit der LINKVORSCHAU, die weiter
   * `<slug>-<sprache>.jpg` heißt und 1200×630 misst — dieses hier steht im Text.
   */
  bild?: string;
  /** Die Zeile auf dem Knopf unter dem Film im Artikel — nur wo der Artikel einen Film hat. */
  videoKnopf?: string;
};

/**
 * ── WOHIN DER ABSCHLUSSBLOCK FÜHRT (Owner 16.09.2026: „und in dem anderen artikel der link zum
 * postershop") ──────────────────────────────────────────────────────────────────────────────
 *
 * Die ersten Artikel sprechen Künstler an; ihr Aufruf ist der Trichter. Der Artikel über Poster
 * viu spricht KÄUFER an — den zu fragen, ob er sich als Künstler bewerben will, wäre die falsche
 * Tür am Ende des richtigen Textes.
 */
export type ArtikelZiel = "trichter" | "shop";

/**
 * ── EIN FILM IM ARTIKEL (Owner 20.09.2026: „dann zeigst du mein Video und sagst: verbinde jedes
 * Kunstwerk mit deinem Video") ──────────────────────────────────────────────────────────────
 *
 * Kein eingebetteter Fremdplayer und keine zweite Kopie der Datei: Der Artikel zeigt denselben
 * Film, der am Werk hängt (`api/portal-film`), im selben Player wie die Film-Folie der
 * Produktseite — Standbild aus dem Film, Play-Knopf, Ladebalken, Leiste, Musik. Darunter führt
 * ein Knopf auf genau diese Folie (`/<künstler>/<werk>?slide=video`), damit der Leser sieht, wo
 * so ein Film im Laden wohnt.
 */
export type ArtikelVideo = { mandant: string; werk: string };

/**
 * ── EIN KURZER FILM MITTEN IM TEXT (Owner 20.09.2026: „ich gebe dir noch ein Video, zu zeigen
 * wie jemand das Poster an die Wand hängt. Das machst du auch in den Artikel rein") ───────────
 *
 * Anders als `video` hängt dieser Film an keinem Werk: Er liegt als Datei neben den Bildern des
 * Journals (`public/lakatosbandi/journal/`), samt Standbild AUS dem Film. `nachTeil` ist die
 * Nummer des Abschnitts (ab 0), unter dem er steht. Die Musik ist in die Datei eingemischt.
 */
export type ArtikelClip = { nachTeil: number; datei: string; standbild: string; breit: number; hoch: number;
  /** Die Kennung auf YouTube — dann spielt er von dort, `datei` bleibt der Rückfall. */ youtube?: string };

export type Artikel = { slug: string; datum: string; ziel?: ArtikelZiel; video?: ArtikelVideo; clips?: ArtikelClip[]; texte: Record<JournalSprache, ArtikelText> };

export const JOURNAL_SPRACHEN: JournalSprache[] = ["en", "ro", "de"];

export const JOURNAL_UI: Record<JournalSprache, { titel: string; lead: string; lesen: string; zurueck: string; ctaTitel: string; ctaText: string; ctaKnopf: string; shopTitel: string; shopText: string; shopKnopf: string; minuten: string }> = {
  /* DER AUFRUF STAND NOCH AUF DER ALTEN LINIE (bis 12.09.2026: „mindestens drei Werke im selben
     Stil · Prüfung innerhalb von 3 Tagen"). Das widerspricht Anzeige, Trichter und AGB, seit es
     keine Aufnahmeprüfung mehr gibt und bis zu zehn Werke hochgeladen werden (Owner 12.09.2026:
     „es muss klar sein, dass alle mitmachen können, nicht nur berühmte Künstler, jeder wirklich
     jeder" · „bis zu 10 werke dann"). Ein Leser findet solche Widersprüche in einer Sekunde. */
  en: { titel: "Journal", lead: "Marketing for artists — honest, practical, without empty promises.", lesen: "Read", zurueck: "All articles", ctaTitel: "Want this for your work?", ctaText: "Open your archive: upload up to 10 works, we write the texts, you approve. No entrance exam — anyone can take part. Free.", ctaKnopf: "Apply as an artist", shopTitel: "Want one on your wall?", shopText: "All Living Posters in one place: van Gogh, Klimt, Monet, Hokusai, Munch, Friedrich — and the artists who offer their work as posters. Printed to order, delivered in Romania.", shopKnopf: "See the posters", minuten: "min read" },
  ro: { titel: "Jurnal", lead: "Marketing pentru artiști — sincer, practic, fără promisiuni goale.", lesen: "Citește", zurueck: "Toate articolele", ctaTitel: "Vrei asta pentru lucrările tale?", ctaText: "Deschide-ți arhiva: încarci până la 10 lucrări, noi scriem textele, tu aprobi. Fără examen de admitere — poate participa oricine. Gratuit.", ctaKnopf: "Aplică ca artist", shopTitel: "Vrei unul pe peretele tău?", shopText: "Toate Living Poster într-un loc: van Gogh, Klimt, Monet, Hokusai, Munch, Friedrich — și artiștii care își oferă lucrările ca postere. Tipărite la comandă, livrate în România.", shopKnopf: "Vezi posterele", minuten: "min de citit" },
  de: { titel: "Journal", lead: "Marketing für Künstler — ehrlich, praktisch, ohne leere Versprechen.", lesen: "Lesen", zurueck: "Alle Artikel", ctaTitel: "Willst du das für deine Werke?", ctaText: "Öffne dein Archiv: bis zu 10 Werke hochladen, wir schreiben die Texte, du gibst frei. Keine Aufnahmeprüfung — jeder kann mitmachen. Kostenlos.", ctaKnopf: "Als Künstler bewerben", shopTitel: "Willst du eines an deiner Wand?", shopText: "Alle Living Poster an einem Ort: van Gogh, Klimt, Monet, Hokusai, Munch, Friedrich — und die Künstler, die ihre Werke als Poster anbieten. Auf Bestellung gedruckt, Lieferung nach Rumänien.", shopKnopf: "Zu den Postern", minuten: "Min. Lesezeit" },
};

export const ARTIKEL: Artikel[] = [
  /* ── DIE GESCHICHTE HINTER DEM BILD (Owner 20.09.2026: „du machst jetzt einen Artikel dafür,
     wie man seine Kunst richtig vermarkten soll. Storytelling ist alles. Dann zeigst du mein
     Video und sagst: verbinde jedes Kunstwerk mit deinem Video") ─────────────────────────────
     NUR, WAS STIMMT: Das Beispiel ist Gerry Louisett neben seinem Living Poster „Gina" (2015) —
     der Film hängt wirklich an diesem Werk. WAS er darin sagt, wird nicht nacherzählt; der Leser
     sieht es selbst. Keine Zahlen über „Videos verkaufen x % mehr" — wir haben keine.
     POSTER-ABSCHNITT (Owner 20.09.2026: „man soll sein Kunstwerk als Poster anbieten, weil man das
     mehrmals verkaufen kann und letztendlich mehr verdient. Wir helfen den Künstlern, ihre
     Kunstwerke zu präsentieren"): 10 € je Poster ist `DRUCK_KUENSTLER_CENTS`. „Mehr" ist hier
     keine Schätzung, sondern Rechnung — das Original bleibt verkäuflich, jedes Poster kommt dazu. */
  {
    slug: "story-behind-the-picture",
    datum: "2026-09-20",
    video: { mandant: "gerrylouisett", werk: "standard" },
    /* Unter „Biete das Werk als Poster an" (Abschnitt 6): auspacken, tragen, aufhängen, ansehen. */
    clips: [{ nachTeil: 6, datei: "poster-an-die-wand.mp4", standbild: "poster-an-die-wand-standbild.jpg", breit: 768, hoch: 1024, youtube: "u67KZ8hSZsw" }],
    texte: {
      en: {
        titel: "The story behind the picture — how to present an artwork so people stop",
        beschreibung: "A picture alone asks to be looked at. A picture with its story asks to be remembered. How to present your work with one minute of video — and why every artwork should carry yours.",
        lead: "Most artworks are presented the same way: a photo, a title, a size, a price. That is a label, not a presentation. What makes someone stop is the one thing only you can add — the story behind the picture.",
        videoKnopf: "See it on the poster’s own page",
        teile: [
          { h: "A picture without a story is decoration", p: [
            "Someone scrolling past your work decides in a second whether it is theirs. In that second they see colour and form — and nothing of what it cost you, where it happened, or why it looks the way it does.",
            "Decoration is compared by price and by whether it fits the sofa. A work with a story is not compared at all, because there is only one of it.",
          ] },
          { h: "What a buyer actually takes home", p: [
            "Think of the last time someone showed you a picture on their wall. They did not say “acrylic on canvas, 60 by 80”. They said where they found it, who made it, and what the artist told them.",
            "That sentence is what they bought. The picture is how they keep it. If you do not give them the sentence, they have nothing to retell — and a work nobody talks about does not travel.",
          ] },
          { h: "Show it, do not write it", p: [
            "You can write the story under the image, and you should. But a text is read by the few who were already interested. A face is watched by almost everyone.",
            "Above you see Gerry Louisett next to his Living Poster “Gina”, from 2015. He stands beside the work, phone in his hand, and talks about it. No studio, no script on a screen, no editing. It is the artist and the picture in the same frame — and that is the whole idea.",
          ] },
          { h: "What to say in that minute", p: [
            "One work, one story. Where were you when it started? What went wrong on the way? What should I look for that I would miss on my own? Pick one of these, not all three.",
            "Leave out your CV, your exhibitions and the list of techniques. They belong on your profile. In front of the picture people want to hear the thing you would tell a friend who asks: “and this one?”",
          ] },
          { h: "How to film it", p: [
            "Hold the phone upright. Stand next to the work, not in front of it, so both of you are in the picture. Use daylight from a window and turn off the music in the room.",
            "Keep it under a minute and do it in one take. If you stumble, leave it in — a person who searches for a word is believed sooner than one who recites. Do three takes and keep the one where you forgot the camera.",
          ] },
          { h: "Connect every artwork with your video", p: [
            "A video that lives only on your phone or somewhere in a feed is gone tomorrow. It has to hang on the work itself — so that whoever stands in front of the picture finds the story, today and in three years.",
            "That is what a Living Poster does. The printed poster carries a QR code; scan it and the film starts, with music, next to the work. On lakatosbandi.com every poster also has its own page, and the film has its own address on it — one link you can send, post or put under an ad, and it opens exactly there.",
            "Start with one work. Film the story, hang it on the picture, send the link to five people who know you. Then do the next one.",
          ] },
          { h: "Offer the work as a poster — you can sell it more than once", p: [
            "An original can be sold exactly once. After that the work you put weeks into earns you nothing more, however many people would have loved it on their wall.",
            "A poster of it can be sold again and again. For every poster of yours we sell, you get 10 € — added on top of our price, not taken out of yours. The original stays yours the whole time and can still be sold as what it is: the only one.",
            "So it is not poster instead of original. It is the original, plus every poster that finds a wall. In the end that is more than the single sale — and many more people live with your picture than one buyer ever could.",
          ] },
          { h: "We help you present it", p: [
            "You do not have to build any of this yourself. On lakatosbandi.com your work becomes a Living Poster: the sheet with your title and your sentence, the rooms it hangs in, the QR code, the page of its own that you can share — and your film on it.",
            "You bring the work and the minute in front of the camera. We take care of how it is shown, printed and delivered. You decide work by work what may become a poster, and you can take it back at any time.",
          ] },
        ],
        merksatz: "People forget a picture. They retell a story.",
      },
      ro: {
        titel: "Povestea din spatele tabloului — cum prezinți o lucrare ca oamenii să se oprească",
        beschreibung: "Un tablou singur cere să fie privit. Un tablou cu povestea lui cere să fie ținut minte. Cum îți prezinți lucrarea cu un minut de video — și de ce fiecare lucrare ar trebui să îl poarte pe al tău.",
        lead: "Cele mai multe lucrări sunt prezentate la fel: o fotografie, un titlu, o dimensiune, un preț. Asta e o etichetă, nu o prezentare. Ce îl face pe cineva să se oprească este singurul lucru pe care doar tu îl poți adăuga — povestea din spatele tabloului.",
        videoKnopf: "Vezi-l pe pagina posterului",
        teile: [
          { h: "Un tablou fără poveste este decor", p: [
            "Cine trece cu degetul peste lucrarea ta hotărăște într-o secundă dacă e a lui. În secunda aceea vede culoare și formă — și nimic din ce te-a costat, unde s-a întâmplat sau de ce arată așa.",
            "Decorul se compară după preț și după cum se potrivește cu canapeaua. O lucrare cu poveste nu se compară deloc, pentru că există una singură.",
          ] },
          { h: "Ce duce acasă, de fapt, un cumpărător", p: [
            "Gândește-te la ultima dată când cineva ți-a arătat un tablou de pe peretele lui. Nu a spus „acril pe pânză, 60 pe 80”. A spus unde l-a găsit, cine l-a făcut și ce i-a povestit artistul.",
            "Propoziția aceea este ce a cumpărat. Tabloul este felul în care o păstrează. Dacă nu îi dai propoziția, nu are ce povesti mai departe — iar o lucrare despre care nu vorbește nimeni nu ajunge nicăieri.",
          ] },
          { h: "Arată, nu scrie", p: [
            "Poți scrie povestea sub imagine, și e bine să o faci. Dar un text îl citesc cei puțini care erau deja interesați. La un chip se uită aproape toată lumea.",
            "Mai sus îl vezi pe Gerry Louisett lângă Living Posterul lui, „Gina”, din 2015. Stă lângă lucrare, cu telefonul în mână, și vorbește despre ea. Fără studio, fără text pe un ecran, fără montaj. Artistul și tabloul în același cadru — asta e toată ideea.",
          ] },
          { h: "Ce spui în minutul acela", p: [
            "O lucrare, o poveste. Unde erai când a început? Ce a mers prost pe drum? La ce să mă uit, ca să nu-mi scape? Alege una dintre ele, nu pe toate trei.",
            "Lasă deoparte CV-ul, expozițiile și lista de tehnici. Locul lor e în profil. În fața tabloului, oamenii vor să audă ce i-ai spune unui prieten care te întreabă: „și ăsta?”",
          ] },
          { h: "Cum filmezi", p: [
            "Ține telefonul în picioare. Stai lângă lucrare, nu în fața ei, ca să fiți amândoi în cadru. Folosește lumina de la fereastră și oprește muzica din cameră.",
            "Rămâi sub un minut și filmează dintr-o singură bucată. Dacă te încurci, lasă așa — un om care își caută cuvântul e crezut mai repede decât unul care recită. Fă trei duble și păstreaz-o pe cea în care ai uitat de cameră.",
          ] },
          { h: "Leagă fiecare lucrare de videoul tău", p: [
            "Un video care trăiește doar în telefonul tău sau undeva într-un feed dispare până mâine. Trebuie să atârne de lucrarea însăși — ca oricine stă în fața tabloului să găsească povestea, azi și peste trei ani.",
            "Asta face un Living Poster. Posterul tipărit poartă un cod QR; îl scanezi și pornește filmul, cu muzică, lângă lucrare. Pe lakatosbandi.com fiecare poster are și pagina lui, iar filmul are acolo adresa lui — un singur link pe care îl poți trimite, posta sau pune sub o reclamă, și se deschide exact acolo.",
            "Începe cu o singură lucrare. Filmează povestea, leag-o de tablou, trimite linkul la cinci oameni care te cunosc. Apoi treci la următoarea.",
          ] },
          { h: "Oferă lucrarea ca poster — o poți vinde de mai multe ori", p: [
            "Un original se vinde o singură dată. După aceea, lucrarea în care ai pus săptămâni nu îți mai aduce nimic, oricâți oameni ar fi vrut-o pe peretele lor.",
            "Un poster după ea se poate vinde iar și iar. Pentru fiecare poster al tău vândut primești 10 € — adăugați la prețul nostru, nu scăzuți din partea ta. Originalul rămâne al tău tot timpul și se poate vinde în continuare drept ceea ce este: singurul.",
            "Deci nu poster în loc de original. Este originalul, plus fiecare poster care își găsește un perete. La final înseamnă mai mult decât o singură vânzare — și mult mai mulți oameni trăiesc cu tabloul tău decât ar putea un singur cumpărător.",
          ] },
          { h: "Te ajutăm să o prezinți", p: [
            "Nu trebuie să construiești nimic din toate acestea singur. Pe lakatosbandi.com lucrarea ta devine un Living Poster: foaia cu titlul și propoziția ta, camerele în care atârnă, codul QR, pagina ei proprie pe care o poți distribui — și filmul tău pe ea.",
            "Tu aduci lucrarea și minutul din fața camerei. Noi ne ocupăm de cum este arătată, tipărită și livrată. Hotărăști lucrare cu lucrare ce poate deveni poster și poți retrage oricând acordul.",
          ] },
        ],
        merksatz: "Un tablou se uită. O poveste se spune mai departe.",
      },
      de: {
        titel: "Die Geschichte hinter dem Bild — wie du ein Werk so zeigst, dass man stehen bleibt",
        beschreibung: "Ein Bild allein will angesehen werden. Ein Bild mit seiner Geschichte will behalten werden. Wie du dein Werk mit einer Minute Video zeigst — und warum jedes Werk deines tragen sollte.",
        lead: "Die meisten Werke werden gleich gezeigt: ein Foto, ein Titel, ein Mass, ein Preis. Das ist ein Etikett, keine Präsentation. Stehen bleibt jemand wegen der einen Sache, die nur du dazugeben kannst — der Geschichte hinter dem Bild.",
        videoKnopf: "Auf der Seite des Posters ansehen",
        teile: [
          { h: "Ein Bild ohne Geschichte ist Dekoration", p: [
            "Wer an deinem Werk vorbeiwischt, entscheidet in einer Sekunde, ob es seines ist. In dieser Sekunde sieht er Farbe und Form — und nichts davon, was es dich gekostet hat, wo es passiert ist oder warum es so aussieht.",
            "Dekoration wird nach dem Preis verglichen und danach, ob sie zum Sofa passt. Ein Werk mit Geschichte wird gar nicht verglichen, weil es davon nur eines gibt.",
          ] },
          { h: "Was ein Käufer wirklich mit nach Hause nimmt", p: [
            "Denk an das letzte Mal, als dir jemand ein Bild an seiner Wand gezeigt hat. Er hat nicht gesagt: „Acryl auf Leinwand, 60 mal 80.“ Er hat erzählt, wo er es gefunden hat, wer es gemacht hat und was der Künstler ihm dazu gesagt hat.",
            "Diesen Satz hat er gekauft. Das Bild ist die Form, in der er ihn aufbewahrt. Gibst du ihm den Satz nicht, hat er nichts weiterzuerzählen — und ein Werk, über das niemand spricht, kommt nirgendwohin.",
          ] },
          { h: "Zeig es, schreib es nicht nur", p: [
            "Du kannst die Geschichte unter das Bild schreiben, und das sollst du auch. Aber einen Text lesen die wenigen, die sich ohnehin schon interessiert haben. Einem Gesicht sieht fast jeder zu.",
            "Oben siehst du Gerry Louisett neben seinem Living Poster „Gina“ von 2015. Er steht neben dem Werk, das Telefon in der Hand, und spricht darüber. Kein Studio, kein Text vom Bildschirm, kein Schnitt. Der Künstler und das Bild im selben Bild — das ist die ganze Idee.",
          ] },
          { h: "Was du in dieser Minute sagst", p: [
            "Ein Werk, eine Geschichte. Wo warst du, als es anfing? Was ist unterwegs schiefgegangen? Worauf soll ich achten, was mir allein entginge? Nimm eines davon, nicht alle drei.",
            "Lass deinen Lebenslauf, deine Ausstellungen und die Liste der Techniken weg. Sie gehören ins Profil. Vor dem Bild wollen die Leute hören, was du einem Freund sagst, der fragt: „Und das hier?“",
          ] },
          { h: "Wie du es filmst", p: [
            "Halte das Telefon hochkant. Stell dich neben das Werk, nicht davor, damit ihr beide im Bild seid. Nimm Tageslicht vom Fenster und mach die Musik im Raum aus.",
            "Bleib unter einer Minute und dreh in einem Stück. Wenn du dich verhaspelst, lass es drin — einem Menschen, der nach einem Wort sucht, glaubt man eher als einem, der aufsagt. Mach drei Anläufe und nimm den, bei dem du die Kamera vergessen hast.",
          ] },
          { h: "Verbinde jedes Werk mit deinem Video", p: [
            "Ein Video, das nur auf deinem Telefon liegt oder irgendwo in einem Feed, ist morgen weg. Es muss am Werk selbst hängen — damit jeder, der vor dem Bild steht, die Geschichte findet, heute und in drei Jahren.",
            "Genau das macht ein Living Poster. Das gedruckte Poster trägt einen QR-Code; man scannt ihn, und der Film startet, mit Musik, neben dem Werk. Auf lakatosbandi.com hat jedes Poster ausserdem seine eigene Seite, und der Film hat dort seine eigene Adresse — ein Link, den du verschicken, posten oder unter eine Anzeige setzen kannst, und er öffnet sich genau dort.",
            "Fang mit einem Werk an. Film die Geschichte, häng sie ans Bild, schick den Link an fünf Leute, die dich kennen. Dann kommt das nächste.",
          ] },
          { h: "Biete das Werk als Poster an — du kannst es mehrmals verkaufen", p: [
            "Ein Original lässt sich genau einmal verkaufen. Danach bringt dir das Werk, in dem Wochen stecken, nichts mehr ein — egal, wie viele es gern an ihrer Wand gehabt hätten.",
            "Ein Poster davon lässt sich immer wieder verkaufen. Für jedes verkaufte Poster von dir bekommst du 10 € — oben auf unseren Preis gelegt, nicht von deinem abgezogen. Das Original bleibt die ganze Zeit deins und lässt sich weiter als das verkaufen, was es ist: das einzige.",
            "Es heisst also nicht Poster statt Original. Es ist das Original, plus jedes Poster, das eine Wand findet. Am Ende ist das mehr als der eine Verkauf — und es leben viel mehr Menschen mit deinem Bild, als ein einzelner Käufer es je könnte.",
          ] },
          { h: "Wir helfen dir, es zu zeigen", p: [
            "Du musst nichts davon selbst bauen. Auf lakatosbandi.com wird dein Werk ein Living Poster: das Blatt mit deinem Titel und deinem Satz, die Zimmer, in denen es hängt, der QR-Code, die eigene Seite, die du teilen kannst — und dein Film darauf.",
            "Du bringst das Werk und die Minute vor der Kamera. Wir kümmern uns darum, wie es gezeigt, gedruckt und geliefert wird. Du entscheidest Werk für Werk, was ein Poster werden darf, und kannst es jederzeit zurücknehmen.",
          ] },
        ],
        merksatz: "Ein Bild vergisst man. Eine Geschichte erzählt man weiter.",
      },
    },
  },
  /* ── 1 · DER STEMPEL — STEHT VORN (Owner 18.09.2026: erster Artikel auf der Startseite) (Owner 18.09.2026: „wir machen einen Artikel zu dem Stempel und posten das
     auf FB") ─────────────────────────────────────────────────────────────────────────────── */
  {
    slug: "artist-fair-stempel",
    datum: "2026-09-18",
    ziel: "shop",
    texte: {
      en: {
        titel: "AI theft cannot be stopped. So we built a shop for people with a conscience.",
        beschreibung: "Anyone can feed a painting to an AI and print it on a T-shirt. We cannot stop that. What we can do: name the artist, link them and pay them — on every single piece.",
        lead: "Take any painting off Instagram, give it to an AI, print the result on a T-shirt and sell it. That takes four minutes and costs nothing. Temu does it at scale, Meta trains its own AI on what you post there — and the artist usually finds out from someone else's photos.",
        teile: [
          { h: "Nobody can stop it", p: [
            "Not a watermark, not a licence text, not a lawyer in another country. The images are out there, the machines have already learned from them, and the people printing them are not going to ask.",
            "Pretending otherwise would be a comfortable lie. So we stopped asking how to block it and asked a different question: what would a shop look like where the artist is not the raw material but the seller?",
          ] },
          { h: "The seal", p: [
            "Everything sold here carries one mark: Artist Fair. It means three things, and all three are checkable.",
            "The artist is NAMED — every piece says whose style it was made in. The artist is LINKED — the address of their page is printed on the work, and the QR code leads to them. The artist is PAID — every order pays them a licence, on top of our price, not deducted from theirs. They get an email the moment it happens.",
          ] },
          { h: "Why the amount is not on the seal", p: [
            "Because it differs: a print is not a T-shirt is not a generated picture. What matters is not the number, it is that there is one at all — and that the artist can see it in their own inbox.",
          ] },
          { h: "What this asks of you", p: [
            "Nothing heroic. Buy the version where the person who made the style gets something. It costs a few euros more than a copy from a marketplace, and those few euros are the entire point.",
          ] },
        ],
        merksatz: "You cannot stop the theft. You can refuse to buy it.",
      },
      ro: {
        titel: "Furtul prin AI nu poate fi oprit. De aceea am făcut un shop pentru oamenii cu conștiință.",
        beschreibung: "Oricine poate da o pictură unei inteligențe artificiale și o poate tipări pe un tricou. Nu putem opri asta. Ce putem: artistul e numit, legat și plătit — pe fiecare lucrare.",
        lead: "Iei o pictură de pe Instagram, o dai unei inteligențe artificiale, tipărești rezultatul pe un tricou și îl vinzi. Durează patru minute și nu costă nimic. Temu o face la scară mare, Meta își antrenează propria inteligență artificială cu ce postezi acolo — iar artistul află de obicei din pozele altora.",
        teile: [
          { h: "Nimeni nu poate opri asta", p: [
            "Nici un filigran, nici un text de licență, nici un avocat din altă țară. Imaginile sunt deja acolo, mașinile au învățat deja din ele, iar cei care le tipăresc nu vor întreba.",
            "Să pretindem altceva ar fi o minciună comodă. Așa că am încetat să întrebăm cum blocăm și am întrebat altceva: cum ar arăta un shop în care artistul nu e materia primă, ci vânzătorul?",
          ] },
          { h: "Sigiliul", p: [
            "Tot ce se vinde aici poartă un semn: Artist Fair. Înseamnă trei lucruri, și toate trei se pot verifica.",
            "Artistul e NUMIT — pe fiecare lucrare scrie după stilul cui este făcută. Artistul e LEGAT — adresa paginii lui e tipărită pe lucrare, iar codul QR duce la el. Artistul e PLĂTIT — din fiecare comandă i se plătește o licență, adăugată la prețul nostru, nu scăzută din al lui. Primește un e-mail în clipa în care se întâmplă.",
          ] },
          { h: "De ce suma nu stă pe sigiliu", p: [
            "Pentru că diferă: un print nu e un tricou, un tricou nu e o imagine generată. Nu contează cifra, contează că există una — și că artistul o vede în propria căsuță poștală.",
          ] },
          { h: "Ce îți cere asta ție", p: [
            "Nimic eroic. Cumpără versiunea în care omul care a făcut stilul primește ceva. Costă câțiva euro mai mult decât o copie dintr-un marketplace, și exact acei câțiva euro sunt tot rostul.",
          ] },
        ],
        merksatz: "Furtul nu poate fi oprit. Dar poți refuza să-l cumperi.",
      },
      de: {
        titel: "KI-Diebstahl lässt sich nicht stoppen. Deshalb haben wir einen Shop für Leute mit Gewissen gebaut.",
        beschreibung: "Jeder kann ein Bild einer KI geben und auf ein T-Shirt drucken. Wir können das nicht verhindern. Was wir können: den Künstler nennen, verlinken und bezahlen — auf jedem Stück.",
        lead: "Nimm ein Bild von Instagram, gib es einer KI, druck das Ergebnis auf ein T-Shirt und verkauf es. Das dauert vier Minuten und kostet nichts. Temu macht das in grossem Stil, Meta trainiert mit dem, was du dort postest, seine eigene KI — und der Künstler erfährt es meist aus fremden Fotos.",
        teile: [
          { h: "Aufhalten kann das niemand", p: [
            "Kein Wasserzeichen, kein Lizenztext, kein Anwalt in einem anderen Land. Die Bilder sind draussen, die Maschinen haben längst daraus gelernt, und wer sie druckt, fragt nicht.",
            "Etwas anderes zu behaupten wäre eine bequeme Lüge. Also haben wir aufgehört zu fragen, wie man es blockiert, und etwas anderes gefragt: Wie sähe ein Shop aus, in dem der Künstler nicht das Rohmaterial ist, sondern der Verkäufer?",
          ] },
          { h: "Das Siegel", p: [
            "Alles, was hier verkauft wird, trägt ein Zeichen: Artist Fair. Es bedeutet drei Dinge, und alle drei kann man nachprüfen.",
            "Der Künstler wird GENANNT — auf jedem Stück steht, nach wessen Stil es gemacht ist. Der Künstler wird VERLINKT — die Adresse seiner Seite steht auf dem Werk, und der QR-Code führt zu ihm. Der Künstler wird BEZAHLT — jede Bestellung zahlt ihm eine Lizenz, oben auf unseren Preis, nicht von seinem abgezogen. Er bekommt eine Mail in dem Moment, in dem es passiert.",
          ] },
          { h: "Warum der Betrag nicht auf dem Siegel steht", p: [
            "Weil er verschieden ist: Ein Druck ist kein T-Shirt, ein T-Shirt ist kein erzeugtes Bild. Es zählt nicht die Zahl, es zählt, dass es überhaupt eine gibt — und dass der Künstler sie in seinem eigenen Postfach sieht.",
          ] },
          { h: "Was das von dir verlangt", p: [
            "Nichts Heldenhaftes. Kauf die Fassung, bei der der Mensch, der den Stil gemacht hat, etwas bekommt. Sie kostet ein paar Euro mehr als eine Kopie von einem Marktplatz, und genau diese paar Euro sind der ganze Punkt.",
          ] },
        ],
        merksatz: "Den Diebstahl kannst du nicht aufhalten. Du kannst dich weigern, ihn zu kaufen.",
      },
    },
  },
  /* ── 1 · DER STEIN ─────────────────────────────────────────────────────────────────────── */
  {
    slug: "stone-1975-selling-art",
    datum: "2026-09-10",
    texte: {
      en: {
        titel: "What a stone from 1975 teaches artists about selling",
        beschreibung: "In 1975 a man sold 1.5 million ordinary stones. The stone never changed — only the reason to want it. What that means for your art.",
        lead: "In 1975, an advertising man in California named Gary Dahl sold stones from the beach. Ordinary grey stones. About four dollars each. Within half a year he had sold around one and a half million of them.",
        teile: [
          { h: "The stone could do nothing", p: [
            "It did not change colour. It did not grow. It was exactly as ordinary on the day it was sold as on the day it was picked up.",
            "What changed was everything around it: a small cardboard box with air holes, as if something inside needed to breathe. A little manual on how to train your “Pet Rock” to sit and stay. A story that made people smile and want to give one away.",
          ] },
          { h: "People do not buy the thing. They buy the reason.", p: [
            "Nobody needed a stone. But suddenly there was a reason to want one — and a sentence that made the reason obvious in a second.",
            "This is the part most artists skip. They show the work and hope the work speaks for itself. Sometimes it does. Most of the time, in a feed with a thousand other images, it does not get the second it needs.",
          ] },
          { h: "Your painting can do far more than a stone", p: [
            "A painting has a material, a colour, a subject, a story, a hand that made it. It has something rare in it — often something the artist no longer sees, because they look at it every day.",
            "Marketing for art is not inventing a story. It is finding the true reason that is already in the work — and saying it so clearly that a stranger stops scrolling.",
          ] },
          { h: "What you can do today", p: [
            "Take one work and write down what is unusual about it: the pigment, the size, the place it was painted, the moment it began. Then turn the most surprising of these into one sentence. Not “new painting available”, but the reason someone would want exactly this one.",
          ] },
        ],
        merksatz: "The stone never changed. Only the reason to want it did.",
      },
      ro: {
        titel: "Ce îi învață pe artiști o piatră din 1975 despre vânzare",
        beschreibung: "În 1975, un om a vândut 1,5 milioane de pietre obișnuite. Piatra nu s-a schimbat — doar motivul de a o dori. Ce înseamnă asta pentru arta ta.",
        lead: "În 1975, un om din publicitate din California, Gary Dahl, a vândut pietre de pe plajă. Pietre gri, obișnuite. În jur de patru dolari bucata. În șase luni vânduse aproximativ un milion și jumătate.",
        teile: [
          { h: "Piatra nu putea nimic", p: [
            "Nu își schimba culoarea. Nu creștea. Era la fel de obișnuită în ziua în care a fost vândută ca în ziua în care a fost culeasă.",
            "S-a schimbat tot ce era în jurul ei: o cutie mică de carton cu găuri de aer, ca și cum înăuntru ar fi ceva care trebuie să respire. Un mic manual despre cum să-ți dresezi „Pet Rock”-ul să stea. O poveste care îi făcea pe oameni să zâmbească și să vrea să o dăruiască.",
          ] },
          { h: "Oamenii nu cumpără obiectul. Cumpără motivul.", p: [
            "Nimeni nu avea nevoie de o piatră. Dar dintr-odată exista un motiv să vrei una — și o frază care făcea motivul evident într-o secundă.",
            "Aceasta este partea pe care cei mai mulți artiști o sar. Își arată lucrarea și speră că lucrarea vorbește de la sine. Uneori vorbește. De cele mai multe ori, într-un feed cu o mie de alte imagini, nu primește secunda de care are nevoie.",
          ] },
          { h: "Tabloul tău poate mult mai mult decât o piatră", p: [
            "Un tablou are un material, o culoare, un subiect, o poveste, o mână care l-a făcut. Are ceva rar în el — adesea ceva ce artistul nu mai vede, pentru că se uită la el în fiecare zi.",
            "Marketingul de artă nu înseamnă să inventezi o poveste. Înseamnă să găsești motivul adevărat care e deja în lucrare — și să-l spui atât de clar încât un străin să se oprească din scroll.",
          ] },
          { h: "Ce poți face azi", p: [
            "Ia o lucrare și notează ce e neobișnuit la ea: pigmentul, dimensiunea, locul unde a fost pictată, momentul în care a început. Apoi transformă cel mai surprinzător lucru într-o singură frază. Nu „tablou nou disponibil”, ci motivul pentru care cineva ar vrea exact acesta.",
          ] },
        ],
        merksatz: "Piatra nu s-a schimbat niciodată. Doar motivul de a o dori.",
      },
      de: {
        titel: "Was ein Stein von 1975 Künstlern über das Verkaufen beibringt",
        beschreibung: "1975 verkaufte ein Mann 1,5 Millionen gewöhnliche Steine. Der Stein änderte sich nie — nur der Grund, ihn zu wollen. Was das für deine Kunst bedeutet.",
        lead: "1975 verkaufte ein Werbemann aus Kalifornien namens Gary Dahl Steine vom Strand. Gewöhnliche graue Steine. Etwa vier Dollar das Stück. Innerhalb eines halben Jahres waren es rund anderthalb Millionen.",
        teile: [
          { h: "Der Stein konnte nichts", p: [
            "Er änderte nicht seine Farbe. Er wuchs nicht. Er war am Tag des Verkaufs genauso gewöhnlich wie am Tag, an dem er aufgehoben wurde.",
            "Verändert hat sich alles um ihn herum: eine kleine Pappschachtel mit Luftlöchern, als müsste darin etwas atmen. Eine kleine Anleitung, wie man seinem „Pet Rock“ Sitz und Platz beibringt. Eine Geschichte, die Menschen zum Lächeln brachte und Lust machte, einen zu verschenken.",
          ] },
          { h: "Menschen kaufen nicht das Ding. Sie kaufen den Grund.", p: [
            "Niemand brauchte einen Stein. Aber plötzlich gab es einen Grund, einen zu wollen — und einen Satz, der diesen Grund in einer Sekunde klar machte.",
            "Genau diesen Teil überspringen die meisten Künstler. Sie zeigen das Werk und hoffen, dass es für sich spricht. Manchmal tut es das. Meistens bekommt es in einem Feed mit tausend anderen Bildern die eine Sekunde nicht, die es braucht.",
          ] },
          { h: "Dein Bild kann viel mehr als ein Stein", p: [
            "Ein Bild hat ein Material, eine Farbe, ein Motiv, eine Geschichte, eine Hand, die es gemacht hat. Es hat etwas Seltenes in sich — oft etwas, das der Künstler selbst nicht mehr sieht, weil er es jeden Tag ansieht.",
            "Kunstmarketing heißt nicht, eine Geschichte zu erfinden. Es heißt, den wahren Grund zu finden, der schon im Werk steckt — und ihn so klar zu sagen, dass ein Fremder beim Scrollen anhält.",
          ] },
          { h: "Was du heute tun kannst", p: [
            "Nimm ein Werk und schreib auf, was daran ungewöhnlich ist: das Pigment, die Größe, der Ort, an dem es entstand, der Moment, in dem es begann. Mach aus dem Überraschendsten davon einen einzigen Satz. Nicht „neues Bild verfügbar“, sondern den Grund, warum jemand genau dieses haben wollen würde.",
          ] },
        ],
        merksatz: "Der Stein hat sich nie verändert. Nur der Grund, ihn haben zu wollen.",
      },
    },
  },

  /* ── 2 · DER PREIS ─────────────────────────────────────────────────────────────────────── */
  {
    slug: "how-to-price-your-art",
    datum: "2026-09-10",
    texte: {
      en: {
        titel: "How to price your art: 200, 1,000 or 2,000 euros?",
        beschreibung: "A practical way to place your price: three price ranges, what they usually mean, and why you should compare what similar art sells for — not what others ask.",
        lead: "“How much should I ask?” is the question almost every artist struggles with. Too low and buyers doubt the work. Too high and nobody asks at all. There is no formula — but there is a way to place yourself honestly.",
        teile: [
          { h: "Three ranges as orientation", p: [
            "In our experience, original works by living artists usually fall into three broad ranges. Artists who are not yet known often sell between about 200 and 1,000 euros. Artists who already have a name — exhibitions, a following, collectors who come back — often sell between 1,000 and 2,000 euros. Established artists sell above that.",
            "These ranges are not a law. Size, medium and your market matter. But they help you answer the first honest question: where do I stand today?",
          ] },
          { h: "Compare what sells — not what others ask", p: [
            "Anyone can ask any price. What counts is what similar work actually sells for. Look for artists with a comparable style, size and level of recognition, and find out what their works sold for — not what is written on a price tag that has hung for two years.",
          ] },
          { h: "Your own sales are the best evidence", p: [
            "How many works have you sold at your current price? If the answer is none, the price may not be the problem — but it is worth asking whether it matches where you stand. If you sell everything quickly, you may be too cheap.",
          ] },
          { h: "Be able to explain your price", p: [
            "A buyer who hears “because I am worth it” hesitates. A buyer who hears what went into the work — the material, the time, the size, where your previous works went — understands. A price with a reason feels fair; a price without one feels random.",
          ] },
          { h: "Stay consistent", p: [
            "Similar works should have similar prices, everywhere you sell. A collector who finds the same size and style cheaper somewhere else will not buy from you again.",
          ] },
        ],
        merksatz: "A price with a reason feels fair. A price without one feels random.",
      },
      ro: {
        titel: "Cum îți stabilești prețul: 200, 1.000 sau 2.000 de euro?",
        beschreibung: "O metodă practică de a-ți încadra prețul: trei intervale, ce înseamnă de obicei și de ce să compari cu cât se vinde arta similară — nu cât cer alții.",
        lead: "„Cât să cer?” este întrebarea cu care se luptă aproape fiecare artist. Prea puțin, și cumpărătorii se îndoiesc de lucrare. Prea mult, și nimeni nu mai întreabă. Nu există o formulă — dar există un mod sincer de a te încadra.",
        teile: [
          { h: "Trei intervale ca orientare", p: [
            "Din experiența noastră, lucrările originale ale artiștilor în viață se încadrează de obicei în trei intervale mari. Artiștii încă necunoscuți vând adesea între aproximativ 200 și 1.000 de euro. Artiștii care au deja un nume — expoziții, urmăritori, colecționari care revin — vând adesea între 1.000 și 2.000 de euro. Artiștii consacrați vând peste.",
            "Aceste intervale nu sunt o lege. Contează dimensiunea, tehnica și piața ta. Dar te ajută să răspunzi la prima întrebare sinceră: unde mă aflu azi?",
          ] },
          { h: "Compară ce se vinde — nu ce cer alții", p: [
            "Oricine poate cere orice preț. Contează cu cât se vând de fapt lucrări similare. Caută artiști cu un stil, o dimensiune și un nivel de recunoaștere comparabile și află cu cât s-au vândut lucrările lor — nu ce scrie pe o etichetă care atârnă de doi ani.",
          ] },
          { h: "Propriile tale vânzări sunt cea mai bună dovadă", p: [
            "Câte lucrări ai vândut la prețul actual? Dacă răspunsul e niciuna, poate că problema nu e prețul — dar merită să te întrebi dacă se potrivește cu locul în care te afli. Dacă vinzi totul repede, poate ești prea ieftin.",
          ] },
          { h: "Să-ți poți explica prețul", p: [
            "Un cumpărător care aude „pentru că merit” ezită. Un cumpărător care aude ce a intrat în lucrare — materialul, timpul, dimensiunea, unde au ajuns lucrările tale anterioare — înțelege. Un preț cu un motiv pare corect; unul fără motiv pare întâmplător.",
          ] },
          { h: "Rămâi consecvent", p: [
            "Lucrări similare trebuie să aibă prețuri similare, oriunde vinzi. Un colecționar care găsește aceeași dimensiune și același stil mai ieftin în altă parte nu va mai cumpăra de la tine.",
          ] },
        ],
        merksatz: "Un preț cu un motiv pare corect. Unul fără motiv pare întâmplător.",
      },
      de: {
        titel: "Wie du deine Kunst bepreist: 200, 1.000 oder 2.000 Euro?",
        beschreibung: "Ein praktischer Weg, deinen Preis einzuordnen: drei Preisbereiche, was sie meist bedeuten, und warum du vergleichen solltest, wofür ähnliche Kunst verkauft wird — nicht, was andere verlangen.",
        lead: "„Wie viel soll ich verlangen?“ ist die Frage, mit der fast jeder Künstler ringt. Zu niedrig, und Käufer zweifeln am Werk. Zu hoch, und niemand fragt überhaupt. Es gibt keine Formel — aber einen ehrlichen Weg, sich einzuordnen.",
        teile: [
          { h: "Drei Bereiche als Orientierung", p: [
            "Nach unserer Erfahrung liegen Originale lebender Künstler meist in drei groben Bereichen. Noch unbekannte Künstler verkaufen oft zwischen etwa 200 und 1.000 Euro. Künstler, die schon einen Namen haben — Ausstellungen, Follower, Sammler, die wiederkommen — verkaufen oft zwischen 1.000 und 2.000 Euro. Etablierte Künstler verkaufen darüber.",
            "Diese Bereiche sind kein Gesetz. Größe, Technik und dein Markt spielen mit. Aber sie helfen bei der ersten ehrlichen Frage: Wo stehe ich heute?",
          ] },
          { h: "Vergleiche, was verkauft wird — nicht, was andere verlangen", p: [
            "Verlangen kann jeder jeden Preis. Entscheidend ist, wofür ähnliche Arbeiten tatsächlich verkauft werden. Such Künstler mit vergleichbarem Stil, vergleichbarer Größe und Bekanntheit und finde heraus, wofür ihre Werke verkauft wurden — nicht, was auf einem Preisschild steht, das seit zwei Jahren hängt.",
          ] },
          { h: "Deine eigenen Verkäufe sind der beste Beleg", p: [
            "Wie viele Werke hast du zu deinem jetzigen Preis verkauft? Wenn die Antwort keins ist, muss nicht der Preis das Problem sein — aber es lohnt die Frage, ob er zu deinem Stand passt. Wenn du alles schnell verkaufst, bist du vielleicht zu günstig.",
          ] },
          { h: "Deinen Preis erklären können", p: [
            "Ein Käufer, der „weil ich es wert bin“ hört, zögert. Ein Käufer, der hört, was im Werk steckt — Material, Zeit, Größe, wohin deine früheren Werke gegangen sind — versteht. Ein Preis mit Grund wirkt fair; einer ohne wirkt zufällig.",
          ] },
          { h: "Bleib einheitlich", p: [
            "Ähnliche Werke sollten überall, wo du verkaufst, ähnliche Preise haben. Ein Sammler, der dieselbe Größe und denselben Stil woanders günstiger findet, kauft nicht noch einmal bei dir.",
          ] },
        ],
        merksatz: "Ein Preis mit Grund wirkt fair. Einer ohne wirkt zufällig.",
      },
    },
  },

  /* ── 3 · DIE KATEGORIE ─────────────────────────────────────────────────────────────────── */
  {
    slug: "right-category-sells-your-art",
    datum: "2026-09-10",
    texte: {
      en: {
        titel: "Why the right category sells your painting",
        beschreibung: "Figurative or abstract, landscape or portrait: buyers search in categories. If your work sits in the wrong one, the right people never see it.",
        lead: "Collectors rarely search for “a painting”. They search for abstract works in blue, for figurative portraits, for small landscapes for a hallway. If your work is filed in the wrong place, the people who would love it simply never find it.",
        teile: [
          { h: "Three questions define where a work belongs", p: [
            "Medium: what is it made of — oil, acrylic, watercolour, ink, mixed media? Style: how is it made — figurative, abstract, expressionist, minimalist, surreal? Subject: what does it show — landscape, portrait, still life, the city, the body?",
            "Most online platforms, galleries and buyers think in exactly these three dimensions. Answering them precisely is not paperwork. It is how you get found.",
          ] },
          { h: "Artists often place themselves wrongly", p: [
            "It happens all the time: an artist calls a clearly figurative work abstract because it feels more modern, or tags everything as “contemporary” because it fits everything. The result is the same — the work lands among people who are looking for something else.",
            "It helps to ask someone who looks from the outside. What do they see first: a recognisable subject, or colour and form?",
          ] },
          { h: "A style is also a signature", p: [
            "Collectors who like one work usually ask the same question: do you have more of this? An artist who keeps a recognisable style makes that answer easy — and builds value with every new piece. That is why we accept artists who show at least three works in the same style.",
          ] },
          { h: "What you can do today", p: [
            "Take your last five works and write medium, style and subject next to each. If the style changes from work to work, choose the direction you want to be known for — and show that one first.",
          ] },
        ],
        merksatz: "The right place brings the right people.",
      },
      ro: {
        titel: "De ce categoria potrivită îți vinde tabloul",
        beschreibung: "Figurativ sau abstract, peisaj sau portret: cumpărătorii caută pe categorii. Dacă lucrarea ta stă în categoria greșită, oamenii potriviți nu o văd niciodată.",
        lead: "Colecționarii caută rar „un tablou”. Caută lucrări abstracte în albastru, portrete figurative, peisaje mici pentru un hol. Dacă lucrarea ta e pusă în locul greșit, oamenii care ar iubi-o pur și simplu nu o găsesc.",
        teile: [
          { h: "Trei întrebări stabilesc unde îi e locul unei lucrări", p: [
            "Tehnica: din ce e făcută — ulei, acrilic, acuarelă, tuș, tehnică mixtă? Stilul: cum e făcută — figurativ, abstract, expresionist, minimalist, suprarealist? Subiectul: ce arată — peisaj, portret, natură moartă, orașul, corpul?",
            "Cele mai multe platforme online, galerii și cumpărători gândesc exact în aceste trei dimensiuni. Să le răspunzi precis nu e birocrație. Așa ești găsit.",
          ] },
          { h: "Artiștii se încadrează adesea greșit", p: [
            "Se întâmplă mereu: un artist numește abstractă o lucrare clar figurativă pentru că sună mai modern, sau etichetează totul drept „contemporan” pentru că se potrivește la orice. Rezultatul e același — lucrarea ajunge printre oameni care caută altceva.",
            "Ajută să întrebi pe cineva care privește din afară. Ce vede mai întâi: un subiect recognoscibil sau culoare și formă?",
          ] },
          { h: "Un stil e și o semnătură", p: [
            "Colecționarii cărora le place o lucrare pun de obicei aceeași întrebare: mai ai de acestea? Un artist care își păstrează un stil recognoscibil face răspunsul ușor — și își construiește valoarea cu fiecare lucrare nouă. De aceea primim artiști care arată cel puțin trei lucrări în același stil.",
          ] },
          { h: "Ce poți face azi", p: [
            "Ia ultimele cinci lucrări și scrie lângă fiecare tehnica, stilul și subiectul. Dacă stilul se schimbă de la o lucrare la alta, alege direcția pentru care vrei să fii cunoscut — și arată-o pe aceea prima.",
          ] },
        ],
        merksatz: "Locul potrivit aduce oamenii potriviți.",
      },
      de: {
        titel: "Warum die richtige Kategorie dein Bild verkauft",
        beschreibung: "Figurativ oder abstrakt, Landschaft oder Porträt: Käufer suchen in Kategorien. Steht dein Werk in der falschen, sehen es die richtigen Menschen nie.",
        lead: "Sammler suchen selten nach „einem Bild“. Sie suchen abstrakte Arbeiten in Blau, figurative Porträts, kleine Landschaften für den Flur. Steht dein Werk am falschen Ort, finden es die Menschen, die es lieben würden, schlicht nicht.",
        teile: [
          { h: "Drei Fragen bestimmen, wohin ein Werk gehört", p: [
            "Technik: Woraus ist es — Öl, Acryl, Aquarell, Tusche, Mischtechnik? Stil: Wie ist es gemacht — figurativ, abstrakt, expressionistisch, minimalistisch, surreal? Motiv: Was zeigt es — Landschaft, Porträt, Stillleben, die Stadt, den Körper?",
            "Die meisten Online-Plattformen, Galerien und Käufer denken genau in diesen drei Richtungen. Sie genau zu beantworten ist kein Papierkram. So wirst du gefunden.",
          ] },
          { h: "Künstler ordnen sich oft falsch ein", p: [
            "Es passiert ständig: Ein Künstler nennt ein klar figuratives Werk abstrakt, weil es moderner klingt, oder markiert alles als „zeitgenössisch“, weil das auf alles passt. Das Ergebnis ist dasselbe — das Werk landet bei Menschen, die etwas anderes suchen.",
            "Es hilft, jemanden zu fragen, der von außen draufschaut. Was sieht er zuerst: ein erkennbares Motiv oder Farbe und Form?",
          ] },
          { h: "Ein Stil ist auch eine Handschrift", p: [
            "Sammler, denen ein Werk gefällt, stellen meist dieselbe Frage: Hast du noch mehr davon? Ein Künstler, der einen erkennbaren Stil hält, macht diese Antwort leicht — und baut mit jedem neuen Werk Wert auf. Deshalb nehmen wir Künstler auf, die mindestens drei Werke im selben Stil zeigen.",
          ] },
          { h: "Was du heute tun kannst", p: [
            "Nimm deine letzten fünf Werke und schreib neben jedes Technik, Stil und Motiv. Wechselt der Stil von Werk zu Werk, entscheide dich für die Richtung, für die du bekannt sein willst — und zeig diese zuerst.",
          ] },
        ],
        merksatz: "Der richtige Ort bringt die richtigen Menschen.",
      },
    },
  },

  /* ── 4 · DER SATZ ──────────────────────────────────────────────────────────────────────── */
  {
    slug: "new-painting-available-doesnt-sell",
    datum: "2026-09-10",
    texte: {
      en: {
        titel: "“New painting available” doesn’t sell. What does?",
        beschreibung: "Most artists announce new work with the same sentence — and wonder why nothing happens. How to find the one sentence that makes people stop.",
        lead: "Scroll through artists on Instagram and you will read the same line again and again: new painting available, oil on canvas, DM for price. It is true. It is also invisible.",
        teile: [
          { h: "Why the usual post disappears", p: [
            "“New painting available” tells the viewer what you did. It does not tell them why they should care. In a feed where every image competes for one second, a sentence without a reason loses that second.",
          ] },
          { h: "Look for what is rare", p: [
            "Every work has something that sets it apart. A pigment that is hard to get. A size that fills a wall. A place, a season, a moment it was painted in. A detail that only appears when you stand close. Often the artist has stopped noticing it.",
            "Write down everything that is true and unusual. Then pick the one thing a stranger would find surprising.",
          ] },
          { h: "An example", p: [
            "Take Van Gogh’s The Starry Night. The usual post would say: “Oil on canvas, 74 × 92 cm.” But the painting shows the view from his window at the asylum in Saint-Rémy before sunrise — and the village in it was added from his imagination.",
            "So the sentence could be: “The view from his asylum window before sunrise — with a village that was never there.” The work is the same. Now there is a reason to look twice, and a question the viewer wants answered.",
          ] },
          { h: "Three rules for your sentence", p: [
            "Only what is true — never invent a story. Short enough to read in one breath. And it should make someone curious, not just inform them.",
          ] },
        ],
        merksatz: "The work is the same. The sentence decides whether anyone looks twice.",
      },
      ro: {
        titel: "„Tablou nou disponibil” nu vinde. Ce vinde?",
        beschreibung: "Cei mai mulți artiști anunță lucrări noi cu aceeași frază — și se miră că nu se întâmplă nimic. Cum găsești fraza care îi face pe oameni să se oprească.",
        lead: "Derulează prin artiștii de pe Instagram și vei citi același rând iar și iar: tablou nou disponibil, ulei pe pânză, prețul în privat. E adevărat. Și e invizibil.",
        teile: [
          { h: "De ce dispare postarea obișnuită", p: [
            "„Tablou nou disponibil” îi spune privitorului ce ai făcut. Nu îi spune de ce i-ar păsa. Într-un feed în care fiecare imagine luptă pentru o secundă, o frază fără motiv pierde acea secundă.",
          ] },
          { h: "Caută ce e rar", p: [
            "Fiecare lucrare are ceva care o deosebește. Un pigment greu de găsit. O dimensiune care umple un perete. Un loc, un anotimp, un moment în care a fost pictată. Un detaliu care apare doar când stai aproape. Adesea artistul nu-l mai observă.",
            "Notează tot ce e adevărat și neobișnuit. Apoi alege lucrul pe care un străin l-ar găsi surprinzător.",
          ] },
          { h: "Un exemplu", p: [
            "Ia Noaptea înstelată a lui Van Gogh. Postarea obișnuită ar spune: „Ulei pe pânză, 74 × 92 cm.” Dar tabloul arată priveliștea de la fereastra sa din azilul din Saint-Rémy, înainte de răsărit — iar satul din el a fost adăugat din imaginație.",
            "Deci fraza ar putea fi: „Priveliștea de la fereastra azilului, înainte de răsărit — cu un sat care n-a existat niciodată.” Lucrarea e aceeași. Acum există un motiv să te uiți a doua oară și o întrebare la care privitorul vrea un răspuns.",
          ] },
          { h: "Trei reguli pentru fraza ta", p: [
            "Doar ce e adevărat — nu inventa niciodată o poveste. Destul de scurtă cât s-o citești dintr-o respirație. Și să trezească curiozitate, nu doar să informeze.",
          ] },
        ],
        merksatz: "Lucrarea e aceeași. Fraza decide dacă se uită cineva a doua oară.",
      },
      de: {
        titel: "„Neues Bild verfügbar“ verkauft nicht. Was dann?",
        beschreibung: "Die meisten Künstler kündigen neue Werke mit demselben Satz an — und wundern sich, dass nichts passiert. Wie du den einen Satz findest, bei dem Menschen anhalten.",
        lead: "Scroll durch Künstler auf Instagram, und du liest immer wieder dieselbe Zeile: neues Bild verfügbar, Öl auf Leinwand, Preis per Nachricht. Das stimmt. Und es ist unsichtbar.",
        teile: [
          { h: "Warum der übliche Post verschwindet", p: [
            "„Neues Bild verfügbar“ sagt dem Betrachter, was du getan hast. Es sagt ihm nicht, warum es ihn interessieren sollte. In einem Feed, in dem jedes Bild um eine Sekunde kämpft, verliert ein Satz ohne Grund diese Sekunde.",
          ] },
          { h: "Such das Seltene", p: [
            "Jedes Werk hat etwas, das es abhebt. Ein Pigment, das schwer zu bekommen ist. Eine Größe, die eine Wand füllt. Ein Ort, eine Jahreszeit, ein Moment, in dem es entstand. Ein Detail, das erst aus der Nähe erscheint. Oft bemerkt der Künstler es selbst nicht mehr.",
            "Schreib alles auf, was wahr und ungewöhnlich ist. Dann wähl das eine, das ein Fremder überraschend fände.",
          ] },
          { h: "Ein Beispiel", p: [
            "Nimm Van Goghs Sternennacht. Der übliche Post würde sagen: „Öl auf Leinwand, 74 × 92 cm.“ Aber das Bild zeigt den Blick aus seinem Fenster in der Heilanstalt Saint-Rémy vor Sonnenaufgang — und das Dorf darin hat er aus der Fantasie hinzugefügt.",
            "Der Satz könnte also lauten: „Der Blick aus dem Fenster der Heilanstalt vor Sonnenaufgang — mit einem Dorf, das es nie gab.“ Das Werk ist dasselbe. Jetzt gibt es einen Grund, zweimal hinzusehen, und eine Frage, auf die der Betrachter eine Antwort will.",
          ] },
          { h: "Drei Regeln für deinen Satz", p: [
            "Nur, was stimmt — erfinde nie eine Geschichte. Kurz genug, um ihn in einem Atemzug zu lesen. Und er soll neugierig machen, nicht nur informieren.",
          ] },
        ],
        merksatz: "Das Werk ist dasselbe. Der Satz entscheidet, ob jemand zweimal hinsieht.",
      },
    },
  },

  /* ── 5 · DER KÄUFER ────────────────────────────────────────────────────────────────────── */
  {
    slug: "find-the-buyer-who-values-your-work",
    datum: "2026-09-10",
    texte: {
      en: {
        titel: "Find the buyer who values what you make — not just any buyer",
        beschreibung: "Selling art is not about reaching everyone. It is about reaching the few people who value exactly your work — and answering them fast.",
        lead: "The first rule of marketing art sounds simple: find the buyer who values what you make. Not the biggest audience. Not everyone who likes art. The person who looks at your work and recognises something they want to live with.",
        teile: [
          { h: "Nobody knows the buyer in advance", p: [
            "Most artists cannot say who will buy their work — and that is honest. If you knew, you would have sold long ago. That is why guessing is not enough. You have to show the work, with its reason, to different people and watch who responds.",
          ] },
          { h: "The work already tells you a lot", p: [
            "Colour, subject and mood attract different people. A calm, light interior speaks to someone furnishing a bedroom; a bold, dark abstract piece to someone who collects statements. Start from what is really in the work, not from who you wish would buy it.",
          ] },
          { h: "Interest is only the beginning", p: [
            "When someone writes “how much?” or “is it still available?”, the moment is short. Whoever answers the same day usually reaches the buyer. Whoever answers a week later often finds they have already bought elsewhere.",
            "That is why on lakatosbandi.com every artist has an agent: it answers interested people at any hour, collects their name and phone number and passes them on at once. You make the call.",
          ] },
          { h: "Fewer, better conversations", p: [
            "Ten conversations with people who value your style are worth more than a thousand likes from people who scroll past. Measure what matters: who asked, who left a number, who bought.",
          ] },
        ],
        merksatz: "Not any buyer. The one who values exactly your work.",
      },
      ro: {
        titel: "Găsește cumpărătorul care apreciază ce faci — nu orice cumpărător",
        beschreibung: "Să vinzi artă nu înseamnă să ajungi la toată lumea. Înseamnă să ajungi la cei câțiva oameni care apreciază exact lucrarea ta — și să le răspunzi repede.",
        lead: "Prima regulă în marketingul de artă sună simplu: găsește cumpărătorul care apreciază ce faci. Nu cel mai mare public. Nu pe toți cei cărora le place arta. Persoana care se uită la lucrarea ta și recunoaște ceva cu care vrea să trăiască.",
        teile: [
          { h: "Nimeni nu știe dinainte cine e cumpărătorul", p: [
            "Cei mai mulți artiști nu pot spune cine le va cumpăra lucrarea — și e sincer. Dacă ai ști, ai fi vândut de mult. De aceea ghicitul nu ajunge. Trebuie să arăți lucrarea, cu motivul ei, unor oameni diferiți și să vezi cine răspunde.",
          ] },
          { h: "Lucrarea îți spune deja multe", p: [
            "Culoarea, subiectul și atmosfera atrag oameni diferiți. Un interior calm și luminos vorbește cuiva care își amenajează dormitorul; o lucrare abstractă, îndrăzneață și întunecată, cuiva care colecționează afirmații. Pornește de la ce e cu adevărat în lucrare, nu de la cine ți-ai dori să cumpere.",
          ] },
          { h: "Interesul e doar începutul", p: [
            "Când cineva scrie „cât costă?” sau „mai e disponibil?”, momentul e scurt. Cine răspunde în aceeași zi ajunge de obicei la cumpărător. Cine răspunde după o săptămână descoperă adesea că a cumpărat deja în altă parte.",
            "De aceea, pe lakatosbandi.com fiecare artist are un agent: răspunde celor interesați la orice oră, le strânge numele și telefonul și ți le transmite imediat. Tu suni.",
          ] },
          { h: "Mai puține conversații, dar mai bune", p: [
            "Zece conversații cu oameni care îți apreciază stilul valorează mai mult decât o mie de like-uri de la oameni care trec mai departe. Măsoară ce contează: cine a întrebat, cine a lăsat un număr, cine a cumpărat.",
          ] },
        ],
        merksatz: "Nu orice cumpărător. Cel care apreciază exact lucrarea ta.",
      },
      de: {
        titel: "Finde den Käufer, der schätzt, was du machst — nicht irgendeinen",
        beschreibung: "Kunst verkaufen heißt nicht, alle zu erreichen. Es heißt, die wenigen Menschen zu erreichen, die genau dein Werk schätzen — und ihnen schnell zu antworten.",
        lead: "Die erste Regel im Kunstmarketing klingt einfach: Finde den Käufer, der schätzt, was du machst. Nicht das größte Publikum. Nicht alle, die Kunst mögen. Den Menschen, der dein Werk ansieht und darin etwas erkennt, mit dem er leben will.",
        teile: [
          { h: "Niemand kennt den Käufer vorher", p: [
            "Die meisten Künstler können nicht sagen, wer ihr Werk kaufen wird — und das ist ehrlich. Wüsstest du es, hättest du längst verkauft. Deshalb reicht Raten nicht. Du musst das Werk mit seinem Grund verschiedenen Menschen zeigen und beobachten, wer reagiert.",
          ] },
          { h: "Das Werk verrät schon viel", p: [
            "Farbe, Motiv und Stimmung sprechen verschiedene Menschen an. Ein ruhiges, helles Interieur spricht jemanden an, der sein Schlafzimmer einrichtet; ein kräftiges, dunkles abstraktes Werk jemanden, der Statements sammelt. Geh von dem aus, was wirklich im Werk steckt, nicht davon, wer es kaufen soll.",
          ] },
          { h: "Interesse ist nur der Anfang", p: [
            "Wenn jemand „Was kostet das?“ oder „Ist es noch da?“ schreibt, ist der Moment kurz. Wer am selben Tag antwortet, erreicht meist den Käufer. Wer eine Woche später antwortet, erfährt oft, dass er schon woanders gekauft hat.",
            "Deshalb hat auf lakatosbandi.com jeder Künstler einen Agenten: Er antwortet Interessenten zu jeder Uhrzeit, sammelt Name und Telefonnummer und gibt sie sofort weiter. Du rufst an.",
          ] },
          { h: "Weniger, aber bessere Gespräche", p: [
            "Zehn Gespräche mit Menschen, die deinen Stil schätzen, sind mehr wert als tausend Likes von Menschen, die weiterscrollen. Miss, was zählt: Wer hat gefragt, wer hat eine Nummer hinterlassen, wer hat gekauft.",
          ] },
        ],
        merksatz: "Nicht irgendein Käufer. Der, der genau dein Werk schätzt.",
      },
    },
  },

  /* ── 6 · BEUYS ─────────────────────────────────────────────────────────────────────────────
   *
   * DER ARTIKEL ZUM OPEN ARCHIVE (Owner 12.09.2026: „Joseph Beuys sagte: Jeder Mensch ist ein
   * Künstler." · „jetzt artikel auf unser webseite mit diesem hook").
   *
   * NUR, WAS BELEGT IST: Der Satz ist Beuys zugeschrieben und vielfach überliefert; „soziale
   * Plastik" ist sein Begriff. Keine Jahreszahlen zu einzelnen Aktionen, keine Werke, keine
   * Zitate darüber hinaus — was ich nicht sicher weiß, steht nicht drin.
   *
   * Das Bild ist der Hook mit dem Foto der Library of Congress (Bernard Gotfryd, 1979,
   * public domain, keine Namensnennung verlangt) — je Sprache eines, weil es Text trägt.
   */
  {
    slug: "everyone-is-an-artist-beuys",
    datum: "2026-09-12",
    texte: {
      en: {
        titel: "“Every human being is an artist” — and why that needs no entrance exam",
        beschreibung: "Beuys’ most famous sentence is usually read as a compliment. He meant something far less comfortable — and it decides who gets to show their work.",
        lead: "Joseph Beuys said: “Every human being is an artist.” Today the sentence sits on posters and coffee mugs, and it is mostly read as a friendly compliment: you too, you are creative as well. That is not how it was meant.",
        bild: "everyone-is-an-artist-beuys-bild-en.jpg",
        teile: [
          { h: "The sentence is not a compliment", p: [
            "Beuys was not saying that everybody can paint well. He meant that every person shapes the society they live in — through what they do, decide, build and leave undone. He called it social sculpture: society is the material.",
            "That is closer to a demand than to praise. It takes away the excuse that shaping things is for the others — the gifted ones, the ones with the diploma.",
          ] },
          { h: "Not everyone has to be an artist", p: [
            "We turn the sentence one step further, into the uncomfortable direction: not everyone has to be an artist. But anyone who creates should be able to show.",
            "That is a different claim. The first makes everybody an artist. The second gives everybody who makes something the right to make it visible — and leaves the verdict to the people who see it, instead of to a jury beforehand.",
          ] },
          { h: "The obstacle is rarely the talent", p: [
            "What stands between the storage room and the wall is usually not the question whether the work is good enough. It is the photographs, the texts, the question what it should cost, a page where it lives, and an answer for the person who asks at eleven at night whether it is still available.",
            "That is work which has nothing to do with painting — and it is the reason a lot of pieces stay in the box that could have been hanging on a wall long ago.",
          ] },
          { h: "That is why there is no entrance exam here", p: [
            "We do not screen anyone beforehand. You upload up to ten works, we write the texts for them, you read them and approve. Then you get your page, and an agent answers interested people at any hour and passes you their name and number.",
            "What you ask for your works you write yourself, in your own words. We do not set prices.",
          ] },
        ],
        merksatz: "Not everyone has to be an artist. But anyone who creates should be able to show.",
      },
      ro: {
        titel: "„Fiecare om este un artist” — și de ce asta nu cere un examen de admitere",
        beschreibung: "Cea mai cunoscută frază a lui Beuys e citită de obicei ca un compliment. El voia să spună ceva mult mai incomod — și de aici decurge cine are voie să-și arate lucrările.",
        lead: "Joseph Beuys spunea: „Fiecare om este un artist.” Astăzi fraza stă pe afișe și pe căni, și e citită mai ales ca un compliment prietenos: și tu, ești și tu creativ. Nu așa a fost gândită.",
        bild: "everyone-is-an-artist-beuys-bild-ro.jpg",
        teile: [
          { h: "Fraza nu e un compliment", p: [
            "Beuys nu spunea că oricine poate picta bine. El spunea că fiecare om dă formă societății în care trăiește — prin ceea ce face, decide, construiește și lasă nefăcut. I-a spus sculptură socială: societatea este materialul.",
            "Asta seamănă mai degrabă cu o pretenție decât cu o laudă. Ia scuza că datul de formă e treaba celorlalți — a celor talentați, a celor cu diplomă.",
          ] },
          { h: "Nu toată lumea trebuie să fie artist", p: [
            "Noi ducem fraza cu un pas mai departe, în direcția incomodă: nu toată lumea trebuie să fie artist. Dar oricine creează ar trebui să poată arăta.",
            "Este o afirmație diferită. Prima îi face pe toți artiști. A doua dă oricui face ceva dreptul de a-l face vizibil — și lasă verdictul în seama oamenilor care îl văd, nu a unui juriu dinainte.",
          ] },
          { h: "Obstacolul e rareori talentul", p: [
            "Între debara și perete nu stă de obicei întrebarea dacă lucrarea e destul de bună. Stau fotografiile, textele, întrebarea cât ar trebui să coste, o pagină pe care să existe și un răspuns pentru cel care întreabă la unsprezece noaptea dacă mai e disponibilă.",
            "Este o muncă ce nu are nimic de-a face cu pictatul — și din cauza ei rămân în cutie lucrări care de mult ar fi putut sta pe un perete.",
          ] },
          { h: "De aceea la noi nu există examen de admitere", p: [
            "Nu verificăm pe nimeni dinainte. Încarci până la zece lucrări, noi scriem textele pentru ele, tu le citești și le aprobi. Apoi primești pagina ta, iar un agent răspunde celor interesați la orice oră și îți transmite numele și numărul lor.",
            "Cât ceri pentru lucrările tale scrii tu însuți, în cuvintele tale. Noi nu stabilim prețuri.",
          ] },
        ],
        merksatz: "Nu toată lumea trebuie să fie artist. Dar oricine creează ar trebui să poată arăta.",
      },
      de: {
        titel: "„Jeder Mensch ist ein Künstler“ — und warum das keine Aufnahmeprüfung braucht",
        beschreibung: "Beuys’ berühmtester Satz wird meist als Kompliment gelesen. Gemeint war etwas deutlich Unbequemeres — und daraus folgt, wer seine Arbeiten zeigen darf.",
        lead: "Joseph Beuys sagte: „Jeder Mensch ist ein Künstler.“ Heute steht der Satz auf Postern und Kaffeetassen, und meistens wird er als freundliches Kompliment gelesen: du auch, du bist auch kreativ. So war er nicht gemeint.",
        bild: "everyone-is-an-artist-beuys-bild-de.jpg",
        teile: [
          { h: "Der Satz ist kein Kompliment", p: [
            "Beuys sagte nicht, dass jeder gut malen kann. Er sagte, dass jeder Mensch die Gesellschaft mitformt, in der er lebt — durch das, was er tut, entscheidet, baut und unterlässt. Er nannte es soziale Plastik: Die Gesellschaft ist das Material.",
            "Das ist eher eine Zumutung als ein Lob. Es nimmt die Ausrede weg, das Gestalten sei Sache der anderen — der Begabten, der Leute mit Abschluss.",
          ] },
          { h: "Nicht jeder muss Künstler sein", p: [
            "Wir drehen den Satz einen Schritt weiter, in die unbequeme Richtung: Nicht jeder muss Künstler sein. Aber wer schafft, soll zeigen können.",
            "Das ist eine andere Behauptung. Die erste macht alle zu Künstlern. Die zweite gibt jedem, der etwas macht, das Recht, es sichtbar zu machen — und überlässt das Urteil den Menschen, die es sehen, statt einer Jury vorher.",
          ] },
          { h: "Die Hürde ist selten das Talent", p: [
            "Zwischen Keller und Wand steht meistens nicht die Frage, ob es gut genug ist. Es stehen die Fotos, die Texte, die Frage, was es kosten soll, eine Seite, auf der es steht, und eine Antwort für den, der abends um elf fragt, ob es noch da ist.",
            "Das ist Arbeit, die mit Malen nichts zu tun hat — und wegen ihr bleiben Arbeiten im Karton, die längst an einer Wand hängen könnten.",
          ] },
          { h: "Deshalb gibt es bei uns keine Aufnahmeprüfung", p: [
            "Wir prüfen niemanden vorher. Du lädst bis zu zehn Arbeiten hoch, wir schreiben die Texte dazu, du liest sie und gibst sie frei. Dann bekommst du deine Seite, und ein Agent antwortet Interessenten zu jeder Uhrzeit und gibt dir Name und Nummer weiter.",
            "Was du für deine Arbeiten verlangst, schreibst du selbst hin, in deinen Worten. Wir setzen keine Preise fest.",
          ] },
        ],
        merksatz: "Nicht jeder muss Künstler sein. Aber wer schafft, soll zeigen können.",
      },
    },
  },
  /* ── 7 · POSTER VIU (Owner 16.09.2026: „machst einen neuen artikel dass wir die kategorie
     eingeführt haben und jeder künstler hat die chance seine kunstwerke als poster viu zu
     verkaufen er soll uns nur anschreiben") ────────────────────────────────────────────────
     NUR, WAS ES WIRKLICH GIBT: QR-Code unter dem Bild, Bewegung mit Musik, die Geschichte auf
     dem Telefon, Druck auf Bestellung, drei Formate, mit oder ohne Rahmen. Keine Stückzahlen,
     keine Erlöse, keine Versprechen über Nachfrage — nichts davon wüssten wir. */
  {
    slug: "living-poster-new-category",
    datum: "2026-09-16",
    ziel: "shop",
    texte: {
      en: {
        titel: "A poster that tells its own story — and how your work can become one",
        beschreibung: "We have opened a new category: Living Poster. A printed poster with a QR code — scan it, and the music starts and the painting tells you its story.",
        lead: "A poster on a wall says one thing: look at me. It cannot say who painted it, when, or why. We have opened a category where it can.",
        bild: "poster-viu-beispiel.jpg",
        teile: [
          { h: "What a Living Poster is", p: [
            "It is a printed poster like any other. Under the image sits a QR code. You scan it with your phone, the music starts — and next to the painting stands its story: who made it, when, and what was going on around it.",
            "The paper does not change. What changes is what a visitor can find out while standing in front of it.",
          ] },
          { h: "Why we built it", p: [
            "In a museum every work has a little sign beside it, and that sign is half the visit. At home the sign is missing. The guest sees a picture and asks the owner what it is — and the owner tells the part they remember.",
            "The code puts the sign back, without printing a wall of text under the image.",
          ] },
          { h: "It started with the masters", p: [
            "The first Living Posters are works in the public domain: van Gogh, Klimt, Monet, Hokusai, Munch, Friedrich. The originals stay in their museums; we print posters of them, in three sizes, with a wooden or black frame, or without.",
            "They were the honest place to start — we could try the whole thing without asking anyone to risk their work on it.",
          ] },
          { h: "Now it is open to artists", p: [
            "Any artist on lakatosbandi.com can have their works as Living Posters: their painting, their story, their name on the poster. The originals stay where they are and stay theirs — a poster sold does not touch the one work that exists.",
            "We do not do this behind anyone's back. Nothing of yours becomes a poster unless you ask for it.",
          ] },
          { h: "What you get for it", p: [
            "10 € for every poster of yours that we sell. It is added on top of our price, not taken out of it — what the printing and our share cost stays our business.",
            "You decide which works may be printed, work by work, and you can take that back at any time.",
          ] },
          { h: "How to take part", p: [
            "Register on lakatosbandi.com and tick the box in your profile: I want to sell my works as Living Posters. Then pick the works. That is all — nothing is printed before you have seen it.",
          ] },
        ],
        merksatz: "The original hangs in one place. The story can hang in many.",
      },
      ro: {
        titel: "Un poster care îți spune povestea lui — și cum poate deveni lucrarea ta unul",
        beschreibung: "Am deschis o categorie nouă: Living Poster. Un poster tipărit cu cod QR — îl scanezi, pornește muzica, iar tabloul îți spune povestea lui.",
        lead: "Un poster pe perete spune un singur lucru: uită-te la mine. Nu poate spune cine l-a pictat, când sau de ce. Am deschis o categorie în care poate.",
        bild: "poster-viu-beispiel.jpg",
        teile: [
          { h: "Ce este un poster viu", p: [
            "Este un poster tipărit, ca oricare altul. Sub imagine stă un cod QR. Îl scanezi cu telefonul, pornește muzica — iar alături de tablou apare povestea lui: cine l-a făcut, când și ce se întâmpla în jur.",
            "Hârtia rămâne hârtie. Se schimbă doar cât poate afla cineva stând în fața ei.",
          ] },
          { h: "De ce l-am făcut", p: [
            "La muzeu, lângă fiecare lucrare stă o plăcuță, iar plăcuța aceea e jumătate din vizită. Acasă lipsește. Musafirul vede un tablou și îl întreabă pe gazdă ce e — iar gazda spune cât își amintește.",
            "Codul pune plăcuța la loc, fără să tipărim un perete de text sub imagine.",
          ] },
          { h: "Am început cu maeștrii", p: [
            "Primele Living Poster sunt lucrări intrate în domeniul public: van Gogh, Klimt, Monet, Hokusai, Munch, Friedrich. Originalele rămân în muzeele lor; noi tipărim postere după ele, în trei dimensiuni, cu ramă de lemn, cu ramă neagră sau fără.",
            "Era locul cinstit de unde să începem — am putut încerca totul fără să riște nimeni lucrările lui pe asta.",
          ] },
          { h: "Acum e deschis pentru artiști", p: [
            "Orice artist de pe lakatosbandi.com își poate avea lucrările ca Living Poster: tabloul lui, povestea lui, numele lui pe poster. Originalele rămân unde sunt și rămân ale lui — un poster vândut nu atinge singura lucrare care există.",
            "Nu facem asta pe la spatele nimănui. Nicio lucrare de-a ta nu devine poster dacă nu ceri tu.",
          ] },
          { h: "Ce primești", p: [
            "10 € pentru fiecare poster al tău vândut. Se adaugă la prețul nostru, nu se scade din el — cât costă tiparul și cât rămâne la noi e treaba noastră.",
            "Tu alegi ce lucrări pot fi tipărite, lucrare cu lucrare, și poți renunța oricând.",
          ] },
          { h: "Cum participi", p: [
            "Te înregistrezi pe lakatosbandi.com și bifezi în profil: vreau să-mi vând lucrările și ca Living Poster. Apoi alegi lucrările. Atât — nimic nu se tipărește înainte să vezi tu.",
          ] },
        ],
        merksatz: "Originalul atârnă într-un singur loc. Povestea poate atârna în multe.",
      },
      de: {
        titel: "Ein Poster, das seine Geschichte selbst erzählt — und wie dein Werk eines wird",
        beschreibung: "Wir haben eine neue Kategorie eröffnet: Living Poster. Ein gedrucktes Poster mit QR-Code — du scannst ihn, die Musik beginnt, und das Bild erzählt seine Geschichte.",
        lead: "Ein Poster an der Wand sagt eines: sieh mich an. Wer es gemalt hat, wann und warum, kann es nicht sagen. Wir haben eine Kategorie eröffnet, in der es das kann.",
        bild: "poster-viu-beispiel.jpg",
        teile: [
          { h: "Was ein lebendes Poster ist", p: [
            "Es ist ein gedrucktes Poster wie jedes andere. Unter dem Bild sitzt ein QR-Code. Du scannst ihn mit dem Telefon, die Musik beginnt — und neben dem Bild steht seine Geschichte: wer es gemacht hat, wann, und was damals darum herum geschah.",
            "Das Papier bleibt Papier. Es ändert sich nur, was jemand davor erfahren kann.",
          ] },
          { h: "Warum wir es gebaut haben", p: [
            "Im Museum steht neben jedem Werk ein kleines Schild, und dieses Schild ist der halbe Besuch. Zu Hause fehlt es. Der Gast sieht ein Bild und fragt den Gastgeber, was es ist — und der erzählt, woran er sich erinnert.",
            "Der Code bringt das Schild zurück, ohne eine Wand aus Text unter das Bild zu drucken.",
          ] },
          { h: "Angefangen haben wir mit den Meistern", p: [
            "Die ersten Living Poster sind gemeinfreie Werke: van Gogh, Klimt, Monet, Hokusai, Munch, Friedrich. Die Originale bleiben in ihren Museen; wir drucken Poster danach, in drei Formaten, mit Holzrahmen, mit schwarzem Rahmen oder ohne.",
            "Das war der ehrliche Anfang — so konnten wir alles ausprobieren, ohne dass jemand seine Arbeiten dafür hergeben musste.",
          ] },
          { h: "Jetzt steht es Künstlern offen", p: [
            "Jeder Künstler auf lakatosbandi.com kann seine Werke als lebende Poster haben: sein Bild, seine Geschichte, sein Name auf dem Poster. Die Originale bleiben, wo sie sind, und bleiben seine — ein verkauftes Poster rührt das eine Werk nicht an, das es gibt.",
            "Wir machen das hinter niemandes Rücken. Nichts von dir wird zum Poster, wenn du nicht darum bittest.",
          ] },
          { h: "Was du dafür bekommst", p: [
            "10 € für jedes verkaufte Poster von dir. Es kommt oben auf unseren Preis, nicht davon herunter — was Druck und unser Anteil kosten, ist unsere Sache.",
            "Du entscheidest Werk für Werk, was gedruckt werden darf, und kannst es jederzeit zurücknehmen.",
          ] },
          { h: "Wie du mitmachst", p: [
            "Registriere dich auf lakatosbandi.com und setze in deinem Profil das Häkchen: Ich will meine Werke auch als Living Poster verkaufen. Dann wählst du die Werke aus. Mehr ist es nicht — gedruckt wird nichts, bevor du es gesehen hast.",
          ] },
        ],
        merksatz: "Das Original hängt an einem Ort. Die Geschichte kann an vielen hängen.",
      },
    },
  },
  /* ── 8 · FÜR KÜNSTLER: DEIN WERK ALS POSTER (Owner 16.09.2026: „oder sollen wir einen neuen
     artikel schreiben für künstler. Biete dein Kunstwerk als poster an") ─────────────────────
     Der Artikel davor erklärt KÄUFERN, was ein Poster viu ist. Dieser hier spricht den Künstler
     an und beantwortet seine drei Fragen: Was bekomme ich, was kostet es mich, was muss ich tun.
     NUR WAS GEBAUT IST: 10 € je verkauftem Poster, Häkchen im Profil, Auswahl je Werk, Premium
     als Voraussetzung, Druck auf Bestellung. Keine Stückzahlen, keine Versprechen über Nachfrage. */
  {
    slug: "sell-your-art-as-poster",
    datum: "2026-09-16",
    texte: {
      en: {
        titel: "Offer your work as a poster",
        beschreibung: "Your painting stays yours and hangs where it hangs. The poster of it can hang in many places — and you get 10 € for every one we sell.",
        lead: "A painting exists once. It hangs in one room, and everyone else has to take your word for it. A poster of it can hang in a hundred rooms without you losing anything.",
        /* Ein Beispiel, damit man sieht, wovon die Rede ist (Owner 16.09.2026: „als beispiel
           gibst du ein bild von gerry louisett oder van gogh ist besser") — das Bild trägt keinen
           Text, deshalb in allen drei Sprachen dasselbe. */
        bild: "poster-viu-beispiel.jpg",
        teile: [
          { h: "The original stays yours", p: [
            "Nothing about your work changes. You keep it, you sell it whenever and to whomever you want, for whatever price you name. A poster sold does not touch the one piece that exists — it is a print of it, on paper, in someone else's hallway.",
            "And nothing of yours is printed unless you say so. You pick the works yourself, one by one.",
          ] },
          { h: "What you get", p: [
            "10 € for every poster of yours we sell. It is added on top of our price, not taken out of it — what the printing costs and what stays with us is our business, not a deduction from yours.",
            "We print to order, we handle the payment, we ship. You do not pack anything and you do not chase anyone for money.",
          ] },
          { h: "What a Living Poster is", p: [
            "A printed poster with a QR code under the image. Whoever scans it hears the music on their phone and reads your story next to the painting: who you are and what this work is about.",
            "That is the part nobody else sells. A poster shop has the picture. It does not have you.",
          ] },
          { h: "What it costs you", p: [
            "Nothing per poster. It is part of Premium — the same subscription that gives you the AI texts and more works on your page.",
            "There is no second fee, no commission on your originals, and no contract that ties your work to us. Untick the box and it stops.",
          ] },
          /* ── EINE AUSSTELLUNG MIT CODES (Owner 16.09.2026: „auch künstler können ausstellungen
             damit machen, der QR code führt zum shop zum poster oder original") ───────────── */
          { h: "And for an exhibition", p: [
            "Hang a small code next to each work. Whoever scans it hears the music, reads the story and sees who painted it — and can order the poster right there, or ask about the original.",
            "That is what a code is worth in a room full of people: the evening ends, the works come down, and what someone saw is still one tap away.",
          ] },
          { h: "How it works, step by step", p: [
            "1. Sign up as an artist on lakatosbandi.com and upload your works. You get your own page, lakatosbandi.com/yourname, and the link to edit it arrives by email.",
            "2. Open your page with that link. Under your name and city there is a box: I want to sell my works as Living Posters. Tick it.",
            "3. Now every work has a second box next to it: Offer as Living Poster. Tick the ones that may be printed — and only those. Then save.",
            "4. From that moment you appear in the Living Poster section with your portrait, next to van Gogh, Klimt and Monet. The works you picked stand there as posters: with the QR code, your story, and a buy button. Everything else on your page stays exactly as it was.",
            "Nothing is printed before you have seen it, and unticking the box takes it all back.",
          ] },
        ],
        merksatz: "The original hangs in one place. The poster can hang in many.",
      },
      ro: {
        titel: "Oferă-ți lucrarea ca poster",
        beschreibung: "Tabloul rămâne al tău și atârnă unde atârnă. Posterul după el poate atârna în multe locuri — iar tu primești 10 € pentru fiecare vândut.",
        lead: "Un tablou există o singură dată. Atârnă într-o cameră, iar ceilalți trebuie să te creadă pe cuvânt. Un poster după el poate atârna în o sută de camere fără ca tu să pierzi ceva.",
        /* Ein Beispiel, damit man sieht, wovon die Rede ist (Owner 16.09.2026: „als beispiel
           gibst du ein bild von gerry louisett oder van gogh ist besser") — das Bild trägt keinen
           Text, deshalb in allen drei Sprachen dasselbe. */
        bild: "poster-viu-beispiel.jpg",
        teile: [
          { h: "Originalul rămâne al tău", p: [
            "Nu se schimbă nimic la lucrarea ta. Rămâne a ta, o vinzi când vrei și cui vrei, la prețul pe care îl spui tu. Un poster vândut nu atinge singura piesă care există — e un print după ea, pe hârtie, pe holul altcuiva.",
            "Și nimic de-al tău nu se tipărește dacă nu spui tu. Alegi lucrările una câte una.",
          ] },
          { h: "Ce primești", p: [
            "10 € pentru fiecare poster al tău vândut. Se adaugă la prețul nostru, nu se scade din el — cât costă tiparul și cât rămâne la noi e treaba noastră, nu o scădere din partea ta.",
            "Tipărim la comandă, ne ocupăm de plată, livrăm noi. Tu nu împachetezi nimic și nu alergi după nimeni pentru bani.",
          ] },
          { h: "Ce e un Living Poster", p: [
            "Un poster tipărit, cu un cod QR sub imagine. Cine îl scanează aude muzica pe telefon și citește alături povestea ta: cine ești și despre ce e lucrarea.",
            "Asta e partea pe care n-o vinde nimeni altcineva. Un magazin de postere are imaginea. Pe tine nu te are.",
          ] },
          { h: "Cât te costă", p: [
            "Nimic per poster. Face parte din Premium — același abonament care îți dă textele AI și mai multe lucrări pe pagină.",
            "Nu există un al doilea comision, niciun procent din originalele tale și niciun contract care să-ți lege lucrările de noi. Debifezi și se oprește.",
          ] },
          { h: "Și pentru o expoziție", p: [
            "Pui un cod mic lângă fiecare lucrare. Cine îl scanează aude muzica, citește povestea și vede cine a pictat-o — și poate comanda posterul pe loc sau poate întreba de original.",
            "Asta face un cod într-o sală plină de oameni: seara se termină, lucrările se dau jos, iar ce a văzut cineva rămâne la o atingere distanță.",
          ] },
          { h: "Cum funcționează, pas cu pas", p: [
            "1. Te înscrii ca artist pe lakatosbandi.com și îți încarci lucrările. Primești propria pagină, lakatosbandi.com/numeletău, iar linkul de editare îți vine pe e-mail.",
            "2. Deschizi pagina cu acel link. Sub numele și orașul tău e o casetă: vreau să-mi vând lucrările și ca Living Poster. O bifezi.",
            "3. Acum fiecare lucrare are lângă ea o a doua casetă: oferă ca Living Poster. Le bifezi pe cele care pot fi tipărite — și doar pe acelea. Apoi salvezi.",
            "4. Din acel moment apari în secțiunea Living Poster cu portretul tău, lângă van Gogh, Klimt și Monet. Lucrările alese stau acolo ca postere: cu cod QR, cu povestea ta și cu buton de cumpărare. Restul paginii tale rămâne exact cum era.",
            "Nimic nu se tipărește înainte să vezi tu, iar dacă debifezi, totul se retrage.",
          ] },
        ],
        merksatz: "Originalul atârnă într-un singur loc. Posterul poate atârna în multe.",
      },
      de: {
        titel: "Biete dein Werk als Poster an",
        beschreibung: "Dein Bild bleibt deins und hängt, wo es hängt. Das Poster davon kann an vielen Wänden hängen — und du bekommst 10 € für jedes verkaufte.",
        lead: "Ein Bild gibt es einmal. Es hängt in einem Raum, und alle anderen müssen dir glauben. Ein Poster davon kann in hundert Räumen hängen, ohne dass du etwas verlierst.",
        /* Ein Beispiel, damit man sieht, wovon die Rede ist (Owner 16.09.2026: „als beispiel
           gibst du ein bild von gerry louisett oder van gogh ist besser") — das Bild trägt keinen
           Text, deshalb in allen drei Sprachen dasselbe. */
        bild: "poster-viu-beispiel.jpg",
        teile: [
          { h: "Das Original bleibt deins", p: [
            "An deinem Werk ändert sich nichts. Es bleibt bei dir, du verkaufst es, wann und an wen du willst, zu dem Preis, den du nennst. Ein verkauftes Poster rührt das eine Stück nicht an, das es gibt — es ist ein Druck davon, auf Papier, in fremdem Flur.",
            "Und nichts von dir wird gedruckt, wenn du es nicht sagst. Du wählst die Werke selbst aus, eines nach dem anderen.",
          ] },
          { h: "Was du bekommst", p: [
            "10 € für jedes verkaufte Poster von dir. Es kommt oben auf unseren Preis, nicht davon herunter — was der Druck kostet und was bei uns bleibt, ist unsere Sache und kein Abzug von deinem.",
            "Wir drucken auf Bestellung, wickeln die Zahlung ab und verschicken. Du packst nichts ein und läufst niemandem hinterher.",
          ] },
          { h: "Was ein Living Poster ist", p: [
            "Ein gedrucktes Poster mit einem QR-Code unter dem Bild. Wer ihn scannt, hört auf dem Telefon die Musik und liest daneben deine Geschichte: wer du bist und worum es in dieser Arbeit geht.",
            "Das ist der Teil, den sonst niemand verkauft. Ein Posterladen hat das Bild. Dich hat er nicht.",
          ] },
          { h: "Was es dich kostet", p: [
            "Nichts je Poster. Es gehört zu Premium — dasselbe Abo, das dir die KI-Texte und mehr Werke auf deiner Seite gibt.",
            "Es gibt keine zweite Gebühr, keinen Anteil an deinen Originalen und keinen Vertrag, der deine Arbeiten an uns bindet. Häkchen weg, und es hört auf.",
          ] },
          { h: "Und für eine Ausstellung", p: [
            "Häng neben jedes Werk einen kleinen Code. Wer ihn scannt, hört die Musik, liest die Geschichte und sieht, wer es gemalt hat — und kann das Poster gleich dort bestellen oder nach dem Original fragen.",
            "Genau das ist ein Code in einem Raum voller Menschen wert: Der Abend geht zu Ende, die Werke kommen von der Wand, und was jemand gesehen hat, bleibt einen Fingertipp entfernt.",
          ] },
          { h: "Wie es geht, Schritt für Schritt", p: [
            "1. Melde dich als Künstler auf lakatosbandi.com an und lade deine Werke hoch. Du bekommst deine eigene Seite, lakatosbandi.com/deinname, und den Link zum Bearbeiten per E-Mail.",
            "2. Öffne deine Seite mit diesem Link. Unter deinem Namen und deiner Stadt steht ein Kästchen: Ich will meine Werke auch als Living Poster verkaufen. Setz das Häkchen.",
            "3. Jetzt hat jedes Werk ein zweites Kästchen daneben: Als Living Poster anbieten. Hak die an, die gedruckt werden dürfen — und nur die. Dann speichern.",
            "4. Ab dem Moment stehst du mit deinem Porträt in der Kategorie Living Poster, neben van Gogh, Klimt und Monet. Die gewählten Werke stehen dort als Poster: mit QR-Code, mit deiner Geschichte und mit Kaufknopf. Der Rest deiner Seite bleibt genau so, wie er war.",
            "Gedruckt wird nichts, bevor du es gesehen hast, und wer das Häkchen entfernt, nimmt alles zurück.",
          ] },
        ],
        merksatz: "Das Original hängt an einem Ort. Das Poster kann an vielen hängen.",
      },
    },
  },
  /* ── 9 · DIE MEISTER SIND DA (Owner 16.09.2026: „ich brauche noch einen artikel … Jetzt könnt
     ihr auch bekannte kunstwerke bei uns als poster bestellen. Van Gogh…") ──────────────────
     Der erste Artikel erklärt, WAS ein Living Poster ist. Dieser sagt, was es zu kaufen gibt,
     was es kostet und wie es ankommt — für Facebook, an Käufer. Alle Zahlen stehen so in der
     Preistabelle; keine Versprechen über Lieferzeiten, die wir nicht kennen. */
  {
    slug: "order-famous-artworks-as-posters",
    datum: "2026-09-16",
    ziel: "shop",
    texte: {
      en: {
        titel: "Now you can order famous paintings from us as posters",
        beschreibung: "van Gogh, Klimt, Monet, Hokusai, Munch, Friedrich — printed to order, in three sizes, from 17 €, delivered in Romania.",
        lead: "The paintings everyone knows hang in museums in Amsterdam, Vienna, Paris and New York. You cannot buy them. What you can have is a good print of them on your own wall — and from today you can order it from us.",
        bild: "living-poster-drei.jpg",
        teile: [
          { h: "Who you can choose from", p: [
            "Vincent van Gogh, Gustav Klimt, Claude Monet, Katsushika Hokusai, Edvard Munch and Caspar David Friedrich. Their works are in the public domain — nobody owns the rights to them any more, which is why we may print them and why you may hang them.",
            "The originals stay in their museums. What you get is a print, and we say so plainly.",
          ] },
          { h: "What it costs", p: [
            "Unframed: A3 for 17 €, A2 for 19 €, A1 for 22 €. In a real wooden frame — black or light oak: 42 €, 59 €, 87 €. Delivery in Romania is 5 € unframed and 12 € framed, because a frame travels in a box and not in a tube.",
            "We print to order. Nothing sits in a warehouse waiting for you.",
          ] },
          { h: "And the part nobody else sells", p: [
            "Under the image sits a QR code. Scan it, and your phone plays music and tells you the story of that painting: who made it, when, and what was going on around it. Like the little sign next to a work in a museum, only on your own wall.",
            "That is why we call it a Living Poster.",
          ] },
          { h: "How to order", p: [
            "Open the Living Poster section on lakatosbandi.com, pick a work, choose the size and the frame, and pay by card. That is all.",
          ] },
        ],
        merksatz: "The original hangs in Amsterdam. The story can hang in your hallway.",
      },
      ro: {
        titel: "Acum poți comanda de la noi tablouri celebre ca postere",
        beschreibung: "van Gogh, Klimt, Monet, Hokusai, Munch, Friedrich — tipărite la comandă, în trei formate, de la 17 €, livrate în România.",
        lead: "Tablourile pe care le știe toată lumea atârnă în muzee din Amsterdam, Viena, Paris și New York. Pe acelea nu le poți cumpăra. Ce poți avea este un print bun după ele, pe peretele tău — iar de azi îl comanzi de la noi.",
        bild: "living-poster-drei.jpg",
        teile: [
          { h: "Dintre cine poți alege", p: [
            "Vincent van Gogh, Gustav Klimt, Claude Monet, Katsushika Hokusai, Edvard Munch și Caspar David Friedrich. Lucrările lor sunt în domeniul public — nimeni nu mai deține drepturi asupra lor, de aceea le putem tipări și de aceea le poți atârna.",
            "Originalele rămân în muzeele lor. Ce primești este un print, și spunem asta pe față.",
          ] },
          { h: "Cât costă", p: [
            "Fără ramă: A3 — 17 €, A2 — 19 €, A1 — 22 €. Cu ramă adevărată de lemn, neagră sau deschisă: 42 €, 59 €, 87 €. Livrarea în România e 5 € fără ramă și 12 € cu ramă, pentru că o ramă călătorește în cutie, nu în tub.",
            "Tipărim la comandă. Nimic nu stă într-un depozit așteptându-te.",
          ] },
          { h: "Și partea pe care n-o vinde nimeni altcineva", p: [
            "Sub imagine stă un cod QR. Îl scanezi, iar telefonul pornește muzica și îți spune povestea tabloului: cine l-a făcut, când și ce se întâmpla în jur. Ca plăcuța de lângă o lucrare la muzeu, doar că e pe peretele tău.",
            "De aceea îi spunem Living Poster.",
          ] },
          { h: "Cum comanzi", p: [
            "Deschizi secțiunea Living Poster pe lakatosbandi.com, alegi o lucrare, alegi mărimea și rama și plătești cu cardul. Atât.",
          ] },
        ],
        merksatz: "Originalul atârnă la Amsterdam. Povestea poate atârna pe holul tău.",
      },
      de: {
        titel: "Jetzt kannst du berühmte Gemälde bei uns als Poster bestellen",
        beschreibung: "van Gogh, Klimt, Monet, Hokusai, Munch, Friedrich — auf Bestellung gedruckt, in drei Formaten, ab 17 €, Lieferung nach Rumänien.",
        lead: "Die Bilder, die jeder kennt, hängen in Museen in Amsterdam, Wien, Paris und New York. Die kann man nicht kaufen. Was man haben kann, ist ein guter Druck davon an der eigenen Wand — und ab heute bestellst du ihn bei uns.",
        bild: "living-poster-drei.jpg",
        teile: [
          { h: "Wer zur Auswahl steht", p: [
            "Vincent van Gogh, Gustav Klimt, Claude Monet, Katsushika Hokusai, Edvard Munch und Caspar David Friedrich. Ihre Werke sind gemeinfrei — niemand hält mehr Rechte daran, deshalb dürfen wir sie drucken und du sie aufhängen.",
            "Die Originale bleiben in ihren Museen. Was du bekommst, ist ein Druck, und das sagen wir offen.",
          ] },
          { h: "Was es kostet", p: [
            "Ohne Rahmen: A3 für 17 €, A2 für 19 €, A1 für 22 €. Im echten Holzrahmen, schwarz oder helle Eiche: 42 €, 59 €, 87 €. Die Lieferung nach Rumänien kostet 5 € ohne Rahmen und 12 € mit, weil ein Rahmen im Karton reist und nicht in der Hülse.",
            "Wir drucken auf Bestellung. Nichts liegt in einem Lager und wartet auf dich.",
          ] },
          { h: "Und der Teil, den sonst niemand verkauft", p: [
            "Unter dem Bild sitzt ein QR-Code. Du scannst ihn, und das Telefon spielt Musik und erzählt dir die Geschichte dieses Gemäldes: wer es gemacht hat, wann, und was damals darum herum geschah. Wie das Schild neben einem Werk im Museum, nur an deiner eigenen Wand.",
            "Deshalb heisst es Living Poster.",
          ] },
          { h: "Wie du bestellst", p: [
            "Öffne den Bereich Living Poster auf lakatosbandi.com, wähle ein Werk, dann Grösse und Rahmen, und zahle mit Karte. Mehr ist es nicht.",
          ] },
        ],
        merksatz: "Das Original hängt in Amsterdam. Die Geschichte kann in deinem Flur hängen.",
      },
    },
  },
];

export const artikelFinden = (slug: string) => ARTIKEL.find(a => a.slug === slug);

export const lesezeit = (t: ArtikelText) =>
  Math.max(2, Math.round([t.lead, ...t.teile.flatMap(x => [x.h, ...x.p]), t.merksatz].join(" ").split(/\s+/).length / 200));
