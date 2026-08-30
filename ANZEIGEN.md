# ANZEIGEN.md — das Meta-Ads-Playbook (13.08.2026)

**Das Problem, das diese Datei löst** (Owner: „Ich muss bei jedes Thema überlegen wie ich
die Ads mache, Texte Videos für Meta."): Hier steht je Produkt ALLES, was eine Meta-Anzeige
braucht — Ziel-URL, Hook, Primary Text, Headline, CTA, und woher das Video kommt. Kopieren,
einsetzen, fertig. Deutsch + Englisch; die anderen Sprachen übersetzt Meta Advantage+ oder
du sagst mir Bescheid.

**Die drei festen Regeln für ALLE Anzeigen:**
1. **Ziel ist immer die Tunnel-Adresse**, hell: `/themes/<produkt>/start?light=1&src=fb`
   (das `src=fb` füttert die Quellen-Auswertung in Insights; `&code=…` für Aktionen).
2. **Das Anzeigen-Video kommt aus dem Produkt-Ordner** (`public/<Ordner>` — dieselben
   Clips wie auf der Karte; was auf der Landingpage läuft, hält auch das Ad-Versprechen).
3. **Preis in der Anzeige = der Knopf-Preis** (heute 9,99 € bei den Geschenken — **ausser
   Kuss: 4,99 €**, siehe dort; ändert sich die Tabelle, diese Datei mitziehen — sie ist
   Hand-Werkzeug, kein Code).

---

## David · AI Pre-Screening — `/themes/david/start?light=1&src=fb`

**Stand 29.08.2026, geschrieben für den ersten Anzeigenstart.** Neu gegenüber allen anderen
Produkten: Der Trichter ist **gratis bis zum Ergebnis**. Verkauft wird erst DANACH
(Unterlagen 9,99 € · Video-Bewerbung 9,99 €). Die Anzeige darf deshalb **keinen Preis
nennen** — sie verspricht das kostenlose Ergebnis, sonst bricht der Klick weg.

**Ziel-URL (A/B, die einzige Stelle, die sich unterscheidet):**
- Variante A: `https://luxurybandit.com/themes/david/start?light=1&src=fb&utm_campaign=david-start&utm_content=video-a`
- Variante B: dieselbe URL, nur `utm_content=video-b`

`utm_content` ist der Schlüssel: Der Trichter schreibt ihn an die Sitzung, und in
`/admin/david` steht er je Sitzung unter „Quelle". Damit ist ablesbar, **welches Video** zu
Leads, Berichten und Käufen geführt hat — nicht nur zu Klicks. Ohne `utm_content` sind beide
Videos in den Zahlen nicht zu unterscheiden.

**Video:** die zwei Fassungen des Owners (Hook-Test). Alles andere bleibt gleich — nur so
misst der Test das Video und nicht drei Dinge auf einmal.

### Variante A — der Schmerz zuerst

**Video-Hook:** „30 Bewerbungen. Kein Feedback?"

**Primary Text (DE):**
„30 Bewerbungen. Kein Feedback. Keine Begründung. Nichts.

Es liegt selten daran, dass du zu wenig kannst. Es liegt daran, dass dein Lebenslauf es
nicht zeigt — und niemand dir sagt, woran es lag.

David macht genau das. Er ist ein KI-Recruiter: Er liest deinen Lebenslauf zusammen mit der
Stelle, auf die du dich bewerben willst, und sagt dir zuerst, worüber er mit dir sprechen
wird und warum. Dann stellt er dir die Fragen, die ein Recruiter dir stellen würde — und
sagt dir nach jeder Antwort ehrlich, was sie wert ist.

Am Ende weisst du, was für dich spricht, was hinterfragt wird und was deinem Lebenslauf
fehlt. Kostenlos, in etwa fünf Minuten."

**Primary Text (EN):**
"30 applications. No feedback. No reason. Nothing.

It is rarely because you can't do the job. It is because your CV doesn't show it — and
nobody tells you what went wrong.

David does. He is an AI recruiter: he reads your CV together with the job you want, tells
you upfront what he will ask about and why, then asks the questions a recruiter would ask —
and tells you honestly, after every answer, what it is worth.

At the end you know what speaks for you, what would be questioned, and what your CV is
missing. Free, in about five minutes."

**Headline:** DE: „Warum du keine Antwort bekommst" · EN: "Why nobody answers you"
**Beschreibung:** DE: „Kostenloses Pre-Screening · ca. 5 Minuten" · EN: "Free pre-screening · about 5 minutes"

---

### Variante B — die Neugier zuerst

**Video-Hook:** „Finde heraus, was dein Lebenslauf noch nicht erzählt."

**Primary Text (DE):**
„Dein Lebenslauf erzählt, wo du warst. Nicht, was du dort entschieden hast.

Genau das fehlt Recruitern — und genau danach fragt David. Er ist ein KI-Recruiter: Er liest
deinen Lebenslauf zusammen mit deiner Wunschstelle, zeigt dir vorher, worüber er sprechen
wird und warum ausgerechnet darüber, und führt dann ein echtes Pre-Screening mit dir.

Keine Standardfragen aus dem Internet — nur Fragen zu deinem Werdegang und dieser einen
Stelle. Nach jeder Antwort sagt er dir geradeheraus, ob sie trägt.

Danach hast du dein Ergebnis: deine Stärken mit Beleg, die Punkte, die ein Recruiter
hinterfragen würde, und das, was in deinem Lebenslauf noch fehlt. Kostenlos, etwa fünf
Minuten."

**Primary Text (EN):**
"Your CV says where you have been. Not what you decided while you were there.

That is exactly what recruiters miss — and exactly what David asks about. He is an AI
recruiter: he reads your CV together with the job you want, shows you upfront what he will
ask about and why, then runs a real pre-screening with you.

No standard questions from the internet — only questions about your career and this one job.
After every answer he tells you straight whether it holds up.

Then you have your result: your strengths with evidence, the points a recruiter would
question, and what your CV is still missing. Free, about five minutes."

**Headline:** DE: „Was dein Lebenslauf nicht erzählt" · EN: "What your CV does not say"
**Beschreibung:** DE: „Kostenloses Pre-Screening · ca. 5 Minuten" · EN: "Free pre-screening · about 5 minutes"

---

**CTA-Knopf (beide):** „Mehr dazu" — es wird nichts verkauft, also kein „Jetzt einkaufen".

**Was in der Anzeige NICHT stehen darf:**
- Kein Preis (der Trichter ist gratis; ein Preis in der Anzeige senkt den Klick und die
  Erwartung stimmt nicht)
- Keine Zusage auf einen Job, kein „garantiert", keine Erfolgsquote — wir bereiten vor, wir
  vermitteln nicht
- Nichts über Arbeitgeber, an die etwas geschickt wird: Im Trichter steht ausdrücklich
  „Deine Bewerbung geht nie automatisch an Arbeitgeber", und das muss die Anzeige halten

**Was der A/B-Test beantworten soll:** Nicht „welches Video hat mehr Klicks", sondern
**welches Video bringt fertige Berichte**. Ein Video kann billige Klicks holen und trotzdem
die schlechteren Leute bringen. Die Kette in `/admin/david` je `utm_content`:
Sitzungen → Leads → Berichte → Käufe.

---

## Future Self Program — `/themes/versprechen/start?light=1&src=fb`
**Video:** `public/Versprechen` (Kachel-Video zuerst)
**Hooks (3 Varianten zum Testen):**
- DE: „In 5 Jahren schaust du auf heute zurück. Was wirst du sehen?"
- DE: „Nimm eine Nachricht an dein zukünftiges Ich auf. Wir machen einen Film daraus."
- EN: "Record a message to your future self. We turn it into your Future Film."
**Primary:** DE: „Sieh deine Zukunft. Mach das Versprechen. Halte es 30 Tage lang. Dein
persönlicher Future Film + 30-Tage-Programm mit täglicher Checkliste — 9,99 €, einmalig."
· EN: "See your future. Make the promise. Live it for 30 days. Your personal Future Film +
a 30-day program with a daily checklist — €9.99, one-off."
**Headline:** DE: „Future Self Program — 9,99 €" · EN: "Future Self Program — €9.99"
**CTA-Button (Meta):** Registrieren / Sign Up

## Geburtstag — `/themes/birthday/start?light=1&src=fb`
**Video:** `public/Birthday`
**Hooks:**
- DE: „Sag Happy Birthday auf eine Art, die niemand erwartet."
- DE: „Dein Gesicht. Deine Stimme. Ein Geburtstagsgruß aus einer anderen Welt."
- EN: "Say happy birthday in a way nobody expects."
**Primary:** DE: „Nimm dich 30 Sekunden auf — wir machen daraus ein Geburtstagsvideo mit
deinem Gesicht und deiner Stimme, in einer Welt, die niemand erwartet. 9,99 €." · EN: "Record
30 seconds — we turn it into a birthday video with your face and your voice. €9.99."
**Headline:** „Geburtstagsvideo — 9,99 €" / "Birthday video — €9.99"

## Kuss — `/themes/kiss/start?s=3&light=1&src=fb`
**Video:** `public/Kiss`
**Achtung, eigener Preis:** Der Kuss kostet seit dem 16.08.2026 **4,99 €**, nicht 9,99 € wie
die übrigen Geschenke (`KUSS_CENTS` in lib/pricing.ts).
**Achtung, eigene Ziel-Adresse:** `?s=3` springt direkt auf den Generieren-Schritt (Owner
16.08.2026: „meta bekommt die url direkt vom generiere") — der Anzeigen-Besucher sieht die
zwei Upload-Kacheln sofort, ohne Anmeldeformular davor. Die E-Mail verlangt erst der
Generieren-Knopf.
**Hooks:**
- DE: „Schick einen Kuss an den Menschen, den du liebst."
- DE: „Ein Foto von dir, eins von ihr — ein Video von euch beiden."
- EN: "Send a kiss to the one you love."
**Primary:** DE: „Zwei Fotos, eine Szene deiner Wahl — ein privates Kussvideo von euch
beiden, nur für sie. 4,99 €." · EN: "Two photos, one scene — a private kiss video of you
both, made for her alone. €4.99."
**Headline:** „Kussvideo — 4,99 €" / "Kiss video — €4.99"

## Hochzeit — `/themes/wedding/start?light=1&src=fb`
**Video:** `public/Wedding`
**Hooks:**
- DE: „Eure Hochzeitseinladung als Video — plus Gästeliste, Menü und Gruppenchat."
- EN: "Your wedding invitation as a video — with guest list, menu and group chat."
**Primary:** DE: „Zwei Fotos von euch — eine Traum-Einladung als Video, 30 Tage online,
Zusagen mit einem Tipp. 9,99 €; Gästeliste, Menü & Chat im Abo 14,99 €/Monat, jederzeit
kündbar." · EN: "Two photos — a dream video invitation, online for 30 days, RSVPs with one
tap. €9.99; guest list, menu & chat at €14.99/month, cancel anytime."
**Headline:** „Digitaler Hochzeitsplaner — 9,99 €" / "Digital wedding planner — €9.99"

## Urlaub — `/themes/holiday/start?light=1&src=fb`
**Video:** `public/Holiday`
**Hooks:**
- DE: „Komm bitte mit nach Teneriffa — als Video-Einladung, die niemand ablehnen kann."
- EN: "Ask them away — with a video invitation nobody can say no to."
**Primary:** DE: „Zwei Fotos, eine Traum-Szene, dein Einladungssatz — die Urlaubs-Einladung
als Video. 9,99 €." · EN: "Two photos, a dream scene, your one line — the holiday invitation
as a video. €9.99."
**Headline:** „Urlaubs-Einladung — 9,99 €" / "Holiday invitation — €9.99"

## Surprise (Tanz) — `/themes/surprise/start?light=1&src=fb`
**Video:** `public/Pooldance`
**Hooks:**
- DE: „Überrasch ihn heute Nacht — mit einem Video, das nur er je sieht."
- EN: "Surprise him tonight — with a video only he will ever see."
**Primary:** DE: „Ein Foto von dir, ein Set deiner Wahl — ein privates Tanzvideo, nur für
ihn. Nichts wird irgendwo veröffentlicht. 9,99 €." · EN: "One photo, one set — a private
dance video, for him alone. Nothing is ever posted. €9.99."
**Headline:** „Private Überraschung — 9,99 €" / "Private surprise — €9.99"

## Try-on — `/themes/tryon/start?light=1&src=fb`
**Video:** `public/Tryon` (14 Clips — je Anzeige EINEN nehmen, nicht mischen)
**Hooks:**
- DE: „Sieh dich selbst in dem Look — ein Foto genügt."
- DE: „Wardrobe an? Ein Foto von dir, und du trägst es."
- EN: "See yourself in the look — one photo is enough."
**Primary:** DE: „Wähl einen Look aus der Wardrobe, lad ein Foto von dir hoch — dein
Try-on-Video, in deiner Karte. 9,99 €. Nur Bilder von dir selbst." · EN: "Pick a look, upload
one photo of yourself — your try-on video, in your card. €9.99. Only photos of yourself."
**Headline:** „Try this look — 9,99 €" / "Try this look — €9.99"
**Achtung Meta-Freigabe:** Kacheln mit Lingerie NICHT als Ad-Creative — die Kleider/Roben-
Clips aus dem Ordner nehmen.

## Chat — `/themes/chat/start?light=1&src=fb`
**Video:** `public/Chat` (Bella am Mikrofon)
**Hooks:**
- DE: „Schenk ihm eine perfekte KI-Freundin. 💛"
- DE: „Er will immer Ja hören? Dann ist das sein Geschenk."
- EN: "Gift him a perfect AI girlfriend."
**Primary:** DE: „Bella schreibt jeden Tag in seiner Sprache zurück — und erinnert sich an
gestern. Erster Monat 9,99 €, danach verlängert ER für 14,99 €/Monat, jederzeit kündbar."
· EN: "Bella writes back in his language, every day — and remembers yesterday. First month
€9.99, he renews at €14.99/month, cancel anytime."
**Headline:** „KI-Freundin verschenken — 9,99 €" / "Gift an AI girlfriend — €9.99"
**Achtung:** immer als GESCHENK bewerben (der Titel spricht den Käufer an, nie den
Beschenkten — Hausregel), und der Hinweis „sie sagt im Chat, dass sie eine KI ist" bleibt.

## Gutschein — `/themes/gutschein/start?light=1&src=fb`
**Video:** `public/Gutscheine`
**Hooks:**
- DE: „Keine Idee? Schenk die Wahl — der Gutschein für alle LuxuryBandit-Geschenke."
- EN: "No idea what to gift? Give the choice."
**Primary:** DE: „Die Gutschein-Karte ist gratis — du zahlst nur das Geschenk dahinter.
Er oder sie sucht sich aus: Kuss, Geburtstag, Tanz, Urlaub, Hochzeit." · EN: "The voucher
card is free — you only pay for the gift inside."
**Headline:** „Der LuxuryBandit-Gutschein" / "The LuxuryBandit voucher"

---

**Neue Produkte:** Der Generator-Weg (Memory `produkt-konfig-lib-produkte`) schreibt diesen
Block künftig mit — Hook/Primary/Headline wohnen dann in `PRODUKTE.<slug>.marketing`, diese
Datei ist die menschenlesbare Ausgabe davon.
