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
};

export type Artikel = { slug: string; datum: string; texte: Record<JournalSprache, ArtikelText> };

export const JOURNAL_SPRACHEN: JournalSprache[] = ["en", "ro", "de"];

export const JOURNAL_UI: Record<JournalSprache, { titel: string; lead: string; lesen: string; zurueck: string; ctaTitel: string; ctaText: string; ctaKnopf: string; minuten: string }> = {
  en: { titel: "Journal", lead: "Marketing for artists — honest, practical, without empty promises.", lesen: "Read", zurueck: "All articles", ctaTitel: "Want this for your work?", ctaText: "We are selecting our first artists now. Free to apply · at least three works in the same style · reviewed within 3 days.", ctaKnopf: "Apply as an artist", minuten: "min read" },
  ro: { titel: "Jurnal", lead: "Marketing pentru artiști — sincer, practic, fără promisiuni goale.", lesen: "Citește", zurueck: "Toate articolele", ctaTitel: "Vrei asta pentru lucrările tale?", ctaText: "Acum ne alegem primii artiști. Aplicarea este gratuită · cel puțin trei lucrări în același stil · verificare în 3 zile.", ctaKnopf: "Aplică ca artist", minuten: "min de citit" },
  de: { titel: "Journal", lead: "Marketing für Künstler — ehrlich, praktisch, ohne leere Versprechen.", lesen: "Lesen", zurueck: "Alle Artikel", ctaTitel: "Willst du das für deine Werke?", ctaText: "Gerade wählen wir die ersten Künstler aus. Bewerbung kostenlos · mindestens drei Werke im selben Stil · Prüfung innerhalb von 3 Tagen.", ctaKnopf: "Als Künstler bewerben", minuten: "Min. Lesezeit" },
};

export const ARTIKEL: Artikel[] = [
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
];

export const artikelFinden = (slug: string) => ARTIKEL.find(a => a.slug === slug);

export const lesezeit = (t: ArtikelText) =>
  Math.max(2, Math.round([t.lead, ...t.teile.flatMap(x => [x.h, ...x.p]), t.merksatz].join(" ").split(/\s+/).length / 200));
