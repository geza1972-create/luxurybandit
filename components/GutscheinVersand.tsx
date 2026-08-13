"use client";

import { useState } from "react";
import { Fehlerzeile, Knopf } from "@/components/CI";

/**
 * SAGT DIE WAHRHEIT ÜBER DEN VERSAND (Owner 06.08.2026: „vorher sollte eine bestätigung
 * kommen, dass emails gesendet wurden. Und es kam nichts an.").
 *
 * Vorher stand hier eine feste Zeile „Verschickt — … hat den Link per E-Mail bekommen", und
 * zwar IMMER: Der Server warf das Versand-Ergebnis weg, also behauptete die Karte etwas, das
 * niemand geprüft hatte. Genau so entsteht der Fall, in dem jemand bezahlt hat, die Karte
 * „verschickt" meldet und beim Beschenkten nie etwas ankommt.
 *
 * JETZT ENTSCHEIDET DAS ERGEBNIS. Ging die Mail raus, steht die Bestätigung wie bisher. Ging
 * sie NICHT raus, steht es rot da — mit dem einen Knopf, der es noch einmal versucht. Das
 * Guthaben liegt in beiden Fällen längst beim Beschenkten; verloren ist nur die Nachricht,
 * und die ist nachholbar.
 *
 * Rot kommt aus `Fehlerzeile`, der Knopf aus `Knopf` — Bibliothek, nicht von Hand
 * (Owner 06.08.2026: „du holst alles was du baust aus der bibliothek raus").
 */

const TEXTE: Record<string, { fehler: string; knopf: string; laeuft: string; erneutOk: string; erneutFehler: string }> = {
  de: {
    fehler: "Die E-Mail ist nicht rausgegangen. Dein Geschenk ist bezahlt und liegt sicher bereit — versuch es noch einmal oder schick den Link selbst.",
    knopf: "E-Mail nochmal senden", laeuft: "Wird gesendet …",
    erneutOk: "Jetzt ist sie raus.", erneutFehler: "Klappt gerade nicht — schick den Link bitte selbst.",
  },
  en: {
    fehler: "The email did not go out. Your gift is paid for and waiting safely — try again or send the link yourself.",
    knopf: "Send the email again", laeuft: "Sending …",
    erneutOk: "It is on its way now.", erneutFehler: "Not working right now — please send the link yourself.",
  },
  ro: {
    fehler: "E-mailul nu a plecat. Cadoul tău e plătit și te așteaptă în siguranță — mai încearcă o dată sau trimite tu linkul.",
    knopf: "Trimite din nou e-mailul", laeuft: "Se trimite …",
    erneutOk: "Acum a plecat.", erneutFehler: "Momentan nu merge — trimite tu linkul, te rog.",
  },
  es: {
    fehler: "El correo no ha salido. Tu regalo está pagado y guardado — inténtalo otra vez o envía tú el enlace.",
    knopf: "Enviar el correo otra vez", laeuft: "Enviando …",
    erneutOk: "Ya va en camino.", erneutFehler: "Ahora mismo no funciona — envía tú el enlace, por favor.",
  },
  fr: {
    fehler: "L'e-mail n'est pas parti. Ton cadeau est payé et bien au chaud — réessaie ou envoie le lien toi-même.",
    knopf: "Renvoyer l'e-mail", laeuft: "Envoi …",
    erneutOk: "C'est parti.", erneutFehler: "Ça ne marche pas là — envoie le lien toi-même, s'il te plaît.",
  },
  pt: {
    fehler: "O e-mail não saiu. O teu presente está pago e guardado — tenta outra vez ou envia tu o link.",
    knopf: "Enviar o e-mail outra vez", laeuft: "A enviar …",
    erneutOk: "Já vai a caminho.", erneutFehler: "Agora não dá — envia tu o link, por favor.",
  },
  it: {
    fehler: "L'e-mail non è partita. Il tuo regalo è pagato e al sicuro — riprova o manda tu il link.",
    knopf: "Invia di nuovo l'e-mail", laeuft: "Invio …",
    erneutOk: "Ora è partita.", erneutFehler: "Adesso non funziona — manda tu il link, per favore.",
  },
};

export default function GutscheinVersand({ id, sprache, ok, bestaetigung }: {
  id: string;
  sprache: string;
  /** Hat der Server die Mail wirklich rausbekommen? */
  ok: boolean;
  /** Die bestehende Bestätigungszeile — sie gilt unverändert, wenn es geklappt hat. */
  bestaetigung: string;
}) {
  const T = TEXTE[sprache] ?? TEXTE.en;
  const [zustand, setZustand] = useState<"start" | "laeuft" | "ok" | "fehler">(ok ? "ok" : "start");

  const nochmal = async () => {
    setZustand("laeuft");
    try {
      const r = await fetch("/api/einladung", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nachsenden: id }),
      }).then(x => x.json());
      /* Geglückt ist es nur, wenn die Mail an den BESCHENKTEN raus ist — die Käufer-Mail ist
         eine Kopie für ihn selbst, das Geschenk hängt an der anderen. */
      setZustand(r?.mails?.empfaenger ? "ok" : "fehler");
    } catch { setZustand("fehler"); }
  };

  if (zustand === "ok") {
    return (
      <p className="mb-3 rounded-xl border border-[#f6cf51]/30 lb-goldhauch px-3 py-2 text-center text-[12.5px] font-bold leading-snug text-white/85">
        {bestaetigung}
      </p>
    );
  }
  return (
    <div className="mb-3">
      <Fehlerzeile>{zustand === "fehler" ? T.erneutFehler : T.fehler}</Fehlerzeile>
      {/* GEFÜLLT, NICHT UMRISS: Diese Zeile steht ÜBER der Karte, also auf dem Seitengrund —
          und der ist hier hell (eine Einladung ist hell, Vorgabe des Hauses). Der Umriss-Knopf
          der Bibliothek ist für die dunkle Welt gezeichnet (weisse Schrift, weisser Rand) und
          verschwindet auf Elfenbein; die Karten-Fassung `lb-karte-absage` greift nur INNERHALB
          von `.lb-karte`. Bleibt der gefüllte — und er ist ohnehin die einzige Handlung hier.
          Dass er auf DIESER Seite blau statt gold erscheint, ist Absicht: Die Einladungsseite
          trägt `lb-fb`, und diese Haut färbt `lb-gold` auf Facebook-Blau (globals.css). */}
      <Knopf art="gold" className="mt-2 w-full" onClick={() => void nochmal()} disabled={zustand === "laeuft"}>
        {zustand === "laeuft" ? T.laeuft : T.knopf}
      </Knopf>
    </div>
  );
}
