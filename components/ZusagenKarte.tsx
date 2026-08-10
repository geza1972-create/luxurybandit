"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import { KARTE_TEXTE } from "@/components/EinladungKarte";

/**
 * DIE ZUSAGEN — eine zweite Karte unter der Einladung.
 *
 * Owner 31.07.2026: „ich brauche unter der Videokarte noch so eine Karte, wo es steht als
 * Beispiel: wer zugesagt hat."
 *
 * Bewusst ECHT gebaut und nicht als Attrappe fuer die Verkaufsseite. Eine Seite, die eine
 * Gaesteliste zeigt, die es nicht gibt, kostet beim ersten zahlenden Kunden mehr, als sie
 * einbringt — und genau dieser Kunde ist der, auf den es ankommt (die wirklich Verlobte,
 * Gruppe A aus dem Konzept). Auf der Verkaufsseite laeuft dieselbe Karte mit `demo`, dort
 * ohne Knoepfe.
 *
 * Vom Gast werden Vorname UND E-Mail erfragt (Owner 31.07.2026: „auch die Gaeste muessen ihre
 * E-Mail angeben, weil sie noch News zur Hochzeit bekommen koennen"). Das kehrt §8 des ersten
 * Konzepts um — dort stand „keine echten Personendaten der Gaeste bei uns" — und ist eine
 * bewusste Entscheidung: Ohne Adresse kann das Paar seine Gaeste nicht erreichen, wenn sich
 * Uhrzeit oder Ort aendert, und genau dafuer zahlt es.
 *
 * Deshalb steht der Grund AM Feld und nicht in den AGB. Kein Konto, kein Passwort, keine
 * Telefonnummer: zwei Zeilen und ein Knopf.
 *
 * Dass die Namen auch andere Gaeste sehen, ist Absicht: Bei einer Hochzeit gehoert „Maria
 * kommt auch" zur Freude dazu, und es bringt die naechsten dazu, ebenfalls zu antworten.
 * Mehr als der Vorname steht dort nicht.
 */

/**
 * MENÜWAHL BEI DER ZUSAGE (Owner 02.08.2026: „die Leute müssen bei der Bestätigung angeben ob
 * sie vegetarisch, vegan oder normal essen wollen"). Nur bei einer Zusage sinnvoll — wer absagt,
 * isst nicht mit; `menu` bleibt dann leer.
 */
export type Menu = "normal" | "vegetarisch" | "vegan";
export type Zusage = { name: string; ja: boolean; at?: string; email?: string; menu?: Menu; menus?: Menu[]; personen?: number };

/**
 * WANN DIE ANTWORT KAM — kurz, in der Sprache des Lesers.
 *
 * Kein volles ISO-Datum: „2026-08-04T14:32:11.402Z" ist eine Maschinenangabe. „4. Aug.,
 * 14:32" liest man im Vorbeigehen. Die Zeitzone ist die des Betrachters — er will wissen,
 * wann es bei IHM war, nicht auf unserem Server.
 */
