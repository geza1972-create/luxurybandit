/**
 * EINE KARTE ALS PDF (Owner 25.08.2026: „Dann muss noch ein Download bei jeder Karte:
 * bei Resume und bei Anschreiben. Als PDF").
 *
 * Der Weg über den Browser-Druck ist hier der bessere: Die Karte ist schon das Dokument,
 * und der Browser macht daraus ein PDF mit auswählbarem Text — eine PDF-Bibliothek müsste
 * dasselbe Layout ein zweites Mal nachbauen (und bei jeder Design-Änderung nachziehen).
 * Die Regeln stehen in globals.css unter `@media print`.
 *
 * `dateiname` setzt den Vorschlag im Speichern-Dialog: Browser nehmen dafür den
 * Dokumenttitel, deshalb wird er kurz getauscht und danach zurückgestellt.
 */
export function karteAlsPdf(el: HTMLElement | null, dateiname: string): void {
  if (!el || typeof window === "undefined") return;
  const titelVorher = document.title;
  el.setAttribute("data-druck-aktiv", "1");
  document.body.classList.add("lb-druckt");
  if (dateiname) document.title = dateiname;

  const aufraeumen = () => {
    el.removeAttribute("data-druck-aktiv");
    document.body.classList.remove("lb-druckt");
    document.title = titelVorher;
    window.removeEventListener("afterprint", aufraeumen);
  };
  window.addEventListener("afterprint", aufraeumen);

  try { window.print(); } catch { aufraeumen(); return; }
  /* Sicherheitsnetz: Nicht jeder Browser feuert `afterprint` (ältere Safari-Fassungen). */
  window.setTimeout(() => { if (document.body.classList.contains("lb-druckt")) aufraeumen(); }, 3000);
}
