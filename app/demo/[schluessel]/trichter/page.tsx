import { redirect } from "next/navigation";

/**
 * DER TRICHTER IST ÖFFENTLICH GEWORDEN (Owner 02.09.2026: „der Trichter ist gut und bleibt
 * offen") und wohnt jetzt unter `/armee`.
 *
 * Diese Adresse bleibt trotzdem am Leben: Sie steht im Knopf auf der Recruiterseite und in
 * allem, was seit heute Vormittag verschickt oder gezeigt wurde. Ein 404 an dieser Stelle
 * wäre genau im Termin die Panne, die man nicht erklären kann.
 */
export default function AlterTrichterPfad() {
  redirect("/armee");
}
