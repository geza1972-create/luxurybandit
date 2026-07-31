import type { ReactNode } from "react";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";

/**
 * DIE EINLADUNGSKARTE — eine Datei für zwei Orte.
 *
 * Owner 31.07.2026: „wo das Video ist, hier musst du die Einladung zeigen gleich wie sie
 * aussieht, und wenn's geht mit Jugendstil-Ornamenten. Wir hatten das schon mal bei einem
 * Formular benutzt."
 *
 * „GLEICH WIE SIE AUSSIEHT" ist der ganze Grund für diese Datei. Eine nachgebaute Vorschau
 * sieht am ersten Tag gleich aus und am dreissigsten nicht mehr — und dann verschickt sie
 * etwas anderes, als sie gesehen hat. Deshalb rendert DIESELBE Komponente die Vorschau im
 * Trichter und die Seite, die der Gast öffnet. Was hier geändert wird, ändert sich an beiden
 * Stellen oder an keiner.
 *
 * Die Ornamente sind die aus `BoxOrnaments` — dieselbe Handschrift wie im Anmeldeformular.
 * Bei einer Hochzeitseinladung sind sie nicht Zierrat: Sie sind der Unterschied zwischen
 * „KI-Werkzeug" und „Einladung", und davon hängt ab, ob sie den Link überhaupt verschickt.
 *
 * Farben stehen fest (siehe `.lb-karte` in globals.css): Eine gedruckte Karte bleibt elfenbein,
 * ob die Seite ringsum hell oder dunkel steht. Das schützt sie auch vor den Umfärbe-Regeln der
 * hellen Fassung, die hier Blau hineinmalen würden.
 */

