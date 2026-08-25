"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Check, X as XIcon, ArrowUpRight } from "lucide-react";
import { Knopf, EingabeMehrzeilig, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DER BEWERBUNGS-ASSISTENT — EIN CHAT STATT VIELER KÄSTEN (Owner 25.08.2026: „am
 * einfachsten ist es immer im Form von chat … Statt tausend Funktionen auf der Seite
 * aufzulisten" · „Bewerbungsmappe. Drunter ein Chat mit KI. Dort kann er alles.").
 *
 * Er ersetzt die früheren Einzel-Werkzeuge Anzeigen-Match und Korrektur-Feld als EINE
 * Bedienfläche: Der Besitzer schreibt, was er will — der Chat erkennt selbst, was gemeint
 * ist, und ruft die bestehenden Maschinen auf:
 *
 *   Link oder langer Text  → /api/lebenslauf-match (Prozent-Balken, gratis)
 *                            … dann die Rückfrage „Willst du dich darauf bewerben?"
 *   „Bewerbung erstellen"  → /api/lebenslauf-bewerbung (Zuschnitt + Anschreiben; erste
 *                            gratis als Probe, weitere mit dem Abo — das TOR sitzt im
 *                            Server, der Chat zeigt nur die Antwort)
 *   kurze Anweisung        → /api/lebenslauf-assistent sortiert die Absicht; „ändern"
 *                            läuft über die bestehende Korrektur-Route
 *
 * KLICKEN STATT TIPPEN, WO ES GEHT (Memory `chat-no-personal-questions-buttons-only`):
 * Jede Rückfrage des Chats kommt mit Knöpfen — getippt wird nur, was wirklich frei ist
 * (die Anzeige, die Anweisung).
 *
 * NUR DER BESITZER sieht den Chat (dieselbe Server-Prüfung wie alle Werkzeuge). Der
 * Verlauf lebt im Browser und wird nicht gespeichert — ein Werkzeug, kein Gesprächsarchiv.
 * KEINE PREISE IM TEXT (Memory `prices-only-from-pricing-table`): Zahlen kommen als Props
 * aus der Preistabelle, nie aus einer Zeichenkette hier.
 */

const TEXTE: Record<string, {
  titel: string; gruss: string; platzhalter: string; senden: string; denkt: string;
  chipBewerben: string; chipAendern: string; chipAendernVorlage: string;
  jobtitelFehlt: string; gruendeH: string; lueckenH: string;
  stark: string; mittel: string; schwach: string;
  bewerbenFrage: string; knopfBild: string; knopfBildProbe: string; knopfVideo: string;
  videoBald: string; erstelle: string;
  fertig: string; ansehen: string;
  aboNoetig: string;
  anzeigeFehlt: string; geaendert: string;
  fehler: string;
}> = {
  de: {
    titel: "Dein Bewerbungs-Assistent",
    gruss: "Füg den Link oder Text einer Stellenanzeige ein — ich prüfe, wie gut sie zu dir passt, und erstelle dir auf Wunsch die zugeschnittene Bewerbung samt Anschreiben. Du kannst mir auch sagen, was ich ändern soll.",
    platzhalter: "Anzeige einfügen — oder sag mir, was ich tun soll …",
    senden: "Senden", denkt: "Einen Moment …",
    chipBewerben: "Auf eine Anzeige bewerben", chipAendern: "Etwas ändern",
    chipAendernVorlage: "Ändere bitte: ",
    jobtitelFehlt: "Diese Anzeige",
    gruendeH: "Das passt", lueckenH: "Das fehlt noch",
    stark: "Starke Übereinstimmung", mittel: "Teilweise Übereinstimmung", schwach: "Schwache Übereinstimmung",
    bewerbenFrage: "Willst du dich darauf bewerben? Ich schneide dein Profil zu und schreibe das Anschreiben.",
    knopfBild: "Bewerbung mit Bild erstellen", knopfBildProbe: "Bewerbung mit Bild erstellen — Probe, gratis",
    knopfVideo: "Mit Video",
    videoBald: "Die Videobewerbung kommt als Nächstes: Du sprichst den zugeschnittenen Text ein, dein Avatar trägt ihn vor. Mit Bild geht es sofort.",
    erstelle: "Ich erstelle deine Bewerbung — Profil-Zuschnitt und Anschreiben …",
    fertig: "Deine Bewerbung ist fertig: zugeschnittenes Dossier mit Bild und ein Anschreiben. Du findest sie jederzeit unter „Deine Bewerbungen“.",
    ansehen: "Bewerbung ansehen",
    aboNoetig: "Deine Gratis-Probe ist verbraucht. Mit dem Abo — unten auf dieser Seite — erstellst du Bewerbungen ohne Grenze.",
    anzeigeFehlt: "Füg mir dafür den Link der Stellenanzeige ein — oder ihren Text, wenn der Link nicht lesbar ist.",
    geaendert: "Erledigt — ich lade die Seite neu, damit du es siehst.",
    fehler: "Das hat nicht geklappt — bitte noch einmal.",
  },
  en: {
    titel: "Your application assistant",
    gruss: "Paste the link or text of a job posting — I'll check how well it fits you and, if you want, create the tailored application with a cover letter. You can also tell me what to change.",
    platzhalter: "Paste a posting — or tell me what to do …",
    senden: "Send", denkt: "One moment …",
    chipBewerben: "Apply to a posting", chipAendern: "Change something",
    chipAendernVorlage: "Please change: ",
    jobtitelFehlt: "This posting",
    gruendeH: "What fits", lueckenH: "What's missing",
    stark: "Strong match", mittel: "Partial match", schwach: "Weak match",
    bewerbenFrage: "Do you want to apply for it? I'll tailor your profile and write the cover letter.",
    knopfBild: "Create application with photo", knopfBildProbe: "Create application with photo — free trial",
    knopfVideo: "With video",
    videoBald: "The video application is coming next: you record the tailored script, your avatar delivers it. With photo it works right away.",
    erstelle: "Creating your application — tailored profile and cover letter …",
    fertig: "Your application is ready: a tailored dossier with photo and a cover letter. You'll always find it under \"Your applications\".",
    ansehen: "View application",
    aboNoetig: "Your free trial is used up. With the subscription — further down this page — you create applications without limit.",
    anzeigeFehlt: "Paste me the link of the job posting — or its text, if the link can't be read.",
    geaendert: "Done — reloading the page so you can see it.",
    fehler: "That didn't work — please try again.",
  },
};

