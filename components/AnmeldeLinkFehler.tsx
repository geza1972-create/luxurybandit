"use client";

import { useEffect, useState } from "react";
import { Mail, Check } from "lucide-react";
import { Dialog, Knopf, Eingabe, Fehlerzeile, Laden } from "@/components/CI";
import { anmeldeFehlerText } from "@/lib/anmelde-fehler-i18n";
import { spracheAusCookie } from "@/lib/konto-i18n";
import { aktiveAdresse } from "@/lib/guthaben-konto";

/**
 * DER TOTE ANMELDE-LINK BEKOMMT ENDLICH EIN WORT (Owner 11.08.2026, mit der Adresszeile aus
 * seinem Browser: `https://luxurybandit.com/#error=access_denied&error_code=otp_expired&
 * error_description=Email+link+is+invalid+or+has+expired&sb=` — „sollte aber nicht kommen,
 * Sitzung abgelaufen? Neuen Link schicken?").
 *
 * WAS BISHER GESCHAH: Supabase schickt einen fehlgeschlagenen Anmelde-Link nicht auf eine
 * Fehlerseite, sondern auf die STARTSEITE, und hängt den Grund nur als Fragment an die
 * Adresse. Niemand las dieses Fragment. Der Kunde tippte also den Knopf in seiner Mail an,
 * sah das Haus wie beim ersten Besuch — und hielt sich für angemeldet. Seine Galerie war
 * leer, sein Guthaben „weg", und er hatte keinen einzigen Hinweis, was er tun soll.
 *
 * DREI URSACHEN, EIN FRAGMENT: älter als eine Stunde, schon einmal benutzt, oder — der
 * häufigste Fall — der Sicherheitsscanner des E-Mail-Anbieters hat den Link vorab geöffnet
 * und damit das Einmal-Token verbraucht. Alle drei enden in `otp_expired`/`access_denied`,
 * und für alle drei ist die Antwort dieselbe: einen neuen Link holen. Deshalb wird hier
 * nicht diagnostiziert, sondern ein Weg angeboten.
 *
 * WARUM EIN EIGENER BAUSTEIN NEBEN `AuthRefresh`: Jener fängt das ERFOLGS-Fragment ab und
 * gibt `null` zurück — er ist reine Mechanik ohne Fläche. Hier gehört ein Dialog auf den
 * Bildschirm, mit Zustand, Feld und Versand. Beide hängen im Wurzel-Layout und sehen damit
 * jede Seite; getrennt bleibt jeder von beiden lesbar.
 *
 * HELL, WEIL ES UM VERTRAUEN GEHT (Owner 10.08.2026: „ich denke wenn es um zahlung geht,
 * vertrauen menschen mehr den hellen farben") — dies ist der Moment, in dem der Kunde
 * glaubt, etwas sei kaputt. Genau dann darf es kein schwarzes Fenster sein.
 */

/** Die Fehlercodes, für die wir den WAHREN Grund kennen. Alles andere bekommt die allgemeine Fassung. */
const ABGELAUFEN = new Set(["otp_expired", "access_denied"]);

