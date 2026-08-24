import { MapPin, Languages, ArrowUpRight, Check, FileText, Mail, Phone, Link2 } from "lucide-react";
import { Knopf, TalentKopf } from "@/components/CI";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import TeilenKnopf from "@/components/TeilenKnopf";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import ProfilChatEinstieg from "@/components/ProfilChatEinstieg";
import SeitenFuss from "@/components/SeitenFuss";
import { EXECUTIVE_TEXTE, type ExecutiveProfil } from "@/lib/lebenslauf-vorlage";
import type { Lang } from "@/lib/lang";
import type { ReactNode } from "react";

/**
 * DIE VORLAGE „EXECUTIVE" — DAS FERTIGE BEWERBER-DOSSIER (Owner 22.08.2026: „one template
 * that looks so polished, credible and premium that a professional candidate would
 * immediately want to use it for a real job application" · „It should feel professionally
 * curated." · „I would send this profile to an employer.").
 *
 * DIE EINE ENTWURFS-ENTSCHEIDUNG, AUS DER ALLES ANDERE FOLGT: Der Bewerber ist PAPIER, die
 * Plattform ist der dunkle Raum darum. ALLES steht auf EINER durchgehenden elfenbeinfarbenen
 * Fläche (`.lb-karte`), getrennt nur durch Haarlinien, wie die Seiten einer Mappe — seit dem
 * 24.08.2026 ausdrücklich auch die passenden Rollen, der Arbeitgeber-Abschluss und der
 * Profil-Chat (Owner: „das was unter der Karte existiert, interessiert mich gar nicht. Es
 * muss alles in der Karte sein"; vorher stand die Maschinen-Hälfte auf dem Dunklen unter dem
 * Blatt). Deshalb liest sich die Seite als Dossier und nicht als SaaS-Oberfläche aus lauter
 * Kästen (Auftrag: „not generic SaaS cards everywhere", „The page must feel like a personal
 * professional dossier").
 *
 * WARUM NICHT JE ABSCHNITT EINE KARTE: Sechs Karten untereinander sind sechs Ränder, sechs
 * Schatten und fünf Lücken — das ist die Optik eines Baukastens. Eine Fläche mit Haarlinien
 * ist die Optik eines gedruckten Dokuments. Genau darin liegt der Unterschied zwischen
 * „CV-Builder" und „Executive Search".
 *
 * DIE ZEHN SEKUNDEN (Auftrag: wer ist das · welches Niveau · welche Stärken · welche
 * Erfahrung · lohnt sich der Kontakt): In dieser Reihenfolge steht es auch da. Der Name ist
 * das grösste Element der Seite, das Porträt darüber das einzige Bild, und der Preis dieser
 * Entscheidung — der Kaufknopf des Hauses — hat hier keinen Platz: Diese Seite verkauft
 * nichts, sie stellt jemanden vor.
 *
 * FARBEN: Gold trägt genau ZWEI Dinge — die Wortmarke im Kopf und den einen Knopf „Gespräch
 * anfragen". In der Karte ist der Akzent Tinte (`.lb-karte`-Regeln in globals.css), draussen
 * das gelbe #f6cf51. Kein Verlauf, kein zweites Gold, keine bunten Abzeichen (Skill
 * `ci-design`; Auftrag: „Gold should be used only for emphasis and important actions").
 *
 * KEIN „made by luxurybandit.com" (Memory `lebenslauf-kontaktkarte-ausblendbar`): Was der
 * Bewerber verschickt, gehört ihm. Die Herkunft steht im Kopf, und dort reicht sie.
 *
 * BREITE: Handy zuerst (390–430), am Rechner eine mittige Spalte von 760 (`lb-dossier` in
 * globals.css hebt die 440er-Handy-Spalte des Hauses für genau diese Seite auf) — nie über
 * die ganze Breite gezogen, ein Dossier ist kein Dashboard.
 */

/** Die Haarlinie zwischen zwei Abschnitten desselben Blattes. Tinte auf Elfenbein, in beiden
    Fassungen dieselbe: `.lb-karte` behält ihre Farben, hell wie dunkel (globals.css). */
const LINIE = "border-t border-[#1a160f]/[0.11]";

