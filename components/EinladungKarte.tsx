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
  abgelaufen: string; abgelaufenGast: string; probeTage: (n: number) => string;
  bearbeiten: string; speichern: string; abbrechen: string; teilen: string;
  fSie: string; fEr: string; fDatum: string; fOrt: string; fAdresse: string; fTelefon: string;
  namen: string; fotos: string; fotoEr: string; loeschen: string; zurueck: string; tonAus: string; hell: string; dunkel: string; ersetzen: string;
}> = {
  de: { save: "Hochzeitseinladung", wann: "Wann", wo: "Wo", herkunft: "Dieses Video ist mit LuxuryBandit gemacht.", eigenes: "Macht euer eigenes", ton: "Ton an", wa: "Fragen? Schreibt uns", zusTitel: "Wer kommt", zusJa: "Ich komme", zusNein: "Ich kann leider nicht", zusName: "Dein Vorname", zusSenden: "Antworten", zusDanke: "Danke — wir freuen uns!", zusLeer: "Sei der Erste, der antwortet.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 Zusage" : `${ja} Zusagen`}${nein ? ` · ${nein === 1 ? "1 Absage" : `${nein} Absagen`}` : ""}`, zusMail: "Deine E-Mail", zusMailWarum: "Damit euch das Brautpaar erreichen kann, wenn sich Uhrzeit oder Ort ändern.", zusDatenschutz: "Datenschutz", chatTitel: "Gruppenchat", chatLeer: "Noch keine Nachricht — schreibt die erste.", chatFeld: "Nachricht an alle …", chatSenden: "Senden", abgelaufen: "Diese Einladung ist abgelaufen", abgelaufenGast: "Das Brautpaar muss sie wieder freischalten — meldet euch bei ihnen.", probeTage: (n: number) => n === 1 ? "Noch 1 Tag frei" : `Noch ${n} Tage frei`, bearbeiten: "Bearbeiten", speichern: "Speichern", abbrechen: "Abbrechen", teilen: "Verschicken", fSie: "Ihr Vorname", fEr: "Sein Vorname", fDatum: "Datum", fOrt: "Saal oder Restaurant", fAdresse: "Straße, Nr., PLZ, Ort", fTelefon: "Eure WhatsApp-Nummer", namen: "Eure Namen", fotos: "Eure Fotos", fotoEr: "Er, der Bräutigam", loeschen: "Foto löschen", zurueck: "Zurück", tonAus: "Ton aus", hell: "Helle Ansicht", dunkel: "Dunkle Ansicht", ersetzen: "Foto ersetzen" },
  en: { save: "Wedding invitation", wann: "When", wo: "Where", herkunft: "This video was made with LuxuryBandit.", eigenes: "Make your own", ton: "Sound on", wa: "Questions? Message us", zusTitel: "Who's coming", zusJa: "I'll be there", zusNein: "Sorry, I can't", zusName: "Your first name", zusSenden: "Send", zusDanke: "Thank you — we can't wait!", zusLeer: "Be the first to answer.", zusZahl: (ja: number, nein: number) => `${ja} coming${nein ? ` · ${nein} can\u2019t` : ""}`, zusMail: "Your email", zusMailWarum: "So the couple can reach you if the time or the place changes.", zusDatenschutz: "Privacy", chatTitel: "Group chat", chatLeer: "No messages yet — write the first one.", chatFeld: "Message everyone …", chatSenden: "Send", abgelaufen: "This invitation has expired", abgelaufenGast: "The couple needs to unlock it again — get in touch with them.", probeTage: (n: number) => n === 1 ? "1 day left free" : `${n} days left free`, bearbeiten: "Edit", speichern: "Save", abbrechen: "Cancel", teilen: "Send it", fSie: "Her first name", fEr: "His first name", fDatum: "Date", fOrt: "Venue", fAdresse: "Street, no., postcode, town", fTelefon: "Your WhatsApp number", namen: "Your names", fotos: "Your photos", fotoEr: "Him, the groom", loeschen: "Delete photo", zurueck: "Back", tonAus: "Sound off", hell: "Light view", dunkel: "Dark view", ersetzen: "Replace photo" },
  ro: { save: "Invitație la nuntă", wann: "Când", wo: "Unde", herkunft: "Videoclipul e făcut cu LuxuryBandit.", eigenes: "Faceți-l pe al vostru", ton: "Pornește sunetul", wa: "Întrebări? Scrieți-ne", zusTitel: "Cine vine", zusJa: "Vin cu drag", zusNein: "Din păcate nu pot", zusName: "Prenumele tău", zusSenden: "Trimite", zusDanke: "Mulțumim — abia așteptăm!", zusLeer: "Fii primul care răspunde.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 confirmare" : `${ja} confirmări`}${nein ? ` · ${nein === 1 ? "1 refuz" : `${nein} refuzuri`}` : ""}`, zusMail: "E-mailul tău", zusMailWarum: "Ca mirii să vă poată anunța dacă se schimbă ora sau locul.", zusDatenschutz: "Confidențialitate", chatTitel: "Chat de grup", chatLeer: "Niciun mesaj încă — scrieți primul.", chatFeld: "Un mesaj pentru toți …", chatSenden: "Trimite", abgelaufen: "Această invitație a expirat", abgelaufenGast: "Mirii trebuie să o reactiveze — vorbiți cu ei.", probeTage: (n: number) => n === 1 ? "A mai rămas 1 zi gratuit" : `Au mai rămas ${n} zile gratuit`, bearbeiten: "Editează", speichern: "Salvează", abbrechen: "Anulează", teilen: "Trimite", fSie: "Prenumele ei", fEr: "Prenumele lui", fDatum: "Data", fOrt: "Sala sau restaurantul", fAdresse: "Strada, nr., cod poștal, oraș", fTelefon: "Numărul vostru de WhatsApp", namen: "Numele voastre", fotos: "Pozele voastre", fotoEr: "El, mirele", loeschen: "Șterge poza", zurueck: "Înapoi", tonAus: "Oprește sunetul", hell: "Vizualizare deschisă", dunkel: "Vizualizare întunecată", ersetzen: "Înlocuiește poza" },
  es: { save: "Invitación de boda", wann: "Cuándo", wo: "Dónde", herkunft: "Este vídeo está hecho con LuxuryBandit.", eigenes: "Haced el vuestro", ton: "Activar sonido", wa: "¿Dudas? Escríbenos", zusTitel: "Quién viene", zusJa: "Allí estaré", zusNein: "Lo siento, no puedo", zusName: "Tu nombre", zusSenden: "Enviar", zusDanke: "¡Gracias, os esperamos!", zusLeer: "Sé el primero en responder.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 confirmado" : `${ja} confirmados`}${nein ? ` · ${nein === 1 ? "1 no puede" : `${nein} no pueden`}` : ""}`, zusMail: "Tu correo", zusMailWarum: "Para que los novios puedan avisarte si cambia la hora o el lugar.", zusDatenschutz: "Privacidad", chatTitel: "Chat del grupo", chatLeer: "Aún no hay mensajes — escribid el primero.", chatFeld: "Un mensaje para todos …", chatSenden: "Enviar", abgelaufen: "Esta invitación ha caducado", abgelaufenGast: "Los novios tienen que reactivarla — habladlo con ellos.", probeTage: (n: number) => n === 1 ? "Queda 1 día gratis" : `Quedan ${n} días gratis`, bearbeiten: "Editar", speichern: "Guardar", abbrechen: "Cancelar", teilen: "Enviar", fSie: "Su nombre", fEr: "Su nombre (él)", fDatum: "Fecha", fOrt: "Salón o restaurante", fAdresse: "Calle, nº, código postal, ciudad", fTelefon: "Vuestro número de WhatsApp", namen: "Vuestros nombres", fotos: "Vuestras fotos", fotoEr: "Él, el novio", loeschen: "Borrar la foto", zurueck: "Volver", tonAus: "Silenciar", hell: "Vista clara", dunkel: "Vista oscura", ersetzen: "Sustituir la foto" },
  fr: { save: "Invitation de mariage", wann: "Quand", wo: "Où", herkunft: "Cette vidéo est faite avec LuxuryBandit.", eigenes: "Faites la vôtre", ton: "Activer le son", wa: "Une question ? Écrivez-nous", zusTitel: "Qui vient", zusJa: "Je serai là", zusNein: "Désolé, je ne peux pas", zusName: "Votre prénom", zusSenden: "Envoyer", zusDanke: "Merci — à très bientôt !", zusLeer: "Soyez le premier à répondre.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 présent" : `${ja} présents`}${nein ? ` · ${nein === 1 ? "1 absent" : `${nein} absents`}` : ""}`, zusMail: "Votre e-mail", zusMailWarum: "Pour que les mariés puissent vous prévenir si l’heure ou le lieu change.", zusDatenschutz: "Confidentialité", chatTitel: "Discussion de groupe", chatLeer: "Aucun message — écrivez le premier.", chatFeld: "Un message pour tous …", chatSenden: "Envoyer", abgelaufen: "Cette invitation a expiré", abgelaufenGast: "Les mariés doivent la réactiver — contactez-les.", probeTage: (n: number) => n === 1 ? "Encore 1 jour gratuit" : `Encore ${n} jours gratuits`, bearbeiten: "Modifier", speichern: "Enregistrer", abbrechen: "Annuler", teilen: "Envoyer", fSie: "Son prénom (elle)", fEr: "Son prénom (lui)", fDatum: "Date", fOrt: "Salle ou restaurant", fAdresse: "Rue, n°, code postal, ville", fTelefon: "Votre numéro WhatsApp", namen: "Vos prénoms", fotos: "Vos photos", fotoEr: "Lui, le marié", loeschen: "Supprimer la photo", zurueck: "Retour", tonAus: "Couper le son", hell: "Affichage clair", dunkel: "Affichage sombre", ersetzen: "Remplacer la photo" },
  pt: { save: "Convite de casamento", wann: "Quando", wo: "Onde", herkunft: "Este vídeo foi feito com LuxuryBandit.", eigenes: "Façam o vosso", ton: "Ligar o som", wa: "Dúvidas? Escrevam-nos", zusTitel: "Quem vem", zusJa: "Lá estarei", zusNein: "Infelizmente não posso", zusName: "O teu nome", zusSenden: "Enviar", zusDanke: "Obrigado — mal podemos esperar!", zusLeer: "Sê o primeiro a responder.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 confirmado" : `${ja} confirmados`}${nein ? ` · ${nein === 1 ? "1 não pode" : `${nein} não podem`}` : ""}`, zusMail: "O teu e-mail", zusMailWarum: "Para que os noivos vos possam avisar se mudar a hora ou o local.", zusDatenschutz: "Privacidade", chatTitel: "Chat do grupo", chatLeer: "Ainda sem mensagens — escrevam a primeira.", chatFeld: "Uma mensagem para todos …", chatSenden: "Enviar", abgelaufen: "Este convite expirou", abgelaufenGast: "Os noivos têm de o reativar — falem com eles.", probeTage: (n: number) => n === 1 ? "Falta 1 dia grátis" : `Faltam ${n} dias grátis`, bearbeiten: "Editar", speichern: "Guardar", abbrechen: "Cancelar", teilen: "Enviar", fSie: "O nome dela", fEr: "O nome dele", fDatum: "Data", fOrt: "Sala ou restaurante", fAdresse: "Rua, n.º, código postal, cidade", fTelefon: "O vosso número de WhatsApp", namen: "Os vossos nomes", fotos: "As vossas fotos", fotoEr: "Ele, o noivo", loeschen: "Apagar a foto", zurueck: "Voltar", tonAus: "Desligar o som", hell: "Vista clara", dunkel: "Vista escura", ersetzen: "Substituir a foto" },
  it: { save: "Invito di nozze", wann: "Quando", wo: "Dove", herkunft: "Questo video è fatto con LuxuryBandit.", eigenes: "Fate il vostro", ton: "Attiva l’audio", wa: "Domande? Scriveteci", zusTitel: "Chi viene", zusJa: "Ci sarò", zusNein: "Purtroppo non posso", zusName: "Il tuo nome", zusSenden: "Invia", zusDanke: "Grazie — non vediamo l'ora!", zusLeer: "Sii il primo a rispondere.", zusZahl: (ja: number, nein: number) => `${ja === 1 ? "1 presente" : `${ja} presenti`}${nein ? ` · ${nein === 1 ? "1 assente" : `${nein} assenti`}` : ""}`, zusMail: "La tua e-mail", zusMailWarum: "Così gli sposi possono avvisarvi se cambia l’ora o il luogo.", zusDatenschutz: "Privacy", chatTitel: "Chat di gruppo", chatLeer: "Ancora nessun messaggio — scrivete il primo.", chatFeld: "Un messaggio per tutti …", chatSenden: "Invia", abgelaufen: "Questo invito è scaduto", abgelaufenGast: "Gli sposi devono riattivarlo — parlatene con loro.", probeTage: (n: number) => n === 1 ? "Resta 1 giorno gratis" : `Restano ${n} giorni gratis`, bearbeiten: "Modifica", speichern: "Salva", abbrechen: "Annulla", teilen: "Invia", fSie: "Il suo nome (lei)", fEr: "Il suo nome (lui)", fDatum: "Data", fOrt: "Sala o ristorante", fAdresse: "Via, n., CAP, città", fTelefon: "Il vostro numero WhatsApp", namen: "I vostri nomi", fotos: "Le vostre foto", fotoEr: "Lui, lo sposo", loeschen: "Elimina la foto", zurueck: "Indietro", tonAus: "Disattiva l’audio", hell: "Vista chiara", dunkel: "Vista scura", ersetzen: "Sostituisci la foto" },
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
  aufNamen, aufDatum, aufOrt,
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
  /** Video (bezahlt) oder Standbild (Probewoche) — die Karte fragt nicht, was es ist. */
  video: ReactNode;
  /** Die eine Herkunftszeile — nur auf der echten Seite, nicht in der Vorschau. */
  fuss?: ReactNode;
  /**
   * ANTIPPBARE STELLEN (Owner 31.07.2026: „er klickt auf Name, dann öffnet sich Dialog. Er
   * klickt auf Ort, öffnet sich Dialog.").
   *
   * Wo ein Griff mitgegeben wird, wird die Stelle zum Knopf — mit einer gestrichelten Linie,
   * solange dort noch nichts steht. Ohne Griff bleibt die Karte, was sie beim Gast ist: ein
   * Stück Papier, auf dem man nichts anklickt.
   */
  aufNamen?: () => void;
  aufDatum?: () => void;
  aufOrt?: () => void;
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
        {aufNamen ? (
          <button type="button" onClick={aufNamen}
            className="lb-tippbar mx-auto mt-2 block w-full rounded-xl px-2 py-1 text-center font-serif text-[27px] font-bold leading-tight transition active:scale-[0.98]">
            {sie} <span className="lb-karte-gold">&amp;</span> {er}
          </button>
        ) : (
          <h2 className="mt-2 text-center font-serif text-[27px] font-bold leading-tight">
            {sie} <span className="lb-karte-gold">&amp;</span> {er}
          </h2>
        )}
        <DividerOrnament className="mt-2.5" />

        <div className="mt-4 overflow-hidden rounded-[14px]">{video}</div>

        {/* Beim Gast entscheidet der INHALT, ob die Zeile steht — eine leere Zeile „Wann" auf
            einer verschickten Einladung waere ein Fehler. Beim Bauen entscheidet der GRIFF:
            Da ist noch nichts eingetragen, und genau deshalb muss die Stelle dastehen und
            antippbar sein. Ohne dieses `aufDatum || aufOrt` verschwand die halbe Karte, sobald
            sie leer war — und mit ihr der Weg, Datum und Ort ueberhaupt einzutragen. */}
        {(tag || ort || aufDatum || aufOrt) && (
          <>
            <DividerOrnament className="mt-5" />
            <div className="mt-3 space-y-3 text-center">
              {(tag || aufDatum) && (
                <div>
                  <p className="lb-karte-gold text-[9.5px] font-black uppercase tracking-[0.14em]">{T.wann}</p>
                  {aufDatum ? (
                    <button type="button" onClick={aufDatum}
                      className="lb-tippbar mx-auto mt-1 block rounded-xl px-3 py-1 font-serif text-[19px] font-bold transition active:scale-[0.98]">
                      {tag || T.fDatum}
                    </button>
                  ) : (
                    <p className="mt-1 font-serif text-[19px] font-bold">{tag}</p>
                  )}
                </div>
              )}
              {(ort || adresse || aufOrt) && (
                <div>
                  <p className="lb-karte-gold text-[9.5px] font-black uppercase tracking-[0.14em]">{T.wo}</p>
                  {aufOrt ? (
                    <button type="button" onClick={aufOrt}
                      className="lb-tippbar mx-auto mt-1 block rounded-xl px-3 py-1 font-serif text-[16px] transition active:scale-[0.98]">
                      {ort || T.fOrt}
                    </button>
                  ) : ort ? <p className="mt-1 font-serif text-[16px]">{ort}</p> : null}
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

        {/* KEIN WHATSAPP-KNOPF MEHR (Owner 31.07.2026: „das mit WhatsApp bitte entfernen,
            wir machen nur share. Die Leute schicken das eh übers Handy").
            Die Nummer bleibt, aber als reiner Telefonlink: Jedes Handy oeffnet damit das, was
            der Gast ohnehin benutzt — anrufen, schreiben, WhatsApp, egal. Ein Knopf, der EINE
            App vorschreibt, schliesst die aus, die sie nicht haben. */}
        {telefon && (
          <p className="mt-4 text-center">
            {demo ? (
              <span className="lb-karte-gold font-serif text-[14px]">{telefon}</span>
            ) : (
              <a href={`tel:${telefon.replace(/[^0-9+]/g, "")}`} className="lb-karte-gold font-serif text-[14px] underline">
                {telefon}
              </a>
            )}
          </p>
        )}

        {fuss}
      </div>
    </div>
  );
}