export default function AnmeldeLinkFehler() {
  const [offen, setOffen] = useState(false);
  const [abgelaufen, setAbgelaufen] = useState(true);
  const [lang, setLang] = useState("en");
  const [mail, setMail] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const [gesendet, setGesendet] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const hashP = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = (hashP.get("error_code") ?? "").trim();
      const art = (hashP.get("error") ?? "").trim();
      /* Ein unbekannter Code darf NICHT verschluckt werden — er bekommt nur den allgemeineren
         Satz. Verschluckt hiesse: wieder eine nackte Startseite ohne Erklärung. */
      if (!code && !art) return;
      setAbgelaufen(ABGELAUFEN.has(code) || (!code && ABGELAUFEN.has(art)));
      setLang(spracheAusCookie());
      setMail(aktiveAdresse());
      setOffen(true);
      /**
       * DAS FRAGMENT MUSS AUS DER ADRESSZEILE (dieselbe Technik wie im Erfolgsfall in
       * `AuthRefresh`): Sonst steht der Fehler beim nächsten Neuladen noch da und der
       * Dialog käme wieder — auch dann, wenn der Kunde sich längst neu angemeldet hat.
       */
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState(null, "", url.pathname + (url.search || ""));
    } catch { /* kein lesbares Fragment → nichts zu melden */ }
  }, []);

  if (!offen) return null;
  const T = anmeldeFehlerText(lang);
  const adresseOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

  const schicken = async () => {
    if (busy) return;
    if (!adresseOk) { setFehler(T.fehlerAdresse); return; }
    setBusy(true); setFehler("");
    try {
      /* Derselbe Weg wie überall im Haus: unser eigenes Postfach über `/api/signin-link`
         (Supabase-Versand ist gedeckelt und fiel am 28.07.2026 komplett aus). `returnTo`
         bringt ihn dorthin zurück, wo er gerade steht — der Fehler-Link hat ihn ja aus
         seinem Weg gerissen. */
      const rt = window.location.pathname + (window.location.search || "");
      const r = await fetch("/api/signin-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail.trim(), lang, returnTo: rt.startsWith("/") ? rt : "/" }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; sent?: boolean; error?: string };
      /* NIE EIN VERSCHLUCKTER FEHLSCHLAG: `sent === false` heisst, die Route hat den Link
         zwar gebaut, das Postfach ihn aber nicht angenommen. Ein „Schau in dein Postfach"
         wäre dann eine Lüge, auf die er wartet. */
      if (!r.ok || d?.sent === false) { setFehler(d?.error || T.fehlerVersand); }
      else setGesendet(true);
    } catch { setFehler(T.fehlerVersand); }
    setBusy(false);
  };

  const zu = () => setOffen(false);

  return (
    <Dialog art="hell" zu={zu} z={100}>
      {gesendet ? (
        <>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#1a160f]/[0.06]">
            <Check className="h-6 w-6" style={{ color: "#1a160f" }} />
          </div>
          {/* `px-7`, damit die Zeile nie unter das Schliesskreuz läuft. */}
          <p className="mt-3 px-7 text-[16px] font-black leading-snug text-[#1a160f]">{T.erfolgTitel}</p>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-[#1a160f]/70">{T.erfolgText}</p>
          {/* KEIN WEITERLEITEN: Er soll jetzt in sein Postfach, nicht in einen neuen Trichter. */}
          <div className="mt-4">
            <Knopf art="umriss" hell onClick={zu}>{T.spaeter}</Knopf>
          </div>
        </>
      ) : (
        <>
          <p className="px-7 text-[16px] font-black leading-snug text-[#1a160f]">
            {abgelaufen ? T.titelAbgelaufen : T.titelAllgemein}
          </p>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-[#1a160f]/70">
            {abgelaufen ? T.grundAbgelaufen : T.grundAllgemein}
          </p>
          <div className="mt-4 text-left">
            <Eingabe hell value={mail} autoFocus
              onChange={e => { setMail(e.target.value); if (fehler) setFehler(""); }}
              type="email" inputMode="email" autoComplete="email"
              placeholder={T.platzhalter}
              onKeyDown={e => { if (e.key === "Enter") void schicken(); }}
              className="text-center" />
            {/* Die Absage ROT und AM FELD (Memory `sichtbare-fehler-keine-formularfelder`). */}
            <Fehlerzeile>{fehler}</Fehlerzeile>
          </div>
          <div className="mt-3">
            <Knopf art="gold" onClick={() => void schicken()} disabled={busy}>
              {busy ? <Laden /> : <Mail className="h-4 w-4" />} {T.senden}
            </Knopf>
          </div>
          <div className="mt-2.5">
            <Knopf art="umriss" hell onClick={zu}>{T.spaeter}</Knopf>
          </div>
          {/* HILFE HEISST /contact, NIE eine Hausadresse zum Abschreiben (Hausregel
              `keine-email-adresse-auf-der-seite` — Spam). */}
          <a href="/contact" className="mt-3 inline-block text-[12px] font-black text-[#1a160f]/55 underline">{T.hilfe}</a>
        </>
      )}
    </Dialog>
  );
}
