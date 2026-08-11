/**
 * DAS 30-TAGE-PROGRAMM — DIE TÄGLICHE CHECKLISTE NACH DEM VERSPRECHEN (11.08.2026).
 *
 * WAS DAS IST: Der Kunde hat sein Future-Film-Video aufgenommen und bis zu drei Ziele
 * gewählt (lib/future-ziele.ts). Danach bekommt er ein 30-Tage-Programm mit je einer
 * konkreten Aufgabe und einer Abend-Frage zum Abhaken. Diese Datei ist der Inhalt dieser
 * 30 Tage — für alle sieben Sprachen, statisch, ohne Laufzeit-KI.
 *
 * WARUM STATISCH UND HANDGESCHRIEBEN STATT VON EINEM MODELL ERZEUGT: Ein KI-Aufruf zur
 * Laufzeit wäre pro Kunde anders, nicht nachprüfbar und würde Geld kosten für einen Text,
 * der sich nie ändert. Das Programm ist bewusst ein FESTES Gerüst — dieselben 30 Tage für
 * jeden Kunden. Was sich unterscheidet, ist nicht der Text, sondern der Kunde: seine
 * eigenen Ziele (aus future-ziele.ts) füllen das Gerüst mit Richtung, wenn die
 * Programmseite die Aufgaben anzeigt. Die Struktur ist die gleiche für alle; wohin sie
 * führt, bestimmt jeder für sich.
 *
 * WARUM NICHT DURCH DIE ÜBERSETZUNGSMASCHINE: Wie bei future-ziele.ts wären maschinelle
 * Übersetzungen wortgetreu, aber nicht idiomatisch — und diese Sätze liest der Kunde
 * dreißig Abende lang. Jede Sprache ist hier von Hand geschrieben, mit demselben Inhalt,
 * aber im eigenen Ton. Alle Sprachen duzen (tu/tú/tu/tu/te-Form) — Hausregel, keine
 * Ausnahme.
 *
 * DER BOGEN: Tage 1–7 schaffen Klarheit (das Versprechen, dann an Tag 3 die Entscheidung
 * für das EINE Ziel, das am meisten verändert). Tage 8–14 sind die ersten Schritte
 * (kleinster echter Schritt, ein Verbündeter, ein festes Zeitfenster). Tage 15–21 festigen
 * die Gewohnheit (tägliche Routine, Tag 18 behandelt ausdrücklich einen verpassten Tag:
 * weitermachen statt neu anfangen). Tage 22–29 ziehen Bilanz (was funktioniert, was
 * wegfällt, Tag 28 zeigt das Future-Film-Video noch einmal). Tag 30 schließt den Kreis:
 * Rückblick auf 30 Tage und das nächste 90-Tage-Ziel.
 *
 * KEINE GELD- ODER ERFOLGSVERSPRECHEN: Jede Aufgabe handelt vom Tun, nie von einem
 * Ergebnis in Geld oder Status — daran hängt das Stripe-Konto. Jede Aufgabe ist etwas,
 * das man an einem Abend abhaken kann, kein Kalenderspruch.
 *
 * DER MARKENSATZ „I'm going to bandit this life." steht GENAU ZWEIMAL — Tag 1 und Tag 30
 * — und bleibt in allen sieben Sprachen unübersetzt auf Englisch, mitten im jeweiligen Satz.
 */

export type FutureProgramTag = {
  /** Kurze Überschrift des Tages, z. B. "Dein Startpunkt". */
  titel: string;
  /** Die EINE konkrete Aufgabe des Tages — machbar in ≤30 Minuten, abhakbar. */
  aufgabe: string;
  /** Die Abend-Frage zum Abhaken. */
  frage: string;
};

