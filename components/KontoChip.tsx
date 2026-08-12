"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { User, LogOut, LogIn } from "lucide-react";
import { Dialog, Knopf, Eingabe, Fehlerzeile, Laden, SymbolKnopf, ANZEIGER_GRUEN, ANZEIGER_GOLD } from "@/components/CI";
import {
  getStoredAuthSession,
  signInWithPassword,
  signUpWithPassword,
  signInWithOAuth,
  signOut,
  type SupabaseAuthSession,
} from "@/lib/supabase-auth-client";
import { spracheAusCookie } from "@/lib/konto-i18n";
import { kontoChipText } from "@/lib/konto-chip-i18n";

/**
 * DAS KONTO-ZEICHEN IN DER KOPFZEILE (Owner 11.08.2026: „Ich will dass du mir ein Icon im
 * Header machst zu sehen ob ich eingeloggt bin, mit grüner punkt. Dann wenn ich dort klicke
 * dann kann ich mich abmelden oden anmelden.").
 *
 * WARUM ES DAS BRAUCHT: „Angemeldet aussehen und abgemeldet sein" war im Haus schon einmal
 * der teuerste Fehler (siehe `getStoredAuthSession`) — bis heute gab es aber gar keine Stelle,
 * an der man den Zustand SIEHT. Wer sein Guthaben oder seine Galerie vermisste, konnte nicht
 * einmal nachschauen, ob er überhaupt angemeldet ist. Der Punkt beantwortet genau diese eine
 * Frage, auf jeder Seite, ohne einen Klick.
 *
 * GRÜN JA, ROT NIE: Der abgemeldete Zustand ist der NORMALFALL für jeden neuen Besucher, keine
 * Absage. Rot gehört im Haus der Fehlermeldung (`ABSAGE_ROT`) — ein rotes Zeichen im Kopf jeder
 * Seite hiesse: hier ist etwas kaputt. Ohne Anmeldung ist das Zeichen deshalb nur gedämpft.
 *
 * NORMALE ANMELDUNG, KEIN LINK PER POST (Owner 11.08.2026: „diese Art von Anmeldung mag ich
 * nicht. Ich will eine Normale Anmeldung haben."). E-Mail und Passwort, dazu „Passwort
 * vergessen?" und — im SELBEN Fenster, nur als zweiter Zustand — das Anlegen eines Kontos. Der
 * Magic-Link existiert im Haus weiter (Einladungen, tote Links), taucht hier aber nicht auf.
 *
 * ES STEHT NEBEN DEM TEILEN-KNOPF (Owner 11.08.2026: „neben dem Share Button") — in der OBEREN
 * Zeile, nicht bei Guthaben und Galerie. Das ist auch die einzige Reihe, in der noch Platz ist:
 * Die Zeile darunter war auf 375 px so voll, dass ein 26 Pixel breites Zeichen dem Guthaben
 * „0,00 €" in zwei Zeilen brach (gemessen am 11.08.2026).
 *
 * DER DIALOG HÄNGT AM `body`: Die Kopfzeile ist `sticky` mit eigener Stapelebene (z-50) — ein
 * Fenster darin könnte nie über den Rest der Seite steigen, egal welche Zahl es trägt. Das
 * Portal hebt es aus dem Geltungsbereich heraus, so wie es sich für ein Fenster gehört.
 */

/**
 * DAS GOOGLE-G — das echte Zeichen, in seinen vier Farben, gezeichnet statt geladen (kein
 * Netzaufruf im Anmeldefenster, keine fremde Adresse). Es ist das einzige Stück fremder Marke
 * hier: Der Knopf darum ist unserer.
 */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-4 w-4 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.7l7.8 6.1C12.3 14 17.7 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.5Z" />
      <path fill="#FBBC05" d="M10.4 28.2a14.5 14.5 0 0 1 0-9.3l-7.8-6.1a23.5 23.5 0 0 0 0 21.5l7.8-6.1Z" />
      <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.4-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.8 2.3-6.3 0-11.7-4.5-13.6-10.4l-7.8 6.1C6.5 42.1 14.6 47.5 24 47.5Z" />
    </svg>
  );
}

