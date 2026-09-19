"use client";

import { useEffect, useState } from "react";
import { Check, X, Send, Wand2 } from "lucide-react";

type Befund = { umgebung: number; schief: boolean; unscharf: boolean; spiegelung: boolean };
type Werk = { mandant: string; nr: string; name: string; mail: string; befund?: Befund; neu?: boolean; zeit?: string };
type Wahl = "frei" | "abgelehnt" | undefined;

/**
 * ── DIE GRÜNDE (Owner 18.09.2026: „ein Freigabesystem mit Feedback" · „muss aber profi sein") ─
 *
 * Es sind SCHLÜSSEL, keine Sätze: Der Browser schickt `grundSchief`, und erst die Mail macht
 * daraus einen Satz — in der Sprache des Künstlers. Käme der Text aus dem Browser, stünde in
 * einer rumänischen Mail Deutsch, und jede Formulierung wäre ungeprüft unterwegs.
 *
 * Alle bis auf den letzten beschreiben das FOTO, nicht das Werk. „Passt nicht zu unserem
 * Portal" ist der einzige, der über die Auswahl spricht — und er steht bewusst am Ende und
 * allein, weil er der einzige ist, gegen den der Künstler nichts tun kann.
 */
/* Die Chips stehen auf Rumänisch (Owner 18.09.2026: „mach die Chips auf Rumänisch") — dieselbe
   Sprache, in der der Künstler sie gleich in seiner Mail liest. Wer beim Klicken schon den Satz
   vor Augen hat, der beim Empfänger ankommt, klickt anders. */
const GRUENDE: { schluessel: string; kurz: string }[] = [
  { schluessel: "grundSchief", kurz: "Fotografiat strâmb" },
  { schluessel: "grundUmgebung", kurz: "Prea multă cameră" },
  { schluessel: "grundUnscharf", kurz: "Neclar / prea întunecat" },
  { schluessel: "grundSpiegelung", kurz: "Reflexii / blitz" },
  { schluessel: "grundRahmen", kurz: "Ramă / mâini / mobilă" },
  { schluessel: "grundPasst", kurz: "Nu se potrivește" },
];

/**
 * ── AUS DEM BEFUND WERDEN CHIPS (Owner 18.09.2026) ───────────────────────────────────────────
 *
 * Die Grenze bei 12 % Umgebung ist eine ENTSCHEIDUNG, keine Messung: Ein schmaler Rand
 * Leinwandkante ist normal und stört kein Poster; ein Achtel des Bildes voll Wand ist ein
 * Raumfoto. Wer sie anders will, ändert diese eine Zahl.
 */
const ausBefund = (b?: Befund): string[] => !b ? [] : [
  ...(b.umgebung > 0.12 ? ["grundUmgebung"] : []),
  ...(b.schief ? ["grundSchief"] : []),
  ...(b.unscharf ? ["grundUnscharf"] : []),
  ...(b.spiegelung ? ["grundSpiegelung"] : []),
];

/**
 * ── SELEKTIEREN, MARKIEREN, EINMAL SENDEN (Owner 18.09.2026) ─────────────────────────────────
 *
 * ── WARUM NICHTS VORAUSGEWÄHLT IST ──────────────────────────────────────────────────────────
 *
 * Kein Bild trägt von sich aus ein Ja oder ein Nein. Stünde überall „Freigeben" vorgewählt,
 * wäre ein versehentliches Senden eine Freigabe für alles — und der Sinn der ganzen Sache war,
 * dass nichts ohne Hinsehen durchgeht. Werke ohne Wahl bleiben liegen und stehen beim nächsten
 * Mal wieder da.
 *
 * ── DIE MAIL GEHT ERST BEIM SENDEN RAUS, UND EINE JE KÜNSTLER ───────────────────────────────
 *
 * Deshalb wird nicht bei jedem Klick geschickt. Der Knopf sagt vorher, wie viele Künstler eine
 * Nachricht bekommen — wer das liest, drückt nicht aus Versehen.
 *
 * ── NACH DEM SENDEN WIRD NEU GELADEN ────────────────────────────────────────────────────────
 *
 * Nicht aus Bequemlichkeit: Was freigegeben wurde, liegt nicht mehr in der Prüfablage. Eine
 * Liste, die das nicht nachzieht, zeigt Bilder, die es dort nicht mehr gibt — und ein zweiter
 * Klick darauf wäre eine Entscheidung ins Leere.
 */
