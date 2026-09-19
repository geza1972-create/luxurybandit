/* Ende-zu-Ende: Was passiert nach dem Kauf einer Datei? Dieselbe Funktion wie im Webhook. */
import { druckBestellungMelden, bestellNummer } from "@/lib/lakatosbandi-bestellung";
import { adminEmails } from "@/lib/is-admin-email";
const admin = adminEmails()[0];
const sitzung = "cs_test_" + Math.random().toString(36).slice(2, 12);
console.log("Bestellnummer:", bestellNummer(sitzung), "→", admin ? "Adresse da" : "KEINE Adresse");
await druckBestellungMelden({
  sitzung, betragCents: 1000, waehrung: "eur",
  kaeuferMail: admin, kaeuferName: "Test Cumpărător",
  posten: [{ mandant: "vangogh", werk: "standard", material: "fisier", groesse: "neagra", name: "Lan de grâu cu chiparoși · fisier · neagra" }],
  sprache: "ro",
});