export default function KontoChip() {
  const [session, setSession] = useState<SupabaseAuthSession | null>(null);
  const [offen, setOffen] = useState(false);
  /* Admin-PIN im Gerät? Zweiter Punkt am Zeichen, unabhängig von der Anmeldung. */
  const [admin, setAdmin] = useState(false);
  const [modus, setModus] = useState<"anmelden" | "anlegen">("anmelden");
  const [mail, setMail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const [hinweis, setHinweis] = useState("");
  const [lang, setLang] = useState("en");

  /**
   * DER ZUSTAND FOLGT DEM EREIGNIS, NICHT DEM NEULADEN: `saveAuthSession` meldet jede
   * Änderung als `luxurybandit-auth-updated` — Anmelden, Abmelden, und die stille Erneuerung
   * des Zugangs durch `AuthRefresh`. Der Punkt geht damit sofort an und aus.
   *
   * `focus` kommt dazu, weil eine Anmeldung auch in einem ANDEREN Tab passieren kann (der
   * Link aus einer Einladung öffnet gern ein neues Fenster); zurück in diesem Tab wäre der
   * Punkt sonst noch aus, obwohl der Ausweis längst im Speicher liegt.
   */
  useEffect(() => {
    const lesen = () => {
      try { setSession(getStoredAuthSession()); } catch { setSession(null); }
      /**
       * DER ADMIN-AUSWEIS IST EIN ZWEITER, UNABHÄNGIGER ZUSTAND (Owner 11.08.2026: „wieso
       * admin? ich bin doch als tigl angemeldet" — und daraufhin: „das will ich aber auch
       * noch mit einem zusatz punkt sehen").
       *
       * Er liegt als PIN im Gerät, nicht am Konto: `luxurybandit-try-look-admin-pin`. Wer ihn
       * hat, sieht in der Galerie ALLE Werke statt nur seine; die Anmeldung sagt dagegen nur,
       * wem Guthaben und Werke gehören. Das Abmelden räumt ihn mit weg (er passt auf das
       * `luxurybandit-`-Muster in `spurenLoeschen`) — genau deshalb muss man SEHEN, ob er
       * noch da ist, statt es an einer leeren Galerie zu merken.
       */
      try { setAdmin(!!localStorage.getItem("luxurybandit-try-look-admin-pin")); } catch { setAdmin(false); }
    };
    lesen();
    setLang(spracheAusCookie());
    window.addEventListener("luxurybandit-auth-updated", lesen);
    window.addEventListener("focus", lesen);
    /**
     * ES GIBT NUR EINE ANMELDUNG IM HAUS (Owner 11.08.2026: „Im Menü ist jetzt ein anderer
     * Art von Sign in").
     *
     * Er hatte zwei verschiedene vor sich: diesen Dialog oben und den alten Weg im unteren
     * Menü, der auf `/account` führte — dort steht noch die Adresse-eintippen-und-Link-
     * schicken-Fassung, also genau das, was er nicht mehr will. Statt die alte Seite ein
     * zweites Mal nachzubauen, ruft das Menü ab jetzt DIESEN Dialog: ein Ereignis, ein
     * Fenster, eine Anmeldung. Wer das Ereignis feuert, muss nichts über den Dialog wissen.
     */
    const aufRuf = () => oeffnen();
    window.addEventListener("luxurybandit-konto-oeffnen", aufRuf);
    return () => {
      window.removeEventListener("luxurybandit-auth-updated", lesen);
      window.removeEventListener("focus", lesen);
      window.removeEventListener("luxurybandit-konto-oeffnen", aufRuf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const T = kontoChipText(lang);
  const angemeldet = !!session;
  const adresse = session?.user?.email ?? "";

  const oeffnen = () => {
    setFehler(""); setHinweis(""); setPasswort("");
    setModus("anmelden");
    setOffen(true);
  };
  const zu = () => setOffen(false);

  /**
   * DIE ABSAGE IN EINEN SATZ ÜBERSETZEN, DEN EIN MENSCH LIEST. Supabase antwortet englisch und
   * technisch („Invalid login credentials"), und auf eine unbekannte Adresse gibt es dieselbe
   * Antwort wie auf ein falsches Passwort — das ist Absicht (sonst liesse sich hier abfragen,
   * wer bei uns ein Konto hat). Deshalb nennt der Satz beide Möglichkeiten und stellt beide
   * Auswege gleich darunter: Passwort vergessen und Konto anlegen.
   */
  const absage = (e: unknown): string => {
    const m = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
    if (!m) return T.fehlerAllgemein;
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) return T.keineVerbindung;
    if (m.includes("not confirmed")) return T.fehlerNichtBestaetigt;
    if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) return T.fehlerSchonDa;
    if (m.includes("password") && (m.includes("6") || m.includes("short") || m.includes("least"))) return T.fehlerPasswortKurz;
    if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("grant")) return T.fehlerZugang;
    return T.fehlerAllgemein;
  };

  const absenden = async () => {
    if (busy) return;
    const a = mail.trim().toLowerCase();
    setHinweis("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) { setFehler(T.fehlerAdresse); return; }
    /* Die Länge prüfen wir SELBST, bevor der Server es tut: Supabase antwortet darauf mit
       einem englischen Satz, und ein zu kurzes Passwort ist kein Serverfehler, sondern ein
       Hinweis, den man vor dem Absenden bekommen sollte. */
    if (passwort.length < 6) { setFehler(T.fehlerPasswortKurz); return; }
    setBusy(true); setFehler("");
    try {
      if (modus === "anmelden") {
        setSession(await signInWithPassword(a, passwort));
        setOffen(false);
      } else {
        const { session: s, confirmationRequired } = await signUpWithPassword(a, passwort);
        if (s && !confirmationRequired) { setSession(s); setOffen(false); }
        else { setHinweis(`${T.bestaetigenTitel} — ${T.bestaetigenText}`); setModus("anmelden"); setPasswort(""); }
      }
    } catch (e) {
      setFehler(absage(e));
    }
    setBusy(false);
  };

  /**
   * PASSWORT VERGESSEN — über UNSER Postfach, nicht über Supabase (dessen `/recover` ist auf
   * diesem Projekt tot: „Error sending recovery email"). `/api/send-reset-link` erzeugt den
   * Link über die Admin-API und verschickt ihn selbst; `sent:false`/`skipped` heisst, dass die
   * Post NICHT rausging — dann darf hier kein „schau in dein Postfach" stehen, auf das jemand
   * wartet.
   */
  const zuruecksetzen = async () => {
    if (busy) return;
    const a = mail.trim().toLowerCase();
    setHinweis("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) { setFehler(T.fehlerAdresse); return; }
    setBusy(true); setFehler("");
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const r = await fetch("/api/send-reset-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: a, redirectTo }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; sent?: boolean; skipped?: string; error?: string };
      if (!r.ok) setFehler(d?.error || T.fehlerAllgemein);
      else if (d?.sent === false || d?.skipped) setFehler(T.resetKeinVersand);
      else setHinweis(T.resetGesendet);
    } catch { setFehler(T.keineVerbindung); }
    setBusy(false);
  };

  /**
   * MIT GOOGLE — ÜBER DIE VORHANDENE FUNKTION, NIE EINE SELBSTGEBAUTE ADRESSE. `signInWithOAuth`
   * kennt die Adresse des Anmelde-Dienstes und die Kennung; eine hier zusammengesetzte URL wäre
   * eine zweite Wahrheit, die beim nächsten Wechsel niemand mitpflegt.
   *
   * DER RÜCKWEG MUSS VORHER GEMERKT WERDEN: Google verlässt die Seite komplett. `/auth/confirm`
   * liest nach der Rückkehr genau `lb_oauth_return` — ohne diesen Eintrag landet der Kunde
   * irgendwo im Haus statt dort, wo er gerade stand (derselbe Weg wie im Try-on-Trichter).
   */
  const mitGoogle = () => {
    try { sessionStorage.setItem("lb_oauth_return", window.location.pathname + window.location.search); } catch { /* privater Modus */ }
    try { signInWithOAuth("google", `${window.location.origin}/auth/confirm`); }
    catch { setFehler(T.fehlerAllgemein); }
  };

  /**
   * ABMELDEN GEHT ÜBER `signOut`, NIE VON HAND (Memory `abmelden-loescht-die-spuren`): Dort
   * hängt `spurenLoeschen` dran, das alles Personenbezogene aus dem Gerät wirft und die Marke
   * `lb_abgemeldet` setzt. Es gibt sechs Abmelde-Knöpfe im Haus — dies ist der siebte, und
   * genau deshalb steht die Regel in der Bibliothek und nicht hier.
   */
  const abmelden = () => {
    try { signOut(); } catch { /* ohne aktive Sitzung wirft es — dann gibt es nichts zu tun */ }
    setSession(null);
    setOffen(false);
  };

  /* DIE GESTALT KOMMT AUS DER BIBLIOTHEK (Owner 11.08.2026: „Das Icon für Login soll nach CI
     sein, aus der Bibliothek und neben dem Share Button.") — `SymbolKnopf` ist die Form, die
     der Teilen-Knopf daneben trägt; der grüne Punkt ist sein Anzeiger. Das Zeichen ist damit
     genauso gross wie sein Nachbar (36 px) und nicht mehr eine eigene Erfindung. */
  const zeichen = (
    <SymbolKnopf
      label={angemeldet ? T.zeichenAn : T.zeichenAus}
      onClick={oeffnen}
      punkt={angemeldet ? ANZEIGER_GRUEN : undefined}
      /* Gold LINKS = Admin-Ausweis im Gerät; grün RECHTS = angemeldetes Konto. Zwei Ausweise,
         zwei Punkte — sie können einzeln auftreten (siehe Kommentar bei ANZEIGER_GOLD). */
      punktLinks={admin ? ANZEIGER_GOLD : undefined}
      /* Der Ring in der Farbe der Kopfzeile — sonst verschmilzt der Punkt mit dem Rand. */
      punktRing="#0d0b0a"
      /* ABGEMELDET IST GEDÄMPFT, NICHT ROT: der Normalfall jedes neuen Besuchers. Rot ist im
         Haus die Absage (`ABSAGE_ROT`) — ein rotes Zeichen im Kopf jeder Seite hiesse, hier
         sei etwas kaputt. */
      className={angemeldet ? "" : "opacity-55"}>
      <User className="h-4 w-4" />
    </SymbolKnopf>
  );

  /* HELL, WEIL ES UM VERTRAUEN GEHT (Owner 10.08.2026: „ich denke wenn es um zahlung geht,
     vertrauen menschen mehr den hellen farben") — die Anmeldung ist derselbe Moment: Man gibt
     etwas von sich preis. z=100 wie beim Anmelde-Link-Fenster: über Kopfzeile (50) und den
     Kassen-Fenstern (95/96). */
  const dialog = !offen ? null : (
    <Dialog art="hell" zu={zu} z={100}>
      {angemeldet ? (
        <>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#1a160f]/[0.06]">
            <User className="h-6 w-6" style={{ color: "#1a160f" }} />
          </div>
          {/* `px-7`, damit die Zeile nie unter das Schliesskreuz läuft. */}
          <p className="mt-3 px-7 text-[16px] font-black leading-snug text-[#1a160f]">{T.titelAn}</p>
          {/* DIE ADRESSE STEHT VOLL DA — es ist sein eigener Bildschirm, und die halbe
              Adresse („g***@gmail.com") beantwortet die eine Frage nicht, für die er hier
              ist: Bin ich mit der RICHTIGEN angemeldet? Genau daran hing am 03.08. das
              verschwundene Guthaben (Memory `guthaben-haengt-an-einer-adresse`). */}
          <p className="mt-2 text-[12px] font-black uppercase tracking-wide text-[#1a160f]/45">{T.angemeldetAls}</p>
          <p className="mt-0.5 break-all text-[14px] font-black leading-snug text-[#1a160f]">{adresse}</p>
          <p className="mt-3 text-[12px] font-semibold leading-snug text-[#1a160f]/60">{T.abmeldenHinweis}</p>
          <div className="mt-4">
            <Knopf art="gold" onClick={abmelden}>
              <LogOut className="h-4 w-4" /> {T.abmelden}
            </Knopf>
          </div>
          <div className="mt-2.5">
            <Knopf art="umriss" hell onClick={zu}>{T.schliessen}</Knopf>
          </div>
        </>
      ) : (
        <>
          <p className="px-7 text-[16px] font-black leading-snug text-[#1a160f]">
            {modus === "anmelden" ? T.titelAnmelden : T.titelAnlegen}
          </p>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-[#1a160f]/70">
            {modus === "anmelden" ? T.grundAnmelden : T.grundAnlegen}
          </p>
          {/* GOOGLE ZUERST (Owner 11.08.2026: „dann kannst du auch google button einbauen").
              Ein Tipp schlägt zwei Felder — wer ein Google-Konto hat, ist damit in einem Zug
              drin, ohne sich ein Passwort auszudenken oder eines zu suchen. Deshalb steht er
              ÜBER den Feldern und nicht als Nachtrag darunter.
              Gestalt: der Umriss-Knopf der Bibliothek in seiner hellen Fassung — KEIN
              nachgebauter Google-Knopf. Nur das Zeichen ist das echte, vierfarbige G; die
              Fläche bleibt unsere. */}
          <div className="mt-4">
            <Knopf art="umriss" hell onClick={mitGoogle}>
              <GoogleG />
              {T.googleKnopf}
            </Knopf>
          </div>
          {/* Die Trennlinie sagt, dass es ZWEI Wege gibt und nicht zwei Schritte. */}
          <div className="mt-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#1a160f]/15" />
            <span className="text-[11px] font-black uppercase tracking-wide text-[#1a160f]/45">{T.oder}</span>
            <span className="h-px flex-1 bg-[#1a160f]/15" />
          </div>
          <div className="mt-3 space-y-2 text-left">
            <Eingabe hell value={mail} autoFocus
              onChange={e => { setMail(e.target.value); if (fehler) setFehler(""); }}
              type="email" inputMode="email" autoComplete="email"
              /**
               * LINKSBÜNDIG, NICHT ZENTRIERT (Owner 11.08.2026: „sind die eingabefelder nach
               * CI?" — er sah zentrierte Serifenschrift und hielt sie für Überschriften).
               *
               * Der Baustein ist der richtige, die Zentrierung war hier von Hand daraufgesetzt.
               * Zentriert steht im Haus der NAME auf einer Karte („Max") — ein Wort, das wie
               * eine Aufschrift wirken soll. Eine Adresse und ein Passwort tippt man dagegen
               * von links; zentriert wandert der Text beim Tippen unter dem Finger weg und
               * sieht im Ruhezustand aus wie ein Titel, nicht wie ein Feld.
               */
              placeholder={T.mailPlatzhalter} />
            <Eingabe hell value={passwort}
              onChange={e => { setPasswort(e.target.value); if (fehler) setFehler(""); }}
              type="password"
              autoComplete={modus === "anmelden" ? "current-password" : "new-password"}
              placeholder={T.passwortPlatzhalter}
              onKeyDown={e => { if (e.key === "Enter") void absenden(); }} />
            {/* Die Absage ROT und AM FELD (Memory `sichtbare-fehler-keine-formularfelder`). */}
            <Fehlerzeile>{fehler}</Fehlerzeile>
            {hinweis && (
              <p className="mt-1.5 text-center text-[12.5px] font-black leading-snug text-[#1a160f]/75">{hinweis}</p>
            )}
          </div>
          <div className="mt-3">
            <Knopf art="gold" onClick={() => void absenden()} disabled={busy}>
              {busy ? <Laden /> : <LogIn className="h-4 w-4" />}
              {modus === "anmelden" ? T.anmeldenKnopf : T.anlegenKnopf}
            </Knopf>
          </div>
          {/* EIN FENSTER, ZWEI ZUSTÄNDE: Der Wechsel ist bewusst KEIN zweiter Goldknopf —
              die Hausregel lässt genau eine Hauptaktion je Bildschirm zu (Skill `ci-design`). */}
          <button type="button"
            onClick={() => { setModus(m => (m === "anmelden" ? "anlegen" : "anmelden")); setFehler(""); setHinweis(""); }}
            className="mt-3 block w-full text-[12.5px] font-black text-[#1a160f]/70 underline">
            {modus === "anmelden" ? T.zumAnlegen : T.zumAnmelden}
          </button>
          {modus === "anmelden" && (
            <button type="button" onClick={() => void zuruecksetzen()} disabled={busy}
              className="mt-2 block w-full text-[12px] font-bold text-[#1a160f]/55 underline">
              {T.passwortVergessen}
            </button>
          )}
          {/* HILFE HEISST /contact, NIE eine Hausadresse zum Abschreiben (Hausregel
              `keine-email-adresse-auf-der-seite` — Spam). */}
          <a href="/contact" className="mt-3 inline-block text-[12px] font-black text-[#1a160f]/55 underline">{T.hilfe}</a>
        </>
      )}
    </Dialog>
  );

  return (
    <>
      {zeichen}
      {/* Erst im Browser: auf dem Server gibt es kein `document`, und ein Unterschied
          zwischen beiden Durchgängen wäre ein Hydrations-Fehler. */}
      {dialog && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </>
  );
}