export const KARTE_TEXTE: Record<string, {
  save: string; wann: string; wo: string; herkunft: string; eigenes: string; ton: string; wa: string;
  zusTitel: string; zusJa: string; zusNein: string; zusName: string; zusSenden: string;
  zusDanke: string; zusLeer: string; zusZahl: (ja: number, nein: number) => string;
  zusMail: string; zusMailWarum: string; zusDatenschutz: string;
  chatTitel: string; chatLeer: string; chatFeld: string; chatSenden: string;
}> = {
  de: { save: "Hochzeitseinladung", wann: "Wann", wo: "Wo", herkunft: "Dieses Video ist mit LuxuryBandit gemacht.", eigenes: "Macht euer eigenes", ton: "Ton an", wa: "Zusagen per WhatsApp", zusTitel: "Wer kommt", zusJa: "Ich komme", zusNein: "Ich kann leider nicht", zusName: "Dein Vorname", zusSenden: "Antworten", zusDanke: "Danke — wir freuen uns!", zusLeer: "Sei der Erste, der antwortet.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 Zusage" : `${ja} Zusagen`}${nein ? ` · ${nein === 1 ? "1 Absage" : `${nein} Absagen`}` : ""}`, zusMail: "Deine E-Mail", zusMailWarum: "Damit euch das Brautpaar erreichen kann, wenn sich Uhrzeit oder Ort ändern.", zusDatenschutz: "Datenschutz", chatTitel: "Gruppenchat", chatLeer: "Noch keine Nachricht — schreibt die erste.", chatFeld: "Nachricht an alle …", chatSenden: "Senden" },
  en: { save: "Wedding invitation", wann: "When", wo: "Where", herkunft: "This video was made with LuxuryBandit.", eigenes: "Make your own", ton: "Sound on", wa: "RSVP on WhatsApp", zusTitel: "Who's coming", zusJa: "I'll be there", zusNein: "Sorry, I can't", zusName: "Your first name", zusSenden: "Send", zusDanke: "Thank you — we can't wait!", zusLeer: "Be the first to answer.", zusZahl: (ja: number, nein: number) => `${ja} coming${nein ? ` · ${nein} can\u2019t` : ""}`, zusMail: "Your email", zusMailWarum: "So the couple can reach you if the time or the place changes.", zusDatenschutz: "Privacy", chatTitel: "Group chat", chatLeer: "No messages yet — write the first one.", chatFeld: "Message everyone …", chatSenden: "Send" },
  ro: { save: "Invitație la nuntă", wann: "Când", wo: "Unde", herkunft: "Videoclipul e făcut cu LuxuryBandit.", eigenes: "Faceți-l pe al vostru", ton: "Pornește sunetul", wa: "Confirmă pe WhatsApp", zusTitel: "Cine vine", zusJa: "Vin cu drag", zusNein: "Din păcate nu pot", zusName: "Prenumele tău", zusSenden: "Trimite", zusDanke: "Mulțumim — abia așteptăm!", zusLeer: "Fii primul care răspunde.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 confirmare" : `${ja} confirmări`}${nein ? ` · ${nein === 1 ? "1 refuz" : `${nein} refuzuri`}` : ""}`, zusMail: "E-mailul tău", zusMailWarum: "Ca mirii să vă poată anunța dacă se schimbă ora sau locul.", zusDatenschutz: "Confidențialitate", chatTitel: "Chat de grup", chatLeer: "Niciun mesaj încă — scrieți primul.", chatFeld: "Un mesaj pentru toți …", chatSenden: "Trimite" },
  es: { save: "Invitación de boda", wann: "Cuándo", wo: "Dónde", herkunft: "Este vídeo está hecho con LuxuryBandit.", eigenes: "Haced el vuestro", ton: "Activar sonido", wa: "Confirmar por WhatsApp", zusTitel: "Quién viene", zusJa: "Allí estaré", zusNein: "Lo siento, no puedo", zusName: "Tu nombre", zusSenden: "Enviar", zusDanke: "¡Gracias, os esperamos!", zusLeer: "Sé el primero en responder.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 confirmado" : `${ja} confirmados`}${nein ? ` · ${nein === 1 ? "1 no puede" : `${nein} no pueden`}` : ""}`, zusMail: "Tu correo", zusMailWarum: "Para que los novios puedan avisarte si cambia la hora o el lugar.", zusDatenschutz: "Privacidad", chatTitel: "Chat del grupo", chatLeer: "Aún no hay mensajes — escribid el primero.", chatFeld: "Un mensaje para todos …", chatSenden: "Enviar" },
  fr: { save: "Invitation de mariage", wann: "Quand", wo: "Où", herkunft: "Cette vidéo est faite avec LuxuryBandit.", eigenes: "Faites la vôtre", ton: "Activer le son", wa: "Répondre sur WhatsApp", zusTitel: "Qui vient", zusJa: "Je serai là", zusNein: "Désolé, je ne peux pas", zusName: "Votre prénom", zusSenden: "Envoyer", zusDanke: "Merci — à très bientôt !", zusLeer: "Soyez le premier à répondre.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 présent" : `${ja} présents`}${nein ? ` · ${nein === 1 ? "1 absent" : `${nein} absents`}` : ""}`, zusMail: "Votre e-mail", zusMailWarum: "Pour que les mariés puissent vous prévenir si l’heure ou le lieu change.", zusDatenschutz: "Confidentialité", chatTitel: "Discussion de groupe", chatLeer: "Aucun message — écrivez le premier.", chatFeld: "Un message pour tous …", chatSenden: "Envoyer" },
  pt: { save: "Convite de casamento", wann: "Quando", wo: "Onde", herkunft: "Este vídeo foi feito com LuxuryBandit.", eigenes: "Façam o vosso", ton: "Ligar o som", wa: "Confirmar no WhatsApp", zusTitel: "Quem vem", zusJa: "Lá estarei", zusNein: "Infelizmente não posso", zusName: "O teu nome", zusSenden: "Enviar", zusDanke: "Obrigado — mal podemos esperar!", zusLeer: "Sê o primeiro a responder.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 confirmado" : `${ja} confirmados`}${nein ? ` · ${nein === 1 ? "1 não pode" : `${nein} não podem`}` : ""}`, zusMail: "O teu e-mail", zusMailWarum: "Para que os noivos vos possam avisar se mudar a hora ou o local.", zusDatenschutz: "Privacidade", chatTitel: "Chat do grupo", chatLeer: "Ainda sem mensagens — escrevam a primeira.", chatFeld: "Uma mensagem para todos …", chatSenden: "Enviar" },
  it: { save: "Invito di nozze", wann: "Quando", wo: "Dove", herkunft: "Questo video è fatto con LuxuryBandit.", eigenes: "Fate il vostro", ton: "Attiva l’audio", wa: "Conferma su WhatsApp", zusTitel: "Chi viene", zusJa: "Ci sarò", zusNein: "Purtroppo non posso", zusName: "Il tuo nome", zusSenden: "Invia", zusDanke: "Grazie — non vediamo l'ora!", zusLeer: "Sii il primo a rispondere.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 presente" : `${ja} presenti`}${nein ? ` · ${nein === 1 ? "1 assente" : `${nein} assenti`}` : ""}`, zusMail: "La tua e-mail", zusMailWarum: "Così gli sposi possono avvisarvi se cambia l’ora o il luogo.", zusDatenschutz: "Privacy", chatTitel: "Chat di gruppo", chatLeer: "Ancora nessun messaggio — scrivete il primo.", chatFeld: "Un messaggio per tutti …", chatSenden: "Invia" },
};