type Match = { prozent: number; jobtitel: string; gruende: string[]; luecken: string[] };
type Aktion = { key: "bewerben" | "bild" | "video" | "ansehen"; label: string; href?: string };
type Nachricht = { von: "ich" | "ki"; text?: string; match?: Match; aktionen?: Aktion[]; erledigt?: boolean };

export default function ProfilAssistent({ id, lang = "en" }: { id: string; lang?: string }) {
  const t = TEXTE[lang] ?? TEXTE.en;
  const [darf, setDarf] = useState(false);
  const [probeFrei, setProbeFrei] = useState(false);
  const [msgs, setMsgs] = useState<Nachricht[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [busy, setBusy] = useState(false);
  const geladen = useRef(false);
  const ende = useRef<HTMLDivElement | null>(null);
  /* Die CI-Textarea reicht kein ref durch — der Fokus für die Chips läuft über die id. */
  const feldFokus = () => { try { document.getElementById("assistent-feld")?.focus(); } catch { /**/ } };
  /** Die zuletzt geprüfte Anzeige — der Stoff, aus dem „Bewerbung erstellen" macht. */
  const anzeige = useRef<{ text: string; prozent?: number }>({ text: "" });

  const ausweis = (): { headers: Record<string, string>; device: string } => {
    let device = "", pin = "", tok = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    return {
      headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
      device,
    };
  };

  useEffect(() => {
    if (geladen.current) return;
    geladen.current = true;
    const { headers, device } = ausweis();
    fetch(`/api/lebenslauf-bewerbung?id=${encodeURIComponent(id)}&device=${encodeURIComponent(device)}`, { headers, cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d?.darf !== true) return;
        setDarf(true);
        setProbeFrei(d?.probeFrei === true);
      })
      .catch(() => { /* bleibt zu */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Nachrücken NUR nach echter Interaktion — beim Laden darf die Seite nie zum
     Assistenten springen (er steht weit unten im Blatt). */
  useEffect(() => {
    if (msgs.length > 0) ende.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, busy]);

  if (!darf) return null;

  const ki = (n: Omit<Nachricht, "von">) => setMsgs(m => [...m, { von: "ki", ...n }]);

  /** Alle Aktions-Knöpfe älterer Nachrichten stilllegen — eine Frage gilt, bis sie
      beantwortet ist, danach ist sie Geschichte (kein zweiter „Erstellen"-Klick). */
  const aktionenSchliessen = () => setMsgs(m => m.map(x => x.aktionen ? { ...x, erledigt: true } : x));

  const matchLaufen = async (text: string) => {
    const { headers, device } = ausweis();
    const r = await fetch("/api/lebenslauf-match", {
      method: "POST", headers,
      body: JSON.stringify({ id, eingabe: text, device, lang }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { ki({ text: String(d?.error ?? t.fehler) }); return; }
    anzeige.current = { text, prozent: d.prozent ?? 0 };
    ki({
      match: { prozent: d.prozent ?? 0, jobtitel: d.jobtitel ?? "", gruende: d.gruende ?? [], luecken: d.luecken ?? [] },
      text: t.bewerbenFrage,
      aktionen: [
        { key: "bild", label: probeFrei ? t.knopfBildProbe : t.knopfBild },
        { key: "video", label: t.knopfVideo },
      ],
    });
  };

  const bewerbungErstellen = async () => {
    if (!anzeige.current.text) { ki({ text: t.anzeigeFehlt }); return; }
    setBusy(true);
    ki({ text: t.erstelle });
    try {
      const { headers, device } = ausweis();
      const r = await fetch("/api/lebenslauf-bewerbung", {
        method: "POST", headers,
        body: JSON.stringify({ id, eingabe: anzeige.current.text, prozent: anzeige.current.prozent, device, lang }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 402 && d?.aboNoetig) { ki({ text: t.aboNoetig }); }
      else if (!r.ok) { ki({ text: String(d?.error ?? t.fehler) }); }
      else {
        setProbeFrei(false);
        ki({ text: t.fertig, aktionen: [{ key: "ansehen", label: t.ansehen, href: String(d?.url ?? `/lebenslauf/${d?.id ?? ""}`) }] });
      }
    } catch { ki({ text: t.fehler }); }
    setBusy(false);
  };

  const aktion = (a: Aktion) => {
    if (busy) return;
    aktionenSchliessen();
    if (a.key === "video") { ki({ text: t.videoBald }); return; }
    if (a.key === "bild") { void bewerbungErstellen(); return; }
  };

  const senden = async () => {
    const text = eingabe.trim();
    if (!text || busy) return;
    setEingabe("");
    aktionenSchliessen();
    setMsgs(m => [...m, { von: "ich", text }]);
    setBusy(true);
    try {
      /* Ein Link oder ein langer Einfüge-Text IST eine Anzeige — das entscheidet der
         Browser gratis; nur kurze freie Sätze brauchen die Absichts-Weiche (ein kleiner
         KI-Aufruf, siehe /api/lebenslauf-assistent). */
      if (/https?:\/\//i.test(text) || text.length > 350) {
        await matchLaufen(text);
      } else {
        const { headers, device } = ausweis();
        const r = await fetch("/api/lebenslauf-assistent", {
          method: "POST", headers,
          body: JSON.stringify({ id, text, device, lang }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { ki({ text: String(d?.error ?? t.fehler) }); }
        else if (d.absicht === "bewerben") { ki({ text: t.anzeigeFehlt }); }
        else if (d.absicht === "aendern") {
          const rk = await fetch("/api/lebenslauf-korrektur", {
            method: "POST", headers,
            body: JSON.stringify({ id, anweisung: d.anweisung || text, device }),
          });
          const dk = await rk.json().catch(() => ({}));
          if (!rk.ok) { ki({ text: String(dk?.error ?? t.fehler) }); }
          else {
            ki({ text: t.geaendert });
            setTimeout(() => { try { window.location.reload(); } catch { /**/ } }, 1600);
          }
        } else { ki({ text: String(d.antwort ?? t.fehler) }); }
      }
    } catch { ki({ text: t.fehler }); }
    setBusy(false);
  };

  const einordnung = (p: number) => p >= 70 ? t.stark : p >= 40 ? t.mittel : t.schwach;

  return (
    /* EIGENE BOX UNTER DER KARTE (Owner 25.08.2026: „auch das muss in einer extra box
       drunter" — das Blatt ist das Dokument, die Funktionen wohnen draussen). `lb-karte`
       an der Box selbst, damit alle Karten-Bausteine (Feld, Knöpfe, Tinte) weiterwirken. */
    <section className="lb-karte mt-5 overflow-hidden rounded-[20px] px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.38)] md:px-8 md:py-7">
        <p className="flex items-center gap-2 text-[13px] font-black leading-snug">
          <MessageCircle className="h-4 w-4 shrink-0" />{t.titel}
        </p>

        {/* DER VERLAUF — Begrüssung als erste KI-Zeile, danach die echten Nachrichten. */}
        <div className="mt-3 flex flex-col gap-2.5">
          <p className="text-[12.5px] font-bold leading-snug opacity-70">{t.gruss}</p>

          {msgs.map((m, i) => m.von === "ich" ? (
            <p key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#1a160f]/[0.07] px-3 py-2 text-[12.5px] font-bold leading-snug">
              {m.text}
            </p>
          ) : (
            <div key={i} className="max-w-full">
              {m.match && (
                <div className="mb-2 rounded-2xl border border-[#1a160f]/15 px-3.5 py-3">
                  {m.match.jobtitel && <p className="text-[11px] font-black uppercase tracking-[0.1em] opacity-50">{m.match.jobtitel}</p>}
                  <div className="mt-1.5 flex items-baseline gap-3">
                    <p className="font-serif text-[28px] font-black leading-none">{m.match.prozent}%</p>
                    <p className="text-[11px] font-black uppercase tracking-[0.1em] opacity-60">{einordnung(m.match.prozent)}</p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1a160f]/10">
                    <div className="h-full rounded-full bg-[#1a160f] transition-all" style={{ width: `${m.match.prozent}%` }} />
                  </div>
                  {m.match.gruende.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-40">{t.gruendeH}</p>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {m.match.gruende.map(g => (
                          <li key={g} className="flex items-start gap-1.5 text-[12px] font-bold leading-snug opacity-80">
                            <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 opacity-60" />{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {m.match.luecken.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-40">{t.lueckenH}</p>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {m.match.luecken.map(g => (
                          <li key={g} className="flex items-start gap-1.5 text-[12px] font-bold leading-snug opacity-70">
                            <XIcon className="mt-[2px] h-3.5 w-3.5 shrink-0 opacity-45" />{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {m.text && <p className="text-[12.5px] font-bold leading-snug opacity-85">{m.text}</p>}
              {m.aktionen && !m.erledigt && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.aktionen.map(a => a.href ? (
                    <a key={a.key} href={a.href}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-[#1a160f] px-4 text-[12.5px] font-black">
                      {a.label}<ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <button key={a.key} type="button" onClick={() => aktion(a)}
                      className="inline-flex h-10 items-center rounded-full border-2 border-[#1a160f] px-4 text-[12.5px] font-black transition hover:bg-[#1a160f]/5">
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {busy && (
            <p className="flex items-center gap-2 text-[12.5px] font-bold leading-snug opacity-60">
              <Laden art="knopf" karte />{t.denkt}
            </p>
          )}
          <div ref={ende} />
        </div>

        {/* KLICK-CHIPS nur am Anfang — sie füllen das Feld vor, getippt wird das Freie. */}
        {msgs.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Leert einen etwaigen „Ändere bitte:"-Vorbefüller des anderen Chips (Owner
                25.08.2026: „steht der falsche Text im Chat") — das Feld gehört dann der
                Anzeige, der Platzhalter sagt, was hinein soll. */}
            <button type="button" onClick={() => { setEingabe(""); feldFokus(); }}
              className="rounded-full border border-[#1a160f]/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.04em] opacity-75 transition hover:opacity-100">
              {t.chipBewerben}
            </button>
            <button type="button" onClick={() => { setEingabe(t.chipAendernVorlage); feldFokus(); }}
              className="rounded-full border border-[#1a160f]/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.04em] opacity-75 transition hover:opacity-100">
              {t.chipAendern}
            </button>
          </div>
        )}

        <EingabeMehrzeilig karte className="mt-3" zeilen={2} value={eingabe}
          placeholder={t.platzhalter} id="assistent-feld"
          onChange={e => setEingabe(e.target.value)} />
        <div className="mt-2.5">
          <Knopf art="umriss" karte disabled={!eingabe.trim() || busy} onClick={() => void senden()}>
            {t.senden}
          </Knopf>
        </div>
    </section>
  );
}