export default function FreigabeClient({ schluessel }: { schluessel: string }) {
  const [werke, setWerke] = useState<Werk[] | null>(null);
  /* Die Künstler ohne Adresse — eigene Liste, eigener Zweck: löschen statt entscheiden. */
  const [ohneMail, setOhneMail] = useState<{ mandant: string; name: string; bilder: number }[]>([]);
  const [werkeOhne, setWerkeOhne] = useState<Werk[]>([]);
  /**
   * ── ZWEI REITER (Owner 18.09.2026: „mach mir ein Tab für die Bilder ohne E-Mail" · „ich lösche
   * sie sofort vom Server, aber ich will sie sehen") ───────────────────────────────────────────
   *
   * Der zweite Reiter zeigt DIESELBEN Kacheln wie der erste — nur ohne Freigeben und Ablehnen,
   * dafür mit dem Löschknopf am Künstler. Löschen, ohne vorher gesehen zu haben, was man löscht,
   * ist keine Entscheidung, sondern ein Risiko: Unter den Konten ohne Adresse kann eines sein,
   * das Werke trägt, die man behalten will.
   */
  const [reiter, setReiter] = useState<"freigabe" | "ohne" | "kaeufe">("freigabe");
  /**
   * ── DIE KÄUFE (Owner 19.09.2026: „ich muss hier die Käufe sehen, mit Poster, die generiert
   * worden sind") ────────────────────────────────────────────────────────────────────────────
   *
   * Jedes erzeugte Blatt ist ein bezahlter Lauf — den Merker `stil` setzt nur die Kasse dahinter.
   * Die Liste ist damit die Verkaufsliste, und sie zeigt die Zeilen, die der Käufer getippt hat:
   * Daran sieht man, ob das Fenster benutzt wird oder ob Leute weiter mit „Numele tău" kaufen.
   */
  const [kaeufe, setKaeufe] = useState<{ id: string; mandant: string; werk: string; titel: string; satz: string; am: string }[] | null>(null);
  /* Erster Tipp färbt rot, zweiter löscht ([[loeschen-zwei-tipps-rot]]). */
  const [loeschBereit, setLoeschBereit] = useState<string | null>(null);
  const [wahl, setWahl] = useState<Record<string, Wahl>>({});
  const [gruende, setGruende] = useState<Record<string, string[]>>({});
  const [notiz, setNotiz] = useState<Record<string, string>>({});
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState("");

  const schluss = (w: Werk) => `${w.mandant}/${w.nr}`;

  async function laden() {
    setWerke(null);
    try {
      const r = await fetch(`/api/freigabe?s=${encodeURIComponent(schluessel)}`);
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; werke?: Werk[]; ohneMail?: { mandant: string; name: string; bilder: number }[]; werkeOhneMail?: Werk[] };
      setWerke(d.ok ? (d.werke ?? []) : []);
      setOhneMail(d.ok ? (d.ohneMail ?? []) : []);
      setWerkeOhne(d.ok ? (d.werkeOhneMail ?? []) : []);
      setWahl({});
    } catch { setWerke([]); }
  }
  useEffect(() => { void laden(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* Erst beim Öffnen des Reiters: Die Liste liest je Kauf einen Zettel aus der Ablage — das
     gehört nicht in den ersten Aufbau der Seite, den der Owner zum Freigeben braucht. */
  useEffect(() => {
    if (reiter !== "kaeufe" || kaeufe !== null) return;
    void (async () => {
      try {
        const r = await fetch(`/api/freigabe?s=${encodeURIComponent(schluessel)}&was=kaeufe`);
        const d = (await r.json().catch(() => ({}))) as { ok?: boolean; kaeufe?: typeof kaeufe };
        setKaeufe(d.ok ? (d.kaeufe ?? []) : []);
      } catch { setKaeufe([]); }
    })();
  }, [reiter, kaeufe, schluessel]);

  const gewaehlt = Object.values(wahl).filter(Boolean).length;
  /**
   * ── KEINE ABSAGE OHNE GRUND (Owner 18.09.2026: „hier steht nicht, was bemängelt wurde") ─────
   *
   * Ablehnen ohne einen angeklickten Grund schickte eine Mail, in der unter dem Bild nichts
   * stand — der Künstler sah sein Werk, „Nr. 0" und eine leere Zeile. Damit kann er nichts
   * anfangen, und wir wirken wie eine Maschine, die ohne Begründung aussortiert.
   *
   * Der Senden-Knopf bleibt deshalb gesperrt, solange ein abgelehntes Werk weder einen Grund
   * noch einen eigenen Satz trägt. Das ist die einzige Stelle im ganzen Werkzeug, an der etwas
   * PFLICHT ist — und sie ist es zu Recht: Feedback ohne Inhalt ist kein Feedback.
   */
  const ohneGrund = (werke ?? []).filter(w => wahl[schluss(w)] === "abgelehnt"
    && !(gruende[schluss(w)] ?? []).length && !(notiz[schluss(w)] ?? "").trim());
  const abgelehnt = Object.entries(wahl).filter(([, v]) => v === "abgelehnt");
  const kuenstlerMitAbsage = new Set(abgelehnt.map(([s]) => s.split("/")[0])).size;

  /**
   * Alle wartenden Bilder einmal ansehen lassen. Kostet je Bild rund einen Cent und passiert
   * genau einmal — wo schon ein Befund liegt, wird nicht noch einmal gefragt.
   */
  async function vorsortieren() {
    if (!werke || laeuft) return;
    setLaeuft(true); setMeldung("Wird angesehen…");
    try {
      const r = await fetch("/api/freigabe-befund", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s: schluessel, werke: werke.map(w => ({ mandant: w.mandant, nr: w.nr })) }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; neu?: number; schon?: number };
      setMeldung(d.ok ? `${d.neu ?? 0} angesehen, ${d.schon ?? 0} lagen schon vor.` : "Das hat nicht geklappt.");
      await laden();
    } catch { setMeldung("Das hat nicht geklappt."); }
    finally { setLaeuft(false); }
  }

  async function loeschen(mandant: string) {
    if (loeschBereit !== mandant) {
      setLoeschBereit(mandant);
      /* Nach drei Sekunden zurück — ein rot stehen gebliebener Knopf ist eine Falle. */
      setTimeout(() => setLoeschBereit(v => (v === mandant ? null : v)), 3000);
      return;
    }
    setLoeschBereit(null);
    try {
      const r = await fetch("/api/freigabe", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s: schluessel, mandant }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean };
      setMeldung(d.ok ? `${mandant} gelöscht.` : `${mandant} liess sich nicht löschen.`);
      await laden();
    } catch { setMeldung("Das hat nicht geklappt."); }
  }

  async function senden() {
    if (!werke || !gewaehlt || laeuft) return;
    setLaeuft(true); setMeldung("");
    try {
      const entscheidungen = werke
        .filter(w => wahl[schluss(w)])
        .map(w => ({
          mandant: w.mandant, nr: w.nr,
          aktion: wahl[schluss(w)] as "frei" | "abgelehnt",
          gruende: gruende[schluss(w)] ?? [],
          notiz: (notiz[schluss(w)] ?? "").trim(),
        }));
      const r = await fetch("/api/freigabe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s: schluessel, entscheidungen }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; frei?: number; abgelehnt?: number; mails?: number; belegt?: string[] };
      if (!d.ok) { setMeldung("Das hat nicht geklappt."); return; }
      /* Der Beleg steht daneben: Werk, Gründe, Bild ja/nein — so wie es in der Mail gelandet ist. */
      setMeldung(`${d.frei ?? 0} freigegeben, ${d.abgelehnt ?? 0} abgelehnt, ${d.mails ?? 0} Mail(s) verschickt.`
        + (d.belegt?.length ? ` — ${d.belegt.join(" | ")}` : ""));
      setGruende({}); setNotiz({});
      await laden();
    } catch { setMeldung("Das hat nicht geklappt."); }
    finally { setLaeuft(false); }
  }

  if (werke === null) return <p className="mt-10 text-[16px] text-[#666]">Wird geladen…</p>;
  /* Auch wenn nichts mehr zu entscheiden ist: Die Extraliste darf nicht mit verschwinden. */
  const nichtsMehr = !werke.length;

  /* Nach Künstler gruppiert — die Entscheidung fällt fast immer über einen Künstler, nicht über
     ein einzelnes Bild. */
  /* Die Reihenfolge kommt vom Server (neueste zuerst) — `reduce` behält sie, und weil der
     erste Treffer eines Künstlers seine Gruppe anlegt, stehen auch die Künstler nach ihrem
     jüngsten Bild. */
  const nachKuenstler = werke.reduce<Record<string, Werk[]>>((a, w) => {
    (a[w.mandant] ??= []).push(w);
    return a;
  }, {});

  const knopf = (w: Werk, art: "frei" | "abgelehnt") => {
    const aktiv = wahl[schluss(w)] === art;
    const farbe = art === "frei"
      ? (aktiv ? "border-[#1d6fd0] bg-[#1d6fd0] text-white" : "border-[#dfe4e9] text-[#555] hover:border-[#1d6fd0]")
      : (aktiv ? "border-[#b3261e] bg-[#b3261e] text-white" : "border-[#dfe4e9] text-[#555] hover:border-[#b3261e]");
    return (
      <button type="button" aria-pressed={aktiv}
        onClick={() => {
          setWahl(v => ({ ...v, [schluss(w)]: v[schluss(w)] === art ? undefined : art }));
          /* Beim Ablehnen die Gründe aus dem Befund vorhaken — abwählen kann er sie alle. */
          if (art === "abgelehnt") setGruende(v => (v[schluss(w)]?.length ? v : { ...v, [schluss(w)]: ausBefund(w.befund) }));
        }}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[12.5px] font-semibold transition ${farbe}`}>
        {art === "frei" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
        {art === "frei" ? "Freigeben" : "Ablehnen"}
      </button>
    );
  };

  const kachelBild = (w: Werk) => (
    <span className="relative block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/freigabe?s=${encodeURIComponent(schluessel)}&m=${encodeURIComponent(w.mandant)}&nr=${encodeURIComponent(w.nr)}`}
        alt="" className="block w-full bg-[#f5f5f5] object-contain" style={{ maxHeight: 220 }} />
      {/* „NEU" oben rechts, damit es nicht mit dem Befund links kollidiert. */}
      {w.neu ? (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-[#111] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow">
          nou
        </span>
      ) : null}
      {ausBefund(w.befund).length ? (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-[#b3261e] px-2 py-0.5 text-[11px] font-bold text-white shadow">
          {w.befund && w.befund.umgebung > 0.12 ? `${Math.round(w.befund.umgebung * 100)} % cameră` : "verificat"}
        </span>
      ) : null}
    </span>
  );

  const reiterKnopf = (art: "freigabe" | "ohne" | "kaeufe", text: string, zahl: number) => (
    <button type="button" onClick={() => setReiter(art)}
      className={`border-b-2 pb-2 text-[16px] font-semibold transition ${
        reiter === art ? "border-[#111] text-[#111]" : "border-transparent text-[#888] hover:text-[#111]"}`}>
      {text} <span className="tabular-nums text-[#888]">{zahl}</span>
    </button>
  );

  return (
    <>
      <nav className="mt-8 flex gap-6 border-b border-[#e5e5e5]">
        {reiterKnopf("freigabe", "Freigabe", werke.length)}
        {reiterKnopf("ohne", "Ohne E-Mail", werkeOhne.length)}
        {reiterKnopf("kaeufe", "Käufe", kaeufe?.length ?? 0)}
      </nav>

      {reiter === "kaeufe" ? (
        kaeufe === null ? <p className="mt-8 text-[15px] text-[#777]">…</p>
        : kaeufe.length === 0 ? <p className="mt-8 text-[15px] text-[#777]">Noch kein Blatt gekauft.</p>
        : (
          <ul className="mt-6 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {kaeufe.map(k => (
              <li key={k.id} className="border border-[#e5e5e5] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/freigabe?s=${encodeURIComponent(schluessel)}&kauf=${encodeURIComponent(k.id)}`}
                  alt="" loading="lazy" className="block max-h-[280px] w-full bg-[#f5f5f5] object-contain" />
                <p className="m-0 mt-2 font-serif text-[18px] leading-tight text-[#111]">{k.titel || "—"}</p>
                <p className="m-0 mt-1 text-[14px] leading-[1.4] text-[#555]">{k.satz || "—"}</p>
                <p className="m-0 mt-2 text-[13.5px] text-[#777]">
                  {k.mandant} · {k.werk} · {k.am ? new Date(k.am).toLocaleString("de-DE") : ""}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : reiter === "ohne" ? (
        <>
          <p className="mt-6 max-w-[62ch] text-[15px] leading-[1.55] text-[#666]">
            Diese Konten haben keine Adresse — sie bekommen keine Nachricht, also entscheidest du
            über sie nicht, du räumst sie weg. Sieh sie dir erst an: Löschen nimmt alles mit —
            Datensatz, Werke, Profilbild, wartende Bilder. Das geht nicht zurück.
          </p>
          {!werkeOhne.length ? <p className="mt-8 text-[16px] text-[#666]">Hier ist nichts.</p> : null}
          {ohneMail.map(k => (
            <section key={k.mandant} className="mt-10 border-t border-[#e5e5e5] pt-8 first:mt-6 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="m-0 font-serif text-[26px] font-normal text-[#111]">{k.name}</h2>
                  <p className="mt-1 text-[14px] text-[#666]">{k.mandant} · {k.bilder} Bild(er) · keine E-Mail</p>
                </div>
                {/* Zwei Tipps, rot — und der zweite räumt alles weg. */}
                <button type="button" onClick={() => void loeschen(k.mandant)}
                  className={`rounded-full border px-5 py-2.5 text-[14px] font-semibold transition ${
                    loeschBereit === k.mandant
                      ? "border-[#b3261e] bg-[#b3261e] text-white"
                      : "border-[#dfe4e9] text-[#555] hover:border-[#b3261e] hover:text-[#b3261e]"}`}>
                  {loeschBereit === k.mandant ? "Wirklich alles löschen" : "Künstler löschen"}
                </button>
              </div>
              <ul className="mt-5 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                {werkeOhne.filter(w => w.mandant === k.mandant).map(w => (
                  <li key={schluss(w)}>{kachelBild(w)}</li>
                ))}
              </ul>
            </section>
          ))}
          {meldung ? <p className="mt-8 text-[15px] font-semibold text-[#111]">{meldung}</p> : null}
        </>
      ) : (
        <>
      {nichtsMehr ? <p className="mt-10 text-[16px] text-[#666]">Es wartet gerade nichts auf Freigabe.</p> : null}
      {Object.entries(nachKuenstler).map(([mandant, liste]) => (
        <section key={mandant} className="mt-10 border-t border-[#e5e5e5] pt-8 first:mt-6 first:border-0 first:pt-0">
          <h2 className="m-0 font-serif text-[26px] font-normal text-[#111]">{liste[0].name}</h2>
          {/* Die Adresse steht sichtbar dabei — an sie geht die Absage. Fehlt sie, ist das eine
              Warnung und keine Kleinigkeit: Dieser Künstler erfährt von einer Ablehnung nichts. */}
          <p className="mt-1 text-[14px] text-[#666]">
            {liste[0].mail
              ? <a href={`mailto:${liste[0].mail}`} className="text-[#1d6fd0] no-underline">{liste[0].mail}</a>
              : <span className="font-semibold text-[#b3261e]">keine E-Mail hinterlegt — eine Absage erreicht ihn nicht</span>}
            {" · "}{liste.length} Bild(er) warten
            {liste.some(x => x.neu) ? <span className="ml-2 rounded-full bg-[#111] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">nou</span> : null}
          </p>
          <ul className="mt-5 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {liste.map(w => (
              <li key={schluss(w)}>
                {kachelBild(w)}
                <div className="mt-3 flex flex-wrap gap-2">
                  {knopf(w, "frei")}
                  {knopf(w, "abgelehnt")}
                </div>

                {/* ── DIE GRÜNDE ERSCHEINEN ERST BEIM ABLEHNEN ────────────────────────────────
                    Ständig sichtbar wären es sechs Chips an jedem der 123 Bilder — eine Wand.
                    Sie gehören zu der einen Entscheidung, die eine Begründung braucht. */}
                {wahl[schluss(w)] === "abgelehnt" ? (
                  <div className="mt-2 rounded-[10px] border border-[#f0d6d4] bg-[#fdf6f5] p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {GRUENDE.map(g => {
                        const an = (gruende[schluss(w)] ?? []).includes(g.schluessel);
                        return (
                          <button key={g.schluessel} type="button" aria-pressed={an}
                            onClick={() => setGruende(v => {
                              const jetzt = v[schluss(w)] ?? [];
                              return { ...v, [schluss(w)]: an ? jetzt.filter(x => x !== g.schluessel) : [...jetzt, g.schluessel] };
                            })}
                            className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
                              an ? "border-[#b3261e] bg-[#b3261e] text-white" : "border-[#e3d2d0] bg-white text-[#7a5a57] hover:border-[#b3261e]"}`}>
                            {g.kurz}
                          </button>
                        );
                      })}
                    </div>
                    {/* Ein eigener Satz, wenn die sechs Gründe es nicht treffen. Er steht in der
                        Mail hinter den angeklickten Gründen — in deinen Worten, unübersetzt. */}
                    <input type="text" value={notiz[schluss(w)] ?? ""} maxLength={300}
                      onChange={e => setNotiz(v => ({ ...v, [schluss(w)]: e.target.value }))}
                      placeholder="Eigener Satz (optional)"
                      className="mt-2 w-full rounded-lg border border-[#e3d2d0] bg-white px-3 py-2 text-[14px] text-[#111] outline-none placeholder:text-[#a89a98] focus:border-[#b3261e]" />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Der Knopf klebt unten: Bei dreissig Bildern wäre er sonst nur nach dem Scrollen da. */}
      <div className="sticky bottom-0 mt-12 flex flex-wrap items-center gap-4 border-t border-[#e5e5e5] bg-white/95 py-4 backdrop-blur">
        <button type="button" disabled={!gewaehlt || laeuft || !!ohneGrund.length} onClick={() => void senden()}
          className="inline-flex items-center gap-2 rounded-full bg-[#111] px-7 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#333] disabled:opacity-40">
          <Send className="h-[18px] w-[18px]" aria-hidden />
          {laeuft ? "Wird gesendet…" : "Senden"}
        </button>
        <button type="button" disabled={laeuft} onClick={() => void vorsortieren()}
          className="inline-flex items-center gap-2 rounded-full border border-[#dfe4e9] px-5 py-3 text-[14px] font-semibold text-[#555] transition hover:border-[#1d6fd0] hover:text-[#1d6fd0] disabled:opacity-40">
          <Wand2 className="h-4 w-4" aria-hidden />
          Vorsortieren
        </button>
        <span className="text-[14px] text-[#555]">
          {gewaehlt} von {werke.length} entschieden
          {kuenstlerMitAbsage ? ` · ${kuenstlerMitAbsage} Künstler bekommen eine Absage-Mail` : ""}
        </span>
        {ohneGrund.length ? (
          <span className="text-[14px] font-bold text-[#b3261e]">
            {ohneGrund.length} abgelehnte(s) Bild ohne Grund — bitte anhaken, sonst steht in der Mail nichts.
          </span>
        ) : null}
        {meldung ? <span className="text-[14px] font-semibold text-[#111]">{meldung}</span> : null}
      </div>
        </>
      )}
    </>
  );
}