/** Die kleine Überschrift eines Abschnitts. Gesperrte Versalien in Tinte, nie in Gold — auf
    Papier ist Gold Zierat, und Zierat auf jeder Überschrift ist genau der „excessive gold",
    den der Auftrag ausschliesst. */
function Abschnitt({ children }: { children: string }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-40">{children}</p>;
}

export default function LebenslaufExecutive({ profil, lang = "en", werkzeug }: {
  profil: ExecutiveProfil;
  lang?: Lang;
  /** BESITZER-WERKZEUG (Owner 24.08.2026: das Korrektur-Feld) — die [id]-Seite reicht es
      herein, das Beispiel nicht. Es rendert als letzter Abschnitt IM Blatt; ob es für den
      Betrachter überhaupt erscheint, entscheidet der Baustein selbst (Besitz-Prüfung). */
  werkzeug?: ReactNode;
}) {
  const T = EXECUTIVE_TEXTE[lang] ?? EXECUTIVE_TEXTE.en;
  const K = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  const vorname = profil.name.split(" ")[0] || profil.name;

  const menu = [
    { label: T.profil, href: "#profil" },
    { label: T.expertise, href: "#expertise" },
    { label: T.erfahrung, href: "#erfahrung" },
    { label: T.passung, href: "#passung" },
    ...(profil.cvUrl ? [{ label: T.cvLaden, href: profil.cvUrl, datei: true }] : []),
  ];

  return (
    /* `lb-dossier`: die eine Kennung, an der globals.css die Handy-Spalte für diese Seite
       aufhebt — sonst stünde das Dossier am Rechner in einem 440-px-Telefonrahmen. */
    <main className="lb-bg lb-dossier min-h-screen text-white">
      <TalentKopf marke={T.marke} teilenLabel={T.teilen} kopiertLabel={T.kopiert}
        menuLabel={T.menu} menuTitel={T.menuTitel} menu={menu} />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-14 pt-3 md:max-w-[760px] md:pt-6">

        {/* ─────────────────────────── DAS BLATT ─────────────────────────── */}
        <article className="lb-karte overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)]">

          {/* HERO — Porträt, und das Porträt IST das Video (Auftrag: „Integrate it elegantly
              into the hero rather than making a separate ugly video block").
              Das Bild sitzt mit Rand im Papier statt randlos: So wirkt es wie eine montierte
              Aufnahme in einer Mappe, nicht wie ein Kopfbild einer App.

              AM RECHNER ZWEISPALTIG, UND ZWAR AUS EINEM GEMESSENEN GRUND (22.08.2026, 1280×860):
              Untereinander ist das 4:5-Porträt in der 728er-Spalte 850 Pixel hoch — der Name
              stand damit UNTER dem ersten Bildschirm, und die eine Regel des Auftrags („The
              candidate name and professional positioning must immediately dominate the
              hierarchy") war genau am grossen Bildschirm verletzt. Nebeneinander ist es ausserdem
              die Form, die eine Zeitschrift für ein Porträt wählt: Bild links, Name und Rolle
              rechts daneben. Am Handy bleibt es gestapelt — dort ist untereinander die einzige
              Möglichkeit, und das Bild darf gross sein. */}
          <div className="p-4 md:flex md:items-center md:gap-7 md:p-7">
            {/* Ohne Video UND ohne Foto (Altprofile vor dem 24.08.2026) fällt das Porträt
                weg, statt ein leeres <img> zu zeigen — der Name trägt die Seite dann allein. */}
            {(profil.videoUrl || profil.portraitUrl) && (
            <div className="relative md:w-[300px] md:shrink-0">
              {profil.videoUrl ? (
                <EinladungAnsicht id={profil.id} videoUrl={profil.videoUrl} poster={profil.portraitUrl || undefined}
                  zaehlen={false} schleife={false} originalton musik=""
                  /* Sprechvideo: oben ankern, sonst schneidet die 4:5-Flaeche den Kopf ab
                     (Owner 24.08.2026; Skill `card`). */
                  verhaeltnis="aspect-[4/5]" ausrichtung="oben"
                  tonText={K.ton} tonAusText={K.tonAus} grossText={K.gross} kleinText={K.klein}
                  teilen={<TeilenKnopf rund text={`${profil.name} — ${profil.rolle}`}
                    label={T.teilen} kopiertLabel={T.kopiert} />} />
              ) : (
                <div className="aspect-[4/5] w-full overflow-hidden rounded-[14px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {/* object-top wie beim Video darüber — Porträt nie mittig schneiden
                      (Skill `card`, 24.08.2026). */}
                  <img src={profil.portraitUrl} alt={profil.name} className="h-full w-full object-cover object-top" />
                </div>
              )}
              {/* Die Aufschrift auf dem Video — links unten, wo keiner der drei Karten-Knöpfe
                  sitzt (Skill `card`: sie stehen rechts in einer Spalte). `pointer-events-none`,
                  damit der Tipp auf das Video durchgeht und es gross macht.
                  `data-aufmedien="1"` IST HIER PFLICHT UND KEIN SCHMUCK (gemessen, 22.08.2026):
                  Ich hatte `lb-onmedia` genommen — die Klasse gilt aber nur in der HELLEN
                  Fassung (`.lb-theme .lb-onmedia`). Im Dunkeln gewann `.lb-karte span
                  { color:#2a231c !important }`, und die Aufschrift stand braun auf braunem
                  Schleier, also unlesbar (Memory `lb-karte-important-frisst-inline-farben`).
                  `[data-aufmedien]` ist der Haken, den die Karte selbst für Bedienung AUF dem
                  Video vorsieht: weiss, in beiden Fassungen. */}
              {profil.videoUrl && profil.videoLabel && (
                <span data-aufmedien="1" className="pointer-events-none absolute bottom-3 left-3 z-30 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                  style={{ background: "rgba(12,10,8,0.55)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}>
                  {profil.videoLabel}
                </span>
              )}
            </div>
            )}

          {/* NAME UND POSITIONIERUNG — die Hierarchie der ganzen Seite steht in diesen zwei
              Zeilen. Serife, weil sie zum Papier gehört (die zweite und einzige zweite Schrift
              des Hauses, Skill `ci-design`), gesperrte Versalien, weil ein Name in einem
              Dossier eine Auszeichnung ist und keine Überschrift.
              `px-1` am Handy: Der Kasten sitzt jetzt IM Hero-Rahmen (p-4), zusammen ergibt das
              wieder die 20 Pixel Rand der Abschnitte darunter. */}
          <div className="px-1 pb-1 pt-5 md:min-w-0 md:flex-1 md:px-0 md:pb-0 md:pt-0">
            <h1 className="font-serif text-[30px] font-black uppercase leading-[1.02] tracking-[0.02em] md:text-[40px]">
              {profil.name}
            </h1>
            <p className="mt-2 text-[14px] font-bold leading-snug opacity-80 md:text-[16px]">{profil.rolle}</p>

            {/* NUR GEFÜLLTE ZEILEN (24.08.2026, seit echte Profile hier ankommen): Die
                Auswertung liefert nicht immer Ort und Sprachen — ein Icon vor leerem Text
                sähe kaputt aus, und eine leere Zeile trüge trotzdem ihre Haarlinie. */}
            {(profil.ort || profil.sprachenKurz) && (
              <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3.5 ${LINIE}`}>
                {profil.ort && (
                  <span className="flex items-center gap-1.5 text-[11.5px] font-bold opacity-60">
                    <MapPin className="h-3.5 w-3.5" />{profil.ort}
                  </span>
                )}
                {profil.sprachenKurz && (
                  <span className="flex items-center gap-1.5 text-[11.5px] font-bold opacity-60">
                    <Languages className="h-3.5 w-3.5" />{profil.sprachenKurz}
                  </span>
                )}
              </div>
            )}

            {/* DER STATUS — leise, aber vorhanden (Auftrag: „Include a subtle status"). Ein
                Punkt und ein Wort; kein farbiges Abzeichen, keine Fläche. */}
            {profil.verfuegbar && (
              <p className="mt-3.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-75">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#2f7d4f]" />
                {profil.verfuegbar}
              </p>
            )}

            {/* DIE DREI, VIER SCHWERPUNKTE — dünn umrandet, klein, in einer Reihe. Sie sind
                Etiketten, keine Knöpfe (Skill `ci-design`: „Ein Chip darf nicht wie ein Button
                aussehen"), deshalb weder gefüllt noch farbig. */}
            {profil.schwerpunkte.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {profil.schwerpunkte.map(s => (
                  <span key={s} className="rounded-full border border-[#1a160f]/25 px-2 py-1 text-[9.5px] font-black uppercase tracking-[0.04em] opacity-75">
                    {s}
                  </span>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* PROFIL — der Fliesstext der Seite, in der HAUS-SANS (Owner 24.08.2026: „ich
              finde die Serifenschrift sehr anstrengend zu lesen" — die Serife bleibt nur
              als Auszeichnung auf Name und Überschriften, nie mehr auf Lesetext). Die
              grosszügige Zeilenhöhe bleibt: Er ist das Einzige, was am Stück gelesen wird. */}
          {profil.profil && (
            <section id="profil" className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <Abschnitt>{T.profil}</Abschnitt>
              <p className="mt-3 text-[14.5px] font-medium leading-[1.65] opacity-85 md:text-[16px]">{profil.profil}</p>
            </section>
          )}

          {/* KERNKOMPETENZEN — ein gesetztes Raster statt bunter Abzeichen (Auftrag: „Do NOT
              create huge colorful badges"). Zwei Spalten am Handy, drei am Rechner; jede Zeile
              trägt nur ihre Haarlinie. */}
          {profil.expertise.length > 0 && (
            <section id="expertise" className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <Abschnitt>{T.expertise}</Abschnitt>
              <ul className="mt-3 grid grid-cols-2 gap-x-5 md:grid-cols-3">
                {profil.expertise.map(e => (
                  <li key={e} className={`py-2.5 text-[12.5px] font-bold leading-snug opacity-80 ${LINIE}`}>{e}</li>
                ))}
              </ul>
            </section>
          )}

          {/* ERFAHRUNG — Rolle gross, Firma und Zeitraum in einer Zeile darunter, ein Satz
              Ergebnis. Kein Lebenslauf-Nachbau (Auftrag: „Do not recreate the entire CV"),
              sondern die drei Stationen, an denen man das Niveau erkennt. */}
          {profil.erfahrung.length > 0 && (
            <section id="erfahrung" className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <Abschnitt>{T.erfahrung}</Abschnitt>
              <div className="mt-1">
                {profil.erfahrung.map((e, i) => (
                  <div key={`${e.rolle}-${e.zeitraum}`} className={`pb-4 pt-4 ${i === 0 ? "" : LINIE}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[15px] font-black leading-tight md:text-[16px]">{e.rolle}</p>
                      <p className="shrink-0 text-[10.5px] font-black uppercase tracking-[0.1em] opacity-45">{e.zeitraum}</p>
                    </div>
                    {/* Echte Profile kennen Firma/Ergebnis nicht immer — leere Absätze
                        wären unsichtbare Lücken im Papier (24.08.2026). */}
                    {e.firma && <p className="mt-1 text-[12px] font-bold opacity-60">{e.firma}</p>}
                    {e.ergebnis && <p className="mt-2 text-[12.5px] leading-snug opacity-75">{e.ergebnis}</p>}
                  </div>
                ))}
              </div>
              {profil.cvUrl && (
                <p className={`pt-3 text-[11.5px] font-bold italic opacity-50 ${LINIE}`}>{T.ganzeCv}</p>
              )}
            </section>
          )}

          {/* AUSGEWÄHLTE ERGEBNISSE — drei Zahlen, jede mit ihrer Zeile. Die Zahl in der
              Serife und gross: Sie ist der Beleg, auf den ein Personaler zeigt. */}
          {profil.impact.length > 0 && (
            <section className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <Abschnitt>{T.impact}</Abschnitt>
              <div className="mt-1">
                {profil.impact.map((z, i) => (
                  /* Zahl LINKS in fester Spalte, Zeile DANEBEN — nicht rechtsbündig gegenüber
                     (gemessen, 22.08.2026): Rechtsbündig brach erst die Zahl um und dann die
                     Zeile, zwei ausgefranste Ränder, die aufeinander zeigen.
                     UND DIE ZAHL IST EINE ZAHL: „Team of 6" sprengte die Spalte und klebte an
                     seiner eigenen Beschriftung. Was der Lebenslauf sagt, steht jetzt getrennt
                     — „6" in der Spalte, „People led" in der Zeile. Ein Kennwert-Block, in dem
                     ein Feld ein Satz ist, ist kein Kennwert-Block. */
                  <div key={z.zahl} className={`flex items-baseline gap-4 py-3.5 ${i === 0 ? "" : LINIE}`}>
                    <p className="w-[92px] shrink-0 whitespace-nowrap pr-3 font-serif text-[26px] font-black leading-none md:w-[120px] md:text-[30px]">{z.zahl}</p>
                    <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.08em] opacity-60">{z.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AUSBILDUNG UND SPRACHEN — sichtbar, aber zweitrangig (Auftrag: „Compact section …
              visible but secondary"): kleinere Schrift, zwei Spalten am Rechner. Echte
              Profile kennen beides oft nicht — dann fällt der ganze Abschnitt weg, statt
              als leerer 50-px-Streifen mit Haarlinie im Blatt zu stehen (gemessen 24.08.). */}
          {(profil.ausbildung.length > 0 || profil.sprachen.length > 0) && (
          <section className={`grid gap-6 px-5 py-6 md:grid-cols-2 md:px-8 md:py-7 ${LINIE}`}>
            {profil.ausbildung.length > 0 && (
              <div>
                <Abschnitt>{T.bildung}</Abschnitt>
                <div className="mt-1">
                  {profil.ausbildung.map((a, i) => (
                    <div key={a.titel} className={`py-3 ${i === 0 ? "" : LINIE}`}>
                      <p className="text-[12.5px] font-black leading-snug">{a.titel}</p>
                      <p className="mt-0.5 text-[11.5px] font-bold opacity-55">{a.ort}</p>
                      <p className="mt-0.5 text-[10.5px] font-black uppercase tracking-[0.1em] opacity-40">{a.zeitraum}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {profil.sprachen.length > 0 && (
              <div>
                <Abschnitt>{T.sprachen}</Abschnitt>
                <div className="mt-1">
                  {profil.sprachen.map((s, i) => (
                    <div key={s.sprache} className={`flex items-baseline justify-between gap-4 py-3 ${i === 0 ? "" : LINIE}`}>
                      <p className="text-[12.5px] font-black">{s.sprache}</p>
                      <p className="text-[11.5px] font-bold opacity-55">{s.niveau}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          )}
          {/* ─────────── PASSENDE ROLLEN — IM PAPIER (Owner 24.08.2026: „das was unter der
              Karte existiert, interessiert mich gar nicht. Es muss alles in der Karte sein").
              Bis heute stand die Auswertung „auf dem Dunklen" unter dem Blatt — jetzt ist sie
              ein Abschnitt des Dossiers, in Tinte statt Gold/Weiss. „Stark" gegen „gut"
              unterscheidet sich über das Gewicht (voll gegen 40 %), nie über eine Prozentzahl
              (Auftrag ausdrücklich). ─────────── */}
          {profil.passendeRollen.length > 0 && (
            <section id="passung" className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <Abschnitt>{T.passung}</Abschnitt>
              <div className="mt-1">
                {profil.passendeRollen.map((r, i) => (
                  <div key={r.titel} className={`py-4 ${i === 0 ? "" : LINIE}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[14.5px] font-black leading-tight">{r.titel}</p>
                      <p className={`shrink-0 text-[9.5px] font-black uppercase tracking-[0.16em] ${r.staerke === "stark" ? "" : "opacity-40"}`}>
                        {r.staerke === "stark" ? T.stark : T.gut}
                      </p>
                    </div>
                    <ul className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                      {r.gruende.map(g => (
                        <li key={g} className="flex items-start gap-1.5 text-[11.5px] font-bold opacity-75">
                          <Check className="mt-[2px] h-3.5 w-3.5 shrink-0" />{g}
                        </li>
                      ))}
                    </ul>
                    {r.href && (
                      <a href={r.href} target="_blank" rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-black uppercase tracking-[0.12em] opacity-55 transition hover:opacity-100">
                        {T.rolleAnsehen}<ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* DER ARBEITGEBER-ABSCHLUSS — jetzt der letzte Abschnitt DESSELBEN Blattes. Hier
              steht der einzige goldene Knopf der Seite (Skill `ci-design`: genau einer). */}
          <section id="kontakt" className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
          <h2 className="font-serif text-[22px] font-black leading-tight md:text-[26px]">{T.interessiert(vorname)}</h2>
          <p className="mt-2 text-[12.5px] font-bold leading-snug opacity-70">{T.interessiertText}</p>

          <div className="mt-5">
            <Knopf art="gold" karte href={`/contact?reason=general&about=${encodeURIComponent(profil.name)}`}>
              {T.interview}
            </Knopf>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Knopf art="umriss" karte href={`/contact?reason=general&about=${encodeURIComponent(profil.name)}`}>
              {T.nachricht}
            </Knopf>
            {profil.cvUrl && (
              <a href={profil.cvUrl} download
                className="lb-karte-absage flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-black">
                <FileText className="h-4 w-4" />{T.cvLaden}
              </a>
            )}
          </div>

          {/* DIE KONTAKTDATEN SIND DAS VERMITTLUNGSMODELL (Owner 20.08.2026, siehe
              `kontaktSichtbar` in lib/lebenslauf-store.ts): Ohne Freigabe steht hier ein Satz
              statt einer Nummer — die Firma bekommt die Person, nicht die Adresse. */}
          {profil.kontaktSichtbar && profil.kontakt ? (
            <div className={`mt-5 pt-4 ${LINIE}`}>
              <Abschnitt>{T.kontakt}</Abschnitt>
              <div className="mt-3 flex flex-col gap-2">
                {profil.kontakt.ort && (
                  <p className="flex items-center gap-2.5 text-[12.5px] font-bold opacity-80"><MapPin className="h-4 w-4 shrink-0" />{profil.kontakt.ort}</p>
                )}
                {profil.kontakt.telefon && (
                  <p className="flex items-center gap-2.5 text-[12.5px] font-bold opacity-80"><Phone className="h-4 w-4 shrink-0" />{profil.kontakt.telefon}</p>
                )}
                {profil.kontakt.email && (
                  <p className="flex items-center gap-2.5 text-[12.5px] font-bold opacity-80"><Mail className="h-4 w-4 shrink-0" />{profil.kontakt.email}</p>
                )}
                {profil.kontakt.profilLink && (
                  <p className="flex items-center gap-2.5 text-[12.5px] font-bold opacity-80"><Link2 className="h-4 w-4 shrink-0" />{profil.kontakt.profilLink}</p>
                )}
              </div>
            </div>
          ) : (
            <p className={`mt-5 pt-4 text-[11.5px] font-bold leading-snug opacity-50 ${LINIE}`}>{T.kontaktSpaeter}</p>
          )}
        </section>

          {/* DER PROFIL-CHAT — bewusst das Letzte und das Leiseste (Auftrag: „Do not make the
              chat dominate the profile. It is a supporting feature."). Ohne Beispiel-Fragen
              bleibt er ganz weg (Memory `chat-no-personal-questions-buttons-only`: nie leer).
              Auch er wohnt IM Blatt (Owner 24.08.2026) — `karte` schaltet den Kasten um. */}
          {profil.chatFragen.length > 0 && (
            <section className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <ProfilChatEinstieg karte className="mt-0" fragen={profil.chatFragen}
                einstieg={T.chatEinstieg(vorname)} hinweis={T.chatHinweis}
                beispieleLabel={T.chatBeispiele} zuLabel={T.chatZu} />
            </section>
          )}

          {/* DAS BESITZER-WERKZEUG — der Baustein bringt seine Abschnitts-Hülle SELBST mit:
              Ob überhaupt etwas erscheint, entscheidet er erst nach der Besitz-Prüfung im
              Browser — eine Hülle hier stünde für jeden Fremden als leerer Streifen im
              Blatt (gemessen 24.08.: 49 px + Haarlinie). */}
          {werkzeug}
        </article>
      </div>

      {/* NUR DAS GESETZLICHE MINIMUM (Owner 24.08.2026: „auf der Bewerbeseite müssen die
          Links unten raus, auch Instagram und Facebook") — Impressum/Datenschutz/AGB müssen
          in der EU erreichbar bleiben, alles andere (Contact, About, Social, ©) ist auf
          einer Seite an Personalabteilungen Werbung und fliegt. */}
      <SeitenFuss art="schlicht" className="md:max-w-[760px]" />
    </main>
  );
}