const ORTE: Record<string, string> = {
  de: "de-DE", en: "en-GB", ro: "ro-RO", es: "es-ES", fr: "fr-FR", pt: "pt-PT", it: "it-IT",
};
function zeitpunkt(iso: string, sprache: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString(ORTE[sprache] ?? "en-GB",
      { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function ZusagenKarte({
  sprache, id, zusagen, demo, schlicht,
}: {
  sprache: string;
  /** Kennung der Einladung — ohne sie (Verkaufsseite) gibt es keine Knoepfe. */
  id?: string;
  zusagen: Zusage[];
  demo?: boolean;
  /**
   * NUR JA ODER NEIN (Owner 04.08.2026, für die Urlaubs-Einladung: „nur zusagen oder
   * absagen").
   *
   * Menüwahl und Gästezahl sind Hochzeitssachen: Sie beantworten Fragen, die man bei
   * fünfzig Gästen und einem Caterer hat. Eine Urlaubs-Einladung geht an EINEN Menschen —
   * dort sind es zwei Pflichtfragen, die niemand beantworten muss, direkt vor dem einzigen
   * Knopf, auf den es ankommt. Jede Frage vor einem Ja kostet Antworten.
   */
  schlicht?: boolean;
}) {
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  const [liste, setListe] = useState<Zusage[]>(zusagen);
  // Derselbe Fehler wie im Gruppenchat behoben (02.08.2026): `useState(zusagen)` liest den
  // Anfangswert nur einmal — ändert sich die Liste danach (z. B. Demo-Namen), bliebe `liste`
  // stehen, ohne dass es hier bislang aufgefallen ist.
  useEffect(() => { setListe(zusagen); }, [zusagen]);
  /**
   * IM DEMO STEHT EINE FESTE ADRESSE UND IST GESPERRT (Owner 10.08.2026: „bei email soll
   * gesperrt sein example@luxurybandit.com").
   *
   * Zwei Gründe, und beide sind gut: Der Besucher soll die Zusage bis zum Ende durchspielen
   * können, ohne seine echte Adresse in ein Formular zu tippen, das nichts speichert — und
   * WIR wollen sie an dieser Stelle gar nicht haben. Ein gesperrtes Feld sagt beides in einer
   * Sekunde: „das gehört dazu, aber hier zählt es nicht".
   */
  const DEMO_MAIL = "example@luxurybandit.com";
  const [name, setName] = useState("");
  const [mail, setMail] = useState(demo ? DEMO_MAIL : "");
  /**
   * EIN MENÜ JE PERSON (Owner 10.08.2026: „so jetzt haben wir ein problem, wenn wir 2
   * schreiben und nur einer ist vegetarier?" · „also zahl muss über Menü stehen").
   *
   * Vorher gab es EINE Menüwahl und daneben eine Anzahl — „2 Personen · vegetarisch" hiess
   * für die Küche zwangsläufig ZWEI vegetarische Essen. Wer zu zweit kommt und nur einer
   * isst vegetarisch, konnte es gar nicht sagen; er musste eins von beiden falsch wählen.
   * Und der Caterer bekommt die Zahl, nach der er kocht, falsch.
   *
   * Deshalb steht die ZAHL jetzt oben: Erst sagt er, wie viele kommen, dann erscheint für
   * jeden eine eigene Menüzeile. Bei einer Person ist es genau wie vorher — eine Zeile, ein
   * Tipp; die zweite Zeile taucht erst auf, wenn sie gebraucht wird.
   */
  const [menus, setMenus] = useState<Menu[]>(["normal"]);
  const menu = menus[0];
  // Gästezahl hinter DIESER Zusage (Ä10, Owner 02.08.2026: „die Gästezahl muss noch klar
  // stehen"). Vorgabe 1 wie beim Menü — nie leer, klicken statt tippen.
  const [personen, setPersonenRoh] = useState(1);
  /* Die Zahl fuehrt: Wer sie aendert, bekommt genau so viele Menuezeilen — bestehende Wahlen
     bleiben stehen, neue starten auf „Normal". */
  const setPersonen = (n: number) => {
    setPersonenRoh(n);
    setMenus(alt => Array.from({ length: n }, (_, i) => alt[i] ?? "normal"));
  };
  const [busy, setBusy] = useState(false);
  const [fertig, setFertig] = useState(false);

  // Kopfzahl zaehlt PERSONEN, nicht Zusagen — „Maria & Radu" sind zwei Gaeste.
  const gaeste = liste.filter(z => z.ja).reduce((s, z) => s + (z.personen ?? 1), 0);
  const nein = liste.filter(z => !z.ja).length;

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

  const antworten = async (kommt: boolean) => {
    const n = name.trim();
    if (!n || !mailOk || busy) return;
    if (!demo && !id) return;
    /**
     * IM DEMO WIRD GETIPPT, ABER NICHTS GESPEICHERT (Owner 10.08.2026: „wenn man etwas auch
     * da rein schreiben könnte, aber ohne zu speichern. Wie es halt im echten halt ist.
     * Damit die Leute das gleich testen").
     *
     * Vorher stand die Karte auf der Verkaufsseite nur zum ANSEHEN da — ein Bild von einem
     * Formular. Wer wissen will, wie sich das Zusagen anfühlt, muss es TUN dürfen: Name
     * eintippen, Menü wählen, auf „Ich komme" tippen, den eigenen Namen in der Liste
     * auftauchen sehen. Genau das verkauft die Seite, und es kostet uns nichts.
     *
     * Der Aufruf an den Server entfällt komplett — keine fremde Zusage in einer echten
     * Einladung, keine Adresse in unserer Ablage, kein Datensatz, den nachher jemand löschen
     * muss. Es lebt nur im Bildschirm dieses Besuchers und ist beim Neuladen weg.
     */
    if (demo) {
      /**
       * IM MUSTER BLEIBT DAS FORMULAR STEHEN (Owner 10.08.2026: „nein nicht Danke — wir
       * freuen uns! er soll weitere eintragen können").
       *
       * Auf der ECHTEN Einladung ist „Danke" richtig: Ein Gast antwortet einmal, und der
       * Satz schliesst die Sache ab. Hier probiert jemand aus — der will eine zweite Zusage
       * eintragen, mit zwei Personen und anderem Menü, um zu sehen, wie die Liste waechst.
       * Ein Dank, der das Formular wegnimmt, beendet genau das Ausprobieren, das diese
       * Karte verkaufen soll.
       */
      setListe(l => [...l, { name: n, ja: kommt, ...(kommt && !schlicht ? { menu, menus, personen } : {}) }]);
      setName(""); setPersonen(1);
      return;
    }
    setBusy(true);
    // Das Menü zaehlt nur bei einer Zusage — wer absagt, isst nicht mit.
    const r = await fetch("/api/einladung", {
      method: "POST", headers: { "Content-Type": "application/json" },
      /* `menus` ist die neue, genaue Angabe (eine Wahl je Person); `menu` reist als ERSTE
         Wahl weiter mit, damit alles, was die alte Form liest (Mails, Auswertungen, aeltere
         Ansichten), nicht ins Leere greift. */
      body: JSON.stringify({ rsvp: id, name: n, ja: kommt, email: mail.trim(), menu: kommt && !schlicht ? menu : undefined, menus: kommt && !schlicht ? menus : undefined, personen: kommt && !schlicht ? personen : undefined }),
    }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return;
    // Sofort anzeigen, statt die Seite neu zu laden — die Antwort soll sich anfuehlen wie
    // ein Haendedruck, nicht wie ein Formular.
    setListe(l => [...l, { name: n, ja: kommt, ...(kommt && !schlicht ? { menu, menus, personen } : {}) }]);
    setName(""); setMail(""); setPersonen(1);
    setFertig(true);
  };

  return (
    <div className="lb-karte relative mt-4 overflow-hidden rounded-[20px] px-5 pb-6 pt-7 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <CornerOrnaments />
      <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />

      <div className="relative">
        {/* „Wer kommt · 3 Gäste kommen" zählt eine Gästeliste. Beim Urlaub antwortet EINE
            Person, und dann ist die Zahl keine Auskunft, sondern ein Missverständnis. */}
        <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.28em]">
          {schlicht ? T.zusTitelUrlaub : T.zusTitel}
        </p>
        <p className="mt-1.5 text-center font-serif text-[17px] font-bold">
          {schlicht ? T.zusGaesteUrlaub(gaeste, nein) : T.zusGaeste(gaeste, nein)}
        </p>
        <DividerOrnament className="mt-2.5" />

        {liste.length === 0 ? (
          <p className="mt-3 text-center font-serif text-[14px] opacity-70">{T.zusLeer}</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {liste.map((z, i) => (
              <li key={i} className="flex items-center gap-2 font-serif text-[15px]">
                {z.ja
                  ? <Check className="lb-karte-ja h-4 w-4 shrink-0" />
                  : <X className="lb-karte-nein h-4 w-4 shrink-0" />}
                <span className={z.ja ? "" : "opacity-55 line-through"}>{z.name}</span>
                {/* WANN GEANTWORTET WURDE (Owner 04.08.2026: „Datum Uhrzeit der Bestätigung").
                    `at` wird seit jeher gespeichert und war nie zu sehen. Bei einer Hochzeit
                    mit achtzig Zusagen ist das Rauschen; bei EINER Antwort ist es die halbe
                    Nachricht — „sie hat vor zehn Minuten zugesagt" ist etwas anderes als
                    „irgendwann". Deshalb steht es hinten und klein, nicht als eigene Zeile. */}
                {z.at && (
                  <span className="ml-auto shrink-0 font-serif text-[11.5px] opacity-55">
                    {zeitpunkt(z.at, sprache)}
                  </span>
                )}
                {/* NUR WENN ES VOM NORMALEN ABWEICHT — „normal" ist der Regelfall, ein Etikett
                    dafür wäre Rauschen. Vegetarisch/vegan ist genau die Information, für die
                    das Paar beim Caterer nachfragen muss. */}
                {z.ja && (() => {
                  /**
                   * WAS DIE KUECHE BRAUCHT, STEHT AM EINTRAG (Owner 10.08.2026).
                   *
                   * Frueher stand hier nur EINE Marke, und „normal" wurde weggelassen — bei
                   * zwei Personen mit verschiedenem Essen war die Zeile schlicht falsch.
                   * Jetzt wird gezaehlt: „1 vegetarisch" bzw. „1 normal · 1 vegan".
                   *
                   * ALTE ZUSAGEN LESEN SICH WEITER: Fehlt `menus`, wird aus `menu` und
                   * `personen` dieselbe Liste gebildet (2 Personen, vegetarisch = zweimal
                   * vegetarisch) — so wie es damals gemeint war.
                   */
                  const liste = z.menus?.length ? z.menus : Array.from({ length: z.personen ?? 1 }, () => z.menu ?? "normal");
                  const zaehl = liste.reduce((m, w) => ({ ...m, [w]: (m[w] ?? 0) + 1 }), {} as Record<string, number>);
                  const wort: Record<string, string> = { normal: T.zusMenuNormal, vegetarisch: T.zusMenuVeg, vegan: T.zusMenuVegan };
                  /* Eine Person, die normal isst, braucht keine Zeile — das ist der Regelfall. */
                  if (liste.length === 1 && liste[0] === "normal") return null;
                  return (
                    <span className="ml-2 font-serif text-[11px] uppercase tracking-wide opacity-60">
                      {Object.entries(zaehl).map(([w, n]) => `${n} ${wort[w] ?? w}`).join(" · ")}
                    </span>
                  );
                })()}
              </li>
            ))}
          </ul>
        )}

        {/* Auf der Verkaufsseite darf man es AUSPROBIEREN — getippt wird, gespeichert nicht
            (siehe `antworten`). */}
        {(id || demo) && (
          fertig ? (
            <p className="mt-4 text-center font-serif text-[15px] font-bold">{T.zusDanke}</p>
          ) : (
            <div className="mt-4">
              <DividerOrnament />
              <input value={name} onChange={e => setName(e.target.value)} placeholder={T.zusName}
                maxLength={40} autoComplete="given-name"
                className="lb-karte-feld mt-3 h-11 w-full rounded-lg px-3 text-center font-serif text-[15px] outline-none" />
              {/* DIE ADRESSE DES GASTES (Owner 31.07.2026). Der Satz darunter ist Pflicht und
                  keine Zierde: Wer eine Adresse verlangt, muss an derselben Stelle sagen,
                  wofür — und hier ist die Antwort ehrlich, weil sie dem Gast selbst nützt. */}
              <input value={mail} onChange={e => { if (!demo) setMail(e.target.value); }} placeholder={T.zusMail}
                type="email" inputMode="email" maxLength={160} autoComplete="email"
                readOnly={demo} aria-readonly={demo || undefined} tabIndex={demo ? -1 : undefined}
                className={`lb-karte-feld mt-2 h-11 w-full rounded-lg px-3 text-center font-serif text-[15px] outline-none${demo ? " cursor-not-allowed opacity-60" : ""}`} />
              {/* Der Grund steht am Feld, und der Weg zum Nachlesen daneben — ein Gast, der
                  seine Adresse hergibt, soll nicht erst eine Fusszeile suchen muessen. */}
              <p className="mt-1.5 text-center font-serif text-[11.5px] leading-snug opacity-70">
                {T.zusMailWarum}{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" className="underline">
                  {T.zusDatenschutz}
                </a>
              </p>
              {/* DAS MENÜ GEHÖRT ZUR ZUSAGE (Owner 02.08.2026: „die Leute müssen bei der
                  Bestätigung angeben ob sie vegetarisch, vegan oder normal essen wollen").
                  „Normal" steht vor, weil das die meisten essen — niemand soll extra tippen
                  müssen, nur weil er nichts Besonderes braucht. Zählt nur bei „Ja"; wer absagt,
                  sieht die Wahl trotzdem (einfacher als sie ein- und auszublenden), sie wird
                  beim Absenden nur nicht mitgeschickt. */}
              {/* Menü und Gästezahl nur bei der Hochzeit — siehe `schlicht` oben. */}
              {!schlicht && (<>
                {/* ZUERST DIE ZAHL (Owner 10.08.2026: „also zahl muss über Menü stehen").
                    Sie fuehrt: Wie viele kommen, entscheidet, wie viele Menuezeilen es gibt.
                    Umgekehrt — Menue zuerst — kann man die zweite Person nicht mehr
                    unterbringen, ohne die erste zu ueberschreiben. */}
                <p className="mt-2.5 text-center font-serif text-[11px] font-bold uppercase tracking-wide opacity-70">
                  {T.zusWieViele}
                </p>
                <div className="mt-1.5 grid grid-cols-6 gap-1 rounded-full p-1" style={{ background: "rgba(26,22,15,0.07)" }}>
                  {([1, 2, 3, 4, 5, 6] as const).map(n => (
                    <button key={n} type="button" onClick={() => setPersonen(n)}
                      className={`${personen === n ? "lb-karte-cta" : ""} h-9 rounded-full text-[13px] font-black transition active:scale-95`}>
                      {n}
                    </button>
                  ))}
                </div>

                {/* DANN DAS MENUE — je Person eine Zeile. Bei einer Person steht keine
                    Nummer davor: „Person 1" waere dort eine Frage ohne zweite Antwort. */}
                <p className="mt-2.5 text-center font-serif text-[11px] font-bold uppercase tracking-wide opacity-70">
                  {T.zusMenuFrage}
                </p>
                {menus.map((m, i) => (
                  <div key={i} className="mt-1.5 flex items-center gap-2">
                    {personen > 1 && (
                      <span className="w-5 shrink-0 text-center font-serif text-[12px] font-bold opacity-60">{i + 1}</span>
                    )}
                    <div className="grid flex-1 grid-cols-3 gap-1 rounded-full p-1" style={{ background: "rgba(26,22,15,0.07)" }}>
                      {([["normal", T.zusMenuNormal], ["vegetarisch", T.zusMenuVeg], ["vegan", T.zusMenuVegan]] as const).map(([w, label]) => (
                        <button key={w} type="button"
                          onClick={() => setMenus(a => a.map((x, k) => (k === i ? w : x)))}
                          className={`${m === w ? "lb-karte-cta" : ""} h-9 rounded-full px-1 text-[11.5px] font-black leading-tight transition active:scale-95`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>)}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void antworten(true)} disabled={!name.trim() || !mailOk || busy}
                  className="lb-karte-cta flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-black transition active:scale-95 disabled:opacity-45">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {T.zusJa}
                </button>
                <button type="button" onClick={() => void antworten(false)} disabled={!name.trim() || !mailOk || busy}
                  className="lb-karte-absage flex h-11 items-center justify-center rounded-full px-2 text-[12px] font-black leading-tight transition active:scale-95 disabled:opacity-45">
                  {T.zusNein}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