export const FUTURE_PROGRAM_TAGE: Record<string, FutureProgramTag[]> = {
  en: [
    { titel: "Your Starting Point", aufgabe: "Watch your Future Film video all the way through, then write your promise to yourself in one sentence: 'I'm going to bandit this life.'", frage: "Did you write down your promise?" },
    { titel: "Your Picture of Tomorrow", aufgabe: "Describe in three sentences what your life looks like once your most important goal is reached.", frage: "Did you write down your picture of tomorrow?" },
    { titel: "The Decision", aufgabe: "Look at the goals you chose and decide: which ONE would change your life the most if you reached it? Put it at the top of your list.", frage: "Have you picked your most important goal?" },
    { titel: "What's In Your Way", aufgabe: "Write down the one thing that has held you back the most so far.", frage: "Did you name your biggest obstacle?" },
    { titel: "Why Now", aufgabe: "Write two sentences about why this goal matters to you right now.", frage: "Do you know why it matters now?" },
    { titel: "Make It Visible", aufgabe: "Put a visible reminder of your goal somewhere you'll see it – a note, a picture, a reminder on your phone.", frage: "Is your goal visible now?" },
    { titel: "First Week Done", aufgabe: "Read back through your notes from the last six days and write down what stood out most.", frage: "Did you sum up your first week?" },
    { titel: "The Smallest Step", aufgabe: "Pick the smallest possible step toward your most important goal – something you can finish today in 30 minutes – and do it.", frage: "Did you take your first small step?" },
    { titel: "Your First Ally", aufgabe: "Tell someone you trust about your most important goal.", frage: "Did you tell someone?" },
    { titel: "Reserve the Time", aufgabe: "Put a fixed time slot for your goal in your calendar – the same time, every day.", frage: "Is your time slot in the calendar?" },
    { titel: "Clear One Obstacle", aufgabe: "Remove one concrete thing that has been holding you back.", frage: "Did you clear an obstacle?" },
    { titel: "The Next Step", aufgabe: "Take the next small step toward your most important goal.", frage: "Did you take your next step?" },
    { titel: "What You've Already Done", aufgabe: "Write down three things you've already accomplished in the last twelve days.", frage: "Did you write down your three wins?" },
    { titel: "Second Week Done", aufgabe: "Read through your notes from the second week and write down what's gotten easier.", frage: "Did you sum up your second week?" },
    { titel: "Your Routine", aufgabe: "Choose one fixed daily action that moves you toward your goal, and do it today.", frage: "Did you do your routine?" },
    { titel: "Once More", aufgabe: "Repeat yesterday's routine – same time, same place.", frage: "Did you repeat your routine?" },
    { titel: "Measure Your Progress", aufgabe: "Write down a number or measure you can use to see your progress.", frage: "Did you measure your progress?" },
    { titel: "One Day Isn't the End", aufgabe: "If you missed a day yesterday: just keep going today. No restart, no catching up – just the next step.", frage: "Did you keep going instead of starting over?" },
    { titel: "Routine, Again", aufgabe: "Do your routine again today, however short.", frage: "Did you do your routine today?" },
    { titel: "What's Getting Easier", aufgabe: "Write down which part of your routine feels easier now than at the start.", frage: "Did you notice your progress?" },
    { titel: "Third Week Done", aufgabe: "Read through your notes from the third week and write down what's become a habit.", frage: "Did you sum up your third week?" },
    { titel: "What's Working", aufgabe: "Write down which part of your routine works best.", frage: "Do you know what works best?" },
    { titel: "What to Drop", aufgabe: "Pick one part of your routine that isn't working, and drop it.", frage: "Did you drop what wasn't working?" },
    { titel: "Your Surroundings", aufgabe: "Change one small thing in your surroundings that makes your goal easier.", frage: "Did you adjust your surroundings?" },
    { titel: "Tell Someone Else", aufgabe: "Tell a second person about your progress.", frage: "Did you share your progress?" },
    { titel: "Routine, Settled", aufgabe: "Do your routine today without writing it down – just let it run.", frage: "Has your routine become a habit?" },
    { titel: "What You've Learned", aufgabe: "Write the most important lesson of the last 26 days in one sentence.", frage: "Did you write down your lesson?" },
    { titel: "Your Promise, Again", aufgabe: "Watch your Future Film video once more and compare it to where you stand today.", frage: "Did you watch your video again?" },
    { titel: "Almost There", aufgabe: "Write down what has changed in you since day 1.", frage: "Did you write down what changed?" },
    { titel: "30 Days, One New Goal", aufgabe: "Look back on the 30 days, then write down your next goal for the coming 90 days. I'm going to bandit this life.", frage: "Did you set your 90-day goal?" },
  ],
  de: [
    { titel: "Dein Startpunkt", aufgabe: "Schau dir dein Future-Film-Video ganz an und schreib dein Versprechen an dich selbst in einem Satz auf: 'I'm going to bandit this life.'", frage: "Hast du dein Versprechen aufgeschrieben?" },
    { titel: "Dein Bild von morgen", aufgabe: "Beschreib in drei Sätzen, wie dein Leben aussieht, wenn dein wichtigstes Ziel erreicht ist.", frage: "Hast du dein Bild von morgen aufgeschrieben?" },
    { titel: "Die Entscheidung", aufgabe: "Sieh dir deine gewählten Ziele an und entscheide: Welches EINE verändert dein Leben am meisten, wenn du es erreichst? Schreib es oben auf deine Liste.", frage: "Hast du dein wichtigstes Ziel bestimmt?" },
    { titel: "Was im Weg steht", aufgabe: "Schreib die eine Sache auf, die dir bisher am meisten im Weg stand.", frage: "Hast du dein grösstes Hindernis benannt?" },
    { titel: "Warum jetzt", aufgabe: "Schreib in zwei Sätzen auf, warum dir dieses Ziel gerade jetzt wichtig ist.", frage: "Weisst du, warum es jetzt zählt?" },
    { titel: "Sichtbar machen", aufgabe: "Häng dir eine Erinnerung an dein Ziel sichtbar auf – ein Zettel, ein Bild, eine Notiz auf dem Handy.", frage: "Ist dein Ziel jetzt sichtbar?" },
    { titel: "Erste Woche geschafft", aufgabe: "Lies dir deine Notizen der letzten sechs Tage durch und schreib auf, was dir am meisten aufgefallen ist.", frage: "Hast du deine erste Woche zusammengefasst?" },
    { titel: "Der kleinste Schritt", aufgabe: "Bestimm den kleinsten möglichen Schritt Richtung deinem wichtigsten Ziel – etwas, das du heute in 30 Minuten erledigen kannst – und tu es.", frage: "Hast du deinen ersten kleinen Schritt gemacht?" },
    { titel: "Dein erster Verbündeter", aufgabe: "Erzähl einer Person, der du vertraust, von deinem wichtigsten Ziel.", frage: "Hast du jemanden eingeweiht?" },
    { titel: "Zeit reservieren", aufgabe: "Trag ein festes Zeitfenster für dein Ziel in deinen Kalender ein – jeden Tag zur gleichen Zeit.", frage: "Steht dein Zeitfenster im Kalender?" },
    { titel: "Ein Hindernis ausräumen", aufgabe: "Räum eine konkrete Sache aus dem Weg, die dich bisher aufgehalten hat.", frage: "Hast du ein Hindernis beseitigt?" },
    { titel: "Der nächste Schritt", aufgabe: "Mach den nächsten kleinen Schritt Richtung deinem wichtigsten Ziel.", frage: "Hast du deinen nächsten Schritt gemacht?" },
    { titel: "Was du schon geschafft hast", aufgabe: "Schreib drei Dinge auf, die du in den letzten zwölf Tagen bereits erledigt hast.", frage: "Hast du deine drei Erfolge aufgeschrieben?" },
    { titel: "Zweite Woche geschafft", aufgabe: "Lies deine Notizen der zweiten Woche durch und schreib auf, was leichter geworden ist.", frage: "Hast du deine zweite Woche zusammengefasst?" },
    { titel: "Deine Routine", aufgabe: "Leg eine feste tägliche Handlung fest, die dich deinem Ziel näherbringt, und übe sie heute.", frage: "Hast du deine Routine geübt?" },
    { titel: "Noch einmal", aufgabe: "Wiederhol deine Routine von gestern – zur gleichen Zeit, am gleichen Ort.", frage: "Hast du deine Routine wiederholt?" },
    { titel: "Miss deinen Fortschritt", aufgabe: "Schreib eine Zahl oder ein Mass auf, mit dem du deinen Fortschritt sichtbar machen kannst.", frage: "Hast du deinen Fortschritt gemessen?" },
    { titel: "Ein Tag reicht nicht", aufgabe: "Falls du gestern einen Tag verpasst hast: mach heute einfach weiter. Kein Neustart, kein Nachholen – nur der nächste Schritt.", frage: "Bist du weitergegangen, statt von vorn zu beginnen?" },
    { titel: "Routine, wieder", aufgabe: "Übe deine Routine heute noch einmal, egal wie kurz.", frage: "Hast du deine Routine heute geübt?" },
    { titel: "Was leichter fällt", aufgabe: "Schreib auf, welcher Teil deiner Routine dir inzwischen leichter fällt als am Anfang.", frage: "Hast du deinen Fortschritt bemerkt?" },
    { titel: "Dritte Woche geschafft", aufgabe: "Lies deine Notizen der dritten Woche durch und schreib auf, was inzwischen Gewohnheit geworden ist.", frage: "Hast du deine dritte Woche zusammengefasst?" },
    { titel: "Was funktioniert", aufgabe: "Schreib auf, welcher Teil deiner Routine am besten funktioniert.", frage: "Weisst du, was am besten funktioniert?" },
    { titel: "Was wegfällt", aufgabe: "Bestimm eine Sache in deiner Routine, die nicht funktioniert, und streich sie.", frage: "Hast du etwas gestrichen, das nicht funktioniert?" },
    { titel: "Dein Umfeld", aufgabe: "Ändere eine Kleinigkeit in deiner Umgebung, die dir dein Ziel leichter macht.", frage: "Hast du dein Umfeld angepasst?" },
    { titel: "Sag es noch jemandem", aufgabe: "Erzähl einer zweiten Person von deinem Fortschritt.", frage: "Hast du deinen Fortschritt geteilt?" },
    { titel: "Routine, gefestigt", aufgabe: "Übe deine Routine heute, ohne sie aufzuschreiben – lass sie einfach laufen.", frage: "Ist deine Routine zur Gewohnheit geworden?" },
    { titel: "Was du gelernt hast", aufgabe: "Schreib die wichtigste Lektion der letzten 26 Tage in einem Satz auf.", frage: "Hast du deine Lektion aufgeschrieben?" },
    { titel: "Dein Versprechen, noch einmal", aufgabe: "Schau dir dein Future-Film-Video noch einmal an und vergleiche es mit dem, wo du heute stehst.", frage: "Hast du dein Video noch einmal gesehen?" },
    { titel: "Fast da", aufgabe: "Schreib auf, was sich seit Tag 1 an dir verändert hat.", frage: "Hast du deine Veränderung aufgeschrieben?" },
    { titel: "30 Tage, ein neues Ziel", aufgabe: "Blick zurück auf die 30 Tage und trag dein nächstes Ziel für die kommenden 90 Tage ein. I'm going to bandit this life.", frage: "Hast du dein 90-Tage-Ziel eingetragen?" },
  ],
  ro: [
    { titel: "Punctul tău de plecare", aufgabe: "Urmărește-ți videoclipul Future Film până la capăt și scrie-ți promisiunea într-o singură propoziție: 'I'm going to bandit this life.'", frage: "Ți-ai scris promisiunea?" },
    { titel: "Imaginea zilei de mâine", aufgabe: "Descrie în trei propoziții cum arată viața ta după ce îți atingi cel mai important obiectiv.", frage: "Ți-ai scris imaginea zilei de mâine?" },
    { titel: "Decizia", aufgabe: "Uită-te la obiectivele alese și decide: care UNUL ți-ar schimba viața cel mai mult dacă l-ai atinge? Pune-l în capul listei.", frage: "Ți-ai ales cel mai important obiectiv?" },
    { titel: "Ce te ține pe loc", aufgabe: "Scrie lucrul care te-a împiedicat cel mai mult până acum.", frage: "Ai numit cel mai mare obstacol al tău?" },
    { titel: "De ce acum", aufgabe: "Scrie în două propoziții de ce contează acest obiectiv pentru tine chiar acum.", frage: "Știi de ce contează acum?" },
    { titel: "Fă-l vizibil", aufgabe: "Pune undeva la vedere un semn al obiectivului tău – un bilet, o imagine, un memento pe telefon.", frage: "Este obiectivul tău vizibil acum?" },
    { titel: "Prima săptămână, gata", aufgabe: "Recitește-ți notițele din ultimele șase zile și scrie ce ți-a atras cel mai mult atenția.", frage: "Ți-ai rezumat prima săptămână?" },
    { titel: "Cel mai mic pas", aufgabe: "Alege cel mai mic pas posibil spre obiectivul tău cel mai important – ceva ce poți termina azi în 30 de minute – și fă-l.", frage: "Ai făcut primul tău pas mic?" },
    { titel: "Primul tău aliat", aufgabe: "Spune unei persoane în care ai încredere despre obiectivul tău cel mai important.", frage: "Ai spus cuiva?" },
    { titel: "Rezervă timpul", aufgabe: "Notează în calendar un interval fix pentru obiectivul tău – în fiecare zi, la aceeași oră.", frage: "Este intervalul tău în calendar?" },
    { titel: "Înlătură un obstacol", aufgabe: "Îndepărtează un lucru concret care te-a ținut pe loc până acum.", frage: "Ai înlăturat un obstacol?" },
    { titel: "Următorul pas", aufgabe: "Fă următorul pas mic spre obiectivul tău cel mai important.", frage: "Ai făcut următorul pas?" },
    { titel: "Ce ai realizat deja", aufgabe: "Scrie trei lucruri pe care le-ai realizat deja în ultimele douăsprezece zile.", frage: "Ți-ai scris cele trei reușite?" },
    { titel: "A doua săptămână, gata", aufgabe: "Recitește-ți notițele din a doua săptămână și scrie ce a devenit mai ușor.", frage: "Ți-ai rezumat a doua săptămână?" },
    { titel: "Rutina ta", aufgabe: "Alege o acțiune zilnică fixă care te apropie de obiectiv și fă-o azi.", frage: "Ți-ai făcut rutina?" },
    { titel: "Încă o dată", aufgabe: "Repetă rutina de ieri – aceeași oră, același loc.", frage: "Ți-ai repetat rutina?" },
    { titel: "Măsoară-ți progresul", aufgabe: "Scrie un număr sau o măsură cu care îți poți vedea progresul.", frage: "Ți-ai măsurat progresul?" },
    { titel: "O zi ratată nu e sfârșitul", aufgabe: "Dacă ai ratat o zi ieri: continuă azi, pur și simplu. Fără reînceput, fără recuperare – doar următorul pas.", frage: "Ai continuat în loc să iei totul de la capăt?" },
    { titel: "Rutina, din nou", aufgabe: "Fă-ți rutina din nou azi, oricât de scurtă.", frage: "Ți-ai făcut rutina azi?" },
    { titel: "Ce devine mai ușor", aufgabe: "Scrie ce parte din rutina ta ți se pare acum mai ușoară decât la început.", frage: "Ți-ai observat progresul?" },
    { titel: "A treia săptămână, gata", aufgabe: "Recitește-ți notițele din a treia săptămână și scrie ce a devenit obicei.", frage: "Ți-ai rezumat a treia săptămână?" },
    { titel: "Ce funcționează", aufgabe: "Scrie ce parte din rutina ta funcționează cel mai bine.", frage: "Știi ce funcționează cel mai bine?" },
    { titel: "Ce renunți", aufgabe: "Alege o parte din rutina ta care nu funcționează și renunță la ea.", frage: "Ai renunțat la ce nu funcționa?" },
    { titel: "Mediul tău", aufgabe: "Schimbă un lucru mic din jurul tău care îți ușurează drumul spre obiectiv.", frage: "Ți-ai ajustat mediul?" },
    { titel: "Spune-i și altcuiva", aufgabe: "Povestește unei a doua persoane despre progresul tău.", frage: "Ți-ai împărtășit progresul?" },
    { titel: "Rutina, așezată", aufgabe: "Fă-ți rutina azi fără să o mai notezi – lasă-o pur și simplu să curgă.", frage: "A devenit rutina ta un obicei?" },
    { titel: "Ce ai învățat", aufgabe: "Scrie într-o singură propoziție cea mai importantă lecție din ultimele 26 de zile.", frage: "Ți-ai scris lecția?" },
    { titel: "Promisiunea ta, din nou", aufgabe: "Urmărește-ți din nou videoclipul Future Film și compară-l cu locul în care ești azi.", frage: "Ți-ai revăzut videoclipul?" },
    { titel: "Aproape acolo", aufgabe: "Scrie ce s-a schimbat la tine din ziua 1 până azi.", frage: "Ți-ai scris schimbarea?" },
    { titel: "30 de zile, un obiectiv nou", aufgabe: "Privește înapoi la cele 30 de zile și notează-ți următorul obiectiv pentru următoarele 90 de zile. I'm going to bandit this life.", frage: "Ți-ai stabilit obiectivul pe 90 de zile?" },
  ],
  es: [
    { titel: "Tu punto de partida", aufgabe: "Mira tu vídeo Future Film de principio a fin y escribe tu promesa en una sola frase: 'I'm going to bandit this life.'", frage: "¿Has escrito tu promesa?" },
    { titel: "Tu imagen del mañana", aufgabe: "Describe en tres frases cómo se ve tu vida cuando alcances tu meta más importante.", frage: "¿Has escrito tu imagen del mañana?" },
    { titel: "La decisión", aufgabe: "Mira las metas que elegiste y decide: ¿cuál UNA cambiaría más tu vida si la alcanzaras? Ponla al principio de tu lista.", frage: "¿Has elegido tu meta más importante?" },
    { titel: "Lo que se interpone", aufgabe: "Escribe lo que más te ha frenado hasta ahora.", frage: "¿Has nombrado tu mayor obstáculo?" },
    { titel: "Por qué ahora", aufgabe: "Escribe en dos frases por qué esta meta te importa justo ahora.", frage: "¿Sabes por qué importa ahora?" },
    { titel: "Hazlo visible", aufgabe: "Pon un recordatorio visible de tu meta donde lo veas – una nota, una imagen, un aviso en el móvil.", frage: "¿Es visible tu meta ahora?" },
    { titel: "Primera semana lista", aufgabe: "Repasa tus notas de los últimos seis días y escribe lo que más te llamó la atención.", frage: "¿Has resumido tu primera semana?" },
    { titel: "El paso más pequeño", aufgabe: "Elige el paso más pequeño posible hacia tu meta más importante – algo que puedas terminar hoy en 30 minutos – y hazlo.", frage: "¿Has dado tu primer paso pequeño?" },
    { titel: "Tu primer aliado", aufgabe: "Cuéntale a alguien de confianza tu meta más importante.", frage: "¿Se lo has contado a alguien?" },
    { titel: "Reserva el tiempo", aufgabe: "Anota en tu agenda un horario fijo para tu meta – cada día, a la misma hora.", frage: "¿Está tu horario en la agenda?" },
    { titel: "Quita un obstáculo", aufgabe: "Elimina algo concreto que te ha estado frenando.", frage: "¿Has quitado un obstáculo?" },
    { titel: "El siguiente paso", aufgabe: "Da el siguiente paso pequeño hacia tu meta más importante.", frage: "¿Has dado tu siguiente paso?" },
    { titel: "Lo que ya has logrado", aufgabe: "Escribe tres cosas que ya has logrado en los últimos doce días.", frage: "¿Has escrito tus tres logros?" },
    { titel: "Segunda semana lista", aufgabe: "Repasa tus notas de la segunda semana y escribe qué se ha vuelto más fácil.", frage: "¿Has resumido tu segunda semana?" },
    { titel: "Tu rutina", aufgabe: "Elige una acción diaria fija que te acerque a tu meta y hazla hoy.", frage: "¿Has hecho tu rutina?" },
    { titel: "Una vez más", aufgabe: "Repite la rutina de ayer – misma hora, mismo lugar.", frage: "¿Has repetido tu rutina?" },
    { titel: "Mide tu progreso", aufgabe: "Escribe un número o una medida con la que puedas ver tu progreso.", frage: "¿Has medido tu progreso?" },
    { titel: "Un día no es el final", aufgabe: "Si ayer te saltaste un día: hoy simplemente sigue. Sin volver a empezar, sin recuperar – solo el siguiente paso.", frage: "¿Has seguido en vez de empezar de cero?" },
    { titel: "Rutina, otra vez", aufgabe: "Haz tu rutina otra vez hoy, por corta que sea.", frage: "¿Has hecho tu rutina hoy?" },
    { titel: "Lo que se hace más fácil", aufgabe: "Escribe qué parte de tu rutina te resulta más fácil ahora que al principio.", frage: "¿Has notado tu progreso?" },
    { titel: "Tercera semana lista", aufgabe: "Repasa tus notas de la tercera semana y escribe qué se ha vuelto costumbre.", frage: "¿Has resumido tu tercera semana?" },
    { titel: "Lo que funciona", aufgabe: "Escribe qué parte de tu rutina funciona mejor.", frage: "¿Sabes qué funciona mejor?" },
    { titel: "Lo que dejas ir", aufgabe: "Elige una parte de tu rutina que no funciona y déjala ir.", frage: "¿Has dejado ir lo que no funcionaba?" },
    { titel: "Tu entorno", aufgabe: "Cambia algo pequeño de tu entorno que te facilite el camino hacia tu meta.", frage: "¿Has ajustado tu entorno?" },
    { titel: "Cuéntaselo a alguien más", aufgabe: "Cuéntale a una segunda persona tu progreso.", frage: "¿Has compartido tu progreso?" },
    { titel: "Rutina asentada", aufgabe: "Haz tu rutina hoy sin apuntarla – deja que fluya sola.", frage: "¿Se ha vuelto tu rutina un hábito?" },
    { titel: "Lo que has aprendido", aufgabe: "Escribe en una sola frase la lección más importante de los últimos 26 días.", frage: "¿Has escrito tu lección?" },
    { titel: "Tu promesa, otra vez", aufgabe: "Mira otra vez tu vídeo Future Film y compáralo con dónde estás hoy.", frage: "¿Has vuelto a ver tu vídeo?" },
    { titel: "Casi ahí", aufgabe: "Escribe qué ha cambiado en ti desde el día 1.", frage: "¿Has escrito tu cambio?" },
    { titel: "30 días, una meta nueva", aufgabe: "Mira hacia atrás a los 30 días y anota tu próxima meta para los siguientes 90 días. I'm going to bandit this life.", frage: "¿Has fijado tu meta a 90 días?" },
  ],
  fr: [
    { titel: "Ton point de départ", aufgabe: "Regarde ta vidéo Future Film en entier, puis écris ta promesse en une seule phrase : « I'm going to bandit this life. »", frage: "As-tu écrit ta promesse ?" },
    { titel: "Ton image de demain", aufgabe: "Décris en trois phrases à quoi ressemble ta vie une fois ton objectif le plus important atteint.", frage: "As-tu écrit ton image de demain ?" },
    { titel: "La décision", aufgabe: "Regarde les objectifs que tu as choisis et décide : lequel changerait le plus ta vie si tu l'atteignais ? Mets-le en tête de liste.", frage: "As-tu choisi ton objectif le plus important ?" },
    { titel: "Ce qui te freine", aufgabe: "Écris ce qui t'a le plus freiné jusqu'ici.", frage: "As-tu nommé ton plus grand obstacle ?" },
    { titel: "Pourquoi maintenant", aufgabe: "Écris en deux phrases pourquoi cet objectif compte pour toi maintenant.", frage: "Sais-tu pourquoi ça compte maintenant ?" },
    { titel: "Rends-le visible", aufgabe: "Place un rappel visible de ton objectif là où tu le verras – un mot, une image, un rappel sur ton téléphone.", frage: "Ton objectif est-il visible maintenant ?" },
    { titel: "Première semaine bouclée", aufgabe: "Relis tes notes des six derniers jours et écris ce qui t'a le plus marqué.", frage: "As-tu résumé ta première semaine ?" },
    { titel: "Le plus petit pas", aufgabe: "Choisis le plus petit pas possible vers ton objectif le plus important – quelque chose que tu peux finir aujourd'hui en 30 minutes – et fais-le.", frage: "As-tu fait ton premier petit pas ?" },
    { titel: "Ton premier allié", aufgabe: "Parle de ton objectif le plus important à quelqu'un en qui tu as confiance.", frage: "En as-tu parlé à quelqu'un ?" },
    { titel: "Réserve le temps", aufgabe: "Bloque un créneau fixe dans ton agenda pour ton objectif – chaque jour, à la même heure.", frage: "Ton créneau est-il dans l'agenda ?" },
    { titel: "Écarte un obstacle", aufgabe: "Retire une chose concrète qui t'a freiné jusqu'ici.", frage: "As-tu écarté un obstacle ?" },
    { titel: "Le pas suivant", aufgabe: "Fais le prochain petit pas vers ton objectif le plus important.", frage: "As-tu fait ton pas suivant ?" },
    { titel: "Ce que tu as déjà accompli", aufgabe: "Écris trois choses que tu as déjà accomplies ces douze derniers jours.", frage: "As-tu écrit tes trois réussites ?" },
    { titel: "Deuxième semaine bouclée", aufgabe: "Relis tes notes de la deuxième semaine et écris ce qui est devenu plus facile.", frage: "As-tu résumé ta deuxième semaine ?" },
    { titel: "Ta routine", aufgabe: "Choisis une action quotidienne fixe qui te rapproche de ton objectif, et fais-la aujourd'hui.", frage: "As-tu fait ta routine ?" },
    { titel: "Encore une fois", aufgabe: "Refais la routine d'hier – même heure, même endroit.", frage: "As-tu refait ta routine ?" },
    { titel: "Mesure ton avancée", aufgabe: "Écris un chiffre ou une mesure qui te permet de voir ton avancée.", frage: "As-tu mesuré ton avancée ?" },
    { titel: "Un jour manqué n'est pas la fin", aufgabe: "Si tu as manqué un jour hier : continue aujourd'hui, tout simplement. Pas de nouveau départ, pas de rattrapage – juste le pas suivant.", frage: "As-tu continué au lieu de tout recommencer ?" },
    { titel: "Routine, encore", aufgabe: "Fais ta routine encore aujourd'hui, même brièvement.", frage: "As-tu fait ta routine aujourd'hui ?" },
    { titel: "Ce qui devient plus facile", aufgabe: "Écris quelle partie de ta routine te semble plus facile qu'au début.", frage: "As-tu remarqué ton avancée ?" },
    { titel: "Troisième semaine bouclée", aufgabe: "Relis tes notes de la troisième semaine et écris ce qui est devenu une habitude.", frage: "As-tu résumé ta troisième semaine ?" },
    { titel: "Ce qui fonctionne", aufgabe: "Écris quelle partie de ta routine fonctionne le mieux.", frage: "Sais-tu ce qui fonctionne le mieux ?" },
    { titel: "Ce que tu laisses tomber", aufgabe: "Choisis une partie de ta routine qui ne fonctionne pas, et laisse-la tomber.", frage: "As-tu laissé tomber ce qui ne fonctionnait pas ?" },
    { titel: "Ton environnement", aufgabe: "Change un petit détail de ton environnement qui te facilite le chemin vers ton objectif.", frage: "As-tu ajusté ton environnement ?" },
    { titel: "Parles-en à quelqu'un d'autre", aufgabe: "Parle de ton avancée à une deuxième personne.", frage: "As-tu partagé ton avancée ?" },
    { titel: "Routine installée", aufgabe: "Fais ta routine aujourd'hui sans la noter – laisse-la simplement se dérouler.", frage: "Ta routine est-elle devenue une habitude ?" },
    { titel: "Ce que tu as appris", aufgabe: "Écris en une seule phrase la leçon la plus importante des 26 derniers jours.", frage: "As-tu écrit ta leçon ?" },
    { titel: "Ta promesse, encore", aufgabe: "Regarde à nouveau ta vidéo Future Film et compare-la à où tu en es aujourd'hui.", frage: "As-tu revu ta vidéo ?" },
    { titel: "Presque arrivé", aufgabe: "Écris ce qui a changé en toi depuis le jour 1.", frage: "As-tu écrit ton changement ?" },
    { titel: "30 jours, un nouvel objectif", aufgabe: "Regarde en arrière sur ces 30 jours et note ton prochain objectif pour les 90 jours à venir. I'm going to bandit this life.", frage: "As-tu fixé ton objectif à 90 jours ?" },
  ],
  pt: [
    { titel: "O teu ponto de partida", aufgabe: "Vê o teu vídeo Future Film até ao fim e escreve a tua promessa numa única frase: 'I'm going to bandit this life.'", frage: "Escreveste a tua promessa?" },
    { titel: "A tua imagem de amanhã", aufgabe: "Descreve em três frases como é a tua vida quando alcançares o teu objetivo mais importante.", frage: "Escreveste a tua imagem de amanhã?" },
    { titel: "A decisão", aufgabe: "Olha para os objetivos que escolheste e decide: qual UM mudaria mais a tua vida se o alcançasses? Coloca-o no topo da tua lista.", frage: "Escolheste o teu objetivo mais importante?" },
    { titel: "O que te trava", aufgabe: "Escreve o que mais te tem travado até agora.", frage: "Nomeaste o teu maior obstáculo?" },
    { titel: "Porquê agora", aufgabe: "Escreve em duas frases porque é que este objetivo importa para ti agora.", frage: "Sabes porque importa agora?" },
    { titel: "Torna-o visível", aufgabe: "Põe um lembrete visível do teu objetivo onde o vejas – uma nota, uma imagem, um aviso no telemóvel.", frage: "O teu objetivo está visível agora?" },
    { titel: "Primeira semana concluída", aufgabe: "Relê as tuas notas dos últimos seis dias e escreve o que mais te chamou a atenção.", frage: "Resumiste a tua primeira semana?" },
    { titel: "O passo mais pequeno", aufgabe: "Escolhe o passo mais pequeno possível rumo ao teu objetivo mais importante – algo que consigas terminar hoje em 30 minutos – e fá-lo.", frage: "Deste o teu primeiro passo pequeno?" },
    { titel: "O teu primeiro aliado", aufgabe: "Conta a alguém em quem confias qual é o teu objetivo mais importante.", frage: "Contaste a alguém?" },
    { titel: "Reserva o tempo", aufgabe: "Marca no calendário um horário fixo para o teu objetivo – todos os dias, à mesma hora.", frage: "O teu horário está no calendário?" },
    { titel: "Remove um obstáculo", aufgabe: "Elimina algo concreto que te tem travado.", frage: "Removeste um obstáculo?" },
    { titel: "O próximo passo", aufgabe: "Dá o próximo passo pequeno rumo ao teu objetivo mais importante.", frage: "Deste o teu próximo passo?" },
    { titel: "O que já conquistaste", aufgabe: "Escreve três coisas que já conquistaste nos últimos doze dias.", frage: "Escreveste as tuas três conquistas?" },
    { titel: "Segunda semana concluída", aufgabe: "Relê as tuas notas da segunda semana e escreve o que ficou mais fácil.", frage: "Resumiste a tua segunda semana?" },
    { titel: "A tua rotina", aufgabe: "Escolhe uma ação diária fixa que te aproxime do teu objetivo, e faz-la hoje.", frage: "Fizeste a tua rotina?" },
    { titel: "Mais uma vez", aufgabe: "Repete a rotina de ontem – mesma hora, mesmo lugar.", frage: "Repetiste a tua rotina?" },
    { titel: "Mede o teu progresso", aufgabe: "Escreve um número ou uma medida com que consigas ver o teu progresso.", frage: "Mediste o teu progresso?" },
    { titel: "Um dia falhado não é o fim", aufgabe: "Se ontem falhaste um dia: hoje é só continuar. Sem recomeçar, sem compensar – apenas o próximo passo.", frage: "Continuaste em vez de recomeçar do zero?" },
    { titel: "Rotina, outra vez", aufgabe: "Faz a tua rotina outra vez hoje, por mais curta que seja.", frage: "Fizeste a tua rotina hoje?" },
    { titel: "O que fica mais fácil", aufgabe: "Escreve que parte da tua rotina te parece mais fácil agora do que no início.", frage: "Notaste o teu progresso?" },
    { titel: "Terceira semana concluída", aufgabe: "Relê as tuas notas da terceira semana e escreve o que se tornou hábito.", frage: "Resumiste a tua terceira semana?" },
    { titel: "O que funciona", aufgabe: "Escreve que parte da tua rotina funciona melhor.", frage: "Sabes o que funciona melhor?" },
    { titel: "O que deixas cair", aufgabe: "Escolhe uma parte da tua rotina que não funciona, e deixa-a cair.", frage: "Deixaste cair o que não funcionava?" },
    { titel: "O teu ambiente", aufgabe: "Muda uma pequena coisa no teu ambiente que te facilite o caminho até ao teu objetivo.", frage: "Ajustaste o teu ambiente?" },
    { titel: "Conta a mais alguém", aufgabe: "Conta a uma segunda pessoa o teu progresso.", frage: "Partilhaste o teu progresso?" },
    { titel: "Rotina, assente", aufgabe: "Faz a tua rotina hoje sem a anotar – deixa-a simplesmente acontecer.", frage: "A tua rotina tornou-se um hábito?" },
    { titel: "O que aprendeste", aufgabe: "Escreve numa única frase a lição mais importante dos últimos 26 dias.", frage: "Escreveste a tua lição?" },
    { titel: "A tua promessa, outra vez", aufgabe: "Vê outra vez o teu vídeo Future Film e compara-o com onde estás hoje.", frage: "Voltaste a ver o teu vídeo?" },
    { titel: "Quase lá", aufgabe: "Escreve o que mudou em ti desde o dia 1.", frage: "Escreveste a tua mudança?" },
    { titel: "30 dias, um novo objetivo", aufgabe: "Olha para trás, para os 30 dias, e escreve o teu próximo objetivo para os próximos 90 dias. I'm going to bandit this life.", frage: "Definiste o teu objetivo de 90 dias?" },
  ],
  it: [
    { titel: "Il tuo punto di partenza", aufgabe: "Guarda il tuo video Future Film per intero e scrivi la tua promessa in una sola frase: 'I'm going to bandit this life.'", frage: "Hai scritto la tua promessa?" },
    { titel: "La tua immagine di domani", aufgabe: "Descrivi in tre frasi come sarà la tua vita quando avrai raggiunto il tuo obiettivo più importante.", frage: "Hai scritto la tua immagine di domani?" },
    { titel: "La decisione", aufgabe: "Guarda gli obiettivi che hai scelto e decidi: quale UNO cambierebbe di più la tua vita se lo raggiungessi? Mettilo in cima alla lista.", frage: "Hai scelto il tuo obiettivo più importante?" },
    { titel: "Cosa ti blocca", aufgabe: "Scrivi la cosa che finora ti ha bloccato di più.", frage: "Hai nominato il tuo ostacolo più grande?" },
    { titel: "Perché ora", aufgabe: "Scrivi in due frasi perché questo obiettivo conta per te proprio ora.", frage: "Sai perché conta adesso?" },
    { titel: "Rendilo visibile", aufgabe: "Metti un promemoria visibile del tuo obiettivo dove lo vedrai – un biglietto, un'immagine, un avviso sul telefono.", frage: "Il tuo obiettivo è visibile adesso?" },
    { titel: "Prima settimana fatta", aufgabe: "Rileggi gli appunti degli ultimi sei giorni e scrivi cosa ti ha colpito di più.", frage: "Hai riassunto la tua prima settimana?" },
    { titel: "Il passo più piccolo", aufgabe: "Scegli il passo più piccolo possibile verso il tuo obiettivo più importante – qualcosa che puoi finire oggi in 30 minuti – e fallo.", frage: "Hai fatto il tuo primo piccolo passo?" },
    { titel: "Il tuo primo alleato", aufgabe: "Racconta a qualcuno di cui ti fidi il tuo obiettivo più importante.", frage: "L'hai raccontato a qualcuno?" },
    { titel: "Riserva il tempo", aufgabe: "Segna in agenda una fascia oraria fissa per il tuo obiettivo – ogni giorno, alla stessa ora.", frage: "La tua fascia oraria è in agenda?" },
    { titel: "Elimina un ostacolo", aufgabe: "Rimuovi una cosa concreta che ti ha bloccato finora.", frage: "Hai eliminato un ostacolo?" },
    { titel: "Il passo successivo", aufgabe: "Fai il prossimo piccolo passo verso il tuo obiettivo più importante.", frage: "Hai fatto il tuo passo successivo?" },
    { titel: "Cosa hai già ottenuto", aufgabe: "Scrivi tre cose che hai già ottenuto negli ultimi dodici giorni.", frage: "Hai scritto i tuoi tre successi?" },
    { titel: "Seconda settimana fatta", aufgabe: "Rileggi gli appunti della seconda settimana e scrivi cosa è diventato più facile.", frage: "Hai riassunto la tua seconda settimana?" },
    { titel: "La tua routine", aufgabe: "Scegli un'azione quotidiana fissa che ti avvicina al tuo obiettivo, e falla oggi.", frage: "Hai fatto la tua routine?" },
    { titel: "Ancora una volta", aufgabe: "Ripeti la routine di ieri – stessa ora, stesso posto.", frage: "Hai ripetuto la tua routine?" },
    { titel: "Misura i tuoi progressi", aufgabe: "Scrivi un numero o una misura con cui puoi vedere i tuoi progressi.", frage: "Hai misurato i tuoi progressi?" },
    { titel: "Un giorno perso non è la fine", aufgabe: "Se ieri hai saltato un giorno: oggi continua semplicemente. Niente ricomincio, niente recupero – solo il passo successivo.", frage: "Hai continuato invece di ricominciare da capo?" },
    { titel: "Routine, di nuovo", aufgabe: "Fai di nuovo la tua routine oggi, anche solo brevemente.", frage: "Hai fatto la tua routine oggi?" },
    { titel: "Cosa diventa più facile", aufgabe: "Scrivi quale parte della tua routine ti sembra più facile ora rispetto all'inizio.", frage: "Hai notato i tuoi progressi?" },
    { titel: "Terza settimana fatta", aufgabe: "Rileggi gli appunti della terza settimana e scrivi cosa è diventato un'abitudine.", frage: "Hai riassunto la tua terza settimana?" },
    { titel: "Cosa funziona", aufgabe: "Scrivi quale parte della tua routine funziona meglio.", frage: "Sai cosa funziona meglio?" },
    { titel: "Cosa lasci andare", aufgabe: "Scegli una parte della tua routine che non funziona, e lasciala andare.", frage: "Hai lasciato andare ciò che non funzionava?" },
    { titel: "Il tuo ambiente", aufgabe: "Cambia una piccola cosa nel tuo ambiente che ti renda più facile il cammino verso il tuo obiettivo.", frage: "Hai adattato il tuo ambiente?" },
    { titel: "Parlane con qualcun altro", aufgabe: "Racconta a una seconda persona i tuoi progressi.", frage: "Hai condiviso i tuoi progressi?" },
    { titel: "Routine, consolidata", aufgabe: "Fai la tua routine oggi senza annotarla – lasciala semplicemente scorrere.", frage: "La tua routine è diventata un'abitudine?" },
    { titel: "Cosa hai imparato", aufgabe: "Scrivi in una sola frase la lezione più importante degli ultimi 26 giorni.", frage: "Hai scritto la tua lezione?" },
    { titel: "La tua promessa, di nuovo", aufgabe: "Guarda di nuovo il tuo video Future Film e confrontalo con dove sei oggi.", frage: "Hai rivisto il tuo video?" },
    { titel: "Quasi arrivato", aufgabe: "Scrivi cosa è cambiato in te dal giorno 1.", frage: "Hai scritto il tuo cambiamento?" },
    { titel: "30 giorni, un nuovo obiettivo", aufgabe: "Guarda indietro ai 30 giorni e scrivi il tuo prossimo obiettivo per i prossimi 90 giorni. I'm going to bandit this life.", frage: "Hai fissato il tuo obiettivo a 90 giorni?" },
  ],
};

/** Die 30 Tage in seiner Sprache — unbekannte Sprache fällt auf Englisch zurück. */
export function futureProgramTage(lang: string | undefined): FutureProgramTag[] {
  return FUTURE_PROGRAM_TAGE[String(lang ?? "en").slice(0, 2)] ?? FUTURE_PROGRAM_TAGE.en;
}