const ORTE: Record<string, string> = {
  de: "de-DE", en: "en-GB", ro: "ro-RO", es: "es-ES", fr: "fr-FR", pt: "pt-PT", it: "it-IT",
};

/** „14. August 2026" statt „2026-08-14" — das eine liest sich wie eine Einladung, das andere
 *  wie ein Formular. Ein unvollständiges Datum aus dem Formular ergibt schlicht nichts. */
export const karteDatum = (datum: string | undefined, sprache: string) => {
  if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) return "";
  const d = new Date(datum + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString(ORTE[sprache] ?? "en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch { return datum; }
};

export default function EinladungKarte({
  sprache, sie, er, datum, ort, adresse, telefon, demo, video, fuss,
}: {
  sprache: string;
  sie: string;
  er: string;
  datum?: string;
  ort?: string;
  /** Strasse, Hausnummer, PLZ, Stadt (Owner 31.07.2026: „da muss auch eine genaue Adresse
   *  rein mit Postleitzahl"). Ein Saalname allein hilft keinem Gast, der hinfahren muss. */
  adresse?: string;
  /**
   * DIE WHATSAPP-NUMMER DES PAARES — und damit die Zusage.
   *
   * Owner 31.07.2026: „und WA Nummer". Das ist der ehrliche Weg zur Gaesteliste: Der Gast
   * schreibt DEM PAAR, nicht uns. Keine fremden Personendaten bei uns, kein Konto fuer den
   * Gast, und es funktioniert am ersten Tag — anders als ein eigenes Zusage-System.
   */
  telefon?: string;
  /** Auf der Verkaufsseite: Knopf zeigen, aber NICHT verlinken. Sonst schreiben Fremde einer
   *  erfundenen Nummer — oder schlimmer, einer echten. */
  demo?: boolean;
  video: ReactNode;
  /** Die eine Herkunftszeile — nur auf der echten Seite, nicht in der Vorschau. */
  fuss?: ReactNode;
}) {
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  const tag = karteDatum(datum, sprache);

  return (
    <div className="lb-karte relative overflow-hidden rounded-[20px] px-5 pb-6 pt-7 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      {/* Die vier Eckranken — `relative overflow-hidden` oben ist ihre Bedingung. */}
      <CornerOrnaments />
      {/* Eine zweite, feine Linie innen: So sieht eine gedruckte Karte aus, und sie hält die
          Ornamente optisch zusammen, statt sie in den Ecken allein zu lassen. */}
      <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />

      <div className="relative">
        <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.34em]">
          {T.save}
        </p>
        <h2 className="mt-2 text-center font-serif text-[27px] font-bold leading-tight">
          {sie} <span className="lb-karte-gold">&amp;</span> {er}
        </h2>
        <DividerOrnament className="mt-2.5" />

        <div className="mt-4 overflow-hidden rounded-[14px]">{video}</div>

        {(tag || ort) && (
          <>
            <DividerOrnament className="mt-5" />
            <div className="mt-3 space-y-3 text-center">
              {tag && (
                <div>
                  <p className="lb-karte-gold text-[9.5px] font-black uppercase tracking-[0.14em]">{T.wann}</p>
                  <p className="mt-1 font-serif text-[19px] font-bold">{tag}</p>
                </div>
              )}
              {(ort || adresse) && (
                <div>
                  <p className="lb-karte-gold text-[9.5px] font-black uppercase tracking-[0.14em]">{T.wo}</p>
                  {ort && <p className="mt-1 font-serif text-[16px]">{ort}</p>}
                  {/* Die Anschrift kleiner unter dem Saalnamen — sie wird gelesen, wenn man
                      losfaehrt, nicht wenn man die Einladung oeffnet. */}
                  {adresse && (
                    <p className="mt-0.5 whitespace-pre-line font-serif text-[13px] leading-snug opacity-80">
                      {adresse}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ZUSAGEN — direkt an ihr Handy. */}
        {telefon && (
          demo ? (
            <div className="lb-karte-wa mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-black opacity-70">
              <span>💬</span>{T.wa}
            </div>
          ) : (
            <a href={`https://wa.me/${telefon.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"
              className="lb-karte-wa mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-black transition active:scale-95">
              <span>💬</span>{T.wa}
            </a>
          )
        )}

        {fuss}
      </div>
    </div>
  );
}
